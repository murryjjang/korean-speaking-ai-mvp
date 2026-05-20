# Supabase Schema Design

Korean Speaking AI MVP — Phase 6-A 설계 문서.
**Phase 6-A**: DDL 초안만 작성. 실제 DB 적용은 Phase 6-B에서 수행.

---

## 개요

| 테이블 | 설명 |
|---|---|
| `classes` | 수업 반 |
| `students` | 학생 (익명 ID 포함) |
| `question_sets` | 문항 세트 (진단·연습·사후평가) |
| `questions` | 개별 문항 |
| `speaking_submissions` | 말하기 평가 제출 |
| `mission_scenarios` | 미션 시나리오 콘텐츠 |
| `mission_submissions` | 미션 대화 제출 |
| `ai_evaluations` | AI 평가 결과 (말하기+미션 공용) |
| `teacher_reviews` | 교수자 채점 결과 |
| `provider_events` | API 호출 로그 |
| `content_versions` | 콘텐츠 변경 이력 |

**Sprint 1 신규 (2026-05-20, 적용 보류 — Option A):**

| 테이블 | 설명 |
|---|---|
| `vocabulary_terms` | 어휘 마스터 (CEFR별) |
| `content_tags` | 콘텐츠 태깅 (주제·CEFR·register, content당 1행) |
| `content_vocabulary` | 콘텐츠↔어휘 junction (basic/core/challenging) |
| `pronunciation_focus` | 콘텐츠 발음 포커스 규칙 |
| `vocab_cards` | 학습자 어휘 카드 (SM-2 간격반복) |
| `model_answers` | 콘텐츠×CEFR 모범답안 |
| `groups` | 학습 그룹 |
| `group_members` | 그룹 구성원·역할 (member/instructor/admin) |
| `level_tests` | 레벨 테스트 결과 |
| `action_log` | 학습 행동 로그 |

DDL 전문: `SUPABASE_SCHEMA.sql` · 적용 정본(+RLS): `supabase/migrations/20260520_sprint1_new_tables.sql`

---

## 테이블별 상세

### `classes`

```
id           uuid PK
name         text NOT NULL
teacher_id   uuid NULL        -- FK → auth.users (Phase 8+, Auth 도입 전 nullable)
semester     text
is_active    boolean DEFAULT true
created_at   timestamptz
updated_at   timestamptz
```

인덱스: `teacher_id`, `is_active`

---

### `students`

```
id                  uuid PK
anonymous_id        text UNIQUE NOT NULL   -- 화면 표시용 (e.g. 'S-001')
name                text NOT NULL
class_id            uuid NOT NULL → classes.id
language_group_id   text                   -- refs language-groups.json
native_language     text                   -- 표시용 모국어명 (e.g. '베트남어')
language_group      text                   -- 필터용 대분류 (e.g. 'southeast-asian')
ui_support_language text DEFAULT 'ko'      -- 'ko'|'en'|'vi'|'th'|'ar'
enrolled_at         timestamptz
is_active           boolean DEFAULT true
created_at          timestamptz
updated_at          timestamptz
```

인덱스: `class_id`, `language_group`, `is_active`

---

### `question_sets`

```
id           text PK          -- 'qs-diagnostic-01' 형식 유지
name         text NOT NULL
description  text
purpose      text             -- 'diagnostic'|'practice'|'post'
question_ids jsonb NOT NULL   -- [{questionId: string, order: number}]
is_active    boolean
version      integer DEFAULT 1
created_at   timestamptz
updated_at   timestamptz
```

`question_ids`를 JSONB로 설계한 이유: order 정보를 포함하며, 중간 테이블 대비 쿼리 단순화.

---

### `questions`

```
id                text PK      -- 'q-001' 형식 유지
type_id           text
title             text NOT NULL
prompt            text NOT NULL
image_url         text NULL
prep_time_sec     integer
response_time_sec integer
difficulty        text         -- 'beginner'|'intermediate'|'advanced'
is_active         boolean
version           integer DEFAULT 1
created_at        timestamptz
updated_at        timestamptz
```

---

### `speaking_submissions`

```
id              uuid PK
student_id      uuid NOT NULL → students.id
class_id        uuid NOT NULL → classes.id
question_id     text NOT NULL → questions.id
question_set_id text NULL     → question_sets.id
audio_url       text
duration_sec    integer
status          text          -- 'pending'|'ai_evaluated'|'teacher_reviewed'|'finalized'
submitted_at    timestamptz
created_at      timestamptz
updated_at      timestamptz
```

인덱스: `student_id`, `class_id`, `status`, `submitted_at DESC`

---

### `mission_scenarios`

```
id                text PK     -- 'sc-restaurant-01' 형식 유지
title             text NOT NULL
situation         text NOT NULL
location          text
persona_id        text         -- refs personas.json id
goals             jsonb        -- MissionGoal[]
success_criteria  jsonb        -- MissionSuccessCriteria
expected_turns    integer
difficulty        text
estimated_minutes integer
rubric            jsonb        -- MissionRubric
sample_responses  jsonb        -- MissionSampleResponse[]
is_active         boolean
version           integer DEFAULT 1
created_at        timestamptz
updated_at        timestamptz
```

JSONB 사유: goals/rubric/sample_responses 모두 중첩 구조이며 통째로 읽는 용도.

---

### `mission_submissions`

```
id           uuid PK
session_id   text NOT NULL    -- 클라이언트 생성 세션 ID
scenario_id  text NOT NULL → mission_scenarios.id
student_id   uuid NOT NULL → students.id
class_id     uuid NOT NULL → classes.id
turns        jsonb NOT NULL   -- MissionTurn[]
goals        jsonb NOT NULL   -- MissionGoalState[]
status       text             -- 'in_progress'|'submitted'
submitted_at timestamptz NULL
created_at   timestamptz
updated_at   timestamptz
```

인덱스: `student_id`, `scenario_id`, `status`, `session_id`  
JSONB 사유: turns는 가변 길이 대화 로그, turn-per-row 설계 대비 쿼리 복잡도 불필요.

---

### `ai_evaluations`

```
id                   uuid PK
submission_id        uuid NOT NULL    -- speaking_submissions.id 또는 mission_submissions.id
submission_type      text             -- 'speaking'|'mission' (discriminator)
transcript           text
rubric_id            text
rubric_version       integer
scores               jsonb            -- LLMEvalScore[]
total_score          numeric
normalized_score     numeric
error_tags           jsonb            -- ErrorTag[]
feedback             text
stt_result           jsonb            -- STTResult (speaking 전용)
pronunciation_result jsonb            -- PronunciationResult (speaking 전용)
provider_name        text
provider_version     text
latency_ms           integer
evaluated_at         timestamptz
created_at           timestamptz
```

인덱스: `submission_id`, `submission_type`, `evaluated_at DESC`  
`submission_id`는 `submission_type`에 따라 다른 테이블을 참조하므로 FK 제약 없이 소프트 참조.

---

### `teacher_reviews`

```
id                 uuid PK
submission_id      uuid NOT NULL
submission_type    text           -- 'speaking'|'mission'
teacher_id         uuid NULL      -- nullable until Supabase Auth
ai_evaluation_id   uuid NULL → ai_evaluations.id
scores             jsonb          -- Record<rubricItemId, score>
total_score        numeric
normalized_score   numeric
adjustment_reasons text[]
public_comment     text
private_note       text
strengths          text
improvements       text
next_activity      text
is_finalized       boolean DEFAULT false
finalized_at       timestamptz NULL
created_at         timestamptz
updated_at         timestamptz
```

인덱스: `submission_id`, `teacher_id`, `is_finalized`

---

### `provider_events`

Phase 8-E에서 `status`, `model`, `request_id`, `question_id`, `error_code`, `metadata` 컬럼 추가.  
기존 DB에 적용하려면 `SUPABASE_SCHEMA.sql` 파일 하단 **Phase 8-E Migration** 섹션의 ALTER TABLE 명령을 실행한다.

```
id               uuid PK
provider_type    text    -- 'stt'|'tts'|'pronunciation'|'llm-eval'|'conversation'
provider_name    text    -- 'mock'|'openai'|'etri'|'claude' 등
status           text NULL  -- 'success'|'fallback'|'error' (Phase 8-E+)
submission_id    uuid NULL
student_id       uuid NULL
question_id      text NULL  -- 문항/시나리오 ID (Phase 8-E+)
model            text NULL  -- 모델명 e.g. 'whisper-1' (Phase 8-E+)
request_id       text NULL  -- 외부 API 요청 ID (Phase 8-E+)
request_payload  jsonb NULL -- PII 포함 가능, 암호화 고려
response_payload jsonb NULL
latency_ms       integer NULL
is_error         boolean DEFAULT false
error_code       text NULL  -- 짧은 오류 키 e.g. 'provider_error' (Phase 8-E+)
error_message    text NULL
metadata         jsonb NULL -- provider별 추가 정보 (Phase 8-E+)
created_at       timestamptz
```

인덱스: `provider_type`, `provider_name`, `status`, `submission_id`, `question_id`, `created_at DESC`

---

### `content_versions`

```
id           uuid PK
content_type text    -- 'question'|'question_set'|'scenario'|'rubric'|'persona'
content_id   text    -- 해당 콘텐츠의 원래 ID
version      integer
data         jsonb   -- 해당 버전 전체 스냅샷
changed_by   uuid NULL
created_at   timestamptz
UNIQUE (content_type, content_id, version)
```

인덱스: `(content_type, content_id)`

---

## Sprint 1 신규 테이블 (2026-05-20)

> **적용 보류 (Option A).** 적용 정본 DDL + RLS(auth.uid 모델) + SECURITY DEFINER 헬퍼는
> `supabase/migrations/20260520_sprint1_new_tables.sql`. 아래는 구조 요약.
>
> **결정**: `user_id → auth.users(id)` · `content_id(text) → questions(id)` ·
> `pause_count → speaking_submissions` · RLS = 표준 `auth.uid()`.
> **주의**: 현재 라이브 파일럿(P060–P066)은 `research_participants` 기반(auth.users 아님) →
> 이 테이블들은 파일럿 계정 마이그레이션(backlog #18) 전까지 forward-looking.
> 자유대화는 persona+자유 topic이라 고정 content 행이 없어 태깅 대상 아님(낭독·발표·듣고답하기·대화미션=questions만).

### `vocabulary_terms`
```
id uuid PK · term text UNIQUE NOT NULL · cefr_level text (A1-C2) · created_at
```
인덱스: `cefr_level`

### `content_tags`  (content당 1행)
```
id uuid PK · content_id text UNIQUE → questions.id (cascade)
topic_tags text[] · cefr_level (A1-C2) · register (casual-banmal|polite-spoken|formal-spoken|formal-written|instructional)
register_consistency (consistent|mixed) DEFAULT consistent · learning_objective text · prompt_version DEFAULT 'v3'
tagged_at · created_at · updated_at
```
인덱스: `cefr_level`, `register`, `gin(topic_tags)`

### `content_vocabulary`  (junction)
```
id uuid PK · content_id text → questions.id · term_id uuid → vocabulary_terms.id · category (basic|core|challenging)
UNIQUE (content_id, term_id, category)
```
인덱스: `content_id`, `term_id`, `category`

### `pronunciation_focus`
```
id uuid PK · content_id text → questions.id · term text (FK 아님) · rule text · created_at
```
인덱스: `content_id`

### `vocab_cards`  (SM-2)
```
id uuid PK · user_id uuid → auth.users.id · term_id uuid → vocabulary_terms.id
ease_factor numeric(4,2) DEFAULT 2.50 (≥1.30) · interval_days int DEFAULT 1 (≥0) · repetitions int DEFAULT 0 (≥0)
last_quality smallint (0-5) · last_reviewed_at · next_review_at DEFAULT now() · added_at · created_at · updated_at
UNIQUE (user_id, term_id)
```
인덱스: `user_id`, `(user_id, next_review_at)`

### `model_answers`  (content×cefr당 1행)
```
id uuid PK · content_id text → questions.id · cefr_level (A1-C2) · answer_text text · audio_url · audio_voice
generated_at · created_at · updated_at · UNIQUE (content_id, cefr_level)
```
인덱스: `content_id`

### `groups`
```
id uuid PK · name text · description text NULL · anonymize_ranking boolean DEFAULT true · created_at · updated_at
```

### `group_members`
```
id uuid PK · group_id uuid → groups.id · user_id uuid → auth.users.id
role text DEFAULT 'member' (member|instructor|admin) · joined_at · UNIQUE (group_id, user_id)
```
인덱스: `group_id`, `user_id`, `role`

### `level_tests`
```
id uuid PK · user_id uuid → auth.users.id · taken_at · estimated_cefr (A1-C2)
confidence_score numeric(3,2) (0-1) · results jsonb NOT NULL · duration_seconds int NULL · created_at
```
인덱스: `user_id`, `(user_id, taken_at desc)`

### `action_log`
```
id uuid PK · user_id uuid → auth.users.id
action_type text: content_started|content_completed|vocab_reviewed|level_test_taken|model_answer_played|login|logout|group_ranking_viewed
meta jsonb NULL · occurred_at · created_at
```
인덱스: `user_id`, `action_type`, `(user_id, occurred_at desc)`

### ALTER (기존 테이블, additive)
| 테이블 | 추가 컬럼 |
|---|---|
| `user_profiles` ('users' 매핑) | `current_cefr_level` text (A1-C2, NULL), `current_cefr_updated_at` timestamptz NULL |
| `questions` ('contents' 매핑) | `is_tagged` boolean NOT NULL DEFAULT false, `last_tagged_at` timestamptz NULL |
| `speaking_submissions` | `pause_count` integer NOT NULL DEFAULT 0 |

---

## Mock 데이터 → DB 테이블 매핑

| 기존 mock 데이터 | 저장 위치 |
|---|---|
| `mockClasses` (data.ts) | `classes` |
| `mockStudents` (data.ts) | `students` |
| `questions.json` (content/) | `questions` |
| `question-sets.json` (content/) | `question_sets` |
| `mockSubmissions` (data.ts, moduleType='assessment') | `speaking_submissions` |
| `mockAIEvaluations` (data.ts) | `ai_evaluations` (submission_type='speaking') |
| `SpeakingEvalRecord` (speaking-store.ts) | `ai_evaluations`의 `stt_result`, `pronunciation_result` 컬럼으로 병합 |
| `mockTeacherEvaluations` (data.ts) | `teacher_reviews` |
| `scenarios.json` + `mission-goals.json` | `mission_scenarios` |
| `MissionSession` (mission-store.ts) | **DB 저장 안 함** — 제출 시만 mission_submissions에 기록 |
| `MissionSubmission` (mission-store.ts) | `mission_submissions` + `ai_evaluations` |
| Mission conversation log (turns) | `mission_submissions.turns` (JSONB) |
| Mission result | `mission_submissions` + `ai_evaluations` JOIN으로 조합 |
| `mockRiskFlags` | Phase 7+ `risk_flags` 테이블로 분리 예정 |
| `mockProviderStatus` | `provider_events` 집계로 대체 (별도 테이블 불필요) |

---

## 필요 환경변수 (Phase 6-B에서 설정)

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...   # 서버 전용, NEXT_PUBLIC 없이
REPOSITORY_PROVIDER=supabase            # 미설정 시 mock fallback
```

> `.env.local`에 설정. `.gitignore`에 반드시 포함 확인.

---

## RLS 정책 현황 (Phase 6-B5 기준)

### 현재 상태 — RLS 임시 disable

Phase 6-B(파일럿 개발 단계) 전체에서 모든 테이블의 RLS를 비활성화 상태로 운영한다.

**비활성화 대상 테이블:**
- `classes`, `students`
- `question_sets`, `questions`
- `speaking_submissions`, `ai_evaluations`
- `teacher_reviews`
- `mission_scenarios`, `mission_submissions`
- `provider_events`, `content_versions`

**임시 disable 근거:**
- Auth 미구현 단계에서 `anon` 키로 INSERT가 가능해야 파일럿 저장 연동 동작 가능
- service_role 키는 서버 환경변수에만 보관 (`SUPABASE_SERVICE_ROLE_KEY`), 절대 `NEXT_PUBLIC` 불가
- 파일럿 URL을 참가자에게만 비공개 공유하는 방식으로 임시 보호

**보안 위험 완화 조치 (파일럿 기간):**
- Supabase 프로젝트 URL을 공개 문서에 노출하지 않음
- anon 키는 최소 권한으로 유지 (INSERT/SELECT only, DELETE 불가)
- 파일럿 데이터에 실제 개인정보 포함하지 않음 (익명 ID 사용)

### Phase 9 이후 — RLS 재활성화 계획

Supabase Auth 도입(Phase 9) 후 아래 정책을 순차 적용한다.

| 역할 | 테이블 | 허용 작업 |
|---|---|---|
| `authenticated` (교수자) | `teacher_reviews` | INSERT, UPDATE (자신이 작성한 row) |
| `authenticated` (교수자) | `speaking_submissions`, `mission_submissions` | SELECT (자신의 반 학생 row) |
| `authenticated` (학생) | `speaking_submissions`, `mission_submissions` | INSERT, SELECT (자신의 row) |
| `authenticated` (학생) | `ai_evaluations` | SELECT (자신의 submission에 연결된 row) |
| `service_role` | 전체 | full access (서버 사이드 Server Action 전용) |
| `anon` | 전체 | 접근 불가 (Auth 도입 후) |

> **Phase 9 이전 파일럿 기간에는 RLS 비활성화 상태 유지. PILOT_RELEASE_PLAN.md Known Issues 참조.**

---

## 마이그레이션 전략

1. `SUPABASE_SCHEMA.sql` 실행 (Supabase Dashboard > SQL Editor)
2. 기존 `src/content/` JSON 데이터를 `questions`, `question_sets`, `mission_scenarios` 테이블에 seed
3. `src/lib/mock/data.ts`의 mock students, classes를 `students`, `classes` 테이블에 seed
4. `REPOSITORY_PROVIDER=supabase` 환경변수 설정 후 재배포
5. 기존 mock stores는 fallback으로 유지 (제거하지 않음)
