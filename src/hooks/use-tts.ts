'use client'

// v1.1 단계 18 [A-3]: <audio> 요소 + MediaElementAudioSource는 첫 음절 잘림이
// 빈번해 AudioContext.decodeAudioData + AudioBufferSourceNode 경로를 기본으로 사용.
// 디코딩 완료 후 start(0)로 재생해 leading silence 누락을 차단한다.
// NEXT_PUBLIC_TTS_PLAYBACK_DECODE=0 으로 비활성화하면 기존 <audio> 경로로 폴백.

import { useState, useCallback, useRef } from 'react'

export type TTSState = 'idle' | 'loading' | 'playing' | 'error'

export interface UseTTSReturn {
  state: TTSState
  errorMessage: string | null
  play: (text: string, questionId?: string, purpose?: string, personaId?: string) => Promise<void>
  stop: () => void
}

type TTSAPIResponse = {
  ok: boolean
  providerName: string
  status: string
  audioBase64?: string
  mimeType?: string
  fallbackText?: string
  fallbackRate?: number
  message?: string
}

const FALLBACK_ERROR = '음성 안내를 사용할 수 없습니다. 화면의 안내문을 확인해 주세요.'

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = window.atob(b64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

type ManagedAudio =
  | { kind: 'element'; audio: HTMLAudioElement }
  | { kind: 'context'; ctx: AudioContext; source: AudioBufferSourceNode }

export function useTTS(): UseTTSReturn {
  const [state, setState] = useState<TTSState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const currentRef = useRef<ManagedAudio | null>(null)
  const seqRef = useRef(0)

  const cleanupCurrent = useCallback(() => {
    const current = currentRef.current
    if (!current) return
    try {
      if (current.kind === 'element') {
        current.audio.pause()
        current.audio.src = ''
      } else {
        current.source.onended = null
        try { current.source.stop() } catch { /* already stopped */ }
        try { void current.ctx.close() } catch { /* noop */ }
      }
    } catch { /* noop */ }
    currentRef.current = null
  }, [])

  const stop = useCallback(() => {
    seqRef.current++
    cleanupCurrent()
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setState('idle')
    setErrorMessage(null)
  }, [cleanupCurrent])

  const playDecoded = useCallback(
    async (audioBase64: string, mimeType: string | undefined, seq: number): Promise<boolean> => {
      // AudioContext 경로 — 디코딩 후 BufferSourceNode로 재생.
      if (typeof window === 'undefined') return false
      const AudioCtor = (window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
      if (!AudioCtor) return false
      try {
        const buf = base64ToArrayBuffer(audioBase64)
        const ctx = new AudioCtor()
        // 디코드 — Opus/MP3/WAV 모두 브라우저가 지원하면 자동 해석.
        const decoded = await new Promise<AudioBuffer>((resolve, reject) => {
          // 일부 구버전 Safari는 callback API만 지원.
          const maybe = ctx.decodeAudioData(buf, resolve, reject)
          if (maybe && typeof (maybe as Promise<AudioBuffer>).then === 'function') {
            ;(maybe as Promise<AudioBuffer>).then(resolve, reject)
          }
        })
        if (seq !== seqRef.current) {
          try { void ctx.close() } catch { /* noop */ }
          return true // cancelled
        }
        const source = ctx.createBufferSource()
        source.buffer = decoded
        source.connect(ctx.destination)
        source.onended = () => {
          if (seq !== seqRef.current) return
          setState('idle')
          try { void ctx.close() } catch { /* noop */ }
          currentRef.current = null
        }
        currentRef.current = { kind: 'context', ctx, source }
        setState('playing')
        source.start(0)
        return true
      } catch (err) {
        console.warn('[useTTS] decodeAudioData path failed, falling back:', err)
        void mimeType
        return false
      }
    },
    [],
  )

  const play = useCallback(
    async (text: string, questionId?: string, purpose?: string, personaId?: string) => {
      stop()
      const seq = ++seqRef.current
      setState('loading')
      setErrorMessage(null)

      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, questionId, purpose, personaId }),
        })

        if (seq !== seqRef.current) return

        if (!res.ok) throw new Error(`tts_api_${res.status}`)

        const data: TTSAPIResponse = await res.json()

        if (seq !== seqRef.current) return

        // Path 1: base64 audio — A-3 적용 (AudioContext 디코드) 가능하면 우선.
        if (data.audioBase64) {
          const decodeEnabled =
            process.env.NEXT_PUBLIC_TTS_PLAYBACK_DECODE !== '0'
          if (decodeEnabled) {
            const ok = await playDecoded(data.audioBase64, data.mimeType, seq)
            if (ok) return
          }

          // 폴백: <audio> 경로 (rollback option).
          const audio = new Audio(
            `data:${data.mimeType ?? 'audio/mpeg'};base64,${data.audioBase64}`,
          )
          currentRef.current = { kind: 'element', audio }
          audio.onended = () => {
            if (seq === seqRef.current) setState('idle')
          }
          audio.onerror = () => {
            if (seq !== seqRef.current) return
            setState('error')
            setErrorMessage(FALLBACK_ERROR)
          }
          audio.addEventListener(
            'canplaythrough',
            () => {
              if (seq !== seqRef.current) return
              setState('playing')
              audio.play().catch(() => {
                if (seq !== seqRef.current) return
                setState('error')
                setErrorMessage(FALLBACK_ERROR)
              })
            },
            { once: true },
          )
          return
        }

        // Path 2: browser speechSynthesis fallback
        const fallbackText = data.fallbackText ?? text
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          const utter = new SpeechSynthesisUtterance(fallbackText)
          utter.lang = 'ko-KR'
          utter.rate = data.fallbackRate ?? 0.9
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
    [stop, playDecoded],
  )

  return { state, errorMessage, play, stop }
}
