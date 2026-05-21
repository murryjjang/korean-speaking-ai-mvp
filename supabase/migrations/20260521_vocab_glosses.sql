-- ============================================================
-- Task 1.4 — vocabulary_glosses (어휘 뜻·예문 다국어 캐시) (D-012c)
-- 작성: 2026-05-21 · 적용 모드: 파일만 작성, 적용 보류(본인 트리거, M1 패턴)
--
-- 목적: vocabulary_terms 는 term+cefr_level 뿐 → 단어장 퀴즈에 필요한 뜻·예문을
--   다국어(en/vi/ar/ko/th/ms/km)로 캐싱. M3-c LLM 이 첫 노출 시 on-demand 생성.
-- idempotent: unique(term_id, lang). 재실행 안전: create table if not exists 등.
-- 사전 의존: public.vocabulary_terms (20260520_sprint1_new_tables.sql).
-- 검증: scripts/verify-vocab-glosses.ts (적용 후 실행).
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists public.vocabulary_glosses (
  id                  uuid        primary key default gen_random_uuid(),
  term_id             uuid        not null references public.vocabulary_terms(id) on delete cascade,
  lang                text        not null check (lang in ('en','vi','ar','ko','th','ms','km')),
  gloss               text        not null,
  example_ko          text,
  example_translated  text,
  generated_at        timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (term_id, lang)
);

create index if not exists idx_vocab_glosses_term on public.vocabulary_glosses(term_id);
create index if not exists idx_vocab_glosses_lang on public.vocabulary_glosses(lang);

-- ── RLS: 콘텐츠 참조 캐시 → read-all(authenticated), write staff ──
--   on-demand 생성은 서버(service_role)가 수행해 RLS 우회(태깅 배치와 동일 패턴).
alter table public.vocabulary_glosses enable row level security;

drop policy if exists "vocabulary_glosses read (auth)"  on public.vocabulary_glosses;
drop policy if exists "vocabulary_glosses write (staff)" on public.vocabulary_glosses;
create policy "vocabulary_glosses read (auth)" on public.vocabulary_glosses
  for select to authenticated using (true);
create policy "vocabulary_glosses write (staff)" on public.vocabulary_glosses
  for all to authenticated using (public.kdli_is_staff()) with check (public.kdli_is_staff());

-- ════════════════════════════════════════════════════════════
-- 끝. 적용 보류 — Supabase SQL Editor 수동 실행(M1 패턴). 시드 불필요(on-demand 누적).
-- ════════════════════════════════════════════════════════════
