import { type Page, expect } from '@playwright/test'

// ── Credenciales (definidas aquí para no repetirlas en cada spec)
export const USERS = {
  caficultor: { email: 'caficultor@tunaywasi.qa', password: 'Tunay2026!' },
  barista:    { email: 'barista@tunaywasi.qa',    password: 'Tunay2026!' }, // buyer_b2b APPROVED
  cliente:    { email: 'cliente@tunaywasi.qa',     password: 'Tunay2026!' }, // buyer_b2c
  pending:    { email: 'b2b-pending@tunaywasi.qa', password: 'Tunay2026!' }, // buyer_b2b PENDING
} as const

// ── Login vía UI (formulario real de Firebase)
// Placeholder real del email: "tu@email.com" — el paso inicio ya muestra email+contraseña
export async function loginEmail(page: Page, email: string, password: string) {
  await page.goto('/login')
  await esperarRedQuieta(page)
  await esperarCarga(page)
  // Paso 1: si aparece pantalla de selección de método, clic en "Ingresar con email"
  const btnEmail = page.getByRole('button', { name: /ingresar con email|continuar con email/i }).first()
  await btnEmail.or(page.getByPlaceholder('tu@email.com')).first().waitFor({ timeout: 15_000 }).catch(() => {})
  if (await btnEmail.isVisible({ timeout: 3000 }).catch(() => false)) {
    await btnEmail.click()
    await page.waitForTimeout(500)
  }
  // Paso 2: rellenar formulario email + contraseña
  await page.getByPlaceholder('tu@email.com').waitFor({ timeout: 8000 })
  await page.getByPlaceholder('tu@email.com').fill(email)
  await page.getByPlaceholder('••••••••').fill(password)
  await page.getByRole('button', { name: /ingresar →/i }).click()
  // History API: esperar que el pathname deje de ser /login
  await page.waitForFunction(
    () => !window.location.pathname.startsWith('/login'),
    { timeout: 20_000 }
  )
}

// ── networkidle acotado: con sesión iniciada Firestore mantiene conexiones abiertas (listeners
// en tiempo real) y la red nunca queda "idle" → sin límite, el test se colgaba hasta su timeout.
export async function esperarRedQuieta(page: Page, timeout = 5_000) {
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {})
}

// ── Navegar a una ruta (History API)
export async function irA(page: Page, path: string) {
  await page.goto(path)
  await esperarRedQuieta(page)
  await esperarCarga(page)
  await page.waitForTimeout(500)
}

// ── Esperar a que desaparezca el splash (estático de index.html y el de React mientras resuelve auth)
// El splash dura ≥1 s (SPLASH_MIN_MS) y tapa toda la UI: cualquier isVisible() inmediato fallaría.
export async function esperarCarga(page: Page) {
  await page.waitForFunction(
    () => !document.querySelector('#tw-boot-splash, [data-testid="tw-splash"]') &&
      ![...document.querySelectorAll('div')].some(el => el.textContent?.trim() === 'Del campo a tu negocio'),
    undefined,
    { timeout: 20_000 }
  ).catch(() => {}) // Si el splash no desaparece, que falle la aserción siguiente con su propio mensaje
}

// ── Inyectar un item de carrito vía localStorage (evita flujo UI completo)
export async function inyectarCarritoDemo(page: Page, producto = {
  id: 'producto-001',
  nombre: 'Bourbon Lavado — Finca La Coipa',
  precioBaseKgCents: 45000,
  caficultorId: 'caficultor-001',
  caficultorNombre: 'Segundo Rojas Herrera',
}) {
  await page.evaluate((p) => {
    const item = { producto: p, formato: '1kg', qty: 1 }
    localStorage.setItem('one_carrito_items', JSON.stringify([item]))
  }, producto)
  // Sin reload — la app lee localStorage al navegar a la siguiente ruta
  await page.waitForTimeout(300)
}

// ── Login + esperar que Firebase Auth esté propagado en la SPA ──────────────
// Uso para tests de checkout: garantiza que el guard de /checkout no redirige a /login
// por race condition entre page.goto() y la hidratación de Firebase Auth SDK
export async function loginYEsperarAuth(page: Page, email: string, password: string) {
  await loginEmail(page, email, password)
  // Navegar al catálogo y esperar que el catálogo cargue
  // Esto confirma que Firebase Auth ya está propagado en la SPA (loading=false, user!=null)
  await page.goto('/?demo=1')
  await esperarCarga(page)
  // Esperar que aparezca alguna tarjeta de producto (confirma carga completa con auth)
  await page.locator('.sc-product-card').first().waitFor({ timeout: 10_000 }).catch(() => {})
}

// ── Documentos de prueba (REG-01/REG-02: DNI y RUC son únicos en el sistema) ──
// Cada ejecución genera valores nuevos para no chocar con el índice one_documentos.
// RUC con dígito verificador válido (REG-04). Prefijo 2099… = rango sintético de QA.
export function dniUnico(): string {
  return String(Date.now() % 100_000_000).padStart(8, '0')
}

export function rucConDigito(base10: string): string {
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const suma = pesos.reduce((acc, p, i) => acc + p * Number(base10[i]), 0)
  let dv = 11 - (suma % 11)
  if (dv === 10) dv = 0
  if (dv === 11) dv = 1
  return base10 + dv
}

export function rucUnico(): string {
  return rucConDigito('2099' + String(Date.now() % 1_000_000).padStart(6, '0'))
}

// PNG 1×1 para los uploads obligatorios de KYC (foto DNI + selfie)
export const PNG_1X1 = {
  name: 'qa.png',
  mimeType: 'image/png',
  buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'),
}

