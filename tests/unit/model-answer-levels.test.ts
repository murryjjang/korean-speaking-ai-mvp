// Task 1.5 — 모범답안 목표 CEFR 선정 결정론 가드
import { describe, expect, it } from 'vitest'
import { targetLevels } from '@/src/lib/model-answers/levels'

describe('targetLevels (목표 + 도전 수준)', () => {
  it('A1 → [A1, A2]', () => expect(targetLevels('A1')).toEqual(['A1', 'A2']))
  it('B2 → [B2, C1]', () => expect(targetLevels('B2')).toEqual(['B2', 'C1']))
  it('C1 → [C1, C2]', () => expect(targetLevels('C1')).toEqual(['C1', 'C2']))
  it('C2 → [C2] (한 단계 위 없음, 중복 제거)', () => expect(targetLevels('C2')).toEqual(['C2']))
  it('불명/미태깅 → [B1] 기본', () => {
    expect(targetLevels('')).toEqual(['B1'])
    expect(targetLevels('Z9')).toEqual(['B1'])
  })
})
