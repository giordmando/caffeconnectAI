// src/services/firebase/config.ts
import { initializeApp } from 'firebase/app';
import { initializeFirestore, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';

// Configurazione Firebase (da sostituire con le tue credenziali reali)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDummyKeyForDevelopment",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "cafeconnect-ai.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "cafeconnect-ai",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "cafeconnect-ai.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:123456789012:web:abcdef1234567890"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);

// Inizializza Firestore con cache illimitata
const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
});

// Abilita la persistenza in modo moderno
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence)
  .catch((err) => {
    console.error('Errore nell\'abilitare la persistenza:', err);
    if (err.code === 'failed-precondition') {
      console.log('Persistenza fallita: più schede aperte contemporaneamente');
    } else if (err.code === 'unimplemented') {
      console.log('Persistenza non supportata da questo browser');
    }
  });

// Esporta l'istanza Firestore
export { db };