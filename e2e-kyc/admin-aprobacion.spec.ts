/**
 * F-13 / F-03 — Admin: historial de validación y aprobación manual de caficultores.
 * Contra emuladores con las reglas reales de firestore.rules.
 */
import { test, expect, type Page } from '@playwright/test'
import { loginEmail, esperarCarga } from '../e2e/helpers'
import { ADMIN, CLIENTE, sembrar, perfil, revisiones, envejecer } from './datos'

const MENSAJE = 'Verifiqué la cuenta por videollamada'

async function abrirKyc(page: Page) {
  await loginEmail(page, ADMIN.email, ADMIN.password)
  await page.goto('/admin')
  await esperarCarga(page)
  const kycBtn = page.getByRole('button', { name: /KYC Sellers/ })
  if (!await kycBtn.filter({ visible: true }).first().isVisible({ timeout: 3_000 }).catch(() => false)) {
    // Móvil: el sidebar está detrás de ☰
    await page.locator('.adm-mobile-header button').click()
    await kycBtn.filter({ visible: true }).first().waitFor({ state: 'visible' })
  }
  await kycBtn.filter({ visible: true }).first().click()
  await expect(page.getByText('KYC Caficultores').first()).toBeVisible()
  await expect(tarjeta(page, 'ana').first()).toBeVisible()
}

const tarjeta = (page: Page, uid: string) => page.locator(`article[data-uid="${uid}"]`)
const aprobar = (page: Page, uid: string) => tarjeta(page, uid).getByRole('button', { name: 'Aprobar manualmente' })
const rechazar = (page: Page, uid: string) => tarjeta(page, uid).getByRole('button', { name: 'Rechazar', exact: true })
const mensaje = (page: Page, uid: string) => tarjeta(page, uid).getByRole('textbox')
const filtro = (page: Page, nombre: string) => page.getByRole('button', { name: nombre, exact: true }).click()

test.beforeEach(async () => { await sembrar() })

test('KYC-ADM-01: historial con criterios, motivo del rechazo y filtros', async ({ page }) => {
  await abrirKyc(page)
  await expect(tarjeta(page, 'ana')).toContainText('Aprobado')
  await expect(tarjeta(page, 'ana')).toContainText('Datos completos: Cumple')
  await expect(tarjeta(page, 'ana')).toContainText('Rostro y documento: Omitido')
  await expect(tarjeta(page, 'beto')).toContainText('Datos completos: No cumple')
  await expect(tarjeta(page, 'beto')).toContainText('Falta nombre, región o distrito')
  // El CCI no impide el alta: se informa
  await expect(tarjeta(page, 'ana')).toContainText('Sin registrar (se exige para cobrar)')
  await expect(tarjeta(page, 'carla')).toContainText('Confirmar que es socio')
  await expect(tarjeta(page, 'carla')).toContainText('RUC cooperativa: 20131312955')

  for (const [nombre, uid] of [['Aprobados', 'ana'], ['Rechazados', 'beto']] as const) {
    await filtro(page, nombre)
    await expect(page.locator('article')).toHaveCount(1)
    await expect(tarjeta(page, uid)).toBeVisible()
  }
  await filtro(page, 'En revisión')
  await expect(tarjeta(page, 'carla')).toBeVisible()
  await expect(tarjeta(page, 'dora')).toBeVisible()
  await expect(page.locator('article')).toHaveCount(2)
})

test('KYC-ADM-02: aprobar un rechazado exige mensaje y queda registrado', async ({ page }) => {
  await abrirKyc(page)
  await expect(aprobar(page, 'beto')).toBeDisabled()
  await mensaje(page, 'beto').fill('muy corto')   // 9 caracteres
  await expect(aprobar(page, 'beto')).toBeDisabled()
  await mensaje(page, 'beto').fill(MENSAJE)
  await aprobar(page, 'beto').click()
  await expect(page.getByText('Caficultor aprobado y registrado')).toBeVisible()
  await expect(page.getByText(`“${MENSAJE}”`)).toBeVisible()
  await expect(tarjeta(page, 'beto').first()).toContainText(`Admin: ${ADMIN.email}`)

  const p = await perfil('beto')
  expect(p.estadoKyc).toBe('ACTIVO')
  expect(p.caficultor.activo).toBe(true)
  const historial = await revisiones('beto')
  expect(historial.map(r => [r.origen, r.resultado])).toEqual([['JOB', 'RECHAZADO'], ['ADMIN', 'APROBADO']])
  expect(historial[1]).toMatchObject({ mensaje: MENSAJE, adminEmail: ADMIN.email, adminUid: 'jefe' })
  expect(historial[1].criteriosPendientes).toContain('DATOS')
  expect(p.kycRevisionId).toBeTruthy()
  // La revisión del job sigue en el historial y ya no admite decisiones
  await expect(tarjeta(page, 'beto')).toHaveCount(2)
  await expect(tarjeta(page, 'beto').nth(1)).toContainText('Reemplazada por una revisión posterior')
  await expect(aprobar(page, 'beto')).toHaveCount(0)
})

test('KYC-ADM-03: cooperativa pendiente se aprueba con mensaje', async ({ page }) => {
  await abrirKyc(page)
  await expect(aprobar(page, 'carla')).toBeDisabled()
  await mensaje(page, 'carla').fill('Socia confirmada y autorización de la cooperativa')
  await aprobar(page, 'carla').click()
  await expect(page.getByText('Caficultor aprobado y registrado')).toBeVisible()
  expect((await perfil('carla')).estadoKyc).toBe('ACTIVO')
})

test('KYC-ADM-04: rechazar exige mensaje y queda registrado', async ({ page }) => {
  await abrirKyc(page)
  await expect(rechazar(page, 'carla')).toBeDisabled()
  await mensaje(page, 'carla').fill('La cooperativa no la reconoce como socia')
  await rechazar(page, 'carla').click()
  await expect(page.getByText('Rechazo registrado')).toBeVisible()
  expect((await perfil('carla')).estadoKyc).toBe('RECHAZADO')
  expect((await revisiones('carla')).at(-1)).toMatchObject({ origen: 'ADMIN', resultado: 'RECHAZADO' })
  // Un rechazado ya no ofrece "Rechazar", pero se puede aprobar después
  await expect(aprobar(page, 'carla')).toBeVisible()
  await expect(rechazar(page, 'carla')).toHaveCount(0)
})

test('KYC-ADM-05: quien espera la revisión automática solo se aprueba con mensaje', async ({ page }) => {
  await abrirKyc(page)
  await expect(page.getByText('Esperando la revisión automática (1)')).toBeVisible()
  await expect(aprobar(page, 'dora')).toBeDisabled()
  await mensaje(page, 'dora').fill('Revisión presencial en la finca')
  await aprobar(page, 'dora').click()
  await expect(page.getByText('Caficultor aprobado y registrado')).toBeVisible()
  expect((await revisiones('dora'))[0]).toMatchObject({ origen: 'ADMIN', criteriosPendientes: ['SIN_REVISION_AUTOMATICA'] })
})

test('KYC-ADM-06: un aprobado no ofrece decisiones', async ({ page }) => {
  await abrirKyc(page)
  await expect(tarjeta(page, 'ana')).toBeVisible()
  await expect(aprobar(page, 'ana')).toHaveCount(0)
  await expect(rechazar(page, 'ana')).toHaveCount(0)
})

test('KYC-ADM-07: agrupa por fecha y filtra por día', async ({ page }) => {
  await envejecer('ana', 3)
  await abrirKyc(page)
  await expect(page.locator('section h3')).toHaveCount(3)   // esperando + hoy + hace 3 días
  const hace3 = new Date(Date.now() - 3 * 86_400_000).toLocaleDateString('sv-SE')
  await page.getByLabel('Filtrar por fecha').fill(hace3)
  await expect(page.locator('article')).toHaveCount(1)
  await expect(tarjeta(page, 'ana')).toBeVisible()
  await page.getByRole('button', { name: 'Quitar fecha' }).click()
  await expect(page.locator('article')).toHaveCount(4)
})

test('KYC-ADM-08: quien no es admin no entra al panel', async ({ page }) => {
  await loginEmail(page, CLIENTE.email, CLIENTE.password)
  await page.goto('/admin')
  await page.waitForURL(url => url.pathname !== '/admin')
  await expect(page.getByText('KYC Caficultores')).toHaveCount(0)
})
