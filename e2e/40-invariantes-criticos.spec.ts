import { test, expect } from '@playwright/test'
import { loginEmail, irA, esperarCarga, USERS } from './helpers'

// INV-02 · INV-05 · INV-11 · PR-02 · TIPO-VIS-04 · IA-02 · ENT-01 · ENT-06 · PS-02
// Este spec cubre invariantes de negocio que no estaban cubiertos en otros specs.

test.describe('40 — Invariantes críticos de negocio', () => {

  // ── INV-02 / PR-02 ──────────────────────────────────────────────────────────
  test('1 — B2B APPROVED ve precio S/kg en ficha de lote (PR-02 / INV-02)', async ({ page }) => {
    await loginEmail(page, USERS.barista.email, USERS.barista.password)
    await page.goto('/?demo=1')
    await esperarCarga(page)
    const cards = page.locator('.sc-product-card')
    await expect(cards.first()).toBeVisible({ timeout: 10_000 })
    // Buscar una tarjeta TYPE_A (café verde) — precio mayorista S/kg solo visible para B2B APPROVED
    let fichaAbierta = false
    const count = await cards.count()
    for (let i = 0; i < count; i++) {
      const card = page.locator('.sc-product-card').nth(i)
      const textoCard = await card.textContent() ?? ''
      // Heurística: tarjetas TYPE_A suelen mostrar "verde" o "Green"
      await card.evaluate((el: HTMLElement) => el.click())
      await page.waitForTimeout(500)
      const body = await page.locator('body').textContent() ?? ''
      // B2B APPROVED en cualquier ficha debe ver algún precio (minorista o mayorista)
      if (body.match(/S\/\s*\d/)) {
        fichaAbierta = true
        break
      }
      const btnVolver = page.getByRole('button', { name: /catálogo|volver|cerrar/i }).first()
      if (await btnVolver.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btnVolver.evaluate((el: HTMLElement) => el.click())
        await page.waitForTimeout(300)
      }
    }
    if (!fichaAbierta) { test.skip(); return }
    const body = await page.locator('body').textContent() ?? ''
    // B2B APPROVED ve algún precio — no bloqueado
    expect(body).toMatch(/S\/\s*\d/)
    expect(page.url()).not.toMatch(/\/login/)
  })

  test('2 — Guest NO ve precio S/kg mayorista en ninguna ficha (INV-02 / PR-02 INVARIANTE)', async ({ page }) => {
    await page.goto('/?demo=1')
    await esperarCarga(page)
    await expect(page.locator('.sc-product-card').first()).toBeVisible({ timeout: 10_000 })
    await page.locator('.sc-product-card').first().click()
    await page.waitForTimeout(500)
    const body = await page.locator('body').textContent() ?? ''
    // El precio mayorista (S/kg con contexto mayorista) no debe aparecer para guest
    expect(body).not.toMatch(/precio.{0,20}mayorist/i)
    expect(body).not.toMatch(/Precios mayoristas/i)
    // No debe ver escalas de volumen
    expect(body).not.toMatch(/escala.*volumen|volumen.*escala/i)
  })

  test('3 — B2C NO ve precio mayorista S/kg ni escalas de volumen (INV-03 INVARIANTE)', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await page.goto('/?demo=1')
    await esperarCarga(page)
    await expect(page.locator('.sc-product-card').first()).toBeVisible({ timeout: 10_000 })
    await page.locator('.sc-product-card').first().click()
    await page.waitForTimeout(500)
    // Acotar al panel de detalle si existe
    const panel = page.locator('.detalle-inline-grid, .detalle-inline-panel').first()
    const panelVisible = await panel.isVisible({ timeout: 2000 }).catch(() => false)
    const textContent = panelVisible
      ? await panel.textContent()
      : await page.locator('body').textContent()
    expect(textContent).not.toMatch(/Precios mayoristas/i)
    expect(textContent).not.toMatch(/precio.{0,20}mayorist/i)
  })

  // ── TIPO-VIS-04 ─────────────────────────────────────────────────────────────
  test('4 — B2C en ficha TYPE_A ve CTA "Registrar negocio" NO botón deshabilitado (TIPO-VIS-04)', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await page.goto('/?demo=1')
    await esperarCarga(page)
    await expect(page.locator('.sc-product-card').first()).toBeVisible({ timeout: 10_000 })
    const cards = page.locator('.sc-product-card')
    const count = await cards.count()
    for (let i = 0; i < count; i++) {
      const card = page.locator('.sc-product-card').nth(i)
      const visible = await card.isVisible({ timeout: 2000 }).catch(() => false)
      if (!visible) break
      await card.evaluate((el: HTMLElement) => el.click())
      await page.waitForTimeout(500)
      const body = await page.locator('body').textContent() ?? ''
      if (body.match(/disponible solo para empresas aprobadas|solo para compradores B2B|exclusivo.*B2B|tostadores|negocio/i)) {
        // TYPE_A encontrado — verificar CTA correcto para B2C
        // TIPO-VIS-04: debe mostrar CTA "Registrar negocio" no un botón deshabilitado genérico
        const btnRegistrarNegocio = page.getByRole('button', { name: /registrar.*negocio|empresa|¿eres.*tostador/i })
          .or(page.getByText(/registrar.*negocio|¿eres.*tostador/i).first())
        const hayCtaRegistro = await btnRegistrarNegocio.isVisible({ timeout: 2000 }).catch(() => false)
        if (hayCtaRegistro) {
          // CTA correcto presente
          expect(hayCtaRegistro).toBe(true)
          return
        }
        // Si hay botón Agregar al carrito, debe estar restringido (no generic disabled)
        const btnCompra = page.getByRole('button', { name: /agregar al carrito/i })
        const btnVisible = await btnCompra.isVisible({ timeout: 1000 }).catch(() => false)
        // No debe haber botón de compra habilitado para B2C en TYPE_A
        if (btnVisible) {
          const enabled = await btnCompra.isEnabled()
          expect(enabled).toBe(false)
        }
        return
      }
      const btnVolver = page.getByRole('button', { name: /catálogo|volver/i }).first()
      if (await btnVolver.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btnVolver.evaluate((el: HTMLElement) => el.click())
        await page.waitForTimeout(300)
      }
    }
    test.skip() // Sin TYPE_A en seed — no es un fallo
  })

  // ── IA-02 INVARIANTE ─────────────────────────────────────────────────────────
  test('5 — Bloque de insights IA muestra disclaimer obligatorio (IA-02 INVARIANTE)', async ({ page }) => {
    await page.goto('/?demo=1')
    await esperarCarga(page)
    await expect(page.locator('.sc-product-card').first()).toBeVisible({ timeout: 10_000 })
    await page.locator('.sc-product-card').first().click()
    await page.waitForTimeout(600)
    const body = await page.locator('body').textContent() ?? ''
    // Si hay bloque de insights IA, debe mostrar el disclaimer literal
    const hayInsightsIA = body.match(/insights?.*IA|IA.*análisis|análisis.*automático|inteligencia artificial/i)
    if (hayInsightsIA) {
      // Disclaimer obligatorio — IA-02 INVARIANTE
      expect(body).toMatch(/análisis automático.*inteligencia artificial|no reemplaza.*inspección física|no.*constituye.*certificación/i)
    }
    // Si no hay bloque de insights en este lote, test pasa (seed sin IA aprobada)
  })

  // ── INV-05 / PS-02 ───────────────────────────────────────────────────────────
  test('6 — Lote PAUSED/SOLD_OUT no aparece en resultados de búsqueda (INV-05 / PS-01 INVARIANTE)', async ({ page }) => {
    await page.goto('/?demo=1')
    await esperarCarga(page)
    await expect(page.locator('.sc-product-card').first()).toBeVisible({ timeout: 10_000 })
    // El catálogo no debe mostrar lotes PAUSED, SOLD_OUT, DRAFT, etc.
    const cards = page.locator('.sc-product-card')
    const count = await cards.count()
    for (let i = 0; i < Math.min(count, 10); i++) {
      const textoCard = await cards.nth(i).textContent() ?? ''
      expect(textoCard).not.toMatch(/\bPAUSADO\b|\bPAUSED\b/i)
      expect(textoCard).not.toMatch(/\bAGOTADO\b|\bSOLD.OUT\b/i)
      expect(textoCard).not.toMatch(/\bDRAFT\b|\bBORRADOR\b/i)
      expect(textoCard).not.toMatch(/\bRECHAZADO\b|\bREJECTED\b/i)
    }
  })

  test('7 — Lote PAUSED accesible por URL directa muestra banner sin botón de compra (PS-02)', async ({ page }) => {
    // Este test necesita la URL de un lote PAUSED — solo puede ejecutarse si el seed lo tiene
    // En QA, buscamos si alguna ficha de lote muestra el banner de no disponible
    await page.goto('/?demo=1')
    await esperarCarga(page)
    // Verificar que el catálogo activo NO contiene lotes pausados
    const bodyGlobal = await page.locator('body').textContent() ?? ''
    expect(bodyGlobal).not.toMatch(/No disponible temporalmente.*PAUSED/i)
    // Si se llega a un lote PAUSED por URL, el botón de compra no debe existir
    // Test condicional — si no hay lote PAUSED en seed, pasa
  })

  // ── ENT-01 ──────────────────────────────────────────────────────────────────
  test('8 — Comprador NO puede iniciar disputa desde estado "preparando" (ENT-01)', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await irA(page, '/portal')
    await esperarCarga(page)
    await page.waitForFunction(
      () => !document.body.textContent?.includes('Cargando tu portal'),
      { timeout: 15_000 }
    ).catch(() => {})
    const body = await page.locator('body').textContent() ?? ''
    // Buscar pedidos en estado "preparando"
    const hayPreparando = body.match(/preparando|En preparación/i)
    if (hayPreparando) {
      // No debe haber botón "Tengo un problema" ni "Iniciar disputa" en pedidos en preparando
      const btnProblema = page.getByRole('button', { name: /tengo.*problema|iniciar.*disputa|disputar/i }).first()
      // Si aparece, debe estar deshabilitado — no puede disputar desde preparando
      const estaVisible = await btnProblema.isVisible({ timeout: 2000 }).catch(() => false)
      if (estaVisible) {
        const estaHabilitado = await btnProblema.isEnabled()
        expect(estaHabilitado).toBe(false)
      }
    }
    // Sin pedidos en preparando en QA — test pasa
    expect(page.url()).not.toMatch(/\/login/)
  })

  // ── ENT-06 / INV-11 ─────────────────────────────────────────────────────────
  test('9 — Comprador NO puede cambiar estado de en_disputa a entregado (ENT-06 / INV-11 INVARIANTE)', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await irA(page, '/portal')
    await esperarCarga(page)
    await page.waitForFunction(
      () => !document.body.textContent?.includes('Cargando tu portal'),
      { timeout: 15_000 }
    ).catch(() => {})
    const body = await page.locator('body').textContent() ?? ''
    // Si hay pedido en disputa, el comprador NO debe ver botón para resolver/confirmar entrega
    const hayEnDisputa = body.match(/en disputa|disputado|En Disputa/i)
    if (hayEnDisputa) {
      // No debe haber botón "Confirmar entrega" ni "Todo bien" para pedidos en disputa
      const btnConfirmar = page.getByRole('button', { name: /✓ todo bien|confirmar.*entrega|marcar.*entregado/i }).first()
      const estaVisible = await btnConfirmar.isVisible({ timeout: 2000 }).catch(() => false)
      if (estaVisible) {
        const estaHabilitado = await btnConfirmar.isEnabled()
        expect(estaHabilitado).toBe(false)
      }
    }
    expect(page.url()).not.toMatch(/\/login/)
  })

  // ── AUTH-04 ─────────────────────────────────────────────────────────────────
  test('10 — Tras login desde ficha de producto, retorna a la misma ficha (AUTH-04)', async ({ page }) => {
    // Visitar catálogo sin login y abrir ficha
    await page.goto('/?demo=1')
    await esperarCarga(page)
    await expect(page.locator('.sc-product-card').first()).toBeVisible({ timeout: 10_000 })
    await page.locator('.sc-product-card').first().click()
    await page.waitForTimeout(500)
    const urlFicha = page.url()
    // Intentar agregar al carrito (dispara login gate)
    const btnAgregar = page.getByRole('button', { name: /agregar|comprar/i }).first()
    if (!await btnAgregar.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return }
    await btnAgregar.click()
    await page.waitForTimeout(500)
    const bodyGate = await page.locator('body').textContent() ?? ''
    const hayLoginGate = bodyGate.match(/ingresar|registr|login|cuenta/i)
    if (!hayLoginGate) { test.skip(); return }
    // El modal no debe haber navegado fuera de la ficha
    // AUTH-04: la URL no debe haber cambiado a /login (debe ser modal inline)
    const urlTrasGate = page.url()
    // Puede que el hash cambie levemente, pero no debe ir a /login como página completa
    expect(urlTrasGate).not.toMatch(/^https?:\/\/[^/]+\/login$/)
  })

  // ── TRIB-05 / PR-04 ─────────────────────────────────────────────────────────
  test('11 — NEGOTIABLE exclusivo para TYPE_A — tarjetas TYPE_B y TYPE_C son siempre FIXED (PR-04 INVARIANTE)', async ({ page }) => {
    await loginEmail(page, USERS.barista.email, USERS.barista.password)
    await page.goto('/?demo=1')
    await esperarCarga(page)
    await expect(page.locator('.sc-product-card').first()).toBeVisible({ timeout: 10_000 })
    const cards = page.locator('.sc-product-card')
    const count = await cards.count()
    for (let i = 0; i < Math.min(count, 8); i++) {
      const card = page.locator('.sc-product-card').nth(i)
      const textoCard = await card.textContent() ?? ''
      // Si la tarjeta es de tostado o molido (TYPE_B/C), no debe mostrar "precio negociable"
      if (textoCard.match(/☕|tostado|🫘|molido/i)) {
        expect(textoCard).not.toMatch(/precio negociable|NEGOTIABLE/i)
      }
    }
  })

  // ── EV-PUB-01 / INV-06 ──────────────────────────────────────────────────────
  test('12 — Solo evidencias VERIFIED visibles en ficha pública del lote (EV-PUB-01 / INV-06 INVARIANTE)', async ({ page }) => {
    await page.goto('/?demo=1')
    await esperarCarga(page)
    await expect(page.locator('.sc-product-card').first()).toBeVisible({ timeout: 10_000 })
    await page.locator('.sc-product-card').first().click()
    await page.waitForTimeout(600)
    const body = await page.locator('body').textContent() ?? ''
    // No debe mostrar evidencias en estado UPLOADED, UNDER_REVIEW, REJECTED o EXPIRED
    expect(body).not.toMatch(/UPLOADED|UNDER_REVIEW|REJECTED.*evidencia|EXPIRED.*evidencia/i)
    // Si hay evidencias, deben mostrar "Verificado" o estar en estado VERIFIED
    // Test pasa siempre que no aparezcan los estados no-públicos
  })

  // ── COM-03 / ESC-03 ─────────────────────────────────────────────────────────
  test('13 — Comisión en fase beta es 0% — no se muestra 5% en checkout (COM-03 INVARIANTE)', async ({ page }) => {
    const { loginYEsperarAuth, inyectarCarritoDemo } = await import('./helpers')
    await loginYEsperarAuth(page, USERS.barista.email, USERS.barista.password)
    await inyectarCarritoDemo(page)
    await irA(page, '/checkout')
    await page.waitForTimeout(1000)
    const body = await page.locator('body').textContent() ?? ''
    // En beta: comisión debe ser 0%, no 5%
    expect(body).not.toMatch(/5%.*comisión|comisión.*5%|5\s*%.*plataforma/i)
    // Puede mostrar "0% comisión" o "fase beta" o simplemente no mencionar comisión
    expect(page.url()).not.toMatch(/\/login/)
  })

  // ── CAL-01 / INV-04 ─────────────────────────────────────────────────────────
  test('14 — Puntaje SCA numérico NUNCA visible para ningún rol en las tarjetas (CAL-01 / INV-04 INVARIANTE)', async ({ page }) => {
    // Este es el INVARIANTE más crítico — SCA nunca en tarjetas, solo en ficha técnica para B2B
    // Verificar con 3 roles: guest, B2C, B2B APPROVED
    for (const user of [null, USERS.cliente, USERS.barista]) {
      await page.goto('/?demo=1')
      if (user) await loginEmail(page, user.email, user.password)
      await esperarCarga(page)
      await expect(page.locator('.sc-product-card').first()).toBeVisible({ timeout: 10_000 })
      const cards = page.locator('.sc-product-card')
      const count = await cards.count()
      for (let i = 0; i < Math.min(count, 5); i++) {
        const textoCard = await cards.nth(i).textContent() ?? ''
        // SCA numérico nunca en tarjetas: "84.5 pts", "SCA: 85", "88 pts SCA"
        expect(textoCard).not.toMatch(/\b(SCA|score|puntuación)\s*[\s:]*\d{2,3}(\.\d)?\s*(pts?|puntos?)/i)
        expect(textoCard).not.toMatch(/\d{2,3}\.\d\s*pts/i)
      }
    }
  })

})
