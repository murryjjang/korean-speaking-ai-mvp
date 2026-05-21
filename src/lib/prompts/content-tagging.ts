// ============================================================
// prompt v3 — 콘텐츠 태깅 프롬프트 빌더 (Task 1.3 핵심 / M4 검수의 권위 스펙)
//
// questions 행 1건 → content_tags / content_vocabulary / pronunciation_focus
// 에 적재할 7필드 JSON 을 생성하도록 LLM 에 지시한다.
//
// 모든 enum·정규식·표준 문구는 src/lib/tagging/schema.ts 에서 import 한다
// (단일 진실 원천). 따라서 검수 정량 규칙(validate-tagging.ts)과 프롬프트가
// 같은 권위를 공유하고, M3-b 회귀 테스트가 이 계약의 drift 를 감지한다.
// ============================================================

import {
  BANMAL_WARNING,
  CEFR_VALUES,
  CONTENT_TAGGING_PROMPT_VERSION,
  MIXED_REGISTER_KEYWORD,
  PRONUNCIATION_RULES,
  REGISTER_DEFINITIONS,
  REGISTER_VALUES,
  REQUIRED_TAG_FIELDS,
  VOCAB_CATEGORIES,
  type TaggingInput,
} from '@/src/lib/tagging/schema'

export { CONTENT_TAGGING_PROMPT_VERSION }

// 시스템 프롬프트 — 7필드 계약 전체를 명시. (콘텐츠 무관, 캐시 가능)
export function buildContentTaggingSystemPrompt(): string {
  const registerLines = REGISTER_VALUES.map(
    (r) => `    - "${r}": ${REGISTER_DEFINITIONS[r]}`,
  ).join('\n')
  const fieldList = REQUIRED_TAG_FIELDS.map((f) => `"${f}"`).join(', ')

  return [
    '당신은 한국어 학습 콘텐츠를 분석해 메타데이터를 태깅하는 전문가입니다.',
    `프롬프트 버전: ${CONTENT_TAGGING_PROMPT_VERSION}. 아래 7필드를 가진 JSON 객체 하나만 출력합니다.`,
    '',
    `필수 7필드(모두 존재해야 함): ${fieldList}.`,
    '',
    '각 필드 규칙:',
    '1) topic_tags: 콘텐츠 주제 태그 문자열 배열(1~5개). 일반 명사구, 고유명사는 피함.',
    '   - **콘텐츠 본문(title·prompt)에 실제로 등장하는 핵심 주제어만** 사용하고, 본문 전체를 대표하도록 균형 있게 고를 것. 본문에 없는 추측·일반화 금지.',
    `2) cefr_level: 다음 중 하나. ${CEFR_VALUES.join(' / ')}. 콘텐츠 난이도에 맞게 1개.`,
    '3) register: 콘텐츠의 문체. 다음 중 하나:',
    registerLines,
    '4) register_consistency: 콘텐츠 전체 문체가 일관되면 "consistent", 섞이면 "mixed".',
    '5) learning_objective: 한 문장. 반드시 한국어 능력표현 "-(으)ㄹ 수 있다" 형태로 끝낼 것',
    '   (하다 동사 한정 아님 — "읽을 수 있다", "들을 수 있다", "쓸 수 있다" 등 모두 허용).',
    '   예: "음식점에서 주문할 수 있다.", "안내문을 소리 내어 읽을 수 있다."',
    '   - **콘텐츠의 핵심 행동·맥락을 구체적으로** 반영할 것. "의사소통할 수 있다"처럼 막연한 표현 금지 — 콘텐츠 특화 동사·대상 사용.',
    '   - **낭독(type=qt-reading) 유형이면 글의 "주제"가 아니라 "정확한 발음·억양으로 소리 내어 읽는" 능력**을 기술할 것',
    '     (예: "안내문을 정확한 발음으로 소리 내어 읽을 수 있다"). 글 내용 자체를 학습목표로 삼지 말 것.',
    '6) vocabulary: 객체 { "basic": [], "core": [], "challenging": [] }.',
    `   - 분류 3종: ${VOCAB_CATEGORIES.join(' / ')} (난이도 오름차순).`,
    '   - 각 항목은 콘텐츠에 등장하는 한국어 어휘. 고유명사(인명·상호·특정 지명)는 제외.',
    '7) pronunciation_focus: 발음 포커스 문자열 배열. 각 항목은 정확히 "표현(규칙)" 형식.',
    `   - 규칙 예: ${PRONUNCIATION_RULES.join(' / ')}. 예: "꽃이(연음)", "맏이(구개음화)".`,
    '   - **콘텐츠 유형(type)이 "qt-reading"(낭독·소리 내어 읽기)이면 반드시 1개 이상 포함**',
    '     (발음이 핵심인 유형이므로 빈 배열 금지 — 본문에서 음운 변동이 일어나는 표현을 찾아 표기).',
    '   - 그 외 유형은 명확한 발음 규칙이 있을 때만 포함하고, 없으면 빈 배열 [].',
    '',
    '추가 규칙:',
    `- register 가 "casual-banmal" 이면 register_note 필드에 표준 경고를 넣을 것: "${BANMAL_WARNING}".`,
    '  비반말 register 에는 이 반말 경고를 넣지 말 것(오경고 금지).',
    `- register_consistency 가 "mixed" 이면 register_note 에 "${MIXED_REGISTER_KEYWORD}"을(를) 언급할 것.`,
    '- 출력은 JSON 객체 하나뿐. 마크다운·코드펜스·설명 문장 금지(평문 JSON).',
  ].join('\n')
}

// 사용자 프롬프트 — 태깅할 콘텐츠 1건.
export function buildContentTaggingUserPrompt(input: TaggingInput): string {
  const lines = [
    `content_id: ${input.content_id}`,
    input.type_id ? `type: ${input.type_id}` : null,
    input.difficulty ? `difficulty: ${input.difficulty}` : null,
    `title: ${input.title}`,
    `prompt: ${input.prompt}`,
  ].filter((x): x is string => x !== null)
  return ['다음 콘텐츠를 태깅하세요.', '', ...lines].join('\n')
}
