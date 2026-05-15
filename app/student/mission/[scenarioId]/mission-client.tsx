'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Card, CardBody, CardHeader, Badge, LangHint } from '@/src/components/ui'
import type { LangHintItem } from '@/src/components/ui'
import { startMission, sendTurn, submitMission } from '../actions'
import {
  endResearchSession,
  logUtterance,
  startResearchSession,
} from '@/src/lib/research/client-logger'

// ── 타입 ──────────────────────────────────────────────────────────

export type ScenarioProps = {
  scenarioId: string
  title: string
  situation: string
  location: string
  persona: {
    name: string
    role: string
    greetingMessage: string
  }
  goals: Array<{
    id: string
    description: string
    achievedAtTurn: number
    order: number
  }>
  expectedTurns: number
  difficulty: string
  estimatedMinutes: number
  rubric: {
    dimensions: Array<{
      id: string
      label: string
      description: string
    }>
  }
}

type Phase = 'ready' | 'chatting' | 'complete' | 'submitting'

type ChatItem = {
  key: number
  role: 'ai' | 'user'
  text: string
}

type GoalState = {
  id: string
  description: string
  achievedAtTurn: number
  order: number
  achieved: boolean
}

// ── 상수 ──────────────────────────────────────────────────────────

// 시나리오별 모국어 도움말 (mock 콘텐츠 기준 대표 시나리오)
const SCENARIO_SITUATION_HINTS: Record<string, LangHintItem[]> = {
  'sc-restaurant-01': [
    { lang: 'EN', text: 'You are visiting a Korean restaurant for the first time. Talk with the staff to order food.' },
    { lang: 'VI', text: 'Bạn đang đến nhà hàng Hàn Quốc lần đầu tiên. Nói chuyện với nhân viên để đặt món ăn.' },
    { lang: 'JA', text: '初めて韓国のレストランに来ました。スタッフと話して料理を注文してください。' },
    { lang: 'AR', text: 'أنت تزور مطعمًا كوريًا لأول مرة. تحدّث مع الموظف لطلب الطعام.' },
  ],
  'sc-hospital-01': [
    { lang: 'EN', text: 'You are not feeling well and have come to a hospital. Explain your symptoms and make an appointment.' },
    { lang: 'VI', text: 'Bạn không khỏe và đến bệnh viện. Giải thích triệu chứng và đặt lịch hẹn.' },
    { lang: 'JA', text: '体調が悪くて病院に来ました。症状を説明して予約を入れてください。' },
    { lang: 'AR', text: 'أنت لا تشعر بحالة جيدة وجئت إلى المستشفى. اشرح أعراضك وحدد موعدًا.' },
  ],
}

// 미션 목표 도움말 (시나리오 단위 — 전체 목표 목록 요약)
const SCENARIO_GOALS_HINTS: Record<string, LangHintItem[]> = {
  'sc-restaurant-01': [
    { lang: 'EN', text: 'Goals: 1) Tell the staff how many people are in your group. 2) Order 2 different foods. 3) Check the total price.' },
    { lang: 'VI', text: 'Mục tiêu: 1) Thông báo số người trong nhóm. 2) Đặt 2 món ăn. 3) Kiểm tra tổng tiền.' },
    { lang: 'JA', text: '目標：1) 人数をスタッフに伝える。2) 料理を2品注文する。3) 合計金額を確認する。' },
    { lang: 'AR', text: 'الأهداف: 1) أخبر الموظف بعدد الأشخاص. 2) اطلب نوعين من الطعام. 3) تأكد من المبلغ الإجمالي.' },
  ],
  'sc-hospital-01': [
    { lang: 'EN', text: 'Goals: 1) Explain your symptoms. 2) Say when you started feeling sick. 3) Request an appointment. 4) Confirm the date and time.' },
    { lang: 'VI', text: 'Mục tiêu: 1) Giải thích triệu chứng. 2) Nói từ khi nào bạn bị bệnh. 3) Yêu cầu đặt lịch. 4) Xác nhận ngày giờ.' },
    { lang: 'JA', text: '目標：1) 症状を説明する。2) いつから具合が悪いか伝える。3) 予約を依頼する。4) 日時を確認する。' },
    { lang: 'AR', text: 'الأهداف: 1) اشرح الأعراض. 2) قل متى بدأت تشعر بالمرض. 3) اطلب موعدًا. 4) أكّد التاريخ والوقت.' },
  ],
}

// 대화 시작 전 일반 안내 도움말
const CHAT_GUIDE_HINTS: LangHintItem[] = [
  { lang: 'EN', text: 'Type your Korean response in the text box. Press Enter to send. Try to achieve all goals before ending.' },
  { lang: 'VI', text: 'Gõ câu trả lời tiếng Hàn vào ô văn bản. Nhấn Enter để gửi. Cố gắng đạt tất cả mục tiêu trước khi kết thúc.' },
  { lang: 'JA', text: 'テキストボックスに韓国語で入力してください。Enterで送信。終了前にすべての目標を達成するよう努めてください。' },
  { lang: 'AR', text: 'اكتب ردّك بالكورية في مربع النص. اضغط Enter للإرسال. حاول تحقيق جميع الأهداف قبل الإنهاء.' },
]

const DIFFICULTY_LABEL: Record<string, string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
}

const DIFFICULTY_VARIANT: Record<string, 'success' | 'info' | 'warning'> = {
  beginner: 'success',
  intermediate: 'info',
  advanced: 'warning',
}

// ── 유틸 ──────────────────────────────────────────────────────────

function computeGoalStatus(
  goal: GoalState,
  allGoals: GoalState[],
  phase: Phase,
): 'achieved' | 'in_progress' | 'not_started' {
  if (goal.achieved) return 'achieved'
  if (phase !== 'chatting') return 'not_started'
  // 아직 달성되지 않은 목표 중 achievedAtTurn이 가장 작은 것을 '진행 중'으로 표시
  const minTurn = Math.min(
    ...allGoals.filter((g) => !g.achieved).map((g) => g.achievedAtTurn),
  )
  return goal.achievedAtTurn === minTurn ? 'in_progress' : 'not_started'
}

// ── 컴포넌트 ──────────────────────────────────────────────────────

export function MissionClient({ scenario }: { scenario: ScenarioProps }) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('ready')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [chat, setChat] = useState<ChatItem[]>([])
  const [goalStates, setGoalStates] = useState<GoalState[]>(
    scenario.goals
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((g) => ({
        id: g.id,
        description: g.description,
        achievedAtTurn: g.achievedAtTurn,
        order: g.order,
        achieved: false,
      })),
  )
  const [userInput, setUserInput] = useState('')
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [startError, setStartError] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const nextKey = useRef(0)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  // v1.1 단계 10-5: q4_dialogue 시험운영 로깅 (fail-silent).
  const researchSessionIdRef = useRef<string | null>(null)
  const researchTurnRef = useRef<number>(0)

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat])

  const addChatItem = useCallback((role: 'ai' | 'user', text: string) => {
    const key = nextKey.current++
    setChat((prev) => [...prev, { key, role, text }])
  }, [])

  const handleStart = useCallback(async () => {
    setStartError(false)
    try {
      const { sessionId: sid, greetingText } = await startMission(scenario.scenarioId)
      setSessionId(sid)
      addChatItem('ai', greetingText)
      setPhase('chatting')
      // research 세션 시작 + greeting 발화 기록 (fail-silent)
      researchSessionIdRef.current = null
      researchTurnRef.current = 0
      void (async () => {
        const rsid = await startResearchSession('q4_dialogue', {
          scenarioId: scenario.scenarioId,
          missionSessionId: sid,
        })
        if (!rsid) return
        researchSessionIdRef.current = rsid
        researchTurnRef.current = 1
        await logUtterance({
          sessionId: rsid,
          turnNumber: 1,
          speaker: 'npc',
          text: greetingText,
          metaJson: { kind: 'greeting' },
        })
      })()
    } catch {
      setStartError(true)
    }
  }, [scenario.scenarioId, addChatItem])

  const handleSend = useCallback(async () => {
    const text = userInput.trim()
    if (!text || !sessionId || isAiThinking) return
    setUserInput('')
    addChatItem('user', text)
    setIsAiThinking(true)
    const startAt = Date.now()
    try {
      const result = await sendTurn(sessionId, text)
      addChatItem('ai', result.aiResponse)
      if (result.goalsAchievedIds.length > 0) {
        setGoalStates((prev) =>
          prev.map((g) =>
            result.goalsAchievedIds.includes(g.id) ? { ...g, achieved: true } : g,
          ),
        )
      }
      if (result.isComplete) {
        setPhase('complete')
      }
      // research 발화 기록 (fail-silent)
      const rsid = researchSessionIdRef.current
      if (rsid) {
        const studentTurn = researchTurnRef.current + 1
        const npcTurn = researchTurnRef.current + 2
        researchTurnRef.current = npcTurn
        void logUtterance({ sessionId: rsid, turnNumber: studentTurn, speaker: 'learner', text })
        void logUtterance({
          sessionId: rsid,
          turnNumber: npcTurn,
          speaker: 'npc',
          text: result.aiResponse,
          responseTimeMs: Date.now() - startAt,
          metaJson: { goalsAchievedIds: result.goalsAchievedIds, isComplete: result.isComplete },
        })
      }
    } catch {
      addChatItem('ai', '오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsAiThinking(false)
    }
  }, [userInput, sessionId, isAiThinking, addChatItem])

  const handleEndConversation = useCallback(() => {
    setPhase('complete')
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!sessionId) return
    setSubmitError(false)
    setPhase('submitting')
    try {
      const { submissionId } = await submitMission(sessionId)
      // research 세션 종료 (fail-silent)
      const rsid = researchSessionIdRef.current
      if (rsid) void endResearchSession(rsid)
      router.push(`/student/mission/${scenario.scenarioId}/result?sub=${submissionId}`)
    } catch {
      setSubmitError(true)
      setPhase('complete')
    }
  }, [sessionId, router, scenario.scenarioId])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const diffVariant = DIFFICULTY_VARIANT[scenario.difficulty] ?? 'info'
  const diffLabel = DIFFICULTY_LABEL[scenario.difficulty] ?? scenario.difficulty
  const achievedCount = goalStates.filter((g) => g.achieved).length

  return (
    <div className="max-w-2xl mx-auto space-y-3 md:space-y-4">
      {/* 뒤로 가기 */}
      <div>
        <Link
          href="/student/mission"
          className="text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          ← 미션 목록
        </Link>
      </div>

      {/* 미션 정보 카드 */}
      <Card>
        <CardHeader
          title={scenario.title}
          description={scenario.location}
          action={
            <Badge variant={diffVariant as 'success' | 'info' | 'warning'}>{diffLabel}</Badge>
          }
        />
        <CardBody>
          <p className="text-sm text-text-secondary mb-3">{scenario.situation}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
            <span className="inline-flex items-center bg-surface text-text-secondary rounded px-2 py-0.5">
              {scenario.persona.name} · {scenario.persona.role}
            </span>
            <span>예상 {scenario.estimatedMinutes}분</span>
            <span>최대 {scenario.expectedTurns}턴</span>
          </div>
          {SCENARIO_SITUATION_HINTS[scenario.scenarioId] && (
            <LangHint
              items={SCENARIO_SITUATION_HINTS[scenario.scenarioId]}
              label="모국어 도움말 보기"
            />
          )}
        </CardBody>
      </Card>

      {/* 미션 목표 패널 */}
      <Card>
        <div className="px-4 py-3 md:px-5 border-b border-border flex items-center justify-between">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            미션 목표
          </p>
          <span className="text-xs text-text-muted">
            {achievedCount}/{goalStates.length} 달성
          </span>
        </div>
        <CardBody>
          <ul className="space-y-2.5">
            {goalStates.map((g) => {
              const status = computeGoalStatus(g, goalStates, phase)
              return (
                <li key={g.id} className="flex items-center gap-2.5 text-sm">
                  {status === 'achieved' ? (
                    <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold shrink-0">
                      ✓
                    </span>
                  ) : status === 'in_progress' ? (
                    <span className="w-5 h-5 rounded-full border-2 border-primary-700 bg-primary-50 shrink-0" />
                  ) : (
                    <span className="w-5 h-5 rounded-full border-2 border-border-strong shrink-0" />
                  )}
                  <span
                    className={
                      status === 'achieved'
                        ? 'text-text-muted line-through'
                        : status === 'in_progress'
                          ? 'text-text-primary font-medium'
                          : 'text-text-secondary'
                    }
                  >
                    {g.description}
                  </span>
                  <span className="ml-auto text-xs shrink-0">
                    {status === 'achieved' && (
                      <span className="text-green-600 font-medium">완료</span>
                    )}
                    {status === 'in_progress' && (
                      <span className="text-primary-700 font-medium">진행 중</span>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
          {SCENARIO_GOALS_HINTS[scenario.scenarioId] && (
            <LangHint
              items={SCENARIO_GOALS_HINTS[scenario.scenarioId]}
              label="목표 도움말 보기"
            />
          )}
        </CardBody>
      </Card>

      {/* 평가 기준 요약 */}
      <div className="px-1">
        <p className="text-xs text-text-muted mb-1.5">평가 기준</p>
        <div className="flex flex-wrap gap-2">
          {scenario.rubric.dimensions.map((dim) => (
            <span
              key={dim.id}
              title={dim.description}
              className="inline-flex items-center text-xs bg-surface text-text-secondary rounded px-2 py-1"
            >
              {dim.label}
            </span>
          ))}
        </div>
      </div>

      {/* 준비 상태 */}
      {phase === 'ready' && (
        <Card>
          <CardBody>
            <div className="text-center py-6">
              <p className="text-sm text-text-secondary mb-1">
                AI 페르소나{' '}
                <strong>
                  {scenario.persona.name}({scenario.persona.role})
                </strong>
                와 대화를 시작합니다.
              </p>
              <p className="text-xs text-text-muted mb-6">
                MVP 단계: 실제 LLM 없이 scripted mock 응답으로 동작합니다.
              </p>
              {startError && (
                <p className="text-xs text-red-500 mb-3">
                  세션 시작에 실패했습니다. 다시 시도해주세요.
                </p>
              )}
              <Button variant="primary" size="lg" onClick={() => void handleStart()}>
                대화 시작
              </Button>
              <div className="mt-4 text-left">
                <LangHint items={CHAT_GUIDE_HINTS} label="대화 방법 도움말" />
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* 대화창 (chatting / complete / submitting) */}
      {(phase === 'chatting' || phase === 'complete' || phase === 'submitting') && (
        <>
          <Card>
            <div className="px-5 py-3 border-b border-border">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                대화창
              </p>
            </div>
            <CardBody>
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {chat.map((item) => (
                  <div
                    key={item.key}
                    className={`flex gap-2 ${item.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`flex flex-col gap-0.5 max-w-[75%] ${
                        item.role === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <span className="text-xs text-text-muted px-1">
                        {item.role === 'ai' ? scenario.persona.name : '나'}
                      </span>
                      <div
                        className={`text-sm px-3 py-2 rounded-lg leading-relaxed ${
                          item.role === 'ai'
                            ? 'bg-surface text-text-primary'
                            : 'bg-primary-700 text-white'
                        }`}
                      >
                        {item.text}
                      </div>
                    </div>
                  </div>
                ))}
                {isAiThinking && (
                  <div className="flex gap-2">
                    <div className="flex flex-col gap-0.5 max-w-[75%] items-start">
                      <span className="text-xs text-text-muted px-1">{scenario.persona.name}</span>
                      <div className="text-sm px-3 py-2 rounded-lg bg-surface text-text-muted">
                        <span className="animate-pulse">...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>
            </CardBody>
          </Card>

          {/* 입력창 */}
          {phase === 'chatting' && (
            <Card>
              <CardBody>
                <div className="flex flex-col gap-3">
                  <textarea
                    className="w-full resize-none rounded-md border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
                    rows={3}
                    placeholder="한국어로 입력하세요. Enter로 전송, Shift+Enter로 줄바꿈."
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isAiThinking}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleEndConversation}
                      disabled={isAiThinking}
                    >
                      대화 종료
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => void handleSend()}
                      disabled={!userInput.trim() || isAiThinking}
                      loading={isAiThinking}
                    >
                      전송
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* 완료 상태 — 제출 영역 */}
          {phase === 'complete' && (
            <Card>
              <CardBody>
                <div className="text-center py-4">
                  <p className="text-sm font-medium text-text-primary mb-1">
                    대화가 종료되었습니다.
                  </p>
                  <p className="text-xs text-text-muted mb-4">
                    제출하면 mock AI 평가 결과를 확인할 수 있습니다.
                  </p>
                  {submitError && (
                    <p className="text-xs text-red-500 mb-3">
                      제출 중 오류가 발생했습니다. 다시 시도해주세요.
                    </p>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                    <Link
                      href="/student/mission"
                      className="inline-flex items-center justify-center gap-2 font-medium transition-colors text-sm px-4 min-h-[44px] rounded-md bg-white text-text-primary hover:bg-slate-50 border border-border-strong w-full sm:w-auto"
                    >
                      목록으로
                    </Link>
                    <Button variant="primary" onClick={() => void handleSubmit()} className="w-full sm:w-auto">
                      제출하기
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* 제출 중 */}
          {phase === 'submitting' && (
            <Card>
              <CardBody>
                <div className="text-center py-6">
                  <Button loading variant="primary" disabled>
                    평가 중...
                  </Button>
                  <p className="mt-3 text-xs text-text-muted">제출 중입니다. 잠시 기다려주세요.</p>
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
