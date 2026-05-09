import Link from 'next/link'
import { getSpeakingEval } from '@/src/lib/mock/speaking-store'
import { calibrateEtriScore } from '@/src/lib/pronunciation-calibration'
import questionsJson from '@/src/content/questions.json'
import questionSetsJson from '@/src/content/question-sets.json'
import questionTypesJson from '@/src/content/question-types.json'
import rubricsJson from '@/src/content/rubrics.json'
import { PageHeader, Card, CardHeader, CardBody, Badge, ScoreBar } from '@/src/components/ui'
import type { AzureWordResult } from '@/src/types/providers'

const rubric = rubricsJson.find((r) => r.id === 'rubric-speaking-01')!

// 낭독(qt-reading) 문항 AI 참고평가 기준 (rubric-reading-01 기반 정성 기준)
const READING_CRITERIA = [
  '지문 끝까지 읽기',
  '주요 정보 누락 없이 읽기',
  '문장 단위로 자연스럽게 읽기',
  '기본 발음·억양 이해 가능',
] as const

// q2 자료 설명 전용 AI 참고평가 기준
const Q2_MATERIAL_CRITERIA = [
  '장소/상황을 언급함',
  '인물 또는 대상자를 언급함',
  '행동을 묘사함',
  '배경 또는 세부 요소를 언급함',
  '문장으로 연결해 설명함',
] as const

// q3 듣고 답하기 전용 AI 참고평가 기준
const Q3_LISTENING_CRITERIA = [
  '들은 내용의 핵심을 이해함',
  '필수 정보를 포함함',
  '질문에 맞게 답함',
  '답변이 완결됨',
  '불필요한 내용이 적음',
] as const

// 발음 평가 기준 5개 — 시연용 fallback 표시용
const PRONUNCIATION_CRITERIA = [
  { key: 'accuracy', label: '발음 정확도' },
  { key: 'fluency', label: '유창성' },
  { key: 'rhythm', label: '속도/리듬' },
  { key: 'clarity', label: '명료도' },
  { key: 'completeness', label: '완성도' },
] as const

// q4 대화 미션 다국어 피드백 — 점수 + 미션 달성 비율로 톤 조정
// LLM 호출 없이 정적 템플릿 사용. 학습자에게 동일한 정보를 모국어로 보조 전달.
function dialogueMultilingualFeedback(
  overallScore: number,
  achieved: number,
  total: number,
): { vi: { strengths: string[]; nextSteps: string[] }; en: { strengths: string[]; nextSteps: string[] } } {
  const ratio = total > 0 ? achieved / total : overallScore / 100
  if (overallScore >= 80 && ratio >= 0.75) {
    return {
      vi: {
        strengths: [
          'Bạn đã hoàn thành hầu hết các mục tiêu của nhiệm vụ.',
          'Cuộc hội thoại tự nhiên và tiếng Hàn của bạn dễ hiểu.',
        ],
        nextSteps: ['Lần sau, hãy thử dùng các cách diễn đạt phong phú hơn để nói tự nhiên hơn.'],
      },
      en: {
        strengths: [
          'You completed most of the mission goals.',
          'Your conversation flowed naturally and your Korean was easy to follow.',
        ],
        nextSteps: ['Next time, try varying your expressions to sound even more natural.'],
      },
    }
  }
  if (overallScore >= 60 || ratio >= 0.5) {
    return {
      vi: {
        strengths: ['Bạn đã đạt được một số mục tiêu của nhiệm vụ.'],
        nextSteps: [
          'Hãy nói thêm các mục tiêu còn thiếu trong khung "보완할 점" ở trên.',
          'Khi đặt hàng, hãy nói rõ số lượng và cách thanh toán.',
        ],
      },
      en: {
        strengths: ['You achieved several of the mission goals.'],
        nextSteps: [
          'Address the remaining items listed in "보완할 점" above.',
          'When ordering, state the quantity and payment method clearly.',
        ],
      },
    }
  }
  return {
    vi: {
      strengths: ['Bạn đã cố gắng giao tiếp với NPC bằng tiếng Hàn.'],
      nextSteps: [
        'Hãy nghe câu hỏi của NPC kỹ hơn và trả lời theo từng bước.',
        'Đừng bỏ qua các mục tiêu: chọn món, số lượng, ăn tại chỗ/mang đi, cách thanh toán.',
      ],
    },
    en: {
      strengths: ['You attempted to communicate with the NPC in Korean.'],
      nextSteps: [
        'Listen carefully to each NPC question and respond step by step.',
        'Cover every mission goal: order item, quantity, dine-in/takeout, and payment method.',
      ],
    },
  }
}

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

  // 기준별 파생 점수 — 고정 오프셋으로 delta=0(fallback)에서도 항목별 점수 차이 표시
  const derivedScores: Record<string, number> = {
    accuracy: avg,
    fluency: clamp(normalizedScore + Math.round(delta * 0.3) - 2),
    rhythm: clamp(normalizedScore + Math.round(delta * 0.1) + 3),
    clarity: clamp(normalizedScore + 1),
    completeness: clamp(normalizedScore - Math.round(delta * 0.2) - 3),
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
// Azure success: q1ReadingScore = clamp(round(PronScore × 0.7 + aiReadingTaskScore × 0.3), 0, 100)
// ETRI success (레거시): q1ReadingScore = round(etriCalibratedScore × 0.6 + aiReadingTaskScore × 0.4)
// Demo fallback: q1ReadingScore = clamp(round(textMatchScore × 0.7 + aiScore × 0.3), 0, 100)
function computeQ1AzureScore(aiScore: number, pronScore: number): number {
  return Math.max(0, Math.min(100, Math.round(pronScore * 0.7 + aiScore * 0.3)))
}
function computeQ1ReferenceScore(aiScore: number, calibratedScore: number): number {
  return Math.round(calibratedScore * 0.6 + aiScore * 0.4)
}
function computeQ1DemoScore(aiScore: number, textMatchScore: number): number {
  const raw = Math.max(0, Math.min(100, Math.round(textMatchScore * 0.7 + aiScore * 0.3)))
  // 정확 낭독 floor: 텍스트 일치도가 높으면 최소 점수 보장
  if (textMatchScore >= 90) return Math.max(90, raw)
  if (textMatchScore >= 85) return Math.max(87, raw)
  return raw
}

// q1 demo/fallback: STT 텍스트 일치도 퍼지 매칭 (조사·어미 경미 차이 허용)
function computeKoreanTextMatchScore(referenceText: string, recognizedText: string): number {
  if (!recognizedText.trim()) return 0
  const normalize = (t: string) => t.replace(/[.,!?。、·"'"']/g, ' ').replace(/\s+/g, ' ').trim()
  const refWords = normalize(referenceText).split(' ').filter(Boolean)
  const recWords = normalize(recognizedText).split(' ').filter(Boolean)
  if (refWords.length === 0) return 0
  const recCopy = [...recWords]
  let matched = 0
  for (const rw of refWords) {
    const idx = recCopy.findIndex(
      (w) => w === rw || (w.length >= 2 && rw.length >= 2 && w[0] === rw[0] && Math.abs(w.length - rw.length) <= 1),
    )
    if (idx >= 0) { recCopy.splice(idx, 1); matched++ }
  }
  const ratio = matched / refWords.length
  if (ratio >= 0.95) return 96
  if (ratio >= 0.88) return 92
  if (ratio >= 0.80) return 88
  if (ratio >= 0.70) return Math.max(82, Math.round(ratio * 100))
  return Math.round(ratio * 100)
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

// ── Azure 낭독 첨삭 UI ─────────────────────────────────────────────────────────

function stripPunct(w: string): string {
  return w.replace(/[.,!?。、·]/g, '').trim()
}

// Azure word-level diff: 제시문 단어별 ErrorType 기반 색상 표시
function AzureWordDiff({
  referenceText,
  recognizedText,
  wordResults,
}: {
  referenceText: string
  recognizedText: string
  wordResults?: AzureWordResult[]
}) {
  const refWords = referenceText.split(/\s+/).filter(Boolean)

  if (wordResults && wordResults.length > 0) {
    type AlignToken = { text: string; errorType: AzureWordResult['errorType'] }
    const aligned: AlignToken[] = []
    let ai = 0
    for (const rw of refWords) {
      if (ai < wordResults.length && stripPunct(wordResults[ai].word) === stripPunct(rw)) {
        aligned.push({ text: rw, errorType: wordResults[ai].errorType })
        ai++
      } else {
        aligned.push({ text: rw, errorType: 'Omission' })
      }
    }
    const insertions = wordResults.slice(ai).filter((w) => w.errorType === 'Insertion')

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {aligned.map((tok, i) => {
            if (tok.errorType === 'None') {
              return (
                <span key={i} className="text-sm font-medium text-success-700 bg-success-50 border border-success-200 px-1.5 py-0.5 rounded">
                  {tok.text}
                </span>
              )
            }
            if (tok.errorType === 'Omission') {
              return (
                <span key={i} className="inline-flex items-center gap-0.5">
                  <span className="text-sm font-medium text-danger-600 underline decoration-danger-400 decoration-dotted bg-danger-50 border border-danger-200 px-1.5 py-0.5 rounded">
                    {tok.text}
                  </span>
                  <span className="text-[9px] bg-danger-100 text-danger-600 px-1 rounded leading-none">누락</span>
                </span>
              )
            }
            return (
              <span key={i} className="text-sm font-medium text-danger-600 line-through decoration-danger-400 bg-danger-50 border border-danger-200 px-1.5 py-0.5 rounded">
                {tok.text}
              </span>
            )
          })}
          {insertions.map((w, i) => (
            <span key={`ins-${i}`} className="text-sm font-medium text-warning-600 bg-warning-50 border border-warning-200 px-1.5 py-0.5 rounded">
              [{w.word}]
            </span>
          ))}
        </div>
        {recognizedText && (
          <div className="text-xs text-text-muted bg-surface border border-border rounded-md p-2.5">
            <span className="font-semibold mr-1.5">인식 결과:</span>
            <span className="text-text-secondary">{recognizedText}</span>
          </div>
        )}
        <p className="text-[10px] text-text-muted italic">
          발음평가 점수와 인식 결과를 바탕으로 추정한 교정 포인트입니다.
        </p>
      </div>
    )
  }

  // STT diff fallback (word-by-word match)
  if (!recognizedText) return null
  const recWords = recognizedText.split(/\s+/).filter(Boolean)
  const recCopy = [...recWords]
  const tokens = refWords.map((rw) => {
    const idx = recCopy.findIndex((w) => stripPunct(w) === stripPunct(rw))
    if (idx >= 0) { recCopy.splice(idx, 1); return { text: rw, matched: true } }
    return { text: rw, matched: false }
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {tokens.map((tok, i) => (
          <span
            key={i}
            className={tok.matched
              ? 'text-sm font-medium text-success-700 bg-success-50 border border-success-200 px-1.5 py-0.5 rounded'
              : 'text-sm font-medium text-danger-600 bg-danger-50 border border-danger-200 px-1.5 py-0.5 rounded line-through decoration-danger-400'}
          >
            {tok.text}
          </span>
        ))}
      </div>
      <div className="text-xs text-text-muted bg-surface border border-border rounded-md p-2.5">
        <span className="font-semibold mr-1.5">인식 결과:</span>
        <span className="text-text-secondary">{recognizedText}</span>
      </div>
      <p className="text-[10px] text-text-muted italic">
        발음평가 점수와 인식 결과를 바탕으로 추정한 교정 포인트입니다.
      </p>
    </div>
  )
}

// q1 Azure 동적 피드백
function getQ1AzureFeedback(
  score: number,
  hasWordMismatch: boolean,
): { good: string[]; improve: string[] } {
  if (score >= 90) {
    return {
      good: [
        '전체 문장을 매우 정확하게 읽었습니다.',
        '단어 누락이 거의 없고 문장 흐름이 자연스럽습니다.',
        '발음과 읽기 정확도가 매우 좋습니다.',
      ],
      improve: [],
    }
  } else if (score >= 80) {
    return {
      good: [
        '대부분의 문장을 정확하게 읽었습니다.',
        '전체적인 읽기 흐름이 좋습니다.',
      ],
      improve: hasWordMismatch
        ? ['일부 단어가 제시문과 다르게 인식되었습니다. 빨간색으로 표시된 단어를 다시 읽어 보세요.']
        : ['문장 끝부분을 조금 더 또렷하게 읽어 보세요.'],
    }
  } else if (score >= 70) {
    return {
      good: ['전체 지문을 읽으려는 노력이 좋습니다.'],
      improve: [
        ...(hasWordMismatch
          ? ['일부 단어가 제시문과 다르게 인식되었습니다. 빨간색으로 표시된 단어를 다시 읽어 보세요.']
          : []),
        '문장 끝부분을 조금 더 또렷하게 읽어 보세요.',
      ],
    }
  } else {
    return {
      good: [],
      improve: [
        '여러 단어가 누락되었거나 다르게 읽혔습니다.',
        ...(hasWordMismatch ? ['빨간색으로 표시된 단어를 다시 읽어 보세요.'] : []),
        '단어 사이를 의미 단위로 끊어 읽어 보세요.',
        '문장 끝을 흐리지 않도록 끝까지 또렷하게 읽어 보세요.',
      ],
    }
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
  searchParams: Promise<{ sub?: string; attemptId?: string }>
}) {
  const { questionId: rawId } = await params
  const questionId = QUESTION_ID_ALIASES[rawId] ?? rawId
  const { sub: submissionId, attemptId } = await searchParams

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

  const totalScore = llmEvalResult.totalScore
  const totalMax = 100

  const isReadingQuestion = question?.typeId === 'qt-reading'
  const isQ2 = question?.typeId === 'qt-material-desc'
  const isQ3 = question?.typeId === 'qt-listening-resp'
  const isDialogueMission = question?.typeId === 'qt-dialogue-mission'
  const goalResults = evalRecord.meta?.goalResults ?? []
  const achievedMissionGoals = evalRecord.meta?.achievedMissionGoals ?? 0
  const totalMissionGoals = evalRecord.meta?.totalMissionGoals ?? 0
  const dialogueHybridScore = evalRecord.meta?.dialogueHybridScore
  const dialogueEvalSource = evalRecord.meta?.dialogueEvalSource
  const dialogueConversationProvider = evalRecord.meta?.dialogueConversationProvider

  // Azure: providerName === 'azure' && pronScore != null
  const isAzureSuccess = pronunciationResult.providerName === 'azure' && pronunciationResult.pronScore != null
  // ETRI 레거시: rawScore 존재 (이전 평가 기록 호환)
  const isEtriSuccess = pronunciationResult.providerName === 'etri' && typeof pronunciationResult.rawScore === 'number'

  // ETRI calibration (레거시 지원)
  const effectiveCalibratedScore: number | undefined =
    pronunciationResult.calibratedScore !== undefined
      ? pronunciationResult.calibratedScore
      : isEtriSuccess && pronunciationResult.rawScore !== undefined
        ? calibrateEtriScore(pronunciationResult.rawScore).calibratedScore
        : undefined

  // q1 낭독 referenceText 추출 (Azure 첨삭 UI용, score 계산 전에 선행)
  const q1ReferenceText = (() => {
    if (!isReadingQuestion || !question?.prompt) return ''
    const idx = question.prompt.indexOf('\n\n')
    if (idx !== -1) {
      const candidate = question.prompt.slice(idx + 2).trim()
      if (candidate) return candidate
    }
    return question.prompt
  })()

  // q1 demo: pronunciationResult.recognizedText 없으면 STT transcript로 대체
  const q1DemoRecognizedText = isReadingQuestion
    ? (pronunciationResult.recognizedText || sttResult.transcript || '')
    : ''

  // q1 점수 산식 우선순위: Azure > ETRI(레거시) > AI 참고평가
  const q1AzureReflected = isReadingQuestion && isAzureSuccess
  const q1EtriReflected = isReadingQuestion && isEtriSuccess && effectiveCalibratedScore !== undefined

  const q1ReferenceScore = (() => {
    if (!isReadingQuestion) return totalScore
    if (q1AzureReflected) return computeQ1AzureScore(totalScore, pronunciationResult.pronScore!)
    if (q1EtriReflected) return computeQ1ReferenceScore(totalScore, effectiveCalibratedScore!)
    // Demo fallback: 실제 텍스트 일치도 퍼지 매칭 기반 보정 (recognizedText 또는 STT transcript)
    if (q1DemoRecognizedText && q1ReferenceText) {
      return computeQ1DemoScore(totalScore, computeKoreanTextMatchScore(q1ReferenceText, q1DemoRecognizedText))
    }
    return totalScore
  })()

  const displayScore = isReadingQuestion ? q1ReferenceScore : totalScore
  const displayGrade = isReadingQuestion ? q1ReferenceGrade(displayScore) : speakingEvalDetail?.grade

  // Azure word-level mismatch 여부 (Azure 성공 시 피드백용)
  const azureHasWordMismatch = (() => {
    if (!isAzureSuccess || !pronunciationResult.wordResults?.length) return false
    return pronunciationResult.wordResults.some((w) => w.errorType !== 'None')
  })()

  // demo/fallback: 실제 단어 불일치 여부 (빨간색 문구 조건부 표시용)
  const hasDemoWordMismatch = (() => {
    if (!isReadingQuestion || !q1DemoRecognizedText || !q1ReferenceText) return false
    const norm = (t: string) => t.replace(/[.,!?。、·]/g, '').trim()
    const refWords = q1ReferenceText.split(/\s+/).filter(Boolean).map(norm)
    const recCopy = q1DemoRecognizedText.split(/\s+/).filter(Boolean).map(norm)
    let unmatched = 0
    for (const rw of refWords) {
      const idx = recCopy.findIndex((w) => w === rw)
      if (idx >= 0) recCopy.splice(idx, 1)
      else unmatched++
    }
    return unmatched >= 2
  })()
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
            title={
              isReadingQuestion ? '문항 AI 참고평가'
              : isQ2 ? '자료 설명 AI 참고평가'
              : isQ3 ? '듣고 답하기 AI 참고평가'
              : isDialogueMission ? '대화 미션 AI 참고평가'
              : '종합 점수'
            }
            description={
              isReadingQuestion && q1AzureReflected
                ? 'AI 1차 평가 + Azure 발음평가 보정 참고값 · 교수자 확정 전 참고값'
                : isReadingQuestion && q1EtriReflected
                  ? 'AI 1차 평가 + ETRI 보정 참고값 · 교수자 확정 전 참고값'
                  : isReadingQuestion && pronunciationResult.normalizedScore > 0 && pronunciationResult.recognizedText
                    ? 'AI 1차 평가 + STT 일치도 보정 참고값 · 교수자 확정 전 참고값'
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
                      {c === '기본 발음·억양 이해 가능' && q1AzureReflected
                        ? `${c} · Azure 발음평가 반영`
                        : c === '기본 발음·억양 이해 가능' && q1EtriReflected
                          ? `${c} · ETRI 참고 반영`
                          : c === '기본 발음·억양 이해 가능' && pronunciationResult.normalizedScore > 0 && pronunciationResult.recognizedText
                            ? `${c} · STT 일치도 참고 반영`
                            : c}
                    </li>
                  ))}
                </ul>
                <p
                  className="text-xs text-text-muted italic bg-surface border border-border rounded-md p-3 mb-2"
                  data-testid="reading-score-guidance"
                >
                  {q1AzureReflected
                    ? '이 점수는 AI 1차 평가에 Azure 발음평가 참고점수를 반영한 문항 참고값입니다. 공식 종합점수는 1~4번 전체 응시 후 산출되며, 최종 점수는 교수자 검토 후 확정됩니다.'
                    : q1EtriReflected
                      ? '이 점수는 AI 1차 평가에 ETRI 보정 참고점수를 일부 반영한 문항 참고값입니다. 공식 종합점수는 1~4번 전체 응시 후 산출되며, 최종 점수는 교수자 검토 후 확정됩니다.'
                      : pronunciationResult.fallbackReason && pronunciationResult.recognizedText
                        ? '발음평가 연결을 확인 중입니다. 이번 결과에는 음성 인식 기반으로 보정한 AI 참고평가가 반영되었습니다. 최종 점수는 교수자 검토 후 확정됩니다.'
                        : pronunciationResult.fallbackReason
                          ? '발음평가 연결을 확인 중입니다. 이번 결과에는 AI 참고평가만 반영되었습니다. 최종 점수는 교수자 검토 후 확정됩니다.'
                          : '발음평가가 반영되지 않은 AI 참고평가입니다. 공식 종합점수는 1~4번 전체 응시 후 산출되며, 최종 점수는 교수자 검토 후 확정됩니다.'
                  }
                </p>
              </>
            ) : isQ2 ? (
              /* q2 자료 설명: legacy 5항목 숨김, 자료 설명 전용 기준 표시 */
              <>
                <ul className="space-y-1.5 mb-4" data-testid="q2-criteria-list">
                  {Q2_MATERIAL_CRITERIA.map((c) => (
                    <li key={c} className="flex items-center gap-2 text-xs text-text-secondary">
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary-400" />
                      {c}
                    </li>
                  ))}
                </ul>
                <p
                  className="text-xs text-text-muted italic bg-surface border border-border rounded-md p-3 mb-2"
                  data-testid="q2-score-guidance"
                >
                  이 점수는 자료 설명 문항에 대한 AI 1차 참고값입니다. 최종 점수는 교수자 검토 후 확정됩니다.
                </p>
              </>
            ) : isQ3 ? (
              /* q3 듣고 답하기: legacy 5항목 숨김, 듣고 답하기 전용 기준 표시 */
              <>
                <ul className="space-y-1.5 mb-4" data-testid="q3-criteria-list">
                  {Q3_LISTENING_CRITERIA.map((c) => (
                    <li key={c} className="flex items-center gap-2 text-xs text-text-secondary">
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary-400" />
                      {c}
                    </li>
                  ))}
                </ul>
                <p
                  className="text-xs text-text-muted italic bg-surface border border-border rounded-md p-3 mb-2"
                  data-testid="q3-score-guidance"
                >
                  이 점수는 듣고 답하기 문항에 대한 AI 1차 참고값입니다. 최종 점수는 교수자 검토 후 확정됩니다.
                </p>
              </>
            ) : isDialogueMission ? (
              /* q4 대화 미션: 전용 평가 기준 표시 — legacy rubric 숨김 */
              <>
                <div className="flex items-center gap-3 mb-3 flex-wrap" data-testid="q4-mission-score">
                  <span className="text-xs text-text-secondary">문항 AI 참고점수:</span>
                  <span className="text-lg font-bold text-text-primary tabular-nums">{displayScore}/100</span>
                  {totalMissionGoals > 0 && (
                    <span
                      className="text-xs text-text-secondary"
                      data-testid="q4-mission-achieved"
                    >
                      미션 달성: {achievedMissionGoals}/{totalMissionGoals}
                    </span>
                  )}
                </div>
                {dialogueHybridScore && (
                  <div
                    className="mb-3 px-3 py-2 bg-surface border border-border rounded-md space-y-1"
                    data-testid="q4-hybrid-breakdown"
                  >
                    <p className="text-xs text-text-secondary">
                      <span className="font-medium text-text-primary">정량</span>{' '}
                      {dialogueHybridScore.quantitativeScore}/60
                      <span className="text-text-muted">
                        {' '}
                        (미션 {dialogueHybridScore.quantitativeRaw}/{dialogueHybridScore.quantitativeMax})
                      </span>
                      {' · '}
                      <span className="font-medium text-text-primary">정성</span>{' '}
                      {dialogueHybridScore.qualitativeScore}/40
                    </p>
                    <p className="text-xs text-text-muted">
                      자연스러움 {dialogueHybridScore.qualitativeBreakdown.naturalness} ·
                      {' '}정확성 {dialogueHybridScore.qualitativeBreakdown.koreanAccuracy} ·
                      {' '}응답성 {dialogueHybridScore.qualitativeBreakdown.responsiveness}
                    </p>
                  </div>
                )}
                {dialogueEvalSource === 'rule' && (
                  <p className="mb-2 text-[10px] text-text-muted italic" data-testid="q4-eval-source-note">
                    * 규칙 기반 미션 판정으로 채점되었습니다.
                  </p>
                )}
                <ul className="space-y-1.5 mb-4" data-testid="q4-dialogue-criteria-list">
                  {[
                    '메뉴판에 있는 품목을 주문함',
                    '수량을 말함',
                    '포장/매장 이용 여부를 말함',
                    '결제 방법을 말함',
                  ].map((c) => (
                    <li key={c} className="flex items-center gap-2 text-xs text-text-secondary">
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary-400" />
                      {c}
                    </li>
                  ))}
                </ul>
                <p
                  className="text-xs text-text-muted italic bg-surface border border-border rounded-md p-3 mb-2"
                  data-testid="q4-score-guidance"
                >
                  이 점수는 대화 미션에 대한 AI 1차 참고값입니다. 최종 점수는 교수자 검토 후 확정됩니다.
                </p>
              </>
            ) : (
              /* 기타 말하기 문항: rubric-speaking-01 5개 항목 breakdown */
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
            {/* speakingEvalDetail 정의 시 LLM이 improvements를 명시 결정한 것으로 봄 → rubric weaknesses 표시 안 함 */}
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
            ) : !speakingEvalDetail && weaknesses.length > 0 ? (
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

            {/* q4 dialogue: goal-based 점수 피드백 */}
            {isDialogueMission && goalResults.length > 0 && (
              <div className="mt-4 space-y-3">
                {goalResults.some((g) => g.achieved) && (
                  <div>
                    <p className="text-xs font-semibold text-success-700 uppercase tracking-wide mb-1.5" data-testid="q4-strengths-label">
                      잘한 점
                    </p>
                    <ul className="space-y-1">
                      {goalResults.filter((g) => g.achieved).map((g) => (
                        <li key={g.goalIndex} className="flex items-center gap-2">
                          <span className="text-success-600 font-bold text-sm shrink-0">✓</span>
                          <span className="text-xs text-text-secondary">{g.labelKo}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {goalResults.some((g) => !g.achieved) && (
                  <div>
                    <p className="text-xs font-semibold text-warning-700 uppercase tracking-wide mb-1.5" data-testid="q4-improvements-label">
                      보완할 점
                    </p>
                    <ul className="space-y-1">
                      {goalResults.filter((g) => !g.achieved).map((g) => {
                        const suggestions: Record<number, string> = {
                          0: '메뉴판에 있는 음료나 디저트를 주문해 보세요.',
                          1: '몇 잔(개) 주문할지 수량을 말해 보세요.',
                          2: "'포장해 주세요' 또는 '매장에서 마실게요'라고 말해 보세요.",
                          3: "'카드로 결제할게요' 또는 '현금으로 계산할게요'라고 말해 보세요.",
                        }
                        return (
                          <li key={g.goalIndex} className="flex items-start gap-2">
                            <span className="text-warning-500 font-bold text-sm shrink-0 mt-0.5">△</span>
                            <span className="text-xs text-text-secondary">{suggestions[g.goalIndex] ?? `${g.labelKo}을(를) 말하지 않았습니다.`}</span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
                <p className="text-xs text-text-muted leading-relaxed">
                  대화 전체 내용은 아래 &ldquo;대화 기록&rdquo; 항목에서 확인하세요.
                </p>
              </div>
            )}
            {/* q4 dialogue: goalResults 없을 때 기본 안내 */}
            {isDialogueMission && goalResults.length === 0 && (
              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-md">
                <p className="text-xs text-purple-700 leading-relaxed">
                  AI와의 대화 전체 내용을 기반으로 평가되었습니다. 아래 &ldquo;대화 기록&rdquo; 항목에서 전체 대화 내용을 확인하세요.
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

        {/* q4 다국어 피드백 — 베트남어 + 영어 */}
        {isDialogueMission && (() => {
          const ml = dialogueMultilingualFeedback(displayScore, achievedMissionGoals, totalMissionGoals)
          return (
            <Card data-testid="q4-multilingual-feedback">
              <CardHeader
                title="모국어 피드백"
                description="한국어 평가 내용을 베트남어와 영어로 보조 안내합니다."
              />
              <CardBody className="space-y-5">
                <div data-testid="q4-feedback-vi">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                    베트남어 (Tiếng Việt)
                  </p>
                  <div className="space-y-2">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <p className="text-xs font-semibold text-emerald-700 mb-1">잘한 점</p>
                      <ul className="text-sm text-emerald-700 space-y-1">
                        {ml.vi.strengths.map((t, i) => <li key={i}>• {t}</li>)}
                      </ul>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs font-semibold text-amber-700 mb-1">다음 목표</p>
                      <ul className="text-sm text-amber-700 space-y-1">
                        {ml.vi.nextSteps.map((t, i) => <li key={i}>• {t}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
                <div data-testid="q4-feedback-en">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                    영어 (English)
                  </p>
                  <div className="space-y-2">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <p className="text-xs font-semibold text-emerald-700 mb-1">잘한 점</p>
                      <ul className="text-sm text-emerald-700 space-y-1">
                        {ml.en.strengths.map((t, i) => <li key={i}>• {t}</li>)}
                      </ul>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs font-semibold text-amber-700 mb-1">다음 목표</p>
                      <ul className="text-sm text-amber-700 space-y-1">
                        {ml.en.nextSteps.map((t, i) => <li key={i}>• {t}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )
        })()}

        {/* STT 전사 결과 / q4: 대화 기록 */}
        <Card>
          <CardHeader
            title={isDialogueMission ? '대화 기록' : '음성 인식 결과 (STT)'}
            description={
              isDialogueMission
                ? '이 문항은 대화 내용과 미션 달성 여부를 바탕으로 AI가 1차 평가했습니다.'
                : `신뢰도 ${Math.round(sttResult.confidence * 100)}% · provider: ${sttResult.providerName}`
            }
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
            {/* q4 대화 미션: mock provider 안내 — conversation provider가 mock/fallback일 때만 표시. */}
            {isDialogueMission && dialogueConversationProvider && dialogueConversationProvider !== 'openai' && (
              <div className="mb-3 p-3 bg-surface border border-border rounded-md" data-testid="q4-mock-provider-notice">
                <p className="text-xs text-text-secondary leading-relaxed">
                  현재는 테스트용 대화 provider로 평가되었습니다. 실제 LLM 연결 후 대화 품질은 추가 개선됩니다.
                </p>
              </div>
            )}
            {/* 비 q4: mock fallback 경고 */}
            {!isDialogueMission && sttResult.providerName === 'mock' && (
              <div className="mb-3 p-3 bg-surface border border-border rounded-md">
                <p className="text-xs text-text-secondary leading-relaxed">
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

        {/* 발음 평가 결과 — q1 낭독에만 전체 카드 표시; q2/q3는 안내; q4는 숨김 */}
        {isReadingQuestion ? (
          <Card>
            <CardHeader
              title={isAzureSuccess ? '발음평가 결과' : '낭독 참고평가'}
              description={
                isAzureSuccess
                  ? 'provider: azure · 실시간 발음평가'
                  : pronunciationResult.providerName === 'etri' && typeof pronunciationResult.rawScore === 'number'
                    ? `provider: etri · 원점수 ${pronunciationResult.rawScore.toFixed(2)}/5`
                    : (pronunciationResult.fallbackReason || pronunciationResult.providerName === 'azure')
                      ? 'attempted: azure · actual: demo'
                      : `provider: ${pronunciationResult.providerName}`
              }
              action={
                isAzureSuccess
                  ? <Badge variant="success" size="sm" data-testid="provider-badge-azure">실시간 발음평가</Badge>
                  : <Badge variant="warning" size="sm" data-testid="provider-badge-demo">시연용 평가 모드</Badge>
              }
            />
            <CardBody>
              {/* Fallback 안내 — 학습자 친화적 소형 안내 */}
              {/* Shown for: (a) explicit fallback reason, or (b) confusion state (azure provider but no pron data) */}
              {!isAzureSuccess && (pronunciationResult.fallbackReason || pronunciationResult.providerName === 'azure') && (
                <p
                  className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2.5"
                  data-testid="pronunciation-fallback-notice"
                >
                  실시간 발음평가 연결을 확인 중입니다. 현재는 음성 인식 결과와 제시문 비교를 바탕으로 한 참고평가가 표시됩니다.
                </p>
              )}

              {/* Azure 성공: PronScore / Accuracy / Fluency / Completeness */}
              {isAzureSuccess && (
                <div className="space-y-4 mb-4" data-testid="azure-pronunciation-section">
                  <div className="flex flex-wrap items-baseline gap-x-6 gap-y-3">
                    <div>
                      <span className="text-xs text-text-secondary block mb-0.5">발음 종합점수</span>
                      <span
                        className="text-3xl font-bold tabular-nums"
                        style={{
                          color: (pronunciationResult.pronScore ?? 0) >= 80 ? '#16a34a'
                            : (pronunciationResult.pronScore ?? 0) >= 60 ? '#d97706' : '#dc2626'
                        }}
                        data-testid="pron-score"
                      >
                        {Math.round(pronunciationResult.pronScore!)}
                      </span>
                      <span className="text-sm text-text-muted ml-0.5">/ 100</span>
                    </div>
                    {pronunciationResult.accuracyScore != null && (
                      <div>
                        <span className="text-xs text-text-secondary block mb-0.5">정확도</span>
                        <span className="text-xl font-semibold tabular-nums text-text-primary" data-testid="accuracy-score">
                          {Math.round(pronunciationResult.accuracyScore)}
                        </span>
                      </div>
                    )}
                    {pronunciationResult.fluencyScore != null && (
                      <div>
                        <span className="text-xs text-text-secondary block mb-0.5">유창성</span>
                        <span className="text-xl font-semibold tabular-nums text-text-primary" data-testid="fluency-score">
                          {Math.round(pronunciationResult.fluencyScore)}
                        </span>
                      </div>
                    )}
                    {pronunciationResult.completenessScore != null && (
                      <div>
                        <span className="text-xs text-text-secondary block mb-0.5">완성도</span>
                        <span className="text-xl font-semibold tabular-nums text-text-primary" data-testid="completeness-score">
                          {Math.round(pronunciationResult.completenessScore)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 제시문 vs 내 발화 첨삭 */}
                  {q1ReferenceText && (
                    <div className="space-y-3" data-testid="word-diff-section">
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                        낭독 첨삭
                      </p>
                      <div className="bg-surface border border-border rounded-md p-3">
                        <p className="text-xs text-text-muted mb-2 font-medium">제시문</p>
                        <p className="text-sm text-text-primary leading-relaxed" data-testid="reference-text">
                          {q1ReferenceText}
                        </p>
                      </div>
                      <div className="bg-surface border border-border rounded-md p-3">
                        <p className="text-xs text-text-muted mb-2 font-medium">교정 포인트</p>
                        <AzureWordDiff
                          referenceText={q1ReferenceText}
                          recognizedText={pronunciationResult.recognizedText ?? ''}
                          wordResults={pronunciationResult.wordResults}
                        />
                      </div>
                    </div>
                  )}

                  {/* Azure 동적 피드백 */}
                  {(() => {
                    const fb = getQ1AzureFeedback(q1ReferenceScore, azureHasWordMismatch)
                    return (
                      <div className="space-y-2" data-testid="azure-feedback-section">
                        {fb.good.length > 0 && (
                          <div className="p-3 bg-success-50 border border-success-200 rounded-md">
                            <p className="text-xs font-semibold text-success-700 mb-1">잘한 점</p>
                            <ul className="text-xs text-success-700 space-y-0.5">
                              {fb.good.map((t, i) => <li key={i}>• {t}</li>)}
                            </ul>
                          </div>
                        )}
                        {fb.improve.length > 0 && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                            <p className="text-xs font-semibold text-amber-700 mb-1">교정할 점</p>
                            <ul className="text-xs text-amber-700 space-y-0.5">
                              {fb.improve.map((t, i) => <li key={i}>• {t}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* ETRI 레거시: rawScore가 실제 숫자일 때 표시 (이전 평가 기록 호환) */}
              {!isAzureSuccess && pronunciationResult.providerName === 'etri' && typeof pronunciationResult.rawScore === 'number' && (
                <div className="space-y-3 mb-4" data-testid="etri-legacy-section">
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
                      <span className="text-xs text-text-secondary block mb-0.5">환산 점수</span>
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
                  {pronunciationResult.wordScores.length === 0 && (
                    <p className="text-xs text-text-muted italic" data-testid="etri-no-criteria-message">
                      ETRI 응답에 발음 정확도·유창성·억양 등 세부 항목별 점수는 포함되어 있지 않습니다.
                    </p>
                  )}
                  <p className="text-xs text-text-secondary bg-surface border border-border rounded-md p-3">
                    {pronunciationResult.feedback}
                  </p>
                </div>
              )}

              {/* demo/fallback: 시연용 점수 표시 */}
              {/* confusion state (azure provider, no pronScore, no fallbackReason) shows message instead of score bars */}
              {!isAzureSuccess && !(pronunciationResult.providerName === 'etri' && typeof pronunciationResult.rawScore === 'number') && (
                (pronunciationResult.fallbackReason || pronunciationResult.providerName === 'azure') ? (
                  <>
                    <p className="text-xs text-text-secondary bg-surface border border-border rounded-md p-3 mb-3" data-testid="pronunciation-fallback-message">
                      {pronunciationResult.feedback || '실시간 발음평가 연결을 확인 중입니다. 현재는 음성 인식 결과와 제시문 비교를 바탕으로 한 참고평가가 표시됩니다.'}
                    </p>
                    {q1DemoRecognizedText && (
                      <>
                        <div className="flex items-center gap-3 mb-4">
                          <span className="text-3xl font-bold text-text-primary tabular-nums" data-testid="demo-pron-score">
                            {q1ReferenceScore}
                          </span>
                          <span className="text-sm text-text-muted">/ 100</span>
                          <Badge variant={getScoreVariant(q1ReferenceScore)}>참고 점수</Badge>
                        </div>
                        <ul className="space-y-2 mb-4">
                          {normalizePronunciationDisplay(
                            q1ReferenceScore,
                            [],
                          ).map((item) => (
                            <li key={item.key} className="flex items-center gap-3">
                              <span className="text-xs text-text-secondary w-20 shrink-0">{item.label}</span>
                              <div className="flex-1">
                                <ScoreBar score={item.score} maxScore={100} showLabel={false} />
                              </div>
                              <span className="text-xs tabular-nums text-text-secondary w-8 text-right shrink-0">
                                {item.score}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {(() => {
                          const fb = getQ1AzureFeedback(q1ReferenceScore, hasDemoWordMismatch)
                          return (
                            <div className="space-y-2" data-testid="demo-feedback-section">
                              {fb.good.length > 0 && (
                                <div className="p-3 bg-success-50 border border-success-200 rounded-md">
                                  <p className="text-xs font-semibold text-success-700 mb-1">잘한 점</p>
                                  <ul className="text-xs text-success-700 space-y-0.5">
                                    {fb.good.map((t, i) => <li key={i}>• {t}</li>)}
                                  </ul>
                                </div>
                              )}
                              {fb.improve.length > 0 && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                                  <p className="text-xs font-semibold text-amber-700 mb-1">교정할 점</p>
                                  <ul className="text-xs text-amber-700 space-y-0.5">
                                    {fb.improve.map((t, i) => <li key={i}>• {t}</li>)}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl font-bold text-text-primary tabular-nums">
                        {pronunciationResult.normalizedScore}
                      </span>
                      <span className="text-sm text-text-muted">/ 100</span>
                      <Badge variant={getScoreVariant(pronunciationResult.normalizedScore)}>발음</Badge>
                    </div>
                    <ul className="space-y-2 mb-4">
                      {normalizePronunciationDisplay(
                        pronunciationResult.normalizedScore,
                        pronunciationResult.wordScores ?? [],
                      ).map((item) => (
                        <li key={item.key} className="flex items-center gap-3">
                          <span className="text-xs text-text-secondary w-20 shrink-0">{item.label}</span>
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
                )
              )}

            </CardBody>
          </Card>
        ) : !isDialogueMission ? (
          /* q2/q3: 학습자 친화적 평가 안내 */
          <Card>
            <CardBody>
              <p
                className="text-xs text-text-secondary"
                data-testid="pronunciation-scope-notice"
              >
                {isQ2
                  ? '이 문항은 사진의 상황과 핵심 정보를 설명하는 능력을 중심으로 평가됩니다.'
                  : isQ3
                    ? '이 문항은 들은 내용을 이해하고 질문에 맞게 답하는 능력을 중심으로 평가됩니다.'
                    : '이 문항은 말하기 능력을 중심으로 평가됩니다.'
                }
              </p>
              <p className="mt-1 text-xs text-text-muted italic">
                발음 세부 평가는 교사 검토 시 함께 확인됩니다.
              </p>
              {isQ2 && (
                <p
                  className="mt-2 text-xs text-text-muted italic"
                  data-testid="image-placeholder-result-notice"
                >
                  * 이 문항의 자료 이미지는 임시 placeholder이며 파일럿 전 교체 예정입니다.
                </p>
              )}
            </CardBody>
          </Card>
        ) : null /* q4 dialogue: 발음 카드 숨김 */}

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
            className="inline-flex items-center justify-center gap-2 font-medium transition-colors text-sm px-4 min-h-[44px] rounded-md bg-white text-text-primary hover:bg-slate-50 border border-border-strong w-full sm:w-auto"
          >
            학습 현황으로
          </Link>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href={`/student/speaking/${questionId}`}
              className="inline-flex items-center justify-center gap-2 font-medium transition-colors text-sm px-4 min-h-[44px] rounded-md bg-white text-text-primary hover:bg-slate-50 border border-border-strong w-full sm:w-auto"
            >
              다시 도전하기
            </Link>
            {nextQuestion && nextIsActive ? (
              <Link
                href={`/student/speaking/${nextQuestion.id}?setId=${set?.id ?? ''}${attemptId ? `&attemptId=${attemptId}` : ''}`}
                className="inline-flex items-center justify-center gap-2 font-medium transition-colors text-sm px-4 min-h-[44px] rounded-md bg-primary-700 text-white hover:bg-primary-800 border border-primary-700 w-full sm:w-auto"
              >
                다음 문항으로 →
              </Link>
            ) : attemptId ? (
              <Link
                href={`/student/speaking/attempt/${attemptId}`}
                className="inline-flex items-center justify-center gap-2 font-medium transition-colors text-sm px-4 min-h-[44px] rounded-md bg-primary-700 text-white hover:bg-primary-800 border border-primary-700 w-full sm:w-auto"
              >
                전체 평가 결과 보기 →
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
