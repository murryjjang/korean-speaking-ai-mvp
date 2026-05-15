'use client'

// v1.1 단계 26: PDF 다운로드 버튼 — DOM 요소를 캡처해 PDF로 저장.
//
// targetRef.current를 캡처하므로 캡처 대상 화면이 그대로 PDF로 변환된다.
// 학습자의 현재 표시 언어(localStorage)에 맞춰 보이는 그대로의 결과가 보관된다.

import { useState } from 'react'

export function PdfDownloadButton({
  targetRef,
  fileName,
  label = 'PDF 다운로드',
  className,
  disabled = false,
  beforeCapture,
  afterCapture,
}: {
  targetRef: React.RefObject<HTMLElement | null>
  fileName: string
  label?: string
  className?: string
  disabled?: boolean
  /** 캡처 직전 호출 — 임시로 펼치기/스크롤 정리 등에 사용. */
  beforeCapture?: () => void | Promise<void>
  /** 캡처 직후 호출 — beforeCapture에서 변경한 상태 복원. */
  afterCapture?: () => void | Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    if (busy || disabled) return
    setError(null)
    setBusy(true)
    try {
      const el = targetRef.current
      if (!el) throw new Error('pdf_target_missing')
      if (beforeCapture) await beforeCapture()
      // 폰트 로딩 안정화 — 한국어·아랍어 폰트 비동기 로딩이 끝난 후 캡처해야
      // 첫 페이지에서 텍스트가 비어 보이지 않는다.
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
