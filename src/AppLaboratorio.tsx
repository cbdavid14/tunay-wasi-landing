/**
 * AppLaboratorio.tsx — SPA para el portal del laboratorio
 * VITE_APP_TARGET=laboratorio
 *
 * Aplica para:
 *   - Laboratorio independiente certificado
 *   - Cafetería con laboratorio propio que ofrece sus servicios a otras cafeterías
 *
 * Flujo:
 *   Loading → sin sesión: Landing + AuthScreen → con sesión: LaboratorioPortal
 */
import LaboratorioPortal from '@/features/marketplace/components/LaboratorioPortal';
import AuthScreen from '@/features/auth/components/AuthScreen';
import { useAuth } from '@/shared/useAuth';
import { logout } from '@/shared/authService';
import { sincronizarLabDoc } from '@/shared/perfilService';
import type { PerfilDoc } from '@/shared/types/auth';
import { useEffect } from 'react';

const C = {
  green: '#1f3028', cream: '#f2e0cc', terra: '#c96e4b',
  sage: '#8faf8a', tan: '#c4b297', brown: '#533b22',
};

export default function AppLaboratorio() {
  const { user, perfil, loading } = useAuth();

  // Sincroniza el doc en mkt_laboratorios cada vez que el laboratorio inicia sesión
  useEffect(() => {
    if (perfil?.rol === 'laboratorio') {
      sincronizarLabDoc(perfil);
    }
  }, [perfil?.uid]);

  if (loading) {
    return (
      <div style={{ background: C.brown, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', color: C.tan, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' }}>
          Cargando...
        </div>
      </div>
    );
  }

  if (user && perfil?.rol === 'laboratorio') {
    return (
      <LaboratorioPortal
        laboratorio={perfil}
        onLogout={() => logout()}
      />
    );
  }

  // Sin sesión activa → landing + auth
  return (
    <div style={{ background: C.brown, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Nav */}
      <nav style={{ padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid rgba(196,178,151,0.15)` }}>
        <span style={{ fontFamily: 'Mulish, sans-serif', color: C.cream, fontWeight: 900, fontSize: 18, letterSpacing: 2 }}>
          TUNAY WASI
        </span>
      </nav>

      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', padding: '48px 32px', maxWidth: 1100, margin: '0 auto', width: '100%', gap: 40 }}>

        {/* Copy */}
        <div style={{ flex: '1 1 340px' }}>
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: C.tan, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>
            Portal Laboratorio · Tunay Wasi
          </p>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(36px, 5vw, 56px)', color: C.cream, fontWeight: 700, lineHeight: 1.1, margin: '0 0 20px' }}>
            Cata y tuesta.<br />La plataforma distribuye el pago.
          </h1>
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 15, color: C.tan, lineHeight: 1.8, maxWidth: 520, marginBottom: 36 }}>
            Recibe solicitudes de catación y tueste de cafeterías en la plataforma.
            Fija tus propios fees. Registra los resultados SCA.
            Tunay Wasi transfiere tu pago dentro de las 48h tras la confirmación del pedido.
          </p>
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: `${C.tan}99`, lineHeight: 1.7, maxWidth: 480, marginBottom: 36 }}>
            Si eres una cafetería con laboratorio propio, este mismo portal sirve para
            gestionar las cataciones de tus propios lotes y ofrecer el servicio a otras cafeterías.
          </p>

          <div style={{ display: 'flex', gap: 32 }}>
            {[
              { n: 'Tú', label: 'fijas tus fees' },
              { n: '48h', label: 'pago tras confirmación' },
              { n: 'SCA', label: 'estándar reconocido' },
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
            rol="laboratorio"
            onSuccess={(_perfil: PerfilDoc) => {
              // useAuth() re-renderiza automáticamente
            }}
          />
        </div>
      </div>
    </div>
  );
}
