import { useState } from 'react';
import { TW } from './constants';
import { Colibri, IconArrowR, IconUser, IconMail, IconPhone, IconGift, IconLock, IconEye, IconEyeOff, IconCheck, IconChevL } from './icons';
import { loginPortalUser, registerPortalUser, resetPortalPassword, type PortalAuthUser } from './portalAuthService';

export default function PortalAuth({ onAuth }: { onAuth: (u: PortalAuthUser) => void }) {
  const [mode, setMode] = useState<'login' | 'registro'>('login');
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [f, setF] = useState({ nombre: '', correo: '', pass: '', tel: '', ref: '' });

  const isReg = mode === 'registro';
  const correoOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.correo.trim());
  const passOk = f.pass.length >= 6;
  const nombreOk = !isReg || f.nombre.trim().length >= 2;
  const telOk = !isReg || /^\d{6,}$/.test(f.tel.replace(/\s/g, ''));
  const refOk = !isReg || f.ref.trim() === '' || /^[A-Za-z0-9]{4,}$/.test(f.ref.trim());
  const canSubmit = correoOk && passOk && nombreOk && telOk && refOk;

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF(s => ({ ...s, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setMessage('');
    setError('');
    if (!canSubmit) return;

    setLoading(true);
    try {
      if (isReg) {
        await registerPortalUser({
          nombre: f.nombre,
          correo: f.correo,
          pass: f.pass,
          tel: f.tel,
          ref: f.ref,
        });
        const email = f.correo;
        setF({ nombre: '', correo: email, pass: '', tel: '', ref: '' });
        setMessage('Te enviamos un link de verificación a tu correo. Si no lo ves, revisa tu bandeja de spam.');
        setMode('login');
        return;
      } else {
        const user = await loginPortalUser(f.correo, f.pass);
        onAuth(user);
      }
    } catch (err) {
      console.error('[PortalAuth] submit error:', err);
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const swap = (m: 'login' | 'registro') => {
    setMode(m);
    setTouched(false);
    setMessage('');
    setError('');
    if (m === 'registro') setF({ nombre: '', correo: '', pass: '', tel: '', ref: '' });
  };

  const resetPassword = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setTouched(true);
    setMessage('');
    setError('');
    if (!correoOk) {
      setError('Ingresa tu correo para enviarte el enlace de recuperación.');
      return;
    }
    setLoading(true);
    try {
      await resetPortalPassword(f.correo);
      setMessage('Te enviamos un correo para restablecer tu contraseña.');
    } catch (err) {
      console.error('[PortalAuth] reset password error:', err);
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', background: TW.bg }} className="tw-auth-grid">
      <div className="tw-auth-aside" style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(160deg, #25382e 0%, #1f3028 60%)', color: '#f2e0cc',
        padding: '56px 60px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}>
        <div style={{ position: 'absolute', top: '-15%', right: '-12%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, #c96e4b55 0%, #c96e4b00 65%)', filter: 'blur(34px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-22%', left: '-12%', width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle, #8faf8a40 0%, #8faf8a00 65%)', filter: 'blur(36px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.16, backgroundImage: 'radial-gradient(#c4b29766 1px, transparent 1px)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 46, height: 46, borderRadius: '50%', background: '#f2e0cc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Colibri size={34} />
          </span>
          <div style={{ lineHeight: 1 }}>
            <div style={{ fontFamily: 'Mulish, sans-serif', fontWeight: 800, fontSize: 19, letterSpacing: '0.01em' }}>Tunay Wasi</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8.5, letterSpacing: '0.3em', color: '#c4b297', marginTop: 5, textTransform: 'uppercase' }}>Verdadera · Casa</div>
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: '"Bowlby One SC", sans-serif', fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#c96e4b', marginBottom: 22 }}>
            Mi cuenta · B2C
          </div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, fontSize: 'clamp(40px, 4vw, 62px)', lineHeight: 0.98, letterSpacing: '-0.01em', margin: 0 }}>
            Tu café fresco,
            <br />
            <span style={{ fontStyle: 'italic', fontWeight: 500, color: '#c96e4b' }}>directo del</span>
            <br />
            <span style={{ fontStyle: 'italic', fontWeight: 500, color: '#8faf8a' }}>productor.</span>
          </h1>
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 15.5, lineHeight: 1.65, color: '#c4b297', marginTop: 24, maxWidth: 380 }}>
            Entra a tu portal para seguir tus pedidos, gestionar tu suscripción y reservar microlotes de la próxima cosecha.
          </p>
        </div>

        <div style={{ position: 'relative', display: 'flex', gap: 40, flexWrap: 'wrap' }}>
          {[['50%', 'directo al productor'], ['12', 'fincas asociadas'], ['+1,400 m', 'altitud media']].map(([n, l]) => (
            <div key={l}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 34, fontWeight: 600, lineHeight: 1 }}>{n}</div>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 10, fontWeight: 500, color: '#8faf8a', letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 7 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 40px' }}>
        <form onSubmit={submit} style={{ width: '100%', maxWidth: 408 }}>
          <div className="tw-auth-mobrand" style={{ display: 'none', alignItems: 'center', gap: 11, marginBottom: 28 }}>
            <Colibri size={34} />
            <div style={{ fontFamily: 'Mulish, sans-serif', fontWeight: 800, fontSize: 18, color: TW.ink }}>Tunay Wasi</div>
          </div>

          <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 999, background: '#ece0cc', border: `1px solid ${TW.line}`, marginBottom: 30 }}>
            {([['login', 'Iniciar sesión'], ['registro', 'Crear cuenta']] as const).map(([m, l]) => {
              const on = mode === m;
              return (
                <button key={m} type="button" onClick={() => swap(m)} style={{
                  flex: 1, fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: on ? 700 : 600,
                  padding: '10px 12px', borderRadius: 999, cursor: 'pointer', border: 'none',
                  background: on ? TW.green : 'transparent', color: on ? '#f2e0cc' : TW.sub,
                  transition: 'all .2s', boxShadow: on ? '0 6px 16px -8px #1f302899' : 'none',
                }}>{l}</button>
              );
            })}
          </div>

          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 34, fontWeight: 600, color: TW.ink, margin: 0, lineHeight: 1.05 }}>
            {isReg ? <>Crea tu <span style={{ fontStyle: 'italic', color: TW.green }}>cuenta.</span></> : <>Bienvenida de <span style={{ fontStyle: 'italic', color: TW.green }}>vuelta.</span></>}
          </h2>
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13.5, color: TW.sub, margin: '8px 0 26px' }}>
            {isReg ? 'Crea tu cuenta. Te enviaremos un link de verificación.' : 'Ingresa para entrar a tu portal de socia.'}
          </p>

          {(message || error) && (
            <div style={{
              marginBottom: 16, padding: '12px 14px', borderRadius: 11,
              background: error ? '#f6e0d4' : '#e7ecdd',
              border: `1px solid ${error ? '#e6c2b2' : '#bcd0b5'}`,
              color: error ? '#9a3b1e' : '#2f5a3a',
              fontFamily: 'Montserrat, sans-serif', fontSize: 12.5, lineHeight: 1.5,
            }}>
              {error || message}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {isReg && (
              <Field label="Nombre completo" icon={<IconUser size={17} />} err={touched && !nombreOk ? 'Ingresa tu nombre' : ''}>
                <input value={f.nombre} onChange={set('nombre')} placeholder="Valeria Campos" style={authInp} />
              </Field>
            )}
            <Field label="Correo electrónico" icon={<IconMail size={17} />} err={touched && !correoOk ? 'Correo inválido' : ''}>
              <input type="email" value={f.correo} onChange={set('correo')} placeholder="hola@correo.com" style={authInp} />
            </Field>
            {isReg && (
              <Field label="Teléfono" icon={<IconPhone size={17} />} err={touched && !telOk ? 'Número inválido' : ''}>
                <input value={f.tel} onChange={set('tel')} placeholder="987 654 321" style={authInp} />
              </Field>
            )}
            {isReg && (
              <Field label="Código de referido · opcional" icon={<IconGift size={17} />} err={touched && !refOk ? 'Código inválido' : ''}>
                <input value={f.ref} onChange={(e) => setF(s => ({ ...s, ref: e.target.value.toUpperCase() }))} placeholder="Ej. VALECAFE10" style={authInp} />
                {refOk && f.ref.trim().length >= 4 && (
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11.5, color: '#2f5a3a', marginTop: 7, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IconCheck size={13} /> ¡Tú y quien te invitó ganan 100 puntos!
                  </div>
                )}
              </Field>
            )}
            <Field label="Contraseña" icon={<IconLock size={17} />} err={touched && !passOk ? 'Mínimo 6 caracteres' : ''}
              trailing={
                <button type="button" onClick={() => setShow(s => !s)} style={{ border: 'none', background: 'transparent', color: TW.sub, cursor: 'pointer', display: 'flex', padding: 4 }} aria-label="Mostrar/ocultar">
                  {show ? <IconEyeOff size={17} /> : <IconEye size={17} />}
                </button>
              }>
              <input type={show ? 'text' : 'password'} value={f.pass} onChange={set('pass')} placeholder="••••••••" style={authInp} />
            </Field>
          </div>

          {!isReg && (
            <div style={{ textAlign: 'right', marginTop: 10 }}>
              <a href="#" onClick={resetPassword} style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12.5, color: TW.gold, textDecoration: 'none', fontWeight: 600 }}>¿Olvidaste tu contraseña?</a>
            </div>
          )}

          <button type="submit" disabled={loading} className="tw-auth-cta" style={{
            marginTop: 22, width: '100%',
            fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 700, letterSpacing: '0.04em',
            color: '#f2e0cc', background: TW.green, border: 'none', borderRadius: 12, padding: '16px',
            cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: '0 16px 34px -16px #1f3028aa', transition: 'all .25s',
            opacity: loading ? 0.78 : 1,
          }}>
            {loading ? 'Procesando...' : (isReg ? 'Crear mi cuenta' : 'Iniciar sesión')} {!loading && <IconArrowR size={17} />}
          </button>

          <div style={{ marginTop: 18, textAlign: 'center', fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: TW.sub }}>
            {isReg ? <>¿Ya tienes cuenta? <button type="button" onClick={() => swap('login')} style={linkBtn}>Inicia sesión</button></>
                   : <>¿Nueva por aquí? <button type="button" onClick={() => swap('registro')} style={linkBtn}>Crea tu cuenta</button></>}
          </div>

          <div style={{ marginTop: 22, padding: '11px 14px', borderRadius: 11, background: '#f4ead9', border: `1px dashed ${TW.line}`, fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: TW.sub, letterSpacing: '0.02em', lineHeight: 1.6, textAlign: 'center' }}>
            FIREBASE AUTH · verifica tu correo antes de iniciar sesión
          </div>

          <a href="/" style={{ marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'Montserrat, sans-serif', fontSize: 12.5, color: TW.sub, textDecoration: 'none' }}>
            <IconChevL size={15} /> Volver al inicio
          </a>
        </form>
      </div>

      <style>{`
        .tw-auth-cta:hover { background: #c96e4b !important; transform: translateY(-1px); box-shadow: 0 20px 40px -16px #c96e4baa; }
        @media (max-width: 880px) {
          .tw-auth-grid { grid-template-columns: 1fr !important; }
          .tw-auth-aside { display: none !important; }
          .tw-auth-mobrand { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

function Field({ label, icon, err, trailing, children }: {
  label: string; icon: React.ReactNode; err?: string; trailing?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div>
      <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: err ? '#c2410c' : TW.sub, display: 'block', marginBottom: 8 }}>{label}</label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span style={{ position: 'absolute', left: 14, color: err ? '#c2410c' : TW.sub, display: 'flex', pointerEvents: 'none' }}>{icon}</span>
        {children}
        {trailing && <span style={{ position: 'absolute', right: 8 }}>{trailing}</span>}
      </div>
      {err && <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11.5, color: '#c2410c', marginTop: 6 }}>{err}</div>}
    </div>
  );
}

const authInp: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', fontFamily: 'Montserrat, sans-serif', fontSize: 14.5, color: TW.ink,
  background: '#fffdf8', border: `1px solid ${TW.line}`, borderRadius: 12,
  padding: '14px 16px 14px 42px', outline: 'none',
};

const linkBtn: React.CSSProperties = {
  border: 'none', background: 'transparent', fontFamily: 'Montserrat, sans-serif',
  fontSize: 13, fontWeight: 700, color: TW.gold, cursor: 'pointer', padding: 0,
};

function getAuthErrorMessage(err: unknown) {
  const code = typeof err === 'object' && err && 'code' in err ? String((err as { code?: string }).code) : '';
  if (code === 'auth/email-already-in-use') return 'Este correo ya tiene una cuenta. Inicia sesión o recupera tu contraseña.';
  if (code === 'auth/invalid-email') return 'El correo no es válido.';
  if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') return 'Correo o contraseña incorrectos.';
  if (code === 'auth/weak-password') return 'La contraseña debe tener al menos 6 caracteres.';
  if (code === 'auth/too-many-requests') return 'Demasiados intentos. Intenta nuevamente en unos minutos.';
  if (code === 'auth/network-request-failed') return 'No se pudo conectar con Firebase. Revisa tu conexión.';
  return 'Ocurrió un error. Intenta nuevamente.';
}
