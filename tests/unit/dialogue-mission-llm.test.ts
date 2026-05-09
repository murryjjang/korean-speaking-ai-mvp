import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  clampScore,
  computeHybridScore,
  evaluateDialogueWithLLM,
  evaluateDialogueMissionHybrid,
  type DialogueLLMEvaluation,
} from '@/src/lib/dialogue-mission-llm'
import type { DialogueTurn } from '@/src/types/dialogue'

// ── Mock the openai SDK ────────────────────────────────────────────────────
const createMock = vi.fn()

vi.mock('openai', () => {
  class OpenAI {
    chat = { completions: { create: createMock } }
    constructor(_config: { apiKey: string }) {
      void _config
    }
  }
  return { OpenAI }
})

function makeOpenAIResponse(content: string) {
  return {
    choices: [{ message: { content } }],
    usage: { prompt_tokens: 100, completion_tokens: 30, total_tokens: 130 },
  }
}

function makeEvaluation(overrides: Partial<DialogueLLMEvaluation> = {}): DialogueLLMEvaluation {
  return {
    missionResults: [
      { goalIndex: 0, labelKo: '목표1', achieved: true },
      { goalIndex: 1, labelKo: '목표2', achieved: true },
      { goalIndex: 2, labelKo: '목표3', achieved: true },
      { goalIndex: 3, labelKo: '목표4', achieved: true },
    ],
    qualitative: {
      naturalness: 100,
      koreanAccuracy: 100,
      responsiveness: 100,
      feedback: '좋아요',
    },
    rawResponse: '{}',
    ...overrides,
  }
}

const SAMPLE_TURNS: DialogueTurn[] = [
  {
    id: 't1',
    role: 'ai',
    text: '주문 도와드릴까요?',
    createdAt: '2026-01-01T00:00:00Z',
    status: 'completed',
  },
  {
    id: 't2',
    role: 'student',
    text: '아메리카노 두 잔, 매장에서, 카드로 결제할게요',
    createdAt: '2026-01-01T00:00:01Z',
    status: 'completed',
  },
]

const MISSION_GOALS_4 = ['품목 주문', '수량 말하기', '포장/매장 여부', '결제 방법']
const MISSION_GOALS_3 = ['수업 시간 확인', '결석 자료 수령 확인', '교수자 상담 시간 확인']

describe('clampScore', () => {
  it('정수 그대로 반환', () => {
    expect(clampScore(50)).toBe(50)
  })
  it('음수는 0', () => {
    expect(clampScore(-10)).toBe(0)
  })
  it('100 초과는 100', () => {
    expect(clampScore(150)).toBe(100)
  })
  it('NaN은 0', () => {
    expect(clampScore(NaN)).toBe(0)
  })
  it('실수는 반올림', () => {
    expect(clampScore(72.6)).toBe(73)
  })
  it('숫자형 문자열도 처리', () => {
    expect(clampScore('85')).toBe(85)
  })
  it('비-숫자 문자열은 0', () => {
    expect(clampScore('hello')).toBe(0)
  })
})

describe('computeHybridScore', () => {
  it('4/4 미션 + 정성 100/100/100 → 100점', () => {
    const score = computeHybridScore(makeEvaluation())
    expect(score.total).toBe(100)
    expect(score.quantitativeScore).toBe(60)
    expect(score.qualitativeScore).toBe(40)
    expect(score.quantitativeRaw).toBe(4)
    expect(score.quantitativeMax).toBe(4)
  })

  it('2/4 미션 + 정성 80/80/80 → 정량 30 + 정성 32 = 62점', () => {
    const score = computeHybridScore(
      makeEvaluation({
        missionResults: [
          { goalIndex: 0, labelKo: '목표1', achieved: true },
          { goalIndex: 1, labelKo: '목표2', achieved: true },
          { goalIndex: 2, labelKo: '목표3', achieved: false },
          { goalIndex: 3, labelKo: '목표4', achieved: false },
        ],
        qualitative: {
          naturalness: 80,
          koreanAccuracy: 80,
          responsiveness: 80,
          feedback: '',
        },
      }),
    )
    expect(score.quantitativeScore).toBe(30)
    expect(score.qualitativeScore).toBe(32)
    expect(score.total).toBe(62)
  })

  it('0/4 미션 + 정성 0/0/0 → 0점', () => {
    const score = computeHybridScore(
      makeEvaluation({
        missionResults: [
          { goalIndex: 0, labelKo: '목표1', achieved: false },
          { goalIndex: 1, labelKo: '목표2', achieved: false },
          { goalIndex: 2, labelKo: '목표3', achieved: false },
          { goalIndex: 3, labelKo: '목표4', achieved: false },
        ],
        qualitative: {
          naturalness: 0,
          koreanAccuracy: 0,
          responsiveness: 0,
          feedback: '',
        },
      }),
    )
    expect(score.total).toBe(0)
  })

  it('3개 미션 (intermediate) — 정량이 미션 개수에 비례', () => {
    const score = computeHybridScore(
      makeEvaluation({
        missionResults: [
          { goalIndex: 0, labelKo: 'a', achieved: true },
          { goalIndex: 1, labelKo: 'b', achieved: true },
          { goalIndex: 2, labelKo: 'c', achieved: false },
        ],
      }),
    )
    // 2/3 × 60 = 40
    expect(score.quantitativeScore).toBe(40)
    expect(score.quantitativeRaw).toBe(2)
    expect(score.quantitativeMax).toBe(3)
  })

  it('미션 0개 → 정량 0', () => {
    const score = computeHybridScore(makeEvaluation({ missionResults: [] }))
    expect(score.quantitativeScore).toBe(0)
    expect(score.quantitativeMax).toBe(0)
  })

  it('qualitativeBreakdown이 원본 정성 점수를 보존', () => {
    const score = computeHybridScore(
      makeEvaluation({
        qualitative: {
          naturalness: 88,
          koreanAccuracy: 72,
          responsiveness: 95,
          feedback: '',
        },
      }),
    )
    expect(score.qualitativeBreakdown).toEqual({
      naturalness: 88,
      koreanAccuracy: 72,
      responsiveness: 95,
    })
  })
})

describe('evaluateDialogueWithLLM', () => {
  beforeEach(() => {
    createMock.mockReset()
  })

  it('apiKey 누락 시 throw', async () => {
    await expect(
      evaluateDialogueWithLLM(SAMPLE_TURNS, MISSION_GOALS_4, ''),
    ).rejects.toThrow(/apiKey is required/)
  })

  it('정상 응답 시 missionResults와 qualitative 매핑', async () => {
    createMock.mockResolvedValue(
      makeOpenAIResponse(
        JSON.stringify({
          mission: [
            { goalIndex: 0, achieved: true, evidence: '아메리카노' },
            { goalIndex: 1, achieved: true, evidence: '두 잔' },
            { goalIndex: 2, achieved: true, evidence: '매장' },
            { goalIndex: 3, achieved: true, evidence: '카드' },
          ],
          qualitative: {
            naturalness: 90,
            korean_accuracy: 85,
            responsiveness: 95,
            feedback_ko: '주문 흐름이 자연스럽습니다.',
          },
        }),
      ),
    )

    const result = await evaluateDialogueWithLLM(SAMPLE_TURNS, MISSION_GOALS_4, 'sk-test')

    expect(result.missionResults).toHaveLength(4)
    expect(result.missionResults.every((m) => m.achieved)).toBe(true)
    expect(result.missionResults[0].labelKo).toBe('품목 주문')
    expect(result.missionResults[0].evidence).toEqual(['아메리카노'])
    expect(result.qualitative.naturalness).toBe(90)
    expect(result.qualitative.koreanAccuracy).toBe(85)
    expect(result.qualitative.responsiveness).toBe(95)
    expect(result.qualitative.feedback).toContain('자연스럽')
  })

  it('JSON 파싱 실패 시 throw', async () => {
    createMock.mockResolvedValue(makeOpenAIResponse('this is not json'))

    await expect(
      evaluateDialogueWithLLM(SAMPLE_TURNS, MISSION_GOALS_4, 'sk-test'),
    ).rejects.toThrow(/invalid JSON/)
  })

  it('mission/qualitative 키 누락 시 throw', async () => {
    createMock.mockResolvedValue(makeOpenAIResponse(JSON.stringify({ foo: 'bar' })))

    await expect(
      evaluateDialogueWithLLM(SAMPLE_TURNS, MISSION_GOALS_4, 'sk-test'),
    ).rejects.toThrow(/missing mission/)
  })

  it('LLM이 누락한 goalIndex는 achieved=false로 채운다', async () => {
    createMock.mockResolvedValue(
      makeOpenAIResponse(
        JSON.stringify({
          mission: [{ goalIndex: 0, achieved: true }],
          qualitative: {
            naturalness: 50,
            korean_accuracy: 50,
            responsiveness: 50,
            feedback_ko: '',
          },
        }),
      ),
    )

    const result = await evaluateDialogueWithLLM(SAMPLE_TURNS, MISSION_GOALS_4, 'sk-test')
    expect(result.missionResults[0].achieved).toBe(true)
    expect(result.missionResults[1].achieved).toBe(false)
    expect(result.missionResults[2].achieved).toBe(false)
    expect(result.missionResults[3].achieved).toBe(false)
  })
})

describe('evaluateDialogueMissionHybrid', () => {
  beforeEach(() => {
    createMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('CONVERSATION_PROVIDER=mock일 때 규칙 기반 사용', async () => {
    vi.stubEnv('CONVERSATION_PROVIDER', 'mock')
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')

    const result = await evaluateDialogueMissionHybrid(
      'beginner-q4-dialogue-mission',
      MISSION_GOALS_4,
      SAMPLE_TURNS,
    )

    expect(result.source).toBe('rule')
    expect(result.hybridScore).toBeNull()
    expect(result.qualitative).toBeNull()
    expect(result.results).toHaveLength(4)
    expect(createMock).not.toHaveBeenCalled()
  })

  it('OPENAI_API_KEY 없으면 규칙 기반 사용', async () => {
    vi.stubEnv('CONVERSATION_PROVIDER', 'openai')
    vi.stubEnv('OPENAI_API_KEY', '')

    const result = await evaluateDialogueMissionHybrid(
      'beginner-q4-dialogue-mission',
      MISSION_GOALS_4,
      SAMPLE_TURNS,
    )

    expect(result.source).toBe('rule')
    expect(result.hybridScore).toBeNull()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('LLM 정상 응답 시 source=llm, hybridScore 산출', async () => {
    vi.stubEnv('CONVERSATION_PROVIDER', 'openai')
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')

    createMock.mockResolvedValue(
      makeOpenAIResponse(
        JSON.stringify({
          mission: [
            { goalIndex: 0, achieved: true },
            { goalIndex: 1, achieved: true },
            { goalIndex: 2, achieved: true },
            { goalIndex: 3, achieved: true },
          ],
          qualitative: {
            naturalness: 90,
            korean_accuracy: 90,
            responsiveness: 90,
            feedback_ko: '훌륭합니다',
          },
        }),
      ),
    )

    const result = await evaluateDialogueMissionHybrid(
      'beginner-q4-dialogue-mission',
      MISSION_GOALS_4,
      SAMPLE_TURNS,
    )

    expect(result.source).toBe('llm')
    expect(result.hybridScore).not.toBeNull()
    expect(result.hybridScore!.quantitativeScore).toBe(60)
    expect(result.hybridScore!.qualitativeScore).toBe(36) // 90 * 0.4
    expect(result.hybridScore!.total).toBe(96)
    expect(result.qualitative?.feedback).toBe('훌륭합니다')
  })

  it('LLM 실패 시 규칙 기반 폴백', async () => {
    vi.stubEnv('CONVERSATION_PROVIDER', 'openai')
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')

    createMock.mockRejectedValue(new Error('network error'))

    const result = await evaluateDialogueMissionHybrid(
      'beginner-q4-dialogue-mission',
      MISSION_GOALS_4,
      SAMPLE_TURNS,
    )

    expect(result.source).toBe('rule')
    expect(result.hybridScore).toBeNull()
    expect(result.results).toHaveLength(4)
  })

  it('intermediate 미션 3개도 정상 동작', async () => {
    vi.stubEnv('CONVERSATION_PROVIDER', 'openai')
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')

    createMock.mockResolvedValue(
      makeOpenAIResponse(
        JSON.stringify({
          mission: [
            { goalIndex: 0, achieved: true },
            { goalIndex: 1, achieved: true },
            { goalIndex: 2, achieved: true },
          ],
          qualitative: {
            naturalness: 100,
            korean_accuracy: 100,
            responsiveness: 100,
            feedback_ko: '',
          },
        }),
      ),
    )

    const result = await evaluateDialogueMissionHybrid(
      'intermediate-q4-dialogue-mission',
      MISSION_GOALS_3,
      SAMPLE_TURNS,
    )

    expect(result.source).toBe('llm')
    expect(result.hybridScore!.total).toBe(100)
    expect(result.hybridScore!.quantitativeMax).toBe(3)
  })
})
