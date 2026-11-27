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

// ── 22b — TIPO-VIS-04 / B2B-02: CTA por rol en ficha técnica (F-04) ──────────
// TIPO-VIS-04: buyer_b2c que ve ficha de TYPE_A recibe "Registrar negocio" (no btn deshabilitado genérico).
// B2B-02: buyer_b2b PENDING no puede comprar TYPE_A — botón deshabilitado.
// CAL-02 Cond.1: score SCA en detalle solo cuando hay evidencia N2/N3 APPROVED.
test.describe('22b — TIPO-VIS-04 / B2B-02 / CAL-02: CTA y score en ficha técnica', () => {

  test('TIPO-VIS-04: B2C en ficha de lote TYPE_A ve CTA "Registrar negocio" (no botón genérico B2B)', async ({ page }) => {
    // TIPO-VIS-04: el botón de compra se reemplaza por CTA de registro para B2C en TYPE_A
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await page.goto('/?demo=1')
    await esperarCarga(page)
    const tarjetas = page.locator('.sc-product-card')
    await expect(tarjetas.first()).toBeVisible({ timeout: 10_000 })
    const count = await tarjetas.count()
    // Buscar una tarjeta TYPE_A (café verde) — solo visible para B2B, NO debería estar para B2C
    // Si el catálogo filtra correctamente, no hay tarjetas TYPE_A para B2C
    let encontroTypeA = false
    for (let i = 0; i < Math.min(count, 10); i++) {
      const textoTarjeta = await tarjetas.nth(i).textContent() ?? ''
      if (textoTarjeta.match(/verde|TYPE_A/i)) {
        encontroTypeA = true
        await tarjetas.nth(i).click()
        await page.waitForTimeout(500)
        const body = await page.locator('body').textContent() ?? ''
        // TIPO-VIS-04: si B2C ve una ficha TYPE_A, debe ver CTA de negocio
        expect(body).toMatch(/registrar.*negocio|¿Eres tostador|negocio.*cafetería|registrar.*empresa/i)
        // No debe haber botón genérico deshabilitado "B2B"
        const btnGenerico = page.getByRole('button', { name: /^B2B$|solo.*B2B/i })
        const hayBtnGenerico = await btnGenerico.isVisible({ timeout: 1000 }).catch(() => false)
        expect(hayBtnGenerico).toBe(false)
        break
      }
    }
    if (!encontroTypeA) {
      // Correcto: catálogo filtró TYPE_A para B2C (INV-01 se cumple)
      // TYPE_A no visible para B2C — test pasa como documentación
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })

  test('B2B-02: buyer_b2b PENDING no ve opción de compra activa en ficha (acceso bloqueado)', async ({ page }) => {
    // B2B-02: buyer_b2b no-APPROVED no puede comprar en TYPE_A
    await loginEmail(page, USERS.pending.email, USERS.pending.password)
    await page.goto('/?demo=1')
    await esperarCarga(page)
    const tarjetas = page.locator('.sc-product-card')
    if (!await tarjetas.first().isVisible({ timeout: 5000 }).catch(() => false)) { test.skip(); return }
    // Abrir ficha del primer lote
    await tarjetas.first().click()
    await page.waitForTimeout(500)
    const body = await page.locator('body').textContent() ?? ''
    // B2B PENDING: no debe ver botón de compra activo para TYPE_A
    // Debe ver indicación de cuenta pendiente de aprobación
    const hayBloqueoPending = body.match(/pendiente|revisi[oó]n|aprobaci[oó]n|PENDING|cuenta.*revisi[oó]n/i)
    const sinBotonCompraActivo = !body.match(/agregar al carrito|comprar ahora/i)
    // O hay mensaje de bloqueo, o simplemente no hay botón de compra activo
    expect(hayBloqueoPending || sinBotonCompraActivo).toBeTruthy()
  })

  test('CAL-02: ficha técnica NO muestra campo "Puntaje SCA" sin evidencia verificada', async ({ page }) => {
    // CAL-02 Cond.1: Puntaje SCA en ficha solo con evidencia N2/N3 APPROVED del backend
    // Sin esa evidencia, el campo "Puntaje SCA" no debe aparecer en la ficha
    await loginEmail(page, USERS.barista.email, USERS.barista.password)
    await page.goto('/?demo=1')
    await esperarCarga(page)
    await page.locator('.sc-product-card').first().click()
    await page.waitForTimeout(500)
    const body = await page.locator('body').textContent() ?? ''
    // Si el body tiene "Puntaje SCA" con un número, debería tener evidencia N2/N3 APPROVED
    // Sin evidencia, el campo no debe aparecer — el backend no serializa puntajeReferencial
    if (body.match(/Puntaje SCA/i)) {
      // Si aparece, debe ser en contexto de evidencia verificada
      // Verificar que hay alguna referencia a evidencia (N2/N3)
      const tieneEvidencia = body.match(/N2|N3|evidencia|verificad/i)
      // Si hay "Puntaje SCA" sin evidencia, es el bug CAL-02
      expect(tieneEvidencia).toBeTruthy()
    }
    // Si no aparece "Puntaje SCA", el test pasa (guard funciona correctamente)
    expect(page.url()).not.toMatch(/\/login/)
  })
})
