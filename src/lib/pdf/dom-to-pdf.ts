// v1.1 단계 26: DOM → 다국어 PDF (html2canvas + jsPDF).
//
// 폰트 임베드 대신 브라우저가 렌더한 결과를 그대로 캡처하기 때문에
// KO/EN/VI/AR 모두 자동 처리되고, 아랍어 RTL·연결 글자도 신경 쓸 필요가 없다.
// 대신 PDF는 이미지 기반이라 텍스트 선택은 불가하다 — 학습자 보관·공유용 목적.
//
// 사용:
//   const pdfBlob = await renderDomToPdf(element, { fileName: 'session.pdf' })
//   downloadBlob(pdfBlob, 'session.pdf')
//
// 호출 측은 항상 클라이언트('use client') 컴포넌트에서만 사용한다.
//
// v1.1 단계 18 [G]: Tailwind v4 기본 팔레트가 oklch()를 사용하기 때문에
// html2canvas v1.4.1이 색 파싱에 실패해 PDF 생성이 전체적으로 깨졌다. 캡처
// 직전 onclone 훅에서 모든 요소의 색 관련 computed style을 rgb()로 인라인
// 오버라이드해 우회했지만, 단계 19에서 운영 검증 결과 3개 화면 모두 여전히
// 실패 — getComputedStyle 폴백이 일부 속성에서 oklch를 잡지 못했다.
//
// v1.1 단계 19 [G]: html2canvas-pro로 교체. v1.4.1의 modern fork로 oklch/lab/
// color-mix/color()를 네이티브 파싱. 폴백 `inlineUnsupportedColors`는 belt-
// and-suspenders로 유지 (호스트 브라우저가 modern color를 안 지원하는 경우 대비).

export type RenderPdfOptions = {
  fileName: string
  /** 인쇄 영역 폭 (mm, 기본 A4=210). */
  pageWidthMm?: number
  /** 위·아래 여백 (mm). */
  marginMm?: number
  /** 캡처 해상도 배율 (기본 2 = 200%). */
  scale?: number
  /** 캡처 시 적용할 배경색. 투명 배경 PDF는 인쇄·뷰어에서 보이지 않을 수 있어 명시 권장. */
  backgroundColor?: string
}

const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297
const DEFAULT_MARGIN_MM = 12

// 컬러 표현을 포함할 수 있는 컴퓨티드 스타일 프로퍼티.
// border 가족과 outline, text-decoration 색까지 포함해 가능한 한 모든 oklch 사용처를 잡는다.
const COLOR_STYLE_PROPS = [
  'color',
  'backgroundColor',
  'borderColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'outlineColor',
  'textDecorationColor',
  'caretColor',
  'fill',
  'stroke',
] as const

/** v1.1 단계 18 [G]: html2canvas v1.4.1이 거부하는 색 함수 식별. 테스트 노출. */
export const UNSUPPORTED_COLOR_FN = /\b(oklch|oklab|lab|lch|color-mix|color)\s*\(/i

/**
 * canvas 2D fillStyle 파서를 이용해 어떤 CSS 색 값이든 rgb()/rgba() 형식으로 변환.
 * 브라우저(Chrome 111+, Safari 15.4+)가 oklch·color-mix 등을 이미 지원하므로
 * fillStyle을 통해 정규화된 rgb 문자열을 얻을 수 있다. 파싱 실패 시 null 반환.
 */
export function toBrowserRgb(value: string, ctx: CanvasRenderingContext2D): string | null {
  try {
    ctx.fillStyle = '#000000' // reset
    ctx.fillStyle = value
    const out = ctx.fillStyle
    if (typeof out !== 'string') return null
    // 변환 성공 시 fillStyle은 '#hhhhhh' 또는 'rgba(...)'를 반환.
    return out
  } catch {
    return null
  }
}

/**
 * 캡처 대상 클론 문서의 모든 요소에 대해 oklch/lab/color-mix를 rgb 인라인 스타일로 치환.
 * Tailwind v4 기본 팔레트가 oklch를 쓰기 때문에 한 곳이라도 잡지 못하면 html2canvas가 throw.
 */
export function inlineUnsupportedColors(doc: Document): void {
  // 색 정규화에 사용할 임시 2D 컨텍스트 — onclone 안에서 1개만 생성.
  const probe = doc.createElement('canvas').getContext('2d')
  if (!probe) return

  const all = doc.querySelectorAll<HTMLElement>('*')
  for (const el of Array.from(all)) {
    const computed = doc.defaultView?.getComputedStyle(el)
    if (!computed) continue
    for (const prop of COLOR_STYLE_PROPS) {
      const raw = computed[prop as keyof CSSStyleDeclaration] as string | undefined
      if (typeof raw !== 'string' || !raw) continue
      if (!UNSUPPORTED_COLOR_FN.test(raw)) continue
      const rgb = toBrowserRgb(raw, probe)
      if (!rgb) continue
      // 인라인 스타일 우선순위가 가장 높으므로 클론에만 적용해도 안전.
      const styleProp = prop as keyof CSSStyleDeclaration
      // setProperty가 카멜케이스를 받아들이지 않는 브라우저가 있어 element.style[...] 사용.
      ;(el.style as unknown as Record<string, string>)[styleProp as string] = rgb
    }
  }
}

export async function renderDomToPdf(
  element: HTMLElement,
  options: RenderPdfOptions,
): Promise<Blob> {
  const pageWidthMm = options.pageWidthMm ?? A4_WIDTH_MM
  const marginMm = options.marginMm ?? DEFAULT_MARGIN_MM
  const scale = options.scale ?? 2
  const backgroundColor = options.backgroundColor ?? '#FAF9F5'

  // 동적 로드 — SSR/번들 사이즈 영향 최소화.
  // 단계 19: html2canvas-pro (modern fork)로 교체. oklch/lab/color-mix 네이티브 지원.
  const [{ default: html2canvas }, { default: JsPDF }] = await Promise.all([
    import('html2canvas-pro'),
    import('jspdf'),
  ])

  // 캡처 — devicePixelRatio scaling + 안정적인 배경색.
  const canvas = await html2canvas(element, {
    scale,
    backgroundColor,
    useCORS: true,
    logging: false,
    // html2canvas-pro가 modern CSS color를 직접 처리하지만, 그래도 일부 환경
    // (구 브라우저, 비표준 폴리필) 대비 보조 폴백을 둔다.
    onclone: (doc) => {
      doc.documentElement.style.background = backgroundColor
      inlineUnsupportedColors(doc)
    },
  })

  const imgWidthMm = pageWidthMm - marginMm * 2
  const pxPerMm = canvas.width / imgWidthMm
  const pageHeightMm = A4_HEIGHT_MM
  const printableHeightMm = pageHeightMm - marginMm * 2
  const printableHeightPx = printableHeightMm * pxPerMm

  const pdf = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

  // 캡처된 캔버스를 페이지 높이로 잘라 여러 페이지에 나눠 붙인다.
  let yOffsetPx = 0
  let firstPage = true
  while (yOffsetPx < canvas.height) {
    const sliceHeightPx = Math.min(printableHeightPx, canvas.height - yOffsetPx)
    const slice = document.createElement('canvas')
    slice.width = canvas.width
    slice.height = sliceHeightPx
    const ctx = slice.getContext('2d')
    if (!ctx) throw new Error('pdf_slice_context_failed')
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, slice.width, slice.height)
    ctx.drawImage(canvas, 0, -yOffsetPx)

    const dataUrl = slice.toDataURL('image/jpeg', 0.92)
    const sliceHeightMm = sliceHeightPx / pxPerMm

    if (!firstPage) pdf.addPage()
    pdf.addImage(dataUrl, 'JPEG', marginMm, marginMm, imgWidthMm, sliceHeightMm)

    firstPage = false
    yOffsetPx += sliceHeightPx
  }

  // jsPDF v4: output('blob')은 Blob 반환.
  const blob = pdf.output('blob')
  // 파일명을 metadata 또는 다운로드 헬퍼에서 사용.
  return new Blob([blob], { type: 'application/pdf' })
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // 일부 브라우저는 click 직후 revoke 시 다운로드가 실패할 수 있어 한 틱 미룬다.
  setTimeout(() => URL.revokeObjectURL(url), 100)
}
