/**
 * seed-marketplace.mjs
 * Inicializa las colecciones mkt_* en Firestore (alpaso-app / QA)
 * Usa firebase-admin con credenciales del firebase CLI (applicationDefault)
 *
 * Uso:
 *   cd functions && npm install
 *   GOOGLE_APPLICATION_CREDENTIALS="" node ../scripts/seed-marketplace.mjs
 *
 * O más simple — usa el emulador de credenciales del CLI:
 *   node scripts/seed-marketplace.mjs
 */

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({
  credential: applicationDefault(),
  projectId: 'alpaso-app',
});

const db = getFirestore();

// ─── Helpers ────────────────────────────────────────────────────────────────

async function seed(colName, docs) {
  console.log(`\n📦 Seeding ${colName} (${docs.length} docs)...`);
  const batch = db.batch();
  for (const d of docs) {
    batch.set(db.collection(colName).doc(d.id), d);
    console.log(`  ✓ ${d.id}`);
  }
  await batch.commit();
}

const NOW = new Date().toISOString();

// ─── mkt_caficultores ────────────────────────────────────────────────────────

const mktCaficultores = [
  {
    id: 'mkt-caf-001',
    nombreProductor: 'Darlyn Johnn Sánchez Hilario',
    nombreFinca:     'Bello Horizonte',
    region:          'Oxapampa, Pasco',
    departamento:    'Pasco',
    altitud:         '1800',
    variedad:        'Geisha',
    telefono:        '+51928772157',
    email:           'darlyn@example.com',
    fotoUrl:         'https://images.unsplash.com/photo-1559181567-c3190ca9d5db?w=200',
    status:          'aprobado',
    createdAt:       NOW,
  },
  {
    id: 'mkt-caf-002',
    nombreProductor: 'Yolanda Quispe Mamani',
    nombreFinca:     'Lechemayo',
    region:          'La Convención, Cusco',
    departamento:    'Cusco',
    altitud:         '1650',
    variedad:        'Bourbon',
    telefono:        '+51987123456',
    email:           'yolanda@example.com',
    fotoUrl:         'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200',
    status:          'aprobado',
    createdAt:       NOW,
  },
  {
    id: 'mkt-caf-003',
    nombreProductor: 'Marco Antonio Quispe',
    nombreFinca:     'Las Naranjas',
    region:          'Chanchamayo, Junín',
    departamento:    'Junín',
    altitud:         '1400',
    variedad:        'Caturra',
    telefono:        '+51945678901',
    email:           'marco@example.com',
    fotoUrl:         'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    status:          'aprobado',
    createdAt:       NOW,
  },
  {
    id: 'mkt-caf-004',
    nombreProductor: 'Rosa Tarrillo Briones',
    nombreFinca:     'El Paraíso',
    region:          'Bagua, Amazonas',
    departamento:    'Amazonas',
    altitud:         '1920',
    variedad:        'Typica',
    telefono:        '+51934567890',
    email:           'rosa@example.com',
    fotoUrl:         'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200',
    status:          'aprobado',
    createdAt:       NOW,
  },
];

// ─── mkt_lotes ───────────────────────────────────────────────────────────────

const mktLotes = [
  {
    id: 'mkt-CAJ-001-2026',
    caficultorId:         'mkt-caf-001',
    nombreLote:           'Bello Horizonte — Geisha Honey',
    cosecha:              'Junio 2026',
    proceso:              'honey',
    variedad:             'Geisha',
    altitud:              '1,800 msnm',
    region:               'Oxapampa, Pasco',
    puntajeReferencial:   87.5,
    puntajeOficial:       87.5,
    notasSabor:           ['durazno', 'jazmín', 'miel de abeja', 'té blanco'],
    acidez:               8,
    cuerpo:               7,
    balance:              9,
    sacosDisponibles:     10,
    sacosReservados:      4,
    precioOrigenPEN:      480,
    precioVentaPEN:       583,
    muestraDisponible:    true,
    precioMuestraPEN:     18,
    status:               'publicado',
    destacado:            true,
    fotoLoteUrl:          'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=600',
    fotosUrls:            [],
    observacionesAdmin:   'Lote excepcional. Perfil floral muy pronunciado.',
    createdAt:            NOW,
    publicadoAt:          NOW,
    agotadoAt:            null,
  },
  {
    id: 'mkt-CUS-002-2026',
    caficultorId:         'mkt-caf-002',
    nombreLote:           'Lechemayo — Bourbon Natural',
    cosecha:              'Mayo 2026',
    proceso:              'natural',
    variedad:             'Bourbon',
    altitud:              '1,650 msnm',
    region:               'La Convención, Cusco',
    puntajeReferencial:   85.0,
    puntajeOficial:       85.25,
    notasSabor:           ['chocolate amargo', 'ciruela', 'nuez', 'caramelo'],
    acidez:               6,
    cuerpo:               9,
    balance:              8,
    sacosDisponibles:     15,
    sacosReservados:      2,
    precioOrigenPEN:      390,
    precioVentaPEN:       464,
    muestraDisponible:    true,
    precioMuestraPEN:     15,
    status:               'publicado',
    destacado:            false,
    fotoLoteUrl:          'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600',
    fotosUrls:            [],
    observacionesAdmin:   '',
    createdAt:            NOW,
    publicadoAt:          NOW,
    agotadoAt:            null,
  },
  {
    id: 'mkt-JUN-003-2026',
    caficultorId:         'mkt-caf-003',
    nombreLote:           'Las Naranjas — Caturra Lavado',
    cosecha:              'Julio 2026',
    proceso:              'lavado',
    variedad:             'Caturra',
    altitud:              '1,400 msnm',
    region:               'Chanchamayo, Junín',
    puntajeReferencial:   83.0,
    puntajeOficial:       null,
    notasSabor:           ['limón', 'mandarina', 'panela'],
    acidez:               null,
    cuerpo:               null,
    balance:              null,
    sacosDisponibles:     20,
    sacosReservados:      0,
    precioOrigenPEN:      320,
    precioVentaPEN:       null,
    muestraDisponible:    false,
    precioMuestraPEN:     15,
    status:               'en_catacion',
    destacado:            false,
    fotoLoteUrl:          'https://images.unsplash.com/photo-1509785307050-d4066910ec1e?w=600',
    fotosUrls:            [],
    observacionesAdmin:   'Muestra recibida 03-Jun. Q-Grader cata el 06-Jun.',
    createdAt:            NOW,
    publicadoAt:          null,
    agotadoAt:            null,
  },
  {
    id: 'mkt-AMA-004-2026',
    caficultorId:         'mkt-caf-004',
    nombreLote:           'El Paraíso — Typica Anaeróbico',
    cosecha:              'Junio 2026',
    proceso:              'anaerobico',
    variedad:             'Typica',
    altitud:              '1,920 msnm',
    region:               'Bagua, Amazonas',
    puntajeReferencial:   89.0,
    puntajeOficial:       null,
    notasSabor:           ['maracuyá', 'rosa', 'fresas', 'vino'],
    acidez:               null,
    cuerpo:               null,
    balance:              null,
    sacosDisponibles:     6,
    sacosReservados:      0,
    precioOrigenPEN:      550,
    precioVentaPEN:       null,
    muestraDisponible:    false,
    precioMuestraPEN:     20,
    status:               'muestra_enviada',
    destacado:            false,
    fotoLoteUrl:          'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600',
    fotosUrls:            [],
    observacionesAdmin:   'Muestra despachada el 02-Jun desde Bagua por Shalom.',
    createdAt:            NOW,
    publicadoAt:          null,
    agotadoAt:            null,
  },
];

// ─── mkt_tostadoras ──────────────────────────────────────────────────────────

const mktTostadoras = [
  {
    id: 'mkt-tost-001',
    razonSocial:           'Café del Parque S.A.C.',
    nombreComercial:       'Café del Parque',
    ruc:                   '20601234567',
    tipo:                  'tostadora',
    tieneTostadora:        true,
    contactoNombre:        'Andrés Villanueva',
    email:                 'andres@cafedelparque.pe',
    telefono:              '+51987654321',
    direccionEntrega:      'Av. La Mar 456, Miraflores, Lima',
    distritoCoberturaLima: 'Miraflores',
    status:                'aprobado',
    createdAt:             NOW,
  },
  {
    id: 'mkt-tost-002',
    razonSocial:           'Arábica Lima S.R.L.',
    nombreComercial:       'Arábica Lima',
    ruc:                   '20512345678',
    tipo:                  'cafeteria',
    tieneTostadora:        false,
    contactoNombre:        'Sofía Mendoza',
    email:                 'sofia@arabicalima.pe',
    telefono:              '+51976543210',
    direccionEntrega:      'Jr. Colón 280, Barranco, Lima',
    distritoCoberturaLima: 'Barranco',
    status:                'aprobado',
    createdAt:             NOW,
  },
];

// ─── mkt_pedidos ─────────────────────────────────────────────────────────────

const mktPedidos = [
  {
    id: 'mkt-PED-2026-0001',
    loteId:               'mkt-CAJ-001-2026',
    tostadoraId:          'mkt-tost-001',
    caficultorId:         'mkt-caf-001',
    sacosSolicitados:     3,
    kgTotal:              180,
    precioSacoPEN:        583,
    subtotalPEN:          1749,
    igvPEN:               315,
    totalPEN:             2064,
    metodoPago:           'transferencia',
    pagoStatus:           'verificado',
    comprobanteUrl:       null,
    facturaUrl:           null,
    logisticaStatus:      'en_transito',
    notasLogistica:       'Salió de Oxapampa el 28-May. ETA Lima 02-Jun.',
    fechaEntregaEstimada: '2026-06-06',
    pagoCaficultorStatus: 'pendiente',
    pagoCaficultorAt:     null,
    montoCaficultorPEN:   1440,
    createdAt:            NOW,
    updatedAt:            NOW,
  },
  {
    id: 'mkt-PED-2026-0002',
    loteId:               'mkt-CUS-002-2026',
    tostadoraId:          'mkt-tost-002',
    caficultorId:         'mkt-caf-002',
    sacosSolicitados:     2,
    kgTotal:              120,
    precioSacoPEN:        464,
    subtotalPEN:          928,
    igvPEN:               167,
    totalPEN:             1095,
    metodoPago:           'transferencia',
    pagoStatus:           'verificado',
    comprobanteUrl:       null,
    facturaUrl:           null,
    logisticaStatus:      'entregado',
    notasLogistica:       'Entregado en Barranco el 22-May. Peso verificado: 120.4 kg.',
    fechaEntregaEstimada: '2026-05-22',
    pagoCaficultorStatus: 'pagado',
    pagoCaficultorAt:     '2026-05-22T14:00:00Z',
    montoCaficultorPEN:   780,
    createdAt:            NOW,
    updatedAt:            NOW,
  },
];

// ─── mkt_solicitudes_muestra ─────────────────────────────────────────────────

const mktSolicitudes = [
  {
    id: 'mkt-SOL-001',
    loteId:         'mkt-CAJ-001-2026',
    nombreContacto: 'Carmen Rivas',
    empresa:        'Tostería Barranco',
    email:          'carmen@tosteriabarranco.pe',
    telefono:       '+51965432109',
    status:         'despachada',
    createdAt:      NOW,
  },
  {
    id: 'mkt-SOL-002',
    loteId:         'mkt-CUS-002-2026',
    nombreContacto: 'Luis Herrera',
    empresa:        'Café Sagrado',
    email:          'luis@cafesagrado.pe',
    telefono:       '+51954321098',
    status:         'pendiente',
    createdAt:      NOW,
  },
];

// ─── Ejecutar ────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Seed marketplace → alpaso-app (QA)\n');
  console.log('   Prefijo: mkt_\n');

  await seed('mkt_caficultores',         mktCaficultores);
  await seed('mkt_lotes',               mktLotes);
  await seed('mkt_tostadoras',          mktTostadoras);
  await seed('mkt_pedidos',             mktPedidos);
  await seed('mkt_solicitudes_muestra', mktSolicitudes);

  console.log('\n✅ Listo. Colecciones en Firestore:');
  console.log('   mkt_caficultores (4) · mkt_lotes (4) · mkt_tostadoras (2) · mkt_pedidos (2) · mkt_solicitudes_muestra (2)');
  console.log('\n   Corre la app: VITE_APP_TARGET=marketplace npm run dev\n');
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
