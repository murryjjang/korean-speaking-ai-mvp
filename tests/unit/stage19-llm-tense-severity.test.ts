// v1.1 단계 19 [LLM-1, K, K.2]: 시제 검증 + severity 정책 + 다중 오류 우선순위.
//
// 단계 18 [K]는 minor/meaning_error 분류만 도입했지만 시제 충돌 케이스에 대한
// 명시적 가이드가 없어 LLM이 자주 놓침. 단계 19에서 강화:
// - LLM-1: 시간 부사 ↔ 동사 시제 매칭 검증 규칙 명시
// - K: minor reason 포맷을 "원문 → 정답"으로 단순화 (설명 X)
// - K.2: 다중 오류 공존 시 severity 높은 것 우선

import { describe, expect, it } from 'vitest'

import { buildPersonaSystemPrompt } from '@/src/lib/llm/build-persona-system-prompt'
import { buildQ4PersonaSystemPrompt } from '@/src/lib/llm/build-q4-persona-system-prompt'
import { PERSONAS } from '@/src/lib/personas'

function anyPersona() {
  return PERSONAS[0]
}

describe('[단계19-LLM1] 시제 검증 규칙 — 자유 대화 프롬프트', () => {
  const out = buildPersonaSystemPrompt({
    persona: anyPersona(),
    topic: '주말 계획',
    availableToolNames: [],
  })

  it('시간 부사 → 시제 매칭 규칙이 명시되어 있다', () => {
    expect(out).toContain('시제 검증 규칙')
    expect(out).toContain('어제')
    expect(out).toContain('내일')
    expect(out).toContain('지금')
    // 과거형/미래형/현재형 키워드
    expect(out).toMatch(/과거형/)
    expect(out).toMatch(/미래형/)
    expect(out).toMatch(/현재형/)
  })

  it('시제 충돌은 meaning_error로 분류된다고 명시', () => {
    expect(out).toMatch(/시제 충돌[\s\S]{0,80}의미\s*오류|시제 충돌[\s\S]{0,80}meaning_error/)
  })

  it('few-shot에 "내일은 학교에 갔어요" → "내일은 학교에 갈 거예요" 시제 충돌 예시', () => {
    expect(out).toContain('내일은 학교에 갔어요')
    expect(out).toContain('내일은 학교에 갈 거예요')
  })
})

describe('[단계19-K] minor reason 포맷 — "원문 → 정답" 단순화', () => {
  const out = buildPersonaSystemPrompt({
    persona: anyPersona(),
    topic: '카페',
    availableToolNames: [],
  })

  it('minor의 reason은 "[원문] → [정답]" 한 줄, 설명 금지 가이드', () => {
    expect(out).toMatch(/minor[\s\S]{0,500}원문.{0,5}→.{0,5}정답/)
    expect(out).toMatch(/minor[\s\S]{0,500}설명\s*문장\s*금지/)
  })

  it('"일 조각 → 한 조각" 예시가 minor reason 형식', () => {
    expect(out).toMatch(/일 조각\s*→\s*한 조각/)
  })
})

describe('[단계19-K.2] 다중 오류 우선순위', () => {
  const out = buildPersonaSystemPrompt({
    persona: anyPersona(),
    topic: '카페',
    availableToolNames: [],
  })

  it('다중 오류 공존 시 severity 높은 것 우선 명시', () => {
    expect(out).toContain('다중 오류 우선순위')
    expect(out).toMatch(/meaning_error[\s\S]{0,100}우선/)
  })

  it('한 번에 주 교정 최대 1개 가이드', () => {
    expect(out).toMatch(/한 번에 주 교정 최대 1개/)
  })
})

describe('[단계19-LLM1, K.2] Q4 페르소나 프롬프트에도 동일 정책', () => {
  const out = buildQ4PersonaSystemPrompt({
    persona: anyPersona(),
    aiRole: '카페 직원',
    aiInformation: '강남 분점, 평일 오픈',
    missionGoals: ['주문하기', '결제하기'],
    conversationHistory: [],
  })

  it('Q4 프롬프트에 시제 검증 규칙 포함', () => {
    expect(out).toContain('시제 검증 규칙')
    expect(out).toContain('과거형')
    expect(out).toContain('미래형')
  })

  it('Q4 프롬프트에 다중 오류 우선순위(K.2) 포함', () => {
    expect(out).toMatch(/K\.2|다중 오류[\s\S]{0,100}우선/)
  })

  it('few-shot에 "내일은 학교에 갔어요" 시제 충돌 예시', () => {
    expect(out).toContain('내일은 학교에 갔어요')
  })
})
