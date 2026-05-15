// v1.1 단계 10-4: research 발화 기록 — 학습자/NPC 발화 + 응답시간 + 도구 호출.

import { createUtterance } from '@/src/lib/research/repository'
import { readParticipantId } from '@/src/lib/research/session'
import type { ResearchSpeaker } from '@/src/lib/research/types'

function isSpeaker(s: unknown): s is ResearchSpeaker {
  return s === 'learner' || s === 'npc'
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

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : ''
  const text = typeof body.text === 'string' ? body.text : ''
  const turnNumber = typeof body.turnNumber === 'number' ? Math.floor(body.turnNumber) : -1
  if (!sessionId || !text || turnNumber < 0 || !isSpeaker(body.speaker)) {
    return Response.json({ ok: false, error: 'invalid_payload' }, { status: 400 })
  }

  const audioUrl = typeof body.audioUrl === 'string' ? body.audioUrl : null
  const responseTimeMs = typeof body.responseTimeMs === 'number' ? Math.floor(body.responseTimeMs) : null
  const toolCalls = Array.isArray(body.toolCalls) ? (body.toolCalls as Record<string, unknown>[]) : null
  const metaJson =
    body.metaJson && typeof body.metaJson === 'object' && !Array.isArray(body.metaJson)
      ? (body.metaJson as Record<string, unknown>)
      : null

  const row = await createUtterance({
    sessionId,
    turnNumber,
    speaker: body.speaker,
    text,
    audioUrl,
    responseTimeMs,
    toolCalls,
    metaJson,
  })

  return Response.json({ ok: !!row })
}
