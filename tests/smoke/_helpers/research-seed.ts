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

// v1.1 단계 19.12 [#3]: 진척 페이지 "(완료 mother_tongue)" 한 줄 표시 시각 검증용
// 멱등 시드 — 호출 시 해당 참가자에 완료/진행 세션 1쌍을 보장한다.
// 이미 동일 ext_id의 세션이 있으면 패스 (중복 생성 방지).
export async function ensureProgressSessionsForBidiTest(
  participantCode: string,
): Promise<void> {
  const client = getAdminClient()
  if (!client) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = client as any

  // 참가자 ID 조회
  const { data: pData } = await c
    .from('research_participants')
    .select('id')
    .eq('participant_code', participantCode)
    .single()
  if (!pData?.id) return
  const participantId = pData.id as string

  // 기존 단계 19.12 시드 세션이 있으면 종료 (멱등성). meta_json.seedTag로 식별.
  const { data: existing } = await c
    .from('research_sessions')
    .select('id, meta_json')
    .eq('participant_id', participantId)
    .eq('mode', 'free_conversation')
  const alreadySeeded = (existing ?? []).filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r: any) => r?.meta_json?.seedTag === 'stage1912-bidi',
  )
  if (alreadySeeded.length >= 2) return

  // 완료 세션 + 진행 세션 각 1건 시드. persona_id/topic는 meta_json에 저장 (스키마 19.5).
  const startedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  const endedAt = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  const startedAt2 = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  await c.from('research_sessions').insert([
    {
      participant_id: participantId,
      mode: 'free_conversation',
      session_started_at: startedAt,
      session_ended_at: endedAt,
      meta_json: {
        seedTag: 'stage1912-bidi',
        topic: '시각 검증 — 완료 세션',
      },
    },
    {
      participant_id: participantId,
      mode: 'free_conversation',
      session_started_at: startedAt2,
      session_ended_at: null,
      meta_json: {
        seedTag: 'stage1912-bidi',
        topic: '시각 검증 — 진행 세션',
      },
    },
  ])
}
