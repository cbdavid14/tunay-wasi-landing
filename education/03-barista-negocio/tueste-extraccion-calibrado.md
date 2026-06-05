# 03 — Barista y Negocio: Tueste, Calibrado y Software

## 1. El Tueste (Roasting)

### 1.1 Fundamentos del tueste

El tueste es una reacción química compleja donde el calor transforma el grano verde en el café que conocemos. Los principales procesos:

**Reacción de Maillard:**
```
Azúcares reductores + aminoácidos → compuestos de sabor (caramelo, chocolate, tostado)
Temperatura: 150–200°C
Resultado: desarrollo de color (pardeamiento) y aromas complejos
```

**Caramelización:**
```
Azúcares → caramelo → furfural
Temperatura: > 170°C
Resultado: notas dulces, caramelo, nuez
```

**Primera crack (1C):**
```
Temperatura: ~196–204°C (varía por densidad del grano)
Sonido: pop-pop-pop (como palomitas de maíz)
El vapor interno rompe la estructura celular
→ El café se puede servir desde aquí (tueste claro)
```

**Segunda crack (2C):**
```
Temperatura: ~224–230°C
Sonido: crack más fino y rápido
Aceites empiezan a salir a la superficie
→ Tueste oscuro comienza aquí
→ Pierde acidez, gana amargor
```

### 1.2 Perfiles de tueste para café de especialidad

| Perfil | Color | Temp. salida | 1C–fin | Desarrollo | Características |
|--------|-------|-------------|--------|------------|-----------------|
| **Light / Claro** | Marrón claro | 196–205°C | 3–5 min post-1C | 18–22% | Acidez alta, floral, frutado, terroir expresado |
| **Medium-Light** | Marrón medio claro | 205–210°C | 4–6 min post-1C | 20–24% | Balance, dulzura, acidez brillante |
| **Medium** | Marrón medio | 210–220°C | 5–7 min post-1C | 22–26% | Cuerpo, caramelo, chocolate, balance |
| **Medium-Dark** | Marrón oscuro | 220–230°C | Inicio 2C | 24–28% | Cuerpo alto, chocolate amargo, menos acidez |
| **Dark** | Marrón muy oscuro | 230–240°C | Post-2C | >28% | Amargo, aceite superficial, pierde origen |

> **Para café de especialidad peruano (82–90+ pts):** Siempre Light a Medium-Light. El tueste oscuro destruye los atributos de origen que hacen valioso al café.

### 1.3 Curva de tueste

La curva de tueste es el perfil de temperatura en el tiempo. Los parámetros clave:

```
Charge Temperature (carga): temperatura del tambor al cargar el café
   → Tostadora 1kg: ~180–200°C
   → Tostadora 5kg: ~200–220°C

Turning Point (TP): momento en que el grano pasa de absorber a emitir calor
   → Temperatura: ~80–100°C
   → Tiempo: 1–2 min después de carga

Rate of Rise (RoR): velocidad de aumento de temperatura (°C/min)
   → Ideal: curva descendente y suave (14°C/min → 10°C/min → 7°C/min)
   → RoR muy alto = tueste apresurado, falta desarrollo
   → RoR negativo = "stall", quemado interior

Maillard phase: entre ~150°C y 1C
   → La fase más crítica para desarrollar sabor
   → Duración ideal: 3–5 min

Development Time Ratio (DTR): tiempo post-1C / tiempo total de tueste
   → Rango ideal especialidad: 20–25%
   → Muy bajo = subdesarrollado (astringente, verde)
   → Muy alto = sobredesarrollado (horneado, plano)
```

### 1.4 Software de tueste

**Cropster** (estándar de la industria):
- Registro automático de curvas de tueste
- Comparación de perfiles históricos
- Control de lotes y trazabilidad
- Precio: ~US$100/mes
- Compatible con: mayoría de tostadoras modernas con sonda de temperatura

**Artisan** (open source):
- Gratuito y de código abierto
- Conexión con sondas via USB/Bluetooth
- Funciones básicas de logging y análisis
- Ideal para: micro-tostadores con presupuesto limitado
- Descarga: artisan-scope.org

**Ikawa Pro** (tostadora + software):
- Tostadora de muestra 50–100g con control total por app
- Ideal para: catar y desarrollar perfiles antes de escalar
- Permite compartir perfiles entre tostadores

---

## 2. El Barista — Variables de Extracción

### 2.1 La ecuación de extracción perfecta

```
Extracción ideal: 18–22% de los sólidos solubles del café
TDS (Total Dissolved Solids) ideal: 1.15–1.45%
→ Medido con refractómetro (VST, Atago)

Subextracción (< 18%): agrio, salado, vacío, corto
Sobreextracción (> 22%): amargo, seco, astringente
```

**Triángulo de control del barista:**
```
DOSIS ←→ MOLIENDA ←→ TIEMPO
    ↘         ↓        ↙
         EXTRACCIÓN
```

### 2.2 Espresso — Parámetros estándar

| Parámetro | Rango estándar | Especialidad claro |
|-----------|---------------|-------------------|
| Dosis | 18–22g | 18–20g |
| Yield (salida) | 36–44g | 40–48g (ratio 1:2 a 1:2.5) |
| Tiempo | 25–35 seg | 28–38 seg |
| Temperatura | 90–96°C | 93–96°C (cafés claros) |
| Presión | 9 bar | 6–9 bar |
| Pre-infusión | 0–5 seg | 3–8 seg |

> Café de especialidad de tueste claro requiere **temperatura más alta** (94–96°C) y **tiempo más largo** para extraer los compuestos aromáticos sin subextraer.

### 2.3 Pour Over / V60 / Chemex — Parámetros

```
Ratio agua:café: 15:1 a 17:1 (ej: 30g café → 450–510g agua)
Temperatura agua: 90–96°C (más claro el tueste, más alta la temp)
Molienda: media-gruesa (sal de mesa a sal gruesa)
Tiempo total: 3–4 minutos

Protocolo básico V60:
1. Pre-humedecer filtro y recipiente (elimina sabor a papel)
2. Bloom (pre-infusión): 2x el peso del café en agua (ej: 60g)
   → Esperar 30–45 seg (degasificación del CO2)
3. Vertidos circulares concéntricos de adentro hacia afuera
4. Mantener nivel de agua estable (no dejar drenar entre vertidos)
5. Tiempo total: 3:00–3:30 min
```

### 2.4 Aeropress — Parámetros

```
Versatil: funciona bien para café de especialidad a bajo costo

Método estándar:
- Café: 15–18g
- Agua: 200–220ml a 85–92°C (más baja que espresso)
- Molienda: media-fina
- Tiempo: 1:30–2:30 min
- Presión: manual suave

Método invertido (inverted):
- Mayor control del tiempo de contacto
- Evita goteo prematuro
```

### 2.5 Cold Brew — Parámetros

```
Tipo: inmersión lenta en frío (12–24 horas)
Ratio: 1:8 a 1:10 (café:agua)
Temperatura: 4–8°C (refrigerador)
Molienda: muy gruesa (como azúcar granulada)
Tiempo: 12–16h en frío = suave y bajo en acidez
         20–24h = más intenso, notas a cacao

Concentrado (para servir con hielo):
Ratio: 1:4 → diluir 1:1 al servir
Shelf life: 7–14 días refrigerado
```

---

## 3. Calibrado de la Máquina Espresso

### 3.1 Secuencia de calibrado diario

```
Paso 1: Encender la máquina con 20–30 min de anticipación
   → La temperatura del grupo debe estabilizarse

Paso 2: Purgar el grupo (flush)
   → 3–5 segundos de agua para limpiar residuos del turno anterior

Paso 3: Shot de calibración (espresso de prueba)
   → Evaluar tiempo, yield y sabor
   → Si es correcto → iniciar servicio
   → Si no → ajustar molienda

Paso 4: Ajuste de molienda
   → Sabor agrio / tiempo corto → molienda más fina
   → Sabor amargo / tiempo largo → molienda más gruesa
   NOTA: Cambiar molienda en pasos pequeños (1/4 vuelta)
   NOTA: Tirar 1–2 shots de descarte después de ajustar
```

### 3.2 Variables de la máquina

**Temperatura (PID):**
```
Control electrónico de temperatura del grupo
Especialidad: 92–96°C (ajustar según tueste y variedad)
Cada máquina tiene offset: temperatura real ≠ temperatura en display
Verificar con termómetro de contacto o puck probe
```

**Presión:**
```
Estándar: 9 bar (pump pressure)
Tendencia especialidad: 6–7 bar para tueste claro
Reducir presión = extracción más suave, menos amargor
Ajuste: en máquinas con OPV (Over Pressure Valve) regulable
```

**Pre-infusión:**
```
Propósito: humedecer el puck uniformemente antes de presión total
Evita: canaling (flujo irregular), subextracción de bordes
Configuración: 3–8 seg a baja presión (2–3 bar)
→ Especialmente importante para cafés claros y single origin
```

**Distribución y tamping:**
```
Distribución del café en el portafiltro:
→ WDT (Weiss Distribution Technique): aguja fina para romper grumos
→ Distribuidor (leveler/puck tool): superficie pareja

Tamping (prensado):
→ Presión estándar: 15–20kg
→ Lo más importante: nivel horizontal perfecto
→ Inconsistencia en tamping = canaling garantizado
```

### 3.3 Diagnóstico rápido por sabor

| Sabor del espresso | Diagnóstico probable | Solución |
|-------------------|---------------------|----------|
| Agrio / vacío | Subextracción | Molienda más fina o temperatura más alta |
| Amargo / seco | Sobreextracción | Molienda más gruesa o temperatura más baja |
| Aguado / sin cuerpo | Dosis muy baja o ratio muy alto | Aumentar dosis o reducir yield |
| Quemado | Temperatura muy alta o tueste muy oscuro | Bajar temperatura |
| Salado | Subextracción severa | Molienda más fina |
| Plano / sin aromas | Café viejo o molido anticipado | Café fresco, moler al momento |

### 3.4 Software de gestión para baristas

**Decent Espresso App:**
- Compatible con máquinas Decent DE1
- Control total de presión, temperatura y flujo
- Visualización en tiempo real de la extracción
- Perfiles descargables de la comunidad

**Brewometer / Acaia Orion:**
- Báscula con temporizador integrado
- Conexión Bluetooth a app
- Registro automático de ratio y tiempo

**VST CoffeeTools:**
- Cálculo de TDS y extracción con refractómetro VST
- Análisis de agua (dureza, alcalinidad)
- Recomendaciones de ajuste basadas en datos

**Barista Hustle Tools (web):**
- Calculadora de extracción gratuita
- Conversión de medidas, ratios, diluciones
- baristahustle.com/tools

---

## 4. El Agua — El Ingrediente Invisible

El agua es el **98.7% del espresso** y su composición afecta dramáticamente la extracción.

### 4.1 Perfil de agua ideal SCA

```
TDS total: 75–250 ppm (ideal: 150 ppm)
Dureza total: 50–175 ppm (ideal: 100 ppm como CaCO3)
Alcalinidad: 40–75 ppm (como CaCO3)
pH: 6.5–7.5 (neutral a ligeramente ácido)
Sodio: < 30 ppm
Cloruros: < 30 ppm
Sin cloro libre (usar filtro de carbón activo)
```

**Dureza baja (< 50 ppm):** Extracción agresiva, café agrio, daña equipos por falta de minerales.

**Dureza alta (> 250 ppm):** Sarro en calderas, bloqueo de válvulas, sabor plano por sobre-buffering de ácidos.

### 4.2 Receta de agua para especialidad (Water Recipe)

Para zonas con agua de mala calidad, se puede preparar agua de mineralización controlada:

```
Base: agua destilada o de ósmosis inversa (0 ppm)
Añadir:
- Bicarbonato de magnesio: 60–80 ppm (dureza + dulzura)
- Bicarbonato de sodio: 30–40 ppm (alcalinidad)

Resultado: ~120–150 ppm TDS, perfil óptimo para especialidad
Kits disponibles: Third Wave Water (simplificado y práctico)
```

---

## 5. Molienda — El Parámetro más Crítico

### 5.1 Tipos de burrs (muelas)

| Tipo | Material | Tamaño | Aplicación |
|------|----------|--------|------------|
| Planas (flat burrs) | Acero | 64–98mm | Espresso, uniformidad alta |
| Cónicas (conical burrs) | Acero/cerámico | 40–71mm | Versatil, flujo, frescura |
| Cuchillas (blade) | Acero | — | NO usar para especialidad |

**A mayor diámetro de burr → mayor uniformidad y menor temperatura de molienda.**

### 5.2 Uniformidad de la molienda

```
Distribución bimodal: mezcla de partículas finas y gruesas
→ Las finas sobreextraen, las gruesas subextraen
→ Resultado: sabor simultáneamente amargo y agrio

Distribución unimodal (ideal):
→ Molinos de alta gama (Mahlkönig EK43, Lagom, Niche Zero)
→ Extracción más limpia y consistente
```

---

## Referencias

- SCA (Specialty Coffee Association). *Brewing Control Chart*.
- SCA. *Espresso Excellence Program*.
- Hoffman, James. *The World Atlas of Coffee*. Mitchell Beazley, 2018.
- Rao, Scott. *The Coffee Roaster's Companion*. 2014.
- Rao, Scott. *The Professional Barista's Handbook*. 2008.
- Barista Hustle. *The Physics of Filter Coffee*. 2021.
- VST. *Extraction and TDS Measurement Guide*.
