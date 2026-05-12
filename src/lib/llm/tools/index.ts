// 한국 특화 API 도구 모음 (v1.1 생성형 자유 대화).
//
// - toolDefinitions: OpenAI Chat Completions `tools` 파라미터에 그대로 넘기는 배열
// - toolHandlers: 도구 이름 → 실행 함수. LLM 이 넘긴 args(JSON 파싱 결과)를 받아 결과 객체를 반환한다.
//
// 모든 핸들러는 throw 하지 않고 { ok:false, error, message } 형태로 실패를 돌려준다 (라우트에서 LLM 에 그대로 전달).

import { search_place, searchPlaceTool, type SearchPlaceResult } from './search-place'
import { search_web, searchWebTool, type NaverSearchType, type SearchWebResult } from './search-web'
import { get_weather, getWeatherTool, type WeatherResult } from './get-weather'
import { search_address, searchAddressTool, type SearchAddressResult } from './search-address'
import { type OpenAIToolDefinition, type ToolErrorResult, toolError } from './types'

export { search_place, search_web, get_weather, search_address }
export { searchPlaceTool, searchWebTool, getWeatherTool, searchAddressTool }
export * from './types'
export type { PlaceItem, SearchPlaceResult } from './search-place'
export type { WebSearchItem, SearchWebResult, NaverSearchType } from './search-web'
export type { WeatherResult } from './get-weather'
export type { AddressItem, SearchAddressResult } from './search-address'

export const toolDefinitions: OpenAIToolDefinition[] = [searchPlaceTool, searchWebTool, getWeatherTool, searchAddressTool]

export const TOOL_NAMES = ['search_place', 'search_web', 'get_weather', 'search_address'] as const
export type ToolName = (typeof TOOL_NAMES)[number]

type AnyToolResult =
  | SearchPlaceResult
  | SearchWebResult
  | WeatherResult
  | SearchAddressResult
  | ToolErrorResult

function str(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}
function optStr(v: unknown): string | undefined {
  if (v == null) return undefined
  const s = String(v).trim()
  return s ? s : undefined
}
function naverType(v: unknown): NaverSearchType {
  return v === 'local' || v === 'blog' || v === 'news' ? v : 'blog'
}

export const toolHandlers: Record<ToolName, (args: Record<string, unknown>) => Promise<AnyToolResult>> = {
  search_place: (args) => search_place(str(args.query), optStr(args.region)),
  search_web: (args) => search_web(str(args.query), naverType(args.type)),
  get_weather: (args) => get_weather(str(args.city)),
  search_address: (args) => search_address(str(args.keyword)),
}

/**
 * 도구 이름과 (JSON 파싱된) 인자로 도구를 실행한다.
 * 알 수 없는 도구 이름이면 throw 하지 않고 에러 결과를 반환한다.
 */
export async function runTool(name: string, args: Record<string, unknown>): Promise<AnyToolResult> {
  const handler = (toolHandlers as Record<string, ((a: Record<string, unknown>) => Promise<AnyToolResult>) | undefined>)[name]
  if (!handler) return toolError('invalid_args', `알 수 없는 도구: ${name}`)
  try {
    return await handler(args)
  } catch (err) {
    return toolError('request_failed', `도구 '${name}' 실행 중 오류: ${err instanceof Error ? err.message : String(err)}`)
  }
}
