import { notFound } from 'next/navigation'
import Link from 'next/link'
import missionGoalsJson from '@/src/content/mission-goals.json'
import { getMissionSubmission } from '@/src/lib/mock/mission-store'
import { PageHeader, Card, CardHeader, CardBody, Badge, ScoreBar } from '@/src/components/ui'
import type { MissionGoalState, MissionEvaluation } from '@/src/types/mission'

const NEXT_ACTIVITIES = [
  {
    id: 'next-mission',
    label: '다른 미션 도전하기',
    activityType: '미션 대화',
    description: 'AI 페르소나와 새로운 상황에서 대화 연습',
  },
  {
    id: 'next-speaking',
    label: '말하기 평가 연습',
    activityType: '말하기 평가',
    description: '같은 주제의 말하기 평가 문항으로 추가 연습',
  },
]

function getScoreVariant(score: number): 'success' | 'warning' | 'danger' {
  if (score >= 80) return 'success'
  if (score >= 60) return 'warning'
  return 'danger'
}

export default async function MissionResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ scenarioId: string }>
  searchParams: Promise<{ sub?: string }>
}) {
  const { scenarioId } = await params
  const { sub: submissionId } = await searchParams

  const scenario = missionGoalsJson.find((s) => s.scenarioId === scenarioId)
  if (!scenario || !scenario.isActive) notFound()

  const submission = submissionId ? getMissionSubmission(submissionId) : undefined

  let goals: MissionGoalState[]
  let evaluation: MissionEvaluation
  let submittedAtDisplay: string

  if (submission) {
    goals = submission.goals
    evaluation = submission.evaluation
    submittedAtDisplay = submission.submittedAt.slice(0, 10)
  } else {
    const { conversationNaturalness, expressionAppropriateness, strengths, improvements } =
      scenario.mockEvaluation
    const missionAchievementRate = 100
    const taskCompletion = 100
    const overallScore = Math.round(
      (missionAchievementRate + taskCompletion + conversationNaturalness + expressionAppropriateness) / 4,
    )

    goals = scenario.goals.map((g) => ({
      id: g.id,
      description: g.description,
      achievedAtTurn: g.achievedAtTurn,
      order: g.order,
      achieved: true,
      achievedOnTurnNumber: g.achievedAtTurn,
    }))

    evaluation = {
      missionAchievementRate,
      taskCompletion,
      conversationNaturalness,
      expressionAppropriateness,
      overallScore,
      strengths: [...strengths],
      improvements: [...improvements],
      providerName: 'mock',
      evaluatedAt: '2026-05-04T00:00:00.000Z',
    }
    submittedAtDisplay = '미리보기'
  }

  const totalGoals = goals.length
  const achievedGoals = goals.filter((g) => g.achieved).length
  const achievementRate = evaluation.missionAchievementRate

  const scoreItems = [
    { id: 'r-mission', label: '미션 달성률', score: achievementRate },
    { id: 'r-natural', label: '대화 자연성', score: evaluation.conversationNaturalness },
    { id: 'r-task', label: '과제 수행', score: evaluation.taskCompletion },
    { id: 'r-expr', label: '표현 적절성', score: evaluation.expressionAppropriateness },
  ]

  const overallVariant = getScoreVariant(evaluation.overallScore)

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link
          href="/student/mission"
          className="text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          ← 미션 목록
        </Link>
      </div>

      <PageHeader
        title="미션 결과"
        description={`${scenario.title} · ${scenario.location} · ${submittedAtDisplay}`}
      />

      <div className="max-w-2xl mx-auto space-y-6">
        {/* 미션 개요 */}
        <Card>
          <CardHeader title={scenario.title} description={scenario.location} />
          <CardBody>
            <p className="text-sm text-text-secondary mb-3">{scenario.situation}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
              <span className="inline-flex items-center bg-slate-100 text-slate-600 rounded px-2 py-0.5">
                AI 페르소나: {scenario.persona.name} · {scenario.persona.role}
              </span>
            </div>
          </CardBody>
        </Card>

        {/* 종합 점수 */}
        <Card>
          <CardHeader title="종합 점수" />
          <CardBody>
            <div className="flex items-end gap-3 mb-5">
              <span className="text-5xl font-bold text-text-primary tabular-nums leading-none">
                {evaluation.overallScore}
              </span>
              <span className="text-base text-text-muted mb-1">/ 100</span>
              <Badge variant={overallVariant} size="md" className="mb-1">
                {evaluation.overallScore}점
              </Badge>
            </div>

            <ul className="space-y-3">
              {scoreItems.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary w-20 shrink-0">{item.label}</span>
                  <div className="flex-1">
                    <ScoreBar score={item.score} maxScore={100} showLabel={false} />
                  </div>
                  <span className="text-xs tabular-nums text-text-secondary w-12 text-right shrink-0">
                    {item.score} / 100
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        {/* 미션 목표 달성 현황 */}
        <Card>
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
              미션 목표 달성 현황
            </p>
            <span className="text-xs text-text-muted">
              {achievedGoals}/{totalGoals} 달성 ({achievementRate}%)
            </span>
          </div>
          <CardBody>
            <ul className="space-y-2.5">
              {goals
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((g) => (
                  <li key={g.id} className="flex items-center gap-2.5 text-sm">
                    {g.achieved ? (
                      <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold shrink-0">
                        ✓
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0" />
                    )}
                    <span
                      className={g.achieved ? 'text-text-muted line-through' : 'text-text-secondary'}
                    >
                      {g.description}
                    </span>
                    <span className="ml-auto text-xs shrink-0">
                      {g.achieved ? (
                        <span className="text-green-600 font-medium">달성</span>
                      ) : (
                        <span className="text-slate-400">미달성</span>
                      )}
                    </span>
                  </li>
                ))}
            </ul>
          </CardBody>
        </Card>

        {/* AI 피드백 */}
        <Card>
          <CardHeader title="AI 피드백" description="mock 평가 기반 분석" />
          <CardBody>
            <div className="mb-4">
              <p className="text-xs font-semibold text-success-700 uppercase tracking-wide mb-2">
                강점
              </p>
              <ul className="space-y-1.5">
                {evaluation.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                    <span className="text-green-500 shrink-0 mt-0.5">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-warning-700 uppercase tracking-wide mb-2">
                보완점
              </p>
              <ul className="space-y-1.5">
                {evaluation.improvements.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                    <span className="text-amber-500 shrink-0 mt-0.5">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </CardBody>
        </Card>

        {/* 다음 추천 활동 */}
        <Card>
          <CardHeader title="다음 추천 활동" />
          <CardBody>
            <ul className="space-y-3">
              {NEXT_ACTIVITIES.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline">{item.activityType}</Badge>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{item.label}</p>
                      <p className="text-xs text-text-muted">{item.description}</p>
                    </div>
                  </div>
                  <span className="text-xs text-text-muted shrink-0 pt-1">준비 중</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-text-muted">
              * 개인화 추천 기능은 향후 업데이트 예정입니다.
            </p>
          </CardBody>
        </Card>

        {/* 하단 액션 */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2 pb-4">
          <Link
            href="/student/mission"
            className="inline-flex items-center justify-center gap-2 font-medium transition-colors text-sm px-4 min-h-[44px] rounded-md bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 w-full sm:w-auto"
          >
            미션 목록으로
          </Link>
          <Link
            href={`/student/mission/${scenarioId}`}
            className="inline-flex items-center justify-center gap-2 font-medium transition-colors text-sm px-4 min-h-[44px] rounded-md bg-primary-700 text-white hover:bg-primary-800 border border-primary-700 w-full sm:w-auto"
          >
            다시 연습하기
          </Link>
        </div>
      </div>
    </div>
  )
}
