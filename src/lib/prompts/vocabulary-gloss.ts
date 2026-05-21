// ============================================================
// M3-c — 어휘 뜻·예문 생성 프롬프트 (Task 1.4, D-012c)
//
// 한국어 어휘 1건 → 대상 언어(lang)의 뜻 + 한국어 예문 + 예문 번역을 생성.
// vocabulary_glosses(term_id, lang, gloss, example_ko, example_translated) 캐시에
// 적재(첫 노출 시 on-demand). 작성자 모델 기본 gpt-4o-mini(cost-aware).
//
// 프롬프트 빌더는 순수 → M3-c mock 회귀가 계약 drift 가드(실제 생성은 real opt-in).
// ============================================================

export const GLOSS_LANGS = ['en', 'vi', 'ar', 'ko', 'th', 'ms', 'km'] as const
export type GlossLang = (typeof GLOSS_LANGS)[number]

export const GLOSS_LANG_NAMES: Record<GlossLang, string> = {
  en: 'English',
  vi: 'Vietnamese (Tiếng Việt)',
  ar: 'Arabic (العربية)',
  ko: '한국어',
  th: 'Thai (ภาษาไทย)',
  ms: 'Malay (Bahasa Melayu)',
  km: 'Khmer (ភាសាខ្មែរ)',
}

export type VocabGlossResult = {
  gloss: string
  example_ko: string
  example_translated: string
}

export function isGlossLang(v: unknown): v is GlossLang {
  return typeof v === 'string' && (GLOSS_LANGS as readonly string[]).includes(v)
}

export function buildVocabularyGlossSystemPrompt(lang: GlossLang): string {
  const langName = GLOSS_LANG_NAMES[lang]
  const translatedRule =
    lang === 'ko'
      ? '- example_translated: 빈 문자열 ""(대상 언어가 한국어이므로 번역 불필요).'
      : `- example_translated: example_ko 문장을 ${langName}(으)로 번역.`
  return [
    `당신은 한국어 학습자를 위한 어휘 사전 항목을 ${langName}(으)로 작성하는 전문가입니다.`,
    '주어진 한국어 어휘에 대해 아래 3필드를 가진 JSON 객체 하나만 출력합니다.',
    '',
    `- gloss: 그 어휘의 뜻을 ${langName}(으)로 간결하게(1~2구). 한국어 발음·로마자 불필요.`,
    '- example_ko: 그 어휘를 사용한 자연스러운 한국어 예문 1문장(학습자 수준에 맞게).',
    translatedRule,
    '',
    '규칙: 출력은 JSON 객체 하나뿐. 마크다운·코드펜스·설명 금지(평문 JSON).',
  ].join('\n')
}

export function buildVocabularyGlossUserPrompt(term: string, cefrLevel?: string | null): string {
  const lines = [`어휘: ${term}`]
  if (cefrLevel) lines.push(`CEFR 수준: ${cefrLevel}`)
  return lines.join('\n')
}

/** raw LLM 응답 → VocabGlossResult (방어적 파싱). 유효하지 않으면 null. */
export function parseVocabGloss(raw: string): VocabGlossResult | null {
  let obj: Record<string, unknown>
  try {
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return null
    obj = p as Record<string, unknown>
  } catch {
    return null
  }
  const gloss = typeof obj.gloss === 'string' ? obj.gloss.trim() : ''
  if (!gloss) return null
  return {
    gloss,
    example_ko: typeof obj.example_ko === 'string' ? obj.example_ko.trim() : '',
    example_translated: typeof obj.example_translated === 'string' ? obj.example_translated.trim() : '',
  }
}
