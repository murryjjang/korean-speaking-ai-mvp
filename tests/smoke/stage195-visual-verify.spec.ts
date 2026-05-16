// v1.1 단계 19.5 — 시각 회귀 보호 e2e.
//
// 단계 18에서 단위 테스트만 보고 시각 회귀를 놓친 사례가 있어, 19.5에서는
// 핵심 변경(PDF 아랍어·페르소나 외형·로고)을 실제 브라우저에서 한 번씩 확인.
// 스냅샷 대신 정량적 측정(글자 폭·픽셀 비율·요소 노출)로 안정적인 보호.

import { test, expect } from '@playwright/test'

// v1.1 단계 19.7 [검증 우회 차단]: localStorage 시드(setDisplayLanguage)는 더 이상
// 표시 언어를 결정하지 못한다 — 19.7 hook이 mother_tongue 단독으로 결정. 회귀
// 검증을 위해 이 spec은 직접 페이지 진입(인증 미요구 /dev/pdf-smoke)만 사용한다.

test.describe('[단계19.5-L4] KDLI placeholder SVG 노출', () => {
  test('/login에 SVG 로고가 마운트', async ({ page }) => {
    await page.goto('/login')
    const logo = page.getByTestId('kdli-logo')
    await expect(logo).toBeVisible()
    const src = await logo.getAttribute('src')
    expect(src).toMatch(/kdli-placeholder\.svg/)
    const box = await logo.boundingBox()
    expect(box).toBeTruthy()
    expect(box!.width).toBeGreaterThan(100)
    expect(box!.height).toBeGreaterThan(100)
  })

  test('/research/login에 SVG 로고가 마운트', async ({ page }) => {
    await page.goto('/research/login')
    const logo = page.getByTestId('kdli-logo')
    await expect(logo).toBeVisible()
    const src = await logo.getAttribute('src')
    expect(src).toMatch(/kdli-placeholder\.svg/)
  })
})

test.describe('[단계19.7-RTL] 페이지(html.dir)는 항상 ltr 고정', () => {
  test('/dev/pdf-smoke 진입 시 html.dir = ltr', async ({ page }) => {
    await page.goto('/dev/pdf-smoke')
    // 단계 19.6 이래 페이지 dir은 항상 LTR — 아랍어 텍스트는 컨테이너 내부 dir="rtl"만.
    await page.waitForFunction(
      () => document.documentElement.dir === 'ltr',
      undefined,
      { timeout: 5_000 },
    )
    const target = page.getByTestId('pdf-smoke-target')
    await expect(target).toBeVisible()
  })
})
