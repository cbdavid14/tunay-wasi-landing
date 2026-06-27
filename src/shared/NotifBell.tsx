import { useState, useEffect, useRef } from 'react';
import { useNotificaciones } from './useNotificaciones';
import { markAsRead, markAllAsRead } from './notificacionesService';
import { useIsMobile } from './mobileStyles';

const C = {
  green: '#1f3028', cream: '#f2e0cc', terra: '#c96e4b',
  sage: '#8faf8a', tan: '#c4b297', brown: '#533b22',
};

// Infiere el tab de destino desde el título — fallback para notifs sin campo url
function inferirUrl(titulo: string): string | null {
  if (titulo.includes('Solicitud de muestra') || titulo.includes('Solicitud de certificación')) return 'solicitudes';
  if (titulo.includes('Lote catado') || titulo.includes('Lote publicado')) return 'mis_lotes';
  if (titulo.includes('Nuevo pedido') || titulo.includes('Pago recibido') || titulo.includes('Pedido confirmado')) return 'mis_pagos';
  if (titulo.includes('Muestra despachada')) return 'muestras';
  if (titulo.includes('Pago verificado') || titulo.includes('Reserva liberada') || titulo.includes('Pedido entregado') || titulo.includes('pedido salió')) return 'pedidos';
  if (titulo.includes('Fee de catación')) return 'mis_catas';
  if (titulo.includes('certificación') || titulo.includes('certificado') || titulo.includes('Muestra en camino') || titulo.includes('lab recibió')) return 'mis_muestras';
  return null;
}

function tiempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  return `hace ${d}d`;
}

interface Props {
  uid: string;
  onNavegar?: (url: string) => void;
}

export default function NotifBell({ uid, onNavegar }: Props) {
  const isMobile = useIsMobile();
  const { notifs, noLeidas } = useNotificaciones(uid);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Botón campanita */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative', background: 'transparent', border: 'none',
          cursor: 'pointer', padding: '6px 8px', display: 'flex', alignItems: 'center',
        }}
        aria-label="Notificaciones"
      >
        <span style={{ fontSize: 20, lineHeight: 1 }}>🔔</span>
        {noLeidas > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            background: C.terra, color: 'white',
            fontSize: 9, fontFamily: 'Montserrat', fontWeight: 700,
            borderRadius: 10, minWidth: 16, height: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px', lineHeight: 1,
          }}>
            {noLeidas > 99 ? '99+' : noLeidas}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={isMobile ? {
          position: 'fixed', left: 0, right: 0, top: 52,
          maxHeight: 'calc(100dvh - 52px)', overflowY: 'auto',
          background: 'white', zIndex: 300,
          boxShadow: '0 8px 32px rgba(31,48,40,0.22)',
          borderTop: `2px solid ${C.terra}`,
        } : {
          position: 'absolute', right: 0, top: '100%', marginTop: 8,
          width: 320, maxHeight: 420, overflowY: 'auto',
          background: 'white', borderRadius: 12,
          boxShadow: '0 8px 32px rgba(31,48,40,0.18)',
          zIndex: 200, border: `1px solid rgba(31,48,40,0.08)`,
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px', borderBottom: `1px solid rgba(31,48,40,0.08)`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, color: C.green }}>
              Notificaciones
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {noLeidas > 0 && (
                <button
                  onClick={() => markAllAsRead(uid).catch(() => {})}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'Montserrat', fontSize: 11, color: C.terra, fontWeight: 600,
                  }}
                >
                  Marcar todas como leídas
                </button>
              )}
              {isMobile && (
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'Montserrat', fontSize: 16, color: C.brown, lineHeight: 1, padding: '0 4px',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Lista */}
          {notifs.length === 0 ? (
            <div style={{
              padding: 32, textAlign: 'center',
              fontFamily: 'Montserrat', fontSize: 12, color: C.brown,
            }}>
              Sin notificaciones
            </div>
          ) : (
            notifs.map(n => (
              <div
                key={n.id}
                onClick={() => {
                  markAsRead(uid, n.id).catch(() => {});
                  const destino = n.url ?? inferirUrl(n.titulo);
                  if (destino && onNavegar) {
                    setOpen(false);
                    onNavegar(destino);
                  }
                }}
                style={{
                  padding: '12px 16px',
                  background: n.leida ? 'white' : `${C.sage}12`,
                  borderBottom: `1px solid rgba(31,48,40,0.06)`,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = `${C.sage}20`)}
                onMouseLeave={e => (e.currentTarget.style.background = n.leida ? 'white' : `${C.sage}12`)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{
                    fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12, color: C.green,
                    flex: 1,
                  }}>
                    {n.titulo}
                  </span>
                  <span style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.brown, whiteSpace: 'nowrap', marginTop: 1 }}>
                    {tiempoRelativo(n.createdAt)}
                  </span>
                </div>
                <p style={{
                  fontFamily: 'Montserrat', fontSize: 11, color: C.brown,
                  margin: '3px 0 0', lineHeight: 1.5,
                }}>
                  {n.cuerpo}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
