-- ============================================================
-- 롤백 — 20260521_vocab_glosses.sql (M1 페어 원칙)
-- 실행: Supabase SQL Editor. vocabulary_glosses 테이블·정책·인덱스 제거.
-- 주의: 캐시 데이터 손실(재생성 가능 — on-demand). 다른 테이블 영향 없음.
-- ============================================================

drop policy if exists "vocabulary_glosses read (auth)"  on public.vocabulary_glosses;
drop policy if exists "vocabulary_glosses write (staff)" on public.vocabulary_glosses;
drop table if exists public.vocabulary_glosses;
