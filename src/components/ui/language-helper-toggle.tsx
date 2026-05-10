'use client'

// Topbar 보조 언어 토글. 4 모드 피드백 패널과 같은 useLanguageHelper 저장소를 공유.
// 데모 통일 작업으로 ar/en/vi 3개로 좁힘 ('off' 제거).

import { useLanguageHelper } from '@/src/hooks/use-language-helper'
import { FEEDBACK_LANGUAGES } from '@/src/lib/feedback-language'

export function LanguageHelperToggle() {
  const { lang, setLang } = useLanguageHelper()

  return (
    <div
      className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-1 py-0.5"
      role="group"
      aria-label="보조 언어 선택"
      data-testid="lang-helper-toggle"
    >
      <span className="px-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-wide hidden sm:inline">
        보조
      </span>
      {FEEDBACK_LANGUAGES.map(({ code, label }) => {
        const active = lang === code
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            className={
              active
                ? 'px-2 py-0.5 text-[11px] font-semibold rounded bg-primary-600 text-white'
                : 'px-2 py-0.5 text-[11px] font-medium rounded text-text-secondary hover:bg-slate-100'
            }
            data-testid={`lang-helper-option-${code}`}
            aria-pressed={active}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
