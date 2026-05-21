// ============================================================
// Task 1.4 — vocabulary_glosses 마이그레이션 검증 (M1 스모크 패턴 재사용)
// 사용: npx tsx scripts/verify-vocab-glosses.ts
// 동작: supabase-js(service_role) non-head GET 으로 테이블·컬럼 도달성 판정.
//   (head:true 사각지대 회피 — verify-migration.ts 교훈.)
//   미적용 상태면 전부 FAIL 이 정상(적용 후 재실행).
// ============================================================

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

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

const COLUMNS = ['id', 'term_id', 'lang', 'gloss', 'example_ko', 'example_translated', 'generated_at']

async function main(): Promise<void> {
  loadEnvLocal()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('[verify-glosses] NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요 (.env.local).')
    process.exit(2)
  }
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  let fails = 0
  for (const col of COLUMNS) {
    const { error } = await supabase.from('vocabulary_glosses').select(col).limit(1)
    const ok = !error
    if (!ok) fails++
    console.log(`${ok ? '✅' : '❌'} column vocabulary_glosses.${col.padEnd(20)} ${ok ? 'reachable' : `FAIL (${error!.code} ${error!.message})`}`)
  }
  console.log(`\nsmoke: ${COLUMNS.length - fails}/${COLUMNS.length} PASS, ${fails} FAIL`)
  if (fails > 0) console.log('※ 마이그레이션 미적용이면 전부 FAIL 이 정상입니다(적용 후 재실행).')
  process.exit(fails > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('[verify-glosses] 오류:', err)
  process.exit(2)
})
