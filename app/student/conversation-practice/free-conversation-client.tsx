'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Card, CardHeader, CardBody, Badge } from '@/src/components/ui'

// 클라이언트 마운트 후 speechSynthesis 지원 여부를 동기적으로 노출.
// useEffect + setState 패턴은 React 19 react-hooks/set-state-in-effect 룰에 걸림.
const subscribeNoop = () => () => {}
const getTtsSupportedSnapshot = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window
const getTtsSupportedServerSnapshot = () => false

// 추천 주제 5개
const RECOMMENDED_TOPICS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'weekend-place', label: '주말에 가볼 만한 명소 추천' },
  { id: 'korean-food', label: '한국 음식 추천' },
  { id: 'movies', label: '좋아하는 영화 이야기' },
  { id: 'korea-trip', label: '한국 여행 계획' },
  { id: 'family', label: '가족 이야기' },
]

const TOTAL_SECONDS = 600 // 10분
const WARNING_AT = 480 // 8분 (남은 2분 경고)
const VOICE_AUTO_SEND_SECONDS = 3 // 음성 입력 후 자동 전송 카운트다운 (취소 가능)

type ChatTurn = {
  role: 'ai' | 'student'
  text: string
  correction?: { original: string; corrected: string; reason: string }
}

type Stage = 'start' | 'chat' | 'end'

type SummaryFeedback = { strengths: string[]; next_steps: string[] }
type SummaryResult = {
  source: 'llm' | 'mock'
  summary_ko: string
  summary_vi: string
  summary_en: string
  feedback_ko: SummaryFeedback
  feedback_vi: SummaryFeedback
  feedback_en: SummaryFeedback
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function buildOpener(topic: string): string {
  return `"${topic}"이라는 주제로 이야기해볼까요? 어떻게 시작할까요?`
}

export function FreeConversationClient() {
  const [stage, setStage] = useState<Stage>('start')
  const [topic, setTopic] = useState('')
  const [customTopic, setCustomTopic] = useState('')

  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)

  // Timer
  const [elapsed, setElapsed] = useState(0)
  const elapsedRef = useRef(0)
  const [warned, setWarned] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [timeUp, setTimeUp] = useState(false)

  // Summary
  const [summary, setSummary] = useState<SummaryResult | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  // Phase C: 음성 입력 (q4·발표 STT 패턴 재사용)
  type VoiceState = 'idle' | 'recording' | 'processing'
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [voiceElapsed, setVoiceElapsed] = useState(0)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const voiceTickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 명세 23-b 1-B: NPC 음성 출력 (브라우저 TTS)
  const ttsSupported = useSyncExternalStore(
    subscribeNoop,
    getTtsSupportedSnapshot,
    getTtsSupportedServerSnapshot,
  )
  const [ttsAutoPlay, setTtsAutoPlay] = useState(true)
  const [speakingTurnIdx, setSpeakingTurnIdx] = useState<number | null>(null)

  // 명세 23-b 1-C / 23-d Phase C: 음성 입력 후 3초 카운트다운 자동 전송 (취소 가능).
  // - autoSendTimerRef: 실제 전송 setTimeout (클로저로 text 캡처 → stale 안 됨).
  // - visualTimerRef: 카운트다운 시각 표시 setInterval (전송 로직과 분리).
  const [autoSendCountdown, setAutoSendCountdown] = useState<number | null>(null)
  const autoSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const visualTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const chatScrollRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll on new turn
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [turns])

  // Timer (only during chat stage)
  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // ── 종료: LLM 요약 호출 + end 단계 진입 ───────────────────────────────────
  const endConversation = useCallback(async (currentTurns: ChatTurn[], currentTopic: string) => {
    stopTimer()
    setStage('end')
    setSummaryLoading(true)
    try {
      const apiTurns = currentTurns.map((t) => ({ role: t.role, text: t.text }))
      const res = await fetch('/api/conversation/free/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: currentTopic, turns: apiTurns }),
      })
      if (!res.ok) throw new Error(`status_${res.status}`)
      const data = (await res.json()) as SummaryResult
      setSummary(data)
    } catch (err) {
      console.error('[free-conversation] summary error', err)
      // 폴백: 최소한의 종료 안내
      setSummary({
        source: 'mock',
        summary_ko: '대화가 종료되었습니다.',
        summary_vi: 'Cuộc trò chuyện đã kết thúc.',
        summary_en: 'The conversation has ended.',
        feedback_ko: { strengths: ['대화에 끝까지 참여했습니다.'], next_steps: ['다음에 더 다양한 표현을 시도해 보세요.'] },
        feedback_vi: { strengths: ['Bạn đã tham gia cuộc trò chuyện đến cuối.'], next_steps: ['Lần sau hãy thử dùng nhiều cách diễn đạt hơn.'] },
        feedback_en: { strengths: ['You stayed engaged through the whole chat.'], next_steps: ['Next time try a wider variety of expressions.'] },
      })
    } finally {
      setSummaryLoading(false)
    }
  }, [stopTimer])

  useEffect(() => {
    if (stage !== 'chat') return
    intervalRef.current = setInterval(() => {
      elapsedRef.current += 1
      setElapsed(elapsedRef.current)
      if (elapsedRef.current === WARNING_AT) {
        setWarned(true)
      }
      if (elapsedRef.current >= TOTAL_SECONDS) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        setTimeUp(true)
      }
    }, 1000)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [stage])

  // 컴포넌트 언마운트 시 음성 녹음 인터벌 + TTS 정리
  useEffect(() => {
    return () => {
      if (voiceTickRef.current) {
        clearInterval(voiceTickRef.current)
        voiceTickRef.current = null
      }
      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current)
        autoSendTimerRef.current = null
      }
      if (visualTimerRef.current) {
        clearInterval(visualTimerRef.current)
        visualTimerRef.current = null
      }
      const mr = mediaRecorderRef.current
      if (mr && mr.state === 'recording') {
        try { mr.stop() } catch { /* noop */ }
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try { window.speechSynthesis.cancel() } catch { /* noop */ }
      }
    }
  }, [])

  // ── 음성 입력 후 자동 전송 카운트다운 (Phase 1-C / 23-d Phase C) ────────────
  const cancelAutoSend = useCallback(() => {
    if (autoSendTimerRef.current) {
      clearTimeout(autoSendTimerRef.current)
      autoSendTimerRef.current = null
    }
    if (visualTimerRef.current) {
      clearInterval(visualTimerRef.current)
      visualTimerRef.current = null
    }
    setAutoSendCountdown(null)
  }, [])

  // 최신 sendMessageWithText 참조를 ref로 보관해 setTimeout 콜백에서 호출.
  // (text는 클로저로 캡처하므로 stale X — ref는 함수 참조 자체만 최신화.)
  const sendMessageWithTextRef = useRef<((text: string) => void | Promise<void>) | null>(null)

  // ── NPC TTS (Phase 1-B) ──────────────────────────────────────────────────
  // 학습자 녹음 중에는 음성 출력 안 함 (충돌 방지). 종료 화면(stage='end')에서도 재생 안 함.
  const stopSpeaking = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    try { window.speechSynthesis.cancel() } catch { /* noop */ }
    setSpeakingTurnIdx(null)
  }, [])

  // 명세 23-c Phase 7 / 23-d Phase B: 자연스러운 한국어 음성 우선 선택. getVoices()는
  // 처음에 빈 배열일 수 있어 voiceschanged 이벤트 후 다시 가져오고 ref에 캐시한다.
  // 23-d Phase B: 첫 NPC opener 자동 재생을 위해 voiceReady state로도 노출 — 마운트
  // 시점에 voice 캐시가 비어 있어 opener 재생이 누락되는 문제 해결.
  const koVoiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const [voiceReady, setVoiceReady] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const synth = window.speechSynthesis
    const PREFERRED = ['Heami', 'InJoon', 'SunHi', 'Yuna', '한국의', 'Korean'] as const
    const pickVoice = (fromEvent: boolean) => {
      const voices = synth.getVoices()
      if (voices.length === 0) return
      const koVoices = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('ko'))
      let chosen: SpeechSynthesisVoice | undefined
      if (koVoices.length > 0) {
        for (const tag of PREFERRED) {
          chosen = koVoices.find((v) => v.name.includes(tag))
          if (chosen) break
        }
        if (!chosen) chosen = koVoices.find((v) => v.lang.toLowerCase() === 'ko-kr')
        if (!chosen) chosen = koVoices[0]
      }
      koVoiceRef.current = chosen ?? null
      // 한국어 voice가 없어도 utt.lang='ko-KR'로 fallback 가능하므로 ready 처리.
      if (fromEvent) {
        setVoiceReady(true)
      } else {
        // 마운트 effect 본체에서의 setState 회피 (React 19 set-state-in-effect 룰).
        queueMicrotask(() => setVoiceReady(true))
      }
    }
    pickVoice(false)
    const onChanged = () => pickVoice(true)
    synth.addEventListener?.('voiceschanged', onChanged)
    return () => {
      synth.removeEventListener?.('voiceschanged', onChanged)
    }
  }, [])

  const speakText = useCallback((text: string, turnIdx: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    try {
      window.speechSynthesis.cancel()
      const utt = new SpeechSynthesisUtterance(text)
      utt.lang = 'ko-KR'
      // 살짝 빠르게 + 자연스러운 한국어 음성 선택 (사용 가능 시).
      utt.rate = 1.05
      utt.pitch = 1.0
      utt.volume = 1.0
      if (koVoiceRef.current) utt.voice = koVoiceRef.current
      utt.onend = () => {
        setSpeakingTurnIdx((cur) => (cur === turnIdx ? null : cur))
      }
      utt.onerror = () => {
        setSpeakingTurnIdx((cur) => (cur === turnIdx ? null : cur))
      }
      setSpeakingTurnIdx(turnIdx)
      window.speechSynthesis.speak(utt)
    } catch {
      setSpeakingTurnIdx(null)
    }
  }, [])

  // 명세 23-d Phase B: 첫 NPC opener 자동 재생.
  // 기존 sendMessageWithText 안의 자동 재생은 LLM 응답에만 적용되어, 주제 선택
  // 직후 노출되는 opener 메시지가 음성으로 재생되지 않았다. voiceReady · stage ·
  // ttsAutoPlay가 모두 충족된 시점에 opener를 한 번만 재생한다.
  const openerSpokenRef = useRef(false)
  useEffect(() => {
    if (stage !== 'chat') {
      // 다음 세션에서 다시 자동 재생되도록 리셋.
      openerSpokenRef.current = false
      return
    }
    if (openerSpokenRef.current) return
    if (!ttsSupported || !ttsAutoPlay || !voiceReady) return
    if (voiceState !== 'idle') return
    const opener = turns[0]
    if (!opener || opener.role !== 'ai') return
    openerSpokenRef.current = true
    // effect 본체에서의 setState 회피 — speakText 내부에서 setSpeakingTurnIdx 호출.
    queueMicrotask(() => speakText(opener.text, 0))
  }, [stage, ttsSupported, ttsAutoPlay, voiceReady, voiceState, turns, speakText])

  // ── 시작 ──────────────────────────────────────────────────────────────────
  const startConversation = useCallback((selectedTopic: string) => {
    const t = selectedTopic.trim()
    if (!t) return
    setTopic(t)
    setTurns([{ role: 'ai', text: buildOpener(t) }])
    elapsedRef.current = 0
    setElapsed(0)
    setWarned(false)
    setTimeUp(false)
    setSummary(null)
    setChatError(null)
    setStage('chat')
  }, [])

  // ── 발화 전송 ─────────────────────────────────────────────────────────────
  const sendMessageWithText = useCallback(async (rawText: string) => {
    const trimmed = rawText.trim()
    if (!trimmed || sending) return
    if (trimmed.length > 1000) {
      setChatError('한 번에 1000자까지만 입력할 수 있어요.')
      return
    }
    cancelAutoSend()
    setChatError(null)
    setSending(true)

    const studentTurn: ChatTurn = { role: 'student', text: trimmed }
    const nextTurns = [...turns, studentTurn]
    setTurns(nextTurns)
    setInput('')

    try {
      const apiTurns = turns.map((t) => ({ role: t.role, text: t.text }))
      const res = await fetch('/api/conversation/free/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          turns: apiTurns,
          latestStudentText: trimmed,
        }),
      })
      if (!res.ok) throw new Error(`status_${res.status}`)
      const data = await res.json() as {
        source: 'llm' | 'mock'
        npc_response: string
        learner_correction?: { original: string; corrected: string; reason: string }
      }
      const finalTurns: ChatTurn[] = [
        ...nextTurns.slice(0, -1),
        { ...studentTurn, correction: data.learner_correction },
        { role: 'ai', text: data.npc_response },
      ]
      setTurns(finalTurns)
      // NPC 응답 자동 재생: 학습자가 녹음 중이 아닐 때만 (충돌 방지).
      if (
        ttsAutoPlay &&
        typeof window !== 'undefined' &&
        'speechSynthesis' in window &&
        voiceState === 'idle'
      ) {
        speakText(data.npc_response, finalTurns.length - 1)
      }
    } catch (err) {
      console.error('[free-conversation] respond error', err)
      setChatError('잠시 후 다시 시도해주세요.')
      setTurns([
        ...nextTurns,
        { role: 'ai', text: '죄송해요, 잠시 연결이 어려웠어요. 다시 한 번 말씀해 주실래요?' },
      ])
    } finally {
      setSending(false)
    }
  }, [sending, turns, topic, cancelAutoSend, ttsAutoPlay, voiceState, speakText])

  const sendMessage = useCallback(() => sendMessageWithText(input), [sendMessageWithText, input])

  // 최신 sendMessageWithText를 ref에 동기화 — setInterval/setTimeout 콜백에서 호출.
  useEffect(() => {
    sendMessageWithTextRef.current = sendMessageWithText
  }, [sendMessageWithText])

  // 명세 23-d Phase C: 자동 전송은 setTimeout 클로저로 직접 트리거 (아래 startAutoSendCountdown).
  // useEffect / queueMicrotask / pending text ref 의존을 모두 제거 — 23-c 구현이 실제 환경에서
  // 자동 전송이 발화되지 않는 회귀를 보였기 때문. 카운트다운 시각 표시는 별도 setInterval로 분리.
  const startAutoSendCountdown = useCallback((text: string) => {
    if (!text || !text.trim()) return
    // 기존 타이머 정리.
    if (autoSendTimerRef.current) {
      clearTimeout(autoSendTimerRef.current)
      autoSendTimerRef.current = null
    }
    if (visualTimerRef.current) {
      clearInterval(visualTimerRef.current)
      visualTimerRef.current = null
    }

    // 시각 카운트다운: 1초마다 감소 표시.
    setAutoSendCountdown(VOICE_AUTO_SEND_SECONDS)
    let n = VOICE_AUTO_SEND_SECONDS
    visualTimerRef.current = setInterval(() => {
      n -= 1
      if (n <= 0) {
        if (visualTimerRef.current) {
          clearInterval(visualTimerRef.current)
          visualTimerRef.current = null
        }
        setAutoSendCountdown(0)
      } else {
        setAutoSendCountdown(n)
      }
    }, 1000)

    // 실제 전송: setTimeout 클로저로 text 캡처. ref 통해 최신 함수 호출.
    autoSendTimerRef.current = setTimeout(() => {
      autoSendTimerRef.current = null
      if (visualTimerRef.current) {
        clearInterval(visualTimerRef.current)
        visualTimerRef.current = null
      }
      setAutoSendCountdown(null)
      const fn = sendMessageWithTextRef.current
      if (fn) void fn(text)
    }, VOICE_AUTO_SEND_SECONDS * 1000)
  }, [])

  // ── 음성 입력 (Phase C) ──────────────────────────────────────────────────
  // q4·발표 STT 패턴과 동일: MediaRecorder → Blob → POST /api/stt → transcript.
  // 인식 결과는 input textarea에 자동 입력하고, 학습자가 확인·수정 후 전송한다.
  const stopVoiceTick = useCallback(() => {
    if (voiceTickRef.current) {
      clearInterval(voiceTickRef.current)
      voiceTickRef.current = null
    }
  }, [])

  const startVoiceRecording = useCallback(async () => {
    if (voiceState !== 'idle' || sending) return
    setVoiceError(null)
    cancelAutoSend()
    // 녹음과 NPC 음성 충돌 방지: 재생 중이면 즉시 중단
    stopSpeaking()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      audioChunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        stopVoiceTick()
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        if (blob.size < 3000) {
          setVoiceState('idle')
          setVoiceElapsed(0)
          setVoiceError('녹음이 너무 짧습니다. 마이크에 가까이 대고 다시 말씀해 주세요.')
          return
        }
        setVoiceState('processing')
        try {
          const form = new FormData()
          form.append('audio', blob, 'recording.webm')
          form.append('questionId', 'free-conversation')
          const res = await fetch('/api/stt', { method: 'POST', body: form })
          const data = await res.json()
          const transcript = typeof data?.transcript === 'string' ? data.transcript.trim() : ''
          if (!transcript) {
            setVoiceError('음성을 인식하지 못했습니다. 다시 시도하거나 텍스트로 입력해 주세요.')
          } else {
            // textarea에 표시 (기존 입력이 있으면 공백으로 이어붙임)
            let nextText = ''
            setInput((prev) => {
              nextText = prev ? `${prev} ${transcript}` : transcript
              return nextText
            })
            // 23-d Phase C: setTimeout 클로저 기반 자동 전송. text를 클로저로 캡처해
            // stale 문제 회피, queueMicrotask·useEffect 의존성 모두 제거.
            startAutoSendCountdown(nextText)
          }
        } catch (err) {
          console.error('[free-conversation] STT error', err)
          setVoiceError('음성 인식 중 오류가 발생했습니다. 텍스트로 입력해 주세요.')
        } finally {
          setVoiceState('idle')
          setVoiceElapsed(0)
        }
      }
      mediaRecorderRef.current = mr
      mr.start()
      setVoiceState('recording')
      setVoiceElapsed(0)
      voiceTickRef.current = setInterval(() => {
        setVoiceElapsed((p) => p + 1)
      }, 1000)
    } catch (err) {
      console.error('[free-conversation] mic error', err)
      setVoiceError('마이크 권한이 필요합니다. 브라우저 권한을 확인해 주세요.')
      setVoiceState('idle')
    }
  }, [voiceState, sending, stopVoiceTick, stopSpeaking, cancelAutoSend, startAutoSendCountdown])

  const stopVoiceRecording = useCallback(() => {
    const mr = mediaRecorderRef.current
    if (mr && mr.state === 'recording') {
      mr.stop()
      mediaRecorderRef.current = null
    }
  }, [])

  // ── 단계별 렌더 ───────────────────────────────────────────────────────────

  if (stage === 'start') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 px-4 py-6" data-testid="free-conversation-start">
        <div>
          <h1 className="text-xl font-bold text-text-primary">생성형 대화 연습</h1>
          <p className="text-sm text-text-secondary mt-1">
            AI와 자유롭게 한국어 대화를 나눠보세요. 추천 주제 중에서 고르거나 직접 입력할 수 있습니다.
          </p>
        </div>

        <Card>
          <CardHeader title="추천 주제" />
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="topic-cards">
              {RECOMMENDED_TOPICS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => startConversation(t.label)}
                  className="text-left rounded-lg border border-border bg-surface p-4 hover:bg-slate-50 transition-colors"
                  data-testid={`topic-card-${t.id}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-semibold text-text-primary">{t.label}</p>
                  </div>
                  <p className="text-xs text-text-muted">이 주제로 시작하기 →</p>
                </button>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="직접 주제 입력" />
          <CardBody className="space-y-3">
            <textarea
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              rows={2}
              placeholder="예: 어제 본 드라마 이야기"
              className="w-full rounded-md border border-border bg-surface text-text-primary text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
              data-testid="custom-topic-input"
            />
            <div>
              <button
                onClick={() => startConversation(customTopic)}
                disabled={customTopic.trim().length === 0}
                className="px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="btn-start-custom"
              >
                시작하기
              </button>
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  if (stage === 'chat') {
    return (
      <div className="max-w-2xl mx-auto px-4 pb-6 flex flex-col" style={{ minHeight: 'calc(100vh - 120px)' }} data-testid="free-conversation-chat">
        {/* Sticky 상단 */}
        <div
          className="sticky top-0 z-20 -mx-4 px-4 py-3 flex flex-wrap items-center gap-3"
          style={{
            backgroundColor: 'var(--color-background-primary, #FAF9F5)',
            borderBottom: '0.5px solid var(--border)',
          }}
          data-testid="conversation-header"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs text-text-muted">주제</p>
            <p className="text-sm font-semibold text-text-primary truncate" data-testid="conversation-topic">
              {topic}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-muted">경과</p>
            <p className="text-sm font-mono tabular-nums text-text-primary" data-testid="conversation-elapsed">
              {formatTime(elapsed)} / {formatTime(TOTAL_SECONDS)}
            </p>
          </div>
          <button
            onClick={() => {
              stopSpeaking()
              cancelAutoSend()
              void endConversation(turns, topic)
            }}
            className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
            data-testid="btn-end-conversation"
          >
            대화 종료
          </button>
        </div>

        {ttsSupported && (
          <div className="mt-2 flex items-center gap-2" data-testid="tts-toggle-row">
            <label className="inline-flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer select-none">
              <input
                type="checkbox"
                checked={ttsAutoPlay}
                onChange={(e) => {
                  setTtsAutoPlay(e.target.checked)
                  if (!e.target.checked) stopSpeaking()
                }}
                className="rounded border-border"
                data-testid="tts-autoplay-toggle"
              />
              <span>NPC 음성 자동 재생</span>
            </label>
            {speakingTurnIdx !== null && (
              <button
                onClick={() => stopSpeaking()}
                className="text-xs px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100"
                data-testid="tts-stop-button"
              >
                ⏸ 중지
              </button>
            )}
          </div>
        )}

        {warned && !timeUp && (
          <div
            className="mt-3 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800"
            data-testid="time-warning"
          >
            남은 시간 2분입니다. 마무리 발화를 준비해보세요.
          </div>
        )}
        {timeUp && (
          <div
            className="mt-3 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-xs text-red-800"
            data-testid="time-up"
          >
            시간이 종료되었습니다. 위의 “대화 종료” 버튼을 눌러 결과를 확인하세요.
          </div>
        )}

        {/* 대화 영역 */}
        <div
          ref={chatScrollRef}
          className="flex-1 mt-4 overflow-y-auto space-y-3 pb-4"
          data-testid="conversation-history"
        >
          {turns.map((t, i) => (
            <div
              key={i}
              className={t.role === 'ai' ? 'flex justify-start' : 'flex justify-end'}
              data-testid={`turn-${i}`}
            >
              <div
                className={[
                  'rounded-2xl px-4 py-2 max-w-[80%] text-sm leading-relaxed',
                  t.role === 'ai'
                    ? 'bg-surface border border-border text-text-primary'
                    : 'bg-primary-600 text-white',
                ].join(' ')}
              >
                <p className="whitespace-pre-wrap">{t.text}</p>
                {t.role === 'ai' && ttsSupported && (
                  <div className="mt-1.5 -mb-0.5 flex justify-end">
                    {speakingTurnIdx === i ? (
                      <button
                        onClick={() => stopSpeaking()}
                        className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 inline-flex items-center gap-0.5"
                        data-testid={`tts-stop-${i}`}
                        title="음성 중지"
                      >
                        <span aria-hidden>⏸</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => speakText(t.text, i)}
                        disabled={voiceState === 'recording'}
                        className="text-[11px] px-1.5 py-0.5 rounded border border-border text-text-muted hover:bg-slate-50 inline-flex items-center gap-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        data-testid={`tts-play-${i}`}
                        title="다시 듣기"
                      >
                        <span aria-hidden>🔊</span>
                      </button>
                    )}
                  </div>
                )}
                {t.role === 'student' && t.correction && t.correction.corrected !== t.correction.original && (
                  <div className="mt-2 pt-2 border-t border-white/30 text-xs">
                    <p className="opacity-90">
                      ✏️ <span className="line-through opacity-70">{t.correction.original}</span>
                      {' '}→ <span className="font-semibold">{t.correction.corrected}</span>
                    </p>
                    <p className="opacity-80 mt-0.5">{t.correction.reason}</p>
                  </div>
                )}
                {t.role === 'student' && t.correction && t.correction.corrected === t.correction.original && (
                  <p className="mt-1 text-xs opacity-80">✓ {t.correction.reason}</p>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start" data-testid="sending-indicator">
              <div className="rounded-2xl px-4 py-2 bg-surface border border-border text-text-secondary text-sm">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse" style={{ animationDelay: '0.15s' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse" style={{ animationDelay: '0.3s' }} />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 입력 영역 */}
        <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-surface-raised border-t border-border" data-testid="conversation-input-area">
          {chatError && (
            <p className="text-xs text-red-600 mb-2" data-testid="conversation-error">{chatError}</p>
          )}
          {voiceError && (
            <p className="text-xs text-amber-700 mb-2" data-testid="voice-error">{voiceError}</p>
          )}
          {autoSendCountdown !== null && autoSendCountdown > 0 && (
            <div
              className="mb-2 flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-200"
              data-testid="auto-send-countdown"
            >
              <div className="flex items-center gap-2 text-amber-800">
                <span
                  className="text-2xl font-bold tabular-nums leading-none"
                  data-testid="auto-send-countdown-number"
                >
                  {autoSendCountdown}
                </span>
                <span className="text-xs">초 후 자동 전송됩니다.</span>
              </div>
              <button
                onClick={() => cancelAutoSend()}
                className="text-xs px-2.5 py-1 rounded bg-white border border-amber-300 text-amber-800 font-medium hover:bg-amber-100"
                data-testid="btn-cancel-auto-send"
              >
                취소
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                // 카운트다운 중 학습자가 직접 편집하면 자동 취소
                if (autoSendCountdown !== null) cancelAutoSend()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void sendMessage()
                }
              }}
              rows={2}
              placeholder={timeUp ? '시간이 종료되어 입력할 수 없습니다.' : '한국어로 자유롭게 입력하세요. (Enter 전송, Shift+Enter 줄바꿈)'}
              className="flex-1 rounded-md border border-border bg-surface text-text-primary text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
              data-testid="conversation-input"
              disabled={sending || timeUp || voiceState !== 'idle'}
            />
            <div className="flex flex-col gap-1.5">
              {voiceState === 'idle' && (
                <button
                  onClick={() => void startVoiceRecording()}
                  disabled={sending || timeUp}
                  title="음성으로 입력"
                  className="px-3 py-2 rounded-md bg-surface border border-border text-text-secondary text-xs font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                  data-testid="btn-voice-start"
                >
                  <span aria-hidden>🎤</span>
                  <span>음성</span>
                </button>
              )}
              {voiceState === 'recording' && (
                <button
                  onClick={() => stopVoiceRecording()}
                  className="px-3 py-2 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors inline-flex items-center gap-1"
                  data-testid="btn-voice-stop"
                  title="녹음 중지"
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" aria-hidden />
                  <span className="font-mono tabular-nums">{formatTime(voiceElapsed)}</span>
                </button>
              )}
              {voiceState === 'processing' && (
                <span
                  className="px-3 py-2 rounded-md bg-surface border border-border text-text-secondary text-xs font-medium inline-flex items-center gap-1"
                  data-testid="voice-processing"
                >
                  <span className="inline-block w-3 h-3 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
                  <span>인식 중</span>
                </span>
              )}
              <button
                onClick={() => void sendMessage()}
                disabled={sending || timeUp || voiceState !== 'idle' || input.trim().length === 0}
                className="px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="btn-send-message"
              >
                전송
              </button>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-text-muted">
            🎤 버튼으로 음성 입력 후 텍스트를 확인하고 “전송”을 누르세요. 텍스트 직접 입력도 가능합니다.
          </p>
        </div>
      </div>
    )
  }

  // stage === 'end'
  return (
    <div className="max-w-2xl mx-auto space-y-6 px-4 py-6" data-testid="free-conversation-end">
      <div>
        <h1 className="text-xl font-bold text-text-primary">대화 요약 + 학습 피드백</h1>
        <p className="text-sm text-text-secondary mt-1">주제: {topic}</p>
      </div>

      {summaryLoading && !summary && (
        <Card>
          <CardBody>
            <p className="text-sm text-text-secondary" data-testid="summary-loading">
              대화를 정리하는 중입니다...
            </p>
          </CardBody>
        </Card>
      )}

      {summary && (
        <>
          <Card data-testid="conversation-summary">
            <CardHeader
              title="대화 요약"
              action={
                <Badge variant="info" size="sm">
                  {summary.source === 'llm' ? 'AI 요약' : '샘플 요약'}
                </Badge>
              }
            />
            <CardBody className="space-y-3">
              <div data-testid="summary-ko">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">한국어</p>
                <p className="text-sm text-text-primary leading-relaxed">{summary.summary_ko}</p>
              </div>
              <div data-testid="summary-vi">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Tiếng Việt</p>
                <p className="text-sm text-text-primary leading-relaxed">{summary.summary_vi}</p>
              </div>
              <div data-testid="summary-en">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">English</p>
                <p className="text-sm text-text-primary leading-relaxed">{summary.summary_en}</p>
              </div>
            </CardBody>
          </Card>

          <Card data-testid="conversation-feedback">
            <CardHeader title="학습 피드백" />
            <CardBody className="space-y-4">
              {(['ko', 'vi', 'en'] as const).map((lang) => {
                const fb = summary[`feedback_${lang}`]
                const langLabel = lang === 'ko' ? '한국어' : lang === 'vi' ? 'Tiếng Việt' : 'English'
                return (
                  <div key={lang} data-testid={`feedback-${lang}`}>
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">{langLabel}</p>
                    {fb.strengths.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-semibold text-emerald-700 mb-1">잘한 점</p>
                        <ul className="text-xs text-text-primary space-y-1 list-disc list-inside">
                          {fb.strengths.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                    {fb.next_steps.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-amber-700 mb-1">다음 연습 시</p>
                        <ul className="text-xs text-text-primary space-y-1 list-disc list-inside">
                          {fb.next_steps.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )
              })}
            </CardBody>
          </Card>

          <Card data-testid="conversation-history-recap">
            <CardHeader title="대화 히스토리" />
            <CardBody>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {turns.map((t, i) => (
                  <div key={i} className="text-sm">
                    <span className={t.role === 'ai' ? 'text-text-muted' : 'text-primary-700 font-semibold'}>
                      {t.role === 'ai' ? 'AI: ' : '나: '}
                    </span>
                    <span className="text-text-primary">{t.text}</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </>
      )}

      <div>
        <button
          onClick={() => {
            stopSpeaking()
            cancelAutoSend()
            setStage('start')
            setTopic('')
            setCustomTopic('')
            setTurns([])
            setSummary(null)
            elapsedRef.current = 0
            setElapsed(0)
            setWarned(false)
          }}
          className="px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
          data-testid="btn-restart"
        >
          다시 대화하기
        </button>
      </div>
    </div>
  )
}
