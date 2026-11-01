// Admin-only setup with Application Default Credentials, never browser credentials.
import {initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {seed} from './domain.js';
const uids=process.argv.slice(2);if(uids.length!==2||new Set(uids).size!==2||uids.some(x=>!x||x.includes('/')))throw Error('Usage: node bootstrap.js FIRST_PARENT_UID SECOND_PARENT_UID');
initializeApp({projectId:'screen-timers'});await Promise.all(uids.map(uid=>getAuth().getUser(uid)));const db=getFirestore();
await db.runTransaction(async t=>{const ref=db.doc('config/household'),existing=await t.get(ref),refs=['reid','evan'].map(id=>db.doc(`children/${id}`)),children=await t.getAll(...refs);if(existing.exists&&JSON.stringify([...existing.data().parentUids].sort())!==JSON.stringify([...uids].sort()))throw Error('Existing allowlist differs. Change it deliberately in the Firebase console.');t.set(ref,{parentUids:uids});children.forEach((c,i)=>{if(!c.exists)t.create(refs[i],seed(['reid','evan'][i],Date.now()));});});console.log('Two parents authorized. Reid and Evan initialized without replacing existing balances.');
