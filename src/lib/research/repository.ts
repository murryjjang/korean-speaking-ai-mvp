// v1.1 단계 10-1: research 도메인 리포지터리 — fail-silent 로깅 패턴.
//
// 모든 메서드는 throw하지 않는다. Supabase 클라이언트 미설정·네트워크 오류는
// console.warn으로만 남기고 null/empty/false를 반환한다. 학습 흐름이 데이터
// 로깅 실패로 중단되지 않게 하는 가드.
//
// service_role 키를 사용하므로 SERVER ONLY. 절대 클라이언트 번들에 포함되지 않는다.

import { createClient } from '@supabase/supabase-js'
import { getResearchAdminClient } from './supabase-admin-client'
import type {
  CreateAssessmentInput,
  CreateConsentLogInput,
  CreateParticipantInput,
  CreateSessionInput,
  CreateUtteranceInput,
  ResearchAssessment,
  ResearchConsentLog,
  ResearchMode,
  ResearchParticipant,
  ResearchSession,
  ResearchSpeaker,
  ResearchUtterance,
} from './types'

type SupabaseClientType = ReturnType<typeof createClient>

// Supabase v2.x: untyped Database generic — cast to any로 false-negative 회피.
// 패턴은 supabase-submission-repository.ts와 동일.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(client: SupabaseClientType): any {
  return client
}

function warn(label: string, err: unknown): void {
  console.warn(`[research-repo] ${label}:`, err)
}

// ── Row 매핑 (snake_case → camelCase) ────────────────────────────────────────

type ParticipantRow = {
  id: string
  participant_code: string
  pin_hash: string | null
  name: string | null
  nationality: string | null
  korean_level: string | null
  mother_tongue: string | null
  enrolled_at: string
  consent_status: boolean
  consent_at: string | null
  notes: string | null
}

function mapParticipant(r: ParticipantRow): ResearchParticipant {
  return {
    id: r.id,
    participantCode: r.participant_code,
    pinHash: r.pin_hash,
    name: r.name,
    nationality: r.nationality,
    koreanLevel: r.korean_level,
    motherTongue: r.mother_tongue,
    enrolledAt: r.enrolled_at,
    consentStatus: r.consent_status,
    consentAt: r.consent_at,
    notes: r.notes,
  }
}

type SessionRow = {
  id: string
  participant_id: string
  session_started_at: string
  session_ended_at: string | null
  mode: ResearchMode
  meta_json: Record<string, unknown>
}

function mapSession(r: SessionRow): ResearchSession {
  return {
    id: r.id,
    participantId: r.participant_id,
    sessionStartedAt: r.session_started_at,
    sessionEndedAt: r.session_ended_at,
    mode: r.mode,
    metaJson: r.meta_json ?? {},
  }
}

type UtteranceRow = {
  id: string
  session_id: string
  turn_number: number
  speaker: ResearchSpeaker
  text: string
  audio_url: string | null
  response_time_ms: number | null
  tool_calls: Record<string, unknown>[] | null
  meta_json: Record<string, unknown> | null
  created_at: string
}

function mapUtterance(r: UtteranceRow): ResearchUtterance {
  return {
    id: r.id,
    sessionId: r.session_id,
    turnNumber: r.turn_number,
    speaker: r.speaker,
    text: r.text,
    audioUrl: r.audio_url,
    responseTimeMs: r.response_time_ms,
    toolCalls: r.tool_calls,
    metaJson: r.meta_json,
    createdAt: r.created_at,
  }
}

type AssessmentRow = {
  id: string
  session_id: string
  mode: ResearchMode
  score_total: number | null
  scores_detail: Record<string, unknown>
  feedback_text: string | null
  pronunciation_data: Record<string, unknown> | null
  created_at: string
}

function mapAssessment(r: AssessmentRow): ResearchAssessment {
  return {
    id: r.id,
    sessionId: r.session_id,
    mode: r.mode,
    scoreTotal: r.score_total,
    scoresDetail: r.scores_detail ?? {},
    feedbackText: r.feedback_text,
    pronunciationData: r.pronunciation_data,
    createdAt: r.created_at,
  }
}

type ConsentLogRow = {
  id: string
  participant_id: string
  consent_version: string
  consent_text_hash: string
  consented_at: string
  ip_address: string | null
  user_agent: string | null
}

function mapConsentLog(r: ConsentLogRow): ResearchConsentLog {
  return {
    id: r.id,
    participantId: r.participant_id,
    consentVersion: r.consent_version,
    consentTextHash: r.consent_text_hash,
    consentedAt: r.consented_at,
    ipAddress: r.ip_address,
    userAgent: r.user_agent,
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

export function isResearchRepoConfigured(): boolean {
  return getResearchAdminClient() !== null
}

// ── Participant ─────────────────────────────────────────────────────────────

export async function createParticipant(input: CreateParticipantInput): Promise<ResearchParticipant | null> {
  const client = getResearchAdminClient()
  if (!client) return null
  try {
    const { data, error } = await db(client)
      .from('research_participants')
      .insert({
        participant_code: input.participantCode,
        pin_hash: input.pinHash ?? null,
        name: input.name ?? null,
        nationality: input.nationality ?? null,
        korean_level: input.koreanLevel ?? null,
        mother_tongue: input.motherTongue ?? null,
        notes: input.notes ?? null,
      })
      .select()
      .single()
    if (error) {
      warn('createParticipant', error)
      return null
    }
    return mapParticipant(data as ParticipantRow)
  } catch (err) {
    warn('createParticipant.exception', err)
    return null
  }
}

export async function getParticipantByCode(participantCode: string): Promise<ResearchParticipant | null> {
  const client = getResearchAdminClient()
  if (!client) return null
  try {
    const { data, error } = await db(client)
      .from('research_participants')
      .select('*')
      .eq('participant_code', participantCode)
      .maybeSingle()
    if (error) {
      warn('getParticipantByCode', error)
      return null
    }
    return data ? mapParticipant(data as ParticipantRow) : null
  } catch (err) {
    warn('getParticipantByCode.exception', err)
    return null
  }
}

export async function getParticipantById(id: string): Promise<ResearchParticipant | null> {
  const client = getResearchAdminClient()
  if (!client) return null
  try {
    const { data, error } = await db(client)
      .from('research_participants')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) {
      warn('getParticipantById', error)
      return null
    }
    return data ? mapParticipant(data as ParticipantRow) : null
  } catch (err) {
    warn('getParticipantById.exception', err)
    return null
  }
}

export async function markParticipantConsented(id: string): Promise<boolean> {
  const client = getResearchAdminClient()
  if (!client) return false
  try {
    const { error } = await db(client)
      .from('research_participants')
      .update({ consent_status: true, consent_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      warn('markParticipantConsented', error)
      return false
    }
    return true
  } catch (err) {
    warn('markParticipantConsented.exception', err)
    return false
  }
}

export async function listParticipants(): Promise<ResearchParticipant[]> {
  const client = getResearchAdminClient()
  if (!client) return []
  try {
    const { data, error } = await db(client)
      .from('research_participants')
      .select('*')
      .order('enrolled_at', { ascending: false })
    if (error) {
      warn('listParticipants', error)
      return []
    }
    return (data as ParticipantRow[]).map(mapParticipant)
  } catch (err) {
    warn('listParticipants.exception', err)
    return []
  }
}

// ── Session ─────────────────────────────────────────────────────────────────

export async function createSession(input: CreateSessionInput): Promise<ResearchSession | null> {
  const client = getResearchAdminClient()
  if (!client) return null
  try {
    const { data, error } = await db(client)
      .from('research_sessions')
      .insert({
        participant_id: input.participantId,
        mode: input.mode,
        meta_json: input.metaJson ?? {},
      })
      .select()
      .single()
    if (error) {
      warn('createSession', error)
      return null
    }
    return mapSession(data as SessionRow)
  } catch (err) {
    warn('createSession.exception', err)
    return null
  }
}

export async function endSession(sessionId: string): Promise<boolean> {
  const client = getResearchAdminClient()
  if (!client) return false
  try {
    const { error } = await db(client)
      .from('research_sessions')
      .update({ session_ended_at: new Date().toISOString() })
      .eq('id', sessionId)
    if (error) {
      warn('endSession', error)
      return false
    }
    return true
  } catch (err) {
    warn('endSession.exception', err)
    return false
  }
}

export async function listSessionsByParticipant(participantId: string): Promise<ResearchSession[]> {
  const client = getResearchAdminClient()
  if (!client) return []
  try {
    const { data, error } = await db(client)
      .from('research_sessions')
      .select('*')
      .eq('participant_id', participantId)
      .order('session_started_at', { ascending: false })
    if (error) {
      warn('listSessionsByParticipant', error)
      return []
    }
    return (data as SessionRow[]).map(mapSession)
  } catch (err) {
    warn('listSessionsByParticipant.exception', err)
    return []
  }
}

export async function listAllSessions(): Promise<ResearchSession[]> {
  const client = getResearchAdminClient()
  if (!client) return []
  try {
    const { data, error } = await db(client)
      .from('research_sessions')
      .select('*')
      .order('session_started_at', { ascending: false })
    if (error) {
      warn('listAllSessions', error)
      return []
    }
    return (data as SessionRow[]).map(mapSession)
  } catch (err) {
    warn('listAllSessions.exception', err)
    return []
  }
}

// ── Utterance ───────────────────────────────────────────────────────────────

export async function createUtterance(input: CreateUtteranceInput): Promise<ResearchUtterance | null> {
  const client = getResearchAdminClient()
  if (!client) return null
  try {
    const { data, error } = await db(client)
      .from('research_utterances')
      .insert({
        session_id: input.sessionId,
        turn_number: input.turnNumber,
        speaker: input.speaker,
        text: input.text,
        audio_url: input.audioUrl ?? null,
        response_time_ms: input.responseTimeMs ?? null,
        tool_calls: input.toolCalls ?? null,
        meta_json: input.metaJson ?? null,
      })
      .select()
      .single()
    if (error) {
      warn('createUtterance', error)
      return null
    }
    return mapUtterance(data as UtteranceRow)
  } catch (err) {
    warn('createUtterance.exception', err)
    return null
  }
}

export async function listUtterancesBySession(sessionId: string): Promise<ResearchUtterance[]> {
  const client = getResearchAdminClient()
  if (!client) return []
  try {
    const { data, error } = await db(client)
      .from('research_utterances')
      .select('*')
      .eq('session_id', sessionId)
      .order('turn_number', { ascending: true })
    if (error) {
      warn('listUtterancesBySession', error)
      return []
    }
    return (data as UtteranceRow[]).map(mapUtterance)
  } catch (err) {
    warn('listUtterancesBySession.exception', err)
    return []
  }
}

export async function listAllUtterances(): Promise<ResearchUtterance[]> {
  const client = getResearchAdminClient()
  if (!client) return []
  try {
    const { data, error } = await db(client)
      .from('research_utterances')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) {
      warn('listAllUtterances', error)
      return []
    }
    return (data as UtteranceRow[]).map(mapUtterance)
  } catch (err) {
    warn('listAllUtterances.exception', err)
    return []
  }
}

// ── Assessment ──────────────────────────────────────────────────────────────

export async function createAssessment(input: CreateAssessmentInput): Promise<ResearchAssessment | null> {
  const client = getResearchAdminClient()
  if (!client) return null
  try {
    const { data, error } = await db(client)
      .from('research_assessments')
      .insert({
        session_id: input.sessionId,
        mode: input.mode,
        score_total: input.scoreTotal ?? null,
        scores_detail: input.scoresDetail ?? {},
        feedback_text: input.feedbackText ?? null,
        pronunciation_data: input.pronunciationData ?? null,
      })
      .select()
      .single()
    if (error) {
      warn('createAssessment', error)
      return null
    }
    return mapAssessment(data as AssessmentRow)
  } catch (err) {
    warn('createAssessment.exception', err)
    return null
  }
}

export async function listAssessmentsBySession(sessionId: string): Promise<ResearchAssessment[]> {
  const client = getResearchAdminClient()
  if (!client) return []
  try {
    const { data, error } = await db(client)
      .from('research_assessments')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
    if (error) {
      warn('listAssessmentsBySession', error)
      return []
    }
    return (data as AssessmentRow[]).map(mapAssessment)
  } catch (err) {
    warn('listAssessmentsBySession.exception', err)
    return []
  }
}

export async function listAllAssessments(): Promise<ResearchAssessment[]> {
  const client = getResearchAdminClient()
  if (!client) return []
  try {
    const { data, error } = await db(client)
      .from('research_assessments')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) {
      warn('listAllAssessments', error)
      return []
    }
    return (data as AssessmentRow[]).map(mapAssessment)
  } catch (err) {
    warn('listAllAssessments.exception', err)
    return []
  }
}

// ── Consent log ─────────────────────────────────────────────────────────────

export async function createConsentLog(input: CreateConsentLogInput): Promise<ResearchConsentLog | null> {
  const client = getResearchAdminClient()
  if (!client) return null
  try {
    const { data, error } = await db(client)
      .from('research_consent_logs')
      .insert({
        participant_id: input.participantId,
        consent_version: input.consentVersion,
        consent_text_hash: input.consentTextHash,
        ip_address: input.ipAddress ?? null,
        user_agent: input.userAgent ?? null,
      })
      .select()
      .single()
    if (error) {
      warn('createConsentLog', error)
      return null
    }
    return mapConsentLog(data as ConsentLogRow)
  } catch (err) {
    warn('createConsentLog.exception', err)
    return null
  }
}

export async function listConsentLogsByParticipant(participantId: string): Promise<ResearchConsentLog[]> {
  const client = getResearchAdminClient()
  if (!client) return []
  try {
    const { data, error } = await db(client)
      .from('research_consent_logs')
      .select('*')
      .eq('participant_id', participantId)
      .order('consented_at', { ascending: false })
    if (error) {
      warn('listConsentLogsByParticipant', error)
      return []
    }
    return (data as ConsentLogRow[]).map(mapConsentLog)
  } catch (err) {
    warn('listConsentLogsByParticipant.exception', err)
    return []
  }
}
