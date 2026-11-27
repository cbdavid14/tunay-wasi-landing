import { defineConfig, devices } from '@playwright/test'

// Mapeo flujo → specs que lo cubren (para filtrado por F-XX en CI)
// Uso: npm run e2e -- --grep "F-01" o --grep "F-01|F-02"
export const FLOW_MAP: Record<string, string> = {
  'F-01': '27',               // Registro B2C
  'F-02': '27',               // Registro B2B
  'F-03': '27',               // Registro Caficultor
  'F-04': '28|29|30|22',      // Catálogo + Detalle + Ficha técnica
  'F-05': '26|32',            // Pedido B2C (PAY-02, ORD-02)
  'F-06': '23|26|33',         // Pedido B2B (ORD-03, TRIB-02, cotización)
  'F-07': '24|34|40',         // Despacho Caficultor (SHP-02, codigoAgencia)
  'F-08': '26',               // Seguimiento Pedido (timeline, estados canónicos)
  'F-09': '37',               // Entrega + Reseña (ENT-01, calificaciones)
  'F-10': '36',               // Reclamo / Disputa (SLA, ENT-04/05/07)
  'F-11': '24|34|35',         // Gestión de Lotes (LOT-01, LOT-04, PR-04)
  'F-12': '38',               // Pagos Caficultor (COM-03, ESC-05-B, one_pagos)
  'F-13': '39',               // Admin (ADM-01/02/05/06, audit trail)
}

export default defineConfig({
  testDir: './e2e',
  bail: 1,
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 8_000 },

  reporter: [
    ['list'],
    // Reporte HTML interactivo — abre con: npx playwright show-report
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    // Reporte JSON para historial y CI — se parsea en el workflow para actualizar docs
    ['json', { outputFile: 'playwright-report/results.json' }],
    // JUnit para GitHub Actions test annotations
    ['junit', { outputFile: 'playwright-report/results.junit.xml' }],
  ],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    headless: true,
    viewport: { width: 1280, height: 800 },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Usar Chrome del sistema — el headless-shell de Playwright falla en macOS 15.6
    channel: 'chrome',
  },

  projects: [
    {
      name: 'chromium-qa',
      use: { baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173' },
    },
    // Web en móvil: emula un Pixel 7 (412×915, táctil, user agent móvil) con Chrome.
    // Por ahora cubre F-01 (registro) + el setup de usuarios QA; se amplía flujo a flujo.
    {
      name: 'mobile-qa',
      testMatch: [/00-setup-qa-users\.spec\.ts/, /27-registro-login-gate\.spec\.ts/],
      use: {
        ...devices['Pixel 7'],
        channel: 'chrome',
        baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
      },
    },
  ],
})

