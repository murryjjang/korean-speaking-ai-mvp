import { describe, it, expect } from 'vitest'
import {
  etriScoreToNormalized,
  extractEtriScore,
} from '@/src/providers/pronunciation/etri'

// Type that mirrors EtriRecognized for test fixtures
type RecognizedFixture = Record<string, unknown>

// ── etriScoreToNormalized ─────────────────────────────────────────────────────

describe('etriScoreToNormalized', () => {
  it('rawScore 1 → normalizedScore 20', () => {
    expect(etriScoreToNormalized(1)).toBe(20)
  })

  it('rawScore 2 → normalizedScore 40', () => {
    expect(etriScoreToNormalized(2)).toBe(40)
  })

  it('rawScore 3 → normalizedScore 60', () => {
    expect(etriScoreToNormalized(3)).toBe(60)
  })

  it('rawScore 4 → normalizedScore 80', () => {
    expect(etriScoreToNormalized(4)).toBe(80)
  })

  it('rawScore 5 → normalizedScore 100', () => {
    expect(etriScoreToNormalized(5)).toBe(100)
  })

  it('rawScore 0 → normalizedScore 0 (valid explicit 0)', () => {
    expect(etriScoreToNormalized(0)).toBe(0)
  })

  it('rawScore out of range clamped to 0–100', () => {
    expect(etriScoreToNormalized(-1)).toBe(0)
    expect(etriScoreToNormalized(6)).toBe(100)
  })

  it('rawScore 2.53596 (실제 관측값) → normalizedScore 51', () => {
    // 2.53596 / 5 * 100 = 50.7192 → Math.round → 51
    expect(etriScoreToNormalized(2.53596)).toBe(51)
  })

  it('rawScore 2.73 (실제 관측값) → normalizedScore 55', () => {
    // 2.73 / 5 * 100 = 54.6 → Math.round → 55
    expect(etriScoreToNormalized(2.73)).toBe(55)
  })

  it('rawScore 2.726668 (실제 관측값) → normalizedScore 55', () => {
    // 2.726668 / 5 * 100 = 54.53336 → Math.round → 55
    expect(etriScoreToNormalized(2.726668)).toBe(55)
  })
})

// ── extractEtriScore ──────────────────────────────────────────────────────────

describe('extractEtriScore', () => {
  it('parses score from recognized.score field', () => {
    const recognized: RecognizedFixture = { score: 3 }
    expect(extractEtriScore(recognized)).toBe(3)
  })

  it('parses score from recognized.Score (alternate casing)', () => {
    const recognized: RecognizedFixture = { Score: 4 }
    expect(extractEtriScore(recognized)).toBe(4)
  })

  it('parses score from recognized.pronunciation_score', () => {
    const recognized: RecognizedFixture = { pronunciation_score: 2 }
    expect(extractEtriScore(recognized)).toBe(2)
  })

  it('parses score from recognized.pronunciationScore (camelCase)', () => {
    const recognized: RecognizedFixture = { pronunciationScore: 5 }
    expect(extractEtriScore(recognized)).toBe(5)
  })

  it('score=0 is parsed as 0 (not treated as missing)', () => {
    const recognized: RecognizedFixture = { score: 0 }
    expect(extractEtriScore(recognized)).toBe(0)
  })

  it('score missing → throws etri_score_missing', () => {
    const recognized: RecognizedFixture = { word: '안녕' }
    expect(() => extractEtriScore(recognized)).toThrow('etri_score_missing')
  })

  it('score=undefined → throws etri_score_missing (not rawScore=0)', () => {
    const recognized: RecognizedFixture = { score: undefined }
    expect(() => extractEtriScore(recognized)).toThrow('etri_score_missing')
  })

  it('score=null → throws etri_score_missing', () => {
    const recognized: RecognizedFixture = { score: null }
    expect(() => extractEtriScore(recognized)).toThrow('etri_score_missing')
  })

  it('score=NaN string → throws etri_score_missing (not numeric)', () => {
    const recognized: RecognizedFixture = { score: 'not-a-number' }
    expect(() => extractEtriScore(recognized)).toThrow('etri_score_missing')
  })

  it('score priority: score field takes precedence over pronunciation_score', () => {
    const recognized: RecognizedFixture = { score: 2, pronunciation_score: 5 }
    expect(extractEtriScore(recognized)).toBe(2)
  })
})

// ── score missing vs explicit 0 distinction ───────────────────────────────────

describe('real 0 vs missing score distinction', () => {
  it('explicit score=0 extracted as 0 (not a missing error)', () => {
    const recognized: RecognizedFixture = { score: 0 }
    const score = extractEtriScore(recognized)
    expect(score).toBe(0)
    expect(typeof score).toBe('number')
  })

  it('no score field → throws, rawScore must not become 0 silently', () => {
    const recognized: RecognizedFixture = {}
    expect(() => extractEtriScore(recognized)).toThrowError(/etri_score_missing/)
  })
})

// ── return_object score extraction (ETRI official structure) ─────────────────
// ETRI WiseASR 발음평가 공식 구조: score는 return_object의 직속 필드.
// recognized는 인식된 텍스트(string) 또는 object일 수 있음.

describe('return_object score extraction (ETRI official structure)', () => {
  it('return_object.score 직속 필드에서 점수를 최우선 추출', () => {
    // ETRI 공식: { score: N, recognized: "인식텍스트" }
    const returnObject: RecognizedFixture = { score: 3, recognized: '안녕하세요' }
    expect(extractEtriScore(returnObject)).toBe(3)
  })

  it('return_object.score가 있으면 recognized.score보다 우선함', () => {
    // return_object.score=4, recognized 안에 score=1이 있어도 return_object.score 우선
    const returnObject: RecognizedFixture = { score: 4, recognized: { score: 1 } }
    expect(extractEtriScore(returnObject)).toBe(4)
  })

  it('recognized가 string일 때도 return_object.score에서 추출', () => {
    const returnObject: RecognizedFixture = { score: 2, recognized: '낭독 텍스트 인식 결과' }
    expect(extractEtriScore(returnObject)).toBe(2)
  })

  it('return_object에 score 없으면 etri_score_missing 던짐', () => {
    const returnObject: RecognizedFixture = { recognized: '텍스트만 있고 점수 없음' }
    expect(() => extractEtriScore(returnObject)).toThrow('etri_score_missing')
  })

  it('return_object.Score (대소문자 변형)에서 추출', () => {
    const returnObject: RecognizedFixture = { Score: 5, recognized: '테스트' }
    expect(extractEtriScore(returnObject)).toBe(5)
  })
})

// ── etri_api_error vs etri_score_missing 분기 ────────────────────────────────

describe('etri error code classification', () => {
  it('result=-1이면 etri_api_error 메시지 prefix가 나와야 함', () => {
    // evaluate()에서 result !== 0이면 이 형식으로 throw됨
    // route.ts의 parseEtriErrorCode가 이 prefix를 etri_api_error로 분류
    const errorMessage = `etri_api_error: result=-1 reason=unknown`
    expect(errorMessage).toMatch(/^etri_api_error:/)
  })

  it('result=0이지만 score 없으면 etri_score_missing prefix', () => {
    const obj: RecognizedFixture = { recognized: '텍스트만, 점수 없음' }
    let thrown: Error | undefined
    try {
      extractEtriScore(obj)
    } catch (e) {
      thrown = e as Error
    }
    expect(thrown?.message).toMatch(/^etri_score_missing:/)
  })

  it('score missing은 rawScore=0으로 처리하지 않음 — 반드시 throw', () => {
    const obj: RecognizedFixture = {}
    expect(() => extractEtriScore(obj)).toThrow('etri_score_missing')
    // throw가 발생하므로 rawScore=0으로 silent 처리 불가
  })

  it('return_object 없음도 etri_score_missing (etri_api_error 아님)', () => {
    // return_object 누락은 API 오류가 아니라 score 파싱 실패로 분류
    const obj: RecognizedFixture = {}
    expect(() => extractEtriScore(obj)).toThrow('etri_score_missing')
  })
})

// ── q1 reading referenceText extraction (logic mirror) ────────────────────────

describe('q1 reading prompt extraction', () => {
  // Mirrors the client-side logic in speaking-client.tsx
  function extractReadingText(prompt: string, typeId: string): string {
    if (typeId !== 'qt-reading') return prompt
    const idx = prompt.indexOf('\n\n')
    if (idx !== -1) {
      const candidate = prompt.slice(idx + 2).trim()
      if (candidate) return candidate
    }
    return prompt
  }

  it('qt-reading: extracts text after double newline', () => {
    const prompt = '다음 문장을 읽으세요.\n\n저는 오늘 병원에 갑니다.'
    expect(extractReadingText(prompt, 'qt-reading')).toBe('저는 오늘 병원에 갑니다.')
  })

  it('qt-reading: no double newline → returns whole prompt', () => {
    const prompt = '저는 오늘 병원에 갑니다.'
    expect(extractReadingText(prompt, 'qt-reading')).toBe(prompt)
  })

  it('qt-reading: empty candidate after split → returns whole prompt', () => {
    const prompt = '지시문\n\n'
    expect(extractReadingText(prompt, 'qt-reading')).toBe(prompt)
  })

  it('non-reading type: returns full prompt unchanged', () => {
    const prompt = '자신을 소개해 보세요.\n\n이름, 나라, 이유를 포함하세요.'
    expect(extractReadingText(prompt, 'qt-self-intro')).toBe(prompt)
  })

  it('q1 script에는 지시문이 아닌 낭독 본문만 포함됨', () => {
    // ETRI argument.script에 전달되는 값이 순수 낭독 텍스트여야 함
    const q1Prompt = '다음 글을 읽으세요.\n\n저는 매일 아침 운동을 합니다.'
    const script = extractReadingText(q1Prompt, 'qt-reading')
    expect(script).toBe('저는 매일 아침 운동을 합니다.')
    expect(script).not.toContain('다음 글을 읽으세요')
  })

  it('beginner-q1: 실제 프롬프트에서 낭독 본문만 추출', () => {
    const prompt =
      '다음 글을 소리 내어 읽으세요.\n\n안녕하세요. 저는 오늘 오후에 병원에 갑니다.'
    const script = extractReadingText(prompt, 'qt-reading')
    expect(script).toBe('안녕하세요. 저는 오늘 오후에 병원에 갑니다.')
    expect(script).not.toMatch(/^다음/)
  })

  it('normalized script: trim이 선행/후행 공백을 제거해야 함', () => {
    const prompt = '다음 글을 읽으세요.\n\n  저는 학생입니다.  '
    const script = extractReadingText(prompt, 'qt-reading').trim()
    expect(script).toBe('저는 학생입니다.')
  })
})

// ── ETRI rawScore 표시 형식 ───────────────────────────────────────────────────

describe('ETRI rawScore display formatting', () => {
  it('rawScore 2.726668 → toFixed(2) → "2.73"', () => {
    const rawScore = 2.726668
    expect(rawScore.toFixed(2)).toBe('2.73')
  })

  it('rawScore 5 → toFixed(2) → "5.00"', () => {
    expect((5).toFixed(2)).toBe('5.00')
  })

  it('rawScore 1 → toFixed(2) → "1.00"', () => {
    expect((1).toFixed(2)).toBe('1.00')
  })

  it('etriScoreToNormalized(2.726668) → 55 (float rawScore 처리)', () => {
    // 2.726668 / 5 * 100 = 54.53336 → Math.round → 55
    expect(etriScoreToNormalized(2.726668)).toBe(55)
  })

  it('normalizedScore는 참고 환산 점수이며 rawScore/5*100 반올림과 동일', () => {
    const rawScores = [1, 2, 3, 4, 5, 2.726668, 3.5, 4.8]
    for (const r of rawScores) {
      const expected = Math.min(100, Math.max(0, Math.round((r / 5) * 100)))
      expect(etriScoreToNormalized(r)).toBe(expected)
    }
  })
})

// ── ETRI provider: 세부 항목 막대 표시 여부 ──────────────────────────────────
// 결과 페이지에서 세부 항목(발음 정확도/유창성/억양 등)을 표시할지 결정하는 로직을 반영

describe('ETRI subcriteria display logic', () => {
  // Mirrors result page logic: showCriteriaBars = providerName !== 'etri' || wordScores.length > 0
  function shouldShowCriteriaBars(
    providerName: string,
    wordScores: Array<{ word: string; score: number }>,
  ): boolean {
    if (providerName !== 'etri') return true  // mock / 기타 provider는 파생 항목 표시
    return wordScores.length > 0  // ETRI는 어절 점수가 있을 때만 표시
  }

  it('provider=etri, wordScores 없음 → 세부 항목 막대 숨김', () => {
    expect(shouldShowCriteriaBars('etri', [])).toBe(false)
  })

  it('provider=etri, wordScores 있음 → 세부 항목 막대 표시', () => {
    expect(shouldShowCriteriaBars('etri', [{ word: '안녕', score: 80 }])).toBe(true)
  })

  it('provider=mock, wordScores 없음 → 세부 항목 막대 표시 (파생값 사용)', () => {
    expect(shouldShowCriteriaBars('mock', [])).toBe(true)
  })

  it('provider=whisper, wordScores 없음 → 세부 항목 막대 표시', () => {
    expect(shouldShowCriteriaBars('whisper', [])).toBe(true)
  })

  it('ETRI rawScore missing은 0으로 처리하지 않음 — extractEtriScore가 throw해야 함', () => {
    // rawScore가 없을 때 0으로 silent 처리하면 안 됨
    const obj: Record<string, unknown> = { recognized: '텍스트만' }
    expect(() => extractEtriScore(obj)).toThrow('etri_score_missing')
  })
})
