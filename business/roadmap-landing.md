# Roadmap de Optimización — Tunay Wasi Landings
> Fase 1 · mayo–junio 2026 · Full time
> Actualizado: mayo 2026 — refleja estado implementado en `feature/cafi-copy-intermediario`

---

## Principio de secuencia

> Primero arreglas lo que ya existe y tiene tráfico.
> Después construyes lo nuevo.
> Después traes más tráfico a lo que ya convierte.

---

## SEMANA 1 — Quick Wins ✅ COMPLETADA

### Día 1 — Formulario B2B (SupplyForm.tsx) ✅

| # | Cambio | Estado |
|---|--------|--------|
| 1 | Campo "Tipo de negocio" (select 6 opciones: cafetería / tostadora / hotel-restaurante / empresa / distribuidor / otro) | ✅ |
| 2 | Si tipo = Empresa: campos condicionales (cantidad kits + toggle gifting puntual/mensual) | ✅ |
| 3 | Checkbox "Necesito factura con RUC" (siempre visible) | ✅ |
| 4 | Checkbox "Quiero muestra de 200g" (cafetería / tostadora / hotel) | ✅ |
| 5 | Banner de redirección al B2C si tipo = "Otro" | ✅ |
| 6 | Listener `tw:gifting-cotizar` → auto-selecciona tipo "empresa" | ✅ |
| 7 | `SolicitudSupply` extendida con campos nuevos en `supplyFormService.ts` | ✅ |

### Día 2 — Cards de lote B2B (SupplyLotes.tsx) ✅

| # | Cambio | Estado |
|---|--------|--------|
| 4 | Botón secundario "Pedir muestra 200g →" en cada card de lote | ✅ |
| 5 | Badge "Solo X sacos" en terracotta cuando stock ≤ 4 sacos | ✅ |

### Día 3 — ProductCard B2C (ProductCard.tsx + catalog.ts) ✅

| # | Cambio | Estado |
|---|--------|--------|
| 6 | Chip fecha de tueste proyectada: "Tueste est. ~9 jun." | ✅ |
| 7 | Chip nombre Q Grader: "Q Grader · M. Quispe" | ✅ |
| 8 | Tipo `Producto` extendido: `roastDate?`, `qGraderName?`, `receta?` | ✅ |

### Día 4 — Hero B2C + Contacto ✅

| # | Cambio | Estado |
|---|--------|--------|
| 9 | CTA hero: "Descubrir nuestro café" → "Conoce quién cosechó tu próxima taza" | ✅ |
| 10 | Opción "Quiero regalar" en selector de tema del formulario de contacto | ✅ |
| 11 | Valor `'regalo'` añadido al enum del schema Zod de contacto | ✅ |

---

## SEMANA 2 — Construcción nueva ✅ COMPLETADA

### Días 6–8 — Gifting B2C (Gifting.tsx) ✅

**Componente:** `src/features/gifting/components/Gifting.tsx`

| Elemento | Estado |
|----------|--------|
| Sección `#gifting` entre Caficultores y Café | ✅ |
| 3 tiers: Esencial (S/65–90) · Premium (S/120–160, badge "Más popular") · Corporativo (desde S/150/kit) | ✅ |
| Click-to-select: Esencial/Premium despliegan formulario inline (fecha + mensaje) | ✅ |
| Corporativo → CTA "Cotizar →" → scroll a #contacto | ✅ |
| Nav B2C: link "Regalar" → #gifting | ✅ |
| `<Gifting/>` insertado en AppClientes entre Caficultores y Café | ✅ |

### Días 9–10 — Gifting Corporativo B2B (SupplyGifting.tsx) ✅

**Componente:** `src/features/negocios/components/SupplyGifting.tsx`

> **Nota:** módulo renombrado de `mayoristas` → `negocios` en rama QA.

| Elemento | Estado |
|----------|--------|
| Sección `#gifting-corporativo` entre SupplyProceso y SupplyForm | ✅ |
| Modelo A: Gifting puntual (kits para fechas especiales) | ✅ |
| Modelo B: Beneficio mensual (1 bolsa/mes por colaborador) | ✅ |
| "Cotizar →" despacha evento `tw:gifting-cotizar` → conectado con SupplyForm | ✅ |
| Banner inferior CTA: "Solicitar propuesta corporativa →" | ✅ |
| Nav B2B: link "Empresas" → #gifting-corporativo | ✅ |
| `<SupplyGifting/>` insertado en AppNegocios | ✅ |

---

## SEMANA 3 — Contenido y prueba social ✅ COMPLETADA

### Días 11–12 — Reseñas en B2C (Resenas.tsx) ✅

**Componente:** `src/features/catalog/components/Resenas.tsx`

| Elemento | Estado |
|----------|--------|
| 4 reseñas placeholder con estrellas, nombre, ciudad, fecha y lote | ✅ |
| Insertado al final de `Cafe.tsx` vía `<Resenas/>` | ✅ |
| Reseñas reales del primer ciclo (requiere contenido) | pendiente |

### Días 13–14 — Receta de preparación dinámica por lote ✅

**Componente:** `RecetaPanel` dentro de `ProductCard.tsx`

| Elemento | Estado |
|----------|--------|
| `RecetaPanel` expandible en ProductCard | ✅ |
| Tipo `receta` → `Record<string, RecetaMetodo>` (indexado por método) | ✅ |
| Tab activo sincronizado con selector "Tipo de molido" en tiempo real | ✅ |
| Datos por método: ratio · temp · tiempo · molienda · nota opcional | ✅ |
| Datos subidos a Firestore (alpaso-app) via `scripts/add-receta-productos.js` | ✅ |
| Productos con receta: caturra-honey-aydee-2026 · geisha-honey-aydee-2026 | ✅ |

**Métodos por producto:**

| Producto | V60 | Chemex | Aeropress | French Press |
|----------|-----|--------|-----------|--------------|
| Caturra Honey — Aydee | ✅ | ✅ | ✅ | — |
| Geisha Honey — Aydee | ✅ | ✅ | ✅ | — |
| Bello Horizonte Geisha (fallback estático) | ✅ | ✅ | — | ✅ |

---

## SEMANA 4 — Redirección de Oficinas + SEO Gifting

### Día 15 — Banner de redirección en B2B ✅

| Cambio | Estado |
|--------|--------|
| Si tipo = "Otro" en SupplyForm → banner inline hacia B2C | ✅ |

### Días 16–18 — Suscripción para oficinas en B2C

| Cambio | Estado |
|--------|--------|
| Nueva opción "Suscripción mensual para tu oficina" en Preventa o sección nueva | pendiente |

### Días 19–20 — SEO y meta tags para gifting

| Cambio | Estado |
|--------|--------|
| Meta title/description específico para #gifting | pendiente |
| OG tags para compartir en WhatsApp con preview del packaging | pendiente |
| Keyword target: "regalo café peruano", "kit gourmet Lima" | pendiente |

---

## Resumen visual del estado actual

```
SEMANA 1 ── Quick Wins                              ✅ COMPLETADA
  Día 1: Formulario B2B (tipo negocio, RUC, gifting, muestra, redirección)
  Día 2: Cards de lote B2B (muestra 200g, badge stock limitado)
  Día 3: ProductCard B2C (fecha tueste, Q Grader, tipo receta dinámico)
  Día 4: Hero B2C (CTA narrativo) + Contacto ("Quiero regalar")

SEMANA 2 ── Construcción nueva                      ✅ COMPLETADA
  Días 6–8:  Gifting.tsx — sección B2C para el Gifter
  Días 9–10: SupplyGifting.tsx — sección B2B corporativa + evento tw:gifting-cotizar

SEMANA 3 ── Contenido y prueba social               ✅ COMPLETADA
  Días 11–12: Resenas.tsx — bloque de reseñas en B2C
  Días 13–14: RecetaPanel dinámico por tipo de molido

SEMANA 4 ── Redirección Oficinas + SEO              🔄 EN PROGRESO
  Día 15:    Banner redirección B2B tipo "Otro" → B2C  ✅
  Días 15b:  Badge social "X personas lo reservaron"   ✅
  Días 15c:  Filtro SCA mínimo en FilterPanel          ✅
  Días 15d:  Bundle "Flight de 3 lotes" en Cafe.tsx    ✅
  Días 15e:  Checkout modo gifting (mensaje + destinatario) ✅
  Días 16–18: Suscripción para oficinas en B2C          pendiente
  Días 19–20: SEO/meta tags para gifting                pendiente
```

---

## Pendiente post-implementación (requiere contenido o decisión)

| Tarea | Tipo | Persona beneficiada |
|-------|------|---------------------|
| Reseñas reales del primer ciclo | contenido | Consciente |
| Mini-video de finca (15–30s) en Caficultores | contenido | Consciente |
| Recetas para productos futuros (Bourbon Lavado, etc.) | contenido + seed | Barista |
| Filtro por SCA mínimo en FilterPanel | ✅ código | Barista |
| Bundle "Flight de 3 lotes" en Cafe.tsx | ✅ código | Barista |
| Checkout modo gifting (campo mensaje + envío a destinatario) | ✅ código | Gifter |
| Badge social "X personas lo reservaron" en ProductCard | ✅ código | Consciente |
| Suscripción para oficinas en B2C | código | Oficina/Coworking |
| SEO y OG tags para #gifting | código | Gifter |

---

## Notas de arquitectura

- Módulo `mayoristas` → `negocios`: renombrado en rama QA. Paths actuales: `src/features/negocios/`, `AppNegocios.tsx`.
- Scripts de Firestore: **siempre apuntar a `alpaso-app` (QA) primero**, nunca directo a `tunay-wasi` (prod).
- El campo `receta` en `Producto` es `Record<string, RecetaMetodo>` — las claves deben coincidir exactamente con los valores del array `brews[]` del producto.
- El evento `tw:gifting-cotizar` es el mecanismo de comunicación entre `SupplyGifting` y `SupplyForm` — no usar props ni estado compartido.
- CTA "Reservar lote exclusivo →" se activa cuando `l.sca >= 88` en `SupplyLotes.tsx`. El umbral elegido fue 88 (top lot) para no diluir el mensaje de exclusividad.
- El campo "Propuesta gastronómica" en `SupplyForm` comparte el campo `mensaje` del formulario — cuando tipo = hotel-restaurante, el textarea genérico adapta su label y placeholder automáticamente.

---

*Roadmap vivo — ajustar según métricas reales después del primer ciclo completo.*
