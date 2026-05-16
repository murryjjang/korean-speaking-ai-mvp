// v1.1 단계 18 [J]: LLM_EVAL_PROVIDER 가시성 — 환경변수 분기 + 부팅 로그.
//
// 세 가지 환경 케이스(openai, mock, 미설정·알수없음)에 대해:
//   1. evaluateSpeakingDetail()이 올바른 providerName으로 응답
//   2. 부팅 로그가 1회만 출력
//   3. 알 수 없는 값 → mock 폴백 + WARN 로그

import { describe, expect, it, beforeEach, vi } from 'vitest'

import { evaluateSpeakingDetail, _resetEvalBootLogForTests } from '@/src/providers/llm-eval'

describe('LLM_EVAL_PROVIDER resolution', () => {
  beforeEach(() => {
    _resetEvalBootLogForTests()
    vi.restoreAllMocks()
  })

  it('LLM_EVAL_PROVIDER=mock → mock provider, 부팅 로그 1회', async () => {
    vi.stubEnv('LLM_EVAL_PROVIDER', 'mock')
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    const r1 = await evaluateSpeakingDetail({
      transcript: '안녕하세요. 한국어를 공부합니다.',
      rubricId: 'rubric-speaking-01',
    })
    const r2 = await evaluateSpeakingDetail({
      transcript: '두 번째 호출입니다.',
      rubricId: 'rubric-speaking-01',
    })
    expect(r1.providerName).toBe('mock')
    expect(r2.providerName).toBe('mock')
    const bootLogs = infoSpy.mock.calls.filter((c) =>
      typeof c[0] === 'string' && c[0].startsWith('[eval] LLM_EVAL_PROVIDER='),
    )
    expect(bootLogs).toHaveLength(1)
    expect(bootLogs[0][0]).toContain('using mock provider')
  })

  it('LLM_EVAL_PROVIDER 미설정 → mock 폴백 (reason=unset)', async () => {
    vi.stubEnv('LLM_EVAL_PROVIDER', '')
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    const r = await evaluateSpeakingDetail({
      transcript: '미설정 환경 테스트입니다.',
      rubricId: 'rubric-speaking-01',
    })
    expect(r.providerName).toBe('mock')
    const bootLogs = infoSpy.mock.calls.filter((c) =>
      typeof c[0] === 'string' && c[0].startsWith('[eval] LLM_EVAL_PROVIDER='),
    )
    expect(bootLogs).toHaveLength(1)
  })

  it('알 수 없는 값 → mock 폴백 + WARN 로그', async () => {
    vi.stubEnv('LLM_EVAL_PROVIDER', 'gemini')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})

    const r = await evaluateSpeakingDetail({
      transcript: '알 수 없는 값 테스트입니다.',
      rubricId: 'rubric-speaking-01',
    })
    expect(r.providerName).toBe('mock')
    const warnLogs = warnSpy.mock.calls.filter((c) =>
      typeof c[0] === 'string' && c[0].includes('LLM_EVAL_PROVIDER="gemini"'),
    )
    expect(warnLogs.length).toBeGreaterThan(0)
  })

  it('openai 설정 + API_KEY 없음 → mock 폴백 (reason=openai_no_api_key)', async () => {
    vi.stubEnv('LLM_EVAL_PROVIDER', 'openai')
    vi.stubEnv('OPENAI_API_KEY', '')
    vi.spyOn(console, 'info').mockImplementation(() => {})

    const r = await evaluateSpeakingDetail({
      transcript: 'API 키 없음 테스트입니다.',
      rubricId: 'rubric-speaking-01',
    })
    expect(r.providerName).toBe('mock')
    expect(r.status).toBe('fallback')
  })
})
