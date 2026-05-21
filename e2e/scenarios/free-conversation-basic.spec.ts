// M5 — 라이브 e2e: 자유대화 기본 흐름 (시연 핵심 진입 경로).
//
// **로컬 only** — /student 는 SMOKE_TEST_MODE(로컬 webServer)에서만 인증 우회 가능.
// 라이브(production)는 실인증/세션이 필요하므로 LIVE_URL 설정 시 skip
// (인증·세션·운영 DB 영향 회피, AUTOMATION_DESIGN.md M5 결정).
//
// 오디오 없이 "주제 선택 → 페르소나 선택 → 채팅 화면 진입"까지 검증한다.
// (실제 발화 턴/점수는 마이크 의존 → 헤드리스 범위 밖, TODO: 오디오 픽스처 풀스코어.)

import { test, expect } from '@playwright/test'

test.describe('자유대화 기본 흐름 (로컬)', () => {
  test.skip(!!process.env.LIVE_URL, '라이브 미적용 — SMOKE_TEST_MODE 필요 (인증/세션 회피)')

  test('주제 선택 → 페르소나 선택 → 채팅 화면 진입', async ({ page }) => {
    await page.goto('/student/conversation-practice')

    // 1단계: 주제 선택
    await expect(page.getByTestId('free-conversation-start')).toBeVisible()
    await page.getByTestId('topic-card-find-cafe').click()
    await page.getByTestId('btn-next-to-persona').click()

    // 2단계: 페르소나 선택
    await expect(page.getByTestId('free-conversation-persona-select')).toBeVisible()
    await page.locator('[data-testid^="persona-card-"]').first().click()
    await page.getByTestId('btn-start-chat').click()

    // 3단계: 채팅 화면 진입 (입력 영역까지 렌더)
    await expect(page.getByTestId('free-conversation-chat')).toBeVisible()
    await expect(page.getByTestId('conversation-input-area')).toBeVisible()
  })
})
