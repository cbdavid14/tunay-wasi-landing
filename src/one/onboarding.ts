// TunayWasi ONE — embudo de onboarding (iter.16)
//
// Responde a "¿en qué paso se quedó el usuario?":
//   · Cada intento de registro tiene un `onboardingId` (sessionStorage), también si es anónimo.
//   · Al ENTRAR a cada pantalla se emite `onboarding_paso`; cada error visible emite `onboarding_error`.
//   · Al crear la cuenta se emite `registro_completado` con el mismo `onboardingId` y se guarda
//     `one_usuarios/{uid}.onboarding` → une el recorrido anónimo con el usuario creado.
//   · El último `paso` de un `onboardingId` sin `confirmacion` = punto de abandono.
//
// Sin PII: nunca se envía email, DNI, RUC ni nombre (Ley 29733).
// Los eventos van a `one_analytics` (regla create-only con esquema en firestore.rules).
import { useEffect, useRef } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/shared/firebase'
import { track } from './analytics'

export type FlujoOnboarding = 'b2c' | 'b2b' | 'caficultor' | 'desconocido'
/** P1 bienvenida (/login) · P2 ¿Quién eres? (/login?registro=1) · P3 registro persona (/registro) · directo = /registro-emprendedor o /registro-caficultor */
export type PuertaOnboarding = 'P1' | 'P2' | 'P3' | 'directo'
export type PasoOnboarding =
  | 'bienvenida' | 'email_login' | 'quien_eres' | 'selector_tipo'
  | 'cuenta' | 'identidad' | 'empresa' | 'finca' | 'revision' | 'confirmacion'
export type MetodoOnboarding = 'email' | 'google'
export type CodigoErrorOnboarding =
  | 'dni_duplicado' | 'ruc_duplicado' | 'email_en_uso' | 'credenciales' | 'google_cancelado' | 'red' | 'validacion' | 'otro'

const K_ID = 'tw_onboarding_id'
const K_ORIGEN = 'tw_onboarding_origen'
const K_PUERTA = 'tw_onboarding_puerta'
const K_HINT = 'tw_onboarding_hint'

function ss(): Storage | null {
  try { return window.sessionStorage } catch { return null }
}

/** Rutas que forman parte del onboarding */
export function esRutaOnboarding(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/login/') ||
    pathname === '/registro' || pathname === '/registro-emprendedor' || pathname === '/registro-caficultor'
}

export function puertaDeRuta(pathname: string, search: string): PuertaOnboarding {
  if (pathname === '/registro') return 'P3'
  if (pathname === '/registro-emprendedor' || pathname === '/registro-caficultor') return 'directo'
  return new URLSearchParams(search).get('registro') ? 'P2' : 'P1'
}

/**
 * Pista explícita del origen para el próximo onboarding (p. ej. 'modal_compra').
 * Llamar justo antes de navegar al login/registro; si no hay pista se usa la ruta previa.
 */
export function marcarOrigenOnboarding(origen: string): void {
  ss()?.setItem(K_HINT, origen.slice(0, 60))
}

/** Empieza un intento nuevo (llamado por AppONE al entrar a una ruta de onboarding desde fuera). */
export function iniciarOnboarding(rutaPrevia: string | null, puerta: PuertaOnboarding): void {
  const s = ss(); if (!s) return
  const hint = s.getItem(K_HINT)
  s.removeItem(K_HINT)
  const origen = hint ?? (rutaPrevia ? rutaPrevia.split('?')[0] : 'url_directa')
  s.setItem(K_ID, `ob_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`)
  s.setItem(K_ORIGEN, origen.slice(0, 60))
  s.setItem(K_PUERTA, puerta)
}

function contexto() {
  const s = ss()
  let id = s?.getItem(K_ID) ?? null
  if (!id && s) {
    // Entró al onboarding sin pasar por AppONE (no debería) → abrir intento igualmente
    id = `ob_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    s.setItem(K_ID, id)
  }
  return {
    onboardingId: id ?? 'sin_storage',
    origen: s?.getItem(K_ORIGEN) ?? 'desconocido',
    puerta: s?.getItem(K_PUERTA) ?? 'desconocido',
  }
}

export function pasoOnboarding(paso: PasoOnboarding, flujo: FlujoOnboarding, metodo: MetodoOnboarding): void {
  track('onboarding_paso', { ...contexto(), paso, flujo, metodo })
}

export function errorOnboarding(paso: PasoOnboarding, flujo: FlujoOnboarding, codigo: CodigoErrorOnboarding): void {
  track('onboarding_error', { ...contexto(), paso, flujo, codigo })
}

/** Clasifica un mensaje de error visible (sin enviarlo: puede contener datos del usuario). */
export function clasificarError(mensaje: string): CodigoErrorOnboarding {
  const m = mensaje.toLowerCase()
  if (m.includes('dni ya está registrado')) return 'dni_duplicado'
  if (m.includes('ruc ya está registrado')) return 'ruc_duplicado'
  if (m.includes('ya existe una cuenta') || m.includes('email-already-in-use')) return 'email_en_uso'
  if (m.includes('contraseña incorrecta') || m.includes('credencial') || m.includes('no existe una cuenta')) return 'credenciales'
  if (m.includes('popup') || m.includes('ventana de google')) return 'google_cancelado'
  if (m.includes('conexión') || m.includes('network')) return 'red'
  if (m.includes('no se pudo') || m.includes('intenta de nuevo') || m.includes('error')) return 'otro'
  return 'validacion'
}

/**
 * Cuenta creada: emite `registro_completado` con el recorrido y guarda el resumen en
 * `one_usuarios/{uid}.onboarding`. Fire-and-forget: nunca bloquea ni rompe el registro.
 */
export function completarOnboarding(uid: string, rol: string, flujo: FlujoOnboarding, metodo: MetodoOnboarding): void {
  const ctx = contexto()
  track('registro_completado', { rolUsuario: rol, ...ctx, flujo, metodo })
  if (uid) void updateDoc(doc(db, 'one_usuarios', uid), {
    onboarding: {
      estado: 'completo', flujo, metodo,
      puerta: ctx.puerta, origen: ctx.origen, onboardingId: ctx.onboardingId,
      completadoAt: new Date().toISOString(),
    },
  }).catch(() => {})
  const s = ss()
  s?.removeItem(K_ID); s?.removeItem(K_ORIGEN); s?.removeItem(K_PUERTA)
}

/**
 * Hook: emite `onboarding_paso` cada vez que cambia el paso visible y `onboarding_error`
 * cada vez que aparece un error. `paso = null` → pantalla que no se mide (cargando, reset…).
 * ⚠️ Llamarlo SIEMPRE antes de cualquier `return` condicional del componente (rules of hooks).
 */
export function useOnboardingTracking(
  paso: PasoOnboarding | null,
  flujo: FlujoOnboarding,
  metodo: MetodoOnboarding,
  error: string | null,
): void {
  const ultimoPaso = useRef<string | null>(null)
  const ultimoError = useRef<string | null>(null)
  useEffect(() => {
    if (!paso) return
    const clave = `${paso}|${flujo}`
    if (ultimoPaso.current === clave) return
    ultimoPaso.current = clave
    pasoOnboarding(paso, flujo, metodo)
  }, [paso, flujo, metodo])
  useEffect(() => {
    if (!error || error === ultimoError.current) { ultimoError.current = error; return }
    ultimoError.current = error
    errorOnboarding(paso ?? 'bienvenida', flujo, clasificarError(error))
  }, [error]) // eslint-disable-line react-hooks/exhaustive-deps
}
