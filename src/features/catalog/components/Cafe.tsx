import { useState, useRef } from 'react';
import { useCatalog } from '../useCatalog';
import { useCaficultores } from '../useCaficultores';
import ProductCardCompact from './ProductCardCompact';
import CaficultorProfileModal from './CaficultorProfileModal';
import { useCartItems, useCartActions, useCartSubtotalCents } from '@/features/cart/useCart';
import { Money } from '@/shared/money';
import type { Producto } from '@/shared/types/catalog';
import type { Caficultor } from '@/shared/types/catalog';

/* ── Types ────────────────────────────────────────────────── */
type RegionFilter = 'Todos' | string;
type ProcesoFilter = 'Todo proceso' | 'Lavado' | 'Natural' | 'Honey';

const PROCESO_FILTERS: ProcesoFilter[] = ['Todo proceso', 'Lavado', 'Natural', 'Honey'];
const PROCESS_EMOJI: Record<string, string> = {
  Lavado: '☕', Natural: '🫘', Honey: '🍯', Otros: '☕',
};
const PROCESS_SUBTITLE: Record<string, string> = {
  Lavado: 'Cuerpo · Notas suaves',
  Natural: 'Cuerpo · Frutas intensas',
  Honey: 'Dulzor · Notas suaves',
  Otros: '',
};

/* ── Helpers ──────────────────────────────────────────────── */
function groupByProcess(
  products: Producto[],
  procesoFilter: ProcesoFilter,
  regionFilter: RegionFilter,
  search: string,
) {
  const q = search.toLowerCase();
  const filtered = products.filter(p => {
    const matchRegion = regionFilter === 'Todos' || p.region?.includes(regionFilter);
    const matchProceso = procesoFilter === 'Todo proceso' || p.tag === procesoFilter;
    const matchSearch =
      !search ||
      p.name?.toLowerCase().includes(q) ||
      p.producer?.toLowerCase().includes(q) ||
      p.region?.toLowerCase().includes(q) ||
      p.tag?.toLowerCase().includes(q);
    return matchRegion && matchProceso && matchSearch;
  });

  const groups: Record<string, Producto[]> = {};
  filtered.forEach(p => {
    const key = p.tag || 'Otros';
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });
  return groups;
}

function getRegions(products: Producto[]): string[] {
  const regions = new Set<string>();
  products.forEach(p => {
    if (p.region) p.region.split(' · ').forEach(r => regions.add(r.trim()));
  });
  return Array.from(regions).sort();
}

/* ── Filter chip ──────────────────────────────────────────── */
function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px',
        borderRadius: 6,
        fontSize: 10, fontWeight: 600,
        fontFamily: 'var(--tw-font-body)',
        cursor: 'pointer',
        border: active ? '1px solid var(--tw-terra)' : '1px solid var(--tw-border)',
        background: active ? 'var(--tw-terra)' : 'transparent',
        color: active ? '#fff' : 'var(--tw-text-muted)',
        transition: 'all .12s ease',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--tw-terra)';
          (e.currentTarget as HTMLElement).style.color = 'var(--tw-terra)';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--tw-border)';
          (e.currentTarget as HTMLElement).style.color = 'var(--tw-text-muted)';
        }
      }}
    >
      {label}
    </button>
  );
}

/* ── Process section with compact grid ───────────────────── */
function ProcessSection({ title, products, onScroll }: {
  title: string;
  products: Producto[];
  onScroll?: (dir: 'left' | 'right') => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'right' ? 480 : -480, behavior: 'smooth' });
    onScroll?.(dir);
  };

  if (!products.length) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>{PROCESS_EMOJI[title] ?? '☕'}</span>
            <span style={{
              fontFamily: 'var(--tw-font-body)', fontSize: 13,
              fontWeight: 700, color: 'var(--tw-text)',
            }}>
              Cafés {title}
            </span>
          </div>
          {PROCESS_SUBTITLE[title] && (
            <div style={{
              fontFamily: 'var(--tw-font-body)', fontSize: 9,
              color: 'var(--tw-text-muted)', marginTop: 2, paddingLeft: 22,
            }}>
              {PROCESS_SUBTITLE[title]}
            </div>
          )}
        </div>
        {/* Nav arrows */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {(['left', 'right'] as const).map(dir => (
            <button
              key={dir}
              onClick={() => scroll(dir)}
              style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'var(--tw-card)',
                border: '1px solid var(--tw-border)',
                cursor: 'pointer', fontSize: 14,
                color: 'var(--tw-text)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .15s ease', flexShrink: 0,
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = 'var(--tw-terra)';
                el.style.color = '#fff';
                el.style.borderColor = 'var(--tw-terra)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = 'var(--tw-card)';
                el.style.color = 'var(--tw-text)';
                el.style.borderColor = 'var(--tw-border)';
              }}
            >
              {dir === 'left' ? '‹' : '›'}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable row with 4-col grid */}
      <div
        ref={scrollRef}
        style={{
          overflowX: 'auto', overflowY: 'visible',
          paddingBottom: 8,
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.max(products.length, 4)}, minmax(140px, 1fr))`,
          gap: 10,
          minWidth: products.length <= 4 ? undefined : products.length * 150,
        }}>
          {products.map(p => (
            <ProductCardCompact key={p.id} p={p} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── "Mis Compras" panel ──────────────────────────────────── */
function MisComprasPanel() {
  const items = useCartItems();
  const subtotalCents = useCartSubtotalCents();
  const { open: openCart } = useCartActions();

  const count = items.length;

  if (count === 0) {
    return (
      <div style={{
        width: 230, flexShrink: 0,
        marginLeft: 12,
      }}>
        <div style={{
          fontFamily: 'var(--tw-font-body)', fontSize: 10,
          fontWeight: 700, color: 'var(--tw-text)',
          marginBottom: 8,
        }}>
          Mis Compras
        </div>
        <div style={{
          background: 'var(--tw-card)',
          border: '1px solid var(--tw-border)',
          borderRadius: 10, padding: '16px 12px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 20, marginBottom: 6 }}>📦</div>
          <div style={{
            fontFamily: 'var(--tw-font-body)', fontSize: 10,
            color: 'var(--tw-text-muted)',
          }}>
            Agrega un café para ver tus compras
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: 230, flexShrink: 0, marginLeft: 12 }}>
      {/* Header */}
      <div style={{
        fontFamily: 'var(--tw-font-body)', fontSize: 10,
        fontWeight: 700, color: 'var(--tw-text)',
        marginBottom: 8,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        Mis Compras
        <span style={{
          background: 'var(--tw-terra)', color: '#fff',
          fontSize: 8, fontWeight: 700,
          borderRadius: 6, padding: '1px 5px',
        }}>{count}</span>
      </div>

      {/* Cart items as "pedido" cards */}
      {items.slice(0, 2).map((item, i) => (
        <div
          key={item.id}
          style={{
            background: i === 0 ? 'rgba(201,110,75,.05)' : 'var(--tw-card)',
            border: i === 0 ? '1px solid var(--tw-terra)' : '1px solid var(--tw-border)',
            borderRadius: 10, padding: '10px 12px',
            marginBottom: 8,
          } as React.CSSProperties}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <div style={{
              fontFamily: 'var(--tw-font-body)', fontSize: 10,
              fontWeight: 700, color: 'var(--tw-text)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              flex: 1, marginRight: 4,
            }}>
              {item.name} × {item.weight}
            </div>
            <div style={{
              fontFamily: 'var(--tw-font-body)', fontSize: 10,
              fontWeight: 700, color: 'var(--tw-terra)', flexShrink: 0,
            }}>
              {Money.formatPEN(item.unitCents * item.qty)}
            </div>
          </div>
          <div style={{
            fontFamily: 'var(--tw-font-body)', fontSize: 9,
            color: 'var(--tw-text-muted)', marginBottom: i === 0 ? 5 : 4,
          }}>
            {item.caficultor}
          </div>
          {i === 0 && (
            <>
              {/* Progress steps */}
              <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
                {[0, 1, 2, 3].map(step => (
                  <div key={step} style={{
                    flex: 1, height: 4, borderRadius: 2,
                    background: step === 0 ? 'var(--tw-sage)' : step === 1 ? 'var(--tw-terra)' : 'var(--tw-border)',
                    animation: step === 1 ? 'tw-pulse 1.5s infinite' : undefined,
                  }} />
                ))}
              </div>
              <div style={{
                display: 'inline-block',
                fontFamily: 'var(--tw-font-body)', fontSize: 9,
                fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                background: 'rgba(217,119,6,.12)', color: '#d97706',
              }}>
                Preparando tu pedido
              </div>
            </>
          )}
          {i > 0 && (
            <div style={{
              display: 'inline-block',
              fontFamily: 'var(--tw-font-body)', fontSize: 9,
              fontWeight: 700, padding: '2px 7px', borderRadius: 4,
              background: 'rgba(201,110,75,.12)', color: 'var(--tw-terra)',
            }}>
              En carrito
            </div>
          )}
        </div>
      ))}

      {/* Go to cart CTA */}
      <div style={{
        border: '1px solid var(--tw-terra)',
        borderRadius: 10, padding: 10, textAlign: 'center',
        marginTop: 2,
      }}>
        <div style={{
          fontFamily: 'var(--tw-font-body)', fontSize: 9,
          color: 'var(--tw-text-muted)', marginBottom: 4,
        }}>Total en carrito</div>
        <div style={{
          fontFamily: 'var(--tw-font-body)', fontSize: 14,
          fontWeight: 700, color: 'var(--tw-terra)',
        }}>
          {Money.formatPEN(subtotalCents)}
        </div>
        <button
          onClick={openCart}
          style={{
            marginTop: 6, width: '100%', padding: 6,
            borderRadius: 7, border: 'none',
            background: 'var(--tw-terra)', color: '#fff',
            fontFamily: 'var(--tw-font-body)', fontSize: 10,
            fontWeight: 700, cursor: 'pointer',
          }}
        >
          Ir al carrito →
        </button>
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────── */
export default function Cafe() {
  const { data: products, isLoading } = useCatalog();
  const { data: producers } = useCaficultores();
  const cartItems = useCartItems();

  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('Todos');
  const [procesoFilter, setProcesoFilter] = useState<ProcesoFilter>('Todo proceso');
  const [selectedProducer, setSelectedProducer] = useState<{ producer: Caficultor; idx: number } | null>(null);

  const allProducts = products ?? [];
  const regions = ['Todos', ...getRegions(allProducts)];
  const groups = groupByProcess(allProducts, procesoFilter, regionFilter, search);
  const hasResults = Object.values(groups).some(g => g.length > 0);
  const totalCount = Object.values(groups).reduce((s, g) => s + g.length, 0);

  const PROCESS_ORDER = ['Lavado', 'Natural', 'Honey'];
  const sortedGroupKeys = [
    ...PROCESS_ORDER.filter(k => groups[k]?.length),
    ...Object.keys(groups).filter(k => !PROCESS_ORDER.includes(k) && groups[k]?.length),
  ];

  // Active order banner (first cart item)
  const firstItem = cartItems[0];

  return (
    <>
      <style>{`
        .tw-cafe-wrap { background: var(--tw-bg); }

        /* Sticky inner header */
        .tw-cafe-header {
          position: sticky;
          top: 64px;
          z-index: 40;
          background: color-mix(in srgb, var(--tw-bg) 96%, transparent);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--tw-border);
          padding: 8px 24px;
        }
        .tw-cafe-search {
          flex: 1;
          background: var(--tw-bg);
          border: 1px solid var(--tw-border);
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 11px;
          font-family: var(--tw-font-body);
          color: var(--tw-text);
          outline: none;
        }
        .tw-cafe-search:focus { border-color: var(--tw-terra); }
        .tw-cafe-search::placeholder { color: var(--tw-text-muted); }

        /* Chips row */
        .tw-chips-row {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 8px;
        }
        .tw-chips-divider {
          width: 1px;
          background: var(--tw-border);
          margin: 0 2px;
          align-self: stretch;
        }

        /* 2-col layout */
        .tw-cafe-body {
          display: flex;
          gap: 12px;
          padding: 16px 24px 80px;
          max-width: 1320px;
          margin: 0 auto;
        }
        .tw-cafe-left { flex: 1; min-width: 0; }
        .tw-cafe-right {
          display: block;
        }

        /* compact grid for each process row */
        .tw-compact-scroll::-webkit-scrollbar { display: none; }

        /* mobile */
        @media (max-width: 900px) {
          .tw-cafe-right { display: none; }
          .tw-cafe-header { top: 56px; padding: 8px 16px; }
          .tw-cafe-body { padding: 12px 16px 80px; }
        }
      `}</style>

      <div className="tw-cafe-wrap" id="cafe">

        {/* ── Sticky inner header ── */}
        <div className="tw-cafe-header">
          {/* Search row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              className="tw-cafe-search"
              type="text"
              placeholder="🔎  Buscar café, variedad, región..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Filter chips */}
          <div className="tw-chips-row">
            {regions.map(r => (
              <Chip key={r} label={r} active={regionFilter === r} onClick={() => setRegionFilter(r)} />
            ))}
            <div className="tw-chips-divider" />
            {PROCESO_FILTERS.map(p => (
              <Chip key={p} label={p} active={procesoFilter === p} onClick={() => setProcesoFilter(p)} />
            ))}
          </div>
        </div>

        {/* ── Body: 2 columns ── */}
        <div className="tw-cafe-body">
          {/* LEFT — catalog */}
          <div className="tw-cafe-left">

            {/* Heading + count */}
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: 8,
            }}>
              <div style={{
                fontFamily: 'var(--tw-font-display)',
                fontSize: 16, fontWeight: 700,
                color: 'var(--tw-text)',
              }}>
                Cafés disponibles
              </div>
              <div style={{
                fontFamily: 'var(--tw-font-body)',
                fontSize: 9, color: 'var(--tw-text-muted)',
              }}>
                {totalCount} resultados
              </div>
            </div>

            {/* Active order banner */}
            {firstItem && (
              <div style={{
                background: 'rgba(201,110,75,.08)',
                border: '1px solid rgba(201,110,75,.2)',
                borderRadius: 8, padding: '7px 12px',
                fontSize: 10, color: 'var(--tw-text)',
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 10,
              }}>
                <span>
                  ⏳ 1 pedido ·{' '}
                  <strong>Preparando tu pedido ({firstItem.name} × {firstItem.weight})</strong>
                </span>
                <a
                  href="#"
                  style={{
                    fontFamily: 'var(--tw-font-body)', fontSize: 10,
                    fontWeight: 700, color: 'var(--tw-terra)',
                    textDecoration: 'none',
                  }}
                >
                  Actualizar →
                </a>
              </div>
            )}

            {/* Skeletons */}
            {isLoading && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{
                    height: 160,
                    background: 'var(--tw-card)',
                    borderRadius: 10,
                    animation: 'tw-skeleton-pulse 1.6s ease-in-out infinite',
                  }} />
                ))}
              </div>
            )}

            {/* Process sections */}
            {!isLoading && hasResults && sortedGroupKeys.map(process => (
              <ProcessSection
                key={process}
                title={process}
                products={groups[process]}
              />
            ))}

            {/* Empty state */}
            {!isLoading && !hasResults && (
              <div style={{
                textAlign: 'center', padding: '48px 24px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              }}>
                <div style={{ fontSize: 32 }}>☕</div>
                <div style={{
                  fontFamily: 'var(--tw-font-body)',
                  fontSize: 13, fontWeight: 700,
                  color: 'var(--tw-text)',
                }}>Sin resultados</div>
                <button
                  onClick={() => { setSearch(''); setRegionFilter('Todos'); setProcesoFilter('Todo proceso'); }}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 'var(--tw-radius-pill)',
                    background: 'var(--tw-terra)', color: '#fff',
                    border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--tw-font-body)',
                    fontSize: 11, fontWeight: 700,
                  }}
                >
                  Limpiar filtros
                </button>
              </div>
            )}

            {/* Caficultores destacados (desktop inline) */}
            {!isLoading && (producers?.length ?? 0) > 0 && (
              <div style={{
                marginTop: 28, paddingTop: 20,
                borderTop: '1px solid var(--tw-border)',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', marginBottom: 14,
                }}>
                  <div style={{
                    fontFamily: 'var(--tw-font-body)',
                    fontSize: 13, fontWeight: 700, color: 'var(--tw-text)',
                  }}>
                    Caficultores destacados
                  </div>
                  <a href="#caficultores" style={{
                    fontFamily: 'var(--tw-font-body)',
                    fontSize: 10, fontWeight: 600,
                    color: 'var(--tw-terra)', textDecoration: 'none',
                  }}>
                    Ver todos →
                  </a>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 12,
                }}>
                  {(producers ?? []).slice(0, 3).map((p, i) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProducer({ producer: p, idx: i })}
                      style={{
                        background: 'var(--tw-card)',
                        border: '1px solid var(--tw-border)',
                        borderRadius: 12, padding: 14,
                        display: 'flex', gap: 10, alignItems: 'center',
                        cursor: 'pointer', transition: 'border-color .15s ease',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--tw-terra)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--tw-border)'; }}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: 'linear-gradient(135deg,var(--tw-terra),var(--tw-sage))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, flexShrink: 0, overflow: 'hidden',
                      }}>
                        {p.photo
                          ? <img src={p.photo} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : '☕'
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--tw-font-body)', fontSize: 11, fontWeight: 700, color: 'var(--tw-text)' }}>{p.name}</div>
                        <div style={{ fontFamily: 'var(--tw-font-body)', fontSize: 9, color: 'var(--tw-terra)', fontWeight: 600 }}>{p.region} · {p.farm}</div>
                        <div style={{ fontFamily: 'var(--tw-font-data)', fontSize: 9, color: 'var(--tw-text-muted)', marginTop: 2 }}>SCA prom. {p.score} pts</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Mis Compras panel */}
          <div className="tw-cafe-right">
            <MisComprasPanel />
          </div>
        </div>

        {/* Trust strip */}
        <div style={{
          background: 'var(--tw-section-dark)',
          padding: '24px 36px',
          display: 'flex', gap: 28, flexWrap: 'wrap',
          justifyContent: 'center', alignItems: 'center',
        }}>
          {[
            { icon: '🔒', title: 'Pago escrow', sub: 'Tu dinero seguro' },
            { icon: '📜', title: 'Certificado SCA', sub: 'Calidad verificada' },
            { icon: '🚚', title: 'Envío directo', sub: 'Shalom · Olva · Cargo' },
            { icon: '🫘', title: 'Tostado fresco', sub: '24h antes del despacho' },
          ].map(({ icon, title, sub }) => (
            <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <div>
                <div style={{ fontFamily: 'var(--tw-font-body)', fontSize: 12, fontWeight: 700, color: '#f2e0cc' }}>{title}</div>
                <div style={{ fontFamily: 'var(--tw-font-body)', fontSize: 11, color: 'rgba(242,224,204,0.55)' }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedProducer && (
        <CaficultorProfileModal
          producer={selectedProducer.producer}
          idx={selectedProducer.idx}
          total={producers?.length ?? 0}
          onClose={() => setSelectedProducer(null)}
        />
      )}
    </>
  );
}
