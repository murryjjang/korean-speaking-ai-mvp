'use server'

import { getSTTProvider } from '@/src/providers/stt'
import { getLLMEvalProvider } from '@/src/providers/llm-eval'
import { getPronunciationProvider } from '@/src/providers/pronunciation'
import { saveSpeakingEval } from '@/src/lib/mock/speaking-store'
import { getEvaluationRepository } from '@/src/lib/repositories'
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
  const llmProvider = getLLMEvalProvider()

  // Use client-provided transcript when available (from /api/stt).
  // Fall back to mock STT when no recording was sent or STT failed.
  let sttResult: STTResult
  if (meta?.sttTranscript !== undefined) {
    sttResult = {
      transcript: meta.sttTranscript,
      confidence: 0.5,
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

  // Build PronunciationResult from client-provided data when available (real audio via /api/pronunciation).
  // Fall back to server-side provider (mock unless PRONUNCIATION_PROVIDER=etri) otherwise.
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

  const [pronunciationResult, llmEvalResult] = await Promise.all([
    pronunciationPromise,
    llmProvider.evaluate(transcript, 'rubric-speaking-01'),
  ])

  const submissionId = `mock-${questionId}-${Date.now()}`

  const record = {
    submissionId,
    questionId,
    questionSetId,
    submittedAt: new Date().toISOString(),
    sttResult,
    llmEvalResult,
    pronunciationResult,
    audioUrl: meta?.audioUrl ?? null,
    meta: {
      hasRecording: meta?.hasRecording ?? false,
      recordingDurationSec: meta?.recordingDurationSec ?? 0,
      audioUrl: meta?.audioUrl ?? null,
    },
  }

  // Always save to mock store — result page reads from here regardless of provider.
  saveSpeakingEval(record)

  // Supabase persistence: only when REPOSITORY_PROVIDER=supabase.
  // Failure does NOT block the result page (mock store is the fallback).
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
