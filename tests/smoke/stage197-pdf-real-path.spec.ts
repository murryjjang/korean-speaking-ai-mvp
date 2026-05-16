// v1.1 단계 19.7 [PDF 실제 사용자 경로 검증].
//
// 단계 19.5·19.6의 PDF 검증은 URL `?locale=` 또는 localStorage 시드로 우회했을
// 가능성이 높다. 19.7에서 localStorage 우선순위가 제거됐으므로, 검증도 실제
// 사용자 경로(로그인 → 페이지 → PDF 다운로드)를 따라야 한다.
//
// 사전 조건: scripts/seed-stage197-participants.ts로 P040~P043 발급 + 모두 동의 완료.
// 첫 실행 시 동의 후 progress 페이지에서 PDF 다운로드. 이후 실행도 멱등.

import { test, expect, type Page, type Download } from '@playwright/test'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resetParticipantConsent } from './_helpers/research-seed'

type Case = {
  participantCode: string
  pin: string
  motherTongue: 'ko' | 'en' | 'vi' | 'ar'
}

const CASES: Case[] = [
  { participantCode: 'P040', pin: '1040', motherTongue: 'ko' },
  { participantCode: 'P041', pin: '1041', motherTongue: 'en' },
  { participantCode: 'P042', pin: '1042', motherTongue: 'vi' },
  { participantCode: 'P043', pin: '1043', motherTongue: 'ar' },
]

const PDF_DIR = '/tmp/단계19.7/pdfs'
mkdirSync(PDF_DIR, { recursive: true })

async function loginAndConsent(page: Page, code: string, pin: string): Promise<void> {
  await page.goto('/research/login')
  await page.getByTestId('input-participant-code').fill(code)
  await page.getByTestId('input-participant-pin').fill(pin)
  await page.getByTestId('btn-research-login').click()
  await page.waitForURL(/\/research\/(consent|student\/progress)/, { timeout: 10_000 })
  if (page.url().includes('/research/consent')) {
    await page.getByTestId('btn-consent-agree').click()
    await page.waitForURL(/\/research\/student\/progress/, { timeout: 10_000 })
  }
}

async function saveDownload(download: Download, savePath: string): Promise<number> {
  const tempPath = await download.path()
  if (!tempPath) throw new Error('download path missing')
  const buf = readFileSync(tempPath)
  writeFileSync(savePath, buf)
  return buf.length
}

test.describe('[단계19.7-PDF] 실제 사용자 경로 — 4 mother_tongue × 학습 진척 PDF', () => {
  for (const c of CASES) {
    test(`${c.participantCode} (mother_tongue=${c.motherTongue}) — 로그인 → 진척 페이지 → PDF 다운로드`, async ({ page }) => {
      // 멱등성 — 매 테스트마다 consent_status를 false로 리셋.
      await resetParticipantConsent(c.participantCode)
      await loginAndConsent(page, c.participantCode, c.pin)

      // 진척 페이지가 표시되어야 함
      await expect(page.getByTestId('research-student-progress')).toBeVisible()

      const downloadPromise = page.waitForEvent('download', { timeout: 30_000 })
      // 진척 페이지의 PDF 다운로드 버튼 클릭
      const btn = page.getByTestId('pdf-download-button').first()
      await expect(btn).toBeVisible()
      await btn.click()
      const download = await downloadPromise

      const savePath = `${PDF_DIR}/progress-${c.participantCode}-${c.motherTongue}.pdf`
      const size = await saveDownload(download, savePath)

      // PDF 매직 바이트 + 최소 크기 검증
      const buf = readFileSync(savePath)
      expect(buf.subarray(0, 5).toString('ascii')).toBe('%PDF-')
      expect(size).toBeGreaterThan(5000)

      console.log(`[PDF] ${c.participantCode} (${c.motherTongue}) → ${savePath} (${size} bytes)`)
    })
  }
})

test.describe('[단계19.7-PDF-아랍어] /dev/pdf-smoke 폰트 임베드 + 워밍업 검증', () => {
  test('아랍어 단락 포함 PDF 생성 + 콘솔 에러 0건', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
    page.on('pageerror', (err) => consoleErrors.push(err.message))

    await page.goto('/dev/pdf-smoke')
    await page.waitForFunction(async () => { if (document.fonts) await document.fonts.ready; return true })

    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 })
    await page.getByTestId('pdf-download-button').click()
    const download = await downloadPromise

    const savePath = `${PDF_DIR}/dev-pdf-smoke-arabic.pdf`
    const size = await saveDownload(download, savePath)
    expect(size).toBeGreaterThan(5000)

    const buf = readFileSync(savePath)
    expect(buf.subarray(0, 5).toString('ascii')).toBe('%PDF-')
    expect(consoleErrors).toHaveLength(0)

    console.log(`[PDF] dev-pdf-smoke-arabic → ${savePath} (${size} bytes)`)
  })
})
