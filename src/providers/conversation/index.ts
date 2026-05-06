// ── ConversationProvider 인터페이스 ──────────────────────────────
//
// 기존 MockConversationProvider(scripted, turn-number-based)는 유지.
// Phase 10-E-5에서 DialogueConversationProvider(mission-aware)를 추가.
// Phase 9+에서 ClaudeConversationProvider / OpenAIConversationProvider 추가 예정.

export type ConversationTurnResult = {
  text: string
  providerName: string
  latencyMs: number
}

export interface ConversationProvider {
  /**
   * @param scenarioId  시나리오 식별자 (예: 'sc-restaurant-01')
   * @param turnNumber  학습자 발화 라운드 번호 (1-indexed).
   */
  getResponse(scenarioId: string, turnNumber: number): Promise<ConversationTurnResult>
}

// ── Dialogue conversation types (Phase 10-E-5+) ──────────────────

export type DialogueTurnInput = {
  role: 'ai' | 'student'
  text: string
}

export type DialogueConversationInput = {
  questionId: string
  level: string
  aiRole: string
  aiInformation: string
  missionGoals: string[]
  turns: DialogueTurnInput[]
  latestStudentText: string
}

export type DialogueConversationOutput = {
  text: string
  providerName: string
  latencyMs: number
  status: 'success' | 'fallback'
}

export interface DialogueConversationProvider {
  getDialogueResponse(input: DialogueConversationInput): Promise<DialogueConversationOutput>
}

// ── Scripted mock 응답 (기존 sc-* 시나리오용) ──────────────────────

const MOCK_SCRIPTS: Record<string, readonly string[]> = {
  'sc-restaurant-01': [
    '어서 오세요! 이쪽으로 앉으세요. 메뉴판 드릴게요.',
    '무엇을 드시겠어요?',
    '비빔밥이요? 또 다른 것도 드시겠어요?',
    '네, 삼겹살도요. 알겠습니다.',
    '합계 22,000원입니다. 현금이세요, 카드세요?',
    '네, 주문 확인했습니다. 잠시만 기다려주세요!',
  ],
  'sc-hospital-01': [
    '어디가 불편하세요?',
    '언제부터 아프셨어요?',
    '많이 힘드시겠네요. 열은 있으세요?',
    '알겠습니다. 예약은 언제가 좋으세요?',
    '오늘 오후에 자리가 있습니다. 몇 시가 편하세요?',
    '3시로 예약해 드리겠습니다.',
    '5월 5일 오후 3시로 확인해 드렸습니다.',
    '건강 회복하세요. 이쪽에서 접수해 주세요.',
  ],
  'sc-transport-01': [
    '강남역요? 153번 버스 타시면 됩니다.',
    '이 정류장에서 탈 수 있어요. 5분 후에 옵니다.',
    '대략 20분 걸려요.',
    '강남역에서 내리시면 됩니다. 안전하게 가세요.',
    '감사합니다. 좋은 하루 되세요!',
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

    return { text, providerName: 'mock', latencyMs: Date.now() - start }
  }
}

// ── Mission-aware mock provider (Phase 10-E-5) ──────────────────

function hasAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase()
  return keywords.some((kw) => lower.includes(kw))
}

function allStudentText(turns: DialogueTurnInput[]): string {
  return turns
    .filter((t) => t.role === 'student')
    .map((t) => t.text.toLowerCase())
    .join(' ')
}

function latestStudentText(input: DialogueConversationInput): string {
  return input.latestStudentText.toLowerCase()
}

function beginnerCafeResponse(input: DialogueConversationInput): string {
  const all = allStudentText(input.turns) + ' ' + latestStudentText(input)
  const drinkMet = hasAny(all, ['아메리카노', '라떼', '주스', '음료', '커피', '주문'])
  const tempMet = hasAny(all, ['아이스', '차가운', '따뜻한', '뜨거운', '핫', 'hot', 'ice', '따뜻하게', '아이스로'])
  const packMet = hasAny(all, ['포장', '테이크아웃', '매장', '여기서', '가져갈', '드시고', '먹고 갈'])

  if (drinkMet && tempMet && packMet) {
    return '네, 주문 도와드리겠습니다. 감사합니다!'
  }
  if (drinkMet && tempMet && !packMet) {
    return '드시고 가세요, 아니면 포장해 드릴까요?'
  }
  if (drinkMet && !tempMet) {
    return '차가운 음료로 드릴까요, 따뜻한 음료로 드릴까요?'
  }
  return '어떤 음료를 드릴까요? 아메리카노, 라떼, 주스 중에서 고르실 수 있어요.'
}

function intermediateAdminResponse(input: DialogueConversationInput): string {
  const latest = latestStudentText(input)
  const all = allStudentText(input.turns) + ' ' + latest

  const classMet = hasAny(all, ['말하기 수업', '수업 시간', '수업이 언제', '몇 시', '언제 있', '수업은 언제'])
  const absenceMet = hasAny(all, ['결석', '자료', '받을 수', '어떻게', '빠진', '못 들어', '결석했'])
  const consultMet = hasAny(all, ['교수', '상담', '선생님', '만날 수', '상담 시간', '뵐 수', '상담이 언제'])

  if (classMet && absenceMet && consultMet) {
    return '다른 궁금한 점이 있으시면 말씀해 주세요. 도움이 됐으면 합니다.'
  }

  // Respond to what the latest turn asked about
  const classAsked = hasAny(latest, ['말하기 수업', '수업 시간', '수업이 언제', '몇 시', '언제 있', '수업'])
  const absenceAsked = hasAny(latest, ['결석', '자료', '받을 수', '어떻게', '빠진', '못 들어'])
  const consultAsked = hasAny(latest, ['교수', '상담', '선생님', '만날 수', '상담 시간', '뵐 수'])

  const responses: string[] = []
  if (classAsked) responses.push('말하기 수업은 월요일과 수요일 오후 2시부터 4시까지 진행됩니다.')
  if (absenceAsked) responses.push('결석한 날의 자료는 LMS에서 확인하실 수 있습니다.')
  if (consultAsked) responses.push('교수자 상담은 수요일 오후 4시 30분부터 5시까지 가능합니다.')

  if (responses.length > 0) {
    const missing: string[] = []
    if (!classMet && !classAsked) missing.push('말하기 수업 시간')
    if (!absenceMet && !absenceAsked) missing.push('결석 자료 수령 방법')
    if (!consultMet && !consultAsked) missing.push('교수자 상담 시간')
    const follow = missing.length > 0 ? ` ${missing[0]}에 대해서도 궁금한 점이 있으신가요?` : ''
    return responses.join(' ') + follow
  }

  return '무엇이든 물어보세요. 말하기 수업 시간, 결석 자료, 교수자 상담에 대해 안내해 드릴 수 있습니다.'
}

function advancedEventResponse(input: DialogueConversationInput): string {
  const latest = latestStudentText(input)
  const all = allStudentText(input.turns) + ' ' + latest

  const scheduleMet = hasAny(all, ['일정', '조정', '가능', '확인', '언제', '시간이'])
  const topicMet = hasAny(all, ['발표', '주제', '의견', '어떻게', 'ai', '언어교육', '진행 방식', '어떤 방식'])
  const meetingMet = hasAny(all, ['회의', '별도', '실무', '제안', '잡으면', '미팅', '따로', '다시 만'])

  if (scheduleMet && topicMet && meetingMet) {
    return '좋습니다. 모든 협의 사항이 정리됐네요. 공동 행사 성공적으로 진행되길 기대합니다.'
  }

  const scheduleAsked = hasAny(latest, ['일정', '조정', '가능', '확인', '언제', '시간'])
  const topicAsked = hasAny(latest, ['발표', '주제', '의견', 'ai', '언어교육', '진행 방식'])
  const meetingAsked = hasAny(latest, ['회의', '별도', '실무', '제안', '잡으면', '미팅', '따로'])

  if (scheduleAsked) return '네, 금요일 오전이라면 저도 가능합니다. 행사 준비에 맞춰 조정해 드리겠습니다.'
  if (topicAsked) return 'AI 활용 언어교육 사례 좋은 주제네요. 진행 방식은 발표 후 질의응답 시간을 갖는 형식을 제안드립니다.'
  if (meetingAsked) return '좋습니다. 수요일 오후나 목요일 오전에 실무 협의 회의를 잡으면 어떨까요?'

  const missing: string[] = []
  if (!scheduleMet) missing.push('일정 조정 가능 여부')
  if (!topicMet) missing.push('발표 주제와 진행 방식')
  if (!meetingMet) missing.push('별도 실무 회의 제안')
  return `행사 ${missing[0] ?? '관련 사항'}에 대해 말씀해 주시겠어요?`
}

class MockDialogueConversationProvider implements DialogueConversationProvider {
  async getDialogueResponse(input: DialogueConversationInput): Promise<DialogueConversationOutput> {
    const start = Date.now()
    await new Promise<void>((resolve) => setTimeout(resolve, MOCK_LATENCY_MS))

    let text: string

    switch (input.questionId) {
      case 'beginner-q4-dialogue-mission':
        text = beginnerCafeResponse(input)
        break
      case 'intermediate-q4-dialogue-mission':
        text = intermediateAdminResponse(input)
        break
      case 'advanced-q4-dialogue-mission':
        text = advancedEventResponse(input)
        break
      default:
        text = FALLBACK_RESPONSE
    }

    return {
      text,
      providerName: 'mock',
      latencyMs: Date.now() - start,
      status: 'success',
    }
  }
}

export function getConversationProvider(): ConversationProvider {
  const name = process.env.CONVERSATION_PROVIDER ?? 'mock'
  switch (name) {
    case 'mock':
    default:
      return new MockConversationProvider()
  }
}

export function getDialogueConversationProvider(): DialogueConversationProvider {
  const name = process.env.CONVERSATION_PROVIDER ?? 'mock'
  switch (name) {
    case 'mock':
    default:
      return new MockDialogueConversationProvider()
  }
}
