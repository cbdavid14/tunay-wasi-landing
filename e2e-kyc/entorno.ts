// Variables para que la web apunte a los emuladores (pruebas e2e y modo demo)
export const PUERTO = Number(process.env.E2E_PUERTO || 5199)
// `emulators:exec` publica dónde quedó cada emulador
const puertoDe = (host: string | undefined, porDefecto: string) => host?.split(':').pop() || porDefecto
export const ENTORNO_WEB = {
  VITE_E2E_EMULATOR: 'true',
  VITE_E2E_FIRESTORE_PORT: puertoDe(process.env.FIRESTORE_EMULATOR_HOST, '8181'),
  VITE_E2E_AUTH_PORT: puertoDe(process.env.FIREBASE_AUTH_EMULATOR_HOST, '9099'),
  // La subida de fotos se intercepta en las pruebas: no sale a internet
  VITE_CLOUDINARY_CLOUD_NAME: 'demo',
  VITE_CLOUDINARY_UPLOAD_PRESET: 'pruebas',
  VITE_APP_TARGET: 'one',
  VITE_FIREBASE_API_KEY: 'clave-ficticia',
  VITE_FIREBASE_PROJECT_ID: 'demo-kyc-e2e',
  VITE_FIREBASE_AUTH_DOMAIN: 'demo-kyc-e2e.firebaseapp.com',
  VITE_FIREBASE_STORAGE_BUCKET: 'demo-kyc-e2e.appspot.com',
  VITE_FIREBASE_APP_ID: '1:1:web:e2e',
  VITE_FIRESTORE_DATABASE: '',
}
