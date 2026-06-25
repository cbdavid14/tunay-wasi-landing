/**
 * marketplaceService.ts — Lectura/escritura en colecciones mkt_* de Firestore
 * Proyecto: alpaso-app / database: (default)
 */
import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc,
  query, where, getCountFromServer,
} from 'firebase/firestore';
import { db } from '@/shared/firebase';
import { saveNotif, notifAdmin } from '@/shared/notificacionesService';
import { UMBRAL_SCA } from '@/shared/config';
import type { LoteDoc, PedidoB2BDoc, SolicitudMuestraDoc, LaboratorioDoc, SolicitudCertificacionDoc, SolicitudHubDoc, CalificacionDoc } from '@/shared/types/marketplace';

// ─── Lotes ───────────────────────────────────────────────────────────────────

export async function fetchMktLotes(): Promise<LoteDoc[]> {
  const snap = await getDocs(collection(db, 'mkt_lotes'));
  return snap.docs.map(d => d.data() as LoteDoc);
}

export async function fetchMktLotesByIds(ids: string[]): Promise<LoteDoc[]> {
  if (ids.length === 0) return [];
  const snaps = await Promise.all(ids.map(id => getDoc(doc(db, 'mkt_lotes', id))));
  return snaps.filter(s => s.exists()).map(s => s.data() as LoteDoc);
}

export async function fetchMktLotesPublicados(): Promise<LoteDoc[]> {
  const q = query(collection(db, 'mkt_lotes'), where('status', '==', 'publicado'));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as LoteDoc);
}

export async function fetchMktLotesByCaficultor(caficultorId: string): Promise<LoteDoc[]> {
  const q = query(collection(db, 'mkt_lotes'), where('caficultorId', '==', caficultorId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as LoteDoc);
}

export async function createMktLote(data: Omit<LoteDoc, 'id' | 'createdAt' | 'publicadoAt' | 'agotadoAt'>): Promise<string> {
  const id = `mkt-${data.region.slice(0, 3).toUpperCase()}-${Date.now()}`;
  const lote: LoteDoc = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
  };
  // Firestore rechaza campos undefined — solo incluir si tienen valor
  const doc_ = Object.fromEntries(Object.entries(lote).filter(([, v]) => v !== undefined));
  await setDoc(doc(db, 'mkt_lotes', id), doc_);
  return id;
}

export async function updateMktLoteStatus(
  loteId: string,
  status: LoteDoc['status'],
  extra: Partial<LoteDoc> = {}
): Promise<void> {
  await updateDoc(doc(db, 'mkt_lotes', loteId), { status, ...extra });
}

export async function updateMktLoteCatacion(
  loteId: string,
  laboratorioId: string,
  puntajeNuevo: number,
  acidez: number,
  cuerpo: number,
  balance: number,
  notasSabor: string[],
  datosTueste: string,
  precioVentaPEN: number,
): Promise<number> {
  // Calcular promedio de todas las cataciones registradas en este lote
  const loteSnap = await getDoc(doc(db, 'mkt_lotes', loteId));
  const loteData = loteSnap.exists() ? (loteSnap.data() as LoteDoc) : null;
  const catacionesAnteriores: number[] = loteData?._cataciones ?? [];
  const todasCataciones = [...catacionesAnteriores, puntajeNuevo];
  const puntajeOficial = Math.round((todasCataciones.reduce((s, p) => s + p, 0) / todasCataciones.length) * 100) / 100;

  const aprueba = puntajeOficial >= UMBRAL_SCA;
  const nuevoStatus = aprueba ? 'publicado' : 'rechazado';

  await updateDoc(doc(db, 'mkt_lotes', loteId), {
    puntajeOficial,
    _cataciones: todasCataciones,
    _catacionesCount: todasCataciones.length,
    acidez,
    cuerpo,
    balance,
    notasSabor,
    datosTueste,
    precioVentaPEN,
    laboratorioId,
    catado: true,
    status: nuevoStatus,
    ...(aprueba ? { publicadoAt: new Date().toISOString() } : { despublicadoAt: new Date().toISOString() }),
  });

  // Marcar la SolicitudCertificacion como completada
  const certQ = query(
    collection(db, 'mkt_solicitudes_certificacion'),
    where('loteId', '==', loteId),
    where('laboratorioId', '==', laboratorioId),
  );
  const certSnap = await getDocs(certQ);
  certSnap.forEach(d => {
    updateDoc(d.ref, { status: 'completada' });
  });

  const caficultorId = loteData?.caficultorId;
  if (caficultorId) {
    saveNotif(caficultorId, {
      titulo: aprueba ? `🎉 Lote certificado — ${puntajeOficial} pts SCA` : `❌ Lote no aprobado — ${puntajeOficial} pts SCA`,
      cuerpo: aprueba
        ? `Tu lote "${loteData?.nombreLote}" obtuvo ${puntajeOficial} pts y ya está publicado en el catálogo.`
        : `Tu lote "${loteData?.nombreLote}" obtuvo ${puntajeOficial} pts (mínimo ${UMBRAL_SCA}). Puedes solicitar una nueva catación.`,
      url: 'mis_lotes',
    }).catch(() => {});
  }
  notifAdmin({
    titulo: aprueba ? `✅ Lote publicado — ${puntajeOficial} pts SCA` : `⚠️ Lote no aprobado — ${puntajeOficial} pts`,
    cuerpo: aprueba
      ? `"${loteData?.nombreLote}" superó el umbral y ya está en el catálogo.`
      : `"${loteData?.nombreLote}" no alcanzó ${UMBRAL_SCA} pts SCA.`,
    url: 'lotes',
  }).catch(() => {});
  return puntajeOficial;
}

export async function publishMktLote(loteId: string): Promise<void> {
  const loteSnap = await getDoc(doc(db, 'mkt_lotes', loteId));
  const lote = loteSnap.data() as LoteDoc | undefined;
  await updateDoc(doc(db, 'mkt_lotes', loteId), {
    status: 'publicado',
    publicadoAt: new Date().toISOString(),
  });
  if (lote?.caficultorId) {
    saveNotif(lote.caficultorId, {
      titulo: '✅ Lote publicado',
      cuerpo: 'Tu lote ya está visible en el marketplace',
      url: 'mis_lotes',
    }).catch(() => {});
  }
  if (lote) {
    // Solicitud de certificación automática si el lote no tiene puntaje
    if (!lote.puntajeOficial) {
      const certSnap = await getDocs(
        query(collection(db, 'mkt_solicitudes_certificacion'), where('loteId', '==', loteId))
      );
      if (certSnap.empty) {
        await createSolicitudCertificacionAbierta(loteId, lote.caficultorId, lote.nombreLote);
      }
    }
    // Solicitud automática de muestras al hub si no hay stock ni solicitud previa
    if ((lote.stockMuestrasHub ?? 0) === 0 && !lote.muestraEnCamino) {
      const hubSnap = await getDocs(
        query(collection(db, 'mkt_solicitudes_hub'), where('loteId', '==', loteId), where('status', '==', 'solicitada'))
      );
      if (hubSnap.empty) {
        await createSolicitudHub(loteId, lote.caficultorId, 3);
      }
    }
  }
}

export async function despublicarMktLote(loteId: string): Promise<void> {
  await updateDoc(doc(db, 'mkt_lotes', loteId), {
    status: 'borrador',
    despublicadoAt: new Date().toISOString(),
  });
}

export async function updateMktLoteFields(loteId: string, fields: Partial<LoteDoc>): Promise<void> {
  await updateDoc(doc(db, 'mkt_lotes', loteId), { ...fields, updatedAt: new Date().toISOString() });
}

// ─── Laboratorios ─────────────────────────────────────────────────────────────

export async function fetchMktLaboratorios(): Promise<LaboratorioDoc[]> {
  const snap = await getDocs(collection(db, 'mkt_laboratorios'));
  return snap.docs.map(d => d.data() as LaboratorioDoc);
}

export async function fetchMktLotesByLaboratorio(laboratorioId: string): Promise<LoteDoc[]> {
  const q = query(collection(db, 'mkt_lotes'), where('laboratorioId', '==', laboratorioId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as LoteDoc);
}

export async function fetchMktLotesPendientesCatacion(laboratorioId: string): Promise<LoteDoc[]> {
  // Lotes asignados al lab que aún no han sido catados
  const q = query(
    collection(db, 'mkt_lotes'),
    where('laboratorioId', '==', laboratorioId),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => d.data() as LoteDoc)
    .filter(l => !l.catado);
}

export async function fetchMktLotesHistorialLab(laboratorioId: string): Promise<LoteDoc[]> {
  // Lotes catados por este laboratorio (catado: true)
  const q = query(
    collection(db, 'mkt_lotes'),
    where('laboratorioId', '==', laboratorioId),
    where('catado', '==', true),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as LoteDoc);
}

// ─── Caficultores marketplace ─────────────────────────────────────────────────

export async function fetchMktCaficultores() {
  const snap = await getDocs(collection(db, 'mkt_caficultores'));
  return snap.docs.map(d => d.data() as { id: string; nombreProductor: string; nombreFinca: string; region: string; fotoUrl: string });
}

// ─── Pedidos ─────────────────────────────────────────────────────────────────

export async function fetchMktPedidos(): Promise<PedidoB2BDoc[]> {
  const snap = await getDocs(collection(db, 'mkt_pedidos'));
  return snap.docs.map(d => d.data() as PedidoB2BDoc);
}

export async function fetchMktPedidosByLoteIds(loteIds: string[]): Promise<PedidoB2BDoc[]> {
  if (loteIds.length === 0) return [];
  const q = query(collection(db, 'mkt_pedidos'), where('loteId', 'in', loteIds));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as PedidoB2BDoc);
}

export async function fetchMktPedidosByTostadora(tostadoraId: string): Promise<PedidoB2BDoc[]> {
  const q = query(collection(db, 'mkt_pedidos'), where('tostadoraId', '==', tostadoraId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as PedidoB2BDoc);
}

export async function fetchMktPedidosByCaficultor(caficultorId: string): Promise<PedidoB2BDoc[]> {
  const q = query(collection(db, 'mkt_pedidos'), where('caficultorId', '==', caficultorId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as PedidoB2BDoc);
}

export async function createMktPedido(data: Omit<PedidoB2BDoc, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const id = `mkt-PED-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
  const pedido: PedidoB2BDoc = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const doc_ = Object.fromEntries(Object.entries(pedido).filter(([, v]) => v !== undefined));
  await setDoc(doc(db, 'mkt_pedidos', id), doc_);
  // Incrementar sacosReservados en el lote
  const loteSnap = await getDoc(doc(db, 'mkt_lotes', data.loteId));
  if (loteSnap.exists()) {
    const lote = loteSnap.data() as LoteDoc;
    await updateDoc(doc(db, 'mkt_lotes', data.loteId), {
      sacosReservados: (lote.sacosReservados ?? 0) + data.sacosSolicitados,
    });
  }
  saveNotif(data.caficultorId, {
    titulo: '☕ Nuevo pedido recibido',
    cuerpo: `${data.razonSocial} reservó ${data.sacosSolicitados} saco${data.sacosSolicitados !== 1 ? 's' : ''}`,
    url: 'mis_pagos',
  }).catch(() => {});
  notifAdmin({
    titulo: `🛒 Nuevo pedido — ${data.razonSocial}`,
    cuerpo: `${data.sacosSolicitados} saco${data.sacosSolicitados !== 1 ? 's' : ''} · S/ ${data.totalPEN ?? '—'} · Pendiente verificar pago`,
    url: 'pagos',
  }).catch(() => {});
  return id;
}

export async function liberarReservaPedido(pedidoId: string, loteId: string, sacos: number): Promise<void> {
  // Marca el pedido como cancelado
  await updateDoc(doc(db, 'mkt_pedidos', pedidoId), {
    pagoStatus: 'rechazado',
    logisticaStatus: 'cancelado',
    updatedAt: new Date().toISOString(),
  });
  // Devuelve los sacos al lote
  const loteSnap = await getDoc(doc(db, 'mkt_lotes', loteId));
  if (loteSnap.exists()) {
    const lote = loteSnap.data() as LoteDoc;
    await updateDoc(doc(db, 'mkt_lotes', loteId), {
      sacosReservados: Math.max(0, (lote.sacosReservados ?? 0) - sacos),
    });
  }
}

export async function verificarPagoPedido(pedidoId: string): Promise<void> {
  await updateDoc(doc(db, 'mkt_pedidos', pedidoId), {
    pagoStatus: 'verificado',
    logisticaStatus: 'en_origen',
    updatedAt: new Date().toISOString(),
  });
}

export async function marcarPagoLaboratorio(pedidoId: string): Promise<void> {
  await updateDoc(doc(db, 'mkt_pedidos', pedidoId), {
    pagoLaboratorioStatus: 'pagado',
    pagoLaboratorioAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function marcarPagoCaficultor(pedidoId: string): Promise<void> {
  await updateDoc(doc(db, 'mkt_pedidos', pedidoId), {
    pagoCaficultorStatus: 'pagado',
    pagoCaficultorAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function updateMktPedidoLogistica(
  pedidoId: string,
  logisticaStatus: PedidoB2BDoc['logisticaStatus']
): Promise<void> {
  await updateDoc(doc(db, 'mkt_pedidos', pedidoId), {
    logisticaStatus,
    updatedAt: new Date().toISOString(),
  });
}

export async function subirVoucherPedido(
  pedidoId: string,
  file: File,
): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
  form.append('folder', `tunaywasi/vouchers/${pedidoId}`);
  // resource_type=auto permite imágenes y PDFs
  const resourceType = file.type === 'application/pdf' ? 'raw' : 'image';
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
    { method: 'POST', body: form },
  );
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    console.error('[Cloudinary voucher error]', errBody);
    throw new Error((errBody as { error?: { message?: string } }).error?.message ?? 'Error al subir comprobante a Cloudinary');
  }
  const data = await res.json() as { secure_url: string };
  const url = data.secure_url;
  const now = new Date().toISOString();
  const pedidoSnap = await getDoc(doc(db, 'mkt_pedidos', pedidoId));
  const pedido = pedidoSnap.data() as PedidoB2BDoc | undefined;
  await updateDoc(doc(db, 'mkt_pedidos', pedidoId), {
    comprobanteUrl: url,
    voucherSubidoAt: now,
    pagoStatus: 'en_revision',
    updatedAt: now,
  });
  notifAdmin({
    titulo: `🧾 Comprobante subido — ${pedido?.razonSocial ?? 'Cafetería'}`,
    cuerpo: `${pedido?.sacosSolicitados ?? '?'} saco(s) · S/ ${(pedido?.totalPEN ?? 0).toLocaleString()} · Listo para verificar`,
    url: 'pagos',
  }).catch(() => {});
  return url;
}

export async function confirmarEnvioPedido(
  pedidoId: string,
  empresaTransporte: PedidoB2BDoc['empresaTransporte'],
  numeroGuia: string,
): Promise<void> {
  await updateDoc(doc(db, 'mkt_pedidos', pedidoId), {
    logisticaStatus: 'en_transito',
    empresaTransporte,
    numeroGuia,
    updatedAt: new Date().toISOString(),
  });
  const pedidoSnap = await getDoc(doc(db, 'mkt_pedidos', pedidoId));
  const pedido = pedidoSnap.data() as PedidoB2BDoc | undefined;
  if (pedido?.tostadoraId) {
    saveNotif(pedido.tostadoraId, {
      titulo: '📦 Tu pedido salió',
      cuerpo: `Guía ${numeroGuia} — ${empresaTransporte}`,
      url: 'pedidos',
    }).catch(() => {});
  }
}

export async function asignarLaboratorio(
  loteId: string,
  laboratorioId: string,
): Promise<void> {
  await updateDoc(doc(db, 'mkt_lotes', loteId), {
    laboratorioId,
  });
}

// ─── Solicitudes de muestra ───────────────────────────────────────────────────

export async function createMktSolicitudMuestra(data: Omit<SolicitudMuestraDoc, 'id' | 'createdAt' | 'status'>): Promise<string> {
  // Validar y decrementar stockMuestrasHub antes de crear la solicitud (RN-MUE-04)
  const loteSnap = await getDoc(doc(db, 'mkt_lotes', data.loteId));
  const loteData = loteSnap.exists() ? (loteSnap.data() as LoteDoc) : null;
  if (!loteData || (loteData.stockMuestrasHub ?? 0) <= 0) {
    throw new Error('Sin stock de muestras disponibles en hub Lima');
  }
  await updateDoc(doc(db, 'mkt_lotes', data.loteId), {
    stockMuestrasHub: Math.max(0, (loteData.stockMuestrasHub ?? 0) - 1),
  });

  const id = `mkt-SOL-${Date.now()}`;
  const sol: SolicitudMuestraDoc = {
    ...data,
    id,
    status: 'pendiente',
    createdAt: new Date().toISOString(),
  };
  const doc_ = Object.fromEntries(Object.entries(sol).filter(([, v]) => v !== undefined));
  await setDoc(doc(db, 'mkt_solicitudes_muestra', id), doc_);
  // Notificar al caficultor del lote
  const caficultorId = loteData.caficultorId;
  if (caficultorId) {
    saveNotif(caficultorId, {
      titulo: '📬 Solicitud de muestra',
      cuerpo: `${data.empresa} quiere probar tu lote`,
      url: 'solicitudes',
    }).catch(() => {});
  }
  return id;
}

export async function saveCatacionPrivada(
  solicitudId: string,
  data: NonNullable<SolicitudMuestraDoc['catacionPrivada']>,
): Promise<void> {
  await updateDoc(doc(db, 'mkt_solicitudes_muestra', solicitudId), {
    catacionPrivada: data,
    status: 'catada',
  });
}

export async function countMktSolicitudesActivasByLote(loteId: string): Promise<number> {
  const q = query(
    collection(db, 'mkt_solicitudes_muestra'),
    where('loteId', '==', loteId),
    where('status', 'in', ['pendiente', 'despachada', 'recibida']),
  );
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

export async function fetchMktSolicitudesByLoteIds(loteIds: string[]): Promise<SolicitudMuestraDoc[]> {
  if (loteIds.length === 0) return [];
  const q = query(collection(db, 'mkt_solicitudes_muestra'), where('loteId', 'in', loteIds));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as SolicitudMuestraDoc);
}

export async function fetchMktSolicitudesByTostadora(tostadoraId: string): Promise<SolicitudMuestraDoc[]> {
  const q = query(collection(db, 'mkt_solicitudes_muestra'), where('tostadoraId', '==', tostadoraId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as SolicitudMuestraDoc);
}

export async function fetchMktSolicitudesPendientesDespacho(): Promise<SolicitudMuestraDoc[]> {
  const q = query(collection(db, 'mkt_solicitudes_muestra'), where('status', '==', 'pendiente'));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as SolicitudMuestraDoc);
}

export async function despacharMuestraHub(solicitudId: string, loteId: string, empresaCourier: string, numeroGuia: string): Promise<void> {
  await updateDoc(doc(db, 'mkt_solicitudes_muestra', solicitudId), {
    status: 'despachada',
    empresaCourier,
    numeroGuia,
    despachadoAt: new Date().toISOString(),
  });
  // Decrementar stockMuestrasHub en el lote
  const loteSnap = await getDoc(doc(db, 'mkt_lotes', loteId));
  if (loteSnap.exists()) {
    const lote = loteSnap.data() as LoteDoc;
    await updateDoc(doc(db, 'mkt_lotes', loteId), {
      stockMuestrasHub: Math.max(0, (lote.stockMuestrasHub ?? 0) - 1),
    });
  }
  // Notificar a la cafetería con los datos de envío
  const solSnap = await getDoc(doc(db, 'mkt_solicitudes_muestra', solicitudId));
  const sol = solSnap.data() as SolicitudMuestraDoc | undefined;
  if (sol?.tostadoraId) {
    saveNotif(sol.tostadoraId, {
      titulo: '📦 Muestra despachada',
      cuerpo: `Tu muestra del lote ${sol.loteId} está en camino · ${empresaCourier} · Guía: ${numeroGuia}`,
      url: 'muestras',
    }).catch(() => {});
  }
}

export async function updateMktSolicitudStatus(
  solicitudId: string,
  status: SolicitudMuestraDoc['status'],
): Promise<void> {
  await updateDoc(doc(db, 'mkt_solicitudes_muestra', solicitudId), { status });
  if (status === 'despachada') {
    const solSnap = await getDoc(doc(db, 'mkt_solicitudes_muestra', solicitudId));
    const sol = solSnap.data() as SolicitudMuestraDoc | undefined;
    if (sol?.tostadoraId) {
      saveNotif(sol.tostadoraId, {
        titulo: '📦 Muestra despachada',
        cuerpo: `Tu muestra del lote ${sol.loteId} está en camino`,
        url: 'muestras',
      }).catch(() => {});
    }
  }
}

// ─── Perfiles (usuarios_perfil) ──────────────────────────────────────────────

export async function updatePerfil(uid: string, fields: Record<string, unknown>): Promise<void> {
  await updateDoc(doc(db, 'usuarios_perfil', uid), { ...fields, updatedAt: new Date().toISOString() });
}

/**
 * sincronizarCaficultorDoc — mantiene el doc en mkt_caficultores sincronizado.
 * Llámalo al guardar perfil del caficultor.
 */
export async function sincronizarCaficultorDoc(caficultor: {
  uid: string;
  nombre: string;
  finca: string;
  region: string;
  fotoUrl?: string;
}): Promise<void> {
  const ref = doc(db, 'mkt_caficultores', caficultor.uid);
  const snap = await getDoc(ref);
  const data: Record<string, unknown> = {
    id: caficultor.uid,
    nombreProductor: caficultor.nombre,
    nombreFinca: caficultor.finca,
    region: caficultor.region,
    updatedAt: new Date().toISOString(),
  };
  if (caficultor.fotoUrl) data.fotoUrl = caficultor.fotoUrl;
  if (snap.exists()) {
    await updateDoc(ref, data);
  } else {
    await setDoc(ref, { ...data, fotoUrl: caficultor.fotoUrl ?? '', createdAt: new Date().toISOString() });
  }
}

/**
 * sincronizarLabDoc — mantiene el doc en mkt_laboratorios sincronizado con el perfil
 * del laboratorio. Llámalo al hacer login en AppLaboratorio.
 */
export async function sincronizarLabDoc(laboratorio: {
  uid: string;
  nombreComercial: string;
  certificaciones: string[];
  feeCatacionPEN?: number;
  region?: string;
}): Promise<void> {
  const labRef = doc(db, 'mkt_laboratorios', laboratorio.uid);
  const snap = await getDoc(labRef);
  const data: Record<string, unknown> = {
    id: laboratorio.uid,
    nombreLaboratorio: laboratorio.nombreComercial,
    certificaciones: laboratorio.certificaciones,
    updatedAt: new Date().toISOString(),
  };
  if (laboratorio.feeCatacionPEN !== undefined) data.feeCatacionPEN = laboratorio.feeCatacionPEN;
  if (laboratorio.region) data.region = laboratorio.region;
  if (snap.exists()) {
    await updateDoc(labRef, data);
  } else {
    await setDoc(labRef, { ...data, activo: true, createdAt: new Date().toISOString() });
  }
}

// ─── Solicitudes de certificación ──────────────────────────────────────────────

// Crea solicitud ABIERTA y notifica a TODOS los labs activos (modelo tipo Uber)
export async function createSolicitudCertificacionAbierta(
  loteId: string,
  caficultorId: string,
  nombreLote: string,
): Promise<string> {
  const id = `mkt-CERT-${Date.now()}`;
  const sol: SolicitudCertificacionDoc = {
    id, loteId, caficultorId, nombreLote,
    status: 'abierta',
    pagoStatus: 'pendiente',
    pagoLaboratorioStatus: 'pendiente',
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'mkt_solicitudes_certificacion', id), sol);
  // Notificar a todos los labs activos
  const labsSnap = await getDocs(query(collection(db, 'mkt_laboratorios'), where('status', '==', 'activo')));
  labsSnap.docs.forEach(labDoc => {
    saveNotif(labDoc.id, {
      titulo: '🔬 Nuevo lote para certificar',
      cuerpo: `"${nombreLote}" está disponible. Primero en aceptar lo certifica.`,
      url: 'mis_muestras',
    }).catch(() => {});
  });
  return id;
}

// Lab acepta la solicitud — se le asigna el lote
export async function countSolicitudesActivasByLab(laboratorioId: string): Promise<number> {
  const q = query(
    collection(db, 'mkt_solicitudes_certificacion'),
    where('laboratorioId', '==', laboratorioId),
    where('status', 'in', ['aceptada', 'muestra_en_camino', 'muestra_recibida', 'en_proceso']),
  );
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

export async function aceptarSolicitudCertificacion(
  solicitudId: string,
  laboratorioId: string,
  feeCatacionPEN: number,
): Promise<boolean> {
  const ref_ = doc(db, 'mkt_solicitudes_certificacion', solicitudId);
  const snap = await getDoc(ref_);
  if (!snap.exists()) return false;
  const data = snap.data() as SolicitudCertificacionDoc;
  // Si ya fue aceptada por otro lab, rechazar
  if (data.status !== 'abierta') return false;
  await updateDoc(ref_, {
    status: 'aceptada',
    laboratorioId,
    feeCatacionPEN,
    aceptadaAt: new Date().toISOString(),
  });
  // Asignar laboratorio al lote
  await updateDoc(doc(db, 'mkt_lotes', data.loteId), { laboratorioId, status: 'en_catacion' });
  return true;
}

export async function createMktSolicitudCertificacion(
  loteId: string,
  caficultorId: string,
  laboratorioId: string,
  nombreLote: string,
  feeCatacionPEN: number,
): Promise<string> {
  const id = `mkt-CERT-${Date.now()}`;
  const sol: SolicitudCertificacionDoc = {
    id, loteId, caficultorId, laboratorioId, nombreLote,
    status: 'aceptada',
    feeCatacionPEN,
    pagoStatus: 'pendiente',
    pagoLaboratorioStatus: 'pendiente',
    aceptadaAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'mkt_solicitudes_certificacion', id), sol);
  saveNotif(laboratorioId, {
    titulo: '🔬 Solicitud de certificación',
    cuerpo: `Lote "${nombreLote}" solicita certificación`,
    url: 'pendientes',
  }).catch(() => {});
  return id;
}

export async function fetchMktSolicitudesCertificacionByCaficultor(caficultorId: string): Promise<SolicitudCertificacionDoc[]> {
  const q = query(collection(db, 'mkt_solicitudes_certificacion'), where('caficultorId', '==', caficultorId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as SolicitudCertificacionDoc);
}

export async function fetchMktSolicitudesCertificacionByLaboratorio(laboratorioId: string): Promise<SolicitudCertificacionDoc[]> {
  const q = query(collection(db, 'mkt_solicitudes_certificacion'), where('laboratorioId', '==', laboratorioId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as SolicitudCertificacionDoc);
}

export async function fetchMktPedidosByLaboratorio(laboratorioId: string): Promise<PedidoB2BDoc[]> {
  const q = query(collection(db, 'mkt_pedidos'), where('laboratorioId', '==', laboratorioId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as PedidoB2BDoc);
}

export async function fetchMktSolicitudesCertificacionAbiertas(): Promise<SolicitudCertificacionDoc[]> {
  const q = query(collection(db, 'mkt_solicitudes_certificacion'), where('status', '==', 'abierta'));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as SolicitudCertificacionDoc);
}

export async function fetchMktSolicitudesCertificacionAll(): Promise<SolicitudCertificacionDoc[]> {
  const snap = await getDocs(collection(db, 'mkt_solicitudes_certificacion'));
  return snap.docs.map(d => d.data() as SolicitudCertificacionDoc);
}

export async function updateMktSolicitudCertificacionStatus(
  solicitudId: string,
  status: SolicitudCertificacionDoc['status'],
): Promise<void> {
  await updateDoc(doc(db, 'mkt_solicitudes_certificacion', solicitudId), { status });
}

export async function confirmarEnvioMuestraCertificacion(
  solicitudId: string,
  empresa: string,
  numeroGuia: string,
  laboratorioId: string,
  nombreLote: string,
): Promise<void> {
  await updateDoc(doc(db, 'mkt_solicitudes_certificacion', solicitudId), {
    status: 'muestra_en_camino',
    empresaCourierMuestra: empresa,
    numeroGuiaMuestra: numeroGuia,
    guiaEnviadaAt: new Date().toISOString(),
  });
  saveNotif(laboratorioId, {
    titulo: '✈ Muestra en camino',
    cuerpo: `La muestra de "${nombreLote}" fue enviada por ${empresa} · Guía: ${numeroGuia}. Confirma la recepción cuando llegue.`,
    url: 'pendientes',
  }).catch(() => {});
}

export async function confirmarRecepcionMuestra(solicitudId: string): Promise<void> {
  await updateDoc(doc(db, 'mkt_solicitudes_certificacion', solicitudId), {
    status: 'muestra_recibida',
    muestraRecibidaAt: new Date().toISOString(),
  });
}

// Verifica el pago del fee (lo confirma el admin) y marca el pago al lab
export async function updatePagoCertificacion(
  solicitudId: string,
  fields: Partial<Pick<SolicitudCertificacionDoc, 'pagoStatus' | 'pagoLaboratorioStatus' | 'pagoLaboratorioAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'mkt_solicitudes_certificacion', solicitudId), { ...fields });
}

// ─── Solicitudes Hub → Caficultor (Flujo D) ───────────────────────────────────

export async function createSolicitudHub(
  loteId: string,
  caficultorId: string,
  cantidadSolicitada: number,
): Promise<string> {
  const id = `HUB-${Date.now()}`;
  const now = new Date();
  const expiraAt = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();
  const sol: SolicitudHubDoc = {
    id, loteId, caficultorId, cantidadSolicitada,
    status: 'solicitada',
    expiraAt,
    createdAt: now.toISOString(),
  };
  await setDoc(doc(db, 'mkt_solicitudes_hub', id), sol);
  saveNotif(caficultorId, {
    titulo: '📦 El hub solicita muestras',
    cuerpo: `Envía ${cantidadSolicitada} muestra${cantidadSolicitada > 1 ? 's' : ''} de 200g de tu lote al hub Lima`,
    url: 'solicitudes',
  }).catch(() => {});
  return id;
}

export async function confirmarEnvioCaficultor(
  solicitudId: string,
  loteId: string,
  empresaCourier: string,
  numeroGuia: string,
): Promise<void> {
  const now = new Date().toISOString();
  await updateDoc(doc(db, 'mkt_solicitudes_hub', solicitudId), {
    status: 'confirmada_caficultor',
    empresaCourier,
    numeroGuia,
    confirmadoAt: now,
  });
  await updateMktLoteFields(loteId, { muestraEnCamino: true });
  notifAdmin({
    titulo: '📦 Muestras en camino al hub',
    cuerpo: `Caficultor envió muestras del lote ${loteId} · ${empresaCourier} · Guía: ${numeroGuia}`,
    url: 'muestras',
  }).catch(() => {});
}

export async function confirmarRecepcionHub(
  solicitudId: string,
  loteId: string,
  cantidadRecibida: number,
  caficultorId: string,
): Promise<void> {
  const now = new Date().toISOString();
  await updateDoc(doc(db, 'mkt_solicitudes_hub', solicitudId), {
    status: 'recibida_hub',
    cantidadRecibida,
    recibidoAt: now,
  });
  // Incrementar stockMuestrasHub y desactivar muestraEnCamino
  const loteSnap = await getDoc(doc(db, 'mkt_lotes', loteId));
  if (loteSnap.exists()) {
    const lote = loteSnap.data() as LoteDoc;
    await updateMktLoteFields(loteId, {
      stockMuestrasHub: (lote.stockMuestrasHub ?? 0) + cantidadRecibida,
      muestraEnCamino: false,
    });
  }
  saveNotif(caficultorId, {
    titulo: '✅ Hub recibió tus muestras',
    cuerpo: `${cantidadRecibida} muestra${cantidadRecibida > 1 ? 's' : ''} recibida${cantidadRecibida > 1 ? 's' : ''} en hub Lima`,
    url: 'solicitudes',
  }).catch(() => {});
}

// Confirmar recepción inicial en hub — cuando caficultor declaró envío al publicar el lote
export async function confirmarRecepcionHubInicial(
  loteId: string,
  caficultorId: string,
): Promise<void> {
  const loteSnap = await getDoc(doc(db, 'mkt_lotes', loteId));
  if (!loteSnap.exists()) return;
  const lote = loteSnap.data() as LoteDoc;
  const cantidad = lote.cantidadMuestrasDeclarada ?? 0;
  await updateMktLoteFields(loteId, {
    stockMuestrasHub: cantidad,
    muestraEnCamino: false,
  });
  if (caficultorId) {
    saveNotif(caficultorId, {
      titulo: '✅ Hub recibió tus muestras',
      cuerpo: `${cantidad} muestra${cantidad !== 1 ? 's' : ''} activada${cantidad !== 1 ? 's' : ''} en hub Lima. Las cafeterías ya pueden solicitarlas.`,
      url: 'mis_lotes',
    }).catch(() => {});
  }
}

export async function fetchSolicitudesHub(caficultorId?: string): Promise<SolicitudHubDoc[]> {
  const q = caficultorId
    ? query(collection(db, 'mkt_solicitudes_hub'), where('caficultorId', '==', caficultorId))
    : query(collection(db, 'mkt_solicitudes_hub'));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as SolicitudHubDoc);
}

// ─── Certificado Q-Grader laboratorio ────────────────────────────────────────

/** Sube el certificado a Cloudinary y marca el perfil como 'pendiente' de revisión */
export async function uploadCertificadoLab(uid: string, file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
  form.append('folder', `tunaywasi/certificados_lab/${uid}`);
  // Certificados pueden ser PDF o imagen
  const resourceType = file.type === 'application/pdf' ? 'raw' : 'image';
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
    { method: 'POST', body: form },
  );
  if (!res.ok) throw new Error('Error al subir certificado a Cloudinary');
  const data = await res.json() as { secure_url: string };
  const url = data.secure_url;
  await updateDoc(doc(db, 'mkt_usuarios', uid), {
    certificadoUrl: url,
    certificadoStatus: 'pendiente',
    certificadoNota: '',
  });
  return url;
}

/** Admin aprueba o rechaza el certificado de un laboratorio */
export async function revisarCertificadoLab(
  uid: string,
  status: 'aprobado' | 'rechazado',
  nota?: string,
): Promise<void> {
  const fields: Record<string, string> = { certificadoStatus: status };
  if (nota !== undefined) fields.certificadoNota = nota;
  await updateDoc(doc(db, 'mkt_usuarios', uid), fields);
  await updateDoc(doc(db, 'mkt_laboratorios', uid), { certificadoStatus: status });
}

/** Carga todos los perfiles de laboratorio para que el admin vea sus certificados */
export async function fetchPerfilesLaboratorio(): Promise<import('@/shared/types/auth').PerfilLaboratorio[]> {
  const snap = await getDocs(query(collection(db, 'mkt_usuarios'), where('rol', '==', 'laboratorio')));
  return snap.docs.map(d => d.data() as import('@/shared/types/auth').PerfilLaboratorio);
}

// ─── Calificaciones ──────────────────────────────────────────────────────────

export async function crearCalificacion(data: Omit<CalificacionDoc, 'id' | 'createdAt' | 'expiraAt'>): Promise<void> {
  // RN-CAL-05: una calificación por pedido por autor — verificar si ya existe
  const q = query(
    collection(db, 'mkt_calificaciones'),
    where('pedidoId', '==', data.pedidoId),
    where('autorId', '==', data.autorId),
  );
  const existing = await getCountFromServer(q);
  if (existing.data().count > 0) return; // ya calificó

  const now = new Date();
  const expiraAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const id = `cal-${data.pedidoId}-${data.autorRol}`;
  const cal: CalificacionDoc = { ...data, id, createdAt: now.toISOString(), expiraAt };
  await setDoc(doc(db, 'mkt_calificaciones', id), cal);

  // Actualizar campos desnormalizados en usuarios_perfil (RN-CAL-08 + RN-PER-02)
  const perfilSnap = await getDoc(doc(db, 'usuarios_perfil', data.destinatarioId));
  if (perfilSnap.exists()) {
    const perfil = perfilSnap.data() as { promedioCalificacion?: number; totalCalificaciones?: number };
    const total = (perfil.totalCalificaciones ?? 0) + 1;
    const promedio = Math.round(
      (((perfil.promedioCalificacion ?? 0) * (total - 1)) + data.puntaje) / total * 10,
    ) / 10;
    await updateDoc(doc(db, 'usuarios_perfil', data.destinatarioId), {
      promedioCalificacion: promedio,
      totalCalificaciones: total,
    });
  }
}

export async function fetchCalificacionesByPedido(pedidoId: string): Promise<CalificacionDoc[]> {
  const q = query(collection(db, 'mkt_calificaciones'), where('pedidoId', '==', pedidoId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as CalificacionDoc);
}

export async function fetchCalificacionesByDestinatario(destinatarioId: string): Promise<CalificacionDoc[]> {
  const q = query(collection(db, 'mkt_calificaciones'), where('destinatarioId', '==', destinatarioId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as CalificacionDoc);
}
