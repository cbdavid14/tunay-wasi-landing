/**
 * LaboratorioPortal.tsx — Portal del laboratorio certificado
 * Actor: Laboratorio/Tostador con Q-Grader
 *
 * Flujo:
 *   1. Ve los lotes asignados a su cuenta pendientes de catación
 *   2. Registra puntaje SCA + atributos + datos de tueste
 *   3. Los datos quedan en el lote (catado: true) — el estado del lote lo controla el caficultor
 */
import { useState, useEffect, useRef } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '@/shared/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useIsMobile, padX, padY, tabBarStyle, tabBtn } from '@/shared/mobileStyles';
import {
  fetchMktLotesPendientesCatacion,
  fetchMktLotesHistorialLab,
  updateMktLoteCatacion,
  updateMktLoteFields,
  fetchMktSolicitudesByLoteIds,
  updateMktSolicitudStatus,
  fetchMktLotesByLaboratorio,
  fetchMktPedidosByLoteIds,
  updatePerfil,
  uploadCertificadoLab,
  fetchMktSolicitudesCertificacionByLaboratorio,
  aceptarSolicitudCertificacion,
  countSolicitudesActivasByLab,
  updateMktSolicitudCertificacionStatus,
  updatePagoCertificacion,
  fetchMktPedidosByLaboratorio,
  confirmarRecepcionMuestra,
  fetchMktLotesByIds,
} from '@/features/marketplace/marketplaceService';
import { sincronizarLabDoc } from '@/shared/perfilService';
import { COMISION_TW } from '@/shared/config';
import type { LoteDoc, PedidoB2BDoc, SolicitudCertificacionDoc } from '@/shared/types/marketplace';
import type { PerfilLaboratorio } from '@/shared/types/auth';
import NotifBell from '@/shared/NotifBell';
import { useNotificaciones } from '@/shared/useNotificaciones';
import { saveNotif } from '@/shared/notificacionesService';

const C = {
  green: '#1f3028', cream: '#f2e0cc', terra: '#c96e4b',
  sage: '#8faf8a', tan: '#c4b297', brown: '#533b22',
};

type Tab = 'mis_muestras' | 'mis_catas' | 'pagos' | 'perfil';

interface Props {
  laboratorio: PerfilLaboratorio;
  onLogout: () => void;
  modoEmbebido?: boolean;
  tabActivo?: Tab;
}

export default function LaboratorioPortal({ laboratorio, onLogout, modoEmbebido, tabActivo }: Props) {
  const { notifs } = useNotificaciones(laboratorio.uid);
  const [tab, setTab] = useState<Tab>('mis_muestras');
  const [subTabCatas, setSubTabCatas] = useState<'catacion' | 'historial'>('catacion');

  // Sincronizar tab controlado externamente → estado interno
  useEffect(() => {
    if (tabActivo && tabActivo !== tab) setTab(tabActivo);
  }, [tabActivo]);
  const [loteSeleccionado, setLoteSeleccionado] = useState<LoteDoc | null>(null);
  const [pendientes, setPendientes] = useState<LoteDoc[]>([]);
  const [historial, setHistorial] = useState<LoteDoc[]>([]);
  const [pedidosHistorial, setPedidosHistorial] = useState<PedidoB2BDoc[]>([]);
  const [lotesDelLab, setLotesDelLab] = useState<LoteDoc[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [cataGuardada, setCataGuardada] = useState(false);
  const [asistiendo, setAsistiendo] = useState(false);
  const [iaError, setIaError] = useState<string | null>(null);
  const [solicitudesCert, setSolicitudesCert] = useState<SolicitudCertificacionDoc[]>([]);
  const [solicitudesActivasCount, setSolicitudesActivasCount] = useState(0); // RN-LAB-03: max 3
  // loteId de la solicitud de cert que se está completando (para post-guardar)
  const [certCompletandoLoteId, setCertCompletandoLoteId] = useState<string | null>(null);
  const [pedidosLab, setPedidosLab] = useState<PedidoB2BDoc[]>([]);
  const [solicitudesAbiertas, setSolicitudesAbiertas] = useState<SolicitudCertificacionDoc[]>([]);
  const [lotesAbiertas, setLotesAbiertas] = useState<Map<string, LoteDoc>>(new Map());
  const [aceptandoSolicitud, setAceptandoSolicitud] = useState<string | null>(null);
  const [aceptadaYaTomada, setAceptadaYaTomada] = useState<string | null>(null);
  const [confirmandoRecepcion, setConfirmandoRecepcion] = useState<string | null>(null);

  const [cataForm, setCataForm] = useState({
    // Física
    humedad: '', actividadAgua: '', densidad: '',
    defNegros: '0', defPartidos: '0', defConchas: '0', defCascaras: '0',
    // Sensorial (6.00–10.00, paso 0.25)
    fragranciaAroma: '7.00', sabor: '7.00', regusto: '7.00',
    acidez: '7.00', cuerpo: '7.00', balance: '7.00',
    uniformidad: '10', dulzor: '10', tazaLimpia: '10',
    apreciacionGlobal: '7.00',
    // Defectos sensoriales
    defTazasAfectadas: '0', defIntensidad: '2',
    // Notas y tueste
    notas: '', datosTueste: '',
  });

  // Edición de perfil del laboratorio
  const [perfilLabForm, setPerfilLabForm] = useState({
    telefono: laboratorio.telefono ?? '',
    region: laboratorio.region ?? '',
    direccion: laboratorio.direccion ?? '',
    feeCatacionPEN: String(laboratorio.feeCatacionPEN ?? ''),
  });
  const [guardandoPerfilLab, setGuardandoPerfilLab] = useState(false);
  const [perfilLabGuardado, setPerfilLabGuardado] = useState(false);
  const [subiendoCert, setSubiendoCert] = useState(false);
  const [certSubido, setCertSubido] = useState(false);
  const [certUrl, setCertUrl] = useState<string | undefined>(laboratorio.certificadoUrl);
  const [certStatus, setCertStatus] = useState(laboratorio.certificadoStatus);
  const certInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMktLotesPendientesCatacion(laboratorio.uid).then(setPendientes);
    fetchMktLotesHistorialLab(laboratorio.uid).then(setHistorial);
    fetchMktLotesByLaboratorio(laboratorio.uid).then(lotes => {
      setLotesDelLab(lotes);
      const ids = lotes.map(l => l.id);
      fetchMktPedidosByLoteIds(ids).then(peds => {
        setPedidosHistorial(peds.filter(p => p.logisticaStatus === 'entregado' || p.logisticaStatus === 'en_transito' || p.logisticaStatus === 'en_origen'));
      });
    });
    fetchMktSolicitudesCertificacionByLaboratorio(laboratorio.uid).then(setSolicitudesCert);
    // Listener en tiempo real para solicitudes abiertas — desaparecen cuando otro lab acepta
    const unsubAbiertas = onSnapshot(
      query(collection(db, 'mkt_solicitudes_certificacion'), where('status', '==', 'abierta')),
      async (snap) => {
        const sols = snap.docs.map(d => d.data() as SolicitudCertificacionDoc);
        setSolicitudesAbiertas(sols);
        if (sols.length > 0) {
          const loteIds = [...new Set(sols.map(s => s.loteId))];
          const lotes = await fetchMktLotesByIds(loteIds);
          setLotesAbiertas(new Map(lotes.map(l => [l.id, l])));
        } else {
          setLotesAbiertas(new Map());
        }
      }
    );
    return () => unsubAbiertas();
    fetchMktPedidosByLaboratorio(laboratorio.uid).then(setPedidosLab);
    countSolicitudesActivasByLab(laboratorio.uid).then(setSolicitudesActivasCount);
  }, [cataGuardada, notifs.length]);

  async function handleGuardarPerfilLab() {
    setGuardandoPerfilLab(true);
    const updatedPerfil: PerfilLaboratorio = {
      ...laboratorio,
      telefono: perfilLabForm.telefono || undefined,
      region: perfilLabForm.region || undefined,
      direccion: perfilLabForm.direccion || undefined,
      feeCatacionPEN: Number(perfilLabForm.feeCatacionPEN) || laboratorio.feeCatacionPEN,
    };
    await updatePerfil(laboratorio.uid, {
      telefono: perfilLabForm.telefono || null,
      region: perfilLabForm.region || null,
      direccion: perfilLabForm.direccion || null,
      feeCatacionPEN: Number(perfilLabForm.feeCatacionPEN) || laboratorio.feeCatacionPEN,
    });
    await sincronizarLabDoc(updatedPerfil);
    setGuardandoPerfilLab(false);
    setPerfilLabGuardado(true);
    setTimeout(() => setPerfilLabGuardado(false), 3000);
  }

  async function handleSubirCertificado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoCert(true);
    try {
      const url = await uploadCertificadoLab(laboratorio.uid, file);
      setCertUrl(url);
      setCertStatus('pendiente');
      setCertSubido(true);
      setTimeout(() => setCertSubido(false), 4000);
    } finally {
      setSubiendoCert(false);
      if (certInputRef.current) certInputRef.current.value = '';
    }
  }

  async function handleAsistirIA() {
    if (!cataForm.notas.trim()) return;
    setAsistiendo(true);
    setIaError(null);
    try {
      const fn = httpsCallable<{ notasLibres: string; loteInfo?: string }, {
        ok: boolean;
        campos?: { acidez: number; cuerpo: number; balance: number; notasSabor: string[]; perfilTueste: string; puntajeSugerido: number };
        error?: string;
      }>(functions, 'asistenteCatacion');
      const res = await fn({
        notasLibres: cataForm.notas,
        loteInfo: loteSeleccionado
          ? `${loteSeleccionado.nombreLote} — ${loteSeleccionado.variedad} ${loteSeleccionado.proceso} ${loteSeleccionado.altitud}`
          : undefined,
      });
      if (res.data.ok && res.data.campos) {
        const c = res.data.campos;
        setCataForm(f => ({
          ...f,
          acidez: c.acidez ? String(Math.min(10, Math.max(6, c.acidez)).toFixed(2)) : f.acidez,
          cuerpo: c.cuerpo ? String(Math.min(10, Math.max(6, c.cuerpo)).toFixed(2)) : f.cuerpo,
          balance: c.balance ? String(Math.min(10, Math.max(6, c.balance)).toFixed(2)) : f.balance,
          notas: c.notasSabor?.join(', ') ?? f.notas,
          datosTueste: c.perfilTueste ?? f.datosTueste,
        }));
      } else {
        setIaError(res.data.error ?? 'No se pudo analizar. Intenta de nuevo.');
      }
    } catch {
      setIaError('Error al conectar con el asistente IA. Puedes continuar manualmente.');
    } finally {
      setAsistiendo(false);
    }
  }

  async function handleAceptarMuestra(lote: LoteDoc) {
    // Solo asigna el laboratorio — no cambia el estado del lote
    await updateMktLoteFields(lote.id, { laboratorioId: laboratorio.uid });
    setPendientes(prev => prev.map(l => l.id === lote.id ? { ...l, laboratorioId: laboratorio.uid } : l));
  }

  async function handleAceptarSolicitud(sol: SolicitudCertificacionDoc) {
    setAceptandoSolicitud(sol.id);
    setAceptadaYaTomada(null);
    const ok = await aceptarSolicitudCertificacion(sol.id, laboratorio.uid, laboratorio.feeCatacionPEN);
    if (!ok) {
      setAceptadaYaTomada(sol.id);
      setAceptandoSolicitud(null);
      return;
    }
    // Notificar al caficultor
    saveNotif(sol.caficultorId, {
      titulo: '🔬 Lab aceptó tu solicitud de certificación',
      cuerpo: `Un laboratorio certificado aceptó catar tu lote "${sol.nombreLote}". Te avisamos cuando esté listo.`,
      url: 'solicitudes',
    }).catch(() => {});
    // Refrescar listas
    fetchMktLotesPendientesCatacion(laboratorio.uid).then(setPendientes);
    // solicitudesAbiertas se actualiza via onSnapshot — no hace falta refetch manual
    fetchMktSolicitudesCertificacionByLaboratorio(laboratorio.uid).then(setSolicitudesCert);
    countSolicitudesActivasByLab(laboratorio.uid).then(setSolicitudesActivasCount);
    setAceptandoSolicitud(null);
  }

  async function handleConfirmarRecepcion(cert: SolicitudCertificacionDoc) {
    setConfirmandoRecepcion(cert.id);
    await confirmarRecepcionMuestra(cert.id);
    saveNotif(cert.caficultorId, {
      titulo: '✅ El lab recibió tu muestra',
      cuerpo: `El laboratorio confirmó la recepción de la muestra de "${cert.nombreLote}". La catación comenzará pronto.`,
      url: 'solicitudes',
    }).catch(() => {});
    fetchMktSolicitudesCertificacionByLaboratorio(laboratorio.uid).then(setSolicitudesCert);
    setConfirmandoRecepcion(null);
  }

  async function handleRegistrarCata() {
    if (!loteSeleccionado) return;
    setGuardando(true);
    const totalCalidad =
      Number(cataForm.fragranciaAroma) + Number(cataForm.sabor) + Number(cataForm.regusto) +
      Number(cataForm.acidez) + Number(cataForm.cuerpo) + Number(cataForm.balance) +
      Number(cataForm.uniformidad) + Number(cataForm.tazaLimpia) + Number(cataForm.dulzor) +
      Number(cataForm.apreciacionGlobal);
    const totalDefectos = Number(cataForm.defTazasAfectadas) * Number(cataForm.defIntensidad);
    const puntaje = Math.round((totalCalidad - totalDefectos) * 100) / 100;
    const notasSabor = cataForm.notas.split(',').map(n => n.trim()).filter(Boolean);
    const comisionPlataforma = Math.round(loteSeleccionado.precioOrigenPEN * COMISION_TW);
    const precioVenta = loteSeleccionado.precioOrigenPEN + comisionPlataforma;

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
    // Marcar todas las solicitudes de muestra de este lote como recibidas
    const solicitudes = await fetchMktSolicitudesByLoteIds([loteSeleccionado.id]);
    await Promise.all(
      solicitudes
        .filter(s => s.status !== 'recibida')
        .map(s => updateMktSolicitudStatus(s.id, 'recibida'))
    );
    // Si hay solicitud de certificación activa para este lote, completarla
    const certPendiente = solicitudesCert.find(
      c => c.loteId === loteSeleccionado.id && (c.status === 'en_proceso' || c.status === 'aceptada' || c.status === 'muestra_recibida')
    );
    if (certPendiente) {
      await updateMktSolicitudCertificacionStatus(certPendiente.id, 'completada');
      await updatePagoCertificacion(certPendiente.id, { pagoStatus: 'verificado' });
      setCertCompletandoLoteId(loteSeleccionado.id);
    }
    setGuardando(false);
    setCataGuardada(true);
  }

  const isMobile = useIsMobile();
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', border: '1.5px solid #e0d8d0', borderRadius: 10,
    fontFamily: 'Montserrat', fontSize: 14, color: C.brown, background: 'white',
    boxSizing: 'border-box', minHeight: 48,
  };

  // Excluir lotes que ya tienen solicitud de certificación activa — esos se muestran en su propia sección
  const loteIdsConCert = new Set(solicitudesCert.filter(c => c.laboratorioId === laboratorio.uid).map(c => c.loteId));
  const enCatacion = pendientes.filter(l => l.laboratorioId === laboratorio.uid && !l.catado && !loteIdsConCert.has(l.id));
  const muestraRecibida = pendientes.filter(l => !l.laboratorioId);

  // ── Modo embebido — solo contenido del tab, sin header ni nav propio ────────
  if (modoEmbebido) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 24px' }}>

        {/* MUESTRAS PENDIENTES */}
        {tab === 'mis_muestras' && (
          <div style={{ display: 'grid', gap: 14 }}>
            {pendientes.length === 0 && solicitudesAbiertas.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 24px', maxWidth: 480, margin: '0 auto' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>☕</div>
                <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 24, color: C.brown, marginBottom: 8 }}>
                  Sin muestras asignadas aún
                </h3>
                <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, lineHeight: 1.7, marginBottom: 12 }}>
                  Cuando un caficultor publique un lote, el sistema te notificará automáticamente para que lo aceptes.
                  El primer laboratorio en aceptar queda asignado a esa catación.
                </p>
                <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.sage, marginBottom: 0 }}>
                  Tu fee de catación y certificaciones son visibles para los caficultores en el catálogo.
                </p>
              </div>
            )}
            {muestraRecibida.map(lote => (
              <div key={lote.id} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: `1px solid #d6b15a44` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Montserrat', fontSize: 10, color: '#d6b15a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                        Muestra recibida — sin asignar
                      </span>
                    </div>
                    <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, color: C.brown, margin: '4px 0 2px' }}>
                      {lote.nombreLote}
                    </h3>
                    <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown, margin: 0 }}>
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
            {enCatacion.map(lote => {
              const certLote = solicitudesCert.find(c => c.loteId === lote.id && c.laboratorioId === laboratorio.uid);
              const esperandoMuestra = certLote && (certLote.status === 'aceptada' || certLote.status === 'muestra_en_camino');
              return (
              <div key={lote.id} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: `1px solid ${C.sage}44` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.sage, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                        En catación
                      </span>
                    </div>
                    <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, color: C.brown, margin: '4px 0 2px' }}>
                      {lote.nombreLote}
                    </h3>
                    <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown, margin: 0 }}>
                      {lote.variedad} · {lote.proceso} · {lote.altitud}
                    </p>
                  </div>
                  {esperandoMuestra ? (
                    <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: '#8a6fc9', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {certLote!.status === 'muestra_en_camino' ? '✈ Muestra en camino' : '⏳ Esperando muestra'}
                    </span>
                  ) : (
                  <button
                    onClick={() => { setLoteSeleccionado(lote); setTab('mis_catas'); setSubTabCatas('catacion'); setCataGuardada(false); }}
                    style={{
                      background: C.green, color: C.cream, border: 'none', borderRadius: 8,
                      padding: '10px 16px', fontFamily: 'Montserrat', fontSize: 12,
                      fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    Registrar cata →
                  </button>
                  )}
                </div>
              </div>
              );
            })}

            {/* SOLICITUDES DE CERTIFICACIÓN — abiertas (Uber) y asignadas */}
            {(solicitudesAbiertas.length > 0 || solicitudesCert.filter(c => ['aceptada', 'muestra_en_camino', 'muestra_recibida', 'en_proceso'].includes(c.status)).length > 0) && (
              <div style={{ marginTop: 24 }}>
                <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: '#8a6fc9', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>
                  📋 Solicitudes de certificación
                </p>
                {/* Solicitudes abiertas — cualquier lab puede aceptar */}
                {solicitudesAbiertas.map(cert => {
                  const lote = lotesAbiertas.get(cert.loteId);
                  const PROCESO_LABEL: Record<string, string> = { lavado: 'Lavado', natural: 'Natural', honey: 'Honey', anaerobico: 'Anaeróbico', doble_fermentacion: 'D. Fermentación' };
                  return (
                  <div key={cert.id} style={{ background: '#faf6ff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(138,111,201,0.08)', border: '2px solid #8a6fc940', marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontFamily: 'Montserrat', fontSize: 9, color: '#8a6fc9', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Nueva solicitud
                          </span>
                          <span style={{ background: '#8a6fc9', color: 'white', fontFamily: 'Montserrat', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                            Sé el primero en aceptar
                          </span>
                        </div>
                        <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, color: C.brown, margin: '4px 0 6px' }}>
                          {cert.nombreLote}
                        </h3>
                        {/* Datos del lote para que el lab tome la decisión */}
                        {lote && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginBottom: 8 }}>
                            {[
                              ['Variedad', lote.variedad],
                              ['Proceso', PROCESO_LABEL[lote.proceso] ?? lote.proceso],
                              ['Región', lote.region],
                              ['Altitud', lote.altitud],
                              ['Cosecha', lote.cosecha],
                              ['Peso muestra', `${lote.pesoPorSacoKg} kg/saco`],
                              ['Puntaje ref.', `${lote.puntajeReferencial} pts`],
                            ].filter(([, v]) => v && v !== '0 pts').map(([k, v]) => (
                              <span key={k} style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown }}>
                                <strong style={{ color: C.brown }}>{k}:</strong> {v}
                              </span>
                            ))}
                          </div>
                        )}
                        <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: '#8a6fc9', fontWeight: 700, margin: 0 }}>
                          Tu fee: S/ {laboratorio.feeCatacionPEN ?? 90}
                          <span style={{ fontWeight: 400, color: C.brown, marginLeft: 6 }}>(configurado en tu Perfil)</span>
                        </p>
                        {aceptadaYaTomada === cert.id && (
                          <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.terra, margin: '6px 0 0', fontWeight: 700 }}>
                            Ya fue tomado por otro laboratorio.
                          </p>
                        )}
                        {solicitudesActivasCount >= 3 && (
                          <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: '#d6b15a', margin: '6px 0 0', fontWeight: 700 }}>
                            Capacidad máxima alcanzada (3/3 activas).
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleAceptarSolicitud(cert)}
                        disabled={aceptandoSolicitud === cert.id || solicitudesActivasCount >= 3}
                        style={{
                          background: (aceptandoSolicitud === cert.id || solicitudesActivasCount >= 3) ? '#c4b297' : '#8a6fc9',
                          color: 'white', border: 'none', borderRadius: 8,
                          padding: '10px 16px', fontFamily: 'Montserrat', fontSize: 12,
                          fontWeight: 700, cursor: (aceptandoSolicitud === cert.id || solicitudesActivasCount >= 3) ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {aceptandoSolicitud === cert.id ? 'Aceptando...' : solicitudesActivasCount >= 3 ? 'Cap. máxima' : 'Aceptar →'}
                      </button>
                    </div>
                  </div>
                  );
                })}
                {/* Solicitudes ya asignadas a este laboratorio */}
                {solicitudesCert
                  .filter(c => ['aceptada', 'muestra_en_camino', 'muestra_recibida', 'en_proceso'].includes(c.status))
                  .map(cert => (
                    <div key={cert.id} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #8a6fc930', marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                        <div>
                          <span style={{ fontFamily: 'Montserrat', fontSize: 9, color: '#8a6fc9', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Certificación asignada a ti
                          </span>
                          <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, color: C.brown, margin: '4px 0 2px' }}>
                            {cert.nombreLote}
                          </h3>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, margin: 0 }}>
                            Fee: S/ {cert.feeCatacionPEN} ·{' '}
                            <span style={{ color: cert.pagoStatus === 'verificado' ? C.sage : C.terra, fontWeight: 700 }}>
                              {cert.pagoStatus === 'verificado' ? 'Fee verificado ✓' : 'Fee pendiente de pago'}
                            </span>
                          </p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, margin: '2px 0 0' }}>
                            Lote ID: {cert.loteId} · Solicitud: {cert.id}
                          </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                          {cert.status === 'aceptada' && (
                            <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: '#8a6fc9', fontWeight: 700 }}>
                              ⏳ Esperando muestra del caficultor
                            </span>
                          )}
                          {cert.status === 'muestra_en_camino' && (
                            <>
                              <span style={{ fontFamily: 'Montserrat', fontSize: 10, color: '#d6b15a', fontWeight: 700 }}>
                                ✈ {cert.empresaCourierMuestra} · {cert.numeroGuiaMuestra}
                              </span>
                              <button
                                onClick={() => handleConfirmarRecepcion(cert)}
                                disabled={confirmandoRecepcion === cert.id}
                                style={{
                                  background: confirmandoRecepcion === cert.id ? '#c4b297' : C.sage,
                                  color: 'white', border: 'none', borderRadius: 8,
                                  padding: '10px 16px', fontFamily: 'Montserrat', fontSize: 12,
                                  fontWeight: 700, cursor: confirmandoRecepcion === cert.id ? 'default' : 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {confirmandoRecepcion === cert.id ? 'Confirmando...' : 'Confirmar recepción →'}
                              </button>
                            </>
                          )}
                          {(cert.status === 'muestra_recibida' || cert.status === 'en_proceso') && (
                            <button
                              onClick={() => {
                                const lote = pendientes.find(l => l.id === cert.loteId) ?? enCatacion.find(l => l.id === cert.loteId);
                                if (lote) { setLoteSeleccionado(lote); setTab('mis_catas'); setSubTabCatas('catacion'); setCataGuardada(false); }
                              }}
                              style={{
                                background: '#8a6fc9', color: 'white', border: 'none', borderRadius: 8,
                                padding: '10px 16px', fontFamily: 'Montserrat', fontSize: 12,
                                fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                              }}
                            >
                              Registrar cata →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* SUB-TABS MIS CATAS */}
        {tab === 'mis_catas' && (
          <div style={{ borderBottom: '1px solid #eee', display: 'flex', marginBottom: 20 }}>
            {([
              { key: 'catacion' as const, label: 'Catación' },
              { key: 'historial' as const, label: 'Historial' },
            ]).map(st => (
              <button key={st.key} onClick={() => setSubTabCatas(st.key)} style={{
                background: 'none', border: 'none',
                borderBottom: `3px solid ${subTabCatas === st.key ? C.terra : 'transparent'}`,
                padding: '10px 18px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700,
                color: subTabCatas === st.key ? C.terra : C.tan, cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {st.label}
              </button>
            ))}
          </div>
        )}

        {/* REGISTRAR CATACIÓN */}
        {tab === 'mis_catas' && subTabCatas === 'catacion' && !cataGuardada && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 6 }}>
              Registrar catación
            </h2>
            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, marginBottom: 24, lineHeight: 1.6 }}>
              Ingresa los resultados de la catación SCA y el perfil de tueste sugerido.
              Al guardar, si el puntaje supera el umbral SCA el lote se publica automáticamente en el catálogo.
            </p>
            {!loteSeleccionado && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, display: 'block', marginBottom: 8 }}>
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
                      <span style={{ color: C.brown, marginLeft: 8 }}>{lote.variedad} · {lote.region}</span>
                    </div>
                  ))}
                  {enCatacion.length === 0 && (
                    <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown }}>
                      No hay lotes en catación. Acepta una muestra primero.
                    </p>
                  )}
                </div>
              </div>
            )}
            {loteSeleccionado && (() => {
              const totalCalidad =
                Number(cataForm.fragranciaAroma) + Number(cataForm.sabor) + Number(cataForm.regusto) +
                Number(cataForm.acidez) + Number(cataForm.cuerpo) + Number(cataForm.balance) +
                Number(cataForm.uniformidad) + Number(cataForm.tazaLimpia) + Number(cataForm.dulzor) +
                Number(cataForm.apreciacionGlobal);
              const totalDefectos = Number(cataForm.defTazasAfectadas) * Number(cataForm.defIntensidad);
              const puntajeFinal = Math.round((totalCalidad - totalDefectos) * 100) / 100;
              const clasificacion =
                puntajeFinal >= 90 ? { label: 'Especialidad Sobresaliente', color: '#2e7d32' } :
                puntajeFinal >= 85 ? { label: 'Especialidad Excelente', color: C.sage } :
                puntajeFinal >= 80 ? { label: 'Especialidad Muy Buena', color: '#d6b15a' } :
                { label: 'No clasifica como especialidad', color: C.terra };
              const inputNum = (key: keyof typeof cataForm, min: number, max: number, step: number) => (
                <input type="number" min={min} max={max} step={step}
                  value={cataForm[key]}
                  onChange={e => setCataForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ ...inputStyle, padding: '8px 10px', fontSize: 13 }} />
              );
              return (
                <>
                  <div style={{ background: C.green, borderRadius: 10, padding: '14px 18px', marginBottom: 24, color: C.cream }}>
                    <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.sage, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>Catando</p>
                    <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, margin: 0, fontWeight: 700 }}>{loteSeleccionado.nombreLote}</p>
                    <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown, margin: '4px 0 0' }}>
                      {loteSeleccionado.variedad} · {loteSeleccionado.proceso} · {loteSeleccionado.altitud} · {loteSeleccionado.region}
                    </p>
                  </div>
                  <div style={{ background: 'white', borderRadius: 14, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <h4 style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: C.brown, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 14px', borderBottom: `2px solid #f2e0cc`, paddingBottom: 8 }}>
                      Evaluación Física
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                      {([
                        { key: 'humedad' as const, label: 'Humedad (%)', placeholder: '11.5' },
                        { key: 'actividadAgua' as const, label: 'Actividad de agua (Aw)', placeholder: '0.60' },
                        { key: 'densidad' as const, label: 'Densidad (g/L)', placeholder: '680' },
                      ]).map(({ key, label, placeholder }) => (
                        <div key={key}>
                          <label style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, display: 'block', marginBottom: 4 }}>{label}</label>
                          <input value={cataForm[key]} onChange={e => setCataForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                            style={{ ...inputStyle, padding: '8px 10px', fontSize: 13 }} />
                        </div>
                      ))}
                    </div>
                    <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>Defectos físicos (cantidad)</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
                      {([
                        { key: 'defNegros' as const, label: 'Negros' },
                        { key: 'defPartidos' as const, label: 'Partidos' },
                        { key: 'defConchas' as const, label: 'Conchas' },
                        { key: 'defCascaras' as const, label: 'Cáscaras' },
                      ]).map(({ key, label }) => (
                        <div key={key}>
                          <label style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, display: 'block', marginBottom: 4 }}>{label}</label>
                          {inputNum(key, 0, 50, 1)}
                        </div>
                      ))}
                    </div>
                    <h4 style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: C.brown, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 14px', borderBottom: `2px solid #f2e0cc`, paddingBottom: 8 }}>
                      Evaluación Sensorial (6.00 – 10.00)
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
                      {([
                        { key: 'fragranciaAroma' as const, label: 'Fragancia / Aroma' },
                        { key: 'sabor' as const, label: 'Sabor' },
                        { key: 'regusto' as const, label: 'Retrogusto' },
                        { key: 'acidez' as const, label: 'Acidez' },
                        { key: 'cuerpo' as const, label: 'Cuerpo (sensación en boca)' },
                        { key: 'balance' as const, label: 'Balance' },
                        { key: 'apreciacionGlobal' as const, label: 'Apreciación Global' },
                      ]).map(({ key, label }) => (
                        <div key={key}>
                          <label style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, display: 'block', marginBottom: 4 }}>{label}</label>
                          {inputNum(key, 6, 10, 0.25)}
                        </div>
                      ))}
                    </div>
                    <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>Atributos de 5 tazas (2 pts c/u = máx 10)</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
                      {([
                        { key: 'uniformidad' as const, label: 'Uniformidad' },
                        { key: 'dulzor' as const, label: 'Dulzor' },
                        { key: 'tazaLimpia' as const, label: 'Taza Limpia' },
                      ]).map(({ key, label }) => (
                        <div key={key}>
                          <label style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, display: 'block', marginBottom: 4 }}>{label}</label>
                          <select value={cataForm[key]} onChange={e => setCataForm(f => ({ ...f, [key]: e.target.value }))}
                            style={{ ...inputStyle, padding: '8px 10px', fontSize: 13, background: 'white' }}>
                            {[0,2,4,6,8,10].map(v => <option key={v} value={v}>{v} pts</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                    <h4 style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: C.brown, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 14px', borderBottom: `2px solid #f2e0cc`, paddingBottom: 8 }}>
                      Defectos Sensoriales
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                      <div>
                        <label style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, display: 'block', marginBottom: 4 }}>Tazas afectadas (0–5)</label>
                        {inputNum('defTazasAfectadas', 0, 5, 1)}
                      </div>
                      <div>
                        <label style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, display: 'block', marginBottom: 4 }}>Intensidad</label>
                        <select value={cataForm.defIntensidad} onChange={e => setCataForm(f => ({ ...f, defIntensidad: e.target.value }))}
                          style={{ ...inputStyle, padding: '8px 10px', fontSize: 13, background: 'white' }}>
                          <option value="0">Sin defecto</option>
                          <option value="2">Leve / Taint (−2 pts/taza)</option>
                          <option value="4">Grave / Fault (−4 pts/taza)</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ background: '#faf7f3', borderRadius: 10, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>Puntaje Final SCA</p>
                        <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 36, color: clasificacion.color, margin: 0, fontWeight: 700, lineHeight: 1 }}>
                          {puntajeFinal.toFixed(2)}
                        </p>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, margin: '4px 0 0' }}>
                          {totalCalidad.toFixed(2)} calidad − {totalDefectos} defectos
                        </p>
                      </div>
                      <span style={{ background: `${clasificacion.color}20`, color: clasificacion.color, fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 20 }}>
                        {clasificacion.label}
                      </span>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, display: 'block', marginBottom: 4 }}>
                        Notas de sabor <span style={{ fontWeight: 400 }}>(separadas por coma) *</span>
                      </label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <input
                          style={{ ...inputStyle, flex: 1 }}
                          value={cataForm.notas}
                          onChange={e => { setCataForm(f => ({ ...f, notas: e.target.value })); setIaError(null); }}
                          placeholder="chocolate negro, frutas rojas, caramelo, floral"
                        />
                        <button
                          type="button"
                          onClick={handleAsistirIA}
                          disabled={asistiendo || !cataForm.notas.trim()}
                          style={{
                            background: asistiendo ? C.tan : C.green,
                            color: C.cream, border: 'none', borderRadius: 8,
                            padding: '10px 14px', fontFamily: 'Montserrat', fontSize: 11,
                            fontWeight: 700, cursor: (asistiendo || !cataForm.notas.trim()) ? 'not-allowed' : 'pointer',
                            whiteSpace: 'nowrap', opacity: (asistiendo || !cataForm.notas.trim()) ? 0.6 : 1,
                            flexShrink: 0,
                          }}
                        >
                          {asistiendo ? 'Analizando...' : '✦ Asistir con IA'}
                        </button>
                      </div>
                      {iaError && <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.terra, margin: '4px 0 0' }}>{iaError}</p>}
                    </div>
                    <div style={{ marginBottom: 24 }}>
                      <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, display: 'block', marginBottom: 4 }}>
                        Perfil de tueste sugerido *
                      </label>
                      <select value={cataForm.datosTueste} onChange={e => setCataForm(f => ({ ...f, datosTueste: e.target.value }))}
                        style={{ ...inputStyle, background: 'white' }}>
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
                      disabled={!cataForm.notas || !cataForm.datosTueste || guardando}
                      style={{
                        background: puntajeFinal >= 80 ? C.sage : C.terra,
                        color: 'white', border: 'none', borderRadius: 8,
                        padding: 14, fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700,
                        cursor: (!cataForm.notas || !cataForm.datosTueste || guardando) ? 'not-allowed' : 'pointer',
                        opacity: (!cataForm.notas || !cataForm.datosTueste || guardando) ? 0.5 : 1,
                        width: '100%',
                      }}
                    >
                      {guardando ? 'Guardando...' : puntajeFinal >= 80
                        ? `Registrar catación — ${puntajeFinal.toFixed(2)} pts ✓`
                        : `Registrar catación — ${puntajeFinal.toFixed(2)} pts (no clasifica)`}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* CONFIRMACIÓN */}
        {tab === 'mis_catas' && cataGuardada && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✓</div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 8 }}>
              Catación registrada
            </h2>
            <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.brown, lineHeight: 1.7, maxWidth: 420, margin: '0 auto 24px' }}>
              El lote quedó en estado <strong>"Aprobado"</strong>.<br />
              El puntaje SCA fue registrado y el lote se publicó automáticamente en el catálogo.
            </p>
            {certCompletandoLoteId && (
              <div style={{ background: '#8a6fc910', border: '1px solid #8a6fc940', borderRadius: 10, padding: '12px 20px', maxWidth: 380, margin: '0 auto 20px', textAlign: 'left' }}>
                <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: '#8a6fc9', fontWeight: 700, margin: '0 0 4px' }}>
                  📋 Solicitud de certificación completada
                </p>
                <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown, margin: 0, lineHeight: 1.5 }}>
                  Se marcó la certificación como completada. Tunay Wasi te transferirá el fee una vez que el lote tenga un pedido confirmado.
                </p>
              </div>
            )}
            <button
              onClick={() => { setCataGuardada(false); setLoteSeleccionado(null); setCertCompletandoLoteId(null); setTab('mis_muestras'); setCataForm({ humedad: '', actividadAgua: '', densidad: '', defNegros: '0', defPartidos: '0', defConchas: '0', defCascaras: '0', fragranciaAroma: '7.00', sabor: '7.00', regusto: '7.00', acidez: '7.00', cuerpo: '7.00', balance: '7.00', uniformidad: '10', dulzor: '10', tazaLimpia: '10', apreciacionGlobal: '7.00', defTazasAfectadas: '0', defIntensidad: '2', notas: '', datosTueste: '' }); }}
              style={{
                background: C.terra, color: 'white', border: 'none', borderRadius: 8,
                padding: '12px 28px', fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Ver mis muestras →
            </button>
          </div>
        )}

        {/* HISTORIAL */}
        {tab === 'mis_catas' && subTabCatas === 'historial' && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 6 }}>Historial</h2>
            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, marginBottom: 24 }}>
              Todos los pedidos procesados — catación y/o tueste por lote.
            </p>
            {historial.length === 0 && pedidosHistorial.length === 0 ? (
              <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.brown, textAlign: 'center', padding: '40px 0' }}>
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
                        <div style={{ background: C.green, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 9, color: C.sage, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>{loteId}</p>
                            <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 18, color: C.cream, margin: 0, fontWeight: 700 }}>{lote?.nombreLote ?? loteId}</p>
                            {lote && 'variedad' in lote && (
                              <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, margin: '2px 0 0' }}>
                                {(lote as LoteDoc).variedad} · {(lote as LoteDoc).proceso} · {(lote as LoteDoc).region}
                              </p>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {catacion && <span style={{ background: `${C.sage}30`, color: C.sage, fontSize: 10, fontFamily: 'Montserrat', fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>Catación ✓</span>}
                            {pedidos.length > 0 && <span style={{ background: `${C.terra}30`, color: C.terra, fontSize: 10, fontFamily: 'Montserrat', fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>{pedidos.length} pedido{pedidos.length > 1 ? 's' : ''}</span>}
                          </div>
                        </div>
                        <div style={{ padding: '16px 20px' }}>
                          {catacion && (
                            <div style={{ marginBottom: pedidos.length > 0 ? 14 : 0, paddingBottom: pedidos.length > 0 ? 14 : 0, borderBottom: pedidos.length > 0 ? '1px solid #f0ebe4' : 'none' }}>
                              <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Catación SCA</p>
                              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                                <div>
                                  <p style={{ fontFamily: 'Montserrat', fontSize: 9, color: C.brown, margin: '0 0 2px', textTransform: 'uppercase' }}>Puntaje</p>
                                  <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 24, color: (catacion.puntajeOficial ?? 0) >= 82 ? C.sage : C.terra, margin: 0, fontWeight: 700, lineHeight: 1 }}>{catacion.puntajeOficial ?? '—'} pts</p>
                                </div>
                                {catacion.acidez != null && (
                                  <div>
                                    <p style={{ fontFamily: 'Montserrat', fontSize: 9, color: C.brown, margin: '0 0 2px', textTransform: 'uppercase' }}>Acidez / Cuerpo / Balance</p>
                                    <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, margin: 0, fontWeight: 600 }}>{catacion.acidez} · {catacion.cuerpo} · {catacion.balance}</p>
                                  </div>
                                )}
                                {catacion.notasSabor?.length > 0 && (
                                  <div>
                                    <p style={{ fontFamily: 'Montserrat', fontSize: 9, color: C.brown, margin: '0 0 2px', textTransform: 'uppercase' }}>Notas</p>
                                    <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown, margin: 0 }}>{catacion.notasSabor.join(', ')}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {pedidos.length > 0 && (
                            <div>
                              <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Pedidos</p>
                              <div style={{ display: 'grid', gap: 8 }}>
                                {pedidos.map((p: PedidoB2BDoc) => (
                                  <div key={p.id} style={{ background: '#f7f3ee', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                    <div>
                                      <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, margin: '0 0 2px' }}>{p.id} · {new Date(p.updatedAt).toLocaleDateString('es-PE')}</p>
                                      <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, margin: 0, fontWeight: 600 }}>{p.razonSocial}</p>
                                      <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, margin: '2px 0 0' }}>{p.sacosSolicitados} sacos · {p.kgTotal} kg</p>
                                      {(p.feeLaboratorioPEN ?? 0) > 0 && (
                                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                          <span style={{ background: `${C.sage}20`, color: C.sage, fontSize: 9, fontFamily: 'Montserrat', fontWeight: 600, padding: '2px 6px', borderRadius: 10 }}>Catación S/ {p.feeLaboratorioPEN}</span>
                                        </div>
                                      )}
                                    </div>
                                    <span style={{ background: p.pagoLaboratorioStatus === 'pagado' ? `${C.sage}20` : `${C.terra}15`, color: p.pagoLaboratorioStatus === 'pagado' ? C.sage : C.terra, fontSize: 10, fontFamily: 'Montserrat', fontWeight: 700, padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                                      {p.pagoLaboratorioStatus === 'pagado' ? `Pagado ✓ ${p.pagoLaboratorioAt ? new Date(p.pagoLaboratorioAt).toLocaleDateString('es-PE') : ''}` : 'Pago pendiente'}
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

        {/* MIS PAGOS — modo embebido */}
        {tab === 'pagos' && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 6 }}>Mis pagos</h2>
            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, marginBottom: 24, lineHeight: 1.6 }}>
              Fees recibidos de Tunay Wasi por cataciones y certificaciones completadas.
            </p>
            {(() => {
              const feesB2B = pedidosLab.filter(p => p.pagoLaboratorioStatus === 'pagado');
              const feesCert = solicitudesCert.filter(c => c.pagoLaboratorioStatus === 'pagado');
              const pendientesB2B = pedidosLab.filter(p => p.pagoLaboratorioStatus !== 'pagado' && p.feeLaboratorioPEN);
              const pendientesCert = solicitudesCert.filter(c => c.status === 'completada' && c.pagoLaboratorioStatus !== 'pagado');
              const totalRecibido = feesB2B.reduce((s, p) => s + (p.feeLaboratorioPEN ?? 0), 0)
                + feesCert.reduce((s, c) => s + (c.feeCatacionPEN ?? 0), 0);
              const totalPendiente = pendientesB2B.reduce((s, p) => s + (p.feeLaboratorioPEN ?? 0), 0)
                + pendientesCert.reduce((s, c) => s + (c.feeCatacionPEN ?? 0), 0);
              return (
                <div style={{ display: 'grid', gap: 16 }}>
                  {/* Resumen */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ background: `${C.sage}18`, border: `1px solid ${C.sage}40`, borderRadius: 12, padding: '16px 18px' }}>
                      <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.sage, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 4px' }}>Recibido</p>
                      <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 26, fontWeight: 700, color: C.brown, margin: 0 }}>S/ {totalRecibido.toLocaleString('es-PE')}</p>
                    </div>
                    <div style={{ background: `${C.terra}10`, border: `1px solid ${C.terra}30`, borderRadius: 12, padding: '16px 18px' }}>
                      <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.terra, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 4px' }}>Por cobrar</p>
                      <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 26, fontWeight: 700, color: C.brown, margin: 0 }}>S/ {totalPendiente.toLocaleString('es-PE')}</p>
                    </div>
                  </div>
                  {/* Pendientes */}
                  {(pendientesB2B.length > 0 || pendientesCert.length > 0) && (
                    <div>
                      <p style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: C.brown, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>Pendientes de pago</p>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {pendientesB2B.map(p => (
                          <div key={p.id} style={{ background: 'white', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `3px solid ${C.terra}` }}>
                            <div>
                              <p style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, color: C.brown, margin: '0 0 2px' }}>Catación pedido B2B</p>
                              <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, margin: 0 }}>{p.id.slice(-8).toUpperCase()}</p>
                            </div>
                            <span style={{ fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700, color: C.terra }}>S/ {p.feeLaboratorioPEN}</span>
                          </div>
                        ))}
                        {pendientesCert.map(c => (
                          <div key={c.id} style={{ background: 'white', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `3px solid #8a6fc9` }}>
                            <div>
                              <p style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, color: C.brown, margin: '0 0 2px' }}>Certificación — {c.nombreLote}</p>
                              <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, margin: 0 }}>Catación completada — pendiente de transferencia por Tunay Wasi</p>
                            </div>
                            <span style={{ fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700, color: '#8a6fc9' }}>S/ {c.feeCatacionPEN}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Historial pagado */}
                  {(feesB2B.length > 0 || feesCert.length > 0) && (
                    <div>
                      <p style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: C.brown, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>Pagos recibidos</p>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {feesB2B.map(p => (
                          <div key={p.id} style={{ background: 'white', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `3px solid ${C.sage}` }}>
                            <div>
                              <p style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, color: C.brown, margin: '0 0 2px' }}>Catación pedido B2B ✓</p>
                              <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, margin: 0 }}>{p.pagoLaboratorioAt ? new Date(p.pagoLaboratorioAt).toLocaleDateString('es-PE') : ''}</p>
                            </div>
                            <span style={{ fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700, color: C.sage }}>S/ {p.feeLaboratorioPEN}</span>
                          </div>
                        ))}
                        {feesCert.map(c => (
                          <div key={c.id} style={{ background: 'white', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `3px solid ${C.sage}` }}>
                            <div>
                              <p style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, color: C.brown, margin: '0 0 2px' }}>Certificación — {c.nombreLote} ✓</p>
                              <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, margin: 0 }}>{c.pagoLaboratorioAt ? new Date(c.pagoLaboratorioAt).toLocaleDateString('es-PE') : ''}</p>
                            </div>
                            <span style={{ fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700, color: C.sage }}>S/ {c.feeCatacionPEN}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {feesB2B.length === 0 && feesCert.length === 0 && pendientesB2B.length === 0 && pendientesCert.length === 0 && (
                    <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, textAlign: 'center', padding: '40px 0' }}>
                      Aún no hay fees registrados. Los pagos aparecerán aquí cuando completes cataciones y certificaciones.
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* MI PERFIL */}
        {tab === 'perfil' && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 6 }}>Mi perfil</h2>
            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, marginBottom: 28, lineHeight: 1.6 }}>
              Estos datos aparecen en las solicitudes de certificación que recibas de los caficultores.
            </p>
            <div style={{ background: 'white', borderRadius: 14, padding: 24, display: 'grid', gap: 16, maxWidth: 480 }}>
              <div>
                <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, display: 'block', marginBottom: 5 }}>Laboratorio</label>
                <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.brown, margin: 0, fontWeight: 700 }}>{laboratorio.nombreComercial}</p>
              </div>
              <div>
                <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, display: 'block', marginBottom: 5 }}>Teléfono de contacto</label>
                <input value={perfilLabForm.telefono} onChange={e => setPerfilLabForm(f => ({ ...f, telefono: e.target.value }))} placeholder="+51 987 654 321"
                  style={{ width: '100%', padding: '11px 14px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 14, color: C.brown, background: 'white', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, display: 'block', marginBottom: 5 }}>Región / ciudad</label>
                <input value={perfilLabForm.region} onChange={e => setPerfilLabForm(f => ({ ...f, region: e.target.value }))} placeholder="Lima, San Isidro"
                  style={{ width: '100%', padding: '11px 14px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 14, color: C.brown, background: 'white', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, display: 'block', marginBottom: 5 }}>Dirección para recepción de muestras</label>
                <input value={perfilLabForm.direccion} onChange={e => setPerfilLabForm(f => ({ ...f, direccion: e.target.value }))} placeholder="Av. Conquistadores 500, San Isidro, Lima"
                  style={{ width: '100%', padding: '11px 14px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 14, color: C.brown, background: 'white', boxSizing: 'border-box' }} />
                <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, margin: '4px 0 0' }}>
                  Esta dirección la verán los caficultores antes de solicitar la certificación.
                </p>
              </div>
              <div>
                <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, display: 'block', marginBottom: 5 }}>Fee de catación (S/)</label>
                <input value={perfilLabForm.feeCatacionPEN} onChange={e => setPerfilLabForm(f => ({ ...f, feeCatacionPEN: e.target.value }))} placeholder="Ej: 80"
                  type="number" min={0} step={10}
                  style={{ width: '100%', padding: '11px 14px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 14, color: C.brown, background: 'white', boxSizing: 'border-box' }} />
                <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, margin: '4px 0 0' }}>
                  Monto que cobras por catación SCA. Lo verán los caficultores al solicitar certificación.
                </p>
              </div>
              <button onClick={handleGuardarPerfilLab} disabled={guardandoPerfilLab}
                style={{ background: C.terra, color: 'white', border: 'none', borderRadius: 8, padding: '13px', fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700, cursor: guardandoPerfilLab ? 'not-allowed' : 'pointer', opacity: guardandoPerfilLab ? 0.6 : 1 }}>
                {guardandoPerfilLab ? 'Guardando...' : 'Guardar cambios →'}
              </button>
              {perfilLabGuardado && (
                <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.sage, margin: 0, textAlign: 'center' }}>✓ Perfil actualizado correctamente</p>
              )}
            </div>

            {/* Certificado Q-Grader */}
            <div style={{ background: 'white', borderRadius: 14, padding: 24, display: 'grid', gap: 14, maxWidth: 480, marginTop: 20 }}>
              <div>
                <p style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, color: C.brown, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Certificado Q-Grader
                </p>
                <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, margin: 0, lineHeight: 1.6 }}>
                  Sube tu certificado Q-Grader (PDF o imagen). El equipo de Tunay Wasi lo revisará antes de activar tu cuenta para catar lotes.
                </p>
              </div>

              {/* Estado actual */}
              {certStatus && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: certStatus === 'aprobado' ? `${C.sage}18` : certStatus === 'rechazado' ? '#fff0ee' : '#fdf8ef',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 18 }}>
                    {certStatus === 'aprobado' ? '✓' : certStatus === 'rechazado' ? '✗' : '⏳'}
                  </span>
                  <div>
                    <p style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, margin: 0,
                      color: certStatus === 'aprobado' ? C.sage : certStatus === 'rechazado' ? C.terra : '#b8860b' }}>
                      {certStatus === 'aprobado' ? 'Certificado aprobado' : certStatus === 'rechazado' ? 'Certificado rechazado' : 'En revisión por Tunay Wasi'}
                    </p>
                    {certUrl && (
                      <a href={certUrl} target="_blank" rel="noreferrer"
                        style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, display: 'block', marginTop: 2 }}>
                        Ver certificado subido →
                      </a>
                    )}
                    {certStatus === 'rechazado' && laboratorio.certificadoNota && (
                      <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.terra, margin: '4px 0 0' }}>
                        Motivo: {laboratorio.certificadoNota}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Upload */}
              <input
                ref={certInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
                onChange={handleSubirCertificado}
              />
              <button
                onClick={() => certInputRef.current?.click()}
                disabled={subiendoCert}
                style={{
                  background: certStatus === 'aprobado' ? '#f5f5f5' : C.green,
                  color: certStatus === 'aprobado' ? C.tan : C.cream,
                  border: 'none', borderRadius: 8, padding: '12px',
                  fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700,
                  cursor: subiendoCert ? 'not-allowed' : 'pointer',
                  opacity: subiendoCert ? 0.6 : 1,
                }}
              >
                {subiendoCert ? 'Subiendo...' : certUrl ? 'Reemplazar certificado' : 'Subir certificado Q-Grader →'}
              </button>
              {certSubido && (
                <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.sage, margin: 0, textAlign: 'center' }}>
                  ✓ Certificado enviado — en revisión
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Modo normal — portal completo con header + nav propio ────────────────────
  return (
    <div style={{ background: '#f7f3ee', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: C.brown, padding: `${isMobile ? 14 : 28}px ${isMobile ? 16 : 24}px`, color: C.cream }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: isMobile ? 44 : 52, height: isMobile ? 44 : 52, borderRadius: '50%',
                background: '#c96e4b', border: '2px solid #c4b297',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Cormorant Garamond, serif', fontSize: isMobile ? 18 : 22, fontWeight: 700,
                color: 'white', flexShrink: 0,
              }}>
                {(laboratorio.nombre ?? laboratorio.nombreComercial).charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, letterSpacing: 2, margin: '0 0 2px', textTransform: 'uppercase' }}>
                  Portal del laboratorio
                </p>
                <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: isMobile ? 18 : 24, margin: '0 0 2px' }}>
                  {laboratorio.nombreComercial}
                </h2>
                {!isMobile && <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, margin: 0 }}>
                  {laboratorio.certificaciones.join(' · ')}
                </p>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <NotifBell uid={laboratorio.uid} />
              <button
                onClick={onLogout}
                style={{
                  background: 'transparent', color: C.tan, border: `1px solid ${C.tan}40`,
                  borderRadius: 8, padding: '8px 14px', fontFamily: 'Montserrat',
                  fontSize: 12, cursor: 'pointer',
                }}
              >
                {isMobile ? 'Salir' : 'Cerrar sesión'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: isMobile ? 20 : 32, marginTop: isMobile ? 12 : 20 }}>
            {[
              { n: enCatacion.length, label: 'en catación' },
              { n: historial.length, label: 'lotes catados' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontFamily: 'Cormorant Garamond', fontSize: isMobile ? 22 : 28, fontWeight: 700, color: C.cream }}>{s.n}</div>
                <div style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs — bottom en móvil */}
      <div style={isMobile ? tabBarStyle(true) : { background: 'white', borderBottom: '1px solid #eee', padding: '0 16px', overflowX: 'auto' }}>
        <div style={isMobile ? { display: 'contents' } : { maxWidth: 800, margin: '0 auto', display: 'flex' }}>
          {([
            { key: 'mis_muestras', label: 'Muestras',  icon: '📋' },
            { key: 'mis_catas',    label: 'Mis Catas',  icon: '☕' },
            { key: 'pagos',        label: 'Pagos',      icon: '💰', badge: [...pedidosLab.filter(p => p.pagoLaboratorioStatus === 'pagado'), ...solicitudesCert.filter(c => c.pagoLaboratorioStatus === 'pagado')].length },
            { key: 'perfil',       label: 'Perfil',     icon: '👤' },
          ] as { key: Tab; label: string; icon: string; badge?: number }[]).map(t => (
            <button key={t.key} id={`tab-lab-${t.key.replace(/_/g, '-')}`} onClick={() => setTab(t.key)}
              style={tabBtn(tab === t.key, isMobile, C.terra)}>
              {isMobile ? (
                <>
                  <span style={{ fontSize: 20, lineHeight: 1 }}>{t.icon}</span>
                  <span>{t.label}</span>
                  {t.key === 'mis_muestras' && muestraRecibida.length > 0 && (
                    <span style={{ position: 'absolute', top: 6, right: 'calc(50% - 18px)', background: C.terra, color: 'white', borderRadius: '50%', width: 16, height: 16, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{muestraRecibida.length}</span>
                  )}
                </>
              ) : (
                <>
                  {t.label}
                  {t.key === 'mis_muestras' && muestraRecibida.length > 0 && (
                    <span style={{ background: C.terra, color: 'white', borderRadius: 20, fontSize: 10, fontWeight: 700, padding: '1px 7px' }}>{muestraRecibida.length}</span>
                  )}
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: `${padY(isMobile)}px ${padX(isMobile)}px`, paddingBottom: isMobile && !modoEmbebido ? 90 : padY(isMobile) }}>

        {/* MUESTRAS PENDIENTES */}
        {tab === 'mis_muestras' && (
          <div style={{ display: 'grid', gap: 14 }}>
            {pendientes.length === 0 && solicitudesAbiertas.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 24px', maxWidth: 480, margin: '0 auto' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>☕</div>
                <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 24, color: C.brown, marginBottom: 8 }}>
                  Sin muestras asignadas aún
                </h3>
                <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, lineHeight: 1.7, marginBottom: 12 }}>
                  Cuando un caficultor publique un lote, el sistema te notificará automáticamente para que lo aceptes.
                  El primer laboratorio en aceptar queda asignado a esa catación.
                </p>
                <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.sage, marginBottom: 0 }}>
                  Tu fee de catación y certificaciones son visibles para los caficultores en el catálogo.
                </p>
              </div>
            )}

            {muestraRecibida.map(lote => (
              <div key={lote.id} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: `1px solid #d6b15a44` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Montserrat', fontSize: 10, color: '#d6b15a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                        Muestra recibida — sin asignar
                      </span>
                    </div>
                    <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, color: C.brown, margin: '4px 0 2px' }}>
                      {lote.nombreLote}
                    </h3>
                    <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown, margin: 0 }}>
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

            {enCatacion.map(lote => {
              const certLote = solicitudesCert.find(c => c.loteId === lote.id && c.laboratorioId === laboratorio.uid);
              const esperandoMuestra = certLote && (certLote.status === 'aceptada' || certLote.status === 'muestra_en_camino');
              return (
              <div key={lote.id} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: `1px solid ${C.sage}44` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.sage, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                        En catación
                      </span>
                    </div>
                    <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, color: C.brown, margin: '4px 0 2px' }}>
                      {lote.nombreLote}
                    </h3>
                    <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown, margin: 0 }}>
                      {lote.variedad} · {lote.proceso} · {lote.altitud}
                    </p>
                  </div>
                  {esperandoMuestra ? (
                    <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: '#8a6fc9', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {certLote!.status === 'muestra_en_camino' ? '✈ Muestra en camino' : '⏳ Esperando muestra'}
                    </span>
                  ) : (
                  <button
                    onClick={() => { setLoteSeleccionado(lote); setTab('mis_catas'); setSubTabCatas('catacion'); setCataGuardada(false); }}
                    style={{
                      background: C.green, color: C.cream, border: 'none', borderRadius: 8,
                      padding: '10px 16px', fontFamily: 'Montserrat', fontSize: 12,
                      fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    Registrar cata →
                  </button>
                  )}
                </div>
              </div>
              );
            })}

            {/* SOLICITUDES DE CERTIFICACIÓN — abiertas (Uber) y asignadas */}
            {(solicitudesAbiertas.length > 0 || solicitudesCert.filter(c => ['aceptada', 'muestra_en_camino', 'muestra_recibida', 'en_proceso'].includes(c.status)).length > 0) && (
              <div style={{ marginTop: 24 }}>
                <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: '#8a6fc9', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>
                  📋 Solicitudes de certificación
                </p>
                {/* Solicitudes abiertas — cualquier lab puede aceptar */}
                {solicitudesAbiertas.map(cert => {
                  const lote = lotesAbiertas.get(cert.loteId);
                  const PROCESO_LABEL: Record<string, string> = { lavado: 'Lavado', natural: 'Natural', honey: 'Honey', anaerobico: 'Anaeróbico', doble_fermentacion: 'D. Fermentación' };
                  return (
                  <div key={cert.id} style={{ background: '#faf6ff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(138,111,201,0.08)', border: '2px solid #8a6fc940', marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontFamily: 'Montserrat', fontSize: 9, color: '#8a6fc9', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Nueva solicitud
                          </span>
                          <span style={{ background: '#8a6fc9', color: 'white', fontFamily: 'Montserrat', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                            Sé el primero en aceptar
                          </span>
                        </div>
                        <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, color: C.brown, margin: '4px 0 6px' }}>
                          {cert.nombreLote}
                        </h3>
                        {/* Datos del lote para que el lab tome la decisión */}
                        {lote && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginBottom: 8 }}>
                            {[
                              ['Variedad', lote.variedad],
                              ['Proceso', PROCESO_LABEL[lote.proceso] ?? lote.proceso],
                              ['Región', lote.region],
                              ['Altitud', lote.altitud],
                              ['Cosecha', lote.cosecha],
                              ['Peso muestra', `${lote.pesoPorSacoKg} kg/saco`],
                              ['Puntaje ref.', `${lote.puntajeReferencial} pts`],
                            ].filter(([, v]) => v && v !== '0 pts').map(([k, v]) => (
                              <span key={k} style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown }}>
                                <strong style={{ color: C.brown }}>{k}:</strong> {v}
                              </span>
                            ))}
                          </div>
                        )}
                        <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: '#8a6fc9', fontWeight: 700, margin: 0 }}>
                          Tu fee: S/ {laboratorio.feeCatacionPEN ?? 90}
                          <span style={{ fontWeight: 400, color: C.brown, marginLeft: 6 }}>(configurado en tu Perfil)</span>
                        </p>
                        {aceptadaYaTomada === cert.id && (
                          <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.terra, margin: '6px 0 0', fontWeight: 700 }}>
                            Ya fue tomado por otro laboratorio.
                          </p>
                        )}
                        {solicitudesActivasCount >= 3 && (
                          <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: '#d6b15a', margin: '6px 0 0', fontWeight: 700 }}>
                            Capacidad máxima alcanzada (3/3 activas).
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleAceptarSolicitud(cert)}
                        disabled={aceptandoSolicitud === cert.id || solicitudesActivasCount >= 3}
                        style={{
                          background: (aceptandoSolicitud === cert.id || solicitudesActivasCount >= 3) ? '#c4b297' : '#8a6fc9',
                          color: 'white', border: 'none', borderRadius: 8,
                          padding: '10px 16px', fontFamily: 'Montserrat', fontSize: 12,
                          fontWeight: 700, cursor: (aceptandoSolicitud === cert.id || solicitudesActivasCount >= 3) ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {aceptandoSolicitud === cert.id ? 'Aceptando...' : solicitudesActivasCount >= 3 ? 'Cap. máxima' : 'Aceptar →'}
                      </button>
                    </div>
                  </div>
                  );
                })}
                {/* Solicitudes ya asignadas a este laboratorio */}
                {solicitudesCert
                  .filter(c => ['aceptada', 'muestra_en_camino', 'muestra_recibida', 'en_proceso'].includes(c.status))
                  .map(cert => (
                    <div key={cert.id} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #8a6fc930', marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                        <div>
                          <span style={{ fontFamily: 'Montserrat', fontSize: 9, color: '#8a6fc9', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Certificación asignada a ti
                          </span>
                          <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, color: C.brown, margin: '4px 0 2px' }}>
                            {cert.nombreLote}
                          </h3>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, margin: 0 }}>
                            Fee: S/ {cert.feeCatacionPEN} ·{' '}
                            <span style={{ color: cert.pagoStatus === 'verificado' ? C.sage : C.terra, fontWeight: 700 }}>
                              {cert.pagoStatus === 'verificado' ? 'Fee verificado ✓' : 'Fee pendiente de pago'}
                            </span>
                          </p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, margin: '2px 0 0' }}>
                            Lote ID: {cert.loteId} · Solicitud: {cert.id}
                          </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                          {cert.status === 'aceptada' && (
                            <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: '#8a6fc9', fontWeight: 700 }}>
                              ⏳ Esperando muestra del caficultor
                            </span>
                          )}
                          {cert.status === 'muestra_en_camino' && (
                            <>
                              <span style={{ fontFamily: 'Montserrat', fontSize: 10, color: '#d6b15a', fontWeight: 700 }}>
                                ✈ {cert.empresaCourierMuestra} · {cert.numeroGuiaMuestra}
                              </span>
                              <button
                                onClick={() => handleConfirmarRecepcion(cert)}
                                disabled={confirmandoRecepcion === cert.id}
                                style={{
                                  background: confirmandoRecepcion === cert.id ? '#c4b297' : C.sage,
                                  color: 'white', border: 'none', borderRadius: 8,
                                  padding: '10px 16px', fontFamily: 'Montserrat', fontSize: 12,
                                  fontWeight: 700, cursor: confirmandoRecepcion === cert.id ? 'default' : 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {confirmandoRecepcion === cert.id ? 'Confirmando...' : 'Confirmar recepción →'}
                              </button>
                            </>
                          )}
                          {(cert.status === 'muestra_recibida' || cert.status === 'en_proceso') && (
                            <button
                              onClick={() => {
                                const lote = pendientes.find(l => l.id === cert.loteId) ?? enCatacion.find(l => l.id === cert.loteId);
                                if (lote) { setLoteSeleccionado(lote); setTab('mis_catas'); setSubTabCatas('catacion'); setCataGuardada(false); }
                              }}
                              style={{
                                background: '#8a6fc9', color: 'white', border: 'none', borderRadius: 8,
                                padding: '10px 16px', fontFamily: 'Montserrat', fontSize: 12,
                                fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                              }}
                            >
                              Registrar cata →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* SUB-TABS MIS CATAS */}
        {tab === 'mis_catas' && (
          <div style={{ borderBottom: '1px solid #eee', display: 'flex', marginBottom: 20 }}>
            {([
              { key: 'catacion' as const, label: 'Catación' },
              { key: 'historial' as const, label: 'Historial' },
            ]).map(st => (
              <button key={st.key} onClick={() => setSubTabCatas(st.key)} style={{
                background: 'none', border: 'none',
                borderBottom: `3px solid ${subTabCatas === st.key ? C.terra : 'transparent'}`,
                padding: '10px 18px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700,
                color: subTabCatas === st.key ? C.terra : C.tan, cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {st.label}
              </button>
            ))}
          </div>
        )}

        {/* REGISTRAR CATACIÓN */}
        {tab === 'mis_catas' && subTabCatas === 'catacion' && !cataGuardada && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 6 }}>
              Registrar catación
            </h2>
            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, marginBottom: 24, lineHeight: 1.6 }}>
              Ingresa los resultados de la catación SCA y el perfil de tueste sugerido.
              Al guardar, si el puntaje supera el umbral SCA el lote se publica automáticamente en el catálogo.
            </p>

            {/* Selector de lote si no viene preseleccionado */}
            {!loteSeleccionado && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, display: 'block', marginBottom: 8 }}>
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
                      <span style={{ color: C.brown, marginLeft: 8 }}>{lote.variedad} · {lote.region}</span>
                    </div>
                  ))}
                  {enCatacion.length === 0 && (
                    <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown }}>
                      No hay lotes en catación. Acepta una muestra primero.
                    </p>
                  )}
                </div>
              </div>
            )}

            {loteSeleccionado && (() => {
              const totalCalidad =
                Number(cataForm.fragranciaAroma) + Number(cataForm.sabor) + Number(cataForm.regusto) +
                Number(cataForm.acidez) + Number(cataForm.cuerpo) + Number(cataForm.balance) +
                Number(cataForm.uniformidad) + Number(cataForm.tazaLimpia) + Number(cataForm.dulzor) +
                Number(cataForm.apreciacionGlobal);
              const totalDefectos = Number(cataForm.defTazasAfectadas) * Number(cataForm.defIntensidad);
              const puntajeFinal = Math.round((totalCalidad - totalDefectos) * 100) / 100;
              const clasificacion =
                puntajeFinal >= 90 ? { label: 'Especialidad Sobresaliente', color: '#2e7d32' } :
                puntajeFinal >= 85 ? { label: 'Especialidad Excelente', color: C.sage } :
                puntajeFinal >= 80 ? { label: 'Especialidad Muy Buena', color: '#d6b15a' } :
                { label: 'No clasifica como especialidad', color: C.terra };
              const inputNum = (key: keyof typeof cataForm, min: number, max: number, step: number) => (
                <input type="number" min={min} max={max} step={step}
                  value={cataForm[key]}
                  onChange={e => setCataForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ ...inputStyle, padding: '8px 10px', fontSize: 13 }} />
              );
              return (
                <>
                  <div style={{ background: C.green, borderRadius: 10, padding: '14px 18px', marginBottom: 24, color: C.cream }}>
                    <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.sage, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>
                      Catando
                    </p>
                    <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, margin: 0, fontWeight: 700 }}>
                      {loteSeleccionado.nombreLote}
                    </p>
                    <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown, margin: '4px 0 0' }}>
                      {loteSeleccionado.variedad} · {loteSeleccionado.proceso} · {loteSeleccionado.altitud} · {loteSeleccionado.region}
                    </p>
                  </div>

                  <div style={{ background: 'white', borderRadius: 14, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>

                    {/* EVALUACIÓN FÍSICA */}
                    <h4 style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: C.brown, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 14px', borderBottom: `2px solid #f2e0cc`, paddingBottom: 8 }}>
                      Evaluación Física
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                      {([
                        { key: 'humedad' as const, label: 'Humedad (%)', placeholder: '11.5' },
                        { key: 'actividadAgua' as const, label: 'Actividad de agua (Aw)', placeholder: '0.60' },
                        { key: 'densidad' as const, label: 'Densidad (g/L)', placeholder: '680' },
                      ]).map(({ key, label, placeholder }) => (
                        <div key={key}>
                          <label style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, display: 'block', marginBottom: 4 }}>{label}</label>
                          <input value={cataForm[key]} onChange={e => setCataForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                            style={{ ...inputStyle, padding: '8px 10px', fontSize: 13 }} />
                        </div>
                      ))}
                    </div>
                    <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>Defectos físicos (cantidad)</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
                      {([
                        { key: 'defNegros' as const, label: 'Negros' },
                        { key: 'defPartidos' as const, label: 'Partidos' },
                        { key: 'defConchas' as const, label: 'Conchas' },
                        { key: 'defCascaras' as const, label: 'Cáscaras' },
                      ]).map(({ key, label }) => (
                        <div key={key}>
                          <label style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, display: 'block', marginBottom: 4 }}>{label}</label>
                          {inputNum(key, 0, 50, 1)}
                        </div>
                      ))}
                    </div>

                    {/* EVALUACIÓN SENSORIAL */}
                    <h4 style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: C.brown, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 14px', borderBottom: `2px solid #f2e0cc`, paddingBottom: 8 }}>
                      Evaluación Sensorial (6.00 – 10.00)
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
                      {([
                        { key: 'fragranciaAroma' as const, label: 'Fragancia / Aroma' },
                        { key: 'sabor' as const, label: 'Sabor' },
                        { key: 'regusto' as const, label: 'Retrogusto' },
                        { key: 'acidez' as const, label: 'Acidez' },
                        { key: 'cuerpo' as const, label: 'Cuerpo (sensación en boca)' },
                        { key: 'balance' as const, label: 'Balance' },
                        { key: 'apreciacionGlobal' as const, label: 'Apreciación Global' },
                      ]).map(({ key, label }) => (
                        <div key={key}>
                          <label style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, display: 'block', marginBottom: 4 }}>{label}</label>
                          {inputNum(key, 6, 10, 0.25)}
                        </div>
                      ))}
                    </div>
                    <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>Atributos de 5 tazas (2 pts c/u = máx 10)</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
                      {([
                        { key: 'uniformidad' as const, label: 'Uniformidad' },
                        { key: 'dulzor' as const, label: 'Dulzor' },
                        { key: 'tazaLimpia' as const, label: 'Taza Limpia' },
                      ]).map(({ key, label }) => (
                        <div key={key}>
                          <label style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, display: 'block', marginBottom: 4 }}>{label}</label>
                          <select value={cataForm[key]} onChange={e => setCataForm(f => ({ ...f, [key]: e.target.value }))}
                            style={{ ...inputStyle, padding: '8px 10px', fontSize: 13, background: 'white' }}>
                            {[0,2,4,6,8,10].map(v => <option key={v} value={v}>{v} pts</option>)}
                          </select>
                        </div>
                      ))}
                    </div>

                    {/* DEFECTOS SENSORIALES */}
                    <h4 style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: C.brown, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 14px', borderBottom: `2px solid #f2e0cc`, paddingBottom: 8 }}>
                      Defectos Sensoriales
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                      <div>
                        <label style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, display: 'block', marginBottom: 4 }}>Tazas afectadas (0–5)</label>
                        {inputNum('defTazasAfectadas', 0, 5, 1)}
                      </div>
                      <div>
                        <label style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, display: 'block', marginBottom: 4 }}>Intensidad</label>
                        <select value={cataForm.defIntensidad} onChange={e => setCataForm(f => ({ ...f, defIntensidad: e.target.value }))}
                          style={{ ...inputStyle, padding: '8px 10px', fontSize: 13, background: 'white' }}>
                          <option value="0">Sin defecto</option>
                          <option value="2">Leve / Taint (−2 pts/taza)</option>
                          <option value="4">Grave / Fault (−4 pts/taza)</option>
                        </select>
                      </div>
                    </div>

                    {/* PUNTAJE EN VIVO */}
                    <div style={{ background: '#faf7f3', borderRadius: 10, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>Puntaje Final SCA</p>
                        <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 36, color: clasificacion.color, margin: 0, fontWeight: 700, lineHeight: 1 }}>
                          {puntajeFinal.toFixed(2)}
                        </p>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, margin: '4px 0 0' }}>
                          {totalCalidad.toFixed(2)} calidad − {totalDefectos} defectos
                        </p>
                      </div>
                      <span style={{ background: `${clasificacion.color}20`, color: clasificacion.color, fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 20 }}>
                        {clasificacion.label}
                      </span>
                    </div>

                    {/* NOTAS Y TUESTE */}
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, display: 'block', marginBottom: 4 }}>
                        Notas de sabor <span style={{ fontWeight: 400 }}>(separadas por coma) *</span>
                      </label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <input
                          style={{ ...inputStyle, flex: 1 }}
                          value={cataForm.notas}
                          onChange={e => { setCataForm(f => ({ ...f, notas: e.target.value })); setIaError(null); }}
                          placeholder="chocolate negro, frutas rojas, caramelo, floral"
                        />
                        <button
                          type="button"
                          onClick={handleAsistirIA}
                          disabled={asistiendo || !cataForm.notas.trim()}
                          style={{
                            background: asistiendo ? C.tan : C.green,
                            color: C.cream, border: 'none', borderRadius: 8,
                            padding: '10px 14px', fontFamily: 'Montserrat', fontSize: 11,
                            fontWeight: 700, cursor: (asistiendo || !cataForm.notas.trim()) ? 'not-allowed' : 'pointer',
                            whiteSpace: 'nowrap', opacity: (asistiendo || !cataForm.notas.trim()) ? 0.6 : 1,
                            flexShrink: 0,
                          }}
                        >
                          {asistiendo ? 'Analizando...' : '✦ Asistir con IA'}
                        </button>
                      </div>
                      {iaError && <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.terra, margin: '4px 0 0' }}>{iaError}</p>}
                    </div>
                    <div style={{ marginBottom: 24 }}>
                      <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, display: 'block', marginBottom: 4 }}>
                        Perfil de tueste sugerido *
                      </label>
                      <select value={cataForm.datosTueste} onChange={e => setCataForm(f => ({ ...f, datosTueste: e.target.value }))}
                        style={{ ...inputStyle, background: 'white' }}>
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
                      disabled={!cataForm.notas || !cataForm.datosTueste || guardando}
                      style={{
                        background: puntajeFinal >= 80 ? C.sage : C.terra,
                        color: 'white', border: 'none', borderRadius: 8,
                        padding: 14, fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700,
                        cursor: (!cataForm.notas || !cataForm.datosTueste || guardando) ? 'not-allowed' : 'pointer',
                        opacity: (!cataForm.notas || !cataForm.datosTueste || guardando) ? 0.5 : 1,
                        width: '100%',
                      }}
                    >
                      {guardando ? 'Guardando...' : puntajeFinal >= 80
                        ? `Registrar catación — ${puntajeFinal.toFixed(2)} pts ✓`
                        : `Registrar catación — ${puntajeFinal.toFixed(2)} pts (no clasifica)`}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* CONFIRMACIÓN */}
        {tab === 'mis_catas' && cataGuardada && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✓</div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 8 }}>
              Catación registrada
            </h2>
            <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.brown, lineHeight: 1.7, maxWidth: 420, margin: '0 auto 24px' }}>
              El lote quedó en estado <strong>"Aprobado"</strong>.<br />
              El puntaje SCA fue registrado y el lote se publicó automáticamente en el catálogo.
            </p>
            {certCompletandoLoteId && (
              <div style={{ background: '#8a6fc910', border: '1px solid #8a6fc940', borderRadius: 10, padding: '12px 20px', maxWidth: 380, margin: '0 auto 20px', textAlign: 'left' }}>
                <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: '#8a6fc9', fontWeight: 700, margin: '0 0 4px' }}>
                  📋 Solicitud de certificación completada
                </p>
                <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown, margin: 0, lineHeight: 1.5 }}>
                  Se marcó la certificación como completada. Tunay Wasi te transferirá el fee una vez que el lote tenga un pedido confirmado.
                </p>
              </div>
            )}
            <button
              onClick={() => { setCataGuardada(false); setLoteSeleccionado(null); setCertCompletandoLoteId(null); setTab('mis_muestras'); setCataForm({ humedad: '', actividadAgua: '', densidad: '', defNegros: '0', defPartidos: '0', defConchas: '0', defCascaras: '0', fragranciaAroma: '7.00', sabor: '7.00', regusto: '7.00', acidez: '7.00', cuerpo: '7.00', balance: '7.00', uniformidad: '10', dulzor: '10', tazaLimpia: '10', apreciacionGlobal: '7.00', defTazasAfectadas: '0', defIntensidad: '2', notas: '', datosTueste: '' }); }}
              style={{
                background: C.terra, color: 'white', border: 'none', borderRadius: 8,
                padding: '12px 28px', fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Ver mis muestras →
            </button>
          </div>
        )}
        {/* HISTORIAL */}
        {tab === 'mis_catas' && subTabCatas === 'historial' && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 6 }}>
              Historial
            </h2>
            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, marginBottom: 24 }}>
              Todos los pedidos procesados — catación y/o tueste por lote.
            </p>

            {historial.length === 0 && pedidosHistorial.length === 0 ? (
              <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.brown, textAlign: 'center', padding: '40px 0' }}>
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
                              <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, margin: '2px 0 0' }}>
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
                              <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                                Catación SCA
                              </p>
                              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                                <div>
                                  <p style={{ fontFamily: 'Montserrat', fontSize: 9, color: C.brown, margin: '0 0 2px', textTransform: 'uppercase' }}>Puntaje</p>
                                  <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 24, color: (catacion.puntajeOficial ?? 0) >= 82 ? C.sage : C.terra, margin: 0, fontWeight: 700, lineHeight: 1 }}>
                                    {catacion.puntajeOficial ?? '—'} pts
                                  </p>
                                </div>
                                {catacion.acidez != null && (
                                  <div>
                                    <p style={{ fontFamily: 'Montserrat', fontSize: 9, color: C.brown, margin: '0 0 2px', textTransform: 'uppercase' }}>Acidez / Cuerpo / Balance</p>
                                    <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, margin: 0, fontWeight: 600 }}>
                                      {catacion.acidez} · {catacion.cuerpo} · {catacion.balance}
                                    </p>
                                  </div>
                                )}
                                {catacion.notasSabor?.length > 0 && (
                                  <div>
                                    <p style={{ fontFamily: 'Montserrat', fontSize: 9, color: C.brown, margin: '0 0 2px', textTransform: 'uppercase' }}>Notas</p>
                                    <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown, margin: 0 }}>{catacion.notasSabor.join(', ')}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Pedidos */}
                          {pedidos.length > 0 && (
                            <div>
                              <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                                Pedidos
                              </p>
                              <div style={{ display: 'grid', gap: 8 }}>
                                {pedidos.map((p: PedidoB2BDoc) => (
                                  <div key={p.id} style={{ background: '#f7f3ee', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                    <div>
                                      <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, margin: '0 0 2px' }}>{p.id} · {new Date(p.updatedAt).toLocaleDateString('es-PE')}</p>
                                      <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, margin: 0, fontWeight: 600 }}>{p.razonSocial}</p>
                                      <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, margin: '2px 0 0' }}>
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

      {/* MIS PAGOS — modo normal */}
      {tab === 'pagos' && (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 24px' }}>
          <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 6 }}>Mis pagos</h2>
          <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, marginBottom: 24, lineHeight: 1.6 }}>
            Fees recibidos de Tunay Wasi por cataciones y certificaciones completadas.
          </p>
          {(() => {
            const feesB2B = pedidosLab.filter(p => p.pagoLaboratorioStatus === 'pagado');
            const feesCert = solicitudesCert.filter(c => c.pagoLaboratorioStatus === 'pagado');
            const pendientesB2B = pedidosLab.filter(p => p.pagoLaboratorioStatus !== 'pagado' && p.feeLaboratorioPEN);
            const pendientesCert = solicitudesCert.filter(c => c.status === 'completada' && c.pagoLaboratorioStatus !== 'pagado');
            const totalRecibido = feesB2B.reduce((s, p) => s + (p.feeLaboratorioPEN ?? 0), 0)
              + feesCert.reduce((s, c) => s + (c.feeCatacionPEN ?? 0), 0);
            const totalPendiente = pendientesB2B.reduce((s, p) => s + (p.feeLaboratorioPEN ?? 0), 0)
              + pendientesCert.reduce((s, c) => s + (c.feeCatacionPEN ?? 0), 0);
            return (
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: `${C.sage}18`, border: `1px solid ${C.sage}40`, borderRadius: 12, padding: '16px 18px' }}>
                    <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.sage, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 4px' }}>Recibido</p>
                    <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 26, fontWeight: 700, color: C.brown, margin: 0 }}>S/ {totalRecibido.toLocaleString('es-PE')}</p>
                  </div>
                  <div style={{ background: `${C.terra}10`, border: `1px solid ${C.terra}30`, borderRadius: 12, padding: '16px 18px' }}>
                    <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.terra, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 4px' }}>Por cobrar</p>
                    <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 26, fontWeight: 700, color: C.brown, margin: 0 }}>S/ {totalPendiente.toLocaleString('es-PE')}</p>
                  </div>
                </div>
                {(pendientesB2B.length > 0 || pendientesCert.length > 0) && (
                  <div>
                    <p style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: C.brown, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>Pendientes de pago</p>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {pendientesB2B.map(p => (
                        <div key={p.id} style={{ background: 'white', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `3px solid ${C.terra}` }}>
                          <div>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, color: C.brown, margin: '0 0 2px' }}>Catación pedido B2B</p>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, margin: 0 }}>{p.id.slice(-8).toUpperCase()}</p>
                          </div>
                          <span style={{ fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700, color: C.terra }}>S/ {p.feeLaboratorioPEN}</span>
                        </div>
                      ))}
                      {pendientesCert.map(c => (
                        <div key={c.id} style={{ background: 'white', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `3px solid #8a6fc9` }}>
                          <div>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, color: C.brown, margin: '0 0 2px' }}>Certificación — {c.nombreLote}</p>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, margin: 0 }}>Catación completada — pendiente de transferencia por Tunay Wasi</p>
                          </div>
                          <span style={{ fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700, color: '#8a6fc9' }}>S/ {c.feeCatacionPEN}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(feesB2B.length > 0 || feesCert.length > 0) && (
                  <div>
                    <p style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: C.brown, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>Pagos recibidos</p>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {feesB2B.map(p => (
                        <div key={p.id} style={{ background: 'white', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `3px solid ${C.sage}` }}>
                          <div>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, color: C.brown, margin: '0 0 2px' }}>Catación pedido B2B ✓</p>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, margin: 0 }}>{p.pagoLaboratorioAt ? new Date(p.pagoLaboratorioAt).toLocaleDateString('es-PE') : ''}</p>
                          </div>
                          <span style={{ fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700, color: C.sage }}>S/ {p.feeLaboratorioPEN}</span>
                        </div>
                      ))}
                      {feesCert.map(c => (
                        <div key={c.id} style={{ background: 'white', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `3px solid ${C.sage}` }}>
                          <div>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, color: C.brown, margin: '0 0 2px' }}>Certificación — {c.nombreLote} ✓</p>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, margin: 0 }}>{c.pagoLaboratorioAt ? new Date(c.pagoLaboratorioAt).toLocaleDateString('es-PE') : ''}</p>
                          </div>
                          <span style={{ fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700, color: C.sage }}>S/ {c.feeCatacionPEN}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {feesB2B.length === 0 && feesCert.length === 0 && pendientesB2B.length === 0 && pendientesCert.length === 0 && (
                  <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, textAlign: 'center', padding: '40px 0' }}>
                    Aún no hay fees registrados. Los pagos aparecerán aquí cuando completes cataciones y certificaciones.
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* MI PERFIL */}
      {tab === 'perfil' && (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 24px' }}>
          <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 6 }}>
            Mi perfil
          </h2>
          <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, marginBottom: 28, lineHeight: 1.6 }}>
            Estos datos aparecen en las solicitudes de certificación que recibas de los caficultores.
          </p>
          <div style={{ background: 'white', borderRadius: 14, padding: 24, display: 'grid', gap: 16, maxWidth: 480 }}>
            <div>
              <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, display: 'block', marginBottom: 5 }}>
                Laboratorio
              </label>
              <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.brown, margin: 0, fontWeight: 700 }}>
                {laboratorio.nombreComercial}
              </p>
            </div>
            <div>
              <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, display: 'block', marginBottom: 5 }}>
                Teléfono de contacto
              </label>
              <input
                value={perfilLabForm.telefono}
                onChange={e => setPerfilLabForm(f => ({ ...f, telefono: e.target.value }))}
                placeholder="+51 987 654 321"
                style={{ width: '100%', padding: '11px 14px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 14, color: C.brown, background: 'white', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, display: 'block', marginBottom: 5 }}>
                Región / ciudad
              </label>
              <input
                value={perfilLabForm.region}
                onChange={e => setPerfilLabForm(f => ({ ...f, region: e.target.value }))}
                placeholder="Lima, San Isidro"
                style={{ width: '100%', padding: '11px 14px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 14, color: C.brown, background: 'white', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, display: 'block', marginBottom: 5 }}>
                Dirección para recepción de muestras
              </label>
              <input
                value={perfilLabForm.direccion}
                onChange={e => setPerfilLabForm(f => ({ ...f, direccion: e.target.value }))}
                placeholder="Av. Conquistadores 500, San Isidro, Lima"
                style={{ width: '100%', padding: '11px 14px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 14, color: C.brown, background: 'white', boxSizing: 'border-box' }}
              />
              <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, margin: '4px 0 0' }}>
                Esta dirección la verán los caficultores antes de solicitar la certificación.
              </p>
            </div>
            <button
              onClick={handleGuardarPerfilLab}
              disabled={guardandoPerfilLab}
              style={{ background: C.terra, color: 'white', border: 'none', borderRadius: 8, padding: '13px', fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700, cursor: guardandoPerfilLab ? 'not-allowed' : 'pointer', opacity: guardandoPerfilLab ? 0.6 : 1 }}
            >
              {guardandoPerfilLab ? 'Guardando...' : 'Guardar cambios →'}
            </button>
            {perfilLabGuardado && (
              <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.sage, margin: 0, textAlign: 'center' }}>
                ✓ Perfil actualizado correctamente
              </p>
            )}
          </div>

          {/* Certificado Q-Grader */}
          <div style={{ background: 'white', borderRadius: 14, padding: 24, display: 'grid', gap: 14, maxWidth: 480, marginTop: 20 }}>
            <div>
              <p style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, color: C.brown, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>
                Certificado Q-Grader
              </p>
              <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, margin: 0, lineHeight: 1.6 }}>
                Sube tu certificado Q-Grader (PDF o imagen). El equipo de Tunay Wasi lo revisará antes de activar tu cuenta para catar lotes.
              </p>
            </div>
            {certStatus && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  background: certStatus === 'aprobado' ? `${C.sage}20` : certStatus === 'rechazado' ? '#fce8e3' : '#fff8e8',
                  color: certStatus === 'aprobado' ? C.sage : certStatus === 'rechazado' ? C.terra : '#b8860b',
                  fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700,
                  padding: '3px 12px', borderRadius: 20,
                }}>
                  {certStatus === 'aprobado' ? '✓ Certificado aprobado' : certStatus === 'rechazado' ? '✗ Rechazado — vuelve a subir' : '⏳ En revisión'}
                </span>
                {certUrl && (
                  <a href={certUrl} target="_blank" rel="noreferrer" style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.terra, textDecoration: 'none' }}>
                    Ver certificado ↗
                  </a>
                )}
              </div>
            )}
            <input ref={certInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={handleSubirCertificado} />
            <button
              onClick={() => certInputRef.current?.click()}
              disabled={subiendoCert}
              style={{ background: C.terra, color: 'white', border: 'none', borderRadius: 8, padding: '13px', fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700, cursor: subiendoCert ? 'not-allowed' : 'pointer', opacity: subiendoCert ? 0.6 : 1 }}
            >
              {subiendoCert ? 'Subiendo...' : certUrl ? 'Reemplazar certificado' : 'Subir certificado Q-Grader →'}
            </button>
            {certSubido && (
              <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.sage, margin: 0, textAlign: 'center' }}>
                ✓ Certificado enviado — en revisión por el equipo de Tunay Wasi
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
