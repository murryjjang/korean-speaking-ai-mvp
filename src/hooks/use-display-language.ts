'use client'

// v1.1 16-10: 4언어(KO/EN/VI/AR) 표시 언어 토글 훅.
//
// useLanguageHelper(ar/en/vi)와 별도로 KO를 포함하는 표시 언어 상태를 관리.
// 우선순위: localStorage 명시 선택 > 학습자 모국어 추론 > 기본값 ko.

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import {
  DEFAULT_DISPLAY_LANGUAGE,
  DisplayLanguage,
  inferDisplayLanguageFromMotherTongue,
  isDisplayLanguage,
} from '@/src/lib/i18n/display-language'

const STORAGE_KEY = 'kspai:lang:display'
const EXPLICIT_KEY = 'kspai:lang:display:explicit'

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

function readExplicitFlag(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(EXPLICIT_KEY) === '1'
  } catch {
    return false
  }
}

function getSnapshot(): DisplayLanguage {
  return readStoredLanguage() ?? DEFAULT_DISPLAY_LANGUAGE
}

function getServerSnapshot(): DisplayLanguage {
  return DEFAULT_DISPLAY_LANGUAGE
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
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // 명시 선택이 없으면 모국어 힌트로 한 번 초기화.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (readExplicitFlag()) return
    if (readStoredLanguage()) return
    const inferred = inferDisplayLanguageFromMotherTongue(motherTongueHint)
    if (!inferred) return
    try {
      window.localStorage.setItem(STORAGE_KEY, inferred)
    } catch { /* noop */ }
    channel?.dispatchEvent(new Event('kspai:display-lang-changed'))
  }, [motherTongueHint])

  const setLang = useCallback((next: DisplayLanguage) => {
    if (!isDisplayLanguage(next)) return
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
      window.localStorage.setItem(EXPLICIT_KEY, '1')
    } catch { /* noop */ }
    channel?.dispatchEvent(new Event('kspai:display-lang-changed'))
  }, [])

  return { lang, setLang }
}
