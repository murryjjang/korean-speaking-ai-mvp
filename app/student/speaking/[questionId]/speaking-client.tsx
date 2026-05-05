'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardBody, Badge, LangHint } from '@/src/components/ui'
import type { LangHintItem } from '@/src/components/ui'
import { submitSpeaking } from '../actions'
import type { ClientPronunciationResult } from '../actions'
import { useAudioRecorder } from '@/src/hooks/use-audio-recorder'

type Phase = 'prep' | 'recording' | 'review' | 'submitting'

export type QuestionData = {
  id: string
  title: string
  prompt: string
  prepTimeSec: number
  responseTimeSec: number
  difficulty: string
  typeLabel: string
}

const difficultyLabel: Record<string, string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
}

const difficultyVariant: Record<string, 'success' | 'info' | 'warning'> = {
  beginner: 'success',
  intermediate: 'info',
  advanced: 'warning',
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// 질문별 모국어 도움말 (mock 콘텐츠 기준 대표 문항)
const QUESTION_HINTS: Record<string, LangHintItem[]> = {
  'q-001': [
    { lang: 'EN', text: 'Introduce yourself. Include your name, country, and why you are learning Korean.' },
    { lang: 'VI', text: 'Hãy tự giới thiệu bản thân. Bao gồm tên, quốc gia và lý do học tiếng Hàn.' },
    { lang: 'JA', text: '自己紹介をしてください。名前、出身国、韓国語を学ぶ理由を含めてください。' },
    { lang: 'AR', text: 'قدّم نفسك. اذكر اسمك وبلدك وسبب تعلمك للغة الكورية.' },
  ],
  'q-003': [
    { lang: 'EN', text: 'Look at the picture and describe the situation. (People exercising in a park)' },
    { lang: 'VI', text: 'Nhìn vào bức tranh và mô tả tình huống. (Mọi người đang tập thể dục trong công viên)' },
    { lang: 'JA', text: '絵を見て状況を説明してください。（公園で運動している人々）' },
    { lang: 'AR', text: 'انظر إلى الصورة واشرح الوضع. (أشخاص يمارسون الرياضة في حديقة)' },
  ],
  'q-007': [
    { lang: 'EN', text: 'Recommend a Korean food to your foreign friend. Explain your reasons.' },
    { lang: 'VI', text: 'Giới thiệu một món ăn Hàn Quốc cho bạn bè nước ngoài. Giải thích lý do.' },
    { lang: 'JA', text: '外国人の友達に韓国料理を勧めてください。理由も説明してください。' },
    { lang: 'AR', text: 'أوصِ صديقك الأجنبي بطعام كوري. اشرح السبب.' },
  ],
}

// 녹음 안내 도움말
const RECORDING_HINTS: LangHintItem[] = [
  { lang: 'EN', text: 'Press "준비 시작" to start. Recording begins after the countdown. Press "녹음 완료" when done. Listen before submitting with "제출하기".' },
  { lang: 'VI', text: 'Nhấn "준비 시작" để bắt đầu. Ghi âm bắt đầu sau đếm ngược. Nhấn "녹음 완료" khi xong. Nghe lại trước khi nhấn "제출하기".' },
  { lang: 'JA', text: '「준비 시작」を押してスタート。カウントダウン後に録音開始。「녹음 완료」で終了。「제출하기」で送信前に確認できます。' },
  { lang: 'AR', text: 'اضغط "준비 시작" للبدء. يبدأ التسجيل بعد العد التنازلي. اضغط "녹음 완료" عند الانتهاء. يمكنك الاستماع قبل الضغط على "제출하기".' },
]

const RECORDER_ERROR_MESSAGES: Record<string, string> = {
  'not-supported':
    '이 브라우저는 마이크 녹음을 지원하지 않습니다. Chrome 또는 Edge를 사용해주세요. (iOS는 iOS 15 이상 Safari 필요)',
  'permission-denied':
    '마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.',
  'permission-dismissed':
    '마이크 접근이 취소되었습니다. 다시 시도하거나 녹음 없이 제출할 수 있습니다.',
  unknown:
    '마이크 접근 중 오류가 발생했습니다. iOS Safari는 일부 기기에서 녹음이 제한될 수 있습니다. 녹음 없이도 제출할 수 있습니다.',
}

export function SpeakingClient({
  question,
  questionSetId,
  setName,
}: {
  question: QuestionData
  questionSetId: string
  setName: string
}) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('prep')
  const [prepRemaining, setPrepRemaining] = useState(question.prepTimeSec)
  const [prepStarted, setPrepStarted] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  // Detected once at mount; server always returns false (no navigator).
  const [isIOSSafari] = useState<boolean>(() => {
    if (typeof navigator === 'undefined') return false
    const ua = navigator.userAgent
    return /iP(hone|ad|od)/i.test(ua) && /^((?!chrome|android).)*safari/i.test(ua)
  })

  const recorder = useAudioRecorder()
  // Track recording elapsed seconds independently so auto-stop still works
  const [recordingElapsed, setRecordingElapsed] = useState(0)
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Prep countdown
  useEffect(() => {
    if (!prepStarted || phase !== 'prep') return
    if (prepRemaining <= 0) return
    const timer = setTimeout(() => {
      if (prepRemaining <= 1) {
        setPrepRemaining(0)
        setPhase('recording')
      } else {
        setPrepRemaining((r) => r - 1)
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [prepStarted, phase, prepRemaining])

  // Start MediaRecorder when phase transitions to 'recording'
  useEffect(() => {
    if (phase !== 'recording') return
    const init = setTimeout(() => {
      setRecordingElapsed(0)
      recorder.startRecording()
    }, 0)
    return () => clearTimeout(init)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Auto-stop at responseTimeSec
  useEffect(() => {
    if (phase !== 'recording') return
    const countTimer = setInterval(() => {
      setRecordingElapsed((prev) => {
        const next = prev + 1
        return Math.min(next, question.responseTimeSec)
      })
    }, 1000)

    autoStopTimerRef.current = setTimeout(() => {
      recorder.stopRecording()
    }, question.responseTimeSec * 1000)

    return () => {
      clearInterval(countTimer)
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current)
        autoStopTimerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, question.responseTimeSec])

  // When recorder finishes (stopped or error), transition to review
  useEffect(() => {
    if (phase !== 'recording') return
    if (recorder.state !== 'stopped' && recorder.state !== 'error') return
    const transition = setTimeout(() => {
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current)
        autoStopTimerRef.current = null
      }
      setPhase('review')
    }, 0)
    return () => clearTimeout(transition)
  }, [phase, recorder.state])

  const handleStopRecording = useCallback(() => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current)
      autoStopTimerRef.current = null
    }
    recorder.stopRecording()
    // Phase transition happens via the effect above when recorder.state becomes 'stopped'
  }, [recorder])

  const handleSubmit = useCallback(async () => {
    setPhase('submitting')
    setSubmitError(false)

    let sttTranscript: string | undefined
    let sttProviderName: string | undefined
    let audioUrl: string | undefined
    let pronunciationResult: ClientPronunciationResult | undefined

    if (recorder.blobUrl) {
      let audioBlob: Blob | null = null

      try {
        const blobRes = await fetch(recorder.blobUrl)
        audioBlob = await blobRes.blob()
      } catch {
        // Blob fetch failure — continue without audio
      }

      if (audioBlob) {
        const blob = audioBlob

        // Run STT, Storage upload, and Pronunciation evaluation in parallel — all non-blocking.
        await Promise.allSettled([
          // STT via /api/stt
          (async () => {
            try {
              const fd = new FormData()
              fd.append('audio', blob, 'recording.webm')
              fd.append('questionId', question.id)
              const res = await fetch('/api/stt', { method: 'POST', body: fd })
              if (res.ok) {
                // Response.json() returns any; safe to access known fields directly.
                const data = await res.json()
                if (typeof data?.transcript === 'string') sttTranscript = data.transcript
                if (typeof data?.providerName === 'string') sttProviderName = data.providerName
              }
            } catch {
              // STT failure is non-blocking — submitSpeaking uses mock fallback
            }
          })(),
          // Storage upload via /api/storage/upload
          (async () => {
            try {
              const fd = new FormData()
              fd.append('audio', blob, 'recording.webm')
              fd.append('questionId', question.id)
              const res = await fetch('/api/storage/upload', { method: 'POST', body: fd })
              if (res.ok) {
                const data = await res.json()
                if (typeof data?.publicUrl === 'string' && data.publicUrl) {
                  audioUrl = data.publicUrl
                }
              }
            } catch {
              // Storage upload failure is non-blocking — submit proceeds without audio_url
            }
          })(),
          // Pronunciation evaluation via /api/pronunciation
          (async () => {
            try {
              const fd = new FormData()
              fd.append('audio', blob, 'recording.webm')
              fd.append('questionId', question.id)
              fd.append('referenceText', question.prompt)
              const res = await fetch('/api/pronunciation', { method: 'POST', body: fd })
              if (res.ok) {
                const data = await res.json()
                if (typeof data?.normalizedScore === 'number') {
                  pronunciationResult = {
                    normalizedScore: data.normalizedScore,
                    wordScores: Array.isArray(data.wordScores) ? data.wordScores : [],
                    feedback: typeof data.feedback === 'string' ? data.feedback : '',
                    providerName: typeof data.providerName === 'string' ? data.providerName : 'mock',
                    latencyMs: typeof data.latencyMs === 'number' ? data.latencyMs : 0,
                  }
                }
              }
            } catch {
              // Pronunciation failure is non-blocking — submitSpeaking uses mock fallback
            }
          })(),
        ])
      }
    }

    try {
      const { submissionId } = await submitSpeaking(question.id, questionSetId, {
        hasRecording: recorder.state === 'stopped' && recorder.blobUrl !== null,
        recordingDurationSec: recorder.durationSec,
        sttTranscript,
        sttProviderName,
        audioUrl,
        pronunciationResult,
      })
      router.push(`/student/speaking/${question.id}/result?sub=${submissionId}`)
    } catch {
      setSubmitError(true)
      setPhase('review')
    }
  }, [question.id, question.prompt, questionSetId, router, recorder.state, recorder.blobUrl, recorder.durationSec])

  const handleRetake = useCallback(() => {
    recorder.reset()
    setRecordingElapsed(0)
    setPhase('recording')
    setSubmitError(false)
  }, [recorder])

  const dVariant = difficultyVariant[question.difficulty] ?? 'default'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Question card */}
      <Card>
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-text-primary leading-5">
              {question.title}
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              {setName} · {question.typeLabel}
            </p>
          </div>
          <Badge variant={dVariant as 'success' | 'info' | 'warning'}>
            {difficultyLabel[question.difficulty] ?? question.difficulty}
          </Badge>
        </div>
        <CardBody>
          <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
            {question.prompt}
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs text-text-muted">
            <span>준비 시간: {question.prepTimeSec}초</span>
            <span>답변 시간: {formatTime(question.responseTimeSec)}</span>
          </div>
          {QUESTION_HINTS[question.id] && (
            <LangHint items={QUESTION_HINTS[question.id]} label="모국어 도움말 보기" />
          )}
        </CardBody>
      </Card>

      {/* Prep phase */}
      {phase === 'prep' && (
        <Card>
          <CardBody>
            <div className="text-center py-8">
              {prepStarted ? (
                <>
                  <p className="text-xs text-text-muted mb-3">준비 시간</p>
                  <p className="text-5xl font-mono font-bold text-text-primary tabular-nums mb-6">
                    {formatTime(prepRemaining)}
                  </p>
                  <Button variant="secondary" onClick={() => setPhase('recording')}>
                    준비 완료 — 바로 시작
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-text-secondary mb-6">
                    문항을 읽고 답변을 준비하세요.
                  </p>
                  {isIOSSafari && (
                    <div className="mb-4 mx-auto max-w-sm text-left px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-xs text-amber-700 leading-relaxed">
                        <strong>iOS Safari 안내:</strong> iOS 15 이상에서만 녹음이 가능합니다. 일부 기기에서는 녹음이 제한될 수 있으며, 오류 시에도 제출은 가능합니다.
                      </p>
                    </div>
                  )}
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => setPrepStarted(true)}
                  >
                    준비 시작
                  </Button>
                  <div className="mt-4 text-left">
                    <LangHint items={RECORDING_HINTS} label="녹음 방법 도움말" />
                  </div>
                </>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Recording phase */}
      {phase === 'recording' && (
        <Card>
          <CardBody>
            <div className="text-center py-8">
              {/* Requesting mic permission */}
              {recorder.state === 'requesting' && (
                <p className="text-sm text-text-secondary mb-6">
                  마이크 권한을 요청 중입니다…
                </p>
              )}

              {/* Error during permission request — show error + mock fallback */}
              {recorder.state === 'error' && recorder.errorType && (
                <div className="mb-6 px-4">
                  <p className="text-sm text-danger-600 mb-4">
                    {RECORDER_ERROR_MESSAGES[recorder.errorType] ?? RECORDER_ERROR_MESSAGES.unknown}
                  </p>
                  <p className="text-xs text-text-muted">
                    마이크 없이도 mock으로 제출할 수 있습니다.
                  </p>
                </div>
              )}

              {/* Active recording */}
              {recorder.state === 'recording' && (
                <>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="inline-block w-3 h-3 rounded-full bg-danger-500 animate-pulse" />
                    <span className="text-sm font-medium text-danger-500">녹음 중</span>
                  </div>
                  <p className="text-5xl font-mono font-bold text-text-primary tabular-nums mb-1">
                    {formatTime(recordingElapsed)}
                  </p>
                  <p className="text-xs text-text-muted mb-6">
                    최대 {formatTime(question.responseTimeSec)}
                  </p>
                  <Button variant="secondary" onClick={handleStopRecording} className="min-w-[160px]">
                    녹음 완료
                  </Button>
                </>
              )}

              {/* Idle / not started yet — show countdown fallback */}
              {recorder.state === 'idle' && (
                <>
                  <p className="text-5xl font-mono font-bold text-text-primary tabular-nums mb-1">
                    {formatTime(recordingElapsed)}
                  </p>
                  <p className="text-xs text-text-muted mb-6">
                    최대 {formatTime(question.responseTimeSec)}
                  </p>
                </>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Review phase */}
      {phase === 'review' && (
        <Card>
          <CardBody>
            <div className="text-center py-6">
              {submitError && (
                <p className="text-xs text-danger-500 mb-4">
                  제출 중 오류가 발생했습니다. 다시 시도해주세요.
                </p>
              )}

              {/* Recorder error banner */}
              {recorder.state === 'error' && recorder.errorType && (
                <div className="mb-4 p-3 bg-warning-50 border border-warning-200 rounded-md text-left">
                  <p className="text-xs text-warning-700">
                    {RECORDER_ERROR_MESSAGES[recorder.errorType] ?? RECORDER_ERROR_MESSAGES.unknown}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    녹음 없이 mock 제출로 계속할 수 있습니다.
                  </p>
                </div>
              )}

              {/* Audio playback */}
              {recorder.blobUrl && (
                <div className="mb-6">
                  <p className="text-xs text-text-muted mb-2">내 녹음 확인</p>
                  <audio
                    controls
                    src={recorder.blobUrl}
                    className="w-full max-w-sm mx-auto"
                    style={{ minHeight: '44px' }}
                  />
                  <p className="text-xs text-text-muted mt-1">
                    녹음 길이: {formatTime(recorder.durationSec)}
                  </p>
                </div>
              )}

              {!recorder.blobUrl && recorder.state !== 'error' && (
                <p className="text-sm text-text-secondary mb-2">녹음이 완료되었습니다.</p>
              )}

              <p className="text-xs text-text-muted mb-6">
                제출하면 AI 평가가 시작됩니다.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button variant="secondary" onClick={handleRetake} className="w-full sm:w-auto">
                  다시 녹음
                </Button>
                <Button variant="primary" onClick={handleSubmit} className="w-full sm:w-auto">
                  제출하기
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Submitting phase */}
      {phase === 'submitting' && (
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <Button loading variant="primary" disabled>
                평가 중...
              </Button>
              <p className="mt-4 text-xs text-text-muted">
                AI가 말하기를 평가하고 있습니다. 잠시 기다려주세요.
              </p>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
