import * as F from './firebase-entry.js';
import {firebaseConfig} from './config.js';
import {mount} from './app.js';
import {storage} from './storage.js';
import {randomId,nextExpiry} from './domain.js';
import {createDirectStore} from './direct-store.js';
const firebase=F.initializeApp(firebaseConfig),auth=F.initializeAuth(firebase,{persistence:[F.browserLocalPersistence,F.inMemoryPersistence],popupRedirectResolver:F.browserPopupRedirectResolver}),db=F.getFirestore(firebase),direct=createDirectStore(F,db,()=>auth.currentUser);
let deviceId=storage.getItem('st-device');if(!deviceId){deviceId=randomId();storage.setItem('st-device',deviceId);}let preferences={},enabled=false,notice=()=>{},lastEvents=null,children=[],checking=false;
const deviceRef=()=>F.doc(db,'users',auth.currentUser.uid,'devices',deviceId);
function historyQuery({cursor}={}){const constraints=[F.orderBy('at','desc')];if(cursor)constraints.push(F.startAfter(cursor));constraints.push(F.limit(100));return F.query(direct.collection('history'),...constraints);}
function result(s,filters){return {items:s.docs.map(d=>({id:d.id,...d.data()})).filter(e=>(!filters.childId||e.childId===filters.childId)&&(!filters.type||e.type===filters.type)),cursor:s.docs.at(-1),hasMore:s.size===100};}
const swReady='serviceWorker'in navigator?navigator.serviceWorker.register('./sw.js').then(r=>navigator.serviceWorker.ready).catch(e=>{notice('Offline installation is unavailable: '+e.message);return null;}):Promise.resolve(null);
let reloading=false;navigator.serviceWorker?.addEventListener('controllerchange',()=>{if(reloading)return;reloading=true;location.reload();});
async function saveDevice({prefs=preferences,enabled:isEnabled=enabled}={}){await F.setDoc(deviceRef(),{enabled:isEnabled,preferences:{...prefs}});preferences={...prefs};enabled=isEnabled;}
const titles={timerExpired:'Screen time is up',lockoutExpired:'Screen time unlocked',lockoutStart:'Lockout started',lockoutAdd:'Lockout extended',lockoutSubtract:'Lockout shortened',lockoutEnd:'Lockout ended',award:'Screen time earned',add:'Time added',deduct:'Time deducted',gradeAdd:'Grade added',gradeChange:'Grade changed',gradeDelete:'Grade removed',taskComplete:'Task completed'};
function alerts(s){const events=s.docs.map(d=>({id:d.id,...d.data()}));if(lastEvents){for(const e of events){if(lastEvents.has(e.id)||!enabled||e.at<direct.clock()-30000||!titles[e.type]||e.actorUid===auth.currentUser?.uid&&!preferences.ownActions)continue;const key=e.type==='timerExpired'?'timerExpired':e.type==='lockoutExpired'?'lockoutExpired':e.type.startsWith('lockout')?'lockoutChanges':e.type.startsWith('grade')?'grades':'adjustments';if(preferences[key]===false)continue;swReady.then(reg=>{if(reg&&Notification.permission==='granted')reg.showNotification(titles[e.type],{body:e.after.name+' · '+e.actorName,tag:e.id,icon:'./icon-192.png',data:{childId:e.childId}});}).catch(()=>{});}}lastEvents=new Set(events.map(e=>e.id));}
setInterval(async()=>{if(checking||!navigator.onLine||!auth.currentUser||!direct.ready)return;let now;try{now=direct.clock();}catch{return;}if(!children.some(c=>nextExpiry(c)!==null&&nextExpiry(c)<=now))return;checking=true;try{await direct.reconcileAll();}catch(e){notice('Reconnect to confirm the latest timer state.');}finally{checking=false;}},1000);
mount({
 onAuth:cb=>F.onAuthStateChanged(auth,u=>{direct.clear();lastEvents=null;children=[];enabled=false;cb(u);},e=>window.dispatchEvent(new ErrorEvent('error',{message:e.message,error:e}))),
 google:()=>{const provider=new F.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});return F.signInWithPopup(auth,provider);},signUp:(email,password)=>F.createUserWithEmailAndPassword(auth,email,password),signIn:(email,password)=>F.signInWithEmailAndPassword(auth,email,password),reset:email=>F.sendPasswordResetEmail(auth,email),signOut:()=>F.signOut(auth),
 sync:()=>direct.sync(),action:data=>direct.action(data),
 watchTasks:(cb,error)=>F.onSnapshot(F.collection(db,'tasks'),{includeMetadataChanges:true},s=>cb(s.docs.map(d=>({id:d.id,...d.data()})),s.metadata.fromCache),error),
 watchChildren:(cb,error)=>F.onSnapshot(direct.collection('children'),{includeMetadataChanges:true},s=>{children=s.docs.map(d=>d.data());cb(children,s.metadata.fromCache);},error),
 watchHistory:(filters,cb,error)=>{lastEvents=null;return F.onSnapshot(historyQuery(),s=>{alerts(s);cb(result(s,filters));},error);},history:async filters=>result(await F.getDocs(historyQuery(filters)),filters),
 watchSettings:(cb,error)=>{const uid=auth.currentUser.uid;const stops=[F.onSnapshot(F.doc(db,'users',uid),s=>cb(s.data()||{}),error),F.onSnapshot(deviceRef(),s=>{const d=s.data()||{};preferences=d.preferences||{};enabled=!!d.enabled;cb(d);},error)];return()=>stops.forEach(stop=>stop());},
 theme:theme=>F.setDoc(F.doc(db,'users',auth.currentUser.uid),{theme},{merge:true}),savePush:saveDevice,
 enablePush:async prefs=>{if(!('Notification'in window))return {enabled:false,message:'This browser does not support notifications. In-app notices and shared history still work.'};const permission=await Notification.requestPermission();if(permission!=='granted')return {enabled:false,message:'Permission was not granted. In-app notices and history still work.'};await saveDevice({prefs,enabled:true});return {enabled:true,message:'Alerts enabled while this app is open. Closed-app push is not included in this simpler version.'};},
 disablePush:()=>saveDevice({enabled:false}),update:async()=>{const reg=await swReady;await reg?.update();},onNotice:cb=>{notice=cb;}
});
