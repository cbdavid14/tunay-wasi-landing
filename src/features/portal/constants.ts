export const TW = {
  ink: '#1f3028',
  sub: '#7a6448',
  green: '#1f3028',
  gold: '#c96e4b',
  line: '#1f302820',
  bg: '#f2e0cc',
  card: '#faf2e2',
  tint: '#e7ecdd',
  sage: '#8faf8a',
  tan: '#c4b297',
};

export const soles = (n: number) => `S/ ${Number(n).toFixed(2)}`;

export const toneMap: Record<string, { fg: string; bg: string; ring: string }> = {
  gold:  { fg: '#a14e2c', bg: '#f3e0cf', ring: '#e0b89a' },
  green: { fg: '#1f3028', bg: '#e7ecdd', ring: '#bcd0b5' },
  cacao: { fg: '#6b4423', bg: '#efe3d2', ring: '#d8c2a6' },
};

export const estadoMap: Record<string, { label: string; fg: string; bg: string; dot: string }> = {
  entregado:    { label: 'Entregado',          fg: '#2f5a3a', bg: '#e3ebd8', dot: '#5b8159' },
  en_ruta:      { label: 'En Ruta',            fg: '#9a5a2e', bg: '#f4e3cf', dot: '#c96e4b' },
  preparando:   { label: 'Preparando',         fg: '#9a5a2e', bg: '#f4e3cf', dot: '#c96e4b' },
  por_verificar:{ label: 'Pago por Verificar', fg: '#9a3b1e', bg: '#f6e0d4', dot: '#b5482a' },
};

export const panel: Record<string, string> = {
  background: '#fdf8ef',
  border: `1px solid ${TW.line}`,
  borderRadius: '18px',
  boxShadow: '0 1px 2px #533b2212',
};

export const btnSolid: Record<string, string | number> = {
  fontFamily: 'Montserrat, sans-serif',
  fontSize: '13.5px',
  fontWeight: 700,
  color: '#fff',
  background: TW.green,
  border: 'none',
  borderRadius: '11px',
  padding: '12px 20px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
};

export const btnGhost: Record<string, string | number> = {
  fontFamily: 'Montserrat, sans-serif',
  fontSize: '13.5px',
  fontWeight: 600,
  color: TW.ink,
  background: '#fdf8ef',
  border: `1px solid ${TW.line}`,
  borderRadius: '11px',
  padding: '12px 18px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '7px',
};

export const btnSoft: Record<string, string | number> = {
  fontFamily: 'Montserrat, sans-serif',
  fontSize: '13px',
  fontWeight: 600,
  color: TW.green,
  background: '#e7ecdd',
  border: 'none',
  borderRadius: '11px',
  padding: '11px 16px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '7px',
};

export const btnDanger: Record<string, string | number> = {
  fontFamily: 'Montserrat, sans-serif',
  fontSize: '13px',
  fontWeight: 600,
  color: '#9a3b1e',
  background: '#f6e0d4',
  border: '1px solid #e6c2b2',
  borderRadius: '11px',
  padding: '11px 16px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '7px',
};
