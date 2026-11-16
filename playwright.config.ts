import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './playwright/critical',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['html', { outputFolder: 'playwright-report', open: 'never' }], ['line']] : 'line',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8888',
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000
  },
  expect: {
    timeout: 10_000
  },
  outputDir: 'test-results/playwright',
  projects: [
    {
      name: 'critical',
      testDir: './playwright/critical'
    },
    {
      name: 'system',
      testDir: './playwright/system'
    }
  ]
})
