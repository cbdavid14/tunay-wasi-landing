/**
 * RegistroCaficultor.tsx — Registro público para caficultores
 * Flujo 3 pasos: Paso 1 (cuenta) → Paso 2 (finca) → Paso 3 (identidad + Yape) → Portal
 * Ruta: #/registro-caficultor
 */
import React, { useState, useRef } from 'react'
import { navigate } from '@/router'
import { registrarCaficultor } from '../authService'
import { auth } from '@/shared/firebase'
import { db } from '@/shared/firebase'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'

async function uploadKycPhoto(file: File): Promise<string> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
  const fd = new FormData()
  fd.append('file', file)
  fd.append('upload_preset', uploadPreset)
  fd.append('folder', 'one_kyc')
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error('Error subiendo foto')
  const data = await res.json()
  if (!data.secure_url) throw new Error(data.error?.message ?? 'Cloudinary upload failed')
  return data.secure_url as string
}

const REGIONES = ['Cajamarca', 'Amazonas', 'San Martín', 'Cusco', 'Puno', 'Junín', 'Pasco', 'Huánuco', 'Ayacucho']
const VARIEDADES = ['Bourbon', 'Caturra', 'Typica', 'Geisha', 'Catimor', 'Pache', 'Wush Wush', 'Otra']
const PROCESOS = ['Natural (seco)', 'Washed (lavado)', 'Honey', 'Anaerobic']

// TRIB-04: Modalidades tributarias del caficultor
type TipoRegistroCaficultor = 'SOLO_DNI' | 'RUC_PROPIO' | 'COOPERATIVA'
const TIPOS_REGISTRO: { value: TipoRegistroCaficultor; label: string; desc: string }[] = [
  { value: 'SOLO_DNI',   label: 'Solo DNI',   desc: 'Solo puedes vender café TYPE_A. Cobra con Yape/Plin.' },
  { value: 'RUC_PROPIO', label: 'RUC propio', desc: 'Emites facturas. Puedes vender todos los tipos.' },
  { value: 'COOPERATIVA',label: 'Cooperativa', desc: 'Tu cooperativa emite los comprobantes por ti.' },
]

type Paso = 1 | 2 | 3 | 'confirmacion'

// ─── Atoms ────────────────────────────────────────────────────────────────────

const inputBase: React.CSSProperties = {
  width: '100%', padding: '11px 13px', borderRadius: 8,
  border: '1px solid var(--tw-border)',
  background: 'var(--tw-bg)',
  color: 'var(--tw-text)',
  fontSize: 13, fontFamily: 'Montserrat, sans-serif',
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.2s',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 700,
  color: 'var(--tw-text-muted)', marginBottom: 5,
  textTransform: 'uppercase', letterSpacing: '0.05em',
}

const Field: React.FC<{ label: string; required?: boolean; hint?: string; children: React.ReactNode }> = ({ label, required, hint, children }) => (
  <div>
    <label style={labelStyle}>
      {label}{required && <span style={{ color: 'var(--tw-terra)' }}> *</span>}
    </label>
    {children}
    {hint && <p style={{ margin: '4px 0 0', fontSize: 9, color: 'var(--tw-text-faint)' }}>{hint}</p>}
  </div>
)

// ─── Progress bar ─────────────────────────────────────────────────────────────

const ProgressBar: React.FC<{ paso: Paso }> = ({ paso }) => {
  const actual = paso === 'confirmacion' ? 4 : (paso as number)
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
      {[1, 2, 3].map(p => (
        <div key={p} style={{
          flex: 1, height: 3, borderRadius: 2,
          background: p <= actual ? 'var(--tw-terra)' : 'var(--tw-border)',
          transition: 'background 0.3s',
        }} />
      ))}
    </div>
  )
}

// ─── Panel derecho — propuesta de valor ───────────────────────────────────────

const PanelPropuesta: React.FC<{ nombre: string; region: string; kgDisponibles: number }> = ({ nombre, region, kgDisponibles }) => {
  const tieneInfo = !!(nombre || region)

  return (
    <div style={{
      position: 'sticky', top: 76,
      background: 'var(--tw-card)', borderRadius: 16,
      border: '1px solid var(--tw-border)',
      overflow: 'hidden',
      fontFamily: 'Montserrat, sans-serif',
    }}>
      <div style={{
        background: 'var(--tw-sage-muted)',
        padding: '24px',
        borderBottom: '1px solid var(--tw-border)',
      }}>
        <p style={{ margin: '0 0 6px', fontSize: 10, color: 'var(--tw-sage)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          Para caficultores
        </p>
        <h2 style={{ margin: '0 0 8px', fontSize: 21, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, lineHeight: 1.2 }}>
          Tu café,<br />tu precio.
        </h2>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--tw-text-muted)', lineHeight: 1.6 }}>
          Conectamos tu lote directamente con cafeterías peruanas que buscan café de especialidad con origen trazado.
        </p>
      </div>

      {/* Preview del perfil */}
      <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--tw-border)' }}>
        <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, color: 'var(--tw-text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Así aparecerás
        </p>
        <div style={{
          background: 'var(--tw-bg)', borderRadius: 10,
          border: '1px solid var(--tw-border)', padding: '13px',
          display: 'flex', alignItems: 'center', gap: 11,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%',
            background: 'rgba(143,175,138,.15)',
            border: '1.5px solid rgba(143,175,138,.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 19, flexShrink: 0,
          }}>
            🧑‍🌾
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: tieneInfo ? 'var(--tw-text)' : 'var(--tw-text-faint)', fontFamily: 'Cormorant Garamond, serif' }}>
              {nombre || 'Tu nombre aquí'}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--tw-text-faint)' }}>
              {region || 'Región'}{kgDisponibles > 0 ? ` · ${kgDisponibles} kg disponibles` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Beneficios */}
      <div style={{ padding: '18px 20px' }}>
        <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, color: 'var(--tw-text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Lo que obtienes
        </p>
        {[
          { icon: '💰', titulo: 'Tú fijas el precio', desc: 'Ingresa tus costos y elige tu margen.' },
          { icon: '🌿', titulo: 'Sin comisión en fase 1', desc: 'Mientras validamos el modelo, el 100% es tuyo.' },
          { icon: '📊', titulo: 'Dashboard de pedidos', desc: 'Gestiona stock, despachos y pagos.' },
        ].map(b => (
          <div key={b.titulo} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{b.icon}</span>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--tw-text)' }}>{b.titulo}</p>
              <p style={{ margin: '1px 0 0', fontSize: 10, color: 'var(--tw-text-muted)', lineHeight: 1.4 }}>{b.desc}</p>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 14, padding: 12, borderRadius: 9, background: 'var(--tw-terra-muted)', border: '1px solid rgba(201,110,75,.2)' }}>
          <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 700, color: 'var(--tw-terra)' }}>3 caficultores activos ahora</p>
          <p style={{ margin: 0, fontSize: 10, color: 'var(--tw-text-muted)', lineHeight: 1.4 }}>
            Cajamarca · San Ignacio · Jaén — vendiendo a cafeterías en Lima
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

const RegistroCaficultor: React.FC<{ isDemo?: boolean }> = ({ isDemo = false }) => {
  // Paso 1 — Cuenta
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  // Paso 2 — Finca
  const [region, setRegion] = useState('')
  const [distrito, setDistrito] = useState('')
  const [altitudMsnm, setAltitudMsnm] = useState<number>(0)
  const [kgDisponibles, setKgDisponibles] = useState<number>(0)
  const [variedadPrincipal, setVariedadPrincipal] = useState('')
  const [proceso, setProceso] = useState('')
  const [tipoRegistroCaficultor, setTipoRegistroCaficultor] = useState<TipoRegistroCaficultor>('SOLO_DNI')

  // Paso 3 — Identidad
  const [dni, setDni] = useState('')
  const [numeroYape, setNumeroYape] = useState('')
  const [fotoDniFile, setFotoDniFile] = useState<File | null>(null)
  const [fotoDniPreview, setFotoDniPreview] = useState<string | null>(null)
  const [fotoSelfieFile, setFotoSelfieFile] = useState<File | null>(null)
  const [fotoSelfiePreview, setFotoSelfiePreview] = useState<string | null>(null)

  const [paso, setPaso] = useState<Paso>(1)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function getInputStyle(focused: boolean, overrides?: React.CSSProperties): React.CSSProperties {
    return {
      ...inputBase,
      borderColor: focused ? 'var(--tw-terra)' : 'var(--tw-border)',
      ...overrides,
    }
  }

  // ─── Validaciones ─────────────────────────────────────────────────────────────

  function validarPaso1(): string | null {
    if (!nombre.trim()) return 'Ingresa tu nombre completo.'
    if (!email.includes('@')) return 'Ingresa un email válido.'
    if (!telefono.trim()) return 'Ingresa tu número de WhatsApp.'
    if (password.length < 8 || !/\d/.test(password)) return 'La contraseña debe tener al menos 8 caracteres y 1 número.'
    if (password !== passwordConfirm) return 'Las contraseñas no coinciden.'
    return null
  }

  function validarPaso2(): string | null {
    if (!region) return 'Selecciona tu región.'
    if (!distrito.trim()) return 'Ingresa tu distrito o localidad.'
    if (!variedadPrincipal) return 'Selecciona la variedad principal.'
    if (!proceso) return 'Selecciona el proceso de beneficio.'
    if (!tipoRegistroCaficultor) return 'Selecciona tu modalidad tributaria.'
    return null
  }

  function validarPaso3(): string | null {
    if (dni.length !== 8 || !/^\d+$/.test(dni)) return 'El DNI debe tener exactamente 8 dígitos.'
    if (!fotoDniFile) return 'Adjunta la foto frontal de tu DNI.'
    if (!fotoSelfieFile) return 'Adjunta una selfie sosteniendo tu DNI.'
    if (!numeroYape.trim()) return 'Ingresa tu número Yape para recibir pagos.'
    return null
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────────

  function handlePaso1() {
    const err = validarPaso1()
    if (err) { setError(err); return }
    setError(null); setPaso(2)
  }

  function handlePaso2() {
    const err = validarPaso2()
    if (err) { setError(err); return }
    setError(null); setPaso(3)
  }

  async function handleRegistrar() {
    const err = validarPaso3()
    if (err) { setError(err); return }
    setError(null)
    setEnviando(true)
    try {
      let fotoDniUrl = ''
      let fotoSelfieUrl = ''
      if (!isDemo && fotoDniFile && fotoSelfieFile) {
        [fotoDniUrl, fotoSelfieUrl] = await Promise.all([
          uploadKycPhoto(fotoDniFile),
          uploadKycPhoto(fotoSelfieFile),
        ])
      }
      if (!isDemo) {
        await registrarCaficultor(email, password, nombre, {
          region, distrito, altitudMsnm, kgDisponibles,
          variedadPrincipal, telefono,
          fotoDniUrl, fotoSelfieUrl,
        })
        const uid = auth.currentUser?.uid
        if (uid) {
          await updateDoc(doc(db, 'one_usuarios', uid), {
            'caficultor.proceso': proceso,
            'caficultor.dni': dni,
            'caficultor.numeroYape': numeroYape,
            'caficultor.kgDisponibles': kgDisponibles,
            'caficultor.tipoRegistroCaficultor': tipoRegistroCaficultor,
            updatedAt: serverTimestamp(),
          })
        }
      }
      setPaso('confirmacion')
    } catch (e: unknown) {
      const msg = String((e as { message?: string; code?: string })?.message ?? (e as { code?: string })?.code ?? e)
      if (msg.includes('email-already-in-use')) {
        setError('Ya existe una cuenta con ese email. ¿Quieres iniciar sesión?')
      } else {
        setError('No se pudo crear tu cuenta. Intenta de nuevo.')
      }
    } finally {
      setEnviando(false)
    }
  }

  // ─── Pantalla confirmación ────────────────────────────────────────────────────

  if (paso === 'confirmacion') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--tw-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: 'Montserrat, sans-serif' }}>
        <div style={{ maxWidth: 480, width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'var(--tw-sage-muted)', border: '2px solid var(--tw-sage)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px', fontSize: 32, color: 'var(--tw-sage)',
            }}>✓</div>
            <h2 style={{ margin: '0 0 6px', fontSize: 22, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif', fontWeight: 700 }}>
              ¡Bienvenido/a!
            </h2>
            <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--tw-text-muted)' }}>Tu cuenta de caficultor está lista.</p>
            <p style={{ margin: '0 0 20px', fontSize: 11, color: 'var(--tw-text-faint)' }}>Nos contactamos por WhatsApp para verificar tu finca.</p>
          </div>
          <div style={{ background: 'var(--tw-terra-muted)', border: '1px solid rgba(201,110,75,.2)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: 'var(--tw-terra)' }}>Próximos pasos</p>
            {[
              { n: '1', text: 'Te llamamos para verificar tu finca (24–48h)', color: 'var(--tw-terra)' },
              { n: '2', text: 'Publicas tu primer lote con precio y stock', color: 'var(--tw-terra)' },
              { n: '3', text: 'Recibes tu primer pedido y el Yape llega en 24h', color: 'var(--tw-sage)' },
            ].map(s => (
              <div key={s.n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: s.color, color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.n}</div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--tw-text-muted)' }}>{s.text}</p>
              </div>
            ))}
          </div>
          <a href="/" onClick={(e) => { e.preventDefault(); navigate('/') }} style={{ display: 'block', padding: 14, borderRadius: 10, textAlign: 'center', background: 'var(--tw-terra)', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>
            Ver catálogo →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--tw-bg)', fontFamily: 'Montserrat, sans-serif' }}>
      <style>{`
        @media (max-width: 700px) {
          .registro-caf-grid { grid-template-columns: 1fr !important; }
          .panel-propuesta-caf { display: none !important; }
          .reg-caf-2col { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Header */}
      <header style={{
        height: 52, padding: '0 32px',
        borderBottom: '1px solid var(--tw-border)',
        background: 'var(--tw-bg)',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        {paso === 1 ? (
          <a href="/" onClick={(e) => { e.preventDefault(); navigate('/') }} style={{ fontSize: 12, color: 'var(--tw-text-muted)', textDecoration: 'none' }}>← Inicio</a>
        ) : (
          <button
            onClick={() => { setError(null); setPaso(p => (p === 3 ? 2 : p === 2 ? 1 : 1) as Paso) }}
            style={{ background: 'none', border: 'none', color: 'var(--tw-text-muted)', fontSize: 12, cursor: 'pointer', padding: 0 }}
          >
            ← Volver
          </button>
        )}
        <span style={{ color: 'var(--tw-border)' }}>|</span>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif' }}>Tunay · Wasi</p>
      </header>

      <div className="registro-caf-grid" style={{
        maxWidth: 960, margin: '0 auto', padding: '48px 32px 80px',
        display: 'grid', gridTemplateColumns: '1fr 380px',
        gap: 48, alignItems: 'start',
      }}>
        {/* Columna izquierda — form */}
        <div style={{ background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 16, padding: 32 }}>
          <ProgressBar paso={paso} />

          {/* ── PASO 1: Cuenta ── */}
          {paso === 1 && (
            <Paso1
              nombre={nombre} setNombre={setNombre}
              email={email} setEmail={setEmail}
              telefono={telefono} setTelefono={setTelefono}
              password={password} setPassword={setPassword}
              passwordConfirm={passwordConfirm} setPasswordConfirm={setPasswordConfirm}
              error={error}
              onNext={handlePaso1}
              getInputStyle={getInputStyle}
            />
          )}

          {/* ── PASO 2: Finca ── */}
          {paso === 2 && (
            <Paso2
              region={region} setRegion={setRegion}
              distrito={distrito} setDistrito={setDistrito}
              altitudMsnm={altitudMsnm} setAltitudMsnm={setAltitudMsnm}
              kgDisponibles={kgDisponibles} setKgDisponibles={setKgDisponibles}
              variedadPrincipal={variedadPrincipal} setVariedadPrincipal={setVariedadPrincipal}
              proceso={proceso} setProceso={setProceso}
              tipoRegistroCaficultor={tipoRegistroCaficultor} setTipoRegistroCaficultor={setTipoRegistroCaficultor}
              error={error}
              onNext={handlePaso2}
              getInputStyle={getInputStyle}
            />
          )}

          {/* ── PASO 3: Identidad ── */}
          {paso === 3 && (
            <Paso3
              dni={dni} setDni={setDni}
              numeroYape={numeroYape} setNumeroYape={setNumeroYape}
              fotoDniFile={fotoDniFile} setFotoDniFile={setFotoDniFile}
              fotoDniPreview={fotoDniPreview} setFotoDniPreview={setFotoDniPreview}
              fotoSelfieFile={fotoSelfieFile} setFotoSelfieFile={setFotoSelfieFile}
              fotoSelfiePreview={fotoSelfiePreview} setFotoSelfiePreview={setFotoSelfiePreview}
              error={error}
              enviando={enviando}
              onRegistrar={handleRegistrar}
              getInputStyle={getInputStyle}
            />
          )}
        </div>

        {/* Columna derecha */}
        <div className="panel-propuesta-caf">
          <PanelPropuesta nombre={nombre} region={region} kgDisponibles={kgDisponibles} />
        </div>
      </div>
    </div>
  )
}

// ─── Sub-formularios ──────────────────────────────────────────────────────────

type GetInputStyle = (focused: boolean, overrides?: React.CSSProperties) => React.CSSProperties

const Paso1: React.FC<{
  nombre: string; setNombre: (v: string) => void
  email: string; setEmail: (v: string) => void
  telefono: string; setTelefono: (v: string) => void
  password: string; setPassword: (v: string) => void
  passwordConfirm: string; setPasswordConfirm: (v: string) => void
  error: string | null
  onNext: () => void
  getInputStyle: GetInputStyle
}> = ({ nombre, setNombre, email, setEmail, telefono, setTelefono, password, setPassword, passwordConfirm, setPasswordConfirm, error, onNext, getInputStyle }) => {
  const [focused, setFocused] = useState('')
  return (
    <div>
      <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'var(--tw-sage)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Paso 1 de 3</p>
      <h1 style={{ margin: '0 0 4px', fontSize: 24, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif', fontWeight: 700 }}>Crea tu cuenta</h1>
      <p style={{ margin: '0 0 24px', fontSize: 12, color: 'var(--tw-text-muted)' }}>Para empezar a vender tu café directamente a negocios peruanos.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Nombre completo" required>
          <input type="text" placeholder="María Quispe Condori" value={nombre}
            onChange={e => setNombre(e.target.value)}
            onFocus={() => setFocused('nombre')} onBlur={() => setFocused('')}
            style={getInputStyle(focused === 'nombre')} />
        </Field>
        <Field label="WhatsApp" required>
          <input type="tel" placeholder="+51 987 654 321" value={telefono}
            onChange={e => setTelefono(e.target.value)}
            onFocus={() => setFocused('tel')} onBlur={() => setFocused('')}
            style={getInputStyle(focused === 'tel')} />
        </Field>
        <Field label="Email" required>
          <input type="email" placeholder="tu@correo.com" value={email}
            onChange={e => setEmail(e.target.value)}
            onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
            style={getInputStyle(focused === 'email')} />
        </Field>
        <div className="reg-caf-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Contraseña" required>
            <input type="password" placeholder="Mínimo 8 caracteres + 1 número" value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setFocused('pass')} onBlur={() => setFocused('')}
              style={getInputStyle(focused === 'pass')} />
          </Field>
          <Field label="Confirmar" required>
            <input type="password" placeholder="Repite" value={passwordConfirm}
              onChange={e => setPasswordConfirm(e.target.value)}
              onFocus={() => setFocused('passConfirm')} onBlur={() => setFocused('')}
              style={getInputStyle(focused === 'passConfirm')} />
          </Field>
        </div>
      </div>

      {error && <p style={{ margin: '12px 0 0', padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', fontSize: 12, color: '#ef4444' }}>{error}</p>}

      <button onClick={onNext} style={{ marginTop: 22, width: '100%', padding: 14, borderRadius: 10, background: 'var(--tw-terra)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
        Siguiente →
      </button>
      <p style={{ margin: '12px 0 0', fontSize: 11, color: 'var(--tw-text-faint)', textAlign: 'center' }}>
        ¿Ya tienes cuenta?{' '}
        <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login') }} style={{ color: 'var(--tw-terra)', textDecoration: 'none', fontWeight: 700 }}>Inicia sesión</a>
      </p>
    </div>
  )
}

const Paso2: React.FC<{
  region: string; setRegion: (v: string) => void
  distrito: string; setDistrito: (v: string) => void
  altitudMsnm: number; setAltitudMsnm: (v: number) => void
  kgDisponibles: number; setKgDisponibles: (v: number) => void
  variedadPrincipal: string; setVariedadPrincipal: (v: string) => void
  proceso: string; setProceso: (v: string) => void
  tipoRegistroCaficultor: TipoRegistroCaficultor; setTipoRegistroCaficultor: (v: TipoRegistroCaficultor) => void
  error: string | null
  onNext: () => void
  getInputStyle: GetInputStyle
}> = ({ region, setRegion, distrito, setDistrito, altitudMsnm, setAltitudMsnm, kgDisponibles, setKgDisponibles, variedadPrincipal, setVariedadPrincipal, proceso, setProceso, tipoRegistroCaficultor, setTipoRegistroCaficultor, error, onNext, getInputStyle }) => {
  const [focused, setFocused] = useState('')
  return (
    <div>
      <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'var(--tw-sage)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Paso 2 de 3</p>
      <h1 style={{ margin: '0 0 4px', fontSize: 24, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif', fontWeight: 700 }}>Tu finca</h1>
      <p style={{ margin: '0 0 24px', fontSize: 12, color: 'var(--tw-text-muted)' }}>Cuéntanos sobre tu producción. Puedes actualizar esto después.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="reg-caf-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Región" required>
            <select value={region} onChange={e => setRegion(e.target.value)}
              onFocus={() => setFocused('region')} onBlur={() => setFocused('')}
              style={{ ...getInputStyle(focused === 'region'), cursor: 'pointer' }}>
              <option value="">Seleccionar...</option>
              {REGIONES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Distrito / localidad" required>
            <input type="text" placeholder="Ej. San Ignacio" value={distrito}
              onChange={e => setDistrito(e.target.value)}
              onFocus={() => setFocused('distrito')} onBlur={() => setFocused('')}
              style={getInputStyle(focused === 'distrito')} />
          </Field>
        </div>

        <div className="reg-caf-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Altitud aprox. (msnm)">
            <input type="number" placeholder="1800" value={altitudMsnm || ''}
              onChange={e => setAltitudMsnm(Number(e.target.value))}
              onFocus={() => setFocused('altitud')} onBlur={() => setFocused('')}
              style={getInputStyle(focused === 'altitud')} min={0} max={5000} />
          </Field>
          <Field label="Kg disponibles ahora">
            <input type="number" placeholder="100" value={kgDisponibles || ''}
              onChange={e => setKgDisponibles(Number(e.target.value))}
              onFocus={() => setFocused('kg')} onBlur={() => setFocused('')}
              style={getInputStyle(focused === 'kg')} min={0} />
          </Field>
        </div>

        <div className="reg-caf-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Variedad principal" required>
            <select value={variedadPrincipal} onChange={e => setVariedadPrincipal(e.target.value)}
              onFocus={() => setFocused('variedad')} onBlur={() => setFocused('')}
              style={{ ...getInputStyle(focused === 'variedad'), cursor: 'pointer' }}>
              <option value="">Seleccionar...</option>
              {VARIEDADES.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Proceso" required>
            <select value={proceso} onChange={e => setProceso(e.target.value)}
              onFocus={() => setFocused('proceso')} onBlur={() => setFocused('')}
              style={{ ...getInputStyle(focused === 'proceso'), cursor: 'pointer' }}>
              <option value="">Seleccionar...</option>
              {PROCESOS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
        </div>

        {/* TRIB-04: Modalidad tributaria */}
        <Field label="Modalidad tributaria" required hint="Determina qué tipos de café puedes vender y cómo recibirás pagos.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 4 }}>
            {TIPOS_REGISTRO.map(t => {
              const sel = tipoRegistroCaficultor === t.value
              return (
                <label key={t.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, border: `1px solid ${sel ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: sel ? 'rgba(201,110,75,0.06)' : 'var(--tw-bg)', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="tipoRegistroCaficultor"
                    value={t.value}
                    checked={sel}
                    onChange={() => setTipoRegistroCaficultor(t.value)}
                    style={{ marginTop: 2, accentColor: 'var(--tw-terra)', flexShrink: 0 }}
                  />
                  <div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: sel ? 'var(--tw-terra)' : 'var(--tw-text)' }}>{t.label}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--tw-text-muted)', lineHeight: 1.4 }}>{t.desc}</p>
                  </div>
                </label>
              )
            })}
          </div>
        </Field>
      </div>

      {error && <p style={{ margin: '12px 0 0', padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', fontSize: 12, color: '#ef4444' }}>{error}</p>}

      <button onClick={onNext} style={{ marginTop: 22, width: '100%', padding: 14, borderRadius: 10, background: 'var(--tw-terra)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
        Siguiente →
      </button>
    </div>
  )
}

const Paso3: React.FC<{
  dni: string; setDni: (v: string) => void
  numeroYape: string; setNumeroYape: (v: string) => void
  fotoDniFile: File | null; setFotoDniFile: (f: File | null) => void
  fotoDniPreview: string | null; setFotoDniPreview: (s: string | null) => void
  fotoSelfieFile: File | null; setFotoSelfieFile: (f: File | null) => void
  fotoSelfiePreview: string | null; setFotoSelfiePreview: (s: string | null) => void
  error: string | null
  enviando: boolean
  onRegistrar: () => void
  getInputStyle: GetInputStyle
}> = ({ dni, setDni, numeroYape, setNumeroYape, fotoDniFile, setFotoDniFile, fotoDniPreview, setFotoDniPreview, fotoSelfieFile, setFotoSelfieFile, fotoSelfiePreview, setFotoSelfiePreview, error, enviando, onRegistrar, getInputStyle }) => {
  const [focused, setFocused] = useState('')
  const refDni = useRef<HTMLInputElement>(null)
  const refSelfie = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, tipo: 'dni' | 'selfie') {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { alert('Solo se permiten imágenes.'); return }
    if (file.size > 5 * 1024 * 1024) { alert('La imagen no debe superar 5 MB.'); return }
    const preview = URL.createObjectURL(file)
    if (tipo === 'dni') { setFotoDniFile(file); setFotoDniPreview(preview) }
    else { setFotoSelfieFile(file); setFotoSelfiePreview(preview) }
  }

  const uploadBoxStyle = (hasFile: boolean): React.CSSProperties => ({
    border: `2px dashed ${hasFile ? 'var(--tw-sage)' : 'var(--tw-border)'}`,
    borderRadius: 10, padding: hasFile ? '4px' : '18px 12px', textAlign: 'center',
    cursor: 'pointer', background: 'var(--tw-bg)', transition: 'border-color 0.15s',
    overflow: 'hidden', minHeight: 72, display: 'flex', alignItems: 'center', justifyContent: 'center',
  })

  return (
    <div>
      <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'var(--tw-sage)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Paso 3 de 3</p>
      <h1 style={{ margin: '0 0 4px', fontSize: 24, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif', fontWeight: 700 }}>Verifica tu identidad</h1>
      <p style={{ margin: '0 0 24px', fontSize: 12, color: 'var(--tw-text-muted)' }}>Sube tu DNI y selfie para que nuestro equipo verifique tu identidad. Tu cuenta quedará activa en 24–48 horas hábiles.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Número de DNI" required>
          <input type="text" placeholder="12345678" maxLength={8} value={dni}
            onChange={e => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
            onFocus={() => setFocused('dni')} onBlur={() => setFocused('')}
            style={getInputStyle(focused === 'dni')} />
        </Field>

        {/* Upload fotos KYC */}
        <div className="reg-caf-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Foto frontal DNI" required>
            <input ref={refDni} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => handleFileChange(e, 'dni')} />
            <div style={uploadBoxStyle(!!fotoDniFile)}
              onClick={() => refDni.current?.click()}
              onMouseEnter={e => { if (!fotoDniFile) e.currentTarget.style.borderColor = 'var(--tw-terra)' }}
              onMouseLeave={e => { if (!fotoDniFile) e.currentTarget.style.borderColor = 'var(--tw-border)' }}
            >
              {fotoDniPreview
                ? <img src={fotoDniPreview} alt="DNI" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 8 }} />
                : <><div style={{ fontSize: 22, marginBottom: 4 }}>📷</div><div style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>Adjuntar imagen</div></>
              }
            </div>
            {fotoDniFile && <div style={{ fontSize: 10, color: 'var(--tw-sage)', marginTop: 4, textAlign: 'center' }}>✓ {fotoDniFile.name}</div>}
          </Field>
          <Field label="Selfie sosteniendo el DNI" required>
            <input ref={refSelfie} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => handleFileChange(e, 'selfie')} />
            <div style={uploadBoxStyle(!!fotoSelfieFile)}
              onClick={() => refSelfie.current?.click()}
              onMouseEnter={e => { if (!fotoSelfieFile) e.currentTarget.style.borderColor = 'var(--tw-terra)' }}
              onMouseLeave={e => { if (!fotoSelfieFile) e.currentTarget.style.borderColor = 'var(--tw-border)' }}
            >
              {fotoSelfiePreview
                ? <img src={fotoSelfiePreview} alt="Selfie" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 8 }} />
                : <><div style={{ fontSize: 22, marginBottom: 4 }}>🤳</div><div style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>Adjuntar foto</div></>
              }
            </div>
            {fotoSelfieFile && <div style={{ fontSize: 10, color: 'var(--tw-sage)', marginTop: 4, textAlign: 'center' }}>✓ {fotoSelfieFile.name}</div>}
          </Field>
        </div>

        {/* Verificación manual badge */}
        <div style={{ background: 'rgba(143,175,138,.07)', border: '1px solid rgba(143,175,138,.2)', borderRadius: 9, padding: '11px 13px', fontSize: 11, color: 'var(--tw-sage)', lineHeight: 1.6 }}>
          📋 <strong>Verificación manual (24–48 horas hábiles)</strong> — Tu cuenta quedará en revisión hasta que nuestro equipo valide tu identidad.
        </div>

        <Field label="Número Yape" required hint="Al número donde recibirás tus pagos. Debe ser titular del mismo DNI.">
          <input type="tel" placeholder="+51 987 654 321" value={numeroYape}
            onChange={e => setNumeroYape(e.target.value)}
            onFocus={() => setFocused('yape')} onBlur={() => setFocused('')}
            style={getInputStyle(focused === 'yape')} />
        </Field>
      </div>

      {error && <p style={{ margin: '12px 0 0', padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', fontSize: 12, color: '#ef4444' }}>{error}</p>}

      <button onClick={onRegistrar} disabled={enviando} style={{
        marginTop: 22, width: '100%', padding: 14, borderRadius: 10,
        background: enviando ? 'var(--tw-text-faint)' : 'var(--tw-terra)',
        color: '#fff', border: 'none', fontSize: 14, fontWeight: 700,
        cursor: enviando ? 'not-allowed' : 'pointer',
      }}>
        {enviando ? 'Subiendo fotos y creando cuenta...' : 'Crear cuenta →'}
      </button>
    </div>
  )
}

export default RegistroCaficultor
