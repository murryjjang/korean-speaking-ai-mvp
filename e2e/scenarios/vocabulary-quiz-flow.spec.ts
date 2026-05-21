// M5 — 라이브 e2e: 단어 복습 퀴즈 진입 (Task 1.4). **로컬 only**.
//
// 퀴즈 페이지(recall 클라이언트)가 크래시 없이 렌더되는지 검증. due 카드는 인증·DB에
// 의존하므로 로딩/완료 상태까지만 본다(헤드리스 범위). 라이브는 skip(M5 결정).
// 인증 학습자의 정답확인→0-5 자가채점→SM-2 갱신 풀 흐름은 #18 후 — TODO.

import { test, expect } from '@playwright/test'

test.describe('단어 복습 퀴즈 진입 (로컬)', () => {
  test.skip(!!process.env.LIVE_URL, '라이브 미적용 — SMOKE_TEST_MODE 필요 (인증/세션 회피)')

  test('퀴즈 페이지가 렌더된다 (헤더 + recall 카드 영역)', async ({ page }) => {
    await page.goto('/student/vocab/quiz')
    await expect(page.getByTestId('vocab-quiz-page')).toBeVisible()
    await expect(page.getByText('단어 복습', { exact: true })).toBeVisible()
  })
})
