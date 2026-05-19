// v1.1 단계 19.14 [페이즈 0]: 19.13 후 회귀 2건 재현·진단.
//
// R1 — 자유 대화 주제 선택 후 "다음" 버튼 비활성화 (긴급, 시험운영 차단)
// R2 — 모바일 /research/student/progress 학습 콘텐츠 위치 — 재로그인 시 회귀
//
// 정적 스크린샷만으로는 동적·재로그인 회귀를 잡지 못했음(단계 19.13 한계).
// 본 진단은 인터랙션 후 상태 + 로그아웃→재로그인 + 새로고침을 명시적으로 검증.

import { test, expect, type Page } from '@playwright/test'
import { loginAsResearchParticipant } from './_helpers/login'

const OUT_DIR = '/tmp/단계19.14/screenshots'

async function loginAndConsent(page: Page, code: string, pin: string): Promise<void> {
  await loginAsResearchParticipant(page, code, pin)
  const btn = page.getByTestId('btn-consent-agree')
  if (await btn.count() > 0) {
    await btn.click()
    await page.waitForURL(/\/research\/student\/progress/, { timeout: 15_000 })
  }
}

test.describe('R1 — 자유 대화 다음 버튼 진단', () => {
  test('주제 카드 클릭 → "다음" 버튼 enabled + 클릭 가능 (P062 ar)', async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 375, height: 667 })
    await loginAndConsent(page, 'P062', '1062')
    await page.goto('/student/conversation-practice', { waitUntil: 'domcontentloaded', timeout: 30_000 })

    // 1단계 진입 확인
    await expect(page.getByTestId('free-conversation-start')).toBeVisible({ timeout: 10_000 })
    await page.screenshot({ path: `${OUT_DIR}/r1-01-topic-select-init.png`, fullPage: true })

    // 주제 카드 9개 중 첫 카드 클릭
    const firstTopicCard = page.getByTestId('topic-card-weekend-place')
    await expect(firstTopicCard).toBeVisible()
    await firstTopicCard.click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${OUT_DIR}/r1-02-topic-clicked.png`, fullPage: true })

    // "다음" 버튼 상태 진단
    const nextBtn = page.getByTestId('btn-next-to-persona')
    await expect(nextBtn).toBeVisible()
    const isDisabled = await nextBtn.isDisabled()
    const ariaPressed = await firstTopicCard.getAttribute('aria-pressed')
    console.log(`[R1 진단] 다음 버튼 disabled=${isDisabled}, 카드 aria-pressed=${ariaPressed}`)

    // 픽스 후에는 enabled여야 한다 — 회귀 재현 시 isDisabled=true가 찍힐 것
    expect(isDisabled).toBe(false)
    expect(ariaPressed).toBe('true')

    // 실제 클릭이 다음 페이지(페르소나 선택)로 이동시키는지 확인
    await nextBtn.click()
    await page.waitForTimeout(500)
    // 페르소나 선택 단계는 pending-topic + persona 카드를 노출
    await expect(page.getByTestId('pending-topic')).toBeVisible({ timeout: 5_000 })
    await page.screenshot({ path: `${OUT_DIR}/r1-03-persona-select.png`, fullPage: true })
  })
})

test.describe('R2 — 모바일 progress 학습 콘텐츠 위치 진단', () => {
  const MOBILE_VP = { width: 375, height: 667 }
  const TOP_TID = 'start-learning-mobile-top'

  test('첫 로그인 vs 재로그인 vs 새로고침 — mobile-top 노출 + viewport 안 가시성', async ({ page }) => {
    test.setTimeout(180_000)
    await page.setViewportSize(MOBILE_VP)

    // ── 1) 첫 로그인 (캐시 무) ──
    await loginAndConsent(page, 'P062', '1062')
    await page.waitForURL(/\/research\/student\/progress/, { timeout: 10_000 })
    await page.waitForTimeout(800)
    const top1 = page.getByTestId(TOP_TID)
    await expect(top1).toBeAttached()
    const bbox1 = await top1.boundingBox()
    const inViewport1 = !!bbox1 && bbox1.y < MOBILE_VP.height
    console.log(`[R2 진단] 첫 로그인 mobile-top y=${bbox1?.y}, in viewport=${inViewport1}`)
    await page.screenshot({ path: `${OUT_DIR}/r2-01-first-login-mobile.png`, fullPage: true })

    // ── 2) 로그아웃 ──
    const logoutBtn = page.getByTestId('btn-participant-logout')
    await logoutBtn.click()
    await page.waitForURL(/\/research\/login/, { timeout: 10_000 })
    await page.waitForTimeout(300)

    // ── 3) 재로그인 (같은 세션, 쿠키 제외) ──
    await loginAndConsent(page, 'P062', '1062')
    await page.waitForURL(/\/research\/student\/progress/, { timeout: 10_000 })
    await page.waitForTimeout(800)
    const top2 = page.getByTestId(TOP_TID)
    await expect(top2).toBeAttached()
    const bbox2 = await top2.boundingBox()
    const inViewport2 = !!bbox2 && bbox2.y < MOBILE_VP.height
    console.log(`[R2 진단] 재로그인 mobile-top y=${bbox2?.y}, in viewport=${inViewport2}`)
    await page.screenshot({ path: `${OUT_DIR}/r2-02-relogin-mobile.png`, fullPage: true })

    // ── 4) 새로고침 ──
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    const top3 = page.getByTestId(TOP_TID)
    await expect(top3).toBeAttached()
    const bbox3 = await top3.boundingBox()
    const inViewport3 = !!bbox3 && bbox3.y < MOBILE_VP.height
    console.log(`[R2 진단] 새로고침 mobile-top y=${bbox3?.y}, in viewport=${inViewport3}`)
    await page.screenshot({ path: `${OUT_DIR}/r2-03-refresh-mobile.png`, fullPage: true })

    // 3개 시나리오 모두 mobile-top이 첫 viewport 안(또는 가까이)에 있어야 한다
    expect(inViewport1).toBe(true)
    expect(inViewport2).toBe(true)
    expect(inViewport3).toBe(true)
  })
})
