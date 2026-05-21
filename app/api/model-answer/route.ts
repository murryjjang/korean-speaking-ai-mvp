// GET /api/model-answer?content_id=... — CEFR 수준별 모범답안(캐시 or on-demand 생성). Task 1.5.
// 캐시 읽기=세션(RLS read-auth), 생성 쓰기=service_role(RLS write-staff).
import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/src/lib/supabase/server'
import { getSupabaseAdminClient } from '@/src/lib/supabase/admin'
import { targetLevels } from '@/src/lib/model-answers/levels'
import {
  buildModelAnswerSystemPrompt,
  buildModelAnswerUserPrompt,
  parseModelAnswer,
} from '@/src/lib/prompts/model-answer'
import type { CefrLevel } from '@/src/lib/tagging/schema'

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return NextResponse.json({ error: 'supabase_unconfigured' }, { status: 503 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const contentId = request.nextUrl.searchParams.get('content_id')
  if (!contentId) return NextResponse.json({ error: 'missing content_id' }, { status: 400 })

  // 콘텐츠 + 태깅 수준 조회.
  const { data: question } = await supabase
    .from('questions')
    .select('id, type_id, title, prompt')
    .eq('id', contentId)
    .single()
  if (!question) return NextResponse.json({ error: 'content_not_found' }, { status: 404 })

  const { data: tag } = await supabase
    .from('content_tags')
    .select('cefr_level')
    .eq('content_id', contentId)
    .maybeSingle()
  const levels = targetLevels((tag?.cefr_level as string) ?? '')

  const apiKey = process.env.OPENAI_API_KEY
  const admin = getSupabaseAdminClient()
  const answers: Array<{ cefr: CefrLevel; answer_text: string | null }> = []

  for (const cefr of levels) {
    // 1) 캐시.
    const { data: cached } = await supabase
      .from('model_answers')
      .select('answer_text')
      .eq('content_id', contentId)
      .eq('cefr_level', cefr)
      .maybeSingle()
    if (cached) {
      answers.push({ cefr, answer_text: cached.answer_text as string })
      continue
    }
    // 2) 생성 (키 없으면 null).
    if (!apiKey) {
      answers.push({ cefr, answer_text: null })
      continue
    }
    let result
    try {
      const { OpenAI } = await import('openai')
      const client = new OpenAI({ apiKey })
      const model = process.env.MODEL_ANSWER_MODEL ?? process.env.OPENAI_EVAL_MODEL ?? 'gpt-4o-mini'
      const res = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: buildModelAnswerSystemPrompt(cefr) },
          {
            role: 'user',
            content: buildModelAnswerUserPrompt({
              content_id: contentId,
              type_id: question.type_id as string | null,
              title: question.title as string,
              prompt: question.prompt as string,
            }),
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 600,
      })
      result = parseModelAnswer(res.choices[0]?.message?.content ?? '{}')
    } catch {
      result = null
    }
    if (!result) {
      answers.push({ cefr, answer_text: null })
      continue
    }
    // 3) 캐시 적재(service_role).
    if (admin) {
      await admin.from('model_answers').upsert(
        { content_id: contentId, cefr_level: cefr, answer_text: result.answer_text, generated_at: new Date().toISOString() },
        { onConflict: 'content_id,cefr_level' },
      )
    }
    answers.push({ cefr, answer_text: result.answer_text })
  }

  return NextResponse.json({ content_id: contentId, title: question.title, answers })
}
