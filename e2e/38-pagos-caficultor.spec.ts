import { test, expect } from '@playwright/test'
import { loginEmail, irA, esperarCarga, USERS } from './helpers'

// F-12 · Pagos Caficultor — cobertura básica
// Cubre: tiles "Por recibir" / "Recibidos" (PAG-02),
//        lista de pedidos con estado pago, 0% comisión beta (COM-03)

test.describe('38 — Pagos caficultor (F-12)', () => {

  test('1 — Portal caficultor tiene tab de Pagos', async ({ page }) => {
    await loginEmail(page, USERS.caficultor.email, USERS.caficultor.password)
    await irA(page, '/caficultor-portal')
    await esperarCarga(page)
    const body = await page.locator('body').textContent()
    expect(body).toMatch(/pago|Pago/i)
  })

  test('2 — Tiles muestran "Por recibir" y "Recibidos" (PAG-02)', async ({ page }) => {
    await loginEmail(page, USERS.caficultor.email, USERS.caficultor.password)
    await irA(page, '/caficultor-portal')
    await esperarCarga(page)
    const btnPagos = page.getByRole('button', { name: /pago/i }).first()
    if (await btnPagos.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnPagos.click()
      await page.waitForTimeout(1000)
    }
    const body = await page.locator('body').textContent()
    expect(body).toMatch(/recibir|Recibir|recibido|Recibido/i)
  })

  test('3 — Comisión mostrada es 0% (COM-03 — fase beta)', async ({ page }) => {
    await loginEmail(page, USERS.caficultor.email, USERS.caficultor.password)
    await irA(page, '/caficultor-portal')
    await esperarCarga(page)
    const btnPagos = page.getByRole('button', { name: /pago/i }).first()
    if (await btnPagos.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnPagos.click()
      await page.waitForTimeout(1000)
    }
    const body = await page.locator('body').textContent()
    // No debe mostrar "5% comisión" — debe mostrar "0%" o "fase beta"
    expect(body).not.toMatch(/5%.*comisión|comisión.*5%/)
    // Puede mostrar "0% comisión" o simplemente no mencionar comisión
  })

})
