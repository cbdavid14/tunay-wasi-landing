import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/shared/firebase';

export interface PortalAuthUser {
  uid: string;
  nombre: string;
  displayName: string;
  email: string;
  telefono?: string;
  codigoReferido?: string;
  emailVerified: boolean;
}

export interface RegisterPortalUserInput {
  nombre: string;
  correo: string;
  pass: string;
  tel: string;
  ref?: string;
}

const CLIENTES_COLLECTION = 'clientes';

const verificationSettings = () => ({
  url: `${window.location.origin}/portal`,
  handleCodeInApp: false,
});

export function isRegistering() {
  return _isRegistering;
}

let _isRegistering = false;

export async function registerPortalUser(input: RegisterPortalUserInput) {
  const email = input.correo.trim().toLowerCase();
  const displayName = input.nombre.trim();
  const firstName = displayName.split(/\s+/)[0] || displayName;
  const phone = input.tel.trim();
  const referralCode = input.ref?.trim().toUpperCase() || '';

  _isRegistering = true;
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, input.pass);
    console.debug('[AuthService] account created:', credential.user.uid);
    await updateProfile(credential.user, { displayName });

    await setDoc(doc(db, CLIENTES_COLLECTION, credential.user.uid), {
      uid: credential.user.uid,
      nombre: firstName,
      displayName,
      email,
      telefono: phone,
      codigoReferidoUsado: referralCode || null,
      emailVerified: credential.user.emailVerified,
      rol: 'cliente',
      estado: 'pendiente_verificacion',
      puntos: referralCode ? 100 : 0,
      nivel: 'Explorador',
      pedidosTotales: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: null,
    }, { merge: true });

    await sendEmailVerification(credential.user, verificationSettings());
    await signOut(auth);
  } finally {
    _isRegistering = false;
  }
}

export async function loginPortalUser(email: string, password: string) {
  console.debug('[AuthService] login attempt:', email);
  const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  await credential.user.reload();

  await ensurePortalUserProfile(credential.user);
  return getPortalAuthUser(credential.user);
}

export async function ensurePortalUserProfile(user: FirebaseUser) {
  const ref = doc(db, CLIENTES_COLLECTION, user.uid);
  const snap = await getDoc(ref);
  const displayName = user.displayName || user.email?.split('@')[0] || 'Cliente Tunay';
  const firstName = displayName.split(/\s+/)[0] || displayName;

  const data: Record<string, unknown> = {
    uid: user.uid,
    nombre: snap.exists() ? snap.data().nombre || firstName : firstName,
    displayName,
    email: user.email || '',
    emailVerified: user.emailVerified,
    rol: snap.exists() ? snap.data().rol || 'cliente' : 'cliente',
    estado: user.emailVerified ? 'activo' : 'pendiente_verificacion',
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  };

  if (!snap.exists()) {
    data.telefono = '';
    data.codigoReferidoUsado = null;
    data.puntos = 0;
    data.nivel = 'Explorador';
    data.pedidosTotales = 0;
    data.createdAt = serverTimestamp();
  }

  await setDoc(ref, data, { merge: true });
}

export async function getPortalAuthUser(user: FirebaseUser): Promise<PortalAuthUser> {
  const snap = await getDoc(doc(db, CLIENTES_COLLECTION, user.uid));
  const data = snap.exists() ? snap.data() : {};
  const displayName = String(data.displayName || user.displayName || user.email?.split('@')[0] || 'Cliente Tunay');
  const nombre = String(data.nombre || displayName.split(/\s+/)[0] || displayName);

  return {
    uid: user.uid,
    nombre,
    displayName,
    email: String(data.email || user.email || ''),
    telefono: typeof data.telefono === 'string' ? data.telefono : undefined,
    codigoReferido: typeof data.codigoReferido === 'string' ? data.codigoReferido : undefined,
    emailVerified: user.emailVerified,
  };
}

export async function logoutPortalUser() {
  await signOut(auth);
}

export async function resetPortalPassword(email: string) {
  await sendPasswordResetEmail(auth, email.trim().toLowerCase(), {
    url: `${window.location.origin}/portal`,
  });
}
