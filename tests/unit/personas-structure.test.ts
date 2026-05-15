// v1.1 단계 9-1: personas.ts 구조 확장 회귀 — 자유 대화 4명·필드·캐릭터 시트 보장.
//
// - 자유 대화 4명(friend_casual, friend_casual_male, korean_life_helper,
//   korean_life_helper_male)이 PERSONAS에 모두 존재
// - 신규 필드(systemPromptTemplate, fewShotExamples, voiceOptions)가 정상 채워짐
// - 4명의 fewShotExamples가 5개 시나리오를 모두 포함 (정상·주제이탈회귀·도구호출·
//   모르는정보·한국어어색)
// - 회귀 표현 다양화 — 주제이탈회귀 예시에 "근데 그래서"/"아 맞다"/"그건 그렇고"/"그건
//   그렇고"/"그런데"/"한 가지 더 말씀드리면" 중 최소 하나 포함
// - 마크다운 문법(**, *, # 등)이 캐릭터 시트·Few-shot에 절대 없음 (TTS 안전)

import { describe, expect, it } from 'vitest'

import { getPersona, PERSONAS, type FewShotScenario } from '@/src/lib/personas'

const FREE_CONVERSATION_IDS = [
  'friend_casual',
  'friend_casual_male',
  'korean_life_helper',
  'korean_life_helper_male',
] as const

const REQUIRED_SCENARIOS: FewShotScenario[] = [
  '정상',
  '주제이탈회귀',
  '도구호출',
  '모르는정보',
  '한국어어색',
]

const RECOVERY_PHRASES = [
  '근데 그래서',
  '아 맞다',
  '그건 그렇고',
  '그런데',
  '한 가지 더 말씀드리면',
]

const MARKDOWN_FORBIDDEN_PATTERN = /\*\*|^#|^- |`|\|/m

describe('personas.ts 구조 확장 (v1.1 단계 9-1)', () => {
  it('자유 대화 4명이 PERSONAS에 등록되어 있다', () => {
    for (const id of FREE_CONVERSATION_IDS) {
      expect(getPersona(id), `missing persona: ${id}`).toBeTruthy()
    }
  })

  it('자유 대화 4명의 nameKo는 캐릭터 이름(수아·재현·서연·영석)이다', () => {
    expect(getPersona('friend_casual')?.nameKo).toBe('수아')
    expect(getPersona('friend_casual_male')?.nameKo).toBe('재현')
    expect(getPersona('korean_life_helper')?.nameKo).toBe('서연')
    expect(getPersona('korean_life_helper_male')?.nameKo).toBe('영석')
  })

  it('자유 대화 4명의 defaultVoice가 사양과 일치한다', () => {
    expect(getPersona('friend_casual')?.defaultVoice).toBe('ko-KR-SunHiNeural')
    expect(getPersona('friend_casual_male')?.defaultVoice).toBe('ko-KR-YuChanNeural')
    expect(getPersona('korean_life_helper')?.defaultVoice).toBe('ko-KR-SeoHyeonNeural')
    expect(getPersona('korean_life_helper_male')?.defaultVoice).toBe('ko-KR-InJoonNeural')
  })

  it('자유 대화 4명의 systemPromptTemplate에 캐릭터 이름이 포함된다', () => {
    expect(getPersona('friend_casual')?.systemPromptTemplate).toContain('수아')
    expect(getPersona('friend_casual_male')?.systemPromptTemplate).toContain('재현')
    expect(getPersona('korean_life_helper')?.systemPromptTemplate).toContain('서연')
    expect(getPersona('korean_life_helper_male')?.systemPromptTemplate).toContain('영석')
  })

  it('자유 대화 4명의 fewShotExamples가 5개 시나리오를 모두 포함한다', () => {
    for (const id of FREE_CONVERSATION_IDS) {
      const p = getPersona(id)
      expect(p?.fewShotExamples.length).toBeGreaterThanOrEqual(5)
      const scenarios = new Set(p?.fewShotExamples.map((e) => e.scenario))
      for (const s of REQUIRED_SCENARIOS) {
        expect(scenarios.has(s), `${id} missing scenario: ${s}`).toBe(true)
      }
    }
  })

  it('자유 대화 4명의 주제이탈회귀 예시에 회귀 표현이 들어 있다', () => {
    for (const id of FREE_CONVERSATION_IDS) {
      const p = getPersona(id)
      const recoveryEx = p?.fewShotExamples.find((e) => e.scenario === '주제이탈회귀')
      expect(recoveryEx, `${id} missing 주제이탈회귀 example`).toBeTruthy()
      const hasRecoveryPhrase = RECOVERY_PHRASES.some((ph) => recoveryEx!.response.includes(ph))
      expect(hasRecoveryPhrase, `${id} recovery example missing recovery phrase: ${recoveryEx?.response}`).toBe(true)
    }
  })

  it('자유 대화 4명의 캐릭터 시트·Few-shot에 마크다운 문법이 없다 (TTS 안전)', () => {
    for (const id of FREE_CONVERSATION_IDS) {
      const p = getPersona(id)!
      // systemPromptTemplate 자체에는 캐릭터 시트만 들어가므로 **, # 등 금지.
      // (단, 하이픈으로 시작하는 불릿은 LLM 가독성 위해 허용 — buildPersonaSystemPrompt에서
      // 출력 형식 규칙으로 마크다운 금지를 별도 명시한다.)
      expect(p.systemPromptTemplate).not.toMatch(/\*\*/)
      expect(p.systemPromptTemplate).not.toMatch(/`/)
      for (const ex of p.fewShotExamples) {
        expect(ex.response, `markdown in ${id}/${ex.scenario}`).not.toMatch(MARKDOWN_FORBIDDEN_PATTERN)
      }
    }
  })

  it('자유 대화 4명에 voiceOptions가 최소 1개 채워져 있다', () => {
    for (const id of FREE_CONVERSATION_IDS) {
      const p = getPersona(id)
      expect(p?.voiceOptions?.length ?? 0).toBeGreaterThanOrEqual(1)
      expect(p?.voiceOptions?.[0]).toBe(p?.defaultVoice)
    }
  })

  it('레거시 페르소나(cafe_staff_friendly 등)는 systemPromptTemplate 스텁을 가진다', () => {
    const legacyIds = [
      'cafe_staff_friendly',
      'admin_staff_clear',
      'event_partner_professional',
      'korean_teacher_coach',
    ]
    for (const id of legacyIds) {
      const p = getPersona(id)
      expect(p, `missing legacy persona: ${id}`).toBeTruthy()
      expect(p?.systemPromptTemplate.length).toBeGreaterThan(0)
      expect(p?.fewShotExamples).toEqual([])
    }
  })

  it('PERSONAS 배열 길이가 정확히 8 (레거시 4 + 자유 대화 4)', () => {
    expect(PERSONAS).toHaveLength(8)
  })
})
