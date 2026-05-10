// 4 학습 모드(읽기/발표/생성형 대화/말하기 평가) 공통 피드백 보조 언어.
// 한국어 + 선택 언어 1개만 출력. 'off'·기타 언어는 더 이상 허용하지 않음.

export const FEEDBACK_LANGUAGES = [
  { code: 'en', label: 'English',    name: 'English'    },
  { code: 'vi', label: 'Tiếng Việt', name: 'Vietnamese' },
  { code: 'ar', label: 'العربية',   name: 'Arabic'     },
] as const

export type FeedbackLanguage = typeof FEEDBACK_LANGUAGES[number]['code']

// 데모 페르소나(베트남 군 학습자) 기본값.
export const DEFAULT_FEEDBACK_LANGUAGE: FeedbackLanguage = 'vi'

export const FEEDBACK_LANGUAGE_CODES: ReadonlyArray<FeedbackLanguage> =
  FEEDBACK_LANGUAGES.map((l) => l.code)

export function isFeedbackLanguage(v: unknown): v is FeedbackLanguage {
  return typeof v === 'string' && (FEEDBACK_LANGUAGE_CODES as readonly string[]).includes(v)
}

export function isRTL(lang: FeedbackLanguage): boolean {
  return lang === 'ar'
}

export const L1_NAME: Record<FeedbackLanguage, string> = {
  en: 'English',
  vi: 'Vietnamese',
  ar: 'Arabic',
}

// UI 라벨 (한국어 표기).
export const L1_LABEL_KO: Record<FeedbackLanguage, string> = {
  en: '영어 (English)',
  vi: '베트남어 (Tiếng Việt)',
  ar: '아랍어 (العربية)',
}
