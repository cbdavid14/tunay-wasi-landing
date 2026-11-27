/**
 * AuthScreen.tsx — Login para TunayWasi ONE
 * Opciones: Google Sign-In + Email/Password
 */
import React, { useState, useEffect, useRef } from 'react'
import { navigate } from '@/router'
import { loginConGoogle, login, registrar, resetPassword } from '../authService'
import { fetchUsuario } from '../service'
import type { RolONE } from '../types'
import { track, setAnalyticsUser } from '../analytics'
import { completarOnboarding, EVENTO_PERFIL_ACTUALIZADO, useOnboardingTracking, type FlujoOnboarding, type PasoOnboarding } from '../onboarding'
import { irTrasAcceso, limpiarConfirmacion, marcarConfirmacionPendiente, textoBotonTrasRegistro } from '../retorno'
import { claveDniB2C, claveDniSeller, claveRuc, errorFormatoRuc, esDniValido, esDocumentoDuplicado, reservarDocumentos } from '../documentos'

type Paso = 'inicio' | 'email_login' | 'email_registro' | 'reset' | 'seleccion_rol' | 'seleccion_rol_registro' | 'cuenta_email' | 'seleccion_tipo_cliente' | 'datos_persona' | 'datos_negocio' | 'registro_caficultor' | 'registro_caficultor_finca' | 'registro_caficultor_identidad' | 'verifica_correo' | 'cargando' | 'cargando_cuenta' | 'abriendo_google' | 'google_loading'

interface Props {
  onSuccess?: () => void
  mensajePrevia?: string
  pasoInicial?: Paso
  /** BUG-REG-04: hay sesión con perfil `seller` sin bloque `caficultor` (alta a medias) → completar Finca + Identidad. */
  completarSeller?: boolean
}

const GOOGLE_PENDING_KEY = 'one_google_pending_registro'

function leerGooglePending() {
  try {
    const raw = sessionStorage.getItem(GOOGLE_PENDING_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as { uid?: string; nombre?: string; email?: string } | null
    // Un pending sin uid o sin email no es un alta Google válida: se descarta para que
    // no deje al usuario nuevo en modo "Google" (email bloqueado / vacío).
    if (!p || !p.uid || !p.email || !p.email.includes('@')) { limpiarGooglePending(); return null }
    return { uid: p.uid, nombre: p.nombre ?? '', email: p.email }
  } catch { return null }
}

function guardarGooglePending(uid: string, nombre: string, email: string) {
  try { sessionStorage.setItem(GOOGLE_PENDING_KEY, JSON.stringify({ uid, nombre, email })) } catch { /* ok */ }
}

function limpiarGooglePending() {
  try { sessionStorage.removeItem(GOOGLE_PENDING_KEY) } catch { /* ok */ }
}

const AuthScreen: React.FC<Props> = ({ mensajePrevia, pasoInicial = 'inicio', completarSeller = false }) => {
  // Si hay datos de Google pending en sessionStorage (sobreviven el remount de onAuthStateChanged),
  // restauramos automáticamente el paso de selección de rol
  const googlePendingGuardado = leerGooglePending()
  const pasoRestaurado: Paso = completarSeller ? 'registro_caficultor_finca'
    : googlePendingGuardado ? 'seleccion_rol_registro' : (pasoInicial ?? 'inicio')

  const [paso, setPaso] = useState<Paso>(pasoRestaurado)
  const [error, setError] = useState<string | null>(null)
  const [resetEnviado, setResetEnviado] = useState(false)

  // Google pending — se inicializa desde sessionStorage si el componente se remontó
  const [pendingUid, setPendingUid] = useState<string | null>(googlePendingGuardado?.uid ?? null)
  const [pendingNombre, setPendingNombre] = useState(googlePendingGuardado?.nombre ?? '')
  const [pendingEmail, setPendingEmail] = useState(googlePendingGuardado?.email ?? '')

  const [rolRegistro, setRolRegistro] = useState<RolONE>('buyer_b2c')
  // Para Google: si el usuario escoge "Cliente" primero, guardamos el uid y pasamos a seleccion_tipo_cliente
  const [googlePendingTipo, setGooglePendingTipo] = useState(!!googlePendingGuardado)
  // El email solo se bloquea si viene verificado por Google en ESTE alta (uid + email reales).
  const emailBloqueadoGoogle = googlePendingTipo && !!pendingUid && pendingEmail.includes('@')

  // Pending de Google rancio (sesión cerrada u otra cuenta): se descarta y se vuelve al alta por email.
  useEffect(() => {
    if (!googlePendingGuardado) return
    let cancelado = false
    let unsub: (() => void) | undefined
    import('@/shared/firebase').then(({ auth }) => {
      if (cancelado) return
      unsub = auth.onAuthStateChanged(user => {
        if (user && user.uid === googlePendingGuardado.uid) return
        limpiarGooglePending()
        setGooglePendingTipo(false)
        setPendingUid(null)
        setPendingNombre('')
        setPendingEmail('')
      })
    }).catch(() => { /* ok */ })
    return () => { cancelado = true; unsub?.() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // BUG-REG-04: si AppONE detecta un seller a medias con este AuthScreen ya montado (p. ej. tras
  // "Ingresar"), se salta a Finca: la cuenta ya existe, solo falta completar el perfil.
  useEffect(() => {
    if (!completarSeller) return
    setRolRegistro('seller')
    setPaso(p => (p === 'registro_caficultor_finca' || p === 'registro_caficultor_identidad' || p === 'cargando_cuenta') ? p : 'registro_caficultor_finca')
  }, [completarSeller])

  // ── Embudo de onboarding (iter.16) — antes de cualquier return (rules of hooks) ──
  const PASO_ONBOARDING: Partial<Record<Paso, PasoOnboarding>> = {
    inicio: 'bienvenida', email_login: 'email_login', email_registro: 'cuenta',
    seleccion_rol: 'quien_eres', seleccion_rol_registro: 'quien_eres', seleccion_tipo_cliente: 'selector_tipo',
    cuenta_email: 'cuenta', datos_persona: 'identidad', datos_negocio: 'empresa',
    registro_caficultor: 'cuenta', registro_caficultor_finca: 'finca', registro_caficultor_identidad: 'identidad',
    verifica_correo: 'confirmacion',
  }
  const flujoDeRol = (r: RolONE): FlujoOnboarding => r === 'buyer_b2b' ? 'b2b' : r === 'seller' ? 'caficultor' : 'b2c'
  const flujoOnb: FlujoOnboarding =
    paso === 'datos_persona' ? 'b2c'
    : paso === 'datos_negocio' ? 'b2b'
    : paso.startsWith('registro_caficultor') ? 'caficultor'
    : (paso === 'cuenta_email' || paso === 'email_registro' || paso === 'verifica_correo') ? flujoDeRol(rolRegistro)
    : 'desconocido'
  const metodoOnb = (pendingUid || googlePendingTipo) ? 'google' as const : 'email' as const
  useOnboardingTracking(PASO_ONBOARDING[paso] ?? null, flujoOnb, metodoOnb, error)

  // Email form
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')   // BUG-REG-05
  const [cargando, setCargando] = useState(false)

  // Datos adicionales post-registro
  const [dni, setDni] = useState('')
  const [dniEstado, setDniEstado] = useState<'idle' | 'ok'>('idle')
  const [telefono, setTelefono] = useState('')
  const [ruc, setRuc] = useState('')
  const [rucEstado, setRucEstado] = useState<'idle' | 'checking' | 'ok' | 'err'>('idle')
  const [razonSocial, setRazonSocial] = useState('')

  // Datos finca caficultor
  const [fincaRegion, setFincaRegion] = useState('')
  const [fincaDistrito, setFincaDistrito] = useState('')
  const [fincaAltitud, setFincaAltitud] = useState('')
  const [fincaKg, setFincaKg] = useState('')
  const [fincaVariedad, setFincaVariedad] = useState('')
  const [fincaProceso, setFincaProceso] = useState('')
  const [cafDni, setCafDni] = useState('')
  const [cafDniEstado, setCafDniEstado] = useState<'idle' | 'ok'>('idle')
  const [cafYape, setCafYape] = useState('')

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '10px 12px', borderRadius: 8,
    border: '1px solid #2a2a2a',
    fontSize: 12, fontFamily: 'Montserrat, sans-serif',
    color: '#f2e0cc', background: '#1a1a1a',
    outline: 'none', marginBottom: 14,
  }

  function traducirError(code: string): string {
    const map: Record<string, string> = {
      'auth/user-not-found': 'No encontramos una cuenta con ese email.',
      'auth/wrong-password': 'Contraseña incorrecta.',
      'auth/email-already-in-use': 'Ya existe una cuenta con ese email.',
      'auth/invalid-email': 'El email no es válido.',
      'auth/weak-password': 'La contraseña debe tener al menos 8 caracteres e incluir 1 número.',
      'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
      'auth/invalid-credential': 'Email o contraseña incorrectos.',
    }
    return map[code] ?? 'Ocurrió un error. Intenta de nuevo.'
  }

  // Destino tras login: regla única compartida con AppONE (carrito → returnTo → portal del rol)
  function redirigirSegunRol(rol: RolONE) {
    irTrasAcceso(rol, false)
  }

  // ── Google ──────────────────────────────────────────────────────────────────

  // Ref para lanzar el popup — se activa cuando handleGoogle setea paso='abriendo_google'
  const googleTriggerRef = useRef(false)

  // Paso 1: click → muestra abriendo_google (React pinta la pantalla)
  function handleGoogle() {
    setError(null)
    googleTriggerRef.current = true
    setPaso('abriendo_google')
  }

  // Paso 2: useEffect se dispara en cada render; cuando ve el trigger activo, lanza el popup
  useEffect(() => {
    if (!googleTriggerRef.current) return
    googleTriggerRef.current = false  // consumir el trigger — no volver a correr
    setCargando(true)
    loginConGoogle().then(async ({ uid, esNuevo, nombre: nb, email: em }) => {
      // Guardar pending sin ninguna condición — onAuthStateChanged puede desmontar
      // este componente en cualquier momento y el nuevo AuthScreen necesita estos datos.
      if (esNuevo) {
        guardarGooglePending(uid, nb, em)
        setPendingUid(uid)
        setPendingNombre(nb)
        setPendingEmail(em)
        setGooglePendingTipo(true)
      }
      // google_loading — mínimo 1.5s
      setPaso('google_loading')
      await new Promise(r => setTimeout(r, 1500))
      // cargando_cuenta — mínimo 1s
      setPaso('cargando_cuenta')
      const minDelay = new Promise(r => setTimeout(r, 1000))
      if (esNuevo) {
        await minDelay
        setPaso('seleccion_rol_registro')
      } else {
        const [u] = await Promise.all([fetchUsuario(uid), minDelay])
        setAnalyticsUser(uid, u.rol)
        track('login_exitoso', { rolUsuario: u.rol })
        redirigirSegunRol(u.rol)
      }
    }).catch((e: unknown) => {
      const code = (e as { code?: string }).code ?? ''
      console.error('[AuthScreen] Google login error:', code, e)
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setPaso('inicio'); return
      }
      setError(traducirError(code))
      setPaso('inicio')
    }).finally(() => {
      setCargando(false)
    })
  }) // sin dep array — corre en cada render, pero el trigger lo controla


  // ── Email/Password ───────────────────────────────────────────────────────────

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setCargando(true)
    try {
      await login(email, password)
      const { auth } = await import('@/shared/firebase')
      const currentUser = auth.currentUser
      if (!currentUser) { navigate('/portal'); return }
      // TODO: re-enable email verification before launch
      // if (!currentUser.emailVerified) {
      //   setError('Debes verificar tu correo antes de ingresar. Revisa tu bandeja de entrada.')
      //   await import('@/shared/firebase').then(m => m.auth.signOut())
      //   setCargando(false)
      //   return
      // }
      const u = await fetchUsuario(currentUser.uid)
      setAnalyticsUser(currentUser.uid, u.rol)
      track('login_exitoso', { rolUsuario: u.rol })
      redirigirSegunRol(u.rol)
    } catch (e: unknown) {
      setError(traducirError((e as { code?: string }).code ?? ''))
    } finally {
      setCargando(false)
    }
  }

  async function handleEmailRegistro(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) { setError('Ingresa tu nombre.'); return }
    setError(null)
    setCargando(true)
    if (rolRegistro !== 'seller') marcarConfirmacionPendiente()   // antes de crear la cuenta: AppONE no redirige
    setPaso('cargando_cuenta')
    try {
      await registrar(email, password, nombre.trim(), rolRegistro)
      const { auth } = await import('@/shared/firebase')
      const uid = auth.currentUser?.uid
      if (uid) { setAnalyticsUser(uid, rolRegistro) }
      if (rolRegistro === 'seller') {
        setPaso('registro_caficultor_finca')
      } else {
        completarOnboarding(uid ?? '', rolRegistro, flujoDeRol(rolRegistro), 'email')
        marcarConfirmacionPendiente()
        setPaso('verifica_correo')
      }
    } catch (e: unknown) {
      limpiarConfirmacion()
      setError(traducirError((e as { code?: string }).code ?? ''))
      setPaso('registro_caficultor')
    } finally {
      setCargando(false)
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setCargando(true)
    try {
      await resetPassword(email)
      setResetEnviado(true)
    } catch (e: unknown) {
      setError(traducirError((e as { code?: string }).code ?? ''))
    } finally {
      setCargando(false)
    }
  }

  function simDNI(valor: string) {
    setDni(valor)
    setDniEstado(valor.length === 8 ? 'ok' : 'idle')
  }

  function simRUC(valor: string) {
    setRuc(valor)
    setRucEstado('idle')
    setRazonSocial('')
    if (valor.length === 11) {
      // REG-04: formato + dígito verificador antes de consultar SUNAT
      if (errorFormatoRuc(valor, ['10', '20'])) { setRucEstado('err'); return }
      setRucEstado('checking')
      setTimeout(() => {
        if (valor === '20000000001') {
          setRucEstado('err')
        } else if (valor === '20601234565') {
          setRucEstado('ok')
          setRazonSocial('CAFÉ EL ORIGEN S.A.C.')
        } else {
          setRucEstado('ok')
          setRazonSocial('EMPRESA DEMO S.A.C.')
        }
      }, 900)
    }
  }

  async function guardarDatosPersona(uid: string) {
    const { db } = await import('@/shared/firebase')
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
    await setDoc(doc(db, 'one_usuarios', uid), {
      telefono: telefono.trim(),
      consumidor: { dni },
      updatedAt: serverTimestamp(),
    }, { merge: true })
  }

  async function guardarDatosEmpresa(uid: string) {
    const { db } = await import('@/shared/firebase')
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
    await setDoc(doc(db, 'one_usuarios', uid), {
      empresa: {
        ruc,
        razonSocial: razonSocial.trim(),
        dirFiscal: '',
        dirEnvio: '',
        estadoAprobacion: 'PENDING_APPROVAL',
        solicitudAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    }, { merge: true })
  }

  async function completarConDatosPersona() {
    if (dniEstado !== 'ok' || !esDniValido(dni)) { setError('Ingresa un DNI válido de 8 dígitos.'); return }
    if (!telefono.trim()) { setError('Ingresa tu número de teléfono.'); return }
    setError(null)
    marcarConfirmacionPendiente()   // antes de crear la cuenta: AppONE no redirige
    setPaso('cargando_cuenta')
    try {
      if (googlePendingTipo && pendingUid) {
        // REG-01: reservar DNI antes de crear el perfil (si está duplicado no se crea nada)
        await reservarDocumentos(pendingUid, 'buyer_b2c', [claveDniB2C(dni)])
        const { completarRegistroGoogle } = await import('../authService')
        await completarRegistroGoogle(pendingUid, pendingNombre, pendingEmail, 'buyer_b2c')
        await guardarDatosPersona(pendingUid)
        limpiarGooglePending()
        setAnalyticsUser(pendingUid, 'buyer_b2c')
        completarOnboarding(pendingUid, 'buyer_b2c', 'b2c', 'google')
        try { localStorage.setItem('one_portal_badge', '1') } catch { /* ok */ }
        setRolRegistro('buyer_b2c')
        marcarConfirmacionPendiente()
        setPaso('verifica_correo')        // antes '/catalogo' (ruta inexistente); ahora "¡Bienvenido/a!"
      } else {
        await registrar(email, password, nombre.trim(), 'buyer_b2c', [claveDniB2C(dni)])
        const { auth } = await import('@/shared/firebase')
        const uid = auth.currentUser?.uid
        if (uid) { await guardarDatosPersona(uid); setAnalyticsUser(uid, 'buyer_b2c') }
        completarOnboarding(uid ?? '', 'buyer_b2c', 'b2c', 'email')
        marcarConfirmacionPendiente()
        setPaso('verifica_correo')
      }
    } catch (e: unknown) {
      limpiarConfirmacion()
      setError(esDocumentoDuplicado(e) ? e.message : traducirError((e as { code?: string }).code ?? ''))
      setPaso('datos_persona')
    } finally {
      setCargando(false)
    }
  }

  async function completarConDatosNegocio() {
    const errRuc = errorFormatoRuc(ruc, ['10', '20'])
    if (errRuc) { setError(errRuc); return }
    if (rucEstado !== 'ok') { setError('Ingresa un RUC válido y verificado.'); return }
    if (!razonSocial.trim()) { setError('La razón social es requerida.'); return }
    setError(null)
    marcarConfirmacionPendiente()   // antes de crear la cuenta: AppONE no redirige
    setPaso('cargando_cuenta')
    try {
      if (googlePendingTipo && pendingUid) {
        // REG-02: reservar RUC antes de crear el perfil
        await reservarDocumentos(pendingUid, 'buyer_b2b', [claveRuc(ruc)])
        const { completarRegistroGoogle } = await import('../authService')
        await completarRegistroGoogle(pendingUid, pendingNombre, pendingEmail, 'buyer_b2b')
        // Guardar empresa — completarRegistroGoogle solo crea negocio, no empresa
        await guardarDatosEmpresa(pendingUid)
        limpiarGooglePending()
        setAnalyticsUser(pendingUid, 'buyer_b2b')
        completarOnboarding(pendingUid, 'buyer_b2b', 'b2b', 'google')
        try { localStorage.setItem('one_portal_badge', '1') } catch { /* ok */ }
        setRolRegistro('buyer_b2b')
        marcarConfirmacionPendiente()
        setPaso('verifica_correo')        // antes '/catalogo' (ruta inexistente); ahora "¡Bienvenido/a!"
      } else {
        await registrar(email, password, nombre.trim(), 'buyer_b2b', [claveRuc(ruc)])
        const { auth } = await import('@/shared/firebase')
        const uid = auth.currentUser?.uid
        // B2B-01: el flujo email no guardaba empresa ni PENDING_APPROVAL
        if (uid) { await guardarDatosEmpresa(uid); setAnalyticsUser(uid, 'buyer_b2b') }
        completarOnboarding(uid ?? '', 'buyer_b2b', 'b2b', 'email')
        marcarConfirmacionPendiente()
        setPaso('verifica_correo')
      }
    } catch (e: unknown) {
      limpiarConfirmacion()
      setError(esDocumentoDuplicado(e) ? e.message : traducirError((e as { code?: string }).code ?? ''))
      setPaso('datos_negocio')
    } finally {
      setCargando(false)
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const heroBg = 'linear-gradient(160deg, #1a0f0a 0%, #2d1408 40%, #1a1208 80%, #0d1a0d 100%)'
  const heroBgLogin = 'linear-gradient(160deg, #1a0f0a 0%, #2d1408 40%, #1a1208 80%, #0d1a0d 100%)'
  const heroBgQuienEres = 'linear-gradient(160deg, #1a0f0a 0%, #2d1408 40%, #1a1208 80%, #0d1a0d 100%)'

  type HeroConfig = {
    emoji: string
    title: string
    sub: string
    bg: string
    features: { icon: string; title: string; desc: string; accentSage?: boolean }[]
  }

  const heroConfigs: Record<string, HeroConfig> = {
    inicio: {
      emoji: '☕',
      title: 'Café peruano\nde origen.',
      sub: 'Compra directamente al caficultor. Trazabilidad completa, escrow seguro y facturación automática.',
      bg: heroBg,
      features: [
        { icon: '🌱', title: 'Trazabilidad completa', desc: 'Finca · variedad · cosecha · altitud.' },
        { icon: '🔒', title: 'Escrow seguro', desc: 'Tu pago liberado solo tras confirmar entrega.' },
        { icon: '🧾', title: 'Facturación automática', desc: 'Boleta o factura según tu tipo de cuenta.' },
        { icon: '☕', title: 'Café de especialidad', desc: 'Café verde, tostado y molido.' },
      ],
    },
    login: {
      emoji: '🔐',
      title: 'Bienvenido\nde vuelta.',
      sub: 'Accede a tu catálogo, gestiona pedidos y conecta con caficultores de origen.',
      bg: heroBgLogin,
      features: [],
    },
    quien_eres: {
      emoji: '🧑',
      title: '¿Quién\neres?',
      sub: 'Cuéntanos cómo usarás TunayWasi para configurar tu cuenta correctamente.',
      bg: heroBgQuienEres,
      features: [
        { icon: '☕', title: 'Soy Cliente', desc: 'Persona, cafetería, restaurante o empresa. Compra café directo al productor.' },
        { icon: '🌱', title: 'Soy Productor', desc: 'Caficultor peruano. Publica tus lotes y recibe pagos directamente.', accentSage: true },
      ],
    },
    cargando: {
      emoji: '☕',
      title: 'Configurando\ntu cuenta…',
      sub: 'Un momento, estamos creando tu perfil en TunayWasi.',
      bg: heroBg,
      features: [],
    },
    abriendo_google: {
      emoji: '🔐',
      title: 'Verificando tu\nperfil de Google.',
      sub: 'Se abrirá una ventana para que selecciones tu cuenta de Google. Espera un momento.',
      bg: heroBg,
      features: [
        { icon: '🔒', title: 'Conexión segura', desc: 'OAuth 2.0 cifrado de extremo a extremo.' },
        { icon: '⚡', title: 'Acceso rápido', desc: 'Sin contraseñas que recordar.' },
      ],
    },
    google_loading: {
      emoji: '🔐',
      title: 'Volviste de Google\ncon éxito.',
      sub: 'Tu cuenta de Google fue verificada. Estamos confirmando tu identidad en TunayWasi…',
      bg: heroBg,
      features: [
        { icon: '✅', title: 'Cuenta verificada', desc: 'Google confirmó tu identidad correctamente.' },
        { icon: '🔒', title: 'Sesión segura', desc: 'Conexión OAuth 2.0 cifrada de extremo a extremo.' },
        { icon: '⚡', title: 'Acceso inmediato', desc: 'En segundos podrás configurar tu perfil.' },
      ],
    },
    registro_caficultor: {
      emoji: '🌱',
      title: 'Tu café,\ntu precio.',
      sub: 'Conectamos tu lote directamente con cafeterías peruanas que buscan café de especialidad.',
      bg: 'linear-gradient(160deg, #1f3028 0%, #0f1a14 100%)',
      features: [
        { icon: '💰', title: 'Tú fijas el precio', desc: 'Ingresa tus costos y elige tu margen.', accentSage: true },
        { icon: '🌿', title: 'Sin comisión en fase 1', desc: 'Mientras validamos el modelo, el 100% es tuyo.', accentSage: true },
        { icon: '📊', title: 'Dashboard de pedidos', desc: 'Gestiona stock, despachos y pagos.', accentSage: true },
      ],
    },
    selector_tipo: {
      emoji: '☕',
      title: '¿Cómo\ncompras?',
      sub: 'Elige el tipo de cuenta que mejor describe cómo adquieres el café.',
      bg: heroBg,
      features: [
        { icon: '🧑', title: 'Persona', desc: 'Compra para consumo personal. Solo necesitas tu DNI.' },
        { icon: '🏢', title: 'Negocio', desc: 'Cafetería, restaurante o empresa. Factura electrónica y precios al por mayor.', accentSage: true },
      ],
    },
  }

  function getHeroKey(): string {
    if (paso === 'email_login' || paso === 'reset') return 'login'
    if (paso === 'seleccion_rol_registro' || paso === 'email_registro' || paso === 'cuenta_email') return 'quien_eres'
    if (paso === 'seleccion_tipo_cliente' || paso === 'datos_persona' || paso === 'datos_negocio') return 'selector_tipo'
    if (paso === 'registro_caficultor' || paso === 'registro_caficultor_finca' || paso === 'registro_caficultor_identidad') return 'registro_caficultor'
    if (paso === 'abriendo_google') return 'abriendo_google'
    if (paso === 'google_loading') return 'google_loading'
    if (paso === 'cargando_cuenta') return 'cargando'
    return 'inicio'
  }

  const heroSidebar = (configKey?: string) => {
    const key = configKey ?? getHeroKey()
    const cfg = heroConfigs[key] ?? heroConfigs.inicio
    return (
      <div style={{
        flex: '0 0 420px', background: cfg.bg,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center', textAlign: 'center',
        padding: '40px 32px', position: 'relative', overflow: 'hidden',
        borderRight: '1px solid rgba(255,255,255,0.07)',
      }}>
        {/* Decorative glows */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 30% 40%, rgba(201,110,75,0.15) 0%, transparent 60%), radial-gradient(circle at 70% 70%, rgba(143,175,138,0.1) 0%, transparent 50%)', pointerEvents: 'none' }} />

        <div style={{ fontSize: 56, marginBottom: 24, filter: 'drop-shadow(0 4px 12px rgba(201,110,75,0.4))', position: 'relative', zIndex: 1 }}>{cfg.emoji}</div>
        <h1 style={{ margin: '0 0 10px', fontSize: 28, fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, color: '#f2e0cc', lineHeight: 1.2, position: 'relative', zIndex: 1, whiteSpace: 'pre-line' }}>
          {cfg.title}
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: 11, color: '#a09080', lineHeight: 1.7, position: 'relative', zIndex: 1 }}>
          {cfg.sub}
        </p>

        {cfg.features.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', position: 'relative', zIndex: 1 }}>
            {cfg.features.map(item => (
              <div key={item.icon} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left',
                background: item.accentSage ? 'rgba(143,175,138,0.06)' : 'rgba(201,110,75,0.08)',
                borderRadius: 8,
                border: `1px solid ${item.accentSage ? 'rgba(143,175,138,0.25)' : 'rgba(201,110,75,0.15)'}`,
                padding: '9px 12px',
              }}>
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#f2e0cc', marginBottom: 1 }}>{item.title}</div>
                  <div style={{ fontSize: 10, color: '#a09080', lineHeight: 1.4 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const googleSvg = (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )

  // ── Render ───────────────────────────────────────────────────────────────────

  // Mobile: full gradient fullscreen
  if (typeof window !== 'undefined' && window.innerWidth < 768 && (paso === 'inicio' || paso === 'cargando' || paso === 'cargando_cuenta' || paso === 'abriendo_google' || paso === 'google_loading')) {
    if (paso === 'cargando_cuenta') {
      return (
        <div style={{ minHeight: '100vh', background: heroBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 28px 32px', fontFamily: 'Montserrat, sans-serif' }}>
          <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#c96e4b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 20, boxShadow: '0 3px 12px rgba(201,110,75,0.5)' }}>
            {nombre ? nombre.trim().charAt(0).toUpperCase() : '?'}
          </div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700, color: '#f2e0cc', marginBottom: 8, textAlign: 'center' }}>Creando tu cuenta…</div>
          <div style={{ fontSize: 11, color: '#666', textAlign: 'center', marginBottom: 28, lineHeight: 1.5 }}>Configurando tu perfil en TunayWasi</div>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #2a2a2a', borderTopColor: '#c96e4b', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )
    }
    if (paso === 'abriendo_google') {
      return (
        <div style={{ minHeight: '100vh', background: heroBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 28px 32px', fontFamily: 'Montserrat, sans-serif' }}>
          <div style={{ width: 60, height: 60, borderRadius: 14, background: 'linear-gradient(135deg,#4285F4 0%,#34A853 33%,#FBBC05 66%,#EA4335 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 24, boxShadow: '0 3px 14px rgba(66,133,244,0.4)' }}>G</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f2e0cc', marginBottom: 8 }}>Abriendo Google…</div>
          <div style={{ fontSize: 11, color: '#666', lineHeight: 1.6, maxWidth: 200, textAlign: 'center', marginBottom: 24 }}>Se abrirá una ventana para que selecciones tu cuenta de Google.</div>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #2a2a2a', borderTopColor: '#4285F4', animation: 'spin 0.9s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )
    }
    if (paso === 'google_loading') {
      return (
        <div style={{ minHeight: '100vh', background: heroBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 28px 32px', fontFamily: 'Montserrat, sans-serif' }}>
          <div style={{ width: 60, height: 60, borderRadius: 14, background: 'linear-gradient(135deg,#4285F4 0%,#34A853 33%,#FBBC05 66%,#EA4335 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 20, boxShadow: '0 3px 14px rgba(66,133,244,0.4)' }}>G</div>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #2a2a2a', borderTopColor: '#4285F4', animation: 'spin 0.9s linear infinite', marginBottom: 20 }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f2e0cc', marginBottom: 6 }}>Verificando…</div>
          <div style={{ fontSize: 10, color: '#666', lineHeight: 1.6, maxWidth: 200, textAlign: 'center' }}>Tu cuenta de Google fue confirmada. Preparando tu perfil.</div>
          <div style={{ display: 'flex', gap: 5, marginTop: 20 }}>
            {['#4285F4','#34A853','#FBBC05','#EA4335'].map((c, i) => (
              <div key={c} style={{ width: 6, height: 6, borderRadius: '50%', background: c, animation: `gldot 1.2s ease-in-out ${i*0.2}s infinite` }} />
            ))}
          </div>
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes gldot { 0%,80%,100% { transform: scale(0.6); opacity: 0.5; } 40% { transform: scale(1); opacity: 1; } }
          `}</style>
        </div>
      )
    }
    return (
      <div style={{ minHeight: '100vh', background: heroBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '48px 28px 32px', fontFamily: 'Montserrat, sans-serif' }}>
        {/* Logo — tercio superior */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 14, filter: 'drop-shadow(0 4px 16px rgba(201,110,75,0.6))' }}>☕</div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32, fontWeight: 700, color: '#f2e0cc', marginBottom: 5, letterSpacing: '0.03em' }}>Tunay <span style={{ color: '#f2e0cc' }}>·</span> <span style={{ color: '#c96e4b' }}>Wasi</span></div>
          <div style={{ fontSize: 9, color: '#9e7d60', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>Café de origen, directo al comprador</div>
          <div style={{ fontSize: 11, color: '#a08060', textAlign: 'center', lineHeight: 1.6, maxWidth: 220 }}>Compra café de origen directo al productor peruano</div>
          {mensajePrevia && (
            <div style={{ marginTop: 20, background: 'rgba(201,110,75,0.15)', border: '1px solid rgba(201,110,75,0.3)', borderRadius: 10, padding: '12px 16px', maxWidth: 320 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#f2e0cc', lineHeight: 1.5 }}>{mensajePrevia}</p>
            </div>
          )}
          {error && <p style={{ marginTop: 16, color: '#f87171', fontSize: 13 }}>{error}</p>}
        </div>

        {/* Acciones — zona del pulgar */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {paso === 'cargando' ? (
            <p style={{ textAlign: 'center', color: 'rgba(245,237,226,0.5)', fontSize: 14 }}>Cargando...</p>
          ) : (
            <>
              <button onClick={handleGoogle} style={{
                width: '100%', padding: '13px 0', borderRadius: 10,
                border: 'none', background: '#fff', color: '#1a1a1a',
                fontSize: 12, fontWeight: 700, fontFamily: 'Montserrat, sans-serif',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
              }}>
                {googleSvg}
                Continuar con Google
              </button>

              <button onClick={() => { setError(null); setPaso('seleccion_rol_registro') }} style={{
                width: '100%', padding: '13px 0', borderRadius: 10,
                border: 'none', background: '#c96e4b',
                color: '#fff', fontSize: 12, fontWeight: 700,
                fontFamily: 'Montserrat, sans-serif', cursor: 'pointer',
              }}>
                Registrarme →
              </button>

              <button onClick={() => { setError(null); setPaso('email_login') }} style={{
                width: '100%', padding: '12px 0', borderRadius: 10,
                border: '1px solid rgba(242,224,204,0.2)', background: 'rgba(242,224,204,0.08)',
                color: '#f2e0cc', fontSize: 11, fontWeight: 600,
                fontFamily: 'Montserrat, sans-serif', cursor: 'pointer',
              }}>
                ¿Ya tienes cuenta? Ingresar
              </button>
            </>
          )}
          <p style={{ fontSize: 9, color: '#555', textAlign: 'center', lineHeight: 1.6, paddingTop: 2 }}>
            Al continuar aceptas los <span style={{ color: '#c96e4b', textDecoration: 'underline' }}>términos de uso</span> de TunayWasi
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--tw-bg)', fontFamily: 'Montserrat, sans-serif', display: 'flex' }}>

      {/* ── Hero sidebar — siempre presente en desktop, oculto en mobile ── */}
      <div className="tw-auth-hero" style={{ display: 'none' }}>
        {heroSidebar()}
      </div>
      <style>{`
        @media (min-width: 768px) {
          .tw-auth-hero { display: flex !important; flex: 0 0 420px; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes gldot { 0%,80%,100% { transform: scale(0.6); opacity: 0.5; } 40% { transform: scale(1); opacity: 1; } }
      `}</style>

      {/* ── Panel derecho — toda la lógica de pasos ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', minHeight: '100vh', overflowY: 'auto' }}>

        {/* ── Inicio ── */}
        {paso === 'inicio' && (
          <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 38, fontWeight: 700, color: 'var(--tw-text)', letterSpacing: '0.02em', marginBottom: 4 }}>
                Tunay <span style={{ color: 'var(--tw-text)' }}>·</span> <span style={{ color: 'var(--tw-terra)' }}>Wasi</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--tw-text-muted)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Café de origen, directo al comprador</div>
            </div>
            {mensajePrevia && (
              <div style={{ background: 'rgba(201,110,75,0.1)', border: '1px solid rgba(201,110,75,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, width: '100%' }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--tw-text)', lineHeight: 1.5 }}>{mensajePrevia}</p>
              </div>
            )}
            {error && <p style={{ color: '#f87171', fontSize: 12, marginBottom: 16, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 8, width: '100%' }}>{error}</p>}
            <button onClick={handleGoogle} disabled={cargando} style={{ width: '100%', padding: '12px 24px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.12)', background: '#fff', color: '#1a1a1a', fontSize: 13, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', cursor: cargando ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.18)', marginBottom: 20, opacity: cargando ? 0.7 : 1 }}>
              {cargando ? <span style={{ fontSize: 11 }}>Abriendo Google…</span> : <>{googleSvg}Continuar con Google</>}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, width: '100%' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--tw-border)' }} />
              <span style={{ fontSize: 10, color: 'var(--tw-text-muted)', fontWeight: 600 }}>O</span>
              <div style={{ flex: 1, height: 1, background: 'var(--tw-border)' }} />
            </div>
            <button onClick={() => { setError(null); setPaso('email_login') }} style={{ width: '100%', padding: '12px 24px', borderRadius: 10, border: '1px solid var(--tw-border)', background: 'transparent', color: 'var(--tw-text)', fontSize: 12, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
              📧 Continuar con Email
            </button>
            <p style={{ fontSize: 11, color: 'var(--tw-text-muted)', textAlign: 'center', lineHeight: 1.6, marginBottom: 16 }}>
              ¿No tienes cuenta?{' '}
              <button onClick={() => { setError(null); setPaso('seleccion_rol_registro') }} style={{ background: 'none', border: 'none', color: 'var(--tw-terra)', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', padding: 0 }}>Registrarse</button>
            </p>
            <p style={{ fontSize: 9, color: 'var(--tw-text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
              Al continuar aceptas los <span style={{ color: 'var(--tw-terra)', textDecoration: 'underline', cursor: 'pointer' }}>términos de uso</span> y la <span style={{ color: 'var(--tw-terra)', textDecoration: 'underline', cursor: 'pointer' }}>política de privacidad</span> de TunayWasi
            </p>
          </div>
        )}

        {/* ── ¿Quién eres? (Soy Cliente / Soy Caficultor) ── */}
        {paso === 'seleccion_rol_registro' && (
          <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button onClick={() => { setError(null); setPaso('inicio') }} style={{ background: 'none', border: 'none', color: 'var(--tw-text-muted)', cursor: 'pointer', fontSize: 11, marginBottom: 24, padding: 0, fontFamily: 'Montserrat, sans-serif', alignSelf: 'flex-start' }}>← Volver</button>
            {googlePendingTipo && pendingNombre && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--tw-terra)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 10, boxShadow: '0 3px 10px rgba(201,110,75,0.4)' }}>
                  {pendingNombre.trim().charAt(0).toUpperCase()}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 2 }}>{pendingNombre}</div>
                <div style={{ fontSize: 11, color: 'var(--tw-text-muted)' }}>{pendingEmail}</div>
              </div>
            )}
            <div style={{ textAlign: 'center', marginBottom: 20, width: '100%' }}>
              {!googlePendingTipo && <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>Tunay <span style={{ color: 'var(--tw-text)' }}>·</span> <span style={{ color: 'var(--tw-terra)' }}>Wasi</span></div>}
              <h2 style={{ margin: '0 0 4px', fontSize: 20, fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, color: 'var(--tw-text)' }}>¿Cómo usarás TunayWasi?</h2>
              <p style={{ margin: 0, fontSize: 10, color: 'var(--tw-text-muted)' }}>Elige tu perfil para continuar</p>
            </div>
            {error && <p style={{ color: '#f87171', fontSize: 12, marginBottom: 16, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 8, width: '100%' }}>{error}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
              {/* Soy Cliente */}
              <button
                onClick={() => {
                  setError(null)
                  setPaso('seleccion_tipo_cliente')
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 12, border: '2px solid var(--tw-terra)', background: 'rgba(201,110,75,0.06)', cursor: 'pointer', textAlign: 'left', fontFamily: 'Montserrat, sans-serif', width: '100%', transition: 'background .15s' }}
              >
                <span style={{ fontSize: 26, flexShrink: 0 }}>🧑</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 2 }}>Soy Cliente</div>
                  <div style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>Persona, cafetería, restaurante o tienda</div>
                </div>
                <span style={{ fontSize: 18, color: 'var(--tw-terra)' }}>›</span>
              </button>
              {/* Soy Caficultor */}
              <button
                onClick={() => {
                  setError(null)
                  setRolRegistro('seller')
                  setPaso('registro_caficultor')
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 12, border: '2px solid rgba(143,175,138,0.4)', background: 'rgba(143,175,138,0.06)', cursor: 'pointer', textAlign: 'left', fontFamily: 'Montserrat, sans-serif', width: '100%' }}
              >
                <span style={{ fontSize: 26, flexShrink: 0 }}>🌱</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#8faf8a', marginBottom: 2 }}>Soy Caficultor</div>
                  <div style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>Vende tu café directo a compradores</div>
                </div>
                <span style={{ fontSize: 18, color: '#8faf8a' }}>›</span>
              </button>
            </div>
            <p style={{ marginTop: 16, fontSize: 10, color: 'var(--tw-text-muted)', textAlign: 'center' }}>
              ¿Ya tienes cuenta?{' '}
              <button onClick={() => { setError(null); setPaso('email_login') }} style={{ background: 'none', border: 'none', color: 'var(--tw-terra)', cursor: 'pointer', fontSize: 10, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', padding: 0 }}>Ingresar</button>
            </p>
          </div>
        )}

        {/* ── Paso 1 Tu cuenta (email y Google) ── */}
        {paso === 'cuenta_email' && (
          <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column' }}>
            <button onClick={() => { setError(null); setPaso('seleccion_tipo_cliente') }} style={{ background: 'none', border: 'none', color: 'var(--tw-text-muted)', cursor: 'pointer', fontSize: 11, marginBottom: 24, padding: 0, fontFamily: 'Montserrat, sans-serif', alignSelf: 'flex-start' }}>← Volver</button>
            <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
              <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--tw-terra)' }} />
              <div style={{ flex: 1, height: 3, borderRadius: 2, background: '#2a2a2a' }} />
              <div style={{ flex: 1, height: 3, borderRadius: 2, background: '#2a2a2a' }} />
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#8faf8a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Paso 1 · Tu cuenta</div>
            <h2 style={{ margin: '0 0 4px', fontSize: 22, fontFamily: 'Cormorant Garamond, serif', color: 'var(--tw-text)', fontWeight: 700 }}>Crea tu cuenta</h2>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 22 }}>{googlePendingTipo ? 'Confirma tus datos de Google.' : 'Estos datos son para iniciar sesión en TunayWasi.'}</div>
            {error && <p style={{ color: '#f87171', fontSize: 12, marginBottom: 14, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 8 }}>{error}</p>}
            <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Nombre completo <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
            <input
              type="text" placeholder="Juan Pérez"
              value={googlePendingTipo ? pendingNombre : nombre}
              onChange={e => googlePendingTipo ? setPendingNombre(e.target.value) : setNombre(e.target.value)}
              autoComplete="name" style={inputStyle}
            />
            <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Email <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
            <input
              type="email" placeholder="tu@correo.com"
              value={googlePendingTipo ? pendingEmail : email}
              onChange={e => googlePendingTipo ? setPendingEmail(e.target.value) : setEmail(e.target.value)}
              autoComplete="email"
              readOnly={emailBloqueadoGoogle}
              style={{ ...inputStyle, ...(emailBloqueadoGoogle ? { opacity: 0.6, cursor: 'not-allowed', background: '#111' } : {}) }}
            />
            {!googlePendingTipo && (
              <>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Contraseña <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                <input type="password" placeholder="Mínimo 8 caracteres + 1 número" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" style={inputStyle} />
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Confirmar contraseña <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                <input type="password" placeholder="Repite" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} autoComplete="new-password" style={inputStyle} />
              </>
            )}
            {googlePendingTipo && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'rgba(66,133,244,0.08)', border: '1px solid rgba(66,133,244,0.2)', marginBottom: 14 }}>
                <span style={{ fontSize: 14 }}>🔒</span>
                <span style={{ fontSize: 10, color: '#4285F4' }}>Cuenta verificada con Google. No necesitas contraseña.</span>
              </div>
            )}
            <button
              onClick={() => {
                const n = googlePendingTipo ? pendingNombre : nombre
                if (!n.trim()) { setError('Ingresa tu nombre.'); return }
                if (googlePendingTipo) {
                  if (!pendingEmail.includes('@')) { setError('Ingresa un email válido.'); return }
                } else {
                  if (!email.includes('@')) { setError('Ingresa un email válido.'); return }
                  if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
                  if (!/\d/.test(password)) { setError('La contraseña debe incluir al menos 1 número.'); return }
                  if (password !== passwordConfirm) { setError('Las contraseñas no coinciden.'); return }   // BUG-REG-05
                }
                setError(null)
                if (rolRegistro === 'buyer_b2c') setPaso('datos_persona')
                else setPaso('datos_negocio')
              }}
              style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', cursor: 'pointer', marginTop: 4 }}
            >Siguiente →</button>
            {!googlePendingTipo && (
              <div style={{ textAlign: 'center', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--tw-border)' }}>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--tw-text-muted)' }}>
                  ¿Ya tienes cuenta?{' '}
                  <button onClick={() => { setError(null); setPaso('email_login') }} style={{ background: 'none', border: 'none', color: 'var(--tw-terra)', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>Ingresar</button>
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Persona / Negocio ── */}
        {paso === 'seleccion_tipo_cliente' && (
          <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {googlePendingTipo && pendingNombre && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--tw-terra)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 10, boxShadow: '0 3px 10px rgba(201,110,75,0.4)' }}>
                  {pendingNombre.trim().charAt(0).toUpperCase()}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 2 }}>{pendingNombre}</div>
                <div style={{ fontSize: 11, color: 'var(--tw-text-muted)' }}>{pendingEmail}</div>
              </div>
            )}
            <div style={{ textAlign: 'center', marginBottom: 20, width: '100%' }}>
              <h2 style={{ margin: '0 0 4px', fontSize: 20, fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, color: 'var(--tw-text)' }}>¿Cómo quieres registrarte?</h2>
              <p style={{ margin: 0, fontSize: 10, color: 'var(--tw-text-muted)' }}>Elige el tipo de cuenta según tu perfil</p>
            </div>
            {error && <p style={{ color: '#f87171', fontSize: 12, marginBottom: 16, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 8, width: '100%' }}>{error}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, width: '100%' }}>
              {([
                { rol: 'buyer_b2c' as RolONE, emoji: '🧑', label: 'Persona', desc: 'Compra café para tu consumo personal. Solo necesitas tu DNI.' },
                { rol: 'buyer_b2b' as RolONE, emoji: '🏢', label: 'Negocio', desc: 'Cafetería, restaurante o empresa. Factura electrónica y compras al por mayor.' },
              ]).map(({ rol, emoji, label, desc }) => {
                const sel = rolRegistro === rol
                return (
                  <div key={rol} onClick={() => setRolRegistro(rol)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'Montserrat, sans-serif', width: '100%', border: sel ? '2px solid var(--tw-terra)' : '2px solid var(--tw-border)', background: sel ? 'rgba(201,110,75,0.06)' : 'var(--tw-card)', marginBottom: 10 }}>
                    <span style={{ fontSize: 24, flexShrink: 0 }}>{emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', lineHeight: 1.4 }}>{desc}</div>
                    </div>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, border: `2px solid ${sel ? 'var(--tw-terra)' : '#444'}`, background: sel ? 'var(--tw-terra)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {sel && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                    </div>
                  </div>
                )
              })}
            </div>
            {googlePendingTipo ? (
              <button
                onClick={() => {
                  setError(null)
                  setPaso('cuenta_email')
                }}
                style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', cursor: 'pointer', marginTop: 8 }}
              >Continuar →</button>
            ) : (
              <button
                onClick={() => {
                  setError(null)
                  setPaso('cuenta_email')
                }}
                style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', cursor: 'pointer', marginTop: 8 }}
              >Continuar →</button>
            )}
            <p style={{ marginTop: 12, fontSize: 10, color: 'var(--tw-text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
              ←{' '}
              <button onClick={() => { setError(null); setPaso('seleccion_rol_registro') }} style={{ background: 'none', border: 'none', color: 'var(--tw-terra)', cursor: 'pointer', fontSize: 10, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', padding: 0, textDecoration: 'underline' }}>Volver a elegir perfil</button>
            </p>
          </div>
        )}

        {/* ── Datos Persona (DNI) ── */}
        {paso === 'datos_persona' && (
          <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column' }}>
            <button onClick={() => { setError(null); setPaso('seleccion_tipo_cliente') }} style={{ background: 'none', border: 'none', color: 'var(--tw-text-muted)', cursor: 'pointer', fontSize: 11, marginBottom: 24, padding: 0, fontFamily: 'Montserrat, sans-serif', alignSelf: 'flex-start' }}>← Volver</button>
            <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
              <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--tw-terra)' }} />
              <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--tw-terra)' }} />
              <div style={{ flex: 1, height: 3, borderRadius: 2, background: '#2a2a2a' }} />
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#8faf8a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Paso 1 · Verificación</div>
            <h2 style={{ margin: '0 0 4px', fontSize: 22, fontFamily: 'Cormorant Garamond, serif', color: 'var(--tw-text)', fontWeight: 700 }}>Tu DNI</h2>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 22, lineHeight: 1.5 }}>Necesitamos verificar tu identidad para activar tu cuenta.</div>
            {error && <p style={{ color: '#f87171', fontSize: 12, marginBottom: 14, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 8 }}>{error}</p>}
            <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Número de DNI <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
            <input
              type="text" placeholder="12345678" maxLength={8}
              value={dni} onChange={e => simDNI(e.target.value.replace(/\D/g, ''))}
              style={{ ...inputStyle, border: dniEstado === 'ok' ? '1px solid #8faf8a' : '1px solid #2a2a2a' }}
            />
            {dniEstado === 'ok' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#8faf8a', marginTop: -10, marginBottom: 14 }}>
                ✓ DNI válido
              </div>
            )}
            <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Teléfono / WhatsApp <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
            <input type="tel" placeholder="+51 987 654 321" value={telefono} onChange={e => setTelefono(e.target.value)} style={inputStyle} />
            <button
              onClick={completarConDatosPersona}
              disabled={cargando}
              style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', cursor: cargando ? 'not-allowed' : 'pointer', opacity: cargando ? 0.6 : 1, marginTop: 4 }}
            >
              {cargando ? 'Creando cuenta...' : 'Crear cuenta →'}
            </button>
          </div>
        )}

        {/* ── Datos Negocio (RUC) ── */}
        {paso === 'datos_negocio' && (
          <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column' }}>
            <button onClick={() => { setError(null); setPaso('seleccion_tipo_cliente') }} style={{ background: 'none', border: 'none', color: 'var(--tw-text-muted)', cursor: 'pointer', fontSize: 11, marginBottom: 24, padding: 0, fontFamily: 'Montserrat, sans-serif', alignSelf: 'flex-start' }}>← Volver</button>
            <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
              <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--tw-terra)' }} />
              <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--tw-terra)' }} />
              <div style={{ flex: 1, height: 3, borderRadius: 2, background: '#2a2a2a' }} />
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#8faf8a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Paso 1 · Empresa</div>
            <h2 style={{ margin: '0 0 4px', fontSize: 22, fontFamily: 'Cormorant Garamond, serif', color: 'var(--tw-text)', fontWeight: 700 }}>Tu empresa</h2>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 22, lineHeight: 1.5 }}>
              Verifica tu RUC para acceder a lotes de especialidad con factura electrónica.
            </div>
            {error && <p style={{ color: '#f87171', fontSize: 12, marginBottom: 14, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 8 }}>{error}</p>}
            <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>RUC <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
            <input
              type="text" placeholder="20XXXXXXXXX" maxLength={11}
              value={ruc} onChange={e => simRUC(e.target.value.replace(/\D/g, ''))}
              style={{ ...inputStyle, border: rucEstado === 'ok' ? '1px solid #8faf8a' : rucEstado === 'err' ? '1px solid #ef4444' : '1px solid #2a2a2a' }}
            />
            {rucEstado === 'checking' && (
              <div style={{ fontSize: 11, color: '#888', marginTop: -10, marginBottom: 14 }}>⏳ Verificando en SUNAT…</div>
            )}
            {rucEstado === 'ok' && (
              <div style={{ fontSize: 11, fontWeight: 600, color: '#8faf8a', marginTop: -10, marginBottom: 14 }}>✓ RUC activo en SUNAT</div>
            )}
            {rucEstado === 'err' && (
              <div style={{ fontSize: 11, fontWeight: 600, color: '#ef4444', marginTop: -10, marginBottom: 14 }}>✗ {errorFormatoRuc(ruc, ['10', '20']) ?? 'RUC no encontrado en SUNAT'}</div>
            )}
            <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Razón social <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
            <input
              type="text" placeholder="Se auto-completa con el RUC"
              value={razonSocial} readOnly={rucEstado === 'ok'}
              onChange={e => { if (rucEstado !== 'ok') setRazonSocial(e.target.value) }}
              style={{ ...inputStyle, background: rucEstado === 'ok' ? '#1a2a1a' : '#1a1a1a', color: rucEstado === 'ok' ? '#8faf8a' : '#f2e0cc' }}
            />
            <button
              onClick={completarConDatosNegocio}
              disabled={cargando}
              style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', cursor: cargando ? 'not-allowed' : 'pointer', opacity: cargando ? 0.6 : 1, marginTop: 4 }}
            >
              {cargando ? 'Creando cuenta...' : 'Crear cuenta →'}
            </button>
            <div style={{ marginTop: 14, background: 'rgba(143,175,138,0.07)', border: '1px solid rgba(143,175,138,0.2)', borderRadius: 9, padding: '11px 13px', fontSize: 10, color: '#8faf8a', lineHeight: 1.6 }}>
              🔍 <strong>Revisaremos tu RUC en SUNAT</strong> y te activamos en 24h. Te notificamos por email.
            </div>
          </div>
        )}

        {/* ── Email login / registro / reset ── */}
        {(paso === 'email_login' || paso === 'email_registro' || paso === 'reset') && (
          <div style={{ width: '100%', maxWidth: 320 }}>
            {paso === 'email_login' && (
              <>
                <button onClick={() => { setError(null); setPaso('inicio') }} style={{ background: 'none', border: 'none', color: 'var(--tw-text-muted)', cursor: 'pointer', fontSize: 11, marginBottom: 24, padding: 0 }}>← Volver</button>
                <h2 style={{ margin: '0 0 4px', fontSize: 26, fontFamily: 'Cormorant Garamond, serif', color: 'var(--tw-text)', fontWeight: 700 }}>Ingresar</h2>
                <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 24 }}>Con tu cuenta de TunayWasi</div>
                {error && <p style={{ color: '#f87171', fontSize: 12, marginBottom: 14, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 8 }}>{error}</p>}
                <form onSubmit={handleEmailLogin}>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 9, fontWeight: 700, color: 'var(--tw-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Email <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                  <input type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required style={inputStyle} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--tw-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Contraseña <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                    <button type="button" onClick={() => { setError(null); setPaso('reset') }} style={{ background: 'none', border: 'none', color: 'var(--tw-terra)', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>¿Olvidaste?</button>
                  </div>
                  <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required style={inputStyle} />
                  <button type="submit" disabled={cargando} style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', cursor: cargando ? 'not-allowed' : 'pointer', opacity: cargando ? 0.6 : 1, marginBottom: 14 }}>
                    {cargando ? 'Cargando...' : 'Ingresar →'}
                  </button>
                </form>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 12px' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--tw-border)' }} />
                  <span style={{ fontSize: 10, color: 'var(--tw-text-muted)', fontWeight: 600 }}>O</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--tw-border)' }} />
                </div>
                <button onClick={handleGoogle} disabled={cargando} style={{ width: '100%', padding: '12px 24px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.12)', background: '#fff', color: '#1a1a1a', fontSize: 13, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', cursor: cargando ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.18)', marginBottom: 14, opacity: cargando ? 0.7 : 1 }}>
                  {googleSvg} Continuar con Google
                </button>
                <div style={{ textAlign: 'center', paddingTop: 14, borderTop: '1px solid var(--tw-border)' }}>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--tw-text-muted)' }}>
                    ¿No tienes cuenta?{' '}
                    <button onClick={() => { setError(null); setPaso('seleccion_rol_registro') }} style={{ background: 'none', border: 'none', color: 'var(--tw-terra)', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>Registrarme</button>
                  </p>
                </div>
              </>
            )}
            {paso === 'email_registro' && (
              <>
                <button onClick={() => { setError(null); setPaso('seleccion_tipo_cliente') }} style={{ background: 'none', border: 'none', color: 'var(--tw-text-muted)', cursor: 'pointer', fontSize: 11, marginBottom: 16, padding: 0 }}>← Volver</button>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#8faf8a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Paso 1 · Tu cuenta</div>
                <h2 style={{ margin: '0 0 4px', fontSize: 22, fontFamily: 'Cormorant Garamond, serif', color: 'var(--tw-text)', fontWeight: 700 }}>Crea tu cuenta</h2>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 22 }}>Estos datos son para iniciar sesión en TunayWasi.</div>
                {error && <p style={{ color: '#f87171', fontSize: 12, marginBottom: 14, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 8 }}>{error}</p>}
                <form onSubmit={handleEmailRegistro}>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Nombre completo <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                  <input type="text" placeholder="Juan Pérez" value={nombre} onChange={e => setNombre(e.target.value)} autoComplete="name" required style={inputStyle} />
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Email <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                  <input type="email" placeholder="tu@correo.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required style={inputStyle} />
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Contraseña <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                  <input type="password" placeholder="Mínimo 8 caracteres + 1 número" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" required style={inputStyle} />
                  <button type="submit" disabled={cargando} style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', cursor: cargando ? 'not-allowed' : 'pointer', opacity: cargando ? 0.6 : 1, marginTop: 4 }}>
                    {cargando ? 'Cargando...' : 'Siguiente →'}
                  </button>
                </form>
                <div style={{ textAlign: 'center', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--tw-border)' }}>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--tw-text-muted)' }}>
                    ¿Ya tienes cuenta?{' '}
                    <button onClick={() => { setError(null); setPaso('email_login') }} style={{ background: 'none', border: 'none', color: 'var(--tw-terra)', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>Ingresar</button>
                  </p>
                </div>
              </>
            )}
            {paso === 'reset' && (
              <>
                <button onClick={() => { setError(null); setResetEnviado(false); setPaso('email_login') }} style={{ background: 'none', border: 'none', color: 'var(--tw-text-muted)', cursor: 'pointer', fontSize: 12, marginBottom: 16, padding: 0 }}>← Volver</button>
                <h2 style={{ margin: '0 0 6px', fontSize: 24, fontFamily: 'Cormorant Garamond, serif', color: 'var(--tw-text)', fontWeight: 700 }}>Recuperar contraseña</h2>
                <p style={{ margin: '0 0 24px', fontSize: 12, color: 'var(--tw-text-muted)' }}>Te enviamos un link a tu email</p>
                {resetEnviado ? (
                  <div style={{ textAlign: 'center', padding: '10px 0' }}>
                    <p style={{ fontSize: 36, marginBottom: 12 }}>📬</p>
                    <p style={{ fontSize: 14, color: 'var(--tw-text)', lineHeight: 1.6 }}>Enviamos el link a <strong>{email}</strong></p>
                  </div>
                ) : (
                  <>
                    {error && <p style={{ color: '#f87171', fontSize: 12, marginBottom: 14, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 8 }}>{error}</p>}
                    <form onSubmit={handleReset}>
                      <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--tw-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Email</label>
                      <input type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required style={inputStyle} />
                      <button type="submit" disabled={cargando} style={{ width: '100%', padding: '13px 0', borderRadius: 8, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', cursor: cargando ? 'not-allowed' : 'pointer', opacity: cargando ? 0.6 : 1 }}>
                        {cargando ? 'Enviando...' : 'Enviar link →'}
                      </button>
                    </form>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Registro Caficultor — Paso 1: Tu cuenta ── */}
        {paso === 'registro_caficultor' && (
          <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column' }}>
            <button onClick={() => { setError(null); setPaso('seleccion_rol_registro') }} style={{ background: 'none', border: 'none', color: 'var(--tw-text-muted)', cursor: 'pointer', fontSize: 11, marginBottom: 24, padding: 0, fontFamily: 'Montserrat, sans-serif', alignSelf: 'flex-start' }}>← Volver</button>
            <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
              <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--tw-terra)' }} />
              <div style={{ flex: 1, height: 3, borderRadius: 2, background: '#2a2a2a' }} />
              <div style={{ flex: 1, height: 3, borderRadius: 2, background: '#2a2a2a' }} />
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#8faf8a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Paso 1 de 3</div>
            <h2 style={{ margin: '0 0 4px', fontSize: 22, fontFamily: 'Cormorant Garamond, serif', color: 'var(--tw-text)', fontWeight: 700 }}>Crea tu cuenta</h2>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 22 }}>{googlePendingTipo ? 'Confirma tus datos de Google.' : 'Para empezar a vender tu café directamente a negocios peruanos.'}</div>
            {error && <p style={{ color: '#f87171', fontSize: 12, marginBottom: 14, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 8 }}>{error}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Nombre completo <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                <input
                  type="text" placeholder="María Quispe Condori"
                  value={googlePendingTipo ? pendingNombre : nombre}
                  onChange={e => googlePendingTipo ? setPendingNombre(e.target.value) : setNombre(e.target.value)}
                  autoComplete="name" style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>WhatsApp <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                <input type="tel" placeholder="+51 987 654 321" value={cafYape} onChange={e => setCafYape(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Email <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                <input
                  type="email" placeholder="tu@correo.com"
                  value={googlePendingTipo ? pendingEmail : email}
                  onChange={e => googlePendingTipo ? setPendingEmail(e.target.value) : setEmail(e.target.value)}
                  autoComplete="email"
                  readOnly={emailBloqueadoGoogle}
                  style={{ ...inputStyle, ...(emailBloqueadoGoogle ? { opacity: 0.6, cursor: 'not-allowed', background: '#111' } : {}) }}
                />
              </div>
              {!googlePendingTipo ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Contraseña <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                    <input type="password" placeholder="Mín. 8 chars + 1 núm" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Confirmar <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                    <input type="password" placeholder="Repite" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} autoComplete="new-password" style={inputStyle} />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'rgba(66,133,244,0.08)', border: '1px solid rgba(66,133,244,0.2)' }}>
                  <span style={{ fontSize: 14 }}>🔒</span>
                  <span style={{ fontSize: 10, color: '#4285F4' }}>Cuenta verificada con Google. No necesitas contraseña.</span>
                </div>
              )}
              <button
                onClick={() => {
                  const n = googlePendingTipo ? pendingNombre : nombre
                  if (!n.trim()) { setError('Ingresa tu nombre.'); return }
                  if (!cafYape.trim()) { setError('Ingresa tu WhatsApp.'); return }
                  if (googlePendingTipo) {
                    if (!pendingEmail.includes('@')) { setError('Ingresa un email válido.'); return }
                    setError(null)
                    setPaso('registro_caficultor_finca')
                    return
                  }
                  if (!email.includes('@')) { setError('Ingresa un email válido.'); return }
                  if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
                  if (!/\d/.test(password)) { setError('La contraseña debe incluir al menos 1 número.'); return }
                  if (password !== passwordConfirm) { setError('Las contraseñas no coinciden.'); return }   // BUG-REG-05
                  // BUG-REG-04: la cuenta NO se crea aquí (AppONE sacaba al usuario del alta al ver el perfil
                  // seller). Se crea al final del paso 3, como en /registro-caficultor y en el flujo Google.
                  setError(null)
                  setPaso('registro_caficultor_finca')
                }}
                disabled={cargando}
                style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: '#4a7c59', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', cursor: cargando ? 'not-allowed' : 'pointer', opacity: cargando ? 0.6 : 1, marginTop: 4 }}
              >
                {cargando ? 'Creando cuenta...' : 'Siguiente →'}
              </button>
            </div>
          </div>
        )}

        {/* ── Registro Caficultor — Paso 2: Tu finca ── */}
        {paso === 'registro_caficultor_finca' && (
          <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column' }}>
            {completarSeller ? (
              // Cuenta ya creada (alta a medias): no se vuelve al paso 1; se puede salir.
              <button data-testid="onboarding-cerrar-sesion" onClick={async () => { const { cerrarSesion } = await import('../authService'); await cerrarSesion() }} style={{ background: 'none', border: 'none', color: 'var(--tw-text-muted)', cursor: 'pointer', fontSize: 11, marginBottom: 24, padding: 0, fontFamily: 'Montserrat, sans-serif', alignSelf: 'flex-start' }}>🚪 Cerrar sesión</button>
            ) : (
              <button onClick={() => { setError(null); setPaso(googlePendingTipo ? 'seleccion_rol_registro' : 'registro_caficultor') }} style={{ background: 'none', border: 'none', color: 'var(--tw-text-muted)', cursor: 'pointer', fontSize: 11, marginBottom: 24, padding: 0, fontFamily: 'Montserrat, sans-serif', alignSelf: 'flex-start' }}>← Volver</button>
            )}
            {completarSeller && <div style={{ fontSize: 11, color: 'var(--tw-text-muted)', marginBottom: 14, lineHeight: 1.5 }}>Tu cuenta ya está creada. Completa tu finca e identidad para entrar a tu portal.</div>}
            <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
              <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--tw-terra)' }} />
              <div style={{ flex: 1, height: 3, borderRadius: 2, background: googlePendingTipo ? '#2a2a2a' : 'var(--tw-terra)' }} />
              {!googlePendingTipo && <div style={{ flex: 1, height: 3, borderRadius: 2, background: '#2a2a2a' }} />}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#8faf8a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{googlePendingTipo ? 'Paso 1 de 2' : 'Paso 2 de 3'}</div>
            <h2 style={{ margin: '0 0 4px', fontSize: 22, fontFamily: 'Cormorant Garamond, serif', color: 'var(--tw-text)', fontWeight: 700 }}>Tu finca</h2>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 22 }}>Cuéntanos sobre tu producción. Puedes actualizar esto después.</div>
            {error && <p style={{ color: '#f87171', fontSize: 12, marginBottom: 14, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 8 }}>{error}</p>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 13 }}>
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Región <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                <select value={fincaRegion} onChange={e => setFincaRegion(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
                  <option value="">Seleccionar...</option>
                  {['Cajamarca','Amazonas','San Martín','Cusco','Puno','Junín','Pasco','Huánuco','Ayacucho'].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Distrito <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                <input type="text" placeholder="Ej. San Ignacio" value={fincaDistrito} onChange={e => setFincaDistrito(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 13 }}>
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Altitud (msnm)</label>
                <input type="number" placeholder="1800" value={fincaAltitud} onChange={e => setFincaAltitud(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Kg disponibles</label>
                <input type="number" placeholder="100" value={fincaKg} onChange={e => setFincaKg(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Variedad <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                <select value={fincaVariedad} onChange={e => setFincaVariedad(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
                  <option value="">Seleccionar...</option>
                  {['Bourbon','Caturra','Typica','Geisha','Catimor','Pache'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Proceso <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                <select value={fincaProceso} onChange={e => setFincaProceso(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
                  <option value="">Seleccionar...</option>
                  {['Natural (seco)','Washed (lavado)','Honey','Anaerobic'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <button
              onClick={() => {
                if (!fincaRegion || !fincaDistrito || !fincaVariedad || !fincaProceso) { setError('Completa los campos obligatorios.'); return }
                setError(null)
                setPaso('registro_caficultor_identidad')
              }}
              style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: '#4a7c59', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', cursor: 'pointer', marginTop: 4 }}
            >Siguiente →</button>
          </div>
        )}

        {/* ── Registro Caficultor — Paso 3: Identidad ── */}
        {paso === 'registro_caficultor_identidad' && (
          <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column' }}>
            <button onClick={() => { setError(null); setPaso('registro_caficultor_finca') }} style={{ background: 'none', border: 'none', color: 'var(--tw-text-muted)', cursor: 'pointer', fontSize: 11, marginBottom: 24, padding: 0, fontFamily: 'Montserrat, sans-serif', alignSelf: 'flex-start' }}>← Volver</button>
            <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
              <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--tw-terra)' }} />
              <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--tw-terra)' }} />
              {!googlePendingTipo && <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--tw-terra)' }} />}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#8faf8a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{googlePendingTipo ? 'Paso 2 de 2' : 'Paso 3 de 3'}</div>
            <h2 style={{ margin: '0 0 4px', fontSize: 22, fontFamily: 'Cormorant Garamond, serif', color: 'var(--tw-text)', fontWeight: 700 }}>Verifica tu identidad</h2>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 22, lineHeight: 1.5 }}>Necesario para recibir pagos y publicar lotes.</div>
            {error && <p style={{ color: '#f87171', fontSize: 12, marginBottom: 14, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 8 }}>{error}</p>}
            <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Número de DNI <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
            <input
              type="text" placeholder="12345678" maxLength={8}
              value={cafDni} onChange={e => { const v = e.target.value.replace(/\D/g, ''); setCafDni(v); setCafDniEstado(v.length === 8 ? 'ok' : 'idle') }}
              style={{ ...inputStyle, border: cafDniEstado === 'ok' ? '1px solid #8faf8a' : '1px solid #2a2a2a' }}
            />
            {cafDniEstado === 'ok' && <div style={{ fontSize: 11, fontWeight: 600, color: '#8faf8a', marginTop: -10, marginBottom: 14 }}>✓ DNI válido</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 13 }}>
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Foto frontal DNI <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                <div style={{ border: '2px dashed #2a2a2a', borderRadius: 10, padding: '16px 10px', textAlign: 'center', cursor: 'pointer', background: '#111' }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>📷</div>
                  <div style={{ fontSize: 9, color: '#888' }}>Adjuntar imagen</div>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Selfie con DNI <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
                <div style={{ border: '2px dashed #2a2a2a', borderRadius: 10, padding: '16px 10px', textAlign: 'center', cursor: 'pointer', background: '#111' }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>🤳</div>
                  <div style={{ fontSize: 9, color: '#888' }}>Adjuntar foto</div>
                </div>
              </div>
            </div>
            <div style={{ background: 'rgba(143,175,138,0.07)', border: '1px solid rgba(143,175,138,0.2)', borderRadius: 9, padding: '11px 13px', fontSize: 10, color: '#8faf8a', lineHeight: 1.6, marginBottom: 13 }}>
              🤖 <strong>Verificación automática</strong> — La IA compara tu DNI con tu selfie en segundos. Tu nivel inicial sube a N1 y puedes publicar tu primer lote.
            </div>
            <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Número Yape <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
            <input type="tel" placeholder="+51 987 654 321" value={cafYape} onChange={e => setCafYape(e.target.value)} style={inputStyle} />
            <div style={{ fontSize: 9, color: '#555', marginTop: -10, marginBottom: 14 }}>Al número donde recibirás tus pagos. Debe ser titular del mismo DNI.</div>
            <button
              onClick={async () => {
                if (cafDniEstado !== 'ok') { setError('Ingresa tu DNI de 8 dígitos.'); return }
                if (!cafYape.trim()) { setError('Ingresa tu número Yape.'); return }
                setError(null)
                setPaso('cargando_cuenta')
                try {
                  let uidSeller: string | undefined
                  if (googlePendingTipo && pendingUid) {
                    // REG-01: reservar DNI antes de crear el perfil
                    await reservarDocumentos(pendingUid, 'seller', [claveDniSeller(cafDni.trim())])
                    const { completarRegistroGoogle } = await import('../authService')
                    await completarRegistroGoogle(pendingUid, pendingNombre, pendingEmail, 'seller')
                    limpiarGooglePending()
                    setAnalyticsUser(pendingUid, 'seller')
                    try { localStorage.setItem('one_portal_badge', '1') } catch { /* ok */ }
                    uidSeller = pendingUid
                  } else if (completarSeller) {
                    // Alta a medias: la cuenta y el perfil seller ya existen — solo reservar DNI (REG-01)
                    const { auth } = await import('@/shared/firebase')
                    uidSeller = auth.currentUser?.uid
                    if (!uidSeller) throw new Error('sin-sesion')
                    await reservarDocumentos(uidSeller, 'seller', [claveDniSeller(cafDni.trim())])
                  } else {
                    // Flujo email (BUG-REG-04): la cuenta se crea AHORA, al final del paso 3. registrar()
                    // reserva el DNI (REG-01) y, si algo falla, libera el DNI y borra la cuenta Auth.
                    try {
                      await registrar(email, password, nombre.trim(), 'seller', [claveDniSeller(cafDni.trim())])
                    } catch (e: unknown) {
                      const code = (e as { code?: string }).code ?? ''
                      if (code.startsWith('auth/')) {
                        // email ya usado / inválido / contraseña débil → se corrige en el paso 1
                        setError(traducirError(code))
                        setPaso('registro_caficultor')
                        return
                      }
                      throw e
                    }
                    const { auth } = await import('@/shared/firebase')
                    uidSeller = auth.currentUser?.uid
                    if (uidSeller) setAnalyticsUser(uidSeller, 'seller')
                  }
                  // Guardar datos de finca y pago en ambos flujos
                  if (uidSeller) {
                    const { db } = await import('@/shared/firebase')
                    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
                    await setDoc(doc(db, 'one_usuarios', uidSeller), {
                      caficultor: {
                        region: fincaRegion.trim(),
                        distrito: fincaDistrito.trim(),
                        altitudMsnm: parseInt(fincaAltitud) || 0,
                        historia: '',
                        foto: '',
                        activo: false,
                        dni: cafDni.trim(),
                        yape: cafYape.trim(),
                        variedades: fincaVariedad.trim(),
                        proceso: fincaProceso.trim(),
                        kgAnualesEstimados: parseInt(fincaKg) || 0,
                      },
                      updatedAt: serverTimestamp(),
                    }, { merge: true })
                  }
                  completarOnboarding(uidSeller ?? '', 'seller', 'caficultor', metodoOnb)
                  // AppONE recarga el perfil (ya con bloque caficultor) y lleva al portal / returnTo.
                  // No se navega desde aquí: con el perfil viejo en memoria el portal devolvería al alta.
                  window.dispatchEvent(new Event(EVENTO_PERFIL_ACTUALIZADO))
                } catch (e: unknown) {
                  setError(esDocumentoDuplicado(e) ? e.message : 'Error al guardar tu perfil. Intenta de nuevo.')
                  setPaso('registro_caficultor_identidad')
                }
              }}
              disabled={cargando}
              style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: '#4a7c59', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', cursor: cargando ? 'not-allowed' : 'pointer', opacity: cargando ? 0.6 : 1 }}
            >Crear cuenta →</button>
          </div>
        )}

        {/* ── Creando Cuenta ── */}
        {paso === 'cargando_cuenta' && (
          <div style={{ textAlign: 'center', width: '100%', maxWidth: 320 }}>
            <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'rgba(201,110,75,0.12)', border: '2px solid rgba(201,110,75,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 28 }}>☕</div>
            <div style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid #1e1e1e', borderTopColor: 'var(--tw-terra)', animation: 'spin 0.8s linear infinite', margin: '0 auto 24px' }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 8 }}>Creando tu cuenta…</div>
            <div style={{ fontSize: 11, color: 'var(--tw-text-muted)', lineHeight: 1.6 }}>Configurando tu perfil en TunayWasi</div>
          </div>
        )}

        {/* ── Abriendo Google ── */}
        {paso === 'abriendo_google' && (
          <div style={{ textAlign: 'center', width: '100%', maxWidth: 320 }}>
            <div style={{ width: 68, height: 68, borderRadius: 18, background: 'linear-gradient(135deg,#4285F4 0%,#34A853 33%,#FBBC05 66%,#EA4335 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 900, color: '#fff', margin: '0 auto 24px', boxShadow: '0 6px 24px rgba(66,133,244,0.4)' }}>G</div>
            <div style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid #1e1e1e', borderTopColor: '#4285F4', animation: 'spin 0.8s linear infinite', margin: '0 auto 24px' }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 8 }}>Abriendo Google…</div>
            <div style={{ fontSize: 11, color: 'var(--tw-text-muted)', lineHeight: 1.6, maxWidth: 220, margin: '0 auto' }}>Se abrirá una ventana para que selecciones tu cuenta de Google.</div>
          </div>
        )}

        {/* ── Google Loading ── */}
        {paso === 'google_loading' && (
          <div style={{ textAlign: 'center', width: '100%', maxWidth: 320 }}>
            <div style={{ width: 68, height: 68, borderRadius: 18, background: 'linear-gradient(135deg,#4285F4 0%,#34A853 33%,#FBBC05 66%,#EA4335 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 900, color: '#fff', margin: '0 auto 24px', boxShadow: '0 6px 24px rgba(66,133,244,0.4)' }}>G</div>
            <div style={{ display: 'flex', gap: 7, justifyContent: 'center', marginBottom: 24 }}>
              {[{c:'#4285F4',d:'0s'},{c:'#34A853',d:'0.15s'},{c:'#FBBC05',d:'0.3s'},{c:'#EA4335',d:'0.45s'}].map(({c,d}) => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, animation: `gldot 1.1s ease-in-out ${d} infinite` }} />
              ))}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 8 }}>Verificando tu cuenta…</div>
            <div style={{ fontSize: 11, color: 'var(--tw-text-muted)', lineHeight: 1.6, maxWidth: 220, margin: '0 auto' }}>Google confirmó tu identidad. Preparando tu perfil en TunayWasi.</div>
          </div>
        )}

        {/* ── Verifica tu correo ── */}
        {paso === 'verifica_correo' && (
          // D-15-06 · paso 8: "¡Bienvenido/a!" (antes "Verifica tu correo", que AppONE saltaba al cargar el perfil)
          <div data-testid="onboarding-bienvenida" style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, color: '#fff', background: 'var(--tw-sage)' }}>✓</div>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--tw-sage)' }}>
              {rolRegistro === 'buyer_b2b' ? 'Negocio · Factura electrónica' : 'Comprador · Boleta electrónica'}
            </p>
            <h2 style={{ margin: '0 0 10px', fontSize: 28, fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, color: 'var(--tw-text)' }}>¡Bienvenido/a!</h2>
            <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--tw-text-muted)', lineHeight: 1.6 }}>
              {rolRegistro === 'buyer_b2b'
                ? 'Tu cuenta está creada. Revisaremos tu RUC y te avisaremos para activar las compras de café verde.'
                : 'Tu cuenta está lista para comprar.'}
            </p>
            <p style={{ margin: '0 0 24px', fontSize: 12, color: 'var(--tw-text-muted)', lineHeight: 1.6, padding: '10px 12px', borderRadius: 8, background: 'rgba(143,175,138,0.08)', border: '1px solid rgba(143,175,138,0.25)' }}>
              📬 Te enviamos un email para verificar tu correo{(email || pendingEmail) ? <> (<strong style={{ color: 'var(--tw-text)' }}>{email || pendingEmail}</strong>)</> : null}. Puedes hacerlo más tarde.
            </p>
            {error && <p style={{ color: error.startsWith('✓') ? 'var(--tw-sage)' : '#f87171', fontSize: 12, marginBottom: 16 }}>{error}</p>}
            <button
              onClick={() => { limpiarConfirmacion(); irTrasAcceso(rolRegistro, true) }}
              style={{ width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', cursor: 'pointer', marginBottom: 10 }}
            >
              {textoBotonTrasRegistro(rolRegistro)}
            </button>
            <button
              onClick={async () => {
                setError(null)
                try {
                  const { auth } = await import('@/shared/firebase')
                  if (auth.currentUser) {
                    const { sendEmailVerification } = await import('firebase/auth')
                    await sendEmailVerification(auth.currentUser)
                    setError('✓ Correo reenviado. Revisa tu bandeja.')
                  }
                } catch {
                  setError('No se pudo reenviar el correo. Inténtalo más tarde.')
                }
              }}
              style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--tw-text-muted)', fontSize: 12, fontWeight: 600, fontFamily: 'Montserrat, sans-serif', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Reenviar email de verificación
            </button>
          </div>
        )}

      </div>{/* /panel derecho */}
    </div>
  )
}

export default AuthScreen
