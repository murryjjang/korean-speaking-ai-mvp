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
| **D+15** — 소규모 파일럿 출시판 | 2026-05-19 | 배포 완료 + 파일럿 가이드 | **1차 시연 최종 안정화 완료 (10-E-8-FINAL, 2026-05-08)**. 관리자 분석 대시보드(`/admin/analytics`), 교수자 현황(`/teacher/dashboard`) 신규 구현. Azure/demo 표시 정책 최종 정리. Known issues: Azure PA actual:demo fallback 가능성 있음(후속 안정화 필요), 분석 화면은 샘플 데이터(실제 Supabase 연결 예정), 발표연습 정밀 평가는 후속 단계 |

---

## 파일럿 전 필수 asset 교체 목록 (Phase 10-E-4 기준)

파일럿 출시 전 반드시 교체 또는 등록해야 할 실제 자료 목록. 현재는 모두 placeholder 또는 앱 내부 렌더링 상태.

| 항목 | 현재 상태 | 필요 작업 | 우선순위 |
|---|---|---|---|
| beginner q2 식당 사진 | placeholder 카드 표시 | 실제 사진 촬영 또는 CC0 라이선스 이미지 확보 후 `/public/images/official/beginner-restaurant-scene.jpg` 등록, `questions.json` `imageUrl` 업데이트 | **필수** |
| beginner q3 음원 | 미등록 (버튼 disabled) | 실제 mp3/aac 생성 후 `/public/audio/official/beginner-korean-class-announcement.mp3` 등록, `questions.json` `assetUrl` 업데이트 | **필수** |
| intermediate q3 음원 | 미등록 (버튼 disabled) | 실제 mp3/aac 생성 후 `/public/audio/official/intermediate-presentation-class-change.mp3` 등록 | **필수** |
| advanced q3 음원 | 미등록 (버튼 disabled) | 실제 mp3/aac 생성 후 `/public/audio/official/advanced-hybrid-class-analysis.mp3` 등록 | **필수** |
| intermediate q2 차트 | 앱 내부 바 차트 (임시 사용 가능) | 파일럿 초기에는 앱 내부 렌더링으로 운용 가능. 향후 실제 설문 데이터로 교체 가능 | 선택 |
| advanced q2 차트 | 앱 내부 바 차트 (임시 사용 가능) | 파일럿 초기에는 앱 내부 렌더링으로 운용 가능. 향후 실제 데이터로 교체 가능 | 선택 |
| q4 dialogue AI 대화 UI | 안내 카드만 표시 | 10-E-5에서 실제 대화 UI 구현 예정 | **필수 (10-E-5)** |

**음원 등록 절차 (mp3/aac 준비 후):**
1. `public/audio/official/` 디렉토리 생성
2. mp3/aac 파일 배치
3. `src/content/questions.json`의 해당 문항 `assetUrl` 필드 업데이트
4. `src/content/assessment-assets.ts`의 해당 asset `src` 필드 업데이트 + `status: 'ready'` 변경
5. 빌드/테스트 후 배포

**이미지 등록 절차 (식당 사진 준비 후):**
1. `public/images/official/` 디렉토리 생성 ✅ (10-E-5-C/D 통합 보정에서 완료)
2. `beginner-restaurant-scene.jpg` 배치 (저작권 확인 필수 — 직접 촬영·CC0·AI 생성만 허용, Getty/Google 금지)
3. `src/content/questions.json`의 `beginner-q2-material-description` `imageUrl` 필드 업데이트
4. `src/content/assessment-assets.ts`의 `beginner-restaurant-image` `status: 'ready'` 변경 (src 경로는 이미 설정됨)

---

## 파일럿 전 수동 확인 항목 (Phase 10-E-5-C/D 통합 보정 이후)

파일럿 출시 전 반드시 수동으로 확인해야 할 항목들.

| 항목 | 확인 방법 | 기대 결과 |
|---|---|---|
| q4 표현 질문 처리 | beginner q4 대화에서 "여기서 먹고 가려면 어떻게 얘기해야 하죠?" 발화 | AI가 표현 안내 후 역할극 복귀. "주문 도와드리겠습니다. 감사합니다!" 즉시 종료 없음 |
| language question → mission 오인 없음 | "포장해 주세요가 맞아요?" 발화 후 미션 목표 상태 확인 | 포장 missionGoal이 achieved로 바뀌지 않아야 함 |
| 실제 발화 후 mission 달성 | 이후 "포장해 주세요" 실제 발화 | 그때 missionGoal achieved 처리 |
| 무음 녹음 차단 | 마이크에 말 없이 녹음 시작/종료 | "음성이 감지되지 않았습니다. 다시 녹음해 주세요." 메시지, 제출 버튼 disabled |
| 정상 발화는 차단되지 않음 | 실제 한국어 발화 녹음 후 제출 | 정상 평가 진행 |
| STT hallucination 차단 | (Whisper 실제 키 연결 시) 무음 녹음 제출 | "시청해주셔서 감사합니다." 환각 transcript가 평가 결과로 나타나지 않음 |
| beginner q2 실제 사진 교체 | `public/images/official/beginner-restaurant-scene.jpg` 파일 배치 후 확인 | 식당 사진이 정상 표시됨 (현재는 placeholder) |
| intermediate/advanced q2 차트 | 해당 문항 접근 | 50%/30%/20% 및 120명/180명/260명 수치 정상 표시 |
| Azure TTS 수동 검증 | `TTS_PROVIDER=azure` + 실제 키 설정 후 AI 발화 재생 | Azure 음성으로 재생. 키 없으면 browser fallback |
| ETRI 점수 calibration | 원어민 샘플 제출 후 서버 로그 확인 | rawScore 3.5 이상이면 calibration 기준 적합. 2.5 이하면 audio/script 문제 의심 |

---

## ETRI 발음평가 Calibration Checklist (참고 보존용 — q1은 Azure로 전환됨)

> **[10-E-7-D, 2026-05-08] q1 낭독 평가는 Azure Pronunciation Assessment로 전환되었습니다.**  
> 이 체크리스트는 ETRI 후속 비교·검토용으로 보존됩니다. 파일럿 기간 q1 발음 점수는 Azure 기준으로 운용합니다.

파일럿에서 ETRI 발음 점수를 참고값 이상으로 활용하기 전에 다음 항목을 확인한다.

| 항목 | 설명 | 기준 | 상태 |
|---|---|---|---|
| 원어민 샘플 3개 이상 제출 | q1 낭독 원어민 발화 ETRI rawScore 분포 확인 | rawScore 3.5~5.0 범위 예상 | 🔜 |
| 학습자(비원어민) 샘플 3개 이상 제출 | 한국어 능숙도별 rawScore 분포 확인 | 원어민보다 낮은 점수 분포 | 🔜 |
| 의도적 부정확 발화 샘플 3개 | 점수 하한 범위 확인 | rawScore 1.0~2.5 범위 예상 | 🔜 |
| WAV 오디오 품질 진단 | 서버 로그 `durationSec`, `rmsApprox`, `maxAbs` 확인 | durationSec > 10, rmsApprox > 200, maxAbs < 30000 | 🔜 |
| script vs recognized 일치율 확인 | 서버 로그 `recognizedStringPrefix` vs `scriptPreview` 비교 | 앞 40자 기준 일치 | 🔜 |
| q1 문장 길이 영향 확인 | 짧은 문장(1문장)과 전체 낭독 비교 | 점수 차이 < 0.5 이면 길이 영향 없음 | 🔜 |
| 최종 점수 반영 비율 결정 | 교수자와 협의 후 확정 | 예: ETRI 원점수 30% + LLM 평가 70% | 🔜 |

### 상세 샘플 수집 가이드 (Phase 10-E-7 추가)

파일럿 전 아래 샘플을 수집하여 ETRI 점수 분포를 확인한다.

| 샘플 유형 | 수량 | 확인 목적 |
|---|---|---|
| 원어민 정확 낭독 (표준 속도) | 3개 | rawScore 상한 기준 확인 (예상: 3.5~5.0) |
| 원어민 빠른 낭독 (속도 영향) | 3개 | 속도가 점수에 미치는 영향 확인 |
| 원어민 일부러 부정확 낭독 | 3개 | 점수 하한 기준 확인 (예상: 1.0~2.5) |
| 외국인 초급 학습자 낭독 | 3개 | 학습자 점수 분포 확인 |
| 무음/저음량 샘플 | 2개 | rmsApprox 임계값 확인 (< 100이면 불량) |
| 짧은 문장 단위 낭독 (분리 평가) | 3개 | 긴 지문 vs 짧은 문장 점수 차이 확인 |

### 샘플별 기록 항목

각 샘플 제출 시 다음 항목을 기록한다:

| 기록 항목 | 서버 로그 필드 | 설명 |
|---|---|---|
| ETRI 원점수 | `scoreValue` | return_object.score 실제값 |
| STT 전사 정확도 | `recognizedStringPrefix` | 인식 텍스트 앞 40자 |
| script 일치 여부 | scriptPreview vs recognizedStringPrefix 비교 | 기준문장 일치 정도 |
| 오디오 길이 | `durationSec` | 정상: 낭독 길이와 일치 |
| 음량(RMS) | `rmsApprox` | 정상: > 200, 불량: < 100 |
| 피크 음량 | `maxAbs` | 클리핑 위험: > 30000 |
| 마이크 환경 | (수동 기록) | 헤드셋/내장/외부 마이크 구분 |
| 교수자 체감 점수 | (수동 기록) | 교수자가 직접 들어보고 평가한 점수 (0~5) |

**calibration 판정 기준:**
- 원어민 정확 낭독 3개 평균 rawScore < 3.0 → script 또는 audio 문제 의심
- rmsApprox < 100인 샘플 다수 → 마이크/녹음 환경 개선 필요
- recognizedStringPrefix와 script 불일치 → WAV 변환 또는 script 문제 의심

**파일럿 기간 발음 점수 정책 (Phase 10-E-7-D 이후 — Azure 전환 기준):**

> **[10-E-7-D, 2026-05-08] q1 낭독 평가 공식 발음평가: ETRI → Azure Pronunciation Assessment 전환 완료**

- **환경 변수**: `PRONUNCIATION_PROVIDER=azure` (`.env.local` 정리 완료 기준)
  - `AZURE_SPEECH_KEY` / `AZURE_SPEECH_REGION` — TTS와 발음평가 공통 사용 가능
  - Azure key/region 미설정 시 demo fallback 자동 적용 (시연 흐름 유지)
- **q1 낭독 문항(qt-reading)**: 클라이언트가 `/api/pronunciation-azure` 직접 호출 (referenceText 기반 scripted assessment)
  - Azure 성공 시: `q1ReferenceScore = clamp(round(PronScore × 0.7 + aiScore × 0.3), 0, 100)` 산식 적용
  - Azure 실패/demo fallback 시: 기존 AI 참고점수 유지
  - q1 결과 카드: 항상 "발음평가 결과" 타이틀, provider=azure 시 PronScore·Accuracy·Fluency·Completeness + word-level diff 표시
  - 한국어 phoneme/prosody 세부 점수는 제한될 수 있으므로 word-level + STT diff 중심으로 첨삭
- **읽기연습(`/student/reading-practice`)**: Azure 발음평가 동일하게 적용 (10-E-7-A 이후 유지)
- **q2/q3/q4 문항**: 자유응답·내용평가 포함이므로 기존 AI/룰 기반 평가 유지 (변경 없음)
- **발표연습(`/student/presentation-practice`)**: Azure 발음평가 표시 (provider 표기만, 점수 체계 별도)
- **ETRI**: q1 공식 평가에서 제외. `/student/etri-pronunciation-demo` 비교 데모 및 후속 검토용으로 유지
- q1ReferenceScore는 최종점수가 아님 — 교수자 검토 후 확정
- q1ReferenceScore는 1~4번 세트 공식 종합점수에 자동 반영하지 않음

**[Legacy] ETRI 기반 발음 점수 정책 (10-E-7-D 이전 기록, 참고용):**
- ETRI endpoint: `ETRI_PRONUNCIATION_ENDPOINT` env로 재정의 가능
- ETRI 성공 시: `q1ReferenceScore = round(calibratedScore × 0.6 + aiScore × 0.4)` (구 산식)
- ETRI 실패 시: 기존 AI 참고점수 유지
- calibratedScore "파일럿 보정용 참고값" (calibrationStatus="provisional") — 현재 Azure 전환으로 ETRI 참조 불필요

**종합점수 반영 정책:**
- 현재: Azure PronScore는 q1ReferenceScore에만 반영 (공식 종합점수 자동 반영 없음)
- q1 문항 AI 참고평가: Azure 성공 시 `PronScore×0.7 + aiScore×0.3` 산식 반영 (provisional)
- 파일럿: 교수자가 발음 점수를 직접 결정 (teacher final review workflow 유지)
- 후속: 공식 세트(q1~q4) 전체 응시 흐름 완성 후 반영 비율 확정

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

### 이미지 소스 원칙 (파일럿 전 필수 확인)

그림 묘사 문항(`qt-picture`)에 사용하는 이미지는 다음 원칙을 따른다.

**권장 소스:**
- 기관/교수자 직접 촬영 사진
- [Pexels](https://www.pexels.com/) / [Unsplash](https://unsplash.com/) CC0 라이선스 이미지
- [Wikimedia Commons](https://commons.wikimedia.org/) 적합 라이선스 이미지
- 직접 제작한 일러스트 (현재 q-003 SVG 등)

**금지:**
- Getty Images 무단 사용 (royalty-free는 유료 라이선스 구매 필요, 무료/저작권 없음이 아님)
- Google 이미지 검색 결과 무단 사용
- 출처·라이선스가 불명확한 이미지 삽입

**q-003 교체 절차 (파일럿 전):**
1. 적합 라이선스 이미지 확보
2. `public/images/q-003-park-exercise.jpg` (또는 적합한 파일명)로 저장
3. `src/content/questions.json`의 `q-003.imageUrl`을 새 경로로 변경
4. `imageAlt`, `imageCaption`, `imageLicenseNote` 실제 정보로 업데이트
5. 코드 변경 없이 데이터 경로 변경만으로 교체 완료

각 문항 `questions.json`에 `imageUrl`, `imageAlt`, `imageCaption`, `imageLicenseNote` 필드가 명시적으로 관리되므로, 이미지 교체 시 코드 수정은 필요 없다.

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

> **Phase 10-E-2 기록 (2026-05-05)**: 정식 평가세트는 PDF 기준 초급/중급/고급 4문항 체계로 전환 중. 4유형(낭독 15점, 자료설명 25점, 듣고답하기 25점, 대화미션 35점) × 3수준 = 12문항 skeleton 구성 완료. 파일럿 적용 전 콘텐츠 교수자 검수 및 사진/음원 asset 등록 필요(10-E-3~10-E-4).

> **Phase 10-E-3 추가 수정 기록 (2026-05-06)**: 공식 평가세트 12문항 route 접근성 확인 완료. q2/q3 URL 404 수정, reading 피드백 유형 분리, dialogue_mission 생성형 AI 쌍방 대화형 재정의. 잔여 작업: 10-E-4(실제 사진/음원 asset 등록, listenLimit 적용), 10-E-5(dialogue_mission AI 대화 UI, dialogueTurns 저장, missionGoals 달성 평가, 교수자 최종확정 official rubric 강화), 10-E-6(attempt 단위 1~4번 전체 응시 흐름). **4번 dialogue_mission은 단발 녹음형으로 최종 운영하지 않음. 생성형 AI 쌍방 대화형 평가로 구현 예정(10-E-5).**

> **Phase 10-E-4 추가 수정 기록 (2026-05-06)**: q4 dialogue_mission 학습자 화면에서 기존 단발 녹음→제출 UI(준비 시작/녹음/검토/제출 phase) 비표시 완료. 대신 "AI 대화형 평가 준비 중" placeholder 카드 + disabled "AI 대화 준비 중" 버튼 표시. q1/q2/q3 녹음 흐름, no-speech guard, legacy q-003 route 유지. **10-E-5 Known Issues: 실제 AI 대화 UI 구현, 대화 로그 저장(dialogueTurns → DB), missionGoals 달성 평가.**

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
| ~~**무음/초단기 녹음 제출 차단**~~ — **Phase 10-D 3차에서 해소** | 해소 | duration<2초 또는 blob<3000bytes 시 제출 버튼 disabled. 서버에서도 no-speech/빈 transcript 시 ai_evaluations 생성 안 함. 결과 화면에서 전용 "음성 미감지" 뷰 표시 |
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
| **ETRI 발음평가 Phase 10-E-7에서 실제 연동 착수** — URL/Authorization/점수환산 수정 완료. 파일럿 전 q1 낭독 3개 샘플로 수동 검증 권장 | 낮 | `PRONUNCIATION_PROVIDER=etri` + `ETRI_API_KEY` 설정 필요. 실패 시 자동 mock fallback. **파일럿 전 수동 검증 목록**: q1 낭독 샘플 3개, 무음 샘플, 짧은 녹음, 정확/부정확 발음 비교 |
| **LLM 채점 실제 연동 안내** — Phase 8-G에서 OpenAI `gpt-4o-mini` LLM 채점 구조 추가. `LLM_EVAL_PROVIDER=openai` + `OPENAI_API_KEY` 없으면 mock fallback 자동 사용 | 낮 | `.env.local.example`의 `LLM_EVAL_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_EVAL_MODEL` 참조. 파일럿은 mock 채점으로도 진행 가능. 실제 LLM 채점 시 OpenAI 과금 발생 |
| **LLM 채점 결과 teacher review 화면 미반영** — Phase 8-G LLM 평가 결과(`speakingEvalDetail`)가 결과 페이지에는 표시되나 교수자 채점 화면에는 미반영 | 낮 | 교수자는 학생 결과 페이지 URL을 직접 확인. Phase 9+에서 teacher review 화면 연동 예정 |
| **ETRI 오디오 포맷 미검증** — 브라우저 WebM 녹음을 그대로 ETRI에 전송. ETRI가 webm을 거부하면 wav/pcm 변환 필요 | 낮 | 실제 q1 낭독 녹음으로 ETRI 호출 후 응답 확인 필요. 거부 시: 서버 ffmpeg-static 변환 또는 브라우저 WAV 녹음으로 전환. 현재 단계에서는 수동 검증 후 대응 결정 |
| **iOS Safari 녹음 포맷 차이** — mp4/aac 포맷, STT 제공자에 따라 변환 처리 필요 | 중 | Phase 8-D에서 iOS 경고 배너 추가. Phase 8-A에서 서버 측 포맷 변환 처리 예정 |
| **iOS Safari < 15** — MediaRecorder 미지원, 녹음 불가 | 중 | Phase 8-D: 미지원 브라우저 안내 메시지 + 녹음 없이 fallback 제출 가능 |
| **iOS Safari 빈 Blob** — 일부 기기에서 0바이트 Blob 생성 | 중 | Phase 8-D: blob.size 체크 추가, blobUrl=null 시 빈 transcript fallback 제출 유지 |
| **마이크 권한 거부 시 제출 불가** — 브라우저 권한 거부 시 녹음 진행 불가 | 중 | Phase 8-D: 권한 거부 안내 메시지 + 녹음 없이 fallback 제출 가능 (UI 명시) |
| **음성 파일 장기 저장 미처리** — 현재 오디오 파일 비영구 저장 | 낮 | Phase 8-C에서 Supabase Storage 연동 완료. audio_url DB 저장 |
| **q-003 그림 묘사 임시 placeholder 이미지** — `/public/images/q-003-placeholder.svg`는 SVG 일러스트 임시 파일 | 중 | 파일럿 전 실제 사진/그림으로 교체 필요. `questions.json`의 `imageUrl` 필드 수정 후 재배포. q-004 등 다른 그림 묘사 문항도 실제 이미지 등록 필요 |
| **정식 평가세트 콘텐츠 검수 필요** — Phase 10-E-2에서 4유형(낭독/자료설명/듣고답하기/대화미션) × 3수준(초급/중급/고급) = 12문항 skeleton 구성 완료. 단 실제 파일럿 사용 전 교수자 검수 필요 | 중 | `src/content/questions.json`의 q-b1-1~q-a1-4 콘텐츠를 교수자가 직접 확인/수정. 낭독 지문, 사진 asset, 듣기 음원 스크립트, 대화 미션 지시문 교수자 최종 확인 후 적용 |
| **발음 평가 세부 기준 mock 파생값** — `normalizePronunciationDisplay` 헬퍼가 word scores에서 기준별 점수를 근사 파생. 실제 ETRI 데이터와 일치하지 않음 | 낮 | ETRI 실제 연동 후 헬퍼를 criterion-level 데이터 직접 매핑으로 교체 필요 |

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
| `ETRI_API_BASE_URL` | 선택 | `http://epretx.etri.re.kr:8000` | ETRI enterprise API base URL (Phase 10-E-7 변경) |
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
- [ ] `ETRI_API_BASE_URL` (PRONUNCIATION_PROVIDER=etri 시)
- [ ] `CONVERSATION_PROVIDER=mock` (현재 mock만 지원, 미설정 시 자동 mock)
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

---

## Phase 10-B — Vercel 실제 배포 절차 및 배포 후 점검 (2026-05-05)

### 환경변수 이름 목록 (Vercel Dashboard 입력용)

> 값은 직접 입력. 아래는 이름만 기재.

| 변수명 | 필수 여부 | 비고 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ 필수 | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ 필수 | Supabase anon public key |
| `REPOSITORY_PROVIDER` | ✅ 필수 | 값: `supabase` |
| `STT_PROVIDER` | 선택 | 미설정 시 `mock`. 실제 음성인식: `openai` |
| `TTS_PROVIDER` | 선택 | 미설정 시 `mock`. 실제 TTS: `openai` |
| `PRONUNCIATION_PROVIDER` | 선택 | 미설정 시 `mock`. ETRI: `etri` |
| `LLM_EVAL_PROVIDER` | 선택 | 미설정 시 `mock`. GPT 평가: `openai` |
| `CONVERSATION_PROVIDER` | 선택 | 미설정 시 `mock` (현재 mock만 지원) |
| `OPENAI_API_KEY` | 조건부 | STT/TTS/LLM 중 하나라도 `openai`이면 필수 |
| `OPENAI_EVAL_MODEL` | 선택 | 미설정 시 `gpt-4o-mini` |
| `TTS_MODEL` | 선택 | 미설정 시 `tts-1` |
| `TTS_VOICE` | 선택 | 미설정 시 `nova` |
| `ETRI_API_KEY` | 조건부 | `PRONUNCIATION_PROVIDER=etri` 시 필수 |
| `ETRI_API_BASE_URL` | 조건부 | `PRONUNCIATION_PROVIDER=etri` 시 필수 |
| `SMOKE_TEST_MODE` | ❌ 설정 금지 | Vercel에 절대 추가하지 말 것 — auth bypass |

### Vercel Dashboard 배포 절차

#### 1단계 — Vercel 프로젝트 생성

1. [vercel.com](https://vercel.com) 로그인
2. **Add New > Project**
3. **Import Git Repository**: `korean-speaking-ai-mvp` 선택
4. 자동 감지 확인:
   - Framework: **Next.js**
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Root Directory: `/`
5. 아직 Deploy 누르지 말 것 → 환경변수 먼저 입력

#### 2단계 — 환경변수 입력

1. **Environment Variables** 섹션에서 위 표의 변수명 입력
2. 모든 변수: **Environment** = `Production`, `Preview`, `Development` 전체 선택
3. `SMOKE_TEST_MODE`는 추가하지 말 것
4. 값 입력 후 **Save**

#### 3단계 — 배포 실행

1. **Deploy** 버튼 클릭
2. 빌드 로그에서 오류 없이 완료 확인 (약 2~4분)
3. 배포 완료 후 Vercel이 제공하는 URL 복사 (예: `https://korean-speaking-ai-mvp.vercel.app`)

#### 4단계 — Supabase Auth Redirect URL 등록

배포 URL 확인 즉시 Supabase Dashboard에서 설정:

1. Supabase Dashboard > **Authentication** > **URL Configuration**
2. **Site URL**: `https://<실제-배포-URL>`
3. **Redirect URLs** 추가:
   - `https://<실제-배포-URL>/**`
   - (선택) `http://localhost:3000/**` (로컬 개발 병행 시)
4. **Save**

> 이 설정 없이는 로그인 후 쿠키 세션이 올바르게 설정되지 않아 `/student`, `/teacher` 접근이 `/login`으로 리디렉션될 수 있음.

### 배포 후 테스트 체크리스트

배포 URL: `https://<실제-배포-URL>` 로 교체하여 확인.

#### 기본 접근

| URL | 기대 결과 | 확인 |
|---|---|---|
| `/` | 홈 화면 정상 표시 | [ ] |
| `/login` | 로그인 폼 표시 (이메일/비밀번호 입력 필드 + 로그인 버튼) | [ ] |
| `/login` (미로그인 상태에서 `/student` 접근) | `/login?redirectTo=/student` 으로 리디렉션 | [ ] |
| `/role-missing` | "역할 정보 없음" 헤딩 + 로그아웃 버튼 표시 | [ ] |

#### 인증/역할 분기

| 시나리오 | 기대 결과 | 확인 |
|---|---|---|
| student 계정 로그인 | `/student` 이동 | [ ] |
| teacher 계정 로그인 | `/teacher` 이동 | [ ] |
| student 계정으로 `/teacher` 직접 접근 | `/student` 으로 리디렉션 | [ ] |
| Supabase에 user_profiles 없는 계정 로그인 | `/role-missing` 이동 | [ ] |
| 로그아웃 후 `/student` 접근 | `/login` 으로 리디렉션 | [ ] |

#### 학생 흐름

| URL | 기대 결과 | 확인 |
|---|---|---|
| `/student` | student 홈, 사이드바 메뉴 표시 | [ ] |
| `/student/speaking/q-001` | "자기소개" 제목 + "준비 시작" 버튼 표시 | [ ] |
| 녹음 → 제출 → 결과 | Supabase `speaking_submissions` 행 생성 확인 | [ ] |

#### 교사 흐름

| URL | 기대 결과 | 확인 |
|---|---|---|
| `/teacher` | "채점 관리" 헤딩 + 제출 현황 표시 | [ ] |

#### API fallback (mock 모드)

| 엔드포인트 | 요청 | 기대 결과 | 확인 |
|---|---|---|---|
| `GET /api/health` | — | `200` + JSON | [ ] |
| `POST /api/tts` | `{"text":"안녕하세요"}` | `200` (mock 오디오 URL 또는 fallback JSON) | [ ] |
| `POST /api/pronunciation` | 빈 FormData + `referenceText` | `200` (mock normalizedScore) | [ ] |
| `POST /api/evaluate-speaking` | `{"transcript":"안녕"}` | `200` (mock 평가 결과) | [ ] |

#### DB 연결 확인

- [ ] Supabase `speaking_submissions` 테이블에 제출 행 생성
- [ ] Supabase `ai_evaluations` 테이블에 평가 행 생성
- [ ] Supabase `provider_events` 최근 이벤트 확인

### Supabase Auth Redirect 설정 요약

배포 직후 **반드시** 수행:

```
Supabase Dashboard → Authentication → URL Configuration

Site URL:
  https://<실제-배포-URL>

Redirect URLs:
  https://<실제-배포-URL>/**
  http://localhost:3000/**   ← 로컬 개발 병행 시 추가
```

이 설정을 누락하면 로그인 성공 후에도 세션 쿠키가 올바르게 전달되지 않아 모든 protected route가 `/login`으로 계속 리디렉션됨.

### 배포 전 최종 점검 결과 (Phase 10-B 기준)

| 항목 | 결과 |
|---|---|
| `npm run lint` | ✅ 통과 |
| `npx tsc --noEmit` | ✅ 통과 |
| `npm run build` | ✅ 성공 |
| `npm run test:smoke` | ✅ 21 passed |
| 코드 수정 여부 | 없음 (docs만 수정) |

---

## Phase 10-C — 배포 1차 검증 결과 (2026-05-05)

> **현재 상태**: 배포 1차 성공, 핵심 저장 흐름 확인 완료. 파일럿 운영 전 UI·역할·문항·다국어 품질 보완 필요.

### 수동 검증 결과

| 항목 | 결과 |
|---|---|
| Vercel 배포 성공 | ✅ |
| 배포 URL 접속 | ✅ |
| Supabase Auth Redirect URL 설정 | ✅ |
| student 계정 로그인 | ✅ |
| 말하기 제출 일부 성공 | ✅ |
| `speaking_submissions` 행 저장 | ✅ |
| `audio_url` 저장 | ✅ |
| `provider_events` (stt / pronunciation / llm-eval / tts) 기록 | ✅ |
| `ai_evaluations.scores` 저장 | ✅ |
| `ai_evaluations.pronunciation_result` 저장 | ✅ |
| 교수자 전체 기능 검증 | ⏳ 미완 |
| 관리자 전체 기능 검증 | ⏳ 미완 |
| iPhone Safari 녹음/재생 수동 테스트 | ⏳ 미완 |

### Known Issues — 운영 전 보완 필요

| # | 이슈 | 우선순위 |
|---|---|---|
| 1 | 다문항 평가 흐름 미완 — 한두 문항 중심으로만 동작, 문항 이동·수정 필요 | 높음 |
| 2 | 교수자 로그인 후 전체 기능 정상작동 검증 미완 | 높음 |
| 3 | 관리자 로그인 후 전체 기능 정상작동 검증 미완 | 높음 |
| 4 | 관리자 계정 role 배지가 "교수자"로 오표시 — 버그 수정 필요 | 높음 |
| 5 | RTL 언어(아랍어 등) 문장부호·방향 처리 미적용 — `dir="rtl"`, `unicode-bidi`, punctuation 처리 필요 | 중간 |
| 6 | 음성 버튼 UI 시인성 부족 — "문제 듣기", "녹음 안내 듣기", 재생/정지 버튼 테두리·글자 대비 개선 필요 | 중간 |
| 7 | iPhone Safari 녹음/재생 수동 테스트 미완 | 중간 |
| 8 | ETRI API Key 발급 후 실제 발음평가 연동 테스트 미완 | 중간 |
| 9 | LLM 실제 success 전환 및 평가 품질 검증 미완 | 중간 |
| 10 | RLS 전면 적용 미완 — Auth 기반 제출 전환 후 진행 | 낮음 (Phase 10 이후) |
| 11 | recordings signed URL 전환 미완 — 현재 public bucket | 낮음 (Phase 10 이후) |

---

## Phase 10-D — 배포 후 품질 수정 1차 (2026-05-05)

### 수정 내용

| 항목 | 수정 방법 | 결과 |
|---|---|---|
| 관리자 역할 배지 오표시 | `teacher/layout.tsx` role 하드코딩 제거 → DB role 조회 후 AppShell 전달 | ✅ admin은 "관리자", teacher는 "교수자" 정상 표시 |
| TTS 버튼 시인성 부족 | `variant="ghost"` → `variant="secondary"` (border-slate-300 + bg-white) | ✅ 테두리와 배경색 추가 |
| 아랍어 RTL 처리 | `lang-hint.tsx`에 `getTextDir()` 헬퍼 추가 — AR/FA/HE/UR 감지 시 `dir="rtl"` + CSS 적용 | ✅ 구현 완료, crash 없음 확인 |
| 다문항 이동 버튼 누락 | result 페이지에 "다음 문항으로 →" 버튼 추가 (세트 내 마지막이면 "문항 목록으로") | ✅ 구현 완료 |
| smoke test 추가 | q-002 접근, 문항 목록, TTS 버튼, 아랍어 RTL 4개 테스트 추가 | ✅ 25 passed |

### 검증 결과

| 명령 | 결과 |
|---|---|
| `npm run lint` | ✅ 통과 |
| `npx tsc --noEmit` | ✅ 통과 |
| `npm run build` | ✅ 성공 |
| `npm run test:smoke` | ✅ 25 passed |

### 남은 Known Issues

| # | 이슈 |
|---|---|
| 1 | 교수자/관리자 전체 기능 시나리오 추가 검증 필요 |
| 2 | 문항 콘텐츠 전면 정비 필요 (현재 q-001~q-008 mock 콘텐츠) |
| 3 | 아랍어/다국어 문장 검수 필요 (번역 품질) |
| 4 | iPhone Safari 녹음/재생 수동 테스트 미완 |
| 5 | ETRI 실제 발음평가 연동 테스트 미완 |
| 6 | LLM 실제 success 전환 및 평가 품질 검증 미완 |
| 7 | RLS 전면 적용 미완 |
| 8 | recordings signed URL 전환 미완 |
| 9 | dialogue_mission dialogueTurns DB 저장 미완 — 현재 mock 하드코딩 |
| 10 | 정식 평가세트 콘텐츠 교수자 검수 미완 |

---

## Phase 10-E-5-B — 교수자 채점 Official Rubric 강화 (2026-05-06)

> **Phase 10-E-5-B 기록 (2026-05-06)**: 교수자 채점 화면을 공식 루브릭(4유형 × 배점 체계)으로 강화. AI = 1차 평가자, 교수자 = 최종 확정자 구조 명시화. dialogue_mission q4 대화 로그·미션 목표 달성 현황 표시 추가.

### 구현 내용

| 항목 | 내용 |
|---|---|
| 교수자 채점 위저드 동적 루브릭 | `question.rubricId` 기반 공식 루브릭 자동 선택 (낭독 15pt, 자료설명 25pt, 듣고답하기 25pt, 대화미션 35pt) |
| Step 1 제출 검토 | 음성 플레이어, 전사문, AI 1차 평가 점수(원점수/환산점수), 필수요소 목록, 모범답안, 교수자 노트 표시 |
| Step 1 q4 대화 로그 | AI 말풍선(좌, 파란색) + 학생 말풍선(우, 회색)으로 전체 대화 기록 표시 |
| Step 1 듣고답하기 | 교수자 전용 노란색 박스에 `listeningScriptForTeacherOnly` 표시 (학생 화면 비공개) |
| Step 1 대화미션 | 교수자 전용 파란색 박스에 AI 정보 (`aiInformation`) 표시 |
| Step 2 루브릭 조정 | 공식 루브릭 항목별 점수 조정 테이블 (AI 원점수/환산 동시 표시) |
| Step 2 q4 미션 목표 달성 | "미션 목표 달성 현황 (AI 판정)" 패널 + "교수자 판단으로 조정 가능" 안내 |
| Step 3 최종 피드백 | AI 환산 점수(0-100) + 교수자 확정 점수(배점 기준) + 환산 점수 참고 동시 표시 |
| 제출 목록 | `대화 미션` 유형에 "AI대화" Badge 표시 |

### 검증 결과

| 명령 | 결과 |
|---|---|
| `npm run lint` | ✅ 통과 |
| `npx tsc --noEmit` | ✅ 통과 |
| `npm run build` | ✅ 성공 |
| `npm run test:smoke` | ✅ 126 passed (27개 Phase 10-E-5-B 전용 테스트 포함) |

---

## 파일럿 교수자 검토 절차 (Phase 10-E-5-B 기준)

파일럿 운영 시 교수자(채점자)가 따라야 할 AI 1차 평가 → 교수자 최종 확정 절차.

### 전체 흐름

```
학습자 제출 → AI 1차 자동 평가 → 교수자 검토 대기(ai_evaluated)
  → 교수자 채점 위저드 진입 → 3단계 검토 → 최종 확정(finalized)
```

### 교수자 채점 위저드 3단계 절차

#### Step 1 — 제출 검토

교수자가 확인할 항목 (순서대로):

| 확인 항목 | 위치 |
|---|---|
| 문항 유형 및 배점 | 문항 정보 배지 (예: "낭독 · 15pt") |
| 학습자 음성 파일 | `<audio>` 플레이어 — 실제 발화 청취 |
| AI 전사문 (STT 결과) | "AI 전사문" 카드 — 발화 내용 텍스트 확인 |
| AI 1차 평가 점수 | 항목별 점수 테이블 (원점수 / 환산 0-100) |
| 필수 포함 요소 | "필수 포함 요소" 목록 — 학습자 발화 포함 여부 확인 |
| 모범답안 (교수자 참고) | "모범답안 (교수자 참고)" 카드 |
| 교수자 노트 | 문항별 채점 지침 |
| **q3 듣고답하기 전용** | 교수자 전용 노란색 박스의 듣기 스크립트 확인 |
| **q4 대화미션 전용** | 전체 대화 로그 (AI/학생 말풍선) + 교수자 전용 AI 정보 박스 |

#### Step 2 — 루브릭 점수 조정

| 확인 항목 | 위치 |
|---|---|
| AI 점수 → 교수자 점수 조정 | 루브릭 항목별 슬라이더/숫자 입력 |
| 조정 이유 선택 | "조정 이유" 드롭다운 (전사 오류, 발음 미인식, 내용 추가 등) |
| 총점 비교 | 테이블 하단 합산 행 (교수자 / AI 원점수 / AI 환산) |
| **q4 미션 달성 현황** | "미션 목표 달성 현황 (AI 판정)" 패널 — 참고하여 점수 조정 가능 |

#### Step 3 — 최종 피드백 및 확정

| 확인 항목 | 위치 |
|---|---|
| 최종 점수 비교 | AI 환산(0-100) vs 교수자 확정 점수(배점 기준) vs 교수자 환산 점수 |
| 학습자 공개 피드백 | 텍스트 영역 — 학습자에게 표시될 종합 의견 입력 |
| 강점 | 잘한 점, 향상된 부분 |
| 보완점 | 개선이 필요한 부분, 오류 패턴 |
| 다음 추천 활동 | 다음 학습 활동, 권장 연습 방법 |
| 최종 확정 | "최종 확정 ✓" 버튼 클릭 → `finalized` 상태로 전환 |

> ⚠️ 확정 후 재확정은 가능하나 "재확정" 표시가 남음. 점수와 피드백을 최종 확인 후 클릭.

### 교수자 확인 항목 체크리스트 (파일럿 전 수동 검증)

파일럿 출시 전 교수자가 아래 체크리스트를 직접 실행하여 채점 위저드 동작을 확인한다.

**q1 낭독 (15pt) 채점 검증**
- [ ] `/teacher/submissions` 목록에서 q1 낭독 제출 확인
- [ ] 상세 화면 진입 시 루브릭 "낭독 평가" + "15pt" 표시 확인
- [ ] Step 1: 음성 플레이어, 전사문, AI 점수 (4개 항목, 합 15점 이내) 표시 확인
- [ ] Step 1: 필수 포함 요소 목록 표시 확인
- [ ] Step 2: 루브릭 4개 항목 점수 조정 가능 확인
- [ ] Step 3: 교수자 점수 ≤ 15 확인, 피드백 입력 후 최종 확정 완료

**q2 자료 설명 (25pt) 채점 검증**
- [ ] 루브릭 "자료 설명 평가" + "25pt" 표시 확인
- [ ] Step 1: 루브릭 5개 항목 AI 점수 표시 확인
- [ ] Step 2: 항목별 조정 후 합산이 25pt 이내인지 확인

**q3 듣고 답하기 (25pt) 채점 검증**
- [ ] 루브릭 "듣고 답하기 평가" + "25pt" 표시 확인
- [ ] Step 1: 노란색 박스에 교수자 전용 듣기 스크립트 표시 확인
- [ ] Step 1: 듣기 스크립트가 학생 결과 화면(`/student/speaking/.../result`)에는 노출되지 않음 확인

**q4 대화 미션 (35pt) 채점 검증**
- [ ] 제출 목록에서 "AI대화" Badge 표시 확인
- [ ] 루브릭 "대화 미션 평가" + "35pt" 표시 확인
- [ ] Step 1: 전체 대화 로그 (AI 말풍선 좌, 학생 말풍선 우) 표시 확인
- [ ] Step 1: 파란색 박스에 교수자 전용 AI 정보 표시 확인
- [ ] Step 1: AI 정보가 학생 결과 화면에는 노출되지 않음 확인
- [ ] Step 2: "미션 목표 달성 현황 (AI 판정)" 패널 표시 확인
- [ ] Step 2: 루브릭 5개 항목 (미션 달성·상호작용·전략·정확성·유창성) 조정 가능 확인
- [ ] Step 3: 교수자 점수 ≤ 35 확인, 피드백 입력 후 최종 확정 완료

**공통 보안 검증**
- [ ] 교수자 전용 `listeningScriptForTeacherOnly`가 `/student/speaking/*/result` 화면에 없음 확인
- [ ] 교수자 전용 `aiInformation`이 `/student/speaking/*/result` 화면에 없음 확인
- [ ] 교수자 채점 화면(`/teacher/submissions/[id]`)이 미인증 상태에서 `/login`으로 redirect 확인

---

## Phase 10-E-5-C/D — 평가 모드와 연습 모드 정책 분리 / Azure TTS (2026-05-06)

> **Phase 10-E-5-C/D 기록 (2026-05-06)**: assessment mode(q4 평가)와 practice mode(생성형 대화연습)의 대화 규칙 분리. 5개 페르소나 구조 정의. Azure TTS provider 연결 구조 구현.

### 평가 q4 (assessment mode) vs 생성형 대화연습 (practice mode) 규칙 차이

| 항목 | assessment mode (q4) | practice mode (대화연습) |
|---|---|---|
| 목적 | 미션 달성·평가 공정성 | 언어 학습·피드백 |
| 언어 질문 대응 | 짧게 확인 후 역할극 복귀 | 자세한 설명 + 예문 |
| 최대 턴 수 | 8~10 (초급/중급), 10 (고급) | 14~20 |
| 자율도 | guided (미션 목표 우선) | open (자유 대화) |
| 교수자 확정 | 대상 (finalized 상태) | 미대상 (학습 피드백 전용) |
| 페르소나 | cafe_staff/admin/event (assessment 지원) | teacher_coach/friend (practice 전용) |

**assessment mode 문법 질문 응답 예:**
> 학생: "포장해 주세요가 맞아요?"  
> AI: "네, 자연스러운 표현입니다. 그럼 포장으로 해드릴까요?"

**practice mode 문법 질문 응답 예:**
> 학생: "포장해 주세요와 가져갈게요 차이가 뭐예요?"  
> AI: "둘 다 사용할 수 있습니다. '포장해 주세요'는 주문할 때 정중하게 요청하는 표현이고, '가져갈게요'는 매장에서 먹지 않고 가지고 간다는 뜻입니다. 예를 들면 '아메리카노 하나 포장해 주세요'라고 말할 수 있습니다."

### Azure TTS 적용 절차

Azure TTS는 `TTS_PROVIDER=azure` + `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` 설정 시 활성화된다.

**환경변수 설정 (`.env.local` 또는 Vercel 환경변수):**
```
TTS_PROVIDER=azure
AZURE_SPEECH_KEY=(Azure Portal > Speech Services > Keys and Endpoint > KEY 1)
AZURE_SPEECH_REGION=(예: koreacentral, eastasia)
AZURE_TTS_VOICE=ko-KR-SunHiNeural
```

**Azure Speech 리소스 생성 절차:**
1. Azure Portal > Create resource > "Speech" 검색 > 생성
2. Pricing tier: Free (F0) — 월 500,000자 무료 (파일럿 규모 충분)
3. 생성 완료 후 Keys and Endpoint에서 Key1 복사
4. Region 확인 (예: Korea Central = koreacentral)
5. 위 환경변수에 설정 후 재배포

**TTS provider fallback 정책:**

| 상황 | 동작 |
|---|---|
| `TTS_PROVIDER=azure` + 키 있음 | Azure Speech TTS → `audioBase64` 반환 → Audio 객체 재생 |
| `TTS_PROVIDER=azure` + 키 없음 | 예외 catch → fallback JSON → browser speechSynthesis |
| `TTS_PROVIDER=openai` + 키 있음 | OpenAI TTS → `audioBase64` 반환 → Audio 객체 재생 |
| `TTS_PROVIDER=mock` (기본값) | fallback JSON → browser speechSynthesis |
| speechSynthesis 미지원 브라우저 | error 상태 반환 → 대화 진행 불중단 |

**한국어 Azure Neural 음성 목록 (권장):**

| 음성 | 성별 | 특징 | 권장 용도 |
|---|---|---|---|
| ko-KR-SunHiNeural | 여성 | 자연스럽고 친절한 톤 | 카페 점원, 코치 |
| ko-KR-InJoonNeural | 남성 | 차분하고 전문적 | 행정실, 협력기관 |
| ko-KR-BongJinNeural | 남성 | 뉴스 톤, 명확한 발음 | 고급 비즈니스 |

### 페르소나 / 사투리 파일럿 유의사항

**페르소나 현황:**

| personaId | 이름 | 레벨 | mode 지원 |
|---|---|---|---|
| cafe_staff_friendly | 친절한 카페 점원 | 초급 | assessment + practice |
| admin_staff_clear | 행정실 직원 | 중급 | assessment + practice |
| event_partner_professional | 외부 협력기관 직원 | 고급 | assessment + practice |
| korean_teacher_coach | 한국어 선생님 | 전체 | practice 전용 |
| friend_casual | 친구 | 전체 | practice 전용 |

**사투리 관련 파일럿 주의사항:**
- `dialectHint` 필드는 구현 구조만 준비됨 — 실제 사투리 억양 TTS는 미구현
- LLM 기반 사투리 어휘/표현 변환은 기술적으로 가능하나, 파일럿에서는 표준어(standard) 기본 사용
- Azure Neural voice는 표준 한국어 기준 — 사투리 억양 TTS 품질은 Azure voice 지원 확인 필요
- assessment mode에서는 반드시 표준 한국어 사용 (평가 공정성)
- 사투리 실험은 practice mode + 후속 단계로 연기

### 파일럿 전 Azure TTS 수동 검증 체크리스트

- [ ] `TTS_PROVIDER=azure`, `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` 환경변수 설정
- [ ] `AZURE_TTS_VOICE=ko-KR-SunHiNeural` 확인
- [ ] `/api/tts`에 `{"text":"어서 오세요. 주문 도와드릴게요."}` POST → `audioBase64` 반환 확인
- [ ] q4 대화 시작 → AI 첫 발화 자동 재생 (Azure TTS 음성) 확인
- [ ] q4 AI turn 다시 듣기 버튼 클릭 → Azure TTS 재생 확인
- [ ] q1 "문제 듣기" 버튼 → Azure TTS 재생 확인 (q1/q2/q3 흐름 영향 없음)
- [ ] Azure 키 제거 후 fallback → browser speechSynthesis 정상 동작 확인

---

## Phase 10-E-6-A 체크리스트 업데이트 (2026-05-07)

### 완료된 항목
- [x] q2/q3 ETRI 실패 카드 제거 — 자유발화 문항 ETRI 완전 건너뜀
- [x] q4 제출 오류 수정 — dialogue-actions.ts ETRI 호출 제거
- [x] q3 TTS fallback 듣기 자극 — ttsScript 등록 + AudioAssetCard TTS 재생
- [x] q4 AI 응답 자연화 — 완료 시 구체적 메시지, 절차 질문 분기
- [x] result page 발음 카드 — qt-reading 전용, q2/q3/q4 quiet notice/hidden

### 파일럿 전 잔여 항목
- [x] q2 이미지 파일 등록: public/images/official/beginner-restaurant-scene.svg (10-E-6-I 완료 — SVG 임시본. 파일럿 전 실제 사진 교체 권장)
- [ ] q3 실제 mp3 등록: public/audio/official/beginner-korean-class-announcement.mp3 등 3개
- [ ] ETRI 점수 calibration 완료 후 환산 비율 결정
- [ ] Azure TTS 수동 검증 체크리스트 실행

---

## 시연 계획 및 2차 시연 대비 메모 (2026-05-07 기준)

### 1차 시연 (기준일 +12시간 이내)

**범위**: 초급 평가세트 (beginner-set-1) 중심

| 항목 | 상태 | 비고 |
|---|---|---|
| q1 낭독 | ✅ 정상 | ETRI 실패 시 AI 참고점수 fallback 표시 |
| q2 자료 설명 | ✅ SVG 이미지 표시 | 파일럿 전 실제 사진 교체 권장 |
| q3 듣고 답하기 | ✅ TTS fallback 가능 | 실제 mp3 미등록 — TTS 음성으로 대체 |
| q4 대화 미션 | ✅ 카페 미션 동작 | Mock dialogue provider 사용, 실제 LLM 연결 전 단계 |
| ETRI 발음평가 | ✅ fallback 처리 | 실패 시 AI 참고점수 유지, 공식 점수 미사용 |
| 교수자 채점 | ✅ 동작 | 제출 목록·루브릭 조정·최종 확정 3-step 위저드 |

**1차 시연 시 주의사항**:
- ETRI는 실패해도 평가 흐름 중단 없음 — 공식 발음점수로 사용하지 않음
- q3 TTS 재생 버튼 활성화 여부: TTS_PROVIDER 환경변수 확인 (browser fallback으로도 동작)
- 중급/고급 세트는 isActive=true이나 1차 시연은 초급 중심 진행 권장
- 시연 환경에서 중급/고급을 숨기려면 `question-sets.json` isActive=false 일시 변경 가능

---

### 2차 시연 전 중급/고급 정비 계획 (~60시간 이내)

#### 현재 상태

| 항목 | 중급 (intermediate-set-1) | 고급 (advanced-set-1) |
|---|---|---|
| q1~q4 문항 정의 | ✅ 모두 존재 | ✅ 모두 존재 |
| q2 자료 asset | ✅ 인라인 차트 (ready) | ✅ 인라인 차트 (ready) |
| q3 음원 | ⚠️ TTS fallback | ⚠️ TTS fallback |
| q4 missionGoals | ✅ 3개 정의됨 (행정실 문의) | ✅ 3개 정의됨 (이벤트 협의) |
| requiredElements 평가 보정 | ✅ 공통 로직 적용됨 | ✅ 공통 로직 적용됨 |
| result / attempt summary | ✅ 공통 로직 적용됨 | ✅ 공통 로직 적용됨 |
| q2/q3 결과 화면 세부 안내 문구 | ⚠️ 초급 수준 정비 미반영 | ⚠️ 초급 수준 정비 미반영 |
| q4 대화 흐름 충분히 검증됨 | ⚠️ 미검증 | ⚠️ 미검증 |

#### 2차 시연 전 필수 작업 목록

| 우선순위 | 작업 | 대상 파일 |
|---|---|---|
| 필수 | q2/q3 결과 화면: 초급에서 정리한 문항별 안내 문구(능력 중심, 학습자 친화)를 중급/고급에도 적용 확인 | `result/page.tsx` (이미 typeId 기준 공유 — 확인만) |
| 필수 | q3 피드백 오류 방지: allElementsFound 시 이미 포함된 요소를 보완점에 표시하지 않는 보정이 중급/고급 q3 requiredElements에도 올바르게 작동하는지 수동 확인 | `llm-eval/index.ts` (범용 로직 — 테스트 확인) |
| 필수 | q4 대화 흐름 수동 확인: intermediate-q4 (행정실) 및 advanced-q4 (이벤트 협의) 실제 대화 진행 테스트 | 수동 확인 |
| 필수 | q4 결과 화면: missionGoals 기준 잘한 점/보완할 점 피드백이 중급/고급 goal 텍스트로 표시되는지 확인 | `result/page.tsx` |
| 필수 | attempt summary: 중급/고급 세트 전체 응시 후 점수 환산(0~100 clamp, 100% 초과 방지) 정상 동작 수동 확인 | 수동 확인 |
| 권장 | q2 실제 이미지: 중급/고급은 인라인 차트로 이미 ready — 추가 작업 불필요 | — |
| 권장 | q3 실제 mp3: 세 레벨 모두 TTS fallback → 파일럿 전 실제 녹음본 등록 권장 | `public/audio/official/` |
| 참고 | 중급/고급 isActive 현재 true — 2차 시연 전 정비 완료 후 활성화 유지 가능 | `question-sets.json` |

#### 2차 시연 후 정비 필요 항목

- q4 실제 LLM provider 연결 후 중급/고급 대화 품질 추가 개선
- q2/q3/q4 점수 산식 파일럿 샘플 수집 후 보정 (세 레벨 공통)
- ETRI calibration 완료 후 q1 점수 반영 비율 확정
- 중급/고급 전용 모범답안(`modelAnswer`)이 교수자 화면에 올바르게 표시되는지 확인
- 각 레벨별 교수자 teacherNotes 화면 표시 확인
