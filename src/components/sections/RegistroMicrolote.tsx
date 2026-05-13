import { useState, type ChangeEvent } from 'react';
import { createLead } from '@/services/caficultorLeadService';

const REGIONES = [
  'Cajamarca', 'San Martín', 'Junín', 'Cusco', 'Amazonas',
  'Puno', 'Huánuco', 'Ayacucho', 'Piura', 'Otra región',
];

const inputBase: React.CSSProperties = {
  width: '100%', fontFamily: 'Montserrat, sans-serif', fontSize: 15,
  color: '#1f3028', background: 'transparent', border: 'none',
  borderBottom: '2px solid #1f302833', padding: '12px 0 10px',
  outline: 'none', transition: 'border-color .25s ease', boxSizing: 'border-box',
};

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <label style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.22em',
        color: error ? '#c96e4b' : '#533b22', textTransform: 'uppercase',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>{label}</span>
        {error && <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 10, fontStyle: 'italic', textTransform: 'none', letterSpacing: 0, color: '#c96e4b' }}>{error}</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Estado 1: Captura rápida ──────────────────────────────────────────────

interface Step1Form { nombre: string; whatsapp: string; region: string; }
const EMPTY1: Step1Form = { nombre: '', whatsapp: '', region: '' };

function Step1({ onSuccess }: { onSuccess: (leadId: string, nombre: string) => void }) {
  const [v, setV] = useState<Step1Form>(EMPTY1);
  const [touched, setTouched] = useState<Partial<Record<keyof Step1Form, boolean>>>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const setF = (k: keyof Step1Form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setV(prev => ({ ...prev, [k]: e.target.value }));
  const onBlur = (k: keyof Step1Form) => () => setTouched(t => ({ ...t, [k]: true }));

  const errors: Partial<Record<keyof Step1Form, string>> = {};
  if (!v.nombre.trim()) errors.nombre = 'Requerido';
  if (!v.whatsapp.trim()) errors.whatsapp = 'Requerido';
  else if (!/^\+?[0-9]{9,15}$/.test(v.whatsapp.replace(/\s/g, ''))) errors.whatsapp = 'Número inválido';
  if (!v.region) errors.region = 'Requerido';
  const isValid = Object.keys(errors).length === 0;

  const showErr = (k: keyof Step1Form) => touched[k] ? errors[k] : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ nombre: true, whatsapp: true, region: true });
    if (!isValid) return;
    setSending(true);
    setError('');
    try {
      const leadId = await createLead({
        nombre: v.nombre.trim(),
        whatsapp: v.whatsapp.replace(/\s/g, ''),
        region: v.region,
      });
      onSuccess(leadId, v.nombre.trim());
    } catch {
      setError('Hubo un problema al guardar. Intenta de nuevo.');
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{
      background: '#f2e0cc', padding: '44px 40px', borderRadius: 28,
      boxShadow: '0 32px 70px -28px #000000cc',
      display: 'flex', flexDirection: 'column', gap: 24,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorativo */}
      <div style={{ position: 'absolute', top: -50, right: -50, width: 240, height: 240, border: '1px solid #c96e4b22', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', bottom: -30, left: -30, width: 160, height: 160, border: '1px solid #1f302811', borderRadius: '50%' }} />

      <div>
        <div style={{ fontFamily: 'Bowlby One SC, sans-serif', fontSize: 10, letterSpacing: '0.22em', color: '#533b22', textTransform: 'uppercase', marginBottom: 4 }}>
          Paso 1 de 2 — Registro inicial
        </div>
        {/* Barra de progreso */}
        <div style={{ height: 3, background: '#1f302811', borderRadius: 99, marginTop: 8 }}>
          <div style={{ height: '100%', width: '50%', background: '#c96e4b', borderRadius: 99, transition: 'width .5s ease' }} />
        </div>
      </div>

      <Field label="Tu nombre completo" error={showErr('nombre')}>
        <input
          value={v.nombre} onChange={setF('nombre')} onBlur={onBlur('nombre')}
          placeholder="Juan Quispe Huanca" autoComplete="name"
          style={{ ...inputBase, borderBottomColor: showErr('nombre') ? '#c96e4b' : '#1f302833' }}
        />
      </Field>

      <Field label="Tu WhatsApp" error={showErr('whatsapp')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, color: '#533b22', paddingBottom: 2 }}>🇵🇪</span>
          <input
            type="tel" value={v.whatsapp} onChange={setF('whatsapp')} onBlur={onBlur('whatsapp')}
            placeholder="+51 987 654 321" autoComplete="tel"
            style={{ ...inputBase, flex: 1, borderBottomColor: showErr('whatsapp') ? '#c96e4b' : '#1f302833' }}
          />
        </div>
      </Field>

      <Field label="Región donde está tu finca" error={showErr('region')}>
        <select
          value={v.region} onChange={setF('region')} onBlur={onBlur('region')}
          style={{
            ...inputBase, cursor: 'pointer', appearance: 'none' as const,
            color: v.region ? '#1f3028' : '#1f302866',
            borderBottomColor: showErr('region') ? '#c96e4b' : '#1f302833',
          }}
        >
          <option value="">Selecciona tu región</option>
          {REGIONES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </Field>

      {error && (
        <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: '#c96e4b', margin: 0 }}>{error}</p>
      )}

      <button
        type="submit" disabled={sending}
        style={{
          padding: '18px 28px', background: '#c96e4b', color: '#1f3028',
          border: 'none', borderRadius: 999, cursor: sending ? 'wait' : 'pointer',
          fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 13,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          boxShadow: '0 18px 36px -16px #533b22cc',
          transition: 'all .25s ease', opacity: sending ? 0.7 : 1,
        }}
      >
        {sending ? 'Guardando…' : 'Registrarme ahora →'}
      </button>

      <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 10, color: '#533b2299', textAlign: 'center', margin: 0 }}>
        Solo 3 campos. La ficha técnica la completamos juntos.
      </p>
    </form>
  );
}

// ─── Estado 2: Confirmación + link a ficha ─────────────────────────────────

function Step1Success({ leadId, nombre }: { leadId: string; nombre: string }) {
  const fichaUrl = `${window.location.origin}/ficha/${leadId}`;
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(fichaUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const waMsg = encodeURIComponent(
    `Hola ${nombre.split(' ')[0]}, ya quedaste registrado en Tunay Wasi 🌿\n\nPara asignarte el precio de tu lote, completa tu ficha técnica aquí:\n${fichaUrl}\n\nNo te toma más de 3 minutos. ¡Coordinamos el recojo una vez lista!`
  );

  return (
    <div style={{
      background: '#f2e0cc', padding: '44px 40px', borderRadius: 28,
      boxShadow: '0 32px 70px -28px #000000cc',
      display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', textAlign: 'center',
    }}>
      {/* Check */}
      <div style={{
        width: 72, height: 72, borderRadius: '50%', background: '#8faf8a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Cormorant Garamond, serif', fontSize: 38, color: '#1f3028',
      }}>✓</div>

      <div>
        <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 30, fontWeight: 600, margin: '0 0 8px', color: '#1f3028', lineHeight: 1.1 }}>
          ¡Listo, {nombre.split(' ')[0]}!
        </h3>
        <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: '#533b22', lineHeight: 1.6, margin: 0 }}>
          Ya quedaste registrado. Te enviamos un WhatsApp con el link para completar tu ficha técnica.
        </p>
      </div>

      {/* Paso 2 CTA */}
      <div style={{ width: '100%', padding: '20px', background: '#1f302808', borderRadius: 16, border: '1px solid #1f302820' }}>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.22em', color: '#533b22', textTransform: 'uppercase', margin: '0 0 10px' }}>
          Paso 2 — Completa tu ficha técnica
        </p>
        <a
          href={`/ficha/${leadId}`}
          style={{
            display: 'block', padding: '14px 20px', background: '#1f3028',
            color: '#f2e0cc', borderRadius: 12, textDecoration: 'none',
            fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 13,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            transition: 'background .25s ease',
          }}
        >
          Completar ficha ahora →
        </a>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button
            onClick={copy}
            style={{
              flex: 1, padding: '10px', background: 'transparent',
              border: '1px solid #1f302822', borderRadius: 8, cursor: 'pointer',
              fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: '#533b22',
              transition: 'all .2s ease',
            }}
          >
            {copied ? '✓ Link copiado' : '🔗 Copiar link'}
          </button>
          <a
            href={`https://wa.me/51917959370?text=${waMsg}`}
            target="_blank" rel="noreferrer"
            style={{
              flex: 1, padding: '10px', background: '#25D366', borderRadius: 8,
              textDecoration: 'none', fontFamily: 'Montserrat, sans-serif',
              fontSize: 11, fontWeight: 600, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'opacity .2s ease',
            }}
          >
            📱 Abrirlo en WhatsApp
          </a>
        </div>
      </div>

      <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 10, color: '#533b2277', margin: 0 }}>
        Si no recibes el WhatsApp en 5 minutos, usa el link de arriba directamente.
      </p>
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────

export default function RegistroMicrolote() {
  const [leadId, setLeadId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');

  return (
    <section id="registro" style={{ padding: '100px 36px', background: '#1f3028' }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        display: 'grid', gridTemplateColumns: '0.9fr 1.1fr',
        gap: 80, alignItems: 'start',
      }} className="tw-2col">

        {/* Columna izquierda — copy */}
        <div>
          <span style={{ fontFamily: 'Bowlby One SC, sans-serif', fontSize: 11, letterSpacing: '0.32em', color: '#c96e4b', textTransform: 'uppercase' }}>
            05 — Registro de microlote
          </span>
          <h2 style={{
            fontFamily: 'Cormorant Garamond, serif', fontWeight: 700,
            fontSize: 'clamp(32px, 4vw, 56px)', lineHeight: 1.0,
            color: '#f2e0cc', margin: '20px 0 20px', letterSpacing: '-0.01em',
          }}>
            Regístrate en<br />
            <span style={{ fontStyle: 'italic', fontWeight: 500, color: '#c96e4b' }}>30 segundos.</span><br />
            La ficha después.
          </h2>
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, lineHeight: 1.7, color: '#c4b297', maxWidth: 380 }}>
            Solo necesitamos tu nombre y WhatsApp para reservar tu cupo. Te mandamos el link para completar la ficha técnica cuando tengas un momento.
          </p>
          <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              ['📦', 'Lote mínimo: 12 kg verde oro'],
              ['☕', 'Cata Q-Grader sin costo — cubierta por Tunay Wasi'],
              ['💰', 'Pago a los 7 días hábiles post-venta'],
              ['🔍', 'Tu nombre en cada bolsa que se vende'],
            ].map(([icon, text]) => (
              <div key={text} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: '#c4b297' }}>{text}</span>
              </div>
            ))}
          </div>

          {/* Prueba social */}
          <div style={{ marginTop: 40, padding: '20px 24px', borderRadius: 16, background: '#f2e0cc11', border: '1px solid #f2e0cc18' }}>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontStyle: 'italic', color: '#f2e0cc', margin: '0 0 10px', lineHeight: 1.4 }}>
              "Me registré en un minuto desde el campo. Coordinamos todo por WhatsApp."
            </p>
            <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: '#c4b297', margin: 0, letterSpacing: '0.08em' }}>
              — PERCY QUISPE · FINCA EL PALOMAR · JUNÍN
            </p>
          </div>
        </div>

        {/* Columna derecha — formulario o confirmación */}
        {leadId
          ? <Step1Success leadId={leadId} nombre={nombre} />
          : <Step1 onSuccess={(id, n) => { setLeadId(id); setNombre(n); }} />
        }
      </div>

      <style>{`
        @media (max-width: 768px) { .tw-2col { grid-template-columns: 1fr !important; gap: 48px !important; } }
      `}</style>
    </section>
  );
}
