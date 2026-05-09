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
