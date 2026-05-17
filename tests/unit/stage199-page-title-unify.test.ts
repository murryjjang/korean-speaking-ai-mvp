// v1.1 단계 19.9 [페이즈5]: 4개 메뉴 페이지 제목 typography 통일 + mother_tongue 보조.
//
// 19.8 검증 V3-1 누락: 학습 진척만 보조 표기됐던 제목을 4개 메뉴 모두 동일 패턴
// (text-xl font-bold leading-tight + mother_tongue 보조 작은 글씨)으로 통일.
// V3-2 사이드바 typography는 이미 ItemLabel 단일 컴포넌트 사용으로 통일됨 — 회귀 보호.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

function read(p: string): string {
  return readFileSync(join(process.cwd(), p), 'utf-8')
}

describe('[단계19.9-페이즈5] 페이지 제목 — 4개 메뉴 통일 + mother_tongue 보조', () => {
  it('말하기 평가: PageHeader titleSupplement에 Localized', () => {
    const src = read('app/student/speaking/page.tsx')
    expect(src).toMatch(/PageHeader/)
    expect(src).toMatch(/titleSupplement=/)
    expect(src).toMatch(/studentSpeaking/)
  })

  it('읽기연습: text-xl + Localized supplementOnly', () => {
    const src = read('app/student/reading-practice/reading-practice-client.tsx')
    expect(src).toMatch(/text-xl font-bold text-text-primary leading-tight/)
    expect(src).toMatch(/studentReading/)
    expect(src).toMatch(/supplementOnly/)
    expect(src).not.toMatch(/text-3xl font-bold text-text-primary">읽기연습/)
  })

  it('발표연습: text-xl + Localized supplementOnly', () => {
    const src = read('app/student/presentation-practice/presentation-practice-client.tsx')
    expect(src).toMatch(/text-xl font-bold text-text-primary leading-tight/)
    expect(src).toMatch(/studentPresentation/)
    expect(src).toMatch(/supplementOnly/)
    expect(src).not.toMatch(/text-3xl font-bold text-text-primary">발표연습/)
  })

  it('생성형 대화 연습: Localized supplementOnly (freeConversationPractice 키)', () => {
    const src = read('app/student/conversation-practice/free-conversation-client.tsx')
    expect(src).toMatch(/freeConversationPractice/)
    expect(src).toMatch(/supplementOnly/)
  })
})

describe('[단계19.9-페이즈5] 사이드바 typography 통일 — V3-2 회귀 보호', () => {
  it('Sidebar가 ItemLabel 단일 컴포넌트로 네비 항목 렌더 (font-medium 일관)', () => {
    const src = read('src/components/layout/sidebar.tsx')
    expect(src).toMatch(/function ItemLabel/)
    // 데스크톱·모바일·disabled 모두 같은 ItemLabel 호출
    const matches = src.match(/<ItemLabel /g) ?? []
    expect(matches.length).toBeGreaterThanOrEqual(2)
    // 폰트 weight 일관: 활성/비활성 모두 font-medium
    expect(src).toMatch(/font-medium/)
  })
})
