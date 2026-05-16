'use client'

// v1.1 단계 26: PDF 다운로드 버튼 — DOM 요소를 캡처해 PDF로 저장.
//
// targetRef.current를 캡처하므로 캡처 대상 화면이 그대로 PDF로 변환된다.
// 학습자의 현재 표시 언어(localStorage)에 맞춰 보이는 그대로의 결과가 보관된다.

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

      // v1.1 단계 19.7 [PDF-아랍어]: html2canvas-pro로 아랍어를 raster할 때 폰트가
      // swap 전이라 시스템 폴백으로 그려져 shaping이 깨지는 사례가 2단계(19.5·19.6)
      // 연속 발생. fonts.ready만으론 next/font의 lazy unicode-range fetch가 보장
      // 안 되므로, 캡처 대상에 lang="ar" 요소가 있으면 명시적으로 Noto Sans Arabic
      // 글꼴 로드를 강제(load API)한 뒤 fonts.ready로 마무리.
      const hasArabic = !!el.querySelector('[lang="ar"], [dir="rtl"]')
      if (hasArabic && document.fonts && typeof document.fonts.load === 'function') {
        try {
          // 임의의 아랍어 글리프를 사용해 폰트 fetch 트리거.
          await Promise.all([
            document.fonts.load('400 16px "Noto Sans Arabic"', 'الموافقة'),
            document.fonts.load('600 16px "Noto Sans Arabic"', 'الموافقة'),
          ])
        } catch { /* fonts.load 미지원 환경은 fonts.ready로 폴백 */ }
      }
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready
      }
      const { renderDomToPdf, downloadBlob } = await import('@/src/lib/pdf/dom-to-pdf')
      const blob = await renderDomToPdf(el, { fileName })
      downloadBlob(blob, fileName)
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
