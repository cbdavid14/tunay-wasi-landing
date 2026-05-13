import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import twilio from 'twilio';
import * as crypto from 'crypto';

admin.initializeApp();
const db = admin.firestore();

// ─── Config de secrets (firebase functions:secrets:set NOMBRE) ───────────
// TWILIO_ACCOUNT_SID       → Account SID de Twilio
// TWILIO_AUTH_TOKEN        → Auth Token de Twilio
// TWILIO_WHATSAPP_FROM     → "whatsapp:+14155238886" (Sandbox) o número producción
// META_VERIFY_TOKEN        → Token que tú defines al crear el webhook en Meta (ej: "tw-caficultores-2026")
// META_APP_SECRET          → App Secret de tu Meta App (para verificar firma HMAC)

const BASE_URL = functions.config().app?.base_url ?? 'https://caficultores.tunaywasi.com';

function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error('Twilio credentials not configured');
  return twilio(sid, token);
}

function twilioFrom(): string {
  return process.env.TWILIO_WHATSAPP_FROM ?? 'whatsapp:+14155238886';
}

// ─── Trigger: nuevo lead creado → manda WhatsApp de bienvenida ─────────────
export const onLeadCreated = functions
  .runWith({ secrets: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_FROM'] })
  .firestore.document('caficultor_leads/{leadId}')
  .onCreate(async (snap, context) => {
    const lead = snap.data() as {
      nombre: string;
      whatsapp: string;
      region: string;
      estado: string;
    };

    const leadId = context.params.leadId;
    const fichaUrl = `${BASE_URL}/ficha/${leadId}`;
    const nombre = lead.nombre.split(' ')[0];

    const body =
      `¡Hola ${nombre}! 🌿 Soy Tunay Wasi.\n\n` +
      `Ya quedaste registrado como caficultor. Para asignarte el precio de tu lote según tu puntaje SCA, completa tu ficha técnica aquí:\n\n` +
      `${fichaUrl}\n\n` +
      `Solo toma 3 minutos. Coordinamos el recojo una vez lista. ¿Alguna duda? Responde este mismo mensaje.`;

    const to = lead.whatsapp.startsWith('whatsapp:')
      ? lead.whatsapp
      : `whatsapp:${lead.whatsapp.startsWith('+') ? lead.whatsapp : '+' + lead.whatsapp}`;

    try {
      const client = getTwilioClient();
      await client.messages.create({ from: twilioFrom(), to, body });
      await snap.ref.update({ whatsappEnviadoEn: FieldValue.serverTimestamp() });
      functions.logger.info(`WhatsApp enviado a ${lead.whatsapp} para lead ${leadId}`);
    } catch (err) {
      functions.logger.error(`Error enviando WhatsApp para lead ${leadId}:`, err);
    }
  });

// ─── Scheduled: recordatorio 48h a leads sin ficha completa ────────────────
export const recordatorio48h = functions
  .runWith({ secrets: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_FROM'] })
  .pubsub.schedule('every 6 hours')
  .onRun(async () => {
    const ahora = Timestamp.now();
    const hace48h = Timestamp.fromMillis(ahora.toMillis() - 48 * 60 * 60 * 1000);
    const hace96h = Timestamp.fromMillis(ahora.toMillis() - 96 * 60 * 60 * 1000);

    // Leads pendientes creados entre 48h y 96h atrás (ventana para evitar spam)
    const snapshot = await db
      .collection('caficultor_leads')
      .where('estado', '==', 'pendiente')
      .where('creadoEn', '<=', hace48h)
      .where('creadoEn', '>=', hace96h)
      .get();

    functions.logger.info(`Recordatorios pendientes: ${snapshot.size}`);

    const client = getTwilioClient();

    const tareas = snapshot.docs.map(async (docSnap) => {
      const lead = docSnap.data() as { nombre: string; whatsapp: string };
      const fichaUrl = `${BASE_URL}/ficha/${docSnap.id}`;
      const nombre = lead.nombre.split(' ')[0];

      const body =
        `Hola ${nombre} 👋 Te escribimos desde Tunay Wasi.\n\n` +
        `Notamos que aún no completaste tu ficha técnica. ¡Reserva tu cupo antes de que se llene!\n\n` +
        `${fichaUrl}\n\n` +
        `Solo 3 minutos. ¿Necesitas ayuda? Responde aquí.`;

      const to = lead.whatsapp.startsWith('whatsapp:')
        ? lead.whatsapp
        : `whatsapp:${lead.whatsapp.startsWith('+') ? lead.whatsapp : '+' + lead.whatsapp}`;

      try {
        await client.messages.create({ from: twilioFrom(), to, body });
        await docSnap.ref.update({ recordatorioEnviadoEn: FieldValue.serverTimestamp() });
      } catch (err) {
        functions.logger.error(`Error recordatorio para ${docSnap.id}:`, err);
      }
    });

    await Promise.allSettled(tareas);
  });

// ─── Webhook de Meta Lead Ads ─────────────────────────────────────────────
// URL pública: https://<region>-<project>.cloudfunctions.net/metaLeadWebhook
//
// Pasos para configurar en Meta:
//  1. Meta for Developers → tu App → "Webhooks" → "Página" → Subscribir al evento "leadgen"
//  2. URL del webhook: la URL de esta Cloud Function
//  3. Token de verificación: el valor que pusiste en META_VERIFY_TOKEN
//  4. En "Lead Ads" de tu página, conectar el formulario al webhook
export const metaLeadWebhook = functions
  .runWith({
    secrets: [
      'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_FROM',
      'META_VERIFY_TOKEN', 'META_APP_SECRET',
    ],
  })
  .https.onRequest(async (req, res) => {
    // ── Verificación inicial GET que hace Meta al registrar el webhook ──
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
        functions.logger.info('Meta webhook verificado correctamente');
        res.status(200).send(challenge);
      } else {
        functions.logger.warn('Token de verificación incorrecto');
        res.sendStatus(403);
      }
      return;
    }

    // ── POST: evento de nuevo lead ──
    if (req.method !== 'POST') { res.sendStatus(405); return; }

    // Verificar firma HMAC-SHA256 de Meta para asegurar que el POST es genuino
    const appSecret = process.env.META_APP_SECRET ?? '';
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    if (appSecret && signature) {
      const expected = 'sha256=' + crypto
        .createHmac('sha256', appSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');
      if (signature !== expected) {
        functions.logger.warn('Firma HMAC inválida — descartando evento');
        res.sendStatus(403);
        return;
      }
    }

    // Responder 200 a Meta de inmediato (tiene timeout de 20s)
    res.sendStatus(200);

    // Procesar cada lead del payload en background
    const body = req.body as MetaWebhookPayload;
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'leadgen') continue;
        const leadgenId = change.value?.leadgen_id;
        const formId = change.value?.form_id;
        if (!leadgenId || !formId) continue;

        try {
          // Obtener los datos del lead desde la Graph API de Meta
          const leadData = await fetchMetaLead(leadgenId);
          await procesarLeadMeta(leadData);
        } catch (err) {
          functions.logger.error(`Error procesando leadgen_id ${leadgenId}:`, err);
        }
      }
    }
  });

// ─── Tipos del payload de Meta ─────────────────────────────────────────────
interface MetaWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      field: string;
      value?: { leadgen_id: string; form_id: string };
    }>;
  }>;
}

interface MetaLeadData {
  id: string;
  field_data: Array<{ name: string; values: string[] }>;
}

// ─── Obtener datos del lead via Graph API ──────────────────────────────────
async function fetchMetaLead(leadgenId: string): Promise<MetaLeadData> {
  // El token de página se necesita para leer los leads. Guardarlo como secret:
  // firebase functions:secrets:set META_PAGE_ACCESS_TOKEN
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error('META_PAGE_ACCESS_TOKEN no configurado');

  const url = `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${token}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Graph API error ${resp.status}: ${text}`);
  }
  return resp.json() as Promise<MetaLeadData>;
}

// ─── Procesar y guardar el lead en Firestore ───────────────────────────────
async function procesarLeadMeta(metaLead: MetaLeadData): Promise<void> {
  // Mapear field_data de Meta a campos normalizados
  const campos: Record<string, string> = {};
  for (const field of metaLead.field_data) {
    campos[field.name] = field.values[0] ?? '';
  }

  // Meta usa distintos nombres según cómo configuraste el formulario
  const nombre =
    campos['full_name'] ||
    `${campos['first_name'] ?? ''} ${campos['last_name'] ?? ''}`.trim() ||
    'Sin nombre';

  const whatsapp =
    campos['phone_number'] ||
    campos['phone'] ||
    '';

  const email = campos['email'] ?? '';

  // Evitar duplicados: si ya existe un lead con este metaLeadId, ignorar
  const existente = await db
    .collection('caficultor_leads')
    .where('metaLeadId', '==', metaLead.id)
    .limit(1)
    .get();

  if (!existente.empty) {
    functions.logger.info(`Lead ${metaLead.id} ya existe — ignorando duplicado`);
    return;
  }

  // Guardar en Firestore
  const docRef = await db.collection('caficultor_leads').add({
    nombre,
    whatsapp,
    email,
    region: campos['region'] ?? campos['city'] ?? '',
    estado: 'pendiente',
    fuente: 'meta_lead_ads',
    metaLeadId: metaLead.id,
    creadoEn: FieldValue.serverTimestamp(),
    fichaCompletadaEn: null,
  });

  functions.logger.info(`Lead de Meta guardado: ${docRef.id} (${nombre})`);

  // El trigger onLeadCreated se encarga de mandar el WhatsApp automáticamente
  // Solo lo hacemos si hay número de WhatsApp disponible
  if (!whatsapp) {
    functions.logger.warn(`Lead ${docRef.id} sin número de WhatsApp — no se enviará mensaje`);
  }
}
