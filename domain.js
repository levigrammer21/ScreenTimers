/* Exact rational microseconds. All persisted integers are decimal strings. */
export function randomId(){if(globalThis.crypto.randomUUID)return globalThis.crypto.randomUUID();const bytes=crypto.getRandomValues(new Uint8Array(16));return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
export const VERSION='1.0.0';
export const CHILDREN=['reid','evan'];
export const MAX_BANK_US=365n*86400n*1000000n;
export const MAX_DURATION_MS=365*86400000;
const LETTERS={A:[5n,4n],B:[1n,1n],C:[3n,5n],D:[1n,10n],F:[0n,1n]};
const gcd=(a,b)=>b?gcd(b,a%b):a;
export function rational(n=0n,d=1n){n=BigInt(n);d=BigInt(d);if(d<=0n||n<0n)throw Error('Invalid time value.');const g=gcd(n,d);return {n:String(n/g),d:String(d/g)};}
export function add(a,b){return rational(BigInt(a.n)*BigInt(b.d)+BigInt(b.n)*BigInt(a.d),BigInt(a.d)*BigInt(b.d));}
export function subtract(a,b){const n=BigInt(a.n)*BigInt(b.d)-BigInt(b.n)*BigInt(a.d);return rational(n>0n?n:0n,BigInt(a.d)*BigInt(b.d));}
export function multiply(a,b){return rational(BigInt(a.n)*BigInt(b.n),BigInt(a.d)*BigInt(b.d));}
export function compare(a,b){const n=BigInt(a.n)*BigInt(b.d)-BigInt(b.n)*BigInt(a.d);return n<0n?-1:n>0n?1:0;}
export const seconds=a=>Number(a.n)/Number(a.d)/1e6;
export function multiplier(grades=[]){return grades.reduce((p,g)=>{const v=LETTERS[g.letter];if(!v)throw Error('Choose A, B, C, D, or F.');return multiply(p,rational(...v));},rational(1n));}
export function credited(baseUs,grades){return multiply(rational(baseUs),multiplier(grades));}
export function seed(id,now){if(!CHILDREN.includes(id))throw Error('Unknown child.');return {id,name:id==='reid'?'Reid':'Evan',bank:rational(),grades:[],state:'STOPPED',checkpointAt:now,lockoutUntil:0,version:0};}
export function remaining(c,now){return c.state==='RUNNING'?subtract(c.bank,rational(BigInt(Math.max(0,Math.floor(now-c.checkpointAt)))*1000n)):c.bank;}
export function nextExpiry(c){const times=[];if(c.lockoutUntil)times.push(c.lockoutUntil);if(c.state==='RUNNING')times.push(c.checkpointAt+Number((BigInt(c.bank.n)+BigInt(c.bank.d)*1000n-1n)/(BigInt(c.bank.d)*1000n)));return times.length?Math.min(...times):null;}
export function event(type,before,after,at,detail={}){return {type,at,before:structuredClone(before),after:structuredClone(after),...detail};}
export function settle(input,now){const c=structuredClone(input),events=[];
 if(c.state==='RUNNING'){const before=structuredClone(c),expiry=nextExpiry({...c,lockoutUntil:0});c.bank=remaining(c,now);c.checkpointAt=now;if(c.bank.n==='0'){c.state='STOPPED';events.push(event('timerExpired',{...before,bank:rational()},c,expiry,{consumed:before.bank}));}}
 if(c.lockoutUntil&&c.lockoutUntil<=now){const before=structuredClone(c),at=c.lockoutUntil;c.lockoutUntil=0;events.push(event('lockoutExpired',before,c,at));}return {child:c,events};}
function duration(data,key,max){const v=data[key];if(!Number.isSafeInteger(v)||v<=0||v>max)throw Error('Enter a valid duration within the limit.');return v;}
function letter(v){if(!Object.hasOwn(LETTERS,v))throw Error('Choose A, B, C, D, or F.');return v;}
export function apply(input,action,now){if(!Number.isSafeInteger(now))throw Error('Invalid server time.');const {child:c,events}=settle(input,now),before=structuredClone(c);const reason=action.reason??'';if(typeof reason!=='string'||reason.length>500)throw Error('Reason must be 500 characters or fewer.');let detail={reason},type=action.type;
 switch(type){
 case 'award':{if(action.gradeFingerprint!==undefined&&action.gradeFingerprint!==JSON.stringify(c.grades))throw Error('Grades changed on the other phone. Review the updated award preview.');const baseUs=duration(action,'amountUs',7*86400*1e6),m=multiplier(c.grades),amount=credited(baseUs,c.grades);c.bank=add(c.bank,amount);detail={...detail,baseUs:String(baseUs),multiplier:m,credited:amount,grades:structuredClone(c.grades)};break;}
 case 'add':case 'deduct':{const amountUs=duration(action,'amountUs',Number(MAX_BANK_US)),requested=rational(amountUs),old=c.bank;c.bank=type==='add'?add(old,requested):subtract(old,requested);detail={...detail,requested,actual:type==='add'?requested:subtract(old,c.bank)};if(c.bank.n==='0')c.state='STOPPED';break;}
 case 'start':case 'resume':if(c.lockoutUntil>now)throw Error('Screen time is locked.');if(c.bank.n==='0')throw Error('Add time before starting.');if(type==='start'&&c.state!=='STOPPED'||type==='resume'&&c.state!=='PAUSED')throw Error('Timer changed. Refresh and try again.');c.state='RUNNING';c.checkpointAt=now;break;
 case 'pause':if(c.state!=='RUNNING')throw Error('Timer is no longer running.');c.state='PAUSED';break;
 case 'stop':if(c.state==='STOPPED')throw Error('Timer is already stopped.');c.state='STOPPED';break;
 case 'gradeAdd':if(c.grades.length>=24)throw Error('A maximum of 24 grades is supported.');if(typeof action.gradeId!=='string'||!/^[a-zA-Z0-9_-]{8,80}$/.test(action.gradeId)||c.grades.some(g=>g.id===action.gradeId))throw Error('Invalid grade identifier.');c.grades.push({id:action.gradeId,letter:letter(action.letter)});break;
 case 'gradeChange':case 'gradeDelete':{const i=c.grades.findIndex(g=>g.id===action.gradeId);if(i<0||c.grades[i].letter!==action.previousLetter)throw Error('This grade changed on the other phone. Reopen Grades.');detail.previousLetter=c.grades[i].letter;if(type==='gradeDelete')c.grades.splice(i,1);else c.grades[i].letter=letter(action.letter);break;}
 case 'lockoutStart':{const ms=duration(action,'durationMs',MAX_DURATION_MS);if(c.lockoutUntil>now)throw Error('A lockout is already active. Adjust it instead.');c.lockoutUntil=now+ms;c.state='STOPPED';detail.requestedMs=ms;break;}
 case 'lockoutAdd':case 'lockoutSubtract':{const ms=duration(action,'durationMs',MAX_DURATION_MS);if(c.lockoutUntil<=now)throw Error('This lockout has ended.');const old=c.lockoutUntil;c.lockoutUntil=type==='lockoutAdd'?old+ms:Math.max(now,old-ms);if(c.lockoutUntil-now>MAX_DURATION_MS)throw Error('Lockout cannot exceed 365 days.');if(c.lockoutUntil===now)c.lockoutUntil=0;detail={...detail,requestedMs:ms,actualMs:Math.abs((c.lockoutUntil||now)-old)};break;}
 case 'lockoutEnd':if(c.lockoutUntil<=now)throw Error('This lockout has ended.');c.lockoutUntil=0;break;
 default:throw Error('Unknown action.');
 }
 if(compare(c.bank,rational(MAX_BANK_US))>0)throw Error('The time bank cannot exceed 365 days.');c.version=input.version+1;c.checkpointAt=now;events.push(event(type,before,c,now,detail));return {child:c,events};}
export function formatTime(value,{days=false}={}){let s=Math.max(0,Math.ceil(typeof value==='number'?value:seconds(value)));const d=Math.floor(s/86400);s%=86400;const h=Math.floor(s/3600),m=Math.floor(s%3600/60),sec=s%60;return days&&d?`${d}d ${h}h ${m}m ${sec}s`:`${d*24+h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;}
export function exactSeconds(a){let n=BigInt(a.n),d=BigInt(a.d)*1000000n;const g=gcd(n,d);n/=g;d/=g;let r=n%d;const whole=n/d;let dec='';for(let i=0;r&&i<12;i++){r*=10n;dec+=r/d;r%=d;}return r?`${n}/${d} seconds`:`${whole}${dec?'.'+dec:''} seconds`;}
