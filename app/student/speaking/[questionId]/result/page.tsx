import Link from 'next/link'
import { getSpeakingEval } from '@/src/lib/mock/speaking-store'
import questionsJson from '@/src/content/questions.json'
import questionSetsJson from '@/src/content/question-sets.json'
import questionTypesJson from '@/src/content/question-types.json'
import rubricsJson from '@/src/content/rubrics.json'
import { PageHeader, Card, CardHeader, CardBody, Badge, ScoreBar } from '@/src/components/ui'

const rubric = rubricsJson.find((r) => r.id === 'rubric-speaking-01')!

function getScoreVariant(pct: number): 'success' | 'warning' | 'danger' {
  if (pct >= 80) return 'success'
  if (pct >= 60) return 'warning'
  return 'danger'
}

const errorTypeLabels: Record<string, string> = {
  particle: '조사 오류',
  ending: '어미 오류',
  tense: '시제 오류',
  pronunciation: '발음 오류',
  fluency: '유창성',
  task: '과제 수행',
  grammar: '문법 오류',
}

const NEXT_ACTIVITY_PLACEHOLDERS = [
  {
    id: 'rec-a',
    activityType: '연습평가',
    label: '연습평가 세트 A',
    description: '같은 유형의 문항으로 추가 연습',
  },
  {
    id: 'rec-b',
    activityType: '미션 대화',
    label: '식당 미션 대화',
    description: 'AI 페르소나와 실전 대화 연습',
  },
]

export default async function SpeakingResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ questionId: string }>
  searchParams: Promise<{ sub?: string }>
}) {
  const { questionId } = await params
  const { sub: submissionId } = await searchParams

  const question = questionsJson.find((q) => q.id === questionId)
  const qType = questionTypesJson.find((t) => t.id === question?.typeId)

  const evalRecord = submissionId ? getSpeakingEval(submissionId) : undefined

  // Store가 초기화된 경우(서버 재시작 등) 안내
  if (!evalRecord) {
    return (
      <div>
        <PageHeader title="평가 결과" description="결과를 불러올 수 없습니다." />
        <Card className="max-w-2xl mx-auto">
          <CardBody>
            <div className="text-center py-10">
              <p className="text-sm text-text-secondary mb-2">
                평가 결과를 찾을 수 없습니다.
              </p>
              <p className="text-xs text-text-muted mb-6">
                서버가 재시작되었거나 세션이 만료되었을 수 있습니다.
              </p>
              <Link
                href={`/student/speaking/${questionId}`}
                className="inline-flex items-center justify-center gap-2 font-medium transition-colors text-sm px-4 py-2 rounded-md bg-primary-700 text-white hover:bg-primary-800 border border-primary-700"
              >
                다시 시도하기
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  const { sttResult, llmEvalResult, pronunciationResult } = evalRecord

  const set = questionSetsJson.find((qs) => qs.id === evalRecord.questionSetId)
  const submittedAt = new Date(evalRecord.submittedAt).toLocaleString('ko-KR')

  const totalScore = llmEvalResult.totalScore
  const totalMax = 100
  const totalPct = Math.round((totalScore / totalMax) * 100)
  const totalVariant = getScoreVariant(totalPct)

  // 루브릭 항목별 점수
  const rubricScores = rubric.items.map((item) => {
    const score = llmEvalResult.scores.find((s) => s.rubricItemId === item.id)
    return {
      id: item.id,
      label: item.label,
      score: score?.score ?? 0,
      maxScore: item.maxScore,
      rationale: score?.rationale ?? '',
    }
  })

  // 강점: 점수 비율 상위 2항목
  const sorted = [...rubricScores].sort((a, b) => b.score / b.maxScore - a.score / a.maxScore)
  const strengths = sorted.slice(0, 2).filter((s) => s.score / s.maxScore >= 0.6)
  const weaknesses = sorted.slice(-2).filter((s) => s.score / s.maxScore < 0.75).reverse()

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
        title="평가 결과"
        description={`${set?.name ?? '말하기 평가'} · ${qType?.name ?? ''} · ${submittedAt}`}
      />

      <div className="max-w-2xl mx-auto space-y-6">
        {/* 총점 */}
        <Card>
          <CardHeader title="종합 점수" />
          <CardBody>
            <div className="flex items-end gap-3 mb-5">
              <span className="text-5xl font-bold text-text-primary tabular-nums leading-none">
                {totalScore}
              </span>
              <span className="text-base text-text-muted mb-1">/ {totalMax}</span>
              <Badge variant={totalVariant} size="md" className="mb-1">
                {totalPct}점
              </Badge>
            </div>

            <ul className="space-y-3">
              {rubricScores.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary w-16 shrink-0">
                    {item.label}
                  </span>
                  <div className="flex-1">
                    <ScoreBar score={item.score} maxScore={item.maxScore} showLabel={false} />
                  </div>
                  <span className="text-xs tabular-nums text-text-secondary w-12 text-right shrink-0">
                    {item.score} / {item.maxScore}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-xs text-text-secondary bg-surface border border-border rounded-md p-3 leading-relaxed">
              {llmEvalResult.feedback}
            </p>
          </CardBody>
        </Card>

        {/* AI 피드백 — 강점 / 보완점 */}
        <Card>
          <CardHeader title="AI 피드백" description="루브릭 항목 기반 분석" />
          <CardBody>
            {strengths.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-success-700 uppercase tracking-wide mb-2">
                  강점
                </p>
                <ul className="space-y-2">
                  {strengths.map((s) => (
                    <li key={s.id} className="flex items-start gap-2">
                      <Badge variant="success">{s.label}</Badge>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {s.rationale}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {weaknesses.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-warning-700 uppercase tracking-wide mb-2">
                  보완점
                </p>
                <ul className="space-y-2">
                  {weaknesses.map((w) => (
                    <li key={w.id} className="flex items-start gap-2">
                      <Badge variant="warning">{w.label}</Badge>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {w.rationale}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {llmEvalResult.errorTags.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                  오류 유형
                </p>
                <div className="flex flex-wrap gap-2">
                  {llmEvalResult.errorTags.map((tag, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-xs bg-danger-50 text-danger-700 border border-danger-100 rounded-full px-2 py-0.5"
                    >
                      {errorTypeLabels[tag.type] ?? tag.type}
                      <span className="font-mono">{tag.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* STT 전사 결과 */}
        <Card>
          <CardHeader
            title="음성 인식 결과 (STT)"
            description={`신뢰도 ${Math.round(sttResult.confidence * 100)}% · provider: ${sttResult.providerName}`}
          />
          <CardBody>
            <p className="text-sm text-text-primary leading-relaxed bg-surface border border-border rounded-md p-4">
              &ldquo;{sttResult.transcript}&rdquo;
            </p>
            {sttResult.wordTimings && sttResult.wordTimings.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {sttResult.wordTimings.map((wt, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center text-xs bg-primary-50 text-primary-700 border border-primary-100 rounded px-1.5 py-0.5 font-mono"
                  >
                    {wt.word}
                  </span>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* 발음 평가 결과 */}
        <Card>
          <CardHeader
            title="발음 평가"
            description={`종합 점수 ${pronunciationResult.normalizedScore}점 · provider: ${pronunciationResult.providerName}`}
          />
          <CardBody>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl font-bold text-text-primary tabular-nums">
                {pronunciationResult.normalizedScore}
              </span>
              <span className="text-sm text-text-muted">/ 100</span>
              <Badge variant={getScoreVariant(pronunciationResult.normalizedScore)}>
                발음
              </Badge>
            </div>

            <ul className="space-y-2 mb-4">
              {pronunciationResult.wordScores.map((ws, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-text-secondary w-20 shrink-0">
                    {ws.word}
                  </span>
                  <div className="flex-1">
                    <ScoreBar score={ws.score} maxScore={100} showLabel={false} />
                  </div>
                  <span className="text-xs tabular-nums text-text-secondary w-8 text-right shrink-0">
                    {ws.score}
                  </span>
                </li>
              ))}
            </ul>

            <p className="text-xs text-text-secondary bg-surface border border-border rounded-md p-3">
              {pronunciationResult.feedback}
            </p>
          </CardBody>
        </Card>

        {/* 다음 추천 활동 placeholder */}
        <Card>
          <CardHeader title="다음 추천 활동" />
          <CardBody>
            <ul className="space-y-3">
              {NEXT_ACTIVITY_PLACEHOLDERS.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2">
                    <Badge variant="outline">{item.activityType}</Badge>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {item.label}
                      </p>
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
        <div className="flex items-center justify-between pt-2 pb-4">
          <Link
            href="/student"
            className="inline-flex items-center justify-center gap-2 font-medium transition-colors text-sm px-4 py-2 rounded-md bg-white text-slate-700 hover:bg-slate-50 border border-slate-300"
          >
            학습 현황으로
          </Link>
          <Link
            href={`/student/speaking/${questionId}`}
            className="inline-flex items-center justify-center gap-2 font-medium transition-colors text-sm px-4 py-2 rounded-md bg-primary-700 text-white hover:bg-primary-800 border border-primary-700"
          >
            다시 도전하기
          </Link>
        </div>
      </div>
    </div>
  )
}
