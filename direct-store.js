import {CHILDREN,seed} from './domain.js';
import {mutate,reconcile} from './service.js';
/* One shared app for every signed-in account. No functions or household setup. */
export function createDirectStore(F,db,identity){
 let serverAt=0,monoAt=0;
 const clock=()=>{if(!monoAt)throw Error('Reconnect to check the shared clock.');return Math.floor(serverAt+performance.now()-monoAt);};
 const store={transaction:fn=>F.runTransaction(db,async tx=>fn({get:async p=>{const s=await tx.get(F.doc(db,p));return s.exists()?s.data():null;},set:(p,v)=>tx.set(F.doc(db,p),v),create:(p,v)=>tx.set(F.doc(db,p),v)}))};
 async function calibrate(){const ref=F.doc(db,'users',identity().uid,'clock','current'),start=performance.now();await F.setDoc(ref,{at:F.serverTimestamp()});const end=performance.now(),snap=await F.getDocFromServer(ref),at=snap.data()?.at;if(!at?.toMillis)throw Error('Could not check Firebase time. Reconnect and try again.');serverAt=at.toMillis()+(end-start)/2+performance.now()-end;monoAt=performance.now();}
 async function sync(){const started=performance.now();await calibrate();await F.runTransaction(db,async tx=>{const refs=CHILDREN.map(id=>F.doc(db,'children',id)),snaps=await Promise.all(refs.map(ref=>tx.get(ref)));snaps.forEach((s,i)=>{if(!s.exists())tx.set(refs[i],seed(CHILDREN[i],clock()));});});await Promise.all(CHILDREN.map(id=>reconcile(store,id,clock)));const now=clock();return {serverNow:now,receivedAt:now-(performance.now()-started)};}
 return {sync,clock,clear(){serverAt=0;monoAt=0;},get ready(){return monoAt>0;},collection:name=>F.collection(db,name),async action(data){const started=performance.now(),u=identity();const r=await mutate(store,u.uid,u.displayName||u.email||'Parent',data,clock);const now=clock();return {...r,serverNow:now,receivedAt:now-(performance.now()-started)};},async reconcileAll(){if(!monoAt)return;await Promise.all(CHILDREN.map(id=>reconcile(store,id,clock)));}};
}
