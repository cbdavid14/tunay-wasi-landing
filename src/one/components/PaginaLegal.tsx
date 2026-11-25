interface Section {
  title: string
  body: string | string[]
}

interface PaginaLegalProps {
  titulo: string
  subtitulo?: string
  fecha?: string
  sections: Section[]
}

export default function PaginaLegal({ titulo, subtitulo, fecha, sections }: PaginaLegalProps) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: 'var(--tw-font-display)',
          fontSize: 32,
          fontWeight: 700,
          color: 'var(--tw-text)',
          marginBottom: 8,
          lineHeight: 1.2,
        }}>{titulo}</h1>
        {subtitulo && (
          <p style={{ fontSize: 14, color: 'var(--tw-text-muted)', marginBottom: 4 }}>{subtitulo}</p>
        )}
        {fecha && (
          <p style={{ fontSize: 12, color: 'var(--tw-text-faint)' }}>Última actualización: {fecha}</p>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--tw-border)', paddingTop: 32, display: 'flex', flexDirection: 'column', gap: 28 }}>
        {sections.map((s, i) => (
          <div key={i}>
            <h2 style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--tw-terra)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 10,
            }}>{s.title}</h2>
            {Array.isArray(s.body)
              ? s.body.map((p, j) => (
                <p key={j} style={{ fontSize: 14, color: 'var(--tw-text)', lineHeight: 1.7, marginBottom: 8 }}>{p}</p>
              ))
              : <p style={{ fontSize: 14, color: 'var(--tw-text)', lineHeight: 1.7 }}>{s.body}</p>
            }
          </div>
        ))}
      </div>

      <div style={{ marginTop: 48, paddingTop: 20, borderTop: '1px solid var(--tw-border)', fontSize: 11, color: 'var(--tw-text-faint)' }}>
        AL PASO LIVE S.A.C. · RUC 20615431631 · Cal. El Greco 223 Dpto. 302, San Borja, Lima, Perú
        · soporte@tunay-wasi.com
      </div>
    </div>
  )
}
