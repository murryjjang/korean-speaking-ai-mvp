// 한국 특화 API 도구 공통 타입 (v1.1 생성형 자유 대화).
//
// 모든 도구는 OpenAI Chat Completions function calling 형식의 스키마를 함께 export 한다.
// 도구 결과는 항상 직렬화 가능한 평범한 객체로, 성공/실패를 discriminated union 으로 구분한다.
// LLM 에게 그대로 JSON 으로 전달돼 후속 응답에 활용된다.

/** OpenAI Chat Completions `tools[]` 항목과 동일한 구조 */
export type OpenAIToolDefinition = {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

/** 도구 호출 실패 사유 — 키 누락 / 호출 실패 / 결과 없음 / 잘못된 인자 */
export type ToolErrorKind = 'missing_key' | 'request_failed' | 'no_results' | 'invalid_args'

export type ToolErrorResult = {
  ok: false
  error: ToolErrorKind
  message: string
}

export function toolError(error: ToolErrorKind, message: string): ToolErrorResult {
  return { ok: false, error, message }
}

/** 결과가 정상(ok:true)인지 좁혀주는 헬퍼 */
export function isToolError(r: unknown): r is ToolErrorResult {
  return !!r && typeof r === 'object' && (r as { ok?: unknown }).ok === false
}
