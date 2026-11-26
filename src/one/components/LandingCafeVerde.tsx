/**
 * LandingCafeVerde.tsx — Landing SEO para keyword "comprar café verde Perú"
 * Ruta: /cafe-verde-peru
 * Objetivo: capturar búsqueda B2B de negocios que compran café verde sin tostar (TYPE_A)
 */
import React, { useState } from 'react'
import { navigate } from '@/router'

// ─── Átomos ───────────────────────────────────────────────────────────────────

const Chip: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'var(--tw-terra)' }) => (
  <span style={{
    display: 'inline-block', padding: '4px 14px', borderRadius: 20,
    background: `${color}18`, border: `1px solid ${color}44`,
    color, fontSize: 11, fontWeight: 700,
    fontFamily: 'Montserrat, sans-serif',
    letterSpacing: '0.1em', textTransform: 'uppercase',
  }}>
    {children}
  </span>
)

const H2: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 style={{
    fontFamily: 'Cormorant Garamond, serif',
    fontSize: 'clamp(26px, 3.8vw, 44px)',
    fontWeight: 700, color: 'var(--tw-text)',
    margin: '14px 0 0', lineHeight: 1.15,
  }}>
    {children}
  </h2>
)

// ─── Nav ──────────────────────────────────────────────────────────────────────

const Nav: React.FC = () => {
  const [open, setOpen] = React.useState(false)
  const close = () => setOpen(false)
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: `${'var(--tw-bg)'}ee`, backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${'var(--tw-border)'}`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 64,
      }}>
        <button onClick={() => { navigate('/'); close() }} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: 22, fontWeight: 700, color: 'var(--tw-text)',
        }}>
          TunayWasi
        </button>

        {/* Desktop links */}
        <div className="cv-nav-desktop" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: 'var(--tw-text-muted)' }}>Ver catálogo</button>
          <button onClick={() => navigate('/caficultores')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: 'var(--tw-text-muted)' }}>Caficultores</button>
          <button onClick={() => navigate('/soporte')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: 'var(--tw-sage)', fontWeight: 600 }}>Soporte</button>
          <button onClick={() => navigate('/registro-emprendedor')} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--tw-terra)', color: 'var(--tw-text-inverse)', fontSize: 13, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Registrar mi empresa
          </button>
        </div>

        {/* Hamburger mobile */}
        <button className="cv-nav-hamburger" onClick={() => setOpen(o => !o)} style={{
          display: 'none', background: 'none', border: 'none', cursor: 'pointer',
          padding: 8, color: 'var(--tw-text)',
        }}>
          {open
            ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          }
        </button>
      </div>

      {open && (
        <div className="cv-nav-mobile-menu" style={{
          display: 'none',
          flexDirection: 'column',
          padding: '12px 24px 20px',
          borderTop: `1px solid ${'var(--tw-border)'}`,
          gap: 4,
        }}>
          <button onClick={() => { navigate('/'); close() }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontSize: 15, color: 'var(--tw-text-muted)', textAlign: 'left', padding: '12px 0', borderBottom: `1px solid ${'var(--tw-border)'}22` }}>Ver catálogo</button>
          <button onClick={() => { navigate('/caficultores'); close() }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontSize: 15, color: 'var(--tw-text-muted)', textAlign: 'left', padding: '12px 0', borderBottom: `1px solid ${'var(--tw-border)'}22` }}>Caficultores</button>
          <button onClick={() => { navigate('/soporte'); close() }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontSize: 15, color: 'var(--tw-sage)', fontWeight: 600, textAlign: 'left', padding: '12px 0', borderBottom: `1px solid ${'var(--tw-border)'}22` }}>Soporte</button>
          <button onClick={() => { navigate('/registro-emprendedor'); close() }} style={{ marginTop: 8, padding: '13px', borderRadius: 8, border: 'none', background: 'var(--tw-terra)', color: 'var(--tw-text-inverse)', fontSize: 14, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', cursor: 'pointer' }}>
            Registrar mi empresa
          </button>
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .cv-nav-desktop { display: none !important; }
          .cv-nav-hamburger { display: flex !important; }
          .cv-nav-mobile-menu { display: flex !important; }
        }
      `}</style>
    </nav>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

const Hero: React.FC = () => (
  <section style={{
    position: 'relative',
    minHeight: '72vh',
    overflow: 'hidden',
    paddingTop: 64,
    display: 'flex',
    alignItems: 'center',
  }}>
    {/* Fondo */}
    <div style={{
      position: 'absolute', inset: 0,
      background: 'url(https://images.unsplash.com/photo-1587049352851-8d4e89133924?w=1400&q=80) center/cover no-repeat',
      filter: 'brightness(0.15)',
    }} />
    <div style={{
      position: 'absolute', inset: 0,
      background: `linear-gradient(135deg, ${'var(--tw-bg)'} 0%, ${'var(--tw-section-dark)'}88 60%, transparent 100%)`,
    }} />

    <div style={{
      position: 'relative', zIndex: 1,
      width: '100%', maxWidth: 760,
      margin: '0 auto', padding: '80px 32px',
      boxSizing: 'border-box',
    }}>
      <Chip>Plataforma B2B · Café Verde Peruano</Chip>

      <h1 style={{
        fontFamily: 'Cormorant Garamond, serif',
        fontSize: 'clamp(36px, 5.5vw, 66px)',
        fontWeight: 700, color: 'var(--tw-text)',
        margin: '20px 0 20px', lineHeight: 1.08,
      }}>
        Compra Café Verde Peruano<br />
        <span style={{ color: 'var(--tw-terra)' }}>Directo del Productor</span>
      </h1>

      <p style={{
        fontFamily: 'Montserrat, sans-serif',
        fontSize: 'clamp(14px, 1.6vw, 17px)',
        color: 'var(--tw-text-muted)', lineHeight: 1.75,
        maxWidth: 540, margin: '0 0 36px',
      }}>
        TunayWasi conecta tostadores, importadores y cafeterías con caficultores
        peruanos. Accede a lotes de café verde sin tostar con trazabilidad completa
        de origen, proceso y altitud — sin intermediarios.
      </p>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '14px 32px', borderRadius: 10, border: 'none',
            background: `linear-gradient(135deg, ${'var(--tw-terra)'} 0%, ${'var(--tw-terra-h)'} 100%)`,
            color: 'var(--tw-text-inverse)',
            fontSize: 15, fontWeight: 700, fontFamily: 'Montserrat, sans-serif',
            cursor: 'pointer', boxShadow: `0 4px 24px ${'var(--tw-terra)'}44`,
          }}
        >
          Ver catálogo de café verde →
        </button>
        <button
          onClick={() => navigate('/registro-emprendedor')}
          style={{
            padding: '14px 32px', borderRadius: 10,
            border: `1px solid ${'var(--tw-border)'}`,
            background: 'transparent',
            color: 'var(--tw-text-muted)',
            fontSize: 15, fontWeight: 700, fontFamily: 'Montserrat, sans-serif',
            cursor: 'pointer',
          }}
        >
          Registrar mi empresa
        </button>
      </div>

      <p style={{
        marginTop: 16,
        fontFamily: 'Montserrat, sans-serif', fontSize: 12,
        color: 'var(--tw-text-faint)',
      }}>
        Registro de empresa gratuito · Aprobación en 24-48 h · Acceso directo al catálogo
      </p>
    </div>
  </section>
)

// ─── Sección: ¿Qué es el café verde? ─────────────────────────────────────────

const SeccionQueEsCafeVerde: React.FC = () => (
  <section style={{ background: 'var(--tw-bg-alt)', padding: '80px 24px' }}>
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <Chip color="var(--tw-sage)">Guía</Chip>
      <H2>¿Qué es el café verde?</H2>
      <p style={{
        fontFamily: 'Montserrat, sans-serif', fontSize: 15,
        color: 'var(--tw-text-muted)', lineHeight: 1.8,
        maxWidth: 680, margin: '20px 0 24px',
      }}>
        El café verde es el grano de café en su estado natural: cosechado, despulpado
        y secado, pero <strong style={{ color: 'var(--tw-text)' }}>sin pasar por el proceso de tostado</strong>.
        Al no estar tostado, conserva íntegramente los perfiles de origen — las
        características que definen la región, la variedad y el proceso de beneficio
        de cada finca. Es la materia prima que eligen los tostadores artesanales,
        las cafeterías con tostadora propia y los importadores de especialidad.
      </p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16, marginTop: 36,
      }}>
        {[
          { icono: '🌿', titulo: 'Perfil de origen intacto', texto: 'Sin tostar, el grano mantiene todas las notas de sabor que definirás tú con tu propio perfil de tueste.' },
          { icono: '📦', titulo: 'Vida útil extendida', texto: 'El café verde puede almacenarse 12 a 18 meses en condiciones adecuadas, frente a los 6 meses del tostado.' },
          { icono: '🏭', titulo: 'Control total del tueste', texto: 'El tostador define temperatura, tiempo y desarrollo. El café verde es el punto de partida de cualquier tostado de especialidad.' },
        ].map(item => (
          <div key={item.titulo} style={{
            background: 'var(--tw-card)', border: '1px solid var(--tw-border)',
            borderRadius: 14, padding: 24,
          }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{item.icono}</div>
            <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 6 }}>{item.titulo}</h3>
            <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: 'var(--tw-text-muted)', lineHeight: 1.65, margin: 0 }}>{item.texto}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
)

// ─── Sección: Café verde peruano de especialidad ──────────────────────────────

const REGIONES = [
  { nombre: 'Cajamarca', altitud: '1 600 – 2 000 msnm', variedad: 'Gesha, Caturra, Pache', nota: 'Perfiles cítricos y florales, alta acidez brillante.' },
  { nombre: 'San Martín', altitud: '1 400 – 1 800 msnm', variedad: 'Bourbon, Sidra, Caturra', nota: 'Notas frutales intensas; zona con mayor producción de especialidad.' },
  { nombre: 'Puno (Sandia)', altitud: '1 700 – 2 000 msnm', variedad: 'Typica, Bourbon', nota: 'Una de las zonas más altas del país; perfiles complejos con cuerpo pronunciado.' },
  { nombre: 'Cusco', altitud: '1 500 – 1 900 msnm', variedad: 'Caturra, Typica', nota: 'Influencia andina; cafés con dulzor natural y acidez suave.' },
  { nombre: 'Junín (Valle del Mantaro)', altitud: '1 500 – 1 850 msnm', variedad: 'Bourbon, Caturra', nota: 'Zona emergente con microlotes de proceso Honey en crecimiento.' },
]

const SeccionCafeVerdePeruano: React.FC = () => (
  <section style={{ background: 'var(--tw-bg)', padding: '80px 24px' }}>
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Chip>Origen</Chip>
      <H2>Café verde peruano de especialidad</H2>
      <p style={{
        fontFamily: 'Montserrat, sans-serif', fontSize: 15,
        color: 'var(--tw-text-muted)', lineHeight: 1.75,
        maxWidth: 640, margin: '18px 0 40px',
      }}>
        Perú es uno de los principales productores de café de especialidad de América
        Latina. Las regiones andinas ofrecen una diversidad excepcional de varietales,
        altitudes y procesos — desde cafés lavados de perfil cítrico en Cajamarca hasta
        naturales con notas tropicales en San Martín.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {REGIONES.map(r => (
          <div key={r.nombre} style={{
            background: 'var(--tw-card)', border: '1px solid var(--tw-border)',
            borderRadius: 12, padding: '18px 20px',
            display: 'grid', gridTemplateColumns: '1fr auto',
            gap: 12, alignItems: 'start',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontWeight: 700, color: 'var(--tw-text)' }}>{r.nombre}</span>
                <span style={{ fontSize: 11, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>· {r.altitud}</span>
              </div>
              <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: 'var(--tw-text-muted)', margin: '0 0 4px', lineHeight: 1.6 }}>{r.nota}</p>
              <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: 'var(--tw-sage)', margin: 0 }}>Varietales: {r.variedad}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
)

// ─── Sección: Cómo comprar lotes ──────────────────────────────────────────────

const PASOS = [
  {
    n: '1',
    titulo: 'Regístrate como negocio (B2B)',
    texto: 'Crea tu cuenta de empresa con tu RUC y datos de contacto. El registro es gratuito y solo toma unos minutos. Necesitas una cuenta empresa para acceder al catálogo de café verde sin tostar.',
    color: '#c96e4b',
  },
  {
    n: '2',
    titulo: 'Aprobación en 24-48 h',
    texto: 'El equipo de TunayWasi revisa tu solicitud para verificar que eres un negocio legítimo. Una vez aprobado, tendrás acceso completo al catálogo de lotes de café verde sin tostar (TYPE_A).',
    color: '#c96e4b',
  },
  {
    n: '3',
    titulo: 'Accede al catálogo de café verde',
    texto: 'Explora los lotes disponibles. Cada ficha muestra: variedad, altitud, región, proceso (Lavado / Natural / Honey), cosecha, nivel de evidencia de calidad (N1 / N2 / N3) y el perfil del caficultor.',
    color: '#8faf8a',
  },
  {
    n: '4',
    titulo: 'Cotiza directamente con el caficultor',
    texto: 'Envía una solicitud de cotización al caficultor indicando el volumen que necesitas y el plazo de entrega. El caficultor responde en 72 h. El pago va a TunayWasi en custodia — se libera al productor cuando confirmas la entrega.',
    color: '#8faf8a',
  },
]

const SeccionComoCotizar: React.FC = () => (
  <section style={{ background: 'var(--tw-bg-alt)', padding: '80px 24px' }}>
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <Chip>Proceso de compra</Chip>
        <H2>¿Cómo comprar lotes de café verde?</H2>
        <p style={{
          fontFamily: 'Montserrat, sans-serif', fontSize: 15,
          color: 'var(--tw-text-muted)', lineHeight: 1.7,
          maxWidth: 500, margin: '16px auto 0',
        }}>
          Acceso exclusivo para negocios B2B con cuenta empresa aprobada. Proceso simple,
          transparente y con pago en custodia.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxWidth: 640, margin: '0 auto' }}>
        {PASOS.map((paso, i) => (
          <div key={paso.n} style={{
            display: 'grid', gridTemplateColumns: '56px 1fr',
            gap: 20, paddingBottom: i < PASOS.length - 1 ? 36 : 0,
            position: 'relative',
          }}>
            {i < PASOS.length - 1 && (
              <div style={{
                position: 'absolute', left: 27, top: 52, bottom: 0,
                width: 1,
                background: `linear-gradient(to bottom, ${paso.color}55, transparent)`,
              }} />
            )}
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'var(--tw-card)', border: `2px solid ${paso.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 18, fontWeight: 700, color: paso.color, flexShrink: 0,
            }}>
              {paso.n}
            </div>
            <div style={{ paddingTop: 10 }}>
              <h3 style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 15, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 6,
              }}>
                {paso.titulo}
              </h3>
              <p style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 13, color: 'var(--tw-text-muted)', lineHeight: 1.7, margin: 0,
              }}>
                {paso.texto}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
)

// ─── Sección: Transparencia en cada lote ─────────────────────────────────────

const NIVELES = [
  {
    nivel: 'N1',
    titulo: 'Evidencia básica',
    descripcion: 'El caficultor ha completado su perfil con datos de finca (nombre, región, altitud, variedad y proceso). Es el nivel de entrada para publicar en el catálogo.',
    color: '#8faf8a',
  },
  {
    nivel: 'N2',
    titulo: 'Evidencia documentada',
    descripcion: 'Incluye documentos o fotos verificadas de la finca, el proceso y la cosecha. Mayor confianza para el comprador sobre la autenticidad del lote.',
    color: '#c96e4b',
  },
  {
    nivel: 'N3',
    titulo: 'Evidencia con cata independiente',
    descripcion: 'El lote cuenta con evaluación de calidad realizada por un catador. Es el mayor nivel de evidencia disponible en la plataforma.',
    color: '#f2e0cc',
  },
]

const ATRIBUTOS = [
  { icono: '📍', titulo: 'Nombre de la finca y región', descripcion: 'Cajamarca, San Martín, Puno, Cusco, Junín y más.' },
  { icono: '⛰️', titulo: 'Altitud (msnm)', descripcion: 'La altitud influye directamente en la densidad del grano y la complejidad del perfil.' },
  { icono: '🌿', titulo: 'Proceso de beneficio', descripcion: 'Lavado, Natural o Honey — el proceso define las notas sensoriales del café.' },
  { icono: '🌱', titulo: 'Variedad botánica', descripcion: 'Caturra, Typica, Bourbon, Gesha, Sidra y otras variedades peruanas.' },
  { icono: '📅', titulo: 'Año de cosecha', descripcion: 'Fecha de recolección para verificar frescura del lote.' },
  { icono: '👤', titulo: 'Perfil del caficultor', descripcion: 'Historia, años de experiencia, impacto social y calificaciones verificadas de compradores anteriores.' },
]

const SeccionTransparencia: React.FC = () => (
  <section style={{ background: 'var(--tw-bg)', padding: '80px 24px' }}>
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Chip>Trazabilidad</Chip>
      <H2>Transparencia en cada lote</H2>
      <p style={{
        fontFamily: 'Montserrat, sans-serif', fontSize: 15,
        color: 'var(--tw-text-muted)', lineHeight: 1.75,
        maxWidth: 600, margin: '18px 0 40px',
      }}>
        Cada lote de café verde en TunayWasi viene con una ficha técnica completa.
        El nivel de evidencia (N1 / N2 / N3) indica qué tan verificada está la información.
      </p>

      {/* Niveles de evidencia */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 14, marginBottom: 56,
      }}>
        {NIVELES.map(n => (
          <div key={n.nivel} style={{
            background: 'var(--tw-card)',
            border: `1px solid ${n.color}44`,
            borderRadius: 14, padding: '22px 20px',
          }}>
            <div style={{
              display: 'inline-block', padding: '3px 12px', borderRadius: 20,
              background: `${n.color}18`, border: `1px solid ${n.color}44`,
              color: n.color, fontSize: 11, fontWeight: 700,
              fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.08em',
              marginBottom: 10,
            }}>
              {n.nivel}
            </div>
            <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 8 }}>{n.titulo}</h3>
            <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: 'var(--tw-text-muted)', lineHeight: 1.65, margin: 0 }}>{n.descripcion}</p>
          </div>
        ))}
      </div>

      {/* Atributos de la ficha */}
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 20 }}>
          Qué incluye la ficha técnica de cada lote
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 12,
        }}>
          {ATRIBUTOS.map(a => (
            <div key={a.titulo} style={{
              background: 'var(--tw-card)', border: '1px solid var(--tw-border)',
              borderRadius: 12, padding: '16px 18px',
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{a.icono}</span>
              <div>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 3 }}>{a.titulo}</div>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: 'var(--tw-text-muted)', lineHeight: 1.6 }}>{a.descripcion}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
)

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ_CAFE_VERDE = [
  {
    p: '¿Qué es TYPE_A en TunayWasi?',
    r: 'TYPE_A es la categoría de café verde sin tostar dentro de la plataforma. Los lotes TYPE_A están disponibles exclusivamente para negocios con cuenta empresa B2B aprobada — tostadores, importadores o cafeterías con tostadora propia.',
  },
  {
    p: '¿Puedo comprar café verde si soy una persona natural?',
    r: 'El catálogo de café verde sin tostar (TYPE_A) es exclusivo para cuentas empresa B2B aprobadas. Para acceder, necesitas registrar tu empresa con RUC válido. El catálogo de café tostado en grano o molido está disponible para cualquier comprador registrado.',
  },
  {
    p: '¿Cuánto tiempo tarda la aprobación de mi cuenta empresa?',
    r: 'El equipo de TunayWasi revisa las solicitudes de empresa en un plazo de 24 a 48 horas hábiles. Te notificamos por correo al completar la revisión.',
  },
  {
    p: '¿Qué volúmenes mínimos se manejan para café verde?',
    r: 'Los volúmenes mínimos dependen del caficultor y el lote disponible. Las presentaciones pueden arrancar desde 10 kg hasta lotes completos de un quintal (46 kg) o más. Puedes cotizar el volumen que necesitas directamente con el productor.',
  },
  {
    p: '¿El café verde llega certificado con análisis de calidad?',
    r: 'Depende del nivel de evidencia del lote. Los lotes N3 cuentan con evaluación de calidad de catador independiente. Los lotes N1 y N2 tienen información verificada de finca y proceso. Puedes filtrar por nivel de evidencia en el catálogo.',
  },
  {
    p: '¿Cómo funciona el pago?',
    r: 'El pago va a la cuenta escrow de TunayWasi — no directamente al caficultor. Puedes pagar por Yape o transferencia bancaria. TunayWasi retiene los fondos y los libera al caficultor cuando confirmas la entrega (o automáticamente a los 7 días sin reclamo).',
  },
]

const SeccionFAQ: React.FC = () => {
  const [abierto, setAbierto] = useState<number | null>(null)
  return (
    <section style={{ background: 'var(--tw-bg-alt)', padding: '80px 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Chip>Preguntas frecuentes</Chip>
          <H2>Resolvemos tus dudas</H2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FAQ_CAFE_VERDE.map((f, i) => (
            <div key={i} style={{
              background: 'var(--tw-card)',
              border: `1px solid ${abierto === i ? 'var(--tw-terra)44' : 'var(--tw-border)'}`,
              borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s',
            }}>
              <button onClick={() => setAbierto(abierto === i ? null : i)} style={{
                width: '100%', padding: '18px 22px',
                background: 'transparent', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', gap: 16,
              }}>
                <span style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 14, fontWeight: 600,
                  color: 'var(--tw-text)', textAlign: 'left',
                }}>
                  {f.p}
                </span>
                <span style={{ color: 'var(--tw-terra)', fontSize: 18, flexShrink: 0 }}>
                  {abierto === i ? '−' : '+'}
                </span>
              </button>
              {abierto === i && (
                <div style={{ padding: '0 22px 18px' }}>
                  <p style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 14, color: 'var(--tw-text-muted)',
                    lineHeight: 1.7, margin: 0,
                  }}>
                    {f.r}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── CTA final ────────────────────────────────────────────────────────────────

const SeccionCTA: React.FC = () => (
  <section style={{
    background: `linear-gradient(135deg, ${'var(--tw-section-dark)'} 0%, '#081a0e' 100%)`,
    padding: '90px 24px', textAlign: 'center',
  }}>
    <div style={{ maxWidth: 540, margin: '0 auto' }}>
      <h2 style={{
        fontFamily: 'Cormorant Garamond, serif',
        fontSize: 'clamp(32px, 5vw, 54px)',
        fontWeight: 700, color: 'var(--tw-text)',
        marginBottom: 16, lineHeight: 1.15,
      }}>
        Encuentra tu lote de café verde.<br />
        <span style={{ color: 'var(--tw-terra)' }}>Directo del productor peruano.</span>
      </h2>
      <p style={{
        fontFamily: 'Montserrat, sans-serif', fontSize: 15,
        color: 'var(--tw-text-muted)', lineHeight: 1.7, marginBottom: 36,
      }}>
        Explora los lotes disponibles, ve la ficha técnica completa y cotiza
        directamente con el caficultor — sin intermediarios.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            width: '100%', maxWidth: 400,
            padding: '16px 0', borderRadius: 10, border: 'none',
            background: `linear-gradient(135deg, ${'var(--tw-terra)'}, ${'var(--tw-terra-h)'})`,
            color: '#fff', fontSize: 15, fontWeight: 700,
            fontFamily: 'Montserrat, sans-serif', cursor: 'pointer',
            boxShadow: `0 4px 20px ${'var(--tw-terra)'}44`,
          }}
        >
          Ver catálogo de café verde →
        </button>
        <button
          onClick={() => navigate('/registro-emprendedor')}
          style={{
            width: '100%', maxWidth: 400,
            padding: '14px 0', borderRadius: 10,
            border: `1px solid ${'var(--tw-border)'}`,
            background: 'transparent', color: 'var(--tw-text-muted)',
            fontSize: 14, fontWeight: 600, fontFamily: 'Montserrat, sans-serif',
            cursor: 'pointer',
          }}
        >
          Registrar mi empresa →
        </button>
      </div>
      <p style={{
        marginTop: 20,
        fontFamily: 'Montserrat, sans-serif', fontSize: 12,
        color: 'var(--tw-text-faint)',
      }}>
        Sin contrato · Registro gratuito · Aprobación en 24-48 h
      </p>
    </div>
  </section>
)

// ─── Componente principal ─────────────────────────────────────────────────────

const LandingCafeVerde: React.FC = () => (
  <div style={{ background: 'var(--tw-bg)', minHeight: '100vh' }}>
    <Nav />
    <Hero />
    <SeccionQueEsCafeVerde />
    <SeccionCafeVerdePeruano />
    <SeccionComoCotizar />
    <SeccionTransparencia />
    <SeccionFAQ />
    <SeccionCTA />
  </div>
)

export default LandingCafeVerde
