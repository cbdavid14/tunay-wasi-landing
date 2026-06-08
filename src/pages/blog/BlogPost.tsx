import { useParams, useNavigate } from 'react-router-dom';
import { getPostBySlug } from '@/data/blog/posts';
import { POST_CONTENT } from '@/data/blog/postContent';
import Nav from '@/components/layout/Nav';
import SupplyNav from '@/features/negocios/components/SupplyNav';

const NavComponent = import.meta.env.VITE_APP_TARGET === 'negocios' ? SupplyNav : Nav;

const C = {
  green: '#1f3028', cream: '#f2e0cc', terra: '#c96e4b',
  sage: '#8faf8a', tan: '#c4b297', brown: '#533b22',
};

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const post = slug ? getPostBySlug(slug) : undefined;
  const content = slug ? POST_CONTENT[slug] : undefined;

  if (!post || !content) {
    return (
      <div style={{ background: '#f7f3ee', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.tan, marginBottom: 16 }}>Artículo no encontrado.</p>
          <button onClick={() => navigate('/blog')} style={{ background: C.terra, color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            ← Volver al blog
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#f7f3ee', minHeight: '100vh' }}>
      <NavComponent />

      {/* Hero con imagen */}
      <div style={{ position: 'relative', height: 400, overflow: 'hidden', marginTop: 0 }}>
        {post.coverImage && (
          <img src={post.coverImage} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.4)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${C.green}cc, transparent)` }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 40px 40px', maxWidth: 900, margin: '0 auto' }}>
          <button
            onClick={() => navigate('/blog')}
            style={{ background: 'transparent', border: 'none', color: C.sage, fontFamily: 'Montserrat', fontSize: 12, cursor: 'pointer', marginBottom: 16, padding: 0 }}
          >
            ← Blog
          </button>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <span style={{ background: `${C.terra}30`, color: C.terra, fontFamily: 'Montserrat', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 1 }}>
              {post.category}
            </span>
            <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, alignSelf: 'center' }}>
              {post.readingTime} min · {new Date(post.date).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <h1 style={{ fontFamily: 'Cormorant Garamond', fontSize: 'clamp(26px,3.5vw,42px)', fontWeight: 700, color: C.cream, margin: 0, lineHeight: 1.15 }}>
            {post.title}
          </h1>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>

        {/* Descripción destacada */}
        <p style={{
          fontFamily: 'Cormorant Garamond', fontSize: 20, color: C.brown, lineHeight: 1.7,
          borderLeft: `3px solid ${C.terra}`, paddingLeft: 20, marginBottom: 40,
        }}>
          {post.description}
        </p>

        {/* Cuerpo del artículo */}
        <div style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.brown, lineHeight: 1.8 }}>
          {content}
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 40, paddingTop: 24, borderTop: `1px solid ${C.tan}30` }}>
          {post.tags.map(tag => (
            <span key={tag} style={{
              background: `${C.tan}20`, color: C.tan,
              fontFamily: 'Montserrat', fontSize: 11, padding: '4px 12px', borderRadius: 20,
            }}>
              #{tag}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div style={{ marginTop: 48, background: C.green, borderRadius: 14, padding: '36px 40px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Montserrat', fontSize: 10, letterSpacing: 3, color: C.sage, margin: '0 0 8px', textTransform: 'uppercase' }}>
            Tunay Wasi
          </p>
          <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.cream, margin: '0 0 12px' }}>
            La plataforma que conecta al caficultor con tu tostadora.
          </h3>
          <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, marginBottom: 24 }}>
            Lotes reales de Pasco, Cusco, Junín y Amazonas. Puntaje SCA certificado. Precio transparente.
          </p>
          <a href="/marketplace" style={{
            background: C.terra, color: 'white', borderRadius: 8, padding: '14px 32px',
            fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'inline-block',
          }}>
            Ver lotes disponibles →
          </a>
        </div>
      </div>
    </div>
  );
}
