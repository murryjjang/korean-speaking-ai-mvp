'use client'

// v1.1 단계 19.6 [UI고정]: UI 라벨 본문은 한국어 고정 (디자인 일관성).
// v1.1 단계 19.8 [UI보조]: 본문 한국어 + mother_tongue 보조 표기.
//
// 18~19.6에선 헤더 토글로 라벨을 4언어로 전환했으나 한국어 디자인 톤이 깨졌다.
// 19.6에서 라벨을 한국어 고정한 뒤, 19.8에서 mother_tongue 학습자에게 보조
// 영역을 작은 글씨로 추가한다 — 토글 없이 mother_tongue으로 자동 결정.
//
// 표시 규칙:
//  - 본문(text-sm): 항상 한국어
//  - 보조(text-xs, muted): mother_tongue가 ko가 아닐 때만 노출
//  - dir/lang 속성으로 RTL/타이포 일관성 보장

import {
  fmtDuration as fmtDurationRaw,
  getLabel,
  type DashboardLabelKey,
} from '@/src/lib/i18n/dashboard-labels'
import {
  inferDisplayLanguageFromMotherTongue,
  isRTLDisplay,
} from '@/src/lib/i18n/display-language'

export function Localized({
  spec,
  motherTongueHint,
  className,
  /** true면 보조 영역을 같은 줄 inline으로 작게 (ml-1.5). false면 본문 아래 block. */
  inline = false,
  /** true면 보조 영역도 본문과 같은 크기/색감 (e.g., heading용). 기본 false=작고 muted. */
  prominent = false,
  /** true면 한국어 본문 미렌더, 보조 텍스트만 출력. titleSupplement 등 외부 본문이 이미
   *  있을 때 보조 영역만 추가하고 싶을 때 사용. ko/null이면 빈 결과. */
  supplementOnly = false,
}: {
  spec: DashboardLabelKey
  /** 학습자 모국어 단독 결정. ko/null이면 보조 영역 미생성. */
  motherTongueHint?: string | null
  className?: string
  inline?: boolean
  prominent?: boolean
  supplementOnly?: boolean
}) {
  const lang = inferDisplayLanguageFromMotherTongue(motherTongueHint)
  const ko = getLabel(spec, 'ko')
  const supplement = lang && lang !== 'ko' ? getLabel(spec, lang) : ''
  const showSupplement = supplement.length > 0
  const rtl = showSupplement && lang && isRTLDisplay(lang)

  if (supplementOnly) {
    if (!showSupplement) return null
    return (
      <span
        className={className}
        dir={rtl ? 'rtl' : undefined}
        lang={lang ?? undefined}
        // v1.1 단계 19.11 [#3]: 보조 영역을 항상 isolate해 외부 LTR 괄호 등과
        // bidi 충돌 차단. RTL은 plaintext 흐름 + 격리, LTR은 단순 격리.
        style={rtl ? { unicodeBidi: 'isolate', textAlign: 'start' } : { unicodeBidi: 'isolate' }}
        data-bilingual-supplement={lang}
      >
        {supplement}
      </span>
    )
  }

  // 보조 영역 className — 본문 흐름에 맞춰 inline/block 변환.
  const supClass = prominent
    ? `${inline ? 'ml-1.5' : 'block mt-0.5'} text-text-secondary`
    : `${inline ? 'ml-1.5' : 'block mt-0.5'} text-xs text-text-muted opacity-80 leading-snug`

  return (
    <span
      className={className}
      data-bilingual-supplement={showSupplement ? lang : undefined}
    >
      <span lang="ko">{ko}</span>
      {showSupplement && (
        <span
          className={supClass}
          dir={rtl ? 'rtl' : undefined}
          lang={lang ?? undefined}
          // v1.1 단계 19.11 [#3]: 보조 영역을 항상 isolate — inline 모드 시 외부 괄호 추가
          // 시나리오(예: "(완료 مكتمل)")에서 ")"가 RTL 컨텍스트로 잘못 밀려나는 회귀 차단.
          style={rtl ? { unicodeBidi: 'isolate', textAlign: 'start' } : { unicodeBidi: 'isolate' }}
        >
          {inline ? `(${supplement})` : supplement}
        </span>
      )}
    </span>
  )
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
