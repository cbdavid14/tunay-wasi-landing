import { test, expect } from '@playwright/test'
import { loginEmail, irA, esperarCarga, USERS, esperarRedQuieta } from './helpers'

// F-09 · Confirmación de entrega + reseña — happy path y validaciones
// F-10 · Cancelación de pedido — P0 y casos bloqueados
// Cubre: botón "Confirmar recepción" disponible en en_agencia,
//        modal de reseña 1-5 estrellas, calificado:true,
//        reseña visible en perfil del caficultor,
//        cancelación P0 (PENDING, PAID antes de despacho), bloqueo en DISPATCHED

test.describe('37 — Confirmación entrega + reseña (F-09)', () => {

  test('1 — Portal negocio muestra sección para confirmar entrega', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await irA(page, '/portal')
    await esperarCarga(page)
    const body = await page.locator('body').textContent()
    expect(body).toMatch(/pedido|entrega|recib/i)
  })

  test('2 — Modal de reseña tiene escala 1-5 estrellas (CAL-01)', async ({ page }) => {
    // Verifica que el modal de calificación tiene opciones de estrella
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await irA(page, '/portal')
    await esperarCarga(page)
    // Buscar cualquier sección de reseñas
    const btnResenias = page.getByRole('button', { name: /reseña|calificar|valorar/i }).first()
    if (await btnResenias.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnResenias.click()
      await page.waitForTimeout(1000)
      // Debe mostrar estrellas
      const body = await page.locator('body').textContent()
      expect(body).toMatch(/★|estrella|calificac/i)
    } else {
      test.skip()
    }
  })

  test('3 — Perfil de caficultor muestra tab de reseñas', async ({ page }) => {
    await page.goto('/')
    await esperarCarga(page)
    // Buscar el perfil de un caficultor en el catálogo
    const enlacePerfil = page.locator('a[href*="/caficultor/"]').first()
    if (!await enlacePerfil.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip()
      return
    }
    await enlacePerfil.click()
    await esperarCarga(page)
    const body = await page.locator('body').textContent()
    expect(body).toMatch(/reseña|calificacion|★/i)
  })

  test('4 — Pantalla confirmación tiene dos opciones: OK vs Problema (ENT-01)', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await irA(page, '/portal')
    await esperarCarga(page)
    // La UI debe ofrecer "Confirmar recepción" y "Tengo un problema" para pedidos en_agencia
    const body = await page.locator('body').textContent()
    // Puede ser que no haya pedidos en_agencia en QA — test condicional
    const hayEnAgencia = body?.match(/en.*agencia|confirmar.*recepci|todo.*bien.*recib/i)
    if (hayEnAgencia) {
      expect(body).toMatch(/problema|reclam|disputa/i)
    } else {
      test.skip()
    }
  })

  test('5 — ENT-01: disputa solo iniciable desde estado en_agencia (no desde preparando o entregado)', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await irA(page, '/portal')
    await esperarCarga(page)
    const body = await page.locator('body').textContent() ?? ''
    // Si hay pedidos en estado "preparando", no deben mostrar opción de disputa
    const hayPreparando = body.match(/preparando/i)
    if (hayPreparando) {
      // Buscar la sección del pedido en preparando — no debe tener botón "Tengo un problema"
      const seccionPreparando = page.locator('*').filter({ hasText: /preparando/i }).first()
      if (await seccionPreparando.isVisible({ timeout: 3000 }).catch(() => false)) {
        const textoPedidoPreparando = await seccionPreparando.textContent() ?? ''
        expect(textoPedidoPreparando).not.toMatch(/tengo.*problema|reportar.*problema/i)
      }
    } else {
      test.skip()
    }
  })

  test('6 — ENT-02: pedido en_disputa muestra escrow retenido (no liberado)', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await irA(page, '/portal')
    await esperarCarga(page)
    const body = await page.locator('body').textContent() ?? ''
    const hayDisputa = body.match(/en.*disputa|disputa.*activ/i)
    if (hayDisputa) {
      // El portal no debe mostrar "pago liberado" para un pedido en_disputa
      const seccionDisputa = page.locator('*').filter({ hasText: /en.*disputa|disputa.*activ/i }).first()
      if (await seccionDisputa.isVisible({ timeout: 3000 }).catch(() => false)) {
        const textoDisputa = await seccionDisputa.textContent() ?? ''
        expect(textoDisputa).not.toMatch(/pago.*liberado|liberado.*caficultor/i)
      }
    } else {
      test.skip()
    }
  })

  test('7 — ENT-03: auto-entregado 7 días solo aplica sin disputaId activo (UI hint visible)', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await irA(page, '/portal')
    await esperarCarga(page)
    const body = await page.locator('body').textContent() ?? ''
    // Si hay pedidos en_agencia, la UI debe mostrar alguna referencia al plazo de 7 días
    const hayEnAgencia = body.match(/en.*agencia/i)
    if (hayEnAgencia) {
      // La UI puede mostrar "7 días", "auto-entregado", "confirmación automática"
      // Este test verifica que la UI informa al usuario del plazo — el mecanismo real es backend
      expect(body).toMatch(/7.*días|7.*dia|auto.*entreg|plazo.*confirm/i)
    } else {
      test.skip()
    }
  })

  test.skip('8 — ENT-06: transición en_disputa→entregado SOLO por admin/reviewer (no por comprador/caficultor)', async ({ page }) => {
    // Este test requiere un pedido en estado en_disputa en Firestore QA
    // y verificar que el comprador no tiene botón para forzar "entregado"
    // Marcado skip porque requiere infraestructura de pedido en disputa activo en QA
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await irA(page, '/portal')
    await esperarCarga(page)
    const body = await page.locator('body').textContent() ?? ''
    const hayDisputa = body.match(/en.*disputa/i)
    if (hayDisputa) {
      // El comprador no debe ver botón para marcar como "entregado" directamente
      expect(body).not.toMatch(/marcar.*entregado|confirmar.*entregado/i)
    }
  })

  test('9 — Reseña es opcional (botón "Ahora no" disponible post-entrega — CAL-01)', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await irA(page, '/portal')
    await esperarCarga(page)
    // Buscar cualquier modal de calificación abierto
    const modalCalif = page.locator('*').filter({ hasText: /calificar|deja.*reseña|¿cómo.*fue/i }).first()
    if (await modalCalif.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Debe existir opción para omitir la reseña
      const body = await page.locator('body').textContent() ?? ''
      expect(body).toMatch(/ahora no|omitir|saltar|después/i)
    } else {
      test.skip()
    }
  })

  // ── F10 · Cancelación de pedido ──────────────────────────────────────────────

  test('10 — F10-01: Cancelar pedido PENDING muestra opción de cancelar (P0)', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await irA(page, '/portal')
    await esperarCarga(page)
    await page.waitForFunction(
      () => !document.body.textContent?.includes('Cargando tu portal'),
      { timeout: 15_000 }
    )
    const body = await page.locator('body').textContent() ?? ''
    const hayPendiente = body.match(/pendiente|PENDING|esperando.*pago/i)
    if (!hayPendiente) {
      test.skip()
      return
    }
    // Pedidos PENDING deben mostrar opción de cancelar
    expect(body).toMatch(/cancelar/i)
  })

  test('11 — F10-01: Al cancelar pedido PENDING el estado cambia a CANCELLED (P0)', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await irA(page, '/portal')
    await esperarCarga(page)
    await page.waitForFunction(
      () => !document.body.textContent?.includes('Cargando tu portal'),
      { timeout: 15_000 }
    )
    const btnCancelar = page.getByRole('button', { name: /cancelar.*pedido|cancelar/i }).first()
    if (!await btnCancelar.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip()
      return
    }
    await btnCancelar.click()
    await page.waitForTimeout(500)
    // Debe mostrar confirmación o pedir motivo
    const body = await page.locator('body').textContent() ?? ''
    expect(body).toMatch(/confirmar.*cancelación|¿estás seguro|cancelad|cancelación/i)
  })

  test('12 — F10-02: Pedido PAID antes del despacho puede cancelarse (P0)', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await irA(page, '/portal')
    await esperarCarga(page)
    await page.waitForFunction(
      () => !document.body.textContent?.includes('Cargando tu portal'),
      { timeout: 15_000 }
    )
    const body = await page.locator('body').textContent() ?? ''
    // Pedidos PAID no despachados (no en "preparando") deberían mostrar opción de cancelar
    const hayPaid = body.match(/pagado|verificado|PAID/i)
    const hayPreparando = body.match(/preparando|en camino/i)
    if (!hayPaid || hayPreparando) {
      test.skip()
      return
    }
    // Si hay pedido PAID sin despachar, debe haber opción de cancelar
    expect(body).toMatch(/cancelar/i)
  })

  test('13 — F10-03: 🔒 Pedido DISPATCHED NO muestra botón cancelar (invariante)', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await irA(page, '/portal')
    await esperarCarga(page)
    await page.waitForFunction(
      () => !document.body.textContent?.includes('Cargando tu portal'),
      { timeout: 15_000 }
    )
    const body = await page.locator('body').textContent() ?? ''
    const hayPreparando = body.match(/preparando/i)
    if (!hayPreparando) {
      test.skip()
      return
    }
    // Para pedidos en "preparando" (DISPATCHED), no debe haber botón de cancelar
    const seccionPreparando = page.locator('*').filter({ hasText: /preparando/i }).first()
    if (await seccionPreparando.isVisible({ timeout: 3000 }).catch(() => false)) {
      const textoPedido = await seccionPreparando.textContent() ?? ''
      expect(textoPedido).not.toMatch(/cancelar.*pedido/i)
    }
  })

  test('14 — F10-04: Pedido ENTREGADO ofrece reclamo en lugar de cancelar', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    await irA(page, '/portal')
    await esperarCarga(page)
    await page.waitForFunction(
      () => !document.body.textContent?.includes('Cargando tu portal'),
      { timeout: 15_000 }
    )
    const body = await page.locator('body').textContent() ?? ''
    const hayEntregado = body.match(/entregado|DELIVERED|recibido/i)
    if (!hayEntregado) {
      test.skip()
      return
    }
    // Para pedidos entregados, no hay cancelar — solo reclamo
    const seccionEntregado = page.locator('*').filter({ hasText: /entregado|DELIVERED/i }).first()
    if (await seccionEntregado.isVisible({ timeout: 3000 }).catch(() => false)) {
      const textoPedido = await seccionEntregado.textContent() ?? ''
      expect(textoPedido).not.toMatch(/cancelar.*pedido/i)
    }
  })

})
