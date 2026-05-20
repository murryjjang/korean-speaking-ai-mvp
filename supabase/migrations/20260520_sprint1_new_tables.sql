-- ============================================================
-- KDLI Korean MVP — Sprint 1 신규 테이블 마이그레이션 (v1)
-- 작성: 2026-05-20 · 적용 모드: A (파일만 작성, 적용 보류)
--
-- 결정 반영 (사용자 확정):
--  1) user_id FK → auth.users(id) (인증 앱 모델).
--     'ALTER users'는 user_profiles에 컬럼 추가.
--  2) content_id FK → public.questions(id) [text PK].
--     'ALTER contents'는 questions에 컬럼 추가.
--     근거: 낭독(qt-reading)·발표/자료설명(qt-material-desc)·듣고답하기·대화미션이
--     모두 questions 행(text PK). 자유대화는 persona+자유 topic이라 고정 content
--     행이 없어 태깅 대상이 아님.
--  3) pause_count → speaking_submissions.
--  4) RLS: 표준 auth.uid() 모델 (to authenticated).
--     본인 데이터 + group instructor/admin + 전역 teacher/admin.
--
-- 사전 의존(프로덕션에 이미 존재해야 함): auth.users, public.user_profiles,
--   public.questions, public.speaking_submissions.
-- 적용: 본 프로젝트는 자동 마이그레이션 러너 없음 → Supabase SQL Editor에서 수동 적용
--   (별도 결정 후). 모든 신규 테이블은 additive, ALTER는 nullable/default 보유 →
--   기존 행·배포 앱(현재 commit)에 무해.
-- 재실행 안전: create table if not exists / add column if not exists /
--   drop policy if exists 가드 사용.
-- ============================================================

create extension if not exists "pgcrypto";

-- ════════════════════════════════════════════════════════════
-- 신규 테이블
-- ════════════════════════════════════════════════════════════

-- ── 2. vocabulary_terms (어휘 마스터) ───────────────────────
--    content_vocabulary·vocab_cards가 참조하므로 먼저 생성.
create table if not exists public.vocabulary_terms (
  id         uuid        primary key default gen_random_uuid(),
  term       text        not null unique,
  cefr_level text        not null check (cefr_level in ('A1','A2','B1','B2','C1','C2')),
  created_at timestamptz not null default now()
);

create index if not exists idx_vocabulary_terms_cefr on public.vocabulary_terms(cefr_level);

-- ── 1. content_tags (콘텐츠 태깅, content당 1행) ────────────
create table if not exists public.content_tags (
  id                    uuid        primary key default gen_random_uuid(),
  content_id            text        not null unique
                                       references public.questions(id) on delete cascade,
  topic_tags            text[]      not null,
  cefr_level            text        not null check (cefr_level in ('A1','A2','B1','B2','C1','C2')),
  register              text        not null
                                       check (register in (
                                         'casual-banmal','polite-spoken','formal-spoken',
                                         'formal-written','instructional'
                                       )),
  register_consistency  text        not null default 'consistent'
                                       check (register_consistency in ('consistent','mixed')),
  learning_objective    text        not null,
  prompt_version        text        not null default 'v3',
  tagged_at             timestamptz not null default now(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_content_tags_cefr     on public.content_tags(cefr_level);
create index if not exists idx_content_tags_register on public.content_tags(register);
create index if not exists idx_content_tags_topics   on public.content_tags using gin (topic_tags);

-- ── 3. content_vocabulary (콘텐츠 ↔ 어휘 junction) ──────────
create table if not exists public.content_vocabulary (
  id         uuid        primary key default gen_random_uuid(),
  content_id text        not null references public.questions(id) on delete cascade,
  term_id    uuid        not null references public.vocabulary_terms(id) on delete cascade,
  category   text        not null check (category in ('basic','core','challenging')),
  created_at timestamptz not null default now(),
  unique (content_id, term_id, category)
);

create index if not exists idx_content_vocab_content  on public.content_vocabulary(content_id);
create index if not exists idx_content_vocab_term     on public.content_vocabulary(term_id);
create index if not exists idx_content_vocab_category on public.content_vocabulary(category);

-- ── 4. pronunciation_focus (발음 포커스) ────────────────────
--    term은 FK 아님 — 어휘 마스터에 없는 grammatical endings도 허용.
create table if not exists public.pronunciation_focus (
  id         uuid        primary key default gen_random_uuid(),
  content_id text        not null references public.questions(id) on delete cascade,
  term       text        not null,
  rule       text        not null,   -- 연음/격음화/구개음화/경음화/비음화/ㅎ 약화 등 (자유 텍스트)
  created_at timestamptz not null default now()
);

create index if not exists idx_pron_focus_content on public.pronunciation_focus(content_id);

-- ── 5. vocab_cards (SM-2 간격 반복) ─────────────────────────
create table if not exists public.vocab_cards (
  id               uuid          primary key default gen_random_uuid(),
  user_id          uuid          not null references auth.users(id) on delete cascade,
  term_id          uuid          not null references public.vocabulary_terms(id) on delete cascade,
  added_at         timestamptz   not null default now(),
  ease_factor      numeric(4,2)  not null default 2.50 check (ease_factor >= 1.30),
  interval_days    integer       not null default 1    check (interval_days >= 0),
  repetitions      integer       not null default 0    check (repetitions >= 0),
  last_quality     smallint               check (last_quality between 0 and 5),
  last_reviewed_at timestamptz,
  next_review_at   timestamptz   not null default now(),
  created_at       timestamptz   not null default now(),
  updated_at       timestamptz   not null default now(),
  unique (user_id, term_id)
);

create index if not exists idx_vocab_cards_user      on public.vocab_cards(user_id);
create index if not exists idx_vocab_cards_user_next on public.vocab_cards(user_id, next_review_at);

-- ── 6. model_answers (모범 답안, content×cefr당 1행) ────────
create table if not exists public.model_answers (
  id           uuid        primary key default gen_random_uuid(),
  content_id   text        not null references public.questions(id) on delete cascade,
  cefr_level   text        not null check (cefr_level in ('A1','A2','B1','B2','C1','C2')),
  answer_text  text        not null,
  audio_url    text,
  audio_voice  text,
  generated_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (content_id, cefr_level)
);

create index if not exists idx_model_answers_content on public.model_answers(content_id);

-- ── 7. groups (학습 그룹) ───────────────────────────────────
create table if not exists public.groups (
  id                uuid        primary key default gen_random_uuid(),
  name              text        not null,
  description       text,
  anonymize_ranking boolean     not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── 8. group_members (그룹 구성원·역할) ─────────────────────
create table if not exists public.group_members (
  id        uuid        primary key default gen_random_uuid(),
  group_id  uuid        not null references public.groups(id) on delete cascade,
  user_id   uuid        not null references auth.users(id) on delete cascade,
  role      text        not null default 'member'
                          check (role in ('member','instructor','admin')),
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create index if not exists idx_group_members_group on public.group_members(group_id);
create index if not exists idx_group_members_user  on public.group_members(user_id);
create index if not exists idx_group_members_role  on public.group_members(role);

-- ── 9. level_tests (레벨 테스트 결과) ───────────────────────
create table if not exists public.level_tests (
  id               uuid          primary key default gen_random_uuid(),
  user_id          uuid          not null references auth.users(id) on delete cascade,
  taken_at         timestamptz   not null default now(),
  estimated_cefr   text          not null check (estimated_cefr in ('A1','A2','B1','B2','C1','C2')),
  confidence_score numeric(3,2)           check (confidence_score between 0 and 1),
  results          jsonb         not null,
  duration_seconds integer,
  created_at       timestamptz   not null default now()
);

create index if not exists idx_level_tests_user      on public.level_tests(user_id);
create index if not exists idx_level_tests_user_date on public.level_tests(user_id, taken_at desc);

-- ── 10. action_log (학습 행동 로그) ─────────────────────────
--    action_type은 text+check (프로젝트 관행). 향후 값 확장 시 check 수정.
create table if not exists public.action_log (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  action_type text        not null
                            check (action_type in (
                              'content_started','content_completed','vocab_reviewed',
                              'level_test_taken','model_answer_played','login','logout',
                              'group_ranking_viewed'
                            )),
  meta        jsonb,
  occurred_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists idx_action_log_user      on public.action_log(user_id);
create index if not exists idx_action_log_type      on public.action_log(action_type);
create index if not exists idx_action_log_user_date on public.action_log(user_id, occurred_at desc);

-- ════════════════════════════════════════════════════════════
-- 기존 테이블 ALTER (additive only)
-- ════════════════════════════════════════════════════════════

-- 'ALTER users' → user_profiles : level_tests 최신 결과 캐시.
alter table public.user_profiles
  add column if not exists current_cefr_level text
    check (current_cefr_level in ('A1','A2','B1','B2','C1','C2'));
alter table public.user_profiles
  add column if not exists current_cefr_updated_at timestamptz;

-- 'ALTER contents' → questions : 태깅 상태 플래그.
alter table public.questions
  add column if not exists is_tagged boolean not null default false;
alter table public.questions
  add column if not exists last_tagged_at timestamptz;

-- pause_count (#5) → speaking_submissions.
alter table public.speaking_submissions
  add column if not exists pause_count integer not null default 0;

-- ════════════════════════════════════════════════════════════
-- RLS — 표준 auth.uid() 모델 (to authenticated)
-- ────────────────────────────────────────────────────────────
-- 권한 헬퍼는 SECURITY DEFINER 함수로 분리해 group_members 자기참조 정책의
-- 무한 재귀(RLS recursion)를 방지한다 (Supabase 권장 패턴).
-- ════════════════════════════════════════════════════════════

-- 전역 teacher/admin 여부
create or replace function public.kdli_is_staff()
  returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_profiles up
    where up.user_id = auth.uid() and up.role in ('teacher','admin')
  );
$$;

-- 호출자가 target 사용자가 속한 그룹의 instructor/admin인가
create or replace function public.kdli_leads_user(target uuid)
  returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.group_members v
    join public.group_members t on v.group_id = t.group_id
    where v.user_id = auth.uid()
      and v.role in ('instructor','admin')
      and t.user_id = target
  );
$$;

-- 호출자가 그룹 g의 구성원인가
create or replace function public.kdli_in_group(g uuid)
  returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = g and gm.user_id = auth.uid()
  );
$$;

-- 호출자가 그룹 g의 instructor/admin인가
create or replace function public.kdli_group_admin(g uuid)
  returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = g and gm.user_id = auth.uid() and gm.role in ('instructor','admin')
  );
$$;

-- ── RLS 활성화 ──────────────────────────────────────────────
alter table public.vocabulary_terms    enable row level security;
alter table public.content_tags        enable row level security;
alter table public.content_vocabulary  enable row level security;
alter table public.pronunciation_focus enable row level security;
alter table public.vocab_cards         enable row level security;
alter table public.model_answers       enable row level security;
alter table public.groups              enable row level security;
alter table public.group_members       enable row level security;
alter table public.level_tests         enable row level security;
alter table public.action_log          enable row level security;

-- ── 콘텐츠 참조 테이블: read-all(authenticated), write staff ──
-- vocabulary_terms / content_tags / content_vocabulary / pronunciation_focus / model_answers
do $$
declare t text;
begin
  foreach t in array array[
    'vocabulary_terms','content_tags','content_vocabulary','pronunciation_focus','model_answers'
  ] loop
    execute format('drop policy if exists "%s read (auth)" on public.%I', t, t);
    execute format('drop policy if exists "%s write (staff)" on public.%I', t, t);
    execute format(
      'create policy "%s read (auth)" on public.%I for select to authenticated using (true)', t, t);
    execute format(
      'create policy "%s write (staff)" on public.%I for all to authenticated '
      || 'using (public.kdli_is_staff()) with check (public.kdli_is_staff())', t, t);
  end loop;
end $$;

-- ── vocab_cards: 본인 read/write, staff·group leader read ───
drop policy if exists "vocab_cards owner all"  on public.vocab_cards;
drop policy if exists "vocab_cards leader read" on public.vocab_cards;
create policy "vocab_cards owner all" on public.vocab_cards for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "vocab_cards leader read" on public.vocab_cards for select to authenticated
  using (public.kdli_is_staff() or public.kdli_leads_user(user_id));

-- ── level_tests: 본인 insert/read, staff·group leader read ──
drop policy if exists "level_tests owner insert" on public.level_tests;
drop policy if exists "level_tests read"         on public.level_tests;
create policy "level_tests owner insert" on public.level_tests for insert to authenticated
  with check (user_id = auth.uid());
create policy "level_tests read" on public.level_tests for select to authenticated
  using (user_id = auth.uid() or public.kdli_is_staff() or public.kdli_leads_user(user_id));

-- ── action_log: 본인 insert, 본인·staff·group leader read ───
drop policy if exists "action_log owner insert" on public.action_log;
drop policy if exists "action_log read"         on public.action_log;
create policy "action_log owner insert" on public.action_log for insert to authenticated
  with check (user_id = auth.uid());
create policy "action_log read" on public.action_log for select to authenticated
  using (user_id = auth.uid() or public.kdli_is_staff() or public.kdli_leads_user(user_id));

-- ── groups: 구성원·staff read, staff·group admin manage ─────
drop policy if exists "groups member read"   on public.groups;
drop policy if exists "groups staff insert"  on public.groups;
drop policy if exists "groups admin modify"  on public.groups;
drop policy if exists "groups admin delete"  on public.groups;
create policy "groups member read" on public.groups for select to authenticated
  using (public.kdli_in_group(id) or public.kdli_is_staff());
create policy "groups staff insert" on public.groups for insert to authenticated
  with check (public.kdli_is_staff());
create policy "groups admin modify" on public.groups for update to authenticated
  using (public.kdli_is_staff() or public.kdli_group_admin(id))
  with check (public.kdli_is_staff() or public.kdli_group_admin(id));
create policy "groups admin delete" on public.groups for delete to authenticated
  using (public.kdli_is_staff() or public.kdli_group_admin(id));

-- ── group_members: 본인·리더·staff read, 리더·staff manage ──
drop policy if exists "group_members self+leader read" on public.group_members;
drop policy if exists "group_members leader insert"    on public.group_members;
drop policy if exists "group_members leader update"    on public.group_members;
drop policy if exists "group_members leader delete"    on public.group_members;
create policy "group_members self+leader read" on public.group_members for select to authenticated
  using (user_id = auth.uid() or public.kdli_is_staff() or public.kdli_group_admin(group_id));
create policy "group_members leader insert" on public.group_members for insert to authenticated
  with check (public.kdli_is_staff() or public.kdli_group_admin(group_id));
create policy "group_members leader update" on public.group_members for update to authenticated
  using (public.kdli_is_staff() or public.kdli_group_admin(group_id))
  with check (public.kdli_is_staff() or public.kdli_group_admin(group_id));
create policy "group_members leader delete" on public.group_members for delete to authenticated
  using (public.kdli_is_staff() or public.kdli_group_admin(group_id));

-- ════════════════════════════════════════════════════════════
-- 끝. 적용 보류(Option A). 시드 불필요(콘텐츠 태깅 시 자동 누적).
-- ════════════════════════════════════════════════════════════
