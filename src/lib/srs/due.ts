// 복습 대기(due) 카드 조회 헬퍼 (Task 1.4, D-012d)
//
// next_review_at <= now() 인 카드를 일일 임계(기본 20)만큼. 세션 클라이언트(RLS owner)로
// 본인 카드만. API(due/quiz)와 대시보드(today-tasks)가 공유.

import type { SupabaseClient } from '@supabase/supabase-js'

export const DEFAULT_DAILY_LIMIT = 20

/** env VOCAB_DAILY_LIMIT > 0 이면 그 값, 아니면 기본 20. (사용자별 조정은 후속) */
export function dailyLimit(): number {
  const raw = Number(process.env.VOCAB_DAILY_LIMIT)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_DAILY_LIMIT
}

export type DueCard = {
  id: string
  term_id: string
  term: string
  cefr_level: string
  ease_factor: number
  interval_days: number
  repetitions: number
}

/** 복습 대기 카드 (term 조인). limit 기본 일일 임계. */
export async function getDueCards(supabase: SupabaseClient, limit = dailyLimit()): Promise<DueCard[]> {
  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from('vocab_cards')
    .select('id, term_id, ease_factor, interval_days, repetitions, vocabulary_terms(term, cefr_level)')
    .lte('next_review_at', nowIso)
    .order('next_review_at', { ascending: true })
    .limit(limit)
  if (error) throw new Error(`due cards: ${error.message}`)
  return (data ?? []).map((r) => {
    const vt = (Array.isArray(r.vocabulary_terms) ? r.vocabulary_terms[0] : r.vocabulary_terms) as
      | { term?: string; cefr_level?: string }
      | null
    return {
      id: r.id as string,
      term_id: r.term_id as string,
      term: vt?.term ?? '',
      cefr_level: vt?.cefr_level ?? '',
      ease_factor: Number(r.ease_factor),
      interval_days: Number(r.interval_days),
      repetitions: Number(r.repetitions),
    }
  })
}

/** 복습 대기 카드 수 (대시보드 배지용). */
export async function getDueCount(supabase: SupabaseClient): Promise<number> {
  const nowIso = new Date().toISOString()
  const { count, error } = await supabase
    .from('vocab_cards')
    .select('*', { count: 'exact', head: false })
    .lte('next_review_at', nowIso)
    .limit(1)
  if (error) throw new Error(`due count: ${error.message}`)
  return count ?? 0
}
