/**
 * PortalCaficultor.tsx — Dashboard del caficultor
 * Dark mode Netflix-style con sidebar navigation, CRUD de productos, toast
 */
import React, { useEffect, useState, useRef } from 'react'
import { navigate } from '@/router'
import {
  fetchPedidosByCaficultor, fetchProductos, fetchCaficultor,
  fetchCalificacionesByCaficultor, updateStock,
  crearProducto, updateProducto, updateCaficultor, despacharAgencia,
  fetchUbigeos, fetchLogisticaCaficultor, saveLogisticaCaficultor,
  fetchCotizacionesCaficultor, responderCotizacion,
  fetchPagosByCaficultor, fetchReclamosByCaficultor,
  fetchEvidenciasByProducto, crearEvidencia,
  fetchUsuario,
} from '../service'
import { db } from '@/shared/firebase'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import {
  demoFetchPedidosByCaficultor, demoFetchProductosByCaficultorLive,
  demoFetchCaficultor, demoUpdateStock,
  demoCrearProducto, demoUpdateProducto, demoUpdateCaficultor,
  demoDespacharAgencia,
  demoFetchUbigeos, demoFetchLogisticaCaficultor, demoSaveLogisticaCaficultor,
} from '../demoService'
import { PROCESO_LABELS, calcularPrecioFinal, FORMATOS_FIXED, FORMATOS_NEGOTIABLE, FORMATO_LABELS } from '../config'
import type { PedidoONE, ProductoONE, CaficultorONE, CalificacionCaficultor, UbigeoONE, LogisticaCaficultorONE, AgenciaLogisticaONE, CotizacionONE, PagoCaficultorONE, FormatoONE, LogisticaStatusONE, ReclamoONE, EvidenciaONE, NivelEvidencia, UsuarioONE } from '../types'
import ChatPedido from './ChatPedido'
import WasiChat from './WasiChat'
import { type DireccionONE } from './ModalDireccion'
import NotificacionesCaficultor from './NotificacionesCaficultor'


const PROCESO_COLORS: Record<string, string> = {
  lavado: '#4a90c4', natural: 'var(--tw-terra)', honey: '#f39c12', anaerobico: '#9b59b6',
}

// ─── Cosecha: lista de mes/año (año actual + año anterior) ────────────────────
const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
function generarOpcionesCosecha(): string[] {
  const anio = new Date().getFullYear()
  const opciones: string[] = ['']
  for (let m = 11; m >= 0; m--) opciones.push(`${MESES_ES[m]} ${anio}`)
  for (let m = 11; m >= 0; m--) opciones.push(`${MESES_ES[m]} ${anio - 1}`)
  return opciones
}
const OPCIONES_COSECHA = generarOpcionesCosecha()

// ─── Helper: subir foto a Cloudinary ─────────────────────────────────────────
async function subirFotoStorage(file: File, _ruta: string): Promise<string> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
  const fd = new FormData()
  fd.append('file', file)
  fd.append('upload_preset', uploadPreset)
  fd.append('folder', 'one_caficultor')
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd })
  const data = await res.json()
  if (!data.secure_url) throw new Error(data.error?.message ?? 'Cloudinary upload failed')
  return data.secure_url
}

// ─── Componente reutilizable: botón upload foto ───────────────────────────────
const UploadFoto: React.FC<{
  url: string
  onUrl: (url: string) => void
  label: string
  ruta: string
  placeholder?: string
  aspectRatio?: string
}> = ({ url, onUrl, label, ruta, placeholder = 'Subir foto', aspectRatio = '4/3' }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [hover, setHover] = useState(false)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    setSubiendo(true)
    try {
      const nombre = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const downloadUrl = await subirFotoStorage(file, `${ruta}/${nombre}`)
      onUrl(downloadUrl)
    } catch (e) {
      console.error('Error subiendo foto', e)
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 11, color: 'var(--tw-text-muted)', display: 'block', marginBottom: 6 }}>{label}</label>
      <div
        onClick={() => !subiendo && inputRef.current?.click()}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          position: 'relative', borderRadius: 10, border: `2px dashed ${url ? 'var(--tw-terra)' : (hover ? 'var(--tw-text-muted)' : 'var(--tw-border)')}`,
          background: '#0a0a0a', cursor: subiendo ? 'wait' : 'pointer',
          overflow: 'hidden', aspectRatio, display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 80, transition: 'border-color 0.2s',
        }}
      >
        {url ? (
          <>
            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              opacity: hover ? 1 : 0, transition: 'opacity 0.2s',
            }}>
              <span style={{ fontSize: 20 }}>📷</span>
              <span style={{ fontSize: 11, color: '#fff', marginTop: 4 }}>Cambiar foto</span>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 16 }}>
            <span style={{ fontSize: 28 }}>📷</span>
            <span style={{ fontSize: 12, color: 'var(--tw-text-muted)' }}>{placeholder}</span>
            <span style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>JPG · PNG · WEBP</span>
          </div>
        )}
        {subiendo && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>⏳</span>
            <span style={{ fontSize: 12, color: 'var(--tw-text)' }}>Subiendo...</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
      />
    </div>
  )
}

type Tab = 'productos' | 'pedidos' | 'historial' | 'pagos' | 'perfil' | 'wasi' | 'alertas'
type PedidoSubTab = 'ofertas' | 'activos' | 'historial' | 'reclamos'
type SettingsTab = 'perfil' | 'finca' | 'cobros' | 'envio' | 'direcciones' | 'notificaciones' | 'seguridad' | null

// ─── Filter bar shared component ──────────────────────────────────────────────

const FilterBar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18, padding: '14px 16px', background: '#0d0d0d', borderRadius: 12, border: `1px solid var(--tw-border)`, alignItems: 'center' }}>
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
      padding: '6px 12px', borderRadius: 8, border: `1px solid var(--tw-border)`,
      background: '#141414', color: 'var(--tw-text)', fontSize: 12,
      fontFamily: 'Montserrat, sans-serif', outline: 'none', width: 'min(180px, 100%)',
    }}
  />
)

function formatCents(cents: number): string { return `S/ ${(cents / 100).toFixed(0)}` }
function formatFecha(iso: string): string {
  try { return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) }
  catch { return iso }
}
function colorStock(kg: number): string {
  if (kg > 20) return 'var(--tw-sage)'
  if (kg > 10) return '#f39c12'
  return '#e74c3c'
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; tipo: 'ok' | 'error' | 'info' }

const Toast: React.FC<{ msgs: ToastMsg[]; onRemove: (id: number) => void }> = ({ msgs, onRemove }) => (
  <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 500, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none', width: 'min(90vw, 360px)' }}>
    {msgs.map(m => (
      <div key={m.id} onClick={() => onRemove(m.id)} style={{
        padding: '12px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
        background: m.tipo === 'ok' ? 'var(--tw-sage)' : m.tipo === 'error' ? '#e74c3c' : '#f39c12',
        color: m.tipo === 'info' ? '#000' : '#fff',
        pointerEvents: 'all', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
        fontFamily: 'Montserrat, sans-serif',
      }}>
        {m.tipo === 'ok' ? '✓ ' : m.tipo === 'error' ? '✕ ' : 'ℹ '}{m.text}
      </div>
    ))}
  </div>
)

// ─── Modal producto (crear/editar) ────────────────────────────────────────────

interface ProductoFormData {
  nombre: string; variedad: string; proceso: string; tipoCafe: 'verde' | 'tostado' | 'molido' | 'ambos'
  altitudMsnm: string; cosecha: string
  notasSabor: string; descripcion: string; puntajeReferencial: string
  precioBaseKgSoles: string; kgDisponibles: string; fotos: string[]
  pricingMode: 'FIXED' | 'NEGOTIABLE'
  formatosDisponibles: FormatoONE[]
  reposicionActiva: boolean; kgMinReserva: string; frecuenciaReposicion: number | null; prioridadTueste: boolean
  // Campos café verde (TYPE_A)
  humedad: string; densidad: string; criba: string; kgMinPedido: string
}

const TIPOS_CAFE: { value: ProductoFormData['tipoCafe']; label: string }[] = [
  { value: 'verde',   label: 'Café verde' },
  { value: 'tostado', label: 'Tostado en grano' },
  { value: 'molido',  label: 'Tostado y Molido' },
]

const CRIBA_OPTS = ['14', '15', '16', '17/18', '18/19', '19/20', '20+']

const PROCESOS: { value: string; label: string }[] = [
  { value: 'lavado', label: 'Lavado' },
  { value: 'natural', label: 'Natural' },
  { value: 'honey', label: 'Honey' },
  { value: 'anaerobico', label: 'Anaeróbico' },
]

const ModalProducto: React.FC<{
  caficultorId: string; caficultorNombre: string; producto?: ProductoONE; isDemo: boolean
  /** TRIB-01: caficultor registrado solo con DNI → solo puede publicar café verde (TYPE_A) */
  soloDni?: boolean
  onClose: () => void
  onToast: (t: string, tipo?: 'ok' | 'error' | 'info') => void
  onGuardado: (p: ProductoONE) => void
}> = ({ caficultorId, caficultorNombre, producto, isDemo, soloDni = false, onClose, onToast, onGuardado }) => {
  const esEdicion = !!producto

  const [form, setForm] = useState<ProductoFormData>({
    nombre: producto?.nombre ?? '',
    variedad: producto?.variedad ?? '',
    proceso: producto?.proceso ?? 'lavado',
    tipoCafe: ((producto as any)?.tipoCafe ?? (soloDni ? 'verde' : 'tostado')) as ProductoFormData['tipoCafe'],
    altitudMsnm: String(producto?.altitudMsnm ?? ''),
    cosecha: producto?.cosecha ?? '',
    notasSabor: producto?.notasSabor?.join(', ') ?? '',
    descripcion: producto?.descripcion ?? '',
    puntajeReferencial: String(producto?.puntajeReferencial ?? ''),
    precioBaseKgSoles: producto ? String(Math.round(producto.precioBaseKgCents / 100)) : '',
    kgDisponibles: String(producto?.kgDisponibles ?? ''),
    fotos: producto?.fotos?.length ? producto.fotos : (producto?.foto ? [producto.foto] : ['']),
    pricingMode: ((producto as any)?.pricingMode ?? 'FIXED') as 'FIXED' | 'NEGOTIABLE',
    formatosDisponibles: ((producto as any)?.formatosDisponibles as FormatoONE[]) ?? ['250g', '500g', '1kg'],
    reposicionActiva: !!(producto as any)?.reposicion?.activa,
    kgMinReserva: String((producto as any)?.reposicion?.kgMin ?? ''),
    frecuenciaReposicion: (producto as any)?.reposicion?.frecuenciaDias ?? null,
    prioridadTueste: !!(producto as any)?.reposicion?.prioridadTueste,
    humedad: String((producto as any)?.humedad ?? ''),
    densidad: String((producto as any)?.densidad ?? ''),
    criba: (producto as any)?.criba ?? '',
    kgMinPedido: String((producto as any)?.kgMinPedido ?? ''),
  })
  const [guardando, setGuardando] = useState(false)
  const [notaInput, setNotaInput] = useState('')
  const [estadoProducto, setEstadoProducto] = useState<'activo' | 'pausado' | 'agotado'>(producto?.status as 'activo' | 'pausado' | 'agotado' ?? 'activo')

  function set(field: keyof ProductoFormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function guardar() {
    if (!form.nombre.trim() || !form.variedad.trim() || !form.precioBaseKgSoles) {
      onToast('Nombre, variedad y precio base son obligatorios', 'error')
      return
    }
    // G-07: PR-04 — NEGOTIABLE solo se puede seleccionar con TYPE_A (café verde)
    if (form.pricingMode === 'NEGOTIABLE' && form.tipoCafe !== 'verde') {
      onToast('El precio negociable (NEGOTIABLE) solo está permitido para café verde (TYPE_A). Cambia el tipo de café o selecciona precio fijo.', 'error')
      return
    }
    // TRIB-01 INVARIANTE: solo DNI no puede publicar TYPE_B / TYPE_C (no puede emitir comprobante)
    if (soloDni && form.tipoCafe !== 'verde') {
      onToast('Con registro solo DNI únicamente puedes publicar café verde (TYPE_A). Para vender tostado o molido necesitas RUC propio o de tu cooperativa — escríbenos a tunaywasi@gmail.com.', 'error')
      return
    }
    // G-04: Validar mínimo 4 fotos al publicar lote
    const fotosValidas = form.fotos.map(f => f.trim()).filter(Boolean)
    if (fotosValidas.length < 4) {
      onToast('Debes subir al menos 4 fotos del producto', 'error')
      return
    }
    const precioBaseSoles = parseFloat(form.precioBaseKgSoles)
    const precioBaseCents = Math.round(precioBaseSoles * 100)
    const kg = parseInt(form.kgDisponibles) || 0
    if (isNaN(precioBaseCents) || precioBaseCents <= 0) { onToast('Precio base inválido', 'error'); return }
    // LOT-04: stock debe ser > 0 para publicar con estado activo
    if (kg <= 0 && estadoProducto === 'activo') { onToast('El stock debe ser mayor a 0 para publicar el lote como activo', 'error'); return }

    setGuardando(true)
    try {
      const notasSabor = form.notasSabor.split(',').map(s => s.trim()).filter(Boolean)
      const fotosPrincipal = fotosValidas[0] ?? 'https://res.cloudinary.com/dtc9meqbc/image/upload/v1/tunaywasi/placeholder-cafe.jpg'
      const data: Omit<ProductoONE, 'id' | 'createdAt' | 'updatedAt'> = {
        caficultorId, caficultorNombre,
        nombre: form.nombre.trim(),
        variedad: form.variedad.trim(),
        proceso: form.proceso as ProductoONE['proceso'],
        tipoCafe: form.tipoCafe,
        presentacion: (producto?.presentacion ?? 'tostado_grano') as ProductoONE['presentacion'],
        nivelTueste: (producto?.nivelTueste ?? 'medio') as ProductoONE['nivelTueste'],
        costos: producto?.costos ?? { precioVerdeKgCents: precioBaseCents, costoTuesteKgCents: 0, costoBolsaUndCents: 0, margenPct: 0 },
        altitudMsnm: parseInt(form.altitudMsnm) || 0,
        cosecha: form.cosecha.trim(),
        notasSabor,
        descripcion: form.descripcion.trim(),
        puntajeReferencial: form.puntajeReferencial ? parseInt(form.puntajeReferencial) : null,
        notaReferencial: 'Puntaje referencial declarado por el caficultor',
        precioBaseKgCents: precioBaseCents,
        kgDisponibles: kg,
        kgReservados: producto?.kgReservados ?? 0,
        status: estadoProducto,
        foto: fotosPrincipal,
        fotos: fotosValidas,
        pricingMode: form.pricingMode,
        ...(form.tipoCafe !== 'verde' ? { formatosDisponibles: form.formatosDisponibles } : {}),
        reposicion: form.reposicionActiva ? {
          activa: true,
          kgMin: parseInt(form.kgMinReserva) || 10,
          frecuenciaDias: form.frecuenciaReposicion,
          prioridadTueste: form.prioridadTueste,
        } : { activa: false, kgMin: 0, frecuenciaDias: null, prioridadTueste: false },
        ...(form.tipoCafe === 'verde' ? {
          humedad: parseFloat(form.humedad) || null,
          densidad: parseInt(form.densidad) || null,
          criba: form.criba || null,
          kgMinPedido: parseInt(form.kgMinPedido) || null,
        } : {}),
      } as any

      if (esEdicion && producto) {
        if (isDemo) await demoUpdateProducto(producto.id, data)
        else await updateProducto(producto.id, data)
        onGuardado({ ...data, id: producto.id, createdAt: producto.createdAt, updatedAt: new Date().toISOString() })
        onToast('Producto actualizado', 'ok')
      } else {
        const id = isDemo ? await demoCrearProducto(data) : await crearProducto(data)
        onGuardado({ ...data, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
        onToast('Producto creado', 'ok')
      }
      onClose()
    } catch (e) {
      onToast('Error al guardar el producto', 'error')
    } finally {
      setGuardando(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: `1px solid var(--tw-border)`, background: '#0f0f0f',
    fontSize: 13, fontFamily: 'Montserrat, sans-serif', color: 'var(--tw-text)',
    outline: 'none', boxSizing: 'border-box', marginBottom: 12,
  }
  const labelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--tw-text-muted)', display: 'block', marginBottom: 4 }

  const precioBaseSoles = parseFloat(form.precioBaseKgSoles) || 0

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'var(--tw-bg)', overflowY: 'auto', fontFamily: 'Montserrat, sans-serif' }}>
      <style>{`
        @media (max-width: 720px) { .modal-producto-sidebar { display: none !important; } }
        @media (max-width: 640px) {
          .modal-producto-layout {
            grid-template-columns: 1fr !important;
            padding: 20px 16px 60px !important;
            gap: 0 !important;
          }
          .modal-prod-grid-2 { grid-template-columns: 1fr !important; }
          .modal-prod-grid-3 { grid-template-columns: 1fr 1fr !important; }
          .modal-prod-grid-4 { grid-template-columns: repeat(2,1fr) !important; }
        }
      `}</style>

      {/* Header sticky */}
      <header style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--tw-bg)', borderBottom: `1px solid var(--tw-border)`, padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--tw-text-muted)', fontSize: 13, cursor: 'pointer', padding: 0 }}>← Volver</button>
        <span style={{ color: 'var(--tw-border)' }}>|</span>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif' }}>
          {esEdicion ? 'Editar producto' : 'Nuevo producto'}
        </p>
      </header>

      {/* Layout dos columnas */}
      <div className="modal-producto-layout" style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 80px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32, alignItems: 'start' }}>

        {/* ── Columna izquierda: formulario ── */}
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--tw-sage)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {esEdicion ? 'Editar producto' : 'Nuevo producto'}
          </p>
          <h2 style={{ margin: '0 0 20px', fontSize: 26, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif', fontWeight: 700 }}>
            {form.nombre || 'Tu café'}
          </h2>

          {/* Fotos — primero */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <label style={labelStyle}>Fotos del producto</label>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-terra)' }}>{form.fotos.filter(Boolean).length} / 5</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {form.fotos.map((url, idx) => (
                <div key={idx} style={{ position: 'relative', width: 80, height: 80 }}>
                  <UploadFoto
                    url={url}
                    onUrl={newUrl => setForm(prev => { const fotos = [...prev.fotos]; fotos[idx] = newUrl; return { ...prev, fotos } })}
                    label={idx === 0 ? 'Foto principal' : `Foto ${idx + 1}`}
                    ruta={`productos/${caficultorId}`}
                    placeholder={idx === 0 ? 'Principal' : `Foto ${idx + 1}`}
                    aspectRatio="1/1"
                  />
                  {form.fotos.length > 1 && (
                    <button
                      onClick={() => setForm(prev => ({ ...prev, fotos: prev.fotos.filter((_, i) => i !== idx) }))}
                      style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.75)', color: '#fff', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1 }}
                    >×</button>
                  )}
                </div>
              ))}
              {form.fotos.length < 5 && (
                <div
                  onClick={() => setForm(prev => ({ ...prev, fotos: [...prev.fotos, ''] }))}
                  style={{ width: 80, height: 80, border: `1.5px dashed var(--tw-border)`, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 2 }}
                >
                  <span style={{ fontSize: 20, color: 'var(--tw-text-muted)' }}>＋</span>
                </div>
              )}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 10, color: 'var(--tw-text-muted)' }}>Mínimo 4 fotos · hasta 5 · JPG o PNG</p>
          </div>

          <label style={labelStyle}>Nombre del café *</label>
          <input value={form.nombre} onChange={e => set('nombre', e.target.value)} style={inputStyle} placeholder="Bourbon Lavado — Finca La Coipa" maxLength={80} />

          <div className="modal-prod-grid-2" style={{ marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Variedad *</label>
              <input value={form.variedad} onChange={e => set('variedad', e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} placeholder="Bourbon" />
            </div>
            <div>
              <label style={labelStyle}>Proceso *</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PROCESOS.map(p => {
                  const sel = form.proceso === p.value
                  const col = PROCESO_COLORS[p.value] ?? 'var(--tw-terra)'
                  return (
                    <button key={p.value} type="button" onClick={() => set('proceso', p.value)} style={{
                      padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: `1px solid ${sel ? col : 'var(--tw-border)'}`,
                      background: sel ? col + '22' : 'transparent',
                      color: sel ? col : 'var(--tw-text-muted)',
                      fontFamily: 'Montserrat, sans-serif',
                    }}>{p.label}</button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Tipo de café */}
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Tipo de café *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TIPOS_CAFE.map(t => {
                const sel = form.tipoCafe === t.value
                const esVerde = t.value === 'verde'
                const col = esVerde ? 'var(--tw-sage)' : 'var(--tw-terra)'
                const bloqueado = soloDni && !esVerde   // TRIB-01
                return (
                  <button key={t.value} type="button" disabled={bloqueado}
                    title={bloqueado ? 'Requiere RUC (TRIB-01) — tu registro es solo DNI' : undefined}
                    onClick={() => setForm(prev => ({
                    ...prev,
                    tipoCafe: t.value,
                    // TYPE_B y TYPE_C solo FIXED (PR-04) — resetear si venía de verde con NEGOTIABLE
                    pricingMode: t.value !== 'verde' ? 'FIXED' : prev.pricingMode,
                  }))} style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    border: `1px solid ${sel ? col : 'var(--tw-border)'}`,
                    background: sel ? col + '22' : 'transparent',
                    color: sel ? col : 'var(--tw-text-muted)',
                    fontFamily: 'Montserrat, sans-serif',
                    opacity: bloqueado ? 0.4 : 1,
                    cursor: bloqueado ? 'not-allowed' : 'pointer',
                  }}>{t.label}</button>
                )
              })}
            </div>
          </div>

          {/* Campos condicionales — solo café verde */}
          {form.tipoCafe === 'verde' && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ background: 'rgba(100,149,237,0.07)', border: '1px solid rgba(100,149,237,0.2)', borderRadius: 9, padding: '9px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>🫘</span>
                <span style={{ fontSize: 11, color: '#6495ED', fontWeight: 600 }}>Café verde requiere especificar humedad, densidad y tamaño de criba</span>
              </div>
              <label style={labelStyle}>Especificaciones del grano verde</label>
              <div className="modal-prod-grid-2" style={{ marginBottom: 10 }}>
                <div>
                  <label style={{ ...labelStyle, marginBottom: 4 }}>Humedad (%)</label>
                  <input type="number" step="0.1" min="9" max="13" value={form.humedad} onChange={e => set('humedad', e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} placeholder="11.2" />
                </div>
                <div>
                  <label style={{ ...labelStyle, marginBottom: 4 }}>Densidad (g/L)</label>
                  <input type="number" step="1" value={form.densidad} onChange={e => set('densidad', e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} placeholder="812" />
                </div>
              </div>
              <div className="modal-prod-grid-2">
                <div>
                  <label style={{ ...labelStyle, marginBottom: 4 }}>Criba / Screen (mesh)</label>
                  <select value={form.criba} onChange={e => set('criba', e.target.value)} style={{ ...inputStyle, marginBottom: 0, cursor: 'pointer' }}>
                    <option value="">Seleccionar...</option>
                    {CRIBA_OPTS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ ...labelStyle, marginBottom: 4 }}>Pedido mínimo (kg)</label>
                  <input type="number" min="1" value={form.kgMinPedido} onChange={e => set('kgMinPedido', e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} placeholder="20" />
                </div>
              </div>
            </div>
          )}

          <div className="modal-prod-grid-2" style={{ marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Altitud (msnm)</label>
              <input type="number" value={form.altitudMsnm} onChange={e => set('altitudMsnm', e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} placeholder="1800" />
            </div>
            <div>
              <label style={labelStyle}>Cosecha</label>
              <select value={form.cosecha} onChange={e => set('cosecha', e.target.value)} style={{ ...inputStyle, marginBottom: 0, cursor: 'pointer' }}>
                {OPCIONES_COSECHA.map(op => <option key={op} value={op}>{op || 'Seleccionar...'}</option>)}
              </select>
            </div>
          </div>

          <label style={labelStyle}>Notas de sabor</label>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {form.notasSabor.split(',').map(s => s.trim()).filter(Boolean).map((nota, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: 'rgba(201,110,75,0.12)', border: '1px solid rgba(201,110,75,0.25)', fontSize: 12, color: 'var(--tw-terra)' }}>
                  {nota}
                  <button type="button" onClick={() => {
                    const notas = form.notasSabor.split(',').map(s => s.trim()).filter(Boolean)
                    notas.splice(i, 1)
                    set('notasSabor', notas.join(', '))
                  }} style={{ background: 'none', border: 'none', color: 'var(--tw-terra)', cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1, opacity: 0.7 }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={notaInput}
                onChange={e => setNotaInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault()
                    const nueva = notaInput.trim()
                    if (!nueva) return
                    const notas = form.notasSabor.split(',').map(s => s.trim()).filter(Boolean)
                    if (!notas.includes(nueva)) set('notasSabor', [...notas, nueva].join(', '))
                    setNotaInput('')
                  }
                }}
                style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                placeholder="chocolate negro, Enter para agregar"
              />
              <button type="button" onClick={() => {
                const nueva = notaInput.trim()
                if (!nueva) return
                const notas = form.notasSabor.split(',').map(s => s.trim()).filter(Boolean)
                if (!notas.includes(nueva)) set('notasSabor', [...notas, nueva].join(', '))
                setNotaInput('')
              }} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--tw-border)', background: 'transparent', color: 'var(--tw-text-muted)', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
                + Agregar
              </button>
            </div>
          </div>

          <label style={labelStyle}>Descripción breve</label>
          <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)} maxLength={200} style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} placeholder="Perfil del café, origen, proceso..." />
        </div>

        {/* ── Columna derecha: precio, estado, reposición, guardar ── */}
        <div className="modal-producto-sidebar">
          <div style={{ position: 'sticky', top: 76 }}>

            {/* Card: Precio y disponibilidad */}
            <div style={{ background: 'var(--tw-card)', border: `1px solid var(--tw-border)`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
              <p style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Precio y disponibilidad</p>
              {/* Toggle FIXED/NEGOTIABLE solo para café verde (PR-04) */}
              {form.tipoCafe === 'verde' ? (
                <div style={{ display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: `1px solid var(--tw-border)`, marginBottom: 12 }}>
                  {(['FIXED', 'NEGOTIABLE'] as const).map(mode => {
                    const sel = form.pricingMode === mode
                    return (
                      <button key={mode} type="button"
                        onClick={() => setForm(prev => ({
                          ...prev,
                          pricingMode: mode,
                          formatosDisponibles: [],
                        }))}
                        style={{ flex: 1, padding: '7px 4px', fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: 'Montserrat, sans-serif', textAlign: 'center',
                          background: sel ? (mode === 'FIXED' ? 'var(--tw-terra)' : 'var(--tw-sage)') : 'transparent',
                          color: sel ? '#fff' : 'var(--tw-text-muted)',
                        }}
                      >{mode === 'FIXED' ? 'Precio fijo' : 'Negociable'}</button>
                    )
                  })}
                </div>
              ) : null}
              {form.pricingMode === 'NEGOTIABLE' && (
                <div style={{ background: 'rgba(201,110,75,0.06)', border: '1px solid rgba(201,110,75,0.2)', borderRadius: 7, padding: '7px 10px', marginBottom: 12 }}>
                  <p style={{ margin: 0, fontSize: 10, color: 'var(--tw-text-muted)', lineHeight: 1.5 }}>
                    Solo compradores B2B pueden hacer ofertas. El precio es de referencia.
                  </p>
                </div>
              )}

              {/* Presentaciones disponibles — solo para tostado/molido */}
              {form.tipoCafe !== 'verde' && (
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>
                    {form.pricingMode === 'NEGOTIABLE' ? 'Volúmenes disponibles' : 'Presentaciones disponibles'}
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(form.pricingMode === 'NEGOTIABLE' ? FORMATOS_NEGOTIABLE : FORMATOS_FIXED).map(fmt => {
                      const sel = form.formatosDisponibles.includes(fmt as FormatoONE)
                      return (
                        <button key={fmt} type="button"
                          onClick={() => setForm(prev => ({
                            ...prev,
                            formatosDisponibles: sel
                              ? prev.formatosDisponibles.filter(f => f !== fmt)
                              : [...prev.formatosDisponibles, fmt as FormatoONE],
                          }))}
                          style={{
                            padding: '5px 11px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            border: `1px solid ${sel ? 'var(--tw-terra)' : 'var(--tw-border)'}`,
                            background: sel ? 'rgba(201,110,75,0.15)' : 'transparent',
                            color: sel ? 'var(--tw-terra)' : 'var(--tw-text-muted)',
                            fontFamily: 'Montserrat, sans-serif',
                          }}
                        >{FORMATO_LABELS[fmt] ?? fmt}</button>
                      )
                    })}
                  </div>
                  {/* Formato personalizado adicional */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <input
                      type="text"
                      placeholder="Otro formato, ej. 2kg, 1 saco 69kg…"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const val = (e.target as HTMLInputElement).value.trim()
                          if (val && !form.formatosDisponibles.includes(val as FormatoONE)) {
                            setForm(prev => ({ ...prev, formatosDisponibles: [...prev.formatosDisponibles, val as FormatoONE] }));
                            (e.target as HTMLInputElement).value = ''
                          }
                        }
                      }}
                      style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                    />
                    <button type="button"
                      onClick={e => {
                        const input = e.currentTarget.previousSibling as HTMLInputElement
                        const val = input.value.trim()
                        if (val && !form.formatosDisponibles.includes(val as FormatoONE)) {
                          setForm(prev => ({ ...prev, formatosDisponibles: [...prev.formatosDisponibles, val as FormatoONE] }))
                          input.value = ''
                        }
                      }}
                      style={{ padding: '0 14px', borderRadius: 8, border: '1px solid var(--tw-border)', background: 'var(--tw-card)', color: 'var(--tw-cream)', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >+ Agregar</button>
                  </div>
                  {/* Chips de formatos personalizados agregados */}
                  {form.formatosDisponibles.some(f => ![...FORMATOS_FIXED, ...FORMATOS_NEGOTIABLE].includes(f)) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {form.formatosDisponibles
                        .filter(f => ![...FORMATOS_FIXED, ...FORMATOS_NEGOTIABLE].includes(f))
                        .map(fmt => (
                          <span key={fmt} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            border: '1px solid var(--tw-terra)',
                            background: 'rgba(201,110,75,0.15)',
                            color: 'var(--tw-terra)',
                          }}>
                            {fmt}
                            <button type="button"
                              onClick={() => setForm(prev => ({ ...prev, formatosDisponibles: prev.formatosDisponibles.filter(f => f !== fmt) }))}
                              style={{ background: 'none', border: 'none', color: 'var(--tw-terra)', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 }}
                            >✕</button>
                          </span>
                        ))}
                    </div>
                  )}
                  {form.formatosDisponibles.length === 0 && (
                    <p style={{ margin: '6px 0 0', fontSize: 10, color: 'var(--tw-terra)' }}>Selecciona al menos una presentación</p>
                  )}
                </div>
              )}

              <label style={labelStyle}>Precio por kg (S/)</label>
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--tw-text-muted)', pointerEvents: 'none' }}>S/</span>
                <input type="number" min="1" step="0.5" value={form.precioBaseKgSoles} onChange={e => set('precioBaseKgSoles', e.target.value)} style={{ ...inputStyle, marginBottom: 0, paddingLeft: 28 }} placeholder="66" />
              </div>
              <label style={labelStyle}>Stock disponible (kg)</label>
              <input type="number" value={form.kgDisponibles} onChange={e => set('kgDisponibles', e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} placeholder="100" />
              <label style={labelStyle}>Puntaje ref. (SCA)</label>
              <input type="number" value={form.puntajeReferencial} onChange={e => set('puntajeReferencial', e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} placeholder="85" min="0" max="100" />
              {precioBaseSoles > 0 && (parseInt(form.kgDisponibles) || 0) > 0 && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(143,175,138,0.08)', border: '1px solid rgba(143,175,138,0.2)', borderRadius: 7 }}>
                  <p style={{ margin: '0 0 2px', fontSize: 10, color: 'var(--tw-text-muted)' }}>Valor del lote estimado</p>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--tw-sage)' }}>
                    S/ {((parseInt(form.kgDisponibles) || 0) * precioBaseSoles).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 9, color: 'var(--tw-text-muted)' }}>{form.kgDisponibles} kg × S/ {precioBaseSoles.toFixed(2)}</p>
                </div>
              )}
              {precioBaseSoles > 0 && form.formatosDisponibles.length > 0 && form.tipoCafe !== 'verde' && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 10, color: 'var(--tw-text-muted)' }}>Precios por formato:</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
                    {form.formatosDisponibles.map(fmt => {
                      const kgs: Record<string, number> = { '250g': 0.25, '500g': 0.5, '1kg': 1, '5kg': 5, '10kg': 10, '20kg': 20, '1quintal': 46, '1saco': 60 }
                      const val = Math.round(precioBaseSoles * (kgs[fmt] ?? 1) * 100)
                      return (
                        <div key={fmt} style={{ background: 'var(--tw-bg)', borderRadius: 8, padding: '6px 4px', textAlign: 'center', border: `1px solid var(--tw-border)` }}>
                          <p style={{ margin: 0, fontSize: 9, color: 'var(--tw-text-muted)' }}>{FORMATO_LABELS[fmt] ?? fmt}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 700, color: 'var(--tw-terra)' }}>S/ {(val/100).toFixed(0)}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Card: Estado del lote */}
            <div style={{ background: 'var(--tw-card)', border: `1px solid var(--tw-border)`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
              <p style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Estado del lote</p>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['activo', 'pausado', 'agotado'] as const).map(e => {
                  const sel = estadoProducto === e
                  const col = e === 'activo' ? 'var(--tw-sage)' : e === 'pausado' ? '#f59e0b' : '#ef4444'
                  const labels = { activo: 'Activo', pausado: 'Pausado', agotado: 'Agotado' }
                  return (
                    <button key={e} type="button" onClick={() => setEstadoProducto(e)} style={{
                      flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', textAlign: 'center',
                      border: `1px solid ${sel ? col : 'var(--tw-border)'}`,
                      background: sel ? col + '22' : 'transparent',
                      color: sel ? col : 'var(--tw-text-muted)',
                      fontFamily: 'Montserrat, sans-serif',
                    }}>{labels[e]}</button>
                  )
                })}
              </div>
            </div>

            {/* Card: Reposición programada */}
            <div style={{ background: 'var(--tw-card)', border: `1px solid var(--tw-border)`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Reposición programada</p>
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--tw-sage)', background: 'rgba(143,175,138,0.12)', border: '1px solid rgba(143,175,138,0.25)', padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>Solo para negocios</span>
              </div>
              <p style={{ margin: '0 0 10px', fontSize: 10, color: 'var(--tw-text-muted)', lineHeight: 1.5 }}>
                Permite que negocios compradores reciban este lote automáticamente en un ciclo fijo.
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
                <input type="checkbox" checked={form.reposicionActiva}
                  onChange={e => setForm(prev => ({ ...prev, reposicionActiva: e.target.checked }))}
                  style={{ width: 14, height: 14, accentColor: 'var(--tw-sage)', cursor: 'pointer' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tw-text)' }}>Acepto pedidos de reposición</span>
              </label>
              {form.reposicionActiva && (
                <div>
                  <label style={labelStyle}>Stock mínimo reservado (kg)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <input type="number" min="1" value={form.kgMinReserva}
                      onChange={e => setForm(prev => ({ ...prev, kgMinReserva: e.target.value }))}
                      style={{ ...inputStyle, marginBottom: 0, width: 70 }} placeholder="10" />
                    <span style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>kg reservados para reposiciones activas</span>
                  </div>
                  <label style={labelStyle}>Frecuencias permitidas</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                    {([15, 30, 45, 60] as const).map(dias => {
                      const sel = form.frecuenciaReposicion === dias
                      return (
                        <button key={dias} type="button"
                          onClick={() => setForm(prev => ({ ...prev, frecuenciaReposicion: sel ? null : dias }))}
                          style={{ padding: '4px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600, cursor: 'pointer', border: `1px solid ${sel ? 'var(--tw-sage)' : 'var(--tw-border)'}`, background: sel ? 'var(--tw-sage)22' : 'transparent', color: sel ? 'var(--tw-sage)' : 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}
                        >Cada {dias} días</button>
                      )
                    })}
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '7px 9px', background: 'rgba(143,175,138,0.06)', border: '1px solid rgba(143,175,138,0.2)', borderRadius: 7 }}>
                    <input type="checkbox" checked={form.prioridadTueste}
                      onChange={e => setForm(prev => ({ ...prev, prioridadTueste: e.target.checked }))}
                      style={{ width: 12, height: 12, accentColor: 'var(--tw-sage)', cursor: 'pointer' }} />
                    <span style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>Prioridad de tueste — reservo este lote antes que pedidos nuevos</span>
                  </label>
                </div>
              )}
            </div>

            {/* Guardar */}
            <button onClick={guardar} disabled={guardando} style={{ width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', background: 'var(--tw-terra)', fontSize: 13, fontWeight: 800, color: '#fff', cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1, fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.03em' }}>
              {guardando ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Publicar lote'}
            </button>
            <p style={{ margin: '8px 0 10px', fontSize: 10, color: 'var(--tw-text-muted)', textAlign: 'center' }}>
              El lote será visible en el catálogo inmediatamente
            </p>
            <button onClick={onClose} style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: `1px solid var(--tw-border)`, background: 'none', fontSize: 12, fontWeight: 600, color: 'var(--tw-text-muted)', cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Formulario editar perfil caficultor ──────────────────────────────────────

const REGIONES_PERU = ['Amazonas', 'Ayacucho', 'Cajamarca', 'Cusco', 'Huánuco', 'Junín', 'La Libertad', 'Loreto', 'Pasco', 'Piura', 'Puno', 'San Martín', 'Ucayali']

const FormEditarPerfil: React.FC<{
  caficultor: CaficultorONE
  isDemo: boolean
  onCancel: () => void
  onSaved: (updates: Partial<CaficultorONE>) => void
  onToast: (t: string, tipo?: 'ok' | 'error') => void
  inputStyle: React.CSSProperties
}> = ({ caficultor, isDemo, onCancel, onSaved, onToast, inputStyle }) => {
  const [nombre, setNombre] = React.useState(caficultor.nombre)
  const [region, setRegion] = React.useState(caficultor.region)
  const [distrito, setDistrito] = React.useState(caficultor.distrito)
  const [altitud, setAltitud] = React.useState(String(caficultor.altitudMsnm))
  const [historia, setHistoria] = React.useState(caficultor.historia)
  const [foto, setFoto] = React.useState(caficultor.foto)
  const [guardando, setGuardando] = React.useState(false)

  async function guardar() {
    if (!nombre.trim()) { onToast('El nombre es obligatorio', 'error'); return }
    setGuardando(true)
    try {
      const updates: Partial<CaficultorONE> = {
        nombre: nombre.trim(),
        region: region.trim(),
        distrito: distrito.trim(),
        altitudMsnm: parseInt(altitud) || caficultor.altitudMsnm,
        historia: historia.trim(),
        foto: foto.trim() || caficultor.foto,
      }
      if (isDemo) await demoUpdateCaficultor(caficultor.id, updates)
      else await updateCaficultor(caficultor.id, updates)
      onSaved(updates)
    } catch {
      onToast('No se pudo guardar el perfil', 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div style={{ background: 'var(--tw-card)', borderRadius: 16, padding: '24px', border: `1px solid var(--tw-border)`, maxWidth: 560, width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontFamily: 'Cormorant Garamond, serif', color: 'var(--tw-text)', fontWeight: 700 }}>Editar perfil</h2>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--tw-text-muted)', fontSize: 20, cursor: 'pointer' }}>×</button>
      </div>

      <label style={{ fontSize: 11, color: 'var(--tw-text-muted)', display: 'block', marginBottom: 4 }}>Nombre completo *</label>
      <input value={nombre} onChange={e => setNombre(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} placeholder="Segundo Rojas Herrera" maxLength={80} />

      <div className="perfil-caf-grid-2" style={{ display: 'grid', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--tw-text-muted)', display: 'block', marginBottom: 4 }}>Región</label>
          <select value={region} onChange={e => setRegion(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' as const }}>
            <option value="">Seleccionar...</option>
            {REGIONES_PERU.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--tw-text-muted)', display: 'block', marginBottom: 4 }}>Distrito / localidad</label>
          <input value={distrito} onChange={e => setDistrito(e.target.value)} style={inputStyle} placeholder="San Ignacio" maxLength={60} />
        </div>
      </div>

      <label style={{ fontSize: 11, color: 'var(--tw-text-muted)', display: 'block', marginBottom: 4 }}>Altitud (msnm)</label>
      <input value={altitud} onChange={e => setAltitud(e.target.value)} type="number" min="500" max="3500" style={{ ...inputStyle, marginBottom: 12 }} placeholder="1800" />

      <label style={{ fontSize: 11, color: 'var(--tw-text-muted)', display: 'block', marginBottom: 4 }}>Historia / descripción</label>
      <textarea
        value={historia}
        onChange={e => setHistoria(e.target.value)}
        maxLength={400}
        placeholder="Cuéntanos sobre tu finca, tu familia y tu café..."
        style={{ ...inputStyle, minHeight: 100, resize: 'vertical', marginBottom: 12 }}
      />

      <UploadFoto
        url={foto}
        onUrl={setFoto}
        label="Foto de perfil"
        ruta={`caficultores/${caficultor.id}/perfil`}
        placeholder="Subir foto de perfil"
        aspectRatio="1/1"
      />

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: '13px 0', borderRadius: 10, border: `1px solid var(--tw-border)`, background: 'none', fontSize: 14, fontWeight: 600, color: 'var(--tw-text-muted)', cursor: 'pointer' }}>
          Cancelar
        </button>
        <button onClick={guardar} disabled={guardando} style={{ flex: 2, padding: '13px 0', borderRadius: 10, border: 'none', background: 'var(--tw-terra)', fontSize: 14, fontWeight: 700, color: '#fff', cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1 }}>
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

// ─── Stepper pedido (perspectiva caficultor) ──────────────────────────────────


// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  usuarioId: string
  caficultorId: string
  isDemo?: boolean
  tab?: Tab
  onTabChange?: (t: Tab) => void
}

const PortalCaficultor: React.FC<Props> = ({ usuarioId: _usuarioId, caficultorId, isDemo = false, tab: tabProp }) => {
  const tab: Tab = tabProp ?? 'productos'
  const [caficultor, setCaficultor] = useState<CaficultorONE | null>(null)
  // TRIB-04 / REG: identidad y modalidad tributaria (de one_usuarios.caficultor)
  const [perfilFiscal, setPerfilFiscal] = useState<Pick<NonNullable<UsuarioONE['caficultor']>, 'dni' | 'tipoRegistroCaficultor' | 'ruc' | 'rucCooperativa'> | null>(null)
  const [estadoKyc, setEstadoKyc] = useState<'PENDING_REVIEW' | 'ACTIVO' | 'RECHAZADO' | null>(null)
  const [pedidos, setPedidos] = useState<PedidoONE[]>([])
  const [productos, setProductos] = useState<ProductoONE[]>([])
  const [calificaciones, setCalificaciones] = useState<CalificacionCaficultor[]>([])
  const [loading, setLoading] = useState(true)
  const [accionando, setAccionando] = useState<string | null>(null)
  const [stockEditando, setStockEditando] = useState<string | null>(null)
  const [stockValor, setStockValor] = useState<Record<string, string>>({})
  const [modalProducto, setModalProducto] = useState<{ abierto: boolean; editar?: ProductoONE }>({ abierto: false })
  const [editandoPerfil, setEditandoPerfil] = useState(false)
  const [settingsTab, setSettingsTab] = useState<SettingsTab>(null)
  const [notifState, setNotifState] = useState({
    nuevoPedido: true, pagoVerificado: true, pedidoEntregado: true,
    mensajeNegocio: true, valoracionRecibida: true, stockBajo: false,
    whatsapp: true, email: true, push: true,
  })
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  const [direcciones, setDirecciones] = useState<DireccionONE[]>([])
  const [dirFormAbierto, setDirFormAbierto] = useState(false)
  const [dirFormEditar, setDirFormEditar] = useState<DireccionONE | undefined>(undefined)
  const [dirFormTipo, setDirFormTipo] = useState('finca')
  const [dirFormNombre, setDirFormNombre] = useState('')
  const [dirFormDir, setDirFormDir] = useState('')
  const [dirFormDistrito, setDirFormDistrito] = useState('')
  const [dirFormProvincia, setDirFormProvincia] = useState('')
  const [dirFormDpto, setDirFormDpto] = useState('Lima')
  const [dirFormRef, setDirFormRef] = useState('')
  const [dirFormTel, setDirFormTel] = useState('')
  const [dirFormPrincipal, setDirFormPrincipal] = useState(false)

  // Filtros productos
  const [filtroProceso, setFiltroProceso] = useState<string>('todos')
  const [filtroStock, setFiltroStock] = useState<'todos' | 'bajo' | 'ok'>('todos')
  const [busquedaProducto, setBusquedaProducto] = useState('')

  // Filtros pedidos
  const [filtroPedidoEstado, setFiltroPedidoEstado] = useState<'todos' | 'preparando' | 'en_agencia'>('todos')
  const [filtroPeriodo, setFiltroPeriodo] = useState<'semana' | 'mes' | 'tres_meses'>('mes')
  const [busquedaPedido, setBusquedaPedido] = useState('')
  const [pedidoSubTab, setPedidoSubTab] = useState<PedidoSubTab>('ofertas')

  // Cotizaciones B2B
  const [cotizaciones, setCotizaciones] = useState<CotizacionONE[]>([])
  const [cotizLoading, setCotizLoading] = useState(false)
  const [modalCotiz, setModalCotiz] = useState<CotizacionONE | null>(null)
  const [cotizAccion, setCotizAccion] = useState<'aceptar' | 'rechazar' | 'contraofertar' | null>(null)
  const [cotizForm, setCotizForm] = useState({ kg: '', precioCents: '', plazo: '10 días', mensaje: '' })
  const [cotizEnviando, setCotizEnviando] = useState(false)

  // Pagos caficultor
  const [pagos, setPagos] = useState<PagoCaficultorONE[]>([])
  const [pagosLoading, setPagosLoading] = useState(false)

  // Reclamos activos donde el caficultor es el vendedor (vista defensiva F-10)
  const [reclamosCaf, setReclamosCaf] = useState<ReclamoONE[]>([])
  const [reclamosCafLoading, setReclamosCafLoading] = useState(false)

  // Drawer detalle pedido
  const [pedidoDetalle, setPedidoDetalle] = useState<PedidoONE | null>(null)

  // Ficha lote evidencias
  const [fichaLoteId, setFichaLoteId] = useState<string | null>(null)
  const [fichaEvidencias, setFichaEvidencias] = useState<EvidenciaONE[]>([])
  const [fichaEvidenciasLoading, setFichaEvidenciasLoading] = useState(false)
  // Upload evidencia state
  const evidenciaInputRef = useRef<HTMLInputElement>(null)
  const [evidenciaSubiendo, setEvidenciaSubiendo] = useState(false)
  const [evidenciaNivelSel, setEvidenciaNivelSel] = useState<NivelEvidencia>('N1')
  const [evidenciaMostrarSelector, setEvidenciaMostrarSelector] = useState(false)

  // Modal despacho por agencia
  const [modalDespacho, setModalDespacho] = useState<{ pedidoId: string; agencia: string } | null>(null)
  const [despachoForm, setDespachoForm] = useState({ codigoAgencia: '', fotoDespacho: '' })

  // Filtros historial
  const [busquedaHistorial, setBusquedaHistorial] = useState('')
  const [historialDesde, setHistorialDesde] = useState('')
  const [historialOrden, setHistorialOrden] = useState<'desc' | 'asc'>('desc')

  // Filtros calificaciones
  const [filtroEstrellas, setFiltroEstrellas] = useState<number | null>(null)

  // Logística
  const [ubigeos, setUbigeos] = useState<UbigeoONE[]>([])
  const [logistica, setLogistica] = useState<LogisticaCaficultorONE | null>(null)
  const [logisticaCargando, setLogisticaCargando] = useState(false)
  const [logisticaGuardando, setLogisticaGuardando] = useState(false)
  // Selección ubigeo en cascada
  const [logDepSel, setLogDepSel] = useState('')
  const [logProvSel, setLogProvSel] = useState('')
  const [logUbigeoSel, setLogUbigeoSel] = useState('')
  // Estado de agencias seleccionadas
  const [logAgenciasActivas, setLogAgenciasActivas] = useState<Record<string, boolean>>({})
  const [logAgenciasDomicilio, setLogAgenciasDomicilio] = useState<Record<string, boolean>>({})
  const [logAgenciasDias, setLogAgenciasDias] = useState<Record<string, { min: string; max: string }>>({})
  const [logAgenciasExtra, setLogAgenciasExtra] = useState<{ id: string; nombre: string }[]>([])
  const [logAgenciaInputVal, setLogAgenciaInputVal] = useState('')
  // Wizard: 2 pasos — A (Origen + agencias), B (Reglas gratis)
  const [logConfigStep, setLogConfigStep] = useState<0 | 1>(0)
  const [logGratisAgencia, setLogGratisAgencia] = useState(true)
  const [logGratisAgenciaKg, setLogGratisAgenciaKg] = useState('5')
  const [logGratisDomicilio, setLogGratisDomicilio] = useState(true)
  const [logGratisDomicilioKg, setLogGratisDomicilioKg] = useState('15')
  const [logTarifaAgencia, setLogTarifaAgencia] = useState('15')
  const [logTarifaDomicilio, setLogTarifaDomicilio] = useState('25')

  function toast(text: string, tipo: 'ok' | 'error' | 'info' = 'ok') {
    const id = Date.now()
    setToasts(prev => [...prev, { id, text, tipo }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  useEffect(() => {
    async function cargar() {
      try {
        const [cafic, peds, prods] = await Promise.all([
          isDemo ? demoFetchCaficultor(caficultorId) : fetchCaficultor(caficultorId).catch(() => null),
          isDemo ? demoFetchPedidosByCaficultor(caficultorId) : fetchPedidosByCaficultor(caficultorId),
          isDemo ? demoFetchProductosByCaficultorLive(caficultorId) : fetchProductos().then(all => all.filter(p => p.caficultorId === caficultorId)),
        ])
        setCaficultor(cafic)
        setPedidos(peds)
        setProductos(prods)
        if (!isDemo) {
          fetchUsuario(caficultorId).then(u => {
            setEstadoKyc(u.estadoKyc ?? null)
            setPerfilFiscal({
              dni: u.caficultor?.dni,
              tipoRegistroCaficultor: u.caficultor?.tipoRegistroCaficultor,
              ruc: u.caficultor?.ruc,
              rucCooperativa: u.caficultor?.rucCooperativa,
            })
          }).catch(() => {})
          const cals = await fetchCalificacionesByCaficultor(caficultorId).catch(() => [])
          setCalificaciones(cals)
        }
      } catch (e) {
        toast('Error al cargar datos', 'error')
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [caficultorId, isDemo])

  // Cargar cotizaciones cuando el usuario navega a la tab de pedidos
  useEffect(() => {
    if (tab !== 'pedidos' || isDemo) return
    setCotizLoading(true)
    fetchCotizacionesCaficultor(caficultorId)
      .then(data => setCotizaciones(data))
      .catch(() => toast('No se pudieron cargar las ofertas', 'error'))
      .finally(() => setCotizLoading(false))
  }, [tab, caficultorId, isDemo]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab !== 'pagos' || isDemo) return
    setPagosLoading(true)
    fetchPagosByCaficultor(caficultorId)
      .then(data => setPagos(data))
      .catch(() => toast('No se pudieron cargar los pagos', 'error'))
      .finally(() => setPagosLoading(false))
  }, [tab, caficultorId, isDemo]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cargar reclamos donde este caficultor es vendedor (vista defensiva F-10)
  useEffect(() => {
    if (tab !== 'pedidos' || isDemo) return
    setReclamosCafLoading(true)
    fetchReclamosByCaficultor(caficultorId)
      .then(data => setReclamosCaf(data))
      .catch(() => console.warn('[PortalCaficultor] No se pudieron cargar reclamos del caficultor'))
      .finally(() => setReclamosCafLoading(false))
  }, [tab, caficultorId, isDemo]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleResponderCotizacion() {
    if (!modalCotiz || !cotizAccion) return
    setCotizEnviando(true)
    try {
      if (cotizAccion === 'contraofertar') {
        const kg = parseFloat(cotizForm.kg)
        const precio = parseFloat(cotizForm.precioCents)
        if (!kg || !precio) { toast('Ingresa kg y precio', 'error'); return }
        await responderCotizacion({
          cotizacionId: modalCotiz.id,
          autorRol: 'seller',
          accion: 'contraofertar',
          kgSolicitados: kg,
          precioOfertadoCents: Math.round(precio * 100),
          plazoEntrega: cotizForm.plazo,
          mensaje: cotizForm.mensaje,
        })
      } else {
        await responderCotizacion({ cotizacionId: modalCotiz.id, autorRol: 'seller', accion: cotizAccion })
      }
      toast(cotizAccion === 'aceptar' ? 'Oferta aceptada' : cotizAccion === 'rechazar' ? 'Oferta rechazada' : 'Contraoferta enviada', 'ok')
      setModalCotiz(null)
      setCotizAccion(null)
      const updated = await fetchCotizacionesCaficultor(caficultorId)
      setCotizaciones(updated)
    } catch {
      toast('Error al responder', 'error')
    } finally {
      setCotizEnviando(false)
    }
  }

  const productoIds = new Set(productos.map(p => p.id))

  // Cargar ubigeos y logística al entrar al tab Perfil o Settings (sub-tab Envío)
  useEffect(() => {
    if (tab !== 'perfil') return
    if (ubigeos.length > 0) return // ya cargado
    setLogisticaCargando(true)
    Promise.all([
      isDemo ? demoFetchUbigeos() : fetchUbigeos(),
      isDemo ? demoFetchLogisticaCaficultor(caficultorId) : fetchLogisticaCaficultor(caficultorId),
    ]).then(([ubs, log]) => {
      setUbigeos(ubs)
      if (log) {
        setLogistica(log)
        // Pre-seleccionar ubigeo guardado
        setLogDepSel(log.departamento)
        setLogProvSel(log.provincia)
        setLogUbigeoSel(log.ubigeo)
        setLogAgenciasActivas(log.agenciasActivas ?? {})
        setLogAgenciasDomicilio(log.agenciasPermiteDomicilio ?? {})
        // Pre-llenar días por agencia desde agenciasDetalle
        if (log.agenciasDetalle) {
          const dias: Record<string, { min: string; max: string }> = {}
          for (const [id, det] of Object.entries(log.agenciasDetalle)) {
            dias[id] = { min: String(det.diasMin ?? '2'), max: String(det.diasMax ?? '4') }
          }
          setLogAgenciasDias(dias)
        }
        if (log.gratisAgenciaActivo !== undefined) setLogGratisAgencia(log.gratisAgenciaActivo)
        if (log.gratisAgenciaKg !== undefined) setLogGratisAgenciaKg(String(log.gratisAgenciaKg))
        if (log.gratisDomicilioActivo !== undefined) setLogGratisDomicilio(log.gratisDomicilioActivo)
        if (log.gratisDomicilioKg !== undefined) setLogGratisDomicilioKg(String(log.gratisDomicilioKg))
        if (log.tarifaFijaAgenciaSoles !== undefined) setLogTarifaAgencia(String(log.tarifaFijaAgenciaSoles))
        if (log.tarifaFijaDomicilioSoles !== undefined) setLogTarifaDomicilio(String(log.tarifaFijaDomicilioSoles))
      }
    }).catch(() => toast('Error al cargar datos de logística', 'error'))
      .finally(() => setLogisticaCargando(false))
  }, [tab, caficultorId, isDemo, ubigeos.length])

  // Cargar evidencias cuando se abre la ficha de un lote
  useEffect(() => {
    if (!fichaLoteId || isDemo) return
    setFichaEvidenciasLoading(true)
    fetchEvidenciasByProducto(fichaLoteId)
      .then(evs => setFichaEvidencias(evs))
      .catch(() => {/* silencio — UI muestra lista vacía */})
      .finally(() => setFichaEvidenciasLoading(false))
  }, [fichaLoteId, isDemo])

  function misItems(pedido: PedidoONE) {
    return pedido.items.filter(i => productoIds.has(i.productoId) || i.caficultorId === caficultorId)
  }

  // Estado propio del caficultor en un pedido
  // Nuevo modelo: pedido es solo del caficultor, usa campos raíz
  // Legacy: si tiene enviosCaficultor, buscar por caficultorId dentro del mapa
  function miStatusEnPedido(p: PedidoONE): LogisticaStatusONE {
    // Nuevo modelo: pedido pertenece solo a este caficultor
    if (p.caficultorId === caficultorId) return p.logisticaStatus
    // Legacy: multi-caficultor con enviosCaficultor
    if (p.enviosCaficultor?.[caficultorId]) return p.enviosCaficultor[caficultorId].logisticaStatus
    // Fallback: estado global del pedido
    return p.logisticaStatus
  }

  function miCodigoEnPedido(p: PedidoONE): string | undefined {
    // Nuevo modelo: campos raíz
    if (p.caficultorId === caficultorId) return p.codigoAgencia
    // Legacy: multi-caficultor con enviosCaficultor
    if (p.enviosCaficultor?.[caficultorId]) return p.enviosCaficultor[caficultorId].codigoAgencia
    // Fallback: si no hay enviosCaficultor, usar codigoAgencia raíz
    if (Object.keys(p.enviosCaficultor ?? {}).length === 0) return p.codigoAgencia
    return undefined
  }

  // ESC-04: canonical pagoStatus is 'PAID'; 'verificado' kept for legacy records
  const pagoConfirmado = (p: PedidoONE) => (p.pagoStatus as string) === 'PAID' || (p.pagoStatus as string) === 'verificado'
  const paraDespachar = pedidos.filter(p => pagoConfirmado(p) && miStatusEnPedido(p) === 'preparando')
  const enCamino = pedidos.filter(p => miStatusEnPedido(p) === 'en_agencia')
  const entregados = pedidos.filter(p => miStatusEnPedido(p) === 'entregado')

  const scorePromedio = calificaciones.length > 0
    ? Math.round(calificaciones.reduce((s, c) => s + c.estrellas, 0) / calificaciones.length * 10) / 10
    : caficultor?.scoreConfianza ?? 0

  function abrirDespacho(pedido: PedidoONE) {
    setDespachoForm({ codigoAgencia: '', fotoDespacho: '' })
    setModalDespacho({ pedidoId: pedido.id, agencia: pedido.agencia ?? 'olva' })
  }

  async function confirmarDespacho() {
    if (!modalDespacho) return
    const { codigoAgencia, fotoDespacho } = despachoForm
    if (!codigoAgencia.trim()) {
      toast('Ingresa el código de tracking de la agencia', 'error')
      return
    }
    setAccionando(modalDespacho.pedidoId)
    try {
      const pedidoActual = pedidos.find(p => p.id === modalDespacho.pedidoId)
      // Nuevo modelo: pedido pertenece solo a este caficultor — no pasar caficultorId en data
      const esNuevoModelo = pedidoActual?.caficultorId === caficultorId
      const data = esNuevoModelo
        ? { codigoAgencia: codigoAgencia.trim(), fotoDespacho: fotoDespacho.trim() || undefined }
        : { codigoAgencia: codigoAgencia.trim(), fotoDespacho: fotoDespacho.trim() || undefined, caficultorId }
      if (isDemo) await demoDespacharAgencia(modalDespacho.pedidoId, data)
      else await despacharAgencia(modalDespacho.pedidoId, data)
      setPedidos(prev => prev.map(p => p.id === modalDespacho.pedidoId
        ? {
            ...p,
            logisticaStatus: 'en_agencia',
            codigoAgencia: codigoAgencia.trim(),
            fotoDespacho: fotoDespacho.trim() || undefined,
            // Legacy: también actualizar enviosCaficultor si era modelo antiguo
            ...(esNuevoModelo ? {} : {
              enviosCaficultor: {
                ...(p.enviosCaficultor ?? {}),
                [caficultorId]: {
                  codigoAgencia: codigoAgencia.trim(),
                  agencia: modalDespacho.agencia as any,
                  fotoDespacho: fotoDespacho.trim() || undefined,
                  logisticaStatus: 'en_agencia',
                }
              }
            })
          }
        : p
      ))
      setModalDespacho(null)
      toast('Pedido despachado — la cafetería puede ver el código de tracking', 'ok')
    } catch {
      toast('Error al registrar el despacho', 'error')
    } finally { setAccionando(null) }
  }

  async function guardarStock(productoId: string) {
    const val = parseInt(stockValor[productoId] ?? '')
    if (isNaN(val) || val < 0) { toast('Valor de stock inválido', 'error'); return }
    setAccionando(productoId)
    try {
      if (isDemo) await demoUpdateStock(productoId, val)
      else await updateStock(productoId, val)
      setProductos(prev => prev.map(p => p.id === productoId ? { ...p, kgDisponibles: val } : p))
      setStockEditando(null)
      toast('Stock actualizado', 'ok')
    } catch {
      toast('Error al actualizar stock', 'error')
    } finally { setAccionando(null) }
  }

  async function toggleStatus(producto: ProductoONE) {
    const nuevoStatus = producto.status === 'activo' ? 'pausado' : 'activo'
    setAccionando(producto.id)
    try {
      if (isDemo) await demoUpdateProducto(producto.id, { status: nuevoStatus })
      else await updateProducto(producto.id, { status: nuevoStatus })
      setProductos(prev => prev.map(p => p.id === producto.id ? { ...p, status: nuevoStatus } : p))
      toast(`Producto ${nuevoStatus === 'activo' ? 'activado' : 'pausado'}`, 'info')
    } catch {
      toast('Error al cambiar estado', 'error')
    } finally { setAccionando(null) }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--tw-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: `3px solid var(--tw-terra)`, borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 13 }}>Cargando...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (estadoKyc === 'PENDING_REVIEW') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--tw-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Montserrat, sans-serif' }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, color: 'var(--tw-cream)', marginBottom: 12, margin: '0 0 12px' }}>
            Tu cuenta está en revisión
          </h2>
          <p style={{ fontSize: 13, color: 'var(--tw-text-muted)', lineHeight: 1.7, marginBottom: 20 }}>
            Estamos verificando tu identidad (24–48 horas hábiles). Te notificaremos por email cuando tu cuenta esté activa.
          </p>
          <div style={{ background: 'rgba(143,175,138,0.07)', border: '1px solid rgba(143,175,138,0.2)', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: 'var(--tw-sage)' }}>
            ¿Tienes dudas? Escríbenos a tunaywasi@gmail.com
          </div>
        </div>
      </div>
    )
  }

  if (estadoKyc === 'RECHAZADO') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--tw-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Montserrat, sans-serif' }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, color: '#ef4444', marginBottom: 12, margin: '0 0 12px' }}>
            Verificación rechazada
          </h2>
          <p style={{ fontSize: 13, color: 'var(--tw-text-muted)', lineHeight: 1.7 }}>
            No pudimos verificar tu identidad. Por favor contáctanos a tunaywasi@gmail.com para resolver el problema.
          </p>
        </div>
      </div>
    )
  }

  const nombreCaficultor = caficultor?.nombre ?? 'Mi portal'

  // ─── Tabs ─────────────────────────────────────────────────────────────────

  function renderOfertasCaf() {
    const cardBase: React.CSSProperties = {
      background: 'var(--tw-card)', borderRadius: 12, padding: '14px 16px',
      border: `1px solid var(--tw-border)`, marginBottom: 10,
    }
    const btnPrimary: React.CSSProperties = {
      padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--tw-terra)',
      color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
    }
    const btnWarn: React.CSSProperties = {
      padding: '7px 14px', borderRadius: 8, border: `1px solid var(--tw-terra)`,
      background: 'none', color: 'var(--tw-terra)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
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
        <div style={{ textAlign: 'center', padding: '40px 16px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🤝</div>
          <p style={{ fontSize: 13, color: 'var(--tw-text-muted)', margin: 0 }}>No tienes ofertas de cotización pendientes</p>
        </div>
      )
    }

    function horasRestantes(expiraAt?: string): { texto: string; urgente: boolean } {
      if (!expiraAt) return { texto: '', urgente: false }
      const diff = new Date(expiraAt).getTime() - Date.now()
      if (diff <= 0) return { texto: 'Expirada', urgente: true }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const urgente = h < 8
      return { texto: `${h}h ${m}m`, urgente }
    }

    return (
      <div>
        {activas.map(cotiz => {
          const ultimaRonda = cotiz.rondas[cotiz.rondas.length - 1]
          const precioKg = ultimaRonda ? (ultimaRonda.precioOfertadoCents / 100).toFixed(2) : '—'
          const totalS = ultimaRonda ? ((ultimaRonda.precioOfertadoCents * ultimaRonda.kgSolicitados) / 100).toFixed(2) : '—'
          const { texto: tiempoTexto, urgente } = horasRestantes(cotiz.expiraAt)
          const esContraoferta = cotiz.estado === 'CONTRAOFERTA'
          const esPendientePropia = cotiz.estado === 'RESPONDIDA'

          return (
            <div key={cotiz.id} style={{ ...cardBase, borderLeft: esContraoferta ? '3px solid #f59e0b' : urgente ? '3px solid var(--tw-terra)' : `3px solid var(--tw-border)` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(201,110,75,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>☕</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tw-text)' }}>{cotiz.negocioNombre}{cotiz.negocioRazonSocial ? ` · ${cotiz.negocioRazonSocial}` : ''}</div>
                  <div style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>{cotiz.productoNombre}</div>
                </div>
                {esContraoferta
                  ? <div style={{ fontSize: 9, color: '#f59e0b', fontWeight: 700 }}>⚡ Contraoferta recibida</div>
                  : esPendientePropia
                  ? <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', fontWeight: 400 }}>⏳ Esperando al comprador</div>
                  : tiempoTexto
                  ? <div style={{ fontSize: 9, color: urgente ? 'var(--tw-terra)' : 'var(--tw-text-muted)', fontWeight: urgente ? 700 : 400 }}>⏰ Vence en {tiempoTexto}</div>
                  : null
                }
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: esContraoferta ? '#f59e0b' : 'var(--tw-terra)' }}>S/ {precioKg}/kg</span>
                <span style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>· {ultimaRonda?.kgSolicitados ?? '—'} kg</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: 'var(--tw-text)' }}>Total: S/ {totalS}</span>
              </div>
              <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', marginBottom: 10 }}>
                Ronda {cotiz.rondaActual} de 3 · {esContraoferta ? 'Contraoferta del comprador' : esPendientePropia ? 'Esperando respuesta del comprador' : 'Solicitud inicial'}
                {ultimaRonda?.mensaje ? ` — "${ultimaRonda.mensaje}"` : ''}
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: urgente ? 8 : 0 }}>
                {!esPendientePropia && <button style={btnPrimary} onClick={() => { setModalCotiz(cotiz); setCotizAccion('aceptar') }}>✅ Aceptar</button>}
                {!esPendientePropia && cotiz.rondaActual < 3 && (
                  <button style={btnWarn} onClick={() => { setModalCotiz(cotiz); setCotizAccion('contraofertar'); setCotizForm({ kg: String(ultimaRonda?.kgSolicitados ?? ''), precioCents: String((ultimaRonda?.precioOfertadoCents ?? 0) / 100), plazo: ultimaRonda?.plazoEntrega ?? '10 días', mensaje: '' }) }}>↩ Contraofertar</button>
                )}
                <button style={btnGhost} onClick={() => { setModalCotiz(cotiz); setCotizAccion('rechazar') }}>✕ Rechazar</button>
              </div>

              {urgente && (
                <div style={{ padding: '6px 10px', background: 'rgba(201,110,75,.05)', border: `1px solid rgba(201,110,75,.12)`, borderRadius: 7, fontSize: 9, color: 'var(--tw-text-muted)', marginTop: 0 }}>
                  🔴 Si no respondes antes de que expire, la oferta caduca automáticamente
                </div>
              )}
            </div>
          )
        })}

        {/* Modal de acción */}
        {modalCotiz && cotizAccion && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 16 }}>
            <div style={{ background: 'var(--tw-card)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 420, border: `1px solid var(--tw-border)` }}>
              <h3 style={{ margin: '0 0 16px', fontFamily: 'Cormorant Garamond, serif', fontSize: 20, color: 'var(--tw-text)' }}>
                {cotizAccion === 'aceptar' ? '✅ Aceptar oferta' : cotizAccion === 'rechazar' ? '✕ Rechazar oferta' : '↩ Contraofertar'}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--tw-text-muted)', marginBottom: 16 }}>
                {modalCotiz.productoNombre} · {modalCotiz.negocioNombre}
              </p>

              {cotizAccion === 'contraofertar' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--tw-text-muted)', display: 'block', marginBottom: 4 }}>Kg ofertados</label>
                    <input type="number" value={cotizForm.kg} onChange={e => setCotizForm(f => ({ ...f, kg: e.target.value }))}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: `1px solid var(--tw-border)`, background: 'var(--tw-bg)', color: 'var(--tw-text)', fontSize: 13, fontFamily: 'Montserrat, sans-serif' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--tw-text-muted)', display: 'block', marginBottom: 4 }}>Precio por kg (S/)</label>
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
                  El negocio será notificado del rechazo. Esta acción no se puede deshacer.
                </p>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button onClick={handleResponderCotizacion} disabled={cotizEnviando}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: cotizAccion === 'rechazar' ? '#e74c3c' : 'var(--tw-terra)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: cotizEnviando ? 'default' : 'pointer', opacity: cotizEnviando ? 0.6 : 1, fontFamily: 'Montserrat, sans-serif' }}>
                  {cotizEnviando ? 'Enviando...' : cotizAccion === 'aceptar' ? 'Confirmar aceptación' : cotizAccion === 'rechazar' ? 'Confirmar rechazo' : 'Enviar contraoferta'}
                </button>
                <button onClick={() => { setModalCotiz(null); setCotizAccion(null) }}
                  style={{ padding: '10px 16px', borderRadius: 8, border: `1px solid var(--tw-border)`, background: 'none', color: 'var(--tw-text-muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Vista defensiva F-10: reclamos activos donde el caficultor es vendedor ──
  function renderReclamosCaficultor() {
    const ESTADOS_ACTIVOS: ReclamoONE['estado'][] = [
      'ABIERTO', 'EN_REVISION', 'ESPERANDO_INFO', 'ESCALADO', 'DECISION_PENDIENTE',
    ]
    const activos = reclamosCaf.filter(r => ESTADOS_ACTIVOS.includes(r.estado))
    const resueltos = reclamosCaf.filter(r => !ESTADOS_ACTIVOS.includes(r.estado))

    function slaLabel(r: ReclamoONE): string {
      const ms = Number(r.createdAt) || new Date(r.createdAt).getTime()
      if (!ms) return ''
      const sla7d = 7 * 24 * 60 * 60 * 1000
      const restMs = (ms + sla7d) - Date.now()
      const dias = Math.ceil(restMs / (24 * 60 * 60 * 1000))
      return dias > 0
        ? `⏱ SLA: ${dias} día${dias === 1 ? '' : 's'} hábil${dias === 1 ? '' : 'es'} restante${dias === 1 ? '' : 's'}`
        : '⚠ Plazo SLA vencido — escalando'
    }

    function estadoColor(estado: string): string {
      if (estado === 'ABIERTO') return '#ef4444'
      if (estado === 'EN_REVISION') return '#f59e0b'
      if (estado === 'ESPERANDO_INFO') return '#f39c12'
      if (estado === 'ESCALADO') return '#c96e4b'
      if (estado === 'DECISION_PENDIENTE') return '#7c3aed'
      if (estado.startsWith('RESUELTO_COMPRADOR') || estado.startsWith('RESOLUCION_COMPRADOR')) return '#8faf8a'
      return '#888'
    }

    function estadoLabelLocal(estado: string): string {
      const MAP: Record<string, string> = {
        ABIERTO: 'Abierto', EN_REVISION: 'En revisión', ESPERANDO_INFO: 'Esperando info',
        ESCALADO: 'Escalado', DECISION_PENDIENTE: 'Decisión pendiente',
        RESOLUCION_COMPRADOR: 'Res. comprador', RESOLUCION_CAFICULTOR: 'Res. caficultor',
        EJECUCION_FINANCIERA: 'Ejec. financiera', RESUELTO_COMPRADOR: 'Resuelto (comprador)',
        RESUELTO_CAFICULTOR: 'Cerrado sin reembolso', EJECUCION_FALLIDA: 'Ejecución fallida',
      }
      return MAP[estado] ?? estado
    }

    if (reclamosCafLoading) return <div style={{ padding: 32, textAlign: 'center', color: 'var(--tw-text-muted)' }}>Cargando reclamos&hellip;</div>

    return (
      <div>
        {activos.length > 0 && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>&#9888;</span>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#ef4444' }}>{activos.length} reclamo{activos.length > 1 ? 's' : ''} activo{activos.length > 1 ? 's' : ''}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--tw-text-muted)' }}>Un comprador ha reportado un problema con este pedido. El equipo de TunayWasi está revisando el caso. Tienes hasta 72h para agregar información adicional si lo necesitas.</p>
            </div>
          </div>
        )}
        {reclamosCaf.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--tw-text-muted)' }}>
            <p style={{ fontSize: 32, margin: '0 0 8px' }}>&#10003;</p>
            <p style={{ margin: 0, fontSize: 14 }}>No tienes reclamos activos</p>
          </div>
        ) : (
          <div>
            {activos.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Activos</p>
                {activos.map(r => (
                  <div key={r.id} style={{ background: 'var(--tw-surface)', border: '1px solid var(--tw-border)', borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tw-text)' }}>{r.tipo.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: estadoColor(r.estado) + '22', color: estadoColor(r.estado), border: `1px solid ${estadoColor(r.estado)}44` }}>
                        {estadoLabelLocal(r.estado)}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--tw-text-muted)' }}>Pedido <strong>{r.pedidoRef}</strong> &bull; {r.negocioNombre}</p>
                    <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--tw-text-muted)' }}>Motivo: {r.descripcion.slice(0, 100)}{r.descripcion.length > 100 ? '…' : ''}</p>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', margin: '4px 0 6px' }}>
                      <span style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>
                        &#128197; Abierto: {formatFecha(r.createdAt)}
                      </span>
                      {r.montoReembolsoCents != null && (
                        <span style={{ fontSize: 10, color: 'var(--tw-text-muted)', fontWeight: 600 }}>
                          Monto en disputa: {formatCents(r.montoReembolsoCents)}
                        </span>
                      )}
                    </div>
                    {slaLabel(r) && (
                      <p style={{ margin: 0, fontSize: 10, color: r.estado === 'ABIERTO' ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>{slaLabel(r)}</p>
                    )}
                    {r.fotosUrls && r.fotosUrls.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        {r.fotosUrls.map((url: string, i: number) => (
                          <img key={i} src={url} alt={`evidencia-${i + 1}`} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--tw-border)' }} />
                        ))}
                      </div>
                    )}
                    <p style={{ margin: '8px 0 0', fontSize: 10, color: 'var(--tw-text-muted)' }}>
                      &#128274; El pago está retenido (escrow) hasta la resolución del reclamo. El equipo TunayWasi contactará a ambas partes.
                    </p>
                  </div>
                ))}
              </div>
            )}
            {resueltos.length > 0 && (
              <div>
                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Resueltos</p>
                {resueltos.map(r => (
                  <div key={r.id} style={{ background: 'var(--tw-surface)', border: '1px solid var(--tw-border)', borderRadius: 8, padding: '10px 14px', marginBottom: 8, opacity: 0.7 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--tw-text-muted)' }}>{r.tipo.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: estadoColor(r.estado) + '22', color: estadoColor(r.estado) }}>
                        {estadoLabelLocal(r.estado)}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--tw-text-muted)' }}>Pedido {r.pedidoRef} &bull; {r.negocioNombre} &bull; {formatFecha(r.createdAt)}</p>
                    {r.montoReembolsoCents != null && (
                      <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--tw-text-muted)' }}>Monto: {formatCents(r.montoReembolsoCents)}</p>
                    )}
                    {r.notaTW && <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--tw-text-muted)' }}>&#128203; TunayWasi: {r.notaTW}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  function renderPedidosTab() {
    const tabStyle = (active: boolean): React.CSSProperties => ({
      padding: '8px 16px', borderRadius: 0, border: 'none',
      borderBottom: active ? `2px solid var(--tw-terra)` : '2px solid transparent',
      background: 'none', color: active ? 'var(--tw-text)' : 'var(--tw-text-muted)',
      fontSize: 14, fontWeight: active ? 700 : 500, cursor: 'pointer',
      fontFamily: 'Montserrat, sans-serif', whiteSpace: 'nowrap',
    })
    const SUB_TABS: { id: PedidoSubTab; label: string }[] = [
      { id: 'ofertas',  label: '🤝 Ofertas' },
      { id: 'activos',  label: '📦 Pedidos activos' },
      { id: 'historial', label: '📋 Historial' },
      { id: 'reclamos', label: '⚠ Reclamos' },
    ]
    return (
      <div>
        <div className="settings-tabs">
          {SUB_TABS.map(s => (
            <button key={s.id} onClick={() => setPedidoSubTab(s.id)} style={{ ...tabStyle(pedidoSubTab === s.id), flexShrink: 0 }}>
              {s.label}
              {s.id === 'ofertas' && cotizaciones.filter(c => c.estado === 'ENVIADA' || c.estado === 'RESPONDIDA' || c.estado === 'CONTRAOFERTA').length > 0 && (
                <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 10, background: 'var(--tw-terra)', color: '#fff', fontSize: 10, fontWeight: 700 }}>
                  {cotizaciones.filter(c => c.estado === 'ENVIADA' || c.estado === 'RESPONDIDA' || c.estado === 'CONTRAOFERTA').length}
                </span>
              )}
              {s.id === 'reclamos' && reclamosCaf.filter(r => ['ABIERTO', 'EN_REVISION', 'ESPERANDO_INFO', 'ESCALADO', 'DECISION_PENDIENTE'].includes(r.estado)).length > 0 && (
                <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 10, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700 }}>
                  {reclamosCaf.filter(r => ['ABIERTO', 'EN_REVISION', 'ESPERANDO_INFO', 'ESCALADO', 'DECISION_PENDIENTE'].includes(r.estado)).length}
                </span>
              )}
            </button>
          ))}
        </div>
        {pedidoSubTab === 'ofertas'   && renderOfertasCaf()}
        {pedidoSubTab === 'activos'   && renderPedidos()}
        {pedidoSubTab === 'historial' && renderHistorial()}
        {pedidoSubTab === 'reclamos'  && renderReclamosCaficultor()}
      </div>
    )
  }

  function renderPedidos() {
    const todos = pedidos.filter(p => miStatusEnPedido(p) !== 'entregado')
    const filtrados = todos.filter(p => {
      if (filtroPedidoEstado === 'preparando' && miStatusEnPedido(p) !== 'preparando') return false
      if (filtroPedidoEstado === 'en_agencia' && miStatusEnPedido(p) !== 'en_agencia') return false
      if (busquedaPedido && !p.nombreLocal.toLowerCase().includes(busquedaPedido.toLowerCase()) && !p.id.includes(busquedaPedido)) return false
      return true
    })

    const porCobrarCents = todos.filter(p => (p.pagoStatus as string) !== 'PAID' && (p.pagoStatus as string) !== 'verificado').reduce((s, p) => s + p.totalCents, 0)
    const cobradoMesCents = entregados.reduce((s, p) => s + p.totalCents, 0)

    const kpis = [
      { label: 'Pedidos activos', value: String(todos.length) },
      { label: 'Por cobrar', value: porCobrarCents > 0 ? `S/ ${(porCobrarCents / 100).toLocaleString('es-PE', { minimumFractionDigits: 0 })}` : 'S/ 0' },
      { label: 'Cobrado este mes', value: cobradoMesCents > 0 ? `S/ ${(cobradoMesCents / 100).toLocaleString('es-PE', { minimumFractionDigits: 0 })}` : 'S/ 0' },
      { label: 'Calificación', value: scorePromedio > 0 ? `${scorePromedio.toFixed(1)} ⭐` : '— ⭐' },
    ]

    return (
      <div>
        {/* ── 4 KPI cards ── */}
        <div className="grid-kpis" style={{ marginBottom: 16 }}>
          {kpis.map(({ label, value }) => (
            <div key={label} style={{ background: 'var(--tw-card)', borderRadius: 12, padding: '12px 14px', border: `1px solid var(--tw-border)` }}>
              <p style={{ margin: '0 0 3px', fontFamily: 'Cormorant Garamond, serif', fontSize: 24, fontWeight: 700, color: 'var(--tw-text)', lineHeight: 1 }}>{value}</p>
              <p style={{ margin: 0, fontSize: 9, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* ── Filtros de período ── */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {([
            { key: 'semana', label: '📅 Esta semana' },
            { key: 'mes',    label: 'Este mes' },
            { key: 'tres_meses', label: 'Últimos 3 meses' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFiltroPeriodo(key)}
              style={{
                padding: '5px 12px', borderRadius: 20, border: `1px solid ${filtroPeriodo === key ? 'var(--tw-terra)' : 'var(--tw-border)'}`,
                background: 'none', color: filtroPeriodo === key ? 'var(--tw-terra)' : 'var(--tw-text-muted)',
                fontSize: 11, fontWeight: filtroPeriodo === key ? 700 : 400, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
              }}
            >{label}</button>
          ))}
        </div>

        {/* ── Filtros de estado ── */}
        <FilterBar>
          <SearchInput value={busquedaPedido} onChange={setBusquedaPedido} placeholder="Buscar cafetería o ID..." />
          <FilterChip label={`Todos (${todos.length})`} active={filtroPedidoEstado === 'todos'} onClick={() => setFiltroPedidoEstado('todos')} />
          <FilterChip label={`Preparando (${paraDespachar.length})`} color={'#f39c12'} active={filtroPedidoEstado === 'preparando'} onClick={() => setFiltroPedidoEstado('preparando')} />
          <FilterChip label={`En agencia (${enCamino.length})`} color={'#4a90c4'} active={filtroPedidoEstado === 'en_agencia'} onClick={() => setFiltroPedidoEstado('en_agencia')} />
        </FilterBar>

        {filtrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ fontSize: 13, color: 'var(--tw-text-muted)' }}>Sin pedidos para estos filtros</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtrados.map(p => {
              const miStatus = miStatusEnPedido(p)
              const isPend = miStatus === 'preparando'
              const isAgencia = miStatus === 'en_agencia' || miStatus === 'en_disputa'
              const pagoOk = (p.pagoStatus as string) === 'PAID' || (p.pagoStatus as string) === 'verificado'

              const statusColor = isPend && pagoOk ? 'var(--tw-sage)'
                : isPend ? '#f39c12'
                : miStatus === 'en_disputa' ? '#f59e0b'
                : '#4a90c4'
              const statusLabel = isPend && pagoOk ? 'Pago OK · Listo para despachar'
                : isPend ? 'Pago pendiente'
                : miStatus === 'en_disputa' ? '⚠ En disputa'
                : 'En tránsito'

              const miCodigo = miCodigoEnPedido(p)

              const total = misItems(p).reduce((s, i) => s + i.subtotalCents, 0)
              const fechaPedido = new Date(p.createdAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })

              return (
                <div key={p.id} style={{
                  background: 'var(--tw-card)', borderRadius: 12, overflow: 'hidden',
                  border: `1px solid var(--tw-border)`,
                }}>
                  {/* ── Header ── */}
                  <div style={{
                    padding: '12px 16px', borderBottom: `1px solid var(--tw-border)`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: statusColor,
                        padding: '3px 10px', borderRadius: 20,
                        background: statusColor + '20', border: `1px solid ${statusColor}40`,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        {statusLabel}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tw-text)' }}>{p.nombreLocal}</span>
                      <span style={{ fontSize: 11, color: 'var(--tw-text-muted)' }}>{p.distritoLocal}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--tw-text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{p.id.slice(-10).toUpperCase()}</span>
                      <span style={{ fontSize: 11, color: 'var(--tw-text-muted)' }}>{fechaPedido}</span>
                    </div>
                  </div>

                  {/* ── Tracking ── */}
                  {isAgencia && miCodigo && (
                    <div style={{ padding: '8px 16px', background: '#4a90c4' + '10', borderBottom: `1px solid ${'#4a90c4'}25`, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: '#4a90c4', fontWeight: 700 }}>📦 {p.agencia?.toUpperCase()}</span>
                      <span style={{ width: 1, height: 12, background: 'var(--tw-border)' }} />
                      <span style={{ fontSize: 11, color: '#4a90c4', fontFamily: 'JetBrains Mono, monospace' }}>{miCodigo}</span>
                    </div>
                  )}

                  {/* ── Layout: productos + acciones ── */}
                  <div className="pedido-card-body">
                    {/* Lista de productos */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {misItems(p).map((item, i) => (
                        <div key={i} style={{
                          display: 'flex', gap: 12, padding: '14px 16px',
                          borderBottom: i < misItems(p).length - 1 ? `1px solid var(--tw-border)` : 'none',
                          alignItems: 'flex-start',
                        }}>
                          <div style={{
                            width: 80, height: 80, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                            background: '#111', border: `1px solid var(--tw-border)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {(item as any).fotoUrl
                              ? <img src={(item as any).fotoUrl} alt={item.productoNombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <span style={{ fontSize: 32 }}>☕</span>
                            }
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--tw-text)', lineHeight: 1.3 }}>{item.productoNombre}</p>
                            <p style={{ margin: '0 0 2px', fontSize: 12, color: 'var(--tw-text-muted)' }}>{item.presentacion}</p>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--tw-text-muted)' }}>Cantidad: <strong style={{ color: 'var(--tw-text)' }}>{item.qty}</strong></p>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <p style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 700, color: 'var(--tw-terra)' }}>{formatCents(item.subtotalCents)}</p>
                            {item.qty > 1 && <p style={{ margin: 0, fontSize: 11, color: 'var(--tw-text-muted)' }}>{formatCents(item.unitCents)} c/u</p>}
                          </div>
                        </div>
                      ))}
                      {/* Total */}
                      <div style={{ padding: '10px 16px', borderTop: `1px solid var(--tw-border)`, display: 'flex', justifyContent: 'flex-end', gap: 16, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'var(--tw-text-muted)' }}>{misItems(p).reduce((s, i) => s + i.qty, 0)} unidades</span>
                        <span style={{ fontSize: 14, color: 'var(--tw-text-muted)' }}>Total:</span>
                        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--tw-terra)' }}>{formatCents(total)}</span>
                      </div>
                    </div>

                    {/* ── Columna acciones ── */}
                    <div className="pedido-acciones">
                      {/* G-03: Voucher subido — el caficultor puede ver el estado y confirmar */}
                      {isPend && p.pagoStatus === 'voucher_subido' && (
                        <div style={{ marginBottom: 6 }}>
                          <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(243,156,18,0.12)', border: '1px solid rgba(243,156,18,0.3)', fontSize: 11, color: '#f39c12', marginBottom: 6, textAlign: 'center' }}>
                            📎 Comprobante enviado por el comprador
                          </div>
                          <button
                            onClick={async () => {
                              if (isDemo) { toast('Voucher marcado como revisado (demo)', 'ok'); return }
                              try {
                                await updateDoc(doc(db, 'one_pedidos', p.id), {
                                  pagoStatus: 'voucher_revisado_caficultor',
                                  voucherRevisadoAt: serverTimestamp(),
                                })
                                setPedidos(prev => prev.map(x => x.id === p.id ? { ...x, pagoStatus: 'voucher_revisado_caficultor' as any } : x))
                                toast('Comprobante marcado como revisado', 'ok')
                              } catch { toast('Error al marcar el comprobante', 'error') }
                            }}
                            style={{ padding: '8px 0', borderRadius: 8, border: '1px solid rgba(243,156,18,0.5)', background: 'rgba(243,156,18,0.1)', color: '#f39c12', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', width: '100%' }}
                          >
                            ✓ Revisé el comprobante
                          </button>
                        </div>
                      )}
                      {/* G-03: Voucher ya revisado por caficultor */}
                      {isPend && (p.pagoStatus as string) === 'voucher_revisado_caficultor' && (
                        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(143,175,138,0.1)', border: '1px solid rgba(143,175,138,0.3)', fontSize: 11, color: 'var(--tw-sage)', marginBottom: 6, textAlign: 'center' }}>
                          ✓ Comprobante revisado — esperando verificación admin
                        </div>
                      )}
                      {isPend && pagoOk && (
                        <button
                          onClick={() => abrirDespacho(p)}
                          style={{ padding: '10px 0', borderRadius: 8, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', width: '100%' }}
                        >
                          🚚 Despachar →
                        </button>
                      )}
                      {isPend && !pagoOk && (
                        <div style={{ padding: '10px 0', borderRadius: 8, background: '#f39c12' + '15', border: `1px solid ${'#f39c12'}30`, fontSize: 11, color: '#f39c12', textAlign: 'center' }}>
                          ⏳ Esperando pago
                        </div>
                      )}
                      {isAgencia && (
                        <div style={{ padding: '10px 0', borderRadius: 8, background: statusColor + '15', border: `1px solid ${statusColor}30`, fontSize: 11, color: statusColor, textAlign: 'center' }}>
                          {miStatus === 'en_disputa' ? '⚠ En disputa' : 'En tránsito'}
                        </div>
                      )}
                      <button
                        onClick={() => setPedidoDetalle(p)}
                        style={{ padding: '9px 0', borderRadius: 8, border: `1px solid var(--tw-border)`, background: 'none', color: 'var(--tw-text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', width: '100%' }}
                      >
                        Ver detalle
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    )
  }

  function renderProductos() {
    const procesosUsados = Array.from(new Set(productos.map(p => p.proceso)))
    const filtrados = productos.filter(p => {
      if (filtroProceso !== 'todos' && p.proceso !== filtroProceso) return false
      if (filtroStock === 'bajo' && p.kgDisponibles > 10) return false
      if (filtroStock === 'ok' && p.kgDisponibles <= 10) return false
      if (busquedaProducto && !p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase()) && !p.variedad.toLowerCase().includes(busquedaProducto.toLowerCase())) return false
      return true
    })
    const activos = filtrados.filter(p => p.status !== 'pausado')
    const pausados = filtrados.filter(p => p.status === 'pausado')
    const ordenados = [...activos, ...pausados]

    return (
      <div>
        {/* Header con contador y botón */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--tw-text-muted)' }}>
            <span style={{ color: 'var(--tw-text)', fontWeight: 700 }}>{productos.length}</span> productos
            {filtrados.length < productos.length && <span> · <span style={{ color: 'var(--tw-terra)' }}>{filtrados.length} mostrados</span></span>}
          </p>
          <button onClick={() => setModalProducto({ abierto: true })} style={{ fontSize: 13, color: '#fff', background: 'var(--tw-sage)', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontFamily: 'Montserrat, sans-serif' }}>+ Agregar café</button>
        </div>

        {/* Filtros */}
        <FilterBar>
          <SearchInput value={busquedaProducto} onChange={setBusquedaProducto} placeholder="Buscar por nombre o variedad..." />
          <FilterChip label="Todos" active={filtroProceso === 'todos'} onClick={() => setFiltroProceso('todos')} />
          {procesosUsados.map(pr => (
            <FilterChip key={pr} label={PROCESO_LABELS[pr] ?? pr} color={PROCESO_COLORS[pr]} active={filtroProceso === pr} onClick={() => setFiltroProceso(pr)} />
          ))}
          <span style={{ width: 1, height: 20, background: 'var(--tw-border)', flexShrink: 0 }} />
          <FilterChip label="Stock bajo" color={'#e74c3c'} active={filtroStock === 'bajo'} onClick={() => setFiltroStock(filtroStock === 'bajo' ? 'todos' : 'bajo')} />
          <FilterChip label="Stock ok" color={'var(--tw-sage)'} active={filtroStock === 'ok'} onClick={() => setFiltroStock(filtroStock === 'ok' ? 'todos' : 'ok')} />
        </FilterBar>

        {/* Empty state */}
        {productos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: 48, marginBottom: 12 }}>🌱</p>
            <p style={{ fontSize: 18, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, marginBottom: 8 }}>Aún no tienes productos</p>
            <p style={{ fontSize: 13, color: 'var(--tw-text-muted)', marginBottom: 20 }}>Agrega tu primer café para que las cafeterías puedan comprarlo</p>
            <button onClick={() => setModalProducto({ abierto: true })} style={{ padding: '12px 28px', borderRadius: 10, border: 'none', background: 'var(--tw-sage)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Agregar primer café
            </button>
          </div>
        ) : ordenados.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--tw-text-muted)', fontSize: 13, padding: '30px 0' }}>Sin resultados para estos filtros</p>
        ) : (
          /* Netflix grid */
          <div className="grid-productos">
            {ordenados.map(p => {
              const editando = stockEditando === p.id
              const stockColor = colorStock(p.kgDisponibles)
              const pct = Math.min(100, (p.kgDisponibles / Math.max(p.kgDisponibles + p.kgReservados, 1)) * 100)
              const isPaused = p.status === 'pausado'
              const procesoColor = PROCESO_COLORS[p.proceso] ?? 'var(--tw-terra)'

              return (
                <div key={p.id} style={{
                  background: 'var(--tw-card)', borderRadius: 14, overflow: 'hidden',
                  border: `1px solid ${isPaused ? 'var(--tw-text-muted)' + '44' : 'var(--tw-border)'}`,
                  opacity: isPaused ? 0.65 : 1,
                  display: 'flex', flexDirection: 'column',
                }}>
                  {/* Thumbnail */}
                  <div style={{ position: 'relative', height: 130, background: '#0a0a0a', overflow: 'hidden' }}>
                    {p.foto ? (
                      <img src={p.foto} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isPaused ? 0.4 : 0.8 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, opacity: isPaused ? 0.25 : 0.4 }}>☕</div>
                    )}
                    {/* Proceso badge (top-left) */}
                    <span style={{ position: 'absolute', top: 8, left: 8, padding: '3px 8px', borderRadius: 5, background: procesoColor + 'dd', color: '#fff', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {PROCESO_LABELS[p.proceso] ?? p.proceso}
                    </span>
                    {/* Status badge (top-right): Activo / Agotado / Pausado */}
                    {isPaused ? (
                      <span style={{ position: 'absolute', top: 8, right: 8, padding: '2px 8px', borderRadius: 4, background: '#f39c12', color: '#000', fontSize: 8, fontWeight: 700 }}>Agotado</span>
                    ) : p.kgDisponibles <= 10 ? (
                      <span style={{ position: 'absolute', top: 8, right: 8, padding: '2px 8px', borderRadius: 4, background: '#e74c3cdd', color: '#fff', fontSize: 8, fontWeight: 700 }}>Stock bajo</span>
                    ) : (
                      <span style={{ position: 'absolute', top: 8, right: 8, padding: '2px 8px', borderRadius: 4, background: 'var(--tw-sage)', color: '#fff', fontSize: 8, fontWeight: 700 }}>Activo</span>
                    )}
                  </div>

                  {/* Contenido */}
                  <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div>
                      <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif', lineHeight: 1.2 }}>{p.nombre}</p>
                      <p style={{ margin: '0 0 3px', fontSize: 11, color: 'var(--tw-text-muted)' }}>
                        {p.variedad}{p.puntajeReferencial ? ` · ~${p.puntajeReferencial} pts` : ''}
                      </p>
                      {p.notasSabor && p.notasSabor.length > 0 && (
                        <p style={{ margin: 0, fontSize: 10, color: 'var(--tw-text-faint)', fontStyle: 'italic' }}>
                          {p.notasSabor.slice(0, 3).join(', ')}
                        </p>
                      )}
                    </div>

                    {/* Precios 4 formatos */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4 }}>
                      {(['1kg', '5kg', '10kg', '20kg'] as const).map(fmt => (
                        <div key={fmt} style={{ background: 'var(--tw-bg)', borderRadius: 6, padding: '4px', textAlign: 'center' }}>
                          <p style={{ margin: 0, fontSize: 9, color: 'var(--tw-text-muted)' }}>{fmt}</p>
                          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--tw-terra)' }}>{formatCents(calcularPrecioFinal(p.precioBaseKgCents, fmt))}</p>
                        </div>
                      ))}
                    </div>

                    {/* Stock bar */}
                    {editando ? (
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <input type="number" value={stockValor[p.id] ?? String(p.kgDisponibles)}
                          onChange={e => setStockValor(prev => ({ ...prev, [p.id]: e.target.value }))}
                          style={{ width: 56, padding: '4px 8px', borderRadius: 6, border: `1px solid var(--tw-border)`, background: 'var(--tw-card)', color: 'var(--tw-text)', fontSize: 12, textAlign: 'right' }}
                        />
                        <span style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>kg</span>
                        <button onClick={() => guardarStock(p.id)} disabled={accionando === p.id} style={{ padding: '4px 8px', borderRadius: 5, border: 'none', background: 'var(--tw-sage)', color: '#000', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                          {accionando === p.id ? '...' : '✓'}
                        </button>
                        <button onClick={() => setStockEditando(null)} style={{ padding: '4px 6px', borderRadius: 5, border: 'none', background: 'var(--tw-border)', color: 'var(--tw-text-muted)', fontSize: 10, cursor: 'pointer' }}>✕</button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--tw-border)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: stockColor, borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 10, color: stockColor, fontWeight: 700, flexShrink: 0 }}>{p.kgDisponibles} kg</span>
                        </div>
                      </div>
                    )}

                    {/* Acciones */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 'auto', flexWrap: 'wrap' }}>
                      <button onClick={() => setModalProducto({ abierto: true, editar: p })} style={{ flex: 1, minWidth: 48, padding: '6px', borderRadius: 6, border: `1px solid var(--tw-border)`, background: 'none', color: 'var(--tw-text-muted)', fontSize: 11, cursor: 'pointer' }}>Editar</button>
                      <button onClick={() => { setStockEditando(p.id); setStockValor(prev => ({ ...prev, [p.id]: String(p.kgDisponibles) })) }}
                        style={{ flex: 1, minWidth: 48, padding: '6px', borderRadius: 6, border: `1px solid var(--tw-border)`, background: 'none', color: 'var(--tw-text-muted)', fontSize: 11, cursor: 'pointer' }}>
                        Stock
                      </button>
                      <button onClick={() => toggleStatus(p)} disabled={accionando === p.id} style={{ flex: 1, minWidth: 48, padding: '6px', borderRadius: 6, border: `1px solid ${isPaused ? 'var(--tw-sage)' + '44' : 'var(--tw-text-muted)' + '44'}`, background: 'none', color: isPaused ? 'var(--tw-sage)' : 'var(--tw-text-muted)', fontSize: 11, cursor: 'pointer' }}>
                        {isPaused ? 'Activar' : 'Pausar'}
                      </button>
                      <button onClick={() => setFichaLoteId(p.id)} style={{ flex: 1, minWidth: 48, padding: '6px', borderRadius: 6, border: `1px solid var(--tw-terra)44`, background: 'none', color: 'var(--tw-terra)', fontSize: 11, cursor: 'pointer' }}>
                        Evidencias
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  function renderCalificaciones() {
    const calsFiltradas = filtroEstrellas
      ? calificaciones.filter(c => c.estrellas === filtroEstrellas)
      : calificaciones

    const distrib = [5, 4, 3, 2, 1].map(n => ({
      n, count: calificaciones.filter(c => c.estrellas === n).length,
      pct: calificaciones.length > 0 ? (calificaciones.filter(c => c.estrellas === n).length / calificaciones.length) * 100 : 0,
    }))

    return (
      <div>
        {calificaciones.length === 0 && !caficultor?.scoreConfianza ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: 48, marginBottom: 12 }}>★</p>
            <p style={{ fontSize: 18, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, marginBottom: 8 }}>Sin calificaciones aún</p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--tw-text-muted)' }}>Se generan cuando un negocio califica tu café después de recibirlo</p>
          </div>
        ) : (
          <div>
            {/* Resumen + distribución */}
            <div className="grid-score" style={{ marginBottom: 20, padding: '20px', background: 'var(--tw-card)', borderRadius: 14, border: `1px solid var(--tw-border)` }}>
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <p style={{ margin: '0 0 4px', fontSize: 52, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif', lineHeight: 1 }}>
                  {scorePromedio > 0 ? scorePromedio.toFixed(1) : '—'}
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginBottom: 6 }}>
                  {[1,2,3,4,5].map(n => (
                    <span key={n} style={{ fontSize: 16, color: n <= Math.round(scorePromedio) ? '#f39c12' : 'var(--tw-border)' }}>★</span>
                  ))}
                </div>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--tw-text-muted)' }}>
                  {calificaciones.length || caficultor?.totalCalificaciones || 0} reseñas
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, justifyContent: 'center' }}>
                {distrib.map(({ n, count, pct }) => (
                  <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--tw-text-muted)', width: 16, textAlign: 'right' }}>{n}</span>
                    <span style={{ fontSize: 12, color: '#f39c12' }}>★</span>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--tw-border)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: '#f39c12', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--tw-text-muted)', width: 20, textAlign: 'right' }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Filtro por estrellas */}
            <FilterBar>
              <FilterChip label="Todas" active={filtroEstrellas === null} onClick={() => setFiltroEstrellas(null)} />
              {[5, 4, 3, 2, 1].map(n => (
                <FilterChip key={n} label={`${'★'.repeat(n)} (${calificaciones.filter(c => c.estrellas === n).length})`} color={'#f39c12'} active={filtroEstrellas === n} onClick={() => setFiltroEstrellas(filtroEstrellas === n ? null : n)} />
              ))}
            </FilterBar>

            {/* Lista completa */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {calsFiltradas.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--tw-text-muted)', fontSize: 13, padding: '20px 0' }}>Sin calificaciones con este filtro</p>
              ) : calsFiltradas.map(c => (
                <div key={c.id} style={{ background: 'var(--tw-card)', borderRadius: 10, padding: '14px 16px', border: `1px solid var(--tw-border)` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: c.comentario ? 6 : 0, alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: 'var(--tw-text)' }}>{c.nombreLocal}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--tw-text-muted)' }}>{formatFecha(c.createdAt)}</p>
                    </div>
                    <span style={{ fontSize: 15, color: '#f39c12', letterSpacing: 1 }}>{'★'.repeat(c.estrellas)}{'☆'.repeat(5 - c.estrellas)}</span>
                  </div>
                  {c.comentario && <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--tw-text-muted)', fontStyle: 'italic', lineHeight: 1.5 }}>"{c.comentario}"</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  function renderPagos() {
    const estadoColor: Record<string, string> = {
      LIBERADO: 'var(--tw-sage)',
      PENDIENTE: 'var(--tw-amber, #e8b84b)',
      RETENIDO: 'var(--tw-terra)',
    }
    const estadoLabel: Record<string, string> = {
      LIBERADO: '✓ Liberado',
      PENDIENTE: '⏳ Pendiente',
      RETENIDO: '⚠ Retenido',
    }
    const totalLiberadoCents = pagos.filter(p => p.estado === 'LIBERADO').reduce((s, p) => s + p.montoNetoCents, 0)
    const totalPendienteCents = pagos.filter(p => p.estado === 'PENDIENTE').reduce((s, p) => s + p.montoNetoCents, 0)

    if (pagosLoading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div style={{ width: 28, height: 28, border: `2px solid var(--tw-terra)`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )
    }

    return (
      <div>
        {/* KPI tiles */}
        <div className="grid-kpis" style={{ marginBottom: 20 }}>
          {[
            { label: 'Recibidos', value: `S/ ${(totalLiberadoCents / 100).toFixed(0)}`, color: 'var(--tw-sage)' },
            { label: 'Por recibir', value: `S/ ${(totalPendienteCents / 100).toFixed(0)}`, color: 'var(--tw-amber, #e8b84b)' },
            { label: 'Pagos', value: String(pagos.length), color: 'var(--tw-text)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'var(--tw-card)', borderRadius: 12, padding: '12px 14px', border: `1px solid var(--tw-border)` }}>
              <p style={{ margin: '0 0 3px', fontSize: 24, fontWeight: 700, color, fontFamily: 'Cormorant Garamond, serif', lineHeight: 1 }}>{value}</p>
              <p style={{ margin: 0, fontSize: 9, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
            </div>
          ))}
        </div>

        {pagos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>💰</div>
            <p style={{ fontSize: 14, fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, color: 'var(--tw-text)', marginBottom: 6 }}>Sin pagos registrados</p>
            <p style={{ fontSize: 12, color: 'var(--tw-text-muted)' }}>Tus pagos liberados aparecerán aquí</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pagos.map(pago => (
              <div key={pago.id} style={{ background: 'var(--tw-card)', borderRadius: 12, padding: '12px 16px', border: `1px solid var(--tw-border)` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 2 }}>{pago.negocioNombre}</div>
                    <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--tw-text-muted)' }}>#{pago.pedidoRef}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: estadoColor[pago.estado] ?? 'var(--tw-text-muted)', padding: '2px 8px', borderRadius: 20, background: `${estadoColor[pago.estado] ?? '#fff'}18`, border: `1px solid ${estadoColor[pago.estado] ?? 'var(--tw-border)'}40` }}>
                    {estadoLabel[pago.estado] ?? pago.estado}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif' }}>
                      S/ {(pago.montoNetoCents / 100).toFixed(0)}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--tw-text-muted)', marginLeft: 8 }}>
                      {pago.metodoPago ? `via ${pago.metodoPago.replace('_', ' ')}` : ''}
                    </span>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>
                    {pago.liberadoAt ? new Date(pago.liberadoAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date(pago.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                {pago.motivo && (
                  <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(201,110,75,.06)', borderRadius: 7, border: '1px solid rgba(201,110,75,.15)', fontSize: 10, color: 'var(--tw-terra)' }}>
                    ⚠ {pago.motivo}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  function renderHistorial() {
    let histFiltrado = [...entregados]
    if (busquedaHistorial) {
      histFiltrado = histFiltrado.filter(p =>
        p.nombreLocal.toLowerCase().includes(busquedaHistorial.toLowerCase()) ||
        p.id.includes(busquedaHistorial)
      )
    }
    if (historialDesde) {
      const desde = new Date(historialDesde).getTime()
      histFiltrado = histFiltrado.filter(p => new Date(p.updatedAt).getTime() >= desde)
    }
    histFiltrado.sort((a, b) => {
      const diff = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      return historialOrden === 'desc' ? -diff : diff
    })

    const totalHistorial = histFiltrado.reduce((acc, p) => acc + misItems(p).reduce((s, i) => s + i.subtotalCents, 0), 0)

    return (
      <div>
        {/* Resumen */}
        {entregados.length > 0 && (
          <div className="grid-historial-kpis" style={{ marginBottom: 16 }}>
            <div style={{ background: 'var(--tw-card)', borderRadius: 12, padding: '14px 16px', border: `1px solid var(--tw-border)` }}>
              <p style={{ margin: '0 0 4px', fontSize: 9, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Entregas completadas</p>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--tw-sage)', fontFamily: 'Cormorant Garamond, serif' }}>{entregados.length}</p>
            </div>
            <div style={{ background: 'var(--tw-card)', borderRadius: 12, padding: '14px 16px', border: `1px solid var(--tw-border)` }}>
              <p style={{ margin: '0 0 4px', fontSize: 9, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total {histFiltrado.length < entregados.length ? 'filtrado' : 'cobrado'}</p>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--tw-terra)', fontFamily: 'Cormorant Garamond, serif' }}>{formatCents(totalHistorial)}</p>
            </div>
          </div>
        )}

        {/* Filtros */}
        <FilterBar>
          <SearchInput value={busquedaHistorial} onChange={setBusquedaHistorial} placeholder="Buscar cafetería o ID..." />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 11, color: 'var(--tw-text-muted)' }}>Desde:</label>
            <input type="date" value={historialDesde} onChange={e => setHistorialDesde(e.target.value)}
              style={{ padding: '5px 8px', borderRadius: 6, border: `1px solid var(--tw-border)`, background: '#141414', color: 'var(--tw-text)', fontSize: 12, fontFamily: 'Montserrat, sans-serif', outline: 'none' }}
            />
          </div>
          {historialDesde && (
            <button onClick={() => setHistorialDesde('')} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid var(--tw-border)`, background: 'none', color: 'var(--tw-text-muted)', fontSize: 11, cursor: 'pointer' }}>✕ Quitar fecha</button>
          )}
          <button onClick={() => setHistorialOrden(o => o === 'desc' ? 'asc' : 'desc')}
            style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 6, border: `1px solid var(--tw-border)`, background: 'none', color: 'var(--tw-text-muted)', fontSize: 11, cursor: 'pointer' }}>
            {historialOrden === 'desc' ? '↓ Recientes' : '↑ Antiguos'}
          </button>
        </FilterBar>

        {entregados.length === 0 ? (
          <p style={{ color: 'var(--tw-text-muted)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>Sin entregas completadas aún</p>
        ) : histFiltrado.length === 0 ? (
          <p style={{ color: 'var(--tw-text-muted)', fontSize: 13, textAlign: 'center', padding: '30px 0' }}>Sin resultados para estos filtros</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {histFiltrado.map((p) => {
              const subtotal = misItems(p).reduce((s, i) => s + i.subtotalCents, 0)
              const fechaEntrega = new Date(p.updatedAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
              return (
                <div key={p.id} style={{ background: 'var(--tw-card)', borderRadius: 12, overflow: 'hidden', border: `1px solid var(--tw-border)` }}>
                  {/* Header */}
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid var(--tw-border)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-sage)', padding: '3px 10px', borderRadius: 20, background: 'var(--tw-sage)' + '20', border: `1px solid var(--tw-sage)40`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        ✓ Entregado
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tw-text)' }}>{p.nombreLocal}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--tw-text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{p.id.slice(-10).toUpperCase()}</span>
                      <span style={{ fontSize: 11, color: 'var(--tw-text-muted)' }}>{fechaEntrega}</span>
                    </div>
                  </div>
                  {/* Productos */}
                  {misItems(p).map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, padding: '14px 16px', borderBottom: i < misItems(p).length - 1 ? `1px solid var(--tw-border)` : 'none', alignItems: 'flex-start' }}>
                      <div style={{ width: 72, height: 72, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#111', border: `1px solid var(--tw-border)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {(item as any).fotoUrl
                          ? <img src={(item as any).fotoUrl} alt={item.productoNombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontSize: 28 }}>☕</span>
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--tw-text)', lineHeight: 1.3 }}>{item.productoNombre}</p>
                        <p style={{ margin: '0 0 2px', fontSize: 12, color: 'var(--tw-text-muted)' }}>{item.presentacion}</p>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--tw-text-muted)' }}>Cantidad: <strong style={{ color: 'var(--tw-text)' }}>{item.qty}</strong></p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 700, color: 'var(--tw-terra)' }}>{formatCents(item.subtotalCents)}</p>
                        {item.qty > 1 && <p style={{ margin: 0, fontSize: 11, color: 'var(--tw-text-muted)' }}>{formatCents(item.unitCents)} c/u</p>}
                      </div>
                    </div>
                  ))}
                  {/* Total */}
                  <div style={{ padding: '10px 16px', borderTop: `1px solid var(--tw-border)`, display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--tw-text-muted)' }}>{misItems(p).reduce((s, i) => s + i.qty, 0)} unidades</span>
                      <span style={{ fontSize: 14, color: 'var(--tw-text-muted)' }}>Total cobrado:</span>
                      <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--tw-terra)' }}>{formatCents(subtotal)}</span>
                    </div>
                    <button
                      onClick={() => setPedidoDetalle(p)}
                      style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid var(--tw-border)`, background: 'none', color: 'var(--tw-text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', whiteSpace: 'nowrap' }}
                    >
                      Ver detalle →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ─── Logística caficultor ─────────────────────────────────────────────────────

  function renderLogistica() {
    const departamentos = Array.from(new Set(ubigeos.map(u => u.departamento))).sort()
    const provincias = Array.from(new Set(ubigeos.filter(u => u.departamento === logDepSel).map(u => u.provincia))).sort()
    const ubigeoSelObj = ubigeos.find(u => u.id === logUbigeoSel)

    async function guardarLogistica() {
      if (!logUbigeoSel) { toast('Selecciona tu distrito de despacho', 'error'); return }
      const agenciasActivas = Object.entries(logAgenciasActivas).filter(([, v]) => v).map(([k]) => k)
      if (agenciasActivas.length === 0) { toast('Activa al menos una agencia de envío', 'error'); return }
      setLogisticaGuardando(true)
      try {
        const ubObj = ubigeos.find(u => u.id === logUbigeoSel)!
        const agenciasMap: Record<string, string> = {}
        const agenciasDetalle: Record<string, AgenciaLogisticaONE> = {}
        for (const ag of ubObj.agencias) {
          agenciasMap[ag.id] = ag.nombre
          if (logAgenciasActivas[ag.id]) {
            const dias = logAgenciasDias[ag.id]
            agenciasDetalle[ag.id] = {
              ...ag,
              permiteDomicilio: logAgenciasDomicilio[ag.id] ?? false,
              diasMin: parseInt(dias?.min ?? '2') || 2,
              diasMax: parseInt(dias?.max ?? '4') || 4,
            }
          }
        }
        for (const ag of logAgenciasExtra) {
          agenciasMap[ag.id] = ag.nombre
          if (logAgenciasActivas[ag.id]) {
            const dias = logAgenciasDias[ag.id]
            agenciasDetalle[ag.id] = {
              id: ag.id,
              nombre: ag.nombre,
              permiteDomicilio: logAgenciasDomicilio[ag.id] ?? false,
              diasMin: parseInt(dias?.min ?? '2') || 2,
              diasMax: parseInt(dias?.max ?? '4') || 4,
            }
          }
        }
        const input = {
          caficultorId,
          ubigeo: logUbigeoSel,
          departamento: ubObj.departamento,
          provincia: ubObj.provincia,
          distrito: ubObj.distrito,
          agencias: agenciasActivas,
          agenciasMap,
          agenciasActivas: logAgenciasActivas,
          agenciasPermiteDomicilio: logAgenciasDomicilio,
          agenciasDetalle,
          gratisAgenciaActivo: logGratisAgencia,
          gratisAgenciaKg: parseFloat(logGratisAgenciaKg) || 5,
          gratisDomicilioActivo: logGratisDomicilio,
          gratisDomicilioKg: parseFloat(logGratisDomicilioKg) || 15,
          tarifaFijaAgenciaSoles: parseFloat(logTarifaAgencia) || 15,
          tarifaFijaDomicilioSoles: parseFloat(logTarifaDomicilio) || 25,
        }
        if (isDemo) await demoSaveLogisticaCaficultor(input)
        else await saveLogisticaCaficultor(input)
        setLogistica({
          ubigeo: input.ubigeo,
          departamento: input.departamento,
          provincia: input.provincia,
          distrito: input.distrito,
          origenTexto: `${input.distrito}, ${input.provincia}, ${input.departamento}`,
          agencias: agenciasActivas,
          agenciasMap,
          agenciasActivas: logAgenciasActivas,
          agenciasPermiteDomicilio: logAgenciasDomicilio,
          agenciasDetalle,
          gratisAgenciaActivo: input.gratisAgenciaActivo,
          gratisAgenciaKg: input.gratisAgenciaKg,
          gratisDomicilioActivo: input.gratisDomicilioActivo,
          gratisDomicilioKg: input.gratisDomicilioKg,
          tarifaFijaAgenciaSoles: input.tarifaFijaAgenciaSoles,
          tarifaFijaDomicilioSoles: input.tarifaFijaDomicilioSoles,
        })
        toast('Configuración de logística guardada', 'ok')
      } catch {
        toast('Error al guardar logística', 'error')
      } finally {
        setLogisticaGuardando(false)
      }
    }

    const stepTabs: { id: 0 | 1; label: string }[] = [
      { id: 0, label: '0 · Origen y agencias' },
      { id: 1, label: '1 · Envío gratis' },
    ]

    return (
      <div style={{ maxWidth: 720 }}>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif' }}>
              Configuración de envío
            </h2>
          </div>
          {logistica && (
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-sage)', background: 'rgba(143,175,138,0.15)', padding: '3px 8px', borderRadius: 5 }}>🟢 Activo</span>
          )}
        </div>

        {/* Step tabs */}
        <div className="log-steps" style={{ marginBottom: 20 }}>
          {stepTabs.map(t => {
            const done = logistica && t.id === 0
            const active = logConfigStep === t.id
            const locked = t.id > 0 && !logistica
            return (
              <button key={t.id}
                onClick={() => !locked && setLogConfigStep(t.id)}
                style={{
                  flex: 1, padding: '7px 4px', border: 'none', borderRight: t.id < 1 ? '1px solid var(--tw-border)' : 'none',
                  background: active ? 'var(--tw-terra)' : done ? 'rgba(143,175,138,0.1)' : 'var(--tw-card)',
                  color: active ? '#fff' : done ? 'var(--tw-sage)' : locked ? 'var(--tw-border)' : 'var(--tw-text-muted)',
                  fontSize: 10, fontWeight: 700, cursor: locked ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat, sans-serif',
                  textAlign: 'center', whiteSpace: 'nowrap',
                }}>
                {done ? `0 ✓ Origen` : t.label}
              </button>
            )
          })}
        </div>

        {logisticaCargando ? (
          <p style={{ color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif', fontSize: 13 }}>Cargando...</p>
        ) : (
          <>
            {/* ── PASO 0: Origen y agencias ── */}
            {logConfigStep === 0 && (
            <div className="grid-log-paso">

              {/* ── Columna izquierda: geo + agencias ── */}
              <div style={{ minWidth: 0 }}>

                {/* Card 0a: Distrito de origen */}
                <div style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid var(--tw-border)', background: 'var(--tw-card)', marginBottom: 12 }}>
                  <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--tw-terra)', color: '#fff', fontSize: 9, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>0a</span>
                    Distrito de origen
                  </p>

                  {/* Cascada 3 columnas */}
                  <div className="grid-geo-3" style={{ marginBottom: 10 }}>
                    {/* Departamento */}
                    <div>
                      <p style={{ margin: '0 0 6px', fontSize: 9, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'Montserrat, sans-serif' }}>Departamento</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 160, overflowY: 'auto' }}>
                        {departamentos.map(dep => (
                          <div key={dep} onClick={() => { setLogDepSel(dep); setLogProvSel(''); setLogUbigeoSel(''); setLogAgenciasActivas({}); setLogAgenciasDomicilio({}) }}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', borderRadius: 6, cursor: 'pointer', background: logDepSel === dep ? 'rgba(201,110,75,0.1)' : 'transparent' }}>
                            <span style={{ fontSize: 11, color: logDepSel === dep ? 'var(--tw-terra)' : 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif', fontWeight: logDepSel === dep ? 700 : 400 }}>{dep}</span>
                            {logDepSel === dep && <span style={{ fontSize: 10, color: 'var(--tw-terra)' }}>✓</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Provincia */}
                    <div>
                      <p style={{ margin: '0 0 6px', fontSize: 9, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'Montserrat, sans-serif' }}>Provincia</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 160, overflowY: 'auto' }}>
                        {provincias.map(prov => (
                          <div key={prov} onClick={() => { setLogProvSel(prov); setLogUbigeoSel(''); setLogAgenciasActivas({}); setLogAgenciasDomicilio({}) }}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', borderRadius: 6, cursor: 'pointer', background: logProvSel === prov ? 'rgba(201,110,75,0.1)' : 'transparent' }}>
                            <span style={{ fontSize: 11, color: logProvSel === prov ? 'var(--tw-terra)' : 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif', fontWeight: logProvSel === prov ? 700 : 400 }}>{prov}</span>
                            {logProvSel === prov && <span style={{ fontSize: 10, color: 'var(--tw-terra)' }}>✓</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Distrito */}
                    <div>
                      <p style={{ margin: '0 0 6px', fontSize: 9, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'Montserrat, sans-serif' }}>Distrito</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 160, overflowY: 'auto' }}>
                        {ubigeos.filter(u => u.departamento === logDepSel && u.provincia === logProvSel).map(u => (
                          <div key={u.id} onClick={() => {
                            setLogUbigeoSel(u.id)
                            const activas: Record<string, boolean> = {}
                            const domicilio: Record<string, boolean> = {}
                            u.agencias.forEach(ag => { activas[ag.id] = true; domicilio[ag.id] = false })
                            setLogAgenciasActivas(activas)
                            setLogAgenciasDomicilio(domicilio)
                          }}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', borderRadius: 6, cursor: 'pointer', background: logUbigeoSel === u.id ? 'rgba(201,110,75,0.1)' : 'transparent' }}>
                            <span style={{ fontSize: 11, color: logUbigeoSel === u.id ? 'var(--tw-terra)' : 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif', fontWeight: logUbigeoSel === u.id ? 700 : 400 }}>{u.distrito}</span>
                            {logUbigeoSel === u.id && <span style={{ fontSize: 10, color: 'var(--tw-terra)' }}>✓</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Badge origen seleccionado */}
                  {ubigeoSelObj && (
                    <div style={{ padding: '7px 10px', background: 'rgba(143,175,138,0.06)', border: '1px solid rgba(143,175,138,0.15)', borderRadius: 7 }}>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--tw-sage)', fontFamily: 'Montserrat, sans-serif' }}>
                        📍 Origen: <strong>{ubigeoSelObj.distrito}, {ubigeoSelObj.provincia}, {ubigeoSelObj.departamento}</strong>
                      </p>
                    </div>
                  )}
                </div>

                {/* Card 0b: Agencias */}
                {logUbigeoSel && ubigeoSelObj && (
                  <div style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid var(--tw-border)', background: 'var(--tw-card)', marginBottom: 12 }}>
                    <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--tw-terra)', color: '#fff', fontSize: 9, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>0b</span>
                      Agencias disponibles en {ubigeoSelObj.distrito}
                    </p>
                    <p style={{ margin: '0 0 10px', fontSize: 10, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>
                      Activa las que usas · elige si también llevas a domicilio
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {/* Agencias del ubigeo */}
                      {ubigeoSelObj.agencias.map(ag => (
                        <div key={ag.id} style={{ borderRadius: 8, border: `1px solid ${logAgenciasActivas[ag.id] ? 'var(--tw-sage)44' : 'var(--tw-border)'}`, overflow: 'hidden', opacity: logAgenciasActivas[ag.id] ? 1 : 0.55 }}>
                          {/* Header agencia */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer' }} onClick={() => setLogAgenciasActivas(prev => ({ ...prev, [ag.id]: !prev[ag.id] }))}>
                            <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${logAgenciasActivas[ag.id] ? 'var(--tw-sage)' : 'var(--tw-border)'}`, background: logAgenciasActivas[ag.id] ? 'var(--tw-sage)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', flexShrink: 0, transition: 'all 0.15s' }}>
                              {logAgenciasActivas[ag.id] ? '✓' : ''}
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: '0 0 1px', fontSize: 12, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif' }}>{ag.nombre}</p>
                              {ag.direccion && <p style={{ margin: 0, fontSize: 10, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>{ag.direccion}{ag.horario ? ` · ${ag.horario}` : ''}</p>}
                            </div>
                          </div>
                          {/* Opciones (solo si activa) */}
                          {logAgenciasActivas[ag.id] && (<>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px solid var(--tw-border)', background: 'rgba(143,175,138,0.04)' }}>
                              <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--tw-sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', flexShrink: 0 }}>✓</div>
                              <p style={{ margin: 0, fontSize: 11, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>El comprador recoge y paga el flete en agencia</p>
                            </div>
                            <div onClick={() => setLogAgenciasDomicilio(prev => ({ ...prev, [ag.id]: !prev[ag.id] }))}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px solid var(--tw-border)', background: logAgenciasDomicilio[ag.id] ? 'rgba(143,175,138,0.04)' : 'transparent', cursor: 'pointer' }}>
                              <div style={{ width: 16, height: 16, borderRadius: '50%', border: `1.5px solid ${logAgenciasDomicilio[ag.id] ? 'var(--tw-sage)' : 'var(--tw-border)'}`, background: logAgenciasDomicilio[ag.id] ? 'var(--tw-sage)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', flexShrink: 0, transition: 'all 0.15s' }}>
                                {logAgenciasDomicilio[ag.id] ? '✓' : ''}
                              </div>
                              <p style={{ margin: 0, fontSize: 11, color: logAgenciasDomicilio[ag.id] ? 'var(--tw-text)' : 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>También llevo a domicilio — el comprador paga al recibirlo</p>
                            </div>
                            {/* Tiempo estimado de tránsito — el caficultor lo sabe por experiencia */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px solid var(--tw-border)', background: 'rgba(0,0,0,0.02)' }}>
                              <p style={{ margin: 0, fontSize: 10, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif', flexShrink: 0 }}>Días hábiles estimados:</p>
                              <input type="number" min="1" max="30" value={logAgenciasDias[ag.id]?.min ?? '2'}
                                onChange={e => setLogAgenciasDias(prev => ({ ...prev, [ag.id]: { ...prev[ag.id], min: e.target.value } }))}
                                style={{ width: 44, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--tw-border)', background: 'var(--tw-bg)', color: 'var(--tw-text)', fontSize: 11, fontWeight: 700, textAlign: 'center', outline: 'none', fontFamily: 'Montserrat, sans-serif' }} />
                              <p style={{ margin: 0, fontSize: 10, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>–</p>
                              <input type="number" min="1" max="30" value={logAgenciasDias[ag.id]?.max ?? '4'}
                                onChange={e => setLogAgenciasDias(prev => ({ ...prev, [ag.id]: { ...prev[ag.id], max: e.target.value } }))}
                                style={{ width: 44, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--tw-border)', background: 'var(--tw-bg)', color: 'var(--tw-text)', fontSize: 11, fontWeight: 700, textAlign: 'center', outline: 'none', fontFamily: 'Montserrat, sans-serif' }} />
                              <p style={{ margin: 0, fontSize: 10, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>días</p>
                            </div>
                          </>)}
                        </div>
                      ))}

                      {/* Agencias extra locales */}
                      {logAgenciasExtra.map(ag => (
                        <div key={ag.id} style={{ borderRadius: 8, border: `1px solid ${logAgenciasActivas[ag.id] ? 'var(--tw-sage)44' : 'var(--tw-border)'}`, overflow: 'hidden', opacity: logAgenciasActivas[ag.id] ? 1 : 0.55 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer' }} onClick={() => setLogAgenciasActivas(prev => ({ ...prev, [ag.id]: !prev[ag.id] }))}>
                            <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${logAgenciasActivas[ag.id] ? 'var(--tw-sage)' : 'var(--tw-border)'}`, background: logAgenciasActivas[ag.id] ? 'var(--tw-sage)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', flexShrink: 0 }}>
                              {logAgenciasActivas[ag.id] ? '✓' : ''}
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: '0 0 1px', fontSize: 12, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif' }}>{ag.nombre}</p>
                              <p style={{ margin: 0, fontSize: 10, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>Agencia local</p>
                            </div>
                            <button onClick={e => { e.stopPropagation(); setLogAgenciasExtra(prev => prev.filter(a => a.id !== ag.id)); setLogAgenciasActivas(prev => { const n = { ...prev }; delete n[ag.id]; return n }) }}
                              style={{ background: 'none', border: 'none', color: 'var(--tw-text-muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>×</button>
                          </div>
                        </div>
                      ))}

                      {/* Input agregar agencia local */}
                      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                        <input
                          value={logAgenciaInputVal}
                          onChange={e => setLogAgenciaInputVal(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && logAgenciaInputVal.trim()) {
                              const id = `local_${Date.now()}`
                              setLogAgenciasExtra(prev => [...prev, { id, nombre: logAgenciaInputVal.trim() }])
                              setLogAgenciasActivas(prev => ({ ...prev, [id]: true }))
                              setLogAgenciasDomicilio(prev => ({ ...prev, [id]: false }))
                              setLogAgenciaInputVal('')
                            }
                          }}
                          placeholder="Nombre de agencia local..."
                          style={{ flex: 1, padding: '7px 10px', borderRadius: 7, border: '1px solid var(--tw-border)', background: 'var(--tw-bg)', color: 'var(--tw-text)', fontSize: 11, fontFamily: 'Montserrat, sans-serif', outline: 'none' }}
                        />
                        <button onClick={() => {
                          if (!logAgenciaInputVal.trim()) return
                          const id = `local_${Date.now()}`
                          setLogAgenciasExtra(prev => [...prev, { id, nombre: logAgenciaInputVal.trim() }])
                          setLogAgenciasActivas(prev => ({ ...prev, [id]: true }))
                          setLogAgenciasDomicilio(prev => ({ ...prev, [id]: false }))
                          setLogAgenciaInputVal('')
                        }}
                          style={{ padding: '7px 12px', borderRadius: 7, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', whiteSpace: 'nowrap' }}>
                          + Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botón guardar y continuar */}
                {logUbigeoSel && (
                  <button onClick={() => { void guardarLogistica(); setLogConfigStep(1) }} disabled={logisticaGuardando}
                    style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: logisticaGuardando ? 'var(--tw-text-muted)' : 'var(--tw-terra)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: logisticaGuardando ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                    {logisticaGuardando ? 'Guardando...' : 'Guardar y continuar → Reglas de envío gratis'}
                  </button>
                )}
              </div>

              {/* ── Columna derecha: Qué desbloquea ── */}
              {logUbigeoSel && (
                <div style={{ flex: '0 1 240px', minWidth: 200 }}>
                  <div style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid var(--tw-border)', background: 'var(--tw-bg)' }}>
                    <p style={{ margin: '0 0 12px', fontSize: 9, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'Montserrat, sans-serif' }}>Qué desbloquea este paso</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                      {[
                        { n: '✓', title: 'Tus lotes se publican en el catálogo', sub: 'Sin origen configurado los lotes no aparecen (SHP-01)' },
                        { n: '→', title: 'Paso 1 — Reglas de envío gratis', sub: 'Define umbrales para absorber el flete y mejorar conversión' },
                      ].map(item => (
                        <div key={item.n} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(201,110,75,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--tw-terra)', flexShrink: 0 }}>{item.n}</div>
                          <div>
                            <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif' }}>{item.title}</p>
                            <p style={{ margin: 0, fontSize: 9, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>{item.sub}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: '10px', background: 'rgba(201,110,75,0.06)', border: '1px solid rgba(201,110,75,0.15)', borderRadius: 8 }}>
                      <p style={{ margin: '0 0 4px', fontSize: 9, fontWeight: 700, color: 'var(--tw-terra)', fontFamily: 'Montserrat, sans-serif' }}>💡 Se configura una sola vez</p>
                      <p style={{ margin: 0, fontSize: 9, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif', lineHeight: 1.5 }}>Tu distrito y agencias no cambian con frecuencia. Si te mudas o cambias de transportista, vuelve aquí.</p>
                    </div>
                  </div>
                </div>
              )}

            </div>
            )} {/* fin paso 0 */}

            {/* ── PASO 1: Reglas de envío gratis ── */}
            {logConfigStep === 1 && (
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

                  <div style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid var(--tw-border)', background: 'var(--tw-card)' }}>
                    <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--tw-terra)', color: '#fff', fontSize: 9, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                      Reglas de envío gratis
                    </p>

                    {/* Envío gratis a agencia */}
                    {[
                      { key: 'agencia' as const, label: 'Envío gratis a agencia', sub: 'El negocio no paga flete si alcanza el mínimo', active: logGratisAgencia, setActive: setLogGratisAgencia, kg: logGratisAgenciaKg, setKg: setLogGratisAgenciaKg },
                      { key: 'domicilio' as const, label: 'Envío gratis a domicilio', sub: 'Para pedidos grandes con reparto en puerta', active: logGratisDomicilio, setActive: setLogGratisDomicilio, kg: logGratisDomicilioKg, setKg: setLogGratisDomicilioKg },
                    ].map(r => (
                      <div key={r.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--tw-border)' }}>
                        <div>
                          <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 600, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif' }}>{r.label}</p>
                          <p style={{ margin: 0, fontSize: 10, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>{r.sub}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: 9, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>Desde</span>
                          <input type="number" min="1" value={r.kg} onChange={e => r.setKg(e.target.value)}
                            style={{ width: 44, padding: '5px 6px', borderRadius: 6, border: '1px solid var(--tw-border)', background: 'var(--tw-bg)', color: 'var(--tw-text)', fontSize: 12, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', outline: 'none', textAlign: 'center' }} />
                          <span style={{ fontSize: 9, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>kg</span>
                          <div onClick={() => r.setActive(!r.active)}
                            style={{ width: 36, height: 20, borderRadius: 10, background: r.active ? 'var(--tw-terra)' : 'var(--tw-border)', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
                            <div style={{ position: 'absolute', top: 2, left: r.active ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Tarifa fija a agencia */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--tw-border)', opacity: logGratisAgencia ? 1 : 0.5 }}>
                      <div>
                        <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 600, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif' }}>Tarifa fija a agencia</p>
                        <p style={{ margin: 0, fontSize: 10, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>Se cobra cuando el pedido no alcanza el mínimo</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--tw-border)', borderRadius: 7, overflow: 'hidden', background: 'var(--tw-bg)', width: 90, flexShrink: 0 }}>
                        <span style={{ padding: '0 8px', fontSize: 11, color: 'var(--tw-text-muted)', fontWeight: 700, borderRight: '1px solid var(--tw-border)', fontFamily: 'Montserrat, sans-serif' }}>S/</span>
                        <input type="number" value={logTarifaAgencia} onChange={e => setLogTarifaAgencia(e.target.value)}
                          style={{ width: '100%', padding: '6px 8px', border: 'none', background: 'transparent', color: 'var(--tw-text)', fontSize: 12, fontFamily: 'Montserrat, sans-serif', outline: 'none' }} />
                      </div>
                    </div>

                    {/* Tarifa fija a domicilio */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', opacity: logGratisDomicilio ? 1 : 0.5 }}>
                      <div>
                        <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 600, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif' }}>Tarifa fija a domicilio</p>
                        <p style={{ margin: 0, fontSize: 10, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>Se cobra cuando el pedido no alcanza el mínimo</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--tw-border)', borderRadius: 7, overflow: 'hidden', background: 'var(--tw-bg)', width: 90, flexShrink: 0 }}>
                        <span style={{ padding: '0 8px', fontSize: 11, color: 'var(--tw-text-muted)', fontWeight: 700, borderRight: '1px solid var(--tw-border)', fontFamily: 'Montserrat, sans-serif' }}>S/</span>
                        <input type="number" value={logTarifaDomicilio} onChange={e => setLogTarifaDomicilio(e.target.value)}
                          style={{ width: '100%', padding: '6px 8px', border: 'none', background: 'transparent', color: 'var(--tw-text)', fontSize: 12, fontFamily: 'Montserrat, sans-serif', outline: 'none' }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={guardarLogistica} disabled={logisticaGuardando}
                      style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: logisticaGuardando ? 'var(--tw-text-muted)' : 'var(--tw-terra)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: logisticaGuardando ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                      {logisticaGuardando ? 'Guardando...' : 'Guardar configuración'}
                    </button>
                  </div>
                </div>

                {/* Col derecha: preview + impacto en margen */}
                <div style={{ flex: '0 1 240px', minWidth: 180 }}>
                  <div style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid var(--tw-border)', background: 'var(--tw-bg)', marginBottom: 12 }}>
                    <p style={{ margin: '0 0 10px', fontSize: 9, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'Montserrat, sans-serif' }}>Así verá el negocio:</p>
                    <div style={{ padding: '12px', borderRadius: 8, border: '1px solid var(--tw-border)', background: 'var(--tw-card)' }}>
                      <p style={{ margin: '0 0 2px', fontSize: 9, color: 'var(--tw-terra)', fontWeight: 700, fontFamily: 'Montserrat, sans-serif' }}>{logistica?.origenTexto ?? '—'}</p>
                      <p style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>Tu café publicado</p>
                      {logGratisAgencia
                        ? <div style={{ fontSize: 10, background: 'rgba(143,175,138,0.1)', color: 'var(--tw-sage)', borderRadius: 5, padding: '4px 8px', marginBottom: 4 }}>🚚 Agencia: GRATIS desde {logGratisAgenciaKg} kg · S/ {logTarifaAgencia} si no alcanza</div>
                        : <div style={{ fontSize: 10, background: 'rgba(100,100,100,0.08)', color: 'var(--tw-text-muted)', borderRadius: 5, padding: '4px 8px', marginBottom: 4 }}>🚚 Agencia: S/ {logTarifaAgencia}</div>
                      }
                      <div style={{ fontSize: 10, background: 'rgba(100,100,100,0.08)', color: 'var(--tw-text-muted)', borderRadius: 5, padding: '4px 8px' }}>📦 Domicilio: S/ {logTarifaDomicilio} · {logGratisDomicilio ? `Gratis desde ${logGratisDomicilioKg} kg` : 'Sin envío gratis'}</div>
                    </div>
                    <p style={{ margin: '8px 0 0', fontSize: 9, color: 'var(--tw-text-muted)', textAlign: 'center', fontFamily: 'Montserrat, sans-serif' }}>Vista previa del catálogo</p>
                  </div>

                  {/* Lo que verá el comprador */}
                  {(() => {
                    const kgAgencia = parseFloat(logGratisAgenciaKg) || 5
                    const kgDomicilio = parseFloat(logGratisDomicilioKg) || 15
                    const tarifaDom = parseFloat(logTarifaDomicilio) || 0
                    return (
                      <div style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid var(--tw-border)', background: '#0a0a0a' }}>
                        <p style={{ margin: '0 0 10px', fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'Montserrat, sans-serif' }}>Lo que verá el comprador</p>

                        {/* Agencia */}
                        <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #2a2a2a' }}>
                          <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 600, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif' }}>📦 Recojo en agencia</p>
                          {logGratisAgencia
                            ? <p style={{ margin: 0, fontSize: 10, color: '#7fbe96', fontFamily: 'Montserrat, sans-serif', lineHeight: 1.5 }}>
                                Barra de progreso: <em>"Agrega {kgAgencia} kg para envío gratis"</em><br />
                                Al alcanzar {kgAgencia} kg → 🚚 ¡Envío gratis a agencia!
                              </p>
                            : <p style={{ margin: 0, fontSize: 10, color: '#888', fontFamily: 'Montserrat, sans-serif' }}>Sin incentivo de envío gratis activado.</p>
                          }
                        </div>

                        {/* Domicilio */}
                        <div>
                          <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 600, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif' }}>🏠 Entrega a domicilio</p>
                          {logGratisDomicilio
                            ? <p style={{ margin: 0, fontSize: 10, color: '#f0c060', fontFamily: 'Montserrat, sans-serif', lineHeight: 1.5 }}>
                                Tarifa fija S/ {tarifaDom.toFixed(2)} hasta {kgDomicilio} kg<br />
                                Desde {kgDomicilio} kg → 🏠 ¡Domicilio gratis!
                              </p>
                            : tarifaDom > 0
                              ? <p style={{ margin: 0, fontSize: 10, color: '#888', fontFamily: 'Montserrat, sans-serif' }}>Tarifa fija S/ {tarifaDom.toFixed(2)} (sin umbral gratis).</p>
                              : <p style={{ margin: 0, fontSize: 10, color: '#888', fontFamily: 'Montserrat, sans-serif' }}>Sin domicilio configurado.</p>
                          }
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}

          </>
        )}
      </div>
    )
  }

  // ─── Perfil editable ─────────────────────────────────────────────────────────

  function renderPerfil() {
    if (!caficultor) return null

    const inputStyle: React.CSSProperties = {
      width: '100%', padding: '10px 12px', borderRadius: 8,
      border: `1px solid var(--tw-border)`, background: '#0f0f0f',
      fontSize: 13, fontFamily: 'Montserrat, sans-serif', color: 'var(--tw-text)',
      outline: 'none', boxSizing: 'border-box',
    }

    if (editandoPerfil) {
      return <FormEditarPerfil
        caficultor={caficultor}
        isDemo={isDemo}
        onCancel={() => setEditandoPerfil(false)}
        onSaved={(updates) => {
          setCaficultor(prev => prev ? { ...prev, ...updates } : prev)
          setEditandoPerfil(false)
          toast('Perfil actualizado', 'ok')
        }}
        onToast={toast}
        inputStyle={inputStyle}
      />
    }

    const ingresosNetos = pedidos.filter(p => p.logisticaStatus === 'entregado').reduce((s, p) => s + (p.totalCents ?? 0), 0)
    const negociosUnicos = new Set(pedidos.map(p => p.negocioId).filter(Boolean)).size

    return (
      <div>
        {/* Banner: sin logística configurada */}
        {!logistica && !logisticaCargando && (
          <div style={{ padding: '14px 18px', borderRadius: 12, background: '#2a1a00', border: `1px solid ${'#f39c12'}44`, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 700, color: '#f39c12', fontFamily: 'Montserrat, sans-serif' }}>⚠️ Configura tus envíos</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>Sin logística configurada no puedes recibir pedidos</p>
            </div>
            <button
              onClick={() => setSettingsTab('envio')}
              style={{ flexShrink: 0, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#f39c12', color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
            >
              Configurar
            </button>
          </div>
        )}

        {/* Layout 2 col en desktop */}
        <div className="perfil-2col">
          {/* Columna izquierda */}
          <div style={{ flex: 1, minWidth: 0 }}>

        {/* Hero: avatar + nombre + email */}
        <div style={{ background: 'var(--tw-card)', borderRadius: 16, padding: '16px 18px', marginBottom: 14, border: `1px solid var(--tw-border)`, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--tw-sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {caficultor.nombre.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif' }}>{caficultor.nombre}</div>
            <div style={{ fontSize: 11, color: 'var(--tw-text-muted)' }}>{(caficultor as any).email ?? '—'}</div>
            <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', marginTop: 2 }}>Caficultor desde ene 2025 · {caficultor.region}</div>
          </div>
          <button
            onClick={() => setEditandoPerfil(true)}
            style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 8, border: `1px solid var(--tw-border)`, background: 'transparent', color: 'var(--tw-text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
          >
            Editar
          </button>
        </div>

        {/* Ver perfil público */}
        <div style={{ marginBottom: 14 }}>
          <a href={`/caficultor/${caficultorId}`} onClick={(e) => { e.preventDefault(); navigate(`/caficultor/${caficultorId}`) }} style={{ fontSize: 12, color: 'var(--tw-terra)', textDecoration: 'none', fontWeight: 600 }}>
            Ver perfil público →
          </a>
        </div>

        {/* Mobile: menú lista → abre sección (oculto en desktop via CSS) */}
        <div className={`perfil-menu-mobile${settingsTab !== null ? ' perfil-menu-hidden' : ''}`}>
          {([
            { id: 'perfil',         emoji: '👤', label: 'Perfil' },
            { id: 'finca',          emoji: '🌄', label: 'Finca' },
            { id: 'cobros',         emoji: '💳', label: 'Cobros' },
            { id: 'envio',          emoji: '🚚', label: 'Formas de envío' },
            { id: 'direcciones',    emoji: '📍', label: 'Mis direcciones' },
            { id: 'notificaciones', emoji: '🔔', label: 'Notificaciones' },
            { id: 'seguridad',      emoji: '🔒', label: 'Seguridad' },
          ] as { id: SettingsTab; emoji: string; label: string }[]).map(item => (
            <button
              key={item.id}
              onClick={() => setSettingsTab(item.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 12, marginBottom: 8, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
            >
              <span style={{ fontSize: 22, width: 32, textAlign: 'center', flexShrink: 0 }}>{item.emoji}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--tw-text)', textAlign: 'left' }}>{item.label}</span>
              <span style={{ fontSize: 16, color: 'var(--tw-text-muted)' }}>›</span>
            </button>
          ))}
        </div>

        {/* Mobile: botón volver (oculto en desktop via CSS, oculto cuando settingsTab===null) */}
        <button
          className="perfil-back-btn"
          onClick={() => setSettingsTab(null)}
          style={{ display: 'none', alignItems: 'center', gap: 6, marginBottom: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tw-terra)', fontSize: 12, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', padding: 0 }}
        >
          ‹ Volver
        </button>

        {/* Tabs horizontales: siempre renderizados, visibles en desktop, ocultos en mobile cuando settingsTab===null */}
        <div className="settings-tabs settings-tabs-desktop" style={{ borderBottom: '1px solid var(--tw-border)', marginBottom: 20 }}>
          {(['perfil', 'finca', 'cobros', 'envio', 'direcciones', 'notificaciones', 'seguridad'] as NonNullable<SettingsTab>[]).map(id => {
            const emojis: Record<NonNullable<SettingsTab>, string> = { perfil: '👤', finca: '🌄', cobros: '💳', envio: '🚚', direcciones: '📍', notificaciones: '🔔', seguridad: '🔒' }
            const labels: Record<NonNullable<SettingsTab>, string> = { perfil: 'Perfil', finca: 'Finca', cobros: 'Cobros', envio: 'Envío', direcciones: 'Direcciones', notificaciones: 'Notific.', seguridad: 'Seguridad' }
            const isActive = (settingsTab ?? 'perfil') === id
            return (
              <button key={id} onClick={() => setSettingsTab(id)} style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: isActive ? 'var(--tw-sage)' : 'var(--tw-text-muted)', background: 'none', border: 'none', borderBottom: isActive ? '2px solid var(--tw-sage)' : '2px solid transparent', fontFamily: 'Montserrat, sans-serif', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {emojis[id]} {labels[id]}
              </button>
            )
          })}
        </div>

        {/* Contenido del tab (oculto en mobile si settingsTab===null) */}
        <div className={settingsTab === null ? 'perfil-content-hidden' : ''}>
          {renderSettings()}
          {(settingsTab === 'perfil' || settingsTab === null) && renderCalificaciones()}
        </div>

        {/* Ayuda */}
        <div style={{ background: 'var(--tw-card)', borderRadius: 14, padding: '16px 18px', border: `1px solid var(--tw-border)` }}>
          <p style={{ margin: '0 0 12px', fontSize: 11, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>¿Necesitas ayuda?</p>
          <a
            href={`https://wa.me/51905933391?text=Hola, soy ${caficultor.nombre} y necesito ayuda con mi portal`}
            target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, background: '#25D36622', border: `1px solid '#25D36644'`, textDecoration: 'none' }}
          >
            <span style={{ fontSize: 20 }}>💬</span>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--tw-text)' }}>Hablar con el equipo</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--tw-text-muted)' }}>WhatsApp directo con TunayWasi</p>
            </div>
          </a>
        </div>

          </div>{/* /columna izquierda */}

          {/* Columna derecha: resumen */}
          <div style={{ width: 240, flexShrink: 0, display: 'none' }} className="perfil-col-right">
            <div style={{ background: 'var(--tw-card)', borderRadius: 14, padding: '16px 18px', border: `1px solid var(--tw-border)` }}>
              <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif' }}>📊 Resumen</p>
              {[
                { label: 'Total ventas', value: String(pedidos.length) },
                { label: 'Ingresos netos', value: ingresosNetos > 0 ? `S/ ${(ingresosNetos / 100).toLocaleString('es-PE', { minimumFractionDigits: 0 })}` : '—' },
                { label: 'Calificación', value: scorePromedio > 0 ? `${scorePromedio.toFixed(1)} ⭐` : '—' },
                { label: 'Negocios atendidos', value: String(negociosUnicos) },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid var(--tw-border)` }}>
                  <span style={{ fontSize: 11, color: 'var(--tw-text-muted)' }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tw-text)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>{/* /layout 2 col */}
      </div>
    )
  }

  // ─── Settings ────────────────────────────────────────────────────────────────

  function renderSettings() {
    if (!caficultor) return null

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

    const notifRow = (key: keyof typeof notifState, label: string, sub?: string) => (
      <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--tw-border)' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tw-text)' }}>{label}</div>
          {sub && <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', marginTop: 1 }}>{sub}</div>}
        </div>
        <div
          onClick={() => setNotifState(prev => ({ ...prev, [key]: !prev[key] }))}
          style={{
            width: 36, height: 20, borderRadius: 10, flexShrink: 0, cursor: 'pointer', position: 'relative',
            background: notifState[key] ? 'var(--tw-sage)' : 'var(--tw-border)',
          }}
        >
          <div style={{
            position: 'absolute', top: 2, borderRadius: '50%', width: 16, height: 16, background: '#fff',
            left: notifState[key] ? 'calc(100% - 18px)' : 2, transition: 'left 0.15s',
          }} />
        </div>
      </div>
    )

    const activeTab = settingsTab ?? 'perfil'
    return (
      <div>
        {/* Tab: Perfil */}
        {activeTab === 'perfil' && (
          <div className="perfil-2col">
            <div style={{ flex: 1, maxWidth: 520, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
              {/* Datos personales */}
              <div style={{ marginBottom: 20 }}>
                <div style={sectionTitle}>Datos personales</div>
                <div className="grid-2col" style={{ marginBottom: 10 }}>
                  <div>
                    <div style={fieldLabel}>Nombre completo</div>
                    <input style={inputStyle} defaultValue={caficultor.nombre} />
                  </div>
                  <div>
                    <div style={fieldLabel}>DNI</div>
                    {/* TRIB-04 / REG-01: el DNI es inmutable — reservado en one_documentos */}
                    <input style={{ ...inputStyle, opacity: 0.7, cursor: 'not-allowed' }} value={perfilFiscal?.dni ?? (caficultor as any).dni ?? '—'} readOnly aria-readonly="true" />
                  </div>
                </div>
                {/* TRIB-04: modalidad tributaria (solo lectura — cambiarla requiere al reviewer) */}
                <div className="grid-2col" style={{ marginBottom: 10 }}>
                  <div>
                    <div style={fieldLabel}>Modalidad tributaria</div>
                    <input style={{ ...inputStyle, opacity: 0.7, cursor: 'not-allowed' }} readOnly aria-readonly="true"
                      value={perfilFiscal?.tipoRegistroCaficultor ? { SOLO_DNI: 'Solo DNI — solo café verde', RUC_PROPIO: 'RUC propio', COOPERATIVA: 'Socio de cooperativa' }[perfilFiscal.tipoRegistroCaficultor] : 'No registrada'} />
                  </div>
                  {perfilFiscal?.tipoRegistroCaficultor && perfilFiscal.tipoRegistroCaficultor !== 'SOLO_DNI' && (
                    <div>
                      <div style={fieldLabel}>{perfilFiscal.tipoRegistroCaficultor === 'COOPERATIVA' ? 'RUC de la cooperativa' : 'RUC'}</div>
                      <input style={{ ...inputStyle, opacity: 0.7, cursor: 'not-allowed' }} readOnly aria-readonly="true"
                        value={(perfilFiscal.tipoRegistroCaficultor === 'COOPERATIVA' ? perfilFiscal.rucCooperativa : perfilFiscal.ruc) ?? '—'} />
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', margin: '-4px 0 10px' }}>DNI, modalidad y RUC están vinculados a tu cuenta. Para cambiarlos escribe a tunaywasi@gmail.com.</div>
                <div style={{ marginBottom: 10 }}>
                  <div style={fieldLabel}>Teléfono / WhatsApp</div>
                  <input style={inputStyle} defaultValue={(caficultor as any).telefono ?? ''} placeholder="+51 9xx xxx xxx" />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={fieldLabel}>Correo electrónico</div>
                  <input style={inputStyle} defaultValue={(caficultor as any).email ?? ''} placeholder="correo@ejemplo.com" />
                </div>
              </div>

              {/* Datos de productor */}
              <div style={{ marginBottom: 20 }}>
                <div style={sectionTitle}>Datos de productor</div>
                <div className="grid-2col" style={{ marginBottom: 10 }}>
                  <div>
                    <div style={fieldLabel}>Región</div>
                    <input style={inputStyle} defaultValue={caficultor.region} />
                  </div>
                  <div>
                    <div style={fieldLabel}>Provincia</div>
                    <input style={inputStyle} defaultValue={(caficultor as any).provincia ?? ''} placeholder="Provincia" />
                  </div>
                </div>
                <div>
                  <div style={fieldLabel}>Descripción del productor</div>
                  <textarea
                    style={{ ...inputStyle, resize: 'none' }}
                    rows={3}
                    defaultValue={(caficultor as any).descripcion ?? ''}
                    placeholder="Cuéntanos sobre ti y tu finca..."
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--tw-border)', background: 'transparent', color: 'var(--tw-text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Cancelar</button>
                <button onClick={() => toast('Perfil guardado', 'ok')} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--tw-sage)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Guardar cambios</button>
              </div>
            </div>

            {/* Card lateral: estado del perfil */}
            <div style={{ width: 220, flexShrink: 0, display: 'none' }} className="settings-col-right">
              <div style={{ background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 10, padding: 14 }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 14, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 10 }}>🌱 Estado del perfil</div>
                {[
                  { ok: true,  label: 'Perfil verificado',   sub: 'TunayWasi confirma tu identidad' },
                  { ok: true,  label: 'Finca registrada',    sub: `${(caficultor as any).finca ?? 'Tu finca'}` },
                  { ok: false, label: 'Foto pendiente',      sub: 'Sube tu foto de perfil' },
                ].map(({ ok, label, sub }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 14 }}>{ok ? '✅' : '⚠️'}</span>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-text)' }}>{label}</div>
                      <div style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>{sub}</div>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--tw-border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', marginBottom: 4 }}>Completado</div>
                  <div style={{ height: 6, background: 'var(--tw-border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: '75%', height: '100%', background: 'var(--tw-sage)', borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--tw-sage)', fontWeight: 700, marginTop: 4 }}>75% completo</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Finca */}
        {activeTab === 'finca' && (
          <div className="perfil-2col">
            <div style={{ flex: 1, maxWidth: 520, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
              <div style={{ marginBottom: 20 }}>
                <div style={sectionTitle}>Datos de la finca</div>
                <div style={{ marginBottom: 10 }}>
                  <div style={fieldLabel}>Nombre de la finca</div>
                  <input style={inputStyle} defaultValue={(caficultor as any).finca ?? ''} placeholder="Finca La Estrella" />
                </div>
                <div className="modal-prod-grid-3" style={{ gap: 10 }}>
                  <div>
                    <div style={fieldLabel}>Altitud (msnm)</div>
                    <input style={inputStyle} defaultValue={caficultor.altitudMsnm} type="number" />
                  </div>
                  <div>
                    <div style={fieldLabel}>Hectáreas</div>
                    <input style={inputStyle} defaultValue={(caficultor as any).hectareas ?? ''} placeholder="12" type="number" />
                  </div>
                  <div>
                    <div style={fieldLabel}>Años activa</div>
                    <input style={inputStyle} defaultValue={(caficultor as any).aniosActiva ?? ''} placeholder="28" type="number" />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={sectionTitle}>Variedades cultivadas</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {((caficultor as any).variedades ?? ['Gesha', 'Bourbon']).map((v: string) => (
                    <span key={v} style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, color: 'var(--tw-sage)', background: 'rgba(143,175,138,.15)', padding: '2px 8px', borderRadius: 4 }}>{v}</span>
                  ))}
                  <span style={{ display: 'inline-block', fontSize: 9, color: 'var(--tw-text-muted)', background: 'var(--tw-border)', padding: '2px 8px', borderRadius: 4, cursor: 'pointer' }}
                    onClick={() => toast('Próximamente: agregar variedad', 'info')}>+ Agregar</span>
                </div>
                <div>
                  <div style={fieldLabel}>Proceso principal</div>
                  <input style={inputStyle} defaultValue={(caficultor as any).proceso ?? 'Lavado / Natural'} />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={sectionTitle}>Certificaciones</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {((caficultor as any).certificaciones ?? ['☕ Café de especialidad']).map((c: string) => (
                    <span key={c} style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, color: 'var(--tw-sage)', background: 'rgba(143,175,138,.15)', padding: '2px 8px', borderRadius: 4 }}>{c}</span>
                  ))}
                  <span style={{ display: 'inline-block', fontSize: 9, color: 'var(--tw-text-muted)', background: 'var(--tw-border)', padding: '2px 8px', borderRadius: 4, cursor: 'pointer' }}
                    onClick={() => toast('Próximamente: agregar certificación', 'info')}>+ Agregar</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--tw-border)', background: 'transparent', color: 'var(--tw-text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Cancelar</button>
                <button onClick={() => toast('Finca guardada', 'ok')} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--tw-sage)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Guardar cambios</button>
              </div>
            </div>

            {/* Card lateral: ubicación */}
            <div style={{ width: 220, flexShrink: 0, display: 'none' }} className="settings-col-right">
              <div style={{ background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 10, padding: 14 }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 14, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 10 }}>📍 Ubicación</div>
                <div style={{ background: 'rgba(143,175,138,.08)', border: '1px solid rgba(143,175,138,.2)', borderRadius: 8, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24 }}>🗺️</div>
                    <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', marginTop: 4 }}>{caficultor.region}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Envío */}
        {activeTab === 'envio' && renderLogistica()}

        {/* Tab: Direcciones */}
        {activeTab === 'direcciones' && (() => {
          const TIPOS_CAF = [
            { value: 'finca', emoji: '🏡', label: 'Finca / Casa' },
            { value: 'agencia', emoji: '🏪', label: 'Agencia courier' },
            { value: 'otro', emoji: '🏢', label: 'Otro' },
          ]
          const DEPTOS = ['Amazonas','Áncash','Apurímac','Arequipa','Ayacucho','Cajamarca','Callao','Cusco','Huancavelica','Huánuco','Ica','Junín','La Libertad','Lambayeque','Lima','Loreto','Madre de Dios','Moquegua','Pasco','Piura','Puno','San Martín','Tacna','Tumbes','Ucayali']
          const abrirNueva = () => {
            setDirFormEditar(undefined)
            setDirFormTipo('finca'); setDirFormNombre(''); setDirFormDir('')
            setDirFormDistrito(''); setDirFormProvincia(''); setDirFormDpto('Lima')
            setDirFormRef(''); setDirFormTel(''); setDirFormPrincipal(false)
            setDirFormAbierto(true)
          }
          const abrirEditar = (dir: typeof direcciones[0]) => {
            setDirFormEditar(dir)
            setDirFormTipo(dir.tipo); setDirFormNombre(dir.nombre); setDirFormDir(dir.direccion)
            setDirFormDistrito(dir.distrito); setDirFormProvincia(dir.provincia); setDirFormDpto(dir.departamento)
            setDirFormRef(dir.referencia); setDirFormTel(dir.telefono); setDirFormPrincipal(dir.esPrincipal)
            setDirFormAbierto(true)
          }
          const guardar = () => {
            if (!dirFormDir.trim() || !dirFormDistrito.trim()) return
            const nueva: typeof direcciones[0] = {
              id: dirFormEditar?.id ?? `dir-${Date.now()}`,
              tipo: dirFormTipo, nombre: dirFormNombre, direccion: dirFormDir,
              distrito: dirFormDistrito, provincia: dirFormProvincia, departamento: dirFormDpto,
              codigoPostal: '', referencia: dirFormRef, telefono: dirFormTel, esPrincipal: dirFormPrincipal,
            }
            setDirecciones(prev => {
              const idx = prev.findIndex(x => x.id === nueva.id)
              let updated = idx >= 0 ? prev.map(x => x.id === nueva.id ? nueva : x) : [...prev, nueva]
              if (nueva.esPrincipal) updated = updated.map(x => x.id === nueva.id ? x : { ...x, esPrincipal: false })
              return updated
            })
            toast(dirFormEditar ? 'Dirección actualizada' : 'Dirección guardada', 'ok')
            setDirFormAbierto(false)
          }
          return (
            <div style={{ maxWidth: 520, width: '100%', boxSizing: 'border-box' }}>
              {/* Lista */}
              {!dirFormAbierto && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={sectionTitle}>Mis direcciones</div>
                    <button onClick={abrirNueva} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>+ Agregar</button>
                  </div>
                  {direcciones.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--tw-text-muted)' }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>📍</div>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>Sin direcciones registradas</div>
                      <div style={{ fontSize: 11 }}>Agrega tu finca o punto de despacho</div>
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
                        {!dir.esPrincipal && <button onClick={() => setDirecciones(prev => prev.filter(d => d.id !== dir.id))} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,.3)', background: 'transparent', color: '#ef4444', fontSize: 10, cursor: 'pointer' }}>×</button>}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Formulario inline */}
              {dirFormAbierto && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <button onClick={() => setDirFormAbierto(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--tw-text-muted)', padding: 0 }}>‹</button>
                    <div style={sectionTitle}>{dirFormEditar ? 'Editar dirección' : 'Nueva dirección'}</div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={fieldLabel}>Tipo</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {TIPOS_CAF.map(t => (
                        <button key={t.value} onClick={() => setDirFormTipo(t.value)} style={{ flex: 1, padding: '10px 6px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${dirFormTipo === t.value ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: dirFormTipo === t.value ? 'rgba(201,110,75,0.08)' : 'var(--tw-card)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 20 }}>{t.emoji}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--tw-text)', textAlign: 'center' }}>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <div style={fieldLabel}>Nombre de referencia</div>
                    <input value={dirFormNombre} onChange={e => setDirFormNombre(e.target.value)} style={inputStyle} placeholder="Ej: Finca Vista Hermosa" />
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={fieldLabel}>Dirección *</div>
                    <input value={dirFormDir} onChange={e => setDirFormDir(e.target.value)} style={inputStyle} placeholder="Jr. Los Nogales 234" />
                  </div>
                  <div className="grid-2col" style={{ marginBottom: 10 }}>
                    <div>
                      <div style={fieldLabel}>Distrito *</div>
                      <input value={dirFormDistrito} onChange={e => setDirFormDistrito(e.target.value)} style={inputStyle} placeholder="Jaén" />
                    </div>
                    <div>
                      <div style={fieldLabel}>Provincia</div>
                      <input value={dirFormProvincia} onChange={e => setDirFormProvincia(e.target.value)} style={inputStyle} placeholder="Jaén" />
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
                    <input value={dirFormRef} onChange={e => setDirFormRef(e.target.value)} style={inputStyle} placeholder="A 2 km de la carretera, portón verde" />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={fieldLabel}>Teléfono de contacto</div>
                    <input value={dirFormTel} onChange={e => setDirFormTel(e.target.value)} style={inputStyle} placeholder="+51 9XX XXX XXX" type="tel" />
                  </div>
                  <div onClick={() => setDirFormPrincipal(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: '1px solid var(--tw-border)', background: 'var(--tw-card)', marginBottom: 20, cursor: 'pointer' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tw-text)' }}>Establecer como dirección principal</div>
                      <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', marginTop: 2 }}>Se usará por defecto en nuevos despachos</div>
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
        {activeTab === 'notificaciones' && (
          <div style={{ maxWidth: 520, width: '100%', boxSizing: 'border-box' }}>
            <div style={{ marginBottom: 20 }}>
              <div style={sectionTitle}>Pedidos</div>
              {notifRow('nuevoPedido', 'Nuevo pedido recibido', 'Cuando un negocio hace un pedido nuevo')}
              {notifRow('pagoVerificado', 'Pago verificado por TunayWasi', 'Cuando el admin confirma el voucher del negocio')}
              {notifRow('pedidoEntregado', 'Pedido entregado confirmado', 'Cuando el negocio confirma la recepción')}
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={sectionTitle}>Negocio y mensajes</div>
              {notifRow('mensajeNegocio', 'Mensaje de un negocio', 'Consultas o reclamos de clientes')}
              {notifRow('valoracionRecibida', 'Valoración recibida', 'Cuando un negocio valora tu café')}
              {notifRow('stockBajo', 'Stock bajo', 'Cuando un lote queda con menos de 5 kg')}
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={sectionTitle}>Canal de notificación</div>
              {notifRow('whatsapp', 'WhatsApp', (caficultor as any).telefono ?? '+51 9xx xxx xxx')}
              {notifRow('email', 'Email', (caficultor as any).email ?? 'correo@ejemplo.com')}
              {notifRow('push', 'Push (app Android)', 'Notificaciones en el móvil')}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => toast('Preferencias guardadas', 'ok')} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--tw-sage)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Guardar preferencias</button>
            </div>
          </div>
        )}

        {/* Tab: Cobros */}
        {activeTab === 'cobros' && (
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, maxWidth: 520, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
              <div style={{ marginBottom: 20 }}>
                <div style={sectionTitle}>💳 Cobros</div>
                <div style={{ marginBottom: 10 }}>
                  <div style={fieldLabel}>Número Yape</div>
                  <input style={inputStyle} type="tel" defaultValue={(caficultor as any).numeroYape ?? ''} placeholder="+51 9XX XXX XXX" />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={fieldLabel}>Banco</div>
                  <div style={{ position: 'relative' }}>
                    <select style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }} defaultValue={(caficultor as any).banco ?? ''}>
                      <option value="">Seleccionar banco</option>
                      {['BCP', 'Interbank', 'BBVA', 'Scotiabank', 'BanBif', 'Caja Cusco', 'Caja Piura'].map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--tw-text-muted)', pointerEvents: 'none' }}>▾</span>
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={fieldLabel}>Número de cuenta</div>
                  <input style={inputStyle} defaultValue={(caficultor as any).numeroCuenta ?? ''} placeholder="191-XXXXXXXXX-X-XX" />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={fieldLabel}>CCI <span style={{ fontWeight: 400, color: 'var(--tw-text-muted)' }}>(opcional)</span></div>
                  <input style={inputStyle} defaultValue={(caficultor as any).cci ?? ''} placeholder="00219100XXXXXXXXXX25" />
                </div>
                <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', marginBottom: 16 }}>
                  TunayWasi envía los pagos confirmados a esta cuenta dentro de las 24h.
                </div>
              </div>
              <div style={{ padding: '8px 10px', background: 'rgba(143,175,138,.06)', border: '1px solid rgba(143,175,138,.15)', borderRadius: 7, fontSize: 10, color: 'var(--tw-sage)', marginBottom: 20 }}>
                🚚 La configuración de envíos (origen, agencias, tarifas) se gestiona en la pestaña <strong>Envíos</strong>.
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--tw-border)', background: 'transparent', color: 'var(--tw-text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Cancelar</button>
                <button onClick={() => toast('Datos de cobro guardados', 'ok')} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--tw-sage)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Guardar cambios</button>
              </div>
            </div>
            {/* Card lateral: consejos */}
            <div style={{ width: 220, flexShrink: 0, display: 'none' }} className="settings-col-right">
              <div style={{ background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 10, padding: 14 }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 14, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 10 }}>💡 Consejos</div>
                <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', lineHeight: 1.5 }}>
                  <div style={{ marginBottom: 8 }}>✅ <b>Yape activo</b> permite que los negocios confirmen sus pedidos más rápido.</div>
                  <div style={{ marginBottom: 8 }}>🏦 El <b>número de cuenta</b> es donde recibes el pago una vez que TunayWasi confirma la entrega.</div>
                  <div>🚚 Configura tus agencias y tarifas en la pestaña <b>Envíos</b>.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Seguridad */}
        {activeTab === 'seguridad' && (
          <div style={{ maxWidth: 520, width: '100%', boxSizing: 'border-box' }}>
            <div style={{ marginBottom: 20 }}>
              <div style={sectionTitle}>Contraseña</div>
              <div style={{ marginBottom: 10 }}>
                <div style={fieldLabel}>Contraseña actual</div>
                <input style={inputStyle} type="password" placeholder="••••••••" />
              </div>
              <div className="grid-2col" style={{ marginBottom: 10 }}>
                <div>
                  <div style={fieldLabel}>Nueva contraseña</div>
                  <input style={inputStyle} type="password" placeholder="Mínimo 8 caracteres" />
                </div>
                <div>
                  <div style={fieldLabel}>Confirmar contraseña</div>
                  <input style={inputStyle} type="password" placeholder="Repetir nueva" />
                </div>
              </div>
              <button onClick={() => toast('Próximamente: cambiar contraseña', 'info')} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--tw-sage)', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Cambiar contraseña</button>
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
                  <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', marginTop: 2 }}>Se eliminarán tus datos, finca y lotes publicados</div>
                </div>
                <button onClick={() => toast('Contacta a soporte para eliminar tu cuenta', 'info')} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.05)', color: '#ef4444', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Eliminar cuenta</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: 'var(--tw-bg)', fontFamily: 'Montserrat, sans-serif', display: 'flex', overflowX: 'hidden' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }

        /* Sidebar interno eliminado — navegación vive en GlobalHeader */

        /* ── Perfil columna derecha ── */
        @media (min-width: 900px) {
          .perfil-col-right { display: block !important; }
        }

        /* ── Settings columna derecha ── */
        @media (min-width: 900px) {
          .settings-col-right { display: block !important; }
        }

        /* ── Grids responsive ── */

        /* KPIs: 4 col en desktop, 2×2 en tablet, 2 col en mobile */
        .grid-kpis { display: grid; gap: 10px; }
        @media (min-width: 701px)  { .grid-kpis { grid-template-columns: repeat(4, 1fr); } }
        @media (max-width: 700px)  { .grid-kpis { grid-template-columns: repeat(2, 1fr); } }

        /* Pedidos: 2 col en desktop ancho, 1 col en tablet/mobile */
        .grid-pedidos { display: grid; gap: 14px; }
        @media (min-width: 1100px) { .grid-pedidos { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 1099px) { .grid-pedidos { grid-template-columns: 1fr; } }

        /* Card pedido: layout interno productos + acciones */
        .pedido-card-body { display: flex; gap: 0; }
        .pedido-acciones { width: 160px; flex-shrink: 0; padding: 14px 12px; border-left: 1px solid var(--tw-border); display: flex; flex-direction: column; gap: 8px; }
        @media (max-width: 600px) {
          .pedido-card-body { flex-direction: column; }
          .pedido-acciones { width: 100%; border-left: none; border-top: 1px solid var(--tw-border); flex-direction: row; flex-wrap: wrap; padding: 10px 12px; }
          .pedido-acciones > * { flex: 1; min-width: 120px; }
        }

        /* Productos: 4 col en desktop ancho, 3 col en desktop normal, 2 col en tablet, 1 col en mobile */
        .grid-productos { display: grid; gap: 14px; }
        @media (min-width: 1200px) { .grid-productos { grid-template-columns: repeat(4, 1fr); } }
        @media (min-width: 900px) and (max-width: 1199px) { .grid-productos { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 601px) and (max-width: 899px) { .grid-productos { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px)  { .grid-productos { grid-template-columns: 1fr; gap: 8px; } }

        /* Historial resumen: 2 col siempre, nunca se apila */
        .grid-historial-kpis { display: grid; gap: 10px; grid-template-columns: repeat(2, 1fr); }

        /* Distribución calificaciones: siempre 160px + 1fr */
        .grid-score { display: grid; gap: 20px; grid-template-columns: 160px 1fr; }
        @media (max-width: 600px) { .grid-score { grid-template-columns: 1fr; } }

        /* Form perfil caficultor: collapse 2-col grids en mobile */
        .perfil-caf-grid-2 { grid-template-columns: 1fr 1fr; }
        @media (max-width: 500px) { .perfil-caf-grid-2 { grid-template-columns: 1fr; } }

        /* Logística: cascada 3 col (dep/prov/dist) → 1 col en mobile */
        .grid-geo-3 { display: grid; gap: 8px; }
        @media (min-width: 560px) { .grid-geo-3 { grid-template-columns: 1fr 1fr 1fr; } }
        @media (max-width: 559px) { .grid-geo-3 { grid-template-columns: 1fr; } }

        /* Sub-tabs de configuración: scroll horizontal sin scrollbar */
        .settings-tabs { display: flex; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .settings-tabs::-webkit-scrollbar { display: none; }
        /* Desktop: menú lista siempre oculto, tabs y contenido siempre visibles */
        @media (min-width: 601px) {
          .perfil-menu-mobile { display: none !important; }
          .perfil-back-btn { display: none !important; }
          .perfil-content-hidden { display: block !important; }
        }
        /* Mobile: menú lista visible (cuando no hay tab), tabs ocultos */
        @media (max-width: 600px) {
          .perfil-menu-mobile { display: block; }
          .perfil-menu-hidden { display: none !important; }
          .settings-tabs-desktop { display: none !important; }
          .perfil-back-btn { display: flex !important; }
          .perfil-content-hidden { display: none !important; }
        }

        /* Layout 2 col perfil: colapsa en mobile */
        .perfil-2col { display: flex; gap: 20px; align-items: flex-start; }
        @media (max-width: 600px) { .perfil-2col { flex-direction: column; } }

        /* Logística step tabs: scroll horizontal en mobile */
        .log-steps { display: flex; border: 1px solid var(--tw-border); border-radius: 8px; overflow: hidden; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .log-steps::-webkit-scrollbar { display: none; }

        /* Paso logística: 2 columnas en desktop, 1 en mobile */
        .grid-log-paso { display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap; }
        .grid-log-paso > * { flex: 1 1 320px; min-width: 0; }

        /* Grids 2-col genéricos → 1 col en mobile */
        .grid-2col { display: grid; gap: 10px; grid-template-columns: 1fr 1fr; }
        @media (max-width: 500px) { .grid-2col { grid-template-columns: 1fr; } }

        /* Modal producto: layout principal 2-col → 1 col en mobile */
        .modal-producto-layout { grid-template-columns: 1fr 360px !important; }
        @media (max-width: 720px) { .modal-producto-layout { grid-template-columns: 1fr !important; } }
        .modal-prod-grid-2 { display: grid; gap: 12px; grid-template-columns: 1fr 1fr; }
        @media (max-width: 500px) { .modal-prod-grid-2 { grid-template-columns: 1fr; } }
        .modal-prod-grid-3 { display: grid; gap: 12px; grid-template-columns: 1fr 1fr 1fr; }
        @media (max-width: 500px) { .modal-prod-grid-3 { grid-template-columns: 1fr; } }
        .modal-prod-grid-4 { display: grid; gap: 8px; grid-template-columns: repeat(4,1fr); }
        @media (max-width: 500px) { .modal-prod-grid-4 { grid-template-columns: repeat(2,1fr); } }
      `}</style>

      {/* Main content — sin sidebar interno, navegación en GlobalHeader */}
      <div style={{ flex: 1, minHeight: '100vh', minWidth: 0, overflowX: 'hidden' }}>
        <div style={{ padding: '16px 16px 40px' }}>
          {tab === 'pedidos' && renderPedidosTab()}
          {tab === 'productos' && renderProductos()}
          {tab === 'historial' && renderHistorial()}
          {tab === 'pagos' && renderPagos()}
          {tab === 'perfil' && renderPerfil()}

          {tab === 'alertas' && (
            <NotificacionesCaficultor
              caficultorId={caficultorId}
              onNavigatePedido={(pedidoId) => {
                // El GlobalHeader maneja la navegación de tab; aquí solo refrescamos
                void pedidoId
              }}
              onNavigateCotizacion={(_cotizId) => void 0}
              onNavigateProducto={(_prodId) => void 0}
              demo={isDemo}
            />
          )}

          {tab === 'wasi' && (
            <div style={{ height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}>
              <WasiChat rol="seller" nombreUsuario={caficultor?.nombre} />
            </div>
          )}
        </div>
      </div>

      {/* Drawer detalle pedido (activos e historial) */}
      {pedidoDetalle && (() => {
        const p = pedidoDetalle
        const miStatus = miStatusEnPedido(p)
        const isPend = miStatus === 'preparando'
        const isAgencia = miStatus === 'en_agencia' || miStatus === 'en_disputa'
        const pagoOk = (p.pagoStatus as string) === 'PAID' || (p.pagoStatus as string) === 'verificado'
        const miCodigo = miCodigoEnPedido(p)
        const total = misItems(p).reduce((s, i) => s + i.subtotalCents, 0)

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex' }} onClick={() => setPedidoDetalle(null)}>
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.7)' }} />
            <div
              style={{ width: 'min(480px, 100vw)', background: 'var(--tw-card)', borderLeft: `1px solid var(--tw-border)`, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header drawer */}
              <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid var(--tw-border)`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: 10, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{p.id}</p>
                  <h2 style={{ margin: '0 0 2px', fontSize: 22, fontFamily: 'Cormorant Garamond, serif', color: 'var(--tw-text)', fontWeight: 700 }}>{p.nombreLocal}</h2>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--tw-text-muted)' }}>{p.distritoLocal} · {formatFecha(p.createdAt)}</p>
                </div>
                <button onClick={() => setPedidoDetalle(null)} style={{ background: 'none', border: 'none', color: 'var(--tw-text-muted)', fontSize: 22, cursor: 'pointer', padding: '0 0 0 16px', lineHeight: 1 }}>×</button>
              </div>

              <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Estado pago */}
                <div style={{ padding: '12px 14px', borderRadius: 10, background: (pagoOk ? 'var(--tw-sage)' : '#f39c12') + '11', border: `1px solid ${(pagoOk ? 'var(--tw-sage)' : '#f39c12')}33` }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: pagoOk ? 'var(--tw-sage)' : '#f39c12' }}>
                    {pagoOk ? '✓ Pago verificado' : p.pagoStatus === 'voucher_subido' ? '🔎 Voucher enviado — verificando' : '⏳ Pago pendiente'}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--tw-text-muted)' }}>
                    Método: {p.metodoPago?.toUpperCase() ?? '—'}
                    {p.voucherUrl ? <> · <a href={p.voucherUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--tw-terra)' }}>Ver voucher →</a></> : null}
                  </p>
                </div>

                {/* Items */}
                <div>
                  <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Productos</p>
                  {misItems(p).map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--tw-bg)', borderRadius: 8, marginBottom: 6 }}>
                      <div>
                        <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: 'var(--tw-text)' }}>{item.productoNombre}</p>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--tw-text-muted)' }}>{item.qty} × {item.presentacion}</p>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tw-terra)', flexShrink: 0, marginLeft: 12 }}>{formatCents(item.subtotalCents)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderTop: `1px solid var(--tw-border)`, marginTop: 4 }}>
                    <span style={{ fontSize: 13, color: 'var(--tw-text-muted)' }}>
                      {(() => {
                        const envioD = p.envioDetalle?.[caficultorId]
                        if (envioD?.tipo === 'domicilio') return '🚚 Envío a domicilio'
                        if (envioD?.tipo === 'agencia') return `📦 ${envioD.agencia ?? p.agencia ?? 'Agencia'}`
                        return p.agencia ? `📦 ${p.agencia}` : '📦 Envío'
                      })()}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--tw-text-muted)' }}>{formatCents(p.deliveryCents)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tw-text)' }}>Total</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--tw-terra)' }}>{formatCents(total + p.deliveryCents)}</span>
                  </div>
                </div>

                {/* Dirección */}
                {p.direccionEntrega && (
                  <div>
                    <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Dirección de entrega</p>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--tw-text)', padding: '10px 12px', background: 'var(--tw-bg)', borderRadius: 8 }}>📍 {p.direccionEntrega}</p>
                  </div>
                )}

                {/* Destinatario */}
                <div style={{ padding: '10px 12px', background: 'var(--tw-bg)', borderRadius: 8 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Destinatario</p>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tw-text)' }}>{p.negocioRazonSocial || p.nombreLocal}</div>
                  {p.negocioRuc && <div style={{ fontSize: 11, color: 'var(--tw-text-muted)' }}>RUC {p.negocioRuc}</div>}
                  {p.negocioNombre && <div style={{ fontSize: 11, color: 'var(--tw-text-muted)' }}>👤 {p.negocioNombre}</div>}
                  {p.negocioEmail && <div style={{ fontSize: 11, color: 'var(--tw-text-muted)' }}>{p.negocioEmail}</div>}
                  {p.negocioTelefono && <div style={{ fontSize: 11, color: 'var(--tw-text-muted)' }}>{p.negocioTelefono}</div>}
                  {p.distritoLocal && <div style={{ fontSize: 11, color: 'var(--tw-text-muted)' }}>📍 {p.distritoLocal}</div>}
                </div>

                {/* Chat con el negocio */}
                <div>
                  <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Chat con el negocio
                  </p>
                  <ChatPedido
                    pedidoId={p.id}
                    caficultorId={caficultorId}
                    usuarioId={caficultorId}
                    usuarioNombre={caficultor?.nombre ?? 'Caficultor'}
                    usuarioRol="seller"
                    isDemo={isDemo}
                    codigoTracking={miCodigo}
                  />
                </div>

                {/* Código agencia si está en tránsito */}
                {isAgencia && miCodigo && (
                  <div style={{ padding: '12px 14px', background: '#4a90c4' + '11', border: `1px solid ${'#4a90c4'}33`, borderRadius: 10 }}>
                    <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#4a90c4' }}>🚚 En tránsito {p.agencia?.toUpperCase()}</p>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--tw-text)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{miCodigo}</p>
                  </div>
                )}

                {/* Teléfono negocio */}
                {p.negocioTelefono && (
                  <a
                    href={`https://wa.me/${p.negocioTelefono.replace(/\D/g, '')}?text=Hola, soy el caficultor de Tunay Wasi. Tu pedido ${p.id} está listo.`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, background: '#25D36622', border: `1px solid '#25D36644'`, textDecoration: 'none' }}
                  >
                    <span style={{ fontSize: 18 }}>💬</span>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--tw-text)' }}>WhatsApp al negocio</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--tw-text-muted)' }}>{p.negocioNombre} · {p.negocioTelefono}</p>
                    </div>
                  </a>
                )}
              </div>

              {/* Footer acción */}
              {isPend && pagoOk && (
                <div style={{ padding: '16px 24px', borderTop: `1px solid var(--tw-border)`, flexShrink: 0 }}>
                  <button
                    onClick={() => { setPedidoDetalle(null); abrirDespacho(p) }}
                    style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
                  >
                    🚚 Ingresar código de agencia →
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Modal despacho por agencia */}
      {modalDespacho && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setModalDespacho(null)}>
          <div style={{ background: 'var(--tw-card)', borderRadius: 16, padding: '28px 28px 24px', maxWidth: 440, width: '100%', border: `1px solid var(--tw-border)`, fontFamily: 'Montserrat, sans-serif' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif', fontWeight: 700 }}>Despachar por agencia</h3>
              <button onClick={() => setModalDespacho(null)} style={{ background: 'none', border: 'none', color: 'var(--tw-text-muted)', fontSize: 20, cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
            </div>

            <p style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--tw-text-muted)' }}>Agencia: <span style={{ color: 'var(--tw-text)', fontWeight: 700, textTransform: 'uppercase' }}>{modalDespacho.agencia}</span></p>

            <label style={{ fontSize: 11, color: 'var(--tw-text-muted)', display: 'block', margin: '16px 0 4px' }}>Código de tracking *</label>
            <input
              value={despachoForm.codigoAgencia}
              onChange={e => setDespachoForm(prev => ({ ...prev, codigoAgencia: e.target.value }))}
              placeholder="Ej: OLV-20260917-1234"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid var(--tw-border)`, background: '#0f0f0f', color: 'var(--tw-text)', fontSize: 13, fontFamily: 'Montserrat, sans-serif', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
              autoFocus
            />

            <UploadFoto
              url={despachoForm.fotoDespacho}
              onUrl={url => setDespachoForm(prev => ({ ...prev, fotoDespacho: url }))}
              label="Foto del despacho (opcional)"
              ruta={`despachos/${caficultorId}`}
              placeholder="Foto del tracking / paquete"
              aspectRatio="4/3"
            />

            <p style={{ margin: '0 0 20px', fontSize: 11, color: 'var(--tw-text-muted)', lineHeight: 1.5 }}>
              La cafetería recibirá el código de tracking para rastrear su pedido. La calificación se habilita una vez que confirmen la recepción.
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalDespacho(null)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid var(--tw-border)`, background: 'none', color: 'var(--tw-text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={confirmarDespacho} disabled={accionando === modalDespacho.pedidoId} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: accionando === modalDespacho.pedidoId ? 'var(--tw-text-muted)' : 'var(--tw-terra)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: accionando === modalDespacho.pedidoId ? 'not-allowed' : 'pointer' }}>
                {accionando === modalDespacho.pedidoId ? 'Guardando...' : '🚚 Confirmar despacho'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal producto */}
      {modalProducto.abierto && (
        <ModalProducto
          caficultorId={caficultorId}
          caficultorNombre={nombreCaficultor}
          producto={modalProducto.editar}
          isDemo={isDemo}
          soloDni={perfilFiscal?.tipoRegistroCaficultor === 'SOLO_DNI'}
          onClose={() => setModalProducto({ abierto: false })}
          onToast={toast}
          onGuardado={(p) => {
            setProductos(prev => {
              const idx = prev.findIndex(x => x.id === p.id)
              if (idx >= 0) return prev.map(x => x.id === p.id ? p : x)
              return [p, ...prev]
            })
          }}
        />
      )}

      {/* Ficha lote evidencias (US-27) */}
      {fichaLoteId && (() => {
        const prod = productos.find(p => p.id === fichaLoteId)
        if (!prod) return null
        const rawProd = prod as any
        const nivel: 1 | 2 | 3 = rawProd.nivelEvidencia ?? 1

        const NIVELES = [
          { n: 1, label: 'N1 Básico', color: '#6495ED', desc: 'Fotos del lote, declaración de origen' },
          { n: 2, label: 'N2 Certificados', color: '#6495ED', desc: 'Padrón rural, certificados intermedios' },
          { n: 3, label: 'N3 Orgánico', color: 'var(--tw-terra)', desc: 'Certificación orgánica, informe SCA' },
        ]

        const NIVEL_LABELS: Record<NivelEvidencia, string> = {
          N1: 'N1 — Descripción sensorial / fotos',
          N2: 'N2 — Informe Q-Grader',
          N3: 'N3 — Certificado Q-Grader',
        }

        const ESTADO_COLOR: Record<string, string> = {
          PENDING_REVIEW: '#f59e0b',
          APPROVED: 'var(--tw-sage)',
          REJECTED: '#e74c3c',
          DISPUTED: '#9b59b6',
        }

        const ESTADO_LABEL: Record<string, string> = {
          PENDING_REVIEW: 'En revisión',
          APPROVED: 'Aprobada',
          REJECTED: 'Rechazada',
          DISPUTED: 'En disputa',
        }

        async function handleEvidenciaFile(file: File) {
          if (evidenciaSubiendo) return
          setEvidenciaSubiendo(true)
          try {
            const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
            const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
            const esPdf = file.type === 'application/pdf'
            const resourceType = esPdf ? 'raw' : 'image'
            const fd = new FormData()
            fd.append('file', file)
            fd.append('upload_preset', uploadPreset)
            fd.append('folder', 'one_evidencias')
            const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, { method: 'POST', body: fd })
            const data = await res.json()
            if (!data.secure_url) throw new Error(data.error?.message ?? 'Cloudinary upload failed')
            const archivoUrl: string = data.secure_url
            const archivoTipo: 'imagen' | 'pdf' = esPdf ? 'pdf' : 'imagen'
            const caficultorNombre = caficultor?.nombre ?? caficultorId
            await crearEvidencia({
              productoId: fichaLoteId!,
              productoNombre: prod!.nombre,
              caficultorId,
              caficultorNombre,
              nivel: evidenciaNivelSel,
              titulo: `${NIVEL_LABELS[evidenciaNivelSel]} — ${prod!.nombre}`,
              archivoUrl,
              archivoTipo,
            })
            // Recargar lista
            const evs = await fetchEvidenciasByProducto(fichaLoteId!)
            setFichaEvidencias(evs)
            setEvidenciaMostrarSelector(false)
            toast('Evidencia subida — pendiente de revisión', 'ok')
          } catch (e) {
            toast('Error al subir evidencia: ' + (e instanceof Error ? e.message : 'intenta de nuevo'), 'error')
          } finally {
            setEvidenciaSubiendo(false)
            if (evidenciaInputRef.current) evidenciaInputRef.current.value = ''
          }
        }

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex' }} onClick={() => { setFichaLoteId(null); setEvidenciaMostrarSelector(false) }}>
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.75)' }} />
            <div
              style={{ width: 'min(500px, 100vw)', background: 'var(--tw-card)', borderLeft: `1px solid var(--tw-border)`, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid var(--tw-border)`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: 10, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ficha del lote · Estado evidencias</p>
                  <h2 style={{ margin: '0 0 2px', fontSize: 20, fontFamily: 'Cormorant Garamond, serif', color: 'var(--tw-text)', fontWeight: 700 }}>{prod.nombre}</h2>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--tw-text-muted)' }}>{prod.variedad} · {prod.cosecha || '—'}</p>
                </div>
                <button onClick={() => { setFichaLoteId(null); setEvidenciaMostrarSelector(false) }} style={{ background: 'none', border: 'none', color: 'var(--tw-text-muted)', fontSize: 22, cursor: 'pointer', padding: '0 0 0 16px', lineHeight: 1 }}>×</button>
              </div>

              <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Barra de progreso N1→N2→N3 */}
                <div>
                  <p style={{ margin: '0 0 12px', fontSize: 11, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Nivel de trazabilidad</p>
                  <div style={{ display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', height: 8 }}>
                    {NIVELES.map(({ n, color }) => (
                      <div key={n} style={{ flex: 1, background: n <= nivel ? color : 'var(--tw-border)', transition: 'background 0.3s' }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    {NIVELES.map(({ n, label, color, desc }) => {
                      const activo = n <= nivel
                      const actual = n === nivel
                      return (
                        <div key={n} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: `1px solid ${actual ? color + '88' : 'var(--tw-border)'}`, background: actual ? color + '11' : 'transparent' }}>
                          <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: activo ? color : 'var(--tw-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {activo ? '✓' : '○'} {label}
                          </p>
                          <p style={{ margin: 0, fontSize: 9, color: 'var(--tw-text-muted)', lineHeight: 1.4 }}>{desc}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Tabla de evidencias desde Firestore */}
                <div>
                  <p style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Documentos adjuntos</p>
                  {fichaEvidenciasLoading ? (
                    <div style={{ padding: '20px', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--tw-text-muted)' }}>Cargando evidencias...</p>
                    </div>
                  ) : fichaEvidencias.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', border: `1px dashed var(--tw-border)`, borderRadius: 10 }}>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--tw-text-muted)' }}>Aún no hay evidencias adjuntas</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {fichaEvidencias.map((ev) => (
                        <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'var(--tw-bg)', border: `1px solid var(--tw-border)` }}>
                          <span style={{ fontSize: 18 }}>{ev.archivoTipo === 'pdf' ? '📄' : '🖼️'}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 600, color: 'var(--tw-text)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{ev.nivel} — {ev.titulo}</p>
                            <p style={{ margin: 0, fontSize: 10, color: ESTADO_COLOR[ev.estado] ?? 'var(--tw-text-muted)' }}>{ESTADO_LABEL[ev.estado] ?? ev.estado}</p>
                          </div>
                          <a href={ev.archivoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--tw-terra)', textDecoration: 'none', flexShrink: 0 }}>Ver →</a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Panel de beneficios del siguiente nivel */}
                {nivel < 3 && (
                  <div style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--tw-sage)0A', border: `1px solid var(--tw-sage)33` }}>
                    <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'var(--tw-sage)' }}>
                      Sube a N{nivel + 1} y desbloqueas:
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--tw-text-muted)', lineHeight: 1.6 }}>
                      {nivel === 1
                        ? 'Precio negociable y mayor visibilidad en el catálogo B2B.'
                        : 'Acceso a compradores premium, certificación orgánica y cotizaciones con SCA.'}
                    </p>
                  </div>
                )}

                {/* Selector de nivel + botón agregar evidencia */}
                {!isDemo && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {evidenciaMostrarSelector && (
                      <div style={{ padding: '14px 16px', borderRadius: 10, border: `1px solid var(--tw-border)`, background: 'var(--tw-bg)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--tw-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Selecciona el nivel de evidencia</p>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {(['N1', 'N2', 'N3'] as NivelEvidencia[]).map(n => (
                            <button
                              key={n}
                              onClick={() => setEvidenciaNivelSel(n)}
                              style={{
                                flex: 1, padding: '8px 0', borderRadius: 8,
                                border: `1px solid ${evidenciaNivelSel === n ? 'var(--tw-terra)' : 'var(--tw-border)'}`,
                                background: evidenciaNivelSel === n ? 'var(--tw-terra)22' : 'transparent',
                                color: evidenciaNivelSel === n ? 'var(--tw-terra)' : 'var(--tw-text-muted)',
                                fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
                                transition: 'all 0.15s',
                              }}
                            >{n}</button>
                          ))}
                        </div>
                        <p style={{ margin: 0, fontSize: 10, color: 'var(--tw-text-muted)', lineHeight: 1.5 }}>
                          {evidenciaNivelSel === 'N1' && 'Foto del lote o descripción sensorial (imagen o PDF).'}
                          {evidenciaNivelSel === 'N2' && 'Informe de catación Q-Grader (imagen o PDF).'}
                          {evidenciaNivelSel === 'N3' && 'Certificado oficial Q-Grader (imagen o PDF).'}
                        </p>
                        <button
                          onClick={() => evidenciaInputRef.current?.click()}
                          disabled={evidenciaSubiendo}
                          style={{
                            padding: '10px 0', borderRadius: 8, border: `1px solid var(--tw-terra)`,
                            background: 'var(--tw-terra)', color: '#fff', fontSize: 12, fontWeight: 700,
                            cursor: evidenciaSubiendo ? 'wait' : 'pointer', fontFamily: 'Montserrat, sans-serif',
                            opacity: evidenciaSubiendo ? 0.7 : 1,
                          }}
                        >
                          {evidenciaSubiendo ? 'Subiendo...' : 'Seleccionar archivo (imagen o PDF)'}
                        </button>
                        <button
                          onClick={() => setEvidenciaMostrarSelector(false)}
                          style={{ padding: '6px 0', borderRadius: 8, border: `1px solid var(--tw-border)`, background: 'none', color: 'var(--tw-text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
                        >Cancelar</button>
                      </div>
                    )}

                    {!evidenciaMostrarSelector && (
                      <button
                        onClick={() => setEvidenciaMostrarSelector(true)}
                        style={{ padding: '14px 0', borderRadius: 10, border: `1px solid var(--tw-terra)`, background: 'var(--tw-terra)11', color: 'var(--tw-terra)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
                      >
                        + Agregar evidencia N1 / N2 / N3
                      </button>
                    )}

                    {/* Input oculto */}
                    <input
                      ref={evidenciaInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleEvidenciaFile(f) }}
                    />
                  </div>
                )}

              </div>
            </div>
          </div>
        )
      })()}

      <Toast msgs={toasts} onRemove={id => setToasts(prev => prev.filter(t => t.id !== id))} />

    </div>
  )
}

export default PortalCaficultor
