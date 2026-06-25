/**
 * AuthScreen.tsx — Pantalla de login y registro compartida por todos los portales
 * Props:
 *   rol        → determina qué campos extras pide el registro
 *   onSuccess  → callback con el perfil tras login o registro exitoso
 */
import { useState, useId } from 'react';
import {
  loginWithEmail,
  registerWithEmail,
  loginWithPhone,
  verifyPhoneOtp,
  type ConfirmationResult,
} from '@/shared/authService';
import { crearPerfil, fetchPerfil } from '@/shared/perfilService';
import type { RolUsuario, PerfilDoc } from '@/shared/types/auth';

const C = {
  green: '#1f3028', cream: '#f2e0cc', terra: '#c96e4b',
  sage: '#8faf8a', tan: '#c4b297', brown: '#533b22',
};

const ROL_LABEL: Record<RolUsuario, string> = {
  caficultor:  'Portal Caficultor',
  cafeteria:   'Portal Cafetería',
  laboratorio: 'Portal Laboratorio',
  admin:       'Administrador',
  cliente:     'Mi pedido',
};

interface Props {
  rol: RolUsuario;
  onSuccess: (perfil: PerfilDoc) => void;
  orderId?: string;
}

type Modo = 'login' | 'registro';
type MetodoLogin = 'email' | 'celular';
type MetodoRegistro = 'email' | 'celular';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', border: '1px solid #ddd', borderRadius: 8,
  fontFamily: 'Montserrat, sans-serif', fontSize: 14, color: C.brown,
  background: 'white', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: C.tan,
  display: 'block', marginBottom: 5,
};

export default function AuthScreen({ rol, onSuccess, orderId }: Props) {
  const recaptchaId = useId().replace(/:/g, '');
  const btnPhoneId = `btn-phone-${recaptchaId}`;

  const [modo, setModo] = useState<Modo>('login');
  const [metodoLogin, setMetodoLogin] = useState<MetodoLogin>('email');
  const [metodoRegistro, setMetodoRegistro] = useState<MetodoRegistro>('email');

  // Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // OTP celular (login y registro)
  const [telefono, setTelefono] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otpEnviado, setOtpEnviado] = useState(false);

  // Campos comunes de registro
  const [nombre, setNombre] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regTelefono, setRegTelefono] = useState('');

  // Campos por rol
  const [finca, setFinca] = useState('');
  const [region, setRegion] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [ruc, setRuc] = useState('');
  const [direccion, setDireccion] = useState('');
  const [tieneLaboratorio] = useState(false);
  const [nombreComercial, setNombreComercial] = useState('');
  const [certificaciones, setCertificaciones] = useState('');
  const [feeCatacion, setFeeCatacion] = useState('');
  const [feeTueste, setFeeTueste] = useState('');
  const [labRegion, setLabRegion] = useState('');
  const [labDireccion, setLabDireccion] = useState('');

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  function limpiarError() { setError(''); }

  // ── LOGIN ──────────────────────────────────────────────────────────────────

  async function handleLoginEmail() {
    setError(''); setCargando(true);
    try {
      const user = await loginWithEmail(loginEmail, loginPassword);
      const perfil = await fetchPerfil(user.uid);
      if (!perfil) {
        if (rol === 'admin') {
          // El admin puede no tener doc en mkt_usuarios — lo maneja AppAdmin
          onSuccess({ uid: user.uid, rol: 'admin', nombre: user.email ?? 'Admin', createdAt: '' });
          return;
        }
        setError('Cuenta sin perfil. Regístrate primero.');
        return;
      }
      onSuccess(perfil);
    } catch (e: unknown) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  }

  async function handleSolicitarOtp() {
    setError(''); setCargando(true);
    const phone = normalizarTelefono(telefono);
    if (!phone) { setError('Ingresa un número válido (ej: 987654321)'); setCargando(false); return; }
    try {
      const conf = await loginWithPhone(phone, btnPhoneId);
      setConfirmationResult(conf);
      setOtpEnviado(true);
    } catch (e: unknown) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  }

  async function handleVerificarOtp() {
    if (!confirmationResult) return;
    setError(''); setCargando(true);
    try {
      const user = await verifyPhoneOtp(confirmationResult, otp);
      const perfil = await fetchPerfil(user.uid);
      if (!perfil) {
        if (rol === 'admin') {
          onSuccess({ uid: user.uid, rol: 'admin', nombre: user.phoneNumber ?? 'Admin', createdAt: '' });
          return;
        }
        setError('Cuenta sin perfil. Regístrate primero.');
        return;
      }
      onSuccess(perfil);
    } catch (e: unknown) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  }

  // ── REGISTRO ──────────────────────────────────────────────────────────────

  async function handleRegistro() {
    setError(''); setCargando(true);
    try {
      let uid: string;

      if (metodoRegistro === 'email') {
        if (!regEmail || !regPassword) { setError('Ingresa email y contraseña.'); return; }
        const user = await registerWithEmail(regEmail, regPassword);
        uid = user.uid;
      } else {
        // Registro con celular: el OTP ya fue verificado, confirmationResult tiene el user
        if (!confirmationResult) { setError('Primero verifica tu número.'); return; }
        const user = await verifyPhoneOtp(confirmationResult, otp);
        uid = user.uid;
      }

      // Construir perfil según rol
      const base = {
        nombre,
        ...(metodoRegistro === 'email' ? { email: regEmail } : { telefono: normalizarTelefono(regTelefono) ?? regTelefono }),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let perfilRaw: any;

      if (rol === 'caficultor') {
        perfilRaw = { ...base, rol: 'caficultor', finca, region };
      } else if (rol === 'cafeteria') {
        perfilRaw = { ...base, rol: 'cafeteria', empresa, ruc, tieneLaboratorio, direccionEntrega: direccion };
      } else if (rol === 'laboratorio') {
        perfilRaw = {
          ...base, rol: 'laboratorio',
          nombreComercial,
          certificaciones: certificaciones.split(',').map(c => c.trim()).filter(Boolean),
          feeCatacionPEN: Number(feeCatacion) || 0,
          feeTuestePEN: Number(feeTueste) || 0,
          region: labRegion || undefined,
          direccion: labDireccion || undefined,
        };
      } else {
        perfilRaw = { ...base, rol: 'admin' };
      }

      if (rol === 'cliente') {
        perfilRaw = { ...base, rol: 'cliente', ...(orderId ? { orderId } : {}) };
      }

      const perfilData = perfilRaw as Parameters<typeof crearPerfil>[1];

      const perfil = await crearPerfil(uid, perfilData);
      onSuccess(perfil);
    } catch (e: unknown) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  }

  // ── OTP para registro por celular ─────────────────────────────────────────

  async function handleSolicitarOtpRegistro() {
    setError(''); setCargando(true);
    const phone = normalizarTelefono(regTelefono);
    if (!phone) { setError('Ingresa un número válido (ej: 987654321)'); setCargando(false); return; }
    try {
      const conf = await loginWithPhone(phone, btnPhoneId);
      setConfirmationResult(conf);
      setOtpEnviado(true);
    } catch (e: unknown) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  }

  // ── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100vh', background: C.green,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{
        background: 'white', borderRadius: 16, padding: '36px 32px',
        width: '100%', maxWidth: 440, boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      }}>

        {/* Logo + rol */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <p style={{ fontFamily: 'Mulish, sans-serif', fontWeight: 900, fontSize: 20, letterSpacing: 2, color: C.green, margin: '0 0 4px' }}>
            TUNAY WASI
          </p>
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: C.tan, letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>
            {ROL_LABEL[rol]}
          </p>
        </div>

        {/* Tabs modo */}
        {rol !== 'admin' && (
          <div style={{ display: 'flex', borderBottom: '1px solid #eee', marginBottom: 28 }}>
            {(['login', 'registro'] as Modo[]).map(m => (
              <button key={m} onClick={() => { setModo(m); limpiarError(); setOtpEnviado(false); }} style={{
                flex: 1, background: 'none', border: 'none',
                borderBottom: `3px solid ${modo === m ? C.terra : 'transparent'}`,
                padding: '10px 0', fontFamily: 'Montserrat, sans-serif', fontSize: 13,
                fontWeight: modo === m ? 700 : 400,
                color: modo === m ? C.terra : C.tan, cursor: 'pointer',
              }}>
                {m === 'login' ? 'Ingresar' : 'Registrarse'}
              </button>
            ))}
          </div>
        )}

        {/* ─── LOGIN ─────────────────────────────────────────────────────── */}
        {modo === 'login' && (
          <div style={{ display: 'grid', gap: 16 }}>

            {/* Método login — celular oculto para MVP */}
            {false && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              {(['email', 'celular'] as MetodoLogin[]).map(m => (
                <button key={m} onClick={() => { setMetodoLogin(m); limpiarError(); setOtpEnviado(false); }} style={{
                  flex: 1, padding: '7px 0', borderRadius: 8, border: `1.5px solid ${metodoLogin === m ? C.terra : '#ddd'}`,
                  background: metodoLogin === m ? `${C.terra}12` : 'white',
                  fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 600,
                  color: metodoLogin === m ? C.terra : C.tan, cursor: 'pointer',
                }}>
                  {m === 'email' ? 'Correo' : 'Celular'}
                </button>
              ))}
            </div>
            )}

            {metodoLogin === 'email' && (
              <>
                <div>
                  <label style={labelStyle}>Correo electrónico</label>
                  <input style={inputStyle} type="email" value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="tucorreo@gmail.com" />
                </div>
                <div>
                  <label style={labelStyle}>Contraseña</label>
                  <input style={inputStyle} type="password" value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••" />
                </div>
                <BtnPrimario onClick={handleLoginEmail} cargando={cargando} disabled={!loginEmail || !loginPassword}>
                  Ingresar →
                </BtnPrimario>
              </>
            )}

            {metodoLogin === 'celular' && !otpEnviado && (
              <>
                <div>
                  <label style={labelStyle}>Número de celular</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ ...inputStyle, width: 'auto', padding: '11px 12px', color: C.tan, background: '#f7f3ee' }}>+51</span>
                    <input style={{ ...inputStyle }} type="tel" value={telefono}
                      onChange={e => setTelefono(e.target.value)}
                      placeholder="987 654 321" />
                  </div>
                </div>
                <BtnPrimario id={btnPhoneId} onClick={handleSolicitarOtp} cargando={cargando} disabled={!telefono}>
                  Enviar código SMS →
                </BtnPrimario>
              </>
            )}

            {metodoLogin === 'celular' && otpEnviado && (
              <>
                <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: C.tan, margin: 0 }}>
                  Código enviado a +51 {telefono}
                </p>
                <div>
                  <label style={labelStyle}>Código de verificación</label>
                  <input style={{ ...inputStyle, fontSize: 22, letterSpacing: 8, textAlign: 'center' }}
                    type="text" inputMode="numeric" maxLength={6} value={otp}
                    onChange={e => setOtp(e.target.value)} placeholder="000000" />
                </div>
                <BtnPrimario onClick={handleVerificarOtp} cargando={cargando} disabled={otp.length < 6}>
                  Verificar código →
                </BtnPrimario>
              </>
            )}
          </div>
        )}

        {/* ─── REGISTRO ──────────────────────────────────────────────────── */}
        {modo === 'registro' && (
          <div style={{ display: 'grid', gap: 14 }}>

            {/* Método registro — celular oculto para MVP */}
            {false && (
            <div style={{ display: 'flex', gap: 8 }}>
              {(['email', 'celular'] as MetodoRegistro[]).map(m => (
                <button key={m} onClick={() => { setMetodoRegistro(m); limpiarError(); setOtpEnviado(false); }} style={{
                  flex: 1, padding: '7px 0', borderRadius: 8, border: `1.5px solid ${metodoRegistro === m ? C.terra : '#ddd'}`,
                  background: metodoRegistro === m ? `${C.terra}12` : 'white',
                  fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 600,
                  color: metodoRegistro === m ? C.terra : C.tan, cursor: 'pointer',
                }}>
                  {m === 'email' ? 'Correo' : 'Celular'}
                </button>
              ))}
            </div>
            )}

            {/* Nombre */}
            <div>
              <label style={labelStyle}>Nombre completo *</label>
              <input style={inputStyle} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre" />
            </div>

            {/* Credenciales */}
            {metodoRegistro === 'email' && (
              <>
                <div>
                  <label style={labelStyle}>Correo electrónico *</label>
                  <input style={inputStyle} type="email" value={regEmail}
                    onChange={e => setRegEmail(e.target.value)} placeholder="tucorreo@gmail.com" />
                </div>
                <div>
                  <label style={labelStyle}>Contraseña *</label>
                  <input style={inputStyle} type="password" value={regPassword}
                    onChange={e => setRegPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                </div>
              </>
            )}

            {metodoRegistro === 'celular' && !otpEnviado && (
              <>
                <div>
                  <label style={labelStyle}>Número de celular *</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ ...inputStyle, width: 'auto', padding: '11px 12px', color: C.tan, background: '#f7f3ee' }}>+51</span>
                    <input style={inputStyle} type="tel" value={regTelefono}
                      onChange={e => setRegTelefono(e.target.value)} placeholder="987 654 321" />
                  </div>
                </div>
                <BtnSecundario id={btnPhoneId} onClick={handleSolicitarOtpRegistro} cargando={cargando} disabled={!regTelefono}>
                  Enviar código SMS
                </BtnSecundario>
              </>
            )}

            {metodoRegistro === 'celular' && otpEnviado && (
              <div>
                <label style={labelStyle}>Código de verificación</label>
                <input style={{ ...inputStyle, fontSize: 22, letterSpacing: 8, textAlign: 'center' }}
                  type="text" inputMode="numeric" maxLength={6} value={otp}
                  onChange={e => setOtp(e.target.value)} placeholder="000000" />
                <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: C.sage, marginTop: 4 }}>
                  ✓ Código enviado — ingresa los 6 dígitos para continuar
                </p>
              </div>
            )}

            {/* Campos por rol */}
            {rol === 'caficultor' && (
              <>
                <div>
                  <label style={labelStyle}>Nombre de tu finca *</label>
                  <input style={inputStyle} value={finca} onChange={e => setFinca(e.target.value)} placeholder="Finca San José" />
                </div>
                <div>
                  <label style={labelStyle}>Región / ubicación *</label>
                  <input style={inputStyle} value={region} onChange={e => setRegion(e.target.value)} placeholder="Oxapampa, Pasco" />
                </div>
              </>
            )}

            {rol === 'cafeteria' && (
              <>
                <div>
                  <label style={labelStyle}>Nombre de la empresa *</label>
                  <input style={inputStyle} value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Café del Parque S.A.C." />
                </div>
                <div>
                  <label style={labelStyle}>RUC</label>
                  <input style={inputStyle} value={ruc} onChange={e => setRuc(e.target.value)} placeholder="20xxxxxxxxx" />
                </div>
                <div>
                  <label style={labelStyle}>Dirección de entrega</label>
                  <input style={inputStyle} value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Av. La Mar 456, Miraflores, Lima" />
                </div>
              </>
            )}

            {rol === 'laboratorio' && (
              <>
                <div>
                  <label style={labelStyle}>Nombre comercial del laboratorio *</label>
                  <input style={inputStyle} value={nombreComercial} onChange={e => setNombreComercial(e.target.value)} placeholder="CQI Lab Perú" />
                </div>
                <div>
                  <label style={labelStyle}>Certificaciones (separadas por coma)</label>
                  <input style={inputStyle} value={certificaciones} onChange={e => setCertificaciones(e.target.value)} placeholder="Q-Grader CQI, SCA Authorized" />
                </div>
                <div>
                  <label style={labelStyle}>Región / ciudad</label>
                  <input style={inputStyle} value={labRegion} onChange={e => setLabRegion(e.target.value)} placeholder="Lima, Miraflores" />
                </div>
                <div>
                  <label style={labelStyle}>Dirección para recepción de muestras</label>
                  <input style={inputStyle} value={labDireccion} onChange={e => setLabDireccion(e.target.value)} placeholder="Av. Conquistadores 500, San Isidro" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Fee catación (S/)</label>
                    <input style={inputStyle} type="number" value={feeCatacion} onChange={e => setFeeCatacion(e.target.value)} placeholder="80" />
                  </div>
                  <div>
                    <label style={labelStyle}>Fee tueste (S/)</label>
                    <input style={inputStyle} type="number" value={feeTueste} onChange={e => setFeeTueste(e.target.value)} placeholder="120" />
                  </div>
                </div>
              </>
            )}

            <BtnPrimario
              onClick={handleRegistro}
              cargando={cargando}
              disabled={
                !nombre ||
                (metodoRegistro === 'email' && (!regEmail || !regPassword)) ||
                (metodoRegistro === 'celular' && (!otpEnviado || otp.length < 6)) ||
                (rol === 'caficultor' && (!finca || !region)) ||
                (rol === 'cafeteria' && !empresa) ||
                (rol === 'laboratorio' && !nombreComercial)
              }
            >
              Crear cuenta →
            </BtnPrimario>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ marginTop: 16, background: '#fff3f3', border: '1px solid #ffaaaa', borderRadius: 8, padding: '10px 14px' }}>
            <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: '#cc0000', margin: 0 }}>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers UI ────────────────────────────────────────────────────────────────

function BtnPrimario({ children, onClick, cargando, disabled, id }: {
  children: React.ReactNode;
  onClick: () => void;
  cargando: boolean;
  disabled: boolean;
  id?: string;
}) {
  return (
    <button id={id} onClick={onClick} disabled={disabled || cargando} style={{
      background: C.terra, color: 'white', border: 'none', borderRadius: 8,
      padding: '13px', fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 700,
      cursor: disabled || cargando ? 'not-allowed' : 'pointer',
      opacity: disabled || cargando ? 0.55 : 1, width: '100%',
    }}>
      {cargando ? 'Cargando...' : children}
    </button>
  );
}

function BtnSecundario({ children, onClick, cargando, disabled, id }: {
  children: React.ReactNode;
  onClick: () => void;
  cargando: boolean;
  disabled: boolean;
  id?: string;
}) {
  return (
    <button id={id} onClick={onClick} disabled={disabled || cargando} style={{
      background: 'white', color: C.terra, border: `1.5px solid ${C.terra}`, borderRadius: 8,
      padding: '11px', fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 600,
      cursor: disabled || cargando ? 'not-allowed' : 'pointer',
      opacity: disabled || cargando ? 0.55 : 1, width: '100%',
    }}>
      {cargando ? 'Enviando...' : children}
    </button>
  );
}

// ── Utilidades ────────────────────────────────────────────────────────────────

function normalizarTelefono(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 9 && digits.startsWith('9')) return `+51${digits}`;
  if (digits.length === 11 && digits.startsWith('519')) return `+${digits}`;
  if (digits.length === 12 && digits.startsWith('519')) return `+${digits}`;
  return null;
}

function mensajeError(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'code' in e) {
    const code = (e as { code: string }).code;
    const map: Record<string, string> = {
      'auth/user-not-found':        'No existe una cuenta con ese correo.',
      'auth/wrong-password':        'Contraseña incorrecta.',
      'auth/invalid-credential':    'Correo o contraseña incorrectos.',
      'auth/email-already-in-use':  'Ese correo ya tiene una cuenta.',
      'auth/weak-password':         'La contraseña debe tener al menos 6 caracteres.',
      'auth/invalid-phone-number':  'Número de teléfono inválido.',
      'auth/code-expired':          'El código expiró. Solicita uno nuevo.',
      'auth/invalid-verification-code': 'Código incorrecto.',
      'auth/too-many-requests':     'Demasiados intentos. Espera unos minutos.',
    };
    return map[code] ?? `Error: ${code}`;
  }
  return 'Ocurrió un error. Intenta de nuevo.';
}
