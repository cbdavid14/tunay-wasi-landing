import { useState } from 'react';

const fmtPEN = (n: number) => 'S/ ' + Math.round(n).toLocaleString('es-PE');

const ACOP_PRICE_PER_KG = 18;
const SLIDER_MIN = 50;
const SLIDER_MAX = 3000;
const SLIDER_STEP = 50;

export default function CafiCalculator() {
  const [kg, setKg] = useState(300);
  const [precioKg, setPrecioKg] = useState(55);

  const acopTotal = kg * ACOP_PRICE_PER_KG;
  const tunayTotal = kg * precioKg;
  const delta = Math.round((tunayTotal / acopTotal - 1) * 100);
  const pctKg = ((kg - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;
  const pctPrecio = ((precioKg - 20) / (150 - 20)) * 100;

  return (
    <section id="calculadora" style={{
      position: 'relative',
      padding: '100px 36px',
      background: '#1f3028',
      color: '#f2e0cc',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.06,
        backgroundImage: 'radial-gradient(#c4b29766 1px, transparent 1px)',
        backgroundSize: '24px 24px', pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 1080, margin: '0 auto', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={{
            fontFamily: 'Bowlby One SC, sans-serif', fontSize: 11, letterSpacing: '0.32em',
            color: '#c96e4b', textTransform: 'uppercase',
          }}>01 — Calculadora</span>
          <h2 style={{
            fontFamily: 'Cormorant Garamond, serif', fontWeight: 700,
            fontSize: 'clamp(38px, 5vw, 68px)', lineHeight: 1.02,
            margin: '20px 0 18px', color: '#f2e0cc', letterSpacing: '-0.01em',
          }}>
            ¿Cuánto más ganarías
            <br />
            <span style={{ fontStyle: 'italic', fontWeight: 500, color: '#8faf8a' }}>
              con Tunay Wasi?
            </span>
          </h2>
          <p style={{
            fontFamily: 'Montserrat, sans-serif', fontSize: 15, lineHeight: 1.65,
            color: '#c4b297', maxWidth: 660, margin: '0 auto',
          }}>
            El acopiador compra a precio de mayorista. En TunayWasi, tú fijas el precio
            y el negocio compra directamente tu lote.
          </p>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #2a3d33 0%, #1f3028 60%)',
          border: '1px solid #c4b29722',
          borderRadius: 24,
          padding: 36,
          boxShadow: '0 30px 60px -28px #000000aa',
          display: 'flex', flexDirection: 'column', gap: 32,
        }}>
          <div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              marginBottom: 16, flexWrap: 'wrap', gap: 8,
            }}>
              <div style={{
                fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 600,
                color: '#f2e0cc', letterSpacing: '0.02em',
              }}>¿Cuántos kg de café vendes al año?</div>
              <div style={{
                fontFamily: 'Cormorant Garamond, serif', fontSize: 36, fontWeight: 700,
                color: '#8faf8a', lineHeight: 1,
              }}>{kg.toLocaleString('es-PE')} <span style={{ fontSize: 16, color: '#c4b297', fontWeight: 500 }}>kg/año</span></div>
            </div>
            <input
              type="range"
              min={SLIDER_MIN}
              max={SLIDER_MAX}
              step={SLIDER_STEP}
              value={kg}
              onChange={(e) => setKg(Number(e.target.value))}
              className="tw-cafi-slider"
              style={{
                width: '100%', height: 6, borderRadius: 999,
                appearance: 'none',
                background: `linear-gradient(90deg, #c96e4b 0%, #8faf8a ${pctKg}%, #f2e0cc1a ${pctKg}%, #f2e0cc1a 100%)`,
                outline: 'none',
              }}
            />
            <div style={{
              display: 'flex', justifyContent: 'space-between', marginTop: 8,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em',
              color: '#c4b29799',
            }}>
              <span>{SLIDER_MIN} kg</span>
              <span>1 000 kg</span>
              <span>2 000 kg</span>
              <span>{SLIDER_MAX.toLocaleString('es-PE')} kg</span>
            </div>
          </div>

          <div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              marginBottom: 16, flexWrap: 'wrap', gap: 8,
            }}>
              <div style={{
                fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 600,
                color: '#f2e0cc', letterSpacing: '0.02em',
              }}>¿A qué precio por kg quieres publicar tu lote?</div>
              <div style={{
                fontFamily: 'Cormorant Garamond, serif', fontSize: 36, fontWeight: 700,
                color: '#c96e4b', lineHeight: 1,
              }}>S/ {precioKg} <span style={{ fontSize: 16, color: '#c4b297', fontWeight: 500 }}>/kg</span></div>
            </div>
            <input
              type="range"
              min={20}
              max={150}
              step={5}
              value={precioKg}
              onChange={(e) => setPrecioKg(Number(e.target.value))}
              className="tw-cafi-slider"
              style={{
                width: '100%', height: 6, borderRadius: 999,
                appearance: 'none',
                background: `linear-gradient(90deg, #c96e4b 0%, #c96e4b ${pctPrecio}%, #f2e0cc1a ${pctPrecio}%, #f2e0cc1a 100%)`,
                outline: 'none',
              }}
            />
            <div style={{
              display: 'flex', justifyContent: 'space-between', marginTop: 8,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em',
              color: '#c4b29799',
            }}>
              <span>S/ 20</span>
              <span>S/ 55</span>
              <span>S/ 100</span>
              <span>S/ 150</span>
            </div>
          </div>
        </div>

        <div style={{
          marginTop: 36,
          display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 24, alignItems: 'stretch',
        }} className="tw-cafi-compare">
          <div style={{
            background: '#0f1a14',
            border: '1px solid #c4b29722',
            borderRadius: 20,
            padding: 36,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>😔</div>
            <div style={{
              fontFamily: 'Bowlby One SC, sans-serif', fontSize: 10, letterSpacing: '0.28em',
              color: '#c4b29799', textTransform: 'uppercase', marginBottom: 18,
            }}>Acopiador tradicional</div>
            <div style={{
              fontFamily: 'Cormorant Garamond, serif', fontWeight: 700,
              fontSize: 56, color: '#c4b297', lineHeight: 1,
              letterSpacing: '-0.01em',
            }}>{fmtPEN(acopTotal)}</div>
            <div style={{
              fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: '#c4b297',
              marginTop: 18,
            }}>≈ S/ {ACOP_PRICE_PER_KG} por kg (precio mayorista referencial)</div>
          </div>

          <div className="tw-cafi-arrow" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#c96e4b',
            fontFamily: 'Cormorant Garamond, serif', fontSize: 48,
          }}>→</div>

          <div style={{
            background: 'linear-gradient(135deg, #c96e4b22 0%, #8faf8a14 100%)',
            border: '1px solid #8faf8a66',
            borderRadius: 20,
            padding: 36,
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 30px 60px -28px #8faf8a55',
          }}>
            <div style={{
              position: 'absolute', top: 12, right: 12,
              background: '#8faf8a', color: '#1f3028',
              padding: '4px 10px', borderRadius: 999,
              fontFamily: 'Bowlby One SC, sans-serif', fontSize: 9, letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}>Tunay Wasi</div>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
            <div style={{
              fontFamily: 'Bowlby One SC, sans-serif', fontSize: 10, letterSpacing: '0.28em',
              color: '#8faf8a', textTransform: 'uppercase', marginBottom: 18,
            }}>Publicando en Tunay Wasi</div>
            <div style={{
              fontFamily: 'Cormorant Garamond, serif', fontWeight: 700,
              fontSize: 56, color: '#f2e0cc', lineHeight: 1,
              letterSpacing: '-0.01em',
            }}>{fmtPEN(tunayTotal)}</div>
            <div style={{
              fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: '#f2e0cc',
              marginTop: 18,
            }}>S/ {precioKg} por kg — precio que tú fijas</div>
            {delta > 0 && (
              <div style={{
                display: 'inline-block', marginTop: 14,
                padding: '6px 14px', borderRadius: 999,
                background: '#8faf8a33', border: '1px solid #8faf8a99',
                fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 700,
                color: '#8faf8a', letterSpacing: '0.04em',
              }}>+{delta}% más que el acopiador</div>
            )}
          </div>
        </div>

        <div style={{
          marginTop: 32, padding: '20px 24px',
          background: '#0f1a14', borderRadius: 14, border: '1px solid #c4b29722',
          fontFamily: 'Montserrat, sans-serif', fontSize: 12, lineHeight: 1.65,
          color: '#c4b297', textAlign: 'center',
        }}>
          <strong style={{ color: '#f2e0cc' }}>Nota:</strong> En fase beta, TunayWasi no cobra comisión — recibes el 100% de tu precio.
          Post-beta se aplicará una comisión del 5% + IGV sobre la venta, descontada en la liquidación.
          El precio mayorista referencial del acopiador es estimado y puede variar según región y temporada.
        </div>
      </div>

      <style>{`
        .tw-cafi-slider::-webkit-slider-thumb {
          appearance: none; -webkit-appearance: none;
          width: 22px; height: 22px; border-radius: 50%;
          background: #f2e0cc; border: 3px solid #c96e4b;
          cursor: grab; box-shadow: 0 4px 12px -2px #00000088;
          transition: transform .2s ease;
        }
        .tw-cafi-slider::-webkit-slider-thumb:active { cursor: grabbing; transform: scale(1.15); }
        .tw-cafi-slider::-moz-range-thumb {
          width: 22px; height: 22px; border-radius: 50%;
          background: #f2e0cc; border: 3px solid #c96e4b;
          cursor: grab;
        }
        @media (max-width: 760px) {
          .tw-cafi-compare { grid-template-columns: 1fr !important; }
          .tw-cafi-arrow { transform: rotate(90deg); }
        }
      `}</style>
    </section>
  );
}
