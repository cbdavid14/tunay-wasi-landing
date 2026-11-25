import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // Falla al primer test que rompe — no pierde tiempo en cascadas de errores
  bail: 1,
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 1280, height: 800 },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    // Usar Chrome del sistema — el headless-shell de Playwright falla en macOS 15.6
    channel: 'chrome',
  },

  projects: [
    { name: 'chromium' },
  ],
})
