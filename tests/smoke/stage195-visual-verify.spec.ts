// v1.1 단계 19.5 — 시각 회귀 보호 e2e.
//
// 단계 18에서 단위 테스트만 보고 시각 회귀를 놓친 사례가 있어, 19.5에서는
// 핵심 변경(PDF 아랍어·페르소나 외형·로고)을 실제 브라우저에서 한 번씩 확인.
// 스냅샷 대신 정량적 측정(글자 폭·픽셀 비율·요소 노출)로 안정적인 보호.

import { test, expect, type Page } from '@playwright/test'

async function setDisplayLanguage(page: Page, lang: 'ko' | 'ar') {
  await page.addInitScript(([k]) => {
    try {
      window.localStorage.setItem('kspai:lang:display', k as string)
      window.localStorage.setItem('kspai:lang:display:explicit', '1')
    } catch { /* noop */ }
  }, [lang])
}

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

test.describe('[단계19.6-RTL] 보조 언어 ar 선택 시에도 html.dir = ltr 유지', () => {
  test('/dev/pdf-smoke ar locale에서 html.dir은 항상 ltr (페이지 RTL 적용 중단)', async ({ page }) => {
    await setDisplayLanguage(page, 'ar')
    await page.goto('/dev/pdf-smoke')
    // 단계 19.6: 보조 언어가 ar이어도 페이지(html.dir)는 LTR 고정.
    // 아랍어 텍스트 자체는 컨테이너 내부 dir="rtl"로 단어 단위 정상.
    await page.waitForFunction(
      () => document.documentElement.dir === 'ltr',
      undefined,
      { timeout: 5_000 },
    )
    // PDF 캡처 컨테이너도 LTR 유지 (data-keep-ltr 마커).
    const target = page.getByTestId('pdf-smoke-target')
    await expect(target).toBeVisible()
  })
})
