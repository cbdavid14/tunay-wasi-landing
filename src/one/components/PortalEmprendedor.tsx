/**
 * PortalEmprendedor.tsx — Dashboard del emprendedor (cafetería)
 * Dark mode Netflix-style con sidebar navigation y CRUD completo
 */
import React, { useEffect, useState } from 'react'
import { navigate } from '@/router'
import {
  fetchPedidosByNegocio,
  crearCalificacionCaficultor,
  fetchUsuario,
  updateUsuario,
  confirmarRecepcion,
  confirmarRecepcionCaficultor,
  createPedido,
  subirVoucher,
  subirVoucherGrupo,
  fetchLogisticaCaficultor,
  fetchCotizacionesNegocio,
  responderCotizacion,
  createCotizacion,
  createReclamo,
  fetchReclamosByNegocio,
  cancelarPedido,
  updateDireccionesNegocio,
  marcarEnDisputa,
  fetchProducto,
} from '../service'
import {
  demoFetchPedidosByNegocio,
  demoCrearCalificacionCaficultor,
  demoConfirmarRecepcion,
  demoFetchUsuario,
  demoCreatePedido,
  demoSubirVoucher,
  demoSubirVoucherGrupo,
  demoFetchProducto,
} from '../demoService'
import { cerrarSesion } from '../authService'
import { ONE_CONFIG, calcularPrecioFinal } from '../config'
import type { PedidoONE, UsuarioONE, FormatoONE, CotizacionONE, ReclamoONE, TipoReclamo, DireccionEnvioONE } from '../types'
import CatalogoPublico from './CatalogoPublico'
import ChatPedido from './ChatPedido'
import WasiChat from './WasiChat'
import OrdenExpiradaB2C from './OrdenExpiradaB2C'
import OrdenExpiradaB2B from './OrdenExpiradaB2B'
import NotificacionesNegocio from './NotificacionesNegocio'


const DISTRITOS_LIMA = [
  'Barranco', 'Chorrillos', 'La Molina', 'La Victoria', 'Lince',
  'Magdalena del Mar', 'Miraflores', 'Pueblo Libre', 'San Borja',
  'San Isidro', 'San Miguel', 'Santiago de Surco', 'Surquillo',
  'Jesús María', 'Breña', 'Lima Cercado', 'Ate', 'San Juan de Miraflores',
  'Villa María del Triunfo', 'Comas', 'Los Olivos',
]

function formatCents(cents: number): string {
  const val = cents / 100
  return `S/ ${Number.isInteger(val) ? val.toString() : val.toFixed(2)}`
}

function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return iso }
}

function stepDePedido(p: PedidoONE): number {
  // ENT-01/ENT-02: step 4 = Calificado solo si el comprador ya calificó
  if ((p.logisticaStatus === 'entregado' || p.logisticaStatus === 'resuelto_ok') && p.calificado) return 4
  // step 3 = Recibido: logisticaStatus entregado o recepción confirmada manualmente
  if (p.logisticaStatus === 'entregado' || p.logisticaStatus === 'resuelto_ok' || p.recepcionConfirmada) return 3
  if (p.logisticaStatus === 'en_agencia' || p.logisticaStatus === 'en_disputa') return 2
  if (p.pagoStatus === 'verificado') return 1
  return 0
}


type Tab = 'catalogo' | 'mis_compras' | 'carrito' | 'perfil' | 'wasi'
type SubTab = 'ofertas' | 'pedidos' | 'mensajes' | 'resenias' | 'reclamos'
type SettingsTabNeg = 'empresa' | 'direcciones' | 'notificaciones' | 'seguridad' | null


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
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        fontFamily: 'Montserrat, sans-serif',
      }}>
        {m.tipo === 'ok' ? '✓ ' : m.tipo === 'error' ? '✕ ' : 'ℹ '}{m.text}
      </div>
    ))}
  </div>
)

// ─── Stepper ──────────────────────────────────────────────────────────────────

const StepperPedido: React.FC<{ pedido: PedidoONE }> = ({ pedido }) => {
  const step = stepDePedido(pedido)

  // Calcular label dinámico para "En agencia" con conteo multi-caficultor
  const cafIds = [...new Set(pedido.items.map(i => i.caficultorId).filter(Boolean))]
  const envios = pedido.enviosCaficultor ?? {}
  const totalGuias = cafIds.length
  const tieneEnviosIndividuales = Object.keys(envios).length > 0
  const enAgencia = tieneEnviosIndividuales
    ? cafIds.filter(id => envios[id]?.logisticaStatus === 'en_agencia').length
    : (pedido.logisticaStatus === 'en_agencia' ? totalGuias : 0)
  const transitoLabel = totalGuias > 1 && step >= 2
    ? `En tránsito (${enAgencia}/${totalGuias})`
    : 'En tránsito'

  const steps = ['Pendiente', 'Pago verificado', transitoLabel, 'Recibido', 'Calificado ✓']

  return (
    <div style={{ margin: '16px 0 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {steps.map((label, i) => (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: step >= i ? 'var(--tw-terra)' : 'var(--tw-border)',
                border: step === i ? `2px solid ${'var(--tw-terra)'}` : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {step > i
                  ? <span style={{ color: 'var(--tw-text-inverse)', fontSize: 12 }}>✓</span>
                  : <span style={{ width: 6, height: 6, borderRadius: '50%', background: step === i ? 'var(--tw-text-inverse)' : 'var(--tw-text-faint)', display: 'block' }} />
                }
              </div>
              <p style={{
                margin: '4px 0 0', fontSize: 9, textAlign: 'center', lineHeight: 1.3,
                color: step >= i ? 'var(--tw-terra)' : 'var(--tw-text-faint)',
                fontWeight: step === i ? 700 : 400,
                fontFamily: 'Montserrat, sans-serif',
              }}>{label}</p>
            </div>
            {i < steps.length - 1 && (
              <div style={{ height: 2, flex: 1, background: step > i ? 'var(--tw-terra)' : 'var(--tw-border)', marginBottom: 18 }} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

// ─── Modal calificación ───────────────────────────────────────────────────────

const ModalCalificacion: React.FC<{
  pedido: PedidoONE; usuarioId: string; isDemo: boolean
  onDone: () => void; onToast: (t: string, tipo?: 'ok' | 'error' | 'info') => void
}> = ({ pedido, usuarioId, isDemo, onDone, onToast }) => {
  const [estrellas, setEstrellas] = useState<1|2|3|4|5>(5)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar() {
    setEnviando(true)
    try {
      const input = {
        pedidoId: pedido.id,
        caficultorId: pedido.items[0]?.caficultorId ?? '',
        negocioId: usuarioId,
        negocioNombre: pedido.negocioNombre,
        nombreLocal: pedido.nombreLocal,
        estrellas,
        comentario: comentario.trim() || undefined,
      }
      if (isDemo) await demoCrearCalificacionCaficultor(input)
      else await crearCalificacionCaficultor(input)
      onToast('Calificación enviada. ¡Gracias!', 'ok')
      onDone()
    } catch {
      onToast('No se pudo enviar la calificación', 'error')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: 'var(--tw-card)', borderRadius: '16px 16px 0 0', padding: '28px 24px 40px', width: '100%', maxWidth: 480, fontFamily: 'Montserrat, sans-serif', border: `1px solid ${'var(--tw-border)'}`, borderBottom: 'none' }}>
        <p style={{ margin: '0 0 4px', fontSize: 10, color: 'var(--tw-text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{pedido.id} · {pedido.items[0]?.caficultorNombre}</p>
        <h2 style={{ margin: '0 0 6px', fontSize: 22, fontFamily: 'Cormorant Garamond, serif', color: 'var(--tw-text)', fontWeight: 700 }}>¿Cómo fue el café?</h2>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--tw-text-muted)', lineHeight: 1.5 }}>Tu calificación ayuda a mantener la calidad y da visibilidad al caficultor.</p>
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, justifyContent: 'center' }}>
          {([1,2,3,4,5] as const).map(n => (
            <button key={n} onClick={() => setEstrellas(n)} style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 36, padding: 0,
              opacity: n <= estrellas ? 1 : 0.2, color: 'var(--tw-warning)', transition: 'opacity 0.15s',
            }}>★</button>
          ))}
        </div>
        <textarea
          placeholder="Comentario opcional (calidad, consistencia, presentación...)"
          value={comentario}
          onChange={e => setComentario(e.target.value)}
          maxLength={200}
          style={{ width: '100%', minHeight: 80, padding: '10px 12px', borderRadius: 8, border: `1px solid ${'var(--tw-border)'}`, fontSize: 13, fontFamily: 'Montserrat, sans-serif', color: 'var(--tw-text)', background: '#0f0f0f', resize: 'vertical', boxSizing: 'border-box', marginBottom: 16, outline: 'none' }}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onDone} style={{ flex: 1, padding: '13px 0', borderRadius: 10, border: `1px solid ${'var(--tw-border)'}`, background: 'none', fontSize: 14, fontWeight: 600, color: 'var(--tw-text-muted)', cursor: 'pointer' }}>Ahora no</button>
          <button onClick={enviar} disabled={enviando} style={{ flex: 2, padding: '13px 0', borderRadius: 10, border: 'none', background: 'var(--tw-terra)', fontSize: 14, fontWeight: 700, color: 'var(--tw-text-inverse)', cursor: enviando ? 'not-allowed' : 'pointer', opacity: enviando ? 0.7 : 1 }}>
            {enviando ? 'Enviando...' : 'Enviar calificación →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal editar perfil ───────────────────────────────────────────────────────

const ModalEditarPerfil: React.FC<{
  usuario: UsuarioONE | null; usuarioId: string; isDemo: boolean
  onClose: () => void; onToast: (t: string, tipo?: 'ok' | 'error' | 'info') => void
  onUpdate: (u: Partial<UsuarioONE>) => void
}> = ({ usuario, usuarioId, isDemo, onClose, onToast, onUpdate }) => {
  const emp = usuario?.negocio
  const [nombreLocal, setNombreLocal] = useState(emp?.nombreLocal ?? '')
  const [distrito, setDistrito] = useState(emp?.distritoLocal ?? '')
  const [descripcion, setDescripcion] = useState(emp?.descripcion ?? '')
  const [fotoLocal, setFotoLocal] = useState(emp?.fotoLocal ?? '')
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    if (!nombreLocal.trim()) { onToast('El nombre del local es obligatorio', 'error'); return }
    setGuardando(true)
    try {
      const updates: Partial<UsuarioONE> = {
        negocio: {
          ...emp!,
          nombreLocal: nombreLocal.trim(),
          distritoLocal: distrito,
          descripcion: descripcion.trim() || undefined,
          fotoLocal: fotoLocal.trim() || undefined,
        }
      }
      if (!isDemo) await updateUsuario(usuarioId, updates)
      onUpdate(updates)
      onToast('Perfil actualizado', 'ok')
      onClose()
    } catch {
      onToast('No se pudo guardar el perfil', 'error')
    } finally {
      setGuardando(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: `1px solid ${'var(--tw-border)'}`, background: '#0f0f0f',
    fontSize: 13, fontFamily: 'Montserrat, sans-serif', color: 'var(--tw-text)',
    outline: 'none', boxSizing: 'border-box', marginBottom: 12,
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: 'var(--tw-card)', borderRadius: '16px 16px 0 0', padding: '28px 24px 40px', width: '100%', maxWidth: 480, fontFamily: 'Montserrat, sans-serif', border: `1px solid ${'var(--tw-border)'}`, borderBottom: 'none', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 22, fontFamily: 'Cormorant Garamond, serif', color: 'var(--tw-text)', fontWeight: 700 }}>Editar perfil</h2>

        <label style={{ fontSize: 11, color: 'var(--tw-text-muted)', display: 'block', marginBottom: 4 }}>Nombre del local *</label>
        <input value={nombreLocal} onChange={e => setNombreLocal(e.target.value)} style={inputStyle} placeholder="Café El Origen" maxLength={60} />

        <label style={{ fontSize: 11, color: 'var(--tw-text-muted)', display: 'block', marginBottom: 4 }}>Distrito</label>
        <select value={distrito} onChange={e => setDistrito(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="">Seleccionar...</option>
          {DISTRITOS_LIMA.sort().map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <label style={{ fontSize: 11, color: 'var(--tw-text-muted)', display: 'block', marginBottom: 4 }}>Descripción breve</label>
        <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} maxLength={120} placeholder="Cafetería especializada en la Av. Larco..." style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} />

        <label style={{ fontSize: 11, color: 'var(--tw-text-muted)', display: 'block', marginBottom: 4 }}>URL foto del local</label>
        <input value={fotoLocal} onChange={e => setFotoLocal(e.target.value)} style={inputStyle} placeholder="https://..." maxLength={300} />

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '13px 0', borderRadius: 10, border: `1px solid ${'var(--tw-border)'}`, background: 'none', fontSize: 14, fontWeight: 600, color: 'var(--tw-text-muted)', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} style={{ flex: 2, padding: '13px 0', borderRadius: 10, border: 'none', background: 'var(--tw-terra)', fontSize: 14, fontWeight: 700, color: 'var(--tw-text-inverse)', cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1 }}>
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: Tab; emoji: string; label: string }[] = [
  { id: 'catalogo',    emoji: '☕', label: 'Catálogo' },
  { id: 'mis_compras', emoji: '📦', label: 'Mis Compras' },
  { id: 'carrito',     emoji: '🛒', label: 'Carrito' },
  { id: 'wasi',        emoji: '🤖', label: 'Wasi' },
  { id: 'perfil',      emoji: '⚙️', label: 'Perfil' },
]


// ─── Carrito local (sincronizado con localStorage) ───────────────────────────

interface ItemCarritoLocal {
  producto: { id: string; nombre: string; precioBaseKgCents: number; caficultorId?: string; caficultorNombre?: string; caficultorRegion?: string; productType?: 'TYPE_A' | 'TYPE_B' | 'TYPE_C' }
  formato: FormatoONE
  qty: number
}

const CARRITO_KEY = 'one_carrito_items'

function leerCarrito(): ItemCarritoLocal[] {
  try {
    const s = localStorage.getItem(CARRITO_KEY)
    if (s) return JSON.parse(s) as ItemCarritoLocal[]
    // Migrar de la key antigua si existe
    const legacy = localStorage.getItem('one_carrito_items_v2')
    if (legacy) {
      localStorage.removeItem('one_carrito_items_v2')
      return JSON.parse(legacy) as ItemCarritoLocal[]
    }
  } catch { /* ok */ }
  return []
}

function guardarCarrito(items: ItemCarritoLocal[]) {
  try {
    if (items.length > 0) localStorage.setItem(CARRITO_KEY, JSON.stringify(items))
    else localStorage.removeItem(CARRITO_KEY)
  } catch { /* ok */ }
}

// ─── Hook countdown 24h espera pago (F-05 ORD-02) ────────────────────────────

function useCountdown(expiresAt: string | null) {
  const [remaining, setRemaining] = useState(() => {
    if (!expiresAt) return 0
    const diff = new Date(expiresAt).getTime() - Date.now()
    return Math.max(0, diff)
  })

  useEffect(() => {
    if (!expiresAt || remaining <= 0) return
    const interval = setInterval(() => {
      const diff = new Date(expiresAt).getTime() - Date.now()
      setRemaining(Math.max(0, diff))
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  const horas = Math.floor(remaining / (1000 * 60 * 60))
  const minutos = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
  const segundos = Math.floor((remaining % (1000 * 60)) / 1000)

  return { horas, minutos, segundos, expirado: remaining <= 0 }
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  usuarioId: string
  nombreUsuario: string
  isDemo?: boolean
  tab?: Tab
  onTabChange?: (t: Tab) => void
}

// ─── ReseniaFormCaficultor — formulario de reseña por caficultor ──────────────
const ReseniaFormCaficultor: React.FC<{ caficultorNombre: string; onEnviado: () => void }> = ({ caficultorNombre, onEnviado }) => {
  const [stars, setStars] = React.useState(0)
  const [hovered, setHovered] = React.useState(0)
  const [resenia, setResenia] = React.useState('')
  const [enviado, setEnviado] = React.useState(false)

  if (enviado) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 28 }}>⭐</span>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--tw-sage)' }}>¡Gracias por tu reseña!</p>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--tw-text-muted)' }}>¿Cómo fue tu experiencia con <strong>{caficultorNombre}</strong>?</p>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        {[1, 2, 3, 4, 5].map(n => (
          <span key={n} onClick={() => setStars(n)} onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(0)}
            style={{ fontSize: 28, cursor: 'pointer', color: n <= (hovered || stars) ? '#f59e0b' : 'var(--tw-border)', transition: 'color 0.1s' }}>★</span>
        ))}
      </div>
      <div style={{ fontSize: 10, textAlign: 'center', color: 'var(--tw-text-muted)', marginTop: -4 }}>
        {stars === 0 ? 'Toca para calificar' : ['', '😞 Muy malo', '😕 Malo', '😐 Regular', '😊 Bueno', '🤩 Excelente'][stars]}
      </div>
      <textarea value={resenia} onChange={e => setResenia(e.target.value)}
        placeholder="Cuéntanos más (opcional)..." rows={3}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${'var(--tw-border)'}`, background: 'var(--tw-bg)', color: 'var(--tw-text)', fontSize: 12, fontFamily: 'Montserrat, sans-serif', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
      />
      <button onClick={() => { if (stars > 0) { setEnviado(true); onEnviado() } }} disabled={stars === 0}
        style={{ padding: '10px', borderRadius: 8, border: 'none', background: stars > 0 ? 'var(--tw-terra)' : 'var(--tw-border)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: stars > 0 ? 'pointer' : 'not-allowed', fontFamily: 'Montserrat, sans-serif' }}>
        Enviar reseña →
      </button>
    </div>
  )
}

// ─── MensajesTab — subcomponente para evitar hooks en función normal ──────────
const MensajesTab: React.FC<{
  pedidos: import('../types').PedidoONE[]
  cotizaciones: CotizacionONE[]
  setPedidoDetalle: (p: import('../types').PedidoONE | null) => void
  setDetallePedidoTab: (t: 'pedido' | 'mensajes' | 'resenia') => void
  setSubTab: (t: 'ofertas' | 'pedidos' | 'mensajes' | 'resenias' | 'reclamos') => void
  setTab: (t: 'catalogo' | 'mis_compras' | 'carrito' | 'perfil' | 'wasi') => void
}> = ({ pedidos, cotizaciones, setPedidoDetalle, setDetallePedidoTab, setSubTab, setTab }) => {
  const [catMensajes, setCatMensajes] = React.useState<'pedidos' | 'cotizaciones' | 'pagos' | 'sistema'>('pedidos')

  type EventoNotif = {
    pedidoId: string; orderId: string; titulo: string; descripcion: string
    fotoUrl: string; timestamp: number; accion: string | null
  }

  function generarEventos(p: import('../types').PedidoONE): EventoNotif[] {
    const foto = (p.items[0] as any)?.fotoUrl ?? ''
    const ts = new Date(p.createdAt).getTime() || Date.now()
    if (p.logisticaStatus === 'entregado')
      return [{ pedidoId: p.id, orderId: p.id, titulo: '✅ Pedido entregado', descripcion: 'Tu pedido fue entregado. ¡Esperamos que disfrutes el café!', fotoUrl: foto, timestamp: ts, accion: 'Ver pedido' }]
    if (p.logisticaStatus === 'en_agencia')
      return [{ pedidoId: p.id, orderId: p.id, titulo: '📦 Pedido en camino', descripcion: 'El caficultor envió tu pedido. Confirma la recepción cuando llegue.', fotoUrl: foto, timestamp: ts, accion: 'Confirmar recepción' }]
    if (['verificado', 'confirmado_auto', 'confirmado_manual'].includes(p.pagoStatus))
      return [{ pedidoId: p.id, orderId: p.id, titulo: '✓ Pago confirmado', descripcion: 'Tu pago fue verificado. El caficultor está preparando tu pedido.', fotoUrl: foto, timestamp: ts, accion: 'Ver pedido' }]
    if (p.pagoStatus === 'voucher_subido')
      return [{ pedidoId: p.id, orderId: p.id, titulo: '⏳ Verificando pago', descripcion: 'Recibimos tu voucher. Estamos verificando el pago.', fotoUrl: foto, timestamp: ts, accion: null }]
    return [{ pedidoId: p.id, orderId: p.id, titulo: '🆕 Pedido creado', descripcion: 'Tu pedido fue registrado. Sube el voucher de pago para continuar.', fotoUrl: foto, timestamp: ts, accion: 'Subir voucher' }]
  }

  const eventos: EventoNotif[] = (() => {
    if (catMensajes === 'cotizaciones') {
      return cotizaciones.map(c => {
        const ts = new Date(c.createdAt).getTime() || Date.now()
        const prod = c.productoNombre ?? 'Lote'
        const [titulo, desc] = c.estado === 'RESPONDIDA'
          ? ['💬 Cotización respondida', `El caficultor respondió tu cotización de ${prod}`]
          : c.estado === 'CONTRAOFERTA'
          ? ['⚡ Contraoferta tuya', `Esperando respuesta del caficultor para ${prod}`]
          : c.estado === 'ACEPTADA'
          ? ['✅ Cotización aceptada', 'Tu contraoferta fue aceptada. Procede al pago.']
          : c.estado === 'RECHAZADA'
          ? ['✕ Cotización rechazada', `El caficultor rechazó la oferta para ${prod}`]
          : ['📝 Cotización enviada', `Tu solicitud de cotización de ${prod} está pendiente`]
        return { pedidoId: c.pedidoId ?? '', orderId: c.id, titulo, descripcion: desc,
                 fotoUrl: '', timestamp: ts, accion: (c.estado === 'RESPONDIDA') ? 'Ver oferta' : null }
      }).sort((a, b) => b.timestamp - a.timestamp)
    }
    if (catMensajes === 'pagos') {
      return pedidos.flatMap(p => {
        const ts = new Date(p.createdAt).getTime() || Date.now()
        if (['verificado','confirmado_auto','confirmado_manual'].includes(p.pagoStatus))
          return [{ pedidoId: p.id, orderId: p.id, titulo: '✓ Pago confirmado',
                    descripcion: `Pago del pedido verificado.`, fotoUrl: '', timestamp: ts, accion: 'Ver pedido' }]
        if (p.pagoStatus === 'rechazado')
          return [{ pedidoId: p.id, orderId: p.id, titulo: '✕ Pago rechazado',
                    descripcion: 'El comprobante no fue aceptado.', fotoUrl: '', timestamp: ts, accion: 'Reintentar' }]
        return []
      }).sort((a, b) => b.timestamp - a.timestamp)
    }
    return pedidos.flatMap(generarEventos).sort((a, b) => b.timestamp - a.timestamp)
  })()
  const chipActive: React.CSSProperties = { padding: '6px 16px', borderRadius: 20, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', whiteSpace: 'nowrap' }
  const chipInactive: React.CSSProperties = { ...chipActive, background: 'transparent', border: `1px solid ${'var(--tw-border)'}`, color: 'var(--tw-text-muted)', fontWeight: 500 }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {([['pedidos','Pedidos y envíos'],['cotizaciones','Cotizaciones'],['pagos','Pagos'],['sistema','Sistema']] as const).map(([s, label]) => (
          <button key={s} onClick={() => setCatMensajes(s)} style={catMensajes === s ? chipActive : chipInactive}>
            {label}
          </button>
        ))}
      </div>
      <div style={{ padding: '10px 14px', borderRadius: 10, background: `${'var(--tw-sage)'}11`, border: `1px solid ${'var(--tw-sage)'}22`, marginBottom: 16, fontSize: 12, color: 'var(--tw-sage)' }}>
        🛡️ Nunca pagues fuera de la app. Ignora mensajes que soliciten pagos extra.
      </div>
      {catMensajes === 'sistema' ? (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>🔔</p>
          <p style={{ fontSize: 15, color: 'var(--tw-text-muted)' }}>Sin mensajes del sistema</p>
        </div>
      ) : eventos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>💬</p>
          <p style={{ fontSize: 15, color: 'var(--tw-text-muted)' }}>Sin notificaciones por ahora</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {eventos.map((ev, idx) => (
            <div key={idx} style={{ background: 'var(--tw-card)', borderRadius: 14, border: `1px solid ${'var(--tw-border)'}`, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px 0', fontSize: 11, color: 'var(--tw-text-muted)' }}>
                {new Date(ev.timestamp).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ padding: '8px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--tw-text)' }}>{ev.titulo}</p>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  {ev.fotoUrl
                    ? <img src={ev.fotoUrl} alt="" style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: 64, height: 64, borderRadius: 8, background: 'var(--tw-border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>☕</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--tw-text-muted)', lineHeight: 1.4 }}>{ev.descripcion}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--tw-text-faint)', fontFamily: 'monospace' }}>#{ev.orderId}</p>
                    {ev.accion && (
                      <button onClick={() => { const p = pedidos.find(pd => pd.id === ev.pedidoId) ?? null; if (p) { setTab('mis_compras'); setSubTab('pedidos'); setPedidoDetalle(p); setDetallePedidoTab('pedido') } }}
                        style={{ marginTop: 8, padding: '5px 14px', borderRadius: 8, border: `1px solid ${'var(--tw-border)'}`, background: 'none', color: 'var(--tw-text)', fontSize: 12, cursor: 'pointer' }}>
                        {ev.accion}
                      </button>
                    )}
                  </div>
                </div>
                <button onClick={() => { const p = pedidos.find(pd => pd.id === ev.pedidoId) ?? null; if (p) { setTab('mis_compras'); setSubTab('pedidos'); setPedidoDetalle(p); setDetallePedidoTab('pedido') } }}
                  style={{ background: 'none', border: 'none', color: 'var(--tw-text-muted)', fontSize: 12, cursor: 'pointer', textAlign: 'left', padding: '6px 0 0', borderTop: `1px solid ${'var(--tw-border)'}` }}>
                  Ver detalles del pedido  ›
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const PortalEmprendedor: React.FC<Props> = ({ usuarioId, nombreUsuario, isDemo = false, tab: tabProp, onTabChange }) => {
  const [tabInterno, setTabInterno] = useState<Tab>('mis_compras')
  const tab = tabProp ?? tabInterno
  const setTab = (t: Tab) => { setTabInterno(t); onTabChange?.(t) }
  const [subTab, setSubTab] = useState<SubTab>('pedidos')
  const [pedidos, setPedidos] = useState<PedidoONE[]>([])
  const [usuario, setUsuario] = useState<UsuarioONE | null>(null)
  const [loading, setLoading] = useState(true)
  const [pedidoACalificar, setPedidoACalificar] = useState<PedidoONE | null>(null)
  const [editandoPerfil, setEditandoPerfil] = useState(false)
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  const [accionando, setAccionando] = useState<string | null>(null)
  const [settingsTabNeg, setSettingsTabNeg] = useState<SettingsTabNeg>(null)
  const [direcciones, setDirecciones] = useState<DireccionEnvioONE[]>([])
  const [dirFormAbierto, setDirFormAbierto] = useState(false)
  const [dirFormEditar, setDirFormEditar] = useState<DireccionEnvioONE | undefined>(undefined)
  const [dirFormTipo, setDirFormTipo] = useState('local')
  const [dirFormNombre, setDirFormNombre] = useState('')
  const [dirFormDir, setDirFormDir] = useState('')
  const [dirFormDistrito, setDirFormDistrito] = useState('')
  const [dirFormProvincia, setDirFormProvincia] = useState('')
  const [dirFormDpto, setDirFormDpto] = useState('Lima')
  const [dirFormRef, setDirFormRef] = useState('')
  const [dirFormTel, setDirFormTel] = useState('')
  const [dirFormPrincipal, setDirFormPrincipal] = useState(false)
  const [notifNeg, setNotifNeg] = useState({
    pagoConfirmado: true, pedidoEnCamino: true, pedidoEntregado: true,
    recordatorioVoucher: true, nuevosCafes: false, ofertasPromos: false,
    whatsapp: true, email: true, push: false,
  })

  // ── Notificaciones Negocio (centro) ──────────────────────────────────────────
  // centroNotifOpen: set by bell badge click to auto-scroll to notificaciones tab
  const [centroNotifOpen, setCentroNotifOpen] = useState(false); void centroNotifOpen
  const [notifLeidas, setNotifLeidas] = useState<Set<string>>(new Set()); void setNotifLeidas

  // ── Perfil B2B: tab activo ────────────────────────────────────────────────────
  const [perfilB2BTab, setPerfilB2BTab] = useState<'empresa' | 'direcciones' | 'reposicion' | 'notificaciones' | 'seguridad'>('empresa')

  // ── Perfil B2C: tab activo ────────────────────────────────────────────────────
  const [perfilB2CTab, setPerfilB2CTab] = useState<'personal' | 'direcciones' | 'notificaciones' | 'seguridad'>('personal')

  // ── Formulario datos empresa / negocio (settings) ─────────────────────────────
  const empNeg = usuario?.negocio as any
  const [empNombreLocal, setEmpNombreLocal] = useState(empNeg?.nombreLocal ?? '')
  const [empDistrito, setEmpDistrito] = useState(empNeg?.distritoLocal ?? '')
  const [empVolumen, setEmpVolumen] = useState(empNeg?.volumenMensual ?? '')
  // REG-02: el RUC vive en empresa.ruc (reservado en one_documentos) y no se edita desde el portal.
  // negocio.ruc/razonSocial solo como respaldo de cuentas antiguas no migradas.
  const empRuc: string = usuario?.empresa?.ruc ?? empNeg?.ruc ?? ''
  const empRazonSocial: string = usuario?.empresa?.razonSocial ?? empNeg?.razonSocial ?? ''
  const [empNombre, setEmpNombre] = useState(empNeg?.contactoNombre ?? (usuario?.nombre ?? '').split(' ')[0] ?? '')
  const [empApellido, setEmpApellido] = useState(empNeg?.contactoApellido ?? (usuario?.nombre ?? '').split(' ').slice(1).join(' ') ?? '')
  const [empTelefono, setEmpTelefono] = useState(empNeg?.telefono ?? '')
  const [empGuardando, setEmpGuardando] = useState(false)

  async function guardarDatosEmpresa() {
    setEmpGuardando(true)
    try {
      const updates: Record<string, unknown> = {
        'negocio.nombreLocal': empNombreLocal.trim() || empNeg?.nombreLocal,
        'negocio.distritoLocal': empDistrito,
        'negocio.volumenMensual': empVolumen,
        'negocio.contactoNombre': empNombre.trim(),
        'negocio.contactoApellido': empApellido.trim(),
        'negocio.telefono': empTelefono.trim(),
      }
      if (!isDemo) await updateUsuario(usuarioId, updates as any)
      toast('Datos guardados', 'ok')
    } catch {
      toast('Error al guardar', 'error')
    } finally {
      setEmpGuardando(false)
    }
  }

  // ── Abastecimiento B2B — reposición inline en carrito (ABAST-01 revisado)
  const [reposicionActiva, setReposicionActiva] = useState<Set<number>>(new Set())
  const [chipsExpandido, setChipsExpandido] = useState<Set<number>>(new Set())
  const toggleReposicion = (idx: number) => setReposicionActiva(prev => {
    const next = new Set(prev)
    next.has(idx) ? next.delete(idx) : next.add(idx)
    return next
  })
  const toggleChips = (idx: number) => setChipsExpandido(prev => {
    const next = new Set(prev)
    next.has(idx) ? next.delete(idx) : next.add(idx)
    return next
  })


  // ── Multi-guía accordion en detalle pedido ───────────────────────────────────
  const [guiasAbiertas, setGuiasAbiertas] = useState<Set<string>>(new Set())

  // Cotizaciones B2B
  const [cotizaciones, setCotizaciones] = useState<CotizacionONE[]>([])
  const [cotizLoading, setCotizLoading] = useState(false)
  const [modalCotiz, setModalCotiz] = useState<CotizacionONE | null>(null)
  const [cotizAccion, setCotizAccion] = useState<'aceptar' | 'rechazar' | 'contraofertar' | null>(null)
  const [cotizForm, setCotizForm] = useState({ kg: '', precioCents: '', plazo: '10 días', mensaje: '' })
  const [cotizEnviando, setCotizEnviando] = useState(false)
  // Modal nueva cotización (desde detalle de producto NEGOTIABLE)
  const [modalNuevaCotiz, setModalNuevaCotiz] = useState<import('../types').ProductoONE | null>(null)
  const [nuevaCotizForm, setNuevaCotizForm] = useState({ kg: '', precioCents: '', plazo: '', mensaje: '' })
  const [nuevaCotizEnviando, setNuevaCotizEnviando] = useState(false)

  // Reclamos / Devoluciones
  const [reclamos, setReclamos] = useState<ReclamoONE[]>([])
  const [reclamosLoading, setReclamosLoading] = useState(false)
  // Pantalla activa: 'lista' | 'nuevo' | 'detalle'
  const [reclamoPantalla, setReclamoPantalla] = useState<'lista' | 'nuevo' | 'detalle'>('lista')
  const [reclamoDetalle, setReclamoDetalle] = useState<ReclamoONE | null>(null)
  const [reclamoForm, setReclamoForm] = useState({
    pedidoId: '',
    pedidoRef: '',
    caficultorId: '',
    caficultorNombre: '',
    tipo: 'producto_danado' as TipoReclamo,
    descripcion: '',
  })
  const [reclamoEnviando, setReclamoEnviando] = useState(false)
  const [reclamoPaso, setReclamoPaso] = useState<1|2|3|4>(1)
  const [reclamoFotos, setReclamoFotos] = useState<string[]>([])
  const [reclamoSubiendoFoto, setReclamoSubiendoFoto] = useState(false)
  const reclamoFileRef = React.useRef<HTMLInputElement>(null)

  // Carrito — sincronizado con localStorage
  const [carritoItems, setCarritoItems] = useState<ItemCarritoLocal[]>(leerCarrito)
  useEffect(() => { guardarCarrito(carritoItems) }, [carritoItems])
  const [carritoVista, setCarritoVista] = useState<'items' | 'envios' | 'pago' | 'espera_pago' | 'confirmado'>('items')
  // Estado del pago inline
  const [pagoNombreLocal, setPagoNombreLocal] = useState('')
  const [pagoDistrito, setPagoDistrito] = useState('')
  const [pagoCalle, setPagoCalle] = useState('')
  const [pagoProvincia, setPagoProvincia] = useState('')
  const [pagoReferencia, setPagoReferencia] = useState('')
  const [pagoMetodo, setPagoMetodo] = useState<'yape' | 'transferencia'>('yape')
  const [pagoVoucherUrl, setPagoVoucherUrl] = useState<string | null>(null)
  const [pagoVoucherPreview, setPagoVoucherPreview] = useState<string | null>(null)
  const [pagoSubiendo, setPagoSubiendo] = useState(false)
  const [pagoConfirmando, setPagoConfirmando] = useState(false)
  const [pagoError, setPagoError] = useState<string | null>(null)
  const [pedidoConfirmadoId, setPedidoConfirmadoId] = useState<string | null>(null)
  // expiresAt del pedido recién creado — para countdown 24h (F-05 ORD-02)
  const [pedidoConfirmadoExpiresAt, setPedidoConfirmadoExpiresAt] = useState<string | null>(null)
  // Nuevo modelo: múltiples pedidos por checkout (uno por caficultor)
  const [pedidoConfirmadoIds, setPedidoConfirmadoIds] = useState<string[]>([])
  const [grupoCheckoutIdConfirmado, setGrupoCheckoutIdConfirmado] = useState<string | null>(null)
  const [carritoLogisticaMap, setCarritoLogisticaMap] = useState<Record<string, import('../types').LogisticaCaficultorONE>>({})
  const [pagoAgenciaMap, setPagoAgenciaMap] = useState<Record<string, string>>({})
  const [showDireccionModal, setShowDireccionModal] = useState(false)
  const [modalDireccionSelIdx, setModalDireccionSelIdx] = useState<number | null>(null)
  const [showNewAddrForm, setShowNewAddrForm] = useState(false)
  const [newAddrNombre, setNewAddrNombre] = useState('')
  const [newAddrCalle, setNewAddrCalle] = useState('')
  const [newAddrDistrito, setNewAddrDistrito] = useState('')
  const [newAddrProvincia, setNewAddrProvincia] = useState('')
  const [newAddrReferencia, setNewAddrReferencia] = useState('')
  const [pagoTipoEntregaMap, setPagoTipoEntregaMap] = useState<Record<string, 'agencia' | 'domicilio'>>({})
  // Sincronizar carrito cuando cambia el tab o cuando AppONE escribe en localStorage
  useEffect(() => {
    if (tab === 'catalogo' || tab === 'carrito') setCarritoItems(leerCarrito())
  }, [tab])
  useEffect(() => {
    const sync = () => setCarritoItems(leerCarrito())
    // one_carrito_changed: mismo tab (AppONE). storage: otras pestañas
    window.addEventListener('one_carrito_changed', sync)
    window.addEventListener('storage', sync)
    sync()
    return () => {
      window.removeEventListener('one_carrito_changed', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  function agregarAlCarrito(producto: { id: string; nombre: string; precioBaseKgCents: number; caficultorId?: string; caficultorNombre?: string; caficultorRegion?: string }, formato: FormatoONE = '1kg') {
    setCarritoItems(prev => {
      const idx = prev.findIndex(i => i.producto.id === producto.id && i.formato === formato)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 }
        return next
      }
      return [...prev, { producto, formato, qty: 1 }]
    })
  }

  // Filtros pedidos
  const [filtroPedidoEstado, setFiltroPedidoEstado] = useState<'todos' | 'pendiente' | 'voucher_subido' | 'verificado' | 'en_agencia'>('todos')
  const [filtroPeriodo, setFiltroPeriodo] = useState<'semana' | 'mes' | 'tres_meses'>('mes')
  const [busquedaPedido, _setBusquedaPedido] = useState('')
  const [pedidoDetalle, setPedidoDetalle] = useState<PedidoONE | null>(null)
  const [detallePedidoTab, setDetallePedidoTab] = useState<'pedido' | 'mensajes' | 'resenia'>('pedido')
  const [modalCancelarPedido, setModalCancelarPedido] = useState<PedidoONE | null>(null)
  const [voucherPedido, setVoucherPedido] = useState<PedidoONE | null>(null)
  const [voucherSubiendoDetalle, setVoucherSubiendoDetalle] = useState(false)
  const detalleVoucherRef = React.useRef<HTMLInputElement>(null)
  const [cancelandoPedido, setCelandoPedido] = useState(false)

  const toastCounter = React.useRef(0)
  const voucherFileRef = React.useRef<HTMLInputElement>(null)
  function toast(text: string, tipo: 'ok' | 'error' | 'info' = 'ok') {
    const id = Date.now() + (++toastCounter.current)
    setToasts(prev => [...prev, { id, text, tipo }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  async function handleConfirmarRecepcion(pedidoId: string) {
    setAccionando(pedidoId)
    try {
      const pedido = pedidos.find(p => p.id === pedidoId)
      const cafIds = Object.keys(pedido?.enviosCaficultor ?? {})
      if (isDemo) await demoConfirmarRecepcion(pedidoId)
      else await confirmarRecepcion(pedidoId, cafIds)
      setPedidos(prev => prev.map(p => {
        if (p.id !== pedidoId) return p
        const enviosActualizados = { ...p.enviosCaficultor }
        for (const cid of cafIds) {
          if (enviosActualizados[cid]) enviosActualizados[cid] = { ...enviosActualizados[cid], logisticaStatus: 'entregado' }
        }
        return { ...p, logisticaStatus: 'entregado', recepcionConfirmada: true, enviosCaficultor: enviosActualizados }
      }))
      toast('¡Pedido recibido! Ya puedes calificarlo ★', 'ok')
    } catch {
      toast('Error al confirmar recepción', 'error')
    } finally { setAccionando(null) }
  }

  async function handleConfirmarRecepcionCaficultor(pedidoId: string, caficultorId: string) {
    const key = `${pedidoId}-${caficultorId}`
    setAccionando(key)
    try {
      const pedido = pedidos.find(p => p.id === pedidoId)
      const envios = pedido?.enviosCaficultor ?? {}
      const otrosCafIds = Object.keys(envios).filter(id => id !== caficultorId)
      const todosEntregados = otrosCafIds.every(id => envios[id]?.logisticaStatus === 'entregado')
      if (!isDemo) await confirmarRecepcionCaficultor(pedidoId, caficultorId, todosEntregados)
      setPedidos(prev => prev.map(p => {
        if (p.id !== pedidoId) return p
        const enviosActualizados = {
          ...p.enviosCaficultor,
          [caficultorId]: { ...(p.enviosCaficultor?.[caficultorId]!), logisticaStatus: 'entregado' as const },
        }
        const todosFinal = Object.values(enviosActualizados).every(e => e.logisticaStatus === 'entregado')
        return {
          ...p,
          enviosCaficultor: enviosActualizados,
          ...(todosFinal ? { logisticaStatus: 'entregado' as const, recepcionConfirmada: true } : {}),
        }
      }))
      if (todosEntregados) toast('¡Pedido recibido! Ya puedes calificarlo ★', 'ok')
      else toast('✓ Envío confirmado', 'ok')
    } catch {
      toast('Error al confirmar recepción', 'error')
    } finally { setAccionando(null) }
  }

  async function handleCancelarPedido(pedido: PedidoONE) {
    setCelandoPedido(true)
    try {
      if (!isDemo) await cancelarPedido(pedido.id, 'Cancelado por el comprador')
      setPedidos(prev => prev.map(p => p.id === pedido.id
        ? { ...p, cancelado: true, motivoCancelacion: 'Cancelado por el comprador', canceladoAt: new Date().toISOString() }
        : p
      ))
      setModalCancelarPedido(null)
      setPedidoDetalle(null)
      toast('Pedido cancelado. Reembolso en 3-5 días hábiles.', 'ok')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cancelar'
      toast(msg, 'error')
    } finally { setCelandoPedido(false) }
  }

  useEffect(() => {
    async function cargar() {
      try {
        const data = await (isDemo ? demoFetchPedidosByNegocio(usuarioId) : fetchPedidosByNegocio(usuarioId))
        setPedidos(data)

        const u = isDemo ? await demoFetchUsuario(usuarioId) : await fetchUsuario(usuarioId)
        if (!u) throw new Error('Usuario no encontrado')
        setUsuario(u)
        if (u.negocio?.direcciones) setDirecciones(u.negocio.direcciones)

        const sinCalificar = data.find(p => p.logisticaStatus === 'entregado' && !p.calificado && p.recepcionConfirmada)
        if (sinCalificar) setPedidoACalificar(sinCalificar)

      } catch (e) {
        toast('No se pudo cargar tu portal.', 'error')
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [usuarioId, isDemo])

  useEffect(() => {
    if (tab !== 'mis_compras' || isDemo) return
    setCotizLoading(true)
    fetchCotizacionesNegocio(usuarioId)
      .then(data => setCotizaciones(data))
      .catch(() => toast('No se pudieron cargar las ofertas', 'error'))
      .finally(() => setCotizLoading(false))
  }, [tab, usuarioId, isDemo]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (subTab !== 'reclamos' || isDemo) return
    setReclamosLoading(true)
    fetchReclamosByNegocio(usuarioId)
      .then(data => setReclamos(data))
      .catch(() => toast('No se pudieron cargar los reclamos', 'error'))
      .finally(() => setReclamosLoading(false))
  }, [subTab, usuarioId, isDemo]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleResponderCotizacionNeg() {
    if (!modalCotiz || !cotizAccion) return
    setCotizEnviando(true)
    try {
      if (cotizAccion === 'contraofertar') {
        const kg = parseFloat(cotizForm.kg)
        const precio = parseFloat(cotizForm.precioCents)
        if (!kg || !precio) { toast('Ingresa kg y precio', 'error'); return }
        await responderCotizacion({
          cotizacionId: modalCotiz.id,
          autorRol: 'buyer_b2b',
          accion: 'contraofertar',
          kgSolicitados: kg,
          precioOfertadoCents: Math.round(precio * 100),
          plazoEntrega: cotizForm.plazo,
          mensaje: cotizForm.mensaje,
        })
      } else {
        await responderCotizacion({ cotizacionId: modalCotiz.id, autorRol: 'buyer_b2b', accion: cotizAccion })
      }
      toast(cotizAccion === 'aceptar' ? 'Oferta aceptada' : cotizAccion === 'rechazar' ? 'Oferta cancelada' : 'Contraoferta enviada', 'ok')
      setModalCotiz(null)
      setCotizAccion(null)
      const updated = await fetchCotizacionesNegocio(usuarioId)
      setCotizaciones(updated)
    } catch {
      toast('Error al responder', 'error')
    } finally {
      setCotizEnviando(false)
    }
  }

  async function handleEnviarNuevaCotizacion() {
    if (!modalNuevaCotiz || !usuario) return
    const kg     = parseFloat(nuevaCotizForm.kg)
    const precio = parseFloat(nuevaCotizForm.precioCents)
    if (!kg || kg <= 0)     { toast('Ingresa una cantidad válida', 'error'); return }
    if (!precio || precio <= 0) { toast('Ingresa un precio válido', 'error'); return }
    if (!nuevaCotizForm.plazo.trim()) { toast('Indica el plazo de entrega', 'error'); return }
    setNuevaCotizEnviando(true)
    try {
      await createCotizacion({
        productoId:          modalNuevaCotiz.id,
        productoNombre:      modalNuevaCotiz.nombre,
        caficultorId:        modalNuevaCotiz.caficultorId,
        caficultorNombre:    modalNuevaCotiz.caficultorNombre ?? '',
        negocioId:           usuarioId,
        negocioNombre:       usuario.nombre ?? '',
        negocioRazonSocial:  (usuario as any).empresa?.razonSocial ?? usuario.nombre ?? '',
        negocioRuc:          (usuario as any).empresa?.ruc ?? undefined,
        kgSolicitados:       kg,
        precioOfertadoCents: Math.round(precio * 100),
        plazoEntrega:        nuevaCotizForm.plazo.trim(),
        mensaje:             nuevaCotizForm.mensaje.trim(),
      })
      toast('Cotización enviada. El caficultor responderá en 72 h.', 'ok')
      setModalNuevaCotiz(null)
      setNuevaCotizForm({ kg: '', precioCents: '', plazo: '', mensaje: '' })
      const updated = await fetchCotizacionesNegocio(usuarioId)
      setCotizaciones(updated)
    } catch {
      toast('Error al enviar cotización', 'error')
    } finally {
      setNuevaCotizEnviando(false)
    }
  }

  useEffect(() => {
    // Cargar logística para todos los caficultores únicos del carrito
    // Re-fetch siempre al entrar al paso de envíos para reflejar cambios recientes en BD
    if (carritoItems.length === 0) return
    const cafIds = [...new Set(carritoItems.map(i => i.producto.caficultorId).filter(Boolean))] as string[]
    const faltantes = carritoVista === 'envios' ? cafIds : cafIds.filter(id => !carritoLogisticaMap[id])
    if (faltantes.length === 0) return
    async function cargar() {
      const results = await Promise.all(faltantes.map(cid =>
        isDemo
          ? import('../demoService').then(m => m.demoFetchLogisticaCaficultor(cid))
          : fetchLogisticaCaficultor(cid)
      ))
      setCarritoLogisticaMap(prev => {
        const next = { ...prev }
        faltantes.forEach((id, i) => { if (results[i]) next[id] = results[i]! })
        return next
      })
    }
    cargar().catch(() => {})
  }, [carritoItems, isDemo, carritoVista])

  // Precargar dirección principal al entrar a la vista de envíos
  useEffect(() => {
    if (carritoVista !== 'envios') return
    const idx = direcciones.findIndex(d => d.esPrincipal)
    const principalIdx = idx >= 0 ? idx : (direcciones.length > 0 ? 0 : null)
    if (principalIdx !== null) setModalDireccionSelIdx(principalIdx)
    const principal = principalIdx !== null ? direcciones[principalIdx] : undefined
    if (!principal) return
    if (pagoCalle || pagoDistrito) return // ya tiene datos, no sobreescribir
    if (principal.nombre) setPagoNombreLocal(principal.nombre)
    setPagoCalle(principal.direccion ?? '')
    setPagoDistrito(principal.distrito ?? '')
    setPagoProvincia(principal.provincia ?? '')
    setPagoReferencia(principal.referencia ?? '')
  }, [carritoVista, direcciones])

  async function handleCrearReclamo() {
    if (!reclamoForm.pedidoId) { toast('Selecciona el pedido relacionado', 'error'); return }
    if (reclamoForm.descripcion.trim().length < 20) { toast('Describe el problema con más detalle (mínimo 20 caracteres)', 'error'); return }
    // DIS-01 / mockup: foto obligatoria (mínimo 1 evidencia fotográfica)
    if (reclamoFotos.length === 0) { toast('Adjunta al menos una foto de evidencia para continuar', 'error'); return }
    setReclamoEnviando(true)
    try {
      const pedidoSeleccionado = pedidos.find(p => p.id === reclamoForm.pedidoId)
      const reclamoId = await createReclamo({
        pedidoId: reclamoForm.pedidoId,
        pedidoRef: pedidoSeleccionado?.id ?? reclamoForm.pedidoRef,
        negocioId: usuarioId,
        negocioNombre: usuario?.negocio?.nombreLocal ?? nombreUsuario,
        caficultorId: pedidoSeleccionado?.items[0]?.caficultorId ?? reclamoForm.caficultorId,
        caficultorNombre: pedidoSeleccionado?.items[0]?.caficultorNombre ?? reclamoForm.caficultorNombre,
        tipo: reclamoForm.tipo,
        descripcion: reclamoForm.descripcion,
        fotosUrls: reclamoFotos.length > 0 ? reclamoFotos : undefined,
      }, usuarioId)
      await marcarEnDisputa(reclamoForm.pedidoId, reclamoId)
      toast('Reclamo enviado. TW lo revisará en ≤48h', 'ok')
      setReclamoPantalla('lista')
      setReclamoForm({ pedidoId: '', pedidoRef: '', caficultorId: '', caficultorNombre: '', tipo: 'producto_danado', descripcion: '' })
      setReclamoFotos([])
      setReclamoPaso(1)
      const updated = await fetchReclamosByNegocio(usuarioId)
      setReclamos(updated)
    } catch (err) {
      console.error('[handleCrearReclamo]', err)
      toast('Error al enviar el reclamo', 'error')
    } finally {
      setReclamoEnviando(false)
    }
  }

  const nombreLocal = usuario?.negocio?.nombreLocal ?? pedidos[0]?.nombreLocal ?? nombreUsuario
  const distritoLocal = usuario?.negocio?.distritoLocal ?? pedidos[0]?.distritoLocal ?? ''

  // F-05 ORD-02: countdown para espera pago. Debe ir ANTES del `if (loading) return`:
  // un hook después de un return condicional cambia el nº de hooks entre renders → React #310
  // (el portal se caía en blanco para todo usuario B2B al terminar de cargar).
  const countdown = useCountdown(pedidoConfirmadoExpiresAt)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--tw-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: `3px solid ${'var(--tw-terra)'}`, borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 13 }}>Cargando tu portal...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // ─── Contenido por tab ───────────────────────────────────────────────────────

  function renderCatalogo() {
    const totalCarritoCents = carritoItems.reduce((s, i) => {
      return s + calcularPrecioFinal(i.producto.precioBaseKgCents, i.formato) * i.qty
    }, 0)
    const carritoProductoIds = new Set(carritoItems.map(i => i.producto.id))
    const countPendientePago = pedidos.filter(p => p.pagoStatus === 'pendiente' && p.logisticaStatus !== 'entregado').length
    const countEnCamino = pedidos.filter(p => p.logisticaStatus === 'en_agencia').length

    return (
      <>
        {/* Banner re-engagement pedidos activos */}
        {(countPendientePago > 0 || countEnCamino > 0) && (
          <div style={{
            position: 'fixed', top: 'var(--header-h, 52px)', left: 0, right: 0, zIndex: 90,
            background: countPendientePago > 0 ? 'var(--tw-warning)' + 'ee' : 'var(--tw-info)' + 'ee',
            color: countPendientePago > 0 ? '#000' : 'var(--tw-text-inverse)',
            padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            backdropFilter: 'blur(6px)', gap: 12, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>
              {countPendientePago > 0
                ? `⏳ ${countPendientePago} pedido${countPendientePago > 1 ? 's' : ''} esperando tu voucher de pago`
                : `🚚 ${countEnCamino} pedido${countEnCamino > 1 ? 's' : ''} en camino`
              }
            </span>
            <button
              onClick={() => setTab('mis_compras')}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.2)', background: 'rgba(0,0,0,0.15)', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: 'inherit' }}
            >
              Ver mis pedidos →
            </button>
          </div>
        )}
        <CatalogoPublico
          isDemo={isDemo}
          embeddedMode={true}
          onSeleccionar={(producto, fmt) => agregarAlCarrito(producto, fmt ?? '1kg')}
          onSolicitarCotizacion={(producto) => {
            setModalNuevaCotiz(producto)
            setNuevaCotizForm({ kg: '', precioCents: '', plazo: '', mensaje: '' })
          }}
          carritoCount={carritoItems.length}
          totalCarritoCents={totalCarritoCents}
          carritoProductoIds={carritoProductoIds}
          carritoLineas={carritoItems}
          onIrAlCheckout={() => setCarritoVista('pago')}
          rolUsuario="buyer_b2b"
          estadoAprobacionB2B={usuario?.empresa?.estadoAprobacion ?? null}
        />
      </>
    )
  }

  // ─── Tarjeta de pedido individual (reutilizable para lista plana y grupos) ───

  function renderPedidoCard(
    pedido: PedidoONE,
    getStatusInfo: (p: PedidoONE) => { label: string; sublabel: string; color: string; icon: string },
    getFechaEstimada: (p: PedidoONE) => string | null
  ) {
    const st = getStatusInfo(pedido)
    const fechaEst = getFechaEstimada(pedido)
    const fechaPedido = new Date(pedido.createdAt).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'short' })

    return (
      <div key={pedido.id} style={{
        background: 'var(--tw-card)', borderRadius: 12, padding: '12px 16px',
        border: `1px solid ${'var(--tw-border)'}`, position: 'relative',
      }}>
        {/* Status — estilo Rappi: texto coloreado top-right */}
        <span style={{ position: 'absolute', top: 12, right: 16, fontSize: 10, fontWeight: 700, color: st.color }}>
          {st.icon} {st.label}
        </span>

        {/* Header: ID + fecha */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, paddingRight: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'JetBrains Mono, monospace' }}>
            #{pedido.id.slice(-12).toUpperCase()}
          </span>
          <span style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>{fechaPedido} · {pedido.items.length} producto{pedido.items.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Sub-pedido letra (nuevo modelo) */}
        {pedido.subPedidoLetra && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 6, padding: '2px 8px', borderRadius: 20, background: 'rgba(201,110,75,.08)', border: '1px solid rgba(201,110,75,.15)' }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--tw-terra)', fontFamily: 'JetBrains Mono, monospace' }}>Paquete {pedido.subPedidoLetra}</span>
            {pedido.caficultorId && (
              <span style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>· {pedido.items[0]?.caficultorNombre ?? pedido.caficultorId}</span>
            )}
          </div>
        )}

        {/* Tracking chip si está en camino */}
        {pedido.logisticaStatus === 'en_agencia' && pedido.codigoAgencia && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: '4px 8px', background: 'var(--tw-info)' + '10', borderRadius: 6, border: `1px solid ${'var(--tw-info)'}25` }}>
            <span style={{ fontSize: 11, color: 'var(--tw-info)', fontWeight: 700 }}>📦 {pedido.agencia?.toUpperCase()}</span>
            <span style={{ width: 1, height: 10, background: 'var(--tw-border)' }} />
            <span style={{ fontSize: 10, color: 'var(--tw-info)', fontFamily: 'JetBrains Mono, monospace' }}>{pedido.codigoAgencia}</span>
          </div>
        )}

        {/* Productos — máx 2, resto como "+N más" */}
        <div style={{ marginBottom: 10 }}>
          {pedido.items.slice(0, 2).map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <div style={{ width: 32, height: 32, background: 'var(--tw-card)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, border: `1px solid ${'var(--tw-border)'}` }}>
                {(item as any).fotoUrl
                  ? <img src={(item as any).fotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
                  : '☕'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tw-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.productoNombre}</div>
                <div style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>{item.presentacion} × {item.qty} · {item.caficultorNombre}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-text)', flexShrink: 0 }}>{formatCents(item.subtotalCents)}</span>
            </div>
          ))}
          {pedido.items.length > 2 && (
            <span style={{ fontSize: 10, color: 'var(--tw-text-muted)', marginLeft: 40 }}>+{pedido.items.length - 2} producto{pedido.items.length - 2 !== 1 ? 's' : ''} más</span>
          )}
        </div>

        {/* Footer: total + acciones */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${'var(--tw-border)'}`, paddingTop: 10, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>Total</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--tw-terra)' }}>{formatCents(pedido.totalCents)}</div>
            {fechaEst && <div style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>📅 Entrega: {fechaEst}</div>}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {pedido.pagoStatus === 'pendiente' && (
              <button
                onClick={() => { setVoucherPedido(pedido); setTimeout(() => detalleVoucherRef.current?.click(), 0) }}
                style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
              >
                {voucherSubiendoDetalle && voucherPedido?.id === pedido.id ? 'Subiendo…' : 'Subir voucher →'}
              </button>
            )}
            {pedido.logisticaStatus === 'en_agencia' && (
              <button
                onClick={() => handleConfirmarRecepcion(pedido.id)}
                disabled={accionando === pedido.id}
                style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--tw-sage)', color: '#000', fontSize: 11, fontWeight: 700, cursor: accionando === pedido.id ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat, sans-serif' }}
              >
                {accionando === pedido.id ? '...' : '✓ Confirmar recepción'}
              </button>
            )}
            {pedido.logisticaStatus === 'entregado' && !pedido.calificado && (
              <button onClick={() => setPedidoACalificar(pedido)}
                style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                ⭐ Calificar
              </button>
            )}
            {/* Reportar problema: visible en tránsito (deshabilitado) y hasta 72h tras entrega */}
            {(() => {
              const yaReclamo = reclamos.some(r => r.pedidoId === pedido.id && (r.estado === 'ABIERTO' || r.estado === 'EN_REVISION' || r.estado === 'ESPERANDO_INFO'
                || r.estado === 'ESCALADO' || r.estado === 'DECISION_PENDIENTE'
                || r.estado === 'RESOLUCION_COMPRADOR' || r.estado === 'RESOLUCION_CAFICULTOR'
                || r.estado === 'EJECUCION_FINANCIERA' || r.estado === 'EJECUCION_FALLIDA'))
              if (yaReclamo) {
                return (
                  <button
                    onClick={() => { setSubTab('reclamos'); setReclamoPantalla('lista') }}
                    style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(201,110,75,.35)', background: 'transparent', color: 'var(--tw-terra)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
                  >
                    ⚠ Ver reclamo
                  </button>
                )
              }
              if (pedido.logisticaStatus === 'en_agencia') {
                return (
                  <button
                    onClick={() => {
                      setSubTab('reclamos')
                      setReclamoPantalla('nuevo')
                      setReclamoPaso(1)
                      setReclamoForm({ pedidoId: pedido.id, pedidoRef: pedido.id, caficultorId: pedido.items[0]?.caficultorId ?? '', caficultorNombre: pedido.items[0]?.caficultorNombre ?? '', tipo: 'producto_danado', descripcion: '' })
                    }}
                    style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(201,110,75,.35)', background: 'transparent', color: 'var(--tw-terra)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
                  >
                    Reportar problema
                  </button>
                )
              }
              if (pedido.logisticaStatus === 'entregado') {
                const msDesdeEntrega = Date.now() - new Date(pedido.updatedAt).getTime()
                const dentroVentana = msDesdeEntrega < 72 * 60 * 60 * 1000
                if (dentroVentana) {
                  return (
                    <button
                      onClick={() => {
                        setSubTab('reclamos')
                        setReclamoPantalla('nuevo')
                        setReclamoPaso(1)
                        setReclamoForm({ pedidoId: pedido.id, pedidoRef: pedido.id, caficultorId: pedido.items[0]?.caficultorId ?? '', caficultorNombre: pedido.items[0]?.caficultorNombre ?? '', tipo: 'producto_danado', descripcion: '' })
                      }}
                      style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(201,110,75,.35)', background: 'transparent', color: 'var(--tw-terra)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
                    >
                      Reportar problema
                    </button>
                  )
                }
              }
              return null
            })()}
            <button
              onClick={() => {
                pedido.items.forEach(item => {
                  const kgPorUnidad: Record<string, number> = { '250g': 0.25, '500g': 0.5, '1kg': 1.0, '5kg': 5.0 }
                  const kg = kgPorUnidad[item.presentacion] ?? 1.0
                  const precioBaseKgCents = kg > 0 ? Math.round(item.unitCents / kg) : item.unitCents
                  agregarAlCarrito({ id: item.productoId, nombre: item.productoNombre, precioBaseKgCents }, item.presentacion)
                })
                setTab('carrito')
              }}
              style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${'var(--tw-border)'}`, background: 'none', color: 'var(--tw-text)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
            >
              Comprar de nuevo
            </button>
            <button onClick={() => { setPedidoDetalle(pedido); setDetallePedidoTab('pedido') }}
              style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${'var(--tw-border)'}`, background: 'none', color: 'var(--tw-text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
              Ver detalle
            </button>
          </div>
        </div>
      </div>
    )
  }

  function renderPedidos() {
    const countPend = pedidos.filter(p => p.pagoStatus === 'pendiente').length
    const countCamino = pedidos.filter(p => p.logisticaStatus === 'en_agencia').length

    function getStatusInfo(pedido: PedidoONE): { label: string; sublabel: string; color: string; icon: string } {
      if (pedido.cancelado && pedido.cancellationReason === 'PAYMENT_EXPIRED')
        return { label: 'Orden expirada', sublabel: 'Pago no recibido a tiempo', color: '#eab308', icon: '⌛' }
      if (pedido.cancelado)
        return { label: 'Cancelado', sublabel: pedido.motivoCancelacion ?? 'Pedido cancelado', color: '#e05c5c', icon: '✕' }
      if (pedido.logisticaStatus === 'entregado')
        return { label: 'Entregado', sublabel: 'Pedido recibido', color: 'var(--tw-sage)', icon: '✅' }
      if (pedido.recepcionConfirmada)
        return { label: 'Recibido', sublabel: 'Confirmaste la recepción', color: 'var(--tw-sage)', icon: '✓' }
      if (pedido.logisticaStatus === 'en_disputa')
        return { label: 'En disputa', sublabel: 'Pago retenido — revisando reclamo', color: '#f59e0b', icon: '⚠' }
      if (pedido.logisticaStatus === 'resuelto_ok')
        return { label: 'Resuelto', sublabel: 'Disputa resuelta', color: 'var(--tw-sage)', icon: '✓' }
      if (pedido.logisticaStatus === 'en_agencia')
        return { label: 'En camino', sublabel: pedido.agencia ? `Enviado por ${pedido.agencia.toUpperCase()}` : 'En agencia de envío', color: 'var(--tw-info)', icon: '🚚' }
      if (pedido.pagoStatus === 'verificado')
        return { label: 'Pago confirmado', sublabel: 'El caficultor prepara tu pedido', color: 'var(--tw-sage)', icon: '✓' }
      if (pedido.pagoStatus === 'voucher_subido')
        return { label: 'Verificando pago', sublabel: 'Recibimos tu voucher', color: 'var(--tw-warning)', icon: '🔎' }
      if (pedido.pagoStatus === 'rechazado')
        return { label: 'Pago rechazado', sublabel: 'Contáctanos para resolver', color: '#e05c5c', icon: '✕' }
      return { label: 'Pendiente de pago', sublabel: 'Sube el voucher para continuar', color: 'var(--tw-warning)', icon: '⏳' }
    }

    function getFechaEstimada(pedido: PedidoONE): string | null {
      const created = new Date(pedido.createdAt)
      if (isNaN(created.getTime())) return null
      if (pedido.logisticaStatus === 'entregado') return null
      const diasMin = pedido.pagoStatus === 'verificado' ? 3 : 5
      const diasMax = pedido.pagoStatus === 'verificado' ? 7 : 10
      const desde = new Date(created); desde.setDate(desde.getDate() + diasMin)
      const hasta = new Date(created); hasta.setDate(hasta.getDate() + diasMax)
      const fmt = (d: Date) => d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
      return `${fmt(desde)} – ${fmt(hasta)}`
    }

    // ── Filtro por periodo ───────────────────────────────────────────────
    const ahora = Date.now()
    const MS_SEMANA = 7 * 24 * 60 * 60 * 1000
    const MS_MES = 30 * 24 * 60 * 60 * 1000
    const MS_3MESES = 90 * 24 * 60 * 60 * 1000
    const msPeriodo = filtroPeriodo === 'semana' ? MS_SEMANA : filtroPeriodo === 'mes' ? MS_MES : MS_3MESES
    const todosPeriodo = pedidos.filter(p => (ahora - new Date(p.createdAt).getTime()) <= msPeriodo)
    const filtrados = todosPeriodo.filter(p => {
      if (filtroPedidoEstado === 'pendiente') return p.pagoStatus === 'pendiente'
      if (filtroPedidoEstado === 'voucher_subido') return p.pagoStatus === 'voucher_subido'
      if (filtroPedidoEstado === 'verificado') return p.pagoStatus === 'verificado' && p.logisticaStatus === 'preparando'
      if (filtroPedidoEstado === 'en_agencia') return p.logisticaStatus === 'en_agencia'
      return true
    }).filter(p => !busquedaPedido || p.id.toLowerCase().includes(busquedaPedido.toLowerCase()))

    const fchip = (active: boolean, color?: string): React.CSSProperties => ({
      padding: '4px 10px', borderRadius: 6,
      background: active ? (color ?? 'var(--tw-terra)') : 'rgba(201,110,75,.1)',
      border: `1px solid ${active ? (color ?? 'var(--tw-terra)') : 'rgba(201,110,75,.2)'}`,
      color: active ? '#fff' : (color ?? 'var(--tw-terra)'),
      fontSize: 10, fontWeight: 600, cursor: 'pointer',
      fontFamily: 'Montserrat, sans-serif', whiteSpace: 'nowrap',
    })
    const fchipNeutro = (active: boolean): React.CSSProperties => ({
      padding: '4px 10px', borderRadius: 6,
      background: 'none',
      border: `1px solid ${active ? 'var(--tw-terra)' : 'var(--tw-border)'}`,
      color: active ? 'var(--tw-terra)' : 'var(--tw-text-muted)',
      fontSize: 10, fontWeight: 600, cursor: 'pointer',
      fontFamily: 'Montserrat, sans-serif', whiteSpace: 'nowrap',
    })

    return (
      <div>
        {/* Fila 1: filtros de estado */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          <button style={fchip(filtroPedidoEstado === 'todos')} onClick={() => setFiltroPedidoEstado('todos')}>
            Todos ({todosPeriodo.length})
          </button>
          <button style={fchip(filtroPedidoEstado === 'pendiente', 'var(--tw-warning)')} onClick={() => setFiltroPedidoEstado('pendiente')}>
            Sin pago ({countPend})
          </button>
          <button style={fchip(filtroPedidoEstado === 'en_agencia', 'var(--tw-info)')} onClick={() => setFiltroPedidoEstado('en_agencia')}>
            En camino ({countCamino})
          </button>
          <button style={fchip(filtroPedidoEstado === 'verificado', 'var(--tw-sage)')} onClick={() => setFiltroPedidoEstado('verificado')}>
            Entregados
          </button>
        </div>
        {/* Fila 2: filtros de periodo */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          <button style={fchipNeutro(filtroPeriodo === 'semana')} onClick={() => setFiltroPeriodo('semana')}>📅 Esta semana</button>
          <button style={fchipNeutro(filtroPeriodo === 'mes')} onClick={() => setFiltroPeriodo('mes')}>Este mes</button>
          <button style={fchipNeutro(filtroPeriodo === 'tres_meses')} onClick={() => setFiltroPeriodo('tres_meses')}>Últimos 3 meses</button>
        </div>

        {filtrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            {pedidos.length === 0 ? (
              <>
                <p style={{ fontSize: 36, marginBottom: 12 }}>📦</p>
                <p style={{ fontSize: 16, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, marginBottom: 8 }}>Sin pedidos activos</p>
                <p style={{ fontSize: 13, color: 'var(--tw-text-muted)', marginBottom: 20 }}>Cuando realices un pedido aparecerá aquí</p>
                <a href="/" onClick={(e) => { e.preventDefault(); navigate('/') }} style={{ display: 'inline-block', padding: '12px 24px', borderRadius: 10, background: 'var(--tw-terra)', color: 'var(--tw-text-inverse)', textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>Ver catálogo →</a>
              </>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--tw-text-muted)' }}>Sin pedidos con este filtro</p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(() => {
              // Agrupar pedidos con grupoCheckoutId bajo un banner colapsable
              const grupos = new Map<string, PedidoONE[]>()
              const sinGrupo: PedidoONE[] = []
              for (const p of filtrados) {
                if (p.grupoCheckoutId) {
                  const g = grupos.get(p.grupoCheckoutId) ?? []
                  g.push(p)
                  grupos.set(p.grupoCheckoutId, g)
                } else {
                  sinGrupo.push(p)
                }
              }
              // Renderizar pedidos sueltos (sin grupo) y grupos
              const items: React.ReactNode[] = []
              // Primero los grupos
              for (const [grupoId, gruposPedidos] of grupos) {
                const totalGrupo = gruposPedidos.reduce((s, p) => s + p.totalCents, 0)
                const fechaGrupo = formatFecha(gruposPedidos[0]?.createdAt ?? '')
                const grupoKey = `grupo-${grupoId}`
                items.push(
                  <div key={grupoKey} style={{ border: '1px solid var(--tw-border)', borderRadius: 12, overflow: 'hidden', background: 'var(--tw-card)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--tw-border)', background: 'rgba(201,110,75,.04)', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11 }}>🛍️</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-text)' }}>Compra del {fechaGrupo}</span>
                        <span style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>· {gruposPedidos.length} caficultores</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--tw-terra)' }}>{formatCents(totalGrupo)}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {gruposPedidos.map(pedido => renderPedidoCard(pedido, getStatusInfo, getFechaEstimada))}
                    </div>
                  </div>
                )
              }
              // Luego los pedidos sin grupo
              for (const pedido of sinGrupo) {
                items.push(renderPedidoCard(pedido, getStatusInfo, getFechaEstimada))
              }
              return items
            })()}
          </div>
        )}

        {/* Input file oculto para subir voucher desde lista/detalle */}
        <input ref={detalleVoucherRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={async e => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file || !voucherPedido) return
          setVoucherSubiendoDetalle(true)
          try {
            let url: string
            if (isDemo) {
              await demoSubirVoucher(voucherPedido.id, 'demo-voucher')
              url = 'demo-voucher'
            } else {
              const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
              const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
              const fd = new FormData()
              fd.append('file', file)
              fd.append('upload_preset', uploadPreset)
              fd.append('folder', 'one_vouchers')
              const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd })
              const data = await res.json()
              url = data.secure_url
              await subirVoucher(voucherPedido.id, url)
            }
            setPedidos(prev => prev.map(p => p.id === voucherPedido.id ? { ...p, pagoStatus: 'voucher_subido' as const, voucherUrl: url } : p))
            if (pedidoDetalle?.id === voucherPedido.id) setPedidoDetalle(prev => prev ? { ...prev, pagoStatus: 'voucher_subido' as const, voucherUrl: url } : prev)
            toast('✓ Voucher subido correctamente', 'ok')
          } catch (err) {
            console.error('Error subiendo voucher:', err)
            toast('Error subiendo voucher', 'error')
          } finally {
            setVoucherSubiendoDetalle(false)
            setVoucherPedido(null)
          }
        }} />

        {/* Drawer detalle pedido */}
        {pedidoDetalle && (() => {
          const p = pedidoDetalle
          const isAgencia = p.logisticaStatus === 'en_agencia' || p.logisticaStatus === 'en_disputa'
          const pagoOk = p.pagoStatus === 'verificado'
          const statusColor = p.pagoStatus === 'pendiente' ? 'var(--tw-warning)'
            : p.pagoStatus === 'voucher_subido' ? 'var(--tw-warning)'
            : p.logisticaStatus === 'en_disputa' ? '#f59e0b'
            : isAgencia ? 'var(--tw-info)' : 'var(--tw-sage)'

          return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex' }} onClick={() => setPedidoDetalle(null)}>
              <div className="detalle-overlay" style={{ flex: 1, background: 'rgba(0,0,0,0.7)' }} />
              <div
                className="detalle-panel"
                style={{ width: 'min(480px, 100vw)', background: 'var(--tw-card)', borderLeft: `1px solid ${'var(--tw-border)'}`, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${'var(--tw-border)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: 10, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace' }}>{p.id}</p>
                    <h2 style={{ margin: '0 0 2px', fontSize: 22, fontFamily: 'Cormorant Garamond, serif', color: 'var(--tw-text)', fontWeight: 700 }}>{p.nombreLocal}</h2>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--tw-text-muted)' }}>{formatFecha(p.createdAt)}</p>
                  </div>
                  <button onClick={() => setPedidoDetalle(null)} style={{ background: 'none', border: 'none', color: 'var(--tw-text-muted)', fontSize: 22, cursor: 'pointer', padding: '0 0 0 16px', lineHeight: 1 }}>×</button>
                </div>

                {/* Sub-tabs strip */}
                {(() => {
                  const tabs: { id: 'pedido' | 'mensajes' | 'resenia'; label: string }[] = [
                    { id: 'pedido', label: '📦 Pedido' },
                    { id: 'mensajes', label: '💬 Mensajes' },
                    { id: 'resenia', label: '⭐ Reseña' },
                  ]
                  return (
                    <div style={{ display: 'flex', borderBottom: `1px solid ${'var(--tw-border)'}`, flexShrink: 0 }}>
                      {tabs.map(t => (
                        <button key={t.id} onClick={() => setDetallePedidoTab(t.id)}
                          style={{ flex: 1, padding: '10px 4px', background: 'none', border: 'none', borderBottom: detallePedidoTab === t.id ? `2px solid ${'var(--tw-terra)'}` : '2px solid transparent', color: detallePedidoTab === t.id ? 'var(--tw-terra)' : 'var(--tw-text-muted)', fontSize: 12, fontWeight: detallePedidoTab === t.id ? 700 : 500, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', marginBottom: -1, whiteSpace: 'nowrap' }}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )
                })()}

                <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* TAB: Pedido */}
                  {detallePedidoTab === 'pedido' && (<>
                    {/* Stepper */}
                    <StepperPedido pedido={p} />

                    {/* Guías por caficultor (reemplaza el código global de agencia) */}
                    {(() => {
                      // Nuevo modelo: pedido pertenece a un solo caficultor — detalle completo
                      if (p.caficultorId && !p.enviosCaficultor) {
                        const cafNombre = p.items[0]?.caficultorNombre ?? p.caficultorId
                        const logStatus = p.logisticaStatus
                        const scColor = logStatus === 'entregado' || logStatus === 'resuelto_ok' ? 'var(--tw-sage)' : logStatus === 'en_agencia' ? 'var(--tw-info)' : logStatus === 'en_disputa' ? '#f59e0b' : 'var(--tw-warning)'
                        const scLabel = logStatus === 'entregado' || logStatus === 'resuelto_ok' ? '✅ Entregado' : logStatus === 'en_agencia' ? '🚚 En tránsito' : logStatus === 'en_disputa' ? '⚠ En disputa' : '⏳ Preparando'
                        const envioD = p.envioDetalle?.[p.caficultorId]
                        const esDomicilio = envioD?.tipo === 'domicilio'
                        return (
                          <div>
                            {/* Guía card — caficultor único */}
                            <div style={{ border: '1px solid var(--tw-border)', borderRadius: 10, overflow: 'hidden' }}>
                              {/* Header caficultor */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(201,110,75,.04)' }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--tw-sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                  {cafNombre.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-text)' }}>{cafNombre}</div>
                                  <div style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>{p.items.length} producto{p.items.length !== 1 ? 's' : ''}</div>
                                </div>
                                <span style={{ fontSize: 9, fontWeight: 700, color: scColor, padding: '2px 8px', borderRadius: 12, border: `1px solid ${scColor}44`, background: `${scColor}11`, whiteSpace: 'nowrap' }}>{scLabel}</span>
                              </div>

                              {/* Productos */}
                              <div style={{ padding: '10px 14px', borderTop: '1px solid var(--tw-border)', background: 'var(--tw-bg)' }}>
                                {p.items.map((item, i) => (
                                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < p.items.length - 1 ? 8 : 0 }}>
                                    <div style={{ width: 28, height: 28, background: 'var(--tw-card)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0, border: '1px solid var(--tw-border)' }}>
                                      {(item as any).fotoUrl ? <img src={(item as any).fotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} /> : '☕'}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tw-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.productoNombre}</div>
                                      <div style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>{item.presentacion} × {item.qty}</div>
                                    </div>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-text)', flexShrink: 0 }}>{formatCents(item.subtotalCents)}</span>
                                  </div>
                                ))}
                              </div>

                              {/* Envío info */}
                              <div style={{ padding: '8px 14px', borderTop: '1px solid var(--tw-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>
                                  {envioD ? (esDomicilio ? '🚚 Envío a domicilio' : `📦 ${envioD.agencia ?? 'Agencia'}`) : '📦 Envío'}
                                </span>
                                {envioD ? (
                                  <span style={{ fontSize: 10, fontWeight: 700, color: envioD.gratis ? 'var(--tw-sage)' : 'var(--tw-text)' }}>
                                    {envioD.gratis ? 'Gratis' : formatCents(envioD.costoCents)}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: 10, color: 'var(--tw-text-muted)', fontStyle: 'italic' }}>a coordinar</span>
                                )}
                              </div>

                              {/* Dirección — solo si es domicilio */}
                              {esDomicilio && p.direccionEntrega && (
                                <div style={{ padding: '6px 14px 8px', borderTop: '1px solid var(--tw-border)' }}>
                                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--tw-text-muted)', marginBottom: 2 }}>Dirección de entrega</div>
                                  <div style={{ fontSize: 11, color: 'var(--tw-text)' }}>📍 {p.direccionEntrega}</div>
                                </div>
                              )}

                              {/* Destinatario — siempre visible */}
                              {(() => {
                                const ruc = usuario?.empresa?.ruc ?? (usuario?.negocio as any)?.ruc
                                const razonSocial = usuario?.empresa?.razonSocial ?? (usuario?.negocio as any)?.razonSocial
                                const contactoNombre = [(usuario?.negocio as any)?.contactoNombre, (usuario?.negocio as any)?.contactoApellido].filter(Boolean).join(' ') || p.negocioNombre
                                return (
                                  <div style={{ padding: '6px 14px 8px', borderTop: '1px solid var(--tw-border)' }}>
                                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--tw-text-muted)', marginBottom: 4 }}>Destinatario</div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tw-text)' }}>{razonSocial || p.nombreLocal}</div>
                                    {ruc && <div style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>RUC {ruc}</div>}
                                    {contactoNombre && <div style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>👤 {contactoNombre}</div>}
                                    {p.negocioEmail && <div style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>{p.negocioEmail}</div>}
                                    {p.negocioTelefono && <div style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>{p.negocioTelefono}</div>}
                                    {p.distritoLocal && <div style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>📍 {p.distritoLocal}</div>}
                                  </div>
                                )
                              })()}

                              {/* Tracking info */}
                              {p.codigoAgencia && (
                                <div style={{ padding: '8px 14px', borderTop: '1px solid var(--tw-border)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 8 }}>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--tw-text-muted)', marginBottom: 2 }}>{p.agencia?.toUpperCase() ?? 'AGENCIA'} · Código de tracking</div>
                                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em' }}>{p.codigoAgencia}</div>
                                    </div>
                                    <button onClick={() => navigator.clipboard?.writeText(p.codigoAgencia ?? '')} style={{ background: 'none', border: 'none', fontSize: 9, fontWeight: 700, color: 'var(--tw-terra)', cursor: 'pointer', padding: 0 }}>Copiar →</button>
                                  </div>
                                </div>
                              )}

                              {/* Confirmar recepción / reportar problema */}
                              {logStatus === 'en_agencia' && (
                                <div style={{ padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-text-muted)', textAlign: 'center', marginBottom: 2 }}>¿Recibiste tu pedido?</div>
                                  <button onClick={() => handleConfirmarRecepcion(p.id)} disabled={accionando === p.id}
                                    style={{ width: '100%', padding: '8px', borderRadius: 8, border: 'none', background: 'var(--tw-sage)', color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                                    {accionando === p.id ? 'Procesando...' : '✓ Todo bien — Confirmar recepción'}
                                  </button>
                                  <button onClick={() => { setPedidoDetalle(null); setSubTab('reclamos'); setReclamoPantalla('nuevo'); setReclamoPaso(1); setReclamoForm({ pedidoId: p.id, pedidoRef: p.id, caficultorId: p.caficultorId ?? '', caficultorNombre: p.items[0]?.caficultorNombre ?? '', tipo: 'producto_danado', descripcion: '' }); setReclamoPantalla('nuevo') }}
                                    style={{ width: '100%', padding: '8px', borderRadius: 8, border: '2px solid var(--tw-terra)', background: 'transparent', color: 'var(--tw-terra)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                                    ⚠ Tengo un problema
                                  </button>
                                  <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', textAlign: 'center' }}>Si no confirmas en 7 días se marcará como entregado automáticamente</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      }

                      // Modelo legacy: múltiples caficultores con enviosCaficultor
                      const caficultoresUnicos = Array.from(new Map(p.items.map(i => [i.caficultorId, i])).values())
                      const envios = p.enviosCaficultor ?? {}
                      const totalGuias = caficultoresUnicos.length

                      return (
                        <div>
                          {/* Banner resumen — siempre visible si hay múltiples caficultores */}
                          {totalGuias > 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(201,110,75,.06)', border: '1px solid rgba(201,110,75,.15)', borderRadius: 8, marginBottom: 10, fontSize: 10, color: 'var(--tw-text-muted)' }}>
                              <span style={{ fontSize: 14 }}>📬</span>
                              <span><strong>{totalGuias} envíos independientes</strong> · cada caficultor despacha por separado</span>
                            </div>
                          )}

                          {/* Guía card por caficultor */}
                          {caficultoresUnicos.map(item => {
                            const guiaId = `${p.id}-${item.caficultorId}`
                            const abierta = guiasAbiertas.has(guiaId)
                            const envioCaf = envios[item.caficultorId]
                            // Solo usar el código global si NO hay envíos individuales registrados aún
                            const sinEnviosIndividuales = Object.keys(envios).length === 0
                            const cafStatus: 'preparando' | 'en_agencia' | 'entregado' | 'en_disputa' | 'resuelto_ok' = envioCaf?.logisticaStatus ?? (sinEnviosIndividuales ? p.logisticaStatus : 'preparando')
                            const codigoCaf = envioCaf?.codigoAgencia ?? (sinEnviosIndividuales ? p.codigoAgencia : undefined)
                            const agenciaCaf = envioCaf?.agencia ?? (sinEnviosIndividuales ? p.agencia : undefined)
                            const scColor = cafStatus === 'entregado' || cafStatus === 'resuelto_ok' ? 'var(--tw-sage)' : cafStatus === 'en_agencia' ? 'var(--tw-info)' : cafStatus === 'en_disputa' ? '#f59e0b' : 'var(--tw-warning)'
                            const scLabel = cafStatus === 'entregado' || cafStatus === 'resuelto_ok' ? '✅ Entregado' : cafStatus === 'en_agencia' ? '🚚 En tránsito' : cafStatus === 'en_disputa' ? '⚠ En disputa' : '⏳ Preparando'
                            const initials = item.caficultorNombre.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                            return (
                              <div key={guiaId} style={{ border: '1px solid var(--tw-border)', borderRadius: 10, marginBottom: 8, overflow: 'hidden' }}>
                                <div onClick={() => setGuiasAbiertas(prev => { const s = new Set(prev); s.has(guiaId) ? s.delete(guiaId) : s.add(guiaId); return s })}
                                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', background: abierta ? 'rgba(201,110,75,.04)' : 'var(--tw-card)' }}>
                                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--tw-sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials}</div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.caficultorNombre}</div>
                                    <div style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>{item.productoNombre} · {item.qty} × {item.presentacion}</div>
                                  </div>
                                  <span style={{ fontSize: 9, fontWeight: 700, color: scColor, padding: '2px 8px', borderRadius: 12, border: `1px solid ${scColor}44`, background: `${scColor}11`, whiteSpace: 'nowrap', flexShrink: 0 }}>{scLabel}</span>
                                  <span style={{ fontSize: 14, color: 'var(--tw-text-muted)', transition: 'transform .15s', transform: abierta ? 'rotate(90deg)' : 'none', flexShrink: 0 }}>›</span>
                                </div>
                                {abierta && (
                                  <div style={{ padding: '10px 14px 12px', background: 'var(--tw-bg)', borderTop: '1px solid var(--tw-border)' }}>
                                    {codigoCaf ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 8, marginBottom: 8 }}>
                                        <div style={{ flex: 1 }}>
                                          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--tw-text-muted)', marginBottom: 2 }}>{agenciaCaf?.toUpperCase() ?? 'OLVA'} · Código de tracking</div>
                                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em' }}>{codigoCaf}</div>
                                        </div>
                                        <button onClick={() => navigator.clipboard?.writeText(codigoCaf)} style={{ background: 'none', border: 'none', fontSize: 9, fontWeight: 700, color: 'var(--tw-terra)', cursor: 'pointer', padding: 0, flexShrink: 0 }}>Copiar →</button>
                                      </div>
                                    ) : (
                                      <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', marginBottom: 8 }}>Sin código de tracking aún</div>
                                    )}
                                    {/* Envío detalle */}
                                    {(() => {
                                      const envioD = p.envioDetalle?.[item.caficultorId]
                                      return (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                          <span style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>
                                            {envioD ? (envioD.tipo === 'domicilio' ? '🚚 Envío a domicilio' : `📦 ${envioD.agencia ?? 'Agencia'}`) : '📦 Envío'}
                                          </span>
                                          {envioD ? (
                                            <span style={{ fontSize: 10, fontWeight: 700, color: envioD.gratis ? 'var(--tw-sage)' : 'var(--tw-text-muted)' }}>
                                              {envioD.gratis ? 'Gratis' : formatCents(envioD.costoCents)}
                                            </span>
                                          ) : (
                                            <span style={{ fontSize: 10, color: 'var(--tw-text-muted)', fontStyle: 'italic' }}>a coordinar</span>
                                          )}
                                        </div>
                                      )
                                    })()}
                                    {/* Dirección — solo para caficultores con domicilio */}
                                    {p.envioDetalle?.[item.caficultorId]?.tipo === 'domicilio' && p.direccionEntrega && (
                                      <div style={{ padding: '6px 8px', background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 6, marginBottom: 6 }}>
                                        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--tw-text-muted)', marginBottom: 2 }}>Dirección de entrega</div>
                                        <div style={{ fontSize: 11, color: 'var(--tw-text)' }}>📍 {p.direccionEntrega}</div>
                                      </div>
                                    )}
                                    {/* Destinatario */}
                                    {(() => {
                                      const ruc = usuario?.empresa?.ruc ?? (usuario?.negocio as any)?.ruc
                                      const razonSocial = usuario?.empresa?.razonSocial ?? (usuario?.negocio as any)?.razonSocial
                                      const contactoNombre = [(usuario?.negocio as any)?.contactoNombre, (usuario?.negocio as any)?.contactoApellido].filter(Boolean).join(' ') || p.negocioNombre
                                      return (
                                        <div style={{ padding: '4px 0 6px', marginBottom: 4 }}>
                                          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--tw-text-muted)', marginBottom: 2 }}>Destinatario</div>
                                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tw-text)' }}>{razonSocial || p.nombreLocal}</div>
                                          {ruc && <div style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>RUC {ruc}</div>}
                                          {contactoNombre && <div style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>👤 {contactoNombre}</div>}
                                          {p.negocioEmail && <div style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>{p.negocioEmail}</div>}
                                          {p.negocioTelefono && <div style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>{p.negocioTelefono}</div>}
                                          {p.distritoLocal && <div style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>📍 {p.distritoLocal}</div>}
                                        </div>
                                      )
                                    })()}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4, borderTop: '1px solid var(--tw-border)', marginBottom: (cafStatus === 'en_agencia' || cafStatus === 'en_disputa') ? 8 : 0 }}>
                                      <span style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>Subtotal productos</span>
                                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-text)' }}>{formatCents(item.subtotalCents)}</span>
                                    </div>
                                    {/* Botones confirmar recepción / reportar problema por caficultor */}
                                    {cafStatus === 'en_agencia' && Object.keys(envios).length > 0 && (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-text-muted)', textAlign: 'center', marginBottom: 2 }}>¿Recibiste este envío?</div>
                                        <button
                                          onClick={e => { e.stopPropagation(); handleConfirmarRecepcionCaficultor(p.id, item.caficultorId) }}
                                          disabled={accionando === `${p.id}-${item.caficultorId}`}
                                          style={{ width: '100%', padding: '8px', borderRadius: 8, border: 'none', background: 'var(--tw-sage)', color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
                                        >
                                          {accionando === `${p.id}-${item.caficultorId}` ? 'Procesando...' : '✓ Todo bien — Recibí este envío'}
                                        </button>
                                        <button
                                          onClick={e => { e.stopPropagation(); setPedidoDetalle(null); setSubTab('reclamos'); setReclamoPantalla('nuevo'); setReclamoPaso(1); setReclamoForm({ pedidoId: p.id, pedidoRef: p.id, caficultorId: item.caficultorId, caficultorNombre: item.caficultorNombre, tipo: 'producto_danado', descripcion: '' }) }}
                                          style={{ width: '100%', padding: '8px', borderRadius: 8, border: '2px solid var(--tw-terra)', background: 'transparent', color: 'var(--tw-terra)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
                                        >
                                          ⚠ Tengo un problema
                                        </button>
                                        <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', textAlign: 'center' }}>Si no confirmas en 7 días se marcará como entregado automáticamente</div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}

                    {/* Estado pago */}
                    <div style={{ padding: '12px 14px', borderRadius: 10, background: statusColor + '11', border: `1px solid ${statusColor}33` }}>
                      <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: statusColor }}>
                        {p.pagoStatus === 'pendiente' ? '⏳ Pago pendiente'
                          : p.pagoStatus === 'voucher_subido' ? '🔎 Voucher enviado — verificando'
                          : p.pagoStatus === 'rechazado' ? '✕ Pago rechazado'
                          : pagoOk ? '✓ Pago verificado'
                          : '—'}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--tw-text-muted)' }}>
                        Método: {p.metodoPago?.toUpperCase() ?? '—'}
                        {p.voucherUrl ? <> · <a href={p.voucherUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--tw-terra)' }}>Ver voucher →</a></> : null}
                      </p>
                    </div>

                    {/* Total */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: 'var(--tw-card)', border: '1px solid var(--tw-border)' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tw-text)' }}>Total</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--tw-terra)' }}>{formatCents(p.totalCents)}</span>
                    </div>

                    {/* Dirección — solo para pedidos legacy sin envioDetalle */}
                    {p.direccionEntrega && (!p.envioDetalle || Object.keys(p.envioDetalle).length === 0) && (
                      <div>
                        <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Dirección de entrega</p>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--tw-text)', padding: '10px 12px', background: 'var(--tw-bg)', borderRadius: 8 }}>📍 {p.direccionEntrega}</p>
                      </div>
                    )}

                    {/* Pago rechazado */}
                    {p.pagoStatus === 'rechazado' && (
                      <a href={`https://wa.me/${ONE_CONFIG.ADMIN_WHATSAPP.replace(/\s/g, '')}?text=Hola, mi pedido ${p.id} fue rechazado`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'var(--tw-error)' + '18', border: `1px solid ${'var(--tw-error)'}44`, textDecoration: 'none' }}>
                        <span>💬</span>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--tw-error)' }}>Contactar soporte →</p>
                      </a>
                    )}

                    {/* Cancelar pedido (US-447): solo cuando PAID = verificado + preparando */}
                    {!p.cancelado && p.pagoStatus === 'verificado' && p.logisticaStatus === 'preparando' && (
                      <button
                        onClick={() => setModalCancelarPedido(p)}
                        style={{ width: '100%', padding: '11px 16px', borderRadius: 10, border: '1px solid var(--tw-border)', background: 'transparent', color: 'var(--tw-text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', marginTop: 4 }}
                      >
                        Cancelar pedido
                      </button>
                    )}

                    {/* Badge cancelado / expirado */}
                    {p.cancelado && (
                      p.cancellationReason === 'PAYMENT_EXPIRED'
                        ? (
                          <OrdenExpiradaB2C
                            pedido={p}
                            onVolverComprar={(_productoId) => {
                              setPedidoDetalle(null)
                            }}
                            onOtroMetodo={() => {
                              setPedidoDetalle(null)
                              setSubTab('pedidos')
                            }}
                            onVerCompras={() => {
                              setPedidoDetalle(null)
                              setSubTab('pedidos')
                            }}
                          />
                        )
                        : (
                          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', textAlign: 'center' }}>
                            <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: '#ef4444' }}>✕ Pedido cancelado</p>
                            <p style={{ margin: 0, fontSize: 11, color: 'var(--tw-text-muted)' }}>{p.motivoCancelacion ?? 'Cancelado'} · Reembolso en 3-5 días hábiles · {p.canceladoAt ? new Date(p.canceladoAt).toLocaleDateString('es-PE') : ''}</p>
                          </div>
                        )
                    )}
                  </>)}

                  {/* TAB: Mensajes — un chat por caficultor */}
                  {detallePedidoTab === 'mensajes' && (() => {
                    const caficultoresUnicos = Array.from(new Map(p.items.map(i => [i.caficultorId, i])).values())
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {caficultoresUnicos.map(item => (
                          <div key={item.caficultorId}>
                            {caficultoresUnicos.length > 1 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--tw-sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                  {item.caficultorNombre.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tw-text)' }}>{item.caficultorNombre}</span>
                              </div>
                            )}
                            <ChatPedido
                              pedidoId={p.id}
                              caficultorId={item.caficultorId}
                              caficultorNombre={item.caficultorNombre}
                              usuarioId={usuarioId}
                              usuarioNombre={p.negocioNombre}
                              usuarioRol="buyer_b2b"
                              isDemo={isDemo}
                              codigoTracking={p.enviosCaficultor?.[item.caficultorId]?.codigoAgencia ?? (Object.keys(p.enviosCaficultor ?? {}).length === 0 ? p.codigoAgencia : undefined)}
                            />
                          </div>
                        ))}
                      </div>
                    )
                  })()}

                  {/* TAB: Reseña — una por caficultor */}
                  {detallePedidoTab === 'resenia' && (() => {
                    if (p.logisticaStatus !== 'entregado') {
                      return (
                        <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 40 }}>📦</span>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--tw-text)' }}>Pedido aún en camino</p>
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--tw-text-muted)', maxWidth: 240, lineHeight: 1.6 }}>Podrás dejar tu reseña una vez que confirmes la recepción del pedido.</p>
                        </div>
                      )
                    }
                    const caficultoresUnicos = Array.from(new Map(p.items.map(i => [i.caficultorId, i])).values())
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {caficultoresUnicos.map(item => (
                          <div key={item.caficultorId} style={{ padding: '14px', border: '1px solid var(--tw-border)', borderRadius: 10, background: 'var(--tw-card)' }}>
                            {caficultoresUnicos.length > 1 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--tw-border)' }}>
                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--tw-sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                  {item.caficultorNombre.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tw-text)' }}>{item.caficultorNombre}</span>
                              </div>
                            )}
                            <ReseniaFormCaficultor
                              caficultorNombre={item.caficultorNombre}
                              onEnviado={() => setPedidos(prev => prev.map(x => x.id === p.id ? { ...x, calificado: true } : x))}
                            />
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>

                {/* Footer acción */}
                {(p.pagoStatus === 'pendiente' || isAgencia) && (
                  <div style={{ padding: '16px 24px', borderTop: `1px solid ${'var(--tw-border)'}`, flexShrink: 0 }}>
                    {p.pagoStatus === 'pendiente' && (
                      <button
                        onClick={() => { setVoucherPedido(p); setTimeout(() => detalleVoucherRef.current?.click(), 0) }}
                        disabled={voucherSubiendoDetalle && voucherPedido?.id === p.id}
                        style={{ display: 'block', width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: 'var(--tw-warning)', color: '#000', fontSize: 14, fontWeight: 700, textAlign: 'center', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
                      >
                        {voucherSubiendoDetalle && voucherPedido?.id === p.id ? 'Subiendo…' : 'Subir comprobante de pago →'}
                      </button>
                    )}
                    {/* Botón global solo para pedidos legacy sin enviosCaficultor */}
                    {isAgencia && Object.keys(p.enviosCaficultor ?? {}).length === 0 && p.logisticaStatus === 'en_agencia' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-text-muted)', textAlign: 'center', marginBottom: 2 }}>¿Recibiste tu pedido?</div>
                        <button
                          onClick={() => { setPedidoDetalle(null); handleConfirmarRecepcion(p.id) }}
                          disabled={accionando === p.id}
                          style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: 'var(--tw-sage)', color: '#000', fontSize: 14, fontWeight: 700, cursor: accionando === p.id ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat, sans-serif' }}
                        >
                          {accionando === p.id ? 'Procesando...' : '✓ Todo bien — Confirmar recepción'}
                        </button>
                        <button
                          onClick={() => { setPedidoDetalle(null); setSubTab('reclamos'); setReclamoPantalla('nuevo'); setReclamoPaso(1); setReclamoForm({ pedidoId: p.id, pedidoRef: p.id, caficultorId: p.caficultorId ?? '', caficultorNombre: p.items[0]?.caficultorNombre ?? '', tipo: 'producto_danado', descripcion: '' }) }}
                          style={{ width: '100%', padding: '14px', borderRadius: 10, border: '2px solid var(--tw-terra)', background: 'transparent', color: 'var(--tw-terra)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
                        >
                          ⚠ Tengo un problema
                        </button>
                        <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', textAlign: 'center' }}>Si no confirmas en 7 días se marcará como entregado automáticamente</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer: Reportar problema — visible en tránsito (deshabilitado) y hasta 72h tras entrega */}
                {!p.cancelado && (p.logisticaStatus === 'en_agencia' || p.logisticaStatus === 'en_disputa' || p.logisticaStatus === 'entregado') && (() => {
                  const yaReclamo = reclamos.some(r => r.pedidoId === p.id && (r.estado === 'ABIERTO' || r.estado === 'EN_REVISION' || r.estado === 'ESPERANDO_INFO'
                    || r.estado === 'ESCALADO' || r.estado === 'DECISION_PENDIENTE'
                    || r.estado === 'RESOLUCION_COMPRADOR' || r.estado === 'RESOLUCION_CAFICULTOR'
                    || r.estado === 'EJECUCION_FINANCIERA' || r.estado === 'EJECUCION_FALLIDA'))
                  if (yaReclamo || p.logisticaStatus === 'en_disputa') {
                    return (
                      <div style={{ padding: '12px 24px', borderTop: `1px solid ${'var(--tw-border)'}`, flexShrink: 0 }}>
                        <button
                          onClick={() => { setPedidoDetalle(null); setSubTab('reclamos'); setReclamoPantalla('lista') }}
                          style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid rgba(201,110,75,.35)', background: 'transparent', color: 'var(--tw-terra)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
                        >
                          ⚠ Ver estado del reclamo →
                        </button>
                      </div>
                    )
                  }
                  if (p.logisticaStatus === 'en_agencia') {
                    return (
                      <div style={{ padding: '12px 24px', borderTop: `1px solid ${'var(--tw-border)'}`, flexShrink: 0 }}>
                        <button
                          onClick={() => {
                            setPedidoDetalle(null)
                            setSubTab('reclamos')
                            setReclamoPantalla('nuevo')
                            setReclamoPaso(1)
                            setReclamoForm({ pedidoId: p.id, pedidoRef: p.id, caficultorId: p.items[0]?.caficultorId ?? '', caficultorNombre: p.items[0]?.caficultorNombre ?? '', tipo: 'producto_danado', descripcion: '' })
                          }}
                          style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid rgba(201,110,75,.35)', background: 'transparent', color: 'var(--tw-terra)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
                        >
                          Reportar problema
                        </button>
                      </div>
                    )
                  }
                  if (p.logisticaStatus === 'entregado') {
                    const msDesdeEntrega = Date.now() - new Date(p.updatedAt).getTime()
                    const dentroVentana = msDesdeEntrega < 72 * 60 * 60 * 1000
                    if (dentroVentana) {
                      return (
                        <div style={{ padding: '12px 24px', borderTop: `1px solid ${'var(--tw-border)'}`, flexShrink: 0 }}>
                          <button
                            onClick={() => {
                              setPedidoDetalle(null)
                              setSubTab('reclamos')
                              setReclamoPantalla('nuevo')
                              setReclamoPaso(1)
                              setReclamoForm({ pedidoId: p.id, pedidoRef: p.id, caficultorId: p.items[0]?.caficultorId ?? '', caficultorNombre: p.items[0]?.caficultorNombre ?? '', tipo: 'producto_danado', descripcion: '' })
                            }}
                            style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid rgba(201,110,75,.35)', background: 'transparent', color: 'var(--tw-terra)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
                          >
                            Reportar problema
                          </button>
                        </div>
                      )
                    }
                  }
                  return null
                })()}
              </div>
            </div>
          )
        })()}
      </div>
    )
  }

  // ─── Nuevas funciones: Mensajes, Reseñas, Carrito, Mis Compras ──────────────

  function renderResenias() {
    const entregados = pedidos.filter(p => p.logisticaStatus === 'entregado')
    const pendientes = entregados.filter(p => !p.calificado && p.recepcionConfirmada)
    const yaResenados = entregados.filter(p => p.calificado)

    return (
      <div>
        {pendientes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>⭐</p>
            <p style={{ fontSize: 16, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, marginBottom: 8 }}>Todo calificado</p>
            <p style={{ fontSize: 13, color: 'var(--tw-text-muted)' }}>No tienes pedidos pendientes de reseña</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ padding: '4px 12px', borderRadius: 20, background: `${'var(--tw-warning)'}22`, color: 'var(--tw-warning)', fontSize: 12, fontWeight: 700, border: `1px solid ${'var(--tw-warning)'}44` }}>
                {pendientes.length} pendiente{pendientes.length > 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {pendientes.map(p => {
                const item = p.items[0]
                return (
                  <div key={p.id} style={{ background: 'var(--tw-card)', borderRadius: 14, padding: '16px', border: `1px solid ${'var(--tw-border)'}`, display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div style={{ width: 72, height: 72, borderRadius: 10, background: 'var(--tw-border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>☕</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: 'var(--tw-text)' }}>{item?.productoNombre ?? 'Producto'}</p>
                      <p style={{ margin: '0 0 2px', fontSize: 12, color: 'var(--tw-text-muted)' }}>{item?.presentacion} · {item?.caficultorNombre}</p>
                      <p style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--tw-text-faint)' }}>{formatFecha(p.updatedAt)}</p>
                      <div style={{ display: 'flex', gap: 2, marginBottom: 10 }}>
                        {[1,2,3,4,5].map(n => (
                          <button key={n} onClick={() => setPedidoACalificar(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--tw-warning)', opacity: 0.35, padding: 0 }}>★</button>
                        ))}
                      </div>
                      <button onClick={() => setPedidoACalificar(p)} style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        Reseñar
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
        {yaResenados.length > 0 && (
          <div>
            <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ya reseñados</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {yaResenados.map(p => (
                <div key={p.id} style={{ padding: '12px 14px', background: 'var(--tw-card)', borderRadius: 10, border: `1px solid ${'var(--tw-border)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: 'var(--tw-text)' }}>{p.items[0]?.productoNombre ?? '—'}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--tw-text-muted)' }}>{p.items[0]?.caficultorNombre} · {formatFecha(p.updatedAt)}</p>
                  </div>
                  <span style={{ color: 'var(--tw-warning)', fontSize: 14, flexShrink: 0 }}>★ Calificado</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  function renderCarrito() {
    const subtotalCents = carritoItems.reduce((s, i) =>
      s + calcularPrecioFinal(i.producto.precioBaseKgCents, i.formato) * i.qty, 0)
    const totalItems = carritoItems.reduce((s, i) => s + i.qty, 0)

    const cafIds = [...new Set(carritoItems.map(i => i.producto.caficultorId).filter(Boolean))] as string[]
    // Resumen: gratis solo si TODOS los caficultores en el carrito alcanzaron algún umbral gratis (agencia o domicilio)
    const todosCafisGratis = cafIds.length > 0 && cafIds.every(cid => {
      const log = carritoLogisticaMap[cid]
      const kg = carritoItems.filter(i => (i.producto.caficultorId ?? 'sin-cafi') === cid).reduce((s, i) => s + i.qty, 0)
      if (log?.gratisDomicilioActivo && kg >= (log.gratisDomicilioKg ?? 0)) return true
      if (log?.gratisAgenciaActivo && kg >= (log.gratisAgenciaKg ?? 0)) return true
      return false
    })

    function quitarItem(idx: number) { setCarritoItems(prev => prev.filter((_, i) => i !== idx)) }
    function cambiarQty(idx: number, delta: number) {
      setCarritoItems(prev => {
        const next = [...prev]
        const nuevo = next[idx].qty + delta
        if (nuevo <= 0) return prev.filter((_, i) => i !== idx)
        next[idx] = { ...next[idx], qty: nuevo }
        return next
      })
    }

    // ── Vista espera pago — debe ir ANTES del guard de carrito vacío ──────────
    if (carritoVista === 'espera_pago' && pedidoConfirmadoId) {
      // (bloque completo viene abajo; este early-return lo renderiza aunque el carrito esté vacío)
    }

    if (carritoItems.length === 0 && carritoVista !== 'espera_pago' && carritoVista !== 'confirmado') {
      return (
        <div style={{ textAlign: 'center', padding: '64px 20px' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🛒</p>
          <p style={{ fontSize: 18, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, marginBottom: 8 }}>Tu carrito está vacío</p>
          <p style={{ fontSize: 13, color: 'var(--tw-text-muted)', marginBottom: 20 }}>Explora el catálogo y agrega cafés</p>
          <button onClick={() => setTab('catalogo')} style={{ padding: '12px 28px', borderRadius: 10, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Ver catálogo →</button>
        </div>
      )
    }

    const masCafesSection = (
      <div style={{ marginTop: 28 }}>
        {/* Divisor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 14px' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--tw-border)' }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>Más cafés disponibles</span>
          <div style={{ flex: 1, height: 1, background: 'var(--tw-border)' }} />
        </div>
        <CatalogoPublico
          isDemo={isDemo}
          embeddedMode={true}
          hideFiltersHeader={true}
          onSeleccionar={(producto, fmt) => agregarAlCarrito(producto, fmt ?? '1kg')}
          carritoCount={carritoItems.length}
          totalCarritoCents={subtotalCents}
          carritoProductoIds={new Set(carritoItems.map(i => i.producto.id))}
          carritoLineas={carritoItems}
          onIrAlCheckout={() => setCarritoVista('pago')}
        />
      </div>
    )

    // ── Vista espera pago (instrucciones + upload voucher) ──────────────────
    if (carritoVista === 'espera_pago' && pedidoConfirmadoId) {
      const hayVariosPedidos = pedidoConfirmadoIds.length > 1
      const codigoDisplay = hayVariosPedidos ? (grupoCheckoutIdConfirmado ?? pedidoConfirmadoId) : pedidoConfirmadoId
      const waText = hayVariosPedidos
        ? `Hola%2C%20grupo%20de%20pedidos%20${encodeURIComponent(codigoDisplay)}`
        : `Hola%2C%20pedido%20${encodeURIComponent(pedidoConfirmadoId)}`
      return (
        <div style={{ maxWidth: 540, margin: '0 auto', padding: '32px 16px 60px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>🎉</div>
            <h2 style={{ margin: '0 0 4px', fontSize: 24, fontFamily: 'Cormorant Garamond, serif', color: 'var(--tw-text)', fontWeight: 700 }}>
              {hayVariosPedidos ? '¡Pedidos recibidos!' : '¡Pedido recibido!'}
            </h2>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--tw-text-muted)' }}>
              {hayVariosPedidos
                ? 'Enviamos un comprobante y todos tus caficultores comenzarán a preparar sus pedidos.'
                : 'Ahora envíanos tu comprobante de pago para que el caficultor comience a preparar tu pedido.'}
            </p>
            {hayVariosPedidos ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {pedidoConfirmadoIds.map((pid) => (
                  <div key={pid} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: 'rgba(201,110,75,.1)', border: '1px solid rgba(201,110,75,.2)' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--tw-terra)', fontFamily: 'JetBrains Mono, monospace' }}>{pid}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: 'rgba(201,110,75,.1)', border: '1px solid rgba(201,110,75,.2)' }}>
                <span style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>Código:</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--tw-terra)', fontFamily: 'JetBrains Mono, monospace' }}>{pedidoConfirmadoId}</span>
              </div>
            )}
          </div>

          {/* 4 pasos */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            {[
              { ico: '✅', label: 'Pedido creado', done: true },
              { ico: '💳', label: 'Pagar', done: false, active: true },
              { ico: '📸', label: 'Comprobante', done: false },
              { ico: '📦', label: 'Preparando', done: false },
            ].map((p, i, arr) => (
              <React.Fragment key={p.label}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 60 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: p.done ? 'var(--tw-sage)' : p.active ? 'var(--tw-terra)' : 'var(--tw-card)', border: `2px solid ${p.done ? 'var(--tw-sage)' : p.active ? 'var(--tw-terra)' : 'var(--tw-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: p.active ? '#fff' : 'inherit' }}>
                    {p.done ? '✓' : p.ico}
                  </div>
                  <span style={{ fontSize: 9, color: p.done ? 'var(--tw-sage)' : p.active ? 'var(--tw-terra)' : 'var(--tw-text-muted)', fontWeight: p.done || p.active ? 700 : 400, textAlign: 'center', maxWidth: 60, lineHeight: 1.2 }}>{p.label}</span>
                </div>
                {i < arr.length - 1 && <div style={{ flex: 1, height: 2, background: p.done ? 'var(--tw-sage)' : 'var(--tw-border)', margin: '0 4px', marginBottom: 18 }} />}
              </React.Fragment>
            ))}
          </div>

          {/* Card datos de pago */}
          {/* Countdown 24h — F-05 ORD-02 */}
          {countdown.expirado ? (
            <div style={{ background: 'rgba(234,179,8,.1)', border: '1px solid rgba(234,179,8,.35)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>⏰</div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#b45309', fontFamily: 'Montserrat, sans-serif' }}>
                Este pedido ha expirado
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--tw-text-muted)' }}>
                El tiempo para subir el comprobante venció. Contáctanos por WhatsApp si necesitas ayuda.
              </p>
            </div>
          ) : (
            <div style={{ background: 'rgba(201,110,75,.06)', border: '1px solid rgba(201,110,75,.2)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, textAlign: 'center' }}>
              <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 600, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Tiempo restante para subir tu voucher
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'flex-end' }}>
                {[
                  { val: String(countdown.horas).padStart(2, '0'), label: 'horas' },
                  { val: String(countdown.minutos).padStart(2, '0'), label: 'min' },
                  { val: String(countdown.segundos).padStart(2, '0'), label: 'seg' },
                ].map((item, idx) => (
                  <React.Fragment key={item.label}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 8, padding: '6px 14px', minWidth: 52, textAlign: 'center' }}>
                        <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--tw-terra)', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
                          {item.val}
                        </span>
                      </div>
                      <span style={{ fontSize: 9, color: 'var(--tw-text-muted)', marginTop: 4, fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}>{item.label}</span>
                    </div>
                    {idx < 2 && <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--tw-terra)', marginBottom: 18, lineHeight: 1 }}>:</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Card datos de pago */}
          <div style={{ background: 'rgba(201,110,75,.05)', border: '1px solid rgba(201,110,75,.2)', borderRadius: 12, padding: '16px', marginBottom: 16 }}>
            <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: 'var(--tw-terra)' }}>📱 Datos para el pago</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--tw-text-muted)' }}>Yape al número</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#6841b9' }}>{ONE_CONFIG.YAPE_NUMERO}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: 'var(--tw-text-muted)' }}>Cuenta BCP</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'JetBrains Mono, monospace' }}>{ONE_CONFIG.BCP_CUENTA}</span>
            </div>
            <div style={{ height: 1, background: 'var(--tw-border)', margin: '0 0 12px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tw-text)' }}>Monto exacto</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--tw-terra)' }}>{formatCents(subtotalCents)}</span>
            </div>
          </div>

          {/* Zona upload voucher */}
          <div style={{ marginBottom: 16, opacity: countdown.expirado ? 0.4 : 1, pointerEvents: countdown.expirado ? 'none' : 'auto' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 8 }}>📸 Sube tu comprobante</div>
            {pagoVoucherPreview ? (
              <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
                <img src={pagoVoucherPreview} alt="voucher" style={{ width: '100%', maxHeight: 180, objectFit: 'contain', background: 'var(--tw-card)' }} />
                <button onClick={() => { setPagoVoucherPreview(null); setPagoVoucherUrl(null) }} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.6)', border: 'none', borderRadius: '50%', width: 24, height: 24, color: '#fff', cursor: 'pointer', fontSize: 12 }}>✕</button>
              </div>
            ) : (
              <label style={{ display: 'block', border: '2px dashed var(--tw-terra)', borderRadius: 10, padding: '24px 0', textAlign: 'center', cursor: 'pointer' }}>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  // Mostrar preview local inmediatamente
                  setPagoVoucherPreview(URL.createObjectURL(file))
                  if (isDemo) {
                    setPagoVoucherUrl('demo-voucher')
                    return
                  }
                  setPagoSubiendo(true)
                  try {
                    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
                    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
                    if (!cloudName || !uploadPreset) {
                      // Sin config de Cloudinary: usar preview local y avisar
                      toast('Cloudinary no configurado — se usará preview local', 'info')
                      setPagoVoucherUrl('local-preview')
                    } else {
                      const fd = new FormData()
                      fd.append('file', file)
                      fd.append('upload_preset', uploadPreset)
                      fd.append('folder', 'one_vouchers')
                      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd })
                      if (!res.ok) throw new Error(`Cloudinary error ${res.status}`)
                      const data = await res.json()
                      if (!data.secure_url) throw new Error('Cloudinary no devolvió URL')
                      setPagoVoucherUrl(data.secure_url)
                    }
                  } catch (err) {
                    console.error('Error subiendo comprobante:', err)
                    toast('Error subiendo imagen', 'error')
                    setPagoVoucherPreview(null)
                    setPagoVoucherUrl(null)
                  } finally {
                    setPagoSubiendo(false)
                  }
                }} />
                {pagoSubiendo
                  ? <div style={{ fontSize: 12, color: 'var(--tw-terra)' }}>Subiendo…</div>
                  : <>
                    <div style={{ fontSize: 24, marginBottom: 4 }}>📎</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tw-terra)' }}>Adjuntar captura</div>
                    <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', marginTop: 2 }}>JPG, PNG · máx 5 MB</div>
                  </>
                }
              </label>
            )}
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={async () => {
              if (!pagoVoucherUrl) { toast('Adjunta primero tu comprobante', 'info'); return }
              // Solo guardar en Firestore si es una URL real (no demo/local)
              const esUrlReal = pagoVoucherUrl.startsWith('http')
              try {
                if (!isDemo && esUrlReal) {
                  if (hayVariosPedidos && grupoCheckoutIdConfirmado) {
                    await subirVoucherGrupo(grupoCheckoutIdConfirmado, pagoVoucherUrl)
                  } else {
                    await subirVoucher(pedidoConfirmadoId!, pagoVoucherUrl)
                  }
                }
              }
              catch (err) {
                console.error('Error guardando voucher en Firestore:', err)
                toast('Error enviando comprobante', 'error')
                return
              }
              setCarritoVista('confirmado')
            }} disabled={countdown.expirado} style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: countdown.expirado ? 'var(--tw-border)' : 'var(--tw-terra)', color: countdown.expirado ? 'var(--tw-text-muted)' : '#fff', fontSize: 13, fontWeight: 700, cursor: countdown.expirado ? 'not-allowed' : 'pointer', opacity: countdown.expirado ? 0.6 : 1 }}>
              {countdown.expirado ? 'Pedido expirado' : 'Enviar comprobante →'}
            </button>
            <a href={`https://wa.me/${ONE_CONFIG.ADMIN_WHATSAPP?.replace(/\s+/g, '')}?text=${waText}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 10, background: '#25D366', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
              💬 Enviar por WhatsApp
            </a>
          </div>
        </div>
      )
    }

    // ── Vista confirmación ──────────────────────────────────────────────────
    if (carritoVista === 'confirmado' && pedidoConfirmadoId) {
      const esB2B = usuario?.rol === 'buyer_b2b'
      const tieneRUC = !!(usuario?.negocio && (usuario.negocio as any).ruc)
      const PASOS_CONFIRM = [
        { ico: '✅', label: 'Pedido creado', done: true },
        { ico: '💳', label: 'Realiza el pago', done: false },
        { ico: '📸', label: 'Sube comprobante', done: false },
        { ico: '📦', label: 'Caficultor prepara', done: false },
      ]
      return (
        <div style={{ maxWidth: 540, margin: '0 auto', padding: '32px 16px 60px' }}>
          {/* Hero */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>🎉</div>
            <h2 style={{ margin: '0 0 4px', fontSize: 24, fontFamily: 'Cormorant Garamond, serif', color: 'var(--tw-text)', fontWeight: 700 }}>
              {pedidoConfirmadoIds.length > 1 ? '¡Pedidos creados!' : '¡Pedido creado!'}
            </h2>
            {pedidoConfirmadoIds.length > 1 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8, alignItems: 'center' }}>
                {pedidoConfirmadoIds.map((pid) => (
                  <div key={pid} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, background: 'rgba(201,110,75,.1)', border: '1px solid rgba(201,110,75,.2)' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--tw-terra)', fontFamily: 'JetBrains Mono, monospace' }}>{pid}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: 'rgba(201,110,75,.1)', border: '1px solid rgba(201,110,75,.2)', marginTop: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>Código:</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--tw-terra)', fontFamily: 'JetBrains Mono, monospace' }}>{pedidoConfirmadoId}</span>
              </div>
            )}
          </div>

          {/* 4 pasos de progreso */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            {PASOS_CONFIRM.map((p, i) => (
              <React.Fragment key={p.label}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 60 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: p.done ? 'var(--tw-sage)' : 'var(--tw-card)', border: `2px solid ${p.done ? 'var(--tw-sage)' : 'var(--tw-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{p.done ? '✓' : p.ico}</div>
                  <span style={{ fontSize: 9, color: p.done ? 'var(--tw-sage)' : 'var(--tw-text-muted)', fontWeight: p.done ? 700 : 400, textAlign: 'center', maxWidth: 60, lineHeight: 1.2 }}>{p.label}</span>
                </div>
                {i < PASOS_CONFIRM.length - 1 && <div style={{ flex: 1, height: 2, background: 'var(--tw-border)', margin: '0 4px', marginBottom: 18 }} />}
              </React.Fragment>
            ))}
          </div>

          {/* Toggle boleta/factura (B2B con RUC) */}
          {esB2B && (
            <div style={{ background: 'var(--tw-card)', borderRadius: 10, border: '1px solid var(--tw-border)', padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 8 }}>Documento de pago</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['boleta', 'factura'] as const).map(tipo => (
                  <button key={tipo} style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${tipo === 'factura' && tieneRUC ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: tipo === 'factura' && tieneRUC ? 'rgba(201,110,75,.08)' : 'var(--tw-bg)', color: tipo === 'factura' && tieneRUC ? 'var(--tw-terra)' : 'var(--tw-text-muted)', fontSize: 11, fontWeight: 600, cursor: tieneRUC ? 'pointer' : 'not-allowed', fontFamily: 'Montserrat, sans-serif', opacity: tipo === 'factura' && !tieneRUC ? 0.5 : 1 }}
                    onClick={() => tipo === 'factura' && !tieneRUC && toast('Agrega tu RUC en Perfil → Empresa', 'info')}>
                    {tipo === 'boleta' ? '🧾 Boleta' : '📄 Factura'}
                    {tipo === 'factura' && !tieneRUC && <span style={{ display: 'block', fontSize: 8, marginTop: 2 }}>Requiere RUC</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Instrucciones de pago */}
          <div style={{ background: 'rgba(201,110,75,.05)', border: '1px solid rgba(201,110,75,.2)', borderRadius: 12, padding: '16px', marginBottom: 16 }}>
            <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: 'var(--tw-terra)' }}>📱 Realiza el pago</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--tw-text-muted)' }}>Yapea a</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#6841b9' }}>{ONE_CONFIG.YAPE_NUMERO}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: 'var(--tw-text-muted)' }}>Cuenta BCP</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'JetBrains Mono, monospace' }}>{ONE_CONFIG.BCP_CUENTA}</span>
            </div>
            <div style={{ height: 1, background: 'var(--tw-border)', margin: '0 0 12px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tw-text)' }}>Monto exacto</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--tw-terra)' }}>{formatCents(subtotalCents)}</span>
            </div>
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a href={`https://wa.me/${ONE_CONFIG.ADMIN_WHATSAPP?.replace(/\s+/g, '')}?text=${pedidoConfirmadoIds.length > 1 ? `Hola%2C%20grupo%20de%20pedidos%20${encodeURIComponent(grupoCheckoutIdConfirmado ?? pedidoConfirmadoId ?? '')}` : `Hola%2C%20pedido%20${encodeURIComponent(pedidoConfirmadoId ?? '')}`}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px', borderRadius: 10, background: '#25D366', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
              💬 Enviar comprobante por WhatsApp
            </a>
            <button onClick={() => setTab('mis_compras')}
              style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Ver seguimiento →
            </button>
            <button onClick={() => { setCarritoVista('items'); setPedidoConfirmadoId(null); setPedidoConfirmadoIds([]); setGrupoCheckoutIdConfirmado(null); setCarritoItems([]) }}
              style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid var(--tw-border)', background: 'transparent', color: 'var(--tw-text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
              Seguir comprando
            </button>
          </div>
        </div>
      )
    }

    // ── Vista pago inline ───────────────────────────────────────────────────
    const caficultoresEnCarrito = [...new Set(carritoItems.map(i => i.producto.caficultorId).filter(Boolean))] as string[]
    // pagoDir solo se guarda si algún caficultor eligió domicilio
    const algunoDomicilio = caficultoresEnCarrito.some(cid => {
      const tipo = pagoTipoEntregaMap[cid] ?? 'agencia'
      const log = carritoLogisticaMap[cid]
      const ag = pagoAgenciaMap[cid] ?? ''
      return tipo === 'domicilio' && !!(log?.agenciasPermiteDomicilio?.[ag])
    })
    const pagoDir = algunoDomicilio
      ? [pagoCalle, pagoDistrito, pagoProvincia].filter(Boolean).join(', ') + (pagoReferencia ? ` (${pagoReferencia})` : '')
      : null
    const envioListo = caficultoresEnCarrito.length === 0 || !Object.keys(carritoLogisticaMap).length
      ? true
      : caficultoresEnCarrito.every(cid => {
          const ag = pagoAgenciaMap[cid]
          if (!ag) return false
          const log = carritoLogisticaMap[cid]
          const tipo = pagoTipoEntregaMap[cid] ?? 'agencia'
          const usaDom = tipo === 'domicilio' && !!(log?.agenciasPermiteDomicilio?.[ag])
          return !usaDom || (pagoCalle.trim().length > 0 && pagoDistrito.trim().length > 0)
        })
    const pagoListo = pagoNombreLocal.trim().length > 0
      && envioListo
      && (pagoMetodo === 'yape' || !!pagoVoucherUrl)

    async function confirmarPagoInline() {
      if (!pagoListo) return
      setPagoConfirmando(true)
      setPagoError(null)
      try {
        const negocioId = usuario?.uid ?? 'demo-user'

        // 1. Agrupar carritoItems por caficultorId
        const porCaficultor = new Map<string, typeof carritoItems>()
        for (const item of carritoItems) {
          const cafId = item.producto.caficultorId ?? 'sin-cafi'
          if (!porCaficultor.has(cafId)) porCaficultor.set(cafId, [])
          porCaficultor.get(cafId)!.push(item)
        }

        // 2. Generar grupoCheckoutId (solo si hay más de 1 caficultor)
        const hayGrupo = porCaficultor.size > 1
        const grupoCheckoutId = hayGrupo ? `grupo-${Date.now()}-${negocioId.slice(0, 6)}` : undefined
        const letras = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

        // 3. Crear un pedido por caficultor
        const pedidoIds: string[] = []
        for (const [idx, [cafId, items]] of [...porCaficultor.entries()].entries()) {
          const subPedidoLetra = hayGrupo ? letras[idx] : undefined
          const log = carritoLogisticaMap[cafId]
          const tipo = pagoTipoEntregaMap[cafId] ?? 'agencia'
          const kg = items.reduce((s, i) => s + i.qty, 0)
          const ag = pagoAgenciaMap[cafId] ?? ''
          let costoCents = 0
          let gratis = false
          if (tipo === 'domicilio') {
            gratis = !!(log?.gratisDomicilioActivo && kg >= (log.gratisDomicilioKg ?? 0))
            costoCents = gratis ? 0 : Math.round((log?.tarifaFijaDomicilioSoles ?? 0) * 100)
          } else {
            gratis = !!(log?.gratisAgenciaActivo && kg >= (log.gratisAgenciaKg ?? 0))
            costoCents = gratis ? 0 : Math.round((log?.tarifaFijaAgenciaSoles ?? 0) * 100)
          }

          const input = {
            negocioId,
            negocioNombre: usuario?.nombre ?? pagoNombreLocal,
            negocioEmail: usuario?.email ?? '',
            negocioTelefono: usuario?.telefono ?? '',
            negocioRazonSocial: usuario?.empresa?.razonSocial || (usuario?.negocio as any)?.razonSocial || undefined,
            negocioRuc: usuario?.empresa?.ruc || (usuario?.negocio as any)?.ruc || undefined,
            nombreLocal: pagoNombreLocal,
            distritoLocal: pagoDistrito,
            items: items.map(l => ({
              productoId: l.producto.id,
              productoNombre: l.producto.nombre,
              caficultorId: l.producto.caficultorId ?? '',
              caficultorNombre: l.producto.caficultorNombre ?? '',
              presentacion: l.formato,
              qty: l.qty,
              unitCents: calcularPrecioFinal(l.producto.precioBaseKgCents, l.formato),
            })),
            metodoPago: pagoMetodo,
            caficultorId: cafId,
            grupoCheckoutId,
            subPedidoLetra,
            direccionEntrega: tipo === 'domicilio' ? (pagoDir ?? undefined) : undefined,
            agencia: tipo === 'agencia' && ag ? ag as import('../types').AgenciaONE : undefined,
            esKitProveedor: false,
            envioDetalle: { [cafId]: { tipo, ...(tipo === 'agencia' && ag ? { agencia: ag } : {}), costoCents, gratis } },
            deliveryCentsOverride: costoCents,
          }
          const id = isDemo ? await demoCreatePedido(input) : await createPedido(input)
          pedidoIds.push(id)
        }

        // 4. Si hay voucher previo, subirlo a todos los pedidos del grupo
        if (pagoVoucherUrl) {
          if (hayGrupo && grupoCheckoutId) {
            if (isDemo) await demoSubirVoucherGrupo(grupoCheckoutId, pagoVoucherUrl)
            else await subirVoucherGrupo(grupoCheckoutId, pagoVoucherUrl)
          } else if (pedidoIds[0]) {
            if (isDemo) await demoSubirVoucher(pedidoIds[0], pagoVoucherUrl)
            else await subirVoucher(pedidoIds[0], pagoVoucherUrl)
          }
        }

        // 5. Guardar IDs y grupo para las vistas de confirmación
        setPedidoConfirmadoIds(pedidoIds)
        setPedidoConfirmadoId(pedidoIds[0] ?? null)
        // ORD-02: fijar expiresAt = ahora + 24h (igual que en service.ts)
        setPedidoConfirmadoExpiresAt(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
        setGrupoCheckoutIdConfirmado(grupoCheckoutId ?? null)
        setCarritoItems([])
        setCarritoVista('espera_pago')
      } catch (e: unknown) {
        setPagoError(e instanceof Error ? e.message : 'Error al crear el pedido. Intenta de nuevo.')
      } finally {
        setPagoConfirmando(false)
      }
    }

    // ── Vista envíos ───────────────────────────────────────────────────────
    if (carritoVista === 'envios') {
      const iStyleSmall: React.CSSProperties = {
        width: '100%', padding: '8px 11px', borderRadius: 7, border: '1px solid var(--tw-border)',
        background: 'var(--tw-bg)', color: 'var(--tw-text)', fontSize: 12,
        fontFamily: 'Montserrat, sans-serif', outline: 'none', boxSizing: 'border-box' as const,
      }

      function applyDireccion(idx: number) {
        const d = direcciones[idx]
        if (!d) return
        setModalDireccionSelIdx(idx)
        if (d.nombre) setPagoNombreLocal(d.nombre)
        setPagoCalle(d.direccion ?? '')
        setPagoDistrito(d.distrito ?? '')
        setPagoProvincia(d.provincia ?? '')
        setPagoReferencia(d.referencia ?? '')
      }

      function guardarNuevaDireccion() {
        if (!newAddrCalle.trim() || !newAddrDistrito.trim()) return
        const nueva: import('../types').DireccionEnvioONE = {
          id: `addr-${Date.now()}`,
          tipo: 'local',
          nombre: newAddrNombre,
          direccion: newAddrCalle,
          distrito: newAddrDistrito,
          provincia: newAddrProvincia,
          departamento: '',
          codigoPostal: '',
          referencia: newAddrReferencia,
          telefono: '',
          esPrincipal: direcciones.length === 0,
        }
        const nuevas = [...direcciones, nueva]
        setDirecciones(nuevas)
        applyDireccion(nuevas.length - 1)
        setNewAddrCalle(''); setNewAddrDistrito(''); setNewAddrProvincia('')
        setNewAddrNombre(''); setNewAddrReferencia('')
        setShowNewAddrForm(false)
        setShowDireccionModal(false)
      }

      const dirActivaTexto = (() => {
        const idx = modalDireccionSelIdx
        if (idx === null || !direcciones[idx]) return pagoCalle ? `${pagoCalle}, ${pagoDistrito}` : null
        const d = direcciones[idx]
        return [d.direccion, d.distrito, d.provincia].filter(Boolean).join(', ')
      })()

      const modalDireccion = showDireccionModal ? (
        <div onClick={e => { if (e.target === e.currentTarget) setShowDireccionModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--tw-card)', borderRadius: 16, width: '90%', maxWidth: 420, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid var(--tw-border)' }}>
              <span style={{ fontSize: 16 }}>📍</span>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif' }}>Selecciona una dirección</span>
              <button onClick={() => setShowDireccionModal(false)}
                style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--tw-border)', background: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--tw-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            {/* Lista */}
            <div style={{ padding: '12px 16px', maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {direcciones.length === 0 && (
                <p style={{ margin: 0, fontSize: 12, color: 'var(--tw-text-muted)', textAlign: 'center', padding: '12px 0' }}>No tienes direcciones guardadas</p>
              )}
              {direcciones.map((d, idx) => {
                const sel = modalDireccionSelIdx === idx
                const texto = [d.direccion, d.distrito, d.provincia].filter(Boolean).join(', ')
                return (
                  <div key={d.id} onClick={() => setModalDireccionSelIdx(idx)}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 10, border: `1px solid ${sel ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: sel ? 'rgba(201,110,75,.04)' : 'transparent', cursor: 'pointer' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${sel ? 'var(--tw-terra)' : 'var(--tw-border)'}`, flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {sel && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--tw-terra)' }} />}
                    </div>
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--tw-text)', lineHeight: 1.5 }}>{texto}</span>
                    <span style={{ fontSize: 11, color: 'var(--tw-text-muted)', textDecoration: 'underline', cursor: 'pointer', whiteSpace: 'nowrap', marginTop: 2 }}
                      onClick={e => { e.stopPropagation(); setDirecciones(prev => prev.filter((_, i) => i !== idx)); if (sel) setModalDireccionSelIdx(null) }}>
                      Eliminar
                    </span>
                  </div>
                )
              })}
            </div>
            {/* Form nueva dirección */}
            {showNewAddrForm && (
              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--tw-border)', display: 'flex', flexDirection: 'column', gap: 7 }}>
                <input style={iStyleSmall} placeholder="Nombre del local (ej. Café La Punta)" value={newAddrNombre} onChange={e => setNewAddrNombre(e.target.value)} />
                <input style={iStyleSmall} placeholder="Calle, número, urbanización" value={newAddrCalle} onChange={e => setNewAddrCalle(e.target.value)} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                  <input style={iStyleSmall} placeholder="Distrito" value={newAddrDistrito} onChange={e => setNewAddrDistrito(e.target.value)} />
                  <input style={iStyleSmall} placeholder="Provincia" value={newAddrProvincia} onChange={e => setNewAddrProvincia(e.target.value)} />
                </div>
                <input style={iStyleSmall} placeholder="Referencia (opcional)" value={newAddrReferencia} onChange={e => setNewAddrReferencia(e.target.value)} />
              </div>
            )}
            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid var(--tw-border)' }}>
              <button onClick={() => setShowNewAddrForm(v => !v)}
                style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--tw-terra)', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                {showNewAddrForm ? '− Cancelar' : '+ Agregar nueva dirección'}
              </button>
              <button onClick={() => {
                if (showNewAddrForm) { guardarNuevaDireccion(); return }
                if (modalDireccionSelIdx !== null) applyDireccion(modalDireccionSelIdx)
                setShowDireccionModal(false)
              }}
                style={{ padding: '9px 22px', borderRadius: 9, background: 'var(--tw-terra)', color: '#fff', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                {showNewAddrForm ? 'Guardar' : 'Seleccionar'}
              </button>
            </div>
          </div>
        </div>
      ) : null

      return (
        <>
          {modalDireccion}
          <div className="carrito-desktop-layout">
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Breadcrumb */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                {([ { label: 'Carrito', step: 'items' }, { label: 'Envío', step: 'envios' }, { label: 'Pago', step: 'pago' }]
              ).map((s, i) => {
                  const active = s.step === 'envios'
                  const done = s.step === 'items'
                  return (
                    <React.Fragment key={s.step}>
                      {i > 0 && <span style={{ color: 'var(--tw-text-muted)', fontSize: 11 }}>›</span>}
                      <button onClick={() => done ? setCarritoVista(s.step as typeof carritoVista) : undefined}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: done ? 'pointer' : 'default', fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: active ? 700 : 500, color: active ? 'var(--tw-terra)' : done ? 'var(--tw-text-muted)' : 'var(--tw-text-muted)', opacity: done || active ? 1 : 0.5 }}>
                        {i + 1} · {s.label}
                      </button>
                    </React.Fragment>
                  )
                })}
              </div>

              {/* Envío por caficultor */}
                {caficultoresEnCarrito.map(cid => {
                  const log = carritoLogisticaMap[cid]
                  const kgEste = carritoItems.filter(i => i.producto.caficultorId === cid).reduce((s, i) => s + i.qty, 0)
                  const nombreCafi = carritoItems.find(i => i.producto.caficultorId === cid)?.producto.caficultorNombre ?? cid
                  const agActiva = pagoAgenciaMap[cid] ?? ''
                  const tipoEntrega = pagoTipoEntregaMap[cid] ?? 'agencia'
                  return (
                    <div key={cid} style={{ background: 'var(--tw-card)', borderRadius: 14, border: '1px solid var(--tw-border)', padding: '18px 20px', marginBottom: 12 }}>
                      {/* Header caficultor */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(143,175,138,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>☕</div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tw-text)' }}>{nombreCafi}</div>
                          <div style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>{kgEste} kg · 1 paquete</div>
                        </div>
                      </div>
                      {!log ? (
                        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(201,110,75,.05)', border: '1px solid rgba(201,110,75,.2)' }}>
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--tw-text-muted)' }}>⚠️ El caficultor aún no configuró sus opciones de envío. El equipo de TunayWasi se contactará contigo para definir la entrega.</p>
                        </div>
                      ) : (
                        <>
                          <p style={{ margin: '0 0 12px', fontSize: 11, color: 'var(--tw-text-muted)' }}>📍 Despacho desde: <span style={{ fontWeight: 600, color: 'var(--tw-text)' }}>{log.origenTexto}</span></p>
                          {/* Dos opciones: Retiro en agencia / Entrega a domicilio */}
                          {(() => {
                            const kgAgencia = log.gratisAgenciaKg ?? 0
                            const kgDomicilio = log.gratisDomicilioKg ?? 0
                            const tarifaAg = log.tarifaFijaAgenciaSoles ?? 0
                            const tarifaDom = log.tarifaFijaDomicilioSoles ?? 0
                            const gratisAgencia = log.gratisAgenciaActivo && kgEste >= kgAgencia
                            const gratisDomicilio = log.gratisDomicilioActivo && kgEste >= kgDomicilio
                            const precioAgencia = gratisAgencia ? 'Gratis' : tarifaAg > 0 ? `S/ ${tarifaAg.toFixed(2)}` : 'Por confirmar'
                            const precioAgenciaColor = gratisAgencia ? 'var(--tw-sage)' : 'var(--tw-terra)'
                            const agenciasActivas = log.agencias.filter(agId => log.agenciasActivas[agId])
                            const hayDomicilio = agenciasActivas.some(agId => log.agenciasPermiteDomicilio[agId])
                            const domicilioDisabled = !hayDomicilio
                            const precioDomicilio = gratisDomicilio ? 'Gratis' : tarifaDom > 0 ? `S/ ${tarifaDom.toFixed(2)}` : 'Por confirmar'
                            const precioDomicilioColor = gratisDomicilio ? 'var(--tw-sage)' : 'var(--tw-terra)'
                            const selAgencia = tipoEntrega === 'agencia'
                            const selDomicilio = tipoEntrega === 'domicilio'
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {/* Opción: Retiro en agencia */}
                                <div style={{ borderRadius: 10, border: `1px solid ${selAgencia ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: selAgencia ? 'rgba(201,110,75,.05)' : 'var(--tw-card)', overflow: 'hidden' }}>
                                  <button onClick={() => setPagoTipoEntregaMap(prev => ({ ...prev, [cid]: 'agencia' }))}
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' as const }}>
                                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${selAgencia ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: selAgencia ? 'var(--tw-terra)' : 'transparent', flexShrink: 0 }} />
                                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--tw-text)' }}>📦 Retiro en agencia</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: precioAgenciaColor }}>{precioAgencia}</span>
                                  </button>
                                  {selAgencia && (
                                    <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                      {agenciasActivas.map(agId => {
                                        const nombre = log.agenciasMap[agId] ?? agId
                                        const activo = agActiva === agId
                                        return (
                                          <button key={agId} onClick={() => {
                                            setPagoAgenciaMap(prev => ({ ...prev, [cid]: agId }))
                                            setPagoCalle(''); setPagoDistrito(''); setPagoProvincia('')
                                          }}
                                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${activo ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: activo ? 'rgba(201,110,75,.08)' : 'rgba(255,255,255,.03)', textAlign: 'left' as const }}>
                                            <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${activo ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: activo ? 'var(--tw-terra)' : 'transparent', flexShrink: 0 }} />
                                            <span style={{ fontSize: 12, fontWeight: activo ? 700 : 500, color: activo ? 'var(--tw-text)' : 'var(--tw-text-muted)' }}>{nombre}</span>
                                          </button>
                                        )
                                      })}
                                      {agActiva && (
                                        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(143,175,138,.06)', border: '1px solid rgba(143,175,138,.2)', marginTop: 2 }}>
                                          <p style={{ margin: 0, fontSize: 11, color: 'var(--tw-text-muted)' }}>El caficultor te notifica cuando tu paquete está listo para recoger.</p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                {/* Opción: Entrega a domicilio */}
                                <div style={{ borderRadius: 10, border: `1px solid ${selDomicilio ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: selDomicilio ? 'rgba(201,110,75,.05)' : domicilioDisabled ? 'rgba(255,255,255,.01)' : 'var(--tw-card)', overflow: 'hidden', opacity: domicilioDisabled ? 0.5 : 1 }}>
                                  <button onClick={() => {
                                    if (domicilioDisabled) return
                                    setPagoTipoEntregaMap(prev => ({ ...prev, [cid]: 'domicilio' }))
                                    const primerAgDom = agenciasActivas.find(agId => log.agenciasPermiteDomicilio[agId])
                                    if (primerAgDom && !agActiva) setPagoAgenciaMap(prev => ({ ...prev, [cid]: primerAgDom }))
                                    const principal = direcciones.find(d => d.esPrincipal) ?? direcciones[0]
                                    if (principal) {
                                      setPagoCalle(principal.direccion ?? '')
                                      setPagoDistrito(principal.distrito ?? '')
                                      setPagoProvincia(principal.provincia ?? '')
                                      setPagoReferencia(principal.referencia ?? '')
                                      if (principal.nombre) setPagoNombreLocal(principal.nombre)
                                    }
                                  }}
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'none', border: 'none', cursor: domicilioDisabled ? 'not-allowed' : 'pointer', textAlign: 'left' as const }}>
                                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${selDomicilio ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: selDomicilio ? 'var(--tw-terra)' : 'transparent', flexShrink: 0 }} />
                                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--tw-text)' }}>🚚 Entrega a domicilio{domicilioDisabled ? ' (no disponible)' : ''}</span>
                                    {!domicilioDisabled && <span style={{ fontSize: 13, fontWeight: 700, color: precioDomicilioColor }}>{precioDomicilio}</span>}
                                  </button>
                                  {selDomicilio && !domicilioDisabled && (
                                    <div style={{ padding: '0 14px 14px' }}>
                                      {agenciasActivas.filter(agId => log.agenciasPermiteDomicilio[agId]).length > 1 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 8 }}>
                                          <p style={{ margin: 0, fontSize: 10, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Vía agencia:</p>
                                          {agenciasActivas.filter(agId => log.agenciasPermiteDomicilio[agId]).map(agId => {
                                            const nombre = log.agenciasMap[agId] ?? agId
                                            const activo = agActiva === agId
                                            return (
                                              <button key={agId} onClick={() => setPagoAgenciaMap(prev => ({ ...prev, [cid]: agId }))}
                                                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${activo ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: activo ? 'rgba(201,110,75,.08)' : 'rgba(255,255,255,.03)', textAlign: 'left' as const }}>
                                                <div style={{ width: 13, height: 13, borderRadius: '50%', border: `2px solid ${activo ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: activo ? 'var(--tw-terra)' : 'transparent', flexShrink: 0 }} />
                                                <span style={{ fontSize: 12, fontWeight: activo ? 700 : 500, color: activo ? 'var(--tw-text)' : 'var(--tw-text-muted)' }}>{nombre}</span>
                                              </button>
                                            )
                                          })}
                                        </div>
                                      )}
                                      {/* Banner dirección activa */}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 9, border: '1px solid var(--tw-border)', background: 'var(--tw-bg)' }}>
                                        <span style={{ fontSize: 14, flexShrink: 0 }}>📍</span>
                                        <span style={{ flex: 1, fontSize: 12, color: 'var(--tw-text)', fontWeight: 500, lineHeight: 1.4 }}>
                                          {dirActivaTexto ?? 'Sin dirección seleccionada'}
                                        </span>
                                        <button onClick={() => { setShowNewAddrForm(false); setShowDireccionModal(true) }}
                                          style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 700, color: 'var(--tw-terra)', textDecoration: 'underline', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Montserrat, sans-serif' }}>
                                          Cambiar
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })()}
                        </>
                      )}
                    </div>
                  )
                })}
              <div style={{ height: 80 }} />
            </div>
            {/* Columna derecha: resumen envíos por caficultor */}
            <div className="carrito-resumen-sticky">
              <div style={{ background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 14, padding: '20px' }}>
                <p style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif' }}>Resumen</p>
                {/* Fila productos */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--tw-border)' }}>
                  <span style={{ color: 'var(--tw-text-muted)' }}>Productos ({totalItems})</span>
                  <span style={{ fontWeight: 700, color: 'var(--tw-text)' }}>{formatCents(subtotalCents)}</span>
                </div>
                {/* Envíos por caficultor */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                    Envíos ({Object.keys(carritoItems.reduce<Record<string, boolean>>((a, i) => { a[i.producto.caficultorId ?? 'x'] = true; return a }, {})).length} paquetes):
                  </div>
                  {Object.entries(
                    carritoItems.reduce<Record<string, { nombre: string; region: string }>>((acc, item) => {
                      const key = item.producto.caficultorId ?? 'sin-cafi'
                      if (!acc[key]) acc[key] = { nombre: item.producto.caficultorNombre ?? 'Caficultor', region: item.producto.caficultorRegion ?? '' }
                      return acc
                    }, {})
                  ).map(([cafiId, cafi]) => {
                    const logR = carritoLogisticaMap[cafiId]
                    const kgR = carritoItems.filter(i => (i.producto.caficultorId ?? 'sin-cafi') === cafiId).reduce((s, i) => s + i.qty, 0)
                    const tipoR = pagoTipoEntregaMap[cafiId] ?? 'agencia'
                    const esGratisDom = tipoR === 'domicilio' && logR?.gratisDomicilioActivo && kgR >= (logR.gratisDomicilioKg ?? 0)
                    const esGratisAg = tipoR === 'agencia' && logR?.gratisAgenciaActivo && kgR >= (logR.gratisAgenciaKg ?? 0)
                    const envioTexto = tipoR === 'domicilio'
                      ? (esGratisDom ? 'Gratis (domicilio)' : logR?.tarifaFijaDomicilioSoles ? `S/ ${logR.tarifaFijaDomicilioSoles} (domicilio)` : 'Por confirmar')
                      : (esGratisAg ? 'Gratis (agencia)' : logR?.tarifaFijaAgenciaSoles ? `S/ ${logR.tarifaFijaAgenciaSoles} (agencia)` : 'Por confirmar')
                    const envioColor = (esGratisDom || esGratisAg) ? 'var(--tw-sage)' : 'var(--tw-text-muted)'
                    return (
                    <div key={cafiId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13 }}>☕</span>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tw-text)' }}>{cafi.nombre}</div>
                          {cafi.region && <div style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>{cafi.region} · Estándar</div>}
                        </div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: envioColor }}>{envioTexto}</span>
                    </div>
                    )
                  })}
                </div>
                {/* Total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--tw-border)', marginBottom: 16 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--tw-text)' }}>Total</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--tw-terra)', fontFamily: 'Cormorant Garamond, serif' }}>{formatCents(subtotalCents)}</span>
                </div>
                <button onClick={() => setCarritoVista('pago')} disabled={!envioListo}
                  style={{ width: '100%', padding: '14px', borderRadius: 11, border: 'none', background: envioListo ? 'var(--tw-terra)' : 'var(--tw-border)', color: envioListo ? '#fff' : 'var(--tw-text-muted)', fontSize: 14, fontWeight: 700, cursor: envioListo ? 'pointer' : 'not-allowed', marginBottom: 8 }}>
                  Continuar → Pago
                </button>
                <p style={{ margin: 0, textAlign: 'center', fontSize: 10, color: 'var(--tw-text-muted)' }}>🔒 Pago seguro via Yape / BCP</p>
              </div>
            </div>
          </div>
          {/* Layout mobile: formulario de envío */}
          <div className="carrito-mobile-layout" style={{ gap: 14, padding: '0 0 80px' }}>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              {([{ label: 'Carrito', step: 'items' as const }, { label: 'Envío', step: 'envios' as const }, { label: 'Pago', step: 'pago' as const }]
              ).map((s, i) => {
                const active = s.step === 'envios'
                const done = s.step === 'items'
                return (
                  <React.Fragment key={s.step}>
                    {i > 0 && <span style={{ color: 'var(--tw-text-muted)', fontSize: 11 }}>›</span>}
                    <button onClick={() => done ? setCarritoVista(s.step) : undefined}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: done ? 'pointer' : 'default', fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: active ? 700 : 500, color: active ? 'var(--tw-terra)' : 'var(--tw-text-muted)', opacity: done ? 1 : active ? 1 : 0.5 }}>
                      {i + 1} · {s.label}
                    </button>
                  </React.Fragment>
                )
              })}
            </div>
            {/* Sección envío por caficultor */}
            <div>
              <h3 style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: 'var(--tw-text)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Envío</h3>
              {caficultoresEnCarrito.map(cid => {
                const log = carritoLogisticaMap[cid]
                const kgEste = carritoItems.filter(i => i.producto.caficultorId === cid).reduce((s, i) => s + i.qty, 0)
                const nombreCafi = carritoItems.find(i => i.producto.caficultorId === cid)?.producto.caficultorNombre ?? cid
                const agActiva = pagoAgenciaMap[cid] ?? ''
                const tipoEntrega = pagoTipoEntregaMap[cid] ?? 'agencia'
                return (
                  <div key={cid} style={{ background: 'var(--tw-card)', borderRadius: 14, border: '1px solid var(--tw-border)', padding: '16px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(143,175,138,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>☕</div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-text)' }}>{nombreCafi}</div>
                        <div style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>{kgEste} kg</div>
                      </div>
                    </div>
                    {!log ? (
                      <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(201,110,75,.05)', border: '1px solid rgba(201,110,75,.2)' }}>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--tw-text-muted)' }}>⚠️ El caficultor aún no configuró sus opciones de envío. Coordinarás el despacho directamente con él.</p>
                      </div>
                    ) : (
                      <>
                        <p style={{ margin: '0 0 8px', fontSize: 10, color: 'var(--tw-text-muted)' }}>📍 <span style={{ fontWeight: 600, color: 'var(--tw-text)' }}>{log.origenTexto}</span></p>
                        {/* Dos opciones: Retiro en agencia / Entrega a domicilio */}
                        {(() => {
                          const kgAgencia = log.gratisAgenciaKg ?? 0
                          const kgDomicilio = log.gratisDomicilioKg ?? 0
                          const tarifaAg = log.tarifaFijaAgenciaSoles ?? 0
                          const tarifaDom = log.tarifaFijaDomicilioSoles ?? 0
                          const gratisAgencia = log.gratisAgenciaActivo && kgEste >= kgAgencia
                          const gratisDomicilio = log.gratisDomicilioActivo && kgEste >= kgDomicilio
                          const precioAgencia = gratisAgencia ? 'Gratis' : tarifaAg > 0 ? `S/ ${tarifaAg.toFixed(2)}` : 'Por confirmar'
                          const precioAgenciaColor = gratisAgencia ? 'var(--tw-sage)' : 'var(--tw-terra)'
                          const agenciasActivas = log.agencias.filter(agId => log.agenciasActivas[agId])
                          const hayDomicilio = agenciasActivas.some(agId => log.agenciasPermiteDomicilio[agId])
                          const domicilioDisabled = !hayDomicilio
                          const precioDomicilio = gratisDomicilio ? 'Gratis' : tarifaDom > 0 ? `S/ ${tarifaDom.toFixed(2)}` : 'Por confirmar'
                          const precioDomicilioColor = gratisDomicilio ? 'var(--tw-sage)' : 'var(--tw-terra)'
                          const selAgencia = tipoEntrega === 'agencia'
                          const selDomicilio = tipoEntrega === 'domicilio'
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                              {/* Opción: Retiro en agencia */}
                              <div style={{ borderRadius: 10, border: `1px solid ${selAgencia ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: selAgencia ? 'rgba(201,110,75,.05)' : 'var(--tw-card)', overflow: 'hidden' }}>
                                <button onClick={() => setPagoTipoEntregaMap(prev => ({ ...prev, [cid]: 'agencia' }))}
                                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' as const }}>
                                  <div style={{ width: 15, height: 15, borderRadius: '50%', border: `2px solid ${selAgencia ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: selAgencia ? 'var(--tw-terra)' : 'transparent', flexShrink: 0 }} />
                                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--tw-text)' }}>📦 Retiro en agencia</span>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: precioAgenciaColor }}>{precioAgencia}</span>
                                </button>
                                {selAgencia && (
                                  <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                                    {agenciasActivas.map(agId => {
                                      const nombre = log.agenciasMap[agId] ?? agId
                                      const activo = agActiva === agId
                                      return (
                                        <button key={agId} onClick={() => {
                                          setPagoAgenciaMap(prev => ({ ...prev, [cid]: agId }))
                                          setPagoCalle(''); setPagoDistrito(''); setPagoProvincia('')
                                        }}
                                          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${activo ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: activo ? 'rgba(201,110,75,.08)' : 'rgba(255,255,255,.03)', textAlign: 'left' as const }}>
                                          <div style={{ width: 13, height: 13, borderRadius: '50%', border: `2px solid ${activo ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: activo ? 'var(--tw-terra)' : 'transparent', flexShrink: 0 }} />
                                          <span style={{ fontSize: 11, fontWeight: activo ? 700 : 500, color: activo ? 'var(--tw-text)' : 'var(--tw-text-muted)' }}>{nombre}</span>
                                        </button>
                                      )
                                    })}
                                    {agActiva && (
                                      <div style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(143,175,138,.06)', border: '1px solid rgba(143,175,138,.2)', marginTop: 2 }}>
                                        <p style={{ margin: 0, fontSize: 10, color: 'var(--tw-text-muted)' }}>El caficultor te notifica cuando tu paquete está listo para recoger.</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              {/* Opción: Entrega a domicilio */}
                              <div style={{ borderRadius: 10, border: `1px solid ${selDomicilio ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: selDomicilio ? 'rgba(201,110,75,.05)' : domicilioDisabled ? 'rgba(255,255,255,.01)' : 'var(--tw-card)', overflow: 'hidden', opacity: domicilioDisabled ? 0.5 : 1 }}>
                                <button onClick={() => {
                                  if (domicilioDisabled) return
                                  setPagoTipoEntregaMap(prev => ({ ...prev, [cid]: 'domicilio' }))
                                  const primerAgDom = agenciasActivas.find(agId => log.agenciasPermiteDomicilio[agId])
                                  if (primerAgDom && !agActiva) setPagoAgenciaMap(prev => ({ ...prev, [cid]: primerAgDom }))
                                  const principal = direcciones.find(d => d.esPrincipal) ?? direcciones[0]
                                  if (principal) {
                                    setPagoCalle(principal.direccion ?? '')
                                    setPagoDistrito(principal.distrito ?? '')
                                    setPagoProvincia(principal.provincia ?? '')
                                    setPagoReferencia(principal.referencia ?? '')
                                    if (principal.nombre) setPagoNombreLocal(principal.nombre)
                                  }
                                }}
                                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', background: 'none', border: 'none', cursor: domicilioDisabled ? 'not-allowed' : 'pointer', textAlign: 'left' as const }}>
                                  <div style={{ width: 15, height: 15, borderRadius: '50%', border: `2px solid ${selDomicilio ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: selDomicilio ? 'var(--tw-terra)' : 'transparent', flexShrink: 0 }} />
                                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--tw-text)' }}>🚚 Entrega a domicilio{domicilioDisabled ? ' (no disponible)' : ''}</span>
                                  {!domicilioDisabled && <span style={{ fontSize: 12, fontWeight: 700, color: precioDomicilioColor }}>{precioDomicilio}</span>}
                                </button>
                                {selDomicilio && !domicilioDisabled && (
                                  <div style={{ padding: '0 12px 12px' }}>
                                    {agenciasActivas.filter(agId => log.agenciasPermiteDomicilio[agId]).length > 1 && (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 7 }}>
                                        <p style={{ margin: 0, fontSize: 9, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Vía agencia:</p>
                                        {agenciasActivas.filter(agId => log.agenciasPermiteDomicilio[agId]).map(agId => {
                                          const nombre = log.agenciasMap[agId] ?? agId
                                          const activo = agActiva === agId
                                          return (
                                            <button key={agId} onClick={() => setPagoAgenciaMap(prev => ({ ...prev, [cid]: agId }))}
                                              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${activo ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: activo ? 'rgba(201,110,75,.08)' : 'rgba(255,255,255,.03)', textAlign: 'left' as const }}>
                                              <div style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${activo ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: activo ? 'var(--tw-terra)' : 'transparent', flexShrink: 0 }} />
                                              <span style={{ fontSize: 11, fontWeight: activo ? 700 : 500, color: activo ? 'var(--tw-text)' : 'var(--tw-text-muted)' }}>{nombre}</span>
                                            </button>
                                          )
                                        })}
                                      </div>
                                    )}
                                    {/* Banner dirección activa */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--tw-border)', background: 'var(--tw-bg)' }}>
                                      <span style={{ fontSize: 13, flexShrink: 0 }}>📍</span>
                                      <span style={{ flex: 1, fontSize: 11, color: 'var(--tw-text)', fontWeight: 500, lineHeight: 1.4 }}>
                                        {dirActivaTexto ?? 'Sin dirección seleccionada'}
                                      </span>
                                      <button onClick={() => { setShowNewAddrForm(false); setShowDireccionModal(true) }}
                                        style={{ background: 'none', border: 'none', fontSize: 11, fontWeight: 700, color: 'var(--tw-terra)', textDecoration: 'underline', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Montserrat, sans-serif' }}>
                                        Cambiar
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })()}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          {/* Barra fija mobile */}
          <div className="carrito-barra-fija">
            <div className="carrito-barra-descuento">✓ Se aplicó el descuento · Envío gratis</div>
            <div className="carrito-barra-main">
              <div className="carrito-barra-precio">
                <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', textDecoration: 'line-through' }}>{formatCents(Math.round(subtotalCents * 1.38))}</div>
                <div><span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 800, color: 'var(--tw-terra)' }}>{formatCents(subtotalCents)}</span></div>
              </div>
              <button onClick={() => setCarritoVista('pago')} disabled={!envioListo} className="carrito-barra-btn">
                Continuar → Pago
                <small>Selecciona tu envío</small>
              </button>
            </div>
          </div>
        </>
      )
    }

    if (carritoVista === 'pago') {

      async function handleVoucherFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setPagoVoucherPreview(URL.createObjectURL(file))
        setPagoSubiendo(true)
        try {
          const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
          const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
          if (isDemo || !cloudName) {
            await new Promise(r => setTimeout(r, 600))
            setPagoVoucherUrl('demo-voucher-url')
          } else {
            const fd = new FormData()
            fd.append('file', file); fd.append('upload_preset', uploadPreset); fd.append('folder', 'one_vouchers')
            const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd })
            const data = await res.json()
            setPagoVoucherUrl(data.secure_url)
          }
        } catch { setPagoVoucherPreview(null) }
        finally { setPagoSubiendo(false) }
      }

      const esB2B = usuario?.rol === 'buyer_b2b'
      const negocio = usuario?.negocio as any
      const rucEmpresa: string = usuario?.empresa?.ruc ?? negocio?.ruc ?? ''
      const razonSocial: string = usuario?.empresa?.razonSocial ?? negocio?.razonSocial ?? negocio?.nombreLocal ?? ''
      const dirFiscal: string = usuario?.empresa?.dirFiscal || negocio?.direccionFiscal || negocio?.direccionLocal || ''
      const tieneRUC = !!rucEmpresa

      const bloqueFacturacionB2B = esB2B ? (
        <>
          {/* Datos fiscales empresa */}
          <div style={{ background: 'var(--tw-card)', borderRadius: 14, border: '1px solid var(--tw-border)', padding: '18px 20px', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--tw-text)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🏢 Datos de facturación</h3>
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(143,175,138,.18)', color: 'var(--tw-sage)', border: '1px solid rgba(143,175,138,.3)' }}>buyer_b2b · RUC verificado</span>
            </div>
            {[
              { lbl: 'RUC', val: rucEmpresa || '—', extra: rucEmpresa ? '✓ validado con SUNAT' : 'Falta configurar', extraColor: rucEmpresa ? 'var(--tw-sage)' : 'var(--tw-terra)' },
              { lbl: 'Razón social', val: razonSocial || '—' },
              { lbl: 'Dirección fiscal', val: dirFiscal || '—' },
              { lbl: 'Comprobante', val: 'Factura electrónica', extra: 'PDF + XML al correo registrado · Válida ante SUNAT' },
            ].map(({ lbl, val, extra, extraColor }) => (
              <div key={lbl} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--tw-border)' }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 90, paddingTop: 2, flexShrink: 0 }}>{lbl}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tw-text)' }}>{val}</span>
                  {extra && <div style={{ fontSize: 9, color: extraColor ?? 'var(--tw-text-muted)', marginTop: 2 }}>{extra}</div>}
                </div>
              </div>
            ))}
            {!tieneRUC && (
              <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(201,110,75,.06)', border: '1px solid rgba(201,110,75,.2)', fontSize: 10, color: 'var(--tw-terra)' }}>
                ⚠️ Agrega tu RUC en <strong>Perfil → Empresa</strong> para que se emita la factura electrónica automáticamente.
              </div>
            )}
          </div>
          {/* Banner factura electrónica */}
          {tieneRUC && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'rgba(143,175,138,.08)', border: '1px solid rgba(143,175,138,.25)', marginBottom: 4 }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>📋</span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-sage)', marginBottom: 2 }}>Factura electrónica automática</div>
                <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', lineHeight: 1.5 }}>
                  Una vez confirmado el pago, TunayWasi emite la factura a nombre de <strong>{razonSocial}</strong> con RUC <strong>{rucEmpresa}</strong>. Recibirás PDF + XML al correo. Válida ante SUNAT.
                </div>
              </div>
            </div>
          )}
        </>
      ) : null

      return (
        <>
          <div className="carrito-desktop-layout">
            {/* Columna izquierda: formulario */}
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Breadcrumb */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                {[{ label: 'Carrito', step: 'items' }, { label: 'Envíos', step: 'envios' }, { label: 'Pago', step: 'pago' }].map((s, i) => {
                  const active = s.step === 'pago'
                  const done = s.step === 'items' || s.step === 'envios'
                  return (
                    <React.Fragment key={s.step}>
                      {i > 0 && <span style={{ color: 'var(--tw-text-muted)', fontSize: 11 }}>›</span>}
                      <button onClick={() => done ? setCarritoVista(s.step as typeof carritoVista) : undefined}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: done ? 'pointer' : 'default', fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: active ? 700 : 500, color: active ? 'var(--tw-terra)' : 'var(--tw-text-muted)', opacity: done ? 1 : active ? 1 : 0.5 }}>
                        {i + 1} · {s.label}
                      </button>
                    </React.Fragment>
                  )
                })}
              </div>

              {/* Bloque B2B: datos fiscales + banner factura */}
              {bloqueFacturacionB2B}

              {/* Método de pago */}
              <div style={{ background: 'var(--tw-card)', borderRadius: 14, border: '1px solid var(--tw-border)', padding: '18px 20px' }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: 'var(--tw-text)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Métodos de pago</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {(['yape', 'transferencia'] as const).map(m => {
                    const activo = pagoMetodo === m
                    return (
                      <button key={m} onClick={() => setPagoMetodo(m)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${activo ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: activo ? 'rgba(201,110,75,.06)' : 'var(--tw-card)', textAlign: 'left' as const, transition: 'all 0.15s' }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${activo ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: activo ? 'var(--tw-terra)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {activo && <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>✓</span>}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tw-text)' }}>{m === 'yape' ? 'Yape' : 'Transferencia'}</div>
                          <div style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>{m === 'yape' ? ONE_CONFIG.YAPE_NUMERO : `BCP · ${ONE_CONFIG.BCP_TITULAR}`}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Instrucciones Yape */}
                {pagoMetodo === 'yape' && (
                  <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(104,65,185,.06)', border: '1px solid rgba(104,65,185,.2)', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 22 }}>📱</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tw-text)' }}>Yape al número</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#6841b9', letterSpacing: '0.08em' }}>{ONE_CONFIG.YAPE_NUMERO}</div>
                        <div style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>A nombre de {ONE_CONFIG.BCP_TITULAR}</div>
                      </div>
                    </div>
                    <div style={{ background: 'rgba(104,65,185,.06)', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#6841b9', marginBottom: 4 }}>📋 Pasos</div>
                      {['Abre Yape → ¡Yapea!', `Escribe: ${ONE_CONFIG.YAPE_NUMERO}`, `Monto exacto del pedido`, 'Toma captura y súbela abajo'].map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < 3 ? 4 : 0 }}>
                          <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#6841b9', color: '#fff', fontSize: 8, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                          <span style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Datos BCP */}
                {pagoMetodo === 'transferencia' && (
                  <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(0,82,165,.05)', border: '1px solid rgba(0,82,165,.2)', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 22 }}>🏦</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tw-text)' }}>Transferencia BCP</div>
                        <div style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>Banco de Crédito del Perú · S/ (soles)</div>
                      </div>
                    </div>
                    {[['Titular', ONE_CONFIG.BCP_TITULAR], ['N° Cuenta', ONE_CONFIG.BCP_CUENTA], ['CCI', ONE_CONFIG.BCP_CCI]].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', borderRadius: 6, marginBottom: 2, background: 'rgba(0,82,165,.03)' }}>
                        <span style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>{k}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'JetBrains Mono, monospace' }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 8, fontSize: 9, color: 'var(--tw-text-muted)', padding: '6px 8px', background: 'rgba(0,82,165,.03)', borderRadius: 6 }}>
                      ⚠️ Incluye el número de pedido en el concepto de la transferencia
                    </div>
                  </div>
                )}

                {/* Drop zone mejorada */}
                <div>
                  <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--tw-text)' }}>
                    {pagoMetodo === 'transferencia' ? 'Comprobante de pago *' : 'Captura de Yape (opcional)'}
                  </p>
                  <input ref={voucherFileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleVoucherFile} />
                  {!pagoVoucherPreview ? (
                    <div onClick={() => voucherFileRef.current?.click()}
                      onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--tw-terra)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(201,110,75,.05)' }}
                      onDragLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--tw-border)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--tw-card)' }}
                      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) { const fakeEvent = { target: { files: [f] } } as unknown as React.ChangeEvent<HTMLInputElement>; handleVoucherFile(fakeEvent) } }}
                      style={{ border: '2px dashed var(--tw-border)', borderRadius: 12, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: 'var(--tw-card)', transition: 'all 0.15s' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📎</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 4 }}>Arrastra el comprobante aquí</div>
                      <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', marginBottom: 10 }}>o haz clic para buscar</div>
                      <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 7, border: '1px solid var(--tw-terra)', color: 'var(--tw-terra)', fontSize: 10, fontWeight: 700 }}>Elegir archivo</div>
                      <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', marginTop: 8 }}>PNG, JPG, PDF · máx 5 MB</div>
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <img src={pagoVoucherPreview} alt="Voucher" style={{ width: '100%', borderRadius: 10, maxHeight: 160, objectFit: 'cover' }} />
                      {pagoSubiendo && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.75)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
                        <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,.3)', borderTop: '3px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        <span style={{ color: '#fff', fontSize: 11, fontWeight: 600 }}>Subiendo...</span>
                      </div>}
                      {!pagoSubiendo && pagoVoucherUrl && <div style={{ position: 'absolute', top: 8, left: 8, padding: '4px 10px', borderRadius: 6, background: '#25a244', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>✓ Listo para enviar</span></div>}
                      <button onClick={() => { setPagoVoucherPreview(null); setPagoVoucherUrl(null) }} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.7)', color: '#fff', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                  )}
                </div>
              </div>

              {pagoError && <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(220,38,38,.1)', border: '1px solid rgba(220,38,38,.3)' }}><p style={{ margin: 0, color: '#ef4444', fontSize: 12 }}>{pagoError}</p></div>}

              <div style={{ height: 80 }} />
            </div>

            {/* Columna derecha: resumen final por región → caficultor */}
            <div className="carrito-resumen-sticky">
              <div style={{ background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 14, padding: '20px' }}>
                <p style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif' }}>Resumen final</p>
                {/* Agrupado por región → caficultor → subtotal + envío */}
                {Object.entries(
                  carritoItems.reduce<Record<string, { cafis: Record<string, { nombre: string; subtotalCents: number }> }>>((acc, item) => {
                    const region = item.producto.caficultorRegion ?? 'Sin región'
                    const cafiKey = item.producto.caficultorId ?? 'sin-cafi'
                    if (!acc[region]) acc[region] = { cafis: {} }
                    if (!acc[region].cafis[cafiKey]) acc[region].cafis[cafiKey] = { nombre: item.producto.caficultorNombre ?? 'Caficultor', subtotalCents: 0 }
                    acc[region].cafis[cafiKey].subtotalCents += calcularPrecioFinal(item.producto.precioBaseKgCents, item.formato) * item.qty
                    return acc
                  }, {})
                ).map(([region, regionData]) => (
                  <div key={region} style={{ marginBottom: 12 }}>
                    {/* Header región */}
                    {region !== 'Sin región' && (
                      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                        📍 {region}
                      </div>
                    )}
                    {/* Caficultores */}
                    {Object.entries(regionData.cafis).map(([cafiId, cafi]) => (
                      <div key={cafiId} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tw-text)' }}>{cafi.nombre}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tw-text)' }}>{formatCents(cafi.subtotalCents)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>Envío {cafi.nombre.split(' ')[0]}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--tw-sage)' }}>Gratis</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                {/* Total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--tw-border)', marginBottom: 16 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--tw-text)' }}>Total</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--tw-terra)', fontFamily: 'Cormorant Garamond, serif' }}>{formatCents(subtotalCents)}</span>
                </div>
                <button onClick={confirmarPagoInline} disabled={!pagoListo || pagoConfirmando}
                  style={{ width: '100%', padding: '14px', borderRadius: 11, border: 'none', background: pagoListo ? 'var(--tw-terra)' : 'var(--tw-border)', color: pagoListo ? '#fff' : 'var(--tw-text-muted)', fontSize: 14, fontWeight: 700, cursor: pagoListo ? 'pointer' : 'not-allowed', marginBottom: 8 }}>
                  {pagoConfirmando ? 'Confirmando...' : `Finalizar compra (${totalItems})`}
                </button>
                <p style={{ margin: 0, textAlign: 'center', fontSize: 10, color: 'var(--tw-text-muted)' }}>🔒 Pago seguro via Yape / BCP</p>
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {['✓ Entrega garantizada', '✓ Pago verificado antes de despachar', '✓ Devolución si el artículo está dañado'].map(t => (
                    <div key={t} style={{ fontSize: 10, color: 'var(--tw-sage)' }}>{t}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Layout mobile: formulario de pago */}
          <div className="carrito-mobile-layout" style={{ gap: 14, padding: '0 0 80px' }}>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              {([{ label: 'Carrito', step: 'items' as const }, { label: 'Envíos', step: 'envios' as const }, { label: 'Pago', step: 'pago' as const }]).map((s, i) => {
                const active = s.step === 'pago'
                const done = s.step === 'items' || s.step === 'envios'
                return (
                  <React.Fragment key={s.step}>
                    {i > 0 && <span style={{ color: 'var(--tw-text-muted)', fontSize: 11 }}>›</span>}
                    <button onClick={() => done ? setCarritoVista(s.step) : undefined}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: done ? 'pointer' : 'default', fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: active ? 700 : 500, color: active ? 'var(--tw-terra)' : 'var(--tw-text-muted)', opacity: done ? 1 : active ? 1 : 0.5 }}>
                      {i + 1} · {s.label}
                    </button>
                  </React.Fragment>
                )
              })}
            </div>
            {/* Bloque B2B: datos fiscales + banner factura (mobile) */}
            {bloqueFacturacionB2B}
            {/* Métodos de pago */}
            <div style={{ background: 'var(--tw-card)', borderRadius: 14, border: '1px solid var(--tw-border)', padding: '16px' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: 'var(--tw-text)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Métodos de pago</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {(['yape', 'transferencia'] as const).map(m => {
                  const activo = pagoMetodo === m
                  return (
                    <button key={m} onClick={() => setPagoMetodo(m)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${activo ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: activo ? 'rgba(201,110,75,.06)' : 'var(--tw-card)', textAlign: 'left' as const }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${activo ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: activo ? 'var(--tw-terra)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {activo && <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>✓</span>}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tw-text)' }}>{m === 'yape' ? 'Yape' : 'Transferencia'}</div>
                        <div style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>{m === 'yape' ? ONE_CONFIG.YAPE_NUMERO : `BCP · ${ONE_CONFIG.BCP_TITULAR}`}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
              {pagoMetodo === 'yape' && (
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(201,110,75,.05)', border: '1px solid rgba(201,110,75,.2)', marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--tw-text-muted)' }}>Yapea a</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--tw-terra)' }}>{ONE_CONFIG.YAPE_NUMERO}</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--tw-text-faint)' }}>A nombre de {ONE_CONFIG.BCP_TITULAR}</div>
                </div>
              )}
              {pagoMetodo === 'transferencia' && (
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--tw-card)', border: '1px solid var(--tw-border)', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-text-muted)', marginBottom: 6 }}>Datos BCP</div>
                  {[['Titular', ONE_CONFIG.BCP_TITULAR], ['N° Cuenta', ONE_CONFIG.BCP_CUENTA], ['CCI', ONE_CONFIG.BCP_CCI]].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--tw-text-faint)' }}>{k}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'JetBrains Mono, monospace' }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <p style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--tw-text-faint)' }}>
                  {pagoMetodo === 'transferencia' ? 'Adjuntar comprobante *' : 'Adjuntar screenshot de Yape (opcional)'}
                </p>
                <input ref={voucherFileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleVoucherFile} />
                {!pagoVoucherPreview ? (
                  <div onClick={() => voucherFileRef.current?.click()} style={{ border: '1px dashed var(--tw-border)', borderRadius: 10, padding: '18px 16px', textAlign: 'center', cursor: 'pointer', background: 'var(--tw-card)' }}>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--tw-text-faint)' }}>📎 Adjuntar comprobante</p>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <img src={pagoVoucherPreview} alt="Voucher" style={{ width: '100%', borderRadius: 10, maxHeight: 140, objectFit: 'cover' }} />
                    {pagoSubiendo && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.7)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#fff', fontSize: 12 }}>Subiendo...</span></div>}
                    {!pagoSubiendo && pagoVoucherUrl && <div style={{ position: 'absolute', top: 8, left: 8, padding: '3px 8px', borderRadius: 6, background: '#25a244' }}><span style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>✓ Subido</span></div>}
                    <button onClick={() => { setPagoVoucherPreview(null); setPagoVoucherUrl(null) }} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.7)', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </div>
                )}
              </div>
              {pagoError && <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(220,38,38,.1)', border: '1px solid rgba(220,38,38,.3)', marginTop: 12 }}><p style={{ margin: 0, color: '#ef4444', fontSize: 12 }}>{pagoError}</p></div>}
            </div>
          </div>
          {/* Barra fija mobile en vista pago */}
          <div className="carrito-barra-fija">
            <div className="carrito-barra-descuento">✓ Se aplicó el descuento · Envío gratis</div>
            <div className="carrito-barra-main">
              <div className="carrito-barra-precio">
                <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', textDecoration: 'line-through' }}>{formatCents(Math.round(subtotalCents * 1.38))}</div>
                <div><span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 800, color: 'var(--tw-terra)' }}>{formatCents(subtotalCents)}</span></div>
              </div>
              <button onClick={confirmarPagoInline} disabled={!pagoListo || pagoConfirmando} className="carrito-barra-btn">
                {pagoConfirmando ? 'Confirmando...' : `Finalizar compra (${totalItems})`}
                <small>Pago seguro via Yape</small>
              </button>
            </div>
          </div>
        </>
      )
    }

    return (
      <>
        {/* ══ DESKTOP: 2 columnas (items+más | resumen sticky) ══ */}
        <div className="carrito-desktop-layout">
          {/* Columna izquierda */}
          <div style={{ minWidth: 0 }}>
            {/* Breadcrumb 3 pasos */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 16 }}>
              {([{ label: 'Carrito', step: 'items' as const }, { label: 'Envíos', step: 'envios' as const }, { label: 'Pago', step: 'pago' as const }]).map((s, i) => {
                const active = carritoVista === s.step
                const vista = carritoVista as string
                const done = (s.step === 'items' && (vista === 'envios' || vista === 'pago')) || (s.step === 'envios' && vista === 'pago')
                return (
                  <React.Fragment key={s.step}>
                    {i > 0 && <span style={{ color: 'var(--tw-text-muted)', fontSize: 11 }}>›</span>}
                    <button
                      onClick={() => done ? setCarritoVista(s.step) : undefined}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: done ? 'pointer' : 'default', fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: active ? 700 : 500, color: active ? 'var(--tw-terra)' : done ? 'var(--tw-text-muted)' : 'var(--tw-text-muted)', opacity: done ? 1 : active ? 1 : 0.5 }}
                    >
                      {i + 1} · {s.label}
                    </button>
                  </React.Fragment>
                )
              })}
            </div>
            {/* Items agrupados por región → caficultor */}
            {Object.entries(
              carritoItems.reduce<Record<string, { cafis: Record<string, { nombre: string; items: { item: typeof carritoItems[0]; idx: number }[] }> }>>((acc, item, idx) => {
                const region = item.producto.caficultorRegion ?? 'Sin región'
                const cafiKey = item.producto.caficultorId ?? 'sin-cafi'
                if (!acc[region]) acc[region] = { cafis: {} }
                if (!acc[region].cafis[cafiKey]) acc[region].cafis[cafiKey] = { nombre: item.producto.caficultorNombre ?? 'Caficultor', items: [] }
                acc[region].cafis[cafiKey].items.push({ item, idx })
                return acc
              }, {})
            ).map(([region, regionData]) => (
              <div key={region}>
                {/* Separador región (solo si tiene datos reales) */}
                {region !== 'Sin región' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 0 4px', marginTop: 12 }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--tw-border)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, fontWeight: 800, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
                      📍 {region}
                      <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: 'rgba(143,175,138,.18)', color: 'var(--tw-sage)' }}>
                        {Object.values(regionData.cafis).reduce((s, c) => s + c.items.length, 0)} items
                      </span>
                    </div>
                    <div style={{ flex: 1, height: 1, background: 'var(--tw-border)' }} />
                  </div>
                )}
                {/* Caficultores en esta región */}
                {Object.entries(regionData.cafis).map(([cafiId, grupo]) => {
                  const logCafi = carritoLogisticaMap[cafiId]
                  const kgCafi = grupo.items.reduce((s, { item }) => s + item.qty, 0)
                  const envioCafiLabel = (() => {
                    if (logCafi?.gratisDomicilioActivo && kgCafi >= (logCafi.gratisDomicilioKg ?? 0)) return [{ texto: '✓ gratis a domicilio', ok: true }]
                    const rows: { texto: string; ok: boolean }[] = []
                    if (logCafi?.gratisAgenciaActivo) rows.push(kgCafi >= (logCafi.gratisAgenciaKg ?? 0)
                      ? { texto: '✓ gratis agencia', ok: true }
                      : { texto: `+${(logCafi.gratisAgenciaKg ?? 0) - kgCafi} kg = gratis agencia`, ok: false })
                    else if (logCafi?.tarifaFijaAgenciaSoles) rows.push({ texto: `S/ ${logCafi.tarifaFijaAgenciaSoles} agencia`, ok: false })
                    if (logCafi?.gratisDomicilioActivo) rows.push({ texto: `+${(logCafi.gratisDomicilioKg ?? 0) - kgCafi} kg = gratis domicilio`, ok: false })
                    else if (logCafi?.tarifaFijaDomicilioSoles && !logCafi?.gratisAgenciaActivo) rows.push({ texto: `S/ ${logCafi.tarifaFijaDomicilioSoles} domicilio`, ok: false })
                    return rows.length > 0 ? rows : null
                  })()
                  return (
                  <div key={cafiId}>
                    {/* Separador caficultor */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 0 2px', marginTop: 4 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(143,175,138,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>☕</div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-text)' }}>{grupo.nombre}</div>
                        <div style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>Caficultor directo</div>
                      </div>
                      {envioCafiLabel !== null
                        ? <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                            {envioCafiLabel.map((n, i) => (
                              <span key={i} style={{ fontSize: 10, whiteSpace: 'nowrap', color: n.ok ? 'var(--tw-sage)' : 'var(--tw-terra)', fontWeight: 600 }}>{n.texto}</span>
                            ))}
                          </div>
                        : null
                      }
                    </div>
                    {/* Items del caficultor */}
                    {grupo.items.map(({ item, idx }) => {
                      const precioCents = calcularPrecioFinal(item.producto.precioBaseKgCents, item.formato)
                      const esB2bAprobado = usuario?.rol === 'buyer_b2b' && usuario?.empresa?.estadoAprobacion === 'APPROVED'
                      const esTypeA = item.producto.productType === 'TYPE_A'
                      const repoActiva = reposicionActiva.has(idx)
                      const CHIPS_DESKTOP = esTypeA
                        ? [{ label: '3 kg', sub: 'Prueba' }, { label: '10 kg', sub: 'Quincenal' }, { label: '25 kg', sub: 'Mensual' }, { label: '50 kg', sub: 'Mayoreo' }]
                        : [{ label: '3 kg', sub: 'Prueba' }, { label: '5 kg', sub: 'Semanal' }, { label: '10 kg', sub: 'Quincenal' }, { label: '15 kg', sub: 'Mensual' }]
                      return (
                        <div key={idx} style={{ borderRadius: 10, border: '1px solid var(--tw-border)', marginBottom: 8, overflow: 'hidden' }}>
                          <div className="carrito-item-row" style={{ border: 'none', borderRadius: 0, marginBottom: 0 }}>
                            <div className="carrito-item-check"><div className="carrito-item-check--checked" /></div>
                            <div className="carrito-item-photo" style={{ background: 'linear-gradient(135deg,#2a1810,#1a0f08)' }}>☕</div>
                            <div style={{ flex: 1, minWidth: 0, padding: '0 12px' }}>
                              <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 600, color: 'var(--tw-text)', lineHeight: 1.35 }}>{item.producto.nombre}</p>
                              <p style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--tw-text-muted)' }}>{item.formato}</p>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--tw-terra)', lineHeight: 1 }}>{formatCents(precioCents * item.qty)}</span>
                                <span style={{ fontSize: 11, color: 'var(--tw-text-muted)', textDecoration: 'line-through' }}>{formatCents(Math.round(precioCents * item.qty * 1.38))}</span>
                                <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(201,110,75,.15)', color: 'var(--tw-terra)', padding: '1px 4px', borderRadius: 3 }}>−28%</span>
                              </div>
                              <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--tw-text-muted)' }}>Ver costo de envío en el siguiente paso</p>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                              <button onClick={() => quitarItem(idx)} style={{ background: 'none', border: 'none', color: 'var(--tw-text-muted)', cursor: 'pointer', fontSize: 15, padding: 2 }}>🗑</button>
                              <div className="carrito-stepper">
                                <button className="carrito-stepper-btn" onClick={() => cambiarQty(idx, -1)}>−</button>
                                <span className="carrito-stepper-val">{item.qty}</span>
                                <button className="carrito-stepper-btn" onClick={() => cambiarQty(idx, +1)}>+</button>
                              </div>
                            </div>
                          </div>
                          {/* Toggle chips + reposición — colapsable */}
                          <button
                            onClick={() => toggleChips(idx)}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 14px', background: 'rgba(255,255,255,.02)', border: 'none', borderTop: '1px solid var(--tw-border)', cursor: 'pointer', color: 'var(--tw-text-muted)' }}
                          >
                            <span style={{ fontSize: 10, fontWeight: 600 }}>{esB2bAprobado ? '📅 ¿Cuánto pedir? · Programar reposición automática' : '📅 ¿Cuánto pedir? Cantidades frecuentes'}</span>
                            <span style={{ fontSize: 10, transform: chipsExpandido.has(idx) ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
                          </button>
                          {chipsExpandido.has(idx) && (
                            <div style={{ padding: '8px 14px 12px', borderTop: '1px solid var(--tw-border)', background: 'rgba(255,255,255,.02)' }}>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: esB2bAprobado ? 10 : 0 }}>
                                {CHIPS_DESKTOP.map(chip => (
                                  <button
                                    key={chip.label}
                                    onClick={() => { const kg = parseInt(chip.label); if (!isNaN(kg)) cambiarQty(idx, kg - item.qty) }}
                                    style={{ padding: '4px 10px', borderRadius: 20, border: `1px solid ${item.qty === parseInt(chip.label) ? 'var(--tw-sage)' : 'var(--tw-border)'}`, background: item.qty === parseInt(chip.label) ? 'rgba(143,175,138,.15)' : 'transparent', color: item.qty === parseInt(chip.label) ? 'var(--tw-sage)' : 'var(--tw-text-muted)', fontSize: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2 }}
                                  >
                                    <span>{chip.label}</span>
                                    <span style={{ fontSize: 8, opacity: 0.7 }}>{chip.sub}</span>
                                  </button>
                                ))}
                              </div>
                              {/* Reposición automática — solo B2B APPROVED */}
                              {esB2bAprobado && (
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={repoActiva}
                                    onChange={() => toggleReposicion(idx)}
                                    style={{ marginTop: 2, accentColor: 'var(--tw-sage)', width: 13, height: 13, flexShrink: 0 }}
                                  />
                                  <span style={{ fontSize: 11, color: 'var(--tw-text-muted)', lineHeight: 1.5 }}>
                                    📅 <strong style={{ color: 'var(--tw-text)' }}>Programar reposición:</strong> Recibir este lote cada 15 días automáticamente con prioridad de tueste.
                                    {esTypeA && (
                                      <span style={{ display: 'block', marginTop: 3, fontSize: 10, color: '#d4a017' }}>
                                        ⚠️ Café verde: no garantizamos el mismo lote en la reposición.
                                      </span>
                                    )}
                                  </span>
                                </label>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
                  })}
              </div>
            ))}
            {masCafesSection}
          </div>

          {/* Columna derecha: resumen sticky */}
          <div className="carrito-resumen-sticky">
            <div style={{ background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 14, padding: '20px' }}>
              <p style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif' }}>Resumen del pedido</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--tw-text-muted)', marginBottom: 6 }}>
                <span>Total de artículos ({totalItems})</span>
                <span style={{ textDecoration: 'line-through' }}>{formatCents(Math.round(subtotalCents * 1.38))}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: 'var(--tw-text-muted)' }}>Descuento de artículo(s)</span>
                <span style={{ fontWeight: 700, color: 'var(--tw-terra)' }}>−{formatCents(Math.round(subtotalCents * 0.38))}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--tw-border)' }}>
                <span style={{ color: 'var(--tw-text-muted)' }}>Envío estimado</span>
                <span style={{ fontWeight: 600, color: todosCafisGratis ? 'var(--tw-sage)' : 'var(--tw-text-muted)' }}>{todosCafisGratis ? 'Gratis a agencia' : 'Por confirmar'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--tw-text)' }}>Total</span>
                <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--tw-terra)', fontFamily: 'Cormorant Garamond, serif' }}>{formatCents(subtotalCents)}</span>
              </div>
              <button
                onClick={() => setCarritoVista('envios')}
                style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}
              >
                Hacer pedido ({totalItems}) →
              </button>
              <p style={{ margin: 0, textAlign: 'center', fontSize: 10, color: 'var(--tw-text-muted)' }}>🔒 Pago seguro via Yape / BCP</p>
            </div>
          </div>
        </div>

        {/* ══ MOBILE: columna única + barra fija inferior ══ */}
        <div className="carrito-mobile-layout">
          {/* Items agrupados por región → caficultor (mobile) */}
          {Object.entries(
            carritoItems.reduce<Record<string, { cafis: Record<string, { nombre: string; items: { item: typeof carritoItems[0]; idx: number }[] }> }>>((acc, item, idx) => {
              const region = item.producto.caficultorRegion ?? 'Sin región'
              const cafiKey = item.producto.caficultorId ?? 'sin-cafi'
              if (!acc[region]) acc[region] = { cafis: {} }
              if (!acc[region].cafis[cafiKey]) acc[region].cafis[cafiKey] = { nombre: item.producto.caficultorNombre ?? 'Caficultor', items: [] }
              acc[region].cafis[cafiKey].items.push({ item, idx })
              return acc
            }, {})
          ).map(([region, regionData]) => (
            <div key={region}>
              {/* Separador región */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 0 3px', marginTop: 10 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--tw-border)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 8, fontWeight: 800, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
                  📍 {region}
                  <span style={{ fontSize: 7, fontWeight: 700, padding: '1px 5px', borderRadius: 20, background: 'rgba(143,175,138,.18)', color: 'var(--tw-sage)' }}>
                    {Object.values(regionData.cafis).reduce((s, c) => s + c.items.length, 0)} items
                  </span>
                </div>
                <div style={{ flex: 1, height: 1, background: 'var(--tw-border)' }} />
              </div>
              {/* Caficultores en esta región */}
              {Object.entries(regionData.cafis).map(([cafiId, grupo]) => {
                const logCafiMob = carritoLogisticaMap[cafiId]
                const kgCafiMob = grupo.items.reduce((s, { item }) => s + item.qty, 0)
                const envioCafiLabelMob = (() => {
                  if (logCafiMob?.gratisDomicilioActivo && kgCafiMob >= (logCafiMob.gratisDomicilioKg ?? 0)) return [{ texto: '✓ gratis a domicilio', ok: true }]
                  const rows: { texto: string; ok: boolean }[] = []
                  if (logCafiMob?.gratisAgenciaActivo) rows.push(kgCafiMob >= (logCafiMob.gratisAgenciaKg ?? 0)
                    ? { texto: '✓ gratis agencia', ok: true }
                    : { texto: `+${(logCafiMob.gratisAgenciaKg ?? 0) - kgCafiMob} kg = ag.`, ok: false })
                  else if (logCafiMob?.tarifaFijaAgenciaSoles) rows.push({ texto: `S/ ${logCafiMob.tarifaFijaAgenciaSoles} ag.`, ok: false })
                  if (logCafiMob?.gratisDomicilioActivo) rows.push({ texto: `+${(logCafiMob.gratisDomicilioKg ?? 0) - kgCafiMob} kg = dom.`, ok: false })
                  else if (logCafiMob?.tarifaFijaDomicilioSoles && !logCafiMob?.gratisAgenciaActivo) rows.push({ texto: `S/ ${logCafiMob.tarifaFijaDomicilioSoles} dom.`, ok: false })
                  return rows.length > 0 ? rows : null
                })()
                return (
                <div key={cafiId}>
                  {/* Separador caficultor */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 0 2px', marginTop: 4 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(143,175,138,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>☕</div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-text)' }}>{grupo.nombre}</div>
                      <div style={{ fontSize: 8, color: 'var(--tw-text-muted)' }}>Caficultor directo</div>
                    </div>
                    {envioCafiLabelMob !== null
                      ? <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                          {envioCafiLabelMob.map((n, i) => (
                            <span key={i} style={{ fontSize: 9, whiteSpace: 'nowrap', color: n.ok ? 'var(--tw-sage)' : 'var(--tw-terra)', fontWeight: 600 }}>{n.texto}</span>
                          ))}
                        </div>
                      : <div style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--tw-text-muted)', whiteSpace: 'nowrap' }}>Ver costo →</div>
                    }
                  </div>
                  {/* Items del caficultor */}
                  {grupo.items.map(({ item, idx }) => {
                    const precioCents = calcularPrecioFinal(item.producto.precioBaseKgCents, item.formato)
                    const esB2bAprobado = usuario?.rol === 'buyer_b2b' && usuario?.empresa?.estadoAprobacion === 'APPROVED'
                    const esTypeA = item.producto.productType === 'TYPE_A'
                    const repoActiva = reposicionActiva.has(idx)
                    const CHIPS_MOB = esTypeA
                      ? [{ label: '3 kg', sub: 'Prueba' }, { label: '10 kg', sub: 'Quin.' }, { label: '25 kg', sub: 'Mens.' }, { label: '50 kg', sub: 'Mayor.' }]
                      : [{ label: '3 kg', sub: 'Prueba' }, { label: '5 kg', sub: 'Sem.' }, { label: '10 kg', sub: 'Quin.' }, { label: '15 kg', sub: 'Mens.' }]
                    return (
                      <div key={idx} style={{ borderRadius: 10, border: '1px solid var(--tw-border)', marginBottom: 8, overflow: 'hidden' }}>
                        <div className="carrito-item-row" style={{ border: 'none', borderRadius: 0, marginBottom: 0 }}>
                          <div className="carrito-item-check carrito-item-check--checked" />
                          <div className="carrito-item-photo" style={{ background: 'linear-gradient(135deg,#2a1810,#1a0f08)', width: 80, height: 80, fontSize: 30 }}>☕</div>
                          <div style={{ flex: 1, minWidth: 0, padding: '0 10px' }}>
                            <p style={{ margin: '0 0 3px', fontSize: 12, fontWeight: 600, color: 'var(--tw-text)', lineHeight: 1.35 }}>{item.producto.nombre}</p>
                            <p style={{ margin: '0 0 5px', fontSize: 10, color: 'var(--tw-text-muted)' }}>{item.formato}</p>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--tw-terra)', lineHeight: 1 }}>{formatCents(precioCents * item.qty)}</span>
                              <span style={{ fontSize: 10, color: 'var(--tw-text-muted)', textDecoration: 'line-through' }}>{formatCents(Math.round(precioCents * item.qty * 1.38))}</span>
                              <span style={{ fontSize: 8, fontWeight: 700, background: 'rgba(201,110,75,.15)', color: 'var(--tw-terra)', padding: '1px 4px', borderRadius: 3 }}>−28%</span>
                            </div>
                            <p style={{ margin: '3px 0 0', fontSize: 9, color: 'var(--tw-text-muted)' }}>Ver costo de envío en el siguiente paso</p>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                            <button onClick={() => quitarItem(idx)} style={{ background: 'none', border: 'none', color: 'var(--tw-text-muted)', cursor: 'pointer', fontSize: 13, padding: 2 }}>🗑</button>
                            <div className="carrito-stepper carrito-stepper--sm">
                              <button className="carrito-stepper-btn" onClick={() => cambiarQty(idx, -1)}>−</button>
                              <span className="carrito-stepper-val">{item.qty}</span>
                              <button className="carrito-stepper-btn" onClick={() => cambiarQty(idx, +1)}>+</button>
                            </div>
                          </div>
                        </div>
                        {/* Toggle chips + reposición — colapsable */}
                        <button
                          onClick={() => toggleChips(idx)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: 'rgba(255,255,255,.02)', border: 'none', borderTop: '1px solid var(--tw-border)', cursor: 'pointer', color: 'var(--tw-text-muted)' }}
                        >
                          <span style={{ fontSize: 9, fontWeight: 600 }}>{esB2bAprobado ? '📅 ¿Cuánto pedir? · Programar reposición automática' : '📅 ¿Cuánto pedir? Cantidades frecuentes'}</span>
                          <span style={{ fontSize: 9, transform: chipsExpandido.has(idx) ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
                        </button>
                        {chipsExpandido.has(idx) && (
                          <div style={{ padding: '7px 12px 9px', borderTop: '1px solid var(--tw-border)', background: 'rgba(255,255,255,.02)' }}>
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: esB2bAprobado ? 8 : 0 }}>
                              {CHIPS_MOB.map(chip => (
                                <button
                                  key={chip.label}
                                  onClick={() => { const kg = parseInt(chip.label); if (!isNaN(kg)) cambiarQty(idx, kg - item.qty) }}
                                  style={{ padding: '3px 8px', borderRadius: 20, border: `1px solid ${item.qty === parseInt(chip.label) ? 'var(--tw-sage)' : 'var(--tw-border)'}`, background: item.qty === parseInt(chip.label) ? 'rgba(143,175,138,.15)' : 'transparent', color: item.qty === parseInt(chip.label) ? 'var(--tw-sage)' : 'var(--tw-text-muted)', fontSize: 9, fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2 }}
                                >
                                  <span>{chip.label}</span>
                                  <span style={{ fontSize: 7, opacity: 0.7 }}>{chip.sub}</span>
                                </button>
                              ))}
                            </div>
                            {esB2bAprobado && (
                              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 7, cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={repoActiva}
                                  onChange={() => toggleReposicion(idx)}
                                  style={{ marginTop: 2, accentColor: 'var(--tw-sage)', width: 12, height: 12, flexShrink: 0 }}
                                />
                                <span style={{ fontSize: 10, color: 'var(--tw-text-muted)', lineHeight: 1.5 }}>
                                  📅 <strong style={{ color: 'var(--tw-text)' }}>Programar reposición:</strong> Recibir este lote cada 15 días automáticamente con prioridad de tueste.
                                  {esTypeA && (
                                    <span style={{ display: 'block', fontSize: 9, color: '#d4a017' }}>⚠️ No garantizamos el mismo lote</span>
                                  )}
                                </span>
                              </label>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )})}
            </div>
          ))}

          {masCafesSection}

          {/* Espacio para que la barra fija no tape el último item */}
          <div style={{ height: 80 }} />
        </div>

        {/* ══ MOBILE: barra fija inferior (siempre visible) ══ */}
        <div className="carrito-barra-fija">
          <div className="carrito-barra-descuento">
            ✓ Se aplicó el descuento · Envío gratis
          </div>
          <div className="carrito-barra-main">
            <div className="carrito-barra-precio">
              <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', textDecoration: 'line-through', lineHeight: 1 }}>{formatCents(Math.round(subtotalCents * 1.38))}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 800, color: 'var(--tw-terra)', lineHeight: 1 }}>{formatCents(subtotalCents)}</span>
                <span style={{ fontSize: 14, color: 'var(--tw-text-muted)', cursor: 'pointer' }}>∧</span>
              </div>
            </div>
            <button
              onClick={() => setCarritoVista('envios')}
              className="carrito-barra-btn"
            >
              Hacer pedido ({totalItems})
              <small>Pago seguro via Yape</small>
            </button>
          </div>
        </div>
      </>
    )
  }

  function renderOfertasNeg() {
    const cardBase: React.CSSProperties = {
      background: 'var(--tw-card)', borderRadius: 12, padding: '14px 16px',
      border: `1px solid var(--tw-border)`, marginBottom: 10,
    }
    const btnPrimary: React.CSSProperties = {
      padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--tw-terra)',
      color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
    }
    const btnBlue: React.CSSProperties = {
      padding: '7px 14px', borderRadius: 8, border: 'none', background: '#3b82f6',
      color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
    }
    const btnGhost: React.CSSProperties = {
      padding: '7px 10px', borderRadius: 8, border: `1px solid var(--tw-border)`,
      background: 'none', color: 'var(--tw-text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
    }

    if (cotizLoading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: 28, height: 28, border: `2px solid var(--tw-terra)`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )
    }

    const activas = cotizaciones.filter(c => c.estado === 'ENVIADA' || c.estado === 'RESPONDIDA' || c.estado === 'CONTRAOFERTA')

    if (activas.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>🤝</p>
          <p style={{ fontSize: 16, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, marginBottom: 8 }}>Sin ofertas activas</p>
          <p style={{ fontSize: 13, color: 'var(--tw-text-muted)' }}>Cuando hagas una oferta a un caficultor aparecerá aquí</p>
        </div>
      )
    }

    return (
      <div>
        {activas.map(cotiz => {
          const ultimaRonda = cotiz.rondas[cotiz.rondas.length - 1]
          const precioKg = ultimaRonda ? (ultimaRonda.precioOfertadoCents / 100).toFixed(2) : '—'
          const totalS = ultimaRonda ? ((ultimaRonda.precioOfertadoCents * ultimaRonda.kgSolicitados) / 100).toFixed(2) : '—'
          const esperandoRespuesta = ultimaRonda?.autorRol === 'buyer_b2b'
          const contraofertaRecibida = cotiz.estado === 'RESPONDIDA'

          function tiempoEnviada(): string {
            const diff = Date.now() - new Date(cotiz.updatedAt).getTime()
            const h = Math.floor(diff / 3600000)
            return h < 1 ? 'hace menos de 1h' : `hace ${h}h`
          }

          return (
            <div key={cotiz.id} style={{ ...cardBase, borderLeft: `3px solid ${contraofertaRecibida ? '#3b82f6' : 'var(--tw-terra)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(201,110,75,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>🌱</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tw-text)' }}>{cotiz.caficultorNombre}</div>
                  <div style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>{cotiz.productoNombre}</div>
                </div>
                {cotiz.estado === 'RESPONDIDA'
                  ? <div style={{ fontSize: 9, color: '#3b82f6', fontWeight: 700 }}>💬 Contraoferta recibida</div>
                  : cotiz.estado === 'CONTRAOFERTA'
                  ? <div style={{ fontSize: 9, color: '#f59e0b', fontWeight: 700 }}>⚡ Contraoferta tuya</div>
                  : <div style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>⏰ Enviada {tiempoEnviada()}</div>
                }
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: contraofertaRecibida ? '#3b82f6' : 'var(--tw-terra)' }}>S/ {precioKg}/kg</span>
                <span style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>· {ultimaRonda?.kgSolicitados ?? '—'} kg</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: 'var(--tw-text)' }}>Total: S/ {totalS}</span>
              </div>
              <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', marginBottom: contraofertaRecibida ? 10 : 8 }}>
                Ronda {cotiz.rondaActual} de 3 · {contraofertaRecibida ? `El caficultor propone S/ ${precioKg}` : 'Esperando respuesta del caficultor'}
                {ultimaRonda?.mensaje ? ` — "${ultimaRonda.mensaje}"` : ''}
              </div>

              {contraofertaRecibida ? (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button style={btnBlue} onClick={() => { setModalCotiz(cotiz); setCotizAccion('aceptar') }}>✅ Aceptar S/ {precioKg}</button>
                  {cotiz.rondaActual < 3 && (
                    <button style={btnPrimary} onClick={() => { setModalCotiz(cotiz); setCotizAccion('contraofertar'); setCotizForm({ kg: String(ultimaRonda?.kgSolicitados ?? ''), precioCents: String((ultimaRonda?.precioOfertadoCents ?? 0) / 100), plazo: ultimaRonda?.plazoEntrega ?? '10 días', mensaje: '' }) }}>↩ Contraofertar</button>
                  )}
                  <button style={btnGhost} onClick={() => { setModalCotiz(cotiz); setCotizAccion('rechazar') }}>✕ Cancelar</button>
                </div>
              ) : (
                esperandoRespuesta && (
                  <div style={{ padding: '7px 10px', background: 'rgba(201,110,75,.05)', border: `1px solid rgba(201,110,75,.12)`, borderRadius: 7, fontSize: 9, color: 'var(--tw-text-muted)' }}>
                    ⏳ El caficultor tiene hasta {cotiz.expiraAt ? new Date(cotiz.expiraAt).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '24h'} para responder
                  </div>
                )
              )}
            </div>
          )
        })}

        {/* Cotizaciones expiradas (aceptadas sin pago en 24h, US-41) */}
        {(() => {
          const expiradas = cotizaciones.filter(c => c.estado === 'EXPIRADA')
          if (expiradas.length === 0) return null
          return (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--tw-text-muted)', marginBottom: 8 }}>
                Ofertas expiradas
              </div>
              {expiradas.map(cotiz => (
                <OrdenExpiradaB2B
                  key={cotiz.id}
                  cotizacion={cotiz}
                  onContactarCaficultor={(_c) => {
                    // Abrir chat con el caficultor
                    setSubTab('mensajes')
                  }}
                  onVerLoteNuevaOferta={async (productoId) => {
                    // US-41: renegociar tras expiración — abrir modal de cotización
                    // con producto y valores pre-rellenos desde la última ronda
                    try {
                      const producto = isDemo
                        ? await demoFetchProducto(productoId)
                        : await fetchProducto(productoId)
                      if (!producto) {
                        toast('Lote no disponible', 'error')
                        setTab('catalogo')
                        return
                      }
                      // Pre-rellenar con los valores de la última ronda
                      const ultimaRonda = cotiz.rondas[cotiz.rondas.length - 1]
                      setNuevaCotizForm({
                        kg:          String(ultimaRonda?.kgSolicitados ?? ''),
                        precioCents: ultimaRonda?.precioOfertadoCents
                          ? String((ultimaRonda.precioOfertadoCents / 100).toFixed(2))
                          : '',
                        plazo:   ultimaRonda?.plazoEntrega ?? '',
                        mensaje: '',
                      })
                      setModalNuevaCotiz(producto)
                    } catch {
                      toast('No se pudo cargar el lote', 'error')
                      setTab('catalogo')
                    }
                  }}
                  onVerCompras={() => setSubTab('pedidos')}
                />
              ))}
            </div>
          )
        })()}

        {/* Modal de acción */}
        {modalCotiz && cotizAccion && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 16 }}>
            <div style={{ background: 'var(--tw-card)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 420, border: `1px solid var(--tw-border)` }}>
              <h3 style={{ margin: '0 0 16px', fontFamily: 'Cormorant Garamond, serif', fontSize: 20, color: 'var(--tw-text)' }}>
                {cotizAccion === 'aceptar' ? '✅ Aceptar oferta' : cotizAccion === 'rechazar' ? '✕ Cancelar oferta' : '↩ Contraofertar'}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--tw-text-muted)', marginBottom: 16 }}>
                {modalCotiz.productoNombre} · {modalCotiz.caficultorNombre}
              </p>

              {cotizAccion === 'contraofertar' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--tw-text-muted)', display: 'block', marginBottom: 4 }}>Kg solicitados</label>
                    <input type="number" value={cotizForm.kg} onChange={e => setCotizForm(f => ({ ...f, kg: e.target.value }))}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: `1px solid var(--tw-border)`, background: 'var(--tw-bg)', color: 'var(--tw-text)', fontSize: 13, fontFamily: 'Montserrat, sans-serif' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--tw-text-muted)', display: 'block', marginBottom: 4 }}>Precio ofertado por kg (S/)</label>
                    <input type="number" step="0.01" value={cotizForm.precioCents} onChange={e => setCotizForm(f => ({ ...f, precioCents: e.target.value }))}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: `1px solid var(--tw-border)`, background: 'var(--tw-bg)', color: 'var(--tw-text)', fontSize: 13, fontFamily: 'Montserrat, sans-serif' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--tw-text-muted)', display: 'block', marginBottom: 4 }}>Plazo de entrega</label>
                    <input type="text" value={cotizForm.plazo} onChange={e => setCotizForm(f => ({ ...f, plazo: e.target.value }))}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: `1px solid var(--tw-border)`, background: 'var(--tw-bg)', color: 'var(--tw-text)', fontSize: 13, fontFamily: 'Montserrat, sans-serif' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--tw-text-muted)', display: 'block', marginBottom: 4 }}>Mensaje (opcional)</label>
                    <textarea rows={2} value={cotizForm.mensaje} onChange={e => setCotizForm(f => ({ ...f, mensaje: e.target.value }))}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: `1px solid var(--tw-border)`, background: 'var(--tw-bg)', color: 'var(--tw-text)', fontSize: 13, fontFamily: 'Montserrat, sans-serif', resize: 'vertical' }} />
                  </div>
                </div>
              )}

              {cotizAccion === 'rechazar' && (
                <p style={{ fontSize: 12, color: 'var(--tw-text-muted)', padding: '10px 12px', background: 'rgba(231,76,60,.06)', borderRadius: 8, border: '1px solid rgba(231,76,60,.15)' }}>
                  La oferta será cancelada. El caficultor recibirá la notificación.
                </p>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button onClick={handleResponderCotizacionNeg} disabled={cotizEnviando}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: cotizAccion === 'rechazar' ? '#e74c3c' : cotizAccion === 'aceptar' ? '#3b82f6' : 'var(--tw-terra)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: cotizEnviando ? 'default' : 'pointer', opacity: cotizEnviando ? 0.6 : 1, fontFamily: 'Montserrat, sans-serif' }}>
                  {cotizEnviando ? 'Enviando...' : cotizAccion === 'aceptar' ? 'Confirmar aceptación' : cotizAccion === 'rechazar' ? 'Cancelar oferta' : 'Enviar contraoferta'}
                </button>
                <button onClick={() => { setModalCotiz(null); setCotizAccion(null) }}
                  style={{ padding: '10px 16px', borderRadius: 8, border: `1px solid var(--tw-border)`, background: 'none', color: 'var(--tw-text-muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                  Volver
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    )
  }

  function renderReclamos() {
    const TIPO_LABELS: Record<TipoReclamo, string> = {
      producto_danado: 'Producto dañado',
      cantidad_incorrecta: 'Cantidad incorrecta',
      producto_incorrecto: 'Producto incorrecto',
      calidad_no_corresponde: 'Calidad no corresponde',
      entrega_tardía: 'Entrega tardía',
      otro: 'Otro',
    }
    const ESTADO_COLOR: Record<string, string> = {
      // v1 (compatibilidad)
      ABIERTO: '#4a90c4',
      EN_REVISION: '#4a90c4',
      ESPERANDO_INFO: '#f59e0b',
      RESUELTO_FAVOR: '#8faf8a',
      RESUELTO_PARCIAL: '#8faf8a',
      CERRADO: '#666',
      // v2.0
      ESCALADO: '#f97316',
      DECISION_PENDIENTE: '#6ea8d4',
      RESOLUCION_COMPRADOR: '#8faf8a',
      RESOLUCION_CAFICULTOR: '#666',
      EJECUCION_FINANCIERA: '#4a90c4',
      RESUELTO_COMPRADOR: '#8faf8a',
      RESUELTO_CAFICULTOR: '#666',
      EJECUCION_FALLIDA: '#ef4444',
    }
    const ESTADO_LABEL: Record<string, string> = {
      // v1 (compatibilidad)
      ABIERTO: 'En revisión',
      EN_REVISION: 'En revisión',
      ESPERANDO_INFO: '⚠ Se necesita tu respuesta',
      RESUELTO_FAVOR: '✅ Resuelto a tu favor',
      RESUELTO_PARCIAL: '✅ Resuelto parcialmente',
      CERRADO: 'Cerrado',
      // v2.0
      ESCALADO: 'En revisión especial',
      DECISION_PENDIENTE: 'Decisión tomada',
      RESOLUCION_COMPRADOR: '✅ A tu favor',
      RESOLUCION_CAFICULTOR: 'Cerrado',
      EJECUCION_FINANCIERA: 'Procesando reembolso',
      RESUELTO_COMPRADOR: '✅ Reembolso aprobado',
      RESUELTO_CAFICULTOR: 'Cerrado sin reembolso',
      EJECUCION_FALLIDA: '⚠ Error en reembolso',
    }

    // ── Pantalla: Nuevo reclamo — Flujo de 4 pasos ───────────────────────────
    if (reclamoPantalla === 'nuevo') {
      const pedidosElegibles = pedidos.filter(p => p.logisticaStatus !== 'preparando')
      const pedidoSelec = pedidos.find(x => x.id === reclamoForm.pedidoId)

      // Mapa de tipos de problema para el stepper (subconjunto simplificado del mockup)
      const PROB_OPCIONES: Array<{ key: TipoReclamo; ico: string; nombre: string; sub: string }> = [
        { key: 'producto_danado',       ico: '📦', nombre: 'Producto dañado',      sub: 'Empaque roto, humedad o deterioro' },
        { key: 'cantidad_incorrecta',   ico: '⚖️', nombre: 'Cantidad incorrecta',  sub: 'Recibí menos kilogramos de lo acordado' },
        { key: 'otro',                  ico: '🚫', nombre: 'No recibí mi pedido',  sub: 'Courier marcó entregado sin recibirlo' },
        { key: 'calidad_no_corresponde',ico: '❓', nombre: 'Otro problema',        sub: 'Describiré el problema en detalles' },
      ]

      // Stepper helper
      const stepCircleStyle = (n: number): React.CSSProperties => ({
        width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 9, fontWeight: 800, flexShrink: 0, transition: '.2s',
        background: n < reclamoPaso ? 'var(--tw-sage)' : n === reclamoPaso ? 'var(--tw-terra)' : 'var(--tw-border)',
        color: n <= reclamoPaso ? '#fff' : 'var(--tw-text-muted)',
      })
      const stepLabelStyle = (n: number): React.CSSProperties => ({
        fontSize: 8, fontWeight: 700, marginTop: 3, whiteSpace: 'nowrap',
        color: n < reclamoPaso ? 'var(--tw-sage)' : n === reclamoPaso ? 'var(--tw-terra)' : 'var(--tw-text-muted)',
        fontFamily: 'Montserrat, sans-serif',
      })
      const stepLineStyle = (n: number): React.CSSProperties => ({
        flex: 1, height: 2, margin: '0 4px', position: 'relative', top: -4,
        background: n < reclamoPaso ? 'var(--tw-sage)' : 'var(--tw-border)',
      })

      const PASO_LABELS = ['Pedido', 'Tipo', 'Evidencia', 'Confirmar']

      const tipoOpcionLabel = PROB_OPCIONES.find(o => o.key === reclamoForm.tipo)

      return (
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 0' }}>

          {/* ── Stepper ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 18 }}>
            {[1, 2, 3, 4].map((n, i) => (
              <React.Fragment key={n}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={stepCircleStyle(n)}>
                    {n < reclamoPaso ? '✓' : n}
                  </div>
                  <div style={stepLabelStyle(n)}>{PASO_LABELS[i]}</div>
                </div>
                {n < 4 && <div style={stepLineStyle(n)} />}
              </React.Fragment>
            ))}
          </div>

          {/* ══════════════════════════════════════════
              PASO 1 — Pedido
          ══════════════════════════════════════════ */}
          {reclamoPaso === 1 && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 19, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 4 }}>Tu pedido</div>
              <div style={{ fontSize: 11, color: 'var(--tw-text-muted)', marginBottom: 14, fontFamily: 'Montserrat, sans-serif' }}>
                {reclamoForm.pedidoId ? 'Este es el pedido desde el que reportas el problema. No es editable.' : 'Selecciona el pedido con el que tuviste un problema.'}
              </div>

              {reclamoForm.pedidoId ? (
                /* Card solo lectura */
                <div style={{ background: 'var(--tw-card)', border: '1.5px solid var(--tw-border)', borderRadius: 11, padding: '12px 14px', marginBottom: 14, position: 'relative' }}>
                  {/* label flotante */}
                  <div style={{ position: 'absolute', top: -9, left: 12, background: 'var(--tw-card)', padding: '0 6px', fontSize: 8, fontWeight: 700, color: 'var(--tw-sage)', letterSpacing: '.06em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif' }}>
                    Pedido confirmado
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 8, background: 'linear-gradient(135deg,#c4a06a,#8b6914)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>☕</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tw-text)', lineHeight: 1.2, fontFamily: 'Montserrat, sans-serif' }}>
                        {pedidoSelec?.items[0]?.productoNombre ?? 'Pedido'}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', marginTop: 2, fontFamily: 'Montserrat, sans-serif' }}>
                        {reclamoForm.caficultorNombre || pedidoSelec?.items[0]?.caficultorNombre || '—'}
                      </div>
                      <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 4, fontSize: 8, fontWeight: 700, background: 'rgba(201,110,75,.1)', color: 'var(--tw-terra)', border: '1px solid rgba(201,110,75,.2)', fontFamily: 'Montserrat, sans-serif' }}>
                          #{reclamoForm.pedidoId.slice(-8)}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 4, fontSize: 8, fontWeight: 700, background: 'rgba(100,149,237,.1)', color: '#6495ed', border: '1px solid rgba(100,149,237,.2)', fontFamily: 'Montserrat, sans-serif' }}>
                          🚚 En tránsito
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid var(--tw-border)', marginTop: 10, paddingTop: 9, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2, fontFamily: 'Montserrat, sans-serif' }}>Producto</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif' }}>{pedidoSelec?.items[0]?.productoNombre ?? '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2, fontFamily: 'Montserrat, sans-serif' }}>Monto</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif' }}>{pedidoSelec ? formatCents(pedidoSelec.totalCents) : '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2, fontFamily: 'Montserrat, sans-serif' }}>Escrow</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-sage)', fontFamily: 'Montserrat, sans-serif' }}>🔒 Retenido</div>
                    </div>
                  </div>
                </div>
              ) : pedidosElegibles.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif', marginBottom: 14 }}>
                  No tienes pedidos. Los reclamos aplican a pedidos en tránsito o entregados.
                </p>
              ) : (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6, fontFamily: 'Montserrat, sans-serif' }}>Pedido relacionado</label>
                  <select value={reclamoForm.pedidoId} onChange={e => setReclamoForm(f => ({ ...f, pedidoId: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--tw-border)', background: 'var(--tw-card)', color: 'var(--tw-text)', fontSize: 13, fontFamily: 'Montserrat, sans-serif', outline: 'none' }}>
                    <option value=''>-- Selecciona un pedido --</option>
                    {pedidosElegibles.map(p => (
                      <option key={p.id} value={p.id}>{p.id.slice(-8)} · {p.items[0]?.caficultorNombre ?? '—'} · {formatCents(p.totalCents)}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                <button onClick={() => setReclamoPantalla('lista')}
                  style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid var(--tw-border)', background: 'transparent', color: 'var(--tw-text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                  Cancelar
                </button>
                <button onClick={() => setReclamoPaso(2)} disabled={!reclamoForm.pedidoId}
                  style={{ padding: '10px 18px', borderRadius: 9, border: 'none', background: !reclamoForm.pedidoId ? '#666' : 'var(--tw-terra)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: !reclamoForm.pedidoId ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════
              PASO 2 — Tipo de problema
          ══════════════════════════════════════════ */}
          {reclamoPaso === 2 && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 19, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 4 }}>¿Qué problema tuviste?</div>
              <div style={{ fontSize: 11, color: 'var(--tw-text-muted)', marginBottom: 14, fontFamily: 'Montserrat, sans-serif' }}>
                Selecciona la categoría más cercana. Podrás añadir detalles en el siguiente paso.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                {PROB_OPCIONES.map(op => (
                  <div key={op.key}
                    onClick={() => setReclamoForm(f => ({ ...f, tipo: op.key }))}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 9, padding: '12px 11px',
                      borderRadius: 10, cursor: 'pointer', transition: 'all .15s',
                      border: reclamoForm.tipo === op.key ? '1.5px solid var(--tw-terra)' : '1.5px solid var(--tw-border)',
                      background: reclamoForm.tipo === op.key ? 'rgba(201,110,75,.07)' : 'var(--tw-card)',
                    }}>
                    <div style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{op.ico}</div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif' }}>{op.nombre}</div>
                      <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', marginTop: 1, fontFamily: 'Montserrat, sans-serif' }}>{op.sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setReclamoPaso(1)}
                  style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid var(--tw-border)', background: 'transparent', color: 'var(--tw-text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                  ← Atrás
                </button>
                <button onClick={() => setReclamoPaso(3)}
                  style={{ padding: '10px 18px', borderRadius: 9, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════
              PASO 3 — Descripción + fotos (placeholder)
          ══════════════════════════════════════════ */}
          {reclamoPaso === 3 && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 19, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 4 }}>Descripción y evidencia</div>
              <div style={{ fontSize: 11, color: 'var(--tw-text-muted)', marginBottom: 14, fontFamily: 'Montserrat, sans-serif' }}>
                Ayúdanos a entender el problema con una descripción clara y fotos.
              </div>

              <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6, fontFamily: 'Montserrat, sans-serif' }}>
                Descripción del problema <span style={{ color: 'var(--tw-terra)' }}>*</span>
              </label>
              <textarea value={reclamoForm.descripcion} onChange={e => setReclamoForm(f => ({ ...f, descripcion: e.target.value }))} rows={4}
                placeholder='Ej: Recibí el empaque roto y el café húmedo. El precinto de seguridad estaba cortado…'
                style={{ width: '100%', background: 'var(--tw-card)', border: '1.5px solid var(--tw-border)', borderRadius: 9, padding: '10px 12px', fontSize: 11, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif', resize: 'vertical', outline: 'none', boxSizing: 'border-box', minHeight: 70 }} />
              <div style={{ fontSize: 9, color: reclamoForm.descripcion.length < 20 ? 'var(--tw-terra)' : 'var(--tw-sage)', textAlign: 'right', marginTop: 3, fontFamily: 'Montserrat, sans-serif' }}>
                {reclamoForm.descripcion.length < 20 ? `Faltan ${20 - reclamoForm.descripcion.length} caracteres más` : `${reclamoForm.descripcion.length} caracteres ✓`}
              </div>

              {/* Hint */}
              <div style={{ marginTop: 9, padding: '8px 10px', background: 'rgba(201,110,75,.05)', border: '1px solid rgba(201,110,75,.15)', borderRadius: 7, fontSize: 9, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>
                💡 Incluye detalles como: estado del empaque, cantidad recibida, señales visibles del problema.
              </div>

              {/* Fotos Cloudinary */}
              <div style={{ marginTop: 14 }}>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6, fontFamily: 'Montserrat, sans-serif' }}>
                  Fotos del problema <span style={{ color: 'var(--tw-terra)' }}>*</span> <span style={{ color: 'var(--tw-text-muted)', fontWeight: 400, textTransform: 'none' }}>(máx. 3)</span>
                </label>
                <input ref={reclamoFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file || reclamoFotos.length >= 3) return
                  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
                  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
                  setReclamoSubiendoFoto(true)
                  try {
                    if (!cloudName || !uploadPreset) {
                      const reader = new FileReader()
                      reader.onload = ev => setReclamoFotos(f => [...f, ev.target?.result as string])
                      reader.readAsDataURL(file)
                    } else {
                      const fd = new FormData()
                      fd.append('file', file)
                      fd.append('upload_preset', uploadPreset)
                      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd })
                      const data = await res.json()
                      if (data.secure_url) setReclamoFotos(f => [...f, data.secure_url])
                    }
                  } catch { /* silencioso */ } finally { setReclamoSubiendoFoto(false) }
                }} />
                {reclamoFotos.length < 3 && (
                  <div onClick={() => !reclamoSubiendoFoto && reclamoFileRef.current?.click()}
                    style={{ border: '1.5px dashed var(--tw-border)', borderRadius: 9, padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, background: 'var(--tw-card)', cursor: reclamoSubiendoFoto ? 'wait' : 'pointer' }}>
                    <span style={{ fontSize: 22 }}>{reclamoSubiendoFoto ? '⏳' : '📷'}</span>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif' }}>
                      {reclamoSubiendoFoto ? 'Subiendo...' : 'Adjuntar foto'}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>JPG / PNG · hasta 10 MB</div>
                  </div>
                )}
                {reclamoFotos.length > 0 && (
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 8 }}>
                    {reclamoFotos.map((url, i) => (
                      <div key={i} style={{ position: 'relative' }}>
                        <img src={url} alt={`foto ${i+1}`} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1.5px solid var(--tw-terra)', display: 'block' }} />
                        <button onClick={() => setReclamoFotos(f => f.filter((_, j) => j !== i))}
                          style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', border: 'none', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 7, fontSize: 9, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif', lineHeight: 1.4 }}>
                  Adjunta fotos claras del problema para agilizar la resolución.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                <button onClick={() => setReclamoPaso(2)}
                  style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid var(--tw-border)', background: 'transparent', color: 'var(--tw-text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                  ← Atrás
                </button>
                <button onClick={() => setReclamoPaso(4)} disabled={reclamoForm.descripcion.length < 20}
                  style={{ padding: '10px 18px', borderRadius: 9, border: 'none', background: reclamoForm.descripcion.length < 20 ? '#666' : 'var(--tw-terra)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: reclamoForm.descripcion.length < 20 ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                  Revisar reclamo →
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════
              PASO 4 — Confirmar y enviar
          ══════════════════════════════════════════ */}
          {reclamoPaso === 4 && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 19, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 4 }}>Revisar y enviar</div>
              <div style={{ fontSize: 11, color: 'var(--tw-text-muted)', marginBottom: 14, fontFamily: 'Montserrat, sans-serif' }}>
                Confirma los datos antes de enviar el reclamo.
              </div>

              {/* Resumen */}
              <div style={{ background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 11, padding: '12px 14px', marginBottom: 12 }}>
                {[
                  { label: 'Pedido',           val: `#${reclamoForm.pedidoId.slice(-8)} · ${pedidoSelec?.items[0]?.productoNombre ?? ''} · ${reclamoForm.caficultorNombre || pedidoSelec?.items[0]?.caficultorNombre || '—'}` },
                  { label: 'Monto',            val: pedidoSelec ? formatCents(pedidoSelec.totalCents) : '—' },
                  { label: 'Tipo de problema', val: tipoOpcionLabel ? `${tipoOpcionLabel.ico} ${tipoOpcionLabel.nombre}` : reclamoForm.tipo },
                  { label: 'Descripción',      val: reclamoForm.descripcion.slice(0, 80) + (reclamoForm.descripcion.length > 80 ? '…' : '') },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '7px 0', borderBottom: '1px solid var(--tw-border)' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', fontFamily: 'Montserrat, sans-serif' }}>{row.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-text)', textAlign: 'right', maxWidth: '60%', fontFamily: 'Montserrat, sans-serif' }}>{row.val}</span>
                  </div>
                ))}
              </div>

              {/* Escrow strip */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'rgba(143,175,138,.07)', border: '1px solid rgba(143,175,138,.22)', borderRadius: 9, padding: '10px 12px', marginBottom: 10 }}>
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>🔒</span>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--tw-sage)', fontFamily: 'Montserrat, sans-serif' }}>El pago quedará retenido en escrow</div>
                  <div style={{ fontSize: 8, color: 'var(--tw-text-muted)', marginTop: 2, lineHeight: 1.4, fontFamily: 'Montserrat, sans-serif' }}>
                    {pedidoSelec ? `${formatCents(pedidoSelec.totalCents)} bloqueados hasta resolver el reclamo · ` : ''}resolución en máx. 7 días hábiles · no se libera al productor mientras esté activo.
                  </div>
                </div>
              </div>

              {/* Warn strip */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'rgba(201,110,75,.06)', border: '1px solid rgba(201,110,75,.2)', borderRadius: 9, padding: '10px 12px', marginBottom: 14 }}>
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>⚠️</span>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--tw-terra)', fontFamily: 'Montserrat, sans-serif' }}>Una vez enviado, el reclamo no se puede cancelar</div>
                  <div style={{ fontSize: 8, color: 'var(--tw-text-muted)', marginTop: 2, lineHeight: 1.4, fontFamily: 'Montserrat, sans-serif' }}>
                    Tu pago quedará retenido hasta resolver el caso (máx. 7 días hábiles). Nuestro equipo de soporte revisará la evidencia y contactará a ambas partes.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setReclamoPaso(3)}
                  style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid var(--tw-border)', background: 'transparent', color: 'var(--tw-text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                  ← Atrás
                </button>
                <button onClick={handleCrearReclamo} disabled={reclamoEnviando}
                  style={{ padding: '11px 20px', borderRadius: 9, border: 'none', background: reclamoEnviando ? '#666' : 'var(--tw-terra)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: reclamoEnviando ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                  {reclamoEnviando ? 'Enviando...' : 'Enviar reclamo →'}
                </button>
              </div>
            </div>
          )}

        </div>
      )
    }

    // ── Pantalla: Detalle de reclamo ──────────────────────────────────────────
    if (reclamoPantalla === 'detalle' && reclamoDetalle) {
      const r = reclamoDetalle
      const estadoCol = ESTADO_COLOR[r.estado] ?? '#666'

      // ── Timeline helpers ──
      const ESTADOS_POST_ABIERTO = new Set(['EN_REVISION', 'ESPERANDO_INFO', 'ESCALADO', 'DECISION_PENDIENTE',
        'RESOLUCION_COMPRADOR', 'RESOLUCION_CAFICULTOR', 'EJECUCION_FINANCIERA',
        'RESUELTO_COMPRADOR', 'RESUELTO_CAFICULTOR', 'EJECUCION_FALLIDA',
        'RESUELTO_FAVOR', 'RESUELTO_PARCIAL', 'CERRADO'])
      const ESTADOS_DECISION = new Set(['DECISION_PENDIENTE', 'RESOLUCION_COMPRADOR', 'RESOLUCION_CAFICULTOR',
        'EJECUCION_FINANCIERA', 'RESUELTO_COMPRADOR', 'RESUELTO_CAFICULTOR',
        'EJECUCION_FALLIDA', 'RESUELTO_FAVOR', 'RESUELTO_PARCIAL', 'CERRADO'])
      const ESTADOS_RESOLUCION_FINAL = new Set(['RESUELTO_COMPRADOR', 'RESUELTO_CAFICULTOR',
        'RESUELTO_FAVOR', 'RESUELTO_PARCIAL', 'CERRADO'])

      const pasoCompletado = (n: number): boolean => {
        if (n <= 2) return true
        if (n === 3) return ESTADOS_POST_ABIERTO.has(r.estado)
        if (n === 4) return ESTADOS_DECISION.has(r.estado)
        if (n === 5) return ESTADOS_RESOLUCION_FINAL.has(r.estado)
        return false
      }
      const pasoActivo = (n: number): boolean => {
        if (n === 3 && !ESTADOS_POST_ABIERTO.has(r.estado)) return true
        if (n === 4 && ESTADOS_POST_ABIERTO.has(r.estado) && !ESTADOS_DECISION.has(r.estado)) return true
        if (n === 5 && ESTADOS_DECISION.has(r.estado) && !ESTADOS_RESOLUCION_FINAL.has(r.estado)) return true
        return false
      }

      const TIMELINE_PASOS = [
        { n: 1, label: 'Reclamo enviado' },
        { n: 2, label: 'Recibido por TunayWasi' },
        { n: 3, label: 'Revisando evidencias' },
        { n: 4, label: 'Decisión del reviewer' },
        { n: 5, label: 'Resolución financiera' },
      ]

      // ── SLA countdown ──
      let slaText: string | null = null
      if (r.createdAt) {
        const created = new Date(r.createdAt)
        const now = new Date()
        const diffMs = now.getTime() - created.getTime()
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        const restantes = Math.max(0, 7 - diffDays)
        if (!ESTADOS_RESOLUCION_FINAL.has(r.estado)) {
          slaText = restantes > 0 ? `${restantes} día${restantes === 1 ? '' : 's'} hábil${restantes === 1 ? '' : 'es'} restante${restantes === 1 ? '' : 's'}` : 'Plazo SLA vencido — escalando'
        }
      }

      return (
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 0' }}>
          <button onClick={() => setReclamoPantalla('lista')} style={{ background: 'none', border: 'none', color: 'var(--tw-terra)', cursor: 'pointer', fontSize: 14, marginBottom: 24, fontFamily: 'Montserrat, sans-serif' }}>
            ← Volver a reclamos
          </button>

          {/* ── Banner ESPERANDO_INFO ── */}
          {r.estado === 'ESPERANDO_INFO' && (
            <div style={{ background: 'rgba(245,158,11,.12)', border: '1.5px solid #f59e0b', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', fontFamily: 'Montserrat, sans-serif' }}>
                ⚠ Se necesita información adicional de tu parte
              </div>
              <div style={{ fontSize: 12, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif', lineHeight: 1.5 }}>
                {r.notaTW ?? 'TunayWasi necesita que aportes más detalles o evidencias para continuar con la revisión de tu reclamo.'}
              </div>
              <a href="https://tunaywasi.com/soporte" target="_blank" rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#f59e0b', fontFamily: 'Montserrat, sans-serif', textDecoration: 'none', marginTop: 2 }}>
                Contactar soporte →
              </a>
            </div>
          )}

          {/* ── Banner EJECUCION_FALLIDA ── */}
          {r.estado === 'EJECUCION_FALLIDA' && (
            <div style={{ background: 'rgba(239,68,68,.1)', border: '1.5px solid #ef4444', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', fontFamily: 'Montserrat, sans-serif' }}>
                ⚠ Error en la ejecución del reembolso
              </div>
              <div style={{ fontSize: 12, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif', lineHeight: 1.5, marginTop: 6 }}>
                Hubo un problema al procesar tu reembolso. Nuestro equipo lo está revisando. Escríbenos a tunaywasi@gmail.com indicando #{r.pedidoRef}.
              </div>
            </div>
          )}

          <div style={{ background: 'var(--tw-card)', borderRadius: 12, padding: 24, border: '1px solid var(--tw-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif', marginBottom: 4 }}>Reclamo #{r.id.slice(-8).toUpperCase()}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif' }}>{TIPO_LABELS[r.tipo]}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span style={{ padding: '4px 12px', borderRadius: 20, background: estadoCol + '22', color: estadoCol, fontSize: 12, fontWeight: 700, fontFamily: 'Montserrat, sans-serif' }}>
                  {ESTADO_LABEL[r.estado] ?? r.estado.replace(/_/g, ' ')}
                </span>
                {slaText && (
                  <span style={{ fontSize: 10, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>
                    ⏱ {slaText}
                  </span>
                )}
              </div>
            </div>

            {/* ── Timeline de 5 pasos ── */}
            <div style={{ marginBottom: 24, padding: '16px 20px', background: 'rgba(255,255,255,.03)', borderRadius: 10, border: '1px solid var(--tw-border)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 14, fontFamily: 'Montserrat, sans-serif' }}>Estado del proceso</div>
              {TIMELINE_PASOS.map((paso, i) => {
                const completado = pasoCompletado(paso.n)
                const activo = pasoActivo(paso.n)
                const circleColor = completado ? '#8faf8a' : activo ? 'var(--tw-terra)' : 'var(--tw-border)'
                const labelColor = completado ? '#8faf8a' : activo ? 'var(--tw-terra)' : 'var(--tw-text-muted)'
                return (
                  <div key={paso.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: circleColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: completado || activo ? '#fff' : 'var(--tw-text-muted)', transition: '.2s' }}>
                        {completado ? '✓' : paso.n}
                      </div>
                      {i < TIMELINE_PASOS.length - 1 && (
                        <div style={{ width: 2, height: 20, background: completado ? '#8faf8a' : 'var(--tw-border)', margin: '3px 0', transition: '.2s' }} />
                      )}
                    </div>
                    <div style={{ paddingTop: 3, paddingBottom: i < TIMELINE_PASOS.length - 1 ? 0 : 0 }}>
                      <div style={{ fontSize: 12, fontWeight: completado || activo ? 700 : 400, color: labelColor, fontFamily: 'Montserrat, sans-serif', lineHeight: 1.3 }}>
                        {paso.label}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {[
                ['Pedido', r.pedidoRef],
                ['Caficultor', r.caficultorNombre],
                ['Fecha', formatFecha(r.createdAt)],
                ['Última actualización', formatFecha(r.updatedAt)],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 13, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif' }}>{val}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Descripción del problema</div>
              <div style={{ fontSize: 14, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif', lineHeight: 1.6, background: '#1a1a1a', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--tw-border)' }}>{r.descripcion}</div>
            </div>

            {r.notaTW && r.estado !== 'ESPERANDO_INFO' && (
              <div style={{ background: '#1a2a1a', borderRadius: 8, padding: '12px 16px', border: '1px solid #2a4a2a', marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#8faf8a', fontFamily: 'Montserrat, sans-serif', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Nota de TunayWasi</div>
                <div style={{ fontSize: 13, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif' }}>{r.notaTW}</div>
              </div>
            )}

            {/* ── Resolución a favor del comprador ── */}
            {(r.estado === 'RESUELTO_COMPRADOR' || r.estado === 'RESOLUCION_COMPRADOR') && (
              <div style={{ background: 'rgba(143,175,138,.1)', borderRadius: 8, padding: '14px 16px', border: '1px solid rgba(143,175,138,.4)', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#8faf8a', fontFamily: 'Montserrat, sans-serif', marginBottom: 6 }}>✅ Resolución a tu favor</div>
                {r.montoReembolsoCents && r.montoReembolsoCents > 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif' }}>
                    Se reembolsarán <strong>{formatCents(r.montoReembolsoCents)}</strong> en 3-5 días hábiles.
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif' }}>
                    Tu reclamo fue resuelto favorablemente. El reembolso será procesado próximamente.
                  </div>
                )}
              </div>
            )}

            {/* ── Resolución a favor del caficultor ── */}
            {(r.estado === 'RESUELTO_CAFICULTOR' || r.estado === 'RESOLUCION_CAFICULTOR') && (
              <div style={{ background: 'rgba(102,102,102,.1)', borderRadius: 8, padding: '14px 16px', border: '1px solid rgba(102,102,102,.3)', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#aaa', fontFamily: 'Montserrat, sans-serif', marginBottom: 6 }}>Reclamo cerrado sin reembolso</div>
                <div style={{ fontSize: 12, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif', lineHeight: 1.6 }}>
                  Si no estás de acuerdo, escríbenos a <strong style={{ color: 'var(--tw-text)' }}>tunaywasi@gmail.com</strong> en las próximas 48h indicando #{r.pedidoRef}.
                </div>
              </div>
            )}

            {/* ── Resolución heredada v1 ── */}
            {r.resolucion && r.estado !== 'RESUELTO_COMPRADOR' && r.estado !== 'RESOLUCION_COMPRADOR'
              && r.estado !== 'RESUELTO_CAFICULTOR' && r.estado !== 'RESOLUCION_CAFICULTOR' && (
              <div style={{ background: '#1a1a2a', borderRadius: 8, padding: '12px 16px', border: '1px solid #2a2a4a' }}>
                <div style={{ fontSize: 11, color: '#4a90c4', fontFamily: 'Montserrat, sans-serif', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Resolución</div>
                <div style={{ fontSize: 13, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif' }}>{r.resolucion.replace(/_/g, ' ')}</div>
                {r.montoReembolsoCents && r.montoReembolsoCents > 0 && (
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#8faf8a', fontFamily: 'Montserrat, sans-serif', marginTop: 4 }}>Reembolso: {formatCents(r.montoReembolsoCents)}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )
    }

    // ── Pantalla: Lista de reclamos ───────────────────────────────────────────
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif' }}>Reclamos y devoluciones</div>
            <div style={{ fontSize: 12, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif', marginTop: 2 }}>TW intermedia y resuelve en ≤48h</div>
          </div>
          <button onClick={() => { setReclamoPantalla('nuevo'); setReclamoPaso(1); setReclamoForm({ pedidoId: '', pedidoRef: '', caficultorId: '', caficultorNombre: '', tipo: 'producto_danado', descripcion: '' }) }}
            style={{ background: 'var(--tw-terra)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
            + Reportar problema
          </button>
        </div>

        {reclamosLoading ? (
          <div style={{ textAlign: 'center', color: 'var(--tw-text-muted)', padding: 40, fontFamily: 'Montserrat, sans-serif' }}>Cargando reclamos...</div>
        ) : reclamos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--tw-text)', marginBottom: 6 }}>Sin reclamos activos</div>
            <div style={{ fontSize: 13 }}>Si tuviste un problema con un pedido, repórtalo aquí y TW lo resolverá.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reclamos.map(r => {
              const estadoCol = ESTADO_COLOR[r.estado] ?? '#666'
              const esActivo = r.estado === 'ABIERTO' || r.estado === 'EN_REVISION' || r.estado === 'ESPERANDO_INFO'
                || r.estado === 'ESCALADO' || r.estado === 'DECISION_PENDIENTE'
                || r.estado === 'RESOLUCION_COMPRADOR' || r.estado === 'RESOLUCION_CAFICULTOR'
                || r.estado === 'EJECUCION_FINANCIERA' || r.estado === 'EJECUCION_FALLIDA'
              const pedidoRel = pedidos.find(p => p.id === r.pedidoId)
              return (
                <div key={r.id} onClick={() => { setReclamoDetalle(r); setReclamoPantalla('detalle') }}
                  style={{ background: 'var(--tw-card)', borderRadius: 12, padding: '16px 20px', border: esActivo ? '1px solid rgba(201,110,75,.4)' : '1px solid var(--tw-border)', borderLeft: esActivo ? '3px solid var(--tw-terra)' : undefined, cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1e1e1e')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--tw-card)')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: esActivo ? 10 : 0 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif', marginBottom: 4 }}>{TIPO_LABELS[r.tipo]}</div>
                      <div style={{ fontSize: 12, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>Pedido {r.pedidoRef} · {r.caficultorNombre} · {formatFecha(r.createdAt)}</div>
                    </div>
                    <span style={{ padding: '4px 12px', borderRadius: 20, background: estadoCol + '22', color: estadoCol, fontSize: 11, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', flexShrink: 0 }}>
                      {ESTADO_LABEL[r.estado] ?? r.estado.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {esActivo && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(201,110,75,.06)', border: '1px solid rgba(201,110,75,.2)', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: 'var(--tw-terra)', fontFamily: 'Montserrat, sans-serif' }}>
                      <span>🔒</span>
                      <span>Escrow retenido{pedidoRel ? ` ${formatCents(pedidoRel.totalCents)}` : ''} · Pago bloqueado hasta resolución · SLA 7 días hábiles</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  function renderMisCompras() {
    const SUB_TABS: { id: SubTab; label: string }[] = [
      { id: 'ofertas',  label: '🤝 Ofertas' },
      { id: 'pedidos',  label: '📦 Pedidos' },
      { id: 'mensajes', label: 'Mensajes' },
      { id: 'resenias', label: 'Reseñas' },
      { id: 'reclamos', label: '⚠️ Reclamos' },
    ]
    const pendientesReseña = pedidos.filter(p => p.logisticaStatus === 'entregado' && !p.calificado && p.recepcionConfirmada).length
    const reclamosAbiertos = reclamos.filter(r =>
      r.estado === 'ABIERTO' || r.estado === 'EN_REVISION' || r.estado === 'ESPERANDO_INFO'
      || r.estado === 'ESCALADO' || r.estado === 'DECISION_PENDIENTE'
      || r.estado === 'RESOLUCION_COMPRADOR' || r.estado === 'RESOLUCION_CAFICULTOR'
      || r.estado === 'EJECUCION_FINANCIERA' || r.estado === 'EJECUCION_FALLIDA'
    ).length

    const tabStyle = (active: boolean): React.CSSProperties => ({
      padding: '8px 16px', borderRadius: 0, border: 'none',
      borderBottom: active ? `2px solid ${'var(--tw-terra)'}` : '2px solid transparent',
      background: 'none', color: active ? 'var(--tw-text)' : 'var(--tw-text-muted)',
      fontSize: 14, fontWeight: active ? 700 : 500, cursor: 'pointer',
      fontFamily: 'Montserrat, sans-serif', whiteSpace: 'nowrap',
    })

    return (
      <div>
        <div className="settings-tabs">
          {SUB_TABS.map(s => (
            <button key={s.id} onClick={() => { setSubTab(s.id); if (s.id === 'reclamos') setReclamoPantalla('lista') }} style={{ ...tabStyle(subTab === s.id), flexShrink: 0 }}>
              {s.label}
              {s.id === 'ofertas' && cotizaciones.filter(c => c.estado === 'ENVIADA' || c.estado === 'RESPONDIDA' || c.estado === 'CONTRAOFERTA').length > 0 && (
                <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 10, background: 'var(--tw-terra)', color: '#fff', fontSize: 10, fontWeight: 700 }}>
                  {cotizaciones.filter(c => c.estado === 'ENVIADA' || c.estado === 'RESPONDIDA' || c.estado === 'CONTRAOFERTA').length}
                </span>
              )}
              {s.id === 'mensajes' && pedidos.length > 0 && (
                <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 10, background: 'var(--tw-terra)', color: '#fff', fontSize: 10, fontWeight: 700 }}>{pedidos.length}</span>
              )}
              {s.id === 'resenias' && pendientesReseña > 0 && (
                <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 10, background: 'var(--tw-warning)', color: '#000', fontSize: 10, fontWeight: 700 }}>{pendientesReseña}</span>
              )}
              {s.id === 'reclamos' && reclamosAbiertos > 0 && (
                <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 10, background: '#e74c3c', color: '#fff', fontSize: 10, fontWeight: 700 }}>{reclamosAbiertos}</span>
              )}
            </button>
          ))}
        </div>
        {subTab === 'ofertas'   && renderOfertasNeg()}
        {subTab === 'pedidos'   && renderPedidos()}
        {subTab === 'mensajes'  && <MensajesTab pedidos={pedidos} cotizaciones={cotizaciones} setPedidoDetalle={setPedidoDetalle} setDetallePedidoTab={setDetallePedidoTab} setSubTab={setSubTab} setTab={setTab} />}
        {subTab === 'resenias'  && renderResenias()}
        {subTab === 'reclamos'  && renderReclamos()}
      </div>
    )
  }

  // ─── Centro de notificaciones (derivado de pedidos + cotizaciones) ──────────

  type NotifItem = { id: string; tipo: 'pedido' | 'pago' | 'oferta' | 'alerta' | 'sistema'; titulo: string; desc: string; ts: number; leida: boolean; accion?: string; pedidoId?: string }

  function generarNotificaciones(): NotifItem[] {
    const items: NotifItem[] = []
    for (const p of pedidos) {
      const ts = new Date(p.updatedAt || p.createdAt).getTime()
      if (p.cancelado && p.cancellationReason === 'PAYMENT_EXPIRED')
        items.push({ id: `exp-${p.id}`, tipo: 'alerta', titulo: '⌛ Orden expirada', desc: `${p.id} — Stock restaurado. Sin cargo.`, ts, leida: notifLeidas.has(`exp-${p.id}`) })
      else if (p.logisticaStatus === 'entregado')
        items.push({ id: `ent-${p.id}`, tipo: 'pedido', titulo: '✅ Pedido entregado', desc: `${p.items[0]?.productoNombre ?? 'Pedido'} llegó a tu local`, ts, leida: notifLeidas.has(`ent-${p.id}`), accion: 'Ver pedido', pedidoId: p.id })
      else if (p.logisticaStatus === 'en_agencia')
        items.push({ id: `cam-${p.id}`, tipo: 'pedido', titulo: '🚚 Pedido en camino', desc: `${p.items[0]?.productoNombre ?? 'Pedido'} fue despachado`, ts, leida: notifLeidas.has(`cam-${p.id}`), accion: 'Ver seguimiento', pedidoId: p.id })
      else if (['verificado','confirmado_auto','confirmado_manual'].includes(p.pagoStatus))
        items.push({ id: `pag-${p.id}`, tipo: 'pago', titulo: '✓ Pago confirmado', desc: `Tu pago para ${p.id} fue verificado`, ts, leida: notifLeidas.has(`pag-${p.id}`), accion: 'Ver pedido', pedidoId: p.id })
      else if (p.pagoStatus === 'rechazado')
        items.push({ id: `rec-${p.id}`, tipo: 'alerta', titulo: '✕ Pago rechazado', desc: `El comprobante de ${p.id} no fue aceptado`, ts, leida: notifLeidas.has(`rec-${p.id}`), accion: 'Contactar soporte', pedidoId: p.id })
    }
    for (const c of cotizaciones) {
      const ts = new Date(c.updatedAt || c.createdAt).getTime()
      if (c.estado === 'RESPONDIDA')
        items.push({ id: `cotiz-${c.id}`, tipo: 'oferta', titulo: '💬 Contraoferta recibida', desc: `${c.caficultorNombre} respondió tu oferta de ${c.productoNombre}`, ts, leida: notifLeidas.has(`cotiz-${c.id}`), accion: 'Ver oferta' })
      else if (c.estado === 'CONTRAOFERTA')
        items.push({ id: `cotiz-co-${c.id}`, tipo: 'oferta', titulo: '⚡ Contraoferta tuya', desc: `Esperando respuesta del caficultor para ${c.productoNombre}`, ts, leida: notifLeidas.has(`cotiz-co-${c.id}`), accion: 'Ver oferta' })
      else if (c.estado === 'ACEPTADA')
        items.push({ id: `cotiz-ac-${c.id}`, tipo: 'oferta', titulo: '✅ Cotización aceptada', desc: `Tu oferta para ${c.productoNombre} fue aceptada`, ts, leida: notifLeidas.has(`cotiz-ac-${c.id}`) })
    }
    return items.sort((a, b) => b.ts - a.ts)
  }

  function renderPerfilB2C() {
    const cons = (usuario as any)?.consumidor as { nombre?: string; dni?: string; telefono?: string } | undefined
    const inputSt: React.CSSProperties = {
      width: '100%', background: 'var(--tw-card)', border: '1px solid var(--tw-border)',
      borderRadius: 7, padding: '8px 11px', fontSize: 12, color: 'var(--tw-text)',
      fontFamily: 'Montserrat, sans-serif', outline: 'none', boxSizing: 'border-box',
    }
    const sTitle: React.CSSProperties = { fontFamily: 'Cormorant Garamond, serif', fontSize: 14, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--tw-border)' }
    const fLabel: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: 'var(--tw-text-muted)', marginBottom: 3 }
    const notifToggle = (key: keyof typeof notifNeg, label: string, sub?: string) => (
      <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--tw-border)' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tw-text)' }}>{label}</div>
          {sub && <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', marginTop: 1 }}>{sub}</div>}
        </div>
        <div onClick={() => setNotifNeg(p => ({ ...p, [key]: !p[key] }))}
          style={{ width: 36, height: 20, borderRadius: 10, flexShrink: 0, cursor: 'pointer', position: 'relative', background: notifNeg[key] ? 'var(--tw-terra)' : 'var(--tw-border)' }}>
          <div style={{ position: 'absolute', top: 2, borderRadius: '50%', width: 16, height: 16, background: '#fff', left: notifNeg[key] ? 'calc(100% - 18px)' : 2, transition: 'left 0.15s' }} />
        </div>
      </div>
    )

    const DEPTOS_B2C = ['Lima', 'Arequipa', 'Cusco', 'La Libertad', 'Lambayeque', 'Piura', 'Junín', 'Callao', 'Áncash', 'Cajamarca', 'Ica', 'San Martín']
    const tabsSt = (id: typeof perfilB2CTab): React.CSSProperties => ({
      padding: '8px 16px', border: 'none', borderBottom: perfilB2CTab === id ? '2px solid var(--tw-terra)' : '2px solid transparent',
      background: 'none', color: perfilB2CTab === id ? 'var(--tw-text)' : 'var(--tw-text-muted)',
      fontSize: 13, fontWeight: perfilB2CTab === id ? 700 : 500, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', whiteSpace: 'nowrap',
    })

    return (
      <div>
        {/* Hero B2C */}
        <div style={{ background: 'var(--tw-card)', borderRadius: 14, padding: '20px', marginBottom: 16, border: '1px solid var(--tw-border)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--tw-terra)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {nombreUsuario.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 700, fontFamily: 'Cormorant Garamond, serif', color: 'var(--tw-text)' }}>{cons?.nombre ?? nombreUsuario}</h2>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--tw-text-muted)' }}>Cliente consumidor · TunayWasi</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--tw-terra)', fontFamily: 'Cormorant Garamond, serif' }}>{pedidos.length}</div>
            <div style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>pedidos</div>
          </div>
        </div>

        {/* Panel "¿Eres negocio?" */}
        <div style={{ background: 'rgba(201,110,75,.05)', border: '1px solid rgba(201,110,75,.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tw-terra)' }}>¿Tienes una cafetería o restaurante?</div>
            <div style={{ fontSize: 11, color: 'var(--tw-text-muted)', marginTop: 2 }}>Accede a precios mayoristas y cotizaciones directas con caficultores</div>
          </div>
          <button onClick={() => toast('Próximamente: registro B2B', 'info')} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', flexShrink: 0 }}>
            Registrar mi empresa →
          </button>
        </div>

        {/* Tabs */}
        <div className="settings-tabs" style={{ marginBottom: 20 }}>
          {(['personal', 'direcciones', 'notificaciones', 'seguridad'] as const).map(id => {
            const labels: Record<string, string> = { personal: '👤 Personal', direcciones: '📍 Direcciones', notificaciones: '🔔 Notificaciones', seguridad: '🔒 Seguridad' }
            return <button key={id} style={{ ...tabsSt(id), flexShrink: 0 }} onClick={() => setPerfilB2CTab(id)}>{labels[id]}</button>
          })}
        </div>

        {perfilB2CTab === 'personal' && (
          <div style={{ maxWidth: 480 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={sTitle}>Datos personales</div>
              <div style={{ marginBottom: 10 }}>
                <div style={fLabel}>Nombre completo</div>
                <input style={inputSt} defaultValue={cons?.nombre ?? nombreUsuario} placeholder="Tu nombre" />
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={fLabel}>DNI <span style={{ marginLeft: 6, padding: '1px 7px', borderRadius: 4, background: 'rgba(143,175,138,.15)', color: 'var(--tw-sage)', fontSize: 9, fontWeight: 700 }}>✓ Verificado</span></div>
                <input style={{ ...inputSt, opacity: 0.6 }} defaultValue={cons?.dni ?? ''} placeholder="12345678" disabled />
                <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', marginTop: 3 }}>El DNI no se puede modificar una vez verificado.</div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={fLabel}>Teléfono / WhatsApp</div>
                <input style={inputSt} type="tel" defaultValue={cons?.telefono ?? ''} placeholder="+51 987 654 321" />
              </div>
              <div>
                <div style={fLabel}>Email</div>
                <input style={{ ...inputSt, opacity: 0.6 }} defaultValue={(usuario as any)?.email ?? ''} placeholder="correo@gmail.com" disabled />
                <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', marginTop: 3 }}>Para cambiar el email ve a Seguridad.</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--tw-border)', background: 'transparent', color: 'var(--tw-text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Cancelar</button>
              <button onClick={() => toast('Perfil actualizado', 'ok')} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Guardar cambios</button>
            </div>
          </div>
        )}

        {perfilB2CTab === 'direcciones' && (() => {
          const DEPTOS_EV = DEPTOS_B2C
          const puedeAgregar = direcciones.length < 3
          return (
            <div style={{ maxWidth: 480 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={sTitle}>Mis direcciones <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--tw-text-muted)' }}>(máx. 3)</span></div>
                {puedeAgregar
                  ? <button onClick={() => { setDirFormEditar(undefined); setDirFormNombre(''); setDirFormDir(''); setDirFormDistrito(''); setDirFormProvincia(''); setDirFormDpto('Lima'); setDirFormRef(''); setDirFormTel(''); setDirFormPrincipal(false); setDirFormAbierto(true) }} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>+ Agregar</button>
                  : <span style={{ fontSize: 10, color: 'var(--tw-text-muted)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--tw-border)' }}>Límite 3</span>}
              </div>
              {!dirFormAbierto && (
                <>
                  {direcciones.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--tw-text-muted)' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📍</div>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>Sin direcciones guardadas</div>
                      <div style={{ fontSize: 11 }}>Agrega hasta 3 direcciones de envío</div>
                    </div>
                  )}
                  {direcciones.map((dir, idx) => (
                    <div key={dir.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px', marginBottom: 8, borderRadius: 10, border: `1px solid ${dir.esPrincipal ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: dir.esPrincipal ? 'rgba(201,110,75,.03)' : 'var(--tw-card)', cursor: 'pointer' }}
                      onClick={() => { const updated = direcciones.map((d, i) => ({ ...d, esPrincipal: i === idx })); setDirecciones(updated); updateDireccionesNegocio(usuarioId, updated).catch(() => null) }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${dir.esPrincipal ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: dir.esPrincipal ? 'var(--tw-terra)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                        {dir.esPrincipal && <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tw-text)' }}>{dir.nombre || dir.direccion}</div>
                        <div style={{ fontSize: 11, color: 'var(--tw-text-muted)', marginTop: 2 }}>{dir.direccion}</div>
                        <div style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>{[dir.distrito, dir.departamento].filter(Boolean).join(', ')}</div>
                        {dir.esPrincipal && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--tw-terra)', marginTop: 4, display: 'inline-block' }}>★ Principal</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={e => { e.stopPropagation(); setDirFormEditar(dir); setDirFormNombre(dir.nombre); setDirFormDir(dir.direccion); setDirFormDistrito(dir.distrito); setDirFormProvincia(dir.provincia); setDirFormDpto(dir.departamento); setDirFormRef(dir.referencia); setDirFormTel(dir.telefono); setDirFormPrincipal(dir.esPrincipal); setDirFormAbierto(true) }} style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid var(--tw-border)', background: 'transparent', color: 'var(--tw-text-muted)', fontSize: 10, cursor: 'pointer' }}>Editar</button>
                        {!dir.esPrincipal && <button onClick={async e => { e.stopPropagation(); const u = direcciones.filter(d => d.id !== dir.id); setDirecciones(u); await updateDireccionesNegocio(usuarioId, u).catch(() => null) }} style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid rgba(239,68,68,.3)', background: 'transparent', color: '#ef4444', fontSize: 10, cursor: 'pointer' }}>×</button>}
                      </div>
                    </div>
                  ))}
                  {puedeAgregar && direcciones.length > 0 && (
                    <button onClick={() => { setDirFormEditar(undefined); setDirFormNombre(''); setDirFormDir(''); setDirFormDistrito(''); setDirFormProvincia(''); setDirFormDpto('Lima'); setDirFormRef(''); setDirFormTel(''); setDirFormPrincipal(false); setDirFormAbierto(true) }}
                      style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px dashed var(--tw-terra)', background: 'transparent', color: 'var(--tw-terra)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', marginTop: 8 }}>
                      + Agregar dirección
                    </button>
                  )}
                </>
              )}
              {dirFormAbierto && (
                <div>
                  <button onClick={() => setDirFormAbierto(false)} style={{ background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', color: 'var(--tw-terra)', marginBottom: 14, padding: 0, fontFamily: 'Montserrat, sans-serif' }}>‹ Volver</button>
                  <div style={sTitle}>{dirFormEditar ? 'Editar dirección' : 'Nueva dirección'}</div>
                  <div style={{ marginBottom: 10 }}><div style={fLabel}>Alias</div><input value={dirFormNombre} onChange={e => setDirFormNombre(e.target.value)} style={inputSt} placeholder="Casa, Trabajo..." /></div>
                  <div style={{ marginBottom: 10 }}><div style={fLabel}>Dirección *</div><input value={dirFormDir} onChange={e => setDirFormDir(e.target.value)} style={inputSt} placeholder="Av. Los Olivos 234" /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                    <div><div style={fLabel}>Distrito *</div><input value={dirFormDistrito} onChange={e => setDirFormDistrito(e.target.value)} style={inputSt} placeholder="Miraflores" /></div>
                    <div><div style={fLabel}>Ciudad</div><input value={dirFormProvincia} onChange={e => setDirFormProvincia(e.target.value)} style={inputSt} placeholder="Lima" /></div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={fLabel}>Departamento</div>
                    <select value={dirFormDpto} onChange={e => setDirFormDpto(e.target.value)} style={{ ...inputSt, cursor: 'pointer' }}>
                      {DEPTOS_EV.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: 16 }}><div style={fLabel}>Referencia</div><input value={dirFormRef} onChange={e => setDirFormRef(e.target.value)} style={inputSt} placeholder="Frente al parque" /></div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setDirFormAbierto(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 9, border: '1px solid var(--tw-border)', background: 'transparent', color: 'var(--tw-text-muted)', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                    <button onClick={async () => {
                      if (!dirFormDir.trim() || !dirFormDistrito.trim()) return
                      const nueva: DireccionEnvioONE = { id: dirFormEditar?.id ?? `dir-${Date.now()}`, tipo: dirFormTipo || 'domicilio', nombre: dirFormNombre, direccion: dirFormDir, distrito: dirFormDistrito, provincia: dirFormProvincia, departamento: dirFormDpto, codigoPostal: '', referencia: dirFormRef, telefono: dirFormTel, esPrincipal: dirFormPrincipal }
                      const updated = (() => { const idx = direcciones.findIndex(x => x.id === nueva.id); let arr = idx >= 0 ? direcciones.map(x => x.id === nueva.id ? nueva : x) : [...direcciones, nueva]; if (nueva.esPrincipal) arr = arr.map(x => x.id === nueva.id ? x : { ...x, esPrincipal: false }); return arr })()
                      setDirecciones(updated); setDirFormAbierto(false)
                      await updateDireccionesNegocio(usuarioId, updated).catch(() => null)
                      toast(dirFormEditar ? 'Dirección actualizada' : 'Dirección guardada', 'ok')
                    }} style={{ flex: 2, padding: '10px 0', borderRadius: 9, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      {dirFormEditar ? 'Guardar cambios' : 'Guardar dirección'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {perfilB2CTab === 'notificaciones' && (
          <div>
            {/* Centro de notificaciones en tiempo real */}
            <NotificacionesNegocio
              negocioId={usuarioId}
              demo={isDemo}
              inline={true}
              onNavigatePedido={pedidoId => { setPedidoDetalle(pedidos.find(p => p.id === pedidoId) ?? null); setSubTab('pedidos'); setTab('mis_compras') }}
              onNavigateCotizacion={() => { setSubTab('ofertas'); setTab('mis_compras') }}
              onNavigateProducto={() => setTab('catalogo')}
            />
            {/* Preferencias */}
            <div style={{ maxWidth: 540, marginTop: 24 }}>
              <div style={sTitle}>Preferencias de canal</div>
              <div style={{ marginBottom: 20 }}>
                {notifToggle('pagoConfirmado', 'Pago confirmado', 'Cuando el caficultor verifica tu voucher')}
                {notifToggle('pedidoEnCamino', 'Pedido en camino', 'Cuando el caficultor despacha')}
                {notifToggle('pedidoEntregado', 'Pedido entregado', 'Confirmación de recepción')}
                {notifToggle('recordatorioVoucher', 'Recordatorio voucher', 'Pago pendiente por más de 24h')}
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={sTitle}>Canal</div>
                {notifToggle('email', 'Email')}
                {notifToggle('push', 'Push (app Android)')}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => toast('Preferencias guardadas', 'ok')} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Guardar</button>
              </div>
            </div>
          </div>
        )}

        {perfilB2CTab === 'seguridad' && (
          <div style={{ maxWidth: 480 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={sTitle}>Contraseña</div>
              <div style={{ marginBottom: 10 }}><div style={fLabel}>Contraseña actual</div><input style={inputSt} type="password" placeholder="••••••••" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div><div style={fLabel}>Nueva contraseña</div><input style={inputSt} type="password" placeholder="Mínimo 8 caracteres" /></div>
                <div><div style={fLabel}>Confirmar</div><input style={inputSt} type="password" placeholder="Repetir" /></div>
              </div>
              <button onClick={() => toast('Próximamente: cambiar contraseña', 'info')} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Cambiar contraseña</button>
            </div>
            <div style={{ marginTop: 24 }}>
              <button onClick={() => { void cerrarSesion() }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(239,68,68,.2)', background: 'rgba(239,68,68,.04)', color: '#e74c3c', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 600 }}>
                <span style={{ fontSize: 16 }}>🚪</span><span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        )}
        {/* BUG-REG-06 · Cerrar sesión visible en el perfil (mockup negocio-perfil*.html) */}
        {perfilB2CTab !== 'seguridad' && (
          <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--tw-border)', display: 'flex', justifyContent: 'flex-end' }}>
            <button data-testid="perfil-cerrar-sesion" onClick={() => { void cerrarSesion() }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.04)', color: '#ef4444', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 600 }}>
              <span style={{ fontSize: 16 }}>🚪</span><span>Cerrar sesión</span>
            </button>
          </div>
        )}
      </div>
    )
  }

  function renderPerfilB2B() {
    const emp = usuario?.negocio ?? { nombreLocal: nombreUsuario, distritoLocal: '', etapa: 'abierto' as const, pedidoIds: [] }
    const totalGastadoCents = pedidos.filter(p => p.logisticaStatus === 'entregado').reduce((s, p) => s + p.totalCents, 0)
    const caficultoresUnicos = new Set(pedidos.flatMap(p => p.items.map(i => i.caficultorId))).size
    const sTitle: React.CSSProperties = { fontFamily: 'Cormorant Garamond, serif', fontSize: 14, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--tw-border)' }
    const fLabel: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: 'var(--tw-text-muted)', marginBottom: 3 }
    const inputSt: React.CSSProperties = { width: '100%', background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 7, padding: '7px 10px', fontSize: 11, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif', outline: 'none', boxSizing: 'border-box' }
    const notifRow = (key: keyof typeof notifNeg, label: string, sub?: string) => (
      <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--tw-border)' }}>
        <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tw-text)' }}>{label}</div>{sub && <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', marginTop: 1 }}>{sub}</div>}</div>
        <div onClick={() => setNotifNeg(p => ({ ...p, [key]: !p[key] }))} style={{ width: 36, height: 20, borderRadius: 10, flexShrink: 0, cursor: 'pointer', position: 'relative', background: notifNeg[key] ? 'var(--tw-terra)' : 'var(--tw-border)' }}>
          <div style={{ position: 'absolute', top: 2, borderRadius: '50%', width: 16, height: 16, background: '#fff', left: notifNeg[key] ? 'calc(100% - 18px)' : 2, transition: 'left 0.15s' }} />
        </div>
      </div>
    )
    const tabsSt = (id: typeof perfilB2BTab): React.CSSProperties => ({
      padding: '8px 14px', border: 'none', borderBottom: perfilB2BTab === id ? '2px solid var(--tw-terra)' : '2px solid transparent',
      background: 'none', color: perfilB2BTab === id ? 'var(--tw-text)' : 'var(--tw-text-muted)',
      fontSize: 12, fontWeight: perfilB2BTab === id ? 700 : 500, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', whiteSpace: 'nowrap',
    })

    return (
      <div>
        {/* Hero B2B */}
        <div style={{ background: 'var(--tw-card)', borderRadius: 16, overflow: 'hidden', marginBottom: 14, border: '1px solid var(--tw-border)' }}>
          {emp.fotoLocal
            ? <div style={{ width: '100%', height: 120, overflow: 'hidden' }}><img src={emp.fotoLocal} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
            : <div style={{ width: '100%', height: 72, background: 'linear-gradient(135deg, var(--tw-terra)22, var(--tw-sage)22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>☕</div>}
          <div style={{ padding: '12px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <div>
                <h2 style={{ margin: '0 0 2px', fontSize: 20, fontWeight: 700, fontFamily: 'Cormorant Garamond, serif', color: 'var(--tw-text)' }}>{emp.nombreLocal}</h2>
                {emp.distritoLocal && <p style={{ margin: 0, fontSize: 11, color: 'var(--tw-text-muted)' }}>{emp.distritoLocal} · Lima</p>}
                <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--tw-text-muted)' }}>Miembro desde {usuario ? new Date().getFullYear() : '—'}</p>
              </div>
              <button onClick={() => setEditandoPerfil(true)} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--tw-border)', background: 'transparent', color: 'var(--tw-text-muted)', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', flexShrink: 0 }}>Editar →</button>
            </div>
            {/* Stats card */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { label: 'Pedidos', val: pedidos.length, ico: '📦' },
                { label: 'Total comprado', val: `S/ ${(totalGastadoCents / 100).toFixed(0)}`, ico: '💰' },
                { label: 'Caficultores', val: caficultoresUnicos, ico: '☕' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center', padding: '10px 8px', background: 'var(--tw-bg)', borderRadius: 8 }}>
                  <div style={{ fontSize: 16, marginBottom: 2 }}>{s.ico}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--tw-terra)', fontFamily: 'Cormorant Garamond, serif' }}>{s.val}</div>
                  <div style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs 5 */}
        <div className="settings-tabs" style={{ marginBottom: 20 }}>
          {([
            { id: 'empresa', label: '🏢 Empresa' },
            { id: 'direcciones', label: '📍 Direcciones' },
            { id: 'reposicion', label: '📦 Reposición' },
            { id: 'notificaciones', label: '🔔 Notificac.' },
            { id: 'seguridad', label: '🔒 Seguridad' },
          ] as { id: typeof perfilB2BTab; label: string }[]).map(t => (
            <button key={t.id} style={{ ...tabsSt(t.id), flexShrink: 0 }} onClick={() => setPerfilB2BTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {perfilB2BTab === 'empresa' && (
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 280, maxWidth: 520 }}>
              <div style={{ marginBottom: 20 }}>
                <div style={sTitle}>Perfil personal</div>
                <div className="grid-empresa-form" style={{ marginBottom: 10 }}>
                  <div><div style={fLabel}>Nombre</div><input style={inputSt} value={empNombre} onChange={e => setEmpNombre(e.target.value)} /></div>
                  <div><div style={fLabel}>Apellido</div><input style={inputSt} value={empApellido} onChange={e => setEmpApellido(e.target.value)} /></div>
                </div>
                <div style={{ marginBottom: 10 }}><div style={fLabel}>WhatsApp</div><input style={inputSt} type="tel" value={empTelefono} onChange={e => setEmpTelefono(e.target.value)} placeholder="+51 987 654 321" /></div>
                <div><div style={fLabel}>Email</div><input style={{ ...inputSt, opacity: 0.6 }} defaultValue={(emp as any)?.email ?? ''} disabled /></div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={sTitle}>Datos del negocio</div>
                <div style={{ marginBottom: 10 }}><div style={fLabel}>Nombre del local *</div><input style={inputSt} value={empNombreLocal} onChange={e => setEmpNombreLocal(e.target.value)} /></div>
                <div className="grid-empresa-form">
                  <div>
                    <div style={fLabel}>Distrito</div>
                    <select style={{ ...inputSt, cursor: 'pointer' }} value={empDistrito} onChange={e => setEmpDistrito(e.target.value)}>
                      <option value="">Seleccionar</option>
                      {['Miraflores','Barranco','San Isidro','San Borja','Surco','Jesús María','Lince','Pueblo Libre','Magdalena','San Miguel'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={fLabel}>Volumen mensual</div>
                    <select style={{ ...inputSt, cursor: 'pointer' }} value={empVolumen} onChange={e => setEmpVolumen(e.target.value)}>
                      <option value="">Seleccionar</option>
                      <option>Menos de 10 kg</option><option>10–30 kg</option><option>30–100 kg</option><option>100–300 kg</option><option>Más de 300 kg</option>
                    </select>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={sTitle}>Datos fiscales</div>
                <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', marginBottom: 10 }}>Se usan para emitir tus facturas. Registrados al crear tu cuenta empresa.</div>
                <div className="grid-empresa-form">
                  <div>
                    <div style={fLabel}>RUC</div>
                    <input style={{ ...inputSt, opacity: 0.7, cursor: 'not-allowed' }} value={empRuc || '—'} readOnly aria-readonly="true" />
                    <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', marginTop: 3 }}>Vinculado a tu cuenta. Para cambiarlo escribe a tunaywasi@gmail.com</div>
                  </div>
                  <div>
                    <div style={fLabel}>Razón social</div>
                    <input style={{ ...inputSt, opacity: 0.7, cursor: 'not-allowed' }} value={empRazonSocial || '—'} readOnly aria-readonly="true" />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--tw-border)', background: 'transparent', color: 'var(--tw-text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Cancelar</button>
                <button onClick={guardarDatosEmpresa} disabled={empGuardando} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: empGuardando ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat, sans-serif' }}>{empGuardando ? 'Guardando…' : 'Guardar cambios'}</button>
              </div>
            </div>
            {/* Card modalidades */}
            <div style={{ width: 220, flexShrink: 0 }}>
              <div style={{ background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 10, padding: 14 }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 14, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 10 }}>📋 Modalidades de compra</div>
                <div style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--tw-border)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-terra)', marginBottom: 2 }}>Precio fijo</div>
                  <div style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>Disponible en todos los lotes. Reclamo 48h.</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-sage)', marginBottom: 2 }}>Precio negociable</div>
                  <div style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>Solo en lotes habilitados. Reclamo 72h.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {perfilB2BTab === 'direcciones' && (() => {
          return (
            <div style={{ maxWidth: 520 }}>
              {!dirFormAbierto && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={sTitle}>Mis direcciones</div>
                    {direcciones.length < 3
                      ? <button onClick={() => { setDirFormEditar(undefined); setDirFormTipo('local'); setDirFormNombre(''); setDirFormDir(''); setDirFormDistrito(''); setDirFormProvincia(''); setDirFormDpto('Lima'); setDirFormRef(''); setDirFormTel(''); setDirFormPrincipal(false); setDirFormAbierto(true) }} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>+ Agregar</button>
                      : <span style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>Límite 3</span>}
                  </div>
                  {direcciones.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--tw-text-muted)' }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>📍</div>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>Sin direcciones registradas</div>
                    </div>
                  )}
                  {direcciones.map(dir => (
                    <div key={dir.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 0', borderBottom: '1px solid var(--tw-border)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tw-text)' }}>{dir.nombre || dir.direccion}</div>
                        <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', marginTop: 2 }}>{dir.direccion}</div>
                        <div style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>{[dir.distrito, dir.departamento].filter(Boolean).join(', ')}</div>
                        {dir.esPrincipal && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--tw-sage)', background: 'rgba(143,175,138,.15)', padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginTop: 4 }}>Principal</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { setDirFormEditar(dir); setDirFormTipo(dir.tipo); setDirFormNombre(dir.nombre); setDirFormDir(dir.direccion); setDirFormDistrito(dir.distrito); setDirFormProvincia(dir.provincia); setDirFormDpto(dir.departamento); setDirFormRef(dir.referencia); setDirFormTel(dir.telefono); setDirFormPrincipal(dir.esPrincipal); setDirFormAbierto(true) }} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--tw-border)', background: 'transparent', color: 'var(--tw-text-muted)', fontSize: 10, cursor: 'pointer' }}>Editar</button>
                        {!dir.esPrincipal && <button onClick={async () => { const u = direcciones.filter(d => d.id !== dir.id); setDirecciones(u); try { await updateDireccionesNegocio(usuarioId, u) } catch { toast('Error al eliminar', 'error') } }} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,.3)', background: 'transparent', color: '#ef4444', fontSize: 10, cursor: 'pointer' }}>×</button>}
                      </div>
                    </div>
                  ))}
                </>
              )}
              {dirFormAbierto && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <button onClick={() => setDirFormAbierto(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--tw-text-muted)', padding: 0 }}>‹</button>
                    <div style={sTitle}>{dirFormEditar ? 'Editar dirección' : 'Nueva dirección'}</div>
                  </div>
                  <div style={{ marginBottom: 10 }}><div style={fLabel}>Nombre de referencia</div><input value={dirFormNombre} onChange={e => setDirFormNombre(e.target.value)} style={inputSt} placeholder="Local Miraflores" /></div>
                  <div style={{ marginBottom: 10 }}><div style={fLabel}>Dirección *</div><input value={dirFormDir} onChange={e => setDirFormDir(e.target.value)} style={inputSt} placeholder="Av. Los Olivos 234" /></div>
                  <div className="grid-empresa-form" style={{ marginBottom: 10 }}>
                    <div><div style={fLabel}>Distrito *</div><input value={dirFormDistrito} onChange={e => setDirFormDistrito(e.target.value)} style={inputSt} placeholder="Miraflores" /></div>
                    <div><div style={fLabel}>Provincia</div><input value={dirFormProvincia} onChange={e => setDirFormProvincia(e.target.value)} style={inputSt} placeholder="Lima" /></div>
                  </div>
                  <div style={{ marginBottom: 16 }}><div style={fLabel}>Referencia adicional</div><input value={dirFormRef} onChange={e => setDirFormRef(e.target.value)} style={inputSt} placeholder="Frente al parque, 2do piso" /></div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setDirFormAbierto(false)} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1px solid var(--tw-border)', background: 'transparent', color: 'var(--tw-text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                    <button onClick={async () => {
                      if (!dirFormDir.trim() || !dirFormDistrito.trim()) return
                      const nueva: DireccionEnvioONE = { id: dirFormEditar?.id ?? `dir-${Date.now()}`, tipo: dirFormTipo, nombre: dirFormNombre, direccion: dirFormDir, distrito: dirFormDistrito, provincia: dirFormProvincia, departamento: dirFormDpto, codigoPostal: '', referencia: dirFormRef, telefono: dirFormTel, esPrincipal: dirFormPrincipal }
                      const updated = (() => { const idx = direcciones.findIndex(x => x.id === nueva.id); let arr = idx >= 0 ? direcciones.map(x => x.id === nueva.id ? nueva : x) : [...direcciones, nueva]; if (nueva.esPrincipal) arr = arr.map(x => x.id === nueva.id ? x : { ...x, esPrincipal: false }); return arr })()
                      setDirecciones(updated); setDirFormAbierto(false)
                      try { await updateDireccionesNegocio(usuarioId, updated); toast(dirFormEditar ? 'Dirección actualizada' : 'Dirección guardada', 'ok') } catch { toast('Error al guardar dirección', 'error') }
                    }} style={{ flex: 2, padding: '11px 0', borderRadius: 10, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      {dirFormEditar ? 'Guardar cambios' : 'Guardar dirección'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {perfilB2BTab === 'reposicion' && (
          <div style={{ maxWidth: 520 }}>
            <div style={sTitle}>Reposiciones programadas</div>
            {pedidos.filter(p => (p as any).autoRestock).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ fontSize: 32, marginBottom: 8 }}>📅</p>
                <p style={{ fontSize: 14, color: 'var(--tw-text)', fontWeight: 700, marginBottom: 6 }}>Sin reposiciones activas</p>
                <p style={{ fontSize: 12, color: 'var(--tw-text-muted)', marginBottom: 16 }}>Cuando programes una reposición automática aparecerá aquí</p>
                <button onClick={() => setTab('catalogo')} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Explorar catálogo →</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pedidos.filter(p => (p as any).autoRestock).map(p => (
                  <div key={p.id} style={{ background: 'var(--tw-card)', borderRadius: 10, padding: '12px 16px', border: '1px solid var(--tw-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tw-text)' }}>{p.items[0]?.productoNombre}</div>
                      <div style={{ fontSize: 11, color: 'var(--tw-text-muted)', marginTop: 2 }}>{(p as any).autoRestockFreq ?? 'Cada 15 días'} · {p.items[0]?.caficultorNombre}</div>
                    </div>
                    <span style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(143,175,138,.12)', color: 'var(--tw-sage)', fontSize: 10, fontWeight: 700 }}>Activa</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {perfilB2BTab === 'notificaciones' && (
          <div>
            {/* Centro de notificaciones en tiempo real */}
            <NotificacionesNegocio
              negocioId={usuarioId}
              demo={isDemo}
              inline={true}
              onNavigatePedido={pedidoId => { setPedidoDetalle(pedidos.find(p => p.id === pedidoId) ?? null); setSubTab('pedidos'); setTab('mis_compras') }}
              onNavigateCotizacion={() => { setSubTab('ofertas'); setTab('mis_compras') }}
              onNavigateProducto={() => setTab('catalogo')}
            />
            {/* Preferencias de canal */}
            <div style={{ marginTop: 24, maxWidth: 520 }}>
              <div style={sTitle}>Preferencias de canal</div>
              <div style={{ marginBottom: 20 }}>{notifRow('whatsapp', 'WhatsApp')}{notifRow('email', 'Email')}{notifRow('push', 'Push (app Android)')}</div>
              <div style={{ marginBottom: 20 }}><div style={sTitle}>Alertas de pedidos</div>{notifRow('pagoConfirmado', 'Pago confirmado')}{notifRow('pedidoEnCamino', 'Pedido en camino')}{notifRow('pedidoEntregado', 'Pedido entregado')}{notifRow('recordatorioVoucher', 'Recordatorio voucher')}</div>
              <div style={{ marginBottom: 20 }}><div style={sTitle}>Ofertas</div>{notifRow('nuevosCafes', 'Nuevos cafés disponibles')}{notifRow('ofertasPromos', 'Ofertas y promociones')}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => toast('Preferencias guardadas', 'ok')} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Guardar preferencias</button>
              </div>
            </div>
          </div>
        )}

        {perfilB2BTab === 'seguridad' && (
          <div style={{ maxWidth: 520 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={sTitle}>Contraseña</div>
              <div style={{ marginBottom: 10 }}><div style={fLabel}>Contraseña actual</div><input style={inputSt} type="password" placeholder="••••••••" /></div>
              <div className="grid-empresa-form" style={{ marginBottom: 10 }}>
                <div><div style={fLabel}>Nueva contraseña</div><input style={inputSt} type="password" placeholder="Mínimo 8 caracteres" /></div>
                <div><div style={fLabel}>Confirmar</div><input style={inputSt} type="password" placeholder="Repetir nueva" /></div>
              </div>
              <button onClick={() => toast('Próximamente: cambiar contraseña', 'info')} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Cambiar contraseña</button>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={sTitle}>Sesiones activas</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--tw-border)' }}>
                <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tw-text)' }}>Este navegador</div><div style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>Sesión actual</div></div>
                <div style={{ fontSize: 9, color: 'var(--tw-sage)', fontWeight: 700 }}>Activa</div>
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ ...sTitle, color: '#ef4444' }}>Zona de peligro</div>
              <div style={{ background: 'rgba(239,68,68,.05)', border: '1px solid rgba(239,68,68,.15)', borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-text)' }}>Eliminar cuenta</div><div style={{ fontSize: 10, color: 'var(--tw-text-muted)', marginTop: 2 }}>Esta acción es permanente</div></div>
                <button onClick={() => toast('Contacta a soporte para eliminar tu cuenta', 'info')} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.05)', color: '#ef4444', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Eliminar cuenta</button>
              </div>
            </div>
            <div style={{ marginTop: 24 }}>
              <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(239,68,68,.2)', background: 'rgba(239,68,68,.04)', color: '#e74c3c', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 600 }} onClick={() => { void cerrarSesion() }}>
                <span style={{ fontSize: 16 }}>🚪</span><span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        )}
        {/* BUG-REG-06 · Cerrar sesión visible en el perfil (mockup negocio-perfil*.html) */}
        {perfilB2BTab !== 'seguridad' && (
          <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--tw-border)', display: 'flex', justifyContent: 'flex-end' }}>
            <button data-testid="perfil-cerrar-sesion" onClick={() => { void cerrarSesion() }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.04)', color: '#ef4444', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 600 }}>
              <span style={{ fontSize: 16 }}>🚪</span><span>Cerrar sesión</span>
            </button>
          </div>
        )}
      </div>
    )
  }


  function renderPerfil() {
    // El rol es la fuente de verdad — no el campo negocio (que puede existir con datos inconsistentes)
    if (usuario?.rol === 'buyer_b2b') return renderPerfilB2B()
    if (usuario?.rol === 'buyer_b2c') return renderPerfilB2C()
    return null

    // --- DEAD CODE BELOW (kept for reference until cleanup) ---
    const historial = pedidos.filter(p => p.logisticaStatus === 'entregado')
    const emp = usuario?.negocio ?? {
      nombreLocal: pedidos[0]?.nombreLocal ?? nombreUsuario,
      distritoLocal: pedidos[0]?.distritoLocal ?? '',
      etapa: 'abierto' as const,
      pedidoIds: [],
    }
    const etapaColor = emp.etapa === 'abierto' ? 'var(--tw-sage)' : 'var(--tw-warning)'
    const etapaLabel = emp.etapa === 'abierto' ? '● Abierto' : emp.etapa === 'proxima_apertura' ? '◐ Próxima apertura' : '○ Planificando'

    const sectionTitle: React.CSSProperties = {
      fontFamily: 'Cormorant Garamond, serif', fontSize: 14, fontWeight: 700,
      color: 'var(--tw-text)', marginBottom: 10, paddingBottom: 6,
      borderBottom: '1px solid var(--tw-border)',
    }
    const fieldLabel: React.CSSProperties = {
      fontSize: 10, fontWeight: 700, color: 'var(--tw-text-muted)', marginBottom: 3,
    }
    const inputStyle: React.CSSProperties = {
      width: '100%', background: 'var(--tw-card)', border: '1px solid var(--tw-border)',
      borderRadius: 7, padding: '7px 10px', fontSize: 11, color: 'var(--tw-text)',
      fontFamily: 'Montserrat, sans-serif', outline: 'none', boxSizing: 'border-box',
    }
    const notifRow = (key: keyof typeof notifNeg, label: string, sub?: string) => (
      <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--tw-border)' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tw-text)' }}>{label}</div>
          {sub && <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', marginTop: 1 }}>{sub}</div>}
        </div>
        <div
          onClick={() => setNotifNeg(prev => ({ ...prev, [key]: !prev[key] }))}
          style={{ width: 36, height: 20, borderRadius: 10, flexShrink: 0, cursor: 'pointer', position: 'relative', background: notifNeg[key] ? 'var(--tw-terra)' : 'var(--tw-border)' }}
        >
          <div style={{ position: 'absolute', top: 2, borderRadius: '50%', width: 16, height: 16, background: '#fff', left: notifNeg[key] ? 'calc(100% - 18px)' : 2, transition: 'left 0.15s' }} />
        </div>
      </div>
    )

    return (
      <div>
        {/* Hero: banner + info */}
        <div style={{ background: 'var(--tw-card)', borderRadius: 16, overflow: 'hidden', marginBottom: 14, border: `1px solid var(--tw-border)` }}>
          {emp.fotoLocal ? (
            <div style={{ width: '100%', height: 120, overflow: 'hidden' }}>
              <img src={emp.fotoLocal} alt={emp.nombreLocal} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : (
            <div style={{ width: '100%', height: 80, background: `linear-gradient(135deg, var(--tw-terra)22, var(--tw-sage)22)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>☕</div>
          )}
          <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ margin: '0 0 2px', fontSize: 20, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.nombreLocal}</h2>
              {emp.distritoLocal && <p style={{ margin: 0, fontSize: 11, color: 'var(--tw-text-muted)' }}>{emp.distritoLocal} · Lima</p>}
            </div>
            <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: etapaColor + '22', color: etapaColor, fontWeight: 700, border: `1px solid ${etapaColor}44`, flexShrink: 0 }}>{etapaLabel}</span>
          </div>
        </div>

        {/* Alerta reseñas pendientes */}
        {historial.filter(p => !p.calificado && p.recepcionConfirmada).length > 0 && (
          <div style={{ padding: '12px 14px', background: 'var(--tw-warning)11', borderRadius: 10, border: `1px solid var(--tw-warning)33`, marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--tw-warning)' }}>
              Tienes {historial.filter(p => !p.calificado && p.recepcionConfirmada).length} entrega(s) sin calificar —{' '}
              <button onClick={() => { setTab('mis_compras'); setSubTab('resenias') }} style={{ background: 'none', border: 'none', color: 'var(--tw-terra)', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                ir a reseñas →
              </button>
            </p>
          </div>
        )}

        {/* Mobile: menú lista (cuando no hay subtab) / Desktop: tabs siempre visibles */}
        {settingsTabNeg === null && (
          <div className="perfil-menu-mobile">
            {([
              { id: 'empresa',        emoji: '🏢', label: 'Empresa' },
              { id: 'direcciones',    emoji: '📍', label: 'Mis direcciones' },
              { id: 'notificaciones', emoji: '🔔', label: 'Notificaciones' },
              { id: 'seguridad',      emoji: '🔒', label: 'Seguridad' },
            ] as { id: NonNullable<SettingsTabNeg>; emoji: string; label: string }[]).map(item => (
              <button
                key={item.id}
                onClick={() => setSettingsTabNeg(item.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 12, marginBottom: 8, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
              >
                <span style={{ fontSize: 22, width: 32, textAlign: 'center', flexShrink: 0 }}>{item.emoji}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--tw-text)', textAlign: 'left' }}>{item.label}</span>
                <span style={{ fontSize: 16, color: 'var(--tw-text-muted)' }}>›</span>
              </button>
            ))}
          </div>
        )}
        {(settingsTabNeg !== null || true) && (
          <>
            <button
              className="perfil-back-btn"
              onClick={() => setSettingsTabNeg(null)}
              style={{ display: 'none', alignItems: 'center', gap: 6, marginBottom: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tw-terra)', fontSize: 12, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', padding: 0 }}
            >‹ Volver</button>
            <div className="settings-tabs settings-tabs-desktop">
              {(['empresa', 'direcciones', 'notificaciones', 'seguridad'] as NonNullable<SettingsTabNeg>[]).map(id => {
                const emojis: Record<NonNullable<SettingsTabNeg>, string> = { empresa: '🏢', direcciones: '📍', notificaciones: '🔔', seguridad: '🔒' }
                const labels: Record<NonNullable<SettingsTabNeg>, string> = { empresa: 'Empresa', direcciones: 'Direcciones', notificaciones: 'Notific.', seguridad: 'Seguridad' }
                const activeTab = settingsTabNeg ?? 'empresa'
                const sTabStyleEff = (tid: NonNullable<SettingsTabNeg>): React.CSSProperties => ({
                  padding: '8px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  color: activeTab === tid ? 'var(--tw-terra)' : 'var(--tw-text-muted)',
                  background: 'none', border: 'none', borderBottom: activeTab === tid ? '2px solid var(--tw-terra)' : '2px solid transparent',
                  fontFamily: 'Montserrat, sans-serif', whiteSpace: 'nowrap',
                })
                return (
                  <button key={id} onClick={() => setSettingsTabNeg(id)} style={{ ...sTabStyleEff(id), flexShrink: 0 }}>
                    {emojis[id]} {labels[id]}
                  </button>
                )
              })}
            </div>

            {/* Tab: Empresa — visible si settingsTabNeg === 'empresa' o null (desktop default) */}
        {(settingsTabNeg === 'empresa' || settingsTabNeg === null) && (
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, maxWidth: 520 }}>
              {/* Perfil personal */}
              <div style={{ marginBottom: 20 }}>
                <div style={sectionTitle}>Perfil personal</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--tw-terra)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {nombreUsuario.charAt(0).toUpperCase()}
                  </div>
                  <button onClick={() => toast('Próximamente: cambiar foto', 'info')} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--tw-border)', background: 'transparent', color: 'var(--tw-text-muted)', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Cambiar foto</button>
                </div>
                <div className="grid-empresa-form" style={{ marginBottom: 10 }}>
                  <div>
                    <div style={fieldLabel}>Nombre</div>
                    <input style={inputStyle} value={empNombre} onChange={e => setEmpNombre(e.target.value)} placeholder="Danny" />
                  </div>
                  <div>
                    <div style={fieldLabel}>Apellido</div>
                    <input style={inputStyle} value={empApellido} onChange={e => setEmpApellido(e.target.value)} placeholder="Sc" />
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={fieldLabel}>WhatsApp</div>
                  <input style={inputStyle} type="tel" value={empTelefono} onChange={e => setEmpTelefono(e.target.value)} placeholder="+51 987 654 321" />
                  <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', marginTop: 3 }}>Para notificaciones de pedidos y soporte.</div>
                </div>
                <div>
                  <div style={fieldLabel}>Email</div>
                  <input style={{ ...inputStyle, opacity: 0.6 }} defaultValue={(emp as any)?.email ?? ''} placeholder="correo@empresa.com" disabled />
                  <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', marginTop: 3 }}>Para cambiar el email ve a Seguridad.</div>
                </div>
              </div>
              {/* Datos del negocio */}
              <div style={{ marginBottom: 20 }}>
                <div style={sectionTitle}>Datos del negocio</div>
                <div style={{ marginBottom: 10 }}>
                  <div style={fieldLabel}>Nombre del local *</div>
                  <input style={inputStyle} value={empNombreLocal} onChange={e => setEmpNombreLocal(e.target.value)} placeholder="Café Lumbre" />
                </div>
                <div className="grid-empresa-form">
                  <div>
                    <div style={fieldLabel}>Distrito</div>
                    <div style={{ position: 'relative' }}>
                      <select style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }} value={empDistrito} onChange={e => setEmpDistrito(e.target.value)}>
                        <option value="">Seleccionar</option>
                        {['Miraflores', 'Barranco', 'San Isidro', 'San Borja', 'Surco', 'Jesús María', 'Lince', 'Pueblo Libre', 'Magdalena', 'San Miguel'].map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--tw-text-muted)', pointerEvents: 'none' }}>▾</span>
                    </div>
                  </div>
                  <div>
                    <div style={fieldLabel}>Volumen mensual</div>
                    <div style={{ position: 'relative' }}>
                      <select style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }} value={empVolumen} onChange={e => setEmpVolumen(e.target.value)}>
                        <option value="">Seleccionar</option>
                        <option>Menos de 10 kg</option>
                        <option>10–30 kg</option>
                        <option>30–100 kg</option>
                        <option>100–300 kg</option>
                        <option>Más de 300 kg</option>
                      </select>
                      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--tw-text-muted)', pointerEvents: 'none' }}>▾</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Datos fiscales */}
              <div style={{ marginBottom: 20 }}>
                <div style={sectionTitle}>Datos fiscales</div>
                <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', marginBottom: 10 }}>Se usan para emitir tus facturas. Registrados al crear tu cuenta empresa.</div>
                <div className="grid-empresa-form">
                  <div>
                    <div style={fieldLabel}>RUC</div>
                    <input style={{ ...inputStyle, opacity: 0.7, cursor: 'not-allowed' }} value={empRuc || '—'} readOnly aria-readonly="true" />
                    <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', marginTop: 3 }}>Vinculado a tu cuenta. Para cambiarlo escribe a tunaywasi@gmail.com</div>
                  </div>
                  <div>
                    <div style={fieldLabel}>Razón social</div>
                    <input style={{ ...inputStyle, opacity: 0.7, cursor: 'not-allowed' }} value={empRazonSocial || '—'} readOnly aria-readonly="true" />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--tw-border)', background: 'transparent', color: 'var(--tw-text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Cancelar</button>
                <button onClick={guardarDatosEmpresa} disabled={empGuardando} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: empGuardando ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat, sans-serif' }}>{empGuardando ? 'Guardando…' : 'Guardar cambios'}</button>
              </div>
            </div>
            {/* Card lateral: modalidades */}
            <div style={{ width: 220, flexShrink: 0, display: 'none' }} className="settings-col-neg">
              <div style={{ background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 10, padding: 14 }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 14, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 10 }}>📋 Modalidades de compra</div>
                <div style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--tw-border)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-terra)', marginBottom: 2 }}>Precio fijo</div>
                  <div style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>Disponible en todos los lotes. Plazo de reclamo 48h.</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-sage)', marginBottom: 2 }}>Precio negociable</div>
                  <div style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>Solo en lotes que el caficultor habilita. Plazo de reclamo 72h.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Direcciones */}
        {settingsTabNeg === 'direcciones' && (() => {
          const TIPOS_NEG = [
            { value: 'local', emoji: '🏢', label: 'Local comercial' },
            { value: 'domicilio', emoji: '🏠', label: 'Domicilio' },
            { value: 'almacen', emoji: '📦', label: 'Almacén' },
          ]
          const DEPTOS = ['Amazonas','Áncash','Apurímac','Arequipa','Ayacucho','Cajamarca','Callao','Cusco','Huancavelica','Huánuco','Ica','Junín','La Libertad','Lambayeque','Lima','Loreto','Madre de Dios','Moquegua','Pasco','Piura','Puno','San Martín','Tacna','Tumbes','Ucayali']
          const abrirNueva = () => {
            setDirFormEditar(undefined)
            setDirFormTipo('local'); setDirFormNombre(''); setDirFormDir('')
            setDirFormDistrito(''); setDirFormProvincia(''); setDirFormDpto('Lima')
            setDirFormRef(''); setDirFormTel(''); setDirFormPrincipal(false)
            setDirFormAbierto(true)
          }
          const abrirEditar = (dir: DireccionEnvioONE) => {
            setDirFormEditar(dir)
            setDirFormTipo(dir.tipo); setDirFormNombre(dir.nombre); setDirFormDir(dir.direccion)
            setDirFormDistrito(dir.distrito); setDirFormProvincia(dir.provincia); setDirFormDpto(dir.departamento)
            setDirFormRef(dir.referencia); setDirFormTel(dir.telefono); setDirFormPrincipal(dir.esPrincipal)
            setDirFormAbierto(true)
          }
          const guardar = async () => {
            if (!dirFormDir.trim() || !dirFormDistrito.trim()) return
            const nueva: DireccionEnvioONE = {
              id: dirFormEditar?.id ?? `dir-${Date.now()}`,
              tipo: dirFormTipo, nombre: dirFormNombre, direccion: dirFormDir,
              distrito: dirFormDistrito, provincia: dirFormProvincia, departamento: dirFormDpto,
              codigoPostal: '', referencia: dirFormRef, telefono: dirFormTel, esPrincipal: dirFormPrincipal,
            }
            const updated = (() => {
              const idx = direcciones.findIndex(x => x.id === nueva.id)
              let arr = idx >= 0 ? direcciones.map(x => x.id === nueva.id ? nueva : x) : [...direcciones, nueva]
              if (nueva.esPrincipal) arr = arr.map(x => x.id === nueva.id ? x : { ...x, esPrincipal: false })
              return arr
            })()
            setDirecciones(updated)
            setDirFormAbierto(false)
            try {
              await updateDireccionesNegocio(usuarioId, updated)
              toast(dirFormEditar ? 'Dirección actualizada' : 'Dirección guardada', 'ok')
            } catch { toast('Error al guardar dirección', 'error') }
          }
          return (
            <div style={{ maxWidth: 520 }}>
              {!dirFormAbierto && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={sectionTitle}>Mis direcciones</div>
                    {direcciones.length < 3
                      ? <button onClick={abrirNueva} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>+ Agregar</button>
                      : <span style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>Límite 3</span>}
                  </div>
                  {direcciones.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--tw-text-muted)' }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>📍</div>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>Sin direcciones registradas</div>
                      <div style={{ fontSize: 11 }}>Agrega tu local o punto de despacho</div>
                    </div>
                  )}
                  {direcciones.map(dir => (
                    <div key={dir.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 0', borderBottom: '1px solid var(--tw-border)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tw-text)' }}>{dir.nombre || dir.direccion}</div>
                        <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', marginTop: 2 }}>{dir.direccion}</div>
                        <div style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>{[dir.distrito, dir.departamento].filter(Boolean).join(', ')}</div>
                        {dir.esPrincipal && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--tw-sage)', background: 'rgba(143,175,138,.15)', padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginTop: 4 }}>Principal</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => abrirEditar(dir)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--tw-border)', background: 'transparent', color: 'var(--tw-text-muted)', fontSize: 10, cursor: 'pointer' }}>Editar</button>
                        {!dir.esPrincipal && <button onClick={async () => {
                          const updated = direcciones.filter(d => d.id !== dir.id)
                          setDirecciones(updated)
                          try { await updateDireccionesNegocio(usuarioId, updated) } catch { toast('Error al eliminar', 'error') }
                        }} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,.3)', background: 'transparent', color: '#ef4444', fontSize: 10, cursor: 'pointer' }}>×</button>}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {dirFormAbierto && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <button onClick={() => setDirFormAbierto(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--tw-text-muted)', padding: 0 }}>‹</button>
                    <div style={sectionTitle}>{dirFormEditar ? 'Editar dirección' : 'Nueva dirección'}</div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={fieldLabel}>Tipo</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {TIPOS_NEG.map(t => (
                        <button key={t.value} onClick={() => setDirFormTipo(t.value)} style={{ flex: 1, padding: '10px 6px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${dirFormTipo === t.value ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: dirFormTipo === t.value ? 'rgba(201,110,75,0.08)' : 'var(--tw-card)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 20 }}>{t.emoji}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--tw-text)', textAlign: 'center' }}>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <div style={fieldLabel}>Nombre de referencia</div>
                    <input value={dirFormNombre} onChange={e => setDirFormNombre(e.target.value)} style={inputStyle} placeholder="Ej: Local Miraflores" />
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={fieldLabel}>Dirección *</div>
                    <input value={dirFormDir} onChange={e => setDirFormDir(e.target.value)} style={inputStyle} placeholder="Av. Los Olivos 234, Urb. Las Flores" />
                  </div>
                  <div className="grid-empresa-form" style={{ marginBottom: 10 }}>
                    <div>
                      <div style={fieldLabel}>Distrito *</div>
                      <input value={dirFormDistrito} onChange={e => setDirFormDistrito(e.target.value)} style={inputStyle} placeholder="Miraflores" />
                    </div>
                    <div>
                      <div style={fieldLabel}>Provincia</div>
                      <input value={dirFormProvincia} onChange={e => setDirFormProvincia(e.target.value)} style={inputStyle} placeholder="Lima" />
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={fieldLabel}>Departamento</div>
                    <div style={{ position: 'relative' }}>
                      <select value={dirFormDpto} onChange={e => setDirFormDpto(e.target.value)} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
                        {DEPTOS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--tw-text-muted)', pointerEvents: 'none' }}>▾</span>
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={fieldLabel}>Referencia adicional</div>
                    <input value={dirFormRef} onChange={e => setDirFormRef(e.target.value)} style={inputStyle} placeholder="Frente al parque, 2do piso" />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={fieldLabel}>Teléfono de contacto</div>
                    <input value={dirFormTel} onChange={e => setDirFormTel(e.target.value)} style={inputStyle} placeholder="+51 9XX XXX XXX" type="tel" />
                  </div>
                  <div onClick={() => setDirFormPrincipal(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: '1px solid var(--tw-border)', background: 'var(--tw-card)', marginBottom: 20, cursor: 'pointer' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tw-text)' }}>Establecer como dirección principal</div>
                      <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', marginTop: 2 }}>Se usará por defecto en nuevos pedidos</div>
                    </div>
                    <div style={{ width: 36, height: 20, borderRadius: 10, background: dirFormPrincipal ? 'var(--tw-terra)' : 'var(--tw-border)', position: 'relative', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', top: 3, left: dirFormPrincipal ? 'calc(100% - 17px)' : 3, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setDirFormAbierto(false)} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1px solid var(--tw-border)', background: 'transparent', color: 'var(--tw-text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                    <button onClick={guardar} style={{ flex: 2, padding: '11px 0', borderRadius: 10, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{dirFormEditar ? 'Guardar cambios' : 'Guardar dirección'}</button>
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* Tab: Notificaciones */}
        {settingsTabNeg === 'notificaciones' && (
          <div>
            <NotificacionesNegocio
              negocioId={usuarioId}
              demo={isDemo}
              inline={true}
              onNavigatePedido={pedidoId => { setPedidoDetalle(pedidos.find(p => p.id === pedidoId) ?? null); setSubTab('pedidos'); setTab('mis_compras') }}
              onNavigateCotizacion={() => { setSubTab('ofertas'); setTab('mis_compras') }}
              onNavigateProducto={() => setTab('catalogo')}
            />
            <div style={{ maxWidth: 520, marginTop: 24 }}>
              <div style={sectionTitle}>Pedidos</div>
              <div style={{ marginBottom: 20 }}>
                {notifRow('pagoConfirmado', 'Pago confirmado', 'Cuando el caficultor confirma tu voucher')}
                {notifRow('pedidoEnCamino', 'Pedido en camino', 'Cuando el caficultor despacha tu pedido')}
                {notifRow('pedidoEntregado', 'Pedido entregado', 'Confirmación de entrega exitosa')}
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={sectionTitle}>Pagos y recordatorios</div>
                {notifRow('recordatorioVoucher', 'Recordatorio de voucher', 'Si tienes un pago pendiente por más de 24h')}
                {notifRow('nuevosCafes', 'Nuevos cafés disponibles', 'Cuando tus caficultores favoritos publican stock')}
                {notifRow('ofertasPromos', 'Ofertas y promociones', 'Descuentos y lotes especiales')}
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={sectionTitle}>Canal de notificación</div>
                {notifRow('whatsapp', 'WhatsApp', (emp as any)?.telefono ?? '+51 9xx xxx xxx')}
                {notifRow('email', 'Email', (emp as any)?.email ?? 'correo@empresa.com')}
                {notifRow('push', 'Push (app Android)', 'Notificaciones en el móvil')}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => toast('Preferencias guardadas', 'ok')} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Guardar preferencias</button>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Seguridad */}
        {settingsTabNeg === 'seguridad' && (
          <div style={{ maxWidth: 520 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={sectionTitle}>Contraseña</div>
              <div style={{ marginBottom: 10 }}>
                <div style={fieldLabel}>Contraseña actual</div>
                <input style={inputStyle} type="password" placeholder="••••••••" />
              </div>
              <div className="grid-empresa-form" style={{ marginBottom: 10 }}>
                <div>
                  <div style={fieldLabel}>Nueva contraseña</div>
                  <input style={inputStyle} type="password" placeholder="Mínimo 8 caracteres" />
                </div>
                <div>
                  <div style={fieldLabel}>Confirmar contraseña</div>
                  <input style={inputStyle} type="password" placeholder="Repetir nueva" />
                </div>
              </div>
              <button onClick={() => toast('Próximamente: cambiar contraseña', 'info')} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Cambiar contraseña</button>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={sectionTitle}>Sesiones activas</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--tw-border)' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tw-text)' }}>Este navegador</div>
                  <div style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>Sesión actual</div>
                </div>
                <div style={{ fontSize: 9, color: 'var(--tw-sage)', fontWeight: 700 }}>Activa</div>
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ ...sectionTitle, color: '#ef4444' }}>Zona de peligro</div>
              <div style={{ background: 'rgba(239,68,68,.05)', border: '1px solid rgba(239,68,68,.15)', borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-text)' }}>Eliminar cuenta</div>
                  <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', marginTop: 2 }}>Esta acción es permanente e irreversible</div>
                </div>
                <button onClick={() => toast('Contacta a soporte para eliminar tu cuenta', 'info')} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.05)', color: '#ef4444', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Eliminar cuenta</button>
              </div>
            </div>
            <div style={{ marginTop: 24 }}>
              <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(239,68,68,.2)', background: 'rgba(239,68,68,.04)', color: '#e74c3c', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 600 }}
                onClick={() => { void cerrarSesion() }}>
                <span style={{ fontSize: 16 }}>🚪</span>
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        )}

        {/* Soporte (siempre visible abajo) */}
        {settingsTabNeg === 'empresa' && (
          <div style={{ background: 'var(--tw-card)', borderRadius: 14, padding: '14px 18px', border: `1px solid var(--tw-border)`, marginTop: 20 }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>¿Necesitas ayuda?</p>
            <a href={`https://wa.me/${ONE_CONFIG.ADMIN_WHATSAPP.replace(/\s/g, '')}?text=Hola, soy ${emp.nombreLocal} y necesito ayuda`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#25D36622', border: `1px solid #25D36644`, textDecoration: 'none' }}>
              <span style={{ fontSize: 18 }}>💬</span>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--tw-text)' }}>Hablar con el equipo</p>
                <p style={{ margin: '1px 0 0', fontSize: 10, color: 'var(--tw-text-muted)' }}>WhatsApp directo con TunayWasi</p>
              </div>
            </a>
          </div>
        )}
          </>
        )}
      </div>
    )
  }


  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className={tab === 'catalogo' ? 'is-catalogo' : ''} style={{ minHeight: '100vh', background: 'var(--tw-bg)', fontFamily: 'Montserrat, sans-serif', display: 'flex', overflowX: 'hidden' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }

        /* Sidebar interno eliminado — navegación vive en GlobalHeader */

        /* ── Grids responsive ── */

        /* KPIs inicio: 4 col desktop, 2×2 tablet/mobile */
        .grid-kpis-emp { display: grid; gap: 10px; }
        @media (min-width: 701px)  { .grid-kpis-emp { grid-template-columns: repeat(4, 1fr); } }
        @media (max-width: 700px)  { .grid-kpis-emp { grid-template-columns: repeat(2, 1fr); } }

        /* KPIs historial/perfil (3 col): 3 col desktop, 3 col tablet, 1 col mobile */
        .grid-kpis-3 { display: grid; gap: 10px; }
        @media (min-width: 480px)  { .grid-kpis-3 { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 479px)  { .grid-kpis-3 { grid-template-columns: repeat(2, 1fr); } }

        /* ── Settings negocio: col derecha ── */
        @media (min-width: 900px) {
          .settings-col-neg { display: block !important; }
        }

        /* Pedidos activos: 2 col en desktop ancho, 1 col resto */
        .grid-pedidos-emp { display: grid; gap: 14px; }
        @media (min-width: 1000px) { .grid-pedidos-emp { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 701px) and (max-width: 999px) { .grid-pedidos-emp { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 700px)  { .grid-pedidos-emp { grid-template-columns: 1fr; } }

        /* Detalle pedido: en mobile ocupa pantalla completa */
        @media (max-width: 700px) {
          .detalle-overlay { display: none !important; }
          .detalle-panel { border-left: none !important; }
        }

        /* Calculadora: 2 col desktop, 1 col mobile */
        .grid-calc { display: grid; gap: 20px; align-items: start; }
        @media (min-width: 800px) { .grid-calc { grid-template-columns: 1fr minmax(240px,360px); } }
        @media (max-width: 799px) { .grid-calc { grid-template-columns: 1fr; } }

        /* Guía: 2 col desktop, 1 col mobile */
        .grid-guia { display: grid; gap: 20px; align-items: start; }
        @media (min-width: 800px) { .grid-guia { grid-template-columns: 1fr minmax(200px,320px); } }
        @media (max-width: 799px) { .grid-guia { grid-template-columns: 1fr; } }

        /* Perfil empresa: grid 1fr 1fr → 1fr en mobile */
        .grid-empresa-form { display: grid; gap: 10px; }
        @media (min-width: 560px) { .grid-empresa-form { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 559px) { .grid-empresa-form { grid-template-columns: 1fr; } }

        /* ── Carrito: layout ── */
        /* Desktop: 2 columnas */
        .carrito-desktop-layout { display: grid; grid-template-columns: 1fr 300px; gap: 24px; align-items: flex-start; }
        .carrito-resumen-sticky { position: sticky; top: calc(var(--header-h, 52px) + 16px); }
        /* Mobile: oculto en desktop, visible en mobile */
        .carrito-mobile-layout { display: none; }
        .carrito-barra-fija { display: none; }
        @media (max-width: 700px) {
          .carrito-desktop-layout { display: none; }
          .carrito-mobile-layout { display: flex; flex-direction: column; }
          .carrito-barra-fija {
            display: block;
            position: fixed; bottom: 0; left: 0; right: 0;
            background: var(--tw-bg);
            border-top: 2px solid var(--tw-border);
            z-index: 50;
          }
        }
        /* ── Carrito: banner envío ── */
        .carrito-banner-envio {
          display: flex; justify-content: space-between; align-items: center;
          padding: 9px 14px; border-radius: 9px; border: 1px solid;
          margin-bottom: 14px; font-size: 12px;
        }
        /* ── Carrito: item row (estilo Temu) ── */
        .carrito-item-row {
          display: flex; align-items: flex-start; gap: 0;
          padding: 12px 4px; border-bottom: 1px solid var(--tw-border);
        }
        .carrito-item-check {
          width: 28px; flex-shrink: 0; display: flex; align-items: center;
          justify-content: center; padding-top: 28px;
        }
        .carrito-item-check--checked {
          width: 20px; height: 20px; border-radius: 50%;
          background: var(--tw-terra);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; cursor: pointer;
        }
        .carrito-item-check--checked::after { content: '✓'; color: #fff; font-size: 11px; font-weight: 800; }
        .carrito-item-photo {
          width: 90px; height: 90px; flex-shrink: 0; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 36px; position: relative; margin: 0 2px;
        }
        /* ── Carrito: stepper ── */
        .carrito-stepper {
          display: flex; align-items: center;
          border: 1px solid var(--tw-border); border-radius: 7px; overflow: hidden;
        }
        .carrito-stepper-btn {
          width: 30px; height: 30px; background: none; border: none;
          color: var(--tw-text); font-size: 16px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .carrito-stepper-val {
          min-width: 24px; text-align: center; font-size: 13px;
          font-weight: 700; color: var(--tw-text);
        }
        .carrito-stepper--sm .carrito-stepper-btn { width: 24px; height: 24px; font-size: 14px; }
        .carrito-stepper--sm .carrito-stepper-val { font-size: 11px; min-width: 20px; }
        /* ── Carrito: barra fija inferior (mobile) ── */
        .carrito-barra-descuento {
          background: var(--tw-sage); color: #fff;
          font-size: 10px; font-weight: 700;
          text-align: center; padding: 5px 12px;
        }
        .carrito-barra-main {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 14px 12px;
        }
        .carrito-barra-precio { flex: 1; }
        .carrito-barra-btn {
          flex: 2; padding: 12px 16px; border-radius: 11px; border: none;
          background: var(--tw-terra); color: #fff;
          font-size: 12px; font-weight: 700; cursor: pointer;
          text-align: center; line-height: 1.3;
        }
        .carrito-barra-btn small { display: block; font-size: 9px; font-weight: 400; opacity: .85; }
        .carrito-pago-btn-mobile { display: none; }
        @media (max-width: 700px) { .carrito-pago-btn-mobile { display: block; } }

        /* Tabs de ajustes: scroll horizontal en mobile */
        .settings-tabs { display: flex; overflow-x: auto; -webkit-overflow-scrolling: touch; gap: 4px; border-bottom: 1px solid var(--tw-border); margin-bottom: 20px; }
        .settings-tabs::-webkit-scrollbar { display: none; }
        /* Mobile: menú lista visible, tabs ocultos */
        @media (max-width: 600px) {
          .perfil-menu-mobile { display: block; }
          .settings-tabs-desktop { display: none !important; }
          .perfil-back-btn { display: flex !important; }
        }
        /* Desktop: menú lista oculto, tabs visibles */
        @media (min-width: 601px) {
          .perfil-menu-mobile { display: none; }
          .perfil-back-btn { display: none !important; }
        }
      `}</style>

      {/* Main content — sin sidebar interno, navegación en GlobalHeader */}
      <div style={{ flex: 1, minHeight: '100vh', minWidth: 0, overflowX: 'hidden' }}>
        {tab === 'catalogo' ? (
          renderCatalogo()
        ) : (
        <div style={{ padding: '16px 18px 40px', maxWidth: 1380, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: '0 0 2px', fontSize: 11, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {NAV_ITEMS.find(n => n.id === tab)?.emoji} {NAV_ITEMS.find(n => n.id === tab)?.label}
              </p>
              <h1 style={{ margin: 0, fontSize: 24, fontFamily: 'Cormorant Garamond, serif', color: 'var(--tw-text)', fontWeight: 700 }}>{nombreLocal}</h1>
              {distritoLocal && <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--tw-text-muted)' }}>{distritoLocal}</p>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Bell badge de notificaciones */}
              <button onClick={() => { setCentroNotifOpen(true); setTab('perfil'); setSettingsTabNeg('notificaciones') }}
                style={{ position: 'relative', width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--tw-border)', background: 'var(--tw-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                🔔
                {(() => { const unread = generarNotificaciones().filter(n => !n.leida).length; return unread > 0 ? <span style={{ position: 'absolute', top: -3, right: -3, minWidth: 16, height: 16, borderRadius: '50%', background: 'var(--tw-terra)', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>{unread > 9 ? '9+' : unread}</span> : null })()}
              </button>
              <a href="/" onClick={(e) => { e.preventDefault(); navigate('/') }} style={{ fontSize: 12, padding: '10px 16px', borderRadius: 8, background: 'var(--tw-terra)', color: 'var(--tw-text-inverse)', textDecoration: 'none', fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>+ Pedido</a>
            </div>
          </div>

          {/* Banner PENDING_APPROVAL B2B — US-10 */}
          {usuario?.empresa?.estadoAprobacion === 'PENDING_APPROVAL' && (
            <div style={{
              background: 'rgba(232,184,75,0.12)', border: '1px solid rgba(232,184,75,0.35)',
              borderRadius: 10, padding: '10px 16px', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 16 }}>⏳</span>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#e8b84b', fontFamily: 'Montserrat, sans-serif' }}>
                  Tu cuenta de empresa está en revisión por el equipo de TunayWasi
                </div>
                <div style={{ fontSize: 11, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif', marginTop: 2 }}>
                  Los precios mayoristas (S/kg) y cotizaciones estarán disponibles una vez aprobada tu cuenta (≤24h hábiles).
                </div>
              </div>
            </div>
          )}
          {usuario?.empresa?.estadoAprobacion === 'REJECTED' && (
            <div style={{
              background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 10, padding: '10px 16px', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 16 }}>❌</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', fontFamily: 'Montserrat, sans-serif' }}>Solicitud de empresa rechazada</div>
                {usuario.empresa.motivoRechazo && (
                  <div style={{ fontSize: 11, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif', marginTop: 2 }}>{usuario.empresa.motivoRechazo}</div>
                )}
              </div>
            </div>
          )}

          {tab === 'mis_compras' && renderMisCompras()}
          {tab === 'carrito'     && renderCarrito()}
          {tab === 'perfil'      && renderPerfil()}
          {tab === 'wasi' && (
            <div style={{ height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}>
              <WasiChat rol="buyer_b2b" nombreUsuario={nombreLocal} />
            </div>
          )}
        </div>
        )}

      </div>

      {/* Modales */}
      {pedidoACalificar && (
        <ModalCalificacion
          pedido={pedidoACalificar}
          usuarioId={usuarioId}
          isDemo={isDemo}
          onToast={toast}
          onDone={() => {
            setPedidos(prev => prev.map(p => p.id === pedidoACalificar!.id ? { ...p, calificado: true } : p))
            setPedidoACalificar(null)
          }}
        />
      )}

      {editandoPerfil && (
        <ModalEditarPerfil
          usuario={usuario}
          usuarioId={usuarioId}
          isDemo={isDemo}
          onClose={() => setEditandoPerfil(false)}
          onToast={toast}
          onUpdate={(updates) => setUsuario(prev => prev ? { ...prev, ...updates } : prev)}
        />
      )}

      {/* Modal nueva cotización (desde catálogo — producto NEGOTIABLE) */}
      {modalNuevaCotiz && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 16 }}>
          <div style={{ background: 'var(--tw-card)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 420, border: `1px solid var(--tw-border)` }}>
            <h3 style={{ margin: '0 0 4px', fontFamily: 'Cormorant Garamond, serif', fontSize: 20, color: 'var(--tw-text)' }}>Solicitar cotización</h3>
            <p style={{ fontSize: 12, color: 'var(--tw-terra)', marginBottom: 20 }}>{modalNuevaCotiz.nombre} · {modalNuevaCotiz.caficultorNombre}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--tw-text-muted)', display: 'block', marginBottom: 4 }}>Cantidad (kg)</label>
                <input type="number" min="1" value={nuevaCotizForm.kg}
                  onChange={e => setNuevaCotizForm(f => ({ ...f, kg: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: `1px solid var(--tw-border)`, background: 'var(--tw-bg)', color: 'var(--tw-text)', fontSize: 13, fontFamily: 'Montserrat, sans-serif' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--tw-text-muted)', display: 'block', marginBottom: 4 }}>Precio ofertado por kg (S/)</label>
                <input type="number" step="0.01" min="0" value={nuevaCotizForm.precioCents}
                  onChange={e => setNuevaCotizForm(f => ({ ...f, precioCents: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: `1px solid var(--tw-border)`, background: 'var(--tw-bg)', color: 'var(--tw-text)', fontSize: 13, fontFamily: 'Montserrat, sans-serif' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--tw-text-muted)', display: 'block', marginBottom: 4 }}>Plazo de entrega requerido</label>
                <input type="text" placeholder="Ej: 15 días" value={nuevaCotizForm.plazo}
                  onChange={e => setNuevaCotizForm(f => ({ ...f, plazo: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: `1px solid var(--tw-border)`, background: 'var(--tw-bg)', color: 'var(--tw-text)', fontSize: 13, fontFamily: 'Montserrat, sans-serif' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--tw-text-muted)', display: 'block', marginBottom: 4 }}>Mensaje / condiciones adicionales (opcional)</label>
                <textarea rows={3} value={nuevaCotizForm.mensaje}
                  onChange={e => setNuevaCotizForm(f => ({ ...f, mensaje: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: `1px solid var(--tw-border)`, background: 'var(--tw-bg)', color: 'var(--tw-text)', fontSize: 13, fontFamily: 'Montserrat, sans-serif', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={handleEnviarNuevaCotizacion} disabled={nuevaCotizEnviando}
                style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: nuevaCotizEnviando ? 'default' : 'pointer', opacity: nuevaCotizEnviando ? 0.6 : 1, fontFamily: 'Montserrat, sans-serif' }}>
                {nuevaCotizEnviando ? 'Enviando...' : 'Enviar cotización →'}
              </button>
              <button onClick={() => setModalNuevaCotiz(null)}
                style={{ padding: '10px 16px', borderRadius: 8, border: `1px solid var(--tw-border)`, background: 'none', color: 'var(--tw-text-muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar cancelación de pedido (US-447) */}
      {modalCancelarPedido && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', padding: 20 }}
          onClick={() => !cancelandoPedido && setModalCancelarPedido(null)}>
          <div style={{ background: 'var(--tw-card)', borderRadius: 16, padding: '28px 24px', width: '100%', maxWidth: 400, border: '1px solid var(--tw-border)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: 20, fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, color: 'var(--tw-text)' }}>Cancelar pedido</h3>
            <p style={{ margin: '0 0 6px', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--tw-text-muted)' }}>{modalCancelarPedido.id}</p>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--tw-text-muted)', lineHeight: 1.6 }}>
              Se cancelará el pedido y recibirás un reembolso íntegro de <strong style={{ color: 'var(--tw-terra)' }}>{(() => { const c = modalCancelarPedido.totalCents; return `S/ ${(c/100).toFixed(2)}` })()}</strong> en 3–5 días hábiles.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setModalCancelarPedido(null)}
                disabled={cancelandoPedido}
                style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: '1px solid var(--tw-border)', background: 'transparent', color: 'var(--tw-text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                Mantener pedido
              </button>
              <button
                onClick={() => handleCancelarPedido(modalCancelarPedido)}
                disabled={cancelandoPedido}
                style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 700, cursor: cancelandoPedido ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat, sans-serif', opacity: cancelandoPedido ? 0.7 : 1 }}>
                {cancelandoPedido ? 'Cancelando...' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <Toast msgs={toasts} onRemove={id => setToasts(prev => prev.filter(t => t.id !== id))} />
    </div>
  )
}

export default PortalEmprendedor
