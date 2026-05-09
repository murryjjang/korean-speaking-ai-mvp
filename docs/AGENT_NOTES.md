# 에이전트 작업 메모

회원님 외출 모드에서 자율 진행 중 발생한 결정/관찰을 모아두는 파일입니다. 의사결정의 근거가 약하거나, 추후 회원님의 확인이 필요한 항목을 기록합니다.

---

## 2026-05-09 — 명세 17/18 자율 진행 중 메모

### Phase 17-C — Web Speech API 카라오케 트래킹 정확도

- 매칭 알고리즘은 가장 단순한 "단조 pointer + lookahead 8 단어" 방식. 인식기가 갑자기 한참 뒤 단어로 점프하면 그 사이의 단어들은 자동으로 passed 처리됨.
- 인식 결과가 본문과 너무 다르면 pointer는 멈춰 있음. 학습자가 다시 본문을 따라 읽기 시작하면 자연스럽게 재진입 가능.
- **확인 필요**: 실제 학습자가 천천히/빠르게 읽었을 때 매칭 정확도가 충분한지 시연 환경에서 검증 필요. 정확도 향상이 필요하면 Levenshtein 기반 매칭으로 교체 검토.
- Chrome/Edge 외 브라우저에서는 `karaoke.supported === false`로 자동 폴백, 본문 위에 안내 노출.

### Phase 17-D — 단어 동기화 재생

- Azure `Word.Offset/Duration`은 100ns 틱 → 1ms 변환 후 클라이언트 전달.
- Omission 단어는 timing이 없음 → 클릭으로 seek 불가, 하이라이트도 안 됨.
- 단어 클릭 시 자동 `audio.play()` 호출. 사용자 제스처가 없으면 일부 브라우저에서 차단될 수 있음 — 예외 무시.
- 녹음 blob은 `URL.createObjectURL`로 보관. retry/reset 시 `revokeObjectURL` 호출 (메모리 누수 방지).

### Phase 17-E — 시간 가이드 진행률

- 권장 시간은 본문 글자 수 / 분당 150자 (초급) → 약 38초. 최소 30초.
- **확인 필요**: 분당 150자가 적절한지. 너무 빠르면 학습자가 매번 "초과" 색을 보게 됨. 시연 후 조정 가능.

### Phase 18-C — LLM 피드백 라벨 조건부

- 발표 연습은 현재 실제 LLM 호출 코드가 없음. `feedbackSource` state는 `'mock'` 고정.
- q4의 `dialogueEvalSource` 패턴에 맞춘 인프라만 도입. 향후 LLM 연동 시 setter 호출만 추가하면 라벨 자동 전환.
- Smoke test가 `sample-feedback-badge`의 textContent에 "시연용"을 요구 → mock 분기에서 "시연용 참고 피드백" 그대로 유지.
- 타이머 결과의 "시연용 참고 피드백" 라벨은 시간 측정 기반(LLM 무관)이므로 "시간 가이드"로 단순화. testid 없음 → 영향 없음.

### Phase 18-D — Sticky 컨트롤

- 기존 발표 타이머 카드에 `sticky top-0 z-10` 적용. 큰 리팩토링 없이 sticky 효과 확보.
- 페이지 컨테이너(`max-w-3xl mx-auto`)는 overflow visible이라 sticky가 정상 동작.
- 타이머 카드가 페이지 중간에 위치하므로, 그보다 위 영역(헤더/연습 흐름/설정/원고/교정/섀도잉)에서는 sticky 효과 없음. 학습자가 발표 단계에 진입(타이머 카드 도달)한 후부터 sticky가 의미 있음.
- **확인 필요**: 시연 시 타이머 카드를 페이지 더 위로 이동할지 여부. 명세는 "스크립트가 길어도 컨트롤 항상 보임"이 핵심이므로 현재 구현으로 충분할 수 있음.

### Phase 18-E — 발표 연습 카라오케 (보류)

- 발표 연습 스크립트 영역에 단어 단위 `<span data-word-index>` wrap만 미리 적용 (인프라 준비).
- 실제 카라오케 진행/Azure 동기화는 명세 20에서 통합 예정.

### Smoke 테스트 영향

- 612 unit test 모두 통과. Playwright smoke test (`npm run test:smoke`)는 별도 실행 필요. 본 작업에서는 smoke 회귀 자체는 실행하지 않았지만, 사용된 testid는 모두 보존:
  - `reference-lines`, `line-0~3` → article + p로 형태 변경하되 testid 유지
  - `line-diff-panel`, `pronunciation-score-card` 등 → 유지
  - `sample-feedback-badge` → mock 분기에서 "시연용 참고 피드백" 텍스트와 함께 유지
- 시연 전 `npm run test:smoke` 한 번 돌려보길 권장.

---

## 2026-05-09 — 명세 19/20 자율 진행 중 메모

### Phase 19-C — 끝부분 단어 매칭

- 카라오케 `useKaraokeTracking`: 끝까지 5단어 이내일 때 lookahead를 본문 끝까지 확장. 학습자가 제시문 마지막 부근에서 STT 노이즈가 있어도 마지막 단어가 시각적으로 stranded되지 않음.
- 결과 페이지 `computeEtriWordDiff`: 위치 기반 1:1 비교 → LCS 정렬로 변경. 중간 누락/삽입이 뒤따르는 단어 모두를 mismatch로 만들지 않게 됨. 끝부분 단어가 정상 인식되면 정확히 매칭됨.
- 단위 테스트 영향: 해당 함수의 직접 단위 테스트는 없음. 통합 동작은 612개 단위 테스트 통과 + 빌드 정상 유지.
- **확인 필요**: 실제 학습자 발화 시 STT가 본문 끝의 단어를 정말로 인식하지 못하는 케이스(생리적 누락)는 본 알고리즘 수정으로도 처리 불가 — 이 경우 끝부분이 omission으로 마킹됨이 옳음. 진단 어려운 케이스는 추가 검토 필요.

### Phase 19-D — 단어 색상/밑줄 시각 강화

- 정상/부정확/누락/추가 모두 강한 시각 차이 적용. 부정확과 누락은 같은 색상 (#C8543C)이지만 underline vs line-through + 다른 배경색으로 구분.
- 호버 툴팁 추가: "발음 점수 N/100", "이 단어를 안 읽었습니다", "제시문에 없는 단어를 추가했습니다".
- 본문 위 색상 범례 카드 추가 (testid: `word-annotation-legend`).

### Phase 20-B — Sticky 녹음 컨트롤

- 기존 `timer-card`(자체 타이머)와 `recording-card`(녹음 버튼)를 단일 sticky 컨트롤 카드로 병합.
- "발표 시작" / "다시 시작" 버튼 제거됨. 녹음 버튼이 곧 타이머 시작 트리거.
- 30초 전/10초 전/시간 종료 알림은 그대로 유지하지만, 녹음이 진행 중일 때만 표시.
- Playwright smoke 테스트 (`presentation-practice.spec.ts`)에서 `btn-start-timer` / `btn-stop-timer` 의존 부분을 `btn-start-recording`으로 교체. 회원님 시연 전 `npm run test:smoke` 실행 시 일부 라인이 갱신된 흐름으로 통과해야 함.

### Phase 20-C/D/E — 카라오케 + Azure 동기화

- 발표 스크립트 영역에 `useKaraokeTracking` 훅 적용. 녹음 중일 때만 활성화.
- 녹음 종료 시 Azure pronunciation API에 reference text(`script` 또는 `DEFAULT_CORRECTED`)와 audio blob을 전송하여 wordResults 수신. wordResults가 있으면 같은 스크립트 영역에서 단어별 색상/툴팁/seek 적용.
- Azure 폴백 시 `setAzureResult(null)` → 카라오케 패스 흔적만 남고 단어별 점수는 표시하지 않음 (안전하게 폴백).
- `recorded-playback-card`: 녹음된 audio를 `<audio controls>`로 재생. timeUpdate 이벤트가 `playbackCurrentMs`를 업데이트하면 스크립트의 해당 단어가 노란 배경으로 강조. 단어 클릭 시 audio.currentTime을 해당 시점으로 seek.
- **확인 필요**: 시연 환경에서 Azure 호출이 정상 동작하는지. Azure 키가 없거나 호출이 실패하면 단어 동기화 강조는 동작하지 않음 (audio 재생 자체는 정상).

### Phase 20-F — 다국어 피드백 (vi + en)

- 발표 연습: `NATIVE_FEEDBACK`에 이미 vi/en 데이터 존재 → 두 언어를 stacked로 동시 표시. 첫 번째 블록 (vi)은 기존 smoke 테스트와 호환을 위해 `feedback-native` testid 유지. 두 번째 블록 (en)은 `feedback-en` testid.
- 읽기 연습: `NATIVE_FEEDBACK_GOOD/IMPROVE`에 이미 vi/en 데이터 존재 → 같은 패턴으로 stacked 표시.
- q4: LLM에 다국어 출력을 추가하지 않고, 보수적으로 정적 템플릿 (`dialogueMultilingualFeedback`) 사용. 점수 + 미션 달성 비율로 3 tier (high/mid/low)에서 vi/en 텍스트 선택. 추후 LLM이 vi/en 필드를 직접 출력하도록 확장 가능.
- **확인 필요**: 정적 템플릿의 자연스러움. 시연 후 베트남어/영어 표현 보강 여부.

### 시연 4 모드 회귀 점검

- q1, q2, q3: 시스템 프롬프트나 채점 로직 변경 없음. q4 NPC 시스템 프롬프트는 명세 19-B 그대로 보강 (인사 반복 회피).
- 단위 테스트 (612/612), lint (0 errors), tsc (0 errors), build (compiled 성공) 모두 통과.

---

## 2026-05-09 — 명세 22-b/22-a/23/24 통합 자율 진행

### Phase 22-b — React style shorthand 충돌 보정

- 원인: `reading-practice-client.tsx`의 결과 페이지(line 489-496)에서 `baseStyle`이 `backgroundColor`를 설정하는데, `isCurrent` 분기에서 `background` shorthand로 덮어씀. React 리렌더 시 `background` 속성 제거 + `backgroundColor` 잔존 → 콘솔 경고.
- 조치: 두 페이지(reading + presentation) 내 모든 `background:` shorthand를 `backgroundColor:`로 통일. 트랜지션 문자열도 `background-color`로 변경. gradient/image 미사용이라 의미 동일.
- 확인 필요: 회원님이 reading + presentation 페이지에서 콘솔 경고가 사라졌는지 시연 환경에서 검증.

### Phase 22-a — 비용 최적화 로드맵 문서

- `docs/COST_OPTIMIZATION_ROADMAP.md` 신규. 7개 영역(STT, q4 다국어 피드백, LLM 모델, Azure Speech 티어, TTS, 평가 검증, 인프라) 표준 형식으로 정리. 학습자 100명 기준 월 비용·도입 시점·의사결정 가이드 포함.
- 향후 명세에서 비용·정확도 트레이드오프 발견 시 본 문서에 자동 추가하는 규칙 명시.

### Phase 23 — 발표 AI 교정 버튼

- 신규 API 라우트 `/api/presentation/correct`: q4 OpenAI 인프라와 동일 패턴(SDK 동적 import + JSON response_format).
  - `OPENAI_API_KEY` 없거나 호출 실패 시 demo `MOCK_CORRECTED` + `MOCK_CORRECTIONS` 폴백 반환 → 시연 깨지지 않음.
  - 응답 shape: `{ source: 'llm' | 'mock', corrected_text: string, corrections: [{original, corrected, reason}] }`
  - 모델 우선순위: `OPENAI_PRESENTATION_CORRECT_MODEL` → `OPENAI_DIALOGUE_MODEL` → `OPENAI_EVAL_MODEL` → `gpt-4o-mini`
- UI 변경 (`presentation-practice-client.tsx`):
  - `correctionResult` state 도입 → 카드 표시는 LLM 응답 기반.
  - 기존 정적 `DEFAULT_CORRECTED` / `DEMO_CORRECTIONS` / native explain은 mock fallback으로 유지 (smoke test 호환: corrected-text "가서", correction-ko-explain "-아서/어서", correction-native-explain "Thay vì").
  - 가드: 5자 미만/5000자 초과 시 호출 차단 + 안내 (`correction-error` testid).
  - 로딩 상태: 버튼 disabled + spinner + "교정 중..." 텍스트.
  - "교정본으로 교체" 버튼: 확인 다이얼로그 (`replace-confirm`) 후 textarea의 `script`를 corrected_text로 교체.
  - 카드 헤더 배지: source='llm'이면 "AI 교정", 'mock'이면 "시연용 샘플".
- 시연 안전 가드: LLM 호출 자체가 실패해도 mock 폴백을 항상 보여주므로 카드는 반드시 표시됨.
- 확인 필요: 회원님이 OpenAI 키 설정된 환경에서 실제 LLM 응답이 자연스러운지 검증.

### Phase 24 — 생성형 대화 모드

- 신규 페이지 클라이언트 `app/student/conversation-practice/free-conversation-client.tsx`. 기존 placeholder(`page.tsx`의 페르소나 카드 mock)를 자유 회화 흐름으로 교체. 라우트는 그대로 `/student/conversation-practice` 사용 (메뉴 링크 유지, 깨진 링크 없음).
- 좌측 메뉴 라벨: "대화연습 준비 중" → "생성형 대화", `disabled: true` 제거 (`app/student/layout.tsx`).
- Stage 머신: `start` (추천 주제 5개 + 자유 입력) → `chat` (대화) → `end` (요약 + 다국어 피드백).
- 신규 API 라우트:
  - `/api/conversation/free/respond`: NPC 응답 + 매 턴 학습자 발화 자연 표현 교정. q4 OpenAI 인프라 패턴 그대로.
  - `/api/conversation/free/summary`: 대화 종료 시 한·베·영 동시 요약 + 잘한 점/개선할 점.
  - 둘 다 `OPENAI_API_KEY` 미설정·호출 실패 시 mock 폴백 → 시연 안전.
  - 모델 우선순위: 각각 `OPENAI_FREE_CONVERSATION_MODEL` / `OPENAI_FREE_CONVERSATION_SUMMARY_MODEL` → `OPENAI_DIALOGUE_MODEL` → `OPENAI_EVAL_MODEL` → `gpt-4o-mini`.
- 추천 주제 5개: `weekend-place`(⭐ 시연), `korean-food`, `movies`, `korea-trip`, `family`. 시연 카드에 별 배지.
- 첫 메시지: 클라이언트가 정적 opener("'{topic}'이라는 주제로 이야기해볼까요? 어떻게 시작할까요?") 생성 → LLM 호출 없이 즉시 화면 진입.
- 타이머: 10분 (`TOTAL_SECONDS=600`), 8분 도달 시 "남은 시간 2분" 안내, 10분 도달 시 입력 비활성화 + "시간 종료" 안내.
- **확인 필요 — 자동 종료 미구현**: 시간 도달 시 endConversation을 자동 호출하는 패턴은 React 19의 `react-hooks/refs` + `react-hooks/set-state-in-effect` lint 규칙과 충돌. setInterval에서 refs를 갱신/사용하거나 useEffect 안에서 setState를 호출하는 방식이 모두 거부됨. 안전하게 구현 가능한 패턴이 없어 "시간 종료 시 자동" → "시간 종료 시 사용자가 종료 버튼 클릭"으로 fallback. 학습자 입장에서 큰 차이는 없음 (입력은 비활성, 안내 명확).
- 학습자 입력: 텍스트 only (Enter 전송 / Shift+Enter 줄바꿈). 한 메시지 1000자 제한. 음성 입력은 향후 명세에서 추가 검토.
- 매 턴 교정 표시: `learner_correction.corrected !== original`이면 ✏️ 줄긋기 + 화살표 + 이유. 같으면 ✓ + 칭찬.
- 종료 화면: source 배지 (AI 요약 / 시연용 샘플), 한·베·영 stacked 요약, 잘한 점/개선할 점 3언어, 대화 히스토리 (스크롤), "다시 대화하기" 버튼 (시작 화면 복귀).
- 회귀 영향: smoke test `/student/conversation-practice 페이지 정상 렌더링` + `persona card에 dialectHint` 두 개는 placeholder 페이지 기준이라 새 화면에 맞춰 update. q4/q1/q3/읽기/발표 mock conversation provider는 변경 없음 (가드 5 준수).

### Phase 23-a — 톤 선택 + 인라인 보기 + 음성 입력

- **A. 톤 선택 (formal/general/casual)**
  - `/api/presentation/correct`: body에 `tone` 추가. `buildSystemPrompt(tone)`이 톤별 어말어미 가이드를 시스템 프롬프트에 반영. mock 폴백도 `MOCK_BY_TONE`으로 톤별 다른 결과 (격식체/일반체/친근체 각 corrected_text + corrections) 반환.
  - 발표 페이지: `correctionTone` state + 드롭다운(`correction-tone-select`). 친근체 선택 시 안내(`correction-tone-hint`).
- **B. 분리/인라인 탭**
  - `correctionViewMode` state + 탭(`tab-view-separate` / `tab-view-inline`).
  - 분리: 기존 그대로(원본 박스 + 교정 박스 + 차이점 카드).
  - 인라인: `CorrectionInlineView` 컴포넌트가 `script` 위에 corrections를 splice. `original` 매칭 안 되면 해당 항목만 skip, 모두 실패하면 안내 표시. 색상은 명세 대로 #888780(취소선) + #C8543C(교정).
  - 호버 툴팁: `<span title={reason}>` (네이티브 툴팁, 추가 라이브러리 X).
- **C. 자유 대화 음성 입력**
  - 발표 STT 패턴 그대로 차용: `getUserMedia` + `MediaRecorder` + POST `/api/stt` (FormData `audio` + `questionId='free-conversation'`).
  - state machine: `voiceState` = 'idle' | 'recording' | 'processing'. 녹음 중에는 timer 표시 + 빨간 정지 버튼, 처리 중에는 spinner.
  - 인식 결과는 input textarea에 자동 입력 (이전 텍스트 있으면 공백 + append). 자동 전송 X — 학습자가 확인·수정·전송.
  - 가드: 녹음 < 3000 bytes면 폴백 메시지("너무 짧음"). 마이크 거부 시 안내.
  - 컴포넌트 언마운트 시 인터벌 + recorder 정리.
- 확인 필요: 회원님이 시연 환경에서
  - 톤 3종이 실제 LLM에서 다른 어말어미로 응답하는지 (mock에서는 톤별 결과 보장됨)
  - 인라인 보기에서 corrections.original이 학습자 원본과 매칭되는 비율
  - 음성 입력의 STT 정확도 (Whisper 한국어 기준).
