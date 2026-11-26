// TunayWasi ONE — tipos de datos
// Noviembre 2026 — alineado al esquema Android

// ─── CAFICULTOR ─────────────────────────────────────────────────────────────
// El perfil del caficultor ahora vive dentro de one_usuarios (rol='seller')
// CaficultorONE es la vista pública del caficultor para el catálogo

export interface CaficultorONE {
  id: string
  nombre: string
  foto: string                    // URL Firebase Storage o Cloudinary
  region: string                  // "Cajamarca"
  distrito: string                // "San Ignacio"
  altitudMsnm: number             // 1800
  historia: string                // Texto corto ~100 palabras
  coordenadas?: {
    lat: number
    lng: number
  }
  activo: boolean
  createdAt: string

  // Score de confianza — agregado de calificaciones de negocios
  scoreConfianza?: number         // Promedio 1-5, calculado al guardar calificación
  totalCalificaciones?: number    // Conteo total para mostrar "basado en N pedidos"
}

// ─── PRODUCTO ────────────────────────────────────────────────────────────────

export type ProcesoONE = 'lavado' | 'natural' | 'honey' | 'anaerobico'
export type StatusProductoONE = 'activo' | 'agotado' | 'pausado'
export type PresentacionONE = 'tostado_grano' | 'tostado_molido'
export type NivelTuesteONE = 'claro' | 'medio' | 'oscuro'
// tipoCafe — campo Firestore para distinguir café verde (sin tostar) de tostado/molido
export type TipoCafeONE = 'verde' | 'verde_grano' | 'cafe_verde' | 'tostado' | 'tostado_grano' | 'tostado_molido' | 'molido'

// Costos privados del caficultor — no se exponen al comprador
export interface CostosProductoONE {
  precioVerdeKgCents: number      // Lo que paga al productor por kg verde
  costoTuesteKgCents: number      // Cobro de tostadora por kg
  costoBolsaUndCents: number      // Costo de bolsa/empaque por unidad
  margenPct: number               // 10 | 20 | 30 | 40 | 50
}

export interface ProductoONE {
  id: string
  caficultorId: string            // FK → one_usuarios (rol=caficultor)
  caficultorNombre: string        // Desnormalizado para queries rápidas
  caficultorRegion?: string       // Desnormalizado para agrupar en carrito

  // Identidad del café
  nombre: string                  // "Bourbon Lavado — Los Alisos"
  variedad: string                // "Bourbon"
  proceso: ProcesoONE
  presentacion: PresentacionONE  // 'tostado_grano' | 'tostado_molido'
  tipoCafe?: TipoCafeONE         // Campo Firestore: 'verde' | 'tostado' | 'tostado_molido' | etc.
  nivelTueste: NivelTuesteONE    // definido por el caficultor según variedad/proceso
  altitudMsnm: number
  cosecha: string                 // "06/2026"
  notasSabor: string[]            // ["durazno", "panela", "chocolate"] — verificados post-tueste
  descripcion: string             // Texto libre ~50 palabras

  // Calidad (referencial, sin Q-Grader por ahora)
  puntajeReferencial?: number     // ~86 pts — declarado por caficultor
  notaReferencial: string         // "Puntaje referencial — certificación independiente próximamente"

  // Costos privados — solo visibles para el caficultor en su portal
  costos: CostosProductoONE

  // Precio base por kg en centavos (ej: 5000 = S/50.00/kg)
  // Los formatos (250g, 500g, 1kg, 5kg) se calculan en el frontend desde este valor
  precioBaseKgCents: number

  // Stock
  kgDisponibles: number
  kgReservados: number

  status: StatusProductoONE
  pricingMode?: 'FIXED' | 'NEGOTIABLE'  // NEGOTIABLE habilita flujo de cotización B2B
  formatosDisponibles?: FormatoONE[]    // Presentaciones que ofrece (solo tostado/molido)
  fotos: string[]                 // URLs Firebase Storage (hasta 5)
  foto: string                    // Foto principal (primera de fotos o legacy)

  createdAt: string
  updatedAt: string
}

// Helper: calcula precio de una presentación a partir de precioBaseKgCents
export function calcPrecio(precioBaseKgCents: number, presentacionKg: number, descuentoPct = 0): number {
  const precio = precioBaseKgCents * presentacionKg
  return Math.round(precio * (1 - descuentoPct / 100))
}

// Presentaciones disponibles con sus kg equivalentes
export const PRESENTACIONES = [
  { label: '250g', kg: 0.25, presentacion: '250g' },
  { label: '500g', kg: 0.5,  presentacion: '500g' },
  { label: '1kg',  kg: 1.0,  presentacion: '1kg'  },
  { label: '5kg',  kg: 5.0,  presentacion: '5kg'  },
] as const

// FIXED → presentaciones pequeñas B2C/B2B; NEGOTIABLE → volúmenes B2B (PR-05)
export type FormatoONE = '250g' | '500g' | '1kg' | '5kg' | '10kg' | '20kg' | '1quintal' | '1saco'

// ─── PEDIDO ──────────────────────────────────────────────────────────────────

export type PagoStatusONE = 'pendiente' | 'voucher_subido' | 'verificado' | 'rechazado'
export type LogisticaStatusONE = 'preparando' | 'en_agencia' | 'entregado' | 'en_disputa' | 'resuelto_ok'
export type AgenciaONE = 'olva' | 'shalom' | 'servientrega' | 'otra'

export interface ItemPedidoONE {
  productoId: string
  productoNombre: string
  caficultorId: string            // FK → one_usuarios (rol=caficultor)
  caficultorNombre: string
  presentacion: FormatoONE        // '250g' | '500g' | '1kg' | '5kg' (alineado con Android)
  qty: number                     // Número de unidades de la presentación
  unitCents: number               // Precio unitario en centavos
  subtotalCents: number
  menuId?: string                 // FK → one_menus (si viene de "Reponer menú")
}

export interface PedidoONE {
  id: string                      // ONE-{año}-{4 dígitos random}

  // Nuevo modelo: un caficultor por pedido
  caficultorId?: string           // FK → one_usuarios (rol=caficultor) — requerido en modelo nuevo

  // Grupo de checkout (cuando se compraron productos de múltiples caficultores)
  grupoCheckoutId?: string        // Formato: "grupo-{timestamp}-{negocioId.slice(0,6)}"
  subPedidoLetra?: string         // 'A' | 'B' | 'C' | ... — orden dentro del grupo

  // Comprador (negocio)
  negocioId: string               // FK → one_usuarios (rol=negocio)
  negocioNombre: string
  negocioEmail: string
  negocioTelefono: string
  negocioRazonSocial?: string     // Razón social empresa B2B
  negocioRuc?: string             // RUC empresa B2B

  // Datos del local
  nombreLocal: string             // "Café El Origen"
  distritoLocal: string           // "Miraflores"

  items: ItemPedidoONE[]

  // Totales
  subtotalCents: number
  deliveryCents: number
  totalCents: number

  // Pago
  metodoPago: 'yape' | 'transferencia'
  pagoStatus: PagoStatusONE
  voucherUrl?: string

  // Logística
  direccionEntrega?: string
  logisticaStatus: LogisticaStatusONE
  notasEntrega?: string
  disputaId?: string

  // Envío por agencia
  agencia?: AgenciaONE
  codigoAgencia?: string
  fotoDespacho?: string
  recepcionConfirmada: boolean

  // DEPRECATED — modelo anterior (pedido multi-caficultor). Mantener por compatibilidad con pedidos legacy.
  // En el modelo nuevo cada pedido tiene un solo caficultor — usar caficultorId en raíz.
  envioDetalle?: Record<string, {
    tipo: 'agencia' | 'domicilio'
    agencia?: string
    costoCents: number
    gratis: boolean
  }>

  // DEPRECATED — modelo anterior (pedido multi-caficultor). Mantener por compatibilidad con pedidos legacy.
  // En el modelo nuevo la logística vive en los campos raíz del pedido (logisticaStatus, codigoAgencia, etc.)
  enviosCaficultor?: Record<string, {
    codigoAgencia: string
    agencia?: AgenciaONE
    fotoDespacho?: string
    logisticaStatus: LogisticaStatusONE
  }>

  // Kit de identidad
  kitGenerado: boolean
  kitId?: string                  // FK → one_kits

  // Calificación post-entrega
  calificado: boolean
  calificacionId?: string

  esKitProveedor: boolean

  // Cancelación (US-447): solo desde PAID, antes de despacho
  cancelado?: boolean
  motivoCancelacion?: string
  cancellationReason?: string    // "BUYER_REQUEST" | "SELLER_CANCELLED" | "PAYMENT_EXPIRED" | "ADMIN"
  canceladoAt?: string

  isReposicion?: boolean
  reposicionIds?: string[]

  // ORD-02: expiresAt = createdAt + 24h — comprador tiene 24h para subir voucher
  expiresAt?: string

  createdAt: string
  updatedAt: string
}

// ─── USUARIO ─────────────────────────────────────────────────────────────────

export type RolONE = 'buyer_b2c' | 'buyer_b2b' | 'seller' | 'admin'
export type EtapaNegocio = 'planificando' | 'proxima_apertura' | 'abierto'

// Estado de aprobación B2B — controlado solo por admin (US-02)
export type EstadoAprobacionB2B = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'

export interface ConsumidorB2C {
  dni?: string
  dirEntrega?: string | null
  referencia?: string | null
}

export interface DireccionEnvioONE {
  id: string
  tipo: string               // 'local' | 'domicilio' | 'almacen'
  nombre: string
  direccion: string
  distrito: string
  provincia: string
  departamento: string
  codigoPostal: string
  referencia: string
  telefono: string
  esPrincipal: boolean
}

export interface NegocioB2B {
  nombreLocal: string
  distritoLocal: string
  fotoLocal?: string
  descripcion?: string
  etapa: EtapaNegocio
  fechaAperturaEstimada?: string
  pedidoIds: string[]
  scoreConfianza?: number
  totalCalificaciones?: number
  direcciones?: DireccionEnvioONE[]
}

export interface EmpresaB2B {
  ruc: string                        // 11 dígitos, validado SUNAT
  razonSocial: string                // Auto-completado SUNAT
  dirFiscal: string
  dirEnvio: string
  estadoAprobacion: EstadoAprobacionB2B
  aprobadoPor?: string               // uid del admin que aprobó/rechazó
  aprobadoAt?: string
  motivoRechazo?: string
  solicitudAt: string                // Fecha de envío de la solicitud
}

export interface UsuarioONE {
  uid: string
  rol: RolONE
  nombre: string
  email?: string
  telefono?: string

  // Solo para buyer_b2c (consumidor final)
  consumidor?: ConsumidorB2C

  // Solo para buyer_b2b (comprador comercial — datos del local/cafetería)
  negocio?: NegocioB2B

  // Solo para buyer_b2b (datos fiscales — requiere aprobación admin)
  empresa?: EmpresaB2B

  // Solo para seller (caficultor)
  caficultor?: {
    region: string
    distrito: string
    altitudMsnm?: number
    historia?: string
    foto?: string
    coordenadas?: { lat: number; lng: number }
    activo: boolean
  }

  createdAt: string

  // KYC — verificación de identidad caficultor
  estadoKyc?: 'PENDING_REVIEW' | 'ACTIVO' | 'RECHAZADO'
  fotoDniUrl?: string
  fotoSelfieUrl?: string
}

// Vista para el panel admin (incluye datos B2B resumidos)
export interface SolicitudB2B {
  uid: string
  nombre: string
  email: string
  telefono?: string
  empresa: EmpresaB2B
  createdAt: string
}

// ─── KIT DE IDENTIDAD ────────────────────────────────────────────────────────

export interface ProductoEnKitONE {
  caficultorNombre: string
  caficultorFoto: string
  caficultorRegion: string
  caficultorAltitud: number
  caficultorHistoria: string
  productoNombre: string
  variedad: string
  proceso: string
  notasSabor: string[]
  puntajeReferencial?: number
}

export interface KitIdentidadONE {
  id: string
  pedidoId: string                // FK → one_pedidos
  negocioId: string
  nombreLocal: string

  productos: ProductoEnKitONE[]

  menuPdfUrl?: string
  fichasUrl?: string
  qrUrl?: string
  instagramPackUrl?: string

  createdAt: string
}

// ─── INPUTS PARA CREAR ───────────────────────────────────────────────────────

export interface CreatePedidoInput {
  negocioId: string
  negocioNombre: string
  negocioEmail: string
  negocioTelefono: string
  negocioRazonSocial?: string
  negocioRuc?: string
  nombreLocal: string
  distritoLocal: string
  items: Omit<ItemPedidoONE, 'subtotalCents'>[]
  metodoPago: 'yape' | 'transferencia'
  direccionEntrega?: string
  agencia?: AgenciaONE
  esKitProveedor: boolean
  isReposicion?: boolean
  reposicionIds?: string[]
  envioDetalle?: Record<string, { tipo: 'agencia' | 'domicilio'; agencia?: string; costoCents: number; gratis: boolean }>
  deliveryCentsOverride?: number
  // Nuevo modelo: campos para pedido por caficultor
  caficultorId?: string           // El único caficultor de este pedido (nuevo modelo)
  grupoCheckoutId?: string        // ID compartido entre pedidos del mismo checkout
  subPedidoLetra?: string         // 'A', 'B', 'C'... — orden dentro del grupo
}

export interface CreateUsuarioInput {
  uid: string
  rol: RolONE
  nombre: string
  email?: string
  telefono?: string
  consumidor?: ConsumidorB2C
  negocio?: NegocioB2B
  empresa?: EmpresaB2B
  caficultor?: UsuarioONE['caficultor']
  estadoKyc?: 'PENDING_REVIEW' | 'ACTIVO' | 'RECHAZADO'
  fotoDniUrl?: string
  fotoSelfieUrl?: string
}

// ─── CALIFICACIONES ──────────────────────────────────────────────────────────

// Negocio califica al caficultor después de recibir el pedido
export interface CalificacionCaficultor {
  id: string
  pedidoId: string                // FK → one_pedidos (1 calificación por pedido)
  caficultorId: string            // FK → one_usuarios (rol=caficultor)
  negocioId: string               // FK → one_usuarios (rol=negocio)
  negocioNombre: string           // Desnormalizado
  nombreLocal: string             // Negocio que califica
  estrellas: 1 | 2 | 3 | 4 | 5
  comentario?: string
  createdAt: string
}

// Cliente final califica la cafetería desde PerfilCaficultor (QR en la mesa)
export interface CalificacionCafeteria {
  id: string
  caficultorId: string
  productoId?: string
  nombreLocal: string
  distritoLocal: string
  estrellas: 1 | 2 | 3 | 4 | 5
  comentario?: string
  createdAt: string
}

export interface CreateCalificacionCaficultorInput {
  pedidoId: string
  caficultorId: string
  negocioId: string
  negocioNombre: string
  nombreLocal: string
  estrellas: 1 | 2 | 3 | 4 | 5
  comentario?: string
}

export interface CreateCalificacionCafeteriaInput {
  caficultorId: string
  productoId?: string
  nombreLocal: string
  distritoLocal: string
  estrellas: 1 | 2 | 3 | 4 | 5
  comentario?: string
}

// ─── CHAT / MENSAJES ─────────────────────────────────────────────────────────

export type AutorMensajeONE = 'buyer_b2b' | 'seller'

export interface MensajePedidoONE {
  id: string
  pedidoId: string
  caficultorId?: string            // hilo por caficultor (multi-vendor)
  autorId: string                  // uid del remitente
  autorNombre: string
  autorRol: AutorMensajeONE
  texto: string
  imageUrl?: string                // imagen adjunta opcional
  tipo: 'texto' | 'tracking' | 'imagen'
  createdAt: string
}

export interface SendMensajeInput {
  pedidoId: string
  caficultorId?: string
  autorId: string
  autorNombre: string
  autorRol: AutorMensajeONE
  texto: string
  imageUrl?: string
  tipo?: MensajePedidoONE['tipo']
}

// ─── LOGÍSTICA CAFICULTOR ─────────────────────────────────────────────────────

export interface AgenciaLogisticaONE {
  id: string
  nombre: string
  direccion?: string
  horario?: string
  permiteDomicilio?: boolean   // si esta agencia también hace entrega a domicilio
  diasMin?: number             // tiempo estimado mínimo de tránsito (días hábiles)
  diasMax?: number             // tiempo estimado máximo de tránsito (días hábiles)
}

export interface UbigeoONE {
  id: string
  departamento: string
  provincia: string
  distrito: string
  agencias: AgenciaLogisticaONE[]
}

export interface LogisticaCaficultorONE {
  ubigeo: string
  departamento: string
  provincia: string
  distrito: string
  origenTexto: string
  agencias: string[]                          // IDs de agencias activas
  agenciasMap: Record<string, string>         // id → nombre
  agenciasActivas: Record<string, boolean>
  agenciasPermiteDomicilio: Record<string, boolean>  // legacy — usar AgenciaLogisticaONE.permiteDomicilio
  agenciasDetalle?: Record<string, AgenciaLogisticaONE>  // id → detalle completo (días, domicilio)
  // Reglas de envío gratis (SHP-03)
  gratisAgenciaActivo?: boolean
  gratisAgenciaKg?: number
  gratisDomicilioActivo?: boolean
  gratisDomicilioKg?: number
  tarifaFijaAgenciaSoles?: number
  tarifaFijaDomicilioSoles?: number
}

export interface SaveLogisticaInput {
  caficultorId: string
  ubigeo: string
  departamento: string
  provincia: string
  distrito: string
  agencias: string[]
  agenciasMap: Record<string, string>
  agenciasActivas: Record<string, boolean>
  agenciasPermiteDomicilio: Record<string, boolean>
  agenciasDetalle?: Record<string, AgenciaLogisticaONE>
  // Reglas de envío gratis (SHP-03)
  gratisAgenciaActivo?: boolean
  gratisAgenciaKg?: number
  gratisDomicilioActivo?: boolean
  gratisDomicilioKg?: number
  tarifaFijaAgenciaSoles?: number
  tarifaFijaDomicilioSoles?: number
}



export interface PreparacionMenu {
  nombre: string                        // "Espresso", "V60", "Cold Brew"
  precio: number                        // En soles (ej: 12)
  metodo: string                        // "Espresso", "Filtrado V60", etc.
  categoria: 'ESPRESSO' | 'FILTER' | 'FRÍO'
  caficultorNombre: string              // "Aydé Lloclla Díaz"
  origen: string                        // "Geisha Natural · Aydé Lloclla · Cajamarca"
  notas: string[]                       // ["durazno", "panela", "jazmín"]
}

export interface MenuONE {
  id: string
  negocioId: string               // FK → one_usuarios (rol=negocio)
  nombre: string
  descripcion?: string
  cafesIds: string[]
  preparaciones: PreparacionMenu[]
  activo: boolean
  qrUrl: string
  createdAt: string
  updatedAt: string
}

export interface CreateMenuInput {
  negocioId: string
  nombre: string
  descripcion?: string
  cafesIds: string[]
  preparaciones?: PreparacionMenu[]
}

// ─── COTIZACIONES B2B ─────────────────────────────────────────────────────────
// Flujo: negocio solicita → caficultor responde → hasta 3 rondas (US-B2B-04/05)

export type EstadoCotizacion =
  | 'ENVIADA'        // negocio envió solicitud inicial
  | 'RESPONDIDA'     // caficultor respondió (precio final o contraoferta del caficultor)
  | 'CONTRAOFERTA'   // comprador contraofertó (la pelota está en el caficultor)
  | 'ACEPTADA'       // negocio aceptó la oferta del caficultor
  | 'RECHAZADA'      // cualquiera rechazó en alguna ronda
  | 'EXPIRADA'       // sin respuesta en 7 días

export interface RondaCotizacion {
  ronda: number                      // 1, 2 o 3
  autorRol: 'buyer_b2b' | 'seller'
  kgSolicitados: number
  precioOfertadoCents: number        // precio por kg en centavos
  plazoEntrega: string               // "7 días", "10-15 días"
  mensaje?: string
  createdAt: string
}

export interface CotizacionONE {
  id: string
  productoId: string
  productoNombre: string
  caficultorId: string
  caficultorNombre: string
  negocioId: string
  negocioNombre: string
  negocioRazonSocial?: string        // razón social de la empresa B2B
  negocioRuc?: string                // RUC empresa B2B (B2B-05 / TRIB-02)
  estado: EstadoCotizacion
  rondas: RondaCotizacion[]
  rondaActual: number                // 1–3
  expiraAt?: string                  // ISO — 7d para negociación activa; null al ACEPTAR/RECHAZAR
  pedidoId?: string                  // si se convirtió en pedido
  createdAt: string
  updatedAt: string
}

export interface CreateCotizacionInput {
  productoId: string
  productoNombre: string
  caficultorId: string
  caficultorNombre: string
  negocioId: string
  negocioNombre: string
  negocioRazonSocial?: string
  negocioRuc?: string               // RUC empresa B2B — forwarded to pedido on accept
  kgSolicitados: number
  precioOfertadoCents: number
  plazoEntrega: string
  mensaje?: string
}

export interface ResponderCotizacionInput {
  cotizacionId: string
  autorRol: 'buyer_b2b' | 'seller'
  accion: 'aceptar' | 'rechazar' | 'contraofertar'
  kgSolicitados?: number
  precioOfertadoCents?: number
  plazoEntrega?: string
  mensaje?: string
}

// ─── PAGOS CAFICULTOR ─────────────────────────────────────────────────────────
// Registro de cada pago liberado por TW al caficultor (escrow → pago)

export type EstadoPagoCaficultor = 'PENDIENTE' | 'LIBERADO' | 'RETENIDO'
// ESC-05 INVARIANTE: caficultor recibe solo vía transferencia bancaria (BCP/Interbank/BN) — sin Yape
export type MetodoPagoCaficultor = 'transferencia_bcp' | 'transferencia_interbank' | 'transferencia_bn'

export interface PagoCaficultorONE {
  id: string
  caficultorId: string
  pedidoId: string
  pedidoRef: string                  // e.g. "ONE-2026-0042"
  negocioNombre: string
  montoBrutoCents: number            // Total del pedido
  montoNetoCents: number             // Después de comisión TW (fase 1 = mismo)
  estado: EstadoPagoCaficultor
  metodoPago?: MetodoPagoCaficultor
  cuentaDestino?: string             // CCI (BCP/Interbank/BN) — ESC-05: solo transferencia bancaria
  liberadoPor?: string               // UID del admin que liberó
  liberadoAt?: string                // ISO
  motivo?: string                    // Si está retenido: motivo
  createdAt: string
}

// ─── EVIDENCIAS / REVIEWER ───────────────────────────────────────────────────
// Gestión N1/N2/N3 de evidencias de calidad para lotes (US-27, US-33)

export type NivelEvidencia = 'N1' | 'N2' | 'N3'
export type EstadoEvidencia =
  | 'PENDING_REVIEW'   // Subida por caficultor, esperando revisión
  | 'APPROVED'         // Aprobada por reviewer
  | 'REJECTED'         // Rechazada con motivo
  | 'DISPUTED'         // Caficultor apeló el rechazo

export interface EvidenciaONE {
  id: string
  productoId: string
  productoNombre: string
  caficultorId: string
  caficultorNombre: string
  nivel: NivelEvidencia              // N1=foto lote, N2=ficha catación, N3=cert laboratorio
  titulo: string                     // Nombre que da el caficultor
  descripcion?: string
  archivoUrl: string                 // URL Firebase Storage
  archivoTipo: 'imagen' | 'pdf'
  estado: EstadoEvidencia
  revisadoPor?: string               // UID del reviewer
  revisadoAt?: string                // ISO
  motivoRechazo?: string
  aiSuggest?: string                 // Sugerencia automática del sistema
  createdAt: string
  updatedAt: string
}

export interface AprobarEvidenciaInput {
  evidenciaId: string
  reviewerUid: string
}

export interface RechazarEvidenciaInput {
  evidenciaId: string
  reviewerUid: string
  motivo: string
}

// ─── RECLAMOS / DEVOLUCIONES ─────────────────────────────────────────────────
// Negocio reporta problema → TW intermedia → resolución en ≤48h

export type TipoReclamo =
  | 'producto_danado'       // Café llegó dañado o deteriorado
  | 'cantidad_incorrecta'   // Faltan unidades o kg
  | 'producto_incorrecto'   // Enviaron producto diferente al pedido
  | 'calidad_no_corresponde' // Calidad real difiere de la descripción
  | 'entrega_tardía'        // Superó el plazo acordado
  | 'otro'

export type EstadoReclamo =
  // ── Estados v1 (compatibilidad) ────────────────────────────────────────────
  | 'ABIERTO'               // Recién reportado, pendiente de revisión TW
  | 'EN_REVISION'           // TW está evaluando
  | 'ESPERANDO_INFO'        // TW pide más info al negocio
  | 'RESUELTO_FAVOR'        // Resuelto a favor del negocio (reembolso/reenvío)
  | 'RESUELTO_PARCIAL'      // Resolución parcial acordada
  | 'CERRADO'               // Sin proceder (improcedente o plazo expirado)
  // ── Estados v2.0 — Modelo operativo ────────────────────────────────────────
  | 'ESCALADO'              // Escalado a revisor especial
  | 'DECISION_PENDIENTE'    // Decisión tomada, pendiente de ejecución
  | 'RESOLUCION_COMPRADOR'  // Resolución a favor del comprador (en proceso)
  | 'RESOLUCION_CAFICULTOR' // Resolución a favor del caficultor (en proceso)
  | 'EJECUCION_FINANCIERA'  // Reembolso en proceso de pago
  | 'RESUELTO_COMPRADOR'    // Reembolso aprobado y ejecutado
  | 'RESUELTO_CAFICULTOR'   // Cerrado sin reembolso
  | 'EJECUCION_FALLIDA'     // Error en la ejecución del reembolso

export type ResolucionReclamo =
  | 'reembolso_total'
  | 'reembolso_parcial'
  | 'reenvio_producto'
  | 'descuento_proximo_pedido'
  | 'sin_lugar'

export interface ReclamoONE {
  id: string
  pedidoId: string
  pedidoRef: string               // e.g. "ONE-2026-0042"
  negocioId: string
  negocioNombre: string
  caficultorId: string
  caficultorNombre: string
  tipo: TipoReclamo
  descripcion: string
  fotosUrls: string[]             // hasta 3 fotos de evidencia
  estado: EstadoReclamo
  resolucion?: ResolucionReclamo
  montoReembolsoCents?: number    // si aplica reembolso total/parcial
  notaTW?: string                 // Nota interna del admin al resolver
  creadoPor: string               // uid del negocio
  revisadoPor?: string            // uid del admin
  revisadoAt?: string
  createdAt: string
  updatedAt: string
}

export interface CreateReclamoInput {
  pedidoId: string
  pedidoRef: string
  negocioId: string
  negocioNombre: string
  caficultorId: string
  caficultorNombre: string
  tipo: TipoReclamo
  descripcion: string
  fotosUrls?: string[]
}

// ─── REPOSICIÓN / ABASTECIMIENTO ─────────────────────────────────────────────
// Solo para buyer_b2b APPROVED (ABAST-01)

export type FrecuenciaReposicion = 15 | 30 | 45 | 60

export interface ReposicionItemConfig {
  productoId: string
  productoNombre: string
  caficultorId: string
  activa: boolean
  frecuenciaDias: FrecuenciaReposicion
  cantidadUnidades: number
  presentacion: FormatoONE
  esTypeA: boolean
}

export type EstadoReposicion = 'ACTIVE' | 'PAUSED' | 'CANCELLED'

export interface ReposicionONE {
  id: string
  status: EstadoReposicion
  buyerId: string
  sellerId: string
  productoId: string
  productoNombre: string
  pedidoOrigenId: string
  frecuenciaDias: FrecuenciaReposicion
  cantidadUnidades: number
  presentacion: FormatoONE
  nextOrderDate: string
  createdAt: string
  updatedAt: string
}

export interface CreateReposicionInput {
  buyerId: string
  sellerId: string
  productoId: string
  productoNombre: string
  pedidoOrigenId: string
  frecuenciaDias: FrecuenciaReposicion
  cantidadUnidades: number
  presentacion: FormatoONE
}
