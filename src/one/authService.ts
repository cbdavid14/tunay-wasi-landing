// TunayWasi ONE — operaciones de autenticación
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth'
import { auth } from '@/shared/firebase'
import { crearUsuario, fetchUsuario } from './service'
import type { CreateUsuarioInput, RolONE } from './types'

const GOOGLE_PENDING_KEY = 'one_google_pending_registro'
const ADMIN_EMAILS = ['tunaywasi@gmail.com']

export async function loginConGoogle(): Promise<{ uid: string; esNuevo: boolean; nombre: string; email: string }> {
  const provider = new GoogleAuthProvider()
  const cred = await signInWithPopup(auth, provider)
  const uid = cred.user.uid
  const nombre = cred.user.displayName ?? ''
  const email = cred.user.email ?? ''

  // Verificar si ya tiene doc en one_usuarios
  try {
    await fetchUsuario(uid)
    return { uid, esNuevo: false, nombre, email }
  } catch {
    // Si es email admin, crear doc con rol admin automáticamente
    if (ADMIN_EMAILS.includes(email) || email.endsWith('@tunaywasi.pe')) {
      await crearUsuario(uid, { uid, rol: 'admin', nombre, email })
      return { uid, esNuevo: false, nombre, email }
    }
    // Primera vez — guardar pending en sessionStorage AQUÍ, en la misma cadena sync
    // antes de que onAuthStateChanged dispare y desmonte el componente
    try {
      sessionStorage.setItem(GOOGLE_PENDING_KEY, JSON.stringify({ uid, nombre, email }))
    } catch { /* ok */ }
    return { uid, esNuevo: true, nombre, email }
  }
}

export async function completarRegistroGoogle(
  uid: string,
  nombre: string,
  email: string,
  rol: RolONE
): Promise<void> {
  const input: CreateUsuarioInput = {
    uid,
    rol,
    nombre,
    email,
    ...(rol === 'buyer_b2b' ? {
      negocio: {
        nombreLocal: '',
        distritoLocal: '',
        etapa: 'planificando',
        pedidoIds: [],
      },
    } : {}),
    ...(rol === 'seller' ? {
      caficultor: {
        region: '',
        distrito: '',
        altitudMsnm: 0,
        historia: '',
        foto: '',
        activo: false,
      },
    } : {}),
  }
  await crearUsuario(uid, input)
}

export async function registrar(
  email: string,
  password: string,
  nombre: string,
  rol: RolONE = 'buyer_b2b'
): Promise<void> {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(cred.user, { displayName: nombre })
  const input: CreateUsuarioInput = {
    uid: cred.user.uid,
    rol,
    nombre,
    email,
    negocio: rol === 'buyer_b2b' ? {
      nombreLocal: '',
      distritoLocal: '',
      etapa: 'planificando',
      pedidoIds: [],
    } : undefined,
  }
  await crearUsuario(cred.user.uid, input)
  await sendEmailVerification(cred.user)
}

export async function registrarCaficultor(
  email: string,
  password: string,
  nombre: string,
  datos: {
    region: string
    distrito: string
    altitudMsnm: number
    kgDisponibles: number
    variedadPrincipal: string
    telefono: string
    fotoUrl?: string
  }
): Promise<void> {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(cred.user, { displayName: nombre })
  const input: CreateUsuarioInput = {
    uid: cred.user.uid,
    rol: 'seller',
    nombre,
    email,
    caficultor: {
      region: datos.region,
      distrito: datos.distrito,
      altitudMsnm: datos.altitudMsnm,
      historia: '',
      foto: datos.fotoUrl ?? '',
      activo: false,
    },
  }
  await crearUsuario(cred.user.uid, input)
}

export async function login(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password)
}

export async function logout(): Promise<void> {
  await signOut(auth)
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email)
}

export async function asegurarUsuarioONE(
  uid: string,
  email: string,
  nombre: string
): Promise<void> {
  try {
    await fetchUsuario(uid)
  } catch {
    await crearUsuario(uid, {
      uid,
      rol: 'buyer_b2b',
      nombre: nombre || email,
      email,
      negocio: {
        nombreLocal: '',
        distritoLocal: '',
        etapa: 'planificando',
        pedidoIds: [],
      },
    })
  }
}
