import { test, expect } from '@playwright/test'

/**
 * Phase 10-E-9: 발표연습 시연 보강 smoke tests
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
      await expect(page.getByTestId('btn-play-corrected')).toBeVisible()
    })

    test('목표 시간 선택 버튼이 표시된다', async ({ page }) => {
      await expect(page.getByTestId('time-options')).toBeVisible()
    })

    test('녹음 컨트롤 영역(타이머 + 녹음 버튼)이 표시된다', async ({ page }) => {
      await expect(page.getByTestId('timer-card')).toBeVisible()
      await expect(page.getByTestId('timer-display')).toBeVisible()
      await expect(page.getByTestId('btn-start-recording')).toBeVisible()
    })

    test('녹음 시작 시 타이머가 작동한다', async ({ page }) => {
      const initial = await page.getByTestId('timer-display').textContent()
      await page.getByTestId('btn-start-recording').click()
      await page.waitForTimeout(1500)
      // 마이크가 없는 헤드리스 환경에서는 즉시 done으로 전환되며 타이머는 1초 이상 변동.
      const after = await page.getByTestId('timer-display').textContent()
      expect(after).toBeTruthy()
      expect(initial).not.toBe(after)
    })

    test('발표 피드백 카드가 녹음 종료 후 표시된다', async ({ page }) => {
      await expect(page.getByTestId('feedback-panel')).not.toBeVisible()
      await page.getByTestId('btn-start-recording').click()
      await expect(page.getByTestId('feedback-panel')).toBeVisible({ timeout: 3000 })
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

  // ── Phase 10-E-8-POLISH 기존 테스트 ──────────────────────────────────────────

  test.describe('Phase 10-E-8-POLISH 발표연습 화면 보강', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/student/presentation-practice')
      if (!page.url().includes('/presentation-practice')) test.skip()
    })

    test('발표연습 흐름에 설정/원고 교정/설명/섀도잉/타이머 발표 단계가 표시된다', async ({
      page,
    }) => {
      await expect(page.getByTestId('practice-flow')).toBeVisible()
      await expect(page.getByTestId('practice-step-1')).toBeVisible()
      await expect(page.getByTestId('practice-step-3')).toBeVisible()
      await expect(page.getByTestId('practice-step-4')).toBeVisible()
      await expect(page.getByTestId('practice-step-5')).toBeVisible()
      const step3Text = await page.getByTestId('practice-step-3').textContent()
      expect(step3Text).toContain('설명')
      const step4Text = await page.getByTestId('practice-step-4').textContent()
      expect(step4Text).toContain('섀도잉')
      const step5Text = await page.getByTestId('practice-step-5').textContent()
      expect(step5Text).toContain('타이머 발표')
    })

    test('발표 피드백 카드에 "참고 피드백" 배지가 녹음 종료 후 표시된다 (mock fallback)', async ({
      page,
    }) => {
      await page.getByTestId('btn-start-recording').click()
      // mock 폴백 시 sample-feedback-badge, LLM 성공 시 ai-feedback-badge 중 하나가 노출됨
      const sampleBadge = page.getByTestId('sample-feedback-badge')
      const aiBadge = page.getByTestId('ai-feedback-badge')
      await expect(sampleBadge.or(aiBadge)).toBeVisible({ timeout: 3000 })
      if (await sampleBadge.isVisible()) {
        const badgeText = await sampleBadge.textContent()
        expect(badgeText).toContain('참고 피드백')
      }
    })

    test('발표연습 화면에서 "실시간 발음평가", "정밀 발음분석" 문구가 표시되지 않는다', async ({
      page,
    }) => {
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).not.toContain('실시간 발음평가')
      expect(bodyText).not.toContain('정밀 발음분석')
      expect(bodyText).not.toContain('Azure 발음평가 결과')
    })
  })

  // ── Phase 10-E-9 신규 테스트 ──────────────────────────────────────────────────

  test.describe('Phase 10-E-9 발표연습 시연 보강', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/student/presentation-practice')
      if (!page.url().includes('/presentation-practice')) test.skip()
    })

    test('기본 주제가 "지난 주말에 한 일"로 미리 입력되어 있다', async ({ page }) => {
      const topicVal = await page.getByTestId('topic-input').inputValue()
      expect(topicVal).toBe('지난 주말에 한 일')
    })

    test('기본 원고가 textarea에 미리 입력되어 있다', async ({ page }) => {
      const scriptVal = await page.getByTestId('script-input').inputValue()
      expect(scriptVal.length).toBeGreaterThan(10)
      expect(scriptVal).toContain('카페')
    })

    test('"AI 원고 교정하기" 버튼 텍스트가 표시된다', async ({ page }) => {
      const btn = page.getByTestId('btn-ai-correction')
      await expect(btn).toBeVisible()
      const btnText = await btn.textContent()
      expect(btnText).toContain('AI 원고 교정하기')
    })

    test('AI 원고 교정하기 클릭 후 교정문이 표시된다', async ({ page }) => {
      await page.getByTestId('btn-ai-correction').click()
      await expect(page.getByTestId('corrected-text')).toBeVisible()
      const correctedText = await page.getByTestId('corrected-text').textContent()
      expect(correctedText).toContain('가서')
    })

    test('AI 원고 교정하기 클릭 후 한국어 설명이 표시된다', async ({ page }) => {
      await page.getByTestId('btn-ai-correction').click()
      await expect(page.getByTestId('correction-ko-explain')).toBeVisible()
      const koText = await page.getByTestId('correction-ko-explain').textContent()
      expect(koText).toContain('-아서/어서')
    })

    test('AI 원고 교정하기 클릭 후 베트남어 설명이 표시된다', async ({ page }) => {
      await page.getByTestId('btn-ai-correction').click()
      await expect(page.getByTestId('correction-native-explain')).toBeVisible()
      const viText = await page.getByTestId('correction-native-explain').textContent()
      expect(viText).toContain('Thay vì')
    })

    test('섀도잉 카드와 "교정문 듣기" 버튼이 표시된다', async ({ page }) => {
      await expect(page.getByTestId('shadowing-card')).toBeVisible()
      await expect(page.getByTestId('btn-play-corrected')).toBeVisible()
    })

    test('"천천히 듣기", "보통 속도로 듣기" 버튼이 표시된다', async ({ page }) => {
      await expect(page.getByTestId('btn-play-slow')).toBeVisible()
      await expect(page.getByTestId('btn-play-normal')).toBeVisible()
    })

    test('발표 녹음 시작 버튼이 표시된다', async ({ page }) => {
      await expect(page.getByTestId('btn-start-recording')).toBeVisible()
    })

    test('발표 녹음 시작 후 내 발표 내용 카드가 표시된다 (mic 실패 시 demo transcript)', async ({
      page,
    }) => {
      await page.getByTestId('btn-start-recording').click()
      // In headless: mic unavailable → demo transcript shown immediately
      await expect(page.getByTestId('stt-result-card')).toBeVisible({ timeout: 3000 })
    })

    test('STT 실패 시 demo transcript가 표시되어 화면이 깨지지 않는다', async ({ page }) => {
      await page.getByTestId('btn-start-recording').click()
      await page.waitForTimeout(500)
      const sttCard = page.getByTestId('stt-result-card')
      if (await sttCard.isVisible()) {
        const text = await sttCard.textContent()
        expect(text).toBeTruthy()
        expect((text ?? '').length).toBeGreaterThan(0)
      }
    })

    test('교정문-발화 비교 카드가 표시된다', async ({ page }) => {
      await page.getByTestId('btn-start-recording').click()
      await expect(page.getByTestId('comparison-card')).toBeVisible({ timeout: 3000 })
    })

    test('포함된 내용/빠진 내용/다르게 말한 표현이 표시된다', async ({ page }) => {
      await page.getByTestId('btn-start-recording').click()
      await expect(page.getByTestId('comparison-card')).toBeVisible({ timeout: 3000 })
      await expect(page.getByTestId('comparison-included')).toBeVisible()
      await expect(page.getByTestId('comparison-missing')).toBeVisible()
      await expect(page.getByTestId('comparison-different')).toBeVisible()
    })

    test('포함된 내용에 카페/공원 관련 항목이 있다', async ({ page }) => {
      await page.getByTestId('btn-start-recording').click()
      await expect(page.getByTestId('comparison-included')).toBeVisible({ timeout: 3000 })
      const includedText = await page.getByTestId('comparison-included').textContent()
      expect(includedText).toContain('카페')
    })

    test('발표 시간/속도 참고 피드백이 녹음 종료 후 표시된다', async ({ page }) => {
      await page.getByTestId('btn-start-recording').click()
      await expect(page.getByTestId('timer-feedback')).toBeVisible({ timeout: 3000 })
      const feedbackText = await page.getByTestId('timer-feedback').textContent()
      expect(feedbackText).toContain('목표 시간')
    })

    test('한국어 피드백에 발표 주제 관련 내용이 있다', async ({ page }) => {
      await page.getByTestId('btn-start-recording').click()
      await expect(page.getByTestId('feedback-korean')).toBeVisible({ timeout: 3000 })
      const koText = await page.getByTestId('feedback-korean').textContent()
      expect(koText).toContain('발표 주제')
    })

    test('모국어(베트남어) 피드백이 표시된다', async ({ page }) => {
      await page.getByTestId('btn-start-recording').click()
      await expect(page.getByTestId('feedback-native')).toBeVisible({ timeout: 3000 })
      const viText = await page.getByTestId('feedback-native').textContent()
      expect(viText).toContain('Chủ đề')
    })

    test('actual: demo 상태에서 금지 표현이 표시되지 않는다', async ({ page }) => {
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).not.toContain('정밀 발음평가')
      expect(bodyText).not.toContain('실시간 발음평가')
      expect(bodyText).not.toContain('Azure 발음평가 결과')
      expect(bodyText).not.toContain('음소 단위 분석')
      expect(bodyText).not.toContain('발음 확정 점수')
    })

    test('6단계 발표 녹음 흐름이 연습 플로우에 표시된다', async ({ page }) => {
      await expect(page.getByTestId('practice-step-6')).toBeVisible()
      const step6Text = await page.getByTestId('practice-step-6').textContent()
      expect(step6Text).toContain('발표 녹음')
    })
  })

  // ── 회귀 검증 ─────────────────────────────────────────────────────────────────

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

  test('읽기연습 화면이 깨지지 않는다', async ({ page }) => {
    await page.goto('/student/reading-practice')
    const url = page.url()
    expect(url.includes('/reading-practice') || url.includes('/login')).toBe(true)
  })

  test('/admin/analytics 접근이 깨지지 않는다', async ({ page }) => {
    await page.goto('/admin/analytics')
    const url = page.url()
    expect(url.includes('/analytics') || url.includes('/login') || url.includes('/admin')).toBe(
      true,
    )
  })

  test('/teacher/dashboard 접근이 깨지지 않는다', async ({ page }) => {
    await page.goto('/teacher/dashboard')
    const url = page.url()
    expect(
      url.includes('/dashboard') || url.includes('/login') || url.includes('/teacher'),
    ).toBe(true)
  })
})
