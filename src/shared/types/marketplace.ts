/**
 * marketplace.ts — Tipos Firestore para la plataforma B2B de café verde
 *
 * Colecciones nuevas:
 *   /mp_lotes/{loteId}           — lotes registrados por caficultores
 *   /mp_pedidos/{pedidoId}       — pedidos B2B de tostadoras
 *   /mp_tostadoras/{tostadoraId} — perfiles de tostadoras/cafeterías
 *   /mp_solicitudes_muestra/{id} — solicitudes de muestra 200g
 *
 * Firestore project: alpaso-app
 */

// ─── LOTE ────────────────────────────────────────────────────────────────────

export type LoteStatus =
  | 'borrador'           // caficultor lo creó, aún no envió muestra
  | 'muestra_enviada'    // caficultor despachó muestra a Lima
  | 'en_catacion'        // Q-Grader tiene la muestra
  | 'aprobado'           // puntaje asignado, listo para publicar
  | 'publicado'          // visible en el marketplace
  | 'agotado'            // sin stock
  | 'rechazado';         // no pasó control de calidad

export type ProcesoKey = 'lavado' | 'natural' | 'honey' | 'anaerobico' | 'doble_fermentacion';

export interface LoteDoc {
  id: string;                        // "CAJ-001-2026"
  caficultorId: string;              // FK → /caficultores/{id}

  // ── Identidad ──────────────────────────────────────────────────────────
  nombreLote: string;                // "Bello Horizonte - Geisha Honey Lote 01"
  cosecha: string;                   // "Junio 2026"
  proceso: ProcesoKey;
  variedad: string;                  // "Geisha"
  altitud: string;                   // "1800 msnm"
  region: string;                    // "Oxapampa, Pasco"

  // ── Calidad ────────────────────────────────────────────────────────────
  puntajeReferencial: number;        // declarado por el caficultor
  puntajeOficial?: number;           // asignado por Q-Grader post-cata
  notasSabor: string[];              // ["chocolate", "frutas rojas", "caramelo"]
  acidez?: number;                   // 1-10
  cuerpo?: number;                   // 1-10
  balance?: number;                  // 1-10
  fichaCatacionUrl?: string;         // PDF del Q-Grader

  // ── Stock y precio ─────────────────────────────────────────────────────
  sacosDisponibles: number;          // total sacos de 60 kg
  sacosReservados: number;           // reservados por pedidos activos
  precioOrigenPEN: number;           // precio/saco que pide el caficultor (entero PEN)
  precioVentaPEN?: number;           // precio final calculado (con margen + flete)

  // ── Muestra ────────────────────────────────────────────────────────────
  muestraDisponible: boolean;        // hay muestras de 200g para enviar
  precioMuestraPEN: number;          // centavos — típicamente S/15-20

  // ── Estado ─────────────────────────────────────────────────────────────
  status: LoteStatus;
  destacado: boolean;                // aparece primero en el marketplace
  createdAt: string;                 // ISO 8601
  publicadoAt?: string;
  agotadoAt?: string;

  // ── Logística ──────────────────────────────────────────────────────────
  fotoLoteUrl?: string;
  fotosUrls?: string[];
  observacionesAdmin?: string;
}

// ─── TOSTADORA / CAFETERÍA ────────────────────────────────────────────────

export type TostadoraTipo = 'tostadora' | 'cafeteria' | 'hotel' | 'oficina' | 'exportador';

export interface TostadoraDoc {
  id: string;
  razonSocial: string;               // "Café del Parque S.A.C."
  nombreComercial: string;           // "Café del Parque"
  ruc: string;
  tipo: TostadoraTipo;
  tieneTostadora: boolean;           // para saber si necesita verde o tostado
  contactoNombre: string;
  email: string;
  telefono: string;
  direccionEntrega: string;          // para calcular flete
  distritoCoberturaLima?: string;

  // Validación
  status: 'pendiente' | 'aprobado';
  createdAt: string;
}

// ─── PEDIDO B2B ───────────────────────────────────────────────────────────

export type PedidoStatus =
  | 'pendiente_pago'
  | 'pago_verificado'
  | 'en_origen'              // caficultor preparando el despacho
  | 'en_transito'            // en camión hacia Lima
  | 'en_almacen'             // en hub Lima
  | 'entregado'
  | 'cancelado';

export interface PedidoB2BDoc {
  id: string;                        // "PED-2026-0042"
  loteId: string;                    // FK → /mp_lotes/{id}
  tostadoraId: string;               // FK → /mp_tostadoras/{id}
  caficultorId: string;              // desnormalizado para queries de admin

  // Items
  sacosSolicitados: number;
  kgTotal: number;                   // sacosSolicitados * 60
  precioSacoPEN: number;             // precio al momento del pedido
  subtotalPEN: number;               // sacos * precio
  igvPEN: number;                    // 18% de subtotal
  totalPEN: number;                  // subtotal + igv

  // Pago
  metodoPago: 'transferencia' | 'culqi' | 'yape';
  pagoStatus: 'pendiente' | 'verificado' | 'rechazado';
  comprobanteUrl?: string;           // voucher de transferencia subido por cliente
  facturaUrl?: string;               // factura electrónica emitida

  // Logística
  logisticaStatus: PedidoStatus;
  notasLogistica?: string;
  fechaEntregaEstimada?: string;

  // Pago al caficultor
  pagoCaficultorStatus: 'pendiente' | 'pagado';
  pagoCaficultorAt?: string;
  montoCaficultorPEN: number;        // lo que recibe el caficultor

  createdAt: string;
  updatedAt: string;
}

// ─── SOLICITUD DE MUESTRA ─────────────────────────────────────────────────

export interface SolicitudMuestraDoc {
  id: string;
  loteId: string;
  nombreContacto: string;
  empresa: string;
  email: string;
  telefono: string;
  status: 'pendiente' | 'despachada' | 'recibida';
  createdAt: string;
}
