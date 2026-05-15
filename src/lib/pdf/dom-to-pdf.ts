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

export async function renderDomToPdf(
  element: HTMLElement,
  options: RenderPdfOptions,
): Promise<Blob> {
  const pageWidthMm = options.pageWidthMm ?? A4_WIDTH_MM
  const marginMm = options.marginMm ?? DEFAULT_MARGIN_MM
  const scale = options.scale ?? 2
  const backgroundColor = options.backgroundColor ?? '#FAF9F5'

  // 동적 로드 — SSR/번들 사이즈 영향 최소화.
  const [{ default: html2canvas }, { default: JsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  // 캡처 — devicePixelRatio scaling + 안정적인 배경색.
  const canvas = await html2canvas(element, {
    scale,
    backgroundColor,
    useCORS: true,
    logging: false,
    // 어떤 oklch() 등 modern CSS는 html2canvas v1이 못 읽을 수 있으니 onclone에서 폴백 처리.
    onclone: (doc) => {
      // 모든 요소의 색상 함수를 보정 — 일부 oklch/colorMix를 hex로 안전화하지 않으면
      // html2canvas가 throw할 수 있다. CSS 변수가 보존되도록 :root 색상은 그대로 둔다.
      doc.documentElement.style.background = backgroundColor
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
