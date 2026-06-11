/**
 * CaficultorPortal.tsx — F01: Registro finca + F02: Publicar lote + F03: Estado de lotes
 * Actor: Caficultor (optimizado para móvil, zonas rurales)
 */
import { useState, useEffect } from 'react';
import {
  fetchMktLotesByCaficultor,
  createMktLote,
  publishMktLote,
  fetchMktSolicitudesByLoteIds,
  updateMktSolicitudStatus,
  updateMktLoteStatus,
  fetchMktPedidosByCaficultor,
  confirmarEnvioPedido,
  fetchMktLaboratorios,
} from '@/features/marketplace/marketplaceService';
import type { LoteDoc, SolicitudMuestraDoc, PedidoB2BDoc, LaboratorioDoc } from '@/shared/types/marketplace';
import type { PerfilCaficultor } from '@/shared/types/auth';

const C = {
  green: '#1f3028', cream: '#f2e0cc', terra: '#c96e4b',
  sage: '#8faf8a', tan: '#c4b297', brown: '#533b22',
};

const STATUS_INFO: Record<string, { label: string; color: string; desc: string }> = {
  borrador:           { label: 'Borrador', color: C.tan, desc: 'Completa los datos y publícalo cuando estés listo.' },
  publicado:          { label: 'Publicado ✓', color: C.sage, desc: 'Tu café está en el marketplace. Las cafeterías pueden solicitar una muestra.' },
  muestra_solicitada: { label: 'Muestra solicitada', color: '#d6b15a', desc: 'Una cafetería quiere tu café. Confirma el despacho de la muestra de 200g.' },
  muestra_enviada:    { label: 'Muestra enviada', color: '#d6b15a', desc: 'La cafetería recibió tu muestra. Esperamos el resultado de la cata.' },
  en_catacion:        { label: 'En catación', color: '#d6b15a', desc: 'El laboratorio está evaluando tu café. Te avisamos el puntaje al terminar.' },
  aprobado:           { label: 'Aprobado — en venta', color: C.sage, desc: 'Tu lote pasó la cata y está disponible para compra.' },
  agotado:            { label: 'Agotado', color: C.terra, desc: 'Todos los sacos fueron vendidos. ¡Excelente!' },
  rechazado:          { label: 'No aprobado', color: '#888', desc: 'El café no alcanzó los 82 pts mínimos. Podemos orientarte para mejorar.' },
};

type Tab = 'mis_lotes' | 'solicitudes' | 'nuevo_lote' | 'mis_pagos' | 'perfil';

interface Props {
  caficultor: PerfilCaficultor;
  onLogout: () => void;
}

export default function CaficultorPortal({ caficultor, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('mis_lotes');
  const [loteForm, setLoteForm] = useState({
    nombreLote: '', variedad: '', proceso: 'lavado',
    altitud: '', sacosDisponibles: '', precioOrigenPEN: '', cosecha: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [publicando, setPublicando] = useState<string | null>(null);
  const [misLotes, setMisLotes] = useState<LoteDoc[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudMuestraDoc[]>([]);
  const [misPedidos, setMisPedidos] = useState<PedidoB2BDoc[]>([]);
  const [laboratorios, setLaboratorios] = useState<LaboratorioDoc[]>([]);
  const [despachando, setDespachando] = useState<string | null>(null);
  const [enviandoSacos, setEnviandoSacos] = useState<string | null>(null);
  const [guiaForm, setGuiaForm] = useState<Record<string, { empresa: string; numero: string }>>({});

  useEffect(() => {
    fetchMktLotesByCaficultor(caficultor.uid).then(lotes => {
      setMisLotes(lotes);
      const ids = lotes.map(l => l.id);
      fetchMktSolicitudesByLoteIds(ids).then(setSolicitudes);
    });
    fetchMktPedidosByCaficultor(caficultor.uid).then(setMisPedidos);
    fetchMktLaboratorios().then(setLaboratorios);
  }, [submitted, caficultor.uid]);

  function setField(k: string, v: string) { setLoteForm(f => ({ ...f, [k]: v })); }

  async function handlePublicarLote(loteId: string) {
    setPublicando(loteId);
    await publishMktLote(loteId);
    setMisLotes(prev => prev.map(l => l.id === loteId ? { ...l, status: 'publicado' } : l));
    setPublicando(null);
  }

  async function handleConfirmarDespacho(solicitudId: string, loteId: string) {
    setDespachando(solicitudId);
    await updateMktSolicitudStatus(solicitudId, 'despachada');
    await updateMktLoteStatus(loteId, 'muestra_enviada');
    setSolicitudes(prev => prev.map(s => s.id === solicitudId ? { ...s, status: 'despachada' } : s));
    setMisLotes(prev => prev.map(l => l.id === loteId ? { ...l, status: 'muestra_enviada' } : l));
    setDespachando(null);
  }

  async function handleEnviarSacos(pedidoId: string) {
    const g = guiaForm[pedidoId];
    if (!g?.empresa || !g?.numero) return;
    setEnviandoSacos(pedidoId);
    await confirmarEnvioPedido(pedidoId, g.empresa as PedidoB2BDoc['empresaTransporte'], g.numero);
    setMisPedidos(prev => prev.map(p => p.id === pedidoId
      ? { ...p, logisticaStatus: 'en_transito', empresaTransporte: g.empresa as PedidoB2BDoc['empresaTransporte'], numeroGuia: g.numero }
      : p));
    setEnviandoSacos(null);
  }

  async function handleSubmitLote() {
    setGuardando(true);
    const precioOrigen = Number(loteForm.precioOrigenPEN);
    await createMktLote({
      caficultorId:       caficultor.uid,
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: C.terra, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${C.sage}`, fontSize: 22, fontWeight: 700, fontFamily: 'Cormorant Garamond', color: 'white' }}>
                {caficultor.nombre.charAt(0).toUpperCase()}
              </div>
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

          {/* Mini stats */}
          <div style={{ display: 'flex', gap: 28, marginTop: 20 }}>
            {[
              { n: misLotes.length, label: 'lotes registrados' },
              { n: misLotes.filter(l => l.status === 'publicado' || l.status === 'aprobado').length, label: 'activos en venta' },
              { n: misPedidos.filter(p => p.pagoStatus === 'verificado' && p.logisticaStatus === 'en_origen').length, label: 'pedidos por despachar', alert: true },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontFamily: 'Cormorant Garamond', fontSize: 26, fontWeight: 700, color: ('alert' in s && s.alert && s.n > 0) ? C.terra : C.cream }}>{s.n}</div>
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
            { key: 'solicitudes', label: 'Solicitudes de muestra', badge: solicitudes.filter(s => s.status === 'pendiente').length },
            { key: 'nuevo_lote', label: '+ Publicar nuevo lote' },
            { key: 'mis_pagos', label: 'Mis pagos', badge: misPedidos.filter(p => p.logisticaStatus === 'entregado' && p.pagoCaficultorStatus === 'pendiente').length },
            { key: 'perfil', label: 'Mi perfil' },
          ] as { key: Tab; label: string; badge?: number }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background: 'none', border: 'none', borderBottom: `3px solid ${tab === t.key ? C.terra : 'transparent'}`,
              padding: '14px 20px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: tab === t.key ? 700 : 400,
              color: tab === t.key ? C.terra : C.tan, cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {t.label}
              {t.badge != null && t.badge > 0 && (
                <span style={{
                  background: C.terra, color: 'white', borderRadius: '50%',
                  width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                }}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '28px 24px' }}>

        {/* MIS LOTES */}
        {tab === 'mis_lotes' && (
          <div>

            {/* ── Pedidos listos para despachar ───────────────────────────── */}
            {misPedidos.filter(p => p.pagoStatus === 'verificado' && p.logisticaStatus === 'en_origen').length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 18 }}>📦</span>
                  <h3 style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.terra, margin: 0 }}>
                    Pedidos por despachar
                  </h3>
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {misPedidos.filter(p => p.pagoStatus === 'verificado' && p.logisticaStatus === 'en_origen').map(ped => {
                    const lote = misLotes.find(l => l.id === ped.loteId);
                    const lab = lote?.laboratorioId ? laboratorios.find(l => l.id === lote.laboratorioId) : null;
                    const isEnviando = enviandoSacos === ped.id;
                    return (
                      <div key={ped.id} style={{
                        background: 'white', borderRadius: 12, padding: 20,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        borderLeft: `4px solid ${C.terra}`,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                          <div>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>
                              {ped.id} · {new Date(ped.createdAt).toLocaleDateString('es-PE')}
                            </p>
                            <h4 style={{ fontFamily: 'Cormorant Garamond', fontSize: 18, color: C.brown, margin: 0 }}>
                              {lote?.nombreLote ?? ped.loteId}
                            </h4>
                          </div>
                          <span style={{
                            background: `${C.terra}20`, color: C.terra,
                            fontSize: 11, fontFamily: 'Montserrat', fontWeight: 700,
                            padding: '4px 10px', borderRadius: 20,
                          }}>
                            Pago verificado ✓
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                          <div>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase' }}>Sacos</p>
                            <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, color: C.brown, margin: 0, fontWeight: 700 }}>{ped.sacosSolicitados}</p>
                          </div>
                          <div>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase' }}>Peso total</p>
                            <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, color: C.brown, margin: 0, fontWeight: 700 }}>{ped.kgTotal} kg</p>
                          </div>
                          <div>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase' }}>Tu pago</p>
                            <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, color: C.sage, margin: 0, fontWeight: 700 }}>S/ {ped.montoCaficultorPEN.toLocaleString()}</p>
                          </div>
                        </div>

                        {lab ? (
                          <div style={{ background: '#fffbf5', border: `1px solid ${C.terra}40`, borderRadius: 8, padding: 12, marginBottom: 14 }}>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.terra, margin: '0 0 6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                              Envía al laboratorio para tueste
                            </p>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, margin: '0 0 2px', fontWeight: 700 }}>
                              {lab.nombreComercial}
                            </p>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: '0 0 2px' }}>
                              {lab.direccion}
                            </p>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: '0 0 8px' }}>
                              Contacto: {lab.contactoNombre} · {lab.telefono}
                            </p>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: 0, fontStyle: 'italic' }}>
                              El laboratorio tueste y entrega al comprador ({ped.razonSocial}).
                            </p>
                          </div>
                        ) : (
                          <div style={{ background: '#fffbf5', border: `1px solid ${C.tan}40`, borderRadius: 8, padding: 12, marginBottom: 14 }}>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                              Envía directamente al comprador
                            </p>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, margin: '0 0 2px', fontWeight: 700 }}>
                              {ped.razonSocial}
                            </p>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: '0 0 2px' }}>
                              {ped.direccionEntrega}
                            </p>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: 0 }}>
                              Contacto: {ped.contacto} · {ped.telefono}
                            </p>
                          </div>
                        )}

                        {/* Formulario de envío */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                          <div>
                            <label style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                              Empresa transportista *
                            </label>
                            <select
                              value={guiaForm[ped.id]?.empresa ?? ''}
                              onChange={e => setGuiaForm(prev => ({ ...prev, [ped.id]: { ...prev[ped.id], empresa: e.target.value, numero: prev[ped.id]?.numero ?? '' } }))}
                              style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 13, color: C.brown, background: 'white' }}
                            >
                              <option value=''>Seleccionar...</option>
                              <option value='Shalom'>Shalom</option>
                              <option value='Olva'>Olva Courier</option>
                              <option value='Cruz del Sur'>Cruz del Sur</option>
                              <option value='Otro'>Otro</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                              Número de guía *
                            </label>
                            <input
                              value={guiaForm[ped.id]?.numero ?? ''}
                              onChange={e => setGuiaForm(prev => ({ ...prev, [ped.id]: { ...prev[ped.id], numero: e.target.value, empresa: prev[ped.id]?.empresa ?? '' } }))}
                              placeholder='SHL-2026-XXXXXXX'
                              style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 13, color: C.brown, background: 'white', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => handleEnviarSacos(ped.id)}
                          disabled={isEnviando || !guiaForm[ped.id]?.empresa || !guiaForm[ped.id]?.numero}
                          style={{
                            background: C.terra, color: 'white', border: 'none', borderRadius: 8,
                            padding: '10px 20px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700,
                            cursor: (isEnviando || !guiaForm[ped.id]?.empresa || !guiaForm[ped.id]?.numero) ? 'not-allowed' : 'pointer',
                            opacity: (isEnviando || !guiaForm[ped.id]?.empresa || !guiaForm[ped.id]?.numero) ? 0.5 : 1,
                          }}
                        >
                          {isEnviando ? 'Confirmando...' : 'Confirmar envío de sacos →'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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

                      {lote.status === 'borrador' && (
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid #eee` }}>
                          <button
                            onClick={() => handlePublicarLote(lote.id)}
                            disabled={publicando === lote.id}
                            style={{
                              background: C.terra, color: 'white', border: 'none', borderRadius: 8,
                              padding: '10px 20px', fontFamily: 'Montserrat', fontSize: 13,
                              fontWeight: 700, cursor: publicando === lote.id ? 'not-allowed' : 'pointer',
                              opacity: publicando === lote.id ? 0.6 : 1,
                            }}
                          >
                            {publicando === lote.id ? 'Publicando...' : 'Publicar en marketplace →'}
                          </button>
                        </div>
                      )}

                      {/* Pedidos de este lote */}
                      {misPedidos.filter(p => p.loteId === lote.id).length > 0 && (
                        <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid #eee` }}>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>
                            Pedidos
                          </p>
                          <div style={{ display: 'grid', gap: 6 }}>
                            {misPedidos.filter(p => p.loteId === lote.id).map(ped => {
                              const logLabel: Record<string, string> = {
                                pendiente_pago: 'Esperando pago',
                                en_origen: 'Pago verificado — despachar',
                                en_transito: 'En tránsito a Lima',
                                en_almacen: 'En almacén Lima',
                                entregado: 'Entregado ✓',
                                cancelado: 'Cancelado',
                              };
                              const logColor: Record<string, string> = {
                                pendiente_pago: C.tan,
                                en_origen: C.terra,
                                en_transito: '#d6b15a',
                                en_almacen: '#d6b15a',
                                entregado: C.sage,
                                cancelado: '#aaa',
                              };
                              const st = ped.logisticaStatus as string;
                              return (
                                <div key={ped.id} style={{
                                  background: '#f7f3ee', borderRadius: 8, padding: '8px 12px',
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                      <span style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 600, color: C.brown }}>{ped.id}</span>
                                      <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, marginLeft: 8 }}>
                                        {ped.sacosSolicitados} sacos · S/ {ped.montoCaficultorPEN.toLocaleString()}
                                      </span>
                                    </div>
                                    <span style={{
                                      fontFamily: 'Montserrat', fontSize: 10, fontWeight: 700,
                                      color: logColor[st] ?? C.tan,
                                    }}>
                                      {logLabel[st] ?? st}
                                    </span>
                                  </div>
                                  {ped.logisticaStatus === 'entregado' && (
                                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <span style={{
                                        fontFamily: 'Montserrat', fontSize: 10, fontWeight: 700,
                                        background: ped.pagoCaficultorStatus === 'pagado' ? `${C.sage}25` : `${C.terra}15`,
                                        color: ped.pagoCaficultorStatus === 'pagado' ? C.sage : C.terra,
                                        padding: '2px 8px', borderRadius: 20,
                                      }}>
                                        {ped.pagoCaficultorStatus === 'pagado'
                                          ? `Pago recibido ✓${ped.pagoCaficultorAt ? ' · ' + new Date(ped.pagoCaficultorAt).toLocaleDateString('es-PE') : ''}`
                                          : 'Pago pendiente — en proceso'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SOLICITUDES DE MUESTRA */}
        {tab === 'solicitudes' && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 6 }}>
              Solicitudes de muestra
            </h2>
            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, marginBottom: 24 }}>
              Cafeterías interesadas en tus lotes. Despacha la muestra de 200g y confirma aquí.
            </p>

            {solicitudes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.tan }}>
                  Aún no tienes solicitudes de muestra.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                {solicitudes.map(sol => {
                  const lote = misLotes.find(l => l.id === sol.loteId);
                  const isPendiente = sol.status === 'pendiente';
                  const isDespachando = despachando === sol.id;
                  return (
                    <div key={sol.id} style={{
                      background: 'white', borderRadius: 12, padding: 20,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      borderLeft: `4px solid ${isPendiente ? C.terra : C.sage}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>
                            {sol.id} · {new Date(sol.createdAt).toLocaleDateString('es-PE')}
                          </p>
                          <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 18, color: C.brown, margin: '0 0 2px' }}>
                            {lote?.nombreLote ?? sol.loteId}
                          </h3>
                        </div>
                        <span style={{
                          background: isPendiente ? `${C.terra}20` : `${C.sage}20`,
                          color: isPendiente ? C.terra : C.sage,
                          fontSize: 11, fontFamily: 'Montserrat', fontWeight: 700,
                          padding: '4px 10px', borderRadius: 20,
                        }}>
                          {isPendiente ? 'Pendiente' : sol.status === 'despachada' ? 'Despachada ✓' : 'Recibida ✓'}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                        <div>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase' }}>Cafetería</p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, margin: 0, fontWeight: 600 }}>{sol.empresa}</p>
                        </div>
                        <div>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase' }}>Contacto</p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, margin: 0 }}>{sol.nombreContacto}</p>
                        </div>
                        {sol.email && (
                          <div>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase' }}>Email</p>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: 0 }}>{sol.email}</p>
                          </div>
                        )}
                        {sol.telefono && (
                          <div>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase' }}>Teléfono</p>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: 0 }}>{sol.telefono}</p>
                          </div>
                        )}
                      </div>

                      {isPendiente && (
                        <div style={{ background: '#fffbf5', border: `1px solid ${C.tan}40`, borderRadius: 8, padding: 12, marginBottom: 12 }}>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, margin: '0 0 4px', fontWeight: 600 }}>
                            Envía 200g de tu café verde a:
                          </p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: 0, lineHeight: 1.7 }}>
                            Jr. Ucayali 142, Lima Centro · A nombre de: <strong>Tunay Wasi</strong><br />
                            Por Shalom o Olva. Confirma aquí cuando lo hayas enviado.
                          </p>
                        </div>
                      )}

                      {isPendiente && (
                        <button
                          onClick={() => handleConfirmarDespacho(sol.id, sol.loteId)}
                          disabled={isDespachando}
                          style={{
                            background: C.terra, color: 'white', border: 'none', borderRadius: 8,
                            padding: '10px 20px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700,
                            cursor: isDespachando ? 'not-allowed' : 'pointer',
                            opacity: isDespachando ? 0.6 : 1,
                          }}
                        >
                          {isDespachando ? 'Confirmando...' : 'Confirmar despacho →'}
                        </button>
                      )}
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
              Completa los datos de tu lote. Tunay Wasi no compra tu café — somos el sistema que lo hace
              visible al mercado. Envías una muestra de 200g, la coordinamos con un laboratorio certificado para la cata SCA, y publicamos tu lote
              con nombre, historia y puntaje SCA. Cuando un tostador compra, recibes tu ganancia directamente.
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
                  <strong>Jr. Ucayali 142, Lima Centro — A nombre de: Tunay Wasi</strong><br />
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
              Cuando recibamos tu muestra, la coordinamos con el laboratorio para la cata SCA en 3–5 días.
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
        {tab === 'mis_pagos' && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 6 }}>
              Mis pagos
            </h2>
            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, marginBottom: 24, lineHeight: 1.6 }}>
              Aquí aparecen los pagos de tus pedidos entregados. Tunay Wasi transfiere tu monto dentro de las 48h hábiles tras confirmar la entrega.
            </p>

            {/* Pendientes de cobro */}
            {misPedidos.filter(p => p.logisticaStatus === 'entregado' && p.pagoCaficultorStatus === 'pendiente').length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.terra }}>
                    Por cobrar
                  </span>
                  <span style={{ background: C.terra, color: 'white', fontSize: 10, fontFamily: 'Montserrat', fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                    {misPedidos.filter(p => p.logisticaStatus === 'entregado' && p.pagoCaficultorStatus === 'pendiente').length}
                  </span>
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {misPedidos.filter(p => p.logisticaStatus === 'entregado' && p.pagoCaficultorStatus === 'pendiente').map(ped => {
                    const lote = misLotes.find(l => l.id === ped.loteId);
                    return (
                      <div key={ped.id} style={{
                        background: 'white', borderRadius: 12, padding: '16px 20px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${C.terra}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>
                            {ped.id} · {lote?.nombreLote ?? ped.loteId}
                          </p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: '0 0 2px' }}>
                            {ped.sacosSolicitados} saco(s) · {ped.razonSocial}
                          </p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.terra, margin: 0, fontWeight: 600 }}>
                            Entregado — pago en proceso (máx. 48h hábiles)
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 26, fontWeight: 700, color: C.terra, margin: 0 }}>
                            S/ {ped.montoCaficultorPEN.toLocaleString()}
                          </p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: 0 }}>pendiente</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pagos recibidos */}
            {misPedidos.filter(p => p.pagoCaficultorStatus === 'pagado').length > 0 && (
              <div>
                <p style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.tan, marginBottom: 12 }}>
                  Pagos recibidos
                </p>
                <div style={{ display: 'grid', gap: 10 }}>
                  {misPedidos.filter(p => p.pagoCaficultorStatus === 'pagado').map(ped => {
                    const lote = misLotes.find(l => l.id === ped.loteId);
                    return (
                      <div key={ped.id} style={{
                        background: 'white', borderRadius: 12, padding: '16px 20px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${C.sage}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>
                            {ped.id} · {lote?.nombreLote ?? ped.loteId}
                          </p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: '0 0 2px' }}>
                            {ped.sacosSolicitados} saco(s) · {ped.razonSocial}
                          </p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.sage, margin: 0, fontWeight: 600 }}>
                            Pagado ✓{ped.pagoCaficultorAt ? ' · ' + new Date(ped.pagoCaficultorAt).toLocaleDateString('es-PE') : ''}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 26, fontWeight: 700, color: C.sage, margin: 0 }}>
                            S/ {ped.montoCaficultorPEN.toLocaleString()}
                          </p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: 0 }}>recibido</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Estado vacío */}
            {misPedidos.filter(p => p.logisticaStatus === 'entregado' || p.pagoCaficultorStatus === 'pagado').length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.tan }}>
                  Aún no tienes pagos registrados.<br />
                  Aparecerán aquí cuando un pedido sea entregado.
                </p>
              </div>
            )}
          </div>
        )}

        {tab === 'perfil' && (
          <div style={{ background: 'white', borderRadius: 14, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: C.terra, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, fontFamily: 'Cormorant Garamond', color: 'white' }}>
                {caficultor.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 24, color: C.brown, margin: 0 }}>{caficultor.nombre}</h2>
                <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, margin: 0 }}>Finca {caficultor.finca} · {caficultor.region}</p>
                {caficultor.email && <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: '2px 0 0' }}>{caficultor.email}</p>}
                {caficultor.telefono && <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: '2px 0 0' }}>{caficultor.telefono}</p>}
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
