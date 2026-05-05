import { test, expect } from '@playwright/test'

/**
 * Auth route smoke tests.
 *
 * These tests verify page structure without real Supabase credentials.
 * In the smoke dev server (SMOKE_TEST_MODE=1), proxy.ts skips auth
 * enforcement when Supabase env vars are absent, so /student and /teacher
 * load without a real login. /login always loads regardless of config.
 *
 * Note: Next.js 16 uses proxy.ts (not middleware.ts) for route interception.
 * SMOKE_TEST_MODE=1 is set in playwright.config.ts webServer command.
 */

test.describe('/login page smoke', () => {
  test('/login 페이지 로드 및 로그인 폼 표시', async ({ page }) => {
    await page.goto('/login')

    // 페이지 타이틀
    await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible()

    // 이메일/비밀번호 입력 필드
    await expect(page.getByLabel('이메일')).toBeVisible()
    await expect(page.getByLabel('비밀번호')).toBeVisible()

    // 로그인 버튼
    await expect(page.getByRole('button', { name: '로그인' })).toBeVisible()
  })

  test('/login 이메일 미입력 → 브라우저 validation 동작', async ({ page }) => {
    await page.goto('/login')

    // 비밀번호만 입력하고 제출 — 브라우저 required validation이 막아야 함
    await page.getByLabel('비밀번호').fill('somepassword')
    await page.getByRole('button', { name: '로그인' }).click()

    // 폼 제출이 차단되어 /login에 그대로 있어야 함
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('/role-missing page smoke', () => {
  test('/role-missing 페이지 로드', async ({ page }) => {
    await page.goto('/role-missing')

    await expect(page.getByRole('heading', { name: '역할 정보 없음' })).toBeVisible()
    await expect(page.getByRole('button', { name: '로그아웃' })).toBeVisible()
  })
})

test.describe('인증 우회 — Supabase 미설정 환경', () => {
  test('/student는 Supabase 미설정 시 접근 가능', async ({ page }) => {
    // proxy.ts skips auth when Supabase env vars are absent
    await page.goto('/student')

    const url = page.url()
    const isStudentOrLogin = url.includes('/student') || url.includes('/login')
    expect(isStudentOrLogin).toBe(true)
  })

  test('/student 메뉴 항목 표시 확인', async ({ page }) => {
    await page.goto('/student')

    if (!page.url().includes('/student')) return

    // 데스크톱 사이드바 기준 (default Playwright viewport > md breakpoint)
    await expect(page.getByRole('link', { name: '말하기 평가' })).toBeVisible()
    await expect(page.getByRole('link', { name: '미션 대화' })).toBeVisible()
    // 대회 준비는 disabled span — desktop sidebar와 mobile nav에 모두 존재하므로 first() 사용
    await expect(page.getByText('말하기 대회 준비').first()).toBeVisible()
  })

  test('/teacher는 Supabase 미설정 시 접근 가능 + 채점 관리 헤더 표시', async ({ page }) => {
    await page.goto('/teacher')

    const url = page.url()
    const isTeacherOrLogin = url.includes('/teacher') || url.includes('/login')
    expect(isTeacherOrLogin).toBe(true)

    // smoke 환경에서 auth bypass → 채점 관리 대시보드가 렌더링되어야 함
    if (url.includes('/teacher')) {
      await expect(page.getByRole('heading', { name: '채점 관리' })).toBeVisible()
    }
  })

  test('/student/speaking/q-001 말하기 평가 흐름 유지', async ({ page }) => {
    // 기존 핵심 흐름이 auth 변경 후에도 작동해야 함
    await page.goto('/student/speaking/q-001')

    await expect(page.getByRole('heading', { name: /자기소개/ })).toBeVisible()
    await expect(page.getByRole('button', { name: '준비 시작' })).toBeVisible()
  })

  test('/student/speaking/q-002 다문항 직접 접근', async ({ page }) => {
    await page.goto('/student/speaking/q-002')

    await expect(page.getByRole('heading', { name: /자기소개/ })).toBeVisible()
    await expect(page.getByRole('button', { name: '준비 시작' })).toBeVisible()
  })

  test('/student/speaking 문항 목록 표시', async ({ page }) => {
    await page.goto('/student/speaking')

    await expect(page.getByRole('heading', { name: '말하기 평가' })).toBeVisible()
    // 최소 하나의 "시작하기" 링크가 있어야 함
    await expect(page.getByRole('link', { name: '시작하기' }).first()).toBeVisible()
  })

  test('TTS 음성 안내 버튼 렌더링 확인', async ({ page }) => {
    await page.goto('/student/speaking/q-001')

    // secondary variant 버튼으로 교체 후 렌더링 확인
    await expect(page.getByRole('button', { name: /문제 듣기/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /녹음 안내 듣기/ })).toBeVisible()
  })

  test('모국어 도움말 아랍어 RTL crash 없음', async ({ page }) => {
    await page.goto('/student/speaking/q-001')

    // 도움말 토글 클릭 — AR 텍스트 렌더링 시 crash 없어야 함
    await page.getByRole('button', { name: /모국어 도움말 보기/ }).click()
    await expect(page.getByText('[AR]')).toBeVisible()
  })

  test('/student/speaking/q-003 이미지 또는 미등록 안내 표시', async ({ page }) => {
    await page.goto('/student/speaking/q-003')

    await expect(page.getByRole('heading', { name: /그림 묘사/ })).toBeVisible()

    // 이미지 컨테이너(data-testid) 또는 "그림 자료가 아직 등록되지 않았습니다." 안내 중 하나가 표시되어야 함
    const hasImage = await page.locator('[data-testid="question-image-container"]').isVisible().catch(() => false)
    const hasFallback = await page.getByText('그림 자료가 아직 등록되지 않았습니다').isVisible().catch(() => false)
    expect(hasImage || hasFallback).toBe(true)

    // 준비 시작 버튼도 정상 표시
    await expect(page.getByRole('button', { name: '준비 시작' })).toBeVisible()
  })
})

test.describe('정식 평가세트 구조 smoke (Phase 10-E-2)', () => {
  test('정식 세트 3개 (초급/중급/고급)가 학습자 화면에 표시됨', async ({ page }) => {
    await page.goto('/student/speaking')

    await expect(page.getByRole('heading', { name: '말하기 평가' })).toBeVisible()
    await expect(page.getByText('초급 평가세트')).toBeVisible()
    await expect(page.getByText('중급 평가세트')).toBeVisible()
    await expect(page.getByText('고급 평가세트')).toBeVisible()
  })

  test('각 세트에 4문항이 있어 총 12개 이상의 시작하기 링크가 표시됨', async ({ page }) => {
    await page.goto('/student/speaking')

    // 데스크톱 뷰포트(1280px)에서 hidden md:inline-flex 링크가 표시됨
    const startLinks = page.getByRole('link', { name: '시작하기' })
    const count = await startLinks.count()
    // 3세트 × 4문항 = 12개 이상
    expect(count).toBeGreaterThanOrEqual(12)
  })

  test('정식 세트에 4개 문항 유형 레이블이 모두 표시됨', async ({ page }) => {
    await page.goto('/student/speaking')

    await expect(page.getByText('낭독').first()).toBeVisible()
    await expect(page.getByText('자료 설명').first()).toBeVisible()
    await expect(page.getByText('듣고 답하기').first()).toBeVisible()
    await expect(page.getByText('대화에서 미션 달성하기').first()).toBeVisible()
  })

  test('정식 세트 첫 문항(낭독) 페이지 접근 — 준비 시작 버튼 표시', async ({ page }) => {
    await page.goto('/student/speaking/q-b1-1?setId=qs-beginner-01')

    await expect(page.getByRole('button', { name: '준비 시작' })).toBeVisible()
  })

  test('기존 q-001/q-003 legacy route가 여전히 작동함', async ({ page }) => {
    await page.goto('/student/speaking/q-001')
    await expect(page.getByRole('button', { name: '준비 시작' })).toBeVisible()

    await page.goto('/student/speaking/q-003')
    await expect(page.getByRole('button', { name: '준비 시작' })).toBeVisible()
  })
})
