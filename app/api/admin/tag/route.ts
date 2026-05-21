// 콘텐츠 admin — 수동 태깅 trigger (Task 1.7, D-012 1.7-태깅 결정).
// admin이 '태깅하기' 버튼 → 단일 콘텐츠 prompt v3 생성 → 정량+peer 검수 → pass면 persist.
// 비결정성·per-item 검토 필요(1.3 경험)라 자동이 아닌 명시 trigger. 권한 필수.
import { type NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/src/lib/supabase/auth'
import { getSupabaseAdminClient } from '@/src/lib/supabase/admin'
import {
  buildContentTaggingSystemPrompt,
  buildContentTaggingUserPrompt,
} from '@/src/lib/prompts/content-tagging'
import { classify, runPeerReview, validateQuantitative, type ChatCaller } from '@/src/lib/tagging/validate-tagging'
import { persistTag } from '@/src/lib/tagging/persist'
import type { ContentTagResult, TaggingInput } from '@/src/lib/tagging/schema'

const AUTHOR_MODEL = process.env.CONTENT_TAGGING_AUTHOR_MODEL ?? process.env.OPENAI_TAGGING_MODEL ?? 'gpt-4o-mini'
const PEER_MODEL = process.env.PEER_REVIEW_MODEL ?? process.env.OPENAI_PEER_REVIEW_MODEL ?? 'gpt-4o'

function caller(model: string, apiKey: string): ChatCaller {
  return async (sys, user) => {
    const { OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey })
    const res = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 800,
    })
    return res.choices[0]?.message?.content ?? '{}'
  }
}

export async function POST(request: NextRequest) {
  const profile = await requireRole(['admin'])
  if (!profile) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const admin = getSupabaseAdminClient()
  if (!admin) return NextResponse.json({ error: 'supabase_unconfigured' }, { status: 503 })
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'no_openai' }, { status: 503 })

  let b: { content_id?: string }
  try {
    b = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  if (!b.content_id) return NextResponse.json({ error: 'missing content_id' }, { status: 400 })

  const { data: q } = await admin
    .from('questions')
    .select('id, type_id, title, prompt, difficulty')
    .eq('id', b.content_id)
    .single()
  if (!q) return NextResponse.json({ error: 'content_not_found' }, { status: 404 })

  const input: TaggingInput = {
    content_id: q.id as string,
    type_id: q.type_id as string | null,
    title: q.title as string,
    prompt: q.prompt as string,
    difficulty: q.difficulty as string | null,
  }
  let result: ContentTagResult
  try {
    const raw = await caller(AUTHOR_MODEL, apiKey)(buildContentTaggingSystemPrompt(), buildContentTaggingUserPrompt(input))
    result = JSON.parse(raw) as ContentTagResult
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'gen_failed' }, { status: 500 })
  }

  const quant = validateQuantitative(result, { typeId: input.type_id })
  const peer = quant.ok
    ? await runPeerReview(caller(PEER_MODEL, apiKey), result, `content_id: ${input.content_id}\ntype: ${input.type_id ?? ''}\ntitle: ${input.title}\nprompt: ${input.prompt}`)
    : null
  const verdict = classify(quant, peer)

  if (verdict === 'pass') await persistTag(admin, input, result)

  return NextResponse.json({
    content_id: input.content_id,
    verdict,
    quant_failures: quant.failures.map((f) => `${f.rule}: ${f.message}`),
    peer,
    result: verdict === 'pass' ? result : undefined,
  })
}
