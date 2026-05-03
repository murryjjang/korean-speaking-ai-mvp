import type { TeacherEvaluation } from '@/src/types/data'
import type { TeacherEvalDraft } from '@/src/types/grading'
import { mockTeacherEvaluations } from './data'

// Module-level store — resets on server restart. Phase 9+에서 Supabase로 교체 예정.
const evalStore = new Map<string, TeacherEvaluation>(
  mockTeacherEvaluations.map((te) => [te.submissionId, { ...te }]),
)

const statusOverrides = new Map<string, string>(
  mockTeacherEvaluations
    .filter((te) => te.isFinalized)
    .map((te) => [te.submissionId, 'finalized']),
)

export function getDraft(submissionId: string): TeacherEvaluation | undefined {
  return evalStore.get(submissionId)
}

export function saveDraft(
  submissionId: string,
  teacherId: string,
  aiEvaluationId: string,
  draft: TeacherEvalDraft,
): TeacherEvaluation {
  const totalScore = Object.values(draft.scores).reduce((a, b) => a + b, 0)
  const existing = evalStore.get(submissionId)
  const record: TeacherEvaluation = {
    id: existing?.id ?? `te-${submissionId}-draft`,
    submissionId,
    teacherId,
    aiEvaluationId,
    scores: { ...draft.scores },
    totalScore,
    normalizedScore: totalScore,
    adjustmentReasons: [...draft.adjustmentReasons],
    publicComment: draft.publicComment,
    privateNote: draft.privateNote,
    strengths: draft.strengths,
    improvements: draft.improvements,
    nextActivity: draft.nextActivity,
    isFinalized: false,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  }
  evalStore.set(submissionId, record)
  statusOverrides.set(submissionId, 'teacher_reviewed')
  return record
}

export function finalize(
  submissionId: string,
  teacherId: string,
  aiEvaluationId: string,
  draft: TeacherEvalDraft,
): TeacherEvaluation {
  const totalScore = Object.values(draft.scores).reduce((a, b) => a + b, 0)
  const existing = evalStore.get(submissionId)
  const now = new Date().toISOString()
  const record: TeacherEvaluation = {
    id: existing?.id ?? `te-${submissionId}`,
    submissionId,
    teacherId,
    aiEvaluationId,
    scores: { ...draft.scores },
    totalScore,
    normalizedScore: totalScore,
    adjustmentReasons: [...draft.adjustmentReasons],
    publicComment: draft.publicComment,
    privateNote: draft.privateNote,
    strengths: draft.strengths,
    improvements: draft.improvements,
    nextActivity: draft.nextActivity,
    isFinalized: true,
    finalizedAt: now,
    createdAt: existing?.createdAt ?? now,
  }
  evalStore.set(submissionId, record)
  statusOverrides.set(submissionId, 'finalized')
  return record
}

export function getStatusOverride(submissionId: string): string | undefined {
  return statusOverrides.get(submissionId)
}
