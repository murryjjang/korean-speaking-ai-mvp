'use client'

// v1.1 단계 19.7 [아키텍처]: mother_tongue 단일 진실원 — 학습 보조 언어 hook.
//
// 단계 18~19.6에선 localStorage('kspai:lang:helper')에 명시 선택을 저장했다.
// 19.7부터는 보조 언어를 학습자가 변경할 수 없고, mother_tongue 값이 단독으로
// 결정한다. mother_tongue이 한국어(ko)이면 보조 영역은 표시되지 않으므로
// `lang`은 null이다 — 호출부는 null 체크로 보조 카드를 스킵해야 한다.

import { useMemo } from 'react'
import {
  isFeedbackLanguage,
  type FeedbackLanguage,
} from '@/src/lib/feedback-language'
import { inferDisplayLanguageFromMotherTongue } from '@/src/lib/i18n/display-language'

// 외부 호환을 위해 LangHelper alias 유지.
export type LangHelper = FeedbackLanguage

/**
 * @param motherTongueHint 학습자 모국어. 코드(en/vi/ar) 또는 자연어("English" 등).
 *                         ko/매칭 실패면 null 반환 — 보조 카드 미표시.
 */
export function useLanguageHelper(motherTongueHint?: string | null): {
  lang: FeedbackLanguage | null
  setLang: (lang: FeedbackLanguage) => void
} {
  const lang = useMemo<FeedbackLanguage | null>(() => {
    const display = inferDisplayLanguageFromMotherTongue(motherTongueHint)
    if (!display) return null
    return isFeedbackLanguage(display) ? display : null
  }, [motherTongueHint])
  return { lang, setLang: noop }
}

function noop(): void { /* mother_tongue 단일 진실원 — 사용자 변경 불가. */ }
