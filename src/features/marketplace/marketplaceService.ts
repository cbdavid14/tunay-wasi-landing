/**
 * marketplaceService.ts — Lectura/escritura en colecciones mkt_* de Firestore
 * Proyecto: alpaso-app / database: (default)
 */
import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc,
  query, where,
} from 'firebase/firestore';
import { db } from '@/shared/firebase';
import type { LoteDoc, PedidoB2BDoc, SolicitudMuestraDoc, LaboratorioDoc } from '@/shared/types/marketplace';

// ─── Lotes ───────────────────────────────────────────────────────────────────

export async function fetchMktLotes(): Promise<LoteDoc[]> {
  const snap = await getDocs(collection(db, 'mkt_lotes'));
  return snap.docs.map(d => d.data() as LoteDoc);
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
  puntajeOficial: number,
  acidez: number,
  cuerpo: number,
  balance: number,
  notasSabor: string[],
  datosTueste: string,
  precioVentaPEN: number,
): Promise<void> {
  await updateDoc(doc(db, 'mkt_lotes', loteId), {
    puntajeOficial,
    acidez,
    cuerpo,
    balance,
    notasSabor,
    datosTueste,
    precioVentaPEN,
    laboratorioId,
    status: 'aprobado',
  });
}

export async function publishMktLote(loteId: string): Promise<void> {
  await updateDoc(doc(db, 'mkt_lotes', loteId), {
    status: 'publicado',
    publicadoAt: new Date().toISOString(),
  });
}

export async function fetchMktLotesPorPublicar(): Promise<LoteDoc[]> {
  const q = query(collection(db, 'mkt_lotes'), where('status', '==', 'aprobado'));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as LoteDoc);
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
  const q = query(
    collection(db, 'mkt_lotes'),
    where('status', '==', 'en_catacion'),
    where('laboratorioId', '==', laboratorioId),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as LoteDoc);
}

export async function fetchMktLotesHistorialLab(laboratorioId: string): Promise<LoteDoc[]> {
  const q = query(
    collection(db, 'mkt_lotes'),
    where('laboratorioId', '==', laboratorioId),
    where('status', 'in', ['aprobado', 'publicado', 'agotado', 'rechazado']),
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
}

export async function asignarLaboratorio(
  loteId: string,
  laboratorioId: string,
): Promise<void> {
  await updateDoc(doc(db, 'mkt_lotes', loteId), {
    laboratorioId,
    status: 'en_catacion',
  });
}

// ─── Solicitudes de muestra ───────────────────────────────────────────────────

export async function createMktSolicitudMuestra(data: Omit<SolicitudMuestraDoc, 'id' | 'createdAt' | 'status'>): Promise<string> {
  const id = `mkt-SOL-${Date.now()}`;
  const sol: SolicitudMuestraDoc = {
    ...data,
    id,
    status: 'pendiente',
    createdAt: new Date().toISOString(),
  };
  const doc_ = Object.fromEntries(Object.entries(sol).filter(([, v]) => v !== undefined));
  await setDoc(doc(db, 'mkt_solicitudes_muestra', id), doc_);
  return id;
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

export async function updateMktSolicitudStatus(
  solicitudId: string,
  status: SolicitudMuestraDoc['status'],
): Promise<void> {
  await updateDoc(doc(db, 'mkt_solicitudes_muestra', solicitudId), { status });
}
