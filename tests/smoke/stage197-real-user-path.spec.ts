// v1.1 단계 19.7 [D6.7-5번째 + 실제 사용자 경로 검증].
//
// 단계 18·19·19.5·19.6에서 4연속 미완. 자체 검증이 URL `?locale=` 우회 또는
// 직접 쿠키 세팅으로 통과했을 가능성이 높다. 19.7 검증은 반드시 실제 사용자
// 경로를 따른다:
//   1) /research/login에 URL 파라미터 없이 진입
//   2) 자격증명(P040~P043, mother_tongue ko/en/vi/ar) 입력 후 로그인
//   3) redirect 후 동의서 페이지 표시 언어 확인 + 스크린샷 캡처
//
// 사전 조건: scripts/seed-stage197-participants.ts로 P040~P043이 발급되어 있어야 함.

import { test, expect, type Page } from '@playwright/test'
import { resetParticipantConsent } from './_helpers/research-seed'

type Case = {
  participantCode: string
  pin: string
  motherTongue: 'ko' | 'en' | 'vi' | 'ar'
  /** 해당 mother_tongue로 표시되는 동의서 제목(중 일부). 정확 매칭은 RTL escape가 까다로워 contain 패턴. */
  consentTitleContains: string
  /** 해당 mother_tongue로 표시되는 동의·거부 버튼 라벨(일부). */
  agreeContains: string
}

const CASES: Case[] = [
  { participantCode: 'P040', pin: '1040', motherTongue: 'ko', consentTitleContains: '시험운영 참여 동의', agreeContains: '동의하고 시작' },
  { participantCode: 'P041', pin: '1041', motherTongue: 'en', consentTitleContains: 'Consent to Participate', agreeContains: 'I agree' },
  { participantCode: 'P042', pin: '1042', motherTongue: 'vi', consentTitleContains: 'Đồng ý tham gia', agreeContains: 'Tôi đồng ý' },
  { participantCode: 'P043', pin: '1043', motherTongue: 'ar', consentTitleContains: 'الموافقة على المشاركة', agreeContains: 'أوافق' },
]

const SCREENSHOT_DIR = '/tmp/단계19.7/screenshots'

async function loginAsParticipant(page: Page, code: string, pin: string): Promise<void> {
  // URL 파라미터 없이 진입 — 단계 18~19.6의 자체 검증이 우회로 사용한 ?locale= 절대 미부착.
  await page.goto('/research/login')
  await expect(page).toHaveURL(/\/research\/login(\?.*)?$/)
  // 로그인 페이지가 URL 파라미터 없는지 명시 검증
  const url = new URL(page.url())
  expect(url.searchParams.get('lang')).toBeNull()

  await page.getByTestId('input-participant-code').fill(code)
  await page.getByTestId('input-participant-pin').fill(pin)
  await page.getByTestId('btn-research-login').click()

  // 동의서 페이지로 redirect (consent_status=false 가정 — 시드 직후라 consent 미완료).
  // 이미 consent 완료된 상태로 재시드되었다면 progress로 갈 수 있어 두 케이스 모두 허용.
  await page.waitForURL(/\/research\/(consent|student\/progress)/, { timeout: 10_000 })
}

test.describe('[단계19.7-D6.7] 실제 사용자 경로 — 4 mother_tongue 동의서 표시', () => {
  for (const c of CASES) {
    test(`${c.participantCode} (mother_tongue=${c.motherTongue}) — URL 파라미터 없이 로그인 후 ${c.motherTongue} 동의서`, async ({ page }) => {
      // 매 테스트마다 consent_status를 false로 리셋 — 멱등 검증.
      await resetParticipantConsent(c.participantCode)
      await loginAsParticipant(page, c.participantCode, c.pin)

      // ★★★ URL에 ?locale= 파라미터가 절대 없어야 함 — 19.7 핵심 변경 ★★★
      const consentUrl = new URL(page.url())
      expect(consentUrl.searchParams.get('locale'), 'login redirect가 ?locale= 파라미터를 부착하면 안 됨').toBeNull()

      // 본문 표시 언어 검증 — 페이지 헤더 h1 (I18N_TEXT.title) 정확 매칭.
      const headerTitle = page.getByTestId('consent-header-title')
      await expect(headerTitle).toBeVisible()
      const headerTitleText = (await headerTitle.textContent()) ?? ''
      expect(headerTitleText).toContain(c.consentTitleContains)

      // 동의 버튼 라벨 — mother_tongue별 정확한 텍스트
      const agreeBtn = page.getByTestId('btn-consent-agree')
      const agreeText = (await agreeBtn.textContent()) ?? ''
      expect(agreeText).toContain(c.agreeContains)

      // locale 토글 UI가 제거되었음을 명시 검증 (19.7 단순화)
      await expect(page.getByTestId('consent-locale-toggle')).toHaveCount(0)

      // ar의 경우 dir="rtl" 컨테이너 검증
      if (c.motherTongue === 'ar') {
        const main = page.getByTestId('research-consent-page')
        await expect(main).toHaveAttribute('dir', 'rtl')
      }

      // 스크린샷 캡처 (실제 사용자 경로 증거)
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/consent-${c.participantCode}-${c.motherTongue}.png`,
        fullPage: true,
      })
    })
  }
})
