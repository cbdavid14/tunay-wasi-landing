import { db } from '@/shared/firebase';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

export type LeadEstado = 'pendiente' | 'ficha_completa' | 'cata_agendada' | 'descartado';

export interface CaficultorLead {
  id?: string;
  nombre: string;
  whatsapp: string;
  region: string;
  estado: LeadEstado;
  creadoEn: Timestamp | null;
  fichaCompletadaEn?: Timestamp | null;
  // ficha técnica (opcional, se llena en el paso 2)
  nombreMicrolote?: string;
  variedad?: string;
  altitud?: string;
  proceso?: string;
  faseActual?: string;
  fechaEstimadaEntrega?: string;
  cantidadKg?: string;
}

const COLECCION = 'caficultor_leads';

/** Paso 1: guarda nombre + WhatsApp + región. Retorna el ID generado. */
export async function createLead(data: {
  nombre: string;
  whatsapp: string;
  region: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, COLECCION), {
    ...data,
    estado: 'pendiente' as LeadEstado,
    creadoEn: serverTimestamp(),
    fichaCompletadaEn: null,
  });
  return ref.id;
}

/** Paso 2: agrega la ficha técnica al lead existente. */
export async function updateFicha(
  leadId: string,
  ficha: {
    nombreMicrolote: string;
    variedad: string;
    altitud: string;
    proceso: string;
    faseActual: string;
    fechaEstimadaEntrega: string;
    cantidadKg: string;
  }
): Promise<void> {
  const ref = doc(db, COLECCION, leadId);
  await updateDoc(ref, {
    ...ficha,
    estado: 'ficha_completa' as LeadEstado,
    fichaCompletadaEn: serverTimestamp(),
  });
}

/** Obtiene un lead por su ID (para la página /ficha/:id). */
export async function getLead(leadId: string): Promise<CaficultorLead | null> {
  const snap = await getDoc(doc(db, COLECCION, leadId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<CaficultorLead, 'id'>) };
}
