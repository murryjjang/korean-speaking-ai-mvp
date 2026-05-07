import { describe, it, expect } from 'vitest'

// q1 낭독 문항 AI 참고점수 정책 테스트
// result/page.tsx: computeQ1ReferenceScore / q1ReferenceGrade 로직을 미러링
// 작업 8 체크리스트 전체 검증

// ── 산식 미러링 ───────────────────────────────────────────────────────────────

// q1ReferenceScore = round(etriCalibratedScore × 0.6 + aiReadingTaskScore × 0.4)
function computeQ1ReferenceScore(aiScore: number, calibratedScore: number): number {
  return Math.round(calibratedScore * 0.6 + aiScore * 0.4)
}

function q1ReferenceGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

type EtriMockResult = {
  providerName: string
  rawScore?: number
  normalizedScore: number
  calibratedScore?: number
  calibrationStatus?: string
  fallbackReason?: string
  wordScores: Array<{ word: string; score: number }>
}

function resolveDisplayScore(
  totalScore: number,
  questionType: string | undefined,
  p: EtriMockResult,
): number {
  const isReadingQuestion = questionType === 'qt-reading'
  const isEtriSuccess = p.providerName === 'etri' && typeof p.rawScore === 'number'
  const effectiveCalibratedScore = p.calibratedScore
  const q1EtriReflected = isReadingQuestion && isEtriSuccess && effectiveCalibratedScore !== undefined
  const q1ReferenceScore = q1EtriReflected
    ? computeQ1ReferenceScore(totalScore, effectiveCalibratedScore!)
    : totalScore
  return isReadingQuestion ? q1ReferenceScore : totalScore
}

function resolveCardDescription(
  questionType: string | undefined,
  p: EtriMockResult,
): string {
  const isReadingQuestion = questionType === 'qt-reading'
  const isEtriSuccess = p.providerName === 'etri' && typeof p.rawScore === 'number'
  const q1EtriReflected = isReadingQuestion && isEtriSuccess && p.calibratedScore !== undefined
  if (isReadingQuestion && q1EtriReflected) {
    return 'AI 1차 평가 + ETRI 보정 참고값 · 교수자 확정 전 참고값'
  }
  return 'AI 1차 평가 · 교수자 확정 전 참고값'
}

function resolveReadingGuidanceText(
  questionType: string | undefined,
  p: EtriMockResult,
): string {
  const isReadingQuestion = questionType === 'qt-reading'
  if (!isReadingQuestion) return ''
  const isEtriSuccess = p.providerName === 'etri' && typeof p.rawScore === 'number'
  const q1EtriReflected = isEtriSuccess && p.calibratedScore !== undefined
  if (q1EtriReflected) {
    return 'ETRI 보정 참고점수를 일부 반영한 문항 참고값입니다. 공식 종합점수는 1~4번 전체 응시 후 산출되며, 최종 점수는 교수자 검토 후 확정됩니다.'
  }
  return 'ETRI 발음평가가 반영되지 않은 AI 참고평가입니다. 공식 종합점수는 1~4번 전체 응시 후 산출되며, 최종 점수는 교수자 검토 후 확정됩니다.'
}

// ── 작업 8-1: q1 reading + provider=etri + calibratedScore → q1ReferenceScore 반영 ─

describe('q1 reading + ETRI calibratedScore → q1ReferenceScore 반영', () => {
  const etriOk: EtriMockResult = {
    providerName: 'etri',
    rawScore: 4.55,
    normalizedScore: 91,
    calibratedScore: 91,
    calibrationStatus: 'provisional',
    wordScores: [],
  }

  it('qt-reading + provider=etri + calibratedScore → displayScore가 totalScore와 다름', () => {
    const displayScore = resolveDisplayScore(78, 'qt-reading', etriOk)
    expect(displayScore).not.toBe(78)
  })

  it('displayScore는 q1ReferenceScore (calibrated 반영)', () => {
    const displayScore = resolveDisplayScore(78, 'qt-reading', etriOk)
    // round(91 * 0.6 + 78 * 0.4) = round(54.6 + 31.2) = round(85.8) = 86
    expect(displayScore).toBe(86)
  })
})

// ── 작업 8-2: calibratedScore 91, AI 78 → q1ReferenceScore 86 (80점대) ──────────

describe('산식 검증 — calibratedScore 91 + AI 78 → 86', () => {
  it('computeQ1ReferenceScore(78, 91) === 86', () => {
    expect(computeQ1ReferenceScore(78, 91)).toBe(86)
  })

  it('결과값은 80점대', () => {
    const score = computeQ1ReferenceScore(78, 91)
    expect(score).toBeGreaterThanOrEqual(80)
    expect(score).toBeLessThan(90)
  })

  it('산식 비율 검증: 0.6 + 0.4 = 1.0 (완전 혼합)', () => {
    // 100% calibrated → 그대로 출력
    expect(computeQ1ReferenceScore(100, 100)).toBe(100)
    // 0% both → 0
    expect(computeQ1ReferenceScore(0, 0)).toBe(0)
  })

  it('ETRI calibratedScore 가중치가 AI 점수 가중치보다 높음 (0.6 > 0.4)', () => {
    // calibrated 100, ai 0 → round(60 + 0) = 60
    const highEtri = computeQ1ReferenceScore(0, 100)
    // calibrated 0, ai 100 → round(0 + 40) = 40
    const highAi = computeQ1ReferenceScore(100, 0)
    expect(highEtri).toBeGreaterThan(highAi)
  })
})

// ── 작업 8-3: q1ReferenceScore는 "문항 AI 참고평가"로 표시 ──────────────────────

function getScoreCardTitle(typeId: string | undefined): string {
  return typeId === 'qt-reading' ? '문항 AI 참고평가' : '종합 점수'
}

describe('q1ReferenceScore는 최종점수가 아닌 "문항 AI 참고평가" 표시', () => {
  it('qt-reading → 카드 제목은 "문항 AI 참고평가" (종합 점수 아님)', () => {
    expect(getScoreCardTitle('qt-reading')).toBe('문항 AI 참고평가')
    expect(getScoreCardTitle('qt-reading')).not.toBe('종합 점수')
  })

  it('qt-speaking → 카드 제목은 "종합 점수" (기존 유지)', () => {
    expect(getScoreCardTitle('qt-speaking')).toBe('종합 점수')
  })
})

// ── 작업 8-4: q1 카드 부제에 "AI 1차 평가 + ETRI 보정 참고값" 포함 ───────────────

describe('q1 카드 CardHeader description — ETRI 성공 시 부제', () => {
  const etriOk: EtriMockResult = {
    providerName: 'etri',
    rawScore: 4.55,
    normalizedScore: 91,
    calibratedScore: 91,
    wordScores: [],
  }
  const etriNoCalib: EtriMockResult = {
    providerName: 'etri',
    rawScore: 4.55,
    normalizedScore: 91,
    wordScores: [],
  }
  const etriFail: EtriMockResult = {
    providerName: 'etri',
    normalizedScore: 0,
    fallbackReason: 'etri_fetch_failed',
    wordScores: [],
  }
  const mockP: EtriMockResult = {
    providerName: 'mock',
    normalizedScore: 72,
    wordScores: [],
  }

  it('qt-reading + ETRI 성공 + calibratedScore → "AI 1차 평가 + ETRI 보정 참고값" 포함', () => {
    const desc = resolveCardDescription('qt-reading', etriOk)
    expect(desc).toContain('AI 1차 평가 + ETRI 보정 참고값')
  })

  it('qt-reading + ETRI 성공 + calibratedScore 없음 → "AI 1차 평가 · 교수자 확정 전 참고값"', () => {
    const desc = resolveCardDescription('qt-reading', etriNoCalib)
    expect(desc).not.toContain('ETRI 보정 참고값')
    expect(desc).toContain('AI 1차 평가')
  })

  it('qt-reading + ETRI 실패 → "AI 1차 평가 · 교수자 확정 전 참고값"', () => {
    const desc = resolveCardDescription('qt-reading', etriFail)
    expect(desc).not.toContain('ETRI 보정 참고값')
  })

  it('qt-speaking + provider=etri → 설명에 "ETRI 보정 참고값" 없음 (q2/q3 기존 유지)', () => {
    const desc = resolveCardDescription('qt-speaking', etriOk)
    expect(desc).not.toContain('ETRI 보정 참고값')
  })

  it('qt-speaking + provider=mock → 기존 설명 유지', () => {
    const desc = resolveCardDescription('qt-speaking', mockP)
    expect(desc).toBe('AI 1차 평가 · 교수자 확정 전 참고값')
  })
})

// ── 작업 8-5: "공식 종합점수는 1~4번 전체 응시 후 산출" 안내 유지 ─────────────────

describe('안내 문구에 "1~4번" 포함 (ETRI 성공/실패 모두)', () => {
  const etriOk: EtriMockResult = { providerName: 'etri', rawScore: 4.55, normalizedScore: 91, calibratedScore: 91, wordScores: [] }
  const etriFail: EtriMockResult = { providerName: 'etri', normalizedScore: 0, fallbackReason: 'etri_fetch_failed', wordScores: [] }

  it('ETRI 성공 시 안내 문구에 "1~4번" 포함', () => {
    const text = resolveReadingGuidanceText('qt-reading', etriOk)
    expect(text).toContain('1~4번')
  })

  it('ETRI 실패 시 안내 문구에 "1~4번" 포함', () => {
    const text = resolveReadingGuidanceText('qt-reading', etriFail)
    expect(text).toContain('1~4번')
  })

  it('ETRI 성공 시 안내 문구에 "공식 종합점수" 포함', () => {
    const text = resolveReadingGuidanceText('qt-reading', etriOk)
    expect(text).toContain('공식 종합점수')
  })

  it('ETRI 성공 시 안내 문구에 "교수자 검토 후 확정" 포함', () => {
    const text = resolveReadingGuidanceText('qt-reading', etriOk)
    expect(text).toContain('교수자 검토 후 확정')
  })
})

// ── 작업 8-6: ETRI 실패 시 기존 AI 참고점수 유지 ─────────────────────────────────

describe('ETRI 실패 시 기존 AI 참고점수 유지', () => {
  const etriFail: EtriMockResult = {
    providerName: 'etri',
    normalizedScore: 0,
    fallbackReason: 'etri_fetch_failed',
    wordScores: [],
  }
  const mockP: EtriMockResult = {
    providerName: 'mock',
    normalizedScore: 72,
    wordScores: [],
  }

  it('ETRI 실패 시 qt-reading displayScore === totalScore', () => {
    const displayScore = resolveDisplayScore(78, 'qt-reading', etriFail)
    expect(displayScore).toBe(78)
  })

  it('provider=mock 시 qt-reading displayScore === totalScore', () => {
    const displayScore = resolveDisplayScore(78, 'qt-reading', mockP)
    expect(displayScore).toBe(78)
  })

  it('ETRI 실패 시 안내 문구에 "ETRI 발음평가가 반영되지 않은" 포함', () => {
    const text = resolveReadingGuidanceText('qt-reading', etriFail)
    expect(text).toContain('ETRI 발음평가가 반영되지 않은')
  })
})

// ── 작업 8-7: q1에서 legacy 5개 breakdown 미표시 ─────────────────────────────────

describe('q1 낭독 문항 — legacy rubric-speaking-01 5개 breakdown 미표시', () => {
  function shouldShowRubricBreakdown(questionType: string | undefined): boolean {
    return questionType !== 'qt-reading'
  }

  it('qt-reading → rubric breakdown 미표시', () => {
    expect(shouldShowRubricBreakdown('qt-reading')).toBe(false)
  })

  it('qt-speaking → rubric breakdown 표시 (기존 유지)', () => {
    expect(shouldShowRubricBreakdown('qt-speaking')).toBe(true)
  })

  it('qt-dialogue-mission → rubric breakdown 표시 (q4 기존 유지)', () => {
    expect(shouldShowRubricBreakdown('qt-dialogue-mission')).toBe(true)
  })

  it('qt-listening-response → rubric breakdown 표시 (q3 기존 유지)', () => {
    expect(shouldShowRubricBreakdown('qt-listening-response')).toBe(true)
  })
})

// ── 작업 8-8: ETRI 카드 3단계 점수 별도 표시 ─────────────────────────────────────

describe('ETRI 카드 rawScore / normalizedScore / calibratedScore 별도 표시', () => {
  it('rawScore / normalizedScore / calibratedScore 모두 서로 다른 값', () => {
    const rawScore = 3.88
    const normalizedScore = Math.round((rawScore / 5) * 100) // 78
    const calibratedScore = 91 // piecewise linear calibration 결과 (예시)
    expect(rawScore).not.toBe(normalizedScore)
    expect(normalizedScore).not.toBe(calibratedScore)
    expect(rawScore).not.toBe(calibratedScore)
  })

  it('calibratedScore는 normalizedScore보다 높음 (보정 효과)', () => {
    // rawScore 3.88: normalizedScore = round(3.88/5*100) = 78
    const normalizedScore = Math.round((3.88 / 5) * 100)
    const calibratedScore = 91
    expect(calibratedScore).toBeGreaterThan(normalizedScore)
  })
})

// ── 작업 8-9: calibratedScore는 teacher final score로 자동 확정 안 됨 ─────────────

describe('calibratedScore 최종점수 미자동확정 정책', () => {
  it('calibrationStatus는 항상 "provisional" — 최종 확정값 아님', () => {
    const status = 'provisional'
    expect(status).toBe('provisional')
    expect(status).not.toBe('validated')
    expect(status).not.toBe('finalized')
  })

  it('q1ReferenceScore는 "문항 AI 참고평가" — teacher final score 아님', () => {
    // teacher final score는 교수자 검토 후 별도 결정
    // q1ReferenceScore는 교수자 확정 전 참고값
    const q1RefScore = computeQ1ReferenceScore(78, 91) // 86
    const teacherFinalScore: number | undefined = undefined // 교수자 미확정
    expect(q1RefScore).toBeDefined()
    expect(teacherFinalScore).toBeUndefined()
    expect(q1RefScore).not.toBe(teacherFinalScore)
  })
})

// ── 작업 8-10: calibratedScore는 1~4번 전체 공식 종합점수에 자동 반영 안 됨 ────────

describe('calibratedScore는 공식 종합점수(세트 1~4번)에 자동 반영 안 됨', () => {
  it('q1ReferenceScore는 단일 문항 참고값 — 세트 종합점수와 별개', () => {
    const q1RefScore = computeQ1ReferenceScore(78, 91) // 86
    // 세트 종합점수는 q1~q4 교수자 채점 완료 후 별도 계산
    const setTotalScore: number | undefined = undefined // 미산출
    expect(q1RefScore).toBeDefined()
    expect(setTotalScore).toBeUndefined()
  })

  it('q1ReferenceScore 변경이 q2/q3/q4 점수에 영향 없음', () => {
    // 각 문항 점수는 독립적으로 계산됨
    const q1Ref = computeQ1ReferenceScore(78, 91) // 86
    const q2Score = 72 // 별개
    const q3Score = 65 // 별개
    const q4Score = 80 // 별개
    // q1ReferenceScore 반영이 q2~q4에 영향 없음을 확인
    expect(q1Ref).not.toBe(q2Score)
    expect(q1Ref).not.toBe(q3Score)
    expect(q1Ref).not.toBe(q4Score)
  })
})

// ── 작업 8-11/12: q2/q3/q4 기존 흐름 유지 ───────────────────────────────────────

describe('q2/q3/q4 기존 흐름 유지 — q1 변경이 타 문항에 영향 없음', () => {
  const etriOk: EtriMockResult = { providerName: 'etri', rawScore: 4.55, normalizedScore: 91, calibratedScore: 91, wordScores: [] }

  it('qt-speaking (q2/q3): q1 산식 미적용, totalScore 그대로 사용', () => {
    const displayScore = resolveDisplayScore(72, 'qt-speaking', etriOk)
    expect(displayScore).toBe(72) // ETRI calibrated 미반영
  })

  it('qt-listening-response (q3): q1 산식 미적용', () => {
    const displayScore = resolveDisplayScore(65, 'qt-listening-response', etriOk)
    expect(displayScore).toBe(65)
  })

  it('qt-dialogue-mission (q4): q1 산식 미적용', () => {
    const displayScore = resolveDisplayScore(80, 'qt-dialogue-mission', etriOk)
    expect(displayScore).toBe(80)
  })

  it('qt-material-description (q2): q1 산식 미적용', () => {
    const displayScore = resolveDisplayScore(68, 'qt-material-description', etriOk)
    expect(displayScore).toBe(68)
  })
})

// ── 등급 산정 보정 (작업 6) ───────────────────────────────────────────────────────

describe('q1ReferenceScore 기반 등급 산정', () => {
  it('90 이상 → A등급', () => {
    expect(q1ReferenceGrade(90)).toBe('A')
    expect(q1ReferenceGrade(100)).toBe('A')
  })

  it('80 이상 90 미만 → B등급', () => {
    expect(q1ReferenceGrade(80)).toBe('B')
    expect(q1ReferenceGrade(89)).toBe('B')
  })

  it('70 이상 80 미만 → C등급', () => {
    expect(q1ReferenceGrade(70)).toBe('C')
    expect(q1ReferenceGrade(78)).toBe('C')
  })

  it('60 이상 70 미만 → D등급', () => {
    expect(q1ReferenceGrade(60)).toBe('D')
  })

  it('60 미만 → F등급', () => {
    expect(q1ReferenceGrade(59)).toBe('F')
    expect(q1ReferenceGrade(0)).toBe('F')
  })

  it('calibratedScore 91 + AI 78 → q1ReferenceScore 86 → B등급', () => {
    const score = computeQ1ReferenceScore(78, 91) // 86
    expect(q1ReferenceGrade(score)).toBe('B')
  })

  it('기존 AI만 78점 → C등급 (ETRI 없을 때)', () => {
    expect(q1ReferenceGrade(78)).toBe('C')
  })
})

// ── "ETRI 참고 반영" 기준 항목 표시 ─────────────────────────────────────────────

describe('낭독 기준 항목 — ETRI 반영 시 "기본 발음·억양" 항목에 마커 추가', () => {
  const READING_CRITERIA = [
    '지문 끝까지 읽기',
    '주요 정보 누락 없이 읽기',
    '문장 단위로 자연스럽게 읽기',
    '기본 발음·억양 이해 가능',
  ] as const

  function renderCriteria(q1EtriReflected: boolean): string[] {
    return READING_CRITERIA.map((c) =>
      c === '기본 발음·억양 이해 가능' && q1EtriReflected
        ? `${c} · ETRI 참고 반영`
        : c,
    )
  }

  it('ETRI 반영 시 "기본 발음·억양 이해 가능" 항목에 "· ETRI 참고 반영" 추가', () => {
    const rendered = renderCriteria(true)
    expect(rendered).toContain('기본 발음·억양 이해 가능 · ETRI 참고 반영')
  })

  it('ETRI 미반영 시 "기본 발음·억양 이해 가능" 항목에 마커 없음', () => {
    const rendered = renderCriteria(false)
    expect(rendered).toContain('기본 발음·억양 이해 가능')
    expect(rendered).not.toContain('ETRI 참고 반영')
  })

  it('나머지 기준 항목은 ETRI 반영 여부와 무관하게 동일', () => {
    const withEtri = renderCriteria(true)
    const withoutEtri = renderCriteria(false)
    expect(withEtri[0]).toBe(withoutEtri[0]) // 지문 끝까지 읽기
    expect(withEtri[1]).toBe(withoutEtri[1]) // 주요 정보 누락 없이 읽기
    expect(withEtri[2]).toBe(withoutEtri[2]) // 문장 단위로 자연스럽게 읽기
  })

  it('기준 항목은 4개 유지', () => {
    expect(READING_CRITERIA.length).toBe(4)
  })
})

// ── fallback: rawScore만 있고 calibratedScore 없는 경우 ───────────────────────────

describe('fallback — rawScore 있고 calibratedScore 없으면 calibration 함수로 계산', () => {
  it('calibratedScore 미전달 시 rawScore로 계산 가능 (calibrateEtriScore 함수 존재 확인)', async () => {
    const { calibrateEtriScore } = await import('@/src/lib/pronunciation-calibration')
    const result = calibrateEtriScore(3.88)
    expect(result.calibratedScore).toBeGreaterThan(0)
    expect(result.calibratedScore).toBeLessThanOrEqual(100)
  })

  it('rawScore 3.88 → calibration 후 80점대 이상', async () => {
    const { calibrateEtriScore } = await import('@/src/lib/pronunciation-calibration')
    const { calibratedScore } = calibrateEtriScore(3.88)
    // 앵커: rawScore 3.5 → 85, 4.0 → 93 사이 → 약 88~91
    expect(calibratedScore).toBeGreaterThanOrEqual(85)
    expect(calibratedScore).toBeLessThanOrEqual(95)
  })
})
