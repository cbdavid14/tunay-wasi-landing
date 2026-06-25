# Tunay Wasi — Problema y Solución
> Versión: junio 2026 (rev. 4 — modelo simplificado: caficultor publica → lab certifica → cafetería compra)

---

## El problema

El mercado peruano de café de especialidad existe, pero nadie puede verlo.

- **El caficultor** produce café de calidad en Cajamarca, Junín o Cusco. No tiene forma de demostrar que su lote vale más que el café commodity. No tiene acceso directo a tostadores ni cafeterías. Cobra tarde, cobra mal, y no sabe por qué.

- **La cafetería** necesita café con trazabilidad y puntaje SCA para armar su carta y diferenciarse. Hoy coordina origen, muestra, catación, compra y despacho en 4 conversaciones de WhatsApp con 4 actores distintos. No tiene ninguna garantía de calidad independiente.

- **El intermediario** captura entre 30% y 40% del margen sin agregar transparencia ni trazabilidad al proceso.

**El resultado:** microlotes de calidad no llegan al mercado. Cafeterías no pueden sustentar el origen del café que sirven. Caficultores no tienen incentivo para mejorar su proceso.

---

## La solución

**Tunay Wasi es una plataforma B2B que conecta directamente caficultores, laboratorios de catación y cafeterías de especialidad.**

No compramos café. No tostamos. No empacamos. Gestionamos la transacción y nos quedamos una comisión del 10%.

### Flujo central (3 pasos)

```
1. Caficultor publica su lote
        ↓
2. Sistema asigna un laboratorio certificado (modelo tipo Uber)
   Lab acepta → caficultor envía muestra → lab cata → puntaje SCA publicado
        ↓
3. Cafetería ve el catálogo → solicita muestra (opcional) → compra sacos → recibe
```

### Qué hace la plataforma

| Problema | Cómo lo resolvemos |
|---|---|
| Caficultor no puede demostrar que su café vale más | Publica su lote. El sistema asigna un Q-Grader que certifica el puntaje SCA oficial |
| Sin validación independiente de calidad | El lab es asignado por el sistema — ni el caficultor ni la cafetería lo eligen. Elimina conflicto de interés |
| Pipeline fragmentado en WhatsApp | Todo el flujo en una sola plataforma: publicar → certificar → comprar → despacho → pago |
| Cafetería no sabe si el lote vale la pena | Cada lote tiene puntaje SCA oficial. La cafetería también puede solicitar una muestra de 200g antes de comprar |
| Microlotes no llegan al mercado | Compra desde 1 saco (60 kg) con IGV y factura electrónica |
| Caficultor cobra tarde y sin trazabilidad | Admin distribuye el pago al caficultor dentro de 48h hábiles de confirmado el envío |

---

## Principio fundamental

**El sistema asigna el laboratorio — no el caficultor ni la cafetería.**

Esto elimina el conflicto de interés: nadie puede contactar al lab para influir en el puntaje. El lab responde a Tunay Wasi, no al comprador ni al vendedor.

El precio lo fija el caficultor. El puntaje SCA es información — no afecta el precio automáticamente.

**El sistema es casi 100% automatizado.** Todas las transiciones de estado, notificaciones, cálculos de precio y liberación de reservas ocurren sin intervención humana. El admin solo interviene en excepciones: timeout de asignación de lab, verificación de pagos manuales y despacho de muestras desde el hub.

---

## Los actores

### Actor 1 — Caficultor
- Registra su lote (variedad, proceso, altitud, cosecha, sacos disponibles, precio por saco)
- Publica → el sistema calcula el precio de venta y lanza la solicitud de certificación automáticamente
- Envía la muestra física al lab cuando este acepta (ingresa courier + número de guía en su portal)
- Ve en su portal: estado de certificación, pedidos por despachar, historial de pagos

### Actor 2 — Cafetería de especialidad
- Navega el catálogo de lotes (con o sin puntaje SCA)
- Puede solicitar muestra de 200g de cualquier lote antes de decidir (opcional, no bloquea la compra)
- Compra sacos directamente — si el lote no tiene puntaje SCA, asume el riesgo de calidad
- Ve en su portal: mis muestras, mis pedidos

### Actor 3 — Laboratorio certificado (Q-Grader)
- Recibe notificación cuando hay un lote disponible para certificar (modelo tipo Uber)
- Acepta o ignora la solicitud — si acepta, el lote le queda asignado
- Confirma recepción de la muestra física enviada por el caficultor
- Registra el puntaje SCA desde su portal → el lote se publica automáticamente
- Cobra su fee una vez completada la catación
- El fee lo fija el propio laboratorio en su perfil

### Actor 4 — Admin Tunay Wasi
- Visualiza el flujo completo
- Interviene si ningún lab acepta en 24h (asignación manual)
- Verifica pagos manuales (transferencia BCP), gestiona logística, distribuye pagos
- Despacha muestras de 200g desde el hub de Lima

---

## Modelo de ingresos

### Base: comisión por transacción

**10% sobre el precio de origen que fija el caficultor, por cada pedido confirmado.**

```
Precio final que paga la cafetería
    │
    ├── Caficultor  → precio base íntegro (lo fijó él)
    ├── Laboratorio → fee de catación (si el lote fue certificado)
    └── Tunay Wasi  → 10% sobre el precio de origen + IGV + flete
```

### Ejemplo de desglose (1 saco, 60 kg)

```
Precio origen del caficultor:         S/  850
Fee catación laboratorio:             S/   90
                                      ────────
Subtotal:                             S/  940
Comisión Tunay Wasi (10%):            S/   90
Flete origen → cafetería:             S/   25
IGV (18%):                            S/  175
────────────────────────────────────────────
Precio final al comprador:            S/ 1,230
```

El caficultor recibe S/ 850. El laboratorio recibe S/ 90. Tunay Wasi retiene S/ 90 + flete + IGV.

---

## Lo que valida el MVP

1. ¿El caficultor puede publicar un lote sin fricción?
2. ¿El sistema notifica a los labs disponibles y uno acepta?
3. ¿El caficultor puede enviar la muestra y el lab confirmar recepción?
4. ¿El lab puede registrar el puntaje SCA y el lote queda publicado automáticamente?
5. ¿La cafetería encuentra el lote y compra sacos directamente?
6. ¿El pago llega al caficultor y al laboratorio correctamente?

Si las 6 respuestas son sí → el modelo funciona. Escalar.
