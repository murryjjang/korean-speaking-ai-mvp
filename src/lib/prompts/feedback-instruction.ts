// LLM에게 한국어 + 선택 언어 1개의 두 필드만 출력하도록 강제하는 시스템 프롬프트 조각.

import { L1_NAME, type FeedbackLanguage } from '@/src/lib/feedback-language'

export function buildBilingualFeedbackInstruction(lang: FeedbackLanguage): string {
  const l1 = L1_NAME[lang]
  return [
    `Return STRICT JSON matching this schema:`,
    `{`,
    `  "feedback_ko": string,  // feedback written in Korean`,
    `  "feedback_l1": string   // the SAME feedback adapted into ${l1}`,
    `}`,
    ``,
    `CRITICAL CONSTRAINTS:`,
    `- Output EXACTLY these two fields. No other languages.`,
    `- Do NOT include English unless the selected language is English.`,
    `- Do NOT include Vietnamese unless the selected language is Vietnamese.`,
    `- Keep both versions equivalent in content, tone, and level of detail.`,
    `- For Arabic, use Modern Standard Arabic appropriate for adult military learners.`,
  ].join('\n')
}
