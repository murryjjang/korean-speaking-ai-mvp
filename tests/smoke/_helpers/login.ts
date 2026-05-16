// v1.1 단계 19.7: Playwright 헬퍼 — 실제 사용자 경로 로그인.
//
// SMOKE_TEST_MODE에서 /student/* 라우트는 인증 우회되지만, 그 안의 컴포넌트가
// getCurrentParticipant() 쿠키를 읽어 mother_tongue을 결정하는 경우가 많다.
// 따라서 motherTongue별 supplement 동작을 검증하려면 /research/login 흐름으로
// 실제 쿠키를 받아야 한다.

import type { Page } from '@playwright/test'

export async function loginAsResearchParticipant(
  page: Page,
  code: string,
  pin: string,
): Promise<void> {
  await page.goto('/research/login')
  await page.getByTestId('input-participant-code').fill(code)
  await page.getByTestId('input-participant-pin').fill(pin)
  await page.getByTestId('btn-research-login').click()
  await page.waitForURL(/\/research\/(consent|student\/progress)/, { timeout: 10_000 })
}
