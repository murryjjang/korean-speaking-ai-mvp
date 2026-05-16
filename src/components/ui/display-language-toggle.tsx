'use client'

// v1.1 단계 19.6 [토글]: 헤더 토글 의미를 "보조 언어"로 재정의.
//
// 단계 18·19까지는 "표시 언어" 전체 토글이어서 UI까지 영어/베트남어/아랍어로
// 바뀌었다. 19.6 새 모델에서 UI는 한국어 고정이고, 이 토글은 학습 콘텐츠
// (자유 대화 요약·평가 결과·grammar_note 등) 한국어 본문 아래 작게 표시되는
// "보조 언어"만 결정한다. "한국어" 선택 = 보조 영역 미표시.

import { DISPLAY_LANGUAGES, DisplayLanguage } from '@/src/lib/i18n/display-language'
import { useDisplayLanguage } from '@/src/hooks/use-display-language'

export function DisplayLanguageToggle({
  motherTongueHint,
  className,
}: {
  motherTongueHint?: string | null
  className?: string
}) {
  const { lang, setLang } = useDisplayLanguage(motherTongueHint)

  return (
    <div
      className={`inline-flex items-center gap-2 ${className ?? ''}`}
    >
      <span
        className="text-xs text-text-muted whitespace-nowrap"
        id="display-language-toggle-label"
      >
        보조 언어
      </span>
      <div
        className="inline-flex rounded-md border border-border overflow-hidden text-xs"
        role="group"
        aria-labelledby="display-language-toggle-label"
        data-testid="display-language-toggle"
      >
        {DISPLAY_LANGUAGES.map((l) => {
          const active = l.code === lang
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => setLang(l.code as DisplayLanguage)}
              aria-pressed={active}
              data-testid={`display-language-btn-${l.code}`}
              className={`px-2.5 py-1.5 ${
                active
                  ? 'bg-primary-600 text-white font-semibold'
                  : 'bg-white text-text-secondary hover:bg-slate-50'
              }`}
            >
              {l.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
