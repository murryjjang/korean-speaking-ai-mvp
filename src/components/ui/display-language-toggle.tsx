'use client'

// v1.1 16-10: 4언어(KO/EN/VI/AR) 표시 언어 토글 컴포넌트.
//
// 피드백·교정·평가 결과 화면 우상단에 배치한다. 선택은 localStorage에 저장되어
// 세션·페이지를 가로질러 유지된다. RTL은 ar에서 dir="rtl"이 필요한 컨테이너 쪽에서
// 별도 처리한다(여기서는 라벨만 노출).

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
      className={`inline-flex rounded-md border border-border overflow-hidden text-xs ${className ?? ''}`}
      role="group"
      aria-label="표시 언어"
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
  )
}
