// v1.1 단계 19.9 [PDF-puppeteer]: 서버사이드 Puppeteer로 PDF 생성.
//
// 단계 19.5~19.8 4연속 실패 원인: html2canvas는 글자별 그리기 방식이라 아랍어
// 연결형 shaping이 깨졌다. 폰트 임베드로는 해결 불가 — 폰트는 모양 데이터만
// 제공하고, 어떤 모양을 결합할지는 shaping engine이 결정.
//
// 19.9 해결: Chrome headless가 직접 PDF를 생성하면 Chrome 자체 shaping engine을
// 통과한 결과가 PDF에 박힌다. 한국어·아랍어·태국어·크메르어·말레이어 모두 정상.
//
// 실행 환경:
//  - WSL2/Linux 개발: Playwright가 설치한 Chromium 바이너리를 puppeteer-core로 재사용
//  - Vercel/Lambda 호환은 향후 별도 작업 (@sparticuz/chromium 등) — 19.9 범위 밖.

import { existsSync } from 'node:fs'

// Playwright 1217 기준 경로. Playwright 업데이트 시 바뀔 수 있어 후보 목록으로 보완.
const CHROME_CANDIDATES = [
  `${process.env.HOME ?? ''}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`,
  `${process.env.HOME ?? ''}/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`,
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
] as const

function resolveExecutablePath(): string {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH
  if (fromEnv && existsSync(fromEnv)) return fromEnv
  for (const p of CHROME_CANDIDATES) {
    if (p && existsSync(p)) return p
  }
  throw new Error(
    'puppeteer_chromium_not_found: install chromium or set PUPPETEER_EXECUTABLE_PATH',
  )
}

export type RenderHtmlToPdfOptions = {
  /** 자체 완결 HTML 문서 (<!doctype + html + head + body). */
  html: string
  /** 페이지 폭 (mm). 기본 A4 210. */
  pageWidthMm?: number
  /** 페이지 여백 (mm). 기본 12. */
  marginMm?: number
  /** 폰트·이미지 로드 타임아웃 (ms). 기본 30s. */
  timeoutMs?: number
}

export async function renderHtmlToPdf(opts: RenderHtmlToPdfOptions): Promise<Uint8Array> {
  // 동적 import — Edge runtime 회피 및 빌드 사이즈 절감.
  const puppeteer = (await import('puppeteer-core')).default
  const executablePath = resolveExecutablePath()
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--font-render-hinting=none',
      '--disable-dev-shm-usage',
    ],
  })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1024, height: 1400, deviceScaleFactor: 2 })
    await page.setContent(opts.html, {
      // page.setContent는 'networkidle0' 미지원. load + 추가 idle 대기.
      waitUntil: 'load',
      timeout: opts.timeoutMs ?? 30_000,
    })
    // setContent 후 외부 폰트·이미지가 로드될 시간을 준다.
    await page.evaluate(() => new Promise((r) => setTimeout(r, 800)))
    // 폰트 fetch 보장 — Pretendard·Noto Sans Arabic/Thai/Khmer 모두 외부 CDN.
    await page.evaluate(async () => {
      if (typeof document !== 'undefined' && document.fonts) {
        try {
          await (document.fonts as FontFaceSet).ready
        } catch {
          /* noop */
        }
      }
    })
    const marginMm = opts.marginMm ?? 12
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      margin: {
        top: `${marginMm}mm`,
        right: `${marginMm}mm`,
        bottom: `${marginMm}mm`,
        left: `${marginMm}mm`,
      },
    })
    return pdfBuffer
  } finally {
    await browser.close().catch(() => undefined)
  }
}
