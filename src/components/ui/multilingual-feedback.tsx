'use client'

// 23-i 추가-3: 결과 화면 다국어 피드백 래퍼 — 보조 언어 토글에 반응.
// 토글 OFF → 카드 자체 비표시. EN → 영어만. VI → 베트남어만.

import { Card, CardHeader, CardBody } from './card'
import { useLanguageHelper } from '@/src/hooks/use-language-helper'

export type MultilingualFeedbackData = {
  strengths: string[]
  nextSteps: string[]
}

interface Props {
  vi: MultilingualFeedbackData
  en: MultilingualFeedbackData
  testId?: string
  title?: string
  description?: string
}

export function MultilingualFeedback({
  vi,
  en,
  testId,
  title = '모국어 피드백',
  description,
}: Props) {
  const { lang } = useLanguageHelper()
  if (lang === 'off') return null

  const data = lang === 'vi' ? vi : en
  const langLabel = lang === 'vi' ? '베트남어 (Tiếng Việt)' : '영어 (English)'
  const langTestId = lang === 'vi' ? 'q4-feedback-vi' : 'q4-feedback-en'

  return (
    <Card data-testid={testId}>
      <CardHeader
        title={title}
        description={description ?? '한국어 평가 내용을 보조 언어로 안내합니다.'}
      />
      <CardBody className="space-y-2">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
          {langLabel}
        </p>
        <div className="space-y-2" data-testid={langTestId}>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-xs font-semibold text-emerald-700 mb-1">잘한 점</p>
            <ul className="text-sm text-emerald-700 space-y-1">
              {data.strengths.map((t, i) => <li key={i}>• {t}</li>)}
            </ul>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-semibold text-amber-700 mb-1">다음 목표</p>
            <ul className="text-sm text-amber-700 space-y-1">
              {data.nextSteps.map((t, i) => <li key={i}>• {t}</li>)}
            </ul>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
