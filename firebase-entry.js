export {initializeApp} from 'firebase/app';
export {initializeAuth,browserPopupRedirectResolver,inMemoryPersistence,GoogleAuthProvider,signInWithPopup,createUserWithEmailAndPassword,onAuthStateChanged,signInWithEmailAndPassword,signOut,sendPasswordResetEmail,browserLocalPersistence} from 'firebase/auth';
export {getFirestore,collection,query,orderBy,limit,startAfter,onSnapshot,getDoc,getDocFromServer,getDocs,doc,setDoc,runTransaction,serverTimestamp} from 'firebase/firestore';
