/**
 * marketplace.ts — Tipos Firestore para la plataforma B2B de café verde
 *
 * Colecciones:
 *   /mkt_lotes/{loteId}              — lotes registrados por caficultores
 *   /mkt_pedidos/{pedidoId}          — pedidos B2B de cafeterías
 *   /mkt_tostadoras/{tostadoraId}    — perfiles de cafeterías/tostadoras
 *   /mkt_solicitudes_muestra/{id}    — solicitudes de muestra 200g
 *   /mkt_laboratorios/{labId}        — laboratorios con cuenta en la plataforma
 *
 * Firestore project: alpaso-app
 */

// ─── LOTE ────────────────────────────────────────────────────────────────────

export type LoteStatus =
  | 'borrador'           // caficultor lo creó, aún no publicado
  | 'publicado'          // visible en el catálogo del marketplace
  | 'muestra_solicitada' // cafetería pidió muestra de 200g
  | 'muestra_enviada'    // caficultor despachó muestra física
  | 'en_catacion'        // laboratorio tiene la muestra, está catando
  | 'aprobado'           // laboratorio subió puntaje — admin lo publica
  | 'agotado'            // sin stock
  | 'rechazado';         // no pasó control de calidad (< 82 pts)

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
  puntajeOficial?: number;           // subido por el laboratorio post-cata
  notasSabor: string[];              // ["chocolate", "frutas rojas", "caramelo"]
  acidez?: number;                   // 1-10
  cuerpo?: number;                   // 1-10
  balance?: number;                  // 1-10
  datosTueste?: string;              // perfil de tueste sugerido por el laboratorio
  fichaCatacionUrl?: string;         // PDF de catación subido por el laboratorio
  laboratorioId?: string;            // FK → /mp_laboratorios/{id}

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

// ─── LABORATORIO ─────────────────────────────────────────────────────────────

export interface LaboratorioDoc {
  id: string;                        // "LAB-001"
  razonSocial: string;               // "CQI Lab Perú S.A.C."
  nombreComercial: string;           // "CQI Lab"
  contactoNombre: string;
  email: string;
  telefono: string;
  direccion: string;                 // para que el caficultor sepa dónde enviar
  certificaciones: string[];         // ["Q-Grader CQI", "SCA Authorized"]
  feeCatacionPEN: number;            // fee que cobra por catación (lo fija el laboratorio)
  feeTuestePEN: number;              // fee que cobra por tueste (lo fija el laboratorio)
  status: 'activo' | 'inactivo';
  createdAt: string;
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
  tieneLaboratorio: boolean;         // activa sección "Mi laboratorio" en el portal
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
  fletePEN: number;                  // flete terrestre
  feeLaboratorioPEN?: number;        // catación + tueste del lab contratado (solo Flujo B)
  feeCatacionPEN?: number;           // porción fija de catación (para desglose)
  totalPEN: number;                  // subtotal + igv + flete [+ feeLaboratorio]

  // Pago
  metodoPago: 'transferencia' | 'culqi' | 'yape';
  pagoStatus: 'pendiente' | 'verificado' | 'rechazado';
  reservaExpiraAt: string;           // ISO — now + 72h; admin libera si vence sin pago
  comprobanteUrl?: string;           // voucher de transferencia subido por cliente
  facturaUrl?: string;               // factura electrónica emitida

  // Datos de facturación
  razonSocial: string;
  ruc: string;
  contacto: string;
  email: string;
  telefono: string;
  direccionEntrega: string;

  // Logística
  logisticaStatus: PedidoStatus;
  notasLogistica?: string;
  fechaEntregaEstimada?: string;
  empresaTransporte?: 'Shalom' | 'Olva' | 'Cruz del Sur' | 'Otro';
  numeroGuia?: string;

  // Pago al caficultor
  pagoCaficultorStatus: 'pendiente' | 'pagado';
  pagoCaficultorAt?: string;
  montoCaficultorPEN: number;        // lo que recibe el caficultor

  // Pago al laboratorio (solo Flujo B)
  pagoLaboratorioStatus?: 'pendiente' | 'pagado';
  pagoLaboratorioAt?: string;

  createdAt: string;
  updatedAt: string;
}

// ─── SOLICITUD DE MUESTRA ─────────────────────────────────────────────────

export interface SolicitudMuestraDoc {
  id: string;
  loteId: string;
  tostadoraId?: string;              // FK → /mkt_tostadoras/{id} si la cafetería está registrada
  laboratorioId?: string;            // FK → /mkt_laboratorios/{id} lab contratado (Flujo B)
  nombreContacto: string;
  empresa: string;
  email: string;
  telefono: string;
  status: 'pendiente' | 'despachada' | 'recibida' | 'catada';
  createdAt: string;
}
