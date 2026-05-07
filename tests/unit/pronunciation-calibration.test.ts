import { describe, it, expect } from 'vitest'
import { calibrateEtriScore } from '@/src/lib/pronunciation-calibration'

// ── calibrateEtriScore ────────────────────────────────────────────────────────

describe('calibrateEtriScore — 기본 동작', () => {
  it('rawScore는 변경 없이 그대로 반환됨', () => {
    const result = calibrateEtriScore(2.53596)
    expect(result.rawScore).toBe(2.53596)
  })

  it('normalizedScore는 rawScore / 5 * 100 반올림과 동일', () => {
    const result = calibrateEtriScore(2.53596)
    // 2.53596 / 5 * 100 = 50.7192 → round → 51
    expect(result.normalizedScore).toBe(51)
  })

  it('calibrationStatus는 항상 "provisional"', () => {
    expect(calibrateEtriScore(2.53596).calibrationStatus).toBe('provisional')
    expect(calibrateEtriScore(3.0).calibrationStatus).toBe('provisional')
    expect(calibrateEtriScore(5.0).calibrationStatus).toBe('provisional')
  })

  it('calibrationVersion이 설정됨', () => {
    const result = calibrateEtriScore(3.0)
    expect(result.calibrationVersion).toBeTruthy()
    expect(result.calibrationVersion).toMatch(/v0\.\d+/)
  })

  it('note에 파일럿 안내 포함', () => {
    const result = calibrateEtriScore(2.53596)
    expect(result.note).toContain('파일럿')
  })
})

// ── calibratedScore 앵커 검증 ─────────────────────────────────────────────────

describe('calibrateEtriScore — 앵커 포인트', () => {
  it('rawScore 5.0 → calibratedScore 100', () => {
    expect(calibrateEtriScore(5.0).calibratedScore).toBe(100)
  })

  it('rawScore 0.0 → calibratedScore 0', () => {
    expect(calibrateEtriScore(0.0).calibratedScore).toBe(0)
  })

  it('rawScore 3.0 → calibratedScore 82', () => {
    expect(calibrateEtriScore(3.0).calibratedScore).toBe(82)
  })

  it('rawScore 4.0 → calibratedScore 93', () => {
    expect(calibrateEtriScore(4.0).calibratedScore).toBe(93)
  })

  it('rawScore 2.5 → calibratedScore 75', () => {
    expect(calibrateEtriScore(2.5).calibratedScore).toBe(75)
  })
})

// ── 실제 관측값 검증 ──────────────────────────────────────────────────────────

describe('calibrateEtriScore — 실제 관측 rawScore', () => {
  it('rawScore 2.53596 → calibratedScore 70점대 (보정 후 상향)', () => {
    const { calibratedScore, normalizedScore } = calibrateEtriScore(2.53596)
    // normalizedScore(단순 환산) 51보다 높아야 함 — 보정 효과
    expect(calibratedScore).toBeGreaterThan(normalizedScore)
    // 70점대 참고값
    expect(calibratedScore).toBeGreaterThanOrEqual(70)
    expect(calibratedScore).toBeLessThan(80)
  })

  it('rawScore 2.726668 → calibratedScore 70점대', () => {
    const { calibratedScore } = calibrateEtriScore(2.726668)
    expect(calibratedScore).toBeGreaterThanOrEqual(70)
    expect(calibratedScore).toBeLessThan(80)
  })

  it('rawScore 2.53596: normalizedScore=51, calibratedScore는 단순환산보다 높음', () => {
    const result = calibrateEtriScore(2.53596)
    expect(result.normalizedScore).toBe(51)
    expect(result.calibratedScore).toBeGreaterThan(51)
  })
})

// ── calibratedScore는 최종점수 자동 반영 대상이 아님 ─────────────────────────

describe('calibratedScore 최종점수 미반영 정책', () => {
  it('calibrationStatus="provisional" — 확정값 아님을 나타냄', () => {
    const result = calibrateEtriScore(3.5)
    expect(result.calibrationStatus).toBe('provisional')
    expect(result.calibrationStatus).not.toBe('validated')
  })

  it('rawScore와 calibratedScore는 별개 값', () => {
    const result = calibrateEtriScore(2.53596)
    expect(result.calibratedScore).not.toBe(result.rawScore)
  })

  it('normalizedScore와 calibratedScore는 별개 값 (보정 전/후 구분)', () => {
    // rawScore 2.53596: normalizedScore=51, calibratedScore > 51
    const result = calibrateEtriScore(2.53596)
    expect(result.normalizedScore).not.toBe(result.calibratedScore)
  })
})

// ── 경계값 처리 ───────────────────────────────────────────────────────────────

describe('calibrateEtriScore — 경계값', () => {
  it('rawScore 6(범위 초과) → calibratedScore 100으로 클램프', () => {
    expect(calibrateEtriScore(6).calibratedScore).toBe(100)
  })

  it('rawScore -1(범위 미만) → calibratedScore 0으로 클램프', () => {
    expect(calibrateEtriScore(-1).calibratedScore).toBe(0)
  })
})
