'use client'

// v1.1 단계 19.7 [아키텍처]: mother_tongue 단일 진실원.
//
// 단계 18~19.6에선 클라이언트 저장소에 명시 선택을 보관해 학습자가 토글로 보조
// 언어를 바꿀 수 있었다. 19.7부터는 보조 언어를 학습자가 변경할 수 없고, 가입
// 시 결정된 mother_tongue 값이 평생 자동 적용된다. 클라이언트 저장 우선순위·
// 이벤트 동기화 로직 일체 제거. setLang은 호환을 위해 유지하되 no-op.

import { useMemo } from 'react'
import {
  DEFAULT_DISPLAY_LANGUAGE,
  DisplayLanguage,
  inferDisplayLanguageFromMotherTongue,
} from '@/src/lib/i18n/display-language'

/**
 * @param motherTongueHint 학습자 모국어(자유 텍스트 또는 언어 코드).
 *                         이 값이 표시 언어를 단독 결정한다. 매칭 실패 시 'ko'.
 */
export function useDisplayLanguage(motherTongueHint?: string | null): {
  lang: DisplayLanguage
  setLang: (lang: DisplayLanguage) => void
} {
  const lang = useMemo<DisplayLanguage>(
    () => inferDisplayLanguageFromMotherTongue(motherTongueHint) ?? DEFAULT_DISPLAY_LANGUAGE,
    [motherTongueHint],
  )
  return { lang, setLang: noop }
}

function noop(): void { /* mother_tongue 단일 진실원 — 사용자 변경 불가. */ }
