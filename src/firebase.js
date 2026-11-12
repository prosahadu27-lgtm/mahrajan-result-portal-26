import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDIKYymO24k2YRMAgnALHsYeLLsYaNe-gM",
  authDomain: "mahrajan-results-44ca8.firebaseapp.com",
  projectId: "mahrajan-results-44ca8",
  storageBucket: "mahrajan-results-44ca8.firebasestorage.app",
  messagingSenderId: "214994347934",
  appId: "1:214994347934:web:e490bd96ffe7699e61588f",
  measurementId: "G-WVE3NJ5X6W"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);