import { useState } from 'react';

interface Tier {
  id: 'esencial' | 'premium' | 'corporativo';
  label: string;
  desc: string;
  contents: string;
  price: string;
  badge?: string;
}

const TIERS: Tier[] = [
  {
    id: 'esencial',
    label: 'Esencial',
    desc: '1 bolsa 250g + ficha del caficultor impresa',
    contents: 'Bolsa sellada con válvula · Tarjeta con historia del caficultor',
    price: 'S/ 65–90',
  },
  {
    id: 'premium',
    label: 'Premium',
    desc: '2 bolsas + caja kraft + carta personalizada',
    contents: '2 bolsas 250g · Caja kraft · Carta manuscrita opcional',
    price: 'S/ 120–160',
    badge: 'Más popular',
  },
  {
    id: 'corporativo',
    label: 'Corporativo',
    desc: 'Desde 10 kits · logo de tu empresa · factura con RUC',
    contents: 'Packaging co-branded · Certificado de impacto social · Entrega a domicilio',
    price: 'Desde S/ 150 / kit',
  },
];

export default function Gifting() {
  const [selected, setSelected] = useState<Tier['id'] | null>(null);
  const [fecha, setFecha] = useState('');
  const [mensaje, setMensaje] = useState('');

  const selectedTier = TIERS.find(t => t.id === selected);

  return (
    <section id="gifting" style={{
      background: '#1f3028',
      color: '#f2e0cc',
      padding: '100px 36px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative circles */}
      <div style={{ position: 'absolute', top: -80, right: -80, width: 400, height: 400, borderRadius: '50%', border: '1px solid #c96e4b22', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: -40, right: -40, width: 280, height: 280, borderRadius: '50%', border: '1px solid #c96e4b44', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -60, left: -60, width: 320, height: 320, borderRadius: '50%', border: '1px solid #8faf8a22', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1320, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ maxWidth: 640, marginBottom: 64 }}>
          <span style={{
            fontFamily: 'Bowlby One SC, sans-serif', fontSize: 11, letterSpacing: '0.32em',
            color: '#c96e4b', textTransform: 'uppercase',
          }}>Para regalar</span>
          <h2 style={{
            fontFamily: 'Cormorant Garamond, serif', fontWeight: 700,
            fontSize: 'clamp(44px, 5vw, 82px)', lineHeight: 0.95,
            color: '#f2e0cc', margin: '20px 0 24px', letterSpacing: '-0.015em',
          }}>
            Regala café
            <br />
            <span style={{ fontStyle: 'italic', fontWeight: 500, color: '#c96e4b' }}>con historia.</span>
          </h2>
          <p style={{
            fontFamily: 'Montserrat, sans-serif', fontSize: 15, lineHeight: 1.7,
            color: '#c4b297', margin: 0,
          }}>
            No es solo un café — es el nombre y la cara de quien lo cosechó esta mañana.
            El regalo que genera conversación semanas después.
          </p>
        </div>

        {/* Tier cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 24, marginBottom: 48,
        }} className="tw-gift-grid">
          {TIERS.map(tier => {
            const isSelected = selected === tier.id;
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => setSelected(isSelected ? null : tier.id)}
                className="tw-gift-card"
                style={{
                  position: 'relative',
                  background: isSelected ? '#c96e4b18' : '#f2e0cc0a',
                  border: `1px solid ${isSelected ? '#c96e4b' : '#f2e0cc22'}`,
                  borderRadius: 20,
                  padding: 32,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all .3s ease',
                  display: 'flex', flexDirection: 'column', gap: 16,
                }}
              >
                {tier.badge && (
                  <span style={{
                    position: 'absolute', top: -10, right: 20,
                    fontFamily: 'Bowlby One SC, sans-serif', fontSize: 8, letterSpacing: '0.2em',
                    color: '#1f3028', background: '#8faf8a',
                    padding: '4px 10px', borderRadius: 999, textTransform: 'uppercase',
                  }}>{tier.badge}</span>
                )}

                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                }}>
                  <span style={{
                    fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 600,
                    color: '#f2e0cc', lineHeight: 1,
                  }}>{tier.label}</span>
                  {isSelected && (
                    <span style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: '#c96e4b', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, color: '#f2e0cc',
                    }}>✓</span>
                  )}
                </div>

                <p style={{
                  fontFamily: 'Montserrat, sans-serif', fontSize: 13, lineHeight: 1.55,
                  color: '#c4b297', margin: 0,
                }}>{tier.desc}</p>

                <div style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.18em',
                  color: '#f2e0cc88', textTransform: 'uppercase', lineHeight: 1.6,
                }}>
                  {tier.contents.split(' · ').map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ color: '#8faf8a', fontSize: 10 }}>·</span>
                      {item}
                    </div>
                  ))}
                </div>

                <div style={{
                  marginTop: 'auto', paddingTop: 16,
                  borderTop: '1px solid #f2e0cc22',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                }}>
                  <span style={{
                    fontFamily: 'Cormorant Garamond, serif', fontSize: 24, fontWeight: 600,
                    color: isSelected ? '#c96e4b' : '#f2e0cc',
                    transition: 'color .3s ease',
                  }}>{tier.price}</span>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif', fontSize: 11, fontWeight: 600,
                    color: isSelected ? '#c96e4b' : '#c4b297',
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    transition: 'color .3s ease',
                  }}>{isSelected ? 'Seleccionado ✓' : 'Elegir →'}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Inline form — se activa al seleccionar Esencial o Premium */}
        {selected && selected !== 'corporativo' && (
          <div style={{
            background: '#f2e0cc0d',
            border: '1px solid #c96e4b55',
            borderRadius: 20, padding: 36,
            maxWidth: 640,
            animation: 'tw-gift-fadein .35s ease',
          }} className="tw-gift-form">
            <div style={{
              fontFamily: 'Bowlby One SC, sans-serif', fontSize: 10, letterSpacing: '0.28em',
              color: '#c96e4b', textTransform: 'uppercase', marginBottom: 24,
            }}>Kit {selectedTier?.label} — datos de entrega</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <label style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.22em',
                  color: '#c4b297', textTransform: 'uppercase', display: 'block', marginBottom: 10,
                }}>¿Para qué fecha lo necesitas?</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    fontFamily: 'Montserrat, sans-serif', fontSize: 14,
                    color: '#f2e0cc', background: 'transparent',
                    border: 'none', borderBottom: '1px solid #f2e0cc33',
                    padding: '12px 0 10px', outline: 'none',
                    colorScheme: 'dark',
                  }}
                  onFocus={e => { e.target.style.borderBottomColor = '#c96e4b'; }}
                  onBlur={e => { e.target.style.borderBottomColor = '#f2e0cc33'; }}
                />
              </div>

              <div>
                <label style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.22em',
                  color: '#c4b297', textTransform: 'uppercase', display: 'block', marginBottom: 10,
                }}>Agrega un mensaje personal (opcional)</label>
                <textarea
                  value={mensaje}
                  onChange={e => setMensaje(e.target.value)}
                  placeholder="Ej: Para Juan, que siempre supo que el buen café cambia el día…"
                  maxLength={280}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    fontFamily: 'Montserrat, sans-serif', fontSize: 14,
                    color: '#f2e0cc', background: 'transparent',
                    border: 'none', borderBottom: '1px solid #f2e0cc33',
                    padding: '12px 0 10px', outline: 'none',
                    minHeight: 80, resize: 'vertical',
                  }}
                  onFocus={e => { e.target.style.borderBottomColor = '#c96e4b'; }}
                  onBlur={e => { e.target.style.borderBottomColor = '#f2e0cc33'; }}
                />
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.14em',
                  color: '#c4b29766', marginTop: 6, textAlign: 'right',
                }}>{mensaje.length}/280</div>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#8faf8a18', border: '1px solid #8faf8a44',
                borderRadius: 10, padding: '10px 14px',
              }}>
                <span style={{ color: '#8faf8a', fontSize: 14, flexShrink: 0 }}>✓</span>
                <span style={{
                  fontFamily: 'Montserrat, sans-serif', fontSize: 12,
                  color: '#c4b297', lineHeight: 1.4,
                }}>
                  Entrega garantizada en 48h en Lima — coordinamos el tueste fresco para tu fecha.
                </span>
              </div>

              <a
                href="#cafe"
                style={{
                  fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 13,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: '#1f3028', background: '#c96e4b',
                  padding: '18px 28px', borderRadius: 999,
                  textDecoration: 'none', textAlign: 'center',
                  display: 'block',
                  boxShadow: '0 14px 32px -12px #c96e4b99',
                  transition: 'all .3s ease',
                }}
                className="tw-gift-cta"
              >
                Armar mi kit regalo →
              </a>
            </div>
          </div>
        )}

        {/* Corporativo CTA */}
        {selected === 'corporativo' && (
          <div style={{
            background: '#f2e0cc0d',
            border: '1px solid #c96e4b55',
            borderRadius: 20, padding: 36,
            maxWidth: 640,
            animation: 'tw-gift-fadein .35s ease',
          }}>
            <div style={{
              fontFamily: 'Bowlby One SC, sans-serif', fontSize: 10, letterSpacing: '0.28em',
              color: '#c96e4b', textTransform: 'uppercase', marginBottom: 16,
            }}>Kit Corporativo</div>
            <p style={{
              fontFamily: 'Montserrat, sans-serif', fontSize: 14, color: '#c4b297',
              lineHeight: 1.65, margin: '0 0 24px',
            }}>
              Packaging con logo de tu empresa · Certificado de impacto social
              (cuántos caficultores apoyaste) · Factura con RUC · Entrega a tu oficina o directo a cada colaborador.
            </p>
            <a
              href="#contacto"
              style={{
                fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 13,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: '#1f3028', background: '#c96e4b',
                padding: '18px 28px', borderRadius: 999,
                textDecoration: 'none', textAlign: 'center',
                display: 'inline-block',
                boxShadow: '0 14px 32px -12px #c96e4b99',
                transition: 'all .3s ease',
              }}
              className="tw-gift-cta"
            >
              Solicitar propuesta corporativa →
            </a>
          </div>
        )}
      </div>

      <style>{`
        @keyframes tw-gift-fadein { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .tw-gift-card:hover { border-color: #c96e4b88 !important; background: #c96e4b12 !important; }
        .tw-gift-cta:hover { background: #f2e0cc !important; }
        @media (max-width: 880px) {
          .tw-gift-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
