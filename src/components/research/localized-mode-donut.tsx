'use client'

// v1.1 단계 19.6 [UI고정]: 차트 라벨은 한국어 고정.
//
// 단계 19에서 도넛 범례를 4언어 토글 반응으로 바꿨지만 19.6 새 모델은 차트
// 라벨도 UI 영역으로 분류되어 한국어 고정. 컴포넌트는 호환을 위해 유지.

import { MODE_LABELS } from '@/src/lib/i18n/dashboard-labels'
import { ModeDonut } from './progress-charts'

type ModeKey = keyof typeof MODE_LABELS

export function LocalizedModeDonut({
  counts,
}: {
  counts: Array<{ mode: string; value: number }>
  /** @deprecated 19.6 새 모델에서 차트 라벨은 한국어 고정. */
  motherTongueHint?: string | null
}) {
  const data = counts.map(({ mode, value }) => {
    const label = isModeKey(mode) ? MODE_LABELS[mode].ko : mode
    return { label, value }
  })
  return <ModeDonut data={data} />
}

function isModeKey(v: string): v is ModeKey {
  return Object.prototype.hasOwnProperty.call(MODE_LABELS, v)
}
