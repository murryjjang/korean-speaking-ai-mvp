// v1.1 단계 19.7: Playwright 헬퍼 — 시험운영 참여자 시드·consent 리셋.
//
// .env.local의 Supabase 서비스 role 키를 사용해 직접 DB를 조작한다. dev 서버
// 전체를 재시작할 필요 없이 매 테스트마다 멱등한 상태를 만든다.

import { createClient } from '@supabase/supabase-js'
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
  } catch { /* noop */ }
}
loadEnvLocal()

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function resetParticipantConsent(participantCode: string): Promise<void> {
  const client = getAdminClient()
  if (!client) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (client as any)
    .from('research_participants')
    .update({ consent_status: false, consent_at: null })
    .eq('participant_code', participantCode)
}
