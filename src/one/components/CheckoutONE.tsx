/**
 * CheckoutONE.tsx — Checkout multi-ítem de TunayWasi ONE
 *
 * Layout desktop: 2 columnas — izquierda formulario, derecha resumen sticky
 * Layout mobile: 1 columna — resumen arriba plegable, formulario abajo
 *
 * Paso 1 — Carrito: ítems editables + local + dirección + menú
 * Paso 2 — Pago: Yape / Transferencia + voucher
 * Paso 3 — Confirmación
 */
import React, { useState, useRef, useEffect } from 'react'
import type { FormatoONE, LogisticaCaficultorONE, ReposicionItemConfig, FrecuenciaReposicion } from '../types'
import { createPedido, subirVoucher, fetchMenusByNegocio, fetchLogisticaCaficultor, createReposicion, linkReposicionesToPedido } from '../service'
import {
  demoCreatePedido,
  demoSubirVoucher,
  demoUploadVoucher,
  demoFetchMenusByNegocio,
  demoFetchLogisticaCaficultor,
  demoCreateReposicion,
  demoLinkReposicionesToPedido,
} from '../demoService'
import { ONE_CONFIG, FORMATO_LABELS, calcularPrecioFinal } from '../config'
import type { ItemCarrito } from '../../AppONE'
import type { MenuONE } from '../types'

// ─── Paleta ───────────────────────────────────────────────────────────────────

const PROCESO_COLORS: Record<string, string> = {
  lavado: '#4a90c4', natural: '#c96e4b', honey: '#d4a017', anaerobico: '#9b59b6',
}

function formatCents(cents: number): string {
  return `S/ ${(cents / 100).toFixed(0)}`
}

async function uploadToCloudinary(file: File, isDemo: boolean): Promise<string> {
  if (isDemo) return demoUploadVoucher(file)
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)
  formData.append('folder', 'one_vouchers')
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData })
  if (!res.ok) throw new Error('Error al subir el voucher')
  const data = await res.json()
  return data.secure_url as string
}

// ─── Átomos ───────────────────────────────────────────────────────────────────

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label style={{
    display: 'block', marginBottom: 8,
    fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
    color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif', textTransform: 'uppercase',
  }}>
    {children}
  </label>
)

const Field: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => {
  const [focused, setFocused] = useState(false)
  return (
    <input
      {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
      style={{
        width: '100%', boxSizing: 'border-box',
        padding: '13px 16px', borderRadius: 8,
        border: `1px solid ${focused ? 'var(--tw-terra)' : 'var(--tw-border)'}`,
        fontSize: 14, fontFamily: 'Montserrat, sans-serif',
        color: 'var(--tw-text)', background: 'var(--tw-card)',
        outline: 'none', transition: 'border-color 0.15s',
        ...props.style,
      }}
    />
  )
}

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => {
  const [focused, setFocused] = useState(false)
  return (
    <select
      {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
      style={{
        width: '100%', boxSizing: 'border-box',
        padding: '13px 16px', borderRadius: 8,
        border: `1px solid ${focused ? 'var(--tw-terra)' : 'var(--tw-border)'}`,
        fontSize: 14, fontFamily: 'Montserrat, sans-serif',
        color: props.value ? 'var(--tw-text)' : 'var(--tw-text-faint)',
        background: 'var(--tw-card)', outline: 'none',
        transition: 'border-color 0.15s', cursor: 'pointer',
        ...props.style,
      }}
    />
  )
}

const PrimaryBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...props }) => (
  <button
    {...props}
    style={{
      width: '100%', padding: '16px 0', borderRadius: 10, border: 'none',
      fontSize: 15, fontWeight: 700, letterSpacing: '0.04em',
      fontFamily: 'Montserrat, sans-serif',
      background: props.disabled
        ? 'var(--tw-border)'
        : `linear-gradient(135deg, ${'var(--tw-terra)'} 0%, ${'var(--tw-terra-h)'} 100%)`,
      color: props.disabled ? 'var(--tw-text-faint)' : 'var(--tw-text-inverse)',
      cursor: props.disabled ? 'not-allowed' : 'pointer',
      transition: 'opacity 0.15s, transform 0.1s',
      boxShadow: props.disabled ? 'none' : `0 4px 20px ${'var(--tw-terra)'}44`,
      ...props.style,
    }}
  >
    {children}
  </button>
)

const GhostBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...props }) => (
  <button
    {...props}
    style={{
      width: '100%', padding: '13px 0', borderRadius: 10,
      border: `1px solid ${'var(--tw-border)'}`, background: 'transparent',
      fontSize: 13, fontFamily: 'Montserrat, sans-serif', fontWeight: 600,
      color: 'var(--tw-text-muted)', cursor: 'pointer',
      ...props.style,
    }}
  >
    {children}
  </button>
)

// ─── StepIndicator ────────────────────────────────────────────────────────────

const StepIndicator: React.FC<{ step: number; labels: string[] }> = ({ step, labels }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 32 }}>
    {labels.map((label, i) => {
      const n = i + 1
      const active = step >= n
      const current = step === n
      const totalSteps = labels.length
      return (
        <React.Fragment key={n}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: active ? 'var(--tw-terra)' : 'var(--tw-card)',
              border: `1px solid ${active ? 'var(--tw-terra)' : 'var(--tw-border)'}`,
              color: active ? 'var(--tw-text-inverse)' : 'var(--tw-text-faint)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, fontFamily: 'Montserrat, sans-serif',
              transition: 'all 0.2s',
              boxShadow: current ? `0 0 0 3px ${'var(--tw-terra)'}33` : 'none',
            }}>
              {step > n ? '✓' : n}
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: active ? 'var(--tw-text-muted)' : 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.06em' }}>
              {label}
            </span>
          </div>
          {n < totalSteps && <div style={{ width: 56, height: 1, background: step > n ? 'var(--tw-terra)' : 'var(--tw-border)', margin: '0 4px 16px', transition: 'background 0.3s' }} />}
        </React.Fragment>
      )
    })}
  </div>
)

// ─── Panel de resumen (derecha / mobile-top) ──────────────────────────────────

const ResumenPedido: React.FC<{
  lineas: ItemCarrito[]
  menuNombre: string
  totalCents: number
  agenciaNombre?: string
  compact?: boolean
}> = ({ lineas, menuNombre, totalCents, agenciaNombre, compact }) => {
  const [expandido, setExpandido] = useState(!compact)
  const subtotalCents = lineas.reduce((s, l) => {
    const p = calcularPrecioFinal(l.producto.precioBaseKgCents, l.formato)
    return s + p * l.qty
  }, 0)

  return (
    <div style={{
      background: 'var(--tw-card)', borderRadius: 16,
      border: `1px solid ${'var(--tw-border)'}`,
      overflow: 'hidden',
    }}>
      {/* Cabecera del resumen */}
      <div
        style={{
          padding: '18px 22px',
          background: `linear-gradient(135deg, ${'var(--tw-section-dark)'}cc, '#0d1e14')`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: compact ? 'pointer' : 'default',
        }}
        onClick={() => compact && setExpandido(v => !v)}
      >
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--tw-sage)', fontFamily: 'Montserrat, sans-serif', textTransform: 'uppercase' }}>
            Tu pedido
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif' }}>
            {formatCents(totalCents)}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 24, display: 'block' }}>☕</span>
          {compact && (
            <span style={{ fontSize: 12, color: 'var(--tw-sage)' }}>{expandido ? '▲' : '▼'}</span>
          )}
        </div>
      </div>

      {expandido && (
        <div style={{ padding: '16px 22px 20px' }}>
          {/* Ítems */}
          <div style={{ marginBottom: 16 }}>
            {lineas.map((l, i) => {
              const precio = calcularPrecioFinal(l.producto.precioBaseKgCents, l.formato)
              const procesoColor = PROCESO_COLORS[l.producto.proceso] ?? 'var(--tw-terra)'
              return (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  paddingBottom: 12, marginBottom: 12,
                  borderBottom: `1px solid ${'var(--tw-border)'}`,
                }}>
                  <div style={{ display: 'flex', gap: 10, flex: 1 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 6, flexShrink: 0,
                      background: procesoColor + '22',
                      border: `1px solid ${procesoColor}44`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16,
                    }}>☕</div>
                    <div>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif', lineHeight: 1.3 }}>
                        {l.producto.nombre.split(' — ')[0]}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif' }}>
                        {FORMATO_LABELS[l.formato]} × {l.qty}
                      </p>
                    </div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif', flexShrink: 0, marginLeft: 8 }}>
                    {formatCents(precio * l.qty)}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Subtotal + delivery */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif' }}>Subtotal</span>
            <span style={{ fontSize: 12, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>{formatCents(subtotalCents)}</span>
          </div>
          {ONE_CONFIG.DELIVERY_CENTS > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif' }}>Delivery</span>
              <span style={{ fontSize: 12, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>{formatCents(ONE_CONFIG.DELIVERY_CENTS)}</span>
            </div>
          )}

          {/* Total */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderTop: `1px solid ${'var(--tw-border)'}`, paddingTop: 12, marginTop: 6,
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif' }}>Total</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--tw-terra)', fontFamily: 'Montserrat, sans-serif' }}>{formatCents(totalCents)}</span>
          </div>

          {/* Agencia seleccionada */}
          {agenciaNombre && (
            <div style={{
              marginTop: 14, padding: '10px 14px', borderRadius: 8,
              background: '#0d1a0d', border: `1px solid ${'var(--tw-sage)'}33`,
            }}>
              <span style={{ fontSize: 11, color: 'var(--tw-sage)', fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}>
                📦 Envío por: {agenciaNombre}
              </span>
            </div>
          )}

          {/* Menú asignado */}
          {menuNombre && menuNombre !== 'Sin categorizar' && (
            <div style={{
              marginTop: 14, padding: '10px 14px', borderRadius: 8,
              background: 'var(--tw-section-dark)' + '33', border: `1px solid ${'var(--tw-sage)'}33`,
            }}>
              <span style={{ fontSize: 11, color: 'var(--tw-sage)', fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}>
                📋 Asignado a: {menuNombre}
              </span>
            </div>
          )}


          {/* Garantía */}
          <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 15, flexShrink: 0 }}>🔒</span>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif', lineHeight: 1.5 }}>
              Pedido confirmado solo cuando verificamos tu pago. Sin riesgo.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Paso 1: Carrito + datos del local ───────────────────────────────────────

const DISTRITOS_LIMA = [
  'Ate', 'Barranco', 'Breña', 'Chorrillos', 'Jesús María',
  'La Molina', 'La Victoria', 'Lima Cercado', 'Lince',
  'Magdalena del Mar', 'Miraflores', 'Pueblo Libre', 'San Borja',
  'San Isidro', 'San Miguel', 'Santiago de Surco', 'Surquillo',
]

interface Paso1Props {
  lineas: ItemCarrito[]
  menuId: string
  menus: MenuONE[]
  nombreLocal: string
  distritoLocal: string
  direccionEntrega: string
  logisticas: LogisticaCaficultorONE[]
  agenciaSeleccionada: string
  b2bAprobado?: boolean
  reposicionConfig?: ReposicionItemConfig[]
  onLineasChange: (l: ItemCarrito[]) => void
  onMenuIdChange: (id: string) => void
  onNombreLocalChange: (v: string) => void
  onDistritoLocalChange: (v: string) => void
  onDireccionChange: (v: string) => void
  onAgenciaChange: (id: string) => void
  onReposicionChange?: (config: ReposicionItemConfig[]) => void
  onNext: () => void
}

const Paso1Form: React.FC<Paso1Props> = ({
  lineas, menuId, menus, nombreLocal, distritoLocal, direccionEntrega,
  logisticas, agenciaSeleccionada, b2bAprobado, reposicionConfig,
  onLineasChange, onMenuIdChange, onNombreLocalChange, onDistritoLocalChange, onDireccionChange,
  onAgenciaChange, onReposicionChange, onNext,
}) => {
  function setFormato(idx: number, formato: FormatoONE) {
    onLineasChange(lineas.map((l, i) => i === idx ? { ...l, formato } : l))
  }
  function setQty(idx: number, delta: number) {
    onLineasChange(lineas.map((l, i) => i === idx ? { ...l, qty: Math.max(1, l.qty + delta) } : l))
  }
  function quitar(idx: number) {
    onLineasChange(lineas.filter((_, i) => i !== idx))
  }

  // Unir todas las agencias activas de todos los caficultores del pedido, sin duplicados
  const agenciasDisponibles: { id: string; nombre: string; domicilio: boolean; origen: string; diasMin?: number; diasMax?: number }[] = []
  const agenciasSeen = new Set<string>()
  for (const log of logisticas) {
    for (const agId of Object.keys(log.agenciasActivas ?? {})) {
      if (log.agenciasActivas[agId] && !agenciasSeen.has(agId)) {
        agenciasSeen.add(agId)
        const detalle = log.agenciasDetalle?.[agId]
        agenciasDisponibles.push({
          id: agId,
          nombre: log.agenciasMap?.[agId] ?? agId,
          domicilio: detalle?.permiteDomicilio ?? log.agenciasPermiteDomicilio?.[agId] ?? false,
          origen: log.origenTexto ?? '',
          diasMin: detalle?.diasMin,
          diasMax: detalle?.diasMax,
        })
      }
    }
  }

  // Reglas de envío gratis del primer caficultor (asume pedido de un solo caficultor)
  const logPrincipal = logisticas[0]
  const gratisAgenciaActivo = logPrincipal?.gratisAgenciaActivo ?? false
  const gratisAgenciaKg = logPrincipal?.gratisAgenciaKg ?? 5
  const gratisDomicilioActivo = logPrincipal?.gratisDomicilioActivo ?? false
  const gratisDomicilioKg = logPrincipal?.gratisDomicilioKg ?? 15
  const tarifaFijaDomicilio = logPrincipal?.tarifaFijaDomicilioSoles ?? 0

  const hayAgencias = agenciasDisponibles.length > 0
  const canContinue = lineas.length > 0
    && direccionEntrega.trim().length > 3
    && nombreLocal.trim().length > 0
    && (!hayAgencias || agenciaSeleccionada !== '')

  if (lineas.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <p style={{ fontSize: 48, marginBottom: 16 }}>🛒</p>
        <p style={{ color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 15, marginBottom: 24 }}>
          Tu carrito está vacío
        </p>
        <a href="#/" style={{
          display: 'inline-block', padding: '14px 32px', borderRadius: 10,
          background: 'var(--tw-terra)', color: 'var(--tw-text-inverse)', textDecoration: 'none',
          fontSize: 14, fontWeight: 700, fontFamily: 'Montserrat, sans-serif',
        }}>
          Explorar catálogo →
        </a>
      </div>
    )
  }

  return (
    <div>
      {/* ── Sección: Tus cafés ── */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Tus cafés ({lineas.length})
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lineas.map((linea, idx) => {
            const precioFormato = calcularPrecioFinal(linea.producto.precioBaseKgCents, linea.formato)
            const subtotal = precioFormato * linea.qty
            const procesoColor = PROCESO_COLORS[linea.producto.proceso] ?? 'var(--tw-terra)'
            return (
              <div key={idx} style={{
                background: 'var(--tw-card)', borderRadius: 12, border: `1px solid ${'var(--tw-border)'}`,
                overflow: 'hidden',
              }}>
                {/* Franja superior de color del proceso */}
                <div style={{ height: 3, background: procesoColor }} />
                <div style={{ padding: '14px 16px' }}>
                  {/* Header producto */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif', lineHeight: 1.3 }}>
                        {linea.producto.nombre}
                      </p>
                      <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif' }}>
                        {linea.producto.caficultorNombre}
                      </p>
                    </div>
                    <button
                      onClick={() => quitar(idx)}
                      style={{ background: 'none', border: 'none', color: 'var(--tw-text-faint)', cursor: 'pointer', fontSize: 15, padding: '2px', lineHeight: 1, flexShrink: 0 }}
                      title="Quitar"
                    >✕</button>
                  </div>

                  {/* Selector de formato */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 14 }}>
                    {(['1kg', '5kg', '10kg', '20kg'] as FormatoONE[]).map(f => {
                      const precio = calcularPrecioFinal(linea.producto.precioBaseKgCents, f)
                      const activo = linea.formato === f
                      return (
                        <button
                          key={f}
                          onClick={() => setFormato(idx, f)}
                          style={{
                            padding: '8px 4px', borderRadius: 8, cursor: 'pointer',
                            border: `1px solid ${activo ? procesoColor : 'var(--tw-border)'}`,
                            background: activo ? procesoColor + '18' : 'var(--tw-card-hover)',
                            textAlign: 'center', transition: 'all 0.15s',
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 700, color: activo ? procesoColor : 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>
                            {FORMATO_LABELS[f]}
                          </div>
                          <div style={{ fontSize: 11, color: activo ? procesoColor : 'var(--tw-text-faint)', marginTop: 2, fontFamily: 'Montserrat, sans-serif' }}>
                            {formatCents(precio)}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Chips cantidad frecuente */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    {[
                      { qty: 3, label: '3 kg · Prueba' },
                      { qty: 5, label: '5 kg · Semanal' },
                      { qty: 10, label: '10 kg · Quincenal' },
                      { qty: 15, label: '15 kg · Mensual' },
                    ].map(op => (
                      <button
                        key={op.qty}
                        onClick={() => onLineasChange(lineas.map((l, i) => i === idx ? { ...l, qty: op.qty } : l))}
                        style={{ padding: '4px 10px', borderRadius: 20, border: `1px solid ${linea.qty === op.qty ? procesoColor : 'var(--tw-border)'}`, background: linea.qty === op.qty ? procesoColor + '18' : 'none', color: linea.qty === op.qty ? procesoColor : 'var(--tw-text-muted)', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', whiteSpace: 'nowrap' }}
                      >{op.label}</button>
                    ))}
                  </div>

                  {/* Cantidad + subtotal */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'var(--tw-card-hover)', borderRadius: 8, border: `1px solid ${'var(--tw-border)'}`, overflow: 'hidden' }}>
                      <button
                        onClick={() => setQty(idx, -1)}
                        style={{ width: 36, height: 36, background: 'none', border: 'none', color: 'var(--tw-text-muted)', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >−</button>
                      <span style={{ minWidth: 32, textAlign: 'center', fontSize: 15, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif' }}>
                        {linea.qty}
                      </span>
                      <button
                        onClick={() => setQty(idx, 1)}
                        style={{ width: 36, height: 36, background: 'none', border: 'none', color: 'var(--tw-text-muted)', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >+</button>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--tw-terra)', fontFamily: 'Montserrat, sans-serif' }}>
                        {formatCents(subtotal)}
                      </span>
                    </div>
                  </div>

                  {/* Reposición automática — solo B2B aprobado (ABAST-01) */}
                  {b2bAprobado && reposicionConfig && onReposicionChange && (() => {
                    const cfg = reposicionConfig[idx]
                    if (!cfg) return null
                    return (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--tw-border)' }}>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={cfg.activa}
                            onChange={() => onReposicionChange(reposicionConfig.map((c, i) => i === idx ? { ...c, activa: !c.activa } : c))}
                            style={{ marginTop: 2, accentColor: 'var(--tw-sage)', width: 14, height: 14, flexShrink: 0 }}
                          />
                          <span style={{ fontSize: 11, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif', lineHeight: 1.5 }}>
                            📅 <strong style={{ color: 'var(--tw-text)' }}>Programar reposición:</strong> Recibir este lote cada 15 días automáticamente con prioridad de tueste.
                            {cfg.esTypeA && (
                              <span style={{ display: 'block', marginTop: 4, fontSize: 10, color: '#d4a017' }}>
                                ⚠️ Café verde: no garantizamos el mismo lote en la reposición.
                              </span>
                            )}
                          </span>
                        </label>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )
          })}
        </div>

        <a href="#/" style={{ display: 'inline-block', marginTop: 10, fontSize: 12, color: 'var(--tw-terra)', textDecoration: 'none', fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}>
          + Agregar más cafés al catálogo
        </a>

        {/* ── Nudge envío gratis — usa reglas reales del caficultor (SHP-03) ── */}
        {gratisAgenciaActivo && (() => {
          const kgPorFormatoMap: Record<FormatoONE, number> = { '250g': 0.25, '500g': 0.5, '1kg': 1, '5kg': 5, '10kg': 10, '20kg': 20, '1quintal': 46, '1saco': 60 }
          const totalKg = lineas.reduce((s, l) => s + (kgPorFormatoMap[l.formato as FormatoONE] ?? 1) * l.qty, 0)
          const faltaKg = gratisAgenciaKg - totalKg
          const pct = Math.min(100, (totalKg / gratisAgenciaKg) * 100)
          if (faltaKg <= 0) return (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(143,175,138,0.12)', border: '1px solid rgba(143,175,138,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🚚</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tw-sage)', fontFamily: 'Montserrat, sans-serif' }}>¡Envío gratis a agencia en tu pedido!</span>
            </div>
          )
          return (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'var(--tw-card)', border: '1px solid var(--tw-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>
                  🚚 Agrega <strong style={{ color: 'var(--tw-terra)' }}>{faltaKg.toFixed(1)} kg más</strong> para envío gratis a agencia
                </span>
                <span style={{ fontSize: 10, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>{Math.round(pct)}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'var(--tw-border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'var(--tw-terra)', borderRadius: 2, transition: 'width 0.3s' }} />
              </div>
            </div>
          )
        })()}
      </div>

      {/* ── Sección: Envío ── */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Agencia de envío
        </h3>
        <p style={{ margin: '0 0 14px', fontSize: 11, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif' }}>
          Selecciona la agencia de tu preferencia. El envío se calcula según el peso de tu pedido.
        </p>

        {!hayAgencias ? (
          <div style={{ padding: '14px 16px', borderRadius: 10, background: '#1a1200', border: '1px solid #c4901822', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#d4a017', fontFamily: 'Montserrat, sans-serif' }}>El caficultor aún no configuró sus envíos</p>
              <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif' }}>Puedes continuar — el caficultor aún no tiene agencias configuradas.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {agenciasDisponibles.map(ag => {
              const activa = agenciaSeleccionada === ag.id
              return (
                <button
                  key={ag.id}
                  onClick={() => onAgenciaChange(activa ? '' : ag.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                    border: `1px solid ${activa ? 'var(--tw-sage)' + '88' : 'var(--tw-border)'}`,
                    background: activa ? '#0d1f0d' : 'var(--tw-card)',
                    textAlign: 'left', transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 20 }}>📦</span>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif' }}>
                        {ag.nombre}
                      </p>
                      <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif' }}>
                        Despacho desde: {ag.origen}
                        {ag.domicilio && <span style={{ marginLeft: 8, color: 'var(--tw-sage)' }}>· Entrega a domicilio disponible</span>}
                        {(ag.diasMin != null && ag.diasMax != null) && (
                          <span style={{ marginLeft: 8, color: 'var(--tw-text-muted)' }}>· {ag.diasMin}–{ag.diasMax} días hábiles</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${activa ? 'var(--tw-sage)' : 'var(--tw-border)'}`,
                    background: activa ? 'var(--tw-sage)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {activa && <span style={{ fontSize: 10, color: '#000', fontWeight: 700 }}>✓</span>}
                  </div>
                </button>
              )
            })}
            {gratisDomicilioActivo && agenciaSeleccionada && agenciasDisponibles.find(a => a.id === agenciaSeleccionada)?.domicilio && (
              <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--tw-sage)', fontFamily: 'Montserrat, sans-serif' }}>
                🏠 Envío a domicilio gratis a partir de {gratisDomicilioKg} kg
                {tarifaFijaDomicilio > 0 && ` (tarifa fija: S/ ${tarifaFijaDomicilio.toFixed(2)})`}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Sección: Datos del local ── */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Tu local
        </h3>

        <div style={{ marginBottom: 14 }}>
          <Label>Nombre del local</Label>
          <Field
            placeholder="Ej. Café La Punta"
            value={nombreLocal}
            onChange={e => onNombreLocalChange(e.target.value)}
          />
        </div>

        <div className="checkout-local-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <Label>Distrito</Label>
            <Select value={distritoLocal} onChange={e => onDistritoLocalChange(e.target.value)}>
              <option value="">Seleccionar...</option>
              {DISTRITOS_LIMA.map(d => <option key={d} value={d}>{d}</option>)}
            </Select>
          </div>
          <div>
            <Label>Ciudad</Label>
            <Field value="Lima" disabled style={{ color: 'var(--tw-text-faint)', cursor: 'not-allowed' }} />
          </div>
        </div>

        {/* Dirección estructurada */}
        {(() => {
          const DEPARTAMENTOS = ['Amazonas','Áncash','Apurímac','Arequipa','Ayacucho','Cajamarca','Callao','Cusco','Huancavelica','Huánuco','Ica','Junín','La Libertad','Lambayeque','Lima','Loreto','Madre de Dios','Moquegua','Pasco','Piura','Puno','San Martín','Tacna','Tumbes','Ucayali']
          type TipoDireccion = 'finca' | 'agencia_courier' | 'otro'
          const [tipoDireccion, setTipoDireccion] = React.useState<TipoDireccion>('finca')
          const [calle, setCalle] = React.useState('')
          const [distrito, setDistrito] = React.useState('')
          const [provincia, setProvincia] = React.useState('')
          const [dpto, setDpto] = React.useState('Lima')
          const [referencia, setReferencia] = React.useState('')

          React.useEffect(() => {
            const partes = [calle, distrito, provincia, dpto].filter(Boolean)
            const full = partes.join(', ') + (referencia ? ` (${referencia})` : '')
            onDireccionChange(full)
          }, [calle, distrito, provincia, dpto, referencia])

          const tipoOpts: { id: TipoDireccion; emoji: string; label: string }[] = [
            { id: 'finca', emoji: '🏡', label: 'Finca / Casa' },
            { id: 'agencia_courier', emoji: '🏪', label: 'Agencia courier' },
            { id: 'otro', emoji: '🏢', label: 'Otro' },
          ]
          const selStyle = (sel: boolean): React.CSSProperties => ({
            flex: 1, padding: '8px 6px', borderRadius: 8, border: `1.5px solid ${sel ? 'var(--tw-terra)' : 'var(--tw-border)'}`,
            background: sel ? 'rgba(201,110,75,0.08)' : 'var(--tw-card)', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          })
          const iStyle: React.CSSProperties = {
            width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--tw-border)',
            background: 'var(--tw-card)', color: 'var(--tw-text)', fontSize: 12,
            fontFamily: 'Montserrat, sans-serif', outline: 'none', boxSizing: 'border-box',
          }
          return (
            <div style={{ marginBottom: 14 }}>
              <Label>Dirección de entrega</Label>
              {/* Tipo */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {tipoOpts.map(t => (
                  <div key={t.id} style={selStyle(tipoDireccion === t.id)} onClick={() => setTipoDireccion(t.id)}>
                    <span style={{ fontSize: 18 }}>{t.emoji}</span>
                    <span style={{ fontSize: 9, fontWeight: 600, color: tipoDireccion === t.id ? 'var(--tw-terra)' : 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif', textAlign: 'center' }}>{t.label}</span>
                  </div>
                ))}
              </div>
              {/* Calle */}
              <input style={{ ...iStyle, marginBottom: 8 }} placeholder={tipoDireccion === 'agencia_courier' ? 'Nombre de agencia y dirección' : 'Calle, número, urbanización'} value={calle} onChange={e => setCalle(e.target.value)} />
              {/* Distrito / Provincia */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <input style={iStyle} placeholder="Distrito" value={distrito} onChange={e => setDistrito(e.target.value)} />
                <input style={iStyle} placeholder="Provincia" value={provincia} onChange={e => setProvincia(e.target.value)} />
              </div>
              {/* Dpto */}
              <select style={{ ...iStyle, marginBottom: 8 }} value={dpto} onChange={e => setDpto(e.target.value)}>
                {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {/* Referencia */}
              <input style={iStyle} placeholder="Referencia adicional (opcional)" value={referencia} onChange={e => setReferencia(e.target.value)} />
            </div>
          )
        })()}
      </div>

      {/* ── Sección: Menú (opcional) ── */}
      {menus.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Asignar a menú
          </h3>
          <Select value={menuId} onChange={e => onMenuIdChange(e.target.value)}>
            <option value="sin-categorizar">Sin categorizar</option>
            {menus.map(m => (
              <option key={m.id} value={m.id}>{m.nombre}{m.activo ? ' ★' : ''}</option>
            ))}
          </Select>
          <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif' }}>
            Podrás cambiar esto desde "Mis menús" en tu portal.
          </p>
        </div>
      )}

      {/* ── Nudge envío gratis ── */}
      {(() => {
        const KG_UMBRAL = 5
        const totalKg = lineas.reduce((s, l) => {
          const kgPorFormato: Record<FormatoONE, number> = { '250g': 0.25, '500g': 0.5, '1kg': 1, '5kg': 5, '10kg': 10, '20kg': 20, '1quintal': 46, '1saco': 60 }
          return s + (kgPorFormato[l.formato] ?? 1) * l.qty
        }, 0)
        const faltanKg = Math.max(0, KG_UMBRAL - totalKg)
        const pct = Math.min(100, (totalKg / KG_UMBRAL) * 100)
        if (totalKg >= KG_UMBRAL) return (
          <div style={{ background: 'rgba(143,175,138,0.1)', border: '1px solid rgba(143,175,138,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <span style={{ fontSize: 12, color: 'var(--tw-sage)', fontWeight: 700 }}>¡Envío gratis a agencia incluido!</span>
          </div>
        )
        return (
          <div style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--tw-text)', marginBottom: 7 }}>
              <span>🚚 Agrega <strong>{faltanKg.toFixed(1)} kg más</strong> para Envío Gratis a Agencia</span>
              <span style={{ flexShrink: 0, marginLeft: 10, color: 'var(--tw-text-muted)', fontSize: 10 }}>{totalKg.toFixed(1)} / {KG_UMBRAL} kg</span>
            </div>
            <div style={{ height: 6, background: 'var(--tw-border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--tw-terra)', borderRadius: 3, transition: 'width 0.4s' }} />
            </div>
          </div>
        )
      })()}

      <PrimaryBtn onClick={onNext} disabled={!canContinue}>
        {canContinue ? 'Continuar al pago →' : 'Completa los campos para continuar'}
      </PrimaryBtn>

      {!canContinue && (
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--tw-text-faint)', marginTop: 8, fontFamily: 'Montserrat, sans-serif' }}>
          {!nombreLocal.trim() ? 'Falta el nombre de tu local · ' : ''}
          {!direccionEntrega.trim() ? 'Falta la dirección de entrega · ' : ''}
          {hayAgencias && !agenciaSeleccionada ? 'Selecciona una agencia de envío' : ''}
        </p>
      )}
    </div>
  )
}

// ─── Paso 2: Pago + voucher ───────────────────────────────────────────────────

function copiarAlPortapapeles(texto: string, setCopied: (v: boolean) => void) {
  navigator.clipboard.writeText(texto).then(() => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  })
}

interface Paso2FormProps {
  totalCents: number
  metodoPago: 'yape' | 'transferencia'
  onMetodoChange: (m: 'yape' | 'transferencia') => void
  onVoucherSubido: (url: string) => void
  onNext: () => void
  onBack: () => void
  cargando: boolean
  error: string | null
  isDemo: boolean
}

const Paso2Form: React.FC<Paso2FormProps> = ({
  totalCents, metodoPago, onMetodoChange, onVoucherSubido,
  onNext, onBack, cargando, error, isDemo,
}) => {
  const fileRef = useRef<HTMLInputElement>(null)
  const [voucherPreview, setVoucherPreview] = useState<string | null>(null)
  const [subiendoArchivo, setSubiendoArchivo] = useState(false)
  const [voucherUrl, setVoucherUrl] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [copiedNumero, setCopiedNumero] = useState(false)
  const [copiedCuenta, setCopiedCuenta] = useState(false)
  const [copiedCci, setCopiedCci] = useState(false)
  const [yapePagado, setYapePagado] = useState(false)

  // Al cambiar método, resetear estado de voucher y yape
  function handleMetodoChange(m: 'yape' | 'transferencia') {
    onMetodoChange(m)
    setVoucherPreview(null)
    setVoucherUrl(null)
    setUploadError(null)
    setYapePagado(false)
    onVoucherSubido('')
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setVoucherPreview(URL.createObjectURL(file))
    setSubiendoArchivo(true)
    setUploadError(null)
    try {
      const url = await uploadToCloudinary(file, isDemo)
      setVoucherUrl(url)
      onVoucherSubido(url)
    } catch {
      setVoucherPreview(null)
      setVoucherUrl(null)
      setUploadError('No se pudo subir el comprobante. Verifica tu conexión e inténtalo de nuevo.')
    } finally {
      setSubiendoArchivo(false)
    }
  }

  // Para Yape: puede confirmar sin voucher (voucher es opcional)
  // Para transferencia: voucher es obligatorio
  const puedeConfirmar = metodoPago === 'yape'
    ? yapePagado
    : !!(voucherUrl) && !subiendoArchivo

  return (
    <div>
      {/* Datos de pago — preview rápido antes de elegir método */}
      <div style={{
        marginBottom: 20, padding: '12px 16px', borderRadius: 10,
        background: '#0d1020', border: `1px solid ${'var(--tw-border)'}`,
        display: 'flex', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>📱</span>
          <div>
            <p style={{ margin: 0, fontSize: 10, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Yape</p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.04em' }}>{ONE_CONFIG.YAPE_NUMERO}</p>
          </div>
        </div>
        <div style={{ width: 1, background: 'var(--tw-border)', flexShrink: 0, alignSelf: 'stretch' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🏦</span>
          <div>
            <p style={{ margin: 0, fontSize: 10, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif', textTransform: 'uppercase', letterSpacing: '0.07em' }}>BCP · {ONE_CONFIG.BCP_TITULAR}</p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.04em' }}>{ONE_CONFIG.BCP_CUENTA}</p>
          </div>
        </div>
      </div>

      {/* Método de pago */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Método de pago
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {(['yape', 'transferencia'] as const).map(m => {
            const activo = metodoPago === m
            return (
              <button
                key={m}
                onClick={() => handleMetodoChange(m)}
                style={{
                  padding: '16px 12px', borderRadius: 10, cursor: 'pointer',
                  border: `1px solid ${activo ? 'var(--tw-terra)' : 'var(--tw-border)'}`,
                  background: activo ? 'var(--tw-terra)' + '18' : 'var(--tw-card)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  transition: 'all 0.15s',
                  boxShadow: activo ? `0 0 0 2px ${'var(--tw-terra)'}44` : 'none',
                }}
              >
                <span style={{ fontSize: 26 }}>{m === 'yape' ? '📱' : '🏦'}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: activo ? 'var(--tw-terra)' : 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>
                  {m === 'yape' ? 'Yape' : 'Transferencia'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif' }}>
                  {m === 'yape' ? 'Más rápido' : 'BCP'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── YAPE ── */}
      {metodoPago === 'yape' && (
        <div style={{ marginBottom: 28 }}>
          {/* Monto destacado */}
          <div style={{
            padding: '20px', borderRadius: 14, marginBottom: 14,
            background: `linear-gradient(135deg, ${'var(--tw-terra)'}22, ${'var(--tw-terra)'}0a)`,
            border: `1px solid ${'var(--tw-terra)'}44`, textAlign: 'center',
          }}>
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Monto a Yapear
            </p>
            <p style={{ margin: 0, fontSize: 36, fontWeight: 800, color: 'var(--tw-terra)', fontFamily: 'Montserrat, sans-serif' }}>
              {formatCents(totalCents)}
            </p>
          </div>

          {/* Número Yape con copy */}
          <div style={{ padding: '16px 18px', borderRadius: 12, background: 'var(--tw-card)', border: `1px solid ${'var(--tw-border)'}`, marginBottom: 14 }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Número Yape
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.05em' }}>
                {ONE_CONFIG.YAPE_NUMERO}
              </p>
              <button
                onClick={() => copiarAlPortapapeles(ONE_CONFIG.YAPE_NUMERO, setCopiedNumero)}
                style={{
                  flexShrink: 0, padding: '8px 14px', borderRadius: 8,
                  border: `1px solid ${copiedNumero ? 'var(--tw-sage)' : 'var(--tw-border)'}`,
                  background: copiedNumero ? 'var(--tw-sage)' + '22' : 'var(--tw-card-hover)',
                  color: copiedNumero ? 'var(--tw-sage)' : 'var(--tw-text-muted)',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'Montserrat, sans-serif', transition: 'all 0.2s',
                }}
              >
                {copiedNumero ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif' }}>
              A nombre de {ONE_CONFIG.BCP_TITULAR}
            </p>
          </div>

          {/* Instrucciones */}
          <div style={{ padding: '14px 16px', borderRadius: 10, background: '#0d1a0d', border: `1px solid ${'var(--tw-sage)'}33`, marginBottom: 20 }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--tw-sage)', fontFamily: 'Montserrat, sans-serif' }}>Pasos:</p>
            {['Abre Yape en tu celular', `Ingresa el número y el monto (${formatCents(totalCents)})`, 'Regresa aquí y toca "Ya pagué con Yape"'].map((paso, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 11, color: 'var(--tw-terra)', fontWeight: 700, minWidth: 16, fontFamily: 'Montserrat, sans-serif' }}>{i + 1}.</span>
                <span style={{ fontSize: 12, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif', lineHeight: 1.4 }}>{paso}</span>
              </div>
            ))}
          </div>

          {/* Voucher opcional para Yape */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif' }}>
              Opcionalmente puedes adjuntar el screenshot de tu Yape:
            </p>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFile} />
            {!voucherPreview ? (
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `1px dashed ${'var(--tw-border)'}`, borderRadius: 10,
                  padding: '20px 16px', textAlign: 'center',
                  cursor: 'pointer', background: 'var(--tw-card)',
                }}
              >
                <p style={{ margin: 0, fontSize: 12, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif' }}>
                  📎 Adjuntar screenshot (opcional)
                </p>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <img src={voucherPreview} alt="Voucher" style={{ width: '100%', borderRadius: 10, maxHeight: 160, objectFit: 'cover' }} />
                {subiendoArchivo && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif', fontSize: 13 }}>Subiendo...</span>
                  </div>
                )}
                {!subiendoArchivo && voucherUrl && (
                  <div style={{ position: 'absolute', top: 8, left: 8, padding: '3px 8px', borderRadius: 6, background: '#25a244', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--tw-text-inverse)', fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}>✓ Subido</span>
                  </div>
                )}
                <button
                  onClick={() => { setVoucherPreview(null); setVoucherUrl(null); onVoucherSubido('') }}
                  style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.7)', color: 'var(--tw-text)', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', fontSize: 13 }}
                >✕</button>
              </div>
            )}
          </div>

          {uploadError && (
            <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--tw-error)', fontFamily: 'Montserrat, sans-serif' }}>{uploadError}</p>
          )}

          {/* Botón "Ya pagué" */}
          {!yapePagado ? (
            <PrimaryBtn onClick={() => setYapePagado(true)}>
              ✓ Ya pagué con Yape
            </PrimaryBtn>
          ) : (
            <div style={{ padding: '16px', borderRadius: 10, background: '#0d1f0d', border: `1px solid ${'var(--tw-sage)'}55`, marginBottom: 0, textAlign: 'center' }}>
              <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: 'var(--tw-sage)', fontFamily: 'Montserrat, sans-serif' }}>✓ Pago confirmado</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif' }}>Verificamos en menos de 2 horas y te avisamos por WhatsApp</p>
            </div>
          )}
        </div>
      )}

      {/* ── TRANSFERENCIA ── */}
      {metodoPago === 'transferencia' && (
        <div style={{ marginBottom: 28 }}>
          {/* Monto destacado */}
          <div style={{
            padding: '20px', borderRadius: 14, marginBottom: 14,
            background: `linear-gradient(135deg, ${'var(--tw-terra)'}22, ${'var(--tw-terra)'}0a)`,
            border: `1px solid ${'var(--tw-terra)'}44`, textAlign: 'center',
          }}>
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Monto a transferir
            </p>
            <p style={{ margin: 0, fontSize: 36, fontWeight: 800, color: 'var(--tw-terra)', fontFamily: 'Montserrat, sans-serif' }}>
              {formatCents(totalCents)}
            </p>
          </div>

          {/* Datos bancarios con copy */}
          <div style={{ padding: '18px 20px', borderRadius: 12, background: 'var(--tw-card)', border: `1px solid ${'var(--tw-border)'}`, marginBottom: 14 }}>
            <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Datos BCP
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 11, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif' }}>Titular</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif' }}>{ONE_CONFIG.BCP_TITULAR}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif' }}>N° Cuenta</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.04em' }}>{ONE_CONFIG.BCP_CUENTA}</p>
                  <button onClick={() => copiarAlPortapapeles(ONE_CONFIG.BCP_CUENTA, setCopiedCuenta)}
                    style={{ flexShrink: 0, padding: '5px 10px', borderRadius: 6, border: `1px solid ${copiedCuenta ? 'var(--tw-sage)' : 'var(--tw-border)'}`, background: copiedCuenta ? 'var(--tw-sage)' + '22' : 'var(--tw-card-hover)', color: copiedCuenta ? 'var(--tw-sage)' : 'var(--tw-text-muted)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', transition: 'all 0.2s' }}>
                    {copiedCuenta ? '✓' : 'Copiar'}
                  </button>
                </div>
              </div>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif' }}>CCI</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.04em' }}>{ONE_CONFIG.BCP_CCI}</p>
                  <button onClick={() => copiarAlPortapapeles(ONE_CONFIG.BCP_CCI, setCopiedCci)}
                    style={{ flexShrink: 0, padding: '5px 10px', borderRadius: 6, border: `1px solid ${copiedCci ? 'var(--tw-sage)' : 'var(--tw-border)'}`, background: copiedCci ? 'var(--tw-sage)' + '22' : 'var(--tw-card-hover)', color: copiedCci ? 'var(--tw-sage)' : 'var(--tw-text-muted)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', transition: 'all 0.2s' }}>
                    {copiedCci ? '✓' : 'Copiar'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Upload voucher — obligatorio para transferencia */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif' }}>
              Sube el comprobante de transferencia <span style={{ color: 'var(--tw-terra)' }}>*</span>
            </p>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFile} />
            {!voucherPreview ? (
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${'var(--tw-border)'}`, borderRadius: 12,
                  padding: '36px 16px', textAlign: 'center',
                  cursor: 'pointer', background: 'var(--tw-card)',
                  transition: 'border-color 0.15s',
                }}
              >
                <p style={{ margin: '0 0 8px', fontSize: 32 }}>📎</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>
                  Subir comprobante
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif' }}>
                  Foto o PDF · JPG, PNG, PDF
                </p>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <img src={voucherPreview} alt="Voucher" style={{ width: '100%', borderRadius: 10, maxHeight: 200, objectFit: 'cover' }} />
                {subiendoArchivo && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif', fontSize: 14 }}>Subiendo...</span>
                  </div>
                )}
                {!subiendoArchivo && voucherUrl && (
                  <div style={{ position: 'absolute', top: 10, left: 10, padding: '4px 10px', borderRadius: 6, background: '#25a244', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--tw-text-inverse)', fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}>✓ Subido</span>
                  </div>
                )}
                <button
                  onClick={() => { setVoucherPreview(null); setVoucherUrl(null); onVoucherSubido('') }}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', color: 'var(--tw-text)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14 }}
                >✕</button>
              </div>
            )}
          </div>

          {uploadError && (
            <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--tw-error)', fontFamily: 'Montserrat, sans-serif' }}>{uploadError}</p>
          )}
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 8, background: 'var(--tw-error)' + '18', border: `1px solid ${'var(--tw-error)'}44` }}>
          <p style={{ margin: 0, color: 'var(--tw-error)', fontSize: 13, fontFamily: 'Montserrat, sans-serif' }}>{error}</p>
        </div>
      )}

      {puedeConfirmar && (
        <PrimaryBtn onClick={onNext} disabled={cargando} style={{ marginTop: metodoPago === 'yape' ? 16 : 0 }}>
          {cargando ? 'Confirmando pedido...' : 'Confirmar pedido →'}
        </PrimaryBtn>
      )}
      {metodoPago === 'transferencia' && !puedeConfirmar && (
        <PrimaryBtn onClick={onNext} disabled>
          Sube el comprobante para continuar
        </PrimaryBtn>
      )}
      <GhostBtn onClick={onBack} style={{ marginTop: 10 }}>← Volver al carrito</GhostBtn>
    </div>
  )
}

// ─── Paso 3: Confirmación ─────────────────────────────────────────────────────

const Paso3Screen: React.FC<{ pedidoId: string; nombreLocal: string; totalCents: number; reposicionesActivas?: number }> = ({ pedidoId, nombreLocal, totalCents, reposicionesActivas = 0 }) => (
  <div>
    {/* Encabezado */}
    <div style={{ textAlign: 'center', paddingBottom: 20 }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
      <h2 style={{ margin: '0 0 4px', fontSize: 24, fontFamily: 'Cormorant Garamond, serif', color: 'var(--tw-text)', fontWeight: 700 }}>
        ¡Pedido creado!
      </h2>
      <p style={{ margin: '0 0 2px', fontSize: 12, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>
        Código: <span style={{ color: 'var(--tw-terra)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{pedidoId}</span>
      </p>
      <p style={{ margin: 0, fontSize: 11, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>
        Ahora yapea el monto exacto para que el caficultor prepare tu pedido
      </p>
    </div>

    {/* Track-steps */}
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
      {[
        { n: '1', label: 'Pagar', active: true },
        { n: '2', label: 'Confirmar', active: false },
        { n: '3', label: 'Preparando', active: false },
        { n: '4', label: 'Entregado', active: false },
      ].map((s, i, arr) => (
        <React.Fragment key={s.n}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: s.active ? 'var(--tw-terra)' : 'var(--tw-border)',
              color: s.active ? '#fff' : 'var(--tw-text-muted)',
              fontSize: 11, fontWeight: 700, fontFamily: 'Montserrat, sans-serif',
            }}>{s.n}</div>
            <div style={{ fontSize: 9, color: s.active ? 'var(--tw-terra)' : 'var(--tw-text-muted)', fontWeight: s.active ? 700 : 500, fontFamily: 'Montserrat, sans-serif' }}>{s.label}</div>
          </div>
          {i < arr.length - 1 && (
            <div style={{ flex: 1, height: 2, background: 'var(--tw-border)', margin: '0 4px', marginBottom: 18 }} />
          )}
        </React.Fragment>
      ))}
    </div>

    {/* Card instrucciones Yape/BCP */}
    <div style={{
      background: 'rgba(201,110,75,.08)', border: '1px solid rgba(201,110,75,.2)',
      borderRadius: 10, padding: 16, marginBottom: 12,
    }}>
      <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: 'var(--tw-terra)', fontFamily: 'Montserrat, sans-serif' }}>
        📱 Instrucciones de pago
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>Yapea a</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--tw-terra)', fontFamily: 'Montserrat, sans-serif' }}>+51 917 959 370</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>Cuenta BCP</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'JetBrains Mono, monospace' }}>191-92345678-0-12</span>
      </div>
      <div style={{ height: 1, background: 'var(--tw-border)', margin: '0 0 10px' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif' }}>Monto exacto</span>
        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--tw-terra)', fontFamily: 'Montserrat, sans-serif' }}>{formatCents(totalCents)}</span>
      </div>
      <p style={{ margin: '8px 0 0', fontSize: 10, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>
        ⚠️ Envía el monto exacto para procesamiento automático
      </p>
    </div>

    {/* Bloque de reposiciones activas */}
    {reposicionesActivas > 0 && (
      <div style={{
        padding: '12px 16px', borderRadius: 10, marginBottom: 12,
        background: 'rgba(143,175,138,0.08)', border: '1px solid rgba(143,175,138,0.3)',
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>🔄</span>
        <div>
          <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 700, color: 'var(--tw-sage)', fontFamily: 'Montserrat, sans-serif' }}>
            {reposicionesActivas} reposición(es) activada(s)
          </p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif', lineHeight: 1.5 }}>
            Recibirás un aviso por WhatsApp antes de cada pedido automático. Puedes ajustar o cancelar desde tu portal.
          </p>
        </div>
      </div>
    )}

    {/* WhatsApp CTA */}
    <a
      href={`https://wa.me/${ONE_CONFIG.ADMIN_WHATSAPP.replace(/\s+/g, '')}?text=Hola%2C%20soy%20${encodeURIComponent(nombreLocal)}%20%E2%80%94%20pedido%20${encodeURIComponent(pedidoId)}`}
      target="_blank" rel="noopener noreferrer"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        padding: '14px', borderRadius: 10, background: '#25D366',
        color: '#fff', textDecoration: 'none',
        fontSize: 14, fontWeight: 700, fontFamily: 'Montserrat, sans-serif',
        marginBottom: 10, boxShadow: '0 4px 16px rgba(37,211,102,0.3)',
      }}
    >
      <span style={{ fontSize: 20 }}>💬</span> Enviar comprobante por WhatsApp
    </a>
    <a href="#/portal" style={{
      display: 'block', padding: '13px', borderRadius: 10,
      background: 'var(--tw-terra)', color: '#fff', textDecoration: 'none',
      fontSize: 13, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', textAlign: 'center',
      marginBottom: 14,
    }}>
      Ver mi portal →
    </a>
    <div style={{ textAlign: 'center' }}>
      <a href="#/" style={{ fontSize: 12, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif', textDecoration: 'none' }}>
        Volver al catálogo
      </a>
    </div>
  </div>
)

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  items: ItemCarrito[]
  usuarioId: string
  usuarioNombre: string
  usuarioEmail: string
  usuarioTelefono: string
  nombreLocalInicial?: string
  distritoLocalInicial?: string
  isDemo?: boolean
  onPedidoConfirmado?: () => void
  onPasoChange?: (paso: string) => void
  // B2B
  rolUsuario?: 'buyer_b2c' | 'buyer_b2b' | null
  estadoAprobacionB2B?: string | null
  rucEmpresa?: string | null
  razonSocialEmpresa?: string | null
}

const CheckoutONE: React.FC<Props> = ({
  items, usuarioId, usuarioNombre, usuarioEmail, usuarioTelefono,
  nombreLocalInicial = '', distritoLocalInicial = '',
  isDemo = false, onPedidoConfirmado, onPasoChange,
  rolUsuario = null, estadoAprobacionB2B = null,
  rucEmpresa = null, razonSocialEmpresa = null,
}) => {
  const esB2b = rolUsuario === 'buyer_b2b'
  const b2bAprobado = esB2b && estadoAprobacionB2B === 'APPROVED'

  // Constantes de paso — 3 pasos para todos los roles (ABAST-01 revisado)
  const PASO_CARRITO = 1
  const PASO_PAGO    = 2
  const PASO_CONFIRM = 3
  const stepLabels   = ['Carrito', 'Pago', 'Listo']

  const [step, setStep] = useState(1)

  const [lineas, setLineas] = useState<ItemCarrito[]>(items)
  const [menuId, setMenuId] = useState('sin-categorizar')
  const [menus, setMenus] = useState<MenuONE[]>([])
  const [nombreLocal, setNombreLocal] = useState(nombreLocalInicial)
  const [distritoLocal, setDistritoLocal] = useState(distritoLocalInicial)
  const [direccionEntrega, setDireccionEntrega] = useState('')
  const [agenciaSeleccionada, setAgenciaSeleccionada] = useState('')
  const [logisticas, setLogisticas] = useState<LogisticaCaficultorONE[]>([])

  // Reposición por ítem — solo usado si b2bAprobado
  const [reposicionConfig, setReposicionConfig] = useState<ReposicionItemConfig[]>(
    () => items.map(item => ({
      productoId: item.producto.id,
      productoNombre: item.producto.nombre,
      caficultorId: item.producto.caficultorId,
      activa: false,
      frecuenciaDias: 30 as FrecuenciaReposicion,
      cantidadUnidades: item.qty,
      presentacion: item.formato,
      esTypeA: false,
    }))
  )

  const [metodoPago, setMetodoPago] = useState<'yape' | 'transferencia'>('yape')
  const [voucherUrl, setVoucherUrl] = useState<string | null>(null)
  // B2B: número de OC y tipo de comprobante
  const [numeroOC, setNumeroOC] = useState('')
  const [tipoComprobante, setTipoComprobante] = useState<'factura' | 'boleta'>(esB2b && rucEmpresa ? 'factura' : 'boleta')

  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pedidoId, setPedidoId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 700)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 700)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Sincronizar reposicionConfig cuando el carrito cambia en Paso 1
  useEffect(() => {
    if (!b2bAprobado) return
    setReposicionConfig(prev =>
      lineas.map(item => {
        const existing = prev.find(c => c.productoId === item.producto.id)
        return existing
          ? { ...existing, cantidadUnidades: item.qty, presentacion: item.formato }
          : {
              productoId: item.producto.id,
              productoNombre: item.producto.nombre,
              caficultorId: item.producto.caficultorId,
              activa: false,
              frecuenciaDias: 30 as FrecuenciaReposicion,
              cantidadUnidades: item.qty,
              presentacion: item.formato,
              esTypeA: false,
            }
      })
    )
  }, [lineas, b2bAprobado])

  useEffect(() => {
    const cargarMenus = async () => {
      try {
        const uid = usuarioId === 'demo-user' ? 'user-negocio-001' : usuarioId
        const ms = isDemo ? await demoFetchMenusByNegocio(uid) : await fetchMenusByNegocio(usuarioId)
        setMenus(ms.filter(m => m.nombre !== 'Sin categorizar'))
        const activo = ms.find(m => m.activo)
        if (activo) setMenuId(activo.id)
      } catch { /* ok */ }
    }
    cargarMenus()
  }, [usuarioId, isDemo])

  // Cargar logística de cada caficultor único del pedido
  useEffect(() => {
    const caficultorIds = [...new Set(items.map(i => i.producto.caficultorId).filter(Boolean))]
    if (caficultorIds.length === 0) return
    async function cargarLogisticas() {
      const resultados = await Promise.all(
        caficultorIds.map(id =>
          isDemo
            ? demoFetchLogisticaCaficultor(id)
            : fetchLogisticaCaficultor(id)
        )
      )
      setLogisticas(resultados.filter((l): l is LogisticaCaficultorONE => l !== null))
    }
    cargarLogisticas()
  }, [items, isDemo])

  const subtotalCents = lineas.reduce((s, l) => {
    const p = calcularPrecioFinal(l.producto.precioBaseKgCents, l.formato)
    return s + p * l.qty
  }, 0)
  const totalCents = subtotalCents + ONE_CONFIG.DELIVERY_CENTS

  const menuNombre = menus.find(m => m.id === menuId)?.nombre ?? (menuId === 'sin-categorizar' ? 'Sin categorizar' : '')

  async function confirmarPedido() {
    if (metodoPago === 'transferencia' && !voucherUrl) return
    setCargando(true)
    setError(null)
    try {
      const resolvedMenuId = menuId === 'sin-categorizar' ? undefined : menuId
      const input = {
        negocioId: usuarioId,
        negocioNombre: usuarioNombre,
        negocioEmail: usuarioEmail,
        negocioTelefono: usuarioTelefono,
        nombreLocal, distritoLocal,
        items: lineas.map(l => {
          const precio = calcularPrecioFinal(l.producto.precioBaseKgCents, l.formato)
          return {
            productoId: l.producto.id,
            productoNombre: l.producto.nombre,
            caficultorId: l.producto.caficultorId,
            caficultorNombre: l.producto.caficultorNombre,
            presentacion: l.formato,
            qty: l.qty,
            unitCents: precio,
            menuId: resolvedMenuId,
          }
        }),
        metodoPago,
        direccionEntrega,
        agencia: agenciaSeleccionada as import('../types').AgenciaONE | undefined || undefined,
        esKitProveedor: false,
        isReposicion: false,
        // B2B
        ...(esB2b && {
          rolComprador: 'buyer_b2b',
          rucEmpresa: rucEmpresa ?? undefined,
          razonSocialEmpresa: razonSocialEmpresa ?? undefined,
          tipoComprobante,
          numeroOC: numeroOC || undefined,
        }),
      }
      const id = isDemo ? await demoCreatePedido(input) : await createPedido(input)
      if (isDemo) await demoSubirVoucher(id, voucherUrl ?? '')
      else await subirVoucher(id, voucherUrl ?? '')

      // Crear reposiciones para los ítems que lo tienen activo (B2B APPROVED)
      if (b2bAprobado) {
        const activas = reposicionConfig.filter(c => c.activa)
        if (activas.length > 0) {
          const resultados = await Promise.allSettled(
            activas.map(cfg =>
              isDemo
                ? demoCreateReposicion({
                    buyerId: usuarioId,
                    sellerId: cfg.caficultorId,
                    productoId: cfg.productoId,
                    productoNombre: cfg.productoNombre,
                    pedidoOrigenId: id,
                    frecuenciaDias: cfg.frecuenciaDias,
                    cantidadUnidades: cfg.cantidadUnidades,
                    presentacion: cfg.presentacion,
                  })
                : createReposicion({
                    buyerId: usuarioId,
                    sellerId: cfg.caficultorId,
                    productoId: cfg.productoId,
                    productoNombre: cfg.productoNombre,
                    pedidoOrigenId: id,
                    frecuenciaDias: cfg.frecuenciaDias,
                    cantidadUnidades: cfg.cantidadUnidades,
                    presentacion: cfg.presentacion,
                  })
            )
          )
          const reposicionIds = resultados
            .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
            .map(r => r.value)

          if (reposicionIds.length > 0) {
            try {
              if (isDemo) await demoLinkReposicionesToPedido(id, reposicionIds)
              else await linkReposicionesToPedido(id, reposicionIds)
            } catch { /* best-effort — el pedido ya fue creado */ }
          }
        }
      }

      setPedidoId(id)
      setStep(PASO_CONFIRM)
      onPedidoConfirmado?.()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear el pedido. Intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--tw-bg)', fontFamily: 'Montserrat, sans-serif' }}>

      {/* ── Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${'var(--tw-border)'}`,
        padding: '0 4%',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 60,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {step < PASO_CONFIRM && (
            <button
              onClick={() => step === 1 ? window.history.back() : setStep(step - 1)}
              style={{ background: 'none', border: 'none', color: 'var(--tw-text-faint)', cursor: 'pointer', fontSize: 22, padding: 0, display: 'flex', alignItems: 'center' }}
            >←</button>
          )}
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--tw-terra)', fontFamily: 'Cormorant Garamond, serif', letterSpacing: '0.06em' }}>
            TUNAY WASI
          </span>
          <span style={{ fontSize: 11, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.1em' }}>
            {(stepLabels[step - 1] ?? 'CONFIRMACIÓN').toUpperCase()}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {step < PASO_CONFIRM && (
            <button
              onClick={() => { window.location.hash = '#/' }}
              style={{
                background: 'none', border: 'none', color: 'var(--tw-text-muted)',
                fontSize: 12, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
                padding: '6px 0', whiteSpace: 'nowrap', letterSpacing: '0.02em',
              }}
            >
              + Seguir comprando
            </button>
          )}
          {step < PASO_CONFIRM && (
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tw-terra)', fontFamily: 'Montserrat, sans-serif' }}>
              {formatCents(totalCents)}
            </div>
          )}
        </div>
      </header>

      {/* ── Contenido principal ── */}
      {step === PASO_CONFIRM && pedidoId ? (
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '48px 24px 80px' }}>
          <Paso3Screen pedidoId={pedidoId} nombreLocal={nombreLocal} totalCents={totalCents} reposicionesActivas={reposicionConfig.filter(c => c.activa).length} />
        </div>
      ) : (
        <div
          className="checkout-grid"
          style={{
          maxWidth: 1100, margin: '0 auto',
          padding: '40px 4% 80px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 360px',
          gap: 32,
          alignItems: 'start',
        }}>
          {/* ── Columna izquierda: formulario ── */}
          <div>
            {/* Step indicator */}
            <div style={{ marginBottom: 36 }}>
              <StepIndicator step={step} labels={stepLabels} />
            </div>

            {step === PASO_CARRITO && (
              <>
              {/* Bloque de verificación B2B: solo si buyer_b2b NO aprobado */}
              {esB2b && !b2bAprobado && (
                <div style={{ padding: '20px 24px', background: 'rgba(201,110,75,.08)', border: '1px solid rgba(201,110,75,.3)', borderRadius: 12, margin: '8px 0 0' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: 'var(--tw-terra)' }}>Cuenta empresarial pendiente de aprobación</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--tw-text-muted)', lineHeight: 1.6 }}>
                    Tu cuenta B2B está en revisión. Podrás completar compras de lotes a granel y cotizaciones una vez que tu cuenta sea aprobada (1–2 días hábiles).
                  </p>
                </div>
              )}
              <Paso1Form
                lineas={lineas}
                menuId={menuId}
                menus={menus}
                nombreLocal={nombreLocal}
                distritoLocal={distritoLocal}
                direccionEntrega={direccionEntrega}
                logisticas={logisticas}
                agenciaSeleccionada={agenciaSeleccionada}
                onLineasChange={setLineas}
                onMenuIdChange={setMenuId}
                onNombreLocalChange={setNombreLocal}
                onDistritoLocalChange={setDistritoLocal}
                onDireccionChange={setDireccionEntrega}
                onAgenciaChange={setAgenciaSeleccionada}
                b2bAprobado={b2bAprobado}
                reposicionConfig={reposicionConfig}
                onReposicionChange={setReposicionConfig}
                onNext={() => { setStep(PASO_PAGO); onPasoChange?.('paso2_pago') }}
              />
              {/* Campos fiscales B2B: solo para buyer_b2b APPROVED */}
              {esB2b && b2bAprobado && step === PASO_CARRITO && (
                <div style={{ padding: '20px 24px', background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 12, marginTop: 16 }}>
                  <p style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Datos de facturación B2B</p>
                  {/* RUC y razón social (solo lectura — vienen del perfil) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 14 }}>
                    <div>
                      <Label>RUC</Label>
                      <div style={{ padding: '12px 14px', borderRadius: 8, border: '1px solid var(--tw-border)', background: 'var(--tw-bg)', fontSize: 13, color: 'var(--tw-text)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {rucEmpresa ?? '—'}
                      </div>
                    </div>
                    <div>
                      <Label>Razón Social</Label>
                      <div style={{ padding: '12px 14px', borderRadius: 8, border: '1px solid var(--tw-border)', background: 'var(--tw-bg)', fontSize: 13, color: 'var(--tw-text)' }}>
                        {razonSocialEmpresa ?? '—'}
                      </div>
                    </div>
                  </div>
                  {/* Número de OC opcional */}
                  <div style={{ marginBottom: 14 }}>
                    <Label>Nº Orden de Compra (opcional)</Label>
                    <Field
                      value={numeroOC}
                      onChange={e => setNumeroOC(e.target.value)}
                      placeholder="OC-2026-001"
                      maxLength={40}
                    />
                  </div>
                  {/* Tipo de comprobante */}
                  <div>
                    <Label>Comprobante</Label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {(['factura', 'boleta'] as const).map(t => (
                        <button key={t} type="button" onClick={() => setTipoComprobante(t)}
                          style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: `1px solid ${tipoComprobante === t ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: tipoComprobante === t ? 'var(--tw-terra)' : 'transparent', color: tipoComprobante === t ? '#fff' : 'var(--tw-text-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize' }}>
                          {t === 'factura' ? '🧾 Factura electrónica' : '📄 Boleta'}
                        </button>
                      ))}
                    </div>
                    {tipoComprobante === 'factura' && (
                      <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--tw-text-muted)' }}>Se emitirá a {razonSocialEmpresa ?? 'tu empresa'} · RUC {rucEmpresa ?? '—'}</p>
                    )}
                  </div>
                </div>
              )}
              </>
            )}

            {step === PASO_PAGO && (
              <Paso2Form
                totalCents={totalCents}
                metodoPago={metodoPago}
                onMetodoChange={setMetodoPago}
                onVoucherSubido={setVoucherUrl}
                onNext={confirmarPedido}
                onBack={() => { setStep(PASO_CARRITO); onPasoChange?.('paso1_carrito') }}
                cargando={cargando}
                error={error}
                isDemo={isDemo}
              />
            )}
          </div>

          {/* ── Columna derecha: resumen sticky ── */}
          <div className="checkout-summary" style={{ position: 'sticky', top: 76 }}>
            <ResumenPedido
              lineas={lineas}
              menuNombre={menuNombre}
              totalCents={totalCents}
              agenciaNombre={
                agenciaSeleccionada
                  ? (logisticas.flatMap(l => Object.entries(l.agenciasMap ?? {})).find(([id]) => id === agenciaSeleccionada)?.[1] ?? agenciaSeleccionada)
                  : undefined
              }
              compact={isMobile}
            />

            {/* Confianza */}
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{
                display: 'flex', gap: 10, alignItems: 'center',
                padding: '8px 12px', borderRadius: 8,
                background: '#0d1a0d', border: `1px solid ${'var(--tw-sage)'}33`,
              }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>📦</span>
                <span style={{ fontSize: 11, color: 'var(--tw-sage)', fontFamily: 'Montserrat, sans-serif', lineHeight: 1.4, fontWeight: 600 }}>
                  Entrega estimada: 2-5 días hábiles
                </span>
              </div>
              {[
                { icon: '🌿', text: 'Café directo del productor peruano' },
                { icon: '🔒', text: 'Pago verificado antes de despachar' },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
                  <span style={{ fontSize: 11, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif', lineHeight: 1.4 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Responsive: en mobile el grid colapsa a 1 columna */}
      <style>{`
        @media (max-width: 700px) {
          .checkout-grid { grid-template-columns: 1fr !important; }
          .checkout-summary { position: static !important; }
          .checkout-local-grid { grid-template-columns: 1fr !important; }
        }
        @keyframes checkBounce {
          0%   { transform: scale(0) rotate(-10deg); opacity: 0; }
          50%  { transform: scale(1.2) rotate(3deg);  opacity: 1; }
          75%  { transform: scale(0.95) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg);    opacity: 1; }
        }
        .tw-check-bounce { animation: checkBounce 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both; }
        @keyframes stepFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tw-step-1 { animation: stepFadeUp 0.35s cubic-bezier(0.22,1,0.36,1) 0.3s both; }
        .tw-step-2 { animation: stepFadeUp 0.35s cubic-bezier(0.22,1,0.36,1) 0.45s both; }
        .tw-step-3 { animation: stepFadeUp 0.35s cubic-bezier(0.22,1,0.36,1) 0.6s both; }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tw-confirm-title { animation: fadeSlideUp 0.4s cubic-bezier(0.22,1,0.36,1) 0.6s both; }
        .tw-confirm-code  { animation: fadeSlideUp 0.4s cubic-bezier(0.22,1,0.36,1) 0.75s both; }
        .tw-confirm-ctas  { animation: fadeSlideUp 0.4s cubic-bezier(0.22,1,0.36,1) 1.0s both; }
      `}</style>
    </div>
  )
}

export default CheckoutONE
