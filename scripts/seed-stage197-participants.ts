// v1.1 단계 19.7 검증용 시드 스크립트.
// 4명의 참여자(P040 ko, P041 en, P042 vi, P043 ar)를 Supabase에 멱등 발급한다.
// 이미 존재하면 skip — 코드 충돌 방지.
//
// 사용:
//   npx tsx scripts/seed-stage197-participants.ts

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// .env.local 수동 파싱 — dotenv 의존성 없이.
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
      // Strip surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (!(key in process.env)) {
        process.env[key] = value
      }
    }
  } catch (err) {
    console.warn('[seed] .env.local 로드 실패 — env 변수가 셸에서 제공되어야 함:', err)
  }
}

loadEnvLocal()

import { createParticipant, getParticipantByCode } from '../src/lib/research/repository'
import { hashPin } from '../src/lib/research/helpers'

type Seed = {
  participantCode: string
  motherTongue: string
  name: string
  pin: string
}

// 이름은 ASCII 중립 — 분석 대시보드의 국가/언어 텍스트 검색과 충돌하지 않게.
const SEEDS: Seed[] = [
  { participantCode: 'P040', motherTongue: 'ko', name: 'stage197-seed-040', pin: '1040' },
  { participantCode: 'P041', motherTongue: 'en', name: 'stage197-seed-041', pin: '1041' },
  { participantCode: 'P042', motherTongue: 'vi', name: 'stage197-seed-042', pin: '1042' },
  { participantCode: 'P043', motherTongue: 'ar', name: 'stage197-seed-043', pin: '1043' },
]

// consent_status=false로 리셋하기 위해 admin client 직접 사용.
import { getResearchAdminClient } from '../src/lib/research/supabase-admin-client'

async function resetConsent(participantId: string): Promise<void> {
  const client = getResearchAdminClient()
  if (!client) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (client as any).from('research_participants').update({ consent_status: false, consent_at: null }).eq('id', participantId)
}

async function updateName(participantId: string, name: string): Promise<void> {
  const client = getResearchAdminClient()
  if (!client) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (client as any).from('research_participants').update({ name }).eq('id', participantId)
}

async function main(): Promise<void> {
  for (const s of SEEDS) {
    const existing = await getParticipantByCode(s.participantCode)
    if (existing) {
      if (existing.consentStatus) {
        await resetConsent(existing.id)
      }
      if (existing.name !== s.name) {
        await updateName(existing.id, s.name)
      }
      console.log(`UPSERT ${s.participantCode} (mother_tongue=${existing.motherTongue}, name=${s.name}, consent=false)`)
      continue
    }
    const pinHash = await hashPin(s.pin)
    const created = await createParticipant({
      participantCode: s.participantCode,
      pinHash,
      name: s.name,
      nationality: null,
      koreanLevel: null,
      motherTongue: s.motherTongue,
      notes: '단계19.7 자동 시드',
    })
    if (created) {
      console.log(`OK    ${s.participantCode} 발급 — mother_tongue=${s.motherTongue}, pin=${s.pin}`)
    } else {
      console.error(`FAIL  ${s.participantCode} 발급 실패`)
      process.exitCode = 1
    }
  }
}

main().catch((err) => {
  console.error('seed error:', err)
  process.exit(1)
})
