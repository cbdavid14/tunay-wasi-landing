/**
 * izipayAdapter.ts — Integración con el SDK JS de Izipay (pasarela peruana)
 *
 * Izipay es la plataforma de pagos de Niubiz para Perú.
 * Acepta: Tarjetas Visa/MC, Yape, Billeteras digitales.
 * Documentación: https://secure.izipay.pe/js-client/v1/
 *
 * Flujo:
 * 1. Frontend solicita un token de formulario al backend (Cloud Function o endpoint propio)
 * 2. IzipayAdapter.openModal() inyecta el SDK y abre el iframe de pago
 * 3. Izipay procesa el pago y llama a onSuccess/onError
 * 4. Izipay confirma el pago vía webhook → Cloud Function `izipayWebhook`
 *
 * Para sandbox: usar VITE_IZIPAY_MERCHANT_CODE y VITE_IZIPAY_PUBLIC_KEY del portal QA.
 * Para producción: cambiar isSandbox = false
 */

export interface IzipayTokenRequest {
  orderId: string;       // ID único del pedido en Firestore
  amount: number;        // Monto en soles (sin centavos, e.g. 1250 = S/1250)
  currency?: string;     // "PEN" por defecto
  email: string;         // Email del comprador para el formulario
  nombre: string;        // Nombre del contacto
}

export interface IzipayResult {
  ok: boolean;
  transactionId?: string;
  errorMessage?: string;
}

// Declaración de tipo para el SDK de Izipay inyectado en window
declare global {
  interface Window {
    IzipayCheckout?: {
      initCheckout: (config: Record<string, unknown>) => void;
    };
  }
}

const SDK_URL_SANDBOX = "https://sandbox-static.izipay.pe/payment/js/v1/loader.min.js";
const SDK_URL_PROD    = "https://static.izipay.pe/payment/js/v1/loader.min.js";

const isSandbox = import.meta.env.VITE_IZIPAY_SANDBOX !== "false";
const MERCHANT_CODE = import.meta.env.VITE_IZIPAY_MERCHANT_CODE || "";

function loadSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.IzipayCheckout) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = isSandbox ? SDK_URL_SANDBOX : SDK_URL_PROD;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar el SDK de Izipay"));
    document.head.appendChild(script);
  });
}

/**
 * Obtiene el token de sesión de Izipay desde el backend.
 * En producción esto debe llamar a una Cloud Function segura que firme con la clave privada.
 * En sandbox devuelve un token de prueba.
 */
async function fetchSessionToken(req: IzipayTokenRequest): Promise<string> {
  if (isSandbox) {
    // Token de prueba para sandbox — reemplazar con llamada real al backend
    return `SANDBOX-TOKEN-${req.orderId}-${Date.now()}`;
  }

  const backendUrl = import.meta.env.VITE_FUNCTIONS_BASE_URL || "";
  const response = await fetch(`${backendUrl}/izipayCreateSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    throw new Error("Error al crear sesión de pago en Izipay");
  }

  const data = await response.json();
  return data.token;
}

/**
 * Abre el modal de pago de Izipay.
 *
 * @param req  Datos del pedido para inicializar el formulario
 * @returns    Promise que resuelve con el resultado del pago
 */
export async function openIzipayModal(req: IzipayTokenRequest): Promise<IzipayResult> {
  await loadSdk();
  const token = await fetchSessionToken(req);

  return new Promise((resolve) => {
    if (!window.IzipayCheckout) {
      resolve({ ok: false, errorMessage: "SDK de Izipay no disponible" });
      return;
    }

    window.IzipayCheckout.initCheckout({
      config: {
        action: "pay",
        merchantCode: MERCHANT_CODE,
        order: {
          orderId: req.orderId,
          currency: req.currency ?? "PEN",
          amount: req.amount.toFixed(2),
          processType: "IMMEDIATE",
          merchantBuyerId: req.email,
          dateTimeTransaction: new Date().toISOString().replace(/[:.]/g, "").slice(0, 15),
          merchantDefinedData: {
            field1: req.nombre,
            field2: req.email,
          },
        },
        billing: {
          firstName: req.nombre.split(" ")[0] ?? req.nombre,
          lastName: req.nombre.split(" ").slice(1).join(" ") || "-",
          email: req.email,
          phoneNumber: "",
          street: "",
          city: "Lima",
          state: "Lima",
          country: "PE",
          postalCode: "15001",
        },
        token,
        appearance: {
          logo: "/tunay-wasi-logo.png",
        },
      },
      onSuccess: (response: { data?: { transactionId?: string } }) => {
        resolve({
          ok: true,
          transactionId: response?.data?.transactionId,
        });
      },
      onError: (error: { message?: string }) => {
        resolve({
          ok: false,
          errorMessage: error?.message ?? "Error desconocido en Izipay",
        });
      },
      onClose: () => {
        resolve({ ok: false, errorMessage: "El usuario cerró el formulario de pago" });
      },
    });
  });
}
