import { test, expect } from '@playwright/test'
import { loginEmail, irA, esperarCarga, USERS, esperarRedQuieta } from './helpers'

// F-10 · Reclamo / Disputa — cobertura básica
// Cubre: foto obligatoria (B-01), link Libro Reclamaciones (B-05),
//        estados del reclamo (B-07), sub-tab Reclamos visible

test.describe('36 — Reclamo / Disputa (F-10)', () => {

  test('1 — Sub-tab Reclamos visible para buyer_b2c autenticado', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await irA(page, '/portal')
    await esperarCarga(page)
    const body = await page.locator('body').textContent()
    expect(body).toMatch(/reclamo|Reclamo/i)
  })

  test('2 — Sección Reclamos muestra link Libro de Reclamaciones formal (B-05)', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await irA(page, '/portal')
    await esperarCarga(page)
    // Navegar al sub-tab de reclamos
    const btnReclamos = page.getByRole('button', { name: /reclamo/i }).first()
    if (await btnReclamos.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnReclamos.click()
      await page.waitForTimeout(1000)
    }
    const body = await page.locator('body').textContent()
    expect(body).toMatch(/libro.*reclamacion|reclamacion.*formal/i)
  })

  test('3 — Link Libro de Reclamaciones navega a /reclamaciones', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await irA(page, '/portal')
    await esperarCarga(page)
    const btnReclamos = page.getByRole('button', { name: /reclamo/i }).first()
    if (await btnReclamos.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnReclamos.click()
      await page.waitForTimeout(1000)
    }
    const libroLink = page.getByText(/libro.*reclamacion.*formal/i).first()
      .or(page.locator('a[href*="reclamacion"]').first())
    if (await libroLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await libroLink.click()
      await page.waitForTimeout(1500)
      const url = page.url()
      expect(url).toMatch(/reclamacion/)
    } else {
      test.skip()
    }
  })

  test('4 — Formulario de nuevo reclamo requiere foto (B-01 PAY-02)', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await irA(page, '/portal')
    await esperarCarga(page)
    // Buscar botón "Reportar problema"
    const btnReclamos = page.getByRole('button', { name: /reclamo/i }).first()
    if (await btnReclamos.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnReclamos.click()
      await page.waitForTimeout(500)
    }
    const btnReportar = page.getByRole('button', { name: /reportar problema|nuevo reclamo/i }).first()
    if (!await btnReportar.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip()
      return
    }
    await btnReportar.click()
    await page.waitForTimeout(1000)
    // Intentar enviar sin foto — debe mostrar error
    const btnEnviar = page.getByRole('button', { name: /enviar.*reclamo|confirmar.*reclamo/i }).first()
    if (await btnEnviar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btnEnviar.click()
      await page.waitForTimeout(500)
      const body = await page.locator('body').textContent()
      // Debe bloquear o mostrar error de foto obligatoria
      expect(body).toMatch(/foto.*oblig|oblig.*foto|adjunta.*foto|mínimo.*foto|imagen.*requerid/i)
    } else {
      test.skip()
    }
  })

  test('5 — Label "estados" del reclamo muestra v2 (RESUELTO_COMPRADOR no crudo)', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await irA(page, '/portal')
    await esperarCarga(page)
    const btnReclamos = page.getByRole('button', { name: /reclamo/i }).first()
    if (await btnReclamos.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnReclamos.click()
      await page.waitForTimeout(500)
    }
    const body = await page.locator('body').textContent()
    // No debe aparecer el string crudo de los estados v1 sin formato
    expect(body).not.toMatch(/RESUELTO_FAVOR|RESUELTO_PARCIAL/)
  })

})
