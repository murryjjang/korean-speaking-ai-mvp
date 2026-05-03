import type { STTResult, LLMEvalResult, PronunciationResult } from '@/src/types/providers'

export type SpeakingEvalRecord = {
  submissionId: string
  questionId: string
  questionSetId: string
  submittedAt: string
  sttResult: STTResult
  llmEvalResult: LLMEvalResult
  pronunciationResult: PronunciationResult
}

// Module-level store — Phase 3 MVP only. Resets on server restart.
// Phase 9+에서 Supabase submissions 테이블로 교체 예정.
const evalStore = new Map<string, SpeakingEvalRecord>()

export function saveSpeakingEval(record: SpeakingEvalRecord): void {
  evalStore.set(record.submissionId, record)
}

export function getSpeakingEval(submissionId: string): SpeakingEvalRecord | undefined {
  return evalStore.get(submissionId)
}
