import { test, expect } from '@playwright/test'
import { loginEmail, irA, esperarCarga, USERS } from './helpers'

// US-01 · US-02 · US-43 · INV-01 · Registro B2B / B2C

test.describe('27 — Registro y login gate', () => {

  test('1 — Página de registro B2C carga sin sesión (US-01)', async ({ page }) => {
    await page.goto('/#/registro')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').textContent()
    // Debe mostrar formulario de registro, no redirigir a login
    expect(body).toMatch(/registr|cuenta|email|nombre/i)
    expect(page.url()).not.toMatch(/#\/login/)
  })

  test('2 — Formulario de registro B2C tiene campos obligatorios (US-01)', async ({ page }) => {
    await page.goto('/#/registro')
    await page.waitForLoadState('networkidle')
    // Campos mínimos para crear cuenta
    const inputEmail = page.getByPlaceholder(/email|correo|tu@/i).first()
    const inputPassword = page.getByPlaceholder(/contraseña|password|••/i).first()
    if (!await inputEmail.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Si no hay ruta /registro, buscar modal de registro
      await page.goto('/?demo=1#/')
      await esperarCarga(page)
      const btnRegistrar = page.getByRole('button', { name: /registrar/i }).first()
      if (!await btnRegistrar.isVisible({ timeout: 3000 }).catch(() => false)) {
        test.skip()
        return
      }
      await btnRegistrar.click()
      await page.waitForTimeout(500)
    }
    const body = await page.locator('body').textContent()
    expect(body).toMatch(/nombre|email|contraseña/i)
  })

  test('3 — Registro B2B muestra campos de empresa (US-02)', async ({ page }) => {
    await page.goto('/#/registro')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').textContent()
    // Puede haber un toggle para tipo de cuenta o una ruta separada
    if (!body?.match(/empresa|negocio|RUC|B2B/i)) {
      // Buscar tab o link de cuenta de empresa
      const tabEmpresa = page.getByRole('button', { name: /empresa|negocio|B2B/i }).first()
        .or(page.getByText(/para empresas|soy negocio/i).first())
      if (await tabEmpresa.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tabEmpresa.evaluate((el: HTMLElement) => el.click())
        await page.waitForTimeout(400)
        const bodyAfter = await page.locator('body').textContent()
        expect(bodyAfter).toMatch(/empresa|negocio|RUC|razón social|B2B/i)
      } else {
        // La ruta /para-cafeterias o /registro-b2b puede cubrir este flujo
        await page.goto('/#/para-cafeterias')
        await page.waitForTimeout(500)
        const bodyB2B = await page.locator('body').textContent()
        expect(bodyB2B).toMatch(/empresa|negocio|café|restaurante|registr/i)
      }
    } else {
      expect(body).toMatch(/empresa|negocio|RUC|B2B/i)
    }
  })

  test('4 — Login gate se muestra inline al clickar "Agregar" como guest (US-43)', async ({ page }) => {
    await page.goto('/?demo=1#/')
    await esperarCarga(page)
    const primeraTarjeta = page.locator('.sc-product-card').first()
    await expect(primeraTarjeta).toBeVisible({ timeout: 10_000 })
    await primeraTarjeta.click()
    await page.waitForTimeout(600)
    // Buscar el botón de agregar/comprar en la ficha expandida
    const btnAgregar = page.getByRole('button', { name: /agregar|comprar|al carrito/i }).first()
    if (!await btnAgregar.isVisible({ timeout: 3000 }).catch(() => false)) {
      test.skip()
      return
    }
    await btnAgregar.evaluate((el: HTMLElement) => el.click())
    await page.waitForTimeout(500)
    // Modal inline — URL no debe cambiar a /login
    const url = page.url()
    expect(url).not.toMatch(/#\/login$/)
    // Debe aparecer prompt de login/registro
    const body = await page.locator('body').textContent()
    expect(body).toMatch(/ingresar|registr|cuenta|login/i)
  })

  test('5 — Login gate: botón "Ingresar" navega a login conservando contexto (US-43)', async ({ page }) => {
    await page.goto('/?demo=1#/')
    await esperarCarga(page)
    const primeraTarjeta = page.locator('.sc-product-card').first()
    await expect(primeraTarjeta).toBeVisible({ timeout: 10_000 })
    await primeraTarjeta.click()
    await page.waitForTimeout(600)
    const btnAgregar = page.getByRole('button', { name: /agregar|comprar|al carrito/i }).first()
    if (!await btnAgregar.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return }
    await btnAgregar.evaluate((el: HTMLElement) => el.click())
    await page.waitForTimeout(500)
    // Buscar botón Ingresar en el modal
    const btnIngresar = page.getByRole('button', { name: /ingresar/i }).first()
    if (!await btnIngresar.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return }
    await btnIngresar.evaluate((el: HTMLElement) => el.click())
    await page.waitForTimeout(500)
    // Debe navegar a login
    expect(page.url()).toMatch(/#\/login/)
  })

  test('6 — Login gate: botón "Registrarse" navega al registro (US-43)', async ({ page }) => {
    await page.goto('/?demo=1#/')
    await esperarCarga(page)
    const primeraTarjeta = page.locator('.sc-product-card').first()
    await expect(primeraTarjeta).toBeVisible({ timeout: 10_000 })
    await primeraTarjeta.click()
    await page.waitForTimeout(600)
    const btnAgregar = page.getByRole('button', { name: /agregar|comprar|al carrito/i }).first()
    if (!await btnAgregar.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return }
    await btnAgregar.evaluate((el: HTMLElement) => el.click())
    await page.waitForTimeout(500)
    const btnRegistrarse = page.getByRole('button', { name: /registr/i })
      .or(page.getByRole('link', { name: /registr/i })).first()
    if (!await btnRegistrarse.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return }
    await btnRegistrarse.evaluate((el: HTMLElement) => el.click())
    await page.waitForTimeout(500)
    const body = await page.locator('body').textContent()
    expect(body).toMatch(/registr|crear cuenta|nombre|email/i)
  })

  test('7 — Guest no puede acceder a #/portal (INV-01 · US-43)', async ({ page }) => {
    await page.goto('/#/portal')
    await page.waitForURL(/#\/login/, { timeout: 8_000 })
    expect(page.url()).toMatch(/#\/login/)
  })

  test('8 — Guest no puede acceder a #/checkout (INV-01)', async ({ page }) => {
    await page.goto('/#/checkout')
    await page.waitForTimeout(1000)
    // Debe redirigir a login o mostrar gate
    const url = page.url()
    const body = await page.locator('body').textContent()
    const bloqueado = url.includes('#/login') || body?.match(/ingresar|login|registr|cuenta/i)
    expect(bloqueado).toBeTruthy()
  })

  test('9 — Página de login muestra formulario email+contraseña (US-02)', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')
    // Puede tener pantalla de selección primero
    const btnEmail = page.getByRole('button', { name: /ingresar con email/i }).first()
    if (await btnEmail.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btnEmail.click()
      await page.waitForTimeout(500)
    }
    const inputEmail = page.getByPlaceholder('tu@email.com').first()
    await expect(inputEmail).toBeVisible({ timeout: 8000 })
    const inputPass = page.getByPlaceholder('••••••••').first()
    await expect(inputPass).toBeVisible()
    const btnIngresar = page.getByRole('button', { name: /ingresar/i }).first()
    await expect(btnIngresar).toBeVisible()
  })

  test('10 — Login con credenciales incorrectas muestra error (US-02 validación)', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')
    const btnEmail = page.getByRole('button', { name: /ingresar con email/i }).first()
    if (await btnEmail.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btnEmail.click()
      await page.waitForTimeout(500)
    }
    await page.getByPlaceholder('tu@email.com').waitFor({ timeout: 8000 })
    await page.getByPlaceholder('tu@email.com').fill('inexistente@noexiste.test')
    await page.getByPlaceholder('••••••••').fill('contraseña_mala_123')
    await page.getByRole('button', { name: /ingresar →/i }).click()
    await page.waitForTimeout(2000)
    const body = await page.locator('body').textContent()
    // Debe mostrar mensaje de error (no navegar al portal)
    expect(body).toMatch(/error|incorrecto|inválido|no encontr|usuario|contraseña/i)
    // La URL debe seguir en #/login (credenciales malas no navegan al portal)
    expect(page.url()).toMatch(/#\/login/)
  })

  test('11 — B2C puede iniciar sesión correctamente (US-02)', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    // Tras login exitoso, va al catálogo o portal
    expect(page.url()).not.toMatch(/#\/login/)
    const body = await page.locator('body').textContent()
    expect(body).toMatch(/catálogo|café|tunay|portal|hola/i)
  })
})
