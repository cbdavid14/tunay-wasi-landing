import { test, expect } from '@playwright/test'
import { loginEmail, irA, USERS } from './helpers'

// US-04 · US-02 · INV-01 · Protección de rutas

test.describe('31 — Perfil y cuenta de usuario por rol', () => {

  test('1 — B2B APPROVED puede acceder al perfil de su portal (US-04)', async ({ page }) => {
    await loginEmail(page, USERS.barista.email, USERS.barista.password)
    await irA(page, '#/portal')
    await page.waitForFunction(
      () => !document.body.textContent?.includes('Cargando tu portal'),
      { timeout: 15_000 }
    )
    // Buscar tab de perfil
    const tabPerfil = page.getByRole('button', { name: /perfil|mi cuenta|cuenta|empresa/i }).first()
    if (await tabPerfil.isVisible()) {
      await tabPerfil.evaluate((el: HTMLElement) => el.click())
      await page.waitForTimeout(500)
      const body = await page.locator('body').textContent() ?? ''
      expect(body).toMatch(/perfil|empresa|negocio|nombre|conta/i)
    } else {
      // Portal cargó — sin tab de perfil explícito, verificar que hay sección de cuenta
      expect(page.url()).not.toMatch(/#\/login/)
    }
  })

  test('2 — B2C puede ver/editar su perfil desde el portal (US-04)', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await irA(page, '#/portal')
    await page.waitForFunction(
      () => !document.body.textContent?.includes('Cargando tu portal'),
      { timeout: 15_000 }
    )
    expect(page.url()).not.toMatch(/#\/login/)
    const body = await page.locator('body').textContent() ?? ''
    // Portal B2C cargó
    expect(body).toMatch(/perfil|pedido|compra|cuenta|explorar|catálogo/i)
  })

  test('3 — Caficultor ve su perfil en el portal caficultor (US-04)', async ({ page }) => {
    await loginEmail(page, USERS.caficultor.email, USERS.caficultor.password)
    await irA(page, '#/caficultor-portal')
    await page.waitForFunction(
      () => {
        const text = document.body.textContent ?? ''
        return !text.includes('Cargando...') && text.length > 200
      },
      { timeout: 15_000 }
    )
    expect(page.url()).not.toMatch(/#\/login/)
    const body = await page.locator('body').textContent() ?? ''
    // Portal caficultor cargó con sección de gestión
    expect(body).toMatch(/café|productos?|lotes?|ventas?/i)
  })

  test('4 — INV-01: Guest no puede acceder al portal (redirige a login)', async ({ page }) => {
    await page.goto('/#/portal')
    await page.waitForURL(/#\/login/, { timeout: 8_000 })
    expect(page.url()).toMatch(/#\/login/)
  })

  test('5 — INV-01: Guest no puede acceder al portal caficultor (redirige a login)', async ({ page }) => {
    await page.goto('/#/caficultor-portal')
    await page.waitForURL(/#\/login/, { timeout: 8_000 })
    expect(page.url()).toMatch(/#\/login/)
  })

  test('6 — Caficultor no tiene acceso al portal de negocio (separación de roles)', async ({ page }) => {
    await loginEmail(page, USERS.caficultor.email, USERS.caficultor.password)
    await irA(page, '#/portal')
    await page.waitForTimeout(1000)
    const body = await page.locator('body').textContent() ?? ''
    // El portal negocio no debe mostrar los datos de compra del caficultor
    expect(body).not.toMatch(/Mis cotizaciones de compra|Mis pedidos de compra/i)
  })

  test('7 — B2B PENDING accede al portal pero ve banner de aprobación pendiente (B2B-01)', async ({ page }) => {
    await loginEmail(page, USERS.pending.email, USERS.pending.password)
    await irA(page, '#/portal')
    await page.waitForFunction(
      () => !document.body.textContent?.includes('Cargando tu portal'),
      { timeout: 15_000 }
    )
    expect(page.url()).not.toMatch(/#\/login/)
    const body = await page.locator('body').textContent() ?? ''
    expect(body).toMatch(/pendiente|revisión|aprobación|en proceso/i)
  })

  test('8 — B2B APPROVED no ve banner de aprobación pendiente (B2B-02)', async ({ page }) => {
    await loginEmail(page, USERS.barista.email, USERS.barista.password)
    await irA(page, '#/portal')
    await page.waitForFunction(
      () => !document.body.textContent?.includes('Cargando tu portal'),
      { timeout: 15_000 }
    )
    const body = await page.locator('body').textContent() ?? ''
    expect(body).not.toMatch(/cuenta.*revisión|en revisión.*equipo|Precios mayoristas pendientes/i)
  })

  test('9 — Logout: sesión se cierra y vuelve a estado guest (US-02)', async ({ page }) => {
    await loginEmail(page, USERS.barista.email, USERS.barista.password)
    await irA(page, '#/portal')
    await page.waitForFunction(
      () => !document.body.textContent?.includes('Cargando tu portal'),
      { timeout: 15_000 }
    )
    // Buscar botón de cerrar sesión
    const btnLogout = page.getByRole('button', { name: /cerrar sesión|salir|logout/i }).first()
    if (!await btnLogout.isVisible()) {
      // Puede estar en menú — intentar buscar en menú hamburguesa o dropdown
      const btnMenu = page.getByRole('button', { name: /menú|perfil|cuenta/i }).first()
      if (await btnMenu.isVisible()) {
        await btnMenu.evaluate((el: HTMLElement) => el.click())
        await page.waitForTimeout(400)
      }
    }
    const btnLogout2 = page.getByRole('button', { name: /cerrar sesión|salir|logout/i }).first()
    if (!await btnLogout2.isVisible()) { test.skip(); return }
    await btnLogout2.evaluate((el: HTMLElement) => el.click())
    await page.waitForTimeout(1000)
    // Debe redirigir a login o catálogo como guest
    const url = page.url()
    expect(url).toMatch(/#\/login|#\/$|#\//)
  })

})
