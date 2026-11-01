import {validParents} from './service.js';
export function normalizeCode(code){return typeof code==='string'?code.toUpperCase().replace(/[\s-]/g,''):'';}
export async function enroll(store,uid,mode,code,makeCode){
 if(!uid)throw Error('Sign in to continue.');
 if(!['create','join','info'].includes(mode))throw Error('Choose Create family or Join family.');
 return store.transaction(async tx=>{const current=await tx.get('config/household');
 if(current&&validParents(current)&&current.parentUids.includes(uid)){
  const inviteCode=current.inviteCode||makeCode();if(!current.inviteCode)tx.set('config/household',{...current,inviteCode});
  return {inviteCode,parentCount:current.parentUids.length};
 }
 if(mode==='create'){
  if(current&&(!Array.isArray(current.parentUids)||current.parentUids.length))throw Error('A family already exists. Ask your partner for the family code and choose Join family.');
  const inviteCode=makeCode();tx.set('config/household',{parentUids:[uid],inviteCode});return {inviteCode,parentCount:1};
 }
 if(mode==='info')throw Error('Create a family or join your partner’s family first.');
 const normalized=normalizeCode(code);
 if(!/^[A-F0-9]{16}$/.test(normalized)||!current||!validParents(current)||normalized!==current.inviteCode)throw Error('That family code is not correct. Check it with your partner and try again.');
 if(current.parentUids.length>=2)throw Error('Both parent accounts are already connected to this family.');
 tx.set('config/household',{...current,parentUids:[...current.parentUids,uid]});return {inviteCode:current.inviteCode,parentCount:2};
 });
}
