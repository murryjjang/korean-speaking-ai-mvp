// M5 — 라이브 e2e: 콘텐츠 관리(admin) (Task 1.7). **로컬 only**.
//
// /admin/content 렌더(헤더 + 생성 폼). 미들웨어가 권한 게이팅하므로 SMOKE_TEST_MODE
// (로컬, 인증 우회)에서 페이지 구조를 검증한다. 실제 CRUD/태깅은 admin 권한+DB 의존(로컬 폼 렌더까지).
// 라이브는 skip(M5 결정).

import { test, expect } from '@playwright/test'

test.describe('콘텐츠 관리 admin (로컬)', () => {
  test.skip(!!process.env.LIVE_URL, '라이브 미적용 — SMOKE_TEST_MODE 필요 (인증/세션 회피)')

  test('콘텐츠 관리 페이지가 렌더된다 (헤더 + 생성 폼)', async ({ page }) => {
    await page.goto('/admin/content')
    await expect(page.getByTestId('admin-content-page')).toBeVisible()
    await expect(page.getByRole('heading', { name: '콘텐츠 관리' })).toBeVisible()
    await expect(page.getByPlaceholder('id (예: q-010)')).toBeVisible()
  })
})
