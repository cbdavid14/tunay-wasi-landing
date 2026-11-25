import { useState, useEffect } from 'react';
import ThemeSelector from '@/components/ui/ThemeSelector';

const NAV_LINKS: [string, string][] = [
  ['Soy caficultor', '#caficultores'],
  ['Soy negocio',    '#cafe'],
];

export default function Nav() {
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  /* Nav is always dark so it reads over the hero image */
  const bg = scrolled || menuOpen
    ? 'rgba(13,11,9,0.96)'
    : 'rgba(13,11,9,0.55)';

  return (
    <>
      <style>{`
        .tw-navlink-dark {
          font-family: var(--tw-font-body);
          font-size: 13px; font-weight: 500;
          color: rgba(242,224,204,0.8);
          text-decoration: none;
          letter-spacing: 0.04em;
          position: relative; padding: 6px 0;
          transition: color 0.25s ease;
        }
        .tw-navlink-dark:hover { color: #f2e0cc; }
        .tw-navlink-dark::after {
          content: ''; position: absolute;
          left: 0; right: 100%; bottom: 0;
          height: 1px; background: var(--tw-terra);
          transition: right 0.3s ease;
        }
        .tw-navlink-dark:hover::after { right: 0; }

        @media (max-width: 880px) {
          .tw-nav-links { display: none !important; }
          .tw-nav-actions { display: none !important; }
          .tw-hamburger { display: flex !important; }
        }
      `}</style>

      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: bg,
        backdropFilter: 'blur(14px)',
        borderBottom: scrolled || menuOpen
          ? '1px solid rgba(242,224,204,0.08)'
          : '1px solid transparent',
        transition: 'background 0.4s ease, border-color 0.4s ease',
      }}>
        <div style={{
          maxWidth: 1320, margin: '0 auto',
          padding: scrolled ? '12px 36px' : '18px 36px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 24,
          transition: 'padding 0.35s ease',
        }}>

          {/* Brand */}
          <a href="#top" onClick={closeMenu} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            textDecoration: 'none', flexShrink: 0,
          }}>
            <img
              src="/brand/logo.png"
              alt="Tunay Wasi"
              style={{ width: 40, height: 40, objectFit: 'contain' }}
            />
            <div>
              <div style={{
                fontFamily: 'var(--tw-font-brand)',
                fontWeight: 700, fontSize: 17,
                color: '#f2e0cc',
                letterSpacing: '0.01em',
                lineHeight: 1,
              }}>TUNAY WASI</div>
              <div style={{
                fontFamily: 'var(--tw-font-data)',
                fontSize: 9, letterSpacing: '0.3em',
                color: 'rgba(242,224,204,0.45)',
                textTransform: 'uppercase', marginTop: 3,
              }}>Café peruano</div>
            </div>
          </a>

          {/* Center links */}
          <nav className="tw-nav-links" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            {NAV_LINKS.map(([label, href]) => (
              <a key={href} href={href} className="tw-navlink-dark">{label}</a>
            ))}
          </nav>

          {/* Right actions */}
          <div className="tw-nav-actions" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <ThemeSelector variant="dots" />

            <a href="#contacto" style={{
              fontFamily: 'var(--tw-font-body)',
              fontSize: 13, fontWeight: 500,
              color: 'rgba(242,224,204,0.8)',
              textDecoration: 'none',
              padding: '9px 18px',
              borderRadius: 'var(--tw-radius-pill)',
              border: '1px solid rgba(242,224,204,0.2)',
              transition: 'all 0.25s ease',
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(242,224,204,0.08)'; el.style.color = '#f2e0cc'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.color = 'rgba(242,224,204,0.8)'; }}
            >
              Registrarse
            </a>

            <a href="#preventa" style={{
              fontFamily: 'var(--tw-font-body)',
              fontSize: 13, fontWeight: 600,
              color: '#f2e0cc',
              background: 'var(--tw-terra)',
              textDecoration: 'none',
              padding: '9px 20px',
              borderRadius: 'var(--tw-radius-pill)',
              display: 'inline-flex', alignItems: 'center', gap: 7,
              transition: 'background 0.25s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#b85d3a'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--tw-terra)'; }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f2e0cc', animation: 'tw-pulse-dot 2s ease-in-out infinite' }} />
              Mi portal
            </a>

            {/* Hamburger */}
            <button
              className="tw-hamburger"
              onClick={() => setMenuOpen(o => !o)}
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 8, display: 'none', flexDirection: 'column', gap: 5,
              }}
            >
              {[0,1,2].map(i => (
                <span key={i} style={{
                  display: 'block', width: 22, height: 2,
                  background: '#f2e0cc', borderRadius: 2,
                  transition: 'all .3s ease',
                  transform: i === 0 && menuOpen ? 'translateY(7px) rotate(45deg)'
                           : i === 2 && menuOpen ? 'translateY(-7px) rotate(-45deg)'
                           : 'none',
                  opacity: i === 1 && menuOpen ? 0 : 1,
                }} />
              ))}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="tw-mobile-nav-panel" style={{
            padding: '20px 24px 28px',
            borderTop: '1px solid rgba(242,224,204,0.08)',
            background: 'rgba(13,11,9,0.97)',
          }}>
            {NAV_LINKS.map(([label, href]) => (
              <a key={href} href={href} onClick={closeMenu} style={{
                fontFamily: 'var(--tw-font-display)',
                fontSize: 24, fontWeight: 600,
                color: '#f2e0cc', textDecoration: 'none',
                padding: '12px 0',
                borderBottom: '1px solid rgba(242,224,204,0.08)',
                display: 'block',
              }}>{label}</a>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
              <a href="#contacto" onClick={closeMenu} style={{
                fontFamily: 'var(--tw-font-body)',
                fontSize: 14, fontWeight: 500,
                color: 'rgba(242,224,204,0.8)',
                textDecoration: 'none', padding: '13px 20px',
                borderRadius: 'var(--tw-radius-pill)',
                border: '1px solid rgba(242,224,204,0.2)',
              }}>Registrarse</a>
              <a href="#preventa" onClick={closeMenu} style={{
                fontFamily: 'var(--tw-font-body)',
                fontSize: 14, fontWeight: 600,
                color: '#f2e0cc', background: 'var(--tw-terra)',
                textDecoration: 'none', padding: '13px 20px',
                borderRadius: 'var(--tw-radius-pill)',
              }}>Mi portal</a>
            </div>
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(242,224,204,0.08)' }}>
              <div style={{ fontFamily: 'var(--tw-font-data)', fontSize: 10, letterSpacing: '0.22em', color: 'rgba(242,224,204,0.35)', textTransform: 'uppercase', marginBottom: 10 }}>Tema</div>
              <ThemeSelector variant="dots" />
            </div>
          </div>
        )}
      </header>
    </>
  );
}
