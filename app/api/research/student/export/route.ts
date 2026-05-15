// v1.1 단계 10-7: 학습자 본인 데이터 CSV 다운로드 — 개인정보 보호 차원의 자기 데이터 열람.
//
// 인증: research_participant_id 쿠키. 본인 데이터만 반환(타 참여자 데이터 절대 노출 X).

import { csvResponse, toCsv } from '@/src/lib/research/csv'
import {
  listAssessmentsBySession,
  listSessionsByParticipant,
  listUtterancesBySession,
} from '@/src/lib/research/repository'
import { getCurrentParticipant } from '@/src/lib/research/session'

export async function GET() {
  const participant = await getCurrentParticipant()
  if (!participant) {
    return Response.json({ ok: false, error: 'no_session' }, { status: 401 })
  }

  const sessions = await listSessionsByParticipant(participant.id)
  const allUtterances = await Promise.all(sessions.map((s) => listUtterancesBySession(s.id)))
  const allAssessments = await Promise.all(sessions.map((s) => listAssessmentsBySession(s.id)))

  // 통합 wide-ish CSV — 세션별로 묶고 발화·평가를 JSON 컬럼에 직렬화.
  const rows = sessions.map((s, idx) => {
    const utterances = allUtterances[idx]
    const assessments = allAssessments[idx]
    const duration =
      s.sessionEndedAt
        ? Math.round((new Date(s.sessionEndedAt).getTime() - new Date(s.sessionStartedAt).getTime()) / 1000)
        : null
    return [
      s.id,
      s.mode,
      s.sessionStartedAt,
      s.sessionEndedAt ?? '',
      duration ?? '',
      s.metaJson,
      utterances.map((u) => ({ turn: u.turnNumber, speaker: u.speaker, text: u.text })),
      assessments.map((a) => ({ score: a.scoreTotal, detail: a.scoresDetail, feedback: a.feedbackText })),
    ]
  })

  const csv = toCsv(
    [
      'session_id',
      'mode',
      'started_at',
      'ended_at',
      'duration_sec',
      'meta_json',
      'utterances_json',
      'assessments_json',
    ],
    rows,
  )

  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  return csvResponse(`my_research_data_${participant.participantCode}_${ts}.csv`, csv)
}
