/**
 * export-tunaywasi.ts — Descarga colecciones de Firestore (proyecto tunay-wasi)
 * usando Firebase Admin SDK (bypassa security rules).
 *
 * Prerequisito:
 *   1. Firebase Console → tunay-wasi → Project Settings → Service Accounts
 *      → Generate new private key → guarda como scripts/service-account-tunaywasi.json
 *   2. npm run export:tunaywasi
 *
 * Uso:
 *   npm run export:tunaywasi
 *   npm run export:tunaywasi -- --collections=caficultores,productos
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname    = dirname(fileURLToPath(import.meta.url));
const OUT_DIR      = resolve(__dirname, 'data/tunaywasi');
const SA_PATH      = resolve(__dirname, 'service-account-tunaywasi.json');
const DATABASE_ID  = 'default';

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

// ── Colecciones a exportar ───────────────────────────────────────────────────
const COLLECTIONS: { name: string; mode: 'array' | 'config' }[] = [
  { name: 'caficultores',      mode: 'array'  },
  { name: 'productos',         mode: 'array'  },
  { name: 'configurations',    mode: 'config' },
  { name: 'microlotesLanding', mode: 'array'  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function ok(msg: string)   { console.log(`  ✓ ${msg}`); }
function warn(msg: string) { console.warn(`  ⚠ ${msg}`); }
function err(msg: string)  { console.error(`  ✗ ${msg}`); }

function saveJson(filename: string, data: unknown) {
  writeFileSync(resolve(OUT_DIR, filename), JSON.stringify(data, null, 2), 'utf-8');
}

async function exportCollection(name: string, mode: 'array' | 'config') {
  console.log(`\n▸ ${name}`);
  try {
    const snap = await db.collection(name).get();
    if (snap.empty) { warn(`${name} — vacío, se omite`); return; }

    if (mode === 'config') {
      const result: Record<string, unknown> = {};
      snap.forEach(d => { result[d.id] = d.data(); });
      saveJson(`${name}.json`, result);
    } else {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      saveJson(`${name}.json`, docs);
    }
    ok(`${name}.json  (${snap.size} doc${snap.size !== 1 ? 's' : ''})`);
  } catch (e) {
    err(`${name} — ${(e as Error).message}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const colArg    = process.argv.find(a => a.startsWith('--collections='));
  const colFilter = colArg
    ? new Set(colArg.replace('--collections=', '').split(',').map(s => s.trim()))
    : null;
  const targets = colFilter ? COLLECTIONS.filter(c => colFilter.has(c.name)) : COLLECTIONS;

  console.log('');
  console.log('📦  Tunay Wasi — Export (Admin SDK)');
  console.log(`    project     : ${serviceAccount.project_id}`);
  console.log(`    database    : ${DATABASE_ID}`);
  console.log(`    destino     : scripts/data/tunaywasi/`);
  console.log(`    colecciones : ${targets.map(c => c.name).join(', ')}`);
  console.log('');

  mkdirSync(OUT_DIR, { recursive: true });

  for (const col of targets) {
    await exportCollection(col.name, col.mode);
  }

  console.log('\n✅  Export completo.\n');
  process.exit(0);
}

main().catch(e => {
  console.error('\n❌  Export falló:', e);
  process.exit(1);
});
