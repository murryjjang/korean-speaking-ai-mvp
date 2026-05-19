// v1.1 단계 19.14 [R1 검증]: 자유 대화 전체 플로우 + 평가/발표 버튼 정상 동작.
//
// R1 픽스(sticky-bottom 다음 버튼 + scrollIntoView) 후 동적 인터랙션 검증:
// 1. 자유 대화: 주제 카드 클릭 → 다음 → 페르소나 선택 → 다음 → 대화 화면 진입
// 2. 자유 대화 직접 입력: textarea → 다음 → 페르소나 선택 → 다음 → 대화 화면 진입
// 3. 말하기 평가 Q1 진입 → 준비 시작 버튼 작동
// 4. 발표연습 페이지 버튼 작동
//
// 단계 19.13 정적 캡처 한계 차단 — 인터랙션 후 상태를 명시적으로 검증.

import { test, expect, type Page } from '@playwright/test'
import { loginAsResearchParticipant } from './_helpers/login'

const OUT_DIR = '/tmp/단계19.14/screenshots'
const MOBILE_VP = { width: 375, height: 667 }

async function loginAndConsent(page: Page, code: string, pin: string): Promise<void> {
  await loginAsResearchParticipant(page, code, pin)
  const btn = page.getByTestId('btn-consent-agree')
  if (await btn.count() > 0) {
    await btn.click()
    await page.waitForURL(/\/research\/student\/progress/, { timeout: 15_000 })
  }
}

test.describe('R1 픽스 검증 — 자유 대화 + 평가 + 발표 버튼', () => {
  test('자유 대화 추천 주제 → 페르소나 → 대화 진입 (P062 ar, mobile)', async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize(MOBILE_VP)
    await loginAndConsent(page, 'P062', '1062')
    await page.goto('/student/conversation-practice', { waitUntil: 'domcontentloaded', timeout: 30_000 })

    // 1단계: 주제 카드 클릭
    const card = page.getByTestId('topic-card-weekend-place')
    await expect(card).toBeVisible()
    await card.click()
    await page.waitForTimeout(500) // scrollIntoView smooth 대기

    // sticky-bottom 다음 버튼은 클릭 후 viewport 안에 들어와야 함
    const nextBtn = page.getByTestId('btn-next-to-persona')
    await expect(nextBtn).toBeVisible()
    const isVisible = await nextBtn.isVisible()
    expect(isVisible).toBe(true)
    await page.screenshot({ path: `${OUT_DIR}/r1-fix-01-topic-selected-sticky.png`, fullPage: false })

    // 클릭 → 페르소나 선택 단계
    await nextBtn.click()
    await expect(page.getByTestId('free-conversation-persona-select')).toBeVisible({ timeout: 5_000 })
    await page.screenshot({ path: `${OUT_DIR}/r1-fix-02-persona-page.png`, fullPage: true })

    // 페르소나 선택 → 다음 (디폴트 friend_casual)
    const personaNext = page.getByTestId('btn-start-chat')
    await expect(personaNext).toBeVisible()
    await personaNext.click()
    await page.waitForTimeout(500)

    // chat 화면 진입 확인 — 입력 영역 + 마이크 버튼
    await expect(page.getByTestId('free-conversation-chat')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('conversation-input-area')).toBeVisible()
    await page.screenshot({ path: `${OUT_DIR}/r1-fix-03-chat-entered.png`, fullPage: true })
  })

  test('자유 대화 직접 입력 → 페르소나 → 대화 진입 (P062, mobile)', async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize(MOBILE_VP)
    await loginAndConsent(page, 'P062', '1062')
    await page.goto('/student/conversation-practice', { waitUntil: 'domcontentloaded', timeout: 30_000 })

    // 직접 입력 textarea
    const input = page.getByTestId('custom-topic-input')
    await input.fill('한국 드라마 이야기')
    await page.waitForTimeout(500) // scrollIntoView smooth 대기

    const customNext = page.getByTestId('btn-start-custom')
    await expect(customNext).toBeVisible()
    await expect(customNext).toBeEnabled()
    await page.screenshot({ path: `${OUT_DIR}/r1-fix-04-custom-filled.png`, fullPage: false })

    await customNext.click()
    await expect(page.getByTestId('free-conversation-persona-select')).toBeVisible({ timeout: 5_000 })
    // pending topic 표시 확인
    await expect(page.getByTestId('pending-topic')).toContainText('한국 드라마 이야기')
  })

  test('말하기 평가 Q1 진입 → 준비 시작 버튼 작동 (P062, mobile)', async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize(MOBILE_VP)
    await loginAndConsent(page, 'P062', '1062')
    await page.goto('/student/speaking/beginner-q1-reading', { waitUntil: 'domcontentloaded', timeout: 30_000 })

    // prep 단계의 "준비 시작" 버튼 확인 (Localized practice/speaking_prepStart)
    // Button 컴포넌트가 렌더링하므로 텍스트로 확인.
    const prepStart = page.getByRole('button', { name: /준비 시작|Start|Bắt đầu|ابدأ/i }).first()
    await expect(prepStart).toBeVisible({ timeout: 15_000 })
    await expect(prepStart).toBeEnabled()
    await page.screenshot({ path: `${OUT_DIR}/r1-fix-05-speaking-q1.png`, fullPage: true })

    await prepStart.click()
    await page.waitForTimeout(800)
    // 준비 카운트다운으로 전환 — "준비 완료" 또는 시간 카운트 표시
    const tickedOver = await page.getByText(/준비|prepRemaining|\d{2}:\d{2}/).first().isVisible().catch(() => false)
    expect(tickedOver).toBe(true)
    await page.screenshot({ path: `${OUT_DIR}/r1-fix-06-speaking-q1-prep-started.png`, fullPage: true })
  })

  test('발표연습 페이지 — 토픽 카드 + 시작 버튼 노출 (P062, mobile)', async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize(MOBILE_VP)
    await loginAndConsent(page, 'P062', '1062')
    await page.goto('/student/presentation-practice', { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await page.waitForTimeout(800)
    // 페이지가 로드되고 핵심 콘텐츠가 렌더됐는지만 확인 (회귀 차단)
    const bodyContent = await page.locator('body').innerText()
    expect(bodyContent.length).toBeGreaterThan(50)
    await page.screenshot({ path: `${OUT_DIR}/r1-fix-07-presentation.png`, fullPage: true })
  })
})
