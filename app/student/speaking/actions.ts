'use server'

import { getSTTProvider } from '@/src/providers/stt'
import { getPronunciationProvider } from '@/src/providers/pronunciation'
import { evaluateSpeakingDetail, detailToLLMEvalResult } from '@/src/providers/llm-eval'
import { saveSpeakingEval, type SpeakingEvalRecord } from '@/src/lib/mock/speaking-store'
import { getEvaluationRepository } from '@/src/lib/repositories'
import { logProviderEvent } from '@/src/lib/supabase/provider-events'
import questionsJson from '@/src/content/questions.json'
import type { ProviderName, STTResult, PronunciationResult } from '@/src/types/providers'

export type ClientPronunciationResult = {
  normalizedScore: number
  wordScores: Array<{ word: string; score: number }>
  feedback: string
  providerName: string
  latencyMs: number
}

export interface SpeakingSubmitMeta {
  hasRecording?: boolean
  recordingDurationSec?: number
  /** Transcript from /api/stt if available; omit to use mock STT fallback. */
  sttTranscript?: string
  /** Provider name that produced sttTranscript (e.g. 'mock', 'whisper'). */
  sttProviderName?: string
  /** Supabase Storage public URL from /api/storage/upload; omit when upload failed. */
  audioUrl?: string
  /** Pronunciation result from /api/pronunciation; omit to use server-side mock fallback. */
  pronunciationResult?: ClientPronunciationResult
}

export async function submitSpeaking(
  questionId: string,
  questionSetId: string,
  meta?: SpeakingSubmitMeta,
): Promise<{ submissionId: string }> {
  // ── 1. Resolve transcript ────────────────────────────────────────────────
  let sttResult: STTResult
  if (meta?.sttTranscript !== undefined) {
    const isNoSpeech = meta.sttProviderName === 'no-speech'
    sttResult = {
      transcript: meta.sttTranscript,
      confidence: isNoSpeech ? 0 : 0.5,
      providerName: (meta.sttProviderName ?? 'mock') as ProviderName,
      providerVersion: '1.0.0',
      latencyMs: 0,
    }
  } else {
    const sttProvider = getSTTProvider()
    const mockBlob = new Blob([], { type: 'audio/webm' })
    sttResult = await sttProvider.transcribe(mockBlob)
  }

  const { transcript } = sttResult

  // ── Guard: no-speech / empty transcript — skip all AI eval ──────────────
  // Covers: no-speech from /api/stt size check, empty STT result, STT error fallback.
  // Prevents mock/hallucinated transcripts from generating ai_evaluations.
  if (sttResult.providerName === 'no-speech' || !transcript.trim()) {
    const submissionId = `mock-${questionId}-${Date.now()}`

    const noSpeechRecord: SpeakingEvalRecord = {
      submissionId,
      questionId,
      questionSetId,
      submittedAt: new Date().toISOString(),
      sttResult,
      llmEvalResult: {
        providerName: 'mock',
        providerVersion: '1.0.0',
        latencyMs: 0,
        scores: [],
        totalScore: 0,
        normalizedScore: 0,
        errorTags: [],
        feedback: '음성이 감지되지 않아 평가를 진행할 수 없습니다.',
      },
      pronunciationResult: {
        providerName: 'mock',
        providerVersion: '1.0.0',
        latencyMs: 0,
        normalizedScore: 0,
        wordScores: [],
        feedback: '음성이 감지되지 않아 발음 평가를 진행할 수 없습니다.',
      },
      audioUrl: meta?.audioUrl ?? null,
    }

    saveSpeakingEval(noSpeechRecord)
    // Supabase persistence intentionally skipped — no ai_evaluations for no-speech
    return { submissionId }
  }

  // ── 2. Resolve pronunciation result ──────────────────────────────────────
  const buildClientPronunciation = (): PronunciationResult | null => {
    const p = meta?.pronunciationResult
    if (!p) return null
    return {
      normalizedScore: p.normalizedScore,
      wordScores: p.wordScores,
      feedback: p.feedback,
      providerName: p.providerName as ProviderName,
      providerVersion: '1.0',
      latencyMs: p.latencyMs,
    }
  }

  const clientPronunciation = buildClientPronunciation()
  const pronunciationPromise: Promise<PronunciationResult> = clientPronunciation
    ? Promise.resolve(clientPronunciation)
    : getPronunciationProvider().evaluate(new Blob([], { type: 'audio/webm' }), transcript)

  // ── 3. LLM evaluation ────────────────────────────────────────────────────
  const question = questionsJson.find((q) => q.id === questionId)
  const pronunciationForEval = clientPronunciation ?? null

  const llmEvalPromise = evaluateSpeakingDetail({
    transcript,
    rubricId: question?.rubricId ?? 'rubric-speaking-01',
    questionPrompt: question?.prompt,
    questionId,
    questionType: question?.typeId,
    requiredElements: question?.requiredElements ?? [],
    pronunciationScore: pronunciationForEval?.normalizedScore,
    pronunciationFeedback: pronunciationForEval?.feedback,
  })

  const [pronunciationResult, llmEvalRaw] = await Promise.all([
    pronunciationPromise,
    llmEvalPromise,
  ])

  // ── 4. Log provider events for LLM eval ─────────────────────────────────
  const configuredProvider = process.env.LLM_EVAL_PROVIDER ?? 'mock'
  try {
    if (llmEvalRaw.status === 'success') {
      await logProviderEvent({
        provider: llmEvalRaw.providerName,
        feature: 'llm-eval',
        status: 'success',
        latencyMs: llmEvalRaw.latencyMs,
        questionId,
        model: process.env.OPENAI_EVAL_MODEL ?? 'gpt-4o-mini',
      })
    } else if (llmEvalRaw.errorMessage) {
      await logProviderEvent({
        provider: configuredProvider,
        feature: 'llm-eval',
        status: 'error',
        questionId,
        errorCode: 'provider_error',
        errorMessage: llmEvalRaw.errorMessage,
      })
      await logProviderEvent({
        provider: 'mock',
        feature: 'llm-eval',
        status: 'fallback',
        latencyMs: llmEvalRaw.latencyMs,
        questionId,
        metadata: { reason: 'provider_error', configuredProvider },
      })
    } else {
      const reason =
        configuredProvider === 'openai' && !process.env.OPENAI_API_KEY
          ? 'no_api_key'
          : 'mock_configured'
      await logProviderEvent({
        provider: 'mock',
        feature: 'llm-eval',
        status: 'fallback',
        latencyMs: llmEvalRaw.latencyMs,
        questionId,
        metadata: { reason, configuredProvider },
      })
    }
  } catch (logErr) {
    console.warn('[provider_events] llm-eval log failed:', logErr)
  }

  // ── 5. Build evaluation records ──────────────────────────────────────────
  const llmEvalResult = detailToLLMEvalResult(
    llmEvalRaw.detail,
    llmEvalRaw.providerName,
    llmEvalRaw.latencyMs,
  )

  const submissionId = `mock-${questionId}-${Date.now()}`

  const record = {
    submissionId,
    questionId,
    questionSetId,
    submittedAt: new Date().toISOString(),
    sttResult,
    llmEvalResult,
    pronunciationResult,
    speakingEvalDetail: llmEvalRaw.detail,
    audioUrl: meta?.audioUrl ?? null,
    meta: {
      hasRecording: meta?.hasRecording ?? false,
      recordingDurationSec: meta?.recordingDurationSec ?? 0,
      audioUrl: meta?.audioUrl ?? null,
    },
  }

  // Always save to mock store — result page reads from here.
  saveSpeakingEval(record)

  // Supabase persistence: only when REPOSITORY_PROVIDER=supabase.
  if (process.env.REPOSITORY_PROVIDER === 'supabase') {
    try {
      const evalRepo = getEvaluationRepository()
      await evalRepo.saveSpeakingEvalRecord(record)
    } catch (err) {
      console.error('[submitSpeaking] Supabase persistence failed:', err)
    }
  }

  return { submissionId }
}
