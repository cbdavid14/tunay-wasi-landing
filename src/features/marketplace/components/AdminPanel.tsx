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
import {
  fetchMktLotes,
  fetchMktPedidos,
  liberarReservaPedido,
  verificarPagoPedido,
  marcarPagoCaficultor,
  marcarPagoLaboratorio,
  updateMktPedidoLogistica,
  fetchMktLaboratorios,
} from '@/features/marketplace/marketplaceService';
import { fetchCafeterias, toggleTieneLaboratorio } from '@/shared/perfilService';
import type { LoteDoc, PedidoB2BDoc, LaboratorioDoc } from '@/shared/types/marketplace';
import type { PerfilCafeteria } from '@/shared/types/auth';

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

type AdminTab = 'dashboard' | 'pagos' | 'logistica' | 'lotes' | 'reservas' | 'laboratorios';

export default function AdminPanel() {
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [todosLotes, setTodosLotes] = useState<LoteDoc[]>([]);
  const [pedidos, setPedidos] = useState<PedidoB2BDoc[]>([]);
  const [liberando, setLiberando] = useState<string | null>(null);
  const [verificando, setVerificando] = useState<string | null>(null);
  const [pagando, setPagando] = useState<string | null>(null);
  const [marcandoEntregado, setMarcandoEntregado] = useState<string | null>(null);
  const [laboratorios, setLaboratorios] = useState<LaboratorioDoc[]>([]);
  const [cafeterias, setCafeterias] = useState<PerfilCafeteria[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([fetchMktLotes(), fetchMktPedidos(), fetchMktLaboratorios(), fetchCafeterias()]).then(
      ([lotesR, pedsR, labsR, cafsR]) => {
        if (lotesR.status === 'rejected') console.error('[Admin] mkt_lotes:', lotesR.reason);
        if (pedsR.status === 'rejected') console.error('[Admin] mkt_pedidos:', pedsR.reason);
        if (labsR.status === 'rejected') console.error('[Admin] mkt_laboratorios:', labsR.reason);
        if (cafsR.status === 'rejected') console.error('[Admin] mkt_usuarios/cafeterias:', cafsR.reason);
        if (lotesR.status === 'fulfilled') setTodosLotes(lotesR.value);
        if (pedsR.status === 'fulfilled') setPedidos(pedsR.value);
        if (labsR.status === 'fulfilled') setLaboratorios(labsR.value);
        if (cafsR.status === 'fulfilled') setCafeterias(cafsR.value);
      }
    );
  }, []);

  async function handleLiberarReserva(ped: PedidoB2BDoc) {
    setLiberando(ped.id);
    await liberarReservaPedido(ped.id, ped.loteId, ped.sacosSolicitados);
    setPedidos(prev => prev.map(p => p.id === ped.id ? { ...p, pagoStatus: 'rechazado', logisticaStatus: 'cancelado' } : p));
    setLiberando(null);
  }

  async function handleVerificarPago(ped: PedidoB2BDoc) {
    setVerificando(ped.id);
    await verificarPagoPedido(ped.id);
    setPedidos(prev => prev.map(p => p.id === ped.id ? { ...p, pagoStatus: 'verificado', logisticaStatus: 'en_origen' } : p));
    setVerificando(null);
  }

  async function handlePagarCaficultor(ped: PedidoB2BDoc) {
    setPagando(ped.id);
    await marcarPagoCaficultor(ped.id);
    setPedidos(prev => prev.map(p => p.id === ped.id ? { ...p, pagoCaficultorStatus: 'pagado' } : p));
    setPagando(null);
  }

  async function handleMarcarEntregado(ped: PedidoB2BDoc) {
    setMarcandoEntregado(ped.id);
    await updateMktPedidoLogistica(ped.id, 'entregado');
    setPedidos(prev => prev.map(p => p.id === ped.id ? { ...p, logisticaStatus: 'entregado' } : p));
    setMarcandoEntregado(null);
  }

  async function handleToggleLab(uid: string, actual: boolean) {
    setToggling(uid);
    await toggleTieneLaboratorio(uid, !actual);
    setCafeterias(prev => prev.map(c => c.uid === uid ? { ...c, tieneLaboratorio: !actual } : c));
    setToggling(null);
  }

  async function handlePagarLaboratorio(ped: PedidoB2BDoc) {
    setPagando(`lab-${ped.id}`);
    await marcarPagoLaboratorio(ped.id);
    setPedidos(prev => prev.map(p => p.id === ped.id ? { ...p, pagoLaboratorioStatus: 'pagado', pagoLaboratorioAt: new Date().toISOString() } : p));
    setPagando(null);
  }

  const now = Date.now();
  const reservasVencidas = pedidos.filter(p =>
    p.pagoStatus === 'pendiente' && new Date(p.reservaExpiraAt).getTime() < now
  );
  const reservasPendientes = pedidos.filter(p =>
    p.pagoStatus === 'pendiente' && new Date(p.reservaExpiraAt).getTime() >= now
  );

  const totalIngresosMes = pedidos.reduce((s, p) => s + (p.pagoStatus === 'verificado' ? p.subtotalPEN * 0.10 : 0), 0);
  const totalVolumenKg = pedidos.filter(p => p.pagoStatus === 'verificado').reduce((s, p) => s + p.kgTotal, 0);
  const lotesPublicados = todosLotes.filter(l => l.status === 'publicado');
  const lotesEnFlujo = todosLotes.filter(l => ['muestra_solicitada', 'muestra_enviada', 'en_catacion'].includes(l.status));

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
            { key: 'dashboard',    label: 'Dashboard' },
            { key: 'pagos',        label: 'Pagos' },
            { key: 'logistica',    label: 'Logística' },
            { key: 'lotes',        label: 'Lotes' },
            { key: 'reservas',     label: 'Reservas' },
            { key: 'laboratorios', label: 'Laboratorios' },
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
              {[
                { label: 'Lotes publicados', val: lotesPublicados.length, color: C.sage },
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
                {lotesEnFlujo.map(l => (
                  <div key={l.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#f5f5ff', border: `1px solid ${C.tan}20`, borderRadius: 8, padding: '12px 16px',
                  }}>
                    <div>
                      <p style={{ fontFamily: 'Montserrat', fontSize: 13, fontWeight: 600, color: C.brown, margin: '0 0 2px' }}>
                        En flujo: {l.nombreLote}
                      </p>
                      <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: 0 }}>
                        Estado: <strong>{l.status}</strong>
                      </p>
                    </div>
                  </div>
                ))}
                {pedidos.filter(p => p.pagoStatus === 'verificado' && p.logisticaStatus === 'en_transito').map(p => (
                  <div key={`${p.id}-entregar`} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#fff8e8', border: `1px solid #d6b15a40`, borderRadius: 8, padding: '12px 16px',
                  }}>
                    <div>
                      <p style={{ fontFamily: 'Montserrat', fontSize: 13, fontWeight: 600, color: C.brown, margin: '0 0 2px' }}>
                        Confirmar entrega: {p.id}
                      </p>
                      <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: 0 }}>
                        {p.sacosSolicitados} saco(s) · Lote: {p.loteId}
                      </p>
                    </div>
                    <button
                      onClick={() => handleMarcarEntregado(p)}
                      disabled={marcandoEntregado === p.id}
                      style={{
                        background: '#d6b15a', color: 'white', border: 'none', borderRadius: 6,
                        padding: '8px 14px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 600,
                        cursor: marcandoEntregado === p.id ? 'not-allowed' : 'pointer',
                        opacity: marcandoEntregado === p.id ? 0.6 : 1,
                      }}
                    >
                      {marcandoEntregado === p.id ? 'Guardando...' : 'Marcar entregado ✓'}
                    </button>
                  </div>
                ))}
                {pedidos.filter(p => p.pagoStatus === 'verificado' && p.logisticaStatus === 'entregado' && p.pagoCaficultorStatus === 'pendiente').flatMap(p => {
                  const rows = [
                    <div key={`${p.id}-caf`} style={{
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
                      <button
                        onClick={() => handlePagarCaficultor(p)}
                        disabled={pagando === p.id}
                        style={{
                          background: C.sage, color: 'white', border: 'none', borderRadius: 6,
                          padding: '8px 14px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 600,
                          cursor: pagando === p.id ? 'not-allowed' : 'pointer', opacity: pagando === p.id ? 0.6 : 1,
                        }}
                      >
                        {pagando === p.id ? 'Guardando...' : 'Marcar pagado'}
                      </button>
                    </div>,
                  ];
                  if ((p.feeLaboratorioPEN ?? 0) > 0) {
                    rows.push(
                      <div key={`${p.id}-lab`} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: '#fff8f5', border: `1px solid ${C.terra}30`, borderRadius: 8, padding: '12px 16px',
                      }}>
                        <div>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 13, fontWeight: 600, color: C.brown, margin: '0 0 2px' }}>
                            Pagar laboratorio: {p.id}
                          </p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: 0 }}>
                            Catación + tueste: S/ {(p.feeLaboratorioPEN ?? 0).toLocaleString()} · Lote: {p.loteId}
                          </p>
                        </div>
                        <span style={{
                          background: '#f0ebe4', color: C.tan, border: 'none', borderRadius: 6,
                          padding: '8px 14px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 600,
                        }}>
                          {p.pagoLaboratorioStatus === 'pagado'
                            ? `Lab pagado ✓ ${p.pagoLaboratorioAt ? new Date(p.pagoLaboratorioAt).toLocaleDateString('es-PE') : ''}`
                            : (
                              <button
                                onClick={() => handlePagarLaboratorio(p)}
                                disabled={pagando === `lab-${p.id}`}
                                style={{
                                  background: C.sage, color: 'white', border: 'none', borderRadius: 6,
                                  padding: '8px 14px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 600,
                                  cursor: pagando === `lab-${p.id}` ? 'not-allowed' : 'pointer',
                                  opacity: pagando === `lab-${p.id}` ? 0.6 : 1,
                                }}
                              >
                                {pagando === `lab-${p.id}` ? 'Guardando...' : 'Marcar lab pagado'}
                              </button>
                            )
                          }
                        </span>
                      </div>
                    );
                  }
                  return rows;
                })}
              </div>
            </div>
          </div>
        )}

        {/* PAGOS */}
        {tab === 'pagos' && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 24 }}>
              Pagos
            </h2>

            {/* Sección 1: Verificar transferencias */}
            <div style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <h3 style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.brown, margin: 0 }}>
                  Transferencias por verificar
                </h3>
                {pedidos.filter(p => p.pagoStatus === 'pendiente' && new Date(p.reservaExpiraAt).getTime() > Date.now()).length > 0 && (
                  <span style={{ background: C.terra, color: 'white', fontSize: 10, fontFamily: 'Montserrat', fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                    {pedidos.filter(p => p.pagoStatus === 'pendiente' && new Date(p.reservaExpiraAt).getTime() > Date.now()).length}
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {pedidos.filter(p => p.pagoStatus === 'pendiente' && new Date(p.reservaExpiraAt).getTime() > Date.now()).map(p => {
                  const expiraEn = new Date(p.reservaExpiraAt).getTime() - Date.now();
                  const horas = Math.floor(expiraEn / 3600000);
                  const mins = Math.floor((expiraEn % 3600000) / 60000);
                  return (
                    <div key={p.id} style={{ background: 'white', borderRadius: 12, padding: '18px 22px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: `1px solid ${C.terra}30` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>{p.id}</p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, color: C.brown, margin: '0 0 4px' }}>
                            {p.razonSocial} — {p.sacosSolicitados} saco{p.sacosSolicitados !== 1 ? 's' : ''} · Lote: {p.loteId}
                          </p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: '0 0 2px' }}>
                            Total a recibir: <strong style={{ color: C.brown }}>S/ {p.totalPEN.toLocaleString()}</strong>
                            {p.feeLaboratorioPEN ? ` (incluye S/ ${p.feeLaboratorioPEN} lab)` : ''}
                          </p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.terra, margin: 0 }}>
                            Reserva vence en {horas}h {mins}m
                          </p>
                        </div>
                        <button
                          onClick={() => handleVerificarPago(p)}
                          disabled={verificando === p.id}
                          style={{
                            background: verificando === p.id ? '#ccc' : C.terra,
                            color: 'white', border: 'none', borderRadius: 8,
                            padding: '10px 18px', fontFamily: 'Montserrat', fontSize: 12,
                            fontWeight: 700, cursor: verificando === p.id ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {verificando === p.id ? 'Verificando...' : '✓ Marcar pago verificado'}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {pedidos.filter(p => p.pagoStatus === 'pendiente' && new Date(p.reservaExpiraAt).getTime() > Date.now()).length === 0 && (
                  <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, padding: '16px 0' }}>
                    No hay transferencias pendientes de verificar.
                  </p>
                )}
              </div>
            </div>

            {/* Sección 2: Pagar caficultor y lab */}
            <div>
              <h3 style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.brown, marginBottom: 14 }}>
                Distribuir pagos — pago verificado
              </h3>
              <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, marginBottom: 16 }}>
                Transferir al caficultor (y al lab si aplica) dentro de las 24h de confirmado el pago.
              </p>
              <div style={{ display: 'grid', gap: 12 }}>
                {pedidos.filter(p => p.pagoStatus === 'verificado' && p.pagoCaficultorStatus === 'pendiente').map(p => (
                  <div key={p.id} style={{ background: 'white', borderRadius: 12, padding: '18px 22px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: `1px solid ${C.sage}30` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>{p.id}</p>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, color: C.brown, margin: '0 0 6px' }}>
                          Lote: {p.loteId} · {p.sacosSolicitados} sacos
                        </p>
                        <div style={{ display: 'flex', gap: 16 }}>
                          <div style={{ background: '#f7f3ee', borderRadius: 8, padding: '8px 14px' }}>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 9, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>Caficultor</p>
                            <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 18, fontWeight: 700, color: C.brown, margin: 0 }}>S/ {p.montoCaficultorPEN.toLocaleString()}</p>
                          </div>
                          {p.feeLaboratorioPEN && (
                            <div style={{ background: '#f0ebe4', borderRadius: 8, padding: '8px 14px' }}>
                              <p style={{ fontFamily: 'Montserrat', fontSize: 9, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>Laboratorio</p>
                              <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 18, fontWeight: 700, color: C.brown, margin: 0 }}>S/ {p.feeLaboratorioPEN.toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handlePagarCaficultor(p)}
                        disabled={pagando === p.id}
                        style={{
                          background: pagando === p.id ? '#ccc' : C.sage,
                          color: 'white', border: 'none', borderRadius: 8,
                          padding: '10px 18px', fontFamily: 'Montserrat', fontSize: 12,
                          fontWeight: 700, cursor: pagando === p.id ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {pagando === p.id ? 'Registrando...' : '✓ Marcar pagado'}
                      </button>
                    </div>
                  </div>
                ))}
                {pedidos.filter(p => p.pagoStatus === 'verificado' && p.pagoCaficultorStatus === 'pendiente').length === 0 && (
                  <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, padding: '16px 0' }}>
                    No hay pagos pendientes de distribuir.
                  </p>
                )}
              </div>
            </div>
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
                  {todosLotes.map((l, i) => (
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
        {/* RESERVAS — liberación manual de reservas vencidas */}
        {tab === 'reservas' && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 6 }}>
              Gestión de reservas
            </h2>
            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, marginBottom: 24 }}>
              Reservas activas (72h window) y vencidas sin pago. Liberar una reserva cancela el pedido y devuelve los sacos al lote.
            </p>

            {/* Vencidas */}
            {reservasVencidas.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <h3 style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#c0392b', margin: 0 }}>
                    Reservas vencidas ({reservasVencidas.length})
                  </h3>
                  <span style={{ background: '#ffe5e5', color: '#c0392b', fontSize: 10, fontFamily: 'Montserrat', fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                    Acción requerida
                  </span>
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {reservasVencidas.map(p => (
                    <div key={p.id} style={{
                      background: 'white', borderRadius: 12, padding: '18px 22px',
                      border: '1.5px solid #e55', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12,
                    }}>
                      <div>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 2px' }}>
                          {p.id} · Lote: {p.loteId}
                        </p>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, color: C.brown, margin: '0 0 4px' }}>
                          {p.sacosSolicitados} saco{p.sacosSolicitados !== 1 ? 's' : ''} · S/ {p.totalPEN.toLocaleString()}
                        </p>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: '#c0392b', margin: 0 }}>
                          Venció: {new Date(p.reservaExpiraAt).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: '2px 0 0' }}>
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
            )}

            {/* Activas */}
            <div>
              <h3 style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.brown, marginBottom: 14 }}>
                Reservas activas ({reservasPendientes.length})
              </h3>
              {reservasPendientes.length === 0 && (
                <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, textAlign: 'center', padding: '30px 0' }}>
                  No hay reservas activas pendientes de pago.
                </p>
              )}
              <div style={{ display: 'grid', gap: 12 }}>
                {reservasPendientes.map(p => {
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
                        <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 2px' }}>
                          {p.id} · Lote: {p.loteId}
                        </p>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, color: C.brown, margin: '0 0 4px' }}>
                          {p.sacosSolicitados} saco{p.sacosSolicitados !== 1 ? 's' : ''} · S/ {p.totalPEN.toLocaleString()}
                        </p>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.terra, margin: 0 }}>
                          Vence en {horasRestantes}h {minutosRestantes}m — {new Date(p.reservaExpiraAt).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: '2px 0 0' }}>
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

            {reservasVencidas.length === 0 && reservasPendientes.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.tan }}>
                  No hay reservas activas ni vencidas en este momento.
                </p>
              </div>
            )}
          </div>
        )}

        {/* LABORATORIOS */}
        {tab === 'laboratorios' && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 24 }}>
              Laboratorios y accesos
            </h2>

            {/* Laboratorios independientes registrados */}
            <div style={{ marginBottom: 36 }}>
              <h3 style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.brown, marginBottom: 14 }}>
                Laboratorios independientes ({laboratorios.length})
              </h3>
              {laboratorios.length === 0 && (
                <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, padding: '20px 0' }}>
                  No hay laboratorios registrados.
                </p>
              )}
              <div style={{ display: 'grid', gap: 10 }}>
                {laboratorios.map(lab => (
                  <div key={lab.id} style={{
                    background: 'white', borderRadius: 12, padding: '16px 20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <p style={{ fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, color: C.brown, margin: '0 0 2px' }}>
                        {lab.nombreComercial}
                      </p>
                      <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: '0 0 2px' }}>
                        {lab.email} · {lab.telefono}
                      </p>
                      <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: 0 }}>
                        Catación SCA: S/ {lab.feeCatacionPEN}
                      </p>
                    </div>
                    <span style={{
                      background: lab.status === 'activo' ? `${C.sage}20` : '#f5f5f5',
                      color: lab.status === 'activo' ? C.sage : '#aaa',
                      fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700,
                      padding: '4px 12px', borderRadius: 20,
                    }}>
                      {lab.status === 'activo' ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cafeterías — toggle tieneLaboratorio */}
            <div>
              <h3 style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.brown, marginBottom: 6 }}>
                Cafeterías — acceso a lab propio
              </h3>
              <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, marginBottom: 14 }}>
                Activa "Lab propio" para cafeterías que tienen tostadora propia. Esto habilita el tab "Mi laboratorio" en su portal.
              </p>
              {cafeterias.length === 0 && (
                <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, padding: '20px 0' }}>
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
                      <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: 0 }}>
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
