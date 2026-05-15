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
