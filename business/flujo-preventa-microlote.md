# Flujo de Preventa de Microlote — Tunay Wasi
> Creado: mayo 2026
> Alineado con: `estrategia-embudo-ventas.md` · `flujos-buyer-personas-b2c.md` · `flujos-buyer-personas-b2b.md`
> Propósito: definir la secuencia operativa completa desde que un microlote entra al sistema hasta que se agota — y qué le comunicamos al caficultor en cada etapa.

---

## Principio rector

**B2C primero. B2B como red de seguridad.**

Un microlote de 12–15 kg se intenta agotar en bolsas de 250g al consumidor final (B2C) antes de ofrecer el remanente a cafeterías o tostadoras (B2B). Esto maximiza el ingreso total del lote, protege la exclusividad del producto B2B, y construye prueba social que acelera las ventas futuras.

> El caficultor debe entender desde el inicio que su lote tiene dos destinos posibles según la demanda — y que en ambos casos recibe su pago en máximo 48h tras conformidad en Lima.

---

## Cómo funciona la preventa (lo que ve el cliente)

```
01 — RESERVAS
Eliges tu finca, peso y método. Pagas para asegurar tu lote.

02 — CERRAMOS
Sumamos los pedidos del ciclo y avisamos al productor del volumen exacto.

03 — TOSTAMOS
Tueste un día antes del envío — café ultra fresco, lote único.

04 — A TU PUERTA
Entrega en Lima en 24h · Provincia 2–4 días hábiles.
```

Lo que el cliente ve es simple. Lo que ocurre detrás tiene una secuencia definida.

---

## Fases del ciclo de un microlote

### FASE 0 — Ingreso del lote (antes de publicar)

**Quién actúa:** Danny + caficultor

| Paso | Acción | Detalle |
|---|---|---|
| 0.1 | Recepción del lote en Lima | Verificar peso real, humedad, defectos físicos |
| 0.2 | Cata de validación | Lab propio (S/ 35) · Regional (S/ 50) · Q-Grader Lima (S/ 100) según tier SCA esperado |
| 0.3 | Asignación de tier SCA | Confirmar puntaje → determina precio B2C y pago al caficultor |
| 0.4 | Fotografía y ficha del lote | Foto del caficultor, finca, notas de cata, Q Grader firmante |
| 0.5 | Carga en Firestore | Activar producto en landing B2C con `stockKg`, `stockReservedKg = 0`, fecha de ciclo |
| 0.6 | Comunicar al caficultor | Confirmar puntaje SCA, precio/kg que recibirá, fecha estimada de liquidación |

---

### FASE 1 — Preventa B2C (días 1–15)

**Quién actúa:** Landing B2C + Meta Ads + Danny (WhatsApp)
**Objetivo:** Agotar el 100% del lote en bolsas de 250g al consumidor final

#### Lo que ocurre en el sistema

```
Lote publicado en landing B2C
        │
        ├── Meta Ads activos → leads a lista prioritaria
        │
        ├── Email/WhatsApp a lista de leads → link de compra directo
        │
        └── Countdown activo en sección Preventa → urgencia real
```

#### Buyer personas activos en esta fase
- **El Consciente** → historia del caficultor, modelo 50/50, impacto directo
- **El Barista Amateur** → SCA, variedad, proceso, Q Grader, receta por método
- **El Gifter** → KitBuilder, packaging, entrega garantizada 48h Lima

#### Regla de cierre B2C
El ciclo B2C se cierra en el **día 15** o cuando se agota el stock, lo que ocurra primero.

| Escenario | Condición | Acción |
|---|---|---|
| ✅ Lote agotado | Stock = 0 antes del día 15 | Cerrar ciclo · Proceder a tueste · Notificar al caficultor volumen confirmado |
| ⚠️ Stock parcial | Quedan bolsas al día 15 | Evaluar stock remanente → activar Fase 2 (B2B rescate) |
| ❌ Baja demanda | Menos del 30% vendido al día 10 | Escalar acciones: WhatsApp directo a leads + descuento por volumen (Flight) |

#### Comunicación al caficultor en esta fase
> "Tu lote está en preventa. En los próximos 15 días confirmamos el volumen final. Te liquidamos en máximo 48h tras el cierre del ciclo."

---

### FASE 2 — B2B Rescate del remanente (días 16–25)

**Solo se activa si queda stock al cierre del día 15.**
**Quién actúa:** Danny (outreach directo a cafeterías en Lima)

#### Condición de activación

```
Día 15: stock_restante > 0
        │
        └── ¿Cuánto queda?
              ├── ≥ 12 kg → ofrecer como microlote completo B2B (12 kg o 15 kg)
              └── < 12 kg → mantener en B2C con descuento de últimas unidades
```

#### Lo que Danny hace en esta fase

| Paso | Acción | Mensaje clave |
|---|---|---|
| 2.1 | Identificar 3–5 cafeterías target en Lima | Priorizar las que ya pidieron muestra 200g |
| 2.2 | Contacto directo por WhatsApp/llamada | "Tenemos el remanente del lote [nombre finca] — [X] kg disponibles, este ciclo no se repite" |
| 2.3 | Enviar muestra 200g si no cató antes | Flete por TunayWasi, respuesta en 48h |
| 2.4 | Cotizar según tabla §9.1 de PRICING_RULES 2.0 | Precio = paridad mercado local · formato 12 kg o 15 kg |
| 2.5 | Cierre y coordinación de entrega | Coordinar flete a la cafetería |

#### Por qué B2B después de B2C (no en paralelo)

1. **Exclusividad preservada** — la cafetería puede decir "este lote solo lo sirvo yo en Lima". Si el lote ya está a la venta pública cuando se lo ofrecemos, ese argumento no existe.
2. **Prueba social activada** — llegar con "ya vendimos 30 bolsas de este lote en preventa" acelera la decisión de la cafetería.
3. **Precio diferenciado válido** — el B2B tiene precio/kg distinto al B2C (ver `PRICING_RULES 2.0 §9.1`). No se pueden sostener ambos simultáneamente sin confusión de precios.

#### Pago al caficultor en este canal
El pago al caficultor en el canal B2B grano verde usa la tabla §9.1 — es menor que el canal B2C porque el precio de venta es de paridad con el mercado local, no con margen premium de bolsa. El caficultor debe conocer esto desde el inicio del ciclo.

> "Si parte del lote se vende a una cafetería en grano verde, el pago/kg será diferente al de las bolsas B2C. Te explicamos el detalle en la hoja de liquidación."

---

### FASE 3 — Lote completo a tostadora (día 25+, solo si persiste stock)

**Último recurso si Fase 2 no agotó el remanente.**

| Paso | Acción |
|---|---|
| 3.1 | Contactar 1–2 tostadoras en Lima con propuesta de lote completo |
| 3.2 | Precio con descuento de cierre (negociable, mantener margen mínimo TW) |
| 3.3 | Coordinar entrega del lote completo en saco corrugado |
| 3.4 | Liquidar al caficultor con desglose detallado por canal |

---

### FASE 4 — Tueste y despacho (post-cierre de ciclo)

**Aplica al volumen B2C confirmado.**
**Quién actúa:** Laboratorio TunayWasi

| Paso | Acción | Timing |
|---|---|---|
| 4.1 | Confirmar volumen total B2C | Mismo día del cierre |
| 4.2 | Tueste bajo pedido | 1 día antes del despacho |
| 4.3 | Envasado y etiquetado | Mismo día del tueste |
| 4.4 | Despacho | Lima 24h · Provincia 2–4 días hábiles |
| 4.5 | Notificación al cliente | Email/WhatsApp con tracking |

---

### FASE 5 — Liquidación al caficultor

**Timing máximo: 48h tras conformidad del lote en Lima.**

El caficultor recibe una hoja de liquidación con:

| Ítem | Detalle |
|---|---|
| Kg vendidos canal B2C | Volumen × precio/kg tier SCA (tabla §5 PRICING_RULES) |
| Kg vendidos canal B2B | Volumen × precio/kg tabla §9.1 (si aplica) |
| Deducción cata | S/ 35 / S/ 50 / S/ 100 según nivel |
| Deducción flete origen→Lima | S/ 35 |
| **Pago neto total** | Suma de ambos canales menos deducciones |

---

## Vista de línea de tiempo por ciclo

```
DÍA 0    → Lote ingresa, cata, se publica en B2C
DÍA 1    → Meta Ads activos + email a lista de leads
DÍA 1-15 → Preventa B2C abierta — countdown activo
DÍA 10   → Evaluación: ¿menos del 30% vendido? → escalar acciones
DÍA 15   → Cierre B2C
             ├── Stock = 0 → pasar a Fase 4 (tueste)
             └── Stock > 0 → activar Fase 2 (B2B rescate)
DÍA 16-25 → Danny contacta cafeterías con el remanente
DÍA 25+   → Si persiste stock → lote completo a tostadora (Fase 3)
DÍA X    → Tueste 1 día antes del despacho
DÍA X+1  → Despacho B2C
DÍA X+2  → Liquidación al caficultor (máximo 48h post-conformidad)
```

---

## Lo que le decimos al caficultor desde el inicio

Al incorporar un caficultor al sistema, TunayWasi le explica el modelo completo:

1. **Su lote tiene dos posibles destinos** — bolsas al consumidor (B2C) o grano verde a una cafetería (B2B). En ambos casos se le paga.
2. **El pago B2C es mayor por kg** — porque el precio final al consumidor incluye tueste, packaging y margen de bolsa. El caficultor recibe entre 38% y 50% del precio final.
3. **El pago B2B grano verde es distinto** — el precio de venta es paridad con el mercado local. El caficultor recibe su parte según la tabla acordada.
4. **Siempre cobra en 48h** — independientemente del canal de venta y sin esperar a que se agote el lote.
5. **Nunca pierde su lote sin cobrar** — si la demanda es baja, TunayWasi absorbe el costo de la cata y el flete, y busca salida por B2B antes de devolver o descartar el lote.

---

## Relación con documentos existentes

| Documento | Relación |
|---|---|
| `estrategia-embudo-ventas.md` | Define los embudos B2C y B2B por buyer persona — este documento los orquesta en secuencia temporal |
| `flujos-buyer-personas-b2c.md` | Detalla el recorrido de El Consciente, Barista y Gifter — activos en Fase 1 |
| `flujos-buyer-personas-b2b.md` | Detalla el recorrido de Cafetería, Hotel y Empresa — activos en Fase 2 y 3 |
| `PRICING_RULES 2.0.md §5` | Tabla de pago al caficultor por tier SCA — aplica en canal B2C (Fase 1) |
| `PRICING_RULES 2.0.md §9.1` | Tabla de precio FOB y pago al caficultor en canal B2B grano verde — aplica en Fases 2 y 3 |
| `wiki/pricing_b2b.md` | Referencia rápida de precios B2B con benchmark de mercado local |

---

*Documento vivo · Revisar tras el primer ciclo completo (junio 2026) con datos reales de conversión por fase.*
