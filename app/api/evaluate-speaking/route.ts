import { evaluateSpeakingDetail } from '@/src/providers/llm-eval'
import { logProviderEvent } from '@/src/lib/supabase/provider-events'
import { buildPronunciationContext, buildSpeechFlowContext } from '@/src/lib/pronunciation-context'
import questionsJson from '@/src/content/questions.json'
import type { PronunciationResult } from '@/src/types/providers'

export async function POST(request: Request) {
  let body: {
    questionId?: string
    transcript?: string
    pronunciationResult?: {
      normalizedScore: number
      feedback?: string
      accuracyScore?: number | null
      fluencyScore?: number | null
      completenessScore?: number | null
      wordResults?: Array<{
        word: string
        accuracyScore: number
        errorType?: string
        offsetMs?: number
        durationMs?: number
      }>
    }
    referenceText?: string
    rubricId?: string
  }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  const {
    questionId,
    transcript = '',
    pronunciationResult,
    referenceText,
    rubricId: bodyRubricId,
  } = body

  // Resolve question metadata from content store when questionId is provided
  const question = questionId ? questionsJson.find((q) => q.id === questionId) : undefined
  const rubricId = bodyRubricId ?? question?.rubricId ?? 'rubric-speaking-01'

  const configuredProvider = process.env.LLM_EVAL_PROVIDER ?? 'mock'

  // v1.1 단계 19.13 [페이즈 1·2]: Azure wordResults·timing → LLM 컨텍스트 변환.
  const pronunciationForCtx: PronunciationResult | null = pronunciationResult
    ? ({
        normalizedScore: pronunciationResult.normalizedScore,
        wordScores: [],
        feedback: pronunciationResult.feedback ?? '',
        providerName: 'azure',
        providerVersion: '1.0',
        latencyMs: 0,
        accuracyScore: pronunciationResult.accuracyScore ?? undefined,
        fluencyScore: pronunciationResult.fluencyScore ?? undefined,
        completenessScore: pronunciationResult.completenessScore ?? undefined,
        wordResults: pronunciationResult.wordResults as PronunciationResult['wordResults'],
      } as PronunciationResult)
    : null

  const result = await evaluateSpeakingDetail({
    transcript,
    rubricId,
    questionPrompt: referenceText ?? question?.prompt,
    questionId,
    questionType: question?.typeId,
    requiredElements: question?.requiredElements ?? [],
    requiredElementAliases: (question as { requiredElementAliases?: Record<string, string[]> })?.requiredElementAliases,
    pronunciationScore: pronunciationResult?.normalizedScore,
    pronunciationFeedback: pronunciationResult?.feedback,
    pronunciationContext: buildPronunciationContext(pronunciationForCtx),
    speechFlowContext: buildSpeechFlowContext(pronunciationForCtx),
  })

  // Log provider events
  try {
    if (result.status === 'success') {
      await logProviderEvent({
        provider: result.providerName,
        feature: 'llm-eval',
        status: 'success',
        latencyMs: result.latencyMs,
        questionId: questionId ?? null,
        model: process.env.OPENAI_EVAL_MODEL ?? 'gpt-4o-mini',
      })
      console.info(
        '[provider_events] llm-eval.success provider=%s latency=%dms',
        result.providerName,
        result.latencyMs,
      )
    } else if (result.errorMessage) {
      // OpenAI was configured but failed
      await logProviderEvent({
        provider: configuredProvider,
        feature: 'llm-eval',
        status: 'error',
        questionId: questionId ?? null,
        errorCode: 'provider_error',
        errorMessage: result.errorMessage,
      })
      await logProviderEvent({
        provider: 'mock',
        feature: 'llm-eval',
        status: 'fallback',
        latencyMs: result.latencyMs,
        questionId: questionId ?? null,
        metadata: { reason: 'provider_error', configuredProvider },
      })
      console.warn(
        '[provider_events] llm-eval.error + fallback provider=%s error=%s',
        configuredProvider,
        result.errorMessage,
      )
    } else {
      // No API key or mock configured
      const reason =
        configuredProvider === 'openai' && !process.env.OPENAI_API_KEY
          ? 'no_api_key'
          : 'mock_configured'
      await logProviderEvent({
        provider: 'mock',
        feature: 'llm-eval',
        status: 'fallback',
        latencyMs: result.latencyMs,
        questionId: questionId ?? null,
        metadata: { reason, configuredProvider },
      })
      console.info(
        '[provider_events] llm-eval.fallback reason=%s latency=%dms',
        reason,
        result.latencyMs,
      )
    }
  } catch (logErr) {
    console.warn('[provider_events] llm-eval log failed:', logErr)
  }

  return Response.json({
    ...result.detail,
    providerName: result.providerName,
    latencyMs: result.latencyMs,
    status: result.status,
  })
}
