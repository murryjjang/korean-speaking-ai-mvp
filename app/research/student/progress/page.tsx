// v1.1 단계 10-7: 학습자 본인 진척 페이지.
//
// 본인 누적 학습 시간·모드별 사용 분포·점수 추이·최근 세션 목록.
// 동기 부여 요소는 절제된 수준(이번 주 X분)으로만 표시. 과한 게임화 X.

import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import {
  listAssessmentsBySession,
  listSessionsByParticipant,
} from '@/src/lib/research/repository'
import { getCurrentParticipant } from '@/src/lib/research/session'
import { DisplayLanguageToggle } from '@/src/components/ui/display-language-toggle'
import { Localized, LocalizedDuration } from '@/src/components/ui/localized'
import { PersonaAvatar } from '@/src/components/ui/persona-avatar'
import { getPersona } from '@/src/lib/personas'
import { DailyBars, ScoreLine } from '@/src/components/research/progress-charts'
import { LocalizedModeDonut } from '@/src/components/research/localized-mode-donut'
import { PdfDownloadButton } from '@/src/components/pdf-download-button'
import { MODE_LABELS } from '@/src/lib/i18n/dashboard-labels'
import { LocalizedModeLabel, LocalizedScore } from '@/src/components/ui/localized-extras'

import { logoutAction } from '../actions'

// 정적 매핑 (도넛 차트 라벨용 — 차트는 서버 렌더 시 ko 기본).
// 헤더 토글에 즉시 반응하는 라벨은 <Localized/> 컴포넌트로 렌더.
const MODE_LABEL_KO: Record<string, string> = {
  free_conversation: MODE_LABELS.free_conversation.ko,
  q1_repeat: MODE_LABELS.q1_repeat.ko,
  q2_describe: MODE_LABELS.q2_describe.ko,
  q3_picture: MODE_LABELS.q3_picture.ko,
  q4_dialogue: MODE_LABELS.q4_dialogue.ko,
  presentation: MODE_LABELS.presentation.ko,
  reading: MODE_LABELS.reading.ko,
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

  // 단계 18 [C3]: 최근 세션을 풍부화 — 페르소나·점수·핵심 주제를 함께 표시.
  // sessionsWithAssessments에서 미리 fetch된 assessment 데이터를 활용해 N+1 호출 방지.
  const assessmentsBySession = new Map(
    sessionsWithAssessments.map(({ session, assessments }) => [session.id, assessments]),
  )
  const recent = [...sessions]
    .sort((a, b) => new Date(b.sessionStartedAt).getTime() - new Date(a.sessionStartedAt).getTime())
    .slice(0, 8)
    .map((s) => {
      const meta = s.metaJson ?? {}
      const personaId = typeof meta.personaId === 'string' ? meta.personaId : null
      const persona = personaId ? getPersona(personaId) : null
      const topic = typeof meta.topic === 'string' ? meta.topic : null
      const scoreTotal = (assessmentsBySession.get(s.id) ?? [])
        .map((a) => a.scoreTotal)
        .find((v): v is number => typeof v === 'number')
      return { session: s, persona, topic, scoreTotal: scoreTotal ?? null }
    })

  return (
    <main className="max-w-2xl mx-auto px-4 py-8" data-testid="research-student-progress">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            <Localized
              spec={{ kind: 'page', key: 'progressTitle' }}
              motherTongueHint={participant.motherTongue}
            />
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            <Localized
              spec={{ kind: 'page', key: 'participantCode' }}
              motherTongueHint={participant.motherTongue}
            />
            : <span className="font-mono">{participant.participantCode}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* 단계 18 [D8] 헤더 토글 — 모국어 자동 적용, 명시 선택 시 유지. */}
          <DisplayLanguageToggle motherTongueHint={participant.motherTongue} />
          {/* v1.1 26-4: 진척 종합 PDF 다운로드 */}
          <PdfDownloadButton
            targetId="research-progress-pdf-target"
            fileName={`학습진척_${participant.participantCode}_${new Date().toISOString().slice(0,10)}.pdf`}
            label="진척 PDF"
          />
          <form action={logoutAction}>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-md border border-border bg-surface text-sm text-text-secondary hover:bg-slate-50"
              data-testid="btn-participant-logout"
            >
              <Localized
                spec={{ kind: 'page', key: 'logout' }}
                motherTongueHint={participant.motherTongue}
              />
            </button>
          </form>
        </div>
      </header>

      <div id="research-progress-pdf-target">

      <section className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="student-stats">
        <Stat
          labelSpec={{ kind: 'kpi', key: 'totalSessions' }}
          motherTongueHint={participant.motherTongue}
          value={<>{String(sessions.length)}</>}
        />
        <Stat
          labelSpec={{ kind: 'kpi', key: 'cumulativeTime' }}
          motherTongueHint={participant.motherTongue}
          value={
            <LocalizedDuration
              totalSeconds={totalSec}
              motherTongueHint={participant.motherTongue}
            />
          }
        />
        <Stat
          labelSpec={{ kind: 'kpi', key: 'thisWeek' }}
          motherTongueHint={participant.motherTongue}
          value={
            <LocalizedDuration
              totalSeconds={weekSec}
              motherTongueHint={participant.motherTongue}
            />
          }
        />
        <Stat
          labelSpec={{ kind: 'kpi', key: 'assessmentCount' }}
          motherTongueHint={participant.motherTongue}
          value={<>{String(scorePoints.length)}</>}
        />
      </section>

      {sessions.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-text-primary mb-2">
            <Localized
              spec={{ kind: 'chart', key: 'modeDistribution' }}
              motherTongueHint={participant.motherTongue}
            />
          </h2>
          {/* v1.1 단계 19 [D6.5]: 차트 범례를 표시 언어에 맞춰 i18n. */}
          <div data-testid="mode-distribution">
            <LocalizedModeDonut
              counts={Object.keys(MODE_LABEL_KO)
                .filter((m) => (modeCounts[m] ?? 0) > 0)
                .map((m) => ({ mode: m, value: modeCounts[m] ?? 0 }))}
              motherTongueHint={participant.motherTongue}
            />
          </div>
        </section>
      ) : null}

      {sessions.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-text-primary mb-2">
            <Localized
              spec={{ kind: 'chart', key: 'last7Days' }}
              motherTongueHint={participant.motherTongue}
            />
          </h2>
          {/* 일별 막대 차트 — 오늘 포함 7일 */}
          <DailyBars data={buildDailyBuckets(sessions)} />
        </section>
      ) : null}

      {scorePoints.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-text-primary mb-2">
            <Localized
              spec={{ kind: 'chart', key: 'scoreTrend' }}
              motherTongueHint={participant.motherTongue}
            />
          </h2>
          <ScoreLine points={scorePoints.map((p) => ({ at: p.at, score: p.score }))} />
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-text-primary mb-2">
          <Localized
            spec={{ kind: 'chart', key: 'recentSessions' }}
            motherTongueHint={participant.motherTongue}
          />
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-text-muted" data-testid="no-sessions">
            <Localized
              spec={{ kind: 'page', key: 'noSessionsMsg' }}
              motherTongueHint={participant.motherTongue}
            />
          </p>
        ) : (
          <ul className="space-y-2" data-testid="recent-sessions">
            {recent.map(({ session: s, persona, topic, scoreTotal }) => (
              <li
                key={s.id}
                className="rounded-md border border-border bg-surface px-3 py-2"
                data-testid="recent-session-card"
              >
                <div className="flex items-start gap-3">
                  {persona ? (
                    <PersonaAvatar personaId={persona.personaId} size={32} />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="w-8 h-8 rounded-full bg-primary-50 inline-flex items-center justify-center text-xs text-primary-700"
                    >
                      {(MODE_LABEL_KO[s.mode] ?? s.mode).slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap text-xs text-text-muted">
                      <span className="whitespace-nowrap">
                        {new Date(s.sessionStartedAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span aria-hidden="true">·</span>
                      <LocalizedModeLabel
                        mode={s.mode}
                        motherTongueHint={participant.motherTongue}
                        className="font-medium text-text-secondary"
                        fallback={MODE_LABEL_KO[s.mode] ?? s.mode}
                      />
                      {persona && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-text-secondary">{persona.nameKo}</span>
                        </>
                      )}
                      {s.sessionEndedAt
                        ? <span className="text-emerald-600 ml-auto">(<Localized spec={{ kind: 'page', key: 'completed' }} motherTongueHint={participant.motherTongue} />)</span>
                        : <span className="text-yellow-600 ml-auto">(<Localized spec={{ kind: 'page', key: 'inProgress' }} motherTongueHint={participant.motherTongue} />)</span>}
                    </div>
                    <div className="mt-1 flex items-baseline gap-3">
                      {topic ? (
                        <p className="text-sm text-text-primary truncate">{topic}</p>
                      ) : (
                        <p className="text-sm text-text-muted">—</p>
                      )}
                      {scoreTotal !== null && (
                        <p className="text-xs font-semibold text-primary-700 tabular-nums ml-auto">
                          <LocalizedScore
                            score={scoreTotal}
                            motherTongueHint={participant.motherTongue}
                            testId="recent-session-score"
                          />
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>{/* /research-progress-pdf-target */}

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-text-primary mb-2">
          <Localized
            spec={{ kind: 'chart', key: 'startLearning' }}
            motherTongueHint={participant.motherTongue}
          />
        </h2>
        <nav className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/student/conversation-practice"
            className="block rounded-lg border border-border bg-surface p-4 hover:bg-slate-50"
            data-testid="nav-free-conversation"
          >
            <p className="text-sm font-semibold text-text-primary">
              <Localized spec={{ kind: 'modeCard', key: 'freeConvTitle' }} motherTongueHint={participant.motherTongue} />
            </p>
            <p className="text-xs text-text-muted mt-1">
              <Localized spec={{ kind: 'modeCard', key: 'freeConvSubtitle' }} motherTongueHint={participant.motherTongue} />
            </p>
          </Link>
          <Link
            href="/student/speaking"
            className="block rounded-lg border border-border bg-surface p-4 hover:bg-slate-50"
            data-testid="nav-speaking"
          >
            <p className="text-sm font-semibold text-text-primary">
              <Localized spec={{ kind: 'modeCard', key: 'speakingTitle' }} motherTongueHint={participant.motherTongue} />
            </p>
            <p className="text-xs text-text-muted mt-1">
              <Localized spec={{ kind: 'modeCard', key: 'speakingSubtitle' }} motherTongueHint={participant.motherTongue} />
            </p>
          </Link>
          <Link
            href="/student/presentation-practice"
            className="block rounded-lg border border-border bg-surface p-4 hover:bg-slate-50"
            data-testid="nav-presentation"
          >
            <p className="text-sm font-semibold text-text-primary">
              <Localized spec={{ kind: 'modeCard', key: 'presentationTitle' }} motherTongueHint={participant.motherTongue} />
            </p>
            <p className="text-xs text-text-muted mt-1">
              <Localized spec={{ kind: 'modeCard', key: 'presentationSubtitle' }} motherTongueHint={participant.motherTongue} />
            </p>
          </Link>
          <Link
            href="/student/reading-practice"
            className="block rounded-lg border border-border bg-surface p-4 hover:bg-slate-50"
            data-testid="nav-reading"
          >
            <p className="text-sm font-semibold text-text-primary">
              <Localized spec={{ kind: 'modeCard', key: 'readingTitle' }} motherTongueHint={participant.motherTongue} />
            </p>
            <p className="text-xs text-text-muted mt-1">
              <Localized spec={{ kind: 'modeCard', key: 'readingSubtitle' }} motherTongueHint={participant.motherTongue} />
            </p>
          </Link>
        </nav>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-text-primary mb-2">
          <Localized spec={{ kind: 'dataDownload', key: 'sectionTitle' }} motherTongueHint={participant.motherTongue} />
        </h2>
        <p className="text-xs text-text-muted leading-relaxed mb-3">
          <Localized spec={{ kind: 'dataDownload', key: 'sectionDescription' }} motherTongueHint={participant.motherTongue} />
        </p>
        <a
          href="/api/research/student/export"
          download
          className="inline-block rounded-md border border-border bg-surface text-sm text-text-secondary font-medium px-4 py-2 hover:bg-slate-50"
          data-testid="btn-download-own-data"
        >
          <Localized spec={{ kind: 'page', key: 'downloadOwnData' }} motherTongueHint={participant.motherTongue} />
        </a>
      </section>
    </main>
  )
}

function Stat({
  labelSpec,
  motherTongueHint,
  value,
}: {
  labelSpec: Parameters<typeof Localized>[0]['spec']
  motherTongueHint?: string | null
  value: ReactNode
}) {
  // data-testid은 라벨 텍스트 대신 KPI 키로 — 언어 토글 시 테스트가 깨지지 않도록.
  const testKey = labelSpec.kind === 'kpi' ? labelSpec.key : 'stat'
  return (
    <div className="rounded-lg border border-border bg-surface p-3" data-testid={`stat-${testKey}`}>
      <p className="text-xs text-text-muted">
        <Localized spec={labelSpec} motherTongueHint={motherTongueHint} />
      </p>
      <p className="mt-1 text-lg font-semibold text-text-primary tabular-nums">{value}</p>
    </div>
  )
}

