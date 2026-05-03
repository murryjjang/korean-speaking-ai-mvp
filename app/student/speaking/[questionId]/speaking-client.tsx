'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardBody, Badge } from '@/src/components/ui'
import { submitSpeaking } from '../actions'

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
  const [recordingElapsed, setRecordingElapsed] = useState(0)
  const [submitError, setSubmitError] = useState(false)

  // Prep countdown — all state updates inside the setTimeout callback
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

  // Recording elapsed counter
  useEffect(() => {
    if (phase !== 'recording') return
    const countTimer = setInterval(() => {
      setRecordingElapsed((prev) => Math.min(prev + 1, question.responseTimeSec))
    }, 1000)
    // Auto-transition at max time
    const doneTimer = setTimeout(() => {
      setPhase('review')
    }, question.responseTimeSec * 1000)
    return () => {
      clearInterval(countTimer)
      clearTimeout(doneTimer)
    }
  }, [phase, question.responseTimeSec])

  const handleSubmit = useCallback(async () => {
    setPhase('submitting')
    setSubmitError(false)
    try {
      const { submissionId } = await submitSpeaking(question.id, questionSetId)
      router.push(`/student/speaking/${question.id}/result?sub=${submissionId}`)
    } catch {
      setSubmitError(true)
      setPhase('review')
    }
  }, [question.id, questionSetId, router])

  const handleRetake = useCallback(() => {
    setRecordingElapsed(0)
    setPhase('recording')
    setSubmitError(false)
  }, [])

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
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => setPrepStarted(true)}
                  >
                    준비 시작
                  </Button>
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
              <p className="text-xs text-text-muted mb-6 px-6">
                * 현재는 MVP 단계로 실제 음성 녹음 없이 mock 제출로 동작합니다.
              </p>
              <Button variant="secondary" onClick={() => setPhase('review')}>
                녹음 완료
              </Button>
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
              <p className="text-sm text-text-secondary mb-2">녹음이 완료되었습니다.</p>
              <p className="text-xs text-text-muted mb-6">
                제출하면 AI 평가가 시작됩니다.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button variant="secondary" onClick={handleRetake}>
                  다시 녹음
                </Button>
                <Button variant="primary" onClick={handleSubmit}>
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
