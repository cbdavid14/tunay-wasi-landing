/**
 * AdminPanel.tsx — F05: Log muestras + F06: Catación Q-Grader + F07: Motor precios + F08: Kanban logístico
 * Actor: Administrador Tunay Wasi / Hub Lima
 */
import { useState } from 'react';
import { DEMO_LOTES, DEMO_PEDIDOS } from '@/features/marketplace/marketplaceSeed';
import type { LoteDoc } from '@/shared/types/marketplace';

const C = {
  green: '#1f3028', cream: '#f2e0cc', terra: '#c96e4b',
  sage: '#8faf8a', tan: '#c4b297', brown: '#533b22',
};

const KANBAN_COLS = [
  { key: 'en_origen',   label: 'En Origen',      color: C.tan },
  { key: 'en_transito', label: 'En Tránsito',     color: '#d6b15a' },
  { key: 'en_almacen',  label: 'Hub Lima',        color: C.sage },
  { key: 'entregado',   label: 'Entregado ✓',     color: '#4caf50' },
];

type AdminTab = 'dashboard' | 'catacion' | 'logistica' | 'lotes';

export default function AdminPanel() {
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [catacionLote, setCatacionLote] = useState<LoteDoc | null>(null);
  const [cataForm, setCataForm] = useState({
    puntaje: '', acidez: '7', cuerpo: '7', balance: '7', notas: '',
  });
  const [cataGuardado, setCataGuardado] = useState(false);

  const lotesParaCatar = DEMO_LOTES.filter(l => l.status === 'muestra_enviada' || l.status === 'en_catacion');
  const lotesPublicados = DEMO_LOTES.filter(l => l.status === 'publicado');
  const pedidos = DEMO_PEDIDOS;

  // Motor de precios F07
  function calcPrecioFinal(precioOrigen: number) {
    const comision = Math.round(precioOrigen * 0.10);
    const flete = 25;
    const almacen = 10;
    return { comision, flete, almacen, total: precioOrigen + comision + flete + almacen };
  }

  const totalIngresosMes = pedidos.reduce((s, p) => s + (p.pagoStatus === 'verificado' ? p.subtotalPEN * 0.10 : 0), 0);
  const totalVolumenKg = pedidos.filter(p => p.pagoStatus === 'verificado').reduce((s, p) => s + p.kgTotal, 0);

  return (
    <div style={{ background: '#f0ebe4', minHeight: '100vh' }}>

      {/* Header admin */}
      <div style={{ background: C.brown, padding: '20px 28px', color: C.cream, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontFamily: 'Montserrat', fontSize: 9, letterSpacing: 3, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase' }}>
            Panel Administrador
          </p>
          <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, margin: 0, color: C.cream }}>
            Tunay Wasi · Hub Lima
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {([
            { key: 'dashboard', label: 'Dashboard' },
            { key: 'catacion', label: 'Q-Grader' },
            { key: 'logistica', label: 'Logística' },
            { key: 'lotes', label: 'Lotes' },
          ] as { key: AdminTab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background: tab === t.key ? C.terra : 'rgba(255,255,255,0.1)',
              color: 'white', border: 'none', borderRadius: 6,
              padding: '7px 14px', fontFamily: 'Montserrat', fontSize: 12,
              fontWeight: tab === t.key ? 700 : 400, cursor: 'pointer',
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>

        {/* DASHBOARD */}
        {tab === 'dashboard' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
              {[
                { label: 'Lotes publicados', val: lotesPublicados.length, color: C.sage },
                { label: 'Lotes en catación', val: lotesParaCatar.length, color: '#d6b15a' },
                { label: 'Comisiones (mes)', val: `S/ ${totalIngresosMes.toLocaleString()}`, color: C.terra },
                { label: 'Volumen en tránsito', val: `${totalVolumenKg} kg`, color: C.tan },
              ].map(s => (
                <div key={s.label} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</p>
                  <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 32, fontWeight: 700, color: s.color, margin: 0 }}>{s.val}</p>
                </div>
              ))}
            </div>

            {/* Alertas de acción */}
            <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, color: C.brown, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
                Acciones pendientes
              </h3>
              <div style={{ display: 'grid', gap: 10 }}>
                {lotesParaCatar.map(l => (
                  <div key={l.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#fffbf5', border: `1px solid ${C.tan}40`, borderRadius: 8, padding: '12px 16px',
                  }}>
                    <div>
                      <p style={{ fontFamily: 'Montserrat', fontSize: 13, fontWeight: 600, color: C.brown, margin: '0 0 2px' }}>
                        Catar: {l.nombreLote}
                      </p>
                      <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: 0 }}>
                        {l.variedad} · {l.region} · {l.sacosDisponibles} sacos
                      </p>
                    </div>
                    <button onClick={() => { setCatacionLote(l); setTab('catacion'); }} style={{
                      background: C.terra, color: 'white', border: 'none', borderRadius: 6,
                      padding: '8px 14px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}>
                      Registrar cata
                    </button>
                  </div>
                ))}
                {pedidos.filter(p => p.pagoStatus === 'verificado' && p.pagoCaficultorStatus === 'pendiente').map(p => (
                  <div key={p.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#f5fff5', border: `1px solid ${C.sage}40`, borderRadius: 8, padding: '12px 16px',
                  }}>
                    <div>
                      <p style={{ fontFamily: 'Montserrat', fontSize: 13, fontWeight: 600, color: C.brown, margin: '0 0 2px' }}>
                        Pagar caficultor: {p.id}
                      </p>
                      <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: 0 }}>
                        Monto: S/ {p.montoCaficultorPEN.toLocaleString()} · Lote: {p.loteId}
                      </p>
                    </div>
                    <button style={{
                      background: C.sage, color: 'white', border: 'none', borderRadius: 6,
                      padding: '8px 14px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}>
                      Marcar pagado
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CATACIÓN — F05 + F06 + F07 */}
        {tab === 'catacion' && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 6 }}>
              Control de Calidad — Q-Grader
            </h2>
            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, marginBottom: 24 }}>
              Registra el puntaje SCA. Al guardar, el lote cambia a "Aprobado" y se calcula el precio final automáticamente.
            </p>

            {/* Selector de lote */}
            <div style={{ display: 'grid', gap: 14, marginBottom: 24 }}>
              {DEMO_LOTES.filter(l => ['muestra_enviada', 'en_catacion', 'aprobado'].includes(l.status)).map(lote => (
                <div key={lote.id} onClick={() => setCatacionLote(lote)} style={{
                  background: catacionLote?.id === lote.id ? C.green : 'white',
                  color: catacionLote?.id === lote.id ? C.cream : C.brown,
                  borderRadius: 10, padding: '14px 18px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  border: `2px solid ${catacionLote?.id === lote.id ? C.terra : 'transparent'}`,
                  transition: 'all 0.15s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: catacionLote?.id === lote.id ? C.sage : C.tan, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>
                        {lote.id}
                      </p>
                      <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 18, margin: 0, fontWeight: 700 }}>
                        {lote.nombreLote}
                      </p>
                    </div>
                    <span style={{
                      background: lote.status === 'aprobado' ? `${C.sage}30` : `${C.tan}30`,
                      color: lote.status === 'aprobado' ? C.sage : C.tan,
                      fontSize: 11, fontFamily: 'Montserrat', fontWeight: 700,
                      padding: '4px 10px', borderRadius: 20, alignSelf: 'flex-start',
                    }}>
                      {lote.status === 'aprobado' ? 'Aprobado' : lote.status === 'en_catacion' ? 'En catación' : 'Muestra recibida'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {catacionLote && !cataGuardado && (
              <div style={{ background: 'white', borderRadius: 14, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, color: C.brown, marginBottom: 20 }}>
                  Ficha de catación — {catacionLote.nombreLote}
                </h3>

                <div style={{ display: 'grid', gap: 16 }}>
                  <div>
                    <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>
                      Puntaje SCA final *
                    </label>
                    <input
                      type="number" min={75} max={100} step={0.25}
                      value={cataForm.puntaje}
                      onChange={e => setCataForm(f => ({ ...f, puntaje: e.target.value }))}
                      style={{ width: 160, padding: '10px 12px', border: `1px solid #ddd`, borderRadius: 8, fontFamily: 'Montserrat', fontSize: 20, fontWeight: 700, color: C.terra }}
                      placeholder="86.25"
                    />
                  </div>

                  {[
                    { key: 'acidez', label: 'Acidez' },
                    { key: 'cuerpo', label: 'Cuerpo' },
                    { key: 'balance', label: 'Balance' },
                  ].map(attr => (
                    <div key={attr.key}>
                      <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>
                        {attr.label}: <strong style={{ color: C.terra }}>{cataForm[attr.key as keyof typeof cataForm]}/10</strong>
                      </label>
                      <input type="range" min={1} max={10}
                        value={cataForm[attr.key as keyof typeof cataForm]}
                        onChange={e => setCataForm(f => ({ ...f, [attr.key]: e.target.value }))}
                        style={{ width: '100%', accentColor: C.terra }}
                      />
                    </div>
                  ))}

                  <div>
                    <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>
                      Notas de sabor (separadas por coma)
                    </label>
                    <input
                      value={cataForm.notas}
                      onChange={e => setCataForm(f => ({ ...f, notas: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', border: `1px solid #ddd`, borderRadius: 8, fontFamily: 'Montserrat', fontSize: 13, color: C.brown, boxSizing: 'border-box' }}
                      placeholder="chocolate, caramelo, frutas rojas, nuez"
                    />
                  </div>

                  {/* F07: Motor de precios en tiempo real */}
                  {cataForm.puntaje && Number(cataForm.puntaje) >= 82 && (
                    <div style={{ background: C.green, borderRadius: 10, padding: 16, color: C.cream }}>
                      <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.sage, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>
                        Motor de precios — Precio final calculado
                      </p>
                      {(() => {
                        const { comision, flete, almacen, total } = calcPrecioFinal(catacionLote.precioOrigenPEN);
                        return (
                          <>
                            {[
                              { label: 'Precio origen caficultor', val: `S/ ${catacionLote.precioOrigenPEN.toLocaleString()}` },
                              { label: 'Comisión plataforma (10%)', val: `S/ ${comision}` },
                              { label: 'Flete terrestre → Lima', val: `S/ ${flete}` },
                              { label: 'Almacenamiento hub', val: `S/ ${almacen}` },
                            ].map(r => (
                              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan }}>{r.label}</span>
                                <span style={{ fontFamily: 'Montserrat', fontSize: 11 }}>{r.val}</span>
                              </div>
                            ))}
                            <div style={{ borderTop: '1px solid rgba(143,175,138,0.3)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13 }}>Precio al tostador/saco</span>
                              <span style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, fontWeight: 700, color: C.terra }}>S/ {total.toLocaleString()}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {cataForm.puntaje && Number(cataForm.puntaje) < 82 && (
                    <div style={{ background: '#fff3f3', border: '1px solid #ffaaaa', borderRadius: 8, padding: 12 }}>
                      <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: '#cc0000', margin: 0 }}>
                        Puntaje por debajo de 82 pts — mínimo para café de especialidad. El lote será marcado como "No aprobado" y se notificará al caficultor con recomendaciones.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => setCataGuardado(true)}
                    disabled={!cataForm.puntaje}
                    style={{
                      background: C.terra, color: 'white', border: 'none', borderRadius: 8,
                      padding: '14px', fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700,
                      cursor: 'pointer', opacity: !cataForm.puntaje ? 0.5 : 1,
                    }}
                  >
                    Guardar ficha y publicar lote en marketplace →
                  </button>
                </div>
              </div>
            )}

            {cataGuardado && catacionLote && (
              <div style={{ background: 'white', borderRadius: 14, padding: 32, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
                <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 26, color: C.brown, marginBottom: 8 }}>
                  Lote aprobado y publicado
                </h3>
                <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, marginBottom: 16 }}>
                  <strong>{catacionLote.nombreLote}</strong> está visible en el marketplace con puntaje <strong style={{ color: C.terra }}>{cataForm.puntaje} pts SCA</strong>.
                  El caficultor fue notificado por WhatsApp.
                </p>
                <button onClick={() => { setCataGuardado(false); setCatacionLote(null); setCataForm({ puntaje: '', acidez: '7', cuerpo: '7', balance: '7', notas: '' }); }} style={{
                  background: C.terra, color: 'white', border: 'none', borderRadius: 8,
                  padding: '10px 24px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>
                  Catar otro lote
                </button>
              </div>
            )}
          </div>
        )}

        {/* LOGÍSTICA KANBAN — F08 */}
        {tab === 'logistica' && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 6 }}>
              Panel Logístico
            </h2>
            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, marginBottom: 24 }}>
              Estado de todos los pedidos activos. Arrastra o actualiza el estado al avanzar en la cadena.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              {KANBAN_COLS.map(col => {
                const pedidosCol = pedidos.filter(p => p.logisticaStatus === col.key);
                return (
                  <div key={col.key} style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ background: col.color, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, color: 'white' }}>{col.label}</span>
                      <span style={{ background: 'rgba(255,255,255,0.3)', color: 'white', fontSize: 11, fontFamily: 'Montserrat', fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                        {pedidosCol.length}
                      </span>
                    </div>
                    <div style={{ padding: 12, minHeight: 120 }}>
                      {pedidosCol.length === 0 && (
                        <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, textAlign: 'center', marginTop: 20 }}>Sin pedidos</p>
                      )}
                      {pedidosCol.map(p => (
                        <div key={p.id} style={{ background: '#f7f3ee', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: C.brown, margin: '0 0 2px' }}>{p.id}</p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 4px' }}>Lote: {p.loteId}</p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.terra, margin: 0, fontWeight: 600 }}>
                            {p.sacosSolicitados} sacos · S/{p.totalPEN.toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LOTES */}
        {tab === 'lotes' && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 20 }}>
              Todos los lotes
            </h2>
            <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.brown, color: C.cream }}>
                    {['ID', 'Lote', 'Variedad', 'SCA', 'Sacos', 'Precio/saco', 'Estado'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, textAlign: 'left', letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DEMO_LOTES.map((l, i) => (
                    <tr key={l.id} style={{ background: i % 2 === 0 ? 'white' : '#faf7f4' }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'Montserrat', fontSize: 11, color: C.tan }}>{l.id}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'Montserrat', fontSize: 12, color: C.brown, fontWeight: 600 }}>{l.nombreLote.slice(0, 28)}...</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'Montserrat', fontSize: 12, color: C.tan }}>{l.variedad}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'Cormorant Garamond', fontSize: 16, fontWeight: 700, color: C.terra }}>
                        {(l.puntajeOficial ?? l.puntajeReferencial).toFixed(1)}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'Montserrat', fontSize: 12, color: C.brown }}>
                        {l.sacosDisponibles - l.sacosReservados}/{l.sacosDisponibles}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'Montserrat', fontSize: 12, color: C.brown }}>
                        S/ {l.precioOrigenPEN.toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          background: l.status === 'publicado' ? `${C.sage}20` : `${C.tan}20`,
                          color: l.status === 'publicado' ? C.sage : C.tan,
                          fontSize: 10, fontFamily: 'Montserrat', fontWeight: 700,
                          padding: '3px 8px', borderRadius: 20,
                        }}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
