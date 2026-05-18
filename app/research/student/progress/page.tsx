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
import { Localized, LocalizedDuration } from '@/src/components/ui/localized'
import { PersonaAvatar } from '@/src/components/ui/persona-avatar'
import { getPersona } from '@/src/lib/personas'
import { DailyBars, ScoreLine } from '@/src/components/research/progress-charts'
import { LocalizedModeDonut } from '@/src/components/research/localized-mode-donut'
import { PdfDownloadButton } from '@/src/components/pdf-download-button'
import { MODE_LABELS, scoreLevelKey } from '@/src/lib/i18n/dashboard-labels'
import { LocalizedModeLabel, LocalizedScore } from '@/src/components/ui/localized-extras'
import { KdliBrand } from '@/src/components/layout/kdli-brand'

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
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-8" data-testid="research-student-progress">
      {/* v1.1 단계 19.8 [로고]: 리서치 모드 헤더에 KDLI 사각형 로고 노출 */}
      <KdliBrand subtitle="시험운영 — 학습 진척" className="mb-2" />
      <header className="flex items-start justify-between gap-3 flex-wrap pb-4 border-b border-border">
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
          {/* v1.1 단계 19.7 [아키텍처]: 헤더 보조 언어 토글 제거 —
              보조 언어는 mother_tongue 단독 결정. */}
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

      {/* v1.1 단계 19.5 [P.2]: 한국어 본문 위주 컨테이너는 ar 토글 시에도 LTR 유지.
          내부의 다국어 라벨은 자체 dir 속성으로 RTL 회복 가능. */}
      <div
        id="research-progress-pdf-target"
        className="space-y-6"
        data-keep-ltr
        dir="ltr"
      >

      {/* v1.1 단계 19.5 [L.1]: OPIc/TOPIK 식 종합 점수 박스 — 5건 이상 누적 시 표시.
          그 외에는 placeholder 문구로 안내. */}
      <OverallScoreBox
        scorePoints={scorePoints}
        motherTongueHint={participant.motherTongue}
      />

      <section
        className="rounded-lg border border-border/40 bg-surface-raised p-5"
        data-testid="student-stats-card"
      >
        <h2 className="text-sm font-semibold text-text-primary mb-3 pb-2 border-b border-border/40">
          <Localized
            spec={{ kind: 'overallScore', key: 'basedOn' }}
            motherTongueHint={participant.motherTongue}
          />
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="student-stats">
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
        </div>
      </section>

      {sessions.length > 0 ? (
        <SectionCard
          titleSpec={{ kind: 'chart', key: 'modeDistribution' }}
          motherTongueHint={participant.motherTongue}
        >
          {/* v1.1 단계 19 [D6.5]: 차트 범례를 표시 언어에 맞춰 i18n. */}
          <div data-testid="mode-distribution">
            <LocalizedModeDonut
              counts={Object.keys(MODE_LABEL_KO)
                .filter((m) => (modeCounts[m] ?? 0) > 0)
                .map((m) => ({ mode: m, value: modeCounts[m] ?? 0 }))}
              motherTongueHint={participant.motherTongue}
            />
          </div>
        </SectionCard>
      ) : null}

      {sessions.length > 0 ? (
        <SectionCard
          titleSpec={{ kind: 'chart', key: 'last7Days' }}
          motherTongueHint={participant.motherTongue}
        >
          {/* 일별 막대 차트 — 오늘 포함 7일 */}
          <DailyBars data={buildDailyBuckets(sessions)} />
        </SectionCard>
      ) : null}

      {scorePoints.length > 0 ? (
        <SectionCard
          titleSpec={{ kind: 'chart', key: 'scoreTrend' }}
          motherTongueHint={participant.motherTongue}
        >
          <ScoreLine points={scorePoints.map((p) => ({ at: p.at, score: p.score }))} />
        </SectionCard>
      ) : null}

      <SectionCard
        titleSpec={{ kind: 'chart', key: 'recentSessions' }}
        motherTongueHint={participant.motherTongue}
      >
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
                      {/* v1.1 단계 19.11 [#3]: 외부 dir="ltr" + unicode-bidi:isolate로
                          한국어 괄호 컨텍스트 격리.
                          v1.1 단계 19.12 [#3]: 단계 19.11의 dir/isolate는 bidi 재정렬만
                          차단했고 Localized 기본 분기의 block 자식 (보조 영역 display:block)
                          때문에 ")"가 새 줄로 밀려나는 회귀가 잔존. inline + bareSupplement로
                          보조 영역을 ml-1.5 인라인으로 강제, 외부 괄호로 감싸 "(완료 مكتمل)"
                          한 줄 표시 보장. */}
                      {s.sessionEndedAt
                        ? <span className="text-emerald-600 ml-auto" dir="ltr" style={{ unicodeBidi: 'isolate' }}>(<Localized inline bareSupplement spec={{ kind: 'page', key: 'completed' }} motherTongueHint={participant.motherTongue} />)</span>
                        : <span className="text-yellow-600 ml-auto" dir="ltr" style={{ unicodeBidi: 'isolate' }}>(<Localized inline bareSupplement spec={{ kind: 'page', key: 'inProgress' }} motherTongueHint={participant.motherTongue} />)</span>}
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
      </SectionCard>
      </div>{/* /research-progress-pdf-target */}

      <SectionCard
        titleSpec={{ kind: 'chart', key: 'startLearning' }}
        motherTongueHint={participant.motherTongue}
      >
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
      </SectionCard>

      <SectionCard
        titleSpec={{ kind: 'dataDownload', key: 'sectionTitle' }}
        motherTongueHint={participant.motherTongue}
      >
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
      </SectionCard>
    </main>
  )
}

// v1.1 단계 19.5 [L.5]: 학술 톤 카드 — 흰 배경 + 부드러운 1px 경계 + 통일된 padding.
// 진척 페이지의 모든 콘텐츠 섹션을 같은 카드 패턴으로 정렬한다.
function SectionCard({
  titleSpec,
  motherTongueHint,
  children,
}: {
  titleSpec: Parameters<typeof Localized>[0]['spec']
  motherTongueHint?: string | null
  children: ReactNode
}) {
  return (
    <section
      className="rounded-lg border border-border/40 bg-surface-raised p-5"
      data-testid="progress-section-card"
    >
      <h2 className="text-sm font-semibold text-text-primary mb-3 pb-2 border-b border-border/40">
        <Localized spec={titleSpec} motherTongueHint={motherTongueHint} />
      </h2>
      {children}
    </section>
  )
}

// v1.1 단계 19.5 [L.1]: OPIc/TOPIK 식 종합 점수 박스.
// 평균 점수(큰 숫자) + 등급 배지 + 누적 횟수. 5건 미만이면 placeholder.
function OverallScoreBox({
  scorePoints,
  motherTongueHint,
}: {
  scorePoints: { at: number; score: number; mode: string }[]
  motherTongueHint?: string | null
}) {
  const count = scorePoints.length
  const MIN_SAMPLES = 5
  if (count < MIN_SAMPLES) {
    return (
      <section
        className="rounded-lg border border-border/40 bg-surface-raised p-6 text-center"
        data-testid="overall-score-box"
        data-state="insufficient"
      >
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
          <Localized spec={{ kind: 'overallScore', key: 'title' }} motherTongueHint={motherTongueHint} />
        </p>
        <p className="text-sm text-text-secondary" data-testid="overall-score-insufficient">
          <Localized spec={{ kind: 'overallScore', key: 'insufficient' }} motherTongueHint={motherTongueHint} />
        </p>
      </section>
    )
  }
  const avg = scorePoints.reduce((s, p) => s + p.score, 0) / count
  const ratio = Math.min(1, Math.max(0, avg / 100))
  const levelKey = scoreLevelKey(ratio)
  return (
    <section
      className="rounded-lg border border-border/40 bg-surface-raised p-6"
      data-testid="overall-score-box"
      data-state="ready"
    >
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
        <Localized spec={{ kind: 'overallScore', key: 'title' }} motherTongueHint={motherTongueHint} />
      </p>
      <div className="flex items-end gap-4 flex-wrap">
        <span
          className="text-5xl font-bold text-primary-700 tabular-nums leading-none"
          data-testid="overall-score-value"
        >
          {Math.round(avg)}
        </span>
        <span className="text-base text-text-muted mb-1">/ 100</span>
        <span
          className="ml-auto inline-flex items-center rounded-md bg-primary-50 text-primary-700 text-xs font-medium px-2.5 py-1"
          data-testid="overall-score-level"
        >
          <Localized spec={{ kind: 'scoreLevel', key: levelKey }} motherTongueHint={motherTongueHint} />
        </span>
      </div>
      <p className="mt-3 text-xs text-text-muted">
        <Localized spec={{ kind: 'overallScore', key: 'basedOn' }} motherTongueHint={motherTongueHint} />
        : {count}{' '}
        <Localized spec={{ kind: 'overallScore', key: 'assessmentsUnit' }} motherTongueHint={motherTongueHint} />
      </p>
    </section>
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

