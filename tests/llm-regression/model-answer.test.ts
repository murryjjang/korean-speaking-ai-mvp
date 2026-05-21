// M3-d — 모범답안 생성 회귀 (mock, 항상 실행) — 프롬프트 계약 + 파싱 가드
import { describe, expect, it } from 'vitest'
import {
  buildModelAnswerSystemPrompt,
  buildModelAnswerUserPrompt,
  parseModelAnswer,
} from '@/src/lib/prompts/model-answer'
import { CEFR_VALUES } from '@/src/lib/tagging/schema'

describe('M3-d 모범답안 프롬프트 계약 (drift 가드)', () => {
  it.each([...CEFR_VALUES])('cefr=%s 시스템 프롬프트에 수준·구어·answer_text·평문 JSON', (cefr) => {
    const sys = buildModelAnswerSystemPrompt(cefr)
    expect(sys).toContain(cefr)
    expect(sys).toContain('구어')
    expect(sys).toContain('answer_text')
    expect(sys).toContain('JSON')
    expect(sys).toMatch(/마크다운|설명 금지/)
  })

  it('user 프롬프트에 제목·유형·지시문 주입', () => {
    const u = buildModelAnswerUserPrompt({
      content_id: 'q-1',
      type_id: 'qt-material-desc',
      title: '그래프 설명',
      prompt: '그래프를 설명하세요.',
    })
    expect(u).toContain('그래프 설명')
    expect(u).toContain('qt-material-desc')
    expect(u).toContain('그래프를 설명하세요.')
  })
})

describe('M3-d 모범답안 파싱', () => {
  it('정상 JSON → answer_text', () => {
    expect(parseModelAnswer('{"answer_text":"안녕하세요. 저는..."}')).toEqual({ answer_text: '안녕하세요. 저는...' })
  })
  it('빈/누락 answer_text → null', () => {
    expect(parseModelAnswer('{"answer_text":""}')).toBeNull()
    expect(parseModelAnswer('{}')).toBeNull()
  })
  it('malformed → null', () => {
    expect(parseModelAnswer('not json')).toBeNull()
  })
})
