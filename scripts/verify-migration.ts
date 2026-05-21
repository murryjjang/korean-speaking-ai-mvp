// ============================================================
// M1 — Sprint 1 마이그레이션 검증 실행 래퍼
// 대상: supabase/migrations/20260520_sprint1_new_tables.sql
//
// 사용:
//   npx tsx scripts/verify-migration.ts
//
// 동작 (의존성 추가 0 — 환경에 따라 자동 선택):
//   (A) SUPABASE_DB_URL 환경변수 + psql 둘 다 있으면
//       → scripts/verify-migration.sql 을 psql 로 실행해 strict 100% 검증.
//         (테이블·컬럼·RLS·인덱스·SECURITY DEFINER·FK 전부) 결과에 FAIL 있으면 exit 1.
//   (B) 없으면 → supabase-js(service_role) 로 "도달성 스모크":
//       신규 10 테이블 + ALTER 5 컬럼이 PostgREST 로 읽히는지 확인.
//       (RLS/인덱스/함수/FK strict 는 PostgREST 한계로 불가 →
//        scripts/verify-migration.sql 을 Supabase SQL Editor 에서 실행하라고 안내.)
//
// 주의: 마이그레이션 미적용(Option A 보류) 상태면 (B)가 전부 FAIL 나는 게 정상.
//   정방향 적용 후 다시 실행할 것.
// ============================================================

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

// .env.local 수동 파싱 — dotenv 의존성 없이. (seed 스크립트와 동일 패턴)
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
  } catch (err) {
    console.warn('[verify] .env.local 로드 실패 — env 변수가 셸에서 제공돼야 함:', err)
  }
}

loadEnvLocal()

const SQL_PATH = resolve(process.cwd(), 'scripts/verify-migration.sql')

// 신규 10 테이블
const NEW_TABLES = [
  'vocabulary_terms', 'content_tags', 'content_vocabulary', 'pronunciation_focus',
  'vocab_cards', 'model_answers', 'groups', 'group_members', 'level_tests', 'action_log',
] as const

// ALTER 컬럼 5종 (table, column)
const NEW_COLUMNS: Array<[string, string]> = [
  ['user_profiles', 'current_cefr_level'],
  ['user_profiles', 'current_cefr_updated_at'],
  ['questions', 'is_tagged'],
  ['questions', 'last_tagged_at'],
  ['speaking_submissions', 'pause_count'],
]

function hasPsql(): boolean {
  const r = spawnSync('psql', ['--version'], { stdio: 'ignore' })
  return r.status === 0
}

// ── (A) strict: psql + verify-migration.sql ───────────────────
function runStrict(dbUrl: string): number {
  console.log('[verify] (A) strict 모드 — psql + verify-migration.sql\n')
  const r = spawnSync('psql', [dbUrl, '-f', SQL_PATH], { encoding: 'utf-8' })
  if (r.error) {
    console.error('[verify] psql 실행 실패:', r.error.message)
    return 1
  }
  process.stdout.write(r.stdout ?? '')
  if (r.stderr) process.stderr.write(r.stderr)
  const out = `${r.stdout ?? ''}`
  // status 컬럼에 FAIL 이 하나라도 있으면 실패. TOTAL 행도 FAIL 로 표기됨.
  const failed = /\bFAIL\b/.test(out)
  console.log(failed ? '\n❌ strict 검증 FAIL — 위 표에서 FAIL category 확인.' : '\n✅ strict 검증 ALL PASS.')
  return failed ? 1 : 0
}

// ── (B) 도달성 스모크: supabase-js(service_role) ──────────────
async function runSmoke(url: string, serviceKey: string): Promise<number> {
  console.log('[verify] (B) 도달성 스모크 — supabase-js(service_role)')
  console.log('         (RLS/인덱스/함수/FK strict 검증은 verify-migration.sql 을')
  console.log('          Supabase SQL Editor 에서 실행하세요.)\n')

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  type Row = { category: string; target: string; status: 'PASS' | 'FAIL'; detail: string }
  const rows: Row[] = []

  // ⚠️ head:true 는 없는 테이블에도 204+error:null 을 반환해 가짜 PASS 를 만든다.
  //   non-head GET .select().limit(1) 만이 없는 테이블=404(PGRST205),
  //   없는 컬럼=400(42703) 로 정확히 구분된다 (실측 확인).
  for (const t of NEW_TABLES) {
    const { error } = await supabase.from(t).select('*').limit(1)
    rows.push({
      category: 'table', target: t,
      status: error ? 'FAIL' : 'PASS', detail: error ? `${error.code} ${error.message}` : 'reachable',
    })
  }
  for (const [t, c] of NEW_COLUMNS) {
    const { error } = await supabase.from(t).select(c).limit(1)
    rows.push({
      category: 'column', target: `${t}.${c}`,
      status: error ? 'FAIL' : 'PASS', detail: error ? `${error.code} ${error.message}` : 'reachable',
    })
  }

  for (const r of rows) {
    const mark = r.status === 'PASS' ? '✅' : '❌'
    console.log(`${mark} ${r.category.padEnd(7)} ${r.target.padEnd(38)} ${r.status}${r.status === 'FAIL' ? `  (${r.detail})` : ''}`)
  }
  const fails = rows.filter((r) => r.status === 'FAIL').length
  console.log(`\nsmoke: ${rows.length - fails}/${rows.length} PASS, ${fails} FAIL`)
  if (fails > 0) {
    console.log('※ 마이그레이션 미적용(Option A 보류) 상태면 전부 FAIL 이 정상입니다.')
  }
  return fails > 0 ? 1 : 0
}

async function main(): Promise<void> {
  const dbUrl = process.env.SUPABASE_DB_URL
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  let code: number
  if (dbUrl && hasPsql()) {
    code = runStrict(dbUrl)
  } else {
    if (dbUrl && !hasPsql()) {
      console.warn('[verify] SUPABASE_DB_URL 있으나 psql 미설치 → 스모크 모드로 폴백.\n')
    }
    if (!url || !serviceKey) {
      console.error('[verify] NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요 (.env.local).')
      console.error('         strict 검증은 SUPABASE_DB_URL + psql, 또는 verify-migration.sql 수동 실행.')
      process.exit(2)
    }
    code = await runSmoke(url, serviceKey)
  }
  process.exit(code)
}

main().catch((err) => {
  console.error('[verify] 예기치 못한 오류:', err)
  process.exit(2)
})
