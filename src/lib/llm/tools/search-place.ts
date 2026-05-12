// search_place — 카카오 로컬 키워드 검색 (장소/가게/시설 찾기).
//
// 문서: https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-keyword
// 환경변수: KAKAO_REST_API_KEY (REST API 키 — Authorization: KakaoAK {key})

import { type OpenAIToolDefinition, type ToolErrorResult, toolError } from './types'

const KAKAO_KEYWORD_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json'

export type PlaceItem = {
  name: string
  address: string // 도로명 주소 우선, 없으면 지번 주소
  roadAddress: string
  jibunAddress: string
  lat: number
  lng: number
  phone: string
  category: string
  url: string
}

export type SearchPlaceResult =
  | { ok: true; query: string; region?: string; places: PlaceItem[] }
  | ToolErrorResult

type KakaoDoc = {
  place_name?: string
  road_address_name?: string
  address_name?: string
  phone?: string
  category_name?: string
  place_url?: string
  x?: string // 경도(lng)
  y?: string // 위도(lat)
}

/**
 * 카카오 로컬 키워드 검색. region 이 주어지면 검색어 앞에 붙여 지역을 좁힌다.
 * 최대 5개 장소(장소명/주소/좌표/전화)를 반환한다.
 */
export async function search_place(query: string, region?: string): Promise<SearchPlaceResult> {
  const trimmed = (query ?? '').trim()
  if (!trimmed) return toolError('invalid_args', '검색어(query)가 비어 있습니다.')

  const key = process.env.KAKAO_REST_API_KEY
  if (!key) return toolError('missing_key', 'KAKAO_REST_API_KEY가 설정되지 않아 장소 검색을 사용할 수 없습니다.')

  const region0 = (region ?? '').trim()
  const q = region0 ? `${region0} ${trimmed}` : trimmed
  const url = `${KAKAO_KEYWORD_URL}?query=${encodeURIComponent(q)}&size=5`

  try {
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` } })
    if (!res.ok) {
      return toolError('request_failed', `카카오 로컬 API 호출 실패 (HTTP ${res.status}).`)
    }
    const json = (await res.json()) as { documents?: KakaoDoc[] }
    const docs = Array.isArray(json.documents) ? json.documents : []
    if (docs.length === 0) {
      return toolError('no_results', `'${q}'에 대한 장소 검색 결과가 없습니다.`)
    }
    const places: PlaceItem[] = docs.slice(0, 5).map((d) => {
      const road = (d.road_address_name ?? '').trim()
      const jibun = (d.address_name ?? '').trim()
      return {
        name: (d.place_name ?? '').trim(),
        address: road || jibun,
        roadAddress: road,
        jibunAddress: jibun,
        lat: Number(d.y) || 0,
        lng: Number(d.x) || 0,
        phone: (d.phone ?? '').trim(),
        category: (d.category_name ?? '').trim(),
        url: (d.place_url ?? '').trim(),
      }
    })
    return { ok: true, query: trimmed, region: region0 || undefined, places }
  } catch (err) {
    return toolError('request_failed', `카카오 로컬 API 호출 중 오류: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export const searchPlaceTool: OpenAIToolDefinition = {
  type: 'function',
  function: {
    name: 'search_place',
    description:
      '카카오 로컬 키워드 검색으로 한국 내 장소(카페·식당·가게·관광지·약국·병원·편의시설 등)를 찾는다. 장소명·주소·좌표·전화번호를 최대 5개 반환한다.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '검색 키워드. 예: "스타벅스", "감자탕", "24시 약국", "한강 공원"' },
        region: {
          type: 'string',
          description: '검색 지역(선택). 예: "강남", "부산 해운대", "서울 마포구". 지정하면 검색어 앞에 붙여 지역을 좁힌다.',
        },
      },
      required: ['query'],
    },
  },
}
