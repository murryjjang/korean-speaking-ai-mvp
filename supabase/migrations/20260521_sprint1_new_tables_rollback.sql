-- ============================================================
-- M1 — Sprint 1 마이그레이션 ROLLBACK 페어
-- 정방향: supabase/migrations/20260520_sprint1_new_tables.sql
-- 작성: 2026-05-21 · 적용: Supabase SQL Editor 수동 (정방향과 동일 경로)
--
-- 목적: 20260520 마이그레이션을 완전 역전. 모든 변경은 되돌릴 수 있어야 한다
--   (AUTOMATION_DESIGN.md 설계원칙 6 — 모든 변경에 롤백 페어).
--
-- 순서(의존 역순):
--   1) 신규 10 테이블 DROP ... CASCADE → 테이블 위 정책·인덱스·FK 동반 제거.
--   2) SECURITY DEFINER 헬퍼 4종 DROP (1)에서 테이블이 사라진 뒤라 의존 없음.
--   3) 기존 테이블 ALTER 컬럼 5종 DROP (테이블 자체는 보존, 컬럼만 제거).
--
-- 보존:
--   - extension "pgcrypto" — 다른 기능과 공유 가능성 → 의도적으로 DROP 안 함.
--   - user_profiles · questions · speaking_submissions 테이블 자체 (additive ALTER만 역전).
--
-- 모든 문은 IF EXISTS 가드 → 부분 적용 상태에서도 안전, 반복 실행 안전.
-- ============================================================

-- ── 1) 신규 10 테이블 (의존 역순, CASCADE로 정책·인덱스·FK 동반 제거) ──
drop table if exists public.action_log         cascade;
drop table if exists public.level_tests        cascade;
drop table if exists public.group_members      cascade;
drop table if exists public.groups             cascade;
drop table if exists public.model_answers      cascade;
drop table if exists public.vocab_cards        cascade;
drop table if exists public.pronunciation_focus cascade;
drop table if exists public.content_vocabulary cascade;
drop table if exists public.content_tags       cascade;
drop table if exists public.vocabulary_terms   cascade;

-- ── 2) SECURITY DEFINER 헬퍼 4종 (시그니처 명시) ──────────────
drop function if exists public.kdli_group_admin(uuid);
drop function if exists public.kdli_in_group(uuid);
drop function if exists public.kdli_leads_user(uuid);
drop function if exists public.kdli_is_staff();

-- ── 3) 기존 테이블 ALTER 컬럼 5종 (테이블 보존, 컬럼만 제거) ───
alter table public.user_profiles        drop column if exists current_cefr_level;
alter table public.user_profiles        drop column if exists current_cefr_updated_at;
alter table public.questions            drop column if exists is_tagged;
alter table public.questions            drop column if exists last_tagged_at;
alter table public.speaking_submissions drop column if exists pause_count;

-- ════════════════════════════════════════════════════════════
-- 끝. 적용 후 scripts/verify-migration.sql 재실행 시 모든 category가
-- actual=0(FAIL)로 떨어지면 정상 롤백 완료.
-- ════════════════════════════════════════════════════════════
