# Tunay Wasi — Spec Técnica
> Versión: junio 2026

---

## Stack actual

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Auth | Firebase Auth (email + OTP celular) |
| Base de datos | Cloud Firestore (colecciones `mkt_*`) |
| Almacenamiento | Cloudinary (fotos de lotes, vouchers de pago, certificados Q-Grader) |
| Backend | Firebase Cloud Functions v5 (Node 18) |
| Notificaciones | Nodemailer + Gmail SMTP |
| Pagos | Transferencia BCP (manual) + Izipay (webhook) |
| IA | Claude API — claude-haiku-4-5 (fraude + asistente catación) |
| Cron | Firebase Cloud Scheduler (liberar reservas cada hora) — requiere plan Blaze |

---

## Arquitectura de despliegue

Dos ramas con propósitos distintos que convergen en producción:

| Rama | Propósito | Firebase Hosting |
|---|---|---|
| `qa` | Landings de captación (tráfico frío, sin auth) | `alpaso-app-*.web.app` |
| `feat/marketplace-mvp` | Plataforma transaccional (usuarios logueados, Firestore, backend) | `tunaywasi.com` |

### SPAs por rama

| `VITE_APP_TARGET` | Rama | App | Hosting | Estado |
|---|---|---|---|---|
| `clientes` | `qa` | Landing B2C consumidores | `tunay-wasi.web.app` | ✅ |
| `caficultores` | `qa` | Landing captación caficultores | `tunay-wasi-caficultores.web.app` | ✅ |
| `negocios` | `qa` | Landing captación cafeterías | `tunay-wasi-negocios.web.app` | ✅ |
| `laboratorios` | `qa` | Landing captación laboratorios | `tunay-wasi-laboratorio.web.app` | ❌ falta |
| `marketplace` | `feat/marketplace-mvp` | Plataforma transaccional — todos los actores | `tunaywasi.com` | ✅ |
| `admin` | `feat/marketplace-mvp` | Panel interno Tunay Wasi | acceso restringido | ✅ |



---

## Colecciones Firestore

| Colección | Descripción |
|---|---|
| `usuarios_perfil` | Perfiles de todos los actores con campo `rol` y datos específicos |
| `mkt_caficultores` | Perfil del productor: finca, región, altitud, foto |
| `mkt_lotes` | Un documento por lote con todos sus campos |
| `mkt_laboratorios` | Laboratorios activos — sincronizado al login del laboratorio |
| `mkt_solicitudes_muestra` | Solicitudes de muestra iniciadas por la cafetería |
| `mkt_solicitudes_certificacion` | Solicitudes de certificación creadas automáticamente al publicar un lote |
| `mkt_calificaciones` | Calificaciones post-transacción entre cafetería y caficultor |
| `mkt_pedidos` | Pedidos confirmados con desglose completo de pagos y logística |

### Campos clave de `mkt_lotes`

```typescript
interface LoteDoc {
  id: string;
  caficultorId: string;
  nombreLote: string;
  variedad: string;
  proceso: 'lavado' | 'natural' | 'honey' | 'anaerobico' | 'doble_fermentacion';
  altitud?: string;          // "1850 msnm"
  cosecha?: string;          // "Junio 2026"
  region?: string;
  sacosDisponibles: number;
  sacosReservados: number;
  precioOrigenPEN: number;   // lo fija el caficultor
  precioVentaPEN: number;    // calculado al publicar: origen × 1.10
  stockMuestrasHub: number;  // unidades 200g disponibles en hub Lima — se activa recién cuando admin confirma recepción
  muestraEnCamino?: boolean; // caficultor declaró envío al publicar; false después de que admin confirma
  puntajeReferencial?: number;
  puntajeOficial?: number;   // decimal — asignado por el lab al completar catación
  acidez?: number;
  cuerpo?: number;
  balance?: number;
  notasSabor?: string[];
  datosTueste?: string;
  fotoLoteUrl?: string;
  status: 'borrador' | 'en_catacion' | 'publicado' | 'agotado' | 'rechazado';
  laboratorioId?: string;
  createdAt: string;
  publicadoAt?: string;
}
```

### Campos clave de `mkt_solicitudes_certificacion`

```typescript
interface SolicitudCertificacionDoc {
  id: string;
  loteId: string;
  caficultorId: string;          // para notificaciones
  laboratorioId?: string;        // asignado cuando lab acepta
  nombreLote: string;            // desnormalizado para portal del lab
  status: 'abierta' | 'aceptada' | 'muestra_en_camino' | 'muestra_recibida' | 'completada' | 'expirada';
  feeCatacionPEN?: number;       // fijado por el lab al aceptar
  pagoStatus: 'pendiente' | 'verificado' | 'rechazado';
  pagoLaboratorioStatus: 'pendiente' | 'pagado';
  // Envío físico de muestra al lab
  empresaCourierMuestra?: string;  // Shalom | Olva | Cruz del Sur | Otro
  numeroGuiaMuestra?: string;
  guiaEnviadaAt?: string;          // ISO — cuando caficultor confirmó envío
  muestraRecibidaAt?: string;      // ISO — cuando lab confirmó recepción
  aceptadaAt?: string;
  createdAt: string;
}
```

### Campos clave de `mkt_calificaciones`

```typescript
interface CalificacionDoc {
  id: string;
  pedidoId: string;              // FK al pedido — una calificación por pedido
  autorId: string;               // uid del actor que califica
  autorRol: 'cafeteria' | 'caficultor';
  destinatarioId: string;        // uid del actor calificado
  destinatarioRol: 'caficultor' | 'cafeteria';
  puntaje: 1 | 2 | 3 | 4 | 5;
  comentario?: string;           // máximo 300 caracteres
  createdAt: string;
  expiraAt: string;              // createdAt + 30 días — después no se puede calificar
}
```

Campos desnormalizados en perfiles (para mostrar en catálogo sin query adicional):
- `usuarios_perfil.promedioCalificacion` — promedio actual
- `usuarios_perfil.totalCalificaciones` — cantidad total de calificaciones recibidas

### Campos clave de `mkt_pedidos`

```typescript
interface PedidoB2BDoc {
  id: string;                // prefijo "mkt-PED-"
  loteId: string;
  tostadoraId: string;
  caficultorId: string;
  laboratorioId?: string;
  sacosSolicitados: number;
  kgTotal: number;           // sacosSolicitados × 60
  subtotalPEN: number;
  igvPEN: number;
  fletePEN: number;          // 25 × sacosSolicitados
  feeLaboratorioPEN?: number;
  totalPEN: number;
  montoCaficultorPEN: number; // sacosSolicitados × precioOrigenPEN
  razonSocial: string;
  ruc: string;
  email: string;
  telefono: string;
  direccionEntrega: string;
  metodoPago: 'transferencia' | 'izipay' | 'yape';
  pagoStatus: 'pendiente' | 'en_revision' | 'verificado' | 'rechazado';
  logisticaStatus: 'pendiente_pago' | 'en_origen' | 'en_transito' | 'entregado' | 'cancelado';
  reservaExpiraAt: string;   // ISO timestamp (now + 72h)
  empresaTransporte?: string;
  numeroGuia?: string;
  voucherUrl?: string;       // URL del voucher subido por la cafetería (Cloudinary)
  voucherSubidoAt?: string;  // ISO — cuando la cafetería subió el voucher
  pagoCaficultorStatus: 'pendiente' | 'pagado';
  pagoLaboratorioStatus?: 'pendiente' | 'pagado';
  fraudScore?: number;
  fraudFlag?: boolean;
  fraudMotivo?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Cloud Functions

### `onPedidoCreated`
**Tipo:** Firestore onCreate en `mkt_pedidos/{pedidoId}`
**Qué hace:** Envía email al caficultor notificando que hay un nuevo pedido.

### `onPedidoPagoVerificado`
**Tipo:** Firestore onUpdate en `mkt_pedidos/{pedidoId}`
**Condición:** `before.pagoStatus !== after.pagoStatus` Y `after.pagoStatus === "verificado"`
**Qué hace:** Envía email a la cafetería (pago confirmado) y al caficultor (listo para despachar).

### `izipayWebhook`
**Tipo:** HTTPS onRequest
**Qué hace:**
1. Valida firma HMAC-SHA256 del header `x-izipay-signature`
2. Si `orderStatus !== "PAID"` → ignora
3. Verifica monto contra el pedido en Firestore (tolerancia ±1 centavo)
4. Analiza fraude con Claude haiku (RUC, monto, sacos, email, empresa)
5. Si `fraudScore > 7` → marca `fraudFlag: true` y email al admin, no verifica el pago
6. Si OK → actualiza `pagoStatus: "verificado"`, `logisticaStatus: "en_origen"`

**Reglas de fraude:**
- RUC peruano debe tener exactamente 11 dígitos
- Pedidos > 50 sacos son inusuales para primer pedido
- Moneda diferente a PEN es anómala
- Score 0 = sin riesgo, 10 = máximo riesgo. Umbral de bloqueo: **> 7**

### `recordatorioEnvioMuestrasHub`
**Tipo:** Cloud Scheduler, diariamente a las 9am hora Lima
**Requiere:** Firebase Blaze
**Qué hace:** Busca lotes con `status === 'publicado'`, `stockMuestrasHub === 0` y `muestraEnCamino !== true`. Por cada uno envía una notificación in-app + email al caficultor indicando que debe enviar 3-5 muestras de 200g al hub Lima para que las cafeterías puedan pedirlas. No envía recordatorio si el caficultor ya declaró el envío (`muestraEnCamino: true`) pero admin aún no confirmó recepción.

**Tipo:** Cloud Scheduler, cada 60 minutos
**Requiere:** Firebase Blaze
**Qué hace:** Busca pedidos con `pagoStatus === "pendiente"` y `reservaExpiraAt < now`. Por cada uno: libera los sacos reservados, actualiza `pagoStatus: "rechazado"`, `logisticaStatus: "cancelado"`, envía email a la cafetería.
**Regla crítica:** `sacosReservados = Math.max(0, sacosReservados - sacos)` — nunca negativo.

### `asistenteCatacion`
**Tipo:** HTTPS callable
**Input:** `{ notasLibres: string, loteInfo?: string }`
**Output:** `{ ok: true, campos: { acidez, cuerpo, balance, notasSabor[], perfilTueste, puntajeSugerido } }`
**Qué hace:** El catador escribe notas libres. La IA precarga los campos del formulario. El catador puede editar antes de confirmar. **La IA asiste, no reemplaza.**
**Modelo:** `claude-haiku-4-5-20251001`, max_tokens: 256

---

## Adaptador Izipay (frontend)

**Archivo:** `src/features/marketplace/adapters/izipayAdapter.ts`

```
1. Carga SDK JS de Izipay dinámicamente
   - Sandbox: https://sandbox-static.izipay.pe/payment/js/v1/loader.min.js
   - Prod:    https://static.izipay.pe/payment/js/v1/loader.min.js
2. En sandbox: token dummy para pruebas
   En producción: Cloud Function izipayCreateSession (pendiente)
3. Abre modal IzipayCheckout.initCheckout()
4. Callbacks: onSuccess → { ok: true, transactionId }
              onError  → { ok: false, errorMessage }
```

Controlado por `VITE_IZIPAY_SANDBOX` (true = sandbox, false = producción).

---

## Variables de entorno

### `functions/.env` (nunca subir a git)

```
GMAIL_APP_PASSWORD=...       # App Password de tunaywasi@gmail.com
ANTHROPIC_API_KEY=...        # Claude API key
IZIPAY_WEBHOOK_SECRET=...    # Secreto HMAC que provee Izipay
ADMIN_EMAIL=tunaywasi@gmail.com
```

### `/.env` (frontend Vite)

```
VITE_IZIPAY_MERCHANT_CODE=...
VITE_IZIPAY_SANDBOX=true     # cambiar a false en producción
```

---

## Autenticación

Dos métodos para todos los roles excepto admin:

| Método | Formato |
|---|---|
| Email + contraseña | Email válido + contraseña ≥ 6 caracteres |
| Celular + OTP | +51XXXXXXXXX — solo números peruanos |

Normalización de teléfono:
- 9 dígitos empezando con 9 → `"+51" + 9dígitos`
- 11 dígitos empezando con "51" → `"+" + 11dígitos`
- Cualquier otro formato → rechazado

Cada vez que un laboratorio hace login, `sincronizarLabDoc(perfil)` actualiza su documento en `mkt_laboratorios/{uid}` con `merge: true`.

---

## Identificadores

| Entidad | Formato | Ejemplo |
|---|---|---|
| Lote | `mkt-{REGION3}-{timestamp}` | `mkt-CUS-1718395200000` |
| Pedido | `mkt-PED-{año}-{últimos4timestamp}` | `mkt-PED-2026-0000` |
| Solicitud de muestra | `mkt-SOL-{timestamp}` | `mkt-SOL-1718395200000` |

---

## Checklist para deploy a producción

1. Activar Firebase Blaze (requerido para Cloud Scheduler)
2. Crear App Password en `tunaywasi@gmail.com` → myaccount.google.com → Seguridad → Contraseñas de aplicación
3. Obtener API key Claude en console.anthropic.com
4. Registrarse en Izipay y obtener: MERCHANT_CODE, WEBHOOK_SECRET
5. Configurar secrets en Firebase:
   ```bash
   firebase functions:secrets:set GMAIL_APP_PASSWORD
   firebase functions:secrets:set ANTHROPIC_API_KEY
   firebase functions:secrets:set IZIPAY_WEBHOOK_SECRET
   firebase functions:secrets:set ADMIN_EMAIL
   ```
6. Reemplazar datos bancarios BCP en `CheckoutB2B.tsx` con cuenta real de Tunay Wasi S.A.C.
7. Deploy:
   ```bash
   cd functions && npm install && cd ..
   firebase deploy --only functions
   ```

---

## Pendientes críticos antes de producción

| Item | Archivo | Estado |
|---|---|---|
| Datos BCP reales | `CheckoutB2B.tsx` | Pendiente — dato de negocio |
| Variables de entorno reales | `functions/.env` | Pendiente |
| Firebase Blaze activado | Firebase Console | Pendiente |

---

## Inconsistencias detectadas en el código

| ID | Descripción | Archivo | Impacto |
|---|---|---|---|
| INC-04 | Datos bancarios BCP hardcodeados como placeholder | `CheckoutB2B.tsx:148` | Crítico — debe reemplazarse antes de producción |
| INC-05 | `handleAprobarSinCata()` bypasea umbral SCA 82 pts | `MarketplaceLotes.tsx` | Mitigado — doble confirmación con aviso |

---

## Gap analysis vs código actual (junio 2026)

### Gaps pendientes — bloquean MVP

_Todos resueltos. Ver sección Resueltos._

### Gaps importantes — degradan reglas de negocio

| ID | Qué falta | Archivo(s) | Regla |
|---|---|---|---|
| G-20 | `izipayCreateSession` Cloud Function (token de sesión para producción) no implementada | `functions/src/index.ts` | 03-spec §Izipay |

### Gaps menores — post-MVP

| ID | Qué falta | Archivo(s) |
|---|---|---|
| G-16 | Landing de captación para laboratorios: `AppLaboratorio.tsx` en rama `qa` | rama `qa` |
| ~~G-21~~ | RN-LAB-03: bloquear aceptación si lab ya tiene 3 solicitudes activas — implementado |
| G-22 | RN-LAB-04: Cloud Scheduler que expire solicitudes `abierta` después de 24h y notifique al admin | `functions/src/index.ts` |
| ~~G-23~~ | Sistema de calificaciones — implementado (ver Resueltos) |

### Resueltos

| ID | Descripción |
|---|---|
| ~~G-01~~ | Botón "Solicitar muestra" deshabilitado cuando `stockMuestrasHub === 0` — implementado |
| ~~G-02~~ | Lotes `en_catacion` muestran aviso de calidad no verificada + confirmación antes de comprar — implementado |
| ~~G-03~~ | `precioVentaPEN` calculado automáticamente al publicar (`precioOrigenPEN × 1.10`) — implementado |
| ~~G-04~~ | Formulario publicación tiene campos hub Lima: cantidad muestras + courier + guía — implementado |
| ~~G-05~~ | `stockMuestrasHub = 0` al publicar + AdminPanel "Confirmar recepción hub" activa stock — implementado |
| ~~flujo-d-hub~~ | **Flujo D completo — solicitud automática de muestras al publicar:** Al publicar un lote, `publishMktLote` crea automáticamente una `SolicitudHub` de 3 muestras si `stockMuestrasHub === 0` y no hay solicitud `solicitada` previa. El caficultor recibe notificación in-app inmediata ("📦 El hub solicita muestras"). Si el caficultor ya declaró envío al publicar (`muestraEnCamino: true`), no se genera solicitud duplicada. El admin puede también solicitar manualmente desde tab "Muestras hub" → "Solicitar →". Cuando el admin confirma recepción → `confirmarRecepcionHub` actualiza `stockMuestrasHub` en el lote. Recién entonces aparece "Pedir muestra 200g" en el catálogo. El recordatorio diario (`recordatorioEnvioMuestrasHub`, 9am Lima) reenvía notificación a caficultores con `stockMuestrasHub === 0` y `muestraEnCamino !== true`. |
| ~~G-06~~ | `stockMuestrasHub` decrementado automáticamente al crear `SolicitudMuestra` — implementado |
| ~~G-07~~ | `en_almacen` eliminado de `PedidoStatus` — implementado |
| ~~G-08~~ | `certificadoPorCaficultor` eliminado de `LoteDoc` — implementado |
| ~~G-11~~ | "Marcar pagado caficultor" habilitado solo cuando `logisticaStatus === 'entregado'` — implementado |
| ~~G-04b~~ | Ordenamiento del catálogo: `puntajeOficial` desc → `publicadoAt` — implementado |
| ~~G-05b~~ | Máximo 3 solicitudes de muestra activas por lote — implementado |
| ~~G-06b~~ | Badge `✓ SCA {pts}` diferenciado de lotes sin cert — implementado |
| ~~G-07b~~ | Cloud Functions: `onPedidoCreado`, `onPedidoPagoVerificado`, `liberarReservasExpiradas`, `asistenteCatacion` — implementadas |
| ~~G-13~~ | `montoCaficultorPEN` corregido a `sacos × precioOrigenPEN` |
| ~~G-13b~~ | `COMISION_TW` centralizado en `src/shared/config.ts` |
| ~~G-21~~ | Bloquear aceptación lab si ya tiene 3 solicitudes activas — implementado en `LaboratorioPortal.tsx` |
| ~~G-23~~ | Sistema de calificaciones post-transacción bidireccional — implementado: cafetería califica caficultor (pedido entregado), caficultor califica cafetería (pedido entregado). Colección `mkt_calificaciones`. Modal perfil caficultor muestra promedio + total reseñas + pedidos completados |
| ~~tracking-muestra~~ | Tracking físico de muestra para certificación: estados `muestra_en_camino` y `muestra_recibida` en `SolicitudCertificacionDoc`. Caficultor ingresa courier + guía → lab confirma recepción → botón "Registrar catación" habilitado solo con muestra recibida |
| ~~auto-publish~~ | `updateMktLoteCatacion` auto-publica lote si `puntajeOficial >= UMBRAL_SCA (82)`, o lo marca `rechazado` si no llega. Notificación al caficultor con resultado |
| ~~sincronizar-caf~~ | `sincronizarCaficultorDoc` sincroniza `mkt_caficultores/{uid}` al guardar perfil del caficultor — garantiza que el catálogo muestre nombre y finca correctos |
| ~~notif-rules~~ | Regla Firestore para `mkt_notificaciones/{uid}/items` — cada usuario puede leer y marcar sus propias notificaciones; cualquier usuario autenticado puede crear notifs para otros |
| ~~caficultor-login~~ | Auto-navegación al primer tab del portal (mis_lotes / pendientes) cuando un caficultor o laboratorio hace login — evita que el catálogo quede en blanco |
| ~~pedidos-caficultor~~ | Tab "Mis pagos" del caficultor muestra 3 secciones: "Pedidos en curso" (todos los estados activos), "Por cobrar" (entregado sin pagar), "Pagos recibidos". `fetchMktLotesByIds` resuelve lotes de pedidos que no están en `misLotes` |
| ~~perfil-cafeteria~~ | Modal perfil cafetería accesible desde CaficultorPortal al ver pedidos: muestra razonSocial, calificación promedio con estrellas, total reseñas y pedidos completados. `fetchCalificacionesByDestinatario` + `fetchMktPedidosByTostadora` alimentan el modal. |
| ~~rechazar-solicitudes~~ | Botón "Rechazar / Desistir" en solicitudes de muestra para ambos lados (caficultor y cafetería). Caficultor puede rechazar desde "Mis solicitudes"; cafetería puede desistir desde su portal. Actualiza `status: 'rechazada'` en `mkt_solicitudes_muestra`. |
| ~~confirmar-entrega-cafeteria~~ | Cafetería confirma recepción del pedido directamente desde "Mis pedidos" → botón "Confirmar recepción ✓" cuando `logisticaStatus === 'en_transito'`. Actualiza `logisticaStatus: 'entregado'` y notifica al caficultor. El admin solo valida pagos — no confirma entregas. Regla Firestore actualizada: cafetería puede hacer update de su propio pedido (solo campo `logisticaStatus` cuando la transición es `en_transito → entregado`). |
| ~~voucher-pago~~ | Cafetería sube voucher de transferencia desde "Mis pedidos" cuando `pagoStatus === 'pendiente'`. Botón "Ya pagué — subir comprobante" abre file picker (imagen/PDF). El archivo se sube a **Cloudinary** en `tunaywasi/vouchers/{pedidoId}`. Guarda `voucherUrl` y `voucherSubidoAt` en el pedido, cambia `pagoStatus: 'en_revision'`. Admin ve badge "En revisión 🕐" y link al voucher. Nuevo estado `'en_revision'` en `PedidoB2BDoc.pagoStatus`. |
| ~~cloudinary-migration~~ | Todos los uploads de archivos/imágenes usan Cloudinary (preset `tunaywasi_lotes`, unsigned). Firebase Storage eliminado del frontend. Rutas: `tunaywasi/lotes` (fotos lote), `tunaywasi/certificados` (fichas catación), `tunaywasi/vouchers/{pedidoId}` (comprobantes), `tunaywasi/certificados_lab/{uid}` (cert Q-Grader). PDFs usan endpoint `/raw/upload`; imágenes usan `/image/upload`. |
| ~~hub-muestra-flujo~~ | Flujo completo hub Lima: (1) Caficultor publica lote declarando courier + guía + cantidad de muestras enviadas → `muestraEnCamino: true`, `stockMuestrasHub: 0`. (2) Sistema recuerda automáticamente al caficultor que envíe muestras al hub si no lo hizo. (3) Admin confirma recepción en tab "Muestras hub" → `stockMuestrasHub` se activa con la cantidad recibida, `muestraEnCamino: false`. (4) Recién en ese momento el botón "Pedir muestra 200g" se habilita en el catálogo para cafeterías. (5) Cafetería solicita → `stockMuestrasHub` decrementa. (6) Si stock = 0 y caficultor ya participó en hub, se muestra "Muestras agotadas temporalmente". Si caficultor nunca envió, el botón no aparece. |
| ~~muestra-compra-paralelo~~ | En lotes certificados (`precioVentaPEN && puntajeOficial`), el botón "Pedir muestra 200g" aparece en paralelo al "Reservar sacos →". Antes eran mutuamente excluyentes. La muestra solo se muestra si `stockMuestrasHub > 0` (admin ya confirmó recepción) o si `muestraEnCamino === true` (en camino pero no recibida aún — muestra badge "agotadas"). |
| ~~direccion-cafeteria-solicitud~~ | `SolicitudMuestraDoc` ahora incluye `direccionEntrega?`. Se pasa desde `perfil.direccionEntrega` al crear la solicitud en `MarketplaceLotes.tsx`. En el portal del caficultor se muestra la dirección real de la cafetería (ej. "Café del Parque — Av. La Marina 123, Miraflores") en vez de la dirección hardcodeada del hub. Si la cafetería no registró dirección, se muestra su email como fallback. |
| ~~cert-automatica-al-publicar~~ | `publishMktLote` crea automáticamente una `SolicitudCertificacionAbierta` cuando el lote no tiene `puntajeOficial` y no existe solicitud previa. Los laboratorios reciben notificación tipo Uber para aceptar. Antes el caficultor tenía que iniciar la certificación manualmente — ahora el sistema la lanza en automático al publicar. |

---

## Estrategia SEO

### Problema base

Toda la arquitectura actual es SPA pura (Vite + React). Google ve `<div id="root"></div>` sin JavaScript — el contenido es invisible para los crawlers. Ningún dominio tiene `og:`, `twitter:`, `canonical`, `description`, `robots.txt` ni `sitemap.xml`.

### Necesidad por dominio

| Dominio | Tipo | Prioridad SEO | Razón |
|---|---|---|---|
| `tunay-wasi.web.app` | Ecommerce B2C | 🔴 Crítica | Product pages indexables, structured data por café, carrito de preventa |
| `tunay-wasi-caficultores.web.app` | Landing captación | 🔴 Alta | Tráfico orgánico "vender café especialidad Perú", "precio café verde Cajamarca" |
| `tunay-wasi-negocios.web.app` | Landing captación | 🔴 Alta | Tráfico orgánico "proveedor café origen Perú", "café verde trazabilidad Lima" |
| `tunay-wasi-laboratorio.web.app` | Landing captación | 🟡 Media | Tráfico orgánico "laboratorio catación café Perú", "Q-Grader certificación" |
| `tunaywasi.com` | Plataforma B2B autenticada | ❌ No aplica | App privada — no indexar |
| `admin` | Panel interno | ❌ No aplica | No indexar |

### Solución técnica: Vite SSG

Implementar `vite-plugin-ssg` en la rama `qa` (landings + ecommerce B2C). Genera HTML estático por ruta en build time sin cambiar el stack React/TypeScript.

```bash
npm install vite-ssg
```

Cada landing genera HTML pre-renderizado que los crawlers pueden leer. El JavaScript hidrata la interactividad después.

### Blog como canal de tráfico

Los 4 artículos de `business/articulos/` se convierten en rutas públicas indexables:

| Slug | Título | Target |
|---|---|---|
| `/blog/cafe-88-puntos-commodity` | Por qué el café de 88 puntos se vende como commodity | Caficultores, tostadores |
| `/blog/mercado-cafe-verde-invisible` | El mercado de café verde que nadie puede ver | Inversionistas, cafeterías |
| `/blog/tostador-compra-certeza` | El tostador no compra café — contrata certeza | Cafeterías, negocios |
| `/blog/capital-invisible-caficultor` | El caficultor tiene una mina de oro que el mercado no puede ver | Caficultores |

Cada artículo lleva al CTA del landing correspondiente según el actor al que apunta.

**¿Dónde vive el blog?** En el ecommerce B2C (`tunay-wasi.web.app/blog`) como canal principal de contenido — es el dominio con mayor superficie SEO al tener también las product pages.

### Meta tags mínimos por tipo de página

**Ecommerce B2C — product page**
```html
<title>{nombreCafe} — {caficultor}, {region} | Tunay Wasi</title>
<meta name="description" content="{descripcion} — {puntajeSCA} pts SCA. Compra directa al origen." />
<meta property="og:image" content="{fotoLoteUrl}" />
<script type="application/ld+json">
  { "@type": "Product", "name": ..., "offers": { "price": ..., "priceCurrency": "PEN" } }
</script>
```

**Landing captación caficultores**
```html
<title>Vende tu café directamente a cafeterías | Tunay Wasi</title>
<meta name="description" content="Publica tu lote, certifica con Q-Grader y recibe el precio íntegro. Sin intermediarios." />
```

**Artículo de blog**
```html
<title>{titulo} | Blog Tunay Wasi</title>
<meta property="og:type" content="article" />
<meta property="article:published_time" content="{fecha}" />
<link rel="canonical" href="https://tunay-wasi.web.app/blog/{slug}" />
```

### Archivos técnicos requeridos

| Archivo | Dominio | Contenido |
|---|---|---|
| `robots.txt` | Todos menos admin/marketplace | `Allow: /` + `Sitemap:` |
| `robots.txt` | admin + marketplace | `Disallow: /` |
| `sitemap.xml` | B2C + landings | Generado en build time con todas las rutas |

### Flujo de tráfico objetivo

```
Google (búsqueda orgánica)
    │
    ├── "vender café especialidad" → caficultores.web.app → CTA "Publica tu lote" → tunaywasi.com
    ├── "proveedor café verde Lima" → negocios.web.app    → CTA "Compra directo"  → tunaywasi.com
    ├── "café peruano origen"      → tunay-wasi.web.app  → Tienda B2C / Blog     → tunaywasi.com
    └── Blog artículo              → tunay-wasi.web.app  → CTA contextual por actor
```
