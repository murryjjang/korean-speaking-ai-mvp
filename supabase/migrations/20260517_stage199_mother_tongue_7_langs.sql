-- v1.1 단계 19.9: research_participants.mother_tongue 7개 언어 제약 갱신.
--
-- 18까지는 자유 text였고 코드 측에서만 4개 언어를 가정했다. 19.9에서 시험운영
-- 대상 학습자 모국어가 7개(ko/en/vi/ar/th/ms/km)로 확정됨에 따라, 데이터 무결성을
-- 위해 CHECK 제약을 추가한다. 기존 입력 'other' 값과 NULL은 그대로 유지(legacy).
--
-- 실행: Supabase SQL Editor에서 본 파일 내용을 그대로 붙여넣어 실행.
-- 모든 구문이 idempotent — 재실행해도 안전.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) mother_tongue CHECK 제약
-- ─────────────────────────────────────────────────────────────────────────────
-- 시험운영 7개 언어 + 'other' (관리자 폼의 "기타" 옵션) + NULL.
alter table public.research_participants
  drop constraint if exists research_participants_mother_tongue_check;

alter table public.research_participants
  add constraint research_participants_mother_tongue_check
  check (
    mother_tongue is null
    or mother_tongue in ('ko', 'en', 'vi', 'ar', 'th', 'ms', 'km', 'other')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) PostgREST 스키마 캐시 reload
-- ─────────────────────────────────────────────────────────────────────────────
notify pgrst, 'reload schema';
