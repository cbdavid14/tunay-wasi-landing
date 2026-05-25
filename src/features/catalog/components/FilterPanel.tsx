import { useState, type Dispatch, type SetStateAction } from 'react';

const SCA_OPTIONS = ['Todos', '82+', '84+', '86+', '88+'];

const BREW_GROUPS = [
  { group: 'Pour-over', icon: '◓', items: ['V60', 'Chemex', 'Clever', 'Sifón', 'Filtro'] },
  { group: 'Inmersión', icon: '◐', items: ['French Press', 'AeroPress', 'Turca'] },
  { group: 'Presión / frío', icon: '◑', items: ['Espresso', 'Moka', 'Cold Brew'] },
];
const EXPERIENCE = ['Todos', 'Soy nuevo', 'Quiero explorar', 'Experto'];
const ROAST = ['Todos', 'Espresso / clásico', 'Versátil', 'Filtrado / floral'];
const INTENSITY = ['Todos', 'Suave y familiar', 'Equilibrado', 'Explosión de sabor'];

export type FilterState = Record<string, string[]>;

interface Props {
  selected: FilterState;
  setSelected: Dispatch<SetStateAction<FilterState>>;
}

function FilterChip({ active, onClick, children, small }: { active: boolean; onClick: () => void; children: React.ReactNode; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: 'Montserrat, sans-serif',
        fontSize: small ? 12 : 13,
        fontWeight: 500,
        padding: small ? '6px 14px' : '10px 18px',
        borderRadius: 999,
        cursor: 'pointer',
        background: active ? '#1f3028' : '#f2e0cc',
        color: active ? '#f2e0cc' : '#1f3028',
        border: `1px solid ${active ? '#1f3028' : '#1f302833'}`,
        transition: 'all .25s ease',
        letterSpacing: '0.02em',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.borderColor = '#c96e4b'; (e.currentTarget as HTMLElement).style.color = '#c96e4b'; } }}
      onMouseLeave={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.borderColor = '#1f302833'; (e.currentTarget as HTMLElement).style.color = '#1f3028'; } }}
    >
      {children}
    </button>
  );
}

export default function FilterPanel({ selected, setSelected }: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const toggle = (cat: string, val: string) => {
    setSelected((s) => {
      const cur = new Set(s[cat] ?? []);
      if (val === 'Todos') return { ...s, [cat]: ['Todos'] };
      cur.delete('Todos');
      cur.has(val) ? cur.delete(val) : cur.add(val);
      return { ...s, [cat]: cur.size ? [...cur] : ['Todos'] };
    });
  };
  const isActive = (cat: string, val: string) => (selected[cat] ?? []).includes(val);

  const hasAdvancedFilters = ['brew', 'experiencia', 'tueste', 'intensidad'].some(
    cat => !(selected[cat] ?? ['Todos']).includes('Todos'),
  );

  return (
    <div style={{ marginBottom: 40 }}>

      {/* ── Barra compacta siempre visible (SCA + toggle avanzado) ── */}
      <div style={{
        background: '#e8d2b6',
        border: '1px solid #1f302822',
        borderRadius: advancedOpen ? '22px 22px 0 0' : 22,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        boxShadow: '0 8px 24px -16px #533b22aa',
        transition: 'border-radius .3s ease',
      }}>
        {/* SCA chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 }}>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.22em',
            color: '#533b22', textTransform: 'uppercase', flexShrink: 0,
          }}>SCA</span>
          {SCA_OPTIONS.map(o => (
            <FilterChip key={o} small active={isActive('sca', o)} onClick={() => toggle('sca', o)}>{o}</FilterChip>
          ))}
        </div>

        {/* Toggle filtros avanzados */}
        <button
          onClick={() => setAdvancedOpen(o => !o)}
          style={{
            fontFamily: 'Montserrat, sans-serif', fontSize: 11, fontWeight: 600,
            padding: '7px 14px', borderRadius: 999, cursor: 'pointer',
            background: advancedOpen || hasAdvancedFilters ? '#1f3028' : 'transparent',
            color: advancedOpen || hasAdvancedFilters ? '#f2e0cc' : '#533b22',
            border: `1px solid ${advancedOpen || hasAdvancedFilters ? '#1f3028' : '#533b2244'}`,
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all .25s ease', flexShrink: 0,
            letterSpacing: '0.04em',
          }}
        >
          <span>Más filtros</span>
          {hasAdvancedFilters && (
            <span style={{
              width: 16, height: 16, borderRadius: '50%', background: '#c96e4b',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontFamily: 'Bowlby One SC, sans-serif', color: '#f2e0cc',
            }}>
              {['brew', 'experiencia', 'tueste', 'intensidad'].filter(
                cat => !(selected[cat] ?? ['Todos']).includes('Todos')
              ).length}
            </span>
          )}
          <span style={{
            fontSize: 10, display: 'inline-block',
            transform: advancedOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform .25s ease',
          }}>▾</span>
        </button>
      </div>

      {/* ── Panel avanzado colapsable ── */}
      <div style={{
        maxHeight: advancedOpen ? 1400 : 0,
        overflow: 'hidden',
        transition: 'max-height .45s cubic-bezier(.2,.7,.2,1)',
        background: '#e8d2b6',
        border: advancedOpen ? '1px solid #1f302822' : 'none',
        borderTop: 'none',
        borderRadius: '0 0 22px 22px',
        boxShadow: advancedOpen ? '0 14px 36px -22px #533b22aa' : 'none',
      }}>
        <div style={{ padding: '20px 24px 28px' }}>

          {/* Método */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: 'Bowlby One SC, sans-serif', fontSize: 10, letterSpacing: '0.22em', color: '#c96e4b', textTransform: 'uppercase', marginBottom: 12 }}>
              Método de preparación
            </div>
            <div className="tw-filter-brew-grid">
              {BREW_GROUPS.map((g) => (
                <div key={g.group}>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, fontWeight: 500, color: '#533b22', marginBottom: 8, letterSpacing: '0.06em' }}>
                    <span style={{ marginRight: 6, color: '#c96e4b' }}>{g.icon}</span>{g.group}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {g.items.map((it) => (
                      <FilterChip key={it} small active={isActive('brew', it)} onClick={() => toggle('brew', it)}>{it}</FilterChip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Experiencia + Tueste + Intensidad en grid */}
          <div className="tw-filter-meta-grid">
            {([['experiencia', 'Tu experiencia', EXPERIENCE], ['tueste', 'Tipo de tueste', ROAST], ['intensidad', 'Intensidad', INTENSITY]] as [string, string, string[]][]).map(([key, label, opts]) => (
              <div key={key}>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, fontWeight: 600, color: '#1f3028', marginBottom: 8, letterSpacing: '0.04em' }}>{label}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {opts.map((o) => <FilterChip key={o} small active={isActive(key, o)} onClick={() => toggle(key, o)}>{o}</FilterChip>)}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      <style>{`
        .tw-filter-brew-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .tw-filter-meta-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #1f302818;
        }
        @media (max-width: 760px) {
          .tw-filter-brew-grid { grid-template-columns: 1fr 1fr !important; }
          .tw-filter-meta-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .tw-filter-brew-grid { grid-template-columns: 1fr !important; }
          .tw-filter-meta-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
