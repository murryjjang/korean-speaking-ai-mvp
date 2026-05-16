'use client'

// 말하기 평가 결과 페이지(q1~q4)에서 정적 다국어 피드백을 보여주는 카드.
//
// 단계 19 [D8.1]: 헤더 단일 토글(useDisplayLanguage) 직접 구독. 단계 18은 legacy
// useLanguageHelper로 우회 동기화했지만 시연 중 라벨("영어 (ENGLISH)")과 콘텐츠
// (베트남어) 불일치 회귀가 발생. 단계 19에서는 다음 동작:
// - 헤더 토글이 'ko'면 카드 통째로 숨김 (모국어 한국어 학습자는 보조 언어 불필요).
// - 헤더 토글이 외국어면 그 언어의 데이터+라벨 일관 표시.

import { Card, CardHeader, CardBody } from './card'
import { useDisplayLanguage } from '@/src/hooks/use-display-language'
import {
  isRTL,
  L1_LABEL_KO,
  type FeedbackLanguage,
} from '@/src/lib/feedback-language'

export type MultilingualFeedbackData = {
  strengths: string[]
  nextSteps: string[]
}

interface Props {
  // 언어별 정적 피드백 (외부에서 모두 채워서 전달).
  vi: MultilingualFeedbackData
  en: MultilingualFeedbackData
  ar: MultilingualFeedbackData
  testId?: string
  title?: string
  description?: string
  /** 학습자 모국어 힌트 — 명시 선택이 없으면 이 언어로 자동 표시. */
  motherTongueHint?: string | null
}

export function MultilingualFeedback({
  vi,
  en,
  ar,
  testId,
  title = '모국어 피드백',
  description,
  motherTongueHint,
}: Props) {
  const { lang: displayLang } = useDisplayLanguage(motherTongueHint)

  // ko는 본문이 이미 한국어로 표시되므로 보조 카드 비표시.
  if (displayLang === 'ko') return null

  const lang: FeedbackLanguage = displayLang
  const data: Record<FeedbackLanguage, MultilingualFeedbackData> = { vi, en, ar }
  const current = data[lang]
  const dir = isRTL(lang) ? 'rtl' : 'ltr'

  return (
    <Card data-testid={testId} data-bilingual-mode="emphasize" data-emphasized="true">
      <CardHeader
        title={title}
        description={description ?? '한국어 평가 내용을 보조 언어로 안내합니다.'}
      />
      <CardBody className="space-y-2">
        <p
          className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2"
          dir="ltr"
        >
          {L1_LABEL_KO[lang]}
        </p>
        <div
          className="space-y-2"
          data-testid="feedback-native"
          dir={dir}
          lang={lang}
          style={isRTL(lang) ? { unicodeBidi: 'plaintext', textAlign: 'start' } : undefined}
        >
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-xs font-semibold text-emerald-700 mb-1" dir="ltr">
              잘한 점
            </p>
            <ul className="text-sm text-emerald-700 space-y-1">
              {current.strengths.map((t, i) => <li key={i}>• {t}</li>)}
            </ul>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-semibold text-amber-700 mb-1" dir="ltr">
              다음 목표
            </p>
            <ul className="text-sm text-amber-700 space-y-1">
              {current.nextSteps.map((t, i) => <li key={i}>• {t}</li>)}
            </ul>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
