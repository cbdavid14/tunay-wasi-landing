import { useState } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/shared/firebase';

export default function Waitlist() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'duplicate' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;
    setStatus('sending');
    try {
      const existing = await getDocs(query(collection(db, 'whitelist-b2c'), where('email', '==', normalized)));
      if (!existing.empty) {
        setStatus('duplicate');
        return;
      }
      await addDoc(collection(db, 'whitelist-b2c'), {
        email: normalized,
        origen: 'clientes_landing',
        createdAt: serverTimestamp(),
      });
      setStatus('sent');
      setEmail('');
    } catch {
      setStatus('error');
    }
  }

  return (
    <section style={{ background: '#1f3028', padding: '80px 24px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.32em', color: '#8faf8a', textTransform: 'uppercase' }}>
          Lista de espera
        </span>
        <h2 style={{ fontFamily: 'Bowlby One SC, sans-serif', fontSize: 'clamp(24px,5vw,38px)', color: '#f5ede0', margin: '16px 0 12px', lineHeight: 1.15 }}>
          Avísame cuando haya café nuevo
        </h2>
        <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 15, color: '#c4b297', lineHeight: 1.7, marginBottom: 36 }}>
          Los microlotes se agotan rápido. Déjanos tu correo y te escribimos antes de que salgan a la venta.
        </p>

        {status === 'sent' ? (
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 15, color: '#8faf8a', padding: '16px 24px', border: '1px solid #8faf8a44', borderRadius: 8 }}>
            ¡Listo! Te avisamos cuando haya stock nuevo.
          </p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
              style={{
                flex: '1 1 240px',
                padding: '14px 18px',
                borderRadius: 8,
                border: '1px solid #8faf8a44',
                background: '#ffffff0d',
                color: '#f5ede0',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 14,
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              style={{
                padding: '14px 28px',
                borderRadius: 8,
                border: 'none',
                background: '#8faf8a',
                color: '#1f3028',
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 700,
                fontSize: 14,
                cursor: status === 'sending' ? 'wait' : 'pointer',
                transition: 'all .2s ease',
              }}
            >
              {status === 'sending' ? 'Guardando...' : 'Avisarme'}
            </button>
          </form>
        )}

        {status === 'duplicate' && (
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: '#c4b297', marginTop: 12 }}>
            Este correo ya está en la lista. Te avisamos cuando haya stock nuevo.
          </p>
        )}
        {status === 'error' && (
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: '#c96e4b', marginTop: 12 }}>
            Algo salió mal. Intenta de nuevo.
          </p>
        )}
      </div>
    </section>
  );
}
