import React, { useState } from 'react'

export interface DireccionONE {
  id: string
  tipo: string
  nombre: string
  direccion: string
  distrito: string
  provincia: string
  departamento: string
  codigoPostal: string
  referencia: string
  telefono: string
  esPrincipal: boolean
}

const DEPARTAMENTOS_PERU = [
  'Amazonas','Áncash','Apurímac','Arequipa','Ayacucho','Cajamarca','Callao',
  'Cusco','Huancavelica','Huánuco','Ica','Junín','La Libertad','Lambayeque',
  'Lima','Loreto','Madre de Dios','Moquegua','Pasco','Piura','Puno',
  'San Martín','Tacna','Tumbes','Ucayali',
]

const TIPOS_EMOJI: Record<string, string> = {
  local: '🏢', domicilio: '🏠', almacen: '📦',
  finca: '🏡', agencia: '🏪', otro: '🏢',
}

export function tipoEmoji(tipo: string): string {
  return TIPOS_EMOJI[tipo] ?? '📍'
}

const ModalDireccion: React.FC<{
  rol: 'buyer_b2c' | 'buyer_b2b' | 'seller'
  direccion?: DireccionONE
  onClose: () => void
  onGuardar: (d: DireccionONE) => void
}> = ({ rol, direccion, onClose, onGuardar }) => {
  const esEdicion = !!direccion
  const tiposNegocio = [
    { value: 'local', emoji: '🏢', label: 'Local comercial' },
    { value: 'domicilio', emoji: '🏠', label: 'Domicilio' },
    { value: 'almacen', emoji: '📦', label: 'Almacén' },
  ]
  const tiposCaficultor = [
    { value: 'finca', emoji: '🏡', label: 'Finca / Casa' },
    { value: 'agencia', emoji: '🏪', label: 'Agencia courier' },
    { value: 'otro', emoji: '🏢', label: 'Otro' },
  ]
  const tipos = rol === 'buyer_b2b' ? tiposNegocio : tiposCaficultor

  const [tipo, setTipo] = useState(direccion?.tipo ?? tipos[0].value)
  const [nombre, setNombre] = useState(direccion?.nombre ?? '')
  const [dir, setDir] = useState(direccion?.direccion ?? '')
  const [distrito, setDistrito] = useState(direccion?.distrito ?? '')
  const [provincia, setProvincia] = useState(direccion?.provincia ?? '')
  const [dpto, setDpto] = useState(direccion?.departamento ?? 'Lima')
  const [cp, setCp] = useState(direccion?.codigoPostal ?? '')
  const [referencia, setReferencia] = useState(direccion?.referencia ?? '')
  const [telefono, setTelefono] = useState(direccion?.telefono ?? '')
  const [esPrincipal, setEsPrincipal] = useState(direccion?.esPrincipal ?? false)

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8,
    border: '1px solid var(--tw-border)', background: 'var(--tw-card)',
    color: 'var(--tw-text)', fontSize: 13, fontFamily: 'Montserrat, sans-serif',
    outline: 'none', marginBottom: 14,
  }
  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: 'var(--tw-text-muted)', display: 'block',
    marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em',
  }

  function guardar() {
    if (!dir.trim() || !distrito.trim()) return
    onGuardar({
      id: direccion?.id ?? `dir-${Date.now()}`,
      tipo, nombre: nombre.trim(), direccion: dir.trim(),
      distrito: distrito.trim(), provincia: provincia.trim(),
      departamento: dpto, codigoPostal: cp.trim(),
      referencia: referencia.trim(), telefono: telefono.trim(),
      esPrincipal,
    })
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontFamily: 'Montserrat, sans-serif' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--tw-bg)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', padding: '24px 24px 40px' }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--tw-border)', margin: '0 auto 20px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, color: 'var(--tw-text)' }}>
            {esEdicion ? 'Editar dirección' : 'Nueva dirección'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--tw-text-muted)', padding: 0 }}>×</button>
        </div>

        {/* Tipo */}
        <label style={lbl}>Tipo de dirección</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {tipos.map(t => (
            <button key={t.value} type="button" onClick={() => setTipo(t.value)} style={{
              flex: 1, padding: '10px 6px', borderRadius: 10, cursor: 'pointer',
              border: `1px solid ${tipo === t.value ? 'var(--tw-terra)' : 'var(--tw-border)'}`,
              background: tipo === t.value ? 'rgba(201,110,75,0.08)' : 'var(--tw-card)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}>
              <span style={{ fontSize: 20 }}>{t.emoji}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--tw-text)', textAlign: 'center' }}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Nombre referencia */}
        <label style={lbl}>Nombre de referencia</label>
        <input value={nombre} onChange={e => setNombre(e.target.value)} style={inp}
          placeholder={rol === 'seller' ? 'Ej: Finca Vista Hermosa' : 'Ej: Local Miraflores'} />

        {/* Dirección */}
        <label style={lbl}>Dirección *</label>
        <input value={dir} onChange={e => setDir(e.target.value)} style={inp}
          placeholder="Jr. Los Nogales 234, Urb. Los Pinos" />

        {/* Distrito / Provincia */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          <div>
            <label style={lbl}>Distrito *</label>
            <input value={distrito} onChange={e => setDistrito(e.target.value)} style={{ ...inp, marginBottom: 0 }}
              placeholder={rol === 'seller' ? 'Jaén' : 'Miraflores'} />
          </div>
          <div>
            <label style={lbl}>Provincia</label>
            <input value={provincia} onChange={e => setProvincia(e.target.value)} style={{ ...inp, marginBottom: 0 }}
              placeholder={rol === 'seller' ? 'Jaén' : 'Lima'} />
          </div>
        </div>

        {/* Departamento / CP */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 14 }}>
          <div>
            <label style={lbl}>Departamento</label>
            <div style={{ position: 'relative' }}>
              <select value={dpto} onChange={e => setDpto(e.target.value)} style={{ ...inp, marginBottom: 0, appearance: 'none', cursor: 'pointer' }}>
                {DEPARTAMENTOS_PERU.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--tw-text-muted)', pointerEvents: 'none' }}>▾</span>
            </div>
          </div>
          <div>
            <label style={lbl}>Código postal</label>
            <input value={cp} onChange={e => setCp(e.target.value)} style={{ ...inp, marginBottom: 0 }} placeholder="06001 (opcional)" />
          </div>
        </div>

        {/* Referencia adicional */}
        <label style={{ ...lbl, marginTop: 14 }}>Referencia adicional</label>
        <input value={referencia} onChange={e => setReferencia(e.target.value)} style={inp}
          placeholder="A 2 km de la carretera principal, portón verde" />

        {/* Teléfono */}
        <label style={lbl}>Teléfono de contacto</label>
        <input value={telefono} onChange={e => setTelefono(e.target.value)} style={inp}
          placeholder="+51 9XX XXX XXX" type="tel" />

        {/* Toggle principal */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: '1px solid var(--tw-border)', background: 'var(--tw-card)', marginBottom: 20, cursor: 'pointer' }}
          onClick={() => setEsPrincipal(p => !p)}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tw-text)' }}>Establecer como dirección principal</div>
            <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', marginTop: 2 }}>Se usará por defecto en nuevos despachos</div>
          </div>
          <div style={{ width: 36, height: 20, borderRadius: 10, background: esPrincipal ? 'var(--tw-terra)' : 'var(--tw-border)', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
            <div style={{ position: 'absolute', top: 3, left: esPrincipal ? 'calc(100% - 17px)' : 3, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
          </div>
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '13px 0', borderRadius: 10, border: '1px solid var(--tw-border)', background: 'transparent', color: 'var(--tw-text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={guardar} style={{ flex: 2, padding: '13px 0', borderRadius: 10, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {esEdicion ? 'Guardar cambios' : 'Guardar dirección'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModalDireccion
