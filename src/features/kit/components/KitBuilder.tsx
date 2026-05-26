import { useState } from 'react';
import { Money } from '@/shared/money';
import { useCatalog } from '@/features/catalog/useCatalog';
import { useCartActions } from '@/features/cart/useCart';
import type { Producto } from '@/shared/types/catalog';
import type { GrindOption } from '@/shared/types/cart';

// ── Constantes ────────────────────────────────────────────────────────────────

const CAJA_CENTS = 500; // S/5.00 add-on caja premium
const FLIGHT_SIZE = 3;  // lotes para el flight

type KitMode = 'bolsa' | 'flight';
type ForQuien = 'yo' | 'regalo';

// ── Helpers ───────────────────────────────────────────────────────────────────

function stepDot(n: number, active: boolean, done: boolean) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Bowlby One SC, sans-serif', fontSize: 10,
      background: done ? '#8faf8a' : active ? '#c96e4b' : '#1f302818',
      color: done || active ? '#f2e0cc' : '#533b2266',
      transition: 'all .3s ease',
    }}>
      {done ? '✓' : n}
    </div>
  );
}

function StepHeader({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: active ? 18 : 0 }}>
      {stepDot(n, active, done)}
      <span style={{
        fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 700,
        color: active ? '#1f3028' : done ? '#8faf8a' : '#533b2266',
        letterSpacing: '0.04em', transition: 'color .3s ease',
      }}>{label}</span>
    </div>
  );
}

function OptionCard({ selected, onClick, children }: {
  selected: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
        border: `2px solid ${selected ? '#c96e4b' : '#1f302822'}`,
        background: selected ? '#c96e4b14' : '#f2e0cc',
        outline: 'none', textAlign: 'left', transition: 'all .2s ease',
        boxShadow: selected ? '0 0 0 3px #c96e4b22' : 'none',
      }}
    >{children}</button>
  );
}

function LoteCard({ p, selected, onClick, weightLabel = '250g' }: { p: Producto; selected: boolean; onClick: () => void; weightLabel?: string }) {
  const price = p.weights.find(([w]) => w === weightLabel)?.[1] ?? p.weights.find(([w]) => w === '250g')?.[1] ?? p.weights[0][1];
  return (
    <button
      onClick={onClick}
      style={{
        width: 152, flexShrink: 0, padding: 0, borderRadius: 16, cursor: 'pointer',
        border: `2px solid ${selected ? '#c96e4b' : '#1f302818'}`,
        background: selected ? '#1f3028' : '#fff8f0',
        outline: 'none', transition: 'all .25s ease', textAlign: 'left', overflow: 'hidden',
        boxShadow: selected ? '0 8px 24px -8px #c96e4b66' : '0 2px 8px -4px #533b2222',
        transform: selected ? 'translateY(-3px)' : 'none',
      }}
    >
      {/* Foto */}
      <div style={{ width: '100%', height: 96, overflow: 'hidden', background: selected ? '#2a3f33' : '#e8d5bc', position: 'relative' }}>
        {p.photo
          ? <img src={p.photo} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: selected ? '#c96e4b' : '#c4b29799' }}>☕</div>
        }
        <div style={{
          position: 'absolute', bottom: 6, right: 6,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 8, letterSpacing: '0.12em',
          padding: '2px 6px', borderRadius: 5,
          background: selected ? '#c96e4b' : '#1f3028cc', color: '#f2e0cc',
        }}>{p.score} pts</div>
      </div>
      {/* Info */}
      <div style={{ padding: '9px 11px 10px' }}>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 600, fontSize: 13, color: selected ? '#f2e0cc' : '#1f3028', lineHeight: 1.2, marginBottom: 3 }}>{p.name}</div>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 9, color: selected ? '#c4b297' : '#533b22', marginBottom: 5, lineHeight: 1.3 }}>{p.sub}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 7 }}>
          {p.notes.slice(0, 2).map(n => (
            <span key={n} style={{
              fontFamily: 'Montserrat, sans-serif', fontSize: 9, padding: '2px 5px', borderRadius: 999,
              background: selected ? '#ffffff18' : '#8faf8a33',
              color: selected ? '#f2e0cc' : '#1f3028',
              border: `1px solid ${selected ? '#ffffff22' : '#8faf8a55'}`,
            }}>{n}</span>
          ))}
        </div>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, fontSize: 17, color: selected ? '#c96e4b' : '#1f3028', lineHeight: 1 }}>{Money.formatPEN(price)}</div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, letterSpacing: '0.1em', color: selected ? '#c4b29799' : '#533b2266', marginTop: 2 }}>{weightLabel} · inc. IGV</div>
        {selected && (
          <div style={{ marginTop: 8, padding: '4px 0', borderRadius: 7, textAlign: 'center', background: '#c96e4b', fontFamily: 'Montserrat, sans-serif', fontSize: 9, fontWeight: 700, color: '#f2e0cc', letterSpacing: '0.06em' }}>✓ Seleccionado</div>
        )}
      </div>
    </button>
  );
}

// ── Total live ────────────────────────────────────────────────────────────────

function TotalBar({ cents, cajaIncluida, onAdd, canAdd }: {
  cents: number; cajaIncluida: boolean; onAdd: () => void; canAdd: boolean;
}) {
  return (
    <div style={{
      marginTop: 24, padding: '16px 20px', borderRadius: 16,
      background: '#1f3028', border: '1px solid #c96e4b33',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
    }}>
      <div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.2em', color: '#8faf8a', textTransform: 'uppercase', marginBottom: 4 }}>
          Total {cajaIncluida ? '(incl. caja regalo)' : ''}
        </div>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, fontSize: 32, color: '#f2e0cc', lineHeight: 1 }}>
          {Money.formatPEN(cents)}
        </div>
      </div>
      <button
        onClick={onAdd}
        disabled={!canAdd}
        style={{
          fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 13,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: '#1f3028', background: canAdd ? '#c96e4b' : '#533b2244',
          padding: '14px 28px', borderRadius: 999, border: 'none',
          cursor: canAdd ? 'pointer' : 'not-allowed',
          boxShadow: canAdd ? '0 12px 24px -10px #c96e4baa' : 'none',
          transition: 'all .3s ease',
        }}
      >
        Agregar al carrito →
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function KitBuilder() {
  const { data: productos = [], isLoading } = useCatalog();
  const { add, open: openCart } = useCartActions();

  // Solo lotes activos con stock
  const lotes = productos.filter(p => p.label === 'PREVENTA' && p.stockKg > 0);
  const canFlight = lotes.length >= FLIGHT_SIZE;

  // Estado del configurador
  const [mode, setMode] = useState<KitMode>('bolsa');
  const [selectedLote, setSelectedLote] = useState<string | null>(null);
  const [selectedWeightIdx, setSelectedWeightIdx] = useState(0);
  const [flightSelection, setFlightSelection] = useState<string[]>([]);
  const [forQuien, setForQuien] = useState<ForQuien | null>(null);
  const [conCaja, setConCaja] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const lote = lotes.find(p => p.id === selectedLote);
  const loteWeights = lote?.weights.filter(([w]) => w !== '100g') ?? [];

  // Paso activo
  const step = (() => {
    if (mode === 'bolsa') {
      if (!selectedLote) return 2;
      if (!lote?.weights[selectedWeightIdx]) return 3;
      if (forQuien === null) return 4;
      if (forQuien === 'regalo') return 5;
      return 6;
    } else {
      if (flightSelection.length < FLIGHT_SIZE) return 2;
      if (forQuien === null) return 3;
      if (forQuien === 'regalo') return 4;
      return 5;
    }
  })();

  // Cálculo del total
  const totalCents = (() => {
    if (mode === 'bolsa' && lote) {
      const base = loteWeights[selectedWeightIdx]?.[1] ?? 0;
      return base + (conCaja ? CAJA_CENTS : 0);
    }
    if (mode === 'flight') {
      const base = flightSelection.reduce((acc, id) => {
        const p = lotes.find(l => l.id === id);
        const price100 = p?.weights.find(([w]) => w === '100g')?.[1] ?? Math.round((p?.weights.find(([w]) => w === '250g')?.[1] ?? p?.weights[0][1] ?? 0) * 0.4);
        return acc + price100;
      }, 0);
      return base + (conCaja ? CAJA_CENTS : 0);
    }
    return 0;
  })();

  const canAdd = (() => {
    if (mode === 'bolsa') return !!selectedLote && forQuien !== null;
    return flightSelection.length === FLIGHT_SIZE && forQuien !== null;
  })();

  const handleFlightToggle = (id: string) => {
    setFlightSelection(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= FLIGHT_SIZE) return prev;
      return [...prev, id];
    });
  };

  const handleAddToCart = () => {
    if (mode === 'bolsa' && lote) {
      const [wLabel, unitCents] = loteWeights[selectedWeightIdx];
      add({
        id: `kit-${lote.code}-${wLabel}-Grano`,
        sku: lote.code,
        productoId: lote.id,
        name: lote.name,
        weight: wLabel as '100g' | '250g' | '1kg' | '3kg',
        grind: 'Grano' as GrindOption,
        unitCents: unitCents + (conCaja ? CAJA_CENTS : 0),
        qty: 1,
        maxQty: 10,
        caficultor: lote.producer,
        finca: lote.farm,
        producerPct: lote.producerPct,
        badge: conCaja ? 'Kit regalo' : 'Selección',
      });
    } else if (mode === 'flight') {
      flightSelection.forEach((id, i) => {
        const p = lotes.find(l => l.id === id)!;
        const unitCents = p.weights.find(([w]) => w === '100g')?.[1] ?? Math.round((p.weights.find(([w]) => w === '250g')?.[1] ?? p.weights[0][1]) * 0.4);
        const cajaShare = i === 0 && conCaja ? CAJA_CENTS : 0;
        add({
          id: `flight-${p.code}-100g-Grano`,
          sku: p.code,
          productoId: p.id,
          name: `${p.name} · 100g`,
          weight: '100g' as '100g' | '250g' | '1kg' | '3kg',
          grind: 'Grano' as GrindOption,
          unitCents: unitCents + cajaShare,
          qty: 1,
          maxQty: 10,
          caficultor: p.producer,
          finca: p.farm,
          producerPct: p.producerPct,
          badge: 'Flight',
        });
      });
    }
    openCart();
  };

  if (isLoading) return null;
  if (lotes.length === 0) return null;

  return (
    <section id="kit" style={{ background: '#f2e0cc', padding: '80px 24px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontFamily: 'Bowlby One SC, sans-serif', fontSize: 9, letterSpacing: '0.26em', color: '#c96e4b', textTransform: 'uppercase', marginBottom: 10 }}>
            Arma tu kit
          </div>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 600, fontSize: 42, color: '#1f3028', margin: 0, lineHeight: 1.05 }}>
            Tu café, a tu manera.
          </h2>
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, color: '#533b22', marginTop: 12, lineHeight: 1.6 }}>
            Elige el lote, el tamaño y si va con presentación de regalo.
          </p>
        </div>

        {/* Pasos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* PASO 1 — Modo */}
          <div style={{ padding: '20px 22px', borderRadius: 18, background: '#fff8f0', border: '1px solid #1f302818' }}>
            <StepHeader n={1} label="¿Cómo quieres tu café?" active={true} done={false} />
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <OptionCard selected={mode === 'bolsa'} onClick={() => { setMode('bolsa'); setFlightSelection([]); }}>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 700, color: '#1f3028' }}>Una bolsa</div>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: '#533b22', marginTop: 3 }}>250g · 1kg · 3kg</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#c96e4b', marginTop: 6, letterSpacing: '0.1em' }}>UN SOLO LOTE</div>
              </OptionCard>
              <OptionCard
                selected={mode === 'flight'}
                onClick={() => { if (canFlight) { setMode('flight'); setSelectedLote(null); } }}
              >
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 700, color: canFlight ? '#1f3028' : '#533b2255' }}>
                  Flight · 3 variedades
                </div>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: canFlight ? '#533b22' : '#533b2244', marginTop: 3 }}>
                  3 × 100g — elige cada lote
                </div>
                {!canFlight ? (
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#8faf8a', marginTop: 6, letterSpacing: '0.1em' }}>
                    PRÓXIMAMENTE · {FLIGHT_SIZE - lotes.length} LOTE{FLIGHT_SIZE - lotes.length > 1 ? 'S' : ''} MÁS
                  </div>
                ) : (
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#c96e4b', marginTop: 6, letterSpacing: '0.1em' }}>TRES FINCAS · UNA CAJA</div>
                )}
              </OptionCard>
            </div>
          </div>

          {/* PASO 2 — Lote (bolsa) */}
          {mode === 'bolsa' && (
            <div style={{ padding: '20px 22px', borderRadius: 18, background: '#fff8f0', border: '1px solid #1f302818' }}>
              <StepHeader n={2} label="Elige tu café" active={step === 2} done={step > 2} />
              {step >= 2 && (
                <div style={{ display: 'flex', gap: 12, marginTop: 14, overflowX: 'auto', paddingBottom: 6, scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
                  {lotes.map(p => (
                    <div key={p.id} style={{ scrollSnapAlign: 'start', flexShrink: 0 }}>
                      <LoteCard p={p} selected={selectedLote === p.id} onClick={() => setSelectedLote(p.id)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PASO 2 — Selección flight */}
          {mode === 'flight' && canFlight && (
            <div style={{ padding: '20px 22px', borderRadius: 18, background: '#fff8f0', border: '1px solid #1f302818' }}>
              <StepHeader n={2} label={`Elige 3 lotes (${flightSelection.length}/${FLIGHT_SIZE})`} active={step === 2} done={step > 2} />
              {step >= 2 && (
                <div style={{ display: 'flex', gap: 12, marginTop: 14, overflowX: 'auto', paddingBottom: 6, scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
                  {lotes.map(p => (
                    <div key={p.id} style={{ scrollSnapAlign: 'start', flexShrink: 0 }}>
                      <LoteCard
                        p={p}
                        selected={flightSelection.includes(p.id)}
                        onClick={() => handleFlightToggle(p.id)}
                        weightLabel="100g"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PASO 3 — Tamaño (solo bolsa) */}
          {mode === 'bolsa' && selectedLote && lote && (
            <div style={{ padding: '20px 22px', borderRadius: 18, background: '#fff8f0', border: '1px solid #1f302818' }}>
              <StepHeader n={3} label="Tamaño" active={step === 3} done={step > 3} />
              {step >= 3 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  {loteWeights.map(([wl, cents], i) => (
                    <button
                      key={wl}
                      onClick={() => setSelectedWeightIdx(i)}
                      style={{
                        flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                        fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 600,
                        border: `2px solid ${selectedWeightIdx === i ? '#c96e4b' : '#1f302822'}`,
                        background: selectedWeightIdx === i ? '#c96e4b14' : '#f2e0cc',
                        color: '#1f3028', outline: 'none', transition: 'all .2s ease',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      }}
                    >
                      <span>{wl}</span>
                      <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 16, fontWeight: 700, color: '#c96e4b' }}>{Money.formatPEN(cents)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PASO 4 — ¿Para quién? */}
          {((mode === 'bolsa' && selectedLote) || (mode === 'flight' && flightSelection.length === FLIGHT_SIZE)) && (
            <div style={{ padding: '20px 22px', borderRadius: 18, background: '#fff8f0', border: '1px solid #1f302818' }}>
              <StepHeader
                n={mode === 'bolsa' ? 4 : 3}
                label="¿Para quién es?"
                active={mode === 'bolsa' ? step === 4 : step === 3}
                done={forQuien !== null}
              />
              {((mode === 'bolsa' && step >= 4) || (mode === 'flight' && step >= 3)) && (
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <OptionCard selected={forQuien === 'yo'} onClick={() => { setForQuien('yo'); setConCaja(false); setMensaje(''); }}>
                    <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 700, color: '#1f3028' }}>☕ Para mí</div>
                    <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: '#533b22', marginTop: 3 }}>Sin presentación especial</div>
                  </OptionCard>
                  <OptionCard selected={forQuien === 'regalo'} onClick={() => setForQuien('regalo')}>
                    <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 700, color: '#1f3028' }}>🎁 Para regalar</div>
                    <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: '#533b22', marginTop: 3 }}>Con presentación de regalo</div>
                  </OptionCard>
                </div>
              )}
            </div>
          )}

          {/* PASO 5 — Presentación regalo */}
          {forQuien === 'regalo' && (
            <div style={{ padding: '20px 22px', borderRadius: 18, background: '#fff8f0', border: `1px solid ${conCaja ? '#c96e4b55' : '#1f302818'}`, transition: 'border .3s ease' }}>
              <StepHeader
                n={mode === 'bolsa' ? 5 : 4}
                label="Presentación"
                active={true}
                done={false}
              />
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Caja toggle */}
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  padding: '12px 14px', borderRadius: 12,
                  background: conCaja ? '#c96e4b14' : '#f2e0cc',
                  border: `1px solid ${conCaja ? '#c96e4b55' : '#1f302822'}`,
                  transition: 'all .25s ease',
                }}>
                  <input
                    type="checkbox"
                    checked={conCaja}
                    onChange={e => setConCaja(e.target.checked)}
                    style={{ accentColor: '#c96e4b', width: 16, height: 16, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 600, color: '#1f3028' }}>
                      Caja de presentación premium
                    </div>
                    <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: '#533b22', marginTop: 2 }}>
                      Caja corrugada · papel couché · sticker de marca · tarjeta del caficultor
                    </div>
                  </div>
                  <span style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, fontSize: 18, color: '#c96e4b', flexShrink: 0 }}>
                    +{Money.formatPEN(CAJA_CENTS)}
                  </span>
                </label>

                {/* Mensaje */}
                <div>
                  <div style={{ fontFamily: 'Bowlby One SC, sans-serif', fontSize: 8, letterSpacing: '0.22em', color: '#533b2299', textTransform: 'uppercase', marginBottom: 6 }}>
                    Mensaje para la tarjeta (opcional)
                  </div>
                  <textarea
                    value={mensaje}
                    onChange={e => setMensaje(e.target.value)}
                    placeholder="Para ti, que siempre elige lo mejor. Que cada taza te cuente la historia de quien la cultivó."
                    maxLength={200}
                    rows={3}
                    style={{
                      width: '100%', fontFamily: 'Montserrat, sans-serif', fontSize: 12,
                      padding: '10px 12px', borderRadius: 10, resize: 'vertical',
                      background: '#faf3e6', color: '#1f3028',
                      border: '1px solid #c4b29733', outline: 'none',
                      boxSizing: 'border-box', minHeight: 72,
                    }}
                  />
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#533b2266', letterSpacing: '0.1em', marginTop: 4, textAlign: 'right' }}>
                    {mensaje.length}/200
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Total + CTA */}
          {canAdd && (
            <TotalBar
              cents={totalCents}
              cajaIncluida={conCaja}
              onAdd={handleAddToCart}
              canAdd={canAdd}
            />
          )}

        </div>
      </div>
    </section>
  );
}
