import { useState, useEffect } from 'react';
import { useCatalog } from '../useCatalog';
import FilterPanel, { type FilterState } from './FilterPanel';
import ProductCard from './ProductCard';
import CostBreakdownModal from './CostBreakdownModal';
import Resenas from './Resenas';
import type { Producto } from '@/shared/types/catalog';
import { useCartActions } from '@/features/cart/useCart';
import { Money } from '@/shared/money';

const PER_PAGE = 3;

function gridStyle(count: number): React.CSSProperties {
  if (count === 1) return { display: 'grid', gridTemplateColumns: '1fr', gap: 20, width: '45%', marginLeft: 'auto', marginRight: 'auto' };
  if (count === 2) return { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, width: '100%' };
  return { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, width: '100%' };
}

function FlightBundle({ products }: { products: Producto[] }) {
  const { add, open: openCart } = useCartActions();
  const [hover, setHover] = useState(false);

  if (products.length < 3) return null;

  // Tomar los primeros 3 productos, siempre en 250g
  const flight = products.slice(0, 3);
  const totalCents = flight.reduce((acc, p) => {
    const price250 = p.weights.find(([w]) => w === '250g')?.[1] ?? p.weights[0][1];
    return acc + price250;
  }, 0);
  // Descuento del 10% en bundle
  const discountCents = Math.round(totalCents * 0.1);
  const finalCents = totalCents - discountCents;

  const handleAddFlight = () => {
    flight.forEach(p => {
      const price250 = p.weights.find(([w]) => w === '250g')?.[1] ?? p.weights[0][1];
      add({
        id: `flight-${p.code}-250g-Grano`,
        sku: p.code,
        productoId: p.id,
        name: `${p.name} (Flight)`,
        weight: '250g',
        grind: 'Grano',
        unitCents: price250 - Math.round(price250 * 0.1),
        qty: 1,
        maxQty: 10,
        caficultor: p.producer,
        finca: p.farm,
        producerPct: p.producerPct,
        badge: 'Flight',
      });
    });
    openCart();
  };

  return (
    <div style={{
      marginTop: 48, padding: '32px 36px', borderRadius: 20,
      background: '#1f3028', border: '1px solid #533b22',
      display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'center',
    }} className="tw-flight-bundle">
      <div>
        <div style={{ fontFamily: 'Bowlby One SC, sans-serif', fontSize: 10, letterSpacing: '0.32em', color: '#c96e4b', textTransform: 'uppercase', marginBottom: 12 }}>
          Flight de cosecha · 3 lotes
        </div>
        <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 600, fontSize: 28, lineHeight: 1.1, color: '#f2e0cc', margin: '0 0 10px', letterSpacing: '-0.01em' }}>
          Prueba los 3 orígenes de este ciclo
        </h3>
        <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, lineHeight: 1.6, color: '#c4b297', margin: '0 0 16px' }}>
          250g de cada lote — un recorrido por tres fincas, tres caficultores, tres perfiles de taza.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {flight.map(p => (
            <span key={p.id} style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.16em',
              padding: '4px 10px', borderRadius: 6,
              background: '#f2e0cc14', color: '#f2e0cc99', border: '1px solid #f2e0cc22',
              textTransform: 'uppercase',
            }}>
              {p.name.split(' - ')[0]}
            </span>
          ))}
        </div>
      </div>
      <div style={{ textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.2em', color: '#8faf8a', textTransform: 'uppercase', marginBottom: 6 }}>
          10% descuento bundle
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'center', marginBottom: 4 }}>
          <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 36, fontWeight: 700, color: '#f2e0cc', lineHeight: 1 }}>
            {Money.formatPEN(finalCents)}
          </span>
        </div>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, color: '#f2e0cc55', textDecoration: 'line-through', marginBottom: 16 }}>
          {Money.formatPEN(totalCents)}
        </div>
        <button
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onClick={handleAddFlight}
          style={{
            fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 12,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: '#1f3028', background: hover ? '#e8d2b6' : '#f2e0cc',
            padding: '12px 24px', borderRadius: 999, border: 'none',
            cursor: 'pointer', whiteSpace: 'nowrap',
            boxShadow: '0 12px 24px -10px #00000055',
            transition: 'all .25s ease',
          }}
        >
          Armar el flight →
        </button>
      </div>
      <style>{`
        @media (max-width: 640px) { .tw-flight-bundle { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

export default function Cafe() {
  const [selected, setSelected] = useState<FilterState>({
    brew: ['Todos'], experiencia: ['Todos'], tueste: ['Todos'], intensidad: ['Todos'], sca: ['Todos'],
  });
  const { data: products, isLoading } = useCatalog();
  const [breakdownData, setBreakdownData] = useState<{ unitCents: number; qty: number; producerPct: number } | null>(null);
  const [page, setPage] = useState(0);

  function applyFilters(list: Producto[]): Producto[] {
    return list.filter(p => {
      const brew = selected.brew ?? ['Todos'];
      if (!brew.includes('Todos') && !brew.some(b => p.brews.includes(b))) return false;
      const sca = selected.sca ?? ['Todos'];
      if (!sca.includes('Todos')) {
        const minSca = Math.max(...sca.map(s => parseInt(s)));
        const score = parseFloat(String(p.score));
        if (!isNaN(minSca) && !isNaN(score) && score < minSca) return false;
      }
      return true;
    });
  }

  const filtered = products ? applyFilters(products) : [];
  const filteredTotal = filtered.length;

  const useCarousel = filteredTotal > PER_PAGE;
  const totalPages = Math.max(1, Math.ceil(filteredTotal / PER_PAGE));
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  useEffect(() => { setPage(0); }, [selected]);

  const navBtnStyle = (enabled: boolean): React.CSSProperties => ({
    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
    background: enabled ? '#1f3028' : '#1f302822',
    border: 'none', color: '#f2e0cc',
    fontSize: 20, lineHeight: 1,
    cursor: enabled ? 'pointer' : 'default',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    opacity: enabled ? 1 : 0.35,
    transition: 'all .2s ease',
  });

  return (
    <section id="cafe" style={{ background: '#f2e0cc', padding: '100px 36px', position: 'relative' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 48, marginBottom: 30, flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontFamily: 'Bowlby One SC, sans-serif', fontSize: 11, letterSpacing: '0.32em', color: '#c96e4b', textTransform: 'uppercase' }}>03 — Café de cosecha</span>
          </div>
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, lineHeight: 1.65, color: '#533b22', maxWidth: 380, margin: 0 }}>
            Preventa abierta — tostamos y despachamos en junio.
          </p>
        </div>

        <FilterPanel selected={selected} setSelected={setSelected} />

        {isLoading ? (
          <div style={gridStyle(3)} className="tw-cafe-grid">
            {[0, 1, 2].map(i => (
              <div key={i} style={{ background: '#e8d2b6', borderRadius: 20, height: 420, animation: 'tw-skeleton-pulse 1.6s ease-in-out infinite' }} />
            ))}
          </div>
        ) : !useCarousel ? (
          <div style={gridStyle(filteredTotal)} className="tw-cafe-grid">
            {filtered.map(p => (
              <ProductCard
                key={p.id}
                p={p}
                onRequestBreakdown={(uc, q, pct) => setBreakdownData({ unitCents: uc, qty: q, producerPct: pct })}
              />
            ))}
          </div>
        ) : (
          <>
            {/* Carousel track */}
            <div style={{ overflowX: 'clip' as React.CSSProperties['overflowX'], overflowY: 'visible', paddingTop: 14, marginTop: -14, paddingBottom: 12 }}>
              <div
                style={{
                  display: 'flex',
                  width: `${totalPages * 100}%`,
                  transform: `translateX(-${(page / totalPages) * 100}%)`,
                  transition: 'transform 0.45s cubic-bezier(.2,.7,.2,1)',
                }}
              >
                {Array.from({ length: totalPages }).map((_, pageIdx) => (
                  <div key={pageIdx} className="tw-cafe-page" style={{ width: `${100 / totalPages}%` }}>
                    {filtered.slice(pageIdx * PER_PAGE, (pageIdx + 1) * PER_PAGE).map(p => (
                      <ProductCard
                        key={p.id}
                        p={p}
                        onRequestBreakdown={(uc, q, pct) => setBreakdownData({ unitCents: uc, qty: q, producerPct: pct })}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation: arrows + dots */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 28 }}>
              <button onClick={() => setPage(p => p - 1)} disabled={!canPrev} style={navBtnStyle(canPrev)}>‹</button>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    style={{
                      width: i === page ? 28 : 8, height: 8, borderRadius: 999,
                      background: i === page ? '#c96e4b' : '#1f302833',
                      border: 'none', cursor: 'pointer', padding: 0,
                      transition: 'all .3s ease',
                    }}
                  />
                ))}
              </div>
              <button onClick={() => setPage(p => p + 1)} disabled={!canNext} style={navBtnStyle(canNext)}>›</button>
            </div>
          </>
        )}

        <FlightBundle products={products ?? []} />

        <Resenas />
      </div>

      <style>{`
        .tw-cafe-grid { max-width: 1200px; margin-left: auto; margin-right: auto; }
        @media (max-width: 1040px) { .tw-cafe-grid { grid-template-columns: repeat(2, 1fr) !important; width: 100% !important; } }
        @media (max-width: 640px)  { .tw-cafe-grid { grid-template-columns: 1fr !important; gap: 20px !important; } }
        .tw-cafe-page {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          box-sizing: border-box;
          align-items: start;
          flex-shrink: 0;
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
        }
        @media (max-width: 1040px) { .tw-cafe-page { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 640px)  { .tw-cafe-page { grid-template-columns: 1fr !important; } }
        @keyframes tw-skeleton-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
      `}</style>

      {breakdownData && (
        <CostBreakdownModal
          unitCents={breakdownData.unitCents}
          qty={breakdownData.qty}
          producerPct={breakdownData.producerPct}
          onClose={() => setBreakdownData(null)}
        />
      )}
    </section>
  );
}
