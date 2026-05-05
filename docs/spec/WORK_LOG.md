# WORK LOG

Phase별 작업 내역을 기록합니다.

---

## Phase 8-C — Supabase Storage 최소 연동 (녹음 파일 업로드)

**날짜**: 2026-05-05  
**목표**: 녹음 Blob을 Supabase Storage에 업로드하고, `audio_url`을 `speaking_submissions`에 저장한다. Storage 업로드 실패 시에도 STT, 제출, 결과 화면 이동은 계속된다.

### 생성/수정 파일

| 파일 | 변경 내용 |
|---|---|
| `src/lib/supabase/storage.ts` | `uploadAudioToStorage()` helper — bucket upload + getPublicUrl 반환 |
| `app/api/storage/upload/route.ts` | POST route — FormData(audio, questionId) → Storage upload → `{ storagePath, publicUrl }` |
| `src/lib/repositories/types.ts` | `SpeakingEvalRecord`에 `audioUrl?: string \| null` 추가 |
| `src/lib/mock/speaking-store.ts` | `SpeakingEvalRecord`에 `audioUrl?: string \| null` 추가 |
| `app/student/speaking/actions.ts` | `SpeakingSubmitMeta`에 `audioUrl?` 추가, `record.audioUrl` 저장 |
| `app/student/speaking/[questionId]/speaking-client.tsx` | Blob 1회 fetch → STT + Storage 병렬 업로드 → `audioUrl` pass-through |
| `src/lib/repositories/supabase-submission-repository.ts` | `speaking_submissions.audio_url`에 `record.audioUrl ?? null` 사용 |
| `docs/spec/WORK_LOG.md` | Phase 8-C 항목 추가 (이 문서) |

### Storage 업로드 구조

```
클라이언트 (speaking-client.tsx)
  ├─ fetch(recorder.blobUrl) → audioBlob
  └─ Promise.allSettled([
       /api/stt         ← STT (기존)
       /api/storage/upload ← 신규
         └─ uploadAudioToStorage(blob, questionId)
              ├─ bucket: recordings
              ├─ path: speaking/{questionId}/{timestamp}.{ext}
              ├─ 성공 → { storagePath, publicUrl }
              └─ 실패 → null + console.error([provider_events] storage.error)
     ])
  └─ submitSpeaking(questionId, setId, { ..., audioUrl })
       └─ saveSpeakingEvalRecord({ ..., audioUrl })
            └─ speaking_submissions.audio_url = audioUrl ?? null
```

### 필요한 Supabase bucket 설정

Supabase Dashboard > Storage에서 다음 설정이 필요합니다:

| 항목 | 값 |
|---|---|
| **Bucket 이름** | `recordings` |
| **Public** | `true` (getPublicUrl이 서명 없이 동작하려면 필수) |
| **파일 크기 제한** | 50 MB 이상 권장 (최장 5분 기준 약 30 MB) |
| **허용 MIME 타입** | `audio/webm`, `audio/mp4`, `audio/ogg` |

Supabase Storage Policies (RLS) — pilot 기준 최소 설정:

```sql
-- anon INSERT 허용 (pilot phase — Phase 9에서 Auth 기반으로 교체 예정)
CREATE POLICY "allow_anon_upload"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'recordings');
```

> bucket이 없거나 policy가 없으면 업로드가 실패합니다.
> 실패 시 서버 콘솔에 `[provider_events] storage.error` 가 찍히고,
> `audio_url` 없이 제출이 계속됩니다 (non-blocking).

### audio_url 저장 위치

`speaking_submissions.audio_url` (text, nullable) 컬럼에 Supabase Storage Public URL 저장.

- 성공 시: `https://{project}.supabase.co/storage/v1/object/public/recordings/speaking/{questionId}/{timestamp}.webm`
- 실패 시: `null` (기존 동작과 동일)

### 업로드 실패 시 fallback 조건

| 조건 | 결과 |
|---|---|
| Supabase client 미설정 | `storage.skip reason=no_supabase_client` 경고 → `audioUrl=undefined` |
| bucket `recordings` 미존재 | `storage.error` 로그 → `audioUrl=undefined` |
| anon INSERT policy 없음 | `storage.error` 로그 → `audioUrl=undefined` |
| 네트워크 오류 | `storage.error` 로그 → `audioUrl=undefined` |
| `/api/storage/upload` fetch 실패 | catch → `audioUrl=undefined` |
| 위 모든 경우 | `submitSpeaking`은 `audioUrl=undefined` 로 정상 호출 → DB에 `audio_url=null` |

### provider_events 기록

```
storage.skip   → console.warn  '[provider_events] storage.skip reason=no_supabase_client'
storage.success → console.info  '[provider_events] storage.success path=... bucket=recordings'
storage.error  → console.error '[provider_events] storage.error message=... path=...'
```

Phase 8-E에서 이 이벤트들을 DB `provider_events` 테이블에 기록할 수 있습니다.

### Phase 8-F ETRI 연동 준비

`uploadAudioToStorage()` 반환값:
```typescript
{ storagePath: 'speaking/q-001/1234567890.webm', publicUrl: 'https://...' }
```

- `storagePath`: ETRI API가 Supabase에서 직접 파일을 읽을 수 있는 경로
- `transcript`: `sttResult.transcript` — ETRI 발음평가 참조 텍스트로 사용 가능
- `SpeakingEvalRecord.audioUrl`: Phase 8-F provider에서 접근 가능

### STT/OpenAI 흐름 영향

없음. STT와 Storage 업로드는 `Promise.allSettled`로 완전히 병렬 독립 실행. 어느 쪽 실패도 다른 쪽에 영향 없음.

### 테스트 방법

**Storage 업로드 정상 동작 확인:**
1. Supabase Dashboard에서 `recordings` bucket 생성 + public + anon INSERT policy 적용
2. `.env.local`: `REPOSITORY_PROVIDER=supabase`, `NEXT_PUBLIC_SUPABASE_URL=...`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
3. `npm run dev` → `/student/speaking/q-001?setId=qs-diagnostic-01`
4. 녹음 → 제출 시 서버 콘솔 확인:
   - 성공: `[provider_events] storage.success path=speaking/q-001/... bucket=recordings`
5. Supabase Dashboard > Table Editor > `speaking_submissions` 에서 `audio_url` 확인

**Storage 업로드 실패 (non-blocking) 확인:**
1. `recordings` bucket 미생성 상태에서 동일 흐름 실행
2. 서버 콘솔에 `[provider_events] storage.error` 출력 확인
3. 결과 페이지 정상 도달 확인

**STT 흐름 유지 확인:**
1. `STT_PROVIDER=openai`, `OPENAI_API_KEY=sk-...` 설정
2. 기존과 동일하게 STT 동작 확인

### 테스트 결과

- `npm run lint` → 오류 없음 ✓
- `npx tsc --noEmit` → 오류 없음 ✓
- `npm run build` → 빌드 성공 ✓ (16개 라우트, `/api/storage/upload` 추가)

### Known Issues (Phase 8-C 기준)

| 이슈 | 영향 | 해소 예정 |
|---|---|---|
| **Storage bucket 수동 생성 필요** | 중 — bucket 없으면 업로드 실패(non-blocking) | 사용자가 Dashboard에서 직접 생성 |
| **anon 업로드 RLS 미완** | 중 — Auth 미구현으로 pilot용 anon policy 필요 | Phase 9 (Auth 이후 교체) |
| **audio_url은 Public URL** — signed URL 미구현 | 소 — public bucket 기준. private bucket 사용 시 signed URL 별도 구현 필요 | Phase 9 이후 |
| **iOS Safari 대응 미완** | 중 — MediaRecorder 미지원 환경 | Phase 8-D |
| 기존 Phase 8-B known issues 유지 | — | 해당 Phase 참고 |

### 다음 단계 제안

| 항목 | 내용 |
|---|---|
| **Phase 8-D** | iOS Safari 대응 — MediaRecorder 미지원 환경 감지 및 대안 안내 |
| **Phase 8-E** | provider_events DB 기록 — Storage/STT 성공/실패를 `provider_events` 테이블에 저장 |
| **Phase 8-F** | ETRI 발음평가 API 연동 — `storagePath` + `transcript` → ETRI API → `pronunciationResult` 실제 채점 |
| **Phase 9** | Supabase Auth 도입 — anon policy를 Auth 기반 RLS로 교체 |

---

## Phase 8-B — OpenAI Whisper STT 실제 API provider 최소 연동

**날짜**: 2026-05-05  
**목표**: `STT_PROVIDER=openai` 또는 `whisper` 환경에서 OpenAI Whisper API(`whisper-1`)를 실제로 호출한다. API key 미설정 또는 호출 실패 시 기존 mock fallback 흐름을 그대로 유지한다.

### 생성/수정 파일

| 파일 | 변경 내용 |
|---|---|
| `src/providers/stt/index.ts` | `WhisperSTTProvider.transcribe()` 실제 구현 (OpenAI SDK 동적 import) |
| `.env.local.example` | `OPENAI_API_KEY=` 및 `STT_PROVIDER` 설명 추가 |
| `package.json` / `package-lock.json` | `openai ^6.36.0` 의존성 추가 |
| `docs/spec/WORK_LOG.md` | Phase 8-B 항목 추가 (이 문서) |

### OpenAI STT provider 구조

```
STT_PROVIDER=openai 또는 whisper
  └─ WhisperSTTProvider.transcribe(blob)
       1. OPENAI_API_KEY 없으면 throw → /api/stt 에서 mock fallback
       2. openai 패키지 동적 import (서버 전용 유지, 클라이언트 번들 제외)
       3. Blob → Buffer → toFile() 변환
       4. client.audio.transcriptions.create({ model: 'whisper-1', language: 'ko' })
       5. 성공 → STTResult { transcript, confidence: 1.0, providerName: 'whisper', ... }
       6. 예외 throw → /api/stt 에서 mock fallback

STT_PROVIDER=mock (기본값)
  └─ MockSTTProvider (기존과 완전 동일)
```

### /api/stt fallback 흐름 (기존, 변경 없음)

```
provider.transcribe() 성공
  → Response.json({ transcript, providerName: 'whisper', source: 'stt' })

provider.transcribe() throw
  → console.error('[provider_events] stt.error', err)
  → Response.json({ transcript: MOCK_TRANSCRIPT, providerName: 'mock', source: 'mock-fallback' })
```

### 환경변수 설정 방법

`.env.local`:
```
STT_PROVIDER=openai   # 또는 whisper (동일)
OPENAI_API_KEY=sk-...  # 서버 전용 — NEXT_PUBLIC_ 접두사 절대 사용 금지
```

mock 유지 시:
```
STT_PROVIDER=mock     # 기본값 — OPENAI_API_KEY 불필요
```

### mock fallback 조건

| 조건 | 결과 |
|---|---|
| `STT_PROVIDER=mock` (기본값) | MockSTTProvider 직접 사용 — OpenAI 호출 없음 |
| `STT_PROVIDER=openai\|whisper` + `OPENAI_API_KEY` 미설정 | throw → `/api/stt` mock fallback |
| `STT_PROVIDER=openai\|whisper` + API 호출 실패 (네트워크, 인증 등) | throw → `/api/stt` mock fallback |
| 클라이언트 fetch `/api/stt` 실패 | speaking-client.tsx 비차단 처리 → `submitSpeaking` mock STT 사용 |

### provider_events 기록

- 성공: `console.info('[provider_events] stt.success provider=%s latency=%dms', ...)` (기존 route.ts, 변경 없음)
- 실패: `console.error('[provider_events] stt.error', err)` (기존 route.ts, 변경 없음)
- 실제 DB 기록은 Phase 8-C 이후 예정

### 테스트 방법

**mock 동작 확인 (API key 불필요):**
1. `.env.local`: `STT_PROVIDER=mock` (기본값)
2. `npm run dev` → `/student/speaking/q-001?setId=qs-diagnostic-01`
3. 녹음 → 제출 → 결과 페이지 정상 도달 확인

**Whisper 연동 확인 (API key 필요):**
1. `.env.local`: `STT_PROVIDER=openai`, `OPENAI_API_KEY=sk-...`
2. `npm run dev` → `/student/speaking/q-001?setId=qs-diagnostic-01`
3. 녹음 후 제출 시 서버 콘솔에서 확인:
   - 성공: `[provider_events] stt.success provider=whisper latency=Xms`
   - 실패: `[provider_events] stt.error ...` + mock fallback으로 제출 정상 완료

**fallback 확인:**
1. `.env.local`: `STT_PROVIDER=whisper`, `OPENAI_API_KEY` 없음 (또는 잘못된 값)
2. 제출 시 서버 콘솔에 `stt.error` 기록 확인
3. 결과 페이지는 정상 도달 (mock transcript 사용)

### Supabase 저장 흐름 영향

없음. `submitSpeaking` Server Action은 `/api/stt` 응답의 `sttTranscript`를 그대로 전달받으며, Supabase 저장 경로(`REPOSITORY_PROVIDER=supabase`)는 기존과 동일.

### 테스트 결과

- `npm run lint` → 오류 없음 ✓
- `npx tsc --noEmit` → 오류 없음 ✓
- `npm run build` → 빌드 성공 ✓ (15개 라우트, 기존과 동일)

### Known Issues (Phase 8-B 기준)

| 이슈 | 영향 | 해소 예정 |
|---|---|---|
| **word timings 미제공** — Whisper `whisper-1` 응답에서 word timestamps를 요청하지 않음 (단순 text만 수신) | 소 | 필요 시 `verbose_json` + `timestamp_granularities: ['word']` 추가 |
| **confidence 고정값** — Whisper는 confidence를 반환하지 않아 `1.0` 고정 | 소 | 설계 수용 (Whisper API 제약) |
| **audio_url null 유지** — Supabase Storage 미구현으로 audio_url은 여전히 null | 중 | Phase 8-C (Supabase Storage) |
| **iOS Safari 대응 미완** — MediaRecorder 지원 제한으로 webm Blob이 생성 안 될 수 있음 | 중 | Phase 8-C (iOS 대응) |
| 기존 Phase 8-A, 7-C-lite, 7-B-main known issues 모두 유지 | — | 해당 Phase 참고 |

### 다음 단계 제안

| 항목 | 내용 |
|---|---|
| **Phase 8-C** | Supabase Storage 최소 연동 — 녹음 Blob 업로드, `audio_url` DB 업데이트 |
| **Phase 8-D** | iOS Safari 대응 — MediaRecorder 미지원 환경 감지 및 대안 안내 |
| **Phase 8-E** | provider_events DB 기록 — STT 성공/실패를 `provider_events` 테이블에 저장 |
| **Phase 9** | ETRI 발음평가 연동 또는 LLM 실제 채점 구현 |

---

## Phase 7-C-lite — 학습자 화면 지원 언어 도움말 추가 (접기/펼치기)

**날짜**: 2026-05-05  
**목표**: 초급 학습자가 문제와 미션을 이해할 수 있도록 "모국어 도움말" 접기/펼치기 기능을 추가한다. 전체 UI 번역은 하지 않고, 한국어 지시문을 기본으로 유지하면서 보조 설명만 지원 언어로 제공한다.

### 생성 파일

- `src/components/ui/lang-hint.tsx` — `LangHint` 재사용 컴포넌트.
  - `LangHintItem`: `{ lang: string; text: string }` 타입 (export)
  - `LangHintProps`: `items: LangHintItem[]`, `label?: string` (기본값: `'도움말 보기'`)
  - "▼ 도움말 보기" / "▲ 도움말 닫기" 토글 버튼
  - 펼쳤을 때: `bg-slate-50 border border-slate-100` 배경, 언어 코드 `[EN]` 형식으로 앞에 표시
  - `items` 빈 배열이면 null 렌더링 (조건부 사용 간소화)
  - 모바일 360px에서 카드 높이 과도 증가 없음 — 접힌 상태가 기본

### 수정 파일

#### `src/components/ui/index.ts`
- `LangHint` 컴포넌트 및 `LangHintItem` 타입 re-export 추가

#### `app/student/speaking/[questionId]/speaking-client.tsx`
- `LangHint`, `LangHintItem` import 추가
- `QUESTION_HINTS` 맵 추가 — 질문 ID → `LangHintItem[]`
  - `q-001` (자기소개 기본): EN / VI / JA / AR
  - `q-003` (그림 묘사): EN / VI / JA / AR
  - `q-007` (한국 음식 추천): EN / VI / JA / AR
  - 나머지 질문은 힌트 없음 (hint 없을 경우 아무것도 렌더링 안 함)
- `RECORDING_HINTS` 상수 추가 — 녹음 방법 안내 EN / VI / JA / AR
- 질문 카드 `CardBody` 하단: `QUESTION_HINTS[question.id]` 있을 때 `<LangHint label="모국어 도움말 보기" />` 렌더링
- prep 단계 카드: "준비 시작" 버튼 아래 `<LangHint items={RECORDING_HINTS} label="녹음 방법 도움말" />` 렌더링 (카운트다운 시작 전에만 표시)

#### `app/student/mission/[scenarioId]/mission-client.tsx`
- `LangHint`, `LangHintItem` import 추가
- `SCENARIO_SITUATION_HINTS` 맵 추가 — 시나리오 ID → 상황 설명 `LangHintItem[]`
  - `sc-restaurant-01` (식당): EN / VI / JA / AR
  - `sc-hospital-01` (병원): EN / VI / JA / AR
- `SCENARIO_GOALS_HINTS` 맵 추가 — 시나리오 ID → 전체 목표 요약 `LangHintItem[]`
  - `sc-restaurant-01`: 목표 3개 요약 EN / VI / JA / AR
  - `sc-hospital-01`: 목표 4개 요약 EN / VI / JA / AR
- `CHAT_GUIDE_HINTS` 상수 추가 — 대화 입력 방법 안내 EN / VI / JA / AR
- 미션 정보 카드 `CardBody` 하단: `<LangHint label="모국어 도움말 보기" />` 렌더링
- 미션 목표 패널 `<ul>` 하단: `<LangHint label="목표 도움말 보기" />` 렌더링
- ready 단계 "대화 시작" 버튼 아래: `<LangHint items={CHAT_GUIDE_HINTS} label="대화 방법 도움말" />` 렌더링

### 도움말 구현 방식

- **접기/펼치기**: 기본 닫힌 상태. 버튼 클릭 시 패널 토글.
- **한국어 우선**: 한국어 지시문을 먼저 표시하고, 도움말 패널은 별도 토글로 분리.
- **버튼 라벨 한국어 유지**: "도움말 보기", "도움말 닫기", "모국어 도움말 보기" 등 모두 한국어.
- **언어 표기**: `[EN]`, `[VI]`, `[JA]`, `[AR]` 형식의 앞 표시로 어떤 언어인지 명확히 구분.
- **지원 언어 범위**: mock 학생 데이터 기준 — 영어(EN), 베트남어(VI), 일본어(JA), 아랍어(AR).

### 적용된 화면

| 화면 | 힌트 위치 | 힌트 종류 |
|---|---|---|
| `/student/speaking/q-001` (자기소개) | 질문 카드 하단 | 질문 내용 번역 |
| `/student/speaking/q-003` (그림 묘사) | 질문 카드 하단 | 질문 내용 번역 |
| `/student/speaking/q-007` (음식 추천) | 질문 카드 하단 | 질문 내용 번역 |
| `/student/speaking/[any]` — prep 단계 | 준비 시작 버튼 아래 | 녹음 방법 안내 |
| `/student/mission/sc-restaurant-01` | 미션 정보 카드 하단 | 시나리오 상황 설명 |
| `/student/mission/sc-restaurant-01` | 목표 패널 하단 | 목표 목록 번역 |
| `/student/mission/sc-restaurant-01` | 대화 시작 버튼 아래 | 대화 방법 안내 |
| `/student/mission/sc-hospital-01` | 미션 정보 카드 하단 | 시나리오 상황 설명 |
| `/student/mission/sc-hospital-01` | 목표 패널 하단 | 목표 목록 번역 |

### 모바일 360px 확인 방법

1. `npm run dev` 실행
2. Chrome DevTools → Toggle device toolbar → 360×800 (또는 Galaxy S20) 설정
3. `/student/speaking/q-001?setId=qs-diagnostic-01` 접속 → 질문 카드에서 "모국어 도움말 보기" 확인
4. "도움말 보기" 클릭 → 4개 언어 패널 펼쳐짐 확인
5. "도움말 닫기" 클릭 → 패널 접힘 확인
6. `/student/mission/sc-restaurant-01` 접속 → 미션 정보, 목표, 대화 시작 각 도움말 확인

### 버튼 라벨을 한국어로 유지한 이유

- 학습 목적 유지: 학습자가 한국어 인터페이스에 노출되어 UI 어휘도 학습 기회가 됨
- 범위 명확화: "도움말(보조 설명)만 다국어, 핵심 UI는 한국어"라는 Phase 7-C-lite 설계 원칙
- 전체 번역 금지: 스펙 요구 사항 ("버튼 전체 번역 금지")

### 테스트 결과

- `npm run lint` → 오류 없음 ✓
- `npx tsc --noEmit` → 오류 없음 ✓
- `npm run build` → 빌드 성공 ✓ (14개 라우트, 기존과 동일)

### Known Issues (Phase 7-C-lite 기준)

| 이슈 | 영향 | 해소 예정 |
|---|---|---|
| **힌트 미제공 질문** — q-002, q-004, q-005, q-006, q-008은 힌트 없음 | 소 | Phase 8 이후 콘텐츠 충실화 시 추가 |
| **아랍어 RTL 미처리** — 아랍어 텍스트가 LTR 컨텍스트에서 렌더링됨. 읽기는 가능하나 오른쪽 정렬 없음 | 소 | Phase 8 이후 필요 시 `dir="rtl"` 적용 |
| **미번역 UI 요소** — 토글 버튼("도움말 보기"), 언어 코드("[EN]") 등은 한국어/영어 코드 유지 | 설계 의도 | Phase 7-C-lite 범위 밖 |
| 기존 Phase 7-B-main, 7-A-lite, 6-B5 known issues 모두 유지 | — | 해당 Phase 참고 |

### 다음 단계 제안 (Phase 8-A)

| 항목 | 내용 |
|---|---|
| **Phase 8-A** | ETRI 또는 Whisper STT 실제 API 최소 연동 — 녹음 Blob을 FormData로 서버 Route Handler에 전달 → STT 결과 반환. mock transcript 대체. |
| **Phase 8-B** | Supabase Storage 업로드 — 녹음 Blob을 presigned URL 또는 anon upload로 Storage에 저장, `audio_url` DB 업데이트 |
| **Phase 8-C** | iOS Safari 대응 — MediaRecorder 미지원 환경 감지 후 대안 안내 |
| **Phase 8-D** | 힌트 콘텐츠 확장 — 나머지 질문(q-002~q-008) 및 추가 시나리오 힌트 데이터 보충 |

---

## Phase 7-B-main — 브라우저 마이크 녹음 최소 구현

**날짜**: 2026-05-05  
**목표**: 브라우저 MediaRecorder API를 사용해 학습자 말하기 평가 화면에 실제 녹음 기능을 최소 구현한다. 녹음 파일은 브라우저 메모리 Blob URL로만 관리하며 서버 업로드 없음. 기존 mock 제출 흐름 완전 유지.

### 생성 파일

- `src/hooks/use-audio-recorder.ts` — `useAudioRecorder` 커스텀 훅.
  - `RecorderState`: `'idle' | 'requesting' | 'recording' | 'stopped' | 'error'`
  - `RecorderErrorType`: `'not-supported' | 'permission-denied' | 'permission-dismissed' | 'unknown'`
  - `startRecording()`: `navigator.mediaDevices.getUserMedia` 호출 → MediaRecorder 시작. MIME 우선순위: `audio/webm;codecs=opus` → `audio/webm` → `audio/mp4` → 기본값 (Safari 대응)
  - `stopRecording()`: MediaRecorder 정지 → `onstop` 콜백에서 Blob 조합 → `URL.createObjectURL()` → `blobUrl` 상태 갱신
  - `reset()`: 진행 중 녹음 중지 + 스트림 트랙 release + `URL.revokeObjectURL()` (메모리 누수 방지)
  - `durationSec`: 1초 interval 카운터
  - unmount 시 자동 cleanup (clearInterval + stopStream + revokeObjectURL)

### 수정 파일

- `app/student/speaking/[questionId]/speaking-client.tsx` — 녹음 UI 전면 연결.
  - `useAudioRecorder` 훅 import 및 사용
  - `recording` phase 진입 시 `setTimeout(() => recorder.startRecording(), 0)` 로 MediaRecorder 시작 (effect 내 직접 setState 규칙 준수)
  - recorder.state `'stopped'` / `'error'` 감지 시 `setTimeout(() => setPhase('review'), 0)` 전환
  - `responseTimeSec` 도달 시 `recorder.stopRecording()` 자동 호출
  - `recording` phase 화면: `requesting` → 권한 요청 중 메시지 | `recording` → 녹음 중 타이머 + 완료 버튼 | `error` → 오류 메시지 + mock fallback 안내
  - `review` phase 화면: blobUrl 있으면 `<audio controls>` 재생기 표시 + 녹음 길이 표시
  - `review` phase: recorder.state `'error'`면 warning 배너 표시 (mock 제출 가능 안내)
  - 다시 녹음: `recorder.reset()` 호출 → 기존 Blob URL revoke 후 `recording` phase 재진입
  - 마이크 오류 메시지: `RECORDER_ERROR_MESSAGES` 맵으로 한국어 안내문 표시
  - 버튼 모두 min-h-[44px] (Button 컴포넌트 기본 적용)

- `app/student/speaking/actions.ts` — metadata 파라미터 추가.
  - `SpeakingSubmitMeta` 인터페이스 export (`hasRecording?`, `recordingDurationSec?`)
  - `submitSpeaking(questionId, questionSetId, meta?)` — 3번째 파라미터 optional 추가
  - `record.meta` 에 `{ hasRecording, recordingDurationSec, audioUrl: null }` 포함
  - 기존 mock 제출 흐름 완전 유지. Supabase 저장 경로 변경 없음.

- `docs/spec/WORK_LOG.md` — Phase 7-B-main 항목 추가 (이 문서)

### 녹음 UI 플로우

```
[prep phase]
  준비 시작 버튼 클릭 → 카운트다운 → 자동으로 recording phase
  또는 "준비 완료 — 바로 시작" 클릭 → recording phase

[recording phase]
  마운트 시 recorder.startRecording() 호출
    → requesting: 권한 요청 중 메시지 표시
    → recording: 타이머 + "녹음 완료" 버튼
      ├─ "녹음 완료" 버튼 클릭 → recorder.stopRecording() → review phase
      └─ responseTimeSec 경과 → auto recorder.stopRecording() → review phase
    → error: 오류 메시지 표시 → review phase (mock fallback)

[review phase]
  blobUrl 있으면 <audio controls> 재생기 표시
  error 상태면 warning 배너 + mock 제출 가능 안내
  "다시 녹음" → recorder.reset() + recording phase 재진입 (기존 blobUrl revoke)
  "제출하기" → submitSpeaking(questionId, questionSetId, { hasRecording, recordingDurationSec })
                → result page 리다이렉트
```

### submitSpeaking 파라미터 변경

| 파라미터 | 타입 | 비고 |
|---|---|---|
| `questionId` | string | 기존과 동일 |
| `questionSetId` | string | 기존과 동일 |
| `meta?` | `SpeakingSubmitMeta` | **신규 optional** — hasRecording, recordingDurationSec |

- `meta`는 optional이므로 기존 호출처 영향 없음
- Supabase 저장 로직 변경 없음 (meta는 in-memory record에만 포함)
- audio_url은 여전히 null

### 기존 제출 흐름 영향

- `submitSpeaking` Server Action 시그니처: optional 파라미터 추가만 — 기존 호출은 모두 정상 동작
- mock store (`saveSpeakingEval`) 및 Supabase 저장 경로 변경 없음
- result page 읽기 경로 변경 없음
- 경로 `/student/speaking`, `/student/speaking/q-001`, `/student/speaking/q-001/result` 모두 유지

### 모바일 확인 방법

1. `npm run dev` 실행 후 개발 서버 URL 확인
2. 같은 네트워크의 모바일 기기에서 `http://<개발 PC IP>:3000/student/speaking/q-001?setId=qs-diagnostic-01` 접속
3. "준비 시작" → 카운트다운 → recording phase 진입 시 마이크 권한 팝업 확인
4. Android Chrome: MediaRecorder 정상 동작 확인
5. iOS Safari: MediaRecorder 지원 제한으로 오류 메시지 → mock fallback 동작 확인 (Known Issue)

### 테스트 결과

- `npm run lint` → 오류 없음 ✓
- `npx tsc --noEmit` → 오류 없음 ✓
- `npm run build` → 빌드 성공 ✓ (14개 라우트, 기존과 동일)

### Known Issues (Phase 7-B-main 기준)

| 이슈 | 영향 | 해소 예정 |
|---|---|---|
| **iOS Safari MediaRecorder 지원 제한** — iOS 14.3 이하에서 MediaRecorder 미지원, 일부 iOS 버전에서 `audio/webm` 미지원 | 중 | Phase 8-A 또는 iOS 전용 대안 검토 |
| **녹음 파일 서버 미업로드** — blobUrl은 브라우저 메모리에만 존재, 페이지 이탈 시 소멸 | 중 | Phase 8-B (Supabase Storage 연동) |
| **audio_url null** — Supabase `speaking_submissions.audio_url` 저장 안 됨 | 중 | Phase 8-B |
| **STT 미연동** — 실제 녹음 파일을 STT에 전달하지 않고 mock transcript 사용 | 중 | Phase 8-A |
| 기존 Phase 7-A-lite, 6-B5 known issues 모두 유지 | — | 해당 Phase 참고 |

### 다음 단계 제안 (Phase 8-A)

| 항목 | 내용 |
|---|---|
| **Phase 8-A** | ETRI 또는 Whisper STT 실제 API 최소 연동 — 녹음 Blob을 FormData로 서버 Route Handler에 전달 → STT 결과 반환. mock transcript 대체. |
| **Phase 8-B** | Supabase Storage 업로드 — 녹음 Blob을 presigned URL 또는 anon upload로 Storage에 저장, `audio_url` DB 업데이트 |
| **Phase 8-C** | iOS Safari 대응 — MediaRecorder 미지원 환경 감지 후 대안 안내 (녹음 없이 텍스트 입력 또는 외부 도구 안내) |

---

## Phase 7-A-lite — 학습자 화면 모바일 반응형 보완 (레이아웃 & 터치 타깃)

**날짜**: 2026-05-04  
**목표**: 학습자 화면에서 모바일(360px~767px) 환경의 기본 사용성 확보. 마이크 녹음·Supabase·Auth·API 구현 없음.

### 수정 파일

- `src/components/layout/sidebar.tsx` — 모바일 하단 내비게이션 추가
- `src/components/layout/app-shell.tsx` — 모바일 본문 패딩 조정
- `src/components/ui/button.tsx` — 터치 타깃 최소 높이 확보

### 모바일 보완 내용

#### 1. 모바일 하단 내비게이션 (`sidebar.tsx`)

- 기존 `<aside>`는 `hidden md:flex`로 데스크톱 전용 유지
- `md:hidden fixed bottom-0 inset-x-0 z-50` 하단 탭바 추가
  - 역할별 navItems를 탭으로 렌더링 (`flex-1`, `min-h-[44px]`)
  - 활성 탭: `text-primary-700 font-semibold`
  - disabled 탭: `opacity-40 cursor-not-allowed`
  - iOS safe-area 대응: `style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}`

#### 2. 본문 하단 여백 (`app-shell.tsx`)

- `p-6` → `p-4 pb-16 md:p-6`
  - 모바일에서 고정 하단 탭바(약 52px)에 본문 콘텐츠가 가려지지 않도록 `pb-16` 추가
  - 데스크톱(md 이상)은 `p-6`으로 기존 동작 유지

#### 3. 버튼 터치 타깃 (`button.tsx`)

- `size="md"`: `min-h-[44px]` 추가
- `size="lg"`: `min-h-[44px]` 추가
- `size="sm"`: 변경 없음 (인라인 보조 버튼 용도 유지)
- iOS HIG / Android Material 권장 터치 타깃 44px 기준 준수

### 확인 화면

| 화면 | 경로 | 상태 |
|---|---|---|
| 말하기 평가 목록 | `/student/speaking` | 정적 빌드 ○ |
| 말하기 평가 녹음 | `/student/speaking/q-001` | 동적 ƒ |
| 말하기 평가 결과 | `/student/speaking/q-001/result` | 동적 ƒ |
| 미션 대화 목록 | `/student/mission` | 정적 빌드 ○ |
| 미션 대화 진행 | `/student/mission/sc-restaurant-01` | 동적 ƒ |
| 미션 대화 결과 | `/student/mission/sc-restaurant-01/result` | 동적 ƒ |

### 테스트 결과

- `npm run lint` → 오류 없음 ✓
- `npx tsc --noEmit` → 오류 없음 ✓
- `npm run build` → 빌드 성공 ✓ (14개 라우트, 기존과 동일)

### Known Issues (Phase 7-A-lite 기준)

| 이슈 | 영향 | 해소 예정 |
|---|---|---|
| **모바일 녹음 미구현** — mock 제출만 동작 | 중 | Phase 7-B |
| **모바일 탭바 아이콘 없음** — 텍스트 레이블만 표시 | 낮 | Phase 7-A (full) |
| **말하기 녹음 UI 모바일 레이아웃 미세 조정 미완** — 320px에서 일부 버튼 잘릴 수 있음 | 낮 | Phase 7-A (full) |
| 기존 Phase 6-B5 known issues 모두 유지 | — | 해당 Phase 참고 |

---

## Phase 6-B5 — Supabase 저장 연동 점검 및 파일럿 출시판 문서화

**날짜**: 2026-05-04  
**목표**: Phase 6-B2~B4 완료 기준으로 Supabase 저장 연동 상태를 점검하고, 파일럿 출시판 기준의 현재 저장 흐름·known issue·다음 단계 계획을 문서화한다. 코드 변경 없음.

### 수정 파일

- `docs/spec/WORK_LOG.md` — Phase 6-B5 항목 추가 (이 문서)
- `docs/spec/PILOT_RELEASE_PLAN.md` — D+5 완료 상태 반영, Phase 6-B5 이후 D+10 방향 체크리스트 추가
- `docs/spec/SUPABASE_SCHEMA.md` — RLS 임시 disable 현황과 Phase 9 이후 재활성화 계획 보강

### Supabase 저장 연동 현황 (Phase 6-B5 기준)

#### 저장 성공 항목 (REPOSITORY_PROVIDER=supabase 기준)

| 테이블 | 저장 경로 | 구현 파일 | 완료 Phase |
|---|---|---|---|
| `speaking_submissions` | `/student/speaking/[questionId]` 제출 | `supabase-submission-repository.ts` | 6-B2 |
| `ai_evaluations` (speaking) | speaking 제출 시 함께 저장 | `supabase-submission-repository.ts` | 6-B2 |
| `teacher_reviews` | `/teacher/submissions/[id]` 채점 확정 | `supabase-teacher-review-repository.ts` | 6-B3 |
| `mission_submissions` | 미션 대화 완료·제출 시 | `supabase-mission-repository.ts` | 6-B4 |
| `ai_evaluations` (mission) | mission 제출 시 함께 저장 | `supabase-mission-repository.ts` | 6-B4 |

#### 전체 저장 흐름 요약

```
[말하기 평가 제출]
submitSpeaking(questionId, questionSetId)   ← Server Action
  ├─ [항상]    saveSpeakingEval()           → mock store (result 페이지 read 의존)
  └─ [supabase] SupabaseEvaluationRepository.saveSpeakingEvalRecord()
                  ├─ ensurePilotClass / ensurePilotStudent / ensureQuestion / ensureQuestionSet
                  ├─ INSERT speaking_submissions → DB UUID
                  └─ INSERT ai_evaluations (submission_type='speaking')

[교수자 채점 확정]
finalizeTeacherEvaluation(submissionId, ...)  ← Server Action
  ├─ [항상]    storeFinalize()              → mock store (page read 의존)
  └─ [supabase] SupabaseTeacherReviewRepository.finalizeReview()
                  ├─ _reviewIdCache hit   → UPDATE teacher_reviews
                  └─ _reviewIdCache miss  → INSERT teacher_reviews (submission_id: placeholder UUID)

[미션 대화 제출]
submitMission(sessionId)                      ← Server Action
  ├─ [항상]    saveMissionSubmission()        → mock store (result 페이지 read 의존)
  └─ [supabase] SupabaseMissionRepository.createMissionSubmission()
                  ├─ ensurePilotClass / ensurePilotStudent / ensureScenario
                  ├─ INSERT mission_submissions → DB UUID
                  └─ INSERT ai_evaluations (submission_type='mission')
```

#### mock fallback 유지 항목

- `REPOSITORY_PROVIDER=mock`(미설정 시 기본값)일 때 기존 mock 경로만 실행, DB 호출 없음
- Supabase 저장 실패 시: `console.error` 출력 후 화면은 mock store 기반으로 정상 표시
- result 페이지 URL은 여전히 mock submissionId 기반 (Supabase UUID와 미연결)

### Known Issues (Phase 6-B5 기준)

| 이슈 | 영향 | 해소 예정 |
|---|---|---|
| **RLS 임시 disable** — 모든 테이블 RLS 비활성화 상태 | 높 (데이터 보호 없음) | Phase 9 (Supabase Auth 도입 시) |
| **Auth 미구현** — pilot student / pilot class 고정 | 높 | Phase 9 |
| **음성 파일 저장 없음** — audio_url / duration_sec null | 중 | Phase 7-B (Storage 연동) |
| **mission result URL이 mock sessionId 기반** — Supabase UUID 미연결 | 중 | Phase 9 이후 read 경로 통합 시 |
| **teacher_reviews.submission_id placeholder UUID** — speaking_submissions와 미연결 | 중 | Phase 9 (실제 submission_id 매핑) |
| **teacher 제출 목록 미 DB화** — `/teacher/submissions` 목록이 mock data.ts 직독 | 중 | Phase 6-C 또는 Phase 9 |
| **관리자 대시보드 mock 중심** — Supabase 집계 미구현 | 낮 | Phase 9+ |
| **세션 서버 재시작 소실** — MissionSession / SpeakingEvalRecord in-memory | 중 | Phase 9+ |
| **Bootstrap race condition** — pilot class/student 동시 중복 insert 가능 | 낮 | Phase 9 (Auth 후 자연 해소) |
| **iOS 모바일 녹음 미구현** — mock 녹음 fallback 사용 | 중 | Phase 7-B |
| **ai_evaluation_id null** — teacher_reviews의 ai_evaluation_id가 null 저장 | 중 | Phase 9 (UUID 매핑 구조 추가 시) |

### 다음 단계 계획 (D+10 방향)

| Phase | 날짜 목표 | 핵심 작업 |
|---|---|---|
| **Phase 7-A** | D+6~7 | 학습자 화면 반응형 UI 보완 (360px, 모바일 사이드바) |
| **Phase 7-B** | D+7~9 | 브라우저 마이크 녹음 최소 구현 (MediaRecorder, 권한 처리) |
| **Phase 8-A** | D+10 | ETRI 또는 Whisper STT 실제 API 최소 연동 |
| **Phase 9** | D+12+ | Supabase Auth / 역할 분기 / RLS 정책 활성화 |
| **Phase 10** | D+13+ | Vercel 배포 |
| **Phase 11** | D+14~15 | 파일럿 테스트 준비, 기기별 수동 테스트 |

### D+5 달성 여부 체크리스트

- [x] `speaking_submissions` Supabase 저장 성공 (Phase 6-B2)
- [x] `ai_evaluations` (speaking) Supabase 저장 성공 (Phase 6-B2)
- [x] `teacher_reviews` Supabase 저장 성공 (Phase 6-B3)
- [x] `mission_submissions` Supabase 저장 성공 (Phase 6-B4)
- [x] `ai_evaluations` (mission) Supabase 저장 성공 (Phase 6-B4)
- [x] `REPOSITORY_PROVIDER=supabase`로 전환 시 모든 핵심 write 경로 DB 저장 동작
- [x] `REPOSITORY_PROVIDER=mock` 기존 동작 완전 유지
- [x] 저장 실패 시 화면 중단 없는 graceful degradation
- [x] 각 단계별 lint / tsc / build 통과
- [ ] RLS 기본 정책 설정 — Phase 9(Auth 도입)으로 연기 (파일럿 단계에서 임시 disable 허용)
- [ ] 교수자 제출 목록 DB 기반 조회 — Phase 6-C 또는 Phase 9로 연기

**D+5 핵심 목표 달성**: 모든 핵심 write 경로(말하기 제출·AI 평가·교수자 채점·미션 제출) Supabase DB 저장 연동 완료.

### 테스트 결과

- `npm run lint` → 오류 없음 ✓ (문서 전용 Phase, 코드 변경 없음)
- `npx tsc --noEmit` → 오류 없음 ✓
- `npm run build` → 빌드 성공 ✓ (14개 라우트, 기존과 동일)

---

## Phase 6-B4 — 학습자 미션 대화 Supabase 저장 연동

**날짜**: 2026-05-04  
**목표**: 학습자가 미션 대화를 완료·제출했을 때 Supabase `mission_submissions` + `ai_evaluations` 테이블에 저장. REPOSITORY_PROVIDER=mock 기존 동작 완전 유지.

### 생성 파일

- `src/lib/repositories/supabase-mission-repository.ts` — `SupabaseMissionRepository` 구현체.
  - 세션 관리(`createSession` / `getSession` / `updateSession` / `getMissionSubmission`)는 in-memory mock store 위임 (세션은 여전히 임시 메모리 저장).
  - `createMissionSubmission`: `ensurePilotClass` → `ensurePilotStudent` → `ensureScenario` 순서로 FK 앵커 보장 후 `mission_submissions` INSERT → `ai_evaluations` INSERT.
  - 실패 시 throw 없이 `console.error('[supabase] mission_submission save failed')` 출력 후 early return.
  - 성공 시 `console.info('[supabase] mission_submission saved: <uuid>')` 출력.

### 수정 파일

- `src/lib/repositories/index.ts`
  - `SupabaseMissionRepository` import 추가.
  - `getMissionRepository()` — REPOSITORY_PROVIDER=supabase일 때 `SupabaseMissionRepository` 반환.
  - 더 이상 사용되지 않는 `warnNotImplemented` 함수·`_notImplementedWarned` Set 제거 (모든 repository에 Supabase 구현체 완비됨).
- `app/student/mission/actions.ts`
  - `getMissionRepository` import 추가.
  - `submitMission` — mock store 항상 먼저 기록(`saveMissionSubmission`) + REPOSITORY_PROVIDER=supabase일 때 `getMissionRepository().createMissionSubmission(submission)` 추가 시도. 실패 시 repository 내부에서 처리. .env.local 값 절대 미출력.
- `docs/spec/WORK_LOG.md` — Phase 6-B4 항목 추가.

### mission_submissions 저장 흐름

```
submitMission(sessionId)   ← Server Action (mission-client.tsx)
  │
  ├─ [항상] saveMissionSubmission(submission)      → mock store (result page read path 의존)
  │
  └─ [REPOSITORY_PROVIDER=supabase일 때만]
       getMissionRepository()                       → SupabaseMissionRepository
         └─ createMissionSubmission(submission)
              ├─ ensurePilotClass()                → classes 테이블 select-or-insert
              ├─ ensurePilotStudent(classId)        → students 테이블 select-or-insert
              ├─ ensureScenario(scenarioId)          → mission_scenarios 테이블 upsert (JSON 시드)
              ├─ INSERT mission_submissions          → DB UUID 획득
              │   console.info '[supabase] mission_submission saved: <uuid>'
              └─ INSERT ai_evaluations              → submission_type='mission', scores JSONB에 평가 전체 포함
```

### 파일럿 컨텍스트 bootstrap 전략

- 기존 `supabase-submission-repository.ts`와 동일한 패턴: PILOT_CLASS_NAME / PILOT_STUDENT_ANON_ID 고정.
- module-level 캐시 변수 (`_pilotClassId`, `_pilotStudentId`, `_seededScenarioIds`) 독립 유지.
- `mission_scenarios` FK: `mission-goals.json`에서 직접 upsert. onConflict: 'id' (text PK이므로 멱등).

### ai_evaluations 저장 내용 (mission)

| 컬럼 | 값 |
|---|---|
| `submission_id` | mission_submissions UUID |
| `submission_type` | `'mission'` |
| `scores` (jsonb) | `{ missionAchievementRate, taskCompletion, conversationNaturalness, expressionAppropriateness, strengths, improvements, metadata: { source: 'pilot', mockSubmissionId } }` |
| `total_score` | `evaluation.overallScore` |
| `normalized_score` | `evaluation.overallScore / 100` |
| `feedback` | `'강점: ... | 보완: ...'` |
| `provider_name` | `'mock'` |
| `evaluated_at` | `evaluation.evaluatedAt` |

### REPOSITORY_PROVIDER=mock일 때 영향

**영향 없음.** Supabase 저장 블록은 `process.env.REPOSITORY_PROVIDER === 'supabase'` 조건으로 완전 분기. mock 모드에서는 기존 `saveMissionSubmission()` 경로만 실행.

### REPOSITORY_PROVIDER=supabase 전환 후 테스트 방법

1. `.env.local`에서 `REPOSITORY_PROVIDER=supabase` 확인 (SUPABASE URL/KEY 설정 완료 전제)
2. `npm run dev` 실행
3. `/student/mission/sc-restaurant-01` 접속 → 대화 완료 → "결과 보기" 버튼 클릭
4. 서버 콘솔에서 확인:
   ```
   [supabase] mission_submission saved: <uuid>
   ```
5. Supabase Dashboard → Table Editor → `mission_submissions` 에서 새 row 확인:
   - `scenario_id: 'sc-restaurant-01'`
   - `status: 'submitted'`
   - `turns` JSONB에 대화 전체 기록 확인
   - `goals` JSONB에 목표 달성 여부 확인
6. `ai_evaluations` → `submission_type='mission'` row 확인:
   - `total_score`, `scores` JSONB에 평가 결과 확인

### 테스트 결과

- `npm run lint` → 오류 없음 ✓
- `npx tsc --noEmit` → 오류 없음 ✓
- `npm run build` → 빌드 성공 ✓ (14개 라우트, 기존과 동일)

### Known Issues

1. **세션 미저장**: `createSession` / `updateSession` 은 여전히 mock store에만 저장. 서버 재시작 시 진행 중 세션 소실. Phase 9+에서 Supabase로 교체 예정.
2. **result URL mock ID 사용**: Supabase UUID 대신 mock submissionId(`mission-sub-sc-restaurant-01-...`)가 result URL에 사용됨. result 페이지가 mock store에서 읽어야 실제 평가 결과가 보이므로, Supabase UUID로 교체하려면 result 페이지에 Supabase read 경로 추가 필요.
3. **파일럿 student/class 단일 고정**: Auth 미구현으로 모든 미션 제출이 동일한 pilot student에 귀속됨. Phase 7(Auth) 후 교체 필요.
4. **pilot 캐시 중복**: `supabase-submission-repository.ts`와 독립된 module-level 캐시 유지. 서버 재시작 시 두 모듈 모두 pilot class/student 재조회. 기능 동작에 영향 없음.

### 다음 단계 제안 (Phase 6-C 또는 7-A)

1. Teacher 제출 목록에서 미션 제출을 Supabase DB에서 읽어오는 read 경로 구현
2. Supabase Auth 연동으로 실제 student_id 사용
3. mission result 페이지에 Supabase read 경로 추가 (UUID 기반 URL 지원)

---

## Phase 6-B3 — 교수자 채점 Supabase 저장 연동

**날짜**: 2026-05-04  
**목표**: 교수자가 채점 상세 화면에서 루브릭 점수·피드백을 확정했을 때 Supabase `teacher_reviews` 테이블에 저장. REPOSITORY_PROVIDER=mock 기존 동작 완전 유지.

### 생성 파일

- `src/lib/repositories/supabase-teacher-review-repository.ts` — `SupabaseTeacherReviewRepository` 구현체. `saveDraft` / `finalizeReview` → `teacher_reviews` INSERT or UPDATE. 실패 시 throw (caller가 catch). 모든 에러는 secrets 없이 로그.

### 수정 파일

- `src/lib/repositories/index.ts` — `getTeacherReviewRepository()` 에서 REPOSITORY_PROVIDER=supabase일 때 `SupabaseTeacherReviewRepository` 반환. `SupabaseTeacherReviewRepository` import 추가. `warnNotImplemented('TeacherReviewRepository')` 제거.
- `app/teacher/submissions/[id]/actions.ts` — `saveTeacherDraft` / `finalizeTeacherEvaluation` 모두: mock store 항상 먼저 기록 + REPOSITORY_PROVIDER=supabase일 때 `getTeacherReviewRepository()` 로 Supabase 저장 시도. 성공 시 `[supabase] teacher_review saved: <uuid>`, 실패 시 `[supabase] teacher_review save failed` 출력. .env.local 값 절대 미출력.
- `docs/spec/WORK_LOG.md` — Phase 6-B3 항목 추가.

### teacher_reviews 저장 흐름 요약

```
finalizeTeacherEvaluation(submissionId, aiEvaluationId, draft)   ← Server Action (grading-wizard.tsx)
  │
  ├─ [항상] storeFinalize(...)         → mock store (page read path 의존)
  │
  └─ [REPOSITORY_PROVIDER=supabase일 때만]
       getTeacherReviewRepository()     → SupabaseTeacherReviewRepository
         └─ finalizeReview(...)
              ├─ _reviewIdCache.get(submissionId)
              │   ├─ hit  → UPDATE teacher_reviews SET ... WHERE id = <cached>
              │   └─ miss → INSERT teacher_reviews (submission_id: randomUUID(), ...)
              │              _reviewIdCache.set(submissionId, row.id)
              └─ return TeacherEvaluation
```

### Upsert 전략 (unique constraint 없는 테이블)

`teacher_reviews`에 (submission_id, teacher_id) unique constraint가 없으므로 DB 레벨 upsert 불가.  
대신 module-level `_reviewIdCache: Map<mockSubmissionId, dbReviewId>` 로 서버 프로세스 내 row UUID를 캐시:
- 최초 write → INSERT → row.id 캐시
- 이후 write → UPDATE WHERE id = cached

캐시는 서버 재시작 시 초기화됨 → 재시작 후 같은 제출에 대한 새 INSERT 발생. 파일럿 단계에서 허용.

### submission_id 처리

`teacher_reviews.submission_id`는 `uuid NOT NULL`이지만 **FK constraint 없음**.  
Mock submission ID(sub-001 등)는 UUID가 아니므로, INSERT 시 `randomUUID()`로 생성한 placeholder UUID를 사용.  
이 UUID는 `speaking_submissions` 테이블과 연결되지 않음 — 파일럿 Known Issue.

### REPOSITORY_PROVIDER=mock일 때 영향

**영향 없음.** Supabase 저장 블록은 `process.env.REPOSITORY_PROVIDER === 'supabase'` 조건으로 완전 분기. mock 모드에서는 `storeSaveDraft` / `storeFinalize` 직접 호출만 실행.

### REPOSITORY_PROVIDER=supabase 전환 후 테스트 방법

1. `.env.local`에서 `REPOSITORY_PROVIDER=supabase` 확인 (SUPABASE URL/KEY 설정 완료 전제)
2. `npm run dev` 실행
3. `/teacher/submissions/sub-002` 접속 → 루브릭 점수 조정 → "최종 확정 ✓" 버튼 클릭
4. 서버 콘솔에서 확인:
   ```
   [supabase] teacher_review saved: <uuid>
   ```
5. Supabase Dashboard → Table Editor → `teacher_reviews` 에서 새 row 확인:
   - `is_finalized: true`, `finalized_at` 기록됨
   - `scores` JSONB에 루브릭별 점수 확인
6. sub-001 (이미 teacher_reviewed 상태)에서도 확정 가능 — 두 번째 클릭 시 UPDATE 확인
7. sub-003 (finalized) → 위저드가 readonly — 저장 시도 없음

### 테스트 결과

- `npm run lint` → 오류 없음 ✓
- `npx tsc --noEmit` → 오류 없음 ✓
- `npm run build` → 빌드 성공 ✓ (14개 라우트, 기존과 동일)

### Known Issues

1. **submission_id UUID ↔ mock ID 불일치**: `teacher_reviews.submission_id`는 placeholder UUID. `speaking_submissions` 테이블과 연결되지 않음. Phase 7(Auth + 실제 제출 흐름 통합) 후 교체 필요.
2. **ai_evaluation_id null**: Mock AI eval ID가 Supabase ai_evaluations에 없으므로 null 저장. Phase 6-B2로 생성된 실제 AI eval UUID를 연결하려면 별도 매핑 구조 필요.
3. **캐시 휘발성**: 서버 재시작 시 `_reviewIdCache` 초기화 → 같은 mock submission에 대한 새 INSERT. 구DB row는 잔류. 파일럿 수용 범위.
4. **saveTeacherDraft UI 미연결**: actions.ts에 구현됐으나 현재 grading-wizard.tsx가 호출하지 않음 (초안 저장 버튼 없음). finalizeTeacherEvaluation만 실제 동작.

### 다음 단계 제안 (Phase 6-B4)

1. `mission_submissions` / `MissionRepository` Supabase 구현 (`SupabaseMissionRepository`)
2. Teacher 제출 목록을 Supabase에서 읽어오는 read 경로 구현 (현재는 mock data.ts 직독)

---

## Phase 6-B2 — 말하기 평가 Supabase 저장 연동

**날짜**: 2026-05-04  
**목표**: 학습자 말하기 평가 제출 결과를 Supabase `speaking_submissions` + `ai_evaluations`에 저장하는 최소 연동 구현. REPOSITORY_PROVIDER=mock 기존 동작 완전 유지.

### 생성 파일

- `src/lib/repositories/supabase-submission-repository.ts` — `SupabaseSubmissionRepository` + `SupabaseEvaluationRepository` 구현체. 파일럿 class/student 자동 bootstrap, question/question_set 콘텐츠 시드, speaking_submissions + ai_evaluations insert. 오류 발생 시 console.error 후 early return (화면 중단 없음).

### 수정 파일

- `src/lib/repositories/index.ts` — `getSubmissionRepository()` / `getEvaluationRepository()` 에서 REPOSITORY_PROVIDER=supabase일 때 Supabase 구현체 반환. `warnNotImplemented` 호출 제거 (6-B3+만 유지).
- `app/student/speaking/actions.ts` — `saveSpeakingEval()` 직접 호출 유지 (result page 의존) + REPOSITORY_PROVIDER=supabase일 때만 `evalRepo.saveSpeakingEvalRecord(record)` 추가 시도. 실패 시 console.error 후 `{ submissionId }` 정상 반환.
- `docs/spec/WORK_LOG.md` — Phase 6-B2 항목 추가.

### Supabase 저장 흐름 요약

```
submitSpeaking(questionId, questionSetId)   ← Server Action
  │
  ├─ [항상] saveSpeakingEval(record)         → mock store (result page용)
  │
  └─ [REPOSITORY_PROVIDER=supabase일 때만]
       SupabaseEvaluationRepository.saveSpeakingEvalRecord(record)
         │
         ├─ ensurePilotClass()               → classes 테이블 upsert/select
         ├─ ensurePilotStudent(classId)       → students 테이블 upsert/select
         ├─ ensureQuestionSet(questionSetId)  → question_sets 테이블 upsert (JSON 시드)
         ├─ ensureQuestion(questionId)        → questions 테이블 upsert (JSON 시드)
         ├─ INSERT speaking_submissions       → DB UUID 획득
         └─ INSERT ai_evaluations            → submission_id = DB UUID
```

### 파일럿 컨텍스트 bootstrap 전략

Auth 미구현 단계에서 `speaking_submissions.student_id` / `class_id` (UUID NOT NULL FK) 제약을 충족하기 위해:
- "Pilot Class (Phase 6-B)" 이름의 class를 최초 1회 insert → UUID 캐시
- "PILOT-S-001" anonymous_id의 student를 최초 1회 insert → UUID 캐시
- 캐시는 module-level 변수 (서버 재시작 시 초기화 → 자동 재bootstrap)
- `questions`, `question_sets`는 JSON에서 `upsert onConflict: 'id'` (text PK이므로 중복 안전)

### TypeScript 이슈 및 해결

**이슈**: Supabase v2.105.1에서 `createClient()` (Database 타입 미제공) 사용 시 TypeScript가 `Schema = never`로 추론하여 `.from().insert()` 호출이 컴파일 오류 발생.

**해결**: `function db(client) { return client as any }` 헬퍼를 파일 내부에 정의하고 모든 `.from()` 호출에 사용. ESLint `@typescript-eslint/no-explicit-any` 주석으로 명시적으로 억제. 런타임 동작은 정확하며 타입 강제만 우회.

### REPOSITORY_PROVIDER=mock일 때 영향

**영향 없음.** `actions.ts`의 Supabase 시도 블록은 `process.env.REPOSITORY_PROVIDER === 'supabase'` 조건으로 완전히 분기됨. mock 모드에서는 기존 `saveSpeakingEval()` 경로만 실행되며 코드 경로 변경 없음.

### REPOSITORY_PROVIDER=supabase 전환 후 테스트 방법

1. `.env.local`에서 `REPOSITORY_PROVIDER=supabase` 설정 (SUPABASE URL/KEY는 이미 입력됨)
2. `npm run dev` 실행
3. `/student/speaking/q-001?setId=qs-diagnostic-01` 접속 → 제출 버튼 클릭
4. 서버 콘솔에서 확인:
   ```
   [supabase] speaking_submission saved: <uuid> (mock ref: mock-q-001-...)
   [supabase] ai_evaluation saved: <uuid>
   ```
5. Supabase Dashboard → Table Editor → `speaking_submissions` / `ai_evaluations` 에서 새 row 확인
6. 결과 페이지 `/student/speaking/q-001/result?sub=mock-q-001-...`가 정상 렌더링되는지 확인

### 테스트 결과

- `npm run lint` → 오류 없음 ✓
- `npx tsc --noEmit` → 오류 없음 ✓
- `npm run build` → 빌드 성공 ✓ (14개 라우트, 기존과 동일)

### Known Issues

1. **파일럿 student/class 단일 고정**: Auth 미구현으로 모든 제출이 동일한 pilot student에 귀속됨. Phase 7(Auth) 구현 후 실제 student_id로 교체 필요.
2. **audio_url/duration_sec null**: mock 제출이므로 실제 음성 파일 없음. Storage 연동(Phase 7+) 후 채울 수 있음.
3. **ai_evaluations.submission_id non-FK**: 스키마에서 `submission_id`는 UUID 타입이지만 FK 제약 없음. 따라서 `saveSpeakingEvalRecord`에서 DB UUID를 정확히 넘겨줘야 데이터 일관성 유지됨 (구현 완료).
4. **Bootstrap race condition**: 동시 요청 시 pilot class/student가 중복 insert될 수 있음. 클래스 이름 unique constraint가 없어 다수의 pilot class가 생길 수 있으나, `.limit(1)` select로 첫 번째 row를 항상 사용하므로 기능 동작에는 영향 없음.

### 다음 단계 제안 (Phase 6-B3)

1. `teacher_reviews` 저장 구현 (`SupabaseTeacherReviewRepository`)
2. `/teacher/submissions/[id]` 채점 확정 시 Supabase에도 저장
3. `speaking_submissions` 목록 read 구현 (teacher dashboard에서 DB 기반 조회)

---

## Phase 6-B1 — Supabase 클라이언트 초기화 및 Provider 선택 구조

**날짜**: 2026-05-04  
**목표**: `@supabase/supabase-js` 설치, Supabase 클라이언트 안전 초기화, `REPOSITORY_PROVIDER` 분기 구조 완성. 실제 DB 호출 없음. mock fallback 완전 유지.

### 생성 파일

- `src/lib/supabase/client.ts` — Supabase 클라이언트 싱글턴. `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` 미설정 시 `null` 반환. 앱 즉시 종료 없음.
- `.env.local.example` — 환경변수 키 이름만 기재. 값 없음. `.env.local` 설정 가이드용.

### 수정 파일

- `src/lib/repositories/index.ts` — `getSupabaseClient()` import 추가. `resolvedProvider()` 함수로 `REPOSITORY_PROVIDER` 환경변수 + Supabase 클라이언트 가용성 동시 판별. Phase 6-B2~4 구현 전까지 `'supabase'` 선택 시 console.warn 후 mock fallback. 기존 6개 factory 함수 시그니처·반환 타입 변경 없음.
- `package.json` — `@supabase/supabase-js: ^2.105.1` dependencies 추가 (npm install 자동 기재).

### Provider 분기 동작 요약

| REPOSITORY_PROVIDER | Supabase env 설정 | 동작 |
|---|---|---|
| `mock` (기본값) | 무관 | Mock 구현체 반환 (기존 동작 그대로) |
| `supabase` | 미설정 | console.warn 후 Mock fallback |
| `supabase` | 설정됨 | console.warn(미구현) 후 Mock fallback (Phase 6-B2+ 전까지) |

### 환경변수 정리 (.env.local.example 기준)

```
NEXT_PUBLIC_SUPABASE_URL=       # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase anon (public) key
REPOSITORY_PROVIDER=mock        # mock | supabase (기본값: mock)
STT_PROVIDER=mock
TTS_PROVIDER=mock
PRONUNCIATION_PROVIDER=mock
LLM_EVAL_PROVIDER=mock
```

### 설계 원칙

- `REPOSITORY_PROVIDER` 기본값 없음 → 환경변수 미설정 시 `process.env.REPOSITORY_PROVIDER !== 'supabase'` 조건으로 mock 선택됨
- `getSupabaseClient()` 는 모듈 레벨 싱글턴. 같은 process 내에서 최초 1회만 생성. 개발 서버 재시작 시 초기화.
- `warnNotImplemented()` 는 repository 이름별로 최초 1회만 경고 출력 (`Set<string>` 기반 dedup)
- 기존 Server Action, Server Component, Client Component 전부 수정 없음

### 테스트 결과

- `npm run lint` → 오류 없음 ✓
- `npx tsc --noEmit` → 오류 없음 ✓
- `npm run build` → 빌드 성공 ✓ (14개 라우트, 기존과 동일)

### 다음 단계 (Phase 6-B2)

1. Supabase Dashboard에서 `docs/spec/SUPABASE_SCHEMA.sql` 실행
2. 임시 RLS 정책 적용 (speaking_submissions, ai_evaluations)
3. `src/lib/repositories/supabase-submission-repository.ts` 구현
4. `src/lib/repositories/index.ts` — `getSubmissionRepository()` / `getEvaluationRepository()` Supabase 분기 활성화

---

## Phase 6-A — Supabase 저장소 추상화 (Database Schema & Repository Abstraction)

**날짜**: 2026-05-04  
**목표**: 기존 mock MVP를 깨지 않고, Supabase 저장 연동을 위한 DB 스키마와 저장소 추상화 구조를 설계. 실제 DB 연결·API 호출 없음. 다음 Phase에서 repository 선택 방식으로 안전하게 교체 가능하도록 준비.

### 생성 파일

**타입 (`src/types/`)**
- `src/types/db.ts` — Supabase 테이블 컬럼과 1:1 대응하는 DB Row 타입 11종 (snake_case). ClassRow, StudentRow, QuestionRow, QuestionSetRow, SpeakingSubmissionRow, MissionScenarioRow, MissionSubmissionRow, AIEvaluationRow, TeacherReviewRow, ProviderEventRow, ContentVersionRow.

**Repository 인터페이스 + Mock 구현 (`src/lib/repositories/`)**
- `src/lib/repositories/types.ts` — 6개 Repository 인터페이스 (SubmissionRepository, EvaluationRepository, TeacherReviewRepository, MissionRepository, StudentRepository, ClassRepository) + 입력/필터 타입 (SubmissionFilter, CreateSpeakingSubmissionInput, CreateAIEvaluationInput, SpeakingEvalRecord).
- `src/lib/repositories/mock-repository.ts` — 기존 mock store들을 repository 인터페이스로 wrapping하는 6개 Mock 구현체. 기존 store 파일 미수정. 서버 재시작 시 초기화되는 신규 제출 저장용 module-level Map 추가.
- `src/lib/repositories/index.ts` — Repository 팩토리 함수 6종 (getSubmissionRepository, getEvaluationRepository, getTeacherReviewRepository, getMissionRepository, getStudentRepository, getClassRepository). Phase 6-B에서 `REPOSITORY_PROVIDER=supabase` 환경변수로 교체 가능하도록 설계.

**스펙 문서 (`docs/spec/`)**
- `docs/spec/SUPABASE_SCHEMA.md` — 11개 테이블 스키마 설계서. 컬럼/타입/인덱스/JSONB 사유/mock 데이터 매핑/환경변수/RLS 방침/마이그레이션 전략 포함.
- `docs/spec/SUPABASE_SCHEMA.sql` — 실행 가능한 PostgreSQL DDL. CREATE TABLE + INDEX + RLS (주석 처리, Phase 6-B에서 활성화).
- `docs/spec/PILOT_RELEASE_PLAN.md` — 15일 파일럿 출시 계획. D+3/D+5/D+10/D+15 마일스톤, 포함/제외 기능, known issue, 파일럿 주의사항, 지원 기기 기준(학습자·교수자·관리자), 반응형 UI 점검 체크리스트(360px~1280px), 모바일 마이크 녹음 테스트 체크리스트(Android·iOS·Windows), 파일럿 출시 전 필수 기기 테스트 목록, 이후 Phase 제안(7-A/7-B/8-A/8-B) 포함.

### 수정 파일

- `docs/spec/WORK_LOG.md` — Phase 6-A 항목 추가 및 PILOT_RELEASE_PLAN.md 설명 업데이트

### 설계 원칙

- **기존 파일 무수정**: `src/lib/mock/` 하위 4개 store 파일, 모든 `app/` 라우트 파일 완전 보존
- **Provider 교체 방식**: 팩토리 함수에서 구현체 선택 → 기존 화면은 수정 없이 다음 Phase에서 교체 가능
- **구조적 회귀 방지**: 신규 파일 7개 추가만 발생, 기존 import 경로 미변경

### 테이블 목록

| 테이블 | 설명 |
|---|---|
| `classes` | 수업 반 |
| `students` | 학생 (익명 ID 포함) |
| `question_sets` | 문항 세트 |
| `questions` | 개별 문항 |
| `speaking_submissions` | 말하기 평가 제출 |
| `mission_scenarios` | 미션 시나리오 콘텐츠 |
| `mission_submissions` | 미션 대화 제출 |
| `ai_evaluations` | AI 평가 결과 (말하기+미션 공용) |
| `teacher_reviews` | 교수자 채점 결과 |
| `provider_events` | API 호출 로그 |
| `content_versions` | 콘텐츠 변경 이력 |

### Repository 인터페이스 요약

```
SubmissionRepository     listSubmissions / getSubmissionById / createSpeakingSubmission / updateSubmissionStatus
EvaluationRepository     getAIEvaluation / saveAIEvaluation / getSpeakingEvalRecord / saveSpeakingEvalRecord
TeacherReviewRepository  getTeacherReview / saveDraft / finalizeReview / getStatusOverride
MissionRepository        createSession / getSession / updateSession / createMissionSubmission / getMissionSubmission
StudentRepository        listStudents / getStudentById
ClassRepository          listClasses / getClassById
```

### 테스트 결과

- `npm run lint` → 오류 없음 ✓
- `npx tsc --noEmit` → 오류 없음 ✓
- `npm run build` → 빌드 성공 ✓

### 다음 단계 (Phase 6-B)

1. `@supabase/supabase-js` 설치
2. Supabase 클라이언트 초기화 파일 (`src/lib/supabase/client.ts`)
3. `SUPABASE_SCHEMA.sql` Supabase Dashboard에서 실행
4. SupabaseSubmissionRepository 구현 (speaking_submissions 저장부터 시작)
5. `REPOSITORY_PROVIDER=supabase` 환경변수 설정 + 기존 페이지 repository 전환

---

## Phase 5 — 교수자 채점 UI (Teacher Grading UI)

**날짜**: 2026-05-04
**목표**: 교수자 제출 목록 화면(`/teacher/submissions`)과 3단 채점 위저드(`/teacher/submissions/[id]`) 구현. mock 데이터·모듈 레벨 스토어만 사용. 실제 DB·API 연동 없음.

### 생성 파일

**타입 (`src/types/`)**
- `src/types/grading.ts` — `GradingWizardData`, `TeacherEvalDraft`, `RubricItemScore` 3종

**Mock 스토어 (`src/lib/mock/`)**
- `src/lib/mock/teacher-grading-store.ts` — 교수자 평가 초안·확정 메모리 스토어 (`getDraft`, `saveDraft`, `finalize`, `getStatusOverride`)

**제출 목록 페이지 (`app/teacher/submissions/`)**
- `app/teacher/submissions/page.tsx` — Server Component: mock 데이터 조합 → `TeacherSubmissionRow[]` 생성, `SubmissionsClient`에 전달. `getStatusOverride`로 서버 내 채점 확정 상태 반영. `force-dynamic` 설정.
- `app/teacher/submissions/submissions-client.tsx` — Client Component: 반·모국어·어권·유형·위험도·상태 6종 필터(AND 조건), StatCard 4개(전체·채점 대기·확정·평균 점수), 주의 학생 경고 배너, `TeacherSubmissionsTable` 렌더링.

**채점 위저드 (`app/teacher/submissions/[id]/`)**
- `app/teacher/submissions/[id]/page.tsx` — Server Component: submission·student·class·aiEval·riskFlag·rubricItems·question 조합 → `GradingWizardData` 전달. 404 처리 포함.
- `app/teacher/submissions/[id]/grading-wizard.tsx` — Client Component: 3단 위저드 상태 머신(1단계 보기→2단계 점수 조정→3단계 확정), `useTransition` + Server Action 연결.
- `app/teacher/submissions/[id]/wizard-step-indicator.tsx` — 진행 단계 표시 컴포넌트 (완료·활성·대기 시각화).
- `app/teacher/submissions/[id]/step-submission-view.tsx` — 1단계: 학생 정보·제출 정보·문항 내용·STT 전사문·AI 평가 요약·오류 태그·위험도 사유 표시.
- `app/teacher/submissions/[id]/step-rubric-adjust.tsx` — 2단계: 루브릭별 AI 점수 대비 교수자 점수 입력 테이블, 변동량(±delta) 색상 표시, 조정 이유 태그 선택, 내부 메모 입력.
- `app/teacher/submissions/[id]/step-final-feedback.tsx` — 3단계: 최종 점수 비교(AI vs 교수자), 학습자 공개 피드백·강점·보완점·다음 추천 활동 입력, 확정 버튼. 확정 후 readonly 전환.
- `app/teacher/submissions/[id]/actions.ts` — Server Action: `saveTeacherDraft`, `finalizeTeacherEvaluation`. mock 스토어 직접 호출.

### 수정 파일

**타입 (`src/types/`)**
- `src/types/data.ts` — `TeacherEvaluation`에 `strengths?`, `improvements?`, `nextActivity?` 3개 optional 필드 추가.

**테이블 컴포넌트 (`app/teacher/`)**
- `app/teacher/submissions-table.tsx` — `TeacherSubmissionRow` 타입에 `nativeLanguage: string` 추가. `studentName` 열에 `/teacher/submissions/[id]` Link 추가.
- `app/teacher/page.tsx` — 대시보드 row 빌드 시 `nativeLanguage` 필드 추가.

**채점 상세 페이지**
- `app/teacher/submissions/[id]/page.tsx` — `questionsJson.find()` 결과를 `Question` 타입으로 캐스팅하여 TS 오류 수정.

### 라우팅 구조

| 경로 | 렌더링 | 설명 |
|------|--------|------|
| `/teacher/submissions` | Dynamic | 제출 목록 (6종 필터, 통계 요약) |
| `/teacher/submissions/[id]` | Dynamic | 3단 채점 위저드 |

### 데이터 플로우

```
/teacher/submissions
  → Server: mockSubmissions × mockStudents × mockAIEvaluations × getStatusOverride()
  → SubmissionsClient: 6종 필터 (useMemo, AND 조건)
  → TeacherSubmissionsTable: 학생명 → Link('/teacher/submissions/[id]')

/teacher/submissions/[id]
  → Server: GradingWizardData 조합 (submission·student·class·aiEval·riskFlag·rubricItems·question)
  → GradingWizard (client): 3단 상태 머신
      Step 1: 제출물·AI 평가 확인
      Step 2: 루브릭 점수 조정 + 이유 선택 + 메모
      Step 3: 최종 점수 확인 + 피드백 작성 → finalizeTeacherEvaluation (Server Action)
```

### 설계 메모

- 스토어는 모듈 레벨 Map으로 서버 재시작 시 초기화. Phase 9에서 Supabase로 교체 예정.
- `force-dynamic`: `getStatusOverride` 호출로 인해 SSR 강제. 스토어 갱신이 목록에 즉시 반영됨.
- `questionsJson` → `Question` 타입 캐스팅: JSON 파일 내 `difficulty`가 `string` 타입으로 추론되어 union 불일치 발생. `as Question` 캐스팅으로 해소.
- 6종 필터는 모두 클라이언트 사이드 AND 필터 (`useMemo`). 서버 API 호출 없음.
- 채점 확정 후: 입력 필드 `readOnly`, 버튼 비활성화, "채점 확정 완료" 배지 표시.

### 테스트 결과

- `npm run lint` → 오류 없음 ✓
- `npx tsc --noEmit` → 오류 없음 ✓
- `npm run build` → 빌드 성공 ✓ (11개 라우트, `/teacher/submissions` · `/teacher/submissions/[id]` 신규)

### 브라우저 테스트 주소 (npm run dev 후)

- `/teacher/submissions` — 제출 목록 (6종 필터, 채점 대기 배너)
- `/teacher/submissions/sub-001` — teacher_reviewed 상태 채점 위저드 (기존 초안 존재)
- `/teacher/submissions/sub-002` — ai_evaluated 상태 채점 위저드 (AI 평가 완료, 미채점)
- `/teacher/submissions/sub-003` — finalized 상태 채점 위저드 (확정 완료, readonly)

---

## Phase 3 — 학습자 말하기 평가 플로우 (Speaking Assessment Flow)

**날짜**: 2026-05-04
**목표**: 학습자가 평가 세트/문항을 선택하고, 준비 단계를 거쳐 mock 녹음 제출, AI 평가 결과까지 확인하는 전체 플로우 구현. mock provider + 모듈 레벨 메모리 스토어만 사용. 실제 녹음·STT·DB 연동 없음.

### 생성 파일

**Mock 스토어 (`src/lib/mock/`)**
- `src/lib/mock/speaking-store.ts` — Phase 3 제출·평가 결과 메모리 스토어 (Map 기반, 서버 재시작 시 초기화. Phase 9에서 Supabase로 교체 예정)

**Server Action (`app/student/speaking/`)**
- `app/student/speaking/actions.ts` — `submitSpeaking(questionId, questionSetId)`: mock STT·발음평가·LLM 평가를 병렬 호출하고 결과를 스토어에 저장 후 submissionId 반환

**말하기 평가 세트/문항 선택 (`app/student/speaking/`)**
- `app/student/speaking/page.tsx` — Server Component: 활성 평가 세트와 문항을 question-sets.json/questions.json에서 로드하여 정적 렌더링. 각 문항에 `/student/speaking/[questionId]?setId=...` 링크 제공

**문항 상세 + 녹음 UI (`app/student/speaking/[questionId]/`)**
- `app/student/speaking/[questionId]/page.tsx` — Server Component: params/searchParams await(Next.js 16 방식), 문항 정보 로드 후 SpeakingClient에 데이터 props로 전달. setId 없으면 첫 번째 포함 세트 사용.
- `app/student/speaking/[questionId]/speaking-client.tsx` — Client Component: 4단계 상태 머신(prep→recording→review→submitting). 준비 타이머(카운트다운), mock 녹음 UI(경과 시간 표시·자동 종료), 제출 버튼(Server Action 직접 import·useRouter 리다이렉트). effect body 직접 setState 없이 setTimeout 콜백 내에서만 phase 전환.

**평가 결과 화면 (`app/student/speaking/[questionId]/result/`)**
- `app/student/speaking/[questionId]/result/page.tsx` — Server Component: submissionId로 스토어 조회. 스토어 미스(서버 재시작)시 안내 메시지 표시. 총점·루브릭별 ScoreBar·AI 피드백(강점/보완점/오류 유형)·STT 전사문·발음 단어별 점수·다음 추천 활동 placeholder 렌더링.

### 수정 파일

**학습자 레이아웃 (`app/student/`)**
- `app/student/layout.tsx` — "말하기 평가" nav item href `/student/assessment` → `/student/speaking`, `disabled` 제거
- `app/student/today-tasks.tsx` — "시작하기" Button → Link(`/student/speaking`)로 교체

### 라우팅 구조

| 경로 | 렌더링 | 설명 |
|------|--------|------|
| `/student/speaking` | Static | 평가 세트·문항 목록 |
| `/student/speaking/[questionId]` | Dynamic | 문항 상세·녹음 UI |
| `/student/speaking/[questionId]/result` | Dynamic | 평가 결과 (STT·AI·발음) |

### 데이터 플로우

```
학습자 선택 → /student/speaking/[questionId]?setId=...
  → SpeakingClient: 준비 타이머 → 녹음 UI → 제출
  → Server Action: submitSpeaking(questionId, questionSetId)
      → mock STT / mock 발음평가 / mock LLM 평가 병렬 실행
      → SpeakingEvalRecord를 evalStore(Map)에 저장
      → return { submissionId }
  → router.push('/student/speaking/[questionId]/result?sub=[submissionId]')
  → Result Page: getSpeakingEval(submissionId) → 결과 렌더링
```

### 설계 메모

- SpeakingEvalRecord는 Submission + AIEvaluation 데이터를 통합. Phase 5 교수자 채점 UI에서 연결 가능하도록 questionId·questionSetId·submittedAt 포함.
- Server Component → Client Component 간 함수 직접 props 전달 없음. Server Action은 별도 `actions.ts`('use server' 파일)에서 client에 직접 import.
- nativeLanguage·languageGroup·uiSupportLanguage 필드는 Student 타입에 유지되나, 이번 Phase에서는 다국어 UI 미구현.
- 스토어는 모듈 레벨 Map. 서버 재시작 시 초기화되며, 결과 페이지에서 미스 처리(graceful error)로 안내.

### 테스트 결과

- `npm run lint` → 오류 없음 ✓
- `npx tsc --noEmit` → 오류 없음 ✓
- `npm run build` → 빌드 성공 ✓ (9개 페이지 생성, 3개 신규 라우트 포함)

### 브라우저 테스트 주소 (npm run dev 후)

- `/student/speaking` — 평가 세트·문항 선택
- `/student/speaking/q-001?setId=qs-diagnostic-01` — 자기소개(기본) 녹음 화면
- `/student/speaking/q-005?setId=qs-practice-01` — 상황 대응 녹음 화면
- `/student/speaking/q-001/result?sub=[submissionId]` — 평가 결과 (제출 후 자동 리다이렉트)

---

## Phase 2 — Mock 대시보드 정교화 (Dashboard Refinement)

**날짜**: 2026-05-03
**목표**: Phase 1 AppShell·컴포넌트를 기반으로 학습자·교수자·관리자 대시보드를 실제 서비스처럼 정교화. mock 데이터만 사용, 실제 API·DB 연동 없음.

### 생성 파일

**학습자 대시보드 (`app/student/`)**
- `today-tasks.tsx` — 오늘의 연습 과제 카드 리스트 (questionSet 기반, 완료/미완료 구분)
- `score-breakdown.tsx` — 루브릭 항목별 점수 시각화 (ScoreBar × 5항목, 피드백 표시)
- `recommended-activity.tsx` — 다음 추천 활동 placeholder (말하기 평가·미션·TTS 섀도잉)

**교수자 대시보드 (`app/teacher/`)**
- `dashboard-client.tsx` — `"use client"` 필터 상태 관리 컴포넌트 (classId·어권·유형·상태·위험도 5종 필터)
- `class-summary-cards.tsx` — 반별 현황 요약 카드 (학생 수·제출 수·평균 점수·채점 대기·주의 학생)

**관리자 대시보드 (`app/admin/`)**
- `content-sets-table.tsx` — 콘텐츠 세트 현황 테이블 (문항 수·제출 건수·평균 점수)
- `provider-status-card.tsx` — STT·TTS·발음평가·LLM 제공자 설정 상태 카드 (mock 표시)

### 수정 파일

**타입 (`src/types/`)**
- `src/types/data.ts` — `RiskFlag`, `ContentSetSummary`, `ProviderStatus` 타입 3개 추가

**Mock 데이터 (`src/lib/mock/`)**
- `src/lib/mock/data.ts` — 학생 3명 추가(→8명), 제출 10건 추가(→18건), AI 평가 6건 추가(→11건)
  - `mockRiskFlags` export 추가 (3건 — medium×2, high×1)
  - `mockContentSets` export 추가 (3건 — 진단·연습·사후평가 세트 현황)
  - `mockProviderStatus` export 추가 (4건 — STT/TTS/발음/LLM 모두 mock)
  - `mockData` 오브젝트에 위 3종 추가

**학습자 대시보드 (`app/student/`)**
- `page.tsx` — 오늘의 과제·루브릭 점수 breakdown·학생 정보(모국어/어권)·추천 활동 섹션 추가

**교수자 대시보드 (`app/teacher/`)**
- `page.tsx` — 서버에서 전체 데이터 계산 후 `TeacherDashboard` 클라이언트에 전달하는 구조로 재구성
  - `mockRiskFlags` 반영하여 위험도 계산 (점수 기반 + 플래그 기반 중 높은 것 적용)
- `submissions-table.tsx` — `classId`, `className`, `languageGroupRaw` 필드 추가, "반" 열 추가

**관리자 대시보드 (`app/admin/`)**
- `page.tsx` — 콘텐츠 세트 현황 + Provider 설정 상태 섹션 추가

### 필터 구조 (교수자 대시보드)

| 필터 | 키 | 옵션 |
|------|-----|------|
| 반 | `classId` | 전체 / class-01 / class-02 |
| 어권 | `languageGroup` | 전체 / 동아시아 / 동남아시아 / 아랍어권 / 유럽 / 기타 |
| 유형 | `contentType` | 전체 / 말하기 평가 / 미션 대화 / 말하기 대회 |
| 상태 | `evaluationStatus` | 전체 / 채점 대기 / AI 평가 완료 / 교수자 검토 / 확정 |
| 위험도 | `riskLevel` | 전체 / 주의 / 보통 / 정상 |

필터 조합: AND 조건, 클라이언트 사이드 순수 계산 (`useMemo` 활용)

### 설계 메모

- 교수자 페이지: 서버 컴포넌트가 전체 데이터 계산 → `TeacherDashboard` (클라이언트) props로 전달.
  향후 "AI 평가 보며 최종 채점하는 3단 UI"는 Phase 3에서 별도 라우트(`/teacher/review/[submissionId]`)로 구현 예정.
- 학습자 오늘의 과제: 해당 학생이 아직 제출하지 않은 questionSet을 "미완료 과제"로 표시.
- `RiskFlag` 데이터가 있는 학생은 점수 기반 위험도보다 높은 레벨로 표시 (`high` 우선).
- `ContentSetSummary`는 question-sets.json 기반의 런타임 집계 뷰로, Phase 9에서 Supabase 집계 쿼리로 교체 예정.

### 테스트 결과
- `npm run lint` → 오류 없음 ✓
- `npx tsc --noEmit` → 오류 없음 ✓
- `npm run build` → 빌드 성공 ✓ (8개 정적 페이지 생성)

### 브라우저 테스트 주소 (npm run dev 후)
- `/student` — 학습자 대시보드
- `/teacher` — 교수자 대시보드 (필터 5종 동작)
- `/admin` — 관리자 대시보드 (콘텐츠 세트 + Provider 상태)

---

## Phase 1 — 디자인 시스템 & 공통 레이아웃 (Design System & Layout)

**날짜**: 2026-05-03
**목표**: 전문적이고 수정이 쉬운 UI/UX 기반 — 디자인 토큰, 공통 컴포넌트, AppShell, 역할별 대시보드 초안

### 생성 파일

**디자인 시스템**
- `app/globals.css` — 수정: Tailwind v4 `@theme` 기반 Primary(네이비 블루)/Success/Warning/Danger 팔레트, 시맨틱 CSS 변수(`--surface`, `--border`, `--text-*`), 다크모드 지원
- `app/layout.tsx` — 수정: Geist Sans → Noto Sans KR(`next/font/google`), Geist Mono 유지

**공통 UI 컴포넌트 (`src/components/ui/`)**
- `button.tsx` — variant(primary/secondary/ghost/danger), size(sm/md/lg), loading spinner
- `card.tsx` — Card / CardHeader / CardBody / CardFooter 4종 슬롯 구조
- `badge.tsx` — variant(default/success/warning/danger/info/outline), size(sm/md)
- `score-bar.tsx` — 점수 진행 바 (60/80 컷오프 색상 자동)
- `score-badge.tsx` — 숫자 점수 뱃지 (동일 색상 로직)
- `risk-badge.tsx` — RiskLevel(low/medium/high) → 색상 뱃지
- `data-table.tsx` — 제네릭 DataTable, 정렬 지원 (Client Component)
- `filter-panel.tsx` — 필터 패널, select 기반 (Client Component)
- `stat-card.tsx` — 숫자 지표 카드 (value + label + trend)
- `page-header.tsx` — 페이지 헤더 (title + description + action 슬롯)
- `empty-state.tsx` — 빈 상태 표시
- `index.ts` — barrel export

**AppShell 레이아웃 (`src/components/layout/`)**
- `app-shell.tsx` — Topbar + Sidebar + main 래퍼, `role`/`navItems` props
- `sidebar.tsx` — 역할별 navItems 렌더링, `usePathname` 기반 active (Client Component)
- `topbar.tsx` — 로고, 플랫폼명, 역할 뱃지
- `index.ts` — barrel export

**역할별 레이아웃 (신규)**
- `app/student/layout.tsx` — 학습자 AppShell, navItems 4개 (말하기 평가·미션 대화·대회 disabled)
- `app/teacher/layout.tsx` — 교수자 AppShell, navItems 4개 (학생 관리·제출 내역·루브릭 disabled)
- `app/admin/layout.tsx` — 관리자 AppShell, navItems 5개 (반·학생·콘텐츠·리포트 disabled)

**역할별 대시보드 페이지 (수정)**
- `app/page.tsx` — 역할 선택 랜딩 페이지 (학습자/교수자/관리자 3종 진입 카드)
- `app/student/page.tsx` — 학습자 대시보드: StatCard 3개 + 제출 내역 DataTable (mock 연결)
- `app/teacher/page.tsx` — 교수자 대시보드: StatCard 4개 + 전체 제출 DataTable + 위험도 뱃지 (mock 연결)
- `app/admin/page.tsx` — 관리자 대시보드: StatCard 4개 + 반별 현황 + 어권별 분포 DataTable 2개 (mock 연결)

**타입 수정**
- `src/types/data.ts` — `ErrorTagType`에 `'grammar'` 추가 (mock 데이터 일치 버그 수정)

### 테스트 결과
- `npm run lint` → 오류 없음 ✓
- `npx tsc --noEmit` → 오류 없음 ✓

### 메모
- 모든 컴포넌트는 Phase 0 디자인 토큰(`--surface`, `--border`, `--text-*`)을 기반으로 Tailwind 유틸리티 사용
- 아이콘은 외부 라이브러리 없이 인라인 SVG로 처리 (lucide-react 미설치)
- 말하기 평가 기능, 인증, DB 연동, 차트는 이번 Phase 제외
- 모바일 사이드바(햄버거 메뉴)는 Phase 미구현 — md: breakpoint에서 표시

---

## Phase 0 — 기반 설정 (Foundation)

**날짜**: 2026-05-03
**목표**: 프로젝트 기반 구조 정리 — 폴더 골격, TypeScript 타입, 콘텐츠 JSON, Provider 인터페이스, Mock 데이터, 라우트 플레이스홀더

### 생성 파일

**TypeScript 타입 (`src/types/`)**
- `src/types/content.ts` — QuestionType, Question, QuestionSet, Rubric, Scenario, Persona, FeedbackTemplate, LanguageGroup
- `src/types/data.ts` — Student, Class, Submission, AIEvaluation, TeacherEvaluation, SubmissionStatus, RiskLevel
- `src/types/providers.ts` — Provider 인터페이스 및 결과 타입 (STT, TTS, Pronunciation, LLMEval)

**콘텐츠 JSON (`src/content/`)**
- `src/content/language-groups.json` — 6개 어권 (베트남어, 중국어, 일본어, 아랍어, 영어, 기타)
- `src/content/question-types.json` — 4개 평가 유형 (자기소개, 그림묘사, 상황대응, 의견말하기)
- `src/content/questions.json` — 8개 문항
- `src/content/question-sets.json` — 3개 문제 세트 (진단·연습·사후평가)
- `src/content/rubrics.json` — 1개 루브릭 (v1.0, 발음·유창성·어휘·문법·과제수행 5항목)
- `src/content/scenarios.json` — 3개 상황 미션 시나리오 (식당, 병원, 교통)
- `src/content/personas.json` — 3개 AI 페르소나
- `src/content/feedback-templates.json` — 5개 피드백 템플릿

**Mock 데이터 (`src/lib/mock/`)**
- `src/lib/mock/data.ts` — 학생 5명, 반 2개, 제출물 8건, AI평가 4건, 교수자평가 2건

**Provider 인터페이스 + Mock 구현 (`src/providers/`)**
- `src/providers/stt/index.ts` — STT Provider (mock)
- `src/providers/tts/index.ts` — TTS Provider (browser, mock)
- `src/providers/pronunciation/index.ts` — 발음평가 Provider (mock)
- `src/providers/llm-eval/index.ts` — LLM 평가 Provider (mock)
- `src/providers/index.ts` — Provider 레지스트리

**App Router 라우트 플레이스홀더**
- `app/student/page.tsx`
- `app/teacher/page.tsx`
- `app/admin/page.tsx`
- `app/api/health/route.ts`

### 수정 파일
- `app/layout.tsx` — `lang="ko"`, metadata title/description 업데이트

### 환경변수 (이름만 참조, 값 미확인)
- `STT_PROVIDER` — mock | etri | whisper | azure
- `TTS_PROVIDER` — browser | azure
- `PRONUNCIATION_PROVIDER` — mock | etri | azure
- `LLM_EVAL_PROVIDER` — mock | claude | openai (미설정 시 mock fallback)
- `NEXT_PUBLIC_SUPABASE_URL` — Phase 9에서 사용
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — publishable key만 사용 (Phase 9에서 사용)

### 메모
- Supabase SDK 미설치. Phase 9에서 `@supabase/supabase-js` 설치 예정.
- Provider 파일은 서버 전용. Route Handler를 통해서만 호출.
- `@/*` alias → 프로젝트 루트. `@/src/types/...` 형태로 import.
- `.env.local` 내용 읽지 않음.

### lint 결과
- `npm run lint` → 에러 0, 경고 0 (완전 통과)
- `eslint.config.mjs`에 `argsIgnorePattern: "^_"` 추가하여 mock 구현체의 의도적 미사용 파라미터(`_`, `__`) 허용

### 완료 확인
- [x] `npm run lint` 오류 없음
- [ ] `/student`, `/teacher`, `/admin` 라우트 접근 가능 (`npm run dev` 후 확인 필요)
- [ ] `/api/health` → `{ status: "ok" }` 응답 확인 필요

---

## Phase 0 보강 — 모국어/어권 확장 최소 구조 반영

**날짜**: 2026-05-03
**목표**: 향후 모국어 선택 및 한국어+모국어 병기 UI를 쉽게 추가할 수 있도록 데이터 구조만 최소 반영

### 변경 파일

**`src/types/content.ts`**
- `LanguageGroupCategory` 타입 추가: `'korean' | 'east-asian' | 'southeast-asian' | 'arabic' | 'european' | 'other'`
- `TextDirection` 타입 추가: `'ltr' | 'rtl'`
- `LanguageGroup` 타입 갱신: `name` → `nameKo`, `nativeName` → `nameNative`, `languageGroup`, `direction` 추가

**`src/types/data.ts`**
- `SupportedUILanguage` 타입 추가: `'ko' | 'en' | 'vi' | 'th' | 'ar'`
  - TODO 주석 포함: Phase 9+에서 Supabase auth profile 연동 + i18n 렌더링 구현 예정
- `Student` 타입에 필드 추가:
  - `languageGroup: LanguageGroupCategory` — 교수자/관리자 필터용 대분류
  - `uiSupportLanguage: SupportedUILanguage` — 향후 UI 언어 전환 기준
- `LanguageGroupCategory` re-export를 `./content`에서 import

**`src/content/language-groups.json`**
- 필드 구조 갱신: `name` → `nameKo`, `nativeName` → `nameNative`, `languageGroup`, `direction` 추가
- 신규 항목 추가: `lg-ko` (한국어), `lg-th` (태국어)
- `lg-ar` — `direction: "rtl"` 명시

**`src/lib/mock/data.ts`**
- `mockStudents` 각 항목에 `languageGroup`, `uiSupportLanguage` 추가
- 헬퍼 함수 `s()` 도입으로 타입 단언 없이 두 필드를 함께 지정
- 중국어·일본어(미지원) → `uiSupportLanguage: 'ko'` 폴백 명시

### 설계 메모 (i18n 미구현 근거)

MVP에서 UI 다국어 병기를 구현하지 않는 이유:
1. 현재 학습자 수가 적어 교수자가 직접 한국어 인터페이스를 안내할 수 있음
2. next-intl 등 i18n 라이브러리 도입은 라우팅 구조 변경을 수반 → Phase 9+ 이후 결정
3. `SupportedUILanguage` 타입과 `uiSupportLanguage` 필드를 데이터에 확보했으므로,
   향후 학습자 프로필에 언어 설정을 저장하고 UI를 전환하는 기능을 추가할 수 있음

### 필터링 구조 요약

교수자/관리자 대시보드에서 다음 두 가지 기준으로 학습자를 필터링할 수 있음:
- `nativeLanguage` (문자열) → 특정 언어명으로 검색
- `languageGroup` (enum) → 어권 대분류로 그룹 필터 (예: 동남아권, 아랍어권)

두 필드 모두 `Student` 타입에 포함되어 있으므로, Phase 5·6 UI 구현 시 추가 데이터 변경 없이 필터 로직을 연결할 수 있음.

### lint 결과
- `npm run lint` → 에러 0, 경고 0

---

## Phase 8-A — STT Route 최소 연동

**날짜**: 2026-05-05
**목표**: 녹음된 음성을 서버 route로 전달하고, STT provider 구조를 통해 mock 또는 실제 STT 호출이 가능하도록 최소 연동. 실제 API 실패 시 mock fallback 유지.

### 생성 파일
- `app/api/stt/route.ts` — STT API route (POST, FormData 수신)

### 수정 파일
- `src/providers/stt/index.ts` — `WhisperSTTProvider` placeholder 추가 (STT_PROVIDER=whisper 분기)
- `app/student/speaking/actions.ts` — `SpeakingSubmitMeta`에 `sttTranscript`, `sttProviderName` 추가; 클라이언트 제공 transcript 사용
- `app/student/speaking/[questionId]/speaking-client.tsx` — `handleSubmit`에서 `/api/stt` 호출 후 transcript를 `submitSpeaking`에 전달

### STT route 구조 (`app/api/stt/route.ts`)

```
POST /api/stt
  Content-Type: multipart/form-data
  Body: audio (Blob/File)

Response:
  { transcript, confidence, providerName, latencyMs, source: 'stt' | 'mock-fallback' }
```

- FormData에서 `audio` 필드를 추출해 `Blob`으로 변환
- `getSTTProvider().transcribe(blob)` 호출
- 성공 시 `[provider_events] stt.success` 콘솔 기록 (Phase 8-B+에서 DB 저장 예정)
- 실패 시 mock transcript 반환 (`source: 'mock-fallback'`)

### Provider 분기 방식 (`src/providers/stt/index.ts`)

| STT_PROVIDER 값 | 동작 |
|---|---|
| `mock` (기본) | `MockSTTProvider` — 500ms 지연 후 고정 mock 문장 반환 |
| `whisper` | `WhisperSTTProvider` — OPENAI_API_KEY 없으면 즉시 throw → route에서 mock fallback |
| 기타 값 | `MockSTTProvider` (default case) |

`WhisperSTTProvider`는 키가 없거나 구현 전이면 throw하도록 설계. `/api/stt` route의 try-catch가 mock fallback을 반환함.

### 녹음 Blob 전달 방식

1. 클라이언트: `recorder.blobUrl` (브라우저 메모리 Blob URL)
2. `fetch(recorder.blobUrl)` → `response.blob()` 로 Blob 복원
3. `FormData.append('audio', blob, 'recording.webm')` 로 래핑
4. `fetch('/api/stt', { method: 'POST', body: formData })` 전송
5. 서버: `request.formData().get('audio')` → `arrayBuffer()` → `Blob` 재구성

### mock fallback 조건

| 상황 | 동작 |
|---|---|
| `recorder.blobUrl` 없음 (녹음 실패/미진행) | STT 호출 건너뜀, `submitSpeaking`에서 mock STT 호출 |
| `fetch(recorder.blobUrl)` 실패 | try-catch 내 무시, `sttTranscript=undefined`로 서버에 전달 |
| `/api/stt` HTTP 오류 (`!sttRes.ok`) | `sttTranscript=undefined`로 서버에 전달 |
| `/api/stt` 내 STT provider throw | route catch → `source: 'mock-fallback'` 반환 |
| `meta?.sttTranscript` 없음 | `submitSpeaking` 서버에서 직접 mock STT 호출 |

모든 경우에 사용자는 제출을 계속할 수 있음.

### Supabase 저장 흐름 영향
- 변경 없음. `saveSpeakingEvalRecord(record)` 호출 구조 동일.
- `record.sttResult.transcript`에 클라이언트 제공 transcript가 들어감.
- `REPOSITORY_PROVIDER=supabase`일 때 ai_evaluations에 실제 transcript 저장됨.

### known issues
- iOS Safari에서 `MediaRecorder`가 `audio/mp4`로 녹음됨. `/api/stt`는 MIME type을 그대로 전달하므로, Whisper 등 실제 STT 연동 시 iOS 녹음 파일 처리 여부를 확인해야 함.
- `blobUrl`은 브라우저 메모리에만 존재. 페이지 이동/리로드 시 소멸. STT 호출은 review phase에서 "제출하기" 클릭 시 즉시 수행됨.
- `WhisperSTTProvider`는 구현체 없음. Phase 8-B에서 실제 API 호출 구현 예정.

### lint 결과
- `npm run lint` → 에러 0, 경고 0

### tsc 결과
- `npx tsc --noEmit` → 에러 0

### build 결과
- `npm run build` → 빌드 성공
- `/api/stt` 라우트가 `ƒ (Dynamic)` 서버 렌더 라우트로 등록됨
