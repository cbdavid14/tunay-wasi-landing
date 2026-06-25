/**
 * MarketplaceLotes.tsx — Catálogo del marketplace B2B
 * Actor: Cafetería / Tostadora de Especialidad
 *
 * Flujo MVP: cafetería ve catálogo con puntajes SCA → solicita muestra opcional → compra sacos
 */
import { useState, useEffect, useRef } from 'react';
import type React from 'react';
import { useIsMobile } from '@/shared/mobileStyles';
import type { LoteDoc, LaboratorioDoc, SolicitudMuestraDoc, PedidoB2BDoc, LoteStatus, CalificacionDoc } from '@/shared/types/marketplace';
import type { PerfilCafeteria } from '@/shared/types/auth';
import {
  fetchMktLotes,
  fetchMktCaficultores,
  fetchMktLaboratorios,
  createMktSolicitudMuestra,
  countMktSolicitudesActivasByLote,
  fetchMktSolicitudesByTostadora,
  fetchMktPedidosByTostadora,
  fetchMktPedidosByCaficultor,
  updateMktSolicitudStatus,
  updateMktPedidoLogistica,
  subirVoucherPedido,
  crearCalificacion,
  fetchCalificacionesByPedido,
  fetchCalificacionesByDestinatario,
} from '@/features/marketplace/marketplaceService';
import { saveNotif } from '@/shared/notificacionesService';
import { actualizarPerfilCafeteria } from '@/shared/perfilService';
import { COMISION_TW, FLETE_POR_SACO_PEN } from '@/shared/config';
import { useNotificaciones } from '@/shared/useNotificaciones';
import { useOnboarding } from '@/shared/useOnboarding';
import OnboardingModal from '@/shared/OnboardingModal';
import OnboardingTour from '@/shared/OnboardingTour';
import type { TourStep } from '@/shared/OnboardingTour';

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
  publicado: { label: 'Disponible', color: C.sage },
  agotado:   { label: 'Agotado', color: '#888' },
};

// Badge de calidad según certificación SCA
function getBadgeCalidad(lote: LoteDoc): { label: string; color: string } | null {
  if (lote.puntajeOficial) {
    return { label: `✓ SCA ${lote.puntajeOficial} pts`, color: C.terra };
  }
  return null;
}

interface CarritoItem {
  lote: LoteDoc;
  sacos?: number;
  feeLaboratorioPEN?: number;  // fee de catación del lab contratado (Flujo B)
}

interface TabExtra {
  key: string;
  label: string;
  badge?: number;
  content: React.ReactNode;
  tourId?: string; // id del botón para el spotlight del tour de onboarding
}

interface Props {
  onCheckout: (items: CarritoItem[]) => void;
  perfil: PerfilCafeteria | null;
  isLoggedIn?: boolean;
  onNecesitaLogin?: () => void;
  onLogout?: () => void;
  tabsExtra?: TabExtra[];
  onTabExtraChange?: (key: string) => void;
  tabActivo?: string;
  /** Si false, no auto-navega al primer tab extra al detectar tabsExtra (admin empieza en catálogo) */
  autoNavExtraTab?: boolean;
}

const PASOS_CAFETERIA_BASE: TourStep[] = [
  { targetId: 'tab-cafeteria-catalogo', titulo: 'Catálogo de lotes', descripcion: 'Explora los lotes certificados con puntaje SCA. Filtra por proceso, variedad o puntaje para encontrar el café ideal.' },
  { targetId: 'tab-cafeteria-muestras', titulo: 'Mis muestras', descripcion: 'Aquí sigues el estado de las muestras de 200g que pediste (opcional — no es requisito para comprar).' },
  { targetId: 'tab-cafeteria-pedidos', titulo: 'Mis pedidos', descripcion: 'Cuando compras por sacos, aquí ves el estado logístico: desde el origen hasta la entrega en tu local.' },
];

export default function MarketplaceLotes({ onCheckout, perfil, isLoggedIn = false, onNecesitaLogin, onLogout, tabsExtra, onTabExtraChange, tabActivo, autoNavExtraTab = true }: Props) {
  const isMobile = useIsMobile();
  const { notifs } = useNotificaciones(perfil?.uid ?? null);
  const { fase: onbFase, iniciarTour, completar: completarOnb } = useOnboarding('cafeteria', perfil?.uid ?? '');
  const [vistaActual, setVistaActual] = useState<string>(tabActivo ?? 'catalogo');

  // Sincronizar tab controlado externamente (desde UserMenu)
  useEffect(() => {
    if (tabActivo && tabActivo !== vistaActual) {
      setVistaActual(tabActivo);
      if (tabsExtra?.some(t => t.key === tabActivo)) {
        onTabExtraChange?.(tabActivo);
      }
    }
  }, [tabActivo]);

  // Auto-navegar al primer tab extra cuando el usuario logueado no es cafetería
  // (caficultor/laboratorio: su portal está en tabsExtra, no en 'catalogo')
  useEffect(() => {
    if (autoNavExtraTab && tabsExtra && tabsExtra.length > 0 && vistaActual === 'catalogo' && !tabActivo) {
      const primerTab = tabsExtra[0].key;
      setVistaActual(primerTab);
      onTabExtraChange?.(primerTab);
    }
  }, [tabsExtra?.length]);
  const [loteEnfocado, setLoteEnfocado] = useState<string | null>(null);
  const [modalReserva, setModalReserva] = useState<CarritoItem | null>(null);
  const [pedidoAbierto, setPedidoAbierto] = useState<string | null>(null);
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [formPerfil, setFormPerfil] = useState({ nombre: '', empresa: '', ruc: '', telefono: '', direccionEntrega: '' });
  const [filtroProceso, setFiltroProceso] = useState('todos');
  const [filtroSCA, setFiltroSCA] = useState(0);
  const [carrito] = useState<CarritoItem[]>([]);
  const [sacosSeleccionados, setSacosSeleccionados] = useState<Record<string, number>>({});
  const [todosLotes, setTodosLotes] = useState<LoteDoc[]>([]);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showRolPrompt, setShowRolPrompt] = useState(false);
  const [caficultores, setCaficultores] = useState<{ id: string; nombreProductor: string; nombreFinca: string; region: string; fotoUrl: string }[]>([]);
  const [laboratorios, setLaboratorios] = useState<LaboratorioDoc[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fichaAbierta, setFichaAbierta] = useState<LoteDoc | null>(null);
  const [lotesSolicitados, setLotesSolicitados] = useState<Set<string>>(new Set());
  const [misSolicitudes, setMisSolicitudes] = useState<SolicitudMuestraDoc[]>([]);
  const [misPedidos, setMisPedidos] = useState<PedidoB2BDoc[]>([]);
  const [confirmandoRecepcion, setConfirmandoRecepcion] = useState<string | null>(null);
  const [confirmandoEntregaPedido, setConfirmandoEntregaPedido] = useState<string | null>(null);
  const [subiendoVoucher, setSubiendoVoucher] = useState<string | null>(null);
  const voucherInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [loteLleno, setLoteLleno] = useState<string | null>(null); // loteId bloqueado por max 3 muestras
  const [modalCaficultor, setModalCaficultor] = useState<{ id: string; nombreProductor: string; nombreFinca: string; region: string; fotoUrl: string } | null>(null);
  const [modalCaficultorCalifs, setModalCaficultorCalifs] = useState<{ promedio: number; total: number } | null>(null);
  const [modalCaficultorPedidos, setModalCaficultorPedidos] = useState<number | null>(null);

  // Calificaciones post-transacción (G-23)
  const [calificacionesYaHechas, setCalificacionesYaHechas] = useState<Set<string>>(new Set());
  const [modalCalifPedido, setModalCalifPedido] = useState<PedidoB2BDoc | null>(null);
  const [califPuntaje, setCalifPuntaje] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [califComentario, setCalifComentario] = useState('');
  const [guardandoCalif, setGuardandoCalif] = useState(false);

  useEffect(() => {
    const perfilUid = perfil?.uid ?? null;
    Promise.all([
      fetchMktLotes(),
      fetchMktCaficultores(),
      fetchMktLaboratorios(),
      perfilUid ? fetchMktSolicitudesByTostadora(perfilUid) : Promise.resolve([]),
      perfilUid ? fetchMktPedidosByTostadora(perfilUid) : Promise.resolve([]),
    ]).then(async ([lotes, cafs, labs, sols, peds]) => {
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
      const pedsTyped = peds as PedidoB2BDoc[];
      setMisPedidos(pedsTyped);
      // Cargar qué pedidos entregados ya tienen calificación de esta cafetería
      if (perfilUid) {
        const entregados = pedsTyped.filter(p => p.logisticaStatus === 'entregado');
        const calIds = new Set<string>();
        await Promise.all(entregados.map(async p => {
          const cals = await fetchCalificacionesByPedido(p.id);
          if (cals.some((c: CalificacionDoc) => c.autorId === perfilUid)) calIds.add(p.id);
        }));
        setCalificacionesYaHechas(calIds);
      }
      setCargando(false);
    });
  }, [notifs.length, perfil?.uid]);

  // Scroll al lote enfocado cuando cambia la vista a catálogo
  useEffect(() => {
    if (vistaActual === 'catalogo' && loteEnfocado) {
      const el = document.getElementById(`lote-card-${loteEnfocado}`);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      }
    }
  }, [vistaActual, loteEnfocado]);

  const ESTADOS_OCULTOS: LoteStatus[] = ['borrador', 'rechazado', 'agotado'];
  const lotes = todosLotes.filter(l => {
    if (ESTADOS_OCULTOS.includes(l.status)) return false;
    if ((l.sacosDisponibles - l.sacosReservados) <= 0) return false;
    if (filtroProceso !== 'todos' && l.proceso !== filtroProceso) return false;
    const puntaje = l.puntajeOficial ?? l.puntajeReferencial;
    if (puntaje < filtroSCA) return false;
    return true;
  }).sort((a, b) => {
    // RN-CAT: mayor puntaje oficial primero → más reciente si empatan
    const puntajeA = a.puntajeOficial ?? 0;
    const puntajeB = b.puntajeOficial ?? 0;
    if (puntajeB !== puntajeA) return puntajeB - puntajeA;
    // Sin puntaje: más reciente primero
    return (b.publicadoAt ?? b.createdAt).localeCompare(a.publicadoAt ?? a.createdAt);
  });

  function getCaficultor(id: string) {
    return caficultores.find(c => c.id === id);
  }

  async function agregarMuestra(lote: LoteDoc) {
    if (!perfil) {
      // Usuario logueado con otro rol (caficultor, laboratorio) → necesita cuenta de cafetería
      if (isLoggedIn) { setShowRolPrompt(true); return; }
      // Sin sesión → pedir login
      setShowLoginPrompt(true);
      return;
    }
    // Bloquea si esta empresa ya pidió muestra de este lote (sesión actual o previa)
    if (lotesSolicitados.has(lote.id)) return;
    // Verificar máximo 3 muestras activas por lote (regla de negocio)
    const activasCount = await countMktSolicitudesActivasByLote(lote.id);
    if (activasCount >= 3) {
      setLoteLleno(lote.id);
      setTimeout(() => setLoteLleno(null), 5000);
      return;
    }
    // Actualiza estado local inmediatamente para prevenir doble-click
    setLotesSolicitados(prev => new Set([...prev, lote.id]));
    // La muestra es gratuita — no pasa por checkout, se registra directamente
    // Persiste en Firestore
    const solId = await createMktSolicitudMuestra({
      loteId: lote.id,
      tostadoraId: perfil.uid,
      nombreContacto: perfil.nombre,
      empresa: perfil.empresa,
      email: perfil.email ?? '',
      telefono: perfil.telefono ?? '',
      direccionEntrega: perfil.direccionEntrega ?? '',
    });
    // Actualizar estado local para que aparezca en "Mis muestras" sin recargar
    setMisSolicitudes(prev => [...prev, {
      id: solId,
      loteId: lote.id,
      tostadoraId: perfil.uid,
      nombreContacto: perfil.nombre,
      empresa: perfil.empresa,
      email: perfil.email ?? '',
      telefono: perfil.telefono ?? '',
      direccionEntrega: perfil.direccionEntrega ?? '',
      status: 'pendiente',
      createdAt: new Date().toISOString(),
    }]);
  }

  function agregarSacos(lote: LoteDoc) {
    const sacos = sacosSeleccionados[lote.id] || 1;
    const lab = lote.laboratorioId ? laboratorios.find(l => l.id === lote.laboratorioId) : undefined;
    const feeLaboratorioPEN = lab ? lab.feeCatacionPEN : undefined;
    setModalReserva({ lote, sacos, feeLaboratorioPEN });
  }

  async function handleConfirmarRecepcion(sol: SolicitudMuestraDoc) {
    setConfirmandoRecepcion(sol.id);
    await updateMktSolicitudStatus(sol.id, 'recibida');
    setMisSolicitudes(prev => prev.map(s => s.id === sol.id ? { ...s, status: 'recibida' } : s));
    setConfirmandoRecepcion(null);
  }

  async function handleGuardarCalificacion() {
    if (!modalCalifPedido || !perfil) return;
    const ped = modalCalifPedido;
    const lote = todosLotes.find(l => l.id === ped.loteId);
    setGuardandoCalif(true);
    await crearCalificacion({
      pedidoId: ped.id,
      autorId: perfil.uid,
      autorRol: 'cafeteria',
      destinatarioId: ped.caficultorId,
      destinatarioRol: 'caficultor',
      puntaje: califPuntaje,
      comentario: califComentario.trim() || undefined,
    });
    setCalificacionesYaHechas(prev => new Set([...prev, ped.id]));
    setModalCalifPedido(null);
    setCalifComentario('');
    setCalifPuntaje(5);
    setGuardandoCalif(false);
    void lote; // suppress unused warning
  }

  // Filtros para Mis muestras
  const [filtroStatusMuestras, setFiltroStatusMuestras] = useState<'todos' | 'pendiente' | 'despachada' | 'recibida' | 'catada'>('todos');
  const [filtroOrdenMuestras, setFiltroOrdenMuestras] = useState<'reciente' | 'antiguo'>('reciente');

  // Filtros para Mis pedidos
  const [filtroStatusPedidos, setFiltroStatusPedidos] = useState<'todos' | 'pendiente' | 'verificado' | 'en_transito' | 'entregado' | 'cancelado'>('todos');
  const [filtroOrdenPedidos, setFiltroOrdenPedidos] = useState<'reciente' | 'antiguo'>('reciente');


  return (
    <div style={{ background: '#f7f3ee', minHeight: '100vh' }}>

      {/* Modal login prompt — al intentar solicitar muestra sin sesión */}
      {showLoginPrompt && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(31,48,40,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setShowLoginPrompt(false)}
        >
          <div
            style={{ background: 'white', borderRadius: 18, padding: '32px 28px', maxWidth: 380, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔐</div>
            <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 24, color: '#1f3028', marginBottom: 8 }}>
              Inicia sesión para continuar
            </h3>
            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: '#c4b297', lineHeight: 1.6, marginBottom: 24 }}>
              Crea una cuenta o inicia sesión para solicitar muestras y comprar lotes directamente.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => { setShowLoginPrompt(false); onNecesitaLogin?.(); }}
                style={{ background: '#c96e4b', color: 'white', border: 'none', borderRadius: 10, padding: '10px 24px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Iniciar sesión →
              </button>
              <button
                onClick={() => setShowLoginPrompt(false)}
                style={{ background: 'transparent', color: '#c4b297', border: '1px solid #c4b29740', borderRadius: 10, padding: '10px 16px', fontFamily: 'Montserrat', fontSize: 12, cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal rol incorrecto — usuario logueado pero sin cuenta de cafetería */}
      {showRolPrompt && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(31,48,40,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setShowRolPrompt(false)}
        >
          <div
            style={{ background: 'white', borderRadius: 18, padding: '32px 28px', maxWidth: 380, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>☕</div>
            <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 24, color: '#1f3028', marginBottom: 8 }}>
              Necesitas una cuenta de cafetería
            </h3>
            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: '#c4b297', lineHeight: 1.6, marginBottom: 24 }}>
              Para solicitar muestras y comprar lotes debes tener una cuenta de cafetería o tostadora registrada en la plataforma.
            </p>
            <button
              onClick={() => setShowRolPrompt(false)}
              style={{ background: C.terra, color: 'white', border: 'none', borderRadius: 10, padding: '10px 24px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Onboarding cafetería — modal + tour */}
      {perfil && onbFase === 'modal' && (
        <OnboardingModal rol="cafeteria" nombre={perfil.nombre} onEmpezarTour={iniciarTour} onSaltar={completarOnb} />
      )}
      {perfil && onbFase === 'tour' && (
        <OnboardingTour pasos={PASOS_CAFETERIA_BASE} onFin={completarOnb} onSaltar={completarOnb} />
      )}

      {/* Modal de reserva — resumen + confirmar */}
      {modalReserva && (() => {
        const item = modalReserva;
        const sacos = item.sacos ?? 1;
        const subtotal = (item.lote.precioVentaPEN ?? 0) * sacos;
        const igv = Math.round(subtotal * 0.18);
        const flete = 25 * sacos;
        const fee = item.feeLaboratorioPEN ?? 0;
        const total = subtotal + igv + flete + fee;
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
            onClick={() => setModalReserva(null)}>
            <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '28px 24px 40px', width: '100%', maxWidth: 480 }}
              onClick={e => e.stopPropagation()}>
              {/* Handle */}
              <div style={{ width: 40, height: 4, background: '#e0d8d0', borderRadius: 4, margin: '0 auto 20px' }} />
              <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, color: C.brown, margin: '0 0 4px' }}>
                {item.lote.nombreLote}
              </h3>
              <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: '0 0 20px' }}>
                {item.lote.variedad} · {item.lote.region} · {item.lote.puntajeOficial ?? item.lote.puntajeReferencial} pts SCA
              </p>
              {/* Detalle */}
              <div style={{ background: '#f7f3ee', borderRadius: 12, padding: '14px 16px', marginBottom: 20, display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan }}>{sacos} saco{sacos > 1 ? 's' : ''} × S/ {(item.lote.precioVentaPEN ?? 0).toLocaleString()}</span>
                  <span style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, fontWeight: 600 }}>S/ {subtotal.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan }}>IGV (18%)</span>
                  <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown }}>S/ {igv.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan }}>Flete</span>
                  <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown }}>S/ {flete.toLocaleString()}</span>
                </div>
                {fee > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan }}>Catación (lab)</span>
                    <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown }}>S/ {fee.toLocaleString()}</span>
                  </div>
                )}
                <div style={{ borderTop: `2px solid ${C.terra}`, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, color: C.brown }}>TOTAL</span>
                  <span style={{ fontFamily: 'Cormorant Garamond', fontSize: 24, fontWeight: 700, color: C.terra }}>S/ {total.toLocaleString()}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setModalReserva(null);
                  onCheckout([item]);
                }}
                style={{
                  width: '100%', background: C.terra, color: 'white', border: 'none',
                  borderRadius: 12, padding: '16px', fontFamily: 'Montserrat', fontSize: 15,
                  fontWeight: 700, cursor: 'pointer', minHeight: 52,
                }}
              >
                Confirmar reserva →
              </button>
              <button onClick={() => setModalReserva(null)} style={{
                width: '100%', background: 'none', border: 'none', color: C.tan,
                fontFamily: 'Montserrat', fontSize: 13, cursor: 'pointer', marginTop: 10, padding: '8px',
              }}>
                Cancelar
              </button>
            </div>
          </div>
        );
      })()}
      {cargando && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.tan }}>Cargando lotes...</p>
        </div>
      )}
      {!cargando && (<>

      {/* Nav — desktop: tabs superiores / mobile: tab bar fijo abajo */}
      {isMobile ? (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
          background: 'white', borderTop: '1px solid #e8e2da',
          display: 'flex', height: 60,
        }}>
          <button onClick={() => setVistaActual('catalogo')} style={{
            flex: 1, border: 'none', background: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
            color: vistaActual === 'catalogo' ? C.terra : C.tan,
          }}>
            <span style={{ fontSize: 20 }}>🛒</span>
            <span style={{ fontFamily: 'Montserrat', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Catálogo</span>
          </button>
          {perfil && (() => {
            const pendientesMuestras = misSolicitudes.filter(s => s.status === 'pendiente').length;
            const pendientesPedidos = misPedidos.filter(p => p.pagoStatus === 'pendiente').length;
            return (<>
              <button onClick={() => setVistaActual('muestras')} style={{
                flex: 1, border: 'none', background: 'none', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                color: vistaActual === 'muestras' ? C.terra : C.tan, position: 'relative',
              }}>
                <span style={{ fontSize: 20 }}>📦</span>
                <span style={{ fontFamily: 'Montserrat', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Muestras</span>
                {pendientesMuestras > 0 && (
                  <span style={{ position: 'absolute', top: 6, right: 'calc(50% - 18px)', background: C.terra, color: 'white', fontSize: 9, fontWeight: 700, width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {pendientesMuestras}
                  </span>
                )}
              </button>
              <button onClick={() => setVistaActual('pedidos')} style={{
                flex: 1, border: 'none', background: 'none', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                color: vistaActual === 'pedidos' ? C.terra : C.tan, position: 'relative',
              }}>
                <span style={{ fontSize: 20 }}>📋</span>
                <span style={{ fontFamily: 'Montserrat', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Pedidos</span>
                {pendientesPedidos > 0 && (
                  <span style={{ position: 'absolute', top: 6, right: 'calc(50% - 18px)', background: C.terra, color: 'white', fontSize: 9, fontWeight: 700, width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {pendientesPedidos}
                  </span>
                )}
              </button>
            </>);
          })()}
          {tabsExtra?.map(t => (
            <button key={t.key} onClick={() => { setVistaActual(t.key); onTabExtraChange?.(t.key); }} style={{
              flex: 1, border: 'none', background: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
              color: vistaActual === t.key ? C.terra : C.tan, position: 'relative',
            }}>
              <span style={{ fontSize: 20 }}>🏪</span>
              <span style={{ fontFamily: 'Montserrat', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>{t.label}</span>
              {t.badge != null && t.badge > 0 && (
                <span style={{ position: 'absolute', top: 6, right: 'calc(50% - 18px)', background: C.terra, color: 'white', fontSize: 9, fontWeight: 700, width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
          {/* Tab Perfil — solo visible cuando no hay tabsExtra (cafetería o no logueado) */}
          {!tabsExtra?.length && <button onClick={() => setVistaActual('perfil_cafeteria')} style={{
            flex: 1, border: 'none', background: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
            color: vistaActual === 'perfil_cafeteria' ? C.terra : C.tan,
          }}>
            <span style={{ fontSize: 20 }}>👤</span>
            <span style={{ fontFamily: 'Montserrat', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>
              {isLoggedIn ? 'Perfil' : 'Entrar'}
            </span>
          </button>}
        </div>
      ) : (
        <div style={{ background: 'white', borderBottom: '1px solid #e8e2da', padding: `0 ${isMobile ? 8 : 40}px`, position: 'sticky', top: 0, zIndex: 100 }} className="tw-tabs-scroll">
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex' }}>
            {/* Tab Catálogo */}
            <button
              id="tab-cafeteria-catalogo"
              onClick={() => setVistaActual('catalogo')}
              style={{
                background: 'none', border: 'none', borderBottom: `3px solid ${vistaActual === 'catalogo' ? C.terra : 'transparent'}`,
                padding: '16px 20px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700,
                color: vistaActual === 'catalogo' ? C.terra : C.tan, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, transition: 'color 0.15s',
              }}
            >
              Catálogo
            </button>

            {/* Tabs de gestión — solo si tiene perfil */}
            {perfil && (() => {
              const pendientesMuestras = misSolicitudes.filter(s => s.status === 'pendiente').length;
              const pendientesPedidos = misPedidos.filter(p => p.pagoStatus === 'pendiente').length;
              return (<>
                <button
                  id="tab-cafeteria-muestras"
                  onClick={() => setVistaActual('muestras')}
                  style={{
                    background: 'none', border: 'none', borderBottom: `3px solid ${vistaActual === 'muestras' ? C.terra : 'transparent'}`,
                    padding: '16px 20px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700,
                    color: vistaActual === 'muestras' ? C.terra : C.tan, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8, transition: 'color 0.15s',
                  }}
                >
                  Mis muestras
                  {pendientesMuestras > 0 && (
                    <span style={{ background: C.terra, color: 'white', fontSize: 10, fontFamily: 'Montserrat', fontWeight: 700, padding: '1px 7px', borderRadius: 20 }}>
                      {pendientesMuestras}
                    </span>
                  )}
                </button>
                <button
                  id="tab-cafeteria-pedidos"
                  onClick={() => setVistaActual('pedidos')}
                  style={{
                    background: 'none', border: 'none', borderBottom: `3px solid ${vistaActual === 'pedidos' ? C.terra : 'transparent'}`,
                    padding: '16px 20px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700,
                    color: vistaActual === 'pedidos' ? C.terra : C.tan, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8, transition: 'color 0.15s',
                  }}
                >
                  Mis pedidos
                  {pendientesPedidos > 0 && (
                    <span style={{ background: C.terra, color: 'white', fontSize: 10, fontFamily: 'Montserrat', fontWeight: 700, padding: '1px 7px', borderRadius: 20 }}>
                      {pendientesPedidos}
                    </span>
                  )}
                </button>
              </>);
            })()}

            {/* Tab Mi perfil — solo cafetería logueada */}
            {perfil && !tabsExtra?.length && (
              <button
                onClick={() => setVistaActual('perfil_cafeteria')}
                style={{
                  background: 'none', border: 'none',
                  borderBottom: `3px solid ${vistaActual === 'perfil_cafeteria' ? C.terra : 'transparent'}`,
                  padding: '16px 20px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700,
                  color: vistaActual === 'perfil_cafeteria' ? C.terra : C.tan, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8, transition: 'color 0.15s',
                }}
              >
                Mi perfil
              </button>
            )}
            {tabsExtra?.map(t => (
              <button
                key={t.key}
                id={t.tourId}
                onClick={() => { setVistaActual(t.key); onTabExtraChange?.(t.key); }}
                style={{
                  background: 'none', border: 'none',
                  borderBottom: `3px solid ${vistaActual === t.key ? C.terra : 'transparent'}`,
                  padding: '16px 20px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700,
                  color: vistaActual === t.key ? C.terra : C.tan, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8, transition: 'color 0.15s',
                }}
              >
                {t.label}
                {t.badge != null && t.badge > 0 && (
                  <span style={{ background: C.terra, color: 'white', fontSize: 10, fontFamily: 'Montserrat', fontWeight: 700, padding: '1px 7px', borderRadius: 20 }}>
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Portal embebido (caficultor / laboratorio) — siempre montado para que el tour encuentre los IDs.
          Solo el primer tab tiene el contenido; los demás comparten la misma instancia.
          Se muestra cuando vistaActual corresponde a alguno de los tabs extra. */}
      {tabsExtra && tabsExtra.length > 0 && (
        <div style={{ display: tabsExtra.some(t => t.key === vistaActual) ? 'block' : 'none' }}>
          {tabsExtra[0].content}
        </div>
      )}

      {/* Vista: Perfil cafetería — mobile */}
      {vistaActual === 'perfil_cafeteria' && (
        <div style={{ maxWidth: isMobile ? 480 : 600, margin: '0 auto', padding: isMobile ? '32px 16px 100px' : '40px 24px' }}>
          {isLoggedIn ? (
            <>
              {/* Avatar + datos */}
              <div style={{ background: C.green, borderRadius: 16, padding: '28px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: C.terra, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, fontFamily: 'Cormorant Garamond', color: 'white', flexShrink: 0 }}>
                  {perfil?.nombre?.charAt(0).toUpperCase() ?? '?'}
                </div>
                <div>
                  <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, fontWeight: 700, color: C.cream, margin: 0 }}>{perfil?.nombre ?? 'Mi cuenta'}</p>
                  {perfil?.empresa && <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: '2px 0 0' }}>{perfil.empresa}</p>}
                  <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.sage, margin: '2px 0 0' }}>Sesión iniciada</p>
                </div>
              </div>

              {/* Datos de registro / edición */}
              <div style={{ background: 'white', borderRadius: 14, padding: '20px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <p style={{ fontFamily: 'Montserrat', fontSize: 10, fontWeight: 700, color: C.tan, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Datos de la empresa</p>
                  {!editandoPerfil ? (
                    <button
                      onClick={() => {
                        setFormPerfil({
                          nombre: perfil?.nombre ?? '',
                          empresa: (perfil as PerfilCafeteria | null)?.empresa ?? '',
                          ruc: (perfil as PerfilCafeteria | null)?.ruc ?? '',
                          telefono: perfil?.telefono ?? '',
                          direccionEntrega: (perfil as PerfilCafeteria | null)?.direccionEntrega ?? '',
                        });
                        setEditandoPerfil(true);
                      }}
                      style={{ background: 'none', border: `1px solid ${C.terra}60`, borderRadius: 8, padding: '5px 12px', fontFamily: 'Montserrat', fontSize: 11, color: C.terra, cursor: 'pointer', fontWeight: 600 }}
                    >
                      Editar
                    </button>
                  ) : (
                    <button onClick={() => setEditandoPerfil(false)} style={{ background: 'none', border: 'none', fontFamily: 'Montserrat', fontSize: 11, color: C.tan, cursor: 'pointer' }}>
                      Cancelar
                    </button>
                  )}
                </div>

                {!editandoPerfil ? (
                  <>
                    {([
                      { label: 'Razón social', value: (perfil as PerfilCafeteria | null)?.empresa },
                      { label: 'RUC', value: (perfil as PerfilCafeteria | null)?.ruc },
                      { label: 'Email', value: perfil?.email },
                      { label: 'Teléfono', value: perfil?.telefono },
                      { label: 'Dirección de entrega', value: (perfil as PerfilCafeteria | null)?.direccionEntrega },
                    ] as { label: string; value: string | undefined }[]).filter(d => d.value).map(d => (
                      <div key={d.label} style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 12 }}>
                        <span style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, textTransform: 'uppercase', letterSpacing: 0.5 }}>{d.label}</span>
                        <span style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown }}>{d.value}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {([
                      { key: 'nombre', label: 'Nombre de contacto', placeholder: 'Andrés Vidal' },
                      { key: 'empresa', label: 'Razón social', placeholder: 'Café del Parque S.A.C.' },
                      { key: 'ruc', label: 'RUC', placeholder: '20123456789' },
                      { key: 'telefono', label: 'Teléfono', placeholder: '+51 987 654 321' },
                      { key: 'direccionEntrega', label: 'Dirección de entrega', placeholder: 'Av. La Mar 456, Miraflores' },
                    ] as { key: keyof typeof formPerfil; label: string; placeholder: string }[]).map(f => (
                      <div key={f.key}>
                        <label style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>{f.label}</label>
                        <input
                          value={formPerfil[f.key]}
                          onChange={e => setFormPerfil(prev => ({ ...prev, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          style={{ width: '100%', padding: '11px 13px', border: '1.5px solid #e0d8d0', borderRadius: 8, fontFamily: 'Montserrat', fontSize: isMobile ? 16 : 13, color: C.brown, background: 'white', boxSizing: 'border-box', minHeight: 44 }}
                        />
                      </div>
                    ))}
                    <button
                      onClick={async () => {
                        if (!perfil?.uid) return;
                        setGuardandoPerfil(true);
                        await actualizarPerfilCafeteria(perfil.uid, formPerfil);
                        setGuardandoPerfil(false);
                        setEditandoPerfil(false);
                      }}
                      disabled={guardandoPerfil}
                      style={{ background: C.terra, color: 'white', border: 'none', borderRadius: 10, padding: '13px', fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 4, opacity: guardandoPerfil ? 0.6 : 1 }}
                    >
                      {guardandoPerfil ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </div>
                )}
              </div>

              {/* Acciones — solo en mobile (en desktop el menú superior ya las tiene) */}
              {isMobile && (
              <div style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <button
                  onClick={() => setVistaActual('muestras')}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '18px 20px', border: 'none', borderBottom: '1px solid #f0ebe4', background: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ fontSize: 22 }}>📦</span>
                  <span style={{ fontFamily: 'Montserrat', fontSize: 14, fontWeight: 600, color: C.brown }}>Mis muestras</span>
                  <span style={{ marginLeft: 'auto', color: C.tan, fontSize: 18 }}>›</span>
                </button>
                <button
                  onClick={() => setVistaActual('pedidos')}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '18px 20px', border: 'none', borderBottom: '1px solid #f0ebe4', background: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ fontSize: 22 }}>📋</span>
                  <span style={{ fontFamily: 'Montserrat', fontSize: 14, fontWeight: 600, color: C.brown }}>Mis pedidos</span>
                  <span style={{ marginLeft: 'auto', color: C.tan, fontSize: 18 }}>›</span>
                </button>
                <button
                  onClick={() => { onLogout?.(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '18px 20px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ fontSize: 22 }}>🚪</span>
                  <span style={{ fontFamily: 'Montserrat', fontSize: 14, fontWeight: 600, color: '#e06060' }}>Cerrar sesión</span>
                </button>
              </div>
              )}

              {/* Cerrar sesión — solo en desktop */}
              {!isMobile && (
                <div style={{ marginTop: 16 }}>
                  <button onClick={() => onLogout?.()} style={{
                    display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: `1px solid #e0d8d0`,
                    borderRadius: 10, padding: '12px 20px', cursor: 'pointer', color: '#e06060',
                    fontFamily: 'Montserrat', fontSize: 13, fontWeight: 600,
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Cerrar sesión
                  </button>
                </div>
              )}
            </>
          ) : (
            /* No logueado — CTA login */
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>☕</div>
              <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 26, color: C.brown, marginBottom: 8 }}>
                Accede a tu cuenta
              </h3>
              <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, marginBottom: 28, lineHeight: 1.6 }}>
                Inicia sesión para gestionar tus muestras, pedidos y perfil de empresa.
              </p>
              <button
                onClick={() => onNecesitaLogin?.()}
                style={{ background: C.terra, color: 'white', border: 'none', borderRadius: 12, padding: '14px 32px', fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                Iniciar sesión →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Vista: Mis muestras */}
      {vistaActual === 'muestras' && (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '20px 16px' : '32px 40px', paddingBottom: carrito.length > 0 ? 100 : 32 }}>
          <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, margin: '0 0 6px' }}>
            Mis muestras
          </h2>
          <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, marginBottom: 24 }}>
            Solicitudes de muestra de café verde de tu empresa.
          </p>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan }}>Estado:</span>
              {([
                { key: 'todos', label: 'Todos' },
                { key: 'pendiente', label: 'Pendiente' },
                { key: 'despachada', label: 'Enviada' },
                { key: 'recibida', label: 'Recibida' },
                { key: 'catada', label: 'Catada' },
              ] as { key: typeof filtroStatusMuestras; label: string }[]).map(({ key, label }) => (
                <button key={key} onClick={() => setFiltroStatusMuestras(key)} style={{
                  background: filtroStatusMuestras === key ? C.terra : '#f0ebe4',
                  color: filtroStatusMuestras === key ? 'white' : C.brown,
                  border: 'none', borderRadius: 20, padding: '7px 14px', minHeight: 36,
                  fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 'auto' }}>
              <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan }}>Orden:</span>
              {([
                { key: 'reciente', label: 'Más reciente' },
                { key: 'antiguo', label: 'Más antiguo' },
              ] as { key: typeof filtroOrdenMuestras; label: string }[]).map(({ key, label }) => (
                <button key={key} onClick={() => setFiltroOrdenMuestras(key)} style={{
                  background: filtroOrdenMuestras === key ? C.brown : '#f0ebe4',
                  color: filtroOrdenMuestras === key ? 'white' : C.brown,
                  border: 'none', borderRadius: 20, padding: '7px 14px', minHeight: 36,
                  fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {(() => {
            const solsFiltradas = misSolicitudes
              .filter(s => s.status !== 'rechazada')
              .filter(s => filtroStatusMuestras === 'todos' || s.status === filtroStatusMuestras)
              .sort((a, b) => filtroOrdenMuestras === 'reciente'
                ? b.createdAt.localeCompare(a.createdAt)
                : a.createdAt.localeCompare(b.createdAt));
            if (solsFiltradas.length === 0 && misSolicitudes.length === 0) return (
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
            );
            if (solsFiltradas.length === 0) return (
              <div style={{ background: 'white', borderRadius: 12, padding: 24, textAlign: 'center' }}>
                <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan }}>
                  No hay muestras con el filtro seleccionado.
                </p>
              </div>
            );
            return solsFiltradas.map(sol => {
              const lote = todosLotes.find(l => l.id === sol.loteId);
              const SOL_PASOS = ['solicitada', 'enviada', 'recibida'] as const;
              const solEnviada = ['despachada', 'recibida'].includes(sol.status);
              const solRecibida = sol.status === 'recibida';
              const pasoActual = solRecibida ? 2 : solEnviada ? 1 : 0;
              const SOL_PASO_LABEL = ['Solicitada', 'Enviada', 'Recibida'];
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
                  <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    {sol.status === 'pendiente' && (
                      <button
                        onClick={() => { if (!confirm('¿Desistir de esta solicitud de muestra?')) return; updateMktSolicitudStatus(sol.id, 'rechazada').then(() => setMisSolicitudes(prev => prev.filter(s => s.id !== sol.id))); }}
                        style={{ background: 'none', border: `1px solid ${C.tan}`, color: C.tan, borderRadius: 8, padding: '6px 14px', fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Desistir
                      </button>
                    )}
                    {sol.status === 'despachada' && (
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
                    {sol.status === 'recibida' && lote && lote.puntajeOficial && lote.status === 'publicado' && (
                      <button onClick={() => { setLoteEnfocado(lote.id); setVistaActual('catalogo'); }} style={{
                        background: C.terra, color: 'white', border: 'none', borderRadius: 8,
                        padding: '8px 16px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      }}>
                        Comprar sacos →
                      </button>
                    )}
                    {sol.status === 'recibida' && lote && !lote.puntajeOficial && (
                      <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, fontStyle: 'italic' }}>
                        Esperando certificación SCA del lote
                      </span>
                    )}
                    {sol.status === 'recibida' && lote?.status === 'agotado' && (
                      <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: '#888' }}>Lote agotado</span>
                    )}
                  </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Vista: Mis pedidos */}
      {vistaActual === 'pedidos' && (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '20px 16px' : '32px 40px', paddingBottom: carrito.length > 0 ? 100 : 32 }}>
          <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, margin: '0 0 6px' }}>
            Mis pedidos
          </h2>
          <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, marginBottom: 24 }}>
            Pedidos B2B de sacos de café verde.
          </p>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan }}>Estado:</span>
              {([
                { key: 'todos', label: 'Todos' },
                { key: 'pendiente', label: 'Pago pendiente' },
                { key: 'verificado', label: 'Confirmado' },
                { key: 'en_transito', label: 'En tránsito' },
                { key: 'entregado', label: 'Entregado' },
                { key: 'cancelado', label: 'Cancelado' },
              ] as { key: typeof filtroStatusPedidos; label: string }[]).map(({ key, label }) => (
                <button key={key} onClick={() => setFiltroStatusPedidos(key)} style={{
                  background: filtroStatusPedidos === key ? C.terra : '#f0ebe4',
                  color: filtroStatusPedidos === key ? 'white' : C.brown,
                  border: 'none', borderRadius: 20, padding: '7px 14px', minHeight: 36,
                  fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 'auto' }}>
              <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan }}>Orden:</span>
              {([
                { key: 'reciente', label: 'Más reciente' },
                { key: 'antiguo', label: 'Más antiguo' },
              ] as { key: typeof filtroOrdenPedidos; label: string }[]).map(({ key, label }) => (
                <button key={key} onClick={() => setFiltroOrdenPedidos(key)} style={{
                  background: filtroOrdenPedidos === key ? C.brown : '#f0ebe4',
                  color: filtroOrdenPedidos === key ? 'white' : C.brown,
                  border: 'none', borderRadius: 20, padding: '7px 14px', minHeight: 36,
                  fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {(() => {
            const pedidosFiltrados = misPedidos
              .filter(p => {
                if (filtroStatusPedidos === 'todos') return true;
                if (filtroStatusPedidos === 'pendiente') return p.pagoStatus === 'pendiente';
                if (filtroStatusPedidos === 'verificado') return p.pagoStatus === 'verificado' && p.logisticaStatus !== 'entregado' && p.logisticaStatus !== 'cancelado';
                if (filtroStatusPedidos === 'en_transito') return p.logisticaStatus === 'en_transito';
                if (filtroStatusPedidos === 'entregado') return p.logisticaStatus === 'entregado';
                if (filtroStatusPedidos === 'cancelado') return p.logisticaStatus === 'cancelado' || p.pagoStatus === 'rechazado';
                return true;
              })
              .sort((a, b) => filtroOrdenPedidos === 'reciente'
                ? b.createdAt.localeCompare(a.createdAt)
                : a.createdAt.localeCompare(b.createdAt));

            if (pedidosFiltrados.length === 0 && misPedidos.length === 0) return (
              <div style={{ background: 'white', borderRadius: 12, padding: 24, textAlign: 'center' }}>
                <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan }}>
                  Aún no tienes pedidos. Cuando reserves sacos de un lote aparecerán aquí.
                </p>
              </div>
            );
            if (pedidosFiltrados.length === 0) return (
              <div style={{ background: 'white', borderRadius: 12, padding: 24, textAlign: 'center' }}>
                <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan }}>
                  No hay pedidos con el filtro seleccionado.
                </p>
              </div>
            );
            return pedidosFiltrados.map(ped => {
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
                        background: ped.pagoStatus === 'verificado' ? `${C.sage}20`
                          : ped.pagoStatus === 'en_revision' ? '#f0ebff'
                          : vencida ? '#ffe5e5' : `${C.terra}15`,
                        color: ped.pagoStatus === 'verificado' ? '#3a6b3a'
                          : ped.pagoStatus === 'en_revision' ? '#8a6fc9'
                          : vencida ? '#c0392b' : C.terra,
                        fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700,
                        padding: '4px 12px', borderRadius: 20,
                      }}>
                        {ped.pagoStatus === 'verificado'
                          ? ped.logisticaStatus === 'entregado' ? '✓ Entregado' : '✓ Pago confirmado'
                          : ped.pagoStatus === 'en_revision' ? '🕐 Comprobante en revisión'
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
                          ['Flete', `S/ ${(ped.fletePEN ?? 0).toLocaleString()}`],
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
                          <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: '#8a6000', margin: '0 0 6px' }}>
                            Transfiere <strong>S/ {ped.totalPEN.toLocaleString()}</strong> e indica el número de pedido <strong>{ped.id}</strong>.
                          </p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: '#8a6000', margin: '0 0 10px' }}>
                            <strong>BCP · Cta. Corriente:</strong> 191-12345678-0-90<br />
                            <strong>CCI:</strong> 002-191-00123456789090<br />
                            <strong>A nombre de:</strong> Tunay Wasi S.A.C.
                          </p>
                          {/* Botón subir voucher */}
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            style={{ display: 'none' }}
                            ref={el => { voucherInputRefs.current[ped.id] = el; }}
                            onChange={async e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setSubiendoVoucher(ped.id);
                              try {
                                await subirVoucherPedido(ped.id, file);
                                setMisPedidos(prev => prev.map(p => p.id === ped.id ? { ...p, pagoStatus: 'en_revision' } : p));
                              } catch {
                                alert('Error al subir el comprobante. Intenta de nuevo.');
                              } finally {
                                setSubiendoVoucher(null);
                                if (voucherInputRefs.current[ped.id]) voucherInputRefs.current[ped.id]!.value = '';
                              }
                            }}
                          />
                          <button
                            onClick={() => voucherInputRefs.current[ped.id]?.click()}
                            disabled={subiendoVoucher === ped.id}
                            style={{
                              background: C.terra, color: 'white', border: 'none', borderRadius: 8,
                              padding: '9px 18px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700,
                              cursor: subiendoVoucher === ped.id ? 'not-allowed' : 'pointer',
                              opacity: subiendoVoucher === ped.id ? 0.6 : 1,
                            }}
                          >
                            {subiendoVoucher === ped.id ? 'Subiendo...' : '📎 Ya pagué — subir comprobante'}
                          </button>
                        </div>
                      )}
                      {/* Pago en revisión */}
                      {ped.pagoStatus === 'en_revision' && (
                        <div style={{ padding: '12px 16px', background: '#f5f0ff', borderRadius: 8, border: '1px solid #c5a8f0' }}>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: '#8a6fc9', margin: '0 0 4px', fontWeight: 700 }}>
                            🕐 Comprobante recibido — en revisión
                          </p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: '#8a6fc9', margin: 0 }}>
                            Estamos verificando tu transferencia. El pedido entrará en preparación una vez confirmado (generalmente en pocas horas).
                          </p>
                          {ped.comprobanteUrl && (
                            <a href={ped.comprobanteUrl} target="_blank" rel="noreferrer" style={{ fontFamily: 'Montserrat', fontSize: 11, color: '#8a6fc9', fontWeight: 700, display: 'inline-block', marginTop: 8 }}>
                              Ver comprobante →
                            </a>
                          )}
                        </div>
                      )}
                      {/* Pago rechazado */}
                      {ped.pagoStatus === 'rechazado' && (
                        <div style={{ padding: '12px 16px', background: '#fff0f0', borderRadius: 8, border: '1px solid #f5a0a0' }}>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: '#c0392b', margin: '0 0 4px', fontWeight: 700 }}>
                            ✕ Pago rechazado
                          </p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: '#c0392b', margin: 0 }}>
                            No pudimos verificar tu pago. Contacta a soporte@tunaywasi.com con tu comprobante.
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

                      {/* Confirmar recepción — cafetería confirma cuando pedido llega */}
                      {ped.logisticaStatus === 'en_transito' && (
                        <div style={{ marginBottom: 16, background: '#f5f9f5', border: `1px solid ${C.sage}40`, borderRadius: 8, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: '#3a6b3a', margin: 0, fontWeight: 600 }}>
                            ¿Recibiste el café? Confirma la recepción para liberar el pago al productor.
                          </p>
                          <button
                            onClick={async () => {
                              if (!confirm('¿Confirmar que recibiste el pedido en tu local?')) return;
                              setConfirmandoEntregaPedido(ped.id);
                              await updateMktPedidoLogistica(ped.id, 'entregado');
                              saveNotif(ped.caficultorId, {
                                titulo: '📦 Pedido entregado',
                                cuerpo: `${ped.razonSocial} confirmó la recepción del pedido ${ped.id}. Pronto recibirás tu pago.`,
                                url: 'mis_pagos',
                              }).catch(() => {});
                              setMisPedidos(prev => prev.map(p => p.id === ped.id ? { ...p, logisticaStatus: 'entregado' } : p));
                              setConfirmandoEntregaPedido(null);
                            }}
                            disabled={confirmandoEntregaPedido === ped.id}
                            style={{
                              background: C.sage, color: 'white', border: 'none', borderRadius: 8,
                              padding: '9px 18px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700,
                              cursor: confirmandoEntregaPedido === ped.id ? 'not-allowed' : 'pointer',
                              opacity: confirmandoEntregaPedido === ped.id ? 0.6 : 1,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {confirmandoEntregaPedido === ped.id ? 'Confirmando...' : 'Confirmar recepción ✓'}
                          </button>
                        </div>
                      )}

                      {/* Calificación al caficultor — solo cuando entregado (G-23) */}
                      {ped.logisticaStatus === 'entregado' && (
                        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                          {calificacionesYaHechas.has(ped.id) ? (
                            <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.sage, fontWeight: 700 }}>
                              ✓ Ya calificaste a este caficultor
                            </span>
                          ) : (
                            <button
                              onClick={() => { setModalCalifPedido(ped); setCalifPuntaje(5); setCalifComentario(''); }}
                              style={{ background: C.terra, color: 'white', border: 'none', borderRadius: 8, padding: '8px 18px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                            >
                              ★ Calificar caficultor
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Vista: Catálogo */}
      {vistaActual === 'catalogo' && (<>

      {/* Hero B2B — solo desktop */}
      {!isMobile && <div style={{
        background: C.green,
        padding: '48px 40px 40px',
        color: C.cream,
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontFamily: 'Montserrat', fontSize: 11, letterSpacing: 3, color: C.sage, marginBottom: 8, textTransform: 'uppercase' }}>
            Café verde · Microlotes certificados
          </p>
          <h1 style={{ fontFamily: 'Cormorant Garamond', fontSize: isMobile ? 28 : 'clamp(32px,4vw,52px)', fontWeight: 700, margin: '0 0 8px', lineHeight: 1.1 }}>
            Compra directo del caficultor.<br/>Con trazabilidad completa.
          </h1>
          {!isMobile && (
            <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.tan, maxWidth: 560, lineHeight: 1.7 }}>
              Café verde en grano. Sacos de 60 kg. Puntaje SCA verificado por laboratorio certificado.
              Ficha técnica descargable para tu empaque. Pago al caficultor garantizado.
            </p>
          )}

          {/* Stats */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? 16 : 40, marginTop: isMobile ? 16 : 32 }}>
            {[
              { n: '4', label: 'lotes disponibles' },
              { n: '10%', label: 'comisión' },
              { n: '24h', label: 'pago caficultor' },
              { n: 'S/1,008', label: 'precio/saco Lima' },
            ].map(s => (
              <div key={s.n} style={{ minWidth: isMobile ? 'calc(50% - 8px)' : 'auto' }}>
                <div style={{ fontFamily: 'Cormorant Garamond', fontSize: isMobile ? 22 : 28, fontWeight: 700, color: C.cream }}>{s.n}</div>
                <div style={{ fontFamily: 'Montserrat', fontSize: isMobile ? 10 : 11, color: C.tan, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>}

      {/* Filtros mobile — chips horizontales */}
      {isMobile && (
        <div style={{ borderBottom: '1px solid #eee', background: 'white' }}>
          <div className="tw-tabs-scroll" style={{ display: 'flex', gap: 8, padding: '10px 16px' }}>
            {['todos', 'lavado', 'natural', 'honey', 'anaerobico'].map(p => (
              <button key={p} onClick={() => setFiltroProceso(p)} style={{
                flexShrink: 0,
                background: filtroProceso === p ? C.terra : '#f0ebe4',
                color: filtroProceso === p ? 'white' : C.brown,
                border: 'none', borderRadius: 20, padding: '7px 16px',
                fontFamily: 'Montserrat', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                minHeight: 36,
              }}>
                {p === 'todos' ? 'Todos' : PROCESO_LABEL[p]}
              </button>
            ))}
            <div style={{ width: 1, background: '#ddd', flexShrink: 0, margin: '4px 0' }} />
            {[0, 82, 84, 86, 88].map(pts => (
              <button key={pts} onClick={() => setFiltroSCA(pts)} style={{
                flexShrink: 0,
                background: filtroSCA === pts ? C.green : '#f0ebe4',
                color: filtroSCA === pts ? 'white' : C.brown,
                border: 'none', borderRadius: 20, padding: '7px 14px',
                fontFamily: 'Montserrat', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                minHeight: 36,
              }}>
                {pts === 0 ? 'SCA: todos' : `${pts}+`}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '16px 16px' : '32px 40px', paddingBottom: isMobile ? 80 : undefined }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '260px 1fr', gap: isMobile ? 16 : 32, alignItems: 'start' }}>

          {/* Sidebar filtros — solo desktop */}
          {!isMobile && <aside>
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
          </aside>}

          {/* Grid de lotes */}
          <div>
            {!isMobile && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan }}>
                  {lotes.length} lote{lotes.length !== 1 ? 's' : ''} encontrado{lotes.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}

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
                    gridTemplateColumns: isMobile ? '1fr' : '200px 1fr',
                    transition: 'box-shadow 0.3s',
                  }}>
                    {/* Foto */}
                    <div style={{ position: 'relative', overflow: 'hidden', height: isMobile ? 180 : '100%' }}>
                      <img src={lote.fotoLoteUrl} alt={lote.nombreLote}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', minHeight: isMobile ? 180 : 200 }} />
                      {lote.destacado && (
                        <div style={{
                          position: 'absolute', top: 10, left: 10,
                          background: C.terra, color: 'white',
                          fontSize: 9, fontFamily: 'Montserrat', fontWeight: 700,
                          padding: '3px 8px', borderRadius: 20, letterSpacing: 1, textTransform: 'uppercase',
                        }}>Destacado</div>
                      )}
                      {lote.status !== 'publicado' && (
                        <div style={{
                          position: 'absolute', bottom: 10, left: 10,
                          background: badge.color, color: 'white',
                          fontSize: 9, fontFamily: 'Montserrat', fontWeight: 700,
                          padding: '3px 8px', borderRadius: 20,
                        }}>{badge.label}</div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ padding: isMobile ? '16px' : '20px 24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <div>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>
                            {lote.id} · {lote.region}
                          </p>
                          <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, fontWeight: 700, color: C.brown, margin: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            {lote.nombreLote}
                            {lote.sacosDisponibles === 1 && (
                              <span style={{ fontFamily: 'Montserrat', fontSize: 10, fontWeight: 700, color: C.terra, background: `${C.terra}15`, padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' }}>
                                🎯 Microlote
                              </span>
                            )}
                          </h3>
                          {(() => {
                            const badgeCalidad = getBadgeCalidad(lote);
                            if (!badgeCalidad) return null;
                            return (
                              <span style={{
                                fontFamily: 'Montserrat', fontSize: 10, fontWeight: 700,
                                color: 'white', background: badgeCalidad.color,
                                padding: '3px 10px', borderRadius: 20, display: 'inline-block', marginTop: 4,
                              }}>
                                {badgeCalidad.label}
                              </span>
                            );
                          })()}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
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
                        <div
                          onClick={() => {
                            setModalCaficultor(caficultor);
                            setModalCaficultorCalifs(null);
                            setModalCaficultorPedidos(null);
                            fetchCalificacionesByDestinatario(caficultor.id).then(cals => {
                              const calsCaf = cals.filter(c => c.destinatarioRol === 'caficultor');
                              if (calsCaf.length > 0) {
                                const promedio = calsCaf.reduce((s, c) => s + c.puntaje, 0) / calsCaf.length;
                                setModalCaficultorCalifs({ promedio, total: calsCaf.length });
                              } else {
                                setModalCaficultorCalifs({ promedio: 0, total: 0 });
                              }
                            });
                            fetchMktPedidosByCaficultor(caficultor.id).then(peds => {
                              setModalCaficultorPedidos(peds.filter(p => p.pagoStatus === 'verificado').length);
                            });
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, cursor: 'pointer' }}
                        >
                          <img src={caficultor.fotoUrl} alt={caficultor.nombreProductor}
                            style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                          <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, textDecoration: 'underline dotted' }}>
                            {caficultor.nombreProductor} · {caficultor.nombreFinca}
                          </span>
                        </div>
                      )}

                      {/* Acciones */}
                      {lote.status === 'publicado' && (
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                          {loteLleno === lote.id ? (
                            <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.terra, fontWeight: 600 }}>
                              Este lote está siendo evaluado por otras cafeterías. Te notificamos si queda disponible.
                            </span>
                          ) : (() => {
                            const yaSolicitada = lotesSolicitados.has(lote.id);
                            if (lote.precioVentaPEN && lote.puntajeOficial) {
                              const comision = Math.round(lote.precioOrigenPEN * COMISION_TW);
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                                  {/* Desglose de precio — solo desktop */}
                                  {!isMobile && (
                                    <div style={{ background: '#fafaf8', border: '1px solid #ede8e0', borderRadius: 10, padding: '10px 14px', fontSize: 11, fontFamily: 'Montserrat' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', color: C.tan, marginBottom: 4 }}>
                                        <span>Precio caficultor / saco</span>
                                        <span style={{ color: C.brown, fontWeight: 600 }}>S/ {lote.precioOrigenPEN.toLocaleString()}</span>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', color: C.tan, marginBottom: 4 }}>
                                        <span>Comisión plataforma (10%)</span>
                                        <span style={{ color: C.brown }}>S/ {comision.toLocaleString()}</span>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', color: C.tan, marginBottom: 4 }}>
                                        <span>Flete Lima</span>
                                        <span style={{ color: C.brown }}>S/ {FLETE_POR_SACO_PEN}</span>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ede8e0', paddingTop: 6, marginTop: 2 }}>
                                        <span style={{ fontWeight: 700, color: C.brown }}>Total / saco (sin IGV)</span>
                                        <span style={{ fontWeight: 700, color: C.terra }}>S/ {lote.precioVentaPEN.toLocaleString()}</span>
                                      </div>
                                    </div>
                                  )}
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
                                        {isMobile
                                          ? `S/${lote.precioVentaPEN.toLocaleString()}/saco`
                                          : `saco${(sacosSeleccionados[lote.id] ?? 1) !== 1 ? 's' : ''} × S/${lote.precioVentaPEN.toLocaleString()}`}
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
                                      Reservar →
                                    </button>
                                    {!isMobile && (
                                      <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan }}>
                                        {disponibles} saco{disponibles !== 1 ? 's' : ''} disponible{disponibles !== 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </div>
                                  {/* Botón muestra en paralelo al comprar — solo si caficultor participó en el hub */}
                                  {(lote.stockMuestrasHub ?? 0) > 0 || lote.muestraEnCamino ? (() => {
                                    const yaSolicitada = lotesSolicitados.has(lote.id);
                                    const stockHub = lote.stockMuestrasHub ?? 0;
                                    if (yaSolicitada) return (
                                      <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.sage, fontWeight: 600 }}>
                                        ✓ Muestra ya solicitada
                                      </span>
                                    );
                                    if (stockHub > 0) return (
                                      <button
                                        onClick={() => agregarMuestra(lote)}
                                        style={{
                                          background: 'transparent', color: C.brown, border: `1.5px solid ${C.brown}`,
                                          borderRadius: 8, padding: '8px 16px', fontFamily: 'Montserrat', fontSize: 12,
                                          fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start',
                                        }}
                                      >
                                        Pedir muestra 200g (S/{lote.precioMuestraPEN}) →
                                      </button>
                                    );
                                    return (
                                      <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, fontStyle: 'italic' }}>
                                        Muestras agotadas temporalmente
                                      </span>
                                    );
                                  })() : null}
                                </div>
                              );
                            }
                            const sinStockHub = (lote.stockMuestrasHub ?? 0) === 0;
                            const loteLimitado = loteLleno === lote.id;
                            const deshabilitado = yaSolicitada || sinStockHub || loteLimitado;
                            if (sinStockHub) {
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  <button disabled style={{
                                    background: '#e0e0e0', color: '#999', border: 'none', borderRadius: 8,
                                    padding: '10px 18px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700,
                                    cursor: 'not-allowed',
                                  }}>
                                    Muestras agotadas temporalmente
                                  </button>
                                  <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, fontStyle: 'italic' }}>
                                    El caficultor está preparando el próximo envío al hub Lima.
                                  </span>
                                </div>
                              );
                            }
                            return (
                              <button
                                onClick={() => agregarMuestra(lote)}
                                disabled={deshabilitado}
                                style={{
                                  background: yaSolicitada ? C.sage : loteLimitado ? '#888' : C.terra,
                                  color: 'white', border: 'none', borderRadius: 8, padding: '10px 18px',
                                  fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700,
                                  cursor: deshabilitado ? 'default' : 'pointer',
                                  opacity: deshabilitado ? 0.8 : 1,
                                }}
                              >
                                {yaSolicitada ? '✓ Muestra ya solicitada' : loteLimitado ? 'Máximo de solicitudes alcanzado' : 'Solicitar muestra (200g) →'}
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
                          {lote.status === 'agotado' && (
                            <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: '#888' }}>
                              Agotado
                            </span>
                          )}
                          {lote.status === 'en_catacion' && lote.precioVentaPEN && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                              <div style={{ background: '#fffbf0', border: '1px solid #d6b15a60', borderRadius: 10, padding: '10px 14px' }}>
                                <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: '#d6b15a', fontWeight: 700, margin: '0 0 4px' }}>
                                  ⚠ Calidad no verificada — en proceso de certificación SCA
                                </p>
                                <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: 0, lineHeight: 1.5 }}>
                                  Este lote aún no tiene puntaje SCA oficial. Si compras ahora, asumes el riesgo de calidad.
                                </p>
                              </div>
                              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <input
                                    type="number" min={1} max={lote.sacosDisponibles - lote.sacosReservados}
                                    value={sacosSeleccionados[lote.id] ?? 1}
                                    onChange={e => setSacosSeleccionados(prev => ({ ...prev, [lote.id]: Number(e.target.value) }))}
                                    style={{ width: 60, padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 13, textAlign: 'center' }}
                                  />
                                  <span style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan }}>
                                    saco{(sacosSeleccionados[lote.id] ?? 1) !== 1 ? 's' : ''} × S/{lote.precioVentaPEN.toLocaleString()}
                                  </span>
                                </div>
                                <button
                                  onClick={() => {
                                    if (!confirm('Este lote está en proceso de certificación SCA. Al comprar asumes el riesgo de calidad. ¿Continuar?')) return;
                                    agregarSacos(lote);
                                  }}
                                  style={{
                                    background: '#d6b15a', color: 'white', border: 'none', borderRadius: 8,
                                    padding: '10px 18px', fontFamily: 'Montserrat', fontSize: 13,
                                    fontWeight: 700, cursor: 'pointer',
                                  }}
                                >
                                  Reservar sacos (sin cert.) →
                                </button>
                              </div>
                            </div>
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

      {/* Modal perfil caficultor */}
      {modalCaficultor && (
        <div
          onClick={() => setModalCaficultor(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, maxWidth: 360, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <img src={modalCaficultor.fotoUrl} alt={modalCaficultor.nombreProductor}
                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${C.cream}` }} />
              <div>
                <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, color: C.brown, margin: 0, fontWeight: 700 }}>{modalCaficultor.nombreProductor}</p>
                <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: '4px 0 0' }}>Productor de café de especialidad</p>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>Finca</p>
                <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.brown, margin: 0, fontWeight: 600 }}>{modalCaficultor.nombreFinca}</p>
              </div>
              <div>
                <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>Región</p>
                <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.brown, margin: 0 }}>{modalCaficultor.region}</p>
              </div>
              <div>
                <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>Calificación</p>
                {modalCaficultorCalifs === null ? (
                  <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: 0 }}>Cargando...</p>
                ) : modalCaficultorCalifs.total === 0 ? (
                  <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: 0 }}>Sin calificaciones aún</p>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16, color: '#d6b15a', letterSpacing: 2 }}>
                      {'★'.repeat(Math.round(modalCaficultorCalifs.promedio))}{'☆'.repeat(5 - Math.round(modalCaficultorCalifs.promedio))}
                    </span>
                    <span style={{ fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, color: C.brown }}>
                      {modalCaficultorCalifs.promedio.toFixed(1)}
                    </span>
                    <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan }}>
                      ({modalCaficultorCalifs.total} {modalCaficultorCalifs.total === 1 ? 'reseña' : 'reseñas'})
                    </span>
                  </div>
                )}
              </div>
              <div>
                <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>Pedidos completados</p>
                <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.brown, margin: 0, fontWeight: 600 }}>
                  {modalCaficultorPedidos === null ? 'Cargando...' : modalCaficultorPedidos === 0 ? 'Sin pedidos aún' : `${modalCaficultorPedidos} pedido${modalCaficultorPedidos !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setModalCaficultor(null)}
              style={{ marginTop: 20, width: '100%', background: C.green, color: C.cream, border: 'none', borderRadius: 8, padding: '10px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>)}

      {/* Modal calificación al caficultor (G-23) */}
      {modalCalifPedido && (
        <div
          onClick={() => !guardandoCalif && setModalCalifPedido(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(31,48,40,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 18, padding: '32px 28px', maxWidth: 400, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
            <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 24, color: C.brown, margin: '0 0 4px' }}>
              Calificar caficultor
            </h3>
            <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: '0 0 20px' }}>
              Pedido {modalCalifPedido.id} · {todosLotes.find(l => l.id === modalCalifPedido.loteId)?.nombreLote ?? modalCalifPedido.loteId}
            </p>
            {/* Selector de estrellas */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 18, justifyContent: 'center' }}>
              {([1,2,3,4,5] as (1|2|3|4|5)[]).map(n => (
                <button
                  key={n}
                  onClick={() => setCalifPuntaje(n)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 32, lineHeight: 1,
                    color: n <= califPuntaje ? '#f5a623' : '#ddd',
                    transition: 'color 0.1s',
                  }}
                >
                  ★
                </button>
              ))}
            </div>
            <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: '0 0 6px' }}>
              Comentario (opcional)
            </p>
            <textarea
              value={califComentario}
              onChange={e => setCalifComentario(e.target.value.slice(0, 300))}
              maxLength={300}
              rows={3}
              placeholder="¿Cómo fue la experiencia con este caficultor?"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e0d8d0', fontFamily: 'Montserrat', fontSize: 12, resize: 'none', boxSizing: 'border-box', outline: 'none' }}
            />
            <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, textAlign: 'right', margin: '2px 0 16px' }}>
              {califComentario.length}/300
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleGuardarCalificacion}
                disabled={guardandoCalif}
                style={{ flex: 1, background: C.terra, color: 'white', border: 'none', borderRadius: 10, padding: '11px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, cursor: guardandoCalif ? 'not-allowed' : 'pointer', opacity: guardandoCalif ? 0.7 : 1 }}
              >
                {guardandoCalif ? 'Guardando...' : 'Enviar calificación →'}
              </button>
              <button
                onClick={() => setModalCalifPedido(null)}
                disabled={guardandoCalif}
                style={{ background: '#f0ebe4', color: C.brown, border: 'none', borderRadius: 10, padding: '11px 16px', fontFamily: 'Montserrat', fontSize: 12, cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
