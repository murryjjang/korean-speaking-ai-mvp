'use server'

import { getSTTProvider } from '@/src/providers/stt'
import { getPronunciationProvider } from '@/src/providers/pronunciation'
import { evaluateSpeakingDetail, detailToLLMEvalResult } from '@/src/providers/llm-eval'
import { saveSpeakingEval, type SpeakingEvalRecord } from '@/src/lib/mock/speaking-store'
import { saveAttemptSubmission } from '@/src/lib/attempt/attempt-store'
import { getEvaluationRepository } from '@/src/lib/repositories'
import { logProviderEvent } from '@/src/lib/supabase/provider-events'
import questionsJson from '@/src/content/questions.json'
import type { ProviderName, STTResult, PronunciationResult } from '@/src/types/providers'

const QUESTION_ID_ALIASES: Record<string, string> = {
  'beginner-q2-material-desc': 'beginner-q2-material-description',
  'beginner-q3-listening-resp': 'beginner-q3-listening-response',
  'intermediate-q2-material-desc': 'intermediate-q2-material-description',
  'intermediate-q3-listening-resp': 'intermediate-q3-listening-response',
  'advanced-q2-material-desc': 'advanced-q2-material-description',
  'advanced-q3-listening-resp': 'advanced-q3-listening-response',
}

function resolveId(id: string): string {
  return QUESTION_ID_ALIASES[id] ?? id
}

export type ClientPronunciationResult = {
  normalizedScore: number
  rawScore?: number
  wordScores: Array<{ word: string; score: number }>
  feedback: string
  providerName: string
  latencyMs: number
  fallbackReason?: string
  calibratedScore?: number
  calibrationVersion?: string
  calibrationStatus?: string
  calibrationNote?: string
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
  /** Attempt UUID — when present, records this submission in the attempt store. */
  attemptId?: string
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
    const submissionId = `sub-${questionId}-${Date.now()}`

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
    if (meta?.attemptId) {
      saveAttemptSubmission(meta.attemptId, questionSetId, resolveId(questionId), submissionId)
    }
    // Supabase persistence intentionally skipped — no ai_evaluations for no-speech
    return { submissionId }
  }

  // ── 2. Look up question — needed for type-aware pronunciation policy ─────────
  const question = questionsJson.find((q) => q.id === resolveId(questionId))
  // ETRI 발음평가 정책: qt-reading(q1)에만 적용. q2/q3/q4는 직접 mock 사용.
  const isReadingQuestion = question?.typeId === 'qt-reading'

  // Safe diagnostic log — no secrets, no audio content
  console.info('[submitSpeaking] start', {
    questionId,
    questionType: question?.typeId ?? 'unknown',
    questionSetId,
    attemptIdPresent: Boolean(meta?.attemptId),
    hasRecording: meta?.hasRecording ?? false,
    hasSttTranscript: meta?.sttTranscript !== undefined,
    pronunciationResultPresent: Boolean(meta?.pronunciationResult),
    isReadingQuestion,
  })

  // ── 3. Resolve pronunciation result ──────────────────────────────────────────
  // q2/q3/q4: 클라이언트에서 pronunciationResult를 보내지 않으므로 mock 직접 사용.
  // q1(qt-reading): 클라이언트 제공 결과 우선. 없으면 서버 provider 호출 (catch로 crash 방지).
  const buildClientPronunciation = (): PronunciationResult | null => {
    const p = meta?.pronunciationResult
    if (!p) return null
    return {
      normalizedScore: p.normalizedScore,
      rawScore: p.rawScore,
      wordScores: p.wordScores,
      feedback: p.feedback,
      providerName: p.providerName as ProviderName,
      providerVersion: '1.0',
      latencyMs: p.latencyMs,
      fallbackReason: p.fallbackReason,
      calibratedScore: p.calibratedScore,
      calibrationVersion: p.calibrationVersion,
      calibrationStatus: p.calibrationStatus as PronunciationResult['calibrationStatus'],
      calibrationNote: p.calibrationNote,
    }
  }

  const clientPronunciation = buildClientPronunciation()
  const pronunciationPromise: Promise<PronunciationResult> = clientPronunciation
    ? Promise.resolve(clientPronunciation)
    : isReadingQuestion
      ? getPronunciationProvider()
          .evaluate(new Blob([], { type: 'audio/webm' }), transcript)
          .catch((err: unknown): PronunciationResult => {
            const msg = err instanceof Error ? err.message : String(err)
            const code = msg.startsWith('etri_') ? msg.split(':')[0] : 'pronunciation_error'
            console.warn('[submitSpeaking] pronunciation provider fallback', { questionId, errorCode: code })
            return {
              normalizedScore: 0,
              wordScores: [],
              feedback: '발음평가 서비스에 연결하지 못했습니다.',
              providerName: 'etri',
              providerVersion: '1.0',
              latencyMs: 0,
              fallbackReason: code,
            }
          })
      : Promise.resolve<PronunciationResult>({
          normalizedScore: 0,
          wordScores: [],
          feedback: '자유발화 문항에서는 발음평가 API가 별도 적용되지 않습니다.',
          providerName: 'mock',
          providerVersion: '1.0.0',
          latencyMs: 0,
        })

  // ── 4. LLM evaluation ────────────────────────────────────────────────────────
  const pronunciationForEval = clientPronunciation ?? null

  const llmEvalPromise = evaluateSpeakingDetail({
    transcript,
    rubricId: question?.rubricId ?? 'rubric-speaking-01',
    questionPrompt: question?.prompt,
    questionId,
    questionType: question?.typeId,
    requiredElements: question?.requiredElements ?? [],
    requiredElementAliases: (question as { requiredElementAliases?: Record<string, string[]> })?.requiredElementAliases,
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

  const submissionId = `sub-${questionId}-${Date.now()}`

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

  if (meta?.attemptId) {
    saveAttemptSubmission(meta.attemptId, questionSetId, resolveId(questionId), submissionId)
  }

  // Supabase persistence: only when REPOSITORY_PROVIDER=supabase.
  if (process.env.REPOSITORY_PROVIDER === 'supabase') {
    try {
      const evalRepo = getEvaluationRepository()
      await evalRepo.saveSpeakingEvalRecord(record)
    } catch (err) {
      console.error('[submitSpeaking] Supabase persistence failed:', err)
    }
  }

  console.info('[submitSpeaking] success', {
    questionId,
    questionType: question?.typeId ?? 'unknown',
    submissionId,
    attemptIdPresent: Boolean(meta?.attemptId),
    pronunciationProvider: record.pronunciationResult.providerName,
    pronunciationFallbackReason: record.pronunciationResult.fallbackReason ?? null,
    llmEvalProvider: record.llmEvalResult.providerName,
    resultUrl: `/student/speaking/${questionId}/result?sub=${submissionId}${meta?.attemptId ? `&attemptId=${meta.attemptId}` : ''}`,
  })

  return { submissionId }
}
