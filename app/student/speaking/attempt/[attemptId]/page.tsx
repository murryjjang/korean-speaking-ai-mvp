import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAttempt } from '@/src/lib/attempt/attempt-store'
import { getSpeakingEval } from '@/src/lib/mock/speaking-store'
import { getAssessmentSetSequence } from '@/src/lib/attempt/sequence'
import { calibrateEtriScore } from '@/src/lib/pronunciation-calibration'
import questionsJson from '@/src/content/questions.json'
import questionSetsJson from '@/src/content/question-sets.json'
import questionTypesJson from '@/src/content/question-types.json'
import { PageHeader, Card, CardHeader, CardBody, Badge, ScoreBar } from '@/src/components/ui'

function computeQ1ReferenceScore(aiScore: number, calibratedScore: number): number {
  return Math.round(calibratedScore * 0.6 + aiScore * 0.4)
}

function getScoreVariant(pct: number): 'success' | 'warning' | 'danger' {
  if (pct >= 80) return 'success'
  if (pct >= 60) return 'warning'
  return 'danger'
}

export default async function AttemptSummaryPage({
  params,
}: {
  params: Promise<{ attemptId: string }>
}) {
  const { attemptId } = await params

  const attempt = getAttempt(attemptId)
  if (!attempt) notFound()

  const set = questionSetsJson.find((s) => s.id === attempt.setId)
  const sequence = getAssessmentSetSequence(attempt.setId)
  const startedAt = new Date(attempt.startedAt).toLocaleString('ko-KR')

  type QuestionSummaryItem = {
    questionId: string
    order: number
    title: string
    typeId: string
    typeName: string
    maxScore: number
    submissionId: string | null
    referenceScore: number | null
    isEtriReflected: boolean
    missionGoalsAchieved: number | null
    missionGoalsTotal: number | null
  }

  const items: QuestionSummaryItem[] = sequence.map((qId, idx) => {
    const q = questionsJson.find((x) => x.id === qId)
    const qType = q ? questionTypesJson.find((t) => t.id === q.typeId) : null

    const sub = attempt.submissions.find((s) => s.questionId === qId)
    const record = sub ? getSpeakingEval(sub.submissionId) : undefined

    let referenceScore: number | null = null
    let isEtriReflected = false
    let missionGoalsAchieved: number | null = null
    let missionGoalsTotal: number | null = null

    if (record) {
      const { llmEvalResult, pronunciationResult, speakingEvalDetail } = record
      const aiScore = llmEvalResult.totalScore

      if (q?.typeId === 'qt-reading') {
        const isEtriSuccess =
          pronunciationResult.providerName === 'etri' &&
          typeof pronunciationResult.rawScore === 'number'
        const calibrated: number | undefined =
          pronunciationResult.calibratedScore !== undefined
            ? pronunciationResult.calibratedScore
            : isEtriSuccess && pronunciationResult.rawScore !== undefined
              ? calibrateEtriScore(pronunciationResult.rawScore).calibratedScore
              : undefined

        if (isEtriSuccess && calibrated !== undefined) {
          referenceScore = computeQ1ReferenceScore(aiScore, calibrated)
          isEtriReflected = true
        } else {
          referenceScore = aiScore
        }
      } else {
        referenceScore = aiScore
      }

      if (q?.typeId === 'qt-dialogue-mission' && speakingEvalDetail) {
        const goalResultsFromNote = speakingEvalDetail.teacher_note?.match(
          /미션 달성률: \d+% \((\d+)\/(\d+)\)/,
        )
        if (goalResultsFromNote) {
          missionGoalsAchieved = parseInt(goalResultsFromNote[1], 10)
          missionGoalsTotal = parseInt(goalResultsFromNote[2], 10)
        }
        if (speakingEvalDetail.required_elements_found) {
          missionGoalsAchieved = speakingEvalDetail.required_elements_found.length
        }
      }
    }

    return {
      questionId: qId,
      order: idx + 1,
      title: q?.title ?? qId,
      typeId: q?.typeId ?? '',
      typeName: qType?.name ?? q?.typeId ?? '',
      maxScore: qType?.maxScore ?? 100,
      submissionId: sub?.submissionId ?? null,
      referenceScore,
      isEtriReflected,
      missionGoalsAchieved,
      missionGoalsTotal,
    }
  })

  const submittedCount = items.filter((i) => i.submissionId !== null).length
  const allSubmitted = submittedCount === items.length

  // 100점 기준 가중 합계 (AI 참고 총점)
  // weightedScore = score100 / 100 * weight; percent = score100 (0~100 clamp)
  const weightedTotal = items.reduce((sum, item) => {
    if (item.referenceScore === null) return sum
    const score100 = Math.max(0, Math.min(100, item.referenceScore))
    return sum + score100 / 100 * item.maxScore
  }, 0)
  const weightedTotalRounded = Math.round(weightedTotal * 10) / 10

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link
          href="/student/speaking"
          className="text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          ← 문항 목록
        </Link>
      </div>

      <PageHeader
        title="전체 응시 결과 요약"
        description={`${set?.name ?? attempt.setId} · 응시 시작: ${startedAt}`}
      />

      <div className="max-w-2xl mx-auto space-y-6">
        {/* 응시 현황 */}
        <Card>
          <CardHeader
            title="응시 현황"
            description={allSubmitted ? '모든 문항 응시 완료' : `${submittedCount} / ${items.length}번 문항 응시됨`}
          />
          <CardBody noPadding>
            <ul className="divide-y divide-border">
              {items.map((item) => {
                // score100: AI 참고점수 (0~100 scale, clamped)
                // weightedScore: score100 / 100 * maxScore (가중 환산)
                // percent: score100 (0~100% 표시)
                const score100 = item.referenceScore !== null
                  ? Math.max(0, Math.min(100, item.referenceScore))
                  : null
                const weightedScore = score100 !== null
                  ? Math.round(score100 / 100 * item.maxScore * 10) / 10
                  : null
                const percent = score100
                const variant = percent !== null ? getScoreVariant(percent) : 'danger'
                // missionGoalsAchieved는 totalGoals를 초과하지 않도록 cap
                const cappedAchieved = item.missionGoalsTotal !== null && item.missionGoalsAchieved !== null
                  ? Math.min(item.missionGoalsAchieved, item.missionGoalsTotal)
                  : item.missionGoalsAchieved

                return (
                  <li key={item.questionId} className="px-4 py-4 md:px-5">
                    <div className="flex items-start gap-3">
                      <span className="text-xs text-text-muted font-mono w-5 shrink-0 pt-0.5">
                        {item.order}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-medium text-text-primary leading-snug">
                            {item.title}
                          </span>
                          <Badge variant="outline">{item.typeName}</Badge>
                          <Badge variant="info">{item.maxScore}점</Badge>
                        </div>

                        {item.submissionId === null ? (
                          <p className="text-xs text-text-muted">미응시</p>
                        ) : weightedScore === null ? (
                          <p className="text-xs text-text-muted">결과 없음</p>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-text-primary tabular-nums">
                                {weightedScore}
                              </span>
                              <span className="text-xs text-text-muted">/ {item.maxScore}</span>
                              <Badge variant={variant}>{percent}%</Badge>
                              {item.isEtriReflected && (
                                <Badge variant="warning">ETRI 반영</Badge>
                              )}
                            </div>
                            <ScoreBar
                              score={weightedScore}
                              maxScore={item.maxScore}
                              showLabel={false}
                            />
                            {cappedAchieved !== null && item.missionGoalsTotal !== null && (
                              <p className="text-xs text-purple-700">
                                미션 달성: {cappedAchieved} / {item.missionGoalsTotal}
                              </p>
                            )}
                            {item.submissionId && (
                              <Link
                                href={`/student/speaking/${item.questionId}/result?sub=${item.submissionId}&attemptId=${attemptId}`}
                                className="text-xs text-primary-600 hover:text-primary-700 underline underline-offset-2"
                              >
                                상세 결과 보기
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardBody>
        </Card>

        {/* AI 참고 총점 (전체 응시 완료 시) */}
        {allSubmitted && (
          <Card>
            <CardBody>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">
                AI 참고 총점
              </p>
              <div className="flex items-baseline gap-2">
                <span
                  className="text-3xl font-bold text-text-primary tabular-nums"
                  data-testid="attempt-weighted-total"
                >
                  {weightedTotalRounded}
                </span>
                <span className="text-sm text-text-muted">/ 100</span>
              </div>
              <p className="mt-2 text-xs text-text-muted">
                * 이 점수는 AI 1차 참고값입니다. 최종 점수는 교수자 검토 후 확정됩니다.
              </p>
            </CardBody>
          </Card>
        )}

        {/* 안내 */}
        <Card>
          <CardBody>
            <p
              className="text-xs text-text-secondary bg-surface border border-border rounded-md p-3 leading-relaxed"
              data-testid="attempt-summary-disclaimer"
            >
              위 점수는 AI 1차 참고평가 결과입니다. 각 배점(q1×15 + q2×25 + q3×25 + q4×35)으로
              환산한 가중 점수이며, 최종 점수는 교수자 검토 후 확정됩니다.
            </p>
          </CardBody>
        </Card>

        {/* 하단 액션 */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2 pb-4">
          <Link
            href="/student"
            className="inline-flex items-center justify-center gap-2 font-medium transition-colors text-sm px-4 min-h-[44px] rounded-md bg-white text-text-primary hover:bg-slate-50 border border-border-strong w-full sm:w-auto"
          >
            학습 현황으로
          </Link>
          <Link
            href="/student/speaking"
            className="inline-flex items-center justify-center gap-2 font-medium transition-colors text-sm px-4 min-h-[44px] rounded-md bg-primary-700 text-white hover:bg-primary-800 border border-primary-700 w-full sm:w-auto"
          >
            문항 목록으로
          </Link>
        </div>
      </div>
    </div>
  )
}
