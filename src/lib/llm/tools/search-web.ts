// search_web — 네이버 검색 API (지역/블로그/뉴스).
//
// 문서: https://developers.naver.com/docs/serviceapi/search/blog/blog.md
// 환경변수: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
//   (X-Naver-Client-Id / X-Naver-Client-Secret 헤더)

import { type OpenAIToolDefinition, type ToolErrorResult, toolError } from './types'

export type NaverSearchType = 'local' | 'blog' | 'news'

const NAVER_SEARCH_BASE = 'https://openapi.naver.com/v1/search'
const VALID_TYPES: readonly NaverSearchType[] = ['local', 'blog', 'news']

export type WebSearchItem = {
  title: string // HTML 태그 제거
  link: string
  description: string // HTML 태그 제거
}

export type SearchWebResult =
  | { ok: true; query: string; type: NaverSearchType; items: WebSearchItem[] }
  | ToolErrorResult

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

type NaverItem = Record<string, unknown>

/**
 * 네이버 검색. type 에 따라 local/blog/news 엔드포인트를 호출한다.
 * 제목·링크·설명을 최대 5개 반환한다.
 */
export async function search_web(query: string, type: NaverSearchType): Promise<SearchWebResult> {
  const trimmed = (query ?? '').trim()
  if (!trimmed) return toolError('invalid_args', '검색어(query)가 비어 있습니다.')
  if (!VALID_TYPES.includes(type)) {
    return toolError('invalid_args', `지원하지 않는 검색 유형: ${String(type)} (local | blog | news 중 하나)`)
  }

  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return toolError('missing_key', 'NAVER_CLIENT_ID / NAVER_CLIENT_SECRET가 설정되지 않아 웹 검색을 사용할 수 없습니다.')
  }

  const url = `${NAVER_SEARCH_BASE}/${type}.json?query=${encodeURIComponent(trimmed)}&display=5`
  try {
    const res = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    })
    if (!res.ok) {
      return toolError('request_failed', `네이버 검색 API 호출 실패 (HTTP ${res.status}).`)
    }
    const json = (await res.json()) as { items?: NaverItem[] }
    const raw = Array.isArray(json.items) ? json.items : []
    if (raw.length === 0) {
      return toolError('no_results', `'${trimmed}'에 대한 ${type} 검색 결과가 없습니다.`)
    }
    const items: WebSearchItem[] = raw.slice(0, 5).map((it) => {
      const title = stripHtml(String(it.title ?? ''))
      const link = String(it.link ?? '')
      // 블로그/뉴스: description. 지역(local): description이 비면 도로명/지번 주소를 대신 노출.
      const desc = stripHtml(String(it.description ?? ''))
      const addrFallback = stripHtml(String(it.roadAddress ?? it.address ?? ''))
      return { title, link, description: desc || addrFallback }
    })
    return { ok: true, query: trimmed, type, items }
  } catch (err) {
    return toolError('request_failed', `네이버 검색 API 호출 중 오류: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export const searchWebTool: OpenAIToolDefinition = {
  type: 'function',
  function: {
    name: 'search_web',
    description:
      '네이버 검색 API로 한국 웹 정보를 찾는다. type=local 은 가게·맛집 정보, type=blog 은 후기·리뷰·여행기, type=news 는 최신 뉴스. 제목·링크·요약을 최대 5개 반환한다.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '검색어. 예: "성수동 카페 추천", "제주도 3박4일", "오늘 날씨 뉴스"' },
        type: {
          type: 'string',
          enum: ['local', 'blog', 'news'],
          description: 'local=가게/맛집 정보, blog=후기/리뷰/여행기, news=최신 뉴스',
        },
      },
      required: ['query', 'type'],
    },
  },
}
