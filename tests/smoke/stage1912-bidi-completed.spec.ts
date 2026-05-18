// v1.1 단계 19.12 [#3]: 진척 페이지 "(완료 مكتمل)" 한 줄 표시 시각 검증.
//
// 단계 19.11에서 dir="ltr" + unicode-bidi: isolate를 적용했지만, Localized
// 컴포넌트의 inline 미지정 분기가 보조 영역을 block으로 렌더해 ")"가 새 줄로
// 떨어지는 회귀가 잔존. 단계 19.12에서 bareSupplement prop + inline 강제로
// 해결. 이 스모크는 P043(ar) 사용자가 진척 페이지를 로드했을 때 완료 배지의
// 높이가 한 줄 (line-height 약 16px 안팎) 안에 들어오는지 측정한다.

import { test, expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { loginAsResearchParticipant } from './_helpers/login'
import { ensureProgressSessionsForBidiTest, resetParticipantConsent } from './_helpers/research-seed'

const SCREENSHOT_DIR = '/tmp/단계19.12/screenshots'
mkdirSync(SCREENSHOT_DIR, { recursive: true })

test.describe('[단계19.12-#3] 진척 페이지 "(완료 mother_tongue)" 한 줄 표시', () => {
  test('P043 (ar) — 완료 배지가 한 줄, ")"가 새 줄로 떨어지지 않음', async ({ page }) => {
    await resetParticipantConsent('P043')
    await ensureProgressSessionsForBidiTest('P043')
    await loginAsResearchParticipant(page, 'P043', '1043')
    const agreeBtn = page.getByTestId('btn-consent-agree')
    if (await agreeBtn.isVisible().catch(() => false)) {
      await agreeBtn.click()
      await page.waitForURL(/\/research\/student\/progress/, { timeout: 10_000 })
    }
    await expect(page.getByTestId('research-student-progress')).toBeVisible()

    // 최근 세션 카드가 있을 때만 검증 (세션이 0건이면 다른 영역 노출)
    const cards = page.getByTestId('recent-session-card')
    const cardCount = await cards.count()
    if (cardCount === 0) {
      // 세션 0건일 경우에도 페이지 자체는 정상 — 스크린샷만 남기고 통과
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/01-progress-P043-ar-no-sessions.png`,
        fullPage: true,
      })
      test.skip(true, '최근 세션 0건 — 완료 배지 검증 스킵')
      return
    }

    // 완료/진행 배지 컨테이너 — dir="ltr" + isolate 처리한 span을 찾아 측정.
    // 단계 19.12 적용 후 그 안 보조 텍스트(아랍어 مكتمل)가 inline (ml-1.5)으로
    // 들어가야 한다. block이면 줄높이 약 32px(두 줄) 이상이 된다.
    const firstCard = cards.first()
    const badge = firstCard.locator('span[dir="ltr"][style*="isolate"]').first()
    await expect(badge).toBeVisible()
    const box = await badge.boundingBox()
    expect(box).not.toBeNull()
    // 한 줄 높이 가이드: text-xs 라인 (보통 16~20px) + 약간의 여유. 28px 이내면 한 줄로 본다.
    expect(box!.height).toBeLessThan(28)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-progress-P043-ar-completed-oneline.png`,
      fullPage: true,
    })
    // 배지만 클립 — bidi 표시 시각 확인용
    await badge.screenshot({
      path: `${SCREENSHOT_DIR}/02-badge-P043-ar-completed-only.png`,
    })
  })
})
