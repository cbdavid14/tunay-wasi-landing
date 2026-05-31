import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Money } from '@/shared/money';
import { useCartIsCheckoutOpen, useCartActions, useCartItems } from '@/features/cart/useCart';
import { useCheckout } from '../useCheckout';
import { useCartTotals } from '@/features/cart/useCartTotals';
import { useYapePlin } from '@/features/catalog/useYapePlin';
import { useCupon } from '@/features/catalog/useCupon';

// ── Tipos locales ────────────────────────────────────────────────────────────

interface DatosEnvio {
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  distrito: string;
  referencia: string;
  zona: 'lima' | 'provincia';
}

const EMPTY: DatosEnvio = {
  nombre: '', email: '', telefono: '',
  direccion: '', distrito: '', referencia: '',
  zona: 'lima',
};

// ── Estilos compartidos ──────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  fontFamily: 'Montserrat, sans-serif', fontSize: 13,
  padding: '10px 12px', borderRadius: 10,
  background: '#faf3e6', color: '#1f3028',
  border: '1px solid #c4b29733', outline: 'none',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'Bowlby One SC, sans-serif', fontSize: 9,
  letterSpacing: '0.2em', textTransform: 'uppercase',
  color: '#947a5e', marginBottom: 5, display: 'block',
};

// ── CheckoutV1 ───────────────────────────────────────────────────────────────

export default function CheckoutV1() {
  const isOpen = useCartIsCheckoutOpen();
  const { closeCheckout } = useCartActions();
  const items = useCartItems();
  const { submitPayment, status, orderId, reset } = useCheckout();
  const { data: yapePlin } = useYapePlin();

  const [paso, setPaso] = useState<'resumen' | 'datos' | 'pago' | 'confirmacion'>('resumen');
  const [datos, setDatos] = useState<DatosEnvio>(EMPTY);
  const [errors, setErrors] = useState<Partial<DatosEnvio>>({});
  const [couponInput, setCouponInput] = useState('');
  const [couponApplied, setCouponApplied] = useState<string | null>(null);

  const { data: cuponData, isFetching: cuponLoading } = useCupon(couponApplied);

  const isCuponValid = Boolean(
    cuponData?.active &&
    (cuponData.maxUses === 0 || cuponData.usedCount < cuponData.maxUses)
  );
  const isCuponExhausted = Boolean(cuponData && cuponData.active && cuponData.maxUses > 0 && cuponData.usedCount >= cuponData.maxUses);
  const isCuponInvalid = couponApplied !== null && !cuponLoading && !cuponData;

  const activeCupon = isCuponValid ? cuponData! : null;

  const totals = useCartTotals(datos.zona === 'lima' ? 'lima' : 'provincia', 'domicilio', activeCupon);
  const totalsLima = useCartTotals('lima', 'domicilio', activeCupon);
  const totalsProvincia = useCartTotals('provincia', 'domicilio', activeCupon);

  if (!isOpen) return null;

  const set = (k: keyof DatosEnvio) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDatos(d => ({ ...d, [k]: e.target.value }));

  const handleContinuarDatos = () => setPaso('datos');

  const handleContinuarPago = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Partial<DatosEnvio> = {};
    if (!datos.nombre.trim()) errs.nombre = 'Requerido';
    if (!datos.email.trim() || !datos.email.includes('@')) errs.email = 'Email inválido';
    if (!datos.telefono.trim()) errs.telefono = 'Requerido';
    if (!datos.direccion.trim()) errs.direccion = 'Requerido';
    if (!datos.distrito.trim()) errs.distrito = 'Requerido';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setPaso('pago');
  };

  const handleConfirmarPago = async () => {
    await submitPayment('yape', {
      nombre: datos.nombre,
      email: datos.email,
      telefono: datos.telefono,
      direccion: datos.direccion,
      distrito: datos.distrito,
      referencia: datos.referencia,
      zone: datos.zona === 'lima' ? 'lima' : 'provincia',
    }, totals);
    if (status !== 'done') setPaso('confirmacion');
  };

  const handleReset = () => {
    reset();
    setDatos(EMPTY);
    setErrors({});
    setCouponInput('');
    setCouponApplied(null);
    setPaso('resumen');
  };

  // ── Overlay + container ──────────────────────────────────────────────────

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 110, background: '#0a1410cc', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflowY: 'auto', padding: '32px 16px' }}
      onClick={closeCheckout}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(520px, 100%)', background: '#f2e0cc', color: '#1f3028', borderRadius: 20, border: '1px solid #c96e4b33', boxShadow: '0 60px 120px -40px #000000ee', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ padding: '18px 28px', borderBottom: '1px solid #1f302818', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, fontSize: 24, color: '#1f3028', margin: 0 }}>
            {paso === 'resumen' && 'Tu pedido'}
            {paso === 'datos' && 'Datos de envío'}
            {paso === 'pago' && 'Pagar con Yape'}
            {(paso === 'confirmacion' || status === 'done') && '¡Pedido recibido!'}
          </h2>
          <button onClick={closeCheckout} style={{ width: 36, height: 36, borderRadius: '50%', background: '#1f302811', border: '1px solid #1f302822', color: '#1f3028', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>

        <div style={{ padding: '20px 28px 28px' }}>

          {/* ── CONFIRMACIÓN ── */}
          {(status === 'done') ? (
            <div style={{ textAlign: 'center', paddingTop: 20 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#8faf8a', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>✓</div>
              <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 600, color: '#1f3028', margin: '0 0 10px' }}>¡Pedido recibido!</h3>
              <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: '#7a6850', lineHeight: 1.6, margin: '0 0 20px' }}>
                Pedido <strong style={{ color: '#1f3028' }}>#{orderId}</strong> registrado.<br />
                Te confirmamos por WhatsApp en las próximas horas.
              </p>
              {orderId && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: '#7a6850', marginBottom: 8 }}>Escanea para ver la historia de tu café:</p>
                  <QRCodeSVG value={`https://tunay-wasi.web.app/historia/${orderId}`} size={140} fgColor="#1f3028" bgColor="#f2e0cc" />
                </div>
              )}
              <button onClick={handleReset} style={{ padding: '12px 28px', background: '#c96e4b', color: '#1f3028', border: 'none', borderRadius: 999, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Listo
              </button>
            </div>

          /* ── PASO 1: RESUMEN ── */
          ) : paso === 'resumen' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#fff', borderRadius: 10, border: '1px solid #1f302818' }}>
                  <div>
                    <p style={{ margin: 0, fontFamily: 'Cormorant Garamond, serif', fontSize: 16, fontWeight: 600, color: '#1f3028' }}>{item.name}</p>
                    <p style={{ margin: '2px 0 0', fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: '#7a6850' }}>{item.weight} · {item.grind} · x{item.qty}</p>
                  </div>
                  <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 700, color: '#1f3028' }}>{Money.formatPEN(item.unitCents * item.qty)}</span>
                </div>
              ))}

              {/* Zona de envío */}
              <div>
                <span style={labelStyle}>Zona de envío</span>
                <div style={{ display: 'flex', gap: 10 }}>
                  {(['lima', 'provincia'] as const).map(z => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => setDatos(d => ({ ...d, zona: z }))}
                      style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `2px solid ${datos.zona === z ? '#c96e4b' : '#1f302833'}`, background: datos.zona === z ? '#c96e4b22' : '#fff', fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 600, color: datos.zona === z ? '#c96e4b' : '#533b22', cursor: 'pointer' }}
                    >
                      {z === 'lima' ? `Lima · ${totalsLima.isFreeShipping ? 'Gratis' : Money.formatPEN(totalsLima.shippingCents)}` : `Provincia · ${totalsProvincia.isFreeShipping ? 'Gratis' : Money.formatPEN(totalsProvincia.shippingCents)}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Totales */}
              <div style={{ padding: '14px 16px', background: '#fff', borderRadius: 10, border: '1px solid #1f302818', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: '#7a6850' }}>Subtotal</span>
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: '#1f3028' }}>{Money.formatPEN(totals.subtotalCents)}</span>
                </div>
                {totals.discountCents > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: '#8faf8a' }}>Descuento cupón ({cuponData?.discountPct}%)</span>
                    <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: '#8faf8a' }}>-{Money.formatPEN(totals.discountCents)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: '#7a6850' }}>Envío</span>
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: totals.isFreeShipping ? '#8faf8a' : '#1f3028' }}>
                    {totals.isFreeShipping ? 'Gratis' : Money.formatPEN(totals.shippingCents)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #1f302814' }}>
                  <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontWeight: 600, color: '#1f3028' }}>Total</span>
                  <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700, color: '#c96e4b' }}>{Money.formatPEN(totals.totalCents)}</span>
                </div>
              </div>

              {/* Cupón */}
              {isCuponValid ? (
                <div style={{ padding: '10px 14px', background: '#8faf8a22', border: '1px solid #8faf8a66', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: '#1f3028' }}>
                    ✓ Cupón <strong>{couponApplied}</strong> aplicado · {cuponData?.discountPct}% off{cuponData?.freeShipping ? ' + envío gratis' : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setCouponApplied(null); setCouponInput(''); }}
                    style={{ background: 'none', border: 'none', color: '#947a5e', cursor: 'pointer', fontSize: 12, padding: 0 }}
                  >
                    Quitar
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={couponInput}
                    onChange={e => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Código de cupón"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    disabled={cuponLoading || !couponInput.trim()}
                    onClick={() => setCouponApplied(couponInput.trim())}
                    style={{ padding: '10px 16px', background: '#1f3028', color: '#f2e0cc', border: 'none', borderRadius: 10, cursor: couponInput.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', opacity: couponInput.trim() ? 1 : 0.5 }}
                  >
                    {cuponLoading ? '...' : 'Aplicar'}
                  </button>
                </div>
              )}
              {isCuponInvalid && (
                <p style={{ margin: 0, fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: '#c96e4b' }}>
                  Cupón no válido o no encontrado.
                </p>
              )}
              {isCuponExhausted && (
                <p style={{ margin: 0, fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: '#c96e4b' }}>
                  Este cupón ya fue utilizado el número máximo de veces.
                </p>
              )}

              <button onClick={handleContinuarDatos} style={{ padding: '16px', background: 'linear-gradient(135deg, #c96e4b 0%, #d68863 100%)', color: '#1f3028', border: 'none', borderRadius: 999, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Continuar con datos de envío →
              </button>
            </div>

          /* ── PASO 2: DATOS ── */
          ) : paso === 'datos' ? (
            <form onSubmit={handleContinuarPago} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { key: 'nombre' as const, label: 'Nombre completo', placeholder: 'Juan Pérez' },
                { key: 'email' as const, label: 'Correo electrónico', placeholder: 'juan@email.com' },
                { key: 'telefono' as const, label: 'Celular', placeholder: '987 654 321' },
                { key: 'direccion' as const, label: 'Dirección', placeholder: 'Av. Arequipa 1234, Miraflores' },
                { key: 'distrito' as const, label: 'Distrito / Ciudad', placeholder: 'Miraflores' },
                { key: 'referencia' as const, label: 'Referencia (opcional)', placeholder: 'Casa azul, frente al parque' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label style={{ ...labelStyle, color: errors[key] ? '#c96e4b' : '#947a5e' }}>
                    {label}{errors[key] && <span style={{ marginLeft: 8, fontFamily: 'Montserrat, sans-serif', fontSize: 10, fontStyle: 'italic', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>{errors[key]}</span>}
                  </label>
                  <input
                    value={datos[key]}
                    onChange={set(key)}
                    placeholder={placeholder}
                    style={{ ...inputStyle, border: `1px solid ${errors[key] ? '#c96e4b88' : '#c4b29733'}` }}
                  />
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#fff', borderRadius: 10, border: '1px solid #1f302818' }}>
                <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: '#7a6850' }}>Total a pagar</span>
                <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 700, color: '#c96e4b' }}>{Money.formatPEN(totals.totalCents)}</span>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setPaso('resumen')} style={{ flex: 1, padding: '14px', background: 'transparent', color: '#533b22', border: '1px solid #533b2255', borderRadius: 999, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontSize: 12 }}>
                  ← Volver
                </button>
                <button type="submit" style={{ flex: 2, padding: '14px', background: 'linear-gradient(135deg, #c96e4b 0%, #d68863 100%)', color: '#1f3028', border: 'none', borderRadius: 999, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Ir a pagar →
                </button>
              </div>
            </form>

          /* ── PASO 3: PAGO YAPE ── */
          ) : paso === 'pago' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', textAlign: 'center' }}>
              <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: '#533b22', margin: 0 }}>
                Escanea el código QR con Yape para completar el pago
              </p>

              <div style={{ borderRadius: 12, overflow: 'hidden', lineHeight: 0, border: '4px solid #fff', boxShadow: '0 8px 24px -8px #533b2244' }}>
                {yapePlin?.yape?.qrImageUrl ? (
                  <img src={yapePlin.yape.qrImageUrl} alt="QR Yape" style={{ width: 180, height: 180, objectFit: 'cover', display: 'block' }} />
                ) : (
                  <QRCodeSVG value={yapePlin?.yape?.phone?.replace(/^\+51/, '') ?? '917959370'} size={180} fgColor="#1f3028" bgColor="#ffffff" />
                )}
              </div>

              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: '#533b22', lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 4px' }}>📱 Abre Yape → Yapear → Escanear QR</p>
                <p style={{ margin: 0 }}>O envía al número: <strong style={{ color: '#1f3028' }}>
                  {yapePlin?.yape?.phone?.replace(/^\+51/, '').replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3') ?? '917-959-370'}
                </strong></p>
              </div>

              <div style={{ padding: '14px 24px', background: '#1f3028', borderRadius: 12, width: '100%', boxSizing: 'border-box' }}>
                <p style={{ margin: '0 0 4px', fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: '#8faf8a' }}>Monto a pagar</p>
                <p style={{ margin: 0, fontFamily: 'Cormorant Garamond, serif', fontSize: 32, fontWeight: 700, color: '#c96e4b' }}>{Money.formatPEN(totals.totalCents)}</p>
              </div>

              <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                <button onClick={() => setPaso('datos')} style={{ flex: 1, padding: '14px', background: 'transparent', color: '#533b22', border: '1px solid #533b2255', borderRadius: 999, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontSize: 12 }}>
                  ← Volver
                </button>
                <button
                  onClick={handleConfirmarPago}
                  disabled={status === 'paying'}
                  style={{ flex: 2, padding: '14px', background: status === 'paying' ? '#c4b29766' : '#742280', color: '#f2e0cc', border: 'none', borderRadius: 999, cursor: status === 'paying' ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase' }}
                >
                  {status === 'paying' ? 'Procesando...' : '✅ Ya pagué'}
                </button>
              </div>

              <p style={{ margin: 0, fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: '#7a6850', lineHeight: 1.5 }}>
                ⚠️ Haz click en "Ya pagué" después de completar la transferencia en Yape
              </p>
            </div>
          ) : null}

        </div>

        {/* Footer — link políticas */}
        {status !== 'done' && paso !== 'confirmacion' && (
          <div style={{ padding: '12px 28px', borderTop: '1px solid #1f302812', textAlign: 'center' }}>
            <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 10, color: '#c4b297' }}>
              Al completar tu pedido aceptas nuestras{' '}
              <a href="/politicas/index.html" target="_blank" rel="noopener noreferrer" style={{ color: '#c96e4b', textDecoration: 'underline' }}>
                políticas de compra y privacidad
              </a>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
