# README: MVP Plataforma de Comercio Directo de Café (Mercado Peruano)

Este documento contiene la especificación de diseño, arquitectura, modelo financiero y mapa de funcionalidades para el Producto Mínimo Viable (MVP) de la plataforma de mercado directo de café verde en el Perú. El objetivo es validar la tracción comercial conectando productores en origen con tostadores locales en Lima, utilizando una infraestructura operativa ligera y herramientas No-Code/Low-Code para acelerar el lanzamiento.

---

## 1. Arquitectura del Sistema (Stack Tecnológico del MVP)

Para minimizar costos y salir al mercado en tiempo récord, se propone un ecosistema híbrido (No-Code para interfaces de usuario y automatizaciones para la lógica del negocio):

* **Frontend Tostadores (E-commerce B2B):** Shopify o WooCommerce (WordPress) con plugins de venta por volumen/B2B.
* **Interfaz del Productor / Registro:** Formulario avanzado de Tally o Typeform optimizado para móviles y enlazado con una cuenta de WhatsApp Business con respuestas automatizadas.
* **Base de Datos y CRM Central:** Airtable (actúa como el ERP/Base de datos relacional).
* **Lógica y Automatizaciones:** Make (anteriormente Zapier) para conectar los formularios, la base de datos y la tienda online.
* **Pasarela de Pagos:** Culqi o Niubiz (Integradas en el checkout de la tienda).

---

## 2. Modelo de Monetización y Unit Economics

Al igual que Algrano, el software es gratuito para registrarse, pero se monetiza a través de la transacción y la capa de valor logístico agregado en el mercado local mediante un modelo híbrido.

### A. Estrategia de Ingresos (¿Cómo gana dinero la plataforma?)
1. **Comisión por Intermediación (Take Rate):** Cobro de un porcentaje fijo de entre el **8% y el 12%** sobre el precio base en origen que fije el productor.
2. **Margen de Operación Logística:** Al consolidar carga terrestre, se negocian tarifas por volumen con agencias de transporte (ej. Shalom, Olva, Marvisur o transportistas locales desde Jaén, Satipo o Quillabamba). Si mover un saco cuesta S/ 15 en un pallet consolidado, al tostador se le cobra la tarifa estándar de mercado (S/ 25), reteniendo la diferencia por la gestión del riesgo y la coordinación.
3. **Servicio de Catación y Muestreo:** Tarifa fija aplicada al tostador por el envío de un *Sample Pack* (muestras de 3 o 4 cafés distintos) para cubrir empaque, etiquetado y envío por última milla en Lima.

### B. Simulación de Costos de un Saco de Café (Unit Economics)
Ejemplo basado en un lote de café de especialidad de **85 puntos SCA** proveniente de **San Ignacio, Cajamarca**:

| Concepto | Costo Estimado (PEN) | Quién lo absorbe / Detalle |
| :--- | :--- | :--- |
| **Precio Base del Productor** | S/ 850.00 | Lo que el caficultor recibe neto por su saco de 60kg. |
| **Comisión de la Plataforma (10%)** | S/ 85.00 | Ingreso bruto por el uso del software y la transacción. |
| **Flete Terrestre (Origen -> Lima)** | S/ 25.00 | Costo de mover el saco consolidado en camión (Paga el tostador). |
| **Almacenamiento en Lima (Hub)** | S/ 10.00 | Costo estimado por saco al mes en almacén tercerizado. |
| **Gastos de Pasarela de Pagos (~4%)** | S/ 38.00 | Comisión de Culqi/Niubiz por transacciones digitales. |
| **PRECIO FINAL EN LIMA** | **S/ 1,008.00** | **Total pagado por el Tostador por saco puesto en destino.** |

> **Margen Neto Estimado por Saco:** S/ 85.00 (Comisión) - S/ 38.00 (Pasarela) = **~S/ 47.00 netos por saco vendido** (sin contar el diferencial logístico a favor). 
> *Métrica de recurrencia:* Si un micro-tostador promedio en Lima consume entre 5 y 10 sacos al mes, un solo cliente activo genera un valor constante en la plataforma.

---

## 3. Modelado de Datos de la Plataforma (Esquema de Tablas en Airtable)

### Tabla 1: Productores (`PROD_ID`)
* `ID_Productor`: Auto-incremental (Llave Primaria).
* `Nombre_Contacto`: Texto.
* `Nombre_Finca_Cooperativa`: Texto.
* `DNI_RUC`: Texto (Validación SUNAT).
* `Region_Valle`: Lista desplegable (Cajamarca, Junín, Cusco, Amazonas, Puno, San Martín, Pasco).
* `Altitud_m s. n. m.`: Número entero.
* `Variedades_Disponibles`: Selección múltiple (Caturra, Bourbon, Typica, Geisha, Catimor, etc.).
* `Numero_Celular`: Teléfono (Enlace directo a WhatsApp).
* `Cuenta_Bancaria`: Texto (CCI / Banco).

### Tabla 2: Lotes de Café Verde (`LOTE_ID`)
* `ID_Lote`: Código único (ej. CAJ-001-2026).
* `ID_Productor`: Llave foránea (Relación con Tabla Productores).
* `Proceso`: Lista desplegable (Lavado, Natural, Honey, Anaeróbico).
* `Variedad_Especifica`: Texto.
* `Cantidad_Sacos_Disponibles`: Número entero (Sacos de 60kg).
* `Precio_Saco_Origen_PEN`: Moneda (Precio fijado por el productor).
* `Estado_Lote`: Lista (En Espera de Muestra / En Catación / Publicado / Agotado).

### Tabla 3: Control de Calidad / Catación (`QC_ID`)
* `ID_QC`: Código único.
* `ID_Lote`: Llave foránea (Relación con Tabla Lotes).
* `Puntaje_SCA`: Número decimal (Puntaje final del Q-Grader).
* `Notas_Sabor`: Selección múltiple o Tags (Chocolatado, Cítrico, Frutos Rojos, Floral, Frutos Secos).
* `Acidez_Cuerpo_Balance`: Campos numéricos (Escala 1 al 10).
* `Ficha_Catacion_PDF`: Archivo adjunto.

### Tabla 4: Pedidos / Logística (`PED_ID`)
* `ID_Pedido`: Código único generado por el e-commerce.
* `ID_Lote`: Llave foránea.
* `Comprador_Tostador`: Texto (Razón Social / Nombre).
* `Sacos_Comprados`: Número entero.
* `Monto_Total_PEN`: Moneda.
* `Estado_Pago`: Lista (Pendiente / Verificado / Transferido a Productor).
* `Estado_Logistica`: Lista (En Origen / En Camión a Lima / En Almacén Lima / Entregado).

---

## 4. Funcionalidades por Actor (Matriz de Requerimientos)

### Actor 1: El Productor (En Origen)
El objetivo es facilitarle la carga de datos con nula fricción digital desde zonas rurales.

* **F01: Registro de Finca vía Móvil:** Acceso a un formulario web ligero donde sube sus datos de contacto, geografía de la finca y variedades sin necesidad de loguearse con contraseña.
* **F02: Publicación de Lote en Campaña:** Capacidad de declarar cuántos sacos tiene disponibles de un café específico y definir el precio mínimo que espera recibir en soles por saco de 60kg.
* **F03: Alertas de Tránsito por WhatsApp:** Recepción de un mensaje automatizado cuando el Hub de Lima aprueba su muestra o cuando un tostador compra su lote, incluyendo las instrucciones de envío terrestre.
* **F04: Confirmación de Liquidación:** Notificación de transferencia bancaria realizada a su cuenta una vez que el café es entregado al cliente final en Lima.

### Actor 2: El Administrador de la Plataforma (Tu Equipo / Hub Lima)
El rol que controla la calidad, el pricing dinámico y consolida la logística.

* **F05: Recepción y Log de Muestras:** Registro del ingreso físico de las muestras de 500g enviadas por los productores a través de agencias (Shalom/Olva).
* **F06: Digitalización de la Ficha SCA:** Interfaz de captura de datos para el catador (Q-Grader). Al guardar el puntaje y las notas de sabor, el lote cambia su estado automáticamente a "Aprobado".
* **F07: Motor de Precios Dinámicos (Fórmula):** Script automatizado en la base de datos que calcula el precio de venta final aplicando la fórmula comercial:
    $$Precio\_Final = (Precio\_Origen \times 1.10) + Costo\_Flete\_Terrestre + Almacenamiento$$
* **F08: Panel de Control Logístico:** Consola visual tipo Kanban para arrastrar los lotes según su estado (Origen -> En Tránsito -> Almacén Lima -> Entregado) y disparar correos informativos automáticos a los clientes.

### Actor 3: El Tostador / Cafetería de Especialidad (En Lima)
La interfaz de compra debe ser idéntica a un e-commerce B2B profesional y rápido.

* **F09: Marketplace con Filtros de Especialidad:** Buscador web donde se pueden filtrar los cafés verdes disponibles por Región, Rango de Puntaje SCA (ej. sólo cafés de 85+ puntos) y Notas Sensoriales.
* **F10: Compra de Muestras (Sample Packs):** Botón para añadir al carrito una muestra de café verde de 200g por un precio menor (S/ 15 - S/ 20) para tostar y probar en su taller antes de adquirir sacos enteros.
* **F11: Compra y Reserva de Sacos:** Carrito de compras configurado para ordenar en múltiplos de sacos de 60kg, con cálculo de IGV automático y emisión de Factura electrónica (requerimiento crítico B2B en Perú).
* **F12: Descarga de Ficha de Trazabilidad:** Acceso a un panel posterior a la compra donde puede descargar fotos de la finca, la biografía del productor y los resultados de laboratorio para usarlos en el empaque de su café tostado comercial.

---

## 5. Flujo Operativo y de Datos Integrado (Secuencia del MVP)

1. El productor llena el formulario de lote desde su celular en Jaén.
2. **Make** recibe el formulario, crea el registro en **Airtable** (Estado: *Esperando Muestra*) y genera una etiqueta de envío de muestra.
3. La muestra llega a Lima, el Q-Grader la cata y registra un puntaje de **85 puntos**.
4. La automatización calcula el precio final sumando la comisión del 10% y los costos operativos fijos, activando el producto automáticamente en la web de **Shopify**.
5. Un tostador en Miraflores entra a la web, ve el café de 85 puntos y compra **5 sacos** pagando mediante la pasarela de pagos (incluyendo el costo del flete).
6. La base de datos actualiza el stock, resta 5 sacos del inventario y notifica al productor por WhatsApp para que despache los sacos en el camión consolidado hacia el almacén asociado en Lima.
7. El café llega al hub de Lima, se verifica el peso y se distribuye a la tostaduría del cliente. La plataforma libera el pago neto directo a la cuenta del productor en menos de 24 horas.