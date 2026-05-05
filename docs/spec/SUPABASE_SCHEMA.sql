-- ============================================================
-- Korean Speaking AI MVP — Supabase Schema DDL
-- Phase 6-A: DDL draft only. Not applied to any live database.
-- Phase 6-B: Run via Supabase Dashboard > SQL Editor.
-- ============================================================

-- Enable UUID extension (usually pre-enabled on Supabase)
create extension if not exists "pgcrypto";

-- ── classes ─────────────────────────────────────────────────────────
create table if not exists classes (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  teacher_id   uuid,                              -- FK → auth.users (Phase 8+, nullable until auth)
  semester     text        not null default '',
  is_active    boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz
);

create index if not exists idx_classes_teacher_id on classes(teacher_id);
create index if not exists idx_classes_is_active  on classes(is_active);

-- ── students ────────────────────────────────────────────────────────
create table if not exists students (
  id                  uuid        primary key default gen_random_uuid(),
  anonymous_id        text        unique not null,     -- display-safe anonymized ID (e.g. 'S-001')
  name                text        not null,
  class_id            uuid        not null references classes(id),
  language_group_id   text        not null default '',  -- refs language-groups.json id
  native_language     text        not null default '',  -- display label (e.g. '베트남어')
  language_group      text        not null default '',  -- category (e.g. 'southeast-asian')
  ui_support_language text        not null default 'ko', -- 'ko'|'en'|'vi'|'th'|'ar'
  enrolled_at         timestamptz not null default now(),
  is_active           boolean     not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz
);

create index if not exists idx_students_class_id       on students(class_id);
create index if not exists idx_students_language_group on students(language_group);
create index if not exists idx_students_is_active      on students(is_active);

-- ── question_sets ───────────────────────────────────────────────────
-- Seeded from src/content/question-sets.json.
create table if not exists question_sets (
  id           text        primary key,                 -- 'qs-diagnostic-01' format preserved
  name         text        not null,
  description  text        not null default '',
  purpose      text        not null
                             check (purpose in ('diagnostic', 'practice', 'post')),
  question_ids jsonb       not null default '[]',       -- QuestionSetItem[]: [{questionId, order}]
  is_active    boolean     not null default true,
  version      integer     not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz
);

-- ── questions ───────────────────────────────────────────────────────
-- Seeded from src/content/questions.json.
create table if not exists questions (
  id                text        primary key,             -- 'q-001' format preserved
  type_id           text        not null default '',
  title             text        not null,
  prompt            text        not null,
  image_url         text,
  prep_time_sec     integer     not null default 30,
  response_time_sec integer     not null default 60,
  difficulty        text        not null
                                  check (difficulty in ('beginner', 'intermediate', 'advanced')),
  is_active         boolean     not null default true,
  version           integer     not null default 1,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz
);

-- ── speaking_submissions ────────────────────────────────────────────
create table if not exists speaking_submissions (
  id              uuid        primary key default gen_random_uuid(),
  student_id      uuid        not null references students(id),
  class_id        uuid        not null references classes(id),
  question_id     text        not null references questions(id),
  question_set_id text                 references question_sets(id),
  audio_url       text,
  duration_sec    integer,
  status          text        not null default 'pending'
                                check (status in (
                                  'pending', 'ai_evaluated',
                                  'teacher_reviewed', 'finalized'
                                )),
  submitted_at    timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

create index if not exists idx_speaking_sub_student_id on speaking_submissions(student_id);
create index if not exists idx_speaking_sub_class_id   on speaking_submissions(class_id);
create index if not exists idx_speaking_sub_status     on speaking_submissions(status);
create index if not exists idx_speaking_sub_submitted  on speaking_submissions(submitted_at desc);

-- ── mission_scenarios ───────────────────────────────────────────────
-- Seeded from src/content/scenarios.json + src/content/mission-goals.json.
create table if not exists mission_scenarios (
  id                text        primary key,             -- 'sc-restaurant-01' format preserved
  title             text        not null,
  situation         text        not null,
  location          text        not null default '',
  persona_id        text        not null default '',     -- refs personas.json id
  goals             jsonb       not null default '[]',   -- MissionGoal[]
  success_criteria  jsonb       not null default '{}',   -- MissionSuccessCriteria
  expected_turns    integer     not null default 10,
  difficulty        text        not null
                                  check (difficulty in ('beginner', 'intermediate', 'advanced')),
  estimated_minutes integer     not null default 10,
  rubric            jsonb       not null default '{}',   -- MissionRubric
  sample_responses  jsonb       not null default '[]',   -- MissionSampleResponse[]
  is_active         boolean     not null default true,
  version           integer     not null default 1,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz
);

-- ── mission_submissions ─────────────────────────────────────────────
create table if not exists mission_submissions (
  id           uuid        primary key default gen_random_uuid(),
  session_id   text        not null,                    -- client-generated session ID
  scenario_id  text        not null references mission_scenarios(id),
  student_id   uuid        not null references students(id),
  class_id     uuid        not null references classes(id),
  turns        jsonb       not null default '[]',        -- MissionTurn[]
  goals        jsonb       not null default '[]',        -- MissionGoalState[]
  status       text        not null default 'in_progress'
                             check (status in ('in_progress', 'submitted')),
  submitted_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz
);

create index if not exists idx_mission_sub_student_id  on mission_submissions(student_id);
create index if not exists idx_mission_sub_scenario_id on mission_submissions(scenario_id);
create index if not exists idx_mission_sub_status      on mission_submissions(status);
create index if not exists idx_mission_sub_session_id  on mission_submissions(session_id);

-- ── ai_evaluations ──────────────────────────────────────────────────
-- Stores evaluation results for both speaking and mission submissions.
-- submission_type discriminates which table submission_id references.
create table if not exists ai_evaluations (
  id                   uuid        primary key default gen_random_uuid(),
  submission_id        uuid        not null,
  submission_type      text        not null
                                     check (submission_type in ('speaking', 'mission')),
  transcript           text,
  rubric_id            text,
  rubric_version       integer,
  scores               jsonb       not null default '[]', -- LLMEvalScore[]
  total_score          numeric,
  normalized_score     numeric,
  error_tags           jsonb       not null default '[]', -- ErrorTag[]
  feedback             text,
  stt_result           jsonb,       -- STTResult (speaking only)
  pronunciation_result jsonb,       -- PronunciationResult (speaking only)
  provider_name        text        not null default 'mock',
  provider_version     text,
  latency_ms           integer,
  evaluated_at         timestamptz not null default now(),
  created_at           timestamptz not null default now()
);

create index if not exists idx_ai_eval_submission_id   on ai_evaluations(submission_id);
create index if not exists idx_ai_eval_submission_type on ai_evaluations(submission_type);
create index if not exists idx_ai_eval_evaluated_at    on ai_evaluations(evaluated_at desc);

-- ── teacher_reviews ─────────────────────────────────────────────────
create table if not exists teacher_reviews (
  id                 uuid        primary key default gen_random_uuid(),
  submission_id      uuid        not null,
  submission_type    text        not null
                                   check (submission_type in ('speaking', 'mission')),
  teacher_id         uuid,                               -- nullable until Supabase Auth
  ai_evaluation_id   uuid                references ai_evaluations(id),
  scores             jsonb       not null default '{}',  -- Record<rubricItemId, score>
  total_score        numeric,
  normalized_score   numeric,
  adjustment_reasons text[]      not null default '{}',
  public_comment     text,
  private_note       text,
  strengths          text,
  improvements       text,
  next_activity      text,
  is_finalized       boolean     not null default false,
  finalized_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz
);

create index if not exists idx_teacher_review_submission_id on teacher_reviews(submission_id);
create index if not exists idx_teacher_review_teacher_id    on teacher_reviews(teacher_id);
create index if not exists idx_teacher_review_is_finalized  on teacher_reviews(is_finalized);

-- ── provider_events ─────────────────────────────────────────────────
-- API call log for observability. Consider PII in request/response payloads.
-- Phase 8-E: added status, model, request_id, question_id, error_code, metadata columns.
create table if not exists provider_events (
  id               uuid        primary key default gen_random_uuid(),
  provider_type    text        not null
                                 check (provider_type in (
                                   'stt', 'tts', 'pronunciation', 'llm-eval', 'conversation'
                                 )),
  provider_name    text        not null,
  status           text,       -- 'success' | 'fallback' | 'error'
  submission_id    uuid,
  student_id       uuid,
  question_id      text,       -- question/scenario ID for correlation
  model            text,       -- model name/version (e.g. 'whisper-1')
  request_id       text,       -- external API request ID for tracing
  request_payload  jsonb,
  response_payload jsonb,
  latency_ms       integer,
  is_error         boolean     not null default false,
  error_code       text,       -- short error key (e.g. 'provider_error', 'timeout')
  error_message    text,
  metadata         jsonb,      -- catch-all for provider-specific extras
  created_at       timestamptz not null default now()
);

create index if not exists idx_provider_events_type          on provider_events(provider_type);
create index if not exists idx_provider_events_provider_name on provider_events(provider_name);
create index if not exists idx_provider_events_status        on provider_events(status);
create index if not exists idx_provider_events_submission_id on provider_events(submission_id);
create index if not exists idx_provider_events_question_id   on provider_events(question_id);
create index if not exists idx_provider_events_created_at    on provider_events(created_at desc);

-- ── content_versions ────────────────────────────────────────────────
-- Immutable audit trail of content changes.
create table if not exists content_versions (
  id           uuid        primary key default gen_random_uuid(),
  content_type text        not null
                             check (content_type in (
                               'question', 'question_set', 'scenario', 'rubric', 'persona'
                             )),
  content_id   text        not null,
  version      integer     not null,
  data         jsonb       not null,                     -- full content snapshot at this version
  changed_by   uuid,                                     -- nullable until auth
  created_at   timestamptz not null default now(),
  unique (content_type, content_id, version)
);

create index if not exists idx_content_versions_type_id on content_versions(content_type, content_id);

-- ── Row Level Security ───────────────────────────────────────────────
-- Phase 6-B: uncomment after Supabase Auth is wired up.
-- Until then, access is controlled by service role key only.
--
-- alter table classes              enable row level security;
-- alter table students             enable row level security;
-- alter table question_sets        enable row level security;
-- alter table questions            enable row level security;
-- alter table speaking_submissions enable row level security;
-- alter table mission_scenarios    enable row level security;
-- alter table mission_submissions  enable row level security;
-- alter table ai_evaluations       enable row level security;
-- alter table teacher_reviews      enable row level security;
-- alter table provider_events      enable row level security;
-- alter table content_versions     enable row level security;

-- ── Phase 8-G Notes — ai_evaluations schema change ─────────────────
-- Phase 8-G stores SpeakingEvalDetail (rich LLM output) in the `scores` JSONB
-- column instead of the previous LLMEvalScore[] array. The shape changes from:
--   scores: [{ rubricItemId, score, rationale }, ...]
-- to:
--   scores: { overall_score, task_completion_score, fluency_score, grammar_score,
--             vocabulary_score, pronunciation_reference_score?, strengths[],
--             improvements[], corrected_answer, teacher_note,
--             learner_feedback_ko, learner_feedback_simple, raw_provider? }
--
-- No DDL migration is required — `scores` is already JSONB and accepts any shape.
-- No DB manual apply needed for Phase 8-G.
-- provider_events.provider_type='llm-eval' is used (matches existing check constraint).

-- ── Phase 8-E Migration — provider_events new columns ───────────────
-- Run this block in Supabase Dashboard > SQL Editor if provider_events
-- already exists (Phase 6-B or later). Safe to re-run (IF NOT EXISTS guard
-- is not available for ADD COLUMN in PostgreSQL, but duplicate column errors
-- are harmless — just skip if column already exists).
--
-- alter table provider_events add column if not exists status       text;
-- alter table provider_events add column if not exists question_id  text;
-- alter table provider_events add column if not exists model        text;
-- alter table provider_events add column if not exists request_id   text;
-- alter table provider_events add column if not exists error_code   text;
-- alter table provider_events add column if not exists metadata     jsonb;
-- create index if not exists idx_provider_events_provider_name on provider_events(provider_name);
-- create index if not exists idx_provider_events_status        on provider_events(status);
-- create index if not exists idx_provider_events_question_id   on provider_events(question_id);

-- ── Phase 9-A Migration — user_profiles (Supabase Auth role mapping) ─
-- Run this block in Supabase Dashboard > SQL Editor.
-- Prerequisite: Supabase Auth must be enabled on the project.
-- Safe to re-run (create if not exists guards).
--
-- create table if not exists user_profiles (
--   id           uuid        primary key default gen_random_uuid(),
--   user_id      uuid        not null references auth.users(id) on delete cascade,
--   role         text        not null
--                              check (role in ('student', 'teacher', 'admin')),
--   display_name text,
--   student_id   uuid,       -- nullable FK → students(id); set when role='student'
--   created_at   timestamptz not null default now(),
--   updated_at   timestamptz not null default now()
-- );
--
-- create unique index if not exists idx_user_profiles_user_id on user_profiles(user_id);
-- create index if not exists idx_user_profiles_role       on user_profiles(role);
-- create index if not exists idx_user_profiles_student_id on user_profiles(student_id);
--
-- Row Level Security (enable after table is created):
-- alter table user_profiles enable row level security;
--
-- Policy: each user can read only their own profile (anon key safe).
-- create policy "own profile read"
--   on user_profiles for select
--   using (auth.uid() = user_id);
--
-- Policy: each user can update their own profile (display_name only; role must be set by admin).
-- create policy "own profile update"
--   on user_profiles for update
--   using (auth.uid() = user_id)
--   with check (auth.uid() = user_id);
--
-- Note: role assignment must be done by a privileged operation (service role or
-- Supabase Dashboard). Users cannot self-assign roles via the anon key.
--
-- Manual steps after applying:
--   1. Create auth users via Supabase Dashboard > Authentication > Users.
--   2. Insert user_profiles rows with correct role for each user.
--      Example:
--        INSERT INTO user_profiles (user_id, role, display_name)
--        VALUES ('<auth-user-uuid>', 'teacher', '김선생');
--   3. Test login via /login with the created credentials.
