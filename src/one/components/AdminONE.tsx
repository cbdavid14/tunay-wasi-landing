/**
 * AdminONE.tsx — Panel de administración TunayWasi ONE
 * Dark mode Netflix-style
 *
 * Tab 1 — Dashboard: métricas Hoy/Semana/Mes/Todo + conteos de estado
 * Tab 2 — Pagos: vouchers pendientes de verificar con foto
 * Tab 3 — Soporte: pedidos por día con filtros
 * Tab 4 — Perfil: identidad + detección de pagos + cerrar sesión
 */
import React, { useState, useEffect, useCallback } from 'react'
import { auth } from '@/shared/firebase'
import {
  fetchPedidosAdmin,
  verificarPago,
  verificarPagoGrupo,
  rechazarPago,
  rechazarPagoGrupo,
  fetchSolicitudesB2B,
  aprobarSolicitudB2B,
  rechazarSolicitudB2B,
  fetchEvidenciasPendientes,
  aprobarEvidencia,
  rechazarEvidencia,
  fetchReclamosAdmin,
  resolverDisputa,
  confirmarEjecucionFinanciera,
  reintentarEjecucionFinanciera,
  solicitarInfoDisputa,
  liberarPago,
} from '../service'
import { db } from '@/shared/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import type { PedidoONE, SolicitudB2B, EvidenciaONE, ReclamoONE, EstadoReclamo, PagoCaficultorONE } from '../types'
import {
  demoFetchPedidosAdmin,
  demoVerificarPago,
  demoRechazarPago,
} from '../demoService'
import { logout } from '../authService'
import ChatPedido from './ChatPedido'

type Tab = 'dashboard' | 'pagos' | 'soporte' | 'cuentas_b2b' | 'reviewer' | 'disputas' | 'perfil'

const NAV_ITEMS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'dashboard',   label: 'Dashboard',   emoji: '📊' },
  { id: 'pagos',       label: 'Pagos',       emoji: '💳' },
  { id: 'soporte',     label: 'Soporte',     emoji: '💬' },
  { id: 'cuentas_b2b', label: 'Cuentas B2B', emoji: '🏢' },
  { id: 'reviewer',    label: 'Reviewer',    emoji: '🔍' },
  { id: 'disputas',    label: 'Disputas',    emoji: '⚠' },
  { id: 'perfil',      label: 'Perfil',      emoji: '👤' },
]

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; tipo: 'ok' | 'error' | 'info' }

const Toast: React.FC<{ msgs: ToastMsg[]; onRemove: (id: number) => void }> = ({ msgs, onRemove }) => (
  <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 500, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none', width: 'min(90vw, 360px)' }}>
    {msgs.map(m => (
      <div key={m.id} onClick={() => onRemove(m.id)} style={{
        padding: '12px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
        background: m.tipo === 'ok' ? 'var(--tw-sage)' : m.tipo === 'error' ? 'var(--tw-error)' : 'var(--tw-warning)',
        color: m.tipo === 'info' ? '#000' : 'var(--tw-text-inverse)',
        pointerEvents: 'all', cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
        fontFamily: 'Montserrat, sans-serif',
      }}>
        {m.tipo === 'ok' ? '✓ ' : m.tipo === 'error' ? '✕ ' : 'ℹ '}{m.text}
      </div>
    ))}
  </div>
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FilterBar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18, padding: '14px 16px', background: '#0d0d0d', borderRadius: 12, border: `1px solid ${"var(--tw-border)"}`, alignItems: 'center' }}>
    {children}
  </div>
)

const FilterChip: React.FC<{ label: string; active: boolean; color?: string; onClick: () => void }> = ({ label, active, color, onClick }) => {
  const col = color ?? 'var(--tw-terra)'
  return (
    <button onClick={onClick} style={{
      padding: '5px 13px', borderRadius: 20, border: `1px solid ${active ? col : 'var(--tw-border)'}`,
      background: active ? col + '22' : 'none', color: active ? col : 'var(--tw-text-muted)',
      fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer',
      fontFamily: 'Montserrat, sans-serif', transition: 'all 0.15s',
    }}>
      {label}
    </button>
  )
}

const SearchInput: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => (
  <input value={value} onChange={e => onChange(e.target.value)}
    placeholder={placeholder ?? 'Buscar...'}
    style={{
      padding: '6px 12px', borderRadius: 8, border: `1px solid ${"var(--tw-border)"}`,
      background: '#141414', color: 'var(--tw-text)', fontSize: 12,
      fontFamily: 'Montserrat, sans-serif', outline: 'none', width: 200,
    }}
  />
)

function formatCents(cents: number): string {
  return `S/ ${(cents / 100).toFixed(0)}`
}

function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function colorPago(status: string) {
  return status === 'verificado' ? 'var(--tw-sage)'
    : status === 'rechazado' ? 'var(--tw-error)'
    : status === 'voucher_subido' ? 'var(--tw-warning)'
    : 'var(--tw-text-faint)'
}

// ─── Chip de estado ───────────────────────────────────────────────────────────

const Chip: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <span style={{
    display: 'inline-block', padding: '3px 10px', borderRadius: 12,
    background: color + '22', color, fontSize: 10,
    fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.04em',
    border: `1px solid ${color}44`,
  }}>
    {label}
  </span>
)

// ─── Botón de acción ──────────────────────────────────────────────────────────

const BtnAccion: React.FC<{
  label: string; onClick: () => void; color?: string; disabled?: boolean
}> = ({ label, onClick, color = 'var(--tw-terra)', disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding: '8px 16px', borderRadius: 8, border: 'none',
    background: color, color: 'var(--tw-text-inverse)',
    fontSize: 12, fontWeight: 700, fontFamily: 'Montserrat, sans-serif',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1, transition: 'opacity 0.15s',
  }}>
    {label}
  </button>
)

// ─── Tab Dashboard ────────────────────────────────────────────────────────────

type FiltroDash = 'hoy' | 'semana' | 'mes' | 'todo'

const TabDashboard: React.FC<{ pedidos: PedidoONE[] }> = ({ pedidos }) => {
  const [filtro, setFiltro] = useState<FiltroDash>('hoy')

  function inicioFiltro(): Date | null {
    const cal = new Date()
    if (filtro === 'hoy') {
      cal.setHours(0, 0, 0, 0); return cal
    }
    if (filtro === 'semana') {
      cal.setDate(cal.getDate() - 7); cal.setHours(0, 0, 0, 0); return cal
    }
    if (filtro === 'mes') {
      cal.setDate(1); cal.setHours(0, 0, 0, 0); return cal
    }
    return null
  }

  const desde = inicioFiltro()
  const lista = desde ? pedidos.filter(p => new Date(p.createdAt) >= desde) : pedidos

  const pagados = lista.filter(p => p.pagoStatus === 'verificado')
  const totalCents = pagados.reduce((acc, p) => acc + p.totalCents, 0)
  const totalSoles = totalCents / 100
  const numPedidos = pagados.length
  const ticket     = numPedidos > 0 ? totalSoles / numPedidos : 0
  const comision   = totalSoles * 0.05

  let revisar = 0, preparacion = 0, camino = 0, liberar = 0, entregados = 0
  lista.forEach(p => {
    const ps = p.pagoStatus; const ls = p.logisticaStatus
    if (ps === 'voucher_subido')                              revisar++
    else if (ps === 'verificado' && ls !== 'entregado')      preparacion++
    else if (ls === 'en_agencia')                            camino++
    else if (ls === 'entregado' && ps !== 'rechazado')       liberar++
    if (ps === 'rechazado')                                  entregados++ // reutilizamos como "liberados"
  })

  const StatCard: React.FC<{ label: string; value: string; sub?: string; color?: string }> = ({ label, value, sub, color = 'var(--tw-text)' }) => (
    <div style={{ background: 'var(--tw-card)', borderRadius: 12, padding: '16px', border: `1px solid ${"var(--tw-border)"}`, textAlign: 'center' }}>
      <p style={{ margin: '0 0 6px', fontSize: 10, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color, fontFamily: 'Cormorant Garamond, serif' }}>{value}</p>
      {sub && <p style={{ margin: '3px 0 0', fontSize: 10, color: 'var(--tw-text-faint)' }}>{sub}</p>}
    </div>
  )

  const CountRow: React.FC<{ label: string; count: number; color: string }> = ({ label, count, color }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', background: 'var(--tw-card)', borderRadius: 8, border: `1px solid ${"var(--tw-border)"}` }}>
      <span style={{ fontSize: 13, color: 'var(--tw-text-muted)' }}>{label}</span>
      <span style={{ fontSize: 20, fontWeight: 700, color, fontFamily: 'Cormorant Garamond, serif' }}>{count}</span>
    </div>
  )

  return (
    <div>
      <FilterBar>
        {(['hoy','semana','mes','todo'] as FiltroDash[]).map(f => (
          <FilterChip key={f} label={f === 'hoy' ? 'Hoy' : f === 'semana' ? 'Semana' : f === 'mes' ? 'Mes' : 'Todo'} active={filtro === f} onClick={() => setFiltro(f)} />
        ))}
      </FilterBar>

      <div className="adm-grid-kpis" style={{ marginBottom: 24 }}>
        <StatCard label="Ventas"       value={`S/ ${totalSoles.toFixed(2)}`}   color={'var(--tw-terra)'} />
        <StatCard label="Pedidos"      value={`${numPedidos}`}                 sub={`${numPedidos !== 1 ? 'pedidos' : 'pedido'}`} color={'var(--tw-info)'} />
        <StatCard label="Ticket prom." value={`S/ ${ticket.toFixed(2)}`}       color={'var(--tw-text)'} />
        <StatCard label="Comisión TW"  value={`S/ ${comision.toFixed(2)}`}     sub="5%" color={'var(--tw-sage)'} />
      </div>

      <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Estados</p>
      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 24 }}>
        <CountRow label="🔍 Por revisar"    count={revisar}     color={'var(--tw-warning)'} />
        <CountRow label="📦 Preparación"    count={preparacion} color={'var(--tw-text)'} />
        <CountRow label="🚚 En camino"      count={camino}      color={'var(--tw-terra)'} />
        <CountRow label="🔓 Por liberar"    count={liberar}     color={'var(--tw-info)'} />
        <CountRow label="✅ Entregados"     count={entregados}  color={'var(--tw-sage)'} />
      </div>
    </div>
  )
}

// ─── Tab Pagos ────────────────────────────────────────────────────────────────

const TabPagos: React.FC<{
  pedidos: PedidoONE[]; onAccion: () => void; isDemo: boolean
  onToast: (t: string, tipo?: 'ok' | 'error' | 'info') => void
}> = ({ pedidos, onAccion, isDemo, onToast }) => {
  const [accionando, setAccionando] = useState<string | null>(null)
  const [ampliada, setAmpliada] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<string>('voucher_subido')
  const [busqueda, setBusqueda] = useState('')
  // G-05: Pagos caficultor retenidos
  const [pagosRetenidos, setPagosRetenidos] = useState<PagoCaficultorONE[]>([])
  const [pagosRetenidosLoading, setPagosRetenidosLoading] = useState(false)
  const [liberandoPago, setLiberandoPago] = useState<string | null>(null)

  useEffect(() => {
    if (isDemo) return
    setPagosRetenidosLoading(true)
    getDocs(query(collection(db, 'one_pagos_caficultor'), where('estado', 'in', ['RETENIDO', 'PENDIENTE'])))
      .then(snap => {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as PagoCaficultorONE))
        setPagosRetenidos(all.filter(p => p.estado === 'RETENIDO'))
      })
      .catch(() => {})
      .finally(() => setPagosRetenidosLoading(false))
  }, [isDemo])

  async function handleLiberarPago(pago: PagoCaficultorONE) {
    setLiberandoPago(pago.id)
    try {
      const adminUid = auth.currentUser?.uid ?? 'admin'
      await liberarPago(pago.id, adminUid, 'yape', pago.cuentaDestino ?? '')
      setPagosRetenidos(prev => prev.filter(p => p.id !== pago.id))
      onToast(`Pago liberado: ${pago.negocioNombre} — S/ ${(pago.montoNetoCents / 100).toFixed(0)}`, 'ok')
    } catch { onToast('Error al liberar el pago', 'error') }
    finally { setLiberandoPago(null) }
  }

  async function verificar(pedidoId: string, grupoCheckoutId?: string) {
    setAccionando(pedidoId)
    try {
      if (grupoCheckoutId) {
        await (isDemo ? demoVerificarPago(pedidoId) : verificarPagoGrupo(grupoCheckoutId))
      } else {
        await (isDemo ? demoVerificarPago(pedidoId) : verificarPago(pedidoId))
      }
      onToast('Pago verificado', 'ok')
      onAccion()
    } catch { onToast('Error al verificar pago', 'error') }
    finally { setAccionando(null) }
  }

  async function rechazar(pedidoId: string, grupoCheckoutId?: string) {
    setAccionando(pedidoId)
    try {
      if (grupoCheckoutId) {
        await (isDemo ? demoRechazarPago(pedidoId) : rechazarPagoGrupo(grupoCheckoutId))
      } else {
        await (isDemo ? demoRechazarPago(pedidoId) : rechazarPago(pedidoId))
      }
      onToast('Pago rechazado', 'info')
      onAccion()
    } catch { onToast('Error al rechazar pago', 'error') }
    finally { setAccionando(null) }
  }

  const conPago = pedidos.filter(p => p.pagoStatus !== 'pendiente')
  const counts = {
    voucher_subido: pedidos.filter(p => p.pagoStatus === 'voucher_subido').length,
    verificado:     pedidos.filter(p => p.pagoStatus === 'verificado').length,
    rechazado:      pedidos.filter(p => p.pagoStatus === 'rechazado').length,
  }

  const filtrados = conPago.filter(p => {
    if (filtro !== 'todos' && p.pagoStatus !== filtro) return false
    if (busqueda && !p.nombreLocal.toLowerCase().includes(busqueda.toLowerCase()) && !p.id.includes(busqueda)) return false
    return true
  })

  // Agrupar pedidos del mismo grupoCheckoutId — mostrar como una sola tarjeta
  const grupos: Array<{ key: string; pedidos: typeof filtrados; esGrupo: boolean }> = []
  const vistos = new Set<string>()
  for (const p of filtrados) {
    if (p.grupoCheckoutId && !vistos.has(p.grupoCheckoutId)) {
      const hermanos = filtrados.filter(x => x.grupoCheckoutId === p.grupoCheckoutId)
      hermanos.forEach(x => vistos.add(x.id))
      vistos.add(p.grupoCheckoutId)
      grupos.push({ key: p.grupoCheckoutId, pedidos: hermanos, esGrupo: true })
    } else if (!p.grupoCheckoutId && !vistos.has(p.id)) {
      vistos.add(p.id)
      grupos.push({ key: p.id, pedidos: [p], esGrupo: false })
    }
  }

  return (
    <div>
      <FilterBar>
        <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar cafetería o ID..." />
        <FilterChip label={`Vouchers (${counts.voucher_subido})`} color={'var(--tw-warning)'} active={filtro === 'voucher_subido'} onClick={() => setFiltro('voucher_subido')} />
        <FilterChip label={`Verificados (${counts.verificado})`} color={'var(--tw-sage)'} active={filtro === 'verificado'} onClick={() => setFiltro('verificado')} />
        <FilterChip label={`Rechazados (${counts.rechazado})`} color={'var(--tw-error)'} active={filtro === 'rechazado'} onClick={() => setFiltro('rechazado')} />
        <FilterChip label={`Todos (${conPago.length})`} active={filtro === 'todos'} onClick={() => setFiltro('todos')} />
      </FilterBar>

      {filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>✓</p>
          <p style={{ color: 'var(--tw-text-muted)', fontSize: 14 }}>No hay pagos para este filtro</p>
        </div>
      ) : (
        <div className="adm-grid-cards">
          {grupos.map(grupo => {
          const p = grupo.pedidos[0]
          const totalGrupo = grupo.pedidos.reduce((s, x) => s + x.totalCents, 0)
          const statusGrupo = p.pagoStatus
          const borderColor = statusGrupo === 'voucher_subido' ? 'var(--tw-warning)' + '44' : statusGrupo === 'verificado' ? 'var(--tw-sage)' + '44' : 'var(--tw-error)' + '44'
          return (
          <div key={grupo.key} style={{ background: 'var(--tw-card)', borderRadius: 14, padding: '18px', border: `1px solid ${borderColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--tw-text)' }}>{p.nombreLocal}</p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--tw-text-muted)' }}>
                  {grupo.esGrupo ? `Grupo · ${grupo.pedidos.length} pedidos` : p.id} · {p.metodoPago === 'yape' ? '📱 Yape/Plin' : '🏦 Transferencia'} · {formatFecha(p.createdAt)}
                </p>
                {grupo.esGrupo && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                    {grupo.pedidos.map(x => (
                      <span key={x.id} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 8, background: 'var(--tw-bg)', color: 'var(--tw-text-muted)', border: '1px solid var(--tw-border)' }}>
                        {x.subPedidoLetra ? `${x.subPedidoLetra} · ` : ''}{x.items[0]?.caficultorNombre ?? x.id}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--tw-terra)', flexShrink: 0 }}>{formatCents(totalGrupo)}</span>
            </div>

            <div style={{ marginBottom: 12 }}>
              {grupo.pedidos.map(x => x.items.map((i, idx) => (
                <div key={`${x.id}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 10px', background: 'var(--tw-bg)', borderRadius: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--tw-text)' }}>{i.qty} × {i.presentacion} — {i.productoNombre}</span>
                  <span style={{ fontSize: 12, color: 'var(--tw-terra)', fontWeight: 600 }}>{formatCents(i.subtotalCents)}</span>
                </div>
              )))}
            </div>

            {p.voucherUrl && (
              <div style={{ marginBottom: 14 }}>
                <img
                  src={p.voucherUrl} alt="Voucher"
                  onClick={() => setAmpliada(ampliada === grupo.key ? null : grupo.key)}
                  style={{
                    width: '100%', maxHeight: ampliada === grupo.key ? 400 : 120,
                    objectFit: ampliada === grupo.key ? 'contain' : 'cover',
                    borderRadius: 8, cursor: 'pointer', transition: 'max-height 0.25s',
                    background: 'var(--tw-border)', border: `1px solid ${"var(--tw-border)"}`,
                  }}
                />
                <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--tw-text-faint)', textAlign: 'center' }}>
                  Toca para {ampliada === grupo.key ? 'reducir' : 'ampliar'}
                </p>
              </div>
            )}

            {statusGrupo === 'voucher_subido' && (
              <div style={{ display: 'flex', gap: 10 }}>
                <BtnAccion label="✓ Verificar" onClick={() => verificar(p.id, p.grupoCheckoutId)} color={'var(--tw-sage)'} disabled={accionando === p.id} />
                <BtnAccion label="✕ Rechazar" onClick={() => rechazar(p.id, p.grupoCheckoutId)} color={'var(--tw-error)'} disabled={accionando === p.id} />
              </div>
            )}
            {statusGrupo === 'verificado' && (
              <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, background: 'var(--tw-sage)' + '22', color: 'var(--tw-sage)', fontWeight: 700 }}>✓ Pago verificado</span>
            )}
            {statusGrupo === 'rechazado' && (
              <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, background: 'var(--tw-error)' + '22', color: 'var(--tw-error)', fontWeight: 700 }}>✕ Rechazado</span>
            )}
          </div>
          )
        })}
        </div>
      )}

      {/* G-05: Pagos retenidos de caficultores — botón Liberar pago */}
      {!isDemo && (
        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif' }}>
              ⚠ Pagos retenidos a caficultores
            </h3>
            {pagosRetenidos.length > 0 && (
              <span style={{ padding: '2px 8px', borderRadius: 10, background: 'var(--tw-terra)', color: '#fff', fontSize: 10, fontWeight: 700 }}>{pagosRetenidos.length}</span>
            )}
          </div>
          {pagosRetenidosLoading ? (
            <p style={{ color: 'var(--tw-text-muted)', fontSize: 12 }}>Cargando...</p>
          ) : pagosRetenidos.length === 0 ? (
            <p style={{ color: 'var(--tw-text-muted)', fontSize: 12 }}>No hay pagos retenidos.</p>
          ) : (
            <div className="adm-grid-cards">
              {pagosRetenidos.map(pago => (
                <div key={pago.id} style={{ background: 'var(--tw-card)', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(201,110,75,.35)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--tw-text)' }}>{pago.negocioNombre}</p>
                      <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--tw-text-muted)' }}>Pedido: {pago.pedidoRef} · Estado: RETENIDO</p>
                      {pago.motivo && <p style={{ margin: '3px 0 0', fontSize: 10, color: 'var(--tw-terra)' }}>Motivo: {pago.motivo}</p>}
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--tw-terra)', flexShrink: 0 }}>S/ {(pago.montoNetoCents / 100).toFixed(0)}</span>
                  </div>
                  <BtnAccion
                    label="💸 Liberar pago"
                    onClick={() => handleLiberarPago(pago)}
                    color={'var(--tw-sage)'}
                    disabled={liberandoPago === pago.id}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Tab Soporte ─────────────────────────────────────────────────────────────

type FiltroSoporte = 'todos' | 'pendiente' | 'voucher_subido' | 'verificado' | 'rechazado' | 'preparando' | 'en_agencia' | 'entregado' | 'cancelado'

const CHIPS_SOPORTE: { id: FiltroSoporte; label: string }[] = [
  { id: 'todos',        label: 'Todos' },
  { id: 'pendiente',    label: 'Pendiente' },
  { id: 'voucher_subido', label: 'Comprobante' },
  { id: 'verificado',   label: 'Verificado' },
  { id: 'preparando',   label: 'Preparando' },
  { id: 'en_agencia',   label: 'Enviado' },
  { id: 'entregado',    label: 'Entregado' },
  { id: 'rechazado',    label: 'Rechazado' },
  { id: 'cancelado',    label: 'Cancelado' },
]

const PAGO_LABEL: Record<string, string> = {
  pendiente:       '⏳ Pendiente',
  voucher_subido:  '📎 Comprobante',
  verificado:      '✓ Verificado',
  rechazado:       '✗ Rechazado',
}

const LOGISTICA_LABEL: Record<string, string> = {
  preparando: '📦 Preparando',
  en_agencia: '📦 Enviado',
  entregado:  '✅ Entregado',
}

function sumarDias(base: Date, dias: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + dias)
  return d
}

function esMismoOAntes(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
    || a < b
}

const TabSoporte: React.FC<{ pedidos: PedidoONE[] }> = ({ pedidos }) => {
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<FiltroSoporte>('todos')
  const [chatPedidoId, setChatPedidoId] = useState<string | null>(null)
  const [dia, setDia] = useState(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
  })

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const esHoy = esMismoOAntes(hoy, dia) && esMismoOAntes(dia, hoy)

  const inicioDia = new Date(dia); inicioDia.setHours(0, 0, 0, 0)
  const finDia    = new Date(dia); finDia.setHours(23, 59, 59, 999)

  const filtrados = pedidos.filter(p => {
    const fecha = new Date(p.createdAt)
    if (fecha < inicioDia || fecha > finDia) return false
    if (filtro !== 'todos') {
      if (filtro === 'preparando' || filtro === 'en_agencia' || filtro === 'entregado') {
        if (p.logisticaStatus !== filtro) return false
      } else if (filtro === 'cancelado') {
        // no hay cancelado en los tipos actuales — mostrar vacío
        return false
      } else {
        if (p.pagoStatus !== filtro) return false
      }
    }
    if (busqueda) {
      const q = busqueda.toLowerCase()
      if (
        !p.negocioEmail.toLowerCase().includes(q) &&
        !p.negocioNombre.toLowerCase().includes(q) &&
        !p.nombreLocal.toLowerCase().includes(q) &&
        !p.id.toLowerCase().includes(q)
      ) return false
    }
    return true
  })

  const labelDia = dia.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div>
      <FilterBar>
        <SearchInput
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar por email, nombre o # pedido..."
        />
      </FilterBar>

      {/* Chips de estado */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {CHIPS_SOPORTE.map(c => (
          <FilterChip
            key={c.id}
            label={c.label}
            active={filtro === c.id}
            onClick={() => setFiltro(c.id)}
          />
        ))}
      </div>

      {/* Paginación por día */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, padding: '10px 14px', background: '#0d0d0d', borderRadius: 10, border: `1px solid ${"var(--tw-border)"}`, width: 'fit-content' }}>
        <button
          onClick={() => setDia(d => sumarDias(d, -1))}
          style={{ background: 'none', border: `1px solid ${"var(--tw-border)"}`, color: 'var(--tw-text-muted)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}
        >‹</button>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tw-text)', minWidth: 130, textAlign: 'center', fontFamily: 'Montserrat, sans-serif' }}>
          {esHoy ? 'Hoy — ' : ''}{labelDia}
        </span>
        <button
          onClick={() => setDia(d => sumarDias(d, 1))}
          disabled={esHoy}
          style={{ background: 'none', border: `1px solid ${"var(--tw-border)"}`, color: esHoy ? 'var(--tw-text-faint)' : 'var(--tw-text-muted)', borderRadius: 6, padding: '4px 10px', cursor: esHoy ? 'not-allowed' : 'pointer', fontSize: 16, opacity: esHoy ? 0.4 : 1 }}
        >›</button>
        <span style={{ fontSize: 12, color: 'var(--tw-text-muted)', marginLeft: 4 }}>{filtrados.length} pedido{filtrados.length !== 1 ? 's' : ''}</span>
      </div>

      {filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ fontSize: 13, color: 'var(--tw-text-muted)' }}>Sin pedidos para este filtro</p>
        </div>
      ) : (
        <div className="adm-grid-cards">
          {filtrados.map(p => (
            <div key={p.id} style={{ background: 'var(--tw-card)', borderRadius: 14, padding: '16px 18px', border: `1px solid ${"var(--tw-border)"}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tw-text)' }}>{p.id}</span>
                    <Chip label={PAGO_LABEL[p.pagoStatus] ?? p.pagoStatus} color={colorPago(p.pagoStatus)} />
                    {LOGISTICA_LABEL[p.logisticaStatus] && (
                      <Chip label={LOGISTICA_LABEL[p.logisticaStatus]} color={'var(--tw-text-muted)'} />
                    )}
                  </div>
                  <p style={{ margin: '0 0 2px', fontSize: 11, color: 'var(--tw-text-muted)' }}>
                    📅 {formatFecha(p.createdAt)}
                  </p>
                  <p style={{ margin: '0 0 2px', fontSize: 12, color: 'var(--tw-sage)', fontWeight: 600 }}>
                    Negocio: {p.nombreLocal}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--tw-text-muted)' }}>
                    {p.negocioEmail}
                  </p>
                </div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--tw-terra)', flexShrink: 0, marginLeft: 12 }}>
                  {formatCents(p.totalCents)}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a
                  href={`#/soporte-chat/${p.id}`}
                  onClick={e => { e.preventDefault(); setChatPedidoId(p.id) }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 8,
                    background: 'var(--tw-terra)' + '18', border: `1px solid ${"var(--tw-terra)"}44`,
                    color: 'var(--tw-terra)', fontSize: 12, fontWeight: 700,
                    textDecoration: 'none', cursor: 'pointer',
                    fontFamily: 'Montserrat, sans-serif',
                  }}
                >
                  💬 Ver chat
                </a>
                <a
                  href={`#/historial/${p.id}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 8,
                    background: '#1a1a1a', border: `1px solid ${"var(--tw-border)"}`,
                    color: 'var(--tw-text-muted)', fontSize: 12, fontWeight: 600,
                    textDecoration: 'none', cursor: 'pointer',
                    fontFamily: 'Montserrat, sans-serif',
                  }}
                >
                  📋 Historial
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal chat admin */}
      {chatPedidoId && (() => {
        const pedido = pedidos.find(p => p.id === chatPedidoId)
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex' }} onClick={() => setChatPedidoId(null)}>
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.75)' }} />
            <div
              style={{ width: 'min(480px, 100vw)', background: 'var(--tw-card)', borderLeft: `1px solid ${"var(--tw-border)"}`, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${"var(--tw-border)"}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--tw-text)' }}>Chat del pedido</p>
                  {pedido && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--tw-text-muted)' }}>{pedido.nombreLocal} · {pedido.id.slice(-8).toUpperCase()}</p>}
                </div>
                <button onClick={() => setChatPedidoId(null)} style={{ background: 'none', border: 'none', color: 'var(--tw-text-muted)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>
              <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto' }}>
                <ChatPedido
                  pedidoId={chatPedidoId}
                  usuarioId="admin"
                  usuarioNombre="TunayWasi Admin"
                  usuarioRol="buyer_b2b"
                  isDemo={false}
                />
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ─── Tab Perfil ───────────────────────────────────────────────────────────────

const TabPerfil: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [confirmando, setConfirmando] = useState(false)
  const [nombre, setNombre] = useState<string>('')
  const [email, setEmail] = useState<string>('')

  useEffect(() => {
    const u = auth.currentUser
    if (u) {
      setNombre(u.displayName ?? 'Administrador')
      setEmail(u.email ?? '')
    }
  }, [])

  return (
    <div style={{ maxWidth: 480 }}>
      {/* Identidad */}
      <div style={{ background: 'var(--tw-card)', borderRadius: 14, padding: '24px', border: `1px solid ${"var(--tw-border)"}`, marginBottom: 16 }}>
        <p style={{ margin: '0 0 4px', fontSize: 10, color: 'var(--tw-text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif' }}>
          ADMINISTRADOR
        </p>
        <p style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif' }}>
          {nombre || 'Admin'}
        </p>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>
          {email}
        </p>
      </div>

      {/* Detección de pagos */}
      <div style={{ background: 'var(--tw-card)', borderRadius: 14, padding: '20px', border: `1px solid ${"var(--tw-border)"}`, marginBottom: 16 }}>
        <p style={{ margin: '0 0 10px', fontSize: 10, color: 'var(--tw-text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif' }}>
          Detección de pagos
        </p>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif', lineHeight: 1.5 }}>
          La detección automática de pagos Yape/Plin funciona desde la app Android. Actívala en el dispositivo desde Ajustes → Notificaciones o Accesibilidad.
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, background: 'var(--tw-sage)' + '18', border: `1px solid ${"var(--tw-sage)"}44` }}>
          <span style={{ fontSize: 14 }}>📱</span>
          <span style={{ fontSize: 12, color: 'var(--tw-sage)', fontWeight: 600, fontFamily: 'Montserrat, sans-serif' }}>Configurable en app Android</span>
        </div>
      </div>

      {/* Cerrar sesión */}
      <div style={{ background: 'var(--tw-card)', borderRadius: 14, padding: '20px', border: `1px solid ${"var(--tw-border)"}` }}>
        {!confirmando ? (
          <button
            onClick={() => setConfirmando(true)}
            style={{
              width: '100%', padding: '12px', borderRadius: 8,
              border: `1px solid ${"var(--tw-error)"}44`, background: 'var(--tw-error)' + '11',
              color: 'var(--tw-error)', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
            }}
          >
            Cerrar sesión
          </button>
        ) : (
          <div>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif' }}>
              ¿Seguro que quieres cerrar sesión?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={onLogout}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8,
                  border: 'none', background: 'var(--tw-error)',
                  color: 'var(--tw-text-inverse)', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
                }}
              >
                Sí, cerrar sesión
              </button>
              <button
                onClick={() => setConfirmando(false)}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8,
                  border: `1px solid ${"var(--tw-border)"}`, background: 'none',
                  color: 'var(--tw-text-muted)', fontSize: 13,
                  cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab Cuentas B2B ─────────────────────────────────────────────────────────

type FiltroB2B = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'todas'

const TabCuentasB2B: React.FC<{ onToast: (t: string, tipo?: 'ok'|'error'|'info') => void }> = ({ onToast }) => {
  const [solicitudes, setSolicitudes] = useState<SolicitudB2B[]>([])
  const [filtro, setFiltro] = useState<FiltroB2B>('PENDING_APPROVAL')
  const [loading, setLoading] = useState(true)
  const [modalUid, setModalUid] = useState<string | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [accionando, setAccionando] = useState(false)

  async function cargar() {
    setLoading(true)
    try {
      const data = await fetchSolicitudesB2B(filtro === 'todas' ? undefined : filtro)
      setSolicitudes(data)
    } catch {
      onToast('No se pudieron cargar las solicitudes', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [filtro]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAprobar(uid: string) {
    const adminUid = auth.currentUser?.uid ?? 'admin'
    setAccionando(true)
    try {
      await aprobarSolicitudB2B(uid, adminUid)
      onToast('Cuenta B2B aprobada', 'ok')
      await cargar()
    } catch {
      onToast('Error al aprobar', 'error')
    } finally {
      setAccionando(false)
    }
  }

  async function handleRechazar(uid: string) {
    if (!motivoRechazo.trim()) { onToast('Ingresa un motivo de rechazo', 'error'); return }
    const adminUid = auth.currentUser?.uid ?? 'admin'
    setAccionando(true)
    try {
      await rechazarSolicitudB2B(uid, adminUid, motivoRechazo.trim())
      onToast('Solicitud rechazada', 'info')
      setModalUid(null)
      setMotivoRechazo('')
      await cargar()
    } catch {
      onToast('Error al rechazar', 'error')
    } finally {
      setAccionando(false)
    }
  }

  const BADGE: Record<string, { bg: string; color: string; label: string }> = {
    PENDING_APPROVAL: { bg: 'rgba(232,184,75,.14)', color: '#e8b84b', label: 'Pendiente' },
    APPROVED:         { bg: 'rgba(143,175,138,.14)', color: '#8faf8a', label: 'Aprobada'  },
    REJECTED:         { bg: 'rgba(239,68,68,.12)',  color: '#ef4444', label: 'Rechazada' },
    SUSPENDED:        { bg: 'rgba(255,255,255,.06)', color: '#888',   label: 'Suspendida'},
  }

  const modalSol = solicitudes.find(s => s.uid === modalUid)

  return (
    <div>
      {/* Header + filtros */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, color: 'var(--tw-text-muted)', letterSpacing: '.1em', textTransform: 'uppercase' }}>Cuentas Empresa</p>
          <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif' }}>Solicitudes B2B</p>
        </div>
        <button onClick={cargar} style={{ background: 'none', border: `1px solid ${'var(--tw-border)'}`, color: 'var(--tw-text-muted)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>↻</button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {(['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'todas'] as FiltroB2B[]).map(f => (
          <button key={f} onClick={() => setFiltro(f)} style={{
            padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
            background: filtro === f ? 'var(--tw-terra)' : 'var(--tw-card)',
            color: filtro === f ? '#fff' : 'var(--tw-text-muted)',
          }}>
            {f === 'todas' ? 'Todas' : BADGE[f].label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && <p style={{ color: 'var(--tw-text-muted)', fontSize: 13 }}>Cargando...</p>}

      {/* Lista */}
      {!loading && solicitudes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--tw-text-muted)', fontSize: 14 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
          No hay solicitudes {filtro !== 'todas' ? BADGE[filtro]?.label.toLowerCase() + 's' : ''}.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {solicitudes.map(sol => (
          <div key={sol.uid} style={{ background: 'var(--tw-card)', borderRadius: 12, padding: '18px 20px', border: `1px solid ${'var(--tw-border)'}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              {/* Info empresa */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tw-text)' }}>{sol.empresa.razonSocial}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: BADGE[sol.empresa.estadoAprobacion]?.bg, color: BADGE[sol.empresa.estadoAprobacion]?.color }}>
                    {BADGE[sol.empresa.estadoAprobacion]?.label}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--tw-text-muted)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span>RUC: <strong style={{ color: 'var(--tw-text)' }}>{sol.empresa.ruc}</strong></span>
                  <span>Contacto: {sol.nombre} · {sol.email}</span>
                  <span>Dir. fiscal: {sol.empresa.dirFiscal}</span>
                  <span>Solicitud: {new Date(sol.empresa.solicitudAt).toLocaleDateString('es-PE')}</span>
                  {sol.empresa.estadoAprobacion === 'REJECTED' && sol.empresa.motivoRechazo && (
                    <span style={{ color: '#ef4444' }}>Motivo: {sol.empresa.motivoRechazo}</span>
                  )}
                </div>
              </div>

              {/* Acciones */}
              {sol.empresa.estadoAprobacion === 'PENDING_APPROVAL' && (
                <div style={{ display: 'flex', gap: 8, alignSelf: 'center' }}>
                  <button
                    onClick={() => handleAprobar(sol.uid)}
                    disabled={accionando}
                    style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--tw-sage)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    ✓ Aprobar
                  </button>
                  <button
                    onClick={() => { setModalUid(sol.uid); setMotivoRechazo('') }}
                    disabled={accionando}
                    style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid #ef444444`, background: 'rgba(239,68,68,.1)', color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    ✕ Rechazar
                  </button>
                </div>
              )}
              {sol.empresa.estadoAprobacion === 'APPROVED' && (
                <span style={{ fontSize: 11, color: 'var(--tw-text-muted)', alignSelf: 'center' }}>
                  Aprobada {sol.empresa.aprobadoAt ? new Date(sol.empresa.aprobadoAt).toLocaleDateString('es-PE') : ''}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal rechazo */}
      {modalUid && modalSol && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--tw-card)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440, border: `1px solid ${'var(--tw-border)'}` }}>
            <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif' }}>Rechazar solicitud</p>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--tw-text-muted)' }}>{modalSol.empresa.razonSocial} · RUC {modalSol.empresa.ruc}</p>
            <textarea
              value={motivoRechazo}
              onChange={e => setMotivoRechazo(e.target.value)}
              placeholder="Motivo del rechazo (requerido)"
              rows={3}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${'var(--tw-border)'}`, background: '#1a1a1a', color: 'var(--tw-text)', fontSize: 13, resize: 'vertical', fontFamily: 'Montserrat, sans-serif' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={() => setModalUid(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${'var(--tw-border)'}`, background: 'transparent', color: 'var(--tw-text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => handleRechazar(modalUid)} disabled={accionando} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── TabReviewer ──────────────────────────────────────────────────────────────

const TabReviewer: React.FC<{ onToast: (t: string, tipo?: 'ok'|'error'|'info') => void }> = ({ onToast }) => {
  const [evidencias, setEvidencias] = useState<EvidenciaONE[]>([])
  const [cargando, setCargando] = useState(true)
  const [modalEv, setModalEv] = useState<EvidenciaONE | null>(null)
  const [accion, setAccion] = useState<'aprobar' | 'rechazar' | null>(null)
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [filtro, setFiltro] = useState<'todas' | 'N1' | 'N2' | 'N3'>('todas')
  const adminUid = auth.currentUser?.uid ?? ''

  async function cargar() {
    setCargando(true)
    try {
      const data = await fetchEvidenciasPendientes()
      setEvidencias(data)
    } catch { onToast('Error al cargar evidencias', 'error') }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAccion() {
    if (!modalEv || !accion) return
    if (accion === 'rechazar' && !motivo.trim()) { onToast('Ingresa el motivo de rechazo', 'error'); return }
    setEnviando(true)
    try {
      if (accion === 'aprobar') {
        await aprobarEvidencia({ evidenciaId: modalEv.id, reviewerUid: adminUid })
        onToast('Evidencia aprobada', 'ok')
      } else {
        await rechazarEvidencia({ evidenciaId: modalEv.id, reviewerUid: adminUid, motivo: motivo.trim() })
        onToast('Evidencia rechazada', 'info')
      }
      setModalEv(null); setAccion(null); setMotivo('')
      await cargar()
    } catch { onToast('Error al procesar', 'error') }
    finally { setEnviando(false) }
  }

  const nivelColor: Record<string, string> = {
    N1: 'var(--tw-sage)',
    N2: '#4a90c4',
    N3: '#9b59b6',
  }
  const nivelLabel: Record<string, string> = {
    N1: 'N1 · Foto lote',
    N2: 'N2 · Ficha catación',
    N3: 'N3 · Cert. laboratorio',
  }

  const filtradas = filtro === 'todas' ? evidencias : evidencias.filter(e => e.nivel === filtro)

  if (cargando) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--tw-terra)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 4px', fontFamily: 'Cormorant Garamond, serif', fontSize: 24, fontWeight: 700, color: 'var(--tw-text)' }}>Panel Reviewer</h2>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--tw-text-muted)' }}>Cola de evidencias de calidad pendientes de revisión</p>
      </div>

      {/* KPI tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Pendientes', value: evidencias.filter(e => e.estado === 'PENDING_REVIEW').length, color: 'var(--tw-amber, #e8b84b)' },
          { label: 'Disputadas', value: evidencias.filter(e => e.estado === 'DISPUTED').length, color: 'var(--tw-terra)' },
          { label: 'Total cola', value: evidencias.length, color: 'var(--tw-text)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--tw-card)', borderRadius: 10, padding: '10px 14px', border: '1px solid var(--tw-border)' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: 'Cormorant Garamond, serif', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filtro por nivel */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {(['todas', 'N1', 'N2', 'N3'] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)} style={{ padding: '5px 13px', borderRadius: 20, border: `1px solid ${filtro === f ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: filtro === f ? 'rgba(201,110,75,.12)' : 'none', color: filtro === f ? 'var(--tw-terra)' : 'var(--tw-text-muted)', fontSize: 11, fontWeight: filtro === f ? 700 : 500, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
            {f === 'todas' ? 'Todas' : nivelLabel[f]}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
          <p style={{ fontSize: 14, fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, color: 'var(--tw-text)', marginBottom: 6 }}>Cola vacía</p>
          <p style={{ fontSize: 12, color: 'var(--tw-text-muted)' }}>No hay evidencias pendientes de revisión</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtradas.map(ev => (
            <div key={ev.id} style={{ background: 'var(--tw-card)', borderRadius: 12, padding: '14px 16px', border: `1px solid var(--tw-border)`, borderLeft: `3px solid ${ev.estado === 'DISPUTED' ? 'var(--tw-terra)' : '#4a90c4'}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tw-text)' }}>{ev.productoNombre}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: nivelColor[ev.nivel], padding: '1px 7px', borderRadius: 20, background: `${nivelColor[ev.nivel]}18`, border: `1px solid ${nivelColor[ev.nivel]}40` }}>{nivelLabel[ev.nivel]}</span>
                    {ev.estado === 'DISPUTED' && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--tw-terra)', padding: '1px 7px', borderRadius: 20, background: 'rgba(201,110,75,.12)' }}>⚠ Disputada</span>}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', marginBottom: 2 }}>{ev.caficultorNombre}</div>
                  {ev.titulo && <div style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>{ev.titulo}</div>}
                  {ev.descripcion && <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', marginTop: 2, fontStyle: 'italic' }}>"{ev.descripcion}"</div>}
                </div>
                <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', whiteSpace: 'nowrap' }}>{new Date(ev.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}</div>
              </div>

              {/* Archivo preview */}
              {ev.archivoTipo === 'imagen' ? (
                <a href={ev.archivoUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginBottom: 10 }}>
                  <img src={ev.archivoUrl} alt={ev.titulo} style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--tw-border)' }} />
                </a>
              ) : (
                <a href={ev.archivoUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid var(--tw-border)', fontSize: 11, color: 'var(--tw-terra)', textDecoration: 'none', marginBottom: 10 }}>
                  📄 Ver PDF
                </a>
              )}

              {/* AI suggest */}
              {ev.aiSuggest && (
                <div style={{ padding: '7px 10px', background: 'rgba(74,144,196,.06)', border: '1px solid rgba(74,144,196,.2)', borderRadius: 8, fontSize: 10, color: '#4a90c4', marginBottom: 10 }}>
                  🤖 IA sugiere: {ev.aiSuggest}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setModalEv(ev); setAccion('aprobar') }}
                  style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: 'var(--tw-sage)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                  ✓ Aprobar
                </button>
                <button onClick={() => { setModalEv(ev); setAccion('rechazar'); setMotivo('') }}
                  style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid var(--tw-terra)', background: 'none', color: 'var(--tw-terra)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                  ✕ Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal confirmación */}
      {modalEv && accion && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 16 }}>
          <div style={{ background: 'var(--tw-card)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, border: '1px solid var(--tw-border)' }}>
            <h3 style={{ margin: '0 0 8px', fontFamily: 'Cormorant Garamond, serif', fontSize: 20, color: 'var(--tw-text)' }}>
              {accion === 'aprobar' ? '✓ Aprobar evidencia' : '✕ Rechazar evidencia'}
            </h3>
            <p style={{ fontSize: 11, color: 'var(--tw-text-muted)', marginBottom: 16 }}>{modalEv.productoNombre} · {modalEv.caficultorNombre}</p>

            {accion === 'rechazar' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: 'var(--tw-text-muted)', display: 'block', marginBottom: 6 }}>Motivo del rechazo *</label>
                <textarea rows={3} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej: La imagen no muestra claramente el lote. Se requiere foto con iluminación adecuada y número de lote visible."
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--tw-border)', background: 'var(--tw-bg)', color: 'var(--tw-text)', fontSize: 12, fontFamily: 'Montserrat, sans-serif', resize: 'vertical' }} />
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleAccion} disabled={enviando}
                style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: accion === 'aprobar' ? 'var(--tw-sage)' : 'var(--tw-terra)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: enviando ? 'default' : 'pointer', opacity: enviando ? 0.6 : 1, fontFamily: 'Montserrat, sans-serif' }}>
                {enviando ? 'Procesando...' : accion === 'aprobar' ? 'Confirmar aprobación' : 'Confirmar rechazo'}
              </button>
              <button onClick={() => { setModalEv(null); setAccion(null); setMotivo('') }}
                style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid var(--tw-border)', background: 'none', color: 'var(--tw-text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── TabDisputas ──────────────────────────────────────────────────────────────

type FiltroDisputa = 'todos' | 'EN_REVISION' | 'ESPERANDO_INFO' | 'ESCALADO' | 'EJECUCION_FALLIDA'

const ESTADOS_ACTIVOS: EstadoReclamo[] = [
  'ABIERTO', 'EN_REVISION', 'ESPERANDO_INFO', 'ESCALADO',
  'DECISION_PENDIENTE', 'EJECUCION_FINANCIERA', 'EJECUCION_FALLIDA',
]

function colorEstadoDisputa(estado: EstadoReclamo): string {
  switch (estado) {
    case 'ABIERTO':
    case 'EN_REVISION':        return '#4a90c4'
    case 'ESPERANDO_INFO':     return '#f39c12'
    case 'ESCALADO':           return '#c96e4b'
    case 'DECISION_PENDIENTE':
    case 'RESOLUCION_COMPRADOR':
    case 'RESOLUCION_CAFICULTOR': return '#9b59b6'
    case 'EJECUCION_FINANCIERA':  return '#4a90c4'
    case 'RESUELTO_COMPRADOR':    return '#8faf8a'
    case 'RESUELTO_CAFICULTOR':   return '#888888'
    case 'EJECUCION_FALLIDA':     return '#ef4444'
    default:                   return '#888888'
  }
}

function labelEstado(estado: EstadoReclamo): string {
  const MAP: Partial<Record<EstadoReclamo, string>> = {
    ABIERTO:               'Abierto',
    EN_REVISION:           'En revisión',
    ESPERANDO_INFO:        'Esperando info',
    ESCALADO:              'Escalado',
    DECISION_PENDIENTE:    'Decisión pendiente',
    RESOLUCION_COMPRADOR:  'Res. comprador',
    RESOLUCION_CAFICULTOR: 'Res. caficultor',
    EJECUCION_FINANCIERA:  'Ejec. financiera',
    RESUELTO_COMPRADOR:    'Resuelto (comprador)',
    RESUELTO_CAFICULTOR:   'Resuelto (caficultor)',
    EJECUCION_FALLIDA:     'Ejecución fallida',
  }
  return MAP[estado] ?? estado
}

const BadgeEstado: React.FC<{ estado: EstadoReclamo }> = ({ estado }) => {
  const color = colorEstadoDisputa(estado)
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
      background: color + '18', color, border: `1px solid ${color}44`,
      fontSize: 10, fontWeight: 700, fontFamily: 'Montserrat, sans-serif',
      textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      {labelEstado(estado)}
    </span>
  )
}

const BadgeTipo: React.FC<{ tipo: ReclamoONE['tipo'] }> = ({ tipo }) => {
  const MAP: Record<ReclamoONE['tipo'], { emoji: string; label: string; color: string }> = {
    producto_danado:         { emoji: '🔥', label: 'Dañado',          color: '#c96e4b' },
    cantidad_incorrecta:     { emoji: '📦', label: 'Cantidad',         color: '#4a90c4' },
    producto_incorrecto:     { emoji: '🔄', label: 'Incorrecto',       color: '#9b59b6' },
    calidad_no_corresponde:  { emoji: '⭐', label: 'Calidad',          color: '#f39c12' },
    entrega_tardía:          { emoji: '⏰', label: 'Tardía',           color: '#888888' },
    otro:                    { emoji: '❓', label: 'Otro',             color: '#888888' },
  }
  const info = MAP[tipo] ?? { emoji: '❓', label: tipo, color: '#888' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px',
      borderRadius: 4, background: info.color + '18', color: info.color,
      border: `1px solid ${info.color}44`, fontSize: 10, fontWeight: 700,
      fontFamily: 'Montserrat, sans-serif',
    }}>
      {info.emoji} {info.label}
    </span>
  )
}

type DecisionOpt = 'reembolso_total' | 'reembolso_parcial' | 'liberar_caficultor'

const TabDisputas: React.FC<{ onToast: (t: string, tipo?: 'ok' | 'error' | 'info') => void }> = ({ onToast }) => {
  const [reclamos, setReclamos] = useState<ReclamoONE[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState<FiltroDisputa>('todos')
  const [seleccionado, setSeleccionado] = useState<ReclamoONE | null>(null)

  // Paso 1: campos
  const [decisionOpt, setDecisionOpt] = useState<DecisionOpt>('reembolso_total')
  const [refundPct, setRefundPct] = useState<string>('100')
  const [notaInterna, setNotaInterna] = useState('')
  const [notaComprador, setNotaComprador] = useState('')
  const [notaCaficultor, setNotaCaficultor] = useState('')
  const [enviando, setEnviando] = useState(false)

  // ESPERANDO_INFO
  const [notaSolicitud, setNotaSolicitud] = useState('')

  const adminUid = auth.currentUser?.uid ?? 'admin'

  async function cargar() {
    setCargando(true)
    try {
      const data = await fetchReclamosAdmin()
      setReclamos(data)
    } catch (err) {
      console.error('[TabDisputas] Error al cargar disputas:', err)
      onToast('Error al cargar disputas', 'error')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const activos = reclamos.filter(r => ESTADOS_ACTIVOS.includes(r.estado))

  const filtrados = reclamos.filter(r => {
    if (filtro === 'todos') return true
    return r.estado === filtro
  })

  async function handleRegistrarDecision() {
    if (!seleccionado) return
    if (!notaInterna.trim()) { onToast('La nota interna es obligatoria', 'error'); return }
    setEnviando(true)
    try {
      const decisionValue = decisionOpt === 'liberar_caficultor'
        ? 'RESOLUCION_CAFICULTOR' as const
        : 'RESOLUCION_COMPRADOR' as const
      const pct = decisionOpt === 'reembolso_parcial' ? Number(refundPct) : (decisionOpt === 'reembolso_total' ? 100 : 0)
      await resolverDisputa({
        reclamoId: seleccionado.id,
        decision: decisionValue,
        ...(decisionOpt !== 'liberar_caficultor' && { refundPct: pct }),
        notaInterna: notaInterna.trim(),
        notaComprador: notaComprador.trim() || undefined,
        notaCaficultor: notaCaficultor.trim() || undefined,
        reviewerUid: adminUid,
      })
      onToast('Decisión registrada', 'ok')
      setNotaInterna(''); setNotaComprador(''); setNotaCaficultor('')
      await cargar()
      const updated = reclamos.find(r => r.id === seleccionado.id)
      if (updated) setSeleccionado(updated)
    } catch {
      onToast('Error al registrar decisión', 'error')
    } finally {
      setEnviando(false)
    }
  }

  async function handleConfirmarEjecucion() {
    if (!seleccionado) return
    setEnviando(true)
    try {
      await confirmarEjecucionFinanciera(seleccionado.id, adminUid)
      onToast('Ejecución confirmada', 'ok')
      await cargar()
      setSeleccionado(null)
    } catch {
      onToast('Error al confirmar ejecución', 'error')
    } finally {
      setEnviando(false)
    }
  }

  async function handleReintentar() {
    if (!seleccionado) return
    setEnviando(true)
    try {
      await reintentarEjecucionFinanciera(seleccionado.id, adminUid)
      onToast('Reintento ejecutado', 'ok')
      await cargar()
      setSeleccionado(null)
    } catch {
      onToast('Error al reintentar', 'error')
    } finally {
      setEnviando(false)
    }
  }

  async function handleSolicitarInfo() {
    if (!seleccionado) return
    if (!notaSolicitud.trim()) { onToast('Ingresa una nota para el comprador', 'error'); return }
    setEnviando(true)
    try {
      await solicitarInfoDisputa(seleccionado.id, notaSolicitud.trim(), adminUid)
      onToast('Solicitud enviada', 'info')
      setNotaSolicitud('')
      await cargar()
    } catch {
      onToast('Error al enviar solicitud', 'error')
    } finally {
      setEnviando(false)
    }
  }

  // Chips de filtro
  const FILTROS: { id: FiltroDisputa; label: string; color: string }[] = [
    { id: 'todos',           label: 'Todos',            color: 'var(--tw-terra)' },
    { id: 'EN_REVISION',     label: 'En revisión',      color: '#4a90c4' },
    { id: 'ESPERANDO_INFO',  label: 'Esperando info',   color: '#f39c12' },
    { id: 'ESCALADO',        label: 'Escalado',         color: '#c96e4b' },
    { id: 'EJECUCION_FALLIDA', label: 'Ejec. fallida',  color: '#ef4444' },
  ]

  const rec = seleccionado
  const humanDecision = rec ? (rec as any).humanDecision as { decision: string; refundPct?: number; notaInterna?: string; registradoPor?: string; registradoAt?: string } | undefined : undefined

  if (cargando) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--tw-terra)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 4px', fontFamily: 'Cormorant Garamond, serif', fontSize: 24, fontWeight: 700, color: 'var(--tw-text)' }}>
          Disputas
        </h2>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--tw-text-muted)' }}>
          Gestión de reclamos — flujo en 2 pasos: Registrar decisión → Confirmar ejecución
        </p>
      </div>

      {/* KPI tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Abiertas',          value: activos.length,                                                              color: '#ef4444' },
          { label: 'SLA crítico',       value: reclamos.filter(r => r.estado === 'ESCALADO').length,                        color: '#f39c12' },
          { label: 'Ejec. fallida',     value: reclamos.filter(r => r.estado === 'EJECUCION_FALLIDA').length,               color: '#ef4444' },
          { label: 'Dec. pendiente',    value: reclamos.filter(r => r.estado === 'DECISION_PENDIENTE').length,              color: '#9b59b6' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--tw-card)', borderRadius: 10, padding: '10px 14px', border: '1px solid var(--tw-border)' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: 'Cormorant Garamond, serif', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {FILTROS.map(f => (
          <button key={f.id} onClick={() => setFiltro(f.id)} style={{
            padding: '5px 13px', borderRadius: 20,
            border: `1px solid ${filtro === f.id ? f.color : 'var(--tw-border)'}`,
            background: filtro === f.id ? f.color + '22' : 'none',
            color: filtro === f.id ? f.color : 'var(--tw-text-muted)',
            fontSize: 11, fontWeight: filtro === f.id ? 700 : 500, cursor: 'pointer',
            fontFamily: 'Montserrat, sans-serif',
          }}>
            {f.label}
            {f.id !== 'todos' && (
              <span style={{ marginLeft: 5, fontSize: 10, opacity: 0.75 }}>
                ({reclamos.filter(r => r.estado === f.id).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Layout: tabla + panel lateral */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* Tabla de disputas */}
        <div style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
          {filtrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
              <p style={{ fontSize: 14, fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, color: 'var(--tw-text)', marginBottom: 6 }}>Sin disputas</p>
              <p style={{ fontSize: 12, color: 'var(--tw-text-muted)' }}>No hay disputas para este filtro</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'Montserrat, sans-serif' }}>
              <thead>
                <tr>
                  {['ID Pedido', 'Comprador', 'Caficultor', 'Tipo', 'Estado', 'Monto', 'Fecha', ''].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--tw-text-muted)', borderBottom: '1px solid var(--tw-border)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map(r => (
                  <tr
                    key={r.id}
                    onClick={() => { setSeleccionado(r); setDecisionOpt('reembolso_total'); setNotaInterna(''); setNotaComprador(''); setNotaCaficultor('') }}
                    style={{
                      cursor: 'pointer',
                      borderLeft: seleccionado?.id === r.id ? '3px solid var(--tw-terra)' : '3px solid transparent',
                      background: seleccionado?.id === r.id ? 'rgba(201,110,75,.05)' : (r.estado === 'EJECUCION_FALLIDA' || r.estado === 'ESCALADO' ? 'rgba(239,68,68,.03)' : 'none'),
                    }}
                  >
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--tw-border)', fontFamily: 'monospace', fontWeight: 700, fontSize: 10 }}>{r.pedidoRef}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--tw-border)' }}>
                      <div style={{ fontWeight: 600 }}>{r.negocioNombre}</div>
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--tw-border)', color: 'var(--tw-text-muted)' }}>{r.caficultorNombre}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--tw-border)' }}><BadgeTipo tipo={r.tipo} /></td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--tw-border)' }}><BadgeEstado estado={r.estado} /></td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--tw-border)', fontWeight: 700, color: 'var(--tw-terra)' }}>
                      {r.montoReembolsoCents ? `S/ ${(r.montoReembolsoCents / 100).toFixed(2)}` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--tw-border)', fontSize: 10, color: 'var(--tw-text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(r.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--tw-border)' }}>
                      <span style={{ color: 'var(--tw-terra)', fontWeight: 700, fontSize: 11 }}>Ver →</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Panel de detalle */}
        {rec && (
          <div style={{
            width: 360, flexShrink: 0, background: 'var(--tw-card)',
            borderRadius: 12, border: '1px solid var(--tw-border)',
            display: 'flex', flexDirection: 'column', maxHeight: '80vh', overflowY: 'auto',
          }}>
            {/* Header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--tw-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 15, fontWeight: 700, color: 'var(--tw-text)' }}>{rec.pedidoRef}</span>
                <BadgeEstado estado={rec.estado} />
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <BadgeTipo tipo={rec.tipo} />
                <span style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>{rec.negocioNombre} · {rec.montoReembolsoCents ? `S/ ${(rec.montoReembolsoCents / 100).toFixed(2)}` : '—'}</span>
              </div>
            </div>

            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Info partes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ background: '#0d0d0d', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#4a90c4', marginBottom: 4 }}>Comprador</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tw-text)' }}>{rec.negocioNombre}</div>
                </div>
                <div style={{ background: '#0d0d0d', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--tw-terra)', marginBottom: 4 }}>Caficultor</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tw-text)' }}>{rec.caficultorNombre}</div>
                </div>
              </div>

              {/* Descripción del reclamo */}
              {rec.descripcion && (
                <div style={{ background: '#0d0d0d', borderRadius: 8, padding: '8px 10px', fontSize: 11, color: 'var(--tw-text-muted)', lineHeight: 1.6, fontStyle: 'italic' }}>
                  "{rec.descripcion}"
                </div>
              )}

              {/* Evidencias comprador vs caficultor */}
              {rec.fotosUrls && rec.fotosUrls.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--tw-text-muted)', marginBottom: 6 }}>Evidencias</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ background: '#0d0d0d', borderRadius: 8, padding: '8px 10px', border: '1px solid var(--tw-border)' }}>
                      <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: '#4a90c4', marginBottom: 6 }}>Comprador</div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {rec.fotosUrls.slice(0, 3).map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            <div style={{ width: 36, height: 36, borderRadius: 5, background: 'var(--tw-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, cursor: 'pointer' }}>📸</div>
                          </a>
                        ))}
                      </div>
                    </div>
                    <div style={{ background: '#0d0d0d', borderRadius: 8, padding: '8px 10px', border: '1px solid var(--tw-border)' }}>
                      <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: 'var(--tw-text-muted)', marginBottom: 6 }}>Caficultor</div>
                      <div style={{ fontSize: 9, color: '#ef4444', fontStyle: 'italic' }}>Sin evidencia adjunta</div>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Review si existe */}
              {(rec as any).aiReview && (
                <div style={{ background: 'rgba(143,175,138,.06)', border: '1px solid rgba(143,175,138,.22)', borderRadius: 9, padding: '11px 13px' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--tw-sage)', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 5 }}>
                    🤖 Análisis IA · aiReview
                  </div>
                  {(rec as any).aiReview.recommendedResolution && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>Recomendación:</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--tw-sage)' }}>{(rec as any).aiReview.recommendedResolution}</span>
                    </div>
                  )}
                  {(rec as any).aiReview.reasoningSummary && (
                    <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', lineHeight: 1.6, fontStyle: 'italic', borderLeft: '2px solid rgba(143,175,138,.4)', paddingLeft: 8, marginBottom: 6 }}>
                      "{(rec as any).aiReview.reasoningSummary}"
                    </div>
                  )}
                  <div style={{ fontSize: 8, color: 'var(--tw-text-muted)', marginTop: 4 }}>La IA NUNCA escribe en humanDecision</div>
                </div>
              )}

              {/* ── PASO 1: Registrar decisión (EN_REVISION, ESCALADO, ABIERTO) ── */}
              {(rec.estado === 'EN_REVISION' || rec.estado === 'ESCALADO' || rec.estado === 'ABIERTO') && (
                <div style={{ background: 'var(--tw-bg)', border: '1px solid var(--tw-border)', borderRadius: 9, padding: '11px 13px' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--tw-terra)', marginBottom: 9, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--tw-terra)', color: '#fff', fontSize: 8, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                    Registrar decisión → DECISION_PENDIENTE
                  </div>

                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--tw-text-muted)', marginBottom: 5 }}>Resolución</div>

                  {([
                    { id: 'reembolso_total', label: 'Reembolso total', extra: null },
                    { id: 'reembolso_parcial', label: 'Reembolso parcial', extra: 'pct' },
                    { id: 'liberar_caficultor', label: 'Liberar al caficultor', extra: null },
                  ] as { id: DecisionOpt; label: string; extra: string | null }[]).map(opt => (
                    <div
                      key={opt.id}
                      onClick={() => setDecisionOpt(opt.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7, padding: '7px 9px', borderRadius: 7,
                        border: `1.5px solid ${decisionOpt === opt.id ? 'var(--tw-terra)' : 'var(--tw-border)'}`,
                        background: decisionOpt === opt.id ? 'rgba(201,110,75,.05)' : 'var(--tw-bg)',
                        cursor: 'pointer', marginBottom: 5,
                      }}
                    >
                      <div style={{ width: 11, height: 11, borderRadius: '50%', border: `2px solid ${decisionOpt === opt.id ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: decisionOpt === opt.id ? 'var(--tw-terra)' : 'transparent', flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: decisionOpt === opt.id ? 'var(--tw-terra)' : 'var(--tw-text)', flex: 1 }}>{opt.label}</span>
                      {opt.extra === 'pct' && decisionOpt === 'reembolso_parcial' && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input
                            type="number" min="1" max="99" value={refundPct}
                            onChange={e => setRefundPct(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            style={{ width: 44, background: '#0d0d0d', border: '1px solid var(--tw-border)', borderRadius: 5, padding: '3px 6px', fontSize: 10, color: 'var(--tw-text)', textAlign: 'center', outline: 'none', fontFamily: 'Montserrat, sans-serif' }}
                          />
                          <span style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>%</span>
                        </span>
                      )}
                    </div>
                  ))}

                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--tw-text-muted)', marginBottom: 3, marginTop: 7 }}>
                    Nota interna <span style={{ color: '#ef4444' }}>*</span>
                  </div>
                  <textarea
                    value={notaInterna} onChange={e => setNotaInterna(e.target.value)}
                    placeholder="Razonamiento de la decisión (obligatorio)…"
                    rows={2}
                    style={{ width: '100%', boxSizing: 'border-box', background: '#0d0d0d', border: '1px solid var(--tw-border)', borderRadius: 6, padding: '6px 8px', fontSize: 10, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif', resize: 'none', outline: 'none', marginBottom: 6 }}
                  />

                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--tw-text-muted)', marginBottom: 3 }}>Nota al comprador</div>
                  <textarea
                    value={notaComprador} onChange={e => setNotaComprador(e.target.value)}
                    placeholder="Mensaje al comprador (opcional)…" rows={1}
                    style={{ width: '100%', boxSizing: 'border-box', background: '#0d0d0d', border: '1px solid var(--tw-border)', borderRadius: 6, padding: '6px 8px', fontSize: 10, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif', resize: 'none', outline: 'none', marginBottom: 6 }}
                  />

                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--tw-text-muted)', marginBottom: 3 }}>Nota al caficultor</div>
                  <textarea
                    value={notaCaficultor} onChange={e => setNotaCaficultor(e.target.value)}
                    placeholder="Mensaje al caficultor (opcional)…" rows={1}
                    style={{ width: '100%', boxSizing: 'border-box', background: '#0d0d0d', border: '1px solid var(--tw-border)', borderRadius: 6, padding: '6px 8px', fontSize: 10, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif', resize: 'none', outline: 'none', marginBottom: 9 }}
                  />

                  <button
                    onClick={handleRegistrarDecision} disabled={enviando}
                    style={{ width: '100%', padding: '9px', borderRadius: 8, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 12, fontWeight: 800, cursor: enviando ? 'default' : 'pointer', opacity: enviando ? 0.6 : 1, fontFamily: 'Montserrat, sans-serif' }}
                  >
                    {enviando ? 'Registrando...' : 'Registrar decisión →'}
                  </button>
                </div>
              )}

              {/* ── ESPERANDO INFO ── */}
              {rec.estado === 'ESPERANDO_INFO' && (
                <div style={{ background: 'rgba(243,156,18,.06)', border: '1px solid rgba(243,156,18,.25)', borderRadius: 9, padding: '11px 13px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#f39c12', marginBottom: 9 }}>⏳ Esperando información del comprador</div>
                  {rec.notaTW && (
                    <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', fontStyle: 'italic', marginBottom: 8, padding: '6px 8px', background: '#0d0d0d', borderRadius: 6 }}>
                      Solicitud enviada: "{rec.notaTW}"
                    </div>
                  )}
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--tw-text-muted)', marginBottom: 3 }}>Nueva nota / solicitud</div>
                  <textarea
                    value={notaSolicitud} onChange={e => setNotaSolicitud(e.target.value)}
                    placeholder="Escribe la solicitud de información…" rows={2}
                    style={{ width: '100%', boxSizing: 'border-box', background: '#0d0d0d', border: '1px solid var(--tw-border)', borderRadius: 6, padding: '6px 8px', fontSize: 10, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif', resize: 'none', outline: 'none', marginBottom: 8 }}
                  />
                  <button
                    onClick={handleSolicitarInfo} disabled={enviando}
                    style={{ width: '100%', padding: '8px', borderRadius: 8, border: 'none', background: '#f39c12', color: '#000', fontSize: 11, fontWeight: 800, cursor: enviando ? 'default' : 'pointer', opacity: enviando ? 0.6 : 1, fontFamily: 'Montserrat, sans-serif' }}
                  >
                    Enviar solicitud
                  </button>
                </div>
              )}

              {/* ── PASO 2: Confirmar ejecución (DECISION_PENDIENTE) ── */}
              {rec.estado === 'DECISION_PENDIENTE' && (
                <div style={{ background: 'var(--tw-bg)', border: '1px solid rgba(143,175,138,.3)', borderRadius: 9, padding: '11px 13px' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--tw-sage)', marginBottom: 9, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--tw-sage)', color: '#111', fontSize: 8, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
                    Confirmar ejecución → EJECUCION_FINANCIERA
                  </div>

                  {humanDecision && (
                    <div style={{ background: 'rgba(143,175,138,.06)', border: '1px solid rgba(143,175,138,.2)', borderRadius: 8, padding: '10px 12px', marginBottom: 9 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--tw-sage)', marginBottom: 7 }}>Decisión registrada (humanDecision)</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>Decisión:</span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--tw-text)' }}>{humanDecision.decision}</span>
                      </div>
                      {humanDecision.refundPct !== undefined && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>Reembolso:</span>
                          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--tw-terra)' }}>{humanDecision.refundPct}%</span>
                        </div>
                      )}
                      {humanDecision.notaInterna && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>Nota:</span>
                          <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--tw-text-muted)', fontStyle: 'italic', maxWidth: 180, textAlign: 'right' }}>"{humanDecision.notaInterna}"</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, background: 'rgba(243,156,18,.08)', border: '1px solid rgba(243,156,18,.25)', borderRadius: 8, padding: '9px 11px', marginBottom: 10, fontSize: 10, color: '#f39c12', lineHeight: 1.6 }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>⚠</span>
                    <span>Esta acción ejecutará el reembolso. <strong>No puede deshacerse</strong> una vez confirmada.</span>
                  </div>

                  <div style={{ display: 'flex', gap: 7 }}>
                    <button
                      onClick={() => setSeleccionado(null)}
                      style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid var(--tw-border)', background: 'transparent', color: 'var(--tw-text-muted)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleConfirmarEjecucion} disabled={enviando}
                      style={{ flex: 2, padding: '9px', borderRadius: 8, border: 'none', background: 'var(--tw-sage)', color: '#111', fontSize: 11, fontWeight: 800, cursor: enviando ? 'default' : 'pointer', opacity: enviando ? 0.6 : 1, fontFamily: 'Montserrat, sans-serif' }}
                    >
                      {enviando ? 'Ejecutando...' : 'Confirmar y ejecutar reembolso →'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── EJECUCION_FALLIDA ── */}
              {rec.estado === 'EJECUCION_FALLIDA' && (
                <div style={{ background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 9, padding: '11px 13px' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#ef4444', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 5 }}>
                    ❌ La ejecución financiera falló
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', marginBottom: 5 }}>financialExecution.status = FAILED</div>
                  {(rec as any).financialExecution?.error && (
                    <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', fontFamily: 'monospace', background: 'rgba(0,0,0,.2)', borderRadius: 5, padding: '5px 8px', marginBottom: 8 }}>
                      {(rec as any).financialExecution.error}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 7 }}>
                    <button
                      onClick={handleReintentar} disabled={enviando}
                      style={{ flex: 1, padding: '8px', borderRadius: 7, border: '1.5px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: 11, fontWeight: 700, cursor: enviando ? 'default' : 'pointer', opacity: enviando ? 0.6 : 1, fontFamily: 'Montserrat, sans-serif' }}
                    >
                      Reintentar ejecución
                    </button>
                    <button
                      style={{ flex: 1, padding: '8px', borderRadius: 7, border: 'none', background: 'rgba(239,68,68,.8)', color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
                      onClick={() => onToast('Escalado a coordinador', 'info')}
                    >
                      Escalar
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const Sidebar: React.FC<{
  tab: Tab; onChange: (t: Tab) => void
  vouchersCount: number
  pendingB2B: number
  pendingReviewer: number
  pendingDisputas: number
  onLogout: () => void
  collapsed: boolean; onToggle: () => void
}> = ({ tab, onChange, vouchersCount, pendingB2B, pendingReviewer, pendingDisputas, onLogout, collapsed, onToggle }) => (
  <nav style={{
    position: 'fixed', left: 0, top: 0, bottom: 0, width: collapsed ? 56 : 220,
    background: '#0d0d0d', borderRight: `1px solid ${"var(--tw-border)"}`,
    display: 'flex', flexDirection: 'column', zIndex: 100,
    fontFamily: 'Montserrat, sans-serif', transition: 'width 0.2s ease', overflow: 'hidden',
  }}>
    {/* Toggle */}
    <div style={{ padding: collapsed ? '14px 0' : '14px 16px 10px', display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end', borderBottom: `1px solid ${"var(--tw-border)"}` }}>
      <button onClick={onToggle} style={{ background: 'transparent', border: `1px solid ${"var(--tw-border)"}`, color: 'var(--tw-text-muted)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>
        {collapsed ? '☰' : '←'}
      </button>
    </div>

    {/* Header */}
    {!collapsed && (
      <div style={{ padding: '10px 20px 16px', borderBottom: `1px solid ${"var(--tw-border)"}` }}>
        <p style={{ margin: '0 0 2px', fontSize: 10, color: 'var(--tw-text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>TUNAY WASI</p>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif' }}>Admin Panel</p>
      </div>
    )}

    {/* Nav items */}
    <div style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
      {NAV_ITEMS.map(item => (
        <button key={item.id} onClick={() => onChange(item.id)} style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: collapsed ? 0 : 12,
          padding: collapsed ? '11px 0' : '11px 20px',
          background: tab === item.id ? 'var(--tw-terra)' + '18' : 'none',
          border: 'none', borderLeft: tab === item.id ? `3px solid ${"var(--tw-terra)"}` : '3px solid transparent',
          cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left', position: 'relative',
        }}>
          <span style={{ fontSize: 16 }}>{item.emoji}</span>
          {!collapsed && (
            <span style={{ fontSize: 13, fontWeight: tab === item.id ? 700 : 500, color: tab === item.id ? 'var(--tw-text)' : 'var(--tw-text-muted)', flex: 1 }}>
              {item.label}
            </span>
          )}
          {item.id === 'pagos' && vouchersCount > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 18, height: 18, borderRadius: 9,
              background: 'var(--tw-terra)', color: 'var(--tw-text-inverse)', fontSize: 10, fontWeight: 700, padding: '0 4px',
              position: collapsed ? 'absolute' : 'relative',
              top: collapsed ? 6 : undefined, right: collapsed ? 6 : undefined,
            }}>{vouchersCount}</span>
          )}
          {item.id === 'cuentas_b2b' && pendingB2B > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 18, height: 18, borderRadius: 9,
              background: '#e8b84b', color: '#000', fontSize: 10, fontWeight: 700, padding: '0 4px',
              position: collapsed ? 'absolute' : 'relative',
              top: collapsed ? 6 : undefined, right: collapsed ? 6 : undefined,
            }}>{pendingB2B}</span>
          )}
          {item.id === 'reviewer' && pendingReviewer > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 18, height: 18, borderRadius: 9,
              background: '#4a90c4', color: '#fff', fontSize: 10, fontWeight: 700, padding: '0 4px',
              position: collapsed ? 'absolute' : 'relative',
              top: collapsed ? 6 : undefined, right: collapsed ? 6 : undefined,
            }}>{pendingReviewer}</span>
          )}
          {item.id === 'disputas' && pendingDisputas > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 18, height: 18, borderRadius: 9,
              background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, padding: '0 4px',
              position: collapsed ? 'absolute' : 'relative',
              top: collapsed ? 6 : undefined, right: collapsed ? 6 : undefined,
            }}>{pendingDisputas}</span>
          )}
        </button>
      ))}
    </div>

    {/* Logout */}
    <div style={{ padding: collapsed ? '16px 8px' : '16px 20px', borderTop: `1px solid ${"var(--tw-border)"}` }}>
      {collapsed ? (
        <button onClick={onLogout} style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: `1px solid ${"var(--tw-border)"}`, background: 'none', color: 'var(--tw-text-muted)', fontSize: 14, cursor: 'pointer', display: 'flex', justifyContent: 'center' }} title="Cerrar sesión">⏻</button>
      ) : (
        <button onClick={onLogout} style={{ width: '100%', padding: '10px', borderRadius: 8, border: `1px solid ${"var(--tw-border)"}`, background: 'none', color: 'var(--tw-text-muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Cerrar sesión</button>
      )}
    </div>
  </nav>
)

// ─── Componente principal ─────────────────────────────────────────────────────

const AdminONE: React.FC<{ isDemo?: boolean }> = ({ isDemo = false }) => {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [pedidos, setPedidos] = useState<PedidoONE[]>([])
  const [pendingB2B, setPendingB2B] = useState(0)
  const [pendingReviewer, setPendingReviewer] = useState(0)
  const [pendingDisputas, setPendingDisputas] = useState(0)
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  function toast(text: string, tipo: 'ok' | 'error' | 'info' = 'ok') {
    const id = Date.now()
    setToasts(prev => [...prev, { id, text, tipo }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  const cargar = useCallback(async () => {
    try {
      const data = isDemo ? await demoFetchPedidosAdmin() : await fetchPedidosAdmin()
      setPedidos(data)
      if (!isDemo) {
        fetchSolicitudesB2B('PENDING_APPROVAL').then(s => setPendingB2B(s.length)).catch(() => {})
        fetchEvidenciasPendientes().then(e => setPendingReviewer(e.length)).catch(() => {})
        fetchReclamosAdmin().then(recs => {
          const activos: EstadoReclamo[] = ['ABIERTO', 'EN_REVISION', 'ESPERANDO_INFO', 'ESCALADO', 'DECISION_PENDIENTE', 'EJECUCION_FINANCIERA', 'EJECUCION_FALLIDA']
          setPendingDisputas(recs.filter(r => activos.includes(r.estado)).length)
        }).catch(() => {})
      }
    } catch (e) {
      toast('No se pudieron cargar los pedidos.', 'error')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [isDemo])

  useEffect(() => { cargar() }, [cargar])

  const vouchersCount = pedidos.filter((p) => p.pagoStatus === 'voucher_subido').length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--tw-bg)', fontFamily: 'Montserrat, sans-serif', display: 'flex' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @media (max-width: 700px) {
          .adm-sidebar       { display: none !important; }
          .adm-main          { margin-left: 0 !important; }
          .adm-mobile-header { display: flex !important; }
        }
        @media (min-width: 701px) {
          .adm-sidebar       { display: flex !important; }
          .adm-main          { margin-left: ${sidebarCollapsed ? 56 : 220}px !important; }
          .adm-mobile-header { display: none !important; }
        }
        .adm-grid-cards { display: grid; gap: 14px; }
        @media (min-width: 1100px) { .adm-grid-cards { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 1099px) { .adm-grid-cards { grid-template-columns: 1fr; } }
        .adm-grid-kpis { display: grid; gap: 10px; }
        @media (min-width: 701px)  { .adm-grid-kpis { grid-template-columns: repeat(4, 1fr); } }
        @media (max-width: 700px)  { .adm-grid-kpis { grid-template-columns: repeat(2, 1fr); } }
      `}</style>

      {/* Sidebar desktop */}
      <div className="adm-sidebar">
        <Sidebar
          tab={tab} onChange={setTab}
          vouchersCount={vouchersCount}
          pendingB2B={pendingB2B}
          pendingReviewer={pendingReviewer}
          pendingDisputas={pendingDisputas}
          onLogout={() => logout().then(() => { window.location.hash = '#/' })}
          collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(prev => !prev)}
        />
      </div>

      {/* Mobile header */}
      <div className="adm-mobile-header" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 150, background: '#0d0d0d', borderBottom: `1px solid ${"var(--tw-border)"}`, padding: '12px 16px', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif' }}>Admin Panel</p>
        <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: `1px solid ${"var(--tw-border)"}`, color: 'var(--tw-text-muted)', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 16 }}>☰</button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.8)' }} onClick={() => setSidebarOpen(false)}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 240, background: '#0d0d0d', borderRight: `1px solid ${"var(--tw-border)"}` }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px', borderBottom: `1px solid ${"var(--tw-border)"}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif' }}>Admin Panel</p>
              <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--tw-text-muted)', cursor: 'pointer', fontSize: 20, padding: 0 }}>✕</button>
            </div>
            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => { setTab(item.id); setSidebarOpen(false) }} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
                background: tab === item.id ? 'var(--tw-terra)' + '18' : 'none',
                border: 'none', borderLeft: tab === item.id ? `3px solid ${"var(--tw-terra)"}` : '3px solid transparent',
                cursor: 'pointer', textAlign: 'left',
              }}>
                <span style={{ fontSize: 18 }}>{item.emoji}</span>
                <span style={{ fontSize: 14, fontWeight: tab === item.id ? 700 : 500, color: tab === item.id ? 'var(--tw-text)' : 'var(--tw-text-muted)' }}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main */}
      <div className="adm-main" style={{ flex: 1, marginLeft: sidebarCollapsed ? 56 : 220, minHeight: '100vh' }}>
        {/* Top bar */}
        <div style={{ background: '#0d0d0d', borderBottom: `1px solid ${"var(--tw-border)"}`, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, position: 'sticky', top: 0, zIndex: 50 }}>
          {isDemo && (
            <span style={{ fontSize: 10, padding: '4px 10px', borderRadius: 12, background: 'var(--tw-warning)' + '22', color: 'var(--tw-warning)', fontWeight: 700 }}>DEMO</span>
          )}
          <button onClick={cargar} style={{ background: 'none', border: `1px solid ${"var(--tw-border)"}`, color: 'var(--tw-text-muted)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>↻ Actualizar</button>
        </div>

        {/* Contenido */}
        <div style={{ padding: '24px 20px 80px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div style={{ width: 36, height: 36, border: `3px solid ${"var(--tw-terra)"}`, borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ color: 'var(--tw-text-muted)', fontSize: 13 }}>Cargando...</p>
            </div>
          )}
          {!loading && (
            <>
              {tab === 'dashboard'   && <TabDashboard  pedidos={pedidos} />}
              {tab === 'pagos'       && <TabPagos      pedidos={pedidos} onAccion={cargar} isDemo={isDemo} onToast={toast} />}
              {tab === 'soporte'     && <TabSoporte    pedidos={pedidos} />}
              {tab === 'cuentas_b2b' && <TabCuentasB2B onToast={toast} />}
              {tab === 'reviewer'    && <TabReviewer   onToast={toast} />}
              {tab === 'disputas'    && <TabDisputas   onToast={toast} />}
              {tab === 'perfil'      && <TabPerfil     onLogout={() => logout().then(() => { window.location.hash = '#/' })} />}
            </>
          )}
        </div>
      </div>

      <Toast msgs={toasts} onRemove={id => setToasts(prev => prev.filter(t => t.id !== id))} />
    </div>
  )
}

export default AdminONE
