import { useState, useEffect, useRef } from 'react';
import { logoutPortalUser, type PortalAuthUser } from '@/features/portal/portalAuthService';

const LINKS: [string, string][] = [
  ['Preventa', '#preventa'],
  ['Origen', '#origen'],
  ['Caficultores', '#caficultores'],
  ['Café', '#cafe'],
  ['Modelo 50/50', '#modelo'],
  ['Contacto', '#contacto'],
];

interface NavProps {
  user?: PortalAuthUser | null;
  onAuthChange?: (u: PortalAuthUser | null) => void;
}

export default function Nav({ user, onAuthChange }: NavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        avatarRef.current &&
        !avatarRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onClick);
    };
  }, [userMenuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = async () => {
    await logoutPortalUser();
    onAuthChange?.(null);
    setUserMenuOpen(false);
  };

  const avatarInitial = user?.nombre?.charAt(0).toUpperCase() || user?.displayName?.charAt(0).toUpperCase() || '?';

  const userNav = user ? (
    <>
      <button
        ref={avatarRef}
        onClick={() => setUserMenuOpen(o => !o)}
        className="tw-avatar-btn"
        aria-label="Menú de usuario"
        style={{
          width: 36, height: 36, borderRadius: '50%', border: '2px solid #1f3028',
          background: '#1f3028', color: '#f2e0cc', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 700,
          transition: 'all .2s',
        }}
      >
        {avatarInitial}
      </button>
      {userMenuOpen && (
        <>
          <div style={{
            position: 'fixed', inset: 0, zIndex: 98,
          }} onClick={() => setUserMenuOpen(false)} />
          <div ref={menuRef} style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 99,
            width: 280, background: '#FFFFFF', borderRadius: 12,
            border: '1px solid #E8E4DF', boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            opacity: 1, transform: 'translateY(0)',
            transition: 'all .15s ease',
          }}>
            {/* Header */}
            <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: '#1f3028', color: '#f2e0cc',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Montserrat, sans-serif', fontSize: 16, fontWeight: 700, flexShrink: 0,
              }}>
                {avatarInitial}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 600, color: '#1f3028', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.displayName}
                </div>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: '#8f7a65', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </div>
              </div>
            </div>
            <div style={{ height: 1, background: '#E8E4DF', margin: '0 12px' }} />

            {/* CTA Mi Panel */}
            <a href="/portal" onClick={() => setUserMenuOpen(false)} style={{
              display: 'flex', alignItems: 'center', gap: 10, margin: '8px 12px',
              padding: '12px 14px', background: '#2C1810', borderRadius: 8,
              fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 600,
              color: '#FFFFFF', textDecoration: 'none', transition: 'background .15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#432918'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#2C1810'; }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="1.3" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.3" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.3" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.3" /></svg>
              Mi Panel
            </a>
            <div style={{ height: 1, background: '#E8E4DF', margin: '0 12px' }} />

            {/* Navigation */}
            <NavItem href="/portal?view=perfil" onClick={() => setUserMenuOpen(false)} icon={<SvgUser />} label="Mi Perfil" />
            <NavItem href="/portal?view=pedidos" onClick={() => setUserMenuOpen(false)} icon={<SvgPackage />} label="Mis Pedidos" />
            <NavItem href="/portal?view=notificaciones" onClick={() => setUserMenuOpen(false)} icon={<SvgBell />} label="Notificaciones" />
            <div style={{ height: 1, background: '#E8E4DF', margin: '0 12px' }} />

            {/* Secondary */}
            <NavItem href="https://wa.me/51987654321" onClick={() => setUserMenuOpen(false)} icon={<SvgChat />} label="Soporte" external />
            <NavItem href="/portal?view=config" onClick={() => setUserMenuOpen(false)} icon={<SvgSettings />} label="Configuración" />
            <div style={{ height: 1, background: '#E8E4DF', margin: '0 12px' }} />

            {/* Logout */}
            <button onClick={handleLogout} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', margin: '4px 8px',
              width: 'calc(100% - 16px)', border: 'none', background: 'transparent', borderRadius: 8, cursor: 'pointer',
              fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 500, color: '#DC2626',
              transition: 'all .15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#FEF2F2'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H14"/><path d="M17 8.5 20.5 12 17 15.5"/><path d="M10 12h10.5"/></svg>
              Cerrar sesión
            </button>
          </div>
        </>
      )}
    </>
  ) : (
    <a href="/portal" className="tw-loginlink" style={{
      fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 600,
      color: '#1f3028', textDecoration: 'none', letterSpacing: '0.04em',
      padding: '10px 18px', borderRadius: 999, border: '1px solid #1f302833',
      display: 'inline-flex', alignItems: 'center', gap: 8,
      transition: 'all .25s ease',
    }}
    onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#c96e4b'; el.style.color = '#c96e4b'; }}
    onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#1f302833'; el.style.color = '#1f3028'; }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 12.5-4 16 0" /></svg>
      Iniciar sesión
    </a>
  );

  const mobileUserSection = user ? (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 0', borderBottom: '1px solid #1f302814', marginBottom: 4,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: '#1f3028', color: '#f2e0cc',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 700,
        }}>
          {avatarInitial}
        </div>
        <div>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 600, color: '#1f3028' }}>{user.displayName}</div>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: '#8f7a65' }}>{user.email}</div>
        </div>
      </div>
      <a href="/portal" onClick={closeMenu} style={{
        fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 700,
        color: '#f2e0cc', background: '#2C1810', padding: '12px 18px',
        borderRadius: 8, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, marginTop: 4,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="1.3" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.3" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.3" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.3" /></svg>
        Mi Panel
      </a>
      <button onClick={() => { handleLogout(); closeMenu(); }} style={{
        fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 500,
        color: '#DC2626', background: 'transparent', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', marginTop: 4,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H14"/><path d="M17 8.5 20.5 12 17 15.5"/><path d="M10 12h10.5"/></svg>
        Cerrar sesión
      </button>
    </>
  ) : (
    <a href="/portal" onClick={closeMenu} style={{
      fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 600,
      color: '#1f3028', textDecoration: 'none', letterSpacing: '0.04em',
      padding: '10px 18px', borderRadius: 999, marginTop: 8,
      border: '1px solid #1f302833',
      display: 'inline-flex', alignItems: 'center', gap: 8,
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 12.5-4 16 0" /></svg>
      Iniciar sesión
    </a>
  );

  const desktopNavStyle: React.CSSProperties = {
    display: 'flex', gap: 36, alignItems: 'center', position: 'relative',
  };

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      transition: 'all .35s ease',
      background: scrolled || menuOpen ? 'rgba(242, 224, 204, 0.97)' : 'transparent',
      backdropFilter: scrolled || menuOpen ? 'blur(14px)' : 'none',
      borderBottom: scrolled || menuOpen ? '1px solid #1f302822' : '1px solid transparent',
    }}>
      <div style={{
        maxWidth: 1320, margin: '0 auto',
        padding: scrolled ? '14px 36px' : '22px 36px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'padding .35s ease',
      }}>
        <a href="#top" onClick={closeMenu} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <div className="tw-logo-hover" style={{ width: 52, height: 52, position: 'relative' }}>
            <style>{`
              @keyframes tw-logo-hover { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
              @keyframes tw-logo-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
              .tw-logo-hover { animation: tw-logo-hover 4.2s ease-in-out infinite; }
              .tw-logo-hover img { animation: tw-logo-breathe 2.4s ease-in-out infinite; }
            `}</style>
            <img src="/brand/logo.png" alt="Tunay Wasi" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ lineHeight: 1 }}>
            <div style={{ fontFamily: 'Mulish, sans-serif', fontWeight: 700, letterSpacing: '0.005em', color: '#1f3028', fontSize: 20 }}>
              Tunay Wasi
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.32em', color: '#533b22', marginTop: 4, textTransform: 'uppercase' }}>
              Verdadera · Casa
            </div>
          </div>
        </a>

        <nav style={desktopNavStyle}>
          {LINKS.map(([label, href]) => (
            <a key={href} href={href} className="tw-navlink" style={{
              fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 500,
              color: '#1f3028', textDecoration: 'none', letterSpacing: '0.04em',
              position: 'relative', padding: '6px 0',
            }}>{label}</a>
          ))}
          <a href="#preventa" className="tw-cta-btn" style={{
            fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 600,
            color: '#f2e0cc', background: '#c96e4b', padding: '11px 22px',
            borderRadius: 999, textDecoration: 'none', letterSpacing: '0.06em',
            transition: 'all .25s ease', display: 'inline-flex', alignItems: 'center', gap: 8,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#1f3028'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#c96e4b'; }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f2e0cc', animation: 'tw-pulse-dot 2s ease-in-out infinite' }} />
            Reservar mi café
          </a>

          {userNav}

          {/* Hamburger — visible ≤880px */}
          <button
            className="tw-hamburger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, display: 'none', flexDirection: 'column', gap: 5 }}
          >
            <span style={{ display: 'block', width: 22, height: 2, background: '#1f3028', borderRadius: 2, transition: 'all .3s ease', transform: menuOpen ? 'translateY(7px) rotate(45deg)' : 'none' }} />
            <span style={{ display: 'block', width: 22, height: 2, background: '#1f3028', borderRadius: 2, transition: 'all .3s ease', opacity: menuOpen ? 0 : 1 }} />
            <span style={{ display: 'block', width: 22, height: 2, background: '#1f3028', borderRadius: 2, transition: 'all .3s ease', transform: menuOpen ? 'translateY(-7px) rotate(-45deg)' : 'none' }} />
          </button>
        </nav>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="tw-mobile-nav">
          {mobileUserSection}
          {LINKS.map(([label, href]) => (
            <a
              key={href}
              href={href}
              onClick={closeMenu}
              style={{
                fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 600,
                color: '#1f3028', textDecoration: 'none', letterSpacing: '-0.005em',
                padding: '10px 0', borderBottom: '1px solid #1f302814', display: 'block',
              }}
            >{label}</a>
          ))}
          <a
            href="#preventa"
            onClick={closeMenu}
            style={{
              fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 600,
              color: '#f2e0cc', background: '#c96e4b', padding: '14px 24px',
              borderRadius: 999, textDecoration: 'none', letterSpacing: '0.06em',
              display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 8,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f2e0cc' }} />
            Reservar mi café
          </a>
        </div>
      )}

      <style>{`
        @keyframes tw-pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }
        .tw-navlink::after { content: ''; position: absolute; left: 0; right: 100%; bottom: 0; height: 1px; background: #c96e4b; transition: right .35s ease; }
        .tw-navlink:hover::after { right: 0; }
        .tw-navlink:hover { color: #c96e4b; }
        .tw-avatar-btn:hover { opacity: 0.85; }
        @media (max-width: 880px) {
          .tw-navlink { display: none; }
          .tw-cta-btn { display: none; }
          .tw-loginlink { display: none; }
          .tw-avatar-btn { display: none; }
          .tw-hamburger { display: flex !important; }
          .tw-mobile-nav {
            padding: 20px 24px 28px;
            border-top: 1px solid #1f302822;
          }
        }
      `}</style>
    </header>
  );
}

const SvgUser = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 12.5-4 16 0" /></svg>;
const SvgPackage = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M12 3 4 7v10l8 4 8-4V7Z" /><path d="m4 7 8 4 8-4M12 11v10" /></svg>;
const SvgBell = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 19a2 2 0 0 0 4 0" /></svg>;
const SvgChat = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M4 5.5h16v10H9l-4 3.5v-3.5H4Z" /><path d="M8.5 10.5h7M8.5 13h4" /></svg>;
const SvgSettings = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="3" /><path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" /></svg>;
const SvgExternal = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', color: '#c4b297', flexShrink: 0 }}><path d="M18 6v12" /><path d="M6 18 18 6" /></svg>;

interface NavItemProps {
  href: string;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  external?: boolean;
}

function NavItem({ href, onClick, icon, label, external }: NavItemProps) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', margin: '2px 8px',
        fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 500, color: '#1f3028',
        textDecoration: 'none', borderRadius: 8, transition: 'all .15s',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F5F1EC'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {icon}
      {label}
      {external && <SvgExternal />}
    </a>
  );
}
