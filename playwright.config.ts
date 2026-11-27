import { defineConfig, devices } from '@playwright/test'

// Mapeo flujo → specs que lo cubren (para filtrado por F-XX en CI)
// Uso: npm run e2e -- --grep "F-01" o --grep "F-01|F-02"
export const FLOW_MAP: Record<string, string> = {
  'F-01': '27',          // Registro B2C
  'F-02': '27',          // Registro B2B
  'F-03': '27',          // Registro Caficultor
  'F-04': '28|29|30',    // Catálogo + Detalle
  'F-05': '26|32',       // Pedido B2C
  'F-06': '23|26|33',    // Pedido B2B (cotización)
  'F-07': '24|34',       // Despacho Caficultor
  'F-08': '25',          // Seguimiento Pedido
  'F-09': '25|31',       // Entrega + Reseña
  'F-10': '25',          // Reclamo / Disputa
  'F-11': '24|34|35',    // Gestión de Lotes
  'F-12': '24',          // Pagos Caficultor
  'F-13': '21',          // Admin
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

