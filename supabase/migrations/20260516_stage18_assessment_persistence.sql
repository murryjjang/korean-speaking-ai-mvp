-- v1.1 단계 18: 평가 영속성 cascade 복구 + LLM provider/model 메타데이터 컬럼.
--
-- 시연 이후 코드는 (a) question_sets.purpose에 'official' 값을 보냈으나 기존
-- check constraint가 ('diagnostic','practice','post')만 허용해 upsert 실패 →
-- speaking_submissions FK 실패로 이어지는 cascade 버그가 발생했다. 동시에
-- research_assessments는 (b) feedback_text 컬럼이 PostgREST 스키마 캐시에
-- 잡히지 않아 PGRST204를 반환했다. 본 마이그레이션은 다음을 보장한다.
--
-- 1) question_sets.purpose check constraint에 'official' 허용 추가
-- 2) research_assessments.feedback_text 컬럼 보장 (idempotent)
-- 3) research_assessments에 provider/model 컬럼 추가 (디버깅 + 논문 분석용)
-- 4) PostgREST 스키마 캐시 reload
--
-- 실행: Supabase SQL Editor에서 본 파일 내용을 그대로 붙여넣어 실행.
-- 본 프로젝트는 자동 마이그레이션 러너를 사용하지 않으므로 운영자가 직접 적용한다.
-- 모든 구문이 idempotent — 재실행해도 안전.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) question_sets.purpose — 'official' 허용
-- ─────────────────────────────────────────────────────────────────────────────
-- 기존 정의: check (purpose in ('diagnostic', 'practice', 'post'))
-- 현재 JSON 시드: beginner/intermediate/advanced 평가세트의 purpose='official'.
-- 'dev' 값도 일부 레거시 시드에서 사용 → 허용 목록에 함께 포함.
alter table public.question_sets
  drop constraint if exists question_sets_purpose_check;
alter table public.question_sets
  add constraint question_sets_purpose_check
  check (purpose in ('official', 'diagnostic', 'practice', 'post', 'dev'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) research_assessments — feedback_text 컬럼 보장 (idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
-- 최초 마이그레이션 20260515_research_pilot_schema.sql에 정의돼 있으나,
-- 시연 환경에서 PGRST204("Could not find the 'feedback_text' column") 발생.
-- 원인이 누락이든 캐시이든 모두 안전하게 처리.
alter table public.research_assessments
  add column if not exists feedback_text text;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) research_assessments.provider / model — LLM 추적용
-- ─────────────────────────────────────────────────────────────────────────────
-- 시연 후 운영에서 어떤 평가가 OpenAI vs mock으로 처리됐는지 행 단위 추적이
-- 필요. provider는 'openai' | 'mock' | 'azure' 등. model은 'gpt-4o-mini' 등.
alter table public.research_assessments
  add column if not exists provider text;
alter table public.research_assessments
  add column if not exists model text;

create index if not exists idx_research_assessments_provider
  on public.research_assessments(provider);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) PostgREST 스키마 캐시 reload
-- ─────────────────────────────────────────────────────────────────────────────
-- Supabase의 PostgREST는 스키마 변경을 자동 감지하지만 캐시가 느슨해
-- PGRST204를 반환하는 경우가 있다. 안전을 위해 명시적으로 reload.
notify pgrst, 'reload schema';
