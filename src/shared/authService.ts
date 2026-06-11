/**
 * authService.ts — Funciones de Firebase Auth
 * Email + contraseña y teléfono (OTP SMS)
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signOut,
  onAuthStateChanged,
  RecaptchaVerifier,
  type User,
  type ConfirmationResult,
  type Auth,
} from 'firebase/auth';
import { auth } from '@/shared/firebase';

export type { ConfirmationResult };

export async function registerWithEmail(email: string, password: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

/**
 * Inicia el flujo OTP por teléfono.
 * buttonId: id del elemento DOM donde se monta el reCAPTCHA invisible.
 * phone: formato +51XXXXXXXXX
 */
export async function loginWithPhone(
  phone: string,
  buttonId: string,
): Promise<ConfirmationResult> {
  const recaptcha = new RecaptchaVerifier(auth as Auth, buttonId, { size: 'invisible' });
  const result = await signInWithPhoneNumber(auth, phone, recaptcha);
  return result;
}

export async function verifyPhoneOtp(
  confirmation: ConfirmationResult,
  otp: string,
): Promise<User> {
  const cred = await confirmation.confirm(otp);
  return cred.user;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}
