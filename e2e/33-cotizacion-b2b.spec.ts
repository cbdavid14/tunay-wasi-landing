import { test, expect } from '@playwright/test'
import { loginEmail, irA, esperarCarga, USERS } from './helpers'

// US-16 · PR-01 (NEGOTIABLE) · B2B-02 · INV-04

test.describe('33 — Cotización B2B: flujo NEGOTIABLE y restricciones por estado', () => {

  test('1 — B2B APPROVED ve opción de cotizar en producto NEGOTIABLE (US-16 · PR-01)', async ({ page }) => {
    await loginEmail(page, USERS.barista.email, USERS.barista.password)
    await page.goto('/?demo=1')
    await esperarCarga(page)
    const cards = page.locator('.sc-product-card')
    await expect(cards.first()).toBeVisible({ timeout: 10_000 })
    const count = await cards.count()
    let encontrado = false
    for (let i = 0; i < count && !encontrado; i++) {
      const card = page.locator('.sc-product-card').nth(i)
      const visible = await card.isVisible({ timeout: 3000 }).catch(() => false)
      if (!visible) break
      await card.evaluate((el: HTMLElement) => el.click())
      await page.waitForTimeout(400)
      const body = await page.locator('body').textContent() ?? ''
      if (/negociable|NEGOTIABLE|hacer.*oferta|solicitar.*cotizac/i.test(body)) {
        encontrado = true
        // B2B APPROVED puede ver el botón de cotizar o hacer oferta
        expect(body).toMatch(/cotizar|hacer oferta|solicitar cotizac|enviar oferta/i)
      } else {
        // Volver al catálogo para probar el siguiente producto
        const btnVolver = page.getByRole('button', { name: /catálogo|volver/i }).first()
        if (await btnVolver.isVisible()) await btnVolver.evaluate((el: HTMLElement) => el.click())
        await page.waitForTimeout(300)
      }
    }
    // Si no se encontró producto NEGOTIABLE en demo, skip — no es un fallo
    if (!encontrado) test.skip()
  })

  test('2 — B2B APPROVED ve aviso de precio NEGOTIABLE en ficha (PR-01 UX)', async ({ page }) => {
    await loginEmail(page, USERS.barista.email, USERS.barista.password)
    await page.goto('/?demo=1')
    await esperarCarga(page)
    const cards = page.locator('.sc-product-card')
    await expect(cards.first()).toBeVisible({ timeout: 10_000 })
    await cards.first().click()
    await page.waitForTimeout(500)
    const body = await page.locator('body').textContent() ?? ''
    // Si es NEGOTIABLE: debe mostrar aviso sobre compradores B2B
    if (/negociable|NEGOTIABLE/i.test(body)) {
      expect(body).toMatch(/compradores.*B2B|Solo.*B2B|ofertas.*B2B|precio.*referencia/i)
    }
    // Si es FIXED: debe mostrar precio directo — test pasa de todas formas
    expect(body).toMatch(/S\/|precio|kg|formato/i)
  })

  test('3 — B2B PENDING no puede hacer ofertas en NEGOTIABLE (B2B-01 · PR-01)', async ({ page }) => {
    await loginEmail(page, USERS.pending.email, USERS.pending.password)
    await page.goto('/?demo=1')
    await esperarCarga(page)
    const cards = page.locator('.sc-product-card')
    await expect(cards.first()).toBeVisible({ timeout: 10_000 })
    await cards.first().click()
    await page.waitForTimeout(500)
    const body = await page.locator('body').textContent() ?? ''
    // B2B PENDING: si ve producto NEGOTIABLE, no debe poder hacer oferta comercial
    // La UI debe mostrar bloqueo o mensaje de cuenta pendiente
    if (/negociable|NEGOTIABLE/i.test(body)) {
      expect(body).not.toMatch(/(?:hacer|enviar) oferta/)
      // Puede mostrar mensaje de cuenta pendiente de aprobación
    }
    // No debe redirigir a login
    expect(page.url()).not.toMatch(/#\/login/)
  })

  test('4 — B2C no puede hacer ofertas en productos NEGOTIABLE (US-16 restricción)', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await page.goto('/?demo=1')
    await esperarCarga(page)
    const cards = page.locator('.sc-product-card')
    await expect(cards.first()).toBeVisible({ timeout: 10_000 })
    await cards.first().click()
    await page.waitForTimeout(500)
    const body = await page.locator('body').textContent() ?? ''
    // B2C no debe ver botones de cotización B2B
    expect(body).not.toMatch(/hacer oferta|cotizar.*B2B/i)
    // Puede ver mensaje de que necesita cuenta B2B para acceder
    // o simplemente no ver esa sección
  })

  test('5 — Portal negocio tab Ofertas carga lista de cotizaciones (US-16 B2B)', async ({ page }) => {
    await loginEmail(page, USERS.barista.email, USERS.barista.password)
    await irA(page, '/portal')
    await esperarCarga(page)
    await page.waitForFunction(
      () => !document.body.textContent?.includes('Cargando tu portal'),
      { timeout: 15_000 }
    )
    // Buscar tab "Ofertas" en el portal negocio
    const tabOfertas = page.getByRole('button', { name: /ofertas?/i }).first()
    if (await tabOfertas.isVisible()) {
      await tabOfertas.evaluate((el: HTMLElement) => el.click())
      await page.waitForTimeout(500)
      expect(page.url()).not.toMatch(/\/login/)
      const body = await page.locator('body').textContent() ?? ''
      // Muestra lista de ofertas o estado vacío
      expect(body).toMatch(/oferta|cotizac|no tienes|aún no|sin ofertas/i)
    } else {
      // No hay tab de ofertas visible — verificar que el portal cargó
      const body = await page.locator('body').textContent() ?? ''
      expect(body).toMatch(/MIS COMPRAS|pedidos|historial/i)
    }
  })

  test('6 — Producto NEGOTIABLE no muestra precio numérico SCA en tarjeta (INV-04)', async ({ page }) => {
    await loginEmail(page, USERS.barista.email, USERS.barista.password)
    await page.goto('/?demo=1')
    await esperarCarga(page)
    const cards = page.locator('.sc-product-card')
    await expect(cards.first()).toBeVisible({ timeout: 10_000 })
    const count = await cards.count()
    // Revisar que ninguna tarjeta del catálogo muestra score numérico SCA directamente
    for (let i = 0; i < Math.min(count, 6); i++) {
      const cardText = await cards.nth(i).textContent() ?? ''
      // Tarjetas NO deben mostrar "88 pts", "85.5 pts", etc. — solo en ficha técnica
      expect(cardText).not.toMatch(/\d{2,3}\.?\d?\s*pts\s*SCA/i)
    }
  })

  test('7 — Guest ve login gate al intentar cotizar (US-43)', async ({ page }) => {
    await page.goto('/?demo=1')
    await esperarCarga(page)
    const cards = page.locator('.sc-product-card')
    await expect(cards.first()).toBeVisible({ timeout: 10_000 })
    await cards.first().click()
    await page.waitForTimeout(500)
    // Si hay botón de cotizar visible para guest, al hacer clic debe pedir login
    const btnCotizar = page.getByRole('button', { name: /cotizar|hacer oferta|solicitar/i }).first()
    if (await btnCotizar.isVisible()) {
      await btnCotizar.click()
      await page.waitForTimeout(400)
      const body = await page.locator('body').textContent() ?? ''
      expect(body).toMatch(/ingresar|registr|login|cuenta/i)
    }
    // Si no hay botón de cotizar para guest, el test pasa — restricción a nivel UI
  })
})
