import { useState, useEffect } from 'react';
import { useCaficultores } from '@/features/catalog/useCaficultores';
import { useLandingConfig } from '@/features/catalog/useLandingConfig';

export default function Hero() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setLoaded(true); }, []);

  const { data: caficultores } = useCaficultores();
  const { data: landingConfig } = useLandingConfig();

  const farmCount    = caficultores?.length ?? 0;
  const altitudMedia = landingConfig?.heroMetrics?.altitudMedia ?? '+1,800 m';

  return (
    <>
      <style>{`
        .tw-hero-bg {
          position: absolute; inset: 0; z-index: 0;
          background-image: url('/imgs/hero-finca.jpeg');
          background-size: cover;
          background-position: center 40%;
          transition: transform 8s ease-out;
        }
        .tw-hero-bg.loaded { transform: scale(1.04); }

        /* dark gradient overlay — bottom-heavy so cards below are readable */
        .tw-hero-overlay {
          position: absolute; inset: 0; z-index: 1;
          background: linear-gradient(
            to bottom,
            rgba(10,8,6,0.52) 0%,
            rgba(10,8,6,0.38) 40%,
            rgba(10,8,6,0.72) 80%,
            rgba(10,8,6,0.92) 100%
          );
        }

        .tw-hero-label {
          font-family: var(--tw-font-label);
          font-size: 11px;
          letter-spacing: 0.32em;
          color: var(--tw-terra);
          text-transform: uppercase;
          opacity: 0; transform: translateY(12px);
          transition: all 0.9s cubic-bezier(.2,.7,.2,1) 0.1s;
        }
        .tw-hero-label.loaded { opacity: 1; transform: translateY(0); }

        .tw-hero-h1 {
          font-family: var(--tw-font-display);
          font-weight: 700;
          font-size: clamp(48px, 7vw, 100px);
          line-height: 0.92;
          letter-spacing: -0.025em;
          color: #f2e0cc;
          margin: 0;
          opacity: 0; transform: translateY(20px);
          transition: all 1s cubic-bezier(.2,.7,.2,1) 0.25s;
        }
        .tw-hero-h1.loaded { opacity: 1; transform: translateY(0); }

        .tw-hero-sub {
          font-family: var(--tw-font-body);
          font-size: clamp(14px, 1.4vw, 17px);
          font-weight: 400;
          line-height: 1.65;
          color: rgba(242,224,204,0.75);
          max-width: 480px;
          margin: 0 auto;
          opacity: 0; transform: translateY(16px);
          transition: all 0.9s cubic-bezier(.2,.7,.2,1) 0.4s;
        }
        .tw-hero-sub.loaded { opacity: 1; transform: translateY(0); }

        .tw-hero-cta {
          font-family: var(--tw-font-body);
          font-weight: 600;
          font-size: 14px;
          letter-spacing: 0.06em;
          color: #f2e0cc;
          background: var(--tw-terra);
          padding: 18px 36px;
          border-radius: var(--tw-radius-pill);
          text-decoration: none;
          display: inline-flex; align-items: center; gap: 10px;
          border: 1px solid rgba(242,224,204,0.15);
          box-shadow: 0 20px 48px -16px rgba(201,110,75,0.6);
          transition: all 0.3s cubic-bezier(.2,.7,.2,1);
          opacity: 0; transform: translateY(14px);
          transition: opacity 0.9s cubic-bezier(.2,.7,.2,1) 0.55s,
                      transform 0.9s cubic-bezier(.2,.7,.2,1) 0.55s,
                      background 0.25s ease,
                      box-shadow 0.25s ease;
        }
        .tw-hero-cta.loaded { opacity: 1; transform: translateY(0); }
        .tw-hero-cta:hover {
          background: #b85d3a;
          box-shadow: 0 24px 56px -16px rgba(201,110,75,0.8);
          transform: translateY(-2px) !important;
        }

        .tw-hero-stats {
          display: flex; gap: 40px; justify-content: center; align-items: center;
          flex-wrap: wrap;
          opacity: 0;
          transition: opacity 0.9s ease 0.7s;
        }
        .tw-hero-stats.loaded { opacity: 1; }

        .tw-scroll-hint {
          position: absolute; bottom: 32px; left: 50%;
          transform: translateX(-50%);
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          z-index: 3;
          opacity: 0; transition: opacity 0.9s ease 1s;
        }
        .tw-scroll-hint.loaded { opacity: 1; }

        @media (max-width: 640px) {
          .tw-hero-h1 { font-size: clamp(40px, 12vw, 72px) !important; }
          .tw-hero-stats { gap: 24px !important; }
        }
      `}</style>

      <section
        id="top"
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          paddingTop: 80,
          paddingBottom: 120,
        }}
      >
        {/* Background image with slow zoom */}
        <div className={`tw-hero-bg${loaded ? ' loaded' : ''}`} />
        {/* Dark overlay */}
        <div className="tw-hero-overlay" />

        {/* Content */}
        <div style={{
          position: 'relative', zIndex: 2,
          textAlign: 'center',
          padding: '0 24px',
          maxWidth: 760,
          width: '100%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28,
        }}>
          {/* Label */}
          <span className={`tw-hero-label${loaded ? ' loaded' : ''}`}>
            Café de especialidad peruano
          </span>

          {/* Main heading */}
          <h1 className={`tw-hero-h1${loaded ? ' loaded' : ''}`}>
            Del caficultor peruano<br />
            <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--tw-terra)' }}>
              a tu negocio.
            </span>
          </h1>

          {/* Subtitle */}
          <p className={`tw-hero-sub${loaded ? ' loaded' : ''}`}>
            Café de especialidad con trazabilidad completa — región, altitud,
            variedad y proceso — directamente de la finca.
          </p>

          {/* CTA */}
          <a href="#cafe" className={`tw-hero-cta${loaded ? ' loaded' : ''}`}>
            Ver catálogo →
          </a>

          {/* Stats row */}
          <div className={`tw-hero-stats${loaded ? ' loaded' : ''}`}>
            {([
              [farmCount > 0 ? `${farmCount}` : '12+', 'fincas asociadas'],
              [altitudMedia, 'altitud media'],
              ['0% comisión', 'en fase beta'],
            ] as [string, string][]).map(([n, l]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'var(--tw-font-display)',
                  fontSize: 'clamp(26px, 3vw, 38px)',
                  fontWeight: 600,
                  color: '#f2e0cc',
                  lineHeight: 1,
                }}>{n}</div>
                <div style={{
                  fontFamily: 'var(--tw-font-data)',
                  fontSize: 10,
                  fontWeight: 500,
                  color: 'rgba(242,224,204,0.55)',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  marginTop: 6,
                }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <div className={`tw-scroll-hint${loaded ? ' loaded' : ''}`}>
          <span style={{
            fontFamily: 'var(--tw-font-data)',
            fontSize: 10,
            letterSpacing: '0.32em',
            color: 'rgba(242,224,204,0.45)',
            textTransform: 'uppercase',
          }}>Desliza</span>
          <span style={{
            width: 1, height: 36,
            background: 'rgba(242,224,204,0.35)',
            display: 'block',
            animation: 'tw-scroll 2.2s ease-in-out infinite',
          }} />
        </div>
      </section>
    </>
  );
}
