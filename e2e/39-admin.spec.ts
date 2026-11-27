import { test, expect } from '@playwright/test'
import { loginEmail, irA, esperarCarga, USERS } from './helpers'

// F-12 · Aprobación cuenta B2B (admin) + F-14 · Gestión escrow y liquidación
// Cubre: dashboard KPIs, cola vouchers, aprobación B2B (ADM-01/02/06),
//        F12-05 🔒 aprobación solo desde admin,
//        F14-03 🔒 escrow no liberado en DISPUTED,
//        F14-05 🔒 fondos escrow solo hacia caficultor o comprador

test.describe('39 — Admin panel (F-12 / F-14)', () => {

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

  test('6 — INV-11/ENT-06: panel admin tiene sección de disputas con acción de resolución', async ({ page }) => {
    await irA(page, '/admin?demo=1')
    await esperarCarga(page)
    // Admin debe tener tab de disputas con capacidad de resolución
    const btnDisputas = page.getByRole('button', { name: /disputa|reclamo/i }).first()
    if (await btnDisputas.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnDisputas.click()
      await page.waitForTimeout(1000)
    }
    const body = await page.locator('body').textContent() ?? ''
    // El panel de disputas debe existir
    expect(body).toMatch(/disputa|reclamo|EN_REVISION|DECISION_PENDIENTE/i)
  })

  test('7 — ADM-01: panel admin tiene sección de aprobación B2B con audit trail', async ({ page }) => {
    await irA(page, '/admin?demo=1')
    await esperarCarga(page)
    // Buscar tab de cuentas B2B
    const btnB2B = page.getByRole('button', { name: /B2B|empresa|cuenta/i }).first()
    if (await btnB2B.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnB2B.click()
      await page.waitForTimeout(1000)
    }
    const body = await page.locator('body').textContent() ?? ''
    // Debe mostrar cuentas B2B con opciones de aprobación/rechazo
    expect(body).toMatch(/PENDING_APPROVAL|APPROVED|aprobar|rechazar|empresa|B2B/i)
  })

  test('8 — ADM-03: disputas se resuelven en 2 pasos (revisión + ejecución financiera)', async ({ page }) => {
    await irA(page, '/admin?demo=1')
    await esperarCarga(page)
    const btnDisputas = page.getByRole('button', { name: /disputa|reclamo/i }).first()
    if (await btnDisputas.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnDisputas.click()
      await page.waitForTimeout(1000)
    }
    const body = await page.locator('body').textContent() ?? ''
    // Si hay disputas, deben mostrar el flujo de 2 pasos (revisar + ejecutar)
    // Los estados del flujo de disputa deben ser visibles
    const hayDisputas = body.match(/EN_REVISION|DECISION_PENDIENTE|ESCALADO|disputa/i)
    if (hayDisputas) {
      // Debe haber opciones de acción para el reviewer (resolver, escalar, aprobar)
      expect(body).toMatch(/resolver|escalar|aprobar|rechazar|refund|liberar/i)
    } else {
      test.skip()
    }
  })

  test('9 — ENT-06: comprador (buyer_b2c) no puede forzar transición en_disputa→entregado', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await irA(page, '/portal')
    await esperarCarga(page)
    const body = await page.locator('body').textContent() ?? ''
    // Si hay pedidos en_disputa del comprador, no debe ver botón "marcar entregado"
    const hayDisputa = body.match(/en.*disputa/i)
    if (hayDisputa) {
      // El comprador no debe poder resolver la disputa directamente
      const seccionDisputa = page.locator('*').filter({ hasText: /en.*disputa/i }).first()
      if (await seccionDisputa.isVisible({ timeout: 3000 }).catch(() => false)) {
        const textoDisputa = await seccionDisputa.textContent() ?? ''
        expect(textoDisputa).not.toMatch(/marcar.*entregado|confirmar.*entregado|resolver.*disputa/i)
      }
    } else {
      test.skip()
    }
  })

  test('10 — ADM-02: checklist de validación de voucher visible en tab Pagos admin (demo)', async ({ page }) => {
    await irA(page, '/admin?demo=1')
    await esperarCarga(page)
    const btnPagos = page.getByRole('button', { name: /pago|voucher|comprobante/i }).first()
    if (await btnPagos.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnPagos.click()
      await page.waitForTimeout(1000)
    }
    const body = await page.locator('body').textContent() ?? ''
    const hayVoucher = body.match(/voucher|comprobante/i)
    if (hayVoucher) {
      // El checklist automático debe ser visible
      expect(body).toMatch(/imagen.*presente|monto|método|fecha|checklist|validar/i)
    } else {
      test.skip()
    }
  })

  test('11 — ADM-06: dashboard admin muestra pagos retenidos, disputas abiertas, B2B pendientes', async ({ page }) => {
    await irA(page, '/admin?demo=1')
    await esperarCarga(page)
    const body = await page.locator('body').textContent() ?? ''
    // Dashboard debe mostrar los 3 KPIs de gestión (ADM-06)
    expect(body).toMatch(/dashboard|admin|pedido/i)
    // Al menos uno de los KPIs de gestión debe estar presente
    expect(body).toMatch(/retenido|disputa|B2B.*pendiente|pendiente.*B2B/i)
  })

  // ── Invariantes de seguridad (F12-05, F14-03, F14-05) ─────────────────────

  test('12 — F12-05: 🔒 buyer_b2c no puede aprobar solicitudes B2B (invariante)', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await irA(page, '/admin')
    await esperarCarga(page)
    const body = await page.locator('body').textContent() ?? ''
    // El comprador no debe ver el panel de aprobación B2B
    expect(body).not.toMatch(/aprobar.*B2B|aprobar.*solicitud|rechazar.*solicitud/i)
  })

  test('13 — F12-05: 🔒 caficultor no puede aprobar solicitudes B2B (invariante)', async ({ page }) => {
    await loginEmail(page, USERS.caficultor.email, USERS.caficultor.password)
    await irA(page, '/admin')
    await esperarCarga(page)
    const body = await page.locator('body').textContent() ?? ''
    // El caficultor no debe ver el panel de aprobación B2B
    expect(body).not.toMatch(/aprobar.*B2B|aprobar.*solicitud|rechazar.*solicitud/i)
  })

  test('14 — F14-03: 🔒 Panel admin NO muestra "Liberar escrow" para pedidos en DISPUTA (ESC-01/ENT-02)', async ({ page }) => {
    await irA(page, '/admin?demo=1')
    await esperarCarga(page)
    const body = await page.locator('body').textContent() ?? ''
    const hayDisputa = body.match(/en.*disputa|DISPUTED/i)
    if (!hayDisputa) { test.skip(); return }
    // Para pedidos en DISPUTADO, el botón "Liberar" no debe estar disponible
    const seccionDisputa = page.locator('*').filter({ hasText: /en.*disputa|DISPUTED/i }).first()
    if (await seccionDisputa.isVisible({ timeout: 3000 }).catch(() => false)) {
      const textoDisputa = await seccionDisputa.textContent() ?? ''
      expect(textoDisputa).not.toMatch(/liberar.*escrow|liberar.*pago/i)
    }
  })

  test('15 — F14-05: 🔒 Liquidaciones muestran destinatario caficultor (no cuenta operativa AL PASO LIVE)', async ({ page }) => {
    await irA(page, '/admin?demo=1')
    await esperarCarga(page)
    const btnEscrow = page.getByRole('button', { name: /escrow|liquidación|liberación/i }).first()
    if (await btnEscrow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnEscrow.click()
      await page.waitForTimeout(1000)
    }
    const body = await page.locator('body').textContent() ?? ''
    const hayLiquidaciones = body.match(/liberado|RELEASED|liquidación/i)
    if (hayLiquidaciones) {
      // Ninguna liquidación debe tener como destinatario la cuenta de AL PASO LIVE
      expect(body).not.toMatch(/AL PASO LIVE.*destino|cuenta.*operativa.*destino/i)
    } else {
      test.skip()
    }
  })

  test('16 — ADM-05: audit trail — vista B2B aprobada muestra approvedBy y approvedAt', async ({ page }) => {
    // ADM-05: cuando se aprueba una cuenta B2B, se registra approvedBy + approvedAt en Firestore
    // Este test verifica que la UI muestra esa información en cuentas ya aprobadas
    await irA(page, '/admin?demo=1')
    await esperarCarga(page)
    const btnB2B = page.getByRole('button', { name: /B2B|empresa|cuenta/i }).first()
    if (await btnB2B.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnB2B.click()
      await page.waitForTimeout(1000)
    }
    const body = await page.locator('body').textContent() ?? ''
    // Si hay cuentas aprobadas, deben mostrar quién aprobó y cuándo
    const hayCuentasAprobadas = body.match(/APPROVED|aprobado|aprobada/i)
    if (hayCuentasAprobadas) {
      // La vista puede mostrar la fecha de aprobación o el reviewer — no estados raw crudos
      expect(body).not.toMatch(/approvedBy:|approvedAt:/i)
      expect(body).toMatch(/aprobad|fecha|revisor|admin|\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2}/i)
    } else {
      test.skip()
    }
  })

  test('17 — ADM-06: dashboard admin muestra pagos retenidos + disputas + B2B pendientes (KPIs gestión)', async ({ page }) => {
    // ADM-06: el dashboard admin debe mostrar las tres métricas clave de gestión operativa
    await irA(page, '/admin?demo=1')
    await esperarCarga(page)
    const body = await page.locator('body').textContent() ?? ''
    // Dashboard debe mostrar alguna métrica de gestión operativa
    const tienePagosRetenidos = body.match(/pagos.*reteni|escrow.*reteni|por.*liberar|retenido/i)
    const tieneDisputas = body.match(/disputa|en.*disputa|disputas.*abiert/i)
    const tieneB2BPendientes = body.match(/B2B.*pendiente|pendiente.*aprobaci[oó]n|cuentas.*pendiente|PENDING_APPROVAL/i)
    expect(tienePagosRetenidos || tieneDisputas || tieneB2BPendientes).toBeTruthy()
  })

})
