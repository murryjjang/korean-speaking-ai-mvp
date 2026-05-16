// v1.1 단계 19.5 [LLM-1.2]: Sino-Korean 수사 + 고유어 단위 일관성.
//
// V4 검증: "1조각" → "한 조각"은 잡지만 "3잔" → "세 잔"은 놓침.
// 같은 규칙(고유어 단위 + 고유어 수사)인데 일관성 부족 → 시스템 프롬프트에
// 명시적 규칙 + few-shot 예시 추가.

import { describe, expect, it } from 'vitest'

import { buildPersonaSystemPrompt } from '@/src/lib/llm/build-persona-system-prompt'
import { buildQ4PersonaSystemPrompt } from '@/src/lib/llm/build-q4-persona-system-prompt'
import { PERSONAS } from '@/src/lib/personas'

function anyPersona() {
  return PERSONAS[0]
}

describe('[단계19.5-LLM1.2] 수사·단위 일관성 — 자유 대화 프롬프트', () => {
  const out = buildPersonaSystemPrompt({
    persona: anyPersona(),
    topic: '카페',
    availableToolNames: [],
  })

  it('수사·단위 일관성 섹션이 명시되어 있다', () => {
    expect(out).toMatch(/수사.단위 일관성/)
    expect(out).toContain('LLM-1.2')
  })

  it('고유어 단위명사 목록 + 고유어 수사 매핑 가이드', () => {
    expect(out).toContain('잔')
    expect(out).toContain('조각')
    expect(out).toContain('마리')
    expect(out).toMatch(/한·두·세|1→한/)
    expect(out).toMatch(/다섯|5→다섯/)
  })

  it('아라비아 숫자 + 고유어 단위 minor 분류 가이드', () => {
    expect(out).toMatch(/아라비아 숫자.{0,80}고유어 단위/)
    expect(out).toMatch(/minor/)
  })

  it('한자어 단위명사 예외(분·원·년 등)는 그대로 명시', () => {
    expect(out).toMatch(/한자어 단위명사.{0,80}분|분\(分\)|한자어 단위.{0,80}년/)
  })

  it('few-shot에 "3잔 → 세 잔" 예시', () => {
    expect(out).toContain('3잔')
    expect(out).toContain('세 잔')
  })

  it('few-shot에 "2명 → 두 명" 예시', () => {
    expect(out).toContain('2명')
    expect(out).toContain('두 명')
  })

  it('few-shot에 "5권 → 다섯 권" 예시', () => {
    expect(out).toContain('5권')
    expect(out).toContain('다섯 권')
  })

  it('few-shot에 "1마리 → 한 마리" 예시', () => {
    expect(out).toContain('1마리')
    expect(out).toContain('한 마리')
  })

  it('기존 "일 조각 → 한 조각" 회귀 없음', () => {
    expect(out).toContain('일 조각')
    expect(out).toContain('한 조각')
  })
})

describe('[단계19.5-LLM1.2] Q4 페르소나 프롬프트에도 동일 규칙', () => {
  const out = buildQ4PersonaSystemPrompt({
    persona: anyPersona(),
    aiRole: '카페 직원',
    aiInformation: '강남 분점',
    missionGoals: ['주문하기'],
    conversationHistory: [],
  })

  it('Q4 프롬프트에 수사·단위 일관성 규칙 포함', () => {
    expect(out).toMatch(/수사.단위 일관성/)
    expect(out).toContain('LLM-1.2')
  })

  it('Q4 프롬프트에 "3잔 → 세 잔" few-shot', () => {
    expect(out).toContain('3잔')
    expect(out).toContain('세 잔')
  })

  it('Q4 프롬프트에 "2명 → 두 명" few-shot', () => {
    expect(out).toContain('2명')
    expect(out).toContain('두 명')
  })

  it('Q4 프롬프트 learner_grammar_note 포맷 예시', () => {
    expect(out).toMatch(/learner_grammar_note[\s\S]{0,200}3잔.{0,10}→.{0,10}세 잔/)
  })
})
