# Tunay Wasi — Reglas de Negocio y Flujos B2C
> Versión: junio 2026 (rev. 1 — canal consumidor final con sellout y servicios aliados)

---

## Principios del canal B2C

1. **El caficultor publica primero.** La preventa abre solo cuando el caficultor acepta el precio ofrecido tras la catación.
2. **Sellout antes del tueste.** El lote no va al tostador hasta que se alcanza la meta mínima de bolsas. Sin pedidos suficientes, no hay tueste.
3. **El consumidor paga al reservar.** Igual que la preventa actual. Si el ciclo se cancela por falta de sellout, se reembolsa íntegramente.
4. **TW no tuesta ni empaca.** El laboratorio aliado ejecuta tueste, molienda y empaque bajo marca de la finca. TW coordina y despacha.
5. **Trazabilidad total.** Cada bolsa vendida es rastreable hasta la finca, la variedad, el proceso y la fecha de cosecha.
6. **Sin stock negativo.** `bolsasReservadas = Math.max(0, bolsasReservadas - bolsas)` en toda operación.
7. **Lo más simple para el consumidor.** El flujo de compra no cambia respecto a la preventa actual — solo cambia cuándo se activa el tueste.

---

## Actores del canal B2C

| Actor | Rol | Portal |
|---|---|---|
| **Caficultor** | Produce el café verde, acepta precio, coordina envío al lab | `AppCaficultor` |
| **Laboratorio aliado** | Cata SCA + tuesta + muele + empaca bajo marca de la finca | `AppLaboratorio` (extendido) |
| **Courier aliado** | Retira el tostado del lab y lo entrega al consumidor | Integrado en checkout |
| **Consumidor** | Pre-ordena bolsas 250g / 1kg durante la preventa | Landing B2C |
| **Tunay Wasi** | Intermediario: publica, vende, coordina servicios, despacha, liquida | `AppAdmin` |

---

## Flujo 1 — Publicación y apertura de preventa

```
CAFICULTOR              SISTEMA / TW             LABORATORIO
    │                        │                        │
    │  1. Publica lote        │                        │
    │  (variedad, proceso,    │                        │
    │  altitud, puntaje ref,  │                        │
    │  kg disponibles,        │                        │
    │  precio solicitado)     │                        │
    ├───────────────────────► │                        │
    │                         │  2. Sistema calcula    │
    │                         │  rango de precio       │
    │                         │  según tier SCA ref.   │
    │                         │  status → 'borrador'   │
    │                         │                        │
    │                         │  3. Crea               │
    │                         │  SolicitudCertB2C      │
    │                         │  status='abierta'      │
    │                         │  Notifica a todos los  │
    │                         │  labs activos          │
    │                         ├───────────────────────►│
    │                         │                        │
    │                         │  4. Primer lab acepta  │
    │                         │  (race condition —     │
    │                         │  atómico)              │
    │                         │ ◄──────────────────────│
    │                         │  SolicitudCertB2C      │
    │                         │  status='aceptada'     │
    │                         │  laboratorioId asign.  │
    │                         │                        │
    │  5. Notif: "Lab          │                        │
    │  asignado — enviar       │                        │
    │  muestra 300g a          │                        │
    │  [dirección del lab]"    │                        │
    │ ◄───────────────────────│                        │
    │                         │                        │
    │  6. Caficultor ingresa   │                        │
    │  courier + guía →        │                        │
    │  SolicitudCertB2C        │                        │
    │  status='muestra_        │                        │
    │  en_camino'              │                        │
    ├───────────────────────► │                        │
    │                         │  7. Lab ve courier     │
    │                         │  y guía en su portal   │
    │                         ├───────────────────────►│
    │                         │                        │
    │                         │  8. Lab confirma       │
    │                         │  recepción →           │
    │                         │  status='muestra_      │
    │                         │  recibida'             │
    │                         │ ◄──────────────────────│
    │                         │                        │
    │                         │  9. Lab registra       │
    │                         │  catación SCA          │
    │                         │ ◄──────────────────────│
    │                         │  puntajeOficial        │
    │                         │  asignado              │
    │                         │                        │
    │  10. TW genera oferta    │                        │
    │  de precio al           │                        │
    │  caficultor              │                        │
    │  (precio/bolsa según     │                        │
    │  tier SCA)               │                        │
    │ ◄───────────────────────│                        │
    │                         │                        │
    │  11. Caficultor          │                        │
    │  acepta precio           │                        │
    │  status →               │                        │
    │  'precio_aceptado'       │                        │
    ├───────────────────────► │                        │
    │                         │                        │
    │                         │  12. PREVENTA ABIERTA  │
    │                         │  status →              │
    │                         │  'preventa_abierta'    │
    │                         │  Visible en            │
    │                         │  landing B2C           │
    │                         │  con barra de          │
    │                         │  progreso sellout      │
```

### Estados de `SolicitudCertificacionB2C`

```
abierta → aceptada → muestra_en_camino → muestra_recibida → completada
abierta → expirada   (si ningún lab acepta en 24h — admin asigna manualmente)
```

| Estado | Quién lo activa | Descripción |
|---|---|---|
| `abierta` | Sistema al publicar lote | Visible para todos los labs activos |
| `aceptada` | Primer lab que acepta (atómico) | Lab asignado — caficultor ve dirección del lab |
| `muestra_en_camino` | Caficultor — ingresa courier + guía | Muestra 300g en tránsito al lab |
| `muestra_recibida` | Lab — confirma recepción | Lab puede registrar catación |
| `completada` | Sistema al guardar catación | Puntaje SCA asignado — TW genera oferta al caficultor |
| `expirada` | Sistema (Cloud Scheduler 24h) | Ningún lab aceptó — admin interviene |

---

## Flujo 2 — Preventa y sellout

El corazón del canal B2C. Los consumidores pre-ordenan bolsas durante un periodo abierto. El tueste solo se activa cuando se alcanza la meta mínima.

```
CONSUMIDOR              SISTEMA / TW             CAFICULTOR
    │                        │                        │
    │  1. Ve lote en          │                        │
    │  preventa con barra     │                        │
    │  de progreso            │                        │
    │  "32 / 40 bolsas"       │                        │
    │                         │                        │
    │  2. Agrega bolsas al    │                        │
    │  carrito y paga         │                        │
    │  (Yape / transf.)       │                        │
    ├───────────────────────► │                        │
    │                         │  3. Crea PedidoB2C     │
    │                         │  status=               │
    │                         │  'pendiente_sellout'   │
    │                         │  bolsasReservadas += n │
    │                         │  Actualiza barra de    │
    │                         │  progreso en tiempo    │
    │                         │  real                  │
    │                         │                        │
    │  4. Email: "Reserva      │                        │
    │  confirmada — te         │                        │
    │  avisamos cuando        │                        │
    │  se alcance el          │                        │
    │  sellout"               │                        │
    │ ◄───────────────────────│                        │
    │                         │                        │
    │   ·  ·  ·  Más consumidores pre-ordenan  ·  ·  · │
    │                         │                        │
    │                         │  5. bolsasVendidas     │
    │                         │  >= metaBolsas →       │
    │                         │  SELLOUT ALCANZADO     │
    │                         │  status lote →         │
    │                         │  'sellout_alcanzado'   │
    │                         │                        │
    │  6. Email: "¡Tu café     │                        │
    │  va al tueste! Entrega   │                        │
    │  estimada: [fecha]"      │                        │
    │ ◄───────────────────────│                        │
    │                         │                        │
    │                         │  7. Notif al           │
    │                         │  caficultor: "Envía    │
    │                         │  el lote verde al lab" │
    │                         ├───────────────────────►│
```

### Si el sellout NO se alcanza en el plazo

```
SISTEMA / TW             CONSUMIDOR
    │                        │
    │  cierraAt < now Y       │
    │  bolsasVendidas <       │
    │  metaBolsas →           │
    │  status → 'cancelado'   │
    │                         │
    │  Email: "La preventa    │
    │  no alcanzó el mínimo.  │
    │  Reembolso en 48h"      │
    ├───────────────────────► │
    │                         │
    │  Reembolso automático   │
    │  (Yape inverso o        │
    │  transferencia)         │
    ├───────────────────────► │
    │                         │
    │  Notifica al caficultor │
    │  "El ciclo no completó  │
    │  — puedes re-publicar   │
    │  en el siguiente ciclo" │
```

---

## Flujo 3 — Tueste, empaque y despacho

Se activa únicamente tras el sellout.

```
CAFICULTOR          LABORATORIO          SISTEMA / TW         CONSUMIDOR
    │                    │                    │                    │
    │  1. Envía lote      │                    │                    │
    │  verde al lab       │                    │                    │
    │  (courier acordado) │                    │                    │
    ├──────────────────► │                    │                    │
    │                     │                    │                    │
    │  2. Ingresa courier  │                    │                    │
    │  + guía en portal   │                    │                    │
    ├──────────────────────────────────────► │                    │
    │                     │                    │  status →          │
    │                     │                    │  'verde_en_camino' │
    │                     │                    │                    │
    │                     │  3. Lab confirma   │                    │
    │                     │  recepción verde   │                    │
    │                     ├──────────────────►│                    │
    │                     │                    │  status →          │
    │                     │                    │  'en_tueste'       │
    │                     │                    │                    │
    │                     │  4. Lab tuesta     │                    │
    │                     │  según perfil SCA  │                    │
    │                     │  muele si aplica   │                    │
    │                     │  empaca 250g / 1kg │                    │
    │                     │  etiqueta con      │                    │
    │                     │  nombre de finca   │                    │
    │                     │                    │                    │
    │                     │  5. Lab confirma   │                    │
    │                     │  tostado listo     │                    │
    │                     │  (kg tostado real, │                    │
    │                     │   bolsas producidas│                    │
    │                     ├──────────────────►│                    │
    │                     │                    │  status →          │
    │                     │                    │  'tostado_listo'   │
    │                     │                    │                    │
    │                     │                    │  6. TW coordina    │
    │                     │                    │  recogida con      │
    │                     │                    │  courier aliado    │
    │                     │                    │  status →          │
    │                     │                    │  'despachando'     │
    │                     │                    │                    │
    │                     │                    │  7. Email a cada   │
    │                     │                    │  consumidor con    │
    │                     │                    │  número de guía    │
    │                     │                    │  y tracking        │
    │                     │                    ├──────────────────► │
    │                     │                    │                    │
    │                     │                    │  8. Todos los      │
    │                     │                    │  pedidos           │
    │                     │                    │  'entregado' →     │
    │                     │                    │  status →          │
    │                     │                    │  'entregado'       │
```

---

## Flujo 4 — Liquidación

Se activa cuando el lote llega a `entregado` (todos los pedidos confirmados).

```
SISTEMA / TW          CAFICULTOR          LABORATORIO
    │                      │                    │
    │  status = 'entregado' │                    │
    │  → calcula liquidación│                    │
    │                       │                    │
    │  Caficultor recibe:   │                    │
    │  precioAcordado/bolsa │                    │
    │  × bolsasVendidas     │                    │
    │  - feeTueste/empaque  │                    │
    │  Máx. 48h hábiles     │                    │
    ├─────────────────────► │                    │
    │                       │                    │
    │  Lab recibe:          │                    │
    │  feeCatacion +        │                    │
    │  feeTueste +          │                    │
    │  feeEmpaque           │                    │
    │  Máx. 48h hábiles     │                    │
    ├────────────────────────────────────────► │
    │                       │                    │
    │  TW retiene:          │                    │
    │  comisión 10% +       │                    │
    │  fee logística        │                    │
    │  status → 'liquidado' │                    │
```

---

## Estados del lote B2C

| Estado | Quién lo activa | Visible en landing | Pre-ordenable |
|---|---|---|---|
| `borrador` | Sistema al crear | No | No |
| `pendiente_cata` | Sistema al publicar | No | No |
| `en_catacion` | Sistema — lab aceptó | No | No |
| `precio_ofrecido` | TW — post catación | No | No |
| `precio_aceptado` | Caficultor | No | No |
| `preventa_abierta` | Sistema — automático | **Sí — con barra sellout** | **Sí** |
| `sellout_alcanzado` | Sistema — meta cumplida | Sí — "¡Vendido! En proceso" | No |
| `verde_en_camino` | Caficultor | Sí — "Enviando al lab" | No |
| `en_tueste` | Lab | Sí — "Tostando" | No |
| `tostado_listo` | Lab | Sí — "Empacado" | No |
| `despachando` | TW | Sí — "En camino" | No |
| `entregado` | Sistema | Sí — "Entregado" | No |
| `cancelado` | Sistema — no sellout | No | No |
| `liquidado` | TW — post pagos | No | No |

**Transiciones automáticas:**
- Lab completa catación → TW genera oferta → `en_catacion` → `precio_ofrecido`
- Caficultor acepta → `precio_ofrecido` → `precio_aceptado` → `preventa_abierta` (inmediato)
- `bolsasVendidas >= metaBolsas` → `preventa_abierta` → `sellout_alcanzado` (inmediato)
- `cierraAt < now` Y `bolsasVendidas < metaBolsas` → `cancelado` (Cloud Scheduler)
- Todos los `PedidoB2C` con `status='entregado'` → lote `entregado` (inmediato)

---

## Estados de un pedido B2C

### `pagoStatus`
| Estado | Quién lo activa |
|---|---|
| `pendiente` | Sistema al crear pedido |
| `en_revision` | Consumidor sube voucher |
| `verificado` | Admin confirma pago |
| `rechazado` | Admin rechaza / lote cancelado |
| `reembolsado` | Admin emite reembolso |

### `logisticaStatus`
| Estado | Quién lo activa |
|---|---|
| `pendiente_sellout` | Sistema al crear pedido (antes del sellout) |
| `en_preparacion` | Sistema automático al alcanzar sellout |
| `en_tueste` | Sistema al confirmar recepción del verde en lab |
| `despachado` | TW — ingresa guía courier |
| `entregado` | Consumidor confirma o sistema por timeout |
| `cancelado` | Sistema si preventa no alcanza sellout |

---

## Reglas de negocio

### Catálogo B2C

**RN-B2C-CAT-01 · Qué lotes son visibles**
Solo lotes con `status = 'preventa_abierta'`. Los demás estados no aparecen en el catálogo B2C. Excepción: estados post-sellout se muestran como informativos para consumidores que ya compraron.

**RN-B2C-CAT-02 · Orden del catálogo**
1. Lotes con mayor `pctAvance` (% de sellout alcanzado) — urgencia real
2. Dentro del mismo tier, por `puntajeOficial` descendente

**RN-B2C-CAT-03 · Barra de progreso en tiempo real**
Cada card muestra `bolsasVendidas / metaBolsas` como barra de progreso con texto:
- `< 25%` → "Sé el primero — {N} bolsas reservadas"
- `25–74%` → "{N} de {meta} bolsas reservadas"
- `75–99%` → "¡Casi listo! Solo quedan {restantes} bolsas para activar el tueste"
- `100%` → "Sellout alcanzado ✓ — en tueste"

**RN-B2C-CAT-04 · Precio visible con desglose**
La card muestra el precio final con IGV y, expandible, el desglose:
- Caficultor: S/ X.XX
- Catación + tueste + empaque: S/ X.XX
- Tunay Wasi: S/ X.XX
- IGV (18%): S/ X.XX

### Sellout

**RN-B2C-SEL-01 · Meta mínima de bolsas**
La meta se calcula al momento de la oferta de precio según el tier SCA:

| Tier SCA | Meta mínima bolsas 250g |
|---|---|
| Selecto (82–83 pts) | 40 bolsas (≈ 10 kg tostado) |
| Esp. Estándar (84–85 pts) | 40 bolsas (≈ 10 kg tostado) |
| Esp. Alta (86–87 pts) | 32 bolsas (≈ 8 kg tostado) |
| Joya de Finca (88–89 pts) | 24 bolsas (≈ 6 kg tostado) |
| Exclusivo / Geisha (90+) | 20 bolsas (≈ 5 kg tostado) |

La meta puede ajustarse manualmente por TW antes de abrir la preventa.

**RN-B2C-SEL-02 · Plazo máximo de preventa**
60 días calendario desde `preventa_abierta`. Si no hay sellout al vencer, ciclo cancelado automáticamente.

**RN-B2C-SEL-03 · Sellout parcial no activa tueste**
Si se alcanza el 80% de la meta pero no el 100%, el tueste no se activa. No hay excepciones automáticas — solo admin puede habilitar manualmente con justificación.

**RN-B2C-SEL-04 · El consumidor paga al reservar**
El cargo es inmediato (Yape / transferencia). Si el ciclo se cancela, TW reembolsa en máximo 48h hábiles. El reembolso es por el total pagado incluyendo IGV y envío.

**RN-B2C-SEL-05 · Bolsas reservadas vs. vendidas**
`bolsasReservadas` incluye todos los pedidos con `pagoStatus = 'pendiente'` o `'verificado'`.
`bolsasVendidas` solo cuenta pedidos con `pagoStatus = 'verificado'`.
La meta se calcula contra `bolsasVendidas` — no contra reservas sin pago verificado.

### Precios B2C

**RN-B2C-PRE-00 · Sugerencia de precio al caficultor (canal grano verde B2B)**
Tras la catación, el sistema muestra al caficultor un precio sugerido por kg verde según su puntaje SCA. Es una referencia — el caficultor puede ajustarlo. Aplica al canal B2B (grano verde) del marketplace, no al canal B2C tostado.

| Rango SCA | Categoría | Precio sugerido (S//kg verde) |
|---|---|---|
| 80.0 – 83.9 | Selecto | S/ 35/kg |
| 84.0 – 89.9 | Especial | S/ 50/kg |
| 90.0+ | Premium | S/ 86/kg |

Fuente: `PRICING_RULES 2.0.md §9.2` — canal grano verde B2B, valores redondeados.

**RN-B2C-PRE-01 · Precio por tier SCA**
El precio al consumidor (canal B2C tostado) se calcula desde `PRICING_RULES 2.0.md §6` usando el `puntajeOficial` del lote:

| Tier | Precio 250g con IGV |
|---|---|
| Selecto (82–83 pts) | S/ 27.05 |
| Esp. Estándar (84–85 pts) | S/ 28.84 |
| Esp. Alta (86–87 pts) | S/ 36.91 |
| Joya de Finca (88–89 pts) | S/ 42.29 |
| Exclusivo / Geisha (90+) | S/ 51.26 |

El caficultor puede solicitar un precio diferente. TW evalúa y aprueba dentro del rango ±15% del precio de tabla.

**RN-B2C-PRE-02 · Distribución del precio**
```
Precio final con IGV
  │
  ├── IGV (18%)                    → SUNAT
  │
  └── Precio neto
        │
        ├── Caficultor             → precio/bolsa negociado
        ├── Lab (catación)         → feeCatacion / bolsasVendidas
        ├── Lab (tueste + empaque) → (feeTueste + feeEmpaque) / bolsasVendidas
        └── Tunay Wasi             → comisión 10% del precio neto
```

**RN-B2C-PRE-03 · Fórmula del pedido B2C**
```
subtotalCents       = qty × precioUnitarioCents
igvCents            = round(subtotalCents × 0.18)   ← ya incluido en precio
envioCents          = según zona (Lima / provincia)
descuentoCents      = cupón si aplica
totalCents          = subtotalCents + envioCents - descuentoCents
```

**RN-B2C-PRE-04 · Precio bloqueado al pre-ordenar**
El precio unitario se congela en el momento de la pre-orden. Si TW ajusta el precio del lote después (improbable), los pedidos existentes mantienen el precio original.

### Laboratorio aliado (servicios extendidos)

**RN-B2C-LAB-01 · El mismo lab hace cata + tueste + empaque**
En el canal B2C, el laboratorio asignado para la catación es también el responsable del tueste y empaque. No se puede asignar labs distintos para cada servicio en Fase 1.

**RN-B2C-LAB-02 · Fees del lab**
El lab declara en su perfil:
- `feeCatacionPEN` — fee fijo por catación del lote completo
- `feeTuestePorKgCents` — fee por kg verde procesado
- `feeMoliendaPorBolsaCents` — fee adicional si el consumidor pidió molido
- `feeEmpaquePorBolsaCents` — fee por bolsa empacada con etiqueta finca

**RN-B2C-LAB-03 · El fee se distribuye sobre las bolsas vendidas**
El costo de catación se divide entre todas las bolsas del ciclo. A mayor sellout, menor costo por bolsa. Esto incentiva al caficultor a promover su preventa.

**RN-B2C-LAB-04 · Rendimiento de tueste**
1 kg verde → 0.83 kg tostado (yield estándar). El lab confirma el kg tostado real al marcar `tostado_listo`. Si el rendimiento es < 80%, TW revisa antes de proceder.

**RN-B2C-LAB-05 · Etiqueta de la bolsa**
Cada bolsa lleva:
- Nombre del caficultor y finca
- Región y altitud
- Variedad y proceso
- Puntaje SCA oficial
- Fecha de tueste
- Logo Tunay Wasi + QR de trazabilidad

El arte de la etiqueta lo provee TW al lab con los datos del lote.

### Logística B2C

**RN-B2C-LOG-01 · TW coordina el despacho final**
El lab entrega el tostado empacado a TW (o al courier directamente según acuerdo). TW no almacena café — coordina la recogida del courier con la dirección del lab.

**RN-B2C-LOG-02 · Courier aliado**
TW tiene acuerdo con courier aliado (Olva / Shalom / Urbano) para recogida desde el lab. El consumidor ve el carrier y el número de guía en su portal.

**RN-B2C-LOG-03 · Tiempos de entrega**
- Lima Metropolitana: 24–48h desde despacho
- Provincia: 3–5 días hábiles desde despacho

**RN-B2C-LOG-04 · Envío gratis por umbral**
Igual que la preventa actual:
- Lima: gratis desde S/ 100
- Provincia: gratis desde S/ 150

### Calificaciones post-entrega

**RN-B2C-CAL-01 · Consumidor califica el lote**
Al confirmar la entrega, el consumidor puede calificar el lote (1–5 estrellas + comentario opcional). La calificación es pública y aparece en la card del lote y en el perfil del caficultor.

**RN-B2C-CAL-02 · Una calificación por pedido**
No se puede calificar dos veces el mismo pedido.

**RN-B2C-CAL-03 · Plazo para calificar**
30 días desde la entrega confirmada.

---

## Casos especiales

### Rendimiento de tueste inferior al esperado

Si el lab reporta rendimiento < 80%:
1. TW notifica al caficultor con el resultado real
2. TW calcula el impacto en bolsas producidas
3. Si las bolsas producidas < `bolsasVendidas`:
   - TW contacta a los consumidores afectados
   - Opción A: reembolso parcial pro-rata
   - Opción B: esperar al siguiente ciclo del mismo lote
4. Si `bolsasProducidas >= bolsasVendidas`: se procede normalmente

### Lote con puntaje SCA inferior al declarado

Si el `puntajeOficial` del lab es inferior al `puntajeReferencial` declarado por el caficultor:
1. TW genera oferta ajustada al tier real
2. Caficultor tiene 5 días para aceptar o retirar el lote
3. Si acepta: preventa abre con el precio del tier real
4. Si retira: sin penalidad en Fase 1

### Lote que no alcanza umbral SCA (< 82 pts)

1. Lab notifica a TW con reporte completo
2. TW comunica al caficultor con el reporte de cata
3. Lote pasa a `rechazado` — no se publica
4. En Fase 1: TW absorbe el fee de catación para los primeros 15 lotes

### Preventa cancelada por no-sellout

1. Sistema cancela automáticamente al vencer `cierraAt`
2. Todos los `PedidoB2C` pasan a `cancelado`
3. TW reembolsa en máximo 48h hábiles
4. Caficultor recibe notificación + opción de re-publicar en el siguiente ciclo
5. El lab libera la asignación — puede aceptar otros lotes

---

## Permisos por actor

| Acción | Caficultor | Lab | Courier | Consumidor | Admin TW |
|---|---|---|---|---|---|
| Publicar lote B2C | ✓ | — | — | — | — |
| Aceptar solicitud cata B2C | — | ✓ | — | — | — |
| Confirmar envío muestra | ✓ | — | — | — | — |
| Confirmar recepción muestra | — | ✓ | — | — | — |
| Registrar catación SCA | — | ✓ | — | — | — |
| Generar oferta de precio | — | — | — | — | ✓ |
| Aceptar oferta de precio | ✓ | — | — | — | — |
| Pre-ordenar bolsas | — | — | — | ✓ | — |
| Verificar pago | — | — | — | — | ✓ |
| Confirmar envío lote verde al lab | ✓ | — | — | — | — |
| Confirmar recepción verde | — | ✓ | — | — | — |
| Registrar tostado listo | — | ✓ | — | — | — |
| Coordinar courier recogida | — | — | — | — | ✓ |
| Ingresar guía de despacho | — | — | — | — | ✓ |
| Confirmar entrega | — | — | ✓ | ✓ | ✓ |
| Distribuir pagos | — | — | — | — | ✓ |
| Habilitar sellout manual | — | — | — | — | ✓ |
| Calificar lote post-entrega | — | — | — | ✓ | — |
| Cancelar preventa sin sellout | — | — | — | — | ✓ (automático) |
