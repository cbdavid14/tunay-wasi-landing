# Flujo Operativo End-to-End — Tunay Wasi

## Visión general

```
CAFICULTOR                    TUNAY WASI                    CONSUMIDOR
    │                              │                              │
    │── Registro en landing ──────>│                              │
    │                              │                              │
    │<─ Confirmación + kit de ─────│                              │
    │   instrucciones de muestra   │                              │
    │                              │                              │
    │── Envía muestra (300–500g) ─>│                              │
    │   a su costo                 │                              │
    │                              │── Q Grader cata ────────────>│
    │                              │<─ Puntaje SCA + reporte ─────│
    │                              │                              │
    │<─ Resultado + precio ────────│                              │
    │   ofrecido (S//kg verde)     │                              │
    │                              │                              │
    │── Acepta condiciones ───────>│                              │
    │                              │                              │
    │── Envía lote completo ──────>│ (nodo de recepción)          │
    │   a su costo                 │                              │
    │                              │── Análisis físico ──────────>│
    │                              │   (humedad + defectos)       │
    │                              │                              │
    │<─ Confirmación de precio ────│                              │
    │   final (con ajustes si      │                              │
    │   aplica)                    │                              │
    │                              │── Envío a tostador aliado    │
    │                              │                              │
    │                              │<─ Lote tostado + empacado    │
    │                              │                              │
    │                              │── Publica preventa ─────────>│
    │                              │   (nombre finca + historia)  │
    │                              │                              │
    │                              │<─ Clientes compran ──────────│
    │                              │                              │
    │                              │── Despacha a consumidores    │
    │                              │                              │
    │<─ PAGO al caficultor ────────│                              │
    │   (lote agotado en preventa) │                              │
```

---

## Fase 1 — Registro y pre-evaluación

### Paso 1: Registro del caficultor
- Canal: landing `/caficultores` → formulario de lista de espera
- Datos capturados: nombre, finca, región, kg/año, puntaje SCA estimado, email, WhatsApp
- Acción automática: email de bienvenida + instrucciones de muestra
- Responsable: sistema (automático)

### Paso 2: Envío de muestra de pre-cata
- Cantidad: 300–500g de café verde
- Costo del envío: **a cargo del caficultor**
- Destino: nodo de recepción Tunay Wasi (Lima o punto acordado)
- Plazo máximo para recibir: 15 días desde confirmación
- Si no llega en plazo: se reactiva al siguiente ciclo

---

## Fase 2 — Catación y oferta de precio

### Paso 3: Análisis físico de la muestra
- Responsable: Q Grader aliado o equipo interno
- Protocolo: SCA Green Coffee Classification
- Medir: humedad, defectos Cat.1 y Cat.2, color, tamaño
- Tiempo: máximo 5 días hábiles tras recepción
- Si no califica (< 82 pts o defectos Cat.1 > 0):
  → Comunicar al caficultor por WhatsApp/email
  → Devolver grano si lo solicita
  → Sin costo para el caficultor (primeros 15 en Fase 1)

### Paso 4: Catación sensorial
- Protocolo: SCA Cupping Protocol (5 tazas mínimo)
- Responsable: Q Grader certificado
- Resultado: puntaje SCA + notas de cata + tier asignado
- Entregable al caficultor: reporte de cata en PDF

### Paso 5: Oferta de precio al caficultor
- Precio según matriz de tiers vigente (ver `PRICING_RULES.md`)
- Comunicación: WhatsApp + email con resumen del reporte
- Plazo para aceptar: 7 días calendario
- Si no acepta: se archiva el lote, sin penalidad

---

## Fase 3 — Recepción del lote completo

### Paso 6: Coordinación de envío del lote
- El caficultor envía el lote a su costo al nodo de recepción
- Empaque mínimo: saco de yute + GrainPro (Tunay Wasi provee GrainPro si el caficultor no tiene)
- Documentación que debe acompañar el lote:
  - Nombre del caficultor y finca
  - Región, altitud, variedad, proceso
  - Fecha de cosecha y fecha de trilla
  - Peso neto en kg
- Lotes mínimos por tier:

| Tier | Lote mínimo | Lote máximo Fase 1 |
|------|------------|-------------------|
| Selecto (82–83 pts) | 12 kg | 25 kg |
| Especialidad Estándar (84–85 pts) | 12 kg | 50 kg |
| Especialidad Alta (86–87 pts) | 12 kg | 50 kg |
| Joya de Finca (88–89 pts) | 12 kg | 100 kg |
| Exclusivo / Geisha (90+ pts) | 12 kg | 100 kg |

### Paso 7: Análisis físico del lote completo
- Protocolo: igual que Paso 3 pero sobre muestra representativa del lote
- Si hay diferencia significativa con la muestra de pre-cata:
  → Se recalcula el precio
  → Se comunica al caficultor antes de proceder
  → El caficultor puede aceptar el nuevo precio o retirar el lote

---

## Fase 4 — Tueste y empaque

### Paso 8: Envío al tostador aliado
- Responsable: Tunay Wasi
- Protocolo de tueste: definido por tier (Light a Medium-Light)
- Rendimiento estimado tueste: 83% (ej: 12 kg verde → ~9.96 kg tostado)
- Empaque: bolsa 250g con válvula unidireccional + etiqueta con nombre de finca y historia
- Tiempo estimado: 5–7 días hábiles

### Paso 9: Control de calidad post-tueste
- Verificación visual de empaque
- Shot de espresso o V60 de control
- Aprobación antes de publicar en preventa

---

## Fase 5 — Preventa y despacho

### Paso 10: Publicación en preventa
- Canal: landing B2C + redes sociales
- Contenido: nombre del caficultor, finca, región, puntaje SCA, notas de cata, historia
- Plazo de preventa: **máximo 60 días**
- Si no se vende en 60 días:
  → Tunay Wasi redirige a canal alternativo (mayorista, tostador, cafetería aliada)
  → El precio al caficultor se mantiene igual

### Paso 11: Despacho al consumidor
- Courier: aliado nacional (pendiente de cerrar)
- Tiempo de entrega: 2–5 días hábiles según región
- Costo de envío: asumido por el consumidor o incluido en precio según promoción

---

## Fase 6 — Pago al caficultor

### Paso 12: Liquidación
- Condición de pago: **cuando el lote se agota en preventa o canal alternativo**
- Método: transferencia bancaria o Yape
- Plazo de transferencia: **máximo 48 horas** tras confirmar lote agotado
- Comprobante: voucher de transferencia + resumen de ventas del lote

### Tabla de liquidación por tier (ejemplo lote 12 kg):

| Tier | Precio/kg verde | Pago caficultor (12 kg) |
|------|----------------|------------------------|
| Selecto 82–83 pts | S/ 34.65 | S/ 415.80 |
| Esp. Estándar 84–85 pts | S/ 38.44 | S/ 461.28 |
| Esp. Alta 86–87 pts | S/ 55.48 | S/ 665.76 |
| Joya de Finca 88–89 pts | S/ 66.84 | S/ 802.08 |
| Exclusivo / Geisha 90+ pts | S/ 85.78 | S/ 1,029.36 |

---

## Tiempos estimados del proceso completo

```
Registro → Muestra recibida:        1–15 días
Muestra recibida → Resultado cata:  5 días hábiles
Resultado → Lote completo recibido: 7–21 días
Lote recibido → Publicación:        7–10 días hábiles
Publicación → Lote agotado:         7–60 días
Lote agotado → Pago caficultor:     máx. 48 horas

TOTAL estimado proceso completo:    30–110 días
```

---

## Casos especiales

### Lote con defectos descubiertos al recepcionar
1. Tunay Wasi comunica por escrito el resultado del análisis físico
2. Se presenta el precio ajustado con detalle del descuento
3. El caficultor tiene 5 días para aceptar o retirar el lote
4. Si acepta: se procede con el precio ajustado
5. Si retira: Tunay Wasi devuelve el lote, el caficultor cubre el flete de devolución

### Lote que no alcanza el mínimo de calidad (< 82 pts)
1. Se notifica al caficultor con el reporte completo de cata
2. Se ofrece orientación sobre qué mejorar para el siguiente ciclo
3. En Fase 1: sin costo de cata para los primeros 15 caficultores

### Fuerza mayor (desastre natural, pérdida en tránsito)
- Pérdida en tránsito hacia nodo de recepción: responsabilidad del caficultor (seguro opcional)
- Pérdida post-recepción: responsabilidad de Tunay Wasi
