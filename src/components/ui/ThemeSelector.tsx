import { useState, useEffect } from 'react';
import { type Theme, setTheme, getStoredTheme } from '@/shared/useTheme';

const THEMES: { id: Theme; label: string; bg: string; dot: string }[] = [
  { id: 'cream', label: 'Crema',  bg: '#f2e0cc', dot: '#c96e4b' },
  { id: 'dark',  label: 'Negro',  bg: '#0d0b09', dot: '#8faf8a' },
  { id: 'white', label: 'Blanco', bg: '#f5f5f5', dot: '#1f3028' },
];

interface ThemeSelectorProps {
  /** 'dots' (3 circles, compact — for nav/profile) | 'cards' (full — for settings page) */
  variant?: 'dots' | 'cards';
}

export default function ThemeSelector({ variant = 'dots' }: ThemeSelectorProps) {
  const [current, setCurrent] = useState<Theme>(getStoredTheme());

  useEffect(() => {
    // Keep in sync if changed elsewhere
    const onAttr = new MutationObserver(() => {
      const t = document.documentElement.getAttribute('data-theme') as Theme | null;
      if (t) setCurrent(t);
    });
    onAttr.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => onAttr.disconnect();
  }, []);

  const handleSelect = (theme: Theme) => {
    setCurrent(theme);
    setTheme(theme);
  };

  if (variant === 'dots') {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => handleSelect(t.id)}
            title={t.label}
            aria-label={`Tema ${t.label}`}
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: t.bg,
              border: current === t.id
                ? `2px solid var(--tw-terra)`
                : `2px solid var(--tw-border-dark)`,
              cursor: 'pointer',
              padding: 0,
              transition: 'transform 0.2s ease, border-color 0.2s ease',
              transform: current === t.id ? 'scale(1.2)' : 'scale(1)',
              boxShadow: current === t.id ? '0 0 0 3px rgba(201,110,75,0.25)' : 'none',
            }}
          />
        ))}
      </div>
    );
  }

  // 'cards' variant — for settings/profile page
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {THEMES.map((t) => (
        <button
          key={t.id}
          onClick={() => handleSelect(t.id)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            padding: '16px 20px',
            borderRadius: 'var(--tw-radius-md)',
            background: t.bg,
            border: current === t.id
              ? '2px solid var(--tw-terra)'
              : '2px solid var(--tw-border)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            minWidth: 80,
            boxShadow: current === t.id ? 'var(--tw-shadow-sm)' : 'none',
          }}
        >
          <div style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: t.dot,
          }} />
          <span style={{
            fontFamily: 'var(--tw-font-body)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            color: t.id === 'dark' ? '#f2e0cc' : '#1f3028',
            textTransform: 'uppercase',
          }}>
            {t.label}
          </span>
          {current === t.id && (
            <span style={{ fontSize: 10, color: '#c96e4b' }}>✓</span>
          )}
        </button>
      ))}
    </div>
  );
}
