/**
 * CaficultorPortal.tsx — F01: Registro finca + F02: Publicar lote + F03: Estado de lotes
 * Actor: Caficultor (optimizado para móvil, zonas rurales)
 */
import { useState, useEffect } from 'react';
import { fetchMktLotesByCaficultor, createMktLote } from '@/features/marketplace/marketplaceService';
import type { LoteDoc } from '@/shared/types/marketplace';

const C = {
  green: '#1f3028', cream: '#f2e0cc', terra: '#c96e4b',
  sage: '#8faf8a', tan: '#c4b297', brown: '#533b22',
};

const STATUS_INFO: Record<string, { label: string; color: string; desc: string }> = {
  borrador:        { label: 'Borrador', color: C.tan, desc: 'Completa los datos y envía tu muestra.' },
  muestra_enviada: { label: 'Muestra enviada', color: '#d6b15a', desc: 'Recibimos tu muestra. Q-Grader la catará en 3-5 días hábiles.' },
  en_catacion:     { label: 'En catación', color: '#d6b15a', desc: 'Nuestro Q-Grader está evaluando tu café. Te avisamos por WhatsApp.' },
  aprobado:        { label: 'Aprobado', color: C.sage, desc: 'Tu lote pasó la cata. El admin lo publicará en el marketplace.' },
  publicado:       { label: 'Publicado ✓', color: C.sage, desc: 'Tu café está en el marketplace y puede recibir pedidos.' },
  agotado:         { label: 'Agotado', color: C.terra, desc: 'Todos los sacos fueron vendidos. ¡Excelente!' },
  rechazado:       { label: 'No aprobado', color: '#888', desc: 'El café no alcanzó los 82 pts mínimos. Podemos orientarte para mejorar.' },
};

type Tab = 'mis_lotes' | 'nuevo_lote' | 'perfil';

export default function CaficultorPortal() {
  const [tab, setTab] = useState<Tab>('mis_lotes');
  const [loteForm, setLoteForm] = useState({
    nombreLote: '', variedad: '', proceso: 'lavado',
    altitud: '', sacosDisponibles: '', precioOrigenPEN: '', cosecha: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [misLotes, setMisLotes] = useState<LoteDoc[]>([]);

  // Demo: caficultor fijo mkt-caf-001 (en producción vendría del auth)
  const caficultor = {
    id: 'mkt-caf-001',
    nombre: 'Darlyn Sánchez',
    finca: 'Bello Horizonte',
    region: 'Oxapampa, Pasco',
    foto: 'https://images.unsplash.com/photo-1559181567-c3190ca9d5db?w=200',
  };

  useEffect(() => {
    fetchMktLotesByCaficultor(caficultor.id).then(setMisLotes);
  }, [submitted]);

  function setField(k: string, v: string) { setLoteForm(f => ({ ...f, [k]: v })); }

  async function handleSubmitLote() {
    setGuardando(true);
    const precioOrigen = Number(loteForm.precioOrigenPEN);
    await createMktLote({
      caficultorId:       caficultor.id,
      nombreLote:         loteForm.nombreLote,
      cosecha:            loteForm.cosecha,
      proceso:            loteForm.proceso as LoteDoc['proceso'],
      variedad:           loteForm.variedad,
      altitud:            `${loteForm.altitud} msnm`,
      region:             caficultor.region,
      puntajeReferencial: 0,
      notasSabor:         [],
      sacosDisponibles:   Number(loteForm.sacosDisponibles),
      sacosReservados:    0,
      precioOrigenPEN:    precioOrigen,
      muestraDisponible:  false,
      precioMuestraPEN:   15,
      status:             'borrador',
      destacado:          false,
    });
    setGuardando(false);
    setSubmitted(true);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', border: `1px solid #ddd`, borderRadius: 8,
    fontFamily: 'Montserrat', fontSize: 14, color: C.brown, background: 'white',
    boxSizing: 'border-box',
  };

  // Calcula precio estimado que recibirá el caficultor
  const precioOrigen = Number(loteForm.precioOrigenPEN) || 0;
  const comisionPlataforma = Math.round(precioOrigen * 0.10);
  const precioFinal = precioOrigen + comisionPlataforma + 35; // flete + almacén

  return (
    <div style={{ background: '#f7f3ee', minHeight: '100vh' }}>

      {/* Header caficultor */}
      <div style={{ background: C.green, padding: '28px 24px', color: C.cream }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src={caficultor.foto} alt={caficultor.nombre}
              style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${C.sage}` }} />
            <div>
              <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.sage, letterSpacing: 2, margin: '0 0 2px', textTransform: 'uppercase' }}>
                Portal del caficultor
              </p>
              <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, margin: 0 }}>
                Hola, {caficultor.nombre}
              </h2>
              <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: 0 }}>
                Finca {caficultor.finca} · {caficultor.region}
              </p>
            </div>
          </div>

          {/* Mini stats */}
          <div style={{ display: 'flex', gap: 28, marginTop: 20 }}>
            {[
              { n: misLotes.length, label: 'lotes registrados' },
              { n: misLotes.filter(l => l.status === 'publicado').length, label: 'publicados' },
              { n: misLotes.reduce((s, l) => s + l.sacosReservados, 0), label: 'sacos reservados' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontFamily: 'Cormorant Garamond', fontSize: 26, fontWeight: 700, color: C.cream }}>{s.n}</div>
                <div style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: 'white', borderBottom: '1px solid #eee', padding: '0 24px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', gap: 0 }}>
          {([
            { key: 'mis_lotes', label: 'Mis lotes' },
            { key: 'nuevo_lote', label: '+ Publicar nuevo lote' },
            { key: 'perfil', label: 'Mi perfil' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background: 'none', border: 'none', borderBottom: `3px solid ${tab === t.key ? C.terra : 'transparent'}`,
              padding: '14px 20px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: tab === t.key ? 700 : 400,
              color: tab === t.key ? C.terra : C.tan, cursor: 'pointer', transition: 'all 0.2s',
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '28px 24px' }}>

        {/* MIS LOTES */}
        {tab === 'mis_lotes' && (
          <div>
            {misLotes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.tan }}>
                  Aún no tienes lotes registrados.<br />
                  <button onClick={() => setTab('nuevo_lote')} style={{ color: C.terra, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                    Publica tu primer lote →
                  </button>
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                {misLotes.map(lote => {
                  const info = STATUS_INFO[lote.status];
                  const disponibles = lote.sacosDisponibles - lote.sacosReservados;
                  const ingresosEstimados = lote.sacosReservados * (lote.precioOrigenPEN);
                  return (
                    <div key={lote.id} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>
                            {lote.id} · {lote.cosecha}
                          </p>
                          <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, color: C.brown, margin: 0 }}>
                            {lote.nombreLote}
                          </h3>
                        </div>
                        <span style={{
                          background: `${info.color}20`, color: info.color,
                          fontSize: 11, fontFamily: 'Montserrat', fontWeight: 700,
                          padding: '4px 10px', borderRadius: 20,
                        }}>
                          {info.label}
                        </span>
                      </div>

                      <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, marginBottom: 14 }}>
                        {info.desc}
                      </p>

                      {/* Barra de progreso de sacos */}
                      {lote.sacosDisponibles > 0 && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan }}>
                              {lote.sacosReservados} reservados / {lote.sacosDisponibles} total
                            </span>
                            <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.sage }}>
                              {disponibles} disponibles
                            </span>
                          </div>
                          <div style={{ background: '#f0ebe4', borderRadius: 4, height: 8 }}>
                            <div style={{
                              background: C.terra, borderRadius: 4, height: 8,
                              width: `${(lote.sacosReservados / lote.sacosDisponibles) * 100}%`,
                              transition: 'width 0.5s',
                            }} />
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 20 }}>
                        <div>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase' }}>Tu precio/saco</p>
                          <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, color: C.brown, margin: 0, fontWeight: 700 }}>
                            S/ {lote.precioOrigenPEN.toLocaleString()}
                          </p>
                        </div>
                        {ingresosEstimados > 0 && (
                          <div>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase' }}>Ingresos estimados</p>
                            <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, color: C.sage, margin: 0, fontWeight: 700 }}>
                              S/ {ingresosEstimados.toLocaleString()}
                            </p>
                          </div>
                        )}
                        {lote.puntajeOficial && (
                          <div>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase' }}>Puntaje Q-Grader</p>
                            <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, color: C.terra, margin: 0, fontWeight: 700 }}>
                              {lote.puntajeOficial} pts SCA
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* NUEVO LOTE — F01 + F02 */}
        {tab === 'nuevo_lote' && !submitted && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 6 }}>
              Publicar nuevo lote
            </h2>
            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, marginBottom: 24, lineHeight: 1.6 }}>
              Completa los datos de tu café. Una vez enviada la muestra a Lima (200g por Shalom/Olva),
              nuestro Q-Grader lo catará y lo publicamos en el marketplace.
            </p>

            <div style={{ background: 'white', borderRadius: 14, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'grid', gap: 18 }}>
              <div>
                <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Nombre del lote *</label>
                <input style={inputStyle} value={loteForm.nombreLote} onChange={e => setField('nombreLote', e.target.value)}
                  placeholder="Ej: Finca San José — Geisha Honey Lote 01" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Variedad *</label>
                  <input style={inputStyle} value={loteForm.variedad} onChange={e => setField('variedad', e.target.value)}
                    placeholder="Geisha, Caturra, Bourbon..." />
                </div>
                <div>
                  <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Proceso *</label>
                  <select style={inputStyle} value={loteForm.proceso} onChange={e => setField('proceso', e.target.value)}>
                    <option value="lavado">Lavado</option>
                    <option value="natural">Natural</option>
                    <option value="honey">Honey</option>
                    <option value="anaerobico">Anaeróbico</option>
                    <option value="doble_fermentacion">Doble fermentación</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Altitud (msnm) *</label>
                  <input style={inputStyle} type="number" value={loteForm.altitud} onChange={e => setField('altitud', e.target.value)}
                    placeholder="1800" />
                </div>
                <div>
                  <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Cosecha *</label>
                  <input style={inputStyle} value={loteForm.cosecha} onChange={e => setField('cosecha', e.target.value)}
                    placeholder="Junio 2026" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Sacos disponibles (60kg c/u) *</label>
                  <input style={inputStyle} type="number" value={loteForm.sacosDisponibles} onChange={e => setField('sacosDisponibles', e.target.value)}
                    placeholder="10" min={1} />
                </div>
                <div>
                  <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Precio mínimo por saco (S/) *</label>
                  <input style={inputStyle} type="number" value={loteForm.precioOrigenPEN} onChange={e => setField('precioOrigenPEN', e.target.value)}
                    placeholder="850" min={100} />
                </div>
              </div>

              {/* Calculadora de ingresos en tiempo real */}
              {precioOrigen > 0 && (
                <div style={{ background: C.green, borderRadius: 10, padding: 16, color: C.cream }}>
                  <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.sage, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>
                    Estimado — precio al tostador en Lima
                  </p>
                  {[
                    { label: 'Tu precio (lo que tú recibes)', val: `S/ ${precioOrigen.toLocaleString()}` },
                    { label: 'Comisión plataforma (10%)', val: `+ S/ ${comisionPlataforma}` },
                    { label: 'Flete + almacén Lima', val: `+ S/ 35` },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan }}>{r.label}</span>
                      <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.cream }}>{r.val}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid rgba(143,175,138,0.3)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700 }}>Precio final al tostador</span>
                    <span style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, fontWeight: 700, color: C.terra }}>S/ {precioFinal.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div style={{ background: '#fffbf5', border: `1px solid ${C.tan}40`, borderRadius: 10, padding: 14 }}>
                <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown, margin: '0 0 6px', fontWeight: 600 }}>
                  Próximo paso: enviar muestra de 200g
                </p>
                <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: 0, lineHeight: 1.7 }}>
                  Envía 200g de tu café verde (en pergamino o trillado) por <strong>Shalom o Olva</strong> a:<br />
                  <strong>Jr. Ucayali 142, Lima Centro — A nombre de: Tunay Wasi / Q-Lab</strong><br />
                  Costo de envío: S/15-20. Te reembolsamos si el lote se aprueba.
                </p>
              </div>

              <button
                style={{
                  background: C.terra, color: 'white', border: 'none', borderRadius: 8,
                  padding: '14px', fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', opacity: (!loteForm.nombreLote || !loteForm.variedad || !loteForm.precioOrigenPEN || guardando) ? 0.5 : 1,
                }}
                onClick={handleSubmitLote}
                disabled={!loteForm.nombreLote || !loteForm.variedad || !loteForm.precioOrigenPEN || guardando}
              >
                {guardando ? 'Guardando...' : 'Registrar lote y recibir instrucciones de envío →'}
              </button>
            </div>
          </div>
        )}

        {tab === 'nuevo_lote' && submitted && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🌱</div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 8 }}>
              ¡Lote registrado!
            </h2>
            <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.tan, lineHeight: 1.7, maxWidth: 420, margin: '0 auto 24px' }}>
              Te enviamos las instrucciones de despacho por <strong>WhatsApp</strong>.<br />
              Cuando recibamos tu muestra, el Q-Grader la catará en 3–5 días.
            </p>
            <button onClick={() => { setSubmitted(false); setTab('mis_lotes'); }} style={{
              background: C.terra, color: 'white', border: 'none', borderRadius: 8,
              padding: '12px 28px', fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>
              Ver mis lotes →
            </button>
          </div>
        )}

        {/* PERFIL */}
        {tab === 'perfil' && (
          <div style={{ background: 'white', borderRadius: 14, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <img src={caficultor.foto} alt={caficultor.nombre}
                style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} />
              <div>
                <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 24, color: C.brown, margin: 0 }}>{caficultor.nombre}</h2>
                <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, margin: 0 }}>Finca {caficultor.finca} · {caficultor.region}</p>
              </div>
            </div>
            <div style={{ background: '#f7f3ee', borderRadius: 10, padding: 16 }}>
              <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: '0 0 8px' }}>
                Próximamente: editar perfil, subir fotos de finca, historial de pagos y certificaciones.
              </p>
              <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, margin: 0 }}>
                ¿Dudas? Escríbenos a <strong style={{ color: C.terra }}>WhatsApp +51 999 000 000</strong>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
