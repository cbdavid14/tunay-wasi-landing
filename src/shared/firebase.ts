import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const dbName = import.meta.env.VITE_FIRESTORE_DATABASE
export const db = dbName ? getFirestore(app, dbName) : getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Solo para las pruebas e2e con emuladores (npm run e2e:kyc). En un build publicado DEV es false.
if (import.meta.env.DEV && import.meta.env.VITE_E2E_EMULATOR === 'true') {
  connectFirestoreEmulator(db, '127.0.0.1', 8181)
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
}
