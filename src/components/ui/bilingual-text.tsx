'use client'

// v1.1 단계 19.6 [BiText]: 한국어 본문 + (선택 언어가 ko가 아니면) 작은 보조 텍스트.
//
// 19.6 새 모델:
//  - UI 라벨은 항상 한국어 고정. 보조 언어 토글은 학습 콘텐츠(자유 대화 요약·
//    grammar_note·평가 결과 등)의 한국어 본문 아래 작게 표시되는 보조 텍스트만 결정.
//  - 보조 언어 = 한국어 → 보조 영역 DOM 자체 미존재 (제거되어야 함, 학습자 모국어가
//    한국어이거나 명시 선택이 ko인 경우).
//  - 보조 언어 = en/vi/ar → 한국어 본문(text-base, foreground) 아래에 그 언어
//    번역을 text-xs + 더 흐린 색감으로 표시. 보조 텍스트가 비어있으면 한국어만.
//
// 단계 18·19에서 사용한 emphasize/switch 모드 개념은 폐기. 호출부는 항상 한국어가
// 본문이고 보조 언어는 보조라는 단일 의미로 사용한다.

import { useDisplayLanguage } from '@/src/hooks/use-display-language'
import { isRTLDisplay, type MultilingualText } from '@/src/lib/i18n/display-language'

export function BilingualText({
  ko,
  multilingual,
  motherTongueHint,
  className,
  supplementClassName,
  testId,
  inline = false,
}: {
  ko: string
  multilingual?: MultilingualText | null
  motherTongueHint?: string | null
  /** 한국어 본문 컨테이너에 추가 className. */
  className?: string
  /** 보조 언어 텍스트에 추가 className (호출부가 본문 크기와 맞물려 작게 조정 가능). */
  supplementClassName?: string
  testId?: string
  /** true면 <span>으로 inline 렌더 — span 내부 grammar_note 같은 인라인 영역용. */
  inline?: boolean
}) {
  const { lang } = useDisplayLanguage(motherTongueHint)

  const supplement =
    lang === 'ko' || !multilingual
      ? ''
      : (multilingual[lang]?.trim() ?? '')

  const showSupplement = supplement.length > 0
  const rtl = showSupplement && isRTLDisplay(lang)

  if (inline) {
    // 인라인 컨텍스트: 한국어 본문 다음에 줄바꿈 + 보조. <span>으로 노드 구성하되
    // 보조 영역은 <span class="block"> 형태로 줄바꿈.
    return (
      <span
        className={className}
        data-testid={testId}
        data-bilingual-supplement={showSupplement ? lang : undefined}
      >
        <span lang="ko">{ko}</span>
        {showSupplement && (
          <span
            className={
              'block text-xs text-text-muted opacity-80 mt-0.5 leading-snug ' +
              (supplementClassName ?? '')
            }
            dir={rtl ? 'rtl' : undefined}
            lang={lang}
            style={rtl ? { unicodeBidi: 'plaintext', textAlign: 'start' } : undefined}
          >
            {supplement}
          </span>
        )}
      </span>
    )
  }

  return (
    <div
      className={className}
      data-testid={testId}
      data-bilingual-supplement={showSupplement ? lang : undefined}
    >
      <p className="text-sm text-text-primary leading-relaxed" lang="ko">
        {ko}
      </p>
      {showSupplement && (
        <p
          className={
            'text-xs text-text-muted opacity-80 mt-1 leading-snug ' +
            (supplementClassName ?? '')
          }
          dir={rtl ? 'rtl' : undefined}
          lang={lang}
          style={rtl ? { unicodeBidi: 'plaintext', textAlign: 'start' } : undefined}
        >
          {supplement}
        </p>
      )}
    </div>
  )
}

// v1.1 단계 19.6 [BiText]: 리스트 항목용 보조 — strengths/next_steps 같은 리스트.
// 한국어 항목을 본문으로, 보조 언어 항목을 같은 li 안에 작은 글씨로 한 줄 더 표시.
export function BilingualListItem({
  ko,
  multilingual,
  motherTongueHint,
  className,
}: {
  ko: string
  multilingual?: MultilingualText | null
  motherTongueHint?: string | null
  className?: string
}) {
  const { lang } = useDisplayLanguage(motherTongueHint)

  const supplement =
    lang === 'ko' || !multilingual
      ? ''
      : (multilingual[lang]?.trim() ?? '')

  const showSupplement = supplement.length > 0
  const rtl = showSupplement && isRTLDisplay(lang)

  return (
    <li
      className={className}
      data-bilingual-supplement={showSupplement ? lang : undefined}
    >
      <span lang="ko">{ko}</span>
      {showSupplement && (
        <span
          className="block text-[11px] text-text-muted opacity-80 mt-0.5 leading-snug"
          dir={rtl ? 'rtl' : undefined}
          lang={lang}
          style={rtl ? { unicodeBidi: 'plaintext', textAlign: 'start' } : undefined}
        >
          {supplement}
        </span>
      )}
    </li>
  )
}
