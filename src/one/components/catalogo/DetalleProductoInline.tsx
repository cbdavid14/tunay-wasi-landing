import React, { useState } from 'react'
import type { ProductoONE, FormatoONE } from '../../types'
import { PROCESO_BADGE, FORMATOS_DETALLE } from './catalogoData'

interface Props {
  producto: ProductoONE
  productos: ProductoONE[]
  formato: string
  cantidad: number
  toastMsg: string | null
  onVolver: () => void
  onSetFormato: (f: string) => void
  onSetCantidad: React.Dispatch<React.SetStateAction<number>>
  onAgregar: (p: ProductoONE, formato: FormatoONE) => void
  onVerOtro: (p: ProductoONE) => void
  rolUsuario?: string | null
  estadoAprobacionB2B?: string | null
  userUid?: string | null
  onSolicitarCotizacion?: (p: ProductoONE) => void
  onRegistrarNegocio?: () => void
}

// ── Helpers de badges ──────────────────────────────────────────────────────────

function tipoBadge(tipoCafe: string | undefined, productType: string | undefined) {
  const t = productType ?? tipoCafe
  if (!t) return null
  if (t === 'TYPE_A' || t === 'verde')
    return { label: '🌿 Grano verde', bg: 'rgba(143,175,138,.15)', color: '#8faf8a', border: 'rgba(143,175,138,.3)' }
  if (t === 'TYPE_B' || t === 'tostado')
    return { label: '☕ Tostado en grano', bg: 'rgba(192,128,48,.15)', color: '#d4a800', border: 'rgba(192,128,48,.3)' }
  if (t === 'TYPE_C' || t === 'molido')
    return { label: '🫘 Tostado y molido', bg: 'rgba(201,110,75,.15)', color: '#c96e4b', border: 'rgba(201,110,75,.3)' }
  return null
}

function calidadBadge(calidad: string | undefined, puntaje: number | undefined) {
  const c = calidad ?? (puntaje && puntaje >= 90 ? 'excepcional' : puntaje && puntaje >= 85 ? 'muy-bueno' : puntaje && puntaje >= 80 ? 'bueno' : undefined)
  if (!c) return null
  if (c === 'excepcional' || c === 'Excepcional')
    return { label: 'Excepcional', bg: 'rgba(245,197,78,.18)', color: '#d4a800', border: 'rgba(245,197,78,.4)' }
  if (c === 'muy-bueno' || c === 'Muy bueno')
    return { label: 'Muy bueno', bg: 'rgba(201,110,75,.15)', color: '#e8956b', border: 'rgba(201,110,75,.35)' }
  return { label: 'Bueno', bg: 'rgba(143,175,138,.2)', color: '#8faf8a', border: 'rgba(143,175,138,.4)' }
}

// Presentación legible para la tabla de datos
function presentacionLabel(tipoCafe: string | undefined, productType: string | undefined): string | null {
  const t = productType ?? tipoCafe
  if (t === 'TYPE_A' || t === 'verde') return '🌿 Grano verde · sin tostar'
  if (t === 'TYPE_B' || t === 'tostado') return '☕ Tostado en grano'
  if (t === 'TYPE_C' || t === 'molido') return '🫘 Tostado y molido'
  return null
}

export const DetalleProductoInline: React.FC<Props> = ({
  producto,
  productos,
  formato,
  cantidad,
  toastMsg,
  onVolver,
  onSetFormato,
  onSetCantidad,
  onAgregar,
  onVerOtro,
  rolUsuario = null,
  estadoAprobacionB2B = null,
  userUid = null,
  onSolicitarCotizacion,
  onRegistrarNegocio,
}) => {
  const [imgIdx, setImgIdx] = useState(0)
  const [cantidadKgVerde, setCantidadKgVerde] = useState(10)

  const proc = PROCESO_BADGE[(producto.proceso || '').toLowerCase()] ?? {
    bg: 'var(--tw-card)', color: 'var(--tw-text-muted)', border: 'var(--tw-border)', label: producto.proceso,
  }
  const crossSelling = productos
    .filter((p: ProductoONE) => p.caficultorId === producto.caficultorId && p.id !== producto.id)
    .slice(0, 6)
  const precioKg = producto.precioBaseKgCents / 100
  const fmtActual = FORMATOS_DETALLE.find(f => f.key === formato) ?? FORMATOS_DETALLE[2]
  const precioUnitario = precioKg * fmtActual.kgFactor
  const precioTotal = precioUnitario * cantidad
  const kgLabel = `${(fmtActual.kgFactor * cantidad).toLocaleString('es', { maximumFractionDigits: 2 })} kg`

  /* miniaturas: si hay fotos reales las usamos, si no generamos 4 slots con emoji */
  const fotos: string[] = producto.fotos && producto.fotos.length > 0 ? producto.fotos : []
  const totalSlots = Math.max(fotos.length, 4)
  const getSlot = (i: number) => fotos[i] ?? null

  const goImg = (dir: 1 | -1) => setImgIdx(prev => (prev + dir + totalSlots) % totalSlots)

  // ── Badges de tipo y calidad ──────────────────────────────────────────────────
  const tipoBadgeInfo = tipoBadge((producto as any).tipoCafe, (producto as any).productType)
  const calidadBadgeInfo = calidadBadge((producto as any).calidad, producto.puntajeReferencial)
  const presentacion = presentacionLabel((producto as any).tipoCafe, (producto as any).productType)

  // ── Reglas de negocio §7 (PR) + §2 (TIPO-01) ────────────────────────────────
  const esNegociable    = producto.pricingMode === 'NEGOTIABLE'
  const esTipoA         = (producto as any).tipoCafe === 'verde' ||
                           (producto as any).productType === 'TYPE_A'
  const esB2bAprobado   = rolUsuario === 'buyer_b2b' && estadoAprobacionB2B === 'APPROVED'
  const esB2bPendiente  = rolUsuario === 'buyer_b2b' && estadoAprobacionB2B !== 'APPROVED'
  // El caficultor dueño del producto puede ver sus propios datos técnicos
  const esPropietario   = !!userUid && userUid === producto.caficultorId
  // Puede ver datos técnicos B2B: buyer_b2b aprobado O el dueño del producto
  const puedeVerDatosTecnicos = esB2bAprobado || esPropietario
  // Acciones comerciales bloqueadas: NEGOTIABLE sin aprobación, o TYPE_A sin aprobación B2B
  const bloqueadoNeg    = esNegociable && !esB2bAprobado
  const bloqueadoTipoA  = esTipoA && !esB2bAprobado
  const ocultarFormatos = bloqueadoNeg || bloqueadoTipoA

  // ── Precios mayoristas TYPE_A (escala por volumen) ────────────────────────────
  const kgDisp = producto.kgDisponibles ?? 0
  const kgMinVerde = (producto as any).kgMinPedido ?? 5
  const tramosVerde = [
    { rango: `≥ ${kgMinVerde} kg (fracción)`, precio: precioKg * 0.75, min: kgMinVerde },
    { rango: `≥ 20 kg (medio lote)`,           precio: precioKg * 0.67, min: 20 },
    { rango: `${kgDisp} kg (lote completo)`,   precio: precioKg * 0.58, min: kgDisp },
  ]
  const tramoActivo = [...tramosVerde].reverse().find(t => cantidadKgVerde >= t.min) ?? tramosVerde[0]
  const subtotalVerde = tramoActivo.precio * cantidadKgVerde

  const datosProducto = ([
    { label: 'Presentación',   value: presentacion,                                                   color: undefined },
    { label: 'Proceso',        value: proc.label,                                                     color: proc.color },
    { label: 'Altitud',        value: producto.altitudMsnm ? `${producto.altitudMsnm.toLocaleString()} msnm` : null, color: undefined },
    { label: 'Variedad',       value: producto.variedad,                                              color: undefined },
    { label: 'Cosecha',        value: producto.cosecha ? `Campaña ${producto.cosecha}` : null,        color: undefined },
  ] as Array<{ label: string; value: string | null | undefined; color: string | undefined }>).filter(r => r.value)

  return (
    <div style={{ fontFamily: 'Montserrat, sans-serif', padding: '0 0 60px', width: '100%' }}>
      <style>{`
        .detalle-inline-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 32px;
          align-items: flex-start;
        }
        .detalle-inline-panel { position: sticky; top: calc(var(--header-h, 52px) + 16px); }
        .sim-toast {
          position: fixed; bottom: 20px; right: 20px;
          background: var(--tw-card); border: 1px solid var(--tw-border);
          border-radius: 10px; padding: 10px 16px; font-size: 11px; font-weight: 600;
          color: var(--tw-text); box-shadow: 0 4px 20px rgba(0,0,0,.25); z-index: 999;
        }
        .detalle-thumb {
          width: 64px; height: 64px; border-radius: 8px; border: 2px solid transparent;
          cursor: pointer; overflow: hidden; flex-shrink: 0;
          background: linear-gradient(145deg,#fdf8f4,#f0e6d8);
          display: flex; align-items: center; justify-content: center;
          transition: border-color .15s;
        }
        .detalle-thumb.active { border-color: var(--tw-terra); }
        .detalle-thumb:hover:not(.active) { border-color: var(--tw-border); }
        .lot-state-banner { display:flex; align-items:center; gap:10px; border-radius:9px; padding:10px 14px; margin-bottom:16px; font-size:12px; font-weight:600; }
        .lot-state-paused { background:rgba(192,128,48,.1); border:1px solid rgba(192,128,48,.35); color:#d4a800; }
        .lot-state-sold-out { background:rgba(100,100,100,.1); border:1px solid rgba(120,120,120,.35); color:#888; }
        .lot-state-available { background:rgba(90,128,96,.1); border:1px solid rgba(90,128,96,.35); color:#8faf8a; }
        .badge-tipo { font-size:9px; font-weight:700; padding:3px 8px; border-radius:4px; display:inline-block; }
        .badge-proceso { font-size:9px; font-weight:700; padding:3px 8px; border-radius:4px; display:inline-block; }
        .badge-calidad { font-size:9px; font-weight:700; padding:3px 8px; border-radius:5px; display:inline-block; }
        .tramo-verde { display:flex; justify-content:space-between; align-items:center; padding:5px 9px; border-radius:7px; margin-bottom:4px; cursor:pointer; border:1px solid transparent; transition: background .1s; }
        .tramo-verde.activo { border:1px solid rgba(192,128,48,.35); background:rgba(192,128,48,.1); }
        .chip-kg { padding:3px 9px; border-radius:6px; border:1px solid var(--tw-border); background:transparent; color:var(--tw-text-muted); font-size:9px; font-weight:600; cursor:pointer; transition: background .1s; }
        .chip-kg.activo { border:1px solid var(--tw-terra); background:var(--tw-terra); color:#fff; }
        @media (max-width: 700px) {
          .detalle-inline-grid { display: block; }
          .detalle-inline-panel { position: static; margin-top: 20px; }
          .sim-toast { bottom: 72px; }
          .detalle-thumbs-col { display: none !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1380, margin: '0 auto', padding: '0 18px', width: '100%', boxSizing: 'border-box' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingTop: 4 }}>
          <button onClick={onVolver} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tw-terra)', fontSize: 13, fontWeight: 700, padding: 0, fontFamily: 'Montserrat, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
            ← Catálogo
          </button>
          <span style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>›</span>
          <span style={{ fontSize: 11, color: 'var(--tw-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>{producto.nombre}</span>
        </div>

        {/* Banner LotStatus — según estado del lote (PAUSED / SOLD_OUT / AVAILABLE) */}
        {producto.status === 'pausado' && (
          <div className="lot-state-banner lot-state-paused">
            <span style={{ fontSize: 20 }}>⏸</span>
            <div>
              <div style={{ fontWeight: 700 }}>No disponible temporalmente</div>
              <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', marginTop: 2 }}>El caficultor pausó este lote. Puedes explorarlo sin comprar.</div>
            </div>
          </div>
        )}
        {producto.status === 'agotado' && (
          <div className="lot-state-banner lot-state-sold-out">
            <span style={{ fontSize: 20 }}>🔒</span>
            <div>
              <div style={{ fontWeight: 700 }}>Agotado</div>
              <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', marginTop: 2 }}>Este lote ya no tiene stock disponible.</div>
            </div>
          </div>
        )}

        {/* Grid 2 columnas */}
        <div className="detalle-inline-grid">

          {/* ── COLUMNA IZQUIERDA ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>

            {/* Galería: miniaturas verticales + imagen principal */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>

              {/* Miniaturas verticales */}
              <div className="detalle-thumbs-col" style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                {Array.from({ length: totalSlots }).map((_, i) => {
                  const src = getSlot(i)
                  return (
                    <div key={i} className={`detalle-thumb${imgIdx === i ? ' active' : ''}`} onClick={() => setImgIdx(i)}>
                      {src
                        ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 24 }}>☕</span>
                      }
                    </div>
                  )
                })}
              </div>

              {/* Imagen principal + botones ‹ › */}
              <div style={{ flex: 1, position: 'relative', background: 'linear-gradient(145deg,#fdf8f4,#f0e6d8)', borderRadius: 12, overflow: 'hidden', aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
                {getSlot(imgIdx)
                  ? <img src={getSlot(imgIdx)!} alt={producto.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                  : <span style={{ fontSize: 100, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,.12))' }}>☕</span>
                }
                {/* Badge TIPO — arriba izquierda (TIPO-VIS-01) */}
                {tipoBadgeInfo && (
                  <span className="badge-tipo" style={{ position: 'absolute', top: 10, left: 10, background: tipoBadgeInfo.bg, color: tipoBadgeInfo.color, border: `1px solid ${tipoBadgeInfo.border}` }}>
                    {tipoBadgeInfo.label}
                  </span>
                )}
                {/* Badge PROCESO + CALIDAD — arriba derecha (TIPO-VIS-02) */}
                <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span className="badge-proceso" style={{ background: proc.bg, color: proc.color, border: `1px solid ${proc.border}` }}>{proc.label}</span>
                  {calidadBadgeInfo && (
                    <span className="badge-calidad" style={{ background: calidadBadgeInfo.bg, color: calidadBadgeInfo.color, border: `1px solid ${calidadBadgeInfo.border}` }}>{calidadBadgeInfo.label}</span>
                  )}
                </div>
                {/* Botones carrusel */}
                <button onClick={() => goImg(-1)} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(0,0,0,.12)', background: 'rgba(255,255,255,.85)', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tw-text)' }}>‹</button>
                <button onClick={() => goImg(1)}  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(0,0,0,.12)', background: 'rgba(255,255,255,.85)', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tw-text)' }}>›</button>
                {/* Dots */}
                <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5 }}>
                  {Array.from({ length: totalSlots }).map((_, i) => (
                    <div key={i} onClick={() => setImgIdx(i)} style={{ width: imgIdx === i ? 18 : 7, height: 7, borderRadius: imgIdx === i ? 4 : '50%', background: imgIdx === i ? 'var(--tw-terra)' : 'rgba(255,255,255,.7)', cursor: 'pointer', transition: 'width .15s' }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Título + badges */}
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, fontWeight: 700, color: 'var(--tw-text)', lineHeight: 1.2, marginBottom: 8 }}>{producto.nombre}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {tipoBadgeInfo && (
                  <span className="badge-tipo" style={{ background: tipoBadgeInfo.bg, color: tipoBadgeInfo.color, border: `1px solid ${tipoBadgeInfo.border}` }}>{tipoBadgeInfo.label}</span>
                )}
                <span className="badge-proceso" style={{ background: proc.bg, color: proc.color, border: `1px solid ${proc.border}` }}>{proc.label}</span>
                {calidadBadgeInfo && (
                  <span className="badge-calidad" style={{ background: calidadBadgeInfo.bg, color: calidadBadgeInfo.color, border: `1px solid ${calidadBadgeInfo.border}` }}>{calidadBadgeInfo.label}</span>
                )}
                {/* INV-04: SCA solo para buyer_b2b APPROVED o dueño del producto */}
                {puedeVerDatosTecnicos && producto.puntajeReferencial && (
                  <span style={{ background: 'rgba(201,110,75,.12)', color: 'var(--tw-terra)', border: '1px solid rgba(201,110,75,.25)', fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 4 }}>SCA {producto.puntajeReferencial}</span>
                )}
              </div>
              {producto.kgDisponibles != null && producto.kgDisponibles > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--tw-sage)', flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>{producto.kgDisponibles} kg disponibles</span>
                </div>
              )}
            </div>

            {/* ── BANNER INFO TYPE_A para B2C (VERDE-01) ── */}
            {esTipoA && !puedeVerDatosTecnicos && (
              <div style={{ background: 'rgba(143,175,138,.08)', border: '1px solid rgba(143,175,138,.25)', borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>🌿</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tw-sage)', marginBottom: 3 }}>Café verde · Grano sin tostar</div>
                  <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', lineHeight: 1.5 }}>
                    Este lote está pensado para tostadores y cafeterías. Si buscas café listo para preparar,{' '}
                    <span style={{ color: 'var(--tw-terra)', fontWeight: 600, cursor: 'pointer' }} onClick={onVolver}>ver café tostado →</span>
                  </div>
                </div>
              </div>
            )}

            {/* Datos del producto (proceso, altitud, variedad, cosecha, Presentación) */}
            <div style={{ background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--tw-text-muted)', marginBottom: 10 }}>Datos del producto</div>
              {datosProducto.map((r, i) => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: i < datosProducto.length - 1 ? 8 : 0, marginBottom: i < datosProducto.length - 1 ? 8 : 0, borderBottom: i < datosProducto.length - 1 ? '1px solid var(--tw-border)' : 'none' }}>
                  <span style={{ fontSize: 11, color: 'var(--tw-text-muted)' }}>{r.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: r.color ?? 'var(--tw-text)' }}>{r.value}</span>
                </div>
              ))}
              {/* Fracción mínima — solo TYPE_A */}
              {esTipoA && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, marginTop: 8, borderTop: '1px solid var(--tw-border)' }}>
                  <span style={{ fontSize: 11, color: 'var(--tw-text-muted)' }}>Fracción mínima</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: puedeVerDatosTecnicos ? 'var(--tw-sage)' : 'var(--tw-text-muted)' }}>
                    {puedeVerDatosTecnicos ? `${kgMinVerde} kg` : '🔒 Solo para negocios'}
                  </span>
                </div>
              )}
              {/* Ficha técnica B2B — INV-04/CAL-02 — solo TYPE_A (café verde) */}
              {esTipoA && puedeVerDatosTecnicos && (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--tw-border)' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--tw-sage)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                    📋 Ficha técnica
                    <span style={{ fontSize: 7, color: 'var(--tw-sage)', background: 'rgba(143,175,138,.12)', border: '1px solid rgba(143,175,138,.25)', borderRadius: 3, padding: '1px 5px' }}>Solo para negocios</span>
                  </div>
                  {[
                    { label: 'Puntaje SCA', value: producto.puntajeReferencial ? `${producto.puntajeReferencial} pts` : null },
                    { label: 'Humedad',     value: (producto as any).humedad ? `${(producto as any).humedad}%` : '11–12%' },
                    { label: 'Rendimiento', value: (producto as any).rendimiento ? `${(producto as any).rendimiento}%` : null },
                    { label: 'Criba',       value: (producto as any).criba ?? null },
                  ].filter(r => r.value).map((r, i, arr) => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: i < arr.length - 1 ? 6 : 0, marginBottom: i < arr.length - 1 ? 6 : 0, borderBottom: i < arr.length - 1 ? '1px solid var(--tw-border)' : 'none' }}>
                      <span style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>{r.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-sage)' }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              )}
              {esTipoA && !puedeVerDatosTecnicos && (
                <div style={{ marginTop: 10, fontSize: 9, color: 'var(--tw-text-muted)', fontStyle: 'italic', padding: '6px 8px', background: 'rgba(143,175,138,.06)', border: '1px solid rgba(143,175,138,.15)', borderRadius: 5 }}>
                  🔒 Ficha técnica disponible para compradores B2B verificados
                </div>
              )}
            </div>

            {/* Notas de cata */}
            {producto.notasSabor && producto.notasSabor.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--tw-text-muted)', marginBottom: 6 }}>Notas de cata</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {producto.notasSabor.map((nota, i) => (
                    <span key={i} style={{ background: 'rgba(201,110,75,.1)', border: '1px solid rgba(201,110,75,.2)', borderRadius: 10, padding: '3px 9px', fontSize: 9, color: 'var(--tw-terra)', fontWeight: 600 }}>{nota}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Historia */}
            {producto.descripcion && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--tw-text-muted)', marginBottom: 6 }}>Historia del café</div>
                <p style={{ fontSize: 11, color: 'var(--tw-text-muted)', lineHeight: 1.65, margin: 0 }}>{producto.descripcion}</p>
              </div>
            )}
          </div>

          {/* ── COLUMNA DERECHA: panel sticky ── */}
          <div className="detalle-inline-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* ══ PANEL TYPE_A — VISTA B2C (sin aprobación y no es el dueño) ══ */}
            {esTipoA && !puedeVerDatosTecnicos && (
              <>
                {/* Precio referencial bloqueado */}
                <div style={{ background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 12, padding: '16px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--tw-text-muted)', marginBottom: 8 }}>Precio</div>
                  {esNegociable ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, fontWeight: 800, color: 'var(--tw-text-muted)' }}>A negociar</span>
                      <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(192,128,48,.12)', color: '#d4a800', border: '1px solid rgba(192,128,48,.3)', borderRadius: 4, padding: '2px 7px' }}>PRECIO A NEGOCIAR</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 26, fontWeight: 800, color: 'var(--tw-terra)' }}>S/ {precioKg.toFixed(2)}</span>
                      <span style={{ fontSize: 11, color: 'var(--tw-text-muted)' }}>/kg · precio retail</span>
                    </div>
                  )}
                  <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', background: 'rgba(201,110,75,.06)', borderRadius: 6, padding: '6px 9px', border: '1px solid rgba(201,110,75,.15)', marginBottom: 14 }}>
                    🔒 {esNegociable ? 'Precio a negociar · Solo para' : 'Precio mayorista disponible solo para'} <strong style={{ color: 'var(--tw-terra)' }}>negocios verificados</strong>
                  </div>
                  <div style={{ background: 'rgba(143,175,138,.06)', border: '1px solid rgba(143,175,138,.2)', borderRadius: 10, padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tw-sage)', marginBottom: 4 }}>¿Eres tostador o cafetería?</div>
                    <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', marginBottom: 12, lineHeight: 1.5 }}>Regístrate como negocio para ver precios mayoristas, ficha técnica completa y comprar por fracción de lote.</div>
                    <button
                      onClick={onRegistrarNegocio}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: 'none', background: 'var(--tw-sage)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
                    >Registrar mi negocio →</button>
                    <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', marginTop: 8 }}>
                      ¿Ya tienes cuenta? <span style={{ color: 'var(--tw-terra)', fontWeight: 600, cursor: 'pointer' }}>Iniciar sesión</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ══ PANEL TYPE_A — VISTA B2B APROBADO o dueño del producto ══ */}
            {esTipoA && puedeVerDatosTecnicos && (
              <>
                {/* Badge acceso verificado */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(143,175,138,.1)', border: '1px solid rgba(143,175,138,.3)', borderRadius: 7, padding: '6px 11px' }}>
                  <span style={{ fontSize: 11 }}>✓</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-sage)' }}>
                    {esPropietario ? 'Tu producto · Vista del productor' : 'Acceso verificado · buyer_b2b'}
                  </span>
                </div>

                {/* NEGOTIABLE: mostrar precio de referencia + CTA cotización en lugar de precios fijos */}
                {esNegociable ? (
                  <div style={{ background: 'var(--tw-card)', border: '1px solid rgba(192,128,48,.3)', borderRadius: 12, padding: '14px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--tw-text-muted)', marginBottom: 10 }}>Precio</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 800, color: 'var(--tw-text-muted)' }}>A negociar</span>
                      <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(192,128,48,.12)', color: '#d4a800', border: '1px solid rgba(192,128,48,.3)', borderRadius: 4, padding: '2px 7px' }}>PRECIO A NEGOCIAR</span>
                    </div>
                    {/* Precio de referencia — permite al comprador saber por dónde empezar */}
                    <div style={{ background: 'rgba(242,224,204,.1)', border: '1px solid rgba(242,224,204,.25)', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
                      <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Precio de referencia</div>
                      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, fontWeight: 800, color: '#f2e0cc', lineHeight: 1 }}>S/ {precioKg.toFixed(0)}/kg</div>
                      <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', marginTop: 4 }}>Puedes proponer un precio diferente</div>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
                      El caficultor definirá el precio final según el volumen, calidad y condiciones del acuerdo.
                    </div>
                    <button
                      onClick={() => onSolicitarCotizacion?.(producto)}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'Montserrat, sans-serif' }}
                    >
                      <span>Solicitar cotización</span>
                      <span style={{ fontWeight: 800 }}>→</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Precios mayoristas por volumen (solo para FIXED) */}
                    <div style={{ background: 'var(--tw-card)', border: '1px solid rgba(192,128,48,.3)', borderRadius: 12, padding: '14px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--tw-text-muted)', marginBottom: 10 }}>Precio mayorista</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {tramosVerde.map(t => {
                          const activo = cantidadKgVerde >= t.min
                          return (
                            <div key={t.rango} className={`tramo-verde${activo ? ' activo' : ''}`} onClick={() => setCantidadKgVerde(t.min)} style={{ background: activo ? 'rgba(192,128,48,.1)' : 'transparent' }}>
                              <span style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>{t.rango}</span>
                              <span style={{ fontSize: 14, fontWeight: 800, color: '#d4a800', fontFamily: 'Cormorant Garamond, serif' }}>S/ {t.precio.toFixed(0)}/kg</span>
                            </div>
                          )
                        })}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 9, color: 'var(--tw-text-muted)' }}>Precio retail referencial: S/ {precioKg.toFixed(0)}/kg</div>
                    </div>

                    {/* Selector de cantidad en kg */}
                    <div style={{ background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 12, padding: '14px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--tw-text-muted)', marginBottom: 10 }}>Cantidad a pedir</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid var(--tw-border)', borderRadius: 9, overflow: 'hidden' }}>
                          <button onClick={() => setCantidadKgVerde(c => Math.max(kgMinVerde, c - kgMinVerde))} style={{ width: 36, height: 36, border: 'none', background: 'transparent', color: 'var(--tw-text)', fontSize: 18, cursor: 'pointer' }}>−</button>
                          <span style={{ width: 52, textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--tw-text)', background: 'var(--tw-bg)' }}>{cantidadKgVerde}</span>
                          <button onClick={() => setCantidadKgVerde(c => Math.min(kgDisp, c + kgMinVerde))} style={{ width: 36, height: 36, border: 'none', background: 'transparent', color: 'var(--tw-text)', fontSize: 18, cursor: 'pointer' }}>+</button>
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--tw-text-muted)' }}>kg</span>
                        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                          <div style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>Subtotal</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: '#d4a800', fontFamily: 'Cormorant Garamond, serif' }}>S/ {subtotalVerde.toFixed(2)}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {[kgMinVerde, 10, 20, kgDisp].filter((v, i, a) => a.indexOf(v) === i && v <= kgDisp).map(kg => (
                          <button key={kg} className={`chip-kg${cantidadKgVerde === kg ? ' activo' : ''}`} onClick={() => setCantidadKgVerde(kg)}>
                            {kg === kgDisp ? `${kg} kg · Lote completo` : `${kg} kg`}
                          </button>
                        ))}
                      </div>
                      <div style={{ marginTop: 7, fontSize: 9, color: 'var(--tw-text-muted)' }}>Mínimo: {kgMinVerde} kg · Disponible: {kgDisp} kg</div>
                    </div>

                    {/* CTA verde */}
                    <button
                      onClick={() => onAgregar(producto, '1kg')}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'Montserrat, sans-serif' }}
                    >
                      <span>Agregar al pedido · {cantidadKgVerde} kg</span>
                      <span style={{ fontWeight: 800 }}>S/ {subtotalVerde.toFixed(2)}</span>
                    </button>
                  </>
                )}
              </>
            )}

            {/* ══ PANEL ESTÁNDAR (TYPE_B / TYPE_C) ══ */}
            {!esTipoA && (
              <div style={{ background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 12, padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>

                {/* Precio principal */}
                <div style={{ marginBottom: 10 }}>
                  {esNegociable ? (
                    <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 800, color: 'var(--tw-text-muted)' }}>Precio negociable</span>
                  ) : (
                    <>
                      <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 800, color: 'var(--tw-terra)' }}>S/ {precioUnitario.toFixed(2)}</span>
                      <span style={{ fontSize: 11, color: 'var(--tw-text-muted)', marginLeft: 4 }}>/ {fmtActual.label}</span>
                    </>
                  )}
                </div>

                {/* Selector formato + cantidad: solo si hay acción comercial */}
                {!ocultarFormatos && (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--tw-text-muted)', marginBottom: 6 }}>Selecciona el formato</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                      {FORMATOS_DETALLE.map(f => (
                        <button key={f.key} type="button" onClick={() => onSetFormato(f.key)} style={{
                          padding: '5px 10px', borderRadius: 7, cursor: 'pointer',
                          border: `1px solid ${formato === f.key ? 'var(--tw-terra)' : 'var(--tw-border)'}`,
                          background: formato === f.key ? 'var(--tw-terra)' : 'var(--tw-card)',
                          color: formato === f.key ? '#fff' : 'var(--tw-text-muted)',
                          fontSize: 10, fontWeight: 600, fontFamily: 'Montserrat, sans-serif',
                        }}>{f.label} · S/{(precioKg * f.kgFactor).toFixed(0)}</button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <span style={{ fontSize: 11, color: 'var(--tw-text-muted)' }}>Cantidad</span>
                      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--tw-border)', borderRadius: 8, overflow: 'hidden' }}>
                        <button type="button" onClick={() => onSetCantidad(c => Math.max(1, c - 1))} style={{ width: 32, height: 32, border: 'none', background: 'var(--tw-card)', color: 'var(--tw-text)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ padding: '0 14px', fontSize: 13, fontWeight: 700, color: 'var(--tw-text)', background: 'var(--tw-bg)' }}>{cantidad}</span>
                        <button type="button" onClick={() => onSetCantidad(c => c + 1)} style={{ width: 32, height: 32, border: 'none', background: 'var(--tw-card)', color: 'var(--tw-text)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      </div>
                    </div>
                  </>
                )}

                {/* Botón de acción: condicional por rol, tipo y modalidad */}
                {esNegociable ? (
                  esB2bAprobado ? (
                    <button
                      onClick={() => onSolicitarCotizacion?.(producto)}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'Montserrat, sans-serif' }}
                    >
                      <span>Solicitar cotización</span>
                      <span style={{ fontWeight: 800 }}>→</span>
                    </button>
                  ) : esB2bPendiente ? (
                    <button disabled style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--tw-border)', background: 'var(--tw-card)', color: 'var(--tw-text-muted)', fontSize: 13, fontWeight: 700, cursor: 'not-allowed', fontFamily: 'Montserrat, sans-serif', opacity: 0.6 }}>
                      Solo para empresas aprobadas
                    </button>
                  ) : (
                    <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--tw-border)', background: 'var(--tw-card)', fontSize: 12, color: 'var(--tw-text-muted)', textAlign: 'center' }}>
                      Precio a negociar con el productor
                    </div>
                  )
                ) : (
                  <button
                    onClick={() => { onAgregar(producto, formato as FormatoONE); void kgLabel }}
                    disabled={producto.status !== 'activo'}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none', background: producto.status !== 'activo' ? 'var(--tw-border)' : 'var(--tw-terra)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: producto.status !== 'activo' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'Montserrat, sans-serif', opacity: producto.status !== 'activo' ? 0.6 : 1 }}
                  >
                    <span>{producto.status === 'agotado' ? 'Agotado' : producto.status === 'pausado' ? 'No disponible temporalmente' : 'Agregar al carrito'}</span>
                    {producto.status === 'activo' && <span style={{ fontWeight: 800 }}>S/ {precioTotal.toFixed(2)}</span>}
                  </button>
                )}
              </div>
            )}


            {/* Vendido por */}
            <div style={{ background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--tw-terra)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                {(producto.caficultorNombre || '?').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--tw-text-muted)', marginBottom: 1 }}>Vendido por</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tw-text)' }}>{producto.caficultorNombre}</div>
                <div style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>📍 {producto.caficultorRegion ?? 'Perú'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                  <span style={{ color: '#fbbf24', fontSize: 10 }}>★★★★★</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-text)' }}>4.8</span>
                  <span style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>(32 reseñas)</span>
                </div>
              </div>
              <span style={{ fontSize: 10, color: 'var(--tw-terra)', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>Ver perfil →</span>
            </div>

            {/* Envío */}
            <div style={{ background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <span style={{ fontSize: 16 }}>🚚</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-sage)' }}>Envío gratis para este artículo</span>
                <span style={{ fontSize: 8, fontWeight: 700, background: 'rgba(143,175,138,.15)', color: 'var(--tw-sage)', border: '1px solid rgba(143,175,138,.3)', borderRadius: 4, padding: '2px 6px' }}>6 DÍAS HÁBILES</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', marginBottom: 8 }}>
                Transportista: 🏢 Shalom &nbsp;·&nbsp; 📦 Olva Courier &nbsp;·&nbsp; 🛵 HubApp
              </div>
              <div style={{ borderTop: '1px solid var(--tw-border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>🔒</span>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-text)' }}>Pagos seguros · Privacidad segura</div>
                    <div style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>Tu pago está protegido con escrow</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>📋</span>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 4 }}>Garantía de pedidos</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {['Devoluciones gratis', 'S/ 4.00 crédito por retraso', 'Devolución si artículo dañado'].map(tag => (
                        <span key={tag} style={{ background: 'rgba(143,175,138,.15)', color: 'var(--tw-sage)', border: '1px solid rgba(143,175,138,.3)', borderRadius: 4, padding: '2px 7px', fontSize: 8, fontWeight: 700 }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Más productos de este caficultor ── */}
        {crossSelling.length > 0 && (
          <div style={{ marginTop: 36, paddingTop: 28, borderTop: '1px solid var(--tw-border)' }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 700, color: 'var(--tw-text)' }}>Más de {producto.caficultorNombre}</div>
              <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', marginTop: 2 }}>📍 {producto.caficultorRegion ?? 'Perú'}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
              {crossSelling.map((p: ProductoONE) => {
                const cp = PROCESO_BADGE[(p.proceso || '').toLowerCase()] ?? { bg: 'var(--tw-card)', color: 'var(--tw-text-muted)', border: 'var(--tw-border)', label: p.proceso }
                const tpBadge = tipoBadge((p as any).tipoCafe, (p as any).productType)
                const calBadge = calidadBadge((p as any).calidad, p.puntajeReferencial)
                return (
                  <div key={p.id} onClick={() => onVerOtro(p)} style={{ background: 'var(--tw-card)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--tw-border)', cursor: 'pointer' }}>
                    <div style={{ height: 130, background: 'linear-gradient(145deg,#fdf8f4,#f0e6d8)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      {p.foto
                        ? <img src={p.foto} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                        : <span style={{ fontSize: 40 }}>🫘</span>
                      }
                      {/* Badge tipo arriba-izquierda */}
                      {tpBadge && <span style={{ position: 'absolute', top: 7, left: 7, background: tpBadge.bg, color: tpBadge.color, border: `1px solid ${tpBadge.border}`, fontSize: 7, fontWeight: 700, padding: '2px 5px', borderRadius: 4 }}>{tpBadge.label}</span>}
                      <div style={{ position: 'absolute', top: 7, right: 7, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                        <span style={{ background: cp.bg, color: cp.color, border: `1px solid ${cp.border}`, fontSize: 7, fontWeight: 700, padding: '2px 5px', borderRadius: 4 }}>{cp.label}</span>
                        {calBadge && <span style={{ background: calBadge.bg, color: calBadge.color, border: `1px solid ${calBadge.border}`, fontSize: 7, fontWeight: 700, padding: '2px 5px', borderRadius: 4 }}>{calBadge.label}</span>}
                      </div>
                    </div>
                    <div style={{ padding: '10px 12px 12px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-text)', lineHeight: 1.3, marginBottom: 6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>{p.nombre}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--tw-terra)' }}>S/ {(p.precioBaseKgCents / 100).toFixed(0)}<span style={{ fontSize: 9, fontWeight: 500, color: 'var(--tw-text-muted)' }}>/kg</span></span>
                        <button type="button" onClick={e => { e.stopPropagation(); onAgregar(p, '1kg') }} style={{ padding: '5px 10px', borderRadius: 7, border: '1.5px solid var(--tw-terra)', background: 'transparent', color: 'var(--tw-terra)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>+ Carrito</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {toastMsg && <div className="sim-toast">{toastMsg}</div>}
      </div>
    </div>
  )
}

