'use server'

import {
  saveDraft as storeSaveDraft,
  finalize as storeFinalize,
} from '@/src/lib/mock/teacher-grading-store'
import type { TeacherEvalDraft } from '@/src/types/grading'

const MOCK_TEACHER_ID = 'teacher-001'

export async function saveTeacherDraft(
  submissionId: string,
  aiEvaluationId: string,
  draft: TeacherEvalDraft,
): Promise<void> {
  storeSaveDraft(submissionId, MOCK_TEACHER_ID, aiEvaluationId, draft)
}

export async function finalizeTeacherEvaluation(
  submissionId: string,
  aiEvaluationId: string,
  draft: TeacherEvalDraft,
): Promise<{ ok: boolean }> {
  storeFinalize(submissionId, MOCK_TEACHER_ID, aiEvaluationId, draft)
  return { ok: true }
}
