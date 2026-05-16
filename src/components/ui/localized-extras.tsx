'use client'

// v1.1 단계 19 [D6.5]: 진행 페이지의 동적 라벨(모드명·점수 단위) i18n 헬퍼.
//
// dashboard-labels의 MODE_LABELS는 서버에서 ko를 고르지만, 헤더 토글에 즉시
// 반응하려면 클라이언트에서 useDisplayLanguage로 다시 골라야 한다. <Localized/>는
// 정적 key가 필요하므로 mode 문자열을 받아 MODE_LABELS에서 동적 조회한다.

import { useDisplayLanguage } from '@/src/hooks/use-display-language'
import { getLabel, MODE_LABELS } from '@/src/lib/i18n/dashboard-labels'

type ModeKey = keyof typeof MODE_LABELS

function isModeKey(v: string): v is ModeKey {
  return Object.prototype.hasOwnProperty.call(MODE_LABELS, v)
}

export function LocalizedModeLabel({
  mode,
  motherTongueHint,
  className,
  fallback,
}: {
  mode: string
  motherTongueHint?: string | null
  className?: string
  fallback?: string
}) {
  const { lang } = useDisplayLanguage(motherTongueHint)
  if (isModeKey(mode)) {
    return <span className={className}>{MODE_LABELS[mode][lang]}</span>
  }
  return <span className={className}>{fallback ?? mode}</span>
}

export function LocalizedScore({
  score,
  motherTongueHint,
  className,
  testId,
}: {
  score: number
  motherTongueHint?: string | null
  className?: string
  testId?: string
}) {
  const { lang } = useDisplayLanguage(motherTongueHint)
  const unit = getLabel({ kind: 'scoreUnit', key: 'scorePoints' }, lang)
  // ko: "82점", others: "82 pts" — non-Korean에 공백 추가
  const separator = lang === 'ko' ? '' : ' '
  return (
    <span className={className} data-testid={testId}>
      {score}{separator}{unit}
    </span>
  )
}
