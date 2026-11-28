// Datos ficticios en los emuladores. La revisión automática la ejecuta el job real (scripts/kyc).
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

export const PROYECTO = 'demo-kyc-e2e'
export const ADMIN = { email: 'tunaywasi@gmail.com', password: 'ClaveDePrueba1' }
export const CLIENTE = { email: 'cliente.e2e@example.com', password: 'ClaveDePrueba1' }
export const CAFICULTORA = { email: 'ana@example.com', password: 'ClaveDePrueba1' }   // Ana, aprobada y sin CCI
const RUC_COOPERATIVA = '20131312955'   // RUC público de la SUNAT, como dato de prueba

const app = getApps()[0] ?? initializeApp({ projectId: PROYECTO })
export const db = getFirestore(app)
const auth = getAuth(app)

// Sin esto, firebase-admin escribiría en un proyecto real
function exigirEmuladores() {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error('Estas pruebas solo corren con emuladores: usa `npm run e2e:kyc`')
  }
}

async function vaciar() {
  const borrar = async (url: string) => {
    const r = await fetch(url, { method: 'DELETE' })
    if (!r.ok) throw new Error(`No se pudo vaciar el emulador (${r.status})`)
  }
  await borrar(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROYECTO}/databases/(default)/documents`)
  await borrar(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${PROYECTO}/accounts`)
}

async function usuario(uid: string, cuenta: { email: string; password: string }, rol: string) {
  await auth.createUser({ uid, ...cuenta, emailVerified: true })
  await db.doc(`one_usuarios/${uid}`).set({ uid, rol, nombre: uid, email: cuenta.email, createdAt: Timestamp.now() })
}

async function caficultor(uid: string, nombre: string, dni: string, extra: Record<string, unknown> = {}) {
  const foto = (n: string) => `https://res.cloudinary.com/demo/image/upload/e2e/${uid}-${n}.jpg`
  await db.doc(`one_usuarios/${uid}`).set({
    uid, rol: 'seller', nombre, email: `${uid}@example.com`, estadoKyc: 'PENDING_REVIEW',
    fotoDniUrl: foto('dni'), fotoSelfieUrl: foto('selfie'), createdAt: Timestamp.now(),
    caficultor: { region: 'Cajamarca', distrito: 'Jaén', activo: false, dni, tipoRegistroCaficultor: 'SOLO_DNI', cci: dni.padStart(20, '0'), ...extra },
  })
  await db.doc(`one_documentos/DNI_SELLER_${dni}`).set({ uid, rol: 'seller', tipo: 'DNI' })
}

/** Padrón de SUNAT de mentira, servido como archivo local. */
function padronDePrueba() {
  const carpeta = mkdtempSync(join(tmpdir(), 'padron-e2e-'))
  writeFileSync(join(carpeta, 'p.txt'), `RUC|NOMBRE|ESTADO|CONDICION|\n${RUC_COOPERATIVA}|ENTIDAD DE PRUEBA|ACTIVO|HABIDO|\n`)
  execFileSync('zip', ['-q', '-j', join(carpeta, 'p.zip'), join(carpeta, 'p.txt')])
  return `file://${join(carpeta, 'p.zip')}`
}

/** El job real, aplicando y sin verificación facial (permitido solo en QA y emuladores). */
export function ejecutarJob() {
  exigirEmuladores()
  execFileSync('node', ['scripts/kyc/main.mjs'], {
    stdio: 'pipe',
    env: { ...process.env, GCLOUD_PROJECT: PROYECTO, KYC_APLICAR: 'true', KYC_OMITIR_ROSTRO: 'true', SUNAT_PADRON_URL: padronDePrueba() },
  })
}

export async function perfilPorEmail(email: string) {
  const { uid } = await auth.getUserByEmail(email)
  return { uid, ...(await perfil(uid)) }
}

/**
 * Escenario: Ana aprobada (sin CCI), Beto rechazado (datos incompletos) y Carla pendiente (cooperativa), revisados
 * por el job; Dora se registra después y espera la revisión.
 */
export async function sembrar() {
  exigirEmuladores()
  await vaciar()
  await usuario('jefe', ADMIN, 'admin')
  await usuario('cliente', CLIENTE, 'buyer_b2c')
  await auth.createUser({ uid: 'ana', ...CAFICULTORA, emailVerified: true })
  await caficultor('ana', 'Ana Prueba', '99000001', { cci: '' })
  await caficultor('beto', 'Beto Prueba', '99000002', { distrito: '' })
  await caficultor('carla', 'Carla Prueba', '99000003', { tipoRegistroCaficultor: 'COOPERATIVA', rucCooperativa: RUC_COOPERATIVA })
  ejecutarJob()
  await caficultor('dora', 'Dora Prueba', '99000004')
}

export const perfil = async (uid: string) => (await db.doc(`one_usuarios/${uid}`).get()).data()!
export const revisiones = async (uid: string) =>
  (await db.collection('one_kyc_revisiones').where('uid', '==', uid).get()).docs
    .map(d => d.data()).sort((a, b) => a.fecha.toMillis() - b.fecha.toMillis())

/** Mueve las revisiones de un caficultor a días atrás, para probar la agrupación por fecha. */
export async function envejecer(uid: string, dias: number) {
  for (const d of (await db.collection('one_kyc_revisiones').where('uid', '==', uid).get()).docs) {
    await d.ref.update({ fecha: Timestamp.fromMillis(Date.now() - dias * 86_400_000) })
  }
}
