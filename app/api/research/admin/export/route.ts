// v1.1 단계 10-6: 관리자 CSV 내보내기 — 4종(sessions/utterances/assessments/summary).
//
// 인증: research_admin 쿠키 검증. 미인증/미설정 시 401.
// 사용법: GET /api/research/admin/export?type=sessions

import { csvResponse, toCsv } from '@/src/lib/research/csv'
import {
  listAllAssessments,
  listAllSessions,
  listAllUtterances,
  listParticipants,
} from '@/src/lib/research/repository'
import { isAdmin } from '@/src/lib/research/session'

type ExportType = 'sessions' | 'utterances' | 'assessments' | 'summary'

function isExportType(s: string | null): s is ExportType {
  return s === 'sessions' || s === 'utterances' || s === 'assessments' || s === 'summary'
}

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return Response.json({ ok: false, error: 'forbidden' }, { status: 401 })
  }

  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  if (!isExportType(type)) {
    return Response.json({ ok: false, error: 'invalid_type' }, { status: 400 })
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-')

  switch (type) {
    case 'sessions': {
      const [participants, sessions] = await Promise.all([listParticipants(), listAllSessions()])
      const pMap = new Map(participants.map((p) => [p.id, p]))
      const rows = sessions.map((s) => {
        const p = pMap.get(s.participantId)
        const duration =
          s.sessionEndedAt && s.sessionStartedAt
            ? Math.round(
                (new Date(s.sessionEndedAt).getTime() - new Date(s.sessionStartedAt).getTime()) /
                  1000,
              )
            : null
        return [
          s.id,
          p?.participantCode ?? '',
          p?.name ?? '',
          s.mode,
          s.sessionStartedAt,
          s.sessionEndedAt ?? '',
          duration ?? '',
          s.metaJson,
        ]
      })
      const csv = toCsv(
        ['session_id', 'participant_code', 'participant_name', 'mode', 'started_at', 'ended_at', 'duration_sec', 'meta_json'],
        rows,
      )
      return csvResponse(`research_sessions_${ts}.csv`, csv)
    }

    case 'utterances': {
      const [participants, sessions, utterances] = await Promise.all([
        listParticipants(),
        listAllSessions(),
        listAllUtterances(),
      ])
      const pMap = new Map(participants.map((p) => [p.id, p]))
      const sMap = new Map(sessions.map((s) => [s.id, s]))
      const rows = utterances.map((u) => {
        const sess = sMap.get(u.sessionId)
        const part = sess ? pMap.get(sess.participantId) : undefined
        return [
          u.id,
          u.sessionId,
          part?.participantCode ?? '',
          sess?.mode ?? '',
          u.turnNumber,
          u.speaker,
          u.text,
          u.audioUrl ?? '',
          u.responseTimeMs ?? '',
          u.toolCalls ?? '',
          u.metaJson ?? '',
          u.createdAt,
        ]
      })
      const csv = toCsv(
        [
          'utterance_id',
          'session_id',
          'participant_code',
          'mode',
          'turn_number',
          'speaker',
          'text',
          'audio_url',
          'response_time_ms',
          'tool_calls',
          'meta_json',
          'created_at',
        ],
        rows,
      )
      return csvResponse(`research_utterances_${ts}.csv`, csv)
    }

    case 'assessments': {
      const [participants, sessions, assessments] = await Promise.all([
        listParticipants(),
        listAllSessions(),
        listAllAssessments(),
      ])
      const pMap = new Map(participants.map((p) => [p.id, p]))
      const sMap = new Map(sessions.map((s) => [s.id, s]))
      const rows = assessments.map((a) => {
        const sess = sMap.get(a.sessionId)
        const part = sess ? pMap.get(sess.participantId) : undefined
        return [
          a.id,
          a.sessionId,
          part?.participantCode ?? '',
          a.mode,
          a.scoreTotal ?? '',
          a.scoresDetail,
          a.feedbackText ?? '',
          a.pronunciationData ?? '',
          a.createdAt,
        ]
      })
      const csv = toCsv(
        [
          'assessment_id',
          'session_id',
          'participant_code',
          'mode',
          'score_total',
          'scores_detail',
          'feedback_text',
          'pronunciation_data',
          'created_at',
        ],
        rows,
      )
      return csvResponse(`research_assessments_${ts}.csv`, csv)
    }

    case 'summary': {
      // 분석용 wide format: 참여자 1행 — 누적 세션 수, 모드별 세션 수, 평균 점수, 발화 수.
      const [participants, sessions, utterances, assessments] = await Promise.all([
        listParticipants(),
        listAllSessions(),
        listAllUtterances(),
        listAllAssessments(),
      ])
      const sMap = new Map(sessions.map((s) => [s.id, s]))
      const sessionsByParticipant = new Map<string, typeof sessions>()
      for (const s of sessions) {
        const arr = sessionsByParticipant.get(s.participantId) ?? []
        arr.push(s)
        sessionsByParticipant.set(s.participantId, arr)
      }
      const utterancesByParticipant = new Map<string, number>()
      for (const u of utterances) {
        const sess = sMap.get(u.sessionId)
        if (!sess) continue
        if (u.speaker !== 'learner') continue
        utterancesByParticipant.set(sess.participantId, (utterancesByParticipant.get(sess.participantId) ?? 0) + 1)
      }
      const scoresByParticipantMode = new Map<string, number[]>()
      for (const a of assessments) {
        const sess = sMap.get(a.sessionId)
        if (!sess) continue
        if (a.scoreTotal === null) continue
        const key = `${sess.participantId}::${a.mode}`
        const arr = scoresByParticipantMode.get(key) ?? []
        arr.push(a.scoreTotal)
        scoresByParticipantMode.set(key, arr)
      }
      function avg(key: string): string {
        const arr = scoresByParticipantMode.get(key)
        if (!arr || arr.length === 0) return ''
        return (arr.reduce((s, x) => s + x, 0) / arr.length).toFixed(2)
      }

      const rows = participants.map((p) => {
        const ss = sessionsByParticipant.get(p.id) ?? []
        const modeCounts = ss.reduce<Record<string, number>>((acc, s) => {
          acc[s.mode] = (acc[s.mode] ?? 0) + 1
          return acc
        }, {})
        return [
          p.participantCode,
          p.name ?? '',
          p.nationality ?? '',
          p.koreanLevel ?? '',
          p.motherTongue ?? '',
          p.consentStatus,
          p.consentAt ?? '',
          p.enrolledAt,
          ss.length,
          modeCounts.free_conversation ?? 0,
          modeCounts.q1_repeat ?? 0,
          modeCounts.q2_describe ?? 0,
          modeCounts.q3_picture ?? 0,
          modeCounts.q4_dialogue ?? 0,
          modeCounts.presentation ?? 0,
          modeCounts.reading ?? 0,
          utterancesByParticipant.get(p.id) ?? 0,
          avg(`${p.id}::free_conversation`),
          avg(`${p.id}::q1_repeat`),
          avg(`${p.id}::q2_describe`),
          avg(`${p.id}::q3_picture`),
          avg(`${p.id}::q4_dialogue`),
          avg(`${p.id}::presentation`),
          avg(`${p.id}::reading`),
        ]
      })
      const csv = toCsv(
        [
          'participant_code',
          'name',
          'nationality',
          'korean_level',
          'mother_tongue',
          'consent_status',
          'consent_at',
          'enrolled_at',
          'total_sessions',
          'sessions_free_conversation',
          'sessions_q1_repeat',
          'sessions_q2_describe',
          'sessions_q3_picture',
          'sessions_q4_dialogue',
          'sessions_presentation',
          'sessions_reading',
          'learner_utterances_total',
          'avg_score_free_conversation',
          'avg_score_q1_repeat',
          'avg_score_q2_describe',
          'avg_score_q3_picture',
          'avg_score_q4_dialogue',
          'avg_score_presentation',
          'avg_score_reading',
        ],
        rows,
      )
      return csvResponse(`research_summary_${ts}.csv`, csv)
    }
  }
}
