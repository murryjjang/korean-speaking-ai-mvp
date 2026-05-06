# WORK LOG

Phase별 작업 내역을 기록합니다.

---

## Phase 10-E-5-C/D 통합 보정 — language question 우선순위, 무음 차단, q2 이미지 구조

**날짜**: 2026-05-06  
**목표**: assessment/practice mode 분리 후 추가 보정. q4 표현 질문 오인 수정, 무음 STT 환각 차단, q2 실제 사진 asset 연결 구조 정리.

### 수정/신규 파일

| 파일 | 변경 내용 |
|---|---|
| `src/lib/audio-validation.ts` | **신규** — `AudioStats`, `validateRecordedAudio()`, `isLikelySilentAudio()`, `getAudioValidationMessage()` |
| `src/lib/stt-sanity.ts` | **신규** — `isLikelySttHallucination()`, `isGenericYouTubeOutro()`, `normalizeTranscript()` (YouTube outro 환각 필터) |
| `src/lib/dialogue-policy.ts` | language question 패턴 확장 (17→27개), "어떻게 얘기", "이 표현", "자연스러", "문법", "발음" 등 추가; `answerLanguageQuestionForAssessment()`에 "여기서/매장 어떻게 얘기" 전용 응답 추가 |
| `src/lib/dialogue-mission.ts` | `missionStudentText()` — language question turn을 mission evidence에서 제외; `shouldAnswerLanguageQuestion()` import로 재감지 |
| `src/types/dialogue.ts` | `DialogueTurnIntent` 타입 추가 (`language_question`, `mission_response`, `other`); `DialogueTurn.intent` 선택 필드 추가 |
| `src/hooks/use-audio-recorder.ts` | AudioContext/AnalyserNode 기반 에너지 분석 추가; `audioStats: AudioStats \| null` 반환; `finalizeAudioAnalysis()` helper |
| `app/api/stt/route.ts` | STT 결과 post-filter — `isLikelySttHallucination()` 통과하면 `transcript: ''`, `warning: 'stt_hallucination_filtered'` 반환; provider_events 기록 |
| `src/providers/conversation/index.ts` | `allStudentText()` — language question turns 제외 (mission evidence 오염 방지) |
| `src/content/assessment-assets.ts` | beginner q2 `src` 경로 설정 (`/images/official/beginner-restaurant-scene.jpg`), `alt` 개선 |
| `src/components/question-asset-renderer.tsx` | `ImageAssetCard`에 `onError` fallback 추가 — 파일 없어도 placeholder로 graceful 전환 |
| `src/components/dialogue-mission-panel.tsx` | `validateRecordedAudio()` 사용; `getAudioValidationMessage()` 메시지 동적화; STT hallucination warning 차단; student turn에 `intent` 태깅 |
| `app/student/speaking/[questionId]/speaking-client.tsx` | `validateRecordedAudio()` 사용; `sttHallucinationError` 상태 추가; hallucination 감지 시 재녹음 안내 표시 |
| `public/images/official/.gitkeep` | 이미지 대상 디렉토리 생성 |
| `tests/smoke/auth-routes.spec.ts` | Phase 10-E-5-C/D 통합 보정 전용 테스트 14개 추가 (총 156개) |

### 핵심 구현 내용

**q4 language question 우선순위 보정**:
- 처리 순서 고정: ① no-speech/invalid audio guard → ② language question 감지 → ③ mission completion → ④ normal roleplay
- "여기서 먹고 가려면 어떻게 얘기해야 하죠?" → language question 처리, "'여기서 먹고 갈게요' 또는 '매장에서 먹고 갈게요'라고 말하면 자연스럽습니다. 그럼 매장에서 드시고 가실 건가요?"
- "포장해 주세요가 맞아요?" → language question 처리, 포장 missionGoal evidence로 사용 안 함
- `detectMissionProgress()`: language question turn을 text evidence에서 제외 (`missionStudentText()`)
- `DialogueTurn.intent`: `language_question` | `mission_response` | `other` (client-only, DB schema 변경 없음)

**무음 녹음 / STT 환각 차단**:
- 클라이언트: `validateRecordedAudio({ durationSec, blobSize, audioStats })` — duration < 2s, blobSize < 3000B, maxRms < 0.003, voicedMs < 400ms 시 invalid
- AudioContext/AnalyserNode로 RMS 샘플링 (100ms 간격), `audioStats` 반환
- 서버: `/api/stt` 결과에 `isLikelySttHallucination()` 적용 — "시청해주셔서 감사합니다.", YouTube outro 등 차단
- q4 dialogue panel: STT warning `stt_hallucination_filtered` 시 turn 추가/AI 응답 생성 금지

**q2 실제 사진 asset 연결 구조**:
- `assessment-assets.ts`: beginner q2 `src: '/images/official/beginner-restaurant-scene.jpg'` 설정
- `ImageAssetCard`: `onError` → `setImgFailed(true)` → placeholder 전환 (파일 없어도 crash 없음)
- `public/images/official/` 디렉토리 생성 (실제 사진 파일은 파일럿 전 직접 촬영/허가 이미지로 교체 필요)
- intermediate/advanced q2 chart/table 렌더링 유지

**Known Issues (남은 항목)**:
- Azure 실제 키 기반 수동 검증 미완
- practice mode 전체 대화 UI (페르소나 카드 클릭 → 대화 시작) 미구현
- dialogueTurns DB 영구 저장 미완
- attempt 단위 전체 응시 흐름(1~4번) 미구현
- beginner q2 실제 사진 파일 없음 (파일럿 전 직접 촬영 또는 사용 허가 이미지 교체 필요)
- 모바일/브라우저별 무음 threshold 수동 조정 필요

### 검증 결과

| 명령 | 결과 |
|---|---|
| `npm run lint` | ✅ 0 errors |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run build` | ✅ 성공 (20 routes) |
| `npm run test:smoke` | ✅ 156 passed (14개 Phase 10-E-5-C/D 통합 보정 테스트 포함) |

---

## Phase 10-E-5-C/D — 대화 정책 분리, 페르소나 구조 확장, Azure TTS provider

**날짜**: 2026-05-06  
**목표**: assessment mode(q4 평가)와 practice mode(생성형 대화연습)의 대화 규칙을 분리. 5개 페르소나 구조 정의. Azure TTS provider 연결 가능 구조 구현 + Azure 키 미설정 시 browser speechSynthesis fallback 안전 동작.

### 수정/신규 파일

| 파일 | 변경 내용 |
|---|---|
| `src/lib/dialogue-policy.ts` | **신규** — `DialogueMode`, `DialoguePolicyConfig`, `shouldAnswerLanguageQuestion()`, `answerLanguageQuestionForAssessment()`, `answerLanguageQuestionForPractice()`, `buildReturnToRoleplayMessage()`, `getDialoguePolicy()` |
| `src/lib/personas.ts` | **신규** — 5개 페르소나 registry: cafe_staff_friendly, admin_staff_clear, event_partner_professional, korean_teacher_coach, friend_casual; `dialectHint` 필드 포함 |
| `src/providers/tts/azure.ts` | **신규** — `AzureTTSProvider` (SSML 기반, ko-KR-SunHiNeural 기본값, AZURE_SPEECH_KEY/REGION 없으면 `azure_tts_no_credentials` 예외 발생) |
| `src/providers/tts/index.ts` | Azure provider 분기 추가 (`TTS_PROVIDER=azure`) |
| `app/api/tts/route.ts` | Azure credentials 체크 로직 추가 — `isAzure` 조건으로 fast-path 분기 |
| `src/types/dialogue.ts` | `DialogueMode`, `DialoguePanelConfig` 타입 추가 |
| `src/providers/conversation/index.ts` | `DialogueConversationInput`에 `mode`, `personaId`, `allowLanguageHelp`, `maxTurns`, `autonomyLevel` 추가; `MockDialogueConversationProvider`에서 policy 기반 언어 질문 처리, practice mode 개방적 응답 |
| `app/api/dialogue/respond/route.ts` | `mode`, `personaId` 수신 후 provider에 전달 |
| `src/components/dialogue-mission-panel.tsx` | `mode`, `personaId` props 추가; API 호출 시 전달; `handleSendTurn` 의존성 배열 업데이트 |
| `app/student/conversation-practice/page.tsx` | **신규** — 생성형 대화연습 placeholder 페이지 (페르소나 카드 5개, 준비 중 상태 표시) |
| `app/student/layout.tsx` | "대화연습 (생성형)" nav item 추가 |
| `app/teacher/submissions/[id]/grading-wizard.tsx` | `data-testid="grading-wizard"` 추가 (smoke test 대응) |
| `.env.local.example` | Azure TTS 설명 업데이트, `AZURE_TTS_VOICE` 변수 추가 |
| `tests/smoke/auth-routes.spec.ts` | Phase 10-E-5-C/D 전용 테스트 16개 추가 (총 142개) |

### 핵심 구현 내용

**Assessment vs Practice 정책 분리**:
- `assessment` mode: `allowLanguageHelp: 'limited'`, `maxTurns: 8~10`, `autonomyLevel: 'guided'` — 미션 달성 중심, 문법 질문에 짧게 답하고 역할극 복귀
- `practice` mode: `allowLanguageHelp: 'full'`, `maxTurns: 14~20`, `autonomyLevel: 'open'` — 문법/표현 자세한 설명, 예문 제공, 코치 모드
- q4 official dialogue_mission은 반드시 `assessment` mode (기본값)

**문법/표현 질문 대응**:
- `shouldAnswerLanguageQuestion()`: 정규식 패턴 17개로 언어 질문 감지
- assessment: 짧은 확인 후 즉시 역할극 복귀 (예: "네, 자연스러운 표현입니다. 포장으로 해드릴까요?")
- practice: 자세한 설명 + 예문 (예: "'포장해 주세요'와 '가져갈게요' 차이 설명 + 연습 유도")

**Azure TTS**:
- `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` 있으면 Azure Cognitive Services TTS 호출
- SSML 기반 (ko-KR, SunHiNeural 기본값), `rateForLevel()`로 수준별 속도 조정
- 키 없으면 `azure_tts_no_credentials` 예외 → API route에서 catch → fallback JSON 반환
- 클라이언트(`use-tts.ts`)는 `audioBase64` 없으면 자동으로 browser speechSynthesis 사용

**페르소나 구조**:
- 5개 페르소나, `dialectHint` 필드 포함 (standard/seoul/busan/jeolla/gyeongnam)
- 사투리 억양 TTS는 Azure voice 지원 확인 후 후속 구현 예정 (LLM 표현은 가능, TTS 억양은 미지원)
- `modeSupport` 필드로 assessment/practice 지원 여부 관리

**Known Issues (남은 항목)**:
- Azure 실제 키 기반 수동 검증 미완
- practice mode 전체 대화 UI (페르소나 카드 클릭 → 대화 시작) 미구현
- dialogueTurns DB 영구 저장 미완
- attempt 단위 전체 응시 흐름(1~4번) 미구현

### 검증 결과

| 명령 | 결과 |
|---|---|
| `npm run lint` | ✅ 0 errors |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run build` | ✅ 성공 (20 routes) |
| `npm run test:smoke` | ✅ 142 passed (16개 Phase 10-E-5-C/D 전용 테스트 포함) |

---

## Phase 10-E-5-B — 교수자 최종확정 화면 official rubric 기반 강화

**날짜**: 2026-05-06  
**목표**: teacher dashboard 제출 검토 화면을 official assessment rubric 기준으로 강화. AI가 1차 평가자, 교수자가 최종 확정자라는 구조를 명확히.

### 수정 파일

| 파일 | 변경 내용 |
|---|---|
| `src/types/grading.ts` | `OfficialRubric`, `QuestionExtras`, `DialogueTurnPreview` 타입 추가; `GradingWizardData` 확장 (`officialRubric`, `questionExtras`, `dialogueTurns`, `isDialogueMission`) |
| `src/lib/mock/data.ts` | 공식 문항 mock submission 4개 추가 (sub-019~022), AI evaluation 4개 추가 (공식 rubric ID 기반) |
| `app/teacher/submissions/[id]/page.tsx` | 올바른 rubric 동적 로드 (`question.rubricId`), `questionExtras` 빌드, `dialogueTurns` mock 데이터, `isDialogueMission` 판별 |
| `app/teacher/submissions/[id]/step-submission-view.tsx` | 문항 guide/requiredElements/modelAnswer 표시; 교수자 전용: listeningScriptForTeacherOnly, aiInformation; q4 대화 로그(AI/학생 turn 구분); 음성 파일 audio player; AI 1차 평가 점수 배점 기준 표시 |
| `app/teacher/submissions/[id]/step-rubric-adjust.tsx` | officialRubric.totalMaxScore 기반 합계 표시; AI 환산/원점수 구분 안내; 대화 미션 missionGoals 달성 현황; "미션" "상호작용" 조정 이유 추가 |
| `app/teacher/submissions/[id]/step-final-feedback.tsx` | AI 1차 환산 점수 vs 교수자 확정 점수(배점 기준) 구분 표시; officialRubric.totalMaxScore 적용 |
| `app/teacher/submissions/page.tsx` | questionsJson import, dialogue_mission 문항 유형 레이블 "대화 미션"으로 분기 |
| `app/teacher/submissions-table.tsx` | `isDialogueMission` 필드 추가; dialogue_mission 행에 "AI대화" 배지 표시 |
| `app/teacher/submissions/submissions-client.tsx` | 필터 옵션에 "대화 미션 (AI 쌍방)" 추가 |
| `tests/smoke/auth-routes.spec.ts` | Phase 10-E-5-B teacher review 테스트 27개 추가 |
| `docs/spec/WORK_LOG.md` | 이 항목 |
| `docs/spec/PHASE_10E_GAP_ANALYSIS.md` | 10-E-5-B 처리 결과 반영 |

### 핵심 구현 내용

**Official Rubric 연동**:
- `page.tsx`에서 `question.rubricId`로 rubrics.json에서 정확한 루브릭을 로드
- reading(15점), material_description(25점), listening_response(25점), dialogue_mission(35점) 각각의 항목·배점 사용
- legacy `rubric-speaking-01`(100점)은 기존 제출에 그대로 유지

**점수 표시 구분**:
- AI 1차 환산 점수: `aiEval.normalizedScore`(0~100)
- AI 원점수(배점 기준): `aiEval.totalScore / officialRubric.totalMaxScore`
- 교수자 최종 점수: sum of adjusted rubric item scores / officialRubric.totalMaxScore

**Step 1 (제출 검토) 강화**:
- `requiredElements`: 루브릭 채점 기준 목록 표시
- `listeningScriptForTeacherOnly`: 교수자 전용 박스로 표시 (학생 비공개)
- `aiInformation`: 교수자 전용 박스로 표시 (학생 비공개)
- q4 대화 로그: AI/학생 turn 구분 말풍선 형태로 표시
- `modelAnswer`: 교수자 참고 모범 답안 표시
- `teacherNotes`: 교수자 채점 메모 표시
- audio player: `submission.audioUrl`이 있으면 `<audio controls>` 표시

**Step 2 (루브릭 조정) 강화**:
- q4 missionGoals 달성 현황 패널 추가
- AI 환산/원점수 안내 배너
- 합계 행에 AI 원점수 표시 + 환산 참고 표시
- "미션", "상호작용" 조정 이유 추가

**Step 3 (최종 피드백) 강화**:
- "AI 1차 환산 점수 / 100" vs "교수자 확정 점수 / 배점" 구분

**mock 데이터 추가**:
- `sub-019`: beginner-q1-reading / rubric-reading-01 / AI 원점수 10/15 (환산 67)
- `sub-020`: beginner-q2-material-description / rubric-material-desc-01 / AI 17/25 (환산 68)
- `sub-021`: beginner-q3-listening-response / rubric-listening-resp-01 / AI 17/25 (환산 68)
- `sub-022`: beginner-q4-dialogue-mission / rubric-dialogue-mission-01 / AI 23/35 (환산 66)

### 남은 Known Issues

- teacher_reviews RLS 전면 적용 (Supabase 기반 전환 시)
- finalized 결과 학생 공개 화면 (TODO 주석으로 표시)
- dialogueTurns DB 영구 저장 구조 (현재 mock)
- actual Azure TTS 연결
- actual OpenAI/Claude conversation provider 연결
- ETRI/Azure 발음평가 연동
- 모바일 Safari teacher/student 수동 QA

### lint / tsc / build / smoke

- `npm run lint` → 에러 0
- `npx tsc --noEmit` → 에러 0
- `npm run build` → 성공
- `npm run test:smoke` → **126 passed** (기존 102 + 신규 24)

---

## Phase 10-E-4 추가 수정 — dialogue_mission 단발 녹음→제출 UI 비표시

**날짜**: 2026-05-06  
**목표**: q4 dialogue_mission에서 기존 단발 녹음→제출 UI를 숨기고 "대화형 문항 준비 중" 상태로 명확히 표시.

### 수정 파일

| 파일 | 변경 내용 |
|---|---|
| `app/student/speaking/[questionId]/speaking-client.tsx` | `isDialogueMission` 조건 추가 — 4개 phase 카드 비표시, dialogue placeholder 카드 추가, 대화 시간 표시, 녹음 안내 TTS 숨김 |
| `tests/smoke/auth-routes.spec.ts` | 기존 "준비 시작" 검사 3군데 dialogue_mission 분기 수정, 신규 8개 테스트 추가 |
| `docs/spec/WORK_LOG.md` | 이 항목 |
| `docs/spec/PHASE_10E_GAP_ANALYSIS.md` | 10-E-4 추가 수정 처리 결과 반영 |
| `docs/spec/PILOT_RELEASE_PLAN.md` | D+15 상태 + 10-E-4 추가 수정 기록 반영 |

### 변경 내용 요약

- `isDialogueMission = typeId === 'qt-dialogue-mission' || evaluationMode === 'interactive_dialogue'`
- `!isDialogueMission &&` 조건 적용: prep / recording / review / submitting 4개 phase 카드 모두
- dialogue_mission 전용 placeholder 카드: "AI 대화형 평가 준비 중" + disabled "AI 대화 준비 중" 버튼
- 질문 카드에서 dialogue_mission: 준비/답변 시간 표시 숨김, `maxDialogueDurationSec` 표시 추가, "녹음 안내 듣기" TTS 버튼 숨김
- q1/q2/q3 기존 흐름 유지, no-speech/short-audio guard 유지, legacy q-003 route 유지
- aiInformation 비노출 기존 구조 유지

### 10-E-5 Known Issues

- 실제 AI 대화 UI 구현 (턴-by-턴 대화, WebSocket 또는 SSE)
- 대화 로그 저장 (`dialogueTurns` → Supabase)
- missionGoals 달성 여부 평가 로직
- 교수자 최종확정 rubric 강화 (대화 미션 35점 체계)

### lint / tsc / build / smoke

- `npm run lint` → 에러 0
- `npx tsc --noEmit` → 에러 0
- `npm run build` → 빌드 성공 (22 routes)
- `npm run test:smoke` → **89 passed** (기존 81 + 신규 8)

---

## Phase 10-E-4 — 공식 평가세트 asset 구조·listenLimit UI·student-safe rendering

**날짜**: 2026-05-06  
**목표**: 공식 문항의 자료 asset 구조를 정비하고 학습자 화면에서 자료가 실제로 보이도록 개선.

### 수정/신규 파일

| 파일 | 변경 내용 |
|---|---|
| `src/content/assessment-assets.ts` | 신규 — 공식 9개 asset의 metadata registry (student-safe 전용, teacherOnlyNote 격리) |
| `src/components/question-asset-renderer.tsx` | 신규 — assetType별 렌더링 컴포넌트 (image/chart/audio/dialogue_profile) |
| `app/student/speaking/[questionId]/page.tsx` | `getStudentVisibleAsset()` 호출 → `assetMeta` + `listenLimit` 전달, teacher-only 필드 격리 강화 |
| `app/student/speaking/[questionId]/speaking-client.tsx` | `QuestionData`에 `assetMeta`/`listenLimit` 추가, `QuestionAssetRenderer` 통합, old asset notice 대체 |
| `tests/smoke/auth-routes.spec.ts` | Phase 10-E-4 UI smoke 18개 추가 (81 passed) |
| `docs/spec/WORK_LOG.md` | 이 항목 |
| `docs/spec/PHASE_10E_GAP_ANALYSIS.md` | 10-E-4 처리 결과 반영 |
| `docs/spec/PILOT_RELEASE_PLAN.md` | 파일럿 전 실제 asset 교체 항목 명시 |

### asset registry 구조 (`src/content/assessment-assets.ts`)

- 9개 공식 asset 등록:
  - beginner q2: 식당 사진 (image, placeholder)
  - intermediate q2: 수업방식 선호도 (chart, ready — 앱 내부 렌더링)
  - advanced q2: 등록 인원 변화 (chart, ready — 앱 내부 렌더링)
  - beginner/intermediate/advanced q3: 각 음원 (audio, placeholder)
  - beginner/intermediate/advanced q4: dialogue profile (dialogue_profile, ready)
- `getStudentVisibleAsset(questionId)` — teacher-only 필드 완전 제거 후 반환
- `teacherOnlyNote`, `replacementRequiredBeforePilot`은 학습자 화면에 절대 미전달

### 자료 설명 문항 개선

| 문항 | 처리 방식 |
|---|---|
| beginner q2 | 실제 사진 없음 → 깔끔한 🏪 placeholder 카드 (식당 안 모습 + 설명) |
| intermediate q2 | 앱 내부 가로 바 차트 — 대면 50%, 온라인 30%, 혼합형 20% 실제 표시 |
| advanced q2 | 앱 내부 가로 바 차트 — 2024:120명, 2025:180명, 2026:260명 실제 표시 |

### 듣고 답하기 audio asset 구조

- `AudioAssetCard` 컴포넌트:
  - `listenCount` state (0초기값)
  - `listenLimit` (questions.json에서 전달, 기본 2)
  - "들은 횟수: 0 / 2" 표시
  - 음원 없음 → 버튼 disabled + "듣기 음원은 파일럿 전 등록 예정입니다."
  - 음원 있음 → `<audio>` 재생 + 카운트 증가 (limit 도달 시 disabled)
  - 음원 없으면 카운트 증가 절대 불가
- `listeningScriptForTeacherOnly`는 server page에서 client로 미전달 (기존 유지 + 강화)

### dialogue_mission data/화면 유지

- `evaluationMode: "interactive_dialogue"` 유지
- `aiInformation`은 page.tsx에서 client로 미전달 (기존 유지 + 강화)
- `missionGoals`만 학습자 화면에 전달 + 표시
- "AI와 대화하며 미션을 달성하는 문항" 안내 유지
- "실시간 AI 대화 기능은 다음 단계에서 활성화됩니다." 안내 유지
- 10-E-5 준비 상태 유지

### student-safe rendering 강화

- `page.tsx`에서 `assetMeta` 생성 시 `typeId !== 'qt-dialogue-mission'` 조건으로 dialogue_profile 미전달
- `QuestionAssetRenderer`는 teacher-only 필드 일체 불포함
- `scoringNotes`, `teacherNotes`, `listeningScriptForTeacherOnly`, `aiInformation` 모두 서버에서 차단

### no-speech/short-audio guard 유지

- `MIN_VALID_DURATION_SEC=2` 유지
- `MIN_VALID_BLOB_SIZE=3000` 유지
- 짧은 녹음 → 제출 차단, STT 호출 금지 (변경 없음)

### lint / tsc / build / smoke

- `npm run lint` → 에러 0
- `npx tsc --noEmit` → 에러 0
- `npm run build` → 빌드 성공
- `npm run test:smoke` → **81 passed** (기존 63 + 신규 18)

---

## Phase 10-E-3 추가 수정 — 낭독 피드백·404·대화 미션 재정의

**날짜**: 2026-05-06  
**목표**: 수동 확인에서 발견된 4가지 문제 수정. reading 피드백 유형 불일치, 공식 q2/q3 URL 404, dialogue_mission 생성형 AI 대화형 재정의.

### 수정 파일

| 파일 | 변경 내용 |
|---|---|
| `src/content/questions.json` | 공식 문항 ID 정규화: `*-material-desc` → `*-material-description`, `*-listening-resp` → `*-listening-response` (6개). q3 문항에 `listenLimit: 2` 추가. q4 문항에 `evaluationMode: "interactive_dialogue"`, `maxDialogueDurationSec`, `completionCondition`, `expectedStudentActions`, `successCriteria`, `dialogueTurns` 추가. q4 `teacherNotes`에 AI 쌍방 대화형 평가 명시 + TODO 10-E-5 기록. |
| `src/content/question-sets.json` | 3개 공식 세트의 q2/q3 `questionId` 참조를 canonical 긴 ID로 업데이트. |
| `src/providers/llm-eval/index.ts` | `MOCK_MODEL_ANSWERS` 키를 canonical ID로 업데이트. `getMockDetail`에 questionType별 improvements 분기 추가: reading은 발음·억양·끊어읽기·속도 계열 피드백만 허용, material_desc는 자료 설명 중심, listening_resp는 핵심 정보 계열, dialogue_mission은 미션 달성 계열. OpenAI SYSTEM_PROMPT에 낭독 문항 규칙(rule 8) 추가. |
| `app/student/speaking/[questionId]/page.tsx` | `QUESTION_ID_ALIASES` 맵 추가로 구 ID → canonical ID 자동 정규화. `listeningScriptForTeacherOnly`·`aiInformation` 비노출 보장. `missionGoals`, `learnerVisibleElements`, `evaluationMode`, `maxDialogueDurationSec`를 student-facing prop으로 전달. |
| `app/student/speaking/[questionId]/speaking-client.tsx` | `QuestionData` 타입에 `missionGoals`, `evaluationMode`, `maxDialogueDurationSec`, `learnerVisibleElements` 추가. `qt-dialogue-mission` 전용 UI: "AI와 대화하며 미션을 달성하는 문항" 안내 + 미션 목표 목록 표시. `qt-listening-resp` 전용 UI: 학습자 안내 요소 태그 표시. |
| `app/student/speaking/[questionId]/result/page.tsx` | ID 정규화 추가. reading 문항 "모범 표현" → "낭독 포인트" 레이블. dialogue_mission 임시 평가 안내 배너 추가. |
| `app/student/speaking/actions.ts` | `QUESTION_ID_ALIASES` + `resolveId()` 추가로 LLM eval 시 question 조회에 canonical ID 사용. |
| `tests/smoke/api-smoke.spec.ts` | 구 ID → canonical ID 업데이트 (6개). |
| `tests/smoke/auth-routes.spec.ts` | Phase 10-E-3 describe 블록 추가: 12개 공식 URL 접근성 테스트, dialogue_mission 미션 안내 표시, listening_response 학습자 요소 표시. |
| `docs/spec/WORK_LOG.md` | 이 항목 추가 |
| `docs/spec/PHASE_10E_GAP_ANALYSIS.md` | 10-E-3 추가 수정 처리 결과 반영 |
| `docs/spec/PILOT_RELEASE_PLAN.md` | 공식 문항 12개 URL 접근성 확인 항목 추가 |

### 핵심 변경 내용

**reading 피드백 분리**:
- `getMockDetail`에 `questionType`별 improvements 분기 추가
- reading: 발음/억양/끊어읽기/속도/지문 누락 계열만 허용
- "다양한 어휘", "문법 정확도", "내용 추가" 등 reading 부적합 피드백 방지
- OpenAI SYSTEM_PROMPT에 reading 전용 rule 추가

**공식 q2/q3 URL 404 수정**:
- `beginner-q2-material-desc` → `beginner-q2-material-description` (캐노니컬)
- `beginner-q3-listening-resp` → `beginner-q3-listening-response` (캐노니컬)
- 동일하게 intermediate/advanced q2/q3 모두 정규화
- page route에 alias 맵 추가로 구 ID 입력 시 자동 정규화

**dialogue_mission 생성형 AI 대화형 재정의**:
- `evaluationMode: "interactive_dialogue"` 필드 추가
- AI 역할·첫 발화·미션 목표 유지, `aiInformation`은 student 화면 미노출
- 학습자 화면에 "AI와 대화하며 미션 달성" 안내 + 미션 목표 목록 표시
- result 페이지에 "대화형 평가 UI는 다음 단계(10-E-5)에서 활성화됩니다" 안내
- 10-E-5 TODO: AI 대화 UI, dialogueTurns 저장, missionGoals 달성 평가

**교수자 전용 정보 비노출 guard**:
- `listeningScriptForTeacherOnly` → page.tsx에서 절대 전달 안 함
- `aiInformation` → page.tsx에서 절대 전달 안 함
- `learnerVisibleElements`만 학습자 화면에 표시

### 남은 Known Issues (10-E-4 이후)

- 10-E-4: 실제 사진/표/그래프 asset 등록
- 10-E-4: 듣기 음원 mp3/aac 등록 및 listenLimit 실제 적용
- 10-E-5: dialogue_mission AI 쌍방 대화 UI 구현
- 10-E-5: 대화 로그 저장 및 missionGoals 달성 평가
- 10-E-5: 교수자 최종확정 화면 official rubric 기반 강화
- 10-E-6: attempt 단위 1~4번 전체 응시 흐름
- 배포 후 실제 OpenAI LLM 평가 품질 검증
- ETRI 발음평가 연동 후 기준 매핑
- 모바일 Safari 공식 문항 수동 확인

---

## Phase 10-E-3 — 공식 평가 문항 PDF 기반 실제 콘텐츠 입력

**날짜**: 2026-05-05  
**목표**: 3세트 × 4문항 = 12개 정식 평가 문항에 PDF 기반 실제 콘텐츠 입력. 세트 및 문항 ID 체계 정비. 교수자 전용 필드 분리. `requiredElementAliases` 추가. 자산 타입별 학습자 안내 UI 추가.

### ID 변경 사항

| 이전 ID | 새 ID |
|---|---|
| `qs-beginner-01` | `beginner-set-1` |
| `qs-intermediate-01` | `intermediate-set-1` |
| `qs-advanced-01` | `advanced-set-1` |
| `q-b1-1` ~ `q-b1-4` | `beginner-q1-reading` ~ `beginner-q4-dialogue-mission` |
| `q-i1-1` ~ `q-i1-4` | `intermediate-q1-reading` ~ `intermediate-q4-dialogue-mission` |
| `q-a1-1` ~ `q-a1-4` | `advanced-q1-reading` ~ `advanced-q4-dialogue-mission` |

레거시 문항 q-001~q-008 및 세트 qs-diagnostic-01, qs-practice-01, qs-post-01 ID 유지.

### 수정 파일

| 파일 | 변경 내용 |
|---|---|
| `src/content/questions.json` | 정식 문항 12개 전면 재작성. PDF 기반 실제 prompt, guide, requiredElements 입력. `requiredElementAliases` 필드 신설. `qt-listening-resp` 문항에 `listeningScriptForTeacherOnly` + `learnerVisibleElements` 추가. `qt-dialogue-mission` 문항에 `aiRole`, `aiFirstUtterance`, `missionGoals`, `aiInformation` 추가. `qt-material-desc` 문항에 `assetDescription`, `assetPlaceholder` 추가. 세트 ID 및 문항 ID 모두 갱신. 레거시 q-001~q-008 변경 없음. |
| `src/content/question-sets.json` | 3개 정식 세트 ID 갱신 + 각 세트의 questionId 참조 갱신. 레거시 세트 3개 변경 없음. |
| `src/types/providers.ts` | `SpeakingEvalInput`에 `requiredElementAliases?: Record<string, string[]>` 추가 |
| `src/providers/llm-eval/index.ts` | `MOCK_MODEL_ANSWERS`에 12개 정식 문항 모범 답안 추가. `detectRequiredElements` 함수 시그니처에 `aliases?: Record<string, string[]>` 파라미터 추가. aliases 우선, 없으면 elementKeywords 테이블 fallback. `getMockDetail`에서 `input.requiredElementAliases` 전달. |
| `app/student/speaking/[questionId]/speaking-client.tsx` | `QuestionData` 타입에 `assetType?: string` 추가. 자산 유형별 안내 카드 렌더링: audio(🔈), chart/graph(📊), dialogue_profile(💬). |
| `app/student/speaking/[questionId]/page.tsx` | `SpeakingClient`에 `assetType: question.assetType ?? undefined` 전달. |
| `app/student/speaking/actions.ts` | `evaluateSpeakingDetail` 호출에 `requiredElementAliases` 전달. |
| `app/api/evaluate-speaking/route.ts` | `evaluateSpeakingDetail` 호출에 `requiredElementAliases` 전달. |
| `tests/smoke/api-smoke.spec.ts` | Phase 10-E-2 테스트의 문항 ID를 새 ID로 갱신. Phase 10-E-3 describe 블록 신설: 12개 문항 prompt 유효성, requiredElements 배열 반환, aliases 적용 확인 5개 테스트 추가. |
| `tests/smoke/auth-routes.spec.ts` | 정식 세트 첫 문항 URL을 새 ID로 갱신 (`beginner-q1-reading?setId=beginner-set-1`). |
| `docs/spec/WORK_LOG.md` | 이 항목 추가 |
| `docs/spec/PHASE_10E_GAP_ANALYSIS.md` | P1-5 상태 메모 추가 (10-E-3 콘텐츠 입력 완료) |
| `docs/spec/PILOT_RELEASE_PLAN.md` | D+15 섹션에 정식 콘텐츠 입력 완료 기록 |

### 핵심 변경 내용

**PDF 기반 실제 콘텐츠 입력**:
- 초급 세트: 낭독(병원 방문 지문), 사진 설명(식당 장면), 듣고 답하기(한국어 수업 안내), 카페 주문 대화
- 중급 세트: 도서관 운영 시간 안내문 낭독, 수업 방식 선호도 차트 설명, 발표 수업 일정 변경 듣기, 행정실 문의 대화
- 고급 세트: 외국어 교육 설명문 낭독, 한국어 프로그램 등록 인원 그래프, 혼합형 수업 분석 듣기, 공동 행사 협의 대화

**교수자 전용 필드 분리** (클라이언트에 절대 노출 금지):
- `listeningScriptForTeacherOnly`: 듣고 답하기 문항의 원본 청취 스크립트
- `aiInformation`: 대화 미션 문항의 AI 역할 내부 정보
- 학습자에게는 `learnerVisibleElements`(듣고 답하기) 또는 prompt/guide만 표시

**requiredElementAliases**:
- 각 필수 포함 요소에 대해 한국어 표현 변형을 aliases로 등록
- mock detectRequiredElements가 aliases를 우선 활용 → 더 자연스러운 표현으로 작성해도 요소 감지 가능
- e.g. "원하는 음료를 말함" → aliases: ["아메리카노", "라떼", "주스", "주세요"]

**자산 타입별 학습자 안내**:
- audio: "🔈 듣기 음원은 파일럿 전 등록 예정"
- chart/graph: "📊 자료(그래프/표)는 파일럿 전 등록 예정"
- dialogue_profile: "💬 AI 대화 기능은 다음 단계에서 활성화됩니다"

### 잔여 작업 (10-E-4 이후)

- 실제 음원 파일 등록 (beginner-korean-class-announcement-audio 등 3개)
- 실제 사진/차트 이미지 등록 (식당 사진, 선호도 차트, 등록 인원 그래프 등)
- listeningScriptForTeacherOnly 기반 TTS 자동 생성 또는 수동 녹음 연결

---

## Phase 10-E-2 — 정식 문항 유형 체계 및 평가세트 구조 정비

**날짜**: 2026-05-05  
**목표**: 4유형 문항 체계(낭독/자료설명/듣고답하기/대화미션) 정의, 초급/중급/고급 정식 평가세트 12문항 구성, 유형별 루브릭 연결.

### 수정 파일

| 파일 | 변경 내용 |
|---|---|
| `src/content/question-types.json` | 4개 정식 유형 추가: `qt-reading`(낭독, 15점), `qt-material-desc`(자료설명, 25점), `qt-listening-resp`(듣고답하기, 25점), `qt-dialogue-mission`(대화미션, 35점). 기존 4개 유형 `isLegacy: true`로 demote |
| `src/content/question-sets.json` | 정식 세트 3개 신설: `qs-beginner-01`(초급), `qs-intermediate-01`(중급), `qs-advanced-01`(고급). 기존 세트 3개 `isActive: false`, `purpose: 'dev'`, `isLegacy: true`로 demote |
| `src/content/questions.json` | 정식 문항 12개 신설(q-b1-1~4, q-i1-1~4, q-a1-1~4). 기존 q-001~q-008 `isActive` 유지(URL 직접 접근 가능), `isLegacy: true` 표기. 전체 문항에 `setId`, `level`, `questionNo`, `guide`, `maxScore`, `rubricId`, `isOfficial`, `assetType`, `assetUrl`, `modelAnswer`, `teacherNotes`, `requiredElements` 필드 추가 |
| `src/content/rubrics.json` | 유형별 루브릭 4개 신설: `rubric-reading-01`(15점), `rubric-material-desc-01`(25점), `rubric-listening-resp-01`(25점), `rubric-dialogue-mission-01`(35점). 기존 `rubric-speaking-01`은 `isLegacy: true`로 유지 |
| `src/providers/llm-eval/index.ts` | `MOCK_MODEL_ANSWERS_BY_TYPE`에 4개 정식 유형 모범 답안 추가. `elementKeywords`에 신규 문항 required element 키워드 30여 개 추가 |
| `app/student/speaking/page.tsx` | `purposeLabel`에 `'official': '정식 평가'` 추가. `purposeVariant`에 `'official': 'success'` 추가. `level` 필드 기반 "초급 평가세트" / "중급 평가세트" / "고급 평가세트" 섹션 레이블 표시 |
| `app/student/speaking/actions.ts` | `rubricId` 해결을 `question?.rubricId ?? 'rubric-speaking-01'`로 변경 (문항별 고유 루브릭 지원) |
| `app/api/evaluate-speaking/route.ts` | `questionsJson` import 추가. `questionId`로 문항 메타데이터 조회 후 `questionType`, `requiredElements`, `rubricId`를 `evaluateSpeakingDetail`에 전달 (API 직접 호출 시에도 올바른 평가 컨텍스트 적용) |
| `tests/smoke/auth-routes.spec.ts` | 5개 테스트 추가: 정식 세트 3개 표시 / 12개 이상 시작하기 링크 / 4개 유형 레이블 / q-b1-1 낭독 페이지 접근 / legacy q-001·q-003 route 정상 동작 |
| `tests/smoke/api-smoke.spec.ts` | 4개 테스트 추가: 4개 정식 유형(qt-reading, qt-material-desc, qt-dialogue-mission, qt-listening-resp) API 평가 응답 검증 |
| `docs/spec/WORK_LOG.md` | 이 항목 추가 |
| `docs/spec/PHASE_10E_GAP_ANALYSIS.md` | 10-E-2 처리 결과 반영 |
| `docs/spec/PILOT_RELEASE_PLAN.md` | 정식 평가세트 전환 기록 |

### 핵심 변경 내용

**4유형 문항 체계 정식화**:
- 낭독(qt-reading): 텍스트 제공, 정확히 읽기, 15점
- 자료 설명(qt-material-desc): 사진/그래프/표 보고 설명, 25점
- 듣고 답하기(qt-listening-resp): 음원 청취 후 답변, 25점
- 대화에서 미션 달성하기(qt-dialogue-mission): 롤플레이, 미션 달성형, 35점
- 4문항 합산 = 100점

**초급/중급/고급 세트 구조**:
- 초급(qs-beginner-01): q-b1-1(낭독) → q-b1-2(자료설명) → q-b1-3(듣고답하기) → q-b1-4(대화미션)
- 중급(qs-intermediate-01): q-i1-1 ~ q-i1-4 (동일 유형 순서)
- 고급(qs-advanced-01): q-a1-1 ~ q-a1-4 (동일 유형 순서)

**Legacy 문항 유지**:
- q-001~q-008 개별 URL 접근 정상 동작
- `/student/speaking/q-001` 등 기존 경로 유지
- 학습자 목록 화면에는 정식 세트(isActive: true)만 표시

**API 컨텍스트 개선**:
- `/api/evaluate-speaking` 직접 호출 시 questionId → question 조회 → `questionType`, `requiredElements`, `rubricId` 자동 해결
- 기존에는 `requiredElements: []` 빈 배열로 평가 → 이제 올바른 문항 메타 전달

### 버그 수정

`/api/evaluate-speaking` route에서 `questionId`를 받았으나 `questionsJson`을 조회하지 않아 `requiredElements`, `questionType`이 항상 빈 값으로 평가되는 문제 수정. 이로 인해 `required_elements_found.length` 검증 테스트(q-b1-4)가 실패하던 문제 해결.

### 테스트 결과

`44 passed (24.4s)` — 기존 35개 + 신규 9개 전부 통과

### 남은 Known Issues (10-E-3 이후)

- q-003 실제 사진 미교체 (placeholder SVG 유지) — 10-E-4
- 듣고 답하기 음원 asset 없음 (현재 텍스트 스크립트만) — 10-E-4
- 대화 미션 실제 롤플레이 연동 (현재 일반 speaking 평가로 처리) — 10-E-5
- 교수자 최종확정 화면 required_elements/evidence 미반영 — 10-E-5
- 정식 문항 콘텐츠 교수자 검수 필요 — 10-E-3

---

## Phase 10-E-1 — 평가 루브릭·모범표현·결과화면 긴급 개선

**날짜**: 2026-05-05  
**목표**: P0 이슈 6개 해결. 결과 화면을 파일럿 납득 수준으로 끌어올림.

### 수정 파일

| 파일 | 변경 내용 |
|---|---|
| `src/types/providers.ts` | `SpeakingEvalInput`에 `questionId`, `questionType`, `requiredElements` 추가. `SpeakingEvalDetail`에 `required_elements_found`, `missing_elements`, `evidence`, `needs_teacher_review`, `grade` 추가 |
| `src/content/questions.json` | 모든 문항(q-001~q-008)에 `requiredElements` 배열 추가. q-003 `imageLicenseNote` 내부 메모 제거(학습자 노출 방지) |
| `src/providers/llm-eval/index.ts` | `getMockDetail(input)` 시그니처 변경. `MOCK_MODEL_ANSWERS`(문항별 고정 모범표현) 추가. `detectRequiredElements`(키워드 기반), `extractMockEvidence`, `isLikelyOffTask`, `scoreToGrade` 헬퍼 추가. `corrected_answer: transcript` 복사 제거. SYSTEM_PROMPT 전면 개선(corrected_answer 독립 생성 강제, 무관 발화 감점 지시, required_elements/evidence/grade 스키마 추가). `callOpenAI` 파싱에 신규 필드 추가. user 프롬프트에 `[필수 포함 요소]` 주입 |
| `app/student/speaking/actions.ts` | `evaluateSpeakingDetail`에 `questionId`, `questionType`, `requiredElements` 전달 |
| `app/student/speaking/[questionId]/result/page.tsx` | `gradeVariant` 헬퍼 추가. 총점 카드에 `grade` 배지 추가. AI 피드백 카드에 "포함한 요소(✓)" / "빠진 요소(✗)" / "평가 근거(인용)" 섹션 추가. 발음 참고 단어 `<details>` 영역에서 ScoreBar 제거 → chip 텍스트 목록으로 교체. "채점 기준 아닌 참고용" 안내 추가 |
| `app/student/speaking/[questionId]/speaking-client.tsx` | `imageLicenseNote` 학습자 화면 렌더링 제거 |
| `tests/smoke/api-smoke.spec.ts` | 4개 테스트 추가: corrected_answer transcript 복사 금지 / required_elements_found·missing_elements 필드 확인 / 과제 무관 발화 낮은 task_completion_score + needs_teacher_review / grade 필드 확인 |
| `docs/spec/WORK_LOG.md` | 이 항목 추가 |
| `docs/spec/PILOT_RELEASE_PLAN.md` | P0 처리 완료 항목 업데이트 |

### 핵심 변경 내용

**모범표현 복사 방지**:
- `getMockDetail` 내 `corrected_answer: transcript` 제거
- 문항별 고정 `MOCK_MODEL_ANSWERS` 맵 사용 (transcript와 완전히 독립)
- SYSTEM_PROMPT에 "corrected_answer는 transcript 복사 절대 금지" 명시

**과제 무관 발화 처리**:
- `isLikelyOffTask`: 뉴스/앵커 패턴 검출, requiredElements가 2개 이상인데 하나도 매칭 안 되면 off-task 판정
- off-task 시 `task_completion_score: 8`, `needs_teacher_review: true`
- SYSTEM_PROMPT: 무관 발화 시 task_completion_score ≤ 10 지시

**required_elements / missing_elements / evidence**:
- 8개 문항 전체 `requiredElements` 데이터 추가
- `detectRequiredElements`: 한국어 키워드 기반 매칭
- `extractMockEvidence`: transcript에서 단문 발췌
- 결과 화면에서 ✓/✗ 목록과 인용 근거로 표시

**발음 참고 단어 UI**:
- `<details>` 내 ScoreBar 완전 제거
- "단어(점수)" 형태의 chip으로 교체
- "채점 기준 아닌 참고용" 안내 텍스트 추가

### 방어 로직 유지 확인

- `MIN_VALID_DURATION_SEC=2`, `MIN_VALID_BLOB_SIZE=3000` 차단 로직 유지
- `no-speech` guard → LLM eval 스킵, ai_evaluations 생성 안 함 유지
- STT fallback `transcript: ''` 유지

### 테스트 결과

`35 passed (22.5s)` — 기존 31개 + 신규 4개 전부 통과

### 남은 Known Issues (P1/P2)

- 4유형 문항 체계 미정비 (낭독/자료설명/듣고답하기/대화미션) — 10-E-2
- 문항별 배점 15/25/25/35 미반영 — 10-E-2
- 초급/중급/고급 평가세트 미구조화 — 10-E-3
- q-003 실제 사진 미교체 (placeholder SVG 유지) — 10-E-4
- 듣기 음원 asset 없음 — 10-E-4
- 교수자 최종확정 화면 required_elements 미반영 — 10-E-5
- OpenAI 실제 호출 시 모범표현 품질 검증 필요
- ETRI 발음평가 연동 후 기준 매핑 필요

---

## Phase 10-E-0 — 전면 갭 분석 (평가 설계 정렬)

**날짜**: 2026-05-05  
**목표**: 첨부 통합문서의 평가 설계 강점과 현재 구현의 기술 구조를 절충하여 전면 갭 분석 수행. 코드 수정 없음.

### 산출물

| 파일 | 변경 내용 |
|---|---|
| `docs/spec/PHASE_10E_GAP_ANALYSIS.md` | 신규 작성 — 전면 갭 분석, P0/P1/P2 분류, 10-E-1 프롬프트 초안 |
| `docs/spec/WORK_LOG.md` | 이 항목 추가 |
| `docs/spec/PILOT_RELEASE_PLAN.md` | 분석 진행 중 항목 추가 |

### 주요 발견 사항

**P0 (즉시 수정)**:
- `corrected_answer: transcript` — mock 모범표현이 발화 복사 (`llm-eval/index.ts:138`)
- `required_elements_found` / `missing_elements` / `evidence` 필드 없음 (types + llm-eval + result page)
- 과제 무관 발화 처리 SYSTEM_PROMPT 미대응
- 발음 참고 단어 ScoreBar UI가 채점 기준처럼 오인 가능
- q-003 placeholder SVG 미교체

**P1 (파일럿 전)**:
- 4유형 체계 미정비 (낭독/자료설명/듣고답하기/대화미션)
- 문항별 배점 15/25/25/35 미반영
- 초급/중급/고급 평가세트 미구조화
- 교수자 확정 화면에 required_elements/evidence 없음
- T1~T8 테스트 자동화 불완전

**P2 (운영 안정화 후)**:
- attempt 단위 DB 구조, RLS 전면, signed URL, 파일럿 통계

### 유지 확인 (후퇴 금지)

- `MIN_VALID_DURATION_SEC=2`, `MIN_VALID_BLOB_SIZE=3000` 차단 로직
- no-speech guard (ai_evaluations 생성 방지)
- STT `transcript: ''` fallback (환각 방지)
- provider_events, mock store, Supabase 분기, smoke test 구조

### 다음 단계

10-E-1: 평가 루브릭·모범표현·결과화면 긴급 개선 (P0 전체)  
상세 구현 프롬프트: `docs/spec/PHASE_10E_GAP_ANALYSIS.md` 섹션 6 참조

---

## Phase 10-D (추가 3차 재작업) — 무음/초단기 녹음 제출 차단

**날짜**: 2026-05-05  
**목표**: 짧은 녹음이 경고만 표시되고 제출로 이어지는 버그 수정. 제출 자체를 차단하고, 서버에서도 방어.

### 수정 파일

| 파일 | 변경 내용 |
|---|---|
| `app/student/speaking/[questionId]/speaking-client.tsx` | `MIN_VALID_BLOB_SIZE=3000` 추가. `blobSize` 상태로 blob 크기 반응형 추적. `isInvalidAudio` 계산(duration<2 또는 blob<3000). 제출 버튼 `disabled={isInvalidAudio}`. `handleSubmit` 내 방어 guard 추가. 경고 메시지 "녹음 시간이 너무 짧습니다. 다시 녹음해 주세요."로 통일 |
| `app/api/stt/route.ts` | `MOCK_TRANSCRIPT` 상수 제거. STT 제공자 오류 시 fallback을 `transcript: ''`로 변경(임의 mock 문장 생성 금지) |
| `app/student/speaking/actions.ts` | `isNoSpeech` guard 추가. `providerName==='no-speech'` 또는 빈 transcript이면 LLM eval/pronunciation eval 건너뜀. mock store에만 최소 레코드 저장, Supabase `ai_evaluations` 생성 금지 |
| `app/student/speaking/[questionId]/result/page.tsx` | `isNoSpeech` 감지 후 전용 뷰 렌더링. "음성이 감지되지 않았습니다. 다시 녹음해 주세요." 표시. 총점/AI피드백/발음평가 카드 비표시 |
| `tests/smoke/mobile-speaking.spec.ts` | `TinyRecorder` mock으로 짧은 녹음 시뮬레이션 후 제출 버튼 disabled + 경고 메시지 확인 테스트 추가 |
| `tests/smoke/api-smoke.spec.ts` | STT error-fallback이 빈 transcript 반환하는지 확인 테스트 추가 |
| `docs/spec/WORK_LOG.md` | 이 항목 추가 |
| `docs/spec/PILOT_RELEASE_PLAN.md` | "무음/초단기 녹음 제출 차단" 항목 추가 |

### 제출 차단 로직

**클라이언트 (review 단계)**:
- `isInvalidAudio = recorder.state==='stopped' && (durationSec < 2 OR blob.size < 3000)`
- 조건 충족 시 제출 버튼 `disabled` → 클릭 불가
- `handleSubmit` 내에도 동일 검사(방어 중첩)

**서버 (submitSpeaking)**:
- `sttResult.providerName === 'no-speech'` 또는 `transcript.trim() === ''` 시 LLM/발음 평가 건너뜀
- `ai_evaluations` Supabase 저장 없음

**결과 화면**:
- `isNoSpeech` 감지 시 전용 뷰(메시지 + "다시 도전하기" 버튼만) 렌더링

---

## Phase 10-D (추가 2차) — q-003 이미지 구조 개선 + 무음/짧은 녹음 STT 방어

**날짜**: 2026-05-05  
**목표**: 파일럿 품질 이슈 2건 수정. q-003 이미지 메타 구조화 및 무음 STT 환각 방지.

### 생성/수정 파일

| 파일 | 변경 내용 |
|---|---|
| `src/types/providers.ts` | `ProviderName`에 `'no-speech'` 추가 |
| `app/api/stt/route.ts` | `MIN_AUDIO_SIZE_BYTES=3000` 방어. 빈/짧은 오디오는 STT 제공자 호출 없이 `no-speech` 응답 반환 + `provider_events` 기록 |
| `app/student/speaking/actions.ts` | `sttProviderName === 'no-speech'` 시 `confidence: 0` 설정 |
| `app/student/speaking/[questionId]/speaking-client.tsx` | `QuestionData`에 `imageAlt/Caption/LicenseNote` 필드 추가. 이미지 아래 캡션·라이선스 노트 표시. `MIN_VALID_DURATION_SEC=2` 상수. review 단계에서 짧은 녹음 경고 배너 (`data-testid="short-recording-warning"`) |
| `app/student/speaking/[questionId]/page.tsx` | 새 image 필드들 SpeakingClient에 전달 |
| `app/student/speaking/[questionId]/result/page.tsx` | STT 결과 카드에 무음 경고(`no-speech` 시) 및 mock fallback 안내 추가. 빈 transcript 처리 |
| `src/content/questions.json` | 모든 문항에 `imageAlt`, `imageCaption`, `imageLicenseNote` 필드 추가. q-003에 의미 있는 값 설정 |
| `public/images/q-003-placeholder.svg` | SVG 전면 개선. 그라디언트·그림자·PLACEHOLDER 스탬프 추가. 이전보다 더 정돈된 일러스트 |
| `tests/smoke/api-smoke.spec.ts` | `/api/stt` 무음 방어 테스트 3개 추가 (0 bytes, 1000 bytes, audio 없음) |
| `docs/spec/WORK_LOG.md` | 이 항목 추가 |
| `docs/spec/PILOT_RELEASE_PLAN.md` | 이미지 소스 원칙 섹션 추가 |

### 이미지 소스 원칙 (파일럿 전 적용 필요)

**권장 소스:**
- 기관/교수자 직접 촬영 사진
- Pexels / Unsplash CC0 라이선스 이미지
- Wikimedia Commons 적합 라이선스 이미지
- 직접 제작 일러스트

**금지:**
- Getty Images 무단 사용 (royalty-free ≠ 무료/저작권 없음)
- Google 이미지 검색 결과 무단 사용
- 출처 불명 이미지 삽입

**q-003 파일 교체 절차:**
1. 적합 라이선스 이미지 확보 (권장 파일명: `public/images/q-003-park-exercise.jpg`)
2. `questions.json`의 `q-003.imageUrl`을 `/images/q-003-park-exercise.jpg`로 변경
3. `imageAlt`, `imageCaption`, `imageLicenseNote` 실제 정보로 업데이트
4. 코드 변경 없이 데이터 경로 변경만으로 교체 완료

### STT 무음/짧은 녹음 방어 로직

**API 레벨 (`/api/stt`)**:
- `blob.size < 3000 bytes` → STT 제공자 호출 없이 `{ transcript: '', providerName: 'no-speech', warning: 'audio_too_short' }` 반환
- `provider_events`에 `errorCode: 'audio_too_short'` 기록
- Whisper 등 실제 STT가 빈 오디오에서 그럴듯한 문장을 생성하는 환각 방지

**클라이언트 레벨 (review 단계)**:
- `recorder.durationSec < 2` 이면 amber 경고 배너 표시
- "녹음이 너무 짧습니다 (N초). 최소 2초 이상 말씀해 주세요."

**결과 화면**:
- `sttResult.providerName === 'no-speech'` → "음성이 감지되지 않았습니다" 경고
- `sttResult.providerName === 'mock'` → "테스트용 텍스트로 평가됨" 안내

### 남은 Known Issues (이 수정 이후)

- q-003 placeholder SVG를 파일럿 전 실제 사진으로 교체 필요 (교체 절차 문서화 완료)
- 짧은 녹음 UI 경고는 표시하나 제출을 차단하지는 않음 (사용자 선택에 맡김)
- Whisper가 충분한 크기지만 무음인 파일(패딩 포함 등)에는 서버측 크기 체크가 충분하지 않을 수 있음

---

## Phase 10-D (추가) — 발음평가 라벨 오류 수정 + q-003 이미지 표시

**날짜**: 2026-05-05  
**목표**: 커밋 전 발견된 품질 이슈 2개 수정.

### 생성/수정 파일

| 파일 | 변경 내용 |
|---|---|
| `app/student/speaking/[questionId]/result/page.tsx` | `normalizePronunciationDisplay` 헬퍼 추가. 발음 평가 세부 막대 라벨을 단어 → 평가 기준 5개(발음 정확도/유창성/억양강세/속도리듬/명료도)로 교체. 단어별 점수는 `<details>` 접기 영역("발음 참고 단어")으로 분리 |
| `app/student/speaking/[questionId]/speaking-client.tsx` | `QuestionData` 타입에 `typeId`, `imageUrl` 추가. 문항 카드에 이미지 영역 렌더링(`qt-picture` 타입에만). `imageUrl` 있으면 `next/image`로 표시, 없으면 미등록 안내 |
| `app/student/speaking/[questionId]/page.tsx` | SpeakingClient에 `typeId`, `imageUrl` 전달 |
| `src/content/questions.json` | 모든 문항에 `imageUrl` 필드 추가. q-003: `/images/q-003-placeholder.svg`, 나머지: `""` |
| `public/images/q-003-placeholder.svg` | 공원 운동 장면 SVG 임시 일러스트 생성 (파일럿 전 실제 사진으로 교체 필요) |
| `tests/smoke/auth-routes.spec.ts` | q-003 이미지/미등록 안내 표시 테스트 추가 |
| `tests/smoke/mobile-speaking.spec.ts` | q-003 모바일 360px 이미지 영역 테스트 추가 |
| `docs/spec/WORK_LOG.md` | 이 항목 추가 |
| `docs/spec/PILOT_RELEASE_PLAN.md` | Known Issues 갱신 |

### 주요 결정사항

**발음 평가 라벨 오류**: `pronunciationResult.wordScores[].word`가 문항 텍스트의 단어 그대로 라벨에 표시되던 버그. ETRI mock이 단어별 점수만 제공하므로, `normalizePronunciationDisplay` 헬퍼로 정규화. 평가 기준 라벨 고정, 단어별 raw 데이터는 접기 섹션으로 분리.

**q-003 이미지**: `questions.json`에 `imageUrl` 필드 추가. q-003에만 `/images/q-003-placeholder.svg` 경로 설정. SVG placeholder는 공원 운동 장면 일러스트. `next/image`로 렌더링(16:9 aspect-ratio 컨테이너). 이미지 없는 picture-type 문항은 "그림 자료가 아직 등록되지 않았습니다." 안내 표시.

### 남은 Known Issues (이 수정 이후)

- q-003 placeholder SVG를 파일럿 전 실제 사진/그림으로 교체 필요
- q-004 등 다른 picture-type 문항도 실제 이미지 등록 필요
- ETRI 연동 시 `normalizePronunciationDisplay` 헬퍼에 criterion-level 데이터 직접 매핑 필요

---

## Phase 10-D — 배포 후 품질 수정 1차

**날짜**: 2026-05-05  
**목표**: 배포된 MVP를 실제 파일럿 사용자가 보기 좋고 이해하기 쉽게 다듬는다. 역할 배지 오표시 수정, TTS 버튼 UI 개선, RTL 기반 적용, 다문항 흐름 보완.

### 생성/수정 파일

| 파일 | 변경 내용 |
|---|---|
| `app/teacher/layout.tsx` | `role="teacher"` 하드코딩 제거 → DB에서 실제 role 조회 후 AppShell에 전달. admin 계정에서 "관리자" 배지 정상 표시 |
| `app/student/speaking/[questionId]/speaking-client.tsx` | TTS 버튼 `variant="ghost"` → `variant="secondary"` 변경 (테두리·배경색 추가, 시인성 개선) |
| `src/components/ui/lang-hint.tsx` | RTL 언어 감지 헬퍼(`getTextDir`) 추가. AR/FA/HE/UR 코드에 `dir="rtl"`, `unicodeBidi: 'plaintext'`, `textAlign: 'start'` 적용 |
| `app/student/speaking/[questionId]/result/page.tsx` | 다음 문항 계산 로직 추가. "다음 문항으로 →" 버튼 추가 (세트 내 마지막 문항이면 "문항 목록으로") |
| `tests/smoke/auth-routes.spec.ts` | q-002 직접 접근, 문항 목록 표시, TTS 버튼 렌더링, 아랍어 RTL crash 없음 테스트 4개 추가 |
| `tests/smoke/mobile-speaking.spec.ts` | TTS 버튼 exact match → regex로 변경 (버튼 텍스트 변경 대응) |

### 주요 결정사항

**role 배지 버그 원인**: `teacher/layout.tsx`가 `role="teacher"` 하드코딩. admin이 `/teacher` 접근 시 "교수자"로 오표시됨. DB에서 `display_name, role` 함께 조회해 실제 role 사용.

**TTS 버튼 ghost → secondary**: `ghost` variant는 `border-transparent`라 배경과 구분 없음. `secondary` variant(border-slate-300, bg-white)로 변경해 시각적 구분 추가.

**RTL 처리 범위**: `lang-hint.tsx`에서만 다국어 텍스트를 렌더링함. AR/FA/HE/UR 언어 코드 감지 시 `dir="rtl"` + CSS 적용. LTR 텍스트는 영향 없음.

**다음 문항 버튼 로직**: `evalRecord.questionSetId`로 세트를 찾고, 세트 내 `order` 기준으로 정렬 후 현재 문항 위치를 계산. 다음 문항이 있으면 "다음 문항으로 →", 없으면 "문항 목록으로" 표시.

### 검증 결과

- `npm run lint` → ✅
- `npx tsc --noEmit` → ✅
- `npm run build` → ✅ (18 routes, Proxy 정상)
- `npm run test:smoke` → ✅ 25 passed

### 남은 Known Issues (Phase 10-D 이후)

1. 교수자/관리자 전체 기능 시나리오 추가 검증 필요
2. 문항 콘텐츠 전면 정비 필요 (현재 q-001~q-008 mock 콘텐츠)
3. 아랍어/다국어 문장 검수 필요 (번역 품질)
4. 실제 iPhone Safari 녹음/재생 수동 테스트 미완
5. ETRI 실제 발음평가 연동 테스트 미완
6. LLM 실제 success 전환 및 평가 품질 검증 미완
7. RLS 전면 적용 미완
8. recordings signed URL 전환 미완

---

## Phase 10-C — 배포 1차 검증 결과 문서화

**날짜**: 2026-05-05  
**목표**: Vercel 배포 후 실제 접속·로그인·제출 흐름을 수동으로 확인하고, 확인된 사항과 남은 이슈를 정확하게 기록한다.

### 생성/수정 파일

| 파일 | 변경 내용 |
|---|---|
| `docs/spec/PILOT_RELEASE_PLAN.md` | Phase 10-C 절 추가 — 배포 1차 검증 결과, Known Issues 목록 |
| `docs/spec/WORK_LOG.md` | Phase 10-C 기록 |

### 배포 1차 검증 결과 요약

| 항목 | 결과 |
|---|---|
| Vercel 배포 성공 | ✅ |
| 배포 URL 접속 | ✅ |
| Supabase Auth Redirect URL 설정 | ✅ |
| student 계정 로그인 | ✅ |
| 말하기 제출 일부 성공 | ✅ |
| `speaking_submissions` 저장 | ✅ |
| `audio_url` 저장 | ✅ |
| `provider_events` (stt/pronunciation/llm-eval/tts) 기록 | ✅ |
| `ai_evaluations.scores` 저장 | ✅ |
| `ai_evaluations.pronunciation_result` 저장 | ✅ |

### 운영 전 보완 필요 이슈 (Phase 10-D 이후)

1. 다문항 평가 흐름·문항 이동·문항 수정
2. 교수자 전체 기능 검증 미완
3. 관리자 전체 기능 검증 미완
4. 관리자 계정 role 배지 "교수자" 오표시 버그
5. RTL 언어(아랍어 등) 문장부호·방향 처리 미적용
6. 음성 관련 버튼(문제 듣기·녹음 안내 듣기·재생/정지) UI 시인성 부족
7. 실제 iPhone Safari 녹음/재생 수동 테스트 미완
8. ETRI 발음평가 실제 연동 테스트 미완
9. LLM 평가 실제 success 전환 및 품질 검증 미완
10. RLS 전면 적용 미완 (Auth 기반 제출 전환 후)
11. recordings signed URL 전환 미완

### 현재 상태 평가

**배포 1차 성공, 핵심 저장 흐름 확인 완료. 운영 전 UI·역할·문항·다국어 품질 보완 필요.**

---

## Phase 10-A — Vercel 배포 준비 및 운영 환경 점검

**날짜**: 2026-05-05  
**목표**: 코드 수정 없이 Vercel 배포 가능 여부를 점검하고, 환경변수·Supabase·Auth redirect 설정 절차를 문서화한다.

### 생성/수정 파일

| 파일 | 변경 내용 |
|---|---|
| `.env.local.example` | `CONVERSATION_PROVIDER=mock` 추가 (누락분 보완). `SMOKE_TEST_MODE=` 주석 + 운영 환경 사용 금지 경고 추가 |
| `docs/spec/PILOT_RELEASE_PLAN.md` | 환경변수 체크리스트 수정(SUPABASE_SERVICE_ROLE_KEY·ANTHROPIC_API_KEY 오기입 제거, CONVERSATION_PROVIDER·SMOKE_TEST_MODE 추가). 성공 기준 "로그인 없이" → "/login으로 로그인" 정정. Phase 10-A 절(Vercel 배포 체크리스트, Supabase 배포 전 확인사항, Auth redirect URL 설정, recordings 버킷 절차) 신규 추가 |
| `docs/spec/WORK_LOG.md` | Phase 10-A 기록 |

### 주요 결정사항

**코드 수정 없음**: 런타임 호환성 검토 결과 Node.js 전용 API(Buffer)를 사용하는 API route들은 이미 Node.js runtime이므로 `export const runtime = 'edge'` 선언 불필요. 기존 코드 그대로 Vercel 배포 가능.

**SUPABASE_SERVICE_ROLE_KEY 오기입 수정**: 코드 전체를 grep한 결과 service role key를 사용하는 코드가 없음을 확인. 환경변수 체크리스트에서 제거.

**ANTHROPIC_API_KEY 오기입 수정**: 코드 전체를 grep한 결과 ANTHROPIC_API_KEY를 사용하는 코드가 없음을 확인. 환경변수 체크리스트에서 제거.

### Vercel 배포 시 필요한 환경변수

| 변수 | Vercel 필요 여부 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ 필수 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ 필수 |
| `REPOSITORY_PROVIDER` | `supabase` 설정 필요 |
| `STT_PROVIDER` | `openai` 또는 `mock` |
| `TTS_PROVIDER` | `openai` 또는 `mock` |
| `PRONUNCIATION_PROVIDER` | `etri` 또는 `mock` |
| `LLM_EVAL_PROVIDER` | `openai` 또는 `mock` |
| `CONVERSATION_PROVIDER` | `mock` (현재 mock만 지원) |
| `OPENAI_API_KEY` | STT/TTS/LLM_EVAL=openai 시 필수 |
| `ETRI_API_KEY` | PRONUNCIATION_PROVIDER=etri 시 필수 |
| `ETRI_API_BASE_URL` | PRONUNCIATION_PROVIDER=etri 시 필수 |
| `SMOKE_TEST_MODE` | **절대 설정 금지** |

### Known Issues (Phase 10 이후)

- Supabase RLS 전면 적용 (Auth 기반 제출 전환 후)
- recordings 버킷 signed URL 전환 (보안 강화)
- display_name 수정 UI

---

## Phase 9-C — Phase 9 최종 안정화

**날짜**: 2026-05-05  
**목표**: Phase 9 전체를 파일럿 운영 가능한 수준으로 마무리한다. role 분기 보완, RLS 최종 판단, 운영 절차 완전 문서화.

### 생성/수정 파일

| 파일 | 변경 내용 |
|---|---|
| `proxy.ts` | `/student` route에도 user_profiles 존재 확인 추가. 모든 protected route를 단일 DB 쿼리로 통합 처리 |
| `tests/smoke/auth-routes.spec.ts` | `/student` nav 항목(말하기 평가·미션 대화·말하기 대회 준비) 표시 확인 test 추가 |
| `docs/spec/PILOT_RELEASE_PLAN.md` | Phase 9-C 완료 항목, Phase 9 최종 상태 요약, 계정 생성 절차, 수동 테스트 체크리스트, RLS 판단표, 운영 전 필수 확인 사항 추가. Known Issues 표 갱신 |
| `docs/spec/WORK_LOG.md` | Phase 9-C 기록 |

### 주요 결정사항

**proxy.ts 통합 이유**:
- 기존 코드: /student는 user 존재만 확인, /teacher·/admin만 user_profiles 조회
- 변경: 모든 protected route에서 user_profiles 확인 → 역할 없는 인증 사용자도 /role-missing 처리
- DB 쿼리 횟수 동일(최악의 경우 1회 감소) + 정책 일관성 향상

**RLS 보류 최종 근거**:
현재 server action들은 anon key로 `speaking_submissions` 등에 INSERT함. RLS를 활성화하면 INSERT가 실패함. Phase 10에서 Auth 세션을 server action에 전달하는 방식으로 repository를 전환한 후 RLS를 함께 적용할 계획.

### Phase 9 전체 완료 기준

- `/login` 화면 ✓
- role 기반 route 분기 (proxy.ts) ✓
- `/role-missing` 안내 ✓
- student/teacher/admin 역할 redirect ✓
- Topbar 로그아웃 ✓
- user_profiles 테이블 + own profile read RLS ✓
- 계정/역할 운영 절차 문서화 ✓
- smoke test 유지 (20 passed) ✓

### Known Issues (Phase 10 예정)

- RLS 전면 적용 (Auth 기반 제출 전환 후)
- admin 전용 route 분리
- display_name 수정 UI (SECURITY DEFINER 함수)
- recordings signed URL 전환

---

## Phase 9-B — 계정/역할 운영 안정화 및 RLS/권한 구조 정리

**날짜**: 2026-05-05  
**목표**: Phase 9-A Auth/Role 구조를 파일럿 운영에 쓸 수 있게 안정화한다. RLS 정책을 안전하게 문서화하고 일부 적용 준비를 한다.

### 생성/수정 파일

| 파일 | 변경 내용 |
|---|---|
| `docs/spec/SUPABASE_SCHEMA.sql` | Phase 9-A 블록 정리: 위험한 update policy 제거 + 계정 운영 절차 SQL 예시 추가 + Phase 9-C RLS 계획 블록 추가 |
| `app/student/layout.tsx` | nav "말하기 대회" → "말하기 대회 준비" (미완성 메뉴 명칭 명확화) |
| `app/teacher/db-submissions-section.tsx` | 제출 ID 컬럼(앞 8자리) 추가 — 교수자가 실제 DB 레코드 식별 가능 |
| `tests/smoke/auth-routes.spec.ts` | 주석 개선(proxy.ts/Next.js 16 명시) + /teacher smoke test에 채점 관리 헤더 렌더링 확인 추가 |
| `docs/spec/WORK_LOG.md` | Phase 9-B 기록 |
| `docs/spec/PILOT_RELEASE_PLAN.md` | Phase 9-B Known Issue 업데이트 |

### 주요 결정사항

**proxy.ts 확인**: Next.js 16에서 middleware.ts는 deprecated → proxy.ts가 올바른 파일명. Phase 9-A 구현이 정확히 Next.js 16 규약을 따름.

**user_profiles UPDATE 정책 제거 근거**:
- Postgres RLS는 row-level이며 column-level 제어 없음
- `with check (auth.uid() = user_id)` 단독 UPDATE 정책은 role/student_id 변경도 허용함 → 권한 상승 취약점
- display_name만 업데이트하는 안전한 방법: SECURITY DEFINER 함수 또는 Edge Function (Phase 9-C)
- 현재는 관리자가 Supabase Dashboard에서 직접 변경

**RLS 전면 적용 보류 이유**:
- 현재 speaking_submissions INSERT는 anon key 기반 server action 사용
- RLS 활성화 시 INSERT 정책도 동시에 추가 필요 — 현재 기능 흐름 깨질 위험
- Phase 9-C에서 INSERT + SELECT 정책을 함께 검토 후 적용 예정

### Known Issues (Phase 9-C 해소 예정)

- user_profiles display_name 수정 기능 미구현 (관리자 Dashboard 직접 변경)
- speaking_submissions / ai_evaluations / teacher_reviews RLS 미적용 (Phase 9-C)
- recordings bucket public URL 정책 재검토 필요 (Phase 9-C)
- provider_events RLS 미적용 (Phase 9-C)
- admin 전용 route 분리 미완료 (현재 teacher와 동일 권한)
- 실제 student/teacher/admin 계정 로그인 E2E 테스트는 계정 생성 후 수동 확인 필요

---

## Phase 9-A — Supabase Auth 기반 로그인/역할 분기

**날짜**: 2026-05-05  
**목표**: Supabase Auth 기반 이메일/비밀번호 로그인과 역할(student/teacher/admin) 분기를 구현한다. 기존 STT·녹음·평가·TTS·smoke test 흐름을 유지한다.

### 생성/수정 파일

| 파일 | 변경 내용 |
|---|---|
| `src/lib/supabase/server.ts` | **신규** — @supabase/ssr `createServerClient` 래퍼. `await cookies()` (Next.js 16 async) 사용. Supabase 미설정 시 null 반환 |
| `src/lib/supabase/auth.ts` | **신규** — `getCurrentUser`, `getCurrentProfile`, `requireRole` 재사용 헬퍼. `user_profiles` 테이블 조회 |
| `middleware.ts` | **신규** — `/student`, `/teacher`, `/admin` route 보호. Supabase 미설정 시 auth 체크 skip (smoke test 환경 호환). `/teacher`, `/admin`은 role=teacher\|admin만 허용 |
| `app/login/page.tsx` | **신규** — 이메일/비밀번호 로그인 UI. `useActionState` (React 19) 사용. 오류 메시지 표시 |
| `app/login/actions.ts` | **신규** — `loginAction` server action. `signInWithPassword` → role 조회 → role별 redirect |
| `app/api/auth/signout/route.ts` | **신규** — POST /api/auth/signout. `signOut` 후 /login redirect |
| `app/role-missing/page.tsx` | **신규** — user_profiles 미설정 안내 화면. 로그아웃 버튼 포함 |
| `app/student/layout.tsx` | async Server Component로 변경. 로그인 사용자 display_name 조회 → AppShell에 전달 |
| `app/teacher/layout.tsx` | async Server Component로 변경. display_name 조회. 제출 내역 nav 활성화 |
| `app/admin/layout.tsx` | async Server Component로 변경. display_name 조회 |
| `app/teacher/db-submissions-section.tsx` | **신규** — speaking_submissions + ai_evaluations + teacher_reviews 실시간 쿼리 테이블. DB 미설정/실패 시 렌더링 skip |
| `app/teacher/page.tsx` | `DbSubmissionsSection` 추가 (최상단) |
| `src/components/layout/app-shell.tsx` | `userName?: string` prop 추가 |
| `src/components/layout/topbar.tsx` | `userName` 표시 + 로그아웃 form 버튼 추가 |
| `docs/spec/SUPABASE_SCHEMA.sql` | Phase 9-A Migration 블록 추가 (`user_profiles` 테이블 DDL + RLS 정책) |
| `tests/smoke/auth-routes.spec.ts` | **신규** — /login, /role-missing, /student, /teacher 접근 smoke test |
| `playwright.config.ts` | auth-routes.spec.ts → chromium 프로젝트에 추가 |

### Auth/Role 설계

- **인증**: Supabase Auth 이메일/비밀번호
- **역할 저장**: `user_profiles` 테이블 (auth.users FK)
- **역할 분기**:
  - `student` → `/student`
  - `teacher` | `admin` → `/teacher`
  - no profile → `/role-missing`
- **route 보호 정책**:
  - `/student/*` — 인증된 모든 역할 허용 (teacher도 확인 목적 접근 가능)
  - `/teacher/*` — teacher, admin만 허용
  - `/admin/*` — teacher, admin만 허용 (admin 전용 분리는 Phase 9-B)
- **mock/smoke 환경**: SUPABASE_URL/ANON_KEY 없으면 middleware가 auth 체크 skip → 기존 smoke test 그대로 통과

### 계정 생성 방침

- 회원가입 UI 없음 — 관리자가 Supabase Dashboard에서 계정 생성 후 `user_profiles`에 role 부여
- 학습자 계정 생성 → role='student' INSERT → /login으로 전달

### Known Issues

- Supabase Auth 계정 생성 필요 (수동)
- `user_profiles` role 수동 준비 필요
- RLS 고도화는 Phase 9-B에서 진행
- 실제 학습자/교사 계정 로그인 수동 테스트 필요
- admin 전용 route 분리는 Phase 9-B에서 진행

---

## Phase 8-G — LLM 실제 채점 연동 (OpenAI)

**날짜**: 2026-05-05  
**목표**: 말하기 제출 후 transcript를 바탕으로 OpenAI LLM 채점을 수행하고 결과를 ai_evaluations에 저장한다. LLM 실패/키 없음/JSON 파싱 실패 시 mock fallback으로 제출 흐름을 계속 유지한다.

### 생성/수정 파일

| 파일 | 변경 내용 |
|---|---|
| `src/types/providers.ts` | `SpeakingEvalInput`, `SpeakingEvalDetail` 타입 추가 |
| `src/providers/llm-eval/index.ts` | **재작성** — `evaluateSpeakingDetail()` 함수 추가. OpenAI (`gpt-4o-mini` 기본) 또는 mock fallback. `detailToLLMEvalResult()` 변환 헬퍼. 기존 `getLLMEvalProvider()` 후방 호환 유지 |
| `app/api/evaluate-speaking/route.ts` | **신규** — POST `/api/evaluate-speaking`. `{ questionId, transcript, pronunciationResult?, referenceText?, rubricId? }` 입력. `evaluateSpeakingDetail` 호출, provider_events 기록, `SpeakingEvalDetail` 반환. 실패해도 fallback JSON 반환 |
| `app/student/speaking/actions.ts` | `evaluateSpeakingDetail` 직접 호출로 교체. question 프롬프트 lookup 추가. provider_events 기록 추가. `speakingEvalDetail` 포함하여 record 저장 |
| `src/lib/mock/speaking-store.ts` | `SpeakingEvalRecord`에 `speakingEvalDetail?: SpeakingEvalDetail` 추가 |
| `src/lib/repositories/types.ts` | `SpeakingEvalRecord`에 `speakingEvalDetail?: SpeakingEvalDetail` 추가 |
| `src/lib/repositories/supabase-submission-repository.ts` | `saveSpeakingEvalRecord`에서 `speakingEvalDetail` 있으면 `scores` JSONB에 저장, `total_score`/`feedback` 매핑 |
| `app/student/speaking/[questionId]/result/page.tsx` | `speakingEvalDetail` 있을 때 강점/보완점/피드백/모범표현 표시 |
| `.env.local.example` | `OPENAI_EVAL_MODEL` 변수 추가 |
| `docs/spec/SUPABASE_SCHEMA.sql` | Phase 8-G 스키마 변경 노트 추가 (DDL 변경 없음) |

### LLM 평가 연동 방식

- `LLM_EVAL_PROVIDER=openai` + `OPENAI_API_KEY` 모두 설정 → OpenAI `gpt-4o-mini` (또는 `OPENAI_EVAL_MODEL`) 호출
- 둘 중 하나라도 없으면 mock fallback (600ms 지연 시뮬레이션)
- OpenAI 호출 실패 또는 JSON 파싱 실패 시 catch → mock fallback 반환 (throw 없음)

### 평가 JSON 스키마 (`SpeakingEvalDetail`)

```typescript
{
  overall_score: number            // 0-100
  task_completion_score: number    // 0-100
  fluency_score: number            // 0-100
  grammar_score: number            // 0-100
  vocabulary_score: number         // 0-100
  pronunciation_reference_score?: number  // 발음평가 참고 (optional)
  strengths: string[]              // 1-3개 강점 (한국어)
  improvements: string[]           // 1-3개 보완점 (한국어)
  corrected_answer: string         // 모범/교정 답안 (한국어)
  teacher_note: string             // 교수자용 내부 메모 (한국어)
  learner_feedback_ko: string      // 학습자용 피드백 2-3문장 (한국어)
  learner_feedback_simple: string  // 기초 한국어 짧은 피드백
  raw_provider?: unknown           // 모델명, 토큰 사용량 등 메타데이터
}
```

### ai_evaluations 저장 방식

- `scores` JSONB: `SpeakingEvalDetail` 전체 객체 (기존 `LLMEvalScore[]` 배열에서 변경, DDL 변경 없음)
- `total_score` / `normalized_score`: `overall_score`
- `feedback`: `learner_feedback_ko`
- `stt_result`, `pronunciation_result`: 기존과 동일
- `speakingEvalDetail` 없으면 기존 `llmEvalResult.scores` / `feedback` 사용 (후방 호환)

### provider_events 기록 항목

| 상황 | provider_type | provider_name | status |
|---|---|---|---|
| OpenAI 성공 | `llm-eval` | `openai` | `success` |
| 키 없음 / mock 설정 | `llm-eval` | `mock` | `fallback` |
| OpenAI 실패 | `llm-eval` | `openai` | `error` |
| OpenAI 실패 후 fallback | `llm-eval` | `mock` | `fallback` |

- `latency_ms`, `question_id`, `model`, `error_code`, `error_message`, `metadata` 기록
- 기록 실패 시 `console.warn`만 — 사용자 흐름 차단 없음

### fallback 처리

아래 상황에서도 제출 흐름 정상 유지:
- `OPENAI_API_KEY` 없음 → mock fallback
- `LLM_EVAL_PROVIDER` 미설정 (기본 `mock`) → mock fallback
- OpenAI API 호출 실패 → catch → mock fallback
- JSON 파싱 실패 → catch → mock fallback
- transcript 없음 → `overall_score: 15` 이하 mock 반환
- `pronunciationResult` 없음 → `pronunciationScore` 없이 평가 (정상 처리)

### DB 수동 적용 필요 여부

**없음.** `ai_evaluations.scores`는 이미 JSONB이므로 어떤 JSON 형태도 저장 가능.  
`provider_events.provider_type` check constraint에 `'llm-eval'`이 이미 포함됨.  
기존 ai_evaluations 행의 `scores` 컬럼은 파싱이 필요할 때만 영향받음 (현재 read path 미구현이므로 안전).

### known issues

- 결과 페이지가 mock store(in-memory)에서 읽으므로, 서버 재시작 시 결과 조회 불가 (Phase 9+ DB 읽기로 해소 예정)
- `provider_events.provider_type` DB check constraint 값이 `'llm-eval'`이나 과제 명세의 `'llm_evaluation'`과 다름 — 기존 DB 제약을 유지 (`llm-eval` 사용)
- `corrected_answer`는 mock 시 transcript를 그대로 반환 (교정 없음)
- OpenAI eval 결과는 결과 페이지에서 표시하나, teacher review 화면은 별도 작업 필요 (known issue)

### lint 결과
- `npm run lint` → 에러 0, 경고 0

### tsc 결과
- `npx tsc --noEmit` → 에러 0

### build 결과
- `npm run build` → 빌드 성공
- `/api/evaluate-speaking` 라우트가 `ƒ (Dynamic)` 서버 렌더 라우트로 등록됨

---

## Phase 8-F — ETRI 발음평가 API 연동 구조

**날짜**: 2026-05-05  
**목표**: ETRI 발음평가 API 연동 구조를 추가한다. API 실패/키 없음/응답 오류 시에도 기존 말하기 제출 흐름을 깨지 않는다.

### 생성/수정 파일

| 파일 | 변경 내용 |
|---|---|
| `src/providers/pronunciation/etri.ts` | **신규** — `ETRIPronunciationProvider`. ETRI WiseASR API 호출, base64 오디오 전송, 응답 파싱, normalizeFeedback. 30초 timeout. 오류 시 throw (호출자가 fallback 처리) |
| `src/providers/pronunciation/index.ts` | `PRONUNCIATION_PROVIDER=etri` 케이스 추가. `ETRI_API_KEY` 없으면 mock fallback + `console.warn` |
| `app/api/pronunciation/route.ts` | **신규** — POST `/api/pronunciation`. FormData(audio, referenceText, questionId) 수신. ETRI/mock 호출. `logProviderEvent` 기록. 오류 시 mock fallback JSON 반환 |
| `app/student/speaking/actions.ts` | `ClientPronunciationResult` 타입 추출. `SpeakingSubmitMeta`에 `pronunciationResult` 필드 추가. 클라이언트 제공값 우선 사용, 없으면 server-side fallback |
| `app/student/speaking/[questionId]/speaking-client.tsx` | `handleSubmit`에서 `/api/pronunciation` 병렬 호출 추가. 성공 시 결과를 `submitSpeaking`에 전달. 실패해도 흐름 유지 |
| `.env.local.example` | `ETRI_API_KEY`, `ETRI_API_BASE_URL` placeholder 추가 |
| `docs/spec/WORK_LOG.md` | Phase 8-F 항목 추가 (이 문서) |
| `docs/spec/PILOT_RELEASE_PLAN.md` | ETRI 발음평가 Known Issues 추가 |

### ETRI 연동 방식

- **엔드포인트**: `https://aiopen.etri.re.kr:8000/WiseASR/PronunciationKor` (기본값; `ETRI_API_BASE_URL`로 오버라이드 가능)
- **전송**: JSON body `{ access_key, argument: { language_code, script, audio(base64) } }`
- **응답 파싱**: `return_object.recognized[0]` → `score`, `eojeol_score` (없으면 `word_score`)
- **결과 정규화**: `normalizedScore`, `wordScores[]`, `feedback` (점수 구간별 메시지)

### fallback 처리 (4가지 상황 모두 제출 유지)

| 상황 | 처리 |
|---|---|
| `ETRI_API_KEY` 없음 | `getPronunciationProvider()`에서 mock 반환 + `console.warn` |
| ETRI API 호출 실패 | `/api/pronunciation`에서 catch → mock fallback JSON 반환 |
| 응답 파싱 실패 | `ETRIPronunciationProvider`에서 throw → route가 catch → fallback |
| 오디오 없음 (blobUrl null) | `speaking-client.tsx`에서 `/api/pronunciation` 호출 자체를 건너뜀, actions.ts가 server-side mock 사용 |

### provider_events 기록 항목

| 상황 | provider_name | status | 추가 정보 |
|---|---|---|---|
| ETRI 성공 | `etri` | `success` | latency_ms, question_id |
| ETRI 실패 후 fallback | `etri` | `error` | error_code=provider_error, error_message |
| mock fallback 응답 | `mock` | `fallback` | metadata.reason, metadata.configuredProvider |
| ETRI_API_KEY 없음 → mock | `mock` | `fallback` | metadata.reason=no_api_key |

### DB 변경 여부

`ai_evaluations.pronunciation_result` (jsonb) 컬럼이 Phase 6-B 이후 이미 존재함. **수동 DB 적용 불필요**.

### Known Issues (Phase 8-F 기준)

| 이슈 | 설명 |
|---|---|
| **실제 ETRI API 미검증** | `ETRI_API_KEY` 없이 mock fallback으로만 테스트됨. 실제 키로 end-to-end 검증 필요 |
| **오디오 포맷** | ETRI API는 PCM/WAV 권장; 브라우저 WebM 녹음 그대로 전송 — 변환 없음. 실제 연동 시 ffmpeg 변환 검토 필요 |
| **request_id 미수집** | ETRI 응답 헤더에서 request ID를 추출하지 않음 |

---

## Phase 8-E — Provider Event Logging (STT)

**날짜**: 2026-05-05  
**목표**: 외부 AI/음성 provider 호출 이력을 `provider_events` 테이블에 기록한다. `/api/stt` OpenAI Whisper 호출부터 시작하며, 이후 ETRI/LLM/TTS 등에 재사용 가능한 구조로 만든다.

### 생성/수정 파일

| 파일 | 변경 내용 |
|---|---|
| `src/lib/supabase/provider-events.ts` | **신규** — `logProviderEvent(input)` 헬퍼. Supabase `provider_events` 테이블에 INSERT. 실패 시 `console.warn` 처리, 호출자 예외 전파 없음 |
| `app/api/stt/route.ts` | `logProviderEvent` 호출 추가. FormData에서 `questionId` 파싱. 성공/오류/fallback 3종 이벤트 기록 |
| `app/student/speaking/[questionId]/speaking-client.tsx` | STT FormData에 `questionId` 추가 |
| `docs/spec/SUPABASE_SCHEMA.sql` | `provider_events` 테이블에 새 컬럼 추가 (status, model, request_id, question_id, error_code, metadata) + Phase 8-E Migration ALTER TABLE 섹션 추가 |
| `docs/spec/SUPABASE_SCHEMA.md` | `provider_events` 섹션 업데이트 |
| `docs/spec/WORK_LOG.md` | Phase 8-E 항목 추가 (이 문서) |
| `docs/spec/PILOT_RELEASE_PLAN.md` | Provider event logging Known Issues 추가 |

### provider_events 테이블 변경 (Phase 8-E)

기존 컬럼에 추가:

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `status` | text NULL | `'success'` / `'fallback'` / `'error'` |
| `model` | text NULL | 모델명 (예: `'whisper-1'`) |
| `request_id` | text NULL | 외부 API 요청 ID |
| `question_id` | text NULL | 문항/시나리오 ID |
| `error_code` | text NULL | 짧은 오류 키 (예: `'provider_error'`) |
| `metadata` | jsonb NULL | provider별 추가 정보 |

**DB 수동 적용 필요**: `SUPABASE_SCHEMA.sql` 하단 `Phase 8-E Migration` 섹션의 ALTER TABLE 명령을 Supabase Dashboard > SQL Editor에서 실행해야 함.

### /api/stt 기록 항목

| 상황 | provider_name | status | 기록 내용 |
|---|---|---|---|
| Whisper 성공 | `whisper` | `success` | latency_ms, model(whisper-1), question_id |
| mock 정상 사용 | `mock` | `success` | latency_ms, question_id |
| OpenAI 실패 후 fallback | `openai` | `error` | error_code=provider_error, error_message |
| mock fallback 응답 | `mock` | `fallback` | latency_ms=0, metadata.reason, metadata.configuredProvider |

### 기록 흐름 요약

```
/api/stt POST
  ├─ FormData 파싱: audio + questionId
  ├─ getSTTProvider() → provider.transcribe(blob)
  │   ├─ 성공 → logProviderEvent(status=success) → Response.json(transcript)
  │   └─ 실패 → logProviderEvent(status=error) [openai인 경우]
  │           → logProviderEvent(status=fallback, provider=mock)
  │           → Response.json(MOCK_TRANSCRIPT)
  │
  └─ logProviderEvent 실패 → console.warn (흐름 차단 없음)
```

### Known Issues (Phase 8-E 기준)

| 이슈 | 설명 |
|---|---|
| **DB 수동 적용 필요** | 기존 Supabase 인스턴스에는 Phase 8-E Migration ALTER TABLE 실행 필요 |
| **request_id 미수집** | OpenAI Whisper API 응답에서 request ID를 별도 추출하지 않음 — Phase 8-F에서 개선 예정 |
| **anon key 기반 INSERT** | `provider_events`는 anon key로 INSERT. RLS 도입(Phase 9) 후 정책 추가 필요 |
| **ETRI/LLM/TTS 미적용** | Phase 8-E에서는 STT만 적용. 다른 provider는 Phase 8-F+ |

---

## Phase 8-D — 모바일/iOS 녹음 예외 처리 보완

**날짜**: 2026-05-05  
**목표**: 녹음 실패(권한 거부·미지원 브라우저·iOS Safari 제한·빈 Blob)가 발생해도 제출 흐름이 깨지지 않도록 예외 처리를 보완하고, 모바일 360px 레이아웃을 최소 수정한다.

### 생성/수정 파일

| 파일 | 변경 내용 |
|---|---|
| `src/hooks/use-audio-recorder.ts` | `onstop`에서 `blob.size > 0` 체크 추가 — 빈 Blob일 때 blobUrl을 생성하지 않아 fallback 제출 흐름 유지 |
| `app/student/speaking/[questionId]/speaking-client.tsx` | iOS Safari 감지(`isIOSSafari` state+effect), 준비 화면 iOS 경고 배너 추가, 에러 메시지 iOS 언급 추가, 리뷰 버튼 `w-full sm:w-auto` 추가, 녹음 완료 버튼 `min-w-[160px]` 추가 |
| `docs/spec/WORK_LOG.md` | Phase 8-D 항목 추가 (이 문서) |
| `docs/spec/PILOT_RELEASE_PLAN.md` | Known Issues에 Phase 8-D 해소 항목 반영, iOS 파일럿 안내 추가 |

### 추가된 예외 처리

```
1. 빈 Blob fallback (use-audio-recorder.ts)
   - onstop 시 blob.size === 0 → blobUrl = null, state = 'stopped'
   - submit 흐름: blobUrl이 null → STT/Storage skip → 빈 transcript로 submitSpeaking 진행
   - 기존 성공 경로(blob.size > 0)는 변경 없음

2. iOS Safari 감지 및 사전 경고 (speaking-client.tsx)
   - useEffect에서 UA 파싱 → isIOSSafari state
   - 준비 화면(prepStarted=false)에서 amber 배너 표시
   - 메시지: "iOS 15 이상 필요, 오류 시에도 제출 가능"

3. 에러 메시지 개선 (RECORDER_ERROR_MESSAGES)
   - not-supported: iOS 15 이상 Safari 필요 명시
   - unknown: iOS Safari 제한 가능성 안내 + 녹음 없이 제출 가능 안내

4. 모바일 360px 버튼 레이아웃
   - 리뷰 단계 [다시 녹음] [제출하기]: w-full sm:w-auto (모바일 전체 너비)
   - 녹음 완료 버튼: min-w-[160px] (터치 영역 확보)
```

### 유지된 성공 흐름

```
정상 경로 (변경 없음):
  녹음(blob > 0) → /api/stt → transcript → /api/storage/upload → audio_url
  → submitSpeaking → Supabase 저장 → 결과 페이지

Fallback 경로 (Phase 8-D 보완):
  녹음 실패 또는 blob = 0
  → blobUrl = null
  → STT/Storage 호출 skip
  → submitSpeaking({ hasRecording: false, sttTranscript: undefined, audioUrl: undefined })
  → Supabase 저장 (audio_url = null, transcript = mock)
  → 결과 페이지 정상 이동
```

### Known Issues (Phase 8-D 기준)

| 이슈 | 영향도 | 방지/회피 방법 |
|---|---|---|
| **iOS Safari < 15** — `MediaRecorder` 미지원, 녹음 불가 | 중 | `not-supported` 에러 메시지 + 녹음 없이 제출 가능 |
| **iOS Safari 15+ 빈 Blob** — 일부 기기에서 녹음 데이터 없이 onstop 발생 | 중 | blob.size 체크로 blobUrl = null, 빈 transcript fallback 제출 |
| **iOS mp4/aac STT 변환** — Whisper/ETRI가 mp4를 지원하지 않을 경우 | 중 | Phase 8-A에서 서버 측 포맷 변환 처리 예정 |
| **모바일 키보드 오버랩** — 녹음 화면에서 가상 키보드 팝업 시 타이머/버튼 가려질 수 있음 | 낮 | 말하기 평가 화면은 키보드 입력 없음, 영향 최소 |

---

## Phase 8-C — Supabase Storage 최소 연동 (녹음 파일 업로드)

**날짜**: 2026-05-05  
**목표**: 녹음 Blob을 Supabase Storage에 업로드하고, `audio_url`을 `speaking_submissions`에 저장한다. Storage 업로드 실패 시에도 STT, 제출, 결과 화면 이동은 계속된다.

### 생성/수정 파일

| 파일 | 변경 내용 |
|---|---|
| `src/lib/supabase/storage.ts` | `uploadAudioToStorage()` helper — bucket upload + getPublicUrl 반환 |
| `app/api/storage/upload/route.ts` | POST route — FormData(audio, questionId) → Storage upload → `{ storagePath, publicUrl }` |
| `src/lib/repositories/types.ts` | `SpeakingEvalRecord`에 `audioUrl?: string \| null` 추가 |
| `src/lib/mock/speaking-store.ts` | `SpeakingEvalRecord`에 `audioUrl?: string \| null` 추가 |
| `app/student/speaking/actions.ts` | `SpeakingSubmitMeta`에 `audioUrl?` 추가, `record.audioUrl` 저장 |
| `app/student/speaking/[questionId]/speaking-client.tsx` | Blob 1회 fetch → STT + Storage 병렬 업로드 → `audioUrl` pass-through |
| `src/lib/repositories/supabase-submission-repository.ts` | `speaking_submissions.audio_url`에 `record.audioUrl ?? null` 사용 |
| `docs/spec/WORK_LOG.md` | Phase 8-C 항목 추가 (이 문서) |

### Storage 업로드 구조

```
클라이언트 (speaking-client.tsx)
  ├─ fetch(recorder.blobUrl) → audioBlob
  └─ Promise.allSettled([
       /api/stt         ← STT (기존)
       /api/storage/upload ← 신규
         └─ uploadAudioToStorage(blob, questionId)
              ├─ bucket: recordings
              ├─ path: speaking/{questionId}/{timestamp}.{ext}
              ├─ 성공 → { storagePath, publicUrl }
              └─ 실패 → null + console.error([provider_events] storage.error)
     ])
  └─ submitSpeaking(questionId, setId, { ..., audioUrl })
       └─ saveSpeakingEvalRecord({ ..., audioUrl })
            └─ speaking_submissions.audio_url = audioUrl ?? null
```

### 필요한 Supabase bucket 설정

Supabase Dashboard > Storage에서 다음 설정이 필요합니다:

| 항목 | 값 |
|---|---|
| **Bucket 이름** | `recordings` |
| **Public** | `true` (getPublicUrl이 서명 없이 동작하려면 필수) |
| **파일 크기 제한** | 50 MB 이상 권장 (최장 5분 기준 약 30 MB) |
| **허용 MIME 타입** | `audio/webm`, `audio/mp4`, `audio/ogg` |

Supabase Storage Policies (RLS) — pilot 기준 최소 설정:

```sql
-- anon INSERT 허용 (pilot phase — Phase 9에서 Auth 기반으로 교체 예정)
CREATE POLICY "allow_anon_upload"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'recordings');
```

> bucket이 없거나 policy가 없으면 업로드가 실패합니다.
> 실패 시 서버 콘솔에 `[provider_events] storage.error` 가 찍히고,
> `audio_url` 없이 제출이 계속됩니다 (non-blocking).

### audio_url 저장 위치

`speaking_submissions.audio_url` (text, nullable) 컬럼에 Supabase Storage Public URL 저장.

- 성공 시: `https://{project}.supabase.co/storage/v1/object/public/recordings/speaking/{questionId}/{timestamp}.webm`
- 실패 시: `null` (기존 동작과 동일)

### 업로드 실패 시 fallback 조건

| 조건 | 결과 |
|---|---|
| Supabase client 미설정 | `storage.skip reason=no_supabase_client` 경고 → `audioUrl=undefined` |
| bucket `recordings` 미존재 | `storage.error` 로그 → `audioUrl=undefined` |
| anon INSERT policy 없음 | `storage.error` 로그 → `audioUrl=undefined` |
| 네트워크 오류 | `storage.error` 로그 → `audioUrl=undefined` |
| `/api/storage/upload` fetch 실패 | catch → `audioUrl=undefined` |
| 위 모든 경우 | `submitSpeaking`은 `audioUrl=undefined` 로 정상 호출 → DB에 `audio_url=null` |

### provider_events 기록

```
storage.skip   → console.warn  '[provider_events] storage.skip reason=no_supabase_client'
storage.success → console.info  '[provider_events] storage.success path=... bucket=recordings'
storage.error  → console.error '[provider_events] storage.error message=... path=...'
```

Phase 8-E에서 이 이벤트들을 DB `provider_events` 테이블에 기록할 수 있습니다.

### Phase 8-F ETRI 연동 준비

`uploadAudioToStorage()` 반환값:
```typescript
{ storagePath: 'speaking/q-001/1234567890.webm', publicUrl: 'https://...' }
```

- `storagePath`: ETRI API가 Supabase에서 직접 파일을 읽을 수 있는 경로
- `transcript`: `sttResult.transcript` — ETRI 발음평가 참조 텍스트로 사용 가능
- `SpeakingEvalRecord.audioUrl`: Phase 8-F provider에서 접근 가능

### STT/OpenAI 흐름 영향

없음. STT와 Storage 업로드는 `Promise.allSettled`로 완전히 병렬 독립 실행. 어느 쪽 실패도 다른 쪽에 영향 없음.

### 테스트 방법

**Storage 업로드 정상 동작 확인:**
1. Supabase Dashboard에서 `recordings` bucket 생성 + public + anon INSERT policy 적용
2. `.env.local`: `REPOSITORY_PROVIDER=supabase`, `NEXT_PUBLIC_SUPABASE_URL=...`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
3. `npm run dev` → `/student/speaking/q-001?setId=qs-diagnostic-01`
4. 녹음 → 제출 시 서버 콘솔 확인:
   - 성공: `[provider_events] storage.success path=speaking/q-001/... bucket=recordings`
5. Supabase Dashboard > Table Editor > `speaking_submissions` 에서 `audio_url` 확인

**Storage 업로드 실패 (non-blocking) 확인:**
1. `recordings` bucket 미생성 상태에서 동일 흐름 실행
2. 서버 콘솔에 `[provider_events] storage.error` 출력 확인
3. 결과 페이지 정상 도달 확인

**STT 흐름 유지 확인:**
1. `STT_PROVIDER=openai`, `OPENAI_API_KEY=sk-...` 설정
2. 기존과 동일하게 STT 동작 확인

### 테스트 결과

- `npm run lint` → 오류 없음 ✓
- `npx tsc --noEmit` → 오류 없음 ✓
- `npm run build` → 빌드 성공 ✓ (16개 라우트, `/api/storage/upload` 추가)

### Known Issues (Phase 8-C 기준)

| 이슈 | 영향 | 해소 예정 |
|---|---|---|
| **Storage bucket 수동 생성 필요** | 중 — bucket 없으면 업로드 실패(non-blocking) | 사용자가 Dashboard에서 직접 생성 |
| **anon 업로드 RLS 미완** | 중 — Auth 미구현으로 pilot용 anon policy 필요 | Phase 9 (Auth 이후 교체) |
| **audio_url은 Public URL** — signed URL 미구현 | 소 — public bucket 기준. private bucket 사용 시 signed URL 별도 구현 필요 | Phase 9 이후 |
| **iOS Safari 대응 미완** | 중 — MediaRecorder 미지원 환경 | Phase 8-D |
| 기존 Phase 8-B known issues 유지 | — | 해당 Phase 참고 |

### 다음 단계 제안

| 항목 | 내용 |
|---|---|
| **Phase 8-D** | iOS Safari 대응 — MediaRecorder 미지원 환경 감지 및 대안 안내 |
| **Phase 8-E** | provider_events DB 기록 — Storage/STT 성공/실패를 `provider_events` 테이블에 저장 |
| **Phase 8-F** | ETRI 발음평가 API 연동 — `storagePath` + `transcript` → ETRI API → `pronunciationResult` 실제 채점 |
| **Phase 9** | Supabase Auth 도입 — anon policy를 Auth 기반 RLS로 교체 |

---

## Phase 8-B — OpenAI Whisper STT 실제 API provider 최소 연동

**날짜**: 2026-05-05  
**목표**: `STT_PROVIDER=openai` 또는 `whisper` 환경에서 OpenAI Whisper API(`whisper-1`)를 실제로 호출한다. API key 미설정 또는 호출 실패 시 기존 mock fallback 흐름을 그대로 유지한다.

### 생성/수정 파일

| 파일 | 변경 내용 |
|---|---|
| `src/providers/stt/index.ts` | `WhisperSTTProvider.transcribe()` 실제 구현 (OpenAI SDK 동적 import) |
| `.env.local.example` | `OPENAI_API_KEY=` 및 `STT_PROVIDER` 설명 추가 |
| `package.json` / `package-lock.json` | `openai ^6.36.0` 의존성 추가 |
| `docs/spec/WORK_LOG.md` | Phase 8-B 항목 추가 (이 문서) |

### OpenAI STT provider 구조

```
STT_PROVIDER=openai 또는 whisper
  └─ WhisperSTTProvider.transcribe(blob)
       1. OPENAI_API_KEY 없으면 throw → /api/stt 에서 mock fallback
       2. openai 패키지 동적 import (서버 전용 유지, 클라이언트 번들 제외)
       3. Blob → Buffer → toFile() 변환
       4. client.audio.transcriptions.create({ model: 'whisper-1', language: 'ko' })
       5. 성공 → STTResult { transcript, confidence: 1.0, providerName: 'whisper', ... }
       6. 예외 throw → /api/stt 에서 mock fallback

STT_PROVIDER=mock (기본값)
  └─ MockSTTProvider (기존과 완전 동일)
```

### /api/stt fallback 흐름 (기존, 변경 없음)

```
provider.transcribe() 성공
  → Response.json({ transcript, providerName: 'whisper', source: 'stt' })

provider.transcribe() throw
  → console.error('[provider_events] stt.error', err)
  → Response.json({ transcript: MOCK_TRANSCRIPT, providerName: 'mock', source: 'mock-fallback' })
```

### 환경변수 설정 방법

`.env.local`:
```
STT_PROVIDER=openai   # 또는 whisper (동일)
OPENAI_API_KEY=sk-...  # 서버 전용 — NEXT_PUBLIC_ 접두사 절대 사용 금지
```

mock 유지 시:
```
STT_PROVIDER=mock     # 기본값 — OPENAI_API_KEY 불필요
```

### mock fallback 조건

| 조건 | 결과 |
|---|---|
| `STT_PROVIDER=mock` (기본값) | MockSTTProvider 직접 사용 — OpenAI 호출 없음 |
| `STT_PROVIDER=openai\|whisper` + `OPENAI_API_KEY` 미설정 | throw → `/api/stt` mock fallback |
| `STT_PROVIDER=openai\|whisper` + API 호출 실패 (네트워크, 인증 등) | throw → `/api/stt` mock fallback |
| 클라이언트 fetch `/api/stt` 실패 | speaking-client.tsx 비차단 처리 → `submitSpeaking` mock STT 사용 |

### provider_events 기록

- 성공: `console.info('[provider_events] stt.success provider=%s latency=%dms', ...)` (기존 route.ts, 변경 없음)
- 실패: `console.error('[provider_events] stt.error', err)` (기존 route.ts, 변경 없음)
- 실제 DB 기록은 Phase 8-C 이후 예정

### 테스트 방법

**mock 동작 확인 (API key 불필요):**
1. `.env.local`: `STT_PROVIDER=mock` (기본값)
2. `npm run dev` → `/student/speaking/q-001?setId=qs-diagnostic-01`
3. 녹음 → 제출 → 결과 페이지 정상 도달 확인

**Whisper 연동 확인 (API key 필요):**
1. `.env.local`: `STT_PROVIDER=openai`, `OPENAI_API_KEY=sk-...`
2. `npm run dev` → `/student/speaking/q-001?setId=qs-diagnostic-01`
3. 녹음 후 제출 시 서버 콘솔에서 확인:
   - 성공: `[provider_events] stt.success provider=whisper latency=Xms`
   - 실패: `[provider_events] stt.error ...` + mock fallback으로 제출 정상 완료

**fallback 확인:**
1. `.env.local`: `STT_PROVIDER=whisper`, `OPENAI_API_KEY` 없음 (또는 잘못된 값)
2. 제출 시 서버 콘솔에 `stt.error` 기록 확인
3. 결과 페이지는 정상 도달 (mock transcript 사용)

### Supabase 저장 흐름 영향

없음. `submitSpeaking` Server Action은 `/api/stt` 응답의 `sttTranscript`를 그대로 전달받으며, Supabase 저장 경로(`REPOSITORY_PROVIDER=supabase`)는 기존과 동일.

### 테스트 결과

- `npm run lint` → 오류 없음 ✓
- `npx tsc --noEmit` → 오류 없음 ✓
- `npm run build` → 빌드 성공 ✓ (15개 라우트, 기존과 동일)

### Known Issues (Phase 8-B 기준)

| 이슈 | 영향 | 해소 예정 |
|---|---|---|
| **word timings 미제공** — Whisper `whisper-1` 응답에서 word timestamps를 요청하지 않음 (단순 text만 수신) | 소 | 필요 시 `verbose_json` + `timestamp_granularities: ['word']` 추가 |
| **confidence 고정값** — Whisper는 confidence를 반환하지 않아 `1.0` 고정 | 소 | 설계 수용 (Whisper API 제약) |
| **audio_url null 유지** — Supabase Storage 미구현으로 audio_url은 여전히 null | 중 | Phase 8-C (Supabase Storage) |
| **iOS Safari 대응 미완** — MediaRecorder 지원 제한으로 webm Blob이 생성 안 될 수 있음 | 중 | Phase 8-C (iOS 대응) |
| 기존 Phase 8-A, 7-C-lite, 7-B-main known issues 모두 유지 | — | 해당 Phase 참고 |

### 다음 단계 제안

| 항목 | 내용 |
|---|---|
| **Phase 8-C** | Supabase Storage 최소 연동 — 녹음 Blob 업로드, `audio_url` DB 업데이트 |
| **Phase 8-D** | iOS Safari 대응 — MediaRecorder 미지원 환경 감지 및 대안 안내 |
| **Phase 8-E** | provider_events DB 기록 — STT 성공/실패를 `provider_events` 테이블에 저장 |
| **Phase 9** | ETRI 발음평가 연동 또는 LLM 실제 채점 구현 |

---

## Phase 7-C-lite — 학습자 화면 지원 언어 도움말 추가 (접기/펼치기)

**날짜**: 2026-05-05  
**목표**: 초급 학습자가 문제와 미션을 이해할 수 있도록 "모국어 도움말" 접기/펼치기 기능을 추가한다. 전체 UI 번역은 하지 않고, 한국어 지시문을 기본으로 유지하면서 보조 설명만 지원 언어로 제공한다.

### 생성 파일

- `src/components/ui/lang-hint.tsx` — `LangHint` 재사용 컴포넌트.
  - `LangHintItem`: `{ lang: string; text: string }` 타입 (export)
  - `LangHintProps`: `items: LangHintItem[]`, `label?: string` (기본값: `'도움말 보기'`)
  - "▼ 도움말 보기" / "▲ 도움말 닫기" 토글 버튼
  - 펼쳤을 때: `bg-slate-50 border border-slate-100` 배경, 언어 코드 `[EN]` 형식으로 앞에 표시
  - `items` 빈 배열이면 null 렌더링 (조건부 사용 간소화)
  - 모바일 360px에서 카드 높이 과도 증가 없음 — 접힌 상태가 기본

### 수정 파일

#### `src/components/ui/index.ts`
- `LangHint` 컴포넌트 및 `LangHintItem` 타입 re-export 추가

#### `app/student/speaking/[questionId]/speaking-client.tsx`
- `LangHint`, `LangHintItem` import 추가
- `QUESTION_HINTS` 맵 추가 — 질문 ID → `LangHintItem[]`
  - `q-001` (자기소개 기본): EN / VI / JA / AR
  - `q-003` (그림 묘사): EN / VI / JA / AR
  - `q-007` (한국 음식 추천): EN / VI / JA / AR
  - 나머지 질문은 힌트 없음 (hint 없을 경우 아무것도 렌더링 안 함)
- `RECORDING_HINTS` 상수 추가 — 녹음 방법 안내 EN / VI / JA / AR
- 질문 카드 `CardBody` 하단: `QUESTION_HINTS[question.id]` 있을 때 `<LangHint label="모국어 도움말 보기" />` 렌더링
- prep 단계 카드: "준비 시작" 버튼 아래 `<LangHint items={RECORDING_HINTS} label="녹음 방법 도움말" />` 렌더링 (카운트다운 시작 전에만 표시)

#### `app/student/mission/[scenarioId]/mission-client.tsx`
- `LangHint`, `LangHintItem` import 추가
- `SCENARIO_SITUATION_HINTS` 맵 추가 — 시나리오 ID → 상황 설명 `LangHintItem[]`
  - `sc-restaurant-01` (식당): EN / VI / JA / AR
  - `sc-hospital-01` (병원): EN / VI / JA / AR
- `SCENARIO_GOALS_HINTS` 맵 추가 — 시나리오 ID → 전체 목표 요약 `LangHintItem[]`
  - `sc-restaurant-01`: 목표 3개 요약 EN / VI / JA / AR
  - `sc-hospital-01`: 목표 4개 요약 EN / VI / JA / AR
- `CHAT_GUIDE_HINTS` 상수 추가 — 대화 입력 방법 안내 EN / VI / JA / AR
- 미션 정보 카드 `CardBody` 하단: `<LangHint label="모국어 도움말 보기" />` 렌더링
- 미션 목표 패널 `<ul>` 하단: `<LangHint label="목표 도움말 보기" />` 렌더링
- ready 단계 "대화 시작" 버튼 아래: `<LangHint items={CHAT_GUIDE_HINTS} label="대화 방법 도움말" />` 렌더링

### 도움말 구현 방식

- **접기/펼치기**: 기본 닫힌 상태. 버튼 클릭 시 패널 토글.
- **한국어 우선**: 한국어 지시문을 먼저 표시하고, 도움말 패널은 별도 토글로 분리.
- **버튼 라벨 한국어 유지**: "도움말 보기", "도움말 닫기", "모국어 도움말 보기" 등 모두 한국어.
- **언어 표기**: `[EN]`, `[VI]`, `[JA]`, `[AR]` 형식의 앞 표시로 어떤 언어인지 명확히 구분.
- **지원 언어 범위**: mock 학생 데이터 기준 — 영어(EN), 베트남어(VI), 일본어(JA), 아랍어(AR).

### 적용된 화면

| 화면 | 힌트 위치 | 힌트 종류 |
|---|---|---|
| `/student/speaking/q-001` (자기소개) | 질문 카드 하단 | 질문 내용 번역 |
| `/student/speaking/q-003` (그림 묘사) | 질문 카드 하단 | 질문 내용 번역 |
| `/student/speaking/q-007` (음식 추천) | 질문 카드 하단 | 질문 내용 번역 |
| `/student/speaking/[any]` — prep 단계 | 준비 시작 버튼 아래 | 녹음 방법 안내 |
| `/student/mission/sc-restaurant-01` | 미션 정보 카드 하단 | 시나리오 상황 설명 |
| `/student/mission/sc-restaurant-01` | 목표 패널 하단 | 목표 목록 번역 |
| `/student/mission/sc-restaurant-01` | 대화 시작 버튼 아래 | 대화 방법 안내 |
| `/student/mission/sc-hospital-01` | 미션 정보 카드 하단 | 시나리오 상황 설명 |
| `/student/mission/sc-hospital-01` | 목표 패널 하단 | 목표 목록 번역 |

### 모바일 360px 확인 방법

1. `npm run dev` 실행
2. Chrome DevTools → Toggle device toolbar → 360×800 (또는 Galaxy S20) 설정
3. `/student/speaking/q-001?setId=qs-diagnostic-01` 접속 → 질문 카드에서 "모국어 도움말 보기" 확인
4. "도움말 보기" 클릭 → 4개 언어 패널 펼쳐짐 확인
5. "도움말 닫기" 클릭 → 패널 접힘 확인
6. `/student/mission/sc-restaurant-01` 접속 → 미션 정보, 목표, 대화 시작 각 도움말 확인

### 버튼 라벨을 한국어로 유지한 이유

- 학습 목적 유지: 학습자가 한국어 인터페이스에 노출되어 UI 어휘도 학습 기회가 됨
- 범위 명확화: "도움말(보조 설명)만 다국어, 핵심 UI는 한국어"라는 Phase 7-C-lite 설계 원칙
- 전체 번역 금지: 스펙 요구 사항 ("버튼 전체 번역 금지")

### 테스트 결과

- `npm run lint` → 오류 없음 ✓
- `npx tsc --noEmit` → 오류 없음 ✓
- `npm run build` → 빌드 성공 ✓ (14개 라우트, 기존과 동일)

### Known Issues (Phase 7-C-lite 기준)

| 이슈 | 영향 | 해소 예정 |
|---|---|---|
| **힌트 미제공 질문** — q-002, q-004, q-005, q-006, q-008은 힌트 없음 | 소 | Phase 8 이후 콘텐츠 충실화 시 추가 |
| **아랍어 RTL 미처리** — 아랍어 텍스트가 LTR 컨텍스트에서 렌더링됨. 읽기는 가능하나 오른쪽 정렬 없음 | 소 | Phase 8 이후 필요 시 `dir="rtl"` 적용 |
| **미번역 UI 요소** — 토글 버튼("도움말 보기"), 언어 코드("[EN]") 등은 한국어/영어 코드 유지 | 설계 의도 | Phase 7-C-lite 범위 밖 |
| 기존 Phase 7-B-main, 7-A-lite, 6-B5 known issues 모두 유지 | — | 해당 Phase 참고 |

### 다음 단계 제안 (Phase 8-A)

| 항목 | 내용 |
|---|---|
| **Phase 8-A** | ETRI 또는 Whisper STT 실제 API 최소 연동 — 녹음 Blob을 FormData로 서버 Route Handler에 전달 → STT 결과 반환. mock transcript 대체. |
| **Phase 8-B** | Supabase Storage 업로드 — 녹음 Blob을 presigned URL 또는 anon upload로 Storage에 저장, `audio_url` DB 업데이트 |
| **Phase 8-C** | iOS Safari 대응 — MediaRecorder 미지원 환경 감지 후 대안 안내 |
| **Phase 8-D** | 힌트 콘텐츠 확장 — 나머지 질문(q-002~q-008) 및 추가 시나리오 힌트 데이터 보충 |

---

## Phase 7-B-main — 브라우저 마이크 녹음 최소 구현

**날짜**: 2026-05-05  
**목표**: 브라우저 MediaRecorder API를 사용해 학습자 말하기 평가 화면에 실제 녹음 기능을 최소 구현한다. 녹음 파일은 브라우저 메모리 Blob URL로만 관리하며 서버 업로드 없음. 기존 mock 제출 흐름 완전 유지.

### 생성 파일

- `src/hooks/use-audio-recorder.ts` — `useAudioRecorder` 커스텀 훅.
  - `RecorderState`: `'idle' | 'requesting' | 'recording' | 'stopped' | 'error'`
  - `RecorderErrorType`: `'not-supported' | 'permission-denied' | 'permission-dismissed' | 'unknown'`
  - `startRecording()`: `navigator.mediaDevices.getUserMedia` 호출 → MediaRecorder 시작. MIME 우선순위: `audio/webm;codecs=opus` → `audio/webm` → `audio/mp4` → 기본값 (Safari 대응)
  - `stopRecording()`: MediaRecorder 정지 → `onstop` 콜백에서 Blob 조합 → `URL.createObjectURL()` → `blobUrl` 상태 갱신
  - `reset()`: 진행 중 녹음 중지 + 스트림 트랙 release + `URL.revokeObjectURL()` (메모리 누수 방지)
  - `durationSec`: 1초 interval 카운터
  - unmount 시 자동 cleanup (clearInterval + stopStream + revokeObjectURL)

### 수정 파일

- `app/student/speaking/[questionId]/speaking-client.tsx` — 녹음 UI 전면 연결.
  - `useAudioRecorder` 훅 import 및 사용
  - `recording` phase 진입 시 `setTimeout(() => recorder.startRecording(), 0)` 로 MediaRecorder 시작 (effect 내 직접 setState 규칙 준수)
  - recorder.state `'stopped'` / `'error'` 감지 시 `setTimeout(() => setPhase('review'), 0)` 전환
  - `responseTimeSec` 도달 시 `recorder.stopRecording()` 자동 호출
  - `recording` phase 화면: `requesting` → 권한 요청 중 메시지 | `recording` → 녹음 중 타이머 + 완료 버튼 | `error` → 오류 메시지 + mock fallback 안내
  - `review` phase 화면: blobUrl 있으면 `<audio controls>` 재생기 표시 + 녹음 길이 표시
  - `review` phase: recorder.state `'error'`면 warning 배너 표시 (mock 제출 가능 안내)
  - 다시 녹음: `recorder.reset()` 호출 → 기존 Blob URL revoke 후 `recording` phase 재진입
  - 마이크 오류 메시지: `RECORDER_ERROR_MESSAGES` 맵으로 한국어 안내문 표시
  - 버튼 모두 min-h-[44px] (Button 컴포넌트 기본 적용)

- `app/student/speaking/actions.ts` — metadata 파라미터 추가.
  - `SpeakingSubmitMeta` 인터페이스 export (`hasRecording?`, `recordingDurationSec?`)
  - `submitSpeaking(questionId, questionSetId, meta?)` — 3번째 파라미터 optional 추가
  - `record.meta` 에 `{ hasRecording, recordingDurationSec, audioUrl: null }` 포함
  - 기존 mock 제출 흐름 완전 유지. Supabase 저장 경로 변경 없음.

- `docs/spec/WORK_LOG.md` — Phase 7-B-main 항목 추가 (이 문서)

### 녹음 UI 플로우

```
[prep phase]
  준비 시작 버튼 클릭 → 카운트다운 → 자동으로 recording phase
  또는 "준비 완료 — 바로 시작" 클릭 → recording phase

[recording phase]
  마운트 시 recorder.startRecording() 호출
    → requesting: 권한 요청 중 메시지 표시
    → recording: 타이머 + "녹음 완료" 버튼
      ├─ "녹음 완료" 버튼 클릭 → recorder.stopRecording() → review phase
      └─ responseTimeSec 경과 → auto recorder.stopRecording() → review phase
    → error: 오류 메시지 표시 → review phase (mock fallback)

[review phase]
  blobUrl 있으면 <audio controls> 재생기 표시
  error 상태면 warning 배너 + mock 제출 가능 안내
  "다시 녹음" → recorder.reset() + recording phase 재진입 (기존 blobUrl revoke)
  "제출하기" → submitSpeaking(questionId, questionSetId, { hasRecording, recordingDurationSec })
                → result page 리다이렉트
```

### submitSpeaking 파라미터 변경

| 파라미터 | 타입 | 비고 |
|---|---|---|
| `questionId` | string | 기존과 동일 |
| `questionSetId` | string | 기존과 동일 |
| `meta?` | `SpeakingSubmitMeta` | **신규 optional** — hasRecording, recordingDurationSec |

- `meta`는 optional이므로 기존 호출처 영향 없음
- Supabase 저장 로직 변경 없음 (meta는 in-memory record에만 포함)
- audio_url은 여전히 null

### 기존 제출 흐름 영향

- `submitSpeaking` Server Action 시그니처: optional 파라미터 추가만 — 기존 호출은 모두 정상 동작
- mock store (`saveSpeakingEval`) 및 Supabase 저장 경로 변경 없음
- result page 읽기 경로 변경 없음
- 경로 `/student/speaking`, `/student/speaking/q-001`, `/student/speaking/q-001/result` 모두 유지

### 모바일 확인 방법

1. `npm run dev` 실행 후 개발 서버 URL 확인
2. 같은 네트워크의 모바일 기기에서 `http://<개발 PC IP>:3000/student/speaking/q-001?setId=qs-diagnostic-01` 접속
3. "준비 시작" → 카운트다운 → recording phase 진입 시 마이크 권한 팝업 확인
4. Android Chrome: MediaRecorder 정상 동작 확인
5. iOS Safari: MediaRecorder 지원 제한으로 오류 메시지 → mock fallback 동작 확인 (Known Issue)

### 테스트 결과

- `npm run lint` → 오류 없음 ✓
- `npx tsc --noEmit` → 오류 없음 ✓
- `npm run build` → 빌드 성공 ✓ (14개 라우트, 기존과 동일)

### Known Issues (Phase 7-B-main 기준)

| 이슈 | 영향 | 해소 예정 |
|---|---|---|
| **iOS Safari MediaRecorder 지원 제한** — iOS 14.3 이하에서 MediaRecorder 미지원, 일부 iOS 버전에서 `audio/webm` 미지원 | 중 | Phase 8-A 또는 iOS 전용 대안 검토 |
| **녹음 파일 서버 미업로드** — blobUrl은 브라우저 메모리에만 존재, 페이지 이탈 시 소멸 | 중 | Phase 8-B (Supabase Storage 연동) |
| **audio_url null** — Supabase `speaking_submissions.audio_url` 저장 안 됨 | 중 | Phase 8-B |
| **STT 미연동** — 실제 녹음 파일을 STT에 전달하지 않고 mock transcript 사용 | 중 | Phase 8-A |
| 기존 Phase 7-A-lite, 6-B5 known issues 모두 유지 | — | 해당 Phase 참고 |

### 다음 단계 제안 (Phase 8-A)

| 항목 | 내용 |
|---|---|
| **Phase 8-A** | ETRI 또는 Whisper STT 실제 API 최소 연동 — 녹음 Blob을 FormData로 서버 Route Handler에 전달 → STT 결과 반환. mock transcript 대체. |
| **Phase 8-B** | Supabase Storage 업로드 — 녹음 Blob을 presigned URL 또는 anon upload로 Storage에 저장, `audio_url` DB 업데이트 |
| **Phase 8-C** | iOS Safari 대응 — MediaRecorder 미지원 환경 감지 후 대안 안내 (녹음 없이 텍스트 입력 또는 외부 도구 안내) |

---

## Phase 7-A-lite — 학습자 화면 모바일 반응형 보완 (레이아웃 & 터치 타깃)

**날짜**: 2026-05-04  
**목표**: 학습자 화면에서 모바일(360px~767px) 환경의 기본 사용성 확보. 마이크 녹음·Supabase·Auth·API 구현 없음.

### 수정 파일

- `src/components/layout/sidebar.tsx` — 모바일 하단 내비게이션 추가
- `src/components/layout/app-shell.tsx` — 모바일 본문 패딩 조정
- `src/components/ui/button.tsx` — 터치 타깃 최소 높이 확보

### 모바일 보완 내용

#### 1. 모바일 하단 내비게이션 (`sidebar.tsx`)

- 기존 `<aside>`는 `hidden md:flex`로 데스크톱 전용 유지
- `md:hidden fixed bottom-0 inset-x-0 z-50` 하단 탭바 추가
  - 역할별 navItems를 탭으로 렌더링 (`flex-1`, `min-h-[44px]`)
  - 활성 탭: `text-primary-700 font-semibold`
  - disabled 탭: `opacity-40 cursor-not-allowed`
  - iOS safe-area 대응: `style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}`

#### 2. 본문 하단 여백 (`app-shell.tsx`)

- `p-6` → `p-4 pb-16 md:p-6`
  - 모바일에서 고정 하단 탭바(약 52px)에 본문 콘텐츠가 가려지지 않도록 `pb-16` 추가
  - 데스크톱(md 이상)은 `p-6`으로 기존 동작 유지

#### 3. 버튼 터치 타깃 (`button.tsx`)

- `size="md"`: `min-h-[44px]` 추가
- `size="lg"`: `min-h-[44px]` 추가
- `size="sm"`: 변경 없음 (인라인 보조 버튼 용도 유지)
- iOS HIG / Android Material 권장 터치 타깃 44px 기준 준수

### 확인 화면

| 화면 | 경로 | 상태 |
|---|---|---|
| 말하기 평가 목록 | `/student/speaking` | 정적 빌드 ○ |
| 말하기 평가 녹음 | `/student/speaking/q-001` | 동적 ƒ |
| 말하기 평가 결과 | `/student/speaking/q-001/result` | 동적 ƒ |
| 미션 대화 목록 | `/student/mission` | 정적 빌드 ○ |
| 미션 대화 진행 | `/student/mission/sc-restaurant-01` | 동적 ƒ |
| 미션 대화 결과 | `/student/mission/sc-restaurant-01/result` | 동적 ƒ |

### 테스트 결과

- `npm run lint` → 오류 없음 ✓
- `npx tsc --noEmit` → 오류 없음 ✓
- `npm run build` → 빌드 성공 ✓ (14개 라우트, 기존과 동일)

### Known Issues (Phase 7-A-lite 기준)

| 이슈 | 영향 | 해소 예정 |
|---|---|---|
| **모바일 녹음 미구현** — mock 제출만 동작 | 중 | Phase 7-B |
| **모바일 탭바 아이콘 없음** — 텍스트 레이블만 표시 | 낮 | Phase 7-A (full) |
| **말하기 녹음 UI 모바일 레이아웃 미세 조정 미완** — 320px에서 일부 버튼 잘릴 수 있음 | 낮 | Phase 7-A (full) |
| 기존 Phase 6-B5 known issues 모두 유지 | — | 해당 Phase 참고 |

---

## Phase 6-B5 — Supabase 저장 연동 점검 및 파일럿 출시판 문서화

**날짜**: 2026-05-04  
**목표**: Phase 6-B2~B4 완료 기준으로 Supabase 저장 연동 상태를 점검하고, 파일럿 출시판 기준의 현재 저장 흐름·known issue·다음 단계 계획을 문서화한다. 코드 변경 없음.

### 수정 파일

- `docs/spec/WORK_LOG.md` — Phase 6-B5 항목 추가 (이 문서)
- `docs/spec/PILOT_RELEASE_PLAN.md` — D+5 완료 상태 반영, Phase 6-B5 이후 D+10 방향 체크리스트 추가
- `docs/spec/SUPABASE_SCHEMA.md` — RLS 임시 disable 현황과 Phase 9 이후 재활성화 계획 보강

### Supabase 저장 연동 현황 (Phase 6-B5 기준)

#### 저장 성공 항목 (REPOSITORY_PROVIDER=supabase 기준)

| 테이블 | 저장 경로 | 구현 파일 | 완료 Phase |
|---|---|---|---|
| `speaking_submissions` | `/student/speaking/[questionId]` 제출 | `supabase-submission-repository.ts` | 6-B2 |
| `ai_evaluations` (speaking) | speaking 제출 시 함께 저장 | `supabase-submission-repository.ts` | 6-B2 |
| `teacher_reviews` | `/teacher/submissions/[id]` 채점 확정 | `supabase-teacher-review-repository.ts` | 6-B3 |
| `mission_submissions` | 미션 대화 완료·제출 시 | `supabase-mission-repository.ts` | 6-B4 |
| `ai_evaluations` (mission) | mission 제출 시 함께 저장 | `supabase-mission-repository.ts` | 6-B4 |

#### 전체 저장 흐름 요약

```
[말하기 평가 제출]
submitSpeaking(questionId, questionSetId)   ← Server Action
  ├─ [항상]    saveSpeakingEval()           → mock store (result 페이지 read 의존)
  └─ [supabase] SupabaseEvaluationRepository.saveSpeakingEvalRecord()
                  ├─ ensurePilotClass / ensurePilotStudent / ensureQuestion / ensureQuestionSet
                  ├─ INSERT speaking_submissions → DB UUID
                  └─ INSERT ai_evaluations (submission_type='speaking')

[교수자 채점 확정]
finalizeTeacherEvaluation(submissionId, ...)  ← Server Action
  ├─ [항상]    storeFinalize()              → mock store (page read 의존)
  └─ [supabase] SupabaseTeacherReviewRepository.finalizeReview()
                  ├─ _reviewIdCache hit   → UPDATE teacher_reviews
                  └─ _reviewIdCache miss  → INSERT teacher_reviews (submission_id: placeholder UUID)

[미션 대화 제출]
submitMission(sessionId)                      ← Server Action
  ├─ [항상]    saveMissionSubmission()        → mock store (result 페이지 read 의존)
  └─ [supabase] SupabaseMissionRepository.createMissionSubmission()
                  ├─ ensurePilotClass / ensurePilotStudent / ensureScenario
                  ├─ INSERT mission_submissions → DB UUID
                  └─ INSERT ai_evaluations (submission_type='mission')
```

#### mock fallback 유지 항목

- `REPOSITORY_PROVIDER=mock`(미설정 시 기본값)일 때 기존 mock 경로만 실행, DB 호출 없음
- Supabase 저장 실패 시: `console.error` 출력 후 화면은 mock store 기반으로 정상 표시
- result 페이지 URL은 여전히 mock submissionId 기반 (Supabase UUID와 미연결)

### Known Issues (Phase 6-B5 기준)

| 이슈 | 영향 | 해소 예정 |
|---|---|---|
| **RLS 임시 disable** — 모든 테이블 RLS 비활성화 상태 | 높 (데이터 보호 없음) | Phase 9 (Supabase Auth 도입 시) |
| **Auth 미구현** — pilot student / pilot class 고정 | 높 | Phase 9 |
| **음성 파일 저장 없음** — audio_url / duration_sec null | 중 | Phase 7-B (Storage 연동) |
| **mission result URL이 mock sessionId 기반** — Supabase UUID 미연결 | 중 | Phase 9 이후 read 경로 통합 시 |
| **teacher_reviews.submission_id placeholder UUID** — speaking_submissions와 미연결 | 중 | Phase 9 (실제 submission_id 매핑) |
| **teacher 제출 목록 미 DB화** — `/teacher/submissions` 목록이 mock data.ts 직독 | 중 | Phase 6-C 또는 Phase 9 |
| **관리자 대시보드 mock 중심** — Supabase 집계 미구현 | 낮 | Phase 9+ |
| **세션 서버 재시작 소실** — MissionSession / SpeakingEvalRecord in-memory | 중 | Phase 9+ |
| **Bootstrap race condition** — pilot class/student 동시 중복 insert 가능 | 낮 | Phase 9 (Auth 후 자연 해소) |
| **iOS 모바일 녹음 미구현** — mock 녹음 fallback 사용 | 중 | Phase 7-B |
| **ai_evaluation_id null** — teacher_reviews의 ai_evaluation_id가 null 저장 | 중 | Phase 9 (UUID 매핑 구조 추가 시) |

### 다음 단계 계획 (D+10 방향)

| Phase | 날짜 목표 | 핵심 작업 |
|---|---|---|
| **Phase 7-A** | D+6~7 | 학습자 화면 반응형 UI 보완 (360px, 모바일 사이드바) |
| **Phase 7-B** | D+7~9 | 브라우저 마이크 녹음 최소 구현 (MediaRecorder, 권한 처리) |
| **Phase 8-A** | D+10 | ETRI 또는 Whisper STT 실제 API 최소 연동 |
| **Phase 9** | D+12+ | Supabase Auth / 역할 분기 / RLS 정책 활성화 |
| **Phase 10** | D+13+ | Vercel 배포 |
| **Phase 11** | D+14~15 | 파일럿 테스트 준비, 기기별 수동 테스트 |

### D+5 달성 여부 체크리스트

- [x] `speaking_submissions` Supabase 저장 성공 (Phase 6-B2)
- [x] `ai_evaluations` (speaking) Supabase 저장 성공 (Phase 6-B2)
- [x] `teacher_reviews` Supabase 저장 성공 (Phase 6-B3)
- [x] `mission_submissions` Supabase 저장 성공 (Phase 6-B4)
- [x] `ai_evaluations` (mission) Supabase 저장 성공 (Phase 6-B4)
- [x] `REPOSITORY_PROVIDER=supabase`로 전환 시 모든 핵심 write 경로 DB 저장 동작
- [x] `REPOSITORY_PROVIDER=mock` 기존 동작 완전 유지
- [x] 저장 실패 시 화면 중단 없는 graceful degradation
- [x] 각 단계별 lint / tsc / build 통과
- [ ] RLS 기본 정책 설정 — Phase 9(Auth 도입)으로 연기 (파일럿 단계에서 임시 disable 허용)
- [ ] 교수자 제출 목록 DB 기반 조회 — Phase 6-C 또는 Phase 9로 연기

**D+5 핵심 목표 달성**: 모든 핵심 write 경로(말하기 제출·AI 평가·교수자 채점·미션 제출) Supabase DB 저장 연동 완료.

### 테스트 결과

- `npm run lint` → 오류 없음 ✓ (문서 전용 Phase, 코드 변경 없음)
- `npx tsc --noEmit` → 오류 없음 ✓
- `npm run build` → 빌드 성공 ✓ (14개 라우트, 기존과 동일)

---

## Phase 6-B4 — 학습자 미션 대화 Supabase 저장 연동

**날짜**: 2026-05-04  
**목표**: 학습자가 미션 대화를 완료·제출했을 때 Supabase `mission_submissions` + `ai_evaluations` 테이블에 저장. REPOSITORY_PROVIDER=mock 기존 동작 완전 유지.

### 생성 파일

- `src/lib/repositories/supabase-mission-repository.ts` — `SupabaseMissionRepository` 구현체.
  - 세션 관리(`createSession` / `getSession` / `updateSession` / `getMissionSubmission`)는 in-memory mock store 위임 (세션은 여전히 임시 메모리 저장).
  - `createMissionSubmission`: `ensurePilotClass` → `ensurePilotStudent` → `ensureScenario` 순서로 FK 앵커 보장 후 `mission_submissions` INSERT → `ai_evaluations` INSERT.
  - 실패 시 throw 없이 `console.error('[supabase] mission_submission save failed')` 출력 후 early return.
  - 성공 시 `console.info('[supabase] mission_submission saved: <uuid>')` 출력.

### 수정 파일

- `src/lib/repositories/index.ts`
  - `SupabaseMissionRepository` import 추가.
  - `getMissionRepository()` — REPOSITORY_PROVIDER=supabase일 때 `SupabaseMissionRepository` 반환.
  - 더 이상 사용되지 않는 `warnNotImplemented` 함수·`_notImplementedWarned` Set 제거 (모든 repository에 Supabase 구현체 완비됨).
- `app/student/mission/actions.ts`
  - `getMissionRepository` import 추가.
  - `submitMission` — mock store 항상 먼저 기록(`saveMissionSubmission`) + REPOSITORY_PROVIDER=supabase일 때 `getMissionRepository().createMissionSubmission(submission)` 추가 시도. 실패 시 repository 내부에서 처리. .env.local 값 절대 미출력.
- `docs/spec/WORK_LOG.md` — Phase 6-B4 항목 추가.

### mission_submissions 저장 흐름

```
submitMission(sessionId)   ← Server Action (mission-client.tsx)
  │
  ├─ [항상] saveMissionSubmission(submission)      → mock store (result page read path 의존)
  │
  └─ [REPOSITORY_PROVIDER=supabase일 때만]
       getMissionRepository()                       → SupabaseMissionRepository
         └─ createMissionSubmission(submission)
              ├─ ensurePilotClass()                → classes 테이블 select-or-insert
              ├─ ensurePilotStudent(classId)        → students 테이블 select-or-insert
              ├─ ensureScenario(scenarioId)          → mission_scenarios 테이블 upsert (JSON 시드)
              ├─ INSERT mission_submissions          → DB UUID 획득
              │   console.info '[supabase] mission_submission saved: <uuid>'
              └─ INSERT ai_evaluations              → submission_type='mission', scores JSONB에 평가 전체 포함
```

### 파일럿 컨텍스트 bootstrap 전략

- 기존 `supabase-submission-repository.ts`와 동일한 패턴: PILOT_CLASS_NAME / PILOT_STUDENT_ANON_ID 고정.
- module-level 캐시 변수 (`_pilotClassId`, `_pilotStudentId`, `_seededScenarioIds`) 독립 유지.
- `mission_scenarios` FK: `mission-goals.json`에서 직접 upsert. onConflict: 'id' (text PK이므로 멱등).

### ai_evaluations 저장 내용 (mission)

| 컬럼 | 값 |
|---|---|
| `submission_id` | mission_submissions UUID |
| `submission_type` | `'mission'` |
| `scores` (jsonb) | `{ missionAchievementRate, taskCompletion, conversationNaturalness, expressionAppropriateness, strengths, improvements, metadata: { source: 'pilot', mockSubmissionId } }` |
| `total_score` | `evaluation.overallScore` |
| `normalized_score` | `evaluation.overallScore / 100` |
| `feedback` | `'강점: ... | 보완: ...'` |
| `provider_name` | `'mock'` |
| `evaluated_at` | `evaluation.evaluatedAt` |

### REPOSITORY_PROVIDER=mock일 때 영향

**영향 없음.** Supabase 저장 블록은 `process.env.REPOSITORY_PROVIDER === 'supabase'` 조건으로 완전 분기. mock 모드에서는 기존 `saveMissionSubmission()` 경로만 실행.

### REPOSITORY_PROVIDER=supabase 전환 후 테스트 방법

1. `.env.local`에서 `REPOSITORY_PROVIDER=supabase` 확인 (SUPABASE URL/KEY 설정 완료 전제)
2. `npm run dev` 실행
3. `/student/mission/sc-restaurant-01` 접속 → 대화 완료 → "결과 보기" 버튼 클릭
4. 서버 콘솔에서 확인:
   ```
   [supabase] mission_submission saved: <uuid>
   ```
5. Supabase Dashboard → Table Editor → `mission_submissions` 에서 새 row 확인:
   - `scenario_id: 'sc-restaurant-01'`
   - `status: 'submitted'`
   - `turns` JSONB에 대화 전체 기록 확인
   - `goals` JSONB에 목표 달성 여부 확인
6. `ai_evaluations` → `submission_type='mission'` row 확인:
   - `total_score`, `scores` JSONB에 평가 결과 확인

### 테스트 결과

- `npm run lint` → 오류 없음 ✓
- `npx tsc --noEmit` → 오류 없음 ✓
- `npm run build` → 빌드 성공 ✓ (14개 라우트, 기존과 동일)

### Known Issues

1. **세션 미저장**: `createSession` / `updateSession` 은 여전히 mock store에만 저장. 서버 재시작 시 진행 중 세션 소실. Phase 9+에서 Supabase로 교체 예정.
2. **result URL mock ID 사용**: Supabase UUID 대신 mock submissionId(`mission-sub-sc-restaurant-01-...`)가 result URL에 사용됨. result 페이지가 mock store에서 읽어야 실제 평가 결과가 보이므로, Supabase UUID로 교체하려면 result 페이지에 Supabase read 경로 추가 필요.
3. **파일럿 student/class 단일 고정**: Auth 미구현으로 모든 미션 제출이 동일한 pilot student에 귀속됨. Phase 7(Auth) 후 교체 필요.
4. **pilot 캐시 중복**: `supabase-submission-repository.ts`와 독립된 module-level 캐시 유지. 서버 재시작 시 두 모듈 모두 pilot class/student 재조회. 기능 동작에 영향 없음.

### 다음 단계 제안 (Phase 6-C 또는 7-A)

1. Teacher 제출 목록에서 미션 제출을 Supabase DB에서 읽어오는 read 경로 구현
2. Supabase Auth 연동으로 실제 student_id 사용
3. mission result 페이지에 Supabase read 경로 추가 (UUID 기반 URL 지원)

---

## Phase 6-B3 — 교수자 채점 Supabase 저장 연동

**날짜**: 2026-05-04  
**목표**: 교수자가 채점 상세 화면에서 루브릭 점수·피드백을 확정했을 때 Supabase `teacher_reviews` 테이블에 저장. REPOSITORY_PROVIDER=mock 기존 동작 완전 유지.

### 생성 파일

- `src/lib/repositories/supabase-teacher-review-repository.ts` — `SupabaseTeacherReviewRepository` 구현체. `saveDraft` / `finalizeReview` → `teacher_reviews` INSERT or UPDATE. 실패 시 throw (caller가 catch). 모든 에러는 secrets 없이 로그.

### 수정 파일

- `src/lib/repositories/index.ts` — `getTeacherReviewRepository()` 에서 REPOSITORY_PROVIDER=supabase일 때 `SupabaseTeacherReviewRepository` 반환. `SupabaseTeacherReviewRepository` import 추가. `warnNotImplemented('TeacherReviewRepository')` 제거.
- `app/teacher/submissions/[id]/actions.ts` — `saveTeacherDraft` / `finalizeTeacherEvaluation` 모두: mock store 항상 먼저 기록 + REPOSITORY_PROVIDER=supabase일 때 `getTeacherReviewRepository()` 로 Supabase 저장 시도. 성공 시 `[supabase] teacher_review saved: <uuid>`, 실패 시 `[supabase] teacher_review save failed` 출력. .env.local 값 절대 미출력.
- `docs/spec/WORK_LOG.md` — Phase 6-B3 항목 추가.

### teacher_reviews 저장 흐름 요약

```
finalizeTeacherEvaluation(submissionId, aiEvaluationId, draft)   ← Server Action (grading-wizard.tsx)
  │
  ├─ [항상] storeFinalize(...)         → mock store (page read path 의존)
  │
  └─ [REPOSITORY_PROVIDER=supabase일 때만]
       getTeacherReviewRepository()     → SupabaseTeacherReviewRepository
         └─ finalizeReview(...)
              ├─ _reviewIdCache.get(submissionId)
              │   ├─ hit  → UPDATE teacher_reviews SET ... WHERE id = <cached>
              │   └─ miss → INSERT teacher_reviews (submission_id: randomUUID(), ...)
              │              _reviewIdCache.set(submissionId, row.id)
              └─ return TeacherEvaluation
```

### Upsert 전략 (unique constraint 없는 테이블)

`teacher_reviews`에 (submission_id, teacher_id) unique constraint가 없으므로 DB 레벨 upsert 불가.  
대신 module-level `_reviewIdCache: Map<mockSubmissionId, dbReviewId>` 로 서버 프로세스 내 row UUID를 캐시:
- 최초 write → INSERT → row.id 캐시
- 이후 write → UPDATE WHERE id = cached

캐시는 서버 재시작 시 초기화됨 → 재시작 후 같은 제출에 대한 새 INSERT 발생. 파일럿 단계에서 허용.

### submission_id 처리

`teacher_reviews.submission_id`는 `uuid NOT NULL`이지만 **FK constraint 없음**.  
Mock submission ID(sub-001 등)는 UUID가 아니므로, INSERT 시 `randomUUID()`로 생성한 placeholder UUID를 사용.  
이 UUID는 `speaking_submissions` 테이블과 연결되지 않음 — 파일럿 Known Issue.

### REPOSITORY_PROVIDER=mock일 때 영향

**영향 없음.** Supabase 저장 블록은 `process.env.REPOSITORY_PROVIDER === 'supabase'` 조건으로 완전 분기. mock 모드에서는 `storeSaveDraft` / `storeFinalize` 직접 호출만 실행.

### REPOSITORY_PROVIDER=supabase 전환 후 테스트 방법

1. `.env.local`에서 `REPOSITORY_PROVIDER=supabase` 확인 (SUPABASE URL/KEY 설정 완료 전제)
2. `npm run dev` 실행
3. `/teacher/submissions/sub-002` 접속 → 루브릭 점수 조정 → "최종 확정 ✓" 버튼 클릭
4. 서버 콘솔에서 확인:
   ```
   [supabase] teacher_review saved: <uuid>
   ```
5. Supabase Dashboard → Table Editor → `teacher_reviews` 에서 새 row 확인:
   - `is_finalized: true`, `finalized_at` 기록됨
   - `scores` JSONB에 루브릭별 점수 확인
6. sub-001 (이미 teacher_reviewed 상태)에서도 확정 가능 — 두 번째 클릭 시 UPDATE 확인
7. sub-003 (finalized) → 위저드가 readonly — 저장 시도 없음

### 테스트 결과

- `npm run lint` → 오류 없음 ✓
- `npx tsc --noEmit` → 오류 없음 ✓
- `npm run build` → 빌드 성공 ✓ (14개 라우트, 기존과 동일)

### Known Issues

1. **submission_id UUID ↔ mock ID 불일치**: `teacher_reviews.submission_id`는 placeholder UUID. `speaking_submissions` 테이블과 연결되지 않음. Phase 7(Auth + 실제 제출 흐름 통합) 후 교체 필요.
2. **ai_evaluation_id null**: Mock AI eval ID가 Supabase ai_evaluations에 없으므로 null 저장. Phase 6-B2로 생성된 실제 AI eval UUID를 연결하려면 별도 매핑 구조 필요.
3. **캐시 휘발성**: 서버 재시작 시 `_reviewIdCache` 초기화 → 같은 mock submission에 대한 새 INSERT. 구DB row는 잔류. 파일럿 수용 범위.
4. **saveTeacherDraft UI 미연결**: actions.ts에 구현됐으나 현재 grading-wizard.tsx가 호출하지 않음 (초안 저장 버튼 없음). finalizeTeacherEvaluation만 실제 동작.

### 다음 단계 제안 (Phase 6-B4)

1. `mission_submissions` / `MissionRepository` Supabase 구현 (`SupabaseMissionRepository`)
2. Teacher 제출 목록을 Supabase에서 읽어오는 read 경로 구현 (현재는 mock data.ts 직독)

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

---

## Phase 8-A — STT Route 최소 연동

**날짜**: 2026-05-05
**목표**: 녹음된 음성을 서버 route로 전달하고, STT provider 구조를 통해 mock 또는 실제 STT 호출이 가능하도록 최소 연동. 실제 API 실패 시 mock fallback 유지.

### 생성 파일
- `app/api/stt/route.ts` — STT API route (POST, FormData 수신)

### 수정 파일
- `src/providers/stt/index.ts` — `WhisperSTTProvider` placeholder 추가 (STT_PROVIDER=whisper 분기)
- `app/student/speaking/actions.ts` — `SpeakingSubmitMeta`에 `sttTranscript`, `sttProviderName` 추가; 클라이언트 제공 transcript 사용
- `app/student/speaking/[questionId]/speaking-client.tsx` — `handleSubmit`에서 `/api/stt` 호출 후 transcript를 `submitSpeaking`에 전달

### STT route 구조 (`app/api/stt/route.ts`)

```
POST /api/stt
  Content-Type: multipart/form-data
  Body: audio (Blob/File)

Response:
  { transcript, confidence, providerName, latencyMs, source: 'stt' | 'mock-fallback' }
```

- FormData에서 `audio` 필드를 추출해 `Blob`으로 변환
- `getSTTProvider().transcribe(blob)` 호출
- 성공 시 `[provider_events] stt.success` 콘솔 기록 (Phase 8-B+에서 DB 저장 예정)
- 실패 시 mock transcript 반환 (`source: 'mock-fallback'`)

### Provider 분기 방식 (`src/providers/stt/index.ts`)

| STT_PROVIDER 값 | 동작 |
|---|---|
| `mock` (기본) | `MockSTTProvider` — 500ms 지연 후 고정 mock 문장 반환 |
| `whisper` | `WhisperSTTProvider` — OPENAI_API_KEY 없으면 즉시 throw → route에서 mock fallback |
| 기타 값 | `MockSTTProvider` (default case) |

`WhisperSTTProvider`는 키가 없거나 구현 전이면 throw하도록 설계. `/api/stt` route의 try-catch가 mock fallback을 반환함.

### 녹음 Blob 전달 방식

1. 클라이언트: `recorder.blobUrl` (브라우저 메모리 Blob URL)
2. `fetch(recorder.blobUrl)` → `response.blob()` 로 Blob 복원
3. `FormData.append('audio', blob, 'recording.webm')` 로 래핑
4. `fetch('/api/stt', { method: 'POST', body: formData })` 전송
5. 서버: `request.formData().get('audio')` → `arrayBuffer()` → `Blob` 재구성

### mock fallback 조건

| 상황 | 동작 |
|---|---|
| `recorder.blobUrl` 없음 (녹음 실패/미진행) | STT 호출 건너뜀, `submitSpeaking`에서 mock STT 호출 |
| `fetch(recorder.blobUrl)` 실패 | try-catch 내 무시, `sttTranscript=undefined`로 서버에 전달 |
| `/api/stt` HTTP 오류 (`!sttRes.ok`) | `sttTranscript=undefined`로 서버에 전달 |
| `/api/stt` 내 STT provider throw | route catch → `source: 'mock-fallback'` 반환 |
| `meta?.sttTranscript` 없음 | `submitSpeaking` 서버에서 직접 mock STT 호출 |

모든 경우에 사용자는 제출을 계속할 수 있음.

### Supabase 저장 흐름 영향
- 변경 없음. `saveSpeakingEvalRecord(record)` 호출 구조 동일.
- `record.sttResult.transcript`에 클라이언트 제공 transcript가 들어감.
- `REPOSITORY_PROVIDER=supabase`일 때 ai_evaluations에 실제 transcript 저장됨.

### known issues
- iOS Safari에서 `MediaRecorder`가 `audio/mp4`로 녹음됨. `/api/stt`는 MIME type을 그대로 전달하므로, Whisper 등 실제 STT 연동 시 iOS 녹음 파일 처리 여부를 확인해야 함.
- `blobUrl`은 브라우저 메모리에만 존재. 페이지 이동/리로드 시 소멸. STT 호출은 review phase에서 "제출하기" 클릭 시 즉시 수행됨.
- `WhisperSTTProvider`는 구현체 없음. Phase 8-B에서 실제 API 호출 구현 예정.

### lint 결과
- `npm run lint` → 에러 0, 경고 0

### tsc 결과
- `npx tsc --noEmit` → 에러 0

### build 결과
- `npm run build` → 빌드 성공
- `/api/stt` 라우트가 `ƒ (Dynamic)` 서버 렌더 라우트로 등록됨

---

## Phase 8-I — 말하기 평가 자동 Smoke Test 추가 (2026-05-05)

### 목표
API key 없이도 핵심 API 흐름과 화면 렌더링이 깨지지 않는지 자동 확인.

### 추가/수정 파일

| 파일 | 내용 |
|---|---|
| `playwright.config.ts` | Playwright 설정, webServer(next dev :3099), api/chromium 프로젝트 분리 |
| `tests/smoke/api-smoke.spec.ts` | API smoke 테스트 6개 |
| `tests/smoke/mobile-speaking.spec.ts` | 모바일 E2E 테스트 4개 (브라우저 필요) |
| `package.json` | `test:smoke`, `test:smoke:api`, `test:e2e` 스크립트 추가 |
| `docs/spec/PILOT_RELEASE_PLAN.md` | 자동 테스트 범위·한계 기록 |

### 테스트 구성

#### API smoke (`tests/smoke/api-smoke.spec.ts`) — 브라우저 불필요
Playwright `request` 픽스처로 HTTP 요청만 발송. `--project=api`로 실행.

| 테스트 | 확인 내용 |
|---|---|
| `POST /api/pronunciation` 빈 오디오 | `normalizedScore` 숫자, `providerName` 문자열 반환 |
| `POST /api/pronunciation` 잘못된 form data | 200(mock fallback) 또는 400 반환 |
| `POST /api/evaluate-speaking` transcript+pronunciation | `overall_score`, `providerName`, `status` 포함 |
| `POST /api/evaluate-speaking` 빈 body | mock fallback `overall_score` 반환 |
| `POST /api/evaluate-speaking` 파싱 불가 바디 | 400 + `{ error: 'invalid_json' }` 반환 |
| `GET /api/health` | 200 반환 |

#### E2E smoke (`tests/smoke/mobile-speaking.spec.ts`) — Chromium 필요
viewport 360×800px 기준 말하기 평가 페이지 렌더링 확인.

| 테스트 | 확인 내용 |
|---|---|
| `/student/speaking/q-001` 로드 | 문제 제목·프롬프트 표시 |
| 준비 시작 버튼 viewport 확인 | `x + width ≤ 360` |
| MediaRecorder 미지원 fallback | 화면 crash 없이 렌더링 |
| 준비 시작 클릭 후 카운트다운 | "준비 시간" + "준비 완료" 버튼 표시 |

### 실행 결과 (2026-05-05)

```
npm run test:smoke:api   → 6 passed ✓ (브라우저 불필요, 로컬 확인 완료)
npm run test:smoke       → E2E 4개: WSL2 시스템 의존성 필요 (하단 참고)
```

#### WSL2 E2E 실행 조건
Playwright Chromium headless shell이 `libnspr4`, `libnss3`, `libasound2` 등 시스템 라이브러리를 요구함.
WSL2 환경에서 다음 명령 1회 실행 후 E2E 테스트 실행 가능:
```bash
sudo npx playwright install-deps chromium
```

### 자동화하지 않은 항목 (수동 통합테스트로 유지)
- 실제 iPhone Safari 녹음 (마이크 권한 허용/거부 실기기 확인)
- 실제 Whisper STT 품질 (전사 정확도)
- 실제 ETRI 발음평가 품질 (점수 정확도)
- 실제 LLM 채점 품질 (루브릭 점수 타당성)
- provider_events / ai_evaluations Supabase 실제 저장 확인
- Android / iPad 레이아웃 수동 확인

### lint / tsc / build
- `npm run lint` → 에러 0
- `npx tsc --noEmit` → 에러 0
- `npm run build` → 빌드 성공

---

## Phase 8-H — TTS/음성 안내 구조 추가 (2026-05-05)

### 목표
학습자 말하기 평가 화면에 실제 전환 가능한 TTS provider 구조와 브라우저 fallback을 추가한다.

### 추가/수정 파일

| 파일 | 내용 |
|---|---|
| `src/types/providers.ts` | `TTSResult`에 `audioData?: Uint8Array`, `mimeType?: string` 추가 |
| `src/providers/tts/index.ts` | `OpenAITTSProvider` 추가, `getTTSProvider()` 분기 확장 |
| `app/api/tts/route.ts` | TTS API route 신규 생성 |
| `src/hooks/use-tts.ts` | 클라이언트 TTS hook (base64 audio → speechSynthesis → 에러 순서) |
| `app/student/speaking/[questionId]/speaking-client.tsx` | "문제 듣기", "녹음 안내 듣기" 버튼 추가 |
| `.env.local.example` | `TTS_MODEL`, `TTS_VOICE` placeholder 추가 |
| `tests/smoke/api-smoke.spec.ts` | `/api/tts` smoke 테스트 3개 추가 |
| `tests/smoke/mobile-speaking.spec.ts` | TTS 버튼 표시/클릭 E2E 테스트 추가 |

### TTS provider 구조

```
TTS_PROVIDER=openai + OPENAI_API_KEY → OpenAITTSProvider (실제 TTS, audioData 반환)
TTS_PROVIDER=mock                    → MockTTSProvider (mock URL, audioData 없음)
TTS_PROVIDER=browser (기본)          → BrowserTTSProvider (서버 stub, 클라이언트 speechSynthesis)
```

### /api/tts 응답 구조

```json
// 성공 (OpenAI TTS)
{ "ok": true, "providerName": "openai", "status": "success",
  "audioBase64": "...", "mimeType": "audio/mpeg" }

// fallback (API key 없음 또는 mock)
{ "ok": true, "providerName": "mock", "status": "fallback",
  "fallbackText": "..." }

// 에러 (API 호출 실패)
{ "ok": false, "providerName": "openai", "status": "error",
  "fallbackText": "...", "message": "..." }
```

### 클라이언트 fallback 우선순위

1. `audioBase64` 있음 → `new Audio(data:...)` 재생
2. `fallbackText` 있음 + `window.speechSynthesis` 있음 → speechSynthesis 재생 (ko-KR)
3. 위 둘 다 없거나 실패 → 에러 메시지 텍스트 표시

### 음성 안내 문구

| 버튼 | 내용 |
|---|---|
| 문제 듣기 | `question.prompt` (현재 문제 지문) |
| 녹음 안내 듣기 | "준비가 되면 준비 시작 버튼을 누르세요. 녹음이 시작되면 한국어로 말하세요. 말하기가 끝나면 녹음 완료 버튼을 누르세요. 마지막으로 제출하기 버튼을 눌러 평가를 받으세요." |

### provider_events 기록 항목

| 상황 | provider | status |
|---|---|---|
| OpenAI TTS 성공 | openai | success |
| API key 없음/mock | mock | fallback |
| OpenAI TTS 실패 | openai | error |

### lint / tsc / build
- `npm run lint` → 에러 0
- `npx tsc --noEmit` → 에러 0
- `npm run build` → 빌드 성공
- `npm run test:smoke` → 결과 참조

---

## Phase 10-E-5-A (2026-05-06): dialogue_mission 실제 AI 쌍방 대화 UI 구현

### 구현 내용

**신규 파일:**
- `src/types/dialogue.ts` — DialogueTurn, MissionGoalResult, DialogueMissionPanelStatus 타입 정의
- `src/lib/dialogue-mission.ts` — detectMissionProgress, generateAggregatedTranscript 헬퍼
- `src/providers/conversation/index.ts` (업데이트) — DialogueConversationProvider 인터페이스 + MockDialogueConversationProvider (mission-aware)
- `app/api/dialogue/respond/route.ts` — POST /api/dialogue/respond API route
- `src/components/dialogue-mission-panel.tsx` — DialogueMissionPanel 클라이언트 컴포넌트
- `app/student/speaking/dialogue-actions.ts` — submitDialogue 서버 액션

**수정 파일:**
- `speaking-client.tsx` — placeholder를 DialogueMissionPanel로 교체, aiFirstUtterance 필드 추가
- `page.tsx` — aiFirstUtterance 전달
- `result/page.tsx` — dialogue_mission 결과 안내 메시지 업데이트
- `tests/smoke/auth-routes.spec.ts` — Phase 10-E-5-A 신규 테스트 추가, Phase 10-E-4 테스트 갱신
- `tests/smoke/api-smoke.spec.ts` — /api/dialogue/respond 테스트 9개 추가

### 핵심 구조

**dialogue turn 상태 머신:**
```
idle → ready → recording → recorded → processing → ready (반복)
ready → completed → submitting
```

**short-audio/no-speech guard (dialogue에서도 동일 정책 유지):**
- duration < 2초 또는 blob < 3000 bytes → STT 호출 금지, AI 응답 금지
- no-speech (STT 결과 빈값) → AI 응답 금지, turn 추가 금지

**MockDialogueConversationProvider (mission-aware):**
- beginner-q4: 음료/온도/포장 목표 달성 여부를 all student turns에서 감지 → 빠진 목표 유도
- intermediate-q4: latest student turn에서 수업시간/결석자료/상담 키워드 감지 → 해당 정보 응답
- advanced-q4: latest student turn에서 일정/주제/회의 키워드 감지 → 해당 응답

**DB 저장 전략:**
- dialogueTurns는 aggregated transcript로 변환하여 sttResult.transcript에 저장
- missionGoals 달성률 기반으로 task_completion_score 조정
- 기존 speaking_submissions / ai_evaluations 구조와 호환 (schema 변경 없음)
- dialogueTurns DB 영구 저장은 10-E-6 Known Issue로 유지

### provider_events 기록
- feature: 'conversation', provider: 'mock', status: 'success' | 'fallback'
- metadata: { providerType: 'conversation' }

### 검증 결과
- npm run lint: 에러 0
- npx tsc --noEmit: 에러 0
- npm run build: 성공 (/api/dialogue/respond route 포함)
- npm run test:smoke: 100 passed (기존 89 → 100, +11개)

### 남은 Known Issues (10-E-5-B 이후)
- 실제 OpenAI/Claude conversation provider 연결
- dialogueTurns DB 영구 저장 구조 확정 (별도 테이블 또는 JSONB 컬럼)
- turn별 audioUrl 저장 고도화
- 교수자 화면에서 대화 로그/미션 달성 결과 검토 UI (10-E-5-B)
- missionGoals 판정 품질 개선 (LLM 기반)
- attempt 단위 1~4번 전체 응시 흐름
- ETRI 발음평가 연동
- 모바일 Safari q4 대화형 수동 검증
