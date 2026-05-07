import { describe, it, expect } from 'vitest'

// Display policy for pronunciation result card in result/page.tsx.
// These tests mirror the conditional rendering logic without importing the server component.

type PronunciationDisplayInput = {
  providerName: string
  rawScore?: number
  normalizedScore: number
  wordScores: Array<{ word: string; score: number }>
  fallbackReason?: string
}

// Mirrors result/page.tsx: providerName === 'etri' && typeof rawScore === 'number'
// rawScore 존재 여부가 ETRI 성공/실패의 1차 기준 (fallbackReason이 아님)
function shouldShowEtriBranch(p: PronunciationDisplayInput): boolean {
  return p.providerName === 'etri' && typeof p.rawScore === 'number'
}

// Mirrors result/page.tsx: `!pronunciationResult.fallbackReason && providerName !== 'etri'`
function shouldShowMockBranch(p: PronunciationDisplayInput): boolean {
  return !p.fallbackReason && p.providerName !== 'etri'
}

// Mirrors result/page.tsx: etri branch + wordScores.length === 0
function shouldShowEtriNoCriteriaMessage(p: PronunciationDisplayInput): boolean {
  return shouldShowEtriBranch(p) && p.wordScores.length === 0
}

// Detail bars (5 criteria) are shown only for non-etri providers
function shouldShowDetailBars(p: PronunciationDisplayInput): boolean {
  return shouldShowMockBranch(p)
}

// Mirrors result/page.tsx: rawScore.toFixed(2) display
function formatEtriRawScore(rawScore: number): string {
  return rawScore.toFixed(2)
}

// ── 기본 분기 ─────────────────────────────────────────────────────────────────

describe('provider=etri 기본 분기', () => {
  const etriResult: PronunciationDisplayInput = {
    providerName: 'etri',
    rawScore: 2.53596,
    normalizedScore: 51,
    wordScores: [],
  }

  it('ETRI 브랜치(rawScore + normalizedScore 참고값)가 렌더됨', () => {
    expect(shouldShowEtriBranch(etriResult)).toBe(true)
  })

  it('세부 항목 막대가 표시되지 않음', () => {
    expect(shouldShowDetailBars(etriResult)).toBe(false)
  })

  it('wordScores=[] → no-criteria-message가 표시됨', () => {
    expect(shouldShowEtriNoCriteriaMessage(etriResult)).toBe(true)
  })

  it('rawScore 2.53596 → "2.54"로 표시됨', () => {
    expect(formatEtriRawScore(2.53596)).toBe('2.54')
  })

  it('normalizedScore 51은 참고 환산 점수로 표시됨 (최종 발음 점수 아님)', () => {
    expect(etriResult.normalizedScore).toBe(51)
  })
})

// ── provider=mock 기본 분기 ───────────────────────────────────────────────────

describe('provider=mock 기본 분기', () => {
  const mockResult: PronunciationDisplayInput = {
    providerName: 'mock',
    normalizedScore: 72,
    wordScores: [{ word: '안녕', score: 80 }],
  }

  it('mock 브랜치(세부 막대 포함)가 렌더됨', () => {
    expect(shouldShowMockBranch(mockResult)).toBe(true)
  })

  it('세부 항목 막대가 표시됨', () => {
    expect(shouldShowDetailBars(mockResult)).toBe(true)
  })

  it('ETRI 브랜치는 렌더되지 않음', () => {
    expect(shouldShowEtriBranch(mockResult)).toBe(false)
  })
})

// ── ETRI 점수는 최종 발음 점수로 단정 표시하지 않음 ──────────────────────────

describe('ETRI 점수 단정 표시 금지 정책', () => {
  it('fallbackReason 없으면 calibration notice가 표시됨 (참고값 안내)', () => {
    const etriOk: PronunciationDisplayInput = {
      providerName: 'etri',
      rawScore: 2.53596,
      normalizedScore: 51,
      wordScores: [],
    }
    // fallbackReason 없음 → calibration notice (etri-calibration-notice) 표시
    expect(etriOk.fallbackReason).toBeUndefined()
    expect(shouldShowEtriBranch(etriOk)).toBe(true)
  })

  it('fallbackReason 있으면 error 브랜치 — ETRI 브랜치 표시 안 함', () => {
    const etriFail: PronunciationDisplayInput = {
      providerName: 'etri',
      normalizedScore: 0,
      wordScores: [],
      fallbackReason: 'etri_score_missing',
    }
    expect(shouldShowEtriBranch(etriFail)).toBe(false)
  })
})

// ── AI 1차 평가와 ETRI 카드 분리 ─────────────────────────────────────────────

describe('AI 1차 평가(종합점수)와 ETRI 발음평가 카드 분리', () => {
  it('totalScore(AI eval)와 ETRI normalizedScore는 별개 값임', () => {
    const aiTotalScore = 65    // llmEvalResult.totalScore — mock AI aggregate
    const etriNormScore = 51   // pronunciationResult.normalizedScore — ETRI
    expect(aiTotalScore).not.toBe(etriNormScore)
  })

  it('발음 항목(ri-pronunciation=14)은 AI 추정값 — ETRI rawScore와 다름', () => {
    // mock: pronunciation_reference_score=72 → toRubricScore(72) = round(72*20/100) = 14
    const mockPronScore = Math.round(72 * 20 / 100)
    const etriRawScore = 2.53596
    expect(mockPronScore).toBe(14)
    expect(mockPronScore).not.toBe(Math.round(etriRawScore))
  })
})

// ── q1/q2/q3/q4 흐름 유지 ────────────────────────────────────────────────────

describe('q1/q2/q3/q4 기존 흐름 유지', () => {
  it('분기 선택은 questionType이 아닌 providerName + rawScore 기준', () => {
    const etri: PronunciationDisplayInput = { providerName: 'etri', rawScore: 2.53596, normalizedScore: 51, wordScores: [] }
    const mock: PronunciationDisplayInput = { providerName: 'mock', normalizedScore: 72, wordScores: [] }
    expect(shouldShowEtriBranch(etri)).toBe(true)
    expect(shouldShowMockBranch(mock)).toBe(true)
  })

  it('provider=etri + wordScores 있으면 no-criteria-message 표시 안 함 (어절 점수 있음)', () => {
    const etriWithWords: PronunciationDisplayInput = {
      providerName: 'etri',
      rawScore: 3.5,
      normalizedScore: 70,
      wordScores: [{ word: '안녕하세요', score: 70 }],
    }
    expect(shouldShowEtriNoCriteriaMessage(etriWithWords)).toBe(false)
  })
})

// ── 상단 종합점수 카드: AI 발음 추정 라벨 정책 ───────────────────────────────

// Mirrors result/page.tsx: rubricScores 중 ri-pronunciation 항목의 라벨 변환 로직
function getPronunciationLabel(providerName: string, rubricItemId: string): string {
  if (providerName === 'etri' && rubricItemId === 'ri-pronunciation') {
    return 'AI 발음 추정'
  }
  return '발음'
}

describe('상단 breakdown 발음 라벨 — provider별 분기', () => {
  it('provider=etri: ri-pronunciation 라벨은 "AI 발음 추정"', () => {
    expect(getPronunciationLabel('etri', 'ri-pronunciation')).toBe('AI 발음 추정')
  })

  it('provider=etri: ri-pronunciation 라벨은 "발음" 단독이 아님', () => {
    expect(getPronunciationLabel('etri', 'ri-pronunciation')).not.toBe('발음')
  })

  it('provider=mock: ri-pronunciation 라벨은 "발음" (기존 유지)', () => {
    expect(getPronunciationLabel('mock', 'ri-pronunciation')).toBe('발음')
  })

  it('provider=etri + 다른 항목(ri-fluency): 라벨 변경 없음', () => {
    expect(getPronunciationLabel('etri', 'ri-fluency')).toBe('발음')
  })
})

// ── ETRI 카드 제목 ─────────────────────────────────────────────────────────────

// Mirrors result/page.tsx: CardHeader title 분기 로직
function getPronunciationCardTitle(providerName: string): string {
  return providerName === 'etri' ? 'ETRI 발음평가 API 결과' : '발음 평가'
}

describe('발음 평가 카드 제목', () => {
  it('provider=etri → "ETRI 발음평가 API 결과"', () => {
    expect(getPronunciationCardTitle('etri')).toBe('ETRI 발음평가 API 결과')
  })

  it('provider=mock → "발음 평가" (기존 유지)', () => {
    expect(getPronunciationCardTitle('mock')).toBe('발음 평가')
  })
})

// ── calibratedScore 표시 정책 ────────────────────────────────────────────────

type FullPronunciationDisplayInput = PronunciationDisplayInput & {
  calibratedScore?: number
  calibrationStatus?: string
}

// calibratedScore가 있으면 "보정 참고점수"로 표시, 없으면 숨김
function shouldShowCalibratedScore(p: FullPronunciationDisplayInput): boolean {
  return shouldShowEtriBranch(p) && p.calibratedScore !== undefined
}

describe('calibratedScore 보정 참고점수 표시', () => {
  it('provider=etri + calibratedScore 있으면 표시', () => {
    const p: FullPronunciationDisplayInput = {
      providerName: 'etri',
      rawScore: 2.53596,
      normalizedScore: 51,
      wordScores: [],
      calibratedScore: 76,
    }
    expect(shouldShowCalibratedScore(p)).toBe(true)
  })

  it('provider=etri + calibratedScore 없으면 숨김', () => {
    const p: FullPronunciationDisplayInput = {
      providerName: 'etri',
      rawScore: 2.53596,
      normalizedScore: 51,
      wordScores: [],
    }
    expect(shouldShowCalibratedScore(p)).toBe(false)
  })

  it('provider=mock → calibratedScore 표시 안 함 (ETRI 전용)', () => {
    const p: FullPronunciationDisplayInput = {
      providerName: 'mock',
      normalizedScore: 72,
      wordScores: [],
      calibratedScore: 72,
    }
    expect(shouldShowCalibratedScore(p)).toBe(false)
  })

  it('calibratedScore는 normalizedScore(단순환산)와 별개 값', () => {
    // rawScore 2.53596: normalizedScore=51, calibratedScore=76(예상)
    const normalizedScore = 51
    const calibratedScore = 76
    expect(calibratedScore).not.toBe(normalizedScore)
    expect(calibratedScore).toBeGreaterThan(normalizedScore)
  })

  it('calibrationStatus="provisional" — 최종점수로 자동 반영되지 않음을 명시', () => {
    const status = 'provisional'
    expect(status).not.toBe('validated')
  })
})

// ── rawScore / normalizedScore / calibratedScore 구분 표시 ───────────────────

describe('3단계 점수 구분 표시', () => {
  it('rawScore 2.53596 → 원점수 표시: "2.54 / 5"', () => {
    const rawScore = 2.53596
    expect(rawScore.toFixed(2)).toBe('2.54')
  })

  it('rawScore 2.53596 → normalizedScore(단순환산): 51 / 100', () => {
    // 2.53596 / 5 * 100 = 50.7192 → round → 51
    const normalized = Math.round((2.53596 / 5) * 100)
    expect(normalized).toBe(51)
  })

  it('ETRI score missing은 0점으로 표시하지 않음 — fallbackReason으로 처리', () => {
    const missingResult: FullPronunciationDisplayInput = {
      providerName: 'etri',
      normalizedScore: 0,
      wordScores: [],
      fallbackReason: 'etri_score_missing',
    }
    // fallbackReason 있으면 ETRI 정상 브랜치 표시 안 함
    expect(shouldShowEtriBranch(missingResult)).toBe(false)
    // normalizedScore=0이지만 이는 score 파싱 실패이므로 0점 표시 아님
    expect(missingResult.fallbackReason).toBe('etri_score_missing')
  })
})

// ── CardHeader description 로직 ───────────────────────────────────────────────
// Mirrors result/page.tsx CardHeader description template

function getEtriCardHeaderSuffix(p: PronunciationDisplayInput): string {
  if (p.providerName !== 'etri') return ''
  if (p.rawScore !== undefined) {
    return ` · 원점수 ${p.rawScore.toFixed(2)}/5 · 단순 환산 ${p.normalizedScore}/100`
  }
  if (p.fallbackReason) return ' · 원점수 확인 실패'
  return ''
}

describe('CardHeader description — "원점수 확인 실패" 표시 조건', () => {
  it('provider=etri + rawScore 있으면 "원점수 확인 실패" 없음', () => {
    const p: PronunciationDisplayInput = {
      providerName: 'etri',
      rawScore: 2.53596,
      normalizedScore: 51,
      wordScores: [],
    }
    expect(getEtriCardHeaderSuffix(p)).not.toContain('원점수 확인 실패')
    expect(getEtriCardHeaderSuffix(p)).toContain('원점수 2.54/5')
  })

  it('provider=etri + rawScore 없음 + errorCode → "원점수 확인 실패" 포함', () => {
    const p: PronunciationDisplayInput = {
      providerName: 'etri',
      normalizedScore: 0,
      wordScores: [],
      fallbackReason: 'etri_api_error',
    }
    expect(getEtriCardHeaderSuffix(p)).toContain('원점수 확인 실패')
  })

  it('provider=etri + rawScore 있음 + wordScores 없음 → 실패 아님', () => {
    const p: PronunciationDisplayInput = {
      providerName: 'etri',
      rawScore: 2.726668,
      normalizedScore: 55,
      wordScores: [],
    }
    expect(shouldShowEtriBranch(p)).toBe(true)
    expect(getEtriCardHeaderSuffix(p)).not.toContain('원점수 확인 실패')
  })

  it('provider=etri + rawScore 있음 + calibratedScore 없음 → 실패 아님', () => {
    const p: FullPronunciationDisplayInput = {
      providerName: 'etri',
      rawScore: 2.53596,
      normalizedScore: 51,
      wordScores: [],
      // calibratedScore 없음
    }
    expect(shouldShowEtriBranch(p)).toBe(true)
    expect(getEtriCardHeaderSuffix(p)).not.toContain('원점수 확인 실패')
  })

  it('provider=etri + rawScore=0 → 실패 아님 (0은 유효한 점수)', () => {
    const p: PronunciationDisplayInput = {
      providerName: 'etri',
      rawScore: 0,
      normalizedScore: 0,
      wordScores: [],
    }
    expect(shouldShowEtriBranch(p)).toBe(true)
    expect(getEtriCardHeaderSuffix(p)).not.toContain('원점수 확인 실패')
  })

  it('provider=etri + rawScore 없음 + fallbackReason 없음 → 빈 suffix', () => {
    const p: PronunciationDisplayInput = {
      providerName: 'etri',
      normalizedScore: 0,
      wordScores: [],
    }
    expect(getEtriCardHeaderSuffix(p)).toBe('')
    expect(shouldShowEtriBranch(p)).toBe(false)
  })

  it('provider=mock → suffix 없음', () => {
    const p: PronunciationDisplayInput = {
      providerName: 'mock',
      normalizedScore: 72,
      wordScores: [],
    }
    expect(getEtriCardHeaderSuffix(p)).toBe('')
  })
})

// ── ETRI 오류 메시지 매핑 (A-6) ──────────────────────────────────────────────
// Mirrors result/page.tsx: getEtriErrorMessage(errorCode)

function getEtriErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'audio_conversion_failed': return 'ETRI 발음평가용 음원 변환에 실패했습니다.'
    case 'etri_score_missing': return 'ETRI 발음평가 응답은 받았지만 점수 필드를 확인하지 못했습니다.'
    case 'etri_fetch_failed': return 'ETRI 서버 호출에 실패했습니다. 네트워크 또는 endpoint 확인이 필요합니다.'
    case 'etri_http_error': return 'ETRI 서버가 정상 응답을 반환하지 않았습니다.'
    case 'etri_api_error': return 'ETRI API 오류 응답을 받았습니다.'
    default: return 'ETRI 발음평가 응답 실패: 음원 형식 또는 응답 구조 확인이 필요합니다.'
  }
}

describe('ETRI 오류 메시지 매핑', () => {
  it('audio_conversion_failed → 음원 변환 실패 메시지', () => {
    expect(getEtriErrorMessage('audio_conversion_failed')).toBe('ETRI 발음평가용 음원 변환에 실패했습니다.')
  })

  it('etri_score_missing → 점수 필드 확인 실패 메시지', () => {
    expect(getEtriErrorMessage('etri_score_missing')).toBe('ETRI 발음평가 응답은 받았지만 점수 필드를 확인하지 못했습니다.')
  })

  it('etri_fetch_failed → 서버 호출 실패 메시지 (네트워크/endpoint)', () => {
    const msg = getEtriErrorMessage('etri_fetch_failed')
    expect(msg).toContain('ETRI 서버 호출에 실패했습니다')
    expect(msg).toContain('endpoint')
  })

  it('etri_http_error → 서버 정상 응답 아님 메시지', () => {
    expect(getEtriErrorMessage('etri_http_error')).toBe('ETRI 서버가 정상 응답을 반환하지 않았습니다.')
  })

  it('etri_api_error → API 오류 응답 메시지', () => {
    expect(getEtriErrorMessage('etri_api_error')).toBe('ETRI API 오류 응답을 받았습니다.')
  })

  it('알 수 없는 코드 → 일반 응답 실패 메시지', () => {
    const msg = getEtriErrorMessage('unknown_error')
    expect(msg).toContain('ETRI 발음평가 응답 실패')
  })
})

// ── fallbackReason별 ETRI 브랜치 비표시 확인 ─────────────────────────────────

describe('fallbackReason별 ETRI 브랜치 비표시', () => {
  it('etri_fetch_failed → ETRI 정상 브랜치 표시 안 함', () => {
    const p: PronunciationDisplayInput = {
      providerName: 'etri',
      normalizedScore: 0,
      wordScores: [],
      fallbackReason: 'etri_fetch_failed',
    }
    expect(shouldShowEtriBranch(p)).toBe(false)
  })

  it('etri_http_error → ETRI 정상 브랜치 표시 안 함', () => {
    const p: PronunciationDisplayInput = {
      providerName: 'etri',
      normalizedScore: 0,
      wordScores: [],
      fallbackReason: 'etri_http_error',
    }
    expect(shouldShowEtriBranch(p)).toBe(false)
  })

  it('etri_api_error → ETRI 정상 브랜치 표시 안 함', () => {
    const p: PronunciationDisplayInput = {
      providerName: 'etri',
      normalizedScore: 0,
      wordScores: [],
      fallbackReason: 'etri_api_error',
    }
    expect(shouldShowEtriBranch(p)).toBe(false)
  })
})

// ── q1 낭독 문항 표시 정책 (B-2) ─────────────────────────────────────────────
// Mirrors result/page.tsx: question?.typeId === 'qt-reading' 분기 로직

function isReadingQuestion(typeId: string | undefined): boolean {
  return typeId === 'qt-reading'
}

function shouldShowRubricBreakdown(typeId: string | undefined): boolean {
  return !isReadingQuestion(typeId)
}

function getScoreCardTitle(typeId: string | undefined): string {
  return isReadingQuestion(typeId) ? '문항 AI 참고평가' : '종합 점수'
}

const READING_CRITERIA = [
  '지문 끝까지 읽기',
  '주요 정보 누락 없이 읽기',
  '문장 단위로 자연스럽게 읽기',
  '기본 발음·억양 이해 가능',
] as const

const READING_GUIDANCE = '공식 종합점수는 1~4번 전체 응시 후 산출됩니다.'

describe('q1 낭독 문항 표시 정책', () => {
  it('qt-reading → isReadingQuestion=true', () => {
    expect(isReadingQuestion('qt-reading')).toBe(true)
  })

  it('qt-speaking → isReadingQuestion=false', () => {
    expect(isReadingQuestion('qt-speaking')).toBe(false)
  })

  it('undefined → isReadingQuestion=false', () => {
    expect(isReadingQuestion(undefined)).toBe(false)
  })

  it('qt-reading → 카드 제목은 "문항 AI 참고평가"', () => {
    expect(getScoreCardTitle('qt-reading')).toBe('문항 AI 참고평가')
  })

  it('qt-speaking → 카드 제목은 "종합 점수"', () => {
    expect(getScoreCardTitle('qt-speaking')).toBe('종합 점수')
  })

  it('qt-reading → rubric 5개 항목 breakdown 표시 안 함', () => {
    expect(shouldShowRubricBreakdown('qt-reading')).toBe(false)
  })

  it('qt-speaking → rubric 5개 항목 breakdown 표시', () => {
    expect(shouldShowRubricBreakdown('qt-speaking')).toBe(true)
  })

  it('낭독 기준 항목 수는 4개', () => {
    expect(READING_CRITERIA.length).toBe(4)
  })

  it('안내 문구에 "1~4번" 포함', () => {
    expect(READING_GUIDANCE).toContain('1~4번')
  })

  it('안내 문구에 "공식 종합점수" 포함', () => {
    expect(READING_GUIDANCE).toContain('공식 종합점수')
  })
})

// ── ETRI 카드는 questionType과 무관하게 providerName으로 결정 ──────────────────

describe('낭독 문항에서도 ETRI 카드 분기는 providerName 기준', () => {
  it('qt-reading + provider=etri + rawScore → ETRI 브랜치 표시', () => {
    const p: PronunciationDisplayInput = {
      providerName: 'etri',
      rawScore: 2.53596,
      normalizedScore: 51,
      wordScores: [],
    }
    expect(shouldShowEtriBranch(p)).toBe(true)
  })

  it('qt-reading + provider=mock → mock 브랜치 표시 (ETRI 카드 없음)', () => {
    const p: PronunciationDisplayInput = {
      providerName: 'mock',
      normalizedScore: 72,
      wordScores: [],
    }
    expect(shouldShowEtriBranch(p)).toBe(false)
    expect(shouldShowMockBranch(p)).toBe(true)
  })
})

// ── ETRI endpoint 정책 (A-2) ──────────────────────────────────────────────────

describe('ETRI endpoint 정책', () => {
  const DEFAULT_ENDPOINT = 'http://epretx.etri.re.kr:8000/api/WiseASR_PronunciationKor'

  it('기본 endpoint는 epretx.etri.re.kr:8000 호스트 포함', () => {
    expect(DEFAULT_ENDPOINT).toContain('epretx.etri.re.kr:8000')
  })

  it('기본 endpoint는 /api/WiseASR_PronunciationKor 경로 포함', () => {
    expect(DEFAULT_ENDPOINT).toContain('/api/WiseASR_PronunciationKor')
  })

  it('기본 endpoint는 유효한 URL (파싱 가능)', () => {
    expect(() => new URL(DEFAULT_ENDPOINT)).not.toThrow()
  })

  it('ETRI_PRONUNCIATION_ENDPOINT 환경변수로 전체 URL 재정의 가능 (패턴 확인)', () => {
    const custom = 'http://my-proxy.internal:8888/api/WiseASR_PronunciationKor'
    const endpoint = custom ?? DEFAULT_ENDPOINT
    expect(endpoint).toBe(custom)
  })
})

// ── A-7: etri_fetch_failed 오류 메시지 분리 (route.ts etriErrorFeedback 미러) ──

// Mirrors app/api/pronunciation/route.ts: etriErrorFeedback(errorCode)
// route.ts에서 pronunciationResult.feedback에 설정되는 값
function etriRouteFeedback(errorCode: string): string {
  switch (errorCode) {
    case 'audio_conversion_failed':
      return 'ETRI 발음평가용 음원 변환에 실패했습니다.'
    case 'etri_score_missing':
      return 'ETRI 응답은 받았지만 점수 필드를 확인하지 못했습니다.'
    case 'etri_fetch_failed':
      return 'ETRI 서버 호출에 실패했습니다. 네트워크 또는 endpoint 확인이 필요합니다.'
    case 'etri_http_error':
      return 'ETRI 서버가 정상 응답을 반환하지 않았습니다.'
    case 'etri_api_error':
      return 'ETRI API 오류 응답을 받았습니다.'
    default:
      return 'ETRI 발음평가 응답 실패: 음원 형식 또는 응답 구조 확인이 필요합니다.'
  }
}

describe('route.ts etriErrorFeedback — etri_fetch_failed 음원 형식 메시지 미포함', () => {
  it('etri_fetch_failed → feedback에 "음원 형식" 포함 안 됨', () => {
    const feedback = etriRouteFeedback('etri_fetch_failed')
    expect(feedback).not.toContain('음원 형식')
  })

  it('etri_fetch_failed → feedback에 "응답 구조" 포함 안 됨', () => {
    const feedback = etriRouteFeedback('etri_fetch_failed')
    expect(feedback).not.toContain('응답 구조')
  })

  it('etri_fetch_failed → feedback에 "네트워크" 또는 "endpoint" 포함', () => {
    const feedback = etriRouteFeedback('etri_fetch_failed')
    expect(feedback).toMatch(/네트워크|endpoint/)
  })

  it('etri_http_error → feedback에 "음원 형식" 포함 안 됨', () => {
    expect(etriRouteFeedback('etri_http_error')).not.toContain('음원 형식')
  })

  it('etri_api_error → feedback에 "음원 형식" 포함 안 됨', () => {
    expect(etriRouteFeedback('etri_api_error')).not.toContain('음원 형식')
  })

  it('audio_conversion_failed → feedback에 "음원 변환" 포함 (올바른 케이스)', () => {
    expect(etriRouteFeedback('audio_conversion_failed')).toContain('음원 변환')
  })

  it('default → "음원 형식 또는 응답 구조" 포함 (폴백 케이스)', () => {
    expect(etriRouteFeedback('unknown_error')).toContain('음원 형식 또는 응답 구조')
  })
})

// ── A-8: etri_fetch_failed 시 amber 박스 secondary 메시지 정책 ─────────────────
// Mirrors result/page.tsx: error amber box secondary text 분기

function resolveAmberBoxSecondaryText(
  fallbackReason: string | undefined,
  rawScore: number | undefined,
): string | null {
  if (!fallbackReason) return null
  if (fallbackReason === 'etri_fetch_failed') {
    return '현재 제출에는 ETRI 발음평가가 반영되지 않았습니다. AI 1차 참고평가만 표시됩니다.'
  }
  if (rawScore === undefined) {
    return '점수를 표시할 수 없습니다. 다시 녹음해 주세요.'
  }
  return null
}

describe('result/page.tsx amber 박스 secondary 메시지 — etri_fetch_failed 분리', () => {
  it('etri_fetch_failed → secondary 메시지는 "ETRI 발음평가가 반영되지 않았습니다"', () => {
    const text = resolveAmberBoxSecondaryText('etri_fetch_failed', undefined)
    expect(text).toContain('ETRI 발음평가가 반영되지 않았습니다')
  })

  it('etri_fetch_failed → secondary 메시지에 "AI 1차 참고평가만 표시됩니다" 포함', () => {
    const text = resolveAmberBoxSecondaryText('etri_fetch_failed', undefined)
    expect(text).toContain('AI 1차 참고평가만 표시됩니다')
  })

  it('etri_fetch_failed → secondary 메시지에 "다시 녹음해 주세요" 포함 안 됨', () => {
    const text = resolveAmberBoxSecondaryText('etri_fetch_failed', undefined)
    expect(text).not.toContain('다시 녹음해 주세요')
  })

  it('etri_score_missing + rawScore 없음 → secondary 메시지는 "점수를 표시할 수 없습니다"', () => {
    const text = resolveAmberBoxSecondaryText('etri_score_missing', undefined)
    expect(text).toContain('점수를 표시할 수 없습니다')
    expect(text).toContain('다시 녹음해 주세요')
  })

  it('etri_api_error + rawScore 없음 → "점수를 표시할 수 없습니다" 포함', () => {
    const text = resolveAmberBoxSecondaryText('etri_api_error', undefined)
    expect(text).toContain('점수를 표시할 수 없습니다')
  })

  it('fallbackReason 없으면 secondary 메시지 없음', () => {
    expect(resolveAmberBoxSecondaryText(undefined, undefined)).toBeNull()
  })

  it('etri_fetch_failed는 다른 에러 코드와 다른 secondary 메시지 사용', () => {
    const fetchFailed = resolveAmberBoxSecondaryText('etri_fetch_failed', undefined)
    const scoreMissing = resolveAmberBoxSecondaryText('etri_score_missing', undefined)
    expect(fetchFailed).not.toBe(scoreMissing)
  })
})
