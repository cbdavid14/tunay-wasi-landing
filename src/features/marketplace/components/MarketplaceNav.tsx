/**
 * MarketplaceNav.tsx — Barra de navegación del marketplace
 */

const C = {
  green: '#1f3028',
  cream: '#f2e0cc',
  terra: '#c96e4b',
  sage: '#8faf8a',
  tan: '#c4b297',
};

type Vista = 'marketplace' | 'caficultor' | 'laboratorio' | 'admin';

interface Props {
  vista: Vista;
  onCambiarVista: (v: Vista) => void;
}

export default function MarketplaceNav({ vista, onCambiarVista }: Props) {
  return (
    <nav style={{
      background: C.green,
      borderBottom: `1px solid rgba(143,175,138,0.2)`,
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 64,
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontFamily: 'Mulish, sans-serif', color: C.cream, fontWeight: 900, fontSize: 18, letterSpacing: 2 }}>
          TUNAY WASI
        </span>
        <span style={{
          background: C.terra,
          color: 'white',
          fontSize: 9,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: 20,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}>
          Marketplace
        </span>
      </div>

      {/* Tabs — quién soy */}
      <div style={{ display: 'flex', gap: 4 }}>
        {([
          { key: 'marketplace',  label: 'Soy tostadora / cafetería' },
          { key: 'caficultor',   label: 'Soy caficultor' },
          { key: 'laboratorio',  label: 'Soy laboratorio' },
          { key: 'admin',        label: 'Admin' },
        ] as { key: Vista; label: string }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => onCambiarVista(tab.key)}
            style={{
              background: vista === tab.key ? C.terra : 'transparent',
              color: vista === tab.key ? 'white' : C.tan,
              border: `1px solid ${vista === tab.key ? C.terra : 'rgba(196,178,151,0.3)'}`,
              borderRadius: 6,
              padding: '6px 14px',
              fontSize: 12,
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
