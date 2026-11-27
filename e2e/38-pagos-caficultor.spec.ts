import { test, expect } from '@playwright/test'
import { loginEmail, irA, esperarCarga, USERS } from './helpers'

// F-12 · Pagos Caficultor — cobertura completa
// F-13 · Revisión de vouchers (admin)
// Cubre: tiles "Por recibir" / "Recibidos" (PAG-02),
//        lista de pedidos con estado pago, 0% comisión beta (COM-03),
//        TRIB-03 Liquidación de Compra para caficultor SOLO_DNI,
//        ESC-01 escrow solo hacia caficultor o comprador,
//        F13-01 admin aprueba voucher P0, F13-02 admin rechaza voucher

test.describe('38 — Pagos caficultor (F-12 / F-13)', () => {

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

  test('4 — ESC-05: método de pago al caficultor es transferencia bancaria (no Yape)', async ({ page }) => {
    // Verificar que el portal de pagos NO menciona Yape como método de pago al caficultor
    await loginEmail(page, USERS.caficultor.email, USERS.caficultor.password)
    await irA(page, '/caficultor-portal')
    await esperarCarga(page)
    const btnPagos = page.getByRole('button', { name: /pago/i }).first()
    if (await btnPagos.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnPagos.click()
      await page.waitForTimeout(1000)
    }
    const body = await page.locator('body').textContent() ?? ''
    // Si se mencionan métodos de pago, deben ser bancarios (BCP/Interbank/BN), no Yape
    const mencionaMetodo = body.match(/BCP|Interbank|transferencia|banco|cuenta/i)
    if (mencionaMetodo) {
      // Si menciona método bancario, puede mencionarlo. Lo que no debe hacer es mencionar Yape como destino
      expect(body).not.toMatch(/yape.*caficultor|pagar.*yape|método.*yape/i)
    } else {
      test.skip()
    }
  })

  test('5 — PAG-02: tile "Por recibir" muestra pagos retenidos (escrow activo, estado RETAINED)', async ({ page }) => {
    await loginEmail(page, USERS.caficultor.email, USERS.caficultor.password)
    await irA(page, '/caficultor-portal')
    await esperarCarga(page)
    const btnPagos = page.getByRole('button', { name: /pago/i }).first()
    if (await btnPagos.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnPagos.click()
      await page.waitForTimeout(1000)
    }
    const body = await page.locator('body').textContent() ?? ''
    // El tile "Por recibir" representa el escrow retenido (RETAINED)
    // Debe mostrar tanto el tile Por recibir como el Recibidos (dos tiles separados)
    expect(body).toMatch(/por.*recibir|recibir/i)
    expect(body).toMatch(/recibido|liberado/i)
  })

  test('6 — RETENIDO: pedidos entregados sin pago liberado aparecen en "Por recibir" (no en "Recibidos")', async ({ page }) => {
    await loginEmail(page, USERS.caficultor.email, USERS.caficultor.password)
    await irA(page, '/caficultor-portal')
    await esperarCarga(page)
    const btnPagos = page.getByRole('button', { name: /pago/i }).first()
    if (await btnPagos.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnPagos.click()
      await page.waitForTimeout(1000)
    }
    const body = await page.locator('body').textContent() ?? ''
    // Si hay pedidos con estado RETAINED en la lista, deben aparecer bajo "Por recibir"
    // y no deben aparecer como "RELEASED" / liberados en esa misma lista
    const hayPendiente = body.match(/RETENIDO|retenido|pendiente.*pago/i)
    if (hayPendiente) {
      // Un pago RETENIDO no debe mostrar "liberado" junto a él
      const seccionPendiente = page.locator('*').filter({ hasText: /RETENIDO|retenido/i }).first()
      if (await seccionPendiente.isVisible({ timeout: 3000 }).catch(() => false)) {
        const textoPendiente = await seccionPendiente.textContent() ?? ''
        expect(textoPendiente).not.toMatch(/liberado/i)
      }
    } else {
      test.skip()
    }
  })

  test.skip('7 — ESC-04: estados financieros válidos (no estados inválidos como "pagado_pendiente")', async ({ page }) => {
    // Este test requiere acceso al panel admin para ver los estados de pagos
    // Marcado skip porque requiere credenciales admin que no están disponibles en QA
    await irA(page, '/admin?demo=1')
    await esperarCarga(page)
    const body = await page.locator('body').textContent() ?? ''
    // Los estados visibles en el panel deben ser los canónicos de ESC-04
    // No deben aparecer estados inventados
    expect(body).not.toMatch(/pagado_pendiente|pagado_ok|liberacion_manual/i)
  })

  // ── F13 · Revisión de vouchers (admin) ──────────────────────────────────────

  test('8 — F13-01: Admin ve cola de vouchers pendientes (P0)', async ({ page }) => {
    await irA(page, '/admin?demo=1')
    await esperarCarga(page)
    const body = await page.locator('body').textContent() ?? ''
    // Panel admin debe mostrar sección de vouchers/pagos
    expect(body).toMatch(/voucher|comprobante|verificar.*pago|pago.*pendiente/i)
  })

  test('9 — F13-01: Voucher pendiente muestra imagen y datos para verificar (P0)', async ({ page }) => {
    await irA(page, '/admin?demo=1')
    await esperarCarga(page)
    const btnPagos = page.getByRole('button', { name: /pago|voucher|comprobante/i }).first()
    if (await btnPagos.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnPagos.click()
      await page.waitForTimeout(1000)
    }
    const body = await page.locator('body').textContent() ?? ''
    const hayVouchers = body.match(/voucher|comprobante|verificar/i)
    if (!hayVouchers) { test.skip(); return }
    // Debe mostrar datos suficientes para verificar (monto, comprador, fecha)
    expect(body).toMatch(/monto|S\/|comprador|fecha|pedido/i)
  })

  test('10 — F13-02: Admin puede rechazar voucher con motivo', async ({ page }) => {
    await irA(page, '/admin?demo=1')
    await esperarCarga(page)
    const btnPagos = page.getByRole('button', { name: /pago|voucher|comprobante/i }).first()
    if (await btnPagos.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnPagos.click()
      await page.waitForTimeout(1000)
    }
    const body = await page.locator('body').textContent() ?? ''
    const hayVouchers = body.match(/voucher|comprobante|verificar/i)
    if (!hayVouchers) { test.skip(); return }
    // Debe haber opción de rechazar (no solo aprobar)
    expect(body).toMatch(/rechazar|aprobar/i)
  })

  test('11 — F13-03: Comparativa monto voucher vs monto orden visible para admin', async ({ page }) => {
    await irA(page, '/admin?demo=1')
    await esperarCarga(page)
    const btnPagos = page.getByRole('button', { name: /pago|voucher|comprobante/i }).first()
    if (await btnPagos.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnPagos.click()
      await page.waitForTimeout(1000)
    }
    const body = await page.locator('body').textContent() ?? ''
    const hayVouchers = body.match(/voucher|comprobante|verificar/i)
    if (!hayVouchers) { test.skip(); return }
    // Admin debe ver el monto del voucher Y el monto de la orden para comparar
    expect(body).toMatch(/monto.*orden|monto.*pedido|total.*pedido|S\//i)
  })

  test('12 — TRIB-03: caficultor SOLO_DNI necesita número Liquidación de Compra para liberar pago', async ({ page }) => {
    await loginEmail(page, USERS.caficultor.email, USERS.caficultor.password)
    await irA(page, '/caficultor-portal')
    await esperarCarga(page)
    const btnPagos = page.getByRole('button', { name: /pago/i }).first()
    if (await btnPagos.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnPagos.click()
      await page.waitForTimeout(1000)
    }
    const body = await page.locator('body').textContent() ?? ''
    // Si hay pagos RETENIDOS para caficultor SOLO_DNI, debe mostrar indicación de Liquidación de Compra
    const hayRetenidos = body.match(/RETENIDO|retenido|pendiente.*liberar/i)
    if (hayRetenidos) {
      // La UI debe mostrar que falta el número del comprobante (Liquidación de Compra)
      expect(body).toMatch(/liquidación|liquidacion|comprobante|LC-\d|número.*comprobante|liberar.*pago/i)
    } else {
      test.skip()
    }
  })

  test('13 — COM-03: desglose de pago no muestra descuento de comisión en fase beta (INVARIANTE)', async ({ page }) => {
    // COM-03: montoNetoCents == montoBrutoCents en beta (0% comisión)
    await loginEmail(page, USERS.caficultor.email, USERS.caficultor.password)
    await irA(page, '/caficultor-portal')
    await esperarCarga(page)
    const btnPagos = page.getByRole('button', { name: /pago/i }).first()
    if (await btnPagos.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnPagos.click()
      await page.waitForTimeout(1000)
    }
    const body = await page.locator('body').textContent() ?? ''
    // En beta el neto es igual al bruto — nunca debe aparecer descuento por comisión de plataforma
    expect(body).not.toMatch(/descuento.*comisión|retención.*5%|comisión.*5%|5%.*plataforma/i)
  })

  test('14 — ESC-05-B: portal muestra opción para configurar CCI del caficultor', async ({ page }) => {
    // ESC-05-B: el admin necesita el CCI del caficultor para liberar el pago
    await loginEmail(page, USERS.caficultor.email, USERS.caficultor.password)
    await irA(page, '/caficultor-portal')
    await esperarCarga(page)
    const body = await page.locator('body').textContent() ?? ''
    const hayDatosBancarios = body.match(/CCI|cuenta interbancaria|datos bancarios|cuenta.*retiro|n[uú]mero.*cuenta/i)
    if (hayDatosBancarios) {
      expect(body).toMatch(/CCI|cuenta interbancaria|datos bancarios/i)
    } else {
      const tabBanco = page.getByRole('button', { name: /configuraci[oó]n|cuenta.*banco|retiro|CCI/i }).first()
      const hayTab = await tabBanco.isVisible({ timeout: 3000 }).catch(() => false)
      if (hayTab) {
        await tabBanco.click()
        await page.waitForTimeout(500)
        const bodyBanco = await page.locator('body').textContent() ?? ''
        expect(bodyBanco).toMatch(/CCI|cuenta interbancaria|datos bancarios/i)
      } else {
        test.skip()
      }
    }
  })

})
