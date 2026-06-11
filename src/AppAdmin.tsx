/**
 * AppAdmin.tsx — SPA para el panel administrador de Tunay Wasi
 * VITE_APP_TARGET=admin
 *
 * Sin landing pública — solo login, acceso directo al panel.
 */
import AdminPanel from '@/features/marketplace/components/AdminPanel';
import AuthScreen from '@/features/auth/components/AuthScreen';
import { useAuth } from '@/shared/useAuth';
import { logout } from '@/shared/authService';

const C = {
  green: '#1f3028', cream: '#f2e0cc', terra: '#c96e4b', tan: '#c4b297',
};

export default function AppAdmin() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ background: C.green, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', color: C.tan, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' }}>
          Cargando...
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <>
        <div style={{
          background: C.green, padding: '0 24px', height: 52,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(143,175,138,0.15)',
        }}>
          <span style={{ fontFamily: 'Mulish, sans-serif', color: C.cream, fontWeight: 900, fontSize: 16, letterSpacing: 2 }}>
            TUNAY WASI · Admin
          </span>
          <button
            onClick={() => logout()}
            style={{
              background: 'transparent', color: C.tan, border: `1px solid ${C.tan}40`,
              borderRadius: 8, padding: '5px 12px', fontFamily: 'Montserrat, sans-serif',
              fontSize: 11, cursor: 'pointer',
            }}
          >
            Cerrar sesión
          </button>
        </div>
        <AdminPanel />
      </>
    );
  }

  // Login
  return (
    <div style={{ background: C.green, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{ fontFamily: 'Mulish, sans-serif', color: C.cream, fontWeight: 900, fontSize: 22, letterSpacing: 2 }}>
            TUNAY WASI
          </span>
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: C.tan, letterSpacing: 2, textTransform: 'uppercase', marginTop: 6 }}>
            Panel Administrador
          </p>
        </div>
        <AuthScreen rol="admin" onSuccess={() => {}} />
      </div>
    </div>
  );
}
