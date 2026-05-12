// search_address — 행정안전부 도로명주소 검색 (juso.go.kr).
//
// 문서: https://business.juso.go.kr/addrlink/openApi/searchApi.do
// 환경변수: JUSO_API_KEY (승인키 confmKey)
//
// 일부 환경에서 Referer 화이트리스트를 적용하므로 Referer 헤더를 함께 보낸다.
// 기본값 http://localhost:3000/ — 운영 배포 시 JUSO_API_REFERER 로 도메인을 바꾼다.

import { type OpenAIToolDefinition, type ToolErrorResult, toolError } from './types'

const JUSO_ADDR_LINK_URL = 'https://business.juso.go.kr/addrlink/addrLinkApi.do'
const DEFAULT_REFERER = 'http://localhost:3000/'

export type AddressItem = {
  roadAddress: string // 도로명 주소
  jibunAddress: string // 지번 주소
  zipCode: string // 우편번호
  englishAddress: string // 영문 주소
}

export type SearchAddressResult =
  | { ok: true; keyword: string; addresses: AddressItem[] }
  | ToolErrorResult

type JusoEntry = {
  roadAddr?: string
  jibunAddr?: string
  zipNo?: string
  engAddr?: string
}
type JusoResponse = {
  results?: {
    common?: { errorCode?: string; errorMessage?: string; totalCount?: string }
    juso?: JusoEntry[] | null
  }
}

/**
 * 도로명주소 검색. 키워드로 도로명/지번/우편번호/영문주소를 최대 5개 반환한다.
 */
export async function search_address(keyword: string): Promise<SearchAddressResult> {
  const trimmed = (keyword ?? '').trim()
  if (!trimmed) return toolError('invalid_args', '검색 키워드(keyword)가 비어 있습니다.')

  const key = process.env.JUSO_API_KEY
  if (!key) return toolError('missing_key', 'JUSO_API_KEY가 설정되지 않아 주소 검색을 사용할 수 없습니다.')

  const referer = process.env.JUSO_API_REFERER ?? DEFAULT_REFERER
  const params = new URLSearchParams({
    confmKey: key,
    currentPage: '1',
    countPerPage: '5',
    keyword: trimmed,
    resultType: 'json',
  })

  try {
    const res = await fetch(`${JUSO_ADDR_LINK_URL}?${params.toString()}`, {
      headers: { Referer: referer },
    })
    if (!res.ok) {
      return toolError('request_failed', `도로명주소 API 호출 실패 (HTTP ${res.status}).`)
    }
    const json = (await res.json()) as JusoResponse
    const common = json.results?.common
    if (common?.errorCode && common.errorCode !== '0') {
      return toolError('request_failed', `도로명주소 API 오류: ${common.errorMessage ?? common.errorCode}`)
    }
    const list = Array.isArray(json.results?.juso) ? json.results!.juso! : []
    if (list.length === 0) {
      return toolError('no_results', `'${trimmed}'에 대한 주소 검색 결과가 없습니다.`)
    }
    const addresses: AddressItem[] = list.slice(0, 5).map((j) => ({
      roadAddress: (j.roadAddr ?? '').trim(),
      jibunAddress: (j.jibunAddr ?? '').trim(),
      zipCode: (j.zipNo ?? '').trim(),
      englishAddress: (j.engAddr ?? '').trim(),
    }))
    return { ok: true, keyword: trimmed, addresses }
  } catch (err) {
    return toolError('request_failed', `도로명주소 API 호출 중 오류: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export const searchAddressTool: OpenAIToolDefinition = {
  type: 'function',
  function: {
    name: 'search_address',
    description:
      '행정안전부 도로명주소 검색으로 한국 주소를 조회한다. 건물명·도로명·지번 등 키워드로 도로명주소·지번주소·우편번호·영문주소를 최대 5개 반환한다.',
    parameters: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description: '주소 검색어. 예: "강남구 테헤란로 152", "롯데월드타워", "서울시청"',
        },
      },
      required: ['keyword'],
    },
  },
}
