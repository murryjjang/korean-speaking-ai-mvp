// ============================================================
// SM-2 간격 반복 알고리즘 (Task 1.4 자동 단어장, D-012)
//
// 표준 SuperMemo SM-2 순수 구현. quality 0-5 → ease_factor / interval_days /
// repetitions / next_review_at 갱신. `vocab_cards` 스키마와 1:1
// (ease_factor numeric(4,2) ≥ 1.30, interval_days ≥ 0, repetitions ≥ 0).
//
// 순수함수 — DB·시간 의존 없음(now 주입). 경계값(q=0/2/3/5) 결정론 단위테스트 가드.
// ============================================================

export const DEFAULT_EASE = 2.5
export const MIN_EASE = 1.3

export type SrsState = {
  easeFactor: number
  intervalDays: number
  repetitions: number
}

export type SrsReview = SrsState & {
  nextReviewAt: Date
  lastQuality: number
  lastReviewedAt: Date
}

/** 신규 카드 초기 상태 (vocab_cards default 와 동일: EF 2.50 · interval 1 · rep 0). */
export function newCardState(): SrsState {
  return { easeFactor: DEFAULT_EASE, intervalDays: 1, repetitions: 0 }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function clampQuality(q: number): number {
  return Math.max(0, Math.min(5, Math.round(q)))
}

/**
 * 한 번의 복습 결과로 카드 상태를 갱신한다 (표준 SM-2).
 * - q ≥ 3(성공): rep 0→interval 1, rep 1→6, 이후 round(interval×EF). rep++.
 * - q < 3(실패): rep 0, interval 1.
 * - EF는 매 회 갱신: EF + (0.1 − (5−q)(0.08 + (5−q)0.02)), 하한 1.30.
 */
export function reviewCard(state: SrsState, quality: number, now: Date = new Date()): SrsReview {
  const q = clampQuality(quality)
  let { easeFactor, intervalDays, repetitions } = state

  if (q >= 3) {
    if (repetitions === 0) intervalDays = 1
    else if (repetitions === 1) intervalDays = 6
    else intervalDays = Math.round(intervalDays * easeFactor)
    repetitions += 1
  } else {
    repetitions = 0
    intervalDays = 1
  }

  // EF 갱신 (q 반영) + 하한.
  easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  if (easeFactor < MIN_EASE) easeFactor = MIN_EASE
  easeFactor = round2(easeFactor)

  const nextReviewAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000)
  return { easeFactor, intervalDays, repetitions, nextReviewAt, lastQuality: q, lastReviewedAt: now }
}
