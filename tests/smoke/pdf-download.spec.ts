// v1.1 단계 19 [G]: PDF 다운로드 e2e smoke.
//
// 단계 18: 단위 테스트 통과 / 실제 브라우저 3개 화면 모두 실패. 단계 19에서
// html2canvas-pro 교체 + 폴백 유지. 이 테스트는 실제 Chromium에서 PDF Blob이
// 생성·다운로드되고 파일이 유효한 PDF인지(매직 바이트 %PDF- 확인) 검증한다.
//
// /dev/pdf-smoke 페이지는 Tailwind v4 oklch 팔레트 + KO/EN/VI/AR 문자 + 표를
// 포함해 단계 18에서 실패했던 모든 경우(modern color, 다국어, 표)를 한 번에 친다.

import { test, expect } from '@playwright/test'

test.describe('[단계19-G] PDF 다운로드', () => {
  test('/dev/pdf-smoke — Tailwind v4 oklch + 다국어 본문이 유효한 PDF로 다운로드된다', async ({ page }) => {
    await page.goto('/dev/pdf-smoke')

    // 캡처 영역과 버튼 노출 확인
    await expect(page.getByTestId('pdf-smoke-target')).toBeVisible()
    const button = page.getByTestId('pdf-download-button')
    await expect(button).toBeVisible()

    // 콘솔 에러 수집 — 캡처 중에 에러가 나면 표시
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('pageerror', (err) => {
      consoleErrors.push(err.message)
    })

    // 다운로드 가로채기
    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 })
    await button.click()
    const download = await downloadPromise

    // 파일 저장 후 매직 바이트(%PDF-) 확인
    const path = await download.path()
    expect(path).toBeTruthy()
    const fs = await import('node:fs')
    const buf = fs.readFileSync(path!)
    expect(buf.length).toBeGreaterThan(1000) // 최소 1KB
    const header = buf.subarray(0, 5).toString('ascii')
    expect(header).toBe('%PDF-')

    // PDF 생성 중 에러 0건 (PDF 생성 실패 메시지도 0건)
    const errorEl = page.getByTestId('pdf-download-error')
    await expect(errorEl).toHaveCount(0)

    if (consoleErrors.length > 0) {
      console.log('[pdf-smoke] console errors during capture:', consoleErrors)
    }
    expect(consoleErrors).toHaveLength(0)
  })
})
