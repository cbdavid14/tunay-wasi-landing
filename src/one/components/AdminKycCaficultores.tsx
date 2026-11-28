// Admin → KYC Sellers: historial por fecha de lo que aprobó o rechazó el job (y los admins),
// con los criterios de cada revisión y la decisión manual con mensaje de auditoría.
import React, { useCallback, useEffect, useState } from 'react'
import { auth, db } from '@/shared/firebase'
import { cargarKyc, resolverKyc, requiereMensaje, MENSAJE_MINIMO, NOMBRE_PASO, TEXTO_MOTIVO, type EstadoPaso, type ResultadoKyc, type RevisionKyc } from '../kyc'
import type { UsuarioONE } from '../types'

type Filtro = 'TODOS' | ResultadoKyc
const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'TODOS', label: 'Todos' }, { id: 'APROBADO', label: 'Aprobados' },
  { id: 'RECHAZADO', label: 'Rechazados' }, { id: 'PENDIENTE', label: 'En revisión' },
]
const COLOR: Record<ResultadoKyc, string> = { APROBADO: 'var(--tw-sage)', RECHAZADO: '#ef4444', PENDIENTE: '#d97706' }
const ETIQUETA: Record<ResultadoKyc, string> = { APROBADO: 'Aprobado', RECHAZADO: 'Rechazado', PENDIENTE: 'En revisión' }
const ICONO: Record<EstadoPaso, string> = { CUMPLE: '✅', NO_CUMPLE: '❌', PENDIENTE: '⏳', NO_APLICA: '➖', NO_EVALUADO: '▫️', OMITIDO: '⚠️' }
const TEXTO_PASO: Record<EstadoPaso, string> = { CUMPLE: 'Cumple', NO_CUMPLE: 'No cumple', PENDIENTE: 'Pendiente', NO_APLICA: 'No aplica', NO_EVALUADO: 'No evaluado', OMITIDO: 'Omitido (prueba en QA)' }

const caja: React.CSSProperties = { background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 12, padding: '14px 16px', marginBottom: 12 }
const tenue: React.CSSProperties = { margin: '2px 0 0', fontSize: 11, color: 'var(--tw-text-muted)' }

// Fecha local en formato AAAA-MM-DD, igual que el valor del selector de fecha
const dia = (r: RevisionKyc) => r.fecha ? r.fecha.toDate().toLocaleDateString('sv-SE') : ''
const diaLargo = (d: string) => d ? new Date(`${d}T12:00:00`).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Sin fecha'

const Foto: React.FC<{ url?: string; titulo: string }> = ({ url, titulo }) => url ? (
  <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: 'var(--tw-text-faint)' }}>
    <img src={url} alt={titulo} style={{ width: 130, height: 84, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--tw-border)', display: 'block' }} />
    {titulo}
  </a>
) : null

const Decision: React.FC<{
  caficultor: UsuarioONE
  base?: RevisionKyc
  ocupado: boolean
  onDecidir: (resultado: 'APROBADO' | 'RECHAZADO', mensaje: string) => void
}> = ({ caficultor, base, ocupado, onDecidir }) => {
  const [mensaje, setMensaje] = useState('')
  const corto = mensaje.trim().length < MENSAJE_MINIMO
  const boton = (resultado: 'APROBADO' | 'RECHAZADO', label: string) => {
    const bloqueado = ocupado || (requiereMensaje(resultado, base) && corto)
    return (
      <button onClick={() => onDecidir(resultado, mensaje)} disabled={bloqueado}
        style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${COLOR[resultado]}`, background: resultado === 'APROBADO' ? COLOR[resultado] : 'none', color: resultado === 'APROBADO' ? '#fff' : COLOR[resultado], fontSize: 12, fontWeight: 700, cursor: bloqueado ? 'not-allowed' : 'pointer', opacity: bloqueado ? 0.5 : 1 }}>
        {label}
      </button>
    )
  }
  return (
    <div style={{ marginTop: 12, borderTop: '1px solid var(--tw-border)', paddingTop: 12 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--tw-text-muted)', marginBottom: 4 }}>
        {requiereMensaje('APROBADO', base)
          ? `Mensaje de auditoría: explica por qué lo apruebas sin cumplir todos los criterios (mínimo ${MENSAJE_MINIMO} caracteres)`
          : 'Mensaje de auditoría (opcional para aprobar: cumple todos los criterios)'}
      </label>
      <textarea aria-label={`Mensaje de auditoría para ${caficultor.nombre}`} value={mensaje} onChange={e => setMensaje(e.target.value)} rows={2}
        style={{ width: '100%', boxSizing: 'border-box', borderRadius: 8, border: '1px solid var(--tw-border)', background: 'var(--tw-bg)', color: 'var(--tw-text)', padding: 8, fontSize: 12, fontFamily: 'inherit', marginBottom: 8 }} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {boton('APROBADO', 'Aprobar manualmente')}
        {caficultor.estadoKyc !== 'RECHAZADO' && boton('RECHAZADO', 'Rechazar')}
      </div>
    </div>
  )
}

export const AdminKycCaficultores: React.FC<{ onToast: (t: string, tipo?: 'ok' | 'error' | 'info') => void }> = ({ onToast }) => {
  const [revisiones, setRevisiones] = useState<RevisionKyc[]>([])
  const [caficultores, setCaficultores] = useState<UsuarioONE[]>([])
  const [filtro, setFiltro] = useState<Filtro>('TODOS')
  const [fecha, setFecha] = useState('')
  const [loading, setLoading] = useState(true)
  const [accionando, setAccionando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const datos = await cargarKyc(db)
      setRevisiones(datos.revisiones)
      setCaficultores(datos.caficultores)
    } catch (e) {
      console.error(e)
      onToast('No se pudo cargar la validación de caficultores', 'error')
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { cargar() }, [cargar])

  async function decidir(caficultor: UsuarioONE, base: RevisionKyc | undefined, resultado: 'APROBADO' | 'RECHAZADO', mensaje: string) {
    const admin = auth.currentUser
    if (!admin?.email) { onToast('Inicia sesión como admin', 'error'); return }
    setAccionando(caficultor.uid)
    try {
      await resolverKyc(db, { caficultor, resultado, mensaje, base, admin: { uid: admin.uid, email: admin.email } })
      onToast(resultado === 'APROBADO' ? 'Caficultor aprobado y registrado' : 'Rechazo registrado', resultado === 'APROBADO' ? 'ok' : 'info')
      await cargar()
    } catch (e) {
      console.error(e)
      onToast('No se pudo guardar la decisión', 'error')
    } finally {
      setAccionando(null)
    }
  }

  const porUid = new Map(caficultores.map(c => [c.uid, c]))
  const ultima = new Map<string, RevisionKyc>()
  for (const r of revisiones) if (!ultima.has(r.uid)) ultima.set(r.uid, r)   // vienen de la más nueva a la más antigua
  const sinRevision = caficultores.filter(c => c.estadoKyc === 'PENDING_REVIEW' && !ultima.has(c.uid))
  const visibles = revisiones.filter(r => (filtro === 'TODOS' || r.resultado === filtro) && (!fecha || dia(r) === fecha))
  const dias = [...new Set(visibles.map(dia))]

  const fotos = (c?: UsuarioONE) => c && (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
      <Foto url={c.fotoDniUrl} titulo="Foto DNI" />
      <Foto url={c.fotoSelfieUrl} titulo="Selfie con DNI" />
    </div>
  )
  const datos = (c?: UsuarioONE) => c?.caficultor && (
    <p style={tenue}>
      DNI: {c.caficultor.dni ?? '—'} · Modalidad: {c.caficultor.tipoRegistroCaficultor ?? '—'}
      {c.caficultor.ruc ? ` · RUC: ${c.caficultor.ruc}` : ''}
      {c.caficultor.rucCooperativa ? ` · RUC cooperativa: ${c.caficultor.rucCooperativa}` : ''}
      {` · CCI: ${c.caficultor.cci ?? '—'}`}{c.email ? ` · ${c.email}` : ''}
    </p>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, color: 'var(--tw-text-muted)', letterSpacing: '.1em', textTransform: 'uppercase' }}>Verificación de identidad</p>
          <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif' }}>KYC Caficultores</p>
        </div>
        <button onClick={cargar} aria-label="Actualizar" style={{ background: 'none', border: '1px solid var(--tw-border)', color: 'var(--tw-text-muted)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>↻</button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        {FILTROS.map(f => (
          <button key={f.id} onClick={() => setFiltro(f.id)} aria-pressed={filtro === f.id}
            style={{ padding: '6px 12px', borderRadius: 99, fontSize: 12, cursor: 'pointer', border: '1px solid var(--tw-border)', background: filtro === f.id ? 'var(--tw-terra)' : 'none', color: filtro === f.id ? '#fff' : 'var(--tw-text-muted)' }}>
            {f.label}
          </button>
        ))}
        <input type="date" aria-label="Filtrar por fecha" value={fecha} onChange={e => setFecha(e.target.value)}
          style={{ padding: '5px 8px', borderRadius: 8, border: '1px solid var(--tw-border)', background: 'var(--tw-bg)', color: 'var(--tw-text)', fontSize: 12 }} />
        {fecha && <button onClick={() => setFecha('')} style={{ background: 'none', border: 'none', color: 'var(--tw-text-muted)', cursor: 'pointer', fontSize: 12 }}>Quitar fecha</button>}
      </div>

      {loading && <p style={{ color: 'var(--tw-text-muted)', fontSize: 13 }}>Cargando...</p>}

      {!loading && !fecha && (filtro === 'TODOS' || filtro === 'PENDIENTE') && sinRevision.length > 0 && (
        <section>
          <h3 style={{ fontSize: 13, color: 'var(--tw-text)' }}>Esperando la revisión automática ({sinRevision.length})</h3>
          {sinRevision.map(c => (
            <article key={c.uid} style={caja} data-uid={c.uid}>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--tw-text)', fontSize: 14 }}>{c.nombre}</p>
              {datos(c)}
              {fotos(c)}
              <Decision caficultor={c} ocupado={accionando === c.uid} onDecidir={(r, m) => decidir(c, undefined, r, m)} />
            </article>
          ))}
        </section>
      )}

      {!loading && visibles.length === 0 && (
        <p style={{ color: 'var(--tw-text-muted)', fontSize: 13 }}>No hay revisiones registradas con este filtro.</p>
      )}

      {!loading && dias.map(d => (
        <section key={d}>
          <h3 style={{ fontSize: 13, color: 'var(--tw-text)', textTransform: 'capitalize' }}>{diaLargo(d)}</h3>
          {visibles.filter(r => dia(r) === d).map(r => {
            const c = porUid.get(r.uid)
            const vigente = ultima.get(r.uid)?.id === r.id
            return (
              <article key={r.id} style={caja} data-uid={r.uid}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--tw-text)', fontSize: 14 }}>{r.nombre || c?.nombre}</p>
                    {datos(c)}
                    <p style={tenue}>
                      {r.fecha?.toDate().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })} · {r.origen === 'JOB' ? 'Revisión automática' : `Admin: ${r.adminEmail}`}
                      {r.rostroOmitido ? ' · ⚠️ Sin verificación facial (prueba)' : ''}
                      {typeof r.similitud === 'number' ? ` · Parecido del rostro: ${r.similitud.toFixed(1)}%` : ''}
                      {!vigente ? ' · Reemplazada por una revisión posterior' : ''}
                    </p>
                  </div>
                  <span style={{ alignSelf: 'flex-start', padding: '3px 10px', borderRadius: 99, border: `1px solid ${COLOR[r.resultado]}`, color: COLOR[r.resultado], fontSize: 11, fontWeight: 700 }}>{ETIQUETA[r.resultado]}</span>
                </div>
                {r.pasos.length > 0 && (
                  <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0' }}>
                    {r.pasos.map(p => (
                      <li key={p.id} style={{ fontSize: 12, color: 'var(--tw-text)', marginBottom: 3 }}>
                        <span aria-hidden="true">{ICONO[p.estado]}</span> {NOMBRE_PASO[p.id] ?? p.id}: {TEXTO_PASO[p.estado]}
                        {p.motivos.map(m => <span key={m} style={{ display: 'block', marginLeft: 22, color: 'var(--tw-text-muted)' }}>{TEXTO_MOTIVO[m] ?? m}</span>)}
                      </li>
                    ))}
                  </ul>
                )}
                {r.mensaje && <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--tw-text)', borderLeft: `3px solid ${COLOR[r.resultado]}`, paddingLeft: 8 }}>“{r.mensaje}”</p>}
                {vigente && c && c.estadoKyc !== 'ACTIVO' && (
                  <>
                    {fotos(c)}
                    <Decision caficultor={c} base={r} ocupado={accionando === c.uid} onDecidir={(res, m) => decidir(c, r, res, m)} />
                  </>
                )}
              </article>
            )
          })}
        </section>
      ))}
    </div>
  )
}
