# WORK LOG

Phase별 작업 내역을 기록합니다.

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
