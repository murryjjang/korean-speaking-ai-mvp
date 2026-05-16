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
import {
  startResearchSession,
  endResearchSession,
  logUtterance,
  logAssessment,
} from '@/src/lib/research/client-logger'
import { PersonaAvatar } from '@/src/components/ui/persona-avatar'
import { BilingualText } from '@/src/components/ui/bilingual-text'

const MIN_VALID_BLOB_SIZE = 3000

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// 23-h D-3: 카페 메뉴판 카테고리 섹션. 항목명-점선 leader-가격 정렬로
// 실제 메뉴판에 가까운 시각을 만든다.
function CafeMenuSection({
  title,
  items,
}: {
  title: string
  items: Array<{ name: string; price: string }>
}) {
  return (
    <div className="mb-3 last:mb-0">
      <p
        className="text-xs font-semibold mb-1.5 pb-0.5"
        style={{ color: '#C49B4B', borderBottom: '1px dashed #D9C193' }}
      >
        {title}
      </p>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li
            key={i}
            className="flex items-baseline gap-2 text-sm"
            style={{ color: '#1F2D3D' }}
          >
            <span>{it.name}</span>
            <span
              className="flex-1 mx-1"
              style={{
                borderBottom: '1px dotted #B5A584',
                transform: 'translateY(-3px)',
              }}
              aria-hidden
            />
            <span className="font-medium tabular-nums">{it.price}</span>
          </li>
        ))}
      </ul>
    </div>
  )
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
  // v1.1 16-10-2: 학습자 모국어 — LLM 응답을 다국어로 받기 위해 전달.
  motherTongue?: string | null
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
  motherTongue,
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

  // v1.1 14-2: Q4 research 세션 상태 — mode==='assessment'일 때만 로깅.
  // free-conversation flow는 free-conversation-client.tsx에서 자체 로깅.
  const researchSessionIdRef = useRef<string | null>(null)
  const researchTurnCounterRef = useRef<number>(0)
  const researchEnabled = mode === 'assessment'

  // Stop TTS on unmount + close research session if still open
  useEffect(() => {
    return () => {
      ttsStop()
      const sid = researchSessionIdRef.current
      if (sid) {
        researchSessionIdRef.current = null
        void endResearchSession(sid)
      }
    }
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

    // v1.1 14-2: research 세션 시작 + opener 로깅 (fail-silent, q4_dialogue 모드만).
    if (researchEnabled) {
      researchSessionIdRef.current = null
      researchTurnCounterRef.current = 0
      void (async () => {
        const sid = await startResearchSession('q4_dialogue', {
          questionId,
          questionSetId,
          difficulty,
          attemptId,
          missionGoals,
          personaId,
        })
        if (!sid) return
        researchSessionIdRef.current = sid
        researchTurnCounterRef.current = 1
        await logUtterance({
          sessionId: sid,
          turnNumber: 1,
          speaker: 'npc',
          text: aiFirstUtterance,
        })
      })()
    }
  }, [aiFirstUtterance, ttsPlay, questionId, personaId, researchEnabled, questionSetId, difficulty, attemptId, missionGoals])

  const handleStartRecording = useCallback(() => {
    recorder.reset()
    setBlobSize(null)
    setTurnError(null)
    setPanelStatus('recording')
  }, [recorder])

  const handleStopRecording = useCallback(() => {
    recorder.stopRecording()
    // State transition to 'recorded' happens via the useEffect above
    // 23-h D-4: 자동 전송 — handleSendTurn은 'recorded' state로 진입한 뒤
    // 별도 effect에서 자동 호출된다.
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

    // 23-h D-6: 학습자 발화에 Azure PA 호출 — 정답 스크립트가 없는 자유 대화이므로
    // 학습자 자신의 transcript를 referenceText로 사용한다. 결과 화면 평균 산출용.
    // 비차단(별도 await): PA 실패해도 대화 흐름은 진행.
    const studentTurnId = `turn-student-${Date.now()}`
    const paPromise: Promise<number | null> = (async () => {
      try {
        const fd = new FormData()
        fd.append('audio', audioBlob, 'recording.webm')
        fd.append('referenceText', transcript)
        const res = await fetch('/api/pronunciation-azure', { method: 'POST', body: fd })
        if (!res.ok) return null
        const data = await res.json()
        if (typeof data?.pronScore === 'number') return Math.round(data.pronScore)
        if (typeof data?.normalizedScore === 'number') return Math.round(data.normalizedScore)
        return null
      } catch {
        return null
      }
    })()

    // Add student turn (pronScore 비동기 부착)
    const studentTurn: DialogueTurn = {
      id: studentTurnId,
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

    // v1.1 14-2 / 14-4: 학습자 발화 로깅 (fail-silent). 발음 점수는 비동기로 도착.
    const learnerTurnNumber = researchTurnCounterRef.current + 1
    if (researchEnabled && researchSessionIdRef.current) {
      researchTurnCounterRef.current = learnerTurnNumber
      const sid = researchSessionIdRef.current
      void logUtterance({
        sessionId: sid,
        turnNumber: learnerTurnNumber,
        speaker: 'learner',
        text: transcript,
        metaJson: {
          sttProviderName,
          intent: studentTurn.intent,
          durationSec: recorder.durationSec,
        },
      })
    }

    // PA 결과가 도착하면 해당 turn에 pronScore를 비동기로 부착 + 발음 평가 로깅
    void paPromise.then((score) => {
      if (score == null) return
      setTurns((prev) => prev.map((t) => (t.id === studentTurnId ? { ...t, pronScore: score } : t)))
      // v1.1 14-4: 발음 평가 결과를 research_assessments에 누적 기록 (fail-silent).
      const sid = researchSessionIdRef.current
      if (researchEnabled && sid) {
        void logAssessment({
          sessionId: sid,
          mode: 'q4_dialogue',
          scoreTotal: score,
          scoresDetail: {
            type: 'pronunciation_turn',
            turnNumber: learnerTurnNumber,
            pronScore: score,
          },
        })
      }
    })

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
          motherTongue,
        }),
        signal: dialogueAbort.signal,
      })
      clearTimeout(dialogueTimeout)

      let aiText = '네, 알겠습니다.'
      let aiProvider = 'fallback'
      let learnerGrammarNote: import('@/src/providers/conversation').MultilingualNote = ''
      if (res.ok) {
        const data = await res.json()
        if (typeof data?.aiText === 'string' && data.aiText) aiText = data.aiText
        if (typeof data?.providerName === 'string') aiProvider = data.providerName
        if (typeof data?.learnerGrammarNote === 'string' && data.learnerGrammarNote.trim()) {
          learnerGrammarNote = data.learnerGrammarNote.trim()
        } else if (data?.learnerGrammarNote && typeof data.learnerGrammarNote === 'object') {
          const g = data.learnerGrammarNote as Record<string, unknown>
          const pick = (k: string) => (typeof g[k] === 'string' ? (g[k] as string).trim() : '')
          const obj = { ko: pick('ko'), en: pick('en'), vi: pick('vi'), ar: pick('ar') }
          if (obj.ko || obj.en || obj.vi || obj.ar) learnerGrammarNote = obj
        }
      }

      // v1.1 15-2 / 16-10-2: 학습자 turn에 NPC가 반환한 문법 교정 안내(다국어 가능) 부착.
      const hasNote =
        (typeof learnerGrammarNote === 'string' && learnerGrammarNote) ||
        (typeof learnerGrammarNote === 'object' &&
          (learnerGrammarNote.ko || learnerGrammarNote.en || learnerGrammarNote.vi || learnerGrammarNote.ar))
      if (hasNote) {
        const note = learnerGrammarNote
        setTurns((prev) => prev.map((t) => (t.id === studentTurnId ? { ...t, grammarNote: note } : t)))
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

      // v1.1 14-2: NPC 응답 로깅 (fail-silent).
      const npcTurnNumber = researchTurnCounterRef.current + 1
      if (researchEnabled && researchSessionIdRef.current) {
        researchTurnCounterRef.current = npcTurnNumber
        const sid = researchSessionIdRef.current
        void logUtterance({
          sessionId: sid,
          turnNumber: npcTurnNumber,
          speaker: 'npc',
          text: aiText,
          metaJson: { providerName: aiProvider },
        })
      }
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

      const npcTurnNumber = researchTurnCounterRef.current + 1
      if (researchEnabled && researchSessionIdRef.current) {
        researchTurnCounterRef.current = npcTurnNumber
        const sid = researchSessionIdRef.current
        void logUtterance({
          sessionId: sid,
          turnNumber: npcTurnNumber,
          speaker: 'npc',
          text: fallbackText,
          metaJson: { providerName: 'fallback' },
        })
      }
    }

    recorder.reset()
    setBlobSize(null)
    setTurnError(null)
    setPanelStatus('ready')
  }, [recorder, blobSize, turns, questionId, difficulty, ttsPlay, mode, personaId, researchEnabled, motherTongue])

  const handleEndDialogue = useCallback(() => {
    if (!canSubmit) return
    setPanelStatus('completed')
  }, [canSubmit])

  // 23-h D-4: 'recorded' state로 진입하면 자동 전송. 에러/짧은 녹음은 제외.
  // blobSize가 비동기로 로드되므로 isInvalidAudio가 안정될 때까지 기다린 뒤 호출.
  const autoSendTriggeredRef = useRef(false)
  useEffect(() => {
    if (panelStatus !== 'recorded') {
      autoSendTriggeredRef.current = false
      return
    }
    if (recorder.state === 'error') return
    if (turnError) return
    // blobSize가 아직 도착 전이면 다음 렌더에서 다시 시도
    if (blobSize === null) return
    if (isInvalidAudio) return
    if (autoSendTriggeredRef.current) return
    autoSendTriggeredRef.current = true
    // queueMicrotask로 effect 본체에서 직접 setState 회피
    queueMicrotask(() => { void handleSendTurn() })
  }, [panelStatus, recorder.state, turnError, blobSize, isInvalidAudio, handleSendTurn])

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return
    setPanelStatus('submitting')
    setSubmitError(false)

    try {
      const { submissionId } = await submitDialogue(questionId, questionSetId, {
        turns,
        goalResults,
        attemptId,
        motherTongue,
      })

      // v1.1 14-2 / 14-3: 미션 완수 후 종합 평가 누적 + 세션 종료 (fail-silent).
      const sid = researchSessionIdRef.current
      if (researchEnabled && sid) {
        const achievedCount = goalResults.filter((g) => g.achieved).length
        const totalCount = goalResults.length
        const studentTurns = turns.filter((t) => t.role === 'student')
        const pronScores = studentTurns
          .map((t) => t.pronScore)
          .filter((s): s is number => typeof s === 'number')
        const avgPron =
          pronScores.length > 0
            ? Math.round(pronScores.reduce((a, b) => a + b, 0) / pronScores.length)
            : null
        await logAssessment({
          sessionId: sid,
          mode: 'q4_dialogue',
          scoreTotal: avgPron,
          scoresDetail: {
            type: 'mission_summary',
            submissionId,
            missionGoalsAchieved: achievedCount,
            missionGoalsTotal: totalCount,
            goalResults: goalResults.map((g) => ({
              goalIndex: g.goalIndex,
              labelKo: g.labelKo,
              achieved: g.achieved,
            })),
            avgPronScore: avgPron,
            learnerTurnCount: studentTurns.length,
          },
        })
        researchSessionIdRef.current = null
        await endResearchSession(sid)
      }

      const resultParams = new URLSearchParams({ sub: submissionId })
      if (attemptId) resultParams.set('attemptId', attemptId)
      router.push(`/student/speaking/${questionId}/result?${resultParams.toString()}`)
    } catch {
      setSubmitError(true)
      setPanelStatus('completed')
    }
  }, [canSubmit, questionId, questionSetId, attemptId, turns, goalResults, router, researchEnabled, motherTongue])

  // 시간 종료 자동 제출 — 타이머가 maxDialogueDurationSec에 도달하면
  // 1) 진행 중 녹음을 중단하고
  // 2) 유효한 학습자 발화가 있으면 즉시 제출 → 결과 페이지로 이동
  // 3) 없으면 'completed' 상태로 동결 (입력 불가)
  // processing 중이면 끝나길 기다린 뒤 다시 트리거됨.
  const timeUp = elapsedSec >= maxDialogueDurationSec
  const autoSubmitTriggered = useRef(false)

  useEffect(() => {
    if (!timeUp) return
    if (autoSubmitTriggered.current) return
    if (panelStatus === 'idle' || panelStatus === 'submitting') return

    if (panelStatus === 'recording' && recorder.state === 'recording') {
      recorder.stopRecording()
      return
    }

    if (panelStatus === 'processing') return

    autoSubmitTriggered.current = true

    const t = setTimeout(() => {
      if (canSubmit) {
        void handleSubmit()
      } else {
        setPanelStatus('completed')
      }
    }, 0)
    return () => clearTimeout(t)
  }, [timeUp, panelStatus, canSubmit, handleSubmit, recorder])

  const isCafeScenario = questionId.includes('beginner') && questionId.includes('q4')
  // 23-i 추가-2: 시나리오별 NPC 라벨. 카페 미션 → "직원". 그 외는 "AI" 유지.
  const npcRoleLabel = isCafeScenario ? '직원' : 'AI'

  return (
    <div className="space-y-4" data-testid="dialogue-mission-panel">
      {/* 23-h D-3: 카페 메뉴판 — 청중에게 실제 카페 시뮬레이션처럼 보이도록 디자인 강화.
          크림 배경 + 골드 테두리 + 헤더 + dot leader. */}
      {isCafeScenario && (
        <div
          data-testid="cafe-menu-board"
          className="rounded-xl border-2 shadow-sm"
          style={{
            backgroundColor: '#FBF8F3',
            borderColor: '#C49B4B',
            padding: '20px 24px',
          }}
        >
          <div className="text-center mb-3">
            <p
              className="font-bold tracking-[0.3em]"
              style={{ color: '#1F2D3D', fontSize: '1.25rem', letterSpacing: '0.3em' }}
            >
              MENU
            </p>
            <p className="text-[11px] uppercase tracking-widest" style={{ color: '#C49B4B' }}>
              메뉴판
            </p>
          </div>

          <CafeMenuSection
            title="☕ 음료"
            items={[
              { name: '아이스 아메리카노', price: '3,000원' },
              { name: '따뜻한 아메리카노', price: '3,000원' },
              { name: '아이스 라테', price: '3,500원' },
              { name: '따뜻한 라테', price: '3,500원' },
              { name: '오렌지 주스', price: '4,000원' },
            ]}
          />
          <CafeMenuSection
            title="🍰 디저트"
            items={[
              { name: '팥빙수', price: '6,000원' },
              { name: '조각 케이크', price: '5,000원' },
            ]}
          />
        </div>
      )}

      {/* 23-h D-2: 미션 목표 강조 박스 — 골드 테두리 + 큰 헤더 + 체크박스로 청중에게도 잘 보이게. */}
      <div
        data-testid="mission-emphasis-box"
        className="rounded-lg border-2"
        style={{
          backgroundColor: '#FFFBEB',
          borderColor: '#C49B4B',
          padding: '16px 20px',
        }}
      >
        <p
          className="font-bold mb-3"
          style={{ color: '#1F2D3D', fontSize: '1.125rem' }}
        >
          🎯 미션 목표
        </p>
        <ul className="space-y-2">
          {goalResults.map((g) => (
            <li key={g.goalIndex} className="flex items-start gap-2.5">
              <span
                className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold mt-0.5
                  ${g.achieved
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white border-2 text-text-muted'}`}
                style={!g.achieved ? { borderColor: '#C49B4B' } : undefined}
                data-testid={g.achieved ? 'goal-achieved' : 'goal-pending'}
              >
                {g.achieved ? '✓' : g.goalIndex + 1}
              </span>
              <span
                className={`text-sm leading-relaxed font-medium ${g.achieved ? 'line-through opacity-70' : ''}`}
                style={{ color: '#1F2D3D' }}
              >
                {g.labelKo}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Dialogue conversation area */}
      {panelStatus !== 'idle' && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                대화
              </p>
              <span
                className={`text-xs font-mono tabular-nums ${
                  timeUp
                    ? 'text-danger-600 font-semibold'
                    : maxDialogueDurationSec - elapsedSec <= 10
                      ? 'text-danger-500'
                      : 'text-text-muted'
                }`}
                data-testid="dialogue-timer"
              >
                {formatTime(Math.min(elapsedSec, maxDialogueDurationSec))} / {formatTime(maxDialogueDurationSec)}
              </span>
            </div>
            {timeUp && (
              <div
                className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md"
                data-testid="dialogue-time-up-notice"
              >
                <p className="text-xs text-amber-700">
                  시간이 종료되어 자동 제출됩니다.
                </p>
              </div>
            )}

            <div
              className="space-y-3 max-h-72 overflow-y-auto"
              data-testid="dialogue-turns"
            >
              {turns.map((turn) => (
                <div
                  key={turn.id}
                  className={`flex gap-2 ${turn.role === 'student' ? 'flex-row-reverse' : ''}`}
                >
                  {/* v1.1 25-1: AI 턴에는 페르소나 아바타, 학습자 턴에는 기존 '나' 배지. */}
                  {turn.role === 'ai' && personaId ? (
                    <PersonaAvatar personaId={personaId} size={28} className="shrink-0" alt={npcRoleLabel} />
                  ) : (
                    <div
                      className={`shrink-0 px-1.5 h-6 min-w-6 rounded-full flex items-center justify-center text-[10px] font-bold
                        ${turn.role === 'ai' ? 'bg-purple-100 text-purple-700' : 'bg-primary-100 text-primary-700'}`}
                    >
                      {turn.role === 'ai' ? npcRoleLabel : '나'}
                    </div>
                  )}
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
                    {/* v1.1 15-2: 학습자 turn 옆 — 교정 안내 + 발음 점수 + (있다면) 교정 노트 */}
                    {turn.role === 'student' && (
                      <div className="mt-1.5 flex flex-col items-end gap-1">
                        {typeof turn.pronScore === 'number' && (
                          <span
                            className="text-[10px] text-primary-700 font-medium"
                            data-testid="student-pron-score"
                          >
                            발음 정확도 {turn.pronScore}/100
                          </span>
                        )}
                        {turn.grammarNote && (() => {
                          // v1.1 단계 19.6 [D7]: 한국어 본문 + (보조 언어 != ko이고
                          // 다국어 grammar_note가 있으면) 작은 글씨 보조. inline 변형.
                          const ko =
                            typeof turn.grammarNote === 'string'
                              ? turn.grammarNote
                              : (turn.grammarNote.ko ?? '').trim()
                          if (!ko) return null
                          const multilingual =
                            typeof turn.grammarNote === 'object' && turn.grammarNote
                              ? {
                                  ko,
                                  en: turn.grammarNote.en,
                                  vi: turn.grammarNote.vi,
                                  ar: turn.grammarNote.ar,
                                }
                              : null
                          return (
                            <span
                              className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 max-w-full inline-block"
                              data-testid="student-grammar-note"
                            >
                              <span className="font-medium me-1">교정:</span>
                              <BilingualText
                                ko={ko}
                                multilingual={multilingual}
                                motherTongueHint={motherTongue}
                                inline
                                className="align-middle"
                              />
                            </span>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Controls — 23-i 보정-2: sticky bottom으로 메뉴판/대화 스크롤 시에도 항상 보이게 */}
      <Card
        data-testid="dialogue-controls"
        className="sticky bottom-0 z-20"
        style={{
          backgroundColor: 'var(--color-background-primary, #FAF9F5)',
          boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.04)',
        }}
      >
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
                  disabled={timeUp}
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
                {/* 23-h D-4: 자동 전송 활성. 검증 실패 시에만 수동 전송 버튼 노출. */}
                {isInvalidAudio && (
                  <Button
                    variant="primary"
                    onClick={handleSendTurn}
                    disabled
                    data-testid="send-turn-button"
                  >
                    AI에게 보내기
                  </Button>
                )}
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
                {!timeUp && (
                  <Button variant="secondary" onClick={() => setPanelStatus('ready')}>
                    대화 계속하기
                  </Button>
                )}
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
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
