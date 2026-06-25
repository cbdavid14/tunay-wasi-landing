/**
 * AppMarketplace.tsx — SPA unificada para todos los actores B2B
 *
 * Punto de entrada único: catálogo de microlotes (público, sin login).
 * Post-login: el rol del perfil determina qué portal se muestra.
 *
 *   caficultor   → CaficultorPortal
 *   laboratorio  → LaboratorioPortal
 *   cafeteria    → MarketplaceLotes (catálogo + mis pedidos + mis muestras)
 */
import React, { useState, useEffect } from 'react';
import MarketplaceLotes from '@/features/marketplace/components/MarketplaceLotes';
import CheckoutB2B from '@/features/marketplace/components/CheckoutB2B';
import CaficultorPortal from '@/features/marketplace/components/CaficultorPortal';
import LaboratorioPortal from '@/features/marketplace/components/LaboratorioPortal';
import AdminPanel from '@/features/marketplace/components/AdminPanel';
import type { AdminTab } from '@/features/marketplace/components/AdminPanel';
import AuthScreen from '@/features/auth/components/AuthScreen';
import { useAuth } from '@/shared/useAuth';
import { logout } from '@/shared/authService';
import { sincronizarLabDoc } from '@/shared/perfilService';
import { useOnboarding } from '@/shared/useOnboarding';
import OnboardingModal from '@/shared/OnboardingModal';
import OnboardingTour from '@/shared/OnboardingTour';
import type { TourStep } from '@/shared/OnboardingTour';
import NotifBell from '@/shared/NotifBell';
import UserMenu from '@/shared/UserMenu';
import { useIsMobile } from '@/shared/mobileStyles';
import type { LoteDoc } from '@/shared/types/marketplace';
import type { PerfilCafeteria, PerfilCaficultor, PerfilLaboratorio } from '@/shared/types/auth';

type Tab_Caficultor = 'mis_lotes' | 'solicitudes' | 'nuevo_lote' | 'mis_pagos' | 'perfil';
type Tab_Laboratorio = 'mis_muestras' | 'mis_catas' | 'pagos' | 'perfil';

const C = {
  green: '#1f3028', cream: '#f2e0cc', terra: '#c96e4b',
  sage: '#8faf8a', tan: '#c4b297',
};

interface CarritoItem {
  lote: LoteDoc;
  sacos?: number;
  feeLaboratorioPEN?: number;
}

const PASOS_CAFICULTOR: TourStep[] = [
  { targetId: 'tab-caficultor-mis-lotes',   titulo: 'Mis lotes',    descripcion: 'Aquí ves todos tus microlotes: borradores, publicados y vendidos. Controla el stock y el precio desde esta sección.' },
  { targetId: 'tab-caficultor-solicitudes', titulo: 'Mis muestras', descripcion: 'Envía muestras a un laboratorio para certificar tu microlote con puntaje SCA, o al hub Tunay Wasi en Lima para entregas directas a cafeterías.' },
  { targetId: 'tab-caficultor-mis-pagos',   titulo: 'Mis pagos',    descripcion: 'Sigue el estado de cada pedido: cuándo sale de tu finca, cuándo llega al hub y cuándo recibes el pago.' },
  { targetId: 'tab-caficultor-perfil',      titulo: 'Mi perfil',    descripcion: 'Mantén actualizados los datos de tu finca — los compradores los ven antes de solicitar una muestra.' },
];

const PASOS_LABORATORIO: TourStep[] = [
  { targetId: 'tab-lab-mis-muestras', titulo: 'Mis muestras', descripcion: 'Acepta lotes asignados y solicitudes de certificación de caficultores.' },
  { targetId: 'tab-lab-mis-catas',    titulo: 'Mis catas',    descripcion: 'Registra la evaluación SCA (sub-tab Catación) y consulta el historial de lotes catados.' },
  { targetId: 'tab-lab-pagos',        titulo: 'Mis pagos',    descripcion: 'Ve aquí todos los fees que Tunay Wasi te debe transferir por cataciones y certificaciones completadas.' },
  { targetId: 'tab-lab-perfil',       titulo: 'Mi perfil',    descripcion: 'Los caficultores ven tu dirección y fee antes de elegirte — mantenlo siempre actualizado.' },
];

type RolSelector = 'cafeteria' | 'caficultor' | 'laboratorio' | null;

export default function AppMarketplace() {
  const { user, perfil, loading } = useAuth();
  const isMobile = useIsMobile();
  const [showAuth, setShowAuth] = useState(false);
  const [rolSeleccionado, setRolSeleccionado] = useState<RolSelector>(null);
  const [checkout, setCheckout] = useState<CarritoItem[] | null>(null);
  const [showRolError, setShowRolError] = useState(false);
  const [tabPortal, setTabPortal] = useState<string>('');
  const [tabNavMenu, setTabNavMenu] = useState<string | undefined>(undefined);

  // Onboarding para caficultor y laboratorio (la cafetería lo maneja MarketplaceLotes)
  const onbRol = perfil?.rol === 'caficultor' ? 'caficultor' : perfil?.rol === 'laboratorio' ? 'laboratorio' : '';
  const onbUid = perfil?.uid ?? '';
  const { fase: onbFase, iniciarTour, completar: completarOnb } = useOnboarding(onbRol, onbUid);
  const pasosTour = onbRol === 'caficultor' ? PASOS_CAFICULTOR : PASOS_LABORATORIO;

  // Al empezar el tour, navegar al primer tab para que el portal sea visible
  function handleIniciarTour() {
    const primerTab = onbRol === 'caficultor' ? 'mis_lotes' : 'pendientes';
    setTabPortal(primerTab);
    setTabNavMenu(primerTab);
    iniciarTour();
  }

  // Sincronizar doc de laboratorio en mkt_laboratorios al login
  useEffect(() => {
    if (perfil?.rol === 'laboratorio') {
      sincronizarLabDoc(perfil as PerfilLaboratorio);
    }
  }, [perfil?.uid]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ background: C.green, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', color: C.tan, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' }}>
          Cargando...
        </div>
      </div>
    );
  }

  // ── Checkout cafetería ─────────────────────────────────────────────────────
  if (checkout && user && perfil?.rol === 'cafeteria') {
    return (
      <CheckoutB2B
        items={checkout}
        perfil={perfil as PerfilCafeteria}
        onVolver={() => setCheckout(null)}
        onConfirmar={() => setCheckout(null)}
      />
    );
  }

  // ── Pantalla de login / selector de rol ───────────────────────────────────
  if (showAuth && (!user || !perfil)) {
    // Paso 1: selector de rol
    if (!rolSeleccionado) {
      return (
        <div style={{ background: '#f7f3ee', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <nav style={{ background: C.green, padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid rgba(143,175,138,0.15)` }}>
            <span onClick={() => setShowAuth(false)} style={{ fontFamily: 'Mulish, sans-serif', color: C.cream, fontWeight: 900, fontSize: 18, letterSpacing: 2, cursor: 'pointer' }}>
              TUNAY WASI
            </span>
            <button onClick={() => setShowAuth(false)} style={{ background: 'transparent', color: C.tan, border: `1px solid ${C.tan}40`, borderRadius: 8, padding: '6px 14px', fontFamily: 'Montserrat', fontSize: 11, cursor: 'pointer' }}>
              ← Volver al catálogo
            </button>
          </nav>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 }}>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 700, color: C.green, margin: '0 0 8px', textAlign: 'center' }}>
              ¿Cómo usas Tunay Wasi?
            </p>
            <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: C.tan, marginBottom: 24, textAlign: 'center' }}>
              Selecciona tu perfil para continuar
            </p>
            {([
              { rol: 'cafeteria' as const, icon: '☕', label: 'Soy cafetería / tostadora', desc: 'Compra microlotes directamente del origen' },
              { rol: 'caficultor' as const, icon: '🌱', label: 'Soy caficultor', desc: 'Publica tus lotes y llega a cafeterías' },
              { rol: 'laboratorio' as const, icon: '🔬', label: 'Soy laboratorio / Q-Grader', desc: 'Certifica y cata lotes para el mercado' },
            ]).map(op => (
              <button key={op.rol} onClick={() => setRolSeleccionado(op.rol)} style={{
                width: '100%', maxWidth: 400, background: 'white', border: `1.5px solid #e0d8d0`,
                borderRadius: 12, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16,
                cursor: 'pointer', textAlign: 'left',
              }}>
                <span style={{ fontSize: 28 }}>{op.icon}</span>
                <div>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 700, color: C.green }}>{op.label}</div>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: C.tan, marginTop: 2 }}>{op.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Paso 2: formulario auth con rol seleccionado
    return (
      <div style={{ background: '#f7f3ee', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <nav style={{ background: C.green, padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid rgba(143,175,138,0.15)` }}>
          <span onClick={() => { setShowAuth(false); setRolSeleccionado(null); }} style={{ fontFamily: 'Mulish, sans-serif', color: C.cream, fontWeight: 900, fontSize: 18, letterSpacing: 2, cursor: 'pointer' }}>
            TUNAY WASI
          </span>
          <button onClick={() => setRolSeleccionado(null)} style={{ background: 'transparent', color: C.tan, border: `1px solid ${C.tan}40`, borderRadius: 8, padding: '6px 14px', fontFamily: 'Montserrat', fontSize: 11, cursor: 'pointer' }}>
            ← Cambiar perfil
          </button>
        </nav>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{ width: '100%', maxWidth: 420 }}>
            <AuthScreen rol={rolSeleccionado!} onSuccess={() => { setShowAuth(false); setRolSeleccionado(null); }} />
          </div>
        </div>
      </div>
    );
  }

  const perfilCafeteria = (user && perfil?.rol === 'cafeteria') ? perfil as PerfilCafeteria : null;

  // Construir tabsExtra según rol del usuario logueado
  type TabExtra = { key: string; label: string; badge?: number; content: React.ReactNode; tourId?: string };
  let tabsExtra: TabExtra[] | undefined;

  if (user && perfil?.rol === 'caficultor') {
    const caf = perfil as PerfilCaficultor;
    const content = (
      <CaficultorPortal
        caficultor={caf}
        onLogout={() => logout()}
        modoEmbebido
        tabActivo={tabPortal as Tab_Caficultor}
      />
    );
    tabsExtra = [
      { key: 'mis_lotes',   label: 'Mis lotes',              tourId: 'tab-caficultor-mis-lotes',   content },
      { key: 'solicitudes', label: 'Mis muestras',            tourId: 'tab-caficultor-solicitudes', content },
      { key: 'mis_pagos',   label: 'Mis pagos',              tourId: 'tab-caficultor-mis-pagos',   content },
      { key: 'perfil',      label: 'Mi perfil',              tourId: 'tab-caficultor-perfil',      content },
    ];
  } else if (user && perfil?.rol === 'laboratorio') {
    const lab = perfil as PerfilLaboratorio;
    const content = (
      <LaboratorioPortal
        laboratorio={lab}
        onLogout={() => logout()}
        modoEmbebido
        tabActivo={tabPortal as Tab_Laboratorio}
      />
    );
    tabsExtra = [
      { key: 'mis_muestras', label: 'Mis muestras', tourId: 'tab-lab-mis-muestras', content },
      { key: 'mis_catas',    label: 'Mis catas',    tourId: 'tab-lab-mis-catas',    content },
      { key: 'pagos',        label: 'Mis pagos',    tourId: 'tab-lab-pagos',        content },
      { key: 'perfil',       label: 'Mi perfil',    tourId: 'tab-lab-perfil',       content },
    ];
  } else if (user && perfil?.rol === 'admin') {
    const content = (
      <AdminPanel modoEmbebido tabActivo={tabPortal as AdminTab} onLogout={() => logout()} />
    );
    tabsExtra = [
      { key: 'dashboard',    label: 'Dashboard',    tourId: 'tab-admin-dashboard',    content },
      { key: 'muestras',     label: 'Muestras hub', tourId: 'tab-admin-muestras',     content },
      { key: 'pagos',        label: 'Pagos',        tourId: 'tab-admin-pagos',        content },
      { key: 'logistica',    label: 'Logística',    tourId: 'tab-admin-logistica',    content },
      { key: 'laboratorios', label: 'Laboratorios', tourId: 'tab-admin-laboratorios', content },
    ];
  }

  // Nav items para UserMenu según rol
  let navItems: { key: string; label: string }[] = [];
  if (user && perfil?.rol === 'cafeteria') {
    navItems = [
      { key: 'catalogo',         label: 'Catálogo' },
      { key: 'muestras',         label: 'Mis muestras' },
      { key: 'pedidos',          label: 'Mis pedidos' },
      { key: 'perfil_cafeteria', label: 'Mi perfil' },
    ];
  } else if (user && perfil?.rol === 'admin') {
    navItems = [
      { key: 'catalogo',     label: 'Catálogo' },
      { key: 'dashboard',    label: 'Dashboard' },
      { key: 'muestras',     label: 'Muestras hub' },
      { key: 'pagos',        label: 'Pagos' },
      { key: 'logistica',    label: 'Logística' },
      { key: 'laboratorios', label: 'Laboratorios' },
    ];
  } else {
    navItems = tabsExtra?.map(t => ({ key: t.key, label: t.label })) ?? [];
  }

  return (
    <>
      {/* Onboarding caficultor / laboratorio — se muestra encima de todo al hacer login */}
      {onbRol && onbFase === 'modal' && (
        <OnboardingModal rol={onbRol as 'caficultor' | 'laboratorio'} nombre={perfil?.nombre ?? ''} onEmpezarTour={handleIniciarTour} onSaltar={completarOnb} />
      )}
      {onbRol && onbFase === 'tour' && (
        <OnboardingTour pasos={pasosTour} onFin={completarOnb} onSaltar={completarOnb} />
      )}

      {/* Nav principal — oculto en mobile (cada portal tiene su propio header+tabbar) */}
      {!isMobile && (
      <nav style={{
        background: C.green, borderBottom: `1px solid rgba(143,175,138,0.2)`,
        padding: isMobile ? '0 16px' : '0 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: isMobile ? 52 : 64,
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'Mulish, sans-serif', color: C.cream, fontWeight: 900, fontSize: isMobile ? 15 : 18, letterSpacing: 2 }}>
            TUNAY WASI
          </span>
          {!isMobile && (
            <span style={{
              background: C.terra, color: 'white', fontSize: 9,
              fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
              padding: '2px 8px', borderRadius: 20, letterSpacing: 1, textTransform: 'uppercase',
            }}>
              Marketplace
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {user && perfil ? (
            <>
              <NotifBell
                uid={user.uid}
                onNavegar={(url) => {
                  setTabPortal(url);
                  setTabNavMenu(url);
                  setTimeout(() => setTabNavMenu(undefined), 50);
                }}
              />
              <UserMenu
                perfil={perfil}
                onLogout={() => logout()}
                navItems={navItems.length > 0 ? navItems : undefined}
                onNavegar={(key) => {
                  setTabPortal(key);
                  setTabNavMenu(key);
                  setTimeout(() => setTabNavMenu(undefined), 50);
                }}
              />
            </>
          ) : (
            <button onClick={() => setShowAuth(true)} style={{
              background: C.terra, color: 'white', border: 'none', borderRadius: 8,
              padding: isMobile ? '7px 14px' : '8px 20px',
              fontFamily: 'Montserrat', fontSize: isMobile ? 12 : 13, fontWeight: 700, cursor: 'pointer',
            }}>
              {isMobile ? 'Entrar →' : 'Iniciar sesión →'}
            </button>
          )}
        </div>
      </nav>
      )}

      {/* Mini-nav mobile — notificaciones + logout para todos los roles logueados */}
      {isMobile && user && perfil && (
        <div style={{
          background: C.green, padding: '8px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, zIndex: 100,
          borderBottom: '1px solid rgba(143,175,138,0.2)',
        }}>
          <span style={{ fontFamily: 'Mulish, sans-serif', color: C.cream, fontWeight: 900, fontSize: 14, letterSpacing: 2 }}>
            TUNAY WASI
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <NotifBell uid={user.uid} onNavegar={(url) => { setTabPortal(url); setTabNavMenu(url); setTimeout(() => setTabNavMenu(undefined), 50); }} />
            {/* Salir para todos los roles — caficultor y laboratorio tienen logout en header propio en desktop pero no en mobile embebido */}
            <button onClick={() => logout()} style={{
              background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8,
              color: C.cream, fontFamily: 'Montserrat', fontSize: 11, fontWeight: 600,
              padding: '7px 12px', cursor: 'pointer',
            }}>
              Salir
            </button>
          </div>
        </div>
      )}


      <MarketplaceLotes
        perfil={perfilCafeteria}
        isLoggedIn={!!user}
        onCheckout={(items) => {
          if (!user) { setShowAuth(true); return; }
          if (perfil?.rol !== 'cafeteria') {
            setShowRolError(true);
            setTimeout(() => setShowRolError(false), 4000);
            return;
          }
          setCheckout(items);
        }}
        onNecesitaLogin={() => setShowAuth(true)}
        onLogout={() => logout()}
        tabsExtra={tabsExtra}
        onTabExtraChange={(key) => setTabPortal(key)}
        tabActivo={tabNavMenu}
        autoNavExtraTab={perfil?.rol !== 'admin'}
      />

      {/* Toast — rol incorrecto para comprar */}
      {showRolError && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 600, display: 'flex', alignItems: 'center', gap: 12,
          background: '#1f3028', color: '#f2e0cc',
          borderRadius: 14, padding: '14px 20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          fontFamily: 'Montserrat, sans-serif',
          maxWidth: 'calc(100vw - 48px)',
          animation: 'fadeSlideUp 0.25s ease',
        }}>
          <span style={{ fontSize: 20 }}>🛒</span>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#f2e0cc' }}>
              Solo cafeterías y tostadoras pueden comprar
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#c4b297' }}>
              Estás con una cuenta de {perfil?.rol === 'caficultor' ? 'caficultor' : 'laboratorio'}. Inicia sesión con tu cuenta de cafetería.
            </p>
          </div>
          <button
            onClick={() => setShowRolError(false)}
            style={{ background: 'none', border: 'none', color: '#c4b297', fontSize: 18, cursor: 'pointer', padding: '0 0 0 8px', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
