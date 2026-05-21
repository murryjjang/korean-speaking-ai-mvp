// ============================================================
// M3-d — 모범답안 생성 프롬프트 (Task 1.5)
//
// 콘텐츠(문항) + 목표 CEFR → 그 수준의 자연스러운 한국어 구어 모범답안.
// model_answers(content_id, cefr_level, answer_text) 에 캐시(on-demand).
// 작성자 기본 gpt-4o-mini(cost-aware). 프롬프트 빌더는 순수 → M3-d 회귀 가드.
// 자유대화는 대상 아님(낭독·발표·듣고답하기·대화미션·자기소개·의견·그림묘사 = questions).
// ============================================================

import { CEFR_VALUES, type CefrLevel } from '@/src/lib/tagging/schema'

export type ModelAnswerInput = {
  content_id: string
  type_id?: string | null
  title: string
  prompt: string
}

export type ModelAnswerResult = { answer_text: string }

export function buildModelAnswerSystemPrompt(cefr: CefrLevel): string {
  return [
    `당신은 한국어 말하기 평가의 모범답안을 작성하는 전문가입니다. 목표 수준은 CEFR ${cefr} 입니다.`,
    '주어진 문항(과제)에 대해, 학습자가 말하기로 제출할 만한 모범 답안을 작성하세요.',
    '',
    `- ${cefr} 수준에 맞는 어휘·문장 길이·문법 복잡도로 작성(과도하게 어렵거나 쉽지 않게).`,
    '- 자연스러운 구어체(말하기)로. 발표·설명 과제는 격식 구어, 일상 대화 과제는 정중한 구어.',
    '- 과제 지시를 충실히 반영하고, 핵심 내용을 논리적으로 포함.',
    `- 길이: ${CEFR_VALUES.indexOf(cefr) <= 1 ? '3~5문장' : CEFR_VALUES.indexOf(cefr) <= 3 ? '5~8문장' : '8문장 이상'} 정도.`,
    '',
    '출력: JSON 객체 하나 { "answer_text": "..." }. 마크다운·설명 금지(평문 JSON).',
  ].join('\n')
}

export function buildModelAnswerUserPrompt(input: ModelAnswerInput): string {
  const lines = [`문항 제목: ${input.title}`]
  if (input.type_id) lines.push(`유형: ${input.type_id}`)
  lines.push(`지시문: ${input.prompt}`)
  return lines.join('\n')
}

export function parseModelAnswer(raw: string): ModelAnswerResult | null {
  try {
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return null
    const answer = (p as Record<string, unknown>).answer_text
    if (typeof answer !== 'string' || !answer.trim()) return null
    return { answer_text: answer.trim() }
  } catch {
    return null
  }
}
