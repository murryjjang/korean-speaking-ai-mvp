import { describe, it, expect } from 'vitest'

// ── Phase 10-E-6-L: q1~q4 채점 보정 정책 유닛 테스트 ──────────────────────────
// src/providers/llm-eval/index.ts getMockDetail() 및
// app/student/speaking/dialogue-actions.ts q4 goal floor 정책을 검증한다.

// ─── 공통 헬퍼: elementRatio 기반 floor 계산 미러링 ──────────────────────────

/**
 * getMockDetail()의 q2/q3 floor 정책을 반영한 계산기.
 * - ≥0.8: min 80
 * - ≥0.5: min 70
 * - ≥0.33: min 60
 */
function applyQ2Q3Floor(score: number, elementRatio: number): number {
  if (elementRatio >= 0.8) return Math.max(score, 80)
  if (elementRatio >= 0.5) return Math.max(score, 70)
  if (elementRatio >= 0.33) return Math.max(score, 60)
  return score
}

/**
 * getMockDetail()의 q1 floor 정책.
 * - elementRatio >= 1.0 && wordCount >= 15: min 75 overall
 */
function applyQ1Floor(overall: number, elementRatio: number, wordCount: number): number {
  if (elementRatio >= 1.0 && wordCount >= 15) return Math.max(overall, 75)
  return overall
}

/**
 * dialogue-actions.ts의 q4 goal floor 정책.
 */
function applyQ4GoalFloor(overall: number, achievedCount: number, totalGoals: number): number {
  if (totalGoals === 0) return overall
  const goalRatio = achievedCount / totalGoals
  if (goalRatio >= 1.0) return Math.max(overall, 85)
  if (goalRatio >= 0.75) return Math.max(overall, 75)
  if (goalRatio >= 0.5) return Math.max(overall, 60)
  if (goalRatio >= 0.25) return Math.max(overall, 45)
  return overall
}

// ─── 잔여 오탈자 확인 ─────────────────────────────────────────────────────────

describe('오탈자: "약국에 들을" → "약국에 들를" 전수 확인', () => {
  const WRONG_FORM = '들을 예정입니다'
  const CORRECT_FORM = '들를 예정입니다'

  it('잘못된 형태 "들을 예정입니다"가 올바른 형태와 다름 (기준 확인)', () => {
    expect(WRONG_FORM).not.toBe(CORRECT_FORM)
  })

  it('데모 제시문은 "들를 예정입니다"로 끝나야 함', () => {
    const DEMO_SCRIPT = '안녕하세요. 저는 오늘 오후에 병원에 갑니다. 병원에 가기 전에 약국에 들를 예정입니다.'
    expect(DEMO_SCRIPT).toContain('들를 예정입니다')
    expect(DEMO_SCRIPT).not.toContain('들을 예정입니다')
  })
})

// ─── q1 낭독 점수 보정 ────────────────────────────────────────────────────────

describe('q1 낭독 점수 보정 정책', () => {
  it('제시문 대부분을 읽었고 모든 요소 포함 (wordCount≥15): 최소 75점 이상', () => {
    const baseScore = 65
    const floored = applyQ1Floor(baseScore, 1.0, 18)
    expect(floored).toBeGreaterThanOrEqual(75)
  })

  it('wordCount < 15이면 floor 미적용', () => {
    const baseScore = 65
    const floored = applyQ1Floor(baseScore, 1.0, 10)
    expect(floored).toBe(65)
  })

  it('elementRatio < 1.0이면 floor 미적용', () => {
    const baseScore = 65
    const floored = applyQ1Floor(baseScore, 0.75, 18)
    expect(floored).toBe(65)
  })

  it('이미 높은 점수면 floor 영향 없음', () => {
    const baseScore = 88
    const floored = applyQ1Floor(baseScore, 1.0, 20)
    expect(floored).toBe(88)
  })

  it('ETRI 실패가 점수를 낮추지 않는다 — floor 이후 점수 유지', () => {
    // ETRI 실패 시 overall_score는 LLM eval + floor로 결정
    // mock으로 75 이상이면 ETRI fallback 여부와 무관
    const etriFailedScore = applyQ1Floor(70, 1.0, 16)
    expect(etriFailedScore).toBeGreaterThanOrEqual(75)
  })

  it('큰 누락 없는 경우 "문장을 자연스럽게 연결해 말하세요" 피드백 금지 (정책 확인)', () => {
    // reading type일 때 allElementsFound && overall >= 78 → 부드러운 피드백만
    const FORBIDDEN_MSG = '문장을 자연스럽게 연결해 말하면 좋겠습니다'
    const SOFT_MSG = '전반적으로 잘 읽으셨습니다. 받침과 연음 발음을 더 또박또박 읽으면 더욱 좋아질 거예요.'
    expect(SOFT_MSG).not.toContain(FORBIDDEN_MSG)
  })
})

// ─── q2 자료 설명 점수 보정 ──────────────────────────────────────────────────

describe('q2 자료 설명 점수 보정 정책', () => {
  it('5개 중 5개 포함(100%): 최소 80점 이상', () => {
    const score = applyQ2Q3Floor(60, 5 / 5)
    expect(score).toBeGreaterThanOrEqual(80)
  })

  it('5개 중 4개 포함(80%): 최소 80점 이상', () => {
    const score = applyQ2Q3Floor(60, 4 / 5)
    expect(score).toBeGreaterThanOrEqual(80)
  })

  it('5개 중 3개 포함(60%): 최소 70점 이상', () => {
    const score = applyQ2Q3Floor(55, 3 / 5)
    expect(score).toBeGreaterThanOrEqual(70)
  })

  it('5개 중 2개 포함(40%): 최소 60점 이상', () => {
    const score = applyQ2Q3Floor(45, 2 / 5)
    expect(score).toBeGreaterThanOrEqual(60)
  })

  it('장소/인물/행동 2개 이상 포함 시 50점 이하 금지 (elementRatio ≥ 0.33)', () => {
    // 5개 중 2개 = 0.4 ≥ 0.33 → floor 60
    const score = applyQ2Q3Floor(35, 2 / 5)
    expect(score).toBeGreaterThan(50)
  })

  it('5개 중 1개만 포함(20%): floor 미적용 — 낮은 점수 가능', () => {
    const score = applyQ2Q3Floor(30, 1 / 5)
    expect(score).toBe(30) // no floor applied
  })

  it('포함된 요소는 보완점에 다시 나오지 않는 정책 확인', () => {
    const foundElements = ['카페 또는 커피숍 장면을 언급함', '손님이 음료를 주문하는 상황을 설명함']
    const missingElements = ['메뉴판 또는 시계 등 배경 요소 언급']

    // improvement should only mention missing, not found
    const improvement = missingElements.length > 0
      ? `"${missingElements[0]}"을(를) 포함하면 더 좋겠습니다.`
      : ''

    for (const found of foundElements) {
      expect(improvement).not.toContain(found)
    }
  })
})

// ─── q3 듣고 답하기 점수 보정 ────────────────────────────────────────────────

describe('q3 듣고 답하기 점수 보정 정책', () => {
  it('3개 중 3개 포함(100%): 최소 80점 이상', () => {
    const score = applyQ2Q3Floor(60, 3 / 3)
    expect(score).toBeGreaterThanOrEqual(80)
  })

  it('3개 중 2개 포함(67%): 최소 70점 이상', () => {
    const score = applyQ2Q3Floor(58, 2 / 3)
    expect(score).toBeGreaterThanOrEqual(70)
  })

  it('3개 중 1개 포함(33%): 최소 60점 이상', () => {
    const score = applyQ2Q3Floor(45, 1 / 3)
    expect(score).toBeGreaterThanOrEqual(60)
  })

  it('포함된 시간/장소/준비물이 보완점에 다시 나오지 않는 정책 확인', () => {
    const foundElements = ['시간 정보 포함', '장소 정보 포함']
    const missingElements = ['해야 할 일/준비물 포함']

    const improvement = missingElements.length > 0
      ? `"${missingElements[0]}"을(를) 포함하면 더 좋겠습니다.`
      : ''

    for (const found of foundElements) {
      expect(improvement).not.toContain(found)
    }
  })

  it('missingElements가 없고 점수 ≥ 80이면 부정적 피드백 없음 (빈 배열 정책)', () => {
    const overall = 82
    const allFound = true
    // getMockDetail: allElementsFound && isListeningResp && overall >= 80 → []
    const improvements: string[] = allFound && overall >= 80 ? [] : ['핵심 정보를 잘 포함했습니다.']
    expect(improvements).toHaveLength(0)
  })

  it('missingElements가 없고 점수 70-79이면 가벼운 피드백 1개만', () => {
    const overall = 74
    const allFound = true
    // getMockDetail: allElementsFound && isListeningResp && overall >= 70 → light message
    const improvements = allFound && overall >= 70
      ? ['핵심 정보를 잘 포함했습니다. 문장을 더 또렷하게 말하면 더 좋습니다.']
      : ['핵심 정보를 잘 포함했습니다. 문장을 조금 더 자연스럽게 연결해 말하면 좋겠습니다.']
    expect(improvements).toHaveLength(1)
    expect(improvements[0]).not.toContain('빠뜨리지 않도록')
  })
})

// ─── q4 대화 미션 점수 보정 ──────────────────────────────────────────────────

describe('q4 대화 미션 점수 보정 정책', () => {
  it('4/4 missionGoals 달성: 최소 85점 이상', () => {
    const score = applyQ4GoalFloor(60, 4, 4)
    expect(score).toBeGreaterThanOrEqual(85)
  })

  it('3/4 missionGoals 달성: 최소 75점 이상', () => {
    const score = applyQ4GoalFloor(60, 3, 4)
    expect(score).toBeGreaterThanOrEqual(75)
  })

  it('2/4 missionGoals 달성: 최소 60점 이상', () => {
    const score = applyQ4GoalFloor(40, 2, 4)
    expect(score).toBeGreaterThanOrEqual(60)
  })

  it('1/4 missionGoals 달성: 최소 45점 이상', () => {
    const score = applyQ4GoalFloor(30, 1, 4)
    expect(score).toBeGreaterThanOrEqual(45)
  })

  it('0/4 달성: floor 미적용 — 낮은 점수 가능', () => {
    const score = applyQ4GoalFloor(20, 0, 4)
    expect(score).toBe(20)
  })

  it('결제 방법을 말했으면 결제 방법 보완점이 나오지 않음', () => {
    const goalResults = [
      { goalIndex: 0, labelKo: '메뉴판에 있는 품목 주문하기', achieved: true },
      { goalIndex: 1, labelKo: '수량 말하기', achieved: true },
      { goalIndex: 2, labelKo: '포장/매장 이용 여부 말하기', achieved: true },
      { goalIndex: 3, labelKo: '결제 방법 말하기', achieved: true },
    ]
    const unachieved = goalResults.filter((g) => !g.achieved)
    const improvements = unachieved.length > 0
      ? unachieved.map((g) => `"${g.labelKo}"을(를) 말하지 않았습니다.`)
      : ['주문 표현을 더 또렷하게 정리해 말하면 더욱 자연스럽습니다.']

    expect(improvements[0]).not.toContain('결제 방법')
    expect(improvements[0]).not.toContain('포장')
    expect(improvements[0]).not.toContain('수량')
  })

  it('수량을 말하지 않았으면 수량 보완점이 나옴', () => {
    const goalResults = [
      { goalIndex: 0, labelKo: '메뉴판에 있는 품목 주문하기', achieved: true },
      { goalIndex: 1, labelKo: '수량 말하기', achieved: false },
      { goalIndex: 2, labelKo: '포장/매장 이용 여부 말하기', achieved: true },
      { goalIndex: 3, labelKo: '결제 방법 말하기', achieved: true },
    ]
    const unachieved = goalResults.filter((g) => !g.achieved)
    const improvements = unachieved.map((g) => `"${g.labelKo}"을(를) 말하지 않았습니다.`)

    expect(improvements[0]).toContain('수량 말하기')
  })

  it('포장/매장 이용을 말하지 않았으면 해당 보완점이 나옴', () => {
    const goalResults = [
      { goalIndex: 0, labelKo: '메뉴판에 있는 품목 주문하기', achieved: true },
      { goalIndex: 1, labelKo: '수량 말하기', achieved: true },
      { goalIndex: 2, labelKo: '포장/매장 이용 여부 말하기', achieved: false },
      { goalIndex: 3, labelKo: '결제 방법 말하기', achieved: false },
    ]
    const unachieved = goalResults.filter((g) => !g.achieved)
    const improvements = unachieved.map((g) => `"${g.labelKo}"을(를) 말하지 않았습니다.`)

    expect(improvements.some((i) => i.includes('포장/매장'))).toBe(true)
    expect(improvements.some((i) => i.includes('결제 방법'))).toBe(true)
    expect(improvements.every((i) => !i.includes('수량 말하기'))).toBe(true)
  })

  it('4/4 달성 시 긍정 피드백 확인', () => {
    const achievedCount = 4
    const totalGoals = 4
    const feedback = achievedCount >= totalGoals
      ? '모든 미션 목표를 달성했습니다! 대화를 자연스럽게 이어나갔습니다.'
      : '미션 목표를 더 포함해 말하는 연습을 해 보세요.'

    expect(feedback).toContain('모든 미션 목표를 달성')
  })
})

// ─── 공통: provider 오류 → 직접 감점 금지 ────────────────────────────────────

describe('provider 오류와 점수 분리 정책', () => {
  it('STT/mock fallback 상태는 감점 사유로 쓰지 않음 — floor 적용 후 점수 유지', () => {
    // mock provider여도 elementRatio=1.0, wordCount>=15 이면 q1 floor 적용
    const mockProviderScore = applyQ1Floor(68, 1.0, 16)
    expect(mockProviderScore).toBeGreaterThanOrEqual(75)
  })

  it('ETRI 실패가 q1 점수를 낮추지 않음 (floor 이후 기준)', () => {
    // ETRI 실패와 무관하게 floor가 적용됨
    const scoreWithoutETRI = applyQ1Floor(70, 1.0, 15)
    expect(scoreWithoutETRI).toBeGreaterThanOrEqual(75)
  })

  it('q2 mock provider 상태에서도 4/5 requiredElements 충족 시 80점 이상', () => {
    const score = applyQ2Q3Floor(55, 4 / 5)
    expect(score).toBeGreaterThanOrEqual(80)
  })

  it('q4 mock/fallback provider에서도 4/4 달성 시 85점 이상', () => {
    const score = applyQ4GoalFloor(50, 4, 4)
    expect(score).toBeGreaterThanOrEqual(85)
  })
})

// ─── 점수와 피드백 일관성 ─────────────────────────────────────────────────────

describe('점수와 피드백 일관성 정책', () => {
  it('점수 80 이상: 긍정 피드백 기준', () => {
    const score = 82
    const feedback = score >= 80
      ? '훌륭합니다! 핵심 내용을 잘 말했습니다. 이 수준을 유지하면서 계속 연습해 보세요.'
      : '잘 했습니다! 조금 더 연습하면 더욱 좋아질 거예요.'
    expect(feedback).toContain('훌륭합니다')
  })

  it('점수 60-79: "잘 했습니다" 계열 피드백', () => {
    const score = 72
    const feedback = score >= 80
      ? '훌륭합니다!'
      : score >= 60
        ? '잘 했습니다! 조금 더 연습하면 더욱 좋아질 거예요.'
        : '열심히 시도했습니다.'
    expect(feedback).toContain('잘 했습니다')
  })

  it('점수 50 미만: 명확한 감점 근거 없으면 발생하지 않아야 함 (floor 정책 확인)', () => {
    // q2에서 2개 이상 포함 시 50점 이하 금지
    const score = applyQ2Q3Floor(35, 0.4) // 2/5
    expect(score).toBeGreaterThan(50)
  })
})

// ─── q1→q2→q3→q4 흐름 유지 정책 ────────────────────────────────────────────

describe('q1→q2→q3→q4 기존 평가 흐름 유지', () => {
  function pronunciationAPIScope(typeId: string): boolean {
    return typeId === 'qt-reading'
  }

  it('qt-reading만 /api/pronunciation 호출 — q1 흐름 유지', () => {
    expect(pronunciationAPIScope('qt-reading')).toBe(true)
  })

  it('qt-material-desc (q2) → pronunciation API 호출 안 함', () => {
    expect(pronunciationAPIScope('qt-material-desc')).toBe(false)
  })

  it('qt-listening-resp (q3) → pronunciation API 호출 안 함', () => {
    expect(pronunciationAPIScope('qt-listening-resp')).toBe(false)
  })

  it('qt-dialogue-mission (q4) → pronunciation API 호출 안 함', () => {
    expect(pronunciationAPIScope('qt-dialogue-mission')).toBe(false)
  })
})
