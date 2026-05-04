'use server'

import { getSTTProvider } from '@/src/providers/stt'
import { getLLMEvalProvider } from '@/src/providers/llm-eval'
import { getPronunciationProvider } from '@/src/providers/pronunciation'
import { saveSpeakingEval } from '@/src/lib/mock/speaking-store'
import { getEvaluationRepository } from '@/src/lib/repositories'

export async function submitSpeaking(
  questionId: string,
  questionSetId: string,
): Promise<{ submissionId: string }> {
  const sttProvider = getSTTProvider()
  const llmProvider = getLLMEvalProvider()
  const pronunciationProvider = getPronunciationProvider()

  const mockBlob = new Blob([], { type: 'audio/webm' })
  const mockTranscript = '안녕하세요. 저는 한국어를 배우고 있습니다. 잘 부탁드립니다.'

  const [sttResult, pronunciationResult, llmEvalResult] = await Promise.all([
    sttProvider.transcribe(mockBlob),
    pronunciationProvider.evaluate(mockBlob, mockTranscript),
    llmProvider.evaluate(mockTranscript, 'rubric-speaking-01'),
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
