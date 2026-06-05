/**
 * CheckoutB2B.tsx — F11: Checkout con IGV, método de pago y confirmación de pedido
 * Actor: Tostadora / Cafetería
 */
import { useState } from 'react';
import type { LoteDoc } from '@/shared/types/marketplace';

const C = {
  green: '#1f3028', cream: '#f2e0cc', terra: '#c96e4b',
  sage: '#8faf8a', tan: '#c4b297', brown: '#533b22',
};

interface CarritoItem {
  lote: LoteDoc;
  tipo: 'muestra' | 'saco';
  sacos?: number;
}

interface Props {
  items: CarritoItem[];
  onVolver: () => void;
  onConfirmar: () => void;
}

export default function CheckoutB2B({ items, onVolver, onConfirmar }: Props) {
  const [step, setStep] = useState<'datos' | 'pago' | 'confirmado'>('datos');
  const [form, setForm] = useState({
    razonSocial: '', ruc: '', contacto: '', email: '', telefono: '',
    direccion: '', metodoPago: 'transferencia' as 'transferencia' | 'culqi' | 'yape',
  });

  const subtotal = items.reduce((s, i) => {
    if (i.tipo === 'muestra') return s + i.lote.precioMuestraPEN;
    return s + (i.lote.precioVentaPEN ?? 0) * (i.sacos ?? 1);
  }, 0);
  const igv = Math.round(subtotal * 0.18);
  const flete = items.some(i => i.tipo === 'saco') ? 25 * items.filter(i => i.tipo === 'saco').reduce((s, i) => s + (i.sacos ?? 1), 0) : 0;
  const total = subtotal + igv + flete;

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', border: `1px solid #ddd`, borderRadius: 8,
    fontFamily: 'Montserrat', fontSize: 13, color: C.brown, background: 'white',
    boxSizing: 'border-box',
  };

  if (step === 'confirmado') {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f3ee' }}>
        <div style={{ background: 'white', borderRadius: 16, padding: 48, maxWidth: 520, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✓</div>
          <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 32, color: C.brown, marginBottom: 8 }}>
            Pedido recibido
          </h2>
          <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.tan, lineHeight: 1.7, marginBottom: 24 }}>
            Tu pedido <strong style={{ color: C.terra }}>PED-2026-0043</strong> fue registrado.<br />
            Verificaremos el pago y notificaremos al caficultor para el despacho.<br />
            Recibirás la factura electrónica en <strong>{form.email}</strong>.
          </p>
          <div style={{ background: '#f7f3ee', borderRadius: 10, padding: 16, marginBottom: 24 }}>
            <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, marginBottom: 8 }}>Datos para transferencia</p>
            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, margin: 0 }}>
              BCP · Cuenta Corriente<br />
              <strong>191-12345678-0-90</strong><br />
              CCI: 002-191-00123456789090<br />
              A nombre de: Tunay Wasi S.A.C.<br />
              Monto exacto: <strong style={{ color: C.terra }}>S/ {total.toLocaleString()}</strong>
            </p>
          </div>
          <button onClick={() => { onConfirmar(); }} style={{
            background: C.terra, color: 'white', border: 'none', borderRadius: 8,
            padding: '12px 32px', fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>
            Ver mi panel de pedidos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#f7f3ee', minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        <button onClick={onVolver} style={{
          background: 'none', border: 'none', color: C.tan, fontFamily: 'Montserrat',
          fontSize: 13, cursor: 'pointer', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          ← Volver al marketplace
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>

          {/* Formulario */}
          <div style={{ background: 'white', borderRadius: 16, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

            {/* Steps */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
              {[
                { key: 'datos', label: '1. Datos de empresa' },
                { key: 'pago', label: '2. Método de pago' },
              ].map(s => (
                <div key={s.key} style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontFamily: 'Montserrat', fontWeight: 600,
                  background: step === s.key ? C.terra : '#f0ebe4',
                  color: step === s.key ? 'white' : C.tan,
                }}>
                  {s.label}
                </div>
              ))}
            </div>

            {step === 'datos' && (
              <div style={{ display: 'grid', gap: 16 }}>
                <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, color: C.brown, margin: '0 0 4px' }}>
                  Datos de facturación
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Razón Social *</label>
                    <input style={inputStyle} value={form.razonSocial} onChange={e => set('razonSocial', e.target.value)} placeholder="Café del Parque S.A.C." />
                  </div>
                  <div>
                    <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>RUC *</label>
                    <input style={inputStyle} value={form.ruc} onChange={e => set('ruc', e.target.value)} placeholder="20601234567" maxLength={11} />
                  </div>
                </div>
                <div>
                  <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Nombre de contacto *</label>
                  <input style={inputStyle} value={form.contacto} onChange={e => set('contacto', e.target.value)} placeholder="Andrés Villanueva" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Email *</label>
                    <input style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="andres@cafedelparque.pe" />
                  </div>
                  <div>
                    <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Teléfono *</label>
                    <input style={inputStyle} value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+51 987 654 321" />
                  </div>
                </div>
                <div>
                  <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Dirección de entrega *</label>
                  <input style={inputStyle} value={form.direccion} onChange={e => set('direccion', e.target.value)} placeholder="Av. La Mar 456, Miraflores" />
                </div>
                <button
                  onClick={() => setStep('pago')}
                  disabled={!form.razonSocial || !form.ruc || !form.email}
                  style={{
                    background: C.terra, color: 'white', border: 'none', borderRadius: 8,
                    padding: '12px', fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700,
                    cursor: 'pointer', marginTop: 8, opacity: (!form.razonSocial || !form.ruc || !form.email) ? 0.5 : 1,
                  }}
                >
                  Continuar al pago →
                </button>
              </div>
            )}

            {step === 'pago' && (
              <div style={{ display: 'grid', gap: 16 }}>
                <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, color: C.brown, margin: '0 0 4px' }}>
                  Método de pago
                </h3>
                <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan }}>
                  Requerimiento B2B: emitimos factura electrónica con IGV al confirmar el pago.
                </p>
                {[
                  { key: 'transferencia', label: 'Transferencia bancaria', sub: 'BCP · Cuenta corriente en soles · Verificación en 2-4 horas hábiles' },
                  { key: 'culqi', label: 'Culqi — Tarjeta débito/crédito', sub: 'Visa · Mastercard · Diners · American Express' },
                  { key: 'yape', label: 'Yape / Plin', sub: 'Solo para montos hasta S/500' },
                ].map(m => (
                  <div key={m.key} onClick={() => set('metodoPago', m.key)} style={{
                    border: `2px solid ${form.metodoPago === m.key ? C.terra : '#eee'}`,
                    borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
                    background: form.metodoPago === m.key ? 'rgba(201,110,75,0.05)' : 'white',
                    transition: 'all 0.15s',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 14, fontWeight: 600, color: C.brown, margin: '0 0 2px' }}>{m.label}</p>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: 0 }}>{m.sub}</p>
                      </div>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        border: `2px solid ${form.metodoPago === m.key ? C.terra : '#ddd'}`,
                        background: form.metodoPago === m.key ? C.terra : 'white',
                      }} />
                    </div>
                  </div>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                  <button onClick={() => setStep('datos')} style={{
                    background: 'white', color: C.tan, border: `1px solid #ddd`, borderRadius: 8,
                    padding: '12px', fontFamily: 'Montserrat', fontSize: 13, cursor: 'pointer',
                  }}>
                    ← Volver
                  </button>
                  <button onClick={() => setStep('confirmado')} style={{
                    background: C.terra, color: 'white', border: 'none', borderRadius: 8,
                    padding: '12px', fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  }}>
                    Confirmar pedido S/{total.toLocaleString()}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Resumen de pedido */}
          <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', position: 'sticky', top: 80 }}>
            <h3 style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, color: C.brown, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
              Resumen del pedido
            </h3>
            {items.map((item, i) => (
              <div key={i} style={{ borderBottom: '1px solid #f0ebe4', paddingBottom: 12, marginBottom: 12 }}>
                <p style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 600, color: C.brown, margin: '0 0 2px' }}>
                  {item.tipo === 'muestra' ? '🧪 Muestra 200g' : `📦 ${item.sacos} saco${(item.sacos ?? 1) > 1 ? 's' : ''} (${(item.sacos ?? 1) * 60}kg)`}
                </p>
                <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: 0 }}>
                  {item.lote.nombreLote}
                </p>
                <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.terra, margin: '4px 0 0', fontWeight: 700 }}>
                  S/ {item.tipo === 'muestra' ? item.lote.precioMuestraPEN : ((item.lote.precioVentaPEN ?? 0) * (item.sacos ?? 1)).toLocaleString()}
                </p>
              </div>
            ))}

            {[
              { label: 'Subtotal', val: subtotal },
              { label: 'IGV (18%)', val: igv },
              { label: `Flete terrestre`, val: flete },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan }}>{row.label}</span>
                <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown }}>S/ {row.val.toLocaleString()}</span>
              </div>
            ))}
            <div style={{ borderTop: `2px solid ${C.terra}`, marginTop: 8, paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700, color: C.brown }}>TOTAL</span>
              <span style={{ fontFamily: 'Cormorant Garamond', fontSize: 24, fontWeight: 700, color: C.terra }}>S/ {total.toLocaleString()}</span>
            </div>
            <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, marginTop: 8, textAlign: 'center' }}>
              Incluye factura electrónica · Precios en soles peruanos
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
