// v1.1 16-10: 학습자 피드백·교정·UI 표시 언어 (한국어 포함 4개).
//
// 기존 FeedbackLanguage(ar/en/vi)는 "외국어 1개 선택" 용도로 유지하고,
// DisplayLanguage는 KO 포함 4개를 다루는 새 추상화다. LLM이 다국어 객체로
// 응답하면 호출부가 DisplayLanguage 기반으로 표시할 키를 고르는 식.

// v1.1 단계 19.9: 7개 언어 지원 — th/ms/km 추가 (사용자 결정).
// th=Thai, ms=Malay, km=Khmer/Cambodian. ar만 RTL.
export const DISPLAY_LANGUAGES = [
  { code: 'ko', label: '한국어',     name: 'Korean'     },
  { code: 'en', label: 'English',    name: 'English'    },
  { code: 'vi', label: 'Tiếng Việt', name: 'Vietnamese' },
  { code: 'ar', label: 'العربية',   name: 'Arabic'     },
  { code: 'th', label: 'ภาษาไทย',   name: 'Thai'       },
  { code: 'ms', label: 'Bahasa Melayu', name: 'Malay'  },
  { code: 'km', label: 'ភាសាខ្មែរ',   name: 'Khmer'      },
] as const

export type DisplayLanguage = typeof DISPLAY_LANGUAGES[number]['code']

export const DISPLAY_LANGUAGE_CODES: ReadonlyArray<DisplayLanguage> =
  DISPLAY_LANGUAGES.map((l) => l.code)

export const DEFAULT_DISPLAY_LANGUAGE: DisplayLanguage = 'ko'

export function isDisplayLanguage(v: unknown): v is DisplayLanguage {
  return typeof v === 'string' && (DISPLAY_LANGUAGE_CODES as readonly string[]).includes(v)
}

export function isRTLDisplay(lang: DisplayLanguage): boolean {
  return lang === 'ar'
}

// 학습자 모국어 자유 텍스트 → DisplayLanguage 추론. mother_tongue가 코드(ko/en/...)면 그대로,
// 자연어(Vietnamese/베트남어/영어 등)면 매핑.
const MOTHER_TONGUE_HINTS: Array<[RegExp, DisplayLanguage]> = [
  [/^(ko|kor|korean|한국어|한국)$/i, 'ko'],
  [/^(en|eng|english|영어)$/i, 'en'],
  [/^(vi|vie|vietnamese|tiếng việt|tieng viet|베트남|베트남어)$/i, 'vi'],
  [/^(ar|ara|arabic|العربية|아랍|아랍어)$/i, 'ar'],
  // v1.1 단계 19.9 다언어 확장.
  [/^(th|tha|thai|ภาษาไทย|태국|태국어)$/i, 'th'],
  [/^(ms|may|malay|bahasa melayu|말레이|말레이어)$/i, 'ms'],
  [/^(km|khm|khmer|cambodian|ភាសាខ្មែរ|크메르|크메르어|캄보디아|캄보디아어)$/i, 'km'],
]

export function inferDisplayLanguageFromMotherTongue(
  motherTongue: string | null | undefined,
): DisplayLanguage | null {
  if (!motherTongue) return null
  const trimmed = motherTongue.trim()
  if (!trimmed) return null
  for (const [pattern, lang] of MOTHER_TONGUE_HINTS) {
    if (pattern.test(trimmed)) return lang
  }
  return null
}

// LLM 응답·정적 콘텐츠를 7개 언어 객체로 표현 (단계 19.9 확장).
// ko는 필수, 나머지는 LLM이 비어 있거나 누락이면 ko로 폴백.
export type MultilingualText = {
  ko: string
  en?: string
  vi?: string
  ar?: string
  th?: string
  ms?: string
  km?: string
}

/** 표시 언어로 텍스트 선택. 비어 있거나 누락이면 ko 폴백. */
export function pickText(text: MultilingualText | string | null | undefined, lang: DisplayLanguage): string {
  if (!text) return ''
  if (typeof text === 'string') return text
  const v = text[lang]
  if (typeof v === 'string' && v.trim()) return v
  return text.ko ?? ''
}

export type MultilingualList = {
  ko: string[]
  en?: string[]
  vi?: string[]
  ar?: string[]
  th?: string[]
  ms?: string[]
  km?: string[]
}

export function pickList(list: MultilingualList | string[] | null | undefined, lang: DisplayLanguage): string[] {
  if (!list) return []
  if (Array.isArray(list)) return list
  const v = list[lang]
  if (Array.isArray(v) && v.length > 0) return v
  return list.ko ?? []
}
