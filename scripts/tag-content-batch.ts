// ============================================================
// Task 1.3b — 콘텐츠 태깅 batch runner
//
// questions 풀에서 미태깅 콘텐츠 fetch → prompt v3 적용 → 결과 JSON 생성 →
// M4 검수(validateQuantitative + peer review + classify) 자동 호출 → 분류.
//   pass  → content_tags / vocabulary_terms / content_vocabulary /
//           pronunciation_focus INSERT (idempotent, ON CONFLICT) + questions.is_tagged
//   warn/fail → 검토 큐 JSON dump (validate-tagging.ts --review 로 처리)
//
// ❗ dry-run 기본: BATCH_DRY 가 '0'/'false' 가 아니면 DB INSERT 없이 결과+통계만.
//   실제 INSERT: BATCH_DRY=0 npx tsx scripts/tag-content-batch.ts
//
// 사용:
//   npx tsx scripts/tag-content-batch.ts [--limit=N] [--types=qt-reading,...] \
//       [--out=out/tagged.json] [--queue=out/review-queue.json]
//
// 모델: 작성자 OPENAI_TAGGING_MODEL ?? 'gpt-4o-mini', 검수자 OPENAI_PEER_REVIEW_MODEL
//   ?? 'gpt-4o' (다른 모델 — DECISIONS D-007).
// ============================================================

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  buildContentTaggingSystemPrompt,
  buildContentTaggingUserPrompt,
} from '@/src/lib/prompts/content-tagging'
import {
  classify,
  runPeerReview,
  validateQuantitative,
  type ChatCaller,
  type PeerReviewResult,
  type Verdict,
} from '@/src/lib/tagging/validate-tagging'
import {
  CEFR_VALUES,
  CONTENT_TAGGING_PROMPT_VERSION,
  parsePronunciationFocus,
  type CefrLevel,
  type ContentTagResult,
  type TaggingInput,
  type VocabCategory,
} from '@/src/lib/tagging/schema'

const DRY = !(process.env.BATCH_DRY === '0' || process.env.BATCH_DRY === 'false')

function loadEnvLocal(): void {
  try {
    const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 0) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (!(key in process.env)) process.env[key] = value
    }
  } catch {
    /* 셸 env 사용 */
  }
}

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {}
  for (const a of argv) {
    if (!a.startsWith('--')) continue
    const eq = a.indexOf('=')
    if (eq < 0) out[a.slice(2)] = true
    else out[a.slice(2, eq)] = a.slice(eq + 1)
  }
  return out
}

function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(resolve(path)), { recursive: true })
  writeFileSync(resolve(path), JSON.stringify(data, null, 2), 'utf-8')
}

// vocabulary 분류(content-상대 난이도) → 어휘 절대 CEFR 근사.
// basic=콘텐츠-1, core=콘텐츠, challenging=콘텐츠+1 (A1~C2 클램프).
// 주의: prompt v3 는 per-term CEFR 를 출력하지 않음 → 근사. (BACKLOG: prompt v4 per-term CEFR)
function cefrForCategory(contentCefr: CefrLevel, cat: VocabCategory): CefrLevel {
  const idx = CEFR_VALUES.indexOf(contentCefr)
  const off = cat === 'basic' ? -1 : cat === 'challenging' ? 1 : 0
  return CEFR_VALUES[Math.max(0, Math.min(CEFR_VALUES.length - 1, idx + off))]
}

// 검수자(peer) 모델 — Q2 확정: 기본 gpt-4o, 동일 OPENAI_API_KEY 재사용.
//   env 이름은 PEER_REVIEW_MODEL(권장). OPENAI_ 접두 별칭도 허용(프로젝트 관행).
const PEER_MODEL = process.env.PEER_REVIEW_MODEL ?? process.env.OPENAI_PEER_REVIEW_MODEL ?? 'gpt-4o'
const AUTHOR_MODEL = process.env.OPENAI_TAGGING_MODEL ?? 'gpt-4o-mini'

function makeChatCaller(model: string, temperature: number): ChatCaller {
  const apiKey = process.env.OPENAI_API_KEY as string
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
      temperature,
      max_tokens: 800,
    })
    return res.choices[0]?.message?.content ?? '{}'
  }
}

// pass 항목을 4테이블에 idempotent INSERT.
async function persist(supabase: SupabaseClient, input: TaggingInput, result: ContentTagResult): Promise<void> {
  const cid = input.content_id
  // 1) content_tags (unique content_id → upsert)
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

  // 2) vocabulary_terms (unique term → upsert) + 3) content_vocabulary (unique 3키 → ignore)
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

  // 4) pronunciation_focus (자연 unique 없음 → content_id 단위 replace)
  await supabase.from('pronunciation_focus').delete().eq('content_id', cid)
  const pf = result.pronunciation_focus
    .map(parsePronunciationFocus)
    .filter((x): x is { term: string; rule: string } => x !== null)
    .map((x) => ({ content_id: cid, term: x.term, rule: x.rule }))
  if (pf.length) {
    const { error: pfErr } = await supabase.from('pronunciation_focus').insert(pf)
    if (pfErr) throw new Error(`pronunciation_focus: ${pfErr.message}`)
  }

  // 5) questions.is_tagged 플래그
  const { error: qErr } = await supabase
    .from('questions')
    .update({ is_tagged: true, last_tagged_at: new Date().toISOString() })
    .eq('id', cid)
  if (qErr) throw new Error(`questions.is_tagged: ${qErr.message}`)
}

async function main(): Promise<void> {
  loadEnvLocal()
  const args = parseArgs(process.argv.slice(2))
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('[batch] NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요 (.env.local).')
    process.exit(2)
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error('[batch] OPENAI_API_KEY 필요 (태깅 생성).')
    process.exit(2)
  }

  const limit = typeof args.limit === 'string' ? Number(args.limit) : undefined
  const types = typeof args.types === 'string' ? args.types.split(',') : null
  const outPath = typeof args.out === 'string' ? args.out : 'out/tagged.json'
  const queuePath = typeof args.queue === 'string' ? args.queue : 'out/review-queue.json'

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  // 미태깅 active questions fetch
  let q = supabase.from('questions').select('id, type_id, title, prompt, difficulty').eq('is_active', true).eq('is_tagged', false)
  if (types) q = q.in('type_id', types)
  const { data: rows, error } = await q
  if (error) {
    console.error('[batch] questions fetch 실패:', error.code, error.message)
    process.exit(1)
  }
  let pool = (rows ?? []) as Array<Record<string, unknown>>
  if (typeof limit === 'number') pool = pool.slice(0, limit)

  console.log(`═══ Task 1.3b batch ${DRY ? '(DRY-RUN — DB 변경 없음)' : '(★ 실 INSERT)'} ═══`)
  console.log(`대상 ${pool.length}건  | 작성자=${AUTHOR_MODEL}  검수자=${PEER_MODEL}\n`)

  const author = makeChatCaller(AUTHOR_MODEL, 0) // temp 0 — 결정성(재실행 변동 제거), DECISIONS D-009
  const peer = makeChatCaller(PEER_MODEL, 0)

  type Outcome = { input: TaggingInput; result: ContentTagResult | null; verdict: Verdict | 'error'; quant_failures: string[]; peer: PeerReviewResult | null; error?: string }
  const outcomes: Outcome[] = []

  for (const row of pool) {
    const input: TaggingInput = {
      content_id: String(row.id),
      type_id: row.type_id as string | null,
      title: String(row.title ?? ''),
      prompt: String(row.prompt ?? ''),
      difficulty: row.difficulty as string | null,
    }
    try {
      const raw = await author(buildContentTaggingSystemPrompt(), buildContentTaggingUserPrompt(input))
      const result = JSON.parse(raw) as ContentTagResult
      const quant = validateQuantitative(result, { typeId: input.type_id })
      const peerRes = quant.ok ? await runPeerReview(peer, result, `content_id: ${input.content_id}\ntitle: ${input.title}`) : null
      const verdict = classify(quant, peerRes)
      if (verdict === 'pass' && !DRY) await persist(supabase, input, result)
      outcomes.push({ input, result, verdict, quant_failures: quant.failures.map((f) => `${f.rule}: ${f.message}`), peer: peerRes })
      console.log(`  ${input.content_id.padEnd(16)} ${verdict.toUpperCase()}${!DRY && verdict === 'pass' ? ' (INSERT)' : ''}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      outcomes.push({ input, result: null, verdict: 'error', quant_failures: [], peer: null, error: msg })
      console.log(`  ${input.content_id.padEnd(16)} ERROR — ${msg}`)
    }
  }

  // 결과·검토 큐 dump
  const tagged = outcomes.filter((o) => o.result).map((o) => ({ input: o.input, result: o.result }))
  const queue = outcomes
    .filter((o) => o.verdict === 'warn' || o.verdict === 'fail' || o.verdict === 'error')
    .map((o) => ({ content_id: o.input.content_id, verdict: o.verdict, quant_failures: o.quant_failures, peer: o.peer, error: o.error, record: { input: o.input, result: o.result } }))
  writeJson(outPath, tagged)
  writeJson(queuePath, queue)

  const c = (v: string) => outcomes.filter((o) => o.verdict === v).length
  console.log('\n── 통계 ──────────────────────────────────────────')
  console.log(`Total ${outcomes.length} | pass ${c('pass')} / warn ${c('warn')} / fail ${c('fail')} / error ${c('error')}`)
  console.log(`결과 → ${outPath}  | 검토 큐(${queue.length}) → ${queuePath}`)
  if (DRY) console.log('\n※ DRY-RUN: DB INSERT 없음. 실제 적용은 BATCH_DRY=0.')
  process.exit(0)
}

main().catch((err) => {
  console.error('[batch] 예기치 못한 오류:', err)
  process.exit(2)
})
