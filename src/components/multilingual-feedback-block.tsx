'use client'

// v1.1 16-10-5: 다국어 학습자 피드백 블록 — DisplayLanguageToggle과 함께 사용.
//
// 다국어 피드백(`feedback_multilingual.{ko,en,vi,ar}`)이 있으면 토글로 즉시 전환.
// 없으면 단일 ko 텍스트만 표시.

import { useDisplayLanguage } from '@/src/hooks/use-display-language'
import { DisplayLanguageToggle } from '@/src/components/ui/display-language-toggle'
import { pickText, type MultilingualText } from '@/src/lib/i18n/display-language'

export function MultilingualFeedbackBlock({
  feedbackKo,
  multilingual,
  motherTongueHint,
  className,
  showToggle = true,
}: {
  feedbackKo: string
  multilingual?: MultilingualText | null
  motherTongueHint?: string | null
  className?: string
  showToggle?: boolean
}) {
  const { lang } = useDisplayLanguage(motherTongueHint)
  const hasMultilingual =
    !!multilingual && !!(multilingual.en || multilingual.vi || multilingual.ar)
  const displayText = hasMultilingual && multilingual
    ? pickText(multilingual, lang) || feedbackKo
    : feedbackKo
  const rtl = hasMultilingual && lang === 'ar'

  return (
    <div className={className}>
      {hasMultilingual && showToggle && (
        <div className="mb-2 flex justify-end">
          <DisplayLanguageToggle motherTongueHint={motherTongueHint} />
        </div>
      )}
      <p
        className="text-xs text-text-secondary bg-surface border border-border rounded-md p-3 leading-relaxed"
        dir={rtl ? 'rtl' : undefined}
        lang={hasMultilingual ? lang : 'ko'}
        style={rtl ? { unicodeBidi: 'plaintext', textAlign: 'start' } : undefined}
        data-testid="multilingual-feedback-block"
      >
        {displayText}
      </p>
    </div>
  )
}
