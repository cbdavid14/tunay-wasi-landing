# Stock B2C + B2B en Paralelo — Flujo Actual vs Flujo Mejorado
> Creado: mayo 2026
> Repo: `tunay-wasi-landing`
> Archivos clave: `stockUtils.ts` · `catalogService.ts` · `firestore.ts` · `catalog.ts`

---

## Flujo Actual (solo B2C)

### Firestore — `productos/{id}`

```typescript
stockKg:          12      // kg verde total del lote
stockReservedKg:  4.818   // kg reservados por pedidos B2C pendientes
// stockDisponible = stockKg - stockReservedKg  ← calculado, nunca guardado
```

### `stockUtils.ts` actual

```typescript
export const KG_PER_UNIT: Record<WeightLabel, number> = {
  '250g': 0.301,
  '1kg':  1.205,
  '3kg':  3.614,
};

export function disponibleKg(stockKg: number, stockReservedKg = 0): number {
  return Math.max(0, stockKg - stockReservedKg);
}

export function maxQtyForWeight(stockDisponibleKg: number, weight: WeightLabel): number {
  return Math.floor(stockDisponibleKg / KG_PER_UNIT[weight]);
}
```

### `catalog.ts` — tipo `Producto` actual

```typescript
interface Producto {
  weights:        [string, number][];   // B2C precios normales
  weightsPromo?:  [string, number][];   // B2C precios promo
  promoActivated?: boolean;             // activa weightsPromo en lugar de weights
  stockKg:        number;
  stockReservedKg?: number;
  label?:         'PREVENTA' | 'NEW';
}
```

### `catalogService.ts` — filtro actual

```typescript
// Solo muestra productos PREVENTA
const valid = mapped.filter((p) => p.name && p.weights && p.label === 'PREVENTA');
```

### Comportamiento actual

```
stockDisponible = 7.18 kg

B2C:
  250g → maxQty = floor(7.18 / 0.301) = 23 bolsas disponibles
  1kg  → maxQty = floor(7.18 / 1.205) = 5 unidades disponibles

B2B: no existe en el sistema
```

### Limitaciones actuales

| Limitación | Impacto |
|---|---|
| Stock pool único sin visibilidad B2B | No se puede correr B2C y B2B en paralelo |
| `label` solo controla visibilidad, no estado por canal | No hay forma de deshabilitar un formato específico |
| No existe `weightsB2b` ni `b2bPromoActivated` | B2B no tiene estructura de precios en el sistema |
| Producto desaparece si no es `PREVENTA` | El comprador no ve el lote aunque esté disponible para B2B |
| No hay campo `b2bEnabled` | Danny no puede activar/desactivar canal B2B desde admin |

---

## Flujo Mejorado (B2C + B2B en paralelo)

### Principios

1. **Stock pool único compartido** — `stockReservedKg` suma reservas de ambos canales. No hay división de stock.
2. **Formatos se deshabilitan, nunca se ocultan** — el comprador siempre ve el producto, con el estado correcto.
3. **`b2bEnabled` controla el canal completo** — Danny lo activa/desactiva desde el admin.
4. **`weightsB2b` y `weightsB2bPromo`** siguen el mismo patrón que `weights` y `weightsPromo`.
5. **El pedido registra el canal** — `canal: 'b2c' | 'b2b'` en la colección `pedidos`.

---

### Firestore — `productos/{id}` mejorado

```typescript
// Campos existentes — sin cambios
stockKg:          12
stockReservedKg:  4.818
weights:          [{ label: "250g", cents: 5410 }, { label: "1kg", cents: 19400 }]
weightsPromo:     [{ label: "250g", cents: 2705 }, { label: "1kg", cents: 9700 }]
promoActivated:   false
label:            "PREVENTA"

// Campos nuevos — B2B
weightsB2b:       [
  { label: "8kg",  cents: 64800 },   // precio normal B2B (ej. 10% desc sobre B2C lote)
  { label: "10kg", cents: 80820 },
  { label: "12kg", cents: 96930 },
  { label: "15kg", cents: 121230 }
]
weightsB2bPromo:  [
  { label: "8kg",  cents: 54400 },   // precio campaña B2B (ej. 15% desc)
  { label: "10kg", cents: 67900 },
  { label: "12kg", cents: 81400 },
  { label: "15kg", cents: 101900 }
]
b2bPromoActivated: false             // Danny activa desde admin para campaña
b2bEnabled:        true              // Danny activa/desactiva canal B2B completo
```

---

### `stockUtils.ts` mejorado

```typescript
export const KG_PER_UNIT: Record<WeightLabel, number> = {
  '250g': 0.301,
  '1kg':  1.205,
  '3kg':  3.614,
};

// NUEVO — kg que consume cada formato B2B
export const KG_PER_B2B: Record<string, number> = {
  '8kg':  8,
  '10kg': 10,
  '12kg': 12,
  '15kg': 15,
};

export function disponibleKg(stockKg: number, stockReservedKg = 0): number {
  return Math.max(0, stockKg - stockReservedKg);
}

export function maxQtyForWeight(stockDisponibleKg: number, weight: WeightLabel): number {
  return Math.floor(stockDisponibleKg / KG_PER_UNIT[weight]);
}

// NUEVO — estado de cada formato B2C
export function b2cFormatStatus(
  stockDisponibleKg: number,
  weight: WeightLabel
): 'available' | 'soldout' {
  return stockDisponibleKg >= KG_PER_UNIT[weight] ? 'available' : 'soldout';
}

// NUEVO — estado de cada formato B2B
export function b2bFormatStatus(
  stockDisponibleKg: number,
  b2bEnabled: boolean,
  label: string
): 'available' | 'soldout' | 'disabled' {
  if (!b2bEnabled) return 'disabled';
  const kgNeeded = KG_PER_B2B[label] ?? Infinity;
  return stockDisponibleKg >= kgNeeded ? 'available' : 'soldout';
}
```

---

### `catalog.ts` — tipo `Producto` mejorado

```typescript
interface Producto {
  // Existentes — sin cambios
  weights:          [string, number][];
  weightsPromo?:    [string, number][];
  promoActivated?:  boolean;
  stockKg:          number;
  stockReservedKg?: number;
  label?:           ProductLabel;

  // NUEVOS — B2B
  weightsB2b?:          [string, number][];  // precios B2B normales por formato kg
  weightsB2bPromo?:     [string, number][];  // precios B2B campaña
  b2bPromoActivated?:   boolean;             // activa weightsB2bPromo
  b2bEnabled?:          boolean;             // habilita canal B2B completo
}
```

---

### `catalogService.ts` — mapProductoDoc mejorado

```typescript
function mapProductoDoc(id: string, raw: Record<string, unknown>): Producto {
  const weights = Array.isArray(raw.weights)
    ? (raw.weights as WeightEntry[]).map((w) => [w.label, w.cents] as [string, number])
    : [];
  const weightsPromo = Array.isArray(raw.weightsPromo)
    ? (raw.weightsPromo as WeightEntry[]).map((w) => [w.label, w.cents] as [string, number])
    : undefined;

  // NUEVO — mapear campos B2B igual que B2C
  const weightsB2b = Array.isArray(raw.weightsB2b)
    ? (raw.weightsB2b as WeightEntry[]).map((w) => [w.label, w.cents] as [string, number])
    : undefined;
  const weightsB2bPromo = Array.isArray(raw.weightsB2bPromo)
    ? (raw.weightsB2bPromo as WeightEntry[]).map((w) => [w.label, w.cents] as [string, number])
    : undefined;

  return {
    ...(raw as Omit<Producto, 'id' | 'weights' | 'weightsPromo' | 'weightsB2b' | 'weightsB2bPromo'>),
    id,
    weights,
    ...(weightsPromo    ? { weightsPromo }    : {}),
    ...(weightsB2b      ? { weightsB2b }      : {}),
    ...(weightsB2bPromo ? { weightsB2bPromo } : {}),
  };
}

// NUEVO — mostrar productos de ambos canales (no solo PREVENTA)
const valid = mapped.filter((p) =>
  p.name &&
  p.weights &&
  (p.label === 'PREVENTA' || (p.b2bEnabled && p.weightsB2b?.length))
);
```

---

### Lógica de UI por canal

#### B2C — formato deshabilitado por stock

```
stockDisponible: 0.15 kg  (menos de una bolsa 250g)

  ○ 250g — S/ 54.10   [Agotado en este ciclo]  ← disabled, gris
  ○ 1kg  — S/ 194.00  [Agotado en este ciclo]  ← disabled, gris

  "Este lote fue reservado en su totalidad.
   Únete a la lista para el próximo ciclo."

  [Avisar próximo lote]  ← form email
```

#### B2B — formato deshabilitado por stock

```
stockDisponible: 6 kg  (menos de 8kg mínimo B2B)

  ○ 8kg  — S/ 648     [Sin stock suficiente]  ← disabled, gris
  ○ 10kg — S/ 808     [Sin stock suficiente]  ← disabled, gris
  ○ 12kg — S/ 969     [Sin stock suficiente]  ← disabled, gris
  ○ 15kg — S/ 1,212   [Sin stock suficiente]  ← disabled, gris

  "Este lote ya fue reservado.
   Contáctanos para el próximo ciclo."

  [WhatsApp Danny]  ← abre wa.me con mensaje prellenado
```

#### B2B — canal deshabilitado por Danny (`b2bEnabled: false`)

```
  ○ 8kg  — S/ 648     [No disponible]  ← disabled, gris
  ...

  "Canal B2B no disponible para este lote."
```

---

### Flujo de reserva en paralelo — ejemplo real

```
Estado inicial:
  stockKg: 12  |  stockReservedKg: 0  |  stockDisponible: 12

10:00 — Pedro (B2C) compra 2 bolsas 250g (0.602 kg):
  stockReservedKg = 0.602  |  stockDisponible = 11.398

10:05 — María (B2C) compra 4 bolsas 250g (1.204 kg):
  stockReservedKg = 1.806  |  stockDisponible = 10.194
  → B2B: 10kg disponible ✅, 12kg NO ✅

10:30 — Cafetería El Origen (B2B) reserva 10kg:
  stockReservedKg = 11.806  |  stockDisponible = 0.194
  → B2C: 250g deshabilitado (necesita 0.301kg, solo hay 0.194kg)
  → B2B: todos los formatos deshabilitados

Pedido B2C registra: canal: 'b2c', weight: '250g'
Pedido B2B registra: canal: 'b2b', weight: '10kg'
```

---

### Resumen de cambios requeridos

| Archivo | Cambio | Complejidad |
|---|---|---|
| `Firestore productos/{id}` | Agregar `weightsB2b`, `weightsB2bPromo`, `b2bPromoActivated`, `b2bEnabled` | Datos — sin código |
| `stockUtils.ts` | Agregar `KG_PER_B2B`, `b2cFormatStatus()`, `b2bFormatStatus()` | Baja |
| `catalog.ts` | Agregar 4 campos opcionales a `Producto` | Baja |
| `catalogService.ts` — `mapProductoDoc` | Mapear `weightsB2b` y `weightsB2bPromo` igual que B2C | Baja |
| `catalogService.ts` — `fetchProductos` | Incluir productos con `b2bEnabled: true` aunque no sean `PREVENTA` | Baja |
| `firestore.ts` — `ProductoDoc` | Agregar los 4 campos nuevos con comentarios | Baja |
| UI B2C (selector de peso) | Deshabilitar formato con mensaje "Agotado" en lugar de ocultar | Media |
| UI B2B (nueva sección/página) | Selector de formato kg + estado disabled + CTA WhatsApp | Media-Alta |
| `pedidos` — `PedidoDoc` | Agregar campo `canal: 'b2c' \| 'b2b'` | Baja |

---

*Documento vivo · Implementar por fases: primero tipos + stockUtils, luego UI B2B.*
*Referencia de precios: `PRICING_RULES 2.0.md §9.1`*
