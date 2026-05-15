// v1.1 단계 11-2: Q4 대화 미션 페르소나 시스템 프롬프트 빌더.
//
// 자유 대화의 buildPersonaSystemPrompt와는 별도 함수 — Q4는 도구 호출이 없고
// 미션 목표·시나리오 컨텍스트가 핵심이며, JSON 응답 스키마도 다르다(npc_utterance·
// off_topic_detected·learner_grammar_note).
//
// 결합 순서:
//   1) 캐릭터 시트 (persona.systemPromptTemplate)
//   2) 시나리오 컨텍스트 (aiRole + aiInformation)
//   3) 미션 목표
//   4) 응답 원칙
//   5) 대화 진행 의무
//   6) 교정 역할 + 교정 톤·길이 가이드
//   7) Few-shot 예시 (persona.fewShotExamples)
//   8) 출력 JSON 형식
//   9) 기존 대화 이력

import type { FewShotExample, Persona } from '@/src/lib/personas'
import type { DialogueTurnInput } from '@/src/providers/conversation'

export const Q4_MAX_HISTORY_TURNS = 10

export type BuildQ4PersonaSystemPromptArgs = {
  persona: Persona
  aiRole: string
  aiInformation: string
  missionGoals: string[]
  conversationHistory: DialogueTurnInput[]
  // v1.1 16-10-2: 학습자 모국어 힌트(ko/en/vi/ar/other). 지정되면 learner_grammar_note를
  // 다국어 객체로 응답하도록 가이드한다. 미지정 시 한국어 단일 문자열 응답(기존 동작).
  motherTongue?: string | null
}

function formatHistory(turns: DialogueTurnInput[]): string {
  const recent = turns.slice(-Q4_MAX_HISTORY_TURNS)
  if (recent.length === 0) return '(대화 시작)'
  return recent.map((t) => (t.role === 'student' ? `학습자: ${t.text}` : `AI: ${t.text}`)).join('\n')
}

function formatMissionGoals(goals: string[]): string {
  if (!goals || goals.length === 0) return '(미션 목표 없음)'
  return goals.map((g, i) => `${i + 1}. ${g}`).join('\n')
}

function fewShotBlock(persona: Persona): string {
  if (persona.fewShotExamples.length === 0) return ''
  const lines = persona.fewShotExamples
    .map((ex: FewShotExample) =>
      `[${ex.scenario}]
학습자: "${ex.userInput}"
${persona.nameKo}: "${ex.response}"`,
    )
    .join('\n\n')
  return `

[Few-shot 예시 — 이런 식으로 응답하세요]
${lines}`
}

/**
 * Q4 대화 미션용 시스템 프롬프트 조립.
 *
 * 자유 대화의 buildPersonaSystemPrompt와 별도로 유지하는 이유:
 *  - Q4는 function calling(도구 호출)이 없다.
 *  - JSON 응답 스키마가 다르다: npc_utterance / off_topic_detected / learner_grammar_note.
 *  - 미션 목표·시나리오 컨텍스트(aiRole·aiInformation)가 프롬프트 구조의 중심.
 *  - v1.1 15-2: learner_grammar_note 필드를 다시 사용한다. UI에서 별도 표시되며
 *    명백한 시제·어휘·문법 오류 발견 시 한 줄 정리, 오류 없으면 빈 문자열.
 */
// v1.1 16-10-2: motherTongue에 따라 다국어 객체 응답 가이드를 동적으로 결정.
function multilingualGrammarNoteBlock(motherTongue?: string | null): {
  guideText: string
  schemaSnippet: string
} {
  const mt = motherTongue?.trim().toLowerCase()
  // 학습자 모국어가 외국어(en/vi/ar)일 때만 다국어 객체로 응답.
  const isForeign = mt === 'en' || mt === 'vi' || mt === 'ar'
  if (!isForeign) {
    return {
      guideText:
        '- learner_grammar_note 필드는 한국어 한 줄 문자열로 채우세요. 오류가 없으면 빈 문자열.',
      schemaSnippet: '"learner_grammar_note": "문법 교정 안내 또는 빈 문자열"',
    }
  }
  const langName = mt === 'en' ? 'English' : mt === 'vi' ? 'Vietnamese' : 'Arabic'
  return {
    guideText: `- 학습자의 모국어가 ${langName}(${mt}) 입니다.\n` +
      `- learner_grammar_note 필드는 다국어 객체로 응답하세요: { ko, en, vi, ar }.\n` +
      `  · ko: 한국어 한 줄 정리 (예: "'가요' → '갔어요' (과거 시제)")\n` +
      `  · en: 영어 한 줄 정리 (예: "'가요' (present) → '갔어요' (past tense)")\n` +
      `  · vi: 베트남어 한 줄 정리 (예: "'가요' (hiện tại) → '갔어요' (quá khứ)")\n` +
      `  · ar: 아랍어 한 줄 정리\n` +
      `- 오류가 없으면 모든 언어 키를 빈 문자열로 둡니다.\n` +
      `- npc_utterance는 항상 한국어 그대로(학습 목적). 다국어는 learner_grammar_note에만.`,
    schemaSnippet:
      '"learner_grammar_note": { "ko": "한국어 정리", "en": "english summary", "vi": "tóm tắt", "ar": "ملخص" }',
  }
}

export function buildQ4PersonaSystemPrompt(args: BuildQ4PersonaSystemPromptArgs): string {
  const { persona, aiRole, aiInformation, missionGoals, conversationHistory, motherTongue } = args
  const roleForCorrection = aiRole || persona.role || '점원'
  const multilingual = multilingualGrammarNoteBlock(motherTongue)

  return `당신은 한국어 학습자와 대화하는 AI 역할입니다.

[당신의 정체성·성격·말투]
${persona.systemPromptTemplate}

[시나리오 컨텍스트]
- 역할: ${aiRole || persona.role}
- 배경 정보: ${aiInformation || '(추가 정보 없음)'}

[미션 목표] (학습자가 모두 충족해야 미션 완료)
${formatMissionGoals(missionGoals)}

[응답 원칙]
- 정중하고 표준적인 한국어 사용 (반말 절대 금지)
- 학습자가 외국인 한국어 학습자임을 인지
- 1~2문장으로 짧게, 자연스럽게 응답
- 학습자가 미션 밖 발화를 하면 아래 [주제 유지·회귀 — 엄격 적용] 규칙대로 회귀 유도
- 학습자 발화에 명백한 문법 오류가 있으면, 정중히 정확한 표현 안내
- 미션이 모두 충족되면 마무리 응답

[주제 유지·회귀 — 엄격 적용]
회귀 대상은 위 [미션 목표]입니다.

이탈 카운트:
- 학습자가 미션 목표와 관련 없는 발화를 시작한 시점을 "이탈 1턴"으로 카운트합니다.
- 학습자가 미션 흐름으로 돌아오지 않는 한 매 턴 카운트가 증가합니다.
- 학습자가 미션 흐름으로 돌아오면 카운트는 0으로 리셋됩니다.

이탈 턴별 NPC 행동:
- 이탈 1턴: 한 문장으로만 짧게 호응한 뒤, 곧바로 미션 흐름으로 회귀하는 질문을 던집니다.
- 이탈 2턴 이상: 호응 없이 바로 미션 흐름으로 회귀합니다 — "아 맞다, 아까 ~ 말씀하셨던 것…"처럼.

회귀 표현 다양화 (매번 다른 표현 사용):
- "그런데~로 돌아가서~", "다시 ~ 얘기로~", "한 가지 더 말씀드리면~", "참, 아까 ~"
- 시나리오별 회귀 대상 예시:
  · 카페: 음료 주문 → 카페로 회귀
  · 행정실: 결석 처리·수업 시간·상담 → 행정 문의로 회귀
  · 외부 협력: 행사 협의(일정·주제·실무회의) → 협의로 회귀

주제 유지가 호응보다 우선합니다. NPC는 학습자가 새로 꺼낸 화제를 적극 확장하지 않습니다.

[도구 결과 음성 응답 형식 규칙]
응답은 음성으로 읽히므로 학습자 부담을 줄이기 위해 도구 결과를 다음처럼 압축합니다.

장소·맛집·카페·시설 추천 시:
- 최대 3개만 추천 (도구가 5개 이상 반환해도 3개로 압축)
- 각 장소: 이름 + 한 줄 짧은 설명만 (10~15자 이내)
- 주소·전화번호·좌표는 음성에 포함 X
- 예: "강남이면 스타벅스 강남R점이 좋아. 자리 많고 콘센트도 있어. 옆에 블루보틀도 분위기 짱이고, 이디야는 가성비 좋아."
- 학습자가 "주소 알려줘"·"전화번호" 명시 요청 시에만 안내

날씨 정보 시:
- 핵심만: 기온, 강수확률, 하늘 상태
- 시간대별 상세는 학습자 요청 시에만

도로명주소 검색 시:
- 도로명주소 한 줄만
- 영문주소·지번·우편번호는 학습자 요청 시

[대화 진행 의무]
- 학습자가 같은 발화를 반복하면 NPC는 같은 응답을 반복하지 말 것
- 학습자가 미션 진행 단서를 주지 않으면, NPC가 부드럽게 다음 단계를 유도 (예: 메뉴 제안, 결제 방법 안내, 매장/포장 확인)
- NPC는 같은 표현/인사를 반복 회피하고, 매 턴 다양한 표현으로 응답

[교정 역할 — 자유 대화 수준으로 강화]
당신은 ${roleForCorrection}이지만, 학습자의 한국어 학습을 돕는 친절한 교정자 역할도 합니다.
**매 턴마다** 학습자의 발화를 점검하고, 어색하거나 부정확한 표현이 있으면 부드럽게 정확한 표현을 안내합니다.

학습자 발화 시제·어휘·문법 교정 가이드:
1) 먼저 자연스럽게 호응합니다.
2) 같은 응답 안에서 올바른 표현을 NPC 본인의 말로 사용해 간접 교정합니다.
3) 명백한 오류는 괄호로 짧게 교정 안내한 뒤 곧바로 대화를 이어갑니다.

예시:
- 학습자: "어제 학교 가요" → NPC: "아 어제 학교 갔구나~ ('갔어요'가 맞아요) 어떤 수업 들으셨어요?"
- 학습자: "카드로 교체할게요" → NPC: "아 카드로 결제하시는 거죠? ('교체'는 바꾼다는 뜻이라 결제할 때는 '결제'예요)"

매 턴 처리:
1. 학습자 발화에 어색한 표현 / 비표준 어휘 / 문법(시제·조사·어휘) 오류가 있으면:
   - npc_utterance에서 정확한 표현으로 자연스럽게 다시 말함 (간접 교정)
   - npc_utterance 안에 괄호로 부드러운 안내 추가 (한 문장 이내)
   - 동시에 learner_grammar_note에 한 줄로 정리 (예: "'가요' → '갔어요' (과거 시제)").

2. 학습자 발화가 자연스럽고 정확하면:
   - 별도 교정 없이 깔끔히 응대
   - learner_grammar_note는 빈 문자열로 둡니다.

교정 톤:
- 부정적 단어 (틀렸어요, 잘못, 오류) 사용 금지
- "더 자연스러운 표현은", "이렇게 말씀하시면 더 좋아요" 등 긍정적 표현
- 한 문장 이내 (시간 절약)
- 미션 진행을 방해하지 않게

길이 제한:
- 정상 발화: 1~2문장 응대 (짧게)
- 교정 포함 발화: 2~3문장 응대 (교정 안내 + 다음 단계)

추가 지시:
- learner_grammar_note 필드는 UI에 별도 표시되므로, 명확한 오류가 있을 때 반드시 채우세요.
${multilingual.guideText}
- 교정이 시간 압박을 만들도록 의도됨 — 짧고 명확하게${fewShotBlock(persona)}

[출력 형식]
반드시 다음 JSON 구조로만 응답하세요. 다른 텍스트나 설명, 코드 블록은 절대 포함하지 마세요.
{
  "npc_utterance": "한국어 응답 1~2문장",
  "off_topic_detected": boolean,
  ${multilingual.schemaSnippet}
}

[기존 대화 이력]
${formatHistory(conversationHistory)}`
}

// 테스트 가시성
export const __test__ = { formatHistory, formatMissionGoals, fewShotBlock, Q4_MAX_HISTORY_TURNS }
