import { test, expect } from '@playwright/test'
import { loginEmail, irA, esperarCarga, USERS } from './helpers'

// CAL-02 · CAL-01 INVARIANTE · INV-04 · US-42 · US-11
// Nota: los tests que abren "URL de un lote específico" usan el catálogo para localizar
// el primer lote disponible, ya que los IDs reales dependen del seed de Firestore.

test.describe('22 — Ficha técnica B2B: SCA, datos técnicos, precios', () => {

  test('1 — Puntaje SCA numérico nunca aparece en las tarjetas del catálogo (CAL-01 INVARIANTE)', async ({ page }) => {
    await loginEmail(page, USERS.barista.email, USERS.barista.password)
    await page.goto('/?demo=1')
    await esperarCarga(page)
    await expect(page.locator('.sc-product-card').first()).toBeVisible({ timeout: 10_000 })
    // Verificar que las tarjetas en sí no tienen el badge numérico SCA
    // (El texto "Certificado SCA" genérico en banners de marketing es diferente)
    const tarjetas = page.locator('.sc-product-card')
    const countTarjetas = await tarjetas.count()
    for (let i = 0; i < Math.min(countTarjetas, 5); i++) {
      const textoTarjeta = await tarjetas.nth(i).textContent() ?? ''
      expect(textoTarjeta).not.toMatch(/SCA\s+\d+/i)
      expect(textoTarjeta).not.toMatch(/\d+\s*pts/i)
    }
  })

  test('2 — Guest abre detalle de producto: sin datos técnicos B2B (CAL-02 · US-42)', async ({ page }) => {
    await page.goto('/?demo=1')
    await esperarCarga(page)
    const primeraTarjeta = page.locator('.sc-product-card').first()
    await expect(primeraTarjeta).toBeVisible({ timeout: 10_000 })
    await primeraTarjeta.click()
    await page.waitForTimeout(600)
    const body = await page.locator('body').textContent()
    expect(body).not.toMatch(/Humedad/i)
    expect(body).not.toMatch(/Rendimiento/i)
    expect(body).not.toMatch(/Criba/i)
    // SCA numérico (badge SCA 85, etc.) no debe aparecer para guest
    expect(body).not.toMatch(/SCA\s+\d+/i)
    expect(body).not.toMatch(/Precios mayoristas/i)
  })

  test('3 — B2C abre detalle: sin datos técnicos ni precio mayorista (CAL-02 · PR-02)', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await page.goto('/?demo=1')
    await esperarCarga(page)
    const primeraTarjeta = page.locator('.sc-product-card').first()
    await expect(primeraTarjeta).toBeVisible({ timeout: 10_000 })
    await primeraTarjeta.click()
    await page.waitForTimeout(600)
    // Acotar al panel de detalle, no al body completo (el footer tiene texto de marketing con "Precio S/kg")
    const panel = page.locator('.detalle-inline-grid, .detalle-inline-panel').first()
    const panelVisible = await panel.isVisible({ timeout: 3000 }).catch(() => false)
    const textContent = panelVisible
      ? await panel.textContent()
      : await page.locator('body').textContent()
    expect(textContent).not.toMatch(/precio.{0,10}S\/\s*(kg|Kg)/i)
    expect(textContent).not.toMatch(/mayorist/i)
    expect(textContent).not.toMatch(/SCA\s+\d+/i)
  })

  test('4 — B2B APPROVED: tarjetas del catálogo no muestran puntaje SCA numérico (PR-02 · US-10 · B2B-02)', async ({ page }) => {
    await loginEmail(page, USERS.barista.email, USERS.barista.password)
    await page.goto('/?demo=1')
    await esperarCarga(page)
    const tarjetas = page.locator('.sc-product-card')
    await expect(tarjetas.first()).toBeVisible({ timeout: 10_000 })
    // Las tarjetas individuales no deben mostrar SCA numérico (ej. "SCA 85")
    const countTarjetas = await tarjetas.count()
    for (let i = 0; i < Math.min(countTarjetas, 5); i++) {
      const textoTarjeta = await tarjetas.nth(i).textContent() ?? ''
      expect(textoTarjeta).not.toMatch(/SCA\s+\d+/i)
    }
  })

  test('5 — SCA nunca aparece en ningún flujo B2B APPROVED (CAL-01 INVARIANTE global)', async ({ page }) => {
    await loginEmail(page, USERS.barista.email, USERS.barista.password)
    await page.goto('/?demo=1')
    await esperarCarga(page)
    const primeraTarjeta = page.locator('.sc-product-card').first()
    await expect(primeraTarjeta).toBeVisible({ timeout: 10_000 })
    await primeraTarjeta.click()
    await page.waitForTimeout(600)
    const body = await page.locator('body').textContent()
    // SCA numérico (ej. "SCA 85") no debe aparecer para B2B APPROVED en el catálogo
    // (sí puede aparecer en la ficha técnica dentro del detalle, pero ese es el scope de CAL-02)
    // Aquí verificamos el catálogo general sin abrir ficha detalle
    expect(body).not.toMatch(/SCA\s+\d+/)
    expect(body).not.toMatch(/\d+\.\d+\s*pts/i)
  })

  test('6 — Catálogo B2B con demo: NO hay SCA numérico en las tarjetas (INV-04)', async ({ page }) => {
    // Verificar INV-04 desde el catálogo con datos demo (más determinista que el portal)
    await loginEmail(page, USERS.barista.email, USERS.barista.password)
    await page.goto('/?demo=1')
    await esperarCarga(page)
    const tarjetas = page.locator('.sc-product-card')
    await expect(tarjetas.first()).toBeVisible({ timeout: 10_000 })
    // Ninguna tarjeta debe tener badge "SCA 85" ni similar
    const countTarjetas = await tarjetas.count()
    for (let i = 0; i < Math.min(countTarjetas, 8); i++) {
      const textoTarjeta = await tarjetas.nth(i).textContent() ?? ''
      expect(textoTarjeta).not.toMatch(/SCA\s+\d+/i)
      expect(textoTarjeta).not.toMatch(/\d+\.\d+\s*pts/i)
    }
  })

  test('7 — Lote sin acción comercial (PAUSED): banner y sin botón de compra (PS-02 INVARIANTE)', async ({ page }) => {
    await loginEmail(page, USERS.barista.email, USERS.barista.password)
    await page.goto('/?demo=1')
    await esperarCarga(page)
    const tarjetaPausada = page.locator('.sc-product-card').filter({ hasText: /pausad|no disponible/i }).first()
    const existe = await tarjetaPausada.isVisible()
    if (!existe) {
      test.skip()
      return
    }
    await tarjetaPausada.click()
    await page.waitForTimeout(500)
    const body = await page.locator('body').textContent()
    expect(body).toMatch(/pausad|no disponible temporalmente/i)
    expect(body).not.toMatch(/agregar al carrito|comprar ahora|solicitar cotización/i)
  })
})
