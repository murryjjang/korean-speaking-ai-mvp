// v1.1 단계 10-1: 시험운영 도메인 타입.
//
// research_* 테이블과 1:1로 매칭. 라우트·리포지터리에서 공통 사용.

export type ResearchMode =
  | 'free_conversation'
  | 'q1_repeat'
  | 'q2_describe'
  | 'q3_picture'
  | 'q4_dialogue'
  | 'presentation'
  | 'reading'

export type ResearchSpeaker = 'learner' | 'npc'

export type ResearchParticipant = {
  id: string
  participantCode: string
  pinHash: string | null
  name: string | null
  nationality: string | null
  koreanLevel: string | null
  motherTongue: string | null
  enrolledAt: string
  consentStatus: boolean
  consentAt: string | null
  notes: string | null
}

export type ResearchSession = {
  id: string
  participantId: string
  sessionStartedAt: string
  sessionEndedAt: string | null
  mode: ResearchMode
  metaJson: Record<string, unknown>
}

export type ResearchUtterance = {
  id: string
  sessionId: string
  turnNumber: number
  speaker: ResearchSpeaker
  text: string
  audioUrl: string | null
  responseTimeMs: number | null
  toolCalls: Record<string, unknown>[] | null
  metaJson: Record<string, unknown> | null
  createdAt: string
}

export type ResearchAssessment = {
  id: string
  sessionId: string
  mode: ResearchMode
  scoreTotal: number | null
  scoresDetail: Record<string, unknown>
  feedbackText: string | null
  pronunciationData: Record<string, unknown> | null
  provider: string | null
  model: string | null
  createdAt: string
}

export type ResearchConsentLog = {
  id: string
  participantId: string
  consentVersion: string
  consentTextHash: string
  consentedAt: string
  ipAddress: string | null
  userAgent: string | null
}

// ── 입력 페이로드 (라우트가 리포지터리에 전달) ─────────────────────────────────

export type CreateParticipantInput = {
  participantCode: string
  pinHash?: string | null
  name?: string | null
  nationality?: string | null
  koreanLevel?: string | null
  motherTongue?: string | null
  notes?: string | null
}

export type CreateSessionInput = {
  participantId: string
  mode: ResearchMode
  metaJson?: Record<string, unknown>
}

export type CreateUtteranceInput = {
  sessionId: string
  turnNumber: number
  speaker: ResearchSpeaker
  text: string
  audioUrl?: string | null
  responseTimeMs?: number | null
  toolCalls?: Record<string, unknown>[] | null
  metaJson?: Record<string, unknown> | null
}

export type CreateAssessmentInput = {
  sessionId: string
  mode: ResearchMode
  scoreTotal?: number | null
  scoresDetail?: Record<string, unknown>
  feedbackText?: string | null
  pronunciationData?: Record<string, unknown> | null
  /** v1.1 단계 18 [J]: 평가를 실제로 처리한 provider/model 추적. */
  provider?: string | null
  model?: string | null
}

export type CreateConsentLogInput = {
  participantId: string
  consentVersion: string
  consentTextHash: string
  ipAddress?: string | null
  userAgent?: string | null
}

// ── 동의서 버전·본문 해시 ─────────────────────────────────────────────────────
// 본문이 바뀌면 버전을 올린다. 본문 해시는 라우트에서 server-side로 계산.

export const CONSENT_VERSION = 'v1.0'
