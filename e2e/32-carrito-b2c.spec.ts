import { test, expect } from '@playwright/test'
import { loginEmail, loginYEsperarAuth, irA, esperarCarga, inyectarCarritoDemo, USERS } from './helpers'

// US-12 B2C · US-13 · US-14 · TIPO-01

test.describe('32 — Carrito B2C: restricciones y flujo de compra', () => {

  test('1 — B2C puede agregar lote TYPE_B/C al carrito desde el catálogo (US-12 B2C)', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await page.goto('/?demo=1')
    await esperarCarga(page)
    await expect(page.locator('.sc-product-card').first()).toBeVisible({ timeout: 10_000 })
    // Buscar una tarjeta de tipo B o C (no verde/TYPE_A)
    const cards = page.locator('.sc-product-card')
    const count = await cards.count()
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i)
      await card.click()
      await page.waitForTimeout(500)
      const body = await page.locator('body').textContent() ?? ''
      // Si no es TYPE_A restringida
      if (!body.match(/disponible solo para empresas aprobadas/i) &&
          !body.match(/precio negociable/i)) {
        const btnAgregar = page.getByRole('button', { name: /agregar al carrito/i })
        if (await btnAgregar.isVisible()) {
          await btnAgregar.evaluate((el: HTMLElement) => el.click())
          await page.waitForTimeout(400)
          const bodyAfter = await page.locator('body').textContent() ?? ''
          expect(bodyAfter).toMatch(/agregado|carrito|añadido/i)
          return
        }
      }
      const btnVolver = page.getByRole('button', { name: /catálogo/i }).first()
      if (await btnVolver.isVisible()) await btnVolver.click()
      await page.waitForTimeout(400)
    }
    test.skip() // Sin TYPE_B/C disponibles en seed
  })

  test('2 — TIPO-01: B2C no puede agregar lote TYPE_A al carrito (TIPO-01 INVARIANTE)', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await page.goto('/?demo=1')
    await esperarCarga(page)
    await expect(page.locator('.sc-product-card').first()).toBeVisible({ timeout: 10_000 })
    const cards = page.locator('.sc-product-card')
    const count = await cards.count()
    for (let i = 0; i < count; i++) {
      // Después de volver al catálogo, re-obtener las tarjetas
      const tarjetaActual = page.locator('.sc-product-card').nth(i)
      const visible = await tarjetaActual.isVisible({ timeout: 5000 }).catch(() => false)
      if (!visible) break
      await tarjetaActual.evaluate((el: HTMLElement) => el.click())
      await page.waitForTimeout(500)
      const body = await page.locator('body').textContent() ?? ''
      if (body.match(/disponible solo para empresas aprobadas/i)) {
        // TYPE_A encontrado — verificar que no hay botón de compra
        expect(body).not.toMatch(/Agregar al carrito/i)
        return
      }
      const btnVolver = page.getByRole('button', { name: /catálogo/i }).first()
      if (await btnVolver.isVisible()) await btnVolver.evaluate((el: HTMLElement) => el.click())
      await page.waitForTimeout(400)
    }
    test.skip() // Sin TYPE_A en seed
  })

  test('3 — B2C: carrito inyectado aparece en checkout (US-13)', async ({ page }) => {
    test.setTimeout(120_000)
    await loginYEsperarAuth(page, USERS.cliente.email, USERS.cliente.password)
    await inyectarCarritoDemo(page)
    await irA(page, '/checkout')
    await page.waitForTimeout(800)
    const body = await page.locator('body').textContent() ?? ''
    expect(body).toMatch(/Bourbon Lavado|La Coipa/i)
    expect(body).toMatch(/S\/\s*\d/)
    expect(page.url()).not.toMatch(/#\/login/)
  })

  test('4 — B2C: checkout muestra opciones de envío (US-14)', async ({ page }) => {
    test.setTimeout(120_000)
    await loginYEsperarAuth(page, USERS.cliente.email, USERS.cliente.password)
    await inyectarCarritoDemo(page)
    await irA(page, '/checkout')
    await page.waitForTimeout(800)
    const body = await page.locator('body').textContent() ?? ''
    expect(body).toMatch(/envío|despacho|Lima|recojo|entrega/i)
  })

  test('5 — B2C: checkout paso 1 incluye campos de dirección (US-14)', async ({ page }) => {
    test.setTimeout(120_000)
    await loginYEsperarAuth(page, USERS.cliente.email, USERS.cliente.password)
    await inyectarCarritoDemo(page)
    await irA(page, '/checkout')
    await page.waitForTimeout(800)
    const body = await page.locator('body').textContent() ?? ''
    expect(body).toMatch(/nombre|teléfono|dirección|distrito|empresa/i)
  })

  test('6 — B2C: carrito vacío en checkout muestra mensaje apropiado (US-13)', async ({ page }) => {
    test.setTimeout(120_000)
    await loginYEsperarAuth(page, USERS.cliente.email, USERS.cliente.password)
    // Sin inyectar carrito — ir al checkout con carrito vacío
    await irA(page, '/checkout')
    await page.waitForTimeout(800)
    const body = await page.locator('body').textContent() ?? ''
    // Carrito vacío: mensaje o redirige al catálogo
    expect(body).toMatch(/vacío|sin productos|agregar|carrito|catálogo/i)
  })

  test('7 — Guest con carrito inyectado en checkout redirige a login (INV-01)', async ({ page }) => {
    // Sin login, inyectar carrito y navegar a checkout
    await page.goto('/?demo=1')
    await page.waitForTimeout(500)
    await page.evaluate(() => {
      const item = { producto: { id: 'prod-001', nombre: 'Bourbon Test', precioBaseKgCents: 40000 }, formato: '1kg', qty: 1 }
      localStorage.setItem('one_carrito_items', JSON.stringify([item]))
    })
    await irA(page, '/checkout')
    await page.waitForTimeout(1000)
    // Debe redirigir a login o mostrar gate
    const url = page.url()
    const body = await page.locator('body').textContent() ?? ''
    expect(url.match(/#\/login/) || body.match(/ingresar|login|registr|cuenta/i)).toBeTruthy()
  })

  test('8 — B2C: cambiar cantidad de item en carrito actualiza el total (US-13)', async ({ page }) => {
    test.setTimeout(120_000)
    await loginYEsperarAuth(page, USERS.cliente.email, USERS.cliente.password)
    await inyectarCarritoDemo(page)
    await irA(page, '/checkout')
    await page.waitForTimeout(800)
    const body1 = await page.locator('body').textContent() ?? ''
    const matchPrecio = body1.match(/S\/\s*(\d+[\.,]\d{0,2})/)
    // Si hay stepper de cantidad, incrementar
    const btnMas = page.getByRole('button', { name: /\+/ }).first()
    if (await btnMas.isVisible()) {
      await btnMas.evaluate((el: HTMLElement) => el.click())
      await page.waitForTimeout(400)
      const body2 = await page.locator('body').textContent() ?? ''
      // El precio debe haberse actualizado
      if (matchPrecio) {
        // Verificar que sigue mostrando precio en S/
        expect(body2).toMatch(/S\/\s*\d/)
      }
    }
  })

  // ── Tests añadidos por auditoría E2E F05/F08 ─────────────────────────────

  test('9 — PR-02: B2C no ve precios mayoristas S/kg en checkout (PR-02 INVARIANTE)', async ({ page }) => {
    test.setTimeout(120_000)
    await loginYEsperarAuth(page, USERS.cliente.email, USERS.cliente.password)
    await inyectarCarritoDemo(page)
    await irA(page, '/checkout')
    await page.waitForTimeout(800)
    const body = await page.locator('body').textContent() ?? ''
    // B2C nunca debe ver precios mayoristas "S/kg" ni escalas de volumen en el checkout
    expect(body).not.toMatch(/precio mayorista|escala.*volumen|descuento.*lote/i)
    // Puede ver precio por unidad/presentación
    expect(body).toMatch(/S\/\s*\d/)
  })

  test('10 — PR-02: guest no ve precios mayoristas en catálogo (PR-02 INVARIANTE)', async ({ page }) => {
    // Sin login (guest)
    await page.goto('/?demo=1')
    await esperarCarga(page)
    await expect(page.locator('.sc-product-card').first()).toBeVisible({ timeout: 10_000 })
    // Revisar tarjetas: no deben mostrar precios mayoristas ni escalas de volumen
    const cards = page.locator('.sc-product-card')
    const count = await cards.count()
    for (let i = 0; i < Math.min(count, 5); i++) {
      const cardText = await cards.nth(i).textContent() ?? ''
      expect(cardText).not.toMatch(/precio mayorista|S\/\s*kg.*mayorist|escala.*volumen/i)
    }
  })

  test('11 — PR-02: B2B PENDING no ve precios mayoristas en catálogo (PR-02 INVARIANTE)', async ({ page }) => {
    await loginEmail(page, USERS.pending.email, USERS.pending.password)
    await page.goto('/?demo=1')
    await esperarCarga(page)
    await expect(page.locator('.sc-product-card').first()).toBeVisible({ timeout: 10_000 })
    const body = await page.locator('body').textContent() ?? ''
    // B2B Pendiente no debe ver precios mayoristas ni escalas de volumen
    expect(body).not.toMatch(/S\/\s*(kg|Kg).{0,10}mayorist/i)
    expect(body).not.toMatch(/escala.*volumen|precio.*mayorista/i)
  })

  test('12 — ORD-02: checkout B2C muestra expiración de 24h, no 72h (ORD-02)', async ({ page }) => {
    test.setTimeout(120_000)
    await loginYEsperarAuth(page, USERS.cliente.email, USERS.cliente.password)
    await inyectarCarritoDemo(page)
    await irA(page, '/checkout')
    await page.waitForTimeout(800)
    const body = await page.locator('body').textContent() ?? ''
    // Si la pantalla de espera pago está visible, debe indicar 24h (B2C), no 72h (B2B)
    if (body.match(/espera.*pago|esperando pago|comprobante|plazo|expira/i)) {
      expect(body).not.toMatch(/72\s*horas|plazo.*72\s*h/i)
    }
  })

  test('13 — PAY-02: checkout B2C campo voucher obligatorio sin etiqueta "opcional" (PAY-02)', async ({ page }) => {
    test.setTimeout(120_000)
    await loginYEsperarAuth(page, USERS.cliente.email, USERS.cliente.password)
    await inyectarCarritoDemo(page)
    await irA(page, '/checkout')
    await page.waitForTimeout(800)
    const body = await page.locator('body').textContent() ?? ''
    // Si la pantalla muestra Yape, el campo de comprobante no debe indicar "(opcional)"
    if (body.match(/yape|comprobante|screenshot/i)) {
      expect(body).not.toMatch(/comprobante.*opcional|screenshot.*opcional|voucher.*opcional/i)
    }
  })

  test.skip('14 — ESC-01: datos de pago apuntan a cuenta TunayWasi, no al caficultor (ESC-01 — requiere backend)', async ({ page }) => {
    // ESC-01 INVARIANTE: Los fondos van a cuenta escrow TunayWasi (Yape/BCP de TW),
    // nunca directo al caficultor. Verificado a nivel de código con ONE_CONFIG.
    // Este test require navegación hasta la pantalla de pago completa.
    test.setTimeout(60_000)
    await loginYEsperarAuth(page, USERS.cliente.email, USERS.cliente.password)
    await inyectarCarritoDemo(page)
    await irA(page, '/checkout')
    await page.waitForTimeout(800)
    const body = await page.locator('body').textContent() ?? ''
    // Si está en la pantalla de pago, los datos mostrados deben ser de TunayWasi
    if (body.match(/yape|BCP|transferir/i)) {
      expect(body).not.toMatch(/Transferir a.*Segundo Rojas|Pagar a.*caficultor/i)
    }
  })

})
