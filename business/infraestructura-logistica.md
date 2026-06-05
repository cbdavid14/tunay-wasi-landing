# Infraestructura Logística — Tunay Wasi

## 1. Diagrama de flujo físico

```
[FINCA]                [TRÁNSITO]           [NODO LIMA]          [TOSTADOR]         [CONSUMIDOR]
   │                       │                     │                    │                    │
   │ 300–500g muestra       │                     │                    │                    │
   │──── Courier ──────────>│──────────────────── >│                    │                    │
   │     (a costo           │                     │                    │                    │
   │      caficultor)       │                     │ Análisis físico    │                    │
   │                        │                     │ + Catación Q Grader│                    │
   │                        │                     │                    │                    │
   │<─── Resultado + precio ofrecido ─────────────│                    │                    │
   │                        │                     │                    │                    │
   │ Lote completo           │                     │                    │                    │
   │ (GrainPro + yute)      │                     │                    │                    │
   │──── Courier ──────────>│──────────────────── >│                    │                    │
   │     (a costo           │                     │                    │                    │
   │      caficultor)       │                     │ Análisis físico    │                    │
   │                        │                     │ lote completo      │                    │
   │                        │                     │                    │                    │
   │                        │                     │──── Envío verde ──>│                    │
   │                        │                     │                    │ Tueste por perfil  │
   │                        │                     │                    │ tier               │
   │                        │                     │<── Lote tostado ───│                    │
   │                        │                     │    + curva tueste  │                    │
   │                        │                     │                    │                    │
   │                        │                     │ Empaque 250g       │                    │
   │                        │                     │ + etiqueta finca   │                    │
   │                        │                     │                    │                    │
   │                        │                     │──── Courier ───────────────────────────>│
   │                        │                     │     nacional       │                    │
   │                        │                     │                    │                    │
   │<─── PAGO ──────────────│─────────────────────│                    │                    │
        (lote agotado)
```

---

## 2. Nodo de Recepción — Requisitos

### 2.1 Fase 1 (hasta ~500 kg simultáneos)

**Opción A — Co-almacén con tostador (recomendada Fase 1):**
- Ventaja: reduce costo fijo, el tostador ya tiene condiciones adecuadas
- Riesgo: dependencia de un solo aliado para dos funciones críticas
- Costo: negociar con el tostador (pago por lote almacenado o tarifa fija mensual)

**Opción B — Almacén propio Lima:**
- Ventaja: control total, independencia de proveedores
- Costo estimado: S/ 500–1,500/mes (minialmacén en zona industrial Lima)
- Zonas recomendadas: Ate, San Juan de Lurigancho, Villa El Salvador

**Opción C — Operador 3PL:**
- Empresas como Ransa, Neptunia, o small-3PL para pequeños volúmenes
- Ventaja: profesional desde el inicio
- Costo: variable según volumen

### 2.2 Equipamiento mínimo del nodo

| Equipo | Uso | Costo estimado |
|--------|-----|----------------|
| Higrómetro digital | Medir humedad del grano | S/ 150–300 |
| Balanza (hasta 50 kg) | Pesar lotes | S/ 200–400 |
| Pallets de madera | Elevar sacos del suelo | S/ 20–50 c/u |
| Termohigrómetro ambiental | Controlar HR y temperatura del almacén | S/ 80–150 |
| Bolsas GrainPro 10/25/50 kg | Almacenamiento hermético | S/ 8–25 c/u |
| Etiquetas autoadhesivas | Identificación de lotes | S/ 30–50 (pack) |
| Laptop/tablet | Registro en sistema | Existente |

**Total inversión inicial estimada:** S/ 800–1,500

---

## 3. Flujo de Documentación por Lote

Cada lote tiene un expediente que se completa en etapas:

```
Expediente del Lote [ID único]
│
├── Registro inicial (formulario landing)
│   ├── Datos del caficultor
│   ├── Datos de la finca
│   └── Puntaje SCA estimado
│
├── Muestra de pre-cata
│   ├── Fecha de recepción
│   ├── Peso de la muestra
│   ├── Reporte de análisis físico
│   └── Hoja de catación SCA (firmada por Q Grader)
│
├── Aceptación del caficultor
│   └── Confirmación escrita (WhatsApp/email válido)
│
├── Lote completo
│   ├── Fecha de recepción
│   ├── Peso en verde (kg)
│   ├── Guía de remisión / comprobante de envío
│   └── Reporte de análisis físico del lote
│
├── Tueste
│   ├── Fecha de tueste
│   ├── Nombre del tostador
│   ├── Curva de tueste (imagen Cropster/Artisan)
│   ├── Peso verde entregado vs. tostado recibido
│   └── Notas de control de calidad
│
├── Publicación
│   ├── Fecha de publicación en preventa
│   ├── Precio al consumidor
│   ├── Fotografías del lote
│   └── URL de la ficha del producto
│
└── Liquidación
    ├── Fecha de agotamiento
    ├── Unidades vendidas
    ├── Monto total recaudado
    ├── Monto pagado al caficultor
    └── Comprobante de transferencia
```

---

## 4. Zonas geográficas de operación — Fase 1

### Cobertura de recepción de lotes (finca → Lima)

| Región | Conectividad | Courier disponible | Tiempo tránsito |
|--------|-------------|-------------------|-----------------|
| Cajamarca (Jaén, San Ignacio) | Buena (carretera asfaltada) | Olva, Shalom | 2–3 días |
| Cajamarca (zonas remotas) | Media (trocha) | Bus + encomienda | 3–5 días |
| San Martín | Buena | Olva, Shalom, GJ | 2–3 días |
| Junín (Satipo, Chanchamayo) | Buena | Olva, Shalom | 1–2 días |
| Cusco (La Convención) | Media | Bus + encomienda | 3–5 días |
| Amazonas | Media-baja | Shalom, bus | 3–5 días |
| Puno (Sandia) | Baja (remota) | Bus + encomienda | 5–7 días |

> **Fase 1:** Priorizar Cajamarca, San Martín y Junín por conectividad y volumen de caficultores.

### Cobertura de despacho (Lima → consumidor)

| Zona | Courier | Tiempo | Costo estimado |
|------|---------|--------|----------------|
| Lima Metropolitana | Urbano / Rappi / Olva | 1–2 días | S/ 8–15 |
| Lima Provincias | Olva / Shalom | 2–3 días | S/ 12–18 |
| Provincias principales (Arequipa, Trujillo, Cusco) | Olva / Shalom | 3–4 días | S/ 15–22 |
| Provincias remotas | Shalom / bus | 4–7 días | S/ 18–28 |

---

## 5. Gestión de riesgos logísticos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Lote dañado en tránsito (verde) | Media | Alto | GrainPro + instrucciones de empaque al caficultor |
| Humedad alta al llegar | Media | Alto | Análisis físico obligatorio al recepcionar |
| Retraso en cosecha / envío | Alta | Medio | Plazo flexible + ciclo mensual de lotes |
| Courier pierde el paquete | Baja | Alto | Seguro de envío para lotes > S/ 500 |
| Lote no se vende en 60 días | Media | Medio | Canal alternativo pre-identificado |
| Tostador no disponible | Baja | Alto | Tener 2 tostadores aliados desde Fase 2 |

---

## 6. KPIs operativos — Fase 1

| Métrica | Objetivo Fase 1 | Medición |
|---------|----------------|----------|
| Tiempo muestra → resultado cata | ≤ 5 días hábiles | Registro en sistema |
| Tiempo lote recibido → publicación | ≤ 10 días hábiles | Registro en sistema |
| % lotes que califican (≥ 82 pts) | > 60% | Base de datos |
| % lotes agotados en preventa (60 días) | > 70% | Firestore |
| Tiempo lote agotado → pago caficultor | ≤ 48 horas | Registro de transferencias |
| Defectos reclamados por consumidores | 0 | Soporte / reseñas |
