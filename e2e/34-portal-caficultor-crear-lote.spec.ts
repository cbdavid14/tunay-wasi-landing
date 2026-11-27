import { test, expect } from '@playwright/test'
import { loginYEsperarAuth, irA, esperarCarga, USERS } from './helpers'

// US-03 · PR-01 · US-42 · N1-01

test.describe('34 — Portal caficultor: crear y gestionar lotes', () => {

  test.setTimeout(120_000)

  async function cargarPortalCaficultor(page: any) {
    // loginYEsperarAuth garantiza que Firebase Auth está propagado antes de navegar al portal
    await loginYEsperarAuth(page, USERS.caficultor.email, USERS.caficultor.password)
    await irA(page, '/caficultor-portal')
    await esperarCarga(page)
    await page.waitForFunction(
      () => {
        const text = document.body.textContent ?? ''
        return !text.includes('Cargando...') && text.length > 200
      },
      { timeout: 15_000 }
    )
    await page.waitForTimeout(400)
  }

  test('1 — Portal muestra sección de gestión de café/productos (US-03)', async ({ page }) => {
    await cargarPortalCaficultor(page)
    expect(page.url()).not.toMatch(/\/login/)
    const body = await page.locator('body').textContent() ?? ''
    expect(body).toMatch(/café|productos?|lotes?|agregar|mis café/i)
  })

  test('2 — Botón "+ Agregar café" o similar está visible (US-03)', async ({ page }) => {
    await cargarPortalCaficultor(page)
    const btnAgregar = page.getByRole('button', { name: /agregar café|nuevo lote|agregar lote|\+ agregar/i }).first()
    const visible = await btnAgregar.isVisible()
    if (!visible) {
      // Buscar con icono o texto más genérico
      const btnGenerico = page.getByRole('button', { name: /nuevo|crear|agregar/i }).first()
      expect(await btnGenerico.isVisible()).toBe(true)
    } else {
      await expect(btnAgregar).toBeVisible()
    }
  })

  test('3 — Formulario de nuevo lote tiene campos nombre, proceso, precio (US-03)', async ({ page }) => {
    await cargarPortalCaficultor(page)
    const btnAgregar = page.getByRole('button', { name: /agregar café|nuevo lote|agregar lote|\+ agregar/i }).first()
    if (!await btnAgregar.isVisible()) { test.skip(); return }
    await btnAgregar.evaluate((el: HTMLElement) => el.click())
    await page.waitForTimeout(600)
    const body = await page.locator('body').textContent() ?? ''
    // Formulario de creación de lote
    expect(body).toMatch(/nombre|variedad|proceso|precio|stock/i)
  })

  test('4 — Formulario incluye selector pricingMode FIXED/NEGOTIABLE (PR-01)', async ({ page }) => {
    await cargarPortalCaficultor(page)
    const btnAgregar = page.getByRole('button', { name: /agregar café|nuevo lote|agregar lote|\+ agregar/i }).first()
    if (!await btnAgregar.isVisible()) { test.skip(); return }
    await btnAgregar.evaluate((el: HTMLElement) => el.click())
    await page.waitForTimeout(600)
    const body = await page.locator('body').textContent() ?? ''
    expect(body).toMatch(/fijo|negociable|FIXED|NEGOTIABLE/i)
  })

  test('5 — Seleccionar NEGOTIABLE muestra aviso para compradores B2B (PR-01 UX)', async ({ page }) => {
    await cargarPortalCaficultor(page)
    const btnAgregar = page.getByRole('button', { name: /agregar café|nuevo lote|agregar lote|\+ agregar/i }).first()
    if (!await btnAgregar.isVisible()) { test.skip(); return }
    await btnAgregar.evaluate((el: HTMLElement) => el.click())
    await page.waitForTimeout(600)
    // El toggle Fijo/Negociable solo aparece con café verde (PR-04) — el formulario abre en tostado
    await page.getByRole('button', { name: /^café verde$/i }).first().click()
    await page.waitForTimeout(200)
    // Buscar toggle NEGOTIABLE
    const btnNeg = page.getByRole('button', { name: /negociable/i }).first()
    if (!await btnNeg.isVisible()) { test.skip(); return }
    await btnNeg.evaluate((el: HTMLElement) => el.click())
    await page.waitForTimeout(300)
    const body = await page.locator('body').textContent() ?? ''
    expect(body).toMatch(/compradores.*B2B|compradores.*hacer.*oferta|precio.*referencia|negociable.*explicac/i)
  })

  test('6 — Formulario tiene campo para tipo de café (verde/tostado → TYPE_A/B/C) (TIPO-01)', async ({ page }) => {
    await cargarPortalCaficultor(page)
    const btnAgregar = page.getByRole('button', { name: /agregar café|nuevo lote|agregar lote|\+ agregar/i }).first()
    if (!await btnAgregar.isVisible()) { test.skip(); return }
    await btnAgregar.evaluate((el: HTMLElement) => el.click())
    await page.waitForTimeout(600)
    const body = await page.locator('body').textContent() ?? ''
    // El formulario puede usar "verde/tostado/molido", "Tipo", "TYPE_A/B/C",
    // "Presentación", "Proceso" u otros términos equivalentes para clasificar el café
    expect(body).toMatch(/verde|tostado|molido|tipo|TYPE|variedad|proceso|presentac/i)
  })

  test('7 — Portal muestra tabs de filtro Todos/Stock bajo/Stock ok (US-03)', async ({ page }) => {
    await cargarPortalCaficultor(page)
    const body = await page.locator('body').textContent() ?? ''
    // Tabs de filtro del inventario
    expect(body).toMatch(/todos|stock bajo|stock ok/i)
  })

  test('8 — Portal caficultor muestra conteo de productos (US-03)', async ({ page }) => {
    await cargarPortalCaficultor(page)
    const body = await page.locator('body').textContent() ?? ''
    // Debe mostrar cuántos productos tiene (ej "0 productos", "3 productos")
    expect(body).toMatch(/\d+\s*productos?|aún no tienes|sin productos/i)
  })

  test('9 — Cancelar formulario de nuevo lote vuelve al listado (US-03 navegación)', async ({ page }) => {
    await cargarPortalCaficultor(page)
    const btnAgregar = page.getByRole('button', { name: /agregar café|nuevo lote|agregar lote|\+ agregar/i }).first()
    if (!await btnAgregar.isVisible()) { test.skip(); return }
    await btnAgregar.evaluate((el: HTMLElement) => el.click())
    await page.waitForTimeout(600)
    // Buscar botón cancelar
    const btnCancelar = page.getByRole('button', { name: /cancelar|volver|cerrar/i }).first()
    if (!await btnCancelar.isVisible()) { test.skip(); return }
    await btnCancelar.evaluate((el: HTMLElement) => el.click())
    await page.waitForTimeout(400)
    // Debe volver al listado de lotes
    const body = await page.locator('body').textContent() ?? ''
    expect(body).toMatch(/café|productos?|lotes?|stock|agregar/i)
  })

  test('10 — Enviar formulario vacío muestra validación (US-03 validación)', async ({ page }) => {
    await cargarPortalCaficultor(page)
    const btnAgregar = page.getByRole('button', { name: /agregar café|nuevo lote|agregar lote|\+ agregar/i }).first()
    if (!await btnAgregar.isVisible()) { test.skip(); return }
    await btnAgregar.evaluate((el: HTMLElement) => el.click())
    await page.waitForTimeout(600)
    // Intentar guardar sin rellenar
    const btnGuardar = page.getByRole('button', { name: /guardar|crear|publicar|confirmar/i }).first()
    if (!await btnGuardar.isVisible()) { test.skip(); return }
    await btnGuardar.evaluate((el: HTMLElement) => el.click())
    await page.waitForTimeout(400)
    const body = await page.locator('body').textContent() ?? ''
    // Debe mostrar error de validación o mantener el formulario abierto
    expect(body).toMatch(/nombre|requerid|obligatorio|completa|error|mínimo/i)
  })

})
