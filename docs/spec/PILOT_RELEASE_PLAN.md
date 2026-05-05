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
| **D+10** — API/녹음 연동 2차 보완판 | 2026-05-14 | 실제 녹음 + STT 연동 (옵션) | 진행 예정 |
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

## D+10 — API/녹음 연동 2차 보완판 (2026-05-14)

**목표**: 실제 음성 녹음 + 외부 API 연동. (선택적 — 환경에 따라 조정)

**완료 조건 (핵심):**
- `MediaRecorder` 기반 실제 오디오 녹음 UI
- 녹음 파일 Supabase Storage 업로드
- STT Provider 교체 가능 구조 확인 (ETRI 또는 Whisper)

**완료 조건 (선택):**
- ETRI STT API 연동 (ETRI 계정/키 필요)
- 실제 발음 평가 Provider 연동
- Claude API LLM 평가 Provider 연동

**비고**: 외부 API 키가 없는 경우 mock provider 유지하고 D+15 출시 진행 가능.

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
| Supabase Auth / 로그인 | 파일럿 규모에서 URL 직접 접근으로 충분 | Phase 8+ |
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
| **인증 없음** — URL 알면 누구나 접근 | 중 | 파일럿 URL 비공개 배포, 참가자에게만 공유 |
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

```
# Vercel 프로젝트 설정 > Environment Variables에서 설정

NEXT_PUBLIC_SUPABASE_URL=          # required (D+3+)
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # required (D+3+)
SUPABASE_SERVICE_ROLE_KEY=         # required (D+3+), NEXT_PUBLIC 없이 서버 전용
REPOSITORY_PROVIDER=supabase       # 'mock'|'supabase' (미설정 시 mock)

# Optional (D+10+)
STT_PROVIDER=mock                  # 'mock'|'etri'|'whisper'
ETRI_API_KEY=                      # STT_PROVIDER=etri 시 필요
PRONUNCIATION_PROVIDER=mock        # 'mock'|'etri'
LLM_EVAL_PROVIDER=mock             # 'mock'|'claude'|'openai'
ANTHROPIC_API_KEY=                 # LLM_EVAL_PROVIDER=claude 시 필요
```

---

## 성공 기준 (D+15 파일럿)

- 교수자 1명이 로그인 없이 URL 직접 접근 후 3명 학생 채점 완료
- 학생 3명이 말하기 평가 1회 제출 + 결과 확인
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
