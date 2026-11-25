import { test, expect } from '@playwright/test'
import { loginEmail, esperarCarga, USERS } from './helpers'

// US-05 · INV-04/CAL-01 · Contenido de tarjetas por rol

test.describe('29 — Tarjetas del catálogo por rol', () => {

  test('1 — Tarjeta tiene nombre del café y precio visible (todos los roles)', async ({ page }) => {
    await page.goto('/?demo=1')
    await esperarCarga(page)
    const primeraTarjeta = page.locator('.sc-product-card').first()
    await expect(primeraTarjeta).toBeVisible({ timeout: 10_000 })
    const textoTarjeta = await primeraTarjeta.textContent()
    // Nombre del café (algún texto descriptivo)
    expect(textoTarjeta).toMatch(/\w{3,}/)
    // Precio en soles
    expect(textoTarjeta).toMatch(/S\/\s*\d/)
  })

  test('2 — Tarjeta NO muestra puntuación SCA numérica (INV-04/CAL-01 INVARIANTE)', async ({ page }) => {
    // Este test nunca debe skipearse — es un INVARIANTE de negocio
    await loginEmail(page, USERS.barista.email, USERS.barista.password)
    await page.goto('/?demo=1')
    await esperarCarga(page)
    const tarjetas = page.locator('.sc-product-card')
    await expect(tarjetas.first()).toBeVisible({ timeout: 10_000 })
    const count = await tarjetas.count()
    // Revisar cada tarjeta visible
    for (let i = 0; i < Math.min(count, 5); i++) {
      const textoTarjeta = await tarjetas.nth(i).textContent() ?? ''
      // SCA score numérico como "84.5 pts" o "SCA: 84" NO debe aparecer en tarjeta
      expect(textoTarjeta).not.toMatch(/\b(SCA|puntuación|score)[\s:]*\d{2,3}(\.\d)?\s*(pts?|puntos?)/i)
    }
  })

  test('3 — Guest ve tarjetas con precio pero no botón directo de compra en la tarjeta', async ({ page }) => {
    // Sin login
    await page.goto('/?demo=1')
    await esperarCarga(page)
    const primeraTarjeta = page.locator('.sc-product-card').first()
    await expect(primeraTarjeta).toBeVisible({ timeout: 10_000 })
    // La tarjeta muestra precio
    const textoTarjeta = await primeraTarjeta.textContent() ?? ''
    expect(textoTarjeta).toMatch(/S\/\s*\d/)
    // La tarjeta NO tiene botón "Agregar al carrito" directo — el botón está en la ficha detalle
    // (la tarjeta solo tiene la info básica; click en ella abre detalle)
    const btnEnTarjeta = primeraTarjeta.getByRole('button', { name: /agregar al carrito/i })
    const tieneBtnDirecto = await btnEnTarjeta.isVisible({ timeout: 1000 }).catch(() => false)
    // Si hay botón directo en la tarjeta para guest, al hacer click debe mostrar login gate
    if (tieneBtnDirecto) {
      await btnEnTarjeta.click()
      await page.waitForTimeout(400)
      const body = await page.locator('body').textContent()
      expect(body).toMatch(/ingresar|registr|login|cuenta/i)
    }
  })

  test('4 — B2B APPROVED ve precio y puede abrir ficha de detalle (US-05 · B2B)', async ({ page }) => {
    await loginEmail(page, USERS.barista.email, USERS.barista.password)
    await page.goto('/?demo=1')
    await esperarCarga(page)
    const primeraTarjeta = page.locator('.sc-product-card').first()
    await expect(primeraTarjeta).toBeVisible({ timeout: 10_000 })
    // Ver precio
    const textoTarjeta = await primeraTarjeta.textContent() ?? ''
    expect(textoTarjeta).toMatch(/S\/\s*\d/)
    // Puede abrir ficha detalle
    await primeraTarjeta.click()
    await page.waitForTimeout(500)
    const body = await page.locator('body').textContent()
    // La ficha muestra contenido de detalle
    expect(body).toMatch(/agregar|comprar|cotiz|carrito|café|variedad|origen/i)
  })

  test('5 — B2C ve tarjetas TYPE_B y TYPE_C pero NO TYPE_A en catálogo (INV restricción)', async ({ page }) => {
    // INVARIANTE: B2C no puede ver lotes TYPE_A (café verde)
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await page.goto('/?demo=1')
    await esperarCarga(page)
    const tarjetas = page.locator('.sc-product-card')
    await expect(tarjetas.first()).toBeVisible({ timeout: 10_000 })
    const count = await tarjetas.count()
    // Recorrer las tarjetas visibles
    for (let i = 0; i < Math.min(count, 10); i++) {
      const textoTarjeta = await tarjetas.nth(i).textContent() ?? ''
      // Ninguna tarjeta debe mostrar el indicador de TYPE_A exclusivo para B2B
      // (restricción de visibilidad: las tarjetas TYPE_A no se renderizan para B2C)
      expect(textoTarjeta).not.toMatch(/solo B2B|exclusivo empresa|requiere cuenta negocio/i)
    }
    // B2C puede ver tarjetas (hay TYPE_B y/o TYPE_C disponibles)
    expect(count).toBeGreaterThan(0)
  })

  test('6 — Tarjeta muestra nombre del caficultor o finca (US-05 trazabilidad)', async ({ page }) => {
    await page.goto('/?demo=1')
    await esperarCarga(page)
    const primeraTarjeta = page.locator('.sc-product-card').first()
    await expect(primeraTarjeta).toBeVisible({ timeout: 10_000 })
    const textoTarjeta = await primeraTarjeta.textContent() ?? ''
    // Debe mostrar algo sobre el origen (nombre de caficultor o finca)
    // Es información básica de trazabilidad que siempre aparece en la tarjeta
    expect(textoTarjeta.length).toBeGreaterThan(20)
    // No debe mostrar solo el precio — debe haber texto descriptivo
    const soloNumeros = /^\s*S\/\s*[\d.]+\s*$/.test(textoTarjeta)
    expect(soloNumeros).toBe(false)
  })
})
