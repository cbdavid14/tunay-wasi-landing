import { useState } from 'react';
import CoffeeBranch from '@/components/decor/CoffeeBranch';
import { useSupplyLandingConfig } from '@/features/negocios/useSupplyLandingConfig';
import { useMicrolotesLanding } from '@/features/negocios/useMicrolotesLanding';
import { STATIC_SUPPLY_LANDING, STATIC_MICROLOTES } from '@/features/catalog/catalogService';
import { setLoteReservado } from '@/features/negocios/useLoteReservado';
import { saveSolicitudMuestra } from '@/features/negocios/supplyFormService';
import type { FichaCataDoc } from '@/shared/types/firestore';
import type { SupplyLote } from '@/features/catalog/catalogService';

const PALETTE = {
  green: { accent: '#8faf8a' },
  terra: { accent: '#c96e4b' },
  gold:  { accent: '#d6b15a' },
  cream: { accent: '#c4b297' },
} as const;

const PROCESS_FILTERS: [string, string][] = [
  ['all', 'Todos'],
  ['washed', 'Lavado'],
  ['honey', 'Honey'],
  ['natural', 'Natural'],
];

export default function SupplyLotes() {
  const { data: supply = STATIC_SUPPLY_LANDING } = useSupplyLandingConfig();
  const { data: microlotes = STATIC_MICROLOTES } = useMicrolotesLanding();
  const [filter, setFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [selectedKg, setSelectedKg] = useState<Record<string, string>>({});
  const [fichaOpen, setFichaOpen] = useState<FichaCataDoc | null>(null);
  const [muestraLote, setMuestraLote] = useState<SupplyLote | null>(null);
  const [muestraForm, setMuestraForm] = useState({ email: '', telefono: '' });
  const [muestraStatus, setMuestraStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const activeLotes = microlotes.lotes.filter(l => l.activo !== false);

  // Años únicos presentes en los lotes activos, ordenados desc
  const years = [...new Set(activeLotes.map(l => l.cosecha).filter(Boolean) as string[])].sort((a, b) => Number(b) - Number(a));
  const showYearFilters = years.length > 1;

  const filtered = activeLotes
    .filter(l => filter === 'all' || l.tag === filter)
    .filter(l => yearFilter === 'all' || l.cosecha === yearFilter);

  return (
    <section id="lotes" style={{
      background: '#f2e0cc', color: '#1f3028',
      padding: '100px 36px 120px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', left: -30, top: 60, width: 150, opacity: 0.35, zIndex: 0 }}>
        <CoffeeBranch />
      </div>

      <div style={{ maxWidth: 1320, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 64, alignItems: 'end',
          marginBottom: 64,
        }} className="tw-sup-2col">
          <div>
            <span style={{
              fontFamily: 'Bowlby One SC, sans-serif', fontSize: 11, letterSpacing: '0.32em',
              color: '#c96e4b', textTransform: 'uppercase',
            }}>02 — Lotes Disponibles</span>
            <h2 style={{
              fontFamily: 'Cormorant Garamond, serif', fontWeight: 700,
              fontSize: 'clamp(40px, 5vw, 76px)', lineHeight: 1.0,
              color: '#1f3028', margin: '20px 0 0', letterSpacing: '-0.01em',
            }}>
              Cosecha
              <br />
              <span style={{ fontStyle: 'italic', fontWeight: 500, color: '#c96e4b' }}>
                {years.length > 0 ? years.join(' · ') : supply.cosechaLabel}.
              </span>
            </h2>
          </div>
          <div>
            <p style={{
              fontFamily: 'Montserrat, sans-serif', fontSize: 15, lineHeight: 1.65,
              color: '#533b22', margin: 0, maxWidth: 460,
            }}>
              Cada lote está catado y aprobado por un Q‑Grader certificado.
              El café viaja en bolsas GrainPro herméticas — el mismo estándar
              de los mejores roasters del mundo.
            </p>
            <div style={{ marginTop: 22, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PROCESS_FILTERS.map(([v, l]) => (
                <button key={v} onClick={() => setFilter(v)} style={{
                  fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 500,
                  padding: '8px 16px', borderRadius: 999, cursor: 'pointer',
                  background: filter === v ? '#1f3028' : 'transparent',
                  color: filter === v ? '#f2e0cc' : '#1f3028',
                  border: `1px solid ${filter === v ? '#1f3028' : '#1f302844'}`,
                  transition: 'all .25s ease',
                  letterSpacing: '0.04em',
                }}>{l}</button>
              ))}
            </div>
            {showYearFilters && (
              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[['all', 'Todas las cosechas'], ...years.map(y => [y, `Cosecha ${y}`])].map(([v, l]) => (
                  <button key={v} onClick={() => setYearFilter(v)} style={{
                    fontFamily: 'Montserrat, sans-serif', fontSize: 11, fontWeight: 500,
                    padding: '6px 14px', borderRadius: 999, cursor: 'pointer',
                    background: yearFilter === v ? '#c96e4b' : 'transparent',
                    color: yearFilter === v ? '#f2e0cc' : '#533b22',
                    border: `1px solid ${yearFilter === v ? '#c96e4b' : '#533b2255'}`,
                    transition: 'all .25s ease',
                    letterSpacing: '0.04em',
                  }}>{l}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 28,
        }}>
          {filtered.map((l) => {
            const p = PALETTE[l.tone];
            // Solo mostrar opciones de volumen que el stock puede cubrir
            const weights = (l.weightsB2b ?? []).filter(w => {
              const kg = parseInt(w.label);
              return isNaN(kg) || l.kg >= kg;
            });
            const hasWeights = weights.length > 0;
            const activeLabel = selectedKg[l.id] ?? weights[0]?.label ?? null;
            const activeWeight = weights.find(w => w.label === activeLabel) ?? weights[0];
            const precioLote = activeWeight ? activeWeight.cents / 100 : null;
            const disponibleLabel = hasWeights
              ? `${l.sacos} microlote${Number(l.sacos) !== 1 ? 's' : ''}`
              : `${l.sacos} sacos · ${l.kg} kg`;

            return (
              <article key={l.id} className="tw-sup-card" style={{
                position: 'relative',
                background: '#fff8ee',
                border: '1px solid #533b2244',
                padding: 28,
                display: 'flex', flexDirection: 'column', gap: 0,
                transition: 'all .3s ease',
                cursor: 'pointer',
                opacity: l.estado === 'proximamente' ? 0.55 : 1,
              }}>
                <div style={{
                  position: 'absolute', top: 0, right: 0, width: 64, height: 64,
                  background: p.accent,
                  clipPath: 'polygon(100% 0, 100% 100%, 0 0)',
                }} />
                <div style={{
                  position: 'absolute', top: -10, left: 28, height: 22, width: 64,
                  background: '#c96e4b', opacity: 0.85, transform: 'rotate(-2deg)',
                  boxShadow: '0 4px 10px -3px #00000044',
                }} />

                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  marginTop: 12,
                }}>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.22em',
                    color: '#533b22', textTransform: 'uppercase',
                  }}>{l.id}</span>
                </div>

                <div style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.10em',
                  color: '#533b22', marginTop: 6,
                }}>{l.origen}</div>

                <h3 style={{
                  fontFamily: 'Cormorant Garamond, serif', fontWeight: 600,
                  fontSize: 36, lineHeight: 0.98, letterSpacing: '-0.01em',
                  margin: '14px 0 4px', color: '#1f3028',
                }}>{l.variedad}</h3>

                <div style={{
                  fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic',
                  fontSize: 18, color: p.accent, fontWeight: 500,
                }}>{l.proceso}</div>

                {l.catado === true && l.sca >= 88 && (
                  <div style={{
                    fontFamily: 'Montserrat, sans-serif', fontSize: 11, lineHeight: 1.5,
                    color: '#8faf8a', marginTop: 8, fontStyle: 'italic',
                  }}>
                    Este lote solo lo sirves tú en Lima. Coordina la muestra — el flete va por nuestra cuenta.
                  </div>
                )}

                <div style={{
                  fontFamily: 'Montserrat, sans-serif', fontSize: 13, lineHeight: 1.5,
                  color: '#533b22', marginTop: 14, fontStyle: 'italic',
                  paddingTop: 14, borderTop: '1px dashed #533b2244',
                }}>{l.catado === true ? l.notas : 'Notas de cata pendientes — en proceso de evaluación SCA.'}</div>

                {l.fichaCata && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setFichaOpen(l.fichaCata!); }}
                    style={{
                      marginTop: 10, alignSelf: 'flex-start',
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.16em',
                      color: '#8faf8a', background: 'transparent', border: 'none',
                      cursor: 'pointer', padding: 0, textTransform: 'uppercase',
                      textDecoration: 'underline', textDecorationStyle: 'dotted',
                    }}
                  >
                    Ver ficha de cata Q-Grader ↗
                  </button>
                )}

                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10,
                  marginTop: 18,
                }}>
                  {[
                    ['Finca', l.finca],
                    ['Altitud', l.altitud],
                    ['SCA', l.catado === true ? `${l.sca} pts` : 'Pendiente'],
                    ['Disponible', disponibleLabel],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.20em',
                        color: '#533b22aa', textTransform: 'uppercase',
                      }}>{k}</div>
                      <div style={{
                        fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 600, color: '#1f3028',
                        marginTop: 2,
                      }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Selector de volumen B2B — solo si el lote tiene weightsB2b y está catado */}
                {hasWeights && l.catado === true && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.20em',
                      color: '#533b22aa', textTransform: 'uppercase', marginBottom: 8,
                    }}>Volumen del lote · grano verde</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {weights.map(w => (
                        <button
                          key={w.label}
                          onClick={() => setSelectedKg(prev => ({ ...prev, [l.id]: w.label }))}
                          style={{
                            fontFamily: 'Montserrat, sans-serif', fontSize: 11, fontWeight: 600,
                            padding: '6px 14px', cursor: 'pointer',
                            background: activeLabel === w.label ? '#1f3028' : 'transparent',
                            color: activeLabel === w.label ? '#f2e0cc' : '#1f3028',
                            border: `1px solid ${activeLabel === w.label ? '#1f3028' : '#1f302855'}`,
                            transition: 'all .2s ease',
                          }}
                        >
                          {w.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{
                  marginTop: 22, paddingTop: 18, borderTop: '1px solid #533b2244',
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12,
                }}>
                  <div>
                    {l.catado !== true ? (
                      <>
                        <div style={{
                          fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.20em',
                          color: '#533b22aa', textTransform: 'uppercase',
                        }}>Precio</div>
                        <div style={{
                          fontFamily: 'Cormorant Garamond, serif', fontSize: 24, fontWeight: 600,
                          color: '#533b22aa', lineHeight: 1, marginTop: 4, fontStyle: 'italic',
                        }}>Pendiente de cata</div>
                      </>
                    ) : hasWeights && precioLote !== null ? (
                      <>
                        <div style={{
                          fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.20em',
                          color: '#533b22aa', textTransform: 'uppercase',
                        }}>Lote {activeLabel} · grano verde</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                          {l.b2bDiscount && (
                            <div style={{
                              fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 500,
                              color: '#533b2266', lineHeight: 1,
                              textDecoration: 'line-through',
                            }}>
                              S/ {Math.round(precioLote / (1 - l.b2bDiscount / 100)).toLocaleString('es-PE')}
                            </div>
                          )}
                          <div style={{
                            fontFamily: 'Cormorant Garamond, serif', fontSize: 32, fontWeight: 600,
                            color: '#1f3028', lineHeight: 1,
                          }}>
                            S/ {precioLote.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </div>
                        </div>
                        <div style={{
                          fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.12em',
                          color: '#533b22aa', marginTop: 3,
                        }}>S/ {(precioLote / parseInt(activeLabel!)).toFixed(2)} / kg{l.b2bDiscount ? ` · ${l.b2bDiscount}% dcto B2B` : ''}</div>
                      </>
                    ) : (
                      <>
                        <div style={{
                          fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.20em',
                          color: '#533b22aa', textTransform: 'uppercase',
                        }}>Precio</div>
                        <div style={{
                          fontFamily: 'Cormorant Garamond, serif', fontSize: 24, fontWeight: 600,
                          color: '#1f3028', lineHeight: 1, marginTop: 4, fontStyle: 'italic',
                        }}>A coordinar</div>
                      </>
                    )}
                  </div>
                  {l.catado === true && (
                    l.estado === 'proximamente' ? (
                      <span style={{
                        fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 600,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: '#533b22aa', background: '#533b2222',
                        padding: '11px 16px', cursor: 'not-allowed',
                        border: '1px solid #533b2244',
                      }}>
                        Próximamente
                      </span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                        <a
                          href="#solicitud"
                          className="tw-sup-reservar"
                          onClick={() => setLoteReservado({
                            id: l.id,
                            variedad: l.variedad,
                            origen: l.origen,
                            sca: l.sca,
                            precioKg: l.precio,
                            kgSeleccionado: activeLabel ?? undefined,
                            precioLote: precioLote ?? undefined,
                          })}
                          style={{
                            fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 600,
                            letterSpacing: '0.08em', textTransform: 'uppercase',
                            color: '#f2e0cc', background: '#1f3028',
                            padding: '11px 16px', textDecoration: 'none',
                            transition: 'all .25s ease', whiteSpace: 'nowrap',
                          }}
                        >
                          {l.sca >= 88 ? 'Reservar lote exclusivo →' : 'Reservar →'}
                        </a>
                        <a
                          href="#solicitud"
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMuestraLote(l); setMuestraForm({ email: '', telefono: '' }); setMuestraStatus('idle'); }}
                          style={{
                            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em',
                            color: '#c96e4b', textDecoration: 'underline', textDecorationStyle: 'dotted',
                            cursor: 'pointer', textTransform: 'uppercase',
                          }}
                        >
                          Pedir muestra 150g →
                        </a>
                      </div>
                    )
                  )}
                </div>

                {l.estado !== 'disponible' && (
                  <div style={{
                    position: 'absolute', top: 16, right: 16, zIndex: 5,
                    fontFamily: 'Bowlby One SC, sans-serif', fontSize: 8, letterSpacing: '0.22em',
                    color: '#f2e0cc', background: '#c96e4b',
                    padding: '4px 10px', borderRadius: 999, textTransform: 'uppercase',
                    boxShadow: '0 4px 12px -4px #c96e4b99',
                    pointerEvents: 'none',
                  }}>{l.estado}</div>
                )}

                {/* Badge stock bajo — solo cuando estado=disponible y kg <= 15 */}
                {l.estado === 'disponible' && l.catado === true && l.kg <= 15 && (
                  <div style={{
                    position: 'absolute', top: 16, right: 16, zIndex: 5,
                    fontFamily: 'Bowlby One SC, sans-serif', fontSize: 8, letterSpacing: '0.22em',
                    color: '#f2e0cc', background: '#8faf8a',
                    padding: '4px 10px', borderRadius: 999, textTransform: 'uppercase',
                    boxShadow: '0 4px 12px -4px #8faf8a99',
                    pointerEvents: 'none',
                  }}>Solo {l.kg} kg</div>
                )}
              </article>
            );
          })}
        </div>

        <div style={{
          marginTop: 48,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
          paddingTop: 28, borderTop: '1px solid #1f302833',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.20em',
          color: '#533b22', textTransform: 'uppercase',
        }}>
          <span>+ 8 lotes en cata · disponibles en mayo</span>
          <a href="#solicitud" style={{ color: '#c96e4b', textDecoration: 'none' }}>
            Suscríbete al boletín de cosecha →
          </a>
        </div>
      </div>

      <style>{`
        .tw-sup-card:hover { transform: translateY(-4px); box-shadow: 0 24px 50px -22px #533b22aa; border-color: #1f3028; }
        .tw-sup-reservar:hover { background: #c96e4b !important; }
        @media (max-width: 880px) {
          .tw-sup-2col { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
      `}</style>

      {/* Modal muestra 150g */}
      {muestraLote && (
        <div
          onClick={() => setMuestraLote(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9001,
            background: '#00000099', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px 16px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#1f3028', color: '#f2e0cc',
              border: '1px solid #8faf8a44',
              maxWidth: 420, width: '100%',
              padding: '32px 36px 36px',
              position: 'relative',
              boxShadow: '0 40px 80px -30px #00000099',
            }}
          >
            <button
              onClick={() => setMuestraLote(null)}
              style={{
                position: 'absolute', top: 14, right: 14,
                background: 'transparent', border: '1px solid #f2e0cc44',
                color: '#f2e0cc', cursor: 'pointer',
                fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >✕</button>

            <div style={{ fontFamily: 'Bowlby One SC, sans-serif', fontSize: 10, letterSpacing: '0.28em', color: '#c96e4b', textTransform: 'uppercase', marginBottom: 8 }}>
              Muestra 150g · Gratis
            </div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 26, fontWeight: 600, lineHeight: 1.1 }}>
              {muestraLote.variedad}
              <span style={{ fontStyle: 'italic', fontWeight: 500, color: '#c96e4b' }}> {muestraLote.proceso}</span>
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.16em', color: '#8faf8a', marginTop: 4, textTransform: 'uppercase' }}>
              {muestraLote.origen} · SCA {muestraLote.sca} pts
            </div>

            {muestraStatus === 'sent' ? (
              <div style={{ marginTop: 28, fontFamily: 'Montserrat, sans-serif', fontSize: 14, lineHeight: 1.6, color: '#8faf8a' }}>
                ✓ Recibido. Te contactamos en menos de 24h para coordinar el envío. Sin costo.
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!muestraForm.email || !muestraForm.telefono) return;
                  setMuestraStatus('sending');
                  try {
                    await saveSolicitudMuestra({
                      email: muestraForm.email,
                      telefono: muestraForm.telefono,
                      loteId: muestraLote.id,
                      loteVariedad: muestraLote.variedad,
                      loteOrigen: muestraLote.origen,
                      loteSca: muestraLote.sca,
                    });
                    setMuestraStatus('sent');
                  } catch {
                    setMuestraStatus('error');
                  }
                }}
                style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}
              >
                <div>
                  <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.20em', color: '#8faf8a', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Correo</label>
                  <input
                    type="email" required
                    value={muestraForm.email}
                    onChange={e => setMuestraForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="tu@cafeteria.pe"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: '#182520', border: '1px solid #8faf8a44',
                      color: '#f2e0cc', padding: '10px 14px',
                      fontFamily: 'Montserrat, sans-serif', fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.20em', color: '#8faf8a', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Teléfono / WhatsApp</label>
                  <input
                    type="tel" required
                    value={muestraForm.telefono}
                    onChange={e => setMuestraForm(f => ({ ...f, telefono: e.target.value }))}
                    placeholder="9XXXXXXXX"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: '#182520', border: '1px solid #8faf8a44',
                      color: '#f2e0cc', padding: '10px 14px',
                      fontFamily: 'Montserrat, sans-serif', fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>
                {muestraStatus === 'error' && (
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: '#c96e4b' }}>
                    Ocurrió un error. Escríbenos al WhatsApp directamente.
                  </div>
                )}
                <button
                  type="submit"
                  disabled={muestraStatus === 'sending'}
                  style={{
                    fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 600,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: '#1f3028', background: '#c96e4b',
                    padding: '14px 24px', border: 'none', cursor: 'pointer',
                    transition: 'all .2s ease', marginTop: 4,
                  }}
                >
                  {muestraStatus === 'sending' ? 'Enviando…' : 'Solicitar muestra gratis →'}
                </button>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.16em', color: '#8faf8a66', textTransform: 'uppercase', textAlign: 'center' }}>
                  Sin costo · Respondemos en menos de 24h
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal ficha de cata */}
      {fichaOpen && (
        <div
          onClick={() => setFichaOpen(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9000,
            background: '#00000099', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px 16px',
            overflowY: 'auto',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#1f3028', color: '#f2e0cc',
              border: '1px solid #8faf8a44',
              maxWidth: 680, width: '100%',
              padding: '36px 40px 40px',
              position: 'relative',
              boxShadow: '0 40px 80px -30px #00000099',
              maxHeight: '90vh', overflowY: 'auto',
            }}
          >
            {/* Cerrar */}
            <button
              onClick={() => setFichaOpen(null)}
              style={{
                position: 'absolute', top: 16, right: 16,
                background: 'transparent', border: '1px solid #f2e0cc44',
                color: '#f2e0cc', cursor: 'pointer',
                fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >✕</button>

            {/* Header */}
            <div style={{
              fontFamily: 'Bowlby One SC, sans-serif', fontSize: 10, letterSpacing: '0.32em',
              color: '#c96e4b', textTransform: 'uppercase', marginBottom: 6,
            }}>Ficha de Cata SCA</div>
            <div style={{
              fontFamily: 'Cormorant Garamond, serif', fontSize: 14, color: '#c4b297',
            }}>
              {fichaOpen.qGraderNombre} · {fichaOpen.qGraderCredencial}
            </div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.16em',
              color: '#8faf8a', marginTop: 2, textTransform: 'uppercase',
            }}>
              {fichaOpen.laboratorio} · {fichaOpen.fechaCata}
            </div>

            {/* Puntaje */}
            <div style={{
              marginTop: 28, paddingTop: 20, borderTop: '1px solid #8faf8a33',
              display: 'flex', alignItems: 'baseline', gap: 12,
            }}>
              <div style={{
                fontFamily: 'Cormorant Garamond, serif', fontSize: 56, fontWeight: 700,
                color: '#c96e4b', lineHeight: 1,
              }}>{fichaOpen.puntajeFinal.toFixed(2)}</div>
              <div>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 600 }}>pts SCA</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.18em', color: '#8faf8a', textTransform: 'uppercase' }}>Puntaje Final</div>
              </div>
            </div>

            {/* Distribución de puntajes */}
            <div style={{ marginTop: 24 }}>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.24em',
                color: '#8faf8a', textTransform: 'uppercase', marginBottom: 12,
              }}>Distribución de Puntajes</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 20px' }}>
                {([
                  ['Fragancia / Aroma', fichaOpen.distribucion.fraganciAroma],
                  ['Sabor', fichaOpen.distribucion.sabor],
                  ['Acidez', fichaOpen.distribucion.acidez],
                  ['Postgusto', fichaOpen.distribucion.postgusto],
                  ['Cuerpo', fichaOpen.distribucion.cuerpo],
                  ['Balance', fichaOpen.distribucion.balance],
                  ['Uniformidad', fichaOpen.distribucion.uniformidad],
                  ['Dulzura', fichaOpen.distribucion.dulzura],
                  ['Limpieza', fichaOpen.distribucion.limpieza],
                  ['Puntaje Catador', fichaOpen.distribucion.puntajeCatador],
                ] as [string, number][]).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: '#c4b297' }}>{k}</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: '#f2e0cc' }}>{v.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Defectos */}
            <div style={{
              marginTop: 20, padding: '12px 16px',
              background: '#182520', border: '1px solid #533b2244',
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
            }}>
              {([
                ['Exportable', fichaOpen.defectos.exportable],
                ['Defectos', fichaOpen.defectos.defectos],
                ['Pajilla', fichaOpen.defectos.pajilla],
                ['Suciedad', fichaOpen.defectos.suciedad],
              ] as [string, number][]).map(([k, v]) => (
                <div key={k} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, letterSpacing: '0.18em', color: '#8faf8a', textTransform: 'uppercase' }}>{k}</div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 600, marginTop: 2 }}>{v}%</div>
                </div>
              ))}
            </div>

            {/* Notas de cata */}
            <div style={{ marginTop: 24, borderTop: '1px solid #8faf8a33', paddingTop: 20 }}>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.24em',
                color: '#8faf8a', textTransform: 'uppercase', marginBottom: 14,
              }}>Notas de Cata</div>
              {([
                ['Aroma / Fragancia', fichaOpen.aromaFragancia],
                ['Sabor en Boca', fichaOpen.saborBoca],
                ['Acidez Residual', fichaOpen.acidezResidual],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ marginBottom: 10 }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.16em', color: '#c96e4b', textTransform: 'uppercase' }}>{k}</div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 16, color: '#f2e0cc', marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Datos técnicos del grano */}
            <div style={{ marginTop: 20, borderTop: '1px solid #8faf8a33', paddingTop: 20 }}>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.24em',
                color: '#8faf8a', textTransform: 'uppercase', marginBottom: 12,
              }}>Datos Técnicos del Grano</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 16px' }}>
                {([
                  ['Humedad', fichaOpen.datosTecnicos.humedad],
                  ['Actividad H₂O', String(fichaOpen.datosTecnicos.actividadAgua)],
                  ['Densidad', fichaOpen.datosTecnicos.densidad],
                  ['Color', fichaOpen.datosTecnicos.color],
                  ['Olor', fichaOpen.datosTecnicos.olor],
                  ...(fichaOpen.datosTecnicos.rendimiento ? [['Rendimiento', fichaOpen.datosTecnicos.rendimiento]] : []),
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, letterSpacing: '0.18em', color: '#8faf8a99', textTransform: 'uppercase' }}>{k}</div>
                    <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 600, marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Observación */}
            {fichaOpen.observacion && (
              <div style={{
                marginTop: 20, padding: '14px 16px',
                background: '#c96e4b22', border: '1px solid #c96e4b55',
              }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.18em', color: '#c96e4b', marginBottom: 6, textTransform: 'uppercase' }}>
                  ⚠ Observación del Q Grader
                </div>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, lineHeight: 1.55, color: '#f2e0cc' }}>
                  {fichaOpen.observacion}
                </div>
              </div>
            )}

            {/* PDF */}
            {fichaOpen.pdfUrl && (
              <a
                href={fichaOpen.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  marginTop: 20,
                  fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 600,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: '#1f3028', background: '#f2e0cc',
                  padding: '10px 18px', textDecoration: 'none',
                  transition: 'all .2s ease',
                }}
              >
                Descargar PDF ↓
              </a>
            )}

            {/* Disclaimer */}
            <div style={{
              marginTop: 28, paddingTop: 16, borderTop: '1px solid #8faf8a22',
              fontFamily: 'Montserrat, sans-serif', fontSize: 11, lineHeight: 1.5,
              color: '#8faf8a99',
            }}>
              Ficha emitida por laboratorio de cata independiente. Los puntajes SCA son referenciales
              y pueden variar según condiciones de tueste y preparación. Esta evaluación corresponde
              al lote físico en grano verde al momento del análisis.
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
