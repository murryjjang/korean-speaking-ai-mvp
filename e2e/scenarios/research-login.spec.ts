// M5 — 라이브 e2e: research-login (P062 진입). **라이브 게이트 대상**.
//
// 자격증명 불필요한 경량 렌더 검증이라 로컬(SMOKE_TEST_MODE)·라이브 모두 green.
// deploy.sh 가 --project=live 로 실행 시, 라이브에서 실제로 도는 유일한 시나리오
// (free-conv 2건은 인증 필요 → 라이브 skip).

import { test, expect } from '@playwright/test'

test.describe('research-login (P062 진입)', () => {
  test('로그인 페이지가 렌더되고 참여자 코드 입력 폼이 있다', async ({ page }) => {
    await page.goto('/research/login')

    await expect(page.getByTestId('research-login-page')).toBeVisible()
    await expect(page.getByTestId('input-participant-code')).toBeVisible()
    await expect(page.getByTestId('btn-research-login')).toBeVisible()
  })
})
