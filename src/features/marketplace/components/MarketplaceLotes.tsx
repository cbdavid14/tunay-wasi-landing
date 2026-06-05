/**
 * MarketplaceLotes.tsx — F09: Marketplace con filtros + F10: Sample Packs + F11: Compra sacos
 * Actor: Tostadora / Cafetería de Especialidad
 */
import { useState } from 'react';
import type { LoteDoc } from '@/shared/types/marketplace';
import { DEMO_LOTES, DEMO_CAFICULTORES_MARKETPLACE } from '@/features/marketplace/marketplaceSeed';

const C = {
  green: '#1f3028',
  cream: '#f2e0cc',
  terra: '#c96e4b',
  sage: '#8faf8a',
  tan: '#c4b297',
  brown: '#533b22',
};

const PROCESO_LABEL: Record<string, string> = {
  lavado: 'Lavado',
  natural: 'Natural',
  honey: 'Honey',
  anaerobico: 'Anaeróbico',
  doble_fermentacion: 'D. Fermentación',
};

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  publicado:      { label: 'Disponible', color: C.sage },
  en_catacion:    { label: 'En catación', color: '#d6b15a' },
  muestra_enviada:{ label: 'Muestra enviada', color: C.tan },
  agotado:        { label: 'Agotado', color: '#888' },
};

interface CarritoItem {
  lote: LoteDoc;
  tipo: 'muestra' | 'saco';
  sacos?: number;
}

interface Props {
  onCheckout: (items: CarritoItem[]) => void;
}

export default function MarketplaceLotes({ onCheckout }: Props) {
  const [filtroProceso, setFiltroProceso] = useState('todos');
  const [filtroSCA, setFiltroSCA] = useState(0);
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [sacosSeleccionados, setSacosSeleccionados] = useState<Record<string, number>>({});
  const [fichaAbierta, setFichaAbierta] = useState<LoteDoc | null>(null);

  const lotes = DEMO_LOTES.filter(l => {
    if (filtroProceso !== 'todos' && l.proceso !== filtroProceso) return false;
    const puntaje = l.puntajeOficial ?? l.puntajeReferencial;
    if (puntaje < filtroSCA) return false;
    return true;
  });

  function getCaficultor(id: string) {
    return DEMO_CAFICULTORES_MARKETPLACE.find(c => c.id === id);
  }

  function agregarMuestra(lote: LoteDoc) {
    if (carrito.find(i => i.lote.id === lote.id && i.tipo === 'muestra')) return;
    setCarrito(prev => [...prev, { lote, tipo: 'muestra' }]);
  }

  function agregarSacos(lote: LoteDoc) {
    const sacos = sacosSeleccionados[lote.id] || 1;
    setCarrito(prev => {
      const existing = prev.find(i => i.lote.id === lote.id && i.tipo === 'saco');
      if (existing) return prev.map(i => i.lote.id === lote.id && i.tipo === 'saco' ? { ...i, sacos } : i);
      return [...prev, { lote, tipo: 'saco', sacos }];
    });
  }

  const totalCarrito = carrito.reduce((sum, item) => {
    if (item.tipo === 'muestra') return sum + item.lote.precioMuestraPEN;
    const precio = item.lote.precioVentaPEN ?? 0;
    return sum + precio * (item.sacos ?? 1);
  }, 0);

  return (
    <div style={{ background: '#f7f3ee', minHeight: '100vh' }}>

      {/* Hero B2B */}
      <div style={{
        background: C.green,
        padding: '48px 40px 40px',
        color: C.cream,
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontFamily: 'Montserrat', fontSize: 11, letterSpacing: 3, color: C.sage, marginBottom: 8, textTransform: 'uppercase' }}>
            Café verde · Microlotes certificados
          </p>
          <h1 style={{ fontFamily: 'Cormorant Garamond', fontSize: 'clamp(32px,4vw,52px)', fontWeight: 700, margin: '0 0 12px', lineHeight: 1.1 }}>
            Compra directo del caficultor.<br/>Con trazabilidad completa.
          </h1>
          <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.tan, maxWidth: 560, lineHeight: 1.7 }}>
            Café verde en grano. Sacos de 60 kg. Puntaje SCA certificado por Q-Grader.
            Ficha técnica descargable para tu empaque. Pago al caficultor garantizado.
          </p>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 40, marginTop: 32 }}>
            {[
              { n: '4', label: 'lotes disponibles' },
              { n: '10%', label: 'comisión plataforma' },
              { n: '24h', label: 'pago al caficultor' },
              { n: 'S/1,008', label: 'precio/saco puesto Lima' },
            ].map(s => (
              <div key={s.n}>
                <div style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, fontWeight: 700, color: C.cream }}>{s.n}</div>
                <div style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 32, alignItems: 'start' }}>

          {/* Sidebar filtros */}
          <aside>
            <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, color: C.brown, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
                Filtros
              </h3>

              <div style={{ marginBottom: 20 }}>
                <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, marginBottom: 8 }}>Proceso</p>
                {['todos', 'lavado', 'natural', 'honey', 'anaerobico'].map(p => (
                  <button key={p} onClick={() => setFiltroProceso(p)} style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: filtroProceso === p ? C.terra : 'transparent',
                    color: filtroProceso === p ? 'white' : C.brown,
                    border: 'none', borderRadius: 6, padding: '6px 10px',
                    fontFamily: 'Montserrat', fontSize: 13, cursor: 'pointer', marginBottom: 2,
                  }}>
                    {p === 'todos' ? 'Todos' : PROCESO_LABEL[p]}
                  </button>
                ))}
              </div>

              <div>
                <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, marginBottom: 8 }}>
                  Puntaje SCA mínimo: <strong style={{ color: C.terra }}>{filtroSCA > 0 ? `${filtroSCA}+` : 'todos'}</strong>
                </p>
                {[0, 82, 84, 86, 88].map(pts => (
                  <button key={pts} onClick={() => setFiltroSCA(pts)} style={{
                    display: 'inline-block',
                    background: filtroSCA === pts ? C.terra : '#f7f3ee',
                    color: filtroSCA === pts ? 'white' : C.brown,
                    border: 'none', borderRadius: 6, padding: '4px 10px',
                    fontFamily: 'Montserrat', fontSize: 12, cursor: 'pointer', margin: '0 4px 4px 0',
                  }}>
                    {pts === 0 ? 'Todos' : `${pts}+`}
                  </button>
                ))}
              </div>
            </div>

            {/* Unit economics box */}
            <div style={{ background: C.green, borderRadius: 12, padding: 20, color: C.cream }}>
              <p style={{ fontFamily: 'Montserrat', fontSize: 10, letterSpacing: 2, color: C.sage, textTransform: 'uppercase', marginBottom: 12 }}>
                Precio ejemplo — saco 60kg
              </p>
              {[
                { label: 'Precio origen caficultor', val: 'S/ 850' },
                { label: 'Comisión plataforma (10%)', val: 'S/ 85' },
                { label: 'Flete terrestre → Lima', val: 'S/ 25' },
                { label: 'Almacenamiento hub Lima', val: 'S/ 10' },
                { label: 'Pasarela de pagos (~4%)', val: 'S/ 38' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan }}>{r.label}</span>
                  <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.cream }}>{r.val}</span>
                </div>
              ))}
              <div style={{ borderTop: `1px solid rgba(143,175,138,0.3)`, marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, color: C.cream }}>Total puesto Lima</span>
                <span style={{ fontFamily: 'Cormorant Garamond', fontSize: 18, fontWeight: 700, color: C.terra }}>S/ 1,008</span>
              </div>
            </div>
          </aside>

          {/* Grid de lotes */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan }}>
                {lotes.length} lote{lotes.length !== 1 ? 's' : ''} encontrado{lotes.length !== 1 ? 's' : ''}
              </p>
              {carrito.length > 0 && (
                <button onClick={() => onCheckout(carrito)} style={{
                  background: C.terra, color: 'white', border: 'none', borderRadius: 8,
                  padding: '10px 20px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  Ver pedido ({carrito.length}) — S/ {totalCarrito.toLocaleString()}
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gap: 20 }}>
              {lotes.map(lote => {
                const caficultor = getCaficultor(lote.caficultorId);
                const puntaje = lote.puntajeOficial ?? lote.puntajeReferencial;
                const disponibles = lote.sacosDisponibles - lote.sacosReservados;
                const badge = STATUS_BADGE[lote.status] ?? STATUS_BADGE.publicado;
                return (
                  <div key={lote.id} style={{
                    background: 'white',
                    borderRadius: 14,
                    overflow: 'hidden',
                    boxShadow: lote.destacado ? `0 4px 24px rgba(201,110,75,0.15), 0 1px 4px rgba(0,0,0,0.06)` : '0 2px 12px rgba(0,0,0,0.06)',
                    border: lote.destacado ? `1.5px solid ${C.terra}` : '1.5px solid transparent',
                    display: 'grid',
                    gridTemplateColumns: '200px 1fr',
                  }}>
                    {/* Foto */}
                    <div style={{ position: 'relative', overflow: 'hidden' }}>
                      <img src={lote.fotoLoteUrl} alt={lote.nombreLote}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', minHeight: 180 }} />
                      {lote.destacado && (
                        <div style={{
                          position: 'absolute', top: 10, left: 10,
                          background: C.terra, color: 'white',
                          fontSize: 9, fontFamily: 'Montserrat', fontWeight: 700,
                          padding: '3px 8px', borderRadius: 20, letterSpacing: 1, textTransform: 'uppercase',
                        }}>Destacado</div>
                      )}
                      <div style={{
                        position: 'absolute', bottom: 10, left: 10,
                        background: badge.color, color: 'white',
                        fontSize: 9, fontFamily: 'Montserrat', fontWeight: 700,
                        padding: '3px 8px', borderRadius: 20,
                      }}>{badge.label}</div>
                    </div>

                    {/* Info */}
                    <div style={{ padding: '20px 24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <div>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>
                            {lote.id} · {lote.region}
                          </p>
                          <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, fontWeight: 700, color: C.brown, margin: 0 }}>
                            {lote.nombreLote}
                          </h3>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'Cormorant Garamond', fontSize: 32, fontWeight: 700, color: C.terra, lineHeight: 1 }}>
                            {puntaje.toFixed(1)}
                          </div>
                          <div style={{ fontFamily: 'Montserrat', fontSize: 9, color: C.tan, textTransform: 'uppercase' }}>
                            pts SCA{lote.puntajeOficial ? '' : ' ref.'}
                          </div>
                        </div>
                      </div>

                      {/* Tags */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                        <span style={{ background: '#f0ebe4', color: C.brown, fontSize: 11, fontFamily: 'Montserrat', padding: '2px 10px', borderRadius: 20 }}>
                          {PROCESO_LABEL[lote.proceso]}
                        </span>
                        <span style={{ background: '#f0ebe4', color: C.brown, fontSize: 11, fontFamily: 'Montserrat', padding: '2px 10px', borderRadius: 20 }}>
                          {lote.variedad}
                        </span>
                        <span style={{ background: '#f0ebe4', color: C.brown, fontSize: 11, fontFamily: 'Montserrat', padding: '2px 10px', borderRadius: 20 }}>
                          {lote.altitud}
                        </span>
                        {lote.notasSabor.slice(0, 3).map(nota => (
                          <span key={nota} style={{ background: `rgba(143,175,138,0.15)`, color: '#3a6b3a', fontSize: 11, fontFamily: 'Montserrat', padding: '2px 10px', borderRadius: 20 }}>
                            {nota}
                          </span>
                        ))}
                      </div>

                      {/* Caficultor */}
                      {caficultor && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                          <img src={caficultor.foto} alt={caficultor.nombre}
                            style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                          <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan }}>
                            {caficultor.nombre} · {caficultor.finca}
                          </span>
                        </div>
                      )}

                      {/* Acciones */}
                      {lote.status === 'publicado' && (
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                          {lote.muestraDisponible && (
                            <button onClick={() => agregarMuestra(lote)} style={{
                              background: carrito.find(i => i.lote.id === lote.id && i.tipo === 'muestra') ? C.sage : 'white',
                              color: carrito.find(i => i.lote.id === lote.id && i.tipo === 'muestra') ? 'white' : C.terra,
                              border: `1.5px solid ${C.terra}`,
                              borderRadius: 8, padding: '8px 14px',
                              fontFamily: 'Montserrat', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            }}>
                              + Muestra 200g — S/{lote.precioMuestraPEN}
                            </button>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <select
                              value={sacosSeleccionados[lote.id] || 1}
                              onChange={e => setSacosSeleccionados(prev => ({ ...prev, [lote.id]: +e.target.value }))}
                              style={{
                                border: `1px solid ${C.tan}`, borderRadius: 6, padding: '6px 8px',
                                fontFamily: 'Montserrat', fontSize: 12, color: C.brown, background: 'white',
                              }}
                            >
                              {Array.from({ length: Math.min(disponibles, 10) }, (_, i) => i + 1).map(n => (
                                <option key={n} value={n}>{n} saco{n > 1 ? 's' : ''} ({n * 60}kg)</option>
                              ))}
                            </select>
                            <button onClick={() => agregarSacos(lote)} style={{
                              background: C.terra, color: 'white', border: 'none', borderRadius: 8,
                              padding: '8px 16px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700,
                              cursor: 'pointer',
                            }}>
                              Reservar — S/{((lote.precioVentaPEN ?? 0) * (sacosSeleccionados[lote.id] || 1)).toLocaleString()}
                            </button>
                          </div>

                          <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan }}>
                            {disponibles} saco{disponibles !== 1 ? 's' : ''} disponible{disponibles !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}

                      {lote.status !== 'publicado' && (
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button style={{
                            background: '#f0ebe4', color: C.tan, border: 'none', borderRadius: 8,
                            padding: '8px 16px', fontFamily: 'Montserrat', fontSize: 12, cursor: 'default',
                          }}>
                            Próximamente disponible
                          </button>
                          {lote.status === 'en_catacion' && (
                            <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: '#d6b15a', alignSelf: 'center' }}>
                              Q-Grader evaluando...
                            </span>
                          )}
                        </div>
                      )}

                      {/* F12: Ficha descargable si ya compró */}
                      <button onClick={() => setFichaAbierta(lote)} style={{
                        background: 'none', border: 'none', color: C.tan, fontSize: 11,
                        fontFamily: 'Montserrat', cursor: 'pointer', marginTop: 8, textDecoration: 'underline',
                      }}>
                        Ver ficha de trazabilidad →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal ficha trazabilidad — F12 */}
      {fichaAbierta && (
        <div onClick={() => setFichaAbierta(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'white', borderRadius: 16, padding: 32, maxWidth: 520, width: '100%',
            maxHeight: '80vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 24, color: C.brown, margin: 0 }}>
                Ficha de Trazabilidad
              </h2>
              <button onClick={() => setFichaAbierta(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.tan }}>✕</button>
            </div>

            <div style={{ background: C.green, borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.sage, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
                Lote {fichaAbierta.id}
              </p>
              <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, color: C.cream, margin: '0 0 4px' }}>
                {fichaAbierta.nombreLote}
              </h3>
              <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: 0 }}>{fichaAbierta.region}</p>
            </div>

            {[
              ['Variedad', fichaAbierta.variedad],
              ['Proceso', PROCESO_LABEL[fichaAbierta.proceso]],
              ['Altitud', fichaAbierta.altitud],
              ['Cosecha', fichaAbierta.cosecha],
              ['Puntaje SCA', `${(fichaAbierta.puntajeOficial ?? fichaAbierta.puntajeReferencial).toFixed(1)} pts`],
              ['Notas de sabor', fichaAbierta.notasSabor.join(', ')],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0ebe4', padding: '8px 0' }}>
                <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan }}>{k}</span>
                <span style={{ fontFamily: 'Montserrat', fontSize: 13, fontWeight: 600, color: C.brown }}>{v}</span>
              </div>
            ))}

            {fichaAbierta.acidez && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Perfil sensorial</p>
                {[
                  { label: 'Acidez', val: fichaAbierta.acidez },
                  { label: 'Cuerpo', val: fichaAbierta.cuerpo ?? 0 },
                  { label: 'Balance', val: fichaAbierta.balance ?? 0 },
                ].map(({ label, val }) => (
                  <div key={label} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown }}>{label}</span>
                      <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.terra }}>{val}/10</span>
                    </div>
                    <div style={{ background: '#f0ebe4', borderRadius: 4, height: 6 }}>
                      <div style={{ background: C.terra, borderRadius: 4, height: 6, width: `${val * 10}%`, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button style={{
              width: '100%', background: C.terra, color: 'white', border: 'none',
              borderRadius: 8, padding: '12px', fontFamily: 'Montserrat', fontSize: 13,
              fontWeight: 700, cursor: 'pointer', marginTop: 20,
            }}>
              Descargar PDF (disponible post-compra)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
