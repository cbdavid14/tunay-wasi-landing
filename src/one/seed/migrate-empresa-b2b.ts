/**
 * migrate-empresa-b2b.ts
 *
 * Migra usuarios B2B en one_usuarios que tienen datos de empresa
 * guardados incorrectamente dentro de negocio{} (bug anterior en
 * RegistroEmprendedor.tsx) hacia el schema correcto empresa{}.
 *
 * Qué hace:
 *   - Detecta docs con negocio.ruc definido (señal del bug)
 *   - Mueve ruc, razonSocial, dirFiscal, dirEnvio a empresa{}
 *   - Agrega empresa.estadoAprobacion = 'PENDING_APPROVAL' (B2B-01 INVARIANTE)
 *   - Limpia los campos huérfanos de negocio{}
 *   - Docs sin negocio.ruc no se tocan
 *
 * Uso:
 *   # Dry run (solo muestra qué cambiaría, NO escribe):
 *   FIREBASE_PROJECT=tunay-wasi npx tsx src/one/seed/migrate-empresa-b2b.ts
 *
 *   # Ejecutar migración real:
 *   FIREBASE_PROJECT=tunay-wasi DRY_RUN=false npx tsx src/one/seed/migrate-empresa-b2b.ts
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
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

// ─── Inicializar Firebase Admin ──────────────────────────────────────────────

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
    console.log(`🔑 Usando credenciales de entorno (GOOGLE_APPLICATION_CREDENTIALS)`)
  }
}

const db = getFirestore('default')
db.settings({ ignoreUndefinedProperties: true })

// ─── Migración ───────────────────────────────────────────────────────────────

interface NegocioConDatosBug {
  ruc?: string
  razonSocial?: string
  dirFiscal?: string
  dirEnvio?: string
  nombreLocal?: string
  distritoLocal?: string
  etapa?: string
  pedidoIds?: string[]
  [key: string]: unknown
}

async function migrate() {
  const snap = await db.collection('one_usuarios').get()
  console.log(`📋 Total documentos en one_usuarios: ${snap.size}\n`)

  let afectados = 0
  let omitidos = 0
  const batch = db.batch()
  const afectadosList: string[] = []

  for (const docSnap of snap.docs) {
    const data = docSnap.data()
    const negocio = data.negocio as NegocioConDatosBug | undefined

    // Solo afecta docs con negocio.ruc definido (señal del bug)
    if (!negocio?.ruc) {
      omitidos++
      continue
    }

    // Ya tiene empresa{} correcto — no tocar
    if (data.empresa?.estadoAprobacion) {
      console.log(`⏭️  ${docSnap.id} — ya tiene empresa.estadoAprobacion, omitiendo`)
      omitidos++
      continue
    }

    const { ruc, razonSocial, dirFiscal, dirEnvio, ...restoNegocio } = negocio

    const empresaPayload = {
      ruc: ruc ?? '',
      razonSocial: razonSocial ?? '',
      dirFiscal: dirFiscal ?? '',
      dirEnvio: dirEnvio ?? dirFiscal ?? '',
      estadoAprobacion: 'PENDING_APPROVAL',
      solicitudAt: data.createdAt ?? new Date().toISOString(),
    }

    const negocioLimpio = {
      nombreLocal: restoNegocio.nombreLocal ?? razonSocial ?? '',
      distritoLocal: restoNegocio.distritoLocal ?? '',
      etapa: restoNegocio.etapa ?? 'planificando',
      pedidoIds: restoNegocio.pedidoIds ?? [],
      ...(restoNegocio.descripcion ? { descripcion: restoNegocio.descripcion } : {}),
      ...(restoNegocio.fotoLocal ? { fotoLocal: restoNegocio.fotoLocal } : {}),
      ...(restoNegocio.scoreConfianza !== undefined ? { scoreConfianza: restoNegocio.scoreConfianza } : {}),
      ...(restoNegocio.totalCalificaciones !== undefined ? { totalCalificaciones: restoNegocio.totalCalificaciones } : {}),
    }

    console.log(`✅ ${docSnap.id} (${data.nombre ?? '?'})`)
    console.log(`   negocio.ruc → empresa.ruc: ${ruc}`)
    console.log(`   empresa.estadoAprobacion: PENDING_APPROVAL`)

    afectados++
    afectadosList.push(docSnap.id)

    if (!DRY_RUN) {
      batch.update(docSnap.ref, {
        empresa: empresaPayload,
        negocio: negocioLimpio,
        'negocio.ruc': FieldValue.delete(),
        'negocio.razonSocial': FieldValue.delete(),
        'negocio.dirFiscal': FieldValue.delete(),
        'negocio.dirEnvio': FieldValue.delete(),
        updatedAt: new Date().toISOString(),
      })
    }
  }

  console.log(`\n────────────────────────────────────────`)
  console.log(`Documentos a migrar:  ${afectados}`)
  console.log(`Documentos omitidos:  ${omitidos}`)
  console.log(`────────────────────────────────────────`)

  if (afectados === 0) {
    console.log('\n✨ Nada que migrar — todos los documentos ya están en el schema correcto.')
    return
  }

  if (DRY_RUN) {
    console.log('\n⚠️  Dry run completado. Nada fue escrito.')
    console.log('   Para aplicar: DRY_RUN=false npx tsx src/one/seed/migrate-empresa-b2b.ts')
  } else {
    await batch.commit()
    console.log(`\n🚀 Migración completada. ${afectados} documentos actualizados.`)
    console.log('   IDs migrados:', afectadosList.join(', '))
  }
}

migrate().catch(err => {
  console.error('❌ Error en migración:', err)
  process.exit(1)
})
