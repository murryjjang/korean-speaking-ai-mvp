// POST /api/vocab/gloss { term_id, lang? } — 캐시된 뜻·예문 반환, 없으면 on-demand 생성·캐시.
// 캐시 읽기=세션(RLS read-auth), 생성 쓰기=service_role(RLS write-staff). Task 1.4 / D-012c.
import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/src/lib/supabase/server'
import { getSupabaseAdminClient } from '@/src/lib/supabase/admin'
import {
  buildVocabularyGlossSystemPrompt,
  buildVocabularyGlossUserPrompt,
  isGlossLang,
  parseVocabGloss,
  type GlossLang,
} from '@/src/lib/prompts/vocabulary-gloss'

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return NextResponse.json({ error: 'supabase_unconfigured' }, { status: 503 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  let body: { term_id?: string; lang?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  const term_id = body.term_id
  const lang: GlossLang = isGlossLang(body.lang) ? body.lang : 'en'
  if (!term_id) return NextResponse.json({ error: 'missing term_id' }, { status: 400 })

  // 1) 캐시 조회.
  const { data: cached } = await supabase
    .from('vocabulary_glosses')
    .select('gloss, example_ko, example_translated')
    .eq('term_id', term_id)
    .eq('lang', lang)
    .maybeSingle()
  if (cached) return NextResponse.json({ ...cached, lang, cached: true })

  // 2) 미캐시 → term 조회 후 LLM 생성.
  const { data: term } = await supabase
    .from('vocabulary_terms')
    .select('term, cefr_level')
    .eq('id', term_id)
    .single()
  if (!term) return NextResponse.json({ error: 'term_not_found' }, { status: 404 })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ gloss: null, lang, cached: false, reason: 'no_openai' })

  let result
  try {
    const { OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey })
    const model = process.env.OPENAI_GLOSS_MODEL ?? process.env.OPENAI_EVAL_MODEL ?? 'gpt-4o-mini'
    const res = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: buildVocabularyGlossSystemPrompt(lang) },
        { role: 'user', content: buildVocabularyGlossUserPrompt(term.term as string, term.cefr_level as string) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 300,
    })
    result = parseVocabGloss(res.choices[0]?.message?.content ?? '{}')
  } catch (e) {
    return NextResponse.json({ gloss: null, lang, cached: false, reason: e instanceof Error ? e.message : 'gen_failed' })
  }
  if (!result) return NextResponse.json({ gloss: null, lang, cached: false, reason: 'parse_failed' })

  // 3) 캐시 적재 (service_role — write-staff RLS 우회). best-effort.
  const admin = getSupabaseAdminClient()
  if (admin) {
    await admin
      .from('vocabulary_glosses')
      .upsert(
        { term_id, lang, gloss: result.gloss, example_ko: result.example_ko, example_translated: result.example_translated, generated_at: new Date().toISOString() },
        { onConflict: 'term_id,lang', ignoreDuplicates: false },
      )
  }
  return NextResponse.json({ ...result, lang, cached: false })
}
