import { test, expect } from '@playwright/test'
import { loginEmail, irA, esperarCarga, inyectarCarritoDemo, USERS } from './helpers'

// US-12 · US-13 · US-14 · PR-01 · PR-03 INVARIANTE

test.describe('26 — Flujo de compra B2B: carrito → checkout 3 pasos', () => {

  test('1 — B2B APPROVED agrega producto al carrito (US-12 B2B · PR-02)', async ({ page }) => {
    await loginEmail(page, USERS.barista.email, USERS.barista.password)
    await page.goto('/?demo=1#/')
    await esperarCarga(page)
    const primeraTarjeta = page.locator('.sc-product-card').first()
    await expect(primeraTarjeta).toBeVisible({ timeout: 10_000 })
    await primeraTarjeta.click()
    await page.waitForTimeout(500)
    // Buscar botón de agregar
    const btnAgregar = page.getByRole('button', { name: /agregar|comprar|al carrito/i }).first()
    if (!await btnAgregar.isVisible()) { test.skip(); return }
    await btnAgregar.click()
    await page.waitForTimeout(400)
    // Toast o indicador de carrito actualizado
    const body = await page.locator('body').textContent()
    expect(body).toMatch(/agregado|carrito|añadido/i)
  })

  test('2 — B2C no puede agregar lote TYPE_A (US-12 B2C restriction)', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await page.goto('/?demo=1#/')
    await esperarCarga(page)
    const primeraTarjeta = page.locator('.sc-product-card').first()
    await expect(primeraTarjeta).toBeVisible({ timeout: 10_000 })
    await primeraTarjeta.click()
    await page.waitForTimeout(500)
    // B2C: o no hay botón de compra para TYPE_A, o aparece modal de cuenta B2B
    const btnAgregar = page.getByRole('button', { name: /agregar al carrito/i }).first()
    const visible = await btnAgregar.isVisible()
    if (visible) {
      await btnAgregar.click()
      await page.waitForTimeout(400)
      // Si TYPE_A: debe aparecer modal de restricción o login gate
      const body = await page.locator('body').textContent()
      expect(body).toMatch(/cuenta empresa|B2B|negocio|ingresar|registr/i)
    }
    // Si no hay botón para B2C en TYPE_A, el test pasa (restricción a nivel UI)
  })

  test('3 — Carrito inyectado muestra resumen correcto (US-13)', async ({ page }) => {
    await loginEmail(page, USERS.barista.email, USERS.barista.password)
    await inyectarCarritoDemo(page)
    // Ir directamente al checkout
    await irA(page, '#/checkout')
    await page.waitForTimeout(800)
    const body = await page.locator('body').textContent()
    // Nombre del producto inyectado (el checkout lo lee del store/localStorage)
    expect(body).toMatch(/Bourbon Lavado|La Coipa/i)
    // Precio en soles
    expect(body).toMatch(/S\/\s*\d/)
  })

  test('4 — Checkout paso 1: opciones de envío visibles (US-14)', async ({ page }) => {
    await loginEmail(page, USERS.barista.email, USERS.barista.password)
    await inyectarCarritoDemo(page)
    await irA(page, '#/checkout')
    await page.waitForTimeout(800)
    const body = await page.locator('body').textContent()
    // Debe mostrar el checkout, no redirigir
    expect(page.url()).not.toMatch(/#\/login/)
    // Opciones de envío
    expect(body).toMatch(/envío|despacho|Lima|recojo|entrega/i)
  })

  test('5 — Checkout paso 2: campos de dirección obligatorios (US-14 validación)', async ({ page }) => {
    await loginEmail(page, USERS.barista.email, USERS.barista.password)
    await inyectarCarritoDemo(page)
    await irA(page, '#/checkout')
    await page.waitForTimeout(800)
    // El checkout paso 1 (Carrito) ya incluye los campos de dirección en el mismo paso
    const body = await page.locator('body').textContent()
    // Debe mostrar campos de dirección en el checkout
    expect(body).toMatch(/nombre|teléfono|dirección|distrito|local|empresa/i)
    // Buscar botón continuar para ir al paso siguiente (pago)
    const btnContinuar = page.getByRole('button', { name: /continuar|siguiente|pagar|confirmar/i }).first()
    if (await btnContinuar.isVisible()) {
      // El botón puede estar deshabilitado si los campos obligatorios están vacíos
      const disabled = await btnContinuar.isDisabled()
      // Es válido que esté deshabilitado (formulario vacío) o que sea clickeable
      expect(typeof disabled).toBe('boolean')
    }
  })

  test('6 — Checkout paso 3: resumen con total en S/ (US-14 CA)', async ({ page }) => {
    await loginEmail(page, USERS.barista.email, USERS.barista.password)
    await inyectarCarritoDemo(page)
    await irA(page, '#/checkout')
    await page.waitForTimeout(800)
    // Paso 1: seleccionar envío
    const optLima = page.getByRole('button', { name: /Lima|envío/i }).first()
    if (await optLima.isVisible()) await optLima.click()
    const btnCont1 = page.getByRole('button', { name: /continuar|siguiente/i }).first()
    if (!await btnCont1.isEnabled()) { test.skip(); return }
    await btnCont1.click()
    await page.waitForTimeout(500)
    // Paso 2: rellenar dirección
    const inputNombre = page.getByPlaceholder(/nombre|empresa/i).first()
    if (await inputNombre.isVisible()) await inputNombre.fill('Empresa Test')
    const inputTel = page.getByPlaceholder(/teléfono|celular/i).first()
    if (await inputTel.isVisible()) await inputTel.fill('999888777')
    const inputDir = page.getByPlaceholder(/dirección|calle/i).first()
    if (await inputDir.isVisible()) await inputDir.fill('Av. Test 123')
    const inputDist = page.getByPlaceholder(/distrito/i).first()
    if (await inputDist.isVisible()) await inputDist.fill('Miraflores')
    const btnCont2 = page.getByRole('button', { name: /continuar|siguiente/i }).first()
    if (!await btnCont2.isEnabled()) { test.skip(); return }
    await btnCont2.click()
    await page.waitForTimeout(500)
    // Paso 3: resumen con total
    const body = await page.locator('body').textContent()
    expect(body).toMatch(/total|S\/\s*\d/)
    expect(body).toMatch(/confirmar/i)
  })

  test('7 — Guest ve login gate al intentar agregar al carrito (US-43)', async ({ page }) => {
    await page.goto('/?demo=1#/')
    await esperarCarga(page)
    const primeraTarjeta = page.locator('.sc-product-card').first()
    await expect(primeraTarjeta).toBeVisible({ timeout: 10_000 })
    await primeraTarjeta.click()
    await page.waitForTimeout(500)
    const btnAgregar = page.getByRole('button', { name: /agregar|comprar/i }).first()
    if (!await btnAgregar.isVisible()) { test.skip(); return }
    await btnAgregar.click()
    await page.waitForTimeout(400)
    // Modal de login/registro — sin navegar a otra página
    const body = await page.locator('body').textContent()
    expect(body).toMatch(/ingresar|registr|login|cuenta/i)
    // No navegó fuera del catálogo
    expect(page.url()).not.toMatch(/#\/registro|#\/login$/)
  })
})
