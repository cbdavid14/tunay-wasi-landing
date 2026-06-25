/**
 * mobileStyles.ts — Utilidades de responsividad para portales móvil-first
 *
 * Hook useIsMobile + helpers de estilo para botones, grids, padding y cards
 * que se adaptan automáticamente a pantallas < 500px (iOS/Android típico).
 */
import { useState, useEffect } from 'react';

export const MOBILE_BP = 500; // px — punto de quiebre

/** Hook reactivo que detecta si el viewport es < 500px */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => window.innerWidth < MOBILE_BP);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < MOBILE_BP);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

/** Padding horizontal del contenedor principal */
export const padX = (isMobile: boolean) => isMobile ? 16 : 24;

/** Padding vertical del contenedor principal */
export const padY = (isMobile: boolean) => isMobile ? 20 : 28;

/** Padding de cards */
export const cardPad = (isMobile: boolean) => isMobile ? 16 : 20;

/** fontSize mínimo legible */
export const fs = {
  xxs: 11,   // etiquetas
  xs: 12,    // meta
  sm: 13,    // body
  md: 15,    // subtítulos
  lg: 18,    // títulos card
  xl: 24,    // títulos sección
  h1: 28,    // h1 de sección
};

/** Estilo de botón primario — 48px alto mínimo (touch target) */
export function btnPrimary(color: string, isMobile = false): React.CSSProperties {
  return {
    background: color,
    color: 'white',
    border: 'none',
    borderRadius: 12,
    padding: isMobile ? '14px 20px' : '12px 22px',
    fontFamily: 'Montserrat',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    minHeight: 48,
    width: isMobile ? '100%' : 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'opacity 0.15s',
  };
}

/** Estilo de botón secundario (outline) */
export function btnSecondary(color: string, isMobile = false): React.CSSProperties {
  return {
    background: 'transparent',
    color,
    border: `1.5px solid ${color}`,
    borderRadius: 12,
    padding: isMobile ? '13px 18px' : '11px 20px',
    fontFamily: 'Montserrat',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    minHeight: 48,
    width: isMobile ? '100%' : 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'opacity 0.15s',
  };
}

/** Grid de 1 o 2 columnas según móvil */
export function grid2(isMobile: boolean): React.CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
    gap: isMobile ? 10 : 12,
  };
}

/** Grid de 1, 2 o 3 columnas */
export function grid3(isMobile: boolean): React.CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
    gap: isMobile ? 10 : 14,
  };
}

/** Card blanca estándar */
export function card(isMobile: boolean, borderColor?: string): React.CSSProperties {
  return {
    background: 'white',
    borderRadius: isMobile ? 14 : 12,
    padding: cardPad(isMobile),
    boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
    ...(borderColor ? { borderLeft: `4px solid ${borderColor}` } : {}),
  };
}

/** Input estándar móvil */
export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px 14px',
  border: '1.5px solid #e0d8d0',
  borderRadius: 10,
  fontFamily: 'Montserrat',
  fontSize: 14,
  color: '#533b22',
  background: 'white',
  boxSizing: 'border-box',
  minHeight: 48,
};

/** Select estándar móvil */
export const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23c4b297' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 14px center',
  paddingRight: 36,
};

/** Tab-bar superior en desktop / inferior en móvil */
export function tabBarStyle(isMobile: boolean): React.CSSProperties {
  if (isMobile) {
    return {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'white',
      borderTop: '1px solid #eee',
      display: 'flex',
      justifyContent: 'space-around',
      zIndex: 100,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    };
  }
  return {
    background: 'white',
    borderBottom: '1px solid #eee',
    display: 'flex',
    overflowX: 'auto',
  };
}

/** Botón individual de tab */
export function tabBtn(active: boolean, isMobile: boolean, color: string): React.CSSProperties {
  if (isMobile) {
    return {
      flex: 1,
      background: 'none',
      border: 'none',
      padding: '8px 2px 6px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2,
      cursor: 'pointer',
      color: active ? color : '#b0a090',
      fontFamily: 'Montserrat',
      fontSize: 9,
      fontWeight: active ? 700 : 400,
      transition: 'color 0.15s',
      position: 'relative',
      minWidth: 0,
    };
  }
  return {
    background: 'none',
    border: 'none',
    borderBottom: `3px solid ${active ? color : 'transparent'}`,
    padding: '14px 18px',
    fontFamily: 'Montserrat',
    fontSize: 13,
    fontWeight: active ? 700 : 400,
    color: active ? color : '#c4b297',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  };
}

// Hace que React reconozca el tipo CSSProperties
import type React from 'react';
