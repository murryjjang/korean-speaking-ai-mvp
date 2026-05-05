import type {
  LLMEvalProvider,
  LLMEvalResult,
  ProviderName,
  SpeakingEvalInput,
  SpeakingEvalDetail,
} from '@/src/types/providers'

// ── Score helpers ─────────────────────────────────────────────────────────────

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

function toRubricScore(score: number): number {
  return Math.round(clamp(score) * 20 / 100)
}

function rubricRationale(score: number, high: string, mid: string, low: string): string {
  if (score >= 75) return high
  if (score >= 50) return mid
  return low
}

/** Convert SpeakingEvalDetail → LLMEvalResult for backward compat with result page. */
export function detailToLLMEvalResult(
  detail: SpeakingEvalDetail,
  providerName: string,
  latencyMs: number,
): LLMEvalResult {
  return {
    scores: [
      {
        rubricItemId: 'ri-pronunciation',
        score: toRubricScore(detail.pronunciation_reference_score ?? detail.fluency_score),
        rationale: rubricRationale(
          detail.pronunciation_reference_score ?? detail.fluency_score,
          '발음이 정확하고 명확합니다.',
          '발음이 전반적으로 양호합니다.',
          '발음 정확도 향상이 필요합니다.',
        ),
      },
      {
        rubricItemId: 'ri-fluency',
        score: toRubricScore(detail.fluency_score),
        rationale: rubricRationale(
          detail.fluency_score,
          '자연스럽고 유창하게 말했습니다.',
          '전반적으로 유창하나 일부 멈춤이 있습니다.',
          '유창성 향상을 위해 더 많은 연습이 필요합니다.',
        ),
      },
      {
        rubricItemId: 'ri-vocabulary',
        score: toRubricScore(detail.vocabulary_score),
        rationale: rubricRationale(
          detail.vocabulary_score,
          '다양하고 적절한 어휘를 잘 사용했습니다.',
          '기본 어휘를 적절히 사용했습니다.',
          '어휘 다양성을 높이면 좋겠습니다.',
        ),
      },
      {
        rubricItemId: 'ri-grammar',
        score: toRubricScore(detail.grammar_score),
        rationale: rubricRationale(
          detail.grammar_score,
          '문법적으로 정확하게 말했습니다.',
          '문법이 대체로 정확하나 일부 오류가 있습니다.',
          '조사, 어미, 시제 사용에 주의가 필요합니다.',
        ),
      },
      {
        rubricItemId: 'ri-task',
        score: toRubricScore(detail.task_completion_score),
        rationale: rubricRationale(
          detail.task_completion_score,
          '과제 지시를 잘 이해하고 핵심 내용을 충실히 포함했습니다.',
          '과제 지시를 대체로 이해하고 주요 내용을 포함했습니다.',
          '과제 내용을 더 충실히 반영하면 좋겠습니다.',
        ),
      },
    ],
    totalScore: detail.overall_score,
    normalizedScore: detail.overall_score,
    errorTags: detail.improvements.slice(0, 3).map((imp) => ({
      type: 'grammar',
      count: 1,
      examples: [imp],
    })),
    feedback: detail.learner_feedback_ko,
    providerName: providerName as ProviderName,
    providerVersion: '1.0.0',
    latencyMs,
  }
}

// ── Mock detail ───────────────────────────────────────────────────────────────

// Model answers by question ID — used in mock fallback, never derived from transcript
const MOCK_MODEL_ANSWERS: Record<string, string> = {
  'q-001': '안녕하세요. 저는 김민수입니다. 저는 베트남에서 왔습니다. 한국어를 배우는 이유는 한국 사람들과 더 잘 이야기하고 싶기 때문입니다.',
  'q-002': '안녕하세요. 저는 린입니다. 베트남에서 왔어요. 한국에 온 지 1년이 됐는데 한국 생활이 즐겁습니다. 특히 한국 음식이 맛있어서 자주 식당에 갑니다.',
  'q-003': '이 그림은 공원에서 사람들이 운동하는 모습입니다. 한 사람은 자전거를 타고 있고, 다른 사람들은 달리기하거나 스트레칭을 하고 있습니다. 날씨가 맑고 분위기가 밝습니다.',
  'q-004': '왼쪽 그림은 평일 거리이고 오른쪽은 주말 거리입니다. 평일에는 사람들이 바쁘게 다니고, 주말에는 여유롭게 걷거나 쇼핑을 합니다. 두 그림의 분위기가 많이 다릅니다.',
  'q-005': '지금 커피숍 앞에 계시죠? 거기서 오른쪽으로 가서 첫 번째 신호등에서 왼쪽으로 돌아주세요. 약국이 보이면 바로 옆이 약속 장소입니다.',
  'q-006': '안녕하세요. 저는 305호 투숙객인데요, 방 에어컨이 작동하지 않습니다. 오늘 많이 더워서 불편합니다. 수리해 주시거나 다른 방으로 옮길 수 있을까요?',
  'q-007': '저는 삼겹살을 추천합니다. 삼겹살은 돼지고기를 불에 직접 구워 먹는 음식인데, 상추에 싸서 마늘과 같이 먹으면 정말 맛있습니다. 한국의 대표적인 음식 중 하나예요.',
  'q-008': '저는 플라스틱 오염이 가장 심각한 환경 문제라고 생각합니다. 바다에 버려지는 플라스틱이 해양 생물에게 큰 피해를 줍니다. 해결을 위해 일회용품 사용을 줄이고 재활용을 생활화해야 합니다.',
}

// Default model answers by question type when specific question ID is not matched
const MOCK_MODEL_ANSWERS_BY_TYPE: Record<string, string> = {
  'qt-self-intro': '안녕하세요. 저는 [이름]입니다. [나라]에서 왔습니다. 한국어를 배우는 이유는 한국 문화를 더 잘 이해하고 싶기 때문입니다.',
  'qt-picture': '이 그림에는 여러 사람들이 있습니다. 각자 다른 활동을 하고 있고 배경이 잘 묘사되어 있습니다. 분위기가 밝고 활기차 보입니다.',
  'qt-situation': '안녕하세요. 지금 말씀하신 상황에 대해 설명하겠습니다. 먼저 [행동1]을 하시고, 그 다음 [행동2]를 하시면 됩니다. 어렵지 않으니 천천히 해 보세요.',
  'qt-opinion': '저는 이 주제에 대해 [의견]을 가지고 있습니다. 왜냐하면 [이유1]이기 때문입니다. 그래서 [결론]이 필요하다고 생각합니다.',
}

// Keyword-based element detection for mock fallback
// Returns { found: string[], missing: string[] }
function detectRequiredElements(
  transcript: string,
  requiredElements: string[],
): { found: string[]; missing: string[] } {
  if (!requiredElements.length) return { found: [], missing: [] }
  const t = transcript.toLowerCase()

  const elementKeywords: Record<string, string[]> = {
    // q-001 / q-002
    '이름 언급': ['저는', '제 이름은', '이름이', '이라고 합니다', '입니다'],
    '출신 나라 언급': ['에서 왔', '나라', '국적', '베트남', '중국', '일본', '미국', '영국', '태국', '인도네시아', '필리핀', '몽골', '우즈베키스탄', '카자흐스탄', '러시아'],
    '한국어 학습 이유 설명': ['배우는 이유', '공부하는 이유', '때문', '싶어서', '좋아서', '필요해서', '원해서', '이유는'],
    '한국 생활 또는 경험 한 가지 이상': ['한국에서', '한국 생활', '경험', '살면서', '지내면서', '왔는데', '왔어요'],
    // q-003
    '그림 속 장소 또는 배경 언급': ['공원', '그림', '사진', '밖에', '야외', '운동장', '장소', '배경', '거기'],
    '인물의 행동 묘사 (최소 1가지)': ['달리기', '자전거', '운동', '스트레칭', '걷고', '뛰고', '하고 있', '하는', '하고 있습니다', '사람들'],
    '세부 묘사 (사물·날씨·분위기 등)': ['날씨', '분위기', '밝', '맑', '따뜻', '나무', '하늘', '풀', '보입니다', '보여요'],
    // q-004
    '두 그림의 공통점 또는 차이 언급': ['비교', '다르', '같은', '반면', '하지만', '차이', '왼쪽', '오른쪽', '첫 번째', '두 번째'],
    '각 그림 상황 또는 분위기 묘사': ['평일', '주말', '거리', '사람들', '도시', '한가', '바쁘', '여유'],
    '비교 표현 사용': ['반면', '하지만', '그에 비해', '더', '덜', '반대로', '차이가'],
    // q-005
    '현재 위치 또는 출발점 언급': ['지금', '현재', '있는', '위치', '거기서', '여기서', '출발'],
    '방향 안내 (최소 2단계)': ['오른쪽', '왼쪽', '직진', '앞으로', '뒤로', '돌아', '건너', '걸어가'],
    '목적지 도착 안내': ['도착', '약속 장소', '거기', '찾을 수', '보입니다', '있어요', '됩니다'],
    // q-006
    '불편 사항 구체적 설명': ['불편', '문제', '작동하지', '고장', '안 돼', '않습니다', '이상'],
    '문제 상황 또는 원인 묘사': ['때문에', '그래서', '더워서', '추워서', '시끄러워서', '상황', '원인'],
    '해결 요청 또는 대안 제시': ['부탁', '요청', '고쳐', '수리', '바꿔', '교체', '옮겨', '해 주세요', '해 주실 수'],
    // q-007
    '음식 이름 언급': ['삼겹살', '김치', '불고기', '비빔밥', '떡볶이', '냉면', '갈비', '순두부', '한국 음식', '음식은', '먹어보'],
    '추천 이유 (최소 1가지)': ['맛있', '건강', '이유', '때문', '좋아서', '추천', '왜냐하면'],
    '음식 특징 또는 먹는 방법 설명': ['싸서', '구워', '먹는', '방법', '특징', '재료', '양념', '곁들'],
    // q-008
    '환경 문제 종류 명시': ['환경', '오염', '기후', '쓰레기', '플라스틱', '탄소', '미세먼지', '온난화', '생태계'],
    '문제의 심각성 또는 원인 설명': ['심각', '피해', '때문', '원인', '영향', '위험', '줍니다', '있습니다'],
    '구체적 해결 방법 또는 의견 제시': ['해결', '줄이', '재활용', '바꿔야', '해야', '생각합니다', '필요', '방법'],
  }

  const found: string[] = []
  const missing: string[] = []

  for (const el of requiredElements) {
    const keywords = elementKeywords[el] ?? []
    const matched = keywords.length === 0
      ? false
      : keywords.some((kw) => t.includes(kw))
    if (matched) {
      found.push(el)
    } else {
      missing.push(el)
    }
  }

  return { found, missing }
}

// Extract brief evidence phrases from transcript (mock)
function extractMockEvidence(transcript: string, found: string[]): string[] {
  if (!transcript.trim() || found.length === 0) return []
  const sentences = transcript.split(/[.!?。]+/).map((s) => s.trim()).filter(Boolean)
  return sentences.slice(0, 2).map((s) => s.length > 40 ? s.slice(0, 40) + '…' : s)
}

// Off-task detection: returns true if transcript is unrelated to the expected question domain
function isLikelyOffTask(transcript: string, requiredElements: string[], found: string[]): boolean {
  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length
  if (wordCount < 5) return false // Too short to judge
  // Off-task patterns (news anchors, test speech, foreign-language content, etc.)
  const offTaskPatterns = [/뉴스|앵커|기자|보도|리포트|이덕영|이덕/]
  if (offTaskPatterns.some((p) => p.test(transcript))) return true
  // If required elements exist and NONE were found, likely off-task
  if (requiredElements.length >= 2 && found.length === 0) return true
  return false
}

function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 65) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

function getMockDetail(input: SpeakingEvalInput): SpeakingEvalDetail {
  const transcript = input.transcript
  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length
  const requiredElements = input.requiredElements ?? []

  if (wordCount < 3) {
    return {
      overall_score: 15,
      task_completion_score: 10,
      fluency_score: 15,
      grammar_score: 15,
      vocabulary_score: 15,
      grade: 'F',
      strengths: [],
      improvements: [
        '더 많이 말해 보세요. 짧은 문장이라도 괜찮습니다.',
        '녹음 버튼을 눌러 다시 시도해 주세요.',
      ],
      corrected_answer: MOCK_MODEL_ANSWERS[input.questionId ?? ''] ?? MOCK_MODEL_ANSWERS_BY_TYPE[input.questionType ?? ''] ?? '',
      teacher_note: '응답이 없거나 매우 짧음. 재시도 권장.',
      learner_feedback_ko:
        '응답이 너무 짧습니다. 다시 시도해서 더 길게 말해 보세요. 짧은 문장이라도 괜찮습니다!',
      learner_feedback_simple: '다시 해 보세요. 더 많이 말해 주세요.',
      required_elements_found: [],
      missing_elements: requiredElements,
      evidence: [],
      needs_teacher_review: false,
    }
  }

  const { found, missing } = detectRequiredElements(transcript, requiredElements)
  const offTask = isLikelyOffTask(transcript, requiredElements, found)
  const evidence = extractMockEvidence(transcript, found)

  if (offTask) {
    const offTaskStrengths = wordCount >= 5
      ? ['문장 형태로 발화하려고 시도했습니다.']
      : []
    const offTaskImprovements = input.questionType === 'qt-picture'
      ? [
          '주어진 그림과 관련 없는 내용입니다.',
          '그림 속 장소, 인물의 행동, 배경을 설명해 주세요.',
        ]
      : [
          '주어진 질문과 관련 없는 내용입니다.',
          '과제의 지시 사항을 다시 읽고 시도해 보세요.',
        ]
    return {
      overall_score: 15,
      task_completion_score: 8,
      fluency_score: Math.min(50, 20 + wordCount),
      grammar_score: Math.min(50, 20 + wordCount),
      vocabulary_score: Math.min(40, 15 + wordCount),
      grade: 'F',
      strengths: offTaskStrengths,
      improvements: offTaskImprovements,
      corrected_answer: MOCK_MODEL_ANSWERS[input.questionId ?? ''] ?? MOCK_MODEL_ANSWERS_BY_TYPE[input.questionType ?? ''] ?? '',
      teacher_note: '과제와 무관한 내용을 발화함. 교수자 확인 필요.',
      learner_feedback_ko: '질문에서 요청한 내용과 다른 이야기를 한 것 같습니다. 문제를 다시 읽고 다시 시도해 보세요.',
      learner_feedback_simple: '질문을 다시 읽어 보세요. 다시 해 봐요.',
      required_elements_found: found,
      missing_elements: missing,
      evidence: [],
      needs_teacher_review: true,
    }
  }

  const base = Math.min(75, 40 + wordCount * 2)
  // Adjust task_completion based on how many required elements were found
  const elementRatio = requiredElements.length > 0
    ? found.length / requiredElements.length
    : 1
  const taskScore = Math.round(Math.min(85, base + 5) * elementRatio)
  const overall = Math.round((taskScore + base) / 2)

  return {
    overall_score: overall,
    task_completion_score: taskScore,
    fluency_score: Math.min(80, base - 5),
    grammar_score: Math.min(75, base - 8),
    vocabulary_score: Math.min(75, base - 3),
    pronunciation_reference_score: 72,
    grade: scoreToGrade(overall),
    strengths: found.length > 0
      ? [`"${found[0]}"을(를) 잘 포함했습니다.`, '기본적인 문장 구조를 사용했습니다.']
      : ['기본적인 문장 구조를 사용했습니다.'],
    improvements: missing.length > 0
      ? [`"${missing[0]}"을(를) 포함하면 더 좋겠습니다.`, '다양한 어휘를 사용해 보세요.']
      : ['더 다양한 어휘를 사용해 보세요.', '문법적 정확도를 높이면 좋겠습니다.'],
    corrected_answer: MOCK_MODEL_ANSWERS[input.questionId ?? ''] ?? MOCK_MODEL_ANSWERS_BY_TYPE[input.questionType ?? ''] ?? '',
    teacher_note: `필수 요소 ${found.length}/${requiredElements.length} 확인됨. 문법과 어휘 연습 권장.`,
    learner_feedback_ko:
      overall >= 60
        ? '잘 했습니다! 조금 더 연습하면 더욱 좋아질 거예요.'
        : '열심히 시도했습니다. 빠진 내용을 보충하여 다시 시도해 보세요.',
    learner_feedback_simple: overall >= 60 ? '잘 했어요! 계속 연습하세요.' : '다시 해 봐요. 조금 더 말해 주세요.',
    required_elements_found: found,
    missing_elements: missing,
    evidence,
    needs_teacher_review: overall < 30 || taskScore < 20,
  }
}

// ── OpenAI provider ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert Korean language assessment specialist evaluating a learner's speaking response.

The learner is a beginner to intermediate Korean language learner. Be fair, accurate, and encouraging but not overly lenient.

Respond ONLY with a valid JSON object — no markdown, no explanation, no code blocks. Use exactly this schema:

{
  "overall_score": <integer 0-100>,
  "task_completion_score": <integer 0-100>,
  "fluency_score": <integer 0-100>,
  "grammar_score": <integer 0-100>,
  "vocabulary_score": <integer 0-100>,
  "pronunciation_reference_score": <integer 0-100 or null>,
  "grade": "<A|B|C|D|F>",
  "strengths": ["<Korean string>", ...],
  "improvements": ["<Korean string>", ...],
  "required_elements_found": ["<element from [필수 포함 요소] that appears in the response>", ...],
  "missing_elements": ["<element from [필수 포함 요소] that is absent from the response>", ...],
  "evidence": ["<direct short quote from transcript supporting evaluation, max 40 chars each>", ...],
  "corrected_answer": "<ideal model answer in Korean — write this INDEPENDENTLY, do NOT copy or paraphrase the learner's transcript>",
  "teacher_note": "<internal note for teacher in Korean>",
  "learner_feedback_ko": "<encouraging feedback for learner in Korean, 2-3 sentences>",
  "learner_feedback_simple": "<simple 1-2 sentence feedback in very basic Korean>",
  "needs_teacher_review": <boolean>
}

Scoring rubric:
- overall_score: weighted average of subscores
- task_completion_score: how well the response addresses the question (0=not addressed, 100=fully addressed)
- fluency_score: smoothness and naturalness (0=very broken, 100=very fluent)
- grammar_score: particles, endings, tense accuracy (0=many errors, 100=perfect)
- vocabulary_score: appropriateness and variety (0=very limited, 100=excellent)
- pronunciation_reference_score: use the provided pronunciation score or null if unavailable

grade: A(≥90), B(≥80), C(≥65), D(≥50), F(<50)

CRITICAL rules:
1. corrected_answer MUST be an ideal model answer written independently for this question. It must NEVER copy, quote, or paraphrase the learner's transcript. If no good model answer can be generated, return "".
2. If the learner's transcript is unrelated to the question (e.g., reads a news script, recites unrelated text, or speaks about a completely different topic), set task_completion_score ≤ 10, needs_teacher_review: true, and list all required elements in missing_elements.
3. required_elements_found / missing_elements must exactly use the element labels provided in [필수 포함 요소]. Do not invent new labels.
4. evidence: 1-3 short direct quotes (≤40 chars each) from the transcript that support key scores. Return [] if transcript is empty.
5. needs_teacher_review: true if overall_score < 30, task_completion_score < 20, or response is off-topic.
6. If task_completion_score ≤ 10 (off-task response): strengths must be [] or at most 1 item. If the learner produced ≥5 words, you MAY include "문장 형태로 발화하려고 시도했습니다." NEVER include phrases that imply the task was addressed, such as "기본적인 문장 구조를 사용했습니다", "문법적으로 안정적입니다", "자연스럽게 말했습니다", "어휘를 잘 사용했습니다", or any phrase suggesting the content was relevant.
7. If task_completion_score ≤ 10, improvements[0] MUST explicitly state the response was unrelated to the question (e.g., "주어진 그림과 관련 없는 내용입니다." for picture questions, or "주어진 질문과 관련 없는 내용입니다." for others). improvements[1] MUST provide specific guidance on what was required, referencing [필수 포함 요소] (e.g., for a picture description question: "그림 속 장소, 인물의 행동, 배경을 설명해 주세요.").

If transcript is empty or fewer than 5 words: set all scores to 20 or below and ask learner to try again.
Strengths: 1-3 items in Korean. Improvements: 1-3 actionable suggestions in Korean.`

async function callOpenAI(
  input: SpeakingEvalInput,
  apiKey: string,
  model: string,
): Promise<SpeakingEvalDetail> {
  const { OpenAI } = await import('openai')
  const client = new OpenAI({ apiKey })

  const parts: string[] = [
    `[질문 프롬프트]\n${input.questionPrompt ?? '(없음)'}`,
  ]
  if (input.requiredElements && input.requiredElements.length > 0) {
    parts.push(`[필수 포함 요소]\n${input.requiredElements.join('\n')}`)
  }
  parts.push(`[학생 답변 전사문]\n${input.transcript || '(응답 없음)'}`)
  if (input.pronunciationScore !== undefined) {
    parts.push(
      `[발음 평가 참고] 점수: ${input.pronunciationScore}/100` +
        (input.pronunciationFeedback ? ` / 피드백: ${input.pronunciationFeedback}` : ''),
    )
  }

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: parts.join('\n\n') },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 1024,
  })

  const raw = response.choices[0]?.message?.content ?? ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed = JSON.parse(raw) as Record<string, any>

  const overallScore = clamp(Number(parsed.overall_score) || 0)
  const toStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? (v as unknown[]).filter((s): s is string => typeof s === 'string') : []

  return {
    overall_score: overallScore,
    task_completion_score: clamp(Number(parsed.task_completion_score) || 0),
    fluency_score: clamp(Number(parsed.fluency_score) || 0),
    grammar_score: clamp(Number(parsed.grammar_score) || 0),
    vocabulary_score: clamp(Number(parsed.vocabulary_score) || 0),
    pronunciation_reference_score:
      parsed.pronunciation_reference_score != null
        ? clamp(Number(parsed.pronunciation_reference_score))
        : undefined,
    grade: (['A', 'B', 'C', 'D', 'F'] as const).includes(parsed.grade)
      ? (parsed.grade as 'A' | 'B' | 'C' | 'D' | 'F')
      : scoreToGrade(overallScore),
    strengths: toStringArray(parsed.strengths),
    improvements: toStringArray(parsed.improvements),
    required_elements_found: toStringArray(parsed.required_elements_found),
    missing_elements: toStringArray(parsed.missing_elements),
    evidence: toStringArray(parsed.evidence),
    corrected_answer: typeof parsed.corrected_answer === 'string' ? parsed.corrected_answer : '',
    teacher_note: typeof parsed.teacher_note === 'string' ? parsed.teacher_note : '',
    learner_feedback_ko:
      typeof parsed.learner_feedback_ko === 'string' ? parsed.learner_feedback_ko : '',
    learner_feedback_simple:
      typeof parsed.learner_feedback_simple === 'string' ? parsed.learner_feedback_simple : '',
    needs_teacher_review: typeof parsed.needs_teacher_review === 'boolean'
      ? parsed.needs_teacher_review
      : overallScore < 30,
    raw_provider: { model, usage: response.usage },
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export type EvaluateSpeakingResult = {
  detail: SpeakingEvalDetail
  providerName: string
  latencyMs: number
  status: 'success' | 'fallback'
  errorMessage?: string
}

/**
 * Evaluates a speaking transcript using OpenAI when configured; falls back to
 * mock otherwise. Never throws — errors produce a mock-fallback result.
 */
export async function evaluateSpeakingDetail(
  input: SpeakingEvalInput,
): Promise<EvaluateSpeakingResult> {
  const apiKey = process.env.OPENAI_API_KEY
  const provider = process.env.LLM_EVAL_PROVIDER ?? 'mock'
  const model = process.env.OPENAI_EVAL_MODEL ?? 'gpt-4o-mini'

  if (provider !== 'openai' || !apiKey) {
    await new Promise((resolve) => setTimeout(resolve, 600))
    return {
      detail: getMockDetail(input),
      providerName: 'mock',
      latencyMs: 600,
      status: 'fallback',
    }
  }

  const start = Date.now()
  try {
    const detail = await callOpenAI(input, apiKey, model)
    return { detail, providerName: 'openai', latencyMs: Date.now() - start, status: 'success' }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('[llm-eval] OpenAI call failed, using mock fallback:', errorMessage)
    return {
      detail: getMockDetail(input),
      providerName: 'mock',
      latencyMs: Date.now() - start,
      status: 'fallback',
      errorMessage,
    }
  }
}

// ── Backward-compat getLLMEvalProvider ────────────────────────────────────────

class WrappedLLMEvalProvider implements LLMEvalProvider {
  async evaluate(transcript: string, rubricId: string): Promise<LLMEvalResult> {
    const { detail, providerName, latencyMs } = await evaluateSpeakingDetail({
      transcript,
      rubricId,
    })
    return detailToLLMEvalResult(detail, providerName, latencyMs)
  }
}

export function getLLMEvalProvider(): LLMEvalProvider {
  return new WrappedLLMEvalProvider()
}
