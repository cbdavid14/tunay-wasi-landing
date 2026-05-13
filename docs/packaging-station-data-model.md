# Modelo de Datos — Estación de Empaque Tunay Wasi
# Firebase Firestore — misma DB que tunay-wasi-landing

# ══════════════════════════════════════════════════════════════
# COLECCIONES EXISTENTES (no tocar, solo leer/actualizar)
# ══════════════════════════════════════════════════════════════

productos/{productoId}
  # Ya existe — la estación lee stockKg y stockReservedKg
  stockKg: number              # kg verde disponible
  stockReservedKg: number      # kg reservado por pedidos pendientes
  # La estación DESCUENTA stockKg al empaquetar

pedidos/{pedidoId}
  # Ya existe — la estación lee pedidos con estado "pagado"
  # y los agrupa en cubetas de producción

# ══════════════════════════════════════════════════════════════
# COLECCIONES NUEVAS (estación de empaque)
# ══════════════════════════════════════════════════════════════

# ── lotes_tostado/{loteId} ─────────────────────────────────
# Representa un batch de café que salió del tostador
{
  productoId: string,          # ref a productos/{productoId}
  caficultorId: string,        # ref a caficultores/{id}
  pesoVerdeKg: number,         # ej: 46 (1 quintal)
  pesoTostadoKg: number,       # ej: 37.72 (después de merma)
  mermaPorc: number,           # ej: 18
  fechaTueste: Timestamp,
  fechaReposo: Timestamp,      # pesoTostado + 12-24h mínimo
  operario: string,            # nombre del operario
  estado: 'en_reposo'          # → 'listo_empacar' → 'en_empaque' → 'completado'
        | 'listo_empacar'
        | 'en_empaque'
        | 'completado',
  notasCata: string,           # puntaje SCA, notas de sabor
  puntajeSCA: number,
  creadoEn: Timestamp,
  # Calculados al pasar a listo_empacar:
  bolsas250g: number,          # floor(pesoTostadoKg / 0.25)
  bolsas1kg: number,           # floor(pesoTostadoKg / 1)
  bolsas3kg: number,           # floor(pesoTostadoKg / 3)
}

# ── sesiones_empaque/{sesionId} ────────────────────────────
# Representa una sesión de trabajo en la tablet
{
  loteId: string,              # ref a lotes_tostado
  operario: string,
  inicio: Timestamp,
  fin: Timestamp | null,
  estado: 'activa' | 'completada' | 'pausada',
  # Cubetas generadas al iniciar la sesión (ver lógica abajo)
  cubetas: [
    {
      tipo: 'grano' | 'media' | 'fina' | 'espresso',
      totalBolsas: number,
      bolsasImprimidas: number,
      bolsasEmpacadas: number,
      pesoMolerKg: number,     # calculado: totalBolsas * 0.25
      nivelMolino: number | null,  # 0 = grano entero
      pedidosAsignados: string[],  # pedidoIds agrupados
    }
  ],
  resumen: {
    totalEtiquetas: number,
    totalBolsas250g: number,
    kgEmpacados: number,
  }
}

# ── etiquetas/{etiquetaId} ─────────────────────────────────
# Una etiqueta = una bolsa empacada (trazabilidad completa)
{
  loteId: string,
  sesionId: string,
  productoId: string,
  pedidoId: string | null,     # null si es stock sin asignar
  clienteNombre: string | null,
  peso: '250g' | '1kg' | '3kg',
  molienda: 'grano' | 'media' | 'fina' | 'espresso',
  fechaTueste: Timestamp,
  puntajeSCA: number,
  caficultor: string,
  finca: string,
  loteNumero: string,          # ej: "TW-2026-001"
  qrUrl: string,               # /historia/{loteId} (trazabilidad)
  impresaEn: Timestamp,
  empacadaEn: Timestamp | null,
  zplPayload: string,          # ZPL generado — para reimprimir sin recalcular
}

# ══════════════════════════════════════════════════════════════
# LÓGICA DE CUBETAS (agrupación de pedidos)
# ══════════════════════════════════════════════════════════════
#
# Al iniciar una sesión de empaque para un lote:
#
# 1. Leer todos los pedidos con estado = 'pagado' que incluyan
#    items del productoId del lote.
#
# 2. Agrupar por molienda:
#    pedidos.items
#      .filter(item => item.productoId === lote.productoId)
#      .groupBy(item => item.grind)
#      → { grano: [{pedidoId, qty, peso}...], media: [...], ... }
#
# 3. Sumar cantidades por grupo → totalBolsas por cubeta
#
# 4. Agregar cubeta de "stock" para bolsas sin pedido asignado
#    (lote.bolsas250g - suma(cubetas) = bolsas de stock libre)
#
# ══════════════════════════════════════════════════════════════
# FLUJO DE DECREMENTO DE STOCK
# ══════════════════════════════════════════════════════════════
#
# Cuando operario confirma "bolsa empacada":
#   productos/{productoId}.stockKg -= 0.25   (o 1 / 3 según peso)
#   Si la bolsa tiene pedidoId:
#     productos/{productoId}.stockReservedKg -= 0.25
#     pedido.items[i].estado = 'empacado'
#     Si todos los items del pedido están 'empacado':
#       pedido.estado = 'listo_despacho'
#
# ══════════════════════════════════════════════════════════════
# ÍNDICES FIRESTORE NECESARIOS
# ══════════════════════════════════════════════════════════════
#
# pedidos: estado ASC + creadoEn DESC
# lotes_tostado: estado ASC + fechaTueste DESC
# etiquetas: loteId ASC + impresaEn DESC
# etiquetas: pedidoId ASC (para verificar completitud)
