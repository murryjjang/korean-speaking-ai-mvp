import type { MissionSession, MissionSubmission } from '@/src/types/mission'

// Module-level store — Phase 4 MVP only. 서버 재시작 시 초기화됨.
// Phase 9+에서 Supabase mission_submissions / mission_sessions 테이블로 교체 예정.
// speaking-store.ts와 동일한 패턴.

const sessionStore = new Map<string, MissionSession>()
const submissionStore = new Map<string, MissionSubmission>()

export function createSession(session: MissionSession): void {
  sessionStore.set(session.sessionId, session)
}

export function getSession(sessionId: string): MissionSession | undefined {
  return sessionStore.get(sessionId)
}

export function updateSession(session: MissionSession): void {
  sessionStore.set(session.sessionId, session)
}

export function saveMissionSubmission(record: MissionSubmission): void {
  submissionStore.set(record.submissionId, record)
}

export function getMissionSubmission(submissionId: string): MissionSubmission | undefined {
  return submissionStore.get(submissionId)
}
