'use client'

// v1.1 단계 19.6 [평가결과]: 보조 언어 카드 — 한국어 본문은 위 카드들에 이미 있고,
// 이 카드는 한국어 평가 내용을 학습자 모국어로 보조 안내하는 영역.
//
// 새 모델: 보조 언어 토글이 'ko'면 카드 미표시 (보조 불필요).
// 그 외 (en/vi/ar)면 그 언어의 strengths/nextSteps를 작은 글씨 + muted로 표시.

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
  title = '모국어 보조 안내',
  description,
  motherTongueHint,
}: Props) {
  const { lang: displayLang } = useDisplayLanguage(motherTongueHint)

  // ko 선택 → 보조 언어 미표시. 새 모델: DOM 자체 없음.
  if (displayLang === 'ko') return null

  // v1.1 단계 19.9: th/ms/km는 본 컴포넌트가 정적 번역(en/vi/ar)만 보유 →
  // 영어로 폴백 (임시본 정책). 동의서·UI 보조는 별도 데이터로 th/ms/km 직접 지원.
  const lang: FeedbackLanguage = (displayLang === 'en' || displayLang === 'vi' || displayLang === 'ar')
    ? displayLang
    : 'en'
  const data: Record<FeedbackLanguage, MultilingualFeedbackData> = { vi, en, ar }
  const current = data[lang]
  const dir = isRTL(lang) ? 'rtl' : 'ltr'

  return (
    <Card data-testid={testId} data-bilingual-supplement={lang}>
      <CardHeader
        title={title}
        description={description ?? '한국어 평가 내용의 보조 안내입니다.'}
      />
      <CardBody className="space-y-2">
        <p
          className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-2"
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
          <div className="p-3 bg-emerald-50/60 border border-emerald-200/70 rounded-lg">
            <p className="text-xs font-semibold text-emerald-700 mb-1" dir="ltr">
              잘한 점
            </p>
            <ul className="text-xs text-emerald-700/90 space-y-1 opacity-90">
              {current.strengths.map((t, i) => <li key={i}>• {t}</li>)}
            </ul>
          </div>
          <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-lg">
            <p className="text-xs font-semibold text-amber-700 mb-1" dir="ltr">
              다음 목표
            </p>
            <ul className="text-xs text-amber-700/90 space-y-1 opacity-90">
              {current.nextSteps.map((t, i) => <li key={i}>• {t}</li>)}
            </ul>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
