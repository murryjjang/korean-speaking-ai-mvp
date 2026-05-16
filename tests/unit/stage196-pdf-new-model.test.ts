// v1.1 단계 19.6 [PDF]: 새 콘텐츠 모델(한국어 본문 + 보조 작은 글씨)이 PDF
// 캡처 대상에도 동일하게 적용되는지 + 단계 19.5 [P.1, P.2] 보호 마커 유지.
//
// 페이즈 2 변경으로 BilingualText/MultilingualFeedback이 한국어 본문 + 보조
// supplement 단일 모델을 갖게 되었고, PDF 캡처는 같은 DOM을 그대로 렌더하므로
// 별도 PDF 전용 변경 없이 새 모델이 반영된다. 회귀 보호.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf-8')
}

describe('[단계19.6-PDF] 캡처 컨테이너 LTR 유지 + Noto Sans Arabic 임베드 (P.1, P.2 회귀 보호)', () => {
  it('자유 대화 캡처: data-keep-ltr + dir="ltr"', () => {
    const src = read('app/student/conversation-practice/free-conversation-client.tsx')
    expect(src).toMatch(/ref=\{pdfSectionRef\}[\s\S]{0,200}data-keep-ltr/)
    expect(src).toMatch(/ref=\{pdfSectionRef\}[\s\S]{0,200}dir="ltr"/)
  })

  it('평가 결과 캡처: data-keep-ltr + dir="ltr"', () => {
    const src = read('app/student/speaking/[questionId]/result/page.tsx')
    expect(src).toMatch(/id="speaking-result-pdf-target"[\s\S]{0,300}data-keep-ltr/)
    expect(src).toMatch(/id="speaking-result-pdf-target"[\s\S]{0,300}dir="ltr"/)
  })

  it('학습 진척 캡처: data-keep-ltr + dir="ltr"', () => {
    const src = read('app/research/student/progress/page.tsx')
    expect(src).toMatch(/id="research-progress-pdf-target"[\s\S]{0,300}data-keep-ltr/)
    expect(src).toMatch(/id="research-progress-pdf-target"[\s\S]{0,300}dir="ltr"/)
  })

  it('Noto Sans Arabic next/font self-host 유지', () => {
    const layout = read('app/layout.tsx')
    expect(layout).toMatch(/Noto_Sans_Arabic/)
    expect(layout).toMatch(/subsets:\s*\[['"]arabic['"]\]/)
    expect(layout).toMatch(/notoSansArabic\.variable/)
  })

  it('globals.css: lang(ar)/dir(rtl)에 Noto Sans Arabic 우선', () => {
    const css = read('app/globals.css')
    expect(css).toMatch(/--font-noto-sans-arabic|Noto Sans Arabic/)
    expect(css).toMatch(/\[data-keep-ltr\][\s\S]{0,200}direction:\s*ltr/)
  })

  it('PdfDownloadButton: document.fonts.ready 대기', () => {
    const btn = read('src/components/pdf-download-button.tsx')
    expect(btn).toMatch(/document\.fonts\.ready/)
  })
})

describe('[단계19.6-PDF] 새 모델 — PDF 캡처 대상 안의 BilingualText 동작', () => {
  it('자유 대화 요약 카드가 PDF 캡처 안에서 BilingualText 렌더', () => {
    const src = read('app/student/conversation-practice/free-conversation-client.tsx')
    // pdfSectionRef 영역 시작 인덱스 이후로 BilingualText 등장
    const refIdx = src.indexOf('ref={pdfSectionRef}')
    expect(refIdx).toBeGreaterThan(0)
    const after = src.slice(refIdx)
    expect(after).toMatch(/<BilingualText[\s\S]{0,500}testId="summary-ko"/)
  })

  it('보조 영역 RTL 처리는 텍스트 컨테이너 내부 한정 (페이지 LTR 유지)', () => {
    const bt = read('src/components/ui/bilingual-text.tsx')
    expect(bt).toMatch(/unicodeBidi:\s*['"]plaintext['"]/)
    expect(bt).toMatch(/textAlign:\s*['"]start['"]/)
  })
})
