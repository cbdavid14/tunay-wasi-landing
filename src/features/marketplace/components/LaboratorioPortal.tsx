/**
 * LaboratorioPortal.tsx — Portal del laboratorio certificado
 * Actor: Laboratorio/Tostador con Q-Grader
 *
 * Flujo:
 *   1. Ve los lotes con muestra recibida asignados a su cuenta
 *   2. Registra puntaje SCA + atributos + datos de tueste
 *   3. El lote pasa a "aprobado" — el admin de TW lo publica
 */
import { useState, useEffect } from 'react';
import {
  fetchMktLotesPendientesCatacion,
  fetchMktLotesHistorialLab,
  updateMktLoteCatacion,
  updateMktLoteStatus,
  fetchMktSolicitudesByLoteIds,
  updateMktSolicitudStatus,
  fetchMktLotesByLaboratorio,
  fetchMktPedidosByLoteIds,
} from '@/features/marketplace/marketplaceService';
import type { LoteDoc, PedidoB2BDoc } from '@/shared/types/marketplace';
import type { PerfilLaboratorio } from '@/shared/types/auth';

const C = {
  green: '#1f3028', cream: '#f2e0cc', terra: '#c96e4b',
  sage: '#8faf8a', tan: '#c4b297', brown: '#533b22',
};

type Tab = 'pendientes' | 'registrar_cata' | 'historial';

interface Props {
  laboratorio: PerfilLaboratorio;
  onLogout: () => void;
}

export default function LaboratorioPortal({ laboratorio, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('pendientes');
  const [loteSeleccionado, setLoteSeleccionado] = useState<LoteDoc | null>(null);
  const [pendientes, setPendientes] = useState<LoteDoc[]>([]);
  const [historial, setHistorial] = useState<LoteDoc[]>([]);
  const [pedidosHistorial, setPedidosHistorial] = useState<PedidoB2BDoc[]>([]);
  const [lotesDelLab, setLotesDelLab] = useState<LoteDoc[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [cataGuardada, setCataGuardada] = useState(false);

  const [cataForm, setCataForm] = useState({
    puntaje: '',
    acidez: '7',
    cuerpo: '7',
    balance: '7',
    notas: '',
    datosTueste: '',
  });

  useEffect(() => {
    fetchMktLotesPendientesCatacion(laboratorio.uid).then(setPendientes);
    fetchMktLotesHistorialLab(laboratorio.uid).then(setHistorial);
    fetchMktLotesByLaboratorio(laboratorio.uid).then(lotes => {
      setLotesDelLab(lotes);
      const ids = lotes.map(l => l.id);
      fetchMktPedidosByLoteIds(ids).then(peds => {
        setPedidosHistorial(peds.filter(p => p.logisticaStatus === 'entregado' || p.logisticaStatus === 'en_almacen' || p.logisticaStatus === 'en_transito' || p.logisticaStatus === 'en_origen'));
      });
    });
  }, [cataGuardada]);

  function setField(k: string, v: string) {
    setCataForm(f => ({ ...f, [k]: v }));
  }

  async function handleAceptarMuestra(lote: LoteDoc) {
    await updateMktLoteStatus(lote.id, 'en_catacion', { laboratorioId: laboratorio.uid });
    setPendientes(prev => prev.map(l => l.id === lote.id ? { ...l, status: 'en_catacion', laboratorioId: laboratorio.uid } : l));
  }

  async function handleRegistrarCata() {
    if (!loteSeleccionado) return;
    setGuardando(true);
    const puntaje = Number(cataForm.puntaje);
    const notasSabor = cataForm.notas.split(',').map(n => n.trim()).filter(Boolean);
    const comisionPlataforma = Math.round(loteSeleccionado.precioOrigenPEN * 0.10);
    const precioVenta = loteSeleccionado.precioOrigenPEN + comisionPlataforma + 35;

    await updateMktLoteCatacion(
      loteSeleccionado.id,
      laboratorio.uid,
      puntaje,
      Number(cataForm.acidez),
      Number(cataForm.cuerpo),
      Number(cataForm.balance),
      notasSabor,
      cataForm.datosTueste,
      precioVenta,
    );
    // Marcar todas las solicitudes de este lote como recibidas
    const solicitudes = await fetchMktSolicitudesByLoteIds([loteSeleccionado.id]);
    await Promise.all(
      solicitudes
        .filter(s => s.status !== 'recibida')
        .map(s => updateMktSolicitudStatus(s.id, 'recibida'))
    );
    setGuardando(false);
    setCataGuardada(true);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8,
    fontFamily: 'Montserrat', fontSize: 14, color: C.brown, background: 'white',
    boxSizing: 'border-box',
  };

  const enCatacion = pendientes.filter(l => l.status === 'en_catacion' && l.laboratorioId === laboratorio.uid);
  const muestraRecibida = pendientes.filter(l => l.status === 'muestra_enviada');
  const puntajeNum = Number(cataForm.puntaje);
  const aprobado = puntajeNum >= 82;

  return (
    <div style={{ background: '#f7f3ee', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: C.brown, padding: '28px 24px', color: C.cream }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, letterSpacing: 2, margin: '0 0 4px', textTransform: 'uppercase' }}>
                Portal del laboratorio
              </p>
              <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 24, margin: '0 0 2px' }}>
                {laboratorio.nombreComercial}
              </h2>
              <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: 0 }}>
                {laboratorio.certificaciones.join(' · ')}
              </p>
            </div>
            <button
              onClick={onLogout}
              style={{
                background: 'transparent', color: C.tan, border: `1px solid ${C.tan}40`,
                borderRadius: 8, padding: '6px 14px', fontFamily: 'Montserrat',
                fontSize: 11, cursor: 'pointer',
              }}
            >
              Cerrar sesión
            </button>
          </div>

          <div style={{ display: 'flex', gap: 32, marginTop: 20 }}>
            {[
              { n: enCatacion.length, label: 'en catación' },
              { n: historial.length, label: 'lotes catados' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, fontWeight: 700, color: C.cream }}>{s.n}</div>
                <div style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: 'white', borderBottom: '1px solid #eee', padding: '0 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex' }}>
          {([
            { key: 'pendientes', label: 'Muestras pendientes' },
            { key: 'registrar_cata', label: 'Registrar catación' },
            { key: 'historial', label: 'Historial' },
          ] as { key: Tab; label: string; badge?: number }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background: 'none', border: 'none',
              borderBottom: `3px solid ${tab === t.key ? C.terra : 'transparent'}`,
              padding: '14px 20px', fontFamily: 'Montserrat', fontSize: 13,
              fontWeight: tab === t.key ? 700 : 400,
              color: tab === t.key ? C.terra : C.tan, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {t.label}
              {t.key === 'pendientes' && muestraRecibida.length > 0 && (
                <span style={{
                  background: C.terra, color: 'white', borderRadius: 20,
                  fontSize: 10, fontWeight: 700, padding: '1px 7px',
                }}>
                  {muestraRecibida.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 24px' }}>

        {/* MUESTRAS PENDIENTES */}
        {tab === 'pendientes' && (
          <div style={{ display: 'grid', gap: 14 }}>
            {pendientes.length === 0 && (
              <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.tan, textAlign: 'center', padding: '40px 0' }}>
                No hay muestras pendientes.
              </p>
            )}

            {muestraRecibida.map(lote => (
              <div key={lote.id} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: `1px solid #d6b15a44` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontFamily: 'Montserrat', fontSize: 10, color: '#d6b15a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Muestra recibida — sin asignar
                    </span>
                    <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, color: C.brown, margin: '4px 0 2px' }}>
                      {lote.nombreLote}
                    </h3>
                    <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: 0 }}>
                      {lote.variedad} · {lote.proceso} · {lote.altitud} · {lote.region}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAceptarMuestra(lote)}
                    style={{
                      background: C.terra, color: 'white', border: 'none', borderRadius: 8,
                      padding: '10px 16px', fontFamily: 'Montserrat', fontSize: 12,
                      fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    Aceptar muestra →
                  </button>
                </div>
              </div>
            ))}

            {enCatacion.map(lote => (
              <div key={lote.id} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: `1px solid ${C.sage}44` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.sage, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                      En catación
                    </span>
                    <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, color: C.brown, margin: '4px 0 2px' }}>
                      {lote.nombreLote}
                    </h3>
                    <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: 0 }}>
                      {lote.variedad} · {lote.proceso} · {lote.altitud}
                    </p>
                  </div>
                  <button
                    onClick={() => { setLoteSeleccionado(lote); setTab('registrar_cata'); setCataGuardada(false); }}
                    style={{
                      background: C.green, color: C.cream, border: 'none', borderRadius: 8,
                      padding: '10px 16px', fontFamily: 'Montserrat', fontSize: 12,
                      fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    Registrar cata →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* REGISTRAR CATACIÓN */}
        {tab === 'registrar_cata' && !cataGuardada && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 6 }}>
              Registrar catación
            </h2>
            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, marginBottom: 24, lineHeight: 1.6 }}>
              Ingresa los resultados de la catación SCA y el perfil de tueste sugerido.
              Al guardar, el lote queda en "Aprobado" y el admin de Tunay Wasi lo publica en el marketplace.
            </p>

            {/* Selector de lote si no viene preseleccionado */}
            {!loteSeleccionado && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 8 }}>
                  Selecciona el lote a catar
                </label>
                <div style={{ display: 'grid', gap: 10 }}>
                  {enCatacion.map(lote => (
                    <div key={lote.id}
                      onClick={() => setLoteSeleccionado(lote)}
                      style={{
                        background: 'white', borderRadius: 10, padding: '14px 18px',
                        cursor: 'pointer', border: `2px solid ${C.tan}40`,
                        fontFamily: 'Montserrat', fontSize: 13, color: C.brown,
                        transition: 'border-color 0.15s',
                      }}
                    >
                      <strong>{lote.nombreLote}</strong>
                      <span style={{ color: C.tan, marginLeft: 8 }}>{lote.variedad} · {lote.region}</span>
                    </div>
                  ))}
                  {enCatacion.length === 0 && (
                    <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan }}>
                      No hay lotes en catación. Acepta una muestra primero.
                    </p>
                  )}
                </div>
              </div>
            )}

            {loteSeleccionado && (
              <>
                <div style={{ background: C.green, borderRadius: 10, padding: '14px 18px', marginBottom: 24, color: C.cream }}>
                  <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.sage, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Catando
                  </p>
                  <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, margin: 0, fontWeight: 700 }}>
                    {loteSeleccionado.nombreLote}
                  </p>
                  <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: '4px 0 0' }}>
                    {loteSeleccionado.variedad} · {loteSeleccionado.proceso} · {loteSeleccionado.altitud} · {loteSeleccionado.region}
                  </p>
                </div>

                <div style={{ background: 'white', borderRadius: 14, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'grid', gap: 18 }}>

                  {/* Puntaje global */}
                  <div>
                    <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>
                      Puntaje SCA total *
                    </label>
                    <input
                      style={{ ...inputStyle, fontSize: 20, fontWeight: 700, color: aprobado ? C.sage : C.terra }}
                      type="number" min={60} max={100} step={0.25}
                      value={cataForm.puntaje}
                      onChange={e => setField('puntaje', e.target.value)}
                      placeholder="87.25"
                    />
                    {cataForm.puntaje && (
                      <p style={{ fontFamily: 'Montserrat', fontSize: 12, marginTop: 6, color: aprobado ? C.sage : C.terra }}>
                        {aprobado
                          ? puntajeNum >= 90 ? '⭐ Extraordinario — Taza de Excelencia' : puntajeNum >= 85 ? '✓ Excelente — microlote premium' : '✓ Aprobado — café de especialidad'
                          : '✗ No alcanza los 82 pts mínimos para especialidad'}
                      </p>
                    )}
                  </div>

                  {/* Atributos SCA */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    {([
                      { key: 'acidez', label: 'Acidez (1-10)' },
                      { key: 'cuerpo', label: 'Cuerpo (1-10)' },
                      { key: 'balance', label: 'Balance (1-10)' },
                    ] as { key: 'acidez' | 'cuerpo' | 'balance'; label: string }[]).map(attr => (
                      <div key={attr.key}>
                        <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>
                          {attr.label}
                        </label>
                        <input
                          style={inputStyle}
                          type="number" min={1} max={10} step={0.5}
                          value={cataForm[attr.key]}
                          onChange={e => setField(attr.key, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Notas de sabor */}
                  <div>
                    <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>
                      Notas de sabor (separadas por coma) *
                    </label>
                    <input
                      style={inputStyle}
                      value={cataForm.notas}
                      onChange={e => setField('notas', e.target.value)}
                      placeholder="chocolate negro, frutas rojas, caramelo, floral"
                    />
                  </div>

                  {/* Datos de tueste */}
                  <div>
                    <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>
                      Perfil de tueste sugerido *
                    </label>
                    <textarea
                      style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                      value={cataForm.datosTueste}
                      onChange={e => setField('datosTueste', e.target.value)}
                      placeholder="Tueste medio-claro. Temperatura entrada: 190°C. Desarrollo: 12-14%. Tiempo total: 10-11 min. Ideal para filter y espresso."
                    />
                  </div>

                  <button
                    onClick={handleRegistrarCata}
                    disabled={!cataForm.puntaje || !cataForm.notas || !cataForm.datosTueste || guardando}
                    style={{
                      background: aprobado ? C.sage : '#888',
                      color: 'white', border: 'none', borderRadius: 8,
                      padding: 14, fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700,
                      cursor: (!cataForm.puntaje || !cataForm.notas || !cataForm.datosTueste || guardando) ? 'not-allowed' : 'pointer',
                      opacity: (!cataForm.puntaje || !cataForm.notas || !cataForm.datosTueste || guardando) ? 0.5 : 1,
                    }}
                  >
                    {guardando ? 'Guardando...' : aprobado ? 'Registrar catación y aprobar lote →' : 'Registrar rechazo'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* CONFIRMACIÓN */}
        {tab === 'registrar_cata' && cataGuardada && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✓</div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 8 }}>
              Catación registrada
            </h2>
            <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.tan, lineHeight: 1.7, maxWidth: 420, margin: '0 auto 24px' }}>
              El lote quedó en estado <strong>"Aprobado"</strong>.<br />
              El equipo de Tunay Wasi lo revisará y lo publicará en el marketplace.
            </p>
            <button
              onClick={() => { setCataGuardada(false); setLoteSeleccionado(null); setTab('pendientes'); setCataForm({ puntaje: '', acidez: '7', cuerpo: '7', balance: '7', notas: '', datosTueste: '' }); }}
              style={{
                background: C.terra, color: 'white', border: 'none', borderRadius: 8,
                padding: '12px 28px', fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Ver muestras pendientes →
            </button>
          </div>
        )}
        {/* HISTORIAL */}
        {tab === 'historial' && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 6 }}>
              Historial
            </h2>
            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, marginBottom: 24 }}>
              Todos los pedidos procesados — catación y/o tueste por lote.
            </p>

            {historial.length === 0 && pedidosHistorial.length === 0 ? (
              <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.tan, textAlign: 'center', padding: '40px 0' }}>
                Aún no hay pedidos completados.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                {(() => {
                  const loteIds = Array.from(new Set([
                    ...historial.map(l => l.id),
                    ...pedidosHistorial.map((p: PedidoB2BDoc) => p.loteId),
                  ]));

                  return loteIds.map(loteId => {
                    const lote = lotesDelLab.find(l => l.id === loteId) ?? historial.find(l => l.id === loteId);
                    const pedidos = pedidosHistorial.filter((p: PedidoB2BDoc) => p.loteId === loteId);
                    const catacion = historial.find(l => l.id === loteId);

                    return (
                      <div key={loteId} style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        {/* Header del lote */}
                        <div style={{ background: C.green, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 9, color: C.sage, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>{loteId}</p>
                            <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 18, color: C.cream, margin: 0, fontWeight: 700 }}>
                              {lote?.nombreLote ?? loteId}
                            </p>
                            {lote && 'variedad' in lote && (
                              <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: '2px 0 0' }}>
                                {(lote as LoteDoc).variedad} · {(lote as LoteDoc).proceso} · {(lote as LoteDoc).region}
                              </p>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {catacion && (
                              <span style={{ background: `${C.sage}30`, color: C.sage, fontSize: 10, fontFamily: 'Montserrat', fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>
                                Catación ✓
                              </span>
                            )}
                            {pedidos.length > 0 && (
                              <span style={{ background: `${C.terra}30`, color: C.terra, fontSize: 10, fontFamily: 'Montserrat', fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>
                                {pedidos.length} pedido{pedidos.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ padding: '16px 20px' }}>
                          {/* Resultado catación */}
                          {catacion && (
                            <div style={{ marginBottom: pedidos.length > 0 ? 14 : 0, paddingBottom: pedidos.length > 0 ? 14 : 0, borderBottom: pedidos.length > 0 ? '1px solid #f0ebe4' : 'none' }}>
                              <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                                Catación SCA
                              </p>
                              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                                <div>
                                  <p style={{ fontFamily: 'Montserrat', fontSize: 9, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase' }}>Puntaje</p>
                                  <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 24, color: (catacion.puntajeOficial ?? 0) >= 82 ? C.sage : C.terra, margin: 0, fontWeight: 700, lineHeight: 1 }}>
                                    {catacion.puntajeOficial ?? '—'} pts
                                  </p>
                                </div>
                                {catacion.acidez != null && (
                                  <div>
                                    <p style={{ fontFamily: 'Montserrat', fontSize: 9, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase' }}>Acidez / Cuerpo / Balance</p>
                                    <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, margin: 0, fontWeight: 600 }}>
                                      {catacion.acidez} · {catacion.cuerpo} · {catacion.balance}
                                    </p>
                                  </div>
                                )}
                                {catacion.notasSabor?.length > 0 && (
                                  <div>
                                    <p style={{ fontFamily: 'Montserrat', fontSize: 9, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase' }}>Notas</p>
                                    <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: 0 }}>{catacion.notasSabor.join(', ')}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Pedidos */}
                          {pedidos.length > 0 && (
                            <div>
                              <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                                Pedidos
                              </p>
                              <div style={{ display: 'grid', gap: 8 }}>
                                {pedidos.map((p: PedidoB2BDoc) => (
                                  <div key={p.id} style={{ background: '#f7f3ee', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                    <div>
                                      <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px' }}>{p.id} · {new Date(p.updatedAt).toLocaleDateString('es-PE')}</p>
                                      <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, margin: 0, fontWeight: 600 }}>{p.razonSocial}</p>
                                      <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: '2px 0 0' }}>
                                        {p.sacosSolicitados} sacos · {p.kgTotal} kg
                                      </p>
                                      {(p.feeLaboratorioPEN ?? 0) > 0 && (
                                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                          <span style={{ background: `${C.sage}20`, color: C.sage, fontSize: 9, fontFamily: 'Montserrat', fontWeight: 600, padding: '2px 6px', borderRadius: 10 }}>
                                            Catación S/ {p.feeLaboratorioPEN}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    <span style={{
                                      background: p.pagoLaboratorioStatus === 'pagado' ? `${C.sage}20` : `${C.terra}15`,
                                      color: p.pagoLaboratorioStatus === 'pagado' ? C.sage : C.terra,
                                      fontSize: 10, fontFamily: 'Montserrat', fontWeight: 700,
                                      padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap',
                                    }}>
                                      {p.pagoLaboratorioStatus === 'pagado'
                                        ? `Pagado ✓ ${p.pagoLaboratorioAt ? new Date(p.pagoLaboratorioAt).toLocaleDateString('es-PE') : ''}`
                                        : 'Pago pendiente'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
