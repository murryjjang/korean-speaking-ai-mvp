'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

// Minimal Web Speech API types — Chrome/Edge expose webkitSpeechRecognition.
type RecognitionAlt = { transcript?: string; confidence?: number }
type RecognitionResult = { isFinal: boolean; 0?: RecognitionAlt; length: number }
type RecognitionResultList = { length: number; [i: number]: RecognitionResult }
interface RecognitionEvent {
  resultIndex: number
  results: RecognitionResultList
}
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: RecognitionEvent) => void) | null
  onerror: ((e: unknown) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

const stripWord = (w: string) =>
  w.replace(/[.,!?。、·"'\\(\\)\\[\\]]/g, '').toLowerCase().trim()

// Confidence floor for final results. Web Speech often returns 0 for interim,
// so we only filter when a positive confidence is reported. Loosened from 0.5
// to 0.3 (명세 23-c Phase 5) to keep low-confidence STT chunks from being
// dropped, which made the karaoke pointer feel jumpy.
const MIN_FINAL_CONFIDENCE = 0.3

interface KaraokeState {
  /** Last word the user is recognized as currently speaking (or just spoke). */
  currentWordIdx: number | null
  /** Highest word index considered already spoken / passed through. */
  passedThroughIdx: number
  /** null until the browser support check completes; true if SpeechRecognition is available. */
  supported: boolean | null
}

/**
 * Tracks a learner's reading position over a fixed reference word list.
 *
 * Two-pointer design:
 * - finalPointer is monotonic — only moves forward when a final SR result
 *   places us further along the reference. Anchors recovery so interim
 *   re-matches can never undo confirmed progress.
 * - interim re-matches each event from finalPointer, so a wrong interim
 *   guess can correct itself on the next chunk without permanent jumps.
 *
 * Adaptive lookahead: scales with passage length (8..16) so long passages
 * tolerate more drift; the last 5 words always look at the rest so STT
 * trailing noise doesn't strand the final words.
 */
export function useKaraokeTracking(
  referenceWords: string[],
  enabled: boolean,
): KaraokeState {
  const [currentWordIdx, setCurrentWordIdx] = useState<number | null>(null)
  const [passedThroughIdx, setPassedThroughIdx] = useState<number>(-1)
  // Browser feature check via useSyncExternalStore so SSR returns null and
  // client returns the actual support flag without a hydration mismatch.
  const supported = useSyncExternalStore(
    () => () => {},
    () => getSpeechRecognitionCtor() !== null,
    () => null,
  )
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const finalPointerRef = useRef(0)
  const stoppingRef = useRef(false)

  useEffect(() => {
    if (!enabled) return // Nothing to set up; no cleanup needed.

    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return
    if (referenceWords.length === 0) return

    const refStripped = referenceWords.map(stripWord)
    const baseLookahead = Math.max(8, Math.min(16, Math.ceil(refStripped.length * 0.2)))

    const sr = new Ctor()
    sr.lang = 'ko-KR'
    sr.continuous = true
    sr.interimResults = true

    // Match recWords against refStripped starting at startP. Returns the new
    // pointer (one past the last consumed reference word) and the index of
    // the most recently matched word (-1 if none).
    const matchWords = (recWords: string[], startP: number): { p: number; last: number } => {
      let p = startP
      let last = -1
      for (const rw of recWords) {
        if (!rw) continue
        const remaining = refStripped.length - p
        if (remaining <= 0) break
        // Within last 5 words: search the rest of the passage so STT noise
        // doesn't strand the final words.
        const lookahead = remaining <= 5 ? remaining : Math.min(remaining, baseLookahead)
        for (let off = 0; off < lookahead; off++) {
          if (refStripped[p + off] === rw) {
            p = p + off + 1
            last = p - 1
            break
          }
        }
      }
      return { p, last }
    }

    sr.onresult = (e: RecognitionEvent) => {
      let finalText = ''
      let interimText = ''
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i]
        const alt = r[0]
        if (!alt?.transcript) continue
        if (r.isFinal) {
          // Drop low-confidence finals so a misheard chunk can't permanently
          // jump the cursor. Treat unknown/zero confidence as acceptable
          // because Chrome often reports 0 even for normal results.
          const conf = alt.confidence
          if (typeof conf === 'number' && conf > 0 && conf < MIN_FINAL_CONFIDENCE) continue
          finalText += ' ' + alt.transcript
        } else {
          interimText += ' ' + alt.transcript
        }
      }

      const finalWords = finalText.split(/\s+/).filter(Boolean).map(stripWord)

      // Final pointer is monotonic; re-matching consumed words is a no-op.
      const finalRes = matchWords(finalWords, finalPointerRef.current)
      finalPointerRef.current = finalRes.p

      // 명세 23-c Phase 5: interim 결과로 pointer를 옮기지 않는다. interim은 STT가
      // 미확정 추측이므로 카라오케 포인터가 흔들려 보였다. final 결과만 사용해
      // 진행도와 현재 단어를 업데이트한다. (interimText는 의도적으로 무시.)
      void interimText

      const projectedP = finalRes.p
      const lastSpoken = finalRes.last >= 0 ? finalRes.last : projectedP - 1

      setPassedThroughIdx(projectedP - 1)
      setCurrentWordIdx(lastSpoken >= 0 ? lastSpoken : null)
    }

    sr.onerror = () => {
      // Recognition errors (no-speech, network) are non-fatal — let onend restart.
    }

    sr.onend = () => {
      // Auto-restart if still enabled and not in the middle of a teardown.
      if (!stoppingRef.current && recognitionRef.current === sr) {
        try { sr.start() } catch { /* noop */ }
      }
    }

    stoppingRef.current = false
    recognitionRef.current = sr
    finalPointerRef.current = 0
    try { sr.start() } catch { /* noop — already started or permission denied */ }

    return () => {
      stoppingRef.current = true
      if (recognitionRef.current === sr) recognitionRef.current = null
      try { sr.stop() } catch { /* noop */ }
      finalPointerRef.current = 0
      setCurrentWordIdx(null)
      setPassedThroughIdx(-1)
    }
  // referenceWords identity should be stable; consumer is expected to memoize.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  return { currentWordIdx, passedThroughIdx, supported }
}
