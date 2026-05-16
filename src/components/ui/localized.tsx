'use client'

// v1.1 단계 19.6 [UI고정]: UI 라벨은 한국어 고정.
//
// 단계 18·19에서는 헤더 토글에 반응해 KPI·차트·페이지 제목까지 4언어로 전환됐다.
// 19.6 새 모델에서 UI(메뉴·라벨·버튼·페이지 제목·차트 라벨·KPI)는 한국어 고정,
// 보조 언어는 BilingualText 본문 컨텐츠 옆에 작은 글씨로만 노출된다.
// 컴포넌트는 호환을 위해 유지하되 lang을 'ko'로 고정한다 — 헤더 토글·mother_tongue
// 변경에 영향받지 않는다.

import {
  fmtDuration as fmtDurationRaw,
  getLabel,
  type DashboardLabelKey,
} from '@/src/lib/i18n/dashboard-labels'

export function Localized({
  spec,
  className,
}: {
  spec: DashboardLabelKey
  /** @deprecated 19.6 새 모델에서 라벨은 한국어 고정 — hint는 무시된다. */
  motherTongueHint?: string | null
  className?: string
}) {
  return <span className={className}>{getLabel(spec, 'ko')}</span>
}

export function LocalizedDuration({
  totalSeconds,
  className,
}: {
  totalSeconds: number
  /** @deprecated 19.6 새 모델에서 라벨은 한국어 고정. */
  motherTongueHint?: string | null
  className?: string
}) {
  return <span className={className}>{fmtDurationRaw(totalSeconds, 'ko')}</span>
}
