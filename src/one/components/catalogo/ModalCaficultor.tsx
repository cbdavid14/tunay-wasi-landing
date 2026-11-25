import React from 'react'

const CAFICULTORES_DATA = [
  { id:1, nombre:'Jorge Quispe Condori', finca:'Finca Vista Hermosa', distrito:'San Ignacio', region:'Cajamarca', altitud:1850, ha:3, años:12, sca:86, lotes:4, variedades:['Gesha','Caturra'], procesos:['Lavado','Honey'], foto_emoji:'🌄', bio_corta:'"Productor de microlotes de especialidad en las alturas de San Ignacio. Jorge trabaja con proceso Lavado y Honey, obteniendo perfiles cítricos y florales únicos."', bio:'Jorge Quispe Condori lleva 12 años cultivando café en las alturas de San Ignacio, Cajamarca. Su finca Vista Hermosa, situada a 1850 msnm, produce microlotes de alta calidad gracias a la dedicación familiar y un terroir privilegiado.', impacto:'Con el sobreprecio pagado por cada lote, Jorge reinvierte en infraestructura de beneficio húmedo y en la educación de sus hijos, fortaleciendo la finca para la próxima generación.' },
  { id:2, nombre:'María Condori Quispe', finca:'Finca El Sol', distrito:'Pisac', region:'Cusco', altitud:1720, ha:2, años:8, sca:83, lotes:3, variedades:['Caturra','Typica'], procesos:['Natural'], foto_emoji:'🌿', bio_corta:'"Productora de cafés naturales con perfil frutal intenso en el Valle Sagrado de Cusco. María fue la primera mujer de su comunidad en exportar café de especialidad."', bio:'María Condori Quispe es una de las pocas productoras de café de especialidad del Valle Sagrado del Cusco. Su finca El Sol, a 1720 msnm, se especializa en proceso Natural que resalta las notas de fresa y miel características de la variedad Caturra cusqueña.', impacto:'El 100% del sobreprecio pagado a María financia el acceso a agua potable para su comunidad de 40 familias productoras, un proyecto que ella lidera desde 2023.' },
  { id:3, nombre:'Pedro Huanca Mamani', finca:'Finca Lomas Altas', distrito:'Sandia', region:'Puno', altitud:1950, ha:4, años:15, sca:84, lotes:5, variedades:['Typica','Bourbon'], procesos:['Honey','Natural'], foto_emoji:'⛰️', bio_corta:'"Caficultor con 15 años de experiencia en las alturas de Sandia, Puno. Pedro es referente del proceso Honey en la región, logrando notas de durazno y caramelo únicas."', bio:'Pedro Huanca Mamani cultiva café en Sandia, la zona cafetalera más alta de Puno, a casi 2000 msnm. Con 15 años de experiencia, desarrolló su propio protocolo de proceso Honey adaptado al clima frío de la región andina.', impacto:'Pedro comparte su técnica de proceso Honey con 8 productores vecinos, multiplicando el impacto del modelo de comercio directo en toda la provincia de Sandia.' },
  { id:4, nombre:'Ana Flores Vega', finca:'Finca Alta', distrito:'Moyobamba', region:'San Martín', altitud:1600, ha:5, años:10, sca:88, lotes:6, variedades:['Bourbon','Sidra'], procesos:['Lavado'], foto_emoji:'🌱', bio_corta:'"Productora de Bourbon y Sidra en Moyobamba, San Martín. El Bourbon Washed de Ana alcanzó 88 SCA en la cata de 2025, el puntaje más alto de la región."', bio:'Ana Flores Vega gestiona Finca Alta en Moyobamba, San Martín, donde cultiva variedades Premium como Bourbon y Sidra bajo sombra de árboles nativos. Su Bourbon Lavado obtuvo 88 puntos SCA en la cata independiente de 2025.', impacto:'Ana lidera la primera asociación de mujeres cafetaleras de Moyobamba, integrando a 12 productoras que ahora acceden directamente a compradores de especialidad.' },
  { id:5, nombre:'Carlos Vega Ríos', finca:'Finca Bella', distrito:'La Coipa', region:'Cajamarca', altitud:1780, ha:2, años:7, sca:91, lotes:2, variedades:['Gesha'], procesos:['Natural'], foto_emoji:'✨', bio_corta:'"Productor de Gesha Natural en La Coipa, Cajamarca. El lote de Carlos alcanzó 91 SCA, el más alto del catálogo de TunayWasi, con notas de frambuesa, bergamota y flores."', bio:'Carlos Vega Ríos produce Gesha Natural en su pequeña finca de 2 hectáreas en La Coipa, Cajamarca. A sus 7 años de experiencia, Carlos ha logrado el puntaje SCA más alto del catálogo de TunayWasi con su lote de Gesha Natural 2025.', impacto:'Carlos invierte el sobreprecio de sus lotes en la compra de equipos de fermentación controlada, mejorando la consistencia de sus cafés y sirviendo como modelo para otros productores jóvenes de La Coipa.' },
]

const PROC_CHIP: Record<string, { bg: string; color: string; border: string }> = {
  Lavado:  { bg: 'rgba(59,130,246,.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,.3)' },
  Natural: { bg: 'rgba(239,68,68,.15)',  color: '#f87171', border: '1px solid rgba(239,68,68,.3)' },
  Honey:   { bg: 'rgba(245,158,11,.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,.3)' },
}

interface Props {
  caficultorId: number
  onClose: () => void
}

export const ModalCaficultor: React.FC<Props> = ({ caficultorId, onClose }) => {
  const [currentId, setCurrentId] = React.useState(caficultorId)

  const c = CAFICULTORES_DATA.find(x => x.id === currentId)!
  const idx = CAFICULTORES_DATA.findIndex(x => x.id === currentId)
  const num = String(idx + 1).padStart(2, '0')
  const total = String(CAFICULTORES_DATA.length).padStart(2, '0')
  const goTo = (dir: 1 | -1) => {
    const next = CAFICULTORES_DATA[(idx + dir + CAFICULTORES_DATA.length) % CAFICULTORES_DATA.length]
    setCurrentId(next.id)
  }
  const chipVar: React.CSSProperties = {
    display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
    background: 'rgba(242,224,204,.1)', color: 'var(--tw-text)', border: '1px solid rgba(242,224,204,.2)',
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontFamily: 'Montserrat, sans-serif' }}
    >
      <div style={{ background: '#111', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 680, maxHeight: '92vh', overflowY: 'auto', position: 'relative', border: '1px solid #2a2a2a', borderBottom: 'none', scrollbarWidth: 'none' }}>
        {/* Hero */}
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: 'linear-gradient(135deg,#0d1f0d,#1a3020,#0a1a0a)', flexShrink: 0, overflow: 'hidden' }}>
          <div style={{ fontSize: 72, filter: 'drop-shadow(0 4px 16px rgba(0,0,0,.5))' }}>{c.foto_emoji}</div>
          <div style={{ position: 'absolute', top: 12, left: 14, color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em' }}>N° {num} / {total}</div>
          <div style={{ position: 'absolute', top: 12, right: 44, background: '#c96e4b', color: '#fff', fontSize: 10, fontWeight: 700, padding: '5px 12px', borderRadius: 20, letterSpacing: '0.04em' }}>SCA {c.sca} · Cata lote 2025</div>
          <button onClick={onClose} style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(255,255,255,.2)', background: 'rgba(0,0,0,.5)', color: '#fff', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          <button onClick={() => goTo(-1)} style={{ position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,.25)', background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
          <button onClick={() => goTo(1)} style={{ position: 'absolute', top: '50%', right: 10, transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,.25)', background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
        </div>
        {/* Body */}
        <div style={{ padding: '24px 20px 36px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#8faf8a', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 5 }}>{c.region.toUpperCase()} · {c.distrito.toUpperCase()}</div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 700, color: '#f2e0cc', lineHeight: 1.1, marginBottom: 7 }}>{c.nombre}</div>
          <div style={{ fontSize: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
            <em style={{ color: '#c96e4b', fontStyle: 'italic' }}>{c.finca}</em>
            <span style={{ color: '#333' }}>·</span>
            <span style={{ color: '#888' }}>📍 {c.distrito}, {c.region}</span>
          </div>
          {/* Quote */}
          <div style={{ borderLeft: '3px solid #c96e4b', padding: '10px 14px', marginBottom: 16, background: 'rgba(201,110,75,.05)', borderRadius: '0 7px 7px 0' }}>
            <p style={{ fontSize: 13, fontStyle: 'italic', color: '#8faf8a', lineHeight: 1.65, margin: 0 }}>{c.bio_corta}</p>
          </div>
          {/* Bio */}
          <p style={{ fontSize: 13, color: '#c4b297', lineHeight: 1.7, marginBottom: 20 }}>{c.bio}</p>
          {/* Impacto */}
          <div style={{ background: 'rgba(15,30,18,.8)', border: '1px solid rgba(143,175,138,.25)', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: '#8faf8a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7 }}>
              <span>🌿</span><span>Impacto Social</span>
            </div>
            <p style={{ fontSize: 12, color: '#c4b297', lineHeight: 1.65, margin: 0 }}>{c.impacto}</p>
          </div>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', border: '1px solid #2a2a2a', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '14px 10px', textAlign: 'center', borderRight: '1px solid #2a2a2a' }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 34, fontWeight: 700, color: '#f2e0cc', lineHeight: 1 }}>{c.años}</div>
              <div style={{ fontSize: 8, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 3 }}>Años de exp.</div>
            </div>
            <div style={{ padding: '14px 10px', textAlign: 'center', borderRight: '1px solid #2a2a2a' }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 34, fontWeight: 700, color: '#f2e0cc', lineHeight: 1 }}>{c.ha}</div>
              <div style={{ fontSize: 8, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 3 }}>Ha de cafetal</div>
            </div>
            <div style={{ padding: '14px 10px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontWeight: 700, color: '#c96e4b', lineHeight: 1.2 }}>SCA {c.sca} ·<br/>Cata lote 2025</div>
              <div style={{ fontSize: 8, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>Cata confirmada</div>
            </div>
          </div>
          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 22 }}>
            <span style={{ fontSize: 11, color: '#888', fontWeight: 600, marginRight: 2 }}>Variedades:</span>
            {c.variedades.map(v => <span key={v} style={chipVar}>{v}</span>)}
            <span style={{ fontSize: 11, color: '#888', fontWeight: 600, marginLeft: 6, marginRight: 2 }}>Procesos:</span>
            {c.procesos.map(p => {
              const s = PROC_CHIP[p] ?? { bg: 'rgba(255,255,255,.1)', color: '#fff', border: '1px solid rgba(255,255,255,.2)' }
              return <span key={p} style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, border: s.border }}>{p}</span>
            })}
          </div>
          {/* CTAs */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '13px', borderRadius: 10, border: 'none', background: '#c96e4b', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
              Ver cafés de {c.nombre.split(' ')[0]} →
            </button>
            <button onClick={() => window.open(`https://wa.me/51917959370?text=Hola, me interesa el café de ${c.nombre}`, '_blank')} style={{ flex: 1, padding: '13px', borderRadius: 10, border: '1px solid rgba(37,211,102,.4)', background: 'rgba(37,211,102,.08)', color: '#25d366', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
              💬 Contactar por WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
