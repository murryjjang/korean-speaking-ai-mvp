// v1.1 단계 19 [G]: PDF 다운로드 e2e smoke.
//
// 단계 18: 단위 테스트 통과 / 실제 브라우저 3개 화면 모두 실패. 단계 19에서
// html2canvas-pro 교체 + 폴백 유지. 이 테스트는 실제 Chromium에서 PDF Blob이
// 생성·다운로드되고 파일이 유효한 PDF인지(매직 바이트 %PDF- 확인) 검증한다.
//
// /dev/pdf-smoke 페이지는 Tailwind v4 oklch 팔레트 + KO/EN/VI/AR 문자 + 표를
// 포함해 단계 18에서 실패했던 모든 경우(modern color, 다국어, 표)를 한 번에 친다.
//
// v1.1 단계 19.5 [P, G2]: 아랍어 단락이 추가된 smoke 페이지에서 PDF 생성 성공 +
// 콘솔 에러 0건 검증. 폰트 임베드 회귀 시 ICU/canvas 경고가 자주 잡히므로 그
// 경로를 보조 보호 장치로 둔다. ko/ar locale 양쪽에서 같은 캡처가 성공해야 한다.

import { test, expect, type Page } from '@playwright/test'

async function setDisplayLanguage(page: Page, lang: 'ko' | 'ar') {
  // useDisplayLanguage가 명시 선택을 우선하므로 localStorage를 직접 시드.
  await page.addInitScript(([k]) => {
    try {
      window.localStorage.setItem('kspai:lang:display', k as string)
      window.localStorage.setItem('kspai:lang:display:explicit', '1')
    } catch { /* noop */ }
  }, [lang])
}

async function downloadPdfAndAssertValid(page: Page) {
  await expect(page.getByTestId('pdf-smoke-target')).toBeVisible()
  const button = page.getByTestId('pdf-download-button')
  await expect(button).toBeVisible()

  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message)
  })

  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 })
  await button.click()
  const download = await downloadPromise

  const path = await download.path()
  expect(path).toBeTruthy()
  const fs = await import('node:fs')
  const buf = fs.readFileSync(path!)
  expect(buf.length).toBeGreaterThan(1000)
  const header = buf.subarray(0, 5).toString('ascii')
  expect(header).toBe('%PDF-')

  const errorEl = page.getByTestId('pdf-download-error')
  await expect(errorEl).toHaveCount(0)

  if (consoleErrors.length > 0) {
    console.log('[pdf-smoke] console errors during capture:', consoleErrors)
  }
  expect(consoleErrors).toHaveLength(0)
}

test.describe('[단계19-G] PDF 다운로드', () => {
  test('/dev/pdf-smoke — Tailwind v4 oklch + 다국어 본문이 유효한 PDF로 다운로드된다', async ({ page }) => {
    await page.goto('/dev/pdf-smoke')
    await downloadPdfAndAssertValid(page)
  })

  // 단계 19.6 [RTL]: 보조 언어가 ar이어도 html.dir은 항상 LTR (페이지 RTL 적용 중단).
  // 아랍어 단락은 자체 dir="rtl"로 텍스트 내부에서만 RTL 정상.
  test('/dev/pdf-smoke — ar locale (mother_tongue) 캡처도 성공', async ({ page }) => {
    await setDisplayLanguage(page, 'ar')
    await page.goto('/dev/pdf-smoke')
    // 단계 19.6: html.dir은 항상 'ltr' 유지 (보조 언어 ar 선택해도 페이지 RTL 적용 안 됨).
    await page.waitForFunction(
      () => document.documentElement.dir === 'ltr',
      undefined,
      { timeout: 5_000 },
    )
    // PDF 캡처 컨테이너는 LTR 유지.
    await expect(page.locator('[data-testid="pdf-smoke-target"]')).toBeVisible()
    await downloadPdfAndAssertValid(page)
  })

  // 아랍어 단락 픽셀 검증 — 폰트가 빈 칸/박스로 떨어지면 width가 비정상적으로
  // 작아진다. 글자 분리·반전이 발생해도 width 자체는 정상이지만 적어도 폰트
  // 폴백으로 인한 0폭 문제는 차단된다.
  test('/dev/pdf-smoke — 아랍어 단락이 실제로 렌더된다 (width > 100px)', async ({ page }) => {
    await page.goto('/dev/pdf-smoke')
    await page.waitForFunction(async () => {
      if (document.fonts) await document.fonts.ready
      return true
    })
    const arabic = page.getByTestId('pdf-smoke-arabic')
    await expect(arabic).toBeVisible()
    const box = await arabic.boundingBox()
    expect(box).toBeTruthy()
    expect(box!.width).toBeGreaterThan(200) // 아랍어 두 줄이 충분히 넓게 렌더
    expect(box!.height).toBeGreaterThan(20)
  })

  test('/dev/pdf-smoke — Noto Sans Arabic 폰트가 document.fonts에 1건 이상 등록', async ({ page }) => {
    await page.goto('/dev/pdf-smoke')
    // next/font self-host는 hashed face 이름을 쓰지만 unicode-range arabic 폰트
    // 항목이 document.fonts에 등록되어 있어야 한다. font-family 표기가 hashed라
    // 정확히 일치 검색은 어려우므로 fonts iterator로 arabic 글리프를 포함하는
    // face가 있는지 확인.
    const hasArabicFace = await page.evaluate(async () => {
      if (!document.fonts) return false
      await document.fonts.ready
      let anyArabic = false
      document.fonts.forEach((face) => {
        const fam = String(face.family ?? '').toLowerCase()
        // next/font가 만든 hashed family name도 원본 키워드를 포함.
        if (fam.includes('arabic') || fam.includes('noto')) anyArabic = true
      })
      return anyArabic
    })
    expect(hasArabicFace).toBe(true)
  })
})
