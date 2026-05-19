// v1.1 단계 19.13 [페이즈 3]: 모바일 UX 수정 후 핵심 페이지 검증 캡처.

import { test, type Page } from '@playwright/test'
import { loginAsResearchParticipant } from './_helpers/login'

async function loginAndConsent(page: Page, code: string, pin: string): Promise<void> {
  await loginAsResearchParticipant(page, code, pin)
  // P040의 consent 상태는 다른 테스트 실행에 따라 달라질 수 있어 안전 분기.
  const btn = page.getByTestId('btn-consent-agree')
  if (await btn.count() > 0) {
    await btn.click()
    await page.waitForURL(/\/research\/student\/progress/, { timeout: 15_000 })
  }
}

const OUT_DIR = '/tmp/단계19.13/screenshots/mobile/after'

test('375px — 진척 페이지 학습 시작 우선 노출 확인', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 375, height: 667 })
  await loginAndConsent(page, 'P040', '1040')
  await page.goto('/research/student/progress', { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT_DIR}/iphone-se-375__research-student-progress.png`, fullPage: true })
})

test('412px — 진척 페이지 학습 시작 우선 노출 확인', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 412, height: 915 })
  await loginAndConsent(page, 'P040', '1040')
  await page.goto('/research/student/progress', { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT_DIR}/galaxy-412__research-student-progress.png`, fullPage: true })
})

test('375px — speaking-index 글자 줄바뀜 확인', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 375, height: 667 })
  await loginAndConsent(page, 'P040', '1040')
  await page.goto('/student/speaking', { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT_DIR}/iphone-se-375__speaking-index.png`, fullPage: true })
})
