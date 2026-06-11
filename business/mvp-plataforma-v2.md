# MVP Plataforma Tunay Wasi — v2
> Versión: junio 2026
> Reemplaza: `MVP plataforma.md` y `flujo-operativo.md` (basados en modelo físico anterior)

---

## Principio fundamental

**Tunay Wasi no maneja café. No compra, no tuesta, no empaca.**

Somos la plataforma que hace visible el mercado que ya existe pero que nadie puede ver:
caficultores con lotes de calidad que el mercado no puede leer, tostadores y cafeterías que
buscan origen con trazabilidad pero coordinan todo por WhatsApp.

Conectamos tres actores. Gestionamos la transacción. Nos quedamos una comisión.

**La compra siempre parte de la cafetería.** El caficultor publica primero. El mercado reacciona después.

---

## Problemas que resolvemos y features que los atacan

> Estos son los caballitos de batalla de la plataforma. No existen resueltos en el mercado peruano.

| Problema | Feature implementado |
|---|---|
| **Opacidad de origen** — el caficultor no puede demostrar que su café vale más; la cafetería no puede verificarlo sin un intermediario | `CaficultorPortal` + `LaboratorioPortal` — ficha de lote completa (variedad, proceso, altitud, cosecha) + catación SCA certificada antes de comprar |
| **Sin validación independiente de calidad** — la cafetería depende de la palabra del vendedor | `LaboratorioPortal` — lab registra puntaje SCA, acidez, cuerpo, balance, notas de sabor y aprueba el lote |
| **Fragmentación del pipeline** — muestra, lab, compra, despacho y pago son 4 conversaciones de WhatsApp con 4 actores distintos | `MarketplaceLotes` — todo el flujo en una sola pantalla: solicita muestra → contrata lab → compra sacos → confirma despacho |
| **Exclusión del microlote** — los lotes pequeños de calidad no llegan al mercado porque no hay infraestructura para comercializarlos en 1-5 sacos | `CheckoutB2B` — compra desde 1 saco (60 kg) con IGV, reserva de 72h y factura electrónica |
| **Caficultor cobra tarde y mal** — el intermediario retiene el pago sin trazabilidad | `AdminPanel` — distribuye pago al caficultor (precio base) y al laboratorio (fee catación) por separado, trazado en Firestore |
| **Sin trazabilidad para el empaque ni la carta** — el origen del café en barra es inventado | Ficha de lote en `MarketplaceLotes` con finca, variedad, proceso, altitud y puntaje SCA descargable |

---

## Modelo de ingresos

### Base: comisión por transacción (implementado)

**10% sobre el total de cada pedido confirmado.**

Se alinea con el éxito — Tunay Wasi solo cobra cuando hay valor real entregado.
Elimina fricción de entrada para el caficultor: no paga por estar disponible si no vende.
Frente al intermediario tradicional (30-40% de margen, sin trazabilidad), el 10% con plataforma es el diferenciador.

```
Precio final que paga la cafetería
    │
    ├── Caficultor     → precio base que él fijó (por saco)
    ├── Laboratorio    → fee de catación (lo fija el laboratorio)
    └── Tunay Wasi     → 10% sobre el subtotal
```

### Upgrade: membresía Pro (v2 — no implementado)

Cafetería paga una tarifa mensual fija por beneficios adicionales:

| Beneficio | Descripción |
|---|---|
| Pre-reserva de lotes | Acceso a lotes nuevos antes de publicarse en el catálogo general |
| Agenda de tuestes incluida | F19 — programación semanal/quincenal sin costo adicional por sesión |
| Ficha de trazabilidad con marca blanca | PDF con el logo de la cafetería para su empaque y carta |
| Prioridad en solicitudes de muestra | Sus solicitudes aparecen primero ante el caficultor |

> La membresía Pro no reemplaza la comisión por transacción — la complementa. Una cafetería Pro sigue pagando el 10% pero accede a ventajas operativas que justifican el volumen.

---

## Los actores de la plataforma

### 1. Caficultor
- Tiene el lote, conoce su finca, sabe su proceso
- No habla el lenguaje técnico del mercado (puntaje SCA, datos de tueste)
- No tiene acceso directo a tostadores ni cafeterías
- **Qué hace en la plataforma:** registra su lote con datos básicos (variedad, proceso, altitud, cosecha, sacos disponibles, precio mínimo por saco), publica y espera que el mercado reaccione

### 2. Laboratorio (catación)
- Evalúa la calidad del café mediante catación SCA
- Puede ser un laboratorio independiente o una cafetería con laboratorio propio
- Tiene cuenta propia en la plataforma
- **Quién le paga:** Tunay Wasi le transfiere el fee de catación del pago total de la cafetería
- **Servicio que ofrece dentro de la plataforma:**
  - **Catación** — puntaje SCA, acidez, cuerpo, balance, notas de sabor, perfil de tueste sugerido
- **Qué hace en la plataforma:** recibe solicitudes de catación, sube resultados, el lote queda "Aprobado"
- **Tueste:** fuera de la plataforma en el MVP — la cafetería coordina directamente con el lab o con su propio tostador. El lab puede ofrecer agenda de tuestes en una versión futura.

### 3. Cafetería de especialidad
Existen dos perfiles — la plataforma los trata como **un solo actor con roles opcionales**:

#### 3a. Cafetería sin laboratorio propio
- No tiene Q-Grader ni tostadora
- Compra el grano verde y contrata al laboratorio para **catarlo** — dentro de la plataforma
- El tueste lo coordina directamente con el lab o proveedor externo fuera de la plataforma
- **Qué hace en la plataforma:** navega el catálogo, pide muestra, solicita catación al laboratorio, compra sacos

#### 3b. Cafetería con laboratorio propio (comprador + laboratorio)
- Tiene Q-Grader y tostadora propia
- Cata y tuesta para uso propio — no necesita contratar el servicio externo
- También puede ofrecer sus servicios de catación y tueste a otras cafeterías dentro de la plataforma, cobrando los fees correspondientes
- **Qué hace en la plataforma:** todo lo de 3a **más** la sección **"Mi laboratorio"** para registrar cataciones y gestionar tuestos — sin cambiar de cuenta

> **Modelo de roles (un actor, dos roles):**
> Al registrarse, la cafetería declara si tiene laboratorio (`tieneLaboratorio: true`).
> Si lo tiene, su portal activa la sección "Mi laboratorio" integrada.
> El flujo natural: ve el lote → pide muestra → cata → tuesta → sirve en su carta.
> Todo dentro de la plataforma.

### 4. Admin Tunay Wasi
- No cata. No tuesta. No compra
- **Qué hace en la plataforma:** visualiza el flujo completo, publica lotes aprobados, gestiona la distribución de pagos (caficultor + laboratorio), fija los fees de catación y tueste, administra qué cafeterías tienen habilitado el rol laboratorio

---

## Flujo completo de un microlote

### Flujo A — Cafetería con laboratorio propio

```
CAFICULTOR                PLATAFORMA              CAFETERÍA CON LAB
    │                         │                       │
    │  1. Registra y publica   │                       │
    │  lote (variedad, proceso,│                       │
    │  altitud, cosecha, sacos,│                       │
    │  precio mínimo)          │                       │
    ├────────────────────────>│  Estado: PUBLICADO    │
    │                         │                       │
    │                         │        2. Navega catálogo,
    │                         │        solicita muestra (200g)
    │                         │        gratis
    │                         │<──────────────────────│
    │                         │  Estado: MUESTRA_     │
    │                         │  SOLICITADA           │
    │                         │                       │
    │  3. Confirma despacho    │                       │
    │  de muestra en su portal │                       │
    ├────────────────────────>│  Estado: MUESTRA_     │
    │                         │  ENVIADA              │
    │                         │                       │
    │                         │        4. Confirma recepción
    │                         │        de muestra en
    │                         │        "Mis gestiones"
    │                         │<──────────────────────│
    │                         │  Estado: MUESTRA_     │
    │                         │  RECIBIDA             │
    │                         │                       │
    │                         │        5. Registra catación
    │                         │        en "Mi laboratorio":
    │                         │        puntaje SCA, acidez,
    │                         │        cuerpo, balance, notas
    │                         │<──────────────────────│
    │                         │                       │
    │                         │  ≥ 82 pts:            │
    │                         │  Estado: APROBADO     │
    │                         │  botón "Comprar sacos"│
    │                         │  resaltado            │
    │                         │──────────────────────>│
    │                         │                       │
    │                         │  < 82 pts:            │
    │                         │  Estado: RECHAZADO    │
    │                         │  Admin TW notificado  │
    │                         │                       │
    │                         │        6. Compra sacos
    │                         │<──────────────────────│
    │                         │                       │
    │  7. Admin distribuye     │                       │
    │  pago y transfiere       │                       │
    │<────────────────────────│                       │
```

**Estados de la solicitud de muestra:**

| Estado | Quién lo activa | Descripción |
|---|---|---|
| `pendiente` | Sistema | Muestra solicitada, caficultor aún no confirma |
| `despachada` | Caficultor | Caficultor confirmó el envío desde su portal |
| `recibida` | Cafetería | Cafetería confirmó que recibió la muestra físicamente |
| `catada` | Cafetería con lab / Laboratorio externo | Catación registrada, lote aprobado o rechazado |

**Regla de negocio — bloqueo de contratación de laboratorio externo:**

> Si `tieneLaboratorio: true`, la plataforma **no muestra la opción "Contratar laboratorio"** en ningún punto del flujo.
> La cafetería con lab propio siempre cata internamente desde "Mi laboratorio".
> Esto evita que una cafetería con lab propio pague un fee externo innecesario y mantiene la coherencia del modelo de costos.

**Lógica en el stepper "Mis gestiones" — paso Recibida → Catada:**

| Perfil cafetería | Acción disponible en paso 3 |
|---|---|
| `tieneLaboratorio: false` | Botón **"Contratar laboratorio →"** — abre modal de selección de lab |
| `tieneLaboratorio: true` | Mensaje **"Registra la catación en Mi laboratorio"** — sin opción de contratar lab externo |

---

### Flujo B — Cafetería sin laboratorio propio

```
CAFICULTOR          PLATAFORMA        LABORATORIO       CAFETERÍA SIN LAB
    │                   │                  │                   │
    │  1. Registra y     │                  │                   │
    │  publica lote      │                  │                   │
    ├──────────────────>│  Estado:         │                   │
    │                   │  PUBLICADO       │                   │
    │                   │                  │                   │
    │                   │                  │    2. Navega catálogo,
    │                   │                  │    pide muestra (200g)
    │                   │<─────────────────────────────────────│
    │                   │  Estado: MUESTRA_│                   │
    │                   │  SOLICITADA      │                   │
    │                   │                  │                   │
    │  3. Despacha       │                  │                   │
    │  muestra a la      │                  │                   │
    │  cafetería         │                  │                   │
    ├──────────────────>│  Estado: MUESTRA_│                   │
    │                   │  ENVIADA         │                   │
    │                   │                  │                   │
    │                   │                  │    4. Ve lista de labs
    │                   │                  │    disponibles en la
    │                   │                  │    plataforma (labs
    │                   │                  │    independientes +
    │                   │                  │    cafeterías con lab)
    │                   │                  │    elige uno y contrata
    │                   │<─────────────────────────────────────│
    │                   │                  │                   │
    │                   │  5. Plataforma   │                   │
    │                   │  asigna la       │                   │
    │                   │  muestra al lab  │                   │
    │                   ├────────────────>│                   │
    │                   │  Estado:         │                   │
    │                   │  EN_CATACION     │                   │
    │                   │                  │                   │
    │                   │                  │  6. Cata y tuesta │
    │                   │                  │  sube resultado   │
    │                   │<─────────────────│                   │
    │                   │  Estado: APROBADO│                   │
    │                   │                  │                   │
    │                   │                  │    7. Compra sacos │
    │                   │<─────────────────────────────────────│
    │                   │                  │                   │
    │  8. Admin          │                  │                   │
    │  distribuye pago   │                  │                   │
    │  caficultor +      │                  │                   │
    │  laboratorio       │                  │                   │
    │<──────────────────│──────────────────│                   │
```

### Fee del laboratorio en el Flujo B

Cuando la cafetería contrata un laboratorio externo (Flujo B), el lab realiza **un servicio dentro de la plataforma**:

| Servicio | Campo Firestore | Descripción |
|---|---|---|
| Catación SCA | `feeLaboratorioPEN` | Q-Grader evalúa el café, emite ficha SCA con puntaje, acidez, cuerpo, balance, notas de sabor, perfil de tueste sugerido |

**Reglas MVP:**
- El fee de catación es fijo — lo define el laboratorio en su perfil (`feeCatacionPEN`)
- El **tueste no se cobra dentro de la plataforma** en el MVP — la cafetería lo coordina directamente con el lab. El campo `feeTuestePEN` queda en el perfil del lab para uso futuro
- El caficultor **envía los sacos directamente a la cafetería** — no pasan por el laboratorio
- El fee de catación se suma al total del pedido: `total = subtotal + IGV + flete + feeLaboratorioPEN`
- Aparece como línea separada "Catación (lab)" en el desglose del CheckoutB2B y en "Mis gestiones"
- El admin distribuye el `feeLaboratorioPEN` al laboratorio al confirmar el pago (igual que paga al caficultor)
- Si la cafetería tiene laboratorio propio (`tieneLaboratorio: true`), no hay fee externo — `feeLaboratorioPEN` queda `undefined`

**Feature futura — Agenda de tuestes (v2):**
Ver sección "Agenda de tuestes" al final de este documento.

---

## Estados de un lote

| Estado | Quién lo activa | Descripción |
|---|---|---|
| `borrador` | Caficultor | Lote registrado, aún no publicado |
| `publicado` | Caficultor | Visible en el catálogo del marketplace |
| `muestra_solicitada` | Cafetería | Cafetería pidió muestra de 200g (gratis) |
| `muestra_enviada` | Caficultor | Muestra despachada a la cafetería |
| `en_catacion` | Sistema (al asignar lab) | Lab externo asignado, está catando (solo Flujo B) |
| `aprobado` | Lab externo / Cafetería con lab propio | Puntaje SCA registrado ≥ 82 pts — listo para vender |
| `agotado` | Sistema | `sacosDisponibles - sacosReservados = 0` |
| `rechazado` | Lab externo / Cafetería con lab propio | Puntaje SCA < 82 pts — admin notificado |

**Nota:** En el Flujo A (cafetería con lab propio), el lote pasa directamente de `muestra_enviada` → `aprobado` sin pasar por `en_catacion`, porque la cafetería cata internamente sin asignación formal de laboratorio.

---

## Estados de un pedido (`mkt_pedidos`)

### `pagoStatus`
| Estado | Descripción |
|---|---|
| `pendiente` | Pedido creado, esperando transferencia del comprador |
| `verificado` | Admin confirmó recepción del pago |
| `expirado` | Pasaron 72h sin pago — reserva liberada manualmente por admin |

### `logisticaStatus`
| Estado | Quién lo activa | Descripción |
|---|---|---|
| `pendiente_pago` | Sistema | Estado inicial al crear el pedido |
| `en_origen` | Admin | Pago verificado — caficultor puede despachar |
| `en_transito` | Caficultor | Sacos despachados hacia la cafetería |
| `en_almacen` | Admin | En hub de consolidación Lima (opcional en MVP) |
| `entregado` | Admin | Sacos recibidos en la cafetería |

### `pagoCaficultorStatus`
| Estado | Descripción |
|---|---|
| `pendiente` | Aún no se ha transferido al caficultor |
| `pagado` | Admin realizó la transferencia al caficultor |

### `pagoLaboratorioStatus` (solo Flujo B)
| Estado | Descripción |
|---|---|
| `pendiente` | Fee de catación aún no transferido al laboratorio |
| `pagado` | Admin realizó la transferencia al laboratorio |

---

## Política de concurrencia y disputas de stock

### Principio: first-pay-wins con ventana de reserva

Cuando un lote queda `aprobado`, **múltiples cafeterías pueden haber catado el mismo lote** (cada una solicitó su propia muestra de 200g). Todas ven el botón "Comprar sacos" al mismo tiempo. La política es:

**Gana quien confirma el pago primero** — con las siguientes reglas:

### Reglas de reserva de sacos

1. **Reserva al iniciar pedido** — cuando una cafetería hace click en "Confirmar pedido", los sacos solicitados se marcan como `sacosReservados` inmediatamente, bloqueando ese stock para otras.

2. **Ventana de pago: 72 horas** — la cafetería tiene 72h para completar la transferencia y adjuntar el comprobante. Si no lo hace, la reserva expira y los sacos vuelven al pool disponible. En MVP la liberación es manual por el admin; en v2 se automatiza con Cloud Function.

3. **Múltiples muestras del mismo lote** — permitido. El impacto en stock es insignificante (200g vs. 600kg por lote). El límite operativo es **5 solicitudes de muestra activas simultáneas** por lote — el admin interviene manualmente si se supera. No hay prioridad de compra por orden de solicitud de muestra.

4. **Compra parcial permitida** — una cafetería puede comprar un subconjunto de los sacos disponibles. Los sacos restantes siguen disponibles para otras cafeterías hasta agotar el stock.

5. **Sin límite de sacos por cafetería en MVP** — una cafetería puede comprar el lote completo si llega primero. Se evalúa límite en v2 si hay evidencia de acaparamiento.

### Ejemplo

```
Lote DEMO 01 — 10 sacos disponibles
─────────────────────────────────────────────────
10:00 — Cafetería A confirma pedido de 6 sacos
         sacosReservados = 6  |  disponibles = 4
         → Tiene 72h para pagar

10:15 — Cafetería B confirma pedido de 4 sacos
         sacosReservados = 10  |  disponibles = 0
         → Tiene 72h para pagar

10:30 — Cafetería C intenta comprar → "Sin stock disponible"

11:00 — Cafetería A paga → admin verifica → pedido confirmado

72h + 1min — Cafetería B no pagó → admin libera reserva manualmente
         sacosReservados = 6  |  disponibles = 4
         → Cafetería C puede intentar de nuevo
```

### Campos en Firestore afectados

| Campo | Colección | Descripción |
|---|---|---|
| `sacosDisponibles` | `mkt_lotes` | Total de sacos del lote |
| `sacosReservados` | `mkt_lotes` | Suma de sacos en pedidos activos |
| `reservaExpiraAt` | `mkt_pedidos` | Timestamp límite para pagar (now + 72h) |
| `pagoStatus` | `mkt_pedidos` | `pendiente_pago` → `verificado` → expirado |

---

## Portales por actor

### Portal Caficultor
- Registrar nuevo lote (variedad, proceso, altitud, cosecha, sacos, precio mínimo por saco)
- Publicar lote → queda visible en el catálogo
- Ver estado de cada lote en tiempo real con badge por estado
- Ver solicitudes de muestra recibidas — muestra empresa, contacto y dirección de entrega de la cafetería
- Confirmar despacho de muestra → `status: 'muestra_enviada'`
- **"Pedidos por despachar"** — aparece cuando `pagoStatus === 'verificado'` y `logisticaStatus === 'en_origen'`:
  - Muestra ID pedido, lote, sacos, kg, dirección de entrega de la cafetería (nunca del lab)
  - Botón **"Confirmar envío →"** → `logisticaStatus: 'en_transito'`
- Historial de pagos recibidos (`pagoCaficultorStatus === 'pagado'`)

### Portal Cafetería

#### Modo comprador (siempre activo)

##### Reglas de visibilidad del catálogo

El catálogo muestra lotes que cumplen **todas** estas condiciones:

| Condición | Valor requerido | Razón |
|---|---|---|
| `status` | `publicado`, `muestra_solicitada`, `muestra_enviada`, `en_catacion`, `aprobado` | Lotes activos en cualquier etapa del flujo |
| `sacosDisponibles - sacosReservados` | `> 0` | Solo lotes con stock real disponible |

Lotes con `status` `borrador`, `rechazado` o `agotado` **no aparecen en el catálogo**.

> **Regla de visibilidad:** el lote es visible desde que el caficultor lo publica. La cafetería puede ver el lote, solicitar muestra y seguir su flujo. Solo puede **reservar sacos** cuando el lote llega a `aprobado`.

##### Dos caminos para llegar a `aprobado`

**Camino 1 — Con catación SCA (lab externo o lab propio)**
La cafetería evalúa la muestra con equipamiento técnico y registra puntaje oficial.
Lote aparece en catálogo con badge de puntaje SCA.

**Camino 2 — Sin catación SCA (decisión por muestra)**
La cafetería recibe la muestra, la evalúa sensorialmente y decide trabajar con ese caficultor.
No hay puntaje externo — la cafetería aprueba directamente desde "Mis gestiones" al confirmar recepción.
Lote aparece en catálogo sin puntaje SCA (o con puntaje referencial del caficultor si lo tiene).

> **Precio:** en ambos caminos el precio viene del caficultor (`precioOrigenPEN`) + 10% comisión TW + S/25 flete. No depende del puntaje SCA.

##### Quién activa `aprobado` en cada camino

| Camino | Quién aprueba | Cómo |
|---|---|---|
| Con lab externo (Flujo B) | Laboratorio | Registra puntaje ≥ 82 en `LaboratorioPortal` |
| Con lab propio (Flujo A) | Cafetería | Registra puntaje ≥ 82 en "Mi laboratorio" |
| Sin catación SCA | Cafetería | Botón **"Aprobar y comprar sacos →"** en "Mis gestiones" cuando `status === 'recibida'` |

> El botón "Aprobar y comprar sacos →" solo aparece cuando la cafetería **no tiene laboratorio** (`tieneLaboratorio: false`) y la solicitud está en `status === 'recibida'`. No reemplaza la catación — es una opción paralela para cafeterías que confían en su criterio sensorial propio.

##### Información visible por tarjeta de lote

Cada tarjeta muestra:
- Foto del lote
- Nombre del lote · ID · región/origen
- Puntaje SCA (pts), proceso, variedad, altitud, notas de sabor
- Precio por saco (S/) — siempre visible
- Sacos disponibles
- Botón **"Solicitar muestra gratuita"** — si la cafetería aún no solicitó muestra de este lote
- Botón **"Reservar sacos →"** — si la cafetería ya tiene muestra catada de este lote (`status === 'recibida'` o lote tiene `puntajeOficial`)
- Enlace "Ver ficha de trazabilidad →" — siempre visible

##### Badges en tarjeta — solo para estados relevantes al comprador

| Condición | Badge | Color |
|---|---|---|
| Lote `aprobado` con stock | _(sin badge — estado normal)_ | — |
| `sacosDisponibles - sacosReservados === 0` | `Agotado` | Gris |
| Esta cafetería ya solicitó muestra y está en curso | `Muestra solicitada` | Tan |

> No se muestra el label "Listo para comprar" — el precio y el botón comunican eso suficientemente.


- Solicitar muestra de 200g gratuita — directamente al caficultor
- **"Mis gestiones"** — pipeline de muestras y pedidos:
  - Stepper 4 pasos por solicitud de muestra: Solicitada → Enviada → Recibida → Catada
  - Botón **"Confirmar recepción"** cuando `status === 'despachada'`
  - Sin lab: botón **"Contratar laboratorio"** cuando `status === 'recibida'`
  - Con lab: mensaje **"Registra en Mi laboratorio"** cuando `status === 'recibida'`
  - Stepper 5 pasos por pedido: Reservado → Preparando → En tránsito → Hub Lima → Entregado
  - Desglose de pago visible al expandir cada pedido
- Comprar sacos completos (60 kg) con CheckoutB2B — IGV incluido, factura electrónica
- **Si no tiene lab propio:** modal de selección de laboratorio con fee de catación por lab

#### Modo laboratorio (visible solo si `tieneLaboratorio: true`)
- Tab **"Mi laboratorio"** en la barra de navegación — con badge de pendientes
- Lista de muestras propias con `status === 'recibida'` pendientes de catar
- Formulario de catación por lote (expandible):
  - Puntaje SCA (con feedback inmediato: verde ≥82 / rojo <82)
  - Sliders de acidez, cuerpo y balance (1-10)
  - Notas de sabor (separadas por coma)
  - Perfil de tueste sugerido (select: Claro / Medio claro / Medio / Medio oscuro / Oscuro / Espresso)
- Al confirmar: lote pasa a `aprobado` o `rechazado` → pantalla de confirmación
- Si aprobado: botón **"Ver en Mis gestiones"** → stepper muestra paso 4 "Catada" completado y botón "Comprar sacos →" activo
- **No puede contratar laboratorio externo** — la catación siempre es interna

### Portal Laboratorio (actor independiente)
- Ver muestras asignadas pendientes (`status === 'en_catacion'`)
- Registrar catación: puntaje SCA, acidez, cuerpo, balance, notas de sabor, perfil de tueste
- Al guardar ≥ 82 pts: lote pasa a `aprobado`, admin TW lo revisa y puede publicar
- Al guardar < 82 pts: lote pasa a `rechazado`, admin TW notificado
- Historial unificado por lote: catación + pedidos asociados con estado de pago del fee
- Ver si el fee de catación fue pagado (`pagoLaboratorioStatus`)

### Admin Tunay Wasi
- **Dashboard kanban** — todos los lotes por estado: borrador → publicado → muestra_solicitada → muestra_enviada → en_catacion → aprobado → agotado/rechazado
- **Publicar lotes aprobados** al marketplace (revisión antes de hacer visible)
- **Acciones pendientes** — lista de pedidos activos que requieren acción:
  - `pagoStatus: 'pendiente'` → botón **"Marcar pagado"** (tras verificar transferencia)
  - `logisticaStatus: 'en_transito'` → botón **"Marcar entregado"** (cuando cafetería confirma recepción)
  - `pagoCaficultorStatus: 'pendiente'` + `logisticaStatus: 'entregado'` → botón **"Pagar caficultor"**
  - `pagoLaboratorioStatus: 'pendiente'` + `feeLaboratorioPEN > 0` → botón **"Pagar laboratorio"** (solo Flujo B)
- **Vista de pedidos activos** con estado logístico y de pago por pedido
- **Activar/desactivar** rol laboratorio en cuentas de cafetería (`tieneLaboratorio: true/false`)
- **Ver y gestionar** laboratorios independientes registrados

---

## Flujo post-compra — qué ve cada actor cuando se confirma un pedido

> Este flujo aplica tanto al Flujo A (cafetería con lab propio, sin `feeLaboratorioPEN`) como al Flujo B (cafetería sin lab, con `feeLaboratorioPEN`).

### Paso a paso tras "Confirmar pedido" en CheckoutB2B

```
CAFETERÍA            PLATAFORMA              CAFICULTOR          ADMIN TW
    │                    │                       │                   │
    │  1. Confirma        │                       │                   │
    │  pedido en checkout │                       │                   │
    │ ──────────────────>│                       │                   │
    │                    │ Crea mkt_pedidos       │                   │
    │                    │ pagoStatus:'pendiente' │                   │
    │                    │ logisticaStatus:       │                   │
    │                    │ 'pendiente_pago'       │                   │
    │                    │ reservaExpiraAt: +72h  │                   │
    │                    │                       │                   │
    │  2. Ve pantalla     │                       │                   │
    │  "Pedido recibido"  │                       │                   │
    │  con datos de       │                       │                   │
    │  transferencia BCP  │                       │                   │
    │                    │                       │                   │
    │  3. Transfiere el   │                       │                   │
    │  monto exacto       │                       │                   │
    │                    │                       │ 4. Ve en           │
    │                    │                       │ "Acciones          │
    │                    │                       │ pendientes"        │
    │                    │                       │ el nuevo pedido    │
    │                    │                       │ con estado         │
    │                    │                       │ "Pago pendiente"   │
    │                    │                       │                   │
    │                    │  5. Admin verifica     │                   │
    │                    │  transferencia y       │                   │
    │                    │  marca "Pago           │                   │
    │                    │  verificado"           │                   │
    │                    │ <─────────────────────────────────────────│
    │                    │ pagoStatus:'verificado'│                   │
    │                    │ logisticaStatus:       │                   │
    │                    │ 'en_origen'            │                   │
    │                    │                       │                   │
    │  6. Stepper en      │                       │ 6. Ve en su        │
    │  "Mis gestiones"    │                       │ portal "Pedidos    │
    │  avanza a           │                       │ por despachar"     │
    │  "Preparando"       │                       │ con dirección de   │
    │                    │                       │ entrega de la      │
    │                    │                       │ cafetería          │
    │                    │                       │                   │
    │                    │                       │ 7. Despacha sacos  │
    │                    │                       │ y confirma en      │
    │                    │                       │ su portal          │
    │                    │ logisticaStatus:       │                   │
    │                    │ 'en_transito'          │                   │
    │                    │                       │                   │
    │  8. Stepper avanza  │                       │                   │
    │  a "En tránsito"    │                       │                   │
    │                    │                       │                   │
    │                    │  9. Admin marca        │                   │
    │                    │  "Entregado" cuando    │                   │
    │                    │  cafetería confirma    │                   │
    │                    │  recepción de sacos    │                   │
    │                    │ logisticaStatus:       │                   │
    │                    │ 'entregado'            │                   │
    │                    │                       │                   │
    │                    │  10. Admin ejecuta     │                   │
    │                    │  distribución de pago  │                   │
    │                    │  dentro de 48h         │                   │
    │                    │ <─────────────────────────────────────────│
    │                    │ pagoCaficultorStatus:  │                   │
    │                    │ 'pagado'               │                   │
```

---

### Lo que ve el Admin tras confirmarse un pedido

**En "Acciones pendientes":**

| Situación | Acción disponible |
|---|---|
| `pagoStatus: 'pendiente'` | Verificar transferencia → botón **"Marcar pagado"** |
| `pagoStatus: 'verificado'` + `logisticaStatus: 'entregado'` | **"Pagar caficultor"** — transfiere precio base al caficultor |
| `feeLaboratorioPEN > 0` + pago verificado | **"Pagar laboratorio"** — transfiere fee de catación al lab (solo Flujo B) |

**Diferencia Flujo A vs Flujo B en el admin:**

| Campo | Flujo A (cafetería con lab propio) | Flujo B (cafetería sin lab) |
|---|---|---|
| `feeLaboratorioPEN` | `undefined` — no hay fee externo | `> 0` — aparece fila "Pagar laboratorio" |
| Distribución | Solo caficultor + comisión TW | Caficultor + laboratorio + comisión TW |
| Acción extra | Ninguna | Botón "Pagar laboratorio" en acciones pendientes |

---

### Modelo logístico — decisiones de diseño (MVP v1)

#### Modelo elegido: envío directo caficultor → cafetería (sin hub TW)

Tunay Wasi **no tiene almacén propio** en el MVP. El caficultor despacha los sacos directamente
a la dirección de entrega registrada en el checkout.

**Razón:** hub propio requiere infraestructura, personal y costos fijos que no corresponden al MVP.
Se puede agregar en v2 si el volumen lo justifica.

#### Destino del envío según el flujo

| Flujo | Destino del envío | Quién coordina el transporte |
|---|---|---|
| **Flujo A** — cafetería con lab propio | Dirección de la cafetería compradora | Caficultor |
| **Flujo B** — cafetería sin lab (laboratorio externo) | Dirección de la cafetería compradora | Caficultor |

> **Regla fija:** el caficultor **siempre envía a la cafetería**, nunca al laboratorio.
> El laboratorio externo (Flujo B) ya evaluó la muestra antes de la compra — no necesita los sacos.
> La cafetería lleva los sacos a su laboratorio contratado para el tueste.

#### Empresa transportista en el MVP

Para el MVP se recomienda **Shalom o Olva Courier** (cobertura nacional, entrega en Lima en 24-48h desde provincia).
El flete de S/25 por saco incluido en el checkout es una estimación estándar para estos carriers.

El caficultor coordina el envío directamente con la agencia. TW no interviene en la coordinación.

#### Número de guía — campo obligatorio al confirmar envío

Al hacer clic en "Confirmar envío →", el caficultor debe registrar:

| Campo | Tipo | Requerido | Ejemplo |
|---|---|---|---|
| `empresaTransporte` | select | Sí | Shalom / Olva / Cruz del Sur / Otro |
| `numeroGuia` | texto | Sí | `SHL-2026-4892710` |

Estos campos se guardan en `mkt_pedidos` y son visibles para:
- La cafetería (en el stepper de "Mis gestiones" — puede rastrear su paquete)
- El admin (en el kanban de logística)

Sin número de guía el botón "Confirmar envío" permanece deshabilitado.

#### Estado `en_almacen` — diferido a v2

El estado `en_almacen` existe en el tipo `PedidoStatus` pero **no se activa en el MVP**.
El flujo simplificado es:

```
en_origen → en_transito → entregado
```

El admin marca `entregado` cuando la cafetería le confirma (por WhatsApp o email por ahora)
que los sacos llegaron. En v2, la cafetería podrá confirmar la recepción directamente desde su portal.

---

### Lo que ve el Caficultor tras confirmarse un pedido

**En su portal — sección "Pedidos por despachar":**
- Aparece cuando `pagoStatus === 'verificado'` y `logisticaStatus === 'en_origen'`
- Muestra: ID del pedido, nombre del lote, cantidad de sacos, kg totales
- Dirección de entrega: **siempre la dirección de la cafetería compradora** (no del laboratorio — el envío es directo)
- Contacto del comprador: razón social, teléfono, email de la cafetería
- Instrucciones: "Envía por Shalom o Olva. Ingresa el número de guía para confirmar el envío."
- **Formulario de confirmación de envío:**
  - `empresaTransporte` — select: Shalom / Olva / Cruz del Sur / Otro
  - `numeroGuia` — texto libre
  - Botón **"Confirmar envío →"** (deshabilitado si falta empresa o guía) → `logisticaStatus: 'en_transito'`

**Historial de pagos:**
- Aparece cuando `pagoCaficultorStatus === 'pagado'`
- Muestra: fecha, monto recibido, ID pedido, nombre cafetería compradora

---

### Lo que ve la Cafetería en "Mis gestiones" — stepper de pedidos

El stepper de logística tiene 4 pasos activos en MVP (el paso Hub Lima está diferido a v2):

| Paso | `logisticaStatus` | Descripción |
|---|---|---|
| 1. Reservado | `pendiente_pago` | Pedido creado, esperando verificación de pago |
| 2. Preparando | `en_origen` | Pago verificado, caficultor preparando el despacho |
| 3. En tránsito | `en_transito` | Caficultor confirmó el envío — muestra empresa y número de guía |
| 4. Entregado | `entregado` | Admin confirmó entrega en la cafetería |

> `en_almacen` existe en el tipo pero no se activa en MVP. El flujo es `en_transito → entregado` directo.

**Información visible al expandir el pedido:**
- Desglose de pago: subtotal + IGV + flete + catación (si Flujo B) + total
- Datos de facturación: razón social, RUC, email
- Estado de la reserva: tiempo restante para pagar (si aún pendiente)
- Datos de transferencia BCP (si `pagoStatus === 'pendiente'`)
- **Cuando `logisticaStatus === 'en_transito'`**: empresa transportista + número de guía registrado por el caficultor

---

### Reglas de transición de estado — resumen completo

| Transición | Quién la activa | Cómo | Datos requeridos |
|---|---|---|---|
| `pendiente_pago` → `en_origen` | Admin | Botón "Verificar pago" en AdminPanel | — |
| `en_origen` → `en_transito` | Caficultor | Formulario + botón "Confirmar envío" en CaficultorPortal | `empresaTransporte`, `numeroGuia` |
| `en_transito` → `en_almacen` | Admin | Diferido a v2 (no activo en MVP) | — |
| `en_transito` → `entregado` | Admin | Botón "Marcar entregado" en AdminPanel | — |
| `pagoCaficultorStatus: pendiente` → `pagado` | Admin | Botón "Pagar caficultor" en AdminPanel (solo tras `entregado`) | — |
| `pagoLaboratorioStatus: pendiente` → `pagado` | Admin | Botón "Pagar laboratorio" en AdminPanel (solo Flujo B) | — |

---

### Tracking del pedido — qué ve cada actor en cada estado

> Objetivo: en todo momento cada actor sabe exactamente dónde está su pedido, qué acción le toca
> a él o a quién le toca a otro, y cómo contactar si algo falla.

---

#### Vista de la Cafetería (`MarketplaceLotes` → tab "Mis gestiones")

| `logisticaStatus` | Etiqueta stepper | Información visible | Acción disponible |
|---|---|---|---|
| `pendiente_pago` | ● Reservado | ID pedido · sacos · total · datos BCP para transferencia · tiempo hasta que expira la reserva | Ninguna (esperando verificación de pago) |
| `en_origen` | ● Preparando envío | Pago verificado ✓ · nombre del caficultor · lote · sacos confirmados | Ninguna (esperando que el caficultor despache) |
| `en_transito` | ● En tránsito | **Empresa:** Shalom / Olva / etc. · **Guía:** `SHL-2026-XXXXXX` · Fecha en que el caficultor confirmó el envío | Enlace externo al rastreador de la empresa transportista (v2) |
| `entregado` | ● Entregado ✓ | Fecha de entrega confirmada por admin · resumen del pedido completo | Si Flujo A: "Registrar catación en Mi laboratorio" → pestaña activa |

**Bloque siempre visible al expandir (independiente del estado):**
```
Pedido mkt-PED-2026-XXXX
Lote: [nombre] · [sacos] sacos · [kg] kg
Subtotal: S/ XXXX  |  IGV (18%): S/ XXX
Flete: S/ XXX      |  Catación: S/ XXX  ← solo Flujo B
────────────────────────────────────────
TOTAL: S/ XXXXX
Método de pago: Transferencia bancaria
Factura: [pendiente / enlace PDF]
```

---

#### Vista del Caficultor (`CaficultorPortal` → tab "Mis lotes" + "Pedidos por despachar")

| `logisticaStatus` | Dónde aparece | Información visible | Acción disponible |
|---|---|---|---|
| `pendiente_pago` | No aparece (admin aún no verificó) | — | — |
| `en_origen` | **Sección "Pedidos por despachar"** (alerta naranja) | ID pedido · lote · sacos · kg · **dirección completa de la cafetería** · razón social · teléfono · email del comprador | Formulario: `empresaTransporte` + `numeroGuia` → **"Confirmar envío →"** |
| `en_transito` | Historial de pedidos (fila en gris) | ID · lote · sacos · empresa + guía ingresada · fecha de envío confirmado | Ninguna — en espera |
| `entregado` | Historial de pedidos (fila verde) | ID · lote · fecha entrega | Ninguna |
| `pagoCaficultorStatus: pagado` | **Sección "Mis pagos"** | Fecha de pago · monto S/ · ID pedido · nombre cafetería | Ninguna |

> **Regla de visibilidad:** el caficultor ve la sección "Pedidos por despachar" solo cuando
> hay al menos 1 pedido en `en_origen`. Si no hay ninguno, la sección no aparece.

---

#### Vista del Admin (`AdminPanel`)

| `logisticaStatus` | Columna kanban | Información visible en la tarjeta | Acciones |
|---|---|---|---|
| `pendiente_pago` | (no está en kanban — está en tab "Pagos") | — | Verificar pago / Liberar reserva |
| `en_origen` | **En Origen** | ID · lote · caficultor · sacos · fecha pago verificado | — (esperando al caficultor) |
| `en_transito` | **En Tránsito** | ID · lote · caficultor · **empresa transportista** · **número de guía** · fecha envío | **"Marcar entregado ✓"** |
| `en_almacen` | Hub Lima _(diferido v2)_ | — | — |
| `entregado` | **Entregado ✓** | ID · lote · fecha entrega · `pagoCaficultorStatus` | **"Pagar caficultor"** (si pendiente) · **"Pagar laboratorio"** (si Flujo B y pendiente) |

**Tab "Acciones pendientes" del dashboard — alertas ordenadas por urgencia:**

| Condición | Alerta | Color |
|---|---|---|
| `pagoStatus === 'pendiente'` + reserva no expirada | "Verificar pago: `PED-XXXX`" | Naranja |
| `pagoStatus === 'pendiente'` + reserva expirada | "Liberar reserva vencida: `PED-XXXX`" | Rojo |
| `logisticaStatus === 'en_transito'` + `pagoStatus === 'verificado'` | "Confirmar entrega: `PED-XXXX` · Guía: `SHL-XXXX`" | Amarillo |
| `logisticaStatus === 'entregado'` + `pagoCaficultorStatus === 'pendiente'` | "Pagar caficultor: `PED-XXXX` · S/ XXXX" | Verde |
| `logisticaStatus === 'entregado'` + `pagoLaboratorioStatus === 'pendiente'` | "Pagar laboratorio: `PED-XXXX` · S/ XXXX" | Terracota |

---

### Notificaciones — MVP

> MVP no tiene sistema de email automático ni push. Las notificaciones son:
> 1. **Visual en portal** — cada actor ve el cambio de estado la próxima vez que entra
> 2. **WhatsApp manual por admin** — para eventos críticos (pago verificado, envío confirmado)
>
> En v2: emails transaccionales automáticos via SendGrid/Resend.

| Evento | Quién debe enterarse | Canal MVP | Mensaje clave |
|---|---|---|---|
| Admin verifica pago | Caficultor | Admin envía WhatsApp manual | "Tu pedido `PED-XXXX` fue pagado. Tienes [X] sacos de [lote] para despachar a [cafetería] en [dirección]." |
| Caficultor confirma envío | Cafetería | Admin envía WhatsApp manual | "Tu pedido `PED-XXXX` fue despachado por [empresa]. Guía: `XXXX`. Llegará en 24-48h." |
| Admin marca entregado | Caficultor | Visual en portal (historial) | Pedido pasa a historial con estado "Entregado" |
| Admin paga caficultor | Caficultor | Visual en portal (sección "Mis pagos") | Aparece el monto y fecha en "Mis pagos" |

> **Decisión de diseño MVP:** el admin actúa como orquestador manual de notificaciones.
> Esto es viable con volumen bajo (< 20 pedidos/mes). Cuando el volumen crezca, se automatiza.

---


|---|---|
| Iniciar el proceso de compra | La cafetería — siempre parte de ella |
| Catar el café | Laboratorio (independiente o cafetería con lab propio) |
| Definir el perfil de tueste | Laboratorio |
| Tostar el café | Laboratorio (si la cafetería lo contrató) o cafetería con tostadora propia |
| Empacar el café | Cafetería |
| Fijar precios de servicios | Cada actor fija los suyos |
| Comprar el café por adelantado | Nadie — venta directa caficultor → cafetería |
| Manejar inventario físico | Cada actor maneja el suyo |

---

## Distribución de pagos por transacción

Tunay Wasi no fija precios de servicios — cada actor fija los suyos.

**Ejemplo de desglose:**

```
Precio base del caficultor (por saco 60 kg):     S/ 850
Fee catación (fijado por el laboratorio):         S/  55
                                                  ───────
Subtotal:                                         S/ 905
Comisión Tunay Wasi (10% sobre subtotal):         S/  90
Flete origen → cafetería (a cargo del comprador): S/  25
IGV (18%):                                        S/ 175
──────────────────────────────────────────────────────
Precio final al comprador:                        S/ 1,195
```

**Regla de distribución tras confirmación del pedido:**
- Caficultor recibe su precio base íntegro
- Laboratorio recibe el fee de catación
- Tunay Wasi retiene el 10% de comisión
- Plazo máximo: 48h tras confirmación

---

## Funcionalidades del MVP (por prioridad)

### P0 — Lanzamiento mínimo (Flujo A: cafetería con lab propio)
- [x] F01 — Caficultor registra y publica lote
- [x] F02 — Cafetería navega catálogo y solicita muestra (gratuita, sin checkout)
- [x] F03 — Caficultor confirma despacho de muestra + sacos (con empresa transportista y número de guía)
- [x] F04 — Cafetería con lab registra catación (puntaje SCA + acidez/cuerpo/balance + perfil tueste) y aprueba lote
- [x] F05 — Cafetería compra sacos (CheckoutB2B: IGV, flete, reserva 72h, factura electrónica)
- [x] F06 — Admin confirma pago → caficultor despacha → admin marca entregado → paga caficultor

### P1 — Segunda iteración (Flujo B: cafetería sin lab)
- [~] F07 — Laboratorio se registra en la plataforma con sus fees de catación _(admin crea el doc en Firestore manualmente — self-registration pendiente)_
- [x] F08 — Cafetería sin lab ve lista de laboratorios disponibles y contrata uno
- [x] F09 — Plataforma asigna muestra al laboratorio contratado
- [x] F10 — Laboratorio acepta, cata y sube resultados (puntaje SCA + perfil de tueste)
- [x] F11 — Admin distribuye pago: caficultor + laboratorio + comisión TW
- [~] F12 — Filtros en el catálogo — proceso y puntaje SCA ✓; filtro por región pendiente
- [ ] F13 — Descarga de ficha de trazabilidad post-compra (enlace existe, generación PDF pendiente)

### P2 — Madurez
- [ ] F14 — Notificaciones automáticas por email/WhatsApp en cada cambio de estado _(MVP: admin notifica manualmente)_
- [x] F15 — Historial de pagos al caficultor (tab "Mis pagos" con pendientes y pagados)
- [ ] F16 — Perfil público del caficultor vinculado a cada lote
- [ ] F17 — Recompra directa de lotes anteriores
- [~] F18 — Dashboard de métricas para el admin _(métricas básicas implementadas: lotes, pedidos, ventas)_
- [ ] F19 — **Agenda de tuestes** — inventario de sacos, solicitudes de tueste, selección de lab por capacidad/fecha, frecuencia semanal/quincenal (ver sección "Agenda de tuestes" al final)

> **Leyenda:** `[x]` implementado y probado · `[~]` parcial · `[ ]` pendiente

---

## Lo que este MVP valida

**Flujo A — Cafetería con laboratorio propio:**
1. ¿El caficultor puede publicar un lote sin fricción desde móvil?
2. ¿La cafetería encuentra el lote que necesita y solicita la muestra?
3. ¿La cafetería con lab puede catar, aprobar y comprar el lote desde su portal sin salir de la plataforma?
4. ¿Tunay Wasi puede gestionar el flujo y distribuir el pago correctamente?

**Flujo B — Cafetería sin laboratorio propio:**
5. ¿La cafetería sin lab puede encontrar y contratar un laboratorio disponible desde la plataforma?
6. ¿El laboratorio puede aceptar la muestra, registrar la catación y el tueste, y subir el resultado?
7. ¿La distribución del pago incluye correctamente al laboratorio contratado?

Si las 7 respuestas son sí → el modelo funciona. Escalar.

---

## Agenda de tuestes (v2)

> **Alcance:** cafeterías con tostadora propia (`tieneLaboratorio: true`) que ya recibieron sacos y quieren programar sesiones de tueste semanales. También aplica a cafeterías sin lab propio que quieren contratar un laboratorio externo para tuestar.

### Modelo de datos

#### Colección `mkt_inventario_sacos`

Registra el stock de kg disponibles para tuestar, por pedido.
Se crea automáticamente cuando un pedido pasa a `logisticaStatus: 'entregado'`.

```typescript
interface InventarioSacosDoc {
  id: string;                    // auto
  pedidoId: string;              // referencia a mkt_pedidos
  loteId: string;
  cafeteriaId: string;
  kgTotal: number;               // kg recibidos (sacosSolicitados * 60)
  kgPendientesTueste: number;    // kg aún sin tuestar (inicia = kgTotal)
  kgTuestados: number;           // kg ya procesados
  createdAt: string;
  updatedAt: string;
}
```

#### Colección `mkt_solicitudes_tueste`

Solicitud de tueste creada por la cafetería, asignada a un laboratorio.

```typescript
interface SolicitudTuesteDoc {
  id: string;                    // auto — prefijo "mkt-TUE-"
  inventarioId: string;          // referencia a mkt_inventario_sacos
  loteId: string;
  cafeteriaId: string;
  laboratorioId: string;         // lab seleccionado por la cafetería
  kgSolicitados: number;         // kg a tuestar en esta sesión
  perfilTueste: 'claro' | 'medio' | 'oscuro' | 'espresso';
  fechaDeseada: string;          // ISO date — fecha que propone la cafetería
  frecuencia: 'unica' | 'semanal' | 'quincenal';
  status: 'pendiente' | 'confirmada' | 'completada' | 'cancelada';
  feeTuestePEN: number;          // kgSolicitados * lab.feeTuestePEN
  pagoStatus: 'pendiente' | 'pagado';
  notasCafeteria?: string;
  fechaConfirmada?: string;      // fecha que el lab confirma (puede diferir)
  createdAt: string;
  updatedAt: string;
}
```

#### Nuevos campos en `LaboratorioDoc`

```typescript
capacidadKgPorSesion: number;     // máx kg que puede tuestar en una sesión
diasDisponibles: string[];        // ej: ['lunes', 'miercoles', 'viernes']
```

---

### Flujo de agenda de tuestes

```
CAFETERÍA                    PLATAFORMA              LABORATORIO
    │                             │                       │
    │  1. Recibe sacos            │                       │
    │  logisticaStatus:'entregado'│                       │
    │                             │ crea inventario_sacos │
    │                             │ kgPendientes = kgTotal│
    │                             │                       │
    │  2. Va a "Agenda de tuestes"│                       │
    │  Selecciona lote del        │                       │
    │  inventario                 │                       │
    │  Ingresa: kg, perfil,       │                       │
    │  fecha deseada, frecuencia  │                       │
    │                             │                       │
    │  3. Ve laboratorios         │                       │
    │  disponibles para esa fecha │                       │
    │  (filtra por capacidad y    │                       │
    │  días disponibles del lab)  │                       │
    │                             │                       │
    │  4. Elige lab y confirma    │                       │
    │  solicitud                  │                       │
    │──────────────────────────>  │                       │
    │                             │ crea solicitud_tueste │
    │                             │ status: 'pendiente'   │
    │                             ├─────────────────────> │
    │                             │                       │
    │                             │  5. Lab confirma      │
    │                             │  disponibilidad y     │
    │                             │  fecha exacta         │
    │                             │ <─────────────────────│
    │                             │ status: 'confirmada'  │
    │  Notificada ✓               │                       │
    │ <──────────────────────────  │                       │
    │                             │                       │
    │                             │  6. Lab ejecuta y     │
    │                             │  marca completada     │
    │                             │ <─────────────────────│
    │                             │ status: 'completada'  │
    │                             │ kgPendientes -= kg    │
    │                             │ kgTuestados += kg     │
```

---

### Reglas de negocio

1. **Inventario se crea al recibir sacos** — cuando el admin (o el caficultor) marca `logisticaStatus: 'entregado'`, la plataforma crea automáticamente un doc en `mkt_inventario_sacos` con `kgPendientesTueste = kgTotal`.

2. **No se puede solicitar más kg de los disponibles** — la plataforma valida `kgSolicitados <= kgPendientesTueste` antes de crear la solicitud.

3. **Filtro de laboratorios disponibles** — la plataforma muestra solo labs que:
   - Tienen `diasDisponibles` que incluye el día de la `fechaDeseada`
   - Tienen `capacidadKgPorSesion >= kgSolicitados`
   - No tienen otra sesión confirmada para esa misma fecha

4. **Fee de tueste** — `feeTuestePEN = kgSolicitados × lab.feeTuestePEN`. Se cobra separado del pedido de sacos. El admin lo distribuye al lab al completar la sesión.

5. **Frecuencia** — si `frecuencia !== 'unica'`, la plataforma crea automáticamente la siguiente solicitud con la misma configuración y la fecha desplazada (7 días para semanal, 14 para quincenal). La cafetería puede cancelar en cualquier momento.

6. **Cafetería con lab propio** — puede registrar sus propias sesiones de tueste sin asignar laboratorio externo. En ese caso `laboratorioId` apunta a su propia cuenta y el fee es 0.

---

### Pantallas en el portal de la cafetería (v2)

| Pantalla | Descripción |
|---|---|
| **Inventario de sacos** | Tabla por lote: kg recibidos / kg pendientes de tuestar / kg tuestados |
| **Agenda de tuestes** | Calendario o lista de solicitudes activas con status (pendiente / confirmada / completada) |
| **Nueva solicitud** | Formulario: lote → kg → perfil → fecha → frecuencia → seleccionar lab |
| **Laboratorios disponibles** | Lista filtrada por fecha y capacidad con fee por kg |

### Pantallas en el portal del laboratorio (v2)

| Pantalla | Descripción |
|---|---|
| **Solicitudes de tueste pendientes** | Lista de solicitudes por confirmar |
| **Agenda semanal** | Vista de sesiones confirmadas por fecha |
| **Completar sesión** | Botón "Marcar completado" por sesión — descuenta inventario automáticamente |

---

### Campos Firestore afectados (resumen)

| Campo | Colección | Descripción |
|---|---|---|
| `kgPendientesTueste` | `mkt_inventario_sacos` | Decrece con cada sesión completada |
| `kgTuestados` | `mkt_inventario_sacos` | Crece con cada sesión completada |
| `status` | `mkt_solicitudes_tueste` | `pendiente → confirmada → completada` |
| `capacidadKgPorSesion` | `mkt_laboratorios` | Nuevo campo — capacidad por sesión |
| `diasDisponibles` | `mkt_laboratorios` | Nuevo campo — días hábiles del lab |
