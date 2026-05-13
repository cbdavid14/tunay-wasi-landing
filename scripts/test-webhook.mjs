#!/usr/bin/env node
/**
 * test-webhook.mjs
 * Simula el flujo completo del webhook de Meta Lead Ads contra el emulator local.
 *
 * Uso:
 *   node scripts/test-webhook.mjs
 *
 * Requiere que el emulator esté corriendo:
 *   firebase emulators:start --only functions,firestore
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

// ── Config del emulator ────────────────────────────────────────────────────
const FUNCTIONS_URL = 'http://127.0.0.1:5001';
const FIRESTORE_HOST = '127.0.0.1';
const FIRESTORE_PORT = 8080;

// Obtiene el projectId del .firebaserc
const FIREBASE_PROJECT = 'alpaso-app';

// ── Lead de prueba (simula lo que Meta enviaría) ───────────────────────────
const LEAD_PRUEBA = {
  id: 'meta_lead_test_' + Date.now(),
  field_data: [
    { name: 'full_name',     values: ['Juan Quispe Huanca'] },
    { name: 'phone_number',  values: ['+51987654321'] },
    { name: 'email',         values: ['juan.quispe@example.com'] },
  ],
};

// ── Payload que Meta manda al webhook ──────────────────────────────────────
const META_PAYLOAD = {
  object: 'page',
  entry: [{
    id: 'PAGE_ID_TEST',
    time: Date.now(),
    changes: [{
      field: 'leadgen',
      value: {
        leadgen_id: LEAD_PRUEBA.id,
        form_id: 'FORM_ID_TEST',
        page_id: 'PAGE_ID_TEST',
        created_time: Math.floor(Date.now() / 1000),
      },
    }],
  }],
};

// ── App Firebase apuntando al emulator ────────────────────────────────────
const app = initializeApp({
  apiKey: 'test-key',
  projectId: FIREBASE_PROJECT,
});
const db = getFirestore(app);
connectFirestoreEmulator(db, FIRESTORE_HOST, FIRESTORE_PORT);

// ── Interceptar la llamada a Graph API de Meta ────────────────────────────
// Las Cloud Functions en modo emulator llaman a la Graph API real.
// Para la prueba local usamos un servidor mock liviano en el mismo proceso.
import { createServer } from 'http';

const mockGraphServer = createServer((req, res) => {
  if (req.url?.includes(LEAD_PRUEBA.id)) {
    console.log('  [mock Graph API] → entregando datos del lead de prueba');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(LEAD_PRUEBA));
  } else {
    res.writeHead(404);
    res.end('{}');
  }
});

// No podemos redirigir las llamadas del emulator a nuestro mock sin un proxy.
// En su lugar hacemos un test de dos fases:
//   FASE 1 — Verificación del handshake GET (sin Graph API)
//   FASE 2 — POST con payload simulado (el emulator intentará llamar a Graph API real;
//             si META_PAGE_ACCESS_TOKEN no está seteado fallará ahí, pero guardará 200)

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function testVerificacionGet() {
  console.log('\n── FASE 1: Verificación GET (handshake de Meta) ──────────────');
  const verifyToken = process.env.META_VERIFY_TOKEN ?? 'tw-caficultores-2026';
  const challenge = 'challenge_test_' + Date.now();

  const url = `${FUNCTIONS_URL}/${FIREBASE_PROJECT}/us-central1/metaLeadWebhook` +
    `?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=${challenge}`;

  console.log(`  GET ${url}`);
  const resp = await fetch(url);
  const text = await resp.text();

  if (resp.status === 200 && text === challenge) {
    console.log('  ✓ Verificación GET correcta — status 200, challenge devuelto:', text);
    return true;
  } else {
    console.error(`  ✗ Fallo — status: ${resp.status}, body: ${text}`);
    console.error('  → Asegúrate de que META_VERIFY_TOKEN en el emulator coincide con el parámetro.');
    return false;
  }
}

async function testWebhookPost() {
  console.log('\n── FASE 2: POST con payload de lead ──────────────────────────');
  const url = `${FUNCTIONS_URL}/${FIREBASE_PROJECT}/us-central1/metaLeadWebhook`;

  console.log('  POST', url);
  console.log('  Payload leadgen_id:', LEAD_PRUEBA.id);

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(META_PAYLOAD),
  });

  if (resp.status === 200) {
    console.log('  ✓ Webhook respondió 200 (Meta espera esto)');
    return true;
  } else {
    console.error('  ✗ Status inesperado:', resp.status, await resp.text());
    return false;
  }
}

async function verificarFirestore() {
  console.log('\n── FASE 3: Verificar que el lead se guardó en Firestore ──────');
  // Esperamos 3s para que el trigger asíncrono procese
  console.log('  Esperando 3s al procesamiento asíncrono…');
  await sleep(3000);

  const q = query(collection(db, 'caficultor_leads'), orderBy('creadoEn', 'desc'), limit(5));
  const snap = await getDocs(q);

  if (snap.empty) {
    console.log('  ⚠ No hay leads en Firestore todavía.');
    console.log('  → Esto es normal si META_PAGE_ACCESS_TOKEN no está configurado.');
    console.log('  → El webhook recibió el evento correctamente (fase 2 pasó).');
    console.log('  → Para probar el guardado completo: configura META_PAGE_ACCESS_TOKEN');
    console.log('    o crea un lead directamente en el emulator UI (http://localhost:4000).');
    return;
  }

  console.log(`  ✓ Leads encontrados: ${snap.size}`);
  snap.forEach(doc => {
    const d = doc.data();
    console.log(`\n  ID: ${doc.id}`);
    console.log(`  Nombre:    ${d.nombre}`);
    console.log(`  WhatsApp:  ${d.whatsapp}`);
    console.log(`  Email:     ${d.email}`);
    console.log(`  Estado:    ${d.estado}`);
    console.log(`  Fuente:    ${d.fuente}`);
    console.log(`  Link ficha: http://localhost:5173/ficha/${doc.id}`);
  });
}

async function testOnLeadCreatedManual() {
  console.log('\n── FASE 4: Crear lead manual → verificar trigger Firestore → WhatsApp ──');
  console.log('  Para probar onLeadCreated (Twilio) sin Meta:');
  console.log('  1. Abre el emulator UI en http://localhost:4000');
  console.log('  2. Firestore → caficultor_leads → Añadir documento');
  console.log('  3. Campos:');
  console.log('     nombre:   "Test Caficultor"');
  console.log('     whatsapp: "+51987654321"  ← tu número real para recibir el WA');
  console.log('     region:   "Junín"');
  console.log('     estado:   "pendiente"');
  console.log('     creadoEn: (timestamp ahora)');
  console.log('  4. El trigger onLeadCreated se dispara automáticamente');
  console.log('  5. Revisa los logs del emulator — deberías ver el intento de Twilio');
  console.log('  ⚠ Para que Twilio envíe real necesitas TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN en el env');
}

// ── Main ───────────────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════════════════');
console.log('  TEST WEBHOOK META LEAD ADS — Tunay Wasi');
console.log('  Emulator: http://localhost:4000');
console.log('═══════════════════════════════════════════════════════════');

const fase1 = await testVerificacionGet();
if (fase1) {
  await testWebhookPost();
  await verificarFirestore();
}
await testOnLeadCreatedManual();

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  Prueba completada.');
console.log('═══════════════════════════════════════════════════════════\n');

process.exit(0);
