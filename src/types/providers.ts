export type ProviderName = 'mock' | 'etri' | 'whisper' | 'azure' | 'browser' | 'claude' | 'openai' | 'no-speech' | 'demo'

export type ProviderMeta = {
  providerName: ProviderName
  providerVersion: string
  latencyMs: number
  rawResponse?: unknown
}

export type WordTiming = {
  word: string
  startMs: number
  endMs: number
}

export type STTResult = ProviderMeta & {
  transcript: string
  confidence: number
  wordTimings?: WordTiming[]
}

export type TTSResult = ProviderMeta & {
  audioUrl: string
  durationSec: number
  audioData?: Uint8Array   // Raw PCM/MP3 bytes returned by server-side providers
  mimeType?: string        // e.g. 'audio/mpeg'
}

export type PronunciationWordScore = {
  word: string
  score: number
  phonemes?: string[]
}

export type AzureWordResult = {
  word: string
  accuracyScore: number
  errorType: 'None' | 'Omission' | 'Insertion' | 'Mispronunciation'
  /** Azure Word.Offset converted from 100ns ticks to milliseconds; absent for omissions. */
  offsetMs?: number
  /** Azure Word.Duration converted from 100ns ticks to milliseconds. */
  durationMs?: number
}

export type PronunciationResult = ProviderMeta & {
  normalizedScore: number
  wordScores: PronunciationWordScore[]
  feedback: string
  /** ETRI 원점수 (1~5). PRONUNCIATION_PROVIDER=etri 시만 설정됨. */
  rawScore?: number
  /** etri/azure fallback일 때 사유 */
  fallbackReason?: string
  /** 파일럿 보정 참고점수. 최종점수 아님 — 교수자 검토 후 확정. */
  calibratedScore?: number
  calibrationVersion?: string
  calibrationStatus?: 'uncalibrated' | 'provisional' | 'validated'
  calibrationNote?: string
  /** Azure Pronunciation Assessment 전용 — PRONUNCIATION_PROVIDER=azure 시 설정. */
  pronScore?: number | null
  accuracyScore?: number | null
  fluencyScore?: number | null
  completenessScore?: number | null
  recognizedText?: string
  wordResults?: AzureWordResult[]
}

export type LLMEvalScore = {
  rubricItemId: string
  score: number
  rationale: string
}

export type LLMEvalErrorTag = {
  type: string
  count: number
  examples: string[]
}

export type LLMEvalResult = ProviderMeta & {
  scores: LLMEvalScore[]
  totalScore: number
  normalizedScore: number
  errorTags: LLMEvalErrorTag[]
  feedback: string
}

export interface STTProvider {
  transcribe(audioBlob: Blob): Promise<STTResult>
}

export interface TTSProvider {
  synthesize(text: string, options?: { voice?: string; rate?: number; lang?: string }): Promise<TTSResult>
}

export interface PronunciationProvider {
  evaluate(audioBlob: Blob, referenceText: string): Promise<PronunciationResult>
}

export interface LLMEvalProvider {
  evaluate(transcript: string, rubricId: string): Promise<LLMEvalResult>
}

// ── Phase 8-G: rich speaking evaluation ─────────────────────────────────────

export type SpeakingEvalInput = {
  transcript: string
  rubricId: string
  questionPrompt?: string
  questionId?: string
  questionType?: string
  requiredElements?: string[]
  requiredElementAliases?: Record<string, string[]>
  pronunciationScore?: number
  pronunciationFeedback?: string
}

export type SpeakingEvalDetail = {
  overall_score: number
  task_completion_score: number
  fluency_score: number
  grammar_score: number
  vocabulary_score: number
  pronunciation_reference_score?: number
  strengths: string[]
  improvements: string[]
  corrected_answer: string
  teacher_note: string
  learner_feedback_ko: string
  learner_feedback_simple: string
  required_elements_found?: string[]
  missing_elements?: string[]
  evidence?: string[]
  needs_teacher_review?: boolean
  grade?: 'A' | 'B' | 'C' | 'D' | 'F'
  raw_provider?: unknown
}
