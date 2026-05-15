// v1.1 단계 11-2: Q4 대화 미션 페르소나 시스템 프롬프트 빌더 단위 테스트.

import { describe, expect, it } from 'vitest'

import {
  buildQ4PersonaSystemPrompt,
  __test__,
} from '@/src/lib/llm/build-q4-persona-system-prompt'
import { getPersona } from '@/src/lib/personas'
import type { DialogueTurnInput } from '@/src/providers/conversation'

const cafe = () => getPersona('cafe_staff_friendly')!
const admin = () => getPersona('admin_staff_clear')!
const event = () => getPersona('event_partner_professional')!

describe('buildQ4PersonaSystemPrompt', () => {
  it('페르소나 캐릭터 시트가 상단 [정체성·성격·말투] 섹션에 주입된다', () => {
    const out = buildQ4PersonaSystemPrompt({
      persona: cafe(),
      aiRole: '카페 점원',
      aiInformation: '한국 도심의 친절한 카페 점원',
      missionGoals: ['음료 선택'],
      conversationHistory: [],
    })
    expect(out).toContain('[당신의 정체성·성격·말투]')
    expect(out).toContain('카페 사장')
    expect(out).toContain('어서오세요')
  })

  it('aiRole·aiInformation·missionGoals가 정확히 주입된다', () => {
    const out = buildQ4PersonaSystemPrompt({
      persona: cafe(),
      aiRole: '카페 점원',
      aiInformation: '한국 도심의 친절한 카페 점원. 음료와 디저트 주문을 받는다.',
      missionGoals: ['음료 선택', '수량 확인', '매장/포장 결정', '결제 의사 표현'],
      conversationHistory: [],
    })
    expect(out).toContain('역할: 카페 점원')
    expect(out).toContain('한국 도심의 친절한 카페 점원')
    expect(out).toContain('1. 음료 선택')
    expect(out).toContain('2. 수량 확인')
    expect(out).toContain('3. 매장/포장 결정')
    expect(out).toContain('4. 결제 의사 표현')
  })

  it('교정 역할 + 출력 JSON 형식 + 응답 원칙(반말 금지)이 유지된다 (v1.0 회귀 없음)', () => {
    const out = buildQ4PersonaSystemPrompt({
      persona: admin(),
      aiRole: '행정실 직원',
      aiInformation: '',
      missionGoals: [],
      conversationHistory: [],
    })
    expect(out).toContain('[응답 원칙]')
    expect(out).toContain('반말 절대 금지')
    expect(out).toContain('[교정 역할')
    // v1.1 15-2: learner_grammar_note 필드를 사용하도록 정책 전환.
    expect(out).toContain('learner_grammar_note에 한 줄로 정리')
    expect(out).toContain('"npc_utterance"')
    expect(out).toContain('"off_topic_detected"')
    expect(out).toContain('"learner_grammar_note"')
  })

  it('Few-shot 예시 5종이 시나리오 라벨과 함께 렌더된다', () => {
    const out = buildQ4PersonaSystemPrompt({
      persona: cafe(),
      aiRole: '카페 점원',
      aiInformation: '',
      missionGoals: ['음료 선택'],
      conversationHistory: [],
    })
    expect(out).toContain('[Few-shot 예시')
    expect(out).toContain('[정상]')
    expect(out).toContain('[주제이탈회귀]')
    expect(out).toContain('[모르는정보]')
    expect(out).toContain('[한국어어색]')
    expect(out).toMatch(/학습자: "[^"]+"\s*\n친절한 카페 점원: "[^"]+"/)
  })

  it('aiInformation이 비어 있어도 안전하게 "(추가 정보 없음)"으로 표기', () => {
    const out = buildQ4PersonaSystemPrompt({
      persona: cafe(),
      aiRole: '점원',
      aiInformation: '',
      missionGoals: [],
      conversationHistory: [],
    })
    expect(out).toContain('(추가 정보 없음)')
    expect(out).toContain('(미션 목표 없음)')
  })

  it('대화 이력은 마지막 N턴까지만 포함된다', () => {
    const turns: DialogueTurnInput[] = []
    for (let i = 0; i < 30; i++) {
      turns.push({ role: 'student', text: `학습자 발화 ${i}` })
      turns.push({ role: 'ai', text: `AI 응답 ${i}` })
    }
    const out = buildQ4PersonaSystemPrompt({
      persona: event(),
      aiRole: '협력기관 담당자',
      aiInformation: '',
      missionGoals: [],
      conversationHistory: turns,
    })
    expect(out).not.toContain('학습자 발화 0')
    expect(out).toContain('학습자 발화 29')
    expect(out).toContain('AI 응답 29')
  })

  it('대화 이력이 비면 "(대화 시작)"', () => {
    const out = buildQ4PersonaSystemPrompt({
      persona: cafe(),
      aiRole: '카페 점원',
      aiInformation: '',
      missionGoals: [],
      conversationHistory: [],
    })
    expect(out).toContain('[기존 대화 이력]')
    expect(out).toContain('(대화 시작)')
  })

  it('Q4 페르소나 3명 모두에 대해 캐릭터 이름·5개 시나리오가 들어간다 (스모크)', () => {
    const personas = [cafe(), admin(), event()]
    for (const p of personas) {
      const out = buildQ4PersonaSystemPrompt({
        persona: p,
        aiRole: p.role,
        aiInformation: '',
        missionGoals: ['test goal'],
        conversationHistory: [],
      })
      expect(out, `${p.personaId} missing nameKo`).toContain(p.nameKo)
      expect(out, `${p.personaId} missing scenarios`).toMatch(/\[정상\][\s\S]+\[주제이탈회귀\][\s\S]+\[모르는정보\][\s\S]+\[한국어어색\]/)
    }
  })

  it('도구 호출(function calling)·response_format 변경 관련 가이드가 들어가지 않는다 (Q4는 도구 없음)', () => {
    const out = buildQ4PersonaSystemPrompt({
      persona: cafe(),
      aiRole: '카페 점원',
      aiInformation: '',
      missionGoals: [],
      conversationHistory: [],
    })
    expect(out).not.toContain('[도구 활용]')
    expect(out).not.toContain('사용 가능 도구')
    expect(out).not.toContain('function calling')
  })

  it('Q4_MAX_HISTORY_TURNS는 10', () => {
    expect(__test__.Q4_MAX_HISTORY_TURNS).toBe(10)
  })

  it('v1.1 15-1: 주제 유지·회귀 — 엄격 적용 (이탈 카운트 + 다양화 표현)', () => {
    const out = buildQ4PersonaSystemPrompt({
      persona: cafe(),
      aiRole: '카페 점원',
      aiInformation: '',
      missionGoals: ['음료 선택'],
      conversationHistory: [],
    })
    expect(out).toContain('[주제 유지·회귀 — 엄격 적용]')
    expect(out).toContain('이탈 카운트')
    expect(out).toContain('이탈 1턴')
    expect(out).toContain('이탈 2턴')
    expect(out).toContain('주제 유지가 호응보다 우선')
  })

  it('v1.1 15-2: 시제·어휘·문법 교정 가이드(예시 포함)', () => {
    const out = buildQ4PersonaSystemPrompt({
      persona: cafe(),
      aiRole: '카페 점원',
      aiInformation: '',
      missionGoals: ['음료 선택'],
      conversationHistory: [],
    })
    expect(out).toContain('자유 대화 수준으로 강화')
    expect(out).toContain('어제 학교 가요')
    expect(out).toContain('카드로 교체')
  })
})
