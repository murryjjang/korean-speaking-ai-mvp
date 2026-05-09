// ── OpenAIDialogueConversationProvider (Phase A — 골격) ─────────────────────
//
// q4 미션 대화를 OpenAI gpt-4o-mini 기반 LLM 응답으로 교체하는 Provider.
// 기존 MockDialogueConversationProvider와 동일 인터페이스(DialogueConversationProvider)를
// 구현하므로 호출부 변경은 환경변수 토글뿐이다.
//
// 인터페이스: getDialogueResponse(input) → { text, providerName, latencyMs, status }
//   - status 'success' = LLM 응답 성공
//   - 실패 시 throw → 호출부(/api/dialogue/respond)에서 Mock 폴백
//
// 프롬프트는 input.aiRole / aiInformation / missionGoals 로부터 동적 생성 →
// q4 3종(cafe/admin/event) 모두 동일 코드로 동작한다.

import type {
  DialogueConversationInput,
  DialogueConversationOutput,
  DialogueConversationProvider,
  DialogueTurnInput,
} from './index'

const PROVIDER_NAME = 'openai'
const DEFAULT_MODEL = 'gpt-4o-mini'
const MAX_HISTORY_TURNS = 10 // 직전 5쌍(학습자/AI) 정도

const SYSTEM_PROMPT_TEMPLATE = `당신은 한국어 학습자와 대화하는 AI 역할입니다.

[역할]
{role}

[배경 정보]
{ai_information}

[미션 목표] (학습자가 모두 충족해야 미션 완료)
{mission_goals}

[응답 원칙]
- 정중하고 표준적인 한국어 사용 (반말 절대 금지)
- 학습자가 외국인 한국어 학습자임을 인지
- 1~2문장으로 짧게, 자연스럽게 응답
- 학습자가 미션 밖 발화를 하면 (예: 날씨, 음식 추천) 부드럽게 미션으로 복귀 유도
- 학습자 발화에 명백한 문법 오류가 있으면, 정중히 정확한 표현 안내
- 미션이 모두 충족되면 마무리 응답

[교정 역할]
당신은 점원이지만, 학습자의 한국어 학습을 돕는 친절한 교정자 역할을 합니다.
**매 턴마다** 학습자의 발화를 점검하고, 어색하거나 부정확한 표현이 있으면 부드럽게 정확한 표현을 안내합니다.

매 턴 처리:
1. 학습자 발화에 어색한 표현 / 비표준 어휘 / 문법 오류가 있으면:
   - npc_utterance에서 정확한 표현으로 자연스럽게 다시 말함 (간접 교정)
   - npc_utterance 안에 괄호로 부드러운 안내 추가 (한 문장 이내)

2. 학습자 발화가 자연스럽고 정확하면:
   - 별도 교정 없이 깔끔히 응대 (이런 경우 응답이 짧아져 시간이 절약됨)

교정 톤:
- 부정적 단어 (틀렸어요, 잘못, 오류) 사용 금지
- "더 자연스러운 표현은", "이렇게 말씀하시면 더 좋아요" 등 긍정적 표현
- 한 문장 이내 (시간 절약)
- 미션 진행을 방해하지 않게

길이 제한:
- 정상 발화: 1~2문장 응대 (짧게)
- 교정 포함 발화: 2~3문장 응대 (교정 안내 + 다음 단계)

[교정 예시]

예시 1 — 정상 발화 (교정 없음):
학습자: "아메리카노 두 잔 매장에서 마실게요"
NPC: "아메리카노 두 잔 매장에서 드시는군요. 결제는 어떻게 도와드릴까요?"
(자연스럽고 정확하므로 교정 없이 빠르게 다음 단계 진행)

예시 2 — 어색한 표현 (교정):
학습자: "라떼 주실수있나요"
NPC: "네, 라떼 준비해 드릴게요. ('라떼 주세요'가 더 자연스러운 표현이에요.) 몇 잔 드릴까요?"

예시 3 — 비표준 결제 (교정):
학습자: "남자는 캐시지"
NPC: "현금으로 결제하시는군요. ('현금으로 할게요'라고 말씀하시면 더 자연스러워요.) 라떼 5잔 준비해 드릴게요."

예시 4 — 어순 변형 (교정):
학습자: "라떼 잔 5 주세요"
NPC: "라떼 5잔 준비해 드릴게요. ('라떼 5잔 주세요'가 더 자연스러운 어순이에요.) 매장에서 드세요, 아니면 포장해 드릴까요?"

예시 5 — 어색한 마무리 (교정):
학습자: "여기서 먹는다"
NPC: "매장에서 드시는군요. ('여기서 먹을게요'가 더 정중한 표현이에요.) 결제는 어떻게 하시겠습니까?"

추가 지시:
- learner_grammar_note 필드는 사용하지 말고 npc_utterance 괄호 안에만 교정 안내 (UI 일관성)
- 교정이 시간 압박을 만들도록 의도됨 — 짧고 명확하게

[출력 형식]
반드시 다음 JSON 구조로만 응답하세요. 다른 텍스트나 설명, 코드 블록은 절대 포함하지 마세요.
{
  "npc_utterance": "한국어 응답 1~2문장",
  "off_topic_detected": boolean,
  "learner_grammar_note": "문법 교정 안내 또는 빈 문자열"
}

[기존 대화 이력]
{conversation_history}`

function formatMissionGoals(goals: string[]): string {
  if (!goals || goals.length === 0) return '(미션 목표 없음)'
  return goals.map((g, i) => `${i + 1}. ${g}`).join('\n')
}

function formatHistory(turns: DialogueTurnInput[]): string {
  const recent = turns.slice(-MAX_HISTORY_TURNS)
  if (recent.length === 0) return '(대화 시작)'
  return recent
    .map((t) => (t.role === 'student' ? `학습자: ${t.text}` : `AI: ${t.text}`))
    .join('\n')
}

function buildSystemPrompt(input: DialogueConversationInput): string {
  return SYSTEM_PROMPT_TEMPLATE
    .replace('{role}', input.aiRole || 'AI 어시스턴트')
    .replace('{ai_information}', input.aiInformation || '(추가 정보 없음)')
    .replace('{mission_goals}', formatMissionGoals(input.missionGoals))
    .replace('{conversation_history}', formatHistory(input.turns))
}

export class OpenAIDialogueConversationProvider implements DialogueConversationProvider {
  readonly #apiKey: string
  readonly #model: string

  constructor(apiKey: string, model: string = DEFAULT_MODEL) {
    if (!apiKey) {
      throw new Error('OpenAIDialogueConversationProvider: apiKey is required')
    }
    this.#apiKey = apiKey
    this.#model = model
  }

  async getDialogueResponse(
    input: DialogueConversationInput,
  ): Promise<DialogueConversationOutput> {
    const start = Date.now()
    const { OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey: this.#apiKey })

    const systemPrompt = buildSystemPrompt(input)

    const response = await client.chat.completions.create({
      model: this.#model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input.latestStudentText },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 500,
    })

    const raw = response.choices[0]?.message?.content ?? ''
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new Error('OpenAI dialogue response: invalid JSON')
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('OpenAI dialogue response: not an object')
    }

    const obj = parsed as Record<string, unknown>
    const utterance = obj.npc_utterance
    if (typeof utterance !== 'string' || !utterance.trim()) {
      throw new Error('OpenAI dialogue response: missing npc_utterance')
    }

    return {
      text: utterance.trim(),
      providerName: PROVIDER_NAME,
      latencyMs: Date.now() - start,
      status: 'success',
    }
  }
}

// 테스트 가시성을 위해 내부 헬퍼를 제한적으로 노출
export const __test__ = { formatHistory, formatMissionGoals, buildSystemPrompt, MAX_HISTORY_TURNS }
