/**
 * 00-setup-qa-users.spec.ts — Setup de usuarios QA en Firebase
 *
 * Corrige los documentos de Firestore para los usuarios B2B:
 * - barista@tunaywasi.qa → rol=buyer_b2b, empresa.estadoAprobacion=APPROVED
 * - b2b-pending@tunaywasi.qa → rol=buyer_b2b, empresa.estadoAprobacion=PENDING_APPROVAL
 *
 * Ejecutar una sola vez antes de los tests:
 *   npx playwright test e2e/00-setup-qa-users.spec.ts
 */
import { test, expect } from '@playwright/test'
import { esperarCarga } from './helpers'

const PROJECT = 'tunay-wasi'

async function loginYObtenerToken(page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never, email: string, password: string): Promise<{ uid: string; token: string } | null> {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await esperarCarga(page)
  const btnEmail = page.getByRole('button', { name: /ingresar con email|continuar con email/i }).first()
  await btnEmail.or(page.getByPlaceholder('tu@email.com')).first().waitFor({ timeout: 15_000 }).catch(() => {})
  if (await btnEmail.isVisible({ timeout: 3000 }).catch(() => false)) {
    await btnEmail.click()
    await page.waitForTimeout(500)
  }
  await page.getByPlaceholder('tu@email.com').waitFor({ timeout: 8000 })
  await page.getByPlaceholder('tu@email.com').fill(email)
  await page.getByPlaceholder('••••••••').fill(password)
  await page.getByRole('button', { name: /ingresar →/i }).click()
  await page.waitForFunction(
    () => !window.location.pathname.startsWith('/login'),
    { timeout: 15_000 }
  ).catch(() => {})
  await page.waitForTimeout(1500)

  return page.evaluate(async (): Promise<{ uid: string; token: string } | null> => {
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
}

async function actualizarEmpresaB2B(page: Parameters<typeof loginYObtenerToken>[0], uid: string, token: string, estadoAprobacion: string): Promise<void> {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/default/documents/one_usuarios/${uid}?updateMask.fieldPaths=rol&updateMask.fieldPaths=empresa`
  const body = {
    fields: {
      rol: { stringValue: 'buyer_b2b' },
      empresa: {
        mapValue: {
          fields: {
            estadoAprobacion: { stringValue: estadoAprobacion },
            ruc: { stringValue: '20000000000' },
            razonSocial: { stringValue: 'Empresa QA Test SAC' },
            dirFiscal: { stringValue: 'Av. Test 123, Lima' },
            dirEnvio: { stringValue: 'Av. Test 123, Lima' },
            solicitudAt: { stringValue: new Date().toISOString() },
          }
        }
      }
    }
  }

  const result = await page.evaluate(async ({ url, body, token }: { url: string; body: object; token: string }) => {
    const resp = await fetch(url, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return { ok: resp.ok, status: resp.status, text: await resp.text() }
  }, { url, body, token })

  console.log(`  Firestore PATCH → ${result.status}: ${result.ok ? 'OK' : result.text.slice(0, 200)}`)
  expect(result.ok, `Firestore PATCH falló (${result.status}): ${result.text}`).toBe(true)
}

async function registrarCaficultor(page: Parameters<typeof loginYObtenerToken>[0], email: string, password: string, nombre: string): Promise<boolean> {
  await page.goto('/registro-caficultor')
  await page.waitForLoadState('networkidle')
  await esperarCarga(page)
  await page.waitForTimeout(800)

  const bodyInicio = await page.locator('body').textContent() ?? ''
  if (bodyInicio.match(/ya.*existe|email.*uso/i)) {
    console.log(`  ℹ️  Ya existe: ${email}`)
    return true
  }

  // Paso 1
  await page.getByPlaceholder('María Quispe Condori').fill(nombre)
  await page.getByPlaceholder('+51 987 654 321').fill('+51 999 000 004')
  await page.getByPlaceholder('tu@correo.com').fill(email)
  await page.getByPlaceholder('Mínimo 6 caracteres').fill(password)
  await page.getByPlaceholder('Repite').fill(password)
  await page.getByRole('button', { name: /siguiente/i }).click()
  await page.waitForTimeout(1000)

  const body1 = await page.locator('body').textContent() ?? ''
  if (body1.match(/ya está en uso|email.*use|already.*use/i)) {
    console.log(`  ℹ️  Ya existe: ${email}`)
    return true
  }
  if (!body1.match(/paso 2/i)) {
    console.log(`  ⚠️  Paso 1 no avanzó`)
    return false
  }

  // Paso 2: selects de región, variedad y proceso
  await page.locator('select').nth(0).selectOption({ index: 1 })
  await page.getByPlaceholder('Ej. San Ignacio').fill('San Ignacio')
  await page.locator('select').nth(1).selectOption({ index: 1 })
  await page.locator('select').nth(2).selectOption({ index: 1 })
  await page.getByRole('button', { name: /siguiente/i }).click()
  await page.waitForTimeout(1000)

  const body2 = await page.locator('body').textContent() ?? ''
  if (!body2.match(/paso 3/i)) {
    console.log(`  ⚠️  Paso 2 no avanzó: ${body2.slice(0, 300)}`)
    return false
  }

  // Paso 3: DNI + Yape
  await page.getByPlaceholder('12345678').fill('12345678')
  await page.getByPlaceholder('+51 987 654 321').fill('+51 999 000 004')
  await page.getByRole('button', { name: /crear cuenta/i }).click()
  await page.waitForTimeout(4000)

  const bodyFinal = await page.locator('body').textContent() ?? ''
  const ok = bodyFinal.match(/confirmaci|bienvenid|cuenta creada|listo|verificar.*correo/i)
  console.log(`  ${ok ? '✅ Registrado' : '⚠️ Incompleto'}: ${email}`)
  if (!ok) console.log(`  Body: ${bodyFinal.slice(0, 300)}`)
  return !!ok
}

test.describe.configure({ mode: 'serial' })

test('setup: barista (buyer_b2b APPROVED)', async ({ page }) => {
  await page.goto("/login")
  await page.waitForLoadState('networkidle')
  await esperarCarga(page)
  const data = await loginYObtenerToken(page, 'barista@tunaywasi.qa', 'Tunay2026!')
  expect(data, 'No se pudo loguear barista — verificar que el usuario existe').not.toBeNull()
  await actualizarEmpresaB2B(page, data!.uid, data!.token, 'APPROVED')
  console.log(`✅ barista uid=${data!.uid} empresa.estadoAprobacion=APPROVED`)
})

test('setup: b2b-pending (buyer_b2b PENDING_APPROVAL)', async ({ page }) => {
  // Cerrar sesión anterior — navegar primero para que localStorage sea accesible
  await page.goto("/login")
  await page.waitForLoadState('networkidle')
  await esperarCarga(page)
  await page.evaluate(() => { try { localStorage.clear() } catch {} })
  await page.waitForTimeout(500)

  const data = await loginYObtenerToken(page, 'b2b-pending@tunaywasi.qa', 'Tunay2026!')
  expect(data, 'No se pudo loguear b2b-pending — verificar que el usuario existe').not.toBeNull()
  await actualizarEmpresaB2B(page, data!.uid, data!.token, 'PENDING_APPROVAL')
  console.log(`✅ b2b-pending uid=${data!.uid} empresa.estadoAprobacion=PENDING_APPROVAL`)
})

test('setup: caficultor (seller) — registrar en app si no existe', async ({ page }) => {
  // Cerrar sesión
  await page.goto("/login")
  await page.waitForLoadState('networkidle')
  await esperarCarga(page)
  await page.evaluate(() => { try { localStorage.clear() } catch {} })
  await page.waitForTimeout(500)

  // Intentar login — si falla, registrar
  await page.goto("/login")
  await page.waitForLoadState('networkidle')
  await esperarCarga(page)
  const btnEmail = page.getByRole('button', { name: /ingresar con email|continuar con email/i }).first()
  await btnEmail.or(page.getByPlaceholder('tu@email.com')).first().waitFor({ timeout: 15_000 }).catch(() => {})
  if (await btnEmail.isVisible({ timeout: 3000 }).catch(() => false)) {
    await btnEmail.click()
    await page.waitForTimeout(500)
  }
  await page.getByPlaceholder('tu@email.com').waitFor({ timeout: 8000 })
  await page.getByPlaceholder('tu@email.com').fill('caficultor@tunaywasi.qa')
  await page.getByPlaceholder('••••••••').fill('Tunay2026!')
  await page.getByRole('button', { name: /ingresar →/i }).click()

  // Esperar resultado: si entra → ya existe, si muestra error → no existe, registrar
  await page.waitForTimeout(4000)
  const path = await page.evaluate(() => window.location.pathname)
  const bodyLogin = await page.locator('body').textContent() ?? ''

  if (!path.startsWith('/login') && !bodyLogin.match(/contraseña.*incorrecta|no.*encontr/i)) {
    // Ya existe y pudo loguear
    console.log('  ✅ caficultor ya existe y puede loguear')
    return
  }

  // No existe — registrar
  console.log('  Caficultor no existe, registrando...')
  await page.evaluate(() => { try { localStorage.clear() } catch {} })
  const ok = await registrarCaficultor(page, 'caficultor@tunaywasi.qa', 'Tunay2026!', 'Caficultor QA Test')
  expect(ok, 'Registro de caficultor falló').toBe(true)
})
