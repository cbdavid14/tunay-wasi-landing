/**
 * E2E de la validación de caficultores (admin), contra emuladores locales: no toca QA ni producción.
 * Uso: npm run e2e:kyc   (requiere firebase-tools, Java 17+ y `npm install` en scripts/kyc)
 */
import { defineConfig, devices } from '@playwright/test'
import { PUERTO, ENTORNO_WEB } from './e2e-kyc/entorno'

export default defineConfig({
  testDir: './e2e-kyc',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  outputDir: 'test-results/kyc',
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/kyc' }]],
  use: { baseURL: `http://localhost:${PUERTO}`, channel: 'chrome', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [
    { name: 'escritorio', use: { viewport: { width: 1280, height: 900 } } },
    { name: 'movil', use: { ...devices['Pixel 7'], channel: 'chrome' } },
  ],
  webServer: {
    command: `npx vite --mode e2ekyc --host localhost --port ${PUERTO} --strictPort`,
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: ENTORNO_WEB,
  },
})
