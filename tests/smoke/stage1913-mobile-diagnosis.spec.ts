// v1.1 단계 19.13 [페이즈 0]: 모바일 UX 진단 스크린샷.
//
// /tmp/단계19.13/screenshots/mobile/before/ 에 viewport × 페이지별로 캡처.
// 단계 19.13 페이즈 3 수정 후 같은 경로 after/ 로 재실행하여 시각 비교.

import { test, type Page } from '@playwright/test'
import { loginAsResearchParticipant } from './_helpers/login'

async function loginAndConsent(page: Page, code: string, pin: string): Promise<void> {
  await loginAsResearchParticipant(page, code, pin)
  if (page.url().includes('/research/consent')) {
    await page.getByRole('button', { name: /동의하고 시작/ }).click()
    await page.waitForURL(/\/research\/student\/progress/, { timeout: 10_000 })
  }
}

const VIEWPORTS = [
  { name: 'iphone-se-375', width: 375, height: 667 },
  { name: 'galaxy-412', width: 412, height: 915 },
  { name: 'tablet-768', width: 768, height: 1024 },
] as const

const OUT_DIR = process.env.STAGE1913_OUT_DIR ?? '/tmp/단계19.13/screenshots/mobile/before'

const PAGES = [
  { path: '/research/login', name: 'research-login', requiresAuth: false },
  { path: '/research/student/progress', name: 'research-student-progress', requiresAuth: true },
  { path: '/student/conversation-practice', name: 'conversation-practice', requiresAuth: true },
  { path: '/student/speaking', name: 'speaking-index', requiresAuth: true },
  { path: '/student/speaking/beginner-q1-reading', name: 'speaking-q1', requiresAuth: true },
  { path: '/student/presentation-practice', name: 'presentation-practice', requiresAuth: true },
]

test.describe('단계 19.13 모바일 진단 스크린샷', () => {
  for (const vp of VIEWPORTS) {
    test.describe(`viewport ${vp.name}`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } })

      test(`${vp.name} 전 페이지 캡처`, async ({ page }) => {
        // 인증이 필요 없는 페이지 먼저 (로그인 페이지)
        for (const p of PAGES.filter((x) => !x.requiresAuth)) {
          await page.goto(p.path, { waitUntil: 'networkidle', timeout: 15_000 }).catch(() => {})
          await page.waitForTimeout(400)
          await page.screenshot({
            path: `${OUT_DIR}/${vp.name}__${p.name}.png`,
            fullPage: true,
          })
        }
        // 로그인 + consent 통과
        await loginAndConsent(page, 'P040', '1040').catch(() => {})
        // 인증 페이지 캡처
        for (const p of PAGES.filter((x) => x.requiresAuth)) {
          await page.goto(p.path, { waitUntil: 'networkidle', timeout: 15_000 }).catch(() => {})
          await page.waitForTimeout(500)
          await page.screenshot({
            path: `${OUT_DIR}/${vp.name}__${p.name}.png`,
            fullPage: true,
          })
        }
      })
    })
  }
})
