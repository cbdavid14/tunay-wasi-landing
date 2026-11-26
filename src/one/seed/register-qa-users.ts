/**
 * register-qa-users.ts — Registra los usuarios QA navegando la UI real de la app
 *
 * Uso (el servidor debe estar corriendo en localhost:5173):
 *   npx tsx src/one/seed/register-qa-users.ts
 *
 * Flujos:
 *  - cliente@tunaywasi.qa  → #/registro (RegistroConsumidor, buyer_b2c)
 *  - caficultor@tunaywasi.qa → #/registro-caficultor
 *  - barista@tunaywasi.qa  → AuthScreen email_registro (buyer_b2b vía registro rápido)
 *  - b2b-pending@tunaywasi.qa → idem
 */
import { chromium, type Page } from 'playwright'

const BASE = 'http://localhost:5173'

// ── Registrar buyer_b2c via #/registro ────────────────────────────────────────
async function registrarConsumidor(page: Page, email: string, password: string, nombre: string) {
  await page.goto(`${BASE}/registro`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(800)

  // PASO 1: nombre, email, teléfono, contraseña → "Siguiente →"
  await page.getByPlaceholder('Juan Carlos Pérez Ríos').fill(nombre)
  await page.getByPlaceholder('juan@email.com').fill(email)
  await page.getByPlaceholder('+51 987 654 321').fill('+51 999 000 001')
  await page.getByPlaceholder('Mín. 8 chars + 1 número').fill(password)
  await page.getByPlaceholder('Repite').fill(password)
  await page.getByRole('button', { name: /siguiente/i }).click()
  await page.waitForTimeout(1500)

  // PASO 2: DNI, dirección → "Crear cuenta →"
  const inputDni = page.getByPlaceholder('12345678').first()
  if (await inputDni.isVisible({ timeout: 3000 }).catch(() => false)) {
    await inputDni.fill(String(Date.now() % 100_000_000).padStart(8, '0'))  // REG-01: DNI único por ejecución
  }
  const inputDir = page.getByPlaceholder('Av. Larco 1301, Miraflores').first()
  if (await inputDir.isVisible({ timeout: 1500 }).catch(() => false)) {
    await inputDir.fill('Av. Test 123, Miraflores')
  }
  await page.getByRole('button', { name: /crear cuenta/i }).click()
  await page.waitForTimeout(3000)

  const body = await page.locator('body').textContent() ?? ''
  if (body.match(/ya está en uso|email.*use|already.*use/i)) {
    console.log(`  ℹ️  Ya existe: ${email}`)
  } else if (body.match(/verifica|verificar|enviamos|bandeja/i)) {
    console.log(`  ✅ Registrado: ${email}`)
  } else {
    const err = await page.locator('[style*="f87171"]').textContent().catch(() => '')
    console.log(`  ${err ? '⚠️  ' + err.trim() : '✅ OK'}: ${email}`)
  }
}

// ── Cerrar sesión activa ──────────────────────────────────────────────────────
async function cerrarSesion(page: Page) {
  // Limpiar localStorage y recargar — fuerza estado guest
  await page.evaluate(() => localStorage.clear())
  await page.goto('http://localhost:5173/login')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)
}

// ── Registrar buyer_b2b via formulario consumidor + actualizar rol en Firestore ─
// El formulario /registro crea la cuenta. Luego parcheamos el rol a buyer_b2b
// y estadoB2B al valor deseado directamente via Firestore desde el navegador.
async function registrarB2BSimple(page: Page, email: string, password: string, nombre: string, estadoB2B: 'APPROVED' | 'PENDING_APPROVAL' = 'PENDING_APPROVAL') {
  // El AuthScreen tiene un paso email_registro accesible cuando selCategoria es 'cliente'
  // y luego se elige el tipo en la misma pantalla.
  // Ruta más directa: usar el formulario "Crear cuenta" del AuthScreen (paso email_registro)
  // que se activa desde seleccion_tipo_cliente → Negocio → Ingresar con email

  // Registrar via formulario consumidor (/registro) — mismo Firebase Auth, rol b2c inicial
  await registrarConsumidor(page, email, password, nombre)

  // Esperar que la app quede logueada y obtener uid + token del usuario recién registrado
  await page.waitForTimeout(2000)

  // Usar la API REST de Firestore con el idToken del usuario autenticado
  const tokenData = await page.evaluate(async (): Promise<{ uid: string; token: string } | null> => {
    // La app expone el auth de Firebase a través de sus módulos cargados en el bundle
    // Buscar el currentUser en indexedDB (Firebase lo persiste ahí)
    return new Promise((resolve) => {
      const req = indexedDB.open('firebaseLocalStorageDb')
      req.onsuccess = (e) => {
        const db = (e.target as IDBOpenDBRequest).result
        const tx = db.transaction(['firebaseLocalStorage'], 'readonly')
        const store = tx.objectStore('firebaseLocalStorage')
        const getAll = store.getAll()
        getAll.onsuccess = () => {
          const records = getAll.result as Array<{ value: { stsTokenManager: { accessToken: string }; uid: string } }>
          const record = records[0]
          if (record?.value?.uid && record?.value?.stsTokenManager?.accessToken) {
            resolve({ uid: record.value.uid, token: record.value.stsTokenManager.accessToken })
          } else {
            resolve(null)
          }
        }
        getAll.onerror = () => resolve(null)
      }
      req.onerror = () => resolve(null)
    })
  }).catch(() => null)

  if (tokenData) {
    // Llamar REST API de Firestore para actualizar el documento
    // Para campos anidados en Firestore REST se usa mapValue, no claves con punto
    const projectId = 'tunay-wasi'
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/default/documents/one_usuarios/${tokenData.uid}?updateMask.fieldPaths=rol&updateMask.fieldPaths=empresa`
    const body = {
      fields: {
        rol: { stringValue: 'buyer_b2b' },
        empresa: {
          mapValue: {
            fields: {
              estadoAprobacion: { stringValue: estadoB2B },
              ruc: { stringValue: estadoB2B === 'APPROVED' ? '20999999019' : '20999999027' },  // REG-02/04: RUC QA válido y distinto por cuenta
              razonSocial: { stringValue: 'Empresa QA Test SAC' },
              dirFiscal: { stringValue: 'Av. Test 123, Lima' },
              dirEnvio: { stringValue: 'Av. Test 123, Lima' },
              solicitudAt: { stringValue: new Date().toISOString() },
            }
          }
        }
      }
    }
    const resp = await fetch(url, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${tokenData.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => r.ok ? '✅' : `⚠️ ${r.status}`).catch(e => `❌ ${e.message}`)
    console.log(`  🔧 Rol → buyer_b2b (${estadoB2B}) ${resp}: ${email}`)
  } else {
    console.log(`  ⚠️  Registrado pero no se pudo actualizar rol B2B: ${email}`)
  }
}

// ── Registrar seller vía #/registro-caficultor ────────────────────────────────
async function registrarCaficultor(page: Page, email: string, password: string, nombre: string) {
  await page.goto(`${BASE}/registro-caficultor`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(800)

  // ── PASO 1: nombre, WhatsApp, email, contraseña ──────────────────────────────
  // Verificar si ya existe (el formulario mostrará un error si el email ya está en uso)
  const bodyInicio = await page.locator('body').textContent() ?? ''
  if (bodyInicio.match(/ya.*existe|email.*uso/i)) {
    console.log(`  ℹ️  Ya existe: ${email}`)
    return
  }

  await page.getByPlaceholder('María Quispe Condori').fill(nombre)
  await page.getByPlaceholder('+51 987 654 321').fill('+51 999 000 004')
  await page.getByPlaceholder('tu@correo.com').fill(email)
  await page.getByPlaceholder('Mínimo 6 caracteres').fill(password)
  await page.getByPlaceholder('Repite').fill(password)
  await page.getByRole('button', { name: /siguiente/i }).click()
  await page.waitForTimeout(1000)

  // Verificar si avanzó al paso 2
  const body1 = await page.locator('body').textContent() ?? ''
  if (body1.match(/ya está en uso|email.*use|already.*use/i)) {
    console.log(`  ℹ️  Ya existe: ${email}`)
    return
  }
  if (!body1.match(/paso 2/i)) {
    const err = body1.match(/Error:|ingresa|ingresar/i) ? body1.slice(0, 200) : 'Error desconocido'
    console.log(`  ⚠️  Paso 1 no avanzó: ${err}`)
    return
  }

  // ── PASO 2: región, distrito, variedad, proceso ──────────────────────────────
  // Seleccionar región (select)
  await page.locator('select').nth(0).selectOption({ index: 1 }) // Primera opción disponible
  await page.getByPlaceholder('Ej. San Ignacio').fill('San Ignacio')
  await page.locator('select').nth(1).selectOption({ index: 1 }) // variedad principal
  await page.locator('select').nth(2).selectOption({ index: 1 }) // proceso
  await page.getByRole('button', { name: /siguiente/i }).click()
  await page.waitForTimeout(1000)

  const body2 = await page.locator('body').textContent() ?? ''
  if (!body2.match(/paso 3/i)) {
    console.log(`  ⚠️  Paso 2 no avanzó: ${body2.slice(0, 200)}`)
    return
  }

  // ── PASO 3: DNI, Yape, luego "Crear cuenta" ───────────────────────────────────
  await page.getByPlaceholder('12345678').fill('12345678')
  await page.getByPlaceholder('+51 987 654 321').fill('+51 999 000 004')
  await page.getByRole('button', { name: /crear cuenta/i }).click()
  await page.waitForTimeout(4000)

  const bodyFinal = await page.locator('body').textContent() ?? ''
  if (bodyFinal.match(/ya está en uso|email.*use|already.*use/i)) {
    console.log(`  ℹ️  Ya existe: ${email}`)
  } else if (bodyFinal.match(/confirmaci|bienvenid|cuenta creada|listo/i)) {
    console.log(`  ✅ Registrado: ${email}`)
  } else {
    const errEl = await page.locator('[style*="ef4444"], [style*="f87171"]').textContent().catch(() => '')
    console.log(`  ${errEl ? '⚠️  ' + errEl.trim() : '✅ OK'}: ${email}`)
  }
}

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: false })
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()

  console.log('🚀 Registrando usuarios QA en la app...\n')

  console.log('📝 1/4 cliente@tunaywasi.qa (buyer_b2c)')
  await registrarConsumidor(page, 'cliente@tunaywasi.qa', 'Tunay2026!', 'Cliente QA Test')

  await cerrarSesion(page)

  console.log('📝 2/4 barista@tunaywasi.qa (buyer_b2b APPROVED)')
  await registrarB2BSimple(page, 'barista@tunaywasi.qa', 'Tunay2026!', 'Barista QA', 'APPROVED')

  await cerrarSesion(page)

  console.log('📝 3/4 b2b-pending@tunaywasi.qa (buyer_b2b PENDING)')
  await registrarB2BSimple(page, 'b2b-pending@tunaywasi.qa', 'Tunay2026!', 'Negocio Pendiente QA', 'PENDING_APPROVAL')

  await cerrarSesion(page)

  console.log('📝 4/4 caficultor@tunaywasi.qa (seller)')
  await registrarCaficultor(page, 'caficultor@tunaywasi.qa', 'Tunay2026!', 'Caficultor QA Test')

  await browser.close()
  console.log('\n✅ Proceso finalizado.')
}

main().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})
