export type ProductStatus = 'en_venta' | 'pre_venta' | 'agotado';
export type OrderEstado = 'entregado' | 'en_ruta' | 'por_verificar' | 'preparando';

export interface User {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  direccion: string;
  distrito: string;
  puntos: number;
  nivel: string;
  pedidosTotales: number;
  miembroDesde: string;
  codigoReferido: string;
  displayName: string;
}

export interface PortalProduct {
  id: string;
  caficultor: string;
  variedad: string;
  origen: string;
  region: string;
  proceso: string;
  altitud: number;
  perfil: string[];
  sca: number;
  precio: number;
  status: ProductStatus;
  stock: number;
  tone: string;
}

export interface OrderItem {
  productId: string;
  nombre: string;
  molienda: string;
  cantidad: number;
  precio: number;
}

export interface Order {
  id: string;
  firestoreId?: string;
  fecha: string;
  total: number;
  estado: OrderEstado;
  items: OrderItem[];
  caficultorId: string;
}

export interface CartItem extends PortalProduct {
  molienda: string;
  cantidad: number;
}

export const PORTAL_DATA = {
  user: {
    nombre: 'Valeria',
    apellido: 'Campos',
    email: 'valeria.campos@gmail.com',
    telefono: '987 654 321',
    direccion: 'Av. Larco 345, dpto 802',
    distrito: 'Miraflores',
    puntos: 1240,
    nivel: 'Catador',
    pedidosTotales: 8,
    miembroDesde: 'Ene 2025',
    codigoReferido: 'VALECAFE10',
    displayName: 'Valeria Campos',
  } satisfies User,

  moliendas: ['En Grano', 'Espresso', 'Prensa Francesa', 'Gota a Gota'],

  products: [
    {
      id: 'tw-geisha',
      caficultor: 'Aydee Rojas',
      variedad: 'Geisha Honey',
      origen: 'Jaén',
      region: 'Cajamarca',
      proceso: 'Red Honey',
      altitud: 1500,
      perfil: ['Frutal', 'Miel', 'Floral'],
      sca: 89,
      precio: 52,
      status: 'en_venta' as ProductStatus,
      stock: 14,
      tone: 'gold',
    },
    {
      id: 'tw-caturra',
      caficultor: 'Aydee Rojas',
      variedad: 'Caturra Honey',
      origen: 'Jaén',
      region: 'Cajamarca',
      proceso: 'Yellow Honey',
      altitud: 1480,
      perfil: ['Dulce', 'Caramelo', 'Cítrico'],
      sca: 86,
      precio: 42,
      status: 'en_venta' as ProductStatus,
      stock: 5,
      tone: 'green',
    },
    {
      id: 'tw-bourbon',
      caficultor: 'Don Faustino Tello',
      variedad: 'Bourbon Lavado',
      origen: 'Lamas',
      region: 'San Martín',
      proceso: 'Lavado',
      altitud: 1620,
      perfil: ['Chocolate', 'Panela', 'Nuez'],
      sca: 85,
      precio: 38,
      status: 'pre_venta' as ProductStatus,
      stock: 0,
      tone: 'cacao',
    },
  ] satisfies PortalProduct[],

  orders: [
    {
      id: 'TW-2041',
      fecha: '28 May 2026',
      total: 114,
      estado: 'en_ruta' as OrderEstado,
      caficultorId: 'aydee',
      items: [
        { productId: 'tw-geisha', nombre: 'Geisha Honey', molienda: 'En Grano', cantidad: 2, precio: 52 },
        { productId: 'tw-caturra', nombre: 'Caturra Honey', molienda: 'Espresso', cantidad: 1, precio: 42 },
      ],
    },
    {
      id: 'TW-2038',
      fecha: '12 May 2026',
      total: 84,
      estado: 'entregado' as OrderEstado,
      caficultorId: 'aydee',
      items: [
        { productId: 'tw-geisha', nombre: 'Geisha Honey', molienda: 'Prensa Francesa', cantidad: 1, precio: 52 },
        { productId: 'tw-bourbon', nombre: 'Bourbon Lavado', molienda: 'En Grano', cantidad: 1, precio: 38 },
      ],
    },
    {
      id: 'TW-2035',
      fecha: '02 May 2026',
      total: 52,
      estado: 'por_verificar' as OrderEstado,
      caficultorId: 'aydee',
      items: [
        { productId: 'tw-geisha', nombre: 'Geisha Honey', molienda: 'Gota a Gota', cantidad: 1, precio: 52 },
      ],
    },
  ] satisfies Order[],

  caficultores: {
    aydee: {
      id: 'aydee',
      nombre: 'Aydee Rojas',
      finca: 'Finca Vista Hermosa',
      ubicacion: 'Jaén, Cajamarca',
      altitud: 1500,
      familia: '3 generaciones cultivando café',
      historia: 'Aydee heredó las 2.5 hectáreas de Vista Hermosa de su madre. Cultiva Geisha y Caturra en honey process bajo sombra de guabas, a 1500 msnm. Cada cosecha la procesa a mano y la seca en camas africanas durante 18 días.',
      cata: ['Frutal', 'Miel de caña', 'Floral', 'Acidez cítrica viva', 'Cuerpo sedoso'],
      mensaje: '«Gracias por elegir mi café. Cada grano lo cosechamos en familia, pensando en la taza que llegará a tu mesa. Un abrazo desde la montaña.»',
    },
  },

  distritos: [
    'Miraflores', 'San Isidro', 'Barranco', 'Surco', 'San Borja',
    'La Molina', 'Magdalena', 'Jesús María', 'Lince', 'Pueblo Libre',
    'San Miguel', 'Surquillo', 'Chorrillos',
  ],

  sub: {
    cantidades: [
      { id: '250g', label: '250 g', base: 44 },
      { id: '500g', label: '500 g', base: 80 },
      { id: '1kg', label: '1 kg', base: 150 },
    ],
    frecuencias: [
      { id: 'quincenal', label: 'Quincenal', perMonth: 2 },
      { id: 'mensual', label: 'Mensual', perMonth: 1 },
    ],
    perfiles: ['Dulce', 'Frutal', 'Cítrico', 'Chocolate'],
    descuento: 0.1,
  },

  envioLima: 10,

  activeSub: {
    producto: 'Blend Amazónico',
    cantidad: '500g',
    frecuencia: 'mensual',
    proximoEnvio: '08 Jun 2026',
    proximoCobro: '06 Jun 2026',
    precio: 72,
  },

  tracking: {
    pedido: 'TW-2041',
    estimada: '04 Jun 2026',
    courier: 'Olva Courier · Lima',
    pasoActual: 4,
    pasos: [
      { n: 1, label: 'Recibido',   desc: 'Pedido confirmado',         hora: '28 May · 09:14' },
      { n: 2, label: 'Preparando', desc: 'Tostado y molienda',        hora: '28 May · 16:40' },
      { n: 3, label: 'Empacado',   desc: 'Sellado al vacío',          hora: '29 May · 11:05' },
      { n: 4, label: 'Enviado',    desc: 'En ruta con el courier',    hora: '02 Jun · 08:30' },
      { n: 5, label: 'Entregado',  desc: 'Llega a tu dirección',      hora: 'Est. 04 Jun' },
    ],
  },

  niveles: [
    { id: 'explorador', label: 'Explorador', min: 0,    icon: '☕' },
    { id: 'catador',    label: 'Catador',    min: 1000, icon: '☕☕' },
    { id: 'embajador',  label: 'Embajador',  min: 1500, icon: '☕☕☕' },
    { id: 'maestro',    label: 'Maestro Cafetero', min: 3000, icon: '☕☕☕☕' },
  ],

  puntosHistorial: [
    { fecha: '28 May 2026', concepto: 'Compra · Pedido TW-2041', pts: 114 },
    { fecha: '21 May 2026', concepto: 'Referido exitoso · Lucía M.', pts: 100 },
    { fecha: '12 May 2026', concepto: 'Compra · Pedido TW-2038', pts: 84 },
    { fecha: '05 May 2026', concepto: 'Reseña de microlote', pts: 40 },
    { fecha: '02 May 2026', concepto: 'Canje · Cupón S/15', pts: -150 },
    { fecha: '28 Abr 2026', concepto: 'Compra · Pedido TW-2035', pts: 52 },
    { fecha: '15 Abr 2026', concepto: 'Bono de bienvenida', pts: 200 },
  ],

  sorteos: [
    { id: 's1', premio: 'Kit Barista V60 + 1kg Geisha', desc: 'Dripper Hario, filtros, balanza y un kilo de nuestro Geisha Honey.', cierra: '30 Jun 2026', ticketsUsados: 3, costoTicket: 50, tone: 'gold' },
    { id: 's2', premio: 'Viaje a la finca en Jaén', desc: 'Dos noches en Finca Vista Hermosa con Aydee, todo incluido.', cierra: '15 Ago 2026', ticketsUsados: 1, costoTicket: 80, tone: 'green' },
  ],

  referidos: {
    exitosos: 3,
    puntosGanados: 300,
    lista: [
      { nombre: 'Lucía M.', fecha: '21 May 2026', estado: 'completo', pts: 100 },
      { nombre: 'Diego R.', fecha: '08 May 2026', estado: 'completo', pts: 100 },
      { nombre: 'Camila S.', fecha: '26 Abr 2026', estado: 'completo', pts: 100 },
      { nombre: 'Andrés V.', fecha: '22 May 2026', estado: 'pendiente', pts: 0 },
    ],
  },

  cupones: [
    { id: 'c1', codigo: 'FRESCO20', tipo: 'pct', valor: 20, desc: '20% en tu próxima compra de microlotes', vence: '07 Jun 2026', cond: 'Compra mínima S/ 60', estado: 'disponible' },
    { id: 'c2', codigo: 'ENVIOGRATIS', tipo: 'envio', valor: 0, desc: 'Envío gratis dentro de Lima Metropolitana', vence: '30 Jun 2026', cond: 'Sin mínimo de compra', estado: 'disponible' },
    { id: 'c3', codigo: 'SOCIA15', tipo: 'soles', valor: 15, desc: 'S/ 15 de descuento de bienvenida', vence: '02 May 2026', cond: 'Canjeado en pedido TW-2035', estado: 'usado' },
  ],

  perfilOpts: {
    molienda: ['En Grano', 'Espresso', 'Prensa Francesa', 'Gota a Gota', 'Moka'],
    intensidad: ['Suave', 'Media', 'Intensa'],
    origen: ['Cualquiera', 'Cajamarca', 'San Martín', 'Cusco', 'Amazonas'],
  },
  perfilDefault: { molienda: 'En Grano' as const, intensidad: 'Media' as const, origen: 'Cajamarca' as const },
};
