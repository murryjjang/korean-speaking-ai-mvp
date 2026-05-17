'use client'

// v1.1 단계 19.9 [PDF-puppeteer]: PDF 다운로드 버튼 — 서버사이드 Chrome 렌더.
//
// 19.5~19.8까지 사용한 html2canvas/jsPDF 경로는 글자별 그리기 방식 때문에
// 아랍어 연결형 shaping이 4연속 실패. 19.9에서 다음 흐름으로 전면 교체:
//  1) 클라이언트: 캡처 대상 outerHTML + document.head의 stylesheet·font link를
//     수집해 self-contained HTML 문서를 조립
//  2) POST /api/pdf 로 전송
//  3) 서버: puppeteer-core로 Chrome headless 띄워 page.setContent → page.pdf
//  4) 클라이언트: 응답 PDF blob을 다운로드
//
// 결과: Chrome shaping engine을 거친 PDF — 한국어·아랍어·태국어·크메르어·말레이어
// 모두 정상 출력.

import { useState } from 'react'

type PdfDownloadButtonProps =
  | (CommonProps & { targetRef: React.RefObject<HTMLElement | null>; targetId?: never })
  | (CommonProps & { targetId: string; targetRef?: never })

type CommonProps = {
  fileName: string
  label?: string
  className?: string
  disabled?: boolean
  beforeCapture?: () => void | Promise<void>
  afterCapture?: () => void | Promise<void>
}

// document.head에서 외부 스타일시트·인라인 스타일·폰트 link만 수집한다.
// next/font preload 등 응답 PDF에 불필요한 요소는 그대로 둬도 무해 (Puppeteer
// 측에서 추가 fetch만 발생, 렌더에 사용되지 않음).
function collectHeadStyles(): string {
  const parts: string[] = []
  const origin = window.location.origin
  for (const el of Array.from(document.head.querySelectorAll('link[rel="stylesheet"], style, link[rel="preload"][as="font"]'))) {
    if (el.tagName === 'LINK') {
      const link = el as HTMLLinkElement
      // 상대 경로는 절대화 — Puppeteer는 about:blank 같은 context에서 fetch.
      const href = link.href || link.getAttribute('href') || ''
      if (!href) continue
      const abs = href.startsWith('http') ? href : new URL(href, origin).toString()
      const rel = link.rel || 'stylesheet'
      const as = link.getAttribute('as')
      const type = link.getAttribute('type')
      const crossorigin = link.getAttribute('crossorigin')
      parts.push(
        `<link rel="${rel}" href="${abs}"${as ? ` as="${as}"` : ''}${type ? ` type="${type}"` : ''}${crossorigin !== null ? ` crossorigin="${crossorigin}"` : ''} />`,
      )
    } else {
      parts.push(el.outerHTML)
    }
  }
  return parts.join('\n')
}

function buildSelfContainedHtml(targetEl: HTMLElement): string {
  const html = document.documentElement
  const lang = html.lang || 'ko'
  const dir = html.dir || 'ltr'
  const headStyles = collectHeadStyles()
  // PDF 전용 CSS: 페이지 여백·인쇄 친화 본문 폭·다국어 폰트 폴백.
  // Pretendard·Noto Sans Arabic/Thai/Khmer를 안전망으로 명시 (next/font가 로드 못
  // 한 경우 대비). text-rendering optimizeLegibility로 ligature/shaping 품질 향상.
  const printCss = `
    @page { size: A4; margin: 12mm; }
    html, body {
      background: #FAF9F5 !important;
      color: #1f2937;
      font-family: "Pretendard", "Noto Sans KR", "Noto Sans Arabic", "Noto Sans Thai",
                   "Noto Sans Khmer", "Noto Sans", "Helvetica Neue", Arial, sans-serif;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }
    [lang="ar"], [dir="rtl"] { font-family: "Noto Sans Arabic", "Pretendard", sans-serif; }
    [lang="th"] { font-family: "Noto Sans Thai", "Pretendard", sans-serif; }
    [lang="km"] { font-family: "Noto Sans Khmer", "Pretendard", sans-serif; }
    /* PDF에선 hover/focus 상태가 무의미 — 인쇄용 그림자 제거. */
    * { box-shadow: none !important; transition: none !important; }
    button { display: none !important; }
    [data-pdf-hide="1"] { display: none !important; }
  `
  // 폰트 안전망 — Google Fonts CDN (Puppeteer 서버사이드라 jsdelivr·Google
  // 모두 외부 접근. networkidle0로 로드 대기.)
  const fontLinks = `
    <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700&display=swap" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;600;700&display=swap" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Khmer:wght@400;600;700&display=swap" rel="stylesheet" />
  `
  // 캡처 대상 outerHTML — Tailwind 유틸리티 클래스는 위 stylesheet link로 해석.
  const body = targetEl.outerHTML
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width" />
${headStyles}
${fontLinks}
<style>${printCss}</style>
</head>
<body>
${body}
</body>
</html>`
}

async function downloadPdfViaApi(targetEl: HTMLElement, fileName: string): Promise<void> {
  const html = buildSelfContainedHtml(targetEl)
  const res = await fetch('/api/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, fileName }),
  })
  if (!res.ok) {
    let detail = ''
    try {
      const j = await res.json()
      detail = j?.detail ?? j?.error ?? ''
    } catch { /* noop */ }
    throw new Error(`pdf_api_failed: ${res.status} ${detail}`)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

export function PdfDownloadButton(props: PdfDownloadButtonProps) {
  const {
    fileName,
    label = 'PDF 다운로드',
    className,
    disabled = false,
    beforeCapture,
    afterCapture,
  } = props
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    if (busy || disabled) return
    setError(null)
    setBusy(true)
    try {
      const el = 'targetRef' in props && props.targetRef
        ? props.targetRef.current
        : 'targetId' in props && props.targetId
          ? document.getElementById(props.targetId)
          : null
      if (!el) throw new Error('pdf_target_missing')
      if (beforeCapture) await beforeCapture()
      // v1.1 단계 19.9: Puppeteer 서버사이드 렌더링으로 전환.
      await downloadPdfViaApi(el, fileName)
    } catch (err) {
      console.error('[pdf-download] failed:', err)
      setError('PDF 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      if (afterCapture) {
        try { await afterCapture() } catch { /* noop */ }
      }
      setBusy(false)
    }
  }

  return (
    <div className={className} data-testid="pdf-download-button-wrapper">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy || disabled}
        aria-busy={busy}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-surface text-sm text-text-secondary font-medium px-4 py-2 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
        data-testid="pdf-download-button"
      >
        {busy && (
          <span
            className="inline-block w-3 h-3 border-2 border-text-muted border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
        )}
        {busy ? '준비 중…' : `📄 ${label}`}
      </button>
      {error && (
        <p className="mt-1 text-xs text-red-600" data-testid="pdf-download-error">
          {error}
        </p>
      )}
    </div>
  )
}
