export type PronunciationCalibrationContext = {
  questionType?: string
  level?: string
  scriptLength?: number
  audioDurationSec?: number
  providerName?: string
  languageCode?: string
}

export type PronunciationCalibrationResult = {
  rawScore: number
  normalizedScore: number
  calibratedScore: number
  calibrationVersion: string
  calibrationStatus: 'uncalibrated' | 'provisional' | 'validated'
  note: string
}

// Piecewise linear mapping: ETRI rawScore (0–5) → calibrated 0–100.
// Anchors are provisional pilot estimates — collect native/learner/inaccurate
// speech samples and adjust before treating scores as definitive.
// Last updated: Phase 10-E-7 (2026-05-07).
const CALIBRATION_ANCHORS: Array<[number, number]> = [
  [0.0, 0],
  [1.0, 20],
  [1.5, 38],
  [2.0, 53],
  [2.5, 75],
  [3.0, 82],
  [3.5, 85],
  [4.0, 93],
  [4.5, 95],
  [5.0, 100],
]

function piecewiseLinear(x: number, anchors: Array<[number, number]>): number {
  if (x <= anchors[0][0]) return anchors[0][1]
  const last = anchors[anchors.length - 1]
  if (x >= last[0]) return last[1]
  for (let i = 0; i < anchors.length - 1; i++) {
    const [x0, y0] = anchors[i]
    const [x1, y1] = anchors[i + 1]
    if (x >= x0 && x <= x1) {
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0)
    }
  }
  return last[1]
}

/**
 * Apply provisional piecewise linear calibration to an ETRI rawScore (1–5 range).
 * Returns rawScore, normalizedScore (simple /5*100), and calibratedScore (calibrated).
 * calibrationStatus is always 'provisional' until validated via pilot sample collection.
 * Does NOT modify rawScore — it is preserved verbatim.
 */
export function calibrateEtriScore(
  rawScore: number,
  _context?: PronunciationCalibrationContext,
): PronunciationCalibrationResult {
  const normalizedScore = Math.min(100, Math.max(0, Math.round((rawScore / 5) * 100)))
  const calibratedScore = Math.min(100, Math.max(0, Math.round(piecewiseLinear(rawScore, CALIBRATION_ANCHORS))))

  return {
    rawScore,
    normalizedScore,
    calibratedScore,
    calibrationVersion: 'v0.1-pilot',
    calibrationStatus: 'provisional',
    note: '파일럿 샘플 수집 후 조정 필요. 최종 발음점수는 교수자 검토 후 확정됩니다.',
  }
}
