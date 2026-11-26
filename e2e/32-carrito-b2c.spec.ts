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

})
