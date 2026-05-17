// v1.1 단계 19.8 [환각 차단]: 자유 대화/Q4 페르소나 시스템 프롬프트에 허위 정보 생성
// 금지 블록이 포함되는지 회귀 보호.
//
// 시험운영 시 "루왁커피 → 루아커피"처럼 실재하지 않는 가게/제품을 그럴듯하게
// fabrication하는 회귀가 보고됨. 두 빌더(자유 대화 + Q4) 모두 시스템 프롬프트에
// 환각 차단 규칙과 예시를 명시한다.

import { describe, expect, it } from 'vitest'

import { buildPersonaSystemPrompt } from '@/src/lib/llm/build-persona-system-prompt'
import { buildQ4PersonaSystemPrompt } from '@/src/lib/llm/build-q4-persona-system-prompt'
import type { Persona } from '@/src/lib/personas'

const dummyPersona: Persona = {
  personaId: 'friend_casual',
  nameKo: '수아',
  role: '친구',
  ageHint: '20대',
  description: '활발한 친구',
  emoji: '😊',
  systemPromptTemplate: '활발한 친구처럼 반말로 자연스럽게 대화하세요.',
  fewShotExamples: [],
} as unknown as Persona

describe('[단계19.8-환각차단] 자유 대화 시스템 프롬프트', () => {
  const prompt = buildPersonaSystemPrompt({
    persona: dummyPersona,
    topic: '주말 명소 추천',
    availableToolNames: [],
  })

  it('허위 정보 생성 금지 블록 포함', () => {
    expect(prompt).toMatch(/허위 정보 생성 금지/)
  })

  it('모르는 사실은 솔직히 답하라는 규칙 포함', () => {
    expect(prompt).toMatch(/잘 모르겠어요/)
    expect(prompt).toMatch(/모르는 사실은/)
  })

  it('비슷한 이름 추측 금지 (루왁→루아 같은 fabrication 차단)', () => {
    expect(prompt).toMatch(/비슷한 이름을 추측해서/)
    expect(prompt).toMatch(/루왁/)
    expect(prompt).toMatch(/루아/)
  })

  it('환각 차단 예시 다수 포함 (가게·가수·지명·음식)', () => {
    expect(prompt).toMatch(/카페/)
    expect(prompt).toMatch(/가수/)
    expect(prompt).toMatch(/한국 음식/)
  })

  it('교정 블록보다 앞에 위치 (응답 톤 결정에 우선 적용)', () => {
    const antiIdx = prompt.indexOf('허위 정보 생성 금지')
    const correctionIdx = prompt.indexOf('교정 역할')
    expect(antiIdx).toBeGreaterThan(0)
    expect(correctionIdx).toBeGreaterThan(antiIdx)
  })
})

describe('[단계19.8-환각차단] Q4 대화 미션 시스템 프롬프트', () => {
  const prompt = buildQ4PersonaSystemPrompt({
    persona: dummyPersona,
    aiRole: '카페 점원',
    aiInformation: '카페에서 음료를 판매한다',
    missionGoals: ['음료 주문', '결제'],
    conversationHistory: [],
  })

  it('허위 정보 생성 금지 블록 포함', () => {
    expect(prompt).toMatch(/허위 정보 생성 금지/)
  })

  it('비슷한 이름 추측 금지', () => {
    expect(prompt).toMatch(/비슷한 이름을 추측해서/)
    expect(prompt).toMatch(/루왁/)
  })

  it('환각 차단 예시 — 카페 시나리오에 맞는 회귀 안내', () => {
    expect(prompt).toMatch(/오늘은 저희 매장에서/)
  })
})

describe('[단계19.8-환각차단] 4 mother_tongue 케이스 모두 환각 차단 블록 유지', () => {
  for (const mt of ['ko', 'en', 'vi', 'ar'] as const) {
    it(`mother_tongue=${mt} — 자유 대화 환각 차단 블록 존재`, () => {
      const prompt = buildPersonaSystemPrompt({
        persona: dummyPersona,
        topic: '주말 명소',
        availableToolNames: [],
        motherTongue: mt,
      })
      expect(prompt).toMatch(/허위 정보 생성 금지/)
    })
    it(`mother_tongue=${mt} — Q4 환각 차단 블록 존재`, () => {
      const prompt = buildQ4PersonaSystemPrompt({
        persona: dummyPersona,
        aiRole: '카페 점원',
        aiInformation: '카페',
        missionGoals: ['주문'],
        conversationHistory: [],
        motherTongue: mt,
      })
      expect(prompt).toMatch(/허위 정보 생성 금지/)
    })
  }
})
