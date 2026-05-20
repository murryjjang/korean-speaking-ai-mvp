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
