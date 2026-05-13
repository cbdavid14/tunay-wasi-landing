import { useState, useEffect, type ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import { getLead, updateFicha } from '@/services/caficultorLeadService';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';

const VARIEDADES = ['Bourbon', 'Caturra', 'Catuai', 'Gesha/Geisha', 'Pache', 'Typica', 'Catimor', 'Otra'];
const PROCESOS = ['Natural', 'Lavado', 'Honey', 'Anaeróbico', 'Otro'];
const FASES = ['Pre-cosecha (flores)', 'Cosecha en curso', 'Post-cosecha (secado)', 'Listo para envío'];

interface FichaForm {
  nombreMicrolote: string;
  variedad: string;
  altitud: string;
  proceso: string;
  faseActual: string;
  fechaEstimadaEntrega: string;
  cantidadKg: string;
}

const EMPTY: FichaForm = {
  nombreMicrolote: '', variedad: '', altitud: '',
  proceso: '', faseActual: '', fechaEstimadaEntrega: '', cantidadKg: '',
};

const inputBase: React.CSSProperties = {
  width: '100%', fontFamily: 'Montserrat, sans-serif', fontSize: 14,
  color: '#f2e0cc', background: 'transparent', border: 'none',
  borderBottom: '1px solid #f2e0cc33', padding: '12px 0 10px',
  outline: 'none', transition: 'border-color .25s ease', boxSizing: 'border-box',
};

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.22em',
        color: error ? '#c96e4b' : '#c4b297', textTransform: 'uppercase',
        display: 'flex', justifyContent: 'space-between', marginBottom: 2,
      }}>
        <span>{label}</span>
        {error && <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 10, fontStyle: 'italic', textTransform: 'none', letterSpacing: 0, color: '#c96e4b' }}>{error}</span>}
      </label>
      {children}
    </div>
  );
}

export default function FichaCaficultor() {
  const { id: leadId } = useParams<{ id: string }>();
  const [nombre, setNombre] = useState('');
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'not_found' | 'already_done'>('loading');
  const [values, setValues] = useState<FichaForm>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<keyof FichaForm, boolean>>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  useEffect(() => {
    if (!leadId) { setLoadState('not_found'); return; }
    getLead(leadId).then(lead => {
      if (!lead) { setLoadState('not_found'); return; }
      if (lead.estado === 'ficha_completa' || lead.estado === 'cata_agendada') {
        setNombre(lead.nombre);
        setLoadState('already_done');
        return;
      }
      setNombre(lead.nombre);
      setLoadState('ready');
    }).catch(() => setLoadState('not_found'));
  }, [leadId]);

  const setF = (k: keyof FichaForm) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValues(v => ({ ...v, [k]: e.target.value }));
  const onBlur = (k: keyof FichaForm) => () => setTouched(t => ({ ...t, [k]: true }));

  const required: (keyof FichaForm)[] = ['nombreMicrolote', 'variedad', 'altitud', 'proceso', 'faseActual', 'cantidadKg'];
  const errors: Partial<Record<keyof FichaForm, string>> = {};
  for (const k of required) {
    if (!values[k].trim()) errors[k] = 'Requerido';
  }
  const isValid = Object.keys(errors).length === 0;
  const showErr = (k: keyof FichaForm) => touched[k] ? errors[k] : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const allTouched = Object.fromEntries(required.map(k => [k, true])) as Partial<Record<keyof FichaForm, boolean>>;
    setTouched(allTouched);
    if (!isValid || !leadId) return;
    setStatus('sending');
    try {
      await updateFicha(leadId, values);
      setStatus('sent');
    } catch {
      setStatus('idle');
    }
  };

  const primerNombre = nombre.split(' ')[0];

  return (
    <>
      <Nav />
      <main style={{ background: '#1f3028', minHeight: '80vh', padding: '100px 36px 80px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>

          {/* Loading */}
          {loadState === 'loading' && (
            <p style={{ fontFamily: 'Montserrat, sans-serif', color: '#c4b297', textAlign: 'center' }}>Cargando…</p>
          )}

          {/* No encontrado */}
          {loadState === 'not_found' && (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 36, color: '#f2e0cc' }}>Link no válido</h2>
              <p style={{ fontFamily: 'Montserrat, sans-serif', color: '#c4b297', fontSize: 14 }}>
                Este link ya no es válido o expiró. <a href="/#registro" style={{ color: '#c96e4b' }}>Regístrate de nuevo aquí.</a>
              </p>
            </div>
          )}

          {/* Ya completado */}
          {loadState === 'already_done' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#8faf8a', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, color: '#1f3028' }}>✓</div>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 36, color: '#f2e0cc', margin: '0 0 12px' }}>
                ¡{primerNombre}, ya completaste tu ficha!
              </h2>
              <p style={{ fontFamily: 'Montserrat, sans-serif', color: '#c4b297', fontSize: 14, lineHeight: 1.6 }}>
                Tu ficha técnica ya está registrada. Te contactaremos por WhatsApp para coordinar el siguiente paso.
              </p>
            </div>
          )}

          {/* Ficha enviada con éxito */}
          {status === 'sent' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#8faf8a', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, color: '#1f3028' }}>✓</div>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 36, color: '#f2e0cc', margin: '0 0 12px' }}>
                ¡Ficha completa, {primerNombre}!
              </h2>
              <p style={{ fontFamily: 'Montserrat, sans-serif', color: '#c4b297', fontSize: 14, lineHeight: 1.6, maxWidth: 480, margin: '0 auto' }}>
                Nos llegó tu ficha de microlote. Te contactamos en las próximas 24 horas para coordinar la cata y el precio según tu puntaje SCA.
              </p>
            </div>
          )}

          {/* Formulario */}
          {loadState === 'ready' && status !== 'sent' && (
            <>
              <div style={{ marginBottom: 36 }}>
                <span style={{ fontFamily: 'Bowlby One SC, sans-serif', fontSize: 11, letterSpacing: '0.32em', color: '#c96e4b', textTransform: 'uppercase' }}>
                  Paso 2 de 2 — Ficha técnica
                </span>
                {/* Barra de progreso */}
                <div style={{ height: 3, background: '#f2e0cc18', borderRadius: 99, marginTop: 8 }}>
                  <div style={{ height: '100%', width: '100%', background: '#8faf8a', borderRadius: 99 }} />
                </div>
                <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, fontSize: 'clamp(28px, 4vw, 48px)', color: '#f2e0cc', margin: '20px 0 8px', lineHeight: 1.1 }}>
                  Hola {primerNombre}, cuéntanos<br />
                  <span style={{ fontStyle: 'italic', fontWeight: 500, color: '#c96e4b' }}>sobre tu café.</span>
                </h2>
                <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, color: '#c4b297', lineHeight: 1.6, margin: 0 }}>
                  Esta información nos permite asignarte el precio correcto según tu puntaje SCA y coordinar el recojo.
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                <Field label="Nombre del microlote" error={showErr('nombreMicrolote')}>
                  <input
                    value={values.nombreMicrolote} onChange={setF('nombreMicrolote')} onBlur={onBlur('nombreMicrolote')}
                    placeholder="Ej: Finca Vista Hermosa · Lote Rojo"
                    style={{ ...inputBase, borderBottomColor: showErr('nombreMicrolote') ? '#c96e4b' : '#f2e0cc33' }}
                  />
                </Field>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="tw-2col-sm">
                  <Field label="Variedad" error={showErr('variedad')}>
                    <select
                      value={values.variedad} onChange={setF('variedad')} onBlur={onBlur('variedad')}
                      style={{ ...inputBase, cursor: 'pointer', appearance: 'none' as const, color: values.variedad ? '#f2e0cc' : '#f2e0cc55', borderBottomColor: showErr('variedad') ? '#c96e4b' : '#f2e0cc33' }}
                    >
                      <option value="">Seleccionar</option>
                      {VARIEDADES.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Altitud (msnm)" error={showErr('altitud')}>
                    <input
                      type="number" value={values.altitud} onChange={setF('altitud')} onBlur={onBlur('altitud')}
                      placeholder="1800"
                      style={{ ...inputBase, borderBottomColor: showErr('altitud') ? '#c96e4b' : '#f2e0cc33' }}
                    />
                  </Field>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="tw-2col-sm">
                  <Field label="Proceso" error={showErr('proceso')}>
                    <select
                      value={values.proceso} onChange={setF('proceso')} onBlur={onBlur('proceso')}
                      style={{ ...inputBase, cursor: 'pointer', appearance: 'none' as const, color: values.proceso ? '#f2e0cc' : '#f2e0cc55', borderBottomColor: showErr('proceso') ? '#c96e4b' : '#f2e0cc33' }}
                    >
                      <option value="">Seleccionar</option>
                      {PROCESOS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </Field>
                  <Field label="Fase actual del lote" error={showErr('faseActual')}>
                    <select
                      value={values.faseActual} onChange={setF('faseActual')} onBlur={onBlur('faseActual')}
                      style={{ ...inputBase, cursor: 'pointer', appearance: 'none' as const, color: values.faseActual ? '#f2e0cc' : '#f2e0cc55', borderBottomColor: showErr('faseActual') ? '#c96e4b' : '#f2e0cc33' }}
                    >
                      <option value="">Seleccionar</option>
                      {FASES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </Field>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="tw-2col-sm">
                  <Field label="Fecha estimada de entrega">
                    <input
                      type="date" value={values.fechaEstimadaEntrega} onChange={setF('fechaEstimadaEntrega')}
                      style={{ ...inputBase, borderBottomColor: '#f2e0cc33', colorScheme: 'dark' }}
                    />
                  </Field>
                  <Field label="Cantidad total (kg)" error={showErr('cantidadKg')}>
                    <input
                      type="number" value={values.cantidadKg} onChange={setF('cantidadKg')} onBlur={onBlur('cantidadKg')}
                      placeholder="12 kg mínimo"
                      style={{ ...inputBase, borderBottomColor: showErr('cantidadKg') ? '#c96e4b' : '#f2e0cc33' }}
                    />
                  </Field>
                </div>

                <button
                  type="submit" disabled={status === 'sending'}
                  style={{
                    marginTop: 8, padding: '18px 28px',
                    background: isValid ? '#c96e4b' : '#c4b29755',
                    color: '#1f3028', border: 'none', borderRadius: 999,
                    cursor: isValid ? 'pointer' : 'not-allowed',
                    fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 13,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    boxShadow: isValid ? '0 18px 36px -16px #533b22cc' : 'none',
                    transition: 'all .25s ease',
                    opacity: status === 'sending' ? 0.7 : 1,
                  }}
                >
                  {status === 'sending' ? 'Guardando…' : '✓ Enviar ficha técnica →'}
                </button>

              </form>
            </>
          )}
        </div>
      </main>
      <Footer />

      <style>{`
        @media (max-width: 560px) { .tw-2col-sm { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  );
}
