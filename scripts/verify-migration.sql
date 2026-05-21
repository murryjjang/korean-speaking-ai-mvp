-- ============================================================
-- M1 — Sprint 1 마이그레이션 검증 (권위 strict 100%)
-- 대상: supabase/migrations/20260520_sprint1_new_tables.sql
-- 실행: Supabase SQL Editor에 붙여넣고 RUN. 결과 그리드 한눈에 PASS/FAIL.
--
-- 출력: category · expected · actual · status (4컬럼) + 마지막 TOTAL 행.
--   status = PASS(일치) / FAIL(불일치). TOTAL.status = ALL PASS / FAIL.
--
-- 0 footprint — 함수/RPC 생성 없는 순수 SELECT. 반복 실행 안전.
--
-- ── expected 값 자체검증 (spec-actual drift 차단, grep 도출 근거) ──
--   $ M=supabase/migrations/20260520_sprint1_new_tables.sql
--   tables    : grep -cE 'create table if not exists public\.' $M        → 10
--   columns   : ALTER add column (3 테이블 / 5 컬럼, 아래 VALUES와 1:1)   → 5
--   rls       : alter table ... enable row level security 10건            → 10
--   policies  : grep 'create policy' 16건 중 2건이 do-loop 템플릿(5×2=10),
--               명시 14 + 동적 10                                          → 24
--   indexes   : grep -cE 'create index if not exists' $M                  → 19
--   functions : grep -cE 'security definer' $M (kdli_* 4종)               → 4
--   fks       : grep -cE 'references ' $M                                 → 11
--               (→questions 4 · →vocabulary_terms 2 · →auth.users 4 · →groups 1)
-- ============================================================

with
-- 신규 10 테이블
expected_tables(t) as (values
  ('vocabulary_terms'),('content_tags'),('content_vocabulary'),('pronunciation_focus'),
  ('vocab_cards'),('model_answers'),('groups'),('group_members'),('level_tests'),('action_log')
),
-- ALTER 컬럼 5종 (table, column, data_type, is_nullable)
expected_columns(tbl, col, dtype, nullable) as (values
  ('user_profiles',       'current_cefr_level',      'text',                        'YES'),
  ('user_profiles',       'current_cefr_updated_at', 'timestamp with time zone',    'YES'),
  ('questions',           'is_tagged',               'boolean',                     'NO'),
  ('questions',           'last_tagged_at',          'timestamp with time zone',    'YES'),
  ('speaking_submissions','pause_count',             'integer',                     'NO')
),
-- 명시 인덱스 19종
expected_indexes(idx) as (values
  ('idx_vocabulary_terms_cefr'),
  ('idx_content_tags_cefr'),('idx_content_tags_register'),('idx_content_tags_topics'),
  ('idx_content_vocab_content'),('idx_content_vocab_term'),('idx_content_vocab_category'),
  ('idx_pron_focus_content'),
  ('idx_vocab_cards_user'),('idx_vocab_cards_user_next'),
  ('idx_model_answers_content'),
  ('idx_group_members_group'),('idx_group_members_user'),('idx_group_members_role'),
  ('idx_level_tests_user'),('idx_level_tests_user_date'),
  ('idx_action_log_user'),('idx_action_log_type'),('idx_action_log_user_date')
),
-- SECURITY DEFINER 헬퍼 4종
expected_functions(fn) as (values
  ('kdli_is_staff'),('kdli_leads_user'),('kdli_in_group'),('kdli_group_admin')
),
checks(sort_order, category, expected, actual) as (
  -- 1) 테이블 존재
  select 1, 'tables', 10, (
    select count(*) from information_schema.tables it
    join expected_tables et on et.t = it.table_name
    where it.table_schema = 'public' and it.table_type = 'BASE TABLE'
  )
  union all
  -- 2) ALTER 컬럼 (data_type + nullable 일치)
  select 2, 'columns', 5, (
    select count(*) from information_schema.columns ic
    join expected_columns ec
      on ec.tbl = ic.table_name and ec.col = ic.column_name
     and ec.dtype = ic.data_type and ec.nullable = ic.is_nullable
    where ic.table_schema = 'public'
  )
  union all
  -- 3) RLS 활성화
  select 3, 'rls_enabled', 10, (
    select count(*) from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join expected_tables et on et.t = c.relname
    where n.nspname = 'public' and c.relrowsecurity = true
  )
  union all
  -- 4) 정책 (10 테이블 위 정책 총수)
  select 4, 'policies', 24, (
    select count(*) from pg_policies p
    join expected_tables et on et.t = p.tablename
    where p.schemaname = 'public'
  )
  union all
  -- 5) 명시 인덱스
  select 5, 'indexes', 19, (
    select count(*) from pg_indexes pi
    join expected_indexes ei on ei.idx = pi.indexname
    where pi.schemaname = 'public'
  )
  union all
  -- 6) SECURITY DEFINER + search_path=public
  select 6, 'sec_definer_fns', 4, (
    select count(*) from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join expected_functions ef on ef.fn = p.proname
    where n.nspname = 'public'
      and p.prosecdef = true
      and p.proconfig is not null
      and exists (
        select 1 from unnest(p.proconfig) cfg
        where cfg like 'search_path=%public%'
      )
  )
  union all
  -- 7) 외래키 (10 신규 테이블 위 FK 총수)
  select 7, 'foreign_keys', 11, (
    select count(*) from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    join expected_tables et on et.t = c.relname
    where con.contype = 'f' and n.nspname = 'public'
  )
),
report as (
  select sort_order, category, expected, actual,
         case when actual = expected then 'PASS' else 'FAIL' end as status
  from checks
)
-- UNION 위에서는 ORDER BY 가 출력 컬럼명만 허용(expr 불가, ERROR 0A000) →
-- sort_key(int) 를 각 branch 에 부여한 뒤 서브쿼리로 감싸 표시 컬럼만 노출.
-- TOTAL 은 sort_key=999 로 항상 마지막, 그 외는 checks 정의 순서(1~7).
select category, expected, actual, status
from (
  select sort_order as sort_key, category, expected, actual, status from report
  union all
  select 999, 'TOTAL',
         (select sum(expected) from report),
         (select sum(actual) from report),
         case when (select bool_and(status = 'PASS') from report) then 'ALL PASS' else 'FAIL' end
) grid
order by sort_key, category;

-- ── 드릴다운(특정 category FAIL 시 주석 해제해 항목별 누락 확인) ──────────
-- 누락 테이블:
--   select et.t from (values ('vocabulary_terms'),('content_tags'),('content_vocabulary'),
--     ('pronunciation_focus'),('vocab_cards'),('model_answers'),('groups'),('group_members'),
--     ('level_tests'),('action_log')) et(t)
--   where not exists (select 1 from information_schema.tables it
--     where it.table_schema='public' and it.table_name=et.t and it.table_type='BASE TABLE');
-- 누락/불일치 컬럼:
--   select ec.* from (values
--     ('user_profiles','current_cefr_level','text','YES'),
--     ('user_profiles','current_cefr_updated_at','timestamp with time zone','YES'),
--     ('questions','is_tagged','boolean','NO'),
--     ('questions','last_tagged_at','timestamp with time zone','YES'),
--     ('speaking_submissions','pause_count','integer','NO')) ec(tbl,col,dtype,nullable)
--   where not exists (select 1 from information_schema.columns ic
--     where ic.table_schema='public' and ic.table_name=ec.tbl and ic.column_name=ec.col
--       and ic.data_type=ec.dtype and ic.is_nullable=ec.nullable);
-- 테이블별 정책/FK 분포:
--   select tablename, count(*) from pg_policies where schemaname='public'
--     and tablename in ('vocabulary_terms','content_tags','content_vocabulary','pronunciation_focus',
--       'vocab_cards','model_answers','groups','group_members','level_tests','action_log')
--   group by tablename order by tablename;
