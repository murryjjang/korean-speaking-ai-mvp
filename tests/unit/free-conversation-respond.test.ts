// 자유 대화 respond 라우트 통합 테스트 (v1.1: 페르소나 + function calling).
//
// openai SDK 와 fetch 를 모킹한다.
// - OPENAI_API_KEY 없음 → mock 폴백
// - 도구 호출 없는 일반 대화 (회귀 없음)
// - 도구 호출 1회 / 여러 회
// - 페르소나 주입 / 잘못된 personaId → 기본값
// - 도구 라운드 상한 / LLM 오류 → mock 폴백

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }))

vi.mock('openai', () => {
  class OpenAI {
    chat = { completions: { create: createMock } }
    constructor(_config: { apiKey: string }) {
      void _config
    }
  }
  return { OpenAI }
})

import { POST } from '@/app/api/conversation/free/respond/route'

function req(body: unknown): Request {
  return new Request('http://localhost/api/conversation/free/respond', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function llmText(content: string) {
  return { choices: [{ message: { role: 'assistant', content } }] }
}
function llmToolCall(name: string, args: Record<string, unknown>, id = `call_${name}`) {
  return {
    choices: [
      {
        message: {
          role: 'assistant',
          content: null,
          tool_calls: [{ id, type: 'function', function: { name, arguments: JSON.stringify(args) } }],
        },
      },
    ],
  }
}
const FINAL_JSON = JSON.stringify({
  npc_response: '좋아요! 그럼 그렇게 해요.',
  learner_correction: { original: 'X', corrected: 'X', reason: '자연스럽게 잘 말씀하셨어요.' },
})

function stubFetchJson(body: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => body }) as unknown as Response))
}

beforeEach(() => {
  createMock.mockReset()
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('POST /api/conversation/free/respond', () => {
  it('필수값 검증: topic 없으면 400', async () => {
    const res = await POST(req({ latestStudentText: '안녕' }))
    expect(res.status).toBe(400)
  })

  it('필수값 검증: 학습자 발화 없으면 400', async () => {
    const res = await POST(req({ topic: '날씨' }))
    expect(res.status).toBe(400)
  })

  it('OPENAI_API_KEY 없으면 mock 폴백 (persona_id 포함)', async () => {
    vi.stubEnv('OPENAI_API_KEY', '')
    const res = await POST(req({ topic: '주말 계획', latestStudentText: '한강 가고 싶어요' }))
    const json = await res.json()
    expect(json.source).toBe('mock')
    expect(json.persona_id).toBe('friend_casual')
    expect(json.tools_used).toEqual([])
    expect(typeof json.npc_response).toBe('string')
    expect(json.learner_correction.original).toBe('한강 가고 싶어요')
    expect(createMock).not.toHaveBeenCalled()
  })

  it('도구 호출 없는 일반 대화 — 회귀 없이 LLM 응답 그대로 반환', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    // 도구 키는 없게 둔다 → tools 미노출
    createMock.mockResolvedValueOnce(llmText(FINAL_JSON))
    const res = await POST(req({ topic: '좋아하는 영화', latestStudentText: '저는 액션 영화를 좋아해요' }))
    const json = await res.json()
    expect(json.source).toBe('llm')
    expect(json.npc_response).toBe('좋아요! 그럼 그렇게 해요.')
    expect(json.tools_used).toEqual([])
    expect(createMock).toHaveBeenCalledTimes(1)
    const params = createMock.mock.calls[0][0]
    expect(params.response_format).toEqual({ type: 'json_object' })
    expect(params.tools).toBeUndefined() // 키 없으므로 도구 비노출
  })

  it('페르소나 주입: korean_life_helper 시 시스템 프롬프트에 캐릭터 시트 반영', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    createMock.mockResolvedValueOnce(llmText(FINAL_JSON))
    await POST(req({ topic: '오늘 날씨', personaId: 'korean_life_helper', latestStudentText: '오늘 날씨 어때요?' }))
    const sys = createMock.mock.calls[0][0].messages[0].content as string
    // v1.1 단계 9: nameKo는 캐릭터 이름(서연), 캐릭터 시트에 직업·연령 표현 포함
    expect(sys).toContain('서연')
    expect(sys).toContain('관광 안내 센터')
    // 주제 유지·회귀 원칙·Few-shot 예시가 페르소나 프롬프트에 함께 들어간다
    expect(sys).toContain('[주제 유지·회귀 원칙]')
    expect(sys).toContain('[Few-shot 예시')
  })

  it('시스템 프롬프트에 마크다운 금지(평문 출력) 지시가 포함된다 — TTS용', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    createMock.mockResolvedValueOnce(llmText(FINAL_JSON))
    await POST(req({ topic: '맛집·카페 찾기', personaId: 'korean_life_helper', latestStudentText: '강남 카페 추천해 주세요' }))
    const sys = createMock.mock.calls[0][0].messages[0].content as string
    expect(sys).toContain('평문')
    expect(sys).toContain('마크다운')
    // 별표·헤더 등 금지 문자를 안내
    expect(sys).toMatch(/\*\*/)
  })

  it('잘못된 personaId는 기본 페르소나(friend_casual)로 대체', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    createMock.mockResolvedValueOnce(llmText(FINAL_JSON))
    const res = await POST(req({ topic: '취미', personaId: 'does_not_exist', latestStudentText: '안녕하세요' }))
    const json = await res.json()
    expect(json.persona_id).toBe('friend_casual')
  })

  it('도구 호출 1회 — search_place 실행 후 최종 응답', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    vi.stubEnv('KAKAO_REST_API_KEY', 'kakao-key')
    stubFetchJson({ documents: [{ place_name: '카페A', road_address_name: '서울 강남구 1', address_name: '', phone: '02-1', category_name: '카페', place_url: 'u', x: '127', y: '37' }] })
    createMock
      .mockResolvedValueOnce(llmToolCall('search_place', { query: '카페', region: '강남' }))
      .mockResolvedValueOnce(llmText(FINAL_JSON))

    const res = await POST(req({ topic: '맛집·카페 찾기', personaId: 'korean_life_helper', latestStudentText: '강남 카페 추천해 주세요' }))
    const json = await res.json()
    expect(json.source).toBe('llm')
    expect(json.tools_used).toEqual(['search_place'])
    expect(createMock).toHaveBeenCalledTimes(2)
    // 1회차엔 tools 노출
    expect(createMock.mock.calls[0][0].tools).toBeDefined()
    // 2회차 메시지에 assistant(tool_calls) + tool 결과가 누적되어야 함
    const msgs2 = createMock.mock.calls[1][0].messages
    expect(msgs2.some((m: { role: string }) => m.role === 'assistant' && 'tool_calls' in m)).toBe(true)
    const toolMsg = msgs2.find((m: { role: string }) => m.role === 'tool')
    expect(toolMsg).toBeTruthy()
    expect(JSON.parse(toolMsg.content).ok).toBe(true)
  })

  it('도구 호출 여러 회 — get_weather 후 search_place 후 최종 응답', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    vi.stubEnv('KMA_API_KEY', 'kma-key')
    vi.stubEnv('KAKAO_REST_API_KEY', 'kakao-key')
    let call = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        call++
        if (String(url).includes('VilageFcstInfoService')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              response: {
                header: { resultCode: '00' },
                body: { items: { item: [{ category: 'TMP', fcstDate: '20260512', fcstTime: '1500', fcstValue: '20' }, { category: 'PTY', fcstDate: '20260512', fcstTime: '1500', fcstValue: '0' }, { category: 'SKY', fcstDate: '20260512', fcstTime: '1500', fcstValue: '1' }] } },
              },
            }),
          } as unknown as Response
        }
        return { ok: true, status: 200, json: async () => ({ documents: [{ place_name: '한강공원', road_address_name: '서울 영등포구 1', address_name: '', phone: '', category_name: '공원', place_url: 'u', x: '126', y: '37' }] }) } as unknown as Response
      }),
    )
    createMock
      .mockResolvedValueOnce(llmToolCall('get_weather', { city: '서울' }, 'c1'))
      .mockResolvedValueOnce(llmToolCall('search_place', { query: '한강공원' }, 'c2'))
      .mockResolvedValueOnce(llmText(FINAL_JSON))

    const res = await POST(req({ topic: '오늘 날씨와 외출 계획', personaId: 'korean_life_helper', latestStudentText: '오늘 비 와요? 안 오면 한강 가고 싶어요' }))
    const json = await res.json()
    expect(json.source).toBe('llm')
    expect(json.tools_used).toEqual(['get_weather', 'search_place'])
    expect(createMock).toHaveBeenCalledTimes(3)
    expect(call).toBe(2) // 외부 API 2회 호출
  })

  it('도구 라운드 상한(3) — 그 이상은 도구 없이 최종 답변 강제', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    vi.stubEnv('KAKAO_REST_API_KEY', 'kakao-key')
    stubFetchJson({ documents: [{ place_name: 'x', road_address_name: 'y', address_name: '', phone: '', category_name: '', place_url: '', x: '1', y: '1' }] })
    // 라운드 0,1,2 는 계속 도구 호출, 라운드 3 은 tools 미노출이므로 텍스트가 와야 정상.
    createMock
      .mockResolvedValueOnce(llmToolCall('search_place', { query: 'a' }, 'c1'))
      .mockResolvedValueOnce(llmToolCall('search_place', { query: 'b' }, 'c2'))
      .mockResolvedValueOnce(llmToolCall('search_place', { query: 'c' }, 'c3'))
      .mockResolvedValueOnce(llmText(FINAL_JSON))

    const res = await POST(req({ topic: '카페', personaId: 'korean_life_helper', latestStudentText: '카페 추천' }))
    const json = await res.json()
    expect(json.source).toBe('llm')
    expect(json.tools_used).toEqual(['search_place', 'search_place', 'search_place'])
    expect(createMock).toHaveBeenCalledTimes(4)
    // 마지막(4번째) 호출엔 tools 가 없어야 함
    expect(createMock.mock.calls[3][0].tools).toBeUndefined()
  })

  it('LLM 호출 실패 시 mock 폴백', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    createMock.mockRejectedValueOnce(new Error('network down'))
    const res = await POST(req({ topic: '가족 이야기', latestStudentText: '우리 가족은 네 명이에요' }))
    const json = await res.json()
    expect(json.source).toBe('mock')
    expect(json.persona_id).toBe('friend_casual')
  })

  it('최종 응답 JSON 이 깨져 있으면 mock 폴백', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    createMock.mockResolvedValueOnce(llmText('이건 JSON 이 아니에요'))
    const res = await POST(req({ topic: '여행', latestStudentText: '제주도 가고 싶어요' }))
    const json = await res.json()
    expect(json.source).toBe('mock')
  })
})
