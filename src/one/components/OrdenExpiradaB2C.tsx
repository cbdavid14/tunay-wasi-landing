/**
 * OrdenExpiradaB2C — Pantalla de orden cancelada por no subir comprobante en 2h (US-B2C-EXP)
 * Se muestra cuando: pedido.cancelado && pedido.cancellationReason === 'PAYMENT_EXPIRED'
 */
import React from 'react'
import type { PedidoONE } from '../types'

function formatPEN(cents: number) {
  return 'S/ ' + (cents / 100).toFixed(2)
}

function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-PE', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

const OrdenExpiradaB2C: React.FC<{
  pedido: PedidoONE
  onVolverComprar: (productoId: string) => void
  onOtroMetodo: () => void
  onVerCompras: () => void
}> = ({ pedido, onVolverComprar, onOtroMetodo, onVerCompras }) => {
  const item = pedido.items[0]
  const metodoLabel = pedido.metodoPago === 'yape' ? '📱 Yape' : '🏦 BCP'
  const canceladoAt = pedido.canceladoAt ? formatFecha(pedido.canceladoAt) : '—'

  // Estimar hora de inicio: 2h antes del canceladoAt
  const inicioMs = pedido.canceladoAt
    ? new Date(pedido.canceladoAt).getTime() - 2 * 60 * 60 * 1000
    : null
  const inicioLabel = inicioMs
    ? new Date(inicioMs).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : formatFecha(pedido.createdAt)

  const tl: { dot: 'done' | 'warn' | 'cancel'; label: string; sub: string }[] = [
    { dot: 'done', label: 'Orden creada', sub: `${inicioLabel} · ${item?.productoNombre ?? 'Café'}` },
    { dot: 'done', label: `${pedido.metodoPago === 'yape' ? 'Yape' : 'Transferencia'} iniciado`, sub: 'Stock reservado por 2 horas' },
    { dot: 'warn', label: 'Aviso de vencimiento', sub: 'Notificación enviada 30 min antes' },
    { dot: 'cancel', label: 'Orden cancelada · Stock restaurado', sub: canceladoAt },
  ]

  const dotStyle = (type: 'done' | 'warn' | 'cancel'): React.CSSProperties => ({
    width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4,
    background: type === 'done' ? 'var(--tw-sage)' : type === 'warn' ? '#f39c12' : '#e74c3c',
  })

  return (
    <div style={{ padding: '0 0 32px' }}>

      {/* Estado principal */}
      <div style={{
        background: 'rgba(231,76,60,.05)', border: '1.5px solid rgba(231,76,60,.25)',
        borderRadius: 12, padding: 18, textAlign: 'center', marginBottom: 16,
      }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>⌛</div>
        <div style={{
          fontSize: 17, fontWeight: 800, color: 'var(--tw-text)',
          fontFamily: 'Cormorant Garamond, serif', marginBottom: 6,
        }}>Comprobante no enviado a tiempo</div>
        <div style={{ fontSize: 11, color: 'var(--tw-text-muted)', lineHeight: 1.6 }}>
          No subiste el comprobante de pago en <strong style={{ color: 'var(--tw-terra)' }}>2 horas</strong>.<br />
          La orden fue cancelada automáticamente y el stock restaurado.
        </div>
      </div>

      {/* Banner explicativo */}
      <div style={{
        background: 'rgba(243,156,18,.06)', border: '1px solid rgba(243,156,18,.25)',
        borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 10,
        alignItems: 'flex-start', marginBottom: 14,
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span>
        <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--tw-text)' }}>¿Por qué se canceló?</strong><br />
          Al elegir Yape o transferencia, el stock se reserva por 2 horas mientras
          subes el comprobante. Si no llega en ese plazo, la reserva se libera para
          otros compradores.
        </div>
      </div>

      {/* Timeline */}
      <div style={{
        background: 'var(--tw-card)', border: '1px solid var(--tw-border)',
        borderRadius: 10, padding: '12px 14px', marginBottom: 14,
      }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
          Lo que ocurrió
        </div>
        {tl.map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < tl.length - 1 ? 12 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={dotStyle(t.dot)} />
              {i < tl.length - 1 && (
                <div style={{ width: 1, flex: 1, minHeight: 16, background: t.dot === 'cancel' ? 'transparent' : 'var(--tw-border)', marginTop: 3 }} />
              )}
            </div>
            <div style={{ paddingBottom: i < tl.length - 1 ? 4 : 0 }}>
              <div style={{
                fontSize: 11, fontWeight: 700,
                color: t.dot === 'done' ? 'var(--tw-sage)' : t.dot === 'warn' ? '#f39c12' : '#e74c3c',
              }}>{t.label}</div>
              <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', marginTop: 2 }}>{t.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Resumen */}
      <div style={{
        background: 'var(--tw-card)', border: '1px solid var(--tw-border)',
        borderRadius: 10, padding: '11px 14px', marginBottom: 12,
      }}>
        {item && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid var(--tw-border)', marginBottom: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'linear-gradient(135deg, #c4a06a, #8b6914)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0,
            }}>☕</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-text)' }}>
                {item.productoNombre} {item.presentacion} × {item.qty}
              </div>
              <div style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>{item.caficultorNombre}</div>
            </div>
          </div>
        )}
        {[
          ['Total',  formatPEN(pedido.totalCents), 'var(--tw-terra)'],
          ['Método', metodoLabel, undefined],
          ['Venció', canceladoAt, '#e74c3c'],
        ].map(([k, v, c]) => (
          <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--tw-border)' }}>
            <span style={{ fontSize: 10, color: 'var(--tw-text-muted)', fontWeight: 600 }}>{k}</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: c ?? 'var(--tw-text)' }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Sin cargo */}
      <div style={{
        background: 'rgba(143,175,138,.07)', border: '1px solid rgba(143,175,138,.2)',
        borderRadius: 9, padding: '10px 13px', display: 'flex', gap: 9, marginBottom: 12,
      }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>✅</span>
        <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--tw-sage)' }}>Sin cargo a tu cuenta.</strong>{' '}
          Si transferiste por error, escríbenos por WhatsApp.
        </div>
      </div>

      {/* Tip Niubiz */}
      <div style={{
        background: 'rgba(201,110,75,.05)', border: '1px dashed rgba(201,110,75,.3)',
        borderRadius: 9, padding: '10px 13px', marginBottom: 20,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-terra)', marginBottom: 2 }}>
          💡 Pago instantáneo con tarjeta
        </div>
        <div style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>
          Con Niubiz no hay plazo de comprobante — el pago se confirma al instante.
        </div>
      </div>

      {/* CTAs */}
      <button
        onClick={() => item && onVolverComprar(item.productoId)}
        style={{
          width: '100%', padding: '13px 0', borderRadius: 9, border: 'none',
          background: 'var(--tw-terra)', color: '#fff', fontSize: 13, fontWeight: 800,
          cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', marginBottom: 8,
        }}
      >🔁 Volver a comprar este café</button>

      <button
        onClick={onOtroMetodo}
        style={{
          width: '100%', padding: '13px 0', borderRadius: 9,
          border: '2px solid var(--tw-terra)', background: 'transparent',
          color: 'var(--tw-terra)', fontSize: 13, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', marginBottom: 8,
        }}
      >💳 Intentar con otro método de pago</button>

      <button
        onClick={onVerCompras}
        style={{
          width: '100%', padding: '12px 0', borderRadius: 9,
          border: '1px solid var(--tw-border)', background: 'transparent',
          color: 'var(--tw-text-muted)', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
        }}
      >Ver mis compras</button>

    </div>
  )
}

export default OrdenExpiradaB2C
