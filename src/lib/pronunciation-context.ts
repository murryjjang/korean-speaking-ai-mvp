// v1.1 단계 19.13 [페이즈 1·2]: Azure Pronunciation 결과에서 LLM 입력 컨텍스트 생성.
//
// - Phase 1: 단어별 약점, fluency/accuracy/completeness 분리 점수
// - Phase 2: wordResults timing(offsetMs/durationMs)에서 pause 감지
//
// 입력 데이터가 부족할 때(non-Azure provider, 인식 실패 등) 모든 필드를 undefined로 반환해
// 호출부가 안전하게 분기할 수 있게 한다.

import type {
  PronunciationContext,
  PronunciationResult,
  SpeechFlowContext,
  AzureWordResult,
} from '@/src/types/providers'

// pause 임계치 — 보고서에 명시. Azure timing은 100ns→ms 변환 후 단위.
//
// v1.1 단계 19.13: 800ms / 1500ms로 시작.
// v1.1 단계 19.17: 500ms / 1000ms로 하향. 시연에서 "음...그...." 같은 명확한 어휘
//   탐색 멈춤이 800ms 미만이면 단계 19.16 시스템 프롬프트의 발화 흐름 블록 자체가
//   미포함되어 LLM이 멈춤을 인지하지 못하는 회귀 발생. 500ms는 한국어 자연 발화에서
//   어휘 탐색이 시작되는 지점으로 인지 가능. 잦은 트리거 우려는 시스템 프롬프트의
//   "한 턴 흐름 코멘트 최대 1회" 가드로 흡수.
export const PAUSE_SHORT_MS = 500
export const PAUSE_LONG_MS = 1000

// 단어 약점 임계 — Azure word-level AccuracyScore가 70 미만이면 LLM에 노출.
export const WEAK_WORD_THRESHOLD = 70

// LLM 컨텍스트가 폭주하지 않도록 약점/멈춤 노출 상한.
const MAX_WEAK_WORDS = 6
const MAX_PAUSES_PER_KIND = 4

export function buildPronunciationContext(
  pronunciation: PronunciationResult | null | undefined,
): PronunciationContext | undefined {
  if (!pronunciation) return undefined
  const overallAccuracy = pronunciation.accuracyScore ?? undefined
  const fluencyScore = pronunciation.fluencyScore ?? undefined
  const completenessScore = pronunciation.completenessScore ?? undefined

  const words = pronunciation.wordResults ?? []
  const weakWords = words
    .filter((w): w is AzureWordResult =>
      Boolean(w) && (w.errorType !== 'None' || w.accuracyScore < WEAK_WORD_THRESHOLD),
    )
    .sort((a, b) => a.accuracyScore - b.accuracyScore)
    .slice(0, MAX_WEAK_WORDS)
    .map((w) => ({ word: w.word, score: Math.round(w.accuracyScore), errorType: w.errorType }))

  if (
    overallAccuracy == null
    && fluencyScore == null
    && completenessScore == null
    && weakWords.length === 0
  ) {
    return undefined
  }

  return {
    overallAccuracy: overallAccuracy != null ? Math.round(overallAccuracy) : undefined,
    fluencyScore: fluencyScore != null ? Math.round(fluencyScore) : undefined,
    completenessScore: completenessScore != null ? Math.round(completenessScore) : undefined,
    weakWords: weakWords.length > 0 ? weakWords : undefined,
  }
}

// wordResults timing에서 pause 추출.
// Azure Word.Offset/Duration은 100-ns ticks → 이미 ms로 변환된 값(offsetMs/durationMs)을 사용.
export function buildSpeechFlowContext(
  pronunciation: PronunciationResult | null | undefined,
): SpeechFlowContext | undefined {
  if (!pronunciation) return undefined
  const words = pronunciation.wordResults ?? []
  if (words.length < 2) return undefined

  const longPauses: Array<{ afterWord: string; gapMs: number }> = []
  const shortPauses: Array<{ afterWord: string; gapMs: number }> = []

  for (let i = 1; i < words.length; i++) {
    const prev = words[i - 1]
    const curr = words[i]
    if (prev.offsetMs == null || prev.durationMs == null || curr.offsetMs == null) continue
    const prevEnd = prev.offsetMs + prev.durationMs
    const gap = curr.offsetMs - prevEnd
    if (gap >= PAUSE_LONG_MS) {
      longPauses.push({ afterWord: prev.word, gapMs: Math.round(gap) })
    } else if (gap >= PAUSE_SHORT_MS) {
      shortPauses.push({ afterWord: prev.word, gapMs: Math.round(gap) })
    }
  }

  // 전체 발화 길이 — 마지막 단어 종료 시점.
  const last = words[words.length - 1]
  const first = words[0]
  const totalDurationMs =
    last?.offsetMs != null && last?.durationMs != null && first?.offsetMs != null
      ? last.offsetMs + last.durationMs - first.offsetMs
      : undefined

  if (longPauses.length === 0 && shortPauses.length === 0 && totalDurationMs == null) {
    return undefined
  }

  return {
    totalDurationMs,
    longPauses: longPauses.slice(0, MAX_PAUSES_PER_KIND),
    shortPauses: shortPauses.slice(0, MAX_PAUSES_PER_KIND),
    longPauseCount: longPauses.length,
    shortPauseCount: shortPauses.length,
  }
}
