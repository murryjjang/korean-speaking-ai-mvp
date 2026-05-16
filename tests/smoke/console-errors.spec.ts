// v1.1 단계 19: 콘솔 에러 0건 강제 — "X Issues" Next.js dev indicator 회귀 차단.
//
// 단계 18에서 "1 issue → 2 Issues → 3 Issues" 누적 증상이 있었다. dev mode의
// indicator는 runtime / hydration 에러를 합산해 표시한다. 이 테스트는 공개
// 페이지를 순회하며 페이지당 console.error / pageerror 발생 0건을 강제한다.
//
// 인증 필요한 페이지는 SMOKE_TEST_MODE=1 (playwright.config.ts에 설정)로 우회.

import { test, expect } from '@playwright/test'

const PAGES = [
  '/login',
  '/research/login',
  '/research/admin/login',
  '/research/consent/declined',
  '/role-missing',
  '/dev/pdf-smoke',
] as const

// hydration / SSR mismatch / runtime 에러로 잡힐 키워드 (allowlist 없음 — 0 강제)
function shouldIgnore(text: string): boolean {
  // 외부 자원(폰트 CDN 일시 장애 등) 또는 dev-only 알려진 무해 메시지는 제외 가능.
  if (/jsdelivr|fonts\.gstatic|favicon\.ico/.test(text)) return true
  return false
}

for (const path of PAGES) {
  test(`[단계19-Issues0] ${path} — console.error / pageerror 0건`, async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !shouldIgnore(msg.text())) errors.push(msg.text())
    })
    page.on('pageerror', (err) => {
      if (!shouldIgnore(err.message)) errors.push(err.message)
    })

    await page.goto(path, { waitUntil: 'networkidle' })

    if (errors.length > 0) {
      console.log(`[${path}] console errors:`, errors)
    }
    expect(errors, `${path} should have 0 console errors`).toHaveLength(0)
  })
}
