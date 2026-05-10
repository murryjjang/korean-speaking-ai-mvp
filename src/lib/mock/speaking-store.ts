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
    /** q4 LLM 하이브리드 평가 — LLM 미션 판정 + 정성 평가 합산 점수. null이면 규칙 기반 폴백. */
    dialogueHybridScore?: {
      total: number
      quantitativeRaw: number
      quantitativeMax: number
      quantitativeScore: number
      qualitativeScore: number
      qualitativeBreakdown: {
        naturalness: number
        koreanAccuracy: number
        responsiveness: number
      }
    }
    /** q4 평가 출처 — 'llm'이면 하이브리드 점수 사용, 'rule'이면 기존 규칙 기반. */
    dialogueEvalSource?: 'llm' | 'rule'
    /** q4 대화 provider — 'openai'면 LLM 대화, 그 외('mock'/'fallback')면 mock provider. */
    dialogueConversationProvider?: 'openai' | 'mock' | 'fallback'
    /** 23-h D-5: q4 결과 화면 화자별 말풍선 렌더링용 turn 기록 (학습자 + AI). */
    dialogueTurnRecords?: Array<{
      role: 'ai' | 'student' | 'system'
      text: string
      pronScore?: number
    }>
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
