// v1.1 단계 19.17 [페이즈 1]: 자유 대화 NPC LLM 점수 구간별 차등 피드백.
//
// 단계 19.16에서는 발음 가이드가 npc_response 톤만 규율했고, learner_correction.reason의
// 폴백 칭찬 "자연스럽게 잘 말씀하셨어요"는 발음 점수와 무관하게 노출되어 60점 환각 칭찬이
// 발생했다. 본 테스트는:
//   1) buildPersonaSystemPrompt가 점수 구간별 reason 가이드를 시스템 프롬프트에 주입하는지,
//   2) /api/conversation/free/respond의 fallbackCorrectionReason이 발음 < 70점에서 평면
//      칭찬을 돌려주지 않는지를 검증한다.

import { describe, it, expect } from 'vitest'
import { buildPersonaSystemPrompt } from '@/src/lib/llm/build-persona-system-prompt'
import { PERSONAS } from '@/src/lib/personas'
import { __test__ } from '@/app/api/conversation/free/respond/route'
import type { PronunciationContext } from '@/src/types/providers'

const PERSONA = PERSONAS[0]
const { fallbackCorrectionReason, REASON_PRAISE_MIN_ACCURACY } = __test__

function build(ctx: PronunciationContext | null): string {
  return buildPersonaSystemPrompt({
    persona: PERSONA,
    topic: '한국 음식',
    availableToolNames: [],
    pronunciationContext: ctx,
  })
}

describe('단계 19.17 — 점수 구간별 reason 가이드 (build-persona-system-prompt)', () => {
  it('4구간 (0-49 / 50-69 / 70-84 / 85+) 라벨이 모두 포함된다', () => {
    const prompt = build({ overallAccuracy: 60 })
    expect(prompt).toContain('0~49점')
    expect(prompt).toContain('50~69점')
    expect(prompt).toContain('70~84점')
    expect(prompt).toContain('85점 이상')
  })

  it('< 70점 구간에서는 "자연스럽게 잘 말씀하셨어요" 평면 칭찬을 reason에 쓰지 말라고 명시', () => {
    const prompt = build({ overallAccuracy: 60 })
    // 0~49 라벨이 "자연스럽게 잘 말씀하셨어요" 같은 평면 칭찬을 reason에 금지한다고 표시.
    expect(prompt).toMatch(/0~49점.*잘 말씀하셨어요.*절대 쓰지/s)
    expect(prompt).toMatch(/50~69점.*평면 칭찬 금지/s)
  })

  it('reason 가이드는 [교정 역할] 섹션의 기본 칭찬 문구를 덮어쓴다고 명시', () => {
    const prompt = build({ overallAccuracy: 30 })
    expect(prompt).toMatch(/덮어씁니다.*correction_severity.*"none".*< 70점.*평면 칭찬 금지/s)
  })

  it('npc_response와 reason 양쪽에 적용된다고 명시', () => {
    const prompt = build({ overallAccuracy: 45 })
    expect(prompt).toMatch(/npc_response.*reason.*모두에 적용/)
  })

  it('pronunciationContext 미전달 시 점수 구간 가이드 미포함 (회귀 방지)', () => {
    const prompt = build(null)
    expect(prompt).not.toContain('0~49점')
    expect(prompt).not.toContain('50~69점')
    // 기본 correctionBlock의 칭찬 문구는 그대로 유지(회귀 보호).
    expect(prompt).toContain('자연스럽게 잘 말씀하셨어요.')
  })

  it('weakWords 모델링·한 턴 한 단어·친구 톤 가이드는 보존된다 (단계 19.16 효과)', () => {
    const prompt = build({
      overallAccuracy: 55,
      weakWords: [{ word: '발음', score: 30, errorType: 'Mispronunciation' }],
    })
    expect(prompt).toMatch(/한 턴에 한 단어/)
    expect(prompt).toMatch(/페르소나.*친구 톤.*점수 언급 금지/)
  })

  it('85+ 구간은 평면 칭찬 허용 (회귀 방지: 칭찬 자체 차단 X)', () => {
    const prompt = build({ overallAccuracy: 90 })
    expect(prompt).toMatch(/85점 이상.*자연스러운 칭찬 가능/s)
  })
})

describe('단계 19.17 — REASON_PRAISE_MIN_ACCURACY 임계 (route)', () => {
  it('70으로 고정 (페이즈 0 진단에 따라)', () => {
    expect(REASON_PRAISE_MIN_ACCURACY).toBe(70)
  })
})

describe('단계 19.17 — fallbackCorrectionReason (route)', () => {
  it('pronunciationContext가 없으면 기본 칭찬 (회귀 보호)', () => {
    expect(fallbackCorrectionReason(undefined)).toBe('자연스럽게 잘 말씀하셨어요.')
  })

  it('overallAccuracy 미상이면 기본 칭찬 (회귀 보호)', () => {
    expect(fallbackCorrectionReason({})).toBe('자연스럽게 잘 말씀하셨어요.')
  })

  it('70점 이상이면 기본 칭찬 그대로', () => {
    expect(fallbackCorrectionReason({ overallAccuracy: 70 })).toBe('자연스럽게 잘 말씀하셨어요.')
    expect(fallbackCorrectionReason({ overallAccuracy: 85 })).toBe('자연스럽게 잘 말씀하셨어요.')
    expect(fallbackCorrectionReason({ overallAccuracy: 100 })).toBe('자연스럽게 잘 말씀하셨어요.')
  })

  it('50~69점이면 평면 칭찬 대신 친근 짚기', () => {
    const r60 = fallbackCorrectionReason({ overallAccuracy: 60 })
    expect(r60).not.toContain('자연스럽게 잘 말씀')
    expect(r60).not.toContain('잘했어요')
    expect(r60).toMatch(/또박또박|자연스러워/)
  })

  it('0~49점이면 더 강한 격려 톤 (다시 해보자)', () => {
    const r30 = fallbackCorrectionReason({ overallAccuracy: 30 })
    expect(r30).not.toContain('자연스럽게 잘 말씀')
    expect(r30).toMatch(/천천히|다시/)
  })

  it('경계값: 49는 매우 낮음, 50은 낮음, 69는 낮음, 70은 칭찬', () => {
    expect(fallbackCorrectionReason({ overallAccuracy: 49 })).toMatch(/천천히|다시/)
    const r50 = fallbackCorrectionReason({ overallAccuracy: 50 })
    expect(r50).not.toContain('자연스럽게 잘 말씀')
    const r69 = fallbackCorrectionReason({ overallAccuracy: 69 })
    expect(r69).not.toContain('자연스럽게 잘 말씀')
    expect(fallbackCorrectionReason({ overallAccuracy: 70 })).toBe('자연스럽게 잘 말씀하셨어요.')
  })
})
