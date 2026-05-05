export type ProviderName = 'mock' | 'etri' | 'whisper' | 'azure' | 'browser' | 'claude' | 'openai'

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

export type PronunciationResult = ProviderMeta & {
  normalizedScore: number
  wordScores: PronunciationWordScore[]
  feedback: string
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
  synthesize(text: string): Promise<TTSResult>
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
  raw_provider?: unknown
}
