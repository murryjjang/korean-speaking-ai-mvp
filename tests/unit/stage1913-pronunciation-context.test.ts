// v1.1 단계 19.13 [페이즈 1·2]: Azure 결과 → LLM 컨텍스트 변환 단위 테스트.

import { describe, it, expect } from 'vitest'
import {
  buildPronunciationContext,
  buildSpeechFlowContext,
  PAUSE_SHORT_MS,
  PAUSE_LONG_MS,
  WEAK_WORD_THRESHOLD,
} from '@/src/lib/pronunciation-context'
import type { PronunciationResult } from '@/src/types/providers'

function makePron(overrides: Partial<PronunciationResult> = {}): PronunciationResult {
  return {
    normalizedScore: 80,
    wordScores: [],
    feedback: '',
    providerName: 'azure',
    providerVersion: '1.0',
    latencyMs: 100,
    ...overrides,
  }
}

describe('buildPronunciationContext', () => {
  it('null 입력은 undefined를 반환한다', () => {
    expect(buildPronunciationContext(null)).toBeUndefined()
    expect(buildPronunciationContext(undefined)).toBeUndefined()
  })

  it('점수도 wordResults도 없으면 undefined를 반환한다', () => {
    const r = makePron({ accuracyScore: undefined, fluencyScore: undefined, wordResults: [] })
    expect(buildPronunciationContext(r)).toBeUndefined()
  })

  it('점수만 있고 wordResults가 비어 있으면 weakWords는 없다', () => {
    const r = makePron({ accuracyScore: 88.7, fluencyScore: 75.2, completenessScore: 95 })
    const ctx = buildPronunciationContext(r)
    expect(ctx).toBeDefined()
    expect(ctx!.overallAccuracy).toBe(89)
    expect(ctx!.fluencyScore).toBe(75)
    expect(ctx!.completenessScore).toBe(95)
    expect(ctx!.weakWords).toBeUndefined()
  })

  it(`accuracy < ${WEAK_WORD_THRESHOLD} 또는 errorType != 'None'인 단어만 weakWords에 포함한다`, () => {
    const r = makePron({
      accuracyScore: 80,
      wordResults: [
        { word: '안녕하세요', accuracyScore: 95, errorType: 'None' },
        { word: '학교', accuracyScore: 55, errorType: 'Mispronunciation' },
        { word: '갑니다', accuracyScore: 80, errorType: 'None' },
        { word: '음료', accuracyScore: 68, errorType: 'None' },
        { word: '주문', accuracyScore: 90, errorType: 'Insertion' },
      ],
    })
    const ctx = buildPronunciationContext(r)
    expect(ctx!.weakWords).toHaveLength(3) // 학교(55), 음료(68), 주문(90 insertion)
    expect(ctx!.weakWords![0].word).toBe('학교') // 점수 낮은 순
    expect(ctx!.weakWords![0].errorType).toBe('Mispronunciation')
    expect(ctx!.weakWords![1].word).toBe('음료')
    expect(ctx!.weakWords![2].errorType).toBe('Insertion')
  })

  it('weakWords는 최대 6개로 제한된다', () => {
    const r = makePron({
      wordResults: Array.from({ length: 10 }, (_, i) => ({
        word: `w${i}`,
        accuracyScore: 30 + i,
        errorType: 'None' as const,
      })),
    })
    const ctx = buildPronunciationContext(r)
    expect(ctx!.weakWords).toHaveLength(6)
  })
})

describe('buildSpeechFlowContext', () => {
  it('null 입력은 undefined를 반환한다', () => {
    expect(buildSpeechFlowContext(null)).toBeUndefined()
  })

  it('wordResults가 2개 미만이면 undefined', () => {
    const r = makePron({ wordResults: [{ word: '안녕', accuracyScore: 95, errorType: 'None' }] })
    expect(buildSpeechFlowContext(r)).toBeUndefined()
  })

  it(`${PAUSE_LONG_MS}ms 이상은 longPauses, ${PAUSE_SHORT_MS}~${PAUSE_LONG_MS - 1}ms는 shortPauses`, () => {
    // v1.1 단계 19.17: 임계 하향 (800/1500 → 500/1000). 픽스처 gap을 새 임계에
    // 맞춰 — long: 2100ms (≥1000), short: 700ms (500~999), no-pause: 300ms (<500).
    const r = makePron({
      wordResults: [
        { word: '한국', accuracyScore: 90, errorType: 'None', offsetMs: 0, durationMs: 500 },
        // 멈춤 2100ms (long) → "한국" 다음
        { word: '음식', accuracyScore: 90, errorType: 'None', offsetMs: 2600, durationMs: 500 },
        // 멈춤 700ms (short) → "음식" 다음
        { word: '다', accuracyScore: 90, errorType: 'None', offsetMs: 3800, durationMs: 200 },
        // 멈춤 300ms (no pause) → "다" 다음
        { word: '좋아', accuracyScore: 90, errorType: 'None', offsetMs: 4300, durationMs: 500 },
      ],
    })
    const sf = buildSpeechFlowContext(r)
    expect(sf).toBeDefined()
    expect(sf!.longPauseCount).toBe(1)
    expect(sf!.shortPauseCount).toBe(1)
    expect(sf!.longPauses![0]).toEqual({ afterWord: '한국', gapMs: 2100 })
    expect(sf!.shortPauses![0]).toEqual({ afterWord: '음식', gapMs: 700 })
    expect(sf!.totalDurationMs).toBe(4800) // 4300 + 500 - 0
  })

  it('offsetMs/durationMs 미보유 단어 쌍은 건너뛴다', () => {
    const r = makePron({
      wordResults: [
        { word: 'a', accuracyScore: 90, errorType: 'None' },
        { word: 'b', accuracyScore: 90, errorType: 'None' },
      ],
    })
    expect(buildSpeechFlowContext(r)).toBeUndefined()
  })

  it('멈춤이 없으면 longPauses/shortPauses는 빈 배열 (count=0), totalDuration만 노출', () => {
    const r = makePron({
      wordResults: [
        { word: 'a', accuracyScore: 90, errorType: 'None', offsetMs: 0, durationMs: 300 },
        { word: 'b', accuracyScore: 90, errorType: 'None', offsetMs: 400, durationMs: 300 },
      ],
    })
    const sf = buildSpeechFlowContext(r)
    expect(sf).toBeDefined()
    expect(sf!.longPauseCount).toBe(0)
    expect(sf!.shortPauseCount).toBe(0)
    expect(sf!.totalDurationMs).toBe(700)
  })
})
