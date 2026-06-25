# Tunay Wasi — Reglas de Negocio y Flujos
> Versión: junio 2026 (rev. 7 — flujos completos con tracking de muestra física y automatización)

---

## Principios del sistema

1. **Automatización primero.** El sistema ejecuta todas las transiciones de estado sin intervención humana salvo excepciones explícitas.
2. **El puntaje SCA no bloquea la compra.** La cafetería puede comprar un lote sin certificación asumiendo el riesgo de calidad.
3. **El precio lo fija el caficultor.** El puntaje SCA es información — el sistema sugiere un precio referencial por rango SCA (RN-PRE-05) pero el caficultor decide el valor final.
4. **El sistema asigna el laboratorio.** Ni el caficultor ni la cafetería eligen el lab. Elimina conflicto de interés.
5. **Sin stock negativo.** `sacosReservados = Math.max(0, sacosReservados - sacos)` en toda operación.
6. **Lo más simple para todos los actores.** Cada flujo tiene el mínimo de pasos posible. Sin ambigüedad.

---

## Flujo 1 — Publicación y certificación

```
CAFICULTOR              SISTEMA                 LABORATORIO
    │                      │                         │
    │  1. Publica lote      │                         │
    │  (precio, sacos,      │                         │
    │  variedad, proceso,   │                         │
    │  muestras hub: N)     │                         │
    ├─────────────────────> │                         │
    │                       │  2. Sistema calcula     │
    │                       │  precioVentaPEN =       │
    │                       │  origen × 1.10          │
    │                       │  stockMuestrasHub = N   │
    │                       │  status → 'en_catacion' │
    │                       │  Lote visible en        │
    │                       │  catálogo (sin puntaje) │
    │                       │                         │
    │                       │  3. Crea SolicitudCert  │
    │                       │  status='abierta'       │
    │                       │  Notifica a todos los   │
    │                       │  labs activos           │
    │                       ├────────────────────────>│
    │                       │                         │
    │                       │  4. Primer lab acepta   │
    │                       │  (race condition —      │
    │                       │  atómico)               │
    │                       │ <───────────────────────│
    │                       │  SolicitudCert          │
    │                       │  status='aceptada'      │
    │                       │  laboratorioId asignado │
    │                       │                         │
    │  5. Notif: "Lab        │                         │
    │  asignado — enviar     │                         │
    │  muestra a [dirección]"│                         │
    │ <─────────────────────│                         │
    │                       │                         │
    │  6. Caficultor ingresa │                         │
    │  courier + guía →     │                         │
    │  status='muestra_      │                         │
    │  en_camino'           │                         │
    ├─────────────────────> │                         │
    │                       │  7. Lab ve courier      │
    │                       │  y guía en su portal    │
    │                       ├────────────────────────>│
    │                       │                         │
    │                       │  8. Lab confirma        │
    │                       │  recepción →            │
    │                       │  status='muestra_       │
    │                       │  recibida'              │
    │                       │ <───────────────────────│
    │  9. Notif: "El lab     │                         │
    │  recibió tu muestra"  │                         │
    │ <─────────────────────│                         │
    │                       │                         │
    │                       │  10. Lab registra       │
    │                       │  catación SCA desde     │
    │                       │  su portal              │
    │                       │ <───────────────────────│
    │                       │  SolicitudCert          │
    │                       │  status='completada'    │
    │                       │  Lote: puntajeOficial   │
    │                       │  asignado automático    │
    │                       │  status → 'publicado'   │
    │                       │                         │
    │  11. Notif: "Lote      │                         │
    │  certificado —        │                         │
    │  84.5 pts SCA"        │                         │
    │ <─────────────────────│                         │
```

### Estados de `SolicitudCertificacion`

```
abierta → aceptada → muestra_en_camino → muestra_recibida → completada
abierta → expirada   (si ningún lab acepta en 24h — admin asigna manualmente)
```

| Estado | Quién lo activa | Descripción |
|---|---|---|
| `abierta` | Sistema al publicar lote | Solicitud visible para todos los labs activos |
| `aceptada` | Primer lab que acepta | Lab asignado — caficultor ve dirección del lab |
| `muestra_en_camino` | Caficultor — ingresa courier + guía | Muestra física en tránsito al lab |
| `muestra_recibida` | Lab — confirma recepción | Lab puede registrar catación |
| `completada` | Sistema al guardar catación | Puntaje SCA asignado al lote |
| `expirada` | Sistema (Cloud Scheduler 24h) | Ningún lab aceptó — admin interviene |

---

## Flujo 2 — Envío de muestras al hub de Lima

El caficultor envía un batch de muestras de 200g al hub de Lima al publicar su lote. El stock solo se activa cuando el admin confirma la recepción física.

```
CAFICULTOR              SISTEMA                 ADMIN / HUB LIMA
    │                      │                         │
    │  1. Publica lote +    │                         │
    │  ingresa courier +    │                         │
    │  guía del envío       │                         │
    │  al hub + cantidad    │                         │
    ├─────────────────────> │                         │
    │                       │  2. stockMuestrasHub=0  │
    │                       │  muestraHubEnCamino=true│
    │                       │  Notifica al admin      │
    │                       ├────────────────────────>│
    │                       │                         │
    │                       │  3. Admin confirma      │
    │                       │  recepción física       │
    │                       │  stockMuestrasHub = N   │
    │                       │  muestraHubEnCamino=    │
    │                       │  false                  │
    │                       │ <───────────────────────│
    │                       │  Botón "Solicitar       │
    │                       │  muestra" se habilita   │
    │                       │  en el catálogo         │
    │  4. Notif: "Tu batch  │                         │
    │  llegó al hub —       │                         │
    │  N muestras listas"   │                         │
    │ <─────────────────────│                         │
```

---

## Flujo 3 — Solicitud de muestra por la cafetería (opcional)

La cafetería puede solicitar una muestra de 200g de cualquier lote con `stockMuestrasHub > 0`. No es requisito para comprar.

```
CAFETERÍA               SISTEMA                 ADMIN / HUB LIMA
    │                      │                         │
    │  1. Solicita muestra  │                         │
    │  desde el catálogo    │                         │
    ├─────────────────────> │                         │
    │                       │  2. Crea               │
    │                       │  SolicitudMuestra      │
    │                       │  status='pendiente'    │
    │                       │  stockMuestrasHub -= 1 │
    │                       │  (automático)          │
    │                       │  Notifica al admin     │
    │                       ├────────────────────────>│
    │                       │                         │
    │                       │  3. Admin despacha      │
    │                       │  desde hub Lima         │
    │                       │  status='despachada'   │
    │                       │ <───────────────────────│
    │                       │                         │
    │  4. Cafetería recibe  │                         │
    │  la muestra           │                         │
    │  status='recibida'    │                         │
    │ <─────────────────────│                         │
    │                       │                         │
    │  5. (Opcional) Cata   │                         │
    │  privada — registra   │                         │
    │  en su portal         │                         │
    │  status='catada'      │                         │
    ├─────────────────────> │                         │
```

**Reglas:**
- La catación privada de la cafetería (`catacionPrivada`) **nunca** afecta el `puntajeOficial` del lote — es solo para uso interno de la cafetería
- Máximo 3 solicitudes de muestra activas por lote simultáneamente (RN-MUE-01)
- `stockMuestrasHub` se decrementa automáticamente al crear la solicitud
- El botón "Solicitar muestra" solo aparece cuando `stockMuestrasHub > 0`

### Estados de `SolicitudMuestra`

| Estado | Quién lo activa |
|---|---|
| `pendiente` | Sistema al crear |
| `despachada` | Admin desde hub Lima |
| `recibida` | Cafetería confirma recepción |
| `catada` | Cafetería registra catación privada |

---

## Flujo 3 — Compra de sacos (B2B)

La cafetería puede comprar sacos de un lote `en_catacion` (asumiendo el riesgo de calidad) o `publicado` (con puntaje SCA oficial).

```
CAFETERÍA               SISTEMA                 CAFICULTOR          ADMIN
    │                      │                         │                  │
    │  1. Selecciona lote   │                         │                  │
    │  y sacos →            │                         │                  │
    │  CheckoutB2B          │                         │                  │
    ├─────────────────────> │                         │                  │
    │                       │  2. Crea PedidoB2B      │                  │
    │                       │  pagoStatus=            │                  │
    │                       │  'pendiente'            │                  │
    │                       │  logisticaStatus=       │                  │
    │                       │  'pendiente_pago'       │                  │
    │                       │  reservaExpiraAt=       │                  │
    │                       │  now+72h                │                  │
    │                       │  sacosReservados += n   │                  │
    │                       │  Notifica caficultor    │                  │
    │                       ├────────────────────────>│                  │
    │                       │                         │                  │
    │  3. Cafetería paga    │                         │                  │
    │  (transferencia /     │                         │                  │
    │  Izipay / Yape)       │                         │                  │
    ├─────────────────────> │                         │                  │
    │                       │  4. Admin o webhook     │                  │
    │                       │  Izipay verifica pago   │                  │
    │                       │  pagoStatus=            │                  │
    │                       │  'verificado'           │                  │
    │                       │  logisticaStatus=       │                  │
    │                       │  'en_origen'            │                  │
    │                       │  (automático)           │                  │
    │                       │  Notifica caficultor    │                  │
    │                       │  y cafetería            │                  │
    │                       ├────────────────────────>│                  │
    │                       │                         │                  │
    │                       │  5. Caficultor ingresa  │                  │
    │                       │  empresa courier +      │                  │
    │                       │  número de guía →       │                  │
    │                       │  logisticaStatus=       │                  │
    │                       │  'en_transito'          │                  │
    │                       │ <───────────────────────│                  │
    │                       │                         │                  │
    │                       │  6. Admin marca         │                  │
    │                       │  entregado →            │                  │
    │                       │  logisticaStatus=       │                  │
    │                       │  'entregado'            │                  │
    │                       │ <───────────────────────────────────────── │
    │                       │                         │                  │
    │                       │  7. Admin distribuye    │                  │
    │                       │  pagos ≤ 48h hábiles    │                  │
    │                       │  pagoCaficultorStatus=  │                  │
    │                       │  'pagado'               │                  │
    │                       │  pagoLaboratorioStatus= │                  │
    │                       │  'pagado'               │                  │
    │                       │ <───────────────────────────────────────── │
```

### Reserva vencida (automatizado)

```
Cloud Scheduler (cada 60 min)
  → busca pedidos con pagoStatus='pendiente' y reservaExpiraAt < now
  → por cada uno:
      sacosReservados = Math.max(0, sacosReservados - sacosSolicitados)
      pagoStatus      = 'rechazado'
      logisticaStatus = 'cancelado'
      email automático a la cafetería
```

---

## Estados de un lote

| Estado | Quién lo activa | Visible en catálogo | Comprable |
|---|---|---|---|
| `borrador` | Sistema al crear | No | No |
| `en_catacion` | Sistema al publicar | Sí — sin puntaje SCA | Sí — cafetería asume riesgo de calidad |
| `publicado` | Sistema al completar catación | Sí — con puntaje SCA oficial | Sí |
| `agotado` | Sistema — stock llega a 0 | No | No |
| `rechazado` | Admin — intervención manual | No | No |

**Transiciones automáticas:**
- Publicar lote → `borrador` → `en_catacion` (inmediato)
- Lab completa catación → `en_catacion` → `publicado` (inmediato)
- `sacosDisponibles - sacosReservados = 0` → `publicado` → `agotado` (inmediato)

---

## Estados de un pedido

### `pagoStatus`
| Estado | Quién lo activa |
|---|---|
| `pendiente` | Sistema al crear pedido |
| `verificado` | Admin o webhook Izipay (automático) |
| `rechazado` | Cloud Scheduler al vencer reserva (automático) |

### `logisticaStatus`
| Estado | Quién lo activa |
|---|---|
| `pendiente_pago` | Sistema al crear pedido |
| `en_origen` | Sistema automático al verificar pago |
| `en_transito` | Caficultor — ingresa empresa + número de guía |
| `entregado` | Admin |
| `cancelado` | Cloud Scheduler al vencer reserva (automático) |

---

## Asignación de laboratorio — modelo tipo Uber

**RN-LAB-01 · El sistema asigna, nadie elige**
Al publicar un lote el sistema crea una `SolicitudCertificacion` con `status='abierta'` y notifica a todos los laboratorios activos simultáneamente. El primer lab que acepta queda asignado atómicamente. Ni el caficultor ni la cafetería intervienen.

**RN-LAB-02 · Aceptar o ignorar**
El lab ve en su portal: nombre del lote, variedad, región y su fee. Puede aceptar o ignorar. Si acepta, la solicitud deja de aparecer para los demás labs.

**RN-LAB-03 · Capacidad máxima**
Un lab no puede aceptar nuevas solicitudes si ya tiene 3 solicitudes activas (`aceptada`, `muestra_en_camino` o `muestra_recibida`) sin completar.

**RN-LAB-04 · Timeout 24h**
Si ningún lab acepta en 24h, la solicitud pasa a `expirada` y el admin recibe una alerta para asignar manualmente.

**RN-LAB-05 · El fee lo fija el lab**
Cada laboratorio define su `feeCatacionPEN` en su perfil. El caficultor ve el fee en su portal una vez que el lab acepta.

**RN-LAB-06 · Sin contacto directo**
La plataforma no expone el email, teléfono ni nombre del lab a la cafetería — solo el puntaje resultante. Elimina el conflicto de interés.

**RN-LAB-07 · Botón de catación condicionado**
El lab solo puede registrar la catación cuando `status='muestra_recibida'`. No antes.

---

## Reglas de negocio

### Catálogo

**RN-CAT-01 · Qué lotes son visibles**
Solo `en_catacion` y `publicado`. Los lotes `borrador`, `agotado` y `rechazado` no aparecen.

**RN-CAT-02 · Orden del catálogo**
1. Lotes `publicado` con `puntajeOficial` — ordenados por puntaje descendente
2. Lotes `en_catacion` sin puntaje oficial — ordenados por fecha de publicación descendente

**RN-CAT-03 · Compra sin certificación**
La cafetería puede comprar sacos de un lote `en_catacion`. El sistema muestra un aviso: "Este lote aún no tiene puntaje SCA oficial. La calidad no ha sido verificada por un Q-Grader." La cafetería asume el riesgo.

**RN-CAT-04 · Precio visible**
El catálogo muestra `precioVentaPEN` (precio con comisión incluida) y adicionalmente el desglose: precio del caficultor + comisión Tunay Wasi. Transparencia total para la cafetería.

### Calidad

**RN-CAL-01 · Quién registra el puntaje oficial**
Solo el laboratorio certificado (Q-Grader) registra el `puntajeOficial`. La catación privada de la cafetería nunca afecta el puntaje público.

**RN-CAL-02 · Puntaje público**
El `puntajeOficial` registrado por el lab es visible en el catálogo para todas las cafeterías.

**RN-CAL-03 · El puntaje no fija el precio**
El precio lo fija el caficultor al publicar. El puntaje SCA es información — el sistema muestra un precio sugerido (RN-PRE-05) pero no lo aplica automáticamente.

### Precios

**RN-PRE-01 · Precio de venta calculado automáticamente**
Al publicar el lote, el sistema calcula:
```
precioVentaPEN = precioOrigenPEN + round(precioOrigenPEN × COMISION_TW)
```
`COMISION_TW` = 10% (configurable en `src/shared/config.ts`).

**RN-PRE-02 · Fórmula del total de un pedido**
```
subtotalPEN       = sacosSolicitados × precioVentaPEN
igvPEN            = round(subtotalPEN × 0.18)
fletePEN          = 25 × sacosSolicitados
feeLaboratorioPEN = lab.feeCatacionPEN  (solo informativo — solo si el lote tiene puntajeOficial al momento del pedido)

totalPEN = subtotalPEN + igvPEN + fletePEN + feeLaboratorioPEN
```
El fee del laboratorio se cobra a través de la `SolicitudCertificacion`, no del pedido. El campo `feeLaboratorioPEN` en el pedido es solo referencia informativa para la cafetería.

**RN-PRE-03 · Peso por saco**
1 saco = 60 kg.

**RN-PRE-05 · Precio sugerido por puntaje SCA (canal grano verde B2B)**
Tras completar la catación, el sistema muestra al caficultor un precio sugerido basado en el `puntajeOficial` del lote. El caficultor puede aceptarlo o ajustarlo — es una referencia, no un valor forzado.

| Rango SCA | Categoría | Precio sugerido (S//kg verde) |
|---|---|---|
| 80.0 – 83.9 | Selecto | S/ 35/kg |
| 84.0 – 89.9 | Especial | S/ 50/kg |
| 90.0+ | Premium | S/ 86/kg |

Fuente: `PRICING_RULES 2.0.md` §9.2 — canal grano verde B2B. Precios redondeados para legibilidad. El caficultor ve el precio sugerido en su tarjeta de lote cuando `puntajeOficial` existe.

**RN-PRE-04 · Lo que recibe cada actor**
```
Total pagado por la cafetería
  │
  ├── Caficultor  → sacosSolicitados × precioOrigenPEN
  ├── Laboratorio → feeCatacionPEN (cobrado via SolicitudCertificacion, no via pedido)
  └── Tunay Wasi  → comisión 10% + IGV + flete
```
Si el lote no tiene certificación, el laboratorio no cobra nada en esa transacción.

### Reservas

**RN-RES-01 · Duración de la reserva**
72 horas desde la creación del pedido. Si el pago no se verifica en ese plazo, el sistema libera automáticamente.

**RN-RES-02 · First-pay-wins**
Los sacos se reservan al confirmar el pedido. Gana quien confirma el pago primero dentro de las 72h.

**RN-RES-03 · Sin stock negativo**
```
lote.sacosReservados = Math.max(0, sacosReservados - sacos)
```

### Logística

**RN-LOG-01 · Envío directo origen → cafetería**
El caficultor despacha los sacos directamente a la cafetería. Tunay Wasi no almacena sacos.

**RN-LOG-02 · Número de guía obligatorio**
El caficultor debe ingresar empresa transportista y número de guía para que `logisticaStatus` cambie a `en_transito`.

**RN-LOG-03 · Trigger de pago al caficultor**
El pago al caficultor se habilita cuando `logisticaStatus = 'en_transito'`. El admin ejecuta dentro de 48h hábiles.

### Muestras

**RN-MUE-01 · Máximo 3 solicitudes activas por lote**
Un lote no puede tener más de 3 solicitudes de muestra simultáneas en estado `pendiente` o `despachada`.

**RN-MUE-02 · El caficultor declara y envía el batch al hub al publicar**
En el formulario de publicación el caficultor ingresa: cantidad de muestras de 200g, empresa courier y número de guía del envío al hub Lima. El campo `stockMuestrasHub` arranca en 0 hasta que el admin confirme la recepción física.

**RN-MUE-03 · Stock se activa al confirmar recepción en el hub**
El admin confirma en su panel que el batch llegó al hub. Solo entonces `stockMuestrasHub = N` y el botón "Solicitar muestra" se habilita en el catálogo.

**RN-MUE-04 · Stock se decrementa automáticamente al solicitar**
Al crear una `SolicitudMuestra`, el sistema decrementa `stockMuestrasHub` en 1. Si `stockMuestrasHub = 0`, el botón se deshabilita automáticamente — sin intervención del admin.

---

## Flujo 4 — Calificaciones post-transacción

Las calificaciones se habilitan automáticamente al completar la transacción. Solo entre actores que interactuaron directamente.

```
CAFETERÍA               SISTEMA                 CAFICULTOR
    │                      │                         │
    │                      │  logisticaStatus=       │
    │                      │  'entregado'            │
    │                      │  → habilita calific.    │
    │                      │  para ambos             │
    │                      │                         │
    │  1. Cafetería         │                         │
    │  califica al          │                         │
    │  caficultor           │                         │
    │  (1-5 estrellas +     │                         │
    │  comentario opcional) │                         │
    ├─────────────────────> │                         │
    │                       │  2. Sistema actualiza   │
    │                       │  promedioCalificacion   │
    │                       │  del caficultor         │
    │                       │  (visible en catálogo)  │
    │                       │                         │
    │                       │                  3. Caficultor
    │                       │                  califica a
    │                       │                  la cafetería
    │                       │                  (1-5 estrellas +
    │                       │                  comentario opcional)
    │                       │ <───────────────────────│
    │                       │  4. Sistema actualiza   │
    │                       │  promedioCalificacion   │
    │                       │  de la cafetería        │
    │                       │  (visible para          │
    │                       │  caficultores)          │
```

### Reglas de calificación

**RN-CAL-04 · Solo entre actores que transaccionaron**
- Cafetería califica al caficultor — cuando `logisticaStatus = 'entregado'`
- Caficultor califica a la cafetería — cuando `pagoCaficultorStatus = 'pagado'`

**RN-CAL-05 · Una calificación por pedido**
No se puede calificar dos veces el mismo pedido. El botón desaparece una vez enviada la calificación.

**RN-CAL-06 · Escala y campos**
- Puntaje: 1 a 5 estrellas (entero)
- Comentario: opcional, máximo 300 caracteres

**RN-CAL-07 · Visibilidad**
- Puntaje promedio del caficultor → visible en el catálogo para todas las cafeterías
- Puntaje promedio de la cafetería → visible para los caficultores en su portal
- El laboratorio no recibe calificación pública — su reputación es su historial de cataciones (métricas internas del admin)

**RN-CAL-08 · Cálculo del promedio**
```
promedioCalificacion = suma de todas las calificaciones / totalCalificaciones
```
Ambos campos se actualizan automáticamente al registrar cada calificación.

**RN-CAL-09 · Plazo para calificar**
30 días desde que se habilita la calificación. Después el sistema cierra la ventana automáticamente.

---

| Destinatario | Condición | Plazo |
|---|---|---|
| Caficultor | `logisticaStatus = 'en_transito'` | ≤ 48h hábiles |
| Laboratorio | `SolicitudCert.status = 'completada'` | ≤ 48h hábiles |

---

## Flujo 5 — Perfiles y visibilidad

### Perfil público del caficultor

Visible para cualquier persona sin necesidad de login. Indexable por Google.

| Sección | Campos |
|---|---|
| Identidad | Nombre, foto, nombre de finca, región, altitud |
| Reputación | ★ promedio + total de calificaciones recibidas de cafeterías |
| Lotes activos | Lista de lotes `publicado` o `en_catacion` con puntaje SCA si existe |
| Historial | Lotes anteriores certificados (solo `publicado` + `agotado`) |

**URL:** `/caficultor/{caficultorId}` — pública, sin auth.

**Cuándo aparece:** desde que el caficultor publica su primer lote (RN-PER-01).

**Campos desnormalizados en `usuarios_perfil`** (se actualizan en cada calificación recibida):
- `promedioCalificacion` — promedio actual de todas las calificaciones
- `totalCalificaciones` — cantidad total

### Perfil privado de la cafetería

Visible **solo para el caficultor** cuando existe un pedido activo de esa cafetería. No es público ni indexable.

| Sección | Campos |
|---|---|
| Identidad | Nombre comercial, tipo (tostadora / cafetería / hotel / oficina), distrito |
| Reputación | ★ promedio + total de calificaciones recibidas de caficultores |
| Historial | Lista de pedidos confirmados (solo los que involucran al caficultor que consulta) |

**Acceso:** exclusivamente desde el portal del caficultor → "Mis pedidos" → detalle del pedido → perfil del comprador.

### Reglas de perfil

| ID | Regla |
|---|---|
| RN-PER-01 | El perfil público del caficultor se activa automáticamente al publicar su primer lote |
| RN-PER-02 | `promedioCalificacion` y `totalCalificaciones` en `usuarios_perfil` se recalculan con cada nueva calificación recibida |
| RN-PER-03 | El perfil de la cafetería NO es público — nunca aparece en Google ni en el catálogo |

---

## Permisos por actor

| Acción | Caficultor | Cafetería | Laboratorio | Admin |
|---|---|---|---|---|
| Publicar lote | ✓ | — | — | — |
| Aceptar solicitud de certificación | — | — | ✓ | — |
| Confirmar envío de muestra al lab | ✓ | — | — | — |
| Confirmar recepción de muestra | — | — | ✓ | — |
| Registrar puntaje SCA | — | — | ✓ | — |
| Solicitar muestra 200g | — | ✓ | — | — |
| Registrar catación privada | — | ✓ | — | — |
| Comprar sacos | — | ✓ | — | — |
| Confirmar envío de sacos | ✓ | — | — | — |
| Verificar pago | — | — | — | ✓ |
| Distribuir pagos | — | — | — | ✓ |
| Gestionar logística | — | — | — | ✓ |
| Asignación manual de lab (timeout 24h) | — | — | — | ✓ |
| Liberar reservas vencidas | — | — | — | ✓ (automático) |
| Calificar al caficultor (post-entrega) | — | ✓ | — | — |
| Calificar a la cafetería (post-pago) | ✓ | — | — | — |
| Despachar muestra desde hub Lima | — | — | — | ✓ |

---

## Campos requeridos por entidad

### Lote (`mkt_lotes`)

| Campo | Requerido | Descripción |
|---|---|---|
| `caficultorId` | ✓ | FK al perfil del caficultor |
| `nombreLote` | ✓ | Nombre visible en el catálogo |
| `variedad` | ✓ | Geisha, Caturra, etc. |
| `proceso` | ✓ | `lavado` / `natural` / `honey` / `anaerobico` / `doble_fermentacion` |
| `precioOrigenPEN` | ✓ | Precio del caficultor por saco (entero PEN) |
| `precioVentaPEN` | ✓ — calculado al publicar | `precioOrigenPEN × 1.10` |
| `sacosDisponibles` | ✓ | Entero ≥ 1 |
| `sacosReservados` | ✓ | Inicia en 0 |
| `altitud` | Recomendado | "1850 msnm" |
| `region` | Recomendado | Departamento / provincia |
| `cosecha` | Recomendado | "Junio 2026" |
| `stockMuestrasHub` | ✓ | Unidades de 200g declaradas por el caficultor — activa en 0 hasta confirmación del hub |
| `muestraHubEnCamino` | ✓ — calculado al publicar | `true` mientras el batch no llega al hub |
| `courierMuestrasHub` | ✓ | Empresa courier del envío al hub |
| `guiaMuestrasHub` | ✓ | Número de guía del envío al hub |
| `puntajeReferencial` | Recomendado | Declarado por el caficultor — no es oficial |
| `puntajeOficial` | Post-catación | Decimal, asignado por el lab. Hace el lote `publicado` |

### Solicitud de certificación (`mkt_solicitudes_certificacion`)

| Campo | Requerido | Descripción |
|---|---|---|
| `loteId` | ✓ | FK al lote |
| `caficultorId` | ✓ | FK al caficultor — para notificaciones |
| `nombreLote` | ✓ | Desnormalizado — para portal del lab |
| `status` | ✓ | Ver estados arriba |
| `laboratorioId` | Post-aceptación | FK al lab asignado |
| `feeCatacionPEN` | Post-aceptación | Fee fijado por el lab |
| `empresaCourierMuestra` | Post-envío | Courier elegido por el caficultor |
| `numeroGuiaMuestra` | Post-envío | Número de guía del courier |
| `guiaEnviadaAt` | Post-envío | ISO — cuando caficultor confirmó envío |
| `muestraRecibidaAt` | Post-recepción | ISO — cuando lab confirmó recepción |

### Pedido (`mkt_pedidos`)

| Campo | Requerido | Descripción |
|---|---|---|
| `loteId` | ✓ | FK al lote comprado |
| `tostadoraId` | ✓ | FK al perfil de la cafetería |
| `caficultorId` | ✓ | FK al caficultor — desnormalizado |
| `laboratorioId` | Si aplica | FK al lab — para pago del fee |
| `sacosSolicitados` | ✓ | Entero ≥ 1 |
| `kgTotal` | ✓ | `sacosSolicitados × 60` |
| `subtotalPEN` | ✓ | `sacosSolicitados × precioVentaPEN` |
| `igvPEN` | ✓ | `round(subtotalPEN × 0.18)` |
| `fletePEN` | ✓ | `25 × sacosSolicitados` |
| `feeLaboratorioPEN` | Si aplica | Fee del lab asignado al lote |
| `totalPEN` | ✓ | Suma completa |
| `montoCaficultorPEN` | ✓ | `sacosSolicitados × precioOrigenPEN` |
| `razonSocial` | ✓ | Para factura |
| `ruc` | ✓ | 11 caracteres |
| `email` | ✓ | Contacto de la cafetería |
| `telefono` | ✓ | Contacto de la cafetería |
| `direccionEntrega` | ✓ | Dirección de destino |
| `metodoPago` | ✓ | `transferencia` / `izipay` / `yape` |
| `reservaExpiraAt` | ✓ | `now + 72h` |
| `empresaTransporte` | Post-despacho | Ingresado por el caficultor |
| `numeroGuia` | Post-despacho | Ingresado por el caficultor |
