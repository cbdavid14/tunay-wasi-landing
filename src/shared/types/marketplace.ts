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
  | 'borrador'      // caficultor lo creó, aún no publicado
  | 'en_catacion'   // sistema asignó lab (Uber model), certificación en proceso
  | 'publicado'     // lab completó catación — visible en catálogo con puntaje SCA
  | 'agotado'       // sin stock
  | 'rechazado';    // retirado por el caficultor o por admin

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

  // ── Stock y precio ─────────────────────────────────────────────────────
  pesoPorSacoKg: number;             // kg por saco — definido por el caficultor
  sacosDisponibles: number;          // total sacos
  sacosReservados: number;           // reservados por pedidos activos
  precioOrigenPEN: number;           // precio/saco que pide el caficultor (entero PEN)
  precioVentaPEN?: number;           // precio final = precioOrigenPEN + comisión 10% — flete NO incluido (pago contraentrega)

  // ── Muestra ────────────────────────────────────────────────────────────
  muestraDisponible: boolean;        // hay muestras de 200g para enviar
  precioMuestraPEN: number;          // centavos — típicamente S/15-20
  stockMuestrasHub: number;          // unidades de 200g disponibles en hub Lima (RN-HUB-02)

  // ── Catación (metadata — no afecta el estado del lote) ────────────────
  catado?: boolean;                  // true si el lab ya registró la catación
  laboratorioId?: string;            // FK → /mkt_laboratorios/{id}

  // ── Estado ─────────────────────────────────────────────────────────────
  status: LoteStatus;
  destacado: boolean;                // aparece primero en el marketplace
  createdAt: string;                 // ISO 8601
  publicadoAt?: string;
  despublicadoAt?: string;
  agotadoAt?: string;

  // ── Logística ──────────────────────────────────────────────────────────
  fotoLoteUrl?: string;
  fotosUrls?: string[];
  observacionesAdmin?: string;

  // ── Catación (interno) ─────────────────────────────────────────────────────
  _cataciones?: number[];            // historial de puntajes para calcular promedio
  _catacionesCount?: number;         // cantidad de cataciones registradas

  // ── Hub Lima ───────────────────────────────────────────────────────────────
  muestraEnCamino?: boolean;         // true cuando caficultor confirmó envío al hub pero aún no llegó
  courierMuestrasHub?: string;       // empresa courier del envío al hub
  guiaMuestrasHub?: string;          // número de guía del envío al hub
  cantidadMuestrasDeclarada?: number; // unidades 200g declaradas por el caficultor al publicar
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
  fletePEN?: number;                 // referencial — el flete real lo paga la cafetería al courier en destino (contraentrega)
  feeLaboratorioPEN?: number;        // catación + tueste del lab contratado (solo Flujo B)
  feeCatacionPEN?: number;           // porción fija de catación (para desglose)
  totalPEN: number;                  // subtotal + igv [+ feeLaboratorio] — flete NO incluido

  // Pago
  metodoPago: 'transferencia' | 'izipay' | 'yape';
  pagoStatus: 'pendiente' | 'en_revision' | 'verificado' | 'rechazado';
  reservaExpiraAt: string;           // ISO — now + 72h; admin libera si vence sin pago
  comprobanteUrl?: string;           // voucher de transferencia subido por cliente
  voucherSubidoAt?: string;          // ISO — cuando la cafetería subió el voucher
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
  laboratorioId?: string;            // desnormalizado del lote — para notificaciones al lab
  pagoLaboratorioStatus?: 'pendiente' | 'pagado';
  pagoLaboratorioAt?: string;

  // IA — análisis de anomalías en el pedido
  fraudScore?: number;               // 0-10 asignado por Claude en onPedidoCreated
  fraudFlag?: boolean;               // true si score > 7 — requiere revisión admin

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
  direccionEntrega?: string;         // dirección de la cafetería — para que caficultor sepa dónde enviar
  status: 'pendiente' | 'despachada' | 'recibida' | 'catada' | 'rechazada';
  createdAt: string;
  // Catación privada — solo visible para la cafetería, no afecta puntajeOficial del lote
  catacionPrivada?: {
    puntaje: number;
    acidez: number;
    cuerpo: number;
    balance: number;
    notasSabor: string[];
    datosTueste: string;
    catadoAt: string;
  };
}

// ─── SOLICITUD DE CERTIFICACIÓN ───────────────────────────────────────────────

export interface SolicitudCertificacionDoc {
  id: string;
  loteId: string;
  caficultorId: string;              // FK → /caficultores/{id}
  laboratorioId?: string;            // FK → /mkt_laboratorios/{id} — asignado cuando lab acepta
  nombreLote: string;                // desnormalizado para queries del lab
  status: 'abierta' | 'aceptada' | 'muestra_en_camino' | 'muestra_recibida' | 'en_proceso' | 'completada' | 'expirada';
  // ── Pago del fee via plataforma ───────────────────────────────────────────
  feeCatacionPEN?: number;           // se fija cuando el lab acepta
  pagoStatus: 'pendiente' | 'verificado' | 'rechazado';
  pagoLaboratorioStatus: 'pendiente' | 'pagado';
  pagoLaboratorioAt?: string;
  aceptadaAt?: string;               // timestamp cuando lab aceptó
  // Envío de muestra al laboratorio
  empresaCourierMuestra?: string;    // Shalom | Olva | Cruz del Sur | Otro
  numeroGuiaMuestra?: string;
  guiaEnviadaAt?: string;            // ISO — cuando caficultor confirmó envío
  muestraRecibidaAt?: string;        // ISO — cuando lab confirmó recepción
  createdAt: string;
}

// ─── SOLICITUD HUB → CAFICULTOR (Flujo D) ────────────────────────────────────

export interface SolicitudHubDoc {
  id: string;                        // "HUB-{timestamp}"
  loteId: string;                    // FK → /mkt_lotes/{id}
  caficultorId: string;              // desnormalizado para notificaciones
  cantidadSolicitada: number;        // 1–3 muestras de 200g
  status: 'solicitada' | 'confirmada_caficultor' | 'recibida_hub' | 'expirada';
  // ── Confirmación del caficultor ───────────────────────────────────────────
  empresaCourier?: string;
  numeroGuia?: string;
  confirmadoAt?: string;
  // ── Recepción en hub ──────────────────────────────────────────────────────
  cantidadRecibida?: number;
  recibidoAt?: string;
  // ── Control ───────────────────────────────────────────────────────────────
  expiraAt: string;                  // createdAt + 72h
  createdAt: string;
}

// ── Notificaciones in-app ─────────────────────────────────────────────────────

export interface NotificacionDoc {
  id: string;
  titulo: string;
  cuerpo: string;
  leida: boolean;
  createdAt: string;
  url?: string;
}

// ── Calificaciones post-transacción ──────────────────────────────────────────

export interface CalificacionDoc {
  id: string;
  pedidoId: string;              // FK al pedido — una calificación por pedido por autor
  autorId: string;               // uid del actor que califica
  autorRol: 'cafeteria' | 'caficultor';
  destinatarioId: string;        // uid del actor calificado
  destinatarioRol: 'caficultor' | 'cafeteria';
  puntaje: 1 | 2 | 3 | 4 | 5;
  comentario?: string;           // máximo 300 caracteres
  createdAt: string;
  expiraAt: string;              // createdAt + 30 días
}
