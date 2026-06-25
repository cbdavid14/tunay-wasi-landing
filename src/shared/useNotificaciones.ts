import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import { db } from './firebase';
import type { NotificacionDoc } from './types/marketplace';

export function useNotificaciones(uid: string | null) {
  const [notifs, setNotifs] = useState<NotificacionDoc[]>([]);

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, 'mkt_notificaciones', uid, 'items'),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    return onSnapshot(q, snap => {
      setNotifs(snap.docs.map(d => ({ id: d.id, ...d.data() } as NotificacionDoc)));
    });
  }, [uid]);

  return { notifs, noLeidas: notifs.filter(n => !n.leida).length };
}
