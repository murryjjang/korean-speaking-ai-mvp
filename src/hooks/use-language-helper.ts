'use client'

// 23-i 추가-3: 학습자 보조 언어 토글 (영어/베트남어/OFF). localStorage 동기화.
// 시연 4 모드(읽기·발표·생성형 대화·말하기 평가) 전체에서 같은 키를 읽어 일관 표시.

import { useCallback, useSyncExternalStore } from 'react'

export type LangHelper = 'off' | 'en' | 'vi'

const STORAGE_KEY = 'kspai:lang:helper'
const DEFAULT_LANG: LangHelper = 'en'

const SUPPORTED: ReadonlyArray<LangHelper> = ['off', 'en', 'vi']
function isLangHelper(v: string | null): v is LangHelper {
  return v != null && (SUPPORTED as readonly string[]).includes(v)
}

// 동일 페이지 내 다른 컴포넌트가 같은 토글을 보도록 BroadcastChannel/storage 이벤트로 동기화.
// (Browser storage 이벤트는 다른 탭에서만 발생하므로 동일 탭 동기화에는 부족 — 자체 EventTarget으로 보강.)
const channel: EventTarget | null = typeof window !== 'undefined' ? new EventTarget() : null

function getSnapshot(): LangHelper {
  if (typeof window === 'undefined') return DEFAULT_LANG
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    return isLangHelper(v) ? v : DEFAULT_LANG
  } catch {
    return DEFAULT_LANG
  }
}

function getServerSnapshot(): LangHelper {
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
  lang: LangHelper
  setLang: (lang: LangHelper) => void
} {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const setLang = useCallback((next: LangHelper) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch { /* noop */ }
    channel?.dispatchEvent(new Event('kspai:lang-changed'))
  }, [])
  return { lang, setLang }
}
