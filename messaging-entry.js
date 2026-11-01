import {initializeApp} from 'firebase/app';
import {getMessaging} from 'firebase/messaging/sw';
import {firebaseConfig} from './config.js';
getMessaging(initializeApp(firebaseConfig));
