// 피드백 응답 검증. 프로젝트가 zod를 쓰지 않으므로 수동 가드로 통일
// (기존 route.ts들의 safeFeedback 스타일과 일치).

export interface BilingualFeedbackResponse {
  feedback_ko: string
  feedback_l1: string
}

export interface BilingualSummaryResponse extends BilingualFeedbackResponse {
  summary_ko: string
  summary_l1: string
}

export interface LangFeedbackList {
  strengths: string[]
  next_steps: string[]
}

export interface BilingualLangFeedbackResponse {
  feedback_ko: LangFeedbackList
  feedback_l1: LangFeedbackList
}

function nonEmptyString(v: unknown, key: string): string {
  if (typeof v !== 'string' || !v.trim()) throw new Error(`missing_${key}`)
  return v.trim()
}

function strList(arr: unknown): string[] {
  if (!Array.isArray(arr)) return []
  return arr.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
}

export function parseBilingualFeedback(parsed: unknown): BilingualFeedbackResponse {
  if (!parsed || typeof parsed !== 'object') throw new Error('invalid_payload')
  const obj = parsed as Record<string, unknown>
  return {
    feedback_ko: nonEmptyString(obj.feedback_ko, 'feedback_ko'),
    feedback_l1: nonEmptyString(obj.feedback_l1, 'feedback_l1'),
  }
}

export function parseBilingualLangFeedback(
  parsed: unknown,
  key: string,
): LangFeedbackList {
  if (!parsed || typeof parsed !== 'object') throw new Error(`missing_${key}`)
  const obj = parsed as Record<string, unknown>
  const strengths = strList(obj.strengths)
  const next_steps = strList(obj.next_steps)
  if (strengths.length === 0 && next_steps.length === 0) throw new Error(`empty_${key}`)
  return { strengths, next_steps }
}
