// v1.1 단계 10-7: 학습자 본인 진척 페이지.
//
// 본인 누적 학습 시간·모드별 사용 분포·점수 추이·최근 세션 목록.
// 동기 부여 요소는 절제된 수준(이번 주 X분)으로만 표시. 과한 게임화 X.

import Link from 'next/link'
import { redirect } from 'next/navigation'

import {
  listAssessmentsBySession,
  listSessionsByParticipant,
} from '@/src/lib/research/repository'
import { getCurrentParticipant } from '@/src/lib/research/session'
import { DisplayLanguageToggle } from '@/src/components/ui/display-language-toggle'
import { ModeDonut, DailyBars, ScoreLine } from '@/src/components/research/progress-charts'

import { logoutAction } from '../actions'

const MODE_LABEL: Record<string, string> = {
  free_conversation: '자유 대화',
  q1_repeat: 'q1 낭독',
  q2_describe: 'q2 설명',
  q3_picture: 'q3 그림',
  q4_dialogue: 'q4 대화',
  presentation: '발표',
  reading: '읽기',
}

function fmtMinutes(sec: number): string {
  if (sec < 60) return `${sec}초`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s === 0 ? `${m}분` : `${m}분 ${s}초`
}

// v1.1 25-4: 최근 7일(오늘 포함) 일자별 세션 카운트 — DailyBars 입력.
function buildDailyBuckets(sessions: { sessionStartedAt: string }[]): { date: string; value: number }[] {
  const dayMs = 86_400_000
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const buckets: { date: string; value: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * dayMs)
    const iso = d.toISOString().slice(0, 10)
    buckets.push({ date: iso, value: 0 })
  }
  for (const s of sessions) {
    const sd = new Date(s.sessionStartedAt)
    sd.setHours(0, 0, 0, 0)
    const iso = sd.toISOString().slice(0, 10)
    const b = buckets.find((x) => x.date === iso)
    if (b) b.value += 1
  }
  return buckets
}

function startOfWeekKST(): number {
  // 단순화: 시연용으로 클라이언트 timezone 무시. 일요일 00:00 KST 기준 7일.
  const now = new Date()
  const day = now.getDay()
  const sunday = new Date(now)
  sunday.setHours(0, 0, 0, 0)
  sunday.setDate(now.getDate() - day)
  return sunday.getTime()
}

export default async function StudentProgressPage() {
  const participant = await getCurrentParticipant()
  if (!participant) redirect('/research/login')
  if (!participant.consentStatus) redirect('/research/consent')

  const sessions = await listSessionsByParticipant(participant.id)
  const sessionsWithAssessments = await Promise.all(
    sessions.map(async (s) => ({ session: s, assessments: await listAssessmentsBySession(s.id) })),
  )

  // 모드별 사용 분포
  const modeCounts: Record<string, number> = {}
  for (const s of sessions) modeCounts[s.mode] = (modeCounts[s.mode] ?? 0) + 1

  // 누적 학습 시간 (세션 시작~종료 차이의 합)
  let totalSec = 0
  let weekSec = 0
  const weekStart = startOfWeekKST()
  for (const s of sessions) {
    if (!s.sessionEndedAt) continue
    const dur = Math.max(
      0,
      Math.round((new Date(s.sessionEndedAt).getTime() - new Date(s.sessionStartedAt).getTime()) / 1000),
    )
    totalSec += dur
    if (new Date(s.sessionStartedAt).getTime() >= weekStart) weekSec += dur
  }

  // 점수 추이 (assessment 시간 순)
  const scorePoints = sessionsWithAssessments
    .flatMap(({ session, assessments }) =>
      assessments
        .filter((a) => a.scoreTotal !== null)
        .map((a) => ({
          at: new Date(a.createdAt).getTime(),
          score: a.scoreTotal!,
          mode: session.mode,
        })),
    )
    .sort((a, b) => a.at - b.at)

  const recent = [...sessions]
    .sort((a, b) => new Date(b.sessionStartedAt).getTime() - new Date(a.sessionStartedAt).getTime())
    .slice(0, 8)

  return (
    <main className="max-w-2xl mx-auto px-4 py-8" data-testid="research-student-progress">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-text-primary">학습 진척 상황</h1>
          <p className="text-sm text-text-secondary mt-1">
            참여자 코드: <span className="font-mono">{participant.participantCode}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* v1.1 16-10-5: 표시 언어 토글 — 모국어 자동 적용, 명시 선택 시 유지. */}
          <DisplayLanguageToggle motherTongueHint={participant.motherTongue} />
          <form action={logoutAction}>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-md border border-border bg-surface text-sm text-text-secondary hover:bg-slate-50"
              data-testid="btn-participant-logout"
            >
              로그아웃
            </button>
          </form>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="student-stats">
        <Stat label="총 세션" value={String(sessions.length)} />
        <Stat label="누적 학습 시간" value={fmtMinutes(totalSec)} />
        <Stat label="이번 주" value={fmtMinutes(weekSec)} />
        <Stat label="평가 횟수" value={String(scorePoints.length)} />
      </section>

      {sessions.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-text-primary mb-2">모드별 사용 분포</h2>
          {/* v1.1 25-4: 도넛 + 범례 시각화 */}
          <div data-testid="mode-distribution">
            <ModeDonut
              data={Object.keys(MODE_LABEL)
                .filter((m) => (modeCounts[m] ?? 0) > 0)
                .map((m) => ({ label: MODE_LABEL[m], value: modeCounts[m] ?? 0 }))}
            />
          </div>
        </section>
      ) : null}

      {sessions.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-text-primary mb-2">최근 7일 학습 활동</h2>
          {/* 일별 막대 차트 — 오늘 포함 7일 */}
          <DailyBars data={buildDailyBuckets(sessions)} />
        </section>
      ) : null}

      {scorePoints.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-text-primary mb-2">점수 추이</h2>
          <ScoreLine points={scorePoints.map((p) => ({ at: p.at, score: p.score }))} />
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-text-primary mb-2">최근 세션</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-text-muted" data-testid="no-sessions">아직 세션이 없습니다. 아래 학습 모드 중 하나를 선택해 시작하세요.</p>
        ) : (
          <ul className="text-sm space-y-1.5" data-testid="recent-sessions">
            {recent.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-text-secondary">
                <span className="text-xs text-text-muted whitespace-nowrap">
                  {new Date(s.sessionStartedAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span>·</span>
                <span>{MODE_LABEL[s.mode] ?? s.mode}</span>
                {s.sessionEndedAt
                  ? <span className="text-xs text-emerald-600 ml-2">(완료)</span>
                  : <span className="text-xs text-yellow-600 ml-2">(진행 중)</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-text-primary mb-2">학습 시작</h2>
        <nav className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/student/conversation-practice"
            className="block rounded-lg border border-border bg-surface p-4 hover:bg-slate-50"
            data-testid="nav-free-conversation"
          >
            <p className="text-sm font-semibold text-text-primary">생성형 자유 대화</p>
            <p className="text-xs text-text-muted mt-1">페르소나 4명 중 선택해 일상 대화 연습</p>
          </Link>
          <Link
            href="/student/speaking"
            className="block rounded-lg border border-border bg-surface p-4 hover:bg-slate-50"
            data-testid="nav-speaking"
          >
            <p className="text-sm font-semibold text-text-primary">말하기 평가 (q1~q4)</p>
            <p className="text-xs text-text-muted mt-1">따라 읽기·묘사·그림 설명·대화</p>
          </Link>
          <Link
            href="/student/presentation-practice"
            className="block rounded-lg border border-border bg-surface p-4 hover:bg-slate-50"
            data-testid="nav-presentation"
          >
            <p className="text-sm font-semibold text-text-primary">발표 연습</p>
          </Link>
          <Link
            href="/student/reading-practice"
            className="block rounded-lg border border-border bg-surface p-4 hover:bg-slate-50"
            data-testid="nav-reading"
          >
            <p className="text-sm font-semibold text-text-primary">읽기 연습</p>
          </Link>
        </nav>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-text-primary mb-2">내 데이터 다운로드</h2>
        <p className="text-xs text-text-muted leading-relaxed mb-3">
          참여자 본인의 누적 세션·발화·평가 기록을 CSV로 다운로드합니다 (개인정보 보호 차원).
        </p>
        <a
          href="/api/research/student/export"
          download
          className="inline-block rounded-md border border-border bg-surface text-sm text-text-secondary font-medium px-4 py-2 hover:bg-slate-50"
          data-testid="btn-download-own-data"
        >
          내 데이터 CSV 다운로드
        </a>
      </section>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3" data-testid={`stat-${label}`}>
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-text-primary tabular-nums">{value}</p>
    </div>
  )
}

