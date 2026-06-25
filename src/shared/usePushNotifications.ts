/**
 * usePushNotifications — pide permiso de push al usuario y guarda el FCM token
 * en usuarios_perfil/{uid}.fcmToken para que las Cloud Functions puedan usarlo.
 */
import { useEffect, useState } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { messagingPromise, db } from './firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported';

export function usePushNotifications(uid: string | null) {
  const [permission, setPermission] = useState<PushPermission>('default');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    // Si ya concedió permiso previamente, registrar token silenciosamente
    if (Notification.permission === 'granted') {
      registerToken(uid);
    }
    setPermission(Notification.permission as PushPermission);
  }, [uid]);

  async function registerToken(userId: string) {
    const messaging = await messagingPromise;
    if (!messaging) { setPermission('unsupported'); return; }
    try {
      const fcmToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (fcmToken) {
        setToken(fcmToken);
        await setDoc(doc(db, 'usuarios_perfil', userId), { fcmToken, fcmTokenUpdatedAt: new Date().toISOString() }, { merge: true });
      }
    } catch (err) {
      console.warn('[FCM] No se pudo obtener token:', err);
    }
  }

  async function requestPermission() {
    if (!uid) return;
    const result = await Notification.requestPermission();
    setPermission(result as PushPermission);
    if (result === 'granted') await registerToken(uid);
  }

  // Escuchar mensajes cuando la app está en foreground
  useEffect(() => {
    if (!uid) return;
    let unsubscribe: (() => void) | null = null;
    messagingPromise.then((messaging) => {
      if (!messaging) return;
      unsubscribe = onMessage(messaging, (payload) => {
        const { title, body } = payload.notification ?? {};
        // Mostrar como notificación nativa si el browser lo soporta
        if (Notification.permission === 'granted' && title) {
          new Notification(title, { body, icon: '/imgs/logo.png' });
        }
      });
    });
    return () => { unsubscribe?.(); };
  }, [uid]);

  return { permission, token, requestPermission };
}
