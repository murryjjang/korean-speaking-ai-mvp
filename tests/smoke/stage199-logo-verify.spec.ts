// v1.1 단계 19.9 [로고 검증]: 공식 KDLI 로고 자산 시각 확인 + DOM 회귀 보호.
//
// 19.8까지 사용한 placeholder/seal PNG가 헤더에서 사각형 박스 줄로 도드라지는
// V1-2 회귀가 보고됨. 19.9에서 사용자 제공 공식 로고로 교체했고, 본 스펙은
// (1) 로그인 페이지 원형 로고, (2) 학습자/관리자 헤더 워드마크를 실제 사용자
// 경로에서 확인한다. SMOKE_TEST_MODE에서 /student/*는 인증 우회되어 직접 진입 가능.

import { test, expect, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const SCREENSHOT_DIR = '/tmp/단계19.9/screenshots'
mkdirSync(SCREENSHOT_DIR, { recursive: true })

async function expectImageWithSrc(
  page: Page,
  testId: string,
  expectedFile: string,
): Promise<void> {
  // testid'd 노드가 <img> 본인이거나, 그 후손 <img>일 수 있어 둘 다 시도.
  const root = page.getByTestId(testId).first()
  await expect(root).toBeVisible({ timeout: 10_000 })
  let src = await root.getAttribute('src')
  if (!src) {
    const innerImg = root.locator('img').first()
    await expect(innerImg).toBeVisible()
    src = await innerImg.getAttribute('src')
  }
  const decoded = src ? decodeURIComponent(src) : ''
  expect(decoded, `${testId} 의 src에 ${expectedFile} 포함`).toContain(expectedFile)
}

test.describe('[단계19.9-로고] 공식 KDLI 로고 자산 — 실제 사용자 경로', () => {
  test('로그인 페이지 원형 로고 — /login', async ({ page }) => {
    await page.goto('/login')
    await expectImageWithSrc(page, 'kdli-logo', 'kdli-logo-circle.png')
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/phase1-login-circle.png`,
      fullPage: true,
    })
  })

  test('리서치 로그인 페이지 원형 로고 — /research/login', async ({ page }) => {
    await page.goto('/research/login')
    await expectImageWithSrc(page, 'kdli-logo', 'kdli-logo-circle.png')
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/phase1-research-login-circle.png`,
      fullPage: true,
    })
  })

  test('학습자 헤더 워드마크 — /student (SMOKE_TEST_MODE)', async ({ page }) => {
    await page.goto('/student')
    await page.waitForLoadState('networkidle')
    await expectImageWithSrc(page, 'kdli-brand', 'kdli-logo.png')
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/phase1-student-header-wordmark.png`,
      fullPage: true,
    })
  })

  test('관리자 헤더 워드마크 — /admin/analytics (SMOKE_TEST_MODE)', async ({ page }) => {
    await page.goto('/admin/analytics')
    await page.waitForLoadState('networkidle')
    await expectImageWithSrc(page, 'kdli-brand', 'kdli-logo.png')
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/phase1-admin-header-wordmark.png`,
      fullPage: true,
    })
  })
})
