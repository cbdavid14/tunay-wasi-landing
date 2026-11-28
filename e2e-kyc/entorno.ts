// Variables para que la web apunte a los emuladores (pruebas e2e y modo demo)
export const PUERTO = 5199
export const ENTORNO_WEB = {
  VITE_E2E_EMULATOR: 'true',
  VITE_APP_TARGET: 'one',
  VITE_FIREBASE_API_KEY: 'clave-ficticia',
  VITE_FIREBASE_PROJECT_ID: 'demo-kyc-e2e',
  VITE_FIREBASE_AUTH_DOMAIN: 'demo-kyc-e2e.firebaseapp.com',
  VITE_FIREBASE_STORAGE_BUCKET: 'demo-kyc-e2e.appspot.com',
  VITE_FIREBASE_APP_ID: '1:1:web:e2e',
  VITE_FIRESTORE_DATABASE: '',
}
