/**
 * useAuth.ts — Hook que combina Firebase Auth + perfil Firestore
 * Devuelve { user, perfil, loading }
 */
import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { onAuthChange } from '@/shared/authService';
import { fetchPerfil } from '@/shared/perfilService';
import type { PerfilDoc } from '@/shared/types/auth';

export interface AuthState {
  user: User | null;
  perfil: PerfilDoc | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, perfil: null, loading: true });

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user) {
        setState({ user: null, perfil: null, loading: false });
        return;
      }
      const perfil = await fetchPerfil(user.uid);
      setState({ user, perfil, loading: false });
    });
    return unsub;
  }, []);

  return state;
}
