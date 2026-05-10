'use client'

// 23-i 추가-3: 보조 언어 토글 — Topbar에 노출. OFF / 영어 / 베트남어 3-way 셀렉트.

import { useLanguageHelper, type LangHelper } from '@/src/hooks/use-language-helper'

const OPTIONS: ReadonlyArray<{ value: LangHelper; label: string }> = [
  { value: 'off', label: '한국어만' },
  { value: 'en', label: 'EN' },
  { value: 'vi', label: 'VI' },
]

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
      {OPTIONS.map((opt) => {
        const active = lang === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setLang(opt.value)}
            className={
              active
                ? 'px-2 py-0.5 text-[11px] font-semibold rounded bg-primary-600 text-white'
                : 'px-2 py-0.5 text-[11px] font-medium rounded text-text-secondary hover:bg-slate-100'
            }
            data-testid={`lang-helper-option-${opt.value}`}
            aria-pressed={active}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
