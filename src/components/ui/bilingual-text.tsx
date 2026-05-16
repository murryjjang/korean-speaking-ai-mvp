'use client'

// v1.1 단계 18 [D10]: 이중 언어(한국어 + 선택 외국어) 본문 렌더링.
//
// 학습 효과를 위해 자유 대화 요약·평가 결과 등 본문 콘텐츠는 한국어와 학습자
// 모국어를 항상 함께 표시하고, 헤더 토글이 어느 쪽을 강조할지 결정한다.
//
// 두 모드:
// - emphasize: 양쪽 표시, 선택한 쪽이 정상 본문 색·크기, 비강조 쪽은 흐리게.
// - switch:    선택한 쪽만 표시 (KPI 라벨·차트 축 등 단일 언어 영역에 사용).
//
// 토글이 ko일 때는 외국어 측 텍스트가 없거나 비어 있으면 한국어만 표시한다.
// 외국어 측 번역이 누락되면 한국어로 폴백.

import { useDisplayLanguage } from '@/src/hooks/use-display-language'
import { isRTLDisplay, type MultilingualText } from '@/src/lib/i18n/display-language'

type Mode = 'emphasize' | 'switch'

export function BilingualText({
  ko,
  multilingual,
  mode = 'emphasize',
  motherTongueHint,
  className,
  testId,
}: {
  ko: string
  multilingual?: MultilingualText | null
  mode?: Mode
  motherTongueHint?: string | null
  className?: string
  testId?: string
}) {
  const { lang } = useDisplayLanguage(motherTongueHint)
  const foreignText =
    lang === 'ko'
      ? ''
      : (multilingual?.[lang]?.trim() ?? '') || ''
  const hasForeign = foreignText.length > 0
  const showBoth = mode === 'emphasize' && hasForeign && lang !== 'ko'
  const rtl = isRTLDisplay(lang)

  if (mode === 'switch') {
    const text = lang === 'ko' ? ko : foreignText || ko
    return (
      <p
        className={className}
        dir={rtl && text === foreignText ? 'rtl' : undefined}
        lang={lang}
        data-testid={testId}
        data-bilingual-mode="switch"
      >
        {text}
      </p>
    )
  }

  // emphasize 모드: 양쪽 모두 표시, 선택 쪽 강조.
  if (!showBoth) {
    // 모국어가 ko이거나 외국어 번역 없음 → 한국어 단일 표시
    return (
      <p
        className={className}
        lang="ko"
        data-testid={testId}
        data-bilingual-mode="emphasize"
        data-emphasis="ko"
      >
        {ko}
      </p>
    )
  }

  // showBoth=true 시점에서 lang은 항상 비-ko (위 분기에서 lang === 'ko' 케이스 처리).
  // 외국어 측이 강조 대상이므로 ko는 보조 표시.
  return (
    <div
      className={className}
      data-testid={testId}
      data-bilingual-mode="emphasize"
      data-emphasis={lang}
    >
      <p
        className="text-sm text-text-muted opacity-70 leading-relaxed"
        lang="ko"
      >
        {ko}
      </p>
      <p
        className="text-foreground leading-relaxed mt-1.5"
        dir={rtl ? 'rtl' : undefined}
        lang={lang}
        style={rtl ? { unicodeBidi: 'plaintext', textAlign: 'start' } : undefined}
      >
        {foreignText}
      </p>
    </div>
  )
}
