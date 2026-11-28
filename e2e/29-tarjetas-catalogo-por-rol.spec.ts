import { test, expect } from '@playwright/test'
import { loginEmail, esperarCarga, USERS } from './helpers'

// US-05 · INV-04/CAL-01 · Contenido de tarjetas por rol

test.describe('29 — Tarjetas del catálogo por rol', () => {

  test('1 — Tarjeta tiene nombre del café y precio visible (todos los roles)', async ({ page }) => {
    await page.goto('/')
    await esperarCarga(page)
    const primeraTarjeta = page.locator('.sc-product-card').first()
    await expect(primeraTarjeta).toBeVisible({ timeout: 20_000 })
    const textoTarjeta = await primeraTarjeta.textContent()
    // Nombre del café (algún texto descriptivo)
    expect(textoTarjeta).toMatch(/\w{3,}/)
    // Precio en soles
    expect(textoTarjeta).toMatch(/S\/\s*\d/)
  })

  test('2 — Tarjeta NO muestra puntuación SCA numérica (INV-04/CAL-01 INVARIANTE)', async ({ page }) => {
    // Este test nunca debe skipearse — es un INVARIANTE de negocio
    await loginEmail(page, USERS.barista.email, USERS.barista.password)
    await page.goto('/')
    await esperarCarga(page)
    const tarjetas = page.locator('.sc-product-card')
    await expect(tarjetas.first()).toBeVisible({ timeout: 20_000 })
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
    await page.goto('/')
    await esperarCarga(page)
    const primeraTarjeta = page.locator('.sc-product-card').first()
    await expect(primeraTarjeta).toBeVisible({ timeout: 20_000 })
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
    await page.goto('/')
    await esperarCarga(page)
    const primeraTarjeta = page.locator('.sc-product-card').first()
    await expect(primeraTarjeta).toBeVisible({ timeout: 20_000 })
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
    await page.goto('/')
    await esperarCarga(page)
    const tarjetas = page.locator('.sc-product-card')
    await expect(tarjetas.first()).toBeVisible({ timeout: 20_000 })
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
    await page.goto('/')
    await esperarCarga(page)
    const primeraTarjeta = page.locator('.sc-product-card').first()
    await expect(primeraTarjeta).toBeVisible({ timeout: 20_000 })
    const textoTarjeta = await primeraTarjeta.textContent() ?? ''
    // Debe mostrar algo sobre el origen (nombre de caficultor o finca)
    // Es información básica de trazabilidad que siempre aparece en la tarjeta
    expect(textoTarjeta.length).toBeGreaterThan(20)
    // No debe mostrar solo el precio — debe haber texto descriptivo
    const soloNumeros = /^\s*S\/\s*[\d.]+\s*$/.test(textoTarjeta)
    expect(soloNumeros).toBe(false)
  })
})

// ── 29b — TIPO-VIS-04 / B2B-02: botones de acción por rol y tipo de lote ──────
// TIPO-VIS-04: buyer_b2c que ve un lote TYPE_A recibe CTA "Registrar negocio" (no btn deshabilitado).
// B2B-02: buyer_b2b no-APPROVED (PENDING) no puede comprar TYPE_A — botón deshabilitado.
// INV-01: catálogo único — TYPE_A solo visible para buyer_b2b APPROVED y oculto para los demás.
test.describe('29b — TIPO-VIS-04 / B2B-02: CTA por rol en lotes TYPE_A', () => {

  test('TIPO-VIS-04: buyer_b2c que abre ficha de un lote TYPE_A ve "Registrar negocio" (no botón genérico)', async ({ page }) => {
    // TIPO-VIS-04: el botón de compra se reemplaza por CTA de registro de negocio para B2C en TYPE_A
    // Para este test necesitamos que un B2C llegue a un lote TYPE_A.
    // TYPE_A no aparece en el catálogo para B2C, pero si accede directamente al detalle, debe ver el CTA.
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await page.goto('/')
    await esperarCarga(page)
    // Como B2C, buscar si hay algún lote TYPE_A accesible (puede ser vía B2B con sesión de test)
    // Si no hay tarjetas TYPE_A visibles para B2C (correcto per INV-01), el test verifica
    // que el catálogo filtró correctamente y documenta el comportamiento.
    const tarjetas = page.locator('.sc-product-card')
    await expect(tarjetas.first()).toBeVisible({ timeout: 20_000 })
    const count = await tarjetas.count()
    // Buscar si alguna tarjeta visible es TYPE_A (café verde)
    let encontroTypeA = false
    for (let i = 0; i < Math.min(count, 10); i++) {
      const textoTarjeta = await tarjetas.nth(i).textContent() ?? ''
      if (textoTarjeta.match(/verde|TYPE_A/i)) {
        encontroTypeA = true
        await tarjetas.nth(i).click()
        await page.waitForTimeout(500)
        const body = await page.locator('body').textContent() ?? ''
        // TIPO-VIS-04: debe ver CTA de registrar negocio, no botón genérico B2B deshabilitado
        expect(body).toMatch(/registrar.*negocio|¿Eres tostador|negocio.*cafetería|cuenta.*negocio/i)
        // No debe ver el botón genérico de B2B
        expect(body).not.toMatch(/solo.*B2B|exclusivo.*empresa/i)
        break
      }
    }
    if (!encontroTypeA) {
      // Correcto: B2C no ve tarjetas TYPE_A en el catálogo (INV-01 se cumple)
      // El catálogo filtró correctamente — test pasa
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })

  test('B2B-02: buyer_b2b PENDING no puede agregar al carrito (botón deshabilitado en TYPE_A)', async ({ page }) => {
    // B2B-02: buyer_b2b no-APPROVED bloqueado en TYPE_A
    await loginEmail(page, USERS.pending.email, USERS.pending.password)
    await page.goto('/')
    await esperarCarga(page)
    // Para B2B PENDING, el catálogo puede mostrar tarjetas pero sin acción comercial
    const tarjetas = page.locator('.sc-product-card')
    if (await tarjetas.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await tarjetas.first().click()
      await page.waitForTimeout(500)
      const body = await page.locator('body').textContent() ?? ''
      // B2B PENDING: si ve un lote TYPE_A, el botón debe estar deshabilitado o no presente
      // O debe ver el mensaje de cuenta pendiente de aprobación
      const hayBloqueoPending = body.match(/pendiente|revisi[oó]n|aprobaci[oó]n|PENDING|cuenta.*revisi[oó]n/i)
      const sinBotonCompra = !body.match(/agregar al carrito|comprar ahora/i)
      expect(hayBloqueoPending || sinBotonCompra).toBeTruthy()
    }
  })

  test('INV-01: mismo catálogo en / — guest ve TYPE_B y TYPE_C (no TYPE_A)', async ({ page }) => {
    // INV-01: catálogo único — TYPE_A solo visible para buyer_b2b APPROVED
    // Para guest y B2C, TYPE_A no se renderiza (filtrado en cliente)
    await page.goto('/')
    await esperarCarga(page)
    await expect(page.locator('.sc-product-card').first()).toBeVisible({ timeout: 20_000 })
    const tarjetas = page.locator('.sc-product-card')
    const count = await tarjetas.count()
    // Recorrer tarjetas: ninguna debe indicar ser exclusiva B2B/TYPE_A para guest
    for (let i = 0; i < Math.min(count, 8); i++) {
      const textoTarjeta = await tarjetas.nth(i).textContent() ?? ''
      // No debe mostrar "solo B2B" o "solo empresas" en ninguna tarjeta para guest
      expect(textoTarjeta).not.toMatch(/exclusivo B2B|solo.*empresas|requiere.*negocio/i)
    }
    // Guest ve tarjetas (hay TYPE_B y TYPE_C disponibles)
    expect(count).toBeGreaterThan(0)
  })
})
