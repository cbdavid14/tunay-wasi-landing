/**
 * seed-one-prod.ts — Carga data ONE marketplace en Firestore producción (tunay-wasi)
 * Usa REST API (HTTPS) en lugar de gRPC para evitar bloqueos de red corporativa.
 *
 * Uso:
 *   npx tsx scripts/seed-one-prod.ts
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Load .env + .env.local ───────────────────────────────────────────────────
function loadEnv(path: string) {
  try {
    const raw = readFileSync(path, 'utf-8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const val = trimmed.slice(eq + 1).trim()
      if (!process.env[key]) process.env[key] = val
    }
  } catch { /* ok */ }
}

loadEnv(resolve(__dirname, '../.env'))
loadEnv(resolve(__dirname, '../.env.local'))

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID!
const API_KEY    = process.env.VITE_FIREBASE_API_KEY!
const DB         = process.env.VITE_FIRESTORE_DATABASE || 'default'

console.log(`\n🌱  Seed ONE Marketplace → proyecto: ${PROJECT_ID}  db: ${DB}\n`)

// ── Helpers ──────────────────────────────────────────────────────────────────
function loadJson<T>(relPath: string): T {
  return JSON.parse(readFileSync(resolve(__dirname, relPath), 'utf-8')) as T
}

type DocWithId = { id: string; [k: string]: unknown }

// Convierte un valor JS a formato Firestore REST
function toFirestoreValue(v: unknown): unknown {
  if (v === null || v === undefined) return { nullValue: null }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (typeof v === 'string') return { stringValue: v }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFirestoreValue) } }
  if (typeof v === 'object') {
    const fields: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      fields[k] = toFirestoreValue(val)
    }
    return { mapValue: { fields } }
  }
  return { stringValue: String(v) }
}

function toFirestoreDoc(data: Record<string, unknown>) {
  const fields: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    fields[k] = toFirestoreValue(v)
  }
  return { fields }
}

async function setDoc(coleccion: string, id: string, data: Record<string, unknown>) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DB}/documents/${coleccion}/${id}?key=${API_KEY}`
  const body = JSON.stringify(toFirestoreDoc(data))

  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`${res.status} ${err}`)
  }
}

async function seedColeccion(coleccion: string, docs: DocWithId[]) {
  console.log(`▸ ${coleccion}  (${docs.length} docs)`)
  for (const d of docs) {
    try {
      await setDoc(coleccion, d.id, d)
      console.log(`  ✓ ${d.id}`)
    } catch (e) {
      console.error(`  ✗ ${d.id} — ${(e as Error).message}`)
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const caficultores = loadJson<DocWithId[]>('../src/one/seed/one_caficultores.json')
  const productos    = loadJson<DocWithId[]>('../src/one/seed/one_productos.json')
  const kits         = loadJson<DocWithId[]>('../src/one/seed/one_kits.json')

  await seedColeccion('one_caficultores', caficultores)
  await seedColeccion('one_productos', productos)
  await seedColeccion('one_kits', kits)

  console.log('\n✅  Seed ONE completo.\n')
  process.exit(0)
}

main().catch(e => {
  console.error('\n❌  Seed falló:', e)
  process.exit(1)
})
