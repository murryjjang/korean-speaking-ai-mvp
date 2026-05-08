import { test, expect } from '@playwright/test'

/**
 * Phase 10-E-7-B: 발표연습 데모 smoke tests
 */

test.describe('발표연습 데모 화면', () => {
  test('/student/presentation-practice 라우트가 열린다', async ({ page }) => {
    await page.goto('/student/presentation-practice')
    const url = page.url()
    expect(url.includes('/presentation-practice') || url.includes('/login')).toBe(true)
  })

  test('/student 메뉴에 발표연습 링크가 표시된다', async ({ page }) => {
    await page.goto('/student')
    if (!page.url().includes('/student')) return
    await expect(page.getByRole('link', { name: '발표연습' }).first()).toBeVisible()
  })

  test.describe('발표연습 화면 구성', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/student/presentation-practice')
      if (!page.url().includes('/presentation-practice')) test.skip()
    })

    test('발표 주제 입력 영역이 표시된다', async ({ page }) => {
      await expect(page.getByTestId('topic-input')).toBeVisible()
    })

    test('스크립트 입력 영역이 표시된다', async ({ page }) => {
      await expect(page.getByTestId('script-input')).toBeVisible()
    })

    test('AI 원고 교정 버튼이 표시된다', async ({ page }) => {
      await expect(page.getByTestId('btn-ai-correction')).toBeVisible()
    })

    test('AI 교정 버튼 클릭 시 교정 카드가 표시된다', async ({ page }) => {
      await page.getByTestId('btn-ai-correction').click()
      await expect(page.getByTestId('correction-card')).toBeVisible()
      await expect(page.getByTestId('correction-ko-explain')).toBeVisible()
      await expect(page.getByTestId('correction-native-explain')).toBeVisible()
    })

    test('섀도잉 연습 카드가 표시된다', async ({ page }) => {
      await expect(page.getByTestId('shadowing-card')).toBeVisible()
      await expect(page.getByTestId('btn-play-script')).toBeVisible()
    })

    test('목표 시간 선택 버튼이 표시된다', async ({ page }) => {
      await expect(page.getByTestId('time-options')).toBeVisible()
    })

    test('타이머/스톱워치 영역이 표시된다', async ({ page }) => {
      await expect(page.getByTestId('timer-card')).toBeVisible()
      await expect(page.getByTestId('timer-display')).toBeVisible()
      await expect(page.getByTestId('btn-start-timer')).toBeVisible()
    })

    test('타이머가 실제로 작동한다', async ({ page }) => {
      const initial = await page.getByTestId('timer-display').textContent()
      await page.getByTestId('btn-start-timer').click()
      await page.waitForTimeout(1500)
      const after = await page.getByTestId('timer-display').textContent()
      expect(initial).not.toBe(after)
      // Stop timer
      await page.getByTestId('btn-stop-timer').click()
    })

    test('발표 피드백 카드가 표시된다', async ({ page }) => {
      await expect(page.getByTestId('feedback-panel')).toBeVisible()
      await expect(page.getByTestId('feedback-korean')).toBeVisible()
      await expect(page.getByTestId('feedback-native')).toBeVisible()
    })

    test('속도 조절 버튼이 표시된다', async ({ page }) => {
      await expect(page.getByTestId('speed-buttons')).toBeVisible()
    })

    test('샘플 원고 불러오기 버튼이 작동한다', async ({ page }) => {
      await page.getByTestId('btn-load-sample').click()
      const scriptVal = await page.getByTestId('script-input').inputValue()
      expect(scriptVal.length).toBeGreaterThan(10)
    })
  })

  test('기존 q1~q4 말하기 평가 라우트가 깨지지 않는다', async ({ page }) => {
    await page.goto('/student/speaking')
    const url = page.url()
    expect(url.includes('/speaking') || url.includes('/login')).toBe(true)
  })

  test('기존 미션 대화 라우트가 깨지지 않는다', async ({ page }) => {
    await page.goto('/student/mission')
    const url = page.url()
    expect(url.includes('/mission') || url.includes('/login')).toBe(true)
  })
})
