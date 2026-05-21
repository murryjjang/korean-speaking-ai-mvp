// M5 — 라이브 e2e: 자유대화 주제 이탈 (#13).
//
// **로컬 only** (free-conversation-basic 와 동일한 이유로 LIVE_URL 시 skip).
//
// #13 "주제 이탈 → 종합 점수 ≤50" 의 *수치* 보증은 헤드리스 e2e 범위 밖이다:
// 점수는 오디오 발음평가(pronScore) × 멀티플라이어로 산출되어, 마이크 입력 없이는
// 실점수를 재현할 수 없다. 따라서 ≤50 규칙은 결정론적 단위 테스트가 가드한다:
//     tests/unit/free-conversation-score.test.ts
//       (off → adjustConversationScore(rawAvg≤100, 'off') ≤ 50)
//
// 이 e2e 는 "주제 이탈형 대화도 동일 진입 경로로 시작 가능"한지(시연 흐름 비파괴)를
// 커스텀 주제 경로로 검증한다. TODO: 오디오 픽스처로 end 단계 점수 카드
// (pron-summary-topic-adjust ×0.5) 까지 보는 풀스코어 e2e.

import { test, expect } from '@playwright/test'

test.describe('자유대화 주제 이탈 진입 (#13, 로컬)', () => {
  test.skip(!!process.env.LIVE_URL, '라이브 미적용 — SMOKE_TEST_MODE 필요 (인증/세션 회피)')

  test('커스텀 주제 → 페르소나 → 채팅 진입 (≤50 수치는 unit test 가드)', async ({ page }) => {
    await page.goto('/student/conversation-practice')

    // 커스텀 주제 경로
    await expect(page.getByTestId('free-conversation-start')).toBeVisible()
    await page.getByTestId('custom-topic-input').fill('제일 좋아하는 영화 장르')
    await page.getByTestId('btn-start-custom').click()

    // 페르소나 선택 → 시작
    await expect(page.getByTestId('free-conversation-persona-select')).toBeVisible()
    await page.locator('[data-testid^="persona-card-"]').first().click()
    await page.getByTestId('btn-start-chat').click()

    // 채팅 진입
    await expect(page.getByTestId('free-conversation-chat')).toBeVisible()
    await expect(page.getByTestId('conversation-input-area')).toBeVisible()
  })
})
