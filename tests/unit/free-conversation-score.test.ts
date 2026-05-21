// M5 / backlog #13 — 자유대화 주제이탈 점수 보정 결정론적 가드.
//
// 헤드리스 e2e 로는 오디오 발음평가(pronScore)에 의존해 실점수 ≤50 재현이 비현실적이라,
// 점수 계산을 순수 함수로 추출(src/lib/conversation/free-conversation-score.ts)해 여기서
// 결정론적으로 검증한다. = #13 "주제 이탈 → 종합 점수 ≤50" 의 진짜 가드.

import { describe, expect, it } from 'vitest'

import {
  ADHERENCE_MULTIPLIER,
  adjustConversationScore,
  type TopicAdherence,
} from '@/src/lib/conversation/free-conversation-score'

describe('#13 자유대화 주제 일치 멀티플라이어', () => {
  it('on=1.0 / partial=0.75 / off=0.5', () => {
    expect(ADHERENCE_MULTIPLIER.on).toBe(1)
    expect(ADHERENCE_MULTIPLIER.partial).toBe(0.75)
    expect(ADHERENCE_MULTIPLIER.off).toBe(0.5)
  })
})

describe('#13 adjustConversationScore', () => {
  it('on → 점수 불변(반올림)', () => {
    expect(adjustConversationScore(88, 'on')).toBe(88)
    expect(adjustConversationScore(100, 'on')).toBe(100)
    expect(adjustConversationScore(0, 'on')).toBe(0)
  })

  it('partial → ×0.75 반올림', () => {
    expect(adjustConversationScore(80, 'partial')).toBe(60)
    expect(adjustConversationScore(100, 'partial')).toBe(75)
    expect(adjustConversationScore(90, 'partial')).toBe(68) // 67.5 → 68
  })

  it('off → ×0.5 반올림', () => {
    expect(adjustConversationScore(100, 'off')).toBe(50)
    expect(adjustConversationScore(90, 'off')).toBe(45)
    expect(adjustConversationScore(81, 'off')).toBe(41) // 40.5 → 41
  })

  it('핵심 규칙: off 는 발음 평균(0~100)이 어떻든 종합 ≤50', () => {
    for (let raw = 0; raw <= 100; raw++) {
      expect(adjustConversationScore(raw, 'off')).toBeLessThanOrEqual(50)
    }
  })

  it('보정 강도: off ≤ partial ≤ on (단조)', () => {
    const raw = 100
    const order: TopicAdherence[] = ['off', 'partial', 'on']
    const scores = order.map((a) => adjustConversationScore(raw, a))
    expect(scores[0]).toBeLessThanOrEqual(scores[1])
    expect(scores[1]).toBeLessThanOrEqual(scores[2])
  })
})
