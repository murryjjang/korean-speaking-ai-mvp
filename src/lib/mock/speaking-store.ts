import type { STTResult, LLMEvalResult, PronunciationResult, SpeakingEvalDetail } from '@/src/types/providers'

export type SpeakingEvalRecord = {
  submissionId: string
  questionId: string
  questionSetId: string
  submittedAt: string
  sttResult: STTResult
  llmEvalResult: LLMEvalResult
  pronunciationResult: PronunciationResult
  /** Supabase Storage public URL or null when upload was skipped/failed (Phase 8-C+). */
  audioUrl?: string | null
  /** Rich LLM evaluation detail (Phase 8-G+). Undefined when only mock LLM is used. */
  speakingEvalDetail?: SpeakingEvalDetail
  /** Dialogue mission metadata — populated by dialogue-actions.ts. */
  meta?: {
    hasRecording?: boolean
    recordingDurationSec?: number
    dialogueTurns?: number
    achievedMissionGoals?: number
    totalMissionGoals?: number
    goalResults?: Array<{ goalIndex: number; labelKo: string; achieved: boolean }>
  }
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
