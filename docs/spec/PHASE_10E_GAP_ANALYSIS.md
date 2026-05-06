# Phase 10-E-0 전면 갭 분석

**Korean Speaking AI MVP — 평가 설계 정렬 분석**  
**작성일**: 2026-05-05  
**분석자**: Claude (Phase 10-E-0)  
**상태**: 분석 완료 (10-E-0) / P0 처리 완료 (10-E-1, 2026-05-05) / P1-1~P1-4 처리 완료 (10-E-2, 2026-05-05) / 정식 문항 콘텐츠 입력 완료 (10-E-3 콘텐츠, 2026-05-05) / reading 피드백·404·dialogue_mission 재정의 완료 (10-E-3 추가 수정, 2026-05-06) / asset 구조·listenLimit UI·student-safe rendering 완료 (10-E-4, 2026-05-06) / dialogue_mission 단발 녹음→제출 UI 비표시 완료 (10-E-4 추가 수정, 2026-05-06)

**10-E-4 처리 결과 (2026-05-06):**
- ✅ asset registry (`src/content/assessment-assets.ts`) 생성 — 9개 공식 asset, teacher-only 필드 격리
- ✅ `QuestionAssetRenderer` 컴포넌트 — image/chart/audio assetType별 분기 렌더링
- ✅ beginner q2: 식당 사진 placeholder 카드 (학습자 친화적, 개발자 문구 최소화)
- ✅ intermediate q2: 앱 내부 바 차트 — 대면 50% / 온라인 30% / 혼합형 20% 실제 표시
- ✅ advanced q2: 앱 내부 바 차트 — 2024:120명 / 2025:180명 / 2026:260명 실제 표시
- ✅ q3 audio asset 구조 — listenCount state, listenLimit UI ("들은 횟수: 0 / 2"), 음원 미등록 시 disabled
- ✅ listeningScriptForTeacherOnly 비전달 강화 (smoke 검증)
- ✅ aiInformation 비전달 강화 (smoke 검증)
- ✅ dialogue_mission interactive_dialogue 안내 유지
- ✅ teacherOnlyNote / scoringNotes / teacherNotes 학습자 화면 비노출 구조 강화
- ✅ smoke 81 passed (기존 63 + 신규 18)

**10-E-4 추가 수정 처리 결과 (2026-05-06):**
- ✅ q4 dialogue_mission에서 기존 단발 녹음→제출 phase UI(준비 시작/녹음/검토/제출) 완전 비표시
- ✅ `isDialogueMission` 조건 추가 (`typeId === 'qt-dialogue-mission' || evaluationMode === 'interactive_dialogue'`)
- ✅ q4에서 "AI 대화형 평가 준비 중" placeholder 카드 + disabled "AI 대화 준비 중" 버튼 표시
- ✅ q4 질문 카드에 `maxDialogueDurationSec` 대화 제한 시간 표시 추가
- ✅ q4에서 "준비 시간 / 답변 시간" 표시 숨김, "녹음 안내 듣기" TTS 버튼 숨김
- ✅ q1/q2/q3 기존 녹음→제출 흐름 유지 (no-speech/short-audio guard 포함)
- ✅ legacy q-003 route 유지
- ✅ smoke 89 passed (기존 81 + 신규 8)
- 🔜 남은 항목: 실제 식당 사진 교체, 음원 mp3 등록, dialogue_mission AI 대화 UI (10-E-5)

**4번 dialogue_mission (10-E-5-A 처리 완료, 2026-05-06):**
- ✅ DialogueMissionPanel 실제 AI 쌍방 대화 UI 구현 (idle→ready→recording→recorded→processing→ready 상태 머신)
- ✅ /api/dialogue/respond POST route 구현 (server-side aiInformation 처리)
- ✅ MockDialogueConversationProvider — mission-aware 응답 (beginner/intermediate/advanced 각각)
- ✅ missionGoals 달성 감지 (detectMissionProgress, useMemo derived state)
- ✅ short-audio/no-speech guard dialogue turn에서도 동일 정책 유지
- ✅ submitDialogue 서버 액션 — aggregated transcript 기반 평가 + 기존 store 호환
- ✅ dialogueTurns DB 저장: aggregated transcript로 기존 구조 호환 (schema 변경 없음)
- ✅ smoke 102 passed
- 🔜 10-E-6+: 실제 OpenAI/Claude provider, dialogueTurns DB 영구 저장, turn별 audioUrl

**교수자 최종확정 화면 강화 (10-E-5-B 처리 완료, 2026-05-06):**
- ✅ official rubric 동적 로드 (`question.rubricId` → rubrics.json 조회)
- ✅ reading(15점)/material_description(25점)/listening_response(25점)/dialogue_mission(35점) 각각의 rubric item·배점 반영
- ✅ AI 1차 환산 점수(0-100) vs 교수자 원점수(배점 기준) 명확 구분 표시
- ✅ `listeningScriptForTeacherOnly` 교수자 전용 박스 표시 (학생 비공개 유지)
- ✅ `aiInformation` 교수자 전용 박스 표시 (학생 비공개 유지)
- ✅ q4 대화 로그: AI/학생 turn 구분 말풍선 형태로 교수자 화면에 표시
- ✅ q4 missionGoals 달성 현황 패널 (루브릭 조정 2단계에서 표시)
- ✅ `requiredElements`, `modelAnswer`, `teacherNotes` 교수자 검토용 표시
- ✅ 음성 파일 `<audio controls>` player
- ✅ mock 공식 문항 제출 4개 + AI 평가 4개 추가 (official rubric ID 기반)
- ✅ 제출 목록에 "대화 미션" 레이블 + "AI대화" 배지 표시
- ✅ smoke 126 passed (기존 102 + 신규 24)
- 🔜 teacher_reviews RLS 전면 적용
- 🔜 finalized 결과 학생 공개 화면
- 🔜 dialogueTurns DB 영구 저장 구조 (현재 mock)

**대화 정책 분리 및 페르소나 확장 (10-E-5-C/D 처리 완료, 2026-05-06):**
- ✅ `src/lib/dialogue-policy.ts` — assessment/practice mode 정책 분리
- ✅ assessment mode: `allowLanguageHelp: 'limited'`, `maxTurns: 8~10`, `autonomyLevel: 'guided'`
- ✅ practice mode: `allowLanguageHelp: 'full'`, `maxTurns: 14~20`, `autonomyLevel: 'open'`
- ✅ `shouldAnswerLanguageQuestion()` — 언어 질문 패턴 감지 (정규식 17개)
- ✅ assessment mode 문법 질문 → 짧은 확인 + 역할극 복귀
- ✅ practice mode 문법 질문 → 자세한 설명 + 예문
- ✅ `src/lib/personas.ts` — 5개 페르소나 registry (cafe_staff_friendly, admin_staff_clear, event_partner_professional, korean_teacher_coach, friend_casual)
- ✅ `dialectHint` 필드 포함 (standard/seoul/busan/jeolla/gyeongnam) — TTS 억양은 Azure voice 확인 후 후속 구현
- ✅ `src/providers/tts/azure.ts` — `AzureTTSProvider` (SSML ko-KR, SunHiNeural 기본값, level별 rate)
- ✅ Azure key 없으면 예외 → route catch → fallback JSON 반환 (crash 없음)
- ✅ `app/student/conversation-practice/page.tsx` — 생성형 대화연습 placeholder 페이지
- ✅ student nav에 "대화연습 (생성형)" 추가
- ✅ `DialogueConversationInput`에 `mode`, `personaId` 등 추가
- ✅ smoke 142 passed (기존 126 + 신규 16)

**10-E-5-C/D 통합 보정 (2026-05-06):**
- ✅ language question 패턴 27개로 확장 ("어떻게 얘기", "이 표현", "자연스러", "문법", "발음" 등)
- ✅ "여기서 먹고 가려면 어떻게 얘기해야 하죠?" → language question 처리, mission completion 오인 방지
- ✅ `detectMissionProgress()`: language question turn text를 evidence에서 제외 (`missionStudentText()`)
- ✅ `DialogueTurn.intent`: `language_question` | `mission_response` | `other` (client-only, DB schema 변경 없음)
- ✅ `src/lib/audio-validation.ts` — `AudioStats`, `validateRecordedAudio()`, `isLikelySilentAudio()`, `getAudioValidationMessage()`
- ✅ `src/hooks/use-audio-recorder.ts` — AudioContext/AnalyserNode 기반 에너지 분석 (100ms 간격 RMS 샘플링)
- ✅ `src/lib/stt-sanity.ts` — `isLikelySttHallucination()` ("시청해주셔서 감사합니다." 등 YouTube outro 필터)
- ✅ `/api/stt` post-filter — hallucination 감지 시 `transcript: ''`, `warning: 'stt_hallucination_filtered'`
- ✅ q1/q2/q3 speaking-client에 STT hallucination guard 추가 (재녹음 안내)
- ✅ q4 dialogue panel에 hallucination guard 추가 (turn/AI 응답 생성 금지)
- ✅ beginner q2 `src: '/images/official/beginner-restaurant-scene.jpg'` 경로 설정
- ✅ `ImageAssetCard` onError fallback — 파일 없어도 placeholder graceful 전환
- ✅ `public/images/official/` 디렉토리 생성
- ✅ smoke 156 passed (기존 142 + 신규 14)
- 🔜 Azure 실제 키 기반 수동 검증 미완
- 🔜 practice mode 전체 대화 UI (페르소나 카드 클릭 → 대화 시작) 미구현
- 🔜 dialogueTurns DB 영구 저장 미완
- 🔜 attempt 단위 1~4번 전체 응시 흐름 미구현
- 🔜 beginner q2 실제 사진 교체 필요 (파일럿 전, 직접 촬영 또는 사용 허가 이미지)
- 🔜 모바일/브라우저별 무음 threshold 수동 조정 필요
- 🔜 ETRI/Azure 발음평가 비교 미완

**4번 dialogue_mission 구현 방향**: 단발 녹음형으로 최종 운영하지 않음. 생성형 AI 쌍방 대화형 평가로 구현 예정. 실제 AI 대화 UI·대화 로그 저장·missionGoals 달성 평가는 **10-E-5**에서 구현. 현재는 단발 녹음 UI를 숨기고 "준비 중" 상태로 표시하며 `evaluationMode: "interactive_dialogue"` 필드로 명시.

---

## 1. 분석 배경 및 원칙

### 두 관점의 강점

| 관점 | 강점 영역 |
|---|---|
| **첨부 통합문서** | 평가 설계, 4유형 문항 체계, 문항별 배점, 루브릭, required_elements, 교수자 확정 구조, 테스트 체크리스트 |
| **현재 개발본** | 기술 구현(Next.js/Supabase/OpenAI/Vercel), Auth/Role, provider 추상화·fallback, 짧은 녹음 방어, smoke test, STT/발음/LLM provider 구조 |

### 핵심 원칙

1. 평가 내용·루브릭은 첨부문서 기준으로 강화
2. 기술 구조(Next.js App Router, Supabase, provider 추상화, 방어 로직)는 현재 구현 유지
3. 짧은 녹음/무음 방어 로직은 어떤 변경에서도 후퇴 금지

---

## 2. 첨부문서 기준 vs. 현재 구현 갭 분석표

### 2-A. 문항 유형 체계

| 영역 | 첨부문서 기준 | 현재 구현 | 부족한 점 | 유지해야 할 점 | 수정 필요도 | 권장 단계 | 예상 수정 파일 | DB 수동 적용 |
|---|---|---|---|---|---|---|---|---|
| 문항 유형 1 | **낭독** (텍스트 주어짐, 그대로 읽기) — 15점 | 미구현. 해당 typeId 없음 | 유형 자체 없음 | — | **P1** | 10-E-2 | `question-types.json`, `questions.json`, `rubrics.json` | No |
| 문항 유형 2 | **자료 설명** (사진/그래프/표 보고 설명) — 25점 | `qt-picture` (그림묘사)로 부분 대응. 단 배점 20점·사진 없음 | 배점 불일치(20→25), 실제 사진/그래프 asset 없음, required_elements 없음 | qt-picture 구조, imageUrl/Alt/Caption/LicenseNote 필드, next/image 표시 | **P1** | 10-E-2 ~ 10-E-4 | `questions.json`, `rubrics.json`, `public/images/` | No |
| 문항 유형 3 | **듣고 답하기** (음원 제공→청취→답변) — 25점 | **미구현**. 음원 제공 구조 없음, 듣기 스크립트/음원 없음 | 유형 자체 없음, TTS/음원 asset 구조 없음, 스크립트 비공개 구조 없음 | TTS provider 구조(내부 재활용 가능) | **P1** | 10-E-2 ~ 10-E-4 | `question-types.json`, `questions.json`, `rubrics.json`, `/api/tts/route.ts` 활용 | No |
| 문항 유형 4 | **대화 미션** (롤플레이, 3분, 미션 달성형) — 35점 | `/student/mission/[scenarioId]` 별도 라우트로 존재. 단 speaking 평가 세트와 분리됨 | speaking 4문항 세트와 연결 안 됨, 배점 35점 미반영, 미션 달성 여부 판정 기준 없음 | mission 라우트 구조, mission-store, scenarios.json, conversation provider | **P1** | 10-E-2, 10-E-5 | `question-types.json`, `question-sets.json`, mission route 연결 설계 | No |

### 2-B. 수준 체계

| 영역 | 첨부문서 기준 | 현재 구현 | 부족한 점 | 유지해야 할 점 | 수정 필요도 | 권장 단계 | 예상 수정 파일 | DB 수동 적용 |
|---|---|---|---|---|---|---|---|---|
| 수준 분류 | 초급 / 중급 / 고급 3단계 | `difficulty: beginner/intermediate/advanced` 필드 존재. UI 뱃지 표시. | 수준별 평가세트(4문항 묶음)가 없음. 수준 선택 UI 없음. 각 수준별 4유형 문항 데이터 없음 | difficulty 필드, difficultyLabel/Variant UI 로직 | **P1** | 10-E-3 | `question-sets.json`, `questions.json`, `/student/speaking/page.tsx` | No |
| 수준 선택 UX | 학습자가 수준을 먼저 선택 후 평가세트 진입 | 없음. 직접 questionId URL로 진입 | 수준 선택 화면 없음 | 기존 `/student/speaking/page.tsx` 문항 목록 구조 | **P1** | 10-E-3 | `/student/speaking/page.tsx` | No |

### 2-C. 배점 체계

| 영역 | 첨부문서 기준 | 현재 구현 | 부족한 점 | 유지해야 할 점 | 수정 필요도 | 권장 단계 | 예상 수정 파일 | DB 수동 적용 |
|---|---|---|---|---|---|---|---|---|
| 문항별 배점 | 낭독 15 / 자료설명 25 / 듣고답하기 25 / 대화미션 35 = 100점 | 루브릭: 발음·유창성·어휘·문법·과제수행 × 각 20점 = 100점 (5항목 균등 배분) | 문항 유형별 차등 배점 없음. 4문항 합산 100점 구조 없음 | 루브릭 구조(rubric-speaking-01), `rubricId` 파라미터 전달 | **P1** | 10-E-2 ~ 10-E-3 | `rubrics.json`, `evaluate-speaking/route.ts` | No |
| attempt 단위 총점 | 4문항 attempt 단위 합산 100점 | attempt 개념 없음. 문항별 독립 제출만 있음 | attempt 묶음 없음, 4문항 진행 상태 추적 없음 | questionSetId 전달 구조(기존 유지) | **P2** | 10-E-6 이후 | `question-sets.json`, Supabase schema, `actions.ts` | Yes |

### 2-D. AI 채점 JSON 구조

| 영역 | 첨부문서 기준 | 현재 구현 | 부족한 점 | 유지해야 할 점 | 수정 필요도 | 권장 단계 | 예상 수정 파일 | DB 수동 적용 |
|---|---|---|---|---|---|---|---|---|
| response_id | AI 채점 JSON에 포함 | submissionId로 존재 | 필드명 불일치 (큰 문제 아님) | submissionId 구조 | P2 | 10-E-6 이후 | — | No |
| question_id | AI 채점 JSON에 포함 | `questionId` 전달됨 | — | 기존 구조 유지 | — | — | — | — |
| total_score | AI 채점 JSON에 포함 | `overall_score` → `totalScore` 변환됨 | — | 기존 구조 유지 | — | — | — | — |
| grade | A/B/C/D/F 등급 | 없음. 점수만 표시 | 등급 표시 없음 | — | **P1** | 10-E-1 | `result/page.tsx`, `types/providers.ts` | No |
| rubric_scores | 문항 유형별 세부 배점 기반 | 5항목 × 20점 균등 배분 | 유형별 rubric 없음 | 루브릭 구조 | **P1** | 10-E-2 | `rubrics.json`, `llm-eval/index.ts` | No |
| required_elements_found | 필수 포함 요소 충족 여부 | **없음** | AI 채점에 완전히 없음 | — | **P0** | 10-E-1 | `types/providers.ts`, `llm-eval/index.ts`, `result/page.tsx` | No |
| missing_elements | 누락된 필수 요소 | **없음** | AI 채점에 완전히 없음 | — | **P0** | 10-E-1 | 위 동일 | No |
| evidence | 발화에서 근거 추출 (인용) | **없음** | AI 채점에 완전히 없음 | — | **P0** | 10-E-1 | 위 동일 | No |
| needs_teacher_review | 교수자 검토 필요 플래그 | 없음. risk_flag(high/medium)만 있음 | AI가 직접 플래그 안 함 | risk_flag 구조 (teacher 대시보드에서 활용) | **P1** | 10-E-1 보완 | `types/providers.ts`, `llm-eval/index.ts` | No |

### 2-E. 모범표현·피드백 품질

| 영역 | 첨부문서 기준 | 현재 구현 | 부족한 점 | 유지해야 할 점 | 수정 필요도 | 권장 단계 | 예상 수정 파일 | DB 수동 적용 |
|---|---|---|---|---|---|---|---|---|
| 모범표현 | 학습자 발화와 무관하게 이상적인 모범 답안 제시 | **`corrected_answer: transcript`** — mock 제공자가 transcript를 그대로 복사 (llm-eval/index.ts:138) | transcript 복사는 학습 혼란 유발. OpenAI 호출 시는 실제 모범 생성되나 mock에서 오염 | corrected_answer 필드 구조, 결과 화면 렌더링 로직 | **P0** | 10-E-1 즉시 | `src/providers/llm-eval/index.ts` | No |
| 과제 무관 발화 처리 | 과제와 무관한 발화는 task_completion_score 대폭 감점 | `task_completion_score` 필드 있음. 단 프롬프트에 무관 발화 명시 지시 없음 | 시스템 프롬프트가 무관 발화 감점을 명시하지 않아 높은 점수 나올 수 있음 | `task_completion_score` 필드 및 전달 구조 | **P0** | 10-E-1 | `src/providers/llm-eval/index.ts` (SYSTEM_PROMPT) | No |
| 발음 참고 단어 UI | 단어별 점수는 학습 참고용, 점수 기준과 분리 | `<details>` 섹션에 넣어 분리했으나 ScoreBar와 함께 표시되어 "점수 기준"처럼 보임 | "발음 참고 단어 보기" 라벨과 bar 표시가 채점 기준처럼 오인될 수 있음 | details 접기 구조 유지, ScoreBar 컴포넌트 | **P0** | 10-E-1 | `result/page.tsx` | No |

### 2-F. 결과 화면 (학습자 피드백)

| 영역 | 첨부문서 기준 | 현재 구현 | 부족한 점 | 유지해야 할 점 | 수정 필요도 | 권장 단계 | 예상 수정 파일 | DB 수동 적용 |
|---|---|---|---|---|---|---|---|---|
| required_elements 표시 | 필수 요소 충족·누락 명확히 표시 | 없음. strengths/improvements 텍스트만 있음 | 학습자가 무엇을 포함했는지/빠뜨렸는지 알 수 없음 | strengths/improvements 표시 구조 (병존 가능) | **P0** | 10-E-1 | `result/page.tsx` | No |
| evidence 인용 표시 | AI가 발화에서 근거 인용 | 없음 | 채점 근거 불투명 — 학습자 신뢰도 저하 | — | **P0** | 10-E-1 | `result/page.tsx` | No |
| 등급 표시 | A/B/C/D/F 또는 우/양/가 형식 | 없음. 점수 숫자만 표시 | 직관적 등급 표시 부재 | totalScore, Badge 컴포넌트 | **P1** | 10-E-1 보완 | `result/page.tsx` | No |
| 다음 추천 활동 | 수준·문항 유형 기반 추천 | placeholder 하드코딩 ("준비 중" 표시) | 실제 추천 로직 없음 | NEXT_ACTIVITY_PLACEHOLDERS 구조 | P2 | 10-F 이후 | `result/page.tsx` | No |

### 2-G. 교수자 최종 확정 화면

| 영역 | 첨부문서 기준 | 현재 구현 | 부족한 점 | 유지해야 할 점 | 수정 필요도 | 권장 단계 | 예상 수정 파일 | DB 수동 적용 |
|---|---|---|---|---|---|---|---|---|
| 평가표 중심 확정 | required_elements/missing_elements/evidence 기반 검토 | step-rubric-adjust: AI vs 교수자 점수 항목별 조정 테이블. evidence/required_elements 없음 | 평가 근거 없이 점수만 조정 — 교수자 판단 근거 취약 | 3-step wizard 구조, AI vs 교수자 비교 테이블 | **P1** | 10-E-5 | `step-rubric-adjust.tsx`, `step-submission-view.tsx` | No |
| AI 채점 신뢰도 표시 | needs_teacher_review 플래그 기반 집중 검토 안내 | riskFlag(high/medium) 있음. needs_teacher_review 없음 | AI가 직접 "검토 필요"를 신호하지 않음 | riskFlag 구조 | **P1** | 10-E-5 | `step-rubric-adjust.tsx`, `grading-wizard.tsx` | No |
| 발화 증거 인용 표시 | 채점 근거로 발화 인용 표시 | step-submission-view에서 transcript 전체 표시. 증거 인용 없음 | 점수와 발화 사이 연결 고리 없음 | transcript 표시 구조 | **P1** | 10-E-5 | `step-submission-view.tsx` | No |

### 2-H. 방어 로직 (유지 필수)

| 영역 | 첨부문서 기준 | 현재 구현 | 부족한 점 | 유지해야 할 점 | 수정 필요도 | 권장 단계 |
|---|---|---|---|---|---|---|
| 짧은 녹음 제출 차단 | STT 호출 전 차단, ai_evaluations 생성 금지 | **완전 구현** — `duration < 2초` or `blob < 3000` 시 클라이언트 차단, 서버 guard, no-speech 결과 페이지 | 없음 | `MIN_VALID_DURATION_SEC=2`, `MIN_VALID_BLOB_SIZE=3000`, no-speech guard 전부 유지 | **유지** | 모든 단계에서 후퇴 금지 |
| STT 환각 방지 | 임의 transcript 생성 금지 | `MOCK_TRANSCRIPT` 상수 제거, 오류 시 `transcript: ''` fallback | 없음 | `no-speech` providerName, 빈 transcript fallback | **유지** | — |
| Supabase ai_evaluations 생성 차단 | no-speech 시 DB 저장 금지 | `isNoSpeech` guard → Supabase skip | 없음 | actions.ts guard 로직 | **유지** | — |

### 2-I. 테스트 자동화

| 영역 | 첨부문서 기준 | 현재 구현 | 부족한 점 | 유지해야 할 점 | 수정 필요도 | 권장 단계 | 예상 수정 파일 |
|---|---|---|---|---|---|---|---|
| T1 로그인 | 로그인 성공/실패 테스트 | auth-routes.spec.ts: 로그인 화면 표시 확인 있음 | 실제 로그인 성공 플로우 자동화 없음 | 기존 smoke 구조 | P1 | 10-E-6 | `tests/smoke/auth-routes.spec.ts` |
| T2 수준 선택 | 수준 선택 후 세트 진입 | 없음 (수준 선택 UI 없음) | 테스트 자체 없음 | — | P1 | 10-E-6 | 신규 spec 파일 |
| T3 문항 표시 | 문항 프롬프트·이미지·음원 표시 | auth-routes, mobile-speaking: 문항 카드 일부 확인 | 이미지 표시(q-003만), 음원 없음 | 기존 문항 표시 테스트 | P1 | 10-E-6 | `tests/smoke/*.spec.ts` |
| T4 녹음 | 녹음 시작·완료·짧은 녹음 차단 | mobile-speaking.spec.ts: TinyRecorder mock으로 차단 확인 | ✅ 구현 완료 | 전체 유지 | **유지** | — |
| T5 업로드 | Supabase Storage 업로드 확인 | api-smoke.spec.ts: /api/storage/upload 없음, API 단위 없음 | 업로드 API smoke 없음 | — | P1 | 10-E-6 | `tests/smoke/api-smoke.spec.ts` |
| T6 전사 | STT 결과 반환 확인 | api-smoke.spec.ts: /api/stt 무음 방어 3개 테스트 | 정상 STT 반환 테스트 없음 | 기존 무음 테스트 | P1 | 10-E-6 | `tests/smoke/api-smoke.spec.ts` |
| T7 AI 채점 | LLM eval 결과 required_elements 포함 확인 | api-smoke.spec.ts: mock fallback detail 반환 확인 | required_elements/evidence 없어 테스트 불가 | 기존 smoke 구조 | P1 | 10-E-6 | `tests/smoke/api-smoke.spec.ts` |
| T8 교수자 확정 | 채점 확정 후 DB 저장 확인 | auth-routes.spec.ts: teacher 대시보드 접근 확인만 | 채점 확정 플로우 테스트 없음 | — | P1 | 10-E-6 | 신규 spec 추가 |

---

## 3. 집중 분석 — 핵심 품질 문제

### 3-1. 모범표현이 transcript를 복사하는 문제

**위치**: `src/providers/llm-eval/index.ts:138`

```typescript
// 현재 mock 코드
corrected_answer: transcript,  // ← P0: transcript를 그대로 복사
```

**문제**: mock 제공자에서 `corrected_answer`가 학습자 발화 그대로. 학습자는 자신의 잘못된 발화가 "모범 표현"으로 제시되는 혼란 경험.

**해결 방향**: mock에서 문항 유형별 고정 모범 표현 또는 빈 문자열 반환. `corrected_answer`가 비어 있으면 결과 화면에서 해당 섹션 미표시.

### 3-2. 자기소개/그림묘사 문항과 4유형 체계 연결

| 현재 유형 | 첨부문서 4유형 매핑 | 조치 |
|---|---|---|
| qt-self-intro (자기소개) | → **자료 설명** 유형에 통합 가능 (자신이 자료) | 유형 재설계 시 흡수 또는 폐기 |
| qt-picture (그림묘사) | → **자료 설명** 유형으로 재명명 | 사진/그래프/표로 확장 |
| qt-situation (상황대응) | → **대화 미션** 유형 전단계로 활용 가능 | mission 라우트와 연결 설계 |
| qt-opinion (의견말하기) | → **자료 설명** 유형의 심화(고급) 문항 | 별도 유형 또는 자료설명 고급 편입 |

**추가 필요**: `qt-oral-reading` (낭독), `qt-listen-answer` (듣고 답하기)

### 3-3. q-003 그림 묘사 자료 품질

- **현재**: `/images/q-003-placeholder.svg` — SVG 일러스트, PLACEHOLDER 스탬프 표시
- **문제**: 파일럿 학습자에게 제공 불가 수준. 실제 평가 신뢰도 저하.
- **필요**: CC0 사진 또는 기관 촬영 이미지로 교체 (절차 문서화 완료, 단 실행 미완료)
- **자료 설명 유형 확장 시**: 그래프(통계), 표(비교), 기사(요약) 등 다양한 자료 asset 필요

### 3-4. AI 채점 기준 일반성 문제

**현재 시스템 프롬프트의 한계**:
- 문항 유형 구분 없이 동일 루브릭 적용
- `task_completion_score`가 "과제를 이해했는가"만 판단, 필수 포함 요소 목록 없음
- 무관 발화(예: 질문과 관계없는 내용을 유창하게 말함)에도 fluency_score 높게 책정 가능

**해결 방향**: SYSTEM_PROMPT에 문항별 `required_elements` 목록 주입, 무관 발화 시 task_completion_score 0~20점 상한 명시

### 3-5. required_elements_found / missing_elements / evidence 부재

**현재 `SpeakingEvalDetail` 타입** (`src/types/providers.ts`):
- `strengths`: string[]
- `improvements`: string[]
- `corrected_answer`: string

**첨부문서 요구 추가 필드**:
- `required_elements_found`: string[] — 발화에서 확인된 필수 요소
- `missing_elements`: string[] — 누락된 필수 요소
- `evidence`: string[] — 점수 근거 인용 (발화에서 발췌)
- `needs_teacher_review`: boolean — AI 신뢰도 낮거나 특이 케이스
- `grade`: 'A' | 'B' | 'C' | 'D' | 'F' — 등급

**영향 범위**: `types/providers.ts`, `llm-eval/index.ts` (mock + SYSTEM_PROMPT), `result/page.tsx` (표시), `step-rubric-adjust.tsx` (교수자 확정)

### 3-6. 발음 참고 단어 UI 오해 가능성

**현재**: `<details>` 내 단어별 ScoreBar + 점수 숫자. "발음 참고 단어 보기" 라벨.
**문제**: ScoreBar와 점수 숫자 조합이 "채점 기준별 발음 점수"처럼 오인.
**해결 방향**: details 섹션 내 ScoreBar 제거, 텍스트 목록(단어: 점수 숫자만)으로 단순화. "실제 ETRI 연동 전 참고용 데이터입니다" 안내 추가.

### 3-7. 교수자 최종확정 화면 구조 약점

**현재**: 3-step wizard (제출 보기 → 루브릭 조정 → 최종 확정)
- step-submission-view: transcript 전체 + 음성 파일 링크
- step-rubric-adjust: AI vs 교수자 점수 테이블 + 조정 이유 + 내부 메모
- step-final-feedback: 학습자 공개 피드백 작성 + 확정 버튼

**부족한 점**:
- required_elements / missing_elements 체크리스트 없음
- evidence (AI가 인용한 발화 근거) 미표시
- needs_teacher_review 플래그 없음 (riskFlag만 있음)
- 4문항 attempt 전체 점수 합산 뷰 없음

### 3-8. attempt 단위 4문항 묶음 관리

**현재**: `questionSetId`를 `actions.ts`에 전달하고 question-sets.json으로 세트 정의. 단 attempt 객체가 없어 4문항 진행 상태·총점 합산 불가.

**필요 구조**:
```
attempt {
  id, studentId, levelId, setId, startedAt, completedAt
  responses[4]: { questionId, submissionId, score }
  totalScore: 합산
  status: 'in_progress' | 'completed'
}
```

**현재 구현에서 유지**: questionSetId 전달 경로, question-sets.json 구조, nextQuestion 로직

---

## 4. 우선순위 분류

### P0 — 즉시 수정 (10-E-1에서 처리)

| 번호 | 문제 | 파일 |
|---|---|---|
| P0-1 | `corrected_answer: transcript` — mock 모범표현이 발화 복사 | `src/providers/llm-eval/index.ts` |
| P0-2 | 과제 무관 발화에 높은 점수 가능 — SYSTEM_PROMPT 미대응 | `src/providers/llm-eval/index.ts` |
| P0-3 | `required_elements_found` / `missing_elements` / `evidence` 필드 없음 | `src/types/providers.ts`, `llm-eval/index.ts` |
| P0-4 | 결과 화면에 평가 근거(evidence/required_elements) 미표시 | `result/page.tsx` |
| P0-5 | 발음 참고 단어가 채점 기준처럼 보이는 UI | `result/page.tsx` |
| P0-6 | q-003 실제 사진 미교체 (placeholder SVG) | `public/images/`, `questions.json` |
| **유지** | 짧은 녹음/무음 방어 로직 — 후퇴 절대 금지 | speaking-client, actions, stt/route |

> **10-E-1 처리 결과 (2026-05-05)**: P0-1~P0-5 처리 완료. P1-9(needs_teacher_review), P1-10(grade), P1-3(requiredElements 데이터) 함께 처리. 35/35 smoke test 통과.  
> P0-6 (q-003 실제 사진) 은 파일럿 전 수동 asset 교체로 해결 예정.

> **10-E-2 처리 결과 (2026-05-05)**: P1-1(4유형 체계), P1-2(유형별 배점 루브릭), P1-4(초급/중급/고급 세트 구조), P1-6(대화미션 연결) 처리 완료. `/api/evaluate-speaking` route의 questionId 컨텍스트 미전달 버그 수정. 44/44 smoke test 통과 (신규 9개 포함).

### P1 — 파일럿 전 반드시 수정 (10-E-2 ~ 10-E-6)

| 번호 | 문제 | 파일 | 단계 | 상태 |
|---|---|---|---|---|
| P1-1 | 4유형 문항 체계 정비 (낭독/자료설명/듣고답하기/대화미션) | `question-types.json`, `questions.json` | 10-E-2 | ✅ 처리 완료 |
| P1-2 | 문항별 배점 15/25/25/35 반영 | `rubrics.json`, `llm-eval/index.ts` | 10-E-2 | ✅ 처리 완료 |
| P1-3 | 문항별 `requiredElements` 데이터 | `questions.json` | 10-E-2 | ✅ 10-E-1에서 처리 |
| P1-4 | 초급/중급/고급 평가세트 구조 | `question-sets.json`, `/student/speaking/page.tsx` | 10-E-3 | ✅ 처리 완료 (10-E-2에서 선행) |
| P1-5 | 듣고 답하기: 스크립트 비공개 + 음원 제공 구조 | `questions.json`, TTS/audio asset | 10-E-4 | 콘텐츠 입력 완료 (10-E-3). `listeningScriptForTeacherOnly` 필드 분리 완료. 음원 파일 등록은 10-E-4 대기. |
| P1-6 | 대화 미션: speaking 4문항 세트 연결 | `question-sets.json`, mission 라우트 연결 | 10-E-2 | ✅ 처리 완료 (qt-dialogue-mission 유형으로 연결) |
| P1-7 | 실제 사진/그래프 asset 등록 | `public/images/`, `questions.json` | 10-E-4 | 대기 |
| P1-8 | 교수자 최종확정 화면 강화 (required_elements/evidence) | `step-rubric-adjust.tsx`, `step-submission-view.tsx` | 10-E-5 | 대기 |
| P1-9 | `needs_teacher_review` 플래그 추가 | `types/providers.ts`, `llm-eval/index.ts` | 10-E-1 | ✅ 처리 완료 |
| P1-10 | `grade` 등급 표시 | `result/page.tsx`, `types/providers.ts` | 10-E-1 | ✅ 처리 완료 |
| P1-11 | T1~T8 테스트 체크리스트 보강 | `tests/smoke/*.spec.ts` | 10-E-6 | 일부 완료 (신규 4개 추가) |

### P2 — 운영 안정화 전 수정 (10-F 이후)

| 번호 | 문제 | 단계 |
|---|---|---|
| P2-1 | attempt 단위 4문항 묶음 DB 구조 확장 | 10-F |
| P2-2 | RLS 전면 적용 | 10-F |
| P2-3 | recordings signed URL 전환 | 10-F |
| P2-4 | teacher_scores / teacher_reviews 최종확정 구조 고도화 | 10-F |
| P2-5 | 파일럿 통계 대시보드 | 10-F 이후 |
| P2-6 | 보고서/PDF 내보내기 | 운영 안정화 후 |
| P2-7 | 다음 추천 활동 실제 로직 | 운영 안정화 후 |

---

## 5. 권장 구현 단계

```
10-E-1  평가 루브릭·모범표현·결과화면 긴급 개선 (P0 전체)
10-E-2  문항 유형 체계 정비: 낭독/자료설명/듣고답하기/대화미션
10-E-3  초급/중급/고급 평가세트 데이터 정비
10-E-4  자료 asset 구조 개선: 사진, 그래프, 듣기 음원
10-E-5  교수자 최종확정 화면 개선 (required_elements/evidence 기반)
10-E-6  T1~T8 테스트 체크리스트 자동/수동 반영
10-F    파일럿 초기화/배포 재검증
```

### 단계별 사전 조건

| 단계 | 필수 완료 선행 | 이유 |
|---|---|---|
| 10-E-2 | 10-E-1 완료 | 유형별 루브릭 정의 후 required_elements 설계 가능 |
| 10-E-3 | 10-E-2 완료 | 4유형 문항이 있어야 세트 구성 가능 |
| 10-E-4 | 10-E-2 완료 | 유형별 asset 요구사항 확정 후 수집 가능 |
| 10-E-5 | 10-E-1 완료 | required_elements/evidence 필드가 있어야 확정 화면 표시 가능 |
| 10-E-6 | 10-E-5 완료 | 전 기능 구현 후 체크리스트 반영 |

---

## 6. 10-E-1 구현 프롬프트 초안

> **위치**: 이 섹션이 10-E-1 구현을 위한 직접 사용 가능한 프롬프트 초안입니다.

---

### Phase 10-E-1 구현 프롬프트

```
Phase 10-E-1: 평가 루브릭·모범표현·결과화면 긴급 개선

프로젝트: ~/projects/korean-speaking-ai-mvp
브랜치: main

주의:
- .env.local, API key, Supabase key, OpenAI key, Vercel token 절대 출력 금지.
- service role key 사용 금지.
- 짧은 녹음/무음 방어 로직 절대 후퇴 금지.
  (MIN_VALID_DURATION_SEC=2, MIN_VALID_BLOB_SIZE=3000, no-speech guard)
- FlutterFlow/Make 구조로 되돌아가지 말 것.
- 현재 Next.js App Router, Supabase Auth, provider 구조 유지.

목표:
P0 이슈 6개 해결:
1. corrected_answer transcript 복사 금지
2. 과제 무관 발화 처리 강화 (SYSTEM_PROMPT)
3. required_elements_found / missing_elements / evidence 필드 추가
4. 결과 화면에 required_elements / evidence 표시
5. 발음 참고 단어 UI 정리 (ScoreBar 제거, 텍스트만)
6. q-003 이미지 placeholder 안내 개선

추가 보완 (P1 일부):
7. grade 필드 추가 (A/B/C/D/F)
8. needs_teacher_review 플래그 추가

수정 파일 1: src/types/providers.ts
- SpeakingEvalDetail 타입에 추가:
  required_elements_found?: string[]   // 발화에서 확인된 필수 요소
  missing_elements?: string[]          // 누락된 필수 요소
  evidence?: string[]                  // 점수 근거 인용 (발화 발췌)
  needs_teacher_review?: boolean       // AI 신뢰도 낮거나 특이 케이스
  grade?: 'A' | 'B' | 'C' | 'D' | 'F'

수정 파일 2: src/providers/llm-eval/index.ts

A. getMockDetail 수정:
- corrected_answer: transcript → corrected_answer: '' (transcript 복사 금지)
- 문항 유형별 고정 mock 필수 요소:
  required_elements_found: ['이름 언급', '출신 국가 언급'] (예시)
  missing_elements: ['한국어 학습 이유 미언급']
  evidence: ['"저는 홍길동입니다" — 이름 확인']
  needs_teacher_review: wordCount < 10
  grade: overall_score >= 90 ? 'A' : >= 75 ? 'B' : >= 60 ? 'C' : >= 45 ? 'D' : 'F'

B. SYSTEM_PROMPT 수정:
- JSON schema에 required_elements_found, missing_elements, evidence, needs_teacher_review, grade 추가
- 무관 발화 처리 지시 추가:
  "If the learner speaks about something unrelated to the question prompt,
   set task_completion_score to 10 or below, and note it in missing_elements."
- required_elements 주입:
  [질문 프롬프트] 전달 시 해당 문항의 필수 포함 요소도 함께 전달
  (예: "필수 포함 요소: 이름, 출신 국가, 한국어 학습 이유")

C. callOpenAI 수정:
- 파싱에 required_elements_found, missing_elements, evidence, needs_teacher_review, grade 추가

수정 파일 3: app/student/speaking/[questionId]/result/page.tsx

A. required_elements 표시 섹션 추가 (AI 피드백 카드 상단):
- required_elements_found: 초록 체크 아이콘 + 텍스트 목록
- missing_elements: 빨간 X 아이콘 + 텍스트 목록
- evidence: "채점 근거" 제목 + 인용 텍스트 목록 (회색 배경)
- 모두 speakingEvalDetail?.xxx에서 읽음. undefined이면 섹션 전체 숨김.

B. 등급 표시:
- 종합 점수 카드 상단에 grade Badge 추가 (A=success, B=info, C=warning, D/F=danger)
- speakingEvalDetail?.grade가 있을 때만 표시

C. 발음 참고 단어 UI 정리:
- <details> 섹션 내 ScoreBar 제거
- 단어별 점수를 "단어: 숫자점" 텍스트 목록으로 교체
- 섹션 상단에 "ETRI 발음 평가 연동 전 참고용 데이터입니다." 안내 추가

D. corrected_answer 섹션:
- corrected_answer가 빈 문자열이면 섹션 전체 렌더링 안 함 (기존 조건 확인)

수정 파일 4: src/content/questions.json
- 각 문항에 requiredElements 배열 추가 (LLM 프롬프트에 주입용)
  q-001: ["이름", "출신 국가", "한국어 학습 이유"]
  q-002: ["이름", "출신 국가", "한국 생활/경험 하나 이상"]
  q-003: ["그림 속 인물 수 또는 배경 언급", "최소 1가지 행동 묘사", "장소 언급"]
  q-007: ["음식 이름", "추천 이유 1가지 이상"]
  (나머지 문항도 적절히 설정)

수정 파일 5: app/student/speaking/actions.ts
- submitSpeaking에서 question.requiredElements를 llmEvalPromise에 전달
  evaluateSpeakingDetail({
    ...기존,
    requiredElements: question?.requiredElements,
  })

수정 파일 6: src/providers/llm-eval/index.ts (SpeakingEvalInput)
- SpeakingEvalInput 타입에 requiredElements?: string[] 추가
- callOpenAI parts에 requiredElements 주입:
  `[필수 포함 요소]\n${requiredElements.join(', ')}`

수정 파일 7: tests/smoke/api-smoke.spec.ts
- /api/evaluate-speaking 응답에서 required_elements_found 배열 반환 확인 테스트 추가
- corrected_answer !== transcript 확인 테스트 추가

검증:
- npm run build
- git diff --stat으로 수정 파일 확인
- 커밋/푸시하지 말 것

완료 조건:
- mock 모범표현에 transcript 복사 없음
- 결과 화면에 required_elements_found / missing_elements / evidence 표시
- 발음 참고 단어 ScoreBar 제거
- grade Badge 표시
- 짧은 녹음 방어 로직 유지 확인
- smoke test 추가 확인
```

---

## 7. 현재 구현에서 반드시 유지할 기술 요소 목록

| 요소 | 위치 | 이유 |
|---|---|---|
| 짧은 녹음 차단 (`MIN_VALID_DURATION_SEC=2`, `MIN_VALID_BLOB_SIZE=3000`) | `speaking-client.tsx`, `actions.ts`, `stt/route.ts` | "MBC 뉴스…" 환각 방지, 무의미 제출 방지 |
| no-speech guard | `actions.ts`, `result/page.tsx` | ai_evaluations 생성 방지 |
| STT `transcript: ''` fallback | `stt/route.ts` | 임의 transcript 생성 금지 |
| provider_events 기록 | `supabase/provider-events.ts`, 각 API route | 운영 모니터링 |
| mock store 병행 | `lib/mock/speaking-store.ts` | result 페이지 read 의존 |
| Supabase persistence 분기 | `actions.ts` (`REPOSITORY_PROVIDER=supabase` 조건) | mock/supabase 전환 구조 |
| 3-step teacher grading wizard | `teacher/submissions/[id]/` | 교수자 확정 플로우 기반 |
| smoke test 구조 | `tests/smoke/` | CI 자동화 기반 |
| q-003 imageUrl/Alt/Caption/LicenseNote | `questions.json`, `speaking-client.tsx` | 이미지 메타 구조 재활용 |
| RTL helper / LangHint | `components/ui/lang-hint.tsx` | 다국어 학습자 지원 |
| difficultyLabel/Variant | `speaking-client.tsx` | 수준 표시 UI 기반 |
| questionSetId 전달 경로 | `speaking-client.tsx` → `actions.ts` | attempt 묶음 확장 기반 |

| language question turn → mission evidence 제외 | `dialogue-mission.ts`, `providers/conversation/index.ts` | 표현 확인 질문이 goal 달성 증거로 오인식되지 않도록 |
| 비정상 표현 교정 (assessment mode) | `lib/dialogue-policy.ts` | STT 오인식·비자연스러운 표현을 "맞다"고 긍정하는 버그 방지 |

---

## Phase 10-E-5-C/D 추가 보정 (2026-05-06)

### 발견된 Gap

| Gap | 위치 | 심각도 |
|---|---|---|
| `answerLanguageQuestionForAssessment` fallback이 잘못된 표현을 "맞다"고 긍정 | `dialogue-policy.ts` | 높음 — 학습자 오류 강화 |
| "이게 맞나요?" 패턴이 `?` 없으면 미감지 | `dialogue-policy.ts` | 중간 |
| "똑바로 알려주세요" 등 새 패턴 미감지 | `dialogue-policy.ts` | 낮음 |

### 수정 결과

- `UNNATURAL_CAFE_PATTERNS` 도입: STT 오인식("나이스 아메리칸", "던지세요" 등) 감지 → 바른 표현 교정 후 역할극 복귀
- `LANGUAGE_QUESTION_PATTERNS` 보강: `/이게 맞/`, `/맞나요/`, `/정확한 표현/`, `/맞는 표현/`, `/똑바로 알/`, `/제대로 알/` 추가
- assessment mode fallback 메타 문구("계속 진행해 볼까요?") → 역할극 문구("어떤 음료로 주문하시겠어요?") 교체
- 테스트 +6개 추가 (164 passed)

---

*분석 완료: 2026-05-05 / 추가 보정: 2026-05-06*
