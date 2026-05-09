'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

// Minimal Web Speech API types — Chrome/Edge expose webkitSpeechRecognition.
type RecognitionAlt = { transcript?: string }
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
 * Why pointer-only forward matching:
 * - SpeechRecognition emits cumulative interim+final results; matching from a
 *   monotonic pointer prevents the highlight from jumping backwards on noisy
 *   interim updates.
 * - A small lookahead window (8 words) tolerates a missed/garbled word without
 *   stalling the karaoke advance.
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
  const pointerRef = useRef(0)
  const stoppingRef = useRef(false)

  useEffect(() => {
    if (!enabled) return // Nothing to set up; no cleanup needed.

    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return
    if (referenceWords.length === 0) return

    const refStripped = referenceWords.map(stripWord)
    const sr = new Ctor()
    sr.lang = 'ko-KR'
    sr.continuous = true
    sr.interimResults = true

    sr.onresult = (e: RecognitionEvent) => {
      let combined = ''
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i]
        const alt = r[0]
        if (alt?.transcript) combined += ' ' + alt.transcript
      }
      const recWords = combined.split(/\s+/).filter(Boolean).map(stripWord)
      let p = pointerRef.current
      let last = -1
      for (const rw of recWords) {
        if (!rw) continue
        // Within last 5 words: expand lookahead to cover the rest of the
        // reference so STT noise doesn't strand the final words.
        const remaining = refStripped.length - p
        const lookahead = remaining <= 5 ? remaining : 8
        for (let off = 0; off < lookahead && p + off < refStripped.length; off++) {
          if (refStripped[p + off] === rw) {
            p = p + off + 1
            last = p - 1
            break
          }
        }
      }
      if (p > pointerRef.current) {
        pointerRef.current = p
        setPassedThroughIdx(p - 1)
        setCurrentWordIdx(last >= 0 ? last : p - 1)
      }
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
    try { sr.start() } catch { /* noop — already started or permission denied */ }

    return () => {
      stoppingRef.current = true
      if (recognitionRef.current === sr) recognitionRef.current = null
      try { sr.stop() } catch { /* noop */ }
      pointerRef.current = 0
      setCurrentWordIdx(null)
      setPassedThroughIdx(-1)
    }
  // referenceWords identity should be stable; consumer is expected to memoize.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  return { currentWordIdx, passedThroughIdx, supported }
}
