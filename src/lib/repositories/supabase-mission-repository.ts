/**
 * Supabase repository for mission submissions.
 * Phase 6-B4: mission_submissions + ai_evaluations insert only.
 *
 * Session management (createSession/getSession/updateSession) delegates to the
 * in-memory mock store — sessions are transient and not persisted to Supabase.
 *
 * createMissionSubmission: persists to mission_submissions then ai_evaluations.
 * Never throws to caller; logs errors so the mock result page always renders.
 */

import { createClient } from '@supabase/supabase-js'
import missionGoalsJson from '@/src/content/mission-goals.json'
import {
  createSession as mockCreateSession,
  getSession as mockGetSession,
  updateSession as mockUpdateSession,
  getMissionSubmission as mockGetMissionSubmission,
} from '@/src/lib/mock/mission-store'
import type { MissionSession, MissionSubmission } from '@/src/types/mission'
import type { MissionRepository } from './types'

type SupabaseClientType = ReturnType<typeof createClient>

// Supabase v2.105.1: without a typed Database generic, Schema resolves to `never`
// in some TypeScript compiler contexts. Casting to `any` avoids the false-negative.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(client: SupabaseClientType): any {
  return client
}

// ── Pilot context bootstrap ─────────────────────────────────────────────────
// No Auth yet. One pilot class + student serve as FK anchors.
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

// Scenario IDs already seeded this process — avoids redundant upserts.
const _seededScenarioIds = new Set<string>()

// Seed scenario row so mission_submissions FK (scenario_id → mission_scenarios.id) doesn't fail.
async function ensureScenario(client: SupabaseClientType, scenarioId: string): Promise<void> {
  if (_seededScenarioIds.has(scenarioId)) return

  const s = missionGoalsJson.find((x) => x.scenarioId === scenarioId)
  if (!s) return

  const { error } = await db(client)
    .from('mission_scenarios')
    .upsert(
      {
        id: s.scenarioId,
        title: s.title,
        situation: s.situation,
        location: s.location,
        persona_id: s.persona.id,
        goals: s.goals,
        success_criteria: s.successCriteria,
        expected_turns: s.expectedTurns,
        difficulty: s.difficulty,
        estimated_minutes: s.estimatedMinutes,
        rubric: s.rubric,
        sample_responses: s.sampleResponses,
        is_active: s.isActive,
        version: 1,
      },
      { onConflict: 'id' },
    )

  if (error) {
    console.warn('[supabase] ensureScenario upsert warn:', error.message)
    return
  }

  _seededScenarioIds.add(scenarioId)
}

// ── SupabaseMissionRepository ────────────────────────────────────────────────

export class SupabaseMissionRepository implements MissionRepository {
  constructor(private readonly supabase: SupabaseClientType) {}

  // Session management delegates to the in-memory mock store.
  // Mission sessions are transient and not persisted to Supabase in Phase 6-B4.
  async createSession(session: MissionSession): Promise<void> {
    mockCreateSession(session)
  }

  async getSession(sessionId: string): Promise<MissionSession | null> {
    return mockGetSession(sessionId) ?? null
  }

  async updateSession(session: MissionSession): Promise<void> {
    mockUpdateSession(session)
  }

  /**
   * Persists a completed mission submission to Supabase.
   * Inserts into mission_submissions then ai_evaluations.
   * Bootstraps pilot class/student/scenario if not present.
   * Never throws — errors are logged and method returns early,
   * leaving the mock store as the source of truth for the result page.
   */
  async createMissionSubmission(data: MissionSubmission): Promise<void> {
    // 1. Ensure pilot FK anchors (class + student)
    const classId = await ensurePilotClass(this.supabase)
    if (!classId) {
      console.error('[supabase] mission_submission save failed')
      return
    }

    const studentId = await ensurePilotStudent(this.supabase, classId)
    if (!studentId) {
      console.error('[supabase] mission_submission save failed')
      return
    }

    // 2. Ensure scenario row exists (FK anchor for mission_submissions)
    await ensureScenario(this.supabase, data.scenarioId)

    // 3. Insert mission_submissions
    const { data: subRow, error: subError } = await db(this.supabase)
      .from('mission_submissions')
      .insert({
        session_id: data.sessionId,
        scenario_id: data.scenarioId,
        student_id: studentId,
        class_id: classId,
        turns: data.turns,
        goals: data.goals,
        status: 'submitted',
        submitted_at: data.submittedAt,
      })
      .select('id')
      .single()

    if (subError || !subRow) {
      console.error('[supabase] mission_submission save failed')
      return
    }

    const dbSubmissionId = subRow.id as string
    console.info(`[supabase] mission_submission saved: ${dbSubmissionId}`)

    // 4. Insert ai_evaluations with mission evaluation data
    const { evaluation } = data
    const { error: evalError } = await db(this.supabase)
      .from('ai_evaluations')
      .insert({
        submission_id: dbSubmissionId,
        submission_type: 'mission',
        scores: {
          missionAchievementRate: evaluation.missionAchievementRate,
          taskCompletion: evaluation.taskCompletion,
          conversationNaturalness: evaluation.conversationNaturalness,
          expressionAppropriateness: evaluation.expressionAppropriateness,
          strengths: evaluation.strengths,
          improvements: evaluation.improvements,
          metadata: { source: 'pilot', mockSubmissionId: data.submissionId },
        },
        total_score: evaluation.overallScore,
        normalized_score: evaluation.overallScore / 100,
        feedback: `강점: ${evaluation.strengths.join(', ')} | 보완: ${evaluation.improvements.join(', ')}`,
        provider_name: evaluation.providerName,
        evaluated_at: evaluation.evaluatedAt,
      })

    if (evalError) {
      console.warn('[supabase] ai_evaluations insert warn:', evalError.message)
    }
  }

  async getMissionSubmission(submissionId: string): Promise<MissionSubmission | null> {
    return mockGetMissionSubmission(submissionId) ?? null
  }
}
