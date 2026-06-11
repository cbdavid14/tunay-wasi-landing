/**
 * MarketplaceLotes.tsx — Catálogo del marketplace B2B
 * Actor: Cafetería / Tostadora de Especialidad
 *
 * Flujo A (con lab propio): solicita muestra → recibe → cata en "Mi laboratorio"
 * Flujo B (sin lab): solicita muestra → recibe → contrata lab desde la plataforma
 */
import { useState, useEffect } from 'react';
import type { LoteDoc, LaboratorioDoc, SolicitudMuestraDoc, PedidoB2BDoc } from '@/shared/types/marketplace';
import {
  fetchMktLotes,
  fetchMktCaficultores,
  fetchMktLaboratorios,
  asignarLaboratorio,
  createMktSolicitudMuestra,
  updateMktLoteStatus,
  fetchMktSolicitudesByTostadora,
  fetchMktPedidosByTostadora,
  updateMktSolicitudStatus,
  updateMktLoteCatacion,
} from '@/features/marketplace/marketplaceService';
import type { PerfilCafeteria } from '@/shared/types/auth';

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
  publicado:          { label: 'Disponible', color: C.sage },
  muestra_solicitada: { label: 'Muestra solicitada', color: '#d6b15a' },
  muestra_enviada:    { label: 'Muestra enviada', color: C.tan },
  en_catacion:        { label: 'En catación', color: '#8a6fc9' },
  aprobado:           { label: 'Listo para comprar', color: C.terra },
  agotado:            { label: 'Agotado', color: '#888' },
};

interface CarritoItem {
  lote: LoteDoc;
  sacos?: number;
  feeLaboratorioPEN?: number;  // fee de catación del lab contratado (Flujo B)
}

interface Props {
  onCheckout: (items: CarritoItem[]) => void;
  tieneLaboratorio?: boolean;
  perfil: PerfilCafeteria;
}

export default function MarketplaceLotes({ onCheckout, tieneLaboratorio = false, perfil }: Props) {
  const [vistaActual, setVistaActual] = useState<'catalogo' | 'gestiones' | 'mi_laboratorio'>('catalogo');
  const [loteEnfocado, setLoteEnfocado] = useState<string | null>(null);
  const [pedidoAbierto, setPedidoAbierto] = useState<string | null>(null);
  const [filtroProceso, setFiltroProceso] = useState('todos');
  const [filtroSCA, setFiltroSCA] = useState(0);
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [sacosSeleccionados, setSacosSeleccionados] = useState<Record<string, number>>({});
  const [todosLotes, setTodosLotes] = useState<LoteDoc[]>([]);
  const [caficultores, setCaficultores] = useState<{ id: string; nombreProductor: string; nombreFinca: string; region: string; fotoUrl: string }[]>([]);
  // Mi laboratorio — formulario de catación
  const [cataLoteId, setCataLoteId] = useState<string | null>(null);
  const [cataForm, setCataForm] = useState({ puntaje: '', acidez: '7', cuerpo: '7', balance: '7', notas: '', datosTueste: '' });
  const [guardandoCata, setGuardandoCata] = useState(false);
  const [cataGuardada, setCataGuardada] = useState<string | null>(null); // loteId confirmado
  const [laboratorios, setLaboratorios] = useState<LaboratorioDoc[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fichaAbierta, setFichaAbierta] = useState<LoteDoc | null>(null);
  const [modalLab, setModalLab] = useState<LoteDoc | null>(null);
  const [labSeleccionado, setLabSeleccionado] = useState<string | null>(null);
  const [asignando, setAsignando] = useState(false);
  const [asignadoOk, setAsignadoOk] = useState<string | null>(null);
  const [lotesSolicitados, setLotesSolicitados] = useState<Set<string>>(new Set());
  const [misSolicitudes, setMisSolicitudes] = useState<SolicitudMuestraDoc[]>([]);
  const [misPedidos, setMisPedidos] = useState<PedidoB2BDoc[]>([]);
  const [confirmandoRecepcion, setConfirmandoRecepcion] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchMktLotes(),
      fetchMktCaficultores(),
      fetchMktLaboratorios(),
      fetchMktSolicitudesByTostadora(perfil.uid),
      fetchMktPedidosByTostadora(perfil.uid),
    ]).then(([lotes, cafs, labs, sols, peds]) => {
      setTodosLotes(lotes);
      setCaficultores(cafs);
      setLaboratorios(labs);
      // Deduplicar: solo una solicitud por lote (la más reciente)
      const solsTyped = sols as SolicitudMuestraDoc[];
      const solsPorLote = new Map<string, SolicitudMuestraDoc>();
      for (const s of solsTyped) {
        const existing = solsPorLote.get(s.loteId);
        if (!existing || s.createdAt > existing.createdAt) solsPorLote.set(s.loteId, s);
      }
      const solsDedup = Array.from(solsPorLote.values());
      setMisSolicitudes(solsDedup);
      setLotesSolicitados(new Set(solsDedup.map(s => s.loteId)));
      setMisPedidos(peds as PedidoB2BDoc[]);
      setCargando(false);
    });
  }, []);

  // Scroll al lote enfocado cuando cambia la vista a catálogo
  useEffect(() => {
    if (vistaActual === 'catalogo' && loteEnfocado) {
      const el = document.getElementById(`lote-card-${loteEnfocado}`);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      }
    }
  }, [vistaActual, loteEnfocado]);

  async function handleAsignarLab() {
    if (!modalLab || !labSeleccionado) return;
    setAsignando(true);
    await asignarLaboratorio(modalLab.id, labSeleccionado);
    setTodosLotes(prev => prev.map(l => l.id === modalLab.id ? { ...l, status: 'en_catacion', laboratorioId: labSeleccionado } : l));
    setAsignando(false);
    setAsignadoOk(modalLab.id);
    setModalLab(null);
    setLabSeleccionado(null);
  }

  const ESTADOS_OCULTOS: LoteStatus[] = ['borrador', 'rechazado', 'agotado'];
  const lotes = todosLotes.filter(l => {
    if (ESTADOS_OCULTOS.includes(l.status)) return false;
    if ((l.sacosDisponibles - l.sacosReservados) <= 0) return false;
    if (filtroProceso !== 'todos' && l.proceso !== filtroProceso) return false;
    const puntaje = l.puntajeOficial ?? l.puntajeReferencial;
    if (puntaje < filtroSCA) return false;
    return true;
  });

  function getCaficultor(id: string) {
    return caficultores.find(c => c.id === id);
  }

  async function agregarMuestra(lote: LoteDoc) {
    // Bloquea si esta empresa ya pidió muestra de este lote (sesión actual o previa)
    if (lotesSolicitados.has(lote.id)) return;
    // Actualiza estado local inmediatamente para prevenir doble-click
    setLotesSolicitados(prev => new Set([...prev, lote.id]));
    setTodosLotes(prev => prev.map(l => l.id === lote.id ? { ...l, status: 'muestra_solicitada' } : l));
    // La muestra es gratuita — no pasa por checkout, se registra directamente
    // Persiste en Firestore
    await createMktSolicitudMuestra({
      loteId: lote.id,
      tostadoraId: perfil.uid,
      nombreContacto: perfil.nombre,
      empresa: perfil.empresa,
      email: perfil.email ?? '',
      telefono: perfil.telefono ?? '',
    });
    await updateMktLoteStatus(lote.id, 'muestra_solicitada');
  }

  function agregarSacos(lote: LoteDoc) {
    const sacos = sacosSeleccionados[lote.id] || 1;
    const lab = lote.laboratorioId ? laboratorios.find(l => l.id === lote.laboratorioId) : undefined;
    const feeLaboratorioPEN = lab ? lab.feeCatacionPEN : undefined;
    setCarrito(prev => {
      const existing = prev.find(i => i.lote.id === lote.id);
      if (existing) return prev.map(i => i.lote.id === lote.id ? { ...i, sacos, feeLaboratorioPEN } : i);
      return [...prev, { lote, sacos, feeLaboratorioPEN }];
    });
    setLoteEnfocado(null);
  }

  async function handleConfirmarRecepcion(sol: SolicitudMuestraDoc) {
    setConfirmandoRecepcion(sol.id);
    await updateMktSolicitudStatus(sol.id, 'recibida');
    setMisSolicitudes(prev => prev.map(s => s.id === sol.id ? { ...s, status: 'recibida' } : s));
    setConfirmandoRecepcion(null);
  }

  const [aprobandoSinCata, setAprobandoSinCata] = useState<string | null>(null);

  async function handleAprobarSinCata(sol: SolicitudMuestraDoc) {
    const lote = todosLotes.find(l => l.id === sol.loteId);
    if (!lote) return;
    setAprobandoSinCata(sol.id);
    const comision = Math.round(lote.precioOrigenPEN * 0.10);
    const precioVenta = lote.precioOrigenPEN + comision + 25;
    await updateMktLoteStatus(sol.loteId, 'aprobado', { precioVentaPEN: precioVenta });
    await updateMktSolicitudStatus(sol.id, 'catada');
    setTodosLotes(prev => prev.map(l => l.id === sol.loteId ? { ...l, status: 'aprobado', precioVentaPEN: precioVenta } : l));
    setMisSolicitudes(prev => prev.map(s => s.id === sol.id ? { ...s, status: 'catada' } : s));
    setAprobandoSinCata(null);
  }

  async function handleRegistrarCata() {
    const lote = todosLotes.find(l => l.id === cataLoteId);
    if (!lote) return;
    setGuardandoCata(true);
    const puntaje = Number(cataForm.puntaje);
    const notasSabor = cataForm.notas.split(',').map(n => n.trim()).filter(Boolean);
    const comision = Math.round(lote.precioOrigenPEN * 0.10);
    const precioVenta = lote.precioOrigenPEN + comision + 35;
    await updateMktLoteCatacion(
      lote.id, perfil.uid, puntaje,
      Number(cataForm.acidez), Number(cataForm.cuerpo), Number(cataForm.balance),
      notasSabor, cataForm.datosTueste, precioVenta,
    );
    // Actualizar estado local
    setTodosLotes(prev => prev.map(l => l.id === lote.id ? {
      ...l, puntajeOficial: puntaje, acidez: Number(cataForm.acidez),
      cuerpo: Number(cataForm.cuerpo), balance: Number(cataForm.balance),
      notasSabor, datosTueste: cataForm.datosTueste,
      precioVentaPEN: precioVenta, status: puntaje >= 82 ? 'aprobado' : 'rechazado',
    } : l));
    // Marcar solicitud de esta cafetería como 'catada' en Firestore y local
    const solCatada = misSolicitudes.find(s => s.loteId === lote.id);
    if (solCatada) {
      await updateMktSolicitudStatus(solCatada.id, 'catada');
      setMisSolicitudes(prev => prev.map(s => s.loteId === lote.id ? { ...s, status: 'catada' } : s));
    }
    setGuardandoCata(false);
    setCataGuardada(lote.id);
  }

  const totalCarrito = carrito.reduce((sum, item) => {
    const precio = item.lote.precioVentaPEN ?? 0;
    return sum + precio * (item.sacos ?? 1);
  }, 0);

  return (
    <div style={{ background: '#f7f3ee', minHeight: '100vh' }}>

      {/* Barra sticky del carrito — visible al agregar sacos */}
      {carrito.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
          background: C.green, borderTop: `2px solid ${C.terra}`,
          padding: '14px 24px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>
              Tu pedido
            </p>
            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.cream, margin: 0 }}>
              {carrito.map(i => {
                const n = i.sacos ?? 1;
                return n + ' saco' + (n !== 1 ? 's' : '') + ' de ' + i.lote.nombreLote.slice(0, 25);
              }).join(' · ')}
            </p>
          </div>
          <button
            onClick={() => onCheckout(carrito)}
            style={{
              background: C.terra, color: 'white', border: 'none', borderRadius: 8,
              padding: '12px 24px', fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            Confirmar pedido — S/ {totalCarrito.toLocaleString()} →
          </button>
        </div>
      )}
      {cargando && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.tan }}>Cargando lotes...</p>
        </div>
      )}
      {!cargando && (<>

      {/* Nav Catálogo / Mis gestiones / Mi laboratorio */}
      <div style={{ background: 'white', borderBottom: '1px solid #e8e2da', padding: '0 40px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: 0 }}>
          {/* Tabs fijos */}
          {(['catalogo', 'gestiones'] as const).map(tab => {
            const pendientesGestion = misSolicitudes.filter(s => s.status === 'pendiente').length + misPedidos.filter(p => p.pagoStatus === 'pendiente').length;
            const label = tab === 'catalogo' ? 'Catálogo' : 'Mis gestiones';
            const badge = tab === 'gestiones' && pendientesGestion > 0 ? pendientesGestion : null;
            return (
              <button
                key={tab}
                onClick={() => setVistaActual(tab)}
                style={{
                  background: 'none', border: 'none', borderBottom: `3px solid ${vistaActual === tab ? C.terra : 'transparent'}`,
                  padding: '16px 20px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700,
                  color: vistaActual === tab ? C.terra : C.tan, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8, transition: 'color 0.15s',
                }}
              >
                {label}
                {badge && (
                  <span style={{
                    background: C.terra, color: 'white', fontSize: 10, fontFamily: 'Montserrat',
                    fontWeight: 700, padding: '1px 7px', borderRadius: 20,
                  }}>{badge}</span>
                )}
              </button>
            );
          })}
          {/* Tab "Mi laboratorio" — solo visible si tieneLaboratorio */}
          {tieneLaboratorio && (() => {
            const pendientesCata = misSolicitudes.filter(s => s.status === 'recibida' && !todosLotes.find(l => l.id === s.loteId)?.puntajeOficial).length;
            return (
              <button
                onClick={() => setVistaActual('mi_laboratorio')}
                style={{
                  background: 'none', border: 'none', borderBottom: `3px solid ${vistaActual === 'mi_laboratorio' ? C.sage : 'transparent'}`,
                  padding: '16px 20px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700,
                  color: vistaActual === 'mi_laboratorio' ? C.sage : C.tan, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8, transition: 'color 0.15s',
                }}
              >
                Mi laboratorio
                {pendientesCata > 0 && (
                  <span style={{ background: C.sage, color: 'white', fontSize: 10, fontFamily: 'Montserrat', fontWeight: 700, padding: '1px 7px', borderRadius: 20 }}>
                    {pendientesCata}
                  </span>
                )}
              </button>
            );
          })()}
        </div>
      </div>

      {/* Vista: Mis gestiones */}
      {vistaActual === 'gestiones' && (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 40px', paddingBottom: carrito.length > 0 ? 100 : 32 }}>
          <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, margin: '0 0 6px' }}>
            Mis gestiones
          </h2>
          <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, marginBottom: 32 }}>
            Pipeline de muestras y pedidos de tu empresa.
          </p>

          {/* Solicitudes de muestra */}
          <div style={{ marginBottom: 40 }}>
            <h3 style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.brown, marginBottom: 16 }}>
              Solicitudes de muestra ({misSolicitudes.length})
            </h3>
            {misSolicitudes.length === 0 && (
              <div style={{ background: 'white', borderRadius: 12, padding: 24, textAlign: 'center' }}>
                <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan }}>
                  Aún no has solicitado muestras. Explora el catálogo y solicita tu primera muestra.
                </p>
                <button onClick={() => setVistaActual('catalogo')} style={{
                  marginTop: 12, background: C.terra, color: 'white', border: 'none', borderRadius: 8,
                  padding: '10px 20px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>
                  Ver catálogo →
                </button>
              </div>
            )}
            {misSolicitudes.map(sol => {
              const lote = todosLotes.find(l => l.id === sol.loteId);
              // Pasos desde la perspectiva de la cafetería: solicité → la enviaron → ya la cataron
              const SOL_PASOS = ['solicitada', 'enviada', 'recibida', 'catada'] as const;
              const solEnviada = ['despachada', 'recibida', 'catada'].includes(sol.status);
              const solRecibida = ['recibida', 'catada'].includes(sol.status);
              const loteCatado = lote?.puntajeOficial != null;
              const pasoActual = loteCatado ? 3 : solRecibida ? 2 : solEnviada ? 1 : 0;
              const SOL_PASO_LABEL = ['Solicitada', 'Enviada', 'Recibida', 'Catada'];
              return (
                <div key={sol.id} style={{
                  background: 'white', borderRadius: 12, padding: '20px 24px', marginBottom: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>
                        {sol.loteId}
                      </p>
                      <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 18, fontWeight: 700, color: C.brown, margin: '0 0 4px' }}>
                        {lote?.nombreLote ?? sol.loteId}
                      </p>
                      <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: 0 }}>
                        Solicitado: {new Date(sol.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  {/* Stepper */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0, flex: '2 1 300px' }}>
                    {SOL_PASOS.map((paso, idx) => {
                      const activo = idx === pasoActual;
                      const completado = idx < pasoActual;
                      return (
                        <div key={paso} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: completado ? C.sage : activo ? C.terra : '#eee',
                              color: completado || activo ? 'white' : C.tan,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700,
                            }}>
                              {completado ? '✓' : idx + 1}
                            </div>
                            <span style={{ fontFamily: 'Montserrat', fontSize: 10, color: activo ? C.terra : completado ? C.sage : C.tan, textAlign: 'center', whiteSpace: 'nowrap' }}>
                              {SOL_PASO_LABEL[idx]}
                            </span>
                          </div>
                          {idx < SOL_PASOS.length - 1 && (
                            <div style={{ flex: 1, height: 2, background: idx < pasoActual ? C.sage : '#eee', margin: '0 4px', marginBottom: 18 }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Acción siguiente */}
                  <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center' }}>
                    {/* Paso 2 → 3: cafetería confirma que recibió la muestra */}
                    {sol.status === 'despachada' && !loteCatado && (
                      <button
                        onClick={() => handleConfirmarRecepcion(sol)}
                        disabled={confirmandoRecepcion === sol.id}
                        style={{
                          background: C.sage, color: 'white', border: 'none', borderRadius: 8,
                          padding: '8px 16px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700,
                          cursor: confirmandoRecepcion === sol.id ? 'not-allowed' : 'pointer',
                          opacity: confirmandoRecepcion === sol.id ? 0.6 : 1,
                        }}
                      >
                        {confirmandoRecepcion === sol.id ? 'Confirmando...' : 'Confirmar recepción →'}
                      </button>
                    )}
                    {/* Paso 3 → 4: cafetería con lab puede catar — muestra instrucción */}
                    {sol.status === 'recibida' && !loteCatado && tieneLaboratorio && (
                      <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, fontStyle: 'italic' }}>
                        Registra la catación en "Mi laboratorio"
                      </span>
                    )}
                    {/* Paso 3 → 4: cafetería sin lab contrata laboratorio o aprueba directo */}
                    {sol.status === 'recibida' && !loteCatado && !tieneLaboratorio && lote && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => { setModalLab(lote); setLabSeleccionado(null); }} style={{
                          background: C.terra, color: 'white', border: 'none', borderRadius: 8,
                          padding: '8px 16px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        }}>
                          Contratar laboratorio →
                        </button>
                        <button
                          onClick={() => handleAprobarSinCata(sol)}
                          disabled={aprobandoSinCata === sol.id}
                          style={{
                            background: 'white', color: C.sage, border: `1px solid ${C.sage}`,
                            borderRadius: 8, padding: '8px 16px', fontFamily: 'Montserrat',
                            fontSize: 12, fontWeight: 700,
                            cursor: aprobandoSinCata === sol.id ? 'not-allowed' : 'pointer',
                            opacity: aprobandoSinCata === sol.id ? 0.6 : 1,
                          }}
                        >
                          {aprobandoSinCata === sol.id ? 'Aprobando...' : 'Aprobar y comprar →'}
                        </button>
                      </div>
                    )}
                    {loteCatado && lote && ['aprobado', 'publicado'].includes(lote.status) && (
                      <button onClick={() => { setLoteEnfocado(lote.id); setVistaActual('catalogo'); }} style={{
                        background: C.terra, color: 'white', border: 'none', borderRadius: 8,
                        padding: '8px 16px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      }}>
                        Comprar sacos →
                      </button>
                    )}
                    {loteCatado && lote?.status === 'agotado' && (
                      <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: '#888' }}>Lote agotado</span>
                    )}
                  </div>
                  </div>

                  {/* Resultado de la catación */}
                  {loteCatado && lote && (
                    <div style={{
                      marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0ebe4',
                      display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start',
                    }}>
                      {/* Puntaje */}
                      <div style={{ textAlign: 'center', minWidth: 80 }}>
                        <div style={{ fontFamily: 'Cormorant Garamond', fontSize: 36, fontWeight: 700, color: C.terra, lineHeight: 1 }}>
                          {lote.puntajeOficial!.toFixed(1)}
                        </div>
                        <div style={{ fontFamily: 'Montserrat', fontSize: 9, color: C.tan, textTransform: 'uppercase', letterSpacing: 1 }}>
                          pts SCA oficial
                        </div>
                      </div>
                      {/* Notas de sabor */}
                      <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                          Notas de sabor
                        </p>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {lote.notasSabor.map(nota => (
                            <span key={nota} style={{
                              background: `rgba(143,175,138,0.15)`, color: '#3a6b3a',
                              fontSize: 11, fontFamily: 'Montserrat', padding: '2px 10px', borderRadius: 20,
                            }}>{nota}</span>
                          ))}
                        </div>
                        {lote.datosTueste && (
                          <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, marginTop: 8, marginBottom: 0 }}>
                            Tueste sugerido: <strong style={{ color: C.brown }}>{lote.datosTueste}</strong>
                          </p>
                        )}
                      </div>
                      {/* Perfil sensorial */}
                      {lote.acidez && (
                        <div style={{ minWidth: 160 }}>
                          {[
                            { label: 'Acidez', val: lote.acidez },
                            { label: 'Cuerpo', val: lote.cuerpo ?? 0 },
                            { label: 'Balance', val: lote.balance ?? 0 },
                          ].map(({ label, val }) => (
                            <div key={label} style={{ marginBottom: 6 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                <span style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan }}>{label}</span>
                                <span style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.terra, fontWeight: 700 }}>{val}/10</span>
                              </div>
                              <div style={{ background: '#f0ebe4', borderRadius: 3, height: 4 }}>
                                <div style={{ background: C.terra, borderRadius: 3, height: 4, width: `${val * 10}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Precio */}
                      {lote.precioVentaPEN && (
                        <div style={{ textAlign: 'right', minWidth: 100 }}>
                          <div style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, fontWeight: 700, color: C.brown, lineHeight: 1 }}>
                            S/ {lote.precioVentaPEN.toLocaleString()}
                          </div>
                          <div style={{ fontFamily: 'Montserrat', fontSize: 9, color: C.tan, textTransform: 'uppercase', letterSpacing: 1 }}>
                            por saco 60 kg
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mis pedidos */}
          <div>
            <h3 style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.brown, marginBottom: 16 }}>
              Pedidos B2B ({misPedidos.length})
            </h3>
            {misPedidos.length === 0 && (
              <div style={{ background: 'white', borderRadius: 12, padding: 24, textAlign: 'center' }}>
                <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan }}>
                  Aún no tienes pedidos. Cuando reserves sacos de un lote aprobado aparecerán aquí.
                </p>
              </div>
            )}
            {misPedidos.map(ped => {
              const expiraEn = new Date(ped.reservaExpiraAt).getTime() - Date.now();
              const horasRestantes = Math.max(0, Math.floor(expiraEn / 3600000));
              const minutosRestantes = Math.max(0, Math.floor((expiraEn % 3600000) / 60000));
              const vencida = expiraEn <= 0 && ped.pagoStatus === 'pendiente';
              const abierto = pedidoAbierto === ped.id;
              const lote = todosLotes.find(l => l.id === ped.loteId);

              const LOGISTICA_PASOS: { key: string; label: string }[] = [
                { key: 'pendiente_pago', label: 'Reservado' },
                { key: 'en_origen', label: 'Preparando' },
                { key: 'en_transito', label: 'En tránsito' },
                { key: 'entregado', label: 'Entregado' },
              ];
              const pasoLogistica = LOGISTICA_PASOS.findIndex(p => p.key === ped.logisticaStatus);

              return (
                <div key={ped.id} style={{
                  background: 'white', borderRadius: 12, marginBottom: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  border: `1.5px solid ${vencida ? '#e55' : ped.pagoStatus === 'verificado' ? C.sage : abierto ? C.terra : '#eee'}`,
                  overflow: 'hidden',
                }}>
                  {/* Cabecera — clickeable */}
                  <div
                    onClick={() => setPedidoAbierto(abierto ? null : ped.id)}
                    style={{ padding: '18px 24px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}
                  >
                    <div>
                      <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>
                        {ped.id}
                      </p>
                      <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 18, fontWeight: 700, color: C.brown, margin: '0 0 2px' }}>
                        {ped.sacosSolicitados} saco{ped.sacosSolicitados !== 1 ? 's' : ''} · {lote?.nombreLote ?? ped.loteId}
                      </p>
                      <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: 0 }}>
                        {new Date(ped.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })} · S/ {ped.totalPEN.toLocaleString()}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{
                        background: ped.pagoStatus === 'verificado' ? `${C.sage}20` : vencida ? '#ffe5e5' : `${C.terra}15`,
                        color: ped.pagoStatus === 'verificado' ? '#3a6b3a' : vencida ? '#c0392b' : C.terra,
                        fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700,
                        padding: '4px 12px', borderRadius: 20,
                      }}>
                        {ped.pagoStatus === 'verificado'
                          ? ped.logisticaStatus === 'entregado' ? '✓ Entregado' : '✓ Pago confirmado'
                          : vencida ? 'Reserva vencida' : `Vence en ${horasRestantes}h ${minutosRestantes}m`}
                      </span>
                      <span style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.tan }}>{abierto ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Detalle expandido */}
                  {abierto && (
                    <div style={{ borderTop: '1px solid #f0ebe4', padding: '20px 24px' }}>

                      {/* Stepper logístico */}
                      <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
                        Estado del pedido
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
                        {LOGISTICA_PASOS.map((paso, idx) => {
                          const completado = idx < pasoLogistica;
                          const activo = idx === pasoLogistica;
                          return (
                            <div key={paso.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                <div style={{
                                  width: 30, height: 30, borderRadius: '50%',
                                  background: completado ? C.sage : activo ? C.terra : '#eee',
                                  color: completado || activo ? 'white' : C.tan,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700,
                                }}>
                                  {completado ? '✓' : idx + 1}
                                </div>
                                <span style={{
                                  fontFamily: 'Montserrat', fontSize: 9, textAlign: 'center',
                                  color: activo ? C.terra : completado ? C.sage : C.tan,
                                  whiteSpace: 'nowrap',
                                }}>
                                  {paso.label}
                                </span>
                              </div>
                              {idx < LOGISTICA_PASOS.length - 1 && (
                                <div style={{ flex: 1, height: 2, background: idx < pasoLogistica ? C.sage : '#eee', margin: '0 3px', marginBottom: 18 }} />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Tracking — visible cuando está en tránsito */}
                      {ped.logisticaStatus === 'en_transito' && (ped.empresaTransporte || ped.numeroGuia) && (
                        <div style={{ background: '#fffbf5', border: `1px solid ${C.tan}30`, borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 24 }}>
                          {ped.empresaTransporte && (
                            <div>
                              <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>Transportista</p>
                              <p style={{ fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, color: C.brown, margin: 0 }}>{ped.empresaTransporte}</p>
                            </div>
                          )}
                          {ped.numeroGuia && (
                            <div>
                              <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>Número de guía</p>
                              <p style={{ fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, color: C.brown, margin: 0 }}>{ped.numeroGuia}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Datos del pedido */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                        <div>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Lote</p>
                          {[
                            ['Nombre', lote?.nombreLote ?? ped.loteId],
                            ['Variedad', lote?.variedad ?? '—'],
                            ['Región', lote?.region ?? '—'],
                            ['Sacos', `${ped.sacosSolicitados} × 60 kg = ${ped.kgTotal} kg`],
                          ].map(([k, v]) => (
                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f7f3ee', padding: '5px 0' }}>
                              <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan }}>{k}</span>
                              <span style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 600, color: C.brown }}>{v}</span>
                            </div>
                          ))}
                        </div>
                        <div>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Facturación</p>
                          {[
                            ['Razón social', ped.razonSocial],
                            ['RUC', ped.ruc],
                            ['Contacto', ped.contacto],
                            ['Entrega', ped.direccionEntrega],
                          ].map(([k, v]) => (
                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f7f3ee', padding: '5px 0', gap: 8 }}>
                              <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, whiteSpace: 'nowrap' }}>{k}</span>
                              <span style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 600, color: C.brown, textAlign: 'right' }}>{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Desglose de precios */}
                      <div style={{ background: '#f7f3ee', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Desglose</p>
                        {[
                          ['Subtotal', `S/ ${ped.subtotalPEN.toLocaleString()}`],
                          ['IGV (18%)', `S/ ${ped.igvPEN.toLocaleString()}`],
                          ['Flete', `S/ ${ped.fletePEN.toLocaleString()}`],
                          ...(ped.feeLaboratorioPEN ? [['Catación (lab)', `S/ ${ped.feeLaboratorioPEN.toLocaleString()}`]] : []),
                        ].map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan }}>{k}</span>
                            <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown }}>{v}</span>
                          </div>
                        ))}
                        <div style={{ borderTop: '1px solid #ddd', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, color: C.brown }}>Total</span>
                          <span style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, fontWeight: 700, color: C.terra }}>S/ {ped.totalPEN.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Aviso pago pendiente */}
                      {ped.pagoStatus === 'pendiente' && !vencida && (
                        <div style={{ padding: '12px 16px', background: '#fffbf0', borderRadius: 8, border: '1px solid #f5e6c0' }}>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: '#8a6000', margin: '0 0 4px', fontWeight: 700 }}>
                            Pago pendiente — reserva vence en {horasRestantes}h {minutosRestantes}m
                          </p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: '#8a6000', margin: 0 }}>
                            Transfiere S/ {ped.totalPEN.toLocaleString()} e indica el número de pedido <strong>{ped.id}</strong>. Una vez verificado, el pedido entra en preparación.
                          </p>
                        </div>
                      )}
                      {ped.pagoStatus === 'verificado' && ped.fechaEntregaEstimada && (
                        <div style={{ padding: '12px 16px', background: `${C.sage}15`, borderRadius: 8, border: `1px solid ${C.sage}40` }}>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: '#3a6b3a', margin: 0 }}>
                            Entrega estimada: <strong>{new Date(ped.fechaEntregaEstimada).toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long' })}</strong>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vista: Mi laboratorio — solo cafetería con lab propio */}
      {vistaActual === 'mi_laboratorio' && tieneLaboratorio && (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 40px', paddingBottom: carrito.length > 0 ? 100 : 32 }}>
          <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, margin: '0 0 6px' }}>
            Mi laboratorio
          </h2>
          <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, marginBottom: 32 }}>
            Muestras recibidas pendientes de catación. Registra el puntaje SCA para aprobar el lote y poder comprar sacos.
          </p>

          {/* Muestras pendientes de catar */}
          {(() => {
            const pendientes = misSolicitudes.filter(s =>
              s.status === 'recibida' && !todosLotes.find(l => l.id === s.loteId)?.puntajeOficial
            );

            if (pendientes.length === 0 && !cataGuardada) {
              return (
                <div style={{ background: 'white', borderRadius: 12, padding: 32, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, marginBottom: 16 }}>
                    No hay muestras pendientes de catación.
                  </p>
                  <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan }}>
                    Cuando confirmes la recepción de una muestra en "Mis gestiones", aparecerá aquí para catar.
                  </p>
                </div>
              );
            }

            // Confirmación post-catación
            if (cataGuardada) {
              const lote = todosLotes.find(l => l.id === cataGuardada);
              const aprobado = (lote?.puntajeOficial ?? 0) >= 82;
              return (
                <div style={{ background: 'white', borderRadius: 16, padding: 48, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
                  <div style={{ fontSize: 52, marginBottom: 16 }}>{aprobado ? '✓' : '✗'}</div>
                  <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: aprobado ? C.sage : C.terra, marginBottom: 8 }}>
                    {aprobado ? 'Lote aprobado' : 'Lote rechazado'}
                  </h3>
                  <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.tan, lineHeight: 1.7, maxWidth: 420, margin: '0 auto 24px' }}>
                    {aprobado
                      ? <>El lote <strong style={{ color: C.brown }}>{lote?.nombreLote}</strong> fue aprobado con <strong>{cataGuardada?.puntaje} pts</strong> y ya está disponible en el catálogo para las cafeterías.<br />El caficultor recibirá la notificación por WhatsApp.</>

                      : <>El lote no alcanzó los 82 pts mínimos. El equipo de Tunay Wasi ha sido notificado.</>
                    }
                  </p>
                  {aprobado && (
                    <button
                      onClick={() => { setCataGuardada(null); setLoteEnfocado(cataGuardada); setVistaActual('gestiones'); }}
                      style={{ background: C.terra, color: 'white', border: 'none', borderRadius: 8, padding: '12px 28px', fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Ver en Mis gestiones →
                    </button>
                  )}
                  {!aprobado && (
                    <button
                      onClick={() => setCataGuardada(null)}
                      style={{ background: C.tan, color: 'white', border: 'none', borderRadius: 8, padding: '12px 28px', fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Volver
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div style={{ display: 'grid', gap: 16 }}>
                {pendientes.map(sol => {
                  const lote = todosLotes.find(l => l.id === sol.loteId);
                  const estaSeleccionado = cataLoteId === sol.loteId;
                  const puntajeNum = Number(cataForm.puntaje);
                  const aprobado = puntajeNum >= 82;
                  return (
                    <div key={sol.id} style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                      {/* Header del lote */}
                      <div
                        onClick={() => { setCataLoteId(estaSeleccionado ? null : sol.loteId); setCataForm({ puntaje: '', acidez: '7', cuerpo: '7', balance: '7', notas: '', datosTueste: '' }); }}
                        style={{ background: C.green, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      >
                        <div>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 9, color: C.sage, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>{sol.loteId}</p>
                          <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, color: C.cream, margin: 0, fontWeight: 700 }}>
                            {lote?.nombreLote ?? sol.loteId}
                          </p>
                          {lote && (
                            <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: '2px 0 0' }}>
                              {lote.variedad} · {lote.proceso} · {lote.altitud} · {lote.region}
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ background: `${C.sage}30`, color: C.sage, fontSize: 11, fontFamily: 'Montserrat', fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>
                            Muestra recibida — pendiente de catar
                          </span>
                          <span style={{ color: C.tan, fontSize: 16 }}>{estaSeleccionado ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {/* Formulario de catación */}
                      {estaSeleccionado && (
                        <div style={{ padding: '24px 28px' }}>
                          <h4 style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: C.brown, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 20px' }}>
                            Registrar catación SCA
                          </h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 16 }}>
                            {/* Puntaje SCA */}
                            <div style={{ gridColumn: '1 / -1' }}>
                              <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Puntaje SCA total *</label>
                              <input
                                type="number" min="0" max="100" step="0.25"
                                value={cataForm.puntaje}
                                onChange={e => setCataForm(f => ({ ...f, puntaje: e.target.value }))}
                                placeholder="84.25"
                                style={{ width: '100%', padding: '10px 12px', border: `2px solid ${cataForm.puntaje ? (aprobado ? C.sage : C.terra) : '#ddd'}`, borderRadius: 8, fontFamily: 'Montserrat', fontSize: 14, color: C.brown, boxSizing: 'border-box' as const }}
                              />
                              {cataForm.puntaje && (
                                <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: aprobado ? C.sage : C.terra, marginTop: 4, fontWeight: 700 }}>
                                  {aprobado ? `✓ ${puntajeNum} pts — Lote aprobado` : `✗ ${puntajeNum} pts — Menor a 82 pts mínimos`}
                                </p>
                              )}
                            </div>
                            {/* Perfil sensorial */}
                            {[
                              { key: 'acidez', label: 'Acidez (1-10)' },
                              { key: 'cuerpo', label: 'Cuerpo (1-10)' },
                              { key: 'balance', label: 'Balance (1-10)' },
                            ].map(({ key, label }) => (
                              <div key={key}>
                                <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>{label}</label>
                                <input
                                  type="range" min="1" max="10" step="1"
                                  value={cataForm[key as keyof typeof cataForm]}
                                  onChange={e => setCataForm(f => ({ ...f, [key]: e.target.value }))}
                                  style={{ width: '100%' }}
                                />
                                <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.terra, textAlign: 'center', margin: '2px 0 0', fontWeight: 700 }}>
                                  {cataForm[key as keyof typeof cataForm]}/10
                                </p>
                              </div>
                            ))}
                          </div>
                          {/* Notas de sabor */}
                          <div style={{ marginBottom: 16 }}>
                            <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Notas de sabor * <span style={{ fontWeight: 400 }}>(separadas por coma)</span></label>
                            <input
                              value={cataForm.notas}
                              onChange={e => setCataForm(f => ({ ...f, notas: e.target.value }))}
                              placeholder="chocolate, frutas rojas, caramelo"
                              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 13, color: C.brown, boxSizing: 'border-box' as const }}
                            />
                          </div>
                          {/* Perfil de tueste */}
                          <div style={{ marginBottom: 24 }}>
                            <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Perfil de tueste sugerido *</label>
                            <select
                              value={cataForm.datosTueste}
                              onChange={e => setCataForm(f => ({ ...f, datosTueste: e.target.value }))}
                              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 13, color: C.brown, background: 'white' }}
                            >
                              <option value="">Seleccionar...</option>
                              <option value="Claro">Claro</option>
                              <option value="Medio claro">Medio claro</option>
                              <option value="Medio">Medio</option>
                              <option value="Medio oscuro">Medio oscuro</option>
                              <option value="Oscuro">Oscuro</option>
                              <option value="Espresso">Espresso</option>
                            </select>
                          </div>
                          <button
                            onClick={handleRegistrarCata}
                            disabled={!cataForm.puntaje || !cataForm.notas || !cataForm.datosTueste || guardandoCata}
                            style={{
                              background: (!cataForm.puntaje || !cataForm.notas || !cataForm.datosTueste) ? '#ccc' : aprobado ? C.sage : C.terra,
                              color: 'white', border: 'none', borderRadius: 8,
                              padding: '12px 28px', fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700,
                              cursor: (!cataForm.puntaje || !cataForm.notas || !cataForm.datosTueste || guardandoCata) ? 'not-allowed' : 'pointer',
                              opacity: guardandoCata ? 0.6 : 1,
                            }}
                          >
                            {guardandoCata ? 'Guardando...' : aprobado ? 'Registrar catación y aprobar lote →' : 'Registrar rechazo'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Vista: Catálogo */}
      {vistaActual === 'catalogo' && (<>

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
            Café verde en grano. Sacos de 60 kg. Puntaje SCA verificado por laboratorio certificado.
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
            </div>

            <div style={{ display: 'grid', gap: 20 }}>
              {lotes.map(lote => {
                const caficultor = getCaficultor(lote.caficultorId);
                const puntaje = lote.puntajeOficial ?? lote.puntajeReferencial;
                const disponibles = lote.sacosDisponibles - lote.sacosReservados;
                const badge = STATUS_BADGE[lote.status] ?? STATUS_BADGE.publicado;
                const enfocado = loteEnfocado === lote.id;
                return (
                  <div id={`lote-card-${lote.id}`} key={lote.id} style={{
                    background: 'white',
                    borderRadius: 14,
                    overflow: 'hidden',
                    boxShadow: enfocado ? `0 0 0 3px ${C.terra}, 0 4px 24px rgba(201,110,75,0.2)` : lote.destacado ? `0 4px 24px rgba(201,110,75,0.15), 0 1px 4px rgba(0,0,0,0.06)` : '0 2px 12px rgba(0,0,0,0.06)',
                    border: enfocado ? `2px solid ${C.terra}` : lote.destacado ? `1.5px solid ${C.terra}` : '1.5px solid transparent',
                    display: 'grid',
                    gridTemplateColumns: '200px 1fr',
                    transition: 'box-shadow 0.3s',
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
                      {lote.status !== 'aprobado' && lote.status !== 'publicado' && (
                        <div style={{
                          position: 'absolute', bottom: 10, left: 10,
                          background: badge.color, color: 'white',
                          fontSize: 9, fontFamily: 'Montserrat', fontWeight: 700,
                          padding: '3px 8px', borderRadius: 20,
                        }}>{badge.label}</div>
                      )}
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
                          <img src={caficultor.fotoUrl} alt={caficultor.nombreProductor}
                            style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                          <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan }}>
                            {caficultor.nombreProductor} · {caficultor.nombreFinca}
                          </span>
                        </div>
                      )}

                      {/* Acciones */}
                      {lote.status === 'publicado' && (
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                          {(() => {
                            const yaSolicitada = lotesSolicitados.has(lote.id);
                            return (
                              <button
                                onClick={() => agregarMuestra(lote)}
                                disabled={yaSolicitada}
                                style={{
                                  background: yaSolicitada ? C.sage : C.terra,
                                  color: 'white', border: 'none', borderRadius: 8, padding: '10px 18px',
                                  fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700,
                                  cursor: yaSolicitada ? 'default' : 'pointer',
                                  opacity: yaSolicitada ? 0.8 : 1,
                                }}
                              >
                                {yaSolicitada ? '✓ Muestra ya solicitada' : 'Solicitar muestra (200g) →'}
                              </button>
                            );
                          })()}
                          <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan }}>
                            S/{lote.precioMuestraPEN} · {disponibles} saco{disponibles !== 1 ? 's' : ''} disponible{disponibles !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}

                      {lote.status !== 'publicado' && (
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                          {lote.status === 'muestra_enviada' && !tieneLaboratorio && (
                            <button onClick={() => { setModalLab(lote); setLabSeleccionado(null); }} style={{
                              background: C.terra, color: 'white', border: 'none', borderRadius: 8,
                              padding: '8px 16px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700,
                              cursor: 'pointer',
                            }}>
                              Contratar laboratorio →
                            </button>
                          )}
                          {lote.status === 'muestra_enviada' && tieneLaboratorio && (
                            <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan }}>
                              Muestra en camino — cátala en "Mi laboratorio"
                            </span>
                          )}
                          {lote.status === 'en_catacion' && asignadoOk === lote.id && (
                            <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: '#8a6fc9', fontWeight: 600 }}>
                              ✓ Laboratorio asignado — en catación
                            </span>
                          )}
                          {lote.status === 'en_catacion' && asignadoOk !== lote.id && (
                            <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: '#8a6fc9' }}>
                              En catación por laboratorio...
                            </span>
                          )}
                          {lote.status === 'aprobado' && (
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                  type="number" min={1} max={disponibles}
                                  value={sacosSeleccionados[lote.id] ?? 1}
                                  onChange={e => setSacosSeleccionados(prev => ({ ...prev, [lote.id]: Number(e.target.value) }))}
                                  style={{
                                    width: 60, padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8,
                                    fontFamily: 'Montserrat', fontSize: 13, textAlign: 'center',
                                  }}
                                />
                                <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan }}>
                                  saco{(sacosSeleccionados[lote.id] ?? 1) !== 1 ? 's' : ''} × S/{lote.precioVentaPEN?.toLocaleString()}
                                </span>
                              </div>
                              <button
                                onClick={() => agregarSacos(lote)}
                                style={{
                                  background: C.terra, color: 'white', border: 'none', borderRadius: 8,
                                  padding: '10px 18px', fontFamily: 'Montserrat', fontSize: 13,
                                  fontWeight: 700, cursor: 'pointer',
                                }}
                              >
                                Reservar sacos →
                              </button>
                              <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan }}>
                                {disponibles} saco{disponibles !== 1 ? 's' : ''} disponible{disponibles !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                          {lote.status === 'agotado' && (
                            <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: '#888' }}>
                              Agotado
                            </span>
                          )}
                          {!['muestra_enviada', 'en_catacion', 'aprobado', 'agotado'].includes(lote.status) && (
                            <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan }}>
                              En proceso...
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
      </>)}

      {/* Modal contratar laboratorio — Flujo B */}
      {modalLab && (
        <div onClick={() => setModalLab(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'white', borderRadius: 16, padding: 32, maxWidth: 540, width: '100%',
            maxHeight: '85vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 24, color: C.brown, margin: 0 }}>
                Contratar laboratorio
              </h2>
              <button onClick={() => setModalLab(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.tan }}>✕</button>
            </div>
            <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, marginBottom: 24, lineHeight: 1.6 }}>
              Selecciona el laboratorio que realizará la <strong>catación SCA</strong> de <strong>{modalLab.nombreLote}</strong>.
              Recibirás el puntaje, atributos y perfil de tueste sugerido.<br />
              <span style={{ fontSize: 11 }}>El tueste de los sacos lo coordinás directamente con el laboratorio.</span>
            </p>

            <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
              {laboratorios.filter(l => l.status === 'activo').map(lab => {
                const feeTotal = lab.feeCatacionPEN;
                const seleccionado = labSeleccionado === lab.id;
                return (
                  <div
                    key={lab.id}
                    onClick={() => setLabSeleccionado(lab.id)}
                    style={{
                      border: `2px solid ${seleccionado ? C.terra : '#eee'}`,
                      borderRadius: 10, padding: '16px 18px', cursor: 'pointer',
                      background: seleccionado ? `${C.terra}0d` : 'white',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, color: C.brown, margin: '0 0 2px' }}>
                          {lab.nombreComercial}
                        </p>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: '0 0 6px' }}>
                          {lab.certificaciones.join(' · ')}
                        </p>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: 0 }}>
                          {lab.direccion}
                        </p>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <span style={{ background: '#f0ebe4', color: C.brown, fontSize: 10, fontFamily: 'Montserrat', padding: '2px 8px', borderRadius: 20 }}>
                            Catación SCA S/ {lab.feeCatacionPEN}
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: 90 }}>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 9, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>Fee total</p>
                        <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 26, fontWeight: 700, color: seleccionado ? C.terra : C.brown, margin: 0, lineHeight: 1 }}>
                          S/ {feeTotal}
                        </p>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 9, color: C.tan, margin: '2px 0 0' }}>catación SCA</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {laboratorios.filter(l => l.status === 'activo').length === 0 && (
                <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, textAlign: 'center', padding: '20px 0' }}>
                  No hay laboratorios disponibles en este momento.
                </p>
              )}
            </div>

            <button
              onClick={handleAsignarLab}
              disabled={!labSeleccionado || asignando}
              style={{
                width: '100%', background: labSeleccionado ? C.terra : '#ccc',
                color: 'white', border: 'none', borderRadius: 8,
                padding: 14, fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700,
                cursor: labSeleccionado && !asignando ? 'pointer' : 'not-allowed',
                opacity: !labSeleccionado || asignando ? 0.6 : 1,
              }}
            >
              {asignando ? 'Asignando...' : (() => {
                const lab = laboratorios.find(l => l.id === labSeleccionado);
                if (!lab) return 'Selecciona un laboratorio';
                return `Confirmar — S/ ${lab.feeCatacionPEN} (catación SCA) →`;
              })()}
            </button>
          </div>
        </div>
      )}

      {/* Modal ficha trazabilidad */}
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
    </>)}
    </div>
  );
}
