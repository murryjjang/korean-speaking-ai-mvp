// M5 — 라이브 e2e: 단어장 진입 (Task 1.4). **로컬 only**.
//
// /student/vocab 는 정식 학습자(auth.users) 모델 기준이라 인증/세션이 필요하다.
// SMOKE_TEST_MODE(로컬)에서 페이지가 크래시 없이 렌더되는지(헤더 + 안내/카드 상태)를
// 검증한다. 라이브(LIVE_URL)는 실인증·운영 DB 영향 회피로 skip(M5 결정, free-conv와 동일).
// (인증 학습자의 등록→복습 풀스코어 흐름은 #18 + 마이그레이션 적용 후 — TODO.)

import { test, expect } from '@playwright/test'

test.describe('단어장 진입 (로컬)', () => {
  test.skip(!!process.env.LIVE_URL, '라이브 미적용 — SMOKE_TEST_MODE 필요 (인증/세션 회피)')

  test('단어장 페이지가 렌더된다 (헤더 + 상태 카드)', async ({ page }) => {
    await page.goto('/student/vocab')
    await expect(page.getByTestId('vocab-page')).toBeVisible()
    await expect(page.getByText('단어장', { exact: true })).toBeVisible()
  })
})
