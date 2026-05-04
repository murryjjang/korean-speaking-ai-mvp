/**
 * Repository factory — returns the appropriate implementation.
 *
 * Phase 6-A: always returns Mock implementations.
 * Phase 6-B: set REPOSITORY_PROVIDER=supabase in environment to switch
 *   to SupabaseRepository implementations (not yet implemented).
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
import type {
  SubmissionRepository,
  EvaluationRepository,
  TeacherReviewRepository,
  MissionRepository,
  StudentRepository,
  ClassRepository,
} from './types'

export function getSubmissionRepository(): SubmissionRepository {
  // Phase 6-B: return new SupabaseSubmissionRepository() when REPOSITORY_PROVIDER=supabase
  return new MockSubmissionRepository()
}

export function getEvaluationRepository(): EvaluationRepository {
  // Phase 6-B: return new SupabaseEvaluationRepository()
  return new MockEvaluationRepository()
}

export function getTeacherReviewRepository(): TeacherReviewRepository {
  // Phase 6-B: return new SupabaseTeacherReviewRepository()
  return new MockTeacherReviewRepository()
}

export function getMissionRepository(): MissionRepository {
  // Phase 6-B: return new SupabaseMissionRepository()
  return new MockMissionRepository()
}

export function getStudentRepository(): StudentRepository {
  // Phase 6-B: return new SupabaseStudentRepository()
  return new MockStudentRepository()
}

export function getClassRepository(): ClassRepository {
  // Phase 6-B: return new SupabaseClassRepository()
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
