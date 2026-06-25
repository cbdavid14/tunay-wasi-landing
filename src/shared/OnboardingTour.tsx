import { useState, useEffect, useLayoutEffect } from 'react';

export interface TourStep {
  targetId: string;
  titulo: string;
  descripcion: string;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const C = {
  green: '#1f3028', cream: '#f2e0cc', terra: '#c96e4b',
  sage: '#8faf8a', tan: '#c4b297', brown: '#533b22',
};

const PAD = 8; // padding del spotlight alrededor del elemento

function getRect(id: string): Rect | null {
  const el = document.getElementById(id);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top - PAD,
    left: r.left - PAD,
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
  };
}

interface Props {
  pasos: TourStep[];
  onFin: () => void;
  onSaltar: () => void;
}

export default function OnboardingTour({ pasos, onFin, onSaltar }: Props) {
  const [paso, setPaso] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const [listo, setListo] = useState(false); // true cuando el elemento del paso actual ya está en el DOM

  const step = pasos[paso];
  const total = pasos.length;

  // Recalcula posición cuando cambia el paso
  useLayoutEffect(() => {
    setListo(false);
    setRect(null);
    setTooltipPos(null);

    function calcular() {
      const r = getRect(step.targetId);
      if (!r) return false;
      setRect(r);
      setListo(true);

      // Tooltip: intenta colocarlo debajo; si no cabe, arriba
      const tooltipH = 160;
      const tooltipW = 300;
      const margen = 12;
      const abajo = r.top + r.height + margen;
      const top = abajo + tooltipH < window.innerHeight ? abajo : r.top - tooltipH - margen;
      // Centrar horizontalmente sobre el elemento, pero que no se salga de pantalla
      let left = r.left + r.width / 2 - tooltipW / 2;
      left = Math.max(16, Math.min(left, window.innerWidth - tooltipW - 16));
      setTooltipPos({ top, left });
      return true;
    }

    // Reintenta hasta que el elemento aparezca en el DOM (puede estar en tab no montado)
    if (!calcular()) {
      const intervalo = setInterval(() => {
        if (calcular()) clearInterval(intervalo);
      }, 100);
      // Límite de 3 segundos para no quedar en loop
      const timeout = setTimeout(() => clearInterval(intervalo), 3000);
      return () => { clearInterval(intervalo); clearTimeout(timeout); };
    }

    window.addEventListener('resize', calcular);
    return () => window.removeEventListener('resize', calcular);
  }, [paso, step.targetId]);

  // Scroll suave al elemento
  useEffect(() => {
    const el = document.getElementById(step.targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  }, [paso, step.targetId]);

  function siguiente() {
    if (paso < total - 1) setPaso(p => p + 1);
    else onFin();
  }

  function anterior() {
    if (paso > 0) setPaso(p => p - 1);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9500, pointerEvents: listo ? 'none' : 'none' }}>
      {/* Overlay oscuro — solo cuando el elemento ya está en el DOM */}
      {listo && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(20,35,25,0.72)',
          pointerEvents: 'auto',
        }} onClick={onSaltar} />
      )}

      {/* Spotlight: borde iluminado alrededor del elemento */}
      {rect && (
        <div style={{
          position: 'absolute',
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          borderRadius: 10,
          boxShadow: `0 0 0 9999px rgba(20,35,25,0.72), 0 0 0 3px ${C.terra}`,
          pointerEvents: 'none',
          transition: 'top 0.25s, left 0.25s, width 0.25s, height 0.25s',
          zIndex: 1,
        }} />
      )}

      {/* Tooltip */}
      {tooltipPos && (
        <div
          style={{
            position: 'absolute',
            top: tooltipPos.top,
            left: tooltipPos.left,
            width: 300,
            background: 'white',
            borderRadius: 14,
            padding: '20px 22px',
            boxShadow: '0 8px 36px rgba(0,0,0,0.22)',
            pointerEvents: 'auto',
            zIndex: 2,
            transition: 'top 0.25s, left 0.25s',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Contador */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{
              fontFamily: 'Montserrat', fontSize: 10, fontWeight: 700, color: C.terra,
              background: `${C.terra}15`, padding: '3px 10px', borderRadius: 20,
              textTransform: 'uppercase', letterSpacing: 1,
            }}>
              Paso {paso + 1} de {total}
            </span>
            <button
              onClick={onSaltar}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'Montserrat', fontSize: 11, color: C.tan,
                padding: '2px 6px',
              }}
            >
              Saltar ×
            </button>
          </div>

          {/* Contenido */}
          <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, fontWeight: 700, color: C.brown, margin: '0 0 6px', lineHeight: 1.2 }}>
            {step.titulo}
          </p>
          <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: '0 0 16px', lineHeight: 1.6 }}>
            {step.descripcion}
          </p>

          {/* Barra de progreso */}
          <div style={{ background: '#f0ebe4', borderRadius: 4, height: 4, marginBottom: 14, overflow: 'hidden' }}>
            <div style={{
              background: C.terra, height: '100%', borderRadius: 4,
              width: `${((paso + 1) / total) * 100}%`,
              transition: 'width 0.3s',
            }} />
          </div>

          {/* Botones nav */}
          <div style={{ display: 'flex', gap: 8 }}>
            {paso > 0 && (
              <button
                onClick={anterior}
                style={{
                  flex: 1, background: '#f7f3ee', color: C.brown,
                  border: 'none', borderRadius: 8, padding: '10px',
                  fontFamily: 'Montserrat', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                ← Anterior
              </button>
            )}
            <button
              onClick={siguiente}
              style={{
                flex: 2, background: paso < total - 1 ? C.green : C.terra,
                color: C.cream, border: 'none', borderRadius: 8, padding: '10px',
                fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {paso < total - 1 ? 'Siguiente →' : 'Entendido ✓'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
