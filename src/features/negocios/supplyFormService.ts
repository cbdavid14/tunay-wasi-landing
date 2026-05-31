import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/shared/firebase';
import { sendMail } from '@/services/mailService';
import {
  emailBienvenidaMayoristaB2B,
  emailAlertaAdminMayoristaB2B,
} from '@/services/emailTemplates';

const COLLECTION = 'solicitudes_b2b';
const ADMIN_EMAIL = 'tunaywasi@gmail.com';

export interface SolicitudSupply {
  empresa: string;
  contacto: string;
  email: string;
  telefono: string;
  volumenKg: number;
  frecuencia: string;
  puntajeMin: number;
  variedad?: string;
  mensaje?: string;
  loteId?: string;
  loteVariedad?: string;
  loteOrigen?: string;
  loteSca?: number;
  lotePrecioKg?: number;
  quieroMuestra?: boolean;
  necesitaRuc?: boolean;
}

export interface SolicitudMuestra {
  email: string;
  telefono: string;
  loteId: string;
  loteVariedad: string;
  loteOrigen: string;
  loteSca: number;
}

export async function saveSolicitudMuestra(data: SolicitudMuestra): Promise<void> {
  const normalizedEmail = data.email.toLowerCase().trim();
  await addDoc(collection(db, COLLECTION), {
    ...data,
    email: normalizedEmail,
    quieroMuestra: true,
    status: 'nuevo',
    source: 'negocios-muestra',
    createdAt: serverTimestamp(),
  });
  sendMail({
    to: normalizedEmail,
    subject: `Tunay Wasi · Muestra en camino — ${data.loteVariedad}`,
    html: `<p>Hola,</p><p>Recibimos tu solicitud de muestra de <strong>${data.loteVariedad}</strong> (${data.loteOrigen} · SCA ${data.loteSca}). Nos ponemos en contacto en menos de 24h para coordinar el envío.</p><p>— Equipo Tunay Wasi</p>`,
  }).catch(console.warn);
  sendMail({
    to: ADMIN_EMAIL,
    subject: `[Muestra B2B] ${data.loteId} — ${normalizedEmail}`,
    html: `<p>Solicitud de muestra 150g:</p><ul><li>Lote: ${data.loteId} · ${data.loteVariedad}</li><li>Email: ${normalizedEmail}</li><li>Tel: ${data.telefono}</li></ul>`,
  }).catch(console.warn);
}

export async function saveSolicitudSupply(data: SolicitudSupply): Promise<void> {
  const normalizedEmail = data.email.toLowerCase().trim();

  const raw = {
    ...data,
    email: normalizedEmail,
    status: 'nuevo',
    source: 'negocios-landing',
    createdAt: serverTimestamp(),
  };
  const payload = Object.fromEntries(
    Object.entries(raw).filter(([, v]) => v !== undefined),
  );
  await addDoc(collection(db, COLLECTION), payload);

  const loteReservado = data.loteId
    ? { id: data.loteId, variedad: data.loteVariedad ?? '', origen: data.loteOrigen ?? '', sca: data.loteSca ?? 0, precioKg: data.lotePrecioKg ?? 0 }
    : undefined;

  const welcome = emailBienvenidaMayoristaB2B({
    contacto: data.contacto,
    empresa: data.empresa,
    email: normalizedEmail,
    volumenKg: data.volumenKg,
    frecuencia: data.frecuencia,
    mensaje: data.mensaje,
    loteReservado,
  });
  sendMail({ to: normalizedEmail, ...welcome }).catch(console.warn);

  const alert = emailAlertaAdminMayoristaB2B({
    ...data,
    email: normalizedEmail,
    loteReservado,
  });
  sendMail({ to: ADMIN_EMAIL, ...alert }).catch(console.warn);
}
