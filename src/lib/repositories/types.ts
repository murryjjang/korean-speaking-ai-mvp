/**
 * Repository interfaces for data access abstraction.
 * Phase 6-A: interface definitions only.
 * Phase 6-B: MockRepository (wraps existing stores) and SupabaseRepository implementations.
 *
 * Usage: import factory functions from ./index, not implementations directly.
 */

import type {
  Submission,
  AIEvaluation,
  TeacherEvaluation,
  SubmissionStatus,
  ModuleType,
  ErrorTag,
  Student,
  Class,
} from '@/src/types/data'
import type { TeacherEvalDraft } from '@/src/types/grading'
import type { MissionSession, MissionSubmission } from '@/src/types/mission'
import type { STTResult, LLMEvalResult, PronunciationResult } from '@/src/types/providers'

// ── Input / Filter types ────────────────────────────────────────────

export type SubmissionFilter = {
  classId?: string
  studentId?: string
  status?: SubmissionStatus
  moduleType?: ModuleType
  limit?: number
  offset?: number
}

export type CreateSpeakingSubmissionInput = {
  studentId: string
  classId: string
  questionId: string
  questionSetId?: string
  audioUrl: string
  durationSec: number
}

export type CreateAIEvaluationInput = {
  submissionId: string
  submissionType: 'speaking' | 'mission'
  transcript?: string
  rubricId?: string
  rubricVersion?: string
  scores: Record<string, number>
  totalScore: number
  normalizedScore: number
  errorTags: ErrorTag[]
  feedback: string
  providerName: string
  providerVersion?: string
  latencyMs?: number
}

/**
 * Mirrors SpeakingEvalRecord from speaking-store.ts.
 * Defined here independently to decouple the interface from mock internals.
 * Both types must remain structurally identical; TypeScript structural typing
 * ensures they stay compatible at compile time.
 */
export type SpeakingEvalRecord = {
  submissionId: string
  questionId: string
  questionSetId: string
  submittedAt: string
  sttResult: STTResult
  llmEvalResult: LLMEvalResult
  pronunciationResult: PronunciationResult
}

// ── Repository interfaces ───────────────────────────────────────────

export interface SubmissionRepository {
  listSubmissions(filter?: SubmissionFilter): Promise<Submission[]>
  getSubmissionById(id: string): Promise<Submission | null>
  createSpeakingSubmission(data: CreateSpeakingSubmissionInput): Promise<Submission>
  updateSubmissionStatus(id: string, status: SubmissionStatus): Promise<void>
}

export interface EvaluationRepository {
  getAIEvaluation(submissionId: string): Promise<AIEvaluation | null>
  saveAIEvaluation(data: CreateAIEvaluationInput): Promise<AIEvaluation>
  getSpeakingEvalRecord(submissionId: string): Promise<SpeakingEvalRecord | null>
  saveSpeakingEvalRecord(record: SpeakingEvalRecord): Promise<void>
}

export interface TeacherReviewRepository {
  getTeacherReview(submissionId: string): Promise<TeacherEvaluation | null>
  saveDraft(
    submissionId: string,
    teacherId: string,
    aiEvaluationId: string,
    draft: TeacherEvalDraft,
  ): Promise<TeacherEvaluation>
  finalizeReview(
    submissionId: string,
    teacherId: string,
    aiEvaluationId: string,
    draft: TeacherEvalDraft,
  ): Promise<TeacherEvaluation>
  getStatusOverride(submissionId: string): Promise<SubmissionStatus | null>
}

export interface MissionRepository {
  createSession(session: MissionSession): Promise<void>
  getSession(sessionId: string): Promise<MissionSession | null>
  updateSession(session: MissionSession): Promise<void>
  createMissionSubmission(data: MissionSubmission): Promise<void>
  getMissionSubmission(submissionId: string): Promise<MissionSubmission | null>
}

export interface StudentRepository {
  listStudents(classId?: string): Promise<Student[]>
  getStudentById(id: string): Promise<Student | null>
}

export interface ClassRepository {
  listClasses(): Promise<Class[]>
  getClassById(id: string): Promise<Class | null>
}
