// v1.1 단계 19.12: 발표연습 페이지 누락 라벨 보강 시각 검증.
//
// 단계 19.10 페이즈3 라벨 확장이 발표 페이지에 부분만 적용된 상태였다.
// "샘플 원고 불러오기", "교정 톤", "교정문 듣기" 등 23개 라벨이 한국어 단독.
// 단계 19.12에서 7개 언어 보조 표기를 일괄 추가하고 시각 검증한다.

import { test, expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { loginAsResearchParticipant } from './_helpers/login'
import { resetParticipantConsent } from './_helpers/research-seed'

const SCREENSHOT_DIR = '/tmp/단계19.12/screenshots'
mkdirSync(SCREENSHOT_DIR, { recursive: true })

const KEY_LABELS_AR = [
  'تحميل نص نموذجي',          // 샘플 원고 불러오기
  'تصحيح النص بالذكاء الاصطناعي', // AI 원고 교정하기
  'نبرة التصحيح',              // 교정 톤
  'تظليل النص المصحَّح',         // 교정문 섀도잉
  'استمع إلى النص المصحَّح',     // 교정문 듣기
  'استمع ببطء',                 // 천천히 듣기
  'استمع بسرعة عادية',          // 보통 속도로 듣기
  'سرعة التشغيل',              // 재생 속도
]

// "Playback speed" 라벨은 부모 <label class="... uppercase">로 시각적으로 대문자화되므로
// 케이스 무관 비교. 다른 라벨은 원래 케이스 그대로 노출됨.
const KEY_LABELS_EN = [
  'Load sample script',
  'AI script correction',
  'Correction tone',
  'Corrected Script Shadowing',
  'Listen to corrected',
  'Listen slowly',
  'Listen at normal speed',
]
const KEY_LABELS_EN_CASE_INSENSITIVE = [
  'Playback speed',
]

test.describe('[단계19.12-발표라벨] 발표연습 페이지 7개 언어 보조 표기', () => {
  test('P043 (ar) — 발표 페이지 누락됐던 라벨이 아랍어 보조 표기', async ({ page }) => {
    await resetParticipantConsent('P043')
    await loginAsResearchParticipant(page, 'P043', '1043')
    const agreeBtn = page.getByTestId('btn-consent-agree')
    if (await agreeBtn.isVisible().catch(() => false)) {
      await agreeBtn.click()
      await page.waitForURL(/\/research\/student\/progress/, { timeout: 10_000 })
    }
    await page.goto('/student/presentation-practice')
    await page.waitForLoadState('networkidle')

    // 페이지 본문에 아랍어 라벨 텍스트가 노출되는지 확인
    const bodyText = await page.locator('body').innerText()
    for (const label of KEY_LABELS_AR) {
      expect(bodyText, `아랍어 라벨 누락: ${label}`).toContain(label)
    }

    // 페이지 상단 스크린샷
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-presentation-P043-ar-top.png`,
      fullPage: false,
    })
    // AI 원고 교정 카드 (교정 톤, 샘플 원고 등) 영역
    const correctionToneRow = page.getByTestId('correction-tone-row')
    if (await correctionToneRow.isVisible()) {
      await correctionToneRow.scrollIntoViewIfNeeded()
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/04-presentation-P043-ar-correction.png`,
        fullPage: false,
      })
    }
    // 섀도잉 카드 (교정문 듣기, 재생 속도 등) 영역
    const shadowingCard = page.getByTestId('shadowing-card')
    if (await shadowingCard.isVisible()) {
      await shadowingCard.scrollIntoViewIfNeeded()
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/05-presentation-P043-ar-shadowing.png`,
        fullPage: false,
      })
    }
  })

  test('P041 (en) — 발표 페이지 누락됐던 라벨이 영어 보조 표기', async ({ page }) => {
    await resetParticipantConsent('P041')
    await loginAsResearchParticipant(page, 'P041', '1041')
    const agreeBtn = page.getByTestId('btn-consent-agree')
    if (await agreeBtn.isVisible().catch(() => false)) {
      await agreeBtn.click()
      await page.waitForURL(/\/research\/student\/progress/, { timeout: 10_000 })
    }
    await page.goto('/student/presentation-practice')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    for (const label of KEY_LABELS_EN) {
      expect(bodyText, `영어 라벨 누락: ${label}`).toContain(label)
    }
    const bodyLower = bodyText.toLowerCase()
    for (const label of KEY_LABELS_EN_CASE_INSENSITIVE) {
      expect(bodyLower, `영어 라벨 누락(케이스 무관): ${label}`).toContain(label.toLowerCase())
    }

    const correctionToneRow = page.getByTestId('correction-tone-row')
    if (await correctionToneRow.isVisible()) {
      await correctionToneRow.scrollIntoViewIfNeeded()
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/06-presentation-P041-en-correction.png`,
        fullPage: false,
      })
    }
    const shadowingCard = page.getByTestId('shadowing-card')
    if (await shadowingCard.isVisible()) {
      await shadowingCard.scrollIntoViewIfNeeded()
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/07-presentation-P041-en-shadowing.png`,
        fullPage: false,
      })
    }
  })
})
