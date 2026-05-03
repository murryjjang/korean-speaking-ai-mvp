import type { LanguageGroupCategory } from './content'

export type SubmissionStatus = 'pending' | 'ai_evaluated' | 'teacher_reviewed' | 'finalized'

export type RiskLevel = 'low' | 'medium' | 'high'

export type ModuleType = 'assessment' | 'contest' | 'mission'

export type ErrorTagType = 'particle' | 'ending' | 'tense' | 'pronunciation' | 'fluency' | 'task' | 'grammar'

export type ErrorTag = {
  type: ErrorTagType
  count: number
  examples: string[]
}

// MVP에서 UI 다국어 표시를 지원하는 언어 코드.
// TODO (Phase 9+): Supabase auth profile에 per-student uiSupportLanguage를 저장하고
//   로그인 시 자동으로 UI 언어를 전환하는 기능을 구현한다.
//   현재는 데이터 구조만 확보하며, 실제 i18n 렌더링은 구현하지 않는다.
export type SupportedUILanguage = 'ko' | 'en' | 'vi' | 'th' | 'ar'

export type Student = {
  id: string
  anonymousId: string
  name: string
  classId: string
  languageGroupId: string          // LanguageGroup.id 참조 (예: 'lg-vi')
  nativeLanguage: string           // 표시용 모국어명 (예: '베트남어')
  languageGroup: LanguageGroupCategory // 필터용 대분류 (예: 'southeast-asian')
  uiSupportLanguage: SupportedUILanguage // 향후 UI 언어 전환 기준
  enrolledAt: string
  isActive: boolean
}

export type Class = {
  id: string
  name: string
  teacherId: string
  semester: string
  isActive: boolean
  createdAt: string
}

export type Submission = {
  id: string
  studentId: string
  classId: string
  moduleType: ModuleType
  questionSetId?: string
  scenarioId?: string
  questionId?: string
  audioUrl: string
  durationSec: number
  status: SubmissionStatus
  submittedAt: string
}

export type AIEvaluation = {
  id: string
  submissionId: string
  transcript: string
  rubricId: string
  rubricVersion: string
  scores: Record<string, number>
  totalScore: number
  normalizedScore: number
  errorTags: ErrorTag[]
  feedback: string
  providerName: string
  providerVersion: string
  latencyMs: number
  rawResponse?: unknown
  evaluatedAt: string
}

export type TeacherEvaluation = {
  id: string
  submissionId: string
  teacherId: string
  aiEvaluationId: string
  scores: Record<string, number>
  totalScore: number
  normalizedScore: number
  adjustmentReasons: string[]
  publicComment: string
  privateNote: string
  isFinalized: boolean
  finalizedAt?: string
  createdAt: string
}

export type RiskFlag = {
  id: string
  studentId: string
  classId: string
  riskLevel: RiskLevel
  reasons: string[]
  detectedAt: string
  isResolved: boolean
}

export type ContentSetSummary = {
  id: string
  name: string
  purpose: 'diagnostic' | 'practice' | 'post'
  questionCount: number
  submissionCount: number
  avgScore: number | null
  isActive: boolean
}

export type ProviderStatus = {
  type: 'stt' | 'tts' | 'pronunciation' | 'llm-eval'
  name: string
  isConfigured: boolean
  isMock: boolean
  note: string
}
