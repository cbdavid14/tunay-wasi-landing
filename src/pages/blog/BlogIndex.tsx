import { useState } from 'react';
import { BLOG_POSTS } from '@/data/blog/posts';
import { useNavigate } from 'react-router-dom';
import Nav from '@/components/layout/Nav';
import SupplyNav from '@/features/negocios/components/SupplyNav';

const NavComponent = import.meta.env.VITE_APP_TARGET === 'negocios' ? SupplyNav : Nav;

const C = {
  green: '#1f3028', cream: '#f2e0cc', terra: '#c96e4b',
  sage: '#8faf8a', tan: '#c4b297', brown: '#533b22',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Mercado': C.sage,
  'Plataforma': C.terra,
  'Caficultor': '#d6b15a',
  'Calidad': C.tan,
};

const ALL_CATEGORIES = ['Todos', ...Array.from(new Set(BLOG_POSTS.map(p => p.category)))];

const HERO_STATS = [
  { number: '321', label: 'cafeterías specialty en Perú' },
  { number: '223k', label: 'familias cafetaleras' },
  { number: '5–9%', label: 'captura el caficultor del precio final' },
];

export default function BlogIndex() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('Todos');

  const filtered = activeCategory === 'Todos'
    ? BLOG_POSTS
    : BLOG_POSTS.filter(p => p.category === activeCategory);

  return (
    <div style={{ background: '#f7f3ee', minHeight: '100vh' }}>
      <NavComponent />

      {/* Hero con imagen de fondo */}
      <div style={{ position: 'relative', minHeight: 480, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>
        {/* Imagen de fondo */}
        <img
          src="https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=1600&q=80"
          alt="Café peruano"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.32)' }}
        />
        {/* Gradiente doble */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, ${C.green}bb 0%, transparent 55%), linear-gradient(to top, ${C.green}ee 0%, transparent 60%)` }} />

        {/* Contenido del hero */}
        <div style={{ position: 'relative', maxWidth: 960, margin: '0 auto', padding: '120px 40px 56px', width: '100%', boxSizing: 'border-box' }}>
          <p style={{ fontFamily: 'Montserrat', fontSize: 11, letterSpacing: 4, color: C.sage, marginBottom: 14, textTransform: 'uppercase' }}>
            Blog · Tunay Wasi
          </p>
          <h1 style={{ fontFamily: 'Cormorant Garamond', fontSize: 'clamp(34px,4.5vw,58px)', fontWeight: 700, color: C.cream, margin: '0 0 18px', lineHeight: 1.1, maxWidth: 620 }}>
            El café peruano<br />explicado con datos reales.
          </h1>
          <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.tan, maxWidth: 500, lineHeight: 1.75, margin: '0 0 48px' }}>
            Mercado, cadena de valor, catación, trazabilidad.<br />
            Todo lo que necesitas saber sobre el café de especialidad en el Perú.
          </p>

          {/* Stats en el hero */}
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            {HERO_STATS.map(s => (
              <div key={s.label} style={{ borderLeft: `2px solid ${C.terra}`, paddingLeft: 14 }}>
                <div style={{ fontFamily: 'Cormorant Garamond', fontSize: 34, fontWeight: 700, color: C.cream, lineHeight: 1 }}>
                  {s.number}
                </div>
                <div style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, marginTop: 4, maxWidth: 130, lineHeight: 1.4 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Barra de categorías */}
      <div style={{ background: C.green, borderBottom: `1px solid ${C.cream}10` }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 40px', display: 'flex', gap: 4, overflowX: 'auto' }}>
          {ALL_CATEGORIES.map(cat => {
            const isActive = cat === activeCategory;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'Montserrat', fontSize: 12, fontWeight: isActive ? 700 : 500,
                  color: isActive ? C.terra : C.tan,
                  padding: '16px 18px',
                  borderBottom: isActive ? `2px solid ${C.terra}` : '2px solid transparent',
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                  transition: 'all 0.2s', whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = C.cream; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = C.tan; }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Artículos */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ display: 'grid', gap: 28 }}>
          {filtered.map(post => (
            <article
              key={post.slug}
              onClick={() => navigate(`/blog/${post.slug}`)}
              style={{
                background: 'white', borderRadius: 14, overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)', cursor: 'pointer',
                display: 'grid', gridTemplateColumns: '280px 1fr',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(0,0,0,0.10)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';
              }}
            >
              {/* Imagen */}
              {post.coverImage && (
                <div style={{ overflow: 'hidden', maxHeight: 200 }}>
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.05)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)'; }}
                  />
                </div>
              )}

              {/* Contenido */}
              <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <span style={{
                      background: `${CATEGORY_COLORS[post.category] ?? C.tan}20`,
                      color: CATEGORY_COLORS[post.category] ?? C.tan,
                      fontFamily: 'Montserrat', fontSize: 10, fontWeight: 700,
                      padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 1,
                    }}>
                      {post.category}
                    </span>
                    <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, alignSelf: 'center' }}>
                      {post.readingTime} min de lectura
                    </span>
                  </div>

                  <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, fontWeight: 700, color: C.brown, margin: '0 0 10px', lineHeight: 1.25 }}>
                    {post.title}
                  </h2>
                  <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, lineHeight: 1.65, margin: 0 }}>
                    {post.description}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
                  <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan }}>
                    {new Date(post.date).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                  <span style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, color: C.terra }}>
                    Leer artículo →
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* CTA plataforma */}
        <div style={{
          marginTop: 56, background: C.green, borderRadius: 16, padding: '40px 40px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ fontFamily: 'Montserrat', fontSize: 10, letterSpacing: 3, color: C.sage, margin: '0 0 6px', textTransform: 'uppercase' }}>
              Tunay Wasi · Plataforma
            </p>
            <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 26, color: C.cream, margin: '0 0 8px' }}>
              ¿Eres tostadora o cafetería en Lima?
            </h3>
            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, margin: 0 }}>
              Compra café verde directamente del caficultor. Con puntaje SCA y trazabilidad completa.
            </p>
          </div>
          <a
            href="/marketplace"
            style={{
              background: C.terra, color: 'white', borderRadius: 8, padding: '14px 28px',
              fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, textDecoration: 'none',
              whiteSpace: 'nowrap', marginLeft: 32,
            }}
          >
            Ver lotes disponibles →
          </a>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          article { grid-template-columns: 1fr !important; }
          article > div:first-child { max-height: 180px; }
        }
      `}</style>
    </div>
  );
}
