export type DialogueMode = 'assessment' | 'practice'

export type DialoguePolicyConfig = {
  mode: DialogueMode
  allowLanguageHelp: 'limited' | 'full'
  maxTurns: number
  autonomyLevel: 'guided' | 'open'
  level: string
  personaId?: string
}

// Patterns that indicate the student is asking a language/grammar question.
// Checked BEFORE mission completion — language questions must never be treated as mission evidence.
const LANGUAGE_QUESTION_PATTERNS: RegExp[] = [
  /이라고 해도 (돼|되|맞|맞아)/,
  /라고 해도 (돼|되|맞|맞아)/,
  /이 맞(아요|나요|죠|지요)/,
  /가 맞(아요|나요|죠|지요)/,
  /은 맞(나요|죠|지요)/,
  /는 맞(나요|죠|지요)/,
  /이게 맞(아요|나요|죠|지요)?/,  // "이게 맞나요?" — ?없이도 감지
  /그게 맞(아요|나요|죠|지요)/,
  /맞나요/,                          // "? 없는" STT 출력도 감지
  /맞아요\?/,                        // "맞아요?"
  /맞(아요|나요|죠|지요)\?/,
  /맞는 표현/,
  /정확한 표현/,
  /차이가 뭐/,
  /차이는 뭐/,
  /어떻게 (말|얘기)(해|하면|해야)/,
  /어떻게 (말|얘기)/,
  /뭐라고 (말|해|하)/,
  /표현이 맞/,
  /이 표현/,
  /표현(을|은)? (어떻게|추천|알)/,
  /자연스러(워|운|웠|운지)/,
  /자연스럽/,
  /문법(이)?\s*(맞|틀|이상)/,
  /발음(이)?\s*(맞|틀|이상)/,
  /어떻게 표현/,
  /이렇게 말해도/,
  /뭐라고 말/,
  /무슨 뜻/,
  /어떤 표현/,
  /좋은 표현/,
  /한국어(로|에서)/,
  /영어로 (뭐|어떻게)/,
  /똑바로 알/,
  /제대로 알/,
]

export function shouldAnswerLanguageQuestion(text: string): boolean {
  return LANGUAGE_QUESTION_PATTERNS.some((p) => p.test(text))
}

// Patterns indicating the student is asking a procedural/system question
// about the assessment process (recording, submission, next steps).
const PROCEDURAL_QUESTION_PATTERNS: RegExp[] = [
  /더\s*녹음/,
  /뭘?\s*더\s*(해야|하면|할)/,
  /제출\s*(하면|해도|할게|할까|해야|하나)/,
  /평가\s*제출/,
  /어떻게\s*제출/,
  /이제\s*뭐\s*(해|하면|할)/,
  /이제\s*어떻게/,
  /다음\s*단계/,
  /다음은\s*뭐/,
  /끝났(나요|어요|나)/,
  /다\s*됐(나요|어요|나)/,
  /미션\s*(끝났|완료)/,
  /완료\s*(됐|됩니|했)/,
  /버튼\s*(어디|눌러|클릭)/,
  /눌러야\s*(하나요|해요)/,
]

export function isProceduralQuestion(text: string): boolean {
  return PROCEDURAL_QUESTION_PATTERNS.some((p) => p.test(text))
}

// Cafe ordering: STT misrecognition patterns and clearly unnatural expressions.
// Each entry maps a bad pattern to the correction to suggest.
const UNNATURAL_CAFE_PATTERNS: Array<{ pattern: RegExp; correction: string }> = [
  { pattern: /던지세요/, correction: '아이스 아메리카노 주세요' },
  { pattern: /나이스\s*아메리카/, correction: '아이스 아메리카노 주세요' },
  { pattern: /나이스\s*아메리칸/, correction: '아이스 아메리카노 주세요' },
  { pattern: /아메리칸\s*(던|주)/, correction: '아이스 아메리카노 주세요' },
]

function unnaturalCafeCorrection(text: string): string | null {
  for (const { pattern, correction } of UNNATURAL_CAFE_PATTERNS) {
    if (pattern.test(text)) return correction
  }
  return null
}

/**
 * Assessment mode: short confirmation, immediately return to roleplay.
 * AI should not over-explain — just enough to unblock the student and continue the mission.
 * Never confirm an unnatural or STT-misrecognised expression as correct.
 */
export function answerLanguageQuestionForAssessment(
  text: string,
  _level: string,
  personaId: string,
): string {
  const lower = text.toLowerCase()

  // Cafe context: detect obviously unnatural or STT-misrecognised expressions first.
  // Must run before any correctness confirmation to avoid false affirmatives.
  if (personaId === 'cafe_staff_friendly') {
    const correction = unnaturalCafeCorrection(lower)
    if (correction !== null) {
      return `그 표현은 자연스럽지 않습니다. '${correction}'라고 말하면 자연스럽습니다. 그럼 다시 주문해 보시겠어요?`
    }
  }

  // Confirm known-correct cafe expressions
  if (lower.includes('아이스 아메리카노') || lower.includes('아이스아메리카노')) {
    return '네, 자연스러운 표현입니다. 그럼 아이스 아메리카노로 해드릴까요?'
  }
  if (lower.includes('따뜻한 아메리카노') || lower.includes('핫 아메리카노')) {
    return '네, 자연스러운 표현입니다. 따뜻한 아메리카노로 해드릴까요?'
  }

  // "여기서 먹고 가려면 어떻게 얘기해야 하죠?" or similar dine-in expression questions
  if (
    (lower.includes('어떻게 얘기') || lower.includes('어떻게 말')) &&
    (lower.includes('여기서') || lower.includes('매장') || lower.includes('먹고 갈'))
  ) {
    return "'여기서 먹고 갈게요' 또는 '매장에서 먹고 갈게요'라고 말하면 자연스럽습니다. 그럼 매장에서 드시고 가실 건가요?"
  }

  // "포장해 주세요가 맞아요?" or takeout expression check
  if (
    lower.includes('포장') &&
    (lower.includes('맞아') || lower.includes('맞나') || lower.includes('맞죠') ||
      lower.includes('어떻게 얘기') || lower.includes('어떻게 말'))
  ) {
    return '네, 자연스러운 표현입니다. 그럼 포장으로 해드릴까요?'
  }

  if (lower.includes('아이스 커피') || lower.includes('아이스커피')) {
    return "네, 차가운 커피는 '아이스 커피'라고 말할 수 있습니다. 어떤 음료로 주문하시겠어요?"
  }
  if (lower.includes('가져갈') || lower.includes('테이크아웃')) {
    return '네, 맞는 표현입니다. 포장으로 준비해 드릴까요?'
  }
  if (personaId === 'admin_staff_clear') {
    return '네, 그 표현도 자연스럽습니다. 다른 것도 도움이 필요하신가요?'
  }
  if (personaId === 'event_partner_professional') {
    return '네, 그 표현을 사용하셔도 좋습니다. 다시 본론으로 돌아가겠습니다.'
  }
  if (personaId === 'cafe_staff_friendly') {
    return '어떤 음료로 주문하시겠어요?'
  }
  return '다시 말씀해 보시겠어요?'
}

/**
 * Practice mode: detailed explanation with examples, then optionally return to roleplay.
 * AI acts as a language coach — can explain rules, give examples, suggest alternatives.
 */
export function answerLanguageQuestionForPractice(
  text: string,
  level: string,
  _personaId: string,
): string {
  const lower = text.toLowerCase()

  if (lower.includes('포장해 주세요') && (lower.includes('가져갈') || lower.includes('차이'))) {
    return "둘 다 사용할 수 있습니다. '포장해 주세요'는 주문할 때 정중하게 요청하는 표현이고, '가져갈게요'는 매장에서 먹지 않고 가지고 간다는 뜻입니다. 예를 들면 '아메리카노 하나 포장해 주세요'라고 말할 수 있습니다."
  }
  if (lower.includes('차이')) {
    const prefix = level === 'beginner' ? '간단히 설명하면, ' : ''
    return `${prefix}그 두 표현은 뉘앙스 차이가 있습니다. 상황에 따라 더 자연스러운 표현을 선택하면 좋습니다. 직접 사용해 볼까요?`
  }
  if (lower.includes('어떻게 말해') || lower.includes('뭐라고 해')) {
    return '좋은 질문이에요! 그 상황에서는 여러 표현을 쓸 수 있어요. 같이 연습해 볼까요?'
  }
  if (lower.includes('무슨 뜻')) {
    return '그 표현의 뜻을 설명해 드릴게요. 이해가 되면 직접 문장으로 만들어 보는 것이 좋습니다.'
  }
  return '좋은 질문입니다. 그 표현에 대해 자세히 설명해 드리겠습니다. 이해가 되면 직접 써 보는 것이 도움이 됩니다.'
}

export function buildReturnToRoleplayMessage(
  personaId: string,
  missionGoals: string[],
): string {
  const firstGoal = missionGoals[0] ?? ''

  switch (personaId) {
    case 'cafe_staff_friendly':
      return firstGoal
        ? `네! 다시 주문으로 돌아갈게요. ${firstGoal}에 대해 말씀해 주세요.`
        : '주문을 계속 도와드릴게요.'
    case 'admin_staff_clear':
      return '안내를 계속 진행하겠습니다. 추가로 궁금한 점이 있으신가요?'
    case 'event_partner_professional':
      return '행사 협의를 계속 진행하겠습니다. 어떻게 생각하시나요?'
    default:
      return '계속 진행해 볼까요?'
  }
}

export function getDialoguePolicy(
  mode: DialogueMode,
  level: string,
  personaId?: string,
): DialoguePolicyConfig {
  if (mode === 'assessment') {
    return {
      mode: 'assessment',
      allowLanguageHelp: 'limited',
      maxTurns: level === 'advanced' ? 10 : 8,
      autonomyLevel: 'guided',
      level,
      personaId,
    }
  }
  return {
    mode: 'practice',
    allowLanguageHelp: 'full',
    maxTurns: level === 'beginner' ? 14 : 20,
    autonomyLevel: 'open',
    level,
    personaId,
  }
}
