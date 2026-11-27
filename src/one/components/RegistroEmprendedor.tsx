/**
 * RegistroEmprendedor.tsx — Registro B2B comprador (buyer_b2b)
 * Flujo: Paso 1 (cuenta) → Paso 2 (empresa/RUC) → Paso 3 (resumen) → Confirmación
 * US-01: validación RUC SUNAT, razón social autofill, rol buyer_b2b
 */
import React, { useState, useRef } from 'react'
import { navigate } from '@/router'
import { irALogin } from '../retorno'
import { registrar } from '../authService'
import { auth } from '@/shared/firebase'
import { db } from '@/shared/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { claveRuc, errorFormatoRuc, esDocumentoDuplicado } from '../documentos'
import { completarOnboarding, useOnboardingTracking } from '../onboarding'

// REG-04: comprador B2B con RUC 10 (persona natural con negocio) o 20 (persona jurídica)
const PREFIJOS_RUC_B2B = ['10', '20'] as const

type Paso = 0 | 1 | 2 | 3 | 'confirmacion'
type RucEstado = 'idle' | 'checking' | 'ok' | 'err'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 13px',
  borderRadius: 8,
  border: '1px solid var(--tw-border)',
  background: 'var(--tw-bg)',
  color: 'var(--tw-text)',
  fontSize: 13,
  fontFamily: 'Montserrat, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
}

const autofillStyle: React.CSSProperties = {
  ...inputStyle,
  background: 'var(--tw-sage-muted)',
  borderColor: 'var(--tw-sage)',
  color: 'var(--tw-sage)',
  fontWeight: 600,
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--tw-text-muted)',
  marginBottom: 5,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

// ─── Barra de progreso ────────────────────────────────────────────────────────
const ProgressBar: React.FC<{ paso: Paso }> = ({ paso }) => {
  const actual = paso === 'confirmacion' ? 4 : (paso as number)
  if (paso === 0) return null
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

// ─── Panel derecho (solo desktop) ────────────────────────────────────────────
const PanelDerecho: React.FC<{ tipo: 'b2b' | 'b2c' | null }> = ({ tipo }) => {
  const esB2C = tipo === 'b2c'
  return (
    <div style={{
      position: 'sticky', top: 76,
      background: 'var(--tw-card)',
      border: '1px solid var(--tw-border)',
      borderRadius: 16,
      overflow: 'hidden',
      fontFamily: 'Montserrat, sans-serif',
    }}>
      <div style={{
        background: esB2C ? 'var(--tw-terra-muted)' : 'var(--tw-sage-muted)',
        padding: '24px',
        borderBottom: '1px solid var(--tw-border)',
      }}>
        <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'var(--tw-sage)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          {esB2C ? 'Compradores B2C' : 'Compradores B2B'}
        </p>
        <h2 style={{ margin: '0 0 8px', fontSize: 21, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, lineHeight: 1.2 }}>
          {esB2C ? <>Café de especialidad<br />directo al productor.</> : <>Lotes de especialidad<br />con factura electrónica.</>}
        </h2>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--tw-text-muted)', lineHeight: 1.6 }}>
          {esB2C
            ? 'Compra con boleta electrónica. Registro simple con DNI.'
            : 'Compra directamente al productor. Facturación automática contra tu RUC activo en SUNAT.'}
        </p>
      </div>
      <div style={{ padding: '18px 20px' }}>
        <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, color: 'var(--tw-text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Lo que obtienes
        </p>
        {(esB2C ? [
          { icon: '☕', titulo: 'Catálogo completo', desc: 'Accede a todos los lotes disponibles para consumo personal.' },
          { icon: '🧾', titulo: 'Boleta electrónica', desc: 'Se genera automáticamente en cada compra con tu DNI.' },
          { icon: '📍', titulo: 'Dirección de entrega', desc: 'Guarda tu dirección favorita para pedidos rápidos.' },
        ] : [
          { icon: '📋', titulo: 'Acceso a lotes TYPE_A', desc: 'Lotes de especialidad SCA ≥ 80 pts, disponibles solo para compradores B2B.' },
          { icon: '🧾', titulo: 'Factura electrónica automática', desc: 'Se genera contra tu RUC al confirmar cada orden. Sin trámites.' },
          { icon: '💬', titulo: 'Negociación directa', desc: 'Envía ofertas de precio en lotes negociables. El caficultor responde en 48h.' },
        ]).map(b => (
          <div key={b.titulo} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{b.icon}</span>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--tw-text)' }}>{b.titulo}</p>
              <p style={{ margin: '1px 0 0', fontSize: 10, color: 'var(--tw-text-muted)', lineHeight: 1.4 }}>{b.desc}</p>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 14, padding: 12, borderRadius: 9, background: 'var(--tw-terra-muted)', border: '1px solid rgba(201,110,75,.2)' }}>
          <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 700, color: 'var(--tw-terra)' }}>Escrow seguro</p>
          <p style={{ margin: 0, fontSize: 10, color: 'var(--tw-text-muted)', lineHeight: 1.4 }}>Tu pago queda retenido hasta que confirmas la recepción conforme.</p>
        </div>
      </div>
    </div>
  )
}

// ─── Simulación SUNAT ─────────────────────────────────────────────────────────
function consultarSunat(ruc: string): Promise<{ ok: boolean; razonSocial: string }> {
  return new Promise(resolve => {
    setTimeout(() => {
      if (ruc === '20000000001') {
        resolve({ ok: false, razonSocial: '' })
      } else if (ruc === '20601234565') {
        resolve({ ok: true, razonSocial: 'CAFÉ EL ORIGEN S.A.C.' })
      } else {
        resolve({ ok: true, razonSocial: 'EMPRESA DEMO S.A.C.' })
      }
    }, 900)
  })
}

// ─── Componente principal ─────────────────────────────────────────────────────
const RegistroEmprendedor: React.FC<{ isDemo: boolean }> = ({ isDemo }) => {
  // Paso 1 — Cuenta
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  // Paso 2 — Empresa
  const [ruc, setRuc] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [dirFiscal, setDirFiscal] = useState('')
  const [mismaDirFiscal, setMismaDirFiscal] = useState(true)
  const [dirEnvio, setDirEnvio] = useState('')
  const [rucEstado, setRucEstado] = useState<RucEstado>('idle')

  // Estado general
  const [paso, setPaso] = useState<Paso>(0)
  const [tipo, setTipo] = useState<'b2b' | 'b2c' | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Embudo de onboarding (iter.16) — antes de cualquier return
  useOnboardingTracking(
    paso === 0 ? 'selector_tipo' : paso === 1 ? 'cuenta' : paso === 2 ? 'empresa' : paso === 3 ? 'revision' : 'confirmacion',
    paso === 0 ? 'desconocido' : 'b2b', 'email', error)

  const rucTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Selección de tipo ───────────────────────────────────────────────────────
  function handleConfirmTipo() {
    if (!tipo) return
    if (tipo === 'b2c') {
      navigate('/registro')
      return
    }
    setError(null)
    setPaso(1)
  }

  // ─── RUC handler ─────────────────────────────────────────────────────────────
  function handleRucChange(val: string) {
    const cleaned = val.replace(/\D/g, '').slice(0, 11)
    setRuc(cleaned)
    setRucEstado('idle')
    setRazonSocial('')

    if (rucTimerRef.current) clearTimeout(rucTimerRef.current)

    if (cleaned.length === 11) {
      // REG-04: formato + dígito verificador antes de consultar SUNAT
      if (errorFormatoRuc(cleaned, PREFIJOS_RUC_B2B)) { setRucEstado('err'); return }
      setRucEstado('checking')
      consultarSunat(cleaned).then(res => {
        if (res.ok) {
          setRucEstado('ok')
          setRazonSocial(res.razonSocial)
        } else {
          setRucEstado('err')
        }
      })
    }
  }

  // ─── Validaciones ────────────────────────────────────────────────────────────
  function validarPaso1(): string | null {
    if (!nombre.trim()) return 'Ingresa tu nombre de contacto.'
    if (!email.includes('@')) return 'Ingresa un email válido.'
    if (!telefono.trim()) return 'Ingresa tu teléfono.'
    if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
    if (!/\d/.test(password)) return 'La contraseña debe incluir al menos 1 número.'
    if (password !== passwordConfirm) return 'Las contraseñas no coinciden.'
    return null
  }

  function validarPaso2(): string | null {
    const errFormato = errorFormatoRuc(ruc, PREFIJOS_RUC_B2B)
    if (errFormato) return errFormato
    if (rucEstado === 'checking') return 'Esperando verificación SUNAT...'
    if (rucEstado === 'err') return 'RUC no encontrado en SUNAT — revisa el número.'
    if (rucEstado !== 'ok') return 'Verifica el RUC antes de continuar.'
    if (!dirFiscal.trim()) return 'Ingresa la dirección fiscal.'
    if (!mismaDirFiscal && !dirEnvio.trim()) return 'Ingresa la dirección de envío.'
    return null
  }

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
    setEnviando(true); setError(null)
    try {
      if (!isDemo) {
        let uid: string | undefined
        try {
          // REG-02: el RUC se reserva como RUC_<ruc>; si ya existe se aborta el alta
          await registrar(email, password, nombre, 'buyer_b2b', [claveRuc(ruc)])
          uid = auth.currentUser?.uid
        } catch (e: unknown) {
          const msg = String((e as { message?: string })?.message ?? e)
          if (esDocumentoDuplicado(e)) {
            setError(e.message)
            setEnviando(false); return
          }
          if (msg.includes('email-already-in-use')) {
            setError('Ya existe una cuenta con ese email. ¿Quieres iniciar sesión?')
            setEnviando(false); return
          }
          throw e
        }
        // Esperar a que Firebase propague el currentUser si no llega inmediato
        if (!uid) {
          await new Promise(r => setTimeout(r, 800))
          uid = auth.currentUser?.uid
        }
        if (!uid) {
          setError('No se pudo obtener el usuario. Intenta de nuevo.')
          setEnviando(false); return
        }
        await setDoc(doc(db, 'one_usuarios', uid), {
          telefono,
          rol: 'buyer_b2b',
          negocio: {
            nombreLocal: razonSocial,
            distritoLocal: '',
            etapa: 'planificando',
            pedidoIds: [],
          },
          empresa: {
            ruc,
            razonSocial,
            dirFiscal,
            dirEnvio: mismaDirFiscal ? dirFiscal : dirEnvio,
            estadoAprobacion: 'PENDING_APPROVAL',
            // GAP-12: usar serverTimestamp() en lugar de new Date().toISOString()
            solicitudAt: serverTimestamp(),
          },
          updatedAt: serverTimestamp(),
        }, { merge: true })
        completarOnboarding(uid, 'buyer_b2b', 'b2b', 'email')
      }
      setPaso('confirmacion')
    } catch (e: unknown) {
      const msg = String((e as { message?: string })?.message ?? e)
      setError(`Error al registrar: ${msg}`)
    } finally {
      setEnviando(false)
    }
  }

  // ─── Pantalla confirmación (PENDING_APPROVAL) ────────────────────────────────
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
            {/* GAP-13: badge PENDING_APPROVAL en vez de "buyer_b2b · RUC verificado" */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'rgba(212,168,0,.12)', border: '1px solid rgba(212,168,0,.4)', fontSize: 10, fontWeight: 700, color: '#d4a800', marginBottom: 16 }}>
              En revisión · PENDING_APPROVAL
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: 22, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif', fontWeight: 700 }}>
              ¡Solicitud enviada!
            </h2>
            <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--tw-text-muted)' }}>{razonSocial || nombre}</p>
            <p style={{ margin: '0 0 20px', fontSize: 11, color: 'var(--tw-text-faint)' }}>RUC {ruc} · Verificado SUNAT</p>
          </div>

          {/* Banner estado pendiente */}
          <div style={{ background: 'rgba(212,168,0,.08)', border: '1px solid rgba(212,168,0,.3)', borderRadius: 12, padding: '16px 18px', marginBottom: 20, textAlign: 'left' }}>
            <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#d4a800' }}>¿Qué pasa ahora?</p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: 'var(--tw-text-muted)', lineHeight: 1.7 }}>
              <li>Nuestro equipo revisará tus datos en <strong>1-2 días hábiles</strong></li>
              <li>Recibirás un email de aprobación en <strong>{email || 'tu correo'}</strong></li>
              <li>Una vez aprobado tendrás acceso a lotes TYPE_A y precios por volumen</li>
            </ul>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a href="/portal" onClick={(e) => { e.preventDefault(); navigate('/portal') }} style={{
              display: 'block', padding: 14, borderRadius: 10, textAlign: 'center',
              background: 'var(--tw-terra)', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 700,
            }}>
              Ver mi estado →
            </a>
            <a href="/" onClick={(e) => { e.preventDefault(); navigate('/') }} style={{
              display: 'block', padding: 12, borderRadius: 10, textAlign: 'center',
              background: 'none', border: '1px solid var(--tw-border)', color: 'var(--tw-text-muted)',
              textDecoration: 'none', fontSize: 13, fontWeight: 600,
            }}>
              Explorar catálogo (solo lectura)
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--tw-bg)', fontFamily: 'Montserrat, sans-serif' }}>
      {/* Header */}
      <header style={{ height: 52, padding: '0 32px', borderBottom: '1px solid var(--tw-border)', display: 'flex', alignItems: 'center', gap: 16 }}>
        {paso === 0 ? (
          <a href="/" onClick={(e) => { e.preventDefault(); navigate('/') }} style={{ fontSize: 12, color: 'var(--tw-text-muted)', textDecoration: 'none' }}>← Volver al catálogo</a>
        ) : (
          <button
            onClick={() => { setError(null); setPaso(p => (p === 3 ? 2 : p === 2 ? 1 : 0)) }}
            style={{ background: 'none', border: 'none', color: 'var(--tw-text-muted)', fontSize: 12, cursor: 'pointer', padding: 0 }}
          >
            ← Volver
          </button>
        )}
        <span style={{ color: 'var(--tw-border)' }}>|</span>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif' }}>Tunay · Wasi</p>
      </header>

      {/* CSS responsive */}
      <style>{`
        @media (max-width: 700px) {
          .reg-b2b-grid { grid-template-columns: 1fr !important; }
          .reg-b2b-panel { display: none !important; }
          .reg-b2b-pass-row { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="reg-b2b-grid" style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: '48px 32px 80px',
        display: 'grid',
        gridTemplateColumns: '1fr 360px',
        gap: 48,
        alignItems: 'start',
      }}>
        {/* Columna izquierda — form */}
        <div style={{ background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 16, padding: 32 }}>
          <ProgressBar paso={paso} />

          {/* ── PASO 0: Selección de tipo ── */}
          {paso === 0 && (
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'var(--tw-sage)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Registro</p>
              <h1 style={{ margin: '0 0 4px', fontSize: 24, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif', fontWeight: 700 }}>¿Cómo quieres registrarte?</h1>
              <p style={{ margin: '0 0 24px', fontSize: 12, color: 'var(--tw-text-muted)' }}>Elige el tipo de cuenta según tu perfil.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                {[
                  { key: 'b2c' as const, emoji: '🧑', titulo: 'Persona', desc: 'Compro café para consumo personal.', badge: 'DNI' },
                  { key: 'b2b' as const, emoji: '🏢', titulo: 'Negocio', desc: 'Compro para mi empresa con factura.', badge: 'RUC' },
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setTipo(opt.key)}
                    style={{
                      background: tipo === opt.key ? 'var(--tw-terra-muted)' : 'var(--tw-card)',
                      border: `2px solid ${tipo === opt.key ? 'var(--tw-terra)' : 'var(--tw-border)'}`,
                      borderRadius: 12,
                      padding: '20px 16px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'border-color 0.2s, background 0.2s',
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{opt.emoji}</div>
                    <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: 'var(--tw-text)' }}>{opt.titulo}</p>
                    <p style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--tw-text-muted)', lineHeight: 1.4 }}>{opt.desc}</p>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, background: 'var(--tw-terra-muted)', border: '1px solid rgba(201,110,75,.3)', fontSize: 9, fontWeight: 700, color: 'var(--tw-terra)' }}>{opt.badge}</span>
                  </button>
                ))}
              </div>

              {tipo && (
                <p style={{ margin: '0 0 14px', fontSize: 11, color: 'var(--tw-sage)', textAlign: 'center' }}>
                  {tipo === 'b2b' ? '→ Flujo B2B: cuenta + RUC + resumen' : '→ Flujo B2C: cuenta + DNI + dirección opcional'}
                </p>
              )}

              <button
                onClick={handleConfirmTipo}
                disabled={!tipo}
                style={{
                  width: '100%', padding: 14, borderRadius: 10,
                  background: tipo ? 'var(--tw-terra)' : 'var(--tw-border)',
                  color: tipo ? '#fff' : 'var(--tw-text-faint)',
                  border: 'none', fontSize: 14, fontWeight: 700,
                  cursor: tipo ? 'pointer' : 'not-allowed',
                  opacity: tipo ? 1 : 0.5,
                  transition: 'background 0.2s, color 0.2s, opacity 0.2s',
                }}
              >
                Continuar →
              </button>
            </div>
          )}

          {/* ── PASO 1: Cuenta ── */}
          {paso === 1 && (
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'var(--tw-sage)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Paso 1 de 3</p>
              <h1 style={{ margin: '0 0 4px', fontSize: 24, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif', fontWeight: 700 }}>Crea tu cuenta</h1>
              <p style={{ margin: '0 0 24px', fontSize: 12, color: 'var(--tw-text-muted)' }}>Acceso al catálogo de lotes TYPE_A y precios por volumen.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Nombre de contacto <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                  <input type="text" placeholder="María García López" value={nombre} onChange={e => setNombre(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email corporativo <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                  <input type="email" placeholder="compras@empresa.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Teléfono <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                  <input type="tel" placeholder="+51 1 480 0000" value={telefono} onChange={e => setTelefono(e.target.value)} style={inputStyle} />
                </div>
                <div className="reg-b2b-pass-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Contraseña <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                    <input type="password" placeholder="Mín. 8 chars + 1 número" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Confirmar <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                    <input type="password" placeholder="Repite" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} style={inputStyle} />
                  </div>
                </div>
              </div>

              {error && <p style={{ margin: '12px 0 0', padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', fontSize: 12, color: '#ef4444' }}>{error}</p>}

              <button onClick={handlePaso1} style={{ marginTop: 22, width: '100%', padding: 14, borderRadius: 10, background: 'var(--tw-terra)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Siguiente →
              </button>
              <p style={{ margin: '12px 0 0', fontSize: 11, color: 'var(--tw-text-faint)', textAlign: 'center' }}>
                ¿Ya tienes cuenta?{' '}
                <a href="/login" onClick={(e) => { e.preventDefault(); irALogin() }} style={{ color: 'var(--tw-terra)', textDecoration: 'none', fontWeight: 700 }}>Inicia sesión</a>
              </p>
            </div>
          )}

          {/* ── PASO 2: Empresa ── */}
          {paso === 2 && (
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'var(--tw-sage)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Paso 2 de 3</p>
              <h1 style={{ margin: '0 0 4px', fontSize: 24, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif', fontWeight: 700 }}>Datos de empresa</h1>
              <p style={{ margin: '0 0 24px', fontSize: 12, color: 'var(--tw-text-muted)' }}>Tu RUC activo en SUNAT para facturación electrónica.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* RUC */}
                <div>
                  <label style={labelStyle}>RUC <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                  <input
                    type="text"
                    placeholder="20XXXXXXXXX"
                    value={ruc}
                    onChange={e => handleRucChange(e.target.value)}
                    maxLength={11}
                    style={{
                      ...inputStyle,
                      borderColor: rucEstado === 'ok' ? 'var(--tw-sage)' : rucEstado === 'err' ? '#ef4444' : 'var(--tw-border)',
                    }}
                  />
                  {rucEstado === 'checking' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, fontSize: 11, color: 'var(--tw-text-muted)' }}>
                      <div style={{ width: 11, height: 11, border: '2px solid var(--tw-border)', borderTopColor: 'var(--tw-terra)', borderRadius: '50%', animation: 'spin .6s linear infinite', flexShrink: 0 }} />
                      Verificando en SUNAT…
                    </div>
                  )}
                  {rucEstado === 'ok' && <p style={{ margin: '5px 0 0', fontSize: 11, fontWeight: 600, color: 'var(--tw-sage)' }}>✓ RUC verificado en SUNAT</p>}
                  {rucEstado === 'err' && <p style={{ margin: '5px 0 0', fontSize: 11, fontWeight: 600, color: '#ef4444' }}>✗ {errorFormatoRuc(ruc, PREFIJOS_RUC_B2B) ?? 'RUC no encontrado en SUNAT — revisa el número'}</p>}
                </div>

                {/* Razón social autofill */}
                <div>
                  <label style={labelStyle}>Razón social <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                  <input
                    type="text"
                    placeholder="Se completa automáticamente desde SUNAT"
                    value={razonSocial}
                    readOnly
                    style={razonSocial ? autofillStyle : inputStyle}
                  />
                  <p style={{ margin: '4px 0 0', fontSize: 9, color: 'var(--tw-text-faint)' }}>Auto-completado al verificar el RUC. No editable.</p>
                </div>

                {/* Dirección fiscal */}
                <div>
                  <label style={labelStyle}>Dirección fiscal <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                  <input type="text" placeholder="Av. República de Panamá 3030, San Isidro" value={dirFiscal} onChange={e => setDirFiscal(e.target.value)} style={inputStyle} />
                  <p style={{ margin: '4px 0 0', fontSize: 9, color: 'var(--tw-text-faint)' }}>Debe coincidir con la registrada en SUNAT.</p>
                </div>

                {/* Dirección de envío */}
                <div>
                  <label style={{ ...labelStyle, marginBottom: 8 }}>Dirección de envío <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
                    <input
                      type="checkbox"
                      checked={mismaDirFiscal}
                      onChange={e => setMismaDirFiscal(e.target.checked)}
                      style={{ accentColor: 'var(--tw-terra)', width: 14, height: 14 }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--tw-text-muted)' }}>Igual a la dirección fiscal</span>
                  </label>
                  {!mismaDirFiscal && (
                    <input type="text" placeholder="Dirección de entrega de mercadería" value={dirEnvio} onChange={e => setDirEnvio(e.target.value)} style={inputStyle} />
                  )}
                  <p style={{ margin: '4px 0 0', fontSize: 9, color: 'var(--tw-text-faint)' }}>Puedes agregar hasta 3 direcciones de entrega desde tu perfil.</p>
                </div>
              </div>

              {error && <p style={{ margin: '12px 0 0', padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', fontSize: 12, color: '#ef4444' }}>{error}</p>}

              <button onClick={handlePaso2} style={{ marginTop: 22, width: '100%', padding: 14, borderRadius: 10, background: 'var(--tw-terra)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Siguiente →
              </button>
            </div>
          )}

          {/* ── PASO 3: Resumen ── */}
          {paso === 3 && (
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'var(--tw-sage)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Paso 3 de 3</p>
              <h1 style={{ margin: '0 0 4px', fontSize: 24, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif', fontWeight: 700 }}>Revisa y confirma</h1>
              <p style={{ margin: '0 0 24px', fontSize: 12, color: 'var(--tw-text-muted)' }}>Verifica los datos antes de crear tu cuenta.</p>

              {/* Tabla resumen */}
              <div style={{ background: 'var(--tw-bg)', border: '1px solid var(--tw-border)', borderRadius: 12, padding: 16, marginBottom: 18 }}>
                {[
                  { k: 'Rol', v: 'buyer_b2b', vStyle: { color: 'var(--tw-terra)' } },
                  { k: 'RUC', v: ruc },
                  { k: 'Razón social', v: razonSocial },
                  { k: 'Dir. fiscal', v: dirFiscal },
                  { k: 'Dir. envío', v: mismaDirFiscal ? 'Igual a fiscal' : dirEnvio },
                  { k: 'Contacto', v: `${nombre} · ${telefono}` },
                ].map((row, i, arr) => (
                  <div key={row.k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--tw-border)' : 'none', fontSize: 11 }}>
                    <span style={{ color: 'var(--tw-text-muted)' }}>{row.k}</span>
                    <span style={{ color: 'var(--tw-text)', fontWeight: 700, textAlign: 'right', maxWidth: '60%', ...row.vStyle }}>{row.v}</span>
                  </div>
                ))}
              </div>

              {/* Banner beneficios */}
              <div style={{ background: 'var(--tw-sage-muted)', border: '1px solid rgba(143,175,138,.2)', borderRadius: 9, padding: 12, marginBottom: 18, fontSize: 11, color: 'var(--tw-sage)', lineHeight: 1.6 }}>
                ✓ Como <strong>buyer_b2b</strong> tendrás acceso a lotes TYPE_A, precios por volumen y factura electrónica automática.
              </div>

              {error && <p style={{ margin: '12px 0 0', padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', fontSize: 12, color: '#ef4444' }}>{error}</p>}

              <button onClick={handleRegistrar} disabled={enviando} style={{ marginTop: 4, width: '100%', padding: 14, borderRadius: 10, background: enviando ? 'var(--tw-text-faint)' : 'var(--tw-terra)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: enviando ? 'not-allowed' : 'pointer' }}>
                {enviando ? 'Creando cuenta...' : 'Crear cuenta →'}
              </button>
            </div>
          )}
        </div>

        {/* Panel derecho */}
        <div className="reg-b2b-panel">
          <PanelDerecho tipo={tipo} />
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default RegistroEmprendedor
