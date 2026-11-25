import React, { useState } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/shared/firebase'

type Paso = 'formulario' | 'enviado'

interface FormData {
  tipoPersona: 'natural' | 'juridica'
  nombre: string
  dni: string
  email: string
  telefono: string
  pedidoId: string
  tipoReclamo: 'reclamo' | 'queja'
  detalle: string
  pedidoFecha: string
}

const INITIAL: FormData = {
  tipoPersona: 'natural',
  nombre: '',
  dni: '',
  email: '',
  telefono: '',
  pedidoId: '',
  tipoReclamo: 'reclamo',
  detalle: '',
  pedidoFecha: '',
}

export default function LibroReclamacionesONE() {
  const [paso, setPaso] = useState<Paso>('formulario')
  const [form, setForm] = useState<FormData>(INITIAL)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [codigoReclamo, setCodigoReclamo] = useState('')

  function set(k: keyof FormData, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre || !form.email || !form.detalle) {
      setError('Completa los campos obligatorios.')
      return
    }
    setError('')
    setSending(true)
    try {
      const ref = await addDoc(collection(db, 'reclamaciones'), {
        ...form,
        creadoEn: serverTimestamp(),
        estado: 'pendiente',
      })
      const codigo = 'REC-' + ref.id.slice(0, 8).toUpperCase()
      await addDoc(collection(db, 'reclamaciones'), {}).catch(() => {})
      setCodigoReclamo(codigo)
      setPaso('enviado')
    } catch {
      setError('Error al enviar. Intenta de nuevo o escríbenos a soporte@tunay-wasi.com')
    } finally {
      setSending(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid var(--tw-border-dark)',
    background: 'var(--tw-card)',
    color: 'var(--tw-text)',
    fontSize: 13,
    fontFamily: 'var(--tw-font-body)',
    outline: 'none',
    boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--tw-text-muted)',
    marginBottom: 5,
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px 80px' }}>
      {/* Cabecera */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--tw-terra)', marginBottom: 6 }}>
          Libro de Reclamaciones Digital
        </div>
        <h1 style={{ fontFamily: 'var(--tw-font-display)', fontSize: 30, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 8 }}>
          📋 Registrar reclamo o queja
        </h1>
        <p style={{ fontSize: 13, color: 'var(--tw-text-muted)', lineHeight: 1.6 }}>
          Conforme al D.Leg. 1510, Ley 29571 y Ley 32495. Responderemos en un plazo máximo de <strong>15 días hábiles</strong>.
          Recibirás el código de seguimiento en tu correo.
        </p>
      </div>

      {paso === 'enviado' ? (
        <div style={{ padding: 28, borderRadius: 14, background: 'var(--tw-card)', border: '1px solid var(--tw-border-dark)', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 8 }}>Reclamo registrado</h2>
          <p style={{ fontSize: 13, color: 'var(--tw-text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
            Hemos recibido tu {form.tipoReclamo}. Revisaremos tu caso y te responderemos al correo <strong>{form.email}</strong> dentro de 15 días hábiles.
          </p>
          <div style={{ display: 'inline-block', padding: '10px 20px', borderRadius: 8, background: 'var(--tw-terra)', color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '0.05em' }}>
            {codigoReclamo}
          </div>
          <p style={{ fontSize: 11, color: 'var(--tw-text-faint)', marginTop: 12 }}>Guarda este código para hacer seguimiento de tu caso.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Tipo persona */}
          <div>
            <label style={labelStyle}>Tipo de persona *</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['natural', 'juridica'] as const).map(t => (
                <button key={t} type="button"
                  onClick={() => set('tipoPersona', t)}
                  style={{
                    padding: '8px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid',
                    borderColor: form.tipoPersona === t ? 'var(--tw-terra)' : 'var(--tw-border-dark)',
                    background: form.tipoPersona === t ? 'var(--tw-terra-muted)' : 'var(--tw-card)',
                    color: form.tipoPersona === t ? 'var(--tw-terra)' : 'var(--tw-text-muted)',
                  }}>
                  {t === 'natural' ? 'Persona natural' : 'Persona jurídica'}
                </button>
              ))}
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label style={labelStyle}>Nombre completo / Razón social *</label>
            <input style={inputStyle} value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Tu nombre completo" required />
          </div>

          {/* DNI / RUC */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>{form.tipoPersona === 'natural' ? 'DNI' : 'RUC'}</label>
              <input style={inputStyle} value={form.dni} onChange={e => set('dni', e.target.value)} placeholder={form.tipoPersona === 'natural' ? '12345678' : '20XXXXXXXXX'} />
            </div>
            <div>
              <label style={labelStyle}>Teléfono</label>
              <input style={inputStyle} value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+51 9XX XXX XXX" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle}>Correo electrónico *</label>
            <input style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="tu@correo.com" required />
          </div>

          {/* Pedido */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>N.° de pedido (si aplica)</label>
              <input style={inputStyle} value={form.pedidoId} onChange={e => set('pedidoId', e.target.value)} placeholder="PED-XXXXXXXX" />
            </div>
            <div>
              <label style={labelStyle}>Fecha aproximada del pedido</label>
              <input style={inputStyle} type="date" value={form.pedidoFecha} onChange={e => set('pedidoFecha', e.target.value)} />
            </div>
          </div>

          {/* Tipo reclamo */}
          <div>
            <label style={labelStyle}>Tipo *</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['reclamo', 'queja'] as const).map(t => (
                <button key={t} type="button"
                  onClick={() => set('tipoReclamo', t)}
                  style={{
                    padding: '8px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid',
                    borderColor: form.tipoReclamo === t ? 'var(--tw-terra)' : 'var(--tw-border-dark)',
                    background: form.tipoReclamo === t ? 'var(--tw-terra-muted)' : 'var(--tw-card)',
                    color: form.tipoReclamo === t ? 'var(--tw-terra)' : 'var(--tw-text-muted)',
                  }}>
                  {t === 'reclamo' ? '⚠️ Reclamo (disconformidad)' : '💬 Queja (malestar)'}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: 'var(--tw-text-faint)', marginTop: 5 }}>
              Reclamo: disconformidad con el producto/servicio · Queja: disconformidad con la atención
            </p>
          </div>

          {/* Detalle */}
          <div>
            <label style={labelStyle}>Descripción del {form.tipoReclamo} *</label>
            <textarea
              style={{ ...inputStyle, minHeight: 110, resize: 'vertical' }}
              value={form.detalle}
              onChange={e => set('detalle', e.target.value)}
              placeholder="Describe con detalle lo que ocurrió..."
              required
            />
          </div>

          {error && (
            <p style={{ fontSize: 12, color: '#e74c3c', padding: '8px 12px', borderRadius: 6, background: 'rgba(231,76,60,.08)', border: '1px solid rgba(231,76,60,.2)' }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={sending}
            style={{
              padding: '12px 24px', borderRadius: 9, border: 'none', cursor: sending ? 'not-allowed' : 'pointer',
              background: 'var(--tw-terra)', color: '#fff', fontSize: 14, fontWeight: 700,
              fontFamily: 'var(--tw-font-body)', opacity: sending ? 0.6 : 1, transition: 'opacity .15s',
            }}>
            {sending ? 'Enviando...' : '📋 Registrar ' + form.tipoReclamo}
          </button>

          <p style={{ fontSize: 11, color: 'var(--tw-text-faint)', lineHeight: 1.6 }}>
            Tus datos se tratarán conforme a nuestra{' '}
            <a href="/#/privacidad" style={{ color: 'var(--tw-terra)', textDecoration: 'none' }}>Política de Privacidad</a>.
            Ley 29571 · Ley 32495 · D.Leg. 1729 · Lima, Perú.
          </p>
        </form>
      )}
    </div>
  )
}
