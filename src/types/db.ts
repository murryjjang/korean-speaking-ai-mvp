/**
 * Supabase DB row types — snake_case, mirrors table columns.
 * Phase 6-A: type definitions only. No Supabase client instantiated.
 * Phase 6-B: SupabaseRepository implementations will use these types.
 */

export type ClassRow = {
  id: string
  name: string
  teacher_id: string | null
  semester: string
  is_active: boolean
  created_at: string
  updated_at: string | null
}

export type StudentRow = {
  id: string
  anonymous_id: string
  name: string
  class_id: string
  language_group_id: string
  native_language: string
  language_group: string
  ui_support_language: string
  enrolled_at: string
  is_active: boolean
  created_at: string
  updated_at: string | null
}

export type QuestionSetRow = {
  id: string
  name: string
  description: string
  purpose: 'diagnostic' | 'practice' | 'post'
  question_ids: unknown // jsonb: QuestionSetItem[]
  is_active: boolean
  version: number
  created_at: string
  updated_at: string | null
}

export type QuestionRow = {
  id: string
  type_id: string
  title: string
  prompt: string
  image_url: string | null
  prep_time_sec: number
  response_time_sec: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  is_active: boolean
  version: number
  created_at: string
  updated_at: string | null
}

export type SpeakingSubmissionRow = {
  id: string
  student_id: string
  class_id: string
  question_id: string
  question_set_id: string | null
  audio_url: string | null
  duration_sec: number | null
  status: 'pending' | 'ai_evaluated' | 'teacher_reviewed' | 'finalized'
  submitted_at: string
  created_at: string
  updated_at: string | null
}

export type MissionScenarioRow = {
  id: string
  title: string
  situation: string
  location: string
  persona_id: string
  goals: unknown // jsonb: MissionGoal[]
  success_criteria: unknown // jsonb: MissionSuccessCriteria
  expected_turns: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimated_minutes: number
  rubric: unknown // jsonb: MissionRubric
  sample_responses: unknown // jsonb: MissionSampleResponse[]
  is_active: boolean
  version: number
  created_at: string
  updated_at: string | null
}

export type MissionSubmissionRow = {
  id: string
  session_id: string
  scenario_id: string
  student_id: string
  class_id: string
  turns: unknown // jsonb: MissionTurn[]
  goals: unknown // jsonb: MissionGoalState[]
  status: 'in_progress' | 'submitted'
  submitted_at: string | null
  created_at: string
  updated_at: string | null
}

export type AIEvaluationRow = {
  id: string
  submission_id: string
  submission_type: 'speaking' | 'mission'
  transcript: string | null
  rubric_id: string | null
  rubric_version: number | null
  scores: unknown // jsonb: LLMEvalScore[] or mission rubric scores
  total_score: number | null
  normalized_score: number | null
  error_tags: unknown // jsonb: ErrorTag[]
  feedback: string | null
  stt_result: unknown // jsonb: STTResult (speaking only)
  pronunciation_result: unknown // jsonb: PronunciationResult (speaking only)
  provider_name: string
  provider_version: string | null
  latency_ms: number | null
  evaluated_at: string
  created_at: string
}

export type TeacherReviewRow = {
  id: string
  submission_id: string
  submission_type: 'speaking' | 'mission'
  teacher_id: string | null
  ai_evaluation_id: string | null
  scores: unknown // jsonb: RubricItemScore[]
  total_score: number | null
  normalized_score: number | null
  adjustment_reasons: string[]
  public_comment: string | null
  private_note: string | null
  strengths: string | null
  improvements: string | null
  next_activity: string | null
  is_finalized: boolean
  finalized_at: string | null
  created_at: string
  updated_at: string | null
}

export type ProviderEventRow = {
  id: string
  provider_type: 'stt' | 'tts' | 'pronunciation' | 'llm-eval' | 'conversation'
  provider_name: string
  submission_id: string | null
  student_id: string | null
  request_payload: unknown // jsonb
  response_payload: unknown // jsonb
  latency_ms: number | null
  is_error: boolean
  error_message: string | null
  created_at: string
}

export type ContentVersionRow = {
  id: string
  content_type: 'question' | 'question_set' | 'scenario' | 'rubric' | 'persona'
  content_id: string
  version: number
  data: unknown // jsonb: full content snapshot
  changed_by: string | null
  created_at: string
}
