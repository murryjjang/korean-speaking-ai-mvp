// v1.1 단계 18 [F]: STT 환각 새 패턴 + 반복 문장 dedup 회귀 보호.

import { describe, expect, it } from 'vitest'

import {
  dedupeRepeatedSentences,
  isLikelySttHallucination,
  sanitizeTranscript,
} from '@/src/lib/stt-sanity'

describe('isLikelySttHallucination — 단계 18 신규 패턴', () => {
  const HALLUCINATION_CASES: Array<[string, string]> = [
    ['자막은 설정에서', '자막은 설정에서 한국어를 선택할 수 있습니다.'],
    ['선택하실 수 있습니다', '재생 속도를 선택하실 수 있습니다.'],
    ['오늘도 시청해주셔서', '오늘도 시청해주셔서 감사합니다.'],
    ['구독과 좋아요', '구독과 좋아요 부탁드려요.'],
    ['자막  설정에서 (공백 여러개)', '자막  설정에서 변경하세요.'],
  ]
  for (const [label, sample] of HALLUCINATION_CASES) {
    it(`환각으로 감지: ${label}`, () => {
      expect(isLikelySttHallucination(sample)).toBe(true)
    })
  }

  const VALID_CASES = [
    '안녕하세요. 저는 한국어를 배우고 있습니다.',
    '카페에서 아이스 아메리카노를 주문했습니다.',
    '오늘 학교에 늦게 도착했어요.',
  ]
  for (const sample of VALID_CASES) {
    it(`정상 발화 통과: ${sample.slice(0, 20)}…`, () => {
      expect(isLikelySttHallucination(sample)).toBe(false)
    })
  }
})

describe('dedupeRepeatedSentences — 단계 18', () => {
  it('단일 문장 → 그대로', () => {
    const r = dedupeRepeatedSentences('안녕하세요.')
    expect(r.text).toBe('안녕하세요.')
    expect(r.droppedCount).toBe(0)
  })

  it('연속 동일 문장 2회 → 1회로 축약 + dropped 1', () => {
    const r = dedupeRepeatedSentences('안녕하세요. 안녕하세요.')
    expect(r.text).toBe('안녕하세요.')
    expect(r.droppedCount).toBe(1)
  })

  it('연속 동일 문장 3회 → 1회 + dropped 2', () => {
    const r = dedupeRepeatedSentences('자막은 설정에서. 자막은 설정에서. 자막은 설정에서.')
    expect(r.droppedCount).toBe(2)
    expect(r.text).toBe('자막은 설정에서.')
  })

  it('서로 다른 문장 2개 → 보존', () => {
    const r = dedupeRepeatedSentences('안녕하세요. 카페에 왔어요.')
    expect(r.text).toBe('안녕하세요. 카페에 왔어요.')
    expect(r.droppedCount).toBe(0)
  })

  it('빈 문자열 → 빈 문자열', () => {
    const r = dedupeRepeatedSentences('')
    expect(r.text).toBe('')
    expect(r.droppedCount).toBe(0)
  })

  it('대소문자/공백 무시 dedup', () => {
    const r = dedupeRepeatedSentences('HELLO World! hello world!')
    expect(r.droppedCount).toBe(1)
  })
})

describe('sanitizeTranscript 종합 [F]', () => {
  it('환각 → 빈 문자열 + hallucination: true', () => {
    const r = sanitizeTranscript('자막은 설정에서 한국어를 선택할 수 있습니다.')
    expect(r.text).toBe('')
    expect(r.hallucination).toBe(true)
  })

  it('정상 + 반복 → dedup된 텍스트', () => {
    const r = sanitizeTranscript('안녕하세요. 안녕하세요. 한국어를 공부합니다.')
    expect(r.hallucination).toBe(false)
    expect(r.dedupedCount).toBe(1)
    expect(r.text).toBe('안녕하세요. 한국어를 공부합니다.')
  })

  it('정상 1문장 → 그대로', () => {
    const r = sanitizeTranscript('카페에서 아이스 아메리카노를 주문했습니다.')
    expect(r.text).toBe('카페에서 아이스 아메리카노를 주문했습니다.')
    expect(r.hallucination).toBe(false)
    expect(r.dedupedCount).toBe(0)
  })
})
