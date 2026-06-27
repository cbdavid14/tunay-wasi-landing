/**
 * AdminPanel.tsx — Panel administrador Tunay Wasi
 * Actor: Admin TW
 *
 * Responsabilidades del admin según MVP v2:
 *   - Dashboard: métricas del flujo
 *   - Publicar: revisar lotes aprobados por laboratorio y publicarlos al marketplace
 *   - Pagos: distribuir pago caficultor + laboratorio tras confirmación del pedido
 *   - Logística: kanban de pedidos activos
 *   - Lotes: vista completa de todos los lotes
 *
 * Lo que el admin NO hace: catar, tostar, fijar precios de servicios.
 */
import { useState, useEffect } from 'react';
import { useIsMobile } from '@/shared/mobileStyles';
import {
  fetchMktLotes,
  fetchMktPedidos,
  liberarReservaPedido,
  verificarPagoPedido,
  marcarPagoCaficultor,
  fetchMktLaboratorios,
  fetchMktSolicitudesPendientesDespacho,
  despacharMuestraHub,
  confirmarRecepcionHub,
  fetchSolicitudesHub,
  fetchMktSolicitudesCertificacionAll,
  updatePagoCertificacion,
  confirmarRecepcionHubInicial,
} from '@/features/marketplace/marketplaceService';
import { fetchCafeterias, toggleTieneLaboratorio } from '@/shared/perfilService';
import { saveNotif } from '@/shared/notificacionesService';
import type { LoteDoc, PedidoB2BDoc, LaboratorioDoc, SolicitudMuestraDoc, SolicitudHubDoc, SolicitudCertificacionDoc } from '@/shared/types/marketplace';
import type { PerfilCafeteria } from '@/shared/types/auth';
import { useOnboarding } from '@/shared/useOnboarding';
import OnboardingModal from '@/shared/OnboardingModal';
import OnboardingTour from '@/shared/OnboardingTour';
import type { TourStep } from '@/shared/OnboardingTour';

const PASOS_ADMIN: TourStep[] = [
  { targetId: 'tab-admin-dashboard',  titulo: 'Dashboard',    descripcion: 'Ve de un vistazo los lotes activos, pedidos en curso y pagos pendientes del marketplace.' },
  { targetId: 'tab-admin-pagos',      titulo: 'Pagos',        descripcion: 'Verifica transferencias de cafeterías y distribuye los pagos al caficultor y al laboratorio.' },
  { targetId: 'tab-admin-logistica',  titulo: 'Logística',    descripcion: 'Kanban de pedidos activos: mueve de Origen → Tránsito → Hub Lima → Entregado.' },
  { targetId: 'tab-admin-muestras',   titulo: 'Muestras hub', descripcion: 'Solicita muestras a caficultores, confirma recepción y despacha a cafeterías desde el hub Lima.' },
];

const C = {
  green: '#1f3028', cream: '#f2e0cc', terra: '#c96e4b',
  sage: '#8faf8a', tan: '#c4b297', brown: '#533b22',
};

type FiltroPeriodo = 'hoy' | 'semana' | 'mes' | 'todo';

function filtrarPorFecha<T extends { createdAt?: string; despachadoAt?: string; confirmadoAt?: string; pagoCaficultorAt?: string; pagoLaboratorioAt?: string }>(
  items: T[],
  periodo: FiltroPeriodo,
  campo: keyof T = 'createdAt' as keyof T,
): T[] {
  if (periodo === 'todo') return items;
  const ahora = new Date();
  const inicio = new Date();
  if (periodo === 'hoy') { inicio.setHours(0, 0, 0, 0); }
  else if (periodo === 'semana') { inicio.setDate(ahora.getDate() - 7); }
  else if (periodo === 'mes') { inicio.setDate(1); inicio.setHours(0, 0, 0, 0); }
  return items.filter(item => {
    const val = item[campo] as string | undefined;
    if (!val) return false;
    return new Date(val) >= inicio;
  });
}

function FiltroPeriodoBar({ valor, onChange }: { valor: FiltroPeriodo; onChange: (v: FiltroPeriodo) => void }) {
  const opciones: { key: FiltroPeriodo; label: string }[] = [
    { key: 'hoy',    label: 'Hoy' },
    { key: 'semana', label: '7 días' },
    { key: 'mes',    label: 'Este mes' },
    { key: 'todo',   label: 'Todo' },
  ];
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
      {opciones.map(op => (
        <button key={op.key} onClick={() => onChange(op.key)} style={{
          background: valor === op.key ? C.brown : 'white',
          color: valor === op.key ? C.cream : C.tan,
          border: `1px solid ${C.tan}40`, borderRadius: 20,
          padding: '4px 12px', fontFamily: 'Montserrat', fontSize: 11,
          fontWeight: valor === op.key ? 700 : 400, cursor: 'pointer',
        }}>
          {op.label}
        </button>
      ))}
    </div>
  );
}

const KANBAN_COLS = [
  { key: 'en_origen',   label: 'En Origen',   color: C.brown },
  { key: 'en_transito', label: 'En Tránsito',  color: '#d6b15a' },
  { key: 'entregado',   label: 'Entregado ✓',  color: '#4caf50' },
];

const KANBAN_MUESTRAS_COLS = [
  { key: 'solicitada',             label: 'Solicitada',       color: C.brown },
  { key: 'confirmada_caficultor',  label: 'En camino',        color: '#d6b15a' },
  { key: 'recibida_hub',           label: 'Recibida en hub',  color: C.sage },
];

export type AdminTab = 'dashboard' | 'pagos' | 'logistica' | 'reservas' | 'laboratorios' | 'muestras';

export default function AdminPanel({ tabActivo, modoEmbebido, onLogout }: { tabActivo?: AdminTab; modoEmbebido?: boolean; onLogout?: () => void }) {
  const isMobile = useIsMobile();
  const { fase: onbFase, iniciarTour, completar: completarOnb } = useOnboarding('admin', 'admin');
  const [tab, setTab] = useState<AdminTab>('dashboard');

  useEffect(() => {
    if (tabActivo && tabActivo !== tab) setTab(tabActivo);
  }, [tabActivo]);
  const [todosLotes, setTodosLotes] = useState<LoteDoc[]>([]);
  const [pedidos, setPedidos] = useState<PedidoB2BDoc[]>([]);
  const [solicitudesMuestra, setSolicitudesMuestra] = useState<SolicitudMuestraDoc[]>([]);
  const [despachando, setDespachando] = useState<string | null>(null);
  const [liberando, setLiberando] = useState<string | null>(null);
  const [verificando, setVerificando] = useState<string | null>(null);
  const [pagando, setPagando] = useState<string | null>(null);
  const [laboratorios, setLaboratorios] = useState<LaboratorioDoc[]>([]);
  const [cafeterias, setCafeterias] = useState<PerfilCafeteria[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);
  const [solicitudesHub, setSolicitudesHub] = useState<SolicitudHubDoc[]>([]);
  const [solicitudesCert, setSolicitudesCert] = useState<SolicitudCertificacionDoc[]>([]);
  const [confirmandoRecepcion, setConfirmandoRecepcion] = useState<string | null>(null);
  const [confirmandoHubInicial, setConfirmandoHubInicial] = useState<string | null>(null);
  const [hubRecepcionForm, setHubRecepcionForm] = useState<Record<string, string>>({});
  const [despachoForm, setDespachoForm] = useState<Record<string, { courier: string; guia: string }>>({});
  const [subTabMuestras, setSubTabMuestras] = useState<'despachar' | 'recibir'>('despachar');
  const [subTabPagos, setSubTabPagos] = useState<'verificar' | 'distribuir' | 'fees_lab'>('verificar');
  const [subTabLogistica, setSubTabLogistica] = useState<'kanban' | 'muestras' | 'reservas'>('kanban');
  const [kanbanColExpandida, setKanbanColExpandida] = useState<Record<string, boolean>>({});
  const [pagandoCert, setPagandoCert] = useState<string | null>(null);
  const [filtroDespachar, setFiltroDespachar] = useState<FiltroPeriodo>('todo');
  const [filtroRecibir, setFiltroRecibir] = useState<FiltroPeriodo>('todo');
  const [filtroPagosVerificar, setFiltroPagosVerificar] = useState<FiltroPeriodo>('todo');
  const [filtroPagosDistribuir, setFiltroPagosDistribuir] = useState<FiltroPeriodo>('todo');
  const [filtroFeesLab, setFiltroFeesLab] = useState<FiltroPeriodo>('todo');
  const [filtroLogistica, setFiltroLogistica] = useState<FiltroPeriodo>('todo');
  const [filtroReservas, setFiltroReservas] = useState<FiltroPeriodo>('todo');

  useEffect(() => {
    Promise.allSettled([fetchMktLotes(), fetchMktPedidos(), fetchMktLaboratorios(), fetchCafeterias(), fetchMktSolicitudesPendientesDespacho(), fetchSolicitudesHub(), fetchMktSolicitudesCertificacionAll()]).then(
      ([lotesR, pedsR, labsR, cafsR, solsR, hubsR, certsR]) => {
        if (lotesR.status === 'rejected') console.error('[Admin] mkt_lotes:', lotesR.reason);
        if (pedsR.status === 'rejected') console.error('[Admin] mkt_pedidos:', pedsR.reason);
        if (labsR.status === 'rejected') console.error('[Admin] mkt_laboratorios:', labsR.reason);
        if (cafsR.status === 'rejected') console.error('[Admin] mkt_usuarios/cafeterias:', cafsR.reason);
        if (solsR.status === 'rejected') console.error('[Admin] mkt_solicitudes_muestra:', solsR.reason);
        if (lotesR.status === 'fulfilled') setTodosLotes(lotesR.value);
        if (pedsR.status === 'fulfilled') setPedidos(pedsR.value);
        if (labsR.status === 'fulfilled') setLaboratorios(labsR.value);
        if (cafsR.status === 'fulfilled') setCafeterias(cafsR.value);
        if (solsR.status === 'fulfilled') setSolicitudesMuestra(solsR.value);
        if (hubsR.status === 'fulfilled') setSolicitudesHub(hubsR.value);
        if (certsR.status === 'fulfilled') setSolicitudesCert(certsR.value);
      }
    );
  }, []);

  // G-03: Despacho de muestras desde hub Lima — lo hace el admin, no el caficultor (RN-HUB-03)
  async function handleDespacharMuestra(sol: SolicitudMuestraDoc) {
    const form = despachoForm[sol.id];
    if (!form?.courier?.trim() || !form?.guia?.trim()) return;
    setDespachando(sol.id);
    await despacharMuestraHub(sol.id, sol.loteId, form.courier.trim(), form.guia.trim());
    setSolicitudesMuestra(prev => prev.map(s => s.id === sol.id ? { ...s, status: 'despachada' } : s));
    setDespachoForm(f => { const n = { ...f }; delete n[sol.id]; return n; });
    setDespachando(null);
  }

  // Flujo D: Admin solicita muestras al caficultor (RN-HUB-SOL-01)
  // Flujo D: Admin confirma que el hub recibió las muestras (RN-HUB-SOL-05)
  async function handleConfirmarRecepcionHub(solicitud: SolicitudHubDoc) {
    const cantidadRecibida = Number(hubRecepcionForm[solicitud.id] ?? solicitud.cantidadSolicitada);
    setConfirmandoRecepcion(solicitud.id);
    await confirmarRecepcionHub(solicitud.id, solicitud.loteId, cantidadRecibida, solicitud.caficultorId);
    const nuevas = await fetchSolicitudesHub();
    setSolicitudesHub(nuevas);
    const lotesActualizados = await fetchMktLotes();
    setTodosLotes(lotesActualizados);
    setHubRecepcionForm(f => ({ ...f, [solicitud.id]: '' }));
    setConfirmandoRecepcion(null);
  }

  // Hub inicial: Admin confirma recepción de muestras declaradas por el caficultor al publicar
  async function handleConfirmarRecepcionHubInicial(lote: LoteDoc) {
    setConfirmandoHubInicial(lote.id);
    await confirmarRecepcionHubInicial(lote.id, lote.caficultorId);
    const lotesActualizados = await fetchMktLotes();
    setTodosLotes(lotesActualizados);
    setConfirmandoHubInicial(null);
  }
  // Flujo C: Admin paga el fee de certificación al laboratorio
  async function handlePagarFeeCertificacion(cert: SolicitudCertificacionDoc) {
    setPagandoCert(cert.id);
    await updatePagoCertificacion(cert.id, { pagoLaboratorioStatus: 'pagado', pagoLaboratorioAt: new Date().toISOString() });
    if (cert.laboratorioId) {
      saveNotif(cert.laboratorioId, {
        titulo: '💰 Fee de catación pagado',
        cuerpo: `Tunay Wasi te transfirió S/ ${cert.feeCatacionPEN} por la certificación del lote ${cert.nombreLote}.`,
        url: 'mis_catas',
      }).catch(() => {});
    }
    setSolicitudesCert(prev => prev.map(c => c.id === cert.id ? { ...c, pagoLaboratorioStatus: 'pagado' } : c));
    setPagandoCert(null);
  }

  async function handleLiberarReserva(ped: PedidoB2BDoc) {
    setLiberando(ped.id);
    await liberarReservaPedido(ped.id, ped.loteId, ped.sacosSolicitados);
    saveNotif(ped.tostadoraId, {
      titulo: '❌ Reserva liberada',
      cuerpo: `El pago del pedido ${ped.id} no fue confirmado a tiempo`,
      url: 'pedidos',
    }).catch(() => {});
    setPedidos(prev => prev.map(p => p.id === ped.id ? { ...p, pagoStatus: 'rechazado', logisticaStatus: 'cancelado' } : p));
    setLiberando(null);
  }

  async function handleVerificarPago(ped: PedidoB2BDoc) {
    setVerificando(ped.id);
    await verificarPagoPedido(ped.id);
    saveNotif(ped.tostadoraId, {
      titulo: '✅ Pago verificado',
      cuerpo: `Pedido ${ped.id} confirmado — en preparación para despacho`,
      url: 'pedidos',
    }).catch(() => {});
    saveNotif(ped.caficultorId, {
      titulo: '☕ Pedido confirmado',
      cuerpo: `${ped.razonSocial} confirmó el pago de ${ped.sacosSolicitados} saco${ped.sacosSolicitados !== 1 ? 's' : ''}`,
      url: 'mis_pagos',
    }).catch(() => {});
    setPedidos(prev => prev.map(p => p.id === ped.id ? { ...p, pagoStatus: 'verificado', logisticaStatus: 'en_origen' } : p));
    setVerificando(null);
  }

  async function handlePagarCaficultor(ped: PedidoB2BDoc) {
    setPagando(ped.id);
    await marcarPagoCaficultor(ped.id);
    saveNotif(ped.caficultorId, {
      titulo: '💰 Pago recibido',
      cuerpo: `Tu liquidación del pedido ${ped.id} fue procesada`,
      url: 'mis_pagos',
    }).catch(() => {});
    setPedidos(prev => prev.map(p => p.id === ped.id ? { ...p, pagoCaficultorStatus: 'pagado' } : p));
    setPagando(null);
  }

  async function handleToggleLab(uid: string, actual: boolean) {
    setToggling(uid);
    await toggleTieneLaboratorio(uid, !actual);
    setCafeterias(prev => prev.map(c => c.uid === uid ? { ...c, tieneLaboratorio: !actual } : c));
    setToggling(null);
  }

  const now = Date.now();
  const reservasVencidas = pedidos.filter(p =>
    p.pagoStatus === 'pendiente' && new Date(p.reservaExpiraAt).getTime() < now
  );
  const reservasPendientes = pedidos.filter(p =>
    p.pagoStatus === 'pendiente' && new Date(p.reservaExpiraAt).getTime() >= now
  );

  return (
    <div style={{ background: '#f0ebe4', minHeight: '100vh' }}>

      {/* Onboarding — primera vez */}
      {onbFase === 'modal' && (
        <OnboardingModal rol="admin" nombre="Administrador" onEmpezarTour={iniciarTour} onSaltar={completarOnb} />
      )}
      {onbFase === 'tour' && (
        <OnboardingTour pasos={PASOS_ADMIN} onFin={completarOnb} onSaltar={completarOnb} />
      )}

      {/* Header admin — oculto en modo embebido (AppMarketplace ya tiene nav) */}
      {!modoEmbebido && (
      <div style={{ background: C.brown, padding: isMobile ? '14px 16px' : '20px 28px', color: C.cream }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? 12 : 16 }}>
          <div>
            <p style={{ fontFamily: 'Montserrat', fontSize: 10, letterSpacing: 3, color: C.brown, margin: '0 0 2px', textTransform: 'uppercase' }}>
              Panel Administrador
            </p>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: isMobile ? 18 : 22, margin: 0, color: C.cream }}>
              Tunay Wasi · Hub Lima
            </h2>
          </div>
          {onLogout && (
            <button onClick={onLogout} style={{
              background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8,
              color: C.cream, fontFamily: 'Montserrat', fontSize: 11, fontWeight: 600,
              padding: '8px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              {isMobile ? '↪' : 'Cerrar sesión'}
            </button>
          )}
        </div>
        <div className="tw-admin-tabs" style={{ display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch' as unknown as undefined, scrollbarWidth: 'none' }}>
          {([
            { key: 'dashboard',    label: isMobile ? '📊' : 'Dashboard',       labelFull: 'Dashboard' },
            { key: 'muestras',     label: isMobile ? '📦' : 'Muestras hub',    labelFull: 'Muestras hub', badge: solicitudesMuestra.filter(s => s.status === 'pendiente').length },
            { key: 'pagos',        label: isMobile ? '💳' : 'Pagos',           labelFull: 'Pagos', badge: pedidos.filter(p => p.pagoStatus === 'pendiente' || p.pagoStatus === 'en_revision').length },
            { key: 'logistica',    label: isMobile ? '🚚' : 'Logística',       labelFull: 'Logística' },
            { key: 'laboratorios', label: isMobile ? '🔬' : 'Laboratorios',    labelFull: 'Laboratorios' },
          ] as { key: AdminTab; label: string; labelFull: string; badge?: number }[]).map(t => (
            <button key={t.key} id={`tab-admin-${t.key}`} onClick={() => setTab(t.key)} style={{
              background: tab === t.key ? C.terra : 'rgba(255,255,255,0.12)',
              color: 'white', border: 'none', borderRadius: 8,
              padding: isMobile ? '10px 12px' : '8px 14px',
              fontFamily: 'Montserrat', fontSize: isMobile ? 11 : 12,
              fontWeight: tab === t.key ? 700 : 400, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              flexShrink: 0, whiteSpace: 'nowrap',
              minHeight: isMobile ? 40 : 36,
            }}>
              {isMobile ? t.label : t.labelFull}
              {(t.badge ?? 0) > 0 && (
                <span style={{ background: 'white', color: C.terra, borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '20px 16px 24px' : '28px 24px' }}>

        {/* DASHBOARD */}
        {tab === 'dashboard' && (() => {
          const nMuestrasDespachar = solicitudesMuestra.filter(s => s.status === 'pendiente').length;
          const nPagosVerificar = pedidos.filter(p => p.pagoStatus === 'pendiente' || p.pagoStatus === 'en_revision').length;
          const nPagosDistribuir = pedidos.filter(p => p.pagoStatus === 'verificado' && p.pagoCaficultorStatus === 'pendiente' && (p.logisticaStatus === 'en_transito' || p.logisticaStatus === 'entregado')).length;
          const nReservasVencidas = reservasVencidas.length;
          const nPorEntregarAdmin = pedidos.filter(p => p.pagoStatus === 'verificado' && p.logisticaStatus === 'en_transito').length;

          const acciones = [
            { n: nMuestrasDespachar, label: 'Muestras por despachar',      desc: 'Cafeterías esperan muestra del hub',       tab: 'muestras'   as AdminTab, color: C.terra },
            { n: nPagosVerificar,    label: 'Comprobantes por verificar',   desc: 'Transferencias subidas sin confirmar',     tab: 'pagos'      as AdminTab, color: '#8a6fc9' },
            { n: nPagosDistribuir,   label: 'Pagos por distribuir',         desc: 'Pedidos entregados sin pagar al origen',   tab: 'pagos'      as AdminTab, color: C.sage },
            { n: nReservasVencidas,  label: 'Reservas vencidas',            desc: 'Sacos bloqueados esperando liberación',    tab: 'logistica'  as AdminTab, color: '#c0392b' },
            { n: nPorEntregarAdmin,  label: 'Entregas por confirmar',       desc: 'Pedidos en tránsito sin marcar entregado', tab: 'logistica'  as AdminTab, color: '#d6b15a' },
          ];
          const hayPendientes = acciones.some(a => a.n > 0);

          return (
          <div>
            {!hayPendientes ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.sage, margin: 0 }}>Todo al día</p>
                <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, marginTop: 8 }}>No hay acciones pendientes en este momento.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {acciones.filter(a => a.n > 0).map(a => (
                  <div key={a.label} style={{
                    background: 'white', borderRadius: 12, padding: '18px 22px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
                    borderLeft: `4px solid ${a.color}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{
                        fontFamily: 'Cormorant Garamond', fontSize: 36, fontWeight: 700,
                        color: a.color, lineHeight: 1, minWidth: 40, textAlign: 'center',
                      }}>
                        {a.n}
                      </span>
                      <div>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, color: C.brown, margin: '0 0 2px' }}>{a.label}</p>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, margin: 0 }}>{a.desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setTab(a.tab)}
                      style={{
                        background: a.color, color: 'white', border: 'none', borderRadius: 8,
                        padding: '8px 16px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700,
                        cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      Ir →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          );
        })()}

        {/* PAGOS */}
        {tab === 'pagos' && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 20 }}>
              Pagos
            </h2>

            {/* Sub-tab bar */}
            {(() => {
              const porVerificar = pedidos.filter(p => p.pagoStatus === 'pendiente' || p.pagoStatus === 'en_revision').length;
              const porDistribuir = pedidos.filter(p => p.pagoStatus === 'verificado' && p.pagoCaficultorStatus === 'pendiente' && (p.logisticaStatus === 'en_transito' || p.logisticaStatus === 'entregado')).length;
              const feesLab = solicitudesCert.filter(c => c.pagoStatus === 'verificado' && c.pagoLaboratorioStatus === 'pendiente').length;
              const SUB_TABS = [
                { key: 'verificar'   as const, label: 'Por verificar',   badge: porVerificar },
                { key: 'distribuir'  as const, label: 'Distribuir',      badge: porDistribuir },
                { key: 'fees_lab'    as const, label: 'Fees lab',        badge: feesLab },
              ];
              return (
                <div style={{ display: 'flex', gap: 4, borderBottom: `2px solid #e8e0d8`, marginBottom: 24 }}>
                  {SUB_TABS.map(st => (
                    <button key={st.key} onClick={() => setSubTabPagos(st.key)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '8px 16px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: subTabPagos === st.key ? 700 : 400,
                      color: subTabPagos === st.key ? C.terra : C.tan,
                      borderBottom: `3px solid ${subTabPagos === st.key ? C.terra : 'transparent'}`,
                      marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                    }}>
                      {st.label}
                      {st.badge > 0 && (
                        <span style={{ background: subTabPagos === st.key ? C.terra : C.tan, color: 'white', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>
                          {st.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              );
            })()}

            {/* Pestaña: Por verificar */}
            {subTabPagos === 'verificar' && (
              <div>
                <FiltroPeriodoBar valor={filtroPagosVerificar} onChange={setFiltroPagosVerificar} />
                <div style={{ display: 'grid', gap: 12 }}>
                  {(() => {
                    const items = filtrarPorFecha(pedidos.filter(p => p.pagoStatus === 'pendiente' || p.pagoStatus === 'en_revision'), filtroPagosVerificar, 'createdAt');
                    return items.length === 0 ? (
                      <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, padding: '40px 0', textAlign: 'center' }}>No hay comprobantes pendientes de verificar.</p>
                    ) : items.map(p => (
                      <div key={p.id} style={{ background: 'white', borderRadius: 12, padding: '18px 22px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: `1px solid ${p.pagoStatus === 'en_revision' ? '#c5a8f060' : `${C.tan}40`}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>{p.id}</p>
                              <span style={{
                                background: p.pagoStatus === 'en_revision' ? '#8a6fc920' : '#fff3e0',
                                color: p.pagoStatus === 'en_revision' ? '#8a6fc9' : '#e65100',
                                fontFamily: 'Montserrat', fontSize: 9, fontWeight: 700,
                                padding: '2px 7px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: 0.5,
                              }}>
                                {p.pagoStatus === 'en_revision' ? 'Comprobante subido' : 'Esperando comprobante'}
                              </span>
                            </div>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, color: C.brown, margin: '0 0 4px' }}>
                              {p.razonSocial} — {p.sacosSolicitados} saco{p.sacosSolicitados !== 1 ? 's' : ''} · Lote: {p.loteId}
                            </p>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown, margin: '0 0 4px' }}>
                              Total: <strong style={{ color: C.brown }}>S/ {p.totalPEN.toLocaleString()}</strong>
                              {p.feeLaboratorioPEN ? ` (incluye S/ ${p.feeLaboratorioPEN} lab)` : ''}
                            </p>
                            {p.comprobanteUrl && (
                              <a href={p.comprobanteUrl} target="_blank" rel="noreferrer" style={{ fontFamily: 'Montserrat', fontSize: 11, color: '#8a6fc9', fontWeight: 700 }}>
                                🧾 Ver comprobante →
                              </a>
                            )}
                            {p.voucherSubidoAt && (
                              <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, margin: '4px 0 0' }}>
                                Subido: {new Date(p.voucherSubidoAt).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleVerificarPago(p)}
                            disabled={verificando === p.id || p.pagoStatus === 'pendiente'}
                            title={p.pagoStatus === 'pendiente' ? 'Esperando que la cafetería suba el comprobante' : ''}
                            style={{ background: verificando === p.id || p.pagoStatus === 'pendiente' ? '#ccc' : C.terra, color: 'white', border: 'none', borderRadius: 8, padding: '10px 18px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, cursor: verificando === p.id || p.pagoStatus === 'pendiente' ? 'not-allowed' : 'pointer' }}>
                            {verificando === p.id ? 'Verificando...' : '✓ Verificar pago'}
                          </button>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* Pestaña: Distribuir */}
            {subTabPagos === 'distribuir' && (
              <div>
                <FiltroPeriodoBar valor={filtroPagosDistribuir} onChange={setFiltroPagosDistribuir} />
                <div style={{ display: 'grid', gap: 12 }}>
                  {(() => {
                    const items = filtrarPorFecha(
                      pedidos.filter(p => p.pagoStatus === 'verificado' && p.pagoCaficultorStatus === 'pendiente' && (p.logisticaStatus === 'en_transito' || p.logisticaStatus === 'entregado')),
                      filtroPagosDistribuir, 'createdAt',
                    );
                    return items.length === 0 ? (
                      <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, padding: '40px 0', textAlign: 'center' }}>No hay pagos pendientes. Se habilitan cuando el caficultor sube la guía de envío.</p>
                    ) : items.map(p => (
                      <div key={p.id} style={{ background: 'white', borderRadius: 12, padding: '18px 22px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: `1px solid ${C.sage}30` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                          <div>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>{p.id}</p>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, color: C.brown, margin: '0 0 6px' }}>
                              Lote: {p.loteId} · {p.sacosSolicitados} sacos
                            </p>
                            <div style={{ display: 'flex', gap: 16 }}>
                              <div style={{ background: '#f7f3ee', borderRadius: 8, padding: '8px 14px' }}>
                                <p style={{ fontFamily: 'Montserrat', fontSize: 9, color: C.brown, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>Caficultor</p>
                                <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 18, fontWeight: 700, color: C.brown, margin: 0 }}>S/ {p.montoCaficultorPEN.toLocaleString()}</p>
                              </div>
                              {p.feeLaboratorioPEN && (
                                <div style={{ background: '#f0ebe4', borderRadius: 8, padding: '8px 14px' }}>
                                  <p style={{ fontFamily: 'Montserrat', fontSize: 9, color: C.brown, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>Laboratorio</p>
                                  <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 18, fontWeight: 700, color: C.brown, margin: 0 }}>S/ {p.feeLaboratorioPEN.toLocaleString()}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <button onClick={() => handlePagarCaficultor(p)} disabled={pagando === p.id} style={{ background: pagando === p.id ? '#ccc' : C.sage, color: 'white', border: 'none', borderRadius: 8, padding: '10px 18px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, cursor: pagando === p.id ? 'not-allowed' : 'pointer' }}>
                            {pagando === p.id ? 'Registrando...' : '✓ Marcar pagado'}
                          </button>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* Pestaña: Fees lab */}
            {subTabPagos === 'fees_lab' && (
              <div>
                <FiltroPeriodoBar valor={filtroFeesLab} onChange={setFiltroFeesLab} />
                <div style={{ display: 'grid', gap: 10 }}>
                  {(() => {
                    const items = filtrarPorFecha(
                      solicitudesCert.filter(c => c.pagoStatus === 'verificado' && c.pagoLaboratorioStatus === 'pendiente'),
                      filtroFeesLab, 'createdAt',
                    );
                    return items.length === 0 ? (
                      <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, padding: '40px 0', textAlign: 'center' }}>No hay fees de certificación pendientes.</p>
                    ) : items.map(cert => {
                      const lab = laboratorios.find(l => l.id === cert.laboratorioId);
                      return (
                        <div key={cert.id} style={{ background: 'white', borderRadius: 12, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #8a6fc930', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                          <div>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>{cert.id}</p>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, color: C.brown, margin: '0 0 4px' }}>{cert.nombreLote}</p>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown, margin: 0 }}>
                              Lab: <strong>{lab?.nombreComercial ?? cert.laboratorioId}</strong> · Fee: <strong style={{ color: C.brown }}>S/ {cert.feeCatacionPEN}</strong>
                            </p>
                          </div>
                          <button onClick={() => handlePagarFeeCertificacion(cert)} disabled={pagandoCert === cert.id} style={{ background: pagandoCert === cert.id ? '#ccc' : '#8a6fc9', color: 'white', border: 'none', borderRadius: 8, padding: '10px 18px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, cursor: pagandoCert === cert.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                            {pagandoCert === cert.id ? 'Registrando...' : '✓ Pagar fee al lab'}
                          </button>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MUESTRAS HUB */}
        {tab === 'muestras' && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 20 }}>
              Hub de muestras Lima
            </h2>

            {/* Sub-tab bar */}
            {(() => {
              const pendientesDespacho = solicitudesMuestra.filter(s => s.status === 'pendiente').length;
              const pendientesRecibir = solicitudesHub.filter(h => h.status === 'confirmada_caficultor').length
                + todosLotes.filter(l => l.muestraEnCamino).length;
              const SUB_TABS = [
                { key: 'despachar' as const, label: 'Despachar a cafetería', badge: pendientesDespacho },
                { key: 'recibir'   as const, label: 'Recibir del caficultor', badge: pendientesRecibir },
              ];
              return (
                <div style={{ display: 'flex', gap: 4, borderBottom: `2px solid #e8e0d8`, marginBottom: 24 }}>
                  {SUB_TABS.map(st => (
                    <button key={st.key} onClick={() => setSubTabMuestras(st.key as typeof subTabMuestras)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '8px 16px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: subTabMuestras === st.key ? 700 : 400,
                      color: subTabMuestras === st.key ? C.terra : C.tan,
                      borderBottom: `3px solid ${subTabMuestras === st.key ? C.terra : 'transparent'}`,
                      marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                    }}>
                      {st.label}
                      {st.badge > 0 && (
                        <span style={{ background: subTabMuestras === st.key ? C.terra : C.tan, color: 'white', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>
                          {st.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              );
            })()}

            {/* Sub-tab: Despachar a cafetería */}
            {subTabMuestras === 'despachar' && (
              <div>
                {/* Pendientes */}
                {solicitudesMuestra.filter(s => s.status === 'pendiente').length === 0 ? (
                  <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, padding: '24px 0', textAlign: 'center' }}>
                    No hay solicitudes pendientes de despacho.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gap: 8, marginBottom: 28 }}>
                    {solicitudesMuestra.filter(s => s.status === 'pendiente').map(sol => {
                      const lote = todosLotes.find(l => l.id === sol.loteId);
                      const sinStock = (lote?.stockMuestrasHub ?? 0) === 0;
                      const form = despachoForm[sol.id] ?? { courier: '', guia: '' };
                      const listo = form.courier.trim() && form.guia.trim() && !sinStock;
                      return (
                        <div key={sol.id} style={{ background: 'white', borderRadius: 10, padding: '14px 18px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', borderLeft: `4px solid ${C.terra}` }}>
                          <div style={{ marginBottom: 10 }}>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: C.brown, margin: '0 0 2px' }}>
                              {sol.empresa ?? sol.tostadoraId}
                            </p>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, margin: 0 }}>
                              {sol.id} · {sol.loteId}
                              {sinStock && <span style={{ color: C.terra, marginLeft: 8 }}>· Sin stock</span>}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <select
                              value={form.courier}
                              onChange={e => setDespachoForm(f => ({ ...f, [sol.id]: { ...form, courier: e.target.value } }))}
                              style={{ flex: 1, minWidth: 120, padding: '7px 10px', border: `1px solid ${C.tan}40`, borderRadius: 6, fontFamily: 'Montserrat', fontSize: 12, color: form.courier ? C.brown : C.tan }}
                            >
                              <option value="">Courier…</option>
                              {['Shalom', 'Olva', 'Cruz del Sur', 'Otro'].map(op => <option key={op} value={op}>{op}</option>)}
                            </select>
                            <input
                              placeholder="Nº guía"
                              value={form.guia}
                              onChange={e => setDespachoForm(f => ({ ...f, [sol.id]: { ...form, guia: e.target.value } }))}
                              style={{ flex: 1, minWidth: 100, padding: '7px 10px', border: `1px solid ${C.tan}40`, borderRadius: 6, fontFamily: 'Montserrat', fontSize: 12, color: C.brown }}
                            />
                            <button
                              onClick={() => handleDespacharMuestra(sol)}
                              disabled={!listo || despachando === sol.id}
                              style={{ background: listo ? C.terra : '#ccc', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, cursor: listo && despachando !== sol.id ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}
                            >
                              {despachando === sol.id ? '...' : 'Despachar →'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Historial despachadas */}
                {solicitudesMuestra.filter(s => s.status === 'despachada').length > 0 && (() => {
                  const despachadas = filtrarPorFecha(
                    solicitudesMuestra.filter(s => s.status === 'despachada'),
                    filtroDespachar,
                    'createdAt',
                  );
                  return (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.brown, margin: 0 }}>
                          Despachadas ({despachadas.length})
                        </p>
                        <FiltroPeriodoBar valor={filtroDespachar} onChange={setFiltroDespachar} />
                      </div>
                      {despachadas.length === 0 ? (
                        <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown, textAlign: 'center', padding: '16px 0' }}>Sin registros en este período.</p>
                      ) : (
                        <div style={{ display: 'grid', gap: 6 }}>
                          {despachadas.map(sol => (
                            <div key={sol.id} style={{ background: 'white', borderRadius: 8, padding: '10px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', borderLeft: `3px solid ${C.sage}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <p style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 600, color: C.brown, margin: '0 0 2px' }}>{sol.empresa ?? sol.tostadoraId}</p>
                                <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, margin: 0 }}>
                                  {sol.id} · {sol.loteId}
                                  {(sol as SolicitudMuestraDoc & { empresaCourier?: string; numeroGuia?: string }).empresaCourier && ` · ${(sol as SolicitudMuestraDoc & { empresaCourier?: string; numeroGuia?: string }).empresaCourier} ${(sol as SolicitudMuestraDoc & { empresaCourier?: string; numeroGuia?: string }).numeroGuia ?? ''}`}
                                </p>
                              </div>
                              <span style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.sage, fontWeight: 700 }}>Despachada ✓</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Sub-tab: Recibir del caficultor */}
            {subTabMuestras === 'recibir' && (
              <div>
                {/* Pendientes de confirmación */}
                {solicitudesHub.filter(h => h.status === 'confirmada_caficultor').length === 0
                  && todosLotes.filter(l => l.muestraEnCamino && !solicitudesHub.some(h => h.loteId === l.id && h.status === 'confirmada_caficultor')).length === 0 && (
                  <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, padding: '24px 0', textAlign: 'center' }}>
                    No hay muestras en camino al hub.
                  </p>
                )}
                <div style={{ display: 'grid', gap: 8, marginBottom: solicitudesHub.filter(h => h.status === 'recibida_hub').length > 0 ? 28 : 0 }}>
                  {/* Flujo D: solicitudes hub confirmadas por caficultor */}
                  {solicitudesHub.filter(h => h.status === 'confirmada_caficultor').map(hub => {
                    const lote = todosLotes.find(l => l.id === hub.loteId);
                    return (
                      <div key={hub.id} style={{ background: 'white', borderRadius: 10, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', borderLeft: `4px solid #d6b15a`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <div>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: C.brown, margin: '0 0 2px' }}>{lote?.nombreLote ?? hub.loteId}</p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, margin: 0 }}>
                            {hub.id} · {hub.cantidadSolicitada} muestra{hub.cantidadSolicitada !== 1 ? 's' : ''}
                            {hub.empresaCourier ? ` · ${hub.empresaCourier}` : ''}{hub.numeroGuia ? ` · Guía: ${hub.numeroGuia}` : ''}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <select value={hubRecepcionForm[hub.id] ?? String(hub.cantidadSolicitada)} onChange={e => setHubRecepcionForm(f => ({ ...f, [hub.id]: e.target.value }))} style={{ padding: '7px 10px', border: `1px solid ${C.tan}40`, borderRadius: 6, fontFamily: 'Montserrat', fontSize: 12, color: C.brown }}>
                            {[1,2,3].filter(n => n <= hub.cantidadSolicitada).map(n => (
                              <option key={n} value={n}>{n} recibida{n > 1 ? 's' : ''}</option>
                            ))}
                          </select>
                          <button onClick={() => handleConfirmarRecepcionHub(hub)} disabled={confirmandoRecepcion === hub.id} style={{ background: confirmandoRecepcion === hub.id ? '#ccc' : C.sage, color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, cursor: confirmandoRecepcion === hub.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                            {confirmandoRecepcion === hub.id ? '...' : 'Confirmar →'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {/* Flujo 2: muestras declaradas al publicar — solo si NO hay SolicitudHub activa para ese lote */}
                  {todosLotes.filter(l => l.muestraEnCamino && !solicitudesHub.some(h => h.loteId === l.id && h.status === 'confirmada_caficultor')).map(lote => (
                    <div key={lote.id} style={{ background: 'white', borderRadius: 10, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', borderLeft: `4px solid #8a6fc9`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: C.brown, margin: '0 0 2px' }}>{lote.nombreLote}</p>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, margin: 0 }}>
                          {lote.cantidadMuestrasDeclarada ?? 0} muestras declaradas
                          {lote.courierMuestrasHub ? ` · ${lote.courierMuestrasHub}` : ''}{lote.guiaMuestrasHub ? ` · Guía: ${lote.guiaMuestrasHub}` : ''}
                        </p>
                      </div>
                      <button onClick={() => handleConfirmarRecepcionHubInicial(lote)} disabled={confirmandoHubInicial === lote.id} style={{ background: confirmandoHubInicial === lote.id ? '#ccc' : '#8a6fc9', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, cursor: confirmandoHubInicial === lote.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                        {confirmandoHubInicial === lote.id ? '...' : 'Confirmar →'}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Historial recibidas */}
                {solicitudesHub.filter(h => h.status === 'recibida_hub').length > 0 && (() => {
                  const recibidas = filtrarPorFecha(
                    solicitudesHub.filter(h => h.status === 'recibida_hub'),
                    filtroRecibir,
                    'createdAt',
                  );
                  return (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.brown, margin: 0 }}>
                          Recibidas ({recibidas.length})
                        </p>
                        <FiltroPeriodoBar valor={filtroRecibir} onChange={setFiltroRecibir} />
                      </div>
                      {recibidas.length === 0 ? (
                        <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown, textAlign: 'center', padding: '16px 0' }}>Sin registros en este período.</p>
                      ) : (
                        <div style={{ display: 'grid', gap: 6 }}>
                          {recibidas.map(hub => {
                            const lote = todosLotes.find(l => l.id === hub.loteId);
                            return (
                              <div key={hub.id} style={{ background: 'white', borderRadius: 8, padding: '10px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', borderLeft: `3px solid ${C.sage}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <p style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 600, color: C.brown, margin: '0 0 2px' }}>{lote?.nombreLote ?? hub.loteId}</p>
                                  <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, margin: 0 }}>
                                    {hub.id} · {hub.cantidadRecibida ?? hub.cantidadSolicitada} recibidas
                                  </p>
                                </div>
                                <span style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.sage, fontWeight: 700 }}>Recibida ✓</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
        {tab === 'logistica' && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 6 }}>
              Logística
            </h2>

            {/* Sub-tab bar */}
            <div style={{ display: 'flex', borderBottom: `2px solid ${C.tan}30`, marginBottom: 24, gap: 2 }}>
              {([
                { key: 'kanban',   label: 'Kanban pedidos' },
                { key: 'muestras', label: 'Kanban muestras' },
                { key: 'reservas', label: 'Reservas', badge: reservasVencidas.length },
              ] as { key: 'kanban' | 'muestras' | 'reservas'; label: string; badge?: number }[]).map(st => (
                <button key={st.key} onClick={() => setSubTabLogistica(st.key)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '8px 16px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: subTabLogistica === st.key ? 700 : 400,
                  color: subTabLogistica === st.key ? C.terra : C.tan,
                  borderBottom: `3px solid ${subTabLogistica === st.key ? C.terra : 'transparent'}`,
                  marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {st.label}
                  {(st.badge ?? 0) > 0 && (
                    <span style={{ background: '#c0392b', color: 'white', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>{st.badge}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Sub-tab: Kanban */}
            {subTabLogistica === 'kanban' && (
              <div>
                <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, marginBottom: 12 }}>
                  Estado de todos los pedidos activos. Actualiza el estado al avanzar en la cadena.
                </p>
                <FiltroPeriodoBar valor={filtroLogistica} onChange={setFiltroLogistica} />
                {isMobile ? (
                  /* Mobile: columnas colapsables — expandidas si tienen items */
                  <div style={{ display: 'grid', gap: 10 }}>
                    {KANBAN_COLS.map(col => {
                      const pedidosCol = filtrarPorFecha(pedidos, filtroLogistica).filter(p => p.logisticaStatus === col.key);
                      const defaultOpen = pedidosCol.length > 0;
                      const isOpen = kanbanColExpandida[col.key] !== undefined ? kanbanColExpandida[col.key] : defaultOpen;
                      return (
                        <div key={col.key} style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                          <button
                            onClick={() => setKanbanColExpandida(prev => ({ ...prev, [col.key]: !isOpen }))}
                            style={{ width: '100%', background: col.color, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: 'none', cursor: 'pointer' }}
                          >
                            <span style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, color: 'white' }}>{col.label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ background: 'rgba(255,255,255,0.3)', color: 'white', fontSize: 11, fontFamily: 'Montserrat', fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                                {pedidosCol.length}
                              </span>
                              <span style={{ color: 'white', fontSize: 14, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                            </div>
                          </button>
                          {isOpen && (
                            pedidosCol.length === 0 ? (
                              <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, textAlign: 'center', padding: '14px 0', margin: 0 }}>Sin pedidos</p>
                            ) : (
                              <div style={{ padding: '10px 12px', display: 'grid', gap: 8 }}>
                                {pedidosCol.map(p => (
                                  <div key={p.id} style={{ background: '#f7f3ee', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                      <p style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: C.brown, margin: '0 0 2px' }}>{p.id}</p>
                                      <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, margin: 0 }}>Lote: {p.loteId}</p>
                                    </div>
                                    <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.terra, margin: 0, fontWeight: 700 }}>
                                      {p.sacosSolicitados}s · S/{p.totalPEN.toLocaleString()}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                  {KANBAN_COLS.map(col => {
                    const pedidosCol = filtrarPorFecha(pedidos, filtroLogistica).filter(p => p.logisticaStatus === col.key);
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
                            <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, textAlign: 'center', marginTop: 20 }}>Sin pedidos</p>
                          )}
                          {pedidosCol.map(p => (
                            <div key={p.id} style={{ background: '#f7f3ee', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                              <p style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: C.brown, margin: '0 0 2px' }}>{p.id}</p>
                              <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, margin: '0 0 4px' }}>Lote: {p.loteId}</p>
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
                )}
              </div>
            )}

            {/* Sub-tab: Kanban muestras */}
            {subTabLogistica === 'muestras' && (
              <div>
                <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, marginBottom: 16 }}>
                  Seguimiento de muestras físicas desde solicitud hasta su recepción en el hub.
                </p>
                {isMobile ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {KANBAN_MUESTRAS_COLS.map(col => {
                      const items = solicitudesHub.filter(s => s.status === col.key);
                      const colKey = `muestras_${col.key}`;
                      const defaultOpen = items.length > 0;
                      const isOpen = kanbanColExpandida[colKey] !== undefined ? kanbanColExpandida[colKey] : defaultOpen;
                      return (
                        <div key={col.key} style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                          <button
                            onClick={() => setKanbanColExpandida(prev => ({ ...prev, [colKey]: !isOpen }))}
                            style={{ width: '100%', background: col.color, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: 'none', cursor: 'pointer' }}
                          >
                            <span style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, color: 'white' }}>{col.label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ background: 'rgba(255,255,255,0.3)', color: 'white', fontSize: 11, fontFamily: 'Montserrat', fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                                {items.length}
                              </span>
                              <span style={{ color: 'white', fontSize: 14, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                            </div>
                          </button>
                          {isOpen && (
                            items.length === 0 ? (
                              <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, textAlign: 'center', padding: '14px 0', margin: 0 }}>Sin muestras</p>
                            ) : (
                              <div style={{ padding: '10px 12px', display: 'grid', gap: 8 }}>
                                {items.map(s => {
                                  const lote = todosLotes.find(l => l.id === s.loteId);
                                  return (
                                    <div key={s.id} style={{ background: '#f7f3ee', borderRadius: 8, padding: '10px 12px' }}>
                                      <p style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: C.brown, margin: '0 0 2px' }}>{lote?.nombreLote ?? s.loteId}</p>
                                      <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, margin: 0 }}>{s.empresaCourier ?? `${s.cantidadSolicitada} muestra(s)`}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                    {KANBAN_MUESTRAS_COLS.map(col => {
                      const items = solicitudesHub.filter(s => s.status === col.key);
                      return (
                        <div key={col.key} style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                          <div style={{ background: col.color, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, color: 'white' }}>{col.label}</span>
                            <span style={{ background: 'rgba(255,255,255,0.3)', color: 'white', fontSize: 11, fontFamily: 'Montserrat', fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                              {items.length}
                            </span>
                          </div>
                          <div style={{ padding: 12, minHeight: 120 }}>
                            {items.length === 0 && (
                              <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, textAlign: 'center', marginTop: 20 }}>Sin muestras</p>
                            )}
                            {items.map(s => {
                              const lote = todosLotes.find(l => l.id === s.loteId);
                              return (
                                <div key={s.id} style={{ background: '#f7f3ee', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                                  <p style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: C.brown, margin: '0 0 2px' }}>{lote?.nombreLote ?? s.loteId}</p>
                                  <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, margin: '0 0 4px' }}>{s.empresaCourier ?? `${s.cantidadSolicitada} muestra(s)`}</p>
                                  <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.sage, margin: 0 }}>
                                    {new Date(s.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab: Reservas */}
            {subTabLogistica === 'reservas' && (
              <div>
                <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, marginBottom: 12 }}>
                  Reservas activas (72h window) y vencidas sin pago. Liberar una reserva cancela el pedido y devuelve los sacos al lote.
                </p>
                <FiltroPeriodoBar valor={filtroReservas} onChange={setFiltroReservas} />

            {/* Vencidas */}
            {(() => {
              const vencidas = filtrarPorFecha(reservasVencidas, filtroReservas);
              return vencidas.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <h3 style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#c0392b', margin: 0 }}>
                    Reservas vencidas ({vencidas.length})
                  </h3>
                  <span style={{ background: '#ffe5e5', color: '#c0392b', fontSize: 10, fontFamily: 'Montserrat', fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                    Acción requerida
                  </span>
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {vencidas.map(p => (
                    <div key={p.id} style={{
                      background: 'white', borderRadius: 12, padding: '18px 22px',
                      border: '1.5px solid #e55', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12,
                    }}>
                      <div>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 2px' }}>
                          {p.id} · Lote: {p.loteId}
                        </p>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, color: C.brown, margin: '0 0 4px' }}>
                          {p.sacosSolicitados} saco{p.sacosSolicitados !== 1 ? 's' : ''} · S/ {p.totalPEN.toLocaleString()}
                        </p>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: '#c0392b', margin: 0 }}>
                          Venció: {new Date(p.reservaExpiraAt).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, margin: '2px 0 0' }}>
                          {p.razonSocial} · {p.email}
                        </p>
                      </div>
                      <button
                        onClick={() => handleLiberarReserva(p)}
                        disabled={liberando === p.id}
                        style={{
                          background: liberando === p.id ? '#ccc' : '#c0392b',
                          color: 'white', border: 'none', borderRadius: 8,
                          padding: '10px 18px', fontFamily: 'Montserrat', fontSize: 12,
                          fontWeight: 700, cursor: liberando === p.id ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {liberando === p.id ? 'Liberando...' : 'Liberar reserva →'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
            })()}

            {/* Activas */}
            {(() => {
              const activas = filtrarPorFecha(reservasPendientes, filtroReservas);
              return (
              <div>
              <h3 style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.brown, marginBottom: 14 }}>
                Reservas activas ({activas.length})
              </h3>
              {activas.length === 0 && (
                <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, textAlign: 'center', padding: '30px 0' }}>
                  No hay reservas activas pendientes de pago.
                </p>
              )}
              <div style={{ display: 'grid', gap: 12 }}>
                {activas.map(p => {
                  const expiraEn = new Date(p.reservaExpiraAt).getTime() - now;
                  const horasRestantes = Math.max(0, Math.floor(expiraEn / 3600000));
                  const minutosRestantes = Math.max(0, Math.floor((expiraEn % 3600000) / 60000));
                  return (
                    <div key={p.id} style={{
                      background: 'white', borderRadius: 12, padding: '18px 22px',
                      border: `1px solid ${C.tan}30`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12,
                    }}>
                      <div>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 2px' }}>
                          {p.id} · Lote: {p.loteId}
                        </p>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, color: C.brown, margin: '0 0 4px' }}>
                          {p.sacosSolicitados} saco{p.sacosSolicitados !== 1 ? 's' : ''} · S/ {p.totalPEN.toLocaleString()}
                        </p>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.terra, margin: 0 }}>
                          Vence en {horasRestantes}h {minutosRestantes}m — {new Date(p.reservaExpiraAt).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, margin: '2px 0 0' }}>
                          {p.razonSocial} · {p.email}
                        </p>
                      </div>
                      <button
                        onClick={() => handleLiberarReserva(p)}
                        disabled={liberando === p.id}
                        style={{
                          background: 'transparent', color: '#c0392b', border: '1px solid #c0392b', borderRadius: 8,
                          padding: '8px 14px', fontFamily: 'Montserrat', fontSize: 11,
                          fontWeight: 600, cursor: liberando === p.id ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {liberando === p.id ? 'Liberando...' : 'Liberar anticipado'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
              );
            })()}

            {filtrarPorFecha(reservasVencidas, filtroReservas).length === 0 && filtrarPorFecha(reservasPendientes, filtroReservas).length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.brown }}>
                  No hay reservas{filtroReservas !== 'todo' ? ' en este período' : ' activas ni vencidas en este momento'}.
                </p>
              </div>
            )}
            </div>
            )}
          </div>
        )}

        {/* LABORATORIOS */}
        {tab === 'laboratorios' && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 24 }}>
              Accesos de cafeterías
            </h2>

            {/* Cafeterías — toggle tieneLaboratorio */}
            <div>
              <h3 style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.brown, marginBottom: 6 }}>
                Cafeterías — acceso a lab propio
              </h3>
              <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown, marginBottom: 14 }}>
                Activa "Lab propio" para cafeterías que tienen tostadora propia. Esto habilita el tab "Mi laboratorio" en su portal.
              </p>
              {cafeterias.length === 0 && (
                <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, padding: '20px 0' }}>
                  No hay cafeterías registradas.
                </p>
              )}
              <div style={{ display: 'grid', gap: 10 }}>
                {cafeterias.map(caf => (
                  <div key={caf.uid} style={{
                    background: 'white', borderRadius: 12, padding: '16px 20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <p style={{ fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, color: C.brown, margin: '0 0 2px' }}>
                        {caf.empresa ?? caf.nombre}
                      </p>
                      <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.brown, margin: 0 }}>
                        {caf.email}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleLab(caf.uid, caf.tieneLaboratorio ?? false)}
                      disabled={toggling === caf.uid}
                      style={{
                        background: caf.tieneLaboratorio ? C.sage : '#f0ebe4',
                        color: caf.tieneLaboratorio ? 'white' : C.tan,
                        border: 'none', borderRadius: 8,
                        padding: '8px 16px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700,
                        cursor: toggling === caf.uid ? 'not-allowed' : 'pointer',
                        opacity: toggling === caf.uid ? 0.6 : 1,
                        transition: 'all 0.2s',
                      }}
                    >
                      {toggling === caf.uid ? '...' : caf.tieneLaboratorio ? 'Lab propio ✓' : 'Sin lab propio'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
