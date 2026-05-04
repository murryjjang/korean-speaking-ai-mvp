/**
 * Repository factory — returns the appropriate implementation.
 *
 * Phase 6-A: always returns Mock implementations.
 * Phase 6-B1: provider selection structure added. Supabase client initialized
 *   but no Supabase implementations exist yet — all factories fall back to mock.
 * Phase 6-B2+: Supabase implementations added per repository type.
 *
 * Callers import from here, never from specific implementation files.
 * Swap the implementation here without touching any page or action.
 */

import {
  MockSubmissionRepository,
  MockEvaluationRepository,
  MockTeacherReviewRepository,
  MockMissionRepository,
  MockStudentRepository,
  MockClassRepository,
} from './mock-repository'
import { getSupabaseClient } from '@/src/lib/supabase/client'
import type {
  SubmissionRepository,
  EvaluationRepository,
  TeacherReviewRepository,
  MissionRepository,
  StudentRepository,
  ClassRepository,
} from './types'

// Returns 'supabase' only when REPOSITORY_PROVIDER=supabase AND the client is ready.
// Falls back to 'mock' silently when env vars are missing.
function resolvedProvider(): 'mock' | 'supabase' {
  if (process.env.REPOSITORY_PROVIDER !== 'supabase') return 'mock'
  if (getSupabaseClient() === null) {
    console.warn(
      '[repository] REPOSITORY_PROVIDER=supabase but Supabase client is not configured ' +
        '(NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing). ' +
        'Falling back to mock.',
    )
    return 'mock'
  }
  return 'supabase'
}

// Emits a one-time console.warn per repository name when supabase is selected
// but the implementation does not exist yet (Phase 6-B2+).
const _notImplementedWarned = new Set<string>()
function warnNotImplemented(name: string): void {
  if (_notImplementedWarned.has(name)) return
  _notImplementedWarned.add(name)
  console.warn(
    `[repository] Supabase${name} is not yet implemented (Phase 6-B2+). Falling back to mock.`,
  )
}

export function getSubmissionRepository(): SubmissionRepository {
  // Phase 6-B2: replace with SupabaseSubmissionRepository when available
  if (resolvedProvider() === 'supabase') warnNotImplemented('SubmissionRepository')
  return new MockSubmissionRepository()
}

export function getEvaluationRepository(): EvaluationRepository {
  // Phase 6-B2: replace with SupabaseEvaluationRepository when available
  if (resolvedProvider() === 'supabase') warnNotImplemented('EvaluationRepository')
  return new MockEvaluationRepository()
}

export function getTeacherReviewRepository(): TeacherReviewRepository {
  // Phase 6-B3: replace with SupabaseTeacherReviewRepository when available
  if (resolvedProvider() === 'supabase') warnNotImplemented('TeacherReviewRepository')
  return new MockTeacherReviewRepository()
}

export function getMissionRepository(): MissionRepository {
  // Phase 6-B4: replace with SupabaseMissionRepository when available
  if (resolvedProvider() === 'supabase') warnNotImplemented('MissionRepository')
  return new MockMissionRepository()
}

export function getStudentRepository(): StudentRepository {
  return new MockStudentRepository()
}

export function getClassRepository(): ClassRepository {
  return new MockClassRepository()
}

export type {
  SubmissionRepository,
  EvaluationRepository,
  TeacherReviewRepository,
  MissionRepository,
  StudentRepository,
  ClassRepository,
} from './types'

export type {
  SubmissionFilter,
  CreateSpeakingSubmissionInput,
  CreateAIEvaluationInput,
  SpeakingEvalRecord,
} from './types'
