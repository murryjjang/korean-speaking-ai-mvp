#!/usr/bin/env node
// 단계 19.9 페이즈 3 [PDF-검증]: 생성된 PDF를 PNG로 렌더해 시각 확인 가능하게.
// Puppeteer-core로 PDF 파일을 Chrome에 띄워 첫 페이지 screenshot.

import puppeteer from 'puppeteer-core'
import fs from 'node:fs/promises'

const CHROME = '/home/murry/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome'
const PDFS_DIR = '/tmp/단계19.9/pdfs'
const PNG_DIR = '/tmp/단계19.9/pdfs-as-png'
await fs.mkdir(PNG_DIR, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'shell',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--enable-features=PDFViewerUpdate',
  ],
})

const files = (await fs.readdir(PDFS_DIR)).filter((f) => f.endsWith('.pdf'))
for (const f of files) {
  const lang = f.match(/pdf-smoke-(\w+)\.pdf/)?.[1]
  if (!lang) continue
  const page = await browser.newPage()
  await page.setViewport({ width: 800, height: 1100, deviceScaleFactor: 2 })
  // file:// URL로 PDF 로드 — Chrome native PDF viewer가 렌더.
  const url = `file://${PDFS_DIR}/${f}`
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30_000 })
  // PDF 뷰어 로드 시간 대기
  await new Promise((r) => setTimeout(r, 1500))
  const outPath = `${PNG_DIR}/${lang}.png`
  await page.screenshot({ path: outPath, fullPage: false })
  console.log(`${lang}: ${outPath}`)
  await page.close()
}

await browser.close()
console.log('Done')
