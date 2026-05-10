'use client'

// 피드백 패널 안에 들어가는 ar/en/vi 3개 토글. Topbar 토글과 같은 useLanguageHelper
// 저장소를 공유하므로 한쪽을 바꾸면 4 모드에 모두 반영된다.

import {
  FEEDBACK_LANGUAGES,
  type FeedbackLanguage,
} from '@/src/lib/feedback-language'

interface Props {
  value: FeedbackLanguage
  onChange: (lang: FeedbackLanguage) => void
  className?: string
}

export function FeedbackLanguageToggle({ value, onChange, className = '' }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="피드백 보조 언어"
      data-testid="feedback-lang-toggle"
      className={`inline-flex items-center gap-1 rounded-md border border-border bg-surface px-1 py-0.5 ${className}`}
    >
      {FEEDBACK_LANGUAGES.map(({ code, label }) => {
        const active = value === code
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={active}
            data-testid={`feedback-lang-option-${code}`}
            onClick={() => onChange(code)}
            className={
              active
                ? 'px-2 py-0.5 text-[11px] font-semibold rounded bg-primary-600 text-white'
                : 'px-2 py-0.5 text-[11px] font-medium rounded text-text-secondary hover:bg-slate-100'
            }
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
