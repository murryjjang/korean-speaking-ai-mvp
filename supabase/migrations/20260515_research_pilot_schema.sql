-- v1.1 단계 10-1: 시험운영(pilot)용 데이터 로깅 스키마.
--
-- 4~5명 학습자 1~2주 시험운영을 위한 격리된 테이블 5개. 기존 학습자 테이블
-- (user_profiles, classes, students, speaking_submissions 등)과 분리해 운영한다.
--
-- 실행: Supabase SQL Editor에서 이 파일 내용을 그대로 붙여넣어 실행. 본 프로젝트는
-- 자동 마이그레이션 러너를 사용하지 않으므로 운영자가 직접 적용한다.
--
-- 정책:
-- - 시험운영 규모(4~5명)에서 RLS는 최소로만 적용한다. INSERT는 anon 허용(서버
--   라우트에서 fail-silent 로깅), SELECT/UPDATE/DELETE는 service_role만 허용한다.
-- - 관리자 페이지는 SUPABASE_SERVICE_ROLE_KEY로 서버에서 직접 조회하므로 RLS를
--   우회한다. 학습자 본인 데이터 조회는 서버 라우트에서 participant_code 세션을
--   확인한 뒤 service_role로 조회한다.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) research_participants — 사전 발급 참여자 ID
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.research_participants (
  id uuid primary key default gen_random_uuid(),
  participant_code text not null unique,         -- 예: P001, P002
  pin_hash text,                                 -- 4자리 PIN의 해시(SHA-256, optional)
  name text,
  nationality text,
  korean_level text,                             -- 예: TOPIK 1, 2, ...
  mother_tongue text,
  enrolled_at timestamptz not null default now(),
  consent_status boolean not null default false,
  consent_at timestamptz,
  notes text
);

create index if not exists idx_research_participants_code
  on public.research_participants(participant_code);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) research_sessions — 학습 세션 (모드별)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.research_sessions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.research_participants(id) on delete cascade,
  session_started_at timestamptz not null default now(),
  session_ended_at timestamptz,
  mode text not null,                            -- 'free_conversation' | 'q1_repeat' | 'q2_describe' | 'q3_picture' | 'q4_dialogue' | 'presentation' | 'reading'
  meta_json jsonb not null default '{}'::jsonb   -- {personaId, topic, questionId, ...}
);

create index if not exists idx_research_sessions_participant
  on public.research_sessions(participant_id, session_started_at desc);
create index if not exists idx_research_sessions_mode
  on public.research_sessions(mode);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) research_utterances — 발화 (학습자·NPC)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.research_utterances (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.research_sessions(id) on delete cascade,
  turn_number int not null,
  speaker text not null,                         -- 'learner' | 'npc'
  text text not null,
  audio_url text,
  response_time_ms int,
  tool_calls jsonb,                              -- LLM function calling 기록
  meta_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_research_utterances_session
  on public.research_utterances(session_id, turn_number);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) research_assessments — 평가 결과 (모드별 점수·피드백)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.research_assessments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.research_sessions(id) on delete cascade,
  mode text not null,
  score_total numeric,
  scores_detail jsonb not null default '{}'::jsonb,  -- 발음·유창성·문법·어휘 등
  feedback_text text,
  pronunciation_data jsonb,                          -- Azure PA raw
  created_at timestamptz not null default now()
);

create index if not exists idx_research_assessments_session
  on public.research_assessments(session_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) research_consent_logs — 동의 이력 (감사용)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.research_consent_logs (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.research_participants(id) on delete cascade,
  consent_version text not null,                 -- 예: 'v1.0'
  consent_text_hash text not null,               -- 본문 SHA-256
  consented_at timestamptz not null default now(),
  ip_address text,                                -- 익명화(앞 24비트만 보존)
  user_agent text
);

create index if not exists idx_research_consent_participant
  on public.research_consent_logs(participant_id, consented_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS — 시험운영 규모용 최소 정책
-- ─────────────────────────────────────────────────────────────────────────────
-- INSERT는 anon에게 허용해 클라이언트/anon 라우트에서 로깅 가능하게 한다.
-- SELECT/UPDATE/DELETE는 default deny — 서버 라우트가 service_role 키로 처리한다.
alter table public.research_participants  enable row level security;
alter table public.research_sessions      enable row level security;
alter table public.research_utterances    enable row level security;
alter table public.research_assessments   enable row level security;
alter table public.research_consent_logs  enable row level security;

drop policy if exists "research_participants insert (anon)"   on public.research_participants;
drop policy if exists "research_sessions insert (anon)"       on public.research_sessions;
drop policy if exists "research_utterances insert (anon)"     on public.research_utterances;
drop policy if exists "research_assessments insert (anon)"    on public.research_assessments;
drop policy if exists "research_consent_logs insert (anon)"   on public.research_consent_logs;

create policy "research_participants insert (anon)"
  on public.research_participants for insert
  to anon with check (true);
create policy "research_sessions insert (anon)"
  on public.research_sessions for insert
  to anon with check (true);
create policy "research_utterances insert (anon)"
  on public.research_utterances for insert
  to anon with check (true);
create policy "research_assessments insert (anon)"
  on public.research_assessments for insert
  to anon with check (true);
create policy "research_consent_logs insert (anon)"
  on public.research_consent_logs for insert
  to anon with check (true);

-- SELECT/UPDATE/DELETE 는 default deny. 서버에서 service_role 키로 처리.
