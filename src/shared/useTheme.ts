import { useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/shared/firebase';

export type Theme = 'cream' | 'dark' | 'white';

const STORAGE_KEY = 'tw-theme';
const DEFAULT_THEME: Theme = 'cream';

/** Applies data-theme to <html> and persists to localStorage */
function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  // Also update body background immediately (avoids FOUC on hard reload)
  const bgMap: Record<Theme, string> = {
    cream: '#f2e0cc',
    dark:  '#0d0b09',
    white: '#f5f5f5',
  };
  document.body.style.backgroundColor = bgMap[theme];
  localStorage.setItem(STORAGE_KEY, theme);
}

/** Read theme from localStorage (fast — no flash) */
export function getStoredTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  return stored ?? DEFAULT_THEME;
}

/** Save theme to Firestore user profile + apply it */
export async function setTheme(theme: Theme) {
  applyTheme(theme);
  const user = auth.currentUser;
  if (user) {
    await setDoc(doc(db, 'users', user.uid), { theme }, { merge: true });
  }
}

/**
 * useTheme — call once at the app root.
 * 1. Applies stored localStorage theme immediately (no flash)
 * 2. When user signs in, syncs theme from Firestore
 */
export function useTheme() {
  useEffect(() => {
    // Apply immediately from localStorage
    applyTheme(getStoredTheme());

    // Sync from Firestore when auth state resolves
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const remote = snap.data()?.theme as Theme | undefined;
        if (remote && ['cream', 'dark', 'white'].includes(remote)) {
          applyTheme(remote);
        }
      } catch {
        // No-op — keep local theme if Firestore fails
      }
    });

    return () => unsub();
  }, []);
}
