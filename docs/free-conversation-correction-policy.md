# 자유 대화 교정 정책 (v1.1 단계 18 [K])

자유 대화에서 학습자 발화를 NPC가 어떻게 교정·호응할지 정의한다.
1차 시연(2026-05-11) 사용 사례를 코드화해 추후 동작을 모호함 없이 재현하기 위함.

## 1. 정책 두 단계

| `correction_severity` | 적용 기준 | NPC 응답 | `corrected` 필드 | `reason` 필드 |
|---|---|---|---|---|
| `none` | 학습자 발화가 한국어 모어 화자에게 자연스럽게 들리고 의미가 명확함 | 자연스러운 호응만 | `original` 그대로 | 짧은 칭찬 한 줄 |
| `minor` | 의도가 명확하지만 더 자연스러운 표현이 있음 (조사·어미·자연스러운 어순·띄어쓰기 등) | 자연스러운 호응만, 교정 설명 X | 더 자연스러운 표현으로 변경 | 한 줄 짧은 안내 (설명 없이 비교만) |
| `meaning_error` | 단어·문법 오류로 의미가 달라지거나 헷갈림 | 1문장 이내 짧은 짚어주기 | 의미가 통하는 표현으로 변경 | 짧은 설명 포함 |

## 2. 시연 사례 (재현 기준)

### 사례 A — `minor`
- 학습자: "조각 케이크 일 조각 주세요"
- severity: `minor`
- corrected: "조각 케이크 한 조각 주세요"
- reason: "'일 조각'보다 '한 조각'이 자연스러워요."
- npc_response: "네, 조각 케이크 한 조각 준비해 드릴게요." (설명 없이 호응)

### 사례 B — `meaning_error`
- 학습자: "카드로 교체할게요"
- severity: `meaning_error`
- corrected: "카드로 결제할게요"
- reason: "'교체'는 바꾼다는 뜻이라 결제 상황에서는 '결제'가 맞아요."
- npc_response: "아, 카드로 결제하시는 거죠? ('교체'는 '바꾸다' 뜻이라 결제에는 '결제'를 써요)"

## 3. 클라이언트 표시 정책

- `none`: 교정 카드 미표시. NPC 응답만 보여준다.
- `minor`: NPC 응답 아래 인라인으로 짧은 호응(미세 교정) 한 줄. 강조 X (배경색 없음, `text-text-secondary`).
- `meaning_error`: 별도 교정 카드(요약·강조) — 기존 `learner_correction` 카드 디자인 유지.

## 4. 모국어 다국어 응답 (v1.1 16-10-2 / 단계 18 연계)

`motherTongue`가 외국어(`en`/`vi`/`ar`)이면 `reason` 필드를 다국어 객체로 응답:

```json
"reason": {
  "ko": "'교체'는 바꾼다는 뜻이라 결제에는 '결제'가 맞아요.",
  "en": "'교체' means 'replace', so use '결제' (pay) for payment situations.",
  "vi": "'교체' nghĩa là thay đổi; ở tình huống thanh toán dùng '결제'.",
  "ar": "..."
}
```

## 5. 회귀 방어

- `src/lib/llm/build-persona-system-prompt.ts`의 `correctionBlock`이 위 정책을 LLM에 전달.
- JSON 출력 스키마에 `correction_severity` 필드 포함.
- 클라이언트 파서/타입은 `correction_severity?: 'none'|'minor'|'meaning_error'`을 옵션으로 받아 호환 유지.

## 6. 이력

- 2026-05-16: 단계 18 [K]에서 시연 동작을 명문화. 기존 동작과 1:1 재현.
