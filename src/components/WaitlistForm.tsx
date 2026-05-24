import { useState } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/shared/firebase';

interface Props {
  firestoreCollection: string;
  origen: string;
  label?: string;
  theme?: 'light' | 'dark';
  style?: React.CSSProperties;
}

const themes = {
  light: {
    label: '#533b22',
    inputBorder: '#1f302844',
    inputBg: '#ffffff88',
    inputText: '#1f3028',
    btnBg: '#1f3028',
    btnText: '#f2e0cc',
    btnDupBg: '#8faf8a',
    note: '#533b2288',
  },
  dark: {
    label: '#c4b297',
    inputBorder: '#f2e0cc33',
    inputBg: '#ffffff11',
    inputText: '#f2e0cc',
    btnBg: '#c96e4b',
    btnText: '#1f3028',
    btnDupBg: '#8faf8a',
    note: '#c4b29788',
  },
} as const;

const DEFAULT_LABELS: Record<'light' | 'dark', string> = {
  light: '🎁 Únete a la lista — sé el primero en conocer los nuevos microlotes y accede antes que nadie a la próxima preventa.',
  dark: '🎁 Únete a la lista — recibe acceso prioritario a nuevos microlotes para tu negocio.',
};

export default function WaitlistForm({ firestoreCollection, origen, label, theme = 'light', style }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'duplicate'>('idle');
  const t = themes[theme];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;
    setStatus('sending');
    const existing = await getDocs(query(collection(db, firestoreCollection), where('email', '==', normalized)));
    if (!existing.empty) { setStatus('duplicate'); return; }
    await addDoc(collection(db, firestoreCollection), { email: normalized, origen, createdAt: serverTimestamp() });
    setStatus('sent');
    setEmail('');
  }

  return (
    <div id="componentWaitList" style={style}>
      <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: t.label, marginBottom: 10, fontWeight: 600 }}>
        {label ?? DEFAULT_LABELS[theme]}
      </p>
      {status === 'sent' ? (
        <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: t.label }}>
          ✓ Listo, te avisamos antes que nadie cuando haya lote nuevo.
        </p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="tu@correo.com" required
            style={{
              flex: '0 1 220px', padding: '11px 16px', borderRadius: 999,
              border: `1px solid ${t.inputBorder}`, background: t.inputBg,
              fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: t.inputText, outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={status === 'sending' || status === 'duplicate'}
            style={{
              padding: '11px 22px', borderRadius: 999, border: 'none',
              background: status === 'duplicate' ? t.btnDupBg : t.btnBg,
              color: t.btnText,
              fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 13,
              cursor: status === 'sending' || status === 'duplicate' ? 'default' : 'pointer',
              whiteSpace: 'nowrap', opacity: status === 'duplicate' ? 0.8 : 1,
            }}
          >
            {status === 'sending' ? '...' : status === 'duplicate' ? '✓ Apuntado' : 'Apúntame'}
          </button>
        </form>
      )}
      {status === 'duplicate' && (
        <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: t.label, marginTop: 6 }}>
          Ya estás en la lista. Te avisamos cuando haya stock nuevo.
        </p>
      )}
      <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: t.note, marginTop: 8, letterSpacing: '0.04em' }}>
        Sin spam.
      </p>
    </div>
  );
}
