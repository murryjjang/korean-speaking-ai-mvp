# Automation Design — KDLI Korean MVP Sprint 1

> Sprint 1 가속 + 놓침 방지를 위한 자동화 인프라 정밀 설계
> 작성일: 2026-05-21
> 위치: `docs/spec/AUTOMATION_DESIGN.md`
> 상태: 야간 1 진입 전 (결정 default 확정 대기)

---

## 목적

본인(윤경호) active time을 최소화하면서, 시연 일정에 맞춰 Sprint 1을 안전하게 빠르게 1차 마무리.

**3가지 원칙**:
1. 본인 = 결정만, 실행·검증 = 코드
2. 검수는 통과/실패 자동 분류 → 본인은 실패+샘플만 검토
3. 자동화 인프라 먼저 투자 → 그 위에서 본작업

**기대 효과**: Option 3 전체 6-8주 → 4-6주

---

## 설계 원칙 8개 (놓침 방지)

| # | 원칙 | 의도 |
|---|---|---|
| 1 | 모든 수동 행위는 자동 검증으로 보강 | 본인 실수·누락 흡수 |
| 2 | 회귀 자동 감지 (vitest, smoke, e2e) | 변경이 기존 기능 깨면 즉시 알림 |
| 3 | 통과 신뢰 + 실패 우선 검토 + 통과 5% 샘플 | 검수 시간 압축 |
| 4 | 단일 진실 원천 (spec · 테스트 · 코드 일치) | drift 방지 |
| 5 | 다국어 매트릭스 강제 (en/vi/ar/ko/th/ms/km) | 7언어 누락 방지 |
| 6 | 모든 변경에 롤백 페어 | 안 되돌릴 수 있는 변경 금지 |
| 7 | 라이브 모니터링 (URL/인스턴스/서비스) | 본인 모르는 다운 방지 |
| 8 | 결정 추적 (DECISIONS.md) | 휘발·재결정 방지 |

---

## 자동화 인프라 7개 모듈

### M1. 마이그레이션 검증 (Task 1.2 지원)

**목표**: 마이그레이션 적용 후 의도대로 됐는지 자동 점검

**구성** (`scripts/verify-migration.ts`):
- 신규 10 테이블 존재 (information_schema.tables)
- ALTER 3 컬럼 추가 (data_type · default · nullable 일치)
- RLS 활성화 + 정책 존재 (pg_policies, pg_class.relrowsecurity)
- 인덱스 생성 (pg_indexes)
- SECURITY DEFINER 헬퍼 4종 존재 (pg_proc, search_path)
- FK 제약 (information_schema.referential_constraints)
- 결과: pass/fail count + 누락 리스트

**페어 작업**: `supabase/migrations/<date>_sprint1_new_tables_rollback.sql` 동시 작성 (DROP/REVERT)

**결정 사항**:
- 검증 통과 기준 (권장: 100% strict)
- rollback.sql 같은 커밋 vs 별도 (권장: 같은 커밋)

---

### M2. 배포 자동화

**목표**: 노트북 빌드 → 라이브 반영 → 검증을 1줄로

**구성**:
- `scripts/deploy.sh`:
  ```bash
  set -e
  npm run build
  rsync -avz --delete --backup --backup-dir=../.next.bak \
    .next ubuntu@43.200.92.81:~/kdli-mvp/
  ssh ubuntu@43.200.92.81 'sudo systemctl restart kdli-mvp'
  sleep 5
  ./scripts/smoke-test.sh || ./scripts/rollback-deploy.sh
  ```
- `scripts/smoke-test.sh`:
  - 터널 URL `/research/login` 200
  - 정적 자원 `/_next/static/*` 200
  - `/api/healthz` 200 (시각·version·db ping·cloudflared status)
- `app/api/healthz/route.ts` 신규 endpoint
- `scripts/rollback-deploy.sh`: 이전 `.next` 백업 복원

**결정 사항**:
- `/api/healthz` 응답 필드 (권장: 시각 / version / db ping / cloudflared status)
- 자동 롤백 ON/OFF (권장: ON)

---

### M3. LLM 출력 회귀 테스트

**목표**: prompt 변경이 의도와 다른 출력 만들면 즉시 알림

**구성** (`tests/llm-regression/`):

**M3-a. `free-conversation-summary.test.ts` (#15)**:
- on 5건 / partial 5건 (경계 케이스 강조) / off 5건
- **7언어 매트릭스 강제**: 최소 ko/en/vi fixture, 점차 확장 (ar/th/ms/km)
- Assertions: topic_adherence 값 일치, strengths 길이 규칙, next_steps 패턴

**M3-b. `prompt-v3-content-tagging.test.ts` (1.3 사전)**:
- 자유대화 8 / 낭독 6 / 발표 6 (기존 시뮬레이션 매트릭스 재활용)
- 7필드 존재, register 5값 enum, learning_objective 패턴, pronunciation_focus 패턴

**실행 모드**:
- 기본: mock fixture (CI 빠름)
- 야간 1회: 실호출 (`LLM_REGRESSION_REAL=true`)

**결정 사항**:
- 실호출 빈도 (권장: 주 1회 또는 prompt 변경 직후)
- snapshot 자동 갱신 vs 수동 확정 (권장: 수동)

---

### M4. 콘텐츠 검수 자동화 (Task 1.3 핵심)

**목표**: 100-200건 검수를 본인 active 30분 이내로

**4단계 파이프라인** (`scripts/validate-tagging.ts`):

**A. 정량 검증** (각 결과 JSON):
1. 7필드 존재 (스키마)
2. register ∈ {casual-banmal, polite-spoken, formal-spoken, formal-written, instructional}
3. cefr_level ∈ {A1, A2, B1, B2, C1, C2}
4. learning_objective 정규식: `~할 수 있다\.?$`
5. pronunciation_focus 각 entry: `^.+\(.+\)$`
6. vocabulary 고유명사 제외 (NER + 화이트리스트: 서울 · 한국 등)
7. 반말 경고 문구 일치성

**B. LLM peer review**:
- **다른 모델** (예: GPT-4 검수자 ↔ Claude 작성자) — cross-check로 false negative ↓
- spec 6개 규칙 명시적으로 inject
- 응답: `{ pass: bool, warnings: [], failures: [] }`

**C. 자동 분류**:
- pass: A pass + B pass
- warn: A pass + B warn (LLM이 의심)
- fail: A fail OR B fail

**D. 통계 보고서**:
```
Total: 150
Pass: 137 (91%)  → 무작위 5% = 7건 검토
Warn: 8 (5%)     → 전수 검토
Fail: 5 (3%)     → 전수 검토
Review queue: 20건
```

**검토 CLI**: approve/reject/edit 한 건씩, 결과 자동 DB 반영

**결정 사항**:
- 샘플링 비율 (권장: 5%, 사후 조정)
- peer review 모델 (권장: 다른 모델 — GPT-4)
- 한국어 NER (권장: LLM-based — 별도 의존성 X, 다국어 확장 용이)

---

### M5. 라이브 e2e 시나리오 (시연 안전망)

**목표**: 시연 핵심 흐름이 라이브에서 안 깨졌는지 자동 감지

**구성** (`e2e/scenarios/`, Playwright):
1. research-login (P062)
2. free-conversation-basic (한 턴 → 점수)
3. **free-conversation-offtopic (#13: 점수 ≤50)**
4. read-aloud-basic
5. presentation-basic
6. dialogue-mission-basic
7. listen-and-answer-basic
8. (Task 1.4 후) vocabulary-card-create
9. (Task 1.5 후) model-answer-play
10. **시연 시나리오 1-2개** (실제 시연 흐름과 동일)

**실행**: M2 deploy.sh 끝에 자동
**실패 시**: 스크린샷 + DOM dump + 자동 롤백 트리거

**결정 사항**:
- 시연 시나리오 lock-in 시점 (권장: 시연 1주 전)
- e2e 실패 자동 롤백 (권장: ON, 시연 1주 전부터)

---

### M6. 운영 모니터링

**목표**: 라이브 다운/URL 변경을 본인이 모르게 두지 않기

**구성**:
- `scripts/monitor.sh` (cron 5분 또는 UptimeRobot):
  - 터널 URL ping → 200 OK?
  - 200 아니면:
    1. SSH ping (인스턴스 살아있나?)
    2. `systemctl status cloudflared-kdli`
    3. 새 cloudflared URL 자동 감지 (로그 파싱)
  - 알림: 이메일 (또는 카카오톡 webhook)
- `scripts/get-current-tunnel-url.sh`: 본인이 잊었을 때 빠르게 확인
- **영구 해결**: named tunnel + 도메인 ($10/년)

**결정 사항**:
- 모니터링 위치 (권장: UptimeRobot 무료 + 노트북 cron 백업)
- 알림 채널 (권장: 이메일)
- named tunnel 시점 (권장: 다음 야간 2-3 사이, 시연 1주 전 마지노선)

---

### M7. 결정·백로그 추적

**목표**: "이거 나중에 봐야지" · "왜 이렇게 결정했지?" 휘발 방지

**구성**:
- **`BACKLOG.md` 강화**:
  - 상태 enum (pending / in-progress / blocked / done)
  - 의존성 명시
  - 시점 (즉시 / 다음 야간 / Sprint 종료 시 / 시연 후)
- **`DECISIONS.md` 신규** (백필 대상):
  - prompt v3 lock-in (7필드 · register 5값 · learning_objective 패턴 · pronunciation_focus 패턴 · 반말 경고 문구 표준)
  - DB 매핑 4결정 (user → auth.users+user_profiles · content → questions · pause_count → speaking_submissions · RLS → auth.uid())
  - fix 옵션 A 3 세부 결정 (3단계 신호 · 멀티플라이어 · DB 저장)
  - 자유대화 태깅 제외 결정
  - 파일럿 #18 분리 결정
- 자동 점검: Sprint 종료 시 pending 항목 보고

**결정 사항**:
- DECISIONS.md 도입 (권장: YES)
- 백필 범위 (권장: 어제 결정 전체)

---

## 의존성 + 야간별 진입점

```
M1 ┐
M2 ┼── 야간 1 (즉시 회수: 1.2 적용 + #13 배포)
M3 ┤
M5 ┘
      ┌─ M4 ── 야간 2 (1.3 사전 인프라)
      ├─ M6 ── 야간 2 (모니터링 셋업)
      └─ M7 ── 야간 2 (DECISIONS.md 백필)
           │
           └─ 야간 3 (M4 활용 → 1.3 일괄 적용)
                 │
                 └─ 야간 4+ (1.4 ~ 1.7 본작업)
```

| 야간 | 모듈 | 작업 | active |
|---|---|---|---|
| 1 | M1·M2·M3·M5 | 1.2 적용 + verify · #15 vitest · deploy.sh · #13 배포 · e2e 1-3건 | 40-60분 |
| 2 | M4·M6·M7 | 검수 layer · 1.3 사전 · 모니터링 · DECISIONS 백필 | 60-90분 |
| 3 | M4(활용)·M2·M5 | 1.3 dry-run · 일괄 적용 · 라이브 배포 + e2e | 30-60분 |
| 4-7 | M3·M5(확장) | 1.4 → 1.5 → 1.6 → 1.7, 매번 e2e 추가 | 각 30-60분 |

---

## 사각지대 보완 (놓침 방지 장치 7개)

| 위험 | 대응 |
|---|---|
| 1. 다국어 누락 (ko 중심) | M3 LLM 회귀 테스트에 **7언어 매트릭스 강제** |
| 2. 마이그레이션 롤백 불가 | M1 페어로 `rollback.sql` 동시 작성 + 커밋 |
| 3. LLM peer review 신뢰성 | **다른 모델** + spec inject + 통과 샘플 5% 검토 |
| 4. 시연 직전 라이브 사고 | M5 e2e = 시연 시나리오 일치 + M6 모니터링 + **시연 1일 전 deployment freeze** |
| 5. 인지 부하 누적 | 결정 일괄 처리 + default 정책 재사용 + 3-4 야간에 1번 가벼운 날 |
| 6. 자동 검증 false positive | 첫 일괄 적용 시 fail/warn 비율 측정 → spec 완화 매개변수 조정 |
| 7. 결정 휘발 | M7 DECISIONS.md 도입 + 백필 |

---

## 결정 사항 종합 (default & 본인 확정)

다음 야간 시작 전 한 번에 확정. default 그대로 가실지 변경하실지 [x] 표시.

| 모듈 | 결정 항목 | 권장 default | default 채택 |
|---|---|---|---|
| M1 | 검증 통과 기준 | 100% strict | [ ] |
| M1 | rollback.sql 커밋 | 같은 커밋 | [ ] |
| M2 | /api/healthz 응답 필드 | 시각·version·db ping·cloudflared status | [ ] |
| M2 | 자동 롤백 ON/OFF | ON | [ ] |
| M3 | 실호출 빈도 | 주 1회 + prompt 변경 직후 | [ ] |
| M3 | snapshot 갱신 방식 | 수동 확정 | [ ] |
| M4 | 샘플링 비율 | 5% (사후 조정) | [ ] |
| M4 | peer review 모델 | 다른 모델 (GPT-4) | [ ] |
| M4 | NER 도구 | LLM-based | [ ] |
| M5 | 시연 시나리오 lock-in 시점 | 시연 1주 전 | [ ] |
| M5 | e2e 실패 자동 롤백 | ON (시연 1주 전부터) | [ ] |
| M6 | 모니터링 위치 | UptimeRobot + 노트북 cron | [ ] |
| M6 | 알림 채널 | 이메일 | [ ] |
| M6 | named tunnel 시점 | 다음 야간 2-3 사이 | [ ] |
| M7 | DECISIONS.md 도입 | YES, 백필 어제 결정 전체 | [ ] |

---

## 진행 상황

### 야간 1: 자동화 인프라 1차 (목표 active 40-60분)
- [x] M1 `verify-migration.ts` + `verify-migration.sql` + `rollback.sql` 작성 (2026-05-21)
  - FK expected 11 (12 아님 — grep 자체검증으로 drift 정정), 정책 24, 인덱스 19
  - ⚠️ supabase-js `head:true` 가 없는 테이블에 204+null 반환(가짜 PASS) → non-head GET 으로 수정
- [x] Task 1.2 적용 — **실측 확인** (야간 2 1.3a inspect: is_tagged 컬럼·content_tags 테이블 존재, content_tags 0행). 즉 야간 3 실 INSERT unblocked. verify-migration.sql 재실행 권장.
- [x] M2 `deploy.sh` + `smoke-test.sh` + `rollback-deploy.sh` + `/api/healthz` 작성 (2026-05-21)
  - 로컬 검증: build 통과 · healthz 200(db.ok 49ms·buildId 일치·cloudflared best-effort) · smoke 5/5 PASS
  - 실제 라이브 배포는 본인 트리거 (deploy.sh, #13 P060-P066 영향 검토 후)
- [ ] #13 fix 라이브 배포 (M2 첫 사용)
- [x] M3-a `free-conversation-summary.test.ts` (mock 10 + real 15 opt-in, ko/en/vi) (2026-05-21)
  - vitest 1173 → 1183(+10 mock), real 15 skip. `tests/llm-regression/` + vitest include 추가
  - real 실측은 `LLM_REGRESSION_REAL=true` 로 별도 실행 대기 (#15)
- [x] M5 e2e 시나리오 3건 (research-login / free-conv-basic / free-conv-offtopic) (2026-05-21)
  - 로컬 3/3 PASS · LIVE_URL 게이트 경로=research-login만 실행+free-conv 2 skip 확인
  - #13 ≤50 수치는 `tests/unit/free-conversation-score.test.ts`(+6)로 결정론적 가드(score 헬퍼 추출)
- [x] 야간 1 commit & push (M1·M2·M3-a·M5 + doc, 모듈별 독립 → origin/feat/q4-llm-provider)
- [x] AUTOMATION_DESIGN.md 진행 체크박스 업데이트 (이 커밋)
- 다음 진입점: Task 1.2 적용(SQL Editor) → verify → deploy.sh 라이브(#13) → 야간 2(M4·M6·M7)

### 야간 2: 인프라 2차 + 1.3 사전 (목표 active 60-90분) — 완료 (2026-05-21)
- [x] prompt v3 정식 모듈 신규 (`src/lib/prompts/content-tagging.ts`) + 공유 스키마 `src/lib/tagging/schema.ts`(단일 진실 원천) + M3-b 회귀(mock 16 + real 6 opt-in)
- [x] M4 검수 layer — 정량 7규칙 + 분류 순수 모듈(`src/lib/tagging/validate-tagging.ts`, 단위 31) + peer review(gpt-4o, 6규칙) + CLI(`scripts/validate-tagging.ts`, 통계·검토 큐·approve/reject/edit·샘플 5%)
- [x] Task 1.3a 콘텐츠 풀 식별 (`scripts/inspect-content-pool.ts`, read-only 라이브)
  - **실측**: questions 12(active 12·미태깅 12) / type 분포 qt-reading 3·qt-material-desc 2·qt-dialogue-mission 2·qt-self-intro 2·qt-listening-resp 1·qt-opinion 1·qt-picture 1 / content_tags 0 / mission_scenarios 1(별도, FK 대상 아님) / content_versions 0
  - **확정**: content_tags FK는 questions(id) 전체 → 즉시 일괄 풀 = active·미태깅 12건 (대화미션은 qt-dialogue-mission 으로 questions 안에 존재)
- [x] Task 1.3b batch runner + 검증 통합 (`scripts/tag-content-batch.ts`, **BATCH_DRY=1 기본**) — dry-run 스모크 2건 PASS(작성자 gpt-4o-mini ↔ 검수자 gpt-4o), DB 무변경 확인. 실 INSERT(BATCH_DRY=0)는 야간 3.
- [x] M6 운영 모니터링 (`scripts/monitor.sh`·`scripts/get-current-tunnel-url.sh`·`docs/ops/MONITORING.md`, UptimeRobot+cron, 이메일)
- [x] M7 DECISIONS.md 신규(D-001~D-007 백필) + BACKLOG 강화(상태 enum·의존성·시점)
- [x] 검증: vitest 1183 → 1248 · lint 0 error · build 통과 (drift 2건 정정 포함)
- [x] drift 정정 2건 (dry-run에서 발견): rule 4 정규식 능력표현 일반화 · 낭독 pronunciation_focus 필수(rule 8) — DECISIONS D-001 보완 1·2
- [x] **1.3 실 INSERT (야간2 연장)** — content_tags 8 / vocabulary_terms 36 / content_vocabulary 42 / pronunciation_focus 0(낭독 미통과분) · questions is_tagged 8/4. 잔여 4건 → 야간3-B
- [x] 야간 2 commit & push (모듈별 독립 + drift 정정 2건 + docs → origin/feat/q4-llm-provider)
- 다음 진입점: 야간 3 — A(CLI edit→INSERT 경로) · B(잔여 4건 per-item) · C(prompt v3 미세조정) · 라이브 배포 + e2e

### 야간 3: 1.3 잔여 + 라이브 (목표 active 30-60분)
- [x] M4 dry-run (12건, 야간2 연장) — 자동 검증 보고서 확인
- [~] 전체 풀 일괄 적용 — **8/12 적용 완료**(야간2 연장), 잔여 4건 야간3-B
- [ ] 야간3-A: CLI `--review` edit → DB INSERT 경로 구현 (현재 미구현)
- [ ] 야간3-B: 잔여 미태깅 4건 per-item 처리 (낭독 통과 시 pronunciation_focus 채워짐)
- [ ] 야간3-C: prompt v3 미세조정 (learning_objective 구체성·topic_tags 정확성·작성자 temp 0.0 검토)
- [ ] 라이브 배포 + e2e (본인 트리거)

### 야간 4-7: 본작업 (각 active 30-60분)
- [ ] Task 1.4 자동 단어장 (SRS UI)
- [ ] Task 1.5 모범답안 (Azure TTS)
- [ ] Task 1.6 UX 배너
- [ ] Task 1.7 콘텐츠 admin
- [ ] e2e 시나리오 추가 (각 task마다)
- [x] M3-b `prompt-v3-content-tagging.test.ts` (야간 2 완료 — mock + real opt-in)
- [ ] named tunnel 도입 (시연 1주 전 마지노선)

### 시연 직전 안전망
- [ ] 시연 시나리오 정의 → e2e 추가
- [ ] 시연 1주 전: e2e 전체 통과 + named tunnel 도입
- [ ] 시연 1일 전: deployment freeze (코드 변경 금지)
- [ ] 시연 당일 아침: M5 e2e 전체 실행 + M6 모니터링 5분 간격으로 단축

---

## 퇴근 직후 첫 5분 체크리스트

> 6시간 후 (퇴근 직후) 처음 할 것. 부담 줄이고 자동 흐름 진입.

1. **WSL 켜기, 작업 디렉토리 진입**
   ```
   cd ~/projects/korean-speaking-ai-mvp
   ```

2. **git 상태 확인**
   ```
   git status            # clean인지
   git log -3 --oneline  # 어제 0e7dd2b까지 보이면 OK
   ```

3. **라이브 URL 1회 확인** (모바일에서 직접)
   - https://drove-explore-barbara-collapse.trycloudflare.com/research/login
   - 200 OK → 다음으로
   - 안 됨 → SSH로 현재 URL 추출:
     ```
     ssh -i ~/.ssh/lightsail-kdli.pem ubuntu@43.200.92.81 \
       'journalctl -u cloudflared-kdli -n 100 | grep trycloudflare'
     ```
     - 새 URL 나오면 P060-P066에게 공지 후 진행
     - URL 안 나오면 `sudo systemctl restart cloudflared-kdli` (인스턴스 안에서)

4. **포트 3000 정리** (clean state)
   ```
   lsof -i :3000   # 살아있으면
   kill <PID>      # 정리
   ```

5. **결정 default 1분 훑기**
   - 위 "결정 사항 종합" 표 한 번 보고
   - 변경할 항목 있으면 [x] 표시 + 비고 적기
   - 없으면 그대로 진행

6. **Claude Code 켜고 야간 1 prompt 붙여넣기** (아래)

---

## 야간 1 시작용 Claude Code prompt

```
방향: 자동화 인프라 우선 구축 → 본인 active time 최소화 + 놓침 방지.
설계 문서: docs/spec/AUTOMATION_DESIGN.md (이 문서)

다음 야간 1차 목표 (M1·M2·M3·M5):

1. M1 마이그레이션 검증 + rollback
   - scripts/verify-migration.ts 작성
     (테이블·컬럼·RLS·인덱스·SECURITY DEFINER·FK 점검)
   - supabase/migrations/<date>_sprint1_new_tables_rollback.sql 동시 작성 (페어)
   - Task 1.2 적용 (Supabase SQL Editor 수동 실행) 안내 + verify 실행 절차

2. M2 배포 자동화
   - scripts/deploy.sh (build → rsync → restart → smoke → 실패 시 자동 롤백)
   - scripts/smoke-test.sh (research/login · static · /api/healthz 200 확인)
   - scripts/rollback-deploy.sh (이전 .next 백업 복원)
   - app/api/healthz/route.ts 신규 (시각·version·db ping·cloudflared status)
   - 첫 사용: #13 fix 라이브 배포

3. M3-a LLM 회귀 시작 (#15)
   - tests/llm-regression/free-conversation-summary.test.ts
   - on 5건 + partial 5건(경계) + off 5건
   - 다국어 매트릭스 최소 ko/en/vi fixture (ar/th/ms/km 확장은 TODO 주석)
   - mock 기본, LLM_REGRESSION_REAL=true 옵션

4. M5 라이브 e2e 시작 (Playwright)
   - e2e/scenarios/research-login.spec.ts (P062 로그인 → 메뉴)
   - e2e/scenarios/free-conversation-basic.spec.ts (한 턴 → 점수)
   - e2e/scenarios/free-conversation-offtopic.spec.ts (#13 ≤50 검증)
   - deploy.sh 마지막에 자동 실행

결정 default (변경 없으면 그대로):
- 검증 100% strict, rollback 동행, 자동 롤백 ON
- peer review 다른 모델, 샘플링 5%, NER LLM-based
- /api/healthz: 시각·version·db ping·cloudflared status
- named tunnel은 다음 야간 2-3 사이

❗ 사전 spec 제안 → 본인 확정 후 진행. 각 모듈 독립 commit.
🔍 vitest 1173 유지, 빌드 통과 필수.
🔍 각 모듈 commit 후 BACKLOG.md / AUTOMATION_DESIGN.md 체크박스 업데이트.

순서 권장:
M1 → Task 1.2 적용 → M2 → #13 배포 → M3-a → M5
(M1·M2가 의존성 최저, M5는 deploy.sh 작성 후 통합)
```

---

## 마무리 체크리스트 (야간 1 종료 시)

- [ ] vitest 카운트 유지 또는 증가 (1173 + 신규)
- [ ] 빌드 통과
- [ ] 라이브 sanity (모바일 1분 확인)
- [ ] 이 문서 진행 상황 체크박스 업데이트
- [ ] BACKLOG.md 점검 (새 발견 항목 추가)
- [ ] 다음 야간 진입점 한 줄 메모 (현재 위치 + 다음 작업)

---

## 변경 이력

- 2026-05-21: 초안 작성 (Sprint 1 가속 + 놓침 방지 정밀 설계)
