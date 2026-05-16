'use client'

// v1.1 단계 19 [D6.4]: 아랍어 RTL 레이아웃 — html dir/lang 속성 자동 동기화.
//
// 단계 18에서 아랍어 토글 시 글자만 아랍어이고 정렬은 LTR이라 마침표/괄호
// 위치가 어색하다는 피드백이 있었다. document.documentElement.dir을 lang에
// 맞춰 toggle해 페이지 전체가 RTL/LTR로 정렬되도록 한다.
//
// SSR 시점에는 motherTongue를 root layout이 모르므로 항상 LTR로 렌더되고,
// 클라이언트 mount 후 한 번 동기화한다. 첫 페인트에서 < 100ms flash가 있을 수
// 있으나 콘텐츠 텍스트 자체는 SSR에서 이미 올바른 언어로 렌더되므로 허용 범위.
//
// 한국어 학습 본문(NPC 발화 등)은 별도 컨테이너에서 dir="ltr" 명시로 LTR 유지.

import { useEffect } from 'react'

import { useDisplayLanguage } from '@/src/hooks/use-display-language'
import { isRTLDisplay } from '@/src/lib/i18n/display-language'

export function DirHtmlSync() {
  const { lang } = useDisplayLanguage()

  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.dir = isRTLDisplay(lang) ? 'rtl' : 'ltr'
    root.lang = lang
  }, [lang])

  return null
}
