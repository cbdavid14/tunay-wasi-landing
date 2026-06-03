import { useState } from 'react';
import { TW, soles, toneMap } from './constants';
import { Eyebrow, FieldWrap } from './shared';
import { IconBag, IconArrowR, IconMinus, IconPlus, IconX, IconCoffee, IconTruck, IconCheck, IconQr, IconUpload } from './icons';
import { PORTAL_DATA } from './mockData';
import type { CartItem } from './mockData';

interface Props {
  cart: CartItem[];
  setQty: (item: CartItem, qty: number) => void;
  removeItem: (item: CartItem) => void;
  onOrderDone: () => void;
  onGoCatalogo: () => void;
}

export default function PortalCarrito({ cart, setQty, removeItem, onOrderDone, onGoCatalogo }: Props) {
  const [pago, setPago] = useState('yape');
  const [comprobante, setComprobante] = useState<string | null>(null);
  const [form, setForm] = useState({ direccion: '', distrito: 'Miraflores', telefono: '' });
  const [exito, setExito] = useState(false);
  const [touched, setTouched] = useState(false);

  const subtotal = cart.reduce((s, it) => s + it.precio * it.cantidad, 0);
  const envio = cart.length ? PORTAL_DATA.envioLima : 0;
  const total = subtotal + envio;

  const formOk = form.direccion.trim().length > 4 && /^\d{6,}$/.test(form.telefono.replace(/\s/g, ''));
  const pagoOk = pago !== 'yape' || !!comprobante;
  const canSubmit = cart.length > 0 && formOk && pagoOk;

  const setF = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const finalizar = () => {
    setTouched(true);
    if (!canSubmit) return;
    setExito(true);
    fireConfetti();
  };

  if (exito) {
    return <Exito total={total} distrito={form.distrito} onDone={() => { setExito(false); onOrderDone(); }} />;
  }

  if (!cart.length) {
    return (
      <div style={{ maxWidth: 480, margin: '60px auto 0', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#efe4d2', color: '#b3a489', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <IconBag size={32} />
        </div>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32, fontWeight: 600, color: TW.ink, margin: 0 }}>Tu bolsa está vacía</h2>
        <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, color: TW.sub, marginTop: 10 }}>Aún no agregas microlotes a tu bolsa.</p>
        <button onClick={onGoCatalogo} style={{
          fontFamily: 'Montserrat, sans-serif', fontSize: 13.5, fontWeight: 700, color: '#fff', background: TW.green,
          border: 'none', borderRadius: 11, padding: '12px 20px', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 22,
        }}>Ver microlotes <IconArrowR size={16} /></button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <Eyebrow>Checkout</Eyebrow>
      <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(28px,4vw,42px)', fontWeight: 600, color: TW.ink, margin: '12px 0 26px', letterSpacing: '-0.01em' }}>
        Tu bolsa & <span style={{ fontStyle: 'italic', color: TW.green }}>despacho.</span>
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.9fr', gap: 24, alignItems: 'start' }} className="tw-checkout-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: '#fdf8ef', border: `1px solid ${TW.line}`, borderRadius: 18, padding: 8 }}>
            {cart.map((it, i) => {
              const tone = toneMap[it.tone] || toneMap.green;
              return (
                <div key={it.id + it.molienda} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, borderBottom: i < cart.length - 1 ? `1px solid ${TW.line}` : 'none' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 12, background: tone.bg, color: tone.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <IconCoffee size={24} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 600, color: TW.ink, lineHeight: 1 }}>{it.variedad}</div>
                    <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: TW.sub, marginTop: 3 }}>{it.caficultor} · {it.molienda} · 250g</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${TW.line}`, borderRadius: 999, padding: 4 }}>
                    <button onClick={() => setQty(it, Math.max(1, it.cantidad - 1))} style={qtyBtn}><IconMinus size={13} /></button>
                    <span style={{ minWidth: 16, textAlign: 'center', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 13, color: TW.ink }}>{it.cantidad}</span>
                    <button onClick={() => setQty(it, it.cantidad + 1)} style={qtyBtn}><IconPlus size={13} /></button>
                  </div>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14, color: TW.ink, minWidth: 64, textAlign: 'right' }}>{soles(it.precio * it.cantidad)}</div>
                  <button onClick={() => removeItem(it)} style={{ ...qtyBtn, background: 'transparent', color: '#b3a489' }}><IconX size={15} /></button>
                </div>
              );
            })}
          </div>

          <div style={{ background: '#fdf8ef', border: `1px solid ${TW.line}`, borderRadius: 18, padding: 24 }}>
            <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 600, color: TW.ink, margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: 9 }}>
              <IconTruck size={20} /> Datos de envío
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <FieldWrap label="Dirección" err={touched && form.direccion.trim().length <= 4 ? 'Ingresa una dirección válida' : ''}>
                <input value={form.direccion} onChange={setF('direccion')} placeholder="Av. Larco 345, dpto 802" style={inp} />
              </FieldWrap>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <FieldWrap label="Distrito de Lima">
                  <div style={{ position: 'relative' }}>
                    <select value={form.distrito} onChange={setF('distrito')} style={{ ...inp, appearance: 'none', cursor: 'pointer', paddingRight: 28 }}>
                      {PORTAL_DATA.distritos.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-45%)', pointerEvents: 'none', color: TW.sub }}>▾</span>
                  </div>
                </FieldWrap>
                <FieldWrap label="Teléfono" err={touched && !/^\d{6,}$/.test(form.telefono.replace(/\s/g, '')) ? 'Número inválido' : ''}>
                  <input value={form.telefono} onChange={setF('telefono')} placeholder="987 654 321" style={inp} />
                </FieldWrap>
              </div>
            </div>
          </div>

          <div style={{ background: '#fdf8ef', border: `1px solid ${TW.line}`, borderRadius: 18, padding: 24 }}>
            <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 600, color: TW.ink, margin: '0 0 16px' }}>Método de pago</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[['yape', 'Yape / Plin'], ['transferencia', 'Transferencia'], ['efectivo', 'Contra entrega']].map(([v, l]) => {
                const on = pago === v;
                return (
                  <button key={v} onClick={() => setPago(v)} style={{
                    flex: 1, minWidth: 120, fontFamily: 'Montserrat, sans-serif', fontSize: 13.5, fontWeight: 600,
                    padding: '13px 14px', borderRadius: 12, cursor: 'pointer',
                    background: on ? '#e7ecdd' : '#fff', color: on ? TW.green : TW.ink,
                    border: `1.5px solid ${on ? TW.green : TW.line}`, transition: 'all .18s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  }}>{on && <IconCheck size={15} />}{l}</button>
                );
              })}
            </div>

            {pago === 'yape' && (
              <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 18, alignItems: 'center', background: '#f4ead9', borderRadius: 14, padding: 18 }} className="tw-yape">
                <div style={{ width: 124, height: 124, borderRadius: 12, background: '#fdf8ef', border: `1px solid ${TW.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c4b297' }}>
                  <IconQr size={78} />
                </div>
                <div>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13.5, fontWeight: 600, color: TW.ink }}>Escanea y paga {soles(total)}</div>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12.5, color: TW.sub, marginTop: 4, lineHeight: 1.5 }}>
                    Yape al <strong style={{ color: TW.ink }}>987 654 321</strong> · <em>Tunay Wasi SAC</em>. Luego sube tu comprobante para confirmar.
                  </div>
                  <label style={{
                    marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                    fontFamily: 'Montserrat, sans-serif', fontSize: 12.5, fontWeight: 600,
                    padding: '9px 14px', borderRadius: 10,
                    background: comprobante ? '#e3ebd8' : '#fff', color: comprobante ? '#1b5e3a' : TW.green,
                    border: `1px solid ${comprobante ? '#bfe0cc' : TW.line}`,
                  }}>
                    {comprobante ? <><IconCheck size={15} /> {comprobante}</> : <><IconUpload size={15} /> Subir comprobante</>}
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={(e) => setComprobante(e.target.files?.[0]?.name || null)} />
                  </label>
                  {touched && !comprobante && (
                    <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11.5, color: '#c2410c', marginTop: 8 }}>Sube tu comprobante para finalizar.</div>
                  )}
                </div>
              </div>
            )}
            {pago === 'transferencia' && (
              <div style={{ marginTop: 16, background: '#f4ead9', borderRadius: 14, padding: 16, fontFamily: 'Montserrat, sans-serif', fontSize: 12.5, color: TW.sub, lineHeight: 1.6 }}>
                BCP Cuenta Soles <strong style={{ color: TW.ink }}>193-2547896-0-12</strong> · CCI <strong style={{ color: TW.ink }}>00219300254789601256</strong> · Tunay Wasi SAC. Te confirmamos al recibir el voucher.
              </div>
            )}
            {pago === 'efectivo' && (
              <div style={{ marginTop: 16, background: '#f4ead9', borderRadius: 14, padding: 16, fontFamily: 'Montserrat, sans-serif', fontSize: 12.5, color: TW.sub, lineHeight: 1.6 }}>
                Pagas en efectivo al recibir tu pedido. Disponible solo dentro de Lima Metropolitana.
              </div>
            )}
          </div>
        </div>

        <div style={{ background: '#fdf8ef', border: `1px solid ${TW.line}`, borderRadius: 18, padding: 24, position: 'sticky', top: 12, boxShadow: '0 1px 2px #533b2212' }}>
          <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 600, color: TW.ink, margin: '0 0 16px' }}>Resumen</h3>
          <Row k={`Subtotal (${cart.reduce((s, i) => s + i.cantidad, 0)} bolsas)`} v={soles(subtotal)} />
          <Row k="Envío · Lima" v={soles(envio)} />
          <div style={{ height: 1, background: TW.line, margin: '14px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 700, color: TW.ink }}>Total</span>
            <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32, fontWeight: 600, color: TW.green }}>{soles(total)}</span>
          </div>

          <button onClick={finalizar} style={{
            marginTop: 18, width: '100%',
            fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 700, color: '#fff',
            background: canSubmit ? TW.green : '#d8c6a4', border: 'none', borderRadius: 12,
            padding: '15px', cursor: canSubmit ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .2s',
          }}>
            Finalizar pedido <IconArrowR size={17} />
          </button>
          <div style={{ marginTop: 12, fontFamily: 'Montserrat, sans-serif', fontSize: 11.5, color: TW.sub, textAlign: 'center', lineHeight: 1.5 }}>
            Pago verificado manualmente · confirmamos por WhatsApp en menos de 2h
          </div>
        </div>
      </div>
    </div>
  );
}

function Exito({ total, distrito, onDone }: { total: number; distrito: string; onDone: () => void }) {
  const id = 'TW-' + (2042 + Math.floor(Math.random() * 50));
  return (
    <div style={{ maxWidth: 560, margin: '30px auto 0', textAlign: 'center', position: 'relative' }}>
      <div id="tw-confetti" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 90, overflow: 'hidden' }} />
      <div style={{ width: 88, height: 88, borderRadius: '50%', background: '#e3ebd8', color: '#2d5a3d', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px' }}>
        <IconCheck size={44} />
      </div>
      <div style={{ fontFamily: '"Bowlby One SC", sans-serif', fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#2d5a3d' }}>Pedido recibido</div>
      <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 40, fontWeight: 600, color: TW.ink, margin: '12px 0 0', lineHeight: 1.05 }}>
        ¡Gracias por tu <span style={{ fontStyle: 'italic', color: TW.green }}>compra!</span>
      </h2>
      <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14.5, color: TW.sub, lineHeight: 1.6, marginTop: 14 }}>
        Tu pedido <strong style={{ color: TW.ink }}>{id}</strong> por <strong style={{ color: TW.ink }}>{soles(total)}</strong> fue registrado.
        Verificamos tu pago y lo despachamos a {distrito} en 2–3 días.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 26, flexWrap: 'wrap' }}>
        <button onClick={onDone} style={{
          fontFamily: 'Montserrat, sans-serif', fontSize: 13.5, fontWeight: 700, color: '#fff', background: TW.green,
          border: 'none', borderRadius: 11, padding: '12px 20px', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>Seguir comprando <IconArrowR size={16} /></button>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
      <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13.5, color: TW.sub }}>{k}</span>
      <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 600, color: TW.ink }}>{v}</span>
    </div>
  );
}

const qtyBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 999, border: 'none', background: '#efe4d2',
  color: '#1f3028', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const inp: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', fontFamily: 'Montserrat, sans-serif', fontSize: 14, color: TW.ink,
  background: '#fffdf8', border: `1px solid ${TW.line}`, borderRadius: 11, padding: '12px 14px', outline: 'none',
};

function fireConfetti() {
  setTimeout(() => {
    const host = document.getElementById('tw-confetti');
    if (!host) return;
    const colors = ['#1f3028', '#c9a24b', '#2d5a3d', '#b8893f', '#e7d4ad'];
    for (let i = 0; i < 90; i++) {
      const p = document.createElement('div');
      const size = 6 + Math.random() * 8;
      p.style.cssText = `position:absolute;top:-20px;left:${Math.random() * 100}%;width:${size}px;height:${size * 0.5}px;background:${colors[i % colors.length]};border-radius:1px;opacity:${0.7 + Math.random() * 0.3};transform:rotate(${Math.random() * 360}deg);animation:tw-fall ${2 + Math.random() * 2}s cubic-bezier(.2,.6,.4,1) ${Math.random() * 0.4}s forwards;`;
      host.appendChild(p);
    }
    setTimeout(() => { if (host) host.innerHTML = ''; }, 5000);
  }, 50);
}
