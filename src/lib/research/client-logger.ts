// v1.1 단계 10-4·10-5: 클라이언트 측 research 로깅 헬퍼.
//
// 모든 함수는 fail-silent. 로깅 실패가 학습 흐름을 막지 않도록 try/catch + null/false
// 반환만 한다. 참여자 세션이 없거나 Supabase 미설정 시에도 무해하다.

import type { ResearchMode, ResearchSpeaker } from './types'

async function postJson(url: string, body: unknown): Promise<unknown> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // 명시적 same-origin — 참여자 쿠키 자동 포함.
      credentials: 'same-origin',
    })
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    console.warn('[research-client] post failed:', url, err)
    return null
  }
}

export async function startResearchSession(
  mode: ResearchMode,
  metaJson?: Record<string, unknown>,
): Promise<string | null> {
  const data = (await postJson('/api/research/sessions/start', { mode, metaJson })) as
    | { ok: true; sessionId: string }
    | { ok: false }
    | null
  if (!data || !data.ok || typeof (data as { sessionId?: unknown }).sessionId !== 'string') return null
  return (data as { sessionId: string }).sessionId
}

export async function endResearchSession(sessionId: string): Promise<void> {
  await postJson('/api/research/sessions/end', { sessionId })
}

export type LogUtteranceInput = {
  sessionId: string
  turnNumber: number
  speaker: ResearchSpeaker
  text: string
  audioUrl?: string | null
  responseTimeMs?: number | null
  toolCalls?: Record<string, unknown>[] | null
  metaJson?: Record<string, unknown> | null
}

export async function logUtterance(input: LogUtteranceInput): Promise<void> {
  await postJson('/api/research/utterances', input)
}

export type LogAssessmentInput = {
  sessionId: string
  mode: ResearchMode
  scoreTotal?: number | null
  scoresDetail?: Record<string, unknown>
  feedbackText?: string | null
  pronunciationData?: Record<string, unknown> | null
}

export async function logAssessment(input: LogAssessmentInput): Promise<void> {
  await postJson('/api/research/assessments', input)
}

/**
 * 단일 턴 평가형 세션 한 번에 기록 — q1~q3·발표·읽기처럼 1턴 입력 + 평가 결과가
 * 함께 나오는 모드용 편의 함수. 세션 시작 → 학습자 발화 1개 → 평가 → 세션 종료를
 * 순차적으로 fire-and-forget으로 호출한다. 어떤 단계 실패해도 다른 단계는 진행.
 */
export type LogSingleTurnSessionInput = {
  mode: ResearchMode
  metaJson?: Record<string, unknown>
  learnerText: string
  audioUrl?: string | null
  scoreTotal?: number | null
  scoresDetail?: Record<string, unknown>
  feedbackText?: string | null
  pronunciationData?: Record<string, unknown> | null
}

export async function logSingleTurnSession(input: LogSingleTurnSessionInput): Promise<void> {
  const sessionId = await startResearchSession(input.mode, input.metaJson)
  if (!sessionId) return
  await logUtterance({
    sessionId,
    turnNumber: 1,
    speaker: 'learner',
    text: input.learnerText,
    audioUrl: input.audioUrl ?? null,
  })
  await logAssessment({
    sessionId,
    mode: input.mode,
    scoreTotal: input.scoreTotal ?? null,
    scoresDetail: input.scoresDetail ?? {},
    feedbackText: input.feedbackText ?? null,
    pronunciationData: input.pronunciationData ?? null,
  })
  await endResearchSession(sessionId)
}

/**
 * typeId(q1~q4 question type) → research mode 매핑.
 * KDLI Korean MVP에는 q2 계열 세부 타입이 여러 개 있어 모두 q2_describe로 묶는다.
 */
export function modeFromQuestionTypeId(typeId: string): ResearchMode {
  if (typeId === 'qt-reading') return 'q1_repeat'
  if (typeId === 'qt-picture') return 'q3_picture'
  if (typeId === 'qt-dialogue-mission') return 'q4_dialogue'
  return 'q2_describe'
}
