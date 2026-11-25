import { useState, useEffect } from 'react';
import { Money } from '@/shared/money';
import type { Producto, ProductLabel } from '@/shared/types/catalog';
import type { GrindOption } from '@/shared/types/cart';
import type { WeightLabel } from '@/shared/types/firestore';
import { useCartActions } from '@/features/cart/useCart';
import ImageSlot from '@/components/decor/ImageSlot';
import { maxQtyForWeight, disponibleKg } from '@/features/catalog/stockUtils';

type GrindMode = 'Grano' | 'Molido';
type GrindType = Exclude<GrindOption, 'Grano'>;

const GRIND_OPTIONS: { label: GrindType; coarse: string }[] = [
  { label: 'V60',          coarse: 'Medio–fino' },
  { label: 'Chemex',       coarse: 'Medio–grueso' },
  { label: 'French Press', coarse: 'Grueso' },
];

const TAG_TONES: Record<string, { bg: string; text: string }> = {
  sage:  { bg: 'var(--tw-sage)',         text: 'var(--tw-text)' },
  terra: { bg: 'var(--tw-terra)',        text: 'var(--tw-text-inverse)' },
  deep:  { bg: 'var(--tw-section-dark)', text: 'var(--tw-text-inverse)' },
};

const LABEL_STYLES: Record<ProductLabel, React.CSSProperties> = {
  'PREVENTA': {
    background: 'var(--tw-section-dark)',
    color: 'var(--tw-text-inverse)',
    borderTop: '2px solid var(--tw-terra)',
    boxShadow: '0 8px 24px -6px rgba(83, 59, 34, 0.55), 0 3px 8px rgba(0,0,0,0.22)',
  },
  'NEW': {
    background: 'var(--tw-sage)',
    color: 'var(--tw-text)',
    borderTop: '2px solid var(--tw-section-dark)',
    boxShadow: '0 8px 20px -6px rgba(83, 59, 34, 0.4), 0 3px 8px rgba(0,0,0,0.15)',
  },
};

export default function ProductCard({ p, onRequestBreakdown }: { p: Producto; onRequestBreakdown: (unitCents: number, qty: number, producerPct: number) => void }) {
  const [hover, setHover] = useState(false);
  const [weightIdx, setWeightIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [grindMode, setGrindMode] = useState<GrindMode>('Grano');
  const [grindType, setGrindType] = useState<GrindType>('V60');
  const { add, open: openCart } = useCartActions();
  const tone = TAG_TONES[p.tagTone] ?? TAG_TONES.sage;
  const [wLabel, unitCents] = p.weights[weightIdx];
  const stockDispo = disponibleKg(p.stockKg, p.stockReservedKg);
  const computedMaxQty = maxQtyForWeight(stockDispo, wLabel as WeightLabel);
  const isAgotado = computedMaxQty === 0;
  const netCents = Math.round(unitCents / 1.18);
  const caficultorCents = Math.round(netCents * qty * p.producerPct / 100);
  const effectiveGrind = grindMode === 'Grano' ? 'Grano' : grindType;
  const currentGrindInfo = GRIND_OPTIONS.find(g => g.label === grindType)!;

  useEffect(() => {
    if (!isAgotado) setQty((q) => Math.min(q, computedMaxQty));
  }, [computedMaxQty, isAgotado]);

  const handleReservar = () => {
    add({
      id: `${p.code}-${wLabel}-${effectiveGrind}`,
      sku: p.code,
      productoId: p.id,
      name: p.name,
      weight: wLabel as '250g' | '1kg' | '3kg',
      grind: effectiveGrind,
      unitCents,
      qty,
      maxQty: computedMaxQty,
      caficultor: p.producer,
      finca: p.farm,
      producerPct: p.producerPct,
      badge: 'Selección',
    });
    openCart();
  };

  return (
    <article
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ background: 'var(--tw-bg)', border: '1px solid #1f302833', borderRadius: 'var(--tw-radius-lg)', padding: 18, transition: 'all .45s cubic-bezier(.2,.7,.2,1)', transform: hover ? 'translateY(-6px)' : 'translateY(0)', boxShadow: hover ? '0 28px 52px -20px #533b22cc' : '0 12px 28px -20px #533b2288', position: 'relative', display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      {p.label && (
        <div style={{
          position: 'absolute', top: -12, right: -12, zIndex: 10,
          ...LABEL_STYLES[p.label],
          padding: '9px 20px', borderRadius: '0 var(--tw-radius-md) 0 var(--tw-radius-md)',
          fontFamily: 'var(--tw-font-body)', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.22em', textTransform: 'uppercase',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--tw-terra)', boxShadow: '0 0 0 0 #c96e4b88', animation: 'tw-pulse 2s ease-in-out infinite', display: 'inline-block' }} />
          <span style={{ fontFamily: 'var(--tw-font-label)', fontSize: 11, letterSpacing: '0.18em', color: 'var(--tw-text-inverse)', textTransform: 'uppercase' }}> {p.label}</span>

        </div>
      )}
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--tw-radius-lg)' }}>
        {p.photo ? (
          <img
            src={p.photo}
            alt={p.name}
            style={{ width: '100%', aspectRatio: '5 / 3', objectFit: 'cover', borderRadius: 'var(--tw-radius-lg)', display: 'block' }}
          />
        ) : (
          <ImageSlot label={`bolsa · ${p.name.toLowerCase()}`} tone={p.tone} ratio="7 / 3" />
        )}
        <div style={{ position: 'absolute', top: 14, left: 14, background: '#1f3028e0', color: 'var(--tw-text-inverse)', padding: '6px 12px', borderRadius: 'var(--tw-radius-pill)', fontFamily: 'var(--tw-font-data)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', backdropFilter: 'blur(6px)' }}>
          № {p.code} · SCA {p.score}
        </div>
        <div style={{ position: 'absolute', top: 14, right: 14, background: tone.bg, color: tone.text, padding: '6px 12px', borderRadius: 'var(--tw-radius-pill)', fontFamily: 'var(--tw-font-label)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          {p.tag}
        </div>
        <div style={{ position: 'absolute', bottom: 14, left: 14, background: '#f2e0cce0', color: 'var(--tw-text)', padding: '6px 10px', borderRadius: 'var(--tw-radius-sm)', fontFamily: 'var(--tw-font-data)', fontSize: 10, letterSpacing: '0.12em', backdropFilter: 'blur(6px)' }}>
          {p.alt} · {p.region.split(' · ').slice(-1)[0]}
        </div>
        <div style={{ position: 'absolute', bottom: 14, right: 14, background: grindMode === 'Molido' ? 'var(--tw-terra)' : 'var(--tw-section-dark)', color: 'var(--tw-text-inverse)', padding: '5px 10px', borderRadius: 'var(--tw-radius-sm)', fontFamily: 'var(--tw-font-label)', fontSize: 9, letterSpacing: '0.18em', backdropFilter: 'blur(6px)', transition: 'background .3s ease' }}>
          {grindMode === 'Grano' ? 'EN GRANO' : `MOLIDO · ${currentGrindInfo.coarse.toUpperCase()}`}
        </div>
      </div>

      <div>
        <h3 style={{ fontFamily: 'var(--tw-font-display)', fontWeight: 600, fontSize: 26, lineHeight: 1.0, margin: 0, letterSpacing: '-0.005em', color: 'var(--tw-text)' }}>{p.name}</h3>
        <div style={{ fontFamily: 'var(--tw-font-body)', fontSize: 12, color: 'var(--tw-text-muted)', marginTop: 6, fontStyle: 'italic' }}>{p.sub}</div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontFamily: 'var(--tw-font-body)', fontSize: 11, fontWeight: 500, padding: '6px 11px', borderRadius: 'var(--tw-radius-sm)', background: 'var(--tw-section-dark)', color: 'var(--tw-text-inverse)' }}>
          Caficultor: <strong style={{ fontWeight: 600 }}>{p.producer}</strong>
        </span>
        <span style={{ fontFamily: 'var(--tw-font-body)', fontSize: 11, fontWeight: 500, padding: '6px 11px', borderRadius: 'var(--tw-radius-sm)', background: 'var(--tw-text-faint)', color: 'var(--tw-text)' }}>{p.farm}</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {p.notes.map((n) => (
          <span key={n} style={{ fontFamily: 'var(--tw-font-body)', fontSize: 11, fontWeight: 500, padding: '5px 11px', borderRadius: 'var(--tw-radius-pill)', background: '#8faf8a44', color: 'var(--tw-text)', border: '1px solid #8faf8a99' }}>{n}</span>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: grindMode === 'Molido' ? '#c96e4b18' : '#8faf8a22', border: `1px solid ${grindMode === 'Molido' ? '#c96e4b55' : '#8faf8a66'}`, borderRadius: 'var(--tw-radius-md)', padding: '10px 14px', transition: 'all .35s ease' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: grindMode === 'Molido' ? 'var(--tw-terra)' : 'var(--tw-sage)', animation: 'tw-pulse-mini 2s ease-in-out infinite', display: 'inline-block', transition: 'background .35s ease' }} />
        <span style={{ fontFamily: 'var(--tw-font-body)', fontSize: 12, fontWeight: 500, color: 'var(--tw-text)' }}>
          {grindMode === 'Grano'
            ? 'Tostado un día antes del envío — café ultra fresco'
            : 'Tostado y molido el día del envío — máxima frescura'}
        </span>
      </div>

      <p style={{ fontFamily: 'var(--tw-font-display)', fontSize: 14, lineHeight: 1.45, color: 'var(--tw-text)', fontStyle: 'italic', margin: 0, opacity: 0.85 }}>{p.desc}</p>

      {grindMode === 'Grano' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingTop: 14, borderTop: '1px solid #1f302822' }}>
          <span style={{ fontFamily: 'var(--tw-font-data)', fontSize: 9, letterSpacing: '0.2em', color: 'var(--tw-text-muted)' }}>BIEN PARA</span>
          {p.brews.map((b) => (
            <span key={b} style={{ fontFamily: 'var(--tw-font-body)', fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 6, background: '#1f302811', color: 'var(--tw-text)', border: '1px solid #1f302822' }}>{b}</span>
          ))}
        </div>
      ) : (
        <div style={{ paddingTop: 14, borderTop: '1px solid #1f302822' }}>
          <span style={{ fontFamily: 'var(--tw-font-data)', fontSize: 9, letterSpacing: '0.2em', color: 'var(--tw-text-muted)', display: 'block', marginBottom: 8 }}>TIPO DE MOLIDO</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {GRIND_OPTIONS.map(({ label, coarse }) => (
              <button
                key={label}
                className="tw-pc-btn-selector"
                onClick={() => setGrindType(label)}
                style={{
                  padding: '6px 10px', borderRadius: 'var(--tw-radius-sm)', cursor: 'pointer', border: 'none',
                  fontFamily: 'var(--tw-font-body)', fontSize: 11, fontWeight: 600,
                  background: grindType === label ? 'var(--tw-terra)' : '#1f302811',
                  color: grindType === label ? 'var(--tw-text-inverse)' : 'var(--tw-text)',
                  outline: grindType === label ? '2px solid #c96e4b55' : 'none',
                  transition: 'all .2s ease',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                }}
              >
                <span>{label}</span>
                <span style={{ fontFamily: 'var(--tw-font-data)', fontSize: 8, letterSpacing: '0.1em', opacity: 0.7 }}>{coarse}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div style={{ fontFamily: 'var(--tw-font-data)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--tw-text-muted)', marginBottom: 8 }}>PRESENTACIÓN</div>

        {/* Grano / Molido toggle */}
        <div style={{ display: 'flex', background: '#1f302811', borderRadius: 'var(--tw-radius-sm)', padding: 3, marginBottom: 10, border: '1px solid #1f302820' }}>
          {(['Grano', 'Molido'] as GrindMode[]).map((mode) => (
            <button
              key={mode}
              className="tw-pc-btn-selector"
              onClick={() => setGrindMode(mode)}
              style={{
                flex: 1, padding: '8px 10px', borderRadius: 'var(--tw-radius-sm)', cursor: 'pointer', border: 'none',
                fontFamily: 'var(--tw-font-body)', fontSize: 12, fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                background: grindMode === mode ? (mode === 'Grano' ? 'var(--tw-section-dark)' : 'var(--tw-terra)') : 'transparent',
                color: grindMode === mode ? 'var(--tw-text-inverse)' : '#533b2299',
                transition: 'all .25s ease',
                boxShadow: grindMode === mode ? '0 4px 12px -4px rgba(83,59,34,0.4)' : 'none',
              }}
            >
              {mode === 'Grano' ? '⬡ Grano' : '≋ Molido'}
            </button>
          ))}
        </div>

        {/* Weight selector */}
        <div style={{ display: 'flex', gap: 8 }}>
          {p.weights.map(([wl], i) => {
            const wMax = maxQtyForWeight(stockDispo, wl as WeightLabel);
            const wAgotado = wMax === 0;
            return (
              <button
                key={wl}
                className="tw-pc-btn-selector"
                onClick={() => { setWeightIdx(i); setQty(1); }}
                disabled={wAgotado}
                style={{
                  flex: 1, padding: '8px 6px', borderRadius: 'var(--tw-radius-sm)',
                  cursor: wAgotado ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--tw-font-body)', fontSize: 12, fontWeight: 600,
                  background: wAgotado ? '#1f302811' : weightIdx === i ? 'var(--tw-terra)' : 'var(--tw-bg)',
                  color: wAgotado ? '#533b2266' : weightIdx === i ? 'var(--tw-text-inverse)' : 'var(--tw-text)',
                  border: `1px solid ${wAgotado ? '#1f302822' : weightIdx === i ? 'var(--tw-terra)' : '#1f302833'}`,
                  transition: 'all .25s ease',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                {wl}
                {wAgotado && (
                  <span style={{ display: 'block', fontFamily: 'var(--tw-font-data)', fontSize: 7, letterSpacing: '0.12em', color: 'var(--tw-terra)', lineHeight: 1, marginTop: 2 }}>AGOTADO</span>
                )}
              </button>
            );
          })}
        </div>
        <div style={{ fontFamily: 'var(--tw-font-data)', fontSize: 10, letterSpacing: '0.18em', color: 'var(--tw-text-muted)', marginTop: 8 }}>
          Stock verde: {p.stockKg} kg{p.stockReservedKg ? ` · reservado: ${p.stockReservedKg.toFixed(2)} kg` : ''}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontFamily: 'var(--tw-font-display)', fontWeight: 600, fontSize: 32, lineHeight: 1, color: 'var(--tw-text)' }}>
              {Money.formatPEN(unitCents * qty)}
            </div>
            <span style={{ fontFamily: 'var(--tw-font-data)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--tw-text-muted)', textTransform: 'uppercase', opacity: 0.6 }}>inc. IGV</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span style={{ fontFamily: 'var(--tw-font-data)', fontSize: 10, letterSpacing: '0.18em', color: 'var(--tw-text-muted)' }}>
              {p.producerPct}% al caficultor (sin IGV) · {Money.formatPEN(caficultorCents)}
            </span>
            <button
              onClick={() => onRequestBreakdown(unitCents, qty, p.producerPct)}
              title="Ver desglose de costos"
              style={{ background: 'none', border: '1px solid #533b2255', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}
            >
              <span style={{ fontFamily: 'serif', fontSize: 11, color: 'var(--tw-text-muted)', lineHeight: 1, userSelect: 'none' }}>i</span>
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #1f302833', borderRadius: 'var(--tw-radius-pill)', overflow: 'hidden', background: 'var(--tw-bg)', opacity: isAgotado ? 0.4 : 1 }}>
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={isAgotado} className="tw-pc-btn-qty" style={{ width: 36, height: 40, border: 'none', background: 'transparent', cursor: isAgotado ? 'not-allowed' : 'pointer', fontSize: 16, color: 'var(--tw-text)' }}>−</button>
          <span style={{ fontFamily: 'var(--tw-font-body)', fontSize: 13, fontWeight: 600, minWidth: 28, textAlign: 'center', color: 'var(--tw-text)' }}>{qty}</span>
          <button onClick={() => setQty((q) => Math.min(computedMaxQty, q + 1))} disabled={isAgotado || qty >= computedMaxQty} className="tw-pc-btn-qty" style={{ width: 36, height: 40, border: 'none', background: 'transparent', cursor: isAgotado || qty >= computedMaxQty ? 'not-allowed' : 'pointer', fontSize: 16, color: 'var(--tw-text)' }}>+</button>
        </div>
      </div>

      <button
        onClick={handleReservar}
        disabled={isAgotado}
        style={{
          marginTop: 4, fontFamily: 'var(--tw-font-body)', fontWeight: 600, fontSize: 13,
          letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--tw-text-inverse)',
          background: isAgotado ? '#533b2244' : hover ? 'var(--tw-terra)' : 'var(--tw-section-dark)',
          padding: '12px 18px', borderRadius: 'var(--tw-radius-pill)', border: 'none',
          cursor: isAgotado ? 'not-allowed' : 'pointer',
          boxShadow: isAgotado ? 'none' : '0 12px 24px -14px #533b22aa',
          transition: 'all .35s ease', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {isAgotado ? (
          <>
            <span>Agotado para este ciclo</span>
          </>
        ) : (
          <>
            <span>Reservar — entrega junio</span>
            <span>→</span>
          </>
        )}
      </button>

      <style>{`
        .tw-pc-btn-qty { transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1); }
        .tw-pc-btn-qty:active:not(:disabled) { transform: scale(0.90); transition: transform 120ms cubic-bezier(0.23, 1, 0.32, 1); }
        .tw-pc-btn-selector { transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1); }
        .tw-pc-btn-selector:active { transform: scale(0.95); transition: transform 120ms cubic-bezier(0.23, 1, 0.32, 1); }
      `}</style>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          "name": `${p.name} — ${p.farm}, ${p.region.split(' · ').slice(-1)[0]}`,
          "description": p.desc,
          "sku": p.code,
          "brand": { "@type": "Brand", "name": "Tunay Wasi" },
          "manufacturer": { "@type": "Person", "name": p.producer },
          "offers": {
            "@type": "Offer",
            "priceCurrency": "PEN",
            "price": (p.weights[0][1] / 100).toFixed(2),
            "availability": isAgotado ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
            "seller": { "@type": "Organization", "name": "Tunay Wasi" },
          },
          ...(p.score ? { "additionalProperty": [{
            "@type": "PropertyValue",
            "name": "Puntaje SCA",
            "value": String(p.score),
          }] } : {}),
        }) }}
      />
    </article>
  );
}
