// v1.1 단계 10-2: 시험운영 인증 — 쿠키 기반 단순 세션.
//
// 두 가지 역할:
// 1) 참여자 — research_participant_id 쿠키에 UUID 저장 (HttpOnly).
// 2) 관리자 — research_admin 쿠키에 토큰(env 비밀번호의 SHA-256) 저장.
//
// 4~5명 시험운영 규모용. Supabase Auth와 별개의 격리된 흐름.

import { cookies } from 'next/headers'

import { getParticipantById } from './repository'
import { sha256Hex } from './helpers'
import type { ResearchParticipant } from './types'

export const PARTICIPANT_COOKIE = 'research_participant_id'
export const ADMIN_COOKIE = 'research_admin'

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 // 24시간

// ── 참여자 세션 ───────────────────────────────────────────────────────────────

export async function setParticipantSession(participantId: string): Promise<void> {
  const store = await cookies()
  store.set(PARTICIPANT_COOKIE, participantId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  })
}

export async function clearParticipantSession(): Promise<void> {
  const store = await cookies()
  store.delete(PARTICIPANT_COOKIE)
}

export async function readParticipantId(): Promise<string | null> {
  const store = await cookies()
  const c = store.get(PARTICIPANT_COOKIE)
  return c?.value ?? null
}

/** 현재 쿠키의 참여자 정보를 Supabase에서 조회. 없으면 null. */
export async function getCurrentParticipant(): Promise<ResearchParticipant | null> {
  const id = await readParticipantId()
  if (!id) return null
  return await getParticipantById(id)
}

// ── 관리자 세션 ───────────────────────────────────────────────────────────────

/** env 비밀번호 → 쿠키 토큰. 동일 비밀번호에 대해 deterministic 해시 사용. */
export async function adminTokenFromEnv(): Promise<string | null> {
  const pwd = process.env.RESEARCH_ADMIN_PASSWORD
  if (!pwd) return null
  return await sha256Hex(`research-admin:${pwd}`)
}

export async function setAdminSession(): Promise<boolean> {
  const token = await adminTokenFromEnv()
  if (!token) return false
  const store = await cookies()
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  })
  return true
}

export async function clearAdminSession(): Promise<void> {
  const store = await cookies()
  store.delete(ADMIN_COOKIE)
}

export async function isAdmin(): Promise<boolean> {
  const expected = await adminTokenFromEnv()
  if (!expected) return false
  const store = await cookies()
  const got = store.get(ADMIN_COOKIE)?.value
  return got === expected
}

/** 입력 비밀번호 검증 (env와 일치 시 true) */
export async function verifyAdminPassword(input: string): Promise<boolean> {
  const pwd = process.env.RESEARCH_ADMIN_PASSWORD
  if (!pwd) return false
  // 단순 비교 — 시험운영 규모용. 타이밍 공격 방지가 필요하면 timingSafeEqual 도입.
  return input === pwd
}
