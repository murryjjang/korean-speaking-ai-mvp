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
