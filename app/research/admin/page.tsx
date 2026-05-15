// v1.1 단계 10-6: 관리자 대시보드 — 참여자·세션 통계 + 네비게이션.

import Link from 'next/link'

import {
  isResearchRepoConfigured,
  listAllAssessments,
  listAllSessions,
  listAllUtterances,
  listParticipants,
} from '@/src/lib/research/repository'

import { clearAdminSessionAction } from './actions'

function countByMode(items: { mode: string }[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const it of items) out[it.mode] = (out[it.mode] ?? 0) + 1
  return out
}

function within24Hours(iso: string): boolean {
  const t = new Date(iso).getTime()
  return Number.isFinite(t) && Date.now() - t <= 24 * 60 * 60 * 1000
}

export default async function AdminHomePage() {
  const configured = isResearchRepoConfigured()
  const [participants, sessions, utterances, assessments] = configured
    ? await Promise.all([listParticipants(), listAllSessions(), listAllUtterances(), listAllAssessments()])
    : [[], [], [], []]

  const consentedCount = participants.filter((p) => p.consentStatus).length
  const learnerUtteranceCount = utterances.filter((u) => u.speaker === 'learner').length
  const modeCounts = countByMode(sessions)
  const recent24h = sessions.filter((s) => within24Hours(s.sessionStartedAt))

  const scoresWithValue = assessments.filter((a) => a.scoreTotal !== null)
  const avgScore =
    scoresWithValue.length === 0
      ? null
      : scoresWithValue.reduce((sum, a) => sum + (a.scoreTotal ?? 0), 0) / scoresWithValue.length

  return (
    <main className="max-w-4xl mx-auto px-4 py-8" data-testid="research-admin-home">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">시험운영 관리자</h1>
          <p className="text-sm text-text-secondary mt-1">참여자·세션·CSV 내보내기를 관리합니다.</p>
        </div>
        <form action={clearAdminSessionAction}>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-md border border-border bg-surface text-sm text-text-secondary hover:bg-slate-50"
            data-testid="btn-admin-logout"
          >
            로그아웃
          </button>
        </form>
      </header>

      {!configured ? (
        <div className="mt-6 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900" data-testid="not-configured-warning">
          Supabase가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 .env.local에 설정하세요.
        </div>
      ) : null}

      <section className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="dashboard-stats">
        <Stat label="참여자" value={String(participants.length)} sub={`동의 완료 ${consentedCount}`} />
        <Stat label="총 세션" value={String(sessions.length)} sub={`최근 24h ${recent24h.length}`} />
        <Stat label="학습자 발화" value={String(learnerUtteranceCount)} sub="모드 합계" />
        <Stat
          label="평균 점수"
          value={avgScore === null ? '-' : avgScore.toFixed(1)}
          sub={scoresWithValue.length === 0 ? '평가 없음' : `평가 ${scoresWithValue.length}건`}
        />
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-text-primary mb-2">모드별 세션 분포</h2>
        <ModeBar counts={modeCounts} total={sessions.length} />
      </section>

      <nav className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/research/admin/participants"
          className="block rounded-lg border border-border bg-surface p-4 hover:bg-slate-50"
          data-testid="nav-participants"
        >
          <p className="text-sm font-semibold text-text-primary">참여자 관리</p>
          <p className="text-xs text-text-muted mt-1">신규 발급·목록·상세·동의 상태</p>
        </Link>
        <Link
          href="/research/admin/export"
          className="block rounded-lg border border-border bg-surface p-4 hover:bg-slate-50"
          data-testid="nav-export"
        >
          <p className="text-sm font-semibold text-text-primary">CSV 내보내기</p>
          <p className="text-xs text-text-muted mt-1">세션·발화·평가·요약 (분석용)</p>
        </Link>
      </nav>
    </main>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3" data-testid={`stat-${label}`}>
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-text-primary tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] text-text-muted">{sub}</p>
    </div>
  )
}

const MODE_LABELS: Record<string, string> = {
  free_conversation: '자유 대화',
  q1_repeat: 'q1 낭독',
  q2_describe: 'q2 설명',
  q3_picture: 'q3 그림',
  q4_dialogue: 'q4 대화',
  presentation: '발표',
  reading: '읽기',
}

function ModeBar({ counts, total }: { counts: Record<string, number>; total: number }) {
  if (total === 0) return <p className="text-sm text-text-muted">세션 데이터가 아직 없습니다.</p>
  const entries = Object.entries(MODE_LABELS).map(([k, label]) => ({
    key: k,
    label,
    count: counts[k] ?? 0,
  }))
  return (
    <ul className="space-y-2" data-testid="mode-distribution">
      {entries.map((e) => (
        <li key={e.key} className="flex items-center gap-3 text-sm">
          <span className="w-24 text-xs text-text-secondary">{e.label}</span>
          <div className="flex-1 h-3 rounded bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-primary-500"
              style={{ width: total === 0 ? '0%' : `${Math.round((e.count / total) * 100)}%` }}
              aria-hidden
            />
          </div>
          <span className="w-12 text-right text-xs tabular-nums">{e.count}</span>
        </li>
      ))}
    </ul>
  )
}
