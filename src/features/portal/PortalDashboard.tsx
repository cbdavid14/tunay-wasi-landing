import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/shared/firebase';
import { TW, toneMap, panel } from './constants';
import { PageHead, MonoCap, SectionTitle } from './shared';
import { IconStar, IconTrophy, IconRepeat, IconPackage, IconChevR } from './icons';
import type { User, Order } from './mockData';
import type { PedidoDoc } from '@/shared/types/firestore';

interface Props {
  user: User;
  sub: { proximoEnvio: string };
  go: (v: string) => void;
  activeOrder?: Order | null;
  userUid?: string;
}

function pedidoToDisplay(p: PedidoDoc): Order {
  const statusMap: Record<string, Order['estado']> = {
    pendiente_pago: 'por_verificar',
    pago_confirmado: 'preparando',
    en_preparacion: 'preparando',
    despachado: 'en_ruta',
    entregado: 'entregado',
    cancelado: 'entregado',
    reembolsado: 'entregado',
    confirmado: 'preparando',
    enviado: 'en_ruta',
  };
  return {
    id: p.orderId,
    firestoreId: p.id,
    fecha: '',
    total: 0,
    estado: statusMap[p.status] || 'por_verificar',
    items: p.items.map(i => ({
      productId: i.productoId,
      nombre: i.name,
      molienda: i.grind,
      cantidad: i.qty,
      precio: i.unitCents / 100,
    })),
    caficultorId: p.items[0]?.caficultorId || '',
  };
}

export default function PortalDashboard({ user, sub, go, activeOrder, userUid }: Props) {
  const [fireOrder, setFireOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!userUid) { setFireOrder(null); return; }
    const q = query(
      collection(db, 'pedidos'),
      where('clienteUid', '==', userUid),
      orderBy('createdAt', 'desc'),
      limit(1),
    );
    const unsub = onSnapshot(q, (snap) => {
      const doc = snap.docs[0]?.data() as PedidoDoc | undefined;
      if (doc?.orderId) setFireOrder(pedidoToDisplay(doc));
    });
    return unsub;
  }, [userUid]);

  const o = fireOrder || activeOrder || null;

  const metrics = [
    { label: 'Puntos acumulados', value: user.puntos.toLocaleString('es-PE'), unit: 'pts', Icon: IconStar, tone: 'gold', onClick: () => go('recompensas') },
    { label: 'Tu nivel', value: user.nivel, unit: '☕☕', Icon: IconTrophy, tone: 'green', onClick: () => go('recompensas') },
    { label: 'Próximo envío', value: 'en 5 días', unit: sub.proximoEnvio, Icon: IconRepeat, tone: 'cacao', onClick: () => go('suscripcion') },
    { label: 'Pedidos totales', value: user.pedidosTotales, unit: 'históricos', Icon: IconPackage, tone: 'green', onClick: () => go('pedidos') },
  ];

  const statusLabel: Record<string, string> = {
    por_verificar: 'Pendiente de pago',
    preparando: 'En preparación',
    en_ruta: 'En camino',
    entregado: 'Entregado',
  };

  const statusStep: Record<string, number> = {
    por_verificar: 1,
    preparando: 2,
    en_ruta: 3,
    entregado: 5,
  };

  const trackingSteps = ['Recibido', 'Preparando', 'Empacado', 'Enviado', 'Entregado'];
  const paso = o ? statusStep[o.estado] || 1 : 1;

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <PageHead
        eyebrow="Tu cuenta · Tunay Wasi"
        title={`¡Hola, ${user.nombre}!`}
        accent="tu café te espera. ☕"
        sub="Aquí controlas tus pedidos, tu suscripción y tus recompensas como socia de la comunidad."
      />

      <div style={{ marginTop: 26, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
        {metrics.map((m) => {
          const t = toneMap[m.tone] || toneMap.green;
          return (
            <button key={m.label} onClick={m.onClick} style={{ ...panel, padding: 20, textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 14 }} className="tw-pcard">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <MonoCap>{m.label}</MonoCap>
                <span style={{ width: 34, height: 34, borderRadius: 10, background: t.bg, color: t.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <m.Icon size={18} />
                </span>
              </div>
              <div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 34, fontWeight: 600, color: TW.ink, lineHeight: 1 }}>{m.value}</div>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: TW.sub, marginTop: 5 }}>{m.unit}</div>
              </div>
            </button>
          );
        })}
      </div>

      {o && (
        <div style={{ marginTop: 30 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <SectionTitle>Tu pedido activo</SectionTitle>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: TW.sub, letterSpacing: '0.04em' }}>{o.id}</span>
          </div>
          <div style={{ ...panel, marginTop: 14, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 22px 0' }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: TW.sub, marginTop: 2 }}>
                {statusLabel[o.estado] || o.estado} · {o.items.map(it => it.nombre).join(' · ')}
              </div>
            </div>

            <div style={{ padding: '18px 22px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                {trackingSteps.map((label, i) => {
                  const n = i + 1;
                  const done = n < paso;
                  const current = n === paso;
                  return (
                    <div key={n} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: current ? TW.gold : done ? TW.green : '#e9ddc9',
                        color: current || done ? '#fff' : TW.sub,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10.5, fontWeight: 700, fontFamily: 'Montserrat, sans-serif',
                        boxShadow: current ? `0 0 0 4px ${TW.gold}22` : 'none',
                        transition: 'all .2s',
                      }}>
                        {done ? '✓' : n}
                      </div>
                      <span style={{
                        fontFamily: 'Montserrat, sans-serif', fontSize: 9, fontWeight: current ? 700 : 500,
                        color: current || done ? TW.ink : '#b3a489', textAlign: 'center', lineHeight: 1.2,
                      }}>{label}</span>
                    </div>
                  );
                })}
              </div>

              <div style={{ position: 'relative', height: 5, borderRadius: 999, background: '#e3d6bf', overflow: 'hidden', marginTop: 4 }}>
                <div style={{
                  position: 'absolute', inset: 0, width: `${((paso - 1) / (trackingSteps.length - 1)) * 100}%`,
                  background: `linear-gradient(90deg, ${TW.green}, #2d5a3d)`, borderRadius: 999, transition: 'width .5s',
                }} />
              </div>

              <button onClick={() => go('tracking')} style={{
                marginTop: 16, fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 700,
                color: TW.green, background: '#e7ecdd', border: 'none', borderRadius: 10,
                padding: '10px 16px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7,
              }}>
                Ver seguimiento completo <IconChevR size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
