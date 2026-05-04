/**
 * Repository factory — returns the appropriate implementation.
 *
 * Phase 6-A: always returns Mock implementations.
 * Phase 6-B1: provider selection structure added. Supabase client initialized
 *   but no Supabase implementations exist yet — all factories fall back to mock.
 * Phase 6-B2: SupabaseSubmissionRepository + SupabaseEvaluationRepository
 *   activated for speaking_submissions + ai_evaluations persistence.
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
import {
  SupabaseSubmissionRepository,
  SupabaseEvaluationRepository,
} from './supabase-submission-repository'
import { SupabaseTeacherReviewRepository } from './supabase-teacher-review-repository'
import { SupabaseMissionRepository } from './supabase-mission-repository'
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

export function getSubmissionRepository(): SubmissionRepository {
  if (resolvedProvider() === 'supabase') {
    return new SupabaseSubmissionRepository(getSupabaseClient()!)
  }
  return new MockSubmissionRepository()
}

export function getEvaluationRepository(): EvaluationRepository {
  if (resolvedProvider() === 'supabase') {
    return new SupabaseEvaluationRepository(getSupabaseClient()!)
  }
  return new MockEvaluationRepository()
}

export function getTeacherReviewRepository(): TeacherReviewRepository {
  if (resolvedProvider() === 'supabase') {
    return new SupabaseTeacherReviewRepository(getSupabaseClient()!)
  }
  return new MockTeacherReviewRepository()
}

export function getMissionRepository(): MissionRepository {
  if (resolvedProvider() === 'supabase') {
    return new SupabaseMissionRepository(getSupabaseClient()!)
  }
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
