// v1.1 단계 18 [K]: 자유 대화 교정 정책 명문화 회귀 보호.
//
// build-persona-system-prompt가 correction_severity 필드와 두 단계 정책 가이드를
// 포함하는지 검증한다. 시연 사례("일 조각", "카드 교체") 재현 가능성을 보장.

import { describe, expect, it } from 'vitest'

import { buildPersonaSystemPrompt } from '@/src/lib/llm/build-persona-system-prompt'
import { PERSONAS } from '@/src/lib/personas'

function anyPersona() {
  return PERSONAS[0]
}

describe('교정 정책 [K] - correction_severity 필드 + 가이드', () => {
  it('프롬프트에 correction_severity 출력 필드가 포함된다', () => {
    const out = buildPersonaSystemPrompt({
      persona: anyPersona(),
      topic: '주말 계획',
      availableToolNames: [],
    })
    expect(out).toContain('correction_severity')
    expect(out).toContain('"none | minor | meaning_error"')
  })

  it('세 단계 강도 정의가 모두 포함된다', () => {
    const out = buildPersonaSystemPrompt({
      persona: anyPersona(),
      topic: '주말 계획',
      availableToolNames: [],
    })
    expect(out).toContain('"minor"')
    expect(out).toContain('"meaning_error"')
    expect(out).toContain('"none"')
  })

  it('시연 사례 "일 조각" → minor 가이드', () => {
    const out = buildPersonaSystemPrompt({
      persona: anyPersona(),
      topic: '카페 주문',
      availableToolNames: [],
    })
    expect(out).toContain('일 조각')
    expect(out).toContain('한 조각')
  })

  it('시연 사례 "카드로 교체" → meaning_error 가이드', () => {
    const out = buildPersonaSystemPrompt({
      persona: anyPersona(),
      topic: '카페 주문',
      availableToolNames: [],
    })
    expect(out).toContain('교체')
    expect(out).toContain('결제')
  })

  it('forSummary=true에서도 교정 가이드는 유지된다', () => {
    const out = buildPersonaSystemPrompt({
      persona: anyPersona(),
      topic: '주말 계획',
      availableToolNames: [],
      forSummary: true,
    })
    expect(out).toContain('correction_severity')
  })
})
