'use server'

import {
  saveDraft as storeSaveDraft,
  finalize as storeFinalize,
} from '@/src/lib/mock/teacher-grading-store'
import { getTeacherReviewRepository } from '@/src/lib/repositories'
import type { TeacherEvalDraft } from '@/src/types/grading'

const MOCK_TEACHER_ID = 'teacher-001'

export async function saveTeacherDraft(
  submissionId: string,
  aiEvaluationId: string,
  draft: TeacherEvalDraft,
): Promise<void> {
  // Always write to mock store — page read path depends on it
  storeSaveDraft(submissionId, MOCK_TEACHER_ID, aiEvaluationId, draft)

  if (process.env.REPOSITORY_PROVIDER === 'supabase') {
    try {
      const repo = getTeacherReviewRepository()
      const result = await repo.saveDraft(submissionId, MOCK_TEACHER_ID, aiEvaluationId, draft)
      console.info(`[supabase] teacher_review saved: ${result.id}`)
    } catch {
      console.error('[supabase] teacher_review save failed')
    }
  }
}

export async function finalizeTeacherEvaluation(
  submissionId: string,
  aiEvaluationId: string,
  draft: TeacherEvalDraft,
): Promise<{ ok: boolean }> {
  // Always write to mock store — page read path depends on it
  storeFinalize(submissionId, MOCK_TEACHER_ID, aiEvaluationId, draft)

  if (process.env.REPOSITORY_PROVIDER === 'supabase') {
    try {
      const repo = getTeacherReviewRepository()
      const result = await repo.finalizeReview(submissionId, MOCK_TEACHER_ID, aiEvaluationId, draft)
      console.info(`[supabase] teacher_review saved: ${result.id}`)
    } catch {
      console.error('[supabase] teacher_review save failed')
    }
  }

  return { ok: true }
}
