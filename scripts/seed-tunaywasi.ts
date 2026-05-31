/**
 * seed-tunaywasi.ts — Sube colecciones a Firestore (proyecto tunay-wasi)
 * usando Firebase Admin SDK (bypassa security rules).
 *
 * Prerequisito:
 *   scripts/service-account-tunaywasi.json (ver export-tunaywasi.ts)
 *
 * Uso:
 *   npm run seed:tunaywasi                              # merge (preserva campos existentes)
 *   npm run seed:tunaywasi -- --force                   # overwrite completo
 *   npm run seed:tunaywasi -- --collections=microlotesLanding
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = resolve(__dirname, 'data/tunaywasi');
const SA_PATH   = resolve(__dirname, 'service-account-tunaywasi.json');
const DATABASE_ID = 'default';

// ── Service account check ────────────────────────────────────────────────────
if (!existsSync(SA_PATH)) {
  console.error(`\n❌  Service account not found: ${SA_PATH}`);
  console.error('    Firebase Console → tunay-wasi → Project Settings');
  console.error('    → Service Accounts → Generate new private key\n');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(SA_PATH, 'utf-8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
});

const db = admin.firestore();
db.settings({ databaseId: DATABASE_ID });

const FORCE = process.argv.includes('--force');

// ── Helpers ──────────────────────────────────────────────────────────────────
function ok(msg: string)  { console.log(`  ✓ ${msg}`); }
function err(msg: string) { console.error(`  ✗ ${msg}`); }

function loadJson<T>(filename: string): T {
  return JSON.parse(readFileSync(resolve(DATA_DIR, filename), 'utf-8')) as T;
}

type DocWithId = { id: string; [k: string]: unknown };

// ── Colecciones a sembrar ────────────────────────────────────────────────────
type CollectionDef =
  | { name: string; mode: 'array';  docs: DocWithId[] }
  | { name: string; mode: 'config'; docs: Record<string, unknown> };

function buildCollections(): CollectionDef[] {
  return [
    {
      name: 'microlotesLanding',
      mode: 'array',
      docs: loadJson<DocWithId[]>('microlotesLanding.json'),
    },
    {
      name: 'caficultores',
      mode: 'array',
      docs: loadJson<DocWithId[]>('caficultores.json'),
    },
    {
      name: 'productos',
      mode: 'array',
      docs: loadJson<DocWithId[]>('productos.json'),
    },
    {
      name: 'configurations',
      mode: 'config',
      docs: loadJson<Record<string, unknown>>('configurations.json'),
    },
  ];
}

// ── Seed helpers ─────────────────────────────────────────────────────────────
async function seedArray(colName: string, docs: DocWithId[]) {
  console.log(`\n▸ ${colName}  (${docs.length} doc${docs.length !== 1 ? 's' : ''})`);
  for (const d of docs) {
    const { id, ...rest } = d;
    try {
      await db.collection(colName).doc(id).set({ id, ...rest }, { merge: !FORCE });
      ok(`${colName}/${id}`);
    } catch (e) {
      err(`${colName}/${id} — ${(e as Error).message}`);
    }
  }
}

async function seedConfig(docs: Record<string, unknown>) {
  const entries = Object.entries(docs);
  console.log(`\n▸ configurations  (${entries.length} docs)`);
  for (const [docId, data] of entries) {
    try {
      await db.collection('configurations').doc(docId).set(data as object, { merge: !FORCE });
      ok(`configurations/${docId}`);
    } catch (e) {
      err(`configurations/${docId} — ${(e as Error).message}`);
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const colArg    = process.argv.find(a => a.startsWith('--collections='));
  const colFilter = colArg
    ? new Set(colArg.replace('--collections=', '').split(',').map(s => s.trim()))
    : null;

  const all     = buildCollections();
  const targets = colFilter ? all.filter(c => colFilter.has(c.name)) : all;

  console.log('');
  console.log('🌱  Tunay Wasi — Seed (Admin SDK)');
  console.log(`    project     : ${serviceAccount.project_id}`);
  console.log(`    database    : ${DATABASE_ID}`);
  console.log(`    mode        : ${FORCE ? 'FORCE (full overwrite)' : 'merge  (preserves existing fields)'}`);
  console.log(`    colecciones : ${targets.map(c => c.name).join(', ')}`);
  console.log('');

  for (const col of targets) {
    if (col.mode === 'config') {
      await seedConfig(col.docs as Record<string, unknown>);
    } else {
      await seedArray(col.name, col.docs as DocWithId[]);
    }
  }

  console.log('\n✅  Seed completo.\n');
  process.exit(0);
}

main().catch(e => {
  console.error('\n❌  Seed falló:', e);
  process.exit(1);
});
