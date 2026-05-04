/**
 * Supabase repository implementations for speaking submissions.
 * Phase 6-B2: speaking_submissions + ai_evaluations insert only.
 *
 * No Auth yet — a "pilot" class and student are upserted on first use as FK
 * anchors. Content rows (questions, question_sets) are also seeded from JSON
 * so that speaking_submissions FK constraints don't reject the insert.
 *
 * All methods are designed to never throw to the caller; they log errors and
 * return null/empty so the mock result page always renders.
 */

import { createClient } from '@supabase/supabase-js'
import type { Submission, AIEvaluation, SubmissionStatus } from '@/src/types/data'
import questionsJson from '@/src/content/questions.json'
import questionSetsJson from '@/src/content/question-sets.json'
import type {
  SubmissionRepository,
  EvaluationRepository,
  SubmissionFilter,
  CreateSpeakingSubmissionInput,
  CreateAIEvaluationInput,
  SpeakingEvalRecord,
} from './types'

type SupabaseClientType = ReturnType<typeof createClient>

// Supabase v2.105.1: without a typed Database generic, Schema resolves to `never`
// in some TypeScript compiler contexts, making all .from()/.insert() calls fail.
// Casting to `any` here avoids the false-negative and keeps runtime behaviour correct.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(client: SupabaseClientType): any {
  return client
}

// ── Pilot context bootstrap ─────────────────────────────────────────────────
// Phase 6-B2: no Auth. We ensure one pilot class + student exist as FK anchors.
// Cached per server process; reset on restart (acceptable for MVP).

const PILOT_CLASS_NAME = 'Pilot Class (Phase 6-B)'
const PILOT_STUDENT_ANON_ID = 'PILOT-S-001'

let _pilotClassId: string | null | undefined = undefined
let _pilotStudentId: string | null | undefined = undefined

async function ensurePilotClass(client: SupabaseClientType): Promise<string | null> {
  if (_pilotClassId !== undefined) return _pilotClassId

  const { data: rows, error: selectError } = await db(client)
    .from('classes')
    .select('id')
    .eq('name', PILOT_CLASS_NAME)
    .limit(1)

  if (selectError) {
    console.error('[supabase] ensurePilotClass select failed:', selectError.message)
    _pilotClassId = null
    return null
  }

  const existing = rows?.[0]
  if (existing?.id) {
    _pilotClassId = existing.id as string
    return _pilotClassId
  }

  const { data: created, error: insertError } = await db(client)
    .from('classes')
    .insert({ name: PILOT_CLASS_NAME, semester: '2026-pilot', is_active: true })
    .select('id')
    .single()

  if (insertError || !created) {
    console.error('[supabase] ensurePilotClass insert failed:', insertError?.message)
    _pilotClassId = null
    return null
  }

  _pilotClassId = created.id as string
  return _pilotClassId
}

async function ensurePilotStudent(
  client: SupabaseClientType,
  classId: string,
): Promise<string | null> {
  if (_pilotStudentId !== undefined) return _pilotStudentId

  const { data: rows, error: selectError } = await db(client)
    .from('students')
    .select('id')
    .eq('anonymous_id', PILOT_STUDENT_ANON_ID)
    .limit(1)

  if (selectError) {
    console.error('[supabase] ensurePilotStudent select failed:', selectError.message)
    _pilotStudentId = null
    return null
  }

  const existing = rows?.[0]
  if (existing?.id) {
    _pilotStudentId = existing.id as string
    return _pilotStudentId
  }

  const { data: created, error: insertError } = await db(client)
    .from('students')
    .insert({
      anonymous_id: PILOT_STUDENT_ANON_ID,
      name: 'Pilot Student',
      class_id: classId,
      language_group_id: 'lg-ko',
      native_language: '한국어',
      language_group: 'east-asian',
      ui_support_language: 'ko',
      is_active: true,
    })
    .select('id')
    .single()

  if (insertError || !created) {
    console.error('[supabase] ensurePilotStudent insert failed:', insertError?.message)
    _pilotStudentId = null
    return null
  }

  _pilotStudentId = created.id as string
  return _pilotStudentId
}

// Seed question row from JSON content so speaking_submissions FK doesn't fail.
async function ensureQuestion(client: SupabaseClientType, questionId: string): Promise<void> {
  const q = questionsJson.find((x) => x.id === questionId)
  if (!q) return

  const { error } = await db(client)
    .from('questions')
    .upsert(
      {
        id: q.id,
        type_id: q.typeId,
        title: q.title,
        prompt: q.prompt,
        difficulty: q.difficulty,
        prep_time_sec: q.prepTimeSec,
        response_time_sec: q.responseTimeSec,
        is_active: q.isActive,
        version: 1,
      },
      { onConflict: 'id' },
    )

  if (error) console.warn('[supabase] ensureQuestion upsert warn:', error.message)
}

// Seed question_set row from JSON content so speaking_submissions FK doesn't fail.
async function ensureQuestionSet(
  client: SupabaseClientType,
  questionSetId: string,
): Promise<void> {
  const qs = questionSetsJson.find((x) => x.id === questionSetId)
  if (!qs) return

  const { error } = await db(client)
    .from('question_sets')
    .upsert(
      {
        id: qs.id,
        name: qs.name,
        description: qs.description,
        purpose: qs.purpose,
        question_ids: qs.questions,
        is_active: qs.isActive,
        version: 1,
      },
      { onConflict: 'id' },
    )

  if (error) console.warn('[supabase] ensureQuestionSet upsert warn:', error.message)
}

// ── SupabaseSubmissionRepository ─────────────────────────────────────────────

export class SupabaseSubmissionRepository implements SubmissionRepository {
  constructor(private readonly supabase: SupabaseClientType) {}

  // Read paths not needed in Phase 6-B2; result page reads from mock store.
  async listSubmissions(_filter?: SubmissionFilter): Promise<Submission[]> {
    return []
  }

  async getSubmissionById(_id: string): Promise<Submission | null> {
    return null
  }

  async createSpeakingSubmission(data: CreateSpeakingSubmissionInput): Promise<Submission> {
    const classId = await ensurePilotClass(this.supabase)
    const studentId = classId ? await ensurePilotStudent(this.supabase, classId) : null

    if (!classId || !studentId) {
      throw new Error('[supabase] Pilot context unavailable')
    }

    if (data.questionSetId) await ensureQuestionSet(this.supabase, data.questionSetId)
    await ensureQuestion(this.supabase, data.questionId)

    const { data: row, error } = await db(this.supabase)
      .from('speaking_submissions')
      .insert({
        student_id: studentId,
        class_id: classId,
        question_id: data.questionId,
        question_set_id: data.questionSetId ?? null,
        audio_url: data.audioUrl || null,
        duration_sec: data.durationSec || null,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      })
      .select('id, submitted_at')
      .single()

    if (error || !row) throw new Error(error?.message ?? '[supabase] insert failed')

    return {
      id: row.id as string,
      studentId: data.studentId,
      classId: data.classId,
      moduleType: 'assessment',
      questionId: data.questionId,
      questionSetId: data.questionSetId,
      audioUrl: data.audioUrl,
      durationSec: data.durationSec,
      status: 'pending',
      submittedAt: row.submitted_at as string,
    }
  }

  async updateSubmissionStatus(_id: string, _status: SubmissionStatus): Promise<void> {}
}

// ── SupabaseEvaluationRepository ─────────────────────────────────────────────

export class SupabaseEvaluationRepository implements EvaluationRepository {
  constructor(private readonly supabase: SupabaseClientType) {}

  async getAIEvaluation(_submissionId: string): Promise<AIEvaluation | null> {
    return null
  }

  async saveAIEvaluation(data: CreateAIEvaluationInput): Promise<AIEvaluation> {
    const { data: row, error } = await db(this.supabase)
      .from('ai_evaluations')
      .insert({
        submission_id: data.submissionId,
        submission_type: data.submissionType,
        transcript: data.transcript ?? null,
        rubric_id: data.rubricId ?? null,
        rubric_version: data.rubricVersion ? Number(data.rubricVersion) : null,
        scores: data.scores,
        total_score: data.totalScore,
        normalized_score: data.normalizedScore,
        error_tags: data.errorTags,
        feedback: data.feedback,
        provider_name: data.providerName,
        provider_version: data.providerVersion ?? null,
        latency_ms: data.latencyMs ?? null,
        evaluated_at: new Date().toISOString(),
      })
      .select('id, evaluated_at')
      .single()

    if (error || !row) throw new Error(error?.message ?? '[supabase] ai_evaluations insert failed')

    return {
      id: row.id as string,
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
      evaluatedAt: row.evaluated_at as string,
    }
  }

  async getSpeakingEvalRecord(_submissionId: string): Promise<SpeakingEvalRecord | null> {
    return null
  }

  /**
   * Persists a completed speaking evaluation to Supabase.
   * Inserts into speaking_submissions then ai_evaluations.
   * Bootstraps pilot class/student/question/question_set if not present.
   * Never throws — all errors are logged and the method returns early,
   * leaving the mock store as the source of truth for the result page.
   */
  async saveSpeakingEvalRecord(record: SpeakingEvalRecord): Promise<void> {
    // 1. Ensure pilot FK anchors
    const classId = await ensurePilotClass(this.supabase)
    if (!classId) return

    const studentId = await ensurePilotStudent(this.supabase, classId)
    if (!studentId) return

    // 2. Seed content reference rows so FK constraints don't reject the insert
    if (record.questionSetId) await ensureQuestionSet(this.supabase, record.questionSetId)
    await ensureQuestion(this.supabase, record.questionId)

    // 3. Insert speaking_submission
    const { data: subRow, error: subError } = await db(this.supabase)
      .from('speaking_submissions')
      .insert({
        student_id: studentId,
        class_id: classId,
        question_id: record.questionId,
        question_set_id: record.questionSetId || null,
        audio_url: null,
        duration_sec: null,
        status: 'pending',
        submitted_at: record.submittedAt,
      })
      .select('id')
      .single()

    if (subError || !subRow) {
      console.error('[supabase] speaking_submissions insert failed:', subError?.message)
      return
    }

    const dbSubmissionId = subRow.id as string
    console.info(
      `[supabase] speaking_submission saved: ${dbSubmissionId} (mock ref: ${record.submissionId})`,
    )

    // 4. Insert ai_evaluation (submission_id is the DB UUID, not the mock string)
    const { data: evalRow, error: evalError } = await db(this.supabase)
      .from('ai_evaluations')
      .insert({
        submission_id: dbSubmissionId,
        submission_type: 'speaking',
        transcript: record.sttResult.transcript,
        rubric_id: 'rubric-speaking-01',
        scores: record.llmEvalResult.scores,
        total_score: record.llmEvalResult.totalScore,
        normalized_score: record.llmEvalResult.normalizedScore,
        error_tags: record.llmEvalResult.errorTags,
        feedback: record.llmEvalResult.feedback,
        stt_result: record.sttResult,
        pronunciation_result: record.pronunciationResult,
        provider_name: record.llmEvalResult.providerName,
        provider_version: record.llmEvalResult.providerVersion,
        latency_ms: record.llmEvalResult.latencyMs,
        evaluated_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (evalError || !evalRow) {
      console.error('[supabase] ai_evaluations insert failed:', evalError?.message)
      return
    }

    console.info(`[supabase] ai_evaluation saved: ${evalRow.id as string}`)
  }
}
