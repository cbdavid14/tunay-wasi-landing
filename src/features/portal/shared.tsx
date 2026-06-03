import { TW, estadoMap } from './constants';
import type { OrderEstado } from './mockData';

export function EstadoBadge({ estado, size = 'md' }: { estado: OrderEstado; size?: 'sm' | 'md' }) {
  const s = estadoMap[estado] || estadoMap.preparando;
  const pad = size === 'sm' ? '3px 9px' : '5px 12px';
  const fs = size === 'sm' ? 11 : 12;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: pad, borderRadius: 999, background: s.bg, color: s.fg,
      fontSize: fs, fontWeight: 600, letterSpacing: '0.01em',
      fontFamily: 'Montserrat, sans-serif',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />
      {s.label}
    </span>
  );
}

export function Eyebrow({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{
      fontFamily: '"Bowlby One SC", sans-serif', fontSize: 11, letterSpacing: '0.3em',
      textTransform: 'uppercase', color: color || TW.gold,
    }}>{children}</div>
  );
}

export function PageHead({ eyebrow, title, accent, sub, maxSub = 540 }: {
  eyebrow: string; title: string; accent?: string; sub?: string; maxSub?: number;
}) {
  return (
    <div style={{ marginBottom: 4 }}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 style={{
        fontFamily: 'Cormorant Garamond, serif', fontWeight: 600,
        fontSize: 'clamp(28px,4vw,42px)', lineHeight: 1.05, letterSpacing: '-0.01em',
        color: TW.ink, margin: '12px 0 0',
      }}>
        {title} {accent && <span style={{ fontStyle: 'italic', color: TW.green }}>{accent}</span>}
      </h1>
      {sub && (
        <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, color: TW.sub, lineHeight: 1.6, marginTop: 10, maxWidth: maxSub }}>
          {sub}
        </p>
      )}
    </div>
  );
}

export function SectionTitle({ children, size = 26 }: { children: React.ReactNode; size?: number }) {
  return (
    <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: size, fontWeight: 600, color: TW.ink, margin: 0 }}>
      {children}
    </h2>
  );
}

export function MonoCap({ children, color, mb = 0 }: { children: React.ReactNode; color?: string; mb?: number }) {
  return (
    <div style={{
      fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.16em',
      textTransform: 'uppercase', color: color || TW.sub, marginBottom: mb,
    }}>{children}</div>
  );
}

export function FieldWrap({ label, err, children }: { label: string; err?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: err ? '#c2410c' : TW.sub, display: 'block', marginBottom: 8 }}>{label}</label>
      {children}
      {err && <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11.5, color: '#c2410c', marginTop: 6 }}>{err}</div>}
    </div>
  );
}

export function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
      <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13.5, color: TW.sub }}>{k}</span>
      <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 600, color: TW.ink }}>{v}</span>
    </div>
  );
}
