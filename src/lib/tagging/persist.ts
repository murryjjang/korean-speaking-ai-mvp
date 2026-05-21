// ============================================================
// 태깅 결과 → DB 적재 (단일 출처 — batch 스크립트 + admin 수동 태깅 공유)
//
// pass 판정 콘텐츠를 content_tags / vocabulary_terms / content_vocabulary /
// pronunciation_focus 에 idempotent 적재 + questions.is_tagged 갱신.
// 호출자(service_role client)가 RLS write-staff 를 충족해야 한다.
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CEFR_VALUES,
  CONTENT_TAGGING_PROMPT_VERSION,
  parsePronunciationFocus,
  type CefrLevel,
  type ContentTagResult,
  type TaggingInput,
  type VocabCategory,
} from '@/src/lib/tagging/schema'

// vocabulary 분류(content-상대) → 어휘 절대 CEFR 근사 (basic=-1·core=0·challenging=+1).
// prompt v3 는 per-term CEFR 미출력 → 근사 (BACKLOG: prompt v4 per-term CEFR).
export function cefrForCategory(contentCefr: CefrLevel, cat: VocabCategory): CefrLevel {
  const idx = CEFR_VALUES.indexOf(contentCefr)
  const off = cat === 'basic' ? -1 : cat === 'challenging' ? 1 : 0
  return CEFR_VALUES[Math.max(0, Math.min(CEFR_VALUES.length - 1, idx + off))]
}

export async function persistTag(
  supabase: SupabaseClient,
  input: TaggingInput,
  result: ContentTagResult,
): Promise<void> {
  const cid = input.content_id
  const { error: ctErr } = await supabase.from('content_tags').upsert(
    {
      content_id: cid,
      topic_tags: result.topic_tags,
      cefr_level: result.cefr_level,
      register: result.register,
      register_consistency: result.register_consistency,
      learning_objective: result.learning_objective,
      prompt_version: CONTENT_TAGGING_PROMPT_VERSION,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'content_id' },
  )
  if (ctErr) throw new Error(`content_tags: ${ctErr.message}`)

  for (const cat of ['basic', 'core', 'challenging'] as VocabCategory[]) {
    for (const term of result.vocabulary[cat]) {
      const { data: vt, error: vtErr } = await supabase
        .from('vocabulary_terms')
        .upsert({ term, cefr_level: cefrForCategory(result.cefr_level, cat) }, { onConflict: 'term' })
        .select('id')
        .single()
      if (vtErr) throw new Error(`vocabulary_terms(${term}): ${vtErr.message}`)
      const { error: cvErr } = await supabase
        .from('content_vocabulary')
        .upsert(
          { content_id: cid, term_id: vt.id, category: cat },
          { onConflict: 'content_id,term_id,category', ignoreDuplicates: true },
        )
      if (cvErr) throw new Error(`content_vocabulary(${term}): ${cvErr.message}`)
    }
  }

  await supabase.from('pronunciation_focus').delete().eq('content_id', cid)
  const pf = result.pronunciation_focus
    .map(parsePronunciationFocus)
    .filter((x): x is { term: string; rule: string } => x !== null)
    .map((x) => ({ content_id: cid, term: x.term, rule: x.rule }))
  if (pf.length) {
    const { error: pfErr } = await supabase.from('pronunciation_focus').insert(pf)
    if (pfErr) throw new Error(`pronunciation_focus: ${pfErr.message}`)
  }

  const { error: qErr } = await supabase
    .from('questions')
    .update({ is_tagged: true, last_tagged_at: new Date().toISOString() })
    .eq('id', cid)
  if (qErr) throw new Error(`questions.is_tagged: ${qErr.message}`)
}
