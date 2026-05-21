// ============================================================
// 자동 단어 등록 (Task 1.4, D-012a)
//
// 트리거: 콘텐츠 학습 통과 시 해당 content 의 content_vocabulary 중
//   **core·challenging** 어휘를 학습자 vocab_cards 에 등록(basic 제외).
// idempotent: vocab_cards unique(user_id, term_id) → ON CONFLICT DO NOTHING.
//   (자유대화 transcript 기반 등록은 BL-#4.)
//
// 선정 로직(selectEnrollTermIds)은 순수함수 → 결정론 단위테스트.
// upsert(enrollTermsForUser)는 주입 client 사용.
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import type { VocabCategory } from '@/src/lib/tagging/schema'

export const ENROLL_CATEGORIES: readonly VocabCategory[] = ['core', 'challenging']

export type ContentVocabRow = { term_id: string; category: string }

/** content_vocabulary 행에서 등록 대상 term_id 선정 — core·challenging, 중복 제거. */
export function selectEnrollTermIds(rows: ContentVocabRow[]): string[] {
  const set = new Set<string>()
  for (const r of rows) {
    if ((ENROLL_CATEGORIES as readonly string[]).includes(r.category)) set.add(r.term_id)
  }
  return [...set]
}

/** 선정된 term 들을 vocab_cards 에 idempotent 등록. 반환: 신규 등록 수. */
export async function enrollTermsForUser(
  supabase: SupabaseClient,
  userId: string,
  termIds: string[],
): Promise<{ enrolled: number }> {
  if (termIds.length === 0) return { enrolled: 0 }
  const rows = termIds.map((term_id) => ({ user_id: userId, term_id }))
  const { data, error } = await supabase
    .from('vocab_cards')
    .upsert(rows, { onConflict: 'user_id,term_id', ignoreDuplicates: true })
    .select('id')
  if (error) throw new Error(`vocab_cards enroll: ${error.message}`)
  return { enrolled: data?.length ?? 0 }
}

/** 콘텐츠 통과 시 호출: content_vocabulary fetch → 선정 → 등록. */
export async function enrollFromContent(
  supabase: SupabaseClient,
  userId: string,
  contentId: string,
): Promise<{ enrolled: number; candidates: number }> {
  const { data, error } = await supabase
    .from('content_vocabulary')
    .select('term_id, category')
    .eq('content_id', contentId)
  if (error) throw new Error(`content_vocabulary fetch: ${error.message}`)
  const termIds = selectEnrollTermIds((data ?? []) as ContentVocabRow[])
  const { enrolled } = await enrollTermsForUser(supabase, userId, termIds)
  return { enrolled, candidates: termIds.length }
}
