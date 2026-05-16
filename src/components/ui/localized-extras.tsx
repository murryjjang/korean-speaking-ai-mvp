'use client'

// v1.1 단계 19.6 [UI고정]: 모드명·점수 단위 라벨은 한국어 고정.
//
// 헤더 토글이 보조 언어 의미로 재정의된 19.6 모델에서 UI 라벨은 모두 한국어
// 고정이다. LocalizedModeLabel·LocalizedScore는 호환을 위해 유지되지만 한국어
// 라벨/단위만 반환한다.

import { getLabel, MODE_LABELS } from '@/src/lib/i18n/dashboard-labels'

type ModeKey = keyof typeof MODE_LABELS

function isModeKey(v: string): v is ModeKey {
  return Object.prototype.hasOwnProperty.call(MODE_LABELS, v)
}

export function LocalizedModeLabel({
  mode,
  className,
  fallback,
}: {
  mode: string
  /** @deprecated 19.6 새 모델에서 라벨은 한국어 고정. */
  motherTongueHint?: string | null
  className?: string
  fallback?: string
}) {
  if (isModeKey(mode)) {
    return <span className={className}>{MODE_LABELS[mode].ko}</span>
  }
  return <span className={className}>{fallback ?? mode}</span>
}

export function LocalizedScore({
  score,
  className,
  testId,
}: {
  score: number
  /** @deprecated 19.6 새 모델에서 단위는 한국어 고정. */
  motherTongueHint?: string | null
  className?: string
  testId?: string
}) {
  const unit = getLabel({ kind: 'scoreUnit', key: 'scorePoints' }, 'ko')
  return (
    <span className={className} data-testid={testId}>
      {score}{unit}
    </span>
  )
}
