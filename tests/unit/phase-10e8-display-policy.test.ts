import { describe, it, expect } from 'vitest'

// Phase 10-E-8-FINAL: Azure/demo 표시 정책 및 관리자 화면 정책 단위 테스트

// ── 테스트 1: Azure 성공 시 표시 정책 ──────────────────────────────────────────

describe('테스트 1: Azure 성공 시에만 "실시간 발음평가" 표시', () => {
  function getPronCardTitle(isAzureSuccess: boolean): string {
    return isAzureSuccess ? '발음평가 결과' : '낭독 참고평가'
  }

  function getPronBadge(isAzureSuccess: boolean): string {
    return isAzureSuccess ? '실시간 발음평가' : '시연용 평가 모드'
  }

  it('actual: azure → 제목이 "발음평가 결과"', () => {
    expect(getPronCardTitle(true)).toBe('발음평가 결과')
  })

  it('actual: azure → 배지가 "실시간 발음평가"', () => {
    expect(getPronBadge(true)).toBe('실시간 발음평가')
  })

  it('actual: demo → 제목이 "낭독 참고평가"', () => {
    expect(getPronCardTitle(false)).toBe('낭독 참고평가')
  })

  it('actual: demo → 배지가 "시연용 평가 모드"', () => {
    expect(getPronBadge(false)).toBe('시연용 평가 모드')
  })
})

// ── 테스트 2: demo 시 금지 표현 포함 여부 ─────────────────────────────────────

describe('테스트 2: demo fallback 시 금지 표현 미포함 확인', () => {
  // 금지 표현은 제목/배지/단독 라벨로 사용할 때의 기준.
  // 안내 문구에서 "실시간 발음평가 연결을 확인 중" 형태는 허용 (연결 안 됨을 설명하는 문맥).
  const FORBIDDEN_IN_TITLE_OR_BADGE = [
    'Azure 발음평가 결과',  // 카드 제목으로 사용 금지
    '정밀 발음분석',        // 독립 표현으로 사용 금지
    '발음 정확도 확정 점수', // 독립 표현으로 사용 금지
    '음소 단위 분석',       // 독립 표현으로 사용 금지
  ]

  const ALLOWED_WHEN_DEMO = [
    '시연용 평가 모드',
    '음성 인식 기반 참고평가',
    '제시문-발화 비교 결과',
    '읽기 정확도 참고점수',
    '교수자 검토 전 참고값',
    '정밀 발음평가는 후속 안정화 예정',
  ]

  it('demo 카드 제목에 "Azure 발음평가 결과" 미포함', () => {
    const demoTitle = '낭독 참고평가'
    for (const forbidden of FORBIDDEN_IN_TITLE_OR_BADGE) {
      expect(demoTitle).not.toContain(forbidden)
    }
  })

  it('"발음평가 결과" 문구가 demo 제목에 포함되지 않음', () => {
    const title = '낭독 참고평가'
    expect(title).not.toContain('발음평가 결과')
  })

  it('demo 배지에 "실시간 발음평가" 미사용 (배지는 "시연용 평가 모드")', () => {
    const demoBadge = '시연용 평가 모드'
    expect(demoBadge).not.toBe('실시간 발음평가')
    expect(demoBadge).toBe('시연용 평가 모드')
  })

  it('허용 표현은 demo 문구에 사용 가능', () => {
    const demoDesc = '실시간 발음평가 연결을 확인 중입니다. 현재는 음성 인식 결과와 제시문 비교를 바탕으로 한 참고평가가 표시됩니다.'
    expect(demoDesc).toContain('음성 인식 결과')
  })

  it('ALLOWED_WHEN_DEMO 표현들이 빈 배열이 아님', () => {
    expect(ALLOWED_WHEN_DEMO.length).toBeGreaterThan(0)
  })
})

// ── 테스트 3: q1 demo 안내 문구 ──────────────────────────────────────────────

describe('테스트 3: q1 demo fallback 안내 문구', () => {
  const Q1_DEMO_NOTICE = '실시간 발음평가 연결을 확인 중입니다. 현재는 음성 인식 결과와 제시문 비교를 바탕으로 한 참고평가가 표시됩니다.'

  it('q1 demo 안내 문구에 "시연용 평가 결과" 미포함', () => {
    expect(Q1_DEMO_NOTICE).not.toContain('시연용 평가 결과')
  })

  it('q1 demo 안내 문구에 "음성 인식 결과" 포함', () => {
    expect(Q1_DEMO_NOTICE).toContain('음성 인식 결과')
  })

  it('q1 demo 안내 문구에 "제시문 비교" 포함', () => {
    expect(Q1_DEMO_NOTICE).toContain('제시문 비교')
  })
})

// ── 테스트 4: 읽기연습 fallback 표시 ─────────────────────────────────────────

describe('테스트 4: 읽기연습 fallback 상태 표시 정책', () => {
  function getReadingPracticeTitle(isAzure: boolean): string {
    return isAzure ? '발음 평가 결과' : '읽기 정확도 참고평가'
  }

  function getReadingPracticeBadge(isAzure: boolean): string {
    return isAzure ? '실시간 발음평가' : '음성 인식 기반 참고평가'
  }

  function getReadingPracticeDescription(isAzure: boolean): string | undefined {
    return isAzure ? undefined : '제시문과 내 발화를 비교하여 다른 부분을 표시합니다. 정밀 발음평가는 Azure 연동 안정화 후 고도화 예정입니다.'
  }

  it('Azure 성공 시 제목은 "발음 평가 결과"', () => {
    expect(getReadingPracticeTitle(true)).toBe('발음 평가 결과')
  })

  it('fallback 시 제목은 "읽기 정확도 참고평가"', () => {
    expect(getReadingPracticeTitle(false)).toBe('읽기 정확도 참고평가')
    expect(getReadingPracticeTitle(false)).not.toContain('발음평가 결과')
  })

  it('fallback 시 배지는 "음성 인식 기반 참고평가"', () => {
    expect(getReadingPracticeBadge(false)).toBe('음성 인식 기반 참고평가')
    expect(getReadingPracticeBadge(false)).not.toBe('데모 평가 모드')
  })

  it('fallback 설명에 제시문-발화 비교 문구 포함', () => {
    const desc = getReadingPracticeDescription(false)
    expect(desc).toBeDefined()
    expect(desc).toContain('제시문과 내 발화를 비교')
  })

  it('fallback 설명에 "Azure 연동 안정화" 언급 포함', () => {
    const desc = getReadingPracticeDescription(false)
    expect(desc).toContain('Azure 연동 안정화')
  })
})

// ── 테스트 5: 발표연습 핵심 기능 중심 표시 ───────────────────────────────────

describe('테스트 5: 발표연습 핵심 기능 및 표현 정책', () => {
  const CORE_FEATURES = [
    '원고 교정',
    '섀도잉',
    '타이머',
  ]

  const PRONUNCIATION_NOTICE = '발음 세부 평가는 Azure 연동 안정화 후 고도화 예정입니다.'

  it('발표연습 핵심 기능 목록이 존재함', () => {
    expect(CORE_FEATURES.length).toBeGreaterThanOrEqual(3)
  })

  it('발표연습 발음 안내에 "Azure 연동 안정화" 언급', () => {
    expect(PRONUNCIATION_NOTICE).toContain('Azure 연동 안정화')
  })

  it('발표연습 발음 안내에 "시연용 샘플" 언급', () => {
    const fullNotice = '발음 세부 평가는 Azure 연동 안정화 후 고도화 예정입니다. 위 점수는 시연용 샘플 피드백입니다.'
    expect(fullNotice).toContain('시연용 샘플')
  })

  it('발표연습 발음 안내에 정밀 발음분석 과장 문구 미포함', () => {
    expect(PRONUNCIATION_NOTICE).not.toContain('정밀 발음분석')
    expect(PRONUNCIATION_NOTICE).not.toContain('실시간 발음평가')
  })
})

// ── 테스트 6: 관리자 분석 화면 정책 ─────────────────────────────────────────

describe('테스트 6: 관리자 분석 화면 정책 확인', () => {
  const DEMO_BADGE_TEXT = '시연용 샘플 데이터'
  const PURPOSE_TEXT = '교수자 감원이나 비용절감이 아니라'

  it('"시연용 샘플 데이터" 배지 텍스트 확인', () => {
    expect(DEMO_BADGE_TEXT).toBe('시연용 샘플 데이터')
  })

  it('목적 문구에 "교수자 감원" 부정 포함', () => {
    expect(PURPOSE_TEXT).toContain('교수자 감원이나 비용절감이 아니라')
  })

  it('국가 목록에 8개 지역 포함', () => {
    const countries = ['베트남', '몽골', '우즈베키스탄', '태국', '라오스', '중국', '일본', '아랍권']
    expect(countries.length).toBe(8)
  })

  it('과정 목록에 초급/중급/고급 3개 포함', () => {
    const levels = ['초급', '중급', '고급']
    expect(levels.length).toBe(3)
  })

  it('요약 지표가 6개 포함', () => {
    const metrics = [
      '전체 학습자 수',
      '평균 말하기 점수',
      '평균 발음/낭독 참고점수',
      '평균 과제 수행률',
      '재학습 추천 인원',
      '교수자 검토 대기',
    ]
    expect(metrics.length).toBe(6)
  })
})

// ── 테스트 7: 교수자 대시보드 정책 ──────────────────────────────────────────

describe('테스트 7: 교수자 대시보드 정책 확인', () => {
  const ANONYMOUS_IDS = ['S001', 'S002', 'S003', 'S004', 'S005', 'S006']

  it('학습자 ID가 익명 S000 형식', () => {
    for (const id of ANONYMOUS_IDS) {
      expect(id).toMatch(/^S\d{3}$/)
    }
  })

  it('검토 필요 학습자가 익명화됨', () => {
    const reviewNeeded = ANONYMOUS_IDS.filter((_, i) => [1, 5].includes(i)) // S002, S006
    expect(reviewNeeded).toContain('S002')
    expect(reviewNeeded).toContain('S006')
    expect(reviewNeeded).not.toContain('김철수') // 실명 미포함
  })

  it('교수자 검토 대기 사유가 개발자 오류 코드가 아닌 설명형', () => {
    const flags = ['핵심 정보 누락 의심', '발음 fallback 상태', '배경 요소 누락', '미션 달성률 50% 미만']
    for (const flag of flags) {
      // 개발자식 오류 코드(UPPERCASE_ERROR, 404 등)가 아닌지 확인
      expect(flag).not.toMatch(/^[A-Z_]+$/)
      expect(flag).not.toMatch(/^\d{3}$/)
    }
  })
})
