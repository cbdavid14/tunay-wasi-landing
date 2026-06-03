import { useState, useEffect } from 'react';
import { TW, soles, toneMap, panel } from './constants';
import { PageHead, EstadoBadge, MonoCap } from './shared';
import { IconChevD, IconCoffee, IconRepeat, IconTruck, IconQr, IconX, IconMapPin, IconHeart } from './icons';
import { Colibri } from './icons';
import type { Order, PortalProduct } from './mockData';
import { PORTAL_DATA } from './mockData';

interface Props {
  orders: Order[];
  products: PortalProduct[];
  onReorder: (order: Order) => void;
  go: (v: string) => void;
}

export default function PortalPedidos({ orders, products, onReorder, go }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [modal, setModal] = useState<any>(null);

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <PageHead
        eyebrow="Tus pedidos"
        title="Historial de"
        accent="compras."
        sub="Revisa el detalle de cada pedido, vuelve a comprar tus favoritos y, en los entregados, conoce a la mano que sembró tu café."
      />

      <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {orders.map((o) => {
          const open = openId === o.id;
          const entregado = o.estado === 'entregado';
          const caf = (PORTAL_DATA.caficultores as any)[o.caficultorId];
          const nItems = o.items.reduce((s, it) => s + it.cantidad, 0);
          return (
            <div key={o.id} style={{ ...panel, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', padding: '18px 22px' }}>
                <div style={{ minWidth: 116 }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, fontWeight: 600, color: TW.ink, letterSpacing: '0.04em' }}>{o.id}</div>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: TW.sub, marginTop: 4 }}>{o.fecha}</div>
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13.5, color: TW.ink, fontWeight: 500 }}>
                    {o.items.map(it => it.nombre).join(' · ')}
                  </div>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: TW.sub, marginTop: 3 }}>{nItems} {nItems === 1 ? 'bolsa' : 'bolsas'} · 250g c/u</div>
                </div>
                <EstadoBadge estado={o.estado} size="sm" />
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, fontWeight: 600, color: TW.ink, minWidth: 78, textAlign: 'right' }}>{soles(o.total)}</div>
                <button onClick={() => setOpenId(open ? null : o.id)} style={{
                  fontFamily: 'Montserrat, sans-serif', fontSize: 12.5, fontWeight: 600, padding: '10px 15px', borderRadius: 999,
                  cursor: 'pointer', background: open ? TW.green : '#e7ecdd', color: open ? '#fff' : TW.green, border: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: 7, transition: 'all .18s', whiteSpace: 'nowrap',
                }}>
                  Ver detalle <IconChevD size={15} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                </button>
              </div>

              {open && (
                <div style={{ borderTop: `1px solid ${TW.line}`, background: '#faf2e2', padding: '18px 22px', animation: 'tw-fade .2s ease' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {o.items.map((it, i) => {
                      const prod = products.find(p => p.id === it.productId);
                      const tone = toneMap[prod ? prod.tone : 'green'] || toneMap.green;
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 10, background: tone.bg, color: tone.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <IconCoffee size={20} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13.5, fontWeight: 600, color: TW.ink }}>{it.nombre}</div>
                            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: TW.sub, marginTop: 2 }}>{it.molienda} · {it.cantidad} × {soles(it.precio)}</div>
                          </div>
                          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13.5, fontWeight: 700, color: TW.ink }}>{soles(it.precio * it.cantidad)}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
                    <button onClick={() => onReorder(o)} style={{
                      fontFamily: 'Montserrat, sans-serif', fontSize: 13.5, fontWeight: 700, color: '#fff', background: TW.green,
                      border: 'none', borderRadius: 11, padding: '12px 18px', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all .2s',
                    }}><IconRepeat size={16} /> Recomprar</button>
                    {o.estado !== 'entregado' && (
                      <button onClick={() => go('tracking')} style={{
                        fontFamily: 'Montserrat, sans-serif', fontSize: 13.5, fontWeight: 600, color: TW.ink, background: '#fdf8ef',
                        border: `1px solid ${TW.line}`, borderRadius: 11, padding: '12px 18px', cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 7, transition: 'all .2s',
                      }}><IconTruck size={16} /> Rastrear</button>
                    )}
                    <button onClick={() => entregado && setModal(caf)} disabled={!entregado}
                      style={{
                        fontFamily: 'Montserrat, sans-serif', fontSize: 13.5, fontWeight: 600, color: TW.ink, background: '#fdf8ef',
                        border: `1px solid ${TW.line}`, borderRadius: 11, padding: '12px 18px',
                        display: 'inline-flex', alignItems: 'center', gap: 7, transition: 'all .2s',
                        opacity: entregado ? 1 : 0.45, cursor: entregado ? 'pointer' : 'not-allowed',
                      }}>
                      <IconQr size={16} /> Ver origen
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {modal && <TrazaModal caf={modal} onClose={() => setModal(null)} />}
    </div>
  );
}

function TrazaModal({ caf, onClose }: { caf: any; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(31,48,40,.55)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, animation: 'tw-fade .2s ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fdf8ef', borderRadius: 24, maxWidth: 720, width: '100%',
        maxHeight: '90vh', overflow: 'auto', position: 'relative',
        boxShadow: '0 40px 90px -30px #3a2a18aa',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16, zIndex: 2,
          width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'rgba(252,246,234,.92)', color: TW.ink, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px #533b2233',
        }}><IconX size={18} /></button>

        <div style={{ display: 'grid', gridTemplateColumns: '0.85fr 1.15fr' }} className="tw-modal-grid">
          <div style={{ position: 'relative', background: '#e7ecdd', minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b8a5a' }}>
            <IconCoffee size={64} />
            <div style={{ position: 'absolute', bottom: 14, left: 14, display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(31,48,40,.82)', color: '#fff', padding: '7px 12px', borderRadius: 999 }}>
              <IconMapPin size={14} /> <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 600 }}>{caf.ubicacion}</span>
            </div>
          </div>

          <div style={{ padding: '30px 30px 28px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: TW.gold }}>
              <Colibri size={20} /> <div style={{ fontFamily: '"Bowlby One SC", sans-serif', fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: TW.gold }}>Trazabilidad · {caf.finca}</div>
            </div>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 34, fontWeight: 600, color: TW.ink, margin: '12px 0 2px', lineHeight: 1 }}>
              {caf.nombre}
            </h2>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: TW.sub }}>{caf.familia} · {caf.altitud} msnm</div>

            <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13.5, lineHeight: 1.65, color: '#544b3d', marginTop: 16 }}>
              {caf.historia}
            </p>

            <div style={{ marginTop: 18 }}>
              <MonoCap mb={10}>Notas de cata</MonoCap>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {caf.cata.map((n: string) => (
                  <span key={n} style={{
                    fontFamily: 'Montserrat, sans-serif', fontSize: 11.5, fontWeight: 600, color: '#9a6f2e',
                    background: '#f6efe2', border: '1px solid #e7d4ad', padding: '5px 11px', borderRadius: 999,
                  }}>{n}</span>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 20, padding: '16px 18px', background: '#eef0e2', borderRadius: 14, borderLeft: `3px solid ${TW.green}` }}>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 17, lineHeight: 1.5, color: TW.green, margin: 0 }}>
                {caf.mensaje}
              </p>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 600, color: TW.ink, marginTop: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
                <IconHeart size={14} /> {caf.nombre} · {caf.finca}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
