import React, { useState, useRef, useEffect } from 'react'

interface Msg {
  from: 'user' | 'wasi'
  text: string
  chips?: string[]
  productos?: { nombre: string; caficultor: string; precio: string; proceso: string }[]
}

type Rol = 'buyer_b2c' | 'buyer_b2b' | 'seller' | null

const SUGERENCIAS_NEGOCIO = [
  'Busco un gesha de Cajamarca',
  'Quiero café natural bajo S/ 40',
  'Dame opciones honey con SCA +85',
  'Recomiendo para espresso',
  '¿Qué hay de Puno?',
]

const SUGERENCIAS_CAFICULTOR = [
  '¿Cómo subo mi precio?',
  'Mis ventas este mes',
  'Cuándo me pagan',
  'Ayuda para describir mi café',
  'Consejos para más ventas',
]

const RESPUESTAS_NEGOCIO: Record<string, Msg> = {
  default: {
    from: 'wasi',
    text: 'Encontré varias opciones para ti. Te recomiendo empezar por los geshas de Cajamarca — son los más pedidos esta semana. ¿Quieres que filtre por proceso?',
    chips: ['Lavado', 'Natural', 'Honey', 'Ver todos'],
  },
  gesha: {
    from: 'wasi',
    text: 'Encontré 3 Gesha disponibles ahora mismo:',
    productos: [
      { nombre: 'Gesha Lavado — Finca La Esperanza', caficultor: 'Ana Torres · Cajamarca', precio: 'S/ 48/kg', proceso: 'Lavado' },
      { nombre: 'Gesha Washed Lote A', caficultor: 'Jorge Quispe · Amazonas', precio: 'S/ 52/kg', proceso: 'Lavado' },
      { nombre: 'Gesha Natural 2025', caficultor: 'María Condori · Cusco', precio: 'S/ 56/kg', proceso: 'Natural' },
    ],
    chips: ['Agregar Ana Torres al carrito', 'Ver perfil de Ana Torres', 'Buscar otra variedad'],
  },
  natural: {
    from: 'wasi',
    text: 'Tengo 5 naturales en catálogo. Los más económicos son de Puno y Cusco, entre S/ 32 y S/ 42. ¿Alguna región preferida?',
    chips: ['Puno', 'Cusco', 'Cajamarca', 'Sin preferencia'],
  },
  puno: {
    from: 'wasi',
    text: 'Puno tiene 2 productores activos esta temporada. Pedro Huanca tiene stock de Typica Honey a S/ 42/kg con SCA 84.5.',
    chips: ['Agregar al carrito', 'Ver perfil de Pedro', 'Otra región'],
  },
}

const RESPUESTAS_CAFICULTOR: Record<string, Msg> = {
  default: {
    from: 'wasi',
    text: 'Puedo ayudarte con tus ventas, precios, descripción de tus cafés o responder dudas sobre la plataforma. ¿Por dónde empezamos?',
    chips: ['Ver mis ventas', 'Ayuda con mi precio', 'Describir mi café', 'Cuándo me pagan'],
  },
  ventas: {
    from: 'wasi',
    text: 'Este mes llevas S/ 456 en pedidos confirmados. Tienes 3 pedidos activos y 1 por confirmar. Tu calificación promedio es 4.8 ⭐.',
    chips: ['Ver pedidos activos', 'Comparar con mes anterior', 'Consejos para vender más'],
  },
  precio: {
    from: 'wasi',
    text: 'Tu Gesha Lavado está a S/ 48/kg. El promedio de Geshas en la plataforma es S/ 51/kg. Podrías subir S/ 3 sin perder competitividad.',
    chips: ['Actualizar precio', 'Ver precios del catálogo', 'Dejar igual'],
  },
  pago: {
    from: 'wasi',
    text: 'Los pagos se liberan 48h después de que el comprador confirma la entrega. Tu próxima liberación estimada es el martes 18 de noviembre.',
    chips: ['Ver historial de pagos', 'Entiendo, gracias'],
  },
  descripcion: {
    from: 'wasi',
    text: 'Una buena descripción menciona: origen, proceso, altitud y notas de sabor. Ejemplo: "Typica lavado de 1,800 msnm en Jaén. Fermentación en tinas por 36h. Notas de chocolate y mandarina."',
    chips: ['Editar mi producto', 'Ver más ejemplos'],
  },
}

function matchRespuesta(text: string, rol: Rol): Msg {
  const t = text.toLowerCase()
  if (rol === 'buyer_b2b' || rol === 'buyer_b2c') {
    if (t.includes('gesha') || t.includes('geisha')) return RESPUESTAS_NEGOCIO.gesha
    if (t.includes('natural')) return RESPUESTAS_NEGOCIO.natural
    if (t.includes('puno')) return RESPUESTAS_NEGOCIO.puno
    return RESPUESTAS_NEGOCIO.default
  } else {
    if (t.includes('venta') || t.includes('mes') || t.includes('cobr')) return RESPUESTAS_CAFICULTOR.ventas
    if (t.includes('precio') || t.includes('cuánto') || t.includes('subir')) return RESPUESTAS_CAFICULTOR.precio
    if (t.includes('pag') || t.includes('cuando')) return RESPUESTAS_CAFICULTOR.pago
    if (t.includes('descri') || t.includes('café')) return RESPUESTAS_CAFICULTOR.descripcion
    return RESPUESTAS_CAFICULTOR.default
  }
}

const INTRO_NEGOCIO = '¿Qué tipo de café buscas hoy? Puedo ayudarte a encontrar la mejor opción para tu local.'
const INTRO_CAFICULTOR = 'Hola, soy Wasi. Puedo ayudarte a gestionar tus ventas, mejorar tus precios y describir mejor tus cafés.'

interface Props {
  rol: Rol
  nombreUsuario?: string
}

const WasiChat: React.FC<Props> = ({ rol, nombreUsuario: _nombreUsuario }) => {
  const [mensajes, setMensajes] = useState<Msg[]>([
    { from: 'wasi', text: rol === 'seller' ? INTRO_CAFICULTOR : INTRO_NEGOCIO, chips: rol === 'seller' ? SUGERENCIAS_CAFICULTOR.slice(0, 3) : SUGERENCIAS_NEGOCIO.slice(0, 3) },
  ])
  const [input, setInput] = useState('')
  const [pensando, setPensando] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, pensando])

  function enviar(texto: string) {
    if (!texto.trim() || pensando) return
    const userMsg: Msg = { from: 'user', text: texto.trim() }
    setMensajes(prev => [...prev, userMsg])
    setInput('')
    setPensando(true)
    setTimeout(() => {
      const respuesta = matchRespuesta(texto, rol)
      setMensajes(prev => [...prev, respuesta])
      setPensando(false)
    }, 900 + Math.random() * 400)
  }

  const sugerencias = rol === 'seller' ? SUGERENCIAS_CAFICULTOR : SUGERENCIAS_NEGOCIO
  const accentColor = rol === 'seller' ? 'var(--tw-sage)' : 'var(--tw-terra)'
  const bgAccent = rol === 'seller' ? 'rgba(143,175,138,0.12)' : 'rgba(201,110,75,0.12)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 14, borderBottom: '1px solid var(--tw-border)', marginBottom: 14, flexShrink: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: bgAccent, border: `1.5px solid ${accentColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🤖</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'Cormorant Garamond, serif' }}>Wasi AI</div>
          <div style={{ fontSize: 10, color: accentColor, fontFamily: 'Montserrat, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor, display: 'inline-block' }} />
            Activo · {rol === 'seller' ? 'Asistente de ventas' : 'Recomendador de cafés'}
          </div>
        </div>
      </div>

      {/* Mensajes */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8 }}>
        {mensajes.map((msg, i) => (
          <div key={i}>
            {msg.from === 'user' ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ maxWidth: '78%', background: accentColor, color: '#fff', borderRadius: '14px 14px 2px 14px', padding: '10px 14px', fontSize: 13, fontFamily: 'Montserrat, sans-serif', lineHeight: 1.5 }}>
                  {msg.text}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: '86%' }}>
                <div style={{ background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: '14px 14px 14px 2px', padding: '10px 14px', fontSize: 13, color: 'var(--tw-text)', fontFamily: 'Montserrat, sans-serif', lineHeight: 1.5 }}>
                  {msg.text}
                </div>
                {msg.productos && msg.productos.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {msg.productos.map((p, pi) => (
                      <div key={pi} style={{ background: 'var(--tw-card)', border: `1px solid ${accentColor}33`, borderRadius: 10, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{ fontSize: 20, width: 34, height: 34, background: 'linear-gradient(135deg,#2a1810,#1a0f08)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>☕</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tw-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre}</div>
                          <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', marginTop: 1 }}>{p.caficultor}</div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: accentColor, flexShrink: 0 }}>{p.precio}</div>
                      </div>
                    ))}
                  </div>
                )}
                {msg.chips && msg.chips.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {msg.chips.map((c, ci) => (
                      <button
                        key={ci}
                        onClick={() => enviar(c)}
                        style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${accentColor}66`, background: bgAccent, color: accentColor, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', whiteSpace: 'nowrap' }}
                      >{c}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {pensando && (
          <div style={{ display: 'flex', gap: 5, padding: '10px 14px', background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: '14px 14px 14px 2px', width: 60, alignItems: 'center' }}>
            {[0, 1, 2].map(d => (
              <div key={d} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--tw-text-muted)', animation: `pulse 1s ${d * 0.2}s infinite` }} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Sugerencias rápidas */}
      {mensajes.length <= 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, flexShrink: 0 }}>
          {sugerencias.slice(0, 4).map((s, i) => (
            <button
              key={i}
              onClick={() => enviar(s)}
              style={{ padding: '6px 12px', borderRadius: 20, border: `1px solid var(--tw-border)`, background: 'var(--tw-card)', color: 'var(--tw-text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', whiteSpace: 'nowrap' }}
            >{s}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0, paddingTop: 8, borderTop: '1px solid var(--tw-border)' }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && enviar(input)}
          placeholder={rol === 'seller' ? 'Pregunta sobre tus ventas...' : 'Busca un café...'}
          disabled={pensando}
          style={{ flex: 1, padding: '10px 14px', borderRadius: 22, border: '1px solid var(--tw-border)', background: 'var(--tw-card)', color: 'var(--tw-text)', fontSize: 13, fontFamily: 'Montserrat, sans-serif', outline: 'none', opacity: pensando ? 0.6 : 1 }}
        />
        <button
          onClick={() => enviar(input)}
          disabled={!input.trim() || pensando}
          style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: input.trim() && !pensando ? accentColor : 'var(--tw-border)', color: '#fff', fontSize: 18, cursor: input.trim() && !pensando ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >↑</button>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:.3;transform:scale(1)} 50%{opacity:1;transform:scale(1.3)} }`}</style>
    </div>
  )
}

export default WasiChat
