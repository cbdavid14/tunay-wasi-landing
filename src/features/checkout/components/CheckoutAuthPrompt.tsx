/**
 * CheckoutAuthPrompt.tsx — Registro opcional post-checkout B2C
 * Aparece debajo de "¡Pedido recibido!" para que el cliente guarde su pedido.
 * Props:
 *   orderId  → número de pedido ya confirmado
 *   onDone   → callback cuando el usuario termina (con o sin registro)
 */
import { useState } from 'react';
import { loginWithEmail, registerWithEmail } from '@/shared/authService';
import { crearPerfil, vincularPedido } from '@/shared/perfilService';

const C = {
  green: '#1f3028', cream: '#f2e0cc', terra: '#c96e4b',
  tan: '#c4b297', brown: '#533b22', sage: '#8faf8a',
};

interface Props {
  orderId: string;
  onDone: () => void;
}

function mensajeError(e: unknown): string {
  if (e && typeof e === 'object' && 'code' in e) {
    const code = (e as { code: string }).code;
    if (code === 'auth/invalid-email') return 'Email inválido.';
    if (code === 'auth/wrong-password') return 'Contraseña incorrecta.';
    if (code === 'auth/weak-password') return 'La contraseña debe tener al menos 6 caracteres.';
    if (code === 'auth/email-already-in-use') return 'Ya tienes una cuenta. Ingresa con tu contraseña.';
    if (code === 'auth/too-many-requests') return 'Demasiados intentos. Espera unos minutos.';
  }
  return 'Ocurrió un error. Intenta de nuevo.';
}

export default function CheckoutAuthPrompt({ orderId, onDone }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8,
    fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: C.brown,
    background: '#fafafa', boxSizing: 'border-box',
  };

  async function handleGuardar() {
    setError(''); setGuardando(true);
    try {
      let uid: string;
      try {
        // Intenta login primero (usuario existente)
        const user = await loginWithEmail(email, password);
        uid = user.uid;
        await vincularPedido(uid, orderId);
      } catch (loginErr: unknown) {
        const code = loginErr && typeof loginErr === 'object' && 'code' in loginErr
          ? (loginErr as { code: string }).code : '';
        if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
          // Usuario nuevo — registrar
          const user = await registerWithEmail(email, password);
          uid = user.uid;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const perfilRaw: any = { rol: 'cliente', nombre: email.split('@')[0], email, orderId };
          await crearPerfil(uid, perfilRaw);
        } else {
          throw loginErr;
        }
      }
      setGuardado(true);
      setTimeout(onDone, 1800);
    } catch (e: unknown) {
      setError(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  }

  if (guardado) {
    return (
      <div style={{ marginTop: 24, padding: '16px 20px', background: '#f0f9f0', borderRadius: 10, textAlign: 'center' }}>
        <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: C.sage, margin: 0, fontWeight: 600 }}>
          ✓ Pedido guardado en tu cuenta
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24, borderTop: '1px solid #eee', paddingTop: 20 }}>
      <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: C.brown, fontWeight: 600, margin: '0 0 4px' }}>
        Guarda tu pedido para rastrearlo
      </p>
      <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: C.tan, margin: '0 0 14px', lineHeight: 1.6 }}>
        Opcional — crea una cuenta o ingresa con tu email para ver el estado de pedido #{orderId}.
      </p>

      <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
        <input
          style={inputStyle}
          type="email"
          placeholder="tu@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          style={inputStyle}
          type="password"
          placeholder="Contraseña (mínimo 6 caracteres)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="new-password"
        />
      </div>

      {error && (
        <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: C.terra, margin: '0 0 10px' }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={handleGuardar}
          disabled={!email || !password || guardando}
          style={{
            flex: 1, background: C.terra, color: 'white', border: 'none', borderRadius: 8,
            padding: '11px 16px', fontFamily: 'Montserrat, sans-serif', fontSize: 12,
            fontWeight: 700, cursor: (!email || !password || guardando) ? 'not-allowed' : 'pointer',
            opacity: (!email || !password || guardando) ? 0.55 : 1,
          }}
        >
          {guardando ? 'Guardando...' : 'Guardar pedido →'}
        </button>
        <button
          onClick={onDone}
          style={{
            background: 'transparent', color: C.tan, border: '1px solid #ddd', borderRadius: 8,
            padding: '11px 16px', fontFamily: 'Montserrat, sans-serif', fontSize: 12,
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          No, gracias
        </button>
      </div>
    </div>
  );
}
