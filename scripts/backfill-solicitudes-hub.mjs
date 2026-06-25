/**
 * backfill-solicitudes-hub.mjs
 * Crea solicitudes hub para lotes publicados/en_catacion que no tienen una activa.
 * Solo apunta a alpaso-app (QA) — nunca a tunay-wasi (prod).
 *
 * Uso:
 *   node scripts/backfill-solicitudes-hub.mjs
 *
 * Requiere: firebase CLI autenticado (firebase login)
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Apunta al emulador local (mismo que usa el portal en dev)
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

// NOTA: el emulador local corre con alpaso-app (proyecto default de .firebaserc)
// Para el emulador no se necesitan credenciales reales
initializeApp({ projectId: 'alpaso-app' });

const db = getFirestore();

async function main() {
  // Traer lotes publicados o en_catacion con stockMuestrasHub === 0 y muestraEnCamino !== true
  const lotesSnap = await db.collection('mkt_lotes').get();
  const lotes = lotesSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(l =>
      (l.status === 'publicado' || l.status === 'en_catacion') &&
      (l.stockMuestrasHub ?? 0) === 0 &&
      !l.muestraEnCamino,
    );

  console.log(`Lotes candidatos: ${lotes.length}`);

  for (const lote of lotes) {
    // Verificar si ya existe una solicitud activa
    const hubSnap = await db.collection('mkt_solicitudes_hub')
      .where('loteId', '==', lote.id)
      .where('status', '==', 'solicitada')
      .get();

    if (!hubSnap.empty) {
      console.log(`  SKIP ${lote.id} — ya tiene solicitud hub activa`);
      continue;
    }

    const id = `HUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date();
    const expiraAt = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();

    await db.collection('mkt_solicitudes_hub').doc(id).set({
      id,
      loteId: lote.id,
      caficultorId: lote.caficultorId,
      cantidadSolicitada: 3,
      status: 'solicitada',
      expiraAt,
      createdAt: now.toISOString(),
    });

    // Notificación in-app al caficultor
    const notifId = `NOTIF-HUB-${Date.now()}`;
    await db.collection('caficultores').doc(lote.caficultorId)
      .collection('notificaciones').doc(notifId).set({
        id: notifId,
        titulo: '📦 El hub solicita muestras',
        cuerpo: `Envía 3 muestras de 200g de tu lote "${lote.nombreLote}" al hub Lima`,
        leida: false,
        createdAt: now.toISOString(),
        url: 'solicitudes',
      });

    console.log(`  CREADO ${id} para lote ${lote.id} (${lote.nombreLote})`);
    // Esperar un poco para no colisionar IDs por timestamp
    await new Promise(r => setTimeout(r, 10));
  }

  console.log('\nBackfill completado.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
