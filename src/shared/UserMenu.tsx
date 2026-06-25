import { useState, useEffect, useRef } from 'react';
import type { PerfilDoc, PerfilCafeteria, PerfilCaficultor, PerfilLaboratorio } from '@/shared/types/auth';
import { useIsMobile } from '@/shared/mobileStyles';

const C = {
  green: '#1f3028', cream: '#f2e0cc', terra: '#c96e4b',
  sage: '#8faf8a', tan: '#c4b297',
};

function getSubtitulo(perfil: PerfilDoc): string {
  if (perfil.rol === 'caficultor') return `Finca ${(perfil as PerfilCaficultor).finca}`;
  if (perfil.rol === 'cafeteria') return (perfil as PerfilCafeteria).empresa;
  if (perfil.rol === 'laboratorio') return (perfil as PerfilLaboratorio).nombreComercial;
  return perfil.rol;
}

interface Props {
  perfil: PerfilDoc;
  onLogout: () => void;
  navItems?: { key: string; label: string }[];
  onNavegar?: (key: string) => void;
}

export default function UserMenu({ perfil, onLogout, navItems, onNavegar }: Props) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const inicial = perfil.nombre.charAt(0).toUpperCase();
  const primerNombre = perfil.nombre.split(' ')[0];
  const subtitulo = getSubtitulo(perfil);
  const subtituloCorto = subtitulo.length > 22 ? subtitulo.slice(0, 22) + '…' : subtitulo;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Botón trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0',
        }}
        aria-label="Mi cuenta"
      >
        {/* Avatar */}
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          background: C.terra, border: `2px solid ${C.sage}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontWeight: 700,
          color: 'white', flexShrink: 0,
        }}>
          {inicial}
        </div>
        {/* Nombre + subtítulo — solo desktop */}
        {!isMobile && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 700, color: C.cream, lineHeight: 1 }}>
            {primerNombre}
          </span>
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 10, color: C.tan, lineHeight: 1, marginTop: 3 }}>
            {subtituloCorto}
          </span>
        </div>
        )}
        {!isMobile && <span style={{ color: C.tan, fontSize: 10, marginLeft: 2, lineHeight: 1 }}>▾</span>}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 52,
          width: 240, background: 'white',
          borderRadius: 12, boxShadow: '0 8px 32px rgba(31,48,40,0.20)',
          zIndex: 200, overflow: 'hidden',
          border: '1px solid rgba(31,48,40,0.08)',
        }}>
          {/* Header identidad */}
          <div style={{
            padding: '16px 18px', background: C.green,
            display: 'flex', gap: 12, alignItems: 'center',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: C.terra, border: `2px solid ${C.sage}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 700,
              color: 'white', flexShrink: 0,
            }}>
              {inicial}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 700,
                color: C.cream, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {perfil.nombre}
              </div>
              <div style={{
                fontFamily: 'Montserrat, sans-serif', fontSize: 10, color: C.tan,
                marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {subtitulo}
              </div>
              {perfil.email && (
                <div style={{
                  fontFamily: 'Montserrat, sans-serif', fontSize: 10, color: `${C.tan}99`,
                  marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {perfil.email}
                </div>
              )}
            </div>
          </div>

          {/* Nav items del portal */}
          {navItems && navItems.length > 0 && (
            <div style={{ borderBottom: '1px solid #f0ebe4' }}>
              {navItems.map(item => (
                <button
                  key={item.key}
                  onClick={() => { setOpen(false); onNavegar?.(item.key); }}
                  style={{
                    width: '100%', textAlign: 'left', background: 'none', border: 'none',
                    padding: '11px 18px', fontFamily: 'Montserrat, sans-serif', fontSize: 13,
                    color: C.green, cursor: 'pointer', display: 'block',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {/* Cerrar sesión */}
          <button
            onClick={() => { setOpen(false); onLogout(); }}
            style={{
              width: '100%', textAlign: 'left', background: 'none', border: 'none',
              padding: '13px 18px', fontFamily: 'Montserrat, sans-serif', fontSize: 13,
              color: '#cc4444', cursor: 'pointer', display: 'block',
            }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
