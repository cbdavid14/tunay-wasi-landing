/**
 * ProductCardCompact — small marketplace card matching simulador-home design
 * Shows: SCA badge, process badge, coffee icon/photo, name, producer, price/kg, + button
 */
import { useState } from 'react';
import type { Producto } from '@/shared/types/catalog';
import { Money } from '@/shared/money';
import { useCartActions } from '@/features/cart/useCart';

const PROCESS_COLORS: Record<string, string> = {
  Lavado: '#4a90c4',
  Natural: '#c96e4b',
  Honey:   '#f39c12',
};

export default function ProductCardCompact({ p }: { p: Producto }) {
  const [hover, setHover] = useState(false);
  const { add, open: openCart } = useCartActions();

  const [wLabel, unitCents] = p.weights[0] ?? ['250g', 0];
  const pricePerKg = wLabel === '1kg' ? unitCents
                   : wLabel === '250g' ? unitCents * 4
                   : wLabel === '3kg'  ? Math.round(unitCents / 3)
                   : unitCents;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    add({
      id: `${p.code}-${wLabel}-Grano`,
      sku: p.code,
      productoId: p.id,
      name: p.name,
      weight: wLabel as '250g' | '1kg' | '3kg',
      grind: 'Grano',
      unitCents,
      qty: 1,
      maxQty: 10,
      caficultor: p.producer,
      finca: p.farm,
      producerPct: p.producerPct,
      badge: 'Selección',
    });
    openCart();
  };

  const processColor = PROCESS_COLORS[p.tag] ?? 'var(--tw-terra)';

  return (
    <>
      <style>{`
        .sc-card { background: var(--tw-card); border: 1px solid var(--tw-border); border-radius: 10px; overflow: hidden; cursor: pointer; transition: all .15s ease; position: relative; }
        .sc-card:hover { border-color: var(--tw-terra); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(201,110,75,.15); }
        .sc-add { width: 26px; height: 26px; border-radius: 7px; background: var(--tw-terra); color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; transition: background .15s ease; flex-shrink: 0; }
        .sc-add:hover { background: var(--tw-terra-h); }
      `}</style>
      <article
        className="sc-card"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{ opacity: hover ? 1 : undefined }}
      >
        {/* Photo area */}
        <div style={{
          height: 80,
          background: 'linear-gradient(135deg, #2a1810, #1a0f08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, position: 'relative',
          overflow: 'hidden',
        }}>
          {p.photo
            ? <img src={p.photo} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
            : <span>☕</span>
          }
          {/* SCA badge — top left */}
          <div style={{
            position: 'absolute', top: 6, left: 6,
            background: 'rgba(10,5,2,.85)',
            border: '1px solid rgba(201,110,75,.4)',
            borderRadius: 6, padding: '2px 6px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.1,
          }}>
            <span style={{ fontFamily: 'var(--tw-font-display)', fontSize: 12, fontWeight: 700, color: '#fff' }}>{p.score}</span>
            <span style={{ fontSize: 7, color: '#a89080', fontWeight: 700, letterSpacing: '0.08em' }}>SCA</span>
          </div>
          {/* Process badge — top right */}
          <div style={{
            position: 'absolute', top: 6, right: 6,
            background: processColor,
            borderRadius: 20, padding: '2px 7px',
            fontSize: 8, fontWeight: 700, color: '#fff',
            fontFamily: 'var(--tw-font-body)',
            letterSpacing: '0.06em',
          }}>
            {p.tag}
          </div>
        </div>

        {/* Info */}
        <div style={{ padding: '8px 10px' }}>
          <div style={{
            fontFamily: 'var(--tw-font-body)',
            fontSize: 11, fontWeight: 700,
            color: 'var(--tw-text)', lineHeight: 1.2,
            marginBottom: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{p.name}</div>
          <div style={{
            fontFamily: 'var(--tw-font-body)',
            fontSize: 9, color: 'var(--tw-terra)',
            fontWeight: 600, marginBottom: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{p.producer} · {p.region.split(' · ').pop()}</div>
          <div style={{
            fontFamily: 'var(--tw-font-body)',
            fontSize: 9, color: 'var(--tw-text-faint)',
            marginBottom: 6,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{p.notes.slice(0, 2).join(' · ')}</div>

          {/* Footer: price + add button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{
                fontFamily: 'var(--tw-font-body)',
                fontSize: 13, fontWeight: 700,
                color: 'var(--tw-text)', lineHeight: 1,
              }}>{Money.formatPEN(pricePerKg)}</div>
              <div style={{
                fontFamily: 'var(--tw-font-data)',
                fontSize: 8, color: 'var(--tw-text-faint)',
              }}>/kg</div>
            </div>
            <button className="sc-add" onClick={handleAdd} title={`Agregar ${p.name}`}>+</button>
          </div>
        </div>
      </article>
    </>
  );
}
