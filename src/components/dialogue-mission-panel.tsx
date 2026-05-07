'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardBody } from '@/src/components/ui'
import { useAudioRecorder } from '@/src/hooks/use-audio-recorder'
import { useTTS } from '@/src/hooks/use-tts'
import { submitDialogue } from '@/app/student/speaking/dialogue-actions'
import type { DialogueTurn, MissionGoalResult, DialogueMissionPanelStatus, DialogueMode } from '@/src/types/dialogue'
import { detectMissionProgress } from '@/src/lib/dialogue-mission'
import { validateRecordedAudio, getAudioValidationMessage } from '@/src/lib/audio-validation'
import { shouldAnswerLanguageQuestion } from '@/src/lib/dialogue-policy'

const MIN_VALID_BLOB_SIZE = 3000

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export type DialogueMissionPanelProps = {
  questionId: string
  questionSetId: string
  difficulty: string
  aiFirstUtterance: string
  missionGoals: string[]
  maxDialogueDurationSec: number
  // Dialogue mode: 'assessment' (default, q4 evaluation) or 'practice' (free conversation)
  mode?: DialogueMode
  personaId?: string
  attemptId?: string
}

export function DialogueMissionPanel({
  questionId,
  questionSetId,
  difficulty,
  aiFirstUtterance,
  missionGoals,
  maxDialogueDurationSec,
  mode = 'assessment',
  personaId,
  attemptId,
}: DialogueMissionPanelProps) {
  const router = useRouter()
  const recorder = useAudioRecorder()
  const { state: ttsState, play: ttsPlay, stop: ttsStop } = useTTS()

  const [panelStatus, setPanelStatus] = useState<DialogueMissionPanelStatus>('idle')
  const [playingTurnId, setPlayingTurnId] = useState<string | null>(null)
  const [turns, setTurns] = useState<DialogueTurn[]>([])
  const goalResults = useMemo<MissionGoalResult[]>(
    () => detectMissionProgress(questionId, missionGoals, turns),
    [questionId, missionGoals, turns],
  )
  const [turnError, setTurnError] = useState<string | null>(null)
  const [processingMessage, setProcessingMessage] = useState('')
  const [submitError, setSubmitError] = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [blobSize, setBlobSize] = useState<number | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Stop TTS on unmount
  useEffect(() => {
    return () => { ttsStop() }
  }, [ttsStop])

  // Stop TTS when dialogue ends or is submitting
  useEffect(() => {
    if (panelStatus === 'completed' || panelStatus === 'submitting') {
      ttsStop()
    }
  }, [panelStatus, ttsStop])

  // Elapsed timer — runs whenever dialogue is active
  useEffect(() => {
    if (panelStatus === 'idle' || panelStatus === 'completed' || panelStatus === 'submitting') {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }
    timerRef.current = setInterval(() => setElapsedSec((p) => p + 1), 1000)
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [panelStatus])

  // Track blob size reactively (same guard pattern as speaking-client.tsx)
  useEffect(() => {
    if (!recorder.blobUrl) return
    let active = true
    fetch(recorder.blobUrl)
      .then((r) => r.blob())
      .then((b) => { if (active) setBlobSize(b.size) })
      .catch(() => { if (active) setBlobSize(null) })
    return () => { active = false }
  }, [recorder.blobUrl])

  // Transition recording → recorded when MediaRecorder stops (deferred to avoid cascading setState)
  useEffect(() => {
    if (panelStatus !== 'recording') return
    if (recorder.state !== 'stopped' && recorder.state !== 'error') return
    const t = setTimeout(() => setPanelStatus('recorded'), 0)
    return () => clearTimeout(t)
  }, [panelStatus, recorder.state])

  // Start MediaRecorder when we enter recording state
  useEffect(() => {
    if (panelStatus !== 'recording') return
    recorder.startRecording()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelStatus])

  const audioValidation =
    recorder.state === 'stopped'
      ? validateRecordedAudio({ durationSec: recorder.durationSec, blobSize, audioStats: recorder.audioStats })
      : { valid: true as const }
  const isInvalidAudio = !audioValidation.valid
  const invalidAudioMessage =
    !audioValidation.valid
      ? getAudioValidationMessage(audioValidation.reason)
      : '녹음을 확인해 주세요.'

  const hasValidStudentTurns = turns.some(
    (t) => t.role === 'student' && t.status === 'completed',
  )
  const canSubmit = hasValidStudentTurns

  const handlePlayAITurn = useCallback((turn: DialogueTurn) => {
    setPlayingTurnId(turn.id)
    ttsPlay(turn.text, questionId, 'ai-dialogue', personaId)
  }, [ttsPlay, questionId, personaId])

  const handleStart = useCallback(() => {
    const firstTurn: DialogueTurn = {
      id: `turn-ai-first-${Date.now()}`,
      role: 'ai',
      text: aiFirstUtterance,
      createdAt: new Date().toISOString(),
      status: 'completed',
      providerName: 'script',
    }
    setTurns([firstTurn])
    setElapsedSec(0)
    setPanelStatus('ready')
    setTurnError(null)
    // Auto-play first utterance (best-effort — browser autoplay policy may block)
    setPlayingTurnId(firstTurn.id)
    ttsPlay(aiFirstUtterance, questionId, 'ai-dialogue', personaId)
  }, [aiFirstUtterance, ttsPlay, questionId, personaId])

  const handleStartRecording = useCallback(() => {
    recorder.reset()
    setBlobSize(null)
    setTurnError(null)
    setPanelStatus('recording')
  }, [recorder])

  const handleStopRecording = useCallback(() => {
    recorder.stopRecording()
    // State transition to 'recorded' happens via the useEffect above
  }, [recorder])

  const handleRetake = useCallback(() => {
    recorder.reset()
    setBlobSize(null)
    setTurnError(null)
    setPanelStatus('recording')
  }, [recorder])

  const handleSendTurn = useCallback(async () => {
    if (recorder.state !== 'stopped' || !recorder.blobUrl) return

    // Defense-in-depth: matches the disabled-button condition
    const guardCheck = validateRecordedAudio({
      durationSec: recorder.durationSec,
      blobSize,
      audioStats: recorder.audioStats,
    })
    if (!guardCheck.valid) {
      setTurnError(getAudioValidationMessage(guardCheck.reason))
      return
    }

    setPanelStatus('processing')
    setProcessingMessage('음성 인식 중...')
    setTurnError(null)

    // Fetch blob
    let audioBlob: Blob | null = null
    try {
      const res = await fetch(recorder.blobUrl)
      audioBlob = await res.blob()
    } catch {
      setTurnError('오디오 처리 중 오류가 발생했습니다.')
      setPanelStatus('recorded')
      return
    }

    if (!audioBlob || audioBlob.size < MIN_VALID_BLOB_SIZE) {
      setTurnError('음성이 너무 짧습니다. 다시 말해 주세요.')
      setPanelStatus('recorded')
      return
    }

    // STT call — 10s timeout prevents infinite "음성 인식 중..." state
    let transcript = ''
    let sttProviderName = ''
    let sttWarning = ''
    try {
      const sttAbort = new AbortController()
      const sttTimeout = setTimeout(() => sttAbort.abort(), 10000)
      const fd = new FormData()
      fd.append('audio', audioBlob, 'recording.webm')
      fd.append('questionId', questionId)
      const res = await fetch('/api/stt', { method: 'POST', body: fd, signal: sttAbort.signal })
      clearTimeout(sttTimeout)
      if (res.ok) {
        const data = await res.json()
        if (typeof data?.transcript === 'string') transcript = data.transcript
        if (typeof data?.providerName === 'string') sttProviderName = data.providerName
        if (typeof data?.warning === 'string') sttWarning = data.warning
      }
    } catch {
      // STT failure or timeout — fall through to no-speech guard
    }

    // No-speech / hallucination guard
    if (
      sttProviderName === 'no-speech' ||
      sttWarning === 'stt_hallucination_filtered' ||
      !transcript.trim()
    ) {
      setTurnError('음성 인식이 원활하지 않습니다. 다시 한 번 말해 주세요.')
      setPanelStatus('recorded')
      return
    }

    // Tag student turn intent — language questions are excluded from mission evidence
    const isLanguageQuestion = shouldAnswerLanguageQuestion(transcript)

    // Add student turn
    const studentTurn: DialogueTurn = {
      id: `turn-student-${Date.now()}`,
      role: 'student',
      text: transcript,
      audioDurationSec: recorder.durationSec,
      createdAt: new Date().toISOString(),
      status: 'completed',
      providerName: sttProviderName || 'mock',
      intent: isLanguageQuestion ? 'language_question' : 'mission_response',
    }

    const newTurns = [...turns, studentTurn]
    setTurns(newTurns)

    // Get AI response
    setProcessingMessage('AI 응답 생성 중...')

    try {
      const dialogueAbort = new AbortController()
      const dialogueTimeout = setTimeout(() => dialogueAbort.abort(), 15000)
      const res = await fetch('/api/dialogue/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          level: difficulty,
          turns: newTurns.map((t) => ({ role: t.role, text: t.text })),
          latestStudentText: transcript,
          mode,
          personaId,
        }),
        signal: dialogueAbort.signal,
      })
      clearTimeout(dialogueTimeout)

      let aiText = '네, 알겠습니다.'
      let aiProvider = 'fallback'
      if (res.ok) {
        const data = await res.json()
        if (typeof data?.aiText === 'string' && data.aiText) aiText = data.aiText
        if (typeof data?.providerName === 'string') aiProvider = data.providerName
      }

      const aiTurn: DialogueTurn = {
        id: `turn-ai-${Date.now()}`,
        role: 'ai',
        text: aiText,
        createdAt: new Date().toISOString(),
        status: 'completed',
        providerName: aiProvider,
      }
      setTurns((prev) => [...prev, aiTurn])
      // Auto-play AI response (fire-and-forget)
      setPlayingTurnId(aiTurn.id)
      ttsPlay(aiText, questionId, 'ai-dialogue', personaId)
    } catch {
      const fallbackId = `turn-ai-fallback-${Date.now()}`
      const fallbackText = '네, 알겠습니다.'
      setTurns((prev) => [
        ...prev,
        {
          id: fallbackId,
          role: 'ai',
          text: fallbackText,
          createdAt: new Date().toISOString(),
          status: 'completed',
          providerName: 'fallback',
        },
      ])
      setPlayingTurnId(fallbackId)
      ttsPlay(fallbackText, questionId, 'ai-dialogue', personaId)
    }

    recorder.reset()
    setBlobSize(null)
    setTurnError(null)
    setPanelStatus('ready')
  }, [recorder, blobSize, turns, questionId, difficulty, ttsPlay, mode, personaId])

  const handleEndDialogue = useCallback(() => {
    if (!canSubmit) return
    setPanelStatus('completed')
  }, [canSubmit])

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return
    setPanelStatus('submitting')
    setSubmitError(false)

    try {
      const { submissionId } = await submitDialogue(questionId, questionSetId, {
        turns,
        goalResults,
        attemptId,
      })
      const resultParams = new URLSearchParams({ sub: submissionId })
      if (attemptId) resultParams.set('attemptId', attemptId)
      router.push(`/student/speaking/${questionId}/result?${resultParams.toString()}`)
    } catch {
      setSubmitError(true)
      setPanelStatus('completed')
    }
  }, [canSubmit, questionId, questionSetId, attemptId, turns, goalResults, router])

  const isCafeScenario = questionId.includes('beginner') && questionId.includes('q4')

  return (
    <div className="space-y-4" data-testid="dialogue-mission-panel">
      {/* Cafe menu board — beginner q4 카페 주문 미션 전용 */}
      {isCafeScenario && (
        <Card data-testid="cafe-menu-board">
          <CardBody>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
              메뉴판
            </p>
            <div className="space-y-2">
              <div>
                <p className="text-xs font-medium text-text-primary mb-1">음료</p>
                <ul className="space-y-0.5 text-xs text-text-secondary">
                  <li className="flex justify-between"><span>아이스 아메리카노</span><span>3,000원</span></li>
                  <li className="flex justify-between"><span>따뜻한 아메리카노</span><span>3,000원</span></li>
                  <li className="flex justify-between"><span>아이스 라테</span><span>3,500원</span></li>
                  <li className="flex justify-between"><span>따뜻한 라테</span><span>3,500원</span></li>
                  <li className="flex justify-between"><span>오렌지 주스</span><span>4,000원</span></li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-text-primary mb-1">디저트</p>
                <ul className="space-y-0.5 text-xs text-text-secondary">
                  <li className="flex justify-between"><span>팥빙수</span><span>6,000원</span></li>
                  <li className="flex justify-between"><span>조각 케이크</span><span>5,000원</span></li>
                </ul>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Mission goals tracker */}
      <Card>
        <CardBody>
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
            미션 목표
          </p>
          <ul className="space-y-1.5">
            {goalResults.map((g) => (
              <li key={g.goalIndex} className="flex items-center gap-2">
                <span
                  className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold
                    ${g.achieved ? 'bg-success-100 text-success-700' : 'bg-surface border border-border text-text-muted'}`}
                  data-testid={g.achieved ? 'goal-achieved' : 'goal-pending'}
                >
                  {g.achieved ? '✓' : g.goalIndex + 1}
                </span>
                <span className={`text-xs ${g.achieved ? 'text-success-700 line-through' : 'text-text-secondary'}`}>
                  {g.labelKo}
                </span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      {/* Dialogue conversation area */}
      {panelStatus !== 'idle' && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                대화
              </p>
              <span className="text-xs text-text-muted font-mono tabular-nums">
                {formatTime(elapsedSec)} / {formatTime(maxDialogueDurationSec)}
              </span>
            </div>

            <div
              className="space-y-3 max-h-72 overflow-y-auto"
              data-testid="dialogue-turns"
            >
              {turns.map((turn) => (
                <div
                  key={turn.id}
                  className={`flex gap-2 ${turn.role === 'student' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold
                      ${turn.role === 'ai' ? 'bg-purple-100 text-purple-700' : 'bg-primary-100 text-primary-700'}`}
                  >
                    {turn.role === 'ai' ? 'AI' : '나'}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed
                      ${turn.role === 'ai'
                        ? 'bg-purple-50 text-purple-900 border border-purple-100'
                        : 'bg-primary-50 text-primary-900 border border-primary-100'}`}
                    data-testid={turn.role === 'ai' ? 'ai-turn' : 'student-turn'}
                  >
                    {turn.text}
                    {turn.role === 'ai' && (
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        {playingTurnId === turn.id && ttsState === 'loading' && (
                          <span className="text-[10px] text-purple-500">준비 중...</span>
                        )}
                        {playingTurnId === turn.id && ttsState === 'playing' && (
                          <span className="text-[10px] text-purple-600 font-medium">재생 중</span>
                        )}
                        {playingTurnId === turn.id && ttsState === 'error' && (
                          <span className="text-[10px] text-amber-600">음성 재생을 다시 시도해 주세요.</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handlePlayAITurn(turn)}
                          disabled={playingTurnId === turn.id && ttsState === 'loading'}
                          className="text-[10px] text-purple-500 hover:text-purple-700 underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          data-testid="ai-replay-button"
                          aria-label="다시 듣기"
                        >
                          다시 듣기
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Controls */}
      <Card>
        <CardBody>
          {/* idle */}
          {panelStatus === 'idle' && (
            <div className="text-center py-4">
              <p className="text-sm text-text-secondary mb-4">
                준비가 되면 대화를 시작하세요. AI와 대화하며 미션을 달성하세요.
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={handleStart}
                data-testid="start-dialogue-button"
              >
                대화 시작
              </Button>
            </div>
          )}

          {/* ready — waiting for student to record */}
          {panelStatus === 'ready' && (
            <div className="space-y-3">
              {turnError && (
                <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-xs text-amber-700">{turnError}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  variant="primary"
                  onClick={handleStartRecording}
                  data-testid="record-turn-button"
                >
                  말하기
                </Button>
                {canSubmit && (
                  <Button
                    variant="secondary"
                    onClick={handleEndDialogue}
                    data-testid="end-dialogue-button"
                  >
                    대화 종료 및 제출
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* recording */}
          {panelStatus === 'recording' && (
            <div className="text-center py-4 space-y-3">
              {recorder.state === 'requesting' && (
                <p className="text-sm text-text-secondary">마이크 권한을 요청 중입니다…</p>
              )}
              {recorder.state === 'recording' && (
                <>
                  <div className="flex items-center justify-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-danger-500 animate-pulse" />
                    <span className="text-sm font-medium text-danger-500">녹음 중</span>
                    <span className="text-xs text-text-muted font-mono tabular-nums ml-1">
                      {formatTime(recorder.durationSec)}
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={handleStopRecording}
                    data-testid="stop-recording-button"
                  >
                    말하기 완료
                  </Button>
                </>
              )}
              {recorder.state === 'idle' && (
                <p className="text-xs text-text-muted">마이크 초기화 중…</p>
              )}
            </div>
          )}

          {/* recorded — review before sending */}
          {panelStatus === 'recorded' && (
            <div className="space-y-3">
              {isInvalidAudio && (
                <div
                  className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-md"
                  data-testid="short-recording-warning"
                >
                  <p className="text-xs text-amber-700">
                    {invalidAudioMessage}
                  </p>
                </div>
              )}
              {turnError && (
                <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-xs text-amber-700">{turnError}</p>
                </div>
              )}
              {recorder.blobUrl && !isInvalidAudio && (
                <div>
                  <p className="text-xs text-text-muted mb-1">녹음 확인 ({formatTime(recorder.durationSec)})</p>
                  <audio controls src={recorder.blobUrl} className="w-full max-w-sm mx-auto" style={{ minHeight: '44px' }} />
                </div>
              )}
              <div className="flex flex-wrap gap-2 justify-center">
                <Button variant="secondary" onClick={handleRetake}>
                  다시 녹음
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSendTurn}
                  disabled={isInvalidAudio}
                  data-testid="send-turn-button"
                >
                  AI에게 보내기
                </Button>
              </div>
            </div>
          )}

          {/* processing */}
          {panelStatus === 'processing' && (
            <div className="text-center py-4 space-y-2">
              <Button loading variant="primary" disabled>
                {processingMessage || '처리 중...'}
              </Button>
            </div>
          )}

          {/* completed */}
          {panelStatus === 'completed' && (
            <div className="text-center py-4 space-y-3">
              {submitError && (
                <p className="text-xs text-danger-500">제출 중 오류가 발생했습니다. 다시 시도해 주세요.</p>
              )}
              <p className="text-sm text-text-secondary">
                대화를 마쳤습니다. 제출하면 AI 평가가 시작됩니다.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button variant="secondary" onClick={() => setPanelStatus('ready')}>
                  대화 계속하기
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  data-testid="submit-dialogue-button"
                >
                  평가 제출하기
                </Button>
              </div>
            </div>
          )}

          {/* submitting */}
          {panelStatus === 'submitting' && (
            <div className="text-center py-4">
              <Button loading variant="primary" disabled>
                평가 중...
              </Button>
              <p className="mt-4 text-xs text-text-muted">
                AI가 대화를 평가하고 있습니다. 잠시 기다려주세요.
              </p>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
