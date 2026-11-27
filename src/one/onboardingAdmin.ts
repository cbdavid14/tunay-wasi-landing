// TunayWasi ONE — lectura y cálculo del embudo de onboarding para el admin (iter.16)
// Lectura permitida solo a admin con email verificado (firestore.rules: one_analytics, one_onboarding_incompletos).
import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { db } from '@/shared/firebase'

export interface EventoOnboarding {
  evento: 'onboarding_paso' | 'onboarding_error' | 'registro_completado'
  onboardingId?: string
  paso?: string
  flujo?: string
  puerta?: string
  origen?: string
  metodo?: string
  codigo?: string
  mobile?: boolean
  fecha?: string
  tsMs: number
}

export interface Intento {
  id: string
  flujo: string
  puerta: string
  origen: string
  metodo: string
  mobile: boolean
  pasos: Set<string>
  ultimoPaso: string
  completado: boolean
  errores: { paso: string; codigo: string }[]
  inicioMs: number
}

export interface Desglose { clave: string; iniciados: number; completados: number; pct: number }

export interface ResumenEmbudo {
  intentos: number
  completados: number
  conversionPct: number
  embudo: { paso: string; llegaron: number; pct: number }[]
  abandonos: { paso: string; cantidad: number; pct: number }[]
  porPuerta: Desglose[]
  porOrigen: Desglose[]
  porMetodo: Desglose[]
  porDispositivo: Desglose[]
  errores: { codigo: string; paso: string; cantidad: number }[]
}

export interface CuentaIncompleta {
  uid: string
  email: string | null
  nombre: string | null
  proveedor: string
  emailVerificado: boolean
  creadoAt: string
  ultimoAccesoAt: string | null
  diasDesdeAlta: number
}

/** Orden lógico de pasos por flujo (las puertas P2/P3 empiezan más adelante). */
export const ORDEN_PASOS: Record<string, string[]> = {
  b2c: ['bienvenida', 'email_login', 'quien_eres', 'selector_tipo', 'cuenta', 'identidad', 'confirmacion'],
  b2b: ['bienvenida', 'email_login', 'quien_eres', 'selector_tipo', 'cuenta', 'empresa', 'revision', 'confirmacion'],
  caficultor: ['bienvenida', 'email_login', 'quien_eres', 'cuenta', 'finca', 'identidad', 'confirmacion'],
  todos: ['bienvenida', 'email_login', 'quien_eres', 'selector_tipo', 'cuenta', 'identidad', 'empresa', 'finca', 'revision', 'confirmacion'],
}

const EVENTOS = new Set(['onboarding_paso', 'onboarding_error', 'registro_completado'])

export async function fetchEventosOnboarding(dias: number): Promise<EventoOnboarding[]> {
  const desde = new Date(Date.now() - dias * 864e5).toISOString().slice(0, 10)
  // Solo filtro por `fecha` (índice simple automático); el tipo de evento se filtra en cliente
  const snap = await getDocs(query(collection(db, 'one_analytics'), where('fecha', '>=', desde), limit(20000)))
  const out: EventoOnboarding[] = []
  snap.forEach(d => {
    const x = d.data() as Record<string, unknown>
    if (!EVENTOS.has(String(x.evento))) return
    const ts = x.ts as { toMillis?: () => number } | undefined
    out.push({ ...(x as unknown as EventoOnboarding), tsMs: ts?.toMillis?.() ?? 0 })
  })
  return out.sort((a, b) => a.tsMs - b.tsMs)
}

export async function fetchCuentasIncompletas(): Promise<CuentaIncompleta[]> {
  const snap = await getDocs(collection(db, 'one_onboarding_incompletos'))
  return snap.docs
    .map(d => ({ uid: d.id, ...(d.data() as Omit<CuentaIncompleta, 'uid'>) }))
    .sort((a, b) => a.diasDesdeAlta - b.diasDesdeAlta)
}

/** Agrupa eventos por intento (`onboardingId`). Función pura. */
export function agruparIntentos(eventos: EventoOnboarding[]): Intento[] {
  const mapa = new Map<string, Intento>()
  for (const e of eventos) {
    if (!e.onboardingId) continue          // registro_completado antiguo (sin iter.16)
    let it = mapa.get(e.onboardingId)
    if (!it) {
      it = {
        id: e.onboardingId, flujo: 'desconocido', puerta: e.puerta ?? 'desconocido', origen: e.origen ?? 'desconocido',
        metodo: e.metodo ?? 'email', mobile: !!e.mobile, pasos: new Set(), ultimoPaso: 'bienvenida',
        completado: false, errores: [], inicioMs: e.tsMs,
      }
      mapa.set(e.onboardingId, it)
    }
    if (e.flujo && e.flujo !== 'desconocido') it.flujo = e.flujo
    if (e.metodo) it.metodo = e.metodo
    if (e.evento === 'onboarding_paso' && e.paso) {
      it.pasos.add(e.paso)
      it.ultimoPaso = e.paso
      if (e.paso === 'confirmacion') it.completado = true
    } else if (e.evento === 'onboarding_error') {
      it.errores.push({ paso: e.paso ?? '?', codigo: e.codigo ?? 'otro' })
    } else if (e.evento === 'registro_completado') {
      it.completado = true
      it.pasos.add('confirmacion')
    }
  }
  return [...mapa.values()]
}

function desglosar(intentos: Intento[], clave: (i: Intento) => string, top = 10): Desglose[] {
  const m = new Map<string, { iniciados: number; completados: number }>()
  for (const i of intentos) {
    const k = clave(i)
    const v = m.get(k) ?? { iniciados: 0, completados: 0 }
    v.iniciados++; if (i.completado) v.completados++
    m.set(k, v)
  }
  return [...m.entries()]
    .map(([k, v]) => ({ clave: k, ...v, pct: v.iniciados ? Math.round((v.completados / v.iniciados) * 100) : 0 }))
    .sort((a, b) => b.iniciados - a.iniciados)
    .slice(0, top)
}

/** Calcula el embudo para un flujo ('todos' incluye los que abandonaron antes de elegir rol). Función pura. */
export function calcularEmbudo(todos: Intento[], flujo: string): ResumenEmbudo {
  const intentos = flujo === 'todos' ? todos : todos.filter(i => i.flujo === flujo)
  const total = intentos.length
  const completados = intentos.filter(i => i.completado).length
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0)

  const orden = ORDEN_PASOS[flujo] ?? ORDEN_PASOS.todos
  const embudo = orden
    .map(paso => ({ paso, llegaron: intentos.filter(i => i.pasos.has(paso)).length }))
    .filter(f => f.llegaron > 0)
    .map(f => ({ ...f, pct: pct(f.llegaron, total) }))

  const abandonan = intentos.filter(i => !i.completado)
  const cuenta = new Map<string, number>()
  abandonan.forEach(i => cuenta.set(i.ultimoPaso, (cuenta.get(i.ultimoPaso) ?? 0) + 1))
  const abandonos = [...cuenta.entries()]
    .map(([paso, cantidad]) => ({ paso, cantidad, pct: pct(cantidad, abandonan.length) }))
    .sort((a, b) => b.cantidad - a.cantidad)

  const err = new Map<string, number>()
  intentos.forEach(i => i.errores.forEach(e => { const k = `${e.codigo}|${e.paso}`; err.set(k, (err.get(k) ?? 0) + 1) }))
  const errores = [...err.entries()]
    .map(([k, cantidad]) => { const [codigo, paso] = k.split('|'); return { codigo, paso, cantidad } })
    .sort((a, b) => b.cantidad - a.cantidad)

  return {
    intentos: total, completados, conversionPct: pct(completados, total), embudo, abandonos,
    porPuerta: desglosar(intentos, i => i.puerta),
    porOrigen: desglosar(intentos, i => i.origen, 8),
    porMetodo: desglosar(intentos, i => i.metodo),
    porDispositivo: desglosar(intentos, i => (i.mobile ? 'móvil' : 'escritorio')),
    errores,
  }
}
