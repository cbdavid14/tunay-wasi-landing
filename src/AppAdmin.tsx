/**
 * AppAdmin.tsx — Entry point para ?target=admin
 *
 * Si el usuario ya es admin autenticado → redirige a / (marketplace unificado).
 * Si no es admin → pantalla de acceso denegado.
 * Si no hay sesión → pantalla de login.
 */
import AuthScreen from '@/features/auth/components/AuthScreen';
import { useAuth } from '@/shared/useAuth';
import { logout } from '@/shared/authService';

const C = {
  green: '#1f3028', cream: '#f2e0cc', terra: '#c96e4b', tan: '#c4b297',
};

export default function AppAdmin() {
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

  // Admin autenticado → redirigir al marketplace unificado
  if (user && perfil?.rol === 'admin') {
    window.location.replace(window.location.pathname);
    return null;
  }

  // Otro rol → acceso denegado
  if (user && perfil && perfil.rol !== 'admin') {
    return (
      <div style={{ background: C.green, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: 'Montserrat, sans-serif', color: C.terra, fontSize: 14, marginBottom: 8 }}>
            Acceso denegado
          </p>
          <p style={{ fontFamily: 'Montserrat, sans-serif', color: C.tan, fontSize: 12, marginBottom: 24 }}>
            Tu cuenta no tiene permisos de administrador.
          </p>
          <button
            onClick={() => logout()}
            style={{
              background: 'transparent', color: C.tan, border: `1px solid ${C.tan}40`,
              borderRadius: 8, padding: '6px 16px', fontFamily: 'Montserrat, sans-serif',
              fontSize: 11, cursor: 'pointer',
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  // Sin sesión → login
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
