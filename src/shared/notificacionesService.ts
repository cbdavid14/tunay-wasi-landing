import { collection, addDoc, updateDoc, doc, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

export async function saveNotif(uid: string, data: { titulo: string; cuerpo: string; url?: string }): Promise<void> {
  await addDoc(collection(db, 'mkt_notificaciones', uid, 'items'), {
    ...data, leida: false, createdAt: new Date().toISOString(),
  });
}

/** Notifica a todos los usuarios con rol 'admin' en mkt_usuarios */
export async function notifAdmin(data: { titulo: string; cuerpo: string; url?: string }): Promise<void> {
  const snap = await getDocs(query(collection(db, 'mkt_usuarios'), where('rol', '==', 'admin')));
  await Promise.all(snap.docs.map(d => saveNotif(d.id, data)));
}

export async function markAsRead(uid: string, notifId: string): Promise<void> {
  await updateDoc(doc(db, 'mkt_notificaciones', uid, 'items', notifId), { leida: true });
}

export async function markAllAsRead(uid: string): Promise<void> {
  const snap = await getDocs(query(collection(db, 'mkt_notificaciones', uid, 'items'), where('leida', '==', false)));
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.update(d.ref, { leida: true }));
  await batch.commit();
}
