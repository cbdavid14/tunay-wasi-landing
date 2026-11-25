/**
 * ChatPedido.tsx — Chat entre emprendedor y caficultor dentro de un pedido
 */
import React, { useEffect, useRef, useState } from 'react'
import { fetchMensajesByPedido, sendMensaje } from '../service'
import { demoFetchMensajesByPedido, demoSendMensaje } from '../demoService'
import type { AutorMensajeONE, MensajePedidoONE } from '../types'

const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`
const CLOUDINARY_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

function formatHora(iso: string): string {
  try { return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
}

function formatFecha(iso: string): string {
  try { return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) }
  catch { return '' }
}

interface Props {
  pedidoId: string
  caficultorId?: string
  caficultorNombre?: string
  usuarioId: string
  usuarioNombre: string
  usuarioRol: AutorMensajeONE
  isDemo: boolean
  codigoTracking?: string
}

const ChatPedido: React.FC<Props> = ({
  pedidoId, caficultorId, caficultorNombre,
  usuarioId, usuarioNombre, usuarioRol, isDemo, codigoTracking,
}) => {
  const [mensajes, setMensajes] = useState<MensajePedidoONE[]>([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [imagenPreview, setImagenPreview] = useState<string | null>(null)   // data URL local
  const [imagenFile, setImagenFile] = useState<File | null>(null)
  const [subiendoImg, setSubiendoImg] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let activo = true
    async function cargar() {
      setCargando(true)
      try {
        const msgs = isDemo
          ? await demoFetchMensajesByPedido(pedidoId)
          : await fetchMensajesByPedido(pedidoId, caficultorId)
        if (activo) setMensajes(msgs)
      } catch { /* silencioso */ } finally {
        if (activo) setCargando(false)
      }
    }
    cargar()
    return () => { activo = false }
  }, [pedidoId, caficultorId, isDemo])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImagenFile(file)
    const reader = new FileReader()
    reader.onload = ev => setImagenPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function quitarImagen() {
    setImagenFile(null)
    setImagenPreview(null)
  }

  async function subirImagen(file: File): Promise<string> {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('upload_preset', CLOUDINARY_PRESET)
    const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: fd })
    const data = await res.json()
    if (!data.secure_url) throw new Error('Error subiendo imagen')
    return data.secure_url as string
  }

  async function enviar() {
    const t = texto.trim()
    if ((!t && !imagenFile) || enviando) return
    setEnviando(true)
    setTexto('')
    const fileToUpload = imagenFile
    setImagenFile(null)
    setImagenPreview(null)
    try {
      let imageUrl: string | undefined
      if (fileToUpload) {
        setSubiendoImg(true)
        imageUrl = isDemo ? imagenPreview ?? undefined : await subirImagen(fileToUpload)
        setSubiendoImg(false)
      }
      const input = {
        pedidoId, caficultorId,
        autorId: usuarioId, autorNombre: usuarioNombre, autorRol: usuarioRol,
        texto: t || '',
        imageUrl,
      }
      if (isDemo) await demoSendMensaje(input)
      else await sendMensaje(input)
      const msgs = isDemo
        ? await demoFetchMensajesByPedido(pedidoId)
        : await fetchMensajesByPedido(pedidoId, caficultorId)
      setMensajes(msgs)
    } catch { /* silencioso */ } finally {
      setEnviando(false)
      setSubiendoImg(false)
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  // Agrupar mensajes por fecha
  const grupos: { fecha: string; msgs: MensajePedidoONE[] }[] = []
  for (const m of mensajes) {
    const fecha = formatFecha(m.createdAt)
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.fecha === fecha) ultimo.msgs.push(m)
    else grupos.push({ fecha, msgs: [m] })
  }

  const puedeEnviar = (texto.trim().length > 0 || !!imagenFile) && !enviando

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--tw-bg)', borderRadius: 12, border: '1px solid var(--tw-border)', overflow: 'hidden', height: 380 }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', background: 'var(--tw-card)', borderBottom: '1px solid var(--tw-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14 }}>💬</span>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif' }}>
          {caficultorNombre ? `Chat con ${caficultorNombre}` : 'Chat del pedido'}
        </p>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif' }}>
          Solo visible entre tú y el {usuarioRol === 'buyer_b2b' ? 'caficultor' : 'comprador'}
        </span>
      </div>

      {/* Mensajes */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 2, scrollbarWidth: 'thin' }}>
        {codigoTracking && (
          <div style={{ alignSelf: 'center', padding: '6px 14px', borderRadius: 20, background: '#1a2a1a', border: '1px solid var(--tw-sage)44', margin: '4px 0 8px' }}>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--tw-sage)', fontFamily: 'Montserrat, sans-serif', textAlign: 'center' }}>
              📦 Código de seguimiento: <strong>{codigoTracking}</strong>
            </p>
          </div>
        )}

        {cargando && <p style={{ margin: 'auto', fontSize: 12, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif' }}>Cargando mensajes...</p>}

        {!cargando && mensajes.length === 0 && !codigoTracking && (
          <div style={{ margin: 'auto', textAlign: 'center' }}>
            <p style={{ fontSize: 22, margin: '0 0 6px' }}>💬</p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif' }}>Sin mensajes aún</p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif' }}>Usa el chat para coordinar el despacho o resolver dudas</p>
          </div>
        )}

        {grupos.map(grupo => (
          <React.Fragment key={grupo.fecha}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 4px' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--tw-border)' }} />
              <span style={{ fontSize: 10, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif', whiteSpace: 'nowrap' }}>{grupo.fecha}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--tw-border)' }} />
            </div>

            {grupo.msgs.map((m, i) => {
              const esMio = m.autorId === usuarioId
              const esTracking = m.tipo === 'tracking'
              const mismoAutorPrev = i > 0 && grupo.msgs[i - 1].autorId === m.autorId

              if (esTracking) return (
                <div key={m.id} style={{ alignSelf: 'center', padding: '6px 14px', borderRadius: 20, background: '#1a2a1a', border: '1px solid var(--tw-sage)44', margin: '4px 0' }}>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--tw-sage)', fontFamily: 'Montserrat, sans-serif' }}>📦 {m.texto}</p>
                </div>
              )

              return (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: esMio ? 'flex-end' : 'flex-start', marginTop: mismoAutorPrev ? 2 : 8 }}>
                  {!mismoAutorPrev && !esMio && (
                    <p style={{ margin: '0 0 2px 10px', fontSize: 10, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif' }}>{m.autorNombre}</p>
                  )}
                  <div style={{ maxWidth: '78%', borderRadius: esMio ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: esMio ? 'var(--tw-terra)' : '#1e1e1e', border: esMio ? 'none' : '1px solid var(--tw-border)', overflow: 'hidden' }}>
                    {/* Imagen si existe */}
                    {m.imageUrl && (
                      <a href={m.imageUrl} target="_blank" rel="noopener noreferrer">
                        <img src={m.imageUrl} alt="adjunto" style={{ display: 'block', maxWidth: 220, maxHeight: 180, width: '100%', objectFit: 'cover' }} />
                      </a>
                    )}
                    {/* Texto si existe */}
                    {m.texto && (
                      <p style={{ margin: 0, padding: '8px 12px', fontSize: 13, color: esMio ? 'var(--tw-text-inverse)' : 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif', lineHeight: 1.5, wordBreak: 'break-word' }}>
                        {m.texto}
                      </p>
                    )}
                  </div>
                  <p style={{ margin: '2px 6px 0', fontSize: 9, color: 'var(--tw-text-faint)', fontFamily: 'Montserrat, sans-serif' }}>{formatHora(m.createdAt)}</p>
                </div>
              )
            })}
          </React.Fragment>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Preview imagen antes de enviar */}
      {imagenPreview && (
        <div style={{ padding: '8px 12px', background: 'var(--tw-card)', borderTop: '1px solid var(--tw-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img src={imagenPreview} alt="preview" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--tw-border)' }} />
            <button onClick={quitarImagen} style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', border: 'none', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
          </div>
          <span style={{ fontSize: 11, color: 'var(--tw-text-muted)', fontFamily: 'Montserrat, sans-serif' }}>Imagen lista para enviar</span>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '10px 12px', background: 'var(--tw-card)', borderTop: '1px solid var(--tw-border)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onPickImage} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={enviando}
          title="Adjuntar imagen"
          style={{ padding: '9px 10px', borderRadius: 10, border: '1px solid var(--tw-border)', background: 'transparent', color: 'var(--tw-text-muted)', fontSize: 16, cursor: enviando ? 'not-allowed' : 'pointer', flexShrink: 0, lineHeight: 1 }}
        >
          📎
        </button>
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={onKey}
          placeholder="Escribe un mensaje... (Enter para enviar)"
          rows={1}
          style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1px solid var(--tw-border)', background: '#0a0a0a', color: 'var(--tw-text)', fontSize: 13, fontFamily: 'Montserrat, sans-serif', outline: 'none', resize: 'none', lineHeight: 1.5, maxHeight: 80, overflowY: 'auto' }}
          maxLength={500}
        />
        <button
          onClick={enviar}
          disabled={!puedeEnviar}
          style={{ padding: '9px 16px', borderRadius: 10, border: 'none', background: puedeEnviar ? 'var(--tw-terra)' : '#1e1e1e', color: puedeEnviar ? 'var(--tw-text-inverse)' : 'var(--tw-text-faint)', fontSize: 13, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', cursor: puedeEnviar ? 'pointer' : 'not-allowed', flexShrink: 0, transition: 'background 0.15s' }}
        >
          {subiendoImg ? '⏳' : enviando ? '...' : '→'}
        </button>
      </div>
    </div>
  )
}

export default ChatPedido
