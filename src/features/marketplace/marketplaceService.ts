/**
 * marketplaceService.ts — Lectura/escritura en colecciones mkt_* de Firestore
 * Proyecto: alpaso-app / database: (default)
 */
import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc,
  query, where,
} from 'firebase/firestore';
import { db } from '@/shared/firebase';
import type { LoteDoc, PedidoB2BDoc, SolicitudMuestraDoc } from '@/shared/types/marketplace';

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
    publicadoAt: undefined,
    agotadoAt: undefined,
  };
  await setDoc(doc(db, 'mkt_lotes', id), lote);
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
  puntajeOficial: number,
  acidez: number,
  cuerpo: number,
  balance: number,
  notasSabor: string[],
  precioVentaPEN: number,
): Promise<void> {
  await updateDoc(doc(db, 'mkt_lotes', loteId), {
    puntajeOficial,
    acidez,
    cuerpo,
    balance,
    notasSabor,
    precioVentaPEN,
    status: 'publicado',
    publicadoAt: new Date().toISOString(),
  });
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

export async function createMktPedido(data: Omit<PedidoB2BDoc, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const id = `mkt-PED-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
  const pedido: PedidoB2BDoc = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'mkt_pedidos', id), pedido);
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

export async function updateMktPedidoLogistica(
  pedidoId: string,
  logisticaStatus: PedidoB2BDoc['logisticaStatus']
): Promise<void> {
  await updateDoc(doc(db, 'mkt_pedidos', pedidoId), {
    logisticaStatus,
    updatedAt: new Date().toISOString(),
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
  await setDoc(doc(db, 'mkt_solicitudes_muestra', id), sol);
  return id;
}
