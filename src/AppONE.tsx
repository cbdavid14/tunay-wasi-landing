// v1.1.1
/**
 * AppONE.tsx — App principal TunayWasi ONE
 *
 * Rutas (via hash routing simple):
 *   #/                    → CatalogoPublico (público)
 *   #/caficultor/:id      → PerfilCaficultor (público)
 *   #/registro-caficultor → RegistroCaficultor (público, sin auth)
 *   #/checkout            → CheckoutONE (requiere auth)
 *   #/portal              → PortalEmprendedor (requiere auth + rol negocio)
 *   #/caficultor-portal   → PortalCaficultor (requiere auth + rol caficultor)
 *   #/admin               → AdminONE (requiere auth + admin)
 */
import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/shared/firebase'
import type { User } from 'firebase/auth'
import { fetchUsuario, createCotizacion } from '@/one/service'
import type { UsuarioONE, ProductoONE, FormatoONE } from '@/one/types'
import { calcularPrecioFinal } from '@/one/config'
import { track, setAnalyticsUser, initAnalytics, setupErrorTracking } from '@/one/analytics'

import CatalogoPublico from '@/one/components/CatalogoPublico'
import CheckoutONE from '@/one/components/CheckoutONE'
import AuthScreen from '@/one/components/AuthScreen'
import AdminONE from '@/one/components/AdminONE'
import PortalEmprendedor from '@/one/components/PortalEmprendedor'
import PortalCaficultor from '@/one/components/PortalCaficultor'
import PerfilCaficultor from '@/one/components/PerfilCaficultor'
import RegistroEmprendedor from '@/one/components/RegistroEmprendedor'
import RegistroConsumidor from '@/one/components/RegistroConsumidor'
import RegistroCaficultor from '@/one/components/RegistroCaficultor'
import LandingCaficultores from '@/one/components/LandingCaficultores'
import LandingEmprendedor from '@/one/components/LandingEmprendedor'
import DocsONE from '@/one/components/DocsONE'
import SoporteONE from '@/one/components/SoporteONE'
import TerminosONE from '@/one/components/TerminosONE'
import ContratoCompradorONE from '@/one/components/ContratoCompradorONE'
import PrivacidadONE from '@/one/components/PrivacidadONE'
import LibroReclamacionesONE from '@/one/components/LibroReclamacionesONE'
import Footer from '@/components/layout/Footer'
import { DEMO_USER } from '@/one/demoService'
import { useTheme, setTheme as applyTheme, getStoredTheme } from '@/shared/useTheme'
import type { Theme } from '@/shared/useTheme'

// ─── PaginaCaficultores ───────────────────────────────────────────────────────

const CAFICULTORES_DATA = [
  { id:1, nombre:'Jorge Quispe Condori', finca:'Finca Vista Hermosa', distrito:'San Ignacio', region:'Cajamarca', altitud:1850, ha:3, años:12, sca:86, lotes:4, variedades:['Gesha','Caturra'], procesos:['Lavado','Honey'], foto_emoji:'🌄', bio_corta:'"Productor de microlotes de especialidad en las alturas de San Ignacio. Jorge trabaja con proceso Lavado y Honey, obteniendo perfiles cítricos y florales únicos."', bio:'Jorge Quispe Condori lleva 12 años cultivando café en las alturas de San Ignacio, Cajamarca. Su finca Vista Hermosa, situada a 1850 msnm, produce microlotes de alta calidad gracias a la dedicación familiar y un terroir privilegiado.', impacto:'Con el sobreprecio pagado por cada lote, Jorge reinvierte en infraestructura de beneficio húmedo y en la educación de sus hijos, fortaleciendo la finca para la próxima generación.' },
  { id:2, nombre:'María Condori Quispe', finca:'Finca El Sol', distrito:'Pisac', region:'Cusco', altitud:1720, ha:2, años:8, sca:83, lotes:3, variedades:['Caturra','Typica'], procesos:['Natural'], foto_emoji:'🌿', bio_corta:'"Productora de cafés naturales con perfil frutal intenso en el Valle Sagrado de Cusco. María fue la primera mujer de su comunidad en exportar café de especialidad."', bio:'María Condori Quispe es una de las pocas productoras de café de especialidad del Valle Sagrado del Cusco. Su finca El Sol, a 1720 msnm, se especializa en proceso Natural que resalta las notas de fresa y miel características de la variedad Caturra cusqueña.', impacto:'El 100% del sobreprecio pagado a María financia el acceso a agua potable para su comunidad de 40 familias productoras, un proyecto que ella lidera desde 2023.' },
  { id:3, nombre:'Pedro Huanca Mamani', finca:'Finca Lomas Altas', distrito:'Sandia', region:'Puno', altitud:1950, ha:4, años:15, sca:84, lotes:5, variedades:['Typica','Bourbon'], procesos:['Honey','Natural'], foto_emoji:'⛰️', bio_corta:'"Caficultor con 15 años de experiencia en las alturas de Sandia, Puno. Pedro es referente del proceso Honey en la región, logrando notas de durazno y caramelo únicas."', bio:'Pedro Huanca Mamani cultiva café en Sandia, la zona cafetalera más alta de Puno, a casi 2000 msnm. Con 15 años de experiencia, desarrolló su propio protocolo de proceso Honey adaptado al clima frío de la región andina.', impacto:'Pedro comparte su técnica de proceso Honey con 8 productores vecinos, multiplicando el impacto del modelo de comercio directo en toda la provincia de Sandia.' },
  { id:4, nombre:'Ana Flores Vega', finca:'Finca Alta', distrito:'Moyobamba', region:'San Martín', altitud:1600, ha:5, años:10, sca:88, lotes:6, variedades:['Bourbon','Sidra'], procesos:['Lavado'], foto_emoji:'🌱', bio_corta:'"Productora de Bourbon y Sidra en Moyobamba, San Martín. El Bourbon Washed de Ana alcanzó 88 SCA en la cata de 2025, el puntaje más alto de la región."', bio:'Ana Flores Vega gestiona Finca Alta en Moyobamba, San Martín, donde cultiva variedades Premium como Bourbon y Sidra bajo sombra de árboles nativos. Su Bourbon Lavado obtuvo 88 puntos SCA en la cata independiente de 2025.', impacto:'Ana lidera la primera asociación de mujeres cafetaleras de Moyobamba, integrando a 12 productoras que ahora acceden directamente a compradores de especialidad.' },
  { id:5, nombre:'Carlos Vega Ríos', finca:'Finca Bella', distrito:'La Coipa', region:'Cajamarca', altitud:1780, ha:2, años:7, sca:91, lotes:2, variedades:['Gesha'], procesos:['Natural'], foto_emoji:'✨', bio_corta:'"Productor de Gesha Natural en La Coipa, Cajamarca. El lote de Carlos alcanzó 91 SCA, el más alto del catálogo de TunayWasi, con notas de frambuesa, bergamota y flores."', bio:'Carlos Vega Ríos produce Gesha Natural en su pequeña finca de 2 hectáreas en La Coipa, Cajamarca. A sus 7 años de experiencia, Carlos ha logrado el puntaje SCA más alto del catálogo de TunayWasi con su lote de Gesha Natural 2025.', impacto:'Carlos invierte el sobreprecio de sus lotes en la compra de equipos de fermentación controlada, mejorando la consistencia de sus cafés y sirviendo como modelo para otros productores jóvenes de La Coipa.' },
]

const PROC_CHIP_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  Lavado:  { bg: 'rgba(59,130,246,.15)',  color: '#60a5fa', border: '1px solid rgba(59,130,246,.3)' },
  Natural: { bg: 'rgba(239,68,68,.15)',   color: '#f87171', border: '1px solid rgba(239,68,68,.3)' },
  Honey:   { bg: 'rgba(245,158,11,.15)',  color: '#fbbf24', border: '1px solid rgba(245,158,11,.3)' },
}

function ModalCaficultor({ id, onClose, onNav }: { id: number; onClose: () => void; onNav: (dir: 1|-1) => void }) {
  const c = CAFICULTORES_DATA.find(x => x.id === id)!
  const idx = CAFICULTORES_DATA.findIndex(x => x.id === id)
  const num = String(idx + 1).padStart(2, '0')
  const total = String(CAFICULTORES_DATA.length).padStart(2, '0')
  const chipVar: React.CSSProperties = { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(242,224,204,.1)', color: '#f2e0cc', border: '1px solid rgba(242,224,204,.2)' }
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onNav(-1)
      if (e.key === 'ArrowRight') onNav(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onNav])
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontFamily: 'Montserrat, sans-serif' }}>
      <div style={{ background: '#111', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 680, maxHeight: '92vh', overflowY: 'auto', position: 'relative', border: '1px solid #2a2a2a', borderBottom: 'none', scrollbarWidth: 'none' }}>
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: 'linear-gradient(135deg,#0d1f0d,#1a3020,#0a1a0a)', flexShrink: 0, overflow: 'hidden' }}>
          <div style={{ fontSize: 72, filter: 'drop-shadow(0 4px 16px rgba(0,0,0,.5))' }}>{c.foto_emoji}</div>
          <div style={{ position: 'absolute', top: 12, left: 14, color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }}>N° {num} / {total}</div>
          <div style={{ position: 'absolute', top: 12, right: 44, background: '#c96e4b', color: '#fff', fontSize: 10, fontWeight: 700, padding: '5px 12px', borderRadius: 20 }}>SCA {c.sca} · Cata lote 2025</div>
          <button onClick={onClose} style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(255,255,255,.2)', background: 'rgba(0,0,0,.5)', color: '#fff', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          <button onClick={() => onNav(-1)} style={{ position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,.25)', background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
          <button onClick={() => onNav(1)} style={{ position: 'absolute', top: '50%', right: 10, transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,.25)', background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
        </div>
        <div style={{ padding: '24px 20px 36px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#8faf8a', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 5 }}>{c.region.toUpperCase()} · {c.distrito.toUpperCase()}</div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 700, color: '#f2e0cc', lineHeight: 1.1, marginBottom: 7 }}>{c.nombre}</div>
          <div style={{ fontSize: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
            <em style={{ color: '#c96e4b', fontStyle: 'italic' }}>{c.finca}</em>
            <span style={{ color: '#444' }}>·</span>
            <span style={{ color: '#888' }}>📍 {c.distrito}, {c.region}</span>
          </div>
          <div style={{ borderLeft: '3px solid #c96e4b', padding: '10px 14px', marginBottom: 16, background: 'rgba(201,110,75,.05)', borderRadius: '0 7px 7px 0' }}>
            <p style={{ fontSize: 13, fontStyle: 'italic', color: '#8faf8a', lineHeight: 1.65, margin: 0 }}>{c.bio_corta}</p>
          </div>
          <p style={{ fontSize: 13, color: '#c4b297', lineHeight: 1.7, marginBottom: 20 }}>{c.bio}</p>
          <div style={{ background: 'rgba(15,30,18,.8)', border: '1px solid rgba(143,175,138,.25)', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: '#8faf8a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7 }}>
              <span>🌿</span><span>Impacto Social</span>
            </div>
            <p style={{ fontSize: 12, color: '#c4b297', lineHeight: 1.65, margin: 0 }}>{c.impacto}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', border: '1px solid #2a2a2a', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
            {[{ num: c.años, label: 'Años de exp.' }, { num: c.ha, label: 'Ha de cafetal' }].map((s, i) => (
              <div key={i} style={{ padding: '14px 10px', textAlign: 'center', borderRight: '1px solid #2a2a2a' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 34, fontWeight: 700, color: '#f2e0cc', lineHeight: 1 }}>{s.num}</div>
                <div style={{ fontSize: 8, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
            <div style={{ padding: '14px 10px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontWeight: 700, color: '#c96e4b', lineHeight: 1.2 }}>SCA {c.sca} ·<br/>Cata lote 2025</div>
              <div style={{ fontSize: 8, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>Cata confirmada</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 22 }}>
            <span style={{ fontSize: 11, color: '#888', fontWeight: 600, marginRight: 2 }}>Variedades:</span>
            {c.variedades.map(v => <span key={v} style={chipVar}>{v}</span>)}
            <span style={{ fontSize: 11, color: '#888', fontWeight: 600, marginLeft: 6, marginRight: 2 }}>Procesos:</span>
            {c.procesos.map(p => {
              const s = PROC_CHIP_STYLE[p] ?? { bg: 'rgba(255,255,255,.1)', color: '#fff', border: '1px solid rgba(255,255,255,.2)' }
              return <span key={p} style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, border: s.border }}>{p}</span>
            })}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 13, borderRadius: 10, border: 'none', background: '#c96e4b', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
              Ver cafés de {c.nombre.split(' ')[0]} →
            </button>
            <button onClick={() => window.open(`https://wa.me/51917959370?text=Hola, me interesa el café de ${c.nombre}`, '_blank')} style={{ flex: 1, padding: 13, borderRadius: 10, border: '1px solid rgba(37,211,102,.4)', background: 'rgba(37,211,102,.08)', color: '#25d366', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
              💬 Contactar por WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PaginaCaficultores() {
  const [modalId, setModalId] = React.useState<number | null>(null)
  const goTo = (dir: 1|-1) => {
    if (modalId === null) return
    const idx = CAFICULTORES_DATA.findIndex(x => x.id === modalId)
    const next = CAFICULTORES_DATA[(idx + dir + CAFICULTORES_DATA.length) % CAFICULTORES_DATA.length]
    setModalId(next.id)
  }
  return (
    <div style={{ minHeight: '100vh', background: 'var(--tw-bg)', color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif', padding: '24px 16px 48px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 3 }}>🌱 Caficultores Destacados</div>
            <div style={{ fontSize: 12, color: 'var(--tw-text-muted)' }}>Conoce a quienes cultivan tu café · Directo del productor</div>
          </div>
          <a href="#/" style={{ fontSize: 12, color: 'var(--tw-terra)', textDecoration: 'none', fontWeight: 600 }}>← Catálogo</a>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {CAFICULTORES_DATA.map(c => (
            <div key={c.id} onClick={() => setModalId(c.id)}
              style={{ background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: 36, flexShrink: 0, lineHeight: 1 }}>{c.foto_emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 17, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 1 }}>{c.nombre}</div>
                <div style={{ fontSize: 11, color: 'var(--tw-terra)', fontStyle: 'italic', marginBottom: 2 }}>{c.finca}</div>
                <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', marginBottom: 6 }}>📍 {c.distrito}, {c.region} · {c.altitud} msnm</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {c.variedades.map(v => <span key={v} style={{ padding: '2px 8px', borderRadius: 20, fontSize: 9, fontWeight: 700, background: 'rgba(242,224,204,.1)', color: 'var(--tw-text)', border: '1px solid rgba(242,224,204,.2)' }}>{v}</span>)}
                  {c.procesos.map(p => {
                    const s = PROC_CHIP_STYLE[p] ?? { bg: 'rgba(255,255,255,.1)', color: '#fff', border: '1px solid rgba(255,255,255,.2)' }
                    return <span key={p} style={{ padding: '2px 8px', borderRadius: 20, fontSize: 9, fontWeight: 700, background: s.bg, color: s.color, border: s.border }}>{p}</span>
                  })}
                </div>
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <div style={{ background: 'var(--tw-terra)', color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, marginBottom: 3 }}>{c.sca} SCA</div>
                <div style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>{c.años} años · {c.lotes} lotes</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {modalId !== null && (
        <ModalCaficultor id={modalId} onClose={() => setModalId(null)} onNav={goTo} />
      )}
    </div>
  )
}

// ─── GlobalHeader ─────────────────────────────────────────────────────────────

function GlobalHeader({
  carritoCount,
  onIrAlCheckout,
  usuarioONE,
  hash,
  avatarBadge = 0,
  portalTab,
  onPortalTabChange,
  searchValue,
  onSearchChange,
}: {
  carritoCount: number
  onIrAlCheckout: () => void
  usuarioONE: UsuarioONE | null
  hash: string
  avatarBadge?: number
  portalTab?: string
  onPortalTabChange?: (t: string) => void
  searchValue?: string
  onSearchChange?: (q: string) => void
}) {
  const [tema, setTema] = useState<Theme>(getStoredTheme() || 'cream')
  const [menuAbierto, setMenuAbierto] = useState(false)

  const cambiarTema = (t: Theme) => { setTema(t); applyTheme(t) }
  const cerrarMenu = () => setMenuAbierto(false)

  const inicial = usuarioONE?.nombre ? usuarioONE.nombre[0].toUpperCase() : (usuarioONE ? 'U' : null)
  const esCaficultor = usuarioONE?.rol === 'seller'
  const esNegocio = usuarioONE?.rol === 'buyer_b2b' || usuarioONE?.rol === 'buyer_b2c'
  const esAdmin = usuarioONE?.rol === 'admin'

  const navItems = [
    { href: '#/', label: 'Catálogo', emoji: '☕' },
    { href: '#/caficultores', label: 'Caficultores', emoji: '🌱' },
    { href: '#/docs', label: 'Guías', emoji: '📖' },
    { href: '#/soporte', label: 'Soporte', emoji: '💬' },
  ]

  return (
    <>
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: 'var(--tw-bg)', borderBottom: '1px solid var(--tw-border)',
        fontFamily: 'Montserrat, sans-serif',
      }}>
        {/* ── Fila principal ── */}
        <div style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8, minWidth: 0, position: 'relative' }}>
          {/* Hamburguesa */}
          <button
            onClick={() => setMenuAbierto(o => !o)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '0', width: 36, height: 36, flexShrink: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              borderRadius: 8,
            }}
            aria-label="Menú"
          >
            <span style={{ display: 'block', width: 18, height: 2, background: 'var(--tw-text)', borderRadius: 2, transition: 'all 0.2s', transform: menuAbierto ? 'translateY(6px) rotate(45deg)' : 'none' }} />
            <span style={{ display: 'block', width: 18, height: 2, background: 'var(--tw-text)', borderRadius: 2, transition: 'all 0.2s', opacity: menuAbierto ? 0 : 1 }} />
            <span style={{ display: 'block', width: 18, height: 2, background: 'var(--tw-text)', borderRadius: 2, transition: 'all 0.2s', transform: menuAbierto ? 'translateY(-6px) rotate(-45deg)' : 'none' }} />
          </button>

          {/* Logo */}
          <a href="#/" className="header-logo" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 17, fontWeight: 700, color: 'var(--tw-text)', whiteSpace: 'nowrap' }}>
              Tunay <span style={{ color: 'var(--tw-text)' }}>·</span> <span style={{ color: 'var(--tw-terra)' }}>Wasi</span>
            </span>
          </a>

          {/* Barra de búsqueda — solo desktop, posicionada para alinearse con el body del catálogo */}
          <input
            className="header-search-catalog"
            placeholder="🔎  Buscar café, variedad, región..."
            style={{
              position: 'absolute',
              left: 174, right: 372,
              background: 'var(--tw-card)',
              border: '1px solid var(--tw-border)', borderRadius: 8,
              padding: '6px 14px', fontSize: 11, fontFamily: 'Montserrat, sans-serif',
              color: 'var(--tw-text)', outline: 'none',
            }}
            value={searchValue ?? ''}
            onChange={e => { if (hash !== '#/') window.location.hash = '#/'; onSearchChange?.(e.target.value) }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--tw-terra)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--tw-border)')}
          />

          {/* Acciones derechas — siempre visibles, compactas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 'auto' }}>

            {/* Theme dots — ocultos en mobile */}
            <div className="header-theme-dots" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {(['cream', 'dark', 'white'] as const).map(t => (
                <div key={t} onClick={() => cambiarTema(t)} style={{
                  width: 14, height: 14, borderRadius: '50%', cursor: 'pointer',
                  border: tema === t ? '2px solid var(--tw-terra)' : '1px solid var(--tw-border)',
                  background: t === 'cream' ? '#f2e0cc' : t === 'dark' ? '#141414' : '#f5f5f5',
                }} />
              ))}
            </div>

            {/* Carrito */}
            <div style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }} onClick={onIrAlCheckout}>
              <span style={{ fontSize: 20 }}>🛒</span>
              {carritoCount > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--tw-terra)', color: '#fff', fontSize: 8, fontWeight: 700, borderRadius: 8, padding: '1px 5px', minWidth: 14, textAlign: 'center' }}>
                  {carritoCount}
                </span>
              )}
            </div>

            {/* Avatar */}
            {inicial ? (
              <a
                href={esCaficultor ? '#/caficultor-portal' : esAdmin ? '#/admin' : '#/portal'}
                style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', position: 'relative' }}
              >
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--tw-terra)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {inicial}
                </div>
                {avatarBadge > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 14, height: 14, borderRadius: 7, background: '#ef4444', border: '2px solid var(--tw-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff', padding: '0 2px' }}>
                    {avatarBadge > 9 ? '9+' : avatarBadge}
                  </span>
                )}
              </a>
            ) : (
              <>
                <a href="#/registro-caficultor" className="header-producer-btn" style={{ padding: '5px 8px', borderRadius: 7, border: '1px dashed var(--tw-sage)', background: 'transparent', color: 'var(--tw-sage)', fontSize: 10, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  <span className="header-producer-full">🌱 Soy productor</span>
                  <span className="header-producer-short">🌱 Soy Productor</span>
                </a>
                <a href="#/login" className="header-login-btn" style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid var(--tw-terra)', background: 'transparent', color: 'var(--tw-terra)', fontSize: 10, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  <span className="header-btn-full">Ingresar</span>
                  <span className="header-btn-short">Ingresar</span>
                </a>
                <a href="#/login?registro=1" className="header-register-btn" style={{ padding: '5px 8px', borderRadius: 7, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 10, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  <span className="header-btn-full">Registrarse</span>
                  <span className="header-btn-short">Registrarse</span>
                </a>
              </>
            )}
          </div>
        </div>

        {/* ── Segunda fila: búsqueda mobile ── */}
        <div className="header-search-mobile-row" style={{ display: 'none', padding: '0 12px 8px' }}>
          <input
            placeholder="🔎  Buscar café, variedad, región..."
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontFamily: 'Montserrat, sans-serif', color: 'var(--tw-text)', outline: 'none' }}
            value={searchValue ?? ''}
            onChange={e => { if (hash !== '#/') window.location.hash = '#/'; onSearchChange?.(e.target.value) }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--tw-terra)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--tw-border)')}
          />
        </div>
      </header>

      {/* Overlay */}
      {menuAbierto && (
        <div
          onClick={cerrarMenu}
          style={{ position: 'fixed', inset: 0, zIndex: 198, background: 'rgba(0,0,0,0.35)' }}
        />
      )}

      {/* Panel lateral izquierdo */}
      <nav style={{
        position: 'fixed', top: 'var(--header-h)', left: 0, bottom: 0, zIndex: 199,
        width: 260,
        background: 'var(--tw-bg)',
        borderRight: '1px solid var(--tw-border)',
        transform: menuAbierto ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'Montserrat, sans-serif',
      }}>
        {/* Sección principal */}
        <div style={{ padding: '16px 0 8px' }}>
          <p style={{ margin: '0 20px 8px', fontSize: 9, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Explorar</p>
          {navItems.map(item => (
            <a
              key={item.href}
              href={item.href}
              onClick={cerrarMenu}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 20px',
                textDecoration: 'none',
                color: hash === item.href ? 'var(--tw-terra)' : 'var(--tw-text)',
                background: hash === item.href ? 'rgba(201,110,75,.08)' : 'transparent',
                fontSize: 13, fontWeight: hash === item.href ? 700 : 500,
                borderLeft: hash === item.href ? '3px solid var(--tw-terra)' : '3px solid transparent',
              }}
            >
              <span style={{ fontSize: 16 }}>{item.emoji}</span>
              {item.label}
            </a>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--tw-border)', margin: '8px 20px' }} />

        {/* Sección usuario */}
        {usuarioONE ? (
          <div style={{ padding: '8px 0' }}>
            <p style={{ margin: '0 20px 8px', fontSize: 9, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Mi cuenta</p>

            {/* Tabs del portal según rol */}
            {(esCaficultor ? [
              { id: 'productos', emoji: '🌱', label: 'Mis cafés',  href: '#/caficultor-portal' },
              { id: 'pedidos',   emoji: '📦', label: 'Mis Ventas', href: '#/caficultor-portal' },
              { id: 'pagos',     emoji: '💰', label: 'Mis Pagos',  href: '#/caficultor-portal' },
              { id: 'wasi',      emoji: '🤖', label: 'Wasi',       href: '#/caficultor-portal' },
              { id: 'perfil',    emoji: '⚙️', label: 'Perfil',     href: '#/caficultor-portal' },
            ] : (esNegocio || esAdmin) ? [
              { id: 'mis_compras', emoji: '📦', label: 'Mis Compras', href: '#/portal' },
              { id: 'carrito',     emoji: '🛒', label: 'Carrito',     href: '#/portal' },
              { id: 'wasi',        emoji: '🤖', label: 'Wasi',        href: '#/portal' },
              { id: 'perfil',      emoji: '⚙️', label: 'Perfil',      href: '#/portal' },
            ] : []).map(item => {
              const isActive = portalTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => { onPortalTabChange?.(item.id); window.location.hash = item.href; cerrarMenu() }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                    padding: '10px 20px', background: isActive ? 'rgba(201,110,75,.08)' : 'transparent',
                    border: 'none', borderLeft: isActive ? '3px solid var(--tw-terra)' : '3px solid transparent',
                    color: isActive ? 'var(--tw-terra)' : 'var(--tw-text)',
                    fontSize: 13, fontWeight: isActive ? 700 : 500, cursor: 'pointer',
                    fontFamily: 'Montserrat, sans-serif', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 16 }}>{item.emoji}</span>
                  {item.label}
                </button>
              )
            })}

            {esAdmin && (
              <a href="#/admin" onClick={cerrarMenu} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', textDecoration: 'none', color: 'var(--tw-text)', fontSize: 13, fontWeight: 500 }}>
                <span style={{ fontSize: 16 }}>⚙️</span> Administración
              </a>
            )}
          </div>
        ) : (
          <div style={{ padding: '8px 20px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ margin: '0 0 2px', fontSize: 9, fontWeight: 700, color: 'var(--tw-sage)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>¿Eres productor?</p>
            <a href="#/registro-caficultor" onClick={cerrarMenu} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--tw-sage)', background: 'rgba(143,175,138,0.07)', textDecoration: 'none' }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(143,175,138,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>🌱</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 1 }}>Registrarme como caficultor</div>
                <div style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>Vende directo, sin intermediarios</div>
              </div>
              <span style={{ fontSize: 14, color: 'var(--tw-sage)' }}>›</span>
            </a>
            <div style={{ height: 1, background: 'var(--tw-border)', margin: '2px 0' }} />
            <a href="#/login" onClick={cerrarMenu} style={{ padding: '9px 0', borderRadius: 8, border: '1px solid var(--tw-terra)', background: 'transparent', color: 'var(--tw-terra)', fontSize: 12, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
              Ingresar
            </a>
            <a href="#/login?registro=1" onClick={cerrarMenu} style={{ padding: '9px 0', borderRadius: 8, background: 'var(--tw-terra)', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
              Crear cuenta
            </a>
          </div>
        )}

        {/* Footer del panel */}
        <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid var(--tw-border)' }}>
          <p style={{ margin: '0 0 8px', fontSize: 9, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tema</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {(['cream', 'dark', 'white'] as const).map(t => (
              <div key={t} onClick={() => { cambiarTema(t); cerrarMenu() }} style={{
                width: 20, height: 20, borderRadius: '50%', cursor: 'pointer',
                border: tema === t ? '2px solid var(--tw-terra)' : '1px solid var(--tw-border)',
                background: t === 'cream' ? '#f2e0cc' : t === 'dark' ? '#141414' : '#f5f5f5',
              }} />
            ))}
          </div>
        </div>
      </nav>
    </>
  )
}

// ─── Tipo carrito ─────────────────────────────────────────────────────────────

export interface ItemCarrito {
  producto: ProductoONE
  formato: FormatoONE
  qty: number
}

// ─── Auth state ───────────────────────────────────────────────────────────────

function useAuthONE(isDemo = false) {
  const [user, setUser] = useState<User | null>(null)
  const [usuarioONE, setUsuarioONE] = useState<UsuarioONE | null>(null)
  const [loading, setLoading] = useState(true)

  // Cuando el usuario está autenticado pero sin doc (registro Google en proceso),
  // reintentar fetchUsuario cada 1.5s hasta encontrar el doc recién creado.
  useEffect(() => {
    if (!user || loading || usuarioONE) return
    let stopped = false
    const id = setInterval(async () => {
      try {
        const u = await fetchUsuario(user.uid)
        if (stopped) return
        setUsuarioONE(u)
        setAnalyticsUser(user.uid, u.rol)
        clearInterval(id)
      } catch { /* doc aún no existe, reintentar */ }
    }, 1500)
    return () => { stopped = true; clearInterval(id) }
  }, [user, loading, usuarioONE])

  useEffect(() => {
    // Inicializar analytics (restaura uid/rol de sessionStorage si existía)
    initAnalytics()
    setupErrorTracking()

    if (isDemo) {
      setUser({ uid: DEMO_USER.uid, email: DEMO_USER.email, displayName: DEMO_USER.nombre } as User)
      setUsuarioONE({ uid: DEMO_USER.uid, rol: DEMO_USER.rol, nombre: DEMO_USER.nombre, email: DEMO_USER.email, telefono: DEMO_USER.telefono, createdAt: '2026-01-01T00:00:00.000Z' })
      setAnalyticsUser(DEMO_USER.uid, DEMO_USER.rol)
      setLoading(false)
      return
    }
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        try {
          const u = await fetchUsuario(firebaseUser.uid)
          setUsuarioONE(u)
          setAnalyticsUser(firebaseUser.uid, u.rol)
        } catch {
          // Documento no existe en one_usuarios — usuario incompleto (registro Google abandonado)
          // No creamos el doc aquí: el rol lo elige el usuario en AuthScreen (paso seleccion_rol)
          // usuarioONE queda null → el portal no carga → se muestra pantalla de login
          setUsuarioONE(null)
        }
      } else {
        setUsuarioONE(null)
      }
      setLoading(false)
    })
    return unsub
  }, [isDemo])

  const ADMIN_EMAILS = ['tunaywasi@gmail.com']
  const isAdmin = isDemo ? false : (
    (user?.email?.endsWith('@tunaywasi.pe') ?? false) ||
    ADMIN_EMAILS.includes(user?.email ?? '')
  )

  return { user, usuarioONE, loading, isAdmin }
}

// ─── Hash router simple ───────────────────────────────────────────────────────

function useHash() {
  const [hash, setHash] = useState(window.location.hash || '#/')
  useEffect(() => {
    const handler = () => setHash(window.location.hash || '#/')
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])
  return hash
}

// ─── Helpers localStorage — carrito persistente ───────────────────────────────

const CARRITO_KEY = 'one_carrito_items'
const CARRITO_META_KEY = 'one_carrito_meta'

function leerCarritoStorage(): ItemCarrito[] {
  try {
    // Prioridad: localStorage (persiste entre sesiones)
    const stored = localStorage.getItem(CARRITO_KEY)
    if (stored) return JSON.parse(stored) as ItemCarrito[]
    // Retrocompatibilidad: sessionStorage antiguo
    const session = sessionStorage.getItem('one_carrito_items')
    if (session) {
      sessionStorage.removeItem('one_carrito_items')
      return JSON.parse(session) as ItemCarrito[]
    }
    const legacy = sessionStorage.getItem('one_carrito_producto')
    if (legacy) {
      sessionStorage.removeItem('one_carrito_producto')
      const p = JSON.parse(legacy) as ProductoONE
      return [{ producto: p, formato: '1kg', qty: 1 }]
    }
  } catch { /* ok */ }
  return []
}

function guardarCarritoStorage(items: ItemCarrito[]) {
  try {
    if (items.length > 0) {
      localStorage.setItem(CARRITO_KEY, JSON.stringify(items))
    } else {
      localStorage.removeItem(CARRITO_KEY)
    }
    window.dispatchEvent(new CustomEvent('one_carrito_changed'))
  } catch { /* ok */ }
}

/** Registra el paso actual del carrito para análisis de abandono */
function trackCarritoMeta(paso: string, extra?: Record<string, unknown>) {
  try {
    const meta = {
      paso,
      timestamp: new Date().toISOString(),
      itemCount: 0,
      ...extra,
    }
    localStorage.setItem(CARRITO_META_KEY, JSON.stringify(meta))
  } catch { /* ok */ }
}


// ─── App ──────────────────────────────────────────────────────────────────────

const BASE_URL = 'https://tunaywasi.com'
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.jpg`

function PageMeta({ title, description, image, canonical }: {
  title: string
  description: string
  image?: string
  canonical?: string
}) {
  const fullTitle = title.includes('Tunay Wasi') ? title : `${title} | Tunay Wasi`
  const img = image ?? DEFAULT_OG_IMAGE
  const url = canonical ?? BASE_URL
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={img} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={img} />
    </Helmet>
  )
}

const AppONE: React.FC = () => {
  useTheme()
  const isDemo = new URLSearchParams(window.location.search).get('demo') === '1'
  const { user, usuarioONE, loading, isAdmin } = useAuthONE(isDemo)
  const hash = useHash()

  const [carritoItems, setCarritoItems] = useState<ItemCarrito[]>(leerCarritoStorage)
  const [kitSeleccionados, setKitSeleccionados] = useState<Set<string>>(new Set())
  const [kitConfirmando, setKitConfirmando] = useState(false)
  const [portalTabNeg, setPortalTabNeg] = useState('mis_compras')
  const [portalTabCaf, setPortalTabCaf] = useState('productos')
  const [catalogoSearch, setCatalogoSearch] = useState('')

  // ── Modal cotización (para cuando CatalogoPublico se usa fuera del portal) ──
  const [modalCotizProducto, setModalCotizProducto] = useState<ProductoONE | null>(null)
  const [cotizForm, setCotizForm] = useState({ kg: '', precioCents: '', plazo: '', mensaje: '' })
  const [cotizEnviando, setCotizEnviando] = useState(false)
  const [cotizToast, setCotizToast] = useState<{ msg: string; tipo: 'ok' | 'error' } | null>(null)

  function showCotizToast(msg: string, tipo: 'ok' | 'error' = 'ok') {
    setCotizToast({ msg, tipo })
    setTimeout(() => setCotizToast(null), 3000)
  }

  async function handleEnviarCotizacion() {
    if (!modalCotizProducto || !user) return
    const kg     = parseFloat(cotizForm.kg)
    const precio = parseFloat(cotizForm.precioCents)
    if (!kg || kg <= 0)        { showCotizToast('Ingresa una cantidad válida', 'error'); return }
    if (!precio || precio <= 0) { showCotizToast('Ingresa un precio válido', 'error'); return }
    if (!cotizForm.plazo.trim()) { showCotizToast('Indica el plazo de entrega', 'error'); return }
    setCotizEnviando(true)
    try {
      await createCotizacion({
        productoId:          modalCotizProducto.id,
        productoNombre:      modalCotizProducto.nombre,
        caficultorId:        modalCotizProducto.caficultorId,
        caficultorNombre:    modalCotizProducto.caficultorNombre ?? '',
        negocioId:           user.uid,
        negocioNombre:       usuarioONE?.nombre ?? user.displayName ?? '',
        negocioRazonSocial:  usuarioONE?.empresa?.razonSocial ?? usuarioONE?.nombre ?? '',
        kgSolicitados:       kg,
        precioOfertadoCents: Math.round(precio * 100),
        plazoEntrega:        cotizForm.plazo.trim(),
        mensaje:             cotizForm.mensaje.trim(),
      })
      showCotizToast('Cotización enviada. El caficultor responderá en 72 h.', 'ok')
      setModalCotizProducto(null)
      setCotizForm({ kg: '', precioCents: '', plazo: '', mensaje: '' })
    } catch (err) {
      console.error('[Cotizacion] Error al enviar cotización:', err)
      showCotizToast('Error al enviar cotización', 'error')
    } finally {
      setCotizEnviando(false)
    }
  }

  // Badge en avatar: cuenta novedades no vistas en pedidos activos
  const BADGE_SEEN_KEY = 'one_badge_seen_states' // JSON: { [pedidoId]: "pagoStatus|logisticaStatus" }
  const [avatarBadge, setAvatarBadge] = useState(0)

  // Fetch periódico de pedidos para detectar cambios de estado no vistos
  useEffect(() => {
    if (!usuarioONE || usuarioONE.rol === 'admin') return
    let cancelled = false

    // Dev helper: desde consola → window.__tw_mock_badge(2) para forzar badge
    if (import.meta.env.DEV) {
      (window as any).__tw_mock_badge = (n: number) => setAvatarBadge(n)
    }

    async function checkBadge() {
      try {
        const { fetchPedidosByNegocio, fetchPedidosByCaficultor } = await import('./one/service')
        let pedidos = usuarioONE!.rol === 'seller'
          ? await fetchPedidosByCaficultor(usuarioONE!.uid)
          : await fetchPedidosByNegocio(usuarioONE!.uid)
        if (cancelled) return

        // En dev: si no hay pedidos reales, inyectar mock según rol para visualizar el badge
        if (import.meta.env.DEV && pedidos.length === 0) {
          pedidos = usuarioONE!.rol === 'seller'
            ? [
                { id: 'mock-pedido-1', pagoStatus: 'voucher_subido', logisticaStatus: 'preparando' } as any,
                { id: 'mock-pedido-2', pagoStatus: 'pendiente',      logisticaStatus: 'preparando' } as any,
              ]
            : [
                { id: 'mock-pedido-1', pagoStatus: 'verificado',  logisticaStatus: 'preparando' } as any,
                { id: 'mock-pedido-2', pagoStatus: 'pendiente',   logisticaStatus: 'en_agencia' } as any,
              ]
        }

        // Novedades según rol:
        // comprador → pago verificado/rechazado, envío despachado/entregado
        // caficultor → pedido nuevo (sin prev), voucher subido para revisar
        const esCaf = usuarioONE!.rol === 'seller'
        let seen: Record<string, string> = {}
        try { seen = JSON.parse(localStorage.getItem(BADGE_SEEN_KEY) ?? '{}') } catch { /* ok */ }

        let count = 0
        for (const p of pedidos) {
          const key = `${p.pagoStatus}|${p.logisticaStatus}`
          const prev = seen[p.id]
          if (prev === key) continue // sin cambio
          if (esCaf) {
            // caficultor: pedido nuevo o voucher listo para revisar
            if (!prev || p.pagoStatus === 'voucher_subido') count++
          } else {
            // comprador: pago confirmado/rechazado o paquete en movimiento
            if (p.pagoStatus === 'verificado' || p.pagoStatus === 'rechazado' ||
                p.logisticaStatus === 'en_agencia' || p.logisticaStatus === 'entregado') count++
          }
        }
        setAvatarBadge(count)
      } catch { /* red error — ignorar */ }
    }

    checkBadge()
    const id = setInterval(checkBadge, 60_000) // revisar cada 60s
    return () => { cancelled = true; clearInterval(id) }
  }, [usuarioONE?.uid])

  // Al entrar al portal: marcar todos los estados actuales como vistos
  useEffect(() => {
    if ((hash !== '#/portal' && hash !== '#/caficultor-portal') || !usuarioONE) return
    async function marcarVisto() {
      try {
        const { fetchPedidosByNegocio, fetchPedidosByCaficultor } = await import('./one/service')
        const pedidos = usuarioONE!.rol === 'seller'
          ? await fetchPedidosByCaficultor(usuarioONE!.uid)
          : await fetchPedidosByNegocio(usuarioONE!.uid)
        const seen: Record<string, string> = {}
        for (const p of pedidos) seen[p.id] = `${p.pagoStatus}|${p.logisticaStatus}`
        localStorage.setItem(BADGE_SEEN_KEY, JSON.stringify(seen))
        setAvatarBadge(0)
      } catch { /* ok */ }
    }
    marcarVisto()
  }, [hash, usuarioONE?.uid])

  function irAlCarritoPortal() {
    setPortalTabNeg('carrito')
    window.location.hash = '#/portal'
  }

  // Persistir carrito en localStorage en cada cambio
  useEffect(() => {
    guardarCarritoStorage(carritoItems)
    if (carritoItems.length > 0) {
      trackCarritoMeta('catalogo', { itemCount: carritoItems.length })
    }
  }, [carritoItems])

  function agregarAlCarrito(producto: ProductoONE, formato: FormatoONE = '1kg') {
    setCarritoItems(prev => {
      const existente = prev.find(i => i.producto.id === producto.id && i.formato === formato)
      const siguiente = existente
        ? prev.map(i => i.producto.id === producto.id && i.formato === formato ? { ...i, qty: i.qty + 1 } : i)
        : [...prev, { producto, formato, qty: 1 }]
      track('carrito_agregado', {
        productoId: producto.id,
        productoNombre: producto.nombre,
        caficultorId: producto.caficultorId,
        itemCount: siguiente.length,
      })
      return siguiente
    })
  }

  const hayCarrito = carritoItems.length > 0
  const totalCarritoCents = carritoItems.reduce((s, i) => {
    const precio = calcularPrecioFinal(i.producto.precioBaseKgCents, i.formato)
    return s + precio * i.qty
  }, 0)
  const carritoProductoIds = new Set(carritoItems.map(i => i.producto.id))

  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999, animation: 'splashIn 0.4s cubic-bezier(0.22,1,0.36,1) both' }}>
        {/* Anillos decorativos */}
        {[300, 460, 620].map((size, i) => (
          <div key={i} style={{ position: 'absolute', width: size, height: size, borderRadius: '50%', border: `1px solid rgba(201,110,75,${0.08 - i * 0.025})`, top: '50%', left: '50%', transform: 'translate(-50%, -55%)', pointerEvents: 'none' }} />
        ))}
        {/* Glow */}
        <div style={{ position: 'absolute', width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,110,75,0.12) 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%, -60%)', pointerEvents: 'none' }} />
        {/* Logo block */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 64, marginBottom: 18, lineHeight: 1 }}>☕</div>
          <div style={{ fontSize: 38, fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, color: '#f2e0cc', letterSpacing: '-0.01em', marginBottom: 8 }}>
            Tunay <span style={{ color: '#f2e0cc' }}>·</span> <span style={{ color: '#c96e4b' }}>Wasi</span>
          </div>
          <div style={{ fontSize: 12, color: '#6b6b6b', fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 48 }}>Del campo a tu negocio</div>
          {/* Dots pulsantes */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[0, 1, 2].map(d => (
              <div key={d} style={{ width: 7, height: 7, borderRadius: '50%', background: '#c96e4b', animation: `splashDot 1.2s ${d * 0.2}s ease-in-out infinite` }} />
            ))}
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 24, fontSize: 9, color: '#333', letterSpacing: '0.1em', fontFamily: 'JetBrains Mono, monospace' }}>v1.1.0</div>
        <style>{`
          @keyframes splashIn { from { opacity:0; transform:scale(0.88) } to { opacity:1; transform:scale(1) } }
          @keyframes splashDot { 0%,100%{opacity:0.25;transform:scale(1)} 50%{opacity:1;transform:scale(1.4)} }
        `}</style>
      </div>
    )
  }

  // ─── Helper: envuelve contenido con el header global ─────────────────────

  // Rutas que no muestran el header (fullscreen)
  const sinHeader = hash === '#/login' || hash === '#/login?registro=1' || hash === '#/registro-caficultor' || hash === '#/registro-emprendedor' || hash === '#/registro' || hash === '#/para-caficultores' || hash === '#/para-cafeterias'

  function withHeader(content: React.ReactNode) {
    if (sinHeader) return <>{content}</>
    return (
      <>
        <GlobalHeader
          carritoCount={carritoItems.length}
          onIrAlCheckout={() => {
            if (!user && !isDemo) { window.location.hash = '#/login' }
            else { irAlCarritoPortal() }
          }}
          usuarioONE={usuarioONE}
          hash={hash}
          avatarBadge={avatarBadge}
          portalTab={hash === '#/portal' ? portalTabNeg : hash === '#/caficultor-portal' ? portalTabCaf : undefined}
          onPortalTabChange={hash === '#/portal' ? setPortalTabNeg : hash === '#/caficultor-portal' ? setPortalTabCaf : undefined}
          searchValue={catalogoSearch}
          onSearchChange={setCatalogoSearch}
        />
        <style>{`
          :root { --header-h: 52px; }
          .header-search-catalog { display: block; }
          .header-search-mobile-row { display: none; }
          .header-search-row { display: none; }
          .header-producer-short { display: none; }
          .header-btn-short { display: none; }
          @media (max-width: 768px) {
            .header-search-catalog { display: none !important; }
            .header-search-mobile-row { display: block !important; }
            :root { --header-h: 90px; }
          }
          @media (max-width: 480px) {
            :root { --header-h: 52px; }
            .header-ubicacion { display: none !important; }
            .header-avatar-label { display: none !important; }
            .header-register-btn { display: none !important; }
            .header-producer-btn { display: none !important; }
            .header-login-btn { display: none !important; }
            .header-theme-dots { display: none !important; }
            .header-search-desktop { display: none !important; }
            .header-spacer-mobile { display: flex !important; }
            .header-search-row { display: none !important; }
            .header-logo { position: absolute; left: 50%; transform: translateX(-50%); }
          }
        `}</style>
        <div style={{ paddingTop: 'var(--header-h)' }}>
          {content}
          <Footer />
        </div>
      </>
    )
  }

  // ─── Rutas ────────────────────────────────────────────────────────────────

  if (hash.startsWith('#/caficultor/') && !hash.endsWith('/portal')) {
    const caficultorId = hash.replace('#/caficultor/', '')
    return withHeader(
      <>
        <PageMeta title="Perfil del caficultor" description="Conoce al caficultor, su finca y los cafés de especialidad que produce directamente." canonical={`${BASE_URL}/#/caficultor/${caficultorId}`} />
        <PerfilCaficultor caficultorId={caficultorId} isDemo={isDemo} />
      </>
    )
  }


  if (hash === '#/caficultores') {
    return withHeader(<PaginaCaficultores />)
  }

  if (hash === '#/para-caficultores') {
    return withHeader(
      <>
        <PageMeta title="Vende tu café a precio real — Para caficultores" description="Únete a Tunay Wasi y vende tu café de especialidad directamente a cafeterías y negocios." canonical={`${BASE_URL}/#/para-caficultores`} />
        <LandingCaficultores />
      </>
    )
  }

  if (hash === '#/para-cafeterias') {
    return withHeader(
      <>
        <PageMeta title="Abastece tu cafetería con café de especialidad — Para emprendedores" description="Compra café de especialidad directamente del caficultor peruano." canonical={`${BASE_URL}/#/para-cafeterias`} />
        <LandingEmprendedor />
      </>
    )
  }

  if (hash === '#/docs' || hash.startsWith('#/docs/')) {
    return withHeader(
      <>
        <PageMeta title="Documentación" description="Guías y documentación para caficultores y emprendedores en Tunay Wasi." canonical={`${BASE_URL}/#/docs`} />
        <DocsONE hash={hash} />
      </>
    )
  }

  if (hash === '#/soporte') {
    return withHeader(
      <>
        <PageMeta title="Soporte" description="¿Tienes alguna duda? El equipo de Tunay Wasi está aquí para ayudarte." canonical={`${BASE_URL}/#/soporte`} />
        <SoporteONE />
      </>
    )
  }

  if (hash === '#/terminos') {
    return withHeader(<><PageMeta title="Términos y Condiciones — Tunay Wasi" description="Condiciones de uso de la plataforma Tunay Wasi." canonical={`${BASE_URL}/#/terminos`} /><TerminosONE /></>)
  }

  if (hash === '#/contrato') {
    return withHeader(<><PageMeta title="Contrato de Comprador — Tunay Wasi" description="Condiciones específicas para compradores en Tunay Wasi." canonical={`${BASE_URL}/#/contrato`} /><ContratoCompradorONE /></>)
  }

  if (hash === '#/privacidad') {
    return withHeader(<><PageMeta title="Política de Privacidad — Tunay Wasi" description="Cómo tratamos tus datos personales en Tunay Wasi." canonical={`${BASE_URL}/#/privacidad`} /><PrivacidadONE /></>)
  }

  if (hash === '#/reclamaciones') {
    return withHeader(<><PageMeta title="Libro de Reclamaciones — Tunay Wasi" description="Registra tu reclamo o queja conforme al D.Leg. 1510 y Ley 29571." canonical={`${BASE_URL}/#/reclamaciones`} /><LibroReclamacionesONE /></>)
  }

  if (hash === '#/armar-kit') {
    function handleKitConfirmar() {
      setKitConfirmando(true)
      setTimeout(() => {
        if (!user && !isDemo) {
          trackCarritoMeta('ir_a_login', { itemCount: carritoItems.length })
          window.location.hash = '#/login'
        } else {
          irAlCarritoPortal()
        }
        setKitConfirmando(false)
      }, 50)
    }

    return withHeader(
      <CatalogoPublico
        onSeleccionar={(producto, fmt) => agregarAlCarrito(producto, fmt ?? '1kg')}
        isDemo={isDemo}
        embeddedMode={true}
        modoSeleccion={{
          seleccionados: kitSeleccionados,
          max: 3,
          confirmando: kitConfirmando,
          onToggle: (p) => {
            setKitSeleccionados(prev => {
              const next = new Set(prev)
              if (next.has(p.id)) {
                next.delete(p.id)
                setCarritoItems(ci => ci.filter(i => i.producto.id !== p.id))
              } else if (next.size < 3) {
                next.add(p.id)
                agregarAlCarrito(p, '1kg')
              }
              return next
            })
          },
          onConfirmar: handleKitConfirmar,
        }}
      />
    )
  }

  if (hash === '#/registro-caficultor') {
    return (
      <>
        <PageMeta title="Regístrate como caficultor" description="Crea tu perfil de caficultor en Tunay Wasi y empieza a vender tu café de especialidad." canonical={`${BASE_URL}/#/registro-caficultor`} />
        <RegistroCaficultor isDemo={isDemo} />
      </>
    )
  }

  if (hash === '#/registro') {
    return (
      <>
        <PageMeta title="Crear cuenta" description="Crea tu cuenta en Tunay Wasi para comprar café de especialidad directo del productor." canonical={`${BASE_URL}/#/registro`} />
        <RegistroConsumidor isDemo={isDemo} />
      </>
    )
  }

  if (hash === '#/registro-emprendedor') {
    return (
      <>
        <PageMeta title="Regístrate como negocio" description="Crea tu cuenta de negocio en Tunay Wasi y accede al catálogo." canonical={`${BASE_URL}/#/registro-emprendedor`} />
        <RegistroEmprendedor isDemo={isDemo} />
      </>
    )
  }

  // Limpiar flag de pedido confirmado al salir del checkout
  if (hash !== '#/checkout') {
    sessionStorage.removeItem('one_pedido_confirmado')
  }

  if (hash === '#/checkout') {
    if (!user && !isDemo) {
      trackCarritoMeta('login_requerido', { itemCount: carritoItems.length })
      track('login_requerido', { itemCount: carritoItems.length, pasoDesde: 'checkout' })
      window.location.hash = '#/login'
      return null
    }
    trackCarritoMeta('checkout', { itemCount: carritoItems.length })
    track('checkout_inicio', { itemCount: carritoItems.length, totalCents: totalCarritoCents })
    return (hayCarrito || sessionStorage.getItem('one_pedido_confirmado'))
      ? withHeader(<CheckoutONE
          items={carritoItems}
          usuarioId={user?.uid ?? DEMO_USER.uid}
          usuarioNombre={usuarioONE?.nombre ?? user?.displayName ?? 'Negocio'}
          usuarioEmail={user?.email ?? ''}
          usuarioTelefono={usuarioONE?.telefono ?? ''}
          nombreLocalInicial={usuarioONE?.negocio?.nombreLocal ?? ''}
          distritoLocalInicial={usuarioONE?.negocio?.distritoLocal ?? ''}
          isDemo={isDemo}
          rolUsuario={(usuarioONE?.rol === 'buyer_b2b' ? 'buyer_b2b' : usuarioONE?.rol === 'buyer_b2c' ? 'buyer_b2c' : null) ?? null}
          estadoAprobacionB2B={usuarioONE?.empresa?.estadoAprobacion ?? null}
          rucEmpresa={usuarioONE?.empresa?.ruc ?? null}
          razonSocialEmpresa={usuarioONE?.empresa?.razonSocial ?? null}
          onPasoChange={(paso) => {
            trackCarritoMeta(paso, { itemCount: carritoItems.length })
            track(paso === 'paso2_pago' ? 'checkout_paso2' : 'checkout_inicio', { itemCount: carritoItems.length })
          }}
          onPedidoConfirmado={() => {
            track('checkout_confirmado', { itemCount: carritoItems.length, totalCents: totalCarritoCents })
            sessionStorage.setItem('one_pedido_confirmado', '1')
            localStorage.removeItem(CARRITO_KEY)
            localStorage.removeItem(CARRITO_META_KEY)
            setCarritoItems([])
          }}
        />)
      : withHeader(<CatalogoPublico
          onSeleccionar={(p, fmt) => { agregarAlCarrito(p, fmt) }}
          carritoCount={carritoItems.length}
          totalCarritoCents={totalCarritoCents}
          carritoProductoIds={carritoProductoIds}
          carritoLineas={carritoItems}
          onIrAlCheckout={() => { window.location.hash = '#/checkout' }}
          isDemo={isDemo}
          embeddedMode={true}
          rolUsuario={usuarioONE?.rol ?? null}
          userNombre={usuarioONE?.nombre ?? user?.displayName ?? null}
          userUid={user?.uid ?? null}
          estadoAprobacionB2B={usuarioONE?.empresa?.estadoAprobacion ?? null}
        />)
  }

  if (hash === '#/portal') {
    if (!user && !isDemo) {
      window.location.hash = '#/login'
      return null
    }
    // Sin doc en Firestore — registro Google incompleto, debe elegir rol
    if (user && !usuarioONE && !isDemo) {
      window.location.hash = '#/login'
      return null
    }
    // TIPO-02 INVARIANTE: caficultor no accede al portal de negocio
    if (usuarioONE?.rol === 'seller') {
      window.location.hash = '#/caficultor-portal'
      return null
    }
    track('portal_negocio_visto', { rolUsuario: usuarioONE?.rol ?? 'buyer_b2b' })
    return withHeader(
      <PortalEmprendedor
        usuarioId={user?.uid ?? DEMO_USER.uid}
        nombreUsuario={usuarioONE?.nombre ?? user?.displayName ?? 'Negocio'}
        isDemo={isDemo}
        tab={portalTabNeg as Parameters<typeof PortalEmprendedor>[0]['tab']}
        onTabChange={setPortalTabNeg}
      />
    )
  }

  if (hash === '#/caficultor-portal' || hash === '#/portal-caficultores') {
    if (!user && !isDemo) {
      window.location.hash = '#/login'
      return null
    }
    if (user && !usuarioONE && !isDemo) {
      window.location.hash = '#/login'
      return null
    }
    track('portal_caficultor_visto', { rolUsuario: 'seller' })
    const caficultorId = user?.uid ?? DEMO_USER.uid
    return withHeader(
      <PortalCaficultor
        usuarioId={user?.uid ?? DEMO_USER.uid}
        caficultorId={caficultorId}
        isDemo={isDemo}
        tab={portalTabCaf as Parameters<typeof PortalCaficultor>[0]['tab']}
        onTabChange={setPortalTabCaf}
      />
    )
  }

  if (hash === '#/admin') {
    if (!isAdmin && !isDemo) {
      window.location.hash = '#/'
      return null
    }
    return withHeader(<AdminONE isDemo={isDemo} />)
  }

  if (hash === '#/login' || hash === '#/login?registro=1') {
    track('login_iniciado', { itemCount: carritoItems.length })
    if (user || isDemo) {
      if (hayCarrito) {
        irAlCarritoPortal()
        return null
      }
      // user logueado pero sin doc en Firestore — registro Google incompleto, debe completar rol
      // Renderizar AuthScreen directamente para que el flujo continúe sin pantalla en blanco
      if (!usuarioONE) {
        return (
          <AuthScreen
            onSuccess={() => { /* AuthScreen maneja la redirección directamente */ }}
            pasoInicial="seleccion_rol_registro"
          />
        )
      }
      if (usuarioONE.rol === 'seller') {
        window.location.hash = '#/caficultor-portal'
      } else if (usuarioONE.rol === 'admin' || isAdmin) {
        window.location.hash = '#/admin'
      } else {
        window.location.hash = '#/portal'
      }
      return null
    }
    return (
      <AuthScreen
        mensajePrevia={hayCarrito ? 'Para continuar con tu pedido, ingresa o crea tu cuenta.' : undefined}
        onSuccess={() => { /* AuthScreen maneja la redirección directamente */ }}
        pasoInicial={hash === '#/login?registro=1' ? 'seleccion_rol_registro' : 'inicio'}
      />
    )
  }

  // Ruta por defecto: catálogo público
  return withHeader(
    <>
      <PageMeta
        title="Tunay Wasi — Café de especialidad con transparencia radical"
        description="Compra café de especialidad directamente del caficultor peruano. Lavado, Natural, Honey. Trazabilidad completa, precio justo y despacho directo desde el origen."
        canonical={BASE_URL}
      />
      <CatalogoPublico
        onSeleccionar={(producto, fmt) => { agregarAlCarrito(producto, fmt) }}
        carritoCount={carritoItems.length}
        totalCarritoCents={totalCarritoCents}
        carritoProductoIds={carritoProductoIds}
        carritoLineas={carritoItems}
        isDemo={isDemo}
        embeddedMode={true}
        rolUsuario={usuarioONE?.rol ?? null}
        userNombre={usuarioONE?.nombre ?? user?.displayName ?? null}
        userUid={user?.uid ?? null}
        estadoAprobacionB2B={usuarioONE?.empresa?.estadoAprobacion ?? null}
        searchValue={catalogoSearch}
        onSearchChange={setCatalogoSearch}
        onSolicitarCotizacion={(producto) => {
          if (!user && !isDemo) {
            window.location.hash = '#/login'
            return
          }
          setModalCotizProducto(producto)
          setCotizForm({ kg: '', precioCents: '', plazo: '', mensaje: '' })
        }}
        onIrAlCheckout={() => {
          if (!user && !isDemo) {
            trackCarritoMeta('ir_a_login', { itemCount: carritoItems.length })
            track('checkout_intentado', { itemCount: carritoItems.length, pasoDesde: 'catalogo', totalCents: totalCarritoCents })
            window.location.hash = '#/login'
          } else {
            track('checkout_intentado', { itemCount: carritoItems.length, totalCents: totalCarritoCents })
            irAlCarritoPortal()
          }
        }}
      />

      {/* ── Modal solicitar cotización (catálogo fuera del portal) ── */}
      {modalCotizProducto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 16 }}>
          <div style={{ background: 'var(--tw-card)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 420, border: '1px solid var(--tw-border)', fontFamily: 'Montserrat, sans-serif' }}>
            <h3 style={{ margin: '0 0 4px', fontFamily: 'Cormorant Garamond, serif', fontSize: 20, color: 'var(--tw-text)' }}>Solicitar cotización</h3>
            <p style={{ fontSize: 12, color: 'var(--tw-terra)', marginBottom: 20 }}>{modalCotizProducto.nombre} · {modalCotizProducto.caficultorNombre}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--tw-text-muted)', display: 'block', marginBottom: 4 }}>Cantidad (kg)</label>
                <input type="number" min="1" value={cotizForm.kg}
                  onChange={e => setCotizForm(f => ({ ...f, kg: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--tw-border)', background: 'var(--tw-bg)', color: 'var(--tw-text)', fontSize: 13, fontFamily: 'Montserrat, sans-serif' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--tw-text-muted)', display: 'block', marginBottom: 4 }}>Precio ofertado por kg (S/)</label>
                <input type="number" step="0.01" min="0" value={cotizForm.precioCents}
                  onChange={e => setCotizForm(f => ({ ...f, precioCents: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--tw-border)', background: 'var(--tw-bg)', color: 'var(--tw-text)', fontSize: 13, fontFamily: 'Montserrat, sans-serif' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--tw-text-muted)', display: 'block', marginBottom: 4 }}>Plazo de entrega requerido</label>
                <input type="text" placeholder="Ej: 15 días" value={cotizForm.plazo}
                  onChange={e => setCotizForm(f => ({ ...f, plazo: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--tw-border)', background: 'var(--tw-bg)', color: 'var(--tw-text)', fontSize: 13, fontFamily: 'Montserrat, sans-serif' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--tw-text-muted)', display: 'block', marginBottom: 4 }}>Mensaje / condiciones adicionales (opcional)</label>
                <textarea rows={3} value={cotizForm.mensaje}
                  onChange={e => setCotizForm(f => ({ ...f, mensaje: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--tw-border)', background: 'var(--tw-bg)', color: 'var(--tw-text)', fontSize: 13, fontFamily: 'Montserrat, sans-serif', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={handleEnviarCotizacion} disabled={cotizEnviando}
                style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: cotizEnviando ? 'default' : 'pointer', opacity: cotizEnviando ? 0.6 : 1, fontFamily: 'Montserrat, sans-serif' }}>
                {cotizEnviando ? 'Enviando...' : 'Enviar cotización →'}
              </button>
              <button onClick={() => setModalCotizProducto(null)}
                style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid var(--tw-border)', background: 'none', color: 'var(--tw-text-muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast del modal de cotización */}
      {cotizToast && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, background: cotizToast.tipo === 'ok' ? 'rgba(143,175,138,.95)' : 'rgba(239,68,68,.95)', color: '#fff', borderRadius: 10, padding: '10px 16px', fontSize: 12, fontWeight: 700, zIndex: 1000, fontFamily: 'Montserrat, sans-serif', boxShadow: '0 4px 20px rgba(0,0,0,.3)' }}>
          {cotizToast.msg}
        </div>
      )}
    </>
  )
}

export default AppONE
