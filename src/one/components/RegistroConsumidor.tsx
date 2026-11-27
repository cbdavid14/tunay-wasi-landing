import React, { useState } from 'react'
import { navigate } from '@/router'
import { registrar } from '../authService'
import { auth } from '@/shared/firebase'
import { db } from '@/shared/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { claveDniB2C, esDniValido, esDocumentoDuplicado } from '../documentos'
import { completarOnboarding, useOnboardingTracking } from '../onboarding'

type Paso = 1 | 2 | 'confirmacion'

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
  const actual = paso === 'confirmacion' ? 2 : (paso as number)
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
      {[1, 2].map(p => (
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
const PanelDerecho: React.FC<{ tipo: 'b2c' | 'b2b' | null }> = ({ tipo }) => {
  const esB2B = tipo === 'b2b'
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
        background: esB2B ? 'var(--tw-sage-muted)' : 'var(--tw-terra-muted)',
        padding: '24px',
        borderBottom: '1px solid var(--tw-border)',
      }}>
        <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: esB2B ? 'var(--tw-sage)' : 'var(--tw-terra)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          {esB2B ? 'Empresa / Negocio' : 'Consumidor Final'}
        </p>
        <h2 style={{ margin: '0 0 8px', fontSize: 21, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, lineHeight: 1.2 }}>
          {esB2B ? <>Facturas, lotes<br />premium y<br />compras al por mayor.</> : <>Café de origen,<br />desde la finca<br />a tu taza.</>}
        </h2>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--tw-text-muted)', lineHeight: 1.6 }}>
          {esB2B
            ? 'Factura electrónica con RUC activo. Acceso exclusivo a lotes TYPE_A de alta puntuación.'
            : 'Compra directamente al caficultor. Recibe boleta electrónica y conoce la historia detrás de cada grano.'}
        </p>
      </div>
      <div style={{ padding: '18px 20px' }}>
        <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, color: 'var(--tw-text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Lo que obtienes
        </p>
        {(esB2B ? [
          { icon: '📄', titulo: 'Factura electrónica', desc: 'Con RUC verificado. Deducible de impuestos.' },
          { icon: '⭐', titulo: 'Lotes TYPE_A', desc: 'Alta puntuación de taza. Exclusivos para compradores B2B.' },
          { icon: '📦', titulo: 'Compras al por mayor', desc: 'Desde 5kg hasta 69kg por lote. Precios preferentes.' },
        ] : [
          { icon: '☕', titulo: 'Cafés TYPE_B y TYPE_C', desc: 'Varietales tostados, disponibles en 250g, 500g y 1kg.' },
          { icon: '🧾', titulo: 'Boleta electrónica', desc: 'Se genera automáticamente con cada compra. Sin trámites.' },
          { icon: '🌿', titulo: 'Trazabilidad completa', desc: 'Conoce el caficultor, la región, el proceso y la altitud de tu café.' },
        ]).map(b => (
          <div key={b.titulo} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{b.icon}</span>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--tw-text)' }}>{b.titulo}</p>
              <p style={{ margin: '1px 0 0', fontSize: 10, color: 'var(--tw-text-muted)', lineHeight: 1.4 }}>{b.desc}</p>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 14, padding: 12, borderRadius: 9, background: 'var(--tw-sage-muted)', border: '1px solid rgba(143,175,138,.2)' }}>
          <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 700, color: 'var(--tw-sage)' }}>Escrow seguro</p>
          <p style={{ margin: 0, fontSize: 10, color: 'var(--tw-text-muted)', lineHeight: 1.4 }}>Tu pago queda retenido hasta que confirmas la recepción conforme.</p>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
const RegistroConsumidor: React.FC<{ isDemo: boolean }> = ({ isDemo }) => {
  const [paso, setPaso] = useState<Paso>(1)

  // Paso 1 — Cuenta
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  // Paso 2 — DNI + dirección
  const [dni, setDni] = useState('')
  const [dniEstado, setDniEstado] = useState<'idle' | 'ok' | 'err'>('idle')
  const [dirEntrega, setDirEntrega] = useState('')
  const [referencia, setReferencia] = useState('')

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Embudo de onboarding (iter.16) — antes de cualquier return
  useOnboardingTracking(paso === 1 ? 'cuenta' : paso === 2 ? 'identidad' : 'confirmacion', 'b2c', 'email', error)

  // ─── DNI handler ─────────────────────────────────────────────────────────────
  function handleDniChange(val: string) {
    const cleaned = val.replace(/\D/g, '').slice(0, 8)
    setDni(cleaned)
    if (cleaned.length === 0) {
      setDniEstado('idle')
    } else if (cleaned.length === 8) {
      setDniEstado('ok')
    } else {
      setDniEstado('err')
    }
  }

  // ─── Validaciones ────────────────────────────────────────────────────────────
  function validarPaso1(): string | null {
    if (!nombre.trim()) return 'Ingresa tu nombre completo.'
    if (!email.includes('@')) return 'Ingresa un email válido.'
    if (!telefono.trim()) return 'Ingresa tu teléfono.'
    if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
    if (!/\d/.test(password)) return 'La contraseña debe incluir al menos 1 número.'
    if (password !== passwordConfirm) return 'Las contraseñas no coinciden.'
    return null
  }

  function validarPaso2(): string | null {
    if (!esDniValido(dni)) return 'El DNI debe tener exactamente 8 dígitos.'
    return null
  }

  function handlePaso1() {
    const err = validarPaso1()
    if (err) { setError(err); return }
    setError(null); setPaso(2)
  }

  async function handleRegistrar() {
    const err = validarPaso2()
    if (err) { setError(err); return }
    setEnviando(true); setError(null)
    try {
      if (!isDemo) {
        try {
          // REG-01: el DNI se reserva como DNI_B2C_<dni>; si ya existe se aborta el alta
          await registrar(email, password, nombre, 'buyer_b2c', [claveDniB2C(dni)])
          const uid = auth.currentUser?.uid
          if (uid) {
            await setDoc(doc(db, 'one_usuarios', uid), {
              telefono,
              rol: 'buyer_b2c',
              consumidor: {
                dni,
                dirEntrega: dirEntrega.trim() || null,
                referencia: referencia.trim() || null,
              },
              updatedAt: serverTimestamp(),
            }, { merge: true })
            completarOnboarding(uid, 'buyer_b2c', 'b2c', 'email')
          }
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
          setError('No se pudo crear tu cuenta. Intenta de nuevo.')
          setEnviando(false); return
        }
      }
      setPaso('confirmacion')
    } catch {
      setError('No se pudo crear tu cuenta. Intenta de nuevo.')
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
              background: 'var(--tw-terra-muted)', border: '2px solid var(--tw-terra)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px', fontSize: 32, color: 'var(--tw-terra)',
            }}>✓</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'var(--tw-terra-muted)', border: '1px solid rgba(201,110,75,.3)', fontSize: 10, fontWeight: 700, color: 'var(--tw-terra)', marginBottom: 16 }}>
              buyer_b2c · Boleta electrónica
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: 22, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif', fontWeight: 700 }}>
              ¡Bienvenido/a!
            </h2>
            <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--tw-text-muted)' }}>{nombre}</p>
            <p style={{ margin: '0 0 20px', fontSize: 11, color: 'var(--tw-text-faint)' }}>DNI {dni} · Consumidor B2C</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a href="/" onClick={(e) => { e.preventDefault(); navigate('/') }} style={{
              display: 'block', padding: 14, borderRadius: 10, textAlign: 'center',
              background: 'var(--tw-terra)', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 700,
            }}>
              Ver cafés →
            </a>
            <a href="/portal" onClick={(e) => { e.preventDefault(); navigate('/portal') }} style={{
              display: 'block', padding: 12, borderRadius: 10, textAlign: 'center',
              background: 'none', border: '1px solid var(--tw-border)', color: 'var(--tw-text-muted)',
              textDecoration: 'none', fontSize: 13, fontWeight: 600,
            }}>
              Mi perfil →
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
        {paso === 1 ? (
          <a
            href="/login?registro=1" onClick={(e) => { e.preventDefault(); navigate('/login?registro=1') }}
            style={{ fontSize: 12, color: 'var(--tw-text-muted)', textDecoration: 'none' }}
          >
            ← Cambiar tipo
          </a>
        ) : (
          <button
            onClick={() => { setError(null); setPaso(1) }}
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
          .reg-b2c-grid { grid-template-columns: 1fr !important; }
          .reg-b2c-panel { display: none !important; }
          .reg-b2c-pass-row { grid-template-columns: 1fr !important; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="reg-b2c-grid" style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '48px 32px 80px',
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
        gap: 48,
        alignItems: 'start',
      }}>
        {/* Columna izquierda — form */}
        <div style={{ background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 16, padding: 32 }}>
          <ProgressBar paso={paso} />

          {/* ── PASO 1: Cuenta ── */}
          {paso === 1 && (
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'var(--tw-sage)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Paso 1 de 2</p>
              <h1 style={{ margin: '0 0 4px', fontSize: 24, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif', fontWeight: 700 }}>Crea tu cuenta</h1>
              <p style={{ margin: '0 0 24px', fontSize: 12, color: 'var(--tw-text-muted)' }}>Café de especialidad directo del productor. Recibe tu boleta electrónica.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Nombre completo <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                  <input type="text" placeholder="Juan Carlos Pérez Ríos" value={nombre} onChange={e => setNombre(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                  <input type="email" placeholder="juan@email.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Teléfono <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                  <input type="tel" placeholder="+51 987 654 321" value={telefono} onChange={e => setTelefono(e.target.value)} style={inputStyle} />
                </div>
                <div className="reg-b2c-pass-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login') }} style={{ color: 'var(--tw-terra)', textDecoration: 'none', fontWeight: 700 }}>Inicia sesión</a>
              </p>
            </div>
          )}

          {/* ── PASO 2: DNI + dirección ── */}
          {paso === 2 && (
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'var(--tw-sage)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Paso 2 de 2</p>
              <h1 style={{ margin: '0 0 4px', fontSize: 24, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif', fontWeight: 700 }}>DNI y dirección</h1>
              <p style={{ margin: '0 0 24px', fontSize: 12, color: 'var(--tw-text-muted)' }}>Tu DNI es requerido para la boleta electrónica. La dirección es opcional.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* DNI */}
                <div>
                  <label style={labelStyle}>DNI <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                  <input
                    type="text"
                    placeholder="12345678"
                    value={dni}
                    onChange={e => handleDniChange(e.target.value)}
                    maxLength={8}
                    style={{
                      ...inputStyle,
                      borderColor: dniEstado === 'ok' ? 'var(--tw-sage)' : dniEstado === 'err' ? '#ef4444' : 'var(--tw-border)',
                    }}
                  />
                  {dniEstado === 'ok' && <p style={{ margin: '5px 0 0', fontSize: 11, fontWeight: 600, color: 'var(--tw-sage)' }}>✓ DNI válido</p>}
                  {dniEstado === 'err' && <p style={{ margin: '5px 0 0', fontSize: 11, fontWeight: 600, color: '#ef4444' }}>✗ El DNI debe tener exactamente 8 dígitos</p>}
                  <p style={{ margin: '4px 0 0', fontSize: 9, color: 'var(--tw-text-faint)' }}>8 dígitos numéricos. No se requiere consulta externa.</p>
                </div>

                {/* Dirección de entrega */}
                <div>
                  <label style={labelStyle}>
                    Dirección de entrega{' '}
                    <span style={{ color: 'var(--tw-text-faint)', fontWeight: 400, textTransform: 'none', fontSize: 9 }}>(opcional)</span>
                  </label>
                  <input type="text" placeholder="Av. Larco 1301, Miraflores" value={dirEntrega} onChange={e => setDirEntrega(e.target.value)} style={inputStyle} />
                  <p style={{ margin: '4px 0 0', fontSize: 9, color: 'var(--tw-text-faint)' }}>Puedes agregar hasta 3 direcciones favoritas desde tu perfil.</p>
                </div>

                {/* Referencia */}
                <div>
                  <label style={labelStyle}>
                    Referencia{' '}
                    <span style={{ color: 'var(--tw-text-faint)', fontWeight: 400, textTransform: 'none', fontSize: 9 }}>(opcional)</span>
                  </label>
                  <input type="text" placeholder="Edificio azul, piso 4" value={referencia} onChange={e => setReferencia(e.target.value)} style={inputStyle} />
                </div>

                {/* Banner info */}
                <div style={{ background: 'var(--tw-sage-muted)', border: '1px solid rgba(143,175,138,.2)', borderRadius: 9, padding: 12, fontSize: 11, color: 'var(--tw-sage)', lineHeight: 1.6 }}>
                  ☕ Como <strong>comprador B2C</strong> recibirás <strong>boleta electrónica</strong> en cada pedido. Acceso al catálogo de cafés tostados (lotes TYPE_B y TYPE_C).
                </div>
              </div>

              {error && <p style={{ margin: '12px 0 0', padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', fontSize: 12, color: '#ef4444' }}>{error}</p>}

              <button onClick={handleRegistrar} disabled={enviando} style={{ marginTop: 22, width: '100%', padding: 14, borderRadius: 10, background: enviando ? 'var(--tw-text-faint)' : 'var(--tw-terra)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: enviando ? 'not-allowed' : 'pointer' }}>
                {enviando ? 'Creando cuenta...' : 'Crear cuenta →'}
              </button>
              <button
                onClick={() => {
                  // GAP-F01-12: antes saltaba a la confirmación SIN crear la cuenta ni reservar el DNI.
                  // La dirección es opcional (se pide en el checkout): registrar igual (valida el DNI).
                  void handleRegistrar()
                }}
                disabled={enviando}
                style={{ marginTop: 8, width: '100%', padding: 12, borderRadius: 10, background: 'none', border: 'none', color: 'var(--tw-text-faint)', fontSize: 12, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
              >
                Omitir dirección por ahora →
              </button>
            </div>
          )}
        </div>

        {/* Panel derecho */}
        <div className="reg-b2c-panel">
          <PanelDerecho tipo="b2c" />
        </div>
      </div>
    </div>
  )
}

export default RegistroConsumidor
