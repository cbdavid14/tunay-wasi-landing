// TunayWasi ONE — ruta de retorno tras login / registro (web 3.1 · AUTH-04 · GAP-F01-09/10/11)
//
// · irALogin() guarda la página desde la que se pide iniciar sesión (`returnTo`) y navega a /login.
// · destinoTrasAcceso() es la ÚNICA regla de destino, usada por AppONE y AuthScreen:
//     1. hay carrito          → /checkout
//     2. hay returnTo válido  → returnTo (si el rol puede verla)
//     3. si no                → cuenta nueva: /   ·   login: portal según el rol
// · returnTo se borra cuando el usuario, ya con sesión, llega a una ruta fuera del onboarding.
import { navigate } from '@/router'
import { esRutaOnboarding } from './onboarding'
import type { RolONE } from './types'

const K_RETURN = 'tw_return_to'
const CARRITO_KEY = 'one_carrito_items'

function ss(): Storage | null {
  try { return window.sessionStorage } catch { return null }
}

/** Solo rutas internas ("/x"), nunca "//host" ni URLs absolutas (evita open redirect). */
export function esRutaInternaSegura(ruta: string | null | undefined): ruta is string {
  return !!ruta && ruta.startsWith('/') && !ruta.startsWith('//') && !ruta.includes('\\') && ruta.length <= 300
}

export function guardarRetorno(ruta: string): void {
  const pathname = ruta.split('?')[0]
  if (!esRutaInternaSegura(ruta) || esRutaOnboarding(pathname)) return
  ss()?.setItem(K_RETURN, ruta)
}

export function leerRetorno(): string | null {
  const r = ss()?.getItem(K_RETURN) ?? null
  return esRutaInternaSegura(r) ? r : null
}

export function limpiarRetorno(): void {
  ss()?.removeItem(K_RETURN)
}

/**
 * Navega al login guardando la página actual como retorno.
 * Si ya estamos dentro del onboarding (/login, /registro…) conserva el retorno original.
 */
export function irALogin(opciones: { registro?: boolean } = {}): void {
  guardarRetorno(window.location.pathname + window.location.search)
  navigate(opciones.registro ? '/login?registro=1' : '/login')
}

function hayCarrito(): boolean {
  try {
    const raw = localStorage.getItem(CARRITO_KEY)
    if (!raw) return false
    const items = JSON.parse(raw) as unknown
    return Array.isArray(items) && items.length > 0
  } catch { return false }
}

function portalDeRol(rol: RolONE | null | undefined): string {
  if (rol === 'seller') return '/caficultor-portal'
  if (rol === 'admin') return '/admin'
  return '/portal'
}

/** ¿Puede este rol ver la ruta de retorno? Si no, se usa su portal. */
function rutaPermitida(ruta: string, rol: RolONE | null | undefined): boolean {
  const p = ruta.split('?')[0]
  if (p === '/admin' || p.startsWith('/admin/')) return rol === 'admin'
  if (p === '/caficultor-portal' || p === '/portal-caficultores') return rol === 'seller'
  if (p === '/portal' || p === '/checkout') return rol !== 'seller'
  return true
}

export function destinoTrasAcceso(rol: RolONE | null | undefined, esCuentaNueva: boolean): string {
  if (hayCarrito() && rol !== 'seller') return '/checkout'
  const r = leerRetorno()
  if (r && rutaPermitida(r, rol)) return r
  return esCuentaNueva ? '/' : portalDeRol(rol)
}

export function irTrasAcceso(rol: RolONE | null | undefined, esCuentaNueva = false): void {
  navigate(destinoTrasAcceso(rol, esCuentaNueva))
}
