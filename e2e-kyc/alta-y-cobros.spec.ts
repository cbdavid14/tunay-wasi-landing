/**
 * F-03 — El CCI no se exige para el alta, sí para cobrar (ESC-06). Alta real por la web, job real y
 * portal del caficultor, contra emuladores. La subida de fotos se intercepta.
 */
import { test, expect, type Page } from '@playwright/test'
import { loginEmail, esperarCarga } from '../e2e/helpers'
import { ADMIN, CAFICULTORA, sembrar, perfil, perfilPorEmail, revisiones, ejecutarJob } from './datos'

const PNG = { name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64') }
const CCI = '00219100123456789012'

test.beforeEach(async () => { await sembrar() })

async function interceptarFotos(page: Page) {
  let n = 0
  await page.route('https://api.cloudinary.com/**', ruta => ruta.fulfill({
    json: { secure_url: `https://res.cloudinary.com/demo/image/upload/e2e/alta-${Date.now()}-${++n}.png` },
  }))
}

const campo = (page: Page, marcador: string) => page.locator(`input[placeholder="${marcador}"]:visible`).first()

test('KYC-ALTA-01: alta sin CCI, el job aprueba y el admin lo ve como "sin registrar"', async ({ page, browser, baseURL }) => {
  const email = `alta.${Date.now()}@example.com`
  await interceptarFotos(page)
  await page.goto('/registro-caficultor')
  await esperarCarga(page)
  await campo(page, 'María Quispe Condori').fill('Elena Prueba Alta')
  await campo(page, '+51 987 654 321').fill('+51 999 100 200')
  await campo(page, 'tu@correo.com').fill(email)
  await campo(page, 'Mínimo 8 caracteres + 1 número').fill(CAFICULTORA.password)
  await campo(page, 'Repite').fill(CAFICULTORA.password)
  await page.getByRole('button', { name: /Siguiente →/ }).first().click()
  const listas = page.locator('select:visible')
  await listas.nth(0).selectOption('Cajamarca')
  await campo(page, 'Ej. San Ignacio').fill('San Ignacio')
  await listas.nth(1).selectOption('Caturra')
  await listas.nth(2).selectOption('Honey')
  await page.getByRole('button', { name: /Siguiente →/ }).first().click()
  await expect(page.getByText('Verifica tu identidad').first()).toBeVisible()
  await campo(page, '12345678').fill('99000009')
  const archivos = page.locator('input[type=file]')
  await archivos.nth(0).setInputFiles(PNG)
  await archivos.nth(1).setInputFiles(PNG)

  // Un CCI mal escrito se avisa; vacío se acepta
  await expect(page.getByText('CCI de tu cuenta (opcional)').first()).toBeVisible()
  await campo(page, '00219100XXXXXXXXXX25').fill('123')
  await page.getByRole('button', { name: /Crear cuenta →/ }).first().click()
  await expect(page.getByText(/El CCI debe tener 20 dígitos/).first()).toBeVisible()
  await campo(page, '00219100XXXXXXXXXX25').fill('')
  await page.getByRole('button', { name: /Crear cuenta →/ }).first().click()

  await expect.poll(async () => (await perfilPorEmail(email).catch(() => null) as any)?.caficultor?.dni, { timeout: 30_000 }).toBe('99000009')
  const antes = await perfilPorEmail(email) as any
  expect(antes.estadoKyc).toBe('PENDING_REVIEW')
  expect(antes.caficultor.cci).toBeUndefined()

  ejecutarJob()
  expect((await perfil(antes.uid)).estadoKyc).toBe('ACTIVO')
  expect((await revisiones(antes.uid))[0].criteriosPendientes).toEqual([])

  const admin = await browser.newPage({ baseURL })
  await loginEmail(admin, ADMIN.email, ADMIN.password)
  await admin.goto('/admin')
  await esperarCarga(admin)
  const kycBtn2 = admin.getByRole('button', { name: /KYC Sellers/ })
  if (!await kycBtn2.filter({ visible: true }).first().isVisible({ timeout: 3_000 }).catch(() => false)) {
    await admin.locator('.adm-mobile-header button').click()
    await kycBtn2.filter({ visible: true }).first().waitFor({ state: 'visible' })
  }
  await kycBtn2.filter({ visible: true }).first().click()
  const tarjeta = admin.locator(`article[data-uid="${antes.uid}"]`)
  await expect(tarjeta).toContainText('Aprobado')
  await expect(tarjeta).toContainText('Sin registrar (se exige para cobrar)')
  await admin.close()
})

async function abrirCobros(page: Page) {
  await loginEmail(page, CAFICULTORA.email, CAFICULTORA.password)
  await page.goto('/caficultor-portal')
  await esperarCarga(page)
  // El portal carga en el tab "productos"; hay que ir a Perfil primero
  await page.getByRole('button', { name: 'Menú' }).click()
  await page.getByRole('button', { name: /Perfil/ }).filter({ visible: true }).first().click()
  // Sub-tab Cobros (en desktop: tab horizontal; en móvil: menú vertical de ajustes)
  await page.getByRole('button', { name: /Cobros/ }).filter({ visible: true }).first().click()
  await expect(page.locator('#cobro-cci')).toBeEnabled()
}

test('KYC-CCI-01: el caficultor aprobado añade su CCI en Cobros y queda guardado', async ({ page }) => {
  await abrirCobros(page)
  await expect(page.getByRole('alert').filter({ hasText: 'Sin él no podemos pagarte' })).toBeVisible()

  await page.locator('#cobro-cci').fill('123')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByText('El CCI debe tener 20 dígitos')).toBeVisible()
  expect((await perfil('ana')).caficultor.cci).toBeFalsy()

  await page.locator('#cobro-cci').fill('002-19100123456789012')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByText('Datos de cobro guardados')).toBeVisible()
  const p = await perfil('ana')
  expect(p.caficultor.cci).toBe(CCI)
  expect(p.estadoKyc).toBe('ACTIVO')          // guardar el cobro no toca la aprobación
  expect(p.caficultor.activo).toBe(true)
  await expect(page.getByText('Sin él no podemos pagarte')).toHaveCount(0)

  // Persiste al volver a entrar (ya logueado; solo navegar a Cobros)
  await page.reload(); await esperarCarga(page)
  await page.getByRole('button', { name: 'Menú' }).click()
  await page.getByRole('button', { name: /Perfil/ }).filter({ visible: true }).first().click()
  await page.getByRole('button', { name: /Cobros/ }).filter({ visible: true }).first().click()
  await expect(page.locator('#cobro-cci')).toHaveValue(CCI)
})
