// v1.1 단계 19.16 [페이즈 2]: /api/conversation/free/respond 입력 파싱 가드.
// 클라이언트가 보낸 pronunciationContext / speechFlowContext가 잘못된 형태일 때
// 시스템 프롬프트에 노출되지 않도록 안전 추출 보장.

import { describe, it, expect } from 'vitest'
import { __test__ } from '@/app/api/conversation/free/respond/route'

const { parsePronunciationContext, parseSpeechFlowContext, FEEDBACK_INPUTS_VERSION } = __test__

describe('단계 19.16 — parsePronunciationContext', () => {
  it('null/undefined/non-object → undefined', () => {
    expect(parsePronunciationContext(null)).toBeUndefined()
    expect(parsePronunciationContext(undefined)).toBeUndefined()
    expect(parsePronunciationContext('foo')).toBeUndefined()
    expect(parsePronunciationContext(42)).toBeUndefined()
  })

  it('빈 객체 → undefined (모든 필드 부재)', () => {
    expect(parsePronunciationContext({})).toBeUndefined()
  })

  it('정상 입력 → 그대로 보존', () => {
    const got = parsePronunciationContext({
      overallAccuracy: 60,
      fluencyScore: 70,
      completenessScore: 80,
      weakWords: [
        { word: '발음', score: 30, errorType: 'Mispronunciation' },
        { word: '한국어', score: 40, errorType: 'None' },
      ],
    })
    expect(got).toEqual({
      overallAccuracy: 60,
      fluencyScore: 70,
      completenessScore: 80,
      weakWords: [
        { word: '발음', score: 30, errorType: 'Mispronunciation' },
        { word: '한국어', score: 40, errorType: 'None' },
      ],
    })
  })

  it('잘못된 weakWords 항목은 필터링되어 통과한 항목만 포함', () => {
    const got = parsePronunciationContext({
      weakWords: [
        { word: '정상', score: 30, errorType: 'Mispronunciation' },
        { wrong: 'shape' },
        null,
        { word: '점수 누락' }, // score 없음 → 필터
        { word: '잘못된 errorType', score: 50, errorType: 'BadEnum' },
      ],
    })
    expect(got?.weakWords).toEqual([
      { word: '정상', score: 30, errorType: 'Mispronunciation' },
      { word: '잘못된 errorType', score: 50, errorType: 'None' }, // BadEnum → None 폴백
    ])
  })

  it('NaN / Infinity 점수는 무시', () => {
    const got = parsePronunciationContext({
      overallAccuracy: NaN,
      fluencyScore: Infinity,
      completenessScore: 80,
    })
    expect(got?.overallAccuracy).toBeUndefined()
    expect(got?.fluencyScore).toBeUndefined()
    expect(got?.completenessScore).toBe(80)
  })
})

describe('단계 19.16 — parseSpeechFlowContext', () => {
  it('null/undefined → undefined', () => {
    expect(parseSpeechFlowContext(null)).toBeUndefined()
    expect(parseSpeechFlowContext(undefined)).toBeUndefined()
    expect(parseSpeechFlowContext('foo')).toBeUndefined()
  })

  it('빈 객체 → undefined', () => {
    expect(parseSpeechFlowContext({})).toBeUndefined()
  })

  it('long/short pauses 정상 추출 + count 자동 계산', () => {
    const got = parseSpeechFlowContext({
      longPauses: [{ afterWord: '저는', gapMs: 1800 }],
      shortPauses: [
        { afterWord: '음', gapMs: 900 },
        { afterWord: '그', gapMs: 1200 },
      ],
    })
    expect(got).toEqual({
      longPauses: [{ afterWord: '저는', gapMs: 1800 }],
      shortPauses: [
        { afterWord: '음', gapMs: 900 },
        { afterWord: '그', gapMs: 1200 },
      ],
      longPauseCount: 1,
      shortPauseCount: 2,
    })
  })

  it('명시적 count가 있으면 그 값을 우선 사용', () => {
    const got = parseSpeechFlowContext({
      longPauses: [{ afterWord: '저는', gapMs: 1800 }],
      longPauseCount: 5, // 실제 array length(1)와 다른 명시값
    })
    expect(got?.longPauseCount).toBe(5)
  })

  it('잘못된 pause 항목은 필터링', () => {
    const got = parseSpeechFlowContext({
      longPauses: [
        { afterWord: '정상', gapMs: 1800 },
        { afterWord: '시간 누락' },
        null,
        'not-an-object',
      ],
    })
    expect(got?.longPauses).toEqual([{ afterWord: '정상', gapMs: 1800 }])
  })

  it('totalDurationMs만 있어도 컨텍스트 반환', () => {
    const got = parseSpeechFlowContext({ totalDurationMs: 3500 })
    expect(got?.totalDurationMs).toBe(3500)
  })
})

describe('단계 19.16 — FEEDBACK_INPUTS_VERSION', () => {
  it("'stage19.16'로 고정 (단계 19.13 'stage19.13'과 구분)", () => {
    expect(FEEDBACK_INPUTS_VERSION).toBe('stage19.16')
  })
})
