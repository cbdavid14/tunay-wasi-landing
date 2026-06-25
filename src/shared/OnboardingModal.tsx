import type { RolUsuario } from '@/shared/types/auth';

const C = {
  green: '#1f3028', cream: '#f2e0cc', terra: '#c96e4b',
  sage: '#8faf8a', tan: '#c4b297', brown: '#533b22',
};

interface CardItem {
  icono: string;
  titulo: string;
  descripcion: string;
}

const CARDS: Record<string, CardItem[]> = {
  caficultor: [
    { icono: '📦', titulo: 'Mis lotes', descripcion: 'Registra y publica tus cosechas de café verde con fotos y datos del proceso.' },
    { icono: '📬', titulo: 'Mis muestras', descripcion: 'Envía muestras a un laboratorio para certificar tu microlote con puntaje SCA, o al hub Tunay Wasi en Lima para entregas directas a cafeterías.' },
    { icono: '💰', titulo: 'Mis pagos', descripcion: 'Sigue el estado de tus pedidos y cuándo recibes el pago por tus sacos.' },
    { icono: '👤', titulo: 'Mi perfil', descripcion: 'Mantén actualizados los datos de tu finca — los compradores los ven antes de solicitar una muestra.' },
  ],
  laboratorio: [
    { icono: '📋', titulo: 'Mis muestras', descripcion: 'Acepta lotes asignados y solicitudes de certificación de caficultores.' },
    { icono: '☕', titulo: 'Mis catas',    descripcion: 'Registra los resultados SCA (sub-tab Catación) y revisa el historial de cataciones completadas.' },
    { icono: '💰', titulo: 'Mis pagos',   descripcion: 'Fees pendientes y recibidos de Tunay Wasi por cataciones y certificaciones.' },
    { icono: '👤', titulo: 'Mi perfil',   descripcion: 'Los caficultores ven tu dirección y fee antes de elegirte — mantenlo siempre actualizado.' },
  ],
  cafeteria: [
    { icono: '🗂️', titulo: 'Catálogo', descripcion: 'Explora lotes publicados de todo el Perú — filtra por proceso, variedad o puntaje SCA.' },
    { icono: '📦', titulo: 'Muestras', descripcion: 'Solicita muestras de 200g y sigue su estado hasta que lleguen a tu local.' },
    { icono: '🛒', titulo: 'Pedidos', descripcion: 'Compra por sacos y sigue la logística hasta la entrega en tu puerta.' },
    { icono: '🔬', titulo: 'Mi laboratorio', descripcion: 'Si tienes tostadora propia, cata las muestras directamente desde la plataforma.' },
  ],
  admin: [
    { icono: '📊', titulo: 'Dashboard', descripcion: 'Ve de un vistazo los lotes activos, pedidos en curso y pagos pendientes.' },
    { icono: '💰', titulo: 'Pagos', descripcion: 'Verifica transferencias de cafeterías y distribuye pagos al caficultor y laboratorio.' },
    { icono: '🚚', titulo: 'Logística', descripcion: 'Kanban de pedidos activos: Origen → Tránsito → Hub Lima → Entregado.' },
    { icono: '📬', titulo: 'Muestras hub', descripcion: 'Solicita muestras a caficultores y confirma recepción en el hub Lima.' },
  ],
};

const INTRO: Record<string, string> = {
  caficultor: 'Esta es tu plataforma para conectar tu café directamente con cafeterías y tostadoras de todo el Perú.',
  laboratorio: 'Aquí recibirás lotes para catar, registrarás los resultados SCA y certificarás la calidad del café de los productores.',
  cafeteria: 'Descubre cafés de especialidad directamente de los productores peruanos y compra por sacos a precio de origen.',
  admin: 'Panel de control del marketplace Tunay Wasi — gestiona lotes, pedidos, pagos y la logística del hub Lima.',
};

const EMOJI: Record<string, string> = {
  caficultor: '🌱',
  laboratorio: '🔬',
  cafeteria: '☕',
  admin: '⚙️',
};

interface Props {
  rol: RolUsuario;
  nombre: string;
  onEmpezarTour: () => void;
  onSaltar: () => void;
}

export default function OnboardingModal({ rol, nombre, onEmpezarTour, onSaltar }: Props) {
  const cards = CARDS[rol] ?? [];
  const intro = INTRO[rol] ?? '';
  const emoji = EMOJI[rol] ?? '👋';
  const primerNombre = nombre?.split(' ')[0] ?? 'bienvenido';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9500,
      background: 'rgba(31,48,40,0.82)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: 'white', borderRadius: 20, padding: '36px 32px',
        maxWidth: 560, width: '100%',
        boxShadow: '0 16px 60px rgba(0,0,0,0.28)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>{emoji}</div>
          <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 30, color: C.brown, margin: '0 0 8px' }}>
            Bienvenido, {primerNombre}
          </h2>
          <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, lineHeight: 1.75, margin: 0, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
            {intro}
          </p>
        </div>

        {/* Divider */}
        <div style={{ borderTop: `1px solid ${C.cream}`, marginBottom: 20 }} />

        {/* Cards */}
        <p style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: C.tan, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 14px' }}>
          Esto es lo que puedes hacer:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
          {cards.map(card => (
            <div key={card.titulo} style={{
              background: '#faf7f3', borderRadius: 12, padding: '16px 14px',
              border: `1px solid ${C.cream}`,
            }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>{card.icono}</div>
              <p style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, color: C.brown, margin: '0 0 4px' }}>
                {card.titulo}
              </p>
              <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: 0, lineHeight: 1.55 }}>
                {card.descripcion}
              </p>
            </div>
          ))}
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
          <button
            onClick={onEmpezarTour}
            style={{
              width: '100%', background: C.terra, color: 'white', border: 'none',
              borderRadius: 10, padding: '14px', fontFamily: 'Montserrat',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Empezar tour guiado →
          </button>
          <button
            onClick={onSaltar}
            style={{
              width: '100%', background: 'transparent', color: C.tan,
              border: `1px solid ${C.tan}40`, borderRadius: 10, padding: '11px',
              fontFamily: 'Montserrat', fontSize: 12, cursor: 'pointer',
            }}
          >
            Saltar — ir directamente al portal
          </button>
        </div>
      </div>
    </div>
  );
}
