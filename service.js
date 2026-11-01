import {CHILDREN,seed,apply,settle,nextExpiry,event} from './domain.js';
/* Store adapters expose get/set/create/delete inside a serializable transaction. */
export async function mutate(store,uid,displayName,data,clock=Date.now){
 if(!uid)throw Error('Sign in to continue.');
 if(!data||!CHILDREN.includes(data.childId)||!/^[-a-zA-Z0-9_]{16,100}$/.test(data.requestId??''))throw Error('Invalid request.');
 return store.transaction(async tx=>{
  const key=`requests/${uid}_${data.requestId}`,prior=await tx.get(key),saved=await tx.get(`children/${data.childId}`);
  if(prior){if(prior.fingerprint!==JSON.stringify(data))throw Error('Request identifier reused for a different action.');return {...prior.result,child:saved??prior.result.child,serverNow:clock()};}
  const now=clock(),input=saved??seed(data.childId,now);let result;
  if(['taskAdd','taskComplete','taskDelete'].includes(data.type)){
   if(!/^[-a-zA-Z0-9_]{16,100}$/.test(data.taskId??''))throw Error('Invalid task.');
   const taskPath=`tasks/${data.taskId}`,task=await tx.get(taskPath);
   if(data.type==='taskAdd'){
    if(task)throw Error('This task already exists.');
    if(typeof data.title!=='string'||!data.title.trim()||data.title.trim().length>120)throw Error('Enter a task name of 1–120 characters.');
    if(!Number.isSafeInteger(data.amountUs)||data.amountUs<=0||data.amountUs>7*86400*1e6)throw Error('Enter a reward from 1 minute to 7 days.');
    const created={id:data.taskId,childId:data.childId,title:data.title.trim(),baseUs:data.amountUs,createdAt:now,createdByUid:uid};
    result=settle(input,now);const before=structuredClone(result.child);result.child.version=input.version+1;
    result.events.push(event('taskAdd',before,result.child,now,{reason:created.title,taskId:created.id,task:created}));tx.create(taskPath,created);
   }else{
    if(!task||task.childId!==data.childId)throw Error('This task was already completed or removed.');
    if(data.type==='taskComplete'){
     result=apply(input,{type:'award',amountUs:task.baseUs,reason:task.title},now);
     const completion=result.events.at(-1);completion.type='taskComplete';completion.taskId=task.id;completion.task=task;
    }else{
     result=settle(input,now);const before=structuredClone(result.child);result.child.version=input.version+1;
     result.events.push(event('taskDelete',before,result.child,now,{reason:task.title,taskId:task.id,task}));
    }
    tx.delete(taskPath);
   }
  }else result=apply(input,data,now);
  tx.set(`children/${data.childId}`,result.child);
  result.events.forEach((e,i)=>tx.create(`history/${uid}_${data.requestId}_${i}`,{...e,childId:data.childId,actorUid:e.type.endsWith('Expired')?'system':uid,actorName:e.type.endsWith('Expired')?'System':displayName||'Parent'}));
  const response={child:result.child,serverNow:now};tx.create(key,{fingerprint:JSON.stringify(data),result:response,createdAt:now});return response;
 });
}
export async function reconcile(store,childId,clock=Date.now){return store.transaction(async tx=>{const input=await tx.get(`children/${childId}`),now=clock();if(!input||nextExpiry(input)===null||nextExpiry(input)>now)return null;const result=settle(input,now);if(!result.events.length)return null;result.child.version=input.version+1;tx.set(`children/${childId}`,result.child);result.events.forEach(e=>tx.create(`history/auto_${childId}_${e.type}_${e.at}`,{...e,childId,actorUid:'system',actorName:'System'}));return result.child;});}
