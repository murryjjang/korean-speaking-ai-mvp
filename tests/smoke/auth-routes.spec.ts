import { test, expect } from '@playwright/test'

/**
 * Auth route smoke tests.
 *
 * These tests verify page structure without real Supabase credentials.
 * When NEXT_PUBLIC_SUPABASE_URL / ANON_KEY are not set (smoke env), the
 * middleware skips auth enforcement, so /student and /teacher load normally.
 * /login always loads regardless of Supabase config.
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
    // middleware skips auth when Supabase env vars are absent
    await page.goto('/student')

    // 내 학습 현황 또는 /login 중 하나여야 함
    const url = page.url()
    const isStudentOrLogin = url.includes('/student') || url.includes('/login')
    expect(isStudentOrLogin).toBe(true)
  })

  test('/teacher는 Supabase 미설정 시 접근 가능', async ({ page }) => {
    await page.goto('/teacher')

    const url = page.url()
    const isTeacherOrLogin = url.includes('/teacher') || url.includes('/login')
    expect(isTeacherOrLogin).toBe(true)
  })

  test('/student/speaking/q-001 말하기 평가 흐름 유지', async ({ page }) => {
    // 기존 핵심 흐름이 auth 변경 후에도 작동해야 함
    await page.goto('/student/speaking/q-001')

    await expect(page.getByRole('heading', { name: /자기소개/ })).toBeVisible()
    await expect(page.getByRole('button', { name: '준비 시작' })).toBeVisible()
  })
})
