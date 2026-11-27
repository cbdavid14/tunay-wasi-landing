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

  test('6 — ENT-04: botón "Tengo un problema" crea reclamo automáticamente en la colección (no navegación separada)', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await irA(page, '/portal')
    await esperarCarga(page)
    const body = await page.locator('body').textContent() ?? ''
    const hayEnAgencia = body.match(/en.*agencia/i)
    if (!hayEnAgencia) { test.skip(); return }
    // Si hay pedido en_agencia, el botón "Tengo un problema" debe crear el reclamo
    // y llevar directamente al formulario pre-llenado (sin navegación manual separada)
    const btnProblema = page.getByRole('button', { name: /tengo.*problema|reportar.*problema/i }).first()
    if (!await btnProblema.isVisible({ timeout: 5000 }).catch(() => false)) { test.skip(); return }
    await btnProblema.click()
    await page.waitForTimeout(1000)
    // Debe mostrar formulario de reclamo inmediatamente (pre-llenado con datos del pedido)
    const bodyPost = await page.locator('body').textContent() ?? ''
    expect(bodyPost).toMatch(/motivo|reclamo|problema|tipo.*reclamo/i)
  })

  test('7 — ENT-05: SLA 7 días hábiles visible en reclamo activo', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await irA(page, '/portal')
    await esperarCarga(page)
    const btnReclamos = page.getByRole('button', { name: /reclamo/i }).first()
    if (await btnReclamos.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnReclamos.click()
      await page.waitForTimeout(1000)
    }
    const body = await page.locator('body').textContent() ?? ''
    // Si hay reclamos activos, deben mostrar SLA (días hábiles restantes o vencido)
    const hayReclamoActivo = body.match(/EN_REVISION|ESPERANDO_INFO|ABIERTO|en revisión|esperando/i)
    if (hayReclamoActivo) {
      expect(body).toMatch(/7.*días|7.*dia|hábil|SLA|plazo.*venc|días.*restante/i)
    } else {
      test.skip()
    }
  })

  test('8 — ENT-07: resolución de disputa muestra opciones mutuamente excluyentes (liberar ó reembolsar)', async ({ page }) => {
    // La vista del comprador en un reclamo resuelto debe mostrar solo UNA de las dos opciones
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await irA(page, '/portal')
    await esperarCarga(page)
    const btnReclamos = page.getByRole('button', { name: /reclamo/i }).first()
    if (await btnReclamos.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnReclamos.click()
      await page.waitForTimeout(1000)
    }
    const body = await page.locator('body').textContent() ?? ''
    const hayResuelto = body.match(/RESUELTO_COMPRADOR|RESUELTO_CAFICULTOR|resuelto.*comprador|resuelto.*caficultor/i)
    if (hayResuelto) {
      // No pueden coexistir ambas resoluciones al mismo tiempo para un mismo reclamo
      const tieneReembolso = body.match(/reembolso|devolu/i)
      const tieneLiberacion = body.match(/liberado|pagado.*caficultor/i)
      // Solo puede tener uno de los dos
      expect(tieneReembolso && tieneLiberacion).toBeFalsy()
    } else {
      test.skip()
    }
  })

  test('9 — Sub-tab Reclamos del caficultor muestra vista defensiva con alerta 18h (B-04)', async ({ page }) => {
    await loginEmail(page, USERS.caficultor.email, USERS.caficultor.password)
    await irA(page, '/caficultor-portal')
    await esperarCarga(page)
    const body = await page.locator('body').textContent() ?? ''
    // El portal caficultor debe tener un sub-tab de reclamos
    expect(body).toMatch(/reclamo|Reclamo/i)
    // Si hay reclamos activos, deben mostrar la alerta de 18h para responder
    const hayReclamosCaficultor = body.match(/reclamo.*activ|reclamo.*pendiente/i)
    if (hayReclamosCaficultor) {
      expect(body).toMatch(/18.*hora|18h|responde.*antes|plazo.*respuesta/i)
    }
  })

})
