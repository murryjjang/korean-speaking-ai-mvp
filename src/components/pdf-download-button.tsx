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
      // 폰트 로딩 안정화 — 한국어·아랍어 폰트 비동기 로딩이 끝난 후 캡처해야
      // 첫 페이지에서 텍스트가 비어 보이지 않는다.
      //
      // v1.1 단계 19.5 [P]: next/font로 self-host된 Noto Sans Arabic은 페이지에
      // 사용되는 시점에 lazy 로드된다. 캡처 대상 안에 lang="ar" 요소가 있으면
      // 그 요소가 실제 페이지에 마운트되어 있어야 폰트 로드가 트리거되므로,
      // beforeCapture 후 한 번 더 fonts.ready를 기다린다.
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
