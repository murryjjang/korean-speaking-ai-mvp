// v1.1 단계 19.9 [PDF-puppeteer]: html2canvas → Puppeteer 전면 교체 회귀 보호.
//
// 19.5~19.8 4연속 실패 패턴(아랍어 글자 분리)의 근본 해결로 PDF 생성을
// 서버사이드 Chrome headless로 옮겼다. 본 스펙은 마이그레이션 보호 마커를
// 정적 검증한다.

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const cwd = process.cwd()
function read(p: string): string {
  return readFileSync(join(cwd, p), 'utf-8')
}

describe('[단계19.9-PDF] Puppeteer 전면 교체', () => {
  it('서버사이드 렌더 모듈 존재 — src/lib/pdf/puppeteer-render.ts', () => {
    expect(existsSync(join(cwd, 'src/lib/pdf/puppeteer-render.ts'))).toBe(true)
  })

  it('PDF API 엔드포인트 존재 — app/api/pdf/route.ts (node runtime)', () => {
    expect(existsSync(join(cwd, 'app/api/pdf/route.ts'))).toBe(true)
    const src = read('app/api/pdf/route.ts')
    expect(src).toMatch(/runtime\s*=\s*['"]nodejs['"]/)
    expect(src).toMatch(/renderHtmlToPdf/)
  })

  it('puppeteer-core 의존성으로 등록', () => {
    const pkg = JSON.parse(read('package.json'))
    expect(pkg.dependencies['puppeteer-core']).toBeTruthy()
  })

  it('PdfDownloadButton이 /api/pdf POST로 전환', () => {
    const btn = read('src/components/pdf-download-button.tsx')
    expect(btn).toMatch(/\/api\/pdf/)
    expect(btn).toMatch(/method:\s*['"]POST['"]/)
    expect(btn).not.toMatch(/renderDomToPdf/)
    // html2canvas는 헤더 주석에서 역사 설명용으로만 등장, import/호출은 없어야 함.
    expect(btn).not.toMatch(/import[^;]*html2canvas/)
    expect(btn).not.toMatch(/from ['"]html2canvas/)
  })

  it('19.5~19.8 html2canvas 자산이 코드베이스에서 제거됨', () => {
    expect(existsSync(join(cwd, 'src/lib/pdf/dom-to-pdf.ts'))).toBe(false)
    const pkg = JSON.parse(read('package.json'))
    expect(pkg.dependencies['html2canvas']).toBeUndefined()
    expect(pkg.dependencies['html2canvas-pro']).toBeUndefined()
    expect(pkg.dependencies['jspdf']).toBeUndefined()
  })

  it('PDF 다운로드 3개 호출처 모두 PdfDownloadButton 사용 (마이그레이션 일관)', () => {
    const callers = [
      'app/research/student/progress/page.tsx',
      'app/student/conversation-practice/free-conversation-client.tsx',
      'app/student/speaking/[questionId]/result/page.tsx',
    ]
    for (const rel of callers) {
      const src = read(rel)
      expect(src).toMatch(/PdfDownloadButton/)
    }
  })
})
