// v1.1 단계 10-4: research 세션 시작 — 참여자 쿠키 + mode + meta_json.

import { createSession } from '@/src/lib/research/repository'
import { readParticipantId } from '@/src/lib/research/session'
import type { ResearchMode } from '@/src/lib/research/types'

const VALID_MODES: ResearchMode[] = [
  'free_conversation',
  'q1_repeat',
  'q2_describe',
  'q3_picture',
  'q4_dialogue',
  'presentation',
  'reading',
]

function isValidMode(s: unknown): s is ResearchMode {
  return typeof s === 'string' && (VALID_MODES as string[]).includes(s)
}

export async function POST(request: Request) {
  const participantId = await readParticipantId()
  if (!participantId) return Response.json({ ok: false, error: 'no_session' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return Response.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  if (!isValidMode(body.mode)) {
    return Response.json({ ok: false, error: 'invalid_mode' }, { status: 400 })
  }

  const metaJson =
    body.metaJson && typeof body.metaJson === 'object' && !Array.isArray(body.metaJson)
      ? (body.metaJson as Record<string, unknown>)
      : {}

  const session = await createSession({ participantId, mode: body.mode, metaJson })
  if (!session) return Response.json({ ok: false, error: 'create_failed' })

  return Response.json({ ok: true, sessionId: session.id })
}
