import type { ReactNode } from 'react';

const C = {
  green: '#1f3028', terra: '#c96e4b', sage: '#8faf8a',
  tan: '#c4b297', brown: '#533b22', cream: '#f2e0cc',
};

// Helpers de formato reutilizables
const H2 = ({ children }: { children: ReactNode }) => (
  <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, fontWeight: 700, color: C.brown, margin: '40px 0 16px', lineHeight: 1.2 }}>
    {children}
  </h2>
);

const H3 = ({ children }: { children: ReactNode }) => (
  <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, fontWeight: 700, color: C.brown, margin: '32px 0 12px' }}>
    {children}
  </h3>
);

const P = ({ children }: { children: ReactNode }) => (
  <p style={{ marginBottom: 18, lineHeight: 1.8 }}>{children}</p>
);

const Stat = ({ number, label, source }: { number: string; label: string; source?: string }) => (
  <div style={{ background: '#f7f3ee', border: `1px solid ${C.tan}30`, borderRadius: 10, padding: '20px 24px', marginBottom: 12 }}>
    <div style={{ fontFamily: 'Cormorant Garamond', fontSize: 40, fontWeight: 700, color: C.terra, lineHeight: 1 }}>{number}</div>
    <div style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, marginTop: 4 }}>{label}</div>
    {source && <div style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, marginTop: 6 }}>Fuente: {source}</div>}
  </div>
);

const DataGrid = ({ items }: { items: { number: string; label: string; source?: string }[] }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, margin: '24px 0' }}>
    {items.map(i => <Stat key={i.label} {...i} />)}
  </div>
);

const Quote = ({ text, author }: { text: string; author?: string }) => (
  <blockquote style={{
    borderLeft: `3px solid ${C.terra}`, paddingLeft: 20, margin: '28px 0',
    fontFamily: 'Cormorant Garamond', fontSize: 20, color: C.brown, lineHeight: 1.6,
  }}>
    "{text}"
    {author && <footer style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, marginTop: 8 }}>— {author}</footer>}
  </blockquote>
);

const Table = ({ headers, rows }: { headers: string[]; rows: string[][] }) => (
  <div style={{ overflowX: 'auto', margin: '24px 0' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Montserrat', fontSize: 13 }}>
      <thead>
        <tr style={{ background: C.green, color: C.cream }}>
          {headers.map(h => (
            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 11, letterSpacing: 0.5 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f7f3ee' }}>
            {row.map((cell, j) => (
              <td key={j} style={{ padding: '10px 14px', color: C.brown, borderBottom: `1px solid ${C.tan}20` }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ─── CONTENIDO DE CADA ARTÍCULO ──────────────────────────────────────────────

export const POST_CONTENT: Record<string, ReactNode> = {

  'cadena-valor-cafe-peru': (
    <>
      <H2>Una finca en Jaén, una taza en Miraflores</H2>
      <P>Griselda Rojas se levanta a las cinco de la mañana. Lleva veinte años cosechando cereza a cereza en su parcela de tres hectáreas en Jaén, Cajamarca, a 1,800 metros sobre el nivel del mar. Su café tiene notas a durazno y jazmín — un Q Grader lo puntuó 87.5 en 2024. Ese mismo café, tostado y empacado en una bolsa de 250 gramos, se vende en una cafetería de Miraflores por S/48.</P>
      <P>¿Cuánto recibió Griselda por esos 250 gramos? Menos de S/4.</P>
      <P>Esa brecha no es un accidente. Es el resultado de una cadena de valor con seis eslabones, cada uno con su margen — y el primero, el que más trabaja, es el que menos captura.</P>

      <H2>Los números que lo explican todo</H2>
      <DataGrid items={[
        { number: 'S/9–16', label: 'Recibe el caficultor por kg', source: 'JNC Q1 2024' },
        { number: 'S/100–220', label: 'Paga el consumidor por kg', source: 'Precios retail Lima, mayo 2026' },
        { number: '5–9%', label: 'Del precio final captura el caficultor', source: 'JNC 2024' },
        { number: '223,000+', label: 'Familias cafetaleras en Perú', source: 'JNC Anuario 2024' },
      ]} />

      <H2>Los 6 eslabones — y lo que le queda a cada uno</H2>
      <P>El café peruano recorre un camino largo antes de llegar a tu taza. Cada eslabón agrega un margen — pero no todos agregan valor real al producto.</P>

      <H3>1. El caficultor — el que más trabaja, el que menos cobra</H3>
      <P>Produce café en finca a altitudes de 800 a 2,200 msnm en regiones como Cajamarca, Junín, San Martín, Cusco, Pasco y Amazonas. Cosecha grano a grano durante semanas. Procesa, seca, clasifica. Vende café en pergamino o verde trillado, generalmente al contado — o atado a una deuda previa con el acopiador.</P>

      <H3>2. El acopiador local — el nudo de la cadena</H3>
      <P>Opera en la misma zona que el caficultor. Su función es juntar volumen de múltiples productores. El problema estructural: mezcla lotes sin separar por calidad. Un café de 90 puntos SCA se mezcla con uno de 82 — el resultado es un lote promedio de 84. El productor del café superior pierde su diferencial. El acopiador aplica un margen del 30 al 40% sobre su precio de compra.</P>

      <H3>3. El exportador o cooperativa</H3>
      <P>Consolida lotes para exportación. El precio de referencia es la bolsa de Nueva York (ICE). El 94% del café peruano sale por este eslabón hacia Alemania (28%), Estados Unidos (18%), Bélgica (12%) e Italia (9%).</P>

      <H3>4. La tostadora</H3>
      <P>Recibe café verde en Lima, lo tuesta y lo fracciona en bolsas de 250g a 1kg. Hay aproximadamente 50 tostadoras activas en Lima en 2025.</P>

      <H3>5. La cafetería de especialidad</H3>
      <P>Compra café ya tostado a las tostadoras. Lima tiene 321 tiendas especializadas en café (Euromonitor, 2024). La coordinación de compra se hace por WhatsApp y llamada telefónica — sin plataforma digital.</P>

      <H3>6. El consumidor final</H3>
      <P>En las cafeterías de especialidad ya es posible ver origen, variedad, proceso y notas de cata en la carta. Lo que rara vez aparece es el puntaje SCA certificado del lote específico.</P>

      <H2>El sistema de habilitación — por qué el caficultor no puede salirse</H2>
      <Quote
        text="Yo sé que mi café es bueno. Pero cuando llega al acopiador, todo se mezcla. Al final nos pagan lo mismo que al que cuida menos. ¿Para qué mejorar si no hay diferencia en el precio?"
        author="Productor, La Convención, Cusco"
      />
      <P>El sistema de habilitación es la principal trampa estructural. El acopiador presta dinero al caficultor antes de la cosecha — para semillas, abono, jornaleros. Cuando llega la cosecha, el caficultor no puede vender a otro comprador. Ya debe. Y el acopiador pone el precio.</P>
      <P>Este mecanismo está documentado por la Junta Nacional del Café y DEVIDA como una de las principales barreras para el desarrollo del sector cafetalero peruano.</P>

      <H2>Lo que falta para romper el ciclo</H2>
      <P>Para que el caficultor acceda a precio diferenciado por calidad necesita resolver cuatro cosas a la vez:</P>
      <Table
        headers={['Problema', 'Consecuencia', 'Solución necesaria']}
        rows={[
          ['Deuda con el acopiador', 'No puede negociar el precio', 'Anticipo o prefinanciación alternativa'],
          ['Sin catación SCA', 'No puede probar su calidad', 'Q-Grader accesible y asequible'],
          ['Sin logística propia', 'No puede llegar a Lima', 'Hub de consolidación con flete compartido'],
          ['Sin información de precios', 'No sabe cuánto vale su café', 'Precio de mercado en tiempo real'],
        ]}
      />
      <P>Ninguna de estas soluciones funciona de forma aislada. Se necesitan las cuatro al mismo tiempo — y eso requiere una plataforma, no una iniciativa individual.</P>

      <H2>Fuentes</H2>
      <P>JNC — Boletín de Precios al Productor Q1 2024 · MIDAGRI Anuario Agropecuario 2024 · JNC Caracterización del Productor Cafetalero 2022 · Precios retail Lima verificados mayo 2026</P>
    </>
  ),

  'boom-cafeterias-especialidad-peru-2025': (
    <>
      <H2>El miércoles que no había café</H2>
      <P>El barista de una cafetería en Barranco recibe un mensaje de su tostador un miércoles por la tarde: "Se acabó el lote de Cajamarca. El próximo llega en tres semanas." Ya había vendido ese café en su carta con nombre de finca, altitud y notas de cata. Sus clientes habituales lo pedían por nombre.</P>
      <P>La solución de emergencia: llamar a otros dos tostadores, comparar precios por WhatsApp, recibir bolsas sin ficha técnica, recalibrar el molino a ciegas. Perder tres días de margen y consistencia.</P>
      <P>Esta historia se repite en docenas de cafeterías de Lima cada mes. Y sin embargo, el sector no para de crecer.</P>

      <H2>Los números del boom</H2>
      <DataGrid items={[
        { number: '321', label: 'Tiendas especializadas en café en Perú (2024)', source: 'Euromonitor / Forbes Perú 2025' },
        { number: '+11.5%', label: 'Crecimiento en tiendas 2019–2024', source: 'Euromonitor International' },
        { number: '1.2 kg', label: 'Consumo per cápita anual en Perú (2025)', source: 'MIDAGRI 2025' },
        { number: '3,250', label: 'Cafés tradicionales en Perú — sin cambio en 5 años', source: 'Euromonitor 2024' },
      ]} />

      <P>Mientras los cafés tradicionales llevan cinco años sin crecer, las tiendas especializadas en café crecieron 11.5% entre 2019 y 2024. El mercado specialty ya existe en el Perú — y está acelerando.</P>

      <H2>Los actores que lideran la expansión</H2>

      <H3>Puku Puku — el modelo de referencia</H3>
      <P>Fundada en 2013, es la única cadena peruana de cafeterías de especialidad con 12 puntos de venta y presencia en el top 5 de mejores cafeterías del mundo según The World's 100 Best Coffee Shops 2025. Su modelo es compra directa al caficultor pagando precio justo, con control total del proceso desde el verde hasta la taza. En 2025 planea abrir tres nuevas tiendas y alianzas con BCP y Casa Andina.</P>

      <Quote
        text="Es tarea de todos nosotros incentivar el consumo del café y dar a conocer uno de nuestros productos bandera, que en muchos casos es menospreciado por desconocimiento."
        author="Gino Valerga, gerente general de Puku Puku"
      />

      <H3>Neira Café Lab — rentabilidad y expansión</H3>
      <P>Fundada en 2017 con US$20,000, hoy tiene 6 locales en Lima y 4 carritos en playas. Modelo 90% café / 10% comida, con recuperación de inversión en promedio de un año por local. Proyecta crecer 30% en 2025 e internacionalizar la marca a México y EE.UU. en 2026.</P>

      <H3>The Coffee — la franquicia brasileña que usa café peruano</H3>
      <P>Cadena de 23 países con modelo autoservicio por tablet. En Perú tiene 7 tiendas y meta de 35 locales para 2028. Ticket promedio por tienda: S/40,000–50,000 al mes. Compran directamente a productores locales peruanos.</P>

      <H2>El problema que el boom no resolvió</H2>
      <P>El crecimiento de las cafeterías de especialidad es real. Pero hay un componente de la cadena que no creció junto con ellas: la infraestructura de abastecimiento de café verde. Hoy, la mayoría de las cafeterías sin tostadora propia compran café tostado por WhatsApp, llamada telefónica y Excel. No existe una plataforma digital B2B para el mercado interno peruano.</P>

      <Table
        headers={['Factor', 'Estado actual']}
        rows={[
          ['Crecimiento de cafeterías specialty', '✓ +11.5% en 5 años'],
          ['Consumo per cápita', '✓ Subió de 0.6 a 1.2 kg/persona'],
          ['Plataforma digital B2B de café verde', '✗ No existe en el mercado interno'],
          ['Trazabilidad de lote hasta cafetería', '✗ Solo en casos aislados (Puku Puku, Bisetti)'],
          ['Precio diferenciado por puntaje SCA', '✗ Sin estándar en el mercado interno'],
        ]}
      />

      <Quote
        text="El boom es a nivel nacional. En Arequipa, Ayacucho, Chiclayo, Cusco, Jaén y San Ignacio las cafeterías de especialidad son un boom."
        author="Omar Moreno, El Cafeteador / organizador Cafesazo"
      />

      <H2>Fuentes</H2>
      <P>Euromonitor International citado en Forbes Perú — "El boom de cafeterías de especialidad en Perú no para", Lucero Chávez Quispe, 24 abril 2025 · MIDAGRI 2025</P>
    </>
  ),

  'marketplaces-b2b-cafe-mundo-2026': (
    <>
      <H2>El mercado global en números</H2>
      <DataGrid items={[
        { number: '$245B', label: 'Mercado global del café (2024)' },
        { number: '63%', label: 'Cuota B2B mayorista del mercado total' },
        { number: '$47.8B', label: 'Segmento specialty solo en EE.UU.' },
        { number: '9.5%', label: 'Crecimiento anual proyectado specialty hasta 2030' },
      ]} />

      <P>El mercado B2B de café specialty a nivel global es enorme y tiene plataformas consolidadas. Pero ninguna opera en el mercado interno peruano. Ese es el gap que Tunay Wasi ocupa.</P>

      <H2>Las 4 plataformas de café verde más relevantes</H2>

      <H3>1. Algrano — el referente más cercano a Tunay Wasi</H3>
      <P>Fundada en 2015 en Zúrich. Conecta productores de café verde con tostadores en 32 países. Pedido mínimo: 1 saco de 60 kg. Para pedidos menores a 100 sacos, consolida en contenedores compartidos y gestiona toda la logística.</P>
      <Table
        headers={['Métrica', 'Dato']}
        rows={[
          ['Conexiones productor-tostador', '4,000+ desde el lanzamiento'],
          ['Volumen de relaciones largas (2024)', '90% de más de 1 año'],
          ['Tostadores que aumentaron compras', '35%'],
          ['Países de origen', '20'],
          ['Países de tostadores atendidos', '32'],
        ]}
      />
      <P>Premio SCA al Mejor Producto Nuevo por su CRM para productores. El precio listado incluye todo — sin cargos ocultos. El caficultor ve exactamente cuánto le llega después de comisión, flete y almacenamiento.</P>

      <H3>2. TYPICA — la red más grande del mundo</H3>
      <P>Fundada en Japón en 2019. Tiene 110,000+ productores y tostadores en 80 países. Tasa de devolución en Japón: 0.86% en cinco años — reflejo de un filtrado riguroso antes de publicar lotes. Los ingresos de los productores en la plataforma son 2.2 veces el comercio convencional.</P>

      <H3>3. Beyco — la única plataforma gratuita</H3>
      <P>Sin suscripción, sin comisión, sin cuota de publicación. Propiedad de Progreso, ONG holandesa. Registra cada contrato en blockchain — útil para cumplimiento del EUDR europeo. Modesta en volumen pero innovadora en transparencia.</P>

      <H3>4. Kaffea-X — el modelo financiero aplicado al café</H3>
      <P>Fundada en 2023. Informes Q-Grader obligatorios en todos los listados. Subastas en tiempo real. Taxonomía KUPIC con 10 atributos estandarizados de precio incluyendo puntaje SCA, variedad, proceso y certificaciones.</P>

      <H2>Lo que ninguna plataforma hace</H2>
      <Table
        headers={['Plataforma', 'Mercado interno Perú', 'Canal B2C', 'Logística finca→Lima']}
        rows={[
          ['Algrano', '✗', '✗', '✗'],
          ['TYPICA', '✗', '✗', '✗'],
          ['Beyco', '✗', '✗', '✗'],
          ['Kaffea-X', '✗', '✗', '✗'],
          ['Tunay Wasi', '✓', '✓ (fase 2)', '✓'],
        ]}
      />

      <H2>La ventaja de Tunay Wasi: logística local</H2>
      <P>Mientras Algrano tarda 3 a 4 meses en un envío compartido internacional, la distancia de una finca en Pasco o Cusco a Lima se recorre en horas. Tunay Wasi puede ofrecer café verde puesto en Lima en 2 a 4 semanas — una ventaja logística que ninguna plataforma internacional puede replicar en el mercado interno.</P>

      <Quote
        text="Busca «mejor marketplace B2B de café» y encontrarás listas repletas de Alibaba, Amazon Business y Faire. Plataformas genéricas, sin puntuaciones de catación, sin verificación de productores y sin garantía de calidad para el café verde."
        author="Borja Blanco Méndez, junio 2026"
      />

      <H2>Lección para el mercado peruano</H2>
      <P>El modelo funciona a escala global. Algrano tiene 4,000 conexiones. TYPICA tiene 110,000 usuarios. La transparencia de precio es no negociable — todas las plataformas top muestran el desglose completo. El Q-Grader es el diferenciador central. Y la logística integrada es la ventaja competitiva más difícil de replicar.</P>
      <P>Todo eso existe a nivel global. En el mercado interno peruano, no existe ninguno. Ese es el espacio que Tunay Wasi construye.</P>

      <H2>Fuentes</H2>
      <P>Borja Blanco Méndez — "Mejor Marketplace B2B de Café en 2026", junio 2026 · Euromonitor International 2024 · Datos de plataformas: sitios oficiales de Algrano, TYPICA, Beyco y Kaffea-X</P>
    </>
  ),

  'variedades-cafe-peruano-geisha-typica-bourbon': (
    <>
      <H2>El potencial en números</H2>
      <DataGrid items={[
        { number: '94 pts', label: 'Puntaje SCA máximo registrado en Perú (Geisha, CoE 2025)', source: 'Alliance for Coffee Excellence' },
        { number: '7', label: 'Variedades arábica principales en el café peruano de especialidad' },
        { number: '800–2,200', label: 'Metros sobre el nivel del mar donde crece el café de especialidad en Perú', source: 'MIDAGRI 2026' },
        { number: '223,000+', label: 'Familias cafetaleras en Perú', source: 'JNC Anuario 2024' },
      ]} />

      <H2>Por qué la variedad importa en el precio</H2>
      <P>No todo el café arábica es igual. Una Geisha bien cultivada en Cajamarca puede superar los 90 puntos SCA y venderse a precios 3 a 5 veces superiores a una Catimor del mismo lote. La variedad determina el techo de calidad posible — el caficultor que la identifica y la trabaja bien, accede a precio diferenciado.</P>

      <H2>Las 7 variedades que producen el café peruano de especialidad</H2>

      <Table
        headers={['Variedad', 'Puntaje potencial', 'Resistencia a roya', 'Notas características']}
        rows={[
          ['Geisha', '87–94 pts', 'Muy baja', 'Floral intenso, jazmín, durazno, bergamota'],
          ['Typica', '84–88 pts', 'Baja', 'Dulce, limpia, caramelo, fruta suave'],
          ['Bourbon', '84–88 pts', 'Baja', 'Dulzura compleja, frutas rojas, chocolate'],
          ['Caturra', '82–86 pts', 'Media', 'Acidez brillante, cuerpo medio, cítricos'],
          ['Pache', '83–86 pts', 'Media', 'Equilibrada, miel, frutos secos'],
          ['IPR107', '82–85 pts', 'Muy alta', 'Resistente a roya, emergente en Junín'],
          ['Catimor', '78–82 pts', 'Alta', 'Cuerpo alto, acidez baja, terroso'],
        ]}
      />

      <H3>Geisha — La variedad que cambió el mercado</H3>
      <P>Originaria de Etiopía (Valle de Gesha), llegó a Perú a través de Centroamérica. Hoy domina los primeros puestos del Cup of Excellence Perú. En la edición 2025, Cajamarca barrió los 15 primeros lotes finalistas — la mayoría, Geisha lavada. El primer puesto de Ángel Manosalva alcanzó 90.64 puntos y fue subastado a US$80.10 por libra.</P>
      <P>Su talón de Aquiles: es extremadamente sensible a la roya amarilla y requiere altitudes superiores a 1,600 msnm para expresar su perfil floral completo. Cada árbol produce menos fruto que una Caturra, lo que hace el costo por kilogramo más alto — pero el precio al que se vende lo justifica ampliamente.</P>

      <H3>Typica — La variedad histórica del Perú</H3>
      <P>La variedad más antigua en suelo peruano. Llegó desde Yemen vía Ámsterdam y Martinica en el siglo XVIII. Amazonas (Rodríguez de Mendoza) produce Typicas de élite: en CoE 2025, Yanet Figueroa obtuvo 88.85 puntos con una Typica que sorprendió a catadores internacionales por su limpieza y dulzura.</P>

      <H3>Bourbon — La alternativa dulce</H3>
      <P>Mutación natural de la Typica desarrollada en la isla Bourbon (hoy Reunión). Produce una dulzura compleja con notas a frutas rojas y chocolate que la hace ideal para el mercado de espresso de especialidad. Pasco y Cusco tienen parcelas de Bourbon con resultados consistentes por encima de los 85 puntos.</P>

      <H2>El terroir peruano: las cinco zonas de especialidad</H2>
      <Table
        headers={['Región', 'Altitud', 'Variedad estrella', 'Perfil dominante']}
        rows={[
          ['Cajamarca (Jaén, San Ignacio)', '1,400–2,000 msnm', 'Geisha lavada', 'Floral, bergamota, 1er y 2do CoE 2025'],
          ['Cusco (La Convención)', '1,200–1,900 msnm', 'Geisha, procesos diferenciados', 'Tropical, especiado, 3er CoE 2025'],
          ['Amazonas (Rodríguez de Mendoza)', '1,400–1,900 msnm', 'Typica, Caturra', 'Limpio, dulce, frutal fino'],
          ['Junín (Satipo, Chanchamayo)', '1,200–1,800 msnm', 'Caturra, IPR107', 'Volumen + calidad media-alta'],
          ['Puno (Sandia)', '1,500–2,000 msnm', 'Typica, Bourbon', 'Perfil único, logística compleja'],
        ]}
      />

      <Quote
        text="El café de especialidad no empieza en la tostadora. Empieza en la semilla que el caficultor elige plantar y en el suelo donde decide hacerlo crecer."
        author="Tunay Wasi"
      />

      <H2>Por qué el 80% de cafetales peruanos no llegan a su potencial</H2>
      <P>El 80% de los cafetales en Perú tienen más de 15 años (MIDAGRI 2026), lo que reduce el rendimiento a ~660 kg por hectárea. Una planta de Geisha con más de 20 años pierde productividad y uniformidad de maduración — sus puntajes empiezan a bajar aunque el manejo sea impecable. La renovación de cafetales es la inversión de largo plazo más importante que puede hacer un caficultor orientado a especialidad.</P>

      <H2>Fuentes</H2>
      <P>Alliance for Coffee Excellence — Cup of Excellence Peru 2025 Results · MIDAGRI (2026) Perspectivas y desafíos del café peruano 2026–2027 · JNC Anuario Estadístico del Café Peruano 2024 · Wintgens, J.N. (Ed.) Coffee: Growing, Processing, Sustainable Production</P>
    </>
  ),

  'procesos-postcosecha-lavado-natural-honey-anaerobico': (
    <>
      <H2>El proceso que más afecta el sabor</H2>
      <DataGrid items={[
        { number: '4', label: 'Procesos principales en café de especialidad peruano' },
        { number: '48–120h', label: 'Duración de fermentación anaeróbica controlada' },
        { number: '87+ pts', label: 'Puntaje frecuente en anaeróbicos bien ejecutados', source: 'SCA Protocol' },
        { number: '10.5–11.5%', label: 'Humedad objetivo del grano al finalizar el secado', source: 'SCA Green Coffee' },
      ]} />

      <P>El terroir y la variedad determinan el techo de calidad de un café. Pero el proceso post-cosecha determina si ese techo se alcanza o no. El mismo lote de Geisha de Cajamarca puede saber a jazmín y bergamota (lavado) o a fresa madura y chocolate oscuro (natural), según cómo se procese.</P>

      <H2>Los 4 procesos y lo que producen en taza</H2>

      <H3>1. Proceso Lavado (Washed) — El más limpio</H3>
      <P>El fruto maduro se despulpa dentro de las 12 horas de cosecha para eliminar la pulpa exterior. Luego fermenta en agua entre 12 y 36 horas según la temperatura ambiente — el punto exacto es cuando el grano suelta fácil al tacto. Se lava con 3 o 4 cambios de agua limpia y se seca en camas africanas durante 15 a 21 días hasta alcanzar 10.5 a 11.5% de humedad.</P>
      <P><strong>Perfil en taza:</strong> Limpio, brillante, acidez pronunciada. El terroir se expresa con máxima claridad — si el café viene de altura y tiene buen manejo agronómico, el lavado lo muestra sin filtros.</P>

      <H3>2. Proceso Natural (Dry) — El más complejo</H3>
      <P>El fruto maduro se seca con la pulpa intacta en camas africanas durante 14 a 30 días según el clima. El volteo es crítico — cada 2 a 4 horas en los primeros días para evitar fermentación desigual. La pulpa seca actúa como una barrera que transfiere azúcares directamente al grano durante el secado.</P>
      <P><strong>Perfil en taza:</strong> Cuerpo alto, dulzura intensa, notas a fruta madura — fresa, arándano, uva, ciruela. Mayor riesgo de defectos si el control no es riguroso. Ayde Rojas de Finca Vista Hermosa en Jaén trabaja Natural y sus cafés desarrollan notas a frutas maduras que son difíciles de conseguir con lavado.</P>

      <H3>3. Proceso Honey (Miel) — El intermedio</H3>
      <P>El fruto se despulpa parcialmente, dejando una capa de mucílago adherida al pergamino. Se seca directamente sin fermentación húmeda. La cantidad de mucílago que queda define el tipo de Honey: Yellow (25%), Red (50%) o Black (75–100%).</P>
      <Table
        headers={['Tipo', 'Mucílago', 'Días de secado', 'Perfil en taza']}
        rows={[
          ['Yellow Honey', '25%', '8–12 días', 'Suave, dulce, floral'],
          ['Red Honey', '50%', '12–18 días', 'Dulce, frutal, equilibrado'],
          ['Black Honey', '75–100%', '18–30 días', 'Intenso, cuerpo alto, similar al Natural'],
        ]}
      />

      <H3>4. Fermentación Anaeróbica — El proceso diferenciado</H3>
      <P>Proceso avanzado que produce perfiles exóticos y puntajes consistentemente altos. El fruto maduro (o despulpado) se coloca en tanques sellados sin oxígeno. Opcionalmente se inocula con levaduras específicas. La fermentación dura entre 48 y 120 horas bajo control estricto de pH (se inicia en 5.8, se detiene en 3.5 a 4.0) y temperatura (idealmente bajo 20°C).</P>
      <P><strong>Perfil en taza:</strong> Complejo, exótico — notas a vino, tropical, cacao, especias. Puntajes frecuentemente superiores a 87 puntos. Requiere equipamiento adicional y conocimiento técnico, pero el diferencial de precio que genera puede triplicar el ingreso por kilogramo versus un lavado estándar.</P>

      <H2>El secado: el punto crítico donde se gana o pierde el lote</H2>
      <P>El secado mal controlado es la principal causa de defectos en el café peruano. No es un problema de variedad ni de altitud — es un problema de infraestructura y conocimiento técnico en poscosecha.</P>
      <Table
        headers={['Error de secado', 'Consecuencia en taza']}
        rows={[
          ['Secado muy rápido (> 35°C)', 'Agrietamiento del grano, fermentación interna'],
          ['Secado lento con humedad alta', 'Moho, sabor a tierra, fenólico'],
          ['Volteo insuficiente', 'Secado desigual, granos negros'],
          ['Humedad final > 12.5%', 'Moho durante almacenamiento'],
          ['Humedad final < 10%', 'Grano quebradizo, pierde aromas volátiles'],
        ]}
      />

      <Quote
        text="El proceso no es el enemigo del terroir. Es el lenguaje con el que el caficultor le habla a la taza. Un Natural bien ejecutado no esconde el origen — lo amplifica."
        author="Tunay Wasi"
      />

      <H2>Fuentes</H2>
      <P>SCA (Specialty Coffee Association) — Green Coffee Defects Handbook · MIDAGRI (2026) Perspectivas y desafíos del café peruano 2026–2027 · Wintgens, J.N. Coffee: Growing, Processing, Sustainable Production</P>
    </>
  ),

  'que-significa-puntaje-sca-cafe-especialidad': (
    <>
      <H2>La escala que separa el commodity del especialidad</H2>
      <DataGrid items={[
        { number: '80 pts', label: 'Puntaje mínimo para clasificar como café de especialidad', source: 'SCA Protocol' },
        { number: '10', label: 'Atributos evaluados por un Q Grader en cada sesión de catación', source: 'SCA Cupping Protocol' },
        { number: '22', label: 'Exámenes que debe aprobar un Q Grader para obtener su certificación', source: 'Coffee Quality Institute' },
        { number: '90.64', label: 'Puntaje del 1er lugar del Cup of Excellence Perú 2025 (Ángel Manosalva)', source: 'Alliance for Coffee Excellence' },
      ]} />

      <P>Cuando una bolsa de café dice "87 puntos SCA", está citando el resultado de una evaluación rigurosa hecha por un Q Grader certificado siguiendo un protocolo internacional estandarizado. No es una opinión. Es una medición.</P>

      <H2>¿Qué es un Q Grader?</H2>
      <P>El Q Grader (Quality Grader) es un catador certificado por el Coffee Quality Institute (CQI), la entidad más reconocida del mundo en café de especialidad. Para obtener la certificación, el candidato debe aprobar 22 exámenes en 4 días que evalúan identificación de defectos físicos, reconocimiento de aromas, discriminación de sabores básicos, sensibilidad a sal, dulce, ácido y amargo, y catación a ciegas siguiendo protocolo SCA. La certificación se renueva cada 3 años con recalibración obligatoria.</P>

      <H2>Los 10 atributos que se evalúan</H2>
      <P>Cada atributo se puntúa en una escala del 6 al 10, en incrementos de 0.25. El puntaje total es la suma de los 10 atributos menos los defectos encontrados.</P>
      <Table
        headers={['Atributo', 'Qué mide', 'Puntaje base']}
        rows={[
          ['Fragancia / Aroma', 'Calidad del aroma en seco y húmedo', '6–10'],
          ['Sabor', 'Intensidad y complejidad en boca', '6–10'],
          ['Acabado (Aftertaste)', 'Calidad y duración del retrogusto', '6–10'],
          ['Acidez', 'Vivacidad y calidad de la acidez', '6–10'],
          ['Cuerpo', 'Textura y peso en boca', '6–10'],
          ['Balance', 'Armonía entre todos los atributos', '6–10'],
          ['Uniformidad', 'Consistencia entre las 5 tazas evaluadas', '2 pts/taza'],
          ['Taza limpia', 'Ausencia de defectos', '2 pts/taza'],
          ['Dulzura', 'Presencia de dulzura natural', '2 pts/taza'],
          ['Puntaje global', 'Impresión holística del catador', '6–10'],
        ]}
      />

      <H2>Cómo se cata: la secuencia de 35 minutos</H2>
      <P>El protocolo SCA especifica condiciones exactas: ratio de 8.25g de café molido por cada 150ml de agua a 93°C ± 1°C, mínimo 5 tazas por muestra para detectar consistencia, y temperatura ambiente entre 20 y 25°C sin olores externos.</P>
      <P>La cata empieza con la evaluación en seco (fragancia), continúa con la infusión (aroma húmedo), la ruptura de la costra a los 8 minutos, y la catación propiamente dicha entre los 11 y los 35 minutos mientras el café baja de temperatura. Los defectos se vuelven más evidentes al enfriarse — por eso los catadores evalúan el mismo café dos veces.</P>

      <H2>La escala y lo que significa cada rango</H2>
      <Table
        headers={['Rango', 'Clasificación SCA', 'Descripción']}
        rows={[
          ['< 80 pts', 'No especialidad (commodity)', 'Se vende en bolsa de Nueva York sin diferencial de precio'],
          ['80.0–84.9 pts', 'Muy bueno (Very Good)', 'Especialidad base — ingresa al mercado de cafés de origen'],
          ['85.0–89.9 pts', 'Excelente (Excellent)', 'Microlote premium — precio 3x a 5x vs. commodity'],
          ['90.0+ pts', 'Extraordinario (Outstanding)', 'Taza de Excelencia — subastado a compradores globales'],
        ]}
      />

      <H2>El Cup of Excellence — el proceso más riguroso del mundo</H2>
      <P>Para llegar a ser subastado en el CoE, un café peruano pasa por tres rondas de evaluación: preselección nacional (mínimo 85 pts), panel nacional con Q Graders peruanos (mínimo 87 pts) y panel internacional con Q Graders de todo el mundo para verificar consistencia. En 2025, Cajamarca dominó con 15 de los 30 lotes finalistas. El primer puesto se subastó a US$80.10 por libra — contra un precio commodity de aproximadamente US$1.60 en el mismo período.</P>

      <Quote
        text="Sin puntaje SCA certificado, el caficultor no puede demostrar que su café vale más que el del vecino. Sin datos, no hay precio diferenciado. El Q Grader es el puente entre el trabajo del campo y el precio justo."
        author="Tunay Wasi"
      />

      <H2>Por qué Tunay Wasi pone el puntaje en cada ficha</H2>
      <P>La mayoría de cafés en el mercado interno peruano llega sin puntaje SCA certificado. La cafetería ve origen, variedad y proceso — pero no tiene la herramienta más importante para justificar el precio de su carta. Tunay Wasi incluye el análisis de Q Grader como parte del proceso de incorporación de cada lote, y ese puntaje aparece en la ficha pública del producto.</P>

      <H2>Fuentes</H2>
      <P>Coffee Quality Institute (CQI) — Q Grader Calibration Manual · SCA (Specialty Coffee Association) — Cupping Protocols & Green Coffee Classification · Alliance for Coffee Excellence — Cup of Excellence Peru 2025</P>
    </>
  ),

  'como-almacenar-cafe-correctamente-verde-tostado': (
    <>
      <H2>Lo que está en juego</H2>
      <DataGrid items={[
        { number: '6 pts SCA', label: 'Pérdida posible en 3 meses por mal almacenamiento (de 88 a 82 pts)' },
        { number: '70%', label: 'Aromas volátiles que pierde el café molido en los primeros 15 minutos', source: 'SCA Water Activity' },
        { number: '24+ meses', label: 'Vida útil del café verde en GrainPro vs. 6–9 meses en saco de yute', source: 'GrainPro Inc.' },
        { number: '7–30 días', label: 'Ventana óptima de consumo del café tostado post-desgasificación' },
      ]} />

      <P>El almacenamiento correcto del café no es un detalle — es una parte crítica de la cadena de calidad. Un café que salió de finca con 88 puntos SCA puede llegar a Lima como un café de 82 puntos si el almacenamiento en tránsito fue deficiente. Y un buen café tostado pierde el 70% de sus aromas en los primeros 15 minutos si se muele anticipadamente.</P>

      <H2>Los 6 enemigos del café</H2>
      <Table
        headers={['Enemigo', 'Efecto', 'Umbral crítico']}
        rows={[
          ['Oxígeno', 'Oxidación de aceites aromáticos, rancidez, plano', 'Cualquier exposición prolongada'],
          ['Humedad', 'Moho, pérdida de estructura, defectos', '> 12.5% en verde, > 70% HR ambiental'],
          ['Temperatura', 'Acelera envejecimiento, activa enzimas', '> 25°C constante'],
          ['Luz UV', 'Degrada compuestos aromáticos fotosensibles', 'Luz directa'],
          ['Olores externos', 'El café absorbe aromas del ambiente', 'Cualquier aroma fuerte cercano'],
          ['Plagas', 'Broca, gorgojos, roedores', 'Almacén no hermético'],
        ]}
      />

      <H2>En cada etapa de la cadena</H2>

      <H3>1. En la finca — Café en pergamino</H3>
      <P>La etapa de mayor riesgo si no se controla. El café en pergamino debe mantenerse entre 10.5 y 11.5% de humedad, en sacos de yute o telas respirables (nunca en plástico hermético), elevado del suelo mínimo 15 cm y separado de las paredes al menos 50 cm. Medir la humedad al ingreso y cada 30 días es obligatorio — si sube por encima del 12%, hay que ventilar o resecar inmediatamente.</P>

      <H3>2. Café verde trillado — GrainPro es la diferencia</H3>
      <P>Para el café verde ya trillado, el empaque marca la diferencia entre 9 meses y 24 meses de vida útil. Los sacos GrainPro reducen el intercambio gaseoso en más del 95%. Son la solución estándar de la industria para cafés de especialidad que se transportan largas distancias — incluyendo el trayecto de las regiones cafetaleras a Lima.</P>
      <Table
        headers={['Empaque', 'Vida útil normal', 'Vida útil controlada']}
        rows={[
          ['Saco yute sin barrera', '6–9 meses', '12 meses'],
          ['GrainPro / Ecotact', '18–24 meses', '24–36 meses'],
          ['Vacío + frío (4°C)', '24–36 meses', '36–48 meses'],
        ]}
      />

      <H3>3. Café tostado — La desgasificación importa</H3>
      <P>Al salir del tostador, el café tostado contiene CO2 atrapado por las reacciones de Maillard. En las primeras 24 horas la salida de CO2 es tan intensa que no conviene empacar hermético todavía. Entre las 24 y 72 horas el CO2 aún protege el café de la oxidación — ese es el momento óptimo para consumirlo. Después de 7 días sin barrera adecuada, la oxidación comienza a acelerar.</P>
      <P>Por eso las bolsas de café de especialidad llevan válvula unidireccional: permite salir el CO2 sin que entre oxígeno. Es el detalle más importante del empaque.</P>

      <H3>4. En casa — Los errores más comunes</H3>
      <Table
        headers={['Práctica', 'Correcto o incorrecto']}
        rows={[
          ['Recipiente hermético opaco a temperatura ambiente', '✓ Correcto'],
          ['Moler al momento antes de preparar', '✓ Correcto'],
          ['Consumir en 2–3 semanas tras abrir el empaque', '✓ Correcto'],
          ['Guardar en la refrigeradora', '✗ Incorrecto — absorbe humedad y olores'],
          ['Dejar en la bolsa original abierta', '✗ Incorrecto — se oxida rápido'],
          ['Pre-moler para la hora punta en cafetería', '✗ Incorrecto — pierde 60% de aromas en 15 min'],
        ]}
      />

      <H3>¿Se puede congelar el café tostado?</H3>
      <P>Sí, con condiciones estrictas. Dividir en porciones de una semana (nunca re-congelar), empacar en bolsas herméticas con el mínimo de aire, y al sacar del congelador esperar 1 a 2 horas sin abrir para que llegue a temperatura ambiente antes de usar. La condensación al sacarlo sin esperar es el error más común — arruina el café por la humedad súbita.</P>

      <H2>Resumen end-to-end</H2>
      <Table
        headers={['Etapa', 'Empaque recomendado', 'Temperatura', 'Vida útil']}
        rows={[
          ['Finca — pergamino', 'Saco yute ventilado', '15–22°C', '12–18 meses'],
          ['Verde trillado', 'GrainPro + yute', '15–20°C', '18–24 meses'],
          ['Post-tueste', 'Bolsa con válvula unidireccional', '< 25°C', '3–4 semanas'],
          ['Punto de venta', 'Contenedor hermético opaco', 'Ambiente', '3–5 días de stock'],
          ['Casa consumidor', 'Hermético opaco', '< 25°C', '2–3 semanas tras abrir'],
        ]}
      />

      <H2>Fuentes</H2>
      <P>SCA (Specialty Coffee Association) — Water Activity and Coffee Storage · GrainPro Inc. — Hermetic Storage Technology for Coffee · ICO — Post-Harvest Handling and Storage Guide · MIDAGRI Perú — Manual de Buenas Prácticas Agrícolas para el Café</P>
    </>
  ),

  'cinco-dolores-dueno-cafeteria-specialty-lima': (
    <>
      <H2>El mercado que creció sin infraestructura</H2>
      <DataGrid items={[
        { number: '321', label: 'Tiendas especializadas en café en Perú (2024)', source: 'Euromonitor / Forbes Perú 2025' },
        { number: '+11.5%', label: 'Crecimiento del sector specialty 2019–2024', source: 'Euromonitor International' },
        { number: '85–90%', label: 'Cafeterías specialty sin tostadora propia — compran café ya tostado' },
        { number: '0', label: 'Plataformas digitales B2B para el mercado interno de café verde en Perú' },
      ]} />

      <P>Las cafeterías de especialidad en Perú crecieron 11.5% entre 2019 y 2024 mientras los cafés tradicionales se quedaron estancados. El mercado existe, crece y tiene compradores. El problema es que la infraestructura de abastecimiento no creció al mismo ritmo. Hoy, la coordinación de compra entre una cafetería y su tostador se hace por WhatsApp, llamada telefónica y Excel.</P>
      <P>Estos son los 5 dolores que aparecen una y otra vez en el sector:</P>

      <H2>Dolor 1 — Inconsistencia de suministro</H2>
      <Quote
        text="Se acabó el lote. El tostador llama el miércoles: no hay café hasta el siguiente ciclo — 4 a 8 semanas. La cafetería tiene que cambiar de café de golpe. Sus clientes lo notan."
        author="Patrón recurrente en cafeterías specialty Lima, 2025"
      />
      <P>Este es el dolor más crítico. Una cafetería de especialidad construye su menú y la calibración de su barista alrededor de un lote específico. Cuando ese lote se agota sin previo aviso, hay dos opciones: cambiar de café (y recalibrar todo) o quedarse sin el producto estrella de la carta. Ninguna es buena.</P>
      <P>La raíz del problema es estructural: sin visibilidad del stock en tiempo real, la cafetería no puede anticipar el quiebre. Sin plataforma, la única forma de saber si hay café disponible es llamar.</P>

      <H2>Dolor 2 — Sin trazabilidad para el menú</H2>
      <P>El dueño de una cafetería de especialidad quiere poner en la carta: origen exacto, altitud, variedad, proceso, notas de cata verificadas, puntaje SCA. Lo que hoy recibe es una bolsa con una etiqueta genérica que dice "Café de Cajamarca — tostado medio".</P>
      <P>La trazabilidad no es un lujo estético — es una herramienta de ventas. El cliente que sabe que está tomando una Geisha lavada de 88 puntos de la finca de Ángel Manosalva en Jaén, a 1,800 msnm, paga más y vuelve. El cliente al que le sirven "café de Cajamarca" lo compara con cualquier otro.</P>

      <H2>Dolor 3 — Precio impredecible</H2>
      <P>El precio del café verde está indexado a la bolsa de Nueva York (ICE). Cuando el precio internacional sube — como ocurrió en 2024–2025, con máximos históricos — el tostador traslada ese incremento a la cafetería. La cafetería tiene un menú impreso con precios fijos. El margen se comprime.</P>
      <P>Sin contratos o acuerdos de precio estable, la cafetería no puede planificar su estructura de costos. El café puede representar el 20 al 30% del costo de bebida — una variación del 15% en ese insumo afecta directamente la rentabilidad del negocio.</P>

      <H2>Dolor 4 — Gestión multiproveedor por WhatsApp</H2>
      <P>Una cafetería con oferta de origen variado trabaja con 3 a 5 tostadores diferentes para cubrir distintos orígenes y perfiles. Eso significa 3 a 5 conversaciones de WhatsApp semanales, 3 a 5 coordinaciones de entrega, 3 a 5 facturas, y 3 a 5 procesos de pago distintos.</P>
      <P>Sin plataforma unificada, el dueño o administrador de la cafetería dedica varias horas a la semana a tareas de coordinación logística que no generan valor. Ese tiempo podría ir a atención al cliente, formación del equipo o desarrollo del menú.</P>

      <H2>Dolor 5 — Calibración del barista sin datos</H2>
      <P>Sin ficha técnica del café, el barista calibra a ciegas. Cada lote nuevo tiene su propio perfil de densidad, proceso y tueste — y eso afecta los parámetros de extracción: temperatura del agua, ratio, tiempo, molienda. Un Honey de 86 puntos no extrae igual que un Natural de 84.</P>
      <P>Con la ficha técnica del lote (variedad, proceso, altitud, puntaje SCA, curva de tueste recomendada), el barista tiene un punto de partida. Sin ella, el primer día con un lote nuevo es de ensayo y error — y los primeros cafés del día los paga el cliente.</P>

      <H2>Lo que esto significa para el mercado</H2>
      <Table
        headers={['Factor', 'Estado actual', 'Con Tunay Wasi']}
        rows={[
          ['Visibilidad de stock', 'Llamar para preguntar', 'Tiempo real en plataforma'],
          ['Trazabilidad de lote', 'Etiqueta genérica', 'Ficha técnica con puntaje SCA'],
          ['Precio', 'Variable semana a semana', 'Precio listado por lote'],
          ['Coordinación de compra', 'WhatsApp con 3–5 proveedores', 'Un pedido, un proceso'],
          ['Soporte técnico', 'Sin datos del lote', 'Ficha de calibración incluida'],
        ]}
      />

      <Quote
        text="El boom de cafeterías specialty en Perú es real. Lo que no ha crecido al mismo ritmo es la infraestructura que las abastece."
        author="Tunay Wasi, análisis de mercado junio 2026"
      />

      <H2>Fuentes</H2>
      <P>Euromonitor International citado en Forbes Perú — "El boom de cafeterías de especialidad en Perú no para", Lucero Chávez Quispe, 24 abril 2025 · Perfect Daily Grind — Peru specialty scene coverage 2024 · Entrevistas sector cafeterías Lima, 2025</P>
    </>
  ),
};
