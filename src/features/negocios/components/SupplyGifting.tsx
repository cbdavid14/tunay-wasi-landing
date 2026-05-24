import { setLoteReservado } from '@/features/negocios/useLoteReservado';

interface Modelo {
  id: 'puntual' | 'mensual';
  label: string;
  sublabel: string;
  desc: string;
  ejemplo: string;
  precio: string;
  minimo: string;
}

const MODELOS: Modelo[] = [
  {
    id: 'puntual',
    label: 'Modelo A',
    sublabel: 'Gifting puntual',
    desc: 'Kit regalo con 1–2 bolsas + caja kraft + carta del caficultor con foto y nombre',
    ejemplo: 'Navidad, día del trabajo, fechas especiales',
    precio: 'Desde S/ 150 / kit',
    minimo: 'Mínimo 20 kits',
  },
  {
    id: 'mensual',
    label: 'Modelo B',
    sublabel: 'Beneficio mensual',
    desc: '1 bolsa / mes por colaborador — caficultor diferente cada mes. El equipo conoce una finca nueva cada ciclo.',
    ejemplo: '50 colaboradores × S/ 55 = S/ 2,750 / mes',
    precio: 'S/ 55–80 / bolsa',
    minimo: 'Mínimo 10 colaboradores',
  },
];

export default function SupplyGifting() {
  const handleCotizar = (tipo: 'puntual' | 'mensual') => {
    // Pre-selecciona tipo=empresa en el formulario y hace scroll
    setLoteReservado(null);
    // Disparamos un evento custom que SupplyForm puede escuchar si se necesita
    window.dispatchEvent(new CustomEvent('tw:gifting-cotizar', { detail: { tipo } }));
    const el = document.getElementById('solicitud');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="gifting-corporativo" style={{
      background: '#f2e0cc',
      color: '#1f3028',
      padding: '100px 36px',
      borderTop: '1px solid #1f302814',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative */}
      <div style={{ position: 'absolute', bottom: -60, right: -60, width: 300, height: 300, borderRadius: '50%', border: '1px solid #1f302812', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1320, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64,
          alignItems: 'end', marginBottom: 64,
        }} className="tw-gift-corp-2col">
          <div>
            <span style={{
              fontFamily: 'Bowlby One SC, sans-serif', fontSize: 11, letterSpacing: '0.32em',
              color: '#c96e4b', textTransform: 'uppercase',
            }}>Para empresas</span>
            <h2 style={{
              fontFamily: 'Cormorant Garamond, serif', fontWeight: 700,
              fontSize: 'clamp(38px, 4.5vw, 72px)', lineHeight: 0.95,
              color: '#1f3028', margin: '20px 0 0', letterSpacing: '-0.01em',
            }}>
              ¿Tu empresa
              <br />
              <span style={{ fontStyle: 'italic', fontWeight: 500, color: '#c96e4b' }}>regala en Navidad?</span>
            </h2>
          </div>
          <div>
            <p style={{
              fontFamily: 'Montserrat, sans-serif', fontSize: 15, lineHeight: 1.7,
              color: '#533b22', margin: 0, maxWidth: 440,
            }}>
              El regalo que genera conversación — el café y la historia de quien lo cultivó.
              Tu empresa apoya directamente a un productor peruano.
            </p>
            <div style={{
              marginTop: 20,
              display: 'flex', gap: 6, flexWrap: 'wrap',
            }}>
              {['Packaging co-branded', 'Factura con RUC', 'Certificado de impacto social'].map(tag => (
                <span key={tag} style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.18em',
                  color: '#533b22', background: '#1f302811',
                  border: '1px solid #1f302822',
                  padding: '4px 10px', borderRadius: 999, textTransform: 'uppercase',
                }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Modelo cards */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28,
          marginBottom: 48,
        }} className="tw-gift-corp-2col">
          {MODELOS.map(m => (
            <article key={m.id} style={{
              background: '#fff8ee',
              border: '1px solid #533b2233',
              borderRadius: 20, padding: 36,
              display: 'flex', flexDirection: 'column', gap: 20,
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 0, right: 0, width: 56, height: 56,
                background: '#c96e4b',
                clipPath: 'polygon(100% 0, 100% 100%, 0 0)',
              }} />

              <div>
                <span style={{
                  fontFamily: 'Bowlby One SC, sans-serif', fontSize: 10, letterSpacing: '0.26em',
                  color: '#c96e4b', textTransform: 'uppercase',
                }}>{m.label}</span>
                <h3 style={{
                  fontFamily: 'Cormorant Garamond, serif', fontWeight: 600,
                  fontSize: 32, lineHeight: 1, letterSpacing: '-0.01em',
                  color: '#1f3028', margin: '8px 0 0',
                }}>{m.sublabel}</h3>
              </div>

              <p style={{
                fontFamily: 'Montserrat, sans-serif', fontSize: 14, lineHeight: 1.6,
                color: '#533b22', margin: 0,
              }}>{m.desc}</p>

              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.16em',
                color: '#533b2299', textTransform: 'uppercase', lineHeight: 1.7,
              }}>
                <div>Ej: {m.ejemplo}</div>
                <div>{m.minimo}</div>
              </div>

              <div style={{
                marginTop: 'auto', paddingTop: 20,
                borderTop: '1px solid #533b2222',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.18em',
                    color: '#533b2299', textTransform: 'uppercase', marginBottom: 4,
                  }}>Precio orientativo</div>
                  <div style={{
                    fontFamily: 'Cormorant Garamond, serif', fontSize: 26, fontWeight: 600,
                    color: '#1f3028', lineHeight: 1,
                  }}>{m.precio}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCotizar(m.id)}
                  className="tw-gift-corp-cta"
                  style={{
                    fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 600,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: '#f2e0cc', background: '#1f3028',
                    padding: '12px 20px', border: 'none',
                    cursor: 'pointer', transition: 'all .25s ease',
                  }}
                >
                  Cotizar →
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* CTA principal */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 24,
          padding: '32px 36px',
          background: '#1f3028', borderRadius: 20,
        }} className="tw-gift-corp-banner">
          <div>
            <div style={{
              fontFamily: 'Bowlby One SC, sans-serif', fontSize: 10, letterSpacing: '0.28em',
              color: '#c96e4b', textTransform: 'uppercase', marginBottom: 8,
            }}>Propuesta lista en 24h</div>
            <p style={{
              fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 500,
              color: '#f2e0cc', margin: 0, lineHeight: 1.3,
            }}>
              Kit muestra a tu oficina sin costo · Factura con RUC incluida.
            </p>
          </div>
          <a
            href="#solicitud"
            onClick={() => { setLoteReservado(null); window.dispatchEvent(new CustomEvent('tw:gifting-cotizar', { detail: { tipo: 'empresa' } })); }}
            className="tw-gift-corp-main-cta"
            style={{
              fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 13,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: '#1f3028', background: '#c96e4b',
              padding: '18px 28px', borderRadius: 999, textDecoration: 'none',
              whiteSpace: 'nowrap', flexShrink: 0,
              boxShadow: '0 14px 32px -12px #c96e4b99',
              transition: 'all .3s ease',
            }}
          >
            Solicitar propuesta corporativa →
          </a>
        </div>
      </div>

      <style>{`
        .tw-gift-corp-cta:hover { background: #c96e4b !important; }
        .tw-gift-corp-main-cta:hover { background: #f2e0cc !important; }
        @media (max-width: 880px) {
          .tw-gift-corp-2col { grid-template-columns: 1fr !important; gap: 32px !important; }
          .tw-gift-corp-banner { flex-direction: column !important; }
        }
      `}</style>
    </section>
  );
}
