# Phase 10-E-0 전면 갭 분석

**Korean Speaking AI MVP — 평가 설계 정렬 분석**  
**작성일**: 2026-05-05  
**분석자**: Claude (Phase 10-E-0)  
**상태**: 분석 완료 (10-E-0) / P0 처리 완료 (10-E-1, 2026-05-05) / P1-1~P1-4 처리 완료 (10-E-2, 2026-05-05) / 정식 문항 콘텐츠 입력 완료 (10-E-3 콘텐츠, 2026-05-05) / reading 피드백·404·dialogue_mission 재정의 완료 (10-E-3 추가 수정, 2026-05-06) / asset 구조·listenLimit UI·student-safe rendering 완료 (10-E-4, 2026-05-06) / dialogue_mission 단발 녹음→제출 UI 비표시 완료 (10-E-4 추가 수정, 2026-05-06) / q2 제출 오류 수정 완료 (10-E-6-B, 2026-05-07) / 제출 지연 완화·ETRI fallback·q3 TTS·q4 복수 품목 처리 완료 (10-E-6-C, 2026-05-07) / q2/q3 평가 표시·q4 메뉴판·점수 환산 수정 완료 (10-E-6-D/E, 2026-05-07) / q2/q3 안내문구·q4 결제·총액·결과화면·STT 카드명·피드백 완료 (10-E-6-F, 2026-05-07) / q2/q3 저점 보정·q3 피드백 오류·q4 분리주문·수량 goal·UI 레이블·mock 안내 완료 (10-E-6-G/H, 2026-05-07) / q2 SVG 이미지 등록·중급/고급 반영 범위 조사 완료 (10-E-6-I, 2026-05-07) / ETRI 발음 교정 데모 화면 추가·q1 오류 표시 완화 완료 (10-E-6-K, 2026-05-07) / **q1~q4 채점 안정화·q4 흐름 안정화·q2 SVG 개선 완료 (10-E-6-L 보강, 2026-05-07)**

**10-E-6-L 보강 처리 결과 (2026-05-07):**
- ✅ q2 elementRatio floor 확대: `≥0.8(4/5+)→80`, `≥0.5(3/5)→70`, `≥0.33(2/5)→60`
- ✅ q3 elementRatio floor 동일 기준 적용. `allFound+≥80→improvements=[]`, `allFound+≥70→가벼운 피드백 1개`
- ✅ q2 `allFound+score≥80→improvements=[]` 추가
- ✅ q1 floor: `elementRatio≥1.0 && wordCount≥15 → overall min 75, taskScore min 78` (유지 확인)
- ✅ q4 goal 달성률 기반 overall_score 최저점 보장: `4/4→85, 3/4→75, 2/4→60, 1/4→45`
- ✅ q4 goal-aware strengths: 달성 목표 → 강점 표시
- ✅ q4 goal-aware improvements: 미달성 목표만 보완점 표시 (달성 목표 재표시 금지)
- ✅ q4 goal-aware learner_feedback_ko: 달성률별 차등 피드백
- ✅ q4 grade 재산정 (floored overall 기반)
- ✅ STT fetch 10초 timeout (AbortController). AI response fetch 15초 timeout.
- ✅ STT 실패 오류 문구: "음성 인식이 원활하지 않습니다. 다시 한 번 말해 주세요."
- ✅ q2 SVG 전면 리디자인: gradient, 그림자, 식물, 개선된 인물·말풍선·메뉴판
- ✅ `docs/spec/WORK_LOG.md` 오탈자 "들을"→"들를" 수정 (2곳)
- ✅ 유닛 테스트 41개 추가 (`scoring-calibration-policy.test.ts`): 462 passed
- ✅ lint: 0 errors / tsc: 0 errors / build: success / smoke: 193 passed

**Known Issues (10-E-6-L 기준):**
- 현재 점수는 1차 시연용 calibration. 실제 파일럿 응시 데이터 후 재보정 필요.
- ETRI 실시간 endpoint/network 안정성 별도 확인 필요.
- STT confidence 낮은 경우 교수자 확인 권장.
- q2 이미지: 파일럿용 내부 SVG — 2차 시연 전 고품질 사진 교체 권장.
- q3 실제 mp3: 2차 시연 전 품질 보강 필요.
- q4: 실제 LLM provider 연결 후 대화 품질 추가 개선 필요.

**10-E-6-G/H 처리 결과 (2026-05-07):**
- ✅ q2/q3 `elementRatio ≥ 1.0` → 최저 80점 보장 (`llm-eval/index.ts`)
- ✅ q2/q3 `elementRatio ≥ 0.66` → 최저 70점 보장
- ✅ q3 `allElementsFound` 시 "시간, 장소" 등 이미 포함된 요소를 보완점 오표시 제거
- ✅ q3 allElementsFound 시 일반 개선 피드백("핵심 정보를 잘 포함했습니다...") 표시
- ✅ q4 `missionGoals` 4개 재정의: "메뉴판에 있는 품목 주문하기", "수량 말하기", "포장/매장 이용 여부 말하기", "결제 방법 말하기"
- ✅ q4 `QUANTITY_RE` 추가: 숫자+잔/개/컵/병, 한/두/세/네+잔/개/컵 감지
- ✅ q4 분리 포장(포장+매장 동시) → "한 가지 이용 방식으로 정리해 달라" 안내
- ✅ q4 분할 결제(카드+현금 동시) → "한 가지 결제 방법 선택 요청" 안내
- ✅ q4 UI "내 답변 녹음" → "말하기", "녹음 완료" → "말하기 완료" (DialogueMissionPanel)
- ✅ q4 결과화면: mock 안내 "현재는 테스트용 대화 provider로 평가되었습니다." (비q4 기존 경고 유지)
- ✅ q4 결과화면: criteria 6개 → 4개 (새 missionGoals 기준), 보완점 goal별 맞춤 suggestions
- ✅ q4 STT 카드 제목: provider 무관하게 항상 "대화 기록"
- ✅ 기존 충돌 테스트 3개 업데이트 + 신규 22개 추가 (unit: 202 passed)
- ✅ smoke 테스트 대화 흐름 반영 업데이트 (180 passed)
- ✅ lint: 0 errors / tsc: 0 errors / build: success

**10-E-6-F 처리 결과 (2026-05-07):**
- ✅ q2 결과 notice: "발음평가 API" 개발자 문구 → "사진의 상황과 핵심 정보를 설명하는 능력을 중심으로 평가됩니다."
- ✅ q3 결과 notice: → "들은 내용을 이해하고 질문에 맞게 답하는 능력을 중심으로 평가됩니다."
- ✅ 보조 문구: "발음 세부 평가는 교사 검토 시 함께 확인됩니다."
- ✅ `INVALID_CAFE_ITEMS`에 '순댓국', '순대국' 명시 추가 (댓=U+B313 ≠ 대=U+B300 유니코드 차이)
- ✅ `CAFE_MENU_PRICES` 테이블 추가 (7종 가격)
- ✅ `computeOrderTotal()` 추가 — 주문 품목·수량 기반 총액 계산
- ✅ q4 결제 missionGoal 추가 (4번째: "결제 방법 말하기")
- ✅ `beginnerCafeResponse()`: 주문 확인 시 총액 포함 + "결제는 카드로 하시겠어요, 현금으로 하시겠어요?" 질문
- ✅ `beginnerCafeResponse()`: 결제 확인 후 "카드/현금 결제로 도와드리겠습니다. 주문이 완료되었습니다." 반환
- ✅ `dialogue-actions.ts`: meta에 goalResults 배열 저장 (goalIndex, labelKo, achieved)
- ✅ `SpeakingEvalRecord.meta` 타입에 goalResults 필드 추가
- ✅ q4 결과 화면: legacy rubric 대신 대화 미션 전용 평가 (6개 기준→4개로 10-E-6-G/H에서 갱신)
- ✅ q4 STT 카드 제목: "음성 인식 결과(STT)" → "대화 기록" (mock 구분 10-E-6-G/H에서 제거)
- ✅ q4 goalResults 기반 잘한 점/보완할 점 피드백 표시
- ✅ q4 missionGoals 4개 기준 cap (4/4 최대)
- ✅ 테스트 45개 추가 (unit: 367 passed)
- ✅ lint: 0 errors / tsc: 0 errors / build: success / smoke: 180 passed

**10-E-6-D/E 처리 결과 (2026-05-07):**
- ✅ q2 결과 화면: legacy 5항목 breakdown 대신 "자료 설명 AI 참고평가" 기준 5개 표시
- ✅ q3 결과 화면: legacy 5항목 breakdown 대신 "듣고 답하기 AI 참고평가" 기준 5개 표시
- ✅ q2/q3 점수 안내 문구 "AI 1차 참고값 / 교수자 검토 후 확정" 명시
- ✅ q4 beginner 카페 화면에 메뉴판 카드 추가 (음료 5종·디저트 2종·가격)
- ✅ `withJosa()` 한국어 조사 helper 구현 — 받침 유무로 와/과·를/을 자동 선택
- ✅ "아이스아메리카노과" → "아이스 아메리카노와" 조사 오류 수정
- ✅ `INVALID_CAFE_ITEMS` 목록 추가 (부대찌개·설렁탕·김치찌개 등 16종)
- ✅ 메뉴판 외 품목 주문 시 "저희 카페에는 없습니다. 메뉴판에서 골라 주세요." 응답
- ✅ `detectBeginnerCafe()`: 유효 음료 키워드(`VALID_DRINK_KEYWORDS`)만으로 drinkAchieved 판정
- ✅ `dialogue-actions.ts`: `achievedCount = Math.min(..., totalGoals)` cap 추가
- ✅ attempt summary 점수 환산 수정: `score100/100*maxScore = weightedScore`, `percent = score100` (0~100 clamp)
- ✅ missionGoalsAchieved를 totalGoals로 cap (4/3 → 3/3 방지)
- ✅ attempt summary에 AI 참고 총점 카드 추가 (전체 응시 완료 시)
- ✅ 테스트 60개 추가 (unit: 327 passed)
- ✅ lint: 0 errors / tsc: 0 errors / build: success / smoke: 180 passed
- 🔜 남은 known issues: 실제 식당 사진, 실제 mp3 듣기파일, q2/q3 점수 산식 파일럿 보정, q4 실제 LLM 연결 후 품질 개선

**10-E-6-C 처리 결과 (2026-05-07):**
- ✅ ETRI fetch timeout 30초 → 7초 단축 (`etri.ts`): 빠른 실패로 제출 지연 최소화
- ✅ q1 ETRI 실패 시 fallbackReason 있으면 "네트워크 또는 endpoint 확인" 안내 표시 (`result/page.tsx`)
- ✅ q1 ETRI 실패 시 q1ReferenceScore = AI totalScore 유지 (q1EtriReflected=false 기존 정책 유지)
- ✅ q3 TTS fallback 버튼 문구 '문제 듣기 (임시 음원)' → '듣기 재생' (`question-asset-renderer.tsx`)
- ✅ q3 TTS fallback 안내 '임시 TTS 음원입니다.' → '현재 음원은 임시 TTS 음성입니다.' 명확화
- ✅ q4 `extractOrderedItems()` 함수 추가: 발화에서 복수 품목+수량 추출 (팥빙수, 아이스 아메리카노, 라떼, 주스)
- ✅ q4 `buildMultiItemCompletionMsg()` 함수 추가: 발화 순서 보존 복수 품목 완료 메시지
- ✅ q4 "아이스 아메리카노 2잔과 팥빙수 2개 포장" → "네, 아이스 아메리카노 2잔과 팥빙수 2개 포장으로 준비해 드리겠습니다." 응답 생성 가능
- ✅ drinkMet에 '팥빙수', '빙수' 추가 (팥빙수만 주문해도 mission goal 달성 감지)
- ✅ 테스트 20개 추가 (unit: 261 → 281 passed)
- ✅ smoke 180 passed (후퇴 없음)
- 🔜 남은 known issues: 실제 식당 사진, 실제 mp3 듣기파일, ETRI endpoint 안정성, q4 LLM provider 연결

**10-E-6-B 처리 결과 (2026-05-07):**
- ✅ q2 제출 오류 근본 원인 확인: ETRI provider가 서버측에서 빈 blob 변환 시도 → ffmpeg crash → Promise.all reject
- ✅ `actions.ts` 수정: isReadingQuestion 체크 추가, q2/q3/q4는 mock pronunciation 직접 사용
- ✅ q1 서버측 pronunciation provider 호출에 `.catch()` 추가 (ETRI 실패 시 fallback, crash 방지)
- ✅ q2 result page에 이미지 placeholder 안내 추가 (`data-testid="image-placeholder-result-notice"`)
- ✅ 진단 로그 추가 (start/success, no secrets)
- ✅ 테스트 12개 추가 (unit: 261 passed)
- ✅ smoke 180 passed (기존 대비 후퇴 없음)
- 🔜 남은 항목: 실제 식당 사진 교체, 음원 mp3 등록, q3/q4 End-to-End 수동 확인

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
- ✅ **ETRI 발음평가 실제 연동 착수** (Phase 10-E-7): URL/Authorization/점수환산 수정, q1 reading script 추출, rawScore UI 표시, fallback 명확화
- ✅ **ETRI 점수 표시 보정** (Phase 10-E-7 추가): 원점수/참고환산 구분, 세부 항목 막대 provider별 분리, calibration 안내 배너, WAV 진단 로그 강화
- ✅ **AI 1차 평가·ETRI 카드 분리 표시 + 보정 참고점수 구조 추가** (Phase 10-E-7 통합 수정):
  - 상단 종합점수 "발음" 라벨 → "AI 발음 추정" (provider=etri), ETRI 원점수와 명확 분리
  - 발음 평가 카드 제목 → "ETRI 발음평가 API 결과"
  - rawScore(원점수) / normalizedScore(단순환산) / calibratedScore(보정참고) 3단계 구분 표시
  - `src/lib/pronunciation-calibration.ts` 신규 — piecewise linear calibration, calibrationStatus="provisional"
  - calibratedScore 최종 종합점수 자동 반영 보류 (파일럿 교수자 검토 후 결정)
- ✅ **ETRI 실제 API 실패 복구 + q1 낭독 문항 표시 정책** (Phase 10-E-7 통합 후속 수정):
  - `ETRI_PRONUNCIATION_ENDPOINT` env override 추가 (기존 base-only에서 full URL 재정의 가능)
  - ETRI 오류 메시지 세분화: etri_fetch_failed / etri_http_error / etri_api_error 별도 안내 문구
  - q1 낭독 문항(qt-reading): 종합점수 카드 → "문항 AI 참고평가", rubric-speaking-01 breakdown 숨김, 낭독 기준 4개 + "공식 종합점수는 1~4번 전체 응시 후 산출됩니다." 안내
  - 테스트 25개 추가 (오류 메시지 매핑, fallback 분기, reading 표시 정책, endpoint 정책)
- ✅ **q1 문항 AI 참고평가에 ETRI calibratedScore 반영** (Phase 10-E-7 추가 수정):
  - q1ReferenceScore 산식: `round(calibratedScore × 0.6 + aiScore × 0.4)` (임시 — 파일럿 calibration 후 비율 조정 예정)
  - ETRI 성공 시 CardHeader 부제 → "AI 1차 평가 + ETRI 보정 참고값 · 교수자 확정 전 참고값"
  - ETRI 실패 시 기존 AI 참고점수 유지 + "ETRI 발음평가가 반영되지 않은 AI 참고평가" 안내
  - 낭독 기준 "기본 발음·억양 이해 가능" 항목에 ETRI 반영 시 "· ETRI 참고 반영" 마커 추가
  - q1 legacy 5개 breakdown 미표시 유지
  - calibratedScore는 teacher final score로 자동 확정하지 않음
  - calibratedScore는 1~4번 전체 공식 종합점수에 자동 반영하지 않음
  - 테스트 파일 신규: `tests/unit/q1-reference-score-policy.test.ts` (작업 8 전체 커버)
- 🔜 **q1 reference score 산식은 임시** — `round(calibratedScore × 0.6 + aiScore × 0.4)` 비율은 파일럿 calibration 샘플 수집 후 재검토 필요
- 🔜 **공식 1~4번 전체 세트 종합점수 산식 미확정** — 각 문항 배점(reading 15 / material_description 25 / listening 25 / dialogue 35)을 기준으로 한 교수자 확정 후 종합점수 계산 방식은 10-E-6~7에서 정리 예정
- 🔜 **ETRI calibratedScore는 q1 문항 참고평가에만 일부 반영** — 공식 최종점수에는 자동 반영하지 않음. 교수자가 ETRI 보정 참고점수를 참고하여 최종 점수를 직접 입력하는 방식 유지
- 🔜 ETRI 실제 음원 포맷(webm) 호환성 수동 검증 필요
- 🔜 q2/q3/q4 ETRI script 기준 확정 필요 (현재 참고 점수로만 활용)
- 🔜 Azure/ETRI 발음평가 비교 미완
- 🔜 **교수자 최종점수 반영 비율 확정 필요** — ETRI calibratedScore가 최종 발음점수에 얼마나 반영되는지 미확정. 공식 세트(q1~q4) 전체 응시 흐름 완성 후 종합점수 산식 재정리 예정
- 🔜 **ETRI calibration 후속 확정 필요** — calibrationStatus="provisional". 원어민/학습자/부정확 발화 샘플 수집 후 CALIBRATION_ANCHORS v0.1-pilot 재검토. calibration 완료 전까지 calibratedScore는 파일럿 보정용 참고값으로만 표시
- 🔜 **q1 script 길이 및 오디오 포맷 영향 검토** — q1 전체 낭독 텍스트를 한 번에 ETRI에 전달 중. 긴 텍스트가 점수에 영향을 줄 수 있음. 후속 개선 후보: (1) 문장 단위 audio segmentation (어려움), (2) 짧은 q1 문항부터 ETRI 기준 검증, (3) 추후 문장 단위 낭독 문항에서 문장별 ETRI 평가 가능
- 🔜 **ETRI recognized text와 script 일치율 확인** — ETRI가 인식한 텍스트가 기준 script와 얼마나 일치하는지 서버 로그로 확인 필요. 불일치 시 음성 품질 또는 발음 문제 가능성

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

---

## Phase 10-E-7 추가 수정 2차 Known Issues (2026-05-07)

### KI-1: result page rubric 혼재 (rubric-speaking-01 고정)

| 항목 | 내용 |
|---|---|
| **증상** | result page (`app/student/speaking/[questionId]/result/page.tsx`)가 `rubric-speaking-01`(레거시 5개 항목 100점)을 hardcode 사용 |
| **영향** | q1 reading의 실제 rubric(`rubric-reading-01`, 4개 항목 15점)과 다른 항목·배점 구조로 표시됨 |
| **발원** | line 9: `const rubric = rubricsJson.find((r) => r.id === 'rubric-speaking-01')!` 고정 |
| **관련 함수** | `detailToLLMEvalResult` — 항상 ri-pronunciation/ri-fluency/ri-vocabulary/ri-grammar/ri-task 5개 생성 |
| **우선순위** | 중간 — 파일럿 기간에는 "AI 1차 평가 참고값" 라벨로 완화 중 |
| **후속 작업** | result page가 `question.rubricId`를 기반으로 rubric을 동적 로드하도록 수정; `detailToLLMEvalResult`도 rubric-aware 변환으로 교체 |

### KI-2: 발음 항목 14점 고정 (mock AI aggregate 파생값)

| 항목 | 내용 |
|---|---|
| **증상** | 종합점수 카드의 "발음" 항목이 14/20으로 고정되어 보임 |
| **원인** | `getMockDetail`에서 `pronunciation_reference_score: 72` 하드코딩 → `toRubricScore(72)` = 14 |
| **ETRI 관계** | ETRI rawScore(예: 51/100)와 완전히 무관. 구조적으로 분리된 별개 값. |
| **완화 조치** | 종합점수 CardHeader에 "AI 1차 평가" 라벨 추가; ETRI provider일 때 "발음 항목은 AI 추정값" 안내 표시 |
| **후속 작업** | 실제 ETRI normalizedScore를 `pronunciation_reference_score`에 전달하여 AI 평가에 반영 (보정 완료 후) |

### KI-3: ETRI 점수 calibration 미완료

| 항목 | 내용 |
|---|---|
| **증상** | 원어민 낭독에서 ETRI rawScore 2.5~2.7/5 관찰 (예상 3.5+ 대비 낮음) |
| **원인 후보** | 긴 지문 전체 평가 / script 불일치 / 마이크 음량 부족 / ETRI calibration 미적용 등 복수 |
| **현재 상태** | ETRI 점수는 "보정 전 참고값"으로 표시; 최종 발음 점수는 교수자 수동 확정 |
| **후속 작업** | PILOT_RELEASE_PLAN.md calibration checklist 완료 후 환산 비율 결정 |

---

*분석 완료: 2026-05-05 / 추가 보정: 2026-05-06 / Known Issues 추가: 2026-05-07 / 10-E-6-I 업데이트: 2026-05-07*

---

## Phase 10-E-6-A 업데이트 (2026-05-07)

### 해소된 갭

| 갭 | 내용 | 해결 방법 |
|---|---|---|
| q2/q3 ETRI 실패 카드 | PRONUNCIATION_PROVIDER=etri 시 자유발화 문항에 ETRI 호출 → 실패 카드 표시 | speaking-client.tsx: qt-reading 아닌 문항은 /api/pronunciation 완전 건너뜀 |
| q4 제출 오류 | dialogue-actions.ts에서 빈 Blob으로 ETRI 호출 → ffmpeg 실패 → Promise.all reject → submitDialogue throw | dialogue-actions.ts: ETRI 호출 제거, inline mock PronunciationResult 사용 |
| q3 듣기 자극 없음 | src 없고 ttsScript 없어 버튼 비활성 | assessment-assets.ts: ttsScript 등록; question-asset-renderer.tsx: TTS fallback 재생 |
| q2 placeholder 안내 없음 | 이미지 없어도 "임시 이미지" 표시 없음 | question-asset-renderer.tsx: status=placeholder 시 안내 표시 |
| q4 AI 응답 부자연 | 완료 후 "감사합니다!" 반복, 절차 질문 처리 없음 | conversation/index.ts: 완료 시 구체적 메시지; dialogue-policy.ts: isProceduralQuestion() 추가 |
| result page 발음 카드 | q2/q3/q4에서도 ETRI scope 오류 카드 노출 | result/page.tsx: question type별 조건 렌더링 |

### 잔존 Known Issues
- ETRI 점수 calibration 미완료 (KI-3 유지)
- q2 이미지: SVG 파일럿용 임시 자료 등록 완료 (10-E-6-I) — 파일럿 전 실제 사진으로 교체 권장
- q3 실제 mp3 미등록 (파일럿 전 교체 필요, 세 레벨 모두)

*업데이트: 2026-05-07*

---

## Phase 10-E-6-I 업데이트 (2026-05-07)

### 해소된 갭

| 갭 | 내용 | 해결 방법 |
|---|---|---|
| beginner q2 placeholder 표시 | `status: 'placeholder'` + 이미지 파일 없어 placeholder 박스 표시 | `beginner-restaurant-scene.svg` 직접 제작 SVG 등록, `status: 'ready'` 변경 → 실제 이미지 표시 |
| "임시 이미지 · 실제 사진 교체 예정" 문구 노출 | `status === 'placeholder'` 조건 의존 | `status: 'ready'`로 변경하여 자동 제거 |

### 중급/고급 반영 범위 조사 결과

| 항목 | 상태 |
|---|---|
| intermediate-set-1 / advanced-set-1 q1~q4 문항 존재 | ✅ 모두 존재 (`questions.json`) |
| q2 자료 asset | ✅ 중급/고급은 인라인 차트 (`status: 'ready'`), 이미지 파일 불필요 |
| q3 script / TTS fallback | ✅ ttsScript 등록됨. 실제 mp3는 미등록 (파일럿 전 교체 필요) |
| q4 dialogue mission 공통 로직 | ✅ question-id 기준 분기 (`detectBeginnerCafe` / `detectIntermediateAdmin` / `detectAdvancedEvent`) |
| q4 missionGoals 구조 | ✅ 중급 3개(수업시간·결석자료·상담시간), 고급 3개(일정조정·발표주제·별도회의) — 초급 4개와 다른 구조, 이미 별도 정의됨 |
| q2/q3 requiredElements 기반 평가 보정 | ✅ `detectRequiredElements()` 범용 처리 — 모든 레벨 동일 적용 |
| result page / attempt summary 공통 수정 | ✅ typeId 기준 분기 — 레벨 무관 공유 |
| 중급/고급 시연 활성화 안전성 | `isActive: true` 이미 활성화됨. 코드 버그 없음. 단 q3 TTS 의존, q4 대화 흐름 충분히 검증되지 않음 |
| 1차 시연 전 비활성화 권장 여부 | 1차 시연은 초급 중심 권장. 비활성화 필요 시 `question-sets.json` isActive 변경으로 즉시 가능 |

### 잔존 Known Issues (10-E-6-I 이후)
- beginner q2 SVG: 파일럿 전 실제 사진 교체 권장 (`teacherOnlyNote` 유지)
- q3 실제 mp3: 세 레벨 모두 미등록 (TTS fallback 상태)
- 중급/고급 q2/q3 결과 화면 세부 안내 문구 및 q4 대화 흐름 정비: 2차 시연 전 별도 작업 필요

*업데이트: 2026-05-07*

---

## Phase 10-E-6-K 업데이트 (2026-05-07)

### 해소된 갭

| 갭 | 내용 | 해결 방법 |
|---|---|---|
| ETRI 실패 시 학습자 화면에 큰 오류 카드 노출 | "ETRI 서버 호출에 실패했습니다. endpoint 확인 필요" 등 개발자식 문구가 amber 큰 카드로 표시 | `etri-fallback-notice` 작은 텍스트로 교체. "ETRI 발음평가는 현재 외부 서버 연결 확인 중입니다." 학습자 친화 문구 사용 |
| 1차 시연에서 ETRI 발음평가 흐름을 보여줄 수 없음 | ETRI 실패 시 데모 불가 | `/student/etri-pronunciation-demo` 데모 페이지 신규 추가. 시연용 샘플 2개로 교정 흐름 시연 가능 |
| q1 결과에서 ETRI 데모 진입점 없음 | ETRI 발음 교정 흐름을 별도 화면으로 안내하지 못함 | q1 결과 발음 카드 하단에 "ETRI 발음 교정 데모 보기" 버튼 추가 |
| 발음 오류 위치 표시 수단 없음 | recognized vs reference 비교 로직 없음 | `computeEtriWordDiff()` 유틸 신규 추가. 구두점 제거 후 word-level sequential diff |

### 잔존 Known Issues (10-E-6-K 이후)
- ETRI 실시간 endpoint/network 안정성: 1차 시연 후 별도 확인 필요
- 발음 오류 위치: ETRI score와 recognized 결과를 바탕으로 앱에서 추정 (직접 음소 반환 아님)
- 정밀 음소 단위 발음 교정: 후속 단계에서 검토 예정
- beginner q2 SVG: 파일럿 전 실제 사진 교체 권장
- q3 실제 mp3: 세 레벨 모두 미등록 (TTS fallback 상태)
- 중급/고급 q2/q3/q4 세부 정비: 2차 시연 전 별도 작업 필요

*업데이트: 2026-05-07*
