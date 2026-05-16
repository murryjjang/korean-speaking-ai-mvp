'use client'

// v1.1 단계 19.6 [평가결과]: 학습자 피드백 인라인 블록 — 새 모델.
//
// 한국어 본문(text-sm) + (보조 언어 != ko이고 다국어 텍스트가 있으면) 작은 글씨
// 보조. 보조 언어 = ko 또는 다국어 데이터 없음 → 한국어만 단독 표시.

import { BilingualText } from '@/src/components/ui/bilingual-text'
import { type MultilingualText } from '@/src/lib/i18n/display-language'

export function MultilingualFeedbackBlock({
  feedbackKo,
  multilingual,
  motherTongueHint,
  className,
}: {
  feedbackKo: string
  multilingual?: MultilingualText | null
  motherTongueHint?: string | null
  className?: string
  /** @deprecated 19.6 새 모델에서 인라인 토글 제거. 헤더 토글이 단일 소스. */
  showToggle?: boolean
}) {
  return (
    <div
      className={
        'rounded-md bg-surface border border-border p-3 ' + (className ?? '')
      }
      data-testid="multilingual-feedback-block"
    >
      <BilingualText
        ko={feedbackKo}
        multilingual={multilingual ?? null}
        motherTongueHint={motherTongueHint}
      />
    </div>
  )
}
