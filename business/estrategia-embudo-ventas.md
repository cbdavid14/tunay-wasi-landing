# Estrategia de Embudo de Ventas — Tunay Wasi
> Documento vivo · Fase 1 (mayo–agosto 2026)
> Base: buyer personas definidos en `buyer-personas.md`
> **Última revisión: mayo 2026** — actualizado con estado real del código

---

## Análisis de Alineamiento: Landing B2C vs. Buyer Personas

### Resumen ejecutivo

El landing B2C actual está **altamente alineado** con los tres buyer personas. Las brechas críticas identificadas en la versión anterior del documento han sido implementadas. Quedan pendientes solo elementos que dependen de datos del mundo real (reseñas del primer ciclo, video real de finca) y funcionalidades de Fase 2 (suscripción para oficinas).

---

### ✅ Alineamiento Alto — Persona #2: "El Barista Amateur" (Diego / Sofía)

**Qué el landing hace bien:**
- Puntaje SCA visible en cada ProductCard (`87.5+`)
- Información técnica completa: variedad, proceso, altitud, fecha de ciclo
- Notas de cata específicas (`Caramelo, Naranja sanguina, Cacao`)
- Opciones de molienda (V60, Chemex, French Press) — activa su identidad técnica
- Modelo 50/50 auditado — responde al miedo de los puntajes inflados
- Envío urgente + tueste bajo pedido — aborda su sensibilidad a la frescura
- ✅ **[Implementado]** Chip "Q Grader · M. Quispe" visible en ProductCard
- ✅ **[Implementado]** Chip "Tueste est. ~9 jun." en ProductCard
- ✅ **[Implementado]** RecetaPanel expandible con tabs por método (V60 / Chemex / Aeropress) — datos en Firestore
- ✅ **[Implementado]** Filtro SCA mínimo en barra siempre visible (82+ / 84+ / 86+ / 88+)
- ✅ **[Implementado]** Bundle "Flight de 3 lotes" — aparece automáticamente cuando hay ≥3 productos

**Brechas residuales:**
- Sin comparativa de precio vs. tostadores Lima en el copy — pendiente decisión editorial

**Veredicto:** 9/10 — El Barista Amateur tiene todos los triggers técnicos activos.

---

### ✅ Alineamiento Alto — Persona #1: "El Consciente" (Rodrigo / Camila)

**Qué el landing hace bien:**
- Sección Origen con la historia de Danny Santa Cruz — narrativa poderosa
- Nombre y foto del caficultor visible en cada producto
- Modelo 50/50 como prueba de transparencia
- Urgencia real: countdown + "lotes limitados"
- Copy emocional alineado: "tu dinero hace algo más"
- ✅ **[Implementado]** CTA Hero: `"Conoce quién cosechó tu próxima taza"` — narrativo, no genérico
- ✅ **[Implementado]** Badge social "X personas ya reservaron este lote" en ProductCard (usa `stockReservedKg`)
- ✅ **[Implementado]** Sección Reseñas debajo del grid (componente `Resenas.tsx`) — 4 reseñas placeholder
- ⚠️ **[Parcial]** Mini-video de finca en card de caficultor — código y lógica implementados, video demo activo en QA. Pendiente video real de Aydee Rojas / Darlyn Sánchez.

**Brechas residuales:**
- Reseñas son placeholder — reemplazar con reales tras primer ciclo (mayo/junio 2026)
- Mini-video: demo técnico funciona, pendiente video real de finca

**Veredicto:** 8/10 — El Consciente tiene narrativa, prueba social y humanidad. Subirá a 9/10 cuando las reseñas sean reales y el video de finca esté disponible.

---

### ✅ Alineamiento Alto — Persona #3: "El Gifter" (Andrea / Martín)

**Qué el landing hace bien:**
- Propuesta de valor clara ("apoyas directamente a un caficultor peruano")
- Historia impresa del caficultor es un asset fuerte para gifting
- ✅ **[Implementado]** Sección completa `KitBuilder.tsx` entre Caficultores y Café — flujo multi-paso (bolsa / flight · tamaño · accesorios · caja · mensaje)
- ✅ **[Implementado]** Modo Bolsa: elige lote + tamaño + accesorios + caja regalo + mensaje personalizado
- ✅ **[Implementado]** Modo Flight: 3 lotes × 100g con 10% descuento automático
- ✅ **[Implementado]** Badge "Entrega garantizada en 48h en Lima"
- ✅ **[Implementado]** Nav: link "Arma tu kit" → `#kit`
- ✅ **[Implementado]** Contacto: opción "Quiero regalar" en selector de tema
- ✅ **[Implementado]** Checkout: toggle "Es un regalo" con mensaje + nombre destinatario + checkbox envío directo

**Brechas residuales:**
- Sin foto real del packaging premium — `ImageSlot` todavía como placeholder
- Sin copy SEO dedicado ("regalo café peruano Lima") en meta tags — pendiente

**Veredicto:** 8.5/10 — El Gifter tiene un flujo completo de conversión. Subir a 9/10 con foto real del packaging y meta tags SEO.

---

---

## Estado de implementación B2C — Resumen rápido

| Componente | Archivo | Estado |
|---|---|---|
| CTA narrativo Hero | `Hero.tsx` | ✅ Activo |
| Chip Q Grader | `ProductCard.tsx` | ✅ Activo |
| Chip fecha de tueste | `ProductCard.tsx` | ✅ Activo |
| RecetaPanel por lote | `ProductCard.tsx` | ✅ Activo (datos en Firestore) |
| Filtro SCA barra fija | `FilterPanel.tsx` | ✅ Activo |
| Bundle Flight 3 lotes | `Cafe.tsx` (FlightBundle) | ✅ Activo con ≥3 productos |
| Badge social reservas | `ProductCard.tsx` | ✅ Activo (requiere `stockReservedKg > 0`) |
| Sección Gifting B2C | `Gifting.tsx` | ✅ Activo — 3 tiers |
| Nav link "Regalar" | `Nav.tsx` | ✅ Activo |
| Checkout modo gifting | `Checkout.tsx` | ✅ Activo |
| Sección Reseñas | `Resenas.tsx` | ⚠️ Placeholder — reemplazar post ciclo mayo/jun 2026 |
| Mini-video caficultor | `Caficultores.tsx` | ⚠️ Código listo, demo en QA — pendiente video real |
| Suscripción oficinas | — | ❌ Fase 2 |
| Meta tags SEO gifting | — | ❌ Pendiente |

---

## Estrategia de Embudo de Ventas por Buyer Persona

---

## EMBUDO B2C #1 — "El Consciente" (Rodrigo / Camila)

> **Objetivo de conversión:** Primera compra de bolsa individual → suscripción mensual

### Etapa 1 — CONCIENCIA (TOFU)

**¿Dónde está?**
Instagram, TikTok, newsletters de gastronomía peruana, recomendaciones de amigos

**¿Qué lo mueve a descubrir Tunay Wasi?**
- Video de 30s en Instagram Reels: Ayde Rojas en su finca, corte directo al pago en su teléfono
- Post de carrusel: "El café que compras en el supermercado le paga 18% al productor. El nuestro, 38%."
- Historia compartida por un influencer gastronómico que conoce a Danny

**Mensaje clave TOFU:**
> "Hoy existe una forma de tomar café de especialidad y saber exactamente quién lo cosechó, cuándo, y cuánto le pagaron."

**KPIs TOFU:**
- Alcance orgánico de Reels
- Tráfico desde Instagram → landing (UTM)
- Saves y shares de carruseles

---

### Etapa 2 — CONSIDERACIÓN (MOFU)

**¿Qué lo mueve a quedarse en el landing?**
- Ve el nombre y foto de Darlyn Sánchez en la primera card de producto
- Lee la historia de Danny en la sección Origen
- Entiende el modelo 50/50 — desaparece su miedo al greenwashing
- El countdown le da urgencia genuina

**Acción esperada:** Scrollea todo el landing, abre el perfil del caficultor, agrega al carrito o se inscribe al waitlist

**Brechas actuales a resolver:**
1. ✅ **[Resuelto]** Cambiar CTA Hero → "Conoce quién cosechó tu próxima taza"
2. ✅ **[Resuelto]** Agregar badge "X personas ya reservaron este lote" en ProductCard
3. ⚠️ **[Parcial]** Agregar reseñas reales debajo del grid — placeholder activo, pendiente datos reales del ciclo mayo/jun 2026
4. ⚠️ **[Parcial]** Micro-video de finca en Caficultores — código listo, video demo en QA. Pendiente video real de Aydee Rojas

**Mensaje clave MOFU:**
> "Ayde Rojas cosechó este lote en marzo en Jaén. Solo hay 40 bolsas. Cuando se acaben, se acaban."
*(ya existe en buyer-personas.md — implementar en card de producto)*

**KPIs MOFU:**
- Tiempo en página
- % de usuarios que llegan a sección #cafe
- Click en "Ver perfil completo" del caficultor
- Tasa de adición al carrito

---

### Etapa 3 — DECISIÓN (BOFU)

**¿Qué lo mueve a comprar?**
- Precio claro, justificado y sin trampa
- Checkout sin fricción (Yape / transferencia)
- Urgencia: fecha límite de preventa visible
- Confirmación de que el pedido llega antes de que lo necesite

**Acción esperada:** Completar checkout en primera visita o regresar por retargeting en 48h

**Táctica de recuperación de carrito abandonado:**
- Email automatizado a las 24h: "Tu lote de [caficultor] todavía está disponible. Pero el ciclo cierra el [fecha]."
- WhatsApp si dejó número: mismo mensaje, más personal

**Mensaje clave BOFU:**
> "Reservaste el trabajo de una familia. En [días] días tuesta y sale para ti."

**KPIs BOFU:**
- Tasa de conversión checkout
- % de abandono de carrito
- Recuperación por email/WhatsApp

---

### Etapa 4 — RETENCIÓN Y ASCENSO

**Objetivo:** Primera compra → suscripción mensual S/ 65–85

**Táctica post-compra:**
- Email D+1: "Tu café está en camino — aquí la historia completa de [caficultor] + receta de preparación recomendada"
- Email D+7 (entrega estimada): "¿Ya lo probaste? Cuéntanos + invita a un amigo"
- Email D+14: "El próximo ciclo abre en X días. Suscríbete y asegura tu lote con prioridad"

**Modelo de ascenso:**
```
Compra única (S/ 39–85) → Suscripción mensual (S/ 65–85/mes) → Gifter referido
```

**KPIs de retención:**
- % de segunda compra en 60 días
- Tasa de conversión a suscripción
- NPS post-entrega

---

## EMBUDO B2C #2 — "El Barista Amateur" (Diego / Sofía)

> **Objetivo de conversión:** Compra técnica recurrente → suscripción + flight de lotes

### Etapa 1 — CONCIENCIA (TOFU)

**¿Dónde está?**
YouTube (canales de barismo), Reddit r/coffee, grupos de Facebook de café peruano, TikTok de extracción

**¿Qué lo mueve a descubrir Tunay Wasi?**
- Video en TikTok/YouTube Shorts: "Geisha Natural 88.5 puntos SCA de Cajamarca — compramos directamente al productor"
- Post técnico: "¿Cuánto paga realmente al caficultor tu tostador favorito? Nosotros lo publicamos."
- Q Grader peruano comparte un lote de Tunay Wasi en sus redes

**Mensaje clave TOFU:**
> "88.5 puntos SCA. Verificado por Q Grader. Finca en Cajamarca a 1,800 msnm. Tostado bajo pedido."

**KPIs TOFU:**
- Vistas en YouTube Shorts / TikTok técnicos
- Tráfico desde grupos de café peruano
- CTR desde contenido técnico

---

### Etapa 2 — CONSIDERACIÓN (MOFU)

**¿Qué lo mueve a quedarse en el landing?**
- Ve el puntaje SCA en la card del producto — es su primer filtro
- Lee la variedad, proceso, altitud, fecha de cosecha — todo está ahí
- Ve que tiene opción de molienda para su método — valida que entienden de café
- Entiende el modelo 50/50 — respeta la ética de la empresa

**Acción esperada:** Abre el desglose de costos, filtra por puntaje SCA, agrega 1–2 lotes al carrito para comparar

**Brechas actuales a resolver:**
1. ✅ **[Resuelto]** Agregar chip Q Grader en ProductCard
2. ✅ **[Resuelto]** Agregar chip fecha de tueste proyectada en ProductCard
3. ✅ **[Resuelto]** Agregar RecetaPanel por lote (datos en Firestore — V60, Chemex, Aeropress para todos los lotes activos)
4. ✅ **[Resuelto]** Agregar filtro SCA mínimo en FilterPanel (barra siempre visible)
5. ✅ **[Resuelto]** Crear bundle "Flight de 3 lotes" — aparece automáticamente con ≥3 productos, 250g c/u, 10% descuento

**Mensaje clave MOFU:**
> "Geisha Natural, 88.5 pts SCA. Cajamarca, 1,800 msnm. Notas: maracuyá, jazmín, cacao. Tostado hace 5 días."
*(ya existe en buyer-personas.md — el landing ya tiene casi todo esto, falta fecha de tueste)*

**KPIs MOFU:**
- Click en "Desglose" (modal de costos)
- Uso del FilterPanel
- Pedidos de múltiples lotes en un mismo carrito

---

### Etapa 3 — DECISIÓN (BOFU)

**¿Qué lo mueve a comprar?**
- Precio justo vs. tostadores de especialidad en Lima
- Frescura garantizada (tueste bajo pedido, no café de bodega)
- Sin riesgo: primero información completa, después la plata

**Comparativa de precio (para activar BOFU):**
- Tunay Wasi: S/ 39/250g (Geisha 87.5 SCA, tueste bajo pedido, 38% al caficultor)
- Tostador promedio Lima: S/ 42–55/250g (mismo rango SCA, tueste en stock)

**Táctica BOFU:**
- "¿Quieres probar antes de suscribirte? Compra una bolsa. Si no te vuela la cabeza, te devolvemos la diferencia."
- Garantía de frescura visible: "Si tu café tiene más de 30 días desde el tueste, lo reemplazamos."

**Mensaje clave BOFU:**
> "No vendemos café. Vendemos el lote específico que cosechó esta familia, tostado el día antes de enviarlo."

**KPIs BOFU:**
- Tasa de conversión del Barista Amateur
- Número de lotes por pedido (target: >1)
- Tasa de uso de "Flight de lotes"

---

### Etapa 4 — RETENCIÓN Y ASCENSO

**Objetivo:** Compra única → comprador mensual → embajador en comunidades de café

**Táctica post-compra:**
- Email D+1: "Receta de preparación para tu [nombre del lote] + perfil del Q Grader que lo certificó"
- Email D+7: "¿Qué método usaste? Comparte tu resultado en Instagram y etiquétanos"
- Email D+21: "El siguiente ciclo trae [variedad inédita] — el primero en reservar tiene precio especial"

**Modelo de ascenso:**
```
Compra única → Flight mensual de 2 lotes (S/ 70–120) → Comprador frecuente con prioridad de acceso
```

**KPIs de retención:**
- % de segunda compra en 30 días
- Reviews/posts compartidos en comunidades de café
- NPS técnico (¿recomendarías este lote en tu grupo de barismo?)

---

## EMBUDO B2C #3 — "El Gifter" (Andrea / Martín)

> **Objetivo de conversión:** Visita por intención de regalo → compra de kit en menos de 10 minutos

### Etapa 1 — CONCIENCIA (TOFU)

**¿Dónde está?**
Google ("regalo original Lima", "regalo gourmet Perú"), Pinterest, Instagram inspiración de regalos

**¿Qué lo mueve a descubrir Tunay Wasi?**
- SEO: landing o sección específica optimizada para "regalo de café peruano" y "kit gourmet Lima"
- Instagram: post de packaging con historia del caficultor
- Recomendación de amigo que ya compró

**Mensaje clave TOFU:**
> "El regalo que no se olvida: el café que cosechó Ayde Rojas, con su historia y su cara. Tu amigo lo probará y pensará en ti."

**KPIs TOFU:**
- Tráfico orgánico desde búsquedas de regalo
- CTR desde Instagram hacia el landing

---

### Etapa 2 — CONSIDERACIÓN (MOFU)

**El problema hoy:** ~~el Gifter llega al landing y no se ve representado~~ → **RESUELTO**: sección `Gifting.tsx` implementada.

**Solución implementada — sección Gifting:**

✅ Sección `id="gifting"` entre Caficultores y Café (`AppClientes.tsx`)
✅ Nav link "Regalar" → `#gifting`
✅ 3 tiers implementados:
  - **Esencial** (S/ 65–90): 1 bolsa 250g + ficha del caficultor → formulario inline con fecha + mensaje
  - **Premium** (S/ 120–160, badge "Más popular"): 2 bolsas + caja kraft + carta → formulario inline
  - **Corporativo** (desde S/ 150/kit): desde 10 kits → CTA → `#contacto`
✅ Badge "Entrega garantizada en 48h en Lima"
✅ Checkout: toggle "Es un regalo" con mensaje personalizado (280 chars), nombre destinatario, checkbox envío directo
✅ Contacto: opción "Quiero regalar" en selector de tema

**Pendiente:**
- Foto real del packaging (actualmente sin imagen física del kit)
- Meta tags SEO: `<meta name="description">` con "regalo café peruano Lima"

**Mensaje clave MOFU:**
> "¿Tienes amigos que 'tienen de todo'? Este regalo les cuenta algo — el nombre de la persona que cosechó su café esta mañana."

**KPIs MOFU:**
- % de usuarios que llegan a sección gifting
- Click en tiers de kit
- Tiempo en sección gifting

---

### Etapa 3 — DECISIÓN (BOFU)

**¿Qué lo mueve a comprar?**
- El packaging se ve bien en el unboxing — valida que el destinatario quedará impresionado
- Precio claro, sin sorpresas
- Entrega garantizada antes de la fecha que necesita
- Proceso simple: elige kit → agrega mensaje → paga → llega

**Tácticas BOFU:**
- Mostrar mockup del packaging con el nombre del destinatario
- Badge "Entrega garantizada en 48h Lima"
- Opción de envoltura para regalo (con costo adicional)
- "400 kits regalados este año — el más popular para cumpleaños en Lima"

**Mensaje clave BOFU:**
> "Packaging premium · Historia impresa del caficultor · Envío en 24h Lima."

**KPIs BOFU:**
- Tasa de conversión en sección gifting
- Ticket promedio del Gifter
- % de compras con mensaje personalizado

---

### Etapa 4 — RETENCIÓN Y ASCENSO

**Objetivo:** Gifter ocasional → comprador recurrente en temporadas altas + gifter para empresas

**Táctica post-compra:**
- Email D+3: "Tu regalo llegó. ¿Cómo reaccionó [nombre del destinatario]? Cuéntanos."
- Email D+60 (previo a Navidad / Día del Padre / etc.): "Es la temporada de regalos — ¿quieres repetir la experiencia que tanto gustó?"
- Email D+90: "¿Tu empresa también regala en Navidad? Hacemos kits corporativos desde 10 unidades."

**Modelo de ascenso:**
```
Kit individual → Kit premium → Gifting corporativo (5–50 kits)
```

**Temporadas clave para activar el Gifter:**
- Día de la Madre (mayo)
- Día del Padre (junio)
- Navidad / Año Nuevo (diciembre)
- San Valentín (febrero)
- Aniversarios corporativos

**KPIs de retención:**
- % de recompra en temporada siguiente
- Conversión a gifting corporativo
- NPS del destinatario (¿le gustó el regalo?)

---

## Matriz de Prioridades — Acciones Inmediatas

| Acción | Persona | Impacto | Estado |
|--------|---------|---------|--------|
| ~~Crear sección/flujo de Gifting en landing~~ | Gifter | 🔴 Alto | ✅ Implementado |
| ~~Agregar fecha de tueste proyectada en ProductCard~~ | Barista | 🟡 Medio | ✅ Implementado |
| ~~Agregar nombre del Q Grader en ficha técnica~~ | Barista | 🟡 Medio | ✅ Implementado |
| ~~Agregar receta de preparación por lote~~ | Barista | 🔴 Alto | ✅ Implementado |
| ~~Cambiar CTA Hero a copy más narrativo~~ | Consciente | 🟡 Medio | ✅ Implementado |
| ~~Agregar badge "X personas reservaron este lote"~~ | Consciente | 🟡 Medio | ✅ Implementado |
| ~~Crear bundle "Flight de 3 lotes"~~ | Barista | 🟡 Medio | ✅ Implementado |
| ~~Agregar filtro por puntaje SCA en FilterPanel~~ | Barista | 🟡 Medio | ✅ Implementado |
| Agregar reseñas reales de clientes | Consciente | 🔴 Alto | ⚠️ Placeholder activo — pendiente primer ciclo |
| Video real de finca en Caficultores | Consciente | 🟡 Medio | ⚠️ Código listo — pendiente grabación |
| Foto real del packaging gifting | Gifter | 🟡 Medio | ❌ Pendiente |
| Meta tags SEO "regalo café peruano" | Gifter | 🔴 Alto | ❌ Pendiente |
| Suscripción mensual para oficinas (B2C) | Oficina | 🟡 Medio | ❌ Fase 2 |
| Secuencia de emails post-compra por persona | Todos | 🔴 Alto | ❌ Por implementar |

---

## Métricas de Embudo Global B2C

### Benchmarks objetivo (Fase 1 — ago. 2026)

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| Tasa de conversión landing → carrito | — | 3–5% |
| Tasa de conversión carrito → checkout | — | 60% |
| Tasa de segunda compra (60 días) | — | 25% |
| Tasa de conversión a suscripción | — | 15% |
| Ticket promedio B2C | — | S/ 75 |
| NPS post-entrega | — | 8+ / 10 |

---

## Herramientas de Activación por Etapa

| Etapa | Herramienta | Estado |
|-------|-------------|--------|
| TOFU | Instagram Reels + TikTok (orgánico) | En marcha |
| TOFU | Meta Ads (retargeting LAL) | Por implementar |
| MOFU | Landing B2C (tienda) | Activo — con brechas |
| MOFU | Email waitlist | Activo |
| BOFU | WhatsApp recuperación de carrito | Por implementar |
| BOFU | Email 24h carrito abandonado | Por implementar |
| POST | Secuencia de emails post-compra | Por implementar |
| POST | Programa de referidos | Fase 2 |

---

*Documento vivo — revisar mensualmente con datos reales de conversión.*
*Próxima revisión: agosto 2026 con métricas de los ciclos de mayo y junio.*

---

---

# Análisis de Alineamiento: Landing B2B vs. Buyer Personas

### Resumen ejecutivo

El landing B2B (Tunay Wasi Supply) ha cerrado sus brechas críticas de segmentación. El formulario ahora diferencia entre tipos de negocio y activa campos condicionales. La sección de gifting corporativo está implementada. Quedan pendientes elementos de copy diferenciado y prueba social real.

---

### ✅ Alineamiento Alto — Persona B2B #1: "La Cafetería Independiente"

**Qué el landing hace bien:**
- Lotes con nombre del caficultor y finca — activa su deseo de "poner algo en la pizarra"
- Ficha técnica completa (SCA, variedad, proceso, altitud, notas de cata) — responde a su lenguaje
- Opción de muestra 200g antes de comprometerse — elimina la objeción principal
- Pasaporte de cata con cada saco — material que puede usar en carta
- MOQ de 1 saco (46 kg) — accesible para cafeterías pequeñas
- Q Grader certificado visible — valida calidad sin lugar a dudas
- Precio FOB por kg visible — permite comparar con su tostador actual

**Brechas identificadas:**
- No hay comparativa explícita de precio vs. "tu tostador actual" — su principal objeción no está resuelta en el copy
- No hay propuesta de exclusividad de lote ("este lote solo lo sirves tú en Lima") — su mayor deseo
- ✅ **[Resuelto]** El formulario tiene campo "Tipo de negocio" — Danny puede preparar propuesta a medida
- No hay sección de consistencia / garantía de reposición — su miedo más grande
- Falta copy de "historia para tu pizarra" — el asset más poderoso para este persona
- ✅ **[Resuelto]** Botón "Pedir muestra 200g →" visible en cada card de lote
- No hay testimoniales de cafeterías reales que ya compran

**Veredicto: 8/10** — El lote y la ficha técnica hacen el trabajo + muestra 200g activa la conversión. Falta copy de exclusividad y testimoniales.

---

### ✅ Alineamiento Alto — Persona B2B #2: "El Hotel / Restaurante Gourmet"

**Qué el landing hace bien:**
- Lenguaje de terroir y trazabilidad — habla su idioma
- Lotes con identidad propia (finca, origen, caficultor) — lo que quiere contar a sus huéspedes
- Q Grader + pasaporte de cata — coherencia con su estándar gastronómico
- Visual premium del landing — está a la altura de su propuesta

**Brechas identificadas:**
- No hay mención de "lote exclusivo para tu establecimiento" — su mayor detonante de compra
- No hay propuesta de cata guiada en su local — el factor decisivo para este segmento
- No hay mención de material de carta impreso premium — el asset que cierra la venta
- ✅ **[Resuelto]** El formulario tiene "Tipo de negocio" + campo condicional "Propuesta gastronómica" para hotel/restaurante
- No hay testimonial / caso de éxito de un hotel o restaurante que ya usa Tunay Wasi
- El pitch de "posibilidad de visita a la finca para clientes VIP" no está en ningún lado
- ✅ **[Implementado]** CTA diferenciado en lotes con SCA ≥88 ("Reservar lote exclusivo →")

**Veredicto: 7/10** — El hotel entiende la propuesta y tiene CTA diferenciado. Falta copy de exclusividad y testimoniales.

---

### ⚠️ Alineamiento Parcial — Persona B2B #3: "La Empresa Corporativa"

**Qué el landing hace bien:**
- Propuesta de impacto social ("café directo al caficultor") — activa sus valores de RSE
- Historia del caficultor disponible — el asset que hace memorable el regalo
- Precios por saco permiten calcular kits a escala

**Brechas identificadas:**
- ✅ **[Resuelto]** Sección `SupplyGifting.tsx` implementada — 2 modelos: gifting puntual (desde 20 kits, S/ 150/kit) y beneficio mensual (S/ 55/colaborador/mes)
- ✅ **[Resuelto]** Evento `tw:gifting-cotizar` — CTA "Cotizar →" auto-selecciona "Empresa" en formulario
- ✅ **[Resuelto]** Formulario con tipo "Empresa" + campos condicionales: cantidad kits, tipo gifting (puntual/mensual)
- ✅ **[Resuelto]** Checkbox factura con RUC
- ✅ **[Resuelto]** Nav link "Empresas" → `#gifting-corporativo`
- No hay caso de éxito real de empresa que ya hizo gifting

**Veredicto: 8/10** — La empresa corporativa tiene flujo completo. Falta testimonial/caso de éxito real.

---

### ❌ Alineamiento Bajo — Persona B2B #4: "La Oficina / Coworking"

**Qué el landing hace bien:**
- Precio accesible por kg (S/ 48–63) — dentro de su rango si calcula bien
- MOQ de 1 saco es manejable para oficinas medianas
- Historia del caficultor encaja con "ficha en la cocina"

**Brechas identificadas:**
- El landing está en modo "café verde para tostadoras" — la oficina compra café tostado, no verde
- La terminología es demasiado técnica: FOB, Q Grader, "ready to roast", variedad/proceso — no habla el idioma de un office manager
- El proceso de 7–10 días describe transporte de finca a tostadora — no el journey de la oficina
- No hay mención de suscripción mensual sin fricción para oficinas
- No hay propuesta de "muestra gratis para la oficina" (250g) — su principal palanca de conversión
- El formulario está orientado a volumen en sacos, no en bolsas mensuales
- ✅ **[Parcial]** Tipo "Otro" en formulario muestra banner de redirección al B2C inline

**Veredicto: 3/10** — La oficina/coworking tiene banner de redirección pero no hay flujo de suscripción activo en el B2C todavía.

---

## Estrategia de Embudo de Ventas por Buyer Persona B2B

---

## EMBUDO B2B #1 — "La Cafetería Independiente"

> **Objetivo de conversión:** Muestra gratuita → primer pedido 1 saco → contrato mensual recurrente

### Etapa 1 — CONCIENCIA (TOFU)

**¿Dónde está?**
LinkedIn (grupos de emprendedores gastronómicos), Instagram de cafeterías de especialidad, eventos de café (SCA Perú, talleres de barismo), referidos de otros dueños de cafetería

**¿Qué lo mueve a descubrir Tunay Wasi Supply?**
- Post en Instagram: "¿Tu tostador te dice exactamente cuánto le pagó al caficultor? Nosotros sí."
- Presencia en feria/evento de café con lote físico para catar
- Recomendación de otro dueño de cafetería que ya compra

**Mensaje clave TOFU:**
> "Cada mes un lote con identidad propia. Tu pizarra cambia, tus clientes vuelven a ver qué hay nuevo."

**KPIs TOFU:**
- Visitas al landing B2B desde Instagram/LinkedIn
- Tráfico desde eventos presenciales (QR en feria)
- Solicitudes de muestra

---

### Etapa 2 — CONSIDERACIÓN (MOFU)

**¿Qué lo mueve a quedarse en el landing?**
- Ve la ficha técnica completa del lote (SCA, variedad, proceso, notas de cata)
- Puede pedir muestra 200g antes de comprometerse
- Ve el pasaporte de cata — entiende que tiene material para su carta
- El precio FOB le permite calcular su margen

**Brechas a resolver:**
1. Agregar sección de copy: "¿Lo que tu tostador te da hoy cumple el estándar SCA 84+? Compara." — activa la objeción principal
2. Agregar campo en formulario: "¿Qué tostador usas hoy?" — permite a Danny preparar comparativa
3. Agregar badge o copy: "Lote exclusivo — coordina antes de que otro lo reserve" — activa urgencia diferenciada
4. ✅ **[Resuelto]** Botón "Pedir muestra 200g gratis →" visible en cada card de lote
5. Agregar 1–2 testimoniales de cafeterías que ya compran (nombre, foto, quote)

**Mensaje clave MOFU:**
> "Este lote solo lo tienes tú en Lima. Coordina la muestra ahora — el flete va por nuestra cuenta."

**KPIs MOFU:**
- Solicitudes de muestra (200g)
- Formularios completados con campo "tostador actual"
- Click en "Reservar" de las cards de lote

---

### Etapa 3 — DECISIÓN (BOFU)

**¿Qué lo mueve a cerrar?**
- La muestra superó sus expectativas en cata
- El precio es competitivo vs. su tostador actual
- Tiene garantía de consistencia entre lotes
- El proceso es simple: pide, paga 50%, recibe, paga resto

**Táctica BOFU:**
- Llamada/WhatsApp de seguimiento 48h después de enviar muestra: "¿Cómo te fue con la cata?"
- Propuesta escrita en PDF: lote seleccionado + comparativa SCA vs. proveedor actual + precio + condiciones
- Oferta de primer pedido: "Primer saco sin anticipo — paga todo contra entrega"

**Mensaje clave BOFU:**
> "Primer pedido sin anticipo. Si no supera tu café actual, no lo volvemos a cobrar."

**KPIs BOFU:**
- Tasa de conversión muestra → primer pedido
- Tiempo promedio muestra → cierre (target: <2 semanas)
- % de solicitudes que se convierten en contrato mensual

---

### Etapa 4 — RETENCIÓN Y ASCENSO

**Objetivo:** Pedido único → contrato mensual 10–50 kg → proveedor principal

**Táctica post-primer pedido:**
- WhatsApp D+3 (después de entrega): "¿Cómo va el tueste? ¿Notas algún diferencial?"
- Email D+15: "El siguiente ciclo tiene [variedad nueva] de [región]. ¿Lo reservamos?"
- Email D+30: "Ya llevas [X] kg con nosotros. Clientes frecuentes tienen prioridad en lotes exclusivos."

**Modelo de ascenso:**
```
Muestra gratis → 1 saco (46 kg) → Contrato mensual 10–50 kg → Lote exclusivo con nombre de la cafetería
```

**KPIs de retención:**
- % de recompra en 60 días
- Kg promedio por pedido recurrente
- NPS del head barista

---

## EMBUDO B2B #2 — "El Hotel / Restaurante Gourmet"

> **Objetivo de conversión:** Cata de presentación en su local → contrato de exclusividad de lote

### Etapa 1 — CONCIENCIA (TOFU)

**¿Dónde está?**
LinkedIn (redes de chefs y gerentes de F&B), eventos gastronómicos, Mistura, Lima Food & Wine, contacto directo (cold outreach a hoteles 4–5 estrellas)

**¿Qué lo mueve a descubrir Tunay Wasi?**
- Cold email a gerentes de A&B: propuesta con lote exclusivo + credenciales SCA
- Presencia en eventos gastronómicos con material impreso premium
- Recomendación de chef que conoce a Danny

**Mensaje clave TOFU:**
> "El único hotel en Lima que sirve el lote exclusivo de [caficultor]. Sus huéspedes no toman café — toman una historia."

**KPIs TOFU:**
- Tasa de respuesta de cold outreach
- Asistencia a presentaciones de producto
- Contactos generados en eventos gastronómicos

---

### Etapa 2 — CONSIDERACIÓN (MOFU)

**¿Qué lo mueve a avanzar?**
- Propuesta con ficha del caficultor en formato de carta de menú
- La idea de lote exclusivo con nombre de su establecimiento
- Credenciales: Q Grader certificado, SCA 87+, trazabilidad completa

**Brechas a resolver:**
1. Agregar en el landing un CTA diferenciado: "¿Hotel o restaurante? Te presentamos el lote en tu local →"
2. Crear PDF de propuesta descargable para hoteles/restaurantes (diferente del formulario estándar)
3. ✅ **[Resuelto]** El formulario tiene "Tipo de negocio" (Cafetería / Hotel / Restaurante / Empresa / Distribuidor)
4. Mostrar un caso de éxito: "El restaurante X en Miraflores sirve nuestro Geisha TW-074 desde marzo 2026"
5. Mencionar en el landing: "Diseñamos el material de tu carta — con la historia del caficultor impresa"

**Mensaje clave MOFU:**
> "Reserva un lote exclusivo para tu menú. Te traemos el Q Grader a tu cocina para la cata de presentación."

**KPIs MOFU:**
- Solicitudes de "cata en local"
- Formularios con tipo "Hotel/Restaurante"
- Descargas de propuesta premium

---

### Etapa 3 — DECISIÓN (BOFU)

**¿Qué lo mueve a cerrar?**
- La cata en su local superó las expectativas del chef y el sommelier
- El material de carta está listo para usar
- El lote tiene nombre exclusivo para su establecimiento
- El precio es coherente con su tier de proveedor premium

**Táctica BOFU:**
- Cata presencial en su local: Danny + Q Grader van con el lote físico
- Entrega de muestra de material de carta (mockup impreso con su logo)
- Propuesta con cláusula de exclusividad: "Este lote no se vende a otro restaurante en Lima mientras tengas contrato"
- Opción de visita de huéspedes VIP a la finca como diferenciador

**Mensaje clave BOFU:**
> "Firmamos la exclusividad del lote esta semana. Tu equipo prueba el café. Tu carta tiene una historia nueva."

**KPIs BOFU:**
- Tasa de conversión cata → contrato
- Tiempo promedio contacto → cierre (target: <4 semanas)
- Ticket promedio del contrato inicial

---

### Etapa 4 — RETENCIÓN Y ASCENSO

**Objetivo:** Contrato de lote único → proveedor de café principal del establecimiento

**Táctica post-cierre:**
- Rotación trimestral de lote: "Llega el lote de temporada — ¿quieres catar antes de publicarlo en tu carta?"
- Programa "VIP a la finca": organizar visita anual del chef / sommelier al origen
- PR compartida: nota de prensa / post de Instagram del establecimiento con el caficultor

**Modelo de ascenso:**
```
Lote exclusivo (5–10 kg/mes) → Proveedor principal (10–20 kg/mes) → Co-branding y experiencias en finca
```

**KPIs de retención:**
- Duración promedio del contrato
- Mención de Tunay Wasi en la carta del establecimiento
- Recomendaciones a otros hoteles/restaurantes

---

## EMBUDO B2B #3 — "La Empresa Corporativa"

> **Objetivo de conversión:** Solicitud de cotización → cierre de pedido de gifting o suscripción corporativa

### Etapa 1 — CONCIENCIA (TOFU)

**¿Dónde está?**
LinkedIn (gerentes de RRHH y marketing), Google ("kit regalo corporativo Lima", "regalos empresariales Perú"), referidos de ejecutivos que ya compraron B2C

**¿Qué lo mueve a descubrir Tunay Wasi?**
- LinkedIn Ads segmentado a gerentes de RRHH en Lima: "El regalo corporativo que se recuerda"
- SEO para "kit regalo corporativo Lima" y "regalos navideños empresas Perú"
- El Consciente que ya compró B2C menciona Tunay Wasi en su empresa

**Mensaje clave TOFU:**
> "Este año, regala algo que se recuerda. El café y la historia de quien lo cultivó. Tu empresa apoyó a un productor peruano."

**KPIs TOFU:**
- Impresiones en LinkedIn Ads
- Tráfico orgánico por búsquedas de regalo corporativo
- Formularios de "Gifting corporativo"

---

### Etapa 2 — CONSIDERACIÓN (MOFU)

**El problema hoy:** La empresa corporativa no tiene un flujo claro en ninguno de los dos landings. El B2C no escala a corporativo. El B2B habla de café verde en sacos — no de kits de regalo para colaboradores.

**Solución requerida:**
- Sección "Gifting Corporativo" en el landing B2B (o un flujo dedicado)
- O un tercer landing intermedio: `tunaywasi.pe/empresas`

**Contenido mínimo necesario:**
- Dos modelos claramente diferenciados:
  - **Gifting puntual:** kits para navidad/fechas especiales (desde 20 kits)
  - **Beneficio mensual:** suscripción por colaborador (desde 10 colaboradores)
- Visualización del kit: caja, bolsa, carta del caficultor, branding de la empresa
- Caso de éxito: "La empresa X regaló 80 kits en Navidad 2025 — impacto en 3 caficultores"
- Campo en formulario: "Tipo de uso" (Gifting puntual / Beneficio mensual)
- Proceso simplificado: cotización → aprobación presupuestal → entrega → factura con RUC

**Brechas a resolver en el landing B2B actual:**
1. ✅ **[Resuelto]** Sección `SupplyGifting.tsx` con modelos puntual/mensual y CTA cotizar
2. ✅ **[Resuelto]** Tipo "Empresa" en formulario con campos condicionales (kits, tipo gifting)
3. ✅ **[Resuelto]** Checkbox facturación con RUC

**Mensaje clave MOFU:**
> "Impacto medible: tu empresa apoyó a X caficultores este año. Certificado de trazabilidad incluido."

**KPIs MOFU:**
- Solicitudes de cotización corporativa
- Formularios con "Gifting corporativo"
- Descargas de propuesta corporativa en PDF

---

### Etapa 3 — DECISIÓN (BOFU)

**¿Qué lo mueve a cerrar?**
- Propuesta escrita con precio por kit, impacto social cuantificado, proceso de facturación claro
- Muestra física del kit (crucial — el gerente de RRHH quiere verlo antes de aprobarlo)
- Precio competitivo vs. canasta navideña estándar de supermercado

**Táctica BOFU:**
- Enviar kit muestra físico (sin costo) a la oficina del decisor
- Propuesta PDF con: precio total, desglose por kit, impacto social, proceso de pago, factura con RUC
- Llamada de seguimiento 48h después del envío de propuesta
- Oferta: "Pedidos antes del [fecha] con 10% de descuento en packaging"

**Mensaje clave BOFU:**
> "Propuesta lista en 24h. Kit muestra a tu oficina sin costo. Factura con RUC incluida."

**KPIs BOFU:**
- Tasa de conversión solicitud → cierre
- Tiempo promedio solicitud → cierre (target: <2 semanas)
- Ticket promedio por empresa

---

### Etapa 4 — RETENCIÓN Y ASCENSO

**Objetivo:** Gifting puntual → beneficio mensual para colaboradores

**Táctica post-entrega:**
- Email D+7: "¿Cómo reaccionaron tus colaboradores? Cuéntanos + foto del unboxing"
- Email D+90 (pre-temporada siguiente): "Se acerca [fecha]. ¿Repetimos o ampliamos?"
- Propuesta proactiva de beneficio mensual: "Con S/ 55/colaborador/mes, tu equipo recibe un lote nuevo cada mes con historia diferente"

**Modelo de ascenso:**
```
20 kits navideños → 50 kits + suscripción mensual piloto → Beneficio mensual full para toda la empresa
```

**KPIs de retención:**
- % de recompra en siguiente temporada
- Conversión a beneficio mensual
- Ticket anual por empresa

---

## EMBUDO B2B #4 — "La Oficina / Coworking"

> **Objetivo de conversión:** Muestra gratuita → suscripción mensual de café tostado

### Problema estructural

Este buyer persona **no debe llegar al landing B2B actual** — el landing habla de café verde en sacos para tostadoras. La oficina/coworking compra café tostado, en bolsas de 250g–1kg, con entrega mensual sin fricción.

**La oficina/coworking debe ser atendida desde el landing B2C**, con un flujo específico de suscripción para oficinas, no desde el landing B2B de café verde.

**Solución a implementar:**
- En el landing B2C, agregar opción de "Suscripción para tu oficina" en la sección de preventa o en un bloque dedicado
- En el landing B2B, agregar un banner/nota: "¿Buscas café tostado para tu oficina? → [ir a tienda B2C]"
- Crear un flujo de suscripción en el B2C con pricing por volumen de bolsas mensuales

---

### Etapa 1 — CONCIENCIA (TOFU)

**¿Dónde está?**
LinkedIn (office managers, gerentes de startups), búsqueda Google ("café especialidad oficina Lima", "proveedor café mensual Lima")

**Mensaje clave TOFU:**
> "El café de la oficina es malo y todos lo saben. Cambialo por algo que cuente una historia."

---

### Etapa 2 — CONSIDERACIÓN (MOFU)

**¿Qué lo mueve a quedarse?**
- Precio razonable vs. café de supermercado (S/ 55–70/kg tostado)
- Proceso sin fricción: llega solo cada mes
- La ficha del caficultor que puede poner en la cocina

**Táctica clave:**
- Muestra gratuita de 250g para la oficina (enviada sin costo)
- "Tu equipo prueba y decide — si no les gusta, no pagás nada"

**KPIs MOFU:**
- Solicitudes de muestra para oficina
- Suscripciones de prueba activas

---

### Etapa 3 — DECISIÓN (BOFU)

**Táctica BOFU:**
- Email post-muestra: "¿Cómo les fue? Con 3 bolsas al mes, el envío es gratis"
- Precio de suscripción mensual publicado y simple (sin negociación)

**Modelo comercial propuesto:**
- Suscripción 2–4 bolsas 250g/mes: S/ 39–45/bolsa + envío
- Suscripción 1 kg/mes: S/ 150 + envío gratis
- Cancelable en cualquier momento

**Mensaje clave BOFU:**
> "Sin trámites. Sin pensar. Cada mes un caficultor diferente llega a tu cocina."

---

### Etapa 4 — RETENCIÓN Y ASCENSO

**Modelo de ascenso:**
```
2 bolsas/mes (oficina pequeña) → 4–6 bolsas/mes → Cata mensual en oficina como activación de equipo
```

**KPIs de retención:**
- Duración promedio de suscripción
- Churn mensual
- % que escala volumen en 6 meses

---

## Estado de implementación B2B — Resumen rápido

| Componente | Archivo | Estado |
|---|---|---|
| Campo "Tipo de negocio" | `SupplyForm.tsx` | ✅ Activo — 6 opciones |
| Botón "Pedir muestra 200g" | `SupplyLotes.tsx` | ✅ Activo |
| Badge stock limitado | `SupplyLotes.tsx` | ✅ Activo (≤4 sacos) |
| CTA diferenciado SCA ≥88 | `SupplyLotes.tsx` | ✅ Activo |
| Campos condicionales hotel | `SupplyForm.tsx` | ✅ Activo |
| Sección Gifting Corporativo | `SupplyGifting.tsx` | ✅ Activo — 2 modelos |
| Evento `tw:gifting-cotizar` | `SupplyGifting.tsx` / `SupplyForm.tsx` | ✅ Activo |
| Checkbox RUC | `SupplyForm.tsx` | ✅ Activo |
| Banner redirección oficina | `SupplyForm.tsx` (tipo "Otro") | ✅ Activo |
| Testimoniales cafeterías reales | — | ❌ Pendiente primer cliente real |
| Copy exclusividad de lote | `SupplyLotes.tsx` | ❌ Pendiente copy editorial |
| CTA "cata en tu local" para hotel | `SupplyLotes.tsx` / `SupplyHero.tsx` | ❌ Pendiente |
| PDF propuesta descargable | — | ❌ Fase 2 |

---

## Matriz de Prioridades — Acciones Inmediatas B2B

| Acción | Persona | Impacto | Estado |
|--------|---------|---------|--------|
| ~~Agregar botón "Pedir muestra 200g gratis →" en cards de lote~~ | Cafetería | 🔴 Alto | ✅ Implementado |
| ~~Agregar campo "Tipo de negocio" en formulario B2B~~ | Todos | 🔴 Alto | ✅ Implementado |
| ~~Crear flujo/sección de Gifting Corporativo~~ | Empresa | 🔴 Alto | ✅ Implementado |
| ~~Agregar opción de facturación con RUC en formulario~~ | Empresa | 🟡 Medio | ✅ Implementado |
| ~~Redirigir Oficina/Coworking al landing B2C~~ | Oficina | 🔴 Alto | ✅ Banner implementado |
| Agregar copy de exclusividad de lote en SupplyLotes | Cafetería / Hotel | 🔴 Alto | ❌ Pendiente |
| Agregar CTA "cata en tu local" para Hotel/Restaurante | Hotel | 🔴 Alto | ❌ Pendiente |
| Agregar 1–2 testimoniales de cafeterías reales | Cafetería | 🔴 Alto | ❌ Pendiente datos reales |
| Agregar caso de éxito de hotel/restaurante | Hotel | 🟡 Medio | ❌ Pendiente datos reales |
| Crear PDF de propuesta descargable por segmento | Hotel / Empresa | 🟡 Medio | ❌ Fase 2 |
| Agregar mención "lote exclusivo con nombre de tu negocio" | Hotel | 🟡 Medio | ❌ Pendiente copy |
| Suscripción café tostado para oficinas en B2C | Oficina | 🟡 Medio | ❌ Fase 2 |

---

## Métricas de Embudo Global B2B

### Benchmarks objetivo (Fase 1 — ago. 2026)

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| Tasa de conversión formulario → muestra enviada | — | 80% |
| Tasa de conversión muestra → primer pedido | — | 40% |
| Tiempo promedio solicitud → cierre | — | <2 semanas |
| Tasa de conversión pedido único → contrato mensual | — | 30% |
| Ticket promedio B2B (primer pedido) | — | S/ 1,500 |
| Ticket promedio B2B (mensual recurrente) | — | S/ 2,800 |
| NPS del cliente B2B (head barista / chef) | — | 9+ / 10 |

---

## Herramientas de Activación B2B por Etapa

| Etapa | Herramienta | Estado |
|-------|-------------|--------|
| TOFU | Instagram / LinkedIn orgánico | Por implementar |
| TOFU | Cold outreach a hoteles y cafeterías | Por implementar |
| TOFU | Presencia en ferias de café (SCA Perú) | Por planificar |
| MOFU | Landing B2B (Supply) | ✅ Activo — brechas de copy pendientes |
| MOFU | Muestra gratuita 200g | ✅ Formalizado en landing |
| MOFU | Gifting corporativo | ✅ Activo |
| BOFU | Propuesta PDF por segmento | Por crear |
| BOFU | WhatsApp seguimiento post-muestra | Por implementar |
| POST | Rotación trimestral de lote + upsell | Por implementar |

---

*Documento vivo — revisar mensualmente con datos reales de conversión.*
*Próxima revisión: agosto 2026 con métricas de los ciclos de mayo y junio.*
