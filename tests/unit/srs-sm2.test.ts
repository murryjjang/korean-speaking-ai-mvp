// Task 1.4 — SM-2 경계값 결정론 가드 (q=0/2/3/5, EF 하한, interval 진행)
import { describe, expect, it } from 'vitest'
import { DEFAULT_EASE, MIN_EASE, newCardState, reviewCard, type SrsState } from '@/src/lib/srs/sm2'

const NOW = new Date('2026-05-21T00:00:00Z')
const daysBetween = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 86400000)

describe('SM-2 신규 카드 초기 상태', () => {
  it('EF 2.5 · interval 1 · rep 0 (vocab_cards default 정합)', () => {
    expect(newCardState()).toEqual({ easeFactor: 2.5, intervalDays: 1, repetitions: 0 })
  })
})

describe('SM-2 경계값 quality (신규 카드)', () => {
  it('q=5 → interval 1, rep 1, EF 2.6, next +1d', () => {
    const r = reviewCard(newCardState(), 5, NOW)
    expect(r.intervalDays).toBe(1)
    expect(r.repetitions).toBe(1)
    expect(r.easeFactor).toBe(2.6)
    expect(daysBetween(r.nextReviewAt, NOW)).toBe(1)
    expect(r.lastQuality).toBe(5)
  })

  it('q=3 → interval 1, rep 1, EF 2.36 (성공 하한 근처)', () => {
    const r = reviewCard(newCardState(), 3, NOW)
    expect(r.intervalDays).toBe(1)
    expect(r.repetitions).toBe(1)
    expect(r.easeFactor).toBe(2.36)
  })

  it('q=2 → 실패: rep 0, interval 1, EF 2.18', () => {
    const r = reviewCard(newCardState(), 2, NOW)
    expect(r.repetitions).toBe(0)
    expect(r.intervalDays).toBe(1)
    expect(r.easeFactor).toBe(2.18)
  })

  it('q=0 → 실패: rep 0, interval 1, EF 1.7', () => {
    const r = reviewCard(newCardState(), 0, NOW)
    expect(r.repetitions).toBe(0)
    expect(r.intervalDays).toBe(1)
    expect(r.easeFactor).toBe(1.7)
  })
})

describe('SM-2 interval 진행 (연속 성공)', () => {
  it('rep1 + q5 → interval 6', () => {
    const s: SrsState = { easeFactor: 2.6, intervalDays: 1, repetitions: 1 }
    const r = reviewCard(s, 5, NOW)
    expect(r.intervalDays).toBe(6)
    expect(r.repetitions).toBe(2)
    expect(r.easeFactor).toBe(2.7)
  })

  it('rep2 + q5 → interval round(6×2.7)=16', () => {
    const s: SrsState = { easeFactor: 2.7, intervalDays: 6, repetitions: 2 }
    const r = reviewCard(s, 5, NOW)
    expect(r.intervalDays).toBe(16)
    expect(r.repetitions).toBe(3)
    expect(daysBetween(r.nextReviewAt, NOW)).toBe(16)
  })

  it('성공 누적 후 실패(q<3) → interval 1·rep 0 리셋, EF는 갱신', () => {
    const s: SrsState = { easeFactor: 2.5, intervalDays: 16, repetitions: 3 }
    const r = reviewCard(s, 1, NOW)
    expect(r.intervalDays).toBe(1)
    expect(r.repetitions).toBe(0)
    expect(r.easeFactor).toBeLessThan(2.5)
  })
})

describe('SM-2 EF 하한 1.30', () => {
  it('EF 1.3에서 q=0 반복해도 1.30 미만으로 안 내려감', () => {
    const r = reviewCard({ easeFactor: MIN_EASE, intervalDays: 1, repetitions: 0 }, 0, NOW)
    expect(r.easeFactor).toBe(MIN_EASE)
    expect(r.easeFactor).toBeGreaterThanOrEqual(MIN_EASE)
  })

  it('낮은 EF + 낮은 q 누적 수렴', () => {
    let s: SrsState = { easeFactor: 1.4, intervalDays: 1, repetitions: 0 }
    for (let i = 0; i < 5; i++) s = reviewCard(s, 1, NOW)
    expect(s.easeFactor).toBe(MIN_EASE)
  })
})

describe('SM-2 quality 클램프', () => {
  it('범위 밖/소수 quality 클램프(반올림 후 0-5)', () => {
    expect(reviewCard(newCardState(), 9, NOW).lastQuality).toBe(5)
    expect(reviewCard(newCardState(), -2, NOW).lastQuality).toBe(0)
    expect(reviewCard(newCardState(), 3.4, NOW).lastQuality).toBe(3)
  })

  it('ease_factor는 항상 numeric(4,2) 범위 2자리', () => {
    const r = reviewCard(newCardState(), 4, NOW)
    expect(Number.isInteger(r.easeFactor * 100)).toBe(true)
    expect(r.easeFactor).toBeLessThan(100)
  })
})

void DEFAULT_EASE
