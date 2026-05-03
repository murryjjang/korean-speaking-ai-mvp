// ── ConversationProvider 인터페이스 ──────────────────────────────
//
// 현재는 MockConversationProvider(scripted response)만 구현.
// Phase 9+에서 ClaudeConversationProvider / OpenAIConversationProvider 등을
// 추가하고 getConversationProvider()의 switch 케이스만 확장하면 된다.
// 인터페이스 시그니처는 변경하지 않는다.

export type ConversationTurnResult = {
  text: string        // AI 응답 텍스트
  providerName: string
  latencyMs: number
}

export interface ConversationProvider {
  /**
   * @param scenarioId  시나리오 식별자 (예: 'sc-restaurant-01')
   * @param turnNumber  학습자 발화 라운드 번호 (1-indexed).
   *                    AI greeting은 이 메서드를 거치지 않고 persona.greetingMessage를 직접 사용.
   */
  getResponse(scenarioId: string, turnNumber: number): Promise<ConversationTurnResult>
}

// ── Scripted mock 응답 ────────────────────────────────────────────
//
// 방식: turnNumber를 배열 인덱스 [turnNumber - 1]로 매핑.
// 인덱스 초과(maxTurns를 넘어서 호출) 시 마지막 원소를 반환한다.
// keyword 방식을 채택하지 않은 이유:
//   mock 단계에서 학습자 텍스트 내용에 의존하면 키워드 미매칭 시
//   대화 흐름이 끊기거나 부자연스러운 응답이 발생하기 때문.

const MOCK_SCRIPTS: Record<string, readonly string[]> = {
  'sc-restaurant-01': [
    /* [0] turnNumber=1 */ '어서 오세요! 이쪽으로 앉으세요. 메뉴판 드릴게요.',
    /* [1] turnNumber=2 */ '무엇을 드시겠어요?',
    /* [2] turnNumber=3 */ '비빔밥이요? 또 다른 것도 드시겠어요?',
    /* [3] turnNumber=4 */ '네, 삼겹살도요. 알겠습니다.',
    /* [4] turnNumber=5 */ '합계 22,000원입니다. 현금이세요, 카드세요?',
    /* [5] turnNumber=6 */ '네, 주문 확인했습니다. 잠시만 기다려주세요!',
  ],
  'sc-hospital-01': [
    /* [0] turnNumber=1 */ '어디가 불편하세요?',
    /* [1] turnNumber=2 */ '언제부터 아프셨어요?',
    /* [2] turnNumber=3 */ '많이 힘드시겠네요. 열은 있으세요?',
    /* [3] turnNumber=4 */ '알겠습니다. 예약은 언제가 좋으세요?',
    /* [4] turnNumber=5 */ '오늘 오후에 자리가 있습니다. 몇 시가 편하세요?',
    /* [5] turnNumber=6 */ '3시로 예약해 드리겠습니다.',
    /* [6] turnNumber=7 */ '5월 5일 오후 3시로 확인해 드렸습니다.',
    /* [7] turnNumber=8 */ '건강 회복하세요. 이쪽에서 접수해 주세요.',
  ],
  'sc-transport-01': [
    /* [0] turnNumber=1 */ '강남역요? 153번 버스 타시면 됩니다.',
    /* [1] turnNumber=2 */ '이 정류장에서 탈 수 있어요. 5분 후에 옵니다.',
    /* [2] turnNumber=3 */ '대략 20분 걸려요.',
    /* [3] turnNumber=4 */ '강남역에서 내리시면 됩니다. 안전하게 가세요.',
    /* [4] turnNumber=5 */ '감사합니다. 좋은 하루 되세요!',
  ],
}

const FALLBACK_RESPONSE = '네, 알겠습니다.'
const MOCK_LATENCY_MS = 800

class MockConversationProvider implements ConversationProvider {
  async getResponse(scenarioId: string, turnNumber: number): Promise<ConversationTurnResult> {
    const start = Date.now()
    await new Promise<void>((resolve) => setTimeout(resolve, MOCK_LATENCY_MS))

    const scripts = MOCK_SCRIPTS[scenarioId]
    let text = FALLBACK_RESPONSE
    if (scripts && scripts.length > 0) {
      const idx = Math.max(0, Math.min(turnNumber - 1, scripts.length - 1))
      text = scripts[idx] ?? FALLBACK_RESPONSE
    }

    return {
      text,
      providerName: 'mock',
      latencyMs: Date.now() - start,
    }
  }
}

export function getConversationProvider(): ConversationProvider {
  // Phase 9+에서 'claude' | 'openai' 케이스 추가.
  // 환경변수가 없으면 무조건 mock 사용.
  const name = process.env.CONVERSATION_PROVIDER ?? 'mock'
  switch (name) {
    case 'mock':
    default:
      return new MockConversationProvider()
  }
}
