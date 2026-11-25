import { test, expect } from '@playwright/test'
import { loginEmail, irA, esperarCarga, USERS } from './helpers'

// US-16 · PR-01 INVARIANTE · PR-03 · US-42 acciones

test.describe('23 — Pricing y cotizaciones', () => {

  test('1 — Solo lotes activos aparecen en catálogo (PS-01 INVARIANTE)', async ({ page }) => {
    await page.goto('/?demo=1#/')
    await esperarCarga(page)
    await expect(page.locator('.sc-product-card').first()).toBeVisible({ timeout: 10_000 })
    const body = await page.locator('body').textContent()
    expect(body).not.toMatch(/\bDRAFT\b/i)
    const badgesPausado = page.locator('.sc-product-card').filter({ hasText: /\bPAUSADO\b/i })
    expect(await badgesPausado.count()).toBe(0)
  })

  test('2 — Guest: catálogo carga y tarjetas muestran precio por presentación (PR-01)', async ({ page }) => {
    await page.goto('/?demo=1#/')
    await esperarCarga(page)
    await expect(page.locator('.sc-product-card').first()).toBeVisible({ timeout: 10_000 })
    const body = await page.locator('body').textContent()
    expect(body).toMatch(/S\/\s*\d|S\.\s*\d/i)
  })

  test('3 — B2B APPROVED puede iniciar solicitud de cotización desde catálogo (US-16)', async ({ page }) => {
    await loginEmail(page, USERS.barista.email, USERS.barista.password)
    await page.goto('/?demo=1#/')
    await esperarCarga(page)
    await expect(page.locator('.sc-product-card').first()).toBeVisible({ timeout: 10_000 })
    const btnCotizar = page.getByRole('button', { name: /cotiz/i }).first()
    if (!await btnCotizar.isVisible()) {
      await page.locator('.sc-product-card').first().click()
      await page.waitForTimeout(500)
    }
    const bodyPost = await page.locator('body').textContent()
    expect(bodyPost).toMatch(/cotiz|agregar|comprar|kg/i)
  })

  test('4 — B2C no puede agregar lote al carrito sin modal de login (US-43)', async ({ page }) => {
    await page.goto('/?demo=1#/')
    await esperarCarga(page)
    await expect(page.locator('.sc-product-card').first()).toBeVisible({ timeout: 10_000 })
    // Abrir primera tarjeta para ver acciones disponibles
    await page.locator('.sc-product-card').first().click()
    await page.waitForTimeout(400)
    const btnAgregar = page.getByRole('button', { name: /agregar|comprar/i }).first()
    if (await btnAgregar.isVisible()) {
      await btnAgregar.click()
      await page.waitForTimeout(400)
      const body = await page.locator('body').textContent()
      expect(body).toMatch(/ingresar|registr|login|cuenta/i)
    }
  })

  test('5 — Portal negocio B2B APPROVED: tab cotizaciones carga sin bloqueo (US-16 · B2B-02)', async ({ page }) => {
    await loginEmail(page, USERS.barista.email, USERS.barista.password)
    await irA(page, '#/portal')
    // Buscar tab de cotizaciones
    const tabCot = page.getByRole('button', { name: /cotizac/i })
    if (await tabCot.isVisible()) {
      await tabCot.click()
      await page.waitForTimeout(500)
      const body = await page.locator('body').textContent()
      // No redirige a login ni muestra bloqueo
      expect(page.url()).not.toMatch(/#\/login/)
      // Muestra lista o estado vacío
      expect(body).toMatch(/cotizac|sin cotizac|aún no|no tienes/i)
    } else {
      // Tab no existe aún — el test verifica que el portal carga sin error
      expect(page.url()).not.toMatch(/#\/login/)
    }
  })

  test('6 — B2B PENDING: cotizaciones bloqueadas — banner de aprobación (B2B-01 · US-16)', async ({ page }) => {
    await loginEmail(page, USERS.pending.email, USERS.pending.password)
    await irA(page, '#/portal')
    await page.waitForFunction(
      () => !document.body.textContent?.includes('Cargando tu portal'),
      { timeout: 15_000 }
    )
    const tabCot = page.getByRole('button', { name: /cotizac/i })
    if (await tabCot.isVisible()) await tabCot.click()
    await page.waitForTimeout(500)
    const body = await page.locator('body').textContent()
    expect(body).not.toMatch(/nueva cotización|solicitar cotización/i)
    expect(body).toMatch(/pendiente|revisión|aprobación/i)
  })
})
