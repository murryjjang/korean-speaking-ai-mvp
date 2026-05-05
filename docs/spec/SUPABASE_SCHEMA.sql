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
-- STATUS: 수동 적용 완료 (2026-05-05)
--
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
-- ── RLS 활성화 ───────────────────────────────────────────────────────────────
-- alter table user_profiles enable row level security;
--
-- ── 안전 정책: 본인 프로필 읽기만 허용 (anon key 안전) ─────────────────────
-- STATUS: 수동 적용 완료 (2026-05-05)
--
-- create policy "own profile read"
--   on user_profiles for select
--   using (auth.uid() = user_id);
--
-- ── IMPORTANT: UPDATE 정책은 의도적으로 제외함 ──────────────────────────────
-- 이유: Postgres/Supabase RLS는 row-level이며 column-level이 아님.
--   UPDATE 정책에 with check (auth.uid() = user_id)만 지정하면
--   사용자가 role, student_id 등 민감 컬럼도 변경할 수 있어 보안 취약점이 됨.
--
-- 안전한 display_name UPDATE 구현 방법 (Phase 9-C 적용 예정):
--   option A) Postgres 함수(SECURITY DEFINER) + 화이트리스트 파라미터로만 update
--   option B) Supabase Edge Function에서 admin key로 제한된 컬럼만 업데이트
--   현재는 display_name 수정 기능 없이 운영 (관리자가 Dashboard에서 직접 변경).
--
-- ── 계정/역할 운영 절차 ──────────────────────────────────────────────────────
--
-- 1. Supabase Dashboard > Authentication > Users > "Add user" 클릭
--    이메일/비밀번호 입력 → 생성 → 생성된 auth user UUID를 복사
--
-- 2. user_profiles에 역할 부여 (SQL Editor 또는 Table Editor에서 실행)
--
--    [학습자 계정 예시]
--    INSERT INTO user_profiles (user_id, role, display_name, student_id)
--    VALUES (
--      '<auth-user-uuid>',     -- Supabase Dashboard에서 복사한 UUID
--      'student',
--      '홍길동',                -- 표시 이름 (선택)
--      '<students-table-uuid>' -- students 테이블의 id (선택, 연결 시)
--    );
--
--    [교수자 계정 예시]
--    INSERT INTO user_profiles (user_id, role, display_name)
--    VALUES (
--      '<auth-user-uuid>',
--      'teacher',
--      '김선생'
--    );
--
--    [관리자 계정 예시]
--    INSERT INTO user_profiles (user_id, role, display_name)
--    VALUES (
--      '<auth-user-uuid>',
--      'admin',
--      '운영자'
--    );
--
-- 3. /login에서 이메일/비밀번호로 로그인 확인
--    - student → /student redirect
--    - teacher / admin → /teacher redirect
--    - user_profiles row 없으면 → /role-missing redirect
--
-- ── 주의사항 ──────────────────────────────────────────────────────────────────
-- - 실제 UUID/이메일/비밀번호는 이 파일에 기록하지 말 것
-- - role 변경은 반드시 Supabase Dashboard 또는 service_role 권한으로만 수행
-- - anon key로는 INSERT/UPDATE 불가 (RLS가 막음)
-- - 학습자 계정을 대량 생성할 경우 service_role key를 사용하는 별도 seed 스크립트 작성 권장

-- ── Phase 9-C 계획 — RLS 전면 고도화 (배포 전 적용 예정) ────────────────────
--
-- 아래 정책은 기존 server action / repository 코드와의 충돌 여부를 검토한 후
-- Phase 9-C 또는 배포 전 운영 안정화 단계에서 단계적으로 적용한다.
-- 현재는 SQL 블록만 준비하고 실제 적용하지 않음 (주석 처리 유지).
--
-- ▸ speaking_submissions
--   - student는 자기 제출만 조회
--   - teacher / admin은 전체 조회
--   ※ 현재 student_id가 auth user가 아닌 students 테이블 UUID → user_profiles.student_id 조인 필요
--
-- create policy "student own submissions read"
--   on speaking_submissions for select
--   using (
--     student_id = (
--       select student_id from user_profiles
--       where user_id = auth.uid()
--     )
--   );
--
-- create policy "teacher all submissions read"
--   on speaking_submissions for select
--   using (
--     exists (
--       select 1 from user_profiles
--       where user_id = auth.uid()
--         and role in ('teacher', 'admin')
--     )
--   );
--
-- ▸ ai_evaluations
--   - student는 자기 제출의 평가만 조회
--   - teacher / admin은 전체 조회
--
-- create policy "student own ai_evaluations read"
--   on ai_evaluations for select
--   using (
--     submission_id in (
--       select id from speaking_submissions
--       where student_id = (
--         select student_id from user_profiles where user_id = auth.uid()
--       )
--     )
--   );
--
-- create policy "teacher all ai_evaluations read"
--   on ai_evaluations for select
--   using (
--     exists (
--       select 1 from user_profiles
--       where user_id = auth.uid() and role in ('teacher', 'admin')
--     )
--   );
--
-- ▸ teacher_reviews
--   - student는 자기 제출의 리뷰만 조회 (교수자 피드백 공개 여부는 운영 정책에 따라 결정)
--   - teacher / admin은 전체 조회 + INSERT + UPDATE
--
-- ▸ mission_submissions
--   - speaking_submissions과 동일한 student/teacher 분리 정책 적용 예정
--
-- ▸ provider_events
--   - 일반 학습자에게 직접 노출하지 않음 (internal 로깅용)
--   - student / teacher 모두 select 정책 없음 → anon key로 접근 불가
--   - service_role key 또는 Dashboard에서만 조회
--
-- ▸ recordings (Supabase Storage bucket)
--   - 현재 public URL 정책: audio_url이 공개 URL로 저장됨
--   - 운영 전 재검토 필요: signed URL(만료 시간 있음) 방식으로 전환 고려
--   - Phase 9-C에서 bucket policy를 authenticated-only로 변경하고
--     다운로드 시 signed URL 생성으로 전환 예정
--
-- ── 적용 전 검토 사항 ──────────────────────────────────────────────────────────
-- 1. 현재 server actions / repositories는 SUPABASE_ANON_KEY를 사용함.
--    RLS 활성화 시 anon key로 INSERT/SELECT가 가능해야 함.
--    → INSERT 정책(student가 자기 제출 insert 가능)도 함께 추가 필요.
-- 2. teacher dashboard DbSubmissionsSection은 anon key로 read — teacher RLS 정책 필요.
-- 3. service_role key 사용 금지 방침 재확인 (현재 코드에 미포함).
-- 4. 각 정책 적용 후 기존 smoke test + 실제 제출 흐름 재검증 필수.
