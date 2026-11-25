# TunayWasi ONE — Diseño Técnico desde Cero

> Septiembre 2026 — Diseño del sistema simplificado para validar el modelo de negocio

---

## Stack (sin cambios)

```
React 18 + TypeScript + Vite
Firebase Auth (email + Google OAuth)
Firestore
Cloudinary (todos los uploads de imágenes — migrado desde Firebase Storage)
Zustand + React Query
Zod
Yape / Transferencia BCP
```

---

## Estructura de archivos nueva

```
src/
├── main.tsx                          # Entry point — sin cambios
├── AppONE.tsx                        # ← NUEVA app principal TunayWasi ONE
│
├── shared/                           # Reutilizar sin cambios
│   ├── firebase.ts
│   ├── config.ts                     # Ajustar constantes
│   ├── authService.ts
│   ├── useAuth.ts
│   ├── perfilService.ts              # Simplificar roles
│   └── types/
│       └── auth.ts                   # Agregar rol 'emprendedor'
│
└── one/                              # ← NUEVA carpeta TunayWasi ONE
    ├── types.ts                      # Tipos propios
    ├── service.ts                    # Todas las operaciones Firestore
    ├── config.ts                     # Constantes del modelo ONE
    │
    └── components/
        ├── CatalogoPublico.tsx       # Vista pública — 3 cafés
        ├── PerfilCaficultor.tsx      # Historia del caficultor (pública)
        ├── KitIdentidad.tsx          # Post-compra — menú + fichas + QR
        ├── CheckoutONE.tsx           # Checkout simplificado
        ├── PortalEmprendedor.tsx     # Dashboard del cliente
        ├── PortalCaficultor.tsx      # Portal simple del productor
        └── AdminONE.tsx              # Panel admin simplificado
```

---

## Colecciones Firestore — solo 5

```
one_caficultores/      → perfil y catálogo de los 3 productores
one_productos/         → los cafés disponibles (tostado, variedad, precio)
one_pedidos/           → pedidos de emprendedores
one_usuarios/          → perfiles (emprendedor + caficultor + admin)
one_kits/              → kits de identidad generados por pedido
```

---

## Tipos de datos

### `one_caficultores/{caficultorId}`

```typescript
interface CaficultorONE {
  id: string
  nombre: string                  // "María Huamán"
  foto: string                    // URL Cloudinary
  region: string                  // "Cajamarca"
  distrito: string                // "San Ignacio"
  altitudMsnm: number             // 1800
  historia: string                // Texto corto ~100 palabras
  coordenadas?: {
    lat: number
    lng: number
  }
  activo: boolean
  createdAt: string
}
```

---

### `one_productos/{productoId}`

```typescript
interface ProductoONE {
  id: string
  caficultorId: string            // FK → one_caficultores
  caficultorNombre: string        // Desnormalizado para queries rápidas

  // Identidad del café
  nombre: string                  // "Bourbon Lavado — Los Alisos"
  variedad: string                // "Bourbon"
  proceso: 'lavado' | 'natural' | 'honey' | 'anaerobico'
  altitudMsnm: number
  cosecha: string                 // "Junio 2026"
  notasSabor: string[]            // ["durazno", "panela", "chocolate"]
  descripcion: string             // Texto libre ~50 palabras

  // Calidad (referencial, sin Q-Grader por ahora)
  puntajeReferencial?: number     // "~86 pts" — declarado por caficultor
  notaReferencial: string         // "Puntaje referencial — certificación independiente próximamente"

  // Precios por formato
  precios: {
    g250: number                  // Precio en centavos
    kg1: number
    kg5: number
  }

  // Stock
  kgDisponibles: number
  kgReservados: number

  // Estado
  status: 'activo' | 'agotado' | 'pausado'
  foto: string                    // URL Cloudinary

  createdAt: string
  updatedAt: string
}
```

---

### `one_pedidos/{pedidoId}`

> **MODELO ACTUAL — N pedidos independientes por checkout (desde Noviembre 2026)**
>
> Al hacer checkout con productos de N caficultores distintos se crean N documentos `PedidoONE` separados — uno por caficultor. El pago es único (un voucher cubre todos) y los pedidos del mismo checkout se vinculan por `grupoCheckoutId`. Inspiración: modelo Temu (órdenes separadas por vendedor/logística).
>
> Para el modelo anterior (un pedido con `enviosCaficultor`) ver sección **[DEPRECATED] Modelo multi-caficultor unificado** al final de este archivo.

```typescript
interface PedidoONE {
  id: string                      // ONE-{año}-{4 dígitos}-{letra}
                                  // Ej: ONE-2026-4821-A, ONE-2026-4821-B
                                  // La letra identifica el sub-pedido dentro del grupo

  // Vinculación al grupo de checkout (si el checkout tuvo >1 caficultor)
  grupoCheckoutId?: string        // "{timestamp}-{negocioId}" — compartido entre sub-pedidos
  subPedidoLetra?: string         // 'A' | 'B' | 'C' | ... — orden dentro del grupo

  // Comprador
  negocioId: string               // FK → one_usuarios (renombrado desde emprendedorId)
  emprendedorId: string           // alias de negocioId — mantener por compatibilidad
  emprendedorNombre: string
  emprendedorEmail: string
  emprendedorTelefono: string

  // Negocio del emprendedor
  nombreLocal: string             // "Café El Origen"
  distritoLocal: string           // "Miraflores"

  // Caficultor de ESTE pedido (único — un pedido = un caficultor)
  caficultorId: string            // FK → one_caficultores

  // Items — solo productos del caficultorId de este pedido
  items: {
    productoId: string
    productoNombre: string
    caficultorId: string          // debe coincidir con el caficultorId raíz del pedido
    caficultorNombre: string
    formato: '250g' | '1kg' | '5kg'
    cantidad: number              // Número de unidades del formato
    precioUnitarioCents: number
    subtotalCents: number
  }[]

  // Totales (de este sub-pedido, no del grupo completo)
  subtotalCents: number
  deliveryCents: number
  totalCents: number

  // Pago — compartido con el grupo (el voucher cubre todos los sub-pedidos)
  metodoPago: 'yape' | 'transferencia'
  pagoStatus: 'pendiente' | 'voucher_subido' | 'verificado' | 'rechazado'
  voucherUrl?: string             // Cloudinary — mismo URL en todos los sub-pedidos del grupo

  // Logística — de este pedido individual (el caficultor despacha el suyo)
  direccionEntrega: string
  logisticaStatus: 'preparando' | 'en_agencia' | 'entregado'
  notasEntrega?: string
  agencia?: 'olva' | 'shalom' | 'servientrega' | 'otra'
  codigoAgencia?: string
  fotoDespacho?: string
  recepcionConfirmada: boolean    // el comprador confirma recepción por pedido individual

  // Chat y calificación — por pedido individual
  calificado: boolean

  // Kit de identidad (aplica a nivel de grupo, puede estar en el sub-pedido A)
  kitGenerado: boolean
  kitId?: string                  // FK → one_kits

  esKitProveedor: boolean

  createdAt: string
  updatedAt: string
}
```

#### Campos eliminados vs. modelo anterior

| Campo | Estado | Motivo |
|-------|--------|--------|
| `enviosCaficultor` | ELIMINADO | Ya no existe — cada pedido tiene su propio caficultor |
| `envioDetalle` | ELIMINADO | Reemplazado por los campos de logística a nivel raíz |

#### Campos nuevos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `caficultorId` | `string` | El único caficultor de este pedido |
| `grupoCheckoutId` | `string?` | Vincula sub-pedidos del mismo checkout |
| `subPedidoLetra` | `string?` | `'A'`, `'B'`, `'C'`... — orden dentro del grupo |

---

### `one_usuarios/{uid}`

```typescript
interface UsuarioONE {
  uid: string
  rol: 'emprendedor' | 'caficultor' | 'admin'
  nombre: string
  email?: string
  telefono?: string

  // Solo para emprendedores
  emprendedor?: {
    nombreLocal: string           // Nombre de su cafetería
    distritoLocal: string
    etapa: 'planificando' | 'proxima_apertura' | 'abierto'
    fechaAperturaEstimada?: string
    pedidoIds: string[]
  }

  // Solo para caficultores
  caficultor?: {
    caficultorId: string          // FK → one_caficultores
  }

  createdAt: string
}
```

---

### `one_kits/{kitId}`

```typescript
interface KitIdentidadONE {
  id: string
  pedidoId: string                // FK → one_pedidos
  emprendedorId: string
  nombreLocal: string

  // Contenido generado
  productos: {
    caficultorNombre: string
    caficultorFoto: string
    caficultorRegion: string
    caficultorAltitud: number
    caficultorHistoria: string
    productoNombre: string
    variedad: string
    proceso: string
    notasSabor: string[]
    puntajeReferencial?: number
  }[]

  // URLs de descarga
  menuPdfUrl?: string             // PDF del menú generado
  fichasUrl?: string              // PDF fichas para mesas
  qrUrl?: string                  // QR que apunta a página pública del caficultor
  instagramPackUrl?: string       // Fotos listas para Instagram

  createdAt: string
}
```

---

## Flujo de la aplicación

```
VISITANTE
    ↓
CatalogoPublico.tsx
  → Ve los 3 cafés con foto, historia del caficultor
  → Ve precio por formato
  → Botón: "Quiero este café para mi cafetería"
    ↓
    Si no está logueado → AuthScreen (registro rápido)
    Si está logueado → CheckoutONE
    ↓
CheckoutONE.tsx
  → Selecciona formato y cantidad
  → Ingresa nombre de su local y distrito
  → Elige método de pago (Yape / Transferencia)
  → Sube voucher
    ↓
    PedidoONE creado en Firestore
    Admin recibe notificación
    ↓
PortalEmprendedor.tsx (post-compra)
  → Ve estado del pedido
  → Descarga Kit de Identidad cuando está listo
  → Historial de pedidos
  → Botón de reposición rápida

ADMIN
    ↓
AdminONE.tsx
  → Verifica vouchers de pago
  → Marca pedidos como despachados
  → Genera el kit de identidad del emprendedor
  → Ve métricas simples (pedidos, facturación, clientes activos)

CAFICULTOR
    ↓
PortalCaficultor.tsx
  → Ve pedidos que incluyen su café
  → Ve cuánto va a cobrar
  → Confirma disponibilidad de stock
```

---

## Componentes — diseño detallado

### 1. `CatalogoPublico.tsx`

**Lo que muestra:**
```
┌─────────────────────────────────────────────┐
│  TUNAY WASI                                 │
│  Café peruano directo del productor         │
│  para tu cafetería                          │
├─────────────────────────────────────────────┤
│                                             │
│  [Foto María]  María Huamán                 │
│                Cajamarca · 1,800 msnm       │
│                Bourbon Lavado               │
│                "durazno · panela · chocolate"│
│                                             │
│                250g S/39 · 1kg S/125        │
│                [Quiero este café →]         │
│                                             │
├─────────────────────────────────────────────┤
│  (repite para caficultor 2 y 3)             │
└─────────────────────────────────────────────┘
```

**Sin filtros. Sin búsqueda. Solo los 3 productos.**

---

### 2. `PerfilCaficultor.tsx`

**Página pública** en `/caficultor/:id`

```
[Foto grande de la finca]

María Huamán
San Ignacio, Cajamarca
1,800 msnm

[Mini mapa con pin]

"Cultivo café desde hace 15 años
en Los Alisos. Mi familia..."

Variedad: Bourbon
Proceso: Lavado
Cosecha: Junio 2026

─────────────────────────
Este café lo sirven en:
• [Foto] Café El Origen — Miraflores
• [Foto] La Taza Verde — Barranco
─────────────────────────
```

El QR del kit apunta aquí. Las cafeterías aparecen listadas cuando compran.

---

### 3. `CheckoutONE.tsx`

**Paso 1 — Resumen**
```
Has elegido:
Bourbon Lavado de María Huamán
1 kg — S/ 125

Nombre de tu local: [__________]
Distrito: [__________]

[Continuar →]
```

**Paso 2 — Pago**
```
Total: S/ 125 + S/ 10 delivery = S/ 135

Paga por:
○ Yape  ○ Transferencia BCP

[QR Yape o datos BCP]

Sube tu voucher: [📎 Adjuntar]

[Confirmar pedido →]
```

**Paso 3 — Confirmación**
```
✓ Pedido ONE-2026-4821 recibido

Te avisamos por WhatsApp cuando
esté en camino.

Mientras tanto, tu kit de identidad
se está preparando...

[Ver mi portal →]
```

---

### 4. `KitIdentidad.tsx`

**Lo que recibe el emprendedor post-compra:**

```
Tu Kit de Identidad está listo 🎉

PARA TU CARTA
[📄 Descargar menú PDF]
  → A4 con el origen, variedad,
    notas de sabor y foto del caficultor

PARA TUS MESAS
[📄 Descargar fichas para imprimir]
  → Tarjeta 9×5cm, imprimible en casa

QR DE TRAZABILIDAD
[🔗 Ver página del caficultor]
[📱 Descargar QR para tus mesas]

PARA INSTAGRAM
[📸 Descargar pack de fotos]
  → 3 fotos de la finca con caption sugerido
```

---

### 5. `PortalEmprendedor.tsx`

```
Hola, Café El Origen 👋

─── Tu pedido activo ───────────────────
ONE-2026-4821
1kg Bourbon Lavado · María Huamán
Estado: En camino 🚚
────────────────────────────────────────

─── Tu kit de identidad ────────────────
[Descargar menú] [Descargar fichas] [QR]
────────────────────────────────────────

─── Reposición rápida ──────────────────
¿Necesitas más café?
[Pedir 1kg de nuevo →]
────────────────────────────────────────

─── Historial ──────────────────────────
• ONE-2026-4821  1kg  S/135  Entregado ✓
────────────────────────────────────────
```

---

### 6. `PortalCaficultor.tsx`

**Simple. Solo lo esencial:**

```
Hola, María 👋

─── Pedidos de tu café ─────────────────
Café El Origen (Miraflores)
  1kg Bourbon Lavado
  Estado: Despachado

La Taza Verde (Barranco)
  2kg Bourbon Lavado
  Estado: Entregado ✓
────────────────────────────────────────

─── Tu stock ───────────────────────────
Bourbon Lavado: 45 kg disponibles
[Actualizar stock]
────────────────────────────────────────

─── Tus ganancias ──────────────────────
Este mes: S/ 450
Próximo pago: cuando se entregue el pedido
────────────────────────────────────────
```

---

### 7. `AdminONE.tsx`

**4 tabs únicamente:**

**Tab 1 — Pedidos**
```
Kanban simple:

[Pendiente pago] → [Pago verificado] → [En camino] → [Entregado]

Cada card muestra:
- Nombre del local
- Producto + cantidad
- Total
- Botón de acción del siguiente paso
```

**Tab 2 — Pagos**
```
Lista de vouchers pendientes de verificar:
- Foto del voucher
- Monto declarado vs monto del pedido
- [✓ Verificar] [✗ Rechazar]
```

**Tab 3 — Kits**
```
Pedidos entregados sin kit generado:
- Nombre del local
- Productos comprados
- [Generar Kit →]
```

**Tab 4 — Métricas**
```
Esta semana:
Pedidos: 4
Facturación: S/ 540
Clientes nuevos: 2
Clientes recurrentes: 2

Este mes:
Pedidos: 12
Facturación: S/ 1,620
```

---

## Firestore rules — versión simplificada

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() { return request.auth != null; }
    function uid() { return request.auth.uid; }
    function isAdmin() {
      return request.auth.token.email.matches('.*@tunaywasi\\.pe');
    }
    function rol() {
      return get(/databases/$(database)/documents/one_usuarios/$(uid())).data.rol;
    }

    // Catálogo público — solo lectura
    match /one_caficultores/{id} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /one_productos/{id} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Pedidos — emprendedor crea, admin gestiona
    match /one_pedidos/{id} {
      allow read: if isSignedIn() &&
        (resource.data.emprendedorId == uid() || isAdmin());
      allow create: if isSignedIn() &&
        request.resource.data.emprendedorId == uid();
      allow update: if isAdmin() ||
        (isSignedIn() && resource.data.emprendedorId == uid() &&
         request.resource.data.diff(resource.data).affectedKeys()
           .hasOnly(['voucherUrl', 'pagoStatus']));
    }

    // Usuarios — cada uno lee/edita el suyo
    match /one_usuarios/{id} {
      allow read: if isSignedIn() && (uid() == id || isAdmin());
      allow create: if isSignedIn() && uid() == id;
      allow update: if isSignedIn() && (uid() == id || isAdmin());
    }

    // Kits — emprendedor lee el suyo, admin crea/edita
    match /one_kits/{id} {
      allow read: if isSignedIn() &&
        (resource.data.emprendedorId == uid() || isAdmin());
      allow write: if isAdmin();
    }
  }
}
```

---

## config.ts — constantes del modelo ONE

```typescript
// src/one/config.ts

export const ONE_CONFIG = {
  // Precios de delivery
  DELIVERY_LIMA_CENTS: 1000,        // S/ 10
  DELIVERY_PROVINCIA_CENTS: 2000,   // S/ 20

  // Compromiso mínimo Kit Proveedor
  COMPROMISO_MESES_MIN: 3,

  // Datos de pago
  YAPE_NUMERO: '+51 XXX XXX XXX',   // Completar
  BCP_CCI: 'XXX XXX XXX XXX',       // Completar
  BCP_TITULAR: 'Tunay Wasi SAC',    // Completar

  // WhatsApp admin para notificaciones
  ADMIN_WHATSAPP: '+51 XXX XXX XXX', // Completar
} as const
```

---

## service.ts — operaciones Firestore

```typescript
// src/one/service.ts

// ─── CATÁLOGO ──────────────────────────────────────────
fetchProductos(): Promise<ProductoONE[]>
fetchProducto(id: string): Promise<ProductoONE>
fetchCaficultor(id: string): Promise<CaficultorONE>
fetchCaficultores(): Promise<CaficultorONE[]>

// ─── PEDIDOS ───────────────────────────────────────────
// Checkout multi-caficultor: recibe los items agrupados por caficultor y crea N pedidos
// Devuelve array de IDs en el mismo orden que los grupos recibidos
confirmarPagoInline(input: CheckoutInput): Promise<string[]>
// Firma interna:
//   1. Generar grupoCheckoutId = `${Date.now()}-${negocioId}`
//   2. Agrupar items por caficultorId
//   3. Para cada grupo (en orden A, B, C...):
//      - Crear PedidoONE con caficultorId, items filtrados, grupoCheckoutId, subPedidoLetra
//      - ID: ONE-{año}-{random4}-{letra}
//   4. Subir voucherUrl a todos los pedidos del grupo (si ya disponible)
//   Resultado: N documentos en one_pedidos, todos comparten grupoCheckoutId

createPedido(data: CreatePedidoInput): Promise<string>   // Para pedido de UN solo caficultor
fetchPedido(id: string): Promise<PedidoONE>
fetchPedidosByNegocio(uid: string): Promise<PedidoONE[]>
fetchPedidosByCaficultor(caficultorId: string): Promise<PedidoONE[]>
fetchPedidosAdmin(): Promise<PedidoONE[]>
fetchPedidosByGrupo(grupoCheckoutId: string): Promise<PedidoONE[]>
subirVoucherGrupo(grupoCheckoutId: string, url: string): Promise<void>  // aplica a todos los pedidos del grupo
subirVoucher(pedidoId: string, url: string): Promise<void>              // aplica a un pedido individual
verificarPago(pedidoId: string): Promise<void>
rechazarPago(pedidoId: string): Promise<void>
updateLogistica(pedidoId: string, status: LogisticaStatusONE): Promise<void>
// despacharAgencia: escribe logística directamente en el pedido (ya no hay sub-mapa por caficultor)
despacharAgencia(pedidoId: string, data: { codigoAgencia: string; fotoDespacho?: string; agencia?: string }): Promise<void>

// ─── USUARIOS ──────────────────────────────────────────
crearUsuario(uid: string, data: CreateUsuarioInput): Promise<void>
fetchUsuario(uid: string): Promise<UsuarioONE>
updateUsuario(uid: string, data: Partial<UsuarioONE>): Promise<void>

// ─── KITS ──────────────────────────────────────────────
generarKit(pedidoId: string): Promise<string>
fetchKit(kitId: string): Promise<KitIdentidadONE>
fetchKitByPedido(pedidoId: string): Promise<KitIdentidadONE | null>
```

### Pseudocódigo de `confirmarPagoInline`

```typescript
async function confirmarPagoInline(input: CheckoutInput): Promise<string[]> {
  const { negocioId, items, voucherUrl, metodoPago, direccionEntrega, ... } = input

  // 1. Agrupar items por caficultor
  const grupos = groupBy(items, 'caficultorId')
  const caficultorIds = Object.keys(grupos)

  // 2. ID compartido para todo el checkout
  const grupoCheckoutId = `${Date.now()}-${negocioId}`
  const letras = ['A', 'B', 'C', 'D', 'E', 'F']

  const pedidoIds: string[] = []

  for (let i = 0; i < caficultorIds.length; i++) {
    const caficultorId = caficultorIds[i]
    const letra = caficultorIds.length > 1 ? letras[i] : undefined
    const random4 = Math.floor(1000 + Math.random() * 9000)
    const año = new Date().getFullYear()
    const pedidoId = letra
      ? `ONE-${año}-${random4}-${letra}`
      : `ONE-${año}-${random4}`

    const itemsCaficultor = grupos[caficultorId]
    const subtotal = itemsCaficultor.reduce((s, x) => s + x.subtotalCents, 0)

    await setDoc(doc(db, 'one_pedidos', pedidoId), {
      id: pedidoId,
      grupoCheckoutId: caficultorIds.length > 1 ? grupoCheckoutId : undefined,
      subPedidoLetra: letra,
      caficultorId,
      negocioId,
      emprendedorId: negocioId,  // alias para retrocompatibilidad
      items: itemsCaficultor,
      subtotalCents: subtotal,
      deliveryCents: input.deliveryCents,
      totalCents: subtotal + input.deliveryCents,
      metodoPago,
      pagoStatus: voucherUrl ? 'voucher_subido' : 'pendiente',
      voucherUrl: voucherUrl ?? null,
      direccionEntrega,
      logisticaStatus: 'preparando',
      recepcionConfirmada: false,
      calificado: false,
      kitGenerado: false,
      esKitProveedor: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    pedidoIds.push(pedidoId)
  }

  return pedidoIds
}
```

---

## AppONE.tsx — routing principal

```typescript
// src/AppONE.tsx

// Rutas:
// /                    → CatalogoPublico (público)
// /caficultor/:id      → PerfilCaficultor (público)
// /checkout            → CheckoutONE (requiere auth)
// /portal              → PortalEmprendedor (requiere auth + rol emprendedor)
// /caficultor-portal   → PortalCaficultor (requiere auth + rol caficultor)
// /admin               → AdminONE (requiere auth + isAdmin)
```

---

## main.tsx — agregar target 'one'

```typescript
// Agregar a los targets existentes:
// ?target=one → AppONE

const target = new URLSearchParams(window.location.search).get('target')
  ?? import.meta.env.VITE_APP_TARGET
  ?? 'marketplace';

if (target === 'one') {
  root.render(<AppONE />)
} else if (target === 'marketplace') {
  // ... existente
}
```

---

## Orden de construcción

### Semana 1 — Base funcional
```
Día 1: types.ts + config.ts + service.ts (estructura)
Día 2: AppONE.tsx + routing + AuthScreen reutilizado
Día 3: CatalogoPublico.tsx + seed de los 3 caficultores
Día 4: CheckoutONE.tsx (Paso 1 y 2)
Día 5: AdminONE.tsx Tab Pedidos + Tab Pagos
```

### Semana 2 — Portales y kit
```
Día 1: PortalEmprendedor.tsx
Día 2: PortalCaficultor.tsx
Día 3: KitIdentidad.tsx (descarga manual primero)
Día 4: PerfilCaficultor.tsx (página pública + QR)
Día 5: AdminONE.tsx Tab Kits + Tab Métricas
```

### Semana 3 — Pulir y lanzar
```
Día 1-2: Seed datos reales de los 3 caficultores
Día 3:   Prueba end-to-end del flujo completo
Día 4:   Fix de bugs encontrados
Día 5:   Deploy y primer cliente
```

---

## Lo que NO se construye ahora

```
❌ Q-Grader / certificación SCA
❌ Laboratorios
❌ Hub Lima
❌ Solicitudes de muestra complejas
❌ Diario de proceso
❌ Sistema de calificaciones
❌ Notificaciones in-app
❌ Suscripción automática
❌ Generador de PDF automático (manual primero)
❌ Exportación
```

Cuando haya 10 clientes activos, se evalúa qué agregar.

---

*Documento técnico de referencia para la construcción de TunayWasi ONE.*
*Actualizar con cada decisión de arquitectura que se tome durante el desarrollo.*

---

## Cambios de arquitectura (Noviembre 2026)

### 1. Firebase Storage → Cloudinary

Todos los uploads de imágenes migraron a Cloudinary. Firebase Storage ya no se usa para archivos nuevos.

**Variables de entorno requeridas:**
```
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
```

**Patrón de upload** (ver `PortalCaficultor.tsx` → `subirFotoStorage`):
```typescript
const fd = new FormData()
fd.append('file', file)
fd.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET)
fd.append('folder', 'one_caficultor')
const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
  method: 'POST', body: fd
})
const { secure_url } = await res.json()
```

---

### 2. [NUEVO] Checkout multi-caficultor — N pedidos independientes

**Decisión (Noviembre 2026):** cuando el carrito contiene productos de N caficultores distintos, el checkout crea N `PedidoONE` separados en lugar de un único pedido con sub-mapa de envíos.

**Inspiración:** modelo Temu — órdenes separadas por vendedor/logística.

#### Por qué este modelo

| Problema del modelo anterior | Solución con pedidos independientes |
|-------------------------------|-------------------------------------|
| Estado logístico mezclado en un solo doc con sub-mapas `enviosCaficultor` | Cada pedido tiene su propio `logisticaStatus`, `codigoAgencia`, `fotoDespacho` |
| Chat por caficultor dentro del mismo pedido era confuso | Chat en la subcolección `mensajes/` del pedido individual |
| Reseña/calificación por caficultor dentro del mismo pedido | `calificado` en cada pedido independiente |
| Reglas Firestore complejas para acceso por caficultor | El caficultor lee directamente `where('caficultorId', '==', uid)` |
| UI del comprador debía filtrar items por caficultor | Cada tarjeta de pedido ya tiene solo los items de ese caficultor |

#### Vinculación entre sub-pedidos

```
grupoCheckoutId: "1732480000000-uid-negocio-xyz"
                       │
     ┌─────────────────┼──────────────────┐
     ▼                 ▼                  ▼
ONE-2026-4821-A    ONE-2026-4821-B    ONE-2026-4821-C
caficultorId=X     caficultorId=Y     caficultorId=Z
subPedidoLetra=A   subPedidoLetra=B   subPedidoLetra=C
voucherUrl=same    voucherUrl=same    voucherUrl=same
```

#### Reglas de negocio

- El pago es uno solo: el voucher se propaga al `voucherUrl` de todos los pedidos del grupo.
- Si el admin verifica el pago de un pedido del grupo, debe verificar todos (o la UI lo hace en batch).
- Cada caficultor despacha y actualiza logística solo en sus pedidos.
- El comprador confirma recepción por pedido individual — puede confirmar el de un caficultor antes que el otro.
- La calificación (reseña) se hace por pedido individual.
- Si el checkout tiene un solo caficultor, `grupoCheckoutId` y `subPedidoLetra` quedan `undefined` y el ID no lleva letra.

---

### 3. [DEPRECATED] Modelo multi-caficultor unificado

> Este modelo está deprecado desde Noviembre 2026. No construir nuevas funcionalidades sobre él.
> Los documentos existentes en `one_pedidos` que tengan el campo `enviosCaficultor` son del modelo anterior.

El modelo anterior guardaba todos los items (de múltiples caficultores) en un solo `PedidoONE`:

```typescript
// DEPRECATED — no usar para pedidos nuevos
interface PedidoONELegacy {
  id: string                      // ONE-{año}-{4 dígitos random} (sin letra)
  items: {
    productoId: string
    caficultorId: string          // mezclado — items de distintos caficultores en la misma lista
    caficultorNombre: string
    // ...
  }[]

  // Sub-mapa de logística por caficultor — DEPRECATED
  enviosCaficultor?: Record<string, {
    codigoAgencia: string
    agencia?: 'olva' | 'shalom' | 'servientrega' | 'otra'
    fotoDespacho?: string
    logisticaStatus: 'preparando' | 'en_agencia' | 'entregado'
  }>

  // Campos globales de logística (compatibilidad pedidos de un caficultor) — DEPRECATED para uso multi
  logisticaStatus: 'preparando' | 'en_agencia' | 'entregado'
  codigoAgencia?: string
  fotoDespacho?: string
}
```

**Firma deprecada de `despacharAgencia`** — no usar para pedidos nuevos:
```typescript
// DEPRECATED
despacharAgencia(pedidoId: string, data: {
  codigoAgencia: string
  fotoDespacho?: string
  caficultorId?: string   // si se pasaba → escribía en enviosCaficultor.[id]
  agencia?: string
}): Promise<void>
```

---

### 4. Subir voucher — 3 puntos de entrada (sin cambios)

El comprobante de pago se puede subir desde:

| Punto | Ubicación | Componente |
|-------|-----------|-----------|
| A | Checkout `carritoVista === 'espera_pago'` | `PortalEmprendedor.tsx` |
| B | Tarjeta de pedido activo, botón "Subir voucher →" | `PortalEmprendedor.tsx` |
| C | Drawer de detalle de pedido, botón "Subir comprobante de pago →" | `PortalEmprendedor.tsx` |

Con el nuevo modelo, subir el voucher desde cualquiera de estos puntos llama `subirVoucherGrupo(grupoCheckoutId, url)` si el pedido pertenece a un grupo, o `subirVoucher(pedidoId, url)` si es un pedido individual.

---

### 5. Admin auto-rol (Google login)

En `src/one/authService.ts`, cuando un usuario hace login con Google por primera vez y no tiene doc en `one_usuarios`, se evalúa el email:

```typescript
const ADMIN_EMAILS = ['tunaywasi@gmail.com']

if (ADMIN_EMAILS.includes(email) || email.endsWith('@tunaywasi.pe')) {
  await crearUsuario(uid, { uid, rol: 'admin', nombre, email })
  return { uid, esNuevo: false, ... }
}
// Si no cumple → flujo normal de registro de nuevo usuario
```

No se le pide al admin elegir un rol — el doc se crea automáticamente con `rol: 'admin'`.
