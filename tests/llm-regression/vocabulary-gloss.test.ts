// M3-c — 어휘 뜻·예문 생성 회귀 (mock, 항상 실행) — 프롬프트 계약 + 파싱 가드
import { describe, expect, it } from 'vitest'
import {
  buildVocabularyGlossSystemPrompt,
  buildVocabularyGlossUserPrompt,
  GLOSS_LANGS,
  isGlossLang,
  parseVocabGloss,
} from '@/src/lib/prompts/vocabulary-gloss'

describe('M3-c gloss 프롬프트 계약 (drift 가드)', () => {
  it('대상 언어 7종 지원', () => {
    expect([...GLOSS_LANGS].sort()).toEqual(['ar', 'en', 'km', 'ko', 'ms', 'th', 'vi'])
  })

  it.each([...GLOSS_LANGS])('lang=%s 시스템 프롬프트에 3필드 + 평문 JSON 규칙', (lang) => {
    const sys = buildVocabularyGlossSystemPrompt(lang)
    expect(sys).toContain('gloss')
    expect(sys).toContain('example_ko')
    expect(sys).toContain('example_translated')
    expect(sys).toContain('JSON')
    expect(sys).toMatch(/마크다운|코드펜스/)
  })

  it('lang=ko → example_translated 빈 문자열 지시', () => {
    expect(buildVocabularyGlossSystemPrompt('ko')).toContain('빈 문자열')
  })

  it('lang=en → 번역 지시(영어)', () => {
    const sys = buildVocabularyGlossSystemPrompt('en')
    expect(sys).toContain('English')
    expect(sys).toContain('번역')
  })

  it('user 프롬프트에 어휘·CEFR 주입', () => {
    const u = buildVocabularyGlossUserPrompt('약국', 'A2')
    expect(u).toContain('약국')
    expect(u).toContain('A2')
  })
})

describe('M3-c gloss 파싱', () => {
  it('정상 JSON → 3필드', () => {
    const r = parseVocabGloss('{"gloss":"pharmacy","example_ko":"약국에 갑니다.","example_translated":"I go to the pharmacy."}')
    expect(r).toEqual({ gloss: 'pharmacy', example_ko: '약국에 갑니다.', example_translated: 'I go to the pharmacy.' })
  })

  it('gloss 없으면 null', () => {
    expect(parseVocabGloss('{"example_ko":"x"}')).toBeNull()
  })

  it('malformed → null', () => {
    expect(parseVocabGloss('not json')).toBeNull()
  })

  it('example 누락 시 빈 문자열로 채움', () => {
    const r = parseVocabGloss('{"gloss":"pharmacy"}')
    expect(r).toEqual({ gloss: 'pharmacy', example_ko: '', example_translated: '' })
  })

  it('isGlossLang 가드', () => {
    expect(isGlossLang('en')).toBe(true)
    expect(isGlossLang('zz')).toBe(false)
  })
})
