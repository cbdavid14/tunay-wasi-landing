import { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { auth, db } from '@/shared/firebase';
import { confirmPayment } from '@/features/checkout/orderService';
import type { PedidoDoc } from '@/shared/types/firestore';
import { Money } from '@/shared/money';

// ── Auth gate ─────────────────────────────────────────────────────────────────

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
    <div style={styles.loginWrap}>
      <div style={styles.loginCard}>
        <h1 style={styles.logo}>TUNAY WASI</h1>
        <p style={styles.logoSub}>Panel admin · Pedidos</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <p style={styles.errorText}>{error}</p>}
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Pedidos list ──────────────────────────────────────────────────────────────

type ConfirmState = 'idle' | 'loading' | 'done' | 'error';

function PedidoRow({ pedido }: { pedido: PedidoDoc }) {
  const [state, setState] = useState<ConfirmState>('idle');
  const [errMsg, setErrMsg] = useState('');

  async function handleConfirm() {
    if (!confirm(`Confirmar pago del pedido ${pedido.orderId}?`)) return;
    setState('loading');
    try {
      await confirmPayment(pedido.id);
      setState('done');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Error');
      setState('error');
    }
  }

  const createdDate = new Date(pedido.createdAt).toLocaleString('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const adapterLabel: Record<string, string> = {
    yape: 'Yape',
    plin: 'Plin',
    transferencia: 'Transf.',
    niubiz: 'Niubiz',
    stripe: 'Stripe',
  };

  return (
    <tr style={styles.row}>
      <td style={styles.td}>
        <span style={styles.orderId}>{pedido.orderId}</span>
      </td>
      <td style={styles.td}>
        <div style={styles.nombre}>{pedido.shipping.nombre}</div>
        {pedido.shipping.email && (
          <div style={styles.subText}>{pedido.shipping.email}</div>
        )}
        <div style={styles.subText}>{pedido.shipping.telefono}</div>
      </td>
      <td style={styles.td}>
        {pedido.items.map((item, i) => (
          <div key={i} style={styles.subText}>
            {item.name} · {item.weight} × {item.qty}
          </div>
        ))}
      </td>
      <td style={{ ...styles.td, textAlign: 'center' }}>
        <span style={styles.adapter}>{adapterLabel[pedido.adapter] ?? pedido.adapter}</span>
      </td>
      <td style={{ ...styles.td, textAlign: 'right' }}>
        <span style={styles.total}>{Money.formatPEN(pedido.totals.totalCents)}</span>
      </td>
      <td style={{ ...styles.td, textAlign: 'center', color: '#c4b297', fontSize: 11 }}>
        {createdDate}
      </td>
      <td style={{ ...styles.td, textAlign: 'center' }}>
        {state === 'idle' && (
          <button style={styles.confirmBtn} onClick={handleConfirm}>
            Confirmar pago
          </button>
        )}
        {state === 'loading' && <span style={{ color: '#c4b297', fontSize: 12 }}>Enviando…</span>}
        {state === 'done' && <span style={{ color: '#8faf8a', fontSize: 13 }}>✓ Confirmado</span>}
        {state === 'error' && (
          <span style={{ color: '#c96e4b', fontSize: 11 }}>{errMsg}</span>
        )}
      </td>
    </tr>
  );
}

function PedidosList() {
  const [pedidos, setPedidos] = useState<PedidoDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'pedidos'),
      where('status', '==', 'pendiente_pago'),
      orderBy('createdAt', 'desc'),
    );

    const unsub = onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
      setPedidos(snap.docs.map(d => d.data() as PedidoDoc));
      setLoading(false);
    });

    return unsub;
  }, []);

  return (
    <div style={styles.tableWrap}>
      <div style={styles.tableHeader}>
        <h2 style={styles.sectionTitle}>Pedidos pendientes de pago</h2>
        <span style={styles.badge}>{pedidos.length}</span>
      </div>

      {loading && <p style={{ color: '#c4b297', padding: '24px 0' }}>Cargando pedidos…</p>}

      {!loading && pedidos.length === 0 && (
        <p style={{ color: '#8faf8a', padding: '32px 0', textAlign: 'center' }}>
          Sin pedidos pendientes de pago
        </p>
      )}

      {!loading && pedidos.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Pedido', 'Cliente', 'Productos', 'Método', 'Total', 'Fecha', 'Acción'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pedidos.map(p => <PedidoRow key={p.id} pedido={p} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export function AdminPedidos() {
  const [user, setUser] = useState<User | null | 'loading'>('loading');

  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u));
  }, []);

  if (user === 'loading') return null;
  if (!user) return <LoginForm />;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.logo}>TUNAY WASI</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#c4b297', fontSize: 12 }}>{user.email}</span>
          <button style={styles.logoutBtn} onClick={() => signOut(auth)}>
            Salir
          </button>
        </div>
      </header>
      <main style={styles.main}>
        <PedidosList />
      </main>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  loginWrap: {
    minHeight: '100vh',
    background: '#1f3028',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  } as React.CSSProperties,
  loginCard: {
    background: '#f2e0cc',
    borderRadius: 16,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 360,
  } as React.CSSProperties,
  logo: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 24,
    fontWeight: 300,
    letterSpacing: 8,
    color: '#1f3028',
    margin: '0 0 4px',
    textAlign: 'center' as const,
    textTransform: 'uppercase' as const,
  } as React.CSSProperties,
  logoSub: {
    fontFamily: "'Montserrat', Arial, sans-serif",
    fontSize: 10,
    letterSpacing: 3,
    color: '#c4b297',
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
    background: '#fff',
    border: '1px solid #c4b29744',
    borderRadius: 8,
    padding: '10px 14px',
    fontFamily: "'Montserrat', Arial, sans-serif",
    fontSize: 13,
    color: '#1f3028',
    outline: 'none',
  } as React.CSSProperties,
  btn: {
    background: '#c96e4b',
    color: '#f2e0cc',
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
  page: {
    minHeight: '100vh',
    background: '#1f3028',
    color: '#f2e0cc',
  } as React.CSSProperties,
  header: {
    background: '#1a2822',
    borderBottom: '1px solid #ffffff0f',
    padding: '16px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as React.CSSProperties,
  main: {
    padding: '32px',
    maxWidth: 1200,
    margin: '0 auto',
  } as React.CSSProperties,
  tableWrap: {
    background: '#f2e0cc',
    borderRadius: 16,
    padding: 28,
  } as React.CSSProperties,
  tableHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  } as React.CSSProperties,
  sectionTitle: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 22,
    fontWeight: 600,
    color: '#1f3028',
    margin: 0,
  } as React.CSSProperties,
  badge: {
    background: '#c96e4b',
    color: '#f2e0cc',
    fontFamily: "'Montserrat', Arial, sans-serif",
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 999,
    padding: '2px 10px',
    minWidth: 20,
    textAlign: 'center' as const,
  } as React.CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  } as React.CSSProperties,
  th: {
    fontFamily: "'Montserrat', Arial, sans-serif",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    color: '#c4b297',
    padding: '0 12px 10px',
    borderBottom: '1px solid #1f302820',
    textAlign: 'left' as const,
  } as React.CSSProperties,
  row: {
    borderBottom: '1px solid #1f302210',
  } as React.CSSProperties,
  td: {
    padding: '14px 12px',
    verticalAlign: 'top',
    fontFamily: "'Montserrat', Arial, sans-serif",
    fontSize: 12,
    color: '#533b22',
  } as React.CSSProperties,
  orderId: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 16,
    fontWeight: 600,
    color: '#c96e4b',
    letterSpacing: 1,
  } as React.CSSProperties,
  nombre: {
    fontWeight: 600,
    color: '#1f3028',
    fontSize: 13,
  } as React.CSSProperties,
  subText: {
    color: '#c4b297',
    fontSize: 11,
    marginTop: 2,
  } as React.CSSProperties,
  adapter: {
    background: '#1f302814',
    borderRadius: 999,
    padding: '3px 10px',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    color: '#533b22',
  } as React.CSSProperties,
  total: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 18,
    fontWeight: 600,
    color: '#1f3028',
  } as React.CSSProperties,
  confirmBtn: {
    background: '#8faf8a',
    color: '#1f3028',
    border: 'none',
    borderRadius: 999,
    padding: '7px 16px',
    fontFamily: "'Montserrat', Arial, sans-serif",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  logoutBtn: {
    background: 'transparent',
    color: '#c4b297',
    border: '1px solid #c4b29740',
    borderRadius: 999,
    padding: '5px 14px',
    fontFamily: "'Montserrat', Arial, sans-serif",
    fontSize: 10,
    letterSpacing: 1,
    cursor: 'pointer',
  } as React.CSSProperties,
} as const;
