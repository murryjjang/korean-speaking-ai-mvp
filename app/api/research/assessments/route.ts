// v1.1 단계 10-4·10-5: research 평가 기록 — 모드별 점수·피드백·발음 raw.

import { createAssessment } from '@/src/lib/research/repository'
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

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : ''
  if (!sessionId) return Response.json({ ok: false, error: 'missing_session_id' }, { status: 400 })
  if (!isValidMode(body.mode)) return Response.json({ ok: false, error: 'invalid_mode' }, { status: 400 })

  const scoreTotal = typeof body.scoreTotal === 'number' ? body.scoreTotal : null
  const scoresDetail =
    body.scoresDetail && typeof body.scoresDetail === 'object' && !Array.isArray(body.scoresDetail)
      ? (body.scoresDetail as Record<string, unknown>)
      : {}
  const feedbackText = typeof body.feedbackText === 'string' ? body.feedbackText : null
  const pronunciationData =
    body.pronunciationData && typeof body.pronunciationData === 'object' && !Array.isArray(body.pronunciationData)
      ? (body.pronunciationData as Record<string, unknown>)
      : null

  const row = await createAssessment({
    sessionId,
    mode: body.mode,
    scoreTotal,
    scoresDetail,
    feedbackText,
    pronunciationData,
  })

  return Response.json({ ok: !!row })
}
