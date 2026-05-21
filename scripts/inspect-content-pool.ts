// ============================================================
// Task 1.3a — 콘텐츠 풀 조사 (read-only, footprint 0)
//
// questions 양·type_id 분포·difficulty·is_tagged 현황 + mission_scenarios /
// content_versions / content_tags 활용 여부를 조사해 "즉시 일괄 태깅 가능한
// 풀 크기"를 추정한다. 순수 SELECT 만 — 어떤 쓰기도 하지 않음(반복 안전).
//
// 사용: npx tsx scripts/inspect-content-pool.ts
// 의존: .env.local 의 NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
//
// 주의(verify-migration 사각지대 교훈): 없는 테이블/컬럼 구분을 위해 head:true 가
//   아니라 non-head GET(.select().limit) 으로 도달성을 판정한다.
// ============================================================

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { SupabaseClient } from '@supabase/supabase-js'

// content_tags FK 는 questions(id) 전체에 걸리므로 **active questions 전부**가
// 태깅 대상이다(특정 type 제한 아님). 아래는 설계가 예시로 든 핵심 유형으로,
// 보고서에서 별도 강조만 한다(실측: 대화미션은 qt-dialogue-mission 으로 questions 안에 존재).
const HIGHLIGHT_TYPES = ['qt-reading', 'qt-material-desc', 'qt-listening-resp', 'qt-dialogue-mission']

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

function tally(rows: Array<Record<string, unknown>>, key: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of rows) {
    const v = String(r[key] ?? '(null)')
    out[v] = (out[v] ?? 0) + 1
  }
  return out
}

function printTally(title: string, t: Record<string, number>): void {
  console.log(`\n${title}`)
  for (const [k, n] of Object.entries(t).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(28)} ${n}`)
  }
}

async function countOf(supabase: SupabaseClient, table: string): Promise<number | null> {
  const { error, count } = await supabase.from(table).select('*', { count: 'exact', head: false }).limit(1)
  if (error) return null
  return count ?? 0
}

async function main(): Promise<void> {
  loadEnvLocal()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('[inspect] NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요 (.env.local).')
    process.exit(2)
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  console.log('═══ Task 1.3a — 콘텐츠 풀 조사 ═══════════════════')

  // ── questions: is_tagged 컬럼 존재 여부에 따라 select 폴백 ──
  let hasIsTagged = true
  let { data: questions, error: qErr } = await supabase
    .from('questions')
    .select('id, type_id, difficulty, is_active, is_tagged, last_tagged_at')
  if (qErr && (qErr.code === '42703' || /is_tagged/.test(qErr.message))) {
    hasIsTagged = false
    ;({ data: questions, error: qErr } = await supabase
      .from('questions')
      .select('id, type_id, difficulty, is_active'))
  }
  if (qErr) {
    console.error('[inspect] questions 조회 실패:', qErr.code, qErr.message)
    process.exit(1)
  }
  const qs = (questions ?? []) as Array<Record<string, unknown>>

  console.log(`\nquestions 총: ${qs.length}`)
  console.log(`is_tagged 컬럼: ${hasIsTagged ? '있음(Task 1.2 적용됨)' : '없음(Task 1.2 미적용 — forward-looking)'}`)
  printTally('type_id 분포:', tally(qs, 'type_id'))
  printTally('difficulty 분포:', tally(qs, 'difficulty'))
  printTally('is_active 분포:', tally(qs, 'is_active'))
  if (hasIsTagged) printTally('is_tagged 분포:', tally(qs, 'is_tagged'))

  // ── 인접 콘텐츠 테이블 ──
  const missionCount = await countOf(supabase, 'mission_scenarios')
  const versionCount = await countOf(supabase, 'content_versions')
  const tagsCount = await countOf(supabase, 'content_tags')
  console.log('\n인접 테이블:')
  console.log(`  mission_scenarios (대화미션): ${missionCount === null ? '없음/접근불가' : missionCount} ${missionCount !== null ? '← content_tags FK 대상 아님(questions만)' : ''}`)
  console.log(`  content_versions            : ${versionCount === null ? '없음/접근불가' : versionCount} (콘텐츠 변경 이력 — 태깅 무관)`)
  console.log(`  content_tags (이미 태깅)     : ${tagsCount === null ? '없음(Task 1.2 미적용)' : tagsCount}`)

  // ── 즉시 일괄 가능 풀 추정 (FK 일반 → active questions 전체) ──
  const active = qs.filter((q) => q.is_active !== false)
  const untagged = hasIsTagged ? active.filter((q) => q.is_tagged !== true) : active
  const highlightDist = tally(active.filter((q) => HIGHLIGHT_TYPES.includes(String(q.type_id))), 'type_id')
  const otherActive = active.filter((q) => !HIGHLIGHT_TYPES.includes(String(q.type_id)))

  console.log('\n── 즉시 일괄 태깅 가능 풀 추정 ───────────────────')
  console.log('대상: content_tags FK 는 questions(id) 전체 → active questions 전부 태깅 가능.')
  console.log(`active questions      : ${active.length}`)
  console.log(`미태깅(즉시 풀 크기)  : ${untagged.length}${hasIsTagged ? '' : ' (is_tagged 없어 active 전수로 추정)'}`)
  console.log('\n핵심 유형(설계 예시) 분포:')
  for (const [k, n] of Object.entries(highlightDist)) console.log(`  ${k.padEnd(28)} ${n}`)
  if (otherActive.length) {
    printTally('그 외 태깅대상 유형(말하기 콘텐츠 — 동일 FK):', tally(otherActive, 'type_id'))
  }
  console.log('\n※ read-only — DB 변경 없음. 반복 실행 안전.')
}

main().catch((err) => {
  console.error('[inspect] 예기치 못한 오류:', err)
  process.exit(2)
})
