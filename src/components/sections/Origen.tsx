import CoffeeBranch from '@/components/decor/CoffeeBranch';

export default function Origen() {
  return (
    <section id="origen" style={{ position: 'relative', padding: '100px 36px', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', bottom: '-8%', left: '-6%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, #8faf8a55 0%, #8faf8a00 70%)', filter: 'blur(28px)', zIndex: 0 }} />
      <div className="tw-origen-decor" style={{ position: 'absolute', right: -10, bottom: 40, width: 160, zIndex: 1, opacity: 0.55 }}>
        <CoffeeBranch flip />
      </div>

      <div style={{ maxWidth: 1320, margin: '0 auto', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '0.42fr 0.58fr', gap: 64, alignItems: 'start' }} className="tw-2col">

          {/* columna izquierda — imagen + título */}
          <div>
            <span style={{ fontFamily: 'var(--tw-font-label)', fontSize: 11, letterSpacing: '0.32em', color: 'var(--tw-terra)', textTransform: 'uppercase' }}>01 — Origen</span>
            <h2 style={{ fontFamily: 'var(--tw-font-display)', fontWeight: 700, fontSize: 'clamp(32px, 4vw, 58px)', lineHeight: 1.02, color: 'var(--tw-text)', margin: '16px 0 8px', letterSpacing: '-0.01em' }}>
              Tunay Wasi:<br />
              <span style={{ fontStyle: 'italic', fontWeight: 500 }}>la verdadera casa.</span>
            </h2>
            <p style={{ fontFamily: 'var(--tw-font-data)', fontSize: 10, letterSpacing: '0.22em', color: 'var(--tw-text-muted)', textTransform: 'uppercase', margin: '0 0 20px', opacity: 0.4 }}>quechua · norte del Perú</p>
            <div style={{ border: '1px solid #1f302822', borderRadius: 'var(--tw-radius-xl)', overflow: 'hidden', boxShadow: '0 18px 40px -16px #533b2255' }}>
              <img src="/imgs/tunay-wasi-origen-2.png" alt="Tunay Wasi · finca" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>
          </div>

          {/* columna derecha — historia del fundador */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 36 }}>
            <div style={{ fontFamily: 'var(--tw-font-label)', fontSize: 10, letterSpacing: '0.28em', color: 'var(--tw-text-muted)', textTransform: 'uppercase' }}>De la finca al código</div>
            <h3 style={{ fontFamily: 'var(--tw-font-display)', fontSize: 'clamp(22px, 3vw, 32px)', color: 'var(--tw-text)', margin: 0, lineHeight: 1.05 }}>
              Soy <em style={{ color: 'var(--tw-terra)' }}>Danny Santa Cruz</em>, y crecí entre cafetales.
            </h3>
            <p style={{ fontFamily: 'var(--tw-font-body)', fontSize: 14, lineHeight: 1.7, color: 'var(--tw-text-muted)', margin: 0 }}>
              Crecí en la <strong style={{ color: 'var(--tw-terra)' }}>Finca Vista Hermosa</strong> de mi familia, en Jaén, Perú — donde desde pequeño vi cosechar café de especialidad de altísima calidad.
            </p>
            <p style={{ fontFamily: 'var(--tw-font-body)', fontSize: 14, lineHeight: 1.7, color: 'var(--tw-text-muted)', margin: 0 }}>
              Pero también vi cómo otras industrias usaban tecnología para eliminar intermediarios y pagar mejor al origen. En el café nadie lo había hecho: <strong style={{ color: 'var(--tw-text)' }}>mi familia — como miles de productores — rara vez recibía más del 20 % del valor</strong> que llegaba al consumidor.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 15 }}>
              <div>
                <div style={{ fontFamily: 'var(--tw-font-body)', fontSize: 14, fontWeight: 600, color: 'var(--tw-text)', marginBottom: 8, letterSpacing: '0.02em' }}>La solución: Tunay Wasi</div>
                <div style={{ fontFamily: 'var(--tw-font-body)', fontSize: 14, lineHeight: 1.6, color: 'var(--tw-text-muted)' }}>Conectamos directamente a quien produce café de especialidad con quien lo disfruta. Sin intermediarios. El caficultor recibe el mayor porcentaje según la calidad de su café.</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px', borderRadius: 'var(--tw-radius-sm)', background: '#8faf8a22', border: '1px solid #8faf8a44', marginTop: 8 }}>
                  <span style={{ fontFamily: 'var(--tw-font-data)', fontSize: 13, fontWeight: 700, color: 'var(--tw-sage)', flexShrink: 0 }}>SCA+</span>
                  <span style={{ fontFamily: 'var(--tw-font-body)', fontSize: 11, color: 'var(--tw-text-muted)' }}>Más puntaje = más pago al caficultor</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px', borderRadius: 'var(--tw-radius-sm)', background: '#8faf8a22', border: '1px solid #8faf8a44', marginTop: 6 }}>
                  <span style={{ fontFamily: 'var(--tw-font-data)', fontSize: 13, fontWeight: 700, color: 'var(--tw-sage)', flexShrink: 0 }}>100%</span>
                  <span style={{ fontFamily: 'var(--tw-font-body)', fontSize: 11, color: 'var(--tw-text-muted)' }}>Distribución visible en cada producto</span>
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--tw-font-body)', fontSize: 14, fontWeight: 600, color: 'var(--tw-text)', marginBottom: 8, letterSpacing: '0.02em' }}>Compra directa</div>
                <div style={{ fontFamily: 'var(--tw-font-body)', fontSize: 14, lineHeight: 1.6, color: 'var(--tw-text-muted)' }}>Sin acopiadores, sin comisiones intermedias. Pagamos a la finca antes de que el grano viaje.</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--tw-font-body)', fontSize: 14, fontWeight: 600, color: 'var(--tw-text)', marginBottom: 8, letterSpacing: '0.02em' }}>Café de especialidad</div>
                <div style={{ fontFamily: 'var(--tw-font-body)', fontSize: 14, lineHeight: 1.6, color: 'var(--tw-text-muted)' }}>Lotes con puntaje SCA mayor a 82 — todos cosechados a mano, en altura, en parcelas pequeñas.</div>
              </div>
            </div>
            <br/>
            <div style={{ borderLeft: '3px solid var(--tw-terra)', paddingLeft: 24 }}>
              <p style={{ fontFamily: 'var(--tw-font-display)', fontSize: 20, fontStyle: 'italic', color: 'var(--tw-text)', margin: 0, lineHeight: 1.35 }}>
                "No es solo un negocio para mí. Es honrar el trabajo de mi familia y de miles de caficultores peruanos que merecen un trato justo."
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignSelf: 'flex-end', textAlign: 'right' }}>
                <span style={{ fontFamily: 'var(--tw-font-display)', fontWeight: 600, fontSize: 20, color: 'var(--tw-terra)' }}>— Danny Santa Cruz</span>
                <span style={{ fontFamily: 'var(--tw-font-data)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--tw-text-muted)', textTransform: 'uppercase', opacity: 0.6 }}>Fundador · Ing. de Software · Hijo de caficultores</span>
              </div>
            </div>
          </div>

        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .tw-origen-decor { display: none !important; }
        }
      `}</style>
    </section>
  );
}
