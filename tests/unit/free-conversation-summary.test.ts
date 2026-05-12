// 자유 대화 summary 라우트 — 시스템 프롬프트 평문(마크다운 금지) 지시 검증.
//
// openai SDK 를 모킹한다. 핵심 회귀(LLM 정상 응답 / 키 없음 → mock 폴백)도 함께 확인.

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

import { POST } from '@/app/api/conversation/free/summary/route'

function req(body: unknown): Request {
  return new Request('http://localhost/api/conversation/free/summary', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const TURNS = [
  { role: 'ai', text: '안녕하세요! 무엇을 도와드릴까요?' },
  { role: 'student', text: '강남 카페 추천해 주세요' },
  { role: 'ai', text: '그 중에서도 스타벅스 강남점이 가장 인기가 많아요.' },
]

const SUMMARY_JSON = JSON.stringify({
  summary_ko: '강남 카페를 주제로 대화했습니다.',
  summary_l1: 'You talked about cafes in Gangnam.',
  feedback_ko: { strengths: ['주제에 맞게 질문했어요.'], next_steps: ['다양한 표현을 써 보세요.'] },
  feedback_l1: { strengths: ['You asked on topic.'], next_steps: ['Try more varied expressions.'] },
})

function llmText(content: string) {
  return { choices: [{ message: { role: 'assistant', content } }] }
}

beforeEach(() => {
  createMock.mockReset()
})
afterEach(() => {
  vi.unstubAllEnvs()
})

describe('POST /api/conversation/free/summary', () => {
  it('topic 없으면 400', async () => {
    const res = await POST(req({ turns: TURNS }))
    expect(res.status).toBe(400)
  })

  it('OPENAI_API_KEY 없으면 mock 폴백', async () => {
    vi.stubEnv('OPENAI_API_KEY', '')
    const res = await POST(req({ topic: '맛집·카페 찾기', helperLang: 'en', turns: TURNS }))
    const json = await res.json()
    expect(json.source).toBe('mock')
    expect(createMock).not.toHaveBeenCalled()
  })

  it('시스템 프롬프트에 마크다운 금지(평문 출력) 지시가 포함된다', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    createMock.mockResolvedValueOnce(llmText(SUMMARY_JSON))
    await POST(req({ topic: '맛집·카페 찾기', personaId: 'korean_life_helper', helperLang: 'en', turns: TURNS }))
    const sys = createMock.mock.calls[0][0].messages[0].content as string
    expect(sys).toContain('평문')
    expect(sys).toContain('마크다운')
  })

  it('LLM 정상 응답을 그대로 반환 (회귀 없음)', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    createMock.mockResolvedValueOnce(llmText(SUMMARY_JSON))
    const res = await POST(req({ topic: '맛집·카페 찾기', helperLang: 'en', turns: TURNS }))
    const json = await res.json()
    expect(json.source).toBe('llm')
    expect(json.summary_ko).toContain('강남')
    expect(json.feedback_ko.strengths.length).toBeGreaterThan(0)
  })
})
