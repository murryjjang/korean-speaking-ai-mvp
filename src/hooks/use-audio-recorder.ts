'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { AudioStats } from '@/src/lib/audio-validation'

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'stopped' | 'error'

export type RecorderErrorType =
  | 'not-supported'
  | 'permission-denied'
  | 'permission-dismissed'
  | 'unknown'

export interface UseAudioRecorderReturn {
  state: RecorderState
  errorType: RecorderErrorType | null
  blobUrl: string | null
  durationSec: number
  audioStats: AudioStats | null
  startRecording: () => Promise<void>
  stopRecording: () => void
  reset: () => void
}

// Sampling interval for RMS energy analysis (ms)
const ANALYSIS_INTERVAL_MS = 100
// RMS threshold above which a frame is considered "voiced"
const VOICED_RMS_THRESHOLD = 0.01

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<RecorderState>('idle')
  const [errorType, setErrorType] = useState<RecorderErrorType | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [durationSec, setDurationSec] = useState(0)
  const [audioStats, setAudioStats] = useState<AudioStats | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Audio energy analysis refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rmsDataRef = useRef<number[]>([])
  const analysisTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const revokeBlobUrl = useCallback(() => {
    setBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [])

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  // Finalize audio energy stats from collected samples, then tear down AudioContext.
  const finalizeAudioAnalysis = useCallback(() => {
    if (analysisTimerRef.current !== null) {
      clearInterval(analysisTimerRef.current)
      analysisTimerRef.current = null
    }

    const samples = rmsDataRef.current
    if (samples.length > 0) {
      const avgRms = samples.reduce((s, v) => s + v, 0) / samples.length
      const maxRms = Math.max(...samples)
      const voicedFrames = samples.filter((rms) => rms > VOICED_RMS_THRESHOLD).length
      const voicedMs = voicedFrames * ANALYSIS_INTERVAL_MS
      const speechRatio = voicedFrames / samples.length
      setAudioStats({
        avgRms,
        maxRms,
        voicedMs,
        speechRatio,
        sampledFrames: samples.length,
      })
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    analyserRef.current = null
    rmsDataRef.current = []
  }, [])

  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('error')
      setErrorType('not-supported')
      return
    }
    if (!window.MediaRecorder) {
      setState('error')
      setErrorType('not-supported')
      return
    }

    setState('requesting')
    setErrorType(null)
    revokeBlobUrl()
    chunksRef.current = []
    setDurationSec(0)
    setAudioStats(null)

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      const name = err instanceof Error ? err.name : ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setState('error')
        setErrorType('permission-denied')
      } else if (name === 'NotFoundError' || name === 'AbortError') {
        setState('error')
        setErrorType('permission-dismissed')
      } else {
        setState('error')
        setErrorType('unknown')
      }
      return
    }

    streamRef.current = stream

    // Start audio energy analysis (best-effort — gracefully skipped if AudioContext unavailable)
    try {
      const AudioContextClass =
        window.AudioContext ??
        (
          window as unknown as Record<string, typeof AudioContext | undefined>
        ).webkitAudioContext
      if (AudioContextClass) {
        const ctx = new AudioContextClass()
        audioContextRef.current = ctx
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 2048
        analyserRef.current = analyser
        const source = ctx.createMediaStreamSource(stream)
        source.connect(analyser)
        rmsDataRef.current = []

        const bufLen = analyser.frequencyBinCount
        const dataArr = new Float32Array(bufLen)
        analysisTimerRef.current = setInterval(() => {
          const a = analyserRef.current
          if (!a) return
          a.getFloatTimeDomainData(dataArr)
          let sum = 0
          for (let i = 0; i < bufLen; i++) {
            sum += dataArr[i] * dataArr[i]
          }
          rmsDataRef.current.push(Math.sqrt(sum / bufLen))
        }, ANALYSIS_INTERVAL_MS)
      }
    } catch {
      // AudioContext unavailable — energy analysis skipped, duration/size guards still apply
    }

    // Pick a supported MIME type — Safari does not support audio/webm
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : ''

    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream)

    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data)
      }
    }

    recorder.onstop = () => {
      clearTimer()
      stopStream()
      finalizeAudioAnalysis()
      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || 'audio/webm',
      })
      // Only create a URL when the blob has actual audio data.
      // A 0-byte blob happens on some iOS devices when recording fails silently;
      // leaving blobUrl as null lets the submit fallback proceed without audio.
      if (blob.size > 0) {
        const url = URL.createObjectURL(blob)
        setBlobUrl(url)
      }
      setState('stopped')
    }

    recorder.onerror = () => {
      clearTimer()
      stopStream()
      finalizeAudioAnalysis()
      setState('error')
      setErrorType('unknown')
    }

    recorder.start(250)
    setState('recording')

    timerRef.current = setInterval(() => {
      setDurationSec((prev) => prev + 1)
    }, 1000)
  }, [clearTimer, revokeBlobUrl, stopStream, finalizeAudioAnalysis])

  const stopRecording = useCallback(() => {
    clearTimer()
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop()
    } else {
      finalizeAudioAnalysis()
      stopStream()
      setState('stopped')
    }
  }, [clearTimer, finalizeAudioAnalysis, stopStream])

  const reset = useCallback(() => {
    clearTimer()
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop()
    }
    finalizeAudioAnalysis()
    stopStream()
    revokeBlobUrl()
    chunksRef.current = []
    setDurationSec(0)
    setAudioStats(null)
    setState('idle')
    setErrorType(null)
  }, [clearTimer, revokeBlobUrl, stopStream, finalizeAudioAnalysis])

  // Cleanup on unmount — avoid calling setAudioStats after unmount by cleaning refs directly
  useEffect(() => {
    return () => {
      clearTimer()
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive'
      ) {
        mediaRecorderRef.current.stop()
      }
      // Clean analysis timers/context without updating state
      if (analysisTimerRef.current !== null) {
        clearInterval(analysisTimerRef.current)
        analysisTimerRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
      }
      analyserRef.current = null
      rmsDataRef.current = []
      stopStream()
      // Revoke blob URL directly here to avoid stale closure issues
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    state,
    errorType,
    blobUrl,
    durationSec,
    audioStats,
    startRecording,
    stopRecording,
    reset,
  }
}
