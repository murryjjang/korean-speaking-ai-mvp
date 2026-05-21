// ============================================================
// 콘텐츠 태깅 — 공유 스키마 (단일 진실 원천)
//
// prompt v3 빌더(src/lib/prompts/content-tagging.ts)와 검수 정량 규칙
// (src/lib/tagging/validate-tagging.ts)이 **이 파일의 상수·정규식·타입을
// 공유**한다. 셋(스펙·테스트·코드)이 한 곳에서 도출되므로 drift가 구조적으로
// 차단된다 (AUTOMATION_DESIGN 설계 원칙 4: 단일 진실 원천).
//
// content_tags / content_vocabulary / pronunciation_focus 테이블 스키마
// (supabase/migrations/20260520_sprint1_new_tables.sql)와 1:1 대응한다.
// 결정 근거: docs/spec/DECISIONS.md "prompt v3 lock-in".
// ============================================================

export const CONTENT_TAGGING_PROMPT_VERSION = 'v3'

// ── register 5값 (content_tags.register check 제약과 동일) ──────
export const REGISTER_VALUES = [
  'casual-banmal',
  'polite-spoken',
  'formal-spoken',
  'formal-written',
  'instructional',
] as const
export type Register = (typeof REGISTER_VALUES)[number]

export const REGISTER_CONSISTENCY_VALUES = ['consistent', 'mixed'] as const
export type RegisterConsistency = (typeof REGISTER_CONSISTENCY_VALUES)[number]

// register별 한 줄 정의 (프롬프트 주입용)
export const REGISTER_DEFINITIONS: Record<Register, string> = {
  'casual-banmal': '반말. 친구·가까운 사이의 비격식 구어.',
  'polite-spoken': '해요체. 일상 격식 구어 (존댓말).',
  'formal-spoken': '합쇼체. 공식 발표·면접 등 격식 구어.',
  'formal-written': '문어체 격식. 보고서·안내문 등 격식 문어.',
  instructional: '지시·설명체. 문제 지시문·학습 안내 등.',
}

// ── CEFR 6값 (content_tags.cefr_level check 제약과 동일) ────────
export const CEFR_VALUES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
export type CefrLevel = (typeof CEFR_VALUES)[number]

// ── vocabulary 분류 3값 (content_vocabulary.category check) ─────
export const VOCAB_CATEGORIES = ['basic', 'core', 'challenging'] as const
export type VocabCategory = (typeof VOCAB_CATEGORIES)[number]

// ── 정규식 (검수 규칙 4·5의 권위 기준) ─────────────────────────
// 규칙 4: learning_objective 는 능력표현 "-(으)ㄹ 수 있다(.)" 로 끝난다.
//   하다 동사 한정 아님(읽을/들을/만들 수 있다 등 고유어 동사 포함) — D-001 보완.
export const LEARNING_OBJECTIVE_RE = /[가-힣] 수 있다\.?$/
// 규칙 5: pronunciation_focus 각 항목은 "표현(규칙)" 형식. 예: "꽃이(연음)".
export const PRONUNCIATION_FOCUS_RE = /^.+\(.+\)$/

// 발음 규칙 어휘 (프롬프트 주입 + 참고용). rule 텍스트는 자유지만 권장 집합.
export const PRONUNCIATION_RULES = [
  '연음',
  '격음화',
  '구개음화',
  '경음화',
  '비음화',
  'ㅎ 약화',
] as const

// ── 반말 경고 표준 문구 (검수 규칙 7의 권위 기준) ──────────────
// register='casual-banmal' 콘텐츠는 학습자에게 비격식임을 알리는 표준 문구를
// register_note 로 동반해야 한다. 비반말 register는 이 문구를 달면 안 된다(오경고).
export const BANMAL_WARNING = '※ 반말(casual-banmal) 콘텐츠입니다. 격식 상황에는 적절하지 않습니다.'
// register_consistency='mixed' 시 동반 권장 문구의 식별 키워드.
export const MIXED_REGISTER_KEYWORD = '문체 혼용'

// 규칙 6: 고유명사 화이트리스트(어휘로 허용) + 결정론적 블랙리스트.
// 권위 NER은 LLM peer review가 담당하고, 이 두 집합은 결정론적 사전 필터다.
export const PROPER_NOUN_WHITELIST = new Set<string>([
  '서울', '한국', '미국', '중국', '일본', '베트남',
])
export const PROPER_NOUN_BLACKLIST = new Set<string>([
  '삼성', '엘지', '네이버', '카카오', '강남', '부산', '제주', '박지성', '김연아',
])

// ── 태깅 결과 타입 (LLM이 콘텐츠 1건당 생성하는 JSON) ──────────
export type ContentTagResult = {
  topic_tags: string[]
  cefr_level: CefrLevel
  register: Register
  register_consistency: RegisterConsistency
  learning_objective: string
  vocabulary: { basic: string[]; core: string[]; challenging: string[] }
  pronunciation_focus: string[] // 각 항목 "표현(규칙)" 형식
  register_note?: string // 반말/혼용 경고 (검증·UI용, content_tags 미저장)
}

// 7필드 권위 목록 (규칙 1 "스키마 7필드 존재" + 프롬프트 계약 검증의 단일 출처)
export const REQUIRED_TAG_FIELDS = [
  'topic_tags',
  'cefr_level',
  'register',
  'register_consistency',
  'learning_objective',
  'vocabulary',
  'pronunciation_focus',
] as const

// 태깅 대상 콘텐츠 입력 (questions 행 일부)
export type TaggingInput = {
  content_id: string
  type_id?: string | null
  title: string
  prompt: string
  difficulty?: string | null
}

// ── 헬퍼: pronunciation_focus 문자열 ↔ {term, rule} (1.3b INSERT용) ──
export function parsePronunciationFocus(entry: string): { term: string; rule: string } | null {
  const m = /^(.+)\((.+)\)$/.exec(entry.trim())
  if (!m) return null
  return { term: m[1].trim(), rule: m[2].trim() }
}

export function isRegister(v: unknown): v is Register {
  return typeof v === 'string' && (REGISTER_VALUES as readonly string[]).includes(v)
}
export function isCefrLevel(v: unknown): v is CefrLevel {
  return typeof v === 'string' && (CEFR_VALUES as readonly string[]).includes(v)
}
