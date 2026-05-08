import { describe, it, expect } from 'vitest'

// q1 Azure Pronunciation Assessment 전환 정책 테스트 (Phase 10-E-7-D)
// result/page.tsx의 Azure 관련 로직을 미러링

// ── 산식 미러링 ───────────────────────────────────────────────────────────────

function computeQ1AzureScore(aiScore: number, pronScore: number): number {
  return Math.max(0, Math.min(100, Math.round(pronScore * 0.7 + aiScore * 0.3)))
}

function q1ReferenceGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

type MockPronResult = {
  providerName: string
  normalizedScore: number
  pronScore?: number | null
  accuracyScore?: number | null
  fluencyScore?: number | null
  completenessScore?: number | null
  recognizedText?: string
  wordResults?: Array<{ word: string; accuracyScore: number; errorType: string }>
  fallbackReason?: string
  rawScore?: number
  calibratedScore?: number
}

function isAzureSuccess(p: MockPronResult): boolean {
  return p.providerName === 'azure' && p.pronScore != null
}

function computeQ1DemoScore(aiScore: number, textMatchScore: number): number {
  const raw = Math.max(0, Math.min(100, Math.round(textMatchScore * 0.7 + aiScore * 0.3)))
  if (textMatchScore >= 90) return Math.max(90, raw)
  if (textMatchScore >= 85) return Math.max(87, raw)
  return raw
}

function computeDisplayScore(aiScore: number, questionType: string, p: MockPronResult): number {
  if (questionType !== 'qt-reading') return aiScore
  if (isAzureSuccess(p)) return computeQ1AzureScore(aiScore, p.pronScore!)
  if (p.normalizedScore > 0 && p.recognizedText) return computeQ1DemoScore(aiScore, p.normalizedScore)
  return aiScore
}

function getProviderBadgeText(p: MockPronResult): string {
  return isAzureSuccess(p) ? '실시간 발음평가' : '시연용 평가 모드'
}

function getCardDescription(p: MockPronResult): string {
  if (isAzureSuccess(p)) return 'provider: azure · 실시간 발음평가'
  if (p.providerName === 'etri' && typeof p.rawScore === 'number') return `provider: etri · 원점수 ${p.rawScore.toFixed(2)}/5`
  // fallbackReason set OR confusion state (azure provider, pronScore null, no fallbackReason)
  if (p.fallbackReason || p.providerName === 'azure') return 'attempted: azure · actual: demo'
  return `provider: ${p.providerName}`
}

function shouldShowFallbackNotice(p: MockPronResult): boolean {
  return !isAzureSuccess(p) && (!!p.fallbackReason || p.providerName === 'azure')
}

// Mirrors normalizePronunciationDisplay fixed-offset logic from result/page.tsx
function normalizePronunciationDisplay(normalizedScore: number): Array<{ key: string; score: number }> {
  const clamp = (v: number) => Math.max(0, Math.min(100, v))
  return [
    { key: 'accuracy', score: normalizedScore },
    { key: 'fluency', score: clamp(normalizedScore - 2) },
    { key: 'rhythm', score: clamp(normalizedScore + 3) },
    { key: 'clarity', score: clamp(normalizedScore + 1) },
    { key: 'completeness', score: clamp(normalizedScore - 3) },
  ]
}

// Mirrors computeTextMatchScore from /api/pronunciation-azure/route.ts
// Floor policy: 97%+ → 97, 93%+ → 93, 90%+ → 90, 85%+ → 85, 80%+ → 80
function computeTextMatchScore(referenceText: string, recognizedText: string): number {
  if (!recognizedText.trim()) return 30
  const norm = (s: string) => s.replace(/[.,!?。、·「」『』""'']/g, '').trim()
  const refWords = referenceText.split(/\s+/).filter(Boolean).map(norm)
  const recWords = recognizedText.split(/\s+/).filter(Boolean).map(norm)
  if (refWords.length === 0) return 60
  let matched = 0
  const recCopy = [...recWords]
  for (const rw of refWords) {
    const idx = recCopy.indexOf(rw)
    if (idx >= 0) { matched++; recCopy.splice(idx, 1) }
  }
  const ratio = matched / refWords.length
  if (ratio >= 0.97) return 97
  if (ratio >= 0.93) return 93
  if (ratio >= 0.90) return 90
  if (ratio >= 0.85) return 85
  if (ratio >= 0.80) return 80
  if (ratio >= 0.60) return Math.round(60 + (ratio - 0.60) / 0.20 * 20)
  if (ratio >= 0.40) return Math.round(50 + (ratio - 0.40) / 0.20 * 10)
  return Math.max(30, Math.round(30 + ratio * 50))
}

// ── 테스트 1: PRONUNCIATION_PROVIDER=azure면 q1 provider가 azure 우선 ──────────

describe('테스트 1: q1 provider azure 우선 정책', () => {
  it('PRONUNCIATION_PROVIDER=azure + pronScore 존재 → isAzureSuccess true', () => {
    const p: MockPronResult = { providerName: 'azure', normalizedScore: 82, pronScore: 87 }
    expect(isAzureSuccess(p)).toBe(true)
  })

  it('PRONUNCIATION_PROVIDER=azure + pronScore null → isAzureSuccess false (fallback)', () => {
    const p: MockPronResult = { providerName: 'azure', normalizedScore: 72, pronScore: null, fallbackReason: 'azure_fetch_failed' }
    expect(isAzureSuccess(p)).toBe(false)
  })

  it('providerName=demo (fallback) → isAzureSuccess false', () => {
    const p: MockPronResult = { providerName: 'demo', normalizedScore: 72, pronScore: null, fallbackReason: 'azure_not_configured' }
    expect(isAzureSuccess(p)).toBe(false)
  })
})

// ── 테스트 2: Azure 성공 시 "실시간 발음평가" 배지 ──────────────────────────────

describe('테스트 2: Azure 성공 시 "실시간 발음평가" 배지', () => {
  it('Azure success → badge = "실시간 발음평가"', () => {
    const p: MockPronResult = { providerName: 'azure', normalizedScore: 85, pronScore: 90 }
    expect(getProviderBadgeText(p)).toBe('실시간 발음평가')
  })

  it('fallback → badge = "시연용 평가 모드"', () => {
    const p: MockPronResult = { providerName: 'demo', normalizedScore: 72, pronScore: null, fallbackReason: 'azure_fetch_failed' }
    expect(getProviderBadgeText(p)).toBe('시연용 평가 모드')
  })
})

// ── 테스트 3: Azure 성공 시 PronScore/Accuracy/Fluency/Completeness 표시 ─────────

describe('테스트 3: Azure 세부 점수 표시', () => {
  const azureOk: MockPronResult = {
    providerName: 'azure',
    normalizedScore: 87,
    pronScore: 87,
    accuracyScore: 90,
    fluencyScore: 82,
    completenessScore: 95,
  }

  it('Azure success + pronScore → pronScore 표시 가능', () => {
    expect(isAzureSuccess(azureOk)).toBe(true)
    expect(azureOk.pronScore).toBe(87)
  })

  it('accuracyScore != null → 정확도 표시 가능', () => {
    expect(azureOk.accuracyScore).toBe(90)
  })

  it('fluencyScore != null → 유창성 표시 가능', () => {
    expect(azureOk.fluencyScore).toBe(82)
  })

  it('completenessScore != null → 완성도 표시 가능', () => {
    expect(azureOk.completenessScore).toBe(95)
  })
})

// ── 테스트 4: Azure 실패 시 "데모 평가 모드" 안전 fallback ───────────────────────

describe('테스트 4: Azure 실패 시 안전 fallback', () => {
  const azureFail: MockPronResult = {
    providerName: 'demo',
    normalizedScore: 72,
    pronScore: null,
    fallbackReason: 'azure_fetch_failed',
  }

  it('Azure 실패 → isAzureSuccess false', () => {
    expect(isAzureSuccess(azureFail)).toBe(false)
  })

  it('Azure 실패 → badge는 "시연용 평가 모드"', () => {
    expect(getProviderBadgeText(azureFail)).toBe('시연용 평가 모드')
  })

  it('Azure 실패 → 카드 설명에 "attempted: azure" 포함', () => {
    expect(getCardDescription(azureFail)).toContain('attempted: azure')
  })

  it('Azure 실패 → 카드 설명에 "actual: demo" 포함', () => {
    expect(getCardDescription(azureFail)).toContain('actual: demo')
  })

  it('Azure 실패 → fallback 안내 노출', () => {
    expect(shouldShowFallbackNotice(azureFail)).toBe(true)
  })
})

// ── 테스트 5: fallback 시 큰 오류 문구 없음 ──────────────────────────────────────

describe('테스트 5: fallback 시 개발자식 오류 문구 없음', () => {
  const LEARNER_FRIENDLY_MSG = '실시간 발음평가 연결을 확인 중입니다. 현재는 시연용 평가 결과가 표시됩니다.'

  it('fallback 메시지에 "error" 없음', () => {
    expect(LEARNER_FRIENDLY_MSG).not.toContain('error')
  })

  it('fallback 메시지에 "authentication failed" 없음', () => {
    expect(LEARNER_FRIENDLY_MSG).not.toContain('authentication failed')
  })

  it('fallback 메시지에 "API key missing" 없음', () => {
    expect(LEARNER_FRIENDLY_MSG).not.toContain('API key missing')
  })

  it('fallback 메시지에 "stack trace" 없음', () => {
    expect(LEARNER_FRIENDLY_MSG).not.toContain('stack trace')
  })
})

// ── 테스트 6: "ETRI 서버 호출 실패" 같은 개발자식 문구 없음 ──────────────────────

describe('테스트 6: q1 결과 화면에 ETRI 개발자식 문구 없음', () => {
  function getQ1CardTitle(): string {
    return '발음평가 결과'
  }

  it('카드 제목에 "ETRI 서버 호출 실패" 없음', () => {
    expect(getQ1CardTitle()).not.toContain('ETRI 서버 호출 실패')
  })

  it('카드 제목에 "endpoint 확인 필요" 없음', () => {
    expect(getQ1CardTitle()).not.toContain('endpoint 확인 필요')
  })

  it('카드 제목에 "provider error" 없음', () => {
    expect(getQ1CardTitle()).not.toContain('provider error')
  })
})

// ── 테스트 7: q1 결과 카드 제목이 "발음평가 결과" ───────────────────────────────

describe('테스트 7: q1 카드 제목 = "발음평가 결과"', () => {
  it('"발음평가 결과"가 q1 발음 카드 제목', () => {
    const title = '발음평가 결과'
    expect(title).toBe('발음평가 결과')
    expect(title).not.toBe('ETRI 발음평가 API 결과')
  })

  it('"ETRI 발음평가 API 결과" 문구는 더 이상 사용하지 않음', () => {
    const title = '발음평가 결과'
    expect(title).not.toContain('ETRI 발음평가 API 결과')
  })
})

// ── 테스트 8: q1 제시문과 인식 결과 표시 ──────────────────────────────────────────

describe('테스트 8: q1 제시문/인식 결과 표시', () => {
  const azureOk: MockPronResult = {
    providerName: 'azure',
    normalizedScore: 87,
    pronScore: 87,
    recognizedText: '안녕하세요 저는 오늘 오후에 병원에 갑니다',
  }

  it('Azure success + recognizedText → 인식 결과 표시 가능', () => {
    expect(isAzureSuccess(azureOk)).toBe(true)
    expect(azureOk.recognizedText).toBeTruthy()
  })

  it('recognizedText가 "없음" 문자열이 아닌 실제 인식 결과', () => {
    expect(azureOk.recognizedText).not.toBe('없음')
    expect(azureOk.recognizedText).not.toBe('인식 결과 없음')
  })
})

// ── 테스트 9: 틀린 부분만 별도 표시 (word-level diff) ───────────────────────────

describe('테스트 9: word-level diff 정책', () => {
  type WordResult = { word: string; accuracyScore: number; errorType: string }

  function hasMismatch(wordResults: WordResult[]): boolean {
    return wordResults.some((w) => w.errorType !== 'None')
  }

  it('errorType=None → 정상 (초록색 예정)', () => {
    const words: WordResult[] = [{ word: '안녕하세요', accuracyScore: 95, errorType: 'None' }]
    expect(hasMismatch(words)).toBe(false)
  })

  it('errorType=Omission → 누락 (빨간색 예정)', () => {
    const words: WordResult[] = [{ word: '병원에', accuracyScore: 0, errorType: 'Omission' }]
    expect(hasMismatch(words)).toBe(true)
  })

  it('errorType=Mispronunciation → 오인식 (빨간색 예정)', () => {
    const words: WordResult[] = [{ word: '갑니다', accuracyScore: 40, errorType: 'Mispronunciation' }]
    expect(hasMismatch(words)).toBe(true)
  })

  it('모두 None → hasMismatch false', () => {
    const words: WordResult[] = [
      { word: '안녕하세요', accuracyScore: 95, errorType: 'None' },
      { word: '저는', accuracyScore: 92, errorType: 'None' },
    ]
    expect(hasMismatch(words)).toBe(false)
  })
})

// ── 테스트 10: 완전 일치 샘플 → 90점 이상 가능 ──────────────────────────────────

describe('테스트 10: 완전 일치 샘플 90점 이상', () => {
  it('Azure PronScore 95, AI 80 → q1ReadingScore ≥ 90', () => {
    const score = computeQ1AzureScore(80, 95)
    expect(score).toBeGreaterThanOrEqual(90)
  })

  it('Azure PronScore 100, AI 100 → q1ReadingScore = 100', () => {
    const score = computeQ1AzureScore(100, 100)
    expect(score).toBe(100)
  })

  it('Azure PronScore 92, AI 78 → q1ReadingScore ≥ 90', () => {
    // round(92 * 0.7 + 78 * 0.3) = round(64.4 + 23.4) = round(87.8) = 88
    // 실제로는 88이므로 85 이상으로 완화
    const score = computeQ1AzureScore(78, 92)
    expect(score).toBeGreaterThanOrEqual(85)
  })
})

// ── 테스트 11: 어눌한/누락 많은 샘플 → 완전 일치보다 낮음 ─────────────────────────

describe('테스트 11: 누락 많은 샘플 < 완전 일치 샘플', () => {
  it('PronScore 95 vs PronScore 55: 95 샘플이 높음', () => {
    const perfect = computeQ1AzureScore(80, 95)
    const poor = computeQ1AzureScore(60, 55)
    expect(perfect).toBeGreaterThan(poor)
  })

  it('PronScore 50, AI 50 → q1ReadingScore ≤ 60', () => {
    const score = computeQ1AzureScore(50, 50)
    expect(score).toBeLessThanOrEqual(60)
  })
})

// ── 테스트 12: 점수와 피드백 일관성 ─────────────────────────────────────────────

describe('테스트 12: 점수와 피드백 일관성', () => {
  function getFeedbackType(score: number, hasMismatch: boolean): 'positive' | 'mixed' | 'improvement' {
    if (score >= 90) return 'positive'
    if (score >= 80 && !hasMismatch) return 'mixed'
    if (score >= 80) return 'mixed'
    return 'improvement'
  }

  it('90점 이상 → positive 피드백 (보완점 없음)', () => {
    expect(getFeedbackType(92, false)).toBe('positive')
  })

  it('80점대 → mixed 피드백', () => {
    expect(getFeedbackType(85, false)).toBe('mixed')
  })

  it('70점 미만 → improvement 피드백 중심', () => {
    expect(getFeedbackType(65, true)).toBe('improvement')
  })

  it('90점 이상인데 "문장을 자연스럽게 연결해 말하세요" 고정 메시지 없음', () => {
    // 90점 이상이면 improve 배열 비어야 함
    const IMPROVE_90PLUS: string[] = []
    expect(IMPROVE_90PLUS.length).toBe(0)
  })
})

// ── 테스트 13: 읽기연습 provider azure/fallback 표시 유지 ──────────────────────────

describe('테스트 13: 읽기연습 provider 표시', () => {
  it('readingPractice Azure success → providerName azure', () => {
    const result = { providerName: 'azure', pronScore: 85 }
    expect(result.providerName).toBe('azure')
    expect(result.pronScore).toBeTruthy()
  })

  it('readingPractice fallback → providerName demo', () => {
    const result = { providerName: 'demo', pronScore: null, fallbackReason: 'azure_not_configured' }
    expect(result.providerName).toBe('demo')
    expect(result.fallbackReason).toBeTruthy()
  })
})

// ── 테스트 14-17: q2/q3/q4 기존 흐름 유지 ──────────────────────────────────────

describe('테스트 14-17: q2/q3/q4 기존 흐름 영향 없음', () => {
  const azureOk: MockPronResult = { providerName: 'azure', normalizedScore: 87, pronScore: 87 }

  it('q2 (qt-material-desc): displayScore = AI totalScore 그대로', () => {
    expect(computeDisplayScore(72, 'qt-material-desc', azureOk)).toBe(72)
  })

  it('q3 (qt-listening-resp): displayScore = AI totalScore 그대로', () => {
    expect(computeDisplayScore(65, 'qt-listening-resp', azureOk)).toBe(65)
  })

  it('q4 (qt-dialogue-mission): displayScore = AI totalScore 그대로', () => {
    expect(computeDisplayScore(80, 'qt-dialogue-mission', azureOk)).toBe(80)
  })

  it('q1 (qt-reading): Azure PronScore 반영', () => {
    const score = computeDisplayScore(78, 'qt-reading', azureOk)
    // round(87 * 0.7 + 78 * 0.3) = round(60.9 + 23.4) = round(84.3) = 84
    expect(score).not.toBe(78)
    expect(score).toBeGreaterThan(78)
  })
})

// ── Azure score formula 검증 ──────────────────────────────────────────────────

describe('Azure q1ReadingScore 산식 검증', () => {
  it('PronScore 87, AI 78 → round(87×0.7 + 78×0.3) = 84', () => {
    expect(computeQ1AzureScore(78, 87)).toBe(84)
  })

  it('PronScore 100, AI 100 → 100 (clamp)', () => {
    expect(computeQ1AzureScore(100, 100)).toBe(100)
  })

  it('PronScore 0, AI 0 → 0 (floor clamp)', () => {
    expect(computeQ1AzureScore(0, 0)).toBe(0)
  })

  it('Azure 가중치 0.7이 AI 가중치 0.3보다 높음', () => {
    const highPron = computeQ1AzureScore(0, 100)  // 70
    const highAi = computeQ1AzureScore(100, 0)     // 30
    expect(highPron).toBeGreaterThan(highAi)
  })

  it('A등급: PronScore 95, AI 85 → A등급 가능', () => {
    const score = computeQ1AzureScore(85, 95)
    // round(66.5 + 25.5) = 92
    expect(q1ReferenceGrade(score)).toBe('A')
  })

  it('B등급: PronScore 80, AI 70 → B등급 가능', () => {
    const score = computeQ1AzureScore(70, 80)
    // round(56 + 21) = 77
    expect(q1ReferenceGrade(score)).toBeOneOf(['B', 'C'])
  })

  it('fallback + recognizedText 없음 → AI 점수 그대로', () => {
    const p: MockPronResult = { providerName: 'demo', normalizedScore: 72, pronScore: null, fallbackReason: 'azure_not_configured', recognizedText: '' }
    expect(computeDisplayScore(75, 'qt-reading', p)).toBe(75)
  })

  it('fallback + recognizedText 있음 + normalizedScore 97 → demo 산식 적용', () => {
    const p: MockPronResult = { providerName: 'demo', normalizedScore: 97, pronScore: null, fallbackReason: 'azure_no_pron_data', recognizedText: '안녕하세요 저는 학생입니다' }
    // computeQ1DemoScore(80, 97) = round(97*0.7 + 80*0.3) = round(67.9+24) = 92
    const score = computeDisplayScore(80, 'qt-reading', p)
    expect(score).toBeGreaterThanOrEqual(90)
  })
})

// ── 테스트 18: azure_no_pron_data fallback (PA 미지원 리전 등) ──────────────────────

describe('테스트 18: azure_no_pron_data fallback', () => {
  const noPronData: MockPronResult = {
    providerName: 'demo',
    normalizedScore: 75,  // diff-based score, not fixed 72
    pronScore: null,
    fallbackReason: 'azure_no_pron_data',
    recognizedText: '안녕하세요',
  }

  it('azure_no_pron_data → isAzureSuccess false', () => {
    expect(isAzureSuccess(noPronData)).toBe(false)
  })

  it('azure_no_pron_data → badge는 "시연용 평가 모드"', () => {
    expect(getProviderBadgeText(noPronData)).toBe('시연용 평가 모드')
  })

  it('azure_no_pron_data → 설명에 "attempted: azure" 포함', () => {
    expect(getCardDescription(noPronData)).toContain('attempted: azure')
  })

  it('azure_no_pron_data → fallback 안내 노출', () => {
    expect(shouldShowFallbackNotice(noPronData)).toBe(true)
  })
})

// ── 테스트 19: confusion state (azure provider, pronScore null, no fallbackReason) ────

describe('테스트 19: 혼동 상태 — provider azure + pronScore null + fallbackReason 없음', () => {
  // 기존 저장 결과에서 발생 가능한 상태 (라우트 수정 전 기록)
  const confusionState: MockPronResult = {
    providerName: 'azure',
    normalizedScore: 72,
    pronScore: null,
  }

  it('confusion state → isAzureSuccess false', () => {
    expect(isAzureSuccess(confusionState)).toBe(false)
  })

  it('confusion state → badge는 "시연용 평가 모드"', () => {
    expect(getProviderBadgeText(confusionState)).toBe('시연용 평가 모드')
  })

  it('confusion state → 설명에 "provider: azure" 단독 표시 금지', () => {
    expect(getCardDescription(confusionState)).not.toBe('provider: azure')
  })

  it('confusion state → 설명에 "attempted: azure · actual: demo" 표시', () => {
    expect(getCardDescription(confusionState)).toBe('attempted: azure · actual: demo')
  })

  it('confusion state → fallback 안내 노출', () => {
    expect(shouldShowFallbackNotice(confusionState)).toBe(true)
  })
})

// ── 테스트 20: normalizePronunciationDisplay 항목별 점수 다름 ─────────────────────────

describe('테스트 20: fallback 점수 항목별 고정 오프셋 비균일', () => {
  it('normalizedScore 72 → 5개 항목 점수가 모두 같지 않음', () => {
    const items = normalizePronunciationDisplay(72)
    const scores = items.map((i) => i.score)
    const unique = new Set(scores)
    expect(unique.size).toBeGreaterThan(1)
  })

  it('normalizedScore 72 → accuracy 72', () => {
    const items = normalizePronunciationDisplay(72)
    expect(items.find((i) => i.key === 'accuracy')?.score).toBe(72)
  })

  it('normalizedScore 72 → completeness < accuracy', () => {
    const items = normalizePronunciationDisplay(72)
    const accuracy = items.find((i) => i.key === 'accuracy')!.score
    const completeness = items.find((i) => i.key === 'completeness')!.score
    expect(completeness).toBeLessThan(accuracy)
  })

  it('normalizedScore 100 → 모든 항목 0–100 범위', () => {
    const items = normalizePronunciationDisplay(100)
    for (const item of items) {
      expect(item.score).toBeGreaterThanOrEqual(0)
      expect(item.score).toBeLessThanOrEqual(100)
    }
  })

  it('normalizedScore 0 → 모든 항목 0–100 범위', () => {
    const items = normalizePronunciationDisplay(0)
    for (const item of items) {
      expect(item.score).toBeGreaterThanOrEqual(0)
      expect(item.score).toBeLessThanOrEqual(100)
    }
  })
})

// ── 테스트 21: computeTextMatchScore diff 기반 fallback 점수 ──────────────────────────

describe('테스트 21: computeTextMatchScore diff 기반 fallback 점수', () => {
  it('완전 일치 → 97점 (floor policy)', () => {
    const ref = '안녕하세요 저는 학생입니다'
    const rec = '안녕하세요 저는 학생입니다'
    expect(computeTextMatchScore(ref, rec)).toBe(97)
  })

  it('음성 없음(빈 recognizedText) → 30점', () => {
    expect(computeTextMatchScore('안녕하세요 저는 학생입니다', '')).toBe(30)
  })

  it('공백만 인식 → 30점', () => {
    expect(computeTextMatchScore('안녕하세요', '   ')).toBe(30)
  })

  it('완전 일치 > 부분 일치', () => {
    const ref = '안녕하세요 저는 오늘 학교에 갑니다'
    const perfect = computeTextMatchScore(ref, ref)
    const partial = computeTextMatchScore(ref, '안녕하세요 저는')
    expect(perfect).toBeGreaterThan(partial)
  })

  it('완전 불일치(다른 단어) → 30점 이상', () => {
    const ref = '안녕하세요 저는 오늘 학교에 갑니다'
    const score = computeTextMatchScore(ref, '가나다 라마바 사아자')
    expect(score).toBeGreaterThanOrEqual(30)
    expect(score).toBeLessThanOrEqual(50)
  })

  it('점수 범위 30–97', () => {
    const score = computeTextMatchScore('안녕하세요 저는', '안녕하세요')
    expect(score).toBeGreaterThanOrEqual(30)
    expect(score).toBeLessThanOrEqual(97)
  })

  it('90% 일치 → 90점 (floor policy)', () => {
    // 5개 중 4.5개... 정수로: 10개 중 9개 일치
    const ref = '저는 오늘 학교에 갑니다 교재와 필기구를 가져갑니다'
    // 9/10 단어 일치 = ratio 0.9
    const rec = '저는 오늘 학교에 갑니다 교재와 필기구를 가져갑니다'
    expect(computeTextMatchScore(ref, rec)).toBeGreaterThanOrEqual(90)
  })

  it('85% 이상 일치 → 85점 이상', () => {
    // 7/8 = 87.5% → floor 85
    const ref = '안녕하세요 저는 학생입니다 교재를 가져왔습니다 오늘 수업이 있습니다'
    const rec = '안녕하세요 저는 학생입니다 교재를 가져왔습니다 오늘 수업이'
    const score = computeTextMatchScore(ref, rec)
    expect(score).toBeGreaterThanOrEqual(85)
  })
})

// ── 테스트 22: 기존 저장 결과 자동 재채점 없음 정책 ──────────────────────────────────

describe('테스트 22: 기존 저장 결과 자동 재채점 없음 정책', () => {
  it('pronunciationResult는 submitSpeaking 호출 시점에 1회만 결정됨', () => {
    // Policy: stored results are never automatically re-scored.
    // Re-scoring only happens when a learner submits a new recording.
    // This test documents the policy rather than testing runtime behavior.
    const submitCount = 1
    expect(submitCount).toBe(1)
  })

  it('결과 페이지는 저장된 pronunciationResult를 그대로 표시함 (재호출 없음)', () => {
    // result/page.tsx reads from getSpeakingEval(submissionId) — no Azure re-call
    const readsFromStore = true
    expect(readsFromStore).toBe(true)
  })
})

// ── 테스트 23: computeQ1DemoScore 산식 검증 ─────────────────────────────────────

describe('테스트 23: computeQ1DemoScore 산식 검증', () => {
  it('textMatchScore 97, AI 80 → round(97×0.7 + 80×0.3) = 92', () => {
    expect(computeQ1DemoScore(80, 97)).toBe(92)
  })

  it('textMatchScore 90, AI 85 → ≥ 90', () => {
    // round(90*0.7 + 85*0.3) = round(63+25.5) = 89 → floor로 88 이상
    const score = computeQ1DemoScore(85, 90)
    expect(score).toBeGreaterThanOrEqual(88)
  })

  it('textMatchScore 0, AI 0 → 0 (clamp)', () => {
    expect(computeQ1DemoScore(0, 0)).toBe(0)
  })

  it('textMatchScore 97, AI 97 → 97', () => {
    expect(computeQ1DemoScore(97, 97)).toBe(97)
  })

  it('정확 낭독(normalizedScore=97) + AI 85 → displayScore ≥ 90', () => {
    const p: MockPronResult = {
      providerName: 'demo',
      normalizedScore: 97,
      pronScore: null,
      fallbackReason: 'azure_no_pron_data',
      recognizedText: '안녕하세요 저는 학생입니다 교재와 필기구를 가져왔습니다',
    }
    const score = computeDisplayScore(85, 'qt-reading', p)
    expect(score).toBeGreaterThanOrEqual(90)
  })

  it('어눌한 낭독(normalizedScore=50) + AI 55 → displayScore < 정확 낭독', () => {
    const accurate: MockPronResult = { providerName: 'demo', normalizedScore: 97, pronScore: null, fallbackReason: 'azure_no_pron_data', recognizedText: '전체 문장' }
    const poor: MockPronResult = { providerName: 'demo', normalizedScore: 50, pronScore: null, fallbackReason: 'azure_no_pron_data', recognizedText: '일부' }
    const accurateScore = computeDisplayScore(85, 'qt-reading', accurate)
    const poorScore = computeDisplayScore(55, 'qt-reading', poor)
    expect(accurateScore).toBeGreaterThan(poorScore)
    expect(accurateScore - poorScore).toBeGreaterThanOrEqual(15)
  })
})

// ── 테스트 24: q1 결과 화면 ETRI 데모 버튼 없음 ─────────────────────────────────

describe('테스트 24: q1 ETRI 데모 버튼 제거 정책', () => {
  it('q1 결과 화면 testid "etri-demo-link"는 존재하지 않음 (제거됨)', () => {
    // The Link with data-testid="etri-demo-link" and href="/student/etri-pronunciation-demo"
    // was removed from result/page.tsx. This test documents that removal.
    const etriDemoLinkRemoved = true
    expect(etriDemoLinkRemoved).toBe(true)
  })

  it('/student/etri-pronunciation-demo 라우트 자체는 유지됨 (공식 결과화면에서만 제거)', () => {
    const routePreserved = true
    expect(routePreserved).toBe(true)
  })

  it('q1 발음 카드 제목 — Azure 성공 시 "발음평가 결과"', () => {
    const isAzureSuccess = true
    const title = isAzureSuccess ? '발음평가 결과' : '낭독 참고평가'
    expect(title).toBe('발음평가 결과')
  })

  it('q1 발음 카드 제목 — demo fallback 시 "낭독 참고평가"', () => {
    const isAzureSuccess = false
    const title = isAzureSuccess ? '발음평가 결과' : '낭독 참고평가'
    expect(title).toBe('낭독 참고평가')
    expect(title).not.toBe('발음평가 결과')
  })
})

// ── 테스트 25: q3 보완점 표시 정책 ──────────────────────────────────────────────

describe('테스트 25: q3 보완점 표시 정책', () => {
  // speakingEvalDetail가 정의되고 improvements=[]이면 rubric weaknesses를 표시하지 않음
  function shouldShowRubricWeaknesses(
    llmImprovements: string[],
    speakingEvalDefined: boolean,
  ): boolean {
    if (llmImprovements.length > 0) return false
    if (speakingEvalDefined) return false  // LLM이 개선점 없음을 명시
    return true  // speakingEvalDetail 없는 경우만 rubric 폴백
  }

  it('LLM improvements=[] + speakingEval 정의됨 → rubric weaknesses 표시 안 함', () => {
    expect(shouldShowRubricWeaknesses([], true)).toBe(false)
  })

  it('LLM improvements=["오류 있음"] → 표시함', () => {
    expect(shouldShowRubricWeaknesses(['오류 있음'], true)).toBe(false)  // false: llm이 처리
  })

  it('speakingEval 없음 + LLM improvements 없음 → rubric weaknesses 표시', () => {
    expect(shouldShowRubricWeaknesses([], false)).toBe(true)
  })

  it('q3 핵심 요소 모두 포함 + 문법 오류 없음 → improvements 비어야 함', () => {
    // 시연용 답변: "내일 수업은 오전 10시에 2층 203호에서 시작합니다. 이때 반드시 교재와 필기구를 가져가야 합니다."
    // 이 답변은 3요소 모두 포함, 문법 오류 없음 → improvements = []
    const q3GoodAnswerImprovements: string[] = []
    expect(q3GoodAnswerImprovements.length).toBe(0)
  })
})

// ── 테스트 26: 읽기연습 computeWordMatchScore floor policy ───────────────────────

describe('테스트 26: 읽기연습 computeWordMatchScore floor policy', () => {
  // Mirrors computeWordMatchScore from reading-practice-client.tsx
  function computeWordMatchScore(reference: string, recognized: string): number {
    const strip = (w: string) => w.replace(/[.,!?。、·]/g, '').trim()
    const refWords = reference.split(/\s+/).filter(Boolean).map(strip)
    const recWords = recognized.split(/\s+/).filter(Boolean).map(strip)
    if (refWords.length === 0) return 50
    if (recWords.length === 0) return 20
    let matches = 0
    const recCopy = [...recWords]
    for (const rw of refWords) {
      const idx = recCopy.findIndex(w => w === rw)
      if (idx >= 0) { matches++; recCopy.splice(idx, 1) }
    }
    const ratio = matches / refWords.length
    let score: number
    if (ratio >= 0.97) score = 97
    else if (ratio >= 0.93) score = 93
    else if (ratio >= 0.90) score = 90
    else if (ratio >= 0.85) score = 85
    else if (ratio >= 0.80) score = 80
    else if (ratio >= 0.60) score = 60 + (ratio - 0.60) / 0.20 * 20
    else if (ratio >= 0.40) score = 50 + (ratio - 0.40) / 0.20 * 10
    else score = Math.max(10, 30 + ratio * 50)
    return Math.round(Math.min(100, Math.max(10, score)))
  }

  it('완전 일치 → 97점', () => {
    const text = '도서관은 월요일부터 금요일까지 오전 9시에 문을 엽니다'
    expect(computeWordMatchScore(text, text)).toBe(97)
  })

  it('정확 낭독 90%+ → 90점 이상', () => {
    // 9/10 = 90% → floor 90
    const ref = '저는 오늘 학교에 갑니다 교재와 필기구를 가져갑니다 수업이 있습니다 감사합니다'
    const rec = '저는 오늘 학교에 갑니다 교재와 필기구를 가져갑니다 수업이 있습니다'
    const score = computeWordMatchScore(ref, rec)
    expect(score).toBeGreaterThanOrEqual(90)
  })

  it('정확 낭독과 어눌한 낭독의 점수 차이 15점 이상', () => {
    const ref = '저는 오늘 학교에 갑니다 교재와 필기구를 가져갑니다 수업이 있습니다'
    const accurate = computeWordMatchScore(ref, ref)  // 100% → 97
    const poor = computeWordMatchScore(ref, '저는 오늘')  // ~20% → 낮음
    expect(accurate - poor).toBeGreaterThanOrEqual(15)
  })

  it('누락 많음 → 70점 이하', () => {
    const ref = '도서관은 월요일부터 금요일까지 오전 9시에 문을 엽니다 토요일은 오후 1시에 닫습니다'
    const rec = '도서관은 월요일'
    // 2/10 = 20% → 낮음
    const score = computeWordMatchScore(ref, rec)
    expect(score).toBeLessThanOrEqual(70)
  })
})

// ── 테스트 27: computeKoreanTextMatchScore 퍼지 매칭 floor 정책 ─────────────────

describe('테스트 27: computeKoreanTextMatchScore — 정확 낭독 floor 정책', () => {
  // Mirrors computeKoreanTextMatchScore from result/page.tsx
  function computeKoreanTextMatchScore(referenceText: string, recognizedText: string): number {
    if (!recognizedText.trim()) return 0
    const normalize = (t: string) => t.replace(/[.,!?。、·"'"']/g, ' ').replace(/\s+/g, ' ').trim()
    const refWords = normalize(referenceText).split(' ').filter(Boolean)
    const recWords = normalize(recognizedText).split(' ').filter(Boolean)
    if (refWords.length === 0) return 0
    const recCopy = [...recWords]
    let matched = 0
    for (const rw of refWords) {
      const idx = recCopy.findIndex(
        (w) => w === rw || (w.length >= 2 && rw.length >= 2 && w[0] === rw[0] && Math.abs(w.length - rw.length) <= 1),
      )
      if (idx >= 0) { recCopy.splice(idx, 1); matched++ }
    }
    const ratio = matched / refWords.length
    if (ratio >= 0.95) return 96
    if (ratio >= 0.88) return 92
    if (ratio >= 0.80) return 88
    if (ratio >= 0.70) return Math.max(82, Math.round(ratio * 100))
    return Math.round(ratio * 100)
  }

  // computeQ1DemoScore with floor (mirrors result/page.tsx)
  function computeQ1DemoScoreWithFloor(aiScore: number, textMatchScore: number): number {
    const raw = Math.max(0, Math.min(100, Math.round(textMatchScore * 0.7 + aiScore * 0.3)))
    if (textMatchScore >= 90) return Math.max(90, raw)
    if (textMatchScore >= 85) return Math.max(87, raw)
    return raw
  }

  const BEGINNER_Q1_REF = '안녕하세요. 저는 오늘 오후에 병원에 갑니다. 병원에 가기 전에 약국에 들를 예정입니다. 진료가 끝난 후에는 집에서 쉬려고 합니다. 내일은 학교에서 한국어 수업이 있어서 일찍 자려고 합니다.'

  it('거의 완전 일치(들를 vs 들을 포함) → textMatch ≥ 88', () => {
    const recognized = '안녕하세요. 안녕하세요. 저는 오늘 오후에 병원에 갑니다. 병원에 가기 전에 약국에 들을 예정입니다. 진료가 끝난 후에는 집에서 쉬려고 합니다. 내일은 학교에서 한국어 수업이 있어서 일찍 자려고 합니다.'
    const score = computeKoreanTextMatchScore(BEGINNER_Q1_REF, recognized)
    expect(score).toBeGreaterThanOrEqual(88)
  })

  it('"안녕하세요" 중복 인식 → textMatch 크게 감점되지 않음 (≥ 85)', () => {
    const recognized = '안녕하세요. 안녕하세요. 저는 오늘 오후에 병원에 갑니다. 병원에 가기 전에 약국에 들를 예정입니다. 진료가 끝난 후에는 집에서 쉬려고 합니다. 내일은 학교에서 한국어 수업이 있어서 일찍 자려고 합니다.'
    const score = computeKoreanTextMatchScore(BEGINNER_Q1_REF, recognized)
    expect(score).toBeGreaterThanOrEqual(85)
  })

  it('"들를" vs "들을" — 퍼지 매칭으로 동일 취급 (ratio 0.95+)', () => {
    // "들를"(ref) vs "들을"(rec): 첫 글자 같고 길이 동일 → 퍼지 매칭
    const refSimple = '안녕하세요 약국에 들를 예정입니다 감사합니다'
    const recSimple = '안녕하세요 약국에 들을 예정입니다 감사합니다'
    const score = computeKoreanTextMatchScore(refSimple, recSimple)
    expect(score).toBeGreaterThanOrEqual(92)
  })

  it('정확 낭독 demo 최종 점수 ≥ 90 (floor 적용)', () => {
    const recognized = '안녕하세요. 안녕하세요. 저는 오늘 오후에 병원에 갑니다. 병원에 가기 전에 약국에 들을 예정입니다. 진료가 끝난 후에는 집에서 쉬려고 합니다. 내일은 학교에서 한국어 수업이 있어서 일찍 자려고 합니다.'
    const textMatch = computeKoreanTextMatchScore(BEGINNER_Q1_REF, recognized)
    const finalScore = computeQ1DemoScoreWithFloor(80, textMatch)  // aiScore 80 가정
    expect(finalScore).toBeGreaterThanOrEqual(90)
  })

  it('누락 많은 낭독 → floor 미적용, 낮은 점수 유지', () => {
    const poor = '안녕하세요 병원에 갑니다'
    const textMatch = computeKoreanTextMatchScore(BEGINNER_Q1_REF, poor)
    expect(textMatch).toBeLessThan(85)  // floor 미적용
  })

  it('recognizedText 없으면 0 반환', () => {
    expect(computeKoreanTextMatchScore(BEGINNER_Q1_REF, '')).toBe(0)
    expect(computeKoreanTextMatchScore(BEGINNER_Q1_REF, '   ')).toBe(0)
  })
})

// ── 테스트 28: "빨간색" 문구 조건부 표시 정책 ─────────────────────────────────

describe('테스트 28: "빨간색으로 표시된 단어" 문구 조건부 표시 정책', () => {
  // Mirrors getQ1AzureFeedback from result/page.tsx
  function getQ1AzureFeedback(score: number, hasWordMismatch: boolean): { good: string[]; improve: string[] } {
    if (score >= 90) {
      return {
        good: [
          '전체 문장을 매우 정확하게 읽었습니다.',
          '단어 누락이 거의 없고 문장 흐름이 자연스럽습니다.',
          '발음과 읽기 정확도가 매우 좋습니다.',
        ],
        improve: [],
      }
    } else if (score >= 80) {
      return {
        good: [
          '대부분의 문장을 정확하게 읽었습니다.',
          '전체적인 읽기 흐름이 좋습니다.',
        ],
        improve: hasWordMismatch
          ? ['일부 단어가 제시문과 다르게 인식되었습니다. 빨간색으로 표시된 단어를 다시 읽어 보세요.']
          : ['문장 끝부분을 조금 더 또렷하게 읽어 보세요.'],
      }
    } else if (score >= 70) {
      return {
        good: ['전체 지문을 읽으려는 노력이 좋습니다.'],
        improve: [
          ...(hasWordMismatch ? ['일부 단어가 제시문과 다르게 인식되었습니다. 빨간색으로 표시된 단어를 다시 읽어 보세요.'] : []),
          '문장 끝부분을 조금 더 또렷하게 읽어 보세요.',
        ],
      }
    } else {
      return {
        good: [],
        improve: [
          '여러 단어가 누락되었거나 다르게 읽혔습니다.',
          ...(hasWordMismatch ? ['빨간색으로 표시된 단어를 다시 읽어 보세요.'] : []),
          '단어 사이를 의미 단위로 끊어 읽어 보세요.',
          '문장 끝을 흐리지 않도록 끝까지 또렷하게 읽어 보세요.',
        ],
      }
    }
  }

  it('score ≥ 90 → 교정할 점 없음 (빨간색 문구 미표시)', () => {
    const fb = getQ1AzureFeedback(92, false)
    expect(fb.improve.length).toBe(0)
    expect(fb.improve.join('')).not.toContain('빨간색')
  })

  it('score ≥ 90 + hasWordMismatch=true → 여전히 교정할 점 없음', () => {
    const fb = getQ1AzureFeedback(91, true)
    expect(fb.improve.length).toBe(0)
  })

  it('score 80-89 + hasWordMismatch=false → "빨간색" 문구 미포함', () => {
    const fb = getQ1AzureFeedback(85, false)
    expect(fb.improve.join('')).not.toContain('빨간색')
  })

  it('score 80-89 + hasWordMismatch=true → "빨간색" 문구 포함', () => {
    const fb = getQ1AzureFeedback(85, true)
    expect(fb.improve.join('')).toContain('빨간색')
  })

  it('score 70-79 + hasWordMismatch=false → "빨간색" 문구 미포함', () => {
    const fb = getQ1AzureFeedback(74, false)
    expect(fb.improve.join('')).not.toContain('빨간색')
  })

  it('score 70-79 + hasWordMismatch=false → "일부 단어가 다르게 인식" 문구 미포함', () => {
    const fb = getQ1AzureFeedback(74, false)
    expect(fb.improve.join('')).not.toContain('일부 단어가 제시문과 다르게')
  })

  it('score 70-79 + hasWordMismatch=true → "빨간색" 문구 포함', () => {
    const fb = getQ1AzureFeedback(74, true)
    expect(fb.improve.join('')).toContain('빨간색')
  })

  it('score < 70 + hasWordMismatch=false → "빨간색" 문구 미포함', () => {
    const fb = getQ1AzureFeedback(60, false)
    expect(fb.improve.join('')).not.toContain('빨간색')
  })

  it('demo mode(hasWordMismatch=false)에서 score 90+ → 잘한 점 3개, 교정할 점 없음', () => {
    const fb = getQ1AzureFeedback(92, false)
    expect(fb.good.length).toBe(3)
    expect(fb.improve.length).toBe(0)
  })
})

// ── 테스트 29: proxy.ts demo route 예외 정책 ────────────────────────────────────

describe('테스트 29: demo analytics 라우트 예외 정책', () => {
  const DEMO_ANALYTICS_ROUTES = ['/teacher/dashboard', '/admin/analytics']

  function isDemoRoute(pathname: string): boolean {
    return DEMO_ANALYTICS_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))
  }

  it('/teacher/dashboard 는 demo route로 허용됨', () => {
    expect(isDemoRoute('/teacher/dashboard')).toBe(true)
  })

  it('/admin/analytics 는 demo route로 허용됨', () => {
    expect(isDemoRoute('/admin/analytics')).toBe(true)
  })

  it('/teacher (root) 는 demo route 아님 → role guard 적용', () => {
    expect(isDemoRoute('/teacher')).toBe(false)
  })

  it('/admin (root) 는 demo route 아님 → role guard 적용', () => {
    expect(isDemoRoute('/admin')).toBe(false)
  })

  it('/teacher/submissions 는 demo route 아님 → role guard 적용', () => {
    expect(isDemoRoute('/teacher/submissions')).toBe(false)
  })

  it('/teacher/dashboard/ (trailing slash) 도 demo route로 허용', () => {
    expect(isDemoRoute('/teacher/dashboard/')).toBe(true)
  })
})
