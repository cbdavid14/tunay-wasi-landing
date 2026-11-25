import type { ProductoONE, FormatoONE, RolONE } from '../../types'

export type { FormatoONE }

export interface ModoSeleccion {
  seleccionados: Set<string>
  onToggle: (p: ProductoONE) => void
  onConfirmar: () => void
  confirmando?: boolean
  max: number
}

export interface ItemCarritoMin {
  producto: { id: string; nombre: string; precioBaseKgCents: number }
  formato: FormatoONE
  qty: number
}

export interface CatalogoProps {
  onSeleccionar?: (producto: ProductoONE, formato?: FormatoONE) => void
  onSolicitarCotizacion?: (producto: ProductoONE) => void
  modoSeleccion?: ModoSeleccion
  carritoCount?: number
  totalCarritoCents?: number
  onIrAlCheckout?: () => void
  carritoProductoIds?: Set<string>
  carritoLineas?: ItemCarritoMin[]
  isDemo?: boolean
  sidebarOffset?: number
  embeddedMode?: boolean
  hideFiltersHeader?: boolean
  rolUsuario?: RolONE | null
  userNombre?: string | null
  userUid?: string | null
  estadoAprobacionB2B?: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | null
  searchValue?: string
  onSearchChange?: (q: string) => void
}

export type ProductType = 'TYPE_A' | 'TYPE_B' | 'TYPE_C'
export type VisualQuality = 'Bueno' | 'Muy bueno' | 'Excepcional'

export interface MockCafe {
  id: number
  nombre: string
  caf: string
  region: string
  proceso: 'Lavado' | 'Natural' | 'Honey'
  productType: ProductType     // Verde=TYPE_A, Tostado=TYPE_B, Molido=TYPE_C
  visualQuality: VisualQuality // Nunca exponer puntaje SCA numérico (INV-04)
  precio: number
  notas: string
  emoji: string
  nivelEvidencia: 1 | 2 | 3
  foto?: string
  variedad?: string
  pricingMode?: 'FIXED' | 'NEGOTIABLE'  // PR-05: NEGOTIABLE habilita badge y flujo de cotización B2B
}

export const ORDER_PHASES = [
  { label: 'Pago confirmado', cls: 'pend-transit', banner: 'Pago confirmado · Gesha Lavado × 5 kg' },
  { label: 'Preparando tu pedido', cls: 'pend-preparing', banner: 'Preparando tu pedido (Gesha Lavado × 5 kg)' },
  { label: 'En camino — Shalom', cls: 'pend-transit', banner: 'En camino — Shalom · SH-09281734' },
  { label: '¡Entregado! Califica el café', cls: 'pend-delivered', banner: '¡Pedido entregado! Califica el café ⭐' },
]

export const PROCESO_BADGE: Record<string, { bg: string; color: string; border: string; label: string }> = {
  lavado:    { bg: 'rgba(59,130,246,.12)',  color: '#60a5fa', border: 'rgba(59,130,246,.25)',  label: 'Lavado' },
  natural:   { bg: 'rgba(239,68,68,.12)',   color: '#f87171', border: 'rgba(239,68,68,.25)',   label: 'Natural' },
  honey:     { bg: 'rgba(245,158,11,.12)',  color: '#fbbf24', border: 'rgba(245,158,11,.25)',  label: 'Honey' },
  tostado:   { bg: 'rgba(143,175,138,.12)', color: 'var(--tw-sage)', border: 'rgba(143,175,138,.25)', label: 'Tostado' },
  anaerobic: { bg: 'rgba(167,139,250,.12)', color: '#a78bfa', border: 'rgba(167,139,250,.25)', label: 'Anaeróbico' },
}

// TYPE_A=Café verde, TYPE_B=Café tostado, TYPE_C=Café molido (no depende del puntaje SCA — CAL-01)
export type TipoProducto = ProductType

export const TIPO_LABEL: Record<ProductType, string> = {
  TYPE_A: 'Verde',
  TYPE_B: 'Tostado',
  TYPE_C: 'Molido',
}

export const CALIDAD_BADGE: Record<VisualQuality, { bg: string; color: string }> = {
  'Bueno':       { bg: 'rgba(100,100,100,.12)', color: '#a0a0a0' },
  'Muy bueno':   { bg: 'rgba(201,110,75,.12)',  color: '#c96e4b' },
  'Excepcional': { bg: 'rgba(143,175,138,.15)', color: '#8faf8a' },
}

export const FORMATOS_DETALLE = [
  { key: '250g', label: '250g', kgFactor: 0.25 },
  { key: '500g', label: '500g', kgFactor: 0.5 },
  { key: '1kg',  label: '1 kg',  kgFactor: 1 },
  { key: '5kg',  label: '5 kg',  kgFactor: 5 },
]
