'use client'

// v1.1 단계 19 [D6.5]: 모드별 분포 도넛 차트 라벨을 표시 언어에 맞춰 i18n.
//
// 단계 18은 차트 캡처 안정성을 이유로 ko 고정했지만, 사용자 피드백 결과 영어/
// 베트남어/아랍어 학습자에게는 범례를 못 알아본다는 문제. dashboard-labels의
// MODE_LABELS를 활용해 클라이언트에서 lang에 따라 라벨을 매핑한다.

import { useDisplayLanguage } from '@/src/hooks/use-display-language'
import { MODE_LABELS } from '@/src/lib/i18n/dashboard-labels'
import { ModeDonut } from './progress-charts'

type ModeKey = keyof typeof MODE_LABELS

export function LocalizedModeDonut({
  counts,
  motherTongueHint,
}: {
  counts: Array<{ mode: string; value: number }>
  motherTongueHint?: string | null
}) {
  const { lang } = useDisplayLanguage(motherTongueHint)
  const data = counts.map(({ mode, value }) => {
    const label = isModeKey(mode) ? MODE_LABELS[mode][lang] : mode
    return { label, value }
  })
  return <ModeDonut data={data} />
}

function isModeKey(v: string): v is ModeKey {
  return Object.prototype.hasOwnProperty.call(MODE_LABELS, v)
}
