'use client'

// v1.1 단계 19.6 [RTL]: 전체 페이지 RTL 적용 중단.
//
// 단계 18·19에서는 보조 언어 토글이 ar이면 documentElement.dir='rtl'을 적용해
// 사이드바·헤더까지 우측 정렬되었다. 단계 19.6 새 모델에서 UI는 한국어 고정이고
// 보조 언어는 작은 글씨 보조 텍스트로만 노출되므로 페이지 레이아웃은 항상 LTR을
// 유지한다. 보조 언어(ar) 텍스트 자체의 RTL은 해당 컨테이너의 dir 속성으로 처리.
//
// 컴포넌트는 호환을 위해 유지하되 no-op (htmlroot lang/dir를 ko/ltr로 고정).

import { useEffect } from 'react'

export function DirHtmlSync() {
  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.dir = 'ltr'
    root.lang = 'ko'
  }, [])

  return null
}
