# Backlog — 별건 분리 항목

Sprint 1 마이그레이션(`supabase/migrations/20260520_sprint1_new_tables.sql`) 작업 중
별건으로 분리된 후속 항목. (적용 보류 — Option A 유지)

---

## #18 — 파일럿 P060–P066 auth.users 계정 생성 마이그레이션

**상태:** 미착수 (별건)
**배경:** Sprint 1 신규 테이블(vocab_cards·group_members·level_tests·action_log 등)과
`user_profiles` ALTER는 모두 `auth.users(id)` 기반 RLS(auth.uid())로 설계됨. 그러나 현재
라이브 파일럿 참여자(P060–P066)는 `research_participants` 테이블 기반이며 **auth.users
계정이 없음**. 따라서 신규 스키마는 이 계정 마이그레이션 전까지 forward-looking 상태.

**해야 할 일:**
- 파일럿 참여자를 Supabase Auth(`auth.users`) + `user_profiles`(role='student')로 적재
- `research_participants` ↔ `auth.users`/`students` 매핑 정책 결정 (신규 계정 vs 기존 연결)
- 로그인 경로 정합성 검토 (`/research/login` 코드 기반 vs `/login` 이메일 기반)
- 별도 마이그레이션 + seed 스크립트로 분리 작성

**의존:** Sprint 1 마이그레이션 적용 결정과 무관하게 선행/병행 가능하나, 신규 기능을
파일럿 참여자에게 노출하려면 본 항목이 선행돼야 함.

---

## task 1.4 후속 — 자유대화 사후 태깅

**상태:** 미착수 (별건)
**배경:** `content_tags` 등 태깅 테이블은 `questions(id)`(낭독·발표·듣고답하기·대화미션)에만
FK로 연결됨. **자유대화는 persona(코드 상수) + 자유 입력 topic** 구조라 고정 DB content
행이 없어 현재 태깅 체계 대상이 아님 (사용자 확인 완료, 의도된 제외).

**해야 할 일 (별도 설계 필요):**
- 자유대화 세션의 사후 태깅 모델 정의 (예: 통합 content 테이블 도입, 또는 personas/scenarios
  태깅, 또는 research_sessions 단위 사후 라벨링)
- 태깅 대상 식별자(고정 content_id가 없는 동적 콘텐츠) 처리 방안 결정

---

## #15 — topic_adherence LLM 판정 실측

**상태:** 미착수 (backlog #13 옵션 A 후속)
**배경:** backlog #13 옵션 A로 summary LLM이 `topic_adherence`(on/partial/off)를 출력하고
종합 점수에 멀티플라이어(1.0/0.75/0.5)를 적용. 단 LLM 판정 정확도는 미실측.

**해야 할 일:**
- mock/로컬 시나리오 3–5건으로 on/partial/off 판정 실측 (실제 OPENAI 호출)
- 특히 **partial 경계 케이스** 검증 (일부 관련 + 일부 이탈을 LLM이 on/off로 쏠리지 않는지)
- 필요 시 프롬프트의 partial 정의·예시 보강

## #16 — 보정 안내 UI wording 다듬기

**상태:** 미착수 (backlog #13 옵션 A 후속, 시연 후)
**배경:** 옵션 A에서 보정 시 `주제 반영 보정 ×0.5 (발음 평균 N)`를 종합 점수 카드에 노출.
"×0.5" 등 기술 표현이라 학습자 친화적이지 않음.

**해야 할 일:**
- 시연 피드백 반영해 학습자 친화 문구로 교체 (예: "주제와 다른 이야기가 많아 점수가 조정됐어요")
- i18n(Localized spec) 키로 다국어 처리 검토 (현재 `lang="ko"` 평문)

---

## 야간1 자동화 후속 (M3-a·M5 발견)

### #15 후속 — LLM 회귀 실측 실행
**상태:** harness 완료, 실측 미실행
**배경:** `tests/llm-regression/free-conversation-summary.real.test.ts` 가 on×5/partial×5/off×5
(ko/en/vi) 실호출 분류 정확도 + anti-hallucination(off→strengths[], partial→≤1, 복귀 안내)을
검증한다. mock 10건은 CI 상시 통과(`free-conversation-summary.test.ts`).
**해야 할 일:** `LLM_REGRESSION_REAL=true npx vitest run tests/llm-regression/free-conversation-summary.real.test.ts`
실행 → 특히 partial 경계 5건 판정 확인 → 필요 시 프롬프트 partial 정의·예시 보강.

### M3-a fixture 7언어 확장
**상태:** 미착수 (fixture 파일에 TODO 주석)
**배경:** 현재 ko/en/vi. ar 은 multilingual 경로(motherTongue 'ar'). th/ms/km 은
비multilingual 경로지만 helperLang 이 en/vi/ar 만 유효해 매핑 정책 미정의.
**해야 할 일:** ar fixture 즉시 추가 가능 · th/ms/km 은 helperLang 폴백 정책 결정 후 추가.

### M5 후속 — 자유대화 풀스코어 e2e (오디오 픽스처)
**상태:** 미착수
**배경:** 현재 free-conv e2e 는 채팅 진입까지만(헤드리스 마이크 한계). #13 "주제 이탈 → ≤50"
수치 보증은 `tests/unit/free-conversation-score.test.ts` 가 결정론적으로 가드 중.
**해야 할 일:** 사전 녹음 오디오 픽스처 주입 → 발음 점수 → end 단계 점수 카드
(`pron-summary-topic-adjust` ×0.5)까지 보는 풀스코어 e2e (시연 1주 전 우선순위 검토).
