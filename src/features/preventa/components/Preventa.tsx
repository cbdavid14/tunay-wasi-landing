import { Fragment } from 'react';
import { useCountdown } from '../useCountdown';
import { useActiveCycle } from '@/features/catalog/useActiveCycle';
import { useCatalog } from '@/features/catalog/useCatalog';
import { Money } from '@/shared/money';

const FALLBACK_CUTOFF = new Date('2026-06-01T04:59:59Z').getTime();

const STEPS = [
  { n: '01', t: 'Reservas', d: 'Eliges tu finca, peso y método. Pagas para asegurar tu lote.' },
  { n: '02', t: 'Cerramos', d: 'Sumamos los pedidos del ciclo y avisamos al productor del volumen exacto.' },
  { n: '03', t: 'Tostamos', d: 'Tueste un día antes del envío — café ultra fresco, lote único.' },
  { n: '04', t: 'A tu puerta', d: 'Entrega en Lima en 24h · Provincia 2-4 días hábiles.' },
];

export default function Preventa() {
  const { data: cycle } = useActiveCycle();
  const { data: productos } = useCatalog();
  const cutoffMs = cycle?.cutoffTimestamp ?? FALLBACK_CUTOFF;
  const t = useCountdown(cutoffMs);
  const deliverLima = cycle?.deliverLima ?? 'primera semana de junio';
  const deliverProv = cycle?.deliverProv ?? 'segunda semana de junio';

  // Minimum price across all products — find cheapest weight entry
  const minEntry = productos?.flatMap(p => p.weights).reduce<[string, number] | null>(
    (min, w) => (min === null || w[1] < min[1] ? w : min),
    null,
  );
  const minLabel = minEntry ? `${Money.formatPEN(minEntry[1])} · ${minEntry[0]}` : 'S/ 78.00 · 250 g';

  return (
    <section id="preventa" style={{ position: 'relative', padding: '100px 36px', background: 'var(--tw-section-dark)', color: 'var(--tw-text-inverse)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 720, height: 720, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,110,75,0.4) 0%, rgba(201,110,75,0) 65%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-30%', left: '-10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(143,175,138,0.27) 0%, rgba(143,175,138,0) 65%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, opacity: 0.18, backgroundImage: 'radial-gradient(rgba(196,178,151,0.4) 1px, transparent 1px)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1320, margin: '0 auto', position: 'relative' }}>
        <div style={{ background: 'linear-gradient(135deg, #2a3d33 0%, var(--tw-section-dark) 60%)', border: '1px solid rgba(201,110,75,0.27)', borderRadius: 'var(--tw-radius-xl)', padding: 35, position: 'relative', overflow: 'hidden', boxShadow: '0 40px 80px -32px #000000aa' }}>
          <div style={{ position: 'absolute', top: 24, bottom: 24, left: 0, width: 4, background: 'linear-gradient(180deg, var(--tw-terra) 0%, var(--tw-sage) 100%)', borderRadius: 4 }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 64, alignItems: 'center' }} className="tw-2col">
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderRadius: 'var(--tw-radius-pill)', background: 'rgba(201,110,75,0.13)', border: '1px solid rgba(201,110,75,0.4)', marginBottom: 20 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--tw-terra)', boxShadow: '0 0 0 0 rgba(201,110,75,0.53)', animation: 'tw-pulse 2s ease-in-out infinite', display: 'inline-block' }} />
                <span style={{ fontFamily: 'var(--tw-font-label)', fontSize: 11, letterSpacing: '0.18em', color: 'var(--tw-text-inverse)', textTransform: 'uppercase' }}>Próximo tueste · ciclo abierto</span>
              </div>

              <h2 style={{ fontFamily: 'var(--tw-font-display)', fontWeight: 700, fontSize: 'clamp(40px, 5vw, 76px)', lineHeight: 0.80, margin: 0, color: 'var(--tw-text-inverse)', letterSpacing: '-0.01em' }}>
                Selección de mayo<br />
                <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--tw-terra)' }}>cosecha fresca,</span><br />
                <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--tw-sage)' }}>tostada bajo pedido.</span>
              </h2>

              <p style={{ fontFamily: 'var(--tw-font-body)', fontSize: 16, lineHeight: 1.65, color: 'var(--tw-text-faint)', marginTop: 20, maxWidth: 620 }}>
                Reservas hoy. Cerramos pedidos, calculamos el tueste exacto y arrancamos el tambor.
                Entrega <strong style={{ color: 'var(--tw-text-inverse)' }}>Lima {deliverLima}</strong> · Provincia <strong style={{ color: 'var(--tw-text-inverse)' }}>desde {deliverProv}</strong>.
              </p>

              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <span style={{ fontFamily: 'var(--tw-font-label)', fontSize: 11, letterSpacing: '0.22em', color: 'var(--tw-terra)', textTransform: 'uppercase' }}>⏳ Preventa cierra · 23:59 Lima</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
                  {([
                    [String(t.d).padStart(2, '0'), 'días'],
                    [String(t.h).padStart(2, '0'), 'horas'],
                    [String(t.m).padStart(2, '0'), 'min'],
                    [String(t.s).padStart(2, '0'), 'seg'],
                  ] as [string, string][]).map(([n, l]) => (
                    <Fragment key={l}>
                      <div style={{ flex: 1, textAlign: 'center', padding: '20px 8px', background: '#0f1a14', border: '1px solid rgba(201,110,75,0.2)', borderRadius: 'var(--tw-radius-md)', boxShadow: 'inset 0 1px 0 #ffffff08, 0 6px 20px -10px #000000cc', minWidth: 80 }}>
                        <div style={{ fontFamily: 'var(--tw-font-display)', fontWeight: 700, fontSize: 44, lineHeight: 1, color: 'var(--tw-text-inverse)', letterSpacing: '0.02em' }}>{n}</div>
                        <div style={{ fontFamily: 'var(--tw-font-data)', fontSize: 10, letterSpacing: '0.22em', color: 'rgba(196,178,151,0.6)', marginTop: 8, textTransform: 'uppercase' }}>{l}</div>
                      </div>
                    </Fragment>
                  ))}
                </div>
                <p style={{ fontFamily: 'var(--tw-font-body)', fontSize: 12, color: 'rgba(196,178,151,0.6)', marginTop: 14, lineHeight: 1.5 }}>
                  Pedidos realizados después del cierre se incluyen en el siguiente ciclo de entrega.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
                <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', padding: '9px 16px', borderRadius: 'var(--tw-radius-pill)', background: 'rgba(143,175,138,0.13)', border: '1px solid rgba(143,175,138,0.33)', fontFamily: 'var(--tw-font-body)', fontSize: 13, color: 'var(--tw-text-inverse)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 13l3-9h13l3 9v6h-2a2 2 0 11-4 0H9a2 2 0 11-4 0H3z" stroke="#8faf8a" strokeWidth="1.6" /></svg>
                  Envío gratis en Lima por S/ 100 +
                </span>
                <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', padding: '9px 16px', borderRadius: 'var(--tw-radius-pill)', background: 'rgba(196,178,151,0.13)', border: '1px solid rgba(196,178,151,0.4)', fontFamily: 'var(--tw-font-body)', fontSize: 13, color: 'var(--tw-text-inverse)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8" stroke="#c4b297" strokeWidth="1.6" strokeLinejoin="round" /></svg>
                  Envío gratis a Provincia por S/ 150 +
                </span>
              </div>

              <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginTop: 20, flexWrap: 'wrap' }}>
                <a href="#cafe" style={{ fontFamily: 'var(--tw-font-body)', fontWeight: 600, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--tw-text-inverse)', background: 'linear-gradient(135deg, var(--tw-terra) 0%, var(--tw-terra-h) 100%)', padding: '20px 32px', borderRadius: 'var(--tw-radius-pill)', textDecoration: 'none', boxShadow: '0 18px 40px -16px rgba(201,110,75,0.67), inset 0 1px 0 #ffffff33', display: 'inline-flex', alignItems: 'center', gap: 12, border: '1px solid rgba(242,224,204,0.13)', transition: 'all .3s ease' }}>
                  Reservar mi café →
                </a>
                <span style={{ fontFamily: 'var(--tw-font-display)', fontStyle: 'italic', fontSize: 18, color: 'var(--tw-text-faint)' }}>
                  desde <strong style={{ color: 'var(--tw-text-inverse)', fontStyle: 'normal', fontFamily: 'var(--tw-font-display)', fontWeight: 600 }}>{minLabel}</strong>
                </span>
              </div>
            </div>

            <div style={{ padding: 32, borderRadius: 'var(--tw-radius-lg)', background: 'linear-gradient(180deg, rgba(242,224,204,0.07) 0%, rgba(242,224,204,0.02) 100%)', border: '1px solid rgba(242,224,204,0.09)' }}>
              <div style={{ fontFamily: 'var(--tw-font-label)', fontSize: 11, letterSpacing: '0.22em', color: 'var(--tw-sage)', textTransform: 'uppercase', marginBottom: 24 }}>Cómo funciona la preventa</div>
              {STEPS.map((s, i) => (
                <div key={s.n} style={{ display: 'grid', gridTemplateColumns: '52px 1fr', gap: 18, padding: '16px 0', borderBottom: i < STEPS.length - 1 ? '1px solid rgba(242,224,204,0.08)' : 'none' }}>
                  <div style={{ fontFamily: 'var(--tw-font-display)', fontWeight: 600, fontSize: 32, color: 'var(--tw-terra)', lineHeight: 1, fontStyle: 'italic' }}>{s.n}</div>
                  <div>
                    <div style={{ fontFamily: 'var(--tw-font-display)', fontSize: 22, color: 'var(--tw-text-inverse)', fontWeight: 600, lineHeight: 1.1 }}>{s.t}</div>
                    <div style={{ fontFamily: 'var(--tw-font-body)', fontSize: 13, color: 'var(--tw-text-faint)', marginTop: 6, lineHeight: 1.5 }}>{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes tw-pulse { 0%, 100% { box-shadow: 0 0 0 0 #c96e4b88; } 50% { box-shadow: 0 0 0 8px #c96e4b00; } }`}</style>
    </section>
  );
}
