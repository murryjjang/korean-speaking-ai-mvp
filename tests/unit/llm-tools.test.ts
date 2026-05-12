// v1.1 한국 특화 API 도구 단위 테스트.
//
// fetch 를 모킹해 (1) 정상 응답 파싱, (2) 환경변수 누락 시 에러, (3) 호출 실패 fallback 을 검증한다.
// 실제 외부 API 는 호출하지 않는다.

import { afterEach, describe, expect, it, vi } from 'vitest'

import { search_place, searchPlaceTool } from '@/src/lib/llm/tools/search-place'
import { search_web } from '@/src/lib/llm/tools/search-web'
import { computeBaseDateTime, get_weather, getWeatherTool, normalizeCityName } from '@/src/lib/llm/tools/get-weather'
import { search_address } from '@/src/lib/llm/tools/search-address'
import { TOOL_NAMES, runTool, toolDefinitions, toolHandlers } from '@/src/lib/llm/tools'

function jsonResponse(body: unknown, init?: { ok?: boolean; status?: number }): Response {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: async () => body,
  } as unknown as Response
}

function mockFetch(impl: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const fn = vi.fn(impl)
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('search_place (카카오 로컬)', () => {
  it('정상 응답을 파싱해 최대 5개 장소를 반환한다', async () => {
    vi.stubEnv('KAKAO_REST_API_KEY', 'test-key')
    const fetchFn = mockFetch(() =>
      jsonResponse({
        documents: [
          {
            place_name: '스타벅스 강남대로점',
            road_address_name: '서울 강남구 강남대로 390',
            address_name: '서울 강남구 역삼동 825',
            phone: '1522-3232',
            category_name: '음식점 > 카페 > 커피전문점 > 스타벅스',
            place_url: 'http://place.map.kakao.com/123',
            x: '127.0276',
            y: '37.4979',
          },
        ],
      }),
    )
    const r = await search_place('스타벅스', '강남')
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error('expected ok')
    expect(r.places).toHaveLength(1)
    expect(r.places[0]).toMatchObject({
      name: '스타벅스 강남대로점',
      address: '서울 강남구 강남대로 390',
      phone: '1522-3232',
    })
    expect(r.places[0].lat).toBeCloseTo(37.4979)
    expect(r.places[0].lng).toBeCloseTo(127.0276)
    // region 이 검색어 앞에 붙어 호출되는지 확인
    const calledUrl = String(fetchFn.mock.calls[0][0])
    expect(calledUrl).toContain(encodeURIComponent('강남 스타벅스'))
  })

  it('KAKAO_REST_API_KEY 가 없으면 missing_key 에러', async () => {
    vi.stubEnv('KAKAO_REST_API_KEY', '')
    const fetchFn = mockFetch(() => jsonResponse({ documents: [] }))
    const r = await search_place('카페')
    expect(r).toMatchObject({ ok: false, error: 'missing_key' })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('HTTP 오류면 request_failed 로 폴백', async () => {
    vi.stubEnv('KAKAO_REST_API_KEY', 'test-key')
    mockFetch(() => jsonResponse({}, { ok: false, status: 503 }))
    const r = await search_place('카페')
    expect(r).toMatchObject({ ok: false, error: 'request_failed' })
  })

  it('결과가 비면 no_results', async () => {
    vi.stubEnv('KAKAO_REST_API_KEY', 'test-key')
    mockFetch(() => jsonResponse({ documents: [] }))
    const r = await search_place('asdkljaslkdj')
    expect(r).toMatchObject({ ok: false, error: 'no_results' })
  })

  it('네트워크 예외도 request_failed 로 폴백', async () => {
    vi.stubEnv('KAKAO_REST_API_KEY', 'test-key')
    mockFetch(() => {
      throw new Error('ECONNRESET')
    })
    const r = await search_place('카페')
    expect(r).toMatchObject({ ok: false, error: 'request_failed' })
  })

  it('OpenAI function calling 스키마를 export 한다', () => {
    expect(searchPlaceTool.type).toBe('function')
    expect(searchPlaceTool.function.name).toBe('search_place')
    expect(searchPlaceTool.function.parameters).toMatchObject({ required: ['query'] })
  })
})

describe('search_web (네이버 검색)', () => {
  it('blog 검색 정상 응답을 파싱하고 HTML 태그/엔티티를 제거한다', async () => {
    vi.stubEnv('NAVER_CLIENT_ID', 'id')
    vi.stubEnv('NAVER_CLIENT_SECRET', 'secret')
    const fetchFn = mockFetch((url) => {
      expect(url).toContain('/blog.json')
      return jsonResponse({
        items: [
          {
            title: '<b>성수동</b> 카페 추천',
            link: 'https://blog.naver.com/x',
            description: '분위기 좋은 <b>카페</b> &amp; 디저트',
          },
        ],
      })
    })
    const r = await search_web('성수동 카페', 'blog')
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error('expected ok')
    expect(r.items[0]).toEqual({
      title: '성수동 카페 추천',
      link: 'https://blog.naver.com/x',
      description: '분위기 좋은 카페 & 디저트',
    })
    expect(fetchFn.mock.calls[0][1]?.headers).toMatchObject({ 'X-Naver-Client-Id': 'id', 'X-Naver-Client-Secret': 'secret' })
  })

  it('local 검색은 description 이 비면 도로명 주소로 대체', async () => {
    vi.stubEnv('NAVER_CLIENT_ID', 'id')
    vi.stubEnv('NAVER_CLIENT_SECRET', 'secret')
    mockFetch(() => jsonResponse({ items: [{ title: '맛집', link: 'http://x', description: '', roadAddress: '서울 마포구 양화로 1' }] }))
    const r = await search_web('맛집', 'local')
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error('expected ok')
    expect(r.items[0].description).toBe('서울 마포구 양화로 1')
  })

  it('잘못된 type 은 invalid_args', async () => {
    vi.stubEnv('NAVER_CLIENT_ID', 'id')
    vi.stubEnv('NAVER_CLIENT_SECRET', 'secret')
    // @ts-expect-error 의도적으로 잘못된 타입 전달
    const r = await search_web('x', 'video')
    expect(r).toMatchObject({ ok: false, error: 'invalid_args' })
  })

  it('CLIENT_ID/SECRET 둘 중 하나라도 없으면 missing_key', async () => {
    vi.stubEnv('NAVER_CLIENT_ID', 'id')
    vi.stubEnv('NAVER_CLIENT_SECRET', '')
    const fetchFn = mockFetch(() => jsonResponse({ items: [] }))
    const r = await search_web('x', 'news')
    expect(r).toMatchObject({ ok: false, error: 'missing_key' })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('HTTP 오류면 request_failed', async () => {
    vi.stubEnv('NAVER_CLIENT_ID', 'id')
    vi.stubEnv('NAVER_CLIENT_SECRET', 'secret')
    mockFetch(() => jsonResponse({}, { ok: false, status: 429 }))
    const r = await search_web('x', 'news')
    expect(r).toMatchObject({ ok: false, error: 'request_failed' })
  })

  it('결과 없음이면 no_results', async () => {
    vi.stubEnv('NAVER_CLIENT_ID', 'id')
    vi.stubEnv('NAVER_CLIENT_SECRET', 'secret')
    mockFetch(() => jsonResponse({ items: [] }))
    const r = await search_web('zzz', 'blog')
    expect(r).toMatchObject({ ok: false, error: 'no_results' })
  })
})

describe('get_weather (기상청 단기예보)', () => {
  it('normalizeCityName 은 행정 접미사를 떼어낸다', () => {
    expect(normalizeCityName('서울특별시')).toBe('서울')
    expect(normalizeCityName('부산광역시')).toBe('부산')
    expect(normalizeCityName('  대구시 ')).toBe('대구')
    expect(normalizeCityName('세종특별자치시')).toBe('세종')
  })

  it('computeBaseDateTime 은 KST 기준 가장 가까운 과거 발표시각을 고른다', () => {
    // 2026-05-12 05:30Z = 14:30 KST → 14시 발표
    expect(computeBaseDateTime(Date.UTC(2026, 4, 12, 5, 30))).toEqual({ baseDate: '20260512', baseTime: '1400' })
    // 2026-05-12 00:30Z = 09:30 KST → 08시 발표
    expect(computeBaseDateTime(Date.UTC(2026, 4, 12, 0, 30))).toEqual({ baseDate: '20260512', baseTime: '0800' })
    // 2026-05-11 16:30Z = 2026-05-12 01:30 KST → 02시 이전 → 전날 23시 발표
    expect(computeBaseDateTime(Date.UTC(2026, 4, 11, 16, 30))).toEqual({ baseDate: '20260511', baseTime: '2300' })
  })

  it('정상 응답에서 가장 가까운 시각의 핵심 날씨를 요약한다', async () => {
    vi.stubEnv('KMA_API_KEY', 'kma-key')
    mockFetch(() =>
      jsonResponse({
        response: {
          header: { resultCode: '00', resultMsg: 'NORMAL_SERVICE' },
          body: {
            items: {
              item: [
                { category: 'TMP', fcstDate: '20260512', fcstTime: '1500', fcstValue: '23' },
                { category: 'POP', fcstDate: '20260512', fcstTime: '1500', fcstValue: '20' },
                { category: 'SKY', fcstDate: '20260512', fcstTime: '1500', fcstValue: '3' },
                { category: 'PTY', fcstDate: '20260512', fcstTime: '1500', fcstValue: '0' },
                { category: 'WSD', fcstDate: '20260512', fcstTime: '1500', fcstValue: '2.5' },
                { category: 'REH', fcstDate: '20260512', fcstTime: '1500', fcstValue: '55' },
                { category: 'TMP', fcstDate: '20260512', fcstTime: '1600', fcstValue: '22' },
              ],
            },
          },
        },
      }),
    )
    const r = await get_weather('서울특별시')
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error('expected ok')
    expect(r.city).toBe('서울')
    expect(r.nx).toBe(60)
    expect(r.forecast).toMatchObject({
      time: '1500',
      temperatureC: 23,
      precipitationProbability: 20,
      precipitationType: '없음',
      sky: '구름많음',
      windSpeedMs: 2.5,
      humidity: 55,
    })
    expect(r.summary).toContain('구름많음')
    expect(r.summary).toContain('23℃')
  })

  it('지원하지 않는 도시면 invalid_args (호출 안 함)', async () => {
    vi.stubEnv('KMA_API_KEY', 'kma-key')
    const fetchFn = mockFetch(() => jsonResponse({}))
    const r = await get_weather('뉴욕')
    expect(r).toMatchObject({ ok: false, error: 'invalid_args' })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('KMA_API_KEY 없으면 missing_key', async () => {
    vi.stubEnv('KMA_API_KEY', '')
    const fetchFn = mockFetch(() => jsonResponse({}))
    const r = await get_weather('서울')
    expect(r).toMatchObject({ ok: false, error: 'missing_key' })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('기상청 resultCode 가 정상이 아니면 request_failed', async () => {
    vi.stubEnv('KMA_API_KEY', 'kma-key')
    mockFetch(() => jsonResponse({ response: { header: { resultCode: '03', resultMsg: 'NO_DATA' } } }))
    const r = await get_weather('서울')
    expect(r).toMatchObject({ ok: false, error: 'request_failed' })
  })

  it('HTTP 오류면 request_failed', async () => {
    vi.stubEnv('KMA_API_KEY', 'kma-key')
    mockFetch(() => jsonResponse({}, { ok: false, status: 500 }))
    const r = await get_weather('부산')
    expect(r).toMatchObject({ ok: false, error: 'request_failed' })
  })

  it('스키마에 지원 도시 목록이 들어 있다', () => {
    expect(getWeatherTool.function.name).toBe('get_weather')
    const desc = getWeatherTool.function.description
    for (const city of ['서울', '부산', '대구', '인천', '광주', '대전', '울산']) {
      expect(desc).toContain(city)
    }
  })
})

describe('search_address (도로명주소)', () => {
  it('정상 응답을 파싱해 도로명/지번/우편번호/영문주소를 반환한다', async () => {
    vi.stubEnv('JUSO_API_KEY', 'juso-key')
    const fetchFn = mockFetch(() =>
      jsonResponse({
        results: {
          common: { errorCode: '0', errorMessage: '정상', totalCount: '1' },
          juso: [
            {
              roadAddr: '서울특별시 강남구 테헤란로 152',
              jibunAddr: '서울특별시 강남구 역삼동 737',
              zipNo: '06236',
              engAddr: '152 Teheran-ro, Gangnam-gu, Seoul',
            },
          ],
        },
      }),
    )
    const r = await search_address('테헤란로 152')
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error('expected ok')
    expect(r.addresses[0]).toEqual({
      roadAddress: '서울특별시 강남구 테헤란로 152',
      jibunAddress: '서울특별시 강남구 역삼동 737',
      zipCode: '06236',
      englishAddress: '152 Teheran-ro, Gangnam-gu, Seoul',
    })
    // Referer 헤더 기본값 확인
    expect(fetchFn.mock.calls[0][1]?.headers).toMatchObject({ Referer: 'http://localhost:3000/' })
  })

  it('JUSO_API_KEY 없으면 missing_key', async () => {
    vi.stubEnv('JUSO_API_KEY', '')
    const fetchFn = mockFetch(() => jsonResponse({}))
    const r = await search_address('서울시청')
    expect(r).toMatchObject({ ok: false, error: 'missing_key' })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('juso API errorCode 가 정상이 아니면 request_failed', async () => {
    vi.stubEnv('JUSO_API_KEY', 'juso-key')
    mockFetch(() => jsonResponse({ results: { common: { errorCode: 'E0005', errorMessage: '검색어 오류' }, juso: null } }))
    const r = await search_address('!!')
    expect(r).toMatchObject({ ok: false, error: 'request_failed' })
  })

  it('결과 없음이면 no_results', async () => {
    vi.stubEnv('JUSO_API_KEY', 'juso-key')
    mockFetch(() => jsonResponse({ results: { common: { errorCode: '0' }, juso: [] } }))
    const r = await search_address('존재하지않는주소xyz')
    expect(r).toMatchObject({ ok: false, error: 'no_results' })
  })

  it('Referer 는 JUSO_API_REFERER 로 덮어쓸 수 있다', async () => {
    vi.stubEnv('JUSO_API_KEY', 'juso-key')
    vi.stubEnv('JUSO_API_REFERER', 'https://prod.example.com/')
    const fetchFn = mockFetch(() =>
      jsonResponse({ results: { common: { errorCode: '0' }, juso: [{ roadAddr: 'a', jibunAddr: 'b', zipNo: 'c', engAddr: 'd' }] } }),
    )
    await search_address('x')
    expect(fetchFn.mock.calls[0][1]?.headers).toMatchObject({ Referer: 'https://prod.example.com/' })
  })

  it('HTTP 오류면 request_failed', async () => {
    vi.stubEnv('JUSO_API_KEY', 'juso-key')
    mockFetch(() => jsonResponse({}, { ok: false, status: 500 }))
    const r = await search_address('x')
    expect(r).toMatchObject({ ok: false, error: 'request_failed' })
  })
})

describe('tools index (toolDefinitions / toolHandlers / runTool)', () => {
  it('4개 도구 정의를 OpenAI function 형식으로 export 한다', () => {
    expect(toolDefinitions).toHaveLength(4)
    expect(toolDefinitions.map((t) => t.function.name)).toEqual(['search_place', 'search_web', 'get_weather', 'search_address'])
    for (const t of toolDefinitions) {
      expect(t.type).toBe('function')
      expect(typeof t.function.description).toBe('string')
      expect(t.function.parameters).toMatchObject({ type: 'object' })
    }
  })

  it('toolHandlers / TOOL_NAMES 가 4개 도구를 모두 포함한다', () => {
    expect([...TOOL_NAMES].sort()).toEqual(['get_weather', 'search_address', 'search_place', 'search_web'])
    expect(Object.keys(toolHandlers).sort()).toEqual(['get_weather', 'search_address', 'search_place', 'search_web'])
  })

  it('runTool 은 알 수 없는 도구에 invalid_args 를 반환한다', async () => {
    const r = await runTool('does_not_exist', {})
    expect(r).toMatchObject({ ok: false, error: 'invalid_args' })
  })

  it('runTool 은 핸들러를 통해 도구를 실행한다 (키 누락 시 missing_key 전달)', async () => {
    vi.stubEnv('KAKAO_REST_API_KEY', '')
    const r = await runTool('search_place', { query: '카페', region: '강남' })
    expect(r).toMatchObject({ ok: false, error: 'missing_key' })
  })
})
