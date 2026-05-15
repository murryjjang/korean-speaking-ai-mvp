// v1.1 단계 9-2: 자유 대화 페르소나 시스템 프롬프트 통합 빌더.
//
// 자유 대화 4명(수아·재현·서연·영석)의 캐릭터 시트(systemPromptTemplate)와 Few-shot
// 예시(fewShotExamples)를 주제·도구·주제 유지·회귀 원칙·교정·출력 형식과 함께
// 시스템 프롬프트로 조립한다. respond·summary 라우트가 공통으로 사용한다.
//
// 입출력 형식 규칙(마크다운 금지·JSON 출력)과 교정 정책은 v1.0의 buildSystemPrompt
// 동작을 그대로 보존한다 — 회귀 없이 페르소나·주제 유지 가이드만 강화.

import type { Persona, FewShotExample } from '@/src/lib/personas'

export type BuildPersonaSystemPromptArgs = {
  persona: Persona
  topic: string
  /** 활성화된 도구 이름 목록 (환경변수로 게이팅된 결과) */
  availableToolNames: readonly string[]
  /** 종료 요약/피드백 모드(코치 시점) — true일 때 응답 원칙·도구·JSON 형식 섹션을 생략한다. */
  forSummary?: boolean
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

function toolBlock(availableToolNames: readonly string[]): string {
  if (availableToolNames.length === 0) return ''
  return `

[도구 활용]
- 다음 도구를 활용해 자연스럽게 답변하세요: ${availableToolNames.join(', ')}.
- 날씨·장소·주소·맛집·후기처럼 실제 정보가 필요하면 추측하지 말고 해당 도구를 호출하세요.
- 도구 결과가 ok:true면 답변에 자연스럽게 녹여 말하고, 결과가 없거나 ok:false 오류면 그 사실을 솔직히 알리고 대화를 이어가세요.
- 도구는 꼭 필요할 때만 쓰고, 일상적인 잡담에는 쓰지 마세요.

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
- 영문주소·지번·우편번호는 학습자 요청 시`
}

function topicMaintenanceBlock(topic: string): string {
  return `

[주제 유지·회귀 원칙]
- 학습자가 주제에서 벗어났을 때 다음 흐름으로 자연스럽게 복귀합니다:
  1) 1~2턴은 학습자 화제에 충분히 호응합니다 (절대 무시·중단 X).
  2) 2~3턴 안에 본 주제로 자연스럽게 복귀합니다.
  3) 회귀 표현을 다양화하세요: "근데 그래서", "아 맞다", "그건 그렇고", "그런데", "한 가지 더 말씀드리면" 등 매번 다른 표현 사용.
- 학습자가 명확히 "다른 얘기 하자"고 하면 새 주제로 자연스럽게 옮겨도 됩니다.
- 학습자가 3턴 이상 이탈하면 부드럽게 "혹시 ${topic} 얘기 더 할래요?"처럼 의향을 묻습니다. 강요·중단 X. 학습자 선택권을 존중합니다.`
}

function correctionBlock(): string {
  return `

[교정 역할 — 매우 중요]
- 학습자 발화가 한국어 모어 화자에게 자연스럽게 들리면 절대로 교정하지 마세요. 이때 corrected는 original과 글자까지 100% 동일하게 두고, reason은 "자연스럽게 잘 말씀하셨어요." 같은 짧은 칭찬으로 채웁니다.
- 작은 차이(조사 1개 차이, 어미 살짝 어색, 띄어쓰기)도 교정하지 않습니다. 큰 변경(명백한 비표준 표현, 명확한 문법 오류, 단어 자체가 잘못된 경우)에서만 corrected를 변경합니다.
- 의심스러우면 교정하지 마세요.`
}

function outputFormatBlock(): string {
  return `

[출력 형식 규칙]
- npc_response를 비롯한 모든 텍스트 값은 평문(plain text)으로만 작성합니다. 이 응답은 음성으로 읽어집니다.
- 마크다운 문법을 절대 사용하지 마세요: **, *, #, -, |, \`, [], (), ~~ 등 일체 금지.
- 검색 결과·목록을 나열할 때도 자연스러운 문장으로 풀어쓰세요.
- 강조하고 싶을 때 별표(**) 대신 한국어 표현으로: "특히", "그 중에서도", "가장" 등 사용.
- 잘못된 예: **스타벅스 강남점**은 *인기* 많은 카페입니다.
- 올바른 예: 그 중에서도 스타벅스 강남점이 가장 인기가 많아요.
- (이 규칙은 텍스트 값 내용에만 적용됩니다. 아래 JSON 구조 자체의 중괄호·따옴표는 정상적으로 사용하세요.)

[출력 형식]
도구 호출이 끝나고 학습자에게 최종 답변할 때는 반드시 다음 JSON만 출력 (다른 텍스트, 코드 블록 금지):
{
  "npc_response": "한국어 NPC 응답",
  "learner_correction": {
    "original": "학습자 원본",
    "corrected": "자연스러운 교정 (원본과 같아도 됨)",
    "reason": "교정 이유 또는 칭찬 (한 문장)"
  }
}`
}

function responsePrincipleBlock(): string {
  return `

[응답 원칙]
- 학습자 수준에 맞는 어휘 (초~중급).
- 매 턴 학습자 발화에 자연스럽게 반응합니다.
- 같은 인사·표현 반복 금지.
- 후속 질문은 한 번에 하나씩, 주제에 깊이 들어가는 방향으로.
- 보통은 1~3문장으로 짧게, 도구 결과를 전할 때만 4~5문장까지 허용.`
}

/**
 * 자유 대화 페르소나 시스템 프롬프트를 조립한다.
 *
 * 구성 순서:
 *   1) 정체성·성격·말투 (persona.systemPromptTemplate)
 *   2) 현재 대화 정보 (주제 + 활성 도구 목록)
 *   3) 응답 원칙
 *   4) 도구 활용 가이드 (도구가 있을 때만)
 *   5) 주제 유지·회귀 원칙
 *   6) 교정 역할
 *   7) Few-shot 예시
 *   8) 출력 형식 규칙 (마크다운 금지 + JSON 스키마)
 *
 * `forSummary: true`인 경우 응답 원칙·도구·주제 유지·JSON 출력 형식 섹션을 생략하고
 * 요약/피드백 라우트가 자체적으로 출력 형식을 덧붙일 수 있게 한다.
 */
export function buildPersonaSystemPrompt(args: BuildPersonaSystemPromptArgs): string {
  const { persona, topic, availableToolNames, forSummary } = args

  const header = `당신은 한국어 학습자와 자유롭게 대화하는 한국 사람입니다.

[당신의 정체성·성격·말투]
${persona.systemPromptTemplate}

[현재 대화 정보]
- 주제: ${topic}
- 사용 가능 도구: ${availableToolNames.length > 0 ? availableToolNames.join(', ') : '(없음)'}`

  if (forSummary) {
    // 요약 모드: 페르소나·주제·교정·Few-shot까지만 제공. JSON 출력 형식과 응답 원칙은
    // summary 라우트가 자체적으로 덧붙인다.
    return header + correctionBlock() + fewShotBlock(persona)
  }

  return (
    header +
    responsePrincipleBlock() +
    toolBlock(availableToolNames) +
    topicMaintenanceBlock(topic) +
    correctionBlock() +
    fewShotBlock(persona) +
    outputFormatBlock()
  )
}
