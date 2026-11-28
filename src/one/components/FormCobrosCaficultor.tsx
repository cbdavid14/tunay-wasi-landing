// Portal del caficultor → Cobros. ESC-06: el CCI propio es obligatorio para cobrar (no para el alta).
import React, { useEffect, useState } from 'react'
import { fetchUsuario, updateCaficultor } from '../service'
import { esCciValido, normalizarCci } from '../documentos'

const BANCOS = ['BCP', 'Interbank', 'BBVA', 'Scotiabank', 'BanBif', 'Caja Cusco', 'Caja Piura']
const VACIO = { cci: '', numeroYape: '', banco: '', numeroCuenta: '' }

export const FormCobrosCaficultor: React.FC<{
  caficultorId: string
  esCooperativa: boolean
  isDemo?: boolean
  onToast: (t: string, tipo?: 'ok' | 'error' | 'info') => void
  inputStyle: React.CSSProperties
  fieldLabel: React.CSSProperties
  sectionTitle: React.CSSProperties
}> = ({ caficultorId, esCooperativa, isDemo = false, onToast, inputStyle, fieldLabel, sectionTitle }) => {
  const [datos, setDatos] = useState(VACIO)
  const [guardado, setGuardado] = useState(VACIO)
  const [listo, setListo] = useState(isDemo)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (isDemo) return
    let vigente = true
    fetchUsuario(caficultorId).then(u => {
      const c = u.caficultor
      const actual = { cci: c?.cci ?? '', numeroYape: c?.numeroYape ?? '', banco: c?.banco ?? '', numeroCuenta: c?.numeroCuenta ?? '' }
      if (vigente) { setDatos(actual); setGuardado(actual); setListo(true) }
    }).catch(() => onToast('No se pudieron cargar tus datos de cobro', 'error'))
    return () => { vigente = false }
  }, [caficultorId, isDemo]) // eslint-disable-line react-hooks/exhaustive-deps

  const cambiar = (campo: keyof typeof VACIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDatos(d => ({ ...d, [campo]: e.target.value }))

  async function guardar() {
    if (!esCciValido(datos.cci)) { onToast('El CCI debe tener 20 dígitos', 'error'); return }
    const nuevo = { cci: normalizarCci(datos.cci), numeroYape: esCooperativa ? '' : datos.numeroYape.trim(), banco: datos.banco, numeroCuenta: datos.numeroCuenta.trim() }
    setGuardando(true)
    try {
      if (!isDemo) await updateCaficultor(caficultorId, nuevo)
      setDatos(nuevo); setGuardado(nuevo)
      onToast('Datos de cobro guardados', 'ok')
    } catch {
      onToast('No se pudieron guardar tus datos de cobro', 'error')
    } finally {
      setGuardando(false)
    }
  }

  const campo = { marginBottom: 10 }
  return (
    <div style={{ flex: 1, maxWidth: 520, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={sectionTitle}>💳 Cobros</div>
        {listo && !guardado.cci && (
          <div role="alert" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid rgba(201,110,75,.4)', background: 'rgba(201,110,75,.08)', fontSize: 11, color: 'var(--tw-terra)', marginBottom: 12 }}>
            Aún no registraste tu CCI. Sin él no podemos pagarte tus ventas.
          </div>
        )}
        <div style={campo}>
          <label style={fieldLabel} htmlFor="cobro-cci">CCI de tu cuenta <span style={{ color: 'var(--tw-terra)' }}>*</span></label>
          <input id="cobro-cci" style={inputStyle} inputMode="numeric" disabled={!listo} value={datos.cci} onChange={cambiar('cci')} placeholder="00219100XXXXXXXXXX25" />
          <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', marginTop: 4 }}>Cuenta a tu nombre, 20 dígitos.</div>
        </div>
        {!esCooperativa && (
          <div style={campo}>
            <label style={fieldLabel} htmlFor="cobro-yape">Número Yape (opcional)</label>
            <input id="cobro-yape" style={inputStyle} type="tel" disabled={!listo} value={datos.numeroYape} onChange={cambiar('numeroYape')} placeholder="+51 9XX XXX XXX" />
          </div>
        )}
        <div style={campo}>
          <label style={fieldLabel} htmlFor="cobro-banco">Banco (opcional)</label>
          <select id="cobro-banco" style={{ ...inputStyle, cursor: 'pointer' }} disabled={!listo} value={datos.banco} onChange={cambiar('banco')}>
            <option value="">Seleccionar banco</option>
            {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div style={campo}>
          <label style={fieldLabel} htmlFor="cobro-cuenta">Número de cuenta (opcional)</label>
          <input id="cobro-cuenta" style={inputStyle} disabled={!listo} value={datos.numeroCuenta} onChange={cambiar('numeroCuenta')} placeholder="191-XXXXXXXXX-X-XX" />
        </div>
        <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', marginBottom: 16 }}>TunayWasi envía los pagos confirmados a tu CCI dentro de las 24h.</div>
      </div>
      <div style={{ padding: '8px 10px', background: 'rgba(143,175,138,.06)', border: '1px solid rgba(143,175,138,.15)', borderRadius: 7, fontSize: 10, color: 'var(--tw-sage)', marginBottom: 20 }}>
        🚚 La configuración de envíos (origen, agencias, tarifas) se gestiona en la pestaña <strong>Envíos</strong>.
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={() => setDatos(guardado)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--tw-border)', background: 'transparent', color: 'var(--tw-text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Cancelar</button>
        <button onClick={guardar} disabled={!listo || guardando} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--tw-sage)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: !listo || guardando ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Guardar cambios</button>
      </div>
    </div>
  )
}
