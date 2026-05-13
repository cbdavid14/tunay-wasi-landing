import { Timestamp } from 'firebase/firestore';

// ── Tipos compartidos ──────────────────────────────────────────────────────

export type Molienda = 'grano' | 'media' | 'fina' | 'espresso';
export type PesoBolsa = '250g' | '1kg' | '3kg';
export type EstadoLote = 'en_reposo' | 'listo_empacar' | 'en_empaque' | 'completado';
export type EstadoSesion = 'activa' | 'pausada' | 'completada';

export const KG_POR_BOLSA: Record<PesoBolsa, number> = {
  '250g': 0.25,
  '1kg': 1,
  '3kg': 3,
};

// ── LoteTostado ───────────────────────────────────────────────────────────
// Un batch que salió del tostador. Fuente de verdad del stock físico.

export interface LoteTostado {
  id?: string;
  productoId: string;
  caficultorId: string;
  pesoVerdeKg: number;
  pesoTostadoKg: number;
  mermaPorc: number;
  fechaTueste: Timestamp;
  fechaReposo: Timestamp;       // mínimo 12-24h post tueste
  operario: string;
  estado: EstadoLote;
  notasCata: string;
  puntajeSCA: number;
  loteNumero: string;           // ej: "TW-2026-001"
  creadoEn: Timestamp;
  // Calculados al pasar a listo_empacar
  bolsas250g: number;
  bolsas1kg: number;
  bolsas3kg: number;
}

// ── Cubeta ────────────────────────────────────────────────────────────────
// Grupo de bolsas del mismo tipo dentro de una sesión.
// El operario trabaja cubeta por cubeta.

export interface Cubeta {
  tipo: Molienda;
  peso: PesoBolsa;
  totalBolsas: number;
  bolsasImprimidas: number;
  bolsasEmpacadas: number;
  pesoMolerKg: number;          // totalBolsas * KG_POR_BOLSA[peso]
  nivelMolino: number | null;   // null = grano entero
  pedidosAsignados: string[];   // pedidoIds incluidos en esta cubeta
  esStock: boolean;             // true = bolsas sin pedido asignado
}

// ── SesionEmpaque ─────────────────────────────────────────────────────────
// Una sesión de trabajo en la tablet para un lote específico.

export interface SesionEmpaque {
  id?: string;
  loteId: string;
  operario: string;
  inicio: Timestamp;
  fin: Timestamp | null;
  estado: EstadoSesion;
  cubetas: Cubeta[];
  resumen: {
    totalEtiquetas: number;
    totalBolsas250g: number;
    totalBolsas1kg: number;
    totalBolsas3kg: number;
    kgEmpacados: number;
  };
}

// ── Etiqueta ──────────────────────────────────────────────────────────────
// Una etiqueta = una bolsa física. Trazabilidad completa.

export interface Etiqueta {
  id?: string;
  loteId: string;
  sesionId: string;
  productoId: string;
  pedidoId: string | null;
  clienteNombre: string | null;
  peso: PesoBolsa;
  molienda: Molienda;
  fechaTueste: Timestamp;
  puntajeSCA: number;
  caficultor: string;
  finca: string;
  region: string;
  loteNumero: string;
  qrUrl: string;                // /historia/{loteId}
  impresaEn: Timestamp;
  empacadaEn: Timestamp | null;
  zplPayload: string;           // ZPL guardado para reimprimir
}

// ── PedidoItem (subset del pedido existente) ──────────────────────────────
// Lo que la estación necesita leer de la colección pedidos

export interface PedidoItemEmpaque {
  pedidoId: string;
  clienteNombre: string;
  productoId: string;
  sku: string;
  peso: PesoBolsa;
  molienda: Molienda;
  qty: number;
  estado: 'pagado' | 'empacado' | 'listo_despacho';
}
