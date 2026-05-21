// backlog #13 — 자유대화 종합 점수 = 발음 평균 × 주제 일치(topic_adherence) 멀티플라이어.
//
// free-conversation-client.tsx 에서 추출한 순수 함수. 클라이언트는 이 모듈을 import 하며
// 동작은 불변(추출 전 인라인 const·Math.round 와 동일). 추출 목적은 #13 "주제 이탈 →
// 점수 ≤50" 규칙을 결정론적 단위 테스트(tests/unit/free-conversation-score.test.ts)로
// 가드하기 위함 — 헤드리스 e2e 로는 오디오 발음평가에 의존해 실점수 재현이 비현실적.

export type TopicAdherence = 'on' | 'partial' | 'off'

// 주제 이탈일수록 감점: on=감점 없음, partial=0.75, off=0.5.
export const ADHERENCE_MULTIPLIER: Record<TopicAdherence, number> = {
  on: 1,
  partial: 0.75,
  off: 0.5,
}

/**
 * 발음 평균(rawAvg, 0~100)에 주제 일치 멀티플라이어를 곱해 반올림한 종합 점수.
 * off(×0.5) → rawAvg 가 0~100 이면 결과는 항상 ≤50 (#13 핵심 규칙).
 */
export function adjustConversationScore(rawAvg: number, adherence: TopicAdherence): number {
  return Math.round(rawAvg * ADHERENCE_MULTIPLIER[adherence])
}
