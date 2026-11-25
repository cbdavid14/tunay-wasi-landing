import { useState } from 'react';
import type { ReactNode } from 'react';

const ans: React.CSSProperties = {
  fontFamily: 'Montserrat, sans-serif',
  fontSize: 15,
  lineHeight: 1.8,
  color: 'rgba(245,240,232,0.8)',
  margin: 0,
};

const FAQS: { q: string; a: ReactNode }[] = [
  {
    q: '¿Qué tipos de café puedo publicar?',
    a: <p style={ans}>Puedes publicar café verde (sin tostar), tostado en grano o tostado y molido. Los tres tipos son bienvenidos. El café verde solo puede comprarlo un comprador empresa B2B registrado y aprobado; los tostados también los pueden comprar consumidores finales.</p>,
  },
  {
    q: '¿Cómo funciona el pago?',
    a: (
      <div style={{ ...ans, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ margin: 0 }}>TunayWasi <strong style={{ color: '#f2e0cc' }}>no te compra el café</strong> — somos el marketplace que conecta tu lote con cafeterías y negocios.</p>
        <p style={{ margin: 0 }}>Cuando un negocio confirma su pedido, el pago va directamente a la cuenta escrow de TunayWasi. Cuando el courier registra que el pedido llegó y el comprador acepta la entrega (o pasan 7 días calendario sin reclamo), los fondos se liberan a tu Yape o cuenta bancaria.</p>
        <p style={{ margin: 0 }}><strong style={{ color: '#f2e0cc' }}>Tú fijas el precio</strong> de tu lote — TunayWasi no te impone tabla de precios ni negocia por ti.</p>
      </div>
    ),
  },
  {
    q: '¿Hay comisión para el caficultor?',
    a: <p style={ans}>Durante la fase beta la plataforma no cobra comisión — vendes y cobras el 100% de tu precio. Post-beta se aplicará una comisión del 5 % + IGV sobre el valor de la venta, descontada en la liquidación. Te avisaremos con 30 días de anticipación antes de cualquier cambio.</p>,
  },
  {
    q: '¿Cómo despacho el pedido?',
    a: (
      <div style={{ ...ans, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ margin: 0 }}>Tú contratas y llevas el pedido a la agencia de courier que elijas (Olva, Shalom, Cruz del Sur). TunayWasi no gestiona ni opera la logística.</p>
        <p style={{ margin: 0 }}>Desde la app registras el código de guía para que el comprador lo pueda rastrear. El riesgo sobre el producto pasa al comprador cuando el courier registra la recepción del paquete.</p>
      </div>
    ),
  },
  {
    q: '¿Qué necesito para registrarme?',
    a: (
      <div style={{ ...ans, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ margin: 0 }}>Puedes registrarte como caficultor de tres formas:</p>
        <ul style={{ margin: '4px 0 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <li><strong style={{ color: '#f2e0cc' }}>Solo DNI</strong> — Persona natural. Solo puedes publicar café verde (TYPE_A).</li>
          <li><strong style={{ color: '#f2e0cc' }}>RUC propio</strong> — Negocio o microempresa. Puedes publicar los tres tipos de café.</li>
          <li><strong style={{ color: '#f2e0cc' }}>Cooperativa</strong> — La cooperativa emite los comprobantes y gestiona la cuenta.</li>
        </ul>
        <p style={{ margin: '4px 0 0' }}>No se requiere certificación SCA ni puntaje mínimo para publicar.</p>
      </div>
    ),
  },
  {
    q: '¿Cómo muestro la calidad de mi café?',
    a: <p style={ans}>Puedes subir evidencias de calidad en 3 niveles: N1 (fotos de finca y proceso), N2 (análisis físico o granos), N3 (informe de catación verificado por un reviewer). A mayor nivel, más visible tu lote para compradores B2B que buscan garantías de calidad.</p>,
  },
];

interface FaqRowProps {
  q: string;
  a: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

function FaqRow({ q, a, isOpen, onToggle }: FaqRowProps) {
  return (
    <div style={{ borderBottom: '1px solid rgba(196,178,151,0.15)', marginBottom: 4 }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 0', background: 'transparent', border: 'none', cursor: 'pointer',
          textAlign: 'left', color: 'rgb(196,178,151)', fontSize: 16, fontWeight: 600,
          fontFamily: 'Georgia, serif',
        }}
      >
        <span>{q}</span>
        <span style={{
          fontSize: 20, color: 'rgba(196,178,151,0.6)', marginLeft: 16, flexShrink: 0,
          display: 'inline-block',
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
          transition: 'transform .35s cubic-bezier(.2,.7,.2,1)',
        }}>+</span>
      </button>
      <div style={{
        maxHeight: isOpen ? 500 : 0, overflow: 'hidden',
        transition: 'max-height .45s cubic-bezier(.2,.7,.2,1)',
      }}>
        <div style={{ paddingBottom: 18 }}>
          {a}
        </div>
      </div>
    </div>
  );
}

export default function CafiFAQ() {
  const [open, setOpen] = useState<number>(-1);

  return (
    <section id="faq" style={{
      padding: '100px 36px',
      background: 'linear-gradient(180deg, #182520 0%, #1f3028 100%)',
      color: '#f2e0cc',
    }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={{
            fontFamily: 'Bowlby One SC, sans-serif', fontSize: 11, letterSpacing: '0.32em',
            color: '#c96e4b', textTransform: 'uppercase',
          }}>04 — FAQ</span>
          <h2 style={{
            fontFamily: 'Cormorant Garamond, serif', fontWeight: 700,
            fontSize: 'clamp(38px, 5vw, 68px)', lineHeight: 1.02,
            margin: '20px 0 0', color: '#f2e0cc', letterSpacing: '-0.01em',
          }}>
            Preguntas <span style={{ fontStyle: 'italic', fontWeight: 500, color: '#8faf8a' }}>frecuentes</span>.
          </h2>
        </div>

        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          {FAQS.map((f, i) => (
            <FaqRow
              key={f.q}
              q={f.q}
              a={f.a}
              isOpen={open === i}
              onToggle={() => setOpen(open === i ? -1 : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
