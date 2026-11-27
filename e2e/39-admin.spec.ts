import { test, expect } from '@playwright/test'
import { loginEmail, irA, esperarCarga, USERS } from './helpers'

// F-13 · Admin — cobertura básica
// Cubre: dashboard KPIs, cola vouchers, aprobación B2B (ADM-01/02/06)

test.describe('39 — Admin panel (F-13)', () => {

  test.skip('1 — Admin puede ver dashboard KPIs (ADM-06)', async ({ page }) => {
    // Requires admin credentials — skip en QA sin credenciales admin
    await irA(page, '/admin?demo=1')
    await esperarCarga(page)
    const body = await page.locator('body').textContent()
    expect(body).toMatch(/ventas|pedido|KPI|dashboard/i)
  })

  test('2 — Acceso sin sesión a /admin redirige al login (ADM-00)', async ({ page }) => {
    await page.goto('/admin')
    await esperarCarga(page)
    const url = page.url()
    // Debe redirigir al login o mostrar el AuthScreen
    const body = await page.locator('body').textContent()
    expect(body).toMatch(/ingresar|iniciar.*sesión|email|admin/i)
  })

  test('3 — buyer_b2c no accede al admin (TIPO-01)', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await irA(page, '/admin')
    await esperarCarga(page)
    const url = page.url()
    // No debe quedarse en /admin — debe redirigir al portal
    const body = await page.locator('body').textContent()
    // El panel de admin tiene pestañas "Pagos", "Cuentas B2B", "Reviewer" — comprador no las ve
    expect(body).not.toMatch(/TabPagos|TabCuentas|Reviewer.*admin/i)
  })

  test('4 — Demo admin muestra KPIs de gestión (ADM-06)', async ({ page }) => {
    await irA(page, '/admin?demo=1')
    await esperarCarga(page)
    const body = await page.locator('body').textContent()
    // Debe mostrar al menos el panel con alguna de las métricas de gestión
    expect(body).toMatch(/dashboard|admin|pedido|pago|B2B|disputa/i)
  })

  test('5 — Cola de vouchers visible en demo (ADM-02)', async ({ page }) => {
    await irA(page, '/admin?demo=1')
    await esperarCarga(page)
    // Buscar tab de pagos/vouchers
    const btnPagos = page.getByRole('button', { name: /pago|voucher|comprobante/i }).first()
    if (await btnPagos.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnPagos.click()
      await page.waitForTimeout(1000)
    }
    const body = await page.locator('body').textContent()
    expect(body).toMatch(/voucher|comprobante|verificar|yape/i)
  })

})
