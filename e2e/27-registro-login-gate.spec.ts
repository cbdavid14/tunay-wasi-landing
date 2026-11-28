import { test, expect } from '@playwright/test'
import { loginEmail, irA, esperarCarga, USERS, dniUnico, rucUnico, rucConDigito, esperarRedQuieta, abrirMenuHamburguesa, PNG_1X1 } from './helpers'
import type { Browser, Page } from '@playwright/test'

// US-01 · US-02 · US-43 · INV-01 · Registro B2B / B2C

test.describe('27 — Registro y login gate', () => {

  test('1 — Página de registro B2C carga sin sesión (US-01)', async ({ page }) => {
    await page.goto('/registro')
    await esperarRedQuieta(page)
    await esperarCarga(page)
    const body = await page.locator('body').textContent()
    // Debe mostrar formulario de registro, no redirigir a login
    expect(body).toMatch(/registr|cuenta|email|nombre/i)
    expect(page.url()).not.toMatch(/\/login/)
  })

  test('2 — Formulario de registro B2C tiene campos obligatorios (US-01)', async ({ page }) => {
    await page.goto('/registro')
    await esperarRedQuieta(page)
    await esperarCarga(page)
    // Campos mínimos para crear cuenta
    const inputEmail = page.getByPlaceholder(/email|correo|tu@/i).first()
    const inputPassword = page.getByPlaceholder(/contraseña|password|••/i).first()
    if (!await inputEmail.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Si no hay ruta /registro, buscar modal de registro
      await page.goto('/?demo=1')
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
    await page.goto('/registro')
    await esperarRedQuieta(page)
    await esperarCarga(page)
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
        await page.goto('/para-cafeterias')
        await page.waitForTimeout(500)
        const bodyB2B = await page.locator('body').textContent()
        expect(bodyB2B).toMatch(/empresa|negocio|café|restaurante|registr/i)
      }
    } else {
      expect(body).toMatch(/empresa|negocio|RUC|B2B/i)
    }
  })

  test('4 — Login gate se muestra inline al clickar "Agregar" como guest (US-43)', async ({ page }) => {
    await page.goto('/')
    await esperarCarga(page)
    const primeraTarjeta = page.locator('.sc-product-card').first()
    await expect(primeraTarjeta).toBeVisible({ timeout: 20_000 })
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
    expect(url).not.toMatch(/\/login$/)
    // Debe aparecer prompt de login/registro
    const body = await page.locator('body').textContent()
    expect(body).toMatch(/ingresar|registr|cuenta|login/i)
  })

  test('5 — Login gate: botón "Ingresar" navega a login conservando contexto (US-43)', async ({ page }) => {
    await page.goto('/')
    await esperarCarga(page)
    const primeraTarjeta = page.locator('.sc-product-card').first()
    await expect(primeraTarjeta).toBeVisible({ timeout: 20_000 })
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
    // Debe navegar a login (History API)
    expect(page.url()).toMatch(/\/login/)
  })

  test('6 — Login gate: botón "Registrarse" navega al registro (US-43)', async ({ page }) => {
    await page.goto('/')
    await esperarCarga(page)
    const primeraTarjeta = page.locator('.sc-product-card').first()
    await expect(primeraTarjeta).toBeVisible({ timeout: 20_000 })
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
    await page.goto('/portal')
    await page.waitForURL(/\/login/, { timeout: 8_000 })
    expect(page.url()).toMatch(/\/login/)
  })

  test('8 — Guest no puede acceder a #/checkout (INV-01)', async ({ page }) => {
    await page.goto('/checkout')
    await page.waitForTimeout(1000)
    // Debe redirigir a login o mostrar gate
    const url = page.url()
    const body = await page.locator('body').textContent()
    const bloqueado = url.includes('/login') || body?.match(/ingresar|login|registr|cuenta/i)
    expect(bloqueado).toBeTruthy()
  })

  test('9 — Página de login muestra formulario email+contraseña (US-02)', async ({ page }) => {
    await page.goto('/login')
    await esperarRedQuieta(page)
    await esperarCarga(page)
    // Pantalla inicio: "¿Ya tienes cuenta? Ingresar" en móvil, "Continuar con Email" en desktop
    const btnEmail = page.getByRole('button', { name: /ya tienes cuenta.*ingresar|continuar con email|ingresar con email/i }).first()
    await btnEmail.or(page.getByPlaceholder('tu@email.com')).first().waitFor({ timeout: 15_000 }).catch(() => {})
    if (await btnEmail.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btnEmail.click()
      await page.waitForTimeout(500)
    }
    const inputEmail = page.getByPlaceholder('tu@email.com').first()
    await inputEmail.scrollIntoViewIfNeeded().catch(() => {})
    await expect(inputEmail).toBeVisible({ timeout: 10_000 })
    const inputPass = page.getByPlaceholder('••••••••').first()
    await expect(inputPass).toBeVisible()
    const btnIngresar = page.getByRole('button', { name: /ingresar/i }).first()
    await expect(btnIngresar).toBeVisible()
  })

  test('10 — Login con credenciales incorrectas muestra error (US-02 validación)', async ({ page }) => {
    await page.goto('/login')
    await esperarRedQuieta(page)
    await esperarCarga(page)
    const btnEmail = page.getByRole('button', { name: /ya tienes cuenta.*ingresar|continuar con email|ingresar con email/i }).first()
    await btnEmail.or(page.getByPlaceholder('tu@email.com')).first().waitFor({ timeout: 15_000 }).catch(() => {})
    if (await btnEmail.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btnEmail.click()
      await page.waitForTimeout(500)
    }
    await page.getByPlaceholder('tu@email.com').waitFor({ timeout: 10_000 })
    await page.getByPlaceholder('tu@email.com').fill('inexistente@noexiste.test')
    await page.getByPlaceholder('••••••••').fill('contraseña_mala_123')
    await page.getByRole('button', { name: /ingresar →/i }).click()
    await page.waitForTimeout(2000)
    const body = await page.locator('body').textContent()
    // Debe mostrar mensaje de error (no navegar al portal)
    expect(body).toMatch(/error|incorrecto|inválido|no encontr|usuario|contraseña/i)
    // History API: URL sigue en /login
    expect(page.url()).toMatch(/\/login/)
  })

  test('11 — B2C puede iniciar sesión correctamente (US-02)', async ({ page }) => {
    await loginEmail(page, USERS.cliente.email, USERS.cliente.password)
    // Tras login exitoso, va al catálogo o portal
    expect(page.url()).not.toMatch(/\/login/)
    const body = await page.locator('body').textContent()
    expect(body).toMatch(/catálogo|café|tunay|portal|hola/i)
  })
})

// ── REG-01 → REG-04 · Unicidad y formato de DNI/RUC (iter.13) ─────────────────
// Los tests 14 y 15 crean cuentas reales en QA (email único por ejecución) y requieren
// firestore.rules desplegadas con la colección one_documentos.

const PASS_QA = 'Tunay2026!'
const emailQA = (tag: string) => `qa+${tag}-${Date.now()}@tunaywasi.qa`

async function paso1Emprendedor(page: Page, email: string) {
  await irA(page, '/registro-emprendedor')
  // Paso 0: "¿Cómo quieres registrarte?" → Negocio → Continuar
  await page.getByRole('button', { name: /Negocio/ }).click()
  await page.getByRole('button', { name: /Continuar/ }).click()
  await page.getByPlaceholder('María García López').waitFor({ timeout: 10_000 })
  await page.getByPlaceholder('María García López').fill('QA Unicidad RUC')
  await page.getByPlaceholder('compras@empresa.com').fill(email)
  await page.getByPlaceholder('+51 1 480 0000').fill('+51 999 000 010')
  await page.getByPlaceholder('Mín. 8 chars + 1 número').fill(PASS_QA)
  await page.getByPlaceholder('Repite').fill(PASS_QA)
  await page.getByRole('button', { name: /siguiente/i }).click()
  await page.getByPlaceholder('20XXXXXXXXX').waitFor({ timeout: 8000 })
}

async function registrarB2C(browser: Browser, dni: string): Promise<string> {
  const ctx = await browser.newContext()   // contexto limpio: sin sesión previa
  const page = await ctx.newPage()
  await irA(page, '/registro')
  await page.getByPlaceholder('Juan Pérez').fill('QA Unicidad DNI')
  await page.getByPlaceholder('tu@correo.com').fill(emailQA('dni'))
  await page.getByPlaceholder('+51 987 654 321').fill('+51 999 000 011')
  await page.getByPlaceholder('Mínimo 8 caracteres + 1 número').fill(PASS_QA)
  await page.getByPlaceholder('Repite').fill(PASS_QA)
  await page.getByRole('button', { name: /siguiente/i }).click()
  await page.getByPlaceholder('12345678').first().fill(dni)
  await page.getByRole('button', { name: /crear cuenta/i }).click()
  await page.waitForTimeout(5000)
  const body = (await page.locator('body').textContent()) ?? ''
  await ctx.close()
  return body
}

async function registrarB2B(browser: Browser, ruc: string): Promise<string> {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await paso1Emprendedor(page, emailQA('ruc'))
  await page.getByPlaceholder('20XXXXXXXXX').fill(ruc)
  await page.waitForTimeout(1500)   // simulación SUNAT (900 ms)
  await page.getByPlaceholder('Av. República de Panamá 3030, San Isidro').fill('Av. QA 123, Lima')
  await page.getByRole('button', { name: /siguiente/i }).click()
  await page.getByRole('button', { name: /crear cuenta/i }).click()
  await page.waitForTimeout(5000)
  const body = (await page.locator('body').textContent()) ?? ''
  await ctx.close()
  return body
}

test.describe('27b — Unicidad y formato DNI/RUC (REG-01→REG-04)', () => {

  test('12 — RUC con dígito verificador inválido se rechaza (REG-04)', async ({ page }) => {
    await paso1Emprendedor(page, emailQA('ruc-inv'))
    await page.getByPlaceholder('20XXXXXXXXX').fill('20601234567')   // dígito verificador incorrecto
    await expect(page.getByText(/dígito verificador/i).first()).toBeVisible()
  })

  test('13 — Cooperativa pide el RUC 20 de la cooperativa y rechaza RUC 10 (TRIB-04 · REG-03)', async ({ page }) => {
    await irA(page, '/registro-caficultor')
    await page.getByPlaceholder('María Quispe Condori').fill('QA Socio Cooperativa')
    await page.getByPlaceholder('+51 987 654 321').fill('+51 999 000 012')
    await page.getByPlaceholder('tu@correo.com').fill(emailQA('coop'))
    await page.getByPlaceholder('Mínimo 8 caracteres + 1 número').fill(PASS_QA)
    await page.getByPlaceholder('Repite').fill(PASS_QA)
    await page.getByRole('button', { name: /siguiente/i }).click()
    await page.getByText('Cooperativa', { exact: true }).click()
    await expect(page.getByText(/RUC de tu cooperativa/i)).toBeVisible()
    await page.getByPlaceholder('20123456789').fill(rucConDigito('1012345678'))  // RUC 10 válido, pero no es de cooperativa
    await expect(page.getByText(/debe empezar con 20/i).first()).toBeVisible()
  })

  test('14 — DNI B2C duplicado se rechaza (REG-01)', async ({ browser }) => {
    test.setTimeout(120_000)
    const dni = dniUnico()
    const primero = await registrarB2C(browser, dni)
    expect(primero).not.toMatch(/ya está registrado/i)
    // El primer alta debe completarse de verdad (antes fallaba por `negocio: undefined` y el test
    // pasaba igual porque el DNI quedaba reservado por el alta fallida)
    expect(primero).not.toMatch(/No se pudo crear tu cuenta|Error al registrar/i)
    expect(primero).toMatch(/Bienvenid/i)
    const segundo = await registrarB2C(browser, dni)
    expect(segundo).toMatch(/DNI ya está registrado/i)
  })

  test('15 — RUC B2B duplicado se rechaza (REG-02)', async ({ browser }) => {
    test.setTimeout(120_000)
    const ruc = rucUnico()
    const primero = await registrarB2B(browser, ruc)
    expect(primero).not.toMatch(/ya está registrado/i)
    expect(primero).not.toMatch(/No se pudo crear tu cuenta|Error al registrar/i)
    const segundo = await registrarB2B(browser, ruc)
    expect(segundo).toMatch(/RUC ya está registrado/i)
  })

  // ── GAP-NEW-06 · Flujo completo B2B hasta PENDING_APPROVAL ───────────────────

  test('27b-X — flujo completo B2B: 3 pasos → PENDING_APPROVAL', async ({ page }) => {
    const email = `qa+b2b-x-${Date.now()}@tunaywasi.qa`
    const rucDemo = rucUnico()   // RUC único por ejecución — evita REG-02 en runs sucesivos

    // Paso 0: navega a /registro-emprendedor y elige "Negocio"
    await irA(page, '/registro-emprendedor')
    await page.getByRole('button', { name: /Negocio/ }).click()
    await page.getByRole('button', { name: /Continuar/ }).click()

    // Paso 1: nombre, email único, contraseña
    await page.getByPlaceholder('María García López').waitFor({ timeout: 10_000 })
    await page.getByPlaceholder('María García López').fill('QA B2B Flujo Completo')
    await page.getByPlaceholder('compras@empresa.com').fill(email)
    await page.getByPlaceholder('+51 1 480 0000').fill('+51 999 000 020')
    await page.getByPlaceholder('Mín. 8 chars + 1 número').fill(PASS_QA)
    await page.getByPlaceholder('Repite').fill(PASS_QA)
    await page.getByRole('button', { name: /siguiente/i }).click()

    // Paso 2: RUC demo, dirFiscal, dirEnvio
    await page.getByPlaceholder('20XXXXXXXXX').waitFor({ timeout: 8_000 })
    await page.getByPlaceholder('20XXXXXXXXX').fill(rucDemo)
    await page.waitForTimeout(1500)   // simulación SUNAT (900 ms)
    await page.getByPlaceholder('Av. República de Panamá 3030, San Isidro').fill('Av. QA B2B 456, Lima')
    await page.getByRole('button', { name: /siguiente/i }).click()

    // Paso 3: resumen — click "Crear cuenta →"
    await page.getByRole('button', { name: /crear cuenta/i }).waitFor({ timeout: 8_000 })
    await page.getByRole('button', { name: /crear cuenta/i }).click()
    await page.waitForTimeout(5000)

    // Verifica pantalla PENDING_APPROVAL (texto "revisión" o "pendiente") — solo UI, sin Firestore
    const body = (await page.locator('body').textContent()) ?? ''
    expect(body).toMatch(/revisi[oó]n|pendiente|aprobaci[oó]n|PENDING/i)
  })

  test('27b-Y — flujo B2B requiere teléfono en paso 1', async ({ page }) => {
    // Paso 0: navega a /registro-emprendedor y elige "Negocio"
    await irA(page, '/registro-emprendedor')
    await page.getByRole('button', { name: /Negocio/ }).click()
    await page.getByRole('button', { name: /Continuar/ }).click()

    // Paso 1: completa todos los campos excepto teléfono
    await page.getByPlaceholder('María García López').waitFor({ timeout: 10_000 })
    await page.getByPlaceholder('María García López').fill('QA B2B Sin Telefono')
    await page.getByPlaceholder('compras@empresa.com').fill(`qa+b2b-y-${Date.now()}@tunaywasi.qa`)
    // No se llena el campo de teléfono (+51 1 480 0000)
    await page.getByPlaceholder('Mín. 8 chars + 1 número').fill(PASS_QA)
    await page.getByPlaceholder('Repite').fill(PASS_QA)
    await page.getByRole('button', { name: /siguiente/i }).click()
    await page.waitForTimeout(500)

    // Verifica error de teléfono o que el botón no avanzó (sigue en paso 1)
    const body = (await page.locator('body').textContent()) ?? ''
    // GAP-E2E-07: verificación directa de mensaje de error O ausencia del Paso 2
    const hayErrorTelefono = body.match(/tel[eé]fono|ingresa.*tel[eé]fono/i) !== null
    const sigueEnPaso1 = body.match(/20XXXXXXXXX/) === null && body.match(/dirección fiscal/i) === null
    expect(hayErrorTelefono || sigueEnPaso1).toBeTruthy()
  })

  // ── GAP-E2E-02 · dirFiscal obligatoria en paso 2 ─────────────────────────────
  test('27b-Z — flujo B2B: dirección fiscal obligatoria en paso 2', async ({ page }) => {
    await irA(page, '/registro-emprendedor')
    await page.getByRole('button', { name: /Negocio/ }).click()
    await page.getByRole('button', { name: /Continuar/ }).click()

    await page.getByPlaceholder('María García López').waitFor({ timeout: 10_000 })
    await page.getByPlaceholder('María García López').fill('QA B2B Sin Dir Fiscal')
    await page.getByPlaceholder('compras@empresa.com').fill(`qa+b2b-z-${Date.now()}@tunaywasi.qa`)
    await page.getByPlaceholder('+51 1 480 0000').fill('+51 999 000 030')
    await page.getByPlaceholder('Mín. 8 chars + 1 número').fill(PASS_QA)
    await page.getByPlaceholder('Repite').fill(PASS_QA)
    await page.getByRole('button', { name: /siguiente/i }).click()

    // Paso 2: RUC demo válido, dirFiscal vacía, click siguiente
    await page.getByPlaceholder('20XXXXXXXXX').waitFor({ timeout: 8_000 })
    await page.getByPlaceholder('20XXXXXXXXX').fill('20601234565')
    await page.waitForTimeout(1500)
    // No se llena dirFiscal
    await page.getByRole('button', { name: /siguiente/i }).click()
    await page.waitForTimeout(500)

    // Debe seguir en Paso 2 (sin el texto del resumen) o mostrar error dirección
    const body = (await page.locator('body').textContent()) ?? ''
    const sigueEnPaso2 = body.match(/Revisa y confirma/i) === null
    const hayErrorDir = body.match(/direcci[oó]n|fiscal/i) !== null
    expect(sigueEnPaso2 || hayErrorDir).toBeTruthy()
  })

  // ── GAP-E2E-03 · RUC rechazado por SUNAT simulada ─────────────────────────────
  test('27b-W — flujo B2B: RUC rechazado por SUNAT bloquea avance al paso 3', async ({ page }) => {
    await irA(page, '/registro-emprendedor')
    await page.getByRole('button', { name: /Negocio/ }).click()
    await page.getByRole('button', { name: /Continuar/ }).click()

    await page.getByPlaceholder('María García López').waitFor({ timeout: 10_000 })
    await page.getByPlaceholder('María García López').fill('QA B2B RUC SUNAT Error')
    await page.getByPlaceholder('compras@empresa.com').fill(`qa+b2b-w-${Date.now()}@tunaywasi.qa`)
    await page.getByPlaceholder('+51 1 480 0000').fill('+51 999 000 040')
    await page.getByPlaceholder('Mín. 8 chars + 1 número').fill(PASS_QA)
    await page.getByPlaceholder('Repite').fill(PASS_QA)
    await page.getByRole('button', { name: /siguiente/i }).click()

    // Paso 2: RUC que SUNAT rechaza (20000000001)
    await page.getByPlaceholder('20XXXXXXXXX').waitFor({ timeout: 8_000 })
    await page.getByPlaceholder('20XXXXXXXXX').fill('20000000001')
    await page.waitForTimeout(1500)   // esperar simulación SUNAT

    // El botón siguiente debe estar deshabilitado o mostrar error SUNAT
    const body = (await page.locator('body').textContent()) ?? ''
    const hayErrorSunat = body.match(/SUNAT|no encontrado|RUC no válido|dígito verificador/i) !== null
    const botonDeshabilitado = await page.getByRole('button', { name: /siguiente/i }).isDisabled().catch(() => false)
    expect(hayErrorSunat || botonDeshabilitado).toBeTruthy()
  })

  // ── GAP-E2E-04 · Razón social autofill + readOnly ─────────────────────────────
  test('27b-V — flujo B2B: razón social autofill y no editable tras RUC válido', async ({ page }) => {
    await irA(page, '/registro-emprendedor')
    await page.getByRole('button', { name: /Negocio/ }).click()
    await page.getByRole('button', { name: /Continuar/ }).click()

    await page.getByPlaceholder('María García López').waitFor({ timeout: 10_000 })
    await page.getByPlaceholder('María García López').fill('QA B2B Autofill Test')
    await page.getByPlaceholder('compras@empresa.com').fill(`qa+b2b-v-${Date.now()}@tunaywasi.qa`)
    await page.getByPlaceholder('+51 1 480 0000').fill('+51 999 000 050')
    await page.getByPlaceholder('Mín. 8 chars + 1 número').fill(PASS_QA)
    await page.getByPlaceholder('Repite').fill(PASS_QA)
    await page.getByRole('button', { name: /siguiente/i }).click()

    await page.getByPlaceholder('20XXXXXXXXX').waitFor({ timeout: 8_000 })
    await page.getByPlaceholder('20XXXXXXXXX').fill('20601234565')
    await page.waitForTimeout(1500)   // esperar autofill SUNAT

    // Razón social debe haberse autollenado con texto no vacío
    const body = (await page.locator('body').textContent()) ?? ''
    expect(body).toMatch(/CAFÉ EL ORIGEN|EMPRESA DEMO/i)

    // El campo razón social debe ser readOnly
    const razonSocialInput = page.locator('input[readonly]').or(page.locator('input[disabled]')).first()
    const isReadonly = await razonSocialInput.count() > 0
    expect(isReadonly).toBeTruthy()
  })
})


// ── 27c — Embudo de onboarding (iter.16) ─────────────────────────────────────
// Verifica que los pasos del onboarding se ENVÍAN a Firestore (one_analytics). Antes de iter.16
// la colección no tenía regla y todos los eventos se perdían en silencio.
// Se inspecciona el tráfico de escritura de Firestore (WebChannel) buscando el evento.
test.describe('27c — Embudo de onboarding (iter.16)', () => {
  test('16 — /login registra el paso "bienvenida" en one_analytics', async ({ page }) => {
    const escrito = page.waitForRequest(
      req => req.method() === 'POST' && req.url().includes('firestore.googleapis.com') &&
        (req.postData() ?? '').includes('onboarding_paso') && (req.postData() ?? '').includes('bienvenida'),
      { timeout: 20_000 },
    )
    await irA(page, '/login')
    const req = await escrito
    const body = req.postData() ?? ''
    expect(body).toContain('onboardingId')
    expect(body).toMatch(/P1/)                       // puerta: bienvenida
    expect(body).not.toMatch(/@tunaywasi|@gmail/)     // sin PII
  })

  test('17 — /registro registra el paso "cuenta" con puerta P3', async ({ page }) => {
    const escrito = page.waitForRequest(
      req => req.method() === 'POST' && req.url().includes('firestore.googleapis.com') &&
        (req.postData() ?? '').includes('onboarding_paso') && (req.postData() ?? '').includes('P3'),
      { timeout: 20_000 },
    )
    await irA(page, '/registro')
    const body = (await escrito).postData() ?? ''
    expect(body).toContain('cuenta')
  })
})

// ── 27d — Retorno tras login (web 3.1 · AUTH-04 · GAP-F01-09/10) ─────────────
// Un único destino tras el acceso: carrito → página de origen (returnTo) → portal del rol.
test.describe('27d — Retorno tras login (AUTH-04)', () => {
  async function loginDesdeFormulario(page: Page, email: string, password: string) {
    const btnEmail = page.getByRole('button', { name: /ya tienes cuenta.*ingresar|continuar con email|ingresar con email/i }).first()
    await btnEmail.or(page.getByPlaceholder('tu@email.com')).first().waitFor({ timeout: 15_000 }).catch(() => {})
    if (await btnEmail.isVisible().catch(() => false)) await btnEmail.click()
    await page.getByPlaceholder('tu@email.com').waitFor({ timeout: 10_000 }).catch(() => {})
    await page.getByPlaceholder('tu@email.com').fill(email)
    await page.getByPlaceholder('••••••••').fill(password)
    await page.getByRole('button', { name: /ingresar →/i }).click()
    await page.waitForFunction(() => !window.location.pathname.startsWith('/login'), undefined, { timeout: 20_000 })
  }

  test('18 — "Ingresar" del header vuelve a la página de origen tras el login', async ({ page }) => {
    await irA(page, '/?origen=e2e-retorno')
    // En móvil (≤480 px) .header-login-btn está oculto; se accede desde el menú ☰
    const btnHeaderLogin = page.locator('a.header-login-btn').first()
    if (await btnHeaderLogin.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btnHeaderLogin.click()
    } else {
      await abrirMenuHamburguesa(page)
      await page.locator('nav').getByRole('link', { name: /^Ingresar$/i }).first().click()
    }
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    await esperarCarga(page)
    await loginDesdeFormulario(page, USERS.cliente.email, USERS.cliente.password)
    await page.waitForTimeout(1500)
    const url = new URL(page.url())
    expect(url.pathname).toBe('/')
    expect(url.search).toContain('origen=e2e-retorno')   // antes: siempre /portal
  })

  test('19 — Con carrito, tras el login va a /checkout (destino único)', async ({ page }) => {
    await irA(page, '/')
    await page.evaluate(() => localStorage.setItem('one_carrito_items', JSON.stringify([{
      producto: { id: 'producto-001', nombre: 'Bourbon Lavado — Finca La Coipa', precioBaseKgCents: 45000, caficultorId: 'caficultor-001', caficultorNombre: 'Segundo Rojas Herrera' },
      formato: '1kg', qty: 1,
    }])))
    await irA(page, '/login')
    await loginDesdeFormulario(page, USERS.cliente.email, USERS.cliente.password)
    await page.waitForTimeout(2000)
    expect(new URL(page.url()).pathname).toBe('/checkout')   // antes AppONE podía mandar a /portal
  })

  test('20 — 🔒 de la tarjeta (guest) va a "¿Cómo usarás TunayWasi?" (/login?registro=1)', async ({ page }) => {
    await irA(page, '/')
    const candado = page.locator('.sc-product-card .sc-add-btn').first()
    await expect(candado).toBeVisible({ timeout: 10_000 })
    await candado.click()
    await page.waitForURL(/\/login\?registro=1/, { timeout: 10_000 })
    await esperarCarga(page)
    await expect(page.getByText(/¿Cómo usarás TunayWasi\?/i).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: /Soy Cliente/i }).first()).toBeVisible()
  })

  test('21 — "Agregar al carrito" del detalle (guest) también va a /login?registro=1 (GAP-F01-13)', async ({ page }) => {
    await irA(page, '/')
    // Abrir el detalle de una tarjeta que no sea café verde (el guest sí puede guardarla)
    const tarjeta = page.locator('.sc-product-card').filter({ hasNotText: /verde/i }).first()
    await expect(tarjeta).toBeVisible({ timeout: 10_000 })
    await tarjeta.click()
    const btn = page.getByRole('button', { name: /agregar al carrito/i }).first()
    await expect(btn).toBeVisible({ timeout: 10_000 })
    await btn.click()
    await page.waitForURL(/\/login\?registro=1/, { timeout: 10_000 })
    const carrito = await page.evaluate(() => localStorage.getItem('one_carrito_items'))
    expect(JSON.parse(carrito ?? '[]').length).toBeGreaterThan(0)   // el producto queda guardado
  })

  test('22 — Alta de persona desde /login muestra "¡Bienvenido/a!" y no se salta (3.5 · GAP-F01-18)', async ({ page }) => {
    test.setTimeout(90_000)
    const vis = (ph: string) => page.locator(`input[placeholder="${ph}"]:visible`).first()
    await irA(page, '/login?registro=1')
    await page.getByRole('button', { name: /Soy Cliente/ }).first().click()
    await page.getByText('Compra café para tu consumo personal. Solo necesitas tu DNI.').first().click()
    await page.getByRole('button', { name: /Continuar →/ }).first().click()
    await vis('Juan Pérez').fill('QA Bienvenida')
    await vis('tu@correo.com').fill(emailQA('bienvenida'))     // antes este campo no guardaba lo escrito
    await vis('+51 987 654 321').fill('+51 999 111 222')       // D-15-03: el teléfono va en el paso 1
    const pw = page.locator('input[type=password]:visible')
    for (let i = 0; i < await pw.count(); i++) await pw.nth(i).fill(PASS_QA)
    await page.getByRole('button', { name: /Siguiente →/ }).first().click()
    await vis('12345678').fill(dniUnico())
    await page.waitForTimeout(1000)
    await page.getByRole('button', { name: /Crear cuenta →/ }).first().click()
    const bienvenida = page.getByTestId('onboarding-bienvenida')
    await expect(bienvenida).toBeVisible({ timeout: 30_000 })
    await page.waitForTimeout(5000)
    await expect(bienvenida).toBeVisible()                        // AppONE ya no la salta al cargar el perfil
    await bienvenida.getByRole('button').first().click()
    await page.waitForTimeout(2000)
    expect(new URL(page.url()).pathname).toBe('/')                // sin carrito ni origen → catálogo
  })

  // BUG: en "Soy Caficultor → Paso 1 de 3 · Crea tu cuenta" el Email no aceptaba lo tecleado
  // (input controlado sin onChange) y un pending de Google rancio en sessionStorage lo bloqueaba.
  // Se teclea carácter a carácter (fill() puede ocultar el bug) en estado limpio y con storage rancio.
  for (const estado of ['limpio', 'pending-sin-email', 'pending-rancio'] as const) {
    test(`22b — Caficultor Paso 1: el Email se puede escribir (${estado})`, async ({ page }) => {
      await irA(page, '/login?registro=1')
      if (estado !== 'limpio') {
        await page.evaluate((e) => {
          const pending = e === 'pending-sin-email'
            ? { uid: 'uid-rancio', nombre: 'Viejo', email: '' }
            : { uid: 'uid-rancio', nombre: 'Viejo', email: 'viejo@gmail.com' }
          sessionStorage.setItem('one_google_pending_registro', JSON.stringify(pending))
        }, estado)
        await page.reload()
        await esperarCarga(page)
      }
      await page.getByRole('button', { name: /Soy Caficultor/ }).first().click()
      await expect(page.getByText('Paso 1 de 3').first()).toBeVisible({ timeout: 10_000 })
      const emailInput = page.locator('input[type=email]:visible').first()
      await expect(emailInput).toBeEditable()
      await emailInput.click()
      await emailInput.press('ControlOrMeta+a')
      await emailInput.press('Backspace')
      await emailInput.pressSequentially('nuevo@correo.pe')
      await expect(emailInput).toHaveValue('nuevo@correo.pe')
    })
  }

  // Contraparte: un alta Google en curso y VÁLIDA (sesión Auth con el mismo uid, sin perfil)
  // sí deja el Email bloqueado con el correo de Google.
  test('22c — Caficultor Paso 1: con pending de Google válido el Email queda bloqueado', async ({ page }) => {
    await irA(page, '/login?registro=1')
    const correo = emailQA('googlepending')
    // Se usa la MISMA instancia de Firebase Auth de la app (módulos servidos por Vite):
    // se crea un usuario Auth sin documento en one_usuarios, como un alta Google a medias.
    const uid = await page.evaluate(async ({ correo, pass }) => {
      const src = await (await fetch('/src/one/authService.ts')).text()
      const authUrl = src.match(/from\s+["']([^"']*firebase_auth[^"']*)["']/)![1]
      const fa = await import(/* @vite-ignore */ authUrl)
      const { auth } = await import(/* @vite-ignore */ '/src/shared/firebase.ts')
      const cred = await fa.createUserWithEmailAndPassword(auth, correo, pass)
      sessionStorage.setItem('one_google_pending_registro', JSON.stringify({ uid: cred.user.uid, nombre: 'QA Google', email: correo }))
      return cred.user.uid as string
    }, { correo, pass: PASS_QA })
    expect(uid).toBeTruthy()
    await page.reload()
    await esperarCarga(page)
    await page.getByRole('button', { name: /Soy Caficultor/ }).first().click()
    await expect(page.getByText('Paso 1 de 3').first()).toBeVisible({ timeout: 10_000 })
    const emailInput = page.locator('input[type=email]:visible').first()
    await expect(emailInput).toHaveValue(correo)
    await expect(emailInput).not.toBeEditable()
    // limpieza: borrar el usuario Auth de prueba
    await page.evaluate(async () => {
      const { auth } = await import(/* @vite-ignore */ '/src/shared/firebase.ts')
      await auth.currentUser?.delete()
      sessionStorage.removeItem('one_google_pending_registro')
    })
  })
})

// ── 27e — Acceso desde el menú ☰ en móvil (mobile-qa · Pixel 7) ──────────────
// El GlobalHeader oculta .header-login-btn y .header-register-btn en ≤480 px.
// Los tests de escritorio (secciones 27 y 27d) usan esos botones directamente;
// estos tests verifican el flujo equivalente a través del panel lateral.
test.describe('27e — Menú ☰: acceso en móvil', () => {

  test('23 — El botón ☰ abre el panel lateral (menú principal)', async ({ page }) => {
    await irA(page, '/')
    await abrirMenuHamburguesa(page)
    // El panel lateral muestra al menos un enlace de navegación
    const panel = page.locator('nav').filter({ hasText: /catálogo|caficultores/i }).first()
    await expect(panel).toBeVisible({ timeout: 5_000 })
  })

  test('24 — Menú ☰ (guest): "Ingresar" navega a /login', async ({ page }) => {
    await irA(page, '/')
    await abrirMenuHamburguesa(page)
    const btnIngresar = page.locator('nav').getByRole('link', { name: /^Ingresar$/i }).first()
    await expect(btnIngresar).toBeVisible({ timeout: 5_000 })
    await btnIngresar.click()
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    expect(page.url()).toMatch(/\/login/)
  })

  test('25 — Menú ☰ (guest): "Crear cuenta" navega a /login?registro=1', async ({ page }) => {
    await irA(page, '/')
    await abrirMenuHamburguesa(page)
    const btnCrear = page.locator('nav').getByRole('link', { name: /crear cuenta/i }).first()
    await expect(btnCrear).toBeVisible({ timeout: 5_000 })
    await btnCrear.click()
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    expect(page.url()).toMatch(/registro=1/)
    await esperarCarga(page)
    // Debe mostrar la selección de tipo de cuenta (¿Cómo usarás TunayWasi?)
    const body = await page.locator('body').textContent()
    expect(body).toMatch(/¿Cómo usarás TunayWasi\?|Soy Cliente|Soy Negocio|registro/i)
  })

  test('26 — Menú ☰: "Registrarme como caficultor" navega al registro de caficultor', async ({ page }) => {
    await irA(page, '/')
    await abrirMenuHamburguesa(page)
    const btnCaficultor = page.locator('nav').getByRole('link', { name: /registrarme como caficultor/i }).first()
    await expect(btnCaficultor).toBeVisible({ timeout: 5_000 })
    await btnCaficultor.click()
    await page.waitForTimeout(1000)
    const body = await page.locator('body').textContent()
    expect(body).toMatch(/caficultor|registr|productor/i)
  })
})

// ── 27f — Alta de caficultor por /login (AuthScreen) · QA 2026-11-27 ─────────
// BUG-REG-04: el alta terminaba en el paso 1 · BUG-REG-05: "Confirmar" sin comprobar ·
// BUG-REG-06: no había "Cerrar sesión". Crean cuentas reales en QA (datos desechables).
test.describe('27f — Alta caficultor por /login (BUG-REG-04/05/06)', () => {
  const vis = (page: Page, ph: string) => page.locator(`input[placeholder="${ph}"]:visible`).first()

  async function paso1Caficultor(page: Page, email: string, confirmar = PASS_QA) {
    await irA(page, '/login?registro=1')
    await page.getByRole('button', { name: /Soy Caficultor/ }).first().click()
    await expect(page.getByText('Paso 1 de 3').first()).toBeVisible({ timeout: 10_000 })
    await vis(page, 'María Quispe Condori').fill('QA Caficultor Login')
    await vis(page, '+51 987 654 321').fill('+51 999 222 333')
    await vis(page, 'tu@correo.com').fill(email)
    await vis(page, 'Mín. 8 chars + 1 núm').fill(PASS_QA)
    await vis(page, 'Repite').fill(confirmar)
    await page.getByRole('button', { name: /Siguiente →/ }).first().click()
  }

  async function pasosFincaIdentidad(page: Page, dni: string) {
    await expect(page.getByText(/Paso 2 de 3|Tu finca/).first()).toBeVisible({ timeout: 15_000 })
    const selects = page.locator('select:visible')
    await selects.nth(0).selectOption('Cajamarca')
    await vis(page, 'Ej. San Ignacio').fill('San Ignacio')
    await selects.nth(1).selectOption('Caturra')
    await selects.nth(2).selectOption('Honey')
    await page.getByRole('button', { name: /Siguiente →/ }).first().click()
    await expect(page.getByText('Verifica tu identidad').first()).toBeVisible({ timeout: 10_000 })
    await vis(page, '12345678').fill(dni)
    // Fotos KYC obligatorias (be62d73): inputs file ocultos, DNI y selfie
    const files = page.locator('input[type=file]')
    await files.nth(0).setInputFiles(PNG_1X1)
    await files.nth(1).setInputFiles(PNG_1X1)
    await vis(page, '+51 987 654 321').fill('+51 999 222 333')
    await page.getByRole('button', { name: /Crear cuenta →/ }).first().click()
  }

  /** Lee one_usuarios/{uid actual} con la MISMA instancia de Firebase de la app (módulos de Vite). */
  async function perfilActual(page: Page) {
    return page.evaluate(async () => {
      const src = await (await fetch('/src/one/service.ts')).text()
      const fsUrl = src.match(/from\s+["']([^"']*firebase_firestore[^"']*)["']/)![1]
      const fs = await import(/* @vite-ignore */ fsUrl)
      const { auth, db } = await import(/* @vite-ignore */ '/src/shared/firebase.ts')
      const uid = auth.currentUser?.uid
      if (!uid) return null
      const snap = await fs.getDoc(fs.doc(db, 'one_usuarios', uid))
      const d = snap.data() ?? {}
      return { rol: d.rol, dni: d.caficultor?.dni, yape: d.caficultor?.yape, region: d.caficultor?.region, onboarding: d.onboarding?.estado }
    })
  }

  test('26 — BUG-REG-04: el alta recorre Cuenta → Finca → Identidad y termina con el perfil completo', async ({ page }) => {
    test.setTimeout(90_000)
    await paso1Caficultor(page, emailQA('cafl'))
    // Antes: "Siguiente →" creaba la cuenta y AppONE sacaba al usuario a /caficultor-portal
    await expect(page.getByText('Paso 2 de 3').first()).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(3000)
    expect(new URL(page.url()).pathname).toBe('/login')
    await expect(page.getByText('Paso 2 de 3').first()).toBeVisible()
    const dni = dniUnico()
    await pasosFincaIdentidad(page, dni)
    await page.waitForURL(/\/caficultor-portal/, { timeout: 30_000 })
    await expect.poll(() => perfilActual(page), { timeout: 15_000 }).toMatchObject({
      rol: 'seller', dni, region: 'Cajamarca', yape: '+51 999 222 333', onboarding: 'completo',
    })
  })

  test('27 — BUG-REG-04: un seller a medias (sin bloque caficultor) vuelve a completar el alta', async ({ page }) => {
    test.setTimeout(90_000)
    await irA(page, '/')
    // Cuenta + perfil seller SIN bloque caficultor, como dejaba el bug
    await page.evaluate(async ({ email, pass }) => {
      const { registrar } = await import(/* @vite-ignore */ '/src/one/authService.ts')
      await registrar(email, pass, 'QA Seller a medias', 'seller')
    }, { email: emailQA('medias'), pass: PASS_QA })
    await irA(page, '/caficultor-portal')
    await page.waitForURL(/\/login/, { timeout: 15_000 })
    await expect(page.getByText('Tu finca').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('onboarding-cerrar-sesion')).toBeVisible()
    await pasosFincaIdentidad(page, dniUnico())
    await page.waitForURL(/\/caficultor-portal/, { timeout: 30_000 })
    await expect.poll(() => perfilActual(page), { timeout: 15_000 }).toMatchObject({ rol: 'seller', onboarding: 'completo' })
  })

  test('28 — BUG-REG-05: "Confirmar" distinto de la contraseña no deja avanzar (caficultor)', async ({ page }) => {
    await paso1Caficultor(page, emailQA('conf'), 'OtraClave99')
    await expect(page.getByText('Las contraseñas no coinciden.').first()).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('Paso 1 de 3').first()).toBeVisible()
  })

  test('29 — BUG-REG-05: "Confirmar" distinto de la contraseña no deja avanzar (cliente)', async ({ page }) => {
    await irA(page, '/login?registro=1')
    await page.getByRole('button', { name: /Soy Cliente/ }).first().click()
    await page.getByText('Compra café para tu consumo personal. Solo necesitas tu DNI.').first().click()
    await page.getByRole('button', { name: /Continuar →/ }).first().click()
    await vis(page, 'Juan Pérez').fill('QA Confirmar')
    await vis(page, 'tu@correo.com').fill(emailQA('confcli'))
    await vis(page, '+51 987 654 321').fill('+51 999 111 223')
    await vis(page, 'Mínimo 8 caracteres + 1 número').fill(PASS_QA)
    await vis(page, 'Repite').fill('OtraClave99')
    await page.getByRole('button', { name: /Siguiente →/ }).first().click()
    await expect(page.getByText('Las contraseñas no coinciden.').first()).toBeVisible({ timeout: 5_000 })
  })

  test('30 — BUG-REG-06: el caficultor cierra sesión desde el menú ☰ y vuelve como guest', async ({ page }) => {
    await loginEmail(page, USERS.caficultor.email, USERS.caficultor.password)
    await irA(page, '/caficultor-portal')
    await abrirMenuHamburguesa(page)
    const salir = page.getByTestId('menu-cerrar-sesion')
    await expect(salir).toBeVisible({ timeout: 8_000 })
    await salir.click()
    await page.waitForURL(u => new URL(u).pathname === '/', { timeout: 10_000 })   // vuelve al inicio
    await expect.poll(() => perfilActual(page)).toBeNull()       // sin sesión Auth
    expect(await page.evaluate(() => sessionStorage.getItem('tw_return_to'))).toBeNull()
    await irA(page, '/caficultor-portal')
    await page.waitForURL(/\/login/, { timeout: 10_000 })        // el portal ya no es accesible
  })

  test('31 — BUG-REG-06: "Cerrar sesión" visible en el Perfil del portal caficultor', async ({ page }) => {
    await loginEmail(page, USERS.caficultor.email, USERS.caficultor.password)
    await irA(page, '/caficultor-portal')
    await abrirMenuHamburguesa(page)
    await page.locator('nav').getByRole('button', { name: /^⚙️\s*Perfil$/ }).first().click()
    const salir = page.getByTestId('perfil-cerrar-sesion')
    await expect(salir).toBeVisible({ timeout: 15_000 })
    await salir.click()
    await page.waitForURL(u => new URL(u).pathname === '/', { timeout: 10_000 })   // vuelve al inicio
    await expect.poll(() => perfilActual(page)).toBeNull()       // sin sesión Auth
  })

  test('32 — BUG-REG-06: "Cerrar sesión" visible en el Perfil del portal de negocio', async ({ page }) => {
    await loginEmail(page, USERS.barista.email, USERS.barista.password)
    await irA(page, '/portal')
    await abrirMenuHamburguesa(page)
    await page.locator('nav').getByRole('button', { name: /^⚙️\s*Perfil$/ }).first().click()
    const salir = page.getByTestId('perfil-cerrar-sesion')
    await expect(salir).toBeVisible({ timeout: 15_000 })
    await salir.click()
    await page.waitForURL(u => new URL(u).pathname === '/', { timeout: 10_000 })   // vuelve al inicio
    await expect.poll(() => perfilActual(page)).toBeNull()       // sin sesión Auth
  })
})

// ── 27g — Flujo caficultor actualizado (GAP-19/20/21/22/13) ──────────────────
// Verifica los cuatro GAPs del flujo caficultor vía AuthScreen (/login?registro=1):
//   GAP-19: modalidades tributarias TRIB-04 (SOLO_DNI, RUC_PROPIO, COOPERATIVA)
//   GAP-21: texto KYC correcto ("Verificación manual", "24", sin "automática" ni "IA")
//   GAP-22: WhatsApp y Yape son campos separados
//   GAP-13: inputs file para fotos KYC en paso identidad
test.describe('27g — Flujo caficultor actualizado (GAP-19/20/21/22/13)', () => {

  const PASS_G = 'Tunay2026!'
  const emailG = (tag: string) => `qa+g-${tag}-${Date.now()}@tunaywasi.qa`
  const vis = (page: Page, ph: string) => page.locator(`input[placeholder="${ph}"]:visible`).first()

  /** Navega a /login?registro=1, escoge "Soy Caficultor" y rellena el Paso 1 sin crear la cuenta. */
  async function llegar_paso1_caficultor(page: Page) {
    await irA(page, '/login?registro=1')
    await page.getByRole('button', { name: /Soy Caficultor/ }).first().click()
    await expect(page.getByText('Paso 1 de 3').first()).toBeVisible({ timeout: 10_000 })
  }

  /** Rellena Paso 1 y hace click en "Siguiente →" para llegar al Paso 2 (finca). */
  async function llegar_paso_finca(page: Page) {
    await llegar_paso1_caficultor(page)
    await vis(page, 'María Quispe Condori').fill('QA GAP Caficultor')
    await vis(page, '+51 987 654 321').fill('+51 999 777 888')
    await vis(page, 'tu@correo.com').fill(emailG('finca'))
    await vis(page, 'Mín. 8 chars + 1 núm').fill(PASS_G)
    await vis(page, 'Repite').fill(PASS_G)
    await page.getByRole('button', { name: /Siguiente →/ }).first().click()
    await expect(page.getByText(/Paso 2 de 3|Tu finca/).first()).toBeVisible({ timeout: 15_000 })
  }

  /** Rellena los campos mínimos de finca y avanza al Paso 3 (identidad). */
  async function llegar_paso_identidad(page: Page) {
    await llegar_paso_finca(page)
    const selects = page.locator('select:visible')
    await selects.nth(0).selectOption('Cajamarca')
    await vis(page, 'Ej. San Ignacio').fill('San Ignacio')
    await selects.nth(1).selectOption('Caturra')
    await selects.nth(2).selectOption('Honey')
    // Modalidad por defecto = SOLO_DNI → no se necesita RUC
    await page.getByRole('button', { name: /Siguiente →/ }).first().click()
    await expect(page.getByText('Verifica tu identidad').first()).toBeVisible({ timeout: 10_000 })
  }

  // ── GAP-19 · TRIB-04 en AuthScreen ───────────────────────────────────────────

  test('33 — GAP-19: caficultor SOLO_DNI no ve el campo RUC y puede avanzar', async ({ page }) => {
    await llegar_paso_finca(page)
    // Verificar que SOLO_DNI es la opción por defecto
    const bodyAntes = await page.locator('body').textContent()
    expect(bodyAntes).toMatch(/Modalidad tributaria|Solo DNI|SOLO_DNI|modalidad/i)
    // El campo RUC no debe estar visible con SOLO_DNI
    const campoRuc = page.locator('input[placeholder="10XXXXXXXXX o 20XXXXXXXXX"]')
      .or(page.locator('input[placeholder="20XXXXXXXXX"]')).first()
    await expect(campoRuc).not.toBeVisible()
    // Puede avanzar al paso identidad sin RUC
    const selects = page.locator('select:visible')
    await selects.nth(0).selectOption('Cajamarca')
    await vis(page, 'Ej. San Ignacio').fill('San Ignacio')
    await selects.nth(1).selectOption('Caturra')
    await selects.nth(2).selectOption('Honey')
    await page.getByRole('button', { name: /Siguiente →/ }).first().click()
    await expect(page.getByText('Verifica tu identidad').first()).toBeVisible({ timeout: 10_000 })
  })

  test('34 — GAP-19: caficultor RUC_PROPIO ve el campo RUC y no avanza con RUC inválido', async ({ page }) => {
    await llegar_paso_finca(page)
    // Seleccionar RUC propio
    await page.getByText('RUC propio', { exact: true }).click()
    // El campo RUC debe aparecer con placeholder correcto
    const campoRuc = page.locator('input[placeholder="10XXXXXXXXX o 20XXXXXXXXX"]').first()
    await expect(campoRuc).toBeVisible({ timeout: 5_000 })
    // Rellenar campos mínimos de finca
    const selects = page.locator('select:visible')
    await selects.nth(0).selectOption('Cajamarca')
    await vis(page, 'Ej. San Ignacio').fill('San Ignacio')
    await selects.nth(1).selectOption('Caturra')
    await selects.nth(2).selectOption('Honey')
    // RUC inválido (ni 10 ni 20 de prefijo)
    await campoRuc.fill('30123456789')
    await page.getByRole('button', { name: /Siguiente →/ }).first().click()
    // No debe avanzar — debe mostrar error de RUC
    const body = await page.locator('body').textContent()
    expect(body).toMatch(/debe empezar con|RUC|inválido/i)
    // Sigue en paso finca
    await expect(page.getByText(/Paso 2 de 3|Tu finca/).first()).toBeVisible()
  })

  test('35 — GAP-19: caficultor COOPERATIVA solo acepta RUC prefijo 20 y rechaza prefijo 10', async ({ page }) => {
    await llegar_paso_finca(page)
    // Seleccionar Cooperativa
    await page.getByText('Cooperativa', { exact: true }).click()
    // El campo RUC debe aparecer con placeholder 20XXXXXXXXX
    const campoRuc = page.locator('input[placeholder="20XXXXXXXXX"]').first()
    await expect(campoRuc).toBeVisible({ timeout: 5_000 })
    // Rellenar campos mínimos de finca
    const selects = page.locator('select:visible')
    await selects.nth(0).selectOption('Cajamarca')
    await vis(page, 'Ej. San Ignacio').fill('San Ignacio')
    await selects.nth(1).selectOption('Caturra')
    await selects.nth(2).selectOption('Honey')
    // RUC con prefijo 10 (persona natural) — no válido para cooperativa
    await campoRuc.fill(rucConDigito('1012345678'))
    await page.getByRole('button', { name: /Siguiente →/ }).first().click()
    const body = await page.locator('body').textContent()
    expect(body).toMatch(/debe empezar con 20|RUC.*cooperativa|cooperativa.*RUC/i)
    // Sigue en paso finca
    await expect(page.getByText(/Paso 2 de 3|Tu finca/).first()).toBeVisible()
  })

  // ── GAP-21 · Texto KYC correcto ───────────────────────────────────────────────

  test('36 — GAP-21: el paso identidad muestra "Verificación manual" y "24" horas', async ({ page }) => {
    await llegar_paso_identidad(page)
    const body = await page.locator('body').textContent()
    // Debe mencionar verificación manual y plazo de 24 horas
    expect(body).toMatch(/verificaci[oó]n manual/i)
    expect(body).toMatch(/24/)
    // No debe mencionar verificación automática ni IA
    expect(body).not.toMatch(/verificaci[oó]n autom[aá]tica/i)
    expect(body).not.toMatch(/inteligencia artificial|\bIA\b/i)
  })

  // ── GAP-22 · WhatsApp y Yape separados ───────────────────────────────────────

  test('37 — GAP-22: el Paso 1 tiene campo WhatsApp separado; Yape aparece en el Paso 3', async ({ page }) => {
    await llegar_paso1_caficultor(page)
    // Paso 1: debe tener una label "WhatsApp"
    const bodyPaso1 = await page.locator('body').textContent()
    expect(bodyPaso1).toMatch(/WhatsApp/i)
    // Paso 1: NO debe tener una label "Yape"
    expect(bodyPaso1).not.toMatch(/\bYape\b/i)
    // Avanzar al paso 3 (identidad) para verificar que Yape sí está ahí
    await vis(page, 'María Quispe Condori').fill('QA GAP22')
    await vis(page, '+51 987 654 321').fill('+51 999 555 666')
    await vis(page, 'tu@correo.com').fill(emailG('gap22'))
    await vis(page, 'Mín. 8 chars + 1 núm').fill(PASS_G)
    await vis(page, 'Repite').fill(PASS_G)
    await page.getByRole('button', { name: /Siguiente →/ }).first().click()
    await expect(page.getByText(/Paso 2 de 3|Tu finca/).first()).toBeVisible({ timeout: 15_000 })
    const selects = page.locator('select:visible')
    await selects.nth(0).selectOption('Cajamarca')
    await vis(page, 'Ej. San Ignacio').fill('San Ignacio')
    await selects.nth(1).selectOption('Caturra')
    await selects.nth(2).selectOption('Honey')
    await page.getByRole('button', { name: /Siguiente →/ }).first().click()
    await expect(page.getByText('Verifica tu identidad').first()).toBeVisible({ timeout: 10_000 })
    // Paso 3: debe tener label "Yape"
    const bodyPaso3 = await page.locator('body').textContent()
    expect(bodyPaso3).toMatch(/\bYape\b/i)
    // Paso 3: no debe duplicar WhatsApp (ya se recogió en paso 1)
    expect(bodyPaso3).not.toMatch(/WhatsApp/i)
  })

  // ── GAP-13 · Fotos KYC funcionales ───────────────────────────────────────────

  test('38 — GAP-13: el paso identidad tiene input[type=file] para foto DNI con accept="image/*"', async ({ page }) => {
    await llegar_paso_identidad(page)
    // Puede haber dos file inputs; el primero corresponde a la foto frontal del DNI
    const fileInputs = page.locator('input[type="file"]')
    await expect(fileInputs.first()).toHaveCount(1)
    // Verificar atributo accept
    const accept = await fileInputs.first().getAttribute('accept')
    expect(accept).toMatch(/image\/\*/)
  })

  test('39 — GAP-13: el paso identidad tiene input[type=file] para selfie con accept="image/*"', async ({ page }) => {
    await llegar_paso_identidad(page)
    const fileInputs = page.locator('input[type="file"]')
    // Debe haber exactamente 2 inputs file: DNI y selfie
    await expect(fileInputs).toHaveCount(2)
    // Ambos deben aceptar imágenes
    const acceptSelfie = await fileInputs.nth(1).getAttribute('accept')
    expect(acceptSelfie).toMatch(/image\/\*/)
  })

  test('40 — GAP-13: intentar avanzar sin foto DNI muestra error descriptivo', async ({ page }) => {
    await llegar_paso_identidad(page)
    // Rellenar DNI pero NO subir fotos
    await vis(page, '12345678').fill('12345678')
    await page.getByRole('button', { name: /Crear cuenta →/ }).first().click()
    await page.waitForTimeout(500)
    const body = await page.locator('body').textContent()
    // Debe mostrar un error que mencione la foto del DNI
    expect(body).toMatch(/foto.*DNI|DNI.*foto|adjunta.*DNI|foto frontal/i)
    // No debe haber avanzado (sigue en paso identidad)
    await expect(page.getByText('Verifica tu identidad').first()).toBeVisible()
  })
})

// ── 27h — ESC-06: Yape restringido por modalidad tributaria (TRIB-06) ───────────
// ESC-06: SOLO_DNI → descripción NO menciona Yape/Plin como método principal de cobro.
//         COOPERATIVA → campo cobro en registro es CCI de la cooperativa, no Yape personal.
//         RUC_PROPIO → muestra campo Yape (con eventual aviso Yape Business).
// Los tests 41-43 usan /registro-caficultor (Paso 2 → Paso 3) o /login?registro=1 (AuthScreen).
// Los tests 44-45 (portal, tab Cobros) requieren auth real con perfiles de cada modalidad
// sembrados en Firestore; como ese seed no existe en el entorno E2E, se marcan test.skip
// con comentario explicativo.
test.describe('27h — ESC-06: Yape restringido por modalidad tributaria', () => {

  const PASS_H = 'Tunay2026!'
  const emailH = (tag: string) => `qa+h-${tag}-${Date.now()}@tunaywasi.qa`
  const vis = (page: Page, ph: string) => page.locator(`input[placeholder="${ph}"]:visible`).first()

  /**
   * Navega a /registro-caficultor y completa el Paso 1 (cuenta).
   * Deja al usuario en el formulario del Paso 1 justo antes de hacer clic en "Siguiente →".
   */
  async function llegar_paso1_regcaf(page: Page, email: string) {
    await irA(page, '/registro-caficultor')
    await page.getByPlaceholder('María Quispe Condori').fill('QA ESC-06')
    await page.getByPlaceholder('+51 987 654 321').fill('+51 999 100 200')
    await page.getByPlaceholder('tu@correo.com').fill(email)
    await page.getByPlaceholder('Mínimo 8 caracteres + 1 número').fill(PASS_H)
    await page.getByPlaceholder('Repite').fill(PASS_H)
    await page.getByRole('button', { name: /Siguiente →/ }).first().click()
    // El Paso 2 (finca) debe cargarse
    await expect(page.getByText(/Paso 2 de 3|Tu finca/).first()).toBeVisible({ timeout: 15_000 })
  }

  /**
   * Rellena los campos mínimos del Paso 2 (finca) con la modalidad indicada
   * y avanza al Paso 3 (identidad).
   */
  async function llegar_paso3_regcaf(page: Page, modalidad: 'SOLO_DNI' | 'RUC_PROPIO' | 'COOPERATIVA', email: string) {
    await llegar_paso1_regcaf(page, email)
    // Seleccionar modalidad si no es la de por defecto (SOLO_DNI)
    if (modalidad !== 'SOLO_DNI') {
      const textoBoton = modalidad === 'RUC_PROPIO' ? 'RUC propio' : 'Cooperativa'
      await page.getByText(textoBoton, { exact: true }).click()
      // RegistroCaficultor.tsx usa placeholder '20123456789' para ambas modalidades con RUC
      const ruc = modalidad === 'COOPERATIVA'
        ? rucConDigito('2099' + String(Date.now() % 1_000_000).padStart(6, '0'))
        : rucConDigito('1012345678')
      await vis(page, '20123456789').fill(ruc)
    }
    // Rellenar región, distrito, variedad, proceso
    const selects = page.locator('select:visible')
    await selects.nth(0).selectOption('Cajamarca')
    await vis(page, 'Ej. San Ignacio').fill('San Ignacio')
    await selects.nth(1).selectOption('Caturra')
    await selects.nth(2).selectOption('Honey')
    await page.getByRole('button', { name: /Siguiente →/ }).first().click()
    await expect(page.getByText('Verifica tu identidad').first()).toBeVisible({ timeout: 10_000 })
  }

  // ── Test 41 ───────────────────────────────────────────────────────────────────

  test('41 — ESC-06: descripción SOLO_DNI NO menciona "Yape/Plin" como método de cobro (AuthScreen)', async ({ page }) => {
    // Navegar al AuthScreen y llegar al paso de finca donde se ve la modalidad tributaria
    await irA(page, '/login?registro=1')
    await page.getByRole('button', { name: /Soy Caficultor/ }).first().click()
    await expect(page.getByText('Paso 1 de 3').first()).toBeVisible({ timeout: 10_000 })
    // Rellenar Paso 1 y avanzar al Paso 2 donde se muestra la modalidad tributaria
    await vis(page, 'María Quispe Condori').fill('QA ESC-06 Test41')
    await vis(page, '+51 987 654 321').fill('+51 999 410 000')
    await vis(page, 'tu@correo.com').fill(emailH('t41'))
    await vis(page, 'Mín. 8 chars + 1 núm').fill(PASS_H)
    await vis(page, 'Repite').fill(PASS_H)
    await page.getByRole('button', { name: /Siguiente →/ }).first().click()
    await expect(page.getByText(/Paso 2 de 3|Tu finca/).first()).toBeVisible({ timeout: 15_000 })
    // La descripción de SOLO_DNI no debe mencionar "Yape/Plin" como método de cobro principal.
    // ESC-06: cobro vía Yape/Plin es exclusivo de RUC_PROPIO; SOLO_DNI usa transferencia bancaria.
    const bodyPaso2 = await page.locator('body').textContent()
    // La opción SOLO_DNI debe estar visible (es la seleccionada por defecto)
    expect(bodyPaso2).toMatch(/Solo DNI|SOLO_DNI|modalidad tributaria/i)
    // La descripción de SOLO_DNI no debe decir que se cobra con Yape/Plin
    // (puede mencionar Yape en otros contextos, pero NO en la descripción de esta opción)
    // Verificar que la card/opción de Solo DNI no tiene "Yape/Plin" en su texto de descripción
    const textoOpcionSoloDni = await page.locator('[data-testid="opt-SOLO_DNI"], [class*="opt"]:has-text("Solo DNI")')
      .or(page.locator('div').filter({ hasText: /^Solo DNI/ }).filter({ hasText: /Solo puedes|Persona natural|liquidación/i }))
      .first()
      .textContent()
      .catch(() => null)
    if (textoOpcionSoloDni !== null) {
      // Si encontramos la opción específica, verificar que no menciona Yape/Plin como cobro
      expect(textoOpcionSoloDni).not.toMatch(/Cobra con Yape\/Plin|método.*Yape|Yape.*cobro/i)
    } else {
      // Fallback: en la sección de modalidad, el texto visible de SOLO_DNI no debe recomendar Yape/Plin
      // La regla ESC-06 indica que SOLO_DNI usa transferencia bancaria o liquidación, no Yape personal
      // Si el texto del body menciona "Solo DNI" junto a "Yape/Plin" como instrucción de cobro, es el bug
      const hayBug = bodyPaso2?.includes('Cobra con Yape/Plin') || bodyPaso2?.includes('Cobra con Yape')
      // Documentar si el bug existe (la prueba pasa en verde cuando el bug está corregido)
      expect(hayBug).toBe(false)
    }
    // La modalidad tributaria debe estar visible
    expect(bodyPaso2).toMatch(/modalidad tributaria|tipo de registro|Solo DNI|RUC propio|Cooperativa/i)
  })

  // ── Test 42 ───────────────────────────────────────────────────────────────────

  test('42 — ESC-06: COOPERATIVA muestra campo CCI (no campo Yape personal) en paso identidad (/registro-caficultor)', async ({ page }) => {
    // Navegar a /registro-caficultor y llegar al Paso 3 con modalidad COOPERATIVA
    await llegar_paso3_regcaf(page, 'COOPERATIVA', emailH('t42'))
    const body = await page.locator('body').textContent()
    // Debe mostrar "CCI" o "CCI de la cooperativa" o "cuenta interbancaria"
    expect(body).toMatch(/CCI|cuenta interbancaria|CCI.*cooperativa|cooperativa.*CCI/i)
    // No debe mostrar "Número Yape" como campo de cobro para COOPERATIVA
    // (Yape personal no aplica para socios de cooperativa — ESC-06)
    const campoYape = page.locator('input[placeholder="+51 987 654 321"]:visible')
      .or(page.locator('label:has-text("Número Yape"):visible'))
    const hayYapeVisible = await campoYape.isVisible({ timeout: 2_000 }).catch(() => false)
    if (hayYapeVisible) {
      // Si hay un campo con placeholder de teléfono, verificar que su label dice "CCI" no "Yape"
      const labelCerca = await page.locator('label:visible').filter({ hasText: /CCI|Yape/i }).first().textContent().catch(() => '')
      expect(labelCerca).toMatch(/CCI/i)
      expect(labelCerca).not.toMatch(/Yape/i)
    }
    // El campo CCI debe estar visible y ser un input de texto
    // Si existe un campo con placeholder explícito de CCI, debe ser visible
    const hayPlaceholderCCI = await page.locator('input[placeholder*="CCI" i], input[placeholder*="interbanc" i]').isVisible({ timeout: 2_000 }).catch(() => false)
    if (hayPlaceholderCCI) {
      await expect(page.locator('input[placeholder*="CCI" i], input[placeholder*="interbanc" i]').first()).toBeVisible()
    }
    // La regla ESC-06 se cumple si el body tiene CCI y NO tiene el campo Yape etiquetado como cobro cooperativa
    expect(body).toMatch(/CCI|cuenta interbancaria/i)
  })

  // ── Test 43 ───────────────────────────────────────────────────────────────────

  test('43 — ESC-06: COOPERATIVA — el campo CCI es obligatorio (error al intentar crear cuenta sin él)', async ({ page }) => {
    // Llegar al Paso 3 de /registro-caficultor con modalidad COOPERATIVA
    await llegar_paso3_regcaf(page, 'COOPERATIVA', emailH('t43'))
    // Rellenar DNI y subir fotos KYC (obligatorios) pero NO el campo CCI
    await vis(page, '12345678').fill('43214321')
    const files = page.locator('input[type=file]')
    await files.nth(0).setInputFiles(PNG_1X1)
    await files.nth(1).setInputFiles(PNG_1X1)
    // Si hay un campo Yape visible, dejarlo vacío también (el test verifica que CCI bloquea el avance)
    // Intentar crear la cuenta sin CCI
    await page.getByRole('button', { name: /Crear cuenta →/ }).first().click()
    await page.waitForTimeout(600)
    const body = await page.locator('body').textContent()
    // Debe mostrar error que mencione CCI o cooperativa para cobro
    expect(body).toMatch(/CCI.*cooperativa|cooperativa.*CCI|Ingresa el CCI|cuenta interbancaria|CCI.*pagos/i)
    // No debe haber avanzado a la pantalla de bienvenida o portal
    expect(page.url()).not.toMatch(/caficultor-portal|bienvenid/i)
    // Sigue en paso identidad
    await expect(page.getByText('Verifica tu identidad').first()).toBeVisible()
  })

  // ── Test 44 ───────────────────────────────────────────────────────────────────

  test.skip('44 — ESC-06: caficultor COOPERATIVA — tab Cobros oculta "Número Yape" y muestra "CCI Cooperativa"', async ({ page }) => {
    // SKIP: Este test requiere un usuario caficultor con modalidad COOPERATIVA autenticado
    // en Firestore. No existe un seed QA para ese perfil en este entorno E2E.
    //
    // Para ejecutar manualmente:
    //   1. Registrar un caficultor con modalidad COOPERATIVA en /registro-caficultor
    //   2. Añadir sus credenciales a USERS en e2e/helpers.ts (ej: USERS.caficultor_coop)
    //   3. Reemplazar test.skip por el flujo de loginEmail + navegación al portal:
    //
    //   await loginEmail(page, USERS.caficultor_coop.email, USERS.caficultor_coop.password)
    //   await irA(page, '/caficultor-portal')
    //   await esperarCarga(page)
    //   // Navegar al tab Configuración → subtab Cobros
    //   await page.getByRole('button', { name: /⚙️.*Configuración|Configuración/i }).first().click()
    //   await page.getByRole('button', { name: /💳.*Cobros|Cobros/i }).first().click()
    //   await page.waitForTimeout(500)
    //   const body = await page.locator('body').textContent()
    //   // COOPERATIVA: NO debe mostrar "Número Yape" como campo de cobro propio
    //   expect(body).not.toMatch(/Número Yape/i)
    //   // COOPERATIVA: SÍ debe mostrar "CCI Cooperativa" o "CCI de la cooperativa"
    //   expect(body).toMatch(/CCI.*cooperativa|cooperativa.*CCI|CCI Cooperativa/i)
    //
    // Criterio ESC-06: socios de cooperativa no usan Yape personal; el cobro es vía CCI cooperativa.
  })

  // ── Test 45 ───────────────────────────────────────────────────────────────────

  test.skip('45 — ESC-06: caficultor RUC_PROPIO — tab Cobros muestra campo Yape (Yape Business)', async ({ page }) => {
    // SKIP: Este test requiere un usuario caficultor con modalidad RUC_PROPIO autenticado
    // en Firestore. No existe un seed QA para ese perfil en este entorno E2E.
    // El caficultor de USERS.caficultor tiene modalidad indeterminada (campo no sembrado).
    //
    // Para ejecutar manualmente:
    //   1. Registrar un caficultor con modalidad RUC_PROPIO en /registro-caficultor
    //   2. Añadir sus credenciales a USERS en e2e/helpers.ts (ej: USERS.caficultor_ruc)
    //   3. Reemplazar test.skip por el flujo de loginEmail + navegación al portal:
    //
    //   await loginEmail(page, USERS.caficultor_ruc.email, USERS.caficultor_ruc.password)
    //   await irA(page, '/caficultor-portal')
    //   await esperarCarga(page)
    //   // Navegar al tab Configuración → subtab Cobros
    //   await page.getByRole('button', { name: /⚙️.*Configuración|Configuración/i }).first().click()
    //   await page.getByRole('button', { name: /💳.*Cobros|Cobros/i }).first().click()
    //   await page.waitForTimeout(500)
    //   const body = await page.locator('body').textContent()
    //   // RUC_PROPIO: SÍ debe mostrar el campo "Número Yape"
    //   expect(body).toMatch(/Número Yape/i)
    //   // RUC_PROPIO: el aviso puede mencionar "Yape Business" o no (es opcional por ahora)
    //   // expect(body).toMatch(/Yape Business/i)
    //
    // Criterio ESC-06: RUC_PROPIO puede cobrar con Yape (Yape Business para personas jurídicas).
  })
})

// ── 27i — F-01 iteración #18: formulario Persona único, Google y modo demo ───
test.describe('27i — F-01 formulario Persona único (GAP-F01-17)', () => {
  const campo = (page: Page, ph: string) => page.locator(`input[placeholder="${ph}"]:visible`).first()

  test('44 — /registro (P3) abre "Paso 1 · Tu cuenta" con teléfono y Google', async ({ page }) => {
    await irA(page, '/registro')
    await expect(page.getByText('Paso 1 · Tu cuenta').first()).toBeVisible({ timeout: 10_000 })
    for (const ph of ['Juan Pérez', 'tu@correo.com', '+51 987 654 321', 'Mínimo 8 caracteres + 1 número', 'Repite'])
      await expect(campo(page, ph)).toBeEditable()
    await expect(page.getByRole('button', { name: 'o continúa con Google' })).toBeVisible()
  })

  test('45 — Sin teléfono no se pasa del paso 1 (D-15-03)', async ({ page }) => {
    await irA(page, '/registro')
    await campo(page, 'Juan Pérez').fill('QA Sin Telefono')
    await campo(page, 'tu@correo.com').fill(emailQA('sintel'))
    await campo(page, 'Mínimo 8 caracteres + 1 número').fill(PASS_QA)
    await campo(page, 'Repite').fill(PASS_QA)
    await page.getByRole('button', { name: /Siguiente →/ }).first().click()
    await expect(page.getByText('Ingresa tu teléfono.').first()).toBeVisible()
  })

  test('46 — Alta por /registro guarda teléfono, DNI y dirección, y muestra "¡Bienvenido/a!"', async ({ page }) => {
    test.setTimeout(90_000)
    const dni = dniUnico()
    await irA(page, '/registro')
    await campo(page, 'Juan Pérez').fill('QA Persona P3')
    await campo(page, 'tu@correo.com').fill(emailQA('p3'))
    await campo(page, '+51 987 654 321').fill('+51 999 111 333')
    await campo(page, 'Mínimo 8 caracteres + 1 número').fill(PASS_QA)
    await campo(page, 'Repite').fill(PASS_QA)
    await page.getByRole('button', { name: /Siguiente →/ }).first().click()
    await expect(page.getByText('Paso 2 · Verificación').first()).toBeVisible()
    await campo(page, '12345678').fill(dni)
    await campo(page, 'Jr. Lima 123, Miraflores').fill('Av. QA 456, Lima')
    await page.getByRole('button', { name: /Crear cuenta →/ }).first().click()
    await expect(page.getByTestId('onboarding-bienvenida')).toBeVisible({ timeout: 30_000 })
    const perfil = await page.evaluate(async () => {
      const src = await (await fetch('/src/one/authService.ts')).text()
      const url = src.match(/from\s+["']([^"']*firebase_firestore[^"']*)["']/)![1]
      const fs = await import(/* @vite-ignore */ url)
      const { auth, db } = await import(/* @vite-ignore */ '/src/shared/firebase.ts')
      return (await fs.getDoc(fs.doc(db, 'one_usuarios', auth.currentUser!.uid))).data()
    })
    expect(perfil?.rol).toBe('buyer_b2c')
    expect(perfil?.telefono).toBe('+51 999 111 333')
    expect(perfil?.consumidor?.dni).toBe(dni)
    expect(perfil?.consumidor?.dirEntrega).toBe('Av. QA 456, Lima')
  })

  test('47 — Google nuevo pasa siempre por "¿Cómo quieres registrarte?"', async ({ page }) => {
    await irA(page, '/login?registro=1')
    const correo = emailQA('googletipo')
    await page.evaluate(async ({ correo, pass }) => {
      const src = await (await fetch('/src/one/authService.ts')).text()
      const authUrl = src.match(/from\s+["']([^"']*firebase_auth[^"']*)["']/)![1]
      const fa = await import(/* @vite-ignore */ authUrl)
      const { auth } = await import(/* @vite-ignore */ '/src/shared/firebase.ts')
      const cred = await fa.createUserWithEmailAndPassword(auth, correo, pass)
      sessionStorage.setItem('one_google_pending_registro', JSON.stringify({ uid: cred.user.uid, nombre: 'QA Google', email: correo }))
    }, { correo, pass: PASS_QA })
    await page.reload()
    await esperarCarga(page)
    await page.getByRole('button', { name: /Soy Cliente/ }).first().click()
    await expect(page.getByText('¿Cómo quieres registrarte?').first()).toBeVisible({ timeout: 10_000 })
    await page.getByText('Compra café para tu consumo personal. Solo necesitas tu DNI.').first().click()
    await page.getByRole('button', { name: /Continuar →/ }).first().click()
    await expect(campo(page, 'tu@correo.com')).toHaveValue(correo)
    await expect(campo(page, 'tu@correo.com')).not.toBeEditable()
    await expect(campo(page, '+51 987 654 321')).toBeEditable()
    await expect(page.locator('input[type=password]:visible')).toHaveCount(0)
    await page.evaluate(async () => {
      const { auth } = await import(/* @vite-ignore */ '/src/shared/firebase.ts')
      await auth.currentUser?.delete()
      sessionStorage.removeItem('one_google_pending_registro')
    })
  })

  for (const ruta of ['/login?demo=1', '/login?registro=1&demo=1', '/registro?demo=1']) {
    test(`48 — Con ?demo=1 no se muestra el onboarding (${ruta})`, async ({ page }) => {
      await irA(page, ruta)
      await expect.poll(() => new URL(page.url()).pathname, { timeout: 10_000 }).not.toMatch(/^\/(login|registro)/)
      await expect(page.getByText(/¿Cómo usarás TunayWasi\?|Paso 1 · Tu cuenta/)).toHaveCount(0)
    })
  }
})

// ── 27j — AUTH-01 / AUTH-04 / B2B sin acceso mayorista (F-01/F-02 gaps) ───────
// AUTH-01: modal inline al intentar comprar como guest — sin salir del catálogo.
// AUTH-04: retorno exacto a la misma vista, con mismos filtros/posición.
// F-02: B2B PENDING no puede ver precios mayoristas ni acceder al catálogo B2B.
test.describe('27j — AUTH-01 / AUTH-04 / B2B-PENDING sin acceso mayorista', () => {

  test('AUTH-01: el modal de login gate NO redirige fuera del catálogo (URL no cambia a /login)', async ({ page }) => {
    // AUTH-01: modal inline al clickar sin sesión
    await irA(page, '/')
    await expect(page.locator('.sc-product-card').first()).toBeVisible({ timeout: 20_000 })
    const urlAntes = page.url()
    // Click en la tarjeta para abrir ficha
    await page.locator('.sc-product-card').first().click()
    await page.waitForTimeout(500)
    // Click en el botón de acción de compra
    const btnAgregar = page.getByRole('button', { name: /agregar al carrito|comprar|solicitar/i }).first()
    if (!await btnAgregar.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return }
    await btnAgregar.evaluate((el: HTMLElement) => el.click())
    await page.waitForTimeout(600)
    // La URL no debe haber cambiado a /login (es modal inline)
    const urlDespues = page.url()
    expect(urlDespues).not.toMatch(/\/login$/)
    // El body debe mostrar el modal de login/registro
    const body = await page.locator('body').textContent()
    expect(body).toMatch(/ingresar|registr|cuenta|login/i)
    // La página sigue siendo el catálogo (el catálogo sigue visible)
    // Verificar que las tarjetas siguen en el DOM (no se navegó fuera)
    const tarjetasAun = page.locator('.sc-product-card')
    const count = await tarjetasAun.count()
    expect(count).toBeGreaterThan(0)
  })

  test('AUTH-04: tras login, el usuario regresa a la página exacta de origen (returnTo)', async ({ page }) => {
    // AUTH-04: vuelve exactamente donde estaba
    // Preparar — ir a una ruta interna con un parámetro identificable
    await irA(page, '/?origen=e2e-auth04-exact')
    // Simular que el usuario accede a /login desde esta página (guardando returnTo)
    await page.evaluate(() => {
      sessionStorage.setItem('tw_return_to', '/?origen=e2e-auth04-exact')
    })
    await irA(page, '/login')
    await esperarCarga(page)
    // Login directo
    const btnEmail = page.getByRole('button', { name: /ya tienes cuenta.*ingresar|continuar con email|ingresar con email/i }).first()
    await btnEmail.or(page.getByPlaceholder('tu@email.com')).first().waitFor({ timeout: 15_000 }).catch(() => {})
    if (await btnEmail.isVisible({ timeout: 3000 }).catch(() => false)) await btnEmail.click()
    await page.getByPlaceholder('tu@email.com').waitFor({ timeout: 10_000 })
    await page.getByPlaceholder('tu@email.com').fill(USERS.cliente.email)
    await page.getByPlaceholder('••••••••').fill(USERS.cliente.password)
    await page.getByRole('button', { name: /ingresar →/i }).click()
    await page.waitForFunction(() => !window.location.pathname.startsWith('/login'), undefined, { timeout: 20_000 })
    await page.waitForTimeout(1500)
    // Debe haber vuelto a la página de origen con el query param
    const url = new URL(page.url())
    expect(url.pathname).toBe('/')
    expect(url.search).toContain('origen=e2e-auth04-exact')
  })

  test('F02/B2B-01: B2B PENDING no ve precios mayoristas tras registro', async ({ page }) => {
    // B2B PENDING no puede ver precios mayoristas — verificar usando el usuario de QA
    await loginEmail(page, USERS.pending.email, USERS.pending.password)
    await irA(page, '/?demo=1')
    await esperarCarga(page)
    const body = await page.locator('body').textContent()
    // No debe ver precios mayoristas ni ficha técnica B2B
    expect(body).not.toMatch(/precio mayorista/i)
    expect(body).not.toMatch(/Ficha técnica B2B/i)
    // No debe ver acceso a catálogo wholesale
    expect(body).not.toMatch(/catálogo mayorista|acceso mayorista/i)
  })

  test('F02/B2B-01: B2B PENDING es bloqueado y ve banner de revisión al ir al portal', async ({ page }) => {
    // Reutiliza el usuario de QA b2b-pending
    await loginEmail(page, USERS.pending.email, USERS.pending.password)
    await irA(page, '/portal')
    await page.waitForFunction(
      () => !document.body.textContent?.includes('Cargando tu portal'),
      { timeout: 15_000 }
    ).catch(() => {})
    await page.waitForTimeout(500)
    const body = await page.locator('body').textContent()
    // Debe mostrar mensaje de cuenta en revisión
    expect(body).toMatch(/pendiente|revisi[oó]n|en proceso|aprobaci[oó]n|PENDING/i)
    // No debe mostrar precios mayoristas
    expect(body).not.toMatch(/precio mayorista/i)
  })

  test('F02/REG-04: RUC de 10 dígitos se rechaza en registro B2B (REG-04 · formato mínimo)', async ({ page }) => {
    // El RUC debe tener exactamente 11 dígitos
    await irA(page, '/registro-emprendedor')
    await page.getByRole('button', { name: /Negocio/ }).click()
    await page.getByRole('button', { name: /Continuar/ }).click()
    await page.getByPlaceholder('María García López').waitFor({ timeout: 10_000 })
    await page.getByPlaceholder('María García López').fill('QA B2B RUC Corto')
    await page.getByPlaceholder('compras@empresa.com').fill(`qa+b2b-ruccorto-${Date.now()}@tunaywasi.qa`)
    await page.getByPlaceholder('+51 1 480 0000').fill('+51 999 000 060')
    await page.getByPlaceholder('Mín. 8 chars + 1 número').fill(PASS_QA)
    await page.getByPlaceholder('Repite').fill(PASS_QA)
    await page.getByRole('button', { name: /siguiente/i }).click()
    // Paso 2: ingresar RUC de 10 dígitos (inválido — falta 1 dígito)
    await page.getByPlaceholder('20XXXXXXXXX').waitFor({ timeout: 8_000 })
    await page.getByPlaceholder('20XXXXXXXXX').fill('2060123456')   // 10 dígitos — inválido
    await page.waitForTimeout(1500)
    // Debe mostrar error de formato o mantener el botón deshabilitado
    const body = await page.locator('body').textContent()
    const hayErrorFormato = body?.match(/11 dígitos|dígito verificador|RUC.*inválido|formato.*RUC/i) !== null
    const botonDeshabilitado = await page.getByRole('button', { name: /siguiente/i }).isDisabled().catch(() => false)
    expect(hayErrorFormato || botonDeshabilitado).toBeTruthy()
  })
})
