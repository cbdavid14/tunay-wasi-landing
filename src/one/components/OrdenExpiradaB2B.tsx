/**
 * OrdenExpiradaB2B — Pantalla de cotización B2B aceptada pero sin pago en 24h (US-41)
 * Se muestra cuando: cotizacion.estado === 'EXPIRADA' y la cotización fue previamente ACEPTADA
 */
import React from 'react'
import type { CotizacionONE } from '../types'

function formatPEN(cents: number) {
  return 'S/ ' + (cents / 100).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-PE', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

const OrdenExpiradaB2B: React.FC<{
  cotizacion: CotizacionONE
  onContactarCaficultor: (cotizacion: CotizacionONE) => void
  onVerLoteNuevaOferta: (productoId: string) => void
  onVerCompras: () => void
}> = ({ cotizacion, onContactarCaficultor, onVerLoteNuevaOferta, onVerCompras }) => {
  const ultimaRonda = cotizacion.rondas[cotizacion.rondas.length - 1]
  const kgNegociados = ultimaRonda?.kgSolicitados ?? 0
  const precioCents  = ultimaRonda?.precioOfertadoCents ?? 0
  const totalCents   = kgNegociados * precioCents
  const precioPublicadoCents = Math.round(precioCents * 1.04) // estimado precio lista

  // Encontrar ronda de aceptación del negocio
  const rondaAceptacion = [...cotizacion.rondas].reverse().find(r => r.autorRol === 'buyer_b2b')
  const fechaAceptacion = rondaAceptacion ? formatFecha(rondaAceptacion.createdAt) : '—'
  const fechaExpiracion = cotizacion.expiraAt ? formatFecha(cotizacion.expiraAt) : '—'

  const actorLabel = (rol: 'buyer_b2b' | 'seller') =>
    rol === 'buyer_b2b' ? 'Tú (comprador)' : cotizacion.caficultorNombre

  const actorColor = (rol: 'buyer_b2b' | 'seller') =>
    rol === 'buyer_b2b' ? '#6495ED' : 'var(--tw-terra)'

  // Timeline de historia
  type TlDot = 'done' | 'warn' | 'cancel'
  const timeline: { dot: TlDot; label: string; sub: string }[] = [
    ...cotizacion.rondas.map((r, i) => ({
      dot: 'done' as TlDot,
      label: i === 0
        ? `Oferta enviada · ${formatPEN(r.precioOfertadoCents)}/kg · ${r.kgSolicitados} kg`
        : r.autorRol === 'seller'
          ? `Contraoferta del caficultor · ${formatPEN(r.precioOfertadoCents)}/kg`
          : `Oferta aceptada · ${formatPEN(r.precioOfertadoCents)}/kg`,
      sub: formatFecha(r.createdAt),
    })),
    { dot: 'warn', label: 'Aviso de vencimiento enviado', sub: 'Notificación "Vence en 2h"' },
    { dot: 'cancel', label: 'Orden cancelada · pago no recibido', sub: `${fechaExpiracion} · Stock restaurado` },
  ]

  const dotStyle = (type: TlDot): React.CSSProperties => ({
    width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4,
    background: type === 'done' ? 'var(--tw-sage)' : type === 'warn' ? '#f39c12' : '#e74c3c',
  })

  return (
    <div style={{ padding: '0 0 32px' }}>

      {/* Estado principal */}
      <div style={{
        background: 'rgba(231,76,60,.05)', border: '1.5px solid rgba(231,76,60,.25)',
        borderRadius: 12, padding: 18, display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16,
      }}>
        <span style={{ fontSize: 36, flexShrink: 0 }}>⌛</span>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif', marginBottom: 4 }}>
            Tiempo de pago vencido
          </div>
          <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', lineHeight: 1.6 }}>
            Tu oferta aceptada el {fechaAceptacion} no fue pagada en <strong style={{ color: 'var(--tw-terra)' }}>24 horas</strong>.
            El stock fue restaurado automáticamente.
          </div>
        </div>
      </div>

      {/* Resumen del acuerdo */}
      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        Lo que se había acordado
      </div>
      <div style={{
        background: 'var(--tw-card)', border: '1px solid var(--tw-border)',
        borderRadius: 10, padding: '11px 13px', marginBottom: 14,
      }}>
        {[
          ['Lote',            cotizacion.productoNombre,       undefined],
          ['Caficultor',      cotizacion.caficultorNombre,     undefined],
          ['Precio negociado', formatPEN(precioCents) + ' / kg', 'var(--tw-terra)'],
          ['Precio publicado', formatPEN(precioPublicadoCents) + ' / kg', 'var(--tw-text-muted)', true],
          ['Volumen',         `${kgNegociados} kg`,            undefined],
          ['Total acordado',  formatPEN(totalCents),           'var(--tw-terra)'],
          ['Vencía',          fechaExpiracion,                  '#e74c3c'],
        ].map(([k, v, c, strike]) => (
          <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--tw-border)' }}>
            <span style={{ fontSize: 9, color: 'var(--tw-text-muted)', fontWeight: 600 }}>{k}</span>
            <span style={{
              fontSize: k === 'Total acordado' ? 14 : 10,
              fontWeight: 800,
              color: (c as string | undefined) ?? 'var(--tw-text)',
              textDecoration: strike ? 'line-through' : undefined,
            }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Historial de negociación */}
      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        Negociación ({cotizacion.rondas.length} {cotizacion.rondas.length === 1 ? 'ronda' : 'rondas'})
      </div>
      <div style={{
        background: 'var(--tw-card)', border: '1px solid var(--tw-border)',
        borderRadius: 10, padding: '10px 12px', marginBottom: 14,
      }}>
        {cotizacion.rondas.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: i < cotizacion.rondas.length - 1 ? '1px solid var(--tw-border)' : 'none' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: actorColor(r.autorRol), marginTop: 4, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {actorLabel(r.autorRol)}
              </div>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif' }}>
                {formatPEN(r.precioOfertadoCents)} / kg · {r.kgSolicitados} kg
              </div>
              <div style={{ fontSize: 8, color: 'var(--tw-text-muted)', marginTop: 1 }}>
                {formatFecha(r.createdAt)}
              </div>
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10, padding: '7px 0' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e74c3c', marginTop: 4, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#e74c3c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sistema</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#e74c3c' }}>Orden cancelada · pago no recibido</div>
            <div style={{ fontSize: 8, color: 'var(--tw-text-muted)', marginTop: 1 }}>{fechaExpiracion} · Expiró</div>
          </div>
        </div>
      </div>

      {/* Timeline simplificado */}
      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        Historial de la orden
      </div>
      <div style={{
        background: 'var(--tw-card)', border: '1px solid var(--tw-border)',
        borderRadius: 10, padding: '12px 14px', marginBottom: 14,
      }}>
        {timeline.map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < timeline.length - 1 ? 12 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={dotStyle(t.dot)} />
              {i < timeline.length - 1 && (
                <div style={{ width: 1, flex: 1, minHeight: 14, background: 'var(--tw-border)', marginTop: 3 }} />
              )}
            </div>
            <div style={{ paddingBottom: i < timeline.length - 1 ? 4 : 0 }}>
              <div style={{
                fontSize: 11, fontWeight: 700,
                color: t.dot === 'done' ? 'var(--tw-text)' : t.dot === 'warn' ? '#f39c12' : '#e74c3c',
              }}>{t.label}</div>
              <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', marginTop: 2 }}>{t.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Panel explicativo */}
      <div style={{
        background: 'var(--tw-card)', border: '1px solid var(--tw-border)',
        borderRadius: 10, padding: '12px 14px', marginBottom: 12,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>¿Qué pasó?</div>
        <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', lineHeight: 1.7 }}>
          La oferta fue aceptada y se creó la orden, pero el pago debía confirmarse en{' '}
          <strong style={{ color: 'var(--tw-text)' }}>24 horas</strong>. Al vencer el plazo sin pago,
          la orden se canceló automáticamente y el lote volvió a estar disponible.
          Puedes contactar al caficultor para renegociar o hacer una nueva oferta.
        </div>
      </div>

      {/* Tip */}
      <div style={{
        background: 'rgba(143,175,138,.06)', border: '1px solid rgba(143,175,138,.2)',
        borderRadius: 9, padding: '10px 13px', marginBottom: 20,
      }}>
        <div style={{ fontSize: 10, color: 'var(--tw-sage)', fontWeight: 700, marginBottom: 4 }}>💡 Tip para la próxima</div>
        <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', lineHeight: 1.6 }}>
          Ten lista tu transferencia antes de hacer la oferta — al aceptar, el clock empieza de inmediato.
        </div>
      </div>

      {/* CTAs */}
      <button
        onClick={() => onContactarCaficultor(cotizacion)}
        style={{
          width: '100%', padding: '13px 0', borderRadius: 9,
          border: '2px solid var(--tw-terra)', background: 'transparent',
          color: 'var(--tw-terra)', fontSize: 13, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', marginBottom: 8,
        }}
      >💬 Contactar al caficultor</button>
      <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', textAlign: 'center', marginBottom: 10 }}>
        Puedes escribirle para renegociar el lote
      </div>

      <button
        onClick={() => onVerLoteNuevaOferta(cotizacion.productoId)}
        style={{
          width: '100%', padding: '13px 0', borderRadius: 9, border: 'none',
          background: 'var(--tw-terra)', color: '#fff', fontSize: 13, fontWeight: 800,
          cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', marginBottom: 8,
        }}
      >🔁 Ver lote y hacer nueva oferta</button>

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

export default OrdenExpiradaB2B
