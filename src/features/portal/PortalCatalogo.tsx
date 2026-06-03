import { useState } from 'react';
import { TW, soles, toneMap } from './constants';
import { EstadoBadge, Eyebrow } from './shared';
import { IconMountain, IconMapPin, IconStar, IconBag, IconCheck, IconPlus, IconMinus, IconCoffee, IconTruck } from './icons';
import type { User, PortalProduct } from './mockData';

interface Props {
  user: User;
  products: PortalProduct[];
  activeOrder?: any;
  onAdd: (item: any) => void;
  onGoCart?: () => void;
}

export default function PortalCatalogo({ user, products, activeOrder, onAdd, onGoCart }: Props) {
  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 4px' }}>
      <div style={{ marginBottom: 8 }}>
        <Eyebrow>Microlotes · Cosecha 2026</Eyebrow>
        <h1 style={{
          fontFamily: 'Cormorant Garamond, serif', fontWeight: 600,
          fontSize: 'clamp(30px, 4vw, 46px)', lineHeight: 1.05, letterSpacing: '-0.01em',
          color: TW.ink, margin: '12px 0 0',
        }}>
          ¡Hola, {user.nombre}! Tu café ultra fresco
          <br />
          <span style={{ fontStyle: 'italic', color: TW.green }}>está listo para la cosecha.</span>
        </h1>
      </div>

      {activeOrder && (
        <button onClick={onGoCart} style={{
          all: 'unset',
          display: 'block',
          width: '100%',
          cursor: onGoCart ? 'pointer' : 'default',
        }}>
          <div style={{
          display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
          background: '#fdf8ef', border: `1px solid ${TW.line}`, borderRadius: 16,
          padding: '16px 20px', marginTop: 28, boxShadow: '0 1px 2px #533b2212',
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: '#e7ecdd', color: TW.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconTruck size={22} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: TW.sub, fontWeight: 500 }}>Tu última orden activa</div>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 15, color: TW.ink, fontWeight: 600, marginTop: 2 }}>
                Pedido {activeOrder.id} · {activeOrder.estado === 'en_ruta' ? 'en ruta de despacho' : 'en preparación'}
              </div>
            </div>
            <EstadoBadge estado={activeOrder.estado} />
            <div style={{ width: '100%', marginTop: 4 }}>
              <div style={{ height: 6, borderRadius: 999, background: '#e3d6bf', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '72%', background: `linear-gradient(90deg, ${TW.green}, #2d5a3d)`, borderRadius: 999 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.1em', color: TW.sub, textTransform: 'uppercase' }}>
                <span style={{ color: TW.green }}>● Confirmado</span>
                <span style={{ color: TW.green }}>● Preparado</span>
                <span style={{ color: TW.gold }}>● En ruta</span>
                <span>○ Entregado</span>
              </div>
            </div>
          </div>
        </button>
      )}

      <div style={{ marginTop: 40, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 26, fontWeight: 600, color: TW.ink, margin: 0 }}>
          Microlotes disponibles
        </h2>
        <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: TW.sub }}>
          {products.filter(p => p.status === 'en_venta').length} en venta · {products.filter(p => p.status === 'pre_venta').length} en pre-venta
        </span>
      </div>

      <div style={{
        marginTop: 20, display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 22,
      }}>
        {products.map(p => <ProductCard key={p.id} p={p} onAdd={onAdd} />)}
      </div>
    </div>
  );
}

function ProductCard({ p, onAdd }: { p: PortalProduct; onAdd: (item: any) => void }) {
  const [molienda, setMolienda] = useState('En Grano');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const tone = toneMap[p.tone] || toneMap.green;
  const preventa = p.status === 'pre_venta';

  const add = () => {
    if (preventa) return;
    onAdd({ ...p, molienda, cantidad: qty });
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  return (
    <div style={{
      background: '#fdf8ef', border: `1px solid ${TW.line}`, borderRadius: 20,
      overflow: 'hidden', boxShadow: '0 1px 2px #533b2212',
      display: 'flex', flexDirection: 'column',
      transition: 'box-shadow .25s, transform .25s',
    }} className="tw-pcard">
      <div style={{ position: 'relative', padding: 14, paddingBottom: 0 }}>
        <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ width: '100%', height: 190, background: tone.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tone.fg }}>
            <IconCoffee size={48} />
          </div>
          <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{
              background: 'rgba(252,246,234,.92)', backdropFilter: 'blur(4px)',
              color: tone.fg, fontFamily: 'Montserrat, sans-serif', fontSize: 11, fontWeight: 700,
              padding: '5px 10px', borderRadius: 999, boxShadow: '0 1px 3px #533b2222',
            }}>{p.variedad}</span>
          </div>
          <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6 }}>
            <span style={{
              background: 'rgba(31,48,40,.82)', backdropFilter: 'blur(4px)',
              color: '#fff', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 500,
              padding: '5px 9px', borderRadius: 999, letterSpacing: '0.04em',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}><IconMountain size={11} /> {p.altitud}m</span>
          </div>
          <div style={{ position: 'absolute', bottom: 12, left: 12 }}>
            <span style={{
              background: 'rgba(252,246,234,.92)', backdropFilter: 'blur(4px)',
              color: TW.ink, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 500,
              padding: '5px 9px', borderRadius: 999, letterSpacing: '0.04em',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}><IconMapPin size={11} /> {p.origen}</span>
          </div>
          {preventa && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(31,48,40,.5)', display: 'flex', alignItems: 'flex-end', padding: 12 }}>
              <span style={{ background: TW.gold, color: '#fff', fontFamily: 'Montserrat, sans-serif', fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 999, letterSpacing: '0.05em' }}>
                PRE-VENTA · entrega jul 2026
              </span>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, fontWeight: 600, color: TW.ink, margin: 0, lineHeight: 1 }}>
              {p.caficultor}
            </h3>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: TW.sub, marginTop: 4 }}>
              {p.proceso} · {p.region}
            </div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: tone.fg, fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 700 }}>
            <IconStar size={13} fill={tone.fg} /> {p.sca}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {p.perfil.map(t => (
            <span key={t} style={{
              fontFamily: 'Montserrat, sans-serif', fontSize: 11, fontWeight: 600, color: tone.fg,
              background: tone.bg, border: `1px solid ${tone.ring}`, padding: '4px 10px', borderRadius: 999,
            }}>{t}</span>
          ))}
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: TW.sub, marginBottom: 8 }}>
            Molienda
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['En Grano', 'Espresso', 'Prensa Francesa', 'Gota a Gota'].map(m => {
              const on = molienda === m;
              return (
                <button key={m} onClick={() => setMolienda(m)} disabled={preventa} style={{
                  fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 600,
                  padding: '7px 12px', borderRadius: 999, cursor: preventa ? 'not-allowed' : 'pointer',
                  background: on ? TW.green : '#fff',
                  color: on ? '#fff' : TW.ink,
                  border: `1px solid ${on ? TW.green : TW.line}`,
                  transition: 'all .18s', opacity: preventa ? 0.5 : 1,
                }}>{m}</button>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: TW.sub }}>250 g</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 30, fontWeight: 600, color: TW.ink, lineHeight: 1 }}>{soles(p.precio)}</div>
          </div>
          {!preventa && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${TW.line}`, borderRadius: 999, padding: 4 }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))} style={qtyBtn}><IconMinus size={14} /></button>
              <span style={{ minWidth: 18, textAlign: 'center', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14, color: TW.ink }}>{qty}</span>
              <button onClick={() => setQty(q => q + 1)} style={qtyBtn}><IconPlus size={14} /></button>
            </div>
          )}
        </div>

        <button onClick={add} disabled={preventa} className="tw-add-btn" style={{
          marginTop: 14, width: '100%',
          fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 700, letterSpacing: '0.03em',
          padding: '13px 16px', borderRadius: 12, cursor: preventa ? 'not-allowed' : 'pointer',
          border: 'none', color: '#fff',
          background: preventa ? '#d8c6a4' : (added ? '#2d5a3d' : TW.green),
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all .2s',
        }}>
          {preventa ? 'Disponible en pre-venta' : added
            ? <><IconCheck size={17} /> Agregado a la bolsa</>
            : <><IconBag size={17} /> Agregar a la bolsa</>}
        </button>
      </div>
    </div>
  );
}

const qtyBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 999, border: 'none', background: '#efe4d2',
  color: '#1f3028', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
};
