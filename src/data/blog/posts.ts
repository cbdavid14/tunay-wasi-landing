export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  category: string;
  readingTime: number; // minutos
  tags: string[];
  coverImage?: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'cadena-valor-cafe-peru',
    title: 'La cadena de valor del café peruano: quién gana y quién pierde',
    description: 'El caficultor peruano recibe entre el 5% y el 9% del precio final que paga el consumidor. Analizamos los 6 eslabones de la cadena y por qué el sistema está diseñado así.',
    date: '2026-06-05',
    author: 'Tunay Wasi',
    category: 'Mercado',
    readingTime: 6,
    tags: ['caficultor', 'cadena de valor', 'café peruano', 'especialidad', 'precio justo'],
    coverImage: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=1200',
  },
  {
    slug: 'boom-cafeterias-especialidad-peru-2025',
    title: 'El boom de cafeterías de especialidad en Perú: 321 tiendas y creciendo',
    description: 'Las cafeterías de especialidad en Perú crecieron 11.5% entre 2019 y 2024. Puku Puku, Neira Café Lab y The Coffee lideran la expansión. Pero la infraestructura de abastecimiento sigue siendo WhatsApp.',
    date: '2026-06-05',
    author: 'Tunay Wasi',
    category: 'Mercado',
    readingTime: 5,
    tags: ['cafeterías', 'especialidad', 'Lima', 'Puku Puku', 'Neira', 'mercado café'],
    coverImage: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200',
  },
  {
    slug: 'marketplaces-b2b-cafe-mundo-2026',
    title: 'Los 10 mejores marketplaces B2B de café del mundo — y el gap que nadie cubre en Perú',
    description: 'Algrano, TYPICA, Beyco: las plataformas que revolucionaron el comercio de café verde a nivel global. Ninguna opera en el mercado interno peruano. Ese es el espacio que Tunay Wasi ocupa.',
    date: '2026-06-05',
    author: 'Tunay Wasi',
    category: 'Plataforma',
    readingTime: 8,
    tags: ['marketplace', 'B2B', 'Algrano', 'TYPICA', 'café verde', 'plataforma digital'],
    coverImage: 'https://images.unsplash.com/photo-1509785307050-d4066910ec1e?w=1200',
  },
  {
    slug: 'variedades-cafe-peruano-geisha-typica-bourbon',
    title: 'Geisha, Typica, Bourbon, Caturra: las variedades que producen el café peruano de especialidad',
    description: 'Perú produce cafés con hasta 94 puntos SCA. El secreto está en las variedades, la altitud y el manejo agronómico. Guía completa de las 7 variedades arábica que dominan la escena de especialidad.',
    date: '2026-06-07',
    author: 'Tunay Wasi',
    category: 'Caficultor',
    readingTime: 7,
    tags: ['variedades', 'Geisha', 'Typica', 'Bourbon', 'arábica', 'terroir', 'Cajamarca', 'Cusco'],
    coverImage: 'https://images.unsplash.com/photo-1611854779393-1b2da9d400fe?w=1200',
  },
  {
    slug: 'procesos-postcosecha-lavado-natural-honey-anaerobico',
    title: 'Lavado, Natural, Honey, Anaeróbico: cómo el proceso post-cosecha define el sabor de tu taza',
    description: 'El mismo café puede saber a fruta madura, a flores o a chocolate dependiendo de cómo se procesó. Explicamos los 4 procesos principales y por qué el caficultor que los domina cobra más.',
    date: '2026-06-07',
    author: 'Tunay Wasi',
    category: 'Caficultor',
    readingTime: 6,
    tags: ['post-cosecha', 'proceso lavado', 'natural', 'honey', 'anaeróbico', 'perfil de taza'],
    coverImage: 'https://images.unsplash.com/photo-1559525839-8f275eef9d53?w=1200',
  },
  {
    slug: 'que-significa-puntaje-sca-cafe-especialidad',
    title: '¿Qué significa que un café tenga 87 puntos SCA? Guía para entender la escala de calidad',
    description: 'Un Q Grader evalúa 10 atributos en cada taza: fragancia, acidez, cuerpo, balance, dulzura. Así funciona el protocolo que determina si un café es especialidad — y por qué el puntaje cambia el precio.',
    date: '2026-06-09',
    author: 'Tunay Wasi',
    category: 'Calidad',
    readingTime: 7,
    tags: ['SCA', 'Q Grader', 'puntaje', 'catación', 'especialidad', 'protocolo'],
    coverImage: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=1200',
  },
  {
    slug: 'como-almacenar-cafe-correctamente-verde-tostado',
    title: 'Cómo almacenar café correctamente: desde la finca hasta tu taza',
    description: 'Un café de 88 puntos mal almacenado puede degradarse a 82 en tres meses. Guía completa del almacenamiento en cada etapa: finca en pergamino, grano verde, post-tueste y en casa.',
    date: '2026-06-09',
    author: 'Tunay Wasi',
    category: 'Calidad',
    readingTime: 6,
    tags: ['almacenamiento', 'café verde', 'café tostado', 'GrainPro', 'desgasificación', 'frescura'],
    coverImage: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=1200',
  },
  {
    slug: 'cinco-dolores-dueno-cafeteria-specialty-lima',
    title: 'Los 5 dolores del dueño de cafetería de especialidad en Lima — y por qué el abastecimiento es el mayor',
    description: 'Inconsistencia de suministro, falta de trazabilidad, precio impredecible, gestión de múltiples proveedores por WhatsApp. Los problemas reales que enfrentan las 280 cafeterías specialty de Lima que no tienen tostadora propia.',
    date: '2026-06-10',
    author: 'Tunay Wasi',
    category: 'Mercado',
    readingTime: 5,
    tags: ['cafetería', 'B2B', 'abastecimiento', 'trazabilidad', 'Lima', 'specialty'],
    coverImage: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=1200',
  },
  {
    slug: 'cafe-88-puntos-se-vende-como-commodity',
    title: 'Por qué el café de 88 puntos se vende como commodity',
    description: 'En 1970, George Akerlof explicó con la teoría de los "mercados de limones" por qué los mercados con información asimétrica convergen hacia la mediocridad. El mercado de café verde peruano es un caso de manual.',
    date: '2026-06-10',
    author: 'Tunay Wasi',
    category: 'Economía',
    readingTime: 6,
    tags: ['Akerlof', 'asimetría de información', 'café verde', 'specialty', 'mercado', 'precio justo'],
    coverImage: 'https://images.unsplash.com/photo-1459755486867-b55449bb39ff?w=1200',
  },
  {
    slug: 'mercado-cafe-verde-que-nadie-puede-ver',
    title: 'El mercado de café verde que nadie puede ver',
    description: 'Parker, Van Alstyne y Choudary demostraron en "Platform Revolution" que los negocios más valiosos no producen cosas — crean visibilidad del mercado. El mercado de café verde peruano es invisible. Eso tiene solución.',
    date: '2026-06-10',
    author: 'Tunay Wasi',
    category: 'Plataforma',
    readingTime: 7,
    tags: ['Platform Revolution', 'efectos de red', 'marketplace', 'café verde', 'visibilidad', 'B2B'],
    coverImage: 'https://images.unsplash.com/photo-1511537190424-bbbab87ac5eb?w=1200',
  },
  {
    slug: 'tostador-no-compra-cafe-contrata-certeza',
    title: 'El tostador no compra café — contrata certeza',
    description: 'Clayton Christensen demostró que los clientes no compran productos, contratan soluciones para un trabajo. El trabajo real del tostador no es "conseguir café verde" — es garantizar abastecimiento consistente sin quedarse sin stock en enero.',
    date: '2026-06-10',
    author: 'Tunay Wasi',
    category: 'Mercado',
    readingTime: 7,
    tags: ['Jobs-to-be-Done', 'Christensen', 'tostador', 'abastecimiento', 'certeza', 'specialty'],
    coverImage: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200',
  },
  {
    slug: 'caficultor-tiene-riqueza-que-mercado-no-puede-leer',
    title: 'El caficultor tiene riqueza que el mercado no puede leer',
    description: 'Hernando de Soto describió en "El Misterio del Capital" cómo los países con más riqueza natural generan menos valor porque sus activos no tienen representación formal. El caficultor peruano repite esa paradoja con cada lote que vende como commodity.',
    date: '2026-06-10',
    author: 'Tunay Wasi',
    category: 'Caficultor',
    readingTime: 7,
    tags: ['De Soto', 'capital', 'caficultor', 'trazabilidad', 'documentación', 'specialty'],
    coverImage: 'https://images.unsplash.com/photo-1524350876685-274059332603?w=1200',
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find(p => p.slug === slug);
}
