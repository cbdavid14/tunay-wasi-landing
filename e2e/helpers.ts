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
  await page.goto('/#/login')
  await page.waitForLoadState('networkidle')
  // Paso 1: si aparece pantalla de selección de método, clic en "Ingresar con email"
  const btnEmail = page.getByRole('button', { name: /ingresar con email|continuar con email/i }).first()
  if (await btnEmail.isVisible({ timeout: 3000 }).catch(() => false)) {
    await btnEmail.click()
    await page.waitForTimeout(500)
  }
  // Paso 2: rellenar formulario email + contraseña
  await page.getByPlaceholder('tu@email.com').waitFor({ timeout: 8000 })
  await page.getByPlaceholder('tu@email.com').fill(email)
  await page.getByPlaceholder('••••••••').fill(password)
  await page.getByRole('button', { name: /ingresar →/i }).click()
  // Hash router: esperar que el hash deje de ser #/login
  await page.waitForFunction(
    () => !window.location.hash.startsWith('#/login'),
    { timeout: 15_000 }
  )
}

// ── Navegar a una ruta hash
export async function irA(page: Page, hash: string) {
  await page.evaluate((h) => { window.location.hash = h }, hash)
  await page.waitForTimeout(400)
}

// ── Esperar que el catálogo cargue (desaparece el splash, aparecen tarjetas o estado vacío)
export async function esperarCarga(page: Page) {
  // Esperar que el texto del splash "Del campo a tu negocio" desaparezca
  await page.waitForFunction(
    () => {
      const splash = document.querySelector('[style*="splashIn"]')
      const textoSplash = [...document.querySelectorAll('div')].find(el =>
        el.textContent?.trim() === 'Del campo a tu negocio'
      )
      return !splash && !textoSplash
    },
    { timeout: 10_000 }
  ).catch(() => {}) // Si ya no hay splash, seguir
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
  await page.reload()
  // Esperar que el splash desaparezca y la app cargue
  await page.waitForFunction(
    () => {
      const textoSplash = [...document.querySelectorAll('div')].find(el =>
        el.textContent?.trim() === 'Del campo a tu negocio'
      )
      return !textoSplash && (document.body.textContent?.length ?? 0) > 100
    },
    { timeout: 10_000 }
  ).catch(() => {})
}
