/**
 * NotificacionesNegocio — Centro completo de notificaciones del comprador (B2B/B2C)
 * Tipos: pago_confirmado · pedido_en_camino · pedido_entregado · cotizacion_respuesta
 *        stock_bajo · oferta_especial · sistema
 * Se activa desde el badge 🔔 en el header o el tab Notificaciones del perfil
 */
import React, { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, writeBatch } from 'firebase/firestore'
import { db } from '../../shared/firebase'
import { getAuth } from 'firebase/auth'

export type TipoNotifNeg =
  | 'pago_confirmado'
  | 'pedido_en_camino'
  | 'pedido_entregado'
  | 'cotizacion_respuesta'
  | 'stock_bajo'
  | 'oferta_especial'
  | 'sistema'

export interface NotifNegocio {
  id: string
  tipo: TipoNotifNeg
  titulo: string
  descripcion: string
  referenceId?: string
  leida: boolean
  createdAt: string
}

function formatTiempo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min  = Math.floor(diff / 60000)
  const h    = Math.floor(diff / 3600000)
  const d    = Math.floor(diff / 86400000)
  if (min < 60) return `hace ${min} min`
  if (h < 24)   return `hace ${h} h`
  if (d === 1)  return 'ayer'
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
}

function formatFechaGrupo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d < 1) return 'Hoy'
  if (d < 2) return 'Ayer'
  if (d < 7) return 'Esta semana'
  return new Date(iso).toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'short' })
}

const ICON_MAP: Record<TipoNotifNeg, string> = {
  pago_confirmado:    '💰',
  pedido_en_camino:   '📦',
  pedido_entregado:   '✅',
  cotizacion_respuesta: '🤝',
  stock_bajo:         '⚠️',
  oferta_especial:    '🏷️',
  sistema:            '⚙️',
}

const COLOR_MAP: Record<TipoNotifNeg, string> = {
  pago_confirmado:    'rgba(143,175,138,.15)',
  pedido_en_camino:   'rgba(74,144,196,.15)',
  pedido_entregado:   'rgba(143,175,138,.12)',
  cotizacion_respuesta: 'rgba(201,110,75,.12)',
  stock_bajo:         'rgba(243,156,18,.12)',
  oferta_especial:    'rgba(201,110,75,.1)',
  sistema:            'rgba(100,100,100,.08)',
}

function ctaLabel(tipo: TipoNotifNeg): string | null {
  switch (tipo) {
    case 'pedido_en_camino':
    case 'pedido_entregado':
    case 'pago_confirmado':
      return 'Ver pedido →'
    case 'cotizacion_respuesta':
      return 'Ver cotización →'
    case 'stock_bajo':
    case 'oferta_especial':
      return 'Ver producto →'
    default: return null
  }
}

const DEMO_NOTIFS: NotifNegocio[] = [
  {
    id: 'n1', tipo: 'pago_confirmado', titulo: 'Pago liberado — S/ 1,368.00',
    descripcion: 'Tu pedido #TW-2847 fue confirmado como entregado. Puedes descargar tu factura.',
    referenceId: 'TW-2847', leida: false,
    createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
  },
  {
    id: 'n2', tipo: 'cotizacion_respuesta', titulo: 'Respuesta a tu oferta — Bourbon Natural',
    descripcion: 'María Lucía aceptó tu oferta de S/ 48.00/kg · 25 kg. Tienes 48 h para confirmar el pedido.',
    referenceId: 'CQ-2026-0088', leida: false,
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: 'n3', tipo: 'pedido_en_camino', titulo: 'Pedido #TW-2851 en camino',
    descripcion: 'Tu pedido de Gesha Lavado · 5 kg fue despachado por Ana Torres. Número de guía: OLV-394812',
    referenceId: 'TW-2851', leida: false,
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: 'n4', tipo: 'stock_bajo', titulo: 'Stock bajo — Gesha Lavado',
    descripcion: 'Quedan solo 2.5 kg del lote que sigues. ¿Quieres añadir más al carrito?',
    referenceId: 'prod-gesha-01', leida: false,
    createdAt: new Date(Date.now() - 30 * 3600000).toISOString(),
  },
  {
    id: 'n5', tipo: 'pedido_en_camino', titulo: 'Pedido #TW-2847 confirmado',
    descripcion: 'El caficultor aceptó tu pedido y prepara el despacho. Tiempo estimado: 2 días.',
    referenceId: 'TW-2847', leida: true,
    createdAt: new Date(Date.now() - 36 * 3600000).toISOString(),
  },
  {
    id: 'n6', tipo: 'sistema', titulo: 'Tu cuenta fue verificada',
    descripcion: 'Tu perfil B2B fue aprobado. Ya puedes hacer ofertas de precio negociable y comprar café verde granel.',
    leida: true,
    createdAt: new Date(Date.now() - 72 * 3600000).toISOString(),
  },
]

function groupByDay(notifs: NotifNegocio[]): { label: string; items: NotifNegocio[] }[] {
  const map = new Map<string, NotifNegocio[]>()
  notifs.forEach(n => {
    const key = formatFechaGrupo(n.createdAt)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(n)
  })
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }))
}

type FiltroTab = 'todos' | 'pedidos' | 'cotizaciones' | 'pagos' | 'sistema'

const FILTRO_TABS: { id: FiltroTab; label: string }[] = [
  { id: 'todos',       label: 'Todos' },
  { id: 'pedidos',     label: '📦 Pedidos' },
  { id: 'cotizaciones', label: '🤝 Ofertas' },
  { id: 'pagos',       label: '💰 Pagos' },
  { id: 'sistema',     label: '⚙️ Sistema' },
]

function tipoEnFiltro(tipo: TipoNotifNeg, filtro: FiltroTab): boolean {
  if (filtro === 'todos') return true
  if (filtro === 'pedidos')     return ['pedido_en_camino', 'pedido_entregado'].includes(tipo)
  if (filtro === 'cotizaciones') return ['cotizacion_respuesta'].includes(tipo)
  if (filtro === 'pagos')       return ['pago_confirmado'].includes(tipo)
  if (filtro === 'sistema')     return ['stock_bajo', 'oferta_especial', 'sistema'].includes(tipo)
  return true
}

const NotificacionesNegocio: React.FC<{
  negocioId?: string
  onNavigatePedido?: (pedidoId: string) => void
  onNavigateCotizacion?: (cotizId: string) => void
  onNavigateProducto?: (prodId: string) => void
  demo?: boolean
  /** Cuando se muestra inline en el tab Perfil (sin fondo completo) */
  inline?: boolean
}> = ({ negocioId, onNavigatePedido, onNavigateCotizacion, onNavigateProducto, demo = false, inline = false }) => {
  const [notifs, setNotifs]    = useState<NotifNegocio[]>(demo ? DEMO_NOTIFS : [])
  const [filtro, setFiltro]    = useState<FiltroTab>('todos')
  const [cargando, setCargando] = useState(!demo)

  useEffect(() => {
    if (demo) return
    const uid = negocioId ?? getAuth().currentUser?.uid
    if (!uid) { setCargando(false); return }

    const q = query(
      collection(db, 'one_notificaciones'),
      where('destinatarioId', '==', uid),
      orderBy('createdAt', 'desc'),
    )
    const unsub = onSnapshot(q, snap => {
      setNotifs(snap.docs.map(d => ({ id: d.id, ...d.data() } as NotifNegocio)))
      setCargando(false)
    }, () => { setCargando(false); setNotifs(DEMO_NOTIFS) })
    return () => unsub()
  }, [negocioId, demo])

  async function marcarTodas() {
    if (demo) { setNotifs(prev => prev.map(n => ({ ...n, leida: true }))); return }
    const uid = negocioId ?? getAuth().currentUser?.uid
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

  function handleCTA(notif: NotifNegocio) {
    marcarLeida(notif.id)
    if (!notif.referenceId) return
    switch (notif.tipo) {
      case 'pago_confirmado':
      case 'pedido_en_camino':
      case 'pedido_entregado':
        onNavigatePedido?.(notif.referenceId); break
      case 'cotizacion_respuesta':
        onNavigateCotizacion?.(notif.referenceId); break
      case 'stock_bajo':
      case 'oferta_especial':
        onNavigateProducto?.(notif.referenceId); break
    }
  }

  const noLeidas = notifs.filter(n => !n.leida).length
  const filtradas = notifs.filter(n => tipoEnFiltro(n.tipo, filtro))
  const grupos = groupByDay(filtradas)

  const outer: React.CSSProperties = inline
    ? { width: '100%' }
    : {
        maxWidth: 680, margin: '0 auto',
        fontFamily: 'Montserrat, sans-serif',
      }

  const tabSt = (id: FiltroTab): React.CSSProperties => ({
    padding: '5px 12px', borderRadius: 20, border: 'none',
    background: filtro === id ? 'var(--tw-terra)' : 'var(--tw-bg)',
    color: filtro === id ? '#fff' : 'var(--tw-text-muted)',
    fontSize: 10, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'Montserrat, sans-serif', flexShrink: 0,
  })

  if (cargando) {
    return (
      <div style={{ ...outer, display: 'flex', justifyContent: 'center', padding: '40px 0', color: 'var(--tw-text-muted)', fontSize: 12 }}>
        Cargando notificaciones…
      </div>
    )
  }

  return (
    <div style={outer}>
      {/* Cabecera */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontWeight: 700, color: 'var(--tw-text)' }}>Notificaciones</span>
          {noLeidas > 0 && (
            <span style={{ background: 'var(--tw-terra)', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{noLeidas}</span>
          )}
        </div>
        {noLeidas > 0 && (
          <button onClick={marcarTodas} style={{ background: 'none', border: 'none', color: 'var(--tw-terra)', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', padding: 0 }}>
            Marcar todas como leídas
          </button>
        )}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {FILTRO_TABS.map(t => (
          <button key={t.id} style={tabSt(t.id)} onClick={() => setFiltro(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* Lista agrupada */}
      {filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--tw-text-muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔔</div>
          <div style={{ fontSize: 14, fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, color: 'var(--tw-text)', marginBottom: 6 }}>Sin notificaciones</div>
          <div style={{ fontSize: 12 }}>Cuando haya actividad en tus pedidos o cotizaciones, aparecerá aquí.</div>
        </div>
      ) : (
        grupos.map(grupo => (
          <div key={grupo.label} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              {grupo.label}
            </div>
            {grupo.items.map(notif => {
              const cta = ctaLabel(notif.tipo)
              return (
                <div
                  key={notif.id}
                  onClick={() => !notif.leida && marcarLeida(notif.id)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '12px 14px 12px 16px',
                    marginBottom: 6, borderRadius: 10, cursor: 'default',
                    background: notif.leida ? 'transparent' : 'var(--tw-card)',
                    border: notif.leida ? '1px solid transparent' : '1px solid var(--tw-border)',
                    opacity: notif.leida ? 0.75 : 1,
                    position: 'relative',
                  }}
                >
                  {/* Punto no-leído */}
                  {!notif.leida && (
                    <div style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', width: 6, height: 6, borderRadius: '50%', background: 'var(--tw-terra)' }} />
                  )}
                  {/* Icono */}
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: COLOR_MAP[notif.tipo], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {ICON_MAP[notif.tipo]}
                  </div>
                  {/* Cuerpo */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: notif.leida ? 500 : 700, color: 'var(--tw-text)', marginBottom: 2 }}>{notif.titulo}</div>
                    <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', lineHeight: 1.4, marginBottom: cta ? 6 : 0 }}>{notif.descripcion}</div>
                    {cta && notif.referenceId && (
                      <button
                        onClick={e => { e.stopPropagation(); handleCTA(notif) }}
                        style={{ background: 'none', border: 'none', color: 'var(--tw-terra)', fontSize: 10, fontWeight: 700, cursor: 'pointer', padding: 0, fontFamily: 'Montserrat, sans-serif' }}
                      >
                        {cta}
                      </button>
                    )}
                  </div>
                  {/* Tiempo */}
                  <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', flexShrink: 0, marginTop: 1 }}>{formatTiempo(notif.createdAt)}</div>
                </div>
              )
            })}
          </div>
        ))
      )}
    </div>
  )
}

export default NotificacionesNegocio
