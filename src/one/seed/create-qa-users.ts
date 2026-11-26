/**
 * create-qa-users.ts — Crea los usuarios de QA en Firebase Auth + Firestore
 *
 * Uso:
 *   FIREBASE_PROJECT=alpaso-app npx tsx src/one/seed/create-qa-users.ts
 *
 * Crea 4 usuarios de prueba con roles definidos.
 * Si ya existen, los actualiza (idempotente).
 */
import { initializeApp, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const PROJECT = process.env.FIREBASE_PROJECT
if (!PROJECT) {
  console.error('❌ Falta FIREBASE_PROJECT. Ejemplo: FIREBASE_PROJECT=tunay-wasi npx tsx ...')
  process.exit(1)
}
// Los usuarios QA se crean en el proyecto real (tunay-wasi) ya que los tests E2E apuntan a él
// Solo se permite con flag explícito para evitar accidentes con datos
console.log(`⚠️  Creando usuarios QA en proyecto: ${PROJECT}`)

console.log(`🟡 Proyecto: ${PROJECT}`)

if (!getApps().length) {
  initializeApp({ projectId: PROJECT })
}

const auth = getAuth()
const db = getFirestore()

const QA_USERS = [
  {
    email: 'caficultor@tunaywasi.qa',
    password: 'Tunay2026!',
    displayName: 'Caficultor QA',
    firestoreRole: 'seller',
    firestoreExtra: { estado: 'activo' },
  },
  {
    email: 'barista@tunaywasi.qa',
    password: 'Tunay2026!',
    displayName: 'Barista QA (B2B Aprobado)',
    firestoreRole: 'buyer_b2b',
    firestoreExtra: { estadoB2B: 'APPROVED', empresa: { nombre: 'Cafetería QA Test', ruc: '20999999019' } },
  },
  {
    email: 'cliente@tunaywasi.qa',
    password: 'Tunay2026!',
    displayName: 'Cliente QA (B2C)',
    firestoreRole: 'buyer_b2c',
    firestoreExtra: { estado: 'activo' },
  },
  {
    email: 'b2b-pending@tunaywasi.qa',
    password: 'Tunay2026!',
    displayName: 'B2B Pendiente QA',
    firestoreRole: 'buyer_b2b',
    firestoreExtra: { estadoB2B: 'PENDING', empresa: { nombre: 'Negocio Pendiente QA', ruc: '20999999027' } },
  },
]

async function upsertUser(u: typeof QA_USERS[0]) {
  let uid: string

  try {
    const existing = await auth.getUserByEmail(u.email)
    uid = existing.uid
    await auth.updateUser(uid, { password: u.password, displayName: u.displayName })
    console.log(`  ✏️  Actualizado: ${u.email} (uid: ${uid})`)
  } catch {
    const created = await auth.createUser({
      email: u.email,
      password: u.password,
      displayName: u.displayName,
      emailVerified: true,
    })
    uid = created.uid
    console.log(`  ✅ Creado: ${u.email} (uid: ${uid})`)
  }

  // Documento en Firestore colección "usuarios"
  await db.collection('usuarios').doc(uid).set(
    {
      uid,
      email: u.email,
      nombre: u.displayName,
      rol: u.firestoreRole,
      ...u.firestoreExtra,
      creadoEn: new Date().toISOString(),
    },
    { merge: true }
  )
  console.log(`  📄 Firestore usuarios/${uid} → rol: ${u.firestoreRole}`)
}

async function main() {
  console.log('\n🚀 Creando/actualizando usuarios QA...\n')
  for (const u of QA_USERS) {
    await upsertUser(u)
  }
  console.log('\n✅ Listo. Usuarios QA disponibles:')
  for (const u of QA_USERS) {
    console.log(`  ${u.email} / ${u.password}`)
  }
}

main().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})
