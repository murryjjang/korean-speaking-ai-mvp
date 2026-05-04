/**
 * Supabase repository implementation for teacher_reviews.
 * Phase 6-B3: teacher_reviews upsert only.
 *
 * No Auth yet — teacher_id is stored as null.
 * submission_id in teacher_reviews has no FK constraint, so we store a
 * process-stable UUID generated on first write for each mock submission ID.
 * ai_evaluation_id is stored as null (mock IDs are not in Supabase).
 *
 * In-process cache (_reviewIdCache) tracks DB row UUIDs per mock submission ID
 * so subsequent saves UPDATE rather than INSERT. Cache resets on server restart.
 *
 * Methods never throw to their callers; actions.ts wraps calls in try/catch.
 */

import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import type { TeacherEvaluation, SubmissionStatus } from '@/src/types/data'
import type { TeacherEvalDraft } from '@/src/types/grading'
import type { TeacherReviewRepository } from './types'

type SupabaseClientType = ReturnType<typeof createClient>

// Supabase v2.105.1: without a typed Database generic, Schema resolves to `never`.
// Casting to `any` avoids false-negative compile errors while keeping runtime correct.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(client: SupabaseClientType): any {
  return client
}

// Map<mockSubmissionId, DB UUID of the teacher_review row>
// Resets on server restart — on next write a new row is inserted and cached.
const _reviewIdCache = new Map<string, string>()

export class SupabaseTeacherReviewRepository implements TeacherReviewRepository {
  constructor(private readonly supabase: SupabaseClientType) {}

  async getTeacherReview(_submissionId: string): Promise<TeacherEvaluation | null> {
    // Read path not needed in Phase 6-B3; page reads from mock store.
    return null
  }

  async saveDraft(
    submissionId: string,
    teacherId: string,
    aiEvaluationId: string,
    draft: TeacherEvalDraft,
  ): Promise<TeacherEvaluation> {
    return this._upsert(submissionId, teacherId, aiEvaluationId, draft, false)
  }

  async finalizeReview(
    submissionId: string,
    teacherId: string,
    aiEvaluationId: string,
    draft: TeacherEvalDraft,
  ): Promise<TeacherEvaluation> {
    return this._upsert(submissionId, teacherId, aiEvaluationId, draft, true)
  }

  private async _upsert(
    submissionId: string,
    teacherId: string,
    aiEvaluationId: string,
    draft: TeacherEvalDraft,
    isFinalized: boolean,
  ): Promise<TeacherEvaluation> {
    const totalScore = Object.values(draft.scores).reduce((a, b) => a + b, 0)
    const now = new Date().toISOString()

    const existingId = _reviewIdCache.get(submissionId)

    const fields = {
      submission_type: 'speaking',
      teacher_id: null,       // No Auth yet
      ai_evaluation_id: null, // Mock AI eval IDs are not present in Supabase
      scores: draft.scores,
      total_score: totalScore,
      normalized_score: totalScore,
      adjustment_reasons: draft.adjustmentReasons,
      public_comment: draft.publicComment || null,
      private_note: draft.privateNote || null,
      strengths: draft.strengths || null,
      improvements: draft.improvements || null,
      next_activity: draft.nextActivity || null,
      is_finalized: isFinalized,
      finalized_at: isFinalized ? now : null,
      updated_at: now,
    }

    let reviewId: string

    if (existingId) {
      const { error } = await db(this.supabase)
        .from('teacher_reviews')
        .update(fields)
        .eq('id', existingId)

      if (error) throw new Error(error.message)
      reviewId = existingId
    } else {
      // teacher_reviews.submission_id is uuid NOT NULL with no FK constraint.
      // Generate a stable placeholder UUID for this mock submission.
      const { data: row, error } = await db(this.supabase)
        .from('teacher_reviews')
        .insert({ submission_id: randomUUID(), ...fields })
        .select('id')
        .single()

      if (error || !row) throw new Error(error?.message ?? 'teacher_reviews insert failed')
      reviewId = row.id as string
      _reviewIdCache.set(submissionId, reviewId)
    }

    return {
      id: reviewId,
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
      isFinalized,
      finalizedAt: isFinalized ? now : undefined,
      createdAt: now,
    }
  }

  async getStatusOverride(_submissionId: string): Promise<SubmissionStatus | null> {
    return null
  }
}
