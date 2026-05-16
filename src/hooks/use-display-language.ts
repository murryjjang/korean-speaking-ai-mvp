'use client'

// v1.1 16-10: 4언어(KO/EN/VI/AR) 표시 언어 토글 훅.
//
// useLanguageHelper(ar/en/vi)와 별도로 KO를 포함하는 표시 언어 상태를 관리.
// 우선순위: localStorage 명시 선택 > 학습자 모국어 추론 > 기본값 ko.
//
// v1.1 단계 18 [D8]: 헤더 단일 토글로 통일하면서 legacy useLanguageHelper와의
// 표시 모순을 막기 위해 write-through 브리지를 적용한다. en/vi/ar로 바꾸면
// language-helper도 같은 값을 갖고, ko로 바꾸면 language-helper는 그대로
// 두어 다음에 비-ko로 돌아갈 때 마지막 외국어 선택을 유지한다.
//
// v1.1 단계 19 [D6]: 단계 18은 mother_tongue 추론을 useEffect에서 수행해 첫 렌더는
// 항상 한국어로 보였다(시연 피드백: "한국어로 고정"). 단계 19에서는 추론을
// getSnapshot/getServerSnapshot에 inline해 SSR 시점부터 즉시 학습자 모국어로
// 렌더된다. 명시 선택(localStorage)이 있으면 그것이 최우선.

import { useCallback, useSyncExternalStore } from 'react'
import {
  DEFAULT_DISPLAY_LANGUAGE,
  DisplayLanguage,
  inferDisplayLanguageFromMotherTongue,
  isDisplayLanguage,
} from '@/src/lib/i18n/display-language'

const STORAGE_KEY = 'kspai:lang:display'
const EXPLICIT_KEY = 'kspai:lang:display:explicit'
const LEGACY_HELPER_KEY = 'kspai:lang:helper'

const channel: EventTarget | null =
  typeof window !== 'undefined' ? new EventTarget() : null

function readStoredLanguage(): DisplayLanguage | null {
  if (typeof window === 'undefined') return null
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    return isDisplayLanguage(v) ? v : null
  } catch {
    return null
  }
}

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onStoreChange()
  }
  const onLocal = () => onStoreChange()
  window.addEventListener('storage', onStorage)
  channel?.addEventListener('kspai:display-lang-changed', onLocal)
  return () => {
    window.removeEventListener('storage', onStorage)
    channel?.removeEventListener('kspai:display-lang-changed', onLocal)
  }
}

/**
 * @param motherTongueHint 학습자 모국어(자유 텍스트 또는 언어 코드). 명시 선택이 없을
 *                         때만 자동 적용된다. 사용자가 토글로 한 번이라도 변경하면
 *                         이후로는 모국어 변경에 영향받지 않는다.
 */
export function useDisplayLanguage(motherTongueHint?: string | null): {
  lang: DisplayLanguage
  setLang: (lang: DisplayLanguage) => void
} {
  // 단계 19 [D6]: getSnapshot/getServerSnapshot에서 직접 추론해 SSR/hydration이
  // 즉시 학습자 모국어를 사용하도록 한다. 명시 선택이 있으면 그것이 최우선.
  const getSnapshot = useCallback((): DisplayLanguage => {
    return (
      readStoredLanguage() ??
      inferDisplayLanguageFromMotherTongue(motherTongueHint) ??
      DEFAULT_DISPLAY_LANGUAGE
    )
  }, [motherTongueHint])
  const getServerSnapshot = useCallback((): DisplayLanguage => {
    return inferDisplayLanguageFromMotherTongue(motherTongueHint) ?? DEFAULT_DISPLAY_LANGUAGE
  }, [motherTongueHint])

  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setLang = useCallback((next: DisplayLanguage) => {
    if (!isDisplayLanguage(next)) return
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
      window.localStorage.setItem(EXPLICIT_KEY, '1')
      // 단계 18 [D8] write-through: en/vi/ar는 legacy language-helper에도 반영.
      // ko 선택은 legacy 값을 유지(다음 외국어 토글 시 마지막 선택 복원).
      if (next === 'en' || next === 'vi' || next === 'ar') {
        window.localStorage.setItem(LEGACY_HELPER_KEY, next)
        // legacy hook은 별도 EventTarget을 쓰므로 storage 이벤트로만 노출됨.
        // 같은 탭 동기화를 위해 storage 이벤트를 수동 디스패치.
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: LEGACY_HELPER_KEY,
            newValue: next,
          }),
        )
      }
    } catch { /* noop */ }
    channel?.dispatchEvent(new Event('kspai:display-lang-changed'))
  }, [])

  return { lang, setLang }
}
