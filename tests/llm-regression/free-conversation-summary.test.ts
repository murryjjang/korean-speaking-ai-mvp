// M3-a — 자유대화 요약 LLM 회귀 (mock, 항상 실행) #15
//
// 라우트는 LLM 출력을 "강제"하지 않고 파싱·passthrough 한다. 따라서 mock 으로는
//   (1) 프롬프트 계약(3단계 정의·anti-hallucination·언어 매트릭스·평문 규칙이
//       시스템 프롬프트에 주입되는지) → 프롬프트 drift 회귀 감지
//   (2) 파싱/passthrough (topic_adherence 보존·invalid→on·off→strengths[] 보존·
//       multilingual 4언어 객체 보존)
// 를 결정론적으로 검증한다. 실제 LLM 분류 정확도는 *.real.test.ts(LLM_REGRESSION_REAL).

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
import { ON_FIXTURES, OFF_FIXTURES } from './fixtures/free-conversation-summary.fixtures'

function req(body: unknown): Request {
  return new Request('http://localhost/api/conversation/free/summary', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function llmText(content: string) {
  return { choices: [{ message: { role: 'assistant', content } }] }
}

function nonMultiJson(
  adherence: string,
  strengths: string[],
  next_steps: string[],
): string {
  return JSON.stringify({
    topic_adherence: adherence,
    summary_ko: '주어진 주제로 대화한 요약입니다.',
    summary_l1: 'A summary of the conversation on the topic.',
    feedback_ko: { strengths, next_steps },
    feedback_l1: { strengths: strengths.length ? ['On-topic point.'] : [], next_steps: ['Try more.'] },
  })
}

function multiJson(adherence: string): string {
  const fbKo = { strengths: ['주제에 맞는 구체적 발화를 했어요.'], next_steps: ['더 다양한 표현을 써 보세요.'] }
  const fbX = { strengths: ['On-topic point.'], next_steps: ['Try more.'] }
  return JSON.stringify({
    topic_adherence: adherence,
    summary: { ko: '한국어 요약', en: 'English summary', vi: 'Tóm tắt', ar: 'ملخص' },
    feedback: { ko: fbKo, en: fbX, vi: fbX, ar: fbX },
  })
}

beforeEach(() => {
  createMock.mockReset()
  vi.stubEnv('OPENAI_API_KEY', 'sk-test')
})
afterEach(() => {
  vi.unstubAllEnvs()
})

describe('M3-a 자유대화 요약 회귀 — 프롬프트 계약 (mock)', () => {
  it('비multilingual: 3단계 정의·anti-hallucination·복귀 안내·평문·ko+l1 언어블록', async () => {
    const f = ON_FIXTURES.find((x) => x.lang === 'ko')!
    createMock.mockResolvedValueOnce(llmText(nonMultiJson('on', ['주제 관련 발화'], ['더 해보세요'])))
    await POST(req({ topic: f.topic, personaId: 'friend_casual', helperLang: f.helperLang, motherTongue: f.motherTongue, turns: f.turns }))
    const sys = createMock.mock.calls[0][0].messages[0].content as string

    // 3단계 판정
    expect(sys).toContain('topic_adherence')
    expect(sys).toContain('"on"')
    expect(sys).toContain('"partial"')
    expect(sys).toContain('"off"')
    expect(sys).toContain(f.topic)
    // anti-hallucination 규칙
    expect(sys).toContain('빈 배열') // off → strengths []
    expect(sys).toContain('최대 1개') // partial → ≤1
    expect(sys).toContain('자연스럽게 말했어요') // 금지 칭찬 어구
    // 복귀 안내
    expect(sys).toContain('맞춰 답변해')
    // 평문 규칙
    expect(sys).toContain('평문')
    expect(sys).toContain('마크다운')
    // 언어 블록: 비multilingual → ko + l1, multilingual 문구 없음
    expect(sys).toContain('한국어와')
    expect(sys).not.toContain('네 언어')
  })

  it('multilingual: ko·en·vi·ar 4언어 블록 주입', async () => {
    const f = ON_FIXTURES.find((x) => x.lang === 'en')!
    createMock.mockResolvedValueOnce(llmText(multiJson('on')))
    await POST(req({ topic: f.topic, helperLang: f.helperLang, motherTongue: f.motherTongue, turns: f.turns }))
    const sys = createMock.mock.calls[0][0].messages[0].content as string
    expect(sys).toContain('네 언어')
    expect(sys).toMatch(/ko.*en.*vi.*ar/s)
  })
})

describe('M3-a 자유대화 요약 회귀 — 파싱/passthrough (mock)', () => {
  it.each(['on', 'partial', 'off'])('topic_adherence "%s" 보존 (비multilingual)', async (adh) => {
    const strengths = adh === 'off' ? [] : ['관련 발화']
    createMock.mockResolvedValueOnce(llmText(nonMultiJson(adh, strengths, ['주제에 맞춰 답변해 보세요'])))
    const res = await POST(req({ topic: '맛집·카페 찾기', helperLang: 'en', motherTongue: 'ko', turns: ON_FIXTURES[0].turns }))
    const json = await res.json()
    expect(json.source).toBe('llm')
    expect(json.topic_adherence).toBe(adh)
  })

  it.each([
    ['maybe', 'maybe'],
    ['null', null],
    ['omitted', undefined],
  ])('invalid topic_adherence (%s) → on 폴백', async (_label, val) => {
    const obj: Record<string, unknown> = {
      summary_ko: '요약',
      summary_l1: 'summary',
      feedback_ko: { strengths: ['s'], next_steps: ['n'] },
      feedback_l1: { strengths: ['s'], next_steps: ['n'] },
    }
    if (val !== undefined) obj.topic_adherence = val
    createMock.mockResolvedValueOnce(llmText(JSON.stringify(obj)))
    const res = await POST(req({ topic: '취미', helperLang: 'en', motherTongue: 'ko', turns: ON_FIXTURES[0].turns }))
    const json = await res.json()
    expect(json.topic_adherence).toBe('on')
  })

  it('off: strengths 빈 배열 passthrough (환각 칭찬 차단)', async () => {
    createMock.mockResolvedValueOnce(llmText(nonMultiJson('off', [], ['주제(맛집·카페 찾기)에 맞춰 답변해 보세요'])))
    const res = await POST(req({ topic: '맛집·카페 찾기', helperLang: 'en', motherTongue: 'ko', turns: OFF_FIXTURES[0].turns }))
    const json = await res.json()
    expect(json.topic_adherence).toBe('off')
    expect(json.feedback_ko.strengths).toEqual([])
  })

  it('multilingual: 4언어 summary/feedback passthrough', async () => {
    createMock.mockResolvedValueOnce(llmText(multiJson('partial')))
    const res = await POST(req({ topic: '여행', helperLang: 'en', motherTongue: 'en', turns: ON_FIXTURES[1].turns }))
    const json = await res.json()
    expect(json.source).toBe('llm')
    expect(json.topic_adherence).toBe('partial')
    expect(json.summary.ko).toBeTruthy()
    expect(json.summary.en).toBeTruthy()
    expect(json.summary.vi).toBeTruthy()
    expect(json.summary.ar).toBeTruthy()
    expect(json.feedback.ko.strengths.length).toBeGreaterThan(0)
  })
})
