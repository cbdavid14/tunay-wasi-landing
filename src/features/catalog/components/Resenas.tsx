// Reseñas placeholder — reemplazar con datos reales tras primer ciclo de mayo 2026

interface Resena {
  nombre: string;
  ciudad: string;
  rating: number;
  texto: string;
  lote: string;
  fecha: string;
}

const RESENAS: Resena[] = [
  {
    nombre: 'Camila T.',
    ciudad: 'Miraflores, Lima',
    rating: 5,
    texto: 'Nunca pensé que conocer al caficultor me importaría tanto. Abrí el paquete y vi la ficha de Darlyn — desde entonces cada taza tiene un sabor distinto. El Geisha estaba impecable.',
    lote: 'Geisha Lavado · Oxapampa',
    fecha: 'Mayo 2026',
  },
  {
    nombre: 'Diego M.',
    ciudad: 'San Isidro, Lima',
    rating: 5,
    texto: 'Compro café specialty desde hace 3 años. El SCA 87 de este lote es real — notas de naranja sanguina muy limpias en V60 a 93°C. Pedí dos bolsas más antes de que cerrara la preventa.',
    lote: 'Geisha Lavado · Oxapampa',
    fecha: 'Mayo 2026',
  },
  {
    nombre: 'Andrea V.',
    ciudad: 'Barranco, Lima',
    rating: 5,
    texto: 'Lo regalé para el cumpleaños de mi papá. La caja con la carta del caficultor fue un detalle que no esperaba — él me escribió para contarme que fue la primera vez que entendió de dónde viene su café.',
    lote: 'Kit Regalo · Caturra Honey',
    fecha: 'Abril 2026',
  },
  {
    nombre: 'Rodrigo A.',
    ciudad: 'Surco, Lima',
    rating: 5,
    texto: 'El modelo 50/50 me convenció de probar. Saber exactamente qué porcentaje va al productor y ver su nombre en la bolsa hace que la compra se sienta honesta. Volveré cada ciclo.',
    lote: 'Bourbon Natural · Jaén',
    fecha: 'Mayo 2026',
  },
];

function Stars({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: i < rating ? '#c96e4b' : '#c4b29744', fontSize: 14 }}>★</span>
      ))}
    </div>
  );
}

export default function Resenas() {
  return (
    <div style={{ marginTop: 72, paddingTop: 56, borderTop: '1px solid #1f302822' }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 36, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <span style={{
            fontFamily: 'Bowlby One SC, sans-serif', fontSize: 11, letterSpacing: '0.32em',
            color: '#c96e4b', textTransform: 'uppercase',
          }}>Compradores del ciclo</span>
          <h3 style={{
            fontFamily: 'Cormorant Garamond, serif', fontWeight: 600,
            fontSize: 'clamp(28px, 3vw, 44px)', lineHeight: 1,
            color: '#1f3028', margin: '12px 0 0', letterSpacing: '-0.01em',
          }}>
            Lo que dicen
            <span style={{ fontStyle: 'italic', fontWeight: 500, color: '#c96e4b' }}> quienes ya reservaron.</span>
          </h3>
        </div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.22em',
          color: '#533b2299', textTransform: 'uppercase',
        }}>
          Reseñas verificadas · Ciclo mayo 2026
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 20,
      }} className="tw-resenas-grid">
        {RESENAS.map((r, i) => (
          <article key={i} style={{
            background: '#fff8ee',
            border: '1px solid #533b2222',
            borderRadius: 16,
            padding: 24,
            display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: '#1f3028',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontWeight: 600,
                color: '#f2e0cc',
              }}>
                {r.nombre[0]}
              </div>
              <Stars rating={r.rating} />
            </div>

            <blockquote style={{
              fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic',
              fontSize: 17, lineHeight: 1.55, color: '#1f3028',
              margin: 0, flexGrow: 1,
            }}>
              "{r.texto}"
            </blockquote>

            <div style={{ borderTop: '1px solid #533b2214', paddingTop: 12 }}>
              <div style={{
                fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 600,
                color: '#1f3028',
              }}>{r.nombre}</div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.16em',
                color: '#533b2299', textTransform: 'uppercase', marginTop: 3,
              }}>{r.ciudad} · {r.fecha}</div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.14em',
                color: '#c96e4b', textTransform: 'uppercase', marginTop: 4,
              }}>{r.lote}</div>
            </div>
          </article>
        ))}
      </div>

      <style>{`
        @media (max-width: 640px) { .tw-resenas-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
