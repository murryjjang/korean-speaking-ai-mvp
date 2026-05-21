// ============================================================
// M4 — 콘텐츠 검수 자동화 (순수 로직)
//
// A. 정량 검증 7규칙 — LLM 무관 순수함수. 결정론적 단위테스트 대상
//    (#13 score 헬퍼와 같은 패턴: 스크립트에서 분리해 가드).
// B. LLM peer review 프롬프트 빌더(6규칙 inject) + runPeerReview(주입형 caller).
// C. 자동 분류 classify(): pass / warn / fail (순수함수).
//
// 모든 enum·정규식·표준 문구는 schema.ts 공유 (단일 진실 원천).
// 스크립트(scripts/validate-tagging.ts)는 이 모듈 + openai 를 wiring 만 한다.
// ============================================================

import {
  BANMAL_WARNING,
  CEFR_VALUES,
  LEARNING_OBJECTIVE_RE,
  MIXED_REGISTER_KEYWORD,
  PRONUNCIATION_FOCUS_RE,
  PROPER_NOUN_BLACKLIST,
  PROPER_NOUN_WHITELIST,
  REGISTER_VALUES,
  REQUIRED_TAG_FIELDS,
  requiresPronunciationFocus,
  VOCAB_CATEGORIES,
} from '@/src/lib/tagging/schema'

// ── 정량 규칙 결과 타입 ────────────────────────────────────────
export type RuleId =
  | 'fields'
  | 'register'
  | 'cefr'
  | 'objective'
  | 'pronunciation'
  | 'vocabulary'
  | 'banmal'
  | 'reading_pron'

// 콘텐츠 컨텍스트 (유형별 차등 규칙용). 없으면 유형 무관 규칙만 적용.
export type ValidateOpts = { typeId?: string | null }

export type RuleResult = { rule: RuleId; ok: boolean; message: string }

export type QuantResult = {
  ok: boolean
  results: RuleResult[]
  failures: RuleResult[]
}

// 안전 접근 헬퍼 (malformed 입력에도 throw 금지)
function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
}
function asStrArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

// ── 규칙 1: 7필드 존재 + 기본 구조 ─────────────────────────────
function ruleFields(o: Record<string, unknown>): RuleResult {
  const missing = REQUIRED_TAG_FIELDS.filter((f) => !(f in o) || o[f] == null)
  if (missing.length) return { rule: 'fields', ok: false, message: `누락 필드: ${missing.join(', ')}` }
  const shapeErrs: string[] = []
  if (!Array.isArray(o.topic_tags) || (o.topic_tags as unknown[]).length === 0) shapeErrs.push('topic_tags(비빈 배열)')
  if (typeof o.learning_objective !== 'string') shapeErrs.push('learning_objective(문자열)')
  if (!Array.isArray(o.pronunciation_focus)) shapeErrs.push('pronunciation_focus(배열)')
  const vocab = asObj(o.vocabulary)
  for (const c of VOCAB_CATEGORIES) {
    if (!Array.isArray(vocab[c])) shapeErrs.push(`vocabulary.${c}(배열)`)
  }
  return shapeErrs.length
    ? { rule: 'fields', ok: false, message: `형식 오류: ${shapeErrs.join(', ')}` }
    : { rule: 'fields', ok: true, message: '7필드 존재·구조 정상' }
}

// ── 규칙 2: register enum ──────────────────────────────────────
function ruleRegister(o: Record<string, unknown>): RuleResult {
  const ok = (REGISTER_VALUES as readonly string[]).includes(o.register as string)
  return { rule: 'register', ok, message: ok ? `register=${o.register}` : `register 불허값: ${String(o.register)}` }
}

// ── 규칙 3: cefr_level enum ────────────────────────────────────
function ruleCefr(o: Record<string, unknown>): RuleResult {
  const ok = (CEFR_VALUES as readonly string[]).includes(o.cefr_level as string)
  return { rule: 'cefr', ok, message: ok ? `cefr=${o.cefr_level}` : `cefr 불허값: ${String(o.cefr_level)}` }
}

// ── 규칙 4: learning_objective 정규식 ──────────────────────────
function ruleObjective(o: Record<string, unknown>): RuleResult {
  const lo = typeof o.learning_objective === 'string' ? o.learning_objective.trim() : ''
  const ok = LEARNING_OBJECTIVE_RE.test(lo)
  return { rule: 'objective', ok, message: ok ? 'learning_objective 형식 정상' : `"…할 수 있다" 형식 아님: ${lo || '(빈값)'}` }
}

// ── 규칙 5: pronunciation_focus 형식 ───────────────────────────
function rulePronunciation(o: Record<string, unknown>): RuleResult {
  const arr = asStrArray(o.pronunciation_focus)
  const bad = arr.filter((e) => !PRONUNCIATION_FOCUS_RE.test(e.trim()))
  // 빈 배열은 허용(발음 포커스 없음). 항목이 있으면 모두 "표현(규칙)" 형식.
  return bad.length
    ? { rule: 'pronunciation', ok: false, message: `형식 위반 항목: ${bad.join(', ')}` }
    : { rule: 'pronunciation', ok: true, message: `pronunciation_focus ${arr.length}건 형식 정상` }
}

// ── 규칙 6: vocabulary 고유명사 결정론적 사전 필터 ─────────────
//    화이트리스트(서울·한국 등)는 허용, 블랙리스트는 fail. 권위 NER은 peer review.
function ruleVocabulary(o: Record<string, unknown>): RuleResult {
  const vocab = asObj(o.vocabulary)
  const all = VOCAB_CATEGORIES.flatMap((c) => asStrArray(vocab[c]).map((t) => t.trim()))
  const offenders = all.filter((t) => PROPER_NOUN_BLACKLIST.has(t) && !PROPER_NOUN_WHITELIST.has(t))
  return offenders.length
    ? { rule: 'vocabulary', ok: false, message: `고유명사 의심(블랙리스트): ${offenders.join(', ')}` }
    : { rule: 'vocabulary', ok: true, message: `vocabulary ${all.length}건 고유명사 사전필터 통과` }
}

// ── 규칙 7: 반말 경고 일치성 ───────────────────────────────────
function ruleBanmal(o: Record<string, unknown>): RuleResult {
  const note = typeof o.register_note === 'string' ? o.register_note : ''
  const isBanmal = o.register === 'casual-banmal'
  const hasBanmalWarning = note.includes(BANMAL_WARNING)
  if (isBanmal && !hasBanmalWarning) return { rule: 'banmal', ok: false, message: 'casual-banmal인데 표준 반말 경고 누락' }
  if (!isBanmal && hasBanmalWarning) return { rule: 'banmal', ok: false, message: `비반말 register(${String(o.register)})에 반말 경고 오부착` }
  if (o.register_consistency === 'mixed' && !note.includes(MIXED_REGISTER_KEYWORD)) {
    return { rule: 'banmal', ok: false, message: 'register_consistency=mixed인데 혼용 경고 누락' }
  }
  return { rule: 'banmal', ok: true, message: '반말/혼용 경고 일치' }
}

// ── 규칙 8: 낭독 유형 발음 포커스 필수 (유형별 차등) ───────────
//    type_id='qt-reading'(소리 내어 읽기)이면 pronunciation_focus ≥1 필수.
//    그 외 유형은 빈 배열 허용 → pass. (결정론적 — peer review 비결정성 보완)
function ruleReadingPron(o: Record<string, unknown>, opts?: ValidateOpts): RuleResult {
  if (!requiresPronunciationFocus(opts?.typeId)) {
    return { rule: 'reading_pron', ok: true, message: '발음 포커스 필수 유형 아님' }
  }
  const arr = asStrArray(o.pronunciation_focus)
  return arr.length > 0
    ? { rule: 'reading_pron', ok: true, message: `낭독 발음 포커스 ${arr.length}건` }
    : { rule: 'reading_pron', ok: false, message: '낭독(qt-reading)인데 pronunciation_focus 비어있음(≥1 필요)' }
}

/** A. 정량 검증 — 결정론적 순수함수. 유형 무관 7규칙 + 유형별 rule 8. */
export function validateQuantitative(result: unknown, opts?: ValidateOpts): QuantResult {
  const o = asObj(result)
  const results = [
    ruleFields(o), ruleRegister(o), ruleCefr(o), ruleObjective(o),
    rulePronunciation(o), ruleVocabulary(o), ruleBanmal(o), ruleReadingPron(o, opts),
  ]
  const failures = results.filter((r) => !r.ok)
  return { ok: failures.length === 0, results, failures }
}

// ── B. LLM peer review (다른 모델 = gpt-4o) ────────────────────
// spec 6 정성 규칙을 명시적으로 inject. 응답: { pass, warnings[], failures[] }.
export const PEER_REVIEW_RULES = [
  'topic_tags 가 콘텐츠 주제를 정확하고 충분히 반영하는가',
  'cefr_level 이 콘텐츠 실제 난이도와 부합하는가',
  'register 가 콘텐츠 실제 문체와 일치하는가',
  'learning_objective 가 콘텐츠 핵심 학습목표를 "-(으)ㄹ 수 있다" 형식으로 반영하는가 (유형별 정상형: 낭독/qt-reading=콘텐츠 주제+정확히 읽는 능력 하이브리드 / 발표·자료설명/qt-material-desc=콘텐츠+설명·발표 능력 / 그 외=콘텐츠 중심 — 유형에 맞으면 통과시킬 것)',
  'vocabulary 분류(basic/core/challenging)가 난이도상 타당하고 고유명사(인명·상호·특정 지명)를 제외했는가(NER)',
  'pronunciation_focus 의 발음 규칙 적용이 한국어 음운론상 정확한가',
] as const

export type PeerReviewResult = { pass: boolean; warnings: string[]; failures: string[] }

export function buildPeerReviewSystemPrompt(): string {
  const rules = PEER_REVIEW_RULES.map((r, i) => `${i + 1}. ${r}`).join('\n')
  return [
    '당신은 한국어 학습 콘텐츠 태깅 결과를 교차 검수하는 검수자입니다.',
    '아래 6개 규칙으로 태깅 JSON 을 검토하고, 문제를 warnings(의심)와 failures(명백한 오류)로 분류하세요.',
    '',
    '검수 규칙:',
    rules,
    '',
    '출력: JSON 객체 하나. { "pass": boolean, "warnings": string[], "failures": string[] }.',
    '- failures 가 하나라도 있으면 pass=false. warnings 만 있으면 pass=true 가능하나 표시.',
    '- 마크다운·설명 금지(평문 JSON).',
  ].join('\n')
}

/** raw LLM 응답 → PeerReviewResult (방어적 파싱). */
export function parsePeerReview(raw: string): PeerReviewResult {
  let obj: Record<string, unknown> = {}
  try {
    obj = asObj(JSON.parse(raw))
  } catch {
    return { pass: false, warnings: [], failures: ['peer review 응답 파싱 실패'] }
  }
  const warnings = asStrArray(obj.warnings)
  const failures = asStrArray(obj.failures)
  const pass = typeof obj.pass === 'boolean' ? obj.pass : failures.length === 0
  return { pass, warnings, failures }
}

// 주입형 caller — 스크립트는 openai 를, 테스트는 fake 를 넘긴다.
export type ChatCaller = (systemPrompt: string, userPrompt: string) => Promise<string>

export async function runPeerReview(
  call: ChatCaller,
  taggedJson: unknown,
  userContext: string,
): Promise<PeerReviewResult> {
  const sys = buildPeerReviewSystemPrompt()
  const user = [userContext, '', '태깅 결과:', JSON.stringify(taggedJson)].join('\n')
  const raw = await call(sys, user)
  return parsePeerReview(raw)
}

// ── C. 자동 분류 ───────────────────────────────────────────────
export type Verdict = 'pass' | 'warn' | 'fail'

/**
 * pass = A pass ∧ B pass / warn = A pass ∧ B warn / fail = A fail ∨ B fail.
 * peer=null 이면 정량 전용(quant-only): A pass→pass, A fail→fail.
 */
export function classify(quant: QuantResult, peer: PeerReviewResult | null): Verdict {
  if (!quant.ok) return 'fail'
  if (!peer) return 'pass'
  if (peer.failures.length > 0) return 'fail'
  if (peer.warnings.length > 0 || !peer.pass) return 'warn'
  return 'pass'
}
