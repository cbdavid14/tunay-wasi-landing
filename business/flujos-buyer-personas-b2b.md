# Flujos de Buyer Persona — Landing B2B (Tunay Wasi Supply)
> Actualizado: mayo 2026 — refleja estado implementado en `feature/cafi-copy-intermediario`
> Cada flujo describe: de dónde viene → qué ve → qué hace → cómo convierte

---

## Mapa de secciones actual (AppNegocios.tsx)

> **Nota:** El módulo fue renombrado de `AppMayoristas.tsx` / `src/features/mayoristas/` → `AppNegocios.tsx` / `src/features/negocios/` en la rama QA.

```
NAV  (Lotes · Cómo funciona · Empresas · Solicitar · CTA "Cotizar lote →")
 └── SupplyHero          ← primera impresión + lote destacado
 └── SupplyLotes         ← catálogo de microlotes con badge stock + botón muestra
 └── SupplyProceso       ← 3 pasos + logística
 └── SupplyGifting  ✅   ← [NUEVO] sección corporativa gifting
 └── SupplyForm          ← formulario con tipo de negocio + campos condicionales
FOOTER
```

---

## FLUJO #1 — La Cafetería Independiente

> Compra por diferenciación. Lo que lo convierte: ver el lote + poder pedirlo de muestra antes.

### De dónde llega
- Instagram de Tunay Wasi (post técnico de lote)
- Recomendación de otro dueño de cafetería
- Evento de café (SCA Perú, feria)
- QR en material impreso que Danny entrega en persona
- UTM: `?utm_source=instagram&utm_campaign=b2b-cafeteria`

### Recorrido en el landing (estado actual)

```
HERO
 ├── Ve: "Café verde, directo del origen para tu negocio."
 ├── Ve la card del lote destacado: variedad, SCA, notas de cata, precio FOB
 ├── Ve las 3 garantías: Trazabilidad · Q-Grader · Sacos 46/69 kg
 └── Click "Ver lotes disponibles →" → scroll a #lotes
        ↓
LOTES
 ├── Ve los lotes con: nombre, origen, variedad, proceso, SCA, kg disponibles, precio FOB
 ├── ✅ Ve badge "Solo X sacos" en terracotta cuando stock ≤ 4 sacos → urgencia real
 ├── ✅ Puede click "Pedir muestra 200g →" directamente desde la card de lote
 └── Click "Reservar →" → pre-llena lote en formulario → scroll a #solicitud
        ↓
PROCESO
 ├── Lee: "Tres pasos. Una semana. Cero intermediarios."
 ├── Entiende: puede pedir muestra de 200g antes de comprometerse
 └── Ve la logística: MOQ 1 saco, 50% anticipo, 7–10 días
        ↓
FORMULARIO
 ├── Ve el lote pre-seleccionado
 ├── Completa empresa, nombre, email, teléfono
 ├── ✅ Selecciona "Tipo de negocio": Cafetería → activa campos específicos
 ├── ✅ Ve checkbox "Quiero muestra de 200g antes de comprometerse"
 ├── ✅ Ve checkbox "Necesito factura con RUC"
 └── Submit → recibe respuesta en 24h con propuesta
```

### Estado de implementación

| # | Cambio | Estado | Componente |
|---|--------|--------|------------|
| 1 | Botón secundario "Pedir muestra 200g →" en cada card de lote | ✅ implementado | `SupplyLotes.tsx` |
| 2 | Badge "Solo X sacos disponibles" cuando stock ≤ 4 sacos | ✅ implementado | `SupplyLotes.tsx` |
| 3 | Campo select "Tipo de negocio" (6 opciones) | ✅ implementado | `SupplyForm.tsx` |
| 4 | Checkbox "Quiero muestra de 200g" | ✅ implementado | `SupplyForm.tsx` |
| 5 | Checkbox "Necesito factura con RUC" | ✅ implementado | `SupplyForm.tsx` |
| 6 | Copy de exclusividad en lotes premium | pendiente | `SupplyLotes.tsx` |

### Mensaje que cierra la venta
> *"Este lote solo lo sirves tú en Lima. Coordina la muestra ahora — el flete va por nuestra cuenta."*

### Métricas de éxito
- % de formularios con tipo "Cafetería": objetivo 50% del total B2B
- Solicitudes de muestra: objetivo 40% de los formularios enviados
- Tasa de conversión muestra → primer pedido: objetivo 40%

---

## FLUJO #2 — El Hotel / Restaurante Gourmet

> Compra por exclusividad y coherencia gastronómica. Lo que lo convierte: cata presencial + lote exclusivo con nombre de su establecimiento.

### De dónde llega
- Cold outreach de Danny por LinkedIn o email directo
- Evento gastronómico (Mistura, Lima Food & Wine)
- Recomendación de chef que ya conoce a Danny
- UTM: `?utm_source=linkedin&utm_campaign=b2b-hotel`

### Recorrido en el landing (estado actual)

```
HERO
 ├── Ve la propuesta técnica — pasa el primer filtro de credibilidad
 ├── Ve "Q-Grader certificado" + "Pasaporte de cata incluido"
 ├── ✅ Lee en subtítulo: "cafetería, hotel, restaurante de autor u operación de tueste"
 └── Se identifica → sigue al catálogo de lotes
        ↓
LOTES
 ├── Ve los lotes — le interesan los de SCA más alto
 ├── Lee las notas de cata
 ├── Evalúa coherencia con su propuesta gastronómica
 ├── ✅ En lotes SCA ≥ 88 ve CTA: "Reservar lote exclusivo →" (diferenciado del estándar)
 └── Click → va al formulario
        ↓
FORMULARIO
 ├── ✅ Selecciona "Hotel / Restaurante" en tipo de negocio
 ├── ✅ Aparece textarea "Propuesta gastronómica" con placeholder orientado a cocina/menú/covers
 ├── ✅ Ve checkbox muestra y checkbox RUC
 └── Completa los campos → Danny recibe contexto gastronómico para personalizar respuesta
```

### Estado de implementación

| # | Cambio | Estado | Componente |
|---|--------|--------|------------|
| 1 | Campo "Tipo de negocio" con opción Hotel/Restaurante | ✅ implementado | `SupplyForm.tsx` |
| 2 | CTA diferenciado en lotes SCA ≥ 88: "Reservar lote exclusivo →" | ✅ implementado | `SupplyLotes.tsx` |
| 3 | "hotel, restaurante de autor" en subtítulo Hero | ✅ implementado | `SupplyHero.tsx` |
| 4 | Campo textarea "Propuesta gastronómica" si tipo = Hotel/Restaurante | ✅ implementado | `SupplyForm.tsx` |

### Mensaje que cierra la venta
> *"Reserva el lote exclusivo para tu menú. Traemos el Q Grader a tu cocina para la cata de presentación."*

### Métricas de éxito
- % de formularios con tipo "Hotel/Restaurante": objetivo 15% del total B2B
- Catas presenciales coordinadas: objetivo 2/mes en Fase 1
- Tasa de conversión cata → contrato: objetivo 60%

---

## FLUJO #3 — La Empresa Corporativa

> Compra para regalar o como beneficio para colaboradores. Lo que lo convierte: propuesta escrita + kit muestra físico + proceso de facturación claro.

### De dónde llega
- LinkedIn Ads segmentado a gerentes de RRHH / marketing en Lima
- Google: "kit regalo corporativo Lima", "regalos empresariales Perú"
- El Consciente B2C que ya compró y menciona Tunay Wasi en su empresa
- UTM: `?utm_source=linkedin&utm_campaign=b2b-corporativo`

### Recorrido en el landing (estado actual)

```
HERO
 └── Ve la propuesta — entiende que hay historia detrás del café
        ↓
GIFTING CORPORATIVO ✅ (sección nueva implementada)
 ├── Sección id="gifting-corporativo"
 ├── Título: "¿Tu empresa regala en Navidad?"
 ├── Modelo A — Gifting puntual:
 │    "Kit regalo con 1–2 bolsas + caja + carta del caficultor"
 │    Pedido mínimo: 20 kits · Precio: desde S/ 150/kit
 │    CTA: "Cotizar →" → dispara evento tw:gifting-cotizar → pre-llena formulario
 ├── Modelo B — Beneficio mensual:
 │    "1 bolsa/mes por colaborador — caficultor diferente cada mes"
 │    Ejemplo: 50 colaboradores × S/ 55 = S/ 2,750/mes
 │    CTA: "Cotizar →" → mismo evento
 └── Banner inferior: "Solicitar propuesta corporativa →" → scroll a #solicitud
        ↓
FORMULARIO
 ├── ✅ Tipo de negocio = "Empresa / Corporativo" (auto-seleccionado desde SupplyGifting)
 ├── ✅ Campos condicionales se activan: cantidad de kits + tipo gifting (puntual/mensual)
 ├── ✅ Checkbox "Necesito factura con RUC"
 └── Submit → Danny responde con propuesta PDF en 24h
```

### Comunicación entre componentes

El evento `tw:gifting-cotizar` conecta `SupplyGifting` con `SupplyForm` sin prop drilling:

```typescript
// SupplyGifting.tsx — dispara
window.dispatchEvent(new CustomEvent('tw:gifting-cotizar'));

// SupplyForm.tsx — escucha
useEffect(() => {
  const handler = () => setValue('tipoNegocio', 'empresa');
  window.addEventListener('tw:gifting-cotizar', handler);
  return () => window.removeEventListener('tw:gifting-cotizar', handler);
}, []);
```

### Estado de implementación

| # | Cambio | Estado | Componente |
|---|--------|--------|------------|
| 1 | `SupplyGifting.tsx` — sección completa | ✅ implementado | `SupplyGifting.tsx` (nuevo) |
| 2 | Tipo "Empresa" + campos condicionales en formulario | ✅ implementado | `SupplyForm.tsx` |
| 3 | Checkbox cantidad de kits | ✅ implementado | `SupplyForm.tsx` |
| 4 | Toggle gifting puntual / mensual | ✅ implementado | `SupplyForm.tsx` |
| 5 | Checkbox factura con RUC | ✅ implementado | `SupplyForm.tsx` |
| 6 | Evento tw:gifting-cotizar → auto-selecciona tipo | ✅ implementado | `SupplyForm.tsx` |
| 7 | Nav B2B: link "Empresas" → #gifting-corporativo | ✅ implementado | `SupplyNav.tsx` |

### Mensaje que cierra la venta
> *"Propuesta lista en 24h. Kit muestra a tu oficina sin costo. Factura con RUC incluida."*

### Métricas de éxito
- % de formularios con tipo "Empresa": objetivo 20% del total B2B
- Propuestas PDF enviadas en <24h: objetivo 100%
- Tasa de conversión propuesta → cierre: objetivo 25%
- Ticket promedio primer pedido corporativo: objetivo S/ 4,500

---

## FLUJO #4 — La Oficina / Coworking

> Compra café tostado para consumo diario del equipo. **Está en el landing equivocado.**

### Problema estructural

Este buyer persona llega al landing B2B de café verde en sacos para tostadoras y no entiende nada. El landing habla de FOB, Q Grader, "ready to roast", sacos de 46 kg — términos ajenos a un office manager que solo quiere buen café para la cocina de la oficina.

**Solución:** Atendido desde el landing B2C. El landing B2B lo redirige.

### Estado de implementación

| # | Cambio | Estado | Componente |
|---|--------|--------|------------|
| 1 | Tipo "Otro" → banner de redirección al B2C inline | ✅ implementado | `SupplyForm.tsx` |

El banner aparece cuando tipo = "Otro":
```
┌──────────────────────────────────────────────────────────────┐
│ ¿Buscas café tostado para tu oficina o tienda?               │
│ Tu pedido va por nuestra tienda al consumidor —              │
│ café tostado, entrega mensual, sin trámites.                 │
│ [Ir a la tienda →]                                           │
└──────────────────────────────────────────────────────────────┘
```

### Métricas de éxito
- % de formularios B2B tipo "Otro" que hacen click en "Ir a la tienda": objetivo 70%
- Suscripciones para oficina generadas desde B2C: objetivo 5/mes en Fase 1

---

## Resumen de estado por componente (B2B)

### Archivos modificados

| Componente | Cambios implementados |
|------------|----------------------|
| `SupplyForm.tsx` | Tipo de negocio (6 opciones) · Campos condicionales empresa (kits, gifting puntual/mensual) · Textarea propuesta gastronómica si tipo = Hotel/Restaurante · Checkbox RUC · Checkbox muestra 200g · Redirección Otro → B2C · Listener tw:gifting-cotizar |
| `SupplyLotes.tsx` | Badge "Solo X sacos" (stock ≤ 4) · Botón "Pedir muestra 200g →" · CTA "Reservar lote exclusivo →" en lotes SCA ≥ 88 |
| `SupplyHero.tsx` | Subtítulo: "cafetería, hotel, restaurante de autor u operación de tueste" |
| `SupplyNav.tsx` | Link "Empresas" → #gifting-corporativo |
| `supplyFormService.ts` | Interfaz `SolicitudSupply` extendida con tipoNegocio, cantidadKits, tipoGifting, quieroMuestra, necesitaRuc |

### Componentes nuevos

| Componente | Sección | Persona |
|------------|---------|---------|
| `src/features/negocios/components/SupplyGifting.tsx` | #gifting-corporativo — entre SupplyProceso y SupplyForm | Empresa Corporativa |

### Pendiente

| Cambio | Componente |
|--------|------------|
| Copy de exclusividad en lotes premium: "Este lote solo lo sirves tú en Lima" | `SupplyLotes.tsx` |
| CTA "¿Quieres una cata en tu local?" visible en lotes SCA ≥ 88 para hoteles/restaurantes | `SupplyLotes.tsx` |
| Testimonial real de cafetería / hotel que ya compró | `SupplyLotes.tsx` o sección nueva |
| Suscripción café tostado para oficinas en landing B2C | `AppClientes.tsx` (Fase 2) |

---

## Vista unificada: todos los flujos B2B en el mismo mapa

```
USUARIO B2B LLEGA AL LANDING
          │
          ▼
       HERO
    "Café verde, directo del origen para tu negocio."
          │
    ┌─────┴──────┐
    ▼            ▼
 LOTES        GIFTING CORPORATIVO ✅
  │                    │
  ├─ Cafetería ──► "Reservar" o "Muestra 200g"
  ├─ Hotel ──────► "Reservar" (CTA diferenciado pendiente)
  └─ Empresa ────► "Cotizar kits →" → dispara tw:gifting-cotizar
          │
          ▼
       PROCESO
    "Tres pasos. Una semana."
          │
          ▼
       FORMULARIO ✅
    Campo: "Tipo de negocio"
    ├─ Cafetería / Tostadora / Hotel ──► checkbox muestra + RUC
    ├─ Empresa ─────────────────────► cantidad kits + gifting puntual/mensual + RUC
    └─ Otro ────────────────────────► banner redirección → tienda B2C
```

---

*Documento vivo · Actualizar con datos reales de conversión tras primer ciclo completo.*
