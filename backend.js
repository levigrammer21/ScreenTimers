import {randomBytes} from 'node:crypto';
import {enroll} from './family.js';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {getFunctions} from 'firebase-admin/functions';
import {getMessaging} from 'firebase-admin/messaging';
import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {onDocumentWritten,onDocumentCreated} from 'firebase-functions/v2/firestore';
import {onSchedule} from 'firebase-functions/v2/scheduler';
import {onTaskDispatched} from 'firebase-functions/v2/tasks';
import {setGlobalOptions} from 'firebase-functions/v2';
import {mutate,reconcile,validParents} from './service.js';
import {CHILDREN,seed,nextExpiry} from './domain.js';
initializeApp();const db=getFirestore();setGlobalOptions({region:'us-central1',maxInstances:10,serviceAccount:'300347806510-compute@developer.gserviceaccount.com'});
const store={transaction:fn=>db.runTransaction(async t=>fn({get:async p=>{const s=await t.get(db.doc(p));return s.exists?s.data():null;},set:(p,v)=>t.set(db.doc(p),v),create:(p,v)=>t.create(db.doc(p),v)}))};
async function authorized(uid){if(!uid)throw new HttpsError('unauthenticated','Sign in to continue.');const c=(await db.doc('config/household').get()).data();if(!validParents(c)||!c.parentUids.includes(uid))throw new HttpsError('failed-precondition','Connect your family to continue.',{needsFamily:true});return c;}
export const action=onCall(async req=>{const receivedAt=Date.now();await authorized(req.auth?.uid);try{const result=await mutate(store,req.auth.uid,req.auth.token.name||req.auth.token.email||'Parent',req.data);return {...result,receivedAt,serverNow:Date.now()};}catch(e){console.error('Action failed',e.message);throw new HttpsError('failed-precondition',e.message);}});
export const sync=onCall(async req=>{const receivedAt=Date.now();const household=await authorized(req.auth?.uid);await db.runTransaction(async tx=>{const refs=CHILDREN.map(id=>db.doc(`children/${id}`)),snaps=await tx.getAll(...refs);snaps.forEach((s,i)=>{if(!s.exists)tx.create(refs[i],seed(CHILDREN[i],Date.now()));});});await Promise.all(CHILDREN.map(id=>reconcile(store,id)));return {receivedAt,serverNow:Date.now(),familyCode:household.inviteCode||'',parentCount:household.parentUids.length};});
export const family=onCall(async req=>{if(!req.auth?.uid)throw new HttpsError('unauthenticated','Sign in to continue.');try{return await enroll(store,req.auth.uid,req.data?.mode,req.data?.code,()=>randomBytes(8).toString('hex').toUpperCase());}catch(e){throw new HttpsError('failed-precondition',e.message);}});
const queue=()=>getFunctions().taskQueue('locations/us-central1/functions/expire');
async function enqueue(child){const at=nextExpiry(child);if(at===null)return;await queue().enqueue({childId:child.id,version:child.version},{scheduleTime:new Date(Math.max(Date.now()+1000,Math.min(at,Date.now()+28*86400000))),dispatchDeadlineSeconds:60});}
export const scheduleExpiry=onDocumentWritten({document:'children/{childId}',retry:true},async e=>{const c=e.data?.after.data();if(c)await enqueue(c);});
export const expire=onTaskDispatched({invoker:['300347806510-compute@developer.gserviceaccount.com'],retryConfig:{maxAttempts:5,minBackoffSeconds:5},rateLimits:{maxConcurrentDispatches:5}},async req=>{const {childId,version}=req.data;if(!CHILDREN.includes(childId))return;const c=(await db.doc(`children/${childId}`).get()).data();if(!c||c.version!==version)return;const updated=await reconcile(store,childId);if(!updated)await enqueue(c);});
export const expirySafetyNet=onSchedule('every 1 minutes',async()=>{await Promise.all(CHILDREN.map(id=>reconcile(store,id)));});
const group=type=>type==='timerExpired'?'timerExpired':type==='lockoutExpired'?'lockoutExpired':type.startsWith('lockout')?'lockoutChanges':type.startsWith('grade')?'grades':'adjustments';
const titles={timerExpired:'Screen time is up',lockoutExpired:'Screen time unlocked',lockoutStart:'Lockout started',lockoutAdd:'Lockout extended',lockoutSubtract:'Lockout shortened',lockoutEnd:'Lockout ended',award:'Screen time earned',add:'Time added',deduct:'Time deducted',gradeAdd:'Grade added',gradeChange:'Grade changed',gradeDelete:'Grade removed'};
export const notify=onDocumentCreated({document:'history/{eventId}',retry:true},async e=>{const ev=e.data.data();if(!titles[ev.type])return;const cfg=(await db.doc('config/household').get()).data();if(!validParents(cfg))return;await Promise.all(cfg.parentUids.map(async uid=>{const snaps=await db.collection(`users/${uid}/devices`).get();await Promise.all(snaps.docs.map(async snap=>{const dev=snap.data();if(!dev.enabled||!dev.token||dev.preferences?.[group(ev.type)]===false||ev.actorUid===uid&&!dev.preferences?.ownActions)return;try{await getMessaging().send({token:dev.token,notification:{title:titles[ev.type],body:`${ev.after.name} · ${ev.actorName}`},webpush:{notification:{tag:e.params.eventId,icon:dev.appUrl?new URL('icon-192.png',dev.appUrl).href:undefined},fcmOptions:dev.appUrl?{link:`${dev.appUrl}#child=${ev.childId}`} :undefined},data:{childId:ev.childId,eventId:e.params.eventId}});}catch(err){if(['messaging/registration-token-not-registered','messaging/invalid-registration-token'].includes(err.code))await snap.ref.delete();else throw err;}}));}));});
