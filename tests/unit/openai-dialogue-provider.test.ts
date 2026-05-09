import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  OpenAIDialogueConversationProvider,
  __test__,
} from '@/src/providers/conversation/openai'
import type {
  DialogueConversationInput,
  DialogueTurnInput,
} from '@/src/providers/conversation'

// ── Mock the openai SDK ────────────────────────────────────────────────────
// The provider does `await import('openai')`, so the mock must expose `OpenAI`
// as a constructor whose instance has chat.completions.create().

const createMock = vi.fn()

vi.mock('openai', () => {
  // class form so `new OpenAI()` works as a constructor under vitest
  class OpenAI {
    chat = { completions: { create: createMock } }
    constructor(_config: { apiKey: string }) {
      void _config
    }
  }
  return { OpenAI }
})

function makeInput(overrides: Partial<DialogueConversationInput> = {}): DialogueConversationInput {
  return {
    questionId: 'beginner-q4-dialogue-mission',
    level: 'beginner',
    aiRole: '카페 점원',
    aiInformation: '한국 도심의 친절한 카페 점원. 음료와 디저트 주문을 받는다.',
    missionGoals: ['음료 선택', '수량 확인', '매장/포장 결정', '결제 의사 표현'],
    turns: [],
    latestStudentText: '아메리카노 한 잔 주세요',
    mode: 'assessment',
    ...overrides,
  }
}

function makeOpenAIResponse(content: string) {
  return {
    choices: [{ message: { content } }],
    usage: { prompt_tokens: 100, completion_tokens: 30, total_tokens: 130 },
  }
}

describe('OpenAIDialogueConversationProvider', () => {
  beforeEach(() => {
    createMock.mockReset()
  })

  it('인스턴스 생성: apiKey 없으면 throw', () => {
    expect(() => new OpenAIDialogueConversationProvider('')).toThrow(/apiKey is required/)
  })

  it('인스턴스 생성: 정상 apiKey 시 생성 가능', () => {
    const p = new OpenAIDialogueConversationProvider('sk-test')
    expect(p).toBeInstanceOf(OpenAIDialogueConversationProvider)
  })

  it('정상 응답 시 text/providerName/status 매핑이 정확하다', async () => {
    createMock.mockResolvedValue(
      makeOpenAIResponse(
        JSON.stringify({
          npc_utterance: '네, 아이스 아메리카노 한 잔 준비해 드리겠습니다. 매장에서 드시겠어요?',
          off_topic_detected: false,
          learner_grammar_note: '',
        }),
      ),
    )

    const p = new OpenAIDialogueConversationProvider('sk-test')
    const out = await p.getDialogueResponse(makeInput())

    expect(out.providerName).toBe('openai')
    expect(out.status).toBe('success')
    expect(out.text).toContain('아메리카노')
    expect(typeof out.latencyMs).toBe('number')
    expect(out.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('JSON 파싱 실패 시 throw — 호출부 폴백 트리거', async () => {
    createMock.mockResolvedValue(makeOpenAIResponse('not valid json {{{'))

    const p = new OpenAIDialogueConversationProvider('sk-test')
    await expect(p.getDialogueResponse(makeInput())).rejects.toThrow(/invalid JSON/)
  })

  it('npc_utterance 필드 누락 시 throw', async () => {
    createMock.mockResolvedValue(
      makeOpenAIResponse(JSON.stringify({ off_topic_detected: false, learner_grammar_note: '' })),
    )

    const p = new OpenAIDialogueConversationProvider('sk-test')
    await expect(p.getDialogueResponse(makeInput())).rejects.toThrow(/npc_utterance/)
  })

  it('npc_utterance 가 빈 문자열이면 throw', async () => {
    createMock.mockResolvedValue(
      makeOpenAIResponse(JSON.stringify({ npc_utterance: '   ' })),
    )

    const p = new OpenAIDialogueConversationProvider('sk-test')
    await expect(p.getDialogueResponse(makeInput())).rejects.toThrow(/npc_utterance/)
  })

  it('OpenAI client 호출 인자: model / response_format / messages 포함', async () => {
    createMock.mockResolvedValue(
      makeOpenAIResponse(JSON.stringify({ npc_utterance: '네, 알겠습니다.' })),
    )

    const p = new OpenAIDialogueConversationProvider('sk-test', 'gpt-4o-mini')
    await p.getDialogueResponse(makeInput())

    expect(createMock).toHaveBeenCalledTimes(1)
    const arg = createMock.mock.calls[0][0]
    expect(arg.model).toBe('gpt-4o-mini')
    expect(arg.response_format).toEqual({ type: 'json_object' })
    expect(Array.isArray(arg.messages)).toBe(true)
    expect(arg.messages[0].role).toBe('system')
    expect(arg.messages[1].role).toBe('user')
    expect(arg.messages[1].content).toBe('아메리카노 한 잔 주세요')
    // System prompt should embed dynamic role/missionGoals
    expect(arg.messages[0].content).toContain('카페 점원')
    expect(arg.messages[0].content).toContain('음료 선택')
  })
})

describe('OpenAIDialogueConversationProvider — formatHistory', () => {
  it('직전 N턴까지만 포함한다 (MAX_HISTORY_TURNS 한도 내)', () => {
    const turns: DialogueTurnInput[] = []
    for (let i = 0; i < 30; i++) {
      turns.push({ role: 'student', text: `학습자 발화 ${i}` })
      turns.push({ role: 'ai', text: `AI 응답 ${i}` })
    }
    const out = __test__.formatHistory(turns)
    // 가장 오래된 턴은 제거됨
    expect(out).not.toContain('학습자 발화 0')
    // 가장 최근 턴은 포함됨
    expect(out).toContain('학습자 발화 29')
    expect(out).toContain('AI 응답 29')
    // 줄 개수는 MAX_HISTORY_TURNS 이하
    const lineCount = out.split('\n').length
    expect(lineCount).toBeLessThanOrEqual(__test__.MAX_HISTORY_TURNS)
  })

  it('빈 turns 배열 → "(대화 시작)"', () => {
    expect(__test__.formatHistory([])).toBe('(대화 시작)')
  })
})
