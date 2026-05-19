// v1.1 단계 19.17 [페이즈 2]: pause 임계 하향 + 시스템 프롬프트 언급 임계 완화.
//
// 단계 19.16 시연에서 "음...그...." 같은 명확한 멈춤 발화가 LLM 피드백에 미언급되는
// 회귀가 발견됨. 페이즈 0 진단 결과 — PAUSE_SHORT_MS=800ms가 너무 커서 500~700ms
// 단어 간 멈춤이 감지조차 안 되는 시나리오 C와, "shortPauseCount≤1 → 침묵" 가이드의
// 시나리오 A가 결합된 결과. 본 테스트는 임계 하향과 가이드 완화를 검증한다.

import { describe, it, expect } from 'vitest'
import {
  PAUSE_SHORT_MS,
  PAUSE_LONG_MS,
  buildSpeechFlowContext,
} from '@/src/lib/pronunciation-context'
import { buildPersonaSystemPrompt } from '@/src/lib/llm/build-persona-system-prompt'
import { PERSONAS } from '@/src/lib/personas'
import type { PronunciationResult, SpeechFlowContext } from '@/src/types/providers'

const PERSONA = PERSONAS[0]

function build(speechFlow: SpeechFlowContext | null): string {
  return buildPersonaSystemPrompt({
    persona: PERSONA,
    topic: '한국 음식',
    availableToolNames: [],
    speechFlowContext: speechFlow,
  })
}

function pron(wordResults: PronunciationResult['wordResults']): PronunciationResult {
  return {
    overallScore: 90,
    accuracyScore: 90,
    fluencyScore: 90,
    completenessScore: 90,
    wordResults,
  } as PronunciationResult
}

describe('단계 19.17 — pause 임계 하향', () => {
  it('PAUSE_SHORT_MS=500, PAUSE_LONG_MS=1000으로 고정', () => {
    expect(PAUSE_SHORT_MS).toBe(500)
    expect(PAUSE_LONG_MS).toBe(1000)
  })

  it('600ms gap은 short pause로 감지 (이전 800ms 임계에선 감지 X)', () => {
    const r = pron([
      { word: '음', accuracyScore: 80, errorType: 'None', offsetMs: 0, durationMs: 200 },
      // gap = 600ms (500 ≤ gap < 1000)
      { word: '그', accuracyScore: 80, errorType: 'None', offsetMs: 800, durationMs: 200 },
    ])
    const sf = buildSpeechFlowContext(r)
    expect(sf?.shortPauseCount).toBe(1)
    expect(sf?.longPauseCount).toBe(0)
    expect(sf?.shortPauses?.[0]).toEqual({ afterWord: '음', gapMs: 600 })
  })

  it('1100ms gap은 long pause로 감지 (이전 1500ms 임계에선 short)', () => {
    const r = pron([
      { word: '음식', accuracyScore: 80, errorType: 'None', offsetMs: 0, durationMs: 400 },
      // gap = 1100ms (≥ 1000)
      { word: '맛있어요', accuracyScore: 80, errorType: 'None', offsetMs: 1500, durationMs: 600 },
    ])
    const sf = buildSpeechFlowContext(r)
    expect(sf?.longPauseCount).toBe(1)
    expect(sf?.longPauses?.[0]).toEqual({ afterWord: '음식', gapMs: 1100 })
  })

  it('450ms gap은 여전히 미감지 (너무 잦은 트리거 방지)', () => {
    const r = pron([
      { word: 'a', accuracyScore: 90, errorType: 'None', offsetMs: 0, durationMs: 200 },
      { word: 'b', accuracyScore: 90, errorType: 'None', offsetMs: 650, durationMs: 200 },
    ])
    const sf = buildSpeechFlowContext(r)
    expect(sf?.shortPauseCount).toBe(0)
    expect(sf?.longPauseCount).toBe(0)
  })
})

describe('단계 19.17 — 시스템 프롬프트 발화 흐름 가이드 완화', () => {
  it('표시 임계가 동적 (500~999ms / ≥1000ms)', () => {
    const prompt = build({
      longPauses: [{ afterWord: '저는', gapMs: 1100 }],
      shortPauses: [{ afterWord: '음', gapMs: 600 }],
      longPauseCount: 1,
      shortPauseCount: 1,
    })
    expect(prompt).toContain(`긴 멈춤(≥${PAUSE_LONG_MS}ms)`)
    expect(prompt).toContain(`짧은 멈춤(${PAUSE_SHORT_MS}~${PAUSE_LONG_MS - 1}ms)`)
  })

  it('긴 멈춤 1회만 있어도 격려 가이드 적용 (이전 ≥2회 → ≥1회 완화)', () => {
    const prompt = build({
      longPauses: [{ afterWord: '음식', gapMs: 1500 }],
      longPauseCount: 1,
    })
    expect(prompt).toMatch(/긴 멈춤이 1회 이상이거나 짧은 멈춤이 2회 이상이면.*다정한 한 마디로 격려/)
  })

  it('짧은 멈춤 1회만 있으면 언급은 "선택" — 호응 안에 녹이는 옵션 제공', () => {
    const prompt = build({
      shortPauses: [{ afterWord: '음', gapMs: 700 }],
      shortPauseCount: 1,
    })
    // 단계 19.16 strict "별도 언급 없이" → 19.17 "별도 언급은 선택"
    expect(prompt).toMatch(/짧은 멈춤이 1회만 있으면 별도 언급은 선택/)
    expect(prompt).not.toMatch(/짧은 멈춤이 1회 이하면 별도 언급 없이/)
  })

  it('짧은 멈춤 2회 이상은 격려 가이드 적용', () => {
    const prompt = build({
      shortPauses: [
        { afterWord: '음', gapMs: 600 },
        { afterWord: '그', gapMs: 700 },
      ],
      shortPauseCount: 2,
    })
    expect(prompt).toMatch(/긴 멈춤이 1회 이상이거나 짧은 멈춤이 2회 이상이면.*다정한 한 마디로 격려/)
  })

  it('한 턴 최대 1회 가드는 보존 (잦은 트리거 방지)', () => {
    const prompt = build({
      shortPauses: [
        { afterWord: 'a', gapMs: 600 },
        { afterWord: 'b', gapMs: 700 },
        { afterWord: 'c', gapMs: 800 },
      ],
      shortPauseCount: 3,
    })
    expect(prompt).toMatch(/한 턴에 흐름 코멘트는 최대 1회/)
  })

  it('NPC가 친구이지 코치가 아니라는 톤 가이드는 보존 (단계 19.16 효과)', () => {
    const prompt = build({
      longPauses: [{ afterWord: 'A', gapMs: 1500 }],
      longPauseCount: 1,
    })
    expect(prompt).toMatch(/친구이지 코치가 아닙니다/)
  })

  it('pause 0회면 흐름 블록 자체 미포함 (회귀 방지)', () => {
    const prompt = build({ longPauseCount: 0, shortPauseCount: 0 })
    expect(prompt).not.toContain('[직전 학습자 발화 — 발화 흐름]')
  })
})
