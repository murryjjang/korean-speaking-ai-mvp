// LLM 기반 q4 대화 미션 평가 모듈.
//
// 1) 미션 충족도(boolean × 미션 개수) — 자연 발화 변형까지 LLM이 의미 단위로 판정
// 2) 정성 평가(자연스러움·정확성·응답성, 각 0~100)
//
// 두 결과를 합산해 60(정량) + 40(정성) = 100점 하이브리드 점수를 산출한다.
// LLM 호출 실패 시 호출부에서 detectMissionProgress(규칙 기반) 폴백으로 회귀.

import type { DialogueTurn, MissionGoalResult } from '@/src/types/dialogue'
import { detectMissionProgress } from '@/src/lib/dialogue-mission'

export interface DialogueQualitativeScores {
  naturalness: number
  koreanAccuracy: number
  responsiveness: number
  feedback: string
}

export interface DialogueLLMEvaluation {
  missionResults: MissionGoalResult[]
  qualitative: DialogueQualitativeScores
  rawResponse: string
}

export interface DialogueHybridScore {
  total: number
  quantitativeRaw: number
  quantitativeMax: number
  quantitativeScore: number
  qualitativeScore: number
  qualitativeBreakdown: {
    naturalness: number
    koreanAccuracy: number
    responsiveness: number
  }
}

const SYSTEM_PROMPT_TEMPLATE = `당신은 한국어 말하기 평가 전문가입니다.
학습자(외국인)와 NPC의 대화를 보고 다음 두 가지를 평가합니다.

1. 미션 충족도: 주어진 미션 각 항목을 학습자가 달성했는지 boolean으로 판정합니다.
   - 학습자가 같은 항목을 여러 번 표현하면 한 번이라도 충족하면 됩니다.
   - 수량 표현은 다양한 형태를 모두 인정합니다:
     * 숫자 + 단위: "5잔", "2개"
     * 한자어 + 단위: "한 잔", "다섯 잔"
     * 단위 + 숫자(어순 변형): "잔 5", "잔 다섯"
     * 자연어: "다섯 잔으로 주세요", "5잔이요"
   - 비표준 표현도 인정합니다:
     * 모음·자음 부정확한 발화 ("캐시지" → "현금" 의도)
     * 어순 변형 ("잔 5" → "5잔" 의도)
     * 반말·어색한 표현이어도 의도가 명확하면 충족
   - NPC가 다음 단계 질문을 했다면 이전 단계가 충족됐다고 NPC가 판단한 것 — 평가도 일관되게 판정합니다.
   - 학습자 의도가 모호할 때만 미충족으로 판정. 명백히 표현했으면 충족.
   - 학습자가 명시적으로 표현해야 합니다. NPC가 추측하거나 NPC가 먼저 말한 내용은 학습자 달성이 아닙니다.

2. 정성 평가: 학습자 발화 전반의 자연스러움·한국어 정확성·응답성을 각 0~100으로 평가합니다.
   - 자연스러움(naturalness): 한국어 발화가 자연스럽고 어색함이 없는가
   - 한국어 정확성(korean_accuracy): 어휘·문법·존댓말 사용이 정확한가
   - 응답성(responsiveness): NPC 질문에 적절히 응답했는가

[출력 형식 — 반드시 이 JSON 구조로만, 다른 텍스트나 코드 블록 없이]
{
  "mission": [
    { "goalIndex": 0, "achieved": true, "evidence": "학습자 발화 인용 또는 근거" },
    { "goalIndex": 1, "achieved": false, "evidence": "..." }
  ],
  "qualitative": {
    "naturalness": 85,
    "korean_accuracy": 78,
    "responsiveness": 92,
    "feedback_ko": "학습자에게 줄 한국어 피드백 1~2문장"
  }
}

[판정 예시]
예시 1 — 어순 변형:
미션: "수량 말하기"
학습자 발화: "라떼 잔 5 주세요"
판정: achieved=true, evidence="수량 '5'와 단위 '잔' 표현 (어순 변형)"

예시 2 — 정상 표현:
미션: "수량 말하기"
학습자 발화: "라떼 5잔 주세요"
판정: achieved=true, evidence="수량 '5잔' 명시"

예시 3 — 미언급:
미션: "수량 말하기"
학습자 발화: "라떼 주세요"
판정: achieved=false, evidence="수량 미언급"

예시 4 — 비표준 결제 표현:
미션: "결제 방법 말하기"
학습자 발화: "남자는 캐시지"
판정: achieved=true, evidence="현금(cash) 결제 의도 표현 (발음 어색하지만 명확)"

[미션 목표]
{mission_goals}

[대화 내용]
{conversation}`

function buildPrompt(turns: DialogueTurn[], missionGoals: string[]): string {
  const conversation = turns
    .filter((t) => t.status === 'completed' && (t.role === 'student' || t.role === 'ai'))
    .map((t) => `${t.role === 'student' ? '학습자' : 'NPC'}: ${t.text}`)
    .join('\n')

  const goalsText = missionGoals.map((g, i) => `${i}. ${g}`).join('\n')

  return SYSTEM_PROMPT_TEMPLATE
    .replace('{mission_goals}', goalsText || '(미션 목표 없음)')
    .replace('{conversation}', conversation || '(대화 없음)')
}

export function clampScore(n: unknown): number {
  const x = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.min(100, Math.round(x)))
}

export async function evaluateDialogueWithLLM(
  turns: DialogueTurn[],
  missionGoals: string[],
  apiKey: string,
  modelOverride?: string,
): Promise<DialogueLLMEvaluation> {
  if (!apiKey) {
    throw new Error('evaluateDialogueWithLLM: apiKey is required')
  }

  const model =
    modelOverride ??
    process.env.OPENAI_DIALOGUE_EVAL_MODEL ??
    process.env.OPENAI_EVAL_MODEL ??
    'gpt-4o-mini'

  const { OpenAI } = await import('openai')
  const client = new OpenAI({ apiKey })

  const prompt = buildPrompt(turns, missionGoals)

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: '위 대화를 평가하세요.' },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 800,
  })

  const raw = response.choices[0]?.message?.content ?? ''
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('evaluateDialogueWithLLM: invalid JSON response')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('evaluateDialogueWithLLM: response not an object')
  }

  const obj = parsed as Record<string, unknown>
  const missionArr = obj.mission
  const qualitative = obj.qualitative

  if (!Array.isArray(missionArr) || !qualitative || typeof qualitative !== 'object') {
    throw new Error('evaluateDialogueWithLLM: missing mission[] or qualitative{}')
  }

  const qualObj = qualitative as Record<string, unknown>

  const missionResults: MissionGoalResult[] = missionGoals.map((labelKo, idx) => {
    const item = (missionArr as Array<Record<string, unknown>>).find(
      (m) => Number(m.goalIndex) === idx,
    )
    const evidenceVal = item && typeof item.evidence === 'string' ? item.evidence : undefined
    return {
      goalIndex: idx,
      labelKo,
      achieved: !!(item && item.achieved === true),
      evidence: evidenceVal ? [evidenceVal] : undefined,
    }
  })

  return {
    missionResults,
    qualitative: {
      naturalness: clampScore(qualObj.naturalness),
      koreanAccuracy: clampScore(qualObj.korean_accuracy),
      responsiveness: clampScore(qualObj.responsiveness),
      feedback: typeof qualObj.feedback_ko === 'string' ? qualObj.feedback_ko : '',
    },
    rawResponse: raw,
  }
}

export function computeHybridScore(evaluation: DialogueLLMEvaluation): DialogueHybridScore {
  const totalGoals = evaluation.missionResults.length
  const achievedGoals = evaluation.missionResults.filter((r) => r.achieved).length

  const quantitativeScore =
    totalGoals > 0 ? Math.round((achievedGoals / totalGoals) * 60) : 0

  const qAvg =
    (evaluation.qualitative.naturalness +
      evaluation.qualitative.koreanAccuracy +
      evaluation.qualitative.responsiveness) /
    3
  const qualitativeScore = Math.round(qAvg * 0.4)

  return {
    total: quantitativeScore + qualitativeScore,
    quantitativeRaw: achievedGoals,
    quantitativeMax: totalGoals,
    quantitativeScore,
    qualitativeScore,
    qualitativeBreakdown: {
      naturalness: evaluation.qualitative.naturalness,
      koreanAccuracy: evaluation.qualitative.koreanAccuracy,
      responsiveness: evaluation.qualitative.responsiveness,
    },
  }
}

export interface DialogueMissionHybridResult {
  results: MissionGoalResult[]
  hybridScore: DialogueHybridScore | null
  qualitative: DialogueQualitativeScores | null
  source: 'llm' | 'rule'
}

export async function evaluateDialogueMissionHybrid(
  questionId: string,
  missionGoals: string[],
  turns: DialogueTurn[],
): Promise<DialogueMissionHybridResult> {
  const useLLM = process.env.CONVERSATION_PROVIDER === 'openai'
  const apiKey = process.env.OPENAI_API_KEY

  if (useLLM && apiKey) {
    try {
      const evaluation = await evaluateDialogueWithLLM(turns, missionGoals, apiKey)
      const hybridScore = computeHybridScore(evaluation)
      return {
        results: evaluation.missionResults,
        hybridScore,
        qualitative: evaluation.qualitative,
        source: 'llm',
      }
    } catch (error) {
      console.warn(
        '[dialogue-mission] LLM evaluation failed, falling back to rule-based:',
        error,
      )
    }
  }

  const results = detectMissionProgress(questionId, missionGoals, turns)
  return { results, hybridScore: null, qualitative: null, source: 'rule' }
}
