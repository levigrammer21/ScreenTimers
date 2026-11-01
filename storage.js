// Browsers can deny localStorage. The app should still open and allow sign-in.
const memory=new Map();
export const storage={getItem(key){try{return localStorage.getItem(key)??memory.get(key)??null;}catch{return memory.get(key)??null;}},setItem(key,value){memory.set(key,String(value));try{localStorage.setItem(key,String(value));}catch{}},removeItem(key){memory.delete(key);try{localStorage.removeItem(key);}catch{}}};
