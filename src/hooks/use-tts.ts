'use client'

import { useState, useCallback, useRef } from 'react'

export type TTSState = 'idle' | 'loading' | 'playing' | 'error'

export interface UseTTSReturn {
  state: TTSState
  errorMessage: string | null
  play: (text: string, questionId?: string, purpose?: string) => Promise<void>
  stop: () => void
}

type TTSAPIResponse = {
  ok: boolean
  providerName: string
  status: string
  audioBase64?: string
  mimeType?: string
  fallbackText?: string
  message?: string
}

const FALLBACK_ERROR = '음성 안내를 사용할 수 없습니다. 화면의 안내문을 확인해 주세요.'

export function useTTS(): UseTTSReturn {
  const [state, setState] = useState<TTSState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const seqRef = useRef(0)

  const stop = useCallback(() => {
    seqRef.current++
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setState('idle')
    setErrorMessage(null)
  }, [])

  const play = useCallback(
    async (text: string, questionId?: string, purpose?: string) => {
      stop()
      const seq = ++seqRef.current
      setState('loading')
      setErrorMessage(null)

      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, questionId, purpose }),
        })

        if (seq !== seqRef.current) return

        if (!res.ok) throw new Error(`tts_api_${res.status}`)

        const data: TTSAPIResponse = await res.json()

        if (seq !== seqRef.current) return

        // Path 1: base64 audio from OpenAI TTS
        if (data.audioBase64) {
          const audio = new Audio(
            `data:${data.mimeType ?? 'audio/mpeg'};base64,${data.audioBase64}`,
          )
          audioRef.current = audio
          audio.onended = () => {
            if (seq === seqRef.current) setState('idle')
          }
          audio.onerror = () => {
            if (seq !== seqRef.current) return
            setState('error')
            setErrorMessage(FALLBACK_ERROR)
          }
          setState('playing')
          await audio.play()
          return
        }

        // Path 2: browser speechSynthesis fallback
        const fallbackText = data.fallbackText ?? text
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          const utter = new SpeechSynthesisUtterance(fallbackText)
          utter.lang = 'ko-KR'
          utter.rate = 0.9
          utter.onend = () => {
            if (seq === seqRef.current) setState('idle')
          }
          utter.onerror = () => {
            if (seq !== seqRef.current) return
            setState('error')
            setErrorMessage(FALLBACK_ERROR)
          }
          setState('playing')
          window.speechSynthesis.speak(utter)
          return
        }

        // Path 3: no audio capability
        setState('error')
        setErrorMessage(FALLBACK_ERROR)
      } catch {
        if (seq !== seqRef.current) return
        setState('error')
        setErrorMessage(FALLBACK_ERROR)
      }
    },
    [stop],
  )

  return { state, errorMessage, play, stop }
}
