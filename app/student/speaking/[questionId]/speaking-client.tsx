'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button, Card, CardBody, Badge, LangHint } from '@/src/components/ui'
import type { LangHintItem } from '@/src/components/ui'
import { submitSpeaking } from '../actions'
import type { ClientPronunciationResult } from '../actions'
import { logSingleTurnSession, modeFromQuestionTypeId } from '@/src/lib/research/client-logger'
import { useAudioRecorder } from '@/src/hooks/use-audio-recorder'
import { validateRecordedAudio, getAudioValidationMessage } from '@/src/lib/audio-validation'
import { useTTS } from '@/src/hooks/use-tts'
import { QuestionAssetRenderer } from '@/src/components/question-asset-renderer'
import type { StudentVisibleAsset } from '@/src/content/assessment-assets'
import { DialogueMissionPanel } from '@/src/components/dialogue-mission-panel'

type Phase = 'prep' | 'recording' | 'review' | 'submitting'

export type QuestionData = {
  id: string
  typeId: string
  title: string
  prompt: string
  prepTimeSec: number
  responseTimeSec: number
  difficulty: string
  typeLabel: string
  imageUrl: string
  imageAlt?: string
  imageCaption?: string
  imageLicenseNote?: string
  assetType?: string
  // asset registry — student-safe only (teacherOnlyNote は절대 포함하지 않음)
  assetMeta?: StudentVisibleAsset
  // listening_response — listenLimit & learner-facing elements only (never listeningScriptForTeacherOnly)
  listenLimit?: number
  learnerVisibleElements?: string[]
  // dialogue_mission — learner-facing only (never aiInformation)
  missionGoals?: string[]
  evaluationMode?: string
  maxDialogueDurationSec?: number
  aiFirstUtterance?: string
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

// 음성 안내 — 녹음 방법을 초급 학습자가 이해할 수 있는 짧은 한국어로 안내
const RECORDING_GUIDE_TEXT =
  '준비가 되면 준비 시작 버튼을 누르세요. ' +
  '녹음이 시작되면 한국어로 말하세요. ' +
  '말하기가 끝나면 녹음 완료 버튼을 누르세요. ' +
  '마지막으로 제출하기 버튼을 눌러 평가를 받으세요.'

// 녹음 안내 도움말 (다국어 텍스트)
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
  attemptId: incomingAttemptId,
  motherTongue,
}: {
  question: QuestionData
  questionSetId: string
  setName: string
  attemptId?: string
  motherTongue?: string | null
}) {
  const router = useRouter()
  const [attemptId] = useState(() => incomingAttemptId ?? crypto.randomUUID())
  const [phase, setPhase] = useState<Phase>('prep')
  const [prepRemaining, setPrepRemaining] = useState(question.prepTimeSec)
  const [prepStarted, setPrepStarted] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const [sttHallucinationError, setSttHallucinationError] = useState(false)
  // Detected once at mount; server always returns false (no navigator).
  const [isIOSSafari] = useState<boolean>(() => {
    if (typeof navigator === 'undefined') return false
    const ua = navigator.userAgent
    return /iP(hone|ad|od)/i.test(ua) && /^((?!chrome|android).)*safari/i.test(ua)
  })

  const recorder = useAudioRecorder()
  const tts = useTTS()
  // Track recording elapsed seconds independently so auto-stop still works
  const [recordingElapsed, setRecordingElapsed] = useState(0)
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Reactive blob size — populated when recorder.blobUrl is set after recording stops
  const [blobSize, setBlobSize] = useState<number | null>(null)

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

  // Track blob size reactively — needed for submit-button disabled check.
  // Only runs when blobUrl is non-null; isInvalidAudio guards on recorder.state==='stopped'
  // so a stale blobSize from a previous recording is harmless while state is 'idle'/'recording'.
  useEffect(() => {
    if (!recorder.blobUrl) return
    let active = true
    fetch(recorder.blobUrl)
      .then((r) => r.blob())
      .then((b) => { if (active) setBlobSize(b.size) })
      .catch(() => { if (active) setBlobSize(null) })
    return () => { active = false }
  }, [recorder.blobUrl])

  const handleStopRecording = useCallback(() => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current)
      autoStopTimerRef.current = null
    }
    recorder.stopRecording()
    // Phase transition happens via the effect above when recorder.state becomes 'stopped'
  }, [recorder])

  const audioValidation =
    recorder.state === 'stopped'
      ? validateRecordedAudio({ durationSec: recorder.durationSec, blobSize, audioStats: recorder.audioStats })
      : { valid: true as const }
  const isInvalidAudio = !audioValidation.valid
  const invalidAudioMessage =
    !audioValidation.valid
      ? getAudioValidationMessage(audioValidation.reason)
      : '녹음을 확인해 주세요.'

  const handleSubmit = useCallback(async () => {
    // Defense-in-depth: matches the disabled-button condition
    if (recorder.state === 'stopped') {
      const guard = validateRecordedAudio({ durationSec: recorder.durationSec, blobSize, audioStats: recorder.audioStats })
      if (!guard.valid) return
    }

    setPhase('submitting')
    setSubmitError(false)
    setSttHallucinationError(false)

    let sttTranscript: string | undefined
    let sttProviderName: string | undefined
    let sttHallucinationDetected = false
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

        // 23-h D-6: q2/q3 결과에도 Azure PA 점수를 표시. q1 낭독은 prompt를
        // referenceText로, q2/q3 자유 발화는 STT transcript를 referenceText로 사용.
        // STT가 PA의 referenceText를 결정하므로 STT를 먼저 실행하고 그 후 PA + Storage 병렬.
        try {
          const fd = new FormData()
          fd.append('audio', blob, 'recording.webm')
          fd.append('questionId', question.id)
          const res = await fetch('/api/stt', { method: 'POST', body: fd })
          if (res.ok) {
            const data = await res.json()
            if (typeof data?.transcript === 'string') sttTranscript = data.transcript
            if (typeof data?.providerName === 'string') sttProviderName = data.providerName
            if (data?.warning === 'stt_hallucination_filtered') sttHallucinationDetected = true
          }
        } catch {
          // STT failure is non-blocking — submitSpeaking uses mock fallback
        }

        // q1 낭독은 prompt에서 referenceText를 추출, q2/q3는 STT transcript를 사용.
        const isReadingType = question.typeId === 'qt-reading'
        let referenceText = ''
        if (isReadingType && question.prompt) {
          referenceText = question.prompt
          const idx = question.prompt.indexOf('\n\n')
          if (idx !== -1) {
            const candidate = question.prompt.slice(idx + 2).trim()
            if (candidate) referenceText = candidate
          }
        } else if (sttTranscript) {
          referenceText = sttTranscript.trim()
        }

        await Promise.allSettled([
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
          // Azure Pronunciation Assessment — q1 낭독 + q2/q3 자유발화 (transcript 기준)
          (async () => {
            if (!referenceText) return
            try {
              const fd = new FormData()
              fd.append('audio', blob, 'recording.webm')
              fd.append('referenceText', referenceText)
              const res = await fetch('/api/pronunciation-azure', { method: 'POST', body: fd })
              if (res.ok) {
                const data = await res.json()
                if (typeof data?.normalizedScore === 'number') {
                  pronunciationResult = {
                    normalizedScore: data.normalizedScore,
                    rawScore: undefined,
                    wordScores: [],
                    feedback: data.fallbackReason
                      ? '실시간 발음평가 연결을 확인 중입니다. 현재는 음성 인식 결과와 제시문 비교를 바탕으로 한 참고평가가 표시됩니다.'
                      : '발음평가 결과입니다.',
                    providerName: typeof data.providerName === 'string' ? data.providerName : 'demo',
                    latencyMs: typeof data.latencyMs === 'number' ? data.latencyMs : 0,
                    fallbackReason: typeof data.fallbackReason === 'string' ? data.fallbackReason : undefined,
                    pronScore: typeof data.pronScore === 'number' ? data.pronScore : null,
                    accuracyScore: typeof data.accuracyScore === 'number' ? data.accuracyScore : null,
                    fluencyScore: typeof data.fluencyScore === 'number' ? data.fluencyScore : null,
                    completenessScore: typeof data.completenessScore === 'number' ? data.completenessScore : null,
                    recognizedText: typeof data.recognizedText === 'string' ? data.recognizedText : undefined,
                    wordResults: Array.isArray(data.wordResults) ? data.wordResults : undefined,
                  }
                }
              }
            } catch {
              // Pronunciation failure is non-blocking — submitSpeaking uses demo fallback
            }
          })(),
        ])
      }
    }

    // Block submission if STT detected a hallucination transcript — re-record instead.
    if (sttHallucinationDetected) {
      setSttHallucinationError(true)
      setPhase('review')
      return
    }

    try {
      const { submissionId } = await submitSpeaking(question.id, questionSetId, {
        hasRecording: recorder.state === 'stopped' && recorder.blobUrl !== null,
        recordingDurationSec: recorder.durationSec,
        sttTranscript,
        sttProviderName,
        audioUrl,
        pronunciationResult,
        attemptId,
      })

      // v1.1 단계 10-5: 시험운영 로깅 — q1~q4 단일 턴 평가 세션 (fail-silent).
      void logSingleTurnSession({
        mode: modeFromQuestionTypeId(question.typeId),
        metaJson: {
          questionId: question.id,
          questionSetId,
          attemptId,
          submissionId,
          typeId: question.typeId,
        },
        learnerText: sttTranscript ?? '(전사 없음)',
        audioUrl: audioUrl ?? null,
        scoreTotal: pronunciationResult?.normalizedScore ?? null,
        scoresDetail: pronunciationResult
          ? {
              normalizedScore: pronunciationResult.normalizedScore,
              pronScore: pronunciationResult.pronScore,
              accuracyScore: pronunciationResult.accuracyScore,
              fluencyScore: pronunciationResult.fluencyScore,
              completenessScore: pronunciationResult.completenessScore,
              providerName: pronunciationResult.providerName,
              latencyMs: pronunciationResult.latencyMs,
            }
          : {},
        pronunciationData: pronunciationResult
          ? {
              recognizedText: pronunciationResult.recognizedText ?? null,
              wordResults: pronunciationResult.wordResults ?? null,
              fallbackReason: pronunciationResult.fallbackReason ?? null,
            }
          : null,
      })

      const resultParams = new URLSearchParams({ sub: submissionId, attemptId })
      router.push(`/student/speaking/${question.id}/result?${resultParams.toString()}`)
    } catch {
      setSubmitError(true)
      setPhase('review')
    }
  }, [question.id, question.prompt, question.typeId, questionSetId, attemptId, router, recorder.state, recorder.blobUrl, recorder.durationSec, recorder.audioStats, blobSize])

  const handleRetake = useCallback(() => {
    recorder.reset()
    setRecordingElapsed(0)
    setPhase('recording')
    setSubmitError(false)
  }, [recorder])

  const dVariant = difficultyVariant[question.difficulty] ?? 'default'
  const isDialogueMission =
    question.typeId === 'qt-dialogue-mission' ||
    question.evaluationMode === 'interactive_dialogue'
  const isReadingQuestion = question.typeId === 'qt-reading'

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
          <p
            className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap"
            style={isReadingQuestion ? { wordBreak: 'keep-all' } : undefined}
          >
            {question.prompt}
          </p>

          {/* 그림 묘사 문항 이미지 영역 */}
          {question.imageUrl ? (
            <div className="mt-4">
              <div
                className="relative w-full overflow-hidden rounded-md border border-border bg-surface"
                style={{ aspectRatio: '16/9' }}
                data-testid="question-image-container"
              >
                <Image
                  src={question.imageUrl}
                  alt={question.imageAlt || `${question.title} - 묘사할 그림`}
                  fill
                  className="object-contain"
                  priority
                  data-testid="question-image"
                />
              </div>
              {question.imageCaption && (
                <p className="mt-1.5 text-xs text-text-secondary text-center">
                  {question.imageCaption}
                </p>
              )}
            </div>
          ) : question.typeId === 'qt-picture' ? (
            <div className="mt-4 flex items-center justify-center rounded-md border border-dashed border-border bg-surface py-8">
              <p className="text-xs text-text-muted">그림 자료가 아직 등록되지 않았습니다.</p>
            </div>
          ) : null}

          {/* Official question asset — material_description / listening_response */}
          <QuestionAssetRenderer
            questionId={question.id}
            assetMeta={question.assetMeta}
            listenLimit={question.listenLimit}
          />

          {question.typeId === 'qt-dialogue-mission' && (
            <div className="mt-4 px-3 py-2.5 bg-purple-50 border border-purple-200 rounded-md">
              <p className="text-xs font-semibold text-purple-800 mb-1">
                AI와 대화하며 미션을 달성하는 평가입니다.
              </p>
              <p className="text-xs text-purple-700 leading-relaxed mb-2">
                아래 대화 패널에서 AI와 실시간으로 대화하며 미션을 완료하세요.
              </p>
              {question.missionGoals && question.missionGoals.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-purple-800 mb-1">미션 목표:</p>
                  <ul className="space-y-0.5">
                    {question.missionGoals.map((goal, i) => (
                      <li key={i} className="text-xs text-purple-700 flex items-center gap-1.5">
                        <span className="shrink-0 w-4 h-4 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                        {goal}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {question.maxDialogueDurationSec && (
                <p className="text-xs text-purple-600 mt-2">
                  대화 제한 시간: {formatTime(question.maxDialogueDurationSec)}
                </p>
              )}
            </div>
          )}
          {question.typeId === 'qt-listening-resp' && question.learnerVisibleElements && question.learnerVisibleElements.length > 0 && (
            // 23-h D-2: q3 미션 강조 박스 — 골드 테두리 + 큰 헤더 + 체크박스로 청중에게도 잘 보이게.
            <div
              data-testid="q3-mission-emphasis"
              className="mt-4 rounded-lg border-2"
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
                🎯 답변에 포함할 내용
              </p>
              <ul className="space-y-2">
                {question.learnerVisibleElements.map((el, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span
                      className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold mt-0.5 bg-white border-2"
                      style={{ borderColor: '#C49B4B', color: '#C49B4B' }}
                    >
                      {i + 1}
                    </span>
                    <span
                      className="text-sm leading-relaxed font-medium"
                      style={{ color: '#1F2D3D' }}
                    >
                      {el}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!isDialogueMission && (
            <div className="mt-4 flex items-center gap-4 text-xs text-text-muted">
              <span>준비 시간: {question.prepTimeSec}초</span>
              <span>답변 시간: {formatTime(question.responseTimeSec)}</span>
            </div>
          )}
          {QUESTION_HINTS[question.id] && (
            <LangHint items={QUESTION_HINTS[question.id]} label="모국어 도움말 보기" />
          )}

          {/* TTS 음성 안내 — dialogue_mission에서는 표시하지 않음 */}
          {!isDialogueMission && (
            <div className="mt-4 pt-3 border-t border-border">
              {tts.state === 'idle' || tts.state === 'error' ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => tts.play(question.prompt, question.id, 'question')}
                  >
                    문제 듣기
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => tts.play(RECORDING_GUIDE_TEXT, question.id, 'recording-guide')}
                  >
                    녹음 안내 듣기
                  </Button>
                </div>
              ) : tts.state === 'loading' ? (
                <Button variant="secondary" size="sm" loading disabled>
                  재생 준비 중
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">재생 중</span>
                  <Button variant="secondary" size="sm" onClick={tts.stop}>
                    정지
                  </Button>
                </div>
              )}
              {tts.errorMessage && (
                <p className="mt-2 text-xs text-text-muted">{tts.errorMessage}</p>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Prep phase */}
      {!isDialogueMission && phase === 'prep' && (
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

      {/* Recording phase — 23-h D-1: sticky bottom으로 본문 스크롤 시에도 항상 표시 */}
      {!isDialogueMission && phase === 'recording' && (
        <Card
          data-testid="speaking-recording-controls"
          className="sticky bottom-0 z-20"
          style={{
            backgroundColor: 'var(--color-background-primary, #FAF9F5)',
            boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.04)',
          }}
        >
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

      {/* Review phase — 23-h D-1: sticky bottom으로 다시 녹음/제출 버튼 항상 표시 */}
      {!isDialogueMission && phase === 'review' && (
        <Card
          data-testid="speaking-review-controls"
          className="sticky bottom-0 z-20"
          style={{
            backgroundColor: 'var(--color-background-primary, #FAF9F5)',
            boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.04)',
          }}
        >
          <CardBody>
            <div className="text-center py-6">
              {submitError && (
                <p className="text-xs text-danger-500 mb-4">
                  제출 중 오류가 발생했습니다. 다시 시도해주세요.
                </p>
              )}

              {/* STT hallucination detected — re-record */}
              {sttHallucinationError && (
                <div
                  className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-left"
                  data-testid="stt-hallucination-warning"
                >
                  <p className="text-xs text-amber-700 leading-relaxed">
                    <strong>음성이 감지되지 않았습니다.</strong>{' '}
                    마이크에 가까이 대고 다시 말해 주세요.
                  </p>
                </div>
              )}

              {/* Short/silent recording — blocks submission */}
              {isInvalidAudio && (
                <div
                  className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-left"
                  data-testid="short-recording-warning"
                >
                  <p className="text-xs text-amber-700 leading-relaxed">
                    {invalidAudioMessage}
                  </p>
                </div>
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
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={isInvalidAudio}
                  className="w-full sm:w-auto"
                >
                  제출하기
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Submitting phase */}
      {!isDialogueMission && phase === 'submitting' && (
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

      {/* Dialogue mission — 실제 AI 쌍방 대화 UI (Phase 10-E-5) */}
      {isDialogueMission && (
        <DialogueMissionPanel
          questionId={question.id}
          questionSetId={questionSetId}
          difficulty={question.difficulty}
          aiFirstUtterance={question.aiFirstUtterance ?? '안녕하세요.'}
          missionGoals={question.missionGoals ?? []}
          maxDialogueDurationSec={question.maxDialogueDurationSec ?? 180}
          attemptId={attemptId}
          motherTongue={motherTongue}
        />
      )}
    </div>
  )
}
