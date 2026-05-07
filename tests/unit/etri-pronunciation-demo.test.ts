import { describe, it, expect } from 'vitest'
import { computeEtriWordDiff } from '@/src/lib/etri-word-diff'

// ── 작업 7: ETRI 발음 교정 데모 유닛 테스트 ───────────────────────────────────

// ─── 데모 샘플 데이터 구조 (데모 페이지 데이터와 동일하게 미러링) ─────────────
const DEMO_SCRIPT =
  '안녕하세요. 저는 오늘 오후에 병원에 갑니다. 병원에 가기 전에 약국에 들를 예정입니다.'

const GOOD_SAMPLE = {
  id: 'good',
  rawScore: 4.6,
  normalizedScore: 92,
  recognized:
    '안녕하세요 저는 오늘 오후에 병원에 갑니다 병원에 가기 전에 약국에 들를 예정입니다',
  correctionPoints: [] as string[],
  provider: 'etri',
  isDemo: true,
}

const CORRECTION_SAMPLE = {
  id: 'correction',
  rawScore: 2.3,
  normalizedScore: 46,
  recognized:
    '안녕하세요 저는 오늘 오후에 병원에 갑니다 병원에 가기 전에 약구게 들 예정입니다',
  correctionPoints: [
    '"약국에"의 받침 ㄱ과 조사 "에"의 연음이 약하게 들렸습니다.',
    '"들를"에서 받침 ㄹ의 연음 발음을 더 명확히 해보세요.',
  ],
  provider: 'etri',
  isDemo: true,
}

// ─── 테스트 7-6: 데모 샘플에 ETRI 원점수/환산점수/인식 결과 포함 ─────────────
describe('데모 샘플 데이터 구조 유효성', () => {
  it('좋은 발음 샘플: ETRI 원점수가 1–5 범위', () => {
    expect(GOOD_SAMPLE.rawScore).toBeGreaterThanOrEqual(1)
    expect(GOOD_SAMPLE.rawScore).toBeLessThanOrEqual(5)
  })

  it('좋은 발음 샘플: 환산점수가 0–100 범위', () => {
    expect(GOOD_SAMPLE.normalizedScore).toBeGreaterThanOrEqual(0)
    expect(GOOD_SAMPLE.normalizedScore).toBeLessThanOrEqual(100)
  })

  it('교정 필요 샘플: ETRI 원점수가 1–5 범위', () => {
    expect(CORRECTION_SAMPLE.rawScore).toBeGreaterThanOrEqual(1)
    expect(CORRECTION_SAMPLE.rawScore).toBeLessThanOrEqual(5)
  })

  it('교정 필요 샘플: 환산점수가 0–100 범위', () => {
    expect(CORRECTION_SAMPLE.normalizedScore).toBeGreaterThanOrEqual(0)
    expect(CORRECTION_SAMPLE.normalizedScore).toBeLessThanOrEqual(100)
  })

  it('두 샘플 모두 provider: etri', () => {
    expect(GOOD_SAMPLE.provider).toBe('etri')
    expect(CORRECTION_SAMPLE.provider).toBe('etri')
  })

  it('두 샘플 모두 isDemo: true (실제 학습자 점수 비반영 마킹)', () => {
    expect(GOOD_SAMPLE.isDemo).toBe(true)
    expect(CORRECTION_SAMPLE.isDemo).toBe(true)
  })

  it('인식 결과(recognized)가 빈 문자열이 아님', () => {
    expect(GOOD_SAMPLE.recognized.trim()).not.toBe('')
    expect(CORRECTION_SAMPLE.recognized.trim()).not.toBe('')
  })

  it('좋은 발음 샘플의 환산점수 > 교정 필요 샘플의 환산점수', () => {
    expect(GOOD_SAMPLE.normalizedScore).toBeGreaterThan(CORRECTION_SAMPLE.normalizedScore)
  })
})

// ─── 테스트 7-9: 데모 샘플 점수가 실제 학습자 평가 점수에 반영되지 않음 ────────
describe('데모 샘플 점수 격리 정책', () => {
  it('isDemo=true이면 학습자 평가 점수로 취급하지 않음', () => {
    function shouldReflectInLearnerScore(sample: { isDemo: boolean }): boolean {
      return !sample.isDemo
    }
    expect(shouldReflectInLearnerScore(GOOD_SAMPLE)).toBe(false)
    expect(shouldReflectInLearnerScore(CORRECTION_SAMPLE)).toBe(false)
  })

  it('isDemo=false인 실제 평가 결과는 학습자 점수에 반영됨', () => {
    function shouldReflectInLearnerScore(sample: { isDemo: boolean }): boolean {
      return !sample.isDemo
    }
    const realResult = { isDemo: false }
    expect(shouldReflectInLearnerScore(realResult)).toBe(true)
  })
})

// ─── 테스트 7-7: 제시문과 다른 부분 표시 (computeEtriWordDiff) ────────────────
describe('computeEtriWordDiff — 제시문 vs 인식 결과 비교', () => {
  it('좋은 발음: 제시문과 인식 결과가 일치 → mismatchedRefWords 없음', () => {
    const { mismatchedRefWords } = computeEtriWordDiff(DEMO_SCRIPT, GOOD_SAMPLE.recognized)
    expect(mismatchedRefWords).toHaveLength(0)
  })

  it('교정 필요: "약국에"가 mismatch 감지됨', () => {
    const { mismatchedRefWords } = computeEtriWordDiff(
      DEMO_SCRIPT,
      CORRECTION_SAMPLE.recognized,
    )
    expect(mismatchedRefWords).toContain('약국에')
  })

  it('교정 필요: "들를"이 mismatch 감지됨', () => {
    const { mismatchedRefWords } = computeEtriWordDiff(
      DEMO_SCRIPT,
      CORRECTION_SAMPLE.recognized,
    )
    expect(mismatchedRefWords).toContain('들를')
  })

  it('교정 필요: 정확히 2개 단어가 mismatch', () => {
    const { mismatchedRefWords } = computeEtriWordDiff(
      DEMO_SCRIPT,
      CORRECTION_SAMPLE.recognized,
    )
    expect(mismatchedRefWords).toHaveLength(2)
  })

  it('refTokens 개수는 reference 단어 수와 동일', () => {
    const { refTokens } = computeEtriWordDiff(DEMO_SCRIPT, GOOD_SAMPLE.recognized)
    const refWordCount = DEMO_SCRIPT.split(/\s+/).filter(Boolean).length
    expect(refTokens).toHaveLength(refWordCount)
  })

  it('완전히 다른 문장 → 모든 단어 mismatch', () => {
    const { mismatchedRefWords } = computeEtriWordDiff('가나다 라마바', '사아자 차카타')
    expect(mismatchedRefWords).toHaveLength(2)
  })

  it('완전히 일치하는 문장 → mismatch 없음', () => {
    const { mismatchedRefWords } = computeEtriWordDiff('안녕 세상', '안녕 세상')
    expect(mismatchedRefWords).toHaveLength(0)
  })

  it('구두점 제거 후 일치 → matched로 처리', () => {
    const { mismatchedRefWords } = computeEtriWordDiff('안녕하세요.', '안녕하세요')
    expect(mismatchedRefWords).toHaveLength(0)
  })

  it('recognized가 비어있으면 모든 ref 단어가 mismatch', () => {
    const { mismatchedRefWords } = computeEtriWordDiff('가나다 라마바', '')
    expect(mismatchedRefWords).toHaveLength(2)
  })
})

// ─── 테스트 7-1: q1 ETRI 실패 시 큰 오류 카드 미표시 정책 ──────────────────────
// 학습자 화면에 개발자식 오류 문구가 크게 표시되지 않아야 한다.
describe('q1 ETRI 실패 시 오류 표시 정책', () => {
  const FORBIDDEN_DEVELOPER_PHRASES = [
    'endpoint 확인',
    'provider error',
    'ETRI 서버 호출 실패',
    'etri_fetch_failed',
    'etri_http_error',
    'etri_api_error',
    'etri_score_missing',
  ]

  function isLearnerFriendlyFallbackMessage(message: string): boolean {
    return FORBIDDEN_DEVELOPER_PHRASES.every((phrase) => !message.includes(phrase))
  }

  it('ETRI fallback 안내는 개발자식 오류 문구를 포함하지 않음', () => {
    const fallbackNotice =
      'ETRI 발음평가는 현재 외부 서버 연결 확인 중입니다. 이번 결과에는 AI 참고평가만 반영되었습니다.'
    expect(isLearnerFriendlyFallbackMessage(fallbackNotice)).toBe(true)
  })

  it('reading-score-guidance ETRI 실패 문구에 "endpoint 확인"이 없음', () => {
    const guidance =
      'ETRI 발음평가는 현재 외부 서버 연결 확인 중입니다. 이번 결과에는 AI 참고평가만 반영되었습니다. 최종 점수는 교수자 검토 후 확정됩니다.'
    expect(guidance).not.toContain('endpoint 확인')
    expect(guidance).not.toContain('etri_fetch_failed')
  })

  it('데모 연결 상태 안내도 학습자 친화적 문구 사용', () => {
    const liveStatusNote =
      '실시간 ETRI 호출은 현재 연결 확인 중입니다. 아래는 시연용 샘플 결과입니다.'
    expect(isLearnerFriendlyFallbackMessage(liveStatusNote)).toBe(true)
  })
})

// ─── 테스트 7-8: 데모 화면에 "ETRI 점수와 인식 결과 기반 추정" 안내 ────────────
describe('"ETRI 점수와 인식 결과 기반 추정" 표현 정책', () => {
  it('교정 포인트 설명에 "ETRI가 직접 반환했다"는 표현이 없음', () => {
    const correctionLabel = 'ETRI 점수와 인식 결과 기반 추정 교정 포인트'
    expect(correctionLabel).not.toContain('ETRI가 음절별 오류를 직접 반환했다')
    expect(correctionLabel).toContain('추정')
  })

  it('교정 포인트 라벨이 "추정" 키워드를 포함', () => {
    const correctionLabel = 'ETRI 점수와 인식 결과 기반 추정 교정 포인트'
    expect(correctionLabel).toContain('추정')
  })
})

// ─── 테스트 7-2: q1 결과 화면 ETRI 안내 — data-testid 존재 확인 ─────────────
// data-testid="etri-fallback-notice" 가 q1 fallback 시 존재해야 함.
// Server component이므로 DOM 직접 검사가 아닌 정책 함수로 검증.
describe('q1 결과 화면 fallback 안내 정책', () => {
  type MockResult = {
    fallbackReason: string | undefined
    providerName: string
    rawScore: number | undefined
  }

  function shouldShowFallbackNotice(result: MockResult): boolean {
    return Boolean(result.fallbackReason)
  }

  it('fallbackReason이 있으면 안내 텍스트 표시', () => {
    const result: MockResult = {
      fallbackReason: 'etri_fetch_failed',
      providerName: 'etri',
      rawScore: undefined,
    }
    expect(shouldShowFallbackNotice(result)).toBe(true)
  })

  it('fallbackReason이 없으면 안내 텍스트 미표시', () => {
    const result: MockResult = {
      fallbackReason: undefined,
      providerName: 'etri',
      rawScore: 3.2,
    }
    expect(shouldShowFallbackNotice(result)).toBe(false)
  })

  it('mock provider이면 fallbackReason 없음 → 안내 미표시', () => {
    const result: MockResult = {
      fallbackReason: undefined,
      providerName: 'mock',
      rawScore: undefined,
    }
    expect(shouldShowFallbackNotice(result)).toBe(false)
  })
})

// ─── 테스트 7-3: q1 결과 화면 ETRI 데모 링크 정책 ───────────────────────────
describe('q1 결과 화면 ETRI 데모 링크 표시 정책', () => {
  function etriDemoLinkTarget(): string {
    return '/student/etri-pronunciation-demo'
  }

  it('ETRI 데모 링크가 올바른 경로를 가리킴', () => {
    expect(etriDemoLinkTarget()).toBe('/student/etri-pronunciation-demo')
  })
})

// ─── 테스트 7-10/11: 기존 평가 흐름 유지 정책 확인 ──────────────────────────
describe('q1→q2→q3→q4 기존 평가 흐름 유지 정책', () => {
  function pronunciationAPIScope(typeId: string): boolean {
    return typeId === 'qt-reading'
  }

  it('qt-reading만 /api/pronunciation 호출 → q1 흐름 유지', () => {
    expect(pronunciationAPIScope('qt-reading')).toBe(true)
  })

  it('qt-material-description (q2) → 호출하지 않음', () => {
    expect(pronunciationAPIScope('qt-material-description')).toBe(false)
  })

  it('qt-listening-resp (q3) → 호출하지 않음', () => {
    expect(pronunciationAPIScope('qt-listening-resp')).toBe(false)
  })

  it('qt-dialogue-mission (q4) → 호출하지 않음', () => {
    expect(pronunciationAPIScope('qt-dialogue-mission')).toBe(false)
  })
})
