'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardHeader, CardBody, Badge } from '@/src/components/ui'

// 추천 주제 5개 (시연 ⭐: 첫번째 주제)
const RECOMMENDED_TOPICS: ReadonlyArray<{ id: string; label: string; demo?: boolean }> = [
  { id: 'weekend-place', label: '주말에 가볼 만한 명소 추천', demo: true },
  { id: 'korean-food', label: '한국 음식 추천' },
  { id: 'movies', label: '좋아하는 영화 이야기' },
  { id: 'korea-trip', label: '한국 여행 계획' },
  { id: 'family', label: '가족 이야기' },
]

const TOTAL_SECONDS = 600 // 10분
const WARNING_AT = 480 // 8분 (남은 2분 경고)

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
  const sendMessage = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || sending) return
    if (trimmed.length > 1000) {
      setChatError('한 번에 1000자까지만 입력할 수 있어요.')
      return
    }
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
      setTurns([
        ...nextTurns.slice(0, -1),
        { ...studentTurn, correction: data.learner_correction },
        { role: 'ai', text: data.npc_response },
      ])
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
  }, [input, sending, turns, topic])

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
                    {t.demo && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 border border-amber-200 text-amber-700 ml-2 shrink-0">
                        ⭐ 시연
                      </span>
                    )}
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
            onClick={() => endConversation(turns, topic)}
            className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
            data-testid="btn-end-conversation"
          >
            대화 종료
          </button>
        </div>

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
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
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
              disabled={sending || timeUp}
            />
            <button
              onClick={() => void sendMessage()}
              disabled={sending || timeUp || input.trim().length === 0}
              className="px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="btn-send-message"
            >
              전송
            </button>
          </div>
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
                  {summary.source === 'llm' ? 'AI 요약' : '시연용 샘플'}
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
