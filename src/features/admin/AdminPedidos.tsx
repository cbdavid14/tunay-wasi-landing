import { useState, useEffect, useMemo } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { auth, db } from '@/shared/firebase';
import { confirmPayment, cancelOrder } from '@/features/checkout/orderService';
import type { PedidoDoc, PedidoStatus } from '@/shared/types/firestore';
import { Money } from '@/shared/money';

// ── Types ──────────────────────────────────────────────────────────────────

type FilterTab = 'todas' | PedidoStatus;

interface TabDef {
  key: FilterTab;
  label: string;
  match: (s: PedidoStatus) => boolean;
}

const TABS: TabDef[] = [
  { key: 'todas', label: 'Todas', match: () => true },
  { key: 'pendiente_pago', label: 'Pendiente', match: s => s === 'pendiente_pago' },
  { key: 'pago_confirmado', label: 'Confirmado', match: s => s === 'pago_confirmado' || s === 'confirmado' },
  { key: 'en_preparacion', label: 'Preparando', match: s => s === 'en_preparacion' },
  { key: 'despachado', label: 'Enviado', match: s => s === 'despachado' || s === 'enviado' },
  { key: 'entregado', label: 'Entregado', match: s => s === 'entregado' },
  { key: 'cancelado', label: 'Cancelado', match: s => s === 'cancelado' || s === 'reembolsado' },
];

type MethodFilter = 'todos' | string;

const adapterLabel: Record<string, string> = {
  yape: 'Yape',
  plin: 'Plin',
  transferencia: 'Transferencia BCP',
  niubiz: 'Niubiz',
  stripe: 'Stripe',
};

// ── Mock data fallback ────────────────────────────────────────────────────

const MOCK_PEDIDOS: PedidoDoc[] = [
  {
    id: 'mock-001',
    orderId: 'ORD-2041',
    status: 'pendiente_pago',
    adapter: 'yape',
    items: [
      {
        productoId: 'ml-0481', caficultorId: 'c-001', sku: 'ML-0481',
        name: 'Bello Horizonte - Geisha', weight: '250g', grind: 'V60',
        unitCents: 5800, qty: 2, caficultor: 'Darlyn Sánchez', finca: 'Bello Horizonte', producerPct: 42,
      },
    ],
    shipping: { nombre: 'Camila Reyes', email: 'camila@ejemplo.com', telefono: '+51 999 888 777', departamento: 'Lima', distrito: 'Miraflores', direccion: 'Av. Larco 123', referencia: 'Oficina 402', zone: 'lima' },
    totals: { subtotalCents: 11600, shippingCents: 800, discountCents: 0, taxIncludedCents: 1774, totalCents: 11600, producerShareCents: 4132 },
    cicloCloseAt: '31 may.', deliverEstimate: 'ago. (1a semana)',
    paymentRef: 'op. 8842019',
    createdAt: '2026-05-29T18:42:00.000Z', updatedAt: '2026-05-29T18:42:00.000Z',
  },
  {
    id: 'mock-002',
    orderId: 'ORD-2040',
    status: 'pendiente_pago',
    adapter: 'transferencia',
    items: [
      { productoId: 'ml-0479', caficultorId: 'c-002', sku: 'ML-0479', name: 'La Esperanza - Bourbon', weight: '250g', grind: 'Prensa', unitCents: 4900, qty: 1, caficultor: 'Margarita Flores', finca: 'La Esperanza', producerPct: 42 },
      { productoId: 'ml-0475', caficultorId: 'c-003', sku: 'ML-0475', name: 'El Palomar - Typica', weight: '250g', grind: 'V60', unitCents: 9800, qty: 1, caficultor: 'Roberto Mamani', finca: 'El Palomar', producerPct: 42 },
    ],
    shipping: { nombre: 'Andrés Figueroa', email: 'andres@ejemplo.com', telefono: '+51 988 777 666', departamento: 'Lima', distrito: 'Miraflores', direccion: 'Calle Las Flores 456', referencia: '', zone: 'lima' },
    totals: { subtotalCents: 14700, shippingCents: 800, discountCents: 0, taxIncludedCents: 2247, totalCents: 14700, producerShareCents: 5233 },
    cicloCloseAt: '31 may.', deliverEstimate: 'ago. (1a semana)',
    paymentRef: '00112-4471',
    createdAt: '2026-05-28T15:30:00.000Z', updatedAt: '2026-05-28T15:30:00.000Z',
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
    + ', ' + d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

function statusColor(status: PedidoStatus): string {
  switch (status) {
    case 'pendiente_pago':  return '#cda45e';
    case 'pago_confirmado':
    case 'confirmado':      return '#8faf8a';
    case 'en_preparacion':  return '#8faf8a';
    case 'despachado':
    case 'enviado':         return '#8faf8a';
    case 'entregado':       return '#8faf8a';
    case 'cancelado':       return '#c96e4b';
    case 'reembolsado':     return '#c96e4b';
    default:                return '#c4b297';
  }
}

function statusLabel(status: PedidoStatus): string {
  const map: Record<string, string> = {
    pendiente_pago: 'Pendiente',
    pago_confirmado: 'Confirmado',
    confirmado: 'Confirmado',
    en_preparacion: 'Preparando',
    despachado: 'Enviado',
    enviado: 'Enviado',
    entregado: 'Entregado',
    cancelado: 'Cancelado',
    reembolsado: 'Reembolsado',
  };
  return map[status] ?? status;
}

// ── Auth gate ──────────────────────────────────────────────────────────────

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError('Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.loginWrap}>
      <div style={s.loginCard}>
        <h1 style={s.logo}>TUNAY WASI</h1>
        <p style={s.logoSub}>Panel admin · Pedidos</p>
        <form onSubmit={handleSubmit} style={s.form}>
          <input style={s.input} type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required autoFocus />
          <input style={s.input} type="password" placeholder="Contraseña" value={password}
            onChange={e => setPassword(e.target.value)} required />
          {error && <p style={s.errorText}>{error}</p>}
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── PedidoRow ─────────────────────────────────────────────────────────────

type ActionState = 'idle' | 'loading' | 'done' | 'error';

function PedidoRow({
  pedido,
  onConfirm,
  onCancel,
}: {
  pedido: PedidoDoc;
  onConfirm: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
}) {
  const [state, setState] = useState<ActionState>('idle');
  const [errMsg, setErrMsg] = useState('');

  async function handleConfirm() {
    if (!confirm(`Confirmar pago del pedido ${pedido.orderId}?`)) return;
    setState('loading');
    try {
      await onConfirm(pedido.id);
      setState('done');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Error');
      setState('error');
    }
  }

  async function handleCancel() {
    if (!confirm(`¿Cancelar pedido ${pedido.orderId}? Se liberará el stock reservado.`)) return;
    setState('loading');
    try {
      await onCancel(pedido.id);
      setState('done');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Error');
      setState('error');
    }
  }

  const skus = pedido.items.map(i => i.sku).join(', ');
  const totalBags = pedido.items.reduce((a, i) => a + i.qty, 0);

  return (
    <tr style={s.row}>
      {/* ORDEN */}
      <td style={s.td}>
        <div style={s.orderId}>{pedido.orderId}</div>
        <div style={s.subText}>{formatDate(pedido.createdAt)}</div>
      </td>

      {/* CLIENTE */}
      <td style={s.td}>
        <div style={s.clientName}>{pedido.shipping.nombre}</div>
        <div style={s.subText}>
          <span style={{ marginRight: 4 }}>📍</span>
          {pedido.shipping.distrito}
        </div>
      </td>

      {/* EMAIL */}
      <td style={s.td}>
        <div style={s.bodyText}>{pedido.shipping.email}</div>
      </td>

      {/* PRODUCTOS */}
      <td style={s.td}>
        <div style={s.bodyText}>{totalBags} bolsa(s)</div>
        <div style={s.subText} title={skus}>{skus}</div>
      </td>

      {/* MÉTODO / OP */}
      <td style={s.td}>
        <div style={s.bodyText}>{adapterLabel[pedido.adapter] ?? pedido.adapter}</div>
        {pedido.paymentRef && <div style={s.subText}>op. {pedido.paymentRef}</div>}
      </td>

      {/* TOTAL */}
      <td style={{ ...s.td, textAlign: 'right' }}>
        <span style={s.total}>{Money.formatPEN(pedido.totals.totalCents)}</span>
      </td>

      {/* ESTADO */}
      <td style={s.td}>
        <span style={{
          ...s.statusBadge,
          borderColor: statusColor(pedido.status),
          color: statusColor(pedido.status),
        }}>
          <span style={{ color: statusColor(pedido.status), marginRight: 4 }}>•</span>
          {statusLabel(pedido.status)}
        </span>
      </td>

      {/* ACCIONES */}
      <td style={{ ...s.td, minWidth: 180 }}>
        {pedido.status === 'pendiente_pago' && state === 'idle' && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button style={s.confirmBtn} onClick={handleConfirm}>
              <span style={{ marginRight: 4 }}>✓</span> Confirmar pago
            </button>
            <button style={s.cancelBtn} onClick={handleCancel}>
              Cancelar
            </button>
          </div>
        )}
        {pedido.status === 'pendiente_pago' && state === 'loading' && (
          <span style={{ color: '#8a9a93', fontSize: 12 }}>Procesando…</span>
        )}
        {pedido.status === 'pendiente_pago' && state === 'done' && (
          <span style={{ color: '#8faf8a', fontSize: 12, fontWeight: 700 }}>✓ Completado</span>
        )}
        {pedido.status === 'pendiente_pago' && state === 'error' && (
          <span style={{ color: '#c96e4b', fontSize: 11 }}>{errMsg}</span>
        )}
      </td>
    </tr>
  );
}

// ── PedidosList ───────────────────────────────────────────────────────────

function PedidosList() {
  const [pedidos, setPedidos] = useState<PedidoDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('todas');
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('todos');
  const [useMock, setUseMock] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'pedidos'),
      orderBy('createdAt', 'desc'),
    );

    const unsub = onSnapshot(
      q,
      (snap: QuerySnapshot<DocumentData>) => {
        setPedidos(snap.docs.map(d => d.data() as PedidoDoc));
        setLoading(false);
        setUseMock(false);
      },
      (err: Error) => {
        console.warn('Firestore snapshot failed, falling back to mock data:', err.message);
        setPedidos(MOCK_PEDIDOS);
        setLoading(false);
        setUseMock(true);
      },
    );

    return unsub;
  }, []);

  const methods = useMemo(() => {
    const set = new Set(pedidos.map(p => p.adapter));
    return Array.from(set);
  }, [pedidos]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const tab of TABS) {
      c[tab.key] = pedidos.filter(p => tab.match(p.status)).length;
    }
    return c;
  }, [pedidos]);

  const filtered = useMemo(() => {
    let list = pedidos;
    if (activeTab !== 'todas') {
      const tab = TABS.find(t => t.key === activeTab);
      if (tab) list = list.filter(p => tab.match(p.status));
    }
    if (methodFilter !== 'todos') {
      list = list.filter(p => p.adapter === methodFilter);
    }
    return list;
  }, [pedidos, activeTab, methodFilter]);

  return (
    <div style={s.tableWrap}>
      {/* Header */}
      <div style={s.headerRow}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={s.sectionTitle}>Órdenes B2C</h2>
          <span style={s.totalBadge}>{pedidos.length} totales</span>
          {useMock && <span style={{ color: '#cda45e', fontSize: 11, fontFamily: "'Montserrat',Arial,sans-serif" }}>(datos de ejemplo)</span>}
        </div>
      </div>

      {/* Tabs + method filter */}
      <div style={s.tabBar}>
        <div style={s.tabs}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                ...s.tabBtn,
                ...(activeTab === tab.key ? s.tabBtnActive : {}),
              }}
            >
              {tab.label}
              {counts[tab.key] > 0 && (
                <span style={s.tabCount}>{counts[tab.key]}</span>
              )}
            </button>
          ))}
        </div>

        <select
          value={methodFilter}
          onChange={e => setMethodFilter(e.target.value)}
          style={s.methodSelect}
        >
          <option value="todos">Todos los métodos</option>
          {methods.map(m => (
            <option key={m} value={m}>{adapterLabel[m] ?? m}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <p style={{ color: '#8a9a93', padding: '40px 0', textAlign: 'center', fontFamily: "'Montserrat',Arial,sans-serif", fontSize: 13 }}>
          Cargando pedidos…
        </p>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <p style={{ color: '#8a9a93', padding: '40px 0', textAlign: 'center', fontFamily: "'Montserrat',Arial,sans-serif", fontSize: 13 }}>
          No hay órdenes{activeTab !== 'todas' ? ` con estado "${TABS.find(t => t.key === activeTab)?.label}"` : ''}
        </p>
      )}

      {/* Table */}
      {!loading && filtered.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={s.table}>
            <thead>
              <tr>
                {['Orden', 'Cliente', 'Email', 'Productos', 'Método / Op.', 'Total', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <PedidoRow key={p.id} pedido={p} onConfirm={confirmPayment} onCancel={cancelOrder} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Root component ──────────────────────────────────────────────────────────

export function AdminPedidos() {
  const [user, setUser] = useState<User | null | 'loading'>('loading');

  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u));
  }, []);

  if (user === 'loading') return null;
  if (!user) return <LoginForm />;

  return (
    <div style={s.page}>
      <header style={s.header}>
        <h1 style={s.headerLogo}>TUNAY WASI</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#8a9a93', fontSize: 12, fontFamily: "'Montserrat',Arial,sans-serif" }}>{user.email}</span>
          <button style={s.logoutBtn} onClick={() => signOut(auth)}>Salir</button>
        </div>
      </header>
      <main style={s.main}>
        <PedidosList />
      </main>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const s = {
  // ── Auth ──
  loginWrap: {
    minHeight: '100vh',
    background: '#131d1a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  } as React.CSSProperties,
  loginCard: {
    background: '#1a2622',
    borderRadius: 16,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 360,
    border: '1px solid #2a3a35',
  } as React.CSSProperties,
  logo: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 24,
    fontWeight: 300,
    letterSpacing: 8,
    color: '#e8e2d9',
    margin: '0 0 4px',
    textAlign: 'center' as const,
    textTransform: 'uppercase' as const,
  } as React.CSSProperties,
  logoSub: {
    fontFamily: "'Montserrat', Arial, sans-serif",
    fontSize: 10,
    letterSpacing: 3,
    color: '#8a9a93',
    textAlign: 'center' as const,
    textTransform: 'uppercase' as const,
    margin: '0 0 28px',
  } as React.CSSProperties,
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  } as React.CSSProperties,
  input: {
    background: '#131d1a',
    border: '1px solid #2a3a35',
    borderRadius: 8,
    padding: '10px 14px',
    fontFamily: "'Montserrat', Arial, sans-serif",
    fontSize: 13,
    color: '#e8e2d9',
    outline: 'none',
  } as React.CSSProperties,
  btn: {
    background: '#cda45e',
    color: '#131d1a',
    border: 'none',
    borderRadius: 999,
    padding: '12px 24px',
    fontFamily: "'Montserrat', Arial, sans-serif",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    marginTop: 4,
  } as React.CSSProperties,
  errorText: {
    color: '#c96e4b',
    fontSize: 12,
    fontFamily: "'Montserrat', Arial, sans-serif",
    margin: 0,
    textAlign: 'center' as const,
  } as React.CSSProperties,

  // ── Layout ──
  page: {
    minHeight: '100vh',
    background: '#131d1a',
    color: '#e8e2d9',
  } as React.CSSProperties,
  header: {
    background: '#1a2622',
    borderBottom: '1px solid #2a3a35',
    padding: '16px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as React.CSSProperties,
  headerLogo: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 20,
    fontWeight: 300,
    letterSpacing: 6,
    color: '#cda45e',
    margin: 0,
    textTransform: 'uppercase' as const,
  } as React.CSSProperties,
  logoutBtn: {
    background: 'transparent',
    color: '#8a9a93',
    border: '1px solid #2a3a35',
    borderRadius: 999,
    padding: '5px 14px',
    fontFamily: "'Montserrat', Arial, sans-serif",
    fontSize: 10,
    letterSpacing: 1,
    cursor: 'pointer',
  } as React.CSSProperties,
  main: {
    padding: '24px 32px',
    maxWidth: 1400,
    margin: '0 auto',
  } as React.CSSProperties,

  // ── Table card ──
  tableWrap: {
    background: '#1a2622',
    borderRadius: 12,
    border: '1px solid #2a3a35',
    padding: 24,
  } as React.CSSProperties,

  // ── Header row ──
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  } as React.CSSProperties,
  sectionTitle: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 22,
    fontWeight: 600,
    color: '#e8e2d9',
    margin: 0,
  } as React.CSSProperties,
  totalBadge: {
    background: '#2a3a35',
    color: '#8a9a93',
    fontFamily: "'Montserrat', Arial, sans-serif",
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 999,
    padding: '3px 10px',
  } as React.CSSProperties,

  // ── Tabs ──
  tabBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 16,
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  tabs: {
    display: 'flex',
    gap: 2,
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  tabBtn: {
    background: 'transparent',
    color: '#8a9a93',
    border: '1px solid transparent',
    borderRadius: 8,
    padding: '6px 12px',
    fontFamily: "'Montserrat', Arial, sans-serif",
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    transition: 'all .15s ease',
  } as React.CSSProperties,
  tabBtnActive: {
    background: '#2a3a35',
    color: '#e8e2d9',
    borderColor: '#cda45e40',
  } as React.CSSProperties,
  tabCount: {
    background: '#131d1a',
    color: '#8a9a93',
    borderRadius: 999,
    padding: '0 7px',
    fontSize: 10,
    fontWeight: 600,
    lineHeight: '18px',
  } as React.CSSProperties,
  methodSelect: {
    background: '#131d1a',
    color: '#e8e2d9',
    border: '1px solid #2a3a35',
    borderRadius: 8,
    padding: '6px 12px',
    fontFamily: "'Montserrat', Arial, sans-serif",
    fontSize: 12,
    cursor: 'pointer',
    outline: 'none',
    minWidth: 160,
  } as React.CSSProperties,

  // ── Table ──
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  } as React.CSSProperties,
  th: {
    fontFamily: "'Montserrat', Arial, sans-serif",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    color: '#8a9a93',
    padding: '0 12px 12px',
    borderBottom: '1px solid #2a3a35',
    textAlign: 'left' as const,
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  row: {
    borderBottom: '1px solid #2a3a3520',
    transition: 'background .15s ease',
  } as React.CSSProperties,
  td: {
    padding: '14px 12px',
    verticalAlign: 'top',
    fontFamily: "'Montserrat', Arial, sans-serif",
    fontSize: 12,
    color: '#e8e2d9',
  } as React.CSSProperties,

  // ── Cell content ──
  orderId: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 16,
    fontWeight: 600,
    color: '#cda45e',
    letterSpacing: 0.5,
    marginBottom: 2,
  } as React.CSSProperties,
  clientName: {
    fontWeight: 600,
    color: '#e8e2d9',
    fontSize: 13,
    marginBottom: 2,
  } as React.CSSProperties,
  bodyText: {
    color: '#e8e2d9',
    fontSize: 12,
    fontWeight: 500,
    marginBottom: 2,
  } as React.CSSProperties,
  subText: {
    color: '#8a9a93',
    fontSize: 11,
    marginTop: 2,
    maxWidth: 180,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  total: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 20,
    fontWeight: 700,
    color: '#e8e2d9',
  } as React.CSSProperties,
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    background: '#131d1a',
    border: '1px solid',
    borderRadius: 999,
    padding: '4px 12px',
    fontFamily: "'Montserrat', Arial, sans-serif",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  confirmBtn: {
    background: 'transparent',
    color: '#8faf8a',
    border: '1px solid #8faf8a60',
    borderRadius: 999,
    padding: '6px 14px',
    fontFamily: "'Montserrat', Arial, sans-serif",
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    display: 'flex',
    alignItems: 'center',
    transition: 'all .15s ease',
  } as React.CSSProperties,
  cancelBtn: {
    background: 'transparent',
    color: '#c96e4b',
    border: '1px solid #c96e4b60',
    borderRadius: 999,
    padding: '6px 14px',
    fontFamily: "'Montserrat', Arial, sans-serif",
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'all .15s ease',
  } as React.CSSProperties,
} as const;
