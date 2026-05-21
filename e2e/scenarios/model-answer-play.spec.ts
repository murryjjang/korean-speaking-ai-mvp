// M5 — 라이브 e2e: 모범답안 페이지 (Task 1.5). **로컬 only**.
//
// /student/model-answer/[contentId] 가 크래시 없이 렌더되는지 검증(헤더 + 패널 영역).
// 답안은 인증·LLM·DB 의존이라 로딩/안내 상태까지. 라이브는 skip(M5 결정, free-conv 패턴).

import { test, expect } from '@playwright/test'

test.describe('모범답안 페이지 (로컬)', () => {
  test.skip(!!process.env.LIVE_URL, '라이브 미적용 — SMOKE_TEST_MODE 필요 (인증/세션 회피)')

  test('모범답안 페이지가 렌더된다 (헤더 + 패널)', async ({ page }) => {
    await page.goto('/student/model-answer/beginner-q2-material-description')
    await expect(page.getByTestId('model-answer-page')).toBeVisible()
    await expect(page.getByText('모범답안', { exact: true })).toBeVisible()
  })
})
