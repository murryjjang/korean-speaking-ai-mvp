// v1.1 단계 19.8 [로고 검증]: 실제 사용자 경로 — 학습자 + 리서치 페이지
// 헤더에 KDLI 사각형 로고가 마운트되었는지 스크린샷과 함께 검증.
//
// 19.5 → 19.7 사이 리서치 모드 헤더의 KDLI 로고 노출이 사라진 회귀에 대한
// 시각·DOM 회귀 보호. 자체 검증 우회 차단: 실제 /research/login + 자격증명
// 로그인 후 redirect까지 확인.

import { test, expect, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { loginAsResearchParticipant } from './_helpers/login'
import { resetParticipantConsent } from './_helpers/research-seed'

const SCREENSHOT_DIR = '/tmp/단계19.8/screenshots'
mkdirSync(SCREENSHOT_DIR, { recursive: true })

async function expectLogoVisible(
  page: Page,
  testId: string,
  altText: string,
): Promise<void> {
  // KdliBrand 또는 Topbar는 같은 PNG 로고를 렌더 — alt="KDLI" 이미지 노출.
  const brand = page.getByTestId(testId)
  await expect(brand).toBeVisible({ timeout: 10_000 })
  const img = brand.locator('img[alt="KDLI"]').first()
  await expect(img).toBeVisible()
  const src = await img.getAttribute('src')
  // Next.js Image는 src를 /_next/image?url=... 로 wrapping. 원본 src 검증을 위해 URL decode.
  const decoded = src ? decodeURIComponent(src) : ''
  expect(decoded, `${altText} 헤더의 src에 kdli-logo-256.png 포함`).toMatch(
    /kdli-logo-256\.png/,
  )
}

test.describe('[단계19.8-로고] 학습자 + 리서치 헤더 KDLI 로고 노출', () => {
  test('P040 (en) — 리서치 동의서 페이지 KdliBrand 마운트', async ({ page }) => {
    await resetParticipantConsent('P040')
    await loginAsResearchParticipant(page, 'P040', '1040')
    // 동의서 페이지로 redirect — kdli-brand 노출
    await page.waitForURL(/\/research\/consent/, { timeout: 10_000 })
    await expectLogoVisible(page, 'kdli-brand', '리서치 동의서')
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/p040-research-consent-logo.png`,
      fullPage: false,
    })
  })

  test('P040 (en) — 리서치 학습 진척 페이지 KdliBrand 마운트', async ({ page }) => {
    // consent 완료 후 progress 페이지 진입
    await loginAsResearchParticipant(page, 'P040', '1040')
    // consent 페이지에 있을 경우 동의 후 progress로
    if (page.url().includes('/research/consent')) {
      await page.getByTestId('btn-consent-agree').click()
      await page.waitForURL(/\/research\/student\/progress/, { timeout: 10_000 })
    }
    await expectLogoVisible(page, 'kdli-brand', '리서치 진척')
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/p040-research-progress-logo.png`,
      fullPage: false,
    })
  })

  test('P040 (en) — /student/conversation-practice Topbar 로고', async ({ page }) => {
    await resetParticipantConsent('P040')
    await loginAsResearchParticipant(page, 'P040', '1040')
    const agreeBtn = page.getByTestId('btn-consent-agree')
    if (await agreeBtn.isVisible().catch(() => false)) {
      await agreeBtn.click()
      await page.waitForURL(/\/research\/student\/progress/, { timeout: 10_000 })
    }
    // /student는 참여자 쿠키 보유자에게는 progress로 redirect되므로 subpath 사용.
    await page.goto('/student/conversation-practice')
    const logoImg = page.locator('header img[alt="KDLI"]').first()
    await expect(logoImg).toBeVisible({ timeout: 10_000 })
    const src = (await logoImg.getAttribute('src')) ?? ''
    expect(decodeURIComponent(src)).toMatch(/kdli-logo-256\.png/)
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/p040-student-conversation-topbar-logo.png`,
      fullPage: false,
    })
  })

  test('P040 (en) — /student/speaking Topbar 로고', async ({ page }) => {
    await resetParticipantConsent('P040')
    await loginAsResearchParticipant(page, 'P040', '1040')
    // 매 테스트마다 consent 리셋 — 동의 페이지 진입 후 동의 클릭으로 멱등 검증
    const agreeBtn = page.getByTestId('btn-consent-agree')
    if (await agreeBtn.isVisible().catch(() => false)) {
      await agreeBtn.click()
      await page.waitForURL(/\/research\/student\/progress/, { timeout: 10_000 })
    }
    await page.goto('/student/speaking')
    const logoImg = page.locator('header img[alt="KDLI"]').first()
    await expect(logoImg).toBeVisible({ timeout: 10_000 })
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/p040-student-speaking-topbar-logo.png`,
      fullPage: false,
    })
  })
})
