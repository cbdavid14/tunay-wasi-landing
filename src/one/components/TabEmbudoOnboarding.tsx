// Admin · Embudo de registro (iter.16)
// ¿En qué paso se queda cada usuario del onboarding? Datos de `one_analytics` (eventos sin PII)
// y `one_onboarding_incompletos` (Lambda diaria: cuentas Auth sin perfil).
import React, { useEffect, useMemo, useState } from 'react'
import {
  agruparIntentos, calcularEmbudo, fetchCuentasIncompletas, fetchEventosOnboarding,
  type CuentaIncompleta, type Desglose, type Intento,
} from '../onboardingAdmin'

const ETIQUETA_PASO: Record<string, string> = {
  bienvenida: 'Bienvenida', email_login: 'Login con email', quien_eres: '¿Quién eres?', selector_tipo: 'Persona / Negocio',
  cuenta: 'Cuenta', identidad: 'Identidad (DNI)', empresa: 'Empresa (RUC)', finca: 'Finca', revision: 'Revisión', confirmacion: 'Confirmación',
}
const ETIQUETA_ERROR: Record<string, string> = {
  dni_duplicado: 'DNI duplicado', ruc_duplicado: 'RUC duplicado', email_en_uso: 'Email ya registrado', credenciales: 'Credenciales',
  google_cancelado: 'Google cancelado', red: 'Red', validacion: 'Validación', otro: 'Otro',
}
const ETIQUETA_PUERTA: Record<string, string> = {
  P1: 'P1 · Bienvenida', P2: 'P2 · ¿Quién eres?', P3: 'P3 · Registro persona', directo: 'Registro directo (negocio/caficultor)',
}

const card: React.CSSProperties = { background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 12, padding: 16 }
const th: React.CSSProperties = { textAlign: 'left', fontSize: 11, color: 'var(--tw-text-muted)', fontWeight: 700, padding: '6px 8px', borderBottom: '1px solid var(--tw-border)' }
const td: React.CSSProperties = { fontSize: 12, color: 'var(--tw-text)', padding: '6px 8px', borderBottom: '1px solid var(--tw-border)' }

const Chip: React.FC<{ activo: boolean; onClick: () => void; children: React.ReactNode }> = ({ activo, onClick, children }) => (
  <button onClick={onClick} style={{
    padding: '5px 12px', borderRadius: 16, fontSize: 12, cursor: 'pointer', fontWeight: 600,
    border: `1px solid ${activo ? 'var(--tw-terra)' : 'var(--tw-border)'}`,
    background: activo ? 'var(--tw-terra)' : 'transparent', color: activo ? '#fff' : 'var(--tw-text-muted)',
  }}>{children}</button>
)

const Barra: React.FC<{ pct: number; color?: string }> = ({ pct, color = 'var(--tw-terra)' }) => (
  <div style={{ background: 'var(--tw-border)', borderRadius: 4, height: 8, width: '100%' }}>
    <div style={{ width: `${Math.max(2, pct)}%`, background: color, height: 8, borderRadius: 4 }} />
  </div>
)

const TablaDesglose: React.FC<{ titulo: string; filas: Desglose[]; etiqueta?: (k: string) => string }> = ({ titulo, filas, etiqueta }) => (
  <div style={card}>
    <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, color: 'var(--tw-text)' }}>{titulo}</p>
    {filas.length === 0 ? <p style={{ fontSize: 12, color: 'var(--tw-text-muted)', margin: 0 }}>Sin datos</p> : (
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th style={th}></th><th style={th}>Inician</th><th style={th}>Completan</th><th style={th}>Conv.</th></tr></thead>
        <tbody>{filas.map(f => (
          <tr key={f.clave}>
            <td style={td}>{etiqueta ? etiqueta(f.clave) : f.clave}</td>
            <td style={td}>{f.iniciados}</td><td style={td}>{f.completados}</td><td style={td}><b>{f.pct}%</b></td>
          </tr>
        ))}</tbody>
      </table>
    )}
  </div>
)

const TabEmbudoOnboarding: React.FC<{ isDemo: boolean; onToast: (t: string, tipo?: 'ok' | 'error' | 'info') => void }> = ({ isDemo, onToast }) => {
  const [dias, setDias] = useState(30)
  const [flujo, setFlujo] = useState<'todos' | 'b2c' | 'b2b' | 'caficultor'>('b2c')
  const [intentos, setIntentos] = useState<Intento[]>([])
  const [incompletos, setIncompletos] = useState<CuentaIncompleta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemo) { setLoading(false); return }   // SEC-17: el modo demo no debe leer datos reales
    let vivo = true
    setLoading(true)
    Promise.all([
      fetchEventosOnboarding(dias),
      fetchCuentasIncompletas().catch(() => [] as CuentaIncompleta[]),
    ]).then(([eventos, inc]) => {
      if (!vivo) return
      setIntentos(agruparIntentos(eventos))
      setIncompletos(inc)
    }).catch(() => onToast('No se pudo cargar el embudo (¿admin con email verificado?)', 'error'))
      .finally(() => { if (vivo) setLoading(false) })
    return () => { vivo = false }
  }, [dias, isDemo]) // eslint-disable-line react-hooks/exhaustive-deps

  const r = useMemo(() => calcularEmbudo(intentos, flujo), [intentos, flujo])

  if (isDemo) return <p style={{ color: 'var(--tw-text-muted)', fontSize: 13 }}>El embudo de registro no está disponible en modo demo.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, color: 'var(--tw-text)' }}>Embudo de registro</h2>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--tw-text-muted)' }}>
          En qué paso se queda cada intento de registro. Un intento = una visita al onboarding (también anónima).
        </p>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[7, 30, 90].map(d => <Chip key={d} activo={dias === d} onClick={() => setDias(d)}>{d} días</Chip>)}
        <span style={{ width: 12 }} />
        {(['b2c', 'b2b', 'caficultor', 'todos'] as const).map(f => (
          <Chip key={f} activo={flujo === f} onClick={() => setFlujo(f)}>
            {f === 'b2c' ? 'Persona' : f === 'b2b' ? 'Negocio' : f === 'caficultor' ? 'Caficultor' : 'Todos'}
          </Chip>
        ))}
      </div>

      {loading ? <p style={{ fontSize: 13, color: 'var(--tw-text-muted)' }}>Cargando…</p> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              ['Intentos', r.intentos],
              ['Cuentas creadas', r.completados],
              ['Conversión', `${r.conversionPct}%`],
              ['Cuentas sin perfil', incompletos.length],
            ].map(([k, v]) => (
              <div key={String(k)} style={card}>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--tw-text-muted)' }}>{k}</p>
                <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700, color: 'var(--tw-text)' }}>{v}</p>
              </div>
            ))}
          </div>

          <div style={card}>
            <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 13, color: 'var(--tw-text)' }}>Pasos alcanzados</p>
            {r.embudo.length === 0 ? <p style={{ fontSize: 12, color: 'var(--tw-text-muted)', margin: 0 }}>Aún no hay eventos en este periodo.</p> :
              r.embudo.map(f => (
                <div key={f.paso} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 90px', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--tw-text)' }}>{ETIQUETA_PASO[f.paso] ?? f.paso}</span>
                  <Barra pct={f.pct} color={f.paso === 'confirmacion' ? 'var(--tw-sage)' : undefined} />
                  <span style={{ fontSize: 12, color: 'var(--tw-text-muted)', textAlign: 'right' }}>{f.llegaron} · {f.pct}%</span>
                </div>
              ))}
            <p style={{ margin: '8px 0 0', fontSize: 10, color: 'var(--tw-text-muted)' }}>
              P2 y P3 empiezan después de la bienvenida, por eso un paso posterior puede tener más intentos que uno anterior.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
            <div style={card}>
              <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, color: 'var(--tw-text)' }}>¿Dónde se quedan? (último paso sin completar)</p>
              {r.abandonos.length === 0 ? <p style={{ fontSize: 12, color: 'var(--tw-text-muted)', margin: 0 }}>Sin abandonos</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>{r.abandonos.map(a => (
                    <tr key={a.paso}><td style={td}>{ETIQUETA_PASO[a.paso] ?? a.paso}</td><td style={td}>{a.cantidad}</td><td style={td}><b>{a.pct}%</b></td></tr>
                  ))}</tbody>
                </table>
              )}
            </div>
            <div style={card}>
              <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, color: 'var(--tw-text)' }}>Errores mostrados al usuario</p>
              {r.errores.length === 0 ? <p style={{ fontSize: 12, color: 'var(--tw-text-muted)', margin: 0 }}>Sin errores</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr><th style={th}>Error</th><th style={th}>Paso</th><th style={th}>Veces</th></tr></thead>
                  <tbody>{r.errores.map(e => (
                    <tr key={`${e.codigo}|${e.paso}`}><td style={td}>{ETIQUETA_ERROR[e.codigo] ?? e.codigo}</td><td style={td}>{ETIQUETA_PASO[e.paso] ?? e.paso}</td><td style={td}>{e.cantidad}</td></tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            <TablaDesglose titulo="Por puerta de entrada" filas={r.porPuerta} etiqueta={k => ETIQUETA_PUERTA[k] ?? k} />
            <TablaDesglose titulo="Por origen (de dónde venía)" filas={r.porOrigen} />
            <TablaDesglose titulo="Por método" filas={r.porMetodo} etiqueta={k => (k === 'google' ? 'Google' : 'Email')} />
            <TablaDesglose titulo="Por dispositivo" filas={r.porDispositivo} />
          </div>

          <div style={card}>
            <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 13, color: 'var(--tw-text)' }}>Cuentas creadas sin completar el perfil</p>
            <p style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--tw-text-muted)' }}>
              Existen en Firebase Auth pero no en <code>one_usuarios</code> (p. ej. entraron con Google y abandonaron en "¿Quién eres?"). Lo actualiza a diario la Lambda <code>onboarding-incompletos</code>.
            </p>
            {incompletos.length === 0 ? <p style={{ fontSize: 12, color: 'var(--tw-text-muted)', margin: 0 }}>Ninguna (o la Lambda aún no se ha ejecutado).</p> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr><th style={th}>Email</th><th style={th}>Nombre</th><th style={th}>Método</th><th style={th}>Alta hace</th><th style={th}>Último acceso</th></tr></thead>
                  <tbody>{incompletos.map(c => (
                    <tr key={c.uid}>
                      <td style={td}>{c.email ?? '—'}{c.emailVerificado ? ' ✓' : ''}</td>
                      <td style={td}>{c.nombre ?? '—'}</td>
                      <td style={td}>{c.proveedor === 'google.com' ? 'Google' : 'Email'}</td>
                      <td style={td}>{c.diasDesdeAlta} d</td>
                      <td style={td}>{c.ultimoAccesoAt ? c.ultimoAccesoAt.slice(0, 10) : '—'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default TabEmbudoOnboarding
