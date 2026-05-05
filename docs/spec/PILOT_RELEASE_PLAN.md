# 15일 파일럿 출시 계획

Korean Speaking AI MVP — 소규모 파일럿 출시 로드맵.  
기준일: **2026-05-04 (D+0)**

---

## 목표

15일 이내(D+15, 2026-05-19)에 실제 교수자 1~2명, 학습자 5~10명 규모의 소규모 파일럿을 진행할 수 있는 최소 기능 버전을 출시한다.

**파일럿 목적:**
- 교수자 채점 워크플로우 현장 검증
- 학습자 말하기 평가 UX 피드백 수집
- Supabase 저장 연동 안정성 확인
- 실제 사용 데이터 기반 AI 평가 품질 초기 측정

---

## 마일스톤 요약

| 마일스톤 | 날짜 | 핵심 조건 | 상태 |
|---|---|---|---|
| **D+0** — Phase 6-A 완료 | 2026-05-04 | 저장소 추상화 구조, 스키마 초안 | ✅ 완료 |
| **D+3** — 최소기능 시연판 | 2026-05-07 | Supabase 연결 + 핵심 경로 저장 확인 | ✅ 완료 (Phase 6-B1~B2) |
| **D+5** — Supabase 저장 연동 보완판 | 2026-05-09 | 모든 저장 경로 DB 연동 완료 | ✅ 완료 (Phase 6-B2~B5) |
| **D+10** — 로그인/역할 분기 | 2026-05-14 | Supabase Auth 기반 로그인 + 역할별 route 보호 | ✅ 완료 (Phase 9-A) |
| **D+15** — 소규모 파일럿 출시판 | 2026-05-19 | 배포 완료 + 파일럿 가이드 | 진행 예정 |

---

## 지원 기기 기준

파일럿 출시 기준 역할별 지원 기기와 우선순위를 정의한다.

| 역할 | 1순위 | 2순위 | 비고 |
|---|---|---|---|
| **학습자** | 휴대전화 (세로) | 태블릿, 노트북 | 말하기 평가·미션 대화 흐름 우선 지원 |
| **교수자** | 노트북 | 태블릿 (가로) | 채점 위저드는 노트북 최적화 기준 설계 |
| **관리자** | 노트북 | — | 대시보드 열 수·필터가 넓은 화면 기준 |

**학습자 우선 지원 경로 (모바일):**
- `/student/speaking/[questionId]` — 말하기 평가 녹음 화면
- `/student/speaking/[questionId]/result` — 평가 결과 화면
- `/student/mission/[scenarioId]` — 미션 대화 화면
- `/student/mission/[scenarioId]/result` — 미션 결과 화면

> 현재 Phase에서는 기기 기준 정의만 수행. 실제 반응형 UI 보완은 Phase 7-A에서 진행.

---

## D+3 — 최소기능 시연판 (2026-05-07)

**목표**: 이해관계자 시연 가능 수준. Supabase 연결 확인.

**완료 조건:**
- Phase 6-A 산출물: 스키마 DDL, repository 인터페이스, mock adapter 완료
- `SUPABASE_SCHEMA.sql` Supabase Dashboard에서 실행 완료
- `@supabase/supabase-js` 설치 + Supabase 클라이언트 초기화 파일 작성
- `speaking_submissions` 테이블에 신규 제출 저장 동작 확인 (SupabaseSubmissionRepository 최소 구현)
- 기존 mock 화면 전체 정상 동작 유지
- `/api/health` 응답 + Supabase 연결 상태 포함

**포함 범위:**
- 모든 mock MVP 화면 (`/student`, `/teacher`, `/admin`)
- Supabase schema 적용 완료
- speaking_submissions → DB 저장 (SupabaseSubmissionRepository 부분 구현)

**제외 범위:**
- teacher_reviews, mission_submissions DB 연동
- 실제 녹음/STT

---

## D+5 — Supabase 저장 연동 보완판 (2026-05-09) ✅ 완료

**목표**: 모든 핵심 제출·채점 데이터 DB에 저장.

**완료 조건 및 결과:**
- [x] SupabaseSubmissionRepository 전체 구현 (Phase 6-B2)
- [x] SupabaseEvaluationRepository 구현 — ai_evaluations 저장 (Phase 6-B2)
- [x] SupabaseTeacherReviewRepository 구현 — teacher_reviews 저장 (Phase 6-B3)
- [x] SupabaseMissionRepository 구현 — mission_submissions 저장 (Phase 6-B4)
- [x] `REPOSITORY_PROVIDER=supabase` 환경변수로 전환 가능
- [x] mock fallback 유지 — `REPOSITORY_PROVIDER=mock`(미설정) 시 기존 동작 100% 유지
- [x] Supabase 저장 실패 시 graceful degradation (화면 중단 없음)
- [ ] RLS 기본 정책 설정 — **Phase 9(Auth 도입)으로 연기** (파일럿 단계 임시 disable 허용, SUPABASE_SCHEMA.md 참조)

**달성된 데이터 플로우 변경:**
```
Before: Server Action → mock store (Map)
After:  Server Action → mock store (항상, result 페이지 read 의존)
                     → SupabaseRepository (REPOSITORY_PROVIDER=supabase 시 추가 저장)
                          → supabase-js → PostgreSQL
```

**Phase 6-B5 기준 저장 성공 테이블:**
- `speaking_submissions` + `ai_evaluations` (speaking)
- `teacher_reviews`
- `mission_submissions` + `ai_evaluations` (mission)

**알려진 D+5 잔여 이슈 (D+10 이후 해소 예정):**
- teacher 제출 목록이 여전히 mock data.ts 직독 (read 경로 미통합)
- result 페이지 URL이 mock submissionId 기반 (Supabase UUID 미연결)
- teacher_reviews.submission_id가 placeholder UUID (speaking_submissions와 미연결)

---

## D+10 — 로그인/역할 분기 (2026-05-14) ✅ 완료 (Phase 9-A)

**목표**: Supabase Auth 기반 로그인과 역할 분기 구현.

**완료 조건 및 결과:**
- [x] `/login` 이메일/비밀번호 로그인 화면 (Phase 9-A)
- [x] `user_profiles` 테이블 DDL + RLS 정책 (수동 적용 필요)
- [x] middleware route 보호 (`/student`, `/teacher`, `/admin`)
- [x] 역할별 redirect: student→/student, teacher/admin→/teacher
- [x] `/role-missing` 안내 화면
- [x] 로그아웃 버튼 (Topbar)
- [x] Supabase 미설정 시 auth bypass (smoke test 호환)
- [x] 교사 대시보드 DB 실시간 제출 테이블 추가

**Phase 9-B 완료 내용:**
- [x] user_profiles UPDATE 정책 위험성 확인 및 제거 (role 자기 변경 취약점 차단)
- [x] 계정/역할 운영 절차 SQL 예시 문서화 (student/teacher/admin 계정 생성 방법)
- [x] Phase 9-C RLS 계획 블록 작성 (speaking_submissions, ai_evaluations, teacher_reviews 등)
- [x] 교사 대시보드 DB 실시간 테이블에 제출 ID 컬럼 추가
- [x] student nav "말하기 대회 준비" 명칭 명확화
- [x] proxy.ts = Next.js 16 middleware 파일 규약 확인 (정상 동작)

**Phase 9-C 완료 내용:**
- [x] `/student` route에 user_profiles 존재 확인 추가 (role 없는 인증 사용자 → /role-missing)
- [x] proxy.ts role check 통합 (모든 protected route 단일 DB 쿼리)
- [x] smoke test에 /student nav 항목(말하기 평가·미션 대화·말하기 대회 준비) 표시 확인 추가
- [x] 파일럿 운영 절차 (계정 생성, role 연결, 수동 테스트 체크리스트) 완전 문서화
- [x] RLS 적용/보류 최종 판단 문서화 완료

**Phase 9 최종 Known Issues (Phase 10 또는 운영 안정화 단계):**
- `user_profiles` display_name 수정 UI 없음 (Dashboard에서 직접 변경)
- speaking_submissions 등 핵심 테이블 RLS 미적용 (Auth 기반 제출 전환 완료 후 적용 예정)
- recordings public URL 정책 재검토 필요 (signed URL 전환 예정)
- provider_events RLS 미적용 (admin/service role만 접근 예정)
- admin 전용 route 분리 미완료 (현재 teacher와 동일 접근 권한)
- 실제 student/teacher/admin 계정 로그인 E2E 테스트는 계정 준비 후 수동 확인 필요

---

## Phase 9 최종 상태 및 파일럿 운영 절차 (2026-05-05)

### Phase 9 완료 기준

| 기능 | 상태 |
|---|---|
| `/login` 이메일/비밀번호 로그인 화면 | ✅ |
| role 기반 route 분기 (proxy.ts) | ✅ |
| student → `/student` redirect | ✅ |
| teacher/admin → `/teacher` redirect | ✅ |
| role 없는 계정 → `/role-missing` 안내 | ✅ |
| 미인증 사용자 → `/login` 유도 | ✅ |
| 로그아웃 버튼 (Topbar) | ✅ |
| `user_profiles` 테이블 + own profile read RLS | ✅ (수동 적용 완료) |
| 계정 생성/role 연결 수동 절차 문서화 | ✅ |
| smoke test auth 우회 (SMOKE_TEST_MODE=1) | ✅ |
| 기존 AI 말하기 평가 파이프라인 유지 | ✅ |
| RLS 전면 적용 (Phase 10 예정) | ⏳ |

---

### Supabase Auth 계정 생성 절차

1. Supabase Dashboard > **Authentication** > **Users** 탭 이동
2. **"Add user"** 클릭 → 이메일 + 비밀번호 입력 → 생성
3. 생성된 사용자의 **User UID** 복사
4. **SQL Editor** 탭에서 아래 INSERT 실행 (role에 맞게 선택):

```sql
-- 학습자 계정
INSERT INTO public.user_profiles (user_id, role, display_name)
VALUES ('<student-auth-user-uuid>', 'student', '학습자 테스트');

-- 교수자 계정
INSERT INTO public.user_profiles (user_id, role, display_name)
VALUES ('<teacher-auth-user-uuid>', 'teacher', '교사 테스트');

-- 관리자 계정
INSERT INTO public.user_profiles (user_id, role, display_name)
VALUES ('<admin-auth-user-uuid>', 'admin', '관리자 테스트');
```

> ⚠️ `<...-uuid>` 부분은 실제 auth user UUID로 교체. 실제 UUID/이메일/비밀번호는 이 문서에 기록하지 말 것.

학습자의 경우 `students` 테이블 row와 연결할 때 `student_id`도 함께 지정:
```sql
INSERT INTO public.user_profiles (user_id, role, display_name, student_id)
VALUES ('<student-auth-user-uuid>', 'student', '홍길동', '<students-table-uuid>');
```

---

### 수동 로그인 테스트 체크리스트

파일럿 배포 후 실제 계정으로 아래 항목을 순서대로 확인한다.

**학습자(student) 계정 테스트**
- [ ] `/login`에서 student 이메일/비밀번호 입력 → 로그인 성공
- [ ] 로그인 후 `/student`로 자동 이동
- [ ] 사이드바에 "말하기 평가", "미션 대화", "말하기 대회 준비(준비중)" 표시
- [ ] `/student/speaking/q-001` 접근 및 말하기 평가 화면 표시
- [ ] `/teacher` 직접 접근 시 `/student`로 redirect (권한 없음)
- [ ] Topbar 로그아웃 버튼 → 클릭 후 `/login` 이동
- [ ] 로그아웃 후 `/student` 직접 접근 → `/login` redirect

**교수자(teacher) 계정 테스트**
- [ ] `/login`에서 teacher 이메일/비밀번호 입력 → 로그인 성공
- [ ] 로그인 후 `/teacher`로 자동 이동
- [ ] 교사 대시보드에서 "채점 관리" 헤더 표시
- [ ] (DB 연결 시) 최근 제출 현황 테이블 표시
- [ ] `/teacher/submissions`에서 제출 목록 확인
- [ ] Topbar 로그아웃 버튼 → 클릭 후 `/login` 이동

**관리자(admin) 계정 테스트**
- [ ] `/login`에서 admin 계정 로그인 → `/teacher`로 이동 (admin 전용 route는 Phase 10)
- [ ] 교사 대시보드 접근 가능 확인

**역할 미설정 계정 테스트**
- [ ] user_profiles row 없는 계정으로 로그인 → `/role-missing` 화면 표시
- [ ] "역할 정보 없음" 메시지 및 로그아웃 버튼 표시
- [ ] 로그아웃 후 `/login`으로 이동

---

### RLS 적용/보류 최종 판단

현재 MVP는 anon key 기반 server action으로 제출/저장 흐름이 구성되어 있다. RLS를 전면 활성화하면 기존 INSERT/SELECT가 차단될 수 있으므로, Auth 기반 제출 전환 완료 후 단계적으로 적용한다.

| 테이블 | 현재 상태 | 판단 | 예정 시기 |
|---|---|---|---|
| `user_profiles` | own profile read 적용 완료 | ✅ 적용 | Phase 9-A |
| `user_profiles` UPDATE | 미적용 (role self-update 위험) | ❌ 적용 금지 | Phase 10에서 SECURITY DEFINER 함수로 대체 |
| `speaking_submissions` | RLS 미적용 | ⏳ 보류 | Phase 10 (Auth 기반 제출 전환 후) |
| `ai_evaluations` | RLS 미적용 | ⏳ 보류 | Phase 10 |
| `teacher_reviews` | RLS 미적용 | ⏳ 보류 | Phase 10 |
| `mission_submissions` | RLS 미적용 | ⏳ 보류 | Phase 10 |
| `provider_events` | RLS 미적용 | ⏳ 보류 | Phase 10 (내부 로그용, anon 노출 불필요) |
| Storage `recordings` | public URL 정책 | ⏳ 재검토 | Phase 10 (signed URL 전환 고려) |

**보류 근거**: "현재 MVP는 익명/파일럿 제출 흐름을 일부 유지하므로, 인증 기반 repository 전환 전 RLS 전면 적용 시 `speaking_submissions` 등의 INSERT/SELECT가 실패할 수 있음. Phase 10에서 Auth 세션을 server action에 전달하는 방식으로 전환한 뒤 RLS 정책을 함께 적용한다."

---

### 운영 전 필수 확인 사항

배포 전 아래 항목을 반드시 점검한다.

**환경변수 (Vercel 프로젝트 설정)**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` 설정
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정
- [ ] `SMOKE_TEST_MODE` 미설정 또는 `0` (운영 환경에서 auth 우회 금지)
- [ ] `REPOSITORY_PROVIDER=supabase` 설정 (미설정 시 mock 모드)

**Supabase 설정**
- [ ] `user_profiles` 테이블 생성 완료 (`SUPABASE_SCHEMA.sql` Phase 9-A 블록 참조)
- [ ] `user_profiles` own profile read RLS 활성화 완료
- [ ] 파일럿 참가자(학습자/교수자) 계정 생성 완료
- [ ] 각 계정의 `user_profiles` role 연결 완료

**배포 후 동작 확인**
- [ ] `/login` 화면 정상 표시
- [ ] 실제 학습자 계정 로그인 → `/student` 이동 확인
- [ ] 실제 교수자 계정 로그인 → `/teacher` 이동 확인
- [ ] 미인증 상태에서 `/student` 직접 접근 → `/login` redirect 확인
- [ ] `SMOKE_TEST_MODE` 환경변수 없음 확인 (운영 서버에서 auth bypass 금지)

---

## D+15 — 소규모 파일럿 출시판 (2026-05-19)

**목표**: 실제 사용자와 파일럿 세션 시작.

**완료 조건:**
- Vercel 배포 완료 + 커스텀 도메인 또는 vercel.app URL
- Supabase 프로젝트 프로덕션 티어 확인
- 파일럿용 학생/반 데이터 seed 완료
- 교수자용 간단한 사용 가이드 작성
- 학생용 간단한 시작 안내 작성
- 알려진 제한사항 문서화
- 파일럿 출시 전 필수 기기 테스트 체크리스트 통과 (Android · iPhone · iPad · Windows)

---

## 출시판 포함 기능

| 기능 | 경로 | 비고 |
|---|---|---|
| 학습자 말하기 평가 진입 | `/student/speaking` | 문항 선택 |
| 말하기 평가 녹음 + 제출 | `/student/speaking/[questionId]` | D+10 이전은 mock 녹음 |
| 말하기 평가 결과 확인 | `/student/speaking/[questionId]/result` | AI 평가 결과 표시 |
| 학습자 미션 목록 | `/student/mission` | |
| 미션 대화 진행 | `/student/mission/[scenarioId]` | D+10 이전은 mock AI 응답 |
| 미션 결과 확인 | `/student/mission/[scenarioId]/result` | |
| 교수자 제출 목록 | `/teacher/submissions` | 6종 필터 |
| 교수자 채점 위저드 | `/teacher/submissions/[id]` | 3단계 채점 |
| 관리자 대시보드 | `/admin` | Provider 상태, 콘텐츠 현황 |
| Supabase 저장 | — | 말하기 제출 + 채점 + 미션 제출 |

---

## 출시판 제외 기능

| 제외 기능 | 사유 | 예정 시기 |
|---|---|---|
| ~~Supabase Auth / 로그인~~ | **Phase 9에서 구현 완료** | ✅ Phase 9-A/B/C |
| 학생 관리 UI (등록/수정/삭제) | 교수자가 DB seed로 대체 | Phase 8+ |
| 대회(contest) 모드 | 미구현 | Phase 10+ |
| i18n 다국어 UI | 구조만 준비, 렌더링 미구현 | Phase 9+ |
| 실시간 알림 / 푸시 | 불필요한 복잡도 | 미정 |
| 리포트/통계 고도화 | mock 대시보드로 충분 | Phase 9+ |
| 모바일 최적화 | 데스크탑 우선 파일럿. 학습자 경로는 파일럿 전 수동 점검 | Phase 7-A |
| RLS 세분화 정책 | service_role 접근으로 임시 대체 | Phase 8+ |
| 학생 프로필 / 설정 | | Phase 9+ |
| 콘텐츠 관리 UI | JSON 파일 직접 수정 | Phase 10+ |

---

## Known Issues

파일럿 출시 시점 기준 알려진 제한사항:

| 이슈 | 영향도 | 방지/회피 방법 |
|---|---|---|
| ~~**인증 없음**~~ — **Phase 9에서 해소** (Supabase Auth 로그인 + proxy.ts role 분기 적용) | 해소 | Phase 9-A/9-B/9-C 완료. 실제 계정 생성 + user_profiles role 연결 필요 |
| **학생 ID 고정** — 모든 제출이 동일 학생으로 저장 | 높 | 파일럿 시 학생별 URL 파라미터 분기 (임시 workaround) |
| **MissionSession 서버 재시작 소실** — 진행 중 세션 끊길 수 있음 | 중 | 미션은 짧은 시간 내 완료 권장, Vercel 재시작 최소화 |
| **SpeakingEvalRecord 서버 재시작 소실** — 결과 페이지 접근 불가 | 중 | D+5에서 DB 저장으로 해소 |
| **RLS 미설정** — service_role 키 노출 시 전체 데이터 접근 가능 | 높 | service_role 키는 서버 환경변수에만 저장, NEXT_PUBLIC 불가 |
| **실제 STT 없음** (D+10 이전) — 전사문이 mock 고정값 | 중 | 파일럿에서 AI 평가 결과가 실제 발화와 무관함을 참가자에게 고지 |
| **오디오 파일 미저장** (D+10 이전) — 재청취 불가 | 낮 | 파일럿에서 오디오 재청취 기능 미제공 고지 |
| **교수자 목록에 실 DB 데이터 미반영** (D+5 이전) — mock 데이터만 표시 | 중 | D+5 이후 해소 |
| **모바일 교수자 채점 화면** — 좁은 화면에서 테이블·위저드 레이아웃 깨질 수 있음 | 중 | 교수자는 노트북 사용 권장. Phase 7-A에서 반응형 보완 예정 |
| **모바일 관리자 화면** — 통계 테이블이 좁은 화면에서 가로 오버플로 가능 | 낮 | 관리자는 노트북 사용 권장 |
| **provider_events DB 수동 적용 필요** — Phase 8-E 신규 컬럼(status, model 등)은 ALTER TABLE 수동 실행 필요 | 낮 | SUPABASE_SCHEMA.sql 하단 Phase 8-E Migration 섹션 참조. 미적용 시 STT 이벤트 INSERT 실패(기록 누락) — 제출 흐름은 영향 없음 |
| **ETRI 발음평가 실제 미검증** — Phase 8-F에서 ETRI API 연동 구조 추가됨. `ETRI_API_KEY` 없으면 mock fallback | 낮 | `.env.local.example` 참조. 실제 키 없이도 mock provider로 파일럿 진행 가능. 기존 제출 흐름 무영향 |
| **LLM 채점 실제 연동 안내** — Phase 8-G에서 OpenAI `gpt-4o-mini` LLM 채점 구조 추가. `LLM_EVAL_PROVIDER=openai` + `OPENAI_API_KEY` 없으면 mock fallback 자동 사용 | 낮 | `.env.local.example`의 `LLM_EVAL_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_EVAL_MODEL` 참조. 파일럿은 mock 채점으로도 진행 가능. 실제 LLM 채점 시 OpenAI 과금 발생 |
| **LLM 채점 결과 teacher review 화면 미반영** — Phase 8-G LLM 평가 결과(`speakingEvalDetail`)가 결과 페이지에는 표시되나 교수자 채점 화면에는 미반영 | 낮 | 교수자는 학생 결과 페이지 URL을 직접 확인. Phase 9+에서 teacher review 화면 연동 예정 |
| **ETRI 오디오 포맷** — 브라우저 WebM 녹음을 그대로 ETRI에 전송. ETRI는 PCM/WAV 권장 | 낮 | `PRONUNCIATION_PROVIDER=mock` 유지 시 영향 없음. 실제 ETRI 연동 시 ffmpeg 변환 검토 필요 |
| **iOS Safari 녹음 포맷 차이** — mp4/aac 포맷, STT 제공자에 따라 변환 처리 필요 | 중 | Phase 8-D에서 iOS 경고 배너 추가. Phase 8-A에서 서버 측 포맷 변환 처리 예정 |
| **iOS Safari < 15** — MediaRecorder 미지원, 녹음 불가 | 중 | Phase 8-D: 미지원 브라우저 안내 메시지 + 녹음 없이 fallback 제출 가능 |
| **iOS Safari 빈 Blob** — 일부 기기에서 0바이트 Blob 생성 | 중 | Phase 8-D: blob.size 체크 추가, blobUrl=null 시 빈 transcript fallback 제출 유지 |
| **마이크 권한 거부 시 제출 불가** — 브라우저 권한 거부 시 녹음 진행 불가 | 중 | Phase 8-D: 권한 거부 안내 메시지 + 녹음 없이 fallback 제출 가능 (UI 명시) |
| **음성 파일 장기 저장 미처리** — 현재 오디오 파일 비영구 저장 | 낮 | Phase 8-C에서 Supabase Storage 연동 완료. audio_url DB 저장 |

---

## 파일럿 적용 시 주의사항

### 배포 환경

1. **Vercel**: serverless 함수 cold start로 인해 초기 응답 지연 가능 (1~3초). 파일럿 참가자에게 사전 고지.
2. **Supabase Free Tier 제한**: DB 500MB, 월 트래픽 5GB. 파일럿 규모에서는 충분하나 모니터링 권장.
3. **서버 재시작**: Vercel 배포 시 모든 in-memory 세션 초기화됨. 진행 중 미션 세션 소실 가능. 배포는 세션이 없는 시간대에 수행.

### 데이터

4. **학생 데이터 seed**: 파일럿 시작 전 Supabase Dashboard에서 `classes`, `students` 테이블에 실제 참가자 데이터 입력 필요.
5. **콘텐츠 seed**: `question_sets`, `questions`, `mission_scenarios`를 `src/content/` JSON으로 seed하는 스크립트 작성 권장.
6. **개인정보**: 학생 이름 저장 시 개인정보 처리방침 확인. 파일럿 단계에서는 익명 ID 사용 권장.

### 외부 API

7. **STT (D+10+)**: ETRI 개방API 사용 시 일일 호출 제한 확인. 파일럿 규모(< 100 제출/일)에서는 무료 티어 가능.
8. **Claude API**: anthropic API 키 필요. 파일럿 비용 예산 사전 확인.
9. **PRONUNCIATION API**: D+15 출시 기준 mock 유지 가능. 실제 발음 평가 도입 전 사용자에게 고지.

### 모바일/iOS 녹음 (Phase 8-D 기준)

10. **iOS 기기 권장 버전**: 파일럿 참가 iPhone/iPad는 iOS 15 이상 필수. iOS 15 미만에서는 MediaRecorder 미지원으로 녹음 불가. 녹음 오류 시에도 제출은 가능함을 참가자에게 사전 안내.
11. **iOS Safari 녹음 안내 문구 (학생 사전 공유)**:
    > "말하기 평가 녹음 화면에서 마이크 권한 요청이 표시되면 허용해 주세요. iPhone/iPad에서는 iOS 15 이상이 필요합니다. 녹음 오류가 발생해도 '제출하기' 버튼으로 평가 제출이 가능합니다."
12. **마이크 권한 거부 시**: 브라우저 설정 > 해당 사이트 > 마이크 권한 허용 후 페이지 새로고침 안내.
13. **Android 녹음**: Chrome 최신 버전 권장. webm/opus 포맷 자동 선택.

### 운영

14. **파일럿 규모 권장**: 동시 접속 20명 이하. Vercel 무료 티어 기준.
15. **피드백 채널**: 파일럿 중 교수자/학생 피드백을 수집할 채널(이메일, 간단한 설문) 사전 준비.
16. **롤백 계획**: 문제 발생 시 `REPOSITORY_PROVIDER=mock`으로 즉시 mock 모드 전환 가능. Supabase 저장 실패해도 화면은 동작.

---

## 반응형 UI 점검 체크리스트

> 실제 수정은 Phase 7-A에서 진행. D+15 파일럿 전 수동 점검 기준표.

### 화면 크기별 기준

| 화면 | 기준 너비 | 비고 |
|---|---|---|
| 휴대전화 소형 (세로) | 360px | Galaxy A 시리즈 기준 |
| 휴대전화 표준 (세로) | 390~430px | iPhone 14/15, Galaxy S 시리즈 |
| 태블릿 세로 | 768px | iPad 기준 |
| 태블릿 가로 | 1024px | iPad 가로 기준 |
| 노트북 | 1280px+ | 파일럿 주 사용 환경 |

### 화면별 점검 항목

**학습자 말하기 평가 (`/student/speaking/[questionId]`)**
- [ ] 준비 타이머가 360px 화면에서 잘림 없이 표시
- [ ] 녹음 버튼이 터치 가능 크기 (최소 44×44px)
- [ ] 문항 prompt 텍스트가 360px에서 줄바꿈 정상 처리

**학습자 미션 대화 (`/student/mission/[scenarioId]`)**
- [ ] 대화 말풍선이 360px에서 가로 오버플로 없이 표시
- [ ] 텍스트 입력창과 전송 버튼이 360px + 키보드 팝업 시 가려지지 않음
- [ ] AI 페르소나 이름·역할 배지가 360px에서 잘림 없이 표시

**학습자 결과 화면 (`/student/speaking/.../result`, `/student/mission/.../result`)**
- [ ] ScoreBar 레이블·점수가 360px에서 잘림 없이 표시
- [ ] 피드백 텍스트가 360px에서 가로 오버플로 없음

**교수자 제출 목록 (`/teacher/submissions`)**
- [ ] 테이블이 768px 미만에서 가로 스크롤 처리
- [ ] 필터 패널이 태블릿(768px)에서 overflow 정상 처리
- [ ] 통계 StatCard 4개가 768px에서 2열 이하로 배치

**교수자 채점 상세 (`/teacher/submissions/[id]`)**
- [ ] 3단계 위저드 인디케이터가 768px에서 잘림 없이 표시
- [ ] 루브릭 점수 조정 테이블이 768px에서 가로 스크롤 처리
- [ ] 텍스트 입력 영역이 태블릿에서 충분한 높이 확보

**관리자 대시보드 (`/admin`)**
- [ ] 테이블이 1024px 미만에서 가로 스크롤 처리
- [ ] Provider 상태 카드가 태블릿에서 열 배치 유지

**공통 점검**
- [ ] 사이드바가 768px 미만에서 화면 전체를 차지하지 않음 (햄버거 메뉴 또는 숨김)
- [ ] 긴 한국어·외국어 학생 이름이 테이블에서 줄바꿈 또는 말줄임 처리
- [ ] 버튼·링크 터치 가능 영역 최소 44×44px 확보
- [ ] 폰트 크기가 360px에서 가독성 유지 (최소 14px 권장)

---

## 모바일 마이크 녹음 테스트 체크리스트

> 실제 구현은 Phase 7-B에서 진행. D+10 이후 실 기기 테스트 기준표.
> D+10 이전에는 mock 녹음 fallback으로 동작.

### 사전 조건
- [ ] HTTPS 배포 주소에서 테스트 (HTTP에서는 `MediaRecorder` API 미동작)
- [ ] 브라우저 마이크 권한 요청 팝업 표시 확인
- [ ] 권한 거부 시 안내 문구 표시 확인 ("마이크 권한이 필요합니다. 브라우저 설정에서 허용해 주세요.")

### 기능 점검
- [ ] 녹음 시작 버튼 클릭 → 경과 시간 표시 시작
- [ ] 녹음 중지 버튼 → 녹음 종료 및 파일 생성
- [ ] 제출 전 재생 확인 (미리듣기)
- [ ] 제출 전 재녹음 버튼 → 기존 녹음 파기 후 재시작
- [ ] 제출 버튼 → submissionId 반환 후 결과 페이지 이동
- [ ] 권한 거부 시 mock 녹음 fallback 또는 텍스트 입력 fallback 전환

### 기기별 점검

| 기기 | 브라우저 | 확인 포인트 |
|---|---|---|
| Android 휴대전화 | Chrome | MediaRecorder webm/opus 포맷, 1분+ 녹음 안정성 |
| iPhone | Safari | MediaRecorder mp4/aac 포맷, iOS 15+ 필수 |
| iPad | Safari | 동일 |
| Windows 노트북 | Chrome | 기준 환경, webm/opus |
| Windows 노트북 | Edge | Chromium 기반, Chrome과 동일 예상 |
| Mac 노트북 | Safari | mp4/aac 포맷 |

**iOS Safari 주의**: iOS 15 미만에서 `MediaRecorder` 미지원. 파일럿 참가 iPhone은 iOS 15 이상 권장. mp4/aac 포맷은 STT 제공자에 따라 서버 측 변환 처리 필요 (Phase 8-A에서 해결).

**Android 주의**: 일부 저사양 기기에서 webm/opus 인코딩 속도 지연 가능. 실 기기에서 1분 이상 녹음 테스트 권장.

---

## 파일럿 출시 전 필수 기기 테스트 목록

D+15 출시 전 아래 기기·브라우저 조합에서 핵심 경로 수동 테스트 필수.

| 기기 | 브라우저 | 테스트 경로 | 담당 |
|---|---|---|---|
| Windows 노트북 | Chrome | 전체 경로 | — |
| Windows 노트북 | Edge | 전체 경로 | — |
| Android 휴대전화 | Chrome | 학습자 말하기·미션 경로 | — |
| iPhone | Safari | 학습자 말하기·미션 경로 | — |
| iPad | Safari (세로/가로) | 학습자·교수자 경로 | — |
| 태블릿 (Android) | Chrome (가로) | 교수자 채점 경로 | — |

**핵심 테스트 경로:**
1. `/student/speaking/q-001?setId=qs-diagnostic-01` → 녹음 → 제출 → 결과 확인
2. `/student/mission/sc-restaurant-01` → 대화 진행 → 결과 확인
3. `/teacher/submissions` → 필터 → `/teacher/submissions/sub-001` → 채점 완료
4. `/api/health` → 200 응답 확인

---

## 환경변수 체크리스트 (파일럿 배포 전)

아래는 실제 코드에서 사용하는 환경변수만 기재한다. 값은 기록하지 말 것.

| 변수명 | 필수 여부 | 기본값 | 설명 |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 필수 | — | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 필수 | — | Supabase anon (public) key |
| `REPOSITORY_PROVIDER` | 권장 | `mock` | `supabase` 설정 시 DB 저장 활성화 |
| `STT_PROVIDER` | 선택 | `mock` | `whisper` 또는 `openai` 시 실제 STT |
| `TTS_PROVIDER` | 선택 | `mock` | `openai` 시 OpenAI TTS, `browser` 시 Web Speech API |
| `PRONUNCIATION_PROVIDER` | 선택 | `mock` | `etri` 시 ETRI 발음평가 |
| `LLM_EVAL_PROVIDER` | 선택 | `mock` | `openai` 시 GPT 채점 |
| `CONVERSATION_PROVIDER` | 선택 | `mock` | 현재 mock만 지원 |
| `OPENAI_API_KEY` | 조건부 | — | STT/TTS/LLM 중 openai provider 사용 시 필요. 서버 전용 |
| `OPENAI_EVAL_MODEL` | 선택 | `gpt-4o-mini` | LLM 채점 모델명 |
| `TTS_MODEL` | 선택 | `tts-1` | TTS 모델 (`tts-1` 또는 `tts-1-hd`) |
| `TTS_VOICE` | 선택 | `nova` | TTS 음성 (`alloy`·`echo`·`fable`·`onyx`·`nova`·`shimmer`) |
| `ETRI_API_KEY` | 조건부 | — | `PRONUNCIATION_PROVIDER=etri` 시 필요. 서버 전용 |
| `ETRI_API_BASE_URL` | 선택 | `https://aiopen.etri.re.kr:8000` | ETRI API base URL |
| `SMOKE_TEST_MODE` | **금지** | — | **Vercel에 절대 설정하지 말 것** — proxy.ts auth 우회 전용 |

---

## 성공 기준 (D+15 파일럿)

- 교수자 1명이 **/login으로 로그인** 후 3명 학생 채점 완료
- 학생 3명이 **/login으로 로그인** 후 말하기 평가 1회 제출 + 결과 확인
- 학생 2명이 미션 대화 1회 완료
- 모든 제출 데이터가 Supabase DB에 저장됨을 확인
- 교수자 채점 결과가 DB에 저장됨을 확인
- 빌드 오류 없음, 런타임 404/500 없음
- Android / iPhone / iPad 기기에서 학습자 말하기·미션 경로 정상 동작 확인 (기기 테스트 체크리스트 기준)

---

## D+10 방향 — 다음 단계 체크리스트 (Phase 6-B5 기준)

D+5 완료 후 D+10(2026-05-14)까지 진행할 작업 체크리스트.

### Phase 7-A — 학습자 반응형 UI 보완 (우선순위 높음)
- [ ] 사이드바 모바일 햄버거 메뉴 구현 (768px 미만)
- [ ] 테이블 가로 스크롤 처리 (교수자·관리자 화면)
- [ ] 버튼·링크 터치 가능 영역 최소 44×44px 확보
- [ ] 360px 기준 말하기 평가·미션 대화 레이아웃 픽스
- [ ] 대화 말풍선 360px 가로 오버플로 처리

### Phase 7-B — 브라우저 마이크 녹음 최소 구현
- [ ] `MediaRecorder` API 기반 실제 오디오 녹음 UI
- [ ] 마이크 권한 요청·거부 처리 및 안내 문구 표시
- [ ] 녹음·미리듣기·재녹음 UI
- [ ] Supabase Storage 오디오 업로드 (audio_url 채우기)
- [ ] iOS Safari mp4/aac 포맷 변환 처리 (또는 Phase 8-A로 연기)

### Phase 8-A — STT 실제 API 최소 연동 (선택적)
- [ ] ETRI 개방API 또는 Whisper API 연동
- [ ] STTProvider 교체 (mock → 실제)
- [ ] 실제 전사문 ai_evaluations 반영

---

## 이후 작업 Phase 제안

Phase 6-B5 완료 기준, D+10 이후 다음 단계를 제안한다.

| Phase | 목표 | 핵심 작업 | 비고 |
|---|---|---|---|
| **Phase 7-A** | 반응형 UI 보완 | 사이드바 모바일 햄버거 메뉴, 테이블 가로 스크롤 처리, 버튼 터치 영역 최소 44px, 360px 레이아웃 픽스 | D+6~7 목표 |
| **Phase 7-B** | 브라우저 마이크 녹음 최소 구현 | `MediaRecorder` API, 마이크 권한 요청·거부 처리, 녹음·재생·재녹음 UI, Supabase Storage 오디오 업로드 | D+7~9 목표 |
| **Phase 8-A** | STT 실제 API 최소 연동 | ETRI 개방API 또는 Whisper API 연동, STTProvider 교체, 실제 전사문 반영, iOS mp4/aac 변환 처리 | D+10, 7-B 완료 후 |
| **Phase 9** | Supabase Auth 도입 + RLS 활성화 | 교수자 로그인, 학생 세션 구분, RLS 정책 활성화, pilot student 고정 해소 | D+12+ |
| **Phase 10** | Vercel 배포 | 프로덕션 환경 배포, 커스텀 도메인, 환경변수 설정 | D+13+ |
| **Phase 11** | 파일럿 테스트 준비 | 기기별 수동 테스트, 파일럿 가이드 작성, seed 데이터 준비 | D+14~15 |

> Phase 7-A와 7-B는 병렬 진행 가능. Phase 8-A는 Phase 7-B(마이크 녹음) 완료 이후 시작 권장.  
> Phase 9(Auth + RLS)는 D+12 이후 별도 계획 수립 권장.

---

## 자동 Smoke Test 범위 및 한계 (Phase 8-I 기준)

### 자동화 범위

#### API smoke (브라우저 불필요, `npm run test:smoke:api`)
| 엔드포인트 | 확인 항목 |
|---|---|
| `POST /api/pronunciation` | mock fallback `normalizedScore`(0–100) 반환 |
| `POST /api/pronunciation` | 잘못된 form data에도 crash 없음 |
| `POST /api/evaluate-speaking` | mock fallback `overall_score`, `providerName`, `status` 반환 |
| `POST /api/evaluate-speaking` | 빈 body에도 mock fallback 반환 |
| `POST /api/evaluate-speaking` | 파싱 불가 JSON → 400 + `{ error: 'invalid_json' }` |
| `GET /api/health` | 200 반환 |

#### E2E smoke (Chromium 필요, `npm run test:smoke`)
| 확인 항목 |
|---|
| `/student/speaking/q-001` 360px viewport 렌더링 |
| "준비 시작" 버튼 viewport 내 표시 |
| MediaRecorder 미지원 시 화면 crash 없음 |
| 준비 시작 클릭 후 카운트다운 UI 표시 |

#### E2E 실행 사전 조건 (WSL2)
```bash
sudo npx playwright install-deps chromium
```

### 자동화하지 않은 항목 (수동 확인 필수)
- 실제 iPhone Safari 녹음 (마이크 권한 허용/거부, iOS 15 이상 실기기)
- 실제 마이크 권한 허용/거부 UX 흐름
- 실제 Whisper STT 품질 (전사 정확도, 한국어 인식률)
- 실제 ETRI 발음평가 품질 (점수 신뢰도, 단어별 피드백)
- 실제 LLM 채점 품질 (루브릭 점수 타당성, 한국어 피드백 품질)
- `provider_events` / `ai_evaluations` Supabase 실제 저장 확인
- Android Chrome / iPad Safari 레이아웃 수동 확인
- 네트워크 지연 상황에서의 UX (느린 3G, 오프라인)

---

## Phase 8-H TTS/음성 안내 — 자동화 범위 및 Known Issues

### 자동화 범위 (Phase 8-H 기준)

#### API smoke
| 엔드포인트 | 확인 항목 |
|---|---|
| `POST /api/tts` text 있음 | fallback JSON 반환 (providerName, status 포함) |
| `POST /api/tts` text 없음 | 400 + `{ error: 'text_required' }` |
| `POST /api/tts` 파싱 불가 바디 | 400 + `{ error: 'invalid_json' }` |

#### E2E smoke (360px viewport)
| 확인 항목 |
|---|
| "문제 듣기" 버튼 viewport 내 표시 |
| "녹음 안내 듣기" 버튼 viewport 내 표시 |
| 버튼 클릭 후 페이지 crash 없음 |

### Known Issues (수동 확인 필수)

- **실제 iPhone Safari 음성 재생**: iOS Safari의 자동재생 제한으로 버튼 클릭 후 재생만 지원. 실기기 수동 확인 필요.
- **실제 OpenAI TTS 연동 테스트**: `TTS_PROVIDER=openai` + `OPENAI_API_KEY` 설정 후 실 API 연동 테스트 필요.
- **speechSynthesis 품질 편차**: 브라우저/기기별 한국어 TTS 음성 품질 차이 있음. Chrome은 양호하나 일부 Android·iOS 기기에서 한국어 음성 미지원 가능.
- **자동재생 제한**: 자동재생 없음 — 사용자 버튼 클릭 후 재생만 지원 (브라우저 정책 준수).
- **iOS Safari speechSynthesis**: iOS 15+ Safari에서 `speechSynthesis.speak()` 지원하나 `onend` 이벤트 발화가 불안정할 수 있음.
- **audioBase64 크기**: 긴 문장의 경우 base64 오디오 데이터가 커질 수 있음. 추후 스트리밍 또는 presigned URL 방식으로 전환 고려.

---

## Phase 10-A — Vercel 배포 준비 점검 (2026-05-05)

> 실제 배포는 Phase 10-B에서 진행. 이 섹션은 배포 전 점검 및 체크리스트만 포함.

### Vercel 배포 가능성 점검 결과

| 항목 | 상태 | 비고 |
|---|---|---|
| `npm run build` 통과 | ✅ | 18개 route, Turbopack |
| API route runtime | ✅ Node.js (기본값) | `Buffer` 사용 route handler가 있으나 Node.js runtime이므로 안전 |
| proxy.ts runtime | ✅ Node.js (기본값) | Next.js 16에서 proxy.ts는 Node.js runtime 기본값 |
| Edge runtime 충돌 없음 | ✅ | `export const runtime = 'edge'` 선언 없음 |
| FormData/Blob 처리 | ✅ | `/api/stt`, `/api/storage/upload` 모두 Node.js runtime |
| 외부 API fallback | ✅ | 모든 provider가 mock fallback 유지 |
| SMOKE_TEST_MODE 격리 | ✅ | proxy.ts에서만 사용, Vercel에 설정하지 않으면 항상 auth 적용 |

### Supabase 배포 전 점검

#### DB Schema 상태

| 테이블 | 적용 상태 | 비고 |
|---|---|---|
| `speaking_submissions` | ✅ 적용 완료 | |
| `ai_evaluations` | ✅ 적용 완료 | |
| `teacher_reviews` | ✅ 적용 완료 | |
| `mission_submissions` | ✅ 적용 완료 | |
| `provider_events` | ✅ 적용 완료 | Phase 8-E 컬럼 수동 적용 필요 (SUPABASE_SCHEMA.sql 참조) |
| `user_profiles` | ✅ 적용 완료 (Phase 9-A 수동 적용) | own profile read RLS 적용됨 |
| Storage `recordings` bucket | ⚠️ 수동 생성 필요 | 아래 절차 참조 |

#### Storage `recordings` bucket 생성 절차

1. Supabase Dashboard > **Storage** > **New bucket**
2. Bucket name: `recordings`
3. Public bucket: **ON** (getPublicUrl을 signed URL 없이 사용하기 위함)
4. **Storage > Policies** > `recordings` bucket > **New policy**
   - 대상: `INSERT`
   - Role: `anon`
   - 정책 정의: `true` (파일럿 기간 동안 모든 anon 업로드 허용)
5. 파일럿 종료 후 signed URL 방식으로 전환 검토 (Phase 10 이후)

> ⚠️ public bucket + anon INSERT 허용은 파일럿 운영 기간에만 적용. 운영 전환 시 인증된 사용자만 업로드 가능하도록 정책 수정 필요.

#### provider_events 기록 확인 방법

- Supabase Dashboard > Table Editor > `provider_events`
- 또는 SQL Editor: `SELECT * FROM provider_events ORDER BY created_at DESC LIMIT 20;`
- 파일럿 중 STT/TTS/LLM 실패 이벤트를 여기서 확인

### Supabase Auth Redirect URL 점검

배포 후 Supabase Dashboard > **Authentication** > **URL Configuration**에서 설정 필요:

| 항목 | 설정값 | 비고 |
|---|---|---|
| **Site URL** | `https://<project>.vercel.app` | 실제 Vercel 배포 URL로 교체 |
| **Redirect URLs** | `https://<project>.vercel.app/**` | wildcard로 모든 경로 허용 |

이 설정 없이는 Supabase Auth 쿠키 기반 세션이 배포 도메인에서 작동하지 않을 수 있음.

**커스텀 도메인 사용 시**: Site URL과 Redirect URLs를 커스텀 도메인으로 추가.

**로컬 개발 병행 시**: `http://localhost:3000/**`도 Redirect URLs에 추가.

### Vercel 배포 체크리스트 (Phase 10-B에서 실행)

#### 사전 준비
- [ ] `main` 브랜치 최신 push 확인
- [ ] Supabase `recordings` bucket 생성 완료
- [ ] Supabase `user_profiles`에 파일럿 참가자 계정 및 role 연결 완료
- [ ] Supabase Auth Redirect URL 설정 예정 URL 파악

#### Vercel 프로젝트 설정
- [ ] vercel.com > New Project > Import from GitHub
- [ ] 저장소 선택: `korean-speaking-ai-mvp`
- [ ] Framework: Next.js (자동 감지)
- [ ] Build Command: `npm run build` (기본값)
- [ ] Output Directory: `.next` (기본값)
- [ ] Root Directory: `/` (기본값)

#### Environment Variables 입력
- [ ] `NEXT_PUBLIC_SUPABASE_URL` (필수)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` (필수)
- [ ] `REPOSITORY_PROVIDER=supabase`
- [ ] `STT_PROVIDER` (선택, 미설정 시 mock)
- [ ] `TTS_PROVIDER` (선택, 미설정 시 mock)
- [ ] `PRONUNCIATION_PROVIDER` (선택, 미설정 시 mock)
- [ ] `LLM_EVAL_PROVIDER` (선택, 미설정 시 mock)
- [ ] `OPENAI_API_KEY` (STT/TTS/LLM 중 openai 사용 시)
- [ ] `OPENAI_EVAL_MODEL` (선택)
- [ ] `TTS_MODEL` (선택)
- [ ] `TTS_VOICE` (선택)
- [ ] `ETRI_API_KEY` (PRONUNCIATION_PROVIDER=etri 시)
- [ ] `SMOKE_TEST_MODE` **설정하지 말 것** ← 운영 auth bypass 방지

#### 배포 후 확인
- [ ] Vercel 배포 URL 접속
- [ ] Supabase Auth Redirect URL에 배포 URL 등록
- [ ] `/login` 화면 정상 표시
- [ ] 실제 student 계정 로그인 → `/student` 이동
- [ ] `/student/speaking/q-001` 접속 + "준비 시작" 버튼 표시
- [ ] 녹음 → 제출 → 결과 페이지 이동
- [ ] Supabase `speaking_submissions` 행 생성 확인
- [ ] Supabase `ai_evaluations` 행 생성 확인
- [ ] `/api/tts` TTS 버튼 정상 작동 (또는 fallback)
- [ ] 실제 teacher 계정 로그인 → `/teacher` 이동
- [ ] teacher dashboard 최근 제출 현황 표시 (DB 연결 시)
- [ ] `/api/health` → 200 응답 확인
- [ ] Supabase `provider_events` 최근 이벤트 확인

### Known Issues (Phase 10-B 배포 시 확인 필요)

- Supabase Auth Redirect URL은 배포 URL 확인 후 Dashboard에서 수동 설정 필요
- recordings bucket anon INSERT 정책은 파일럿 기간 한정. 운영 전환 시 재검토
- RLS 전면 적용은 Phase 10 Auth 기반 제출 전환 후 진행
- Vercel cold start 초기 응답 지연(1~3초) 파일럿 참가자에게 사전 안내 필요
