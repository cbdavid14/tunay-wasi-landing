import { useState, useEffect } from 'react';
import { onAuthStateChanged, sendEmailVerification } from 'firebase/auth';
import { TW, soles as solesFn, toneMap, btnSolid, btnGhost, btnSoft, btnDanger } from './constants';
import { IconGrid, IconPackage, IconTruck, IconRepeat, IconTrophy, IconUser, IconBag, IconMenu, IconLogout, IconUsers, IconTag, IconTicket, IconCoffee, IconChevR, IconChevL, IconChevD, IconCheck, IconMapPin, IconX, IconCopy, IconGlobe, IconShield, IconCard, IconBell, IconLock, IconEdit, IconTrash, IconPause, IconPlay, IconSparkle, IconSettings, IconMore, IconClock, IconStar, IconArrowR, IconChat, IconShare, IconLink, IconMail } from './icons';
import { PageHead, SectionTitle, MonoCap } from './shared';
import { PORTAL_DATA, type User, type Order, type CartItem } from './mockData';
import PortalAuth from './PortalAuth';
import PortalDashboard from './PortalDashboard';
import PortalCatalogo from './PortalCatalogo';
import PortalPedidos from './PortalPedidos';
import PortalCarrito from './PortalCarrito';
import { auth } from '@/shared/firebase';
import { ensurePortalUserProfile, getPortalAuthUser, isRegistering, logoutPortalUser, type PortalAuthUser } from './portalAuthService';

type View = 'inicio' | 'catalogo' | 'pedidos' | 'tracking' | 'suscripcion' | 'recompensas' | 'referidos' | 'cupones' | 'perfil' | 'config' | 'carrito';

const nav: [View, string, typeof IconGrid][] = [
  ['inicio', 'Inicio', IconGrid],
  ['pedidos', 'Mis Pedidos', IconPackage],
  ['tracking', 'Tracking', IconMapPin],
  ['suscripcion', 'Suscripciones', IconRepeat],
  ['recompensas', 'Recompensas', IconStar],
  ['referidos', 'Referidos', IconUsers],
  ['cupones', 'Cupones', IconTag],
  ['perfil', 'Perfil', IconUser],
  ['config', 'Configuración', IconSettings],
];

const bottomNav: [View, string, typeof IconGrid][] = [
  ['inicio', 'Inicio', IconGrid],
  ['pedidos', 'Pedidos', IconPackage],
  ['recompensas', 'Recompensas', IconStar],
  ['suscripcion', 'Suscripciones', IconRepeat],
];

export default function PortalShell() {
  const [view, setView] = useState<View>('inicio');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [authUser, setAuthUser] = useState<PortalAuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => { document.body.style.background = TW.bg; }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          setAuthUser(null);
          setAuthReady(true);
          return;
        }
        if (isRegistering()) {
          return;
        }
        await ensurePortalUserProfile(firebaseUser);
        setAuthUser(await getPortalAuthUser(firebaseUser));
        setAuthReady(true);
      } catch (err) {
        console.error('[PortalShell] auth state error:', err);
        setAuthUser(null);
        setAuthReady(true);
      }
    });
    return unsubscribe;
  }, []);

  const handleResendVerification = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setResending(true);
    try {
      await sendEmailVerification(user, { url: `${window.location.origin}/portal`, handleCodeInApp: false });
    } catch (err) {
      console.error('[PortalShell] resend verification error:', err);
    } finally {
      setResending(false);
    }
  };

  const logout = async () => {
    await logoutPortalUser();
    setAuthUser(null);
    setCart([]);
    setView('inicio');
    setDrawer(false);
    window.scrollTo({ top: 0 });
  };

  const user: User = {
    ...PORTAL_DATA.user,
    nombre: authUser?.nombre || PORTAL_DATA.user.nombre,
    displayName: authUser?.displayName || PORTAL_DATA.user.displayName,
    email: authUser?.email || PORTAL_DATA.user.email,
    telefono: authUser?.telefono || PORTAL_DATA.user.telefono,
    codigoReferido: authUser?.codigoReferido || PORTAL_DATA.user.codigoReferido,
  };

  const products = PORTAL_DATA.products;
  const orders = PORTAL_DATA.orders as Order[];

  const activeOrder = orders.find(o => o.estado === 'en_ruta' || o.estado === 'preparando');

  const addToCart = (item: any) => {
    setCart(prev => {
      const idx = prev.findIndex(p => p.id === item.id && p.molienda === item.molienda);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + item.cantidad };
        return next;
      }
      return [...prev, item];
    });
  };

  const setQty = (item: CartItem, qty: number) =>
    setCart(prev => prev.map(p => (p.id === item.id && p.molienda === item.molienda) ? { ...p, cantidad: qty } : p));

  const removeItem = (item: CartItem) =>
    setCart(prev => prev.filter(p => !(p.id === item.id && p.molienda === item.molienda)));

  const cartCount = cart.reduce((s, i) => s + i.cantidad, 0);

  const go = (v: string) => { setView(v as View); setDrawer(false); window.scrollTo({ top: 0 }); };

  const reorder = (order: Order) => {
    order.items.forEach(it => {
      const prod = products.find(p => p.id === it.productId) || {};
      addToCart({ ...prod, id: it.productId, variedad: it.nombre, caficultor: (prod as any).caficultor || it.nombre, precio: it.precio, molienda: it.molienda, cantidad: it.cantidad, tone: (prod as any).tone || 'green' });
    });
    go('carrito');
  };

  if (!authReady) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: TW.bg, color: TW.ink, fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}>
        Cargando portal...
      </div>
    );
  }

  if (!authUser) return <PortalAuth />;

  const bottomViews = bottomNav.map(n => n[0]);
  const drawerItems = nav.filter(n => !bottomViews.includes(n[0]));

  const SW = collapsed ? 72 : 240;

  const NavItem = ({ v, label, Icon }: { v: View; label: string; Icon: typeof IconGrid }) => {
    const on = view === v;
    return (
      <button key={v} onClick={() => go(v)} className={'tw-navitem' + (on ? ' is-active' : '')} title={collapsed ? '' : undefined} style={{
        display: 'flex', alignItems: 'center', gap: 13, padding: collapsed ? '11px' : '11px 14px',
        justifyContent: collapsed ? 'center' : 'flex-start', borderRadius: 11, cursor: 'pointer', border: 'none', textAlign: 'left',
        background: on ? TW.green : 'transparent', color: on ? '#f7eede' : '#7a6448',
        fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: on ? 700 : 500, width: '100%',
      }}>
        <Icon size={20} style={{ flexShrink: 0 }} />
        {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
        {!collapsed && v === 'recompensas' && (
          <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 500, color: on ? '#e7b15a' : TW.gold }}>{user.puntos.toLocaleString('es-PE')}</span>
        )}
        {collapsed && <span className="tw-tip">{label}</span>}
      </button>
    );
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: TW.bg }}>
      {/* ───────── Desktop sidebar ───────── */}
      <aside className="tw-sidebar" style={{
        width: SW, flexShrink: 0, background: '#fdf8ef', borderRight: `1px solid ${TW.line}`,
        display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh',
        transition: 'width .25s cubic-bezier(.4,0,.2,1)', zIndex: 30,
      }}>
        <div style={{ padding: collapsed ? '22px 0 16px' : '22px 20px 16px', display: 'flex', alignItems: 'center', gap: 11, justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none', justifyContent: collapsed ? 'center' : 'flex-start' }}>
            <div className="tw-logo-pulse" style={{ width: collapsed ? 34 : 40, height: collapsed ? 34 : 40, flexShrink: 0 }}>
              <style>{`
                @keyframes tw-logo-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.03); } }
                .tw-logo-pulse { animation: tw-logo-pulse 2.8s ease-in-out infinite; }
                .tw-logo-pulse img { width: 100%; height: 100%; object-fit: contain; }
              `}</style>
              <img src="/brand/logo.png" alt="Tunay Wasi" />
            </div>
            {!collapsed && (
              <div style={{ lineHeight: 1, whiteSpace: 'nowrap' }}>
                <div style={{ fontFamily: 'Mulish, sans-serif', fontWeight: 700, fontSize: 17, color: TW.ink, letterSpacing: '0.005em' }}>Tunay Wasi</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8.5, letterSpacing: '0.32em', color: '#533b22', marginTop: 4, textTransform: 'uppercase' }}>Verdadera · Casa</div>
              </div>
            )}
          </a>
        </div>

        <nav style={{ padding: collapsed ? '8px 12px' : '8px 12px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflowY: 'auto', overflowX: 'visible' }}>
          {nav.map(([v, label, Icon]) => <NavItem key={v} v={v} label={label} Icon={Icon} />)}
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${TW.line}` }}>
            <button onClick={logout} className="tw-navitem tw-navlogout" title={collapsed ? '' : undefined} style={{
              display: 'flex', alignItems: 'center', gap: 13, padding: collapsed ? '11px' : '11px 14px',
              justifyContent: collapsed ? 'center' : 'flex-start', borderRadius: 11, cursor: 'pointer', border: 'none', textAlign: 'left',
              background: 'transparent', color: '#9a3b1e', fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 600, width: '100%',
            }}>
              <IconLogout size={20} style={{ flexShrink: 0 }} />
              {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>Cerrar sesión</span>}
              {collapsed && <span className="tw-tip">Cerrar sesión</span>}
            </button>
          </div>
        </nav>

        <div style={{ padding: collapsed ? 10 : 12 }}>
          {collapsed ? (
            <button onClick={() => go('perfil')} className="tw-navitem" title="Mi perfil" style={{ width: 48, height: 48, margin: '0 auto', borderRadius: '50%', background: TW.green, color: '#f2e0cc', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: 21, fontWeight: 600, position: 'relative' }}>
              {user.nombre[0]}
              <span className="tw-tip">{user.displayName}</span>
            </button>
          ) : (
            <button onClick={() => go('perfil')} className="tw-usercard" style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 11, padding: 12, background: '#f4ead9', borderRadius: 14, border: 'none', cursor: 'pointer' }}>
              <span style={{ width: 38, height: 38, borderRadius: '50%', background: TW.green, color: '#f2e0cc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 600, flexShrink: 0 }}>{user.nombre[0]}</span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: 'block', fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 700, color: TW.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.displayName}</span>
                <span style={{ display: 'block', fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: TW.sub }}>{user.nivel} · Socia</span>
              </span>
              <IconChevR size={16} style={{ color: TW.sub, flexShrink: 0 }} />
            </button>
          )}
        </div>
      </aside>

      {/* edge toggle */}
      <button className="tw-edgetoggle" onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expandir' : 'Colapsar'} style={{
        position: 'fixed', top: 26, left: SW - 15, zIndex: 35, width: 30, height: 30, borderRadius: '50%',
        background: '#fdf8ef', border: `1px solid ${TW.line}`, color: TW.ink, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px -4px #533b2244',
        transition: 'left .25s cubic-bezier(.4,0,.2,1), background .15s',
      }}>
        {collapsed ? <IconChevR size={16} /> : <IconChevL size={16} />}
      </button>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* mobile header */}
        <header className="tw-mobile-header" style={{
          position: 'sticky', top: 0, zIndex: 40, background: 'rgba(253,248,239,.92)', backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${TW.line}`, padding: '12px 16px', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <button onClick={() => setDrawer(true)} style={{ border: 'none', background: 'transparent', color: TW.ink, cursor: 'pointer', display: 'flex', padding: 4, width: 40 }}><IconMenu size={24} /></button>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <img src="/brand/logo.png" alt="Tunay Wasi" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            <span style={{ fontFamily: 'Mulish, sans-serif', fontWeight: 700, fontSize: 16, color: TW.ink }}>Tunay Wasi</span>
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 40, justifyContent: 'flex-end' }}>
            <button onClick={() => go('carrito')} style={{ position: 'relative', border: 'none', background: 'transparent', color: TW.ink, cursor: 'pointer', display: 'flex', padding: 4 }}>
              <IconBag size={22} />
              {cartCount > 0 && <span style={{ position: 'absolute', top: -3, right: -3, background: TW.gold, color: '#fff', fontFamily: 'Montserrat, sans-serif', fontSize: 9.5, fontWeight: 700, minWidth: 16, height: 16, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cartCount}</span>}
            </button>
          </div>
        </header>

        {/* desktop topbar */}
        <header className="tw-desktop-topbar" style={{
          position: 'sticky', top: 0, zIndex: 25, background: 'rgba(253,248,239,.85)', backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${TW.line}`, padding: '14px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: TW.sub }}>Bienvenida de vuelta</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 600, color: TW.ink, lineHeight: 1 }}>{user.displayName}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {activeOrder && (
              <button onClick={() => go('tracking')} className="tw-topchip" style={{ border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 999, background: '#fbf1df', color: '#8a5a16', fontFamily: 'Montserrat, sans-serif', fontSize: 12.5, fontWeight: 600 }}>
                <IconTruck size={16} /> {activeOrder.id} en ruta
              </button>
            )}
          </div>
        </header>

        {!authUser.emailVerified && (
          <div style={{ background: '#f6e0d4', borderBottom: '1px solid #e6c2b2', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <IconMail size={18} style={{ color: '#9a3b1e', flexShrink: 0 }} />
            <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: '#9a3b1e', flex: 1, minWidth: 200 }}>
              Tu correo <strong>{authUser.email}</strong> aún no está verificado. Revisa tu bandeja de entrada o reenvía el link.
            </span>
            <button onClick={handleResendVerification} disabled={resending} style={{
              fontFamily: 'Montserrat, sans-serif', fontSize: 12.5, fontWeight: 700,
              background: '#9a3b1e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px',
              cursor: resending ? 'wait' : 'pointer', transition: 'all .15s',
            }}>
              {resending ? 'Enviando...' : 'Reenviar verificación'}
            </button>
          </div>
        )}

        {/* view */}
        <main className="tw-main-pad" style={{ padding: '34px 28px 60px', flex: 1 }}>
          {view === 'inicio' && (
            <PortalDashboard user={user} products={products} sub={PORTAL_DATA.activeSub} go={go} onAdd={addToCart} />
          )}
          {view === 'catalogo' && (
            <PortalCatalogo user={user} products={products} activeOrder={activeOrder} onAdd={addToCart} onGoCart={() => go('carrito')} />
          )}
          {view === 'pedidos' && (
            <PortalPedidos orders={orders} products={products} onReorder={reorder} go={go} />
          )}
          {view === 'tracking' && <TrackingView go={go} />}
          {view === 'suscripcion' && <SuscripcionView />}
          {view === 'recompensas' && <RecompensasView user={user} />}
          {view === 'referidos' && <ReferidosView user={user} />}
          {view === 'cupones' && <CuponesView />}
          {view === 'perfil' && <PerfilView user={user} />}
          {view === 'config' && <ConfigView onLogout={logout} />}
          {view === 'carrito' && (
            <PortalCarrito
              cart={cart}
              setQty={setQty}
              removeItem={removeItem}
              onOrderDone={() => { setCart([]); go('inicio'); }}
              onGoCatalogo={() => go('catalogo')}
            />
          )}
        </main>
      </div>

      {/* ───────── Mobile bottom nav ───────── */}
      <nav className="tw-bottomnav" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 45, height: 68,
        background: 'rgba(253,248,239,.96)', backdropFilter: 'blur(12px)', borderTop: `1px solid ${TW.line}`,
        alignItems: 'stretch', justifyContent: 'space-around', paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {bottomNav.map(([v, label, Icon]) => {
          const on = view === v;
          return (
            <button key={v} onClick={() => go(v)} className={'tw-bottomitem' + (on ? ' is-active' : '')} style={{
              flex: 1, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 4, color: on ? TW.green : '#a7977f', padding: '6px 0',
            }}>
              <Icon size={21} style={{ color: on ? TW.green : '#a7977f' }} />
              <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 9.5, fontWeight: on ? 700 : 500, color: on ? TW.green : '#a7977f', whiteSpace: 'nowrap' }}>{label}</span>
            </button>
          );
        })}
        <button onClick={() => setDrawer(true)} className={'tw-bottomitem' + (drawerItems.some(n => n[0] === view) ? ' is-active' : '')} style={{
          flex: 1, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 4, padding: '6px 0',
        }}>
          <IconMore size={21} style={{ color: drawerItems.some(n => n[0] === view) ? TW.green : '#a7977f' }} />
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 9.5, fontWeight: 500, color: drawerItems.some(n => n[0] === view) ? TW.green : '#a7977f' }}>Más</span>
        </button>
      </nav>

      {/* ───────── Mobile drawer (from bottom) ───────── */}
      {drawer && (
        <div onClick={() => setDrawer(false)} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(31,48,40,.5)', display: 'flex', alignItems: 'flex-end', animation: 'tw-fade .2s ease' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: '#fdf8ef', borderRadius: '22px 22px 0 0', padding: '10px 16px calc(20px + env(safe-area-inset-bottom))', animation: 'tw-slideup .28s cubic-bezier(.2,.7,.2,1)', maxHeight: '82vh', overflowY: 'auto' }}>
            <div style={{ width: 44, height: 5, borderRadius: 999, background: '#d8c6a4', margin: '6px auto 14px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 6px 14px', borderBottom: `1px solid ${TW.line}` }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: TW.green, color: '#f2e0cc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 600 }}>{user.nombre[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 700, color: TW.ink }}>{user.displayName}</div>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: TW.sub }}>{user.nivel} · {user.puntos.toLocaleString('es-PE')} pts</div>
              </div>
              <button onClick={() => setDrawer(false)} style={{ width: 34, height: 34, borderRadius: '50%', border: `1px solid ${TW.line}`, background: '#fdf8ef', color: TW.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconX size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingTop: 14 }}>
              {drawerItems.map(([v, label, Icon]) => {
                const on = view === v;
                return (
                  <button key={v} onClick={() => go(v)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 13, cursor: 'pointer', border: 'none', textAlign: 'left',
                    background: on ? TW.green : '#f4ead9', color: on ? '#f7eede' : TW.ink,
                    fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: on ? 700 : 600,
                  }}>
                    <Icon size={20} style={{ flexShrink: 0 }} /> {label}
                  </button>
                );
              })}
            </div>
            <button onClick={logout} style={{ marginTop: 12, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px', borderRadius: 13, cursor: 'pointer', border: `1px solid #e6c2b2`, background: '#f6e0d4', color: '#9a3b1e', fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 600 }}>
              <IconLogout size={18} /> Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TrackingView({ go }: { go: (v: View) => void }) {
  const t = PORTAL_DATA.tracking;
  const total = t.pasos.length;
  const pct = ((t.pasoActual - 1) / (total - 1)) * 100;
  const panelStyle = { background: '#fdf8ef', border: `1px solid ${TW.line}`, borderRadius: 18, boxShadow: '0 1px 2px #533b2212' };

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <PageHead
        eyebrow={`Seguimiento · ${t.pedido}`}
        title="¿Dónde está"
        accent="mi café?"
        sub="Tostamos el día del envío para que llegue ultra fresco. Sigue cada etapa hasta tu puerta."
      />

      <div style={{ marginTop: 26, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {[
          { Icon: IconPackage, k: 'Pedido', v: t.pedido },
          { Icon: IconClock, k: 'Entrega estimada', v: t.estimada },
          { Icon: IconTruck, k: 'Courier', v: t.courier },
        ].map((c) => (
          <div key={c.k} style={{ ...panelStyle, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 38, height: 38, borderRadius: 10, background: '#e7ecdd', color: TW.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><c.Icon size={19} /></span>
            <div style={{ minWidth: 0 }}>
              <MonoCap>{c.k}</MonoCap>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13.5, fontWeight: 600, color: TW.ink, marginTop: 4 }}>{c.v}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...panelStyle, padding: '22px 24px', marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <MonoCap>Progreso del envío</MonoCap>
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12.5, fontWeight: 700, color: TW.gold }}>Paso {t.pasoActual} de {total} · {t.pasos[t.pasoActual - 1].label}</span>
        </div>
        <div style={{ position: 'relative', height: 8, borderRadius: 999, background: '#e3d6bf', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: `linear-gradient(90deg, ${TW.green}, #2d5a3d)`, borderRadius: 999, transition: 'width .5s' }} />
        </div>
      </div>

      <div style={{ ...panelStyle, padding: '8px 24px', marginTop: 16 }}>
        {t.pasos.map((p, i) => {
          const done = p.n < t.pasoActual;
          const current = p.n === t.pasoActual;
          const dotBg = current ? TW.gold : done ? TW.green : '#e9ddc9';
          const dotColor = current || done ? '#fff' : TW.sub;
          return (
            <div key={p.n} style={{ display: 'flex', gap: 16, position: 'relative' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 18 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', background: dotBg, color: dotColor, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: current ? `0 0 0 5px ${TW.gold}22` : 'none', transition: 'all .25s',
                }}>
                  {done ? <IconCheck size={16} /> : <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12.5, fontWeight: 700 }}>{p.n}</span>}
                </div>
                {i < t.pasos.length - 1 && (
                  <div style={{ width: 2, flex: 1, minHeight: 34, background: done ? TW.green : '#e3d6bf', marginTop: 4, borderRadius: 2 }} />
                )}
              </div>
              <div style={{ flex: 1, padding: '18px 0', borderBottom: i < t.pasos.length - 1 ? `1px solid ${TW.line}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 21, fontWeight: 600, color: current || done ? TW.ink : TW.sub, lineHeight: 1 }}>{p.label}</span>
                  {current && (
                    <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9a5a2e', background: '#f4e3cf', padding: '3px 9px', borderRadius: 999 }}>Ahora</span>
                  )}
                </div>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: TW.sub, marginTop: 5 }}>{p.desc}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: done || current ? TW.gold : '#b3a489', marginTop: 6, letterSpacing: '0.03em' }}>{p.hora}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 18, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={() => go('pedidos')} style={btnGhost}><IconChevL size={16} /> Volver a pedidos</button>
        <button onClick={() => go('catalogo')} style={btnSoft}><IconBag size={16} /> Seguir comprando</button>
      </div>
    </div>
  );
}

function SuscripcionView() {
  const cfg = PORTAL_DATA.sub;
  const sub = PORTAL_DATA.activeSub;
  const productos = PORTAL_DATA.products;
  const panelStyle = { background: '#fdf8ef', border: `1px solid ${TW.line}`, borderRadius: 18, boxShadow: '0 1px 2px #533b2212' };

  const gramajes = [
    { id: '250g', label: '250 g', base: 44 },
    { id: '500g', label: '500 g', base: 80 },
    { id: '1kg', label: '1 kg', base: 150 },
  ];
  const frecuencias = [
    { id: 'quincenal', label: 'Cada 15 días', perMonth: 2 },
    { id: 'mensual', label: 'Mensual', perMonth: 1 },
  ];

  const [estado, setEstado] = useState('activa');
  const [gramaje, setGramaje] = useState(sub.cantidad);
  const [frecuencia, setFrecuencia] = useState(sub.frecuencia);
  const [producto, setProducto] = useState(sub.producto);
  const [pickProd, setPickProd] = useState(false);
  const [cancelar, setCancelar] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const gObj = gramajes.find(g => g.id === gramaje);
  const fObj = frecuencias.find(f => f.id === frecuencia);
  const mensual = (gObj?.base || 0) * (fObj?.perMonth || 1);
  const conDesc = mensual * (1 - (cfg?.descuento || 0.1));
  const pausada = estado === 'pausada';

  const guardar = () => { setGuardado(true); setTimeout(() => setGuardado(false), 1600); };

  if (cancelar) {
    return (
      <div style={{ maxWidth: 480, margin: '50px auto 0', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#f6e0d4', color: '#9a3b1e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}><IconX size={32} /></div>
        <SectionTitle size={32}>Suscripción cancelada</SectionTitle>
        <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, color: TW.sub, lineHeight: 1.6, marginTop: 12 }}>Lamentamos verte partir. Tu plan sigue activo hasta el último envío pagado. Puedes reactivarlo cuando quieras.</p>
        <button onClick={() => { setCancelar(false); setEstado('activa'); }} style={{ ...btnSolid, marginTop: 22 }}><IconRepeat size={16} /> Reactivar mi suscripción</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <PageHead eyebrow="Café recurrente" title="Tu suscripción" accent="de café." sub="Recibe café recién tostado sin pensarlo, con 10% de descuento como socia. Ajústala o pausa cuando quieras." />

      <div style={{ ...panelStyle, marginTop: 26, overflow: 'hidden' }}>
        <div style={{ background: pausada ? '#efe4d2' : TW.green, color: pausada ? TW.ink : '#fff', padding: '22px 26px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', transition: 'background .3s' }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, background: pausada ? '#fdf8ef' : '#ffffff18', color: pausada ? TW.sub : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconCoffee size={28} /></div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: pausada ? TW.sub : '#c9a24b' }}>Plan activo</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 600, marginTop: 4, lineHeight: 1 }}>{gObj?.label} · {producto}</div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, marginTop: 6, opacity: 0.85 }}>{fObj?.label} · {solesFn(conDesc)} / mes</div>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 999, fontFamily: 'Montserrat, sans-serif', fontSize: 12.5, fontWeight: 700, background: pausada ? '#f4e3cf' : '#e3ebd8', color: pausada ? '#9a5a2e' : '#2f5a3a' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: pausada ? '#c96e4b' : '#5b8159' }} />
            {pausada ? 'Pausada' : 'Activa'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 0 }}>
          {[
            { Icon: IconTruck, k: 'Próximo envío', v: pausada ? 'En pausa' : sub.proximoEnvio },
            { Icon: IconStar, k: 'Próximo cobro', v: pausada ? '—' : sub.proximoCobro },
            { Icon: IconRepeat, k: 'Frecuencia', v: fObj?.label || '' },
          ].map((r, i) => (
            <div key={r.k} style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 12, borderTop: `1px solid ${TW.line}`, borderLeft: i > 0 ? `1px solid ${TW.line}` : 'none' }}>
              <span style={{ color: TW.gold }}><r.Icon size={18} /></span>
              <div>
                <MonoCap>{r.k}</MonoCap>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 600, color: TW.ink, marginTop: 3 }}>{r.v}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '18px 24px', borderTop: `1px solid ${TW.line}`, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setEstado(pausada ? 'activa' : 'pausada')} style={pausada ? btnSolid : btnGhost}>
            {pausada ? <><IconPlay size={16} /> Reanudar</> : <><IconPause size={16} /> Pausar</>}
          </button>
          <button onClick={() => setPickProd(v => !v)} style={btnGhost}><IconEdit size={16} /> Cambiar producto</button>
          <button onClick={() => setCancelar(true)} style={{ ...btnDanger, marginLeft: 'auto' }}><IconTrash size={16} /> Cancelar</button>
        </div>
      </div>

      {pickProd && (
        <div style={{ ...panelStyle, marginTop: 16, padding: 22 }}>
          <SectionTitle size={22}>Elige tu microlote</SectionTitle>
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 12 }}>
            {productos.map(p => {
              const on = producto === p.variedad;
              const tone = toneMap[p.tone] || toneMap.green;
              return (
                <button key={p.id} onClick={() => { setProducto(p.variedad); }} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                  background: on ? '#e7ecdd' : '#fff', border: `1.5px solid ${on ? TW.green : TW.line}`, transition: 'all .18s',
                }}>
                  <span style={{ width: 40, height: 40, borderRadius: 10, background: tone.bg, color: tone.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconCoffee size={20} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13.5, fontWeight: 600, color: TW.ink }}>{p.variedad}</div>
                    <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11.5, color: TW.sub, marginTop: 2 }}>{p.origen} · {p.region}</div>
                  </div>
                  {on && <IconCheck size={18} style={{ color: TW.green }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ ...panelStyle, padding: 26, marginTop: 16 }}>
        <SectionTitle size={22}>Ajusta tu plan</SectionTitle>

        <div style={{ marginTop: 20 }}>
          <MonoCap mb={10}>Gramaje por entrega</MonoCap>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {gramajes.map(g => (
              <button key={g.id} onClick={() => setGramaje(g.id)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 10, padding: '11px 18px', borderRadius: 999, cursor: 'pointer',
                background: gramaje === g.id ? '#e7ecdd' : '#fff', border: `1.5px solid ${gramaje === g.id ? TW.green : TW.line}`, transition: 'all .18s',
              }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${gramaje === g.id ? TW.green : '#cbb89a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {gramaje === g.id && <span style={{ width: 9, height: 9, borderRadius: '50%', background: TW.green }} />}
                </span>
                <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13.5, fontWeight: 600, color: gramaje === g.id ? TW.green : TW.ink }}>{g.label}</span>
                <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: TW.sub }}>{solesFn(g.base)}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <MonoCap mb={10}>Frecuencia de entrega</MonoCap>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {frecuencias.map(f => (
              <button key={f.id} onClick={() => setFrecuencia(f.id)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 10, padding: '11px 18px', borderRadius: 999, cursor: 'pointer',
                background: frecuencia === f.id ? '#e7ecdd' : '#fff', border: `1.5px solid ${frecuencia === f.id ? TW.green : TW.line}`, transition: 'all .18s',
              }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${frecuencia === f.id ? TW.green : '#cbb89a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {frecuencia === f.id && <span style={{ width: 9, height: 9, borderRadius: '50%', background: TW.green }} />}
                </span>
                <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13.5, fontWeight: 600, color: frecuencia === f.id ? TW.green : TW.ink }}>{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${TW.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <MonoCap>Nuevo estimado mensual</MonoCap>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
              <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32, fontWeight: 600, color: TW.green }}>{solesFn(conDesc)}</span>
              <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: TW.sub, textDecoration: 'line-through' }}>{solesFn(mensual)}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#e7ecdd', color: TW.green, fontFamily: 'Montserrat, sans-serif', fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}><IconSparkle size={12} /> -10% socia</span>
            </div>
          </div>
          <button onClick={guardar} style={{ ...btnSolid, background: guardado ? '#2d5a3d' : TW.green }}>
            {guardado ? <><IconCheck size={16} /> Guardado</> : <>Guardar cambios <IconArrowR size={16} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

function RecompensasView({ user }: { user: User }) {
  const niveles = PORTAL_DATA.niveles;
  const hist = PORTAL_DATA.puntosHistorial;
  const sorteos = PORTAL_DATA.sorteos;

  const idx = niveles.reduce((a, n, i) => (user.puntos >= n.min ? i : a), 0);
  const actual = niveles[idx];
  const siguiente = niveles[idx + 1];
  const faltan = siguiente ? siguiente.min - user.puntos : 0;
  const rango = siguiente ? siguiente.min - actual.min : 1;
  const prog = siguiente ? Math.min(100, ((user.puntos - actual.min) / rango) * 100) : 100;

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <PageHead eyebrow="Programa de socias" title="Tus" accent="recompensas." />

      <div style={{ borderRadius: 18, marginTop: 22, padding: '30px 28px', background: TW.green, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 18 }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c9a24b' }}>Puntos disponibles</div>
            <div style={{ whiteSpace: 'nowrap', marginTop: 6 }}>
              <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 64, fontWeight: 600, lineHeight: 1 }}>{user.puntos.toLocaleString('es-PE')}</span>
              <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 18, fontWeight: 600, color: '#c4b297', marginLeft: 12 }}>pts</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c9a24b' }}>Nivel actual</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 600, marginTop: 4 }}>{actual.label}</div>
          </div>
        </div>

        {siguiente && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Montserrat, sans-serif', fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>
              <span style={{ color: '#e7d4ad' }}>{actual.label}</span>
              <span style={{ color: '#fff' }}>Faltan <strong style={{ color: '#e7b15a' }}>{faltan} pts</strong> para {siguiente.label}</span>
            </div>
            <div style={{ height: 9, borderRadius: 999, background: '#ffffff22', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${prog}%`, background: 'linear-gradient(90deg, #c9a24b, #e7b15a)', borderRadius: 999, transition: 'width .5s' }} />
            </div>
          </div>
        )}
      </div>

      <div style={{ background: '#fdf8ef', border: `1px solid ${TW.line}`, borderRadius: 18, padding: '26px 24px', marginTop: 16 }}>
        <MonoCap mb={18}>Camino de socia</MonoCap>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
          {niveles.map((n, i) => {
            const reached = i <= idx;
            const isCurrent = i === idx;
            return (
              <div key={n.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto', width: 90 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: reached ? TW.green : '#e9ddc9', color: reached ? '#fff' : TW.sub,
                  boxShadow: isCurrent ? `0 0 0 5px ${TW.green}1f` : 'none', fontSize: 15,
                }}>
                  {reached ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5 9 17.5 20 6.5" /></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8-4.3-4.1 5.9-.9Z" /></svg>}
                </div>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: isCurrent ? 700 : 500, color: reached ? TW.ink : TW.sub, marginTop: 9, textAlign: 'center', lineHeight: 1.25 }}>{n.label}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, color: TW.sub, marginTop: 3 }}>{n.min.toLocaleString('es-PE')} pts</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16, alignItems: 'start' }}>
        <div style={{ background: '#fdf8ef', border: `1px solid ${TW.line}`, borderRadius: 18, padding: '22px 24px' }}>
          <SectionTitle size={22}>Historial de puntos</SectionTitle>
          <div style={{ marginTop: 14 }}>
            {hist.map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < hist.length - 1 ? `1px solid ${TW.line}` : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13.5, fontWeight: 600, color: TW.ink }}>{h.concepto}</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: TW.sub, marginTop: 3, letterSpacing: '0.03em' }}>{h.fecha}</div>
                </div>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 700, color: h.pts >= 0 ? '#2f5a3a' : '#9a3b1e', whiteSpace: 'nowrap' }}>
                  {h.pts >= 0 ? '+' : ''}{h.pts} pts
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <SectionTitle size={22}>Sorteos activos</SectionTitle>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {sorteos.map(s => {
              const tone = { gold: { fg: '#a14e2c', bg: '#f3e0cf', ring: '#e0b89a' }, green: { fg: '#1f3028', bg: '#e7ecdd', ring: '#bcd0b5' }, cacao: { fg: '#6b4423', bg: '#efe3d2', ring: '#d8c2a6' } }[s.tone] || { fg: '#a14e2c', bg: '#f3e0cf', ring: '#e0b89a' };
              return (
                <div key={s.id} style={{ background: '#fdf8ef', border: `1px solid ${TW.line}`, borderRadius: 18, overflow: 'hidden' }}>
                  <div style={{ height: 86, background: `linear-gradient(135deg, ${tone.bg}, ${tone.ring})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tone.fg, position: 'relative' }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11h16v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" /><path d="M3 8h18v3H3z" /><path d="M12 8v12" /><path d="M12 8S11 4 8.5 4A2 2 0 0 0 8.5 8H12Zm0 0s1-4 3.5-4A2 2 0 0 1 15.5 8H12Z" /></svg>
                    <span style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(31,48,40,.82)', color: '#fff', fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, fontWeight: 500, padding: '4px 9px', borderRadius: 999, letterSpacing: '0.04em' }}>Cierra {s.cierra}</span>
                  </div>
                  <div style={{ padding: '15px 17px 17px' }}>
                    <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 21, fontWeight: 600, color: TW.ink, margin: 0, lineHeight: 1.05 }}>{s.premio}</h3>
                    <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12.5, color: TW.sub, lineHeight: 1.5, margin: '8px 0 0' }}>{s.desc}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                      <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: TW.sub }}>
                        <strong style={{ color: TW.green }}>{s.ticketsUsados}</strong> ticket{s.ticketsUsados === 1 ? '' : 's'} usado{s.ticketsUsados === 1 ? '' : 's'}
                      </span>
                      <TicketBtn costo={s.costoTicket} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function TicketBtn({ costo }: { costo: number }) {
  const [n, setN] = useState(0);
  return (
    <button onClick={() => setN(v => v + 1)} style={{
      fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 700, padding: '9px 14px', borderRadius: 999,
      border: 'none', cursor: 'pointer', color: '#fff', background: n > 0 ? '#2d5a3d' : TW.green,
      display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all .2s',
    }}>
      {n > 0 ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5 9 17.5 20 6.5" /></svg> +{n} ticket{n === 1 ? '' : 's'}</> : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5V14a2 2 0 0 0 0-4Z" /><path d="M14 6v12" strokeDasharray="2 2.5" /></svg> Canjear {costo} pts</>}
    </button>
  );
}

function ReferidosView({ user }: { user: User }) {
  const ref = PORTAL_DATA.referidos;
  const codigo = user.codigoReferido;
  const link = `tunaywasi.pe/r/${codigo}`;
  const [copied, setCopied] = useState('');

  const copy = (text: string, key: string) => {
    try { navigator.clipboard.writeText(text); } catch {}
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const shares = [
    { key: 'wa', label: 'WhatsApp', Icon: IconChat, bg: '#e7ecdd', fg: '#2f5a3a' },
    { key: 'fb', label: 'Facebook', Icon: IconShare, bg: '#e3e8f0', fg: '#2f4a6b' },
    { key: 'link', label: copied === 'link' ? '¡Link copiado!' : 'Copiar link', Icon: IconLink, bg: '#f3e0cf', fg: '#a14e2c' },
  ];

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <PageHead eyebrow="Invita y gana" title="Comparte el" accent="buen café." sub="Por cada amiga que haga su primera compra con tu código, ambas ganan 100 puntos. El café se disfruta mejor en comunidad." />

      <div style={{ borderRadius: 18, marginTop: 24, padding: '30px 28px', background: TW.green, color: '#fff', textAlign: 'center' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c9a24b' }}>Tu código de referido</div>
        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(34px,6vw,52px)', fontWeight: 600, letterSpacing: '0.06em', lineHeight: 1 }}>{codigo}</div>
          <button onClick={() => copy(codigo, 'code')} style={{
            marginTop: 16, fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 700, padding: '11px 20px', borderRadius: 11,
            border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all .2s',
            background: copied === 'code' ? '#e7b15a' : '#fff', color: copied === 'code' ? '#3a2a18' : TW.green,
          }}>
            {copied === 'code' ? <><IconCheck size={16} /> ¡Copiado!</> : <><IconCopy size={16} /> Copiar código</>}
          </button>
        </div>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: '#c4b297', marginTop: 16 }}>{link}</div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 22, flexWrap: 'wrap' }}>
          {shares.map(s => (
            <button key={s.key} onClick={() => s.key === 'link' ? copy(link, 'link') : null} style={{
              fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 600, padding: '11px 18px', borderRadius: 11,
              border: 'none', cursor: 'pointer', background: s.bg, color: s.fg,
              display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all .2s',
            }}><s.Icon size={17} /> {s.label}</button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#fdf8ef', border: `1px solid ${TW.line}`, borderRadius: 18, padding: 22, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ width: 46, height: 46, borderRadius: 12, background: '#e7ecdd', color: TW.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IconUsers size={24} />
          </span>
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 36, fontWeight: 600, color: TW.ink, lineHeight: 1 }}>{ref.exitosos}</div>
            <MonoCap>Referidos exitosos</MonoCap>
          </div>
        </div>
        <div style={{ background: '#fdf8ef', border: `1px solid ${TW.line}`, borderRadius: 18, padding: 22, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ width: 46, height: 46, borderRadius: 12, background: '#f3e0cf', color: '#a14e2c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IconStar size={24} />
          </span>
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 36, fontWeight: 600, color: TW.ink, lineHeight: 1 }}>{ref.puntosGanados}</div>
            <MonoCap>Puntos por referidos</MonoCap>
          </div>
        </div>
      </div>

      <div style={{ background: '#fdf8ef', border: `1px solid ${TW.line}`, borderRadius: 18, padding: '22px 24px', marginTop: 16 }}>
        <SectionTitle size={22}>Tus invitaciones</SectionTitle>
        <div style={{ marginTop: 12 }}>
          {ref.lista.map((r, i) => {
            const completo = r.estado === 'completo';
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', borderBottom: i < ref.lista.length - 1 ? `1px solid ${TW.line}` : 'none' }}>
                <span style={{ width: 38, height: 38, borderRadius: '50%', background: '#f4ead9', color: TW.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontWeight: 600, flexShrink: 0 }}>{r.nombre[0]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13.5, fontWeight: 600, color: TW.ink }}>{r.nombre}</div>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: TW.sub, marginTop: 2 }}>{r.fecha}</div>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 600, background: completo ? '#e3ebd8' : '#f4e3cf', color: completo ? '#2f5a3a' : '#9a5a2e' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: completo ? '#5b8159' : '#c96e4b' }} />
                  {completo ? 'Completo' : 'Pendiente'}
                </span>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13.5, fontWeight: 700, color: completo ? '#2f5a3a' : TW.sub, minWidth: 64, textAlign: 'right' }}>
                  {completo ? `+${r.pts} pts` : '—'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const MESES: Record<string, number> = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11 };
const parseFecha = (s: string) => {
  const parts = s.trim().split(/\s+/);
  if (parts.length < 3) return new Date(0);
  const [d, m, y] = parts;
  return new Date(+y, MESES[m.slice(0, 3).toLowerCase()] ?? 0, +d);
};
const diasRestantes = (s: string) => Math.ceil((parseFecha(s).getTime() - new Date(2026, 5, 2).getTime()) / 86400000);

function CuponesView() {
  const cupones = PORTAL_DATA.cupones;
  const valorTxt = (c: any) => c.tipo === 'pct' ? `${c.valor}%` : c.tipo === 'soles' ? `S/ ${c.valor}` : 'Envío gratis';

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <PageHead eyebrow="Tu billetera" title="Mis" accent="cupones." sub="Aplica estos descuentos en el checkout. Algunos vencen pronto — no dejes que tu café se enfríe." />

      <div style={{ marginTop: 26, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
        {cupones.map(c => {
          const usado = c.estado === 'usado';
          const dias = diasRestantes(c.vence);
          const urgente = !usado && dias >= 0 && dias < 7;
          return <CuponCard key={c.id} c={c} usado={usado} urgente={urgente} dias={dias} valorTxt={valorTxt(c)} />;
        })}
      </div>
    </div>
  );
}

function CuponCard({ c, usado, urgente, dias, valorTxt }: { c: any; usado: boolean; urgente: boolean; dias: number; valorTxt: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (usado) return;
    try { navigator.clipboard.writeText(c.codigo); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div style={{ background: '#fdf8ef', border: `1px solid ${TW.line}`, borderRadius: 18, overflow: 'hidden', opacity: usado ? 0.62 : 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', background: usado ? '#efe4d2' : TW.green, color: usado ? TW.sub : '#fff', padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconTicket size={26} style={{ color: usado ? TW.sub : '#c9a24b' }} />
          {usado ? (
            <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: '#d8c6a4', color: '#5a4a30', padding: '4px 10px', borderRadius: 999 }}>Usado</span>
          ) : urgente ? (
            <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', background: '#c96e4b', color: '#fff', padding: '4px 10px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <IconClock size={12} /> Vence en {dias}d
            </span>
          ) : null}
        </div>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 44, fontWeight: 600, lineHeight: 1, marginTop: 12 }}>{valorTxt}</div>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12.5, marginTop: 6, opacity: 0.9, lineHeight: 1.4 }}>{c.desc}</div>
      </div>

      <div style={{ position: 'relative', height: 0 }}>
        <span style={{ position: 'absolute', left: -8, top: -8, width: 16, height: 16, borderRadius: '50%', background: TW.bg }} />
        <span style={{ position: 'absolute', right: -8, top: -8, width: 16, height: 16, borderRadius: '50%', background: TW.bg }} />
      </div>

      <div style={{ padding: '18px 22px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <MonoCap>Código</MonoCap>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 17, fontWeight: 500, letterSpacing: '0.06em', color: TW.ink, padding: '8px 12px', background: '#f4ead9', border: `1px dashed ${TW.sub}66`, borderRadius: 9 }}>{c.codigo}</span>
          <button onClick={copy} disabled={usado} style={{
            fontFamily: 'Montserrat, sans-serif', fontSize: 12.5, fontWeight: 700, padding: '9px 13px', borderRadius: 10,
            border: 'none', cursor: usado ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all .2s',
            background: usado ? '#e9ddc9' : (copied ? '#2d5a3d' : '#e7ecdd'), color: usado ? '#b3a489' : (copied ? '#fff' : TW.green),
          }}>
            {copied ? <><IconCheck size={14} /> Copiado</> : <><IconCopy size={14} /> Copiar</>}
          </button>
        </div>
        <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', justifyContent: 'space-between', fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: TW.sub }}>
          <span>{c.cond}</span>
          <span style={{ whiteSpace: 'nowrap' }}>Vence {c.vence}</span>
        </div>
      </div>
    </div>
  );
}

function PerfilView({ user }: { user: User }) {
  const opts = PORTAL_DATA.perfilOpts;
  const def = PORTAL_DATA.perfilDefault;
  const distritos = PORTAL_DATA.distritos;

  const [datos, setDatos] = useState({ nombre: user.displayName, email: user.email, telefono: user.telefono });
  const [dir, setDir] = useState({ direccion: user.direccion, distrito: user.distrito });
  const [prefs, setPrefs] = useState<{ molienda: string; intensidad: string; origen: string }>(def);

  const panelStyle = { background: '#fdf8ef', border: `1px solid ${TW.line}`, borderRadius: 18, boxShadow: '0 1px 2px #533b2212' };

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      <PageHead eyebrow="Tu cuenta" title="Mi" accent="perfil." />

      <div style={{ ...panelStyle, marginTop: 22, padding: '24px 26px', display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: TW.green, color: '#f2e0cc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: 30, fontWeight: 600, flexShrink: 0 }}>
          {user.nombre[0]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 26, fontWeight: 600, color: TW.ink, margin: 0, lineHeight: 1 }}>{user.displayName}</h2>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: TW.sub, marginTop: 5 }}>{user.email}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#e7ecdd', color: TW.green, fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 999 }}>
            <IconTrophy size={14} /> {user.nivel}
          </span>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11.5, color: TW.sub, marginTop: 8 }}>Socia desde {user.miembroDesde}</div>
        </div>
      </div>

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Collapsible title="Datos personales" Icon={IconUser} defaultOpen>
          <PField label="Nombre completo"><input value={datos.nombre} onChange={e => setDatos({ ...datos, nombre: e.target.value })} style={pInp} /></PField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="tw-perfil-grid">
            <PField label="Correo"><input value={datos.email} onChange={e => setDatos({ ...datos, email: e.target.value })} style={pInp} /></PField>
            <PField label="Teléfono"><input value={datos.telefono} onChange={e => setDatos({ ...datos, telefono: e.target.value })} style={pInp} /></PField>
          </div>
          <SaveBtn />
        </Collapsible>

        <Collapsible title="Dirección de envío" Icon={IconMapPin}>
          <PField label="Dirección"><input value={dir.direccion} onChange={e => setDir({ ...dir, direccion: e.target.value })} style={pInp} /></PField>
          <PField label="Distrito de Lima"><PSelect value={dir.distrito} onChange={e => setDir({ ...dir, distrito: e.target.value })} options={distritos} /></PField>
          <SaveBtn />
        </Collapsible>

        <Collapsible title="Preferencias de café" Icon={IconCoffee}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 14 }}>
            <PField label="Molienda"><PSelect value={prefs.molienda} onChange={e => setPrefs({ ...prefs, molienda: e.target.value })} options={opts.molienda} /></PField>
            <PField label="Intensidad"><PSelect value={prefs.intensidad} onChange={e => setPrefs({ ...prefs, intensidad: e.target.value })} options={opts.intensidad} /></PField>
            <PField label="Origen favorito"><PSelect value={prefs.origen} onChange={e => setPrefs({ ...prefs, origen: e.target.value })} options={opts.origen} /></PField>
          </div>
          <div style={{ marginTop: 16, padding: '13px 16px', background: '#eef0e2', borderRadius: 12, borderLeft: `3px solid ${TW.green}`, fontFamily: 'Montserrat, sans-serif', fontSize: 12.5, color: '#3c6b52', lineHeight: 1.5 }}>
            Usamos tus preferencias para recomendarte microlotes y armar tu suscripción.
          </div>
          <SaveBtn />
        </Collapsible>
      </div>
    </div>
  );
}

function Collapsible({ title, children, defaultOpen = false, Icon }: { title: string; children: React.ReactNode; defaultOpen?: boolean; Icon?: React.ComponentType<{ size?: number }> }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: '#fdf8ef', border: `1px solid ${TW.line}`, borderRadius: 18, overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 13, padding: '18px 22px', cursor: 'pointer',
        background: 'transparent', border: 'none', textAlign: 'left',
      }}>
        <span style={{ width: 38, height: 38, borderRadius: 10, background: '#e7ecdd', color: TW.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {Icon ? <Icon size={19} /> : <IconUser size={19} />}
        </span>
        <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 600, color: TW.ink, flex: 1 }}>{title}</span>
        <IconChevD size={20} style={{ color: TW.sub, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>
      {open && (
        <div style={{ padding: '4px 22px 22px', borderTop: `1px solid ${TW.line}` }}>
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
        </div>
      )}
    </div>
  );
}

function PField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <MonoCap mb={8}>{label}</MonoCap>
      {children}
    </div>
  );
}

function PSelect({ value, onChange, options }: { value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; options: readonly string[] }) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={onChange} style={{ ...pInp, appearance: 'none', cursor: 'pointer', paddingRight: 30 } as React.CSSProperties}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <span style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: TW.sub, display: 'flex' }}><IconChevD size={16} /></span>
    </div>
  );
}

function SaveBtn() {
  const [saved, setSaved] = useState(false);
  return (
    <div style={{ marginTop: 4 }}>
      <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 1600); }} style={{
        fontFamily: 'Montserrat, sans-serif', fontSize: 13.5, fontWeight: 700, color: '#fff', background: saved ? '#2d5a3d' : TW.green,
        border: 'none', borderRadius: 11, padding: '12px 18px', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all .2s',
      }}>
        {saved ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5 9 17.5 20 6.5" /></svg> Cambios guardados</> : <>Guardar cambios</>}
      </button>
    </div>
  );
}

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-pressed={on} style={{
      width: 46, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0, position: 'relative',
      background: on ? TW.green : '#d8c6a4', transition: 'background .2s',
    }}>
      <span style={{
        position: 'absolute', top: 3, left: on ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff',
        transition: 'left .2s', boxShadow: '0 1px 3px #533b2244',
      }} />
    </button>
  );
}

function ConfigView({ onLogout }: { onLogout: () => void }) {
  const [notif, setNotif] = useState({ pedidos: true, promos: true, recompensas: false, newsletter: true });
  const [idioma, setIdioma] = useState('Español');
  const toggle = (k: string) => setNotif(n => ({ ...n, [k]: !(n as Record<string, boolean>)[k] }));

  const panelStyle = { background: '#fdf8ef', border: `1px solid ${TW.line}`, borderRadius: 18, boxShadow: '0 1px 2px #533b2212' };

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      <PageHead eyebrow="Tu cuenta" title="Configuración" sub="Controla tus notificaciones, idioma, métodos de pago y privacidad." />

      <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ ...panelStyle, padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <span style={{ width: 38, height: 38, borderRadius: 10, background: '#e7ecdd', color: TW.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconBell size={19} /></span>
            <SectionTitle size={22}>Notificaciones</SectionTitle>
          </div>
          <div style={{ marginTop: 8 }}>
            {[
              ['pedidos', 'Estado de mis pedidos', 'Avisos de preparación, envío y entrega'],
              ['recompensas', 'Puntos y recompensas', 'Cuando ganes puntos o subas de nivel'],
              ['promos', 'Ofertas y cupones', 'Descuentos y microlotes nuevos'],
              ['newsletter', 'Historias del origen', 'Boletín mensual de las fincas'],
            ].map(([k, label, desc], i, arr) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i < arr.length - 1 ? `1px solid ${TW.line}` : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13.5, fontWeight: 600, color: TW.ink }}>{label}</div>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: TW.sub, marginTop: 2 }}>{desc}</div>
                </div>
                <Switch on={notif[k as keyof typeof notif]} onClick={() => toggle(k)} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...panelStyle, padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ width: 38, height: 38, borderRadius: 10, background: '#e7ecdd', color: TW.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconGlobe size={19} /></span>
            <SectionTitle size={22}>Idioma</SectionTitle>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {['Español', 'English', 'Quechua'].map(l => {
              const on = idioma === l;
              return (
                <button key={l} onClick={() => setIdioma(l)} style={{
                  fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 600, padding: '10px 18px', borderRadius: 999, cursor: 'pointer',
                  background: on ? TW.green : '#fff', color: on ? '#f2e0cc' : TW.ink, border: `1.5px solid ${on ? TW.green : TW.line}`, transition: 'all .18s',
                }}>{l}</button>
              );
            })}
          </div>
        </div>

        <div style={{ ...panelStyle, padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ width: 38, height: 38, borderRadius: 10, background: '#e7ecdd', color: TW.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconCard size={19} /></span>
            <SectionTitle size={22}>Método de pago</SectionTitle>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: '#f4ead9', borderRadius: 12 }}>
            <span style={{ width: 42, height: 30, borderRadius: 7, background: TW.green, color: '#f2e0cc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Montserrat, sans-serif', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>Yape</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13.5, fontWeight: 600, color: TW.ink }}>Yape · 987 ••• 321</div>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: TW.sub, marginTop: 2 }}>Predeterminado</div>
            </div>
            <button style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 600, border: `1px solid ${TW.line}`, borderRadius: 9, padding: '8px 14px', cursor: 'pointer', background: '#fff', color: TW.ink, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconEdit size={15} /> Cambiar
            </button>
          </div>
        </div>

        <div style={{ ...panelStyle, padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ width: 38, height: 38, borderRadius: 10, background: '#e7ecdd', color: TW.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconShield size={19} /></span>
            <SectionTitle size={22}>Privacidad y seguridad</SectionTitle>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 600, border: `1px solid ${TW.line}`, borderRadius: 9, padding: '8px 14px', cursor: 'pointer', background: '#fff', color: TW.ink, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconLock size={15} /> Cambiar contraseña
            </button>
            <button style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 600, border: `1px solid ${TW.line}`, borderRadius: 9, padding: '8px 14px', cursor: 'pointer', background: '#fff', color: TW.ink, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              Descargar mis datos
            </button>
            <button onClick={onLogout} style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 600, border: `1px solid ${TW.line}`, borderRadius: 9, padding: '8px 14px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 'auto', background: '#fbeeea', color: '#a14e2c', borderColor: '#e8c6b5' }}>
              <IconLogout size={15} /> Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const pInp: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', fontFamily: 'Montserrat, sans-serif', fontSize: 14, color: TW.ink,
  background: '#fffdf8', border: `1px solid ${TW.line}`, borderRadius: 11, padding: '12px 14px', outline: 'none',
};
