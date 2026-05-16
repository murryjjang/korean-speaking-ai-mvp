// v1.1 단계 19.5 [P.1, P.2]: PDF 아랍어 폰트 임베드 + 한국어 우정렬 차단.
//
// V1 검증에서 발견된 두 회귀:
//  - P.1: 아랍어 글자 분리·반전 (단어 단위 깨짐) — Pretendard에 아랍어 글리프 없음.
//  - P.2: locale=ar 시 한국어 본문까지 RTL 적용되어 마침표/괄호 위치가 우정렬.
//
// 정적 검사로 핵심 보호:
//  - app/layout.tsx: Noto Sans Arabic 폰트 link
//  - app/globals.css: :lang(ar)/dir="rtl"에 Noto Sans Arabic 우선 적용,
//    data-keep-ltr 마커는 강제 LTR.
//  - PDF 캡처 대상 컨테이너 3종: dir="ltr" + data-keep-ltr 명시.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const cwd = process.cwd()

function read(path: string): string {
  return readFileSync(join(cwd, path), 'utf-8')
}

describe('[단계19.5-P.1] Noto Sans Arabic 임베드', () => {
  const layout = read('app/layout.tsx')

  it('app/layout.tsx가 next/font로 Noto_Sans_Arabic self-host', () => {
    expect(layout).toMatch(/Noto_Sans_Arabic/)
    expect(layout).toMatch(/subsets:\s*\[['"]arabic['"]\]/)
  })

  it('html에 --font-noto-sans-arabic CSS 변수 적용', () => {
    expect(layout).toMatch(/notoSansArabic\.variable/)
    expect(layout).toMatch(/font-noto-sans-arabic|--font-noto-sans-arabic/)
  })

  const css = read('app/globals.css')

  it('globals.css가 :lang(ar)/[lang="ar"]/[dir="rtl"]에 Noto Sans Arabic 우선', () => {
    expect(css).toMatch(/:lang\(ar\)/)
    expect(css).toMatch(/\[lang="ar"\]/)
    expect(css).toMatch(/\[dir="rtl"\]/)
    // var(--font-noto-sans-arabic) 또는 'Noto Sans Arabic'이 우선
    expect(css).toMatch(/--font-noto-sans-arabic|Noto Sans Arabic/)
  })

  const pdfBtn = read('src/components/pdf-download-button.tsx')

  it('PDF 다운로드 버튼이 캡처 전 document.fonts.ready 대기', () => {
    expect(pdfBtn).toMatch(/document\.fonts\.ready/)
  })
})

describe('[단계19.5-P.2] PDF 캡처 컨테이너 LTR 강제', () => {
  const css = read('app/globals.css')

  it('data-keep-ltr 마커가 LTR 강제 + text-align:start', () => {
    expect(css).toMatch(/\[data-keep-ltr\][\s\S]{0,200}direction:\s*ltr/)
    expect(css).toMatch(/\[data-keep-ltr\][\s\S]{0,200}text-align:\s*start/)
  })

  it('자유 대화 요약 컨테이너에 data-keep-ltr + dir="ltr"', () => {
    const free = read('app/student/conversation-practice/free-conversation-client.tsx')
    expect(free).toMatch(/ref=\{pdfSectionRef\}[^>]*data-keep-ltr[^>]*dir="ltr"|ref=\{pdfSectionRef\}[^>]*dir="ltr"[^>]*data-keep-ltr/)
  })

  it('평가 결과 컨테이너에 data-keep-ltr + dir="ltr"', () => {
    const result = read('app/student/speaking/[questionId]/result/page.tsx')
    expect(result).toMatch(/id="speaking-result-pdf-target"[\s\S]{0,200}data-keep-ltr/)
    expect(result).toMatch(/id="speaking-result-pdf-target"[\s\S]{0,200}dir="ltr"/)
  })

  it('학습 진척 컨테이너에 data-keep-ltr + dir="ltr"', () => {
    const prog = read('app/research/student/progress/page.tsx')
    expect(prog).toMatch(/id="research-progress-pdf-target"[\s\S]{0,300}data-keep-ltr/)
    expect(prog).toMatch(/id="research-progress-pdf-target"[\s\S]{0,300}dir="ltr"/)
  })
})

describe('[단계19.5-P] /dev/pdf-smoke 아랍어 단락 노출', () => {
  it('smoke 페이지에 lang="ar"/dir="rtl" Arabic 단락 포함', () => {
    const smoke = read('app/dev/pdf-smoke/page.tsx')
    expect(smoke).toMatch(/lang="ar"/)
    expect(smoke).toMatch(/dir="rtl"/)
    // 시각 검증용 아랍어 문장
    expect(smoke).toMatch(/مرحب/)
  })
})
