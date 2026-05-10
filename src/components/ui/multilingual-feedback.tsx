'use client'

// q4 말하기 평가 결과 페이지에서 정적 다국어 피드백을 보여주는 카드.
// 데모 통일 작업 후 ar/en/vi 중 보조 언어 토글로 선택된 1개만 노출 (한국어는 페이지 본문에 별도 표기).
// 새 코드는 src/components/feedback/bilingual-feedback.tsx 사용을 권장.

import { Card, CardHeader, CardBody } from './card'
import { useLanguageHelper } from '@/src/hooks/use-language-helper'
import { FeedbackLanguageToggle } from '@/src/components/feedback/feedback-language-toggle'
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
}

export function MultilingualFeedback({
  vi,
  en,
  ar,
  testId,
  title = '모국어 피드백',
  description,
}: Props) {
  const { lang, setLang } = useLanguageHelper()

  const data: Record<FeedbackLanguage, MultilingualFeedbackData> = { vi, en, ar }
  const current = data[lang]
  const dir = isRTL(lang) ? 'rtl' : 'ltr'

  return (
    <Card data-testid={testId}>
      <CardHeader
        title={title}
        description={description ?? '한국어 평가 내용을 보조 언어로 안내합니다.'}
        action={<FeedbackLanguageToggle value={lang} onChange={setLang} />}
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
