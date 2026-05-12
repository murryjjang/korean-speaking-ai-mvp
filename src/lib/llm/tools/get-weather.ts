// get_weather — 기상청 단기예보 (동네예보) 조회.
//
// 문서: 공공데이터포털 기상청 단기예보 조회서비스 (VilageFcstInfoService_2.0/getVilageFcst)
// 환경변수: KMA_API_KEY (data.go.kr 일반 인증키 — Decoding 키 권장)
//
// base_time 은 발표시각 02·05·08·11·14·17·20·23시 중 "호출 시각 기준 가장 가까운 과거"를 자동 계산.
// (예: 09:30 호출 → base_time 0800. 01:00 호출 → 전날 base_date + base_time 2300)
// 시각 기준은 KST(UTC+9) — 서버 타임존과 무관하게 계산한다.

import { type OpenAIToolDefinition, type ToolErrorResult, toolError } from './types'

const KMA_VILAGE_FCST_URL = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst'

// 도시명 → 기상청 격자 좌표(nx, ny). 최소 7대 광역시 + 자주 쓰는 지역 몇 곳.
const CITY_GRID: Record<string, { nx: number; ny: number }> = {
  서울: { nx: 60, ny: 127 },
  부산: { nx: 98, ny: 76 },
  대구: { nx: 89, ny: 90 },
  인천: { nx: 55, ny: 124 },
  광주: { nx: 58, ny: 74 },
  대전: { nx: 67, ny: 100 },
  울산: { nx: 102, ny: 84 },
  세종: { nx: 66, ny: 103 },
  수원: { nx: 60, ny: 121 },
  제주: { nx: 52, ny: 38 },
}

const SUPPORTED_CITIES = Object.keys(CITY_GRID)

const BASE_TIME_SLOTS = [2, 5, 8, 11, 14, 17, 20, 23] as const

export type WeatherResult =
  | {
      ok: true
      city: string
      nx: number
      ny: number
      baseDate: string
      baseTime: string
      forecast: {
        date: string
        time: string
        temperatureC: number | null
        precipitationProbability: number | null // %
        precipitationType: string // 없음 / 비 / 비/눈 / 눈 / 소나기
        sky: string // 맑음 / 구름많음 / 흐림
        windSpeedMs: number | null
        humidity: number | null // %
      }
      summary: string
    }
  | ToolErrorResult

/** 도시명 정규화 — "서울특별시", "부산광역시", "대구시" 등 접미사를 떼어낸다. */
export function normalizeCityName(input: string): string {
  return (input ?? '')
    .trim()
    .replace(/특별자치시$/, '')
    .replace(/특별자치도$/, '')
    .replace(/특별시$/, '')
    .replace(/광역시$/, '')
    .replace(/시$/, '')
    .replace(/도$/, '')
    .trim()
}

/** KST 기준, 발표시각 슬롯 중 호출 시각 기준 가장 가까운 과거를 base_date/base_time 으로 반환. */
export function computeBaseDateTime(nowUtcMs: number = Date.now()): { baseDate: string; baseTime: string } {
  // KST = UTC+9. UTC 기준 시각에 9시간을 더한 뒤 getUTC* 로 읽으면 KST 달력값이 된다.
  const kst = new Date(nowUtcMs + 9 * 60 * 60 * 1000)
  const hour = kst.getUTCHours()
  let slot = -1
  for (const s of BASE_TIME_SLOTS) if (s <= hour) slot = s
  if (slot === -1) {
    // 02시 이전 — 전날 23시 발표분 사용
    kst.setUTCDate(kst.getUTCDate() - 1)
    slot = 23
  }
  const y = kst.getUTCFullYear()
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0')
  const d = String(kst.getUTCDate()).padStart(2, '0')
  return { baseDate: `${y}${m}${d}`, baseTime: `${String(slot).padStart(2, '0')}00` }
}

const SKY_TEXT: Record<string, string> = { '1': '맑음', '3': '구름많음', '4': '흐림' }
const PTY_TEXT: Record<string, string> = {
  '0': '없음',
  '1': '비',
  '2': '비/눈',
  '3': '눈',
  '4': '소나기',
  '5': '빗방울',
  '6': '빗방울눈날림',
  '7': '눈날림',
}

type KmaItem = {
  category?: string
  fcstDate?: string
  fcstTime?: string
  fcstValue?: string
}
type KmaResponse = {
  response?: {
    header?: { resultCode?: string; resultMsg?: string }
    body?: { items?: { item?: KmaItem[] } }
  }
}

function num(v: string | undefined): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** 도시 이름으로 기상청 단기예보를 조회해 가장 가까운 시각의 핵심 날씨를 요약한다. */
export async function get_weather(city: string): Promise<WeatherResult> {
  const normalized = normalizeCityName(city)
  if (!normalized) return toolError('invalid_args', '도시명(city)이 비어 있습니다.')
  const grid = CITY_GRID[normalized]
  if (!grid) {
    return toolError('invalid_args', `'${city}' 격자 좌표를 모릅니다. 지원 도시: ${SUPPORTED_CITIES.join(', ')}`)
  }

  const key = process.env.KMA_API_KEY
  if (!key) return toolError('missing_key', 'KMA_API_KEY가 설정되지 않아 날씨 조회를 사용할 수 없습니다.')

  const { baseDate, baseTime } = computeBaseDateTime()
  const params = new URLSearchParams({
    pageNo: '1',
    numOfRows: '1000',
    dataType: 'JSON',
    base_date: baseDate,
    base_time: baseTime,
    nx: String(grid.nx),
    ny: String(grid.ny),
  })
  const url = `${KMA_VILAGE_FCST_URL}?serviceKey=${encodeURIComponent(key)}&${params.toString()}`

  try {
    const res = await fetch(url)
    if (!res.ok) {
      return toolError('request_failed', `기상청 단기예보 API 호출 실패 (HTTP ${res.status}).`)
    }
    const json = (await res.json()) as KmaResponse
    const resultCode = json.response?.header?.resultCode
    if (resultCode && resultCode !== '00') {
      return toolError('request_failed', `기상청 API 오류: ${json.response?.header?.resultMsg ?? resultCode}`)
    }
    const items = json.response?.body?.items?.item
    if (!Array.isArray(items) || items.length === 0) {
      return toolError('no_results', `'${normalized}'의 예보 데이터가 없습니다.`)
    }
    // 가장 이른 fcstDate+fcstTime 그룹 = 호출 시각 기준 가장 가까운 미래 예보 시각
    const keys = items
      .filter((it) => it.fcstDate && it.fcstTime)
      .map((it) => `${it.fcstDate}${it.fcstTime}`)
      .sort()
    const firstKey = keys[0]
    if (!firstKey) return toolError('no_results', `'${normalized}'의 예보 데이터가 없습니다.`)
    const group = items.filter((it) => `${it.fcstDate}${it.fcstTime}` === firstKey)
    const pick = (cat: string) => group.find((it) => it.category === cat)?.fcstValue

    const temperatureC = num(pick('TMP'))
    const precipitationProbability = num(pick('POP'))
    const ptyRaw = pick('PTY') ?? '0'
    const skyRaw = pick('SKY') ?? ''
    const windSpeedMs = num(pick('WSD'))
    const humidity = num(pick('REH'))
    const precipitationType = PTY_TEXT[ptyRaw] ?? '없음'
    const sky = SKY_TEXT[skyRaw] ?? '정보없음'

    const fDate = group[0]?.fcstDate ?? baseDate
    const fTime = group[0]?.fcstTime ?? ''
    const hh = fTime.slice(0, 2)

    const parts: string[] = [`${normalized} ${hh}시 기준`]
    if (temperatureC != null) parts.push(`기온 ${temperatureC}℃`)
    parts.push(`하늘 ${sky}`)
    if (precipitationType !== '없음') parts.push(`강수 ${precipitationType}`)
    if (precipitationProbability != null) parts.push(`강수확률 ${precipitationProbability}%`)
    if (windSpeedMs != null) parts.push(`바람 ${windSpeedMs}m/s`)
    if (humidity != null) parts.push(`습도 ${humidity}%`)
    const summary = parts.join(', ')

    return {
      ok: true,
      city: normalized,
      nx: grid.nx,
      ny: grid.ny,
      baseDate,
      baseTime,
      forecast: {
        date: fDate,
        time: fTime,
        temperatureC,
        precipitationProbability,
        precipitationType,
        sky,
        windSpeedMs,
        humidity,
      },
      summary,
    }
  } catch (err) {
    return toolError('request_failed', `기상청 단기예보 API 호출 중 오류: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export const getWeatherTool: OpenAIToolDefinition = {
  type: 'function',
  function: {
    name: 'get_weather',
    description: `기상청 단기예보로 한국 주요 도시의 가장 가까운 시각 날씨(기온·하늘상태·강수확률·강수형태·풍속·습도)를 조회한다. 지원 도시: ${SUPPORTED_CITIES.join(', ')}.`,
    parameters: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: `날씨를 조회할 도시명. ${SUPPORTED_CITIES.join(' / ')} 중 하나. "서울특별시", "부산광역시" 처럼 접미사가 붙어도 인식한다.`,
        },
      },
      required: ['city'],
    },
  },
}
