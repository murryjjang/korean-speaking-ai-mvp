// v1.1 단계 9-2: buildPersonaSystemPrompt 단위 테스트.
//
// - 페르소나 캐릭터 시트 주입
// - 주제 주입
// - 활성 도구 이름 반영
// - 주제 유지·회귀 원칙 + 회귀 표현 5종 포함
// - Few-shot 예시 라벨 + 다이얼로그 형식
// - 마크다운 금지·JSON 출력 형식 규칙 유지
// - forSummary 모드는 JSON·도구·응답원칙 섹션 생략

import { describe, expect, it } from 'vitest'

import { buildPersonaSystemPrompt } from '@/src/lib/llm/build-persona-system-prompt'
import { getPersona } from '@/src/lib/personas'

const sua = () => getPersona('friend_casual')!
const seoyeon = () => getPersona('korean_life_helper')!
const yeongseok = () => getPersona('korean_life_helper_male')!
const jaehyeon = () => getPersona('friend_casual_male')!

describe('buildPersonaSystemPrompt', () => {
  it('페르소나 캐릭터 시트가 시스템 프롬프트 상단에 주입된다', () => {
    const out = buildPersonaSystemPrompt({
      persona: sua(),
      topic: '주말 계획',
      availableToolNames: [],
    })
    expect(out).toContain('수아')
    expect(out).toContain('22살')
    expect(out).toContain('반말')
    expect(out).toContain('헐 진짜?')
  })

  it('주제가 [현재 대화 정보] 섹션에 들어간다', () => {
    const out = buildPersonaSystemPrompt({
      persona: jaehyeon(),
      topic: '맛집 추천',
      availableToolNames: [],
    })
    expect(out).toContain('주제: 맛집 추천')
  })

  it('도구 이름이 활성화된 도구 섹션에 반영된다', () => {
    const out = buildPersonaSystemPrompt({
      persona: seoyeon(),
      topic: '카페 찾기',
      availableToolNames: ['search_place', 'get_weather'],
    })
    expect(out).toContain('사용 가능 도구: search_place, get_weather')
    expect(out).toContain('[도구 활용]')
    expect(out).toContain('search_place')
  })

  it('도구가 없으면 도구 섹션이 비고 "(없음)" 표시', () => {
    const out = buildPersonaSystemPrompt({
      persona: sua(),
      topic: '취미',
      availableToolNames: [],
    })
    expect(out).toContain('사용 가능 도구: (없음)')
    expect(out).not.toContain('[도구 활용]')
  })

  it('v1.1 15-1: 주제 유지·회귀 — 엄격 적용 + 회귀 표현 다양화', () => {
    const out = buildPersonaSystemPrompt({
      persona: seoyeon(),
      topic: '주말 계획',
      availableToolNames: [],
    })
    expect(out).toContain('[주제 유지·회귀 — 엄격 적용]')
    expect(out).toContain('이탈 카운트')
    expect(out).toContain('이탈 1턴')
    expect(out).toContain('이탈 2턴')
    expect(out).toContain('주제 유지가 호응보다 우선')
    expect(out).toContain('근데 그래서')
    expect(out).toContain('아 맞다')
    expect(out).toContain('한 가지 더 말씀드리면')
    expect(out).toContain('다시 주말 계획 얘기로')
  })

  it('v1.1 15-2 / 단계19 LLM-1: 시제 검증 + 교정 강도 분류(예시 포함)', () => {
    const out = buildPersonaSystemPrompt({
      persona: seoyeon(),
      topic: '주말 계획',
      availableToolNames: [],
    })
    // 단계 19에서 "시제·어휘·문법 교정 가이드" → "시제 검증 규칙" + "강도 분류"로 재구성.
    expect(out).toContain('시제 검증 규칙')
    expect(out).toContain('강도 분류')
    expect(out).toContain('어제 학교 가요')
    expect(out).toContain('카드로 교체')
  })

  it('v1.1 16-10-2: motherTongue 미지정 시 reason은 단일 문자열', () => {
    const out = buildPersonaSystemPrompt({
      persona: seoyeon(),
      topic: '주말 계획',
      availableToolNames: [],
    })
    expect(out).toContain('"reason": "교정 이유 또는 칭찬 (한 문장)"')
  })

  it('v1.1 16-10-2: motherTongue="en" → reason 다국어 객체', () => {
    const out = buildPersonaSystemPrompt({
      persona: seoyeon(),
      topic: '주말 계획',
      availableToolNames: [],
      motherTongue: 'en',
    })
    expect(out).toContain('"reason": { "ko"')
    expect(out).toContain('English')
    expect(out).toContain('다국어 객체로 응답')
  })

  it('Few-shot 예시 5종이 시나리오 라벨과 함께 렌더된다', () => {
    const out = buildPersonaSystemPrompt({
      persona: sua(),
      topic: '주말 계획',
      availableToolNames: [],
    })
    expect(out).toContain('[Few-shot 예시')
    expect(out).toContain('[정상]')
    expect(out).toContain('[주제이탈회귀]')
    expect(out).toContain('[도구호출]')
    expect(out).toContain('[모르는정보]')
    expect(out).toContain('[한국어어색]')
    // 다이얼로그 형식 — `학습자: "..."` / `수아: "..."`
    expect(out).toMatch(/학습자: "[^"]+"\s*\n수아: "[^"]+"/)
  })

  it('교정 정책·마크다운 금지·JSON 출력 형식이 유지된다 (v1.0 회귀 없음)', () => {
    const out = buildPersonaSystemPrompt({
      persona: sua(),
      topic: '취미',
      availableToolNames: [],
    })
    expect(out).toContain('[교정 역할')
    expect(out).toContain('자연스럽게 잘 말씀하셨어요.')
    expect(out).toContain('평문(plain text)')
    expect(out).toContain('마크다운')
    expect(out).toMatch(/\*\*/)
    expect(out).toContain('"npc_response"')
    expect(out).toContain('"learner_correction"')
  })

  it('레거시 페르소나(korean_teacher_coach)는 fewShotExamples가 비어 있어도 시스템 프롬프트가 정상 조립된다', () => {
    // v1.1 단계 11에서 cafe_staff_friendly 등 Q4 3명에 Few-shot 5종이 추가됐으므로,
    // 진짜 빈 레거시는 korean_teacher_coach 하나만 남았다.
    const coach = getPersona('korean_teacher_coach')!
    const out = buildPersonaSystemPrompt({
      persona: coach,
      topic: '문법 질문 답변',
      availableToolNames: [],
    })
    expect(out).toContain('한국어 선생님')
    expect(out).toContain('주제: 문법 질문 답변')
    expect(out).not.toContain('[Few-shot 예시')
    expect(out).toContain('[교정 역할')
  })

  it('forSummary=true일 때 응답 원칙·도구·주제 유지·JSON 출력 형식 섹션을 생략한다', () => {
    const out = buildPersonaSystemPrompt({
      persona: yeongseok(),
      topic: '비자 연장',
      availableToolNames: ['search_address'],
      forSummary: true,
    })
    expect(out).toContain('영석')
    expect(out).toContain('주제: 비자 연장')
    expect(out).toContain('[교정 역할')
    expect(out).toContain('[Few-shot 예시')
    expect(out).not.toContain('[응답 원칙]')
    expect(out).not.toContain('[도구 활용]')
    expect(out).not.toContain('[주제 유지·회귀 — 엄격 적용]')
    expect(out).not.toContain('"npc_response"')
  })

  it('자유 대화 4명 모두에 대해 캐릭터 이름·5개 시나리오·회귀 표현이 들어간다 (스모크)', () => {
    const personas = [sua(), jaehyeon(), seoyeon(), yeongseok()]
    for (const p of personas) {
      const out = buildPersonaSystemPrompt({
        persona: p,
        topic: '테스트 주제',
        availableToolNames: [],
      })
      expect(out, `${p.personaId} missing nameKo`).toContain(p.nameKo)
      expect(out, `${p.personaId} missing scenarios`).toMatch(/\[정상\][\s\S]+\[주제이탈회귀\][\s\S]+\[도구호출\][\s\S]+\[모르는정보\][\s\S]+\[한국어어색\]/)
    }
  })
})
