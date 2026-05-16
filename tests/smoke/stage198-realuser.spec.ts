// v1.1 단계 19.8 [평가결과 검증]: V3↔V4 갭 해결 검증.
//
// 실제 사용자 경로:
//  1) /research/login으로 P040~P043 로그인 (mother_tongue 단독 결정)
//  2) /api/dev/seed-speaking-result?mt=<mt>로 mock 평가 레코드 주입 + 결과 redirect
//  3) /student/speaking/.../result에서 mother_tongue 보조 카드 노출 확인
//  4) PDF 다운로드 + 매직 바이트 검증
//
// dev seed 엔드포인트는 NODE_ENV=production에서 404 처리되므로 시험운영 환경에는
// 노출되지 않는다. dev/smoke에서만 동작.

import { test, expect, type Download } from '@playwright/test'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { loginAsResearchParticipant } from './_helpers/login'
import { resetParticipantConsent } from './_helpers/research-seed'

type Case = {
  participantCode: string
  pin: string
  motherTongue: 'ko' | 'en' | 'vi' | 'ar'
  /** 보조 카드에서 기대되는 mother_tongue 단어(존재 검증). ko는 보조 카드 자체가 없음. */
  expectedSupplementSubstring?: string
}

// 보조 카드는 readingMultilingualFeedback의 점수별 정적 템플릿을 노출한다.
// 점수가 0/낮음 구간으로 폴백되어도 mother_tongue 글자가 카드에 포함된다 — 본질은
// "보조 카드가 mother_tongue로 채워졌는가"이므로, 각 언어의 고유 자음/연결 글자가
// 적어도 한 글자 노출되는지 검증.
const CASES: Case[] = [
  { participantCode: 'P040', pin: '1040', motherTongue: 'ko' },
  // en: 영어 단어 (e.g., "Bạn"에 ASCII 없으니 영어 템플릿의 'You' 또는 'Read')
  { participantCode: 'P041', pin: '1041', motherTongue: 'en', expectedSupplementSubstring: 'passage' },
  // vi: 'Bạn' 또는 'đọc' 같은 베트남어 액센트
  { participantCode: 'P042', pin: '1042', motherTongue: 'vi', expectedSupplementSubstring: 'Bạn' },
  // ar: 아랍어 글자 (Unicode 범위 U+0600~U+06FF)
  { participantCode: 'P043', pin: '1043', motherTongue: 'ar', expectedSupplementSubstring: 'النص' },
]

const SCREENSHOT_DIR = '/tmp/단계19.8/screenshots'
const PDF_DIR = '/tmp/단계19.8/pdfs'
mkdirSync(SCREENSHOT_DIR, { recursive: true })
mkdirSync(PDF_DIR, { recursive: true })

async function saveDownload(download: Download, savePath: string): Promise<number> {
  const tempPath = await download.path()
  if (!tempPath) throw new Error('download path missing')
  const buf = readFileSync(tempPath)
  writeFileSync(savePath, buf)
  return buf.length
}

test.describe('[단계19.8-평가결과] V3↔V4 mother_tongue 갭 해결 — 실제 사용자 경로', () => {
  for (const c of CASES) {
    test(`${c.participantCode} (mt=${c.motherTongue}) — q1 결과 화면 mother_tongue 보조 + PDF`, async ({ page }) => {
      // 동의 멱등성 보장
      await resetParticipantConsent(c.participantCode)
      await loginAsResearchParticipant(page, c.participantCode, c.pin)
      // consent 페이지에 있을 경우 동의 후 진척으로 이동 (P040~P043 모두 같은 흐름)
      const agreeBtn = page.getByTestId('btn-consent-agree')
      if (await agreeBtn.isVisible().catch(() => false)) {
        await agreeBtn.click()
        await page.waitForURL(/\/research\/student\/progress/, { timeout: 10_000 })
      }

      // dev seed 호출 — 서버가 in-memory store에 평가 주입 후 결과 페이지로 redirect.
      await page.goto(`/api/dev/seed-speaking-result?mt=${c.motherTongue}`)
      await page.waitForURL(/\/student\/speaking\/.*\/result/, { timeout: 10_000 })

      // 총평 본문(한국어) 확인 — 모든 케이스에 한국어가 우선 노출
      const koHeader = page.getByText('훌륭합니다!').first()
      await expect(koHeader).toBeVisible({ timeout: 10_000 })

      if (c.motherTongue === 'ko') {
        // ko: 보조 카드(MultilingualFeedback) 자체가 DOM에 없음 — return null
        const aux = page.getByTestId('q1-multilingual-feedback')
        await expect(aux).toHaveCount(0)
      } else {
        // en/vi/ar: 보조 카드가 마운트되고, mother_tongue 텍스트가 포함
        const aux = page.getByTestId('q1-multilingual-feedback')
        await expect(aux).toBeVisible({ timeout: 10_000 })
        if (c.expectedSupplementSubstring) {
          await expect(aux).toContainText(c.expectedSupplementSubstring)
        }
        // ar의 경우 dir="rtl"로 셋팅된 내부 컨테이너 존재
        if (c.motherTongue === 'ar') {
          const rtlEl = aux.locator('[dir="rtl"]').first()
          await expect(rtlEl).toBeVisible()
        }
      }

      // 스크린샷
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/q1-result-${c.participantCode}-${c.motherTongue}.png`,
        fullPage: true,
      })

      // PDF 다운로드
      const downloadPromise = page.waitForEvent('download', { timeout: 30_000 })
      const btn = page.getByTestId('pdf-download-button').first()
      await expect(btn).toBeVisible()
      await btn.click()
      const download = await downloadPromise
      const pdfPath = `${PDF_DIR}/q1-result-${c.participantCode}-${c.motherTongue}.pdf`
      const size = await saveDownload(download, pdfPath)
      const buf = readFileSync(pdfPath)
      expect(buf.subarray(0, 5).toString('ascii')).toBe('%PDF-')
      expect(size).toBeGreaterThan(5000)
      console.log(`[PDF] ${c.participantCode} (${c.motherTongue}) → ${pdfPath} (${size} bytes)`)
    })
  }
})
