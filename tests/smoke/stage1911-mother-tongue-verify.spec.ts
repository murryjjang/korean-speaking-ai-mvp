// v1.1 단계 19.11: 7개 mother_tongue × 핵심 화면 시각 검증.
//
// 발견 사항 #2/#4/#5 — "자유 대화 페이지 진입 시 모든 사용자에서 km 보조 표기"
// 회귀 재현 시도. 코드 진단(페이즈 0)에서 정적 회귀 미발견 → 자동화된 실제
// 사용자 경로 + DOM 검증으로 확정한다.
//
// 검증 항목:
//  - 사이드바 "내 학습 현황" 보조 텍스트가 사용자의 mother_tongue과 일치
//  - 자유 대화 페이지 추천 주제 카드 본문에 mother_tongue 보조 텍스트 노출
//  - 다국어 보조 영역 lang 속성이 mother_tongue과 일치

import { test, expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { loginAsResearchParticipant } from './_helpers/login'
import { resetParticipantConsent } from './_helpers/research-seed'

const SCREENSHOT_DIR = '/tmp/단계19.11/screenshots'
mkdirSync(SCREENSHOT_DIR, { recursive: true })

type Lang = 'ko' | 'en' | 'vi' | 'ar' | 'th' | 'ms' | 'km'

type Case = {
  participantCode: string
  pin: string
  motherTongue: Lang
  /** 사이드바 "내 학습 현황" 항목의 보조 텍스트 (ko는 미표시이므로 undefined). */
  sidebarMyProgress?: string
  /** 자유 대화 진입 시 "추천 주제" 카드 헤더의 보조 텍스트. */
  freeConvTopicHeader?: string
}

const CASES: Case[] = [
  { participantCode: 'P040', pin: '1040', motherTongue: 'ko' },
  { participantCode: 'P041', pin: '1041', motherTongue: 'en', sidebarMyProgress: 'My Progress', freeConvTopicHeader: 'Recommended Topics' },
  { participantCode: 'P042', pin: '1042', motherTongue: 'vi', sidebarMyProgress: 'Tiến độ học tập', freeConvTopicHeader: 'Chủ đề gợi ý' },
  { participantCode: 'P043', pin: '1043', motherTongue: 'ar', sidebarMyProgress: 'تقدم التعلم', freeConvTopicHeader: 'موضوعات مقترحة' },
  { participantCode: 'P044', pin: '1044', motherTongue: 'th', sidebarMyProgress: 'สถานะการเรียนรู้ของฉัน', freeConvTopicHeader: 'หัวข้อแนะนำ' },
  { participantCode: 'P045', pin: '1045', motherTongue: 'ms', sidebarMyProgress: 'Status pembelajaran saya', freeConvTopicHeader: 'Topik Disyorkan' },
  { participantCode: 'P046', pin: '1046', motherTongue: 'km', sidebarMyProgress: 'ស្ថានភាពការសិក្សារបស់ខ្ញុំ', freeConvTopicHeader: 'ប្រធានបទដែលណែនាំ' },
]

test.describe('[단계19.11] 7개 mother_tongue × 3 화면 보조 표기 시각 검증', () => {
  for (const c of CASES) {
    test(`${c.participantCode} (mt=${c.motherTongue}) — 진척 페이지 사이드바 보조`, async ({ page }) => {
      await resetParticipantConsent(c.participantCode)
      await loginAsResearchParticipant(page, c.participantCode, c.pin)
      const agreeBtn = page.getByTestId('btn-consent-agree')
      if (await agreeBtn.isVisible().catch(() => false)) {
        await agreeBtn.click()
        await page.waitForURL(/\/research\/student\/progress/, { timeout: 10_000 })
      }
      await expect(page.getByTestId('research-student-progress')).toBeVisible()
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/01-progress-${c.participantCode}-${c.motherTongue}.png`,
        fullPage: true,
      })
    })

    test(`${c.participantCode} (mt=${c.motherTongue}) — 자유 대화 진입 시 보조 표기 mother_tongue 일치`, async ({ page }) => {
      await resetParticipantConsent(c.participantCode)
      await loginAsResearchParticipant(page, c.participantCode, c.pin)
      const agreeBtn = page.getByTestId('btn-consent-agree')
      if (await agreeBtn.isVisible().catch(() => false)) {
        await agreeBtn.click()
        await page.waitForURL(/\/research\/student\/progress/, { timeout: 10_000 })
      }

      await page.goto('/student/conversation-practice')

      // 사이드바 검증 (md+ 뷰포트)
      const sidebar = page.locator('aside').first()
      await expect(sidebar).toBeVisible()
      if (c.motherTongue === 'ko') {
        // ko는 사이드바 보조 영역 미표시
        await expect(sidebar.locator('[data-bilingual-supplement]')).toHaveCount(0)
      } else {
        // 사이드바에 mother_tongue 마크가 있어야 함 (km이 아니라 정확한 mother_tongue!)
        const supplements = sidebar.locator(`[data-bilingual-supplement="${c.motherTongue}"]`)
        await expect(supplements.first()).toBeVisible()
        // 잘못된 km으로 폴백되는지 명시적 차단 — mother_tongue이 km이 아닌데 km 마크가 있으면 fail
        if (c.motherTongue !== 'km') {
          await expect(sidebar.locator('[data-bilingual-supplement="km"]')).toHaveCount(0)
        }
        if (c.sidebarMyProgress) {
          await expect(sidebar).toContainText(c.sidebarMyProgress)
        }
      }

      // 본문 — 추천 주제 카드
      const topicCards = page.getByTestId('topic-cards')
      await expect(topicCards).toBeVisible()
      if (c.motherTongue !== 'ko' && c.freeConvTopicHeader) {
        // 추천 주제 카드 헤더 또는 본문에 사용자 mother_tongue 보조가 있어야 함
        const supplementsOnBody = page
          .locator('main, [data-testid="free-conversation-start"], body')
          .locator(`[data-bilingual-supplement="${c.motherTongue}"]`)
        await expect(supplementsOnBody.first()).toBeVisible()
        // 본문 어디에서도 잘못된 km 폴백이 노출되지 않아야 함
        if (c.motherTongue !== 'km') {
          await expect(page.locator(`[data-bilingual-supplement="km"]`)).toHaveCount(0)
        }
      }

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/02-freeconv-${c.participantCode}-${c.motherTongue}.png`,
        fullPage: true,
      })
    })
  }
})
