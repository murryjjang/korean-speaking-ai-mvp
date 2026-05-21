# Backlog — 별건 분리 항목

Sprint 1 마이그레이션(`supabase/migrations/20260520_sprint1_new_tables.sql`) 작업 중
별건으로 분리된 후속 항목. (적용 보류 — Option A 유지)

> 결정 근거는 `docs/spec/DECISIONS.md`(D-NNN) 참조.

## 상태 enum 범례

| enum | 의미 |
|---|---|
| `pending` | 미착수 (대기) |
| `in-progress` | 진행 중 (일부 산출물 존재) |
| `blocked` | 선행 의존 항목 미완으로 막힘 |
| `done` | 완료 |

**시점 enum**: 즉시 / 다음 야간 / Sprint 종료 시 / 시연 후

---

## #18 — 파일럿 P060–P066 auth.users 계정 생성 마이그레이션

**상태(enum):** `pending`
**의존성:** Sprint 1 마이그레이션 적용(Task 1.2)과 무관하게 선행/병행 가능. 단 신규 기능을 파일럿에 노출하려면 본 항목이 선행돼야 함 (D-005).
**시점:** 시연 후 (신규 기능 파일럿 노출 시점에 맞춰)

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

**상태(enum):** `pending`
**의존성:** 동적 콘텐츠(고정 content_id 없음) 태깅 모델 설계 선행 필요. `content_tags` FK 대상이 아니므로 별도 스키마 결정에 의존 (D-004).
**시점:** Sprint 종료 시 (또는 시연 후, 자유대화 분석 요구 발생 시)

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

**상태(enum):** `pending`
**의존성:** #13 옵션 A 출력 계약(D-003) 확정 완료 → 실호출 분류 정확도 실측만 남음. OPENAI 실호출 환경 필요.
**시점:** 다음 야간 (prompt 변경 직후 또는 주 1회 실호출 정책에 맞춰)

**상태:** 미착수 (backlog #13 옵션 A 후속)
**배경:** backlog #13 옵션 A로 summary LLM이 `topic_adherence`(on/partial/off)를 출력하고
종합 점수에 멀티플라이어(1.0/0.75/0.5)를 적용. 단 LLM 판정 정확도는 미실측.

**해야 할 일:**
- mock/로컬 시나리오 3–5건으로 on/partial/off 판정 실측 (실제 OPENAI 호출)
- 특히 **partial 경계 케이스** 검증 (일부 관련 + 일부 이탈을 LLM이 on/off로 쏠리지 않는지)
- 필요 시 프롬프트의 partial 정의·예시 보강

## #16 — 보정 안내 UI wording 다듬기

**상태(enum):** `pending`
**의존성:** #13 옵션 A 보정 노출(D-003) 완료에 의존. 시연 피드백 입력이 있어야 문구 방향 결정 가능.
**시점:** 시연 후 (시연 피드백 반영)

**상태:** 미착수 (backlog #13 옵션 A 후속, 시연 후)
**배경:** 옵션 A에서 보정 시 `주제 반영 보정 ×0.5 (발음 평균 N)`를 종합 점수 카드에 노출.
"×0.5" 등 기술 표현이라 학습자 친화적이지 않음.

**해야 할 일:**
- 시연 피드백 반영해 학습자 친화 문구로 교체 (예: "주제와 다른 이야기가 많아 점수가 조정됐어요")
- i18n(Localized spec) 키로 다국어 처리 검토 (현재 `lang="ko"` 평문)

---

## 야간1 자동화 후속 (M3-a·M5 발견)

### #15 후속 — LLM 회귀 실측 실행
**상태(enum):** `in-progress` (harness 완료, 실측 미실행)
**의존성:** harness(`free-conversation-summary.real.test.ts`) 완료 → `LLM_REGRESSION_REAL=true` + OPENAI 실호출 환경만 필요.
**시점:** 다음 야간 (실호출 빈도 정책: prompt 변경 직후 또는 주 1회 — D-007)

**상태:** harness 완료, 실측 미실행
**배경:** `tests/llm-regression/free-conversation-summary.real.test.ts` 가 on×5/partial×5/off×5
(ko/en/vi) 실호출 분류 정확도 + anti-hallucination(off→strengths[], partial→≤1, 복귀 안내)을
검증한다. mock 10건은 CI 상시 통과(`free-conversation-summary.test.ts`).
**해야 할 일:** `LLM_REGRESSION_REAL=true npx vitest run tests/llm-regression/free-conversation-summary.real.test.ts`
실행 → 특히 partial 경계 5건 판정 확인 → 필요 시 프롬프트 partial 정의·예시 보강.

### M3-a fixture 7언어 확장
**상태(enum):** `pending` (fixture 파일에 TODO 주석)
**의존성:** ar fixture는 즉시 추가 가능(multilingual 경로). th/ms/km은 helperLang 폴백 정책 결정 선행 필요(현재 en/vi/ar만 유효).
**시점:** ar = 다음 야간 / th·ms·km = Sprint 종료 시 (폴백 정책 결정 후)

**상태:** 미착수 (fixture 파일에 TODO 주석)
**배경:** 현재 ko/en/vi. ar 은 multilingual 경로(motherTongue 'ar'). th/ms/km 은
비multilingual 경로지만 helperLang 이 en/vi/ar 만 유효해 매핑 정책 미정의.
**해야 할 일:** ar fixture 즉시 추가 가능 · th/ms/km 은 helperLang 폴백 정책 결정 후 추가.

### M5 후속 — 자유대화 풀스코어 e2e (오디오 픽스처)
**상태(enum):** `pending`
**의존성:** 사전 녹음 오디오 픽스처 제작 + 헤드리스 마이크 주입 경로 필요. 현재 #13 ≤50 수치는 `tests/unit/free-conversation-score.test.ts`(D-006 d)가 결정론적으로 가드하므로 막힘은 아님(보강 성격).
**시점:** 시연 1주 전 (우선순위 검토 — 시연 시나리오 lock-in과 함께)

**상태:** 미착수
**배경:** 현재 free-conv e2e 는 채팅 진입까지만(헤드리스 마이크 한계). #13 "주제 이탈 → ≤50"
수치 보증은 `tests/unit/free-conversation-score.test.ts` 가 결정론적으로 가드 중.
**해야 할 일:** 사전 녹음 오디오 픽스처 주입 → 발음 점수 → end 단계 점수 카드
(`pron-summary-topic-adjust` ×0.5)까지 보는 풀스코어 e2e (시연 1주 전 우선순위 검토).

---

## 야간2 자동화 후속

### prompt v4 — per-term CEFR
**상태(enum):** `pending`
**의존성:** 1.3 일괄 적용 + 검토 결과(태깅 데이터 품질 보고)에 의존.
**시점:** 야간 3 vocabulary_terms 데이터 품질 보고 시 우선순위 결정

**배경:** 현재 `vocabulary_terms.cefr_level`은 콘텐츠 CEFR ±1 근사 — prompt v3가 어휘별
절대 CEFR를 출력하지 않아 1.3b가 `cefrForCategory()`(basic=−1·core=0·challenging=+1,
A1~C2 클램프)로 채운다 (D-001 보완).
**해야 할 일:** prompt v4에서 어휘별 절대 CEFR를 직접 출력하도록 확장 → 근사 제거.
정량 규칙·M3-b fixture·`src/lib/tagging/schema.ts` 동반 갱신.

---

## 야간3 진입 항목 (1.3 후속 — 11/12 적용 완료, 잔여 1건)

### 야간3-A — CLI `--review` edit → DB INSERT 경로 구현
**상태(enum):** `pending`
**의존성:** M4 CLI(`scripts/validate-tagging.ts`, 존재) + `tag-content-batch.ts persist()`(재사용 가능). 야간3-B의 전제.
**시점:** 야간 3 (잔여 처리 착수 시점)

**배경:** 현재 `validate-tagging.ts --review`는 `review-decisions.json`(approve/reject/edit)만 쓰고 **DB에 반영하지 않음**. `tag-content-batch.ts`는 자기 run의 pass만 INSERT. → 사람이 edit/approve한 결정을 `content_tags` 등에 적재하는 경로가 없다.
**해야 할 일:** `review-decisions.json`의 approve/edit → `persist()` 재사용해 upsert + `questions.is_tagged` 갱신.

### 야간3-B — 잔여 미태깅 1건 (advanced-q1-reading)
**상태(enum):** `blocked` (3-A 사람 편집에 의존)
**의존성:** 야간3-A(편집→INSERT 경로). **모델 격상으로도 미해결** — gpt-4o 작성자+검수자조차 정확한 목표 framing 불일치(D-011). prompt·모델 튜닝 한계 확인.
**시점:** 야간 4 (3-A 구현 시) 또는 시연 전

**배경:** 1.3 실 INSERT **11/12** 후 잔여 1건:
- `beginner-q1-reading`: **해소됨**(gpt-4o 작성자가 장르 오인 교정 → INSERT, D-011).
- `advanced-q1-reading`: **잔여** — 밀도 높은 추상 C1 메타텍스트라 자동 목표 추출이 본질적으로 어려움. gpt-4o로도 author/peer가 목표 framing 불일치.
**해야 할 일:** 3-A로 사람이 1건 learning_objective를 직접 확정 후 INSERT. (낭독이라 통과 시 `pronunciation_focus` 채워짐)

### BL-#3 — 콘텐츠 풀 1000건+ 작성자 모델 비용 재평가
**상태(enum):** `pending`
**의존성:** 콘텐츠 풀 규모 확대(현재 12건). D-011(gpt-4o 격상은 야간3 한정).
**시점:** 풀 1000건+ 도달 시 (또는 대량 일괄 태깅 착수 전)

**배경:** D-011로 야간3 한정 gpt-4o 작성자 사용(비용 5~10배). 12~100건 풀에선 무시 가능하나 1000건+에선 비용 유의.
**해야 할 일:** 대량 풀에서 gpt-4o-mini 복귀 + per-item fail만 gpt-4o 재시도하는 2단 전략 검토, 또는 mini prompt 추가 보강. 비용/품질 트레이드오프 재측정.

### BL-#4 — 자유대화 transcript 기반 어휘 자동 등록
**상태(enum):** `pending`
**의존성:** Task 1.4(자동 단어장) 기본 구현(콘텐츠 통과 트리거, D-012a) 완료 후 확장.
**시점:** 시연 후 (1.4 안정화 뒤)

**배경:** 1.4 자동 등록은 콘텐츠 통과(content_vocabulary core/challenging)만 트리거(D-012a). 자유대화 발화 transcript에서 학습자가 실제 쓴/마주친 어휘를 추출해 등록하면 개인화 강화.
**해야 할 일:** transcript 형태소·어휘 추출(LLM 또는 NER) → vocabulary_terms 매칭/신규 → vocab_cards 등록. 동적 콘텐츠라 식별자 처리 설계 필요([[task 1.4 후속]]과 연계).

### BL-#5 — 단어장 퀴즈 객관식 모드
**상태(enum):** `pending`
**의존성:** 1.4 주관식 recall(D-012b) 출시 후 학습자 선호 검증.
**시점:** 시연 후

**배경:** 1.4 답변은 주관식 recall+자가채점(D-012b, 능동 회상 학습효과). 객관식(4지선다) 선호 학습자용 모드는 별도. 오답 보기 생성(LLM) + quality 매핑(정오±속도) 필요.

### 야간3-C — prompt v3 미세조정
**상태(enum):** `done` (2026-05-21)
**배경/결과:** D-009(작성자 temp 0.0 + learning_objective/topic_tags 정확성) + D-010(낭독 목표 하이브리드 + peer rubric 유형별 정렬). 효과: material-desc 회귀 수정·작성자↔검수자 충돌 종식·낭독 `pronunciation_focus` end-to-end 작동(intermediate-q1-reading: 운영(연음)·변경된(경음화)). 1.3 8/12 → 10/12.
**잔여:** per-item 품질(야간3-B)은 prompt 차원 한계 — 더 튜닝하지 않음(thrash 임계).

### BL-#6 — 콘텐츠 admin: mission_scenarios·question_sets 전체 CRUD
**상태(enum):** `pending`
**의존성:** 1.7 questions CRUD(D-013) 완료. 두 엔티티는 스키마가 더 복잡(jsonb question_ids·시나리오 구조).
**시점:** 시연 후 (questions 관리 안정화 뒤)

**배경:** 1.7 MVP는 `questions` 전체 CRUD만(D-013b). `mission_scenarios`(대화미션)·`question_sets`(문항세트, question_ids jsonb)는 범위 외.
**해야 할 일:** 두 엔티티 CRUD UI/API 추가(question_sets는 question_ids 편집기 필요). 자유대화 personas/scenarios는 [[task 1.4 후속]]과 별개로 계속 범위 외.

### BL-#7 — 콘텐츠 admin 풀스택(검색·필터·일괄)
**상태(enum):** `pending`
**의존성:** 1.7 MVP CRUD 출시 후 콘텐츠 수 증가 시.
**시점:** 풀 규모 확대 시 / 시연 후

**배경:** 1.7은 MVP(목록·생성·수정·비활성). 콘텐츠가 많아지면 검색·type/난이도 필터·일괄 태깅(M4 큐 연동)·CSV 입출력 필요.
**해야 할 일:** 목록 검색·필터·정렬·페이지네이션 + 일괄 태깅(tag-content-batch 연동) + import/export.

### BL-#8 — 배너 컴포넌트 흐름 비종속 일반화 (B안)
**상태(enum):** `pending` (D-016 으로 배너 미사용 → BL-#10 재도입 시에만 유효)
**의존성:** BL-#10(배너 재도입). 재도입 안 하면 불요.
**시점:** 시연 후 (배너 재도입 시)

**배경:** 야간5에서 1.6 배너를 research 흐름에 wire-in하며 `DashboardBanner`에 `hrefs?` prop 주입(A안, 소변경)으로 해결(D-014). 흐름이 늘면 호출처마다 `lang`·`hrefs`·`vocabDueCount` 주입이 반복되고, 흐름별 동선 차이(예: research엔 SRS/vocab 미적용)가 호출부에 흩어진다. **D-016 으로 배너는 현재 어디에도 wire-in 되지 않음** — 본 항목은 BL-#10 재도입을 전제로만 의미.
**해야 할 일:** href·lang·vocab 적용 여부를 흐름 컨텍스트(흐름별 wrapper 또는 config 맵)로 캡슐화해 호출처 보일러플레이트 제거. 정식 학생 vs research 동선 차이를 한 곳에서 관리.

### BL-#9 — 인터페이스 전면 개편 (PMS 유사 · 디자인 시스템 표준화)
**상태(enum):** `pending`
**의존성:** 핵심 기능(1.x) 안정화 후. UI 표면이 굳은 뒤 일괄 개편이 효율적. BL-#8(배너 일반화) 흡수 가능.
**시점:** 시연 후 / 정식 운영 진입 시 — **평가 루브릭 전면 개편(rubric overhaul)과 동시기**(운영 단계 묶음 작업).

**배경:** 기능 단위로 점진 개발하며 화면 간 layout·동선·디자인 토큰이 누적 분기됨. 점진 수정(thrash)보다 운영 진입 시 일괄 표준화가 적절.
**해야 할 일:**
- **학습 시작 위치 일관성** — 모바일(상단 mobile-top)/데스크톱(하단) 분기 정리(현 `단계19.13·19.14` 우회 흡수). research↔정식 학생 흐름 간 위치 통일. (D-015 의 배너 앵커 dual-instance 우회는 D-016 배너 제거로 해소됨 — 더 이상 흡수 대상 아님.)
- **페이지 layout 통일** — 헤더·카드·섹션 패턴을 흐름 무관하게 표준화.
- **디자인 토큰·컴포넌트 표준화** — 토큰/공용 컴포넌트 정비, **Day 0 leftover** 일부 흡수.
**관련:** D-014(배너 wire-in 시 드러난 흐름별 위치 분기) · BL-#8 · BL-#10.

### BL-#10 — 1.6 배너 재도입/재설계 검토 (PMS 개편 시)
**상태(enum):** `pending`
**의존성:** BL-#9(PMS 인터페이스 개편)와 함께 검토.
**시점:** 시연 후 / 정식 운영 진입 시 (BL-#9 동시기)

**배경:** D-016 에서 1.6 배너(progress·vocab·model_answer)를 잉여로 판단해 제거하고 3 기능을 각 맥락에 분산(학습시작 카드·통계 카드·학습 페이지 인-라인). 단 `DashboardBanner`·`banner-labels.ts`(7언어 라벨·디스미스·병기)·단위테스트는 **보존** — 향후 통합 알림/온보딩 UX가 필요해질 때 재활용 가능.
**해야 할 일:** PMS 개편 시 (a) 배너를 재도입할지(통합 알림 센터 등) 또는 (b) 완전 제거할지 결정. 재도입 시 BL-#8(흐름 비종속 일반화) 적용. 미재도입 확정 시 컴포넌트·라벨·테스트 삭제.

---

## 의존성 그래프

```
Task 1.2 (마이그레이션 적용)
  └─ #18 (파일럿 계정 마이그레이션, D-005) ──→ 신규 기능 파일럿 노출

#13 옵션 A (D-003, 출력 계약·보정 노출 완료)
  ├─ #15 (topic_adherence LLM 판정 실측) ──→ 필요 시 partial 정의 보강
  │     └─ #15 후속 (LLM 회귀 실측 실행, harness 완료)
  └─ #16 (보정 안내 UI wording) ←── 시연 피드백

prompt v3 lock-in (D-001)
  ├─ task 1.4 후속 (자유대화 사후 태깅, D-004) ←── 동적 콘텐츠 태깅 모델 설계
  └─ prompt v4 (per-term CEFR) ←── 1.3 일괄 적용 + 품질 보고

M3-a (ko/en/vi fixture)
  ├─ ar fixture (즉시 가능)
  └─ th/ms/km fixture ←── helperLang 폴백 정책 결정

M5 (free-conv e2e, 채팅 진입까지)
  └─ M5 후속 (풀스코어 e2e) ←── 오디오 픽스처 + 헤드리스 마이크 주입
        (현재 tests/unit/free-conversation-score.test.ts 가 #13 ≤50 가드)
```
