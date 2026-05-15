// ── ConversationProvider 인터페이스 ──────────────────────────────
//
// 기존 MockConversationProvider(scripted, turn-number-based)는 유지.
// Phase 10-E-5에서 DialogueConversationProvider(mission-aware)를 추가.
// Phase 10-E-5-C에서 assessment/practice mode 분리 정책 추가.
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
  // Mode determines policy: 'assessment' (mission-first, limited lang help)
  // vs 'practice' (coaching-first, full lang help). Defaults to 'assessment'.
  mode?: 'assessment' | 'practice'
  personaId?: string
  allowLanguageHelp?: 'limited' | 'full'
  maxTurns?: number
  autonomyLevel?: 'guided' | 'open'
}

export type DialogueConversationOutput = {
  text: string
  providerName: string
  latencyMs: number
  status: 'success' | 'fallback'
  // v1.1 15-2: Q4도 자유 대화 수준의 교정·이탈 검지 표시를 위해 부가 정보를
  // optional로 전달. JSON 응답에서 파싱되며, mock/fallback에서는 생략 가능.
  learnerGrammarNote?: string
  offTopicDetected?: boolean
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

// ── Mission-aware mock provider (Phase 10-E-5 / 10-E-5-C / 10-E-6-D) ──────────

import {
  shouldAnswerLanguageQuestion,
  answerLanguageQuestionForAssessment,
  answerLanguageQuestionForPractice,
  getDialoguePolicy,
  isProceduralQuestion,
} from '@/src/lib/dialogue-policy'

import { OpenAIDialogueConversationProvider } from './openai'

function hasAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase()
  return keywords.some((kw) => lower.includes(kw))
}

// ── 한국어 조사 처리 helper ───────────────────────────────────────────────────
// 한글 음절 마지막 글자에 받침(종성)이 있으면 true를 반환한다.
function endsWithBatchim(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  for (let i = trimmed.length - 1; i >= 0; i--) {
    const code = trimmed.charCodeAt(i)
    if (code >= 0xAC00 && code <= 0xD7A3) {
      return (code - 0xAC00) % 28 !== 0
    }
    // 한글이 아닌 문자(숫자·영문 등) → 뒤 한글을 찾아야 함
    if (code < 0x3000) return false
  }
  return false
}

/**
 * 텍스트에 한국어 조사를 붙여 반환한다.
 * @param text 단어
 * @param josa "와/과" 형식의 조사 쌍 (vowel/consonant)
 * @example withJosa('아이스 아메리카노', '와/과') → '아이스 아메리카노와'
 * @example withJosa('팥빙수', '를/을') → '팥빙수를'
 */
export function withJosa(text: string, josa: string): string {
  const parts = josa.split('/')
  if (parts.length !== 2) return text + josa
  const [vowelForm, consonantForm] = parts
  return text + (endsWithBatchim(text) ? consonantForm : vowelForm)
}

// ── 카페 메뉴 가격 테이블 (원 단위)
const CAFE_MENU_PRICES: Record<string, number> = {
  '아이스 아메리카노': 3000,
  '따뜻한 아메리카노': 3000,
  '아이스 라테': 3500,
  '따뜻한 라테': 3500,
  '라테': 3500,
  '오렌지 주스': 4000,
  '팥빙수': 6000,
  '조각 케이크': 5000,
}

/**
 * 추출된 품목 레이블 배열에서 총 주문 금액을 계산한다.
 * 레이블 예: ['아이스 아메리카노 2잔', '팥빙수']
 */
function computeOrderTotal(items: string[]): number {
  let total = 0
  for (const label of items) {
    for (const [menuName, price] of Object.entries(CAFE_MENU_PRICES)) {
      if (label.startsWith(menuName)) {
        const rest = label.slice(menuName.length).trim()
        const numMatch = rest.match(/^(\d+)/)
        const korMatch = rest.match(/^(한|두|세|네)/)
        let qty = 1
        if (numMatch) qty = parseInt(numMatch[1], 10)
        else if (korMatch) {
          const map: Record<string, number> = { '한': 1, '두': 2, '세': 3, '네': 4 }
          qty = map[korMatch[1]] ?? 1
        }
        total += price * qty
        break
      }
    }
  }
  return total
}

// 아메리카노(온도 미지정)를 범용으로 처리
const AMERICANO_GENERIC_KEYWORDS = ['아메리카노']
const LATTE_GENERIC_KEYWORDS = ['라테', '라떼']

// 메뉴판에 없는 음식 — 카페가 아닌 식당 음식류
const INVALID_CAFE_ITEMS = [
  '부대찌개', '설렁탕', '김치찌개', '라면', '국밥',
  '순댓국', '순대국', '순대',
  '삼겹살', '불고기', '갈비', '된장찌개', '해장국', '갈비탕',
  '비빔밥', '냉면', '돼지국밥',
]

function detectInvalidCafeItems(text: string): string[] {
  return INVALID_CAFE_ITEMS.filter((item) => text.includes(item))
}

function hasValidCafeDrink(text: string): boolean {
  // 아메리카노, 라테 계열 (온도 무관)
  if (AMERICANO_GENERIC_KEYWORDS.some((kw) => text.includes(kw))) return true
  if (LATTE_GENERIC_KEYWORDS.some((kw) => text.includes(kw))) return true
  // 주스
  if (text.includes('주스')) return true
  return false
}

function hasValidCafeItem(text: string): boolean {
  return hasValidCafeDrink(text) || text.includes('팥빙수') || text.includes('빙수') || text.includes('케이크')
}

// ── 수량 캡처 패턴 ──────────────────────────────────────────────────────────
const QTY_PATTERN = '(\\d+\\s*(?:잔|개|컵|병)?|한\\s*(?:잔|개|컵)?|두\\s*(?:잔|개|컵)?|세\\s*(?:잔|개|컵)?|네\\s*(?:잔|개|컵)?)'

/**
 * 학습자 발화에서 유효한 메뉴 품목과 수량을 추출한다.
 * displayName을 사용하므로 '아이스아메리카노' 같은 붙여쓰기가 없다.
 * 예: "아이스 아메리카노 2잔과 팥빙수 2개 포장해주세요" → ['아이스 아메리카노 2잔', '팥빙수 2개']
 */
function extractOrderedItems(text: string): string[] {
  type FoundItem = { pos: number; label: string }
  const found: FoundItem[] = []

  // 팥빙수 / 빙수 → displayName: 팥빙수
  const bingsuRe = new RegExp(`팥빙수\\s*${QTY_PATTERN}?`)
  const bingsuM = text.match(bingsuRe)
  if (bingsuM && bingsuM.index !== undefined) {
    const qty = bingsuM[1]?.trim()
    found.push({ pos: bingsuM.index, label: qty ? `팥빙수 ${qty}` : '팥빙수' })
  } else if (text.includes('빙수')) {
    const idx = text.indexOf('빙수')
    found.push({ pos: idx, label: '팥빙수' })
  }

  // 케이크 → displayName: 조각 케이크
  const cakeRe = new RegExp(`(?:조각\\s*)?케이크\\s*${QTY_PATTERN}?`)
  const cakeM = text.match(cakeRe)
  if (cakeM && cakeM.index !== undefined) {
    const qty = cakeM[1]?.trim()
    found.push({ pos: cakeM.index, label: qty ? `조각 케이크 ${qty}` : '조각 케이크' })
  }

  // 아이스 아메리카노 (따뜻한보다 먼저 감지) → displayName: 아이스 아메리카노
  const iceAmeRe = new RegExp(`아이스\\s*아메리카노\\s*${QTY_PATTERN}?`)
  const iceAmeM = text.match(iceAmeRe)
  if (iceAmeM && iceAmeM.index !== undefined) {
    const qty = iceAmeM[1]?.trim()
    found.push({ pos: iceAmeM.index, label: qty ? `아이스 아메리카노 ${qty}` : '아이스 아메리카노' })
  } else if (text.includes('아메리카노')) {
    const isHot = /따뜻한|뜨거운|핫/.test(text)
    const bareAmeRe = new RegExp(`(?:따뜻한\\s*|뜨거운\\s*|핫\\s*)?아메리카노\\s*${QTY_PATTERN}?`)
    const bareM = text.match(bareAmeRe)
    if (bareM && bareM.index !== undefined) {
      const qty = bareM[1]?.trim()
      const displayName = isHot ? '따뜻한 아메리카노' : '아이스 아메리카노'
      found.push({ pos: bareM.index, label: qty ? `${displayName} ${qty}` : displayName })
    }
  }

  // 아이스 라테 (라테/라떼 통합) → displayName: 아이스 라테 / 따뜻한 라테
  const latteBase = '(?:라테|라떼)'
  const iceLaRe = new RegExp(`아이스\\s*${latteBase}\\s*${QTY_PATTERN}?`)
  const iceLaM = text.match(iceLaRe)
  if (iceLaM && iceLaM.index !== undefined) {
    const qty = iceLaM[1]?.trim()
    found.push({ pos: iceLaM.index, label: qty ? `아이스 라테 ${qty}` : '아이스 라테' })
  } else if (/라테|라떼/.test(text)) {
    const isHot = /따뜻한|뜨거운|핫/.test(text)
    const latteRe = new RegExp(`(?:따뜻한\\s*|뜨거운\\s*|핫\\s*)?${latteBase}\\s*${QTY_PATTERN}?`)
    const lm = text.match(latteRe)
    if (lm && lm.index !== undefined) {
      const qty = lm[1]?.trim()
      const displayName = isHot ? '따뜻한 라테' : '라테'
      found.push({ pos: lm.index, label: qty ? `${displayName} ${qty}` : displayName })
    }
  }

  // 오렌지 주스 → displayName: 오렌지 주스
  const juiceRe = new RegExp(`(?:오렌지\\s*)?주스\\s*${QTY_PATTERN}?`)
  const juiceM = text.match(juiceRe)
  if (juiceM && juiceM.index !== undefined) {
    const qty = juiceM[1]?.trim()
    const displayName = text.includes('오렌지') ? '오렌지 주스' : '오렌지 주스'
    found.push({ pos: juiceM.index, label: qty ? `${displayName} ${qty}` : displayName })
  }

  return found.sort((a, b) => a.pos - b.pos).map((x) => x.label)
}

// 메뉴에 없는 품목에 대한 안내 응답을 생성한다.
function buildInvalidItemResponse(invalidItems: string[], hasValidItem: boolean): string {
  const itemName = invalidItems[0]
  const hasBatchim = endsWithBatchim(itemName)
  const subjectMarker = hasBatchim ? '은' : '는'
  if (hasValidItem) {
    return `죄송합니다. 저희 카페에${subjectMarker} ${itemName}이(가) 없습니다. 주문하신 다른 음료는 준비해 드릴 수 있습니다. 메뉴판에 있는 음료나 디저트 중에서 추가로 골라 주세요.`
  }
  return `죄송합니다. 저희 카페에${subjectMarker} ${itemName}이(가) 없습니다. 메뉴판에 있는 음료나 디저트 중에서 골라 주세요.`
}


// Only count student turns where the student was performing the mission.
// Language question turns (asking how to say something) are excluded from
// mission evidence so they cannot accidentally trigger goal completion.
function allStudentText(turns: DialogueTurnInput[]): string {
  return turns
    .filter((t) => t.role === 'student' && !shouldAnswerLanguageQuestion(t.text))
    .map((t) => t.text.toLowerCase())
    .join(' ')
}

function latestStudentText(input: DialogueConversationInput): string {
  return input.latestStudentText.toLowerCase()
}

// 수량 감지 패턴 (conversation/index.ts 내부용)
const QUANTITY_RE_CONV = /(\d+\s*(?:잔|개|컵|병)|한\s*(?:잔|개|컵)|두\s*(?:잔|개|컵)|세\s*(?:잔|개|컵)|네\s*(?:잔|개|컵))/

function buildOrderConfirmation(
  all: string,
  packStr: string,
  totalStr: string,
  payMethod: string,
): string {
  const items = extractOrderedItems(all)
  let orderLine: string
  if (items.length >= 2) {
    const last = items[items.length - 1]
    const rest = items.slice(0, -1).join(', ')
    orderLine = `네, ${withJosa(rest, '와/과')} ${last}${packStr} 준비해 드리겠습니다.`
  } else if (items.length === 1) {
    orderLine = `네, ${items[0]}${packStr} 준비해 드리겠습니다.`
  } else {
    const isIce = hasAny(all, ['아이스', '차가운', 'ice'])
    const drink = hasAny(all, ['라테', '라떼']) ? '라테' : hasAny(all, ['주스']) ? '오렌지 주스' : '아메리카노'
    const tempStr = isIce ? '아이스 ' : '따뜻한 '
    orderLine = `네, ${tempStr}${drink}${packStr} 준비해 드리겠습니다.`
  }
  return `${orderLine}${totalStr} ${payMethod} 결제로 도와드리겠습니다. 주문이 완료되었습니다. 잠시만 기다려 주세요.`
}

function beginnerCafeResponse(input: DialogueConversationInput): string {
  const all = allStudentText(input.turns) + ' ' + latestStudentText(input)
  const latest = latestStudentText(input)

  // 메뉴판에 없는 품목 감지 (최신 발화 기준)
  const invalidInLatest = detectInvalidCafeItems(latest)
  if (invalidInLatest.length > 0) {
    const hasValid = hasValidCafeItem(latest)
    return buildInvalidItemResponse(invalidInLatest, hasValid)
  }

  // 품목별 포장/매장 분리 요청 감지 — 초급에서는 지원하지 않음
  const hasDineIn = hasAny(latest, ['먹고 갈', '매장', '여기서', '드시고'])
  const hasTakeout = hasAny(latest, ['포장', '테이크아웃', '가져갈'])
  if (hasDineIn && hasTakeout) {
    return '이번 주문은 한 가지 이용 방식으로 도와드릴게요. 전체 주문을 매장에서 드시겠어요, 포장하시겠어요?'
  }

  // 품목별 분할 결제 감지 — 초급에서는 지원하지 않음
  if (hasAny(latest, ['카드', '신용카드']) && hasAny(latest, ['현금'])) {
    return '이번 주문은 한 가지 결제 방법으로 도와드릴게요. 카드와 현금 중에서 하나를 선택해 주세요.'
  }

  // 유효한 음료/디저트 키워드만으로 목표 달성 판정 (invalid 품목 제외)
  const drinkMet = hasValidCafeDrink(all) || hasAny(all, ['팥빙수', '빙수', '케이크'])
  const quantityMet = QUANTITY_RE_CONV.test(all)
  const packMet = hasAny(all, ['포장', '테이크아웃', '매장', '여기서', '가져갈', '드시고', '먹고 갈'])
  const paymentMet = hasAny(all, ['카드', '현금', '신용카드'])
  const allGoalsMet = drinkMet && quantityMet && packMet && paymentMet

  // Procedural questions (e.g. "뭘 더 녹음할 게 있나요?") → submit guidance
  if (isProceduralQuestion(latest)) {
    if (allGoalsMet) {
      return "미션이 완료되었습니다. 화면에서 '평가 제출하기' 버튼을 눌러 제출해 주세요."
    }
    if (drinkMet && quantityMet && packMet) {
      return '결제 방법을 말씀해 주세요. 카드 또는 현금 중에서 선택해 주세요.'
    }
    return '아직 주문이 완료되지 않았습니다. 메뉴 품목, 수량, 포장 여부, 결제 방법을 말씀해 주세요.'
  }

  // 모든 목표 달성 → 주문 완료 확인
  if (allGoalsMet) {
    const payMethod = hasAny(latest, ['카드', '신용카드']) ? '카드'
      : hasAny(latest, ['현금']) ? '현금'
      : hasAny(all, ['카드', '신용카드']) ? '카드' : '현금'
    const isPack = hasAny(all, ['포장', '테이크아웃', '가져갈'])
    const isDineIn = hasAny(all, ['매장', '여기서', '드시고', '먹고 갈'])
    const packStr = isPack ? ' 포장으로' : isDineIn ? ' 매장에서' : ''
    const items = extractOrderedItems(all)
    const total = computeOrderTotal(items)
    const totalStr = total > 0 ? ` 총 ${total.toLocaleString()}원입니다.` : ''
    return buildOrderConfirmation(all, packStr, totalStr, payMethod)
  }

  // 음료 있고 수량 있고 포장 있을 때 → 결제 방법 문의
  if (drinkMet && quantityMet && packMet && !paymentMet) {
    const isPack = hasAny(all, ['포장', '테이크아웃', '가져갈'])
    const isDineIn = hasAny(all, ['매장', '여기서', '드시고', '먹고 갈'])
    const packStr = isPack ? ' 포장으로' : isDineIn ? ' 매장에서' : ''
    const items = extractOrderedItems(all)
    const total = computeOrderTotal(items)
    const totalStr = total > 0 ? ` 총 ${total.toLocaleString()}원입니다.` : ''

    let orderLine: string
    if (items.length >= 2) {
      const last = items[items.length - 1]
      const rest = items.slice(0, -1).join(', ')
      orderLine = `네, ${withJosa(rest, '와/과')} ${last}${packStr} 준비해 드리겠습니다.`
    } else if (items.length === 1) {
      orderLine = `네, ${items[0]}${packStr} 준비해 드리겠습니다.`
    } else {
      const isIce = hasAny(all, ['아이스', '차가운', 'ice'])
      const drink = hasAny(all, ['라테', '라떼']) ? '라테' : hasAny(all, ['주스']) ? '오렌지 주스' : '아메리카노'
      const tempStr = isIce ? '아이스 ' : '따뜻한 '
      orderLine = `네, ${tempStr}${drink}${packStr} 준비해 드리겠습니다.`
    }
    return `${orderLine}${totalStr} 결제는 카드로 하시겠어요, 현금으로 하시겠어요?`
  }

  // 음료 있고 수량 있을 때 → 포장/매장 문의
  if (drinkMet && quantityMet && !packMet) {
    return '드시고 가세요, 아니면 포장해 드릴까요?'
  }

  // 음료 있을 때 → 수량 문의
  if (drinkMet && !quantityMet) {
    return '몇 잔 준비해 드릴까요?'
  }

  return '어떤 음료나 디저트를 드릴까요? 아이스 아메리카노, 따뜻한 아메리카노, 라테, 오렌지 주스, 팥빙수, 조각 케이크 중에서 고르실 수 있어요.'
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

export class MockDialogueConversationProvider implements DialogueConversationProvider {
  async getDialogueResponse(input: DialogueConversationInput): Promise<DialogueConversationOutput> {
    const start = Date.now()
    await new Promise<void>((resolve) => setTimeout(resolve, MOCK_LATENCY_MS))

    const mode = input.mode ?? 'assessment'
    const policy = getDialoguePolicy(mode, input.level, input.personaId)

    // Language question detection — apply policy-based response
    if (shouldAnswerLanguageQuestion(input.latestStudentText)) {
      const personaId = input.personaId ?? this.#inferPersonaId(input.questionId)
      const text =
        policy.allowLanguageHelp === 'full'
          ? answerLanguageQuestionForPractice(input.latestStudentText, input.level, personaId)
          : answerLanguageQuestionForAssessment(input.latestStudentText, input.level, personaId)
      return { text, providerName: 'mock', latencyMs: Date.now() - start, status: 'success' }
    }

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
        // For practice mode with unknown questionId, give a more open response
        text = policy.autonomyLevel === 'open'
          ? '좋아요! 계속 말해 보세요. 어떤 내용이든 괜찮습니다.'
          : FALLBACK_RESPONSE
    }

    return {
      text,
      providerName: 'mock',
      latencyMs: Date.now() - start,
      status: 'success',
    }
  }

  #inferPersonaId(questionId: string): string {
    if (questionId.includes('beginner')) return 'cafe_staff_friendly'
    if (questionId.includes('intermediate')) return 'admin_staff_clear'
    if (questionId.includes('advanced')) return 'event_partner_professional'
    return 'cafe_staff_friendly'
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
  if (name === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.warn('[conversation] CONVERSATION_PROVIDER=openai but OPENAI_API_KEY missing — falling back to mock')
      return new MockDialogueConversationProvider()
    }
    const model = process.env.OPENAI_DIALOGUE_MODEL ?? process.env.OPENAI_EVAL_MODEL ?? 'gpt-4o-mini'
    // openai SDK 자체는 OpenAIDialogueConversationProvider 안에서 동적 import 됨
    return new OpenAIDialogueConversationProvider(apiKey, model)
  }
  return new MockDialogueConversationProvider()
}
