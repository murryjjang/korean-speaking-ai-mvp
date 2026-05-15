# 시험운영(Pilot) 운영자 가이드

v1.1 단계 10에서 구축된 시험운영 인프라(KDLI Korean MVP) 운영 매뉴얼.
4~5명 학습자 × 1~2주 시험운영 기준으로 작성됨.

---

## 1. 사전 준비

### 1.1 환경변수 (.env.local)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# research_* 테이블 SELECT/UPDATE/DELETE 및 admin 페이지 전용 (RLS 우회).
# SERVER ONLY — 절대 클라이언트로 노출하지 말 것.
SUPABASE_SERVICE_ROLE_KEY=...

# 관리자 비밀번호 (시험운영 규모용 단순 보호)
RESEARCH_ADMIN_PASSWORD=<강한 비밀번호>

# 동의서 본문이 바뀌면 수동으로 버전 올림 (기본 v1.0)
# RESEARCH_CONSENT_VERSION=v1.0
```

### 1.2 데이터베이스 마이그레이션

`supabase/migrations/20260515_research_pilot_schema.sql` 내용을 Supabase 대시보드의
SQL Editor에서 실행한다. 자동 마이그레이션 러너는 사용하지 않는다.

생성되는 테이블 5종:
- `research_participants` — 사전 발급 참여자
- `research_sessions` — 학습 세션 (모드별)
- `research_utterances` — 발화 기록 (학습자·NPC)
- `research_assessments` — 평가 점수·피드백
- `research_consent_logs` — 동의 이력

RLS 정책: `INSERT`는 anon 허용, `SELECT/UPDATE/DELETE`는 default deny. 서버 라우트는
SERVICE_ROLE 키로 우회한다.

### 1.3 개발 서버 시작

```bash
npm install
npm run dev
```

---

## 2. 참여자 ID 발급 절차

1. 관리자 로그인: `/research/admin/login` → `RESEARCH_ADMIN_PASSWORD` 입력.
2. 참여자 관리: `/research/admin/participants` 진입.
3. "신규 참여자 발급" 폼:
   - 참여자 코드는 비워두면 `P001`, `P002`, ... 형식으로 자동 발급
   - 이름·국적·한국어 수준·모국어는 선택 입력 (분석 변수로 활용)
   - PIN은 4자리 숫자(선택) — 설정 시 로그인에 필요
   - 메모는 운영자 참고용
4. 발급 → 목록에 표시됨. 참여자에게 다음 정보 전달:
   - 사이트 URL (예: `https://your-host/research/login`)
   - 참여자 코드 (예: `P001`)
   - PIN (설정한 경우)
   - 안내 문서(`docs/research-participant-guide.ko.md` 또는 `.en.md`)

**보안 주의**: 참여자 코드·PIN은 안전한 채널(이메일·DM)로만 전달. 공개 메모/문서에
직접 표기 금지.

---

## 3. 동의 화면

참여자가 로그인하면 자동으로 `/research/consent`로 유도됩니다 (consent_status=false인 경우).

- 한국어·영어 토글 지원
- 동의 본문 SHA-256 해시가 `research_consent_logs`에 저장 — 어느 버전 본문에
  동의했는지 감사 가능
- IP는 앞 24비트(IPv4 /24)만 보존하는 익명화 처리

**본문이 바뀌면**: `src/lib/research/consent-text.ts` 수정 + `CONSENT_VERSION`을
`src/lib/research/types.ts`에서 올린다.

---

## 4. 데이터 수집 범위

| 항목 | 저장 위치 | 모드 |
|---|---|---|
| 세션 메타 (시작·종료·모드·페르소나·주제) | research_sessions | 전체 |
| 학습자 발화 (음성·텍스트·STT) | research_utterances | 전체 |
| NPC 응답 (텍스트·응답시간·도구호출) | research_utterances | 자유 대화, q4 |
| 평가 점수·세부 항목·피드백 | research_assessments | 평가형 모드 + 자유 대화 종료 피드백 |
| 발음 평가 raw (Azure PA) | research_assessments.pronunciation_data | q1·q2·q3·읽기 |
| 동의 이력 (버전·해시·IP·UA) | research_consent_logs | 동의 시점 |

모든 로깅은 **fail-silent** — Supabase 미설정·네트워크 오류 시 학습 흐름을 막지 않는다.

---

## 5. CSV 내보내기 사용법

`/research/admin/export`에서 4종 다운로드:

| 파일 | 내용 | 분석 용도 |
|---|---|---|
| `summary.csv` | 참여자 1행 wide format. 모드별 세션수·평균점수·발화수 누적. | 가장 자주 사용. R/Python/Excel에서 바로 통계 분석. |
| `sessions.csv` | 세션 메타 + 지속 시간(초). | 학습 빈도·시간 분석. |
| `utterances.csv` | 발화 전체 (학습자/NPC). 도구 호출·응답 시간 포함. | 발화 길이·다양성·NPC 응답 시간 분석. |
| `assessments.csv` | 평가 점수·세부 항목·피드백. 발음 raw 포함. | 점수 추이·발음 분석. |

CSV는 UTF-8 BOM + RFC 4180 형식 — 한글이 정상 표시되며 쉼표·줄바꿈을 포함한 값은
큰따옴표로 escape된다.

### 5.1 권장 분석 흐름

1. `summary.csv` → 참여자별 활동량 개요 파악
2. `sessions.csv` → 시간대·모드별 빈도
3. `utterances.csv` → 발화 길이·다양성 분석 (Python으로 토큰화)
4. `assessments.csv` → 점수 추이·발음 평가 raw 확인

---

## 6. 동의 철회·데이터 삭제

학습자가 참여 철회를 요청하면:

1. Supabase SQL Editor에서:
   ```sql
   -- 모든 종속 데이터(CASCADE)와 함께 참여자 삭제
   delete from public.research_participants where participant_code = 'P00X';
   ```
2. `research_sessions`, `research_utterances`, `research_assessments`,
   `research_consent_logs`는 ON DELETE CASCADE로 자동 삭제됨.

데이터 보관 기간(2년) 종료 시에도 동일 절차로 일괄 삭제.

---

## 7. 알려진 제약·주의사항

- **RLS 최소 정책**: SELECT/UPDATE/DELETE는 service_role만 허용. 절대로
  `SUPABASE_SERVICE_ROLE_KEY`를 클라이언트 측 또는 NEXT_PUBLIC_ 접두사로 노출하지 말 것.
- **fail-silent 로깅**: Supabase 미설정 시 모든 로깅이 무해하게 skip. dev/local
  환경에서는 로깅이 안 됨 — 시험운영 시작 전 `/research/admin`에서 통계가 0이 아닌지
  스모크 확인 필수.
- **세션 만료**: 참여자·관리자 쿠키 모두 24시간. 24시간 이후 재로그인 필요.
- **참여자 동의 미완료**: 모든 학습 활동에서 로깅은 일어남(참여자 ID 쿠키만 있으면).
  단, `/research/consent` 페이지로 자동 유도되므로 미동의 상태로 학습 활동을 시작하기는
  어렵다. 분석 시에는 `participants.consent_status=true`로 필터링 권장.

---

## 8. 트러블슈팅

### 로그인하면 곧바로 `/research/login`으로 되돌아감
쿠키 설정 실패 가능성. dev 환경에서는 `secure=false`로 자동 설정되므로 localhost
HTTPS 강제는 불필요. 시크릿 창에서 쿠키 차단을 의심.

### 관리자 페이지에서 통계가 0
`SUPABASE_SERVICE_ROLE_KEY` 미설정 또는 마이그레이션 미적용. 운영자 가이드 1.1·1.2 재확인.

### CSV가 비어 있음
시험운영이 시작되지 않았거나, anon INSERT 정책이 비활성화됨. Supabase 정책 화면에서
`research_*` 테이블의 `INSERT (anon)` 정책 활성 여부 확인.

### 페르소나 음성이 들리지 않음
관련 없음 — Azure TTS 설정 확인. 시험운영 인프라와 무관.
