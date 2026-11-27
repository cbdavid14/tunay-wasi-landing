import { test, expect } from '@playwright/test'
import { loginEmail, irA, esperarCarga, USERS, dniUnico, rucUnico, rucConDigito, esperarRedQuieta, abrirMenuHamburguesa } from './helpers'
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
    await page.goto('/?demo=1')
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
    expect(url).not.toMatch(/\/login$/)
    // Debe aparecer prompt de login/registro
    const body = await page.locator('body').textContent()
    expect(body).toMatch(/ingresar|registr|cuenta|login/i)
  })

  test('5 — Login gate: botón "Ingresar" navega a login conservando contexto (US-43)', async ({ page }) => {
    await page.goto('/?demo=1')
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
    // Debe navegar a login (History API)
    expect(page.url()).toMatch(/\/login/)
  })

  test('6 — Login gate: botón "Registrarse" navega al registro (US-43)', async ({ page }) => {
    await page.goto('/?demo=1')
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
    // Pantalla inicio: puede llamarse "Continuar con Email" (móvil) o "Ingresar con email"
    const btnEmail = page.getByRole('button', { name: /continuar con email|ingresar con email/i }).first()
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
    const btnEmail = page.getByRole('button', { name: /ingresar con email|continuar con email/i }).first()
    await btnEmail.or(page.getByPlaceholder('tu@email.com')).first().waitFor({ timeout: 15_000 }).catch(() => {})
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
  await page.getByPlaceholder('Juan Carlos Pérez Ríos').fill('QA Unicidad DNI')
  await page.getByPlaceholder('juan@email.com').fill(emailQA('dni'))
  await page.getByPlaceholder('+51 987 654 321').fill('+51 999 000 011')
  await page.getByPlaceholder('Mín. 8 chars + 1 número').fill(PASS_QA)
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
    const btnEmail = page.getByRole('button', { name: /ingresar con email|continuar con email/i }).first()
    await btnEmail.or(page.getByPlaceholder('tu@email.com')).first().waitFor({ timeout: 15_000 }).catch(() => {})
    if (await btnEmail.isVisible().catch(() => false)) await btnEmail.click()
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
    const pw = page.locator('input[type=password]:visible')
    for (let i = 0; i < await pw.count(); i++) await pw.nth(i).fill(PASS_QA)
    await page.getByRole('button', { name: /Siguiente →/ }).first().click()
    await vis('12345678').fill(dniUnico())
    await vis('+51 987 654 321').fill('+51 999 111 222')
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
