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
      testMatch: ['**/mobile-speaking.spec.ts', '**/auth-routes.spec.ts', '**/reading-practice.spec.ts', '**/presentation-practice.spec.ts', '**/analytics-dashboard.spec.ts', '**/pdf-download.spec.ts', '**/console-errors.spec.ts', '**/stage195-visual-verify.spec.ts', '**/stage197-real-user-path.spec.ts', '**/stage197-pdf-real-path.spec.ts', '**/stage198-realuser.spec.ts', '**/stage198-ui-supplement.spec.ts', '**/stage199-logo-verify.spec.ts', '**/stage1911-mother-tongue-verify.spec.ts', '**/stage1912-bidi-completed.spec.ts', '**/stage1912-presentation-labels.spec.ts'],
    },
  ],

  webServer: {
    // SMOKE_TEST_MODE=1 tells proxy.ts to skip Supabase Auth enforcement so
    // smoke tests can access /student and /teacher without real credentials.
    command: 'SMOKE_TEST_MODE=1 next dev --port 3099',
    url: 'http://localhost:3099',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
