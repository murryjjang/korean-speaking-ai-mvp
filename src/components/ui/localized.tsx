'use client'

// v1.1 단계 18 [C4, C5, D9]: 서버 컴포넌트 안에서 사용 가능한 i18n 라벨 렌더.
//
// 학습자 대시보드 KPI·차트 헤더처럼 헤더 토글에 즉시 반응해야 하는 단일 언어
// 라벨(D8 `switch` 모드)에 사용한다. useDisplayLanguage를 구독해 깜빡임 없이
// 부분 re-render한다.

import {
  fmtDuration as fmtDurationRaw,
  getLabel,
  type DashboardLabelKey,
} from '@/src/lib/i18n/dashboard-labels'
import { useDisplayLanguage } from '@/src/hooks/use-display-language'

export function Localized({
  spec,
  motherTongueHint,
  className,
}: {
  spec: DashboardLabelKey
  motherTongueHint?: string | null
  className?: string
}) {
  const { lang } = useDisplayLanguage(motherTongueHint)
  return <span className={className}>{getLabel(spec, lang)}</span>
}

export function LocalizedDuration({
  totalSeconds,
  motherTongueHint,
  className,
}: {
  totalSeconds: number
  motherTongueHint?: string | null
  className?: string
}) {
  const { lang } = useDisplayLanguage(motherTongueHint)
  return <span className={className}>{fmtDurationRaw(totalSeconds, lang)}</span>
}
