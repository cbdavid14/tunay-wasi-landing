'use strict'
// Lambda: onboarding-incompletos (iter.16)
//
// Detecta cuentas creadas en Firebase Auth que NO tienen perfil en `one_usuarios`:
// el usuario empezó el registro (p. ej. Google → "¿Quién eres?") y lo abandonó.
// Escribe una fila por cuenta en `one_onboarding_incompletos/{uid}` (solo lectura admin,
// ver firestore.rules) y borra las filas de cuentas que ya completaron o fueron eliminadas.
//
// Se ejecuta a diario (EventBridge, serverless.yml). Usa Admin SDK → no depende de reglas.
// Los logs NO incluyen emails (SEC-24): solo conteos.
const admin = require('firebase-admin')
const { getFirestore } = require('firebase-admin/firestore')

const COL_USUARIOS = 'one_usuarios'
const COL_INCOMPLETOS = 'one_onboarding_incompletos'
// Cuentas creadas hace menos de MIN_HORAS pueden estar registrándose en este momento
const MIN_HORAS = Number(process.env.MIN_HORAS ?? 1)

let db
function init() {
  if (db) return db
  const cred = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT)
  const app = admin.initializeApp({
    credential: admin.credential.cert(cred),
    projectId: process.env.FIREBASE_PROJECT_ID ?? cred.project_id,
  })
  // QA (alpaso-app) usa "(default)"; PROD (tunay-wasi) usa "default"
  const dbId = process.env.FIRESTORE_DB ?? '(default)'
  db = dbId === '(default)' ? getFirestore(app) : getFirestore(app, dbId)
  return db
}

async function listarTodosLosUsuarios() {
  const usuarios = []
  let pageToken
  do {
    const res = await admin.auth().listUsers(1000, pageToken)
    usuarios.push(...res.users)
    pageToken = res.pageToken
  } while (pageToken)
  return usuarios
}

exports.detectar = async () => {
  const fs = init()
  const ahora = Date.now()
  const usuarios = (await listarTodosLosUsuarios()).filter(u => !u.disabled)

  // ¿Quién tiene perfil? getAll en bloques de 100
  const conPerfil = new Set()
  for (let i = 0; i < usuarios.length; i += 100) {
    const refs = usuarios.slice(i, i + 100).map(u => fs.collection(COL_USUARIOS).doc(u.uid))
    const snaps = await fs.getAll(...refs)
    snaps.forEach(s => { if (s.exists) conPerfil.add(s.id) })
  }

  const incompletos = usuarios.filter(u => {
    if (conPerfil.has(u.uid)) return false
    const horas = (ahora - Date.parse(u.metadata.creationTime)) / 36e5
    return horas >= MIN_HORAS
  })

  let escritos = 0
  let batch = fs.batch()
  let enBatch = 0
  for (const u of incompletos) {
    const creado = Date.parse(u.metadata.creationTime)
    batch.set(fs.collection(COL_INCOMPLETOS).doc(u.uid), {
      estado: 'cuenta_sin_perfil',
      email: u.email ?? null,             // para contactar / recordatorio — solo lectura admin
      nombre: u.displayName ?? null,
      proveedor: u.providerData[0]?.providerId ?? 'password',
      emailVerificado: !!u.emailVerified,
      creadoAt: new Date(creado).toISOString(),
      ultimoAccesoAt: u.metadata.lastSignInTime ? new Date(u.metadata.lastSignInTime).toISOString() : null,
      diasDesdeAlta: Math.floor((ahora - creado) / 864e5),
      detectadoAt: new Date(ahora).toISOString(),
    }, { merge: true })
    escritos++
    if (++enBatch === 400) { await batch.commit(); batch = fs.batch(); enBatch = 0 }
  }

  // Limpiar filas de cuentas que ya completaron el perfil o ya no existen
  const idsIncompletos = new Set(incompletos.map(u => u.uid))
  const existentes = await fs.collection(COL_INCOMPLETOS).select().get()
  let borrados = 0
  for (const d of existentes.docs) {
    if (!idsIncompletos.has(d.id)) {
      batch.delete(d.ref); borrados++
      if (++enBatch === 400) { await batch.commit(); batch = fs.batch(); enBatch = 0 }
    }
  }
  if (enBatch > 0) await batch.commit()

  const resumen = { totalAuth: usuarios.length, conPerfil: conPerfil.size, incompletos: escritos, limpiados: borrados }
  console.log('onboarding-incompletos', JSON.stringify(resumen))
  return resumen
}
