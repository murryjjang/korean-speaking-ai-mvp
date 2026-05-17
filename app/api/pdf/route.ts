// v1.1 단계 19.9 [PDF-puppeteer]: 자체 완결 HTML → Puppeteer → PDF API.
//
// 클라이언트는 PdfDownloadButton에서 렌더된 DOM의 outerHTML + 페이지 head의
// 스타일시트·폰트 링크를 모아 self-contained HTML 문서를 POST. 본 라우트는
// 그 HTML을 Chrome headless로 띄워 PDF로 변환해 반환한다.
//
// 단계 19.5~19.8 html2canvas 4연속 실패의 근본 해결 — Chrome shaping engine을
// 거친 결과를 PDF에 박는다 (아랍어·태국어·크메르어 연결형 정상).

import { NextResponse } from 'next/server'

import { renderHtmlToPdf } from '@/src/lib/pdf/puppeteer-render'

// Edge runtime은 puppeteer-core를 지원하지 않음. Node 런타임 명시.
export const runtime = 'nodejs'
// PDF 생성은 시간이 걸려 dynamic 처리 필요.
export const dynamic = 'force-dynamic'
// Vercel 함수 타임아웃 (60s) — 시험운영 ngrok 환경은 무영향.
export const maxDuration = 60

type PdfRequestBody = {
  html: string
  fileName?: string
}

function isPdfRequestBody(v: unknown): v is PdfRequestBody {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return typeof o.html === 'string' && o.html.length > 0
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!isPdfRequestBody(body)) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  // HTML 크기 제한 — 평균 페이지 500KB. 5MB 초과 시 거부 (실수·악용 방지).
  if (body.html.length > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'html_too_large' }, { status: 413 })
  }
  try {
    const pdfBuffer = await renderHtmlToPdf({ html: body.html })
    const fileName = body.fileName ?? 'document.pdf'
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'pdf_render_failed'
    console.error('[api/pdf] render failed:', message)
    return NextResponse.json({ error: 'pdf_render_failed', detail: message }, { status: 500 })
  }
}
