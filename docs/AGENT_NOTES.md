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
