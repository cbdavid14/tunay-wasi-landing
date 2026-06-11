/**
 * AppMarketplace.tsx — SPA para la cafetería compradora
 * VITE_APP_TARGET=marketplace         → Cafetería sin laboratorio propio
 * VITE_APP_TARGET=cafeteria_lab       → Cafetería con laboratorio propio (activa "Mi laboratorio")
 *
 * Flujo:
 *   Loading → sin sesión: Landing + AuthScreen → con sesión: MarketplaceLotes → CheckoutB2B
 */
import { useState } from 'react';
import MarketplaceLotes from '@/features/marketplace/components/MarketplaceLotes';
import CheckoutB2B from '@/features/marketplace/components/CheckoutB2B';
import AuthScreen from '@/features/auth/components/AuthScreen';
import { useAuth } from '@/shared/useAuth';
import { logout } from '@/shared/authService';
import type { LoteDoc } from '@/shared/types/marketplace';
import type { PerfilDoc } from '@/shared/types/auth';

const C = {
  green: '#1f3028', cream: '#f2e0cc', terra: '#c96e4b',
  sage: '#8faf8a', tan: '#c4b297',
};

interface CarritoItem {
  lote: LoteDoc;
  sacos?: number;
  feeLaboratorioPEN?: number;
}

type Vista = 'landing' | 'catalogo';

export default function AppMarketplace() {
  const { user, perfil, loading } = useAuth();
  const [vista, setVista] = useState<Vista>('landing');
  const [checkout, setCheckout] = useState<CarritoItem[] | null>(null);

  // tieneLaboratorio viene del perfil de Firestore, no de la variable de entorno
  const tieneLaboratorio = perfil?.rol === 'cafeteria'
    ? (perfil as import('@/shared/types/auth').PerfilCafeteria).tieneLaboratorio ?? false
    : false;

  if (loading) {
    return (
      <div style={{ background: C.green, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', color: C.tan, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' }}>
          Cargando...
        </div>
      </div>
    );
  }

  // Una vez autenticado → catálogo o checkout
  if (user && perfil?.rol === 'cafeteria') {
    if (vista === 'catalogo' || checkout) {
      return (
        <>
          {!checkout && (
            <nav style={{
              background: C.green, borderBottom: `1px solid rgba(143,175,138,0.2)`,
              padding: '0 24px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', height: 64,
              position: 'sticky', top: 0, zIndex: 100,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: 'Mulish, sans-serif', color: C.cream, fontWeight: 900, fontSize: 18, letterSpacing: 2 }}>
                  TUNAY WASI
                </span>
                <span style={{
                  background: C.terra, color: 'white', fontSize: 9,
                  fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                  padding: '2px 8px', borderRadius: 20, letterSpacing: 1, textTransform: 'uppercase',
                }}>
                  {tieneLaboratorio ? 'Cafetería + Lab' : 'Marketplace'}
                </span>
              </div>
              <button
                onClick={() => logout()}
                style={{
                  background: 'transparent', color: C.tan, border: `1px solid ${C.tan}40`,
                  borderRadius: 8, padding: '6px 14px', fontFamily: 'Montserrat',
                  fontSize: 11, cursor: 'pointer',
                }}
              >
                Cerrar sesión
              </button>
            </nav>
          )}

          {!checkout && (
            <MarketplaceLotes
              tieneLaboratorio={tieneLaboratorio}
              perfil={perfil as import('@/shared/types/auth').PerfilCafeteria}
              onCheckout={(items) => setCheckout(items)}
            />
          )}

          {checkout && (
            <CheckoutB2B
              items={checkout}
              perfil={perfil as import('@/shared/types/auth').PerfilCafeteria}
              onVolver={() => setCheckout(null)}
              onConfirmar={() => setCheckout(null)}
            />
          )}
        </>
      );
    }
  }

  // Sin sesión activa o en landing → landing + auth
  return (
    <div style={{ background: '#f7f3ee', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Nav */}
      <nav style={{
        background: C.green, padding: '0 32px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid rgba(143,175,138,0.15)`,
      }}>
        <span style={{ fontFamily: 'Mulish, sans-serif', color: C.cream, fontWeight: 900, fontSize: 18, letterSpacing: 2 }}>
          TUNAY WASI
        </span>
        {user && perfil?.rol === 'cafeteria' && (
          <button
            onClick={() => setVista('catalogo')}
            style={{
              background: C.terra, color: 'white', border: 'none', borderRadius: 8,
              padding: '8px 20px', fontFamily: 'Montserrat, sans-serif', fontSize: 13,
              fontWeight: 700, cursor: 'pointer',
            }}
          >
            Ver catálogo →
          </button>
        )}
      </nav>

      {/* Hero */}
      <div style={{ background: C.green, padding: '64px 32px 56px', color: C.cream }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 40, alignItems: 'flex-start' }}>

          {/* Copy */}
          <div style={{ flex: '1 1 340px' }}>
            <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: C.sage, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>
              Café verde · Microlotes de origen
            </p>
            <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 700, lineHeight: 1.1, margin: '0 0 20px' }}>
              Compra directo del caficultor.<br />Con trazabilidad completa.
            </h1>
            <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 15, color: C.tan, lineHeight: 1.8, maxWidth: 520, marginBottom: 36 }}>
              Microlotes de café verde en grano. Sacos de 60 kg. Puntaje SCA certificado por laboratorio.
              {tieneLaboratorio
                ? ' Tu portal incluye "Mi laboratorio" para catar y aprobar los lotes que compras.'
                : ' Elige el laboratorio que catará y tostará tu muestra — todo dentro de la plataforma.'}
            </p>

            <div style={{ display: 'flex', gap: 40 }}>
              {[
                { n: '10%', label: 'comisión total TW' },
                { n: '48h', label: 'pago al caficultor' },
                { n: '82+', label: 'pts SCA mínimo' },
              ].map(s => (
                <div key={s.n}>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32, fontWeight: 700, color: C.cream }}>{s.n}</div>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 10, color: C.tan, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Auth — solo si no está autenticado */}
          {!user && (
            <div style={{ flex: '1 1 340px', maxWidth: 420 }}>
              <AuthScreen
                rol="cafeteria"
                onSuccess={(_perfil: PerfilDoc) => {
                  setVista('catalogo');
                }}
              />
            </div>
          )}

          {/* Si ya autenticado en landing, muestra botón */}
          {user && perfil?.rol === 'cafeteria' && (
            <div style={{ flex: '1 1 340px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button
                onClick={() => setVista('catalogo')}
                style={{
                  background: C.terra, color: 'white', border: 'none', borderRadius: 10,
                  padding: '16px 36px', fontFamily: 'Montserrat, sans-serif', fontSize: 15,
                  fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5,
                }}
              >
                Explorar lotes disponibles →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Propuesta de valor */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '56px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
          {[
            {
              title: 'Origen verificado',
              body: 'Cada lote tiene nombre de finca, variedad, proceso y altitud. La ficha de trazabilidad es descargable para tu empaque.',
            },
            {
              title: tieneLaboratorio ? 'Tu laboratorio integrado' : 'Elige tu laboratorio',
              body: tieneLaboratorio
                ? 'Cata y tuesta en tu propio lab. Registra los resultados desde "Mi laboratorio" y aprueba el lote para comprarlo.'
                : 'La plataforma lista los laboratorios disponibles con sus fees. Tú eliges, nosotros coordinamos.',
            },
            {
              title: 'Pago directo al caficultor',
              body: 'Tunay Wasi cobra solo el 10% de comisión sobre el total. El caficultor recibe su pago dentro de las 48h.',
            },
          ].map(card => (
            <div key={card.title} style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, color: C.green, margin: '0 0 10px' }}>{card.title}</h3>
              <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: '#666', lineHeight: 1.7, margin: 0 }}>{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
