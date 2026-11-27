/**
 * NotificacionesCaficultor — Centro completo de notificaciones del caficultor
 * Tipos: nuevo_pedido · pago_liberado · cotizacion · stock_bajo · doc_rechazado · reposicion · conformidad_auto
 * Se activa desde el badge 🔔 en el sidebar o la barra de Alertas del bottom nav
 */
import React, { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, writeBatch } from 'firebase/firestore'
import { db } from '../../shared/firebase'
import { getAuth } from 'firebase/auth'

export type TipoNotif =
  | 'nuevo_pedido'
  | 'pago_liberado'
  | 'cotizacion'
  | 'stock_bajo'
  | 'doc_rechazado'
  | 'reposicion'
  | 'conformidad_auto'
  | 'sistema'

export interface NotifCaficultor {
  id: string
  tipo: TipoNotif
  titulo: string
  descripcion: string
  referenceId?: string   // pedidoId | cotizacionId | productoId
  leida: boolean
  createdAt: string
}

function formatTiempo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min  = Math.floor(diff / 60000)
  const h    = Math.floor(diff / 3600000)
  const d    = Math.floor(diff / 86400000)
  if (min < 60)   return `hace ${min} min`
  if (h < 24)     return `hace ${h} h`
  if (d === 1)    return 'ayer'
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
}

function formatFechaGrupo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d < 1) return 'Hoy'
  if (d < 2) return 'Ayer'
  return new Date(iso).toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'short' })
}

const ICON_MAP: Record<TipoNotif, string> = {
  nuevo_pedido:    '📦',
  pago_liberado:   '💰',
  cotizacion:      '🤝',
  stock_bajo:      '⚠️',
  doc_rechazado:   '📋',
  reposicion:      '🔄',
  conformidad_auto:'✅',
  sistema:         '🔔',
}

const COLOR_MAP: Record<TipoNotif, string> = {
  nuevo_pedido:    'rgba(74,144,196,.15)',
  pago_liberado:   'rgba(143,175,138,.15)',
  cotizacion:      'rgba(201,110,75,.12)',
  stock_bajo:      'rgba(243,156,18,.12)',
  doc_rechazado:   'rgba(100,100,100,.1)',
  reposicion:      'rgba(100,149,237,.12)',
  conformidad_auto:'rgba(143,175,138,.12)',
  sistema:         'rgba(100,100,100,.08)',
}

function ctaLabel(tipo: TipoNotif): string | null {
  switch (tipo) {
    case 'nuevo_pedido':     return 'Ver pedido →'
    case 'cotizacion':       return 'Responder cotización →'
    case 'stock_bajo':       return 'Actualizar stock →'
    case 'doc_rechazado':    return 'Volver a subir →'
    case 'reposicion':       return 'Ver pedido →'
    default: return null
  }
}

// ── Demo data para cuando no hay Firestore conectado ──────────────────────────
const DEMO_NOTIFS: NotifCaficultor[] = [
  {
    id: 'd1', tipo: 'nuevo_pedido', titulo: 'Nuevo pedido — Caturra Natural · 20 kg',
    descripcion: 'Cafetería El Origen (Lima) pagó S/ 920 · pago en escrow. Debes despachar antes del 26 Nov.',
    referenceId: 'TW-2855', leida: false,
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: 'd2', tipo: 'cotizacion', titulo: 'Nueva cotización — Gesha Lavado Vista Hermosa',
    descripcion: 'Roasters Miraflores solicita 15 kg. Tienes 48 h para responder con tu precio.',
    referenceId: 'CQ-2026-0088', leida: false,
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'd3', tipo: 'pago_liberado', titulo: 'Pago liberado a tu cuenta — S/ 2,250',
    descripcion: 'El comprador confirmó la entrega del pedido #TW-2831. El pago fue liberado del escrow a tu cuenta Yape.',
    referenceId: 'TW-2831', leida: false,
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    id: 'd4', tipo: 'reposicion', titulo: 'Reposición generada — Cafetería El Origen',
    descripcion: 'Se generó automáticamente el pedido #TW-2856 · 4 kg por reposición programada (ciclo 30 días).',
    referenceId: 'TW-2856', leida: false,
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: 'd5', tipo: 'stock_bajo', titulo: 'Stock bajo — Gesha Lavado (8 kg restantes)',
    descripcion: 'Tienes 2 reposiciones activas que necesitan al menos 8 kg reservados. Reponer en 48 h o pasarán a PAUSED.',
    referenceId: 'prod-gesha-01', leida: false,
    createdAt: new Date(Date.now() - 26 * 3600000).toISOString(),
  },
  {
    id: 'd6', tipo: 'doc_rechazado', titulo: 'Documento rechazado — Certificado N2',
    descripcion: 'El reviewer rechazó tu certificado de análisis físico. Motivo: "Archivo ilegible, sube una versión con mayor resolución".',
    referenceId: 'prod-gesha-01', leida: true,
    createdAt: new Date(Date.now() - 30 * 3600000).toISOString(),
  },
  {
    id: 'd7', tipo: 'conformidad_auto', titulo: 'Conformidad automática — Pedido #TW-2820',
    descripcion: 'Han pasado 72 h desde la entrega sin reclamo. El pedido fue confirmado automáticamente y el pago liberado.',
    referenceId: 'TW-2820', leida: true,
    createdAt: new Date(Date.now() - 33 * 3600000).toISOString(),
  },
]

function groupByDay(notifs: NotifCaficultor[]): { label: string; items: NotifCaficultor[] }[] {
  const map = new Map<string, NotifCaficultor[]>()
  notifs.forEach(n => {
    const key = formatFechaGrupo(n.createdAt)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(n)
  })
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }))
}

type FiltroTab = 'todos' | 'pedidos' | 'cotizaciones' | 'pagos' | 'sistema'

const NotificacionesCaficultor: React.FC<{
  caficultorId?: string
  onNavigatePedido?: (pedidoId: string) => void
  onNavigateCotizacion?: (cotizacionId: string) => void
  onNavigateProducto?: (productoId: string) => void
  demo?: boolean
}> = ({ caficultorId, onNavigatePedido, onNavigateCotizacion, onNavigateProducto, demo = false }) => {
  const [notifs, setNotifs]    = useState<NotifCaficultor[]>(demo ? DEMO_NOTIFS : [])
  const [filtro, setFiltro]    = useState<FiltroTab>('todos')
  const [cargando, setCargando] = useState(!demo)

  useEffect(() => {
    if (demo) return
    const uid = caficultorId ?? getAuth().currentUser?.uid
    if (!uid) { setCargando(false); return }

    const q = query(
      collection(db, 'one_notificaciones'),
      where('destinatarioId', '==', uid),
      orderBy('createdAt', 'desc'),
    )
    const unsub = onSnapshot(q, snap => {
      setNotifs(snap.docs.map(d => ({ id: d.id, ...d.data() } as NotifCaficultor)))
      setCargando(false)
    }, () => { setCargando(false); setNotifs(DEMO_NOTIFS) })
    return () => unsub()
  }, [caficultorId, demo])

  async function marcarTodas() {
    if (demo) { setNotifs(prev => prev.map(n => ({ ...n, leida: true }))); return }
    const uid = caficultorId ?? getAuth().currentUser?.uid
    if (!uid) return
    const batch = writeBatch(db)
    notifs.filter(n => !n.leida).forEach(n => {
      batch.update(doc(db, 'one_notificaciones', n.id), { leida: true })
    })
    await batch.commit()
  }

  async function marcarLeida(id: string) {
    if (demo) { setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n)); return }
    await updateDoc(doc(db, 'one_notificaciones', id), { leida: true })
  }

  function handleCTA(notif: NotifCaficultor) {
    marcarLeida(notif.id)
    if (!notif.referenceId) return
    switch (notif.tipo) {
      case 'nuevo_pedido':
      case 'reposicion':
      case 'pago_liberado':
      case 'conformidad_auto':
        onNavigatePedido?.(notif.referenceId); break
      case 'cotizacion':
        onNavigateCotizacion?.(notif.referenceId); break
      case 'stock_bajo':
      case 'doc_rechazado':
        onNavigateProducto?.(notif.referenceId); break
    }
  }

  const FILTROS: { id: FiltroTab; label: string }[] = [
    { id: 'todos',       label: 'Todas' },
    { id: 'pedidos',     label: 'Pedidos y pagos' },
    { id: 'cotizaciones',label: 'Cotizaciones' },
    { id: 'pagos',       label: 'Pagos' },
    { id: 'sistema',     label: 'Sistema' },
  ]

  function matchesFiltro(n: NotifCaficultor): boolean {
    if (filtro === 'todos') return true
    if (filtro === 'pedidos') return ['nuevo_pedido', 'reposicion'].includes(n.tipo)
    if (filtro === 'cotizaciones') return n.tipo === 'cotizacion'
    if (filtro === 'pagos') return ['pago_liberado', 'conformidad_auto'].includes(n.tipo)
    if (filtro === 'sistema') return ['stock_bajo', 'doc_rechazado', 'sistema'].includes(n.tipo)
    return true
  }

  const filtradas = notifs.filter(matchesFiltro)
  const sinLeer   = notifs.filter(n => !n.leida).length
  const grupos    = groupByDay(filtradas)

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 700, color: 'var(--tw-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
          Notificaciones
          {sinLeer > 0 && (
            <span style={{
              background: 'var(--tw-terra)', color: '#fff', fontSize: 10, fontWeight: 800,
              borderRadius: 12, padding: '2px 8px',
            }}>{sinLeer}</span>
          )}
        </div>
        {sinLeer > 0 && (
          <button onClick={marcarTodas} style={{
            fontSize: 9, fontWeight: 600, color: 'var(--tw-terra)', background: 'none',
            border: 'none', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
          }}>Marcar todas como leídas</button>
        )}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 2 }}>
        {FILTROS.map(f => (
          <button key={f.id} onClick={() => setFiltro(f.id)} style={{
            padding: '5px 12px', borderRadius: 20, border: '1px solid',
            borderColor: filtro === f.id ? 'var(--tw-terra)' : 'var(--tw-border)',
            background: filtro === f.id ? 'rgba(201,110,75,.1)' : 'transparent',
            color: filtro === f.id ? 'var(--tw-terra)' : 'var(--tw-text-muted)',
            fontSize: 10, fontWeight: filtro === f.id ? 700 : 500,
            cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Montserrat, sans-serif',
          }}>{f.label}</button>
        ))}
      </div>

      {/* Estado vacío / cargando */}
      {cargando && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--tw-text-muted)', fontSize: 12 }}>Cargando…</div>
      )}
      {!cargando && filtradas.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔔</div>
          <div style={{ fontSize: 14, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, marginBottom: 6 }}>
            Sin notificaciones
          </div>
          <div style={{ fontSize: 11, color: 'var(--tw-text-muted)' }}>
            {filtro === 'todos' ? 'Cuando tengas nuevos pedidos o pagos aparecerán aquí.' : 'Sin notificaciones en esta categoría.'}
          </div>
        </div>
      )}

      {/* Lista agrupada por día */}
      {grupos.map(({ label, items }) => (
        <div key={label}>
          <div style={{
            fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
            color: 'var(--tw-text-muted)', margin: '14px 0 6px', paddingLeft: 4,
          }}>{label}</div>
          {items.map(n => {
            const cta = ctaLabel(n.tipo)
            return (
              <div
                key={n.id}
                onClick={() => !n.leida && marcarLeida(n.id)}
                style={{
                  display: 'flex', gap: 11, padding: '11px 14px', borderRadius: 10,
                  marginBottom: 6, cursor: 'pointer', position: 'relative',
                  border: '1px solid',
                  borderColor: n.leida ? 'transparent' : 'var(--tw-border)',
                  background: n.leida ? 'transparent' : 'var(--tw-card)',
                  boxShadow: n.leida ? 'none' : 'var(--tw-shadow)',
                  opacity: n.leida ? 0.7 : 1,
                }}
              >
                {!n.leida && (
                  <div style={{
                    position: 'absolute', left: 5, top: '50%', transform: 'translateY(-50%)',
                    width: 5, height: 5, borderRadius: '50%', background: 'var(--tw-terra)',
                  }} />
                )}
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: COLOR_MAP[n.tipo],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 17,
                }}>{ICON_MAP[n.tipo]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-text)', lineHeight: 1.3, marginBottom: 2 }}>
                    {n.titulo}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', lineHeight: 1.4 }}>
                    {n.descripcion.split(/\*\*(.*?)\*\*/g).map((part, i) =>
                      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                    )}
                  </div>
                  {cta && (
                    <button
                      onClick={e => { e.stopPropagation(); handleCTA(n) }}
                      style={{
                        display: 'inline-block', marginTop: 5, padding: '3px 9px',
                        borderRadius: 5, fontSize: 8, fontWeight: 700, cursor: 'pointer',
                        border: '1px solid rgba(201,110,75,.35)', color: 'var(--tw-terra)',
                        background: 'transparent', fontFamily: 'Montserrat, sans-serif',
                      }}
                    >{cta}</button>
                  )}
                </div>
                <div style={{ fontSize: 8, color: 'var(--tw-text-muted)', flexShrink: 0, whiteSpace: 'nowrap', marginTop: 2 }}>
                  {formatTiempo(n.createdAt)}
                </div>
              </div>
            )
          })}
        </div>
      ))}

    </div>
  )
}

export default NotificacionesCaficultor
