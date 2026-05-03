import type { LLMEvalProvider, LLMEvalResult } from '@/src/types/providers'

class MockLLMEvalProvider implements LLMEvalProvider {
  async evaluate(_: string, __: string): Promise<LLMEvalResult> {
    await new Promise((resolve) => setTimeout(resolve, 800))
    return {
      scores: [
        {
          rubricItemId: 'ri-pronunciation',
          score: 14,
          rationale: '발음이 대체로 정확하나 일부 자음에서 부정확함이 있습니다.',
        },
        {
          rubricItemId: 'ri-fluency',
          score: 15,
          rationale: '자연스러운 속도로 말하나 간혹 멈춤이 있습니다.',
        },
        {
          rubricItemId: 'ri-vocabulary',
          score: 13,
          rationale: '기본 어휘를 사용하여 의사소통에 문제는 없습니다.',
        },
        {
          rubricItemId: 'ri-grammar',
          score: 12,
          rationale: '조사 및 어미 사용에 일부 오류가 있습니다.',
        },
        {
          rubricItemId: 'ri-task',
          score: 16,
          rationale: '과제 지시를 잘 이해하고 핵심 내용을 포함했습니다.',
        },
      ],
      totalScore: 70,
      normalizedScore: 70,
      errorTags: [
        { type: 'particle', count: 2, examples: ['조사 오류 예시'] },
        { type: 'pronunciation', count: 1, examples: ['발음 오류 예시'] },
      ],
      feedback:
        '전반적으로 과제를 잘 수행했습니다. 문법과 발음 연습을 계속하면 좋겠습니다.',
      providerName: 'mock',
      providerVersion: '1.0.0',
      latencyMs: 800,
    }
  }
}

export function getLLMEvalProvider(): LLMEvalProvider {
  const providerName = process.env.LLM_EVAL_PROVIDER ?? 'mock'
  switch (providerName) {
    case 'mock':
    default:
      return new MockLLMEvalProvider()
  }
}
