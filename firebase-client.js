import * as F from './firebase-sdk.js';
import {firebaseConfig,region,vapidKey} from './config.js';
import {mount} from './app.js';
import {randomId} from './domain.js';
const firebase=F.initializeApp(firebaseConfig),auth=F.getAuth(firebase),db=F.initializeFirestore(firebase,{localCache:F.persistentLocalCache({tabManager:F.persistentMultipleTabManager()})}),functions=F.getFunctions(firebase,region);
const callAction=F.httpsCallable(functions,'action'),callSync=F.httpsCallable(functions,'sync');
let deviceId=localStorage.getItem('st-device');if(!deviceId){deviceId=randomId();localStorage.setItem('st-device',deviceId);}let token='',preferences={},enabled=false,registration=null,notice=()=>{};
const deviceRef=()=>F.doc(db,'users',auth.currentUser.uid,'devices',deviceId);
const appUrl=new URL('./',location.href).href;
const authReady=F.setPersistence(auth,F.browserLocalPersistence);
function historyQuery({childId,type,cursor}){const constraints=[];if(childId)constraints.push(F.where('childId','==',childId));if(type)constraints.push(F.where('type','==',type));constraints.push(F.orderBy('at','desc'));if(cursor)constraints.push(F.startAfter(cursor));constraints.push(F.limit(50));return F.query(F.collection(db,'history'),...constraints);}
function result(s){return {items:s.docs.map(d=>({id:d.id,...d.data()})),cursor:s.docs.at(-1),hasMore:s.size===50};}
const swReady='serviceWorker'in navigator?navigator.serviceWorker.register('./sw.js').then(async r=>{registration=r;r.addEventListener('updatefound',()=>{const worker=r.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)notice('Update ready. Reloading to the latest release…');});});return navigator.serviceWorker.ready;}).catch(e=>{notice('Offline installation is unavailable: '+e.message);return null;}):Promise.resolve(null);
let reloading=false;navigator.serviceWorker?.addEventListener('controllerchange',()=>{if(reloading)return;reloading=true;location.reload();});
async function saveDevice({prefs=preferences,enabled:isEnabled=enabled}={}){preferences={...prefs};enabled=isEnabled;await F.setDoc(deviceRef(),{token,enabled,preferences,appUrl});}
mount({
 onAuth:cb=>F.onAuthStateChanged(auth,cb),signIn:async(email,password)=>{await authReady;return F.signInWithEmailAndPassword(auth,email,password);},reset:email=>F.sendPasswordResetEmail(auth,email),signOut:async()=>{if(enabled)await saveDevice({enabled:false});await F.signOut(auth);},
 sync:async()=>{const r=await callSync();return r.data;},action:async data=>{const r=await callAction(data);return r.data;},
 watchChildren:(cb,error)=>F.onSnapshot(F.collection(db,'children'),{includeMetadataChanges:true},s=>cb(s.docs.map(d=>d.data()),s.metadata.fromCache),error),
 watchHistory:(filters,cb,error)=>F.onSnapshot(historyQuery(filters),s=>cb(result(s)),error),history:async filters=>result(await F.getDocs(historyQuery(filters))),
 watchSettings:(cb,error)=>{const unsub1=F.onSnapshot(F.doc(db,'users',auth.currentUser.uid),s=>cb(s.data()||{}),error);const unsub2=F.onSnapshot(deviceRef(),s=>{const d=s.data()||{};token=d.token||'';preferences=d.preferences||{};enabled=!!d.enabled;cb(d);},error);return()=>{unsub1();unsub2();};},
 theme:theme=>F.setDoc(F.doc(db,'users',auth.currentUser.uid),{theme}),savePush:saveDevice,
 enablePush:async prefs=>{if(!await F.isSupported())return {enabled:false,message:'Push is unavailable in this browser. On iOS, install to the Home Screen and open the installed app. You can still use the in-app history.'};if(!vapidKey)return {enabled:false,message:'Push setup is incomplete. Add your public Firebase VAPID key in config.js, then publish the updated files. In-app history works now.'};const reg=await swReady;if(!reg)return {enabled:false,message:'The app needs an active service worker. Install over HTTPS and try again.'};const permission=await Notification.requestPermission();if(permission!=='granted')return {enabled:false,message:'Permission was not granted. You can enable notifications in your browser or device settings.'};const messaging=F.getMessaging(firebase);token=await F.getToken(messaging,{vapidKey,serviceWorkerRegistration:reg});await saveDevice({prefs,enabled:true});return {enabled:true,message:'Notifications enabled on this device. Delivery depends on your device and network.'};},
 disablePush:async()=>{await saveDevice({enabled:false});if(await F.isSupported())await F.deleteToken(F.getMessaging(firebase));token='';await saveDevice({enabled:false});},
 update:async()=>{const reg=await swReady;await reg?.update();},onNotice:cb=>{notice=cb;}
});
F.isSupported().then(supported=>{if(supported)F.onMessage(F.getMessaging(firebase),p=>notice(`${p.notification?.title||'Family update'} · ${p.notification?.body||''}`));}).catch(()=>{});
