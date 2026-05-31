import { doc, setDoc, getDoc, runTransaction, increment } from 'firebase/firestore';
import { db } from '@/shared/firebase';
import type { PedidoDoc, PedidoItem, PedidoShipping, PedidoTotals } from '@/shared/types/firestore';
import type { AdapterName, CheckoutPayload } from '@/shared/types/checkout';
import type { CartItem } from '@/shared/types/cart';
import { KG_PER_UNIT } from '@/features/catalog/stockUtils';
import type { WeightLabel } from '@/shared/types/firestore';
import { sendMail } from '@/services/mailService';
import { emailPagoConfirmado } from '@/services/emailTemplates';

// Firestore rejects undefined values — strip them before write.
function stripUndefined<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

function toItem(item: CartItem): PedidoItem {
  return {
    // item.productoId / item.producerPct may be undefined on old localStorage items
    productoId: (item as CartItem).productoId ?? item.sku,
    caficultorId: item.caficultor,
    sku: item.sku,
    name: item.name,
    weight: item.weight,
    grind: item.grind,
    unitCents: item.unitCents,
    qty: item.qty,
    caficultor: item.caficultor,
    finca: item.finca,
    producerPct: (item as CartItem).producerPct ?? 0,
  };
}

function deliverEstimate(zone: string, cycle?: { deliverLima: string; deliverProv: string }): string {
  const lima = cycle?.deliverLima ?? 'ago. (1a semana)';
  const prov = cycle?.deliverProv ?? 'ago. (2a semana)';
  return zone === 'provincia' ? prov : lima;
}

export async function saveOrder(
  adapter: AdapterName,
  payload: CheckoutPayload,
  cycle?: { cicloCloseAt: string; deliverLima: string; deliverProv: string },
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const { cart, shipping, totals } = payload;

  const pedidoShipping: PedidoShipping = {
    nombre: shipping.nombre,
    email: shipping.email || undefined,
    telefono: shipping.telefono,
    departamento: shipping.departamento,
    distrito: shipping.distrito,
    direccion: shipping.direccion,
    referencia: shipping.referencia,
    zone: shipping.zone,
  };

  const pedidoTotals: PedidoTotals = {
    subtotalCents: totals.subtotalCents,
    shippingCents: totals.shippingCents,
    discountCents: totals.discountCents,
    taxIncludedCents: totals.taxIncludedCents,
    totalCents: totals.totalCents,
    producerShareCents: totals.producerShareCents,
  };

  const timestamp = Date.now().toString(36).toUpperCase();
  const uuidSuffix = id.replace(/-/g, '').slice(0, 8).toUpperCase();
  const orderId = `TW-${timestamp}-${uuidSuffix}`;

  const pedido: PedidoDoc = {
    id,
    orderId,
    status: 'pendiente_pago',
    adapter,
    items: cart.items.map(toItem),
    shipping: pedidoShipping,
    totals: pedidoTotals,
    cicloCloseAt: cycle?.cicloCloseAt ?? '31 may.',
    deliverEstimate: deliverEstimate(shipping.zone, cycle),
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, 'pedidos', id), stripUndefined(pedido));
  return orderId;
}

export async function confirmPayment(pedidoId: string): Promise<void> {
  const pedidoRef = doc(db, 'pedidos', pedidoId);
  const snap = await getDoc(pedidoRef);
  if (!snap.exists()) throw new Error(`Pedido ${pedidoId} not found`);

  const pedido = snap.data() as PedidoDoc;
  if (pedido.status !== 'pendiente_pago') {
    throw new Error(`Pedido ${pedido.orderId} status is already "${pedido.status}"`);
  }

  const now = new Date().toISOString();

  await runTransaction(db, async (tx) => {
    tx.update(pedidoRef, {
      status: 'pago_confirmado',
      confirmedAt: now,
      updatedAt: now,
    });

    for (const item of pedido.items) {
      const prodRef = doc(db, 'productos', item.productoId);
      const kgNeeded = KG_PER_UNIT[item.weight as WeightLabel] * item.qty;
      tx.update(prodRef, {
        stockKg: increment(-kgNeeded),
        stockReservedKg: increment(-kgNeeded),
      });
    }
  });

  const email = pedido.shipping.email;
  if (email) {
    const { subject, html } = emailPagoConfirmado({
      nombre: pedido.shipping.nombre,
      orderId: pedido.orderId,
      items: pedido.items.map(i => ({
        name: i.name, weight: i.weight, grind: i.grind,
        qty: i.qty, unitCents: i.unitCents,
      })),
      totalCents: pedido.totals.totalCents,
      deliverEstimate: pedido.deliverEstimate,
      adapter: pedido.adapter,
    });
    await sendMail({ to: email, subject, html });
  }
}

export async function cancelOrder(pedidoId: string): Promise<void> {
  const pedidoRef = doc(db, 'pedidos', pedidoId);
  const snap = await getDoc(pedidoRef);
  if (!snap.exists()) throw new Error(`Pedido ${pedidoId} no encontrado`);

  const pedido = snap.data() as PedidoDoc;
  if (pedido.status !== 'pendiente_pago') {
    throw new Error('Solo se pueden cancelar pedidos con estado "pendiente_pago"');
  }

  const now = new Date().toISOString();

  await runTransaction(db, async (tx) => {
    tx.update(pedidoRef, {
      status: 'cancelado',
      cancelledAt: now,
      updatedAt: now,
    });

    for (const item of pedido.items) {
      const prodRef = doc(db, 'productos', item.productoId);
      const kgNeeded = KG_PER_UNIT[item.weight as WeightLabel] * item.qty;
      tx.update(prodRef, {
        stockReservedKg: increment(-kgNeeded),
      });
    }
  });
}
