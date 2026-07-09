/**
 * CheckoutB2B.tsx — F11: Checkout con IGV, método de pago y confirmación de pedido
 * Actor: Tostadora / Cafetería
 */
import { useState } from 'react';
import type { LoteDoc } from '@/shared/types/marketplace';
import type { PerfilCafeteria } from '@/shared/types/auth';
import { createMktPedido } from '@/features/marketplace/marketplaceService';
import { IGV, KG_POR_SACO } from '@/shared/config';
import { openIzipayModal } from '@/features/marketplace/adapters/izipayAdapter';
import { useIsMobile } from '@/shared/mobileStyles';

const C = {
  green: '#1f3028', cream: '#f2e0cc', terra: '#c96e4b',
  sage: '#8faf8a', tan: '#c4b297', brown: '#533b22',
};

interface CarritoItem {
  lote: LoteDoc;
  sacos?: number;
  feeLaboratorioPEN?: number;
}

interface Props {
  items: CarritoItem[];
  perfil: PerfilCafeteria;
  onVolver: () => void;
  onConfirmar: (pedidoId: string) => void;
}

export default function CheckoutB2B({ items, perfil, onVolver, onConfirmar }: Props) {
  const isMobile = useIsMobile();
  const [step, setStep] = useState<'resumen' | 'datos' | 'pago' | 'confirmado'>('resumen');
  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [izipayError, setIzipayError] = useState<string | null>(null);
  const [form, setForm] = useState({
    razonSocial: perfil.empresa ?? '',
    ruc: perfil.ruc ?? '',
    contacto: perfil.nombre ?? '',
    email: perfil.email ?? '',
    telefono: perfil.telefono ?? '',
    direccion: perfil.direccionEntrega ?? '',
    metodoPago: 'transferencia' as 'transferencia' | 'izipay' | 'yape',
  });

  const subtotal = items.reduce((s, i) => s + (i.lote.precioVentaPEN ?? 0) * (i.sacos ?? 1), 0);
  const igv = Math.round(subtotal * IGV);
  const feeLab = items.reduce((s, i) => s + (i.feeLaboratorioPEN ?? 0), 0);
  const total = subtotal + igv + feeLab;

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleConfirmar() {
    setGuardando(true);
    setIzipayError(null);
    try {
      const reservaExpiraAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
      let ultimoPedidoId = '';
      for (const item of items) {
        const sacos = item.sacos ?? 1;
        const precioSaco = item.lote.precioVentaPEN ?? 0;
        const sub = sacos * precioSaco;
        const igvItem = Math.round(sub * IGV);
        const feeLabItem = item.feeLaboratorioPEN ?? 0;
        const totalItem = sub + igvItem + feeLabItem;
        const montoCaficultor = sacos * (item.lote.precioOrigenPEN ?? 0);

        ultimoPedidoId = await createMktPedido({
          loteId: item.lote.id,
          tostadoraId: perfil.uid,
          caficultorId: item.lote.caficultorId,
          sacosSolicitados: sacos,
          kgTotal: sacos * KG_POR_SACO,
          precioSacoPEN: precioSaco,
          subtotalPEN: sub,
          igvPEN: igvItem,
          ...(feeLabItem > 0 ? { feeLaboratorioPEN: feeLabItem } : {}),
          totalPEN: totalItem,
          metodoPago: form.metodoPago,
          pagoStatus: 'pendiente',
          reservaExpiraAt,
          razonSocial: form.razonSocial,
          ruc: form.ruc,
          contacto: form.contacto,
          email: form.email,
          telefono: form.telefono,
          direccionEntrega: form.direccion,
          logisticaStatus: 'pendiente_pago',
          pagoCaficultorStatus: 'pendiente',
          montoCaficultorPEN: montoCaficultor,
        });

        if (form.metodoPago === 'izipay' || form.metodoPago === 'yape') {
          if (form.metodoPago === 'yape' && totalItem > 500) {
            setIzipayError('Yape tiene un límite de S/ 500 por transacción. Usa transferencia bancaria o Izipay para este pedido.');
            setGuardando(false);
            return;
          }
          const result = await openIzipayModal({
            orderId: ultimoPedidoId,
            amount: totalItem,
            email: form.email,
            nombre: form.contacto,
          });
          if (!result.ok) {
            setIzipayError(result.errorMessage ?? 'Pago cancelado');
            setGuardando(false);
            return;
          }
        }
      }
      setPedidoId(ultimoPedidoId);
      setStep('confirmado');
    } finally {
      setGuardando(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: isMobile ? '13px 14px' : '10px 12px',
    border: '1px solid #ddd',
    borderRadius: 8,
    fontFamily: 'Montserrat',
    fontSize: isMobile ? 16 : 13, // 16px evita zoom en iOS
    color: C.brown,
    background: 'white',
    boxSizing: 'border-box',
    minHeight: isMobile ? 48 : 'auto',
  };

  // ── Confirmado ─────────────────────────────────────────────────────────────
  if (step === 'confirmado') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f3ee', padding: isMobile ? '24px 16px' : 40 }}>
        <div style={{ background: 'white', borderRadius: 16, padding: isMobile ? 28 : 48, maxWidth: 520, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
          <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: isMobile ? 26 : 32, color: C.brown, marginBottom: 8 }}>
            Pedido recibido
          </h2>
          <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, lineHeight: 1.7, marginBottom: 20 }}>
            Tu pedido <strong style={{ color: C.terra }}>{pedidoId}</strong> fue registrado.<br />
            {form.metodoPago === 'transferencia'
              ? <>Verificaremos el pago y notificaremos al caficultor para el despacho.</>
              : <>Tu pago fue procesado. El caficultor recibirá una notificación para el despacho.</>
            }<br />
            Recibirás la factura en <strong>{form.email}</strong>.
          </p>
          {form.metodoPago === 'transferencia' && (
            <div style={{ background: '#f7f3ee', borderRadius: 10, padding: 16, marginBottom: 16, textAlign: 'left' }}>
              <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, marginBottom: 8, textAlign: 'center' }}>Datos para transferencia</p>
              <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, margin: 0, lineHeight: 1.8 }}>
                BCP · Cuenta Corriente<br />
                <strong>191-12345678-0-90</strong><br />
                CCI: 002-191-00123456789090<br />
                A nombre de: Tunay Wasi S.A.C.<br />
                Monto exacto: <strong style={{ color: C.terra }}>S/ {total.toLocaleString()}</strong>
              </p>
            </div>
          )}
          <div style={{ background: `${C.terra}10`, border: `1px solid ${C.terra}30`, borderRadius: 8, padding: 12, marginBottom: 20 }}>
            <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.terra, margin: 0, fontWeight: 600 }}>
              Tu reserva vence en 72 horas. Si no recibimos el comprobante, los sacos se liberarán.
            </p>
          </div>
          <button onClick={() => onConfirmar(pedidoId ?? '')} style={{
            background: C.terra, color: 'white', border: 'none', borderRadius: 10,
            padding: '14px 32px', fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', width: isMobile ? '100%' : 'auto', minHeight: 48,
          }}>
            Ver mis pedidos →
          </button>
        </div>
      </div>
    );
  }

  // ── Resumen (componente reutilizable arriba en mobile, lateral en desktop) ──
  const ResumenPedido = () => (
    <div style={{
      background: 'white', borderRadius: isMobile ? 12 : 16,
      padding: isMobile ? '16px 16px 12px' : 24,
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      ...(isMobile ? {} : { position: 'sticky', top: 80 }),
    }}>
      <h3 style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: C.brown, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        Resumen del pedido
      </h3>
      {items.map((item, i) => (
        <div key={i} style={{ borderBottom: '1px solid #f0ebe4', paddingBottom: 10, marginBottom: 10 }}>
          <p style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 600, color: C.brown, margin: '0 0 2px' }}>
            {`${item.sacos} saco${(item.sacos ?? 1) > 1 ? 's' : ''} (${(item.sacos ?? 1) * 60}kg)`}
          </p>
          <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, margin: 0 }}>{item.lote.nombreLote}</p>
          <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.terra, margin: '3px 0 0', fontWeight: 700 }}>
            S/ {((item.lote.precioVentaPEN ?? 0) * (item.sacos ?? 1)).toLocaleString()}
          </p>
        </div>
      ))}
      {[
        { label: 'Subtotal', val: subtotal },
        { label: 'IGV (18%)', val: igv },
        ...(feeLab > 0 ? [{ label: 'Catación (lab)', val: feeLab }] : []),
      ].map(row => (
        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown }}>{row.label}</span>
          <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown }}>S/ {row.val.toLocaleString()}</span>
        </div>
      ))}
      <div style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, marginBottom: 6 }}>
        Flete: pago contraentrega al courier al recibir
      </div>
      <div style={{ borderTop: `2px solid ${C.terra}`, marginTop: 8, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, color: C.brown }}>TOTAL</span>
        <span style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, fontWeight: 700, color: C.terra }}>S/ {total.toLocaleString()}</span>
      </div>
      {!isMobile && (
        <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, marginTop: 8, textAlign: 'center' }}>
          Incluye factura electrónica · Precios en soles
        </p>
      )}
    </div>
  );

  // ── Layout principal ────────────────────────────────────────────────────────
  return (
    <div style={{ background: '#f7f3ee', minHeight: '100vh', padding: isMobile ? '16px 16px 40px' : '40px 20px' }}>
      <div style={{ maxWidth: isMobile ? '100%' : 960, margin: '0 auto' }}>

        <button onClick={onVolver} style={{
          background: 'none', border: 'none', color: C.tan, fontFamily: 'Montserrat',
          fontSize: 13, cursor: 'pointer', marginBottom: isMobile ? 16 : 24,
          display: 'flex', alignItems: 'center', gap: 6, padding: 0,
        }}>
          ← Volver
        </button>

        {/* Resumen compacto arriba en mobile */}
        {isMobile && (
          <div style={{ marginBottom: 16 }}>
            <ResumenPedido />
          </div>
        )}

        <div style={{
          display: isMobile ? 'block' : 'grid',
          gridTemplateColumns: '1fr 360px',
          gap: 24,
          alignItems: 'start',
        }}>
          {/* Formulario */}
          <div style={{ background: 'white', borderRadius: 16, padding: isMobile ? 20 : 32, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

            {/* Steps */}
            <div style={{ display: 'flex', gap: 8, marginBottom: isMobile ? 20 : 28 }}>
              {[
                { key: 'resumen', label: isMobile ? '1. Resumen' : '1. Resumen' },
                { key: 'datos',   label: isMobile ? '2. Empresa' : '2. Datos de empresa' },
                { key: 'pago',    label: isMobile ? '3. Pago' : '3. Método de pago' },
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

            {/* Paso 0: Resumen */}
            {step === 'resumen' && (
              <div style={{ display: 'grid', gap: 14 }}>
                <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: isMobile ? 20 : 22, color: C.brown, margin: '0 0 4px' }}>
                  Tu pedido
                </h3>
                {items.map((item, i) => (
                  <div key={i} style={{ background: '#f7f3ee', borderRadius: 12, padding: '14px 16px' }}>
                    <p style={{ fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, color: C.brown, margin: '0 0 4px' }}>
                      {item.lote.nombreLote}
                    </p>
                    <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown, margin: '0 0 8px' }}>
                      {item.lote.variedad} · {item.lote.region} · {item.lote.puntajeOficial ?? item.lote.puntajeReferencial} pts SCA
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown }}>
                        {item.sacos ?? 1} saco{(item.sacos ?? 1) > 1 ? 's' : ''} × S/ {(item.lote.precioVentaPEN ?? 0).toLocaleString()}
                      </span>
                      <span style={{ fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, color: C.terra }}>
                        S/ {((item.lote.precioVentaPEN ?? 0) * (item.sacos ?? 1)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #e0d8d0', paddingTop: 12, display: 'grid', gap: 6 }}>
                  {[
                    { label: 'Subtotal', val: subtotal },
                    { label: 'IGV (18%)', val: igv },
                    ...(feeLab > 0 ? [{ label: 'Catación (lab)', val: feeLab }] : []),
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown }}>{row.label}</span>
                      <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown }}>S/ {row.val.toLocaleString()}</span>
                    </div>
                  ))}
                  <div style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown }}>
                    Flete: pago contraentrega al courier al recibir
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700, color: C.brown }}>TOTAL</span>
                    <span style={{ fontFamily: 'Cormorant Garamond', fontSize: 26, fontWeight: 700, color: C.terra }}>S/ {total.toLocaleString()}</span>
                  </div>
                </div>
                <div style={{ background: `${C.tan}15`, borderRadius: 8, padding: '10px 14px' }}>
                  <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, margin: 0, textAlign: 'center' }}>
                    Reserva válida por 72 horas · Incluye factura electrónica
                  </p>
                </div>
                <button
                  onClick={() => setStep('datos')}
                  style={{
                    background: C.terra, color: 'white', border: 'none', borderRadius: 10,
                    padding: '14px', fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700,
                    cursor: 'pointer', minHeight: 48,
                  }}
                >
                  Ingresar datos de facturación →
                </button>
              </div>
            )}

            {/* Paso 1: Datos */}
            {step === 'datos' && (
              <div style={{ display: 'grid', gap: 14 }}>
                <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: isMobile ? 20 : 22, color: C.brown, margin: '0 0 4px' }}>
                  Datos de facturación
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, display: 'block', marginBottom: 4 }}>Razón Social *</label>
                    <input style={inputStyle} value={form.razonSocial} onChange={e => set('razonSocial', e.target.value)} placeholder="Café del Parque S.A.C." />
                  </div>
                  <div>
                    <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, display: 'block', marginBottom: 4 }}>RUC *</label>
                    <input style={inputStyle} value={form.ruc} onChange={e => set('ruc', e.target.value)} placeholder="20601234567" maxLength={11} />
                  </div>
                </div>
                <div>
                  <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, display: 'block', marginBottom: 4 }}>Nombre de contacto *</label>
                  <input style={inputStyle} value={form.contacto} onChange={e => set('contacto', e.target.value)} placeholder="Andrés Villanueva" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, display: 'block', marginBottom: 4 }}>Email *</label>
                    <input style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="andres@cafedelparque.pe" />
                  </div>
                  <div>
                    <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, display: 'block', marginBottom: 4 }}>Teléfono *</label>
                    <input style={inputStyle} value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+51 987 654 321" />
                  </div>
                </div>
                <div>
                  <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, display: 'block', marginBottom: 4 }}>Dirección de entrega *</label>
                  <input style={inputStyle} value={form.direccion} onChange={e => set('direccion', e.target.value)} placeholder="Av. La Mar 456, Miraflores" />
                </div>
                <button
                  onClick={() => setStep('pago')}
                  disabled={!form.razonSocial || !form.ruc || !form.email || !form.direccion}
                  style={{
                    background: C.terra, color: 'white', border: 'none', borderRadius: 10,
                    padding: '14px', fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700,
                    cursor: 'pointer', marginTop: 4, minHeight: 48,
                    opacity: (!form.razonSocial || !form.ruc || !form.email || !form.direccion) ? 0.5 : 1,
                  }}
                >
                  Continuar al pago →
                </button>
              </div>
            )}

            {/* Paso 2: Pago */}
            {step === 'pago' && (
              <div style={{ display: 'grid', gap: 14 }}>
                <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: isMobile ? 20 : 22, color: C.brown, margin: '0 0 4px' }}>
                  Método de pago
                </h3>
                <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown, margin: 0 }}>
                  Emitimos factura electrónica con IGV al confirmar.
                </p>
                {[
                  { key: 'transferencia', label: 'Transferencia bancaria', sub: 'BCP · Cuenta corriente en soles · Verificación en 2-4 horas hábiles' },
                  { key: 'izipay',        label: 'Izipay — Tarjeta débito/crédito', sub: 'Visa · Mastercard · American Express · Pago instantáneo' },
                  { key: 'yape',          label: 'Yape', sub: total > 500 ? '⚠️ Límite S/ 500 — este pedido supera el límite' : 'Pago instantáneo vía billetera digital' },
                ].map(m => (
                  <div key={m.key} onClick={() => { if (m.key === 'yape' && total > 500) return; set('metodoPago', m.key); }} style={{
                    border: `2px solid ${form.metodoPago === m.key ? C.terra : m.key === 'yape' && total > 500 ? '#ffcccc' : '#eee'}`,
                    borderRadius: 10, padding: '14px 16px',
                    cursor: m.key === 'yape' && total > 500 ? 'not-allowed' : 'pointer',
                    background: m.key === 'yape' && total > 500 ? '#fff5f5' : form.metodoPago === m.key ? 'rgba(201,110,75,0.05)' : 'white',
                    opacity: m.key === 'yape' && total > 500 ? 0.6 : 1,
                    transition: 'all 0.15s',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 14, fontWeight: 600, color: C.brown, margin: '0 0 2px' }}>{m.label}</p>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, margin: 0 }}>{m.sub}</p>
                      </div>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginLeft: 12,
                        border: `2px solid ${form.metodoPago === m.key ? C.terra : '#ddd'}`,
                        background: form.metodoPago === m.key ? C.terra : 'white',
                      }} />
                    </div>
                  </div>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginTop: 4 }}>
                  <button onClick={() => setStep('datos')} style={{
                    background: 'white', color: C.tan, border: '1px solid #ddd', borderRadius: 10,
                    padding: '14px', fontFamily: 'Montserrat', fontSize: 13, cursor: 'pointer', minHeight: 48,
                  }}>
                    ← Volver
                  </button>
                  <button
                    onClick={handleConfirmar}
                    disabled={guardando}
                    style={{
                      background: C.terra, color: 'white', border: 'none', borderRadius: 10,
                      padding: '14px', fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700,
                      cursor: guardando ? 'not-allowed' : 'pointer',
                      opacity: guardando ? 0.6 : 1, minHeight: 48,
                    }}
                  >
                    {guardando
                      ? (form.metodoPago === 'transferencia' ? 'Registrando...' : 'Abriendo pago...')
                      : `Confirmar S/${total.toLocaleString()}`}
                  </button>
                </div>
                {izipayError && (
                  <div style={{ background: '#fff0ee', border: '1px solid #f5c6c6', borderRadius: 8, padding: '10px 14px' }}>
                    <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: '#c0392b', margin: 0 }}>{izipayError}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Resumen lateral — solo desktop */}
          {!isMobile && <ResumenPedido />}
        </div>
      </div>
    </div>
  );
}
