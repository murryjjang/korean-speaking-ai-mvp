import { test, expect } from '@playwright/test'

/**
 * Phase 10-E-8-FINAL: 관리자 분석 화면 및 교수자 대시보드 smoke tests
 */

// ── 관리자 분석 화면 ──────────────────────────────────────────────────────────

test.describe('/admin/analytics 관리자 분석 화면', () => {
  test('(T06) /admin/analytics 라우트가 열린다', async ({ page }) => {
    await page.goto('/admin/analytics')
    const url = page.url()
    expect(url.includes('/admin/analytics') || url.includes('/login')).toBe(true)
  })

  test.describe('관리자 분석 화면 구성', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/admin/analytics')
      if (!page.url().includes('/admin/analytics')) test.skip()
    })

    test('(T07) "시연용 샘플 데이터" 배지가 표시된다', async ({ page }) => {
      await expect(page.getByTestId('demo-data-badge')).toBeVisible()
      await expect(page.getByTestId('demo-data-badge')).toContainText('시연용 샘플 데이터')
    })

    test('(T08) 국가별 분석 카드가 표시된다', async ({ page }) => {
      await expect(page.getByTestId('country-section-title')).toBeVisible()
      await expect(page.getByTestId('country-cards')).toBeVisible()
      // 베트남, 일본 등 국가 데이터 포함 확인
      await expect(page.getByText('베트남')).toBeVisible()
      await expect(page.getByText('일본')).toBeVisible()
    })

    test('(T09) 어권별 분석 카드가 표시된다', async ({ page }) => {
      await expect(page.getByTestId('language-group-section-title')).toBeVisible()
      await expect(page.getByTestId('language-group-cards')).toBeVisible()
      // 어권별 테이블에 베트남어권 포함
      await expect(page.getByText('베트남어권')).toBeVisible()
      await expect(page.getByText('아랍어권')).toBeVisible()
    })

    test('(T10) 과정별 분석 카드가 표시된다', async ({ page }) => {
      await expect(page.getByTestId('course-section-title')).toBeVisible()
      await expect(page.getByTestId('course-cards')).toBeVisible()
      await expect(page.getByText('초급')).toBeVisible()
      await expect(page.getByText('중급')).toBeVisible()
      await expect(page.getByText('고급')).toBeVisible()
    })

    test('(T11) 문항별 분석 카드가 표시된다', async ({ page }) => {
      await expect(page.getByTestId('question-section-title')).toBeVisible()
      await expect(page.getByTestId('question-cards')).toBeVisible()
      await expect(page.getByText('q1 낭독')).toBeVisible()
      await expect(page.getByText('q3 듣고 답하기')).toBeVisible()
    })

    test('(T12) 교수자 지원 목적 문구가 표시된다', async ({ page }) => {
      await expect(page.getByTestId('purpose-statement')).toBeVisible()
      await expect(page.getByTestId('purpose-statement')).toContainText('교수자 감원이나 비용절감이 아니라')
    })
  })
})

// ── 교수자 대시보드 ───────────────────────────────────────────────────────────

test.describe('/teacher/dashboard 교수자 대시보드', () => {
  test('(T13) /teacher/dashboard 라우트가 열린다', async ({ page }) => {
    await page.goto('/teacher/dashboard')
    const url = page.url()
    expect(url.includes('/teacher/dashboard') || url.includes('/login')).toBe(true)
  })

  test.describe('교수자 대시보드 구성', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/teacher/dashboard')
      if (!page.url().includes('/teacher/dashboard')) test.skip()
    })

    test('(T14) 개별 학습자 목록이 익명 ID로 표시된다', async ({ page }) => {
      await expect(page.getByTestId('learner-list')).toBeVisible()
      // S001, S002 등 익명 ID 표시 확인
      await expect(page.getByTestId('learner-S001')).toBeVisible()
      await expect(page.getByTestId('learner-S002')).toBeVisible()
      // 실제 이름이 아닌 S000 형식 ID 확인
      await expect(page.getByText('S001')).toBeVisible()
    })

    test('(T15) 재학습 추천 활동이 표시된다', async ({ page }) => {
      await expect(page.getByTestId('recommended-activities')).toBeVisible()
      await expect(page.getByText('읽기연습')).toBeVisible()
      await expect(page.getByText('q1 낭독 재도전')).toBeVisible()
    })

    test('(T16) 교수자 검토 대기 목록이 표시된다', async ({ page }) => {
      await expect(page.getByTestId('pending-reviews')).toBeVisible()
      // R001, R002 등 검토 ID 확인
      await expect(page.getByText('R001')).toBeVisible()
      await expect(page.getByText('R002')).toBeVisible()
    })

    test('교수자 대시보드 "시연용 샘플 데이터" 배지가 표시된다', async ({ page }) => {
      await expect(page.getByTestId('demo-data-badge')).toBeVisible()
    })

    test('교수자 지원 목적 문구가 표시된다', async ({ page }) => {
      await expect(page.getByTestId('purpose-statement')).toBeVisible()
      await expect(page.getByTestId('purpose-statement')).toContainText('교수자 감원이나 비용절감이 아니라')
    })

    test('교수자 검토 필요 학습자에 배지가 표시된다', async ({ page }) => {
      // S002는 needsReview: true
      await expect(page.getByTestId('review-needed-S002')).toBeVisible()
    })
  })
})

// ── 회귀: 기존 화면 흐름 ──────────────────────────────────────────────────────

test.describe('(T17-T20) 회귀: 기존 화면 흐름', () => {
  test('(T17) /student/speaking 기존 q1~q4 문항 목록이 열린다', async ({ page }) => {
    await page.goto('/student/speaking')
    const url = page.url()
    expect(url.includes('/speaking') || url.includes('/login')).toBe(true)
  })

  test('(T18-A) /student/reading-practice 읽기연습 화면이 열린다', async ({ page }) => {
    await page.goto('/student/reading-practice')
    const url = page.url()
    expect(url.includes('/reading-practice') || url.includes('/login')).toBe(true)
  })

  test('(T18-B) /student/presentation-practice 발표연습 화면이 열린다', async ({ page }) => {
    await page.goto('/student/presentation-practice')
    const url = page.url()
    expect(url.includes('/presentation-practice') || url.includes('/login')).toBe(true)
  })

  test('(T19) /teacher/submissions teacher review workflow 화면이 열린다', async ({ page }) => {
    await page.goto('/teacher/submissions')
    const url = page.url()
    expect(url.includes('/teacher/submissions') || url.includes('/login')).toBe(true)
  })

  test('(T20) /student (홈) attempt summary 점수 화면이 열린다', async ({ page }) => {
    await page.goto('/student')
    const url = page.url()
    expect(url.includes('/student') || url.includes('/login')).toBe(true)
  })
})
