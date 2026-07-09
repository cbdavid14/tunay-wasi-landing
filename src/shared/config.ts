/**
 * config.ts — Constantes de negocio de la plataforma Tunay Wasi
 *
 * Centralizar aquí todos los valores que el equipo de negocio puede querer
 * ajustar sin tocar lógica de componentes.
 */

/**
 * Comisión de la plataforma sobre el precio de origen del caficultor.
 * Se aplica como: precioVentaPEN = precioOrigenPEN + round(precioOrigenPEN × COMISION_TW)
 *
 * 5% — mínimo viable para cubrir pasarela de pagos y mantener fricción baja en etapa de adquisición.
 */
export const COMISION_TW = 0.05;

/**
 * IGV peruano.
 */
export const IGV = 0.18;

/**
 * Peso estándar por saco en kg.
 */
export const KG_POR_SACO = 60;

/**
 * Horas de vigencia de una reserva de sacos.
 * Si el pago no se verifica en este plazo, la reserva se libera.
 */
export const HORAS_RESERVA = 72;

/**
 * Umbral de puntaje SCA para aprobar un lote.
 */
export const UMBRAL_SCA = 82;

/**
 * Máximo de solicitudes de muestra activas simultáneas por lote.
 */
export const MAX_MUESTRAS_ACTIVAS = 3;

/**
 * Precios sugeridos por rango SCA para canal grano verde B2B.
 * Fuente: PRICING_RULES 2.0.md §9.2 — valores redondeados.
 * Ordenados de mayor a menor para buscar el primer rango que aplica.
 */
export const PRECIOS_SCA_SUGERIDOS: { minSCA: number; label: string; precioPorKg: number }[] = [
  { minSCA: 90, label: 'Premium (90+ pts)',    precioPorKg: 86 },
  { minSCA: 84, label: 'Especial (84–89 pts)', precioPorKg: 50 },
  { minSCA: 80, label: 'Selecto (80–83 pts)',  precioPorKg: 35 },
];

/** Devuelve el precio sugerido por kg según puntaje SCA, o null si no aplica ningún rango. */
export function getPrecioSugeridoPorSCA(puntaje: number): { label: string; precioPorKg: number } | null {
  return PRECIOS_SCA_SUGERIDOS.find(r => puntaje >= r.minSCA) ?? null;
}

/**
 * Umbral de score de fraude para bloquear un pedido automáticamente.
 * Score asignado por Claude en onPedidoCreated. 0 = sin riesgo, 10 = máximo.
 */
/**
 * UID del administrador de Tunay Wasi en Firebase Auth.
 * Se define en .env como VITE_ADMIN_UID.
 * Usado para enviar notificaciones in-app al admin.
 */
export const FRAUDE_SCORE_UMBRAL = 7;
