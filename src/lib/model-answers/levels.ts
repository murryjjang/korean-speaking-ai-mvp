// 모범답안 목표 CEFR 수준 선정 (Task 1.5, D-012 패턴 — 순수함수)
//
// default: 콘텐츠 CEFR(목표 수준) + 한 단계 위(도전 수준). C2 clamp · 중복 제거.
// side-by-side 비교에 쓰는 2개 수준. (개수는 env 로 사후 조정 가능.)

import { CEFR_VALUES, type CefrLevel, isCefrLevel } from '@/src/lib/tagging/schema'

/** 콘텐츠 CEFR → 모범답안 생성 대상 수준 배열(목표 + 도전, 최대 2). */
export function targetLevels(contentCefr: string): CefrLevel[] {
  if (!isCefrLevel(contentCefr)) return ['B1'] // 미태깅/불명 → 중간 기본 1개
  const idx = CEFR_VALUES.indexOf(contentCefr)
  const up = CEFR_VALUES[Math.min(CEFR_VALUES.length - 1, idx + 1)]
  return up === contentCefr ? [contentCefr] : [contentCefr, up]
}
