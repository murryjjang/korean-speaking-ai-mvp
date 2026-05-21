// Task 1.4 — 자동 등록 선정 로직 결정론 가드 (core/challenging, basic 제외, dedup)
import { describe, expect, it } from 'vitest'
import { ENROLL_CATEGORIES, selectEnrollTermIds, type ContentVocabRow } from '@/src/lib/srs/enroll'

describe('selectEnrollTermIds', () => {
  it('core·challenging만 선정, basic 제외', () => {
    const rows: ContentVocabRow[] = [
      { term_id: 't1', category: 'basic' },
      { term_id: 't2', category: 'core' },
      { term_id: 't3', category: 'challenging' },
    ]
    expect(selectEnrollTermIds(rows).sort()).toEqual(['t2', 't3'])
  })

  it('같은 term이 여러 category로 와도 중복 제거', () => {
    const rows: ContentVocabRow[] = [
      { term_id: 't1', category: 'core' },
      { term_id: 't1', category: 'challenging' },
      { term_id: 't2', category: 'core' },
    ]
    expect(selectEnrollTermIds(rows).sort()).toEqual(['t1', 't2'])
  })

  it('basic만 있으면 빈 배열', () => {
    expect(selectEnrollTermIds([{ term_id: 't1', category: 'basic' }])).toEqual([])
  })

  it('빈 입력 → 빈 배열', () => {
    expect(selectEnrollTermIds([])).toEqual([])
  })

  it('ENROLL_CATEGORIES = core·challenging (basic 미포함)', () => {
    expect([...ENROLL_CATEGORIES].sort()).toEqual(['challenging', 'core'])
    expect((ENROLL_CATEGORIES as readonly string[]).includes('basic')).toBe(false)
  })
})
