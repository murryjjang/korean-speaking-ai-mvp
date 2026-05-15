// v1.1 단계 10-6: 참여자 상세 — 세션 목록·모드 분포·점수 추이·페르소나 선호도.

import Link from 'next/link'
import { notFound } from 'next/navigation'

import {
  getParticipantById,
  listAssessmentsBySession,
  listConsentLogsByParticipant,
  listSessionsByParticipant,
} from '@/src/lib/research/repository'

type Params = Promise<{ id: string }>

const MODE_LABEL: Record<string, string> = {
  free_conversation: '자유 대화',
  q1_repeat: 'q1 낭독',
  q2_describe: 'q2 설명',
  q3_picture: 'q3 그림',
  q4_dialogue: 'q4 대화',
  presentation: '발표',
  reading: '읽기',
}

export default async function ParticipantDetailPage({ params }: { params: Params }) {
  const { id } = await params
  const participant = await getParticipantById(id)
  if (!participant) notFound()

  const [sessions, consentLogs] = await Promise.all([
    listSessionsByParticipant(participant.id),
    listConsentLogsByParticipant(participant.id),
  ])

  const sessionAssessments = await Promise.all(
    sessions.map(async (s) => ({ session: s, assessments: await listAssessmentsBySession(s.id) })),
  )

  // 모드별 사용 분포
  const modeCounts: Record<string, number> = {}
  for (const s of sessions) modeCounts[s.mode] = (modeCounts[s.mode] ?? 0) + 1

  // 페르소나 선호도 (자유 대화 meta_json.personaId 기준)
  const personaCounts: Record<string, number> = {}
  for (const s of sessions) {
    if (s.mode !== 'free_conversation') continue
    const pid = typeof s.metaJson.personaId === 'string' ? s.metaJson.personaId : 'unknown'
    personaCounts[pid] = (personaCounts[pid] ?? 0) + 1
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8" data-testid="participant-detail">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            참여자 <span className="font-mono">{participant.participantCode}</span>
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {participant.name ?? '(이름 미입력)'} · {participant.nationality ?? '국적 미입력'} ·{' '}
            {participant.koreanLevel ?? '한국어 수준 미입력'} · 모국어 {participant.motherTongue ?? '-'}
          </p>
        </div>
        <Link href="/research/admin/participants" className="text-sm text-primary-600 hover:underline">← 목록</Link>
      </header>

      <section className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3" data-testid="participant-stats">
        <Stat label="총 세션" value={String(sessions.length)} />
        <Stat label="동의 상태" value={participant.consentStatus ? '완료' : '미완료'} sub={participant.consentAt ? new Date(participant.consentAt).toLocaleString('ko-KR') : ''} />
        <Stat label="동의 이력" value={String(consentLogs.length)} />
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-text-primary mb-2">모드별 사용 분포</h2>
        <ul className="space-y-1.5" data-testid="mode-distribution">
          {Object.keys(MODE_LABEL).map((m) => (
            <li key={m} className="flex items-center gap-3 text-sm">
              <span className="w-24 text-xs text-text-secondary">{MODE_LABEL[m]}</span>
              <div className="flex-1 h-3 rounded bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-primary-500"
                  style={{ width: sessions.length === 0 ? '0%' : `${Math.round(((modeCounts[m] ?? 0) / sessions.length) * 100)}%` }}
                  aria-hidden
                />
              </div>
              <span className="w-10 text-right text-xs tabular-nums">{modeCounts[m] ?? 0}</span>
            </li>
          ))}
        </ul>
      </section>

      {Object.keys(personaCounts).length > 0 ? (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-text-primary mb-2">자유 대화 페르소나 선호도</h2>
          <ul className="text-sm space-y-1" data-testid="persona-preference">
            {Object.entries(personaCounts).map(([pid, count]) => (
              <li key={pid}>
                <span className="font-mono text-xs">{pid}</span> — {count}회
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-text-primary mb-2">세션 목록 ({sessions.length})</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-text-muted">아직 세션이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-border rounded-md" data-testid="sessions-table">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">시작</th>
                  <th className="px-3 py-2 font-medium">모드</th>
                  <th className="px-3 py-2 font-medium">지속</th>
                  <th className="px-3 py-2 font-medium">평가 점수</th>
                  <th className="px-3 py-2 font-medium">메타</th>
                </tr>
              </thead>
              <tbody>
                {sessionAssessments.map(({ session: s, assessments }) => {
                  const duration =
                    s.sessionEndedAt && s.sessionStartedAt
                      ? Math.round((new Date(s.sessionEndedAt).getTime() - new Date(s.sessionStartedAt).getTime()) / 1000)
                      : null
                  const scoreLine = assessments
                    .filter((a) => a.scoreTotal !== null)
                    .map((a) => a.scoreTotal!.toFixed(1))
                    .join(', ')
                  return (
                    <tr key={s.id} className="border-t border-border align-top" data-testid={`session-row-${s.id}`}>
                      <td className="px-3 py-2 text-xs text-text-muted whitespace-nowrap">{new Date(s.sessionStartedAt).toLocaleString('ko-KR')}</td>
                      <td className="px-3 py-2">{MODE_LABEL[s.mode] ?? s.mode}</td>
                      <td className="px-3 py-2 text-xs tabular-nums">{duration !== null ? `${duration}초` : '진행 중'}</td>
                      <td className="px-3 py-2 text-xs tabular-nums">{scoreLine || '-'}</td>
                      <td className="px-3 py-2 text-xs font-mono text-text-muted break-all">{JSON.stringify(s.metaJson)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-text-primary tabular-nums">{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-text-muted truncate">{sub}</p> : null}
    </div>
  )
}
