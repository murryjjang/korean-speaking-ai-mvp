/**
 * Mock repository implementations — wraps existing module-level stores.
 * Phase 6-A: these are the only implementations available.
 * Phase 6-B: SupabaseRepository implementations replace these when
 *   REPOSITORY_PROVIDER=supabase. Existing stores are NOT deleted.
 *
 * All module-level Maps here reset on server restart (same as the stores
 * they delegate to). Persistence requires Phase 6-B Supabase connection.
 */

import type { Submission, AIEvaluation, TeacherEvaluation, SubmissionStatus, Student, Class } from '@/src/types/data'
import type { TeacherEvalDraft } from '@/src/types/grading'
import type { MissionSession, MissionSubmission } from '@/src/types/mission'
import {
  mockSubmissions,
  mockAIEvaluations,
  mockStudents,
  mockClasses,
} from '@/src/lib/mock/data'
import {
  getDraft as getTeacherDraft,
  saveDraft as saveTeacherDraft,
  finalize as finalizeTeacherReview,
  getStatusOverride as getTeacherStatusOverride,
} from '@/src/lib/mock/teacher-grading-store'
import {
  saveSpeakingEval,
  getSpeakingEval,
} from '@/src/lib/mock/speaking-store'
import {
  createSession as storCreateSession,
  getSession as storeGetSession,
  updateSession as storeUpdateSession,
  saveMissionSubmission as storeSaveMissionSubmission,
  getMissionSubmission as storeGetMissionSubmission,
} from '@/src/lib/mock/mission-store'
import type {
  SubmissionFilter,
  CreateSpeakingSubmissionInput,
  CreateAIEvaluationInput,
  SpeakingEvalRecord,
  SubmissionRepository,
  EvaluationRepository,
  TeacherReviewRepository,
  MissionRepository,
  StudentRepository,
  ClassRepository,
} from './types'

// ── module-level stores for newly created records (reset on restart) ─

const newSubmissions = new Map<string, Submission>()
const newAIEvals = new Map<string, AIEvaluation>()
const localStatusOverrides = new Map<string, SubmissionStatus>()

// ── helpers ───────────────────────────────────────────────────────────

function applyStatusOverride(sub: Submission): Submission {
  const local = localStatusOverrides.get(sub.id)
  if (local) return { ...sub, status: local }
  const storeOverride = getTeacherStatusOverride(sub.id)
  if (storeOverride) return { ...sub, status: storeOverride as SubmissionStatus }
  return sub
}

// ── MockSubmissionRepository ──────────────────────────────────────────

export class MockSubmissionRepository implements SubmissionRepository {
  async listSubmissions(filter?: SubmissionFilter): Promise<Submission[]> {
    let result: Submission[] = [
      ...mockSubmissions.map(applyStatusOverride),
      ...Array.from(newSubmissions.values()),
    ]
    if (filter?.classId)    result = result.filter((s) => s.classId === filter.classId)
    if (filter?.studentId)  result = result.filter((s) => s.studentId === filter.studentId)
    if (filter?.status)     result = result.filter((s) => s.status === filter.status)
    if (filter?.moduleType) result = result.filter((s) => s.moduleType === filter.moduleType)
    const offset = filter?.offset ?? 0
    const end    = filter?.limit != null ? offset + filter.limit : undefined
    return result.slice(offset, end)
  }

  async getSubmissionById(id: string): Promise<Submission | null> {
    const fromMock = mockSubmissions.find((s) => s.id === id)
    if (fromMock) return applyStatusOverride(fromMock)
    return newSubmissions.get(id) ?? null
  }

  async createSpeakingSubmission(data: CreateSpeakingSubmissionInput): Promise<Submission> {
    const id = `sub-new-${Date.now()}`
    const submission: Submission = {
      id,
      studentId: data.studentId,
      classId: data.classId,
      moduleType: 'assessment',
      questionId: data.questionId,
      questionSetId: data.questionSetId,
      audioUrl: data.audioUrl,
      durationSec: data.durationSec,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    }
    newSubmissions.set(id, submission)
    return submission
  }

  async updateSubmissionStatus(id: string, status: SubmissionStatus): Promise<void> {
    const existing = newSubmissions.get(id)
    if (existing) {
      newSubmissions.set(id, { ...existing, status })
    } else {
      localStatusOverrides.set(id, status)
    }
  }
}

// ── MockEvaluationRepository ──────────────────────────────────────────

export class MockEvaluationRepository implements EvaluationRepository {
  async getAIEvaluation(submissionId: string): Promise<AIEvaluation | null> {
    return (
      mockAIEvaluations.find((e) => e.submissionId === submissionId) ??
      newAIEvals.get(submissionId) ??
      null
    )
  }

  async saveAIEvaluation(data: CreateAIEvaluationInput): Promise<AIEvaluation> {
    const id = `ai-eval-new-${data.submissionId}-${Date.now()}`
    const record: AIEvaluation = {
      id,
      submissionId: data.submissionId,
      transcript: data.transcript ?? '',
      rubricId: data.rubricId ?? '',
      rubricVersion: data.rubricVersion ?? '1',
      scores: data.scores,
      totalScore: data.totalScore,
      normalizedScore: data.normalizedScore,
      errorTags: data.errorTags,
      feedback: data.feedback,
      providerName: data.providerName,
      providerVersion: data.providerVersion ?? '',
      latencyMs: data.latencyMs ?? 0,
      evaluatedAt: new Date().toISOString(),
    }
    newAIEvals.set(data.submissionId, record)
    return record
  }

  async getSpeakingEvalRecord(submissionId: string): Promise<SpeakingEvalRecord | null> {
    return getSpeakingEval(submissionId) ?? null
  }

  async saveSpeakingEvalRecord(record: SpeakingEvalRecord): Promise<void> {
    saveSpeakingEval(record)
  }
}

// ── MockTeacherReviewRepository ───────────────────────────────────────

export class MockTeacherReviewRepository implements TeacherReviewRepository {
  async getTeacherReview(submissionId: string): Promise<TeacherEvaluation | null> {
    return getTeacherDraft(submissionId) ?? null
  }

  async saveDraft(
    submissionId: string,
    teacherId: string,
    aiEvaluationId: string,
    draft: TeacherEvalDraft,
  ): Promise<TeacherEvaluation> {
    return saveTeacherDraft(submissionId, teacherId, aiEvaluationId, draft)
  }

  async finalizeReview(
    submissionId: string,
    teacherId: string,
    aiEvaluationId: string,
    draft: TeacherEvalDraft,
  ): Promise<TeacherEvaluation> {
    return finalizeTeacherReview(submissionId, teacherId, aiEvaluationId, draft)
  }

  async getStatusOverride(submissionId: string): Promise<SubmissionStatus | null> {
    const local = localStatusOverrides.get(submissionId)
    if (local) return local
    const store = getTeacherStatusOverride(submissionId)
    return store ? (store as SubmissionStatus) : null
  }
}

// ── MockMissionRepository ─────────────────────────────────────────────

export class MockMissionRepository implements MissionRepository {
  async createSession(session: MissionSession): Promise<void> {
    storCreateSession(session)
  }

  async getSession(sessionId: string): Promise<MissionSession | null> {
    return storeGetSession(sessionId) ?? null
  }

  async updateSession(session: MissionSession): Promise<void> {
    storeUpdateSession(session)
  }

  async createMissionSubmission(data: MissionSubmission): Promise<void> {
    storeSaveMissionSubmission(data)
  }

  async getMissionSubmission(submissionId: string): Promise<MissionSubmission | null> {
    return storeGetMissionSubmission(submissionId) ?? null
  }
}

// ── MockStudentRepository ─────────────────────────────────────────────

export class MockStudentRepository implements StudentRepository {
  async listStudents(classId?: string): Promise<Student[]> {
    if (!classId) return [...mockStudents]
    return mockStudents.filter((s) => s.classId === classId)
  }

  async getStudentById(id: string): Promise<Student | null> {
    return mockStudents.find((s) => s.id === id) ?? null
  }
}

// ── MockClassRepository ───────────────────────────────────────────────

export class MockClassRepository implements ClassRepository {
  async listClasses(): Promise<Class[]> {
    return [...mockClasses]
  }

  async getClassById(id: string): Promise<Class | null> {
    return mockClasses.find((c) => c.id === id) ?? null
  }
}
