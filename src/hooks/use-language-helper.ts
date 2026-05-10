'use client'

// 4 모드(읽기·발표·생성형 대화·말하기 평가) 공통 보조 언어 토글.
// localStorage로 지속, 동일 탭 EventTarget으로 컴포넌트 간 동기화.
// 23-i 추가-3에서 'off'/'en'/'vi' 였으나, 데모 통일 작업 후 ar/en/vi 3개로 좁힘.

import { useCallback, useSyncExternalStore } from 'react'
import {
  DEFAULT_FEEDBACK_LANGUAGE,
  isFeedbackLanguage,
  type FeedbackLanguage,
} from '@/src/lib/feedback-language'

// 외부 호환을 위해 LangHelper alias 유지. 새 코드는 FeedbackLanguage 직접 사용 권장.
export type LangHelper = FeedbackLanguage

const STORAGE_KEY = 'kspai:lang:helper'
const DEFAULT_LANG: FeedbackLanguage = DEFAULT_FEEDBACK_LANGUAGE

const channel: EventTarget | null =
  typeof window !== 'undefined' ? new EventTarget() : null

function getSnapshot(): FeedbackLanguage {
  if (typeof window === 'undefined') return DEFAULT_LANG
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    return isFeedbackLanguage(v) ? v : DEFAULT_LANG
  } catch {
    return DEFAULT_LANG
  }
}

function getServerSnapshot(): FeedbackLanguage {
  return DEFAULT_LANG
}

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onStoreChange()
  }
  const onLocal = () => onStoreChange()
  window.addEventListener('storage', onStorage)
  channel?.addEventListener('kspai:lang-changed', onLocal)
  return () => {
    window.removeEventListener('storage', onStorage)
    channel?.removeEventListener('kspai:lang-changed', onLocal)
  }
}

export function useLanguageHelper(): {
  lang: FeedbackLanguage
  setLang: (lang: FeedbackLanguage) => void
} {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const setLang = useCallback((next: FeedbackLanguage) => {
    if (!isFeedbackLanguage(next)) return
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch { /* noop */ }
    channel?.dispatchEvent(new Event('kspai:lang-changed'))
  }, [])
  return { lang, setLang }
}
