// v1.1 단계 19.8 [UI보조]: 사이드바·모드 카드·페이지 제목 mother_tongue 보조 표기 검증.
//
// 실제 사용자 경로:
//  1) /research/login으로 P040~P043 로그인
//  2) /research/student/progress 페이지 진입 — 페이지 제목·모드 카드 보조 표기
//  3) /student/speaking 페이지 진입 — 사이드바 메뉴 보조 표기
//  4) ko는 보조 영역이 없음을 확인 (DOM 미존재)

import { test, expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { loginAsResearchParticipant } from './_helpers/login'
import { resetParticipantConsent } from './_helpers/research-seed'

const SCREENSHOT_DIR = '/tmp/단계19.8/screenshots'
mkdirSync(SCREENSHOT_DIR, { recursive: true })

type Case = {
  participantCode: string
  pin: string
  motherTongue: 'ko' | 'en' | 'vi' | 'ar'
  /** mother_tongue 보조 영역에 노출되는 모드 카드 제목 — 자유 대화 부분. */
  freeConvCardSupplement?: string
  /** 사이드바 "내 학습 현황" 항목의 mother_tongue 보조 텍스트 (md 사이드바 데스크톱 뷰포트). */
  sidebarMyProgress?: string
}

const CASES: Case[] = [
  { participantCode: 'P040', pin: '1040', motherTongue: 'ko' },
  { participantCode: 'P041', pin: '1041', motherTongue: 'en', freeConvCardSupplement: 'Free Conversation', sidebarMyProgress: 'My Progress' },
  { participantCode: 'P042', pin: '1042', motherTongue: 'vi', freeConvCardSupplement: 'Trò chuyện tự do', sidebarMyProgress: 'Tiến độ học tập' },
  { participantCode: 'P043', pin: '1043', motherTongue: 'ar', freeConvCardSupplement: 'محادثة حرة', sidebarMyProgress: 'تقدم التعلم' },
]

test.describe('[단계19.8-UI보조] 사이드바·모드 카드·페이지 제목 mother_tongue 보조', () => {
  for (const c of CASES) {
    test(`${c.participantCode} (mt=${c.motherTongue}) — 진척 페이지 모드 카드 + 페이지 제목 보조`, async ({ page }) => {
      await resetParticipantConsent(c.participantCode)
      await loginAsResearchParticipant(page, c.participantCode, c.pin)
      const agreeBtn = page.getByTestId('btn-consent-agree')
      if (await agreeBtn.isVisible().catch(() => false)) {
        await agreeBtn.click()
        await page.waitForURL(/\/research\/student\/progress/, { timeout: 10_000 })
      }
      // 진척 페이지에 도착 확인
      await expect(page.getByTestId('research-student-progress')).toBeVisible()

      const freeConvCard = page.getByTestId('nav-free-conversation')
      await expect(freeConvCard).toBeVisible()

      if (c.motherTongue === 'ko') {
        // ko: 모드 카드 보조 영역 미생성
        const supp = freeConvCard.locator('[data-bilingual-supplement]')
        await expect(supp).toHaveCount(0)
      } else {
        // 외국어: 모드 카드 한국어 본문 + 보조 표기
        await expect(freeConvCard).toContainText('생성형 자유 대화')
        if (c.freeConvCardSupplement) {
          await expect(freeConvCard).toContainText(c.freeConvCardSupplement)
        }
      }

      // 페이지 제목 — "학습 진척 상황" 한국어 + mother_tongue 보조
      const pageTitle = page.locator('h1').first()
      await expect(pageTitle).toContainText('학습 진척 상황')
      if (c.motherTongue !== 'ko') {
        // h1 내부에 [data-bilingual-supplement] 마크가 있는지 확인 (제목 보조)
        const titleSupp = pageTitle.locator('[data-bilingual-supplement]').first()
        await expect(titleSupp).toBeVisible()
      }

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/progress-ui-${c.participantCode}-${c.motherTongue}.png`,
        fullPage: true,
      })
    })

    test(`${c.participantCode} (mt=${c.motherTongue}) — 학습자 사이드바 메뉴 보조 표기`, async ({ page }) => {
      await resetParticipantConsent(c.participantCode)
      await loginAsResearchParticipant(page, c.participantCode, c.pin)
      const agreeBtn = page.getByTestId('btn-consent-agree')
      if (await agreeBtn.isVisible().catch(() => false)) {
        await agreeBtn.click()
        await page.waitForURL(/\/research\/student\/progress/, { timeout: 10_000 })
      }
      // 학습자 모드 진입 — Sidebar 보조 표기
      await page.goto('/student/speaking')
      const sidebar = page.locator('aside').first()
      await expect(sidebar).toBeVisible()

      if (c.motherTongue === 'ko') {
        // ko: 사이드바 보조 영역 미생성
        const supp = sidebar.locator('[data-bilingual-supplement]')
        await expect(supp).toHaveCount(0)
      } else {
        // 사이드바 "내 학습 현황" 한국어 + mother_tongue 보조 텍스트
        await expect(sidebar).toContainText('내 학습 현황')
        if (c.sidebarMyProgress) {
          await expect(sidebar).toContainText(c.sidebarMyProgress)
        }
      }

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/sidebar-${c.participantCode}-${c.motherTongue}.png`,
        fullPage: false,
      })
    })
  }
})
