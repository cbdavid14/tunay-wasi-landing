/**
 * migrate-roles.ts
 *
 * Migra el campo `rol` en one_usuarios de los valores legacy
 * ('negocio', 'caficultor') a los valores canónicos del dominio
 * ('buyer_b2b', 'seller').
 *
 * El rol 'admin' y cualquier valor ya correcto se omiten sin modificar.
 *
 * Uso:
 *   # Dry run (solo muestra qué cambiaría, NO escribe):
 *   FIREBASE_PROJECT=tunay-wasi SERVICE_ACCOUNT_PATH="..." npx tsx src/one/seed/migrate-roles.ts
 *
 *   # Ejecutar migración real:
 *   FIREBASE_PROJECT=tunay-wasi DRY_RUN=false SERVICE_ACCOUNT_PATH="..." npx tsx src/one/seed/migrate-roles.ts
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const PROJECT = process.env.FIREBASE_PROJECT ?? 'tunay-wasi'
const DRY_RUN = process.env.DRY_RUN !== 'false'

if (DRY_RUN) {
  console.log('🔍 DRY RUN activado — no se escribirá nada en Firestore.')
  console.log('   Para ejecutar de verdad: DRY_RUN=false npx tsx ...\n')
} else {
  console.log(`⚠️  MODO REAL — escribiendo en proyecto: ${PROJECT}\n`)
}

if (!getApps().length) {
  const serviceAccountPath = process.env.SERVICE_ACCOUNT_PATH
    ?? resolve(__dirname, `../../../../service-account-${PROJECT}.json`)
  if (existsSync(serviceAccountPath)) {
    const { createRequire } = await import('module')
    const require = createRequire(import.meta.url)
    const serviceAccount = require(serviceAccountPath)
    initializeApp({
      credential: cert(serviceAccount),
      projectId: PROJECT,
      databaseURL: `https://${PROJECT}-default-rtdb.firebaseio.com`,
    })
    console.log(`🔑 Usando service account: ${serviceAccountPath}`)
  } else {
    initializeApp({ projectId: PROJECT })
    console.log('🔑 Usando credenciales de entorno (GOOGLE_APPLICATION_CREDENTIALS)')
  }
}

const db = getFirestore('default')
db.settings({ ignoreUndefinedProperties: true })

const ROLE_MAP: Record<string, string> = {
  negocio:    'buyer_b2b',
  caficultor: 'seller',
}

async function migrate() {
  const snap = await db.collection('one_usuarios').get()
  console.log(`📋 Total documentos en one_usuarios: ${snap.size}\n`)

  let afectados = 0
  let omitidos = 0
  const afectadosList: { id: string; de: string; a: string }[] = []
  const batch = db.batch()

  for (const docSnap of snap.docs) {
    const data = docSnap.data()
    const rolActual = data.rol as string | undefined

    if (!rolActual || !ROLE_MAP[rolActual]) {
      omitidos++
      continue
    }

    const rolNuevo = ROLE_MAP[rolActual]
    console.log(`✅ ${docSnap.id} (${data.nombre ?? '?'})  ${rolActual} → ${rolNuevo}`)
    afectados++
    afectadosList.push({ id: docSnap.id, de: rolActual, a: rolNuevo })

    if (!DRY_RUN) {
      batch.update(docSnap.ref, {
        rol: rolNuevo,
        updatedAt: new Date().toISOString(),
      })
    }
  }

  console.log(`\n────────────────────────────────────────`)
  console.log(`Documentos a migrar:  ${afectados}`)
  console.log(`Documentos omitidos:  ${omitidos}`)
  console.log(`────────────────────────────────────────`)

  if (afectados === 0) {
    console.log('\n✨ Nada que migrar — todos los roles ya son canónicos.')
    return
  }

  if (DRY_RUN) {
    console.log('\n⚠️  Dry run completado. Nada fue escrito.')
    console.log('   Para aplicar: DRY_RUN=false npx tsx src/one/seed/migrate-roles.ts')
  } else {
    await batch.commit()
    console.log(`\n🚀 Migración completada. ${afectados} documentos actualizados.`)
  }
}

migrate().catch(err => {
  console.error('❌ Error en migración:', err)
  process.exit(1)
})
