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

// v1.1 단계 19.13 [페이즈 1·2]: 발음·발화 흐름 컨텍스트 — LLM 프롬프트 보강용.
// Azure Pronunciation Assessment wordResults·점수와 timing 기반 pause를 가공하여 전달.
export type PronunciationContext = {
  overallAccuracy?: number      // 0-100 Azure AccuracyScore
  fluencyScore?: number          // 0-100 Azure FluencyScore
  completenessScore?: number     // 0-100 Azure CompletenessScore
  weakWords?: Array<{
    word: string
    score: number               // 0-100
    errorType?: 'None' | 'Omission' | 'Insertion' | 'Mispronunciation'
  }>
}

export type SpeechFlowContext = {
  totalDurationMs?: number
  // v1.1 단계 19.17: 임계 800/1500ms → 500/1000ms 하향 (PAUSE_SHORT_MS/PAUSE_LONG_MS 참고).
  longPauses?: Array<{ afterWord: string; gapMs: number }>  // ≥PAUSE_LONG_MS
  shortPauses?: Array<{ afterWord: string; gapMs: number }> // ≥PAUSE_SHORT_MS, <PAUSE_LONG_MS
  longPauseCount?: number
  shortPauseCount?: number
}

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
  // v1.1 단계 19.13 [페이즈 1]: 단어별 약점·세부 점수 — Azure provider일 때만 채워짐.
  pronunciationContext?: PronunciationContext
  // v1.1 단계 19.13 [페이즈 2]: pause 감지 결과 — Q1 wordResults timing에서 도출.
  speechFlowContext?: SpeechFlowContext
  // v1.1 단계 27: 학습자 모국어(ko/en/vi/ar/other). 외국어이면 OpenAI 평가가
  // learner_feedback_multilingual을 채워 반환하도록 프롬프트가 분기한다.
  motherTongue?: string | null
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
  // v1.1 16-10-4: 외국어 학습자에게 표시할 다국어 학습 피드백(있을 때만).
  // learner_feedback_ko와 같은 내용을 각 언어로 자연스럽게 표현한 1~2문장.
  learner_feedback_multilingual?: { ko: string; en?: string; vi?: string; ar?: string }
  required_elements_found?: string[]
  missing_elements?: string[]
  evidence?: string[]
  needs_teacher_review?: boolean
  grade?: 'A' | 'B' | 'C' | 'D' | 'F'
  raw_provider?: unknown
}
