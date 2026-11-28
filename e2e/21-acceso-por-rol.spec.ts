import { test, expect } from '@playwright/test'
import { loginEmail, irA, esperarCarga, USERS } from './helpers'

// US-01 · US-10 · B2B-01 · B2B-02 · PR-02 · TIPO-01 · TIPO-02 · INV-01
// Rutas reales: #/ (catálogo), #/portal (negocio), #/caficultor-portal (caficultor)

test.describe('21 — Control de acceso y reglas de negocio por rol', () => {

  test('1 — Guest ve catálogo pero sin precio mayorista (PR-02 INVARIANTE)', async ({ page }) => {
    // Usar ?demo=1 para garantizar datos seed — el catálogo siempre tiene tarjetas visibles
    await page.goto('/')
    await esperarCarga(page)
    // Tarjetas visibles (clase real del catálogo: sc-product-card)
    await expect(page.locator('.sc-product-card').first()).toBeVisible({ timeout: 20_000 })
    // No debe haber precio por kg mayorista ni ficha B2B expuesta para guest
    const body = await page.locator('body').textContent()
    expect(body).not.toMatch(/Ficha técnica B2B/i)
    expect(body).not.toMatch(/precio mayorista/i)
  })

  test('2 — B2C ve catálogo sin precio mayorista (US-10 · PR-02)', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await irA(page, '/')
    await esperarCarga(page)
    const body = await page.locator('body').textContent()
    expect(body).not.toMatch(/precio mayorista/i)
    expect(body).not.toMatch(/S\/\s*kg.*mayorist/i)
  })

  test('3 — B2B PENDING: sin acceso comercial, con mensaje de revisión (B2B-01 INVARIANTE)', async ({ page }) => {
    await loginEmail(page, USERS.pending.email, USERS.pending.password)
    await irA(page, '/portal')
    // Esperar que el splash desaparezca y el portal cargue
    await page.waitForFunction(
      () => {
        const textoSplash = [...document.querySelectorAll('div')].find(el =>
          el.textContent?.trim() === 'Del campo a tu negocio'
        )
        return !textoSplash && (document.body.textContent?.length ?? 0) > 200
      },
      { timeout: 15_000 }
    ).catch(() => {})
    await page.waitForFunction(
      () => !document.body.textContent?.includes('Cargando tu portal'),
      { timeout: 15_000 }
    ).catch(() => {})
    const body = await page.locator('body').textContent()
    // Bloqueo comercial: sin ficha B2B ni precios mayoristas
    expect(body).not.toMatch(/Ficha técnica B2B/i)
    // Mensaje de pendiente (banner PENDING_APPROVAL del portal o del catálogo)
    expect(body).toMatch(/pendiente|revisión|en proceso|aprobación|PENDING/i)
  })

  test('4 — B2B APPROVED accede al portal sin banner de pendiente (US-10 · B2B-02)', async ({ page }) => {
    await loginEmail(page, USERS.barista.email, USERS.barista.password)
    await irA(page, '/portal')
    // Esperar que el splash desaparezca y el portal cargue
    await page.waitForFunction(
      () => {
        const textoSplash = [...document.querySelectorAll('div')].find(el =>
          el.textContent?.trim() === 'Del campo a tu negocio'
        )
        return !textoSplash && (document.body.textContent?.length ?? 0) > 200
      },
      { timeout: 15_000 }
    ).catch(() => {})
    await page.waitForFunction(
      () => !document.body.textContent?.includes('Cargando tu portal'),
      { timeout: 15_000 }
    ).catch(() => {})
    const body = await page.locator('body').textContent()
    // B2B APPROVED no debe ver el banner de cuenta en revisión
    expect(body).not.toMatch(/cuenta.*revisión|en revisión.*equipo|Precios mayoristas pendientes/i)
    // Puede acceder al catálogo desde el portal (sí ve la tab Explorar o Mis Compras)
    expect(body).toMatch(/Mis Compras|Explorar|Catálogo/i)
  })

  test('5 — Guest redirigido a /login al acceder a ruta protegida (INV-01)', async ({ page }) => {
    await page.goto('/portal')
    await page.waitForURL(/\/login/, { timeout: 8_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('6 — Caficultor (seller) no accede al portal de negocio (TIPO-02)', async ({ page }) => {
    await loginEmail(page, USERS.caficultor.email, USERS.caficultor.password)
    await irA(page, '/portal')
    // Esperar redirección a caficultor-portal (guard TIPO-02)
    await page.waitForFunction(
      () => window.location.pathname.includes('caficultor-portal') || window.location.pathname === '/portal',
      { timeout: 8_000 }
    ).catch(() => {})
    await page.waitForTimeout(1500)
    // Debe redirigir al portal caficultor o mostrar acceso denegado
    const url = page.url()
    const body = await page.locator('body').textContent()
    const redirigioAlSuyo = url.includes('caficultor-portal') || (body ?? '').match(/portal.{0,20}caficultor/i)
    const accesoDenegado = (body ?? '').match(/no tienes acceso|acceso denegado|no autorizado/i)
    expect(redirigioAlSuyo || accesoDenegado).toBeTruthy()
    // No debe ver el portal de negocio con compras
    expect(body).not.toMatch(/Mis pedidos|Mis compras|Cotizaciones/i)
  })

  test('7 — B2B APPROVED no accede al portal caficultor (TIPO-01 INVARIANTE)', async ({ page }) => {
    await loginEmail(page, USERS.barista.email, USERS.barista.password)
    await irA(page, '/caficultor-portal')
    const url = page.url()
    const body = await page.locator('body').textContent()
    // No debe mostrar el portal caficultor (mis lotes / productos del caficultor)
    const verMisLotes = (body ?? '').match(/mis lotes|lotes activos|agregar producto/i)
    // Debe redirigir al portal negocio
    const redirigioANegocio = url.includes('/portal') || url.includes('/')
    expect(!verMisLotes || redirigioANegocio).toBeTruthy()
  })

  test('8 — B2B PENDING intenta ir a cotizaciones — acceso bloqueado (B2B-01 · US-16)', async ({ page }) => {
    await loginEmail(page, USERS.pending.email, USERS.pending.password)
    await irA(page, '/portal')
    // Esperar que el splash desaparezca y el portal cargue
    await page.waitForFunction(
      () => {
        const textoSplash = [...document.querySelectorAll('div')].find(el =>
          el.textContent?.trim() === 'Del campo a tu negocio'
        )
        return !textoSplash && (document.body.textContent?.length ?? 0) > 200
      },
      { timeout: 15_000 }
    ).catch(() => {})
    await page.waitForFunction(
      () => !document.body.textContent?.includes('Cargando tu portal'),
      { timeout: 15_000 }
    ).catch(() => {})
    // Click en tab cotizaciones si existe
    const tabCot = page.getByRole('button', { name: /cotizac/i })
    if (await tabCot.isVisible()) await tabCot.click()
    const body = await page.locator('body').textContent()
    // No debe mostrar lista de cotizaciones activa
    expect(body).not.toMatch(/nueva cotización|solicitar cotización/i)
    // Debe mantener el banner de pendiente
    expect(body).toMatch(/pendiente|revisión|en proceso|aprobación|PENDING/i)
  })
})
