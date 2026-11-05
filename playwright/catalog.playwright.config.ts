import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './catalog',
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}-{platform}{ext}',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: [['line']],
  expect: {
    toHaveScreenshot: { animations: 'disabled' },
  },
  use: {
    baseURL: 'http://127.0.0.1:4401',
    colorScheme: 'light',
    locale: 'en-US',
    contextOptions: { reducedMotion: 'reduce' },
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'node ../scripts/serve-catalog.mjs',
    url: 'http://127.0.0.1:4401',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
