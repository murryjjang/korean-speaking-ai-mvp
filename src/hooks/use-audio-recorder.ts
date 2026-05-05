'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

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
  startRecording: () => Promise<void>
  stopRecording: () => void
  reset: () => void
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<RecorderState>('idle')
  const [errorType, setErrorType] = useState<RecorderErrorType | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [durationSec, setDurationSec] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
      setState('error')
      setErrorType('unknown')
    }

    recorder.start(250)
    setState('recording')

    timerRef.current = setInterval(() => {
      setDurationSec((prev) => prev + 1)
    }, 1000)
  }, [clearTimer, revokeBlobUrl, stopStream])

  const stopRecording = useCallback(() => {
    clearTimer()
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop()
    } else {
      stopStream()
      setState('stopped')
    }
  }, [clearTimer, stopStream])

  const reset = useCallback(() => {
    clearTimer()
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop()
    }
    stopStream()
    revokeBlobUrl()
    chunksRef.current = []
    setDurationSec(0)
    setState('idle')
    setErrorType(null)
  }, [clearTimer, revokeBlobUrl, stopStream])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer()
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive'
      ) {
        mediaRecorderRef.current.stop()
      }
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
    startRecording,
    stopRecording,
    reset,
  }
}
