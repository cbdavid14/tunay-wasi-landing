import React from 'react'
import { navigate } from '@/router'
import { marcarOrigenOnboarding } from '../../onboarding'

interface Props {
  onClose: () => void
  productoIntencion?: { nombre: string; precio: number } | null
}

export const ModalRegistro: React.FC<Props> = ({ onClose, productoIntencion }) => (
  <div
    onClick={onClose}
    style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}
  >
    <div
      onClick={e => e.stopPropagation()}
      style={{
        background: 'var(--tw-card)', border: '1px solid var(--tw-border)',
        borderRadius: 14, padding: '28px 24px', maxWidth: 380, width: '100%',
      }}
    >
      {/* Título */}
      <div style={{ fontFamily: 'var(--tw-font-display)', fontSize: 20, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 6 }}>
        Continuar para comprar
      </div>

      {/* Contexto del producto */}
      {productoIntencion ? (
        <p style={{ fontSize: 12, color: 'var(--tw-text-muted)', marginBottom: 18, fontFamily: 'var(--tw-font-body)', lineHeight: 1.5 }}>
          Regístrate gratis para agregar <strong style={{ color: 'var(--tw-text)' }}>{productoIntencion.nombre}</strong> (S/{productoIntencion.precio}) a tu carrito.
          Puedes seguir explorando sin cuenta.
        </p>
      ) : (
        <p style={{ fontSize: 12, color: 'var(--tw-text-muted)', marginBottom: 18, fontFamily: 'var(--tw-font-body)' }}>
          Regístrate gratis para comprar en TunayWasi.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Opción 1: Consumidor */}
        <a
          href="/registro"
          onClick={(e) => { e.preventDefault(); onClose(); marcarOrigenOnboarding('modal_compra'); navigate('/registro') }}
          style={{
            padding: '13px 16px', borderRadius: 9,
            background: 'var(--tw-terra)', color: '#fff',
            textDecoration: 'none', fontWeight: 700, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 10,
            fontFamily: 'var(--tw-font-body)',
          }}
        >
          <span style={{ fontSize: 20 }}>🧑</span>
          <div>
            <div>Consumidor</div>
            <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.85 }}>Compra por bolsa, precio fijo</div>
          </div>
        </a>

        {/* Opción 2: Negocio */}
        <a
          href="/registro-emprendedor"
          onClick={(e) => { e.preventDefault(); onClose(); marcarOrigenOnboarding('modal_compra'); navigate('/registro-emprendedor') }}
          style={{
            padding: '13px 16px', borderRadius: 9,
            border: '1px solid var(--tw-border)', background: 'var(--tw-card)',
            color: 'var(--tw-text)', textDecoration: 'none', fontWeight: 700, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 10,
            fontFamily: 'var(--tw-font-body)',
          }}
        >
          <span style={{ fontSize: 20 }}>☕</span>
          <div>
            <div>Negocio / empresa</div>
            <div style={{ fontSize: 10, fontWeight: 400, color: 'var(--tw-text-muted)' }}>Volumen, cotizar, factura electrónica</div>
          </div>
        </a>

        {/* Separador */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--tw-border)' }} />
          <span style={{ fontSize: 10, color: 'var(--tw-text-muted)', fontFamily: 'var(--tw-font-body)' }}>¿Ya tienes cuenta?</span>
          <div style={{ flex: 1, height: 1, background: 'var(--tw-border)' }} />
        </div>

        {/* Opción 3: Iniciar sesión */}
        <a
          href="/portal"
          onClick={(e) => { e.preventDefault(); onClose(); marcarOrigenOnboarding('modal_compra'); navigate('/portal') }}
          style={{
            padding: '11px 16px', borderRadius: 9,
            border: '1px solid var(--tw-terra)', background: 'transparent',
            color: 'var(--tw-terra)', textDecoration: 'none', fontWeight: 700, fontSize: 13,
            textAlign: 'center', fontFamily: 'var(--tw-font-body)',
          }}
        >
          Iniciar sesión →
        </a>
      </div>

      <button
        onClick={onClose}
        style={{
          marginTop: 14, width: '100%', padding: '8px',
          background: 'none', border: 'none', color: 'var(--tw-text-muted)',
          cursor: 'pointer', fontSize: 11, fontFamily: 'var(--tw-font-body)',
        }}
      >
        Seguir explorando sin registrarme
      </button>
    </div>
  </div>
)
