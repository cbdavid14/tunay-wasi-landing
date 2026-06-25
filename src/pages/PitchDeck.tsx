import { useEffect, useRef, useState } from 'react';

/* ─── Scroll-reveal hook ─────────────────────────────────────────────── */
function useVisible(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ─── Reveal wrapper ─────────────────────────────────────────────────── */
function Reveal({ children, delay = 0, style }: {
  children: React.ReactNode; delay?: number; style?: React.CSSProperties;
}) {
  const { ref, visible } = useVisible();
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity .9s cubic-bezier(.2,.7,.2,1) ${delay}s, transform .9s cubic-bezier(.2,.7,.2,1) ${delay}s`,
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ─── Design tokens ──────────────────────────────────────────────────── */
const C = {
  bg:         '#0f1a14',
  bgMid:      '#1f3028',
  bgLight:    '#2a3d33',
  cream:      '#f2e0cc',
  tan:        '#c4b297',
  terra:      '#c96e4b',
  sage:       '#8faf8a',
  border:     '#c4b29722',
  borderSage: '#8faf8a44',
};

const T = {
  heading: 'Cormorant Garamond, serif',
  body:    'Montserrat, sans-serif',
  mono:    'JetBrains Mono, monospace',
  bauhaus: 'Bowlby One SC, sans-serif',
};

/* ─── Shared styles ──────────────────────────────────────────────────── */
const section = (bg = C.bgMid): React.CSSProperties => ({
  position: 'relative', overflow: 'hidden',
  padding: '120px 40px', background: bg, color: C.cream,
});

const eyebrow = (color = C.terra): React.CSSProperties => ({
  fontFamily: T.bauhaus, fontSize: 10, letterSpacing: '0.32em',
  color, textTransform: 'uppercase', marginBottom: 20,
});

const h2Style: React.CSSProperties = {
  fontFamily: T.heading, fontWeight: 700,
  fontSize: 'clamp(42px, 5.5vw, 76px)', lineHeight: 1.0,
  letterSpacing: '-0.015em', margin: '0 0 20px', color: C.cream,
};

const bodyText: React.CSSProperties = {
  fontFamily: T.body, fontSize: 15, lineHeight: 1.75, color: C.tan,
};

const card = (accent = C.border): React.CSSProperties => ({
  background: C.bgLight, border: `1px solid ${accent}`,
  borderRadius: 20, padding: '32px 28px',
});

const grid = (cols: string, gap = 24): React.CSSProperties => ({
  display: 'grid', gridTemplateColumns: cols, gap, alignItems: 'start',
});

/* ─── Orb decoration ─────────────────────────────────────────────────── */
function Orb({ color, top, left, right, bottom, size = 600 }: {
  color: string; top?: string|number; left?: string|number;
  right?: string|number; bottom?: string|number; size?: number;
}) {
  return (
    <div style={{
      position: 'absolute', top, left, right, bottom,
      width: size, height: size, borderRadius: '50%',
      background: `radial-gradient(circle, ${color}33 0%, ${color}00 65%)`,
      filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0,
    }} />
  );
}

/* ─── Section: HERO ─────────────────────────────────────────────────── */
function SectionHero() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 80); return () => clearTimeout(t); }, []);

  const fade = (d: number): React.CSSProperties => ({
    opacity: loaded ? 1 : 0,
    transform: loaded ? 'translateY(0)' : 'translateY(22px)',
    transition: `all 1.1s cubic-bezier(.2,.7,.2,1) ${d}s`,
  });

  const metrics = [
    { value: 'US$1,762M', label: 'Exportaciones café Perú 2025 — récord histórico', source: 'MIDAGRI 2026' },
    { value: '17–20%', label: 'Del total exportado son cafés de especialidad', source: 'JNC 2026' },
    { value: '4.3x–10.7x', label: 'Más que el acopiador vía Direct Trade Tunay Wasi', source: 'S/34.65–85.78 vs S/8/kg · MIDAGRI' },
  ];

  return (
    <section style={{
      ...section(C.bg),
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      padding: '0 40px',
    }}>
      <Orb color={C.terra} top="-20%" right="-10%" size={800} />
      <Orb color={C.sage} bottom="-30%" left="-10%" size={640} />

      <div style={{
        position: 'absolute', inset: 0, opacity: 0.07,
        backgroundImage: 'radial-gradient(#c4b29766 1px, transparent 1px)',
        backgroundSize: '28px 28px', pointerEvents: 'none',
      }} />

      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '28px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${C.border}`,
        ...fade(0),
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/brand/logo.png" alt="Tunay Wasi" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          <span style={{ fontFamily: T.bauhaus, fontSize: 11, letterSpacing: '0.22em', color: C.cream }}>TUNAY · WASI</span>
        </div>
        <span style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.2em', color: C.tan, textTransform: 'uppercase' }}>
          Pitch Deck · 2026
        </span>
      </div>

      <div style={{ maxWidth: 1080, margin: '0 auto', width: '100%', position: 'relative', zIndex: 1, paddingTop: 80 }}>
        <div style={fade(0.1)}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '8px 18px', borderRadius: 999,
            background: '#8faf8a1a', border: `1px solid ${C.borderSage}`,
            marginBottom: 32,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.sage }} />
            <span style={{ fontFamily: T.bauhaus, fontSize: 10, letterSpacing: '0.28em', color: C.cream, textTransform: 'uppercase' }}>
              Propuesta para Inversores y Socios Estratégicos
            </span>
          </span>
        </div>

        <h1 style={{
          fontFamily: T.heading, fontWeight: 700,
          fontSize: 'clamp(52px, 7.5vw, 108px)',
          lineHeight: 0.95, letterSpacing: '-0.02em',
          margin: 0, color: C.cream,
          ...fade(0.2),
        }}>
          El mercado<br />
          <span style={{ fontStyle: 'italic', fontWeight: 500, color: C.terra }}>directo</span>{' '}del café<br />
          <span style={{ fontStyle: 'italic', fontWeight: 500, color: C.sage }}>peruano.</span>
        </h1>

        <p style={{
          fontFamily: T.body, fontSize: 17, lineHeight: 1.7,
          color: C.tan, maxWidth: 580, marginTop: 36,
          ...fade(0.35),
        }}>
          Tunay Wasi es la plataforma de distribución que el caficultor de especialidad no tiene.
          Conecta el origen con cafeterías, consumidores urbanos y exportación — sin acopiadores,
          sin regateo, con trazabilidad total desde la finca.
        </p>

        <div style={{
          display: 'flex', gap: 0, marginTop: 56, flexWrap: 'wrap',
          border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden',
          ...fade(0.5),
        }}>
          {metrics.map((m, i) => (
            <div key={m.value} style={{
              flex: '1 1 200px', padding: '28px 32px',
              borderRight: i < metrics.length - 1 ? `1px solid ${C.border}` : 'none',
              background: i === 1 ? '#8faf8a0d' : 'transparent',
            }}>
              <div style={{ fontFamily: T.heading, fontWeight: 700, fontSize: 42, lineHeight: 1, color: i === 1 ? C.sage : C.cream }}>
                {m.value}
              </div>
              <div style={{ fontFamily: T.body, fontSize: 12, color: C.tan, marginTop: 8, lineHeight: 1.5 }}>{m.label}</div>
              <div style={{ fontFamily: T.mono, fontSize: 9, color: '#c4b29744', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.18em' }}>{m.source}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        ...fade(0.8),
      }}>
        <span style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.2em', color: '#c4b29755', textTransform: 'uppercase' }}>Scroll</span>
        <div style={{
          width: 1, height: 40,
          background: 'linear-gradient(180deg, #c4b29755 0%, transparent 100%)',
          animation: 'tw-scroll-line 2s ease-in-out infinite',
        }} />
      </div>

      <style>{`
        @keyframes tw-scroll-line {
          0%, 100% { opacity: 1; transform: scaleY(1); }
          50% { opacity: 0.3; transform: scaleY(0.5); }
        }
      `}</style>
    </section>
  );
}

/* ─── Section: PROBLEMA ─────────────────────────────────────────────── */
function SectionProblema() {
  // Tres factores simultáneos — no uno solo
  const factors = [
    {
      n: '01',
      color: C.terra,
      icon: '⏱',
      title: 'Trampa de liquidez',
      stat: 'Paga HOY',
      statLabel: 'el único que paga ese día',
      detail: 'El caficultor sabe que su café vale S/34–86/kg. Acepta S/8 porque tiene deudas que vencen esa semana — fertilizantes, mano de obra, colegio de sus hijos. El acopiador llega con efectivo en el momento exacto en que nadie más puede pagarle.',
      source: 'Observación directa de campo · MIDAGRI 2026',
    },
    {
      n: '02',
      color: C.sage,
      icon: '🔍',
      title: 'Sin canal propio al mercado',
      stat: '90%+',
      statLabel: 'del café peruano se exporta sin tostar',
      detail: 'No sabe cómo venderle a una cafetería en Lima. No tiene marca, no tiene ecommerce, no sabe qué es un puntaje SCA ni cómo certificarlo. El mercado premium existe — pero no tiene la puerta de entrada.',
      source: 'Junta Nacional del Café 2025',
    },
    {
      n: '03',
      color: C.tan,
      icon: '🌿',
      title: 'Sin tiempo ni capacidad operativa',
      stat: '80%',
      statLabel: 'de cafetales con más de 15 años sin renovar',
      detail: 'Está en la finca cosechando, procesando y secando. No tiene tiempo para hacer ventas, gestionar logística ni cobrar. Su negocio es producir café — no distribuirlo. Aunque quisiera, no puede operar el canal él solo.',
      source: 'JNC / MIDAGRI 2024',
    },
  ];

  return (
    <section style={section(C.bgMid)}>
      <Orb color={C.terra} top="10%" left="-15%" size={500} />
      <div style={{ maxWidth: 1080, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <Reveal>
          <div style={eyebrow()}>01 — El Problema</div>
          <h2 style={h2Style}>
            No es ignorancia.<br />
            <span style={{ fontStyle: 'italic', fontWeight: 500, color: C.terra }}>Es una trampa estructural.</span>
          </h2>
          <p style={{ ...bodyText, maxWidth: 640, marginBottom: 16 }}>
            Perú cerró 2025 con exportaciones récord de <strong style={{ color: C.cream }}>US$1,762 millones</strong> en café.
            El caficultor sabe que su café vale más que S/8/kg. Lo vende a ese precio de todos modos —
            por tres razones simultáneas que ningún intermediario tradicional resuelve a la vez.
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 999, marginBottom: 48,
            background: '#c96e4b0d', border: `1px solid #c96e4b33`,
            fontFamily: T.mono, fontSize: 10, color: C.terra, letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}>
            Precio acopiador: S/7–9/kg verde · Precio Tunay Wasi: S/34–86/kg · MIDAGRI 2026
          </div>
        </Reveal>

        <div style={grid('repeat(3, 1fr)', 20)}>
          {factors.map((f, i) => (
            <Reveal key={f.n} delay={i * 0.15}>
              <div style={{
                ...card(i === 0 ? '#c96e4b33' : C.border),
                borderTop: `3px solid ${f.color}`,
                height: '100%', display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 24 }}>{f.icon}</span>
                  <span style={{
                    fontFamily: T.bauhaus, fontSize: 8, letterSpacing: '0.22em',
                    color: f.color, textTransform: 'uppercase',
                    background: `${f.color}1a`, border: `1px solid ${f.color}44`,
                    padding: '3px 10px', borderRadius: 999,
                  }}>Factor {f.n}</span>
                </div>
                <div style={{
                  fontFamily: T.heading, fontWeight: 700,
                  fontSize: 52, lineHeight: 1, color: i === 0 ? C.terra : C.cream,
                  marginBottom: 4,
                }}>{f.stat}</div>
                <div style={{
                  fontFamily: T.mono, fontSize: 9, color: f.color,
                  textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12,
                }}>{f.statLabel}</div>
                <div style={{
                  fontFamily: T.body, fontWeight: 700, fontSize: 14,
                  color: C.cream, marginBottom: 10,
                }}>{f.title}</div>
                <div style={{
                  fontFamily: T.body, fontSize: 12, color: C.tan,
                  lineHeight: 1.7, marginBottom: 12, flex: 1,
                }}>{f.detail}</div>
                <div style={{
                  fontFamily: T.mono, fontSize: 9, color: '#c4b29755',
                  textTransform: 'uppercase', letterSpacing: '0.15em',
                }}>{f.source}</div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Círculo vicioso reformulado */}
        <Reveal delay={0.45}>
          <div style={{
            marginTop: 28, padding: '20px 28px',
            background: '#c96e4b0d', border: `1px solid #c96e4b33`,
            borderRadius: 14,
            fontFamily: T.body, fontSize: 14, color: C.tan, lineHeight: 1.8,
          }}>
            <strong style={{ color: C.terra }}>El círculo vicioso:</strong>{' '}
            Necesita liquidez hoy → acepta S/8/kg → sin ingresos para renovar ni construir canal propio → sin tiempo para vender directo → necesita liquidez hoy.
            <strong style={{ color: C.cream }}> Tunay Wasi rompe los tres factores al mismo tiempo: paga rápido, es el canal y opera la venta por él.</strong>
          </div>
        </Reveal>

        {/* Tabla resumen problema → solución */}
        <Reveal delay={0.55}>
          <div style={{ ...card(C.border), marginTop: 20 }}>
            <div style={{
              fontFamily: T.bauhaus, fontSize: 9, letterSpacing: '0.28em',
              color: C.sage, marginBottom: 16, textTransform: 'uppercase',
            }}>Los tres factores y cómo Tunay Wasi los resuelve</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.body, fontSize: 12 }}>
              <thead>
                <tr>
                  {['Factor', 'Problema real', 'Solución Tunay Wasi'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '7px 10px',
                      borderBottom: `1px solid ${C.border}`,
                      fontFamily: T.mono, fontSize: 8, color: C.tan,
                      textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 400,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    factor: 'Trampa de liquidez',
                    problema: 'Acepta S/8 porque necesita el dinero ese día',
                    solucion: 'Canal B2B paga en días. No tiene que elegir entre precio y velocidad.',
                  },
                  {
                    factor: 'Sin canal al mercado',
                    problema: 'No sabe venderle a cafeterías, ecommerce ni exportación',
                    solucion: 'Tunay Wasi es ese canal — B2C + B2B + exportación desde día uno.',
                  },
                  {
                    factor: 'Sin tiempo ni capacidad',
                    problema: 'Está en la finca. No puede operar ventas ni logística',
                    solucion: 'Tunay Wasi opera la venta, el cobro y la logística completa por él.',
                  },
                ].map((r, i) => (
                  <tr key={r.factor} style={{ background: i % 2 === 0 ? 'transparent' : '#c4b2970a' }}>
                    <td style={{ padding: '10px', color: C.terra, fontWeight: 600, fontSize: 12 }}>{r.factor}</td>
                    <td style={{ padding: '10px', color: C.tan, lineHeight: 1.5 }}>{r.problema}</td>
                    <td style={{ padding: '10px', color: C.sage, lineHeight: 1.5 }}>{r.solucion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Section: SOLUCIÓN ─────────────────────────────────────────────── */
function SectionSolucion() {
  // Pasos comunes antes de la bifurcación
  const stepsComunes = [
    { title: 'Registro y muestra', desc: 'El caficultor registra su finca en la plataforma y envía 300–500g al nodo de Lima para cata.' },
    { title: 'Catación Q Grader certificado', desc: 'Un catador SCA evalúa el lote y determina el tier de precio. Sin puntajes inflados — el score es verificable y auditable.' },
  ];

  // Flujo B2C
  const flujoBc = [
    { title: 'Preventa pública', desc: 'Publicamos el lote con nombre, historia, finca, SCA y perfil de tueste. El cliente reserva y paga antes de que exista el stock.' },
    { title: 'Pago al cierre del ciclo', desc: 'Cuando la preventa se completa, el caficultor recibe hasta el 50% del precio final. Más lento — pero el mayor % por kg.' },
  ];

  // Flujo B2B
  const flujoBb = [
    { title: 'Ficha técnica + muestra al cliente', desc: 'Cafetería, tostaduria u hotel recibe la ficha del lote y una muestra de 200g. Evalúa y decide en días, no semanas.' },
    { title: 'Pago al confirmar el pedido', desc: 'El cliente B2B confirma volumen. El caficultor cobra en días — recurrente y predecible, aunque el % sobre precio final sea menor que B2C.' },
  ];

  // Cálculo verificable: precio TW ÷ S/8 (precio acopiador promedio MIDAGRI)
  const tiers = [
    { pts: '82–83 pts · Selecto',       price: 'S/ 34.65/kg', mult: '4.3x', calc: '34.65 ÷ 8' },
    { pts: '84–85 pts · Esp. Estándar', price: 'S/ 38.44/kg', mult: '4.8x', calc: '38.44 ÷ 8' },
    { pts: '86–87 pts · Esp. Alta',     price: 'S/ 55.48/kg', mult: '6.9x', calc: '55.48 ÷ 8' },
    { pts: '88–89 pts · Joya de Finca', price: 'S/ 66.84/kg', mult: '8.4x', calc: '66.84 ÷ 8' },
    { pts: '90+ pts · Exclusivo/Geisha',price: 'S/ 85.78/kg', mult: '10.7x', calc: '85.78 ÷ 8' },
  ];

  const stepDot = (color: string) => ({
    position: 'absolute' as const, left: -12, top: 0,
    width: 24, height: 24, borderRadius: '50%',
    background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: T.mono, fontSize: 9, color: C.bgMid, fontWeight: 700,
  });

  return (
    <section style={section(C.bg)}>
      <Orb color={C.sage} top="-10%" right="-5%" size={600} />
      <div style={{ maxWidth: 1080, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <Reveal>
          <div style={eyebrow(C.sage)}>02 — La Solución</div>
          <h2 style={h2Style}>
            Direct Trade peruano.<br />
            <span style={{ fontStyle: 'italic', fontWeight: 500, color: C.sage }}>Transparente desde el origen.</span>
          </h2>
          <p style={{ ...bodyText, maxWidth: 620, marginBottom: 48 }}>
            Tunay Wasi no es una tostaduria — es la <strong style={{ color: C.cream }}>plataforma de distribución</strong> que el caficultor no tiene.
            El café con nombre, cara y coordenadas GPS de la finca. El flujo se bifurca según el canal: B2C da más % al caficultor; B2B le paga más rápido.
          </p>
        </Reveal>

        {/* ── Pasos comunes ── */}
        <Reveal delay={0.05}>
          <div style={{
            fontFamily: T.bauhaus, fontSize: 9, letterSpacing: '0.28em',
            color: C.tan, textTransform: 'uppercase', marginBottom: 20,
          }}>Pasos comunes — todos los canales</div>
        </Reveal>

        <div style={{ display: 'flex', gap: 20, marginBottom: 8 }}>
          {stepsComunes.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.1} style={{ flex: 1 }}>
              <div style={{
                ...card(C.borderSage),
                borderTop: `3px solid ${C.sage}`,
                display: 'flex', gap: 16, alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: C.sage, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: T.mono, fontSize: 10, color: C.bgMid, fontWeight: 700,
                }}>{i + 1}</div>
                <div>
                  <div style={{ fontFamily: T.body, fontWeight: 700, fontSize: 13, color: C.cream, marginBottom: 6 }}>{s.title}</div>
                  <div style={{ fontFamily: T.body, fontSize: 12, color: C.tan, lineHeight: 1.6 }}>{s.desc}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* ── Bifurcación ── */}
        <Reveal delay={0.25}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            margin: '32px 0 28px', padding: '14px 20px',
            background: '#c4b2970a', border: `1px solid ${C.border}`,
            borderRadius: 12,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: C.terra, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: T.mono, fontSize: 10, color: C.cream, fontWeight: 700,
            }}>3</div>
            <div style={{ fontFamily: T.body, fontSize: 13, color: C.tan, lineHeight: 1.5 }}>
              <strong style={{ color: C.cream }}>Decisión de canal</strong> — ¿el lote va a preventa B2C o a un cliente B2B directo?
              El tier de precio SCA es el mismo. Lo que cambia es la velocidad de pago y el % que recibe el caficultor.
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <span style={{
                fontFamily: T.bauhaus, fontSize: 8, letterSpacing: '0.2em',
                color: C.sage, background: '#8faf8a1a', border: `1px solid ${C.borderSage}`,
                padding: '4px 12px', borderRadius: 999, textTransform: 'uppercase',
              }}>B2C</span>
              <span style={{
                fontFamily: T.bauhaus, fontSize: 8, letterSpacing: '0.2em',
                color: C.terra, background: '#c96e4b1a', border: `1px solid #c96e4b44`,
                padding: '4px 12px', borderRadius: 999, textTransform: 'uppercase',
              }}>B2B</span>
            </div>
          </div>
        </Reveal>

        {/* ── Dos flujos paralelos ── */}
        <div style={grid('1fr 1fr', 24)}>

          {/* B2C */}
          <Reveal delay={0.3}>
            <div style={{ ...card(C.borderSage), borderTop: `3px solid ${C.sage}`, height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <span style={{
                  fontFamily: T.bauhaus, fontSize: 9, letterSpacing: '0.22em',
                  color: C.sage, background: '#8faf8a1a', border: `1px solid ${C.borderSage}`,
                  padding: '4px 14px', borderRadius: 999, textTransform: 'uppercase',
                }}>B2C — Ecommerce</span>
              </div>
              {flujoBc.map((s, i) => (
                <div key={s.title} style={{
                  display: 'flex', gap: 14, paddingBottom: 20,
                  borderLeft: i < flujoBc.length - 1 ? `1px solid ${C.borderSage}` : 'transparent',
                  paddingLeft: 20, marginLeft: 10, position: 'relative',
                }}>
                  <div style={{ ...stepDot(C.sage) }}>{i + 4}</div>
                  <div>
                    <div style={{ fontFamily: T.body, fontWeight: 700, fontSize: 13, color: C.cream, marginBottom: 4 }}>{s.title}</div>
                    <div style={{ fontFamily: T.body, fontSize: 12, color: C.tan, lineHeight: 1.6 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
              <div style={{
                marginTop: 8, padding: '12px 16px',
                background: '#8faf8a0d', borderRadius: 10, border: `1px solid ${C.borderSage}`,
              }}>
                <div style={{ fontFamily: T.mono, fontSize: 9, color: C.sage, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>Promesa al caficultor</div>
                <div style={{ fontFamily: T.body, fontSize: 12, color: C.tan, lineHeight: 1.5 }}>
                  Hasta el <strong style={{ color: C.sage }}>50% del precio final</strong> al consumidor.
                  Pago al cierre del ciclo. <strong style={{ color: C.cream }}>Más % por kg, más lento.</strong>
                </div>
              </div>
            </div>
          </Reveal>

          {/* B2B */}
          <Reveal delay={0.35}>
            <div style={{ ...card('#c96e4b22'), borderTop: `3px solid ${C.terra}`, height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <span style={{
                  fontFamily: T.bauhaus, fontSize: 9, letterSpacing: '0.22em',
                  color: C.terra, background: '#c96e4b1a', border: `1px solid #c96e4b44`,
                  padding: '4px 14px', borderRadius: 999, textTransform: 'uppercase',
                }}>B2B — Cafetería / Tostaduria / Hotel</span>
              </div>
              {flujoBb.map((s, i) => (
                <div key={s.title} style={{
                  display: 'flex', gap: 14, paddingBottom: 20,
                  borderLeft: i < flujoBb.length - 1 ? `1px solid #c96e4b44` : 'transparent',
                  paddingLeft: 20, marginLeft: 10, position: 'relative',
                }}>
                  <div style={{ ...stepDot(C.terra) }}>{i + 4}</div>
                  <div>
                    <div style={{ fontFamily: T.body, fontWeight: 700, fontSize: 13, color: C.cream, marginBottom: 4 }}>{s.title}</div>
                    <div style={{ fontFamily: T.body, fontSize: 12, color: C.tan, lineHeight: 1.6 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
              <div style={{
                marginTop: 8, padding: '12px 16px',
                background: '#c96e4b08', borderRadius: 10, border: `1px solid #c96e4b33`,
              }}>
                <div style={{ fontFamily: T.mono, fontSize: 9, color: C.terra, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>Promesa al caficultor</div>
                <div style={{ fontFamily: T.body, fontSize: 12, color: C.tan, lineHeight: 1.5 }}>
                  Pago en <strong style={{ color: C.terra }}>días, no semanas</strong>. Pedido recurrente semanal.
                  <strong style={{ color: C.cream }}> Más rápido, volumen mayor, % menor sobre precio retail.</strong>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* ── Comparativa y matriz de tiers ── */}
        <div style={{ ...grid('1fr 1fr', 24), marginTop: 24 }}>

          {/* Comparativa canales */}
          <Reveal delay={0.4}>
            <div style={card(C.border)}>
              <div style={{ fontFamily: T.bauhaus, fontSize: 9, letterSpacing: '0.28em', color: C.tan, marginBottom: 16, textTransform: 'uppercase' }}>
                B2C vs B2B — qué le conviene al caficultor
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.body, fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Variable', 'B2C', 'B2B'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '6px 8px',
                        borderBottom: `1px solid ${C.border}`,
                        fontFamily: T.mono, fontSize: 8, color: C.tan,
                        textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 400,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { v: '% al caficultor', b2c: 'Hasta 50%', b2b: '~40% (margen TW menor)', hiB2c: true },
                    { v: 'Velocidad de pago', b2c: 'Semanas (ciclo)', b2b: 'Días (pedido directo)', hiB2b: true },
                    { v: 'Volumen por operación', b2c: '12–48 bolsas', b2b: '1 saco+ (46–69 kg)', hiB2b: true },
                    { v: 'Previsibilidad', b2c: 'Depende del ciclo', b2b: 'Recurrente semanal', hiB2b: true },
                    { v: 'Precio por kg', b2c: 'S/34–86/kg verde', b2b: 'S/34–86/kg verde', neutral: true },
                  ].map((r, i) => (
                    <tr key={r.v} style={{ background: i % 2 === 0 ? 'transparent' : '#c4b2970a' }}>
                      <td style={{ padding: '8px', color: C.tan, fontSize: 11 }}>{r.v}</td>
                      <td style={{ padding: '8px', color: r.hiB2c ? C.sage : r.neutral ? C.tan : C.tan, fontWeight: r.hiB2c ? 700 : 400 }}>{r.b2c}</td>
                      <td style={{ padding: '8px', color: r.hiB2b ? C.terra : r.neutral ? C.tan : C.tan, fontWeight: r.hiB2b ? 700 : 400 }}>{r.b2b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{
                marginTop: 14, padding: '10px 12px',
                background: '#8faf8a0d', borderRadius: 8, border: `1px solid ${C.borderSage}`,
                fontFamily: T.body, fontSize: 11, color: C.tan, lineHeight: 1.5,
              }}>
                <strong style={{ color: C.cream }}>Modelo ideal:</strong> combinar ambos canales —
                B2B da velocidad y flujo de caja; B2C da el mayor retorno al caficultor.
              </div>
            </div>
          </Reveal>

          {/* Tiers */}
          <Reveal delay={0.45}>
            <div style={card(C.borderSage)}>
              <div style={{ fontFamily: T.bauhaus, fontSize: 9, letterSpacing: '0.28em', color: C.sage, marginBottom: 4, textTransform: 'uppercase' }}>
                Matriz de precios al caficultor
              </div>
              <div style={{ fontFamily: T.mono, fontSize: 9, color: '#c4b29755', marginBottom: 16, letterSpacing: '0.12em' }}>
                Mismo tier para B2C y B2B · Base: S/8/kg acopiador (MIDAGRI 2026)
              </div>
              {tiers.map((t, i) => (
                <div key={t.pts} style={{
                  display: 'grid', gridTemplateColumns: '1fr auto auto',
                  alignItems: 'center', gap: 12,
                  padding: '10px 0',
                  borderBottom: i < tiers.length - 1 ? `1px solid ${C.border}` : 'none',
                }}>
                  <span style={{ fontFamily: T.mono, fontSize: 10, color: C.tan, letterSpacing: '0.08em' }}>{t.pts}</span>
                  <span style={{ fontFamily: T.body, fontWeight: 700, fontSize: 13, color: C.cream }}>{t.price}</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      fontFamily: T.mono, fontSize: 10, color: C.sage,
                      background: '#8faf8a1a', border: `1px solid ${C.borderSage}`,
                      padding: '3px 10px', borderRadius: 999, letterSpacing: '0.1em',
                      display: 'block',
                    }}>{t.mult}</span>
                    <span style={{ fontFamily: T.mono, fontSize: 8, color: '#c4b29744', letterSpacing: '0.1em' }}>{t.calc}</span>
                  </div>
                </div>
              ))}
              <div style={{
                marginTop: 16, padding: '10px 14px',
                background: '#c96e4b0d', borderRadius: 10, border: `1px solid #c96e4b22`,
                fontFamily: T.mono, fontSize: 9, color: '#c96e4b88',
                textTransform: 'uppercase', letterSpacing: '0.15em', lineHeight: 1.6,
              }}>
                Copa Excelencia Perú 2025: US$10.60–80.10/lb · Satipo ago-2025
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─── Section: MERCADO TAM/SAM/SOM ──────────────────────────────────── */
function SectionMercado() {
  const tam_sam_som = [
    {
      label: 'TAM',
      title: 'Mercado total',
      value: '~US$300M',
      desc: '17–20% del total exportado es café specialty (US$1,762M × 17% = US$299M). Más consumo interno en crecimiento.',
      source: 'JNC 2026 · MIDAGRI 2026',
      color: C.tan,
    },
    {
      label: 'SAM',
      title: 'Mercado accesible',
      value: '~US$45M',
      desc: 'Tostadurías specialty Lima + exportación directa small batch + cafeterías independientes + consumidor urbano NSE A/B.',
      source: 'Estimado Tunay Wasi 2026',
      color: C.sage,
    },
    {
      label: 'SOM',
      title: 'Objetivo 3 años',
      value: '~US$1.5M',
      desc: '50 caficultores × promedio 30 kg/mes × 12 meses × precio promedio S/50/kg tostado. Equivale a ~3.3% del SAM.',
      source: 'Proyección interna · validar con tracción',
      color: C.terra,
    },
  ];

  const b2c = [
    { name: 'El Consciente', age: '30–42', nse: 'A/B', ticket: 'S/ 65–85/mes', ltv: 'S/ 780–1,020/año', desc: 'Compra por identidad y propósito. Quiere saber de dónde viene su café. Principal detonante: ver la cara del caficultor.', convert: 'Mini-video de finca + urgencia real de preventa', source: 'flujos-buyer-personas-b2c.md' },
    { name: 'El Barista Amateur', age: '22–35', nse: 'B/C+', ticket: 'S/ 55–75/mes', ltv: 'S/ 660–900/año', desc: 'Compra por pasión técnica. Tiene V60, lee el puntaje SCA, experimenta con orígenes. Principal detonante: fecha de tueste + nombre del Q Grader.', convert: 'Score SCA verificado + receta por lote + filtro SCA mínimo', source: 'flujos-buyer-personas-b2c.md' },
    { name: 'El Gifter', age: '28–50', nse: 'A/B', ticket: 'S/ 120–180/kit', ltv: 'S/ 240–360/año (2 kits)', desc: 'Busca un regalo con historia. Kit premium + carta del caficultor = regalo memorable y diferenciado.', convert: 'Sección gifting con packaging visible + 3 tiers de precio', source: 'flujos-buyer-personas-b2c.md' },
  ];

  const b2b = [
    { name: 'Cafetería independiente', volume: '10–50 kg/mes', ticket: 'S/ 550–4,250/mes', priority: '1', desc: 'Quiere un lote exclusivo en su pizarra con nombre y finca real. Compra recurrente semanal — flujo de caja predecible. Sus clientes preguntan "¿de dónde es este café?" y eso genera demanda B2C orgánica.', convert: 'Muestra de 200g gratis + badge exclusividad', source: 'flujos-buyer-personas-b2b.md' },
    { name: 'Hotel / Restaurante gourmet', volume: '5–20 kg/mes', ticket: 'S/ 400–2,600/mes', priority: '2', desc: 'Exclusividad y coherencia gastronómica. El único en Lima con este lote. Cata presencial en su cocina antes de cerrar.', convert: 'Q Grader va a la cata presencial + lote exclusivo con nombre del hotel', source: 'flujos-buyer-personas-b2b.md' },
    { name: 'Empresa corporativa', volume: 'Campaña / mensual', ticket: 'S/ 3K–14K/campaña', priority: '3', desc: 'Gifting con impacto social. "Tu empresa apoyó a X caficultores este año." Kit con logo de la empresa + certificado de impacto.', convert: 'Propuesta PDF en 24h + kit muestra sin costo + factura con RUC', source: 'flujos-buyer-personas-b2b.md' },
    { name: 'Tostaduria specialty', volume: '5–50 kg/mes (verde)', ticket: 'S/ 250–4,300/mes', priority: '2', desc: 'Quiere nuevos orígenes sin salir a buscarlo. Tunay Wasi le entrega café verde certificado + ficha técnica + perfil de tueste ya desarrollado. Ahorra 3–8 sesiones de desarrollo por origen.', convert: 'Verde + perfil de tueste + lotes pequeños de 5–15 kg (no sacos de 69 kg)', source: 'MODELO_NEGOCIO.md' },
  ];

  return (
    <section style={section(C.bgMid)}>
      <Orb color={C.terra} bottom="0" right="0" size={500} />
      <div style={{ maxWidth: 1080, margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* TAM/SAM/SOM */}
        <Reveal>
          <div style={eyebrow()}>03 — Mercado</div>
          <h2 style={h2Style}>
            Un mercado enorme<br />
            <span style={{ fontStyle: 'italic', fontWeight: 500, color: C.terra }}>sin infraestructura de distribución.</span>
          </h2>
          <p style={{ ...bodyText, maxWidth: 640, marginBottom: 48 }}>
            Perú produce café de clase mundial. El problema nunca fue la calidad del grano —
            fue que no existía quién conectara ese origen con el consumidor dispuesto a pagarlo.
          </p>
        </Reveal>

        <div style={{ ...grid('repeat(3, 1fr)', 20), marginBottom: 72 }}>
          {tam_sam_som.map((t, i) => (
            <Reveal key={t.label} delay={i * 0.12}>
              <div style={{
                ...card(C.border),
                borderTop: `3px solid ${t.color}`,
                height: '100%',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
                  <span style={{
                    fontFamily: T.bauhaus, fontSize: 10, letterSpacing: '0.24em',
                    color: t.color, padding: '3px 10px', borderRadius: 999,
                    background: `${t.color}1a`, border: `1px solid ${t.color}44`,
                  }}>{t.label}</span>
                  <span style={{ fontFamily: T.body, fontSize: 12, color: C.tan }}>{t.title}</span>
                </div>
                <div style={{ fontFamily: T.heading, fontWeight: 700, fontSize: 48, color: t.color, lineHeight: 1, marginBottom: 12 }}>
                  {t.value}
                </div>
                <div style={{ fontFamily: T.body, fontSize: 12, color: C.tan, lineHeight: 1.7, marginBottom: 12 }}>{t.desc}</div>
                <div style={{ fontFamily: T.mono, fontSize: 9, color: '#c4b29755', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{t.source}</div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* B2C Personas */}
        <Reveal delay={0.1}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '0 0 20px' }}>
            <div style={{
              fontFamily: T.bauhaus, fontSize: 9, letterSpacing: '0.28em',
              color: C.bgMid, background: C.cream, padding: '5px 14px', borderRadius: 999,
              textTransform: 'uppercase',
            }}>B2C — Consumidor Final</div>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>
        </Reveal>

        <div style={{ ...grid('repeat(3, 1fr)', 16), marginBottom: 48 }}>
          {b2c.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.1}>
              <div style={{ ...card(), height: '100%', display: 'flex', flexDirection: 'column', gap: 0 }}>
                <div style={{ fontFamily: T.heading, fontStyle: 'italic', fontSize: 22, color: C.cream, marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontFamily: T.mono, fontSize: 9, color: C.tan, letterSpacing: '0.15em', marginBottom: 14 }}>{p.age} · NSE {p.nse}</div>
                <div style={{ fontFamily: T.body, fontSize: 12, color: C.tan, lineHeight: 1.6, marginBottom: 12, flex: 1 }}>{p.desc}</div>
                <div style={{ padding: '10px 14px', background: '#8faf8a0d', borderRadius: 10, marginBottom: 12 }}>
                  <div style={{ fontFamily: T.mono, fontSize: 8, color: C.sage, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>Cómo convierte</div>
                  <div style={{ fontFamily: T.body, fontSize: 11, color: C.tan, lineHeight: 1.5 }}>{p.convert}</div>
                </div>
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontFamily: T.body, fontWeight: 700, fontSize: 13, color: C.sage }}>{p.ticket}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 9, color: '#c4b29755', letterSpacing: '0.1em' }}>LTV {p.ltv}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* B2B Personas */}
        <Reveal delay={0.2}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '0 0 20px' }}>
            <div style={{
              fontFamily: T.bauhaus, fontSize: 9, letterSpacing: '0.28em',
              color: C.cream, background: C.terra, padding: '5px 14px', borderRadius: 999,
              textTransform: 'uppercase',
            }}>B2B — Clientes Institucionales</div>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>
        </Reveal>

        <div style={grid('repeat(2, 1fr)', 16)}>
          {b2b.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.1}>
              <div style={{ ...card('#c96e4b22'), borderTop: `3px solid ${C.terra}`, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <div style={{ fontFamily: T.heading, fontStyle: 'italic', fontSize: 20, color: C.cream }}>{p.name}</div>
                  <span style={{
                    fontFamily: T.mono, fontSize: 8, color: C.terra,
                    background: '#c96e4b1a', border: `1px solid #c96e4b33`,
                    padding: '2px 8px', borderRadius: 999, letterSpacing: '0.1em',
                    flexShrink: 0,
                  }}>Prioridad {p.priority}</span>
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 9, color: C.tan, letterSpacing: '0.15em', marginBottom: 12 }}>{p.volume}</div>
                <div style={{ fontFamily: T.body, fontSize: 12, color: C.tan, lineHeight: 1.6, marginBottom: 12, flex: 1 }}>{p.desc}</div>
                <div style={{ padding: '10px 14px', background: '#c96e4b08', borderRadius: 10, marginBottom: 12 }}>
                  <div style={{ fontFamily: T.mono, fontSize: 8, color: C.terra, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>Cómo convierte</div>
                  <div style={{ fontFamily: T.body, fontSize: 11, color: C.tan, lineHeight: 1.5 }}>{p.convert}</div>
                </div>
                <div style={{ borderTop: `1px solid #c96e4b22`, paddingTop: 12, color: C.terra, fontFamily: T.body, fontWeight: 700, fontSize: 13 }}>{p.ticket}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Section: MODELO DE NEGOCIO ─────────────────────────────────────── */
function SectionModelo() {
  // Distribución sobre precio BASE (sin IGV). Ejemplo: bolsa 250g B2C = S/68 con IGV → base = S/57.6
  // Caficultor ~50% de base → S/28.8 por 250g = S/115/kg verde (tier alta)
  // Notas:
  //   IGV: se cobra AL CONSUMIDOR sobre el precio base, no es costo de TW
  //   Margen TW: sobre el precio base después de descontar caficultor, tueste, logística
  const distribucion = [
    { actor: 'Caficultor',    pct: 40, label: '40–52%', color: C.sage,       desc: 'Pago al productor según tier SCA. Liquidado al cierre del ciclo de preventa exitoso.' },
    { actor: 'Tueste + Cata', pct: 14, label: '~14%',   color: C.tan,        desc: 'Maquila en laboratorio aliado (Violet / Vicoffee / Narsacoffee) + catación Q Grader.' },
    { actor: 'Logística',     pct: 7,  label: '~7%',     color: '#c4b29788',  desc: 'Empaque con válvula de desgasificación + flete Lima/provincias (Scharff / Urbano).' },
    { actor: 'Margen TW',     pct: 21, label: '~21%',   color: C.terra,      desc: 'Margen operativo Tunay Wasi sobre precio base. Cubre plataforma, Q Grader, operaciones.' },
    { actor: 'IGV (18%)',     pct: 18, label: '18%',    color: '#c4b29744',  desc: 'Impuesto al consumidor incluido en el precio final. No es costo operativo de Tunay Wasi.' },
  ];

  // Canal B2B: modelo diferente al B2C
  const canalB2B = [
    { canal: 'B2C Ecommerce',         formato: 'Bolsa 250g tostada + válvula', precio: 'S/ 65–85 / unidad',    margen: '~21% s/base',      freq: 'Mensual' },
    { canal: 'B2B Cafetería',         formato: 'Verde kg o tostado 1 kg',      precio: 'S/ 55–85 / kg verde',   margen: 'Fee dist. S/8–15/kg', freq: 'Semanal' },
    { canal: 'B2B Tostaduria',        formato: 'Verde + ficha + perfil tueste', precio: 'S/ 50–80 / kg verde',  margen: 'Fee dist. S/6–12/kg', freq: 'Por lote' },
    { canal: 'B2B Gifting corporativo', formato: 'Kit con branding empresa',    precio: 'S/ 150–300 / kit',      margen: '~25–30% s/base',   freq: 'Campaña' },
    { canal: 'Exportación',           formato: 'Bulk verde 69 kg',             precio: 'FOB US$5–15/lb',         margen: 'Negociación directa', freq: 'Por pedido' },
  ];

  return (
    <section style={section(C.bg)}>
      <Orb color={C.sage} top="20%" left="50%" size={700} />
      <div style={{ maxWidth: 1080, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <Reveal>
          <div style={eyebrow(C.sage)}>04 — Modelo de Negocio</div>
          <h2 style={h2Style}>
            Alineado con<br />
            <span style={{ fontStyle: 'italic', fontWeight: 500, color: C.sage }}>el éxito del caficultor.</span>
          </h2>
          <p style={{ ...bodyText, maxWidth: 580, marginBottom: 56 }}>
            Tunay Wasi solo gana cuando el caficultor gana. El modelo de preventa garantiza que no
            hay stock inmovilizado ni riesgo de inventario — el pago al productor se activa únicamente
            cuando el lote se agota.
          </p>
        </Reveal>

        <div style={{ ...grid('1fr 1fr', 48), marginBottom: 48 }}>
          {/* Distribución del precio B2C */}
          <Reveal delay={0.1}>
            <div style={card(C.borderSage)}>
              <div style={{ fontFamily: T.bauhaus, fontSize: 9, letterSpacing: '0.28em', color: C.sage, marginBottom: 4, textTransform: 'uppercase' }}>
                Distribución del precio al consumidor B2C
              </div>
              <div style={{ fontFamily: T.mono, fontSize: 9, color: '#c4b29755', marginBottom: 20, letterSpacing: '0.12em' }}>
                Ejemplo: bolsa 250g a S/68 → base imponible S/57.6 (IGV separado)
              </div>
              {distribucion.map((f, i) => (
                <div key={f.actor} style={{ marginBottom: i < distribucion.length - 1 ? 16 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontFamily: T.body, fontSize: 13, color: f.actor === 'Caficultor' ? C.sage : f.actor === 'Margen TW' ? C.terra : C.tan }}>{f.actor}</span>
                    <span style={{ fontFamily: T.body, fontWeight: 700, fontSize: 14, color: f.actor === 'Caficultor' ? C.sage : f.actor === 'Margen TW' ? C.terra : C.cream }}>{f.label}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: C.border, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 2, background: f.color,
                      width: `${f.pct}%`,
                      transition: 'width 1s ease',
                    }} />
                  </div>
                  <div style={{ fontFamily: T.mono, fontSize: 9, color: '#c4b29755', marginTop: 4, letterSpacing: '0.12em' }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Key numbers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Ticket promedio B2C', value: 'S/ 65–85', sub: 'por pedido online · bolsa 250g' },
              { label: 'LTV suscriptor B2C', value: 'S/ 660–1,020', sub: 'por cliente / año (12 ciclos)' },
              { label: 'Ticket B2B cafetería', value: 'S/ 550–4,250', sub: 'por cafetería / mes · compra semanal' },
              { label: 'Ticket gifting corporativo', value: 'S/ 3K–14K', sub: 'por campaña · mínimo 20 kits' },
              { label: 'Lote mínimo Fase 1', value: '12 kg verde', sub: '≈ 48 bolsas de 250g tostadas' },
            ].map((k, i) => (
              <Reveal key={k.label} delay={0.1 + i * 0.08}>
                <div style={{
                  ...card(),
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '18px 24px',
                }}>
                  <div>
                    <div style={{ fontFamily: T.body, fontSize: 12, color: C.tan, marginBottom: 4 }}>{k.label}</div>
                    <div style={{ fontFamily: T.mono, fontSize: 9, color: '#c4b29755', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{k.sub}</div>
                  </div>
                  <div style={{ fontFamily: T.heading, fontWeight: 700, fontSize: 26, color: C.cream, textAlign: 'right' }}>{k.value}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Canal B2B tabla */}
        <Reveal delay={0.3}>
          <div style={card(C.border)}>
            <div style={{ fontFamily: T.bauhaus, fontSize: 9, letterSpacing: '0.28em', color: C.terra, marginBottom: 20, textTransform: 'uppercase' }}>
              Modelo de ingresos por canal
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.body, fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Canal', 'Formato', 'Precio', 'Margen TW', 'Frecuencia'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '8px 12px',
                        borderBottom: `1px solid ${C.border}`,
                        fontFamily: T.mono, fontSize: 9, color: C.tan,
                        textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 400,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {canalB2B.map((r, i) => (
                    <tr key={r.canal} style={{ background: i % 2 === 0 ? 'transparent' : '#c4b2970a' }}>
                      <td style={{ padding: '10px 12px', color: C.cream, fontWeight: 600 }}>{r.canal}</td>
                      <td style={{ padding: '10px 12px', color: C.tan }}>{r.formato}</td>
                      <td style={{ padding: '10px 12px', color: C.sage, fontWeight: 600 }}>{r.precio}</td>
                      <td style={{ padding: '10px 12px', color: C.terra }}>{r.margen}</td>
                      <td style={{ padding: '10px 12px', color: C.tan }}>{r.freq}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Section: TRACCIÓN ─────────────────────────────────────────────── */
function SectionTraccion() {
  return (
    <section style={section(C.bgMid)}>
      <Orb color={C.terra} top="-20%" right="-10%" size={600} />
      <div style={{ maxWidth: 1080, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <Reveal>
          <div style={eyebrow()}>05 — Tracción</div>
          <h2 style={h2Style}>
            Ya empezamos.<br />
            <span style={{ fontStyle: 'italic', fontWeight: 500, color: C.terra }}>El modelo funciona con datos reales.</span>
          </h2>
        </Reveal>

        <div style={{ ...grid('1fr 1fr', 32), marginTop: 56 }}>
          {/* Case study */}
          <Reveal delay={0.1}>
            <div style={{
              ...card('#c96e4b22'),
              borderLeft: `4px solid ${C.terra}`,
              borderRadius: '0 20px 20px 0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: C.terra, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: T.heading, fontSize: 24, color: C.cream, fontStyle: 'italic',
                }}>A</div>
                <div>
                  <div style={{ fontFamily: T.heading, fontStyle: 'italic', fontSize: 22, color: C.cream }}>Ayde Rojas Saldivar</div>
                  <div style={{ fontFamily: T.mono, fontSize: 9, color: C.tan, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Finca Vista Hermosa · Jaén, Cajamarca</div>
                </div>
              </div>

              {[
                { label: 'Variedad', value: 'Caturra + Geisha' },
                { label: 'Proceso', value: 'Natural' },
                { label: 'Altitud', value: '1,500 msnm' },
                { label: 'Puntaje SCA', value: '82.5 pts · Tier Selecto' },
                { label: 'Precio TW al caficultor', value: 'S/ 34.65/kg verde' },
                { label: 'Precio acopiador zona', value: '~S/ 8/kg verde (MIDAGRI)' },
                { label: 'Múltiplo obtenido', value: '4.3x más que el acopiador' },
                { label: 'Orden', value: 'ALP-2026-771032' },
                { label: 'Estado pago', value: '✓ Pagado' },
                { label: 'Generación', value: 'Segunda generación cafetalera' },
              ].map(r => (
                <div key={r.label} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '10px 0', borderBottom: `1px solid ${C.border}`,
                  fontFamily: T.body, fontSize: 12,
                }}>
                  <span style={{ color: C.tan }}>{r.label}</span>
                  <span style={{
                    color: r.label === 'Múltiplo obtenido' ? C.sage : r.label === 'Precio TW al caficultor' ? C.sage : C.cream,
                    fontWeight: 600,
                  }}>{r.value}</span>
                </div>
              ))}

              <div style={{
                marginTop: 20, padding: '14px 16px',
                background: '#8faf8a0d', borderRadius: 10, border: `1px solid ${C.borderSage}`,
                fontFamily: T.body, fontSize: 12, color: C.tan, lineHeight: 1.7, fontStyle: 'italic',
              }}>
                "Ayde heredó la finca de su madre y ha mantenido las tradiciones del café familiar,
                en proceso de mejora de técnicas de procesamiento. Sus cafés naturales desarrollan
                perfiles únicos con notas a frutas maduras."
              </div>
            </div>
          </Reveal>

          {/* Roadmap + milestones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Reveal delay={0.15}>
              <div style={{ ...card(C.borderSage), borderTop: `3px solid ${C.sage}` }}>
                <div style={{ fontFamily: T.bauhaus, fontSize: 9, letterSpacing: '0.28em', color: C.sage, marginBottom: 16, textTransform: 'uppercase' }}>
                  Fase 1 — Estado actual (may–jun 2026)
                </div>
                {[
                  { label: 'Empresa constituida', done: true },
                  { label: 'Landing B2C caficultores live', done: true },
                  { label: 'Primer lote vendido (Ayde Rojas) · 4.3x al productor', done: true },
                  { label: 'Sistema de preventa operativo', done: true },
                  { label: 'Buyer personas B2C documentados (Consciente / Barista / Gifter)', done: true },
                  { label: 'Buyer personas B2B documentados (Cafetería / Hotel / Corporativo)', done: true },
                  { label: 'Q Grader aliado formalizado', done: false },
                  { label: 'Tostador aliado formalizado (Violet / Vicoffee / Narsacoffee)', done: false },
                  { label: 'Acuerdo maquila bolsas 250g con válvula de desgasificación', done: false },
                  { label: '5 caficultores activos en plataforma', done: false },
                  { label: 'Primera cafetería B2B cliente', done: false },
                ].map(m => (
                  <div key={m.label} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '9px 0', borderBottom: `1px solid ${C.border}`,
                    fontFamily: T.body, fontSize: 12,
                    color: m.done ? C.cream : C.tan,
                  }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: m.done ? C.sage : C.border,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, flexShrink: 0, marginTop: 1,
                      color: m.done ? C.bgMid : C.tan,
                    }}>{m.done ? '✓' : '○'}</span>
                    {m.label}
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.25}>
              <div style={card()}>
                <div style={{ fontFamily: T.bauhaus, fontSize: 9, letterSpacing: '0.28em', color: C.tan, marginBottom: 16, textTransform: 'uppercase' }}>
                  Roadmap técnico — Semana 1 (quick wins)
                </div>
                {[
                  { dia: 'Día 1', task: 'SupplyForm: campo "Tipo de negocio" + RUC + gifting corporativo' },
                  { dia: 'Día 2', task: 'SupplyLotes: botón "Muestra 200g" + badge exclusividad' },
                  { dia: 'Día 3', task: 'ProductCard: fecha de tueste + nombre Q Grader' },
                  { dia: 'Día 4', task: 'Hero B2C: CTA narrativo + opción "Quiero regalar"' },
                  { dia: 'Día 5', task: 'Deploy + prueba en staging' },
                ].map((r, i) => (
                  <div key={r.dia} style={{
                    display: 'flex', gap: 12, padding: '8px 0',
                    borderBottom: i < 4 ? `1px solid ${C.border}` : 'none',
                  }}>
                    <span style={{ fontFamily: T.mono, fontSize: 9, color: C.terra, letterSpacing: '0.1em', flexShrink: 0, marginTop: 2 }}>{r.dia}</span>
                    <span style={{ fontFamily: T.body, fontSize: 12, color: C.tan, lineHeight: 1.5 }}>{r.task}</span>
                  </div>
                ))}
                <div style={{ marginTop: 12, fontFamily: T.mono, fontSize: 9, color: '#c4b29755', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  Fuente: roadmap-landing.md · Fase 1 may–jun 2026
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Section: LABORATORIOS ALIADOS ─────────────────────────────────── */
function SectionLaboratorios() {
  const labs = [
    {
      name: 'Violet',
      loc: 'Lima',
      type: 'Tostaduria specialty urbana',
      clients: 'Cafeterías limeñas',
      role: 'Hub de maquila B2C + canal B2B Lima',
      status: 'Conversación pendiente',
      color: C.sage,
    },
    {
      name: 'Vicoffee',
      loc: 'Quillabamba, Cusco',
      type: 'Tostaduria en origen — región cafetalera sur',
      clients: 'Cafeterías locales y regionales',
      role: 'Fraccionamiento en origen cafés Cusco / Apurímac',
      status: 'Conversación pendiente',
      color: C.terra,
    },
    {
      name: 'Narsacoffee',
      loc: 'Chanchamayo, Junín',
      type: 'Tostaduria en origen — zona cafetalera central',
      clients: 'Cafeterías + exportación pequeña escala',
      role: 'Fraccionamiento en origen cafés Junín / Pasco',
      status: 'Conversación pendiente',
      color: C.tan,
    },
  ];

  const niveles = [
    { n: '01', title: 'Verde certificado', desc: 'Café verde + ficha técnica (SCA, variedad, proceso, altitud). Para tostadurías con perfil propio.' },
    { n: '02', title: 'Verde + perfil de tueste', desc: 'Café verde + curva de tueste documentada (temp, RoR, DTR). Ahorra 3–8 sesiones de desarrollo por origen.' },
    { n: '03', title: 'Tostado listo', desc: 'Bolsa 250g sellada con válvula de desgasificación + etiqueta Tunay Wasi. Para cafeterías, hoteles y B2C.' },
  ];

  return (
    <section style={section(C.bg)}>
      <Orb color={C.sage} top="10%" right="-10%" size={600} />
      <div style={{ maxWidth: 1080, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <Reveal>
          <div style={eyebrow(C.sage)}>06 — Red de Laboratorios</div>
          <h2 style={h2Style}>
            Tres socios de origen.<br />
            <span style={{ fontStyle: 'italic', fontWeight: 500, color: C.sage }}>Relación bidireccional.</span>
          </h2>
          <p style={{ ...bodyText, maxWidth: 640, marginBottom: 56 }}>
            Los laboratorios no son solo maquiladores — son también <strong style={{ color: C.cream }}>clientes B2B</strong> de Tunay Wasi.
            Les resolvemos el problema de sourcing de café verde certificado sin tener que viajar a origen.
          </p>
        </Reveal>

        <div style={{ ...grid('repeat(3, 1fr)', 20), marginBottom: 48 }}>
          {labs.map((l, i) => (
            <Reveal key={l.name} delay={i * 0.12}>
              <div style={{ ...card(C.border), borderTop: `3px solid ${l.color}`, height: '100%' }}>
                <div style={{ fontFamily: T.heading, fontStyle: 'italic', fontSize: 26, color: C.cream, marginBottom: 4 }}>{l.name}</div>
                <div style={{ fontFamily: T.mono, fontSize: 9, color: C.tan, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>{l.loc}</div>
                <div style={{ fontFamily: T.body, fontSize: 12, color: C.tan, marginBottom: 8 }}><strong style={{ color: C.cream }}>Perfil:</strong> {l.type}</div>
                <div style={{ fontFamily: T.body, fontSize: 12, color: C.tan, marginBottom: 8 }}><strong style={{ color: C.cream }}>Cliente actual:</strong> {l.clients}</div>
                <div style={{ fontFamily: T.body, fontSize: 12, color: l.color, marginBottom: 16 }}><strong>Rol con TW:</strong> {l.role}</div>
                <span style={{
                  fontFamily: T.mono, fontSize: 8, color: C.tan,
                  background: C.border, padding: '4px 10px', borderRadius: 999,
                  textTransform: 'uppercase', letterSpacing: '0.15em',
                }}>{l.status}</span>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Propuesta de maquila */}
        <Reveal delay={0.2}>
          <div style={{
            padding: '28px 32px', marginBottom: 32,
            background: '#8faf8a0d', border: `1px solid ${C.borderSage}`,
            borderRadius: 16,
          }}>
            <div style={{ fontFamily: T.bauhaus, fontSize: 9, letterSpacing: '0.28em', color: C.sage, marginBottom: 12, textTransform: 'uppercase' }}>
              Propuesta de maquila a presentar a cada laboratorio
            </div>
            <div style={{
              fontFamily: T.heading, fontStyle: 'italic', fontSize: 20, color: C.cream, lineHeight: 1.5,
            }}>
              "Yo traigo el café verde de mis caficultores. Tú lo tuestas con tu perfil.
              Yo pongo las bolsas con válvula y mi etiqueta. Tú fraccionas, sellas y me despachas el lote.
              Yo pago por kilo procesado."
            </div>
          </div>
        </Reveal>

        {/* Niveles de servicio B2B */}
        <Reveal delay={0.3}>
          <div style={card(C.border)}>
            <div style={{ fontFamily: T.bauhaus, fontSize: 9, letterSpacing: '0.28em', color: C.terra, marginBottom: 20, textTransform: 'uppercase' }}>
              Tres niveles de servicio B2B para laboratorios y cafeterías
            </div>
            <div style={grid('repeat(3, 1fr)', 16)}>
              {niveles.map((n, i) => (
                <div key={n.n} style={{
                  padding: '20px',
                  background: i === 2 ? '#c96e4b0d' : C.bgMid,
                  borderRadius: 12,
                  border: `1px solid ${i === 2 ? '#c96e4b33' : C.border}`,
                }}>
                  <div style={{ fontFamily: T.bauhaus, fontSize: 9, letterSpacing: '0.2em', color: i === 2 ? C.terra : C.sage, marginBottom: 8, textTransform: 'uppercase' }}>
                    Nivel {n.n}
                  </div>
                  <div style={{ fontFamily: T.body, fontWeight: 700, fontSize: 14, color: C.cream, marginBottom: 8 }}>{n.title}</div>
                  <div style={{ fontFamily: T.body, fontSize: 12, color: C.tan, lineHeight: 1.6 }}>{n.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Section: VISIÓN ───────────────────────────────────────────────── */
function SectionVision() {
  const pilares = [
    { icon: '🌱', title: 'Caficultor primero', desc: 'El modelo solo funciona si el caficultor gana más. S/34–86/kg vs S/7–9 del acopiador. Sus ingresos son nuestra métrica más importante.' },
    { icon: '🔍', title: 'Trazabilidad total', desc: 'Cada bolsa tiene nombre, finca, puntaje SCA verificado por Q Grader y fecha de tueste. El consumidor sabe exactamente qué toma y de dónde viene.' },
    { icon: '📊', title: 'Precio justo verificado', desc: 'Q Grader certificado SCA evalúa cada lote. Sin puntajes inflados. Sin promesas vacías. El score es auditable y reproducible.' },
    { icon: '🌍', title: 'Escalable a exportación', desc: 'El modelo Direct Trade funciona igual para tostadores en Lima que para importadores en Berlín o Tokio. Copa Excelencia abre el mercado internacional.' },
  ];

  // Preguntas de validación pendientes — honestidad ante inversores
  const validaciones = [
    { q: '¿Cuánto cuesta el kg verde puesto en Lima desde cada laboratorio?', status: 'Pendiente', critical: true },
    { q: '¿Los laboratorios tienen bolsas 250g con válvula de desgasificación?', status: 'Pendiente', critical: true },
    { q: '¿Qué hace hoy una cafetería de Lima cuando quiere café de origen directo?', status: 'Pendiente', critical: false },
    { q: '¿Cuántos kg de café verde están disponibles para entregar en 30 días?', status: 'Pendiente', critical: true },
    { q: 'Primera cafetería B2B cliente con pedido real', status: 'Pendiente', critical: false },
  ];

  return (
    <section style={section(C.bg)}>
      <Orb color={C.sage} top="30%" left="40%" size={800} />
      <div style={{ maxWidth: 1080, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <Reveal>
          <div style={eyebrow(C.sage)}>07 — Visión</div>
          <h2 style={h2Style}>
            Construimos el<br />
            <span style={{ fontStyle: 'italic', fontWeight: 500, color: C.sage }}>Direct Trade peruano.</span>
          </h2>
          <p style={{ ...bodyText, maxWidth: 640, marginBottom: 56 }}>
            Perú produce café de clase mundial. El problema nunca fue la calidad del grano —
            fue el acceso al mercado. Tunay Wasi construye la infraestructura que conecta
            esa calidad con el consumidor que está dispuesto a pagarla, en todos los canales.
          </p>
        </Reveal>

        <div style={{ ...grid('repeat(2, 1fr)', 20), marginBottom: 48 }}>
          {pilares.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.12}>
              <div style={{ ...card(), display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 28, flexShrink: 0 }}>{p.icon}</div>
                <div>
                  <div style={{ fontFamily: T.body, fontWeight: 700, fontSize: 14, color: C.cream, marginBottom: 8 }}>{p.title}</div>
                  <div style={{ fontFamily: T.body, fontSize: 13, color: C.tan, lineHeight: 1.65 }}>{p.desc}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Validaciones pendientes — honestidad */}
        <Reveal delay={0.3}>
          <div style={{
            ...card('#c96e4b22'),
            borderTop: `3px solid ${C.terra}`,
            marginBottom: 32,
          }}>
            <div style={{ fontFamily: T.bauhaus, fontSize: 9, letterSpacing: '0.28em', color: C.terra, marginBottom: 4, textTransform: 'uppercase' }}>
              Validaciones operativas pendientes
            </div>
            <div style={{ fontFamily: T.body, fontSize: 12, color: C.tan, marginBottom: 20, lineHeight: 1.5 }}>
              La hipótesis de mercado está validada. Estas son las preguntas que confirman la ejecución:
            </div>
            {validaciones.map((v, i) => (
              <div key={v.q} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '10px 0', borderBottom: i < validaciones.length - 1 ? `1px solid ${C.border}` : 'none',
              }}>
                <span style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                  background: v.critical ? '#c96e4b33' : C.border,
                  border: `1px solid ${v.critical ? C.terra : C.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: T.mono, fontSize: 8, color: v.critical ? C.terra : C.tan,
                }}>!</span>
                <span style={{ fontFamily: T.body, fontSize: 12, color: v.critical ? C.cream : C.tan, lineHeight: 1.5 }}>{v.q}</span>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.5}>
          <div style={{
            padding: '40px 48px',
            background: 'linear-gradient(135deg, #2a3d33 0%, #1f3028 100%)',
            border: `1px solid ${C.borderSage}`,
            borderRadius: 24,
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: T.heading, fontWeight: 700, fontStyle: 'italic',
              fontSize: 'clamp(24px, 3.5vw, 40px)', color: C.cream,
              lineHeight: 1.3, maxWidth: 680, margin: '0 auto',
            }}>
              "El café peruano se encuentra ante una oportunidad histórica.
              La calidad ya está. Lo que falta es quién la lleve al mercado correcto."
            </div>
            <div style={{
              fontFamily: T.mono, fontSize: 9, color: '#c4b29755',
              letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 20,
            }}>MIDAGRI — Perspectivas del Café Peruano 2026</div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Section: CTA ──────────────────────────────────────────────────── */
function SectionCTA() {
  return (
    <section style={{ ...section(C.bgMid), textAlign: 'center', minHeight: '70vh', display: 'flex', alignItems: 'center' }}>
      <Orb color={C.terra} top="-30%" left="50%" size={900} />
      <div style={{ maxWidth: 880, margin: '0 auto', position: 'relative', zIndex: 1, width: '100%' }}>
        <Reveal>
          <div style={{ width: 72, height: 72, margin: '0 auto 32px' }}>
            <img src="/brand/logo.png" alt="Tunay Wasi" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h2 style={{ ...h2Style, textAlign: 'center' }}>
            ¿Quieres ser parte<br />
            <span style={{ fontStyle: 'italic', fontWeight: 500, color: C.terra }}>de esto?</span>
          </h2>
          <p style={{ ...bodyText, maxWidth: 540, margin: '24px auto 48px', textAlign: 'center', fontSize: 16 }}>
            Buscamos socios estratégicos — Q Graders, tostadores aliados, inversionistas y aliados logísticos —
            que compartan la visión de un café peruano más justo, más trazado y más valorado.
          </p>
        </Reveal>

        <Reveal delay={0.2}>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
            {['Q Grader aliado', 'Tostador socio', 'Inversionista', 'Aliado logístico', 'Cafetería cliente'].map(r => (
              <span key={r} style={{
                fontFamily: T.body, fontSize: 13, fontWeight: 600,
                padding: '10px 22px', borderRadius: 999,
                border: `1px solid ${C.borderSage}`, color: C.sage,
                background: '#8faf8a0d',
              }}>{r}</span>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.3}>
          <a href="mailto:tunaywasi@gmail.com" style={{
            display: 'inline-flex', alignItems: 'center', gap: 14,
            fontFamily: T.body, fontWeight: 700, fontSize: 15,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            color: C.cream,
            background: 'linear-gradient(135deg, #c96e4b 0%, #b85a3a 100%)',
            padding: '22px 44px', borderRadius: 999, textDecoration: 'none',
            boxShadow: '0 24px 48px -20px #c96e4baa, inset 0 1px 0 #ffffff33',
            border: `1px solid ${C.cream}22`,
          }}>
            Conversemos <span>→</span>
          </a>
        </Reveal>

        <Reveal delay={0.45}>
          <div style={{
            marginTop: 64, paddingTop: 40,
            borderTop: `1px solid ${C.border}`,
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 32, flexWrap: 'wrap',
            fontFamily: T.mono, fontSize: 9, letterSpacing: '0.2em', color: '#c4b29755',
            textTransform: 'uppercase',
          }}>
            <span>Tunay · Wasi · 2026</span>
            <span>tunaywasi@gmail.com</span>
            <span>Direct Trade · Café de Especialidad · Perú</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Root ───────────────────────────────────────────────────────────── */
export default function PitchDeck() {
  return (
    <div style={{ fontFamily: T.body, background: C.bg }}>
      <SectionHero />
      <SectionProblema />
      <SectionSolucion />
      <SectionMercado />
      <SectionModelo />
      <SectionTraccion />
      <SectionLaboratorios />
      <SectionVision />
      <SectionCTA />
    </div>
  );
}
