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

function getMockDetail(transcript: string): SpeakingEvalDetail {
  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length
  if (wordCount < 3) {
    return {
      overall_score: 15,
      task_completion_score: 10,
      fluency_score: 15,
      grammar_score: 15,
      vocabulary_score: 15,
      strengths: [],
      improvements: [
        '더 많이 말해 보세요. 짧은 문장이라도 괜찮습니다.',
        '녹음 버튼을 눌러 다시 시도해 주세요.',
      ],
      corrected_answer: '',
      teacher_note: '응답이 없거나 매우 짧음. 재시도 권장.',
      learner_feedback_ko:
        '응답이 너무 짧습니다. 다시 시도해서 더 길게 말해 보세요. 짧은 문장이라도 괜찮습니다!',
      learner_feedback_simple: '다시 해 보세요. 더 많이 말해 주세요.',
    }
  }
  const base = Math.min(75, 40 + wordCount * 2)
  return {
    overall_score: base,
    task_completion_score: Math.min(80, base + 5),
    fluency_score: Math.min(80, base - 5),
    grammar_score: Math.min(75, base - 8),
    vocabulary_score: Math.min(75, base - 3),
    pronunciation_reference_score: 72,
    strengths: [
      '기본적인 문장 구조를 사용했습니다.',
      '과제의 핵심 내용을 이해하고 있습니다.',
    ],
    improvements: [
      '조사 사용을 더 정확하게 연습해 보세요.',
      '다양한 어휘를 사용하면 좋겠습니다.',
    ],
    corrected_answer: transcript,
    teacher_note: '전반적으로 과제를 이해하고 있음. 문법과 어휘 연습 권장.',
    learner_feedback_ko:
      '전반적으로 잘 했습니다! 문법과 발음 연습을 계속하면 더 좋아질 거예요.',
    learner_feedback_simple: '잘 했어요! 계속 연습하세요.',
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
  "strengths": ["<Korean string>", ...],
  "improvements": ["<Korean string>", ...],
  "corrected_answer": "<corrected or model answer in Korean>",
  "teacher_note": "<internal note for teacher in Korean>",
  "learner_feedback_ko": "<encouraging feedback for learner in Korean, 2-3 sentences>",
  "learner_feedback_simple": "<simple 1-2 sentence feedback in very basic Korean>"
}

Scoring rubric:
- overall_score: weighted average of subscores
- task_completion_score: how well the response addresses the question (0=not addressed, 100=fully addressed)
- fluency_score: smoothness and naturalness (0=very broken, 100=very fluent)
- grammar_score: particles, endings, tense accuracy (0=many errors, 100=perfect)
- vocabulary_score: appropriateness and variety (0=very limited, 100=excellent)
- pronunciation_reference_score: use the provided pronunciation score or null if unavailable

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
    `[학생 답변 전사문]\n${input.transcript || '(응답 없음)'}`,
  ]
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

  return {
    overall_score: clamp(Number(parsed.overall_score) || 0),
    task_completion_score: clamp(Number(parsed.task_completion_score) || 0),
    fluency_score: clamp(Number(parsed.fluency_score) || 0),
    grammar_score: clamp(Number(parsed.grammar_score) || 0),
    vocabulary_score: clamp(Number(parsed.vocabulary_score) || 0),
    pronunciation_reference_score:
      parsed.pronunciation_reference_score != null
        ? clamp(Number(parsed.pronunciation_reference_score))
        : undefined,
    strengths: Array.isArray(parsed.strengths)
      ? (parsed.strengths as unknown[]).filter((s): s is string => typeof s === 'string')
      : [],
    improvements: Array.isArray(parsed.improvements)
      ? (parsed.improvements as unknown[]).filter((s): s is string => typeof s === 'string')
      : [],
    corrected_answer: typeof parsed.corrected_answer === 'string' ? parsed.corrected_answer : '',
    teacher_note: typeof parsed.teacher_note === 'string' ? parsed.teacher_note : '',
    learner_feedback_ko:
      typeof parsed.learner_feedback_ko === 'string' ? parsed.learner_feedback_ko : '',
    learner_feedback_simple:
      typeof parsed.learner_feedback_simple === 'string' ? parsed.learner_feedback_simple : '',
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
      detail: getMockDetail(input.transcript),
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
      detail: getMockDetail(input.transcript),
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
