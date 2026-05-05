import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:3099',
    trace: 'on-first-retry',
  },

  projects: [
    // API smoke tests — HTTP only, no browser binary required
    {
      name: 'api',
      testMatch: '**/api-smoke.spec.ts',
    },
    // E2E smoke tests — requires Chromium (sudo npx playwright install-deps chromium on WSL2)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/mobile-speaking.spec.ts',
    },
  ],

  webServer: {
    command: 'next dev --port 3099',
    url: 'http://localhost:3099',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
