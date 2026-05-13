import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, orderBy, runTransaction, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/shared/firebase';
import type {
  LoteTostado, Etiqueta, Cubeta,
  PedidoItemEmpaque, Molienda, PesoBolsa,
} from '../types';
import { KG_POR_BOLSA } from '../types';

// ── Lotes ─────────────────────────────────────────────────────────────────

export async function getLotesListosEmpacar(): Promise<LoteTostado[]> {
  const q = query(
    collection(db, 'lotes_tostado'),
    where('estado', '==', 'listo_empacar'),
    orderBy('fechaReposo', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as LoteTostado));
}

export async function createLoteTostado(
  data: Omit<LoteTostado, 'id' | 'creadoEn' | 'bolsas250g' | 'bolsas1kg' | 'bolsas3kg'>
): Promise<string> {
  const bolsas250g = Math.floor(data.pesoTostadoKg / 0.25);
  const bolsas1kg = Math.floor(data.pesoTostadoKg / 1);
  const bolsas3kg = Math.floor(data.pesoTostadoKg / 3);
  const ref = await addDoc(collection(db, 'lotes_tostado'), {
    ...data,
    bolsas250g,
    bolsas1kg,
    bolsas3kg,
    creadoEn: serverTimestamp(),
  });
  return ref.id;
}

export async function marcarLoteEnEmpaque(loteId: string): Promise<void> {
  await updateDoc(doc(db, 'lotes_tostado', loteId), { estado: 'en_empaque' });
}

export async function marcarLoteCompletado(loteId: string): Promise<void> {
  await updateDoc(doc(db, 'lotes_tostado', loteId), { estado: 'completado' });
}

// ── Pedidos → Cubetas ─────────────────────────────────────────────────────
// Lee pedidos pagados del productoId y los agrupa en cubetas

export async function generarCubetas(
  lote: LoteTostado,
): Promise<Cubeta[]> {
  // Leer pedidos pagados con items de este producto
  const q = query(
    collection(db, 'pedidos'),
    where('estado', '==', 'pagado'),
  );
  const snap = await getDocs(q);

  // Agrupar por molienda + peso
  const grupos: Record<string, { pedidoIds: string[]; clienteNombres: string[]; totalBolsas: number; peso: PesoBolsa }> = {};

  for (const docSnap of snap.docs) {
    const pedido = docSnap.data();
    const items: PedidoItemEmpaque[] = (pedido.items ?? []).filter(
      (item: PedidoItemEmpaque) => item.productoId === lote.productoId
    );
    for (const item of items) {
      const key = `${item.molienda}__${item.peso}`;
      if (!grupos[key]) {
        grupos[key] = { pedidoIds: [], clienteNombres: [], totalBolsas: 0, peso: item.peso };
      }
      grupos[key].pedidoIds.push(docSnap.id);
      grupos[key].totalBolsas += item.qty;
    }
  }

  const cubetas: Cubeta[] = Object.entries(grupos).map(([key, g]) => {
    const [molienda] = key.split('__') as [Molienda, PesoBolsa];
    return {
      tipo: molienda,
      peso: g.peso,
      totalBolsas: g.totalBolsas,
      bolsasImprimidas: 0,
      bolsasEmpacadas: 0,
      pesoMolerKg: +(g.totalBolsas * KG_POR_BOLSA[g.peso]).toFixed(3),
      nivelMolino: molienda === 'grano' ? null : nivelMolino(molienda),
      pedidosAsignados: [...new Set(g.pedidoIds)],
      esStock: false,
    };
  });

  // Calcular bolsas de stock libre (sin pedido asignado)
  const bolsasPedidos250g = cubetas
    .filter(c => c.peso === '250g')
    .reduce((s, c) => s + c.totalBolsas, 0);
  const stockLibre = lote.bolsas250g - bolsasPedidos250g;

  if (stockLibre > 0) {
    cubetas.push({
      tipo: 'grano',
      peso: '250g',
      totalBolsas: stockLibre,
      bolsasImprimidas: 0,
      bolsasEmpacadas: 0,
      pesoMolerKg: +(stockLibre * 0.25).toFixed(3),
      nivelMolino: null,
      pedidosAsignados: [],
      esStock: true,
    });
  }

  return cubetas;
}

// Nivel de molino sugerido por molienda (escala 1-10)
function nivelMolino(molienda: Molienda): number {
  const niveles: Record<Molienda, number> = {
    grano: 0,
    espresso: 2,
    fina: 3,
    media: 5,
  };
  return niveles[molienda];
}

// ── Sesiones de empaque ────────────────────────────────────────────────────

export async function iniciarSesion(
  lote: LoteTostado,
  operario: string,
): Promise<string> {
  const cubetas = await generarCubetas(lote);

  const resumen = {
    totalEtiquetas: cubetas.reduce((s, c) => s + c.totalBolsas, 0),
    totalBolsas250g: cubetas.filter(c => c.peso === '250g').reduce((s, c) => s + c.totalBolsas, 0),
    totalBolsas1kg: cubetas.filter(c => c.peso === '1kg').reduce((s, c) => s + c.totalBolsas, 0),
    totalBolsas3kg: cubetas.filter(c => c.peso === '3kg').reduce((s, c) => s + c.totalBolsas, 0),
    kgEmpacados: 0,
  };

  const ref = await addDoc(collection(db, 'sesiones_empaque'), {
    loteId: lote.id,
    operario,
    inicio: serverTimestamp(),
    fin: null,
    estado: 'activa',
    cubetas,
    resumen,
  });

  await marcarLoteEnEmpaque(lote.id!);
  return ref.id;
}

export async function actualizarCubeta(
  sesionId: string,
  cubetas: Cubeta[],
): Promise<void> {
  const kgEmpacados = cubetas.reduce(
    (s, c) => s + c.bolsasEmpacadas * KG_POR_BOLSA[c.peso], 0
  );
  await updateDoc(doc(db, 'sesiones_empaque', sesionId), {
    cubetas,
    'resumen.kgEmpacados': +kgEmpacados.toFixed(3),
  });
}

// ── Etiquetas + decremento de stock ───────────────────────────────────────
// Operación atómica: graba etiqueta + descuenta stock

export async function registrarEtiquetaEmpacada(params: {
  etiqueta: Omit<Etiqueta, 'id' | 'empacadaEn'>;
  productoId: string;
  peso: PesoBolsa;
  pedidoId: string | null;
}): Promise<string> {
  const { etiqueta, productoId, peso, pedidoId } = params;
  const kgDescontar = KG_POR_BOLSA[peso];

  let etiquetaId = '';

  await runTransaction(db, async (tx) => {
    // 1. Descontar stock del producto
    const prodRef = doc(db, 'productos', productoId);
    const prodSnap = await tx.get(prodRef);
    if (!prodSnap.exists()) throw new Error(`Producto ${productoId} no encontrado`);

    const prod = prodSnap.data();
    const nuevoStock = Math.max(0, (prod.stockKg ?? 0) - kgDescontar);
    const nuevoReserved = pedidoId
      ? Math.max(0, (prod.stockReservedKg ?? 0) - kgDescontar)
      : prod.stockReservedKg ?? 0;

    tx.update(prodRef, { stockKg: nuevoStock, stockReservedKg: nuevoReserved });

    // 2. Grabar etiqueta
    const etiquetaRef = doc(collection(db, 'etiquetas'));
    etiquetaId = etiquetaRef.id;
    tx.set(etiquetaRef, {
      ...etiqueta,
      empacadaEn: serverTimestamp(),
    });

    // 3. Marcar item del pedido como empacado (si aplica)
    if (pedidoId) {
      const pedidoRef = doc(db, 'pedidos', pedidoId);
      const pedidoSnap = await tx.get(pedidoRef);
      if (pedidoSnap.exists()) {
        const pedido = pedidoSnap.data();
        const items = (pedido.items ?? []).map((item: PedidoItemEmpaque) => {
          if (item.productoId === productoId && item.estado === 'pagado') {
            return { ...item, estado: 'empacado' };
          }
          return item;
        });
        const todosEmpacados = items.every((i: PedidoItemEmpaque) => i.estado === 'empacado');
        tx.update(pedidoRef, {
          items,
          ...(todosEmpacados ? { estado: 'listo_despacho' } : {}),
        });
      }
    }
  });

  return etiquetaId;
}
