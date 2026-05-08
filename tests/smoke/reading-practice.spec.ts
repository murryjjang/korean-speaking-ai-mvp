import { test, expect } from '@playwright/test'

/**
 * Phase 10-E-7-A/B: 읽기연습 데모 smoke tests
 * SMOKE_TEST_MODE=1 환경에서 인증 없이 /student/reading-practice 접근.
 */

test.describe('읽기연습 데모 화면', () => {
  test('/student/reading-practice 라우트가 열린다', async ({ page }) => {
    await page.goto('/student/reading-practice')
    const url = page.url()
    expect(url.includes('/reading-practice') || url.includes('/login')).toBe(true)
  })

  test('/student 메뉴에 읽기연습 링크가 표시된다', async ({ page }) => {
    await page.goto('/student')
    if (!page.url().includes('/student')) return
    await expect(page.getByRole('link', { name: '읽기연습' }).first()).toBeVisible()
  })

  test.describe('setup 단계', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/student/reading-practice')
      if (!page.url().includes('/reading-practice')) test.skip()
    })

    test('학습자 모국어 선택 옵션이 표시된다', async ({ page }) => {
      await expect(page.getByTestId('native-lang-select')).toBeVisible()
      const select = page.getByTestId('native-lang-select')
      await expect(select.locator('option[value="vi"]')).toBeAttached()
      await expect(select.locator('option[value="en"]')).toBeAttached()
    })

    test('AI 음성 속도 버튼 0.75x/0.9x/1.0x/1.1x/1.25x가 표시된다', async ({ page }) => {
      await expect(page.getByTestId('speed-0.75')).toBeVisible()
      await expect(page.getByTestId('speed-0.9')).toBeVisible()
      await expect(page.getByTestId('speed-1')).toBeVisible()
      await expect(page.getByTestId('speed-1.1')).toBeVisible()
      await expect(page.getByTestId('speed-1.25')).toBeVisible()
    })

    test('체험하기 버튼을 누르면 practice 단계로 이동한다', async ({ page }) => {
      await page.getByTestId('start-easy-reading').click()
      await expect(page.getByTestId('btn-play-all')).toBeVisible()
    })

    test('저작권 안내가 뉴스형 지문 카드에 표시된다', async ({ page }) => {
      await expect(page.getByTestId('copyright-notice')).toBeVisible()
      const text = await page.getByTestId('copyright-notice').textContent()
      expect(text).toContain('저작권')
    })
  })

  test.describe('practice 단계', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/student/reading-practice')
      if (!page.url().includes('/reading-practice')) test.skip()
      await page.getByTestId('start-easy-reading').click()
    })

    test('읽기 지문이 줄 단위로 표시된다', async ({ page }) => {
      await expect(page.getByTestId('reference-lines')).toBeVisible()
      await expect(page.getByTestId('line-0')).toBeVisible()
      await expect(page.getByTestId('line-1')).toBeVisible()
      await expect(page.getByTestId('line-2')).toBeVisible()
      await expect(page.getByTestId('line-3')).toBeVisible()
    })

    test('"전체 듣기"와 "현재 줄 듣기" 버튼이 표시된다', async ({ page }) => {
      await expect(page.getByTestId('btn-play-all')).toBeVisible()
      await expect(page.getByTestId('btn-play-current')).toBeVisible()
    })

    test('녹음 시작 버튼이 표시된다', async ({ page }) => {
      await expect(page.getByTestId('btn-start-recording')).toBeVisible()
    })

    test('시연용 결과 보기 버튼이 표시된다', async ({ page }) => {
      await expect(page.getByTestId('btn-demo-fallback')).toBeVisible()
    })

    test('속도 버튼이 practice 단계에도 표시된다', async ({ page }) => {
      const speedGroup = page.getByTestId('speed-buttons').first()
      await expect(speedGroup).toBeVisible()
    })
  })

  test.describe('result 단계 (demo fallback)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/student/reading-practice')
      if (!page.url().includes('/reading-practice')) test.skip()
      await page.getByTestId('start-easy-reading').click()
      await page.getByTestId('btn-demo-fallback').click()
    })

    test('줄별 첨삭 패널이 표시된다', async ({ page }) => {
      await expect(page.getByTestId('line-diff-panel')).toBeVisible()
    })

    test('발음평가 점수 카드가 표시된다', async ({ page }) => {
      await expect(page.getByTestId('pronunciation-score-card')).toBeVisible()
      await expect(page.getByTestId('normalized-score')).toBeVisible()
      await expect(page.getByTestId('raw-score')).toBeAttached()
    })

    test('Azure/발음평가 실패 시 큰 오류 대신 안내가 표시된다', async ({ page }) => {
      await expect(page.getByTestId('etri-fallback-notice')).toBeVisible()
      const text = await page.getByTestId('etri-fallback-notice').textContent()
      expect(text).toContain('참고평가')
    })

    test('한국어 피드백과 학습자 모국어 피드백이 함께 표시된다', async ({ page }) => {
      await expect(page.getByTestId('feedback-panel')).toBeVisible()
      await expect(page.getByTestId('feedback-korean')).toBeVisible()
      await expect(page.getByTestId('feedback-native')).toBeVisible()
    })

    test('다시 읽기 버튼이 표시된다', async ({ page }) => {
      await expect(page.getByTestId('btn-retry')).toBeVisible()
    })

    test('demo fallback 점수가 합리적인 범위(10~100)에 있다', async ({ page }) => {
      const scoreEl = page.getByTestId('normalized-score')
      const text = await scoreEl.textContent()
      const score = parseInt(text ?? '0', 10)
      expect(score).toBeGreaterThanOrEqual(10)
      expect(score).toBeLessThanOrEqual(100)
    })

    test('demo fallback 시 데모 평가 모드 배지가 표시된다', async ({ page }) => {
      // fallback notice가 표시되면 → provider badge도 fallback 계열
      await expect(page.getByTestId('etri-fallback-notice')).toBeVisible()
      await expect(page.getByTestId('provider-badge-demo')).toBeVisible()
    })

    test('정확 낭독 STT demo fallback 점수는 90점 이상이다', async ({ page }) => {
      // DEMO_STT_ACCURATE는 REFERENCE_LINES와 동일 → 점수 90+
      const scoreEl = page.getByTestId('normalized-score')
      const text = await scoreEl.textContent()
      const score = parseInt(text ?? '0', 10)
      expect(score).toBeGreaterThanOrEqual(90)
    })
  })

  // ── Phase 10-E-8-POLISH 추가 테스트 ──────────────────────────────────────────

  test('읽기연습 화면에 4단계 학습 흐름이 표시된다', async ({ page }) => {
    await page.goto('/student/reading-practice')
    if (!page.url().includes('/reading-practice')) return
    await expect(page.getByTestId('reading-flow-steps')).toBeVisible()
    await expect(page.getByTestId('reading-step-1')).toBeVisible()
    await expect(page.getByTestId('reading-step-2')).toBeVisible()
    await expect(page.getByTestId('reading-step-3')).toBeVisible()
    await expect(page.getByTestId('reading-step-4')).toBeVisible()
  })

  test('result 단계에 "읽기 정확도 참고평가" 문구가 표시된다', async ({ page }) => {
    await page.goto('/student/reading-practice')
    if (!page.url().includes('/reading-practice')) return
    await page.getByTestId('start-easy-reading').click()
    await page.getByTestId('btn-demo-fallback').click()
    await expect(page.getByTestId('pronunciation-score-card')).toBeVisible()
    const cardText = await page.getByTestId('pronunciation-score-card').textContent()
    expect(cardText).toContain('참고')
  })

  test('demo fallback 상태에서 "실시간 발음평가" 문구가 표시되지 않는다', async ({ page }) => {
    await page.goto('/student/reading-practice')
    if (!page.url().includes('/reading-practice')) return
    await page.getByTestId('start-easy-reading').click()
    await page.getByTestId('btn-demo-fallback').click()
    await expect(page.getByTestId('pronunciation-score-card')).toBeVisible()
    // provider-badge-azure가 없으면 실시간 발음평가 배지가 표시되지 않음
    await expect(page.getByTestId('provider-badge-azure')).not.toBeVisible()
  })

  test('demo fallback 시 빨간색 diff가 없으면 "빨간색 단어" 안내 문구가 표시되지 않는다', async ({ page }) => {
    await page.goto('/student/reading-practice')
    if (!page.url().includes('/reading-practice')) return
    await page.getByTestId('start-easy-reading').click()
    await page.getByTestId('btn-demo-fallback').click()
    await expect(page.getByTestId('feedback-panel')).toBeVisible()
    // DEMO_STT_ACCURATE = REFERENCE_LINES → 차이 없음 → "빨간색" 안내 미표시
    const feedbackText = await page.getByTestId('feedback-panel').textContent()
    expect(feedbackText).not.toContain('빨간색으로 표시된 단어를 다시 읽어 보세요')
  })

  test('기존 말하기 평가 라우트가 여전히 접근 가능하다', async ({ page }) => {
    await page.goto('/student/speaking')
    const url = page.url()
    expect(url.includes('/speaking') || url.includes('/login')).toBe(true)
  })

  test('기존 미션 대화 라우트가 여전히 접근 가능하다', async ({ page }) => {
    await page.goto('/student/mission')
    const url = page.url()
    expect(url.includes('/mission') || url.includes('/login')).toBe(true)
  })
})
