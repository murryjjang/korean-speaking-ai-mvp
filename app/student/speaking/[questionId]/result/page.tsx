import Link from 'next/link'
import { getSpeakingEval } from '@/src/lib/mock/speaking-store'
import { calibrateEtriScore } from '@/src/lib/pronunciation-calibration'
import questionsJson from '@/src/content/questions.json'
import questionSetsJson from '@/src/content/question-sets.json'
import questionTypesJson from '@/src/content/question-types.json'
import rubricsJson from '@/src/content/rubrics.json'
import { PageHeader, Card, CardHeader, CardBody, Badge, ScoreBar } from '@/src/components/ui'

const rubric = rubricsJson.find((r) => r.id === 'rubric-speaking-01')!

// 낭독(qt-reading) 문항 AI 참고평가 기준 (rubric-reading-01 기반 정성 기준)
const READING_CRITERIA = [
  '지문 끝까지 읽기',
  '주요 정보 누락 없이 읽기',
  '문장 단위로 자연스럽게 읽기',
  '기본 발음·억양 이해 가능',
] as const

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

// q1 낭독 문항 AI 참고점수 산식 (임시 — 공식 최종점수는 교수자 확정 후 결정)
// q1ReferenceScore = round(etriCalibratedScore × 0.6 + aiReadingTaskScore × 0.4)
function computeQ1ReferenceScore(aiScore: number, calibratedScore: number): number {
  return Math.round(calibratedScore * 0.6 + aiScore * 0.4)
}

function q1ReferenceGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
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

function getEtriErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'audio_conversion_failed': return 'ETRI 발음평가용 음원 변환에 실패했습니다.'
    case 'etri_score_missing': return 'ETRI 발음평가 응답은 받았지만 점수 필드를 확인하지 못했습니다.'
    case 'etri_fetch_failed': return 'ETRI 서버 호출에 실패했습니다. 네트워크 또는 endpoint 확인이 필요합니다.'
    case 'etri_http_error': return 'ETRI 서버가 정상 응답을 반환하지 않았습니다.'
    case 'etri_api_error': return 'ETRI API 오류 응답을 받았습니다.'
    default: return 'ETRI 발음평가 응답 실패: 음원 형식 또는 응답 구조 확인이 필요합니다.'
  }
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

  const isReadingQuestion = question?.typeId === 'qt-reading'
  const isEtriSuccess = pronunciationResult.providerName === 'etri' && typeof pronunciationResult.rawScore === 'number'
  // ETRI 성공 + calibratedScore 있으면 직접 사용, rawScore만 있으면 calibration 함수로 계산
  const effectiveCalibratedScore: number | undefined =
    pronunciationResult.calibratedScore !== undefined
      ? pronunciationResult.calibratedScore
      : isEtriSuccess && pronunciationResult.rawScore !== undefined
        ? calibrateEtriScore(pronunciationResult.rawScore).calibratedScore
        : undefined
  // q1 낭독 + ETRI 성공 + calibratedScore 가용 시 q1ReferenceScore에 ETRI 보정값 반영
  const q1EtriReflected = isReadingQuestion && isEtriSuccess && effectiveCalibratedScore !== undefined
  const q1ReferenceScore = q1EtriReflected
    ? computeQ1ReferenceScore(totalScore, effectiveCalibratedScore!)
    : totalScore
  const displayScore = isReadingQuestion ? q1ReferenceScore : totalScore
  const displayGrade = isReadingQuestion ? q1ReferenceGrade(displayScore) : speakingEvalDetail?.grade
  const totalPct = Math.round((displayScore / totalMax) * 100)
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
          <CardHeader
            title={isReadingQuestion ? '문항 AI 참고평가' : '종합 점수'}
            description={isReadingQuestion && q1EtriReflected
              ? 'AI 1차 평가 + ETRI 보정 참고값 · 교수자 확정 전 참고값'
              : 'AI 1차 평가 · 교수자 확정 전 참고값'
            }
          />
          <CardBody>
            <div className="flex items-end gap-3 mb-5">
              <span className="text-5xl font-bold text-text-primary tabular-nums leading-none">
                {displayScore}
              </span>
              <span className="text-base text-text-muted mb-1">/ {totalMax}</span>
              <Badge variant={totalVariant} size="md" className="mb-1">
                {totalPct}점
              </Badge>
              {displayGrade && (
                <Badge variant={gradeVariant(displayGrade)} size="md" className="mb-1">
                  {displayGrade}등급
                </Badge>
              )}
            </div>

            {isReadingQuestion ? (
              /* 낭독 문항: rubric-speaking-01 항목 breakdown 숨김, 낭독 기준 표시 */
              <>
                <ul className="space-y-1.5 mb-4" data-testid="reading-criteria-list">
                  {READING_CRITERIA.map((c) => (
                    <li key={c} className="flex items-center gap-2 text-xs text-text-secondary">
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary-400" />
                      {c === '기본 발음·억양 이해 가능' && q1EtriReflected
                        ? `${c} · ETRI 참고 반영`
                        : c}
                    </li>
                  ))}
                </ul>
                <p
                  className="text-xs text-text-muted italic bg-surface border border-border rounded-md p-3 mb-2"
                  data-testid="reading-score-guidance"
                >
                  {q1EtriReflected
                    ? '이 점수는 AI 1차 평가에 ETRI 보정 참고점수를 일부 반영한 문항 참고값입니다. 공식 종합점수는 1~4번 전체 응시 후 산출되며, 최종 점수는 교수자 검토 후 확정됩니다.'
                    : 'ETRI 발음평가가 반영되지 않은 AI 참고평가입니다. 공식 종합점수는 1~4번 전체 응시 후 산출되며, 최종 점수는 교수자 검토 후 확정됩니다.'
                  }
                </p>
              </>
            ) : (
              /* 말하기 문항: rubric-speaking-01 5개 항목 breakdown */
              <>
                {/* provider=etri: 발음 라벨을 "AI 발음 추정"으로 변경 — ETRI 원점수와 혼동 방지 */}
                <ul className="space-y-3">
                  {rubricScores.map((item) => {
                    const displayLabel =
                      pronunciationResult.providerName === 'etri' && item.id === 'ri-pronunciation'
                        ? 'AI 발음 추정'
                        : item.label
                    return (
                      <li key={item.id} className="flex items-center gap-3">
                        <span className="text-xs text-text-secondary w-20 shrink-0">
                          {displayLabel}
                        </span>
                        <div className="flex-1">
                          <ScoreBar score={item.score} maxScore={item.maxScore} showLabel={false} />
                        </div>
                        <span className="text-xs tabular-nums text-text-secondary w-12 text-right shrink-0">
                          {item.score} / {item.maxScore}
                        </span>
                      </li>
                    )
                  })}
                </ul>

                {/* ETRI provider: 상단 AI 추정값과 ETRI 원점수 분리 안내 */}
                {pronunciationResult.providerName === 'etri' && (
                  <p
                    className="mt-2 text-xs text-text-muted italic"
                    data-testid="ai-pronunciation-note"
                  >
                    * 상단의 &lsquo;AI 발음 추정&rsquo;은 ETRI 원점수가 아니며, 실제 ETRI 발음평가 결과는 아래 카드에서 별도로 확인하세요.
                  </p>
                )}
              </>
            )}

            <p className="mt-4 text-xs text-text-secondary bg-surface border border-border rounded-md p-3 leading-relaxed">
              {speakingEvalDetail?.learner_feedback_ko ?? llmEvalResult.feedback}
            </p>
            {speakingEvalDetail?.learner_feedback_simple && (
              <p className="mt-2 text-xs text-primary-700 bg-primary-50 border border-primary-100 rounded-md p-3 leading-relaxed">
                {speakingEvalDetail.learner_feedback_simple}
              </p>
            )}

            <p
              className="mt-3 text-xs text-text-muted text-right"
              data-testid="ai-eval-disclaimer"
            >
              * 이 점수는 AI 1차 평가 결과이며, 교수자 검토 후 확정됩니다.
            </p>
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
                  {isReadingQuestion ? '낭독 포인트' : '모범 표현'}
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
            title={pronunciationResult.providerName === 'etri' ? 'ETRI 발음평가 API 결과' : '발음 평가'}
            description={`provider: ${pronunciationResult.providerName}${
              pronunciationResult.providerName === 'etri'
                ? pronunciationResult.rawScore !== undefined
                  ? ` · 원점수 ${pronunciationResult.rawScore.toFixed(2)}/5 · 단순 환산 ${pronunciationResult.normalizedScore}/100`
                  : pronunciationResult.fallbackReason
                    ? ' · 원점수 확인 실패'
                    : ''
                : ''
            }`}
          />
          <CardBody>
            {/* Error state — ETRI 실패 또는 score 파싱 실패 */}
            {pronunciationResult.fallbackReason && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-xs text-amber-700 leading-relaxed">
                  <strong>
                    {getEtriErrorMessage(pronunciationResult.fallbackReason ?? '')}
                  </strong>
                  {pronunciationResult.fallbackReason === 'etri_fetch_failed' ? (
                    <> 현재 제출에는 ETRI 발음평가가 반영되지 않았습니다. AI 1차 참고평가만 표시됩니다.</>
                  ) : pronunciationResult.rawScore === undefined ? (
                    <> 점수를 표시할 수 없습니다. 다시 녹음해 주세요.</>
                  ) : null}
                </p>
              </div>
            )}

            {/* ETRI 성공: rawScore가 실제 숫자일 때 표시 (spec: typeof rawScore === 'number' 기준) */}
            {pronunciationResult.providerName === 'etri' && typeof pronunciationResult.rawScore === 'number' ? (
              <div className="space-y-3 mb-4">
                <div className="flex flex-wrap items-baseline gap-x-6 gap-y-3">
                  <div>
                    <span className="text-xs text-text-secondary block mb-0.5">ETRI 원점수</span>
                    <span
                      className="text-2xl font-bold text-text-primary tabular-nums"
                      data-testid="etri-raw-score"
                    >
                      {pronunciationResult.rawScore.toFixed(2)}
                    </span>
                    <span className="text-sm text-text-muted ml-0.5">/ 5</span>
                  </div>
                  <div>
                    <span className="text-xs text-text-secondary block mb-0.5">단순 환산 점수</span>
                    <span
                      className="text-2xl font-bold text-text-primary tabular-nums"
                      data-testid="etri-normalized-score"
                    >
                      {pronunciationResult.normalizedScore}
                    </span>
                    <span className="text-sm text-text-muted ml-0.5">/ 100</span>
                  </div>
                  {pronunciationResult.calibratedScore !== undefined && (
                    <div>
                      <span className="text-xs text-text-secondary block mb-0.5">
                        보정 참고점수
                        <Badge variant="warning" size="sm" className="ml-1">파일럿 보정용</Badge>
                      </span>
                      <span
                        className="text-2xl font-bold text-primary-700 tabular-nums"
                        data-testid="etri-calibrated-score"
                      >
                        {pronunciationResult.calibratedScore}
                      </span>
                      <span className="text-sm text-text-muted ml-0.5">/ 100</span>
                    </div>
                  )}
                </div>

                <div
                  className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 leading-relaxed space-y-1"
                  data-testid="etri-calibration-notice"
                >
                  <p>
                    <strong>ETRI 원점수</strong>는 API가 반환한 원본 점수입니다.
                  </p>
                  <p>
                    <strong>단순 환산 점수</strong>는 원점수 / 5 × 100 변환값이며,{' '}
                    <strong>보정 참고점수</strong>는 파일럿 검증을 위한 임시 변환값입니다.
                    최종 발음점수는 교수자 검토 후 확정됩니다.
                  </p>
                  <p className="text-amber-700">
                    마이크 음량, 녹음 품질, 기준문장 일치 여부에 따라 점수가 달라질 수 있습니다.
                  </p>
                </div>

                {pronunciationResult.wordScores.length === 0 && (
                  <p
                    className="text-xs text-text-muted italic"
                    data-testid="etri-no-criteria-message"
                  >
                    ETRI 응답에 발음 정확도·유창성·억양 등 세부 항목별 점수는 포함되어 있지 않습니다.
                  </p>
                )}

                <p className="text-xs text-text-secondary bg-surface border border-border rounded-md p-3">
                  {pronunciationResult.feedback}
                </p>
              </div>
            ) : !pronunciationResult.fallbackReason ? (
              /* mock / 기타 provider: 종합 점수 + 5개 세부 항목 막대 */
              <>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl font-bold text-text-primary tabular-nums">
                    {pronunciationResult.normalizedScore}
                  </span>
                  <span className="text-sm text-text-muted">/ 100</span>
                  <Badge variant={getScoreVariant(pronunciationResult.normalizedScore)}>
                    발음
                  </Badge>
                </div>

                {/* 평가 기준별 세부 점수 (mock provider 파생값) */}
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
              </>
            ) : (
              /* Error state — score 표시 불가 */
              <p className="text-xs text-text-secondary bg-surface border border-border rounded-md p-3">
                {pronunciationResult.feedback}
              </p>
            )}

            {/* 단어별 참고 — 학습자가 원할 때 펼쳐보는 보조 정보 (채점 기준 아님) */}
            {pronunciationResult.wordScores.length > 0 && (
              <details className="mt-3">
                <summary className="text-xs text-text-muted cursor-pointer select-none hover:text-text-secondary transition-colors">
                  발음 참고 단어 보기
                </summary>
                <div className="mt-2">
                  <p className="text-[10px] text-text-muted italic mb-1.5">
                    발음 엔진의 어절별 참고 데이터입니다. 채점 기준에는 포함되지 않습니다.
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
