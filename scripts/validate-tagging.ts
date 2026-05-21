// ============================================================
// M4 — 콘텐츠 검수 자동화 CLI
//
// 순수 로직(정량 7규칙·분류·peer review 프롬프트)은 src/lib/tagging/* 에 있고
// (단위테스트 가드), 이 스크립트는 openai wiring + 통계 보고서 + 검토 CLI 만 담당.
//
// 사용:
//   # 1) 검증 + 분류 + 검토 큐 생성 (peer review 포함)
//   npx tsx scripts/validate-tagging.ts --in=out/tagged.json [--sample=0.05] [--queue=out/review-queue.json]
//
//   # 2) 검토 CLI (warn/fail + pass 샘플을 한 건씩 approve/reject/edit)
//   npx tsx scripts/validate-tagging.ts --review --queue=out/review-queue.json [--out=out/review-decisions.json]
//
// peer review 모델: OPENAI_PEER_REVIEW_MODEL ?? 'gpt-4o' (작성자 gpt-4o-mini 와
//   다른 모델 — DECISIONS D-007). OPENAI_API_KEY 없으면 정량 전용(peer=null).
// 샘플링: 통과(pass) 항목 중 무작위 검토 비율. 기본 5%. content_id 정렬 기반
//   결정론적 stride 선택(재현 가능).
// ============================================================

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { createInterface } from 'node:readline'

import {
  classify,
  runPeerReview,
  validateQuantitative,
  type ChatCaller,
  type PeerReviewResult,
  type Verdict,
} from '@/src/lib/tagging/validate-tagging'
import type { ContentTagResult, TaggingInput } from '@/src/lib/tagging/schema'

type TaggedRecord = { input: TaggingInput; result: ContentTagResult }
type ReviewItem = {
  content_id: string
  verdict: Verdict
  quant_failures: string[]
  peer: PeerReviewResult | null
  record: TaggedRecord
}

// ── .env.local 수동 파싱 (verify-migration.ts 와 동일 패턴) ─────
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

// 검수자(peer) 모델 — Q2 확정: 기본 gpt-4o, 동일 OPENAI_API_KEY 재사용.
//   env 이름은 PEER_REVIEW_MODEL(권장). OPENAI_ 접두 별칭도 허용(프로젝트 관행).
const PEER_MODEL = process.env.PEER_REVIEW_MODEL ?? process.env.OPENAI_PEER_REVIEW_MODEL ?? 'gpt-4o'

// peer review caller — openai gpt-4o. 키 없으면 null(정량 전용).
function makePeerCaller(): ChatCaller | null {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  const model = PEER_MODEL
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
      max_tokens: 600,
    })
    return res.choices[0]?.message?.content ?? '{}'
  }
}

// content_id 정렬 기반 결정론적 stride 샘플 (재현 가능).
function sampleDeterministic<T extends { content_id: string }>(items: T[], rate: number): T[] {
  if (rate <= 0 || items.length === 0) return []
  if (rate >= 1) return items
  const sorted = [...items].sort((a, b) => a.content_id.localeCompare(b.content_id))
  const n = Math.max(1, Math.ceil(sorted.length * rate))
  const stride = sorted.length / n
  const picked: T[] = []
  for (let i = 0; i < n; i++) picked.push(sorted[Math.floor(i * stride)])
  return picked
}

function userContext(input: TaggingInput): string {
  return [`content_id: ${input.content_id}`, `type: ${input.type_id ?? ''}`, `title: ${input.title}`, `prompt: ${input.prompt}`].join('\n')
}

// ── 모드 1: 검증 + 분류 + 검토 큐 ──────────────────────────────
async function runValidate(args: Record<string, string | boolean>): Promise<number> {
  const inPath = typeof args.in === 'string' ? args.in : null
  if (!inPath) {
    console.error('[validate] --in=<tagged.json> 필요')
    return 2
  }
  const rate = typeof args.sample === 'string' ? Number(args.sample) : 0.05
  const queuePath = typeof args.queue === 'string' ? args.queue : 'out/review-queue.json'

  const records = JSON.parse(readFileSync(resolve(inPath), 'utf-8')) as TaggedRecord[]
  const peerCall = makePeerCaller()
  if (!peerCall) console.warn('[validate] OPENAI_API_KEY 없음 → 정량 전용(peer review 생략)\n')

  const items: ReviewItem[] = []
  for (const rec of records) {
    const quant = validateQuantitative(rec.result, { typeId: rec.input.type_id })
    let peer: PeerReviewResult | null = null
    if (peerCall && quant.ok) {
      // 정량 통과 항목만 교차 검수 (정량 fail 은 어차피 fail).
      peer = await runPeerReview(peerCall, rec.result, userContext(rec.input))
    }
    const verdict = classify(quant, peer)
    items.push({
      content_id: rec.input.content_id,
      verdict,
      quant_failures: quant.failures.map((f) => `${f.rule}: ${f.message}`),
      peer,
      record: rec,
    })
  }

  const pass = items.filter((i) => i.verdict === 'pass')
  const warn = items.filter((i) => i.verdict === 'warn')
  const fail = items.filter((i) => i.verdict === 'fail')
  const sampled = sampleDeterministic(pass, rate)
  const queue = [...fail, ...warn, ...sampled]

  const pct = (n: number) => (items.length ? Math.round((n / items.length) * 100) : 0)
  console.log('── M4 검수 통계 보고서 ──────────────────────────')
  console.log(`Total : ${items.length}`)
  console.log(`Pass  : ${pass.length} (${pct(pass.length)}%)  → 무작위 ${Math.round(rate * 100)}% = ${sampled.length}건 검토`)
  console.log(`Warn  : ${warn.length} (${pct(warn.length)}%)  → 전수 검토`)
  console.log(`Fail  : ${fail.length} (${pct(fail.length)}%)  → 전수 검토`)
  console.log(`Review queue : ${queue.length}건  → ${queuePath}`)
  console.log(`Peer review  : ${peerCall ? PEER_MODEL : '생략(정량 전용)'}`)

  writeJson(queuePath, queue)
  return 0
}

// ── 모드 2: 검토 CLI (approve/reject/edit) ─────────────────────
async function runReviewCli(args: Record<string, string | boolean>): Promise<number> {
  const queuePath = typeof args.queue === 'string' ? args.queue : 'out/review-queue.json'
  const outPath = typeof args.out === 'string' ? args.out : 'out/review-decisions.json'
  const queue = JSON.parse(readFileSync(resolve(queuePath), 'utf-8')) as ReviewItem[]

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const ask = (q: string) => new Promise<string>((res) => rl.question(q, res))
  const decisions: Array<{ content_id: string; decision: string; edited?: ContentTagResult }> = []

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i]
    console.log(`\n[${i + 1}/${queue.length}] ${item.content_id}  (${item.verdict})`)
    if (item.quant_failures.length) console.log('  정량 실패: ' + item.quant_failures.join(' | '))
    if (item.peer?.warnings.length) console.log('  peer warnings: ' + item.peer.warnings.join(' | '))
    if (item.peer?.failures.length) console.log('  peer failures: ' + item.peer.failures.join(' | '))
    console.log('  result: ' + JSON.stringify(item.record.result))
    const ans = (await ask('  [a]pprove / [r]eject / [e]dit / [s]kip ? ')).trim().toLowerCase()
    if (ans === 'a') decisions.push({ content_id: item.content_id, decision: 'approve' })
    else if (ans === 'r') decisions.push({ content_id: item.content_id, decision: 'reject' })
    else if (ans === 'e') {
      const raw = await ask('  수정 JSON 붙여넣기(엔터=취소): ')
      try {
        const edited = JSON.parse(raw) as ContentTagResult
        decisions.push({ content_id: item.content_id, decision: 'edit', edited })
      } catch {
        console.log('  파싱 실패 → skip')
        decisions.push({ content_id: item.content_id, decision: 'skip' })
      }
    } else decisions.push({ content_id: item.content_id, decision: 'skip' })
  }
  rl.close()
  writeJson(outPath, decisions)
  const c = (d: string) => decisions.filter((x) => x.decision === d).length
  console.log(`\n검토 완료: approve ${c('approve')} / reject ${c('reject')} / edit ${c('edit')} / skip ${c('skip')} → ${outPath}`)
  return 0
}

async function main(): Promise<void> {
  loadEnvLocal()
  const args = parseArgs(process.argv.slice(2))
  const code = args.review ? await runReviewCli(args) : await runValidate(args)
  process.exit(code)
}

main().catch((err) => {
  console.error('[validate] 예기치 못한 오류:', err)
  process.exit(2)
})
