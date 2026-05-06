import Link from 'next/link'
import { getSpeakingEval } from '@/src/lib/mock/speaking-store'
import questionsJson from '@/src/content/questions.json'
import questionSetsJson from '@/src/content/question-sets.json'
import questionTypesJson from '@/src/content/question-types.json'
import rubricsJson from '@/src/content/rubrics.json'
import { PageHeader, Card, CardHeader, CardBody, Badge, ScoreBar } from '@/src/components/ui'

const rubric = rubricsJson.find((r) => r.id === 'rubric-speaking-01')!

// 발음 평가 기준 5개 — ETRI 연동 후 실제 데이터로 교체 예정
const PRONUNCIATION_CRITERIA = [
  { key: 'accuracy', label: '발음 정확도' },
  { key: 'fluency', label: '유창성' },
  { key: 'intonation', label: '억양/강세' },
  { key: 'rhythm', label: '속도/리듬' },
  { key: 'clarity', label: '명료도' },
] as const

// mock wordScores → 평가 기준 점수 정규화 헬퍼
// ETRI 연동 시 criterion-level 데이터를 직접 사용하도록 확장 가능
function normalizePronunciationDisplay(
  normalizedScore: number,
  wordScores: Array<{ word: string; score: number }>,
): Array<{ key: string; label: string; score: number }> {
  const avg =
    wordScores.length > 0
      ? Math.round(wordScores.reduce((s, w) => s + w.score, 0) / wordScores.length)
      : normalizedScore
  const delta = avg - normalizedScore
  const clamp = (v: number) => Math.max(0, Math.min(100, v))

  // 기준별 파생 점수 — ETRI 연동 시 실제 criterion-level 값으로 교체
  const derivedScores: Record<string, number> = {
    accuracy: avg,
    fluency: clamp(normalizedScore + Math.round(delta * 0.3)),
    intonation: clamp(normalizedScore - Math.round(delta * 0.2)),
    rhythm: clamp(normalizedScore + Math.round(delta * 0.1)),
    clarity: clamp(normalizedScore),
  }

  return PRONUNCIATION_CRITERIA.map((c) => ({ ...c, score: derivedScores[c.key] ?? normalizedScore }))
}

function getScoreVariant(pct: number): 'success' | 'warning' | 'danger' {
  if (pct >= 80) return 'success'
  if (pct >= 60) return 'warning'
  return 'danger'
}

function gradeVariant(grade: string): 'success' | 'info' | 'warning' | 'danger' {
  if (grade === 'A') return 'success'
  if (grade === 'B') return 'info'
  if (grade === 'C') return 'warning'
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

const QUESTION_ID_ALIASES: Record<string, string> = {
  'beginner-q2-material-desc': 'beginner-q2-material-description',
  'beginner-q3-listening-resp': 'beginner-q3-listening-response',
  'intermediate-q2-material-desc': 'intermediate-q2-material-description',
  'intermediate-q3-listening-resp': 'intermediate-q3-listening-response',
  'advanced-q2-material-desc': 'advanced-q2-material-description',
  'advanced-q3-listening-resp': 'advanced-q3-listening-response',
}

export default async function SpeakingResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ questionId: string }>
  searchParams: Promise<{ sub?: string }>
}) {
  const { questionId: rawId } = await params
  const questionId = QUESTION_ID_ALIASES[rawId] ?? rawId
  const { sub: submissionId } = await searchParams

  const question = questionsJson.find((q) => q.id === questionId)
  const qType = questionTypesJson.find((t) => t.id === question?.typeId)
  const questionMap = new Map(questionsJson.map((q) => [q.id, q]))

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

  const { sttResult, llmEvalResult, pronunciationResult, speakingEvalDetail } = evalRecord

  // No-speech: empty transcript or no-speech provider — show simplified view, no eval cards
  const isNoSpeech = sttResult.providerName === 'no-speech' || !sttResult.transcript.trim()

  const set = questionSetsJson.find((qs) => qs.id === evalRecord.questionSetId)
  const submittedAt = new Date(evalRecord.submittedAt).toLocaleString('ko-KR')

  // Next question in the same set (ordered by set.questions[].order)
  const sortedSetQuestions = set
    ? [...set.questions].sort((a, b) => a.order - b.order)
    : []
  const currentIdx = sortedSetQuestions.findIndex((q) => q.questionId === questionId)
  const nextSetItem =
    currentIdx >= 0 && currentIdx < sortedSetQuestions.length - 1
      ? sortedSetQuestions[currentIdx + 1]
      : null
  const nextQuestion =
    nextSetItem
      ? questionMap.get(nextSetItem.questionId) ?? null
      : null
  const nextIsActive = nextQuestion?.isActive ?? false

  // ── No-speech early return ────────────────────────────────────────────────
  if (isNoSpeech) {
    const submittedAtNoSpeech = new Date(evalRecord.submittedAt).toLocaleString('ko-KR')
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
          description={`${set?.name ?? '말하기 평가'} · ${submittedAtNoSpeech}`}
        />

        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardBody>
              <div className="text-center py-10">
                <p
                  className="text-base font-medium text-text-primary mb-2"
                  data-testid="no-speech-message"
                >
                  음성이 감지되지 않았습니다.
                </p>
                <p className="text-sm text-text-secondary mb-6">
                  다시 녹음해 주세요.
                </p>
                <Link
                  href={`/student/speaking/${questionId}`}
                  className="inline-flex items-center justify-center gap-2 font-medium transition-colors text-sm px-4 min-h-[44px] rounded-md bg-primary-700 text-white hover:bg-primary-800 border border-primary-700"
                >
                  다시 도전하기
                </Link>
              </div>
            </CardBody>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2 pb-4">
            <Link
              href="/student"
              className="inline-flex items-center justify-center gap-2 font-medium transition-colors text-sm px-4 min-h-[44px] rounded-md bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 w-full sm:w-auto"
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

  // LLM 직접 제공 strengths/improvements 우선, 없으면 점수 기반 파생
  const llmStrengths: string[] = speakingEvalDetail?.strengths ?? []
  const llmImprovements: string[] = speakingEvalDetail?.improvements ?? []

  // 강점: 점수 비율 상위 2항목 (speakingEvalDetail 없을 때 fallback)
  const sorted = [...rubricScores].sort((a, b) => b.score / b.maxScore - a.score / a.maxScore)
  const scoreStrengths = sorted.slice(0, 2).filter((s) => s.score / s.maxScore >= 0.6)
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
              {speakingEvalDetail?.grade && (
                <Badge variant={gradeVariant(speakingEvalDetail.grade)} size="md" className="mb-1">
                  {speakingEvalDetail.grade}등급
                </Badge>
              )}
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
              {speakingEvalDetail?.learner_feedback_ko ?? llmEvalResult.feedback}
            </p>
            {speakingEvalDetail?.learner_feedback_simple && (
              <p className="mt-2 text-xs text-primary-700 bg-primary-50 border border-primary-100 rounded-md p-3 leading-relaxed">
                {speakingEvalDetail.learner_feedback_simple}
              </p>
            )}
          </CardBody>
        </Card>

        {/* AI 피드백 — 강점 / 보완점 */}
        <Card>
          <CardHeader title="AI 피드백" description="과제 수행 분석" />
          <CardBody>
            {/* 포함한 요소 */}
            {(speakingEvalDetail?.required_elements_found?.length ?? 0) > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-success-700 uppercase tracking-wide mb-2">
                  포함한 요소
                </p>
                <ul className="space-y-1">
                  {speakingEvalDetail!.required_elements_found!.map((el, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-success-600 font-bold text-sm shrink-0">✓</span>
                      <span className="text-xs text-text-secondary">{el}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 빠진 요소 */}
            {(speakingEvalDetail?.missing_elements?.length ?? 0) > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-danger-600 uppercase tracking-wide mb-2">
                  빠진 요소
                </p>
                <ul className="space-y-1">
                  {speakingEvalDetail!.missing_elements!.map((el, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-danger-500 font-bold text-sm shrink-0">✗</span>
                      <span className="text-xs text-text-secondary">{el}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 평가 근거 */}
            {(speakingEvalDetail?.evidence?.length ?? 0) > 0 && (
              <div className="mb-4 pt-3 border-t border-border">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                  평가 근거
                </p>
                <ul className="space-y-1.5">
                  {speakingEvalDetail!.evidence!.map((ev, i) => (
                    <li
                      key={i}
                      className="text-xs text-text-secondary italic bg-surface border-l-2 border-primary-300 pl-2.5 py-0.5 rounded-r"
                    >
                      &ldquo;{ev}&rdquo;
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 구분선: 위 섹션이 있었을 때 */}
            {((speakingEvalDetail?.required_elements_found?.length ?? 0) > 0 ||
              (speakingEvalDetail?.missing_elements?.length ?? 0) > 0) && (
              <div className="mb-4 pt-3 border-t border-border" />
            )}

            {/* LLM 직접 제공 strengths (Phase 8-G+) */}
            {llmStrengths.length > 0 ? (
              <div className="mb-4">
                <p className="text-xs font-semibold text-success-700 uppercase tracking-wide mb-2">
                  강점
                </p>
                <ul className="space-y-1.5">
                  {llmStrengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full bg-success-500" />
                      <p className="text-xs text-text-secondary leading-relaxed">{s}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : scoreStrengths.length > 0 ? (
              <div className="mb-4">
                <p className="text-xs font-semibold text-success-700 uppercase tracking-wide mb-2">
                  강점
                </p>
                <ul className="space-y-2">
                  {scoreStrengths.map((s) => (
                    <li key={s.id} className="flex items-start gap-2">
                      <Badge variant="success">{s.label}</Badge>
                      <p className="text-xs text-text-secondary leading-relaxed">{s.rationale}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* LLM 직접 제공 improvements (Phase 8-G+) */}
            {llmImprovements.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-warning-700 uppercase tracking-wide mb-2">
                  보완점
                </p>
                <ul className="space-y-1.5">
                  {llmImprovements.map((imp, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full bg-warning-400" />
                      <p className="text-xs text-text-secondary leading-relaxed">{imp}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : weaknesses.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-warning-700 uppercase tracking-wide mb-2">
                  보완점
                </p>
                <ul className="space-y-2">
                  {weaknesses.map((w) => (
                    <li key={w.id} className="flex items-start gap-2">
                      <Badge variant="warning">{w.label}</Badge>
                      <p className="text-xs text-text-secondary leading-relaxed">{w.rationale}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* dialogue_mission 대화 요약 안내 */}
            {question?.typeId === 'qt-dialogue-mission' && (
              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-md">
                <p className="text-xs font-semibold text-purple-800 mb-1">
                  대화형 미션 평가
                </p>
                <p className="text-xs text-purple-700 leading-relaxed">
                  AI와의 대화 전체 내용을 기반으로 평가되었습니다. 아래 &ldquo;음성 인식 결과&rdquo; 항목에서 전체 대화 내용을 확인하세요.
                </p>
              </div>
            )}

            {/* 모범 답안 — reading은 "낭독 포인트", 그 외는 "모범 표현" */}
            {speakingEvalDetail?.corrected_answer && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                  {question?.typeId === 'qt-reading' ? '낭독 포인트' : '모범 표현'}
                </p>
                <p className="text-xs text-text-secondary bg-surface border border-border rounded-md p-3 leading-relaxed">
                  {speakingEvalDetail.corrected_answer}
                </p>
              </div>
            )}

            {llmEvalResult.errorTags.length > 0 && !speakingEvalDetail && (
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
            {/* 무음/짧은 녹음 감지 경고 */}
            {sttResult.providerName === 'no-speech' && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-xs text-amber-700 leading-relaxed">
                  <strong>음성이 감지되지 않았습니다.</strong>{' '}
                  녹음이 너무 짧거나 무음이었을 수 있습니다. 결과가 정확하지 않을 수 있으니 다시 도전해 보세요.
                </p>
              </div>
            )}
            {/* mock fallback 경고 — STT 제공자 오류 시 임의 문장이 생성될 수 있음 */}
            {sttResult.providerName === 'mock' && (
              <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-md">
                <p className="text-xs text-slate-600 leading-relaxed">
                  음성 인식 서비스에 연결하지 못해 테스트용 텍스트로 평가되었습니다. 결과가 실제 발화와 다를 수 있습니다.
                </p>
              </div>
            )}
            <p className="text-sm text-text-primary leading-relaxed bg-surface border border-border rounded-md p-4">
              {sttResult.transcript ? `“${sttResult.transcript}”` : (
                <span className="text-text-muted italic">음성이 인식되지 않았습니다.</span>
              )}
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

            {/* 평가 기준별 세부 점수 */}
            <ul className="space-y-2 mb-4">
              {normalizePronunciationDisplay(
                pronunciationResult.normalizedScore,
                pronunciationResult.wordScores,
              ).map((item) => (
                <li key={item.key} className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary w-20 shrink-0">
                    {item.label}
                  </span>
                  <div className="flex-1">
                    <ScoreBar score={item.score} maxScore={100} showLabel={false} />
                  </div>
                  <span className="text-xs tabular-nums text-text-secondary w-8 text-right shrink-0">
                    {item.score}
                  </span>
                </li>
              ))}
            </ul>

            <p className="text-xs text-text-secondary bg-surface border border-border rounded-md p-3">
              {pronunciationResult.feedback}
            </p>

            {/* 단어별 참고 — 학습자가 원할 때 펼쳐보는 보조 정보 (채점 기준 아님) */}
            {pronunciationResult.wordScores.length > 0 && (
              <details className="mt-3">
                <summary className="text-xs text-text-muted cursor-pointer select-none hover:text-text-secondary transition-colors">
                  발음 참고 단어 보기{' '}
                  <span className="opacity-60">(ETRI 연동 전 참고용)</span>
                </summary>
                <div className="mt-2">
                  <p className="text-[10px] text-text-muted italic mb-1.5">
                    채점 기준이 아닌 발음 엔진의 참고용 단어 데이터입니다.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {pronunciationResult.wordScores.map((ws, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-xs bg-surface border border-border rounded px-1.5 py-0.5"
                      >
                        <span className="font-mono text-text-secondary">{ws.word}</span>
                        <span className="text-text-muted opacity-70">({ws.score})</span>
                      </span>
                    ))}
                  </div>
                </div>
              </details>
            )}
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2 pb-4">
          <Link
            href="/student"
            className="inline-flex items-center justify-center gap-2 font-medium transition-colors text-sm px-4 min-h-[44px] rounded-md bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 w-full sm:w-auto"
          >
            학습 현황으로
          </Link>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href={`/student/speaking/${questionId}`}
              className="inline-flex items-center justify-center gap-2 font-medium transition-colors text-sm px-4 min-h-[44px] rounded-md bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 w-full sm:w-auto"
            >
              다시 도전하기
            </Link>
            {nextQuestion && nextIsActive ? (
              <Link
                href={`/student/speaking/${nextQuestion.id}?setId=${set?.id ?? ''}`}
                className="inline-flex items-center justify-center gap-2 font-medium transition-colors text-sm px-4 min-h-[44px] rounded-md bg-primary-700 text-white hover:bg-primary-800 border border-primary-700 w-full sm:w-auto"
              >
                다음 문항으로 →
              </Link>
            ) : (
              <Link
                href="/student/speaking"
                className="inline-flex items-center justify-center gap-2 font-medium transition-colors text-sm px-4 min-h-[44px] rounded-md bg-primary-700 text-white hover:bg-primary-800 border border-primary-700 w-full sm:w-auto"
              >
                문항 목록으로
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
