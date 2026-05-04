'use server'

import missionGoalsJson from '@/src/content/mission-goals.json'
import { getConversationProvider } from '@/src/providers/conversation'
import {
  createSession,
  getSession,
  updateSession,
  saveMissionSubmission,
} from '@/src/lib/mock/mission-store'
import { getMissionRepository } from '@/src/lib/repositories'
import type {
  MissionSession,
  MissionGoalState,
  MissionTurn,
  MissionEvaluation,
  MissionSubmission,
} from '@/src/types/mission'

// JSON 타입을 명시적으로 캐스팅하기 위한 헬퍼
// resolveJsonModule이 활성화된 환경에서 JSON 필드는 widened 타입으로 추론된다.
// 필요한 곳에서 unknown 경유 캐스팅을 사용한다.

/**
 * 미션 세션을 시작한다.
 * 페르소나의 인사말(greetingText)을 반환하며, Client는 이를 첫 AI 발화로 표시한다.
 */
export async function startMission(scenarioId: string): Promise<{
  sessionId: string
  greetingText: string
}> {
  const scenarioData = missionGoalsJson.find((s) => s.scenarioId === scenarioId)
  if (!scenarioData) {
    throw new Error(`Scenario not found: ${scenarioId}`)
  }

  const sessionId = `session-${scenarioId}-${Date.now()}`

  const goals: MissionGoalState[] = scenarioData.goals.map((g) => ({
    id: g.id,
    description: g.description,
    achievedAtTurn: g.achievedAtTurn,
    order: g.order,
    achieved: false,
    achievedOnTurnNumber: null,
  }))

  const session: MissionSession = {
    sessionId,
    scenarioId,
    turns: [],
    goals,
    status: 'in_progress',
    currentTurnNumber: 0,
    startedAt: new Date().toISOString(),
  }

  createSession(session)

  return {
    sessionId,
    greetingText: scenarioData.persona.greetingMessage,
  }
}

/**
 * 학습자 발화 1턴을 처리한다.
 * 서버에서 라운드 카운터를 증가시키고, 목표 달성을 판정한 뒤 AI 응답을 반환한다.
 * Client의 턴 카운터에 의존하지 않는다.
 */
export async function sendTurn(
  sessionId: string,
  userText: string,
): Promise<{
  aiResponse: string
  turnNumber: number
  goalsAchievedIds: string[]
  isComplete: boolean
}> {
  const session = getSession(sessionId)
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`)
  }
  if (session.status === 'submitted') {
    throw new Error(`Session already submitted: ${sessionId}`)
  }

  const scenarioData = missionGoalsJson.find((s) => s.scenarioId === session.scenarioId)
  if (!scenarioData) {
    throw new Error(`Scenario not found: ${session.scenarioId}`)
  }

  // 라운드 번호 증가 — server-authoritative
  session.currentTurnNumber += 1
  const roundNumber = session.currentTurnNumber

  // 학습자 발화 저장
  const userTurn: MissionTurn = {
    id: `turn-${sessionId}-${session.turns.length}`,
    role: 'user',
    text: userText,
    turnNumber: roundNumber,
    timestamp: new Date().toISOString(),
  }
  session.turns.push(userTurn)

  // 목표 달성 판정: achievedAtTurn <= roundNumber이면서 아직 달성 안 된 목표
  const newlyAchieved = session.goals.filter(
    (g) => !g.achieved && g.achievedAtTurn <= roundNumber,
  )
  newlyAchieved.forEach((g) => {
    g.achieved = true
    g.achievedOnTurnNumber = roundNumber
  })

  // AI 응답 생성
  const provider = getConversationProvider()
  const aiResult = await provider.getResponse(session.scenarioId, roundNumber)

  // AI 발화 저장
  const aiTurn: MissionTurn = {
    id: `turn-${sessionId}-${session.turns.length}`,
    role: 'ai',
    text: aiResult.text,
    turnNumber: roundNumber,
    timestamp: new Date().toISOString(),
  }
  session.turns.push(aiTurn)

  updateSession(session)

  return {
    aiResponse: aiResult.text,
    turnNumber: roundNumber,
    goalsAchievedIds: newlyAchieved.map((g) => g.id),
    isComplete: roundNumber >= scenarioData.expectedTurns,
  }
}

/**
 * 미션 대화를 종료하고 mock 평가를 실행한다.
 * MissionSubmission을 mission-store에 저장한 뒤 submissionId를 반환한다.
 * Client는 이 ID로 결과 페이지로 이동한다.
 */
export async function submitMission(sessionId: string): Promise<{
  submissionId: string
}> {
  const session = getSession(sessionId)
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`)
  }
  if (session.status === 'submitted') {
    throw new Error(`Session already submitted: ${sessionId}`)
  }

  const scenarioData = missionGoalsJson.find((s) => s.scenarioId === session.scenarioId)
  if (!scenarioData) {
    throw new Error(`Scenario not found: ${session.scenarioId}`)
  }

  // 평가 산출
  const achievedCount = session.goals.filter((g) => g.achieved).length
  const totalCount = session.goals.length
  const missionAchievementRate =
    totalCount > 0 ? Math.round((achievedCount / totalCount) * 100) : 0
  const taskCompletion = missionAchievementRate

  const { conversationNaturalness, expressionAppropriateness, strengths, improvements } =
    scenarioData.mockEvaluation

  const overallScore = Math.round(
    (missionAchievementRate + taskCompletion + conversationNaturalness + expressionAppropriateness) /
      4,
  )

  const evaluation: MissionEvaluation = {
    missionAchievementRate,
    taskCompletion,
    conversationNaturalness,
    expressionAppropriateness,
    overallScore,
    strengths: [...strengths],
    improvements: [...improvements],
    providerName: 'mock',
    evaluatedAt: new Date().toISOString(),
  }

  const submissionId = `mission-sub-${session.scenarioId}-${Date.now()}`

  const submission: MissionSubmission = {
    submissionId,
    sessionId,
    scenarioId: session.scenarioId,
    studentId: 'student-001',
    classId: 'class-01',
    turns: [...session.turns],
    goals: session.goals.map((g) => ({ ...g })),
    evaluation,
    moduleType: 'mission',
    status: 'ai_evaluated',
    submittedAt: new Date().toISOString(),
  }

  // Always write to mock store — result page read path depends on it
  saveMissionSubmission(submission)

  // Phase 6-B4: additionally persist to Supabase when configured
  if (process.env.REPOSITORY_PROVIDER === 'supabase') {
    await getMissionRepository().createMissionSubmission(submission)
  }

  session.status = 'submitted'
  updateSession(session)

  return { submissionId }
}
