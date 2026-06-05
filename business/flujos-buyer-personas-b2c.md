# Flujos de Buyer Persona — Landing B2C
> Actualizado: mayo 2026 — refleja estado implementado en `feature/cafi-copy-intermediario`
> Cada flujo describe: de dónde viene → qué ve → qué hace → cómo convierte

---

## Mapa de secciones actual (AppClientes.tsx)

```
NAV  (Nav · Preventa · Origen · Caficultores · Regalar ✅ · Café · Contacto)
 └── Hero          ← primera impresión + CTA narrativo ✅
 └── Preventa      ← urgencia + proceso
 └── Origen        ← historia de Danny
 └── Caficultores  ← quién produce
 └── Gifting  ✅   ← [NUEVO] sección de regalo con 3 tiers
 └── Café          ← productos + compra + reseñas ✅
 └── Modelo        ← transparencia del precio
 └── Contacto      ← puerta de entrada (+ opción "Quiero regalar" ✅)
FOOTER
```

---

## FLUJO #1 — El Consciente (Rodrigo / Camila)

> Compra por identidad. Lo que lo convierte: ver la cara del caficultor + urgencia real.

### De dónde llega
- Instagram Reels / TikTok mostrando la finca o el modelo 50/50
- Recomendación de alguien en quien confía
- UTM: `?utm_source=instagram&utm_campaign=consciente`

### Recorrido en el landing (estado actual)

```
HERO
 ├── Lee: "Café de Especialidad con transparencia desde el origen."
 ├── Ve las métricas: "Hasta 50% al productor · 2 fincas · +1,800 m"
 ├── ✅ CTA: "Conoce quién cosechó tu próxima taza" → activa narrativa emocional
 └── Scroll → Preventa → Origen
        ↓
PREVENTA
 ├── Ve el countdown — entiende que hay urgencia real, no fabricada
 ├── Lee los 4 pasos — entiende el modelo (reserva → tueste → entrega)
 └── CTA "Reservar mi café →" → scroll a #cafe
        ↓
ORIGEN
 ├── Lee la historia de Danny — conecta con el "por qué"
 ├── Ve: "El mayor porcentaje del precio va al productor"
 └── Refuerzo emocional antes de ver los productos
        ↓
CAFICULTORES
 ├── Ve la foto y nombre de Aydee Rojas / Darlyn Sánchez — el café tiene cara
 ├── Lee la frase del caficultor
 └── Puede abrir el perfil completo del caficultor
        ↓
CAFÉ (punto de conversión)
 ├── Ve el lote con el nombre del caficultor y la finca
 ├── Lee las notas de cata
 ├── Ve: "X% al caficultor · S/ Y.YY"
 ├── ✅ Ve bloque de reseñas de compradores (Resenas.tsx)
 ├── Selecciona peso → agrega al carrito → checkout
 └── [ALTERNATIVA si no compra] Se inscribe al waitlist en Hero
        ↓
MODELO (refuerzo post-decisión)
 └── Ve el desglose animado — confirma que hizo lo correcto
```

### Estado de implementación

| # | Cambio | Estado | Componente |
|---|--------|--------|------------|
| 1 | CTA Hero narrativo | ✅ implementado | `Hero.tsx` |
| 2 | Bloque de reseñas debajo del grid | ✅ implementado | `Resenas.tsx` (nuevo) |
| 3 | Mini-video de finca en card del caficultor | ⚠️ código implementado · video demo activo en QA (`alpaso-app`) · pendiente video real de finca | `Caficultores.tsx` |
| 4 | Badge social "X personas lo reservaron" | ✅ implementado | `ProductCard.tsx` (usa `stockReservedKg` ÷ 0.5) |

### Mensaje que cierra la venta
> *"Aydee Rojas cosechó este lote en Jaén. Solo hay 12 bolsas. Cuando se acaben, se acaban."*

### Métricas de éxito
- % de usuarios que llegan desde Hero hasta #cafe: objetivo 60%
- % que abren perfil del caficultor: objetivo 25%
- Tasa de conversión a carrito: objetivo 4%

---

## FLUJO #2 — El Barista Amateur (Diego / Sofía)

> Compra por pasión técnica. Lo que lo convierte: puntaje SCA verificado + receta por método.

### De dónde llega
- YouTube Shorts / TikTok de extracción técnica
- Grupos de Facebook / Reddit de café peruano
- Búsqueda directa: "café especialidad peruano online"
- UTM: `?utm_source=youtube&utm_campaign=barista`

### Recorrido en el landing (estado actual)

```
HERO
 ├── Escanea rápido: busca señales técnicas
 ├── Ve: "Hasta 50% al productor · SCA" — pasa el primer filtro
 └── Click → va directo a los productos
        ↓
CAFÉ (su sección principal)
 ├── Ve el score SCA en la card: "82.5+"
 ├── Lee variedad, proceso, altitud — todo está
 ├── Ve opciones de molienda (V60, Chemex, Aeropress) — le habla
 ├── ✅ Ve chip "Q Grader · M. Quispe" — certifica el puntaje
 ├── ✅ Ve chip "Tueste est. ~9 jun." — planifica su compra
 ├── ✅ Ve sección expandible "Receta recomendada · [método]"
 │    └── La receta cambia dinámicamente según el tipo de molido seleccionado:
 │         · Selecciona Chemex → receta con ratio 1:16, temp 91°C, molienda gruesa
 │         · Selecciona V60    → receta con ratio 1:15, temp 92°C, molienda medio-fina
 │         · Selecciona Aeropress → receta con ratio 1:13, temp 90°C, molienda fina-media
 ├── Hace click en "Desglose" — ve el modal de costos — respeta el modelo
 └── Selecciona peso → agrega al carrito
        ↓
MODELO (validación técnica)
 ├── Lee: "Tueste + Cata Q-Grader — 14%"
 └── Confirma que hay un Q Grader real detrás del puntaje
        ↓
CAFICULTORES (curiosidad, no obligatorio)
 └── Abre perfil — revisa altitud, variedad, proceso en detalle
```

### Estructura de datos de receta (implementada)

El campo `receta` en cada producto es un `Record<string, RecetaMetodo>` indexado por método:

```typescript
receta: {
  'V60':    { ratio, temp, tiempo, molienda, nota? },
  'Chemex': { ratio, temp, tiempo, molienda, nota? },
  'Aeropress': { ratio, temp, tiempo, molienda, nota? },
  // solo incluir los métodos que el producto soporta (brews[])
}
```

El componente `RecetaPanel` en `ProductCard.tsx`:
- Muestra tabs solo para los métodos que existen en `receta` ∩ `brews`
- Sincroniza el tab activo con el selector "Tipo de molido" en tiempo real
- En modo Grano: tab por defecto = primer método del array `brews`

### Receta por lote (datos en Firestore — alpaso-app)

**Caturra Honey — Aydee Rojas**
- V60: 1:15 · 92°C · 3:00–3:30 min · Medio-fina
- Chemex: 1:16 · 91°C · 3:30–4:00 min · Medio-gruesa
- Aeropress: 1:13 · 90°C · 1:30–2:00 min · Fina-media

**Geisha Honey — Aydee Rojas**
- V60: 1:16 · 93°C · 2:45–3:15 min · Fina-media
- Chemex: 1:17 · 92°C · 3:30–4:00 min · Medio-gruesa
- Aeropress: 1:12 · 88°C · 1:15–1:45 min · Fina

### Estado de implementación

| # | Cambio | Estado | Componente |
|---|--------|--------|------------|
| 1 | Chip Q Grader en ProductCard | ✅ implementado | `ProductCard.tsx` |
| 2 | Chip fecha de tueste en ProductCard | ✅ implementado | `ProductCard.tsx` |
| 3 | RecetaPanel expandible + dinámico por método | ✅ implementado | `ProductCard.tsx` |
| 4 | Tipo `receta` extendido a `Record<string, RecetaMetodo>` | ✅ implementado | `catalog.ts` |
| 5 | Datos de receta en Firestore (alpaso-app) | ✅ implementado | script `add-receta-productos.js` |
| 6 | Filtro por SCA mínimo en FilterPanel | ✅ implementado | `FilterPanel.tsx` + `Cafe.tsx` |
| 7 | Bundle "Flight de 3 lotes" | ✅ implementado | `Cafe.tsx` (`FlightBundle` component, visible con ≥3 productos) |

### Mensaje que cierra la venta
> *"Geisha Honey, 82.5+ pts SCA. Jaén, 1500 msnm. Notas: frutal, miel, floral. Tueste estimado: ~9 jun. Receta V60 incluida."*

### Métricas de éxito
- Click en "Desglose" (modal costos): objetivo 30% de visitantes
- Apertura del RecetaPanel: objetivo 20% de visitantes que ven la sección café
- Pedidos con 2+ lotes en el mismo carrito: objetivo 20%
- % uso del filtro SCA: objetivo 15%

---

## FLUJO #3 — El Gifter (Andrea / Martín)

> Compra para regalar. Lo que lo convierte: packaging visible + proceso simple + fecha garantizada.

### De dónde llega
- Google: "regalo original Lima", "kit gourmet Perú", "regalo café peruano"
- Instagram: post de packaging / unboxing
- Recomendación de alguien que ya compró
- UTM: `?utm_source=google&utm_campaign=gifting`

### Recorrido en el landing (estado actual)

```
HERO
 ├── Ve el landing — entiende que hay algo diferente detrás del café
 └── No convierte aquí — sigue scrolleando
        ↓
CAFICULTORES
 └── Ve la historia de producción — entiende el valor narrativo del regalo
        ↓
GIFTING ✅ (sección nueva implementada)
 ├── Título: "Regala café con historia."
 ├── Ve los 3 tiers:
 │    · Esencial (S/65–90) — "Elegir →" → despliega formulario inline
 │    · Premium (S/120–160, badge "Más popular") — "Elegir →" → despliega formulario inline
 │    └── Corporativo (desde S/150/kit) — "Cotizar →" → scroll a #contacto
 ├── Formulario inline (Esencial / Premium):
 │    · Campo: "¿Para qué fecha lo necesitas?" (date input)
 │    · Campo: "Agrega un mensaje personal" (textarea, opcional)
 │    └── Badge: "Entrega garantizada en 48h en Lima"
 └── CTA: "Armar mi kit regalo →"
        ↓
NAV
 ├── ✅ Link "Regalar" → #gifting (acceso directo desde cualquier punto)
        ↓
CONTACTO
 └── ✅ Opción "Quiero regalar" en el selector de tema
      (captura Gifters que llegan directo al formulario de contacto)
```

### Estado de implementación

| # | Cambio | Estado | Componente |
|---|--------|--------|------------|
| 1 | `Gifting.tsx` — sección completa con 3 tiers | ✅ implementado | `Gifting.tsx` (nuevo) |
| 2 | `<Gifting/>` insertado en AppClientes entre Caficultores y Café | ✅ implementado | `AppClientes.tsx` |
| 3 | Nav: link "Regalar" → #gifting | ✅ implementado | `Nav.tsx` |
| 4 | Contacto: opción "Quiero regalar" | ✅ implementado | `Contacto.tsx` + `contactoSchema.ts` |
| 5 | Checkout modo gifting (mensaje + nombre destinatario + envío directo) | ✅ implementado | `Checkout.tsx` + `checkout.ts` |

### Mensaje que cierra la venta
> *"No sabe qué regalarle. Dale el café y la historia de Aydee Rojas. Lo recuerda por semanas."*

### Métricas de éxito
- % de visitantes que llegan a sección #gifting: objetivo 30%
- Tasa de conversión en sección gifting: objetivo 5%
- Ticket promedio del Gifter: objetivo S/ 130
- % de compras con mensaje personalizado: objetivo 70%

---

## Resumen de estado por componente (B2C)

### Archivos modificados

| Componente | Cambios implementados |
|------------|----------------------|
| `Hero.tsx` | CTA: "Conoce quién cosechó tu próxima taza" |
| `ProductCard.tsx` | Chips Q Grader + fecha tueste · RecetaPanel dinámico por método · Badge social "X personas lo reservaron" |
| `Nav.tsx` | Link "Regalar" → #gifting |
| `Contacto.tsx` | Opción "Quiero regalar" en selector de tema |
| `contactoSchema.ts` | Valor `'regalo'` añadido al enum de tema |
| `Cafe.tsx` | `<Resenas/>` al final · `<FlightBundle>` (visible con ≥3 productos) · filtro SCA activo |
| `FilterPanel.tsx` | Nuevo bloque "Puntuación SCA mínima": chips 82+/84+/86+/88+ |
| `AppClientes.tsx` | `<Gifting/>` insertado entre Caficultores y Café |
| `catalog.ts` | Tipo `receta` → `Record<string, RecetaMetodo>` · campos `roastDate?`, `qGraderName?` |
| `Checkout.tsx` | Toggle "Es un regalo" + mensaje personalizado + nombre destinatario + checkbox envío directo |
| `checkout.ts` (tipos) | Campos `isGifting?`, `giftingMensaje?`, `giftingNombreDestinatario?`, `giftingEnviarAlDestinatario?` en `ShippingData` |

### Componentes nuevos

| Componente | Sección | Persona |
|------------|---------|---------|
| `src/features/gifting/components/Gifting.tsx` | #gifting — entre Caficultores y Café | Gifter |
| `src/features/catalog/components/Resenas.tsx` | Debajo del grid de productos | Consciente |

### Pendiente (solo requiere contenido)

| Cambio | Componente | Persona |
|--------|------------|---------|
| Video real de finca (reemplazar demo Pexels) — grabar con Aydee Rojas o Darlyn Sánchez, subir a Cloudinary/Firebase Storage, actualizar `videoUrl` en Firestore `caficultores` | `Caficultores.tsx` (campo `videoUrl` en Firestore) | Consciente |
| Reseñas reales del primer ciclo — reemplazar las 4 placeholder en `Resenas.tsx` con testimonios verificados de compradores mayo/jun 2026 | `Resenas.tsx` (datos hardcodeados) | Consciente |
| Recetas para productos futuros (Bourbon Lavado, etc.) | Firestore `alpaso-app` | Barista |
| Meta tags SEO: "regalo café peruano Lima" en `index.html` / `<title>` / `<meta description>` | `index.html` o `AppClientes.tsx` | Gifter |
| Foto real del packaging de kits gifting (caja kraft, tissue, tarjeta) | `Gifting.tsx` (actualmente sin imagen física) | Gifter |

---

*Documento vivo · Actualizar con datos reales de conversión tras primer ciclo completo.*
