/**
 * AppCaficultor.tsx — SPA para el portal del caficultor
 * VITE_APP_TARGET=caficultor
 *
 * Flujo:
 *   Loading → sin sesión: Landing + AuthScreen → con sesión: CaficultorPortal
 */
import CaficultorPortal from '@/features/marketplace/components/CaficultorPortal';
import AuthScreen from '@/features/auth/components/AuthScreen';
import { useAuth } from '@/shared/useAuth';
import { logout } from '@/shared/authService';
import type { PerfilDoc } from '@/shared/types/auth';

const C = {
  green: '#1f3028', cream: '#f2e0cc', terra: '#c96e4b',
  sage: '#8faf8a', tan: '#c4b297', brown: '#533b22',
};

export default function AppCaficultor() {
  const { user, perfil, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ background: C.green, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', color: C.tan, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' }}>
          Cargando...
        </div>
      </div>
    );
  }

  if (user && perfil?.rol === 'caficultor') {
    return (
      <CaficultorPortal
        caficultor={perfil}
        onLogout={() => logout()}
      />
    );
  }

  // Sin sesión activa → landing + auth
  return (
    <div style={{ background: C.green, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Nav */}
      <nav style={{ padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid rgba(143,175,138,0.15)` }}>
        <span style={{ fontFamily: 'Mulish, sans-serif', color: C.cream, fontWeight: 900, fontSize: 18, letterSpacing: 2 }}>
          TUNAY WASI
        </span>
      </nav>

      {/* Hero + AuthScreen lado a lado en desktop, apilados en mobile */}
      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', padding: '48px 32px', maxWidth: 1100, margin: '0 auto', width: '100%', gap: 40 }}>

        {/* Copy */}
        <div style={{ flex: '1 1 340px' }}>
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: C.sage, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>
            Portal Caficultor · Tunay Wasi
          </p>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(36px, 5vw, 56px)', color: C.cream, fontWeight: 700, lineHeight: 1.1, margin: '0 0 20px' }}>
            Registra tu lote.<br />El mercado llega a ti.
          </h1>
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 15, color: C.tan, lineHeight: 1.8, maxWidth: 480, marginBottom: 36 }}>
            Publica tu microlote con datos básicos: variedad, proceso, altitud y precio mínimo.
            Las cafeterías encuentran tu café, piden muestra y compran directamente.
          </p>

          <div style={{ display: 'flex', gap: 32 }}>
            {[
              { n: '0%', label: 'costo de publicar' },
              { n: '10%', label: 'comisión sobre venta' },
              { n: '48h', label: 'pago tras confirmación' },
            ].map(s => (
              <div key={s.n}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32, fontWeight: 700, color: C.terra }}>{s.n}</div>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 10, color: C.tan, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Auth */}
        <div style={{ flex: '1 1 340px', maxWidth: 420 }}>
          <AuthScreen
            rol="caficultor"
            onSuccess={(_perfil: PerfilDoc) => {
              // useAuth() re-renderiza automáticamente tras el cambio de estado de Firebase Auth
            }}
          />
        </div>
      </div>
    </div>
  );
}
