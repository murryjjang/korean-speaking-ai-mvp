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

DDL 전문: `SUPABASE_SCHEMA.sql`

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

```
id               uuid PK
provider_type    text    -- 'stt'|'tts'|'pronunciation'|'llm-eval'|'conversation'
provider_name    text    -- 'mock'|'etri'|'claude' 등
submission_id    uuid NULL
student_id       uuid NULL
request_payload  jsonb   -- PII 포함 가능, 암호화 고려
response_payload jsonb
latency_ms       integer
is_error         boolean DEFAULT false
error_message    text
created_at       timestamptz
```

인덱스: `provider_type`, `submission_id`, `created_at DESC`

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

## RLS 정책 방침 (Phase 6-B)

Phase 6-A에서는 RLS 비활성화 상태. Phase 6-B에서 다음 정책 추가 예정:
- 교수자: 자신의 반 데이터만 read/write
- 학생: 자신의 제출만 read/write (Auth 도입 후)
- service_role: 모든 테이블 full access (서버 사이드 API용)

---

## 마이그레이션 전략

1. `SUPABASE_SCHEMA.sql` 실행 (Supabase Dashboard > SQL Editor)
2. 기존 `src/content/` JSON 데이터를 `questions`, `question_sets`, `mission_scenarios` 테이블에 seed
3. `src/lib/mock/data.ts`의 mock students, classes를 `students`, `classes` 테이블에 seed
4. `REPOSITORY_PROVIDER=supabase` 환경변수 설정 후 재배포
5. 기존 mock stores는 fallback으로 유지 (제거하지 않음)
