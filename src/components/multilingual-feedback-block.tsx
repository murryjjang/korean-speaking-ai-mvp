'use client'

// v1.1 16-10-5: 다국어 학습자 피드백 블록 — 단계 18부터 헤더 단일 토글 정책.
//
// 다국어 피드백(`feedback_multilingual.{ko,en,vi,ar}`)이 있으면 토글로 즉시 전환.
// 없으면 단일 ko 텍스트만 표시.
//
// 단계 18 [D8]: 본문 내 인라인 토글은 기본 비활성화. 헤더의
// DisplayLanguageToggle이 표시 언어를 결정한다. showToggle을 명시적으로 true로
// 넘기는 호출부가 있을 때만 호환 모드로 인라인 토글을 노출한다 (점진 제거 대상).

import { useDisplayLanguage } from '@/src/hooks/use-display-language'
import { DisplayLanguageToggle } from '@/src/components/ui/display-language-toggle'
import { pickText, type MultilingualText } from '@/src/lib/i18n/display-language'

export function MultilingualFeedbackBlock({
  feedbackKo,
  multilingual,
  motherTongueHint,
  className,
  showToggle = false,
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

  // v1.1 단계 19.5 [D10]: emphasize 시각 표지 — 같은 헤더 토글이 모든 영역에
  // 일관된 강조 상태를 부여하는지 e2e/단위에서 검증 가능하도록 data-emphasized
  // 마커를 부착한다. lang === 'ko' 또는 다국어 데이터가 없으면 ko가 강조.
  const emphasizedLang = hasMultilingual ? lang : 'ko'

  return (
    <div
      className={className}
      data-bilingual-mode="emphasize"
      data-emphasized-lang={emphasizedLang}
    >
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
