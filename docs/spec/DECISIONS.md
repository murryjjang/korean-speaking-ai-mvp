# Decisions — KDLI Korean MVP

> **목적**: 결정의 휘발·재결정 방지. "왜 이렇게 결정했지?"를 다시 따지지 않도록, 확정/잠정 결정을 append-only로 기록한다.
> 위치: `docs/spec/DECISIONS.md`
> 작성일: 2026-05-21
> 형식: 번호(D-NNN)·일자·상태(확정 lock-in / 잠정)·결정·근거·영향/적용·관련.

규칙:
- **append-only**. 기존 항목은 삭제·재번호 하지 않는다. 번복은 새 항목(D-NNN)으로 추가하고 이전 항목 상태를 `철회`로 갱신한다.
- **상태**: `확정(lock-in)` = 코드·스키마·테스트의 권위 기준으로 굳음 / `잠정` = 실측·시연 피드백 후 조정 가능.
- BACKLOG 항목(#N)·파일 경로를 "관련"에 명시해 추적 가능하게 한다.

---

## D-001 — prompt v3 lock-in (콘텐츠 태깅 출력 계약)

- **일자**: 2026-05-20
- **상태**: 확정 (lock-in)
- **결정**: 콘텐츠 태깅 LLM(prompt v3)의 출력은 다음 **7필드**로 고정한다.
  1. `topic_tags` — `text[]`
  2. `cefr_level` — 6값 enum `{A1, A2, B1, B2, C1, C2}`
  3. `register` — 5값 enum `{casual-banmal, polite-spoken, formal-spoken, formal-written, instructional}`
  4. `register_consistency` — `{consistent, mixed}`
  5. `learning_objective` — 한 문장, 능력표현 `-(으)ㄹ 수 있다` 종결. 정규식 `[가-힣] 수 있다\.?$` (보완 ↓)
  6. `vocabulary` — 3카테고리 `{basic, core, challenging}`
  7. `pronunciation_focus` — 각 항목 `term(rule)` 형식 (정규식 `^.+\(.+\)$`)
  - 반말 콘텐츠(`register=casual-banmal`)는 **표준 반말 경고 문구**를 일관되게 부착한다.
- **근거**: `content_tags` 스키마의 check 제약과 **1:1** 매핑. 이 7필드·enum·정규식이 곧 검수 자동화(M4)의 정량 검증 권위 기준이 된다. 출력 계약을 코드(검증기)·스키마·테스트가 동일하게 참조 → drift 방지(설계 원칙 4).
- **영향/적용**:
  - `supabase/migrations/20260520_sprint1_new_tables.sql` — `content_tags`(register/cefr_level/register_consistency check), `vocabulary_terms`, `content_vocabulary`(category), `pronunciation_focus`.
  - 검수 자동화 정량 규칙(M4 A단계): 7필드 존재 · register 5값 · cefr 6값 · `learning_objective` 정규식 · `pronunciation_focus` 정규식 · 반말 경고 일관성.
  - 회귀 테스트(M3-b) `tests/llm-regression/prompt-v3-content-tagging.test.ts`.
- **보완 (2026-05-21, 1.3 dry-run에서 drift 발견·정정)**:
  - **증상**: rule 4 정규식을 `할 수 있다\.?$`로 문자 그대로 구현 → 하다 동사만 통과. "읽을 수 있다"·"들을 수 있다" 등 고유어 동사 능력표현이 **false FAIL**(1.3 dry-run 12건 중 2건).
  - **원인**: spec 약식 표기 `~할 수 있다`의 실제 의도는 한국어 능력표현 일반형 `-(으)ㄹ 수 있다`. 코드가 약식 표기를 협소하게 받음 = drift.
  - **정정**: `LEARNING_OBJECTIVE_RE = /[가-힣] 수 있다\.?$/` (능력표현 일반화). prompt v3 문구·M3-b fixture(고유어 동사 활용형)·단위테스트 동반 갱신.
  - **재발 방지**: 약식 표기 spec은 반드시 코드/테스트에 **명시적 패턴 + 경계 케이스(하다 외 동사)**를 동반한다. M3-b "능력표현 일반형 회귀 가드"가 미래 prompt/정규식 변경 시 자동 차단.
- **보완 2 (2026-05-21, 1.3 dry-run 재실행에서 두 번째 drift 발견·정정)**:
  - **증상**: `pronunciation_focus`가 dry-run 12건 **전부 빈 배열**. 특히 낭독(qt-reading)은 발음이 핵심인데도 비어 작성자(gpt-4o-mini)가 "없으면 빈 배열" 문구로 회피.
  - **원인**: "빈 배열 허용" 문구가 **유형 무관**으로 적용 = 유형별 차등 의도가 spec 본문에 없던 drift(rule 4와 동일 패턴).
  - **정정**: ① prompt v3 본문에 유형별 지침 명시(qt-reading ⇒ pronunciation_focus ≥1 필수, 그 외 유형은 빈 배열 허용). ② **정량 rule 8(`reading_pron`)** 추가 — `type_id='qt-reading'` ∧ 빈 배열 ⇒ FAIL(결정론적, peer review 비결정성 보완). 발음 규칙 어휘에 유음화 포함.
  - **재발 방지**: **유형별 차등 spec은 prompt v3 본문에 유형 분기로 명시**하고 정량 규칙으로 가드한다. M3-b "낭독 fixture pronunciation_focus ≥1" 가드.
- **관련**: AUTOMATION_DESIGN.md M3-b·M4 · `content_tags` 스키마 · BACKLOG "task 1.4 후속 자유대화 사후 태깅" · `src/lib/tagging/schema.ts`(LEARNING_OBJECTIVE_RE · PRONUNCIATION_REQUIRED_TYPES) · rule 8 `reading_pron`.

---

## D-002 — Sprint 1 신규 스키마 DB 매핑 4결정

- **일자**: 2026-05-20
- **상태**: 확정 (lock-in)
- **결정**:
  1. **user 매핑** — `user_id` FK는 `auth.users(id)` (인증 앱 모델). "ALTER users"가 가리키는 실제 작업은 `public.user_profiles`에 컬럼 ALTER.
  2. **content 매핑** — `content_id` FK는 `public.questions(id)` [text PK]. "ALTER contents"가 가리키는 실제 작업은 `questions`에 `is_tagged`(boolean default false) · `last_tagged_at`(timestamptz) 추가.
  3. **pause_count(#5)** — `speaking_submissions` 테이블에 적재.
  4. **RLS** — 표준 `auth.uid()` 모델(`to authenticated`). 본인 데이터 + group instructor/admin + 전역 teacher/admin. `group_members` 자기참조로 인한 RLS 무한 재귀를 피하기 위해 **SECURITY DEFINER 헬퍼 4종**으로 권한 판정을 분리: `public.kdli_is_staff()` · `public.kdli_leads_user(target uuid)` · `public.kdli_in_group(g uuid)` · `public.kdli_group_admin(g uuid)`.
- **근거**: 마이그레이션 헤더(`20260520_sprint1_new_tables.sql` lines 1-24)에 사용자 확정으로 명시. 낭독(qt-reading)·발표/자료설명(qt-material-desc)·듣고답하기·대화미션이 모두 `questions` 행(text PK)이라 content FK 대상. 자기참조 정책이 헬퍼 없이는 무한 재귀를 일으킴.
- **영향/적용**:
  - `supabase/migrations/20260520_sprint1_new_tables.sql` — 신규 10 테이블, `user_profiles`/`questions` ALTER, RLS 정책, 헬퍼 4종(lines 219-250).
  - `supabase/migrations/20260521_sprint1_new_tables_rollback.sql` — 페어 롤백.
  - `scripts/verify-migration.ts` / `scripts/verify-migration.sql` — 헬퍼·FK·RLS 점검.
- **관련**: 마이그레이션 헤더 · BACKLOG #18(파일럿 계정 분리) · D-005.

---

## D-003 — #13 자유대화 주제이탈 점수 반영 (옵션 A, 3 세부)

- **일자**: 2026-05-20
- **상태**: 확정 (lock-in)
- **결정**: 자유대화에서 주제 이탈 시 표현 quality뿐 아니라 **종합 점수**에도 반영한다(옵션 A). 3 세부:
  1. **3단계 신호** — summary LLM이 `topic_adherence`를 `on / partial / off` 중 하나로 출력.
  2. **멀티플라이어** — `on=1.0` · `partial=0.75` · `off=0.5` 를 종합 점수에 곱한다.
  3. **DB 저장** — summary LLM 출력(`topic_adherence` 포함)을 DB에 저장.
- **근거**: 기존엔 표현 quality만 평가 → 주제와 무관한 발화가 점수에 반영되지 않는 사각지대. 멀티플라이어 방식이 기존 점수 파이프라인에 최소 침습으로 끼어듦.
- **영향/적용**:
  - `tests/unit/free-conversation-score.test.ts` — 점수 헬퍼 결정론적 가드(#13 `≤50` 보증, D-006 참조).
  - `e2e/scenarios/free-conversation-offtopic.spec.ts` — 라이브 e2e(M5).
  - 종합 점수 카드에 `주제 반영 보정 ×0.5 (발음 평균 N)` 노출.
- **관련**: BACKLOG #13 · #15(LLM 판정 실측) · #16(보정 안내 UI wording) · D-006(d).

---

## D-004 — 자유대화 태깅 제외

- **일자**: 2026-05-20
- **상태**: 확정 (lock-in)
- **결정**: 자유대화는 콘텐츠 태깅(`content_tags` 등) 대상에서 **제외**한다.
- **근거**: 자유대화 = persona(코드 상수) + 자유 입력 topic 구조라 **고정 content 행이 없다**. `content_tags` 등 태깅 테이블은 `questions(id)`에 FK로 연결되므로 FK 대상이 될 수 없음(사용자 확인 완료, 의도된 제외). 사후 태깅은 동적 콘텐츠 식별자 처리가 필요해 별도 설계로 분리.
- **영향/적용**:
  - `supabase/migrations/20260520_sprint1_new_tables.sql` 헤더 주석(자유대화 태깅 대상 아님).
  - 사후 태깅 모델(통합 content 테이블 / personas·scenarios 태깅 / research_sessions 단위 라벨링)은 BACKLOG로 이관.
- **관련**: BACKLOG "task 1.4 후속 — 자유대화 사후 태깅" · D-001.

---

## D-005 — 파일럿 #18 분리 (계정 마이그레이션 별건)

- **일자**: 2026-05-20
- **상태**: 확정 (lock-in)
- **결정**: 파일럿 참여자(P060–P066)의 `auth.users` 계정 생성·연결은 Sprint 1 신규 스키마와 **별건**으로 분리한다. 신규 스키마는 forward-looking 상태로 둔다.
- **근거**: P060–P066은 `research_participants` 테이블 기반이며 `auth.users` 계정이 없음. 신규 스키마는 전부 `auth.users(id)` 기반 RLS(`auth.uid()`)로 설계(D-002)되어, 계정 마이그레이션 전까지는 파일럿에 신규 기능을 노출할 수 없다. 스키마 적용과 계정 적재의 결합도를 낮춰 각각 독립 진행.
- **영향/적용**:
  - 별도 마이그레이션 + seed 스크립트로 분리 작성(미착수).
  - `research_participants` ↔ `auth.users`/`students` 매핑 정책, 로그인 경로 정합성(`/research/login` 코드 기반 vs `/login` 이메일 기반) 결정 필요.
- **관련**: BACKLOG #18 · D-002.

---

## D-006 — 야간 1 결정/정정 4건

- **일자**: 2026-05-21
- **상태**: 확정 (lock-in)
- **결정**:
  - **(a) clip.exe 인코딩 우회** — Windows clip.exe 한글 인코딩 깨짐을 우회하기 위해 파일 생성은 **VS Code**(직접 편집)를 사용한다.
  - **(b) FK expected 12 → 11 자체 정정** — verify의 FK 기대치를 12에서 **11**로 자체 정정. 근거는 grep 자체검증(실제 마이그레이션 내 FK 카운트).
  - **(c) supabase-js `head:true` 가짜 PASS 사각지대 수정** — `head:true`가 없는 테이블에 204+null을 반환해 가짜 PASS가 나는 사각지대를 발견. **non-head GET** `.select().limit(1)` 로 수정.
  - **(d) #13 ≤50 보증을 위한 score 헬퍼 추출** — #13 "주제 이탈 → 점수 ≤50" 수치를 결정론적으로 가드하기 위해 score 계산 헬퍼를 `tests/unit/free-conversation-score.test.ts`로 추출.
- **근거**: 야간 1 실작업 중 발견·정정. (b)·(c)는 자동 검증 자체의 false positive/negative를 잡은 것으로 설계 원칙 1·6에 해당. (d)는 헤드리스 마이크 한계로 e2e가 점수까지 못 가는 것을 단위 테스트로 보강.
- **영향/적용**:
  - `scripts/verify-migration.ts` / `scripts/verify-migration.sql` — FK expected 11, non-head GET.
  - `tests/unit/free-conversation-score.test.ts` — #13 결정론적 가드(+6).
  - 정책 24 · 인덱스 19 카운트 기준 확정.
- **관련**: AUTOMATION_DESIGN.md "진행 상황 — 야간 1" · D-003 · BACKLOG "M5 후속".

---

## D-007 — 야간 2 결정 (M3-b·M4·M6 셋업)

- **일자**: 2026-05-21
- **상태**: 잠정 (야간 2 진입 시점 확정, 실측·셋업 후 일부 조정 가능)
- **결정**:
  - **(a) prompt v3 정식 모듈화** — prompt v3를 정식 모듈로 두고, **M3-b 회귀 테스트**(`prompt-v3-content-tagging.test.ts`)를 동행 작성한다.
  - **(b) M4 peer review 모델 조합** — 검수자 `gpt-4o` ↔ 작성자 `gpt-4o-mini` 교차 검증. 기존 openai SDK + 동일 `OPENAI_API_KEY` 재사용, **신규 의존성 0**. 검수 모델 env는 **`PEER_REVIEW_MODEL`(기본 `gpt-4o`)** — 향후 모델 변경은 `.env`만 수정(코드는 `OPENAI_PEER_REVIEW_MODEL` 별칭도 허용).
  - **(c) M4 검증 정책** — 정량 검증 **100% strict** / 통과 **샘플링 5%** 검토 / 한국어 NER은 **LLM-based**.
  - **(d) M6 모니터링** — 알림 채널 **이메일** / **UptimeRobot + 노트북 cron** 백업 / **named tunnel** 도입은 **야간 2-3 사이**.
  - **(e) 1.3b 적용 순서** — 1.3b는 **dry-run 기본**, 실 INSERT는 **Task 1.2 적용 후**.
- **근거**: AUTOMATION_DESIGN.md "결정 사항 종합" 표의 권장 default를 그대로 채택. (b)는 동일 모델 자기검증의 false negative를 피하기 위한 cross-check(설계 원칙 3)이며 의존성 비용 0이라 채택. (e)는 신규 스키마 미적용 상태에서 실 INSERT 시 FK 오류를 피하기 위함.
- **영향/적용**:
  - `src/lib/prompts/content-tagging.ts` · `src/lib/tagging/{schema,validate-tagging}.ts` · `tests/llm-regression/prompt-v3-content-tagging.test.ts` · `scripts/validate-tagging.ts`(M4).
  - `scripts/monitor.sh` · `scripts/get-current-tunnel-url.sh` · `docs/ops/MONITORING.md` · UptimeRobot · 노트북 cron(M6).
  - 1.3b batch runner — dry-run → Task 1.2 적용 후 실 INSERT.
- **관련**: AUTOMATION_DESIGN.md M3-b·M4·M6 · D-001 · D-002.

---

## D-008 — 야간 2 실측 발견 (Task 1.2 라이브 적용 · 태깅 풀 규모)

- **일자**: 2026-05-21
- **상태**: 확정 (실측 사실 기록)
- **결정/사실**:
  - **(1) Task 1.2 마이그레이션이 라이브 Supabase에 이미 적용됨** — `questions.is_tagged` 컬럼·`content_tags` 테이블 존재(1.3a `inspect-content-pool.ts` 실측). AUTOMATION_DESIGN 상 pending이었으나 정정 → **1.3 실 INSERT unblocked**.
  - **(2) 태깅 풀 = active·미태깅 questions 12건 전체** — `content_tags` FK는 `questions(id)` 일반이라 특정 type 한정 아님. 대화미션은 `qt-dialogue-mission`으로 questions 안에 존재(별도 `mission_scenarios` 1행과 무관).
- **근거**: `scripts/inspect-content-pool.ts` 라이브 read-only 실측 (footprint 0).
- **영향/적용**: 야간 3 1.3b 실 INSERT(`BATCH_DRY=0`) 진입 조건 충족. AUTOMATION_DESIGN 야간1 "Task 1.2 적용" [x] 정정. 단 **파일럿 #18(P060–P066 auth.users 계정)은 별개로 여전히 미적용**(D-005) — 콘텐츠 태깅 데이터의 research-login 사용자 노출 여부는 앱 read 경로에 의존.
- **관련**: AUTOMATION_DESIGN.md · `scripts/inspect-content-pool.ts` · BACKLOG #18(D-005).

---

## D-009 — prompt v3 미세조정 (작성자 결정성 + 정확성 가이드, 야간 3-C)

- **일자**: 2026-05-21
- **상태**: 확정 (lock-in)
- **결정**:
  - **(a) 작성자 temperature 0.2 → 0.0** — 재실행 변동 제거(결정성). gpt-4o-mini 유지(비용·속도 동일).
  - **(b) learning_objective 정확성** — 콘텐츠 핵심 행동·맥락 구체화, "의사소통할 수 있다" 류 막연 표현 금지. **낭독(qt-reading)은 글 주제가 아니라 "정확한 발음·억양으로 소리 내어 읽는 능력"을 기술**.
  - **(c) topic_tags 정확성** — 본문(title·prompt)에 등장하는 핵심 주제어만, 본문 전체 대표, 추측·일반화 금지.
- **근거**: 1.3 실 INSERT 후 잔여 4건(낭독 3 + 발표 1) per-item FAIL 원인 분석 — 낭독 목표가 글 주제로 오설정(advanced-q1-reading "의사소통할 수 있다"), topic_tags가 본문 일부/엉뚱(beginner-q1-reading 학교·수업 vs 병원). prompt 차원 정정으로 자동 통과 유도(3-A CLI 경로 구현보다 저비용).
- **영향/적용**: `src/lib/prompts/content-tagging.ts`(가이드) · `scripts/tag-content-batch.ts`(temp 0) · M3-b fixture(잔여 4건 정정 의도 + 프롬프트 계약 가드).
- **관련**: D-001(prompt v3) · D-007 · AUTOMATION_DESIGN 야간3-C · BACKLOG 야간3-C.

---

## D-010 — 낭독 learning_objective = 하이브리드 (콘텐츠 + 읽기 능력) + peer 정합

- **일자**: 2026-05-21
- **상태**: 확정 (lock-in) — D-009(b)의 "낭독=읽기 능력" 부분을 supersede.
- **배경**: D-009(b)(낭독 목표=읽기 능력)가 검수자(gpt-4o) rubric("콘텐츠 반영")과 **충돌**해 1.3 잔여 3건 FAIL. 또 낭독 가이드가 발표(qt-material-desc)에 **과적용**돼 회귀(advanced-q2: "그래프를 소리 내어 읽을 수 있다").
- **결정** (rubric 정책):
  - **(a) 낭독(qt-reading)** learning_objective = **하이브리드**: 콘텐츠 주제 + "정확한 발음으로 …소리 내어 읽을 수 있다" 결합. 콘텐츠만/읽기만 단독 금지. (예: "병원·약국 안내문을 정확한 발음으로 소리 내어 읽을 수 있다")
  - **(b) 발표·자료설명(qt-material-desc)** = 콘텐츠 + 설명·발표 능력. 낭독 가이드(읽기·연음) 과적용 금지.
  - **(c) 그 외 유형** = 콘텐츠 중심 과제 행위.
  - **(d) peer rubric를 유형별로 정렬** — 작성자 prompt와 검수자 기준이 같은 유형별 정상형을 공유(설계 원칙 4). 작성자↔검수자 충돌 종식.
- **근거**: 작성자·검수자가 같은 기준을 공유해야 통과 가능. thrash 임계 — 1회 변경으로 종식 못 하면 3-A(편집 경로)로 전환(추가 튜닝 금지).
- **영향/적용**: `src/lib/prompts/content-tagging.ts`(유형별 목표 가이드) · `src/lib/tagging/validate-tagging.ts`(PEER_REVIEW_RULES rule 4 유형별) · `scripts/tag-content-batch.ts`(peer 컨텍스트에 type·prompt) · M3-b fixture(하이브리드 예시).
- **관련**: D-009(supersede 낭독 목표 부분) · D-001 · BACKLOG 야간3.

---

## D-011 — 작성자 모델 격상 (잔여 per-item 해소, 야간 3 한정)

- **일자**: 2026-05-21
- **상태**: 확정 (야간 3 한정 — 야간 4-7 본작업은 gpt-4o-mini 복귀, cost-aware)
- **결정**: `CONTENT_TAGGING_AUTHOR_MODEL=gpt-4o`로 잔여 per-item 품질 한계를 해소. **기본값은 gpt-4o-mini 유지**(env 미설정 시).
- **결과**: 잔여 2건 중 **1건(beginner-q1-reading 장르 오인) gpt-4o가 해소 → 11/12**. `advanced-q1-reading`은 gpt-4o 작성자+검수자조차 정확한 목표 framing 불일치(밀도 높은 추상 C1 메타텍스트) → **3-A(사람 편집) 영역**으로 확정.
- **근거**: 비용 5~10배지만 12~100건 풀에선 무시 가능. 1000건+ 시 재평가(BL-#3).
- **주의**: gpt-4o 작성자 시 검수자(PEER_REVIEW_MODEL)도 gpt-4o → D-007의 cross-vendor cross-check가 약화됨(동일 모델 자기검수). 야간 3 한정으로만 수용.
- **영향/적용**: `scripts/tag-content-batch.ts`(`CONTENT_TAGGING_AUTHOR_MODEL` env, 기본 mini).
- **관련**: D-007(다른 모델 cross-check) · D-010 · BL-#3.

---

## D-012 — Task 1.4 자동 단어장(SRS) 설계 결정

- **일자**: 2026-05-21
- **상태**: 확정 (구현은 야간 4)
- **결정**:
  - **(a) 자동 등록**: 콘텐츠 학습 통과 트리거 → 해당 `content_vocabulary`의 **core·challenging** 어휘 자동 등록(basic 제외). idempotent(`vocab_cards` unique user_id,term_id).
  - **(b) 퀴즈 답변**: **주관식 recall + 자가채점**(quality 0-5, Anki식) — SM-2와 직결.
  - **(c) 의미·예문(gloss)**: 신규 캐시 테이블 **`vocabulary_glosses`**(term_id·lang·gloss·example_ko·example_translated·generated_at), **unique(term_id, lang)**, 다국어(en/vi/ar/ko/th/ms/km). **M3-c** LLM 생성, **첫 노출 시 미캐시 lang on-demand 생성**, 작성자 모델 기본 mini(격상은 BACKLOG).
  - **(d) 일일 임계**: **20** (`next_review_at <= now()` 추출, limit). env 또는 `user_profiles` 컬럼으로 사용자별 조정(default 20).
  - **TTS**: 1.4에서 `/api/tts` 재사용(1.5 모범답안과 공유 인프라).
- **근거**: 우리가 적재한 `content_vocabulary`(57건) 활용(자동 등록); SM-2 표준은 자가채점 recall과 정합; gloss 캐시로 퀴즈 지연·비용↓. 자유대화 어휘 추출(옵션3)·객관식 답변은 BACKLOG(BL-#4·옵션).
- **영향/적용(예정 야간4)**: `src/lib/srs/{sm2,enroll}.ts` · `src/lib/prompts/vocabulary-gloss.ts`(M3-c) · `app/student/vocab/` · `app/api/vocab/*` · 신규 마이그레이션 `vocabulary_glosses`(+rollback 페어, M1 원칙) · e2e 2건(`vocabulary-card-create`·`vocabulary-quiz-flow`).
- **전제**: `vocab_cards.user_id → auth.users` → 파일럿(P060–P066) 노출은 #18 선행(D-005).
- **관련**: 마이그레이션 `vocab_cards` · D-011 · BACKLOG 야간4.

---

## D-013 — Task 1.5·1.6·1.7 설계 결정 (야간 4 풀가동)

- **일자**: 2026-05-21
- **상태**: 확정 (1.5·1.6·1.7-questions 구현 완료)
- **결정**:
  - **1.5 모범답안**: 답안 = 콘텐츠 CEFR(목표) + 한 단계 위(도전) 2개 · 작성자 기본 mini · TTS `/api/tts` 재사용(미저장, 라이브 합성) · side-by-side UI · on-demand 생성 캐시(`model_answers`).
  - **1.6 UX 배너**: 3종(진도·새단어·모범답안) × 7언어 · today-tasks 상단 · 일자별 디스미스. 기본 문안 작성(본인 wording 검토 대상).
  - **1.7 콘텐츠 admin**: (a) 권한 = 기존 `user_profiles.role='admin'` + `requireRole`(신규 인프라 0) (b) UI = **MVP CRUD** — 이번 round는 **questions** 전체 CRUD(목록·생성·수정·비활성) (c) 태깅 = **수동 버튼 trigger**(`/api/admin/tag`, 1.3 비결정성·검토 필요 경험 반영). mission_scenarios/question_sets 전체 CRUD·풀스택(검색/필터/일괄)은 BACKLOG(BL-#6·#7).
- **근거**: 기존 인프라(role 게이팅·/api/tts·content_vocabulary·tag 파이프라인) 최대 재사용, 비용·범위 압축. 수동 태깅은 자동 INSERT의 오태깅 위험 회피.
- **영향/적용**: `src/lib/prompts/{model-answer,...}` · `src/lib/model-answers/levels.ts` · `src/lib/i18n/banner-labels.ts` · `src/lib/tagging/persist.ts`(batch와 공유 추출) · `app/api/{model-answer,admin/content,admin/tag}` · `app/student/{model-answer,dashboard-banner}` · `app/admin/content/*`.
- **관련**: D-011(작성자 모델) · D-012(SRS) · BL-#6·#7.

---

## D-014 — 1.6 배너 research 흐름 wire-in (야간 5 진단·수정) + today-tasks 흐름 범위 명시

- **일자**: 2026-05-22
- **상태**: 확정 (구현 완료 — 배포·모바일 sanity는 본인 트리거)
- **배경(진단)**: 라이브(P062, 모바일) 1.6 배너 미노출. 원인 = 배너가 정식 학생 대시보드(`/student`)에만 wire-in 됐고, research 참여자가 보는 `/research/student/progress`에는 미배치. D-013이 "today-tasks 상단"으로만 기술(정식 학생 흐름 가정)한 데서 기인. 디스미스·데이터·role 조건 문제 아님(원인 A 확정).
- **결정**:
  - **(a) wire-in (A안)**: `DashboardBanner`를 `/research/student/progress` 헤더 아래·학습 시작 카드 위(모바일/데스크톱 공통)에 배치. PDF 대상(`research-progress-pdf-target`) **밖** → 내보내기에서 제외.
  - **(b) props**: `lang=participant.motherTongue`(7언어, 미지원 시 ko 폴백 — `resolveBannerLang`). `vocabDueCount=0` → research엔 SRS 미적용이라 vocab 배너 자동 숨김(progress·model_answer 2종). `hrefs={ progress:null(현재 페이지라 클릭 비활성), model_answer:'/student/speaking'(말하기 진입) }`.
  - **(c) 컴포넌트 변경(소, 옵션 A)**: `buildBannerItems`·`resolveBannerLang`·`DEFAULT_BANNER_HREFS`·`BannerItem`을 `src/lib/i18n/banner-labels.ts`로 추출(node 단위테스트 가능)하고 `DashboardBanner`에 `hrefs?` prop 추가. `/student` 호출부는 기본값 유지로 **무변경**. 흐름별 wrapper(옵션 B)는 변경 범위가 커 보류 → BL-#8.
  - **(d) today-tasks 흐름 범위**: `app/student/today-tasks.tsx`는 정식 학생 흐름 전용. research 흐름은 `/research/student/progress` **단일 페이지**가 진척+학습 시작(모바일 상단 4-card nav)을 통합 — 별도 today/today-tasks 페이지 없음(설계대로). 혼동 방지 위해 명시.
- **검증**: vitest 1317 통과(배너 6→12) · lint 0 error · build green · e2e research-login(deploy gate)·auth-routes(116건, `/student` 렌더 포함) green · 로컬 SMOKE `/student` 배너 렌더 확인(testid·라벨·vocab 자동 숨김). **`/research/student/progress` 인증 렌더는 실 참여자 세션 필요 → 라이브 모바일 sanity로 위임**(로컬 read는 공유 DB 정책상 보류).
- **관련**: D-013(1.6 원설계) · BL-#8(배너 흐름 비종속 일반화 B안).

---

## D-015 — 1.6 배너 UX 보정 (ko+모국어 병기 + 앵커 스크롤, 야간 5)

- **일자**: 2026-05-22
- **상태**: 확정 (구현 완료 — 배포·모바일 sanity는 본인 트리거)
- **배경**: D-014 wire-in 후 라이브 UX 2건. (1) 진척 페이지 다른 요소(종합 점수·평가 누적)는 본문 ko + mother_tongue 병기인데 **배너만 모국어 단독** → 시각 불일치. (2) "오늘의 학습" 클릭 비활성(D-014)은 의도였으나 UX 어색.
- **결정**:
  - **(a) 병기**: 배너도 본문 ko 고정 + mother_tongue 보조 병기(진척 페이지 `<Localized>` 와 동일 톤 — `text-xs text-text-muted opacity-80 leading-snug`, `block mt-0.5`, ar은 `dir=rtl`+`unicodeBidi:isolate`). `bl===ko` 면 보조 미노출 → 정식 학생 흐름 `/student`(lang 기본 ko) **무변경**. 별도 prop 없이 "항상 병기 + ko dedup" 채택(변경 범위 작은 쪽).
  - **(b) 표시언어 추론 정렬**: `resolveBannerLang` 이 `inferDisplayLanguageFromMotherTongue` 사용 → 자연어 모국어("Vietnamese"·"베트남어"·"العربية")도 진척 페이지와 동일 추론. 기존 2글자 코드 정확매칭만 했어서 자연어 mother_tongue 이면 ko 로 오폴백되던 잠재 불일치 해소.
  - **(c) 앵커 스크롤**: progress 배너 progress href `null → '#start-learning'`. `DashboardBanner` 는 `#`-href 를 같은 페이지 부드러운 스크롤로 처리(`scrollIntoView({behavior:'smooth'})`). 학습 시작 영역은 모바일/데스크톱 **두 인스턴스**(단계19.13·19.14)라 unique-`id` 불가 → `data-scroll-target="start-learning"` 을 두 인스턴스에 부여하고 **화면에 보이는(offsetParent≠null) 인스턴스로 스크롤**. model_answer(`/student/speaking`)·일자별 디스미스는 변화 없음.
- **검증**: vitest 1319 통과(배너 12→14) · lint 0 error · build green · live e2e(research-login) green · 로컬 `/student` ko 경로 회귀 없음(병기 미노출 확인). **병기·앵커 실동작은 비-ko 참여자 인증 렌더 필요 → 라이브 모바일 sanity로 위임**(로컬 read 공유 DB 정책상 보류, D-014와 동일).
- **관련**: D-014(wire-in) · BL-#8(배너 일반화) · BL-#9(모바일/데스크톱 학습시작 위치 일관성 — 앵커 dual-instance 우회 흡수 대상).

---

## D-016 — 1.6 배너 전면 재설계 = 제거 (기능 분산, 야간 5)

- **일자**: 2026-05-22
- **상태**: 확정 (구현 완료 — 배포·모바일 sanity는 본인 트리거)
- **배경**: D-014·D-015 로 배너를 wire-in·보정했으나, 디자인 검토 결과 배너 3종이 모두 **잉여**로 판단. (1) progress = 학습 시작 카드와 중복 (2) model_answer = 학습 페이지 인-라인이 자연스러움 (3) vocab = 메뉴에 단어장 존재 + 동적 알림은 통계 영역이 적합.
- **결정**: 배너를 어느 화면에서도 노출하지 않고, 3 기능을 각 맥락에 분산.
  - **(a) /student·/research/student/progress 에서 `DashboardBanner` 제거.** research 의 D-015 앵커 타깃(`data-scroll-target`)도 함께 정리(배너가 유일 사용처였음).
  - **(b) 모범답안 인-라인**: speaking **결과 페이지** 하단 액션에 "모범답안 보기"(→`/student/model-answer/[questionId]`). 답변 후 '내 답변과 비교'가 자연스러운 위치. 모범답안은 `questions` 기반이라 speaking 흐름에만 존재 → reading·발표·미션 제외. 결과 페이지에서도 **낭독(q1)·대화미션(q4)** 은 모범답안 개념이 맞지 않아 버튼 비노출(q2·q3·일반 말하기만).
  - **(c) vocab 통계 통합**: `/student` 통계(StatCard) 영역에 "오늘 복습 N개" 카드(→`/student/vocab`). `vocabDueCount>0` 시에만 노출(0/미적용 비표시). 중복이던 `TodayTasks` vocab 줄은 제거. research 흐름은 SRS 미적용이라 미표시(조건부, 자동).
  - **(d) 컴포넌트 보존**: `DashboardBanner`·`banner-labels.ts`·단위테스트는 유지(미사용). → BL-#10(배너 재도입/재설계, PMS 개편 BL-#9와 함께).
- **검증**: vitest 1319(불변, 배너 lib 테스트 유지) · lint 0 err · build green · live e2e(research-login)·auth-routes(/student·speaking 렌더) green · 로컬 `/student` 배너 제거 확인(testid 0, TodayTasks·통계 유지). vocab 카드·모범답안 버튼 실동작은 로그인 SRS 사용자/제출 기록 필요 → 라이브 sanity로 위임.
- **관련**: D-014·D-015(supersede — 배너 wire-in·보정 무효화) · BL-#10(배너 보존) · BL-#9(PMS 개편).

---

## 변경 이력

- 2026-05-21: 초안 작성 + 백필 D-001~D-007 (야간 2, M7 결정·백로그 추적). prompt v3 lock-in · DB 매핑 4결정 · #13 옵션 A · 자유대화 태깅 제외 · 파일럿 #18 분리 · 야간 1 결정/정정 4건 · 야간 2 결정.
- 2026-05-21: D-008 추가 (야간 2 1.3a 실측 — Task 1.2 라이브 적용 확인·태깅 풀 12건).
- 2026-05-21: D-001 보완 (1.3 dry-run drift 발견 — learning_objective 정규식을 능력표현 일반형 `[가-힣] 수 있다`로 정정 + 재발 방지 메모).
- 2026-05-21: D-001 보완 2 (1.3 dry-run 재실행 drift — 낭독 pronunciation_focus 필수: prompt v3 유형별 지침 + 정량 rule 8 `reading_pron`).
- 2026-05-21: D-009 추가 (야간 3-C — 작성자 temp 0.0 + learning_objective/topic_tags 정확성 가이드, 잔여 4건 정정).
- 2026-05-21: D-010 추가 (낭독 목표=하이브리드 + peer rubric 유형별 정렬 — 작성자↔검수자 충돌 종식, D-009b supersede).
- 2026-05-21: D-011 추가 (작성자 gpt-4o 격상 야간3 한정 → 11/12, 잔여 1건 advanced-q1-reading은 3-A).
- 2026-05-21: D-012 추가 (Task 1.4 SRS 설계 — 콘텐츠 통과 등록·recall 자가채점·vocabulary_glosses 다국어 캐시·일일 20·TTS 재사용).
- 2026-05-21: D-013 추가 (야간 4 — 1.5 모범답안·1.6 UX 배너·1.7 콘텐츠 admin(questions CRUD·수동 태깅) 설계).
- 2026-05-22: D-014 추가 (야간 5 — 1.6 배너 라이브 미노출 진단=원인 A → research 흐름 `/research/student/progress` wire-in(A안, hrefs prop) + today-tasks 정식 학생 전용 명시).
- 2026-05-22: D-015 추가 (야간 5 — 1.6 배너 UX 보정: ko+모국어 병기(자연어 모국어 추론 정렬) + "오늘의 학습" 앵커 스크롤(#start-learning, 보이는 인스턴스)).
- 2026-05-22: D-016 추가 (야간 5 — 1.6 배너 전면 재설계=제거. progress/research 배너 제거 + 모범답안 speaking 결과 인-라인 + vocab /student 통계 카드. 컴포넌트는 보존, BL-#10. D-014·D-015 supersede).
