# WORK LOG

Phase별 작업 내역을 기록합니다.

---

## Phase 6-B2 — 말하기 평가 Supabase 저장 연동

**날짜**: 2026-05-04  
**목표**: 학습자 말하기 평가 제출 결과를 Supabase `speaking_submissions` + `ai_evaluations`에 저장하는 최소 연동 구현. REPOSITORY_PROVIDER=mock 기존 동작 완전 유지.

### 생성 파일

- `src/lib/repositories/supabase-submission-repository.ts` — `SupabaseSubmissionRepository` + `SupabaseEvaluationRepository` 구현체. 파일럿 class/student 자동 bootstrap, question/question_set 콘텐츠 시드, speaking_submissions + ai_evaluations insert. 오류 발생 시 console.error 후 early return (화면 중단 없음).

### 수정 파일

- `src/lib/repositories/index.ts` — `getSubmissionRepository()` / `getEvaluationRepository()` 에서 REPOSITORY_PROVIDER=supabase일 때 Supabase 구현체 반환. `warnNotImplemented` 호출 제거 (6-B3+만 유지).
- `app/student/speaking/actions.ts` — `saveSpeakingEval()` 직접 호출 유지 (result page 의존) + REPOSITORY_PROVIDER=supabase일 때만 `evalRepo.saveSpeakingEvalRecord(record)` 추가 시도. 실패 시 console.error 후 `{ submissionId }` 정상 반환.
- `docs/spec/WORK_LOG.md` — Phase 6-B2 항목 추가.

### Supabase 저장 흐름 요약

```
submitSpeaking(questionId, questionSetId)   ← Server Action
  │
  ├─ [항상] saveSpeakingEval(record)         → mock store (result page용)
  │
  └─ [REPOSITORY_PROVIDER=supabase일 때만]
       SupabaseEvaluationRepository.saveSpeakingEvalRecord(record)
         │
         ├─ ensurePilotClass()               → classes 테이블 upsert/select
         ├─ ensurePilotStudent(classId)       → students 테이블 upsert/select
         ├─ ensureQuestionSet(questionSetId)  → question_sets 테이블 upsert (JSON 시드)
         ├─ ensureQuestion(questionId)        → questions 테이블 upsert (JSON 시드)
         ├─ INSERT speaking_submissions       → DB UUID 획득
         └─ INSERT ai_evaluations            → submission_id = DB UUID
```

### 파일럿 컨텍스트 bootstrap 전략

Auth 미구현 단계에서 `speaking_submissions.student_id` / `class_id` (UUID NOT NULL FK) 제약을 충족하기 위해:
- "Pilot Class (Phase 6-B)" 이름의 class를 최초 1회 insert → UUID 캐시
- "PILOT-S-001" anonymous_id의 student를 최초 1회 insert → UUID 캐시
- 캐시는 module-level 변수 (서버 재시작 시 초기화 → 자동 재bootstrap)
- `questions`, `question_sets`는 JSON에서 `upsert onConflict: 'id'` (text PK이므로 중복 안전)

### TypeScript 이슈 및 해결

**이슈**: Supabase v2.105.1에서 `createClient()` (Database 타입 미제공) 사용 시 TypeScript가 `Schema = never`로 추론하여 `.from().insert()` 호출이 컴파일 오류 발생.

**해결**: `function db(client) { return client as any }` 헬퍼를 파일 내부에 정의하고 모든 `.from()` 호출에 사용. ESLint `@typescript-eslint/no-explicit-any` 주석으로 명시적으로 억제. 런타임 동작은 정확하며 타입 강제만 우회.

### REPOSITORY_PROVIDER=mock일 때 영향

**영향 없음.** `actions.ts`의 Supabase 시도 블록은 `process.env.REPOSITORY_PROVIDER === 'supabase'` 조건으로 완전히 분기됨. mock 모드에서는 기존 `saveSpeakingEval()` 경로만 실행되며 코드 경로 변경 없음.

### REPOSITORY_PROVIDER=supabase 전환 후 테스트 방법

1. `.env.local`에서 `REPOSITORY_PROVIDER=supabase` 설정 (SUPABASE URL/KEY는 이미 입력됨)
2. `npm run dev` 실행
3. `/student/speaking/q-001?setId=qs-diagnostic-01` 접속 → 제출 버튼 클릭
4. 서버 콘솔에서 확인:
   ```
   [supabase] speaking_submission saved: <uuid> (mock ref: mock-q-001-...)
   [supabase] ai_evaluation saved: <uuid>
   ```
5. Supabase Dashboard → Table Editor → `speaking_submissions` / `ai_evaluations` 에서 새 row 확인
6. 결과 페이지 `/student/speaking/q-001/result?sub=mock-q-001-...`가 정상 렌더링되는지 확인

### 테스트 결과

- `npm run lint` → 오류 없음 ✓
- `npx tsc --noEmit` → 오류 없음 ✓
- `npm run build` → 빌드 성공 ✓ (14개 라우트, 기존과 동일)

### Known Issues

1. **파일럿 student/class 단일 고정**: Auth 미구현으로 모든 제출이 동일한 pilot student에 귀속됨. Phase 7(Auth) 구현 후 실제 student_id로 교체 필요.
2. **audio_url/duration_sec null**: mock 제출이므로 실제 음성 파일 없음. Storage 연동(Phase 7+) 후 채울 수 있음.
3. **ai_evaluations.submission_id non-FK**: 스키마에서 `submission_id`는 UUID 타입이지만 FK 제약 없음. 따라서 `saveSpeakingEvalRecord`에서 DB UUID를 정확히 넘겨줘야 데이터 일관성 유지됨 (구현 완료).
4. **Bootstrap race condition**: 동시 요청 시 pilot class/student가 중복 insert될 수 있음. 클래스 이름 unique constraint가 없어 다수의 pilot class가 생길 수 있으나, `.limit(1)` select로 첫 번째 row를 항상 사용하므로 기능 동작에는 영향 없음.

### 다음 단계 제안 (Phase 6-B3)

1. `teacher_reviews` 저장 구현 (`SupabaseTeacherReviewRepository`)
2. `/teacher/submissions/[id]` 채점 확정 시 Supabase에도 저장
3. `speaking_submissions` 목록 read 구현 (teacher dashboard에서 DB 기반 조회)

---

## Phase 6-B1 — Supabase 클라이언트 초기화 및 Provider 선택 구조

**날짜**: 2026-05-04  
**목표**: `@supabase/supabase-js` 설치, Supabase 클라이언트 안전 초기화, `REPOSITORY_PROVIDER` 분기 구조 완성. 실제 DB 호출 없음. mock fallback 완전 유지.

### 생성 파일

- `src/lib/supabase/client.ts` — Supabase 클라이언트 싱글턴. `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` 미설정 시 `null` 반환. 앱 즉시 종료 없음.
- `.env.local.example` — 환경변수 키 이름만 기재. 값 없음. `.env.local` 설정 가이드용.

### 수정 파일

- `src/lib/repositories/index.ts` — `getSupabaseClient()` import 추가. `resolvedProvider()` 함수로 `REPOSITORY_PROVIDER` 환경변수 + Supabase 클라이언트 가용성 동시 판별. Phase 6-B2~4 구현 전까지 `'supabase'` 선택 시 console.warn 후 mock fallback. 기존 6개 factory 함수 시그니처·반환 타입 변경 없음.
- `package.json` — `@supabase/supabase-js: ^2.105.1` dependencies 추가 (npm install 자동 기재).

### Provider 분기 동작 요약

| REPOSITORY_PROVIDER | Supabase env 설정 | 동작 |
|---|---|---|
| `mock` (기본값) | 무관 | Mock 구현체 반환 (기존 동작 그대로) |
| `supabase` | 미설정 | console.warn 후 Mock fallback |
| `supabase` | 설정됨 | console.warn(미구현) 후 Mock fallback (Phase 6-B2+ 전까지) |

### 환경변수 정리 (.env.local.example 기준)

```
NEXT_PUBLIC_SUPABASE_URL=       # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase anon (public) key
REPOSITORY_PROVIDER=mock        # mock | supabase (기본값: mock)
STT_PROVIDER=mock
TTS_PROVIDER=mock
PRONUNCIATION_PROVIDER=mock
LLM_EVAL_PROVIDER=mock
```

### 설계 원칙

- `REPOSITORY_PROVIDER` 기본값 없음 → 환경변수 미설정 시 `process.env.REPOSITORY_PROVIDER !== 'supabase'` 조건으로 mock 선택됨
- `getSupabaseClient()` 는 모듈 레벨 싱글턴. 같은 process 내에서 최초 1회만 생성. 개발 서버 재시작 시 초기화.
- `warnNotImplemented()` 는 repository 이름별로 최초 1회만 경고 출력 (`Set<string>` 기반 dedup)
- 기존 Server Action, Server Component, Client Component 전부 수정 없음

### 테스트 결과

- `npm run lint` → 오류 없음 ✓
- `npx tsc --noEmit` → 오류 없음 ✓
- `npm run build` → 빌드 성공 ✓ (14개 라우트, 기존과 동일)

### 다음 단계 (Phase 6-B2)

1. Supabase Dashboard에서 `docs/spec/SUPABASE_SCHEMA.sql` 실행
2. 임시 RLS 정책 적용 (speaking_submissions, ai_evaluations)
3. `src/lib/repositories/supabase-submission-repository.ts` 구현
4. `src/lib/repositories/index.ts` — `getSubmissionRepository()` / `getEvaluationRepository()` Supabase 분기 활성화

---

## Phase 6-A — Supabase 저장소 추상화 (Database Schema & Repository Abstraction)

**날짜**: 2026-05-04  
**목표**: 기존 mock MVP를 깨지 않고, Supabase 저장 연동을 위한 DB 스키마와 저장소 추상화 구조를 설계. 실제 DB 연결·API 호출 없음. 다음 Phase에서 repository 선택 방식으로 안전하게 교체 가능하도록 준비.

### 생성 파일

**타입 (`src/types/`)**
- `src/types/db.ts` — Supabase 테이블 컬럼과 1:1 대응하는 DB Row 타입 11종 (snake_case). ClassRow, StudentRow, QuestionRow, QuestionSetRow, SpeakingSubmissionRow, MissionScenarioRow, MissionSubmissionRow, AIEvaluationRow, TeacherReviewRow, ProviderEventRow, ContentVersionRow.

**Repository 인터페이스 + Mock 구현 (`src/lib/repositories/`)**
- `src/lib/repositories/types.ts` — 6개 Repository 인터페이스 (SubmissionRepository, EvaluationRepository, TeacherReviewRepository, MissionRepository, StudentRepository, ClassRepository) + 입력/필터 타입 (SubmissionFilter, CreateSpeakingSubmissionInput, CreateAIEvaluationInput, SpeakingEvalRecord).
- `src/lib/repositories/mock-repository.ts` — 기존 mock store들을 repository 인터페이스로 wrapping하는 6개 Mock 구현체. 기존 store 파일 미수정. 서버 재시작 시 초기화되는 신규 제출 저장용 module-level Map 추가.
- `src/lib/repositories/index.ts` — Repository 팩토리 함수 6종 (getSubmissionRepository, getEvaluationRepository, getTeacherReviewRepository, getMissionRepository, getStudentRepository, getClassRepository). Phase 6-B에서 `REPOSITORY_PROVIDER=supabase` 환경변수로 교체 가능하도록 설계.

**스펙 문서 (`docs/spec/`)**
- `docs/spec/SUPABASE_SCHEMA.md` — 11개 테이블 스키마 설계서. 컬럼/타입/인덱스/JSONB 사유/mock 데이터 매핑/환경변수/RLS 방침/마이그레이션 전략 포함.
- `docs/spec/SUPABASE_SCHEMA.sql` — 실행 가능한 PostgreSQL DDL. CREATE TABLE + INDEX + RLS (주석 처리, Phase 6-B에서 활성화).
- `docs/spec/PILOT_RELEASE_PLAN.md` — 15일 파일럿 출시 계획. D+3/D+5/D+10/D+15 마일스톤, 포함/제외 기능, known issue, 파일럿 주의사항, 지원 기기 기준(학습자·교수자·관리자), 반응형 UI 점검 체크리스트(360px~1280px), 모바일 마이크 녹음 테스트 체크리스트(Android·iOS·Windows), 파일럿 출시 전 필수 기기 테스트 목록, 이후 Phase 제안(7-A/7-B/8-A/8-B) 포함.

### 수정 파일

- `docs/spec/WORK_LOG.md` — Phase 6-A 항목 추가 및 PILOT_RELEASE_PLAN.md 설명 업데이트

### 설계 원칙

- **기존 파일 무수정**: `src/lib/mock/` 하위 4개 store 파일, 모든 `app/` 라우트 파일 완전 보존
- **Provider 교체 방식**: 팩토리 함수에서 구현체 선택 → 기존 화면은 수정 없이 다음 Phase에서 교체 가능
- **구조적 회귀 방지**: 신규 파일 7개 추가만 발생, 기존 import 경로 미변경

### 테이블 목록

| 테이블 | 설명 |
|---|---|
| `classes` | 수업 반 |
| `students` | 학생 (익명 ID 포함) |
| `question_sets` | 문항 세트 |
| `questions` | 개별 문항 |
| `speaking_submissions` | 말하기 평가 제출 |
| `mission_scenarios` | 미션 시나리오 콘텐츠 |
| `mission_submissions` | 미션 대화 제출 |
| `ai_evaluations` | AI 평가 결과 (말하기+미션 공용) |
| `teacher_reviews` | 교수자 채점 결과 |
| `provider_events` | API 호출 로그 |
| `content_versions` | 콘텐츠 변경 이력 |

### Repository 인터페이스 요약

```
SubmissionRepository     listSubmissions / getSubmissionById / createSpeakingSubmission / updateSubmissionStatus
EvaluationRepository     getAIEvaluation / saveAIEvaluation / getSpeakingEvalRecord / saveSpeakingEvalRecord
TeacherReviewRepository  getTeacherReview / saveDraft / finalizeReview / getStatusOverride
MissionRepository        createSession / getSession / updateSession / createMissionSubmission / getMissionSubmission
StudentRepository        listStudents / getStudentById
ClassRepository          listClasses / getClassById
```

### 테스트 결과

- `npm run lint` → 오류 없음 ✓
- `npx tsc --noEmit` → 오류 없음 ✓
- `npm run build` → 빌드 성공 ✓

### 다음 단계 (Phase 6-B)

1. `@supabase/supabase-js` 설치
2. Supabase 클라이언트 초기화 파일 (`src/lib/supabase/client.ts`)
3. `SUPABASE_SCHEMA.sql` Supabase Dashboard에서 실행
4. SupabaseSubmissionRepository 구현 (speaking_submissions 저장부터 시작)
5. `REPOSITORY_PROVIDER=supabase` 환경변수 설정 + 기존 페이지 repository 전환

---

## Phase 5 — 교수자 채점 UI (Teacher Grading UI)

**날짜**: 2026-05-04
**목표**: 교수자 제출 목록 화면(`/teacher/submissions`)과 3단 채점 위저드(`/teacher/submissions/[id]`) 구현. mock 데이터·모듈 레벨 스토어만 사용. 실제 DB·API 연동 없음.

### 생성 파일

**타입 (`src/types/`)**
- `src/types/grading.ts` — `GradingWizardData`, `TeacherEvalDraft`, `RubricItemScore` 3종

**Mock 스토어 (`src/lib/mock/`)**
- `src/lib/mock/teacher-grading-store.ts` — 교수자 평가 초안·확정 메모리 스토어 (`getDraft`, `saveDraft`, `finalize`, `getStatusOverride`)

**제출 목록 페이지 (`app/teacher/submissions/`)**
- `app/teacher/submissions/page.tsx` — Server Component: mock 데이터 조합 → `TeacherSubmissionRow[]` 생성, `SubmissionsClient`에 전달. `getStatusOverride`로 서버 내 채점 확정 상태 반영. `force-dynamic` 설정.
- `app/teacher/submissions/submissions-client.tsx` — Client Component: 반·모국어·어권·유형·위험도·상태 6종 필터(AND 조건), StatCard 4개(전체·채점 대기·확정·평균 점수), 주의 학생 경고 배너, `TeacherSubmissionsTable` 렌더링.

**채점 위저드 (`app/teacher/submissions/[id]/`)**
- `app/teacher/submissions/[id]/page.tsx` — Server Component: submission·student·class·aiEval·riskFlag·rubricItems·question 조합 → `GradingWizardData` 전달. 404 처리 포함.
- `app/teacher/submissions/[id]/grading-wizard.tsx` — Client Component: 3단 위저드 상태 머신(1단계 보기→2단계 점수 조정→3단계 확정), `useTransition` + Server Action 연결.
- `app/teacher/submissions/[id]/wizard-step-indicator.tsx` — 진행 단계 표시 컴포넌트 (완료·활성·대기 시각화).
- `app/teacher/submissions/[id]/step-submission-view.tsx` — 1단계: 학생 정보·제출 정보·문항 내용·STT 전사문·AI 평가 요약·오류 태그·위험도 사유 표시.
- `app/teacher/submissions/[id]/step-rubric-adjust.tsx` — 2단계: 루브릭별 AI 점수 대비 교수자 점수 입력 테이블, 변동량(±delta) 색상 표시, 조정 이유 태그 선택, 내부 메모 입력.
- `app/teacher/submissions/[id]/step-final-feedback.tsx` — 3단계: 최종 점수 비교(AI vs 교수자), 학습자 공개 피드백·강점·보완점·다음 추천 활동 입력, 확정 버튼. 확정 후 readonly 전환.
- `app/teacher/submissions/[id]/actions.ts` — Server Action: `saveTeacherDraft`, `finalizeTeacherEvaluation`. mock 스토어 직접 호출.

### 수정 파일

**타입 (`src/types/`)**
- `src/types/data.ts` — `TeacherEvaluation`에 `strengths?`, `improvements?`, `nextActivity?` 3개 optional 필드 추가.

**테이블 컴포넌트 (`app/teacher/`)**
- `app/teacher/submissions-table.tsx` — `TeacherSubmissionRow` 타입에 `nativeLanguage: string` 추가. `studentName` 열에 `/teacher/submissions/[id]` Link 추가.
- `app/teacher/page.tsx` — 대시보드 row 빌드 시 `nativeLanguage` 필드 추가.

**채점 상세 페이지**
- `app/teacher/submissions/[id]/page.tsx` — `questionsJson.find()` 결과를 `Question` 타입으로 캐스팅하여 TS 오류 수정.

### 라우팅 구조

| 경로 | 렌더링 | 설명 |
|------|--------|------|
| `/teacher/submissions` | Dynamic | 제출 목록 (6종 필터, 통계 요약) |
| `/teacher/submissions/[id]` | Dynamic | 3단 채점 위저드 |

### 데이터 플로우

```
/teacher/submissions
  → Server: mockSubmissions × mockStudents × mockAIEvaluations × getStatusOverride()
  → SubmissionsClient: 6종 필터 (useMemo, AND 조건)
  → TeacherSubmissionsTable: 학생명 → Link('/teacher/submissions/[id]')

/teacher/submissions/[id]
  → Server: GradingWizardData 조합 (submission·student·class·aiEval·riskFlag·rubricItems·question)
  → GradingWizard (client): 3단 상태 머신
      Step 1: 제출물·AI 평가 확인
      Step 2: 루브릭 점수 조정 + 이유 선택 + 메모
      Step 3: 최종 점수 확인 + 피드백 작성 → finalizeTeacherEvaluation (Server Action)
```

### 설계 메모

- 스토어는 모듈 레벨 Map으로 서버 재시작 시 초기화. Phase 9에서 Supabase로 교체 예정.
- `force-dynamic`: `getStatusOverride` 호출로 인해 SSR 강제. 스토어 갱신이 목록에 즉시 반영됨.
- `questionsJson` → `Question` 타입 캐스팅: JSON 파일 내 `difficulty`가 `string` 타입으로 추론되어 union 불일치 발생. `as Question` 캐스팅으로 해소.
- 6종 필터는 모두 클라이언트 사이드 AND 필터 (`useMemo`). 서버 API 호출 없음.
- 채점 확정 후: 입력 필드 `readOnly`, 버튼 비활성화, "채점 확정 완료" 배지 표시.

### 테스트 결과

- `npm run lint` → 오류 없음 ✓
- `npx tsc --noEmit` → 오류 없음 ✓
- `npm run build` → 빌드 성공 ✓ (11개 라우트, `/teacher/submissions` · `/teacher/submissions/[id]` 신규)

### 브라우저 테스트 주소 (npm run dev 후)

- `/teacher/submissions` — 제출 목록 (6종 필터, 채점 대기 배너)
- `/teacher/submissions/sub-001` — teacher_reviewed 상태 채점 위저드 (기존 초안 존재)
- `/teacher/submissions/sub-002` — ai_evaluated 상태 채점 위저드 (AI 평가 완료, 미채점)
- `/teacher/submissions/sub-003` — finalized 상태 채점 위저드 (확정 완료, readonly)

---

## Phase 3 — 학습자 말하기 평가 플로우 (Speaking Assessment Flow)

**날짜**: 2026-05-04
**목표**: 학습자가 평가 세트/문항을 선택하고, 준비 단계를 거쳐 mock 녹음 제출, AI 평가 결과까지 확인하는 전체 플로우 구현. mock provider + 모듈 레벨 메모리 스토어만 사용. 실제 녹음·STT·DB 연동 없음.

### 생성 파일

**Mock 스토어 (`src/lib/mock/`)**
- `src/lib/mock/speaking-store.ts` — Phase 3 제출·평가 결과 메모리 스토어 (Map 기반, 서버 재시작 시 초기화. Phase 9에서 Supabase로 교체 예정)

**Server Action (`app/student/speaking/`)**
- `app/student/speaking/actions.ts` — `submitSpeaking(questionId, questionSetId)`: mock STT·발음평가·LLM 평가를 병렬 호출하고 결과를 스토어에 저장 후 submissionId 반환

**말하기 평가 세트/문항 선택 (`app/student/speaking/`)**
- `app/student/speaking/page.tsx` — Server Component: 활성 평가 세트와 문항을 question-sets.json/questions.json에서 로드하여 정적 렌더링. 각 문항에 `/student/speaking/[questionId]?setId=...` 링크 제공

**문항 상세 + 녹음 UI (`app/student/speaking/[questionId]/`)**
- `app/student/speaking/[questionId]/page.tsx` — Server Component: params/searchParams await(Next.js 16 방식), 문항 정보 로드 후 SpeakingClient에 데이터 props로 전달. setId 없으면 첫 번째 포함 세트 사용.
- `app/student/speaking/[questionId]/speaking-client.tsx` — Client Component: 4단계 상태 머신(prep→recording→review→submitting). 준비 타이머(카운트다운), mock 녹음 UI(경과 시간 표시·자동 종료), 제출 버튼(Server Action 직접 import·useRouter 리다이렉트). effect body 직접 setState 없이 setTimeout 콜백 내에서만 phase 전환.

**평가 결과 화면 (`app/student/speaking/[questionId]/result/`)**
- `app/student/speaking/[questionId]/result/page.tsx` — Server Component: submissionId로 스토어 조회. 스토어 미스(서버 재시작)시 안내 메시지 표시. 총점·루브릭별 ScoreBar·AI 피드백(강점/보완점/오류 유형)·STT 전사문·발음 단어별 점수·다음 추천 활동 placeholder 렌더링.

### 수정 파일

**학습자 레이아웃 (`app/student/`)**
- `app/student/layout.tsx` — "말하기 평가" nav item href `/student/assessment` → `/student/speaking`, `disabled` 제거
- `app/student/today-tasks.tsx` — "시작하기" Button → Link(`/student/speaking`)로 교체

### 라우팅 구조

| 경로 | 렌더링 | 설명 |
|------|--------|------|
| `/student/speaking` | Static | 평가 세트·문항 목록 |
| `/student/speaking/[questionId]` | Dynamic | 문항 상세·녹음 UI |
| `/student/speaking/[questionId]/result` | Dynamic | 평가 결과 (STT·AI·발음) |

### 데이터 플로우

```
학습자 선택 → /student/speaking/[questionId]?setId=...
  → SpeakingClient: 준비 타이머 → 녹음 UI → 제출
  → Server Action: submitSpeaking(questionId, questionSetId)
      → mock STT / mock 발음평가 / mock LLM 평가 병렬 실행
      → SpeakingEvalRecord를 evalStore(Map)에 저장
      → return { submissionId }
  → router.push('/student/speaking/[questionId]/result?sub=[submissionId]')
  → Result Page: getSpeakingEval(submissionId) → 결과 렌더링
```

### 설계 메모

- SpeakingEvalRecord는 Submission + AIEvaluation 데이터를 통합. Phase 5 교수자 채점 UI에서 연결 가능하도록 questionId·questionSetId·submittedAt 포함.
- Server Component → Client Component 간 함수 직접 props 전달 없음. Server Action은 별도 `actions.ts`('use server' 파일)에서 client에 직접 import.
- nativeLanguage·languageGroup·uiSupportLanguage 필드는 Student 타입에 유지되나, 이번 Phase에서는 다국어 UI 미구현.
- 스토어는 모듈 레벨 Map. 서버 재시작 시 초기화되며, 결과 페이지에서 미스 처리(graceful error)로 안내.

### 테스트 결과

- `npm run lint` → 오류 없음 ✓
- `npx tsc --noEmit` → 오류 없음 ✓
- `npm run build` → 빌드 성공 ✓ (9개 페이지 생성, 3개 신규 라우트 포함)

### 브라우저 테스트 주소 (npm run dev 후)

- `/student/speaking` — 평가 세트·문항 선택
- `/student/speaking/q-001?setId=qs-diagnostic-01` — 자기소개(기본) 녹음 화면
- `/student/speaking/q-005?setId=qs-practice-01` — 상황 대응 녹음 화면
- `/student/speaking/q-001/result?sub=[submissionId]` — 평가 결과 (제출 후 자동 리다이렉트)

---

## Phase 2 — Mock 대시보드 정교화 (Dashboard Refinement)

**날짜**: 2026-05-03
**목표**: Phase 1 AppShell·컴포넌트를 기반으로 학습자·교수자·관리자 대시보드를 실제 서비스처럼 정교화. mock 데이터만 사용, 실제 API·DB 연동 없음.

### 생성 파일

**학습자 대시보드 (`app/student/`)**
- `today-tasks.tsx` — 오늘의 연습 과제 카드 리스트 (questionSet 기반, 완료/미완료 구분)
- `score-breakdown.tsx` — 루브릭 항목별 점수 시각화 (ScoreBar × 5항목, 피드백 표시)
- `recommended-activity.tsx` — 다음 추천 활동 placeholder (말하기 평가·미션·TTS 섀도잉)

**교수자 대시보드 (`app/teacher/`)**
- `dashboard-client.tsx` — `"use client"` 필터 상태 관리 컴포넌트 (classId·어권·유형·상태·위험도 5종 필터)
- `class-summary-cards.tsx` — 반별 현황 요약 카드 (학생 수·제출 수·평균 점수·채점 대기·주의 학생)

**관리자 대시보드 (`app/admin/`)**
- `content-sets-table.tsx` — 콘텐츠 세트 현황 테이블 (문항 수·제출 건수·평균 점수)
- `provider-status-card.tsx` — STT·TTS·발음평가·LLM 제공자 설정 상태 카드 (mock 표시)

### 수정 파일

**타입 (`src/types/`)**
- `src/types/data.ts` — `RiskFlag`, `ContentSetSummary`, `ProviderStatus` 타입 3개 추가

**Mock 데이터 (`src/lib/mock/`)**
- `src/lib/mock/data.ts` — 학생 3명 추가(→8명), 제출 10건 추가(→18건), AI 평가 6건 추가(→11건)
  - `mockRiskFlags` export 추가 (3건 — medium×2, high×1)
  - `mockContentSets` export 추가 (3건 — 진단·연습·사후평가 세트 현황)
  - `mockProviderStatus` export 추가 (4건 — STT/TTS/발음/LLM 모두 mock)
  - `mockData` 오브젝트에 위 3종 추가

**학습자 대시보드 (`app/student/`)**
- `page.tsx` — 오늘의 과제·루브릭 점수 breakdown·학생 정보(모국어/어권)·추천 활동 섹션 추가

**교수자 대시보드 (`app/teacher/`)**
- `page.tsx` — 서버에서 전체 데이터 계산 후 `TeacherDashboard` 클라이언트에 전달하는 구조로 재구성
  - `mockRiskFlags` 반영하여 위험도 계산 (점수 기반 + 플래그 기반 중 높은 것 적용)
- `submissions-table.tsx` — `classId`, `className`, `languageGroupRaw` 필드 추가, "반" 열 추가

**관리자 대시보드 (`app/admin/`)**
- `page.tsx` — 콘텐츠 세트 현황 + Provider 설정 상태 섹션 추가

### 필터 구조 (교수자 대시보드)

| 필터 | 키 | 옵션 |
|------|-----|------|
| 반 | `classId` | 전체 / class-01 / class-02 |
| 어권 | `languageGroup` | 전체 / 동아시아 / 동남아시아 / 아랍어권 / 유럽 / 기타 |
| 유형 | `contentType` | 전체 / 말하기 평가 / 미션 대화 / 말하기 대회 |
| 상태 | `evaluationStatus` | 전체 / 채점 대기 / AI 평가 완료 / 교수자 검토 / 확정 |
| 위험도 | `riskLevel` | 전체 / 주의 / 보통 / 정상 |

필터 조합: AND 조건, 클라이언트 사이드 순수 계산 (`useMemo` 활용)

### 설계 메모

- 교수자 페이지: 서버 컴포넌트가 전체 데이터 계산 → `TeacherDashboard` (클라이언트) props로 전달.
  향후 "AI 평가 보며 최종 채점하는 3단 UI"는 Phase 3에서 별도 라우트(`/teacher/review/[submissionId]`)로 구현 예정.
- 학습자 오늘의 과제: 해당 학생이 아직 제출하지 않은 questionSet을 "미완료 과제"로 표시.
- `RiskFlag` 데이터가 있는 학생은 점수 기반 위험도보다 높은 레벨로 표시 (`high` 우선).
- `ContentSetSummary`는 question-sets.json 기반의 런타임 집계 뷰로, Phase 9에서 Supabase 집계 쿼리로 교체 예정.

### 테스트 결과
- `npm run lint` → 오류 없음 ✓
- `npx tsc --noEmit` → 오류 없음 ✓
- `npm run build` → 빌드 성공 ✓ (8개 정적 페이지 생성)

### 브라우저 테스트 주소 (npm run dev 후)
- `/student` — 학습자 대시보드
- `/teacher` — 교수자 대시보드 (필터 5종 동작)
- `/admin` — 관리자 대시보드 (콘텐츠 세트 + Provider 상태)

---

## Phase 1 — 디자인 시스템 & 공통 레이아웃 (Design System & Layout)

**날짜**: 2026-05-03
**목표**: 전문적이고 수정이 쉬운 UI/UX 기반 — 디자인 토큰, 공통 컴포넌트, AppShell, 역할별 대시보드 초안

### 생성 파일

**디자인 시스템**
- `app/globals.css` — 수정: Tailwind v4 `@theme` 기반 Primary(네이비 블루)/Success/Warning/Danger 팔레트, 시맨틱 CSS 변수(`--surface`, `--border`, `--text-*`), 다크모드 지원
- `app/layout.tsx` — 수정: Geist Sans → Noto Sans KR(`next/font/google`), Geist Mono 유지

**공통 UI 컴포넌트 (`src/components/ui/`)**
- `button.tsx` — variant(primary/secondary/ghost/danger), size(sm/md/lg), loading spinner
- `card.tsx` — Card / CardHeader / CardBody / CardFooter 4종 슬롯 구조
- `badge.tsx` — variant(default/success/warning/danger/info/outline), size(sm/md)
- `score-bar.tsx` — 점수 진행 바 (60/80 컷오프 색상 자동)
- `score-badge.tsx` — 숫자 점수 뱃지 (동일 색상 로직)
- `risk-badge.tsx` — RiskLevel(low/medium/high) → 색상 뱃지
- `data-table.tsx` — 제네릭 DataTable, 정렬 지원 (Client Component)
- `filter-panel.tsx` — 필터 패널, select 기반 (Client Component)
- `stat-card.tsx` — 숫자 지표 카드 (value + label + trend)
- `page-header.tsx` — 페이지 헤더 (title + description + action 슬롯)
- `empty-state.tsx` — 빈 상태 표시
- `index.ts` — barrel export

**AppShell 레이아웃 (`src/components/layout/`)**
- `app-shell.tsx` — Topbar + Sidebar + main 래퍼, `role`/`navItems` props
- `sidebar.tsx` — 역할별 navItems 렌더링, `usePathname` 기반 active (Client Component)
- `topbar.tsx` — 로고, 플랫폼명, 역할 뱃지
- `index.ts` — barrel export

**역할별 레이아웃 (신규)**
- `app/student/layout.tsx` — 학습자 AppShell, navItems 4개 (말하기 평가·미션 대화·대회 disabled)
- `app/teacher/layout.tsx` — 교수자 AppShell, navItems 4개 (학생 관리·제출 내역·루브릭 disabled)
- `app/admin/layout.tsx` — 관리자 AppShell, navItems 5개 (반·학생·콘텐츠·리포트 disabled)

**역할별 대시보드 페이지 (수정)**
- `app/page.tsx` — 역할 선택 랜딩 페이지 (학습자/교수자/관리자 3종 진입 카드)
- `app/student/page.tsx` — 학습자 대시보드: StatCard 3개 + 제출 내역 DataTable (mock 연결)
- `app/teacher/page.tsx` — 교수자 대시보드: StatCard 4개 + 전체 제출 DataTable + 위험도 뱃지 (mock 연결)
- `app/admin/page.tsx` — 관리자 대시보드: StatCard 4개 + 반별 현황 + 어권별 분포 DataTable 2개 (mock 연결)

**타입 수정**
- `src/types/data.ts` — `ErrorTagType`에 `'grammar'` 추가 (mock 데이터 일치 버그 수정)

### 테스트 결과
- `npm run lint` → 오류 없음 ✓
- `npx tsc --noEmit` → 오류 없음 ✓

### 메모
- 모든 컴포넌트는 Phase 0 디자인 토큰(`--surface`, `--border`, `--text-*`)을 기반으로 Tailwind 유틸리티 사용
- 아이콘은 외부 라이브러리 없이 인라인 SVG로 처리 (lucide-react 미설치)
- 말하기 평가 기능, 인증, DB 연동, 차트는 이번 Phase 제외
- 모바일 사이드바(햄버거 메뉴)는 Phase 미구현 — md: breakpoint에서 표시

---

## Phase 0 — 기반 설정 (Foundation)

**날짜**: 2026-05-03
**목표**: 프로젝트 기반 구조 정리 — 폴더 골격, TypeScript 타입, 콘텐츠 JSON, Provider 인터페이스, Mock 데이터, 라우트 플레이스홀더

### 생성 파일

**TypeScript 타입 (`src/types/`)**
- `src/types/content.ts` — QuestionType, Question, QuestionSet, Rubric, Scenario, Persona, FeedbackTemplate, LanguageGroup
- `src/types/data.ts` — Student, Class, Submission, AIEvaluation, TeacherEvaluation, SubmissionStatus, RiskLevel
- `src/types/providers.ts` — Provider 인터페이스 및 결과 타입 (STT, TTS, Pronunciation, LLMEval)

**콘텐츠 JSON (`src/content/`)**
- `src/content/language-groups.json` — 6개 어권 (베트남어, 중국어, 일본어, 아랍어, 영어, 기타)
- `src/content/question-types.json` — 4개 평가 유형 (자기소개, 그림묘사, 상황대응, 의견말하기)
- `src/content/questions.json` — 8개 문항
- `src/content/question-sets.json` — 3개 문제 세트 (진단·연습·사후평가)
- `src/content/rubrics.json` — 1개 루브릭 (v1.0, 발음·유창성·어휘·문법·과제수행 5항목)
- `src/content/scenarios.json` — 3개 상황 미션 시나리오 (식당, 병원, 교통)
- `src/content/personas.json` — 3개 AI 페르소나
- `src/content/feedback-templates.json` — 5개 피드백 템플릿

**Mock 데이터 (`src/lib/mock/`)**
- `src/lib/mock/data.ts` — 학생 5명, 반 2개, 제출물 8건, AI평가 4건, 교수자평가 2건

**Provider 인터페이스 + Mock 구현 (`src/providers/`)**
- `src/providers/stt/index.ts` — STT Provider (mock)
- `src/providers/tts/index.ts` — TTS Provider (browser, mock)
- `src/providers/pronunciation/index.ts` — 발음평가 Provider (mock)
- `src/providers/llm-eval/index.ts` — LLM 평가 Provider (mock)
- `src/providers/index.ts` — Provider 레지스트리

**App Router 라우트 플레이스홀더**
- `app/student/page.tsx`
- `app/teacher/page.tsx`
- `app/admin/page.tsx`
- `app/api/health/route.ts`

### 수정 파일
- `app/layout.tsx` — `lang="ko"`, metadata title/description 업데이트

### 환경변수 (이름만 참조, 값 미확인)
- `STT_PROVIDER` — mock | etri | whisper | azure
- `TTS_PROVIDER` — browser | azure
- `PRONUNCIATION_PROVIDER` — mock | etri | azure
- `LLM_EVAL_PROVIDER` — mock | claude | openai (미설정 시 mock fallback)
- `NEXT_PUBLIC_SUPABASE_URL` — Phase 9에서 사용
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — publishable key만 사용 (Phase 9에서 사용)

### 메모
- Supabase SDK 미설치. Phase 9에서 `@supabase/supabase-js` 설치 예정.
- Provider 파일은 서버 전용. Route Handler를 통해서만 호출.
- `@/*` alias → 프로젝트 루트. `@/src/types/...` 형태로 import.
- `.env.local` 내용 읽지 않음.

### lint 결과
- `npm run lint` → 에러 0, 경고 0 (완전 통과)
- `eslint.config.mjs`에 `argsIgnorePattern: "^_"` 추가하여 mock 구현체의 의도적 미사용 파라미터(`_`, `__`) 허용

### 완료 확인
- [x] `npm run lint` 오류 없음
- [ ] `/student`, `/teacher`, `/admin` 라우트 접근 가능 (`npm run dev` 후 확인 필요)
- [ ] `/api/health` → `{ status: "ok" }` 응답 확인 필요

---

## Phase 0 보강 — 모국어/어권 확장 최소 구조 반영

**날짜**: 2026-05-03
**목표**: 향후 모국어 선택 및 한국어+모국어 병기 UI를 쉽게 추가할 수 있도록 데이터 구조만 최소 반영

### 변경 파일

**`src/types/content.ts`**
- `LanguageGroupCategory` 타입 추가: `'korean' | 'east-asian' | 'southeast-asian' | 'arabic' | 'european' | 'other'`
- `TextDirection` 타입 추가: `'ltr' | 'rtl'`
- `LanguageGroup` 타입 갱신: `name` → `nameKo`, `nativeName` → `nameNative`, `languageGroup`, `direction` 추가

**`src/types/data.ts`**
- `SupportedUILanguage` 타입 추가: `'ko' | 'en' | 'vi' | 'th' | 'ar'`
  - TODO 주석 포함: Phase 9+에서 Supabase auth profile 연동 + i18n 렌더링 구현 예정
- `Student` 타입에 필드 추가:
  - `languageGroup: LanguageGroupCategory` — 교수자/관리자 필터용 대분류
  - `uiSupportLanguage: SupportedUILanguage` — 향후 UI 언어 전환 기준
- `LanguageGroupCategory` re-export를 `./content`에서 import

**`src/content/language-groups.json`**
- 필드 구조 갱신: `name` → `nameKo`, `nativeName` → `nameNative`, `languageGroup`, `direction` 추가
- 신규 항목 추가: `lg-ko` (한국어), `lg-th` (태국어)
- `lg-ar` — `direction: "rtl"` 명시

**`src/lib/mock/data.ts`**
- `mockStudents` 각 항목에 `languageGroup`, `uiSupportLanguage` 추가
- 헬퍼 함수 `s()` 도입으로 타입 단언 없이 두 필드를 함께 지정
- 중국어·일본어(미지원) → `uiSupportLanguage: 'ko'` 폴백 명시

### 설계 메모 (i18n 미구현 근거)

MVP에서 UI 다국어 병기를 구현하지 않는 이유:
1. 현재 학습자 수가 적어 교수자가 직접 한국어 인터페이스를 안내할 수 있음
2. next-intl 등 i18n 라이브러리 도입은 라우팅 구조 변경을 수반 → Phase 9+ 이후 결정
3. `SupportedUILanguage` 타입과 `uiSupportLanguage` 필드를 데이터에 확보했으므로,
   향후 학습자 프로필에 언어 설정을 저장하고 UI를 전환하는 기능을 추가할 수 있음

### 필터링 구조 요약

교수자/관리자 대시보드에서 다음 두 가지 기준으로 학습자를 필터링할 수 있음:
- `nativeLanguage` (문자열) → 특정 언어명으로 검색
- `languageGroup` (enum) → 어권 대분류로 그룹 필터 (예: 동남아권, 아랍어권)

두 필드 모두 `Student` 타입에 포함되어 있으므로, Phase 5·6 UI 구현 시 추가 데이터 변경 없이 필터 로직을 연결할 수 있음.

### lint 결과
- `npm run lint` → 에러 0, 경고 0
