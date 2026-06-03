import { useState } from 'react';
import { TW, soles, toneMap, panel } from './constants';
import { PageHead, MonoCap, SectionTitle } from './shared';
import { IconStar, IconTrophy, IconRepeat, IconPackage, IconTruck, IconUsers, IconCoffee, IconCheck, IconPlus, IconMapPin, IconArrowR, IconChevR } from './icons';
import type { User, PortalProduct } from './mockData';

interface Props {
  user: User;
  products: PortalProduct[];
  sub: { proximoEnvio: string };
  go: (v: string) => void;
  onAdd: (item: any) => void;
}

export default function PortalDashboard({ user, products, sub, go, onAdd }: Props) {
  const actions = [
    { label: 'Recomprar', Icon: IconRepeat, go: () => go('pedidos') },
    { label: 'Ver pedido', Icon: IconTruck, go: () => go('tracking') },
    { label: 'Invitar amigo', Icon: IconUsers, go: () => go('referidos') },
    { label: 'Mi suscripción', Icon: IconCoffee, go: () => go('suscripcion') },
  ];

  const recomendados = products.slice(0, 3);

  const metrics = [
    { label: 'Puntos acumulados', value: user.puntos.toLocaleString('es-PE'), unit: 'pts', Icon: IconStar, tone: 'gold', onClick: () => go('recompensas') },
    { label: 'Tu nivel', value: user.nivel, unit: '☕☕', Icon: IconTrophy, tone: 'green', onClick: () => go('recompensas') },
    { label: 'Próximo envío', value: 'en 5 días', unit: sub.proximoEnvio, Icon: IconRepeat, tone: 'cacao', onClick: () => go('suscripcion') },
    { label: 'Pedidos totales', value: user.pedidosTotales, unit: 'históricos', Icon: IconPackage, tone: 'green', onClick: () => go('pedidos') },
  ];

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

      <div style={{ marginTop: 30 }}>
        <SectionTitle>Acciones rápidas</SectionTitle>
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {actions.map((a) => (
            <button key={a.label} onClick={a.go} className="tw-qaction" style={{
              ...panel, padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 13, textAlign: 'left',
            }}>
              <span style={{ width: 40, height: 40, borderRadius: 11, background: '#e7ecdd', color: TW.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <a.Icon size={20} />
              </span>
              <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 600, color: TW.ink }}>{a.label}</span>
              <IconChevR size={16} style={{ marginLeft: 'auto', color: TW.sub }} />
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 34, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <SectionTitle>Recomendado para ti</SectionTitle>
        <button onClick={() => go('catalogo')} style={{ all: 'unset', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 600, color: TW.gold, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          Ver todos los microlotes <IconArrowR size={15} />
        </button>
      </div>
      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {recomendados.map((p) => <RecoCard key={p.id} p={p} onAdd={onAdd} />)}
      </div>
    </div>
  );
}

function RecoCard({ p, onAdd }: { p: PortalProduct; onAdd: (item: any) => void }) {
  const t = toneMap[p.tone] || toneMap.green;
  const [added, setAdded] = useState(false);
  const preventa = p.status === 'pre_venta';
  const add = () => {
    if (preventa) return;
    onAdd({ ...p, molienda: 'En Grano', cantidad: 1 });
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  return (
    <div style={{ ...panel, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} className="tw-pcard">
      <div style={{ height: 120, background: `linear-gradient(135deg, ${t.bg}, ${t.ring})`, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.fg }}>
        <IconCoffee size={42} />
        <span style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(252,246,234,.92)', color: t.fg, fontFamily: 'Montserrat, sans-serif', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>{p.variedad}</span>
      </div>
      <div style={{ padding: '15px 17px 17px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 21, fontWeight: 600, color: TW.ink, margin: 0, lineHeight: 1 }}>{p.caficultor}</h3>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: TW.sub, marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <IconMapPin size={13} /> {p.origen}, {p.region}
        </div>
        <div style={{ marginTop: 'auto', paddingTop: 14, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 26, fontWeight: 600, color: TW.ink, lineHeight: 1 }}>{soles(p.precio)}</div>
          <button onClick={add} disabled={preventa} className="tw-add-btn" style={{
            fontFamily: 'Montserrat, sans-serif', fontSize: 12.5, fontWeight: 700, padding: '9px 14px', borderRadius: 10,
            border: 'none', cursor: preventa ? 'not-allowed' : 'pointer', color: '#fff',
            background: preventa ? '#d8c6a4' : (added ? '#2d5a3d' : TW.green),
            display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all .2s',
          }}>
            {preventa ? 'Pre-venta' : added ? <><IconCheck size={15} /> Listo</> : <><IconPlus size={15} /> Agregar</>}
          </button>
        </div>
      </div>
    </div>
  );
}
