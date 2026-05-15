// v1.1 단계 10-4: research 세션 종료 — session_ended_at 업데이트.

import { endSession } from '@/src/lib/research/repository'
import { readParticipantId } from '@/src/lib/research/session'

export async function POST(request: Request) {
  const participantId = await readParticipantId()
  if (!participantId) return Response.json({ ok: false, error: 'no_session' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return Response.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : ''
  if (!sessionId) return Response.json({ ok: false, error: 'missing_session_id' }, { status: 400 })

  const ok = await endSession(sessionId)
  return Response.json({ ok })
}
