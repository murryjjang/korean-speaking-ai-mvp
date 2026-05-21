import { defineConfig, devices } from '@playwright/test'

// M5: LIVE_URL 설정 시 라이브(cloudflared 터널) 직격 — webServer 미기동, baseURL=LIVE_URL.
//     미설정 시 기존 로컬 SMOKE_TEST_MODE next dev(3099).
const LIVE_URL = process.env.LIVE_URL

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: 'list',

  use: {
    baseURL: LIVE_URL ?? 'http://localhost:3099',
    trace: 'on-first-retry',
  },

  projects: [
    // API smoke tests — HTTP only, no browser binary required
    {
      name: 'api',
      testMatch: ['**/api-smoke.spec.ts', '**/stage1916-respond-api-smoke.spec.ts'],
    },
    // E2E smoke tests — requires Chromium (sudo npx playwright install-deps chromium on WSL2)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/mobile-speaking.spec.ts', '**/auth-routes.spec.ts', '**/reading-practice.spec.ts', '**/presentation-practice.spec.ts', '**/analytics-dashboard.spec.ts', '**/pdf-download.spec.ts', '**/console-errors.spec.ts', '**/stage195-visual-verify.spec.ts', '**/stage197-real-user-path.spec.ts', '**/stage197-pdf-real-path.spec.ts', '**/stage198-realuser.spec.ts', '**/stage198-ui-supplement.spec.ts', '**/stage199-logo-verify.spec.ts', '**/stage1911-mother-tongue-verify.spec.ts', '**/stage1912-bidi-completed.spec.ts', '**/stage1912-presentation-labels.spec.ts', '**/stage1913-mobile-diagnosis.spec.ts', '**/stage1913-mobile-after.spec.ts', '**/stage1914-regression-diagnosis.spec.ts', '**/stage1914-r1-flow.spec.ts'],
    },
    // M5: 라이브 e2e 시나리오 (deploy.sh 가 --project=live 로 호출).
    //   LIVE_URL 있으면 라이브 직격, 없으면 로컬 SMOKE_TEST_MODE 서버 대상.
    {
      name: 'live',
      testDir: './e2e/scenarios',
      use: { ...devices['Desktop Chrome'], baseURL: LIVE_URL ?? 'http://localhost:3099' },
    },
  ],

  // LIVE_URL 설정 시 로컬 서버를 띄우지 않는다(라이브 직격).
  webServer: LIVE_URL
    ? undefined
    : {
        // SMOKE_TEST_MODE=1 tells proxy.ts to skip Supabase Auth enforcement so
        // smoke tests can access /student and /teacher without real credentials.
        command: 'SMOKE_TEST_MODE=1 next dev --port 3099',
        url: 'http://localhost:3099',
        reuseExistingServer: true,
        timeout: 60_000,
      },
})
