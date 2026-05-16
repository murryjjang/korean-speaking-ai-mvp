// v1.1 단계 19.6 [격리]: 리서치 모드 redirect·링크 격리 (시험 참여자 격리).
//
// 시험 참여자가 일반 모드(/login, /student/* 노출되지 않은 진입점) 존재를 알지
// 못하도록 모든 redirect·로그아웃 경로가 /research/* 내로 한정되어야 한다.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf-8')
}

describe('[단계19.6-격리] /api/auth/signout — research-aware redirect', () => {
  const src = read('app/api/auth/signout/route.ts')

  it('research_participant_id 쿠키 확인 후 분기', () => {
    expect(src).toMatch(/PARTICIPANT_COOKIE|research_participant_id/)
  })

  it('리서치 쿠키 있으면 /research/login으로 redirect', () => {
    expect(src).toMatch(/\/research\/login/)
  })

  it('일반 사용자는 /login으로 redirect (기존 동작 유지)', () => {
    expect(src).toMatch(/['"`]\/login['"`]/)
  })

  it('리서치 참여자 쿠키 정리 (clearParticipantSession)', () => {
    expect(src).toMatch(/clearParticipantSession/)
  })
})

describe('[단계19.6-격리] 리서치 page redirect는 /research/* 내 한정', () => {
  it('logoutAction → /research/login', () => {
    const src = read('app/research/student/actions.ts')
    expect(src).toMatch(/['"`]\/research\/login['"`]/)
    expect(src).not.toMatch(/redirect\(\s*['"`]\/login['"`]\s*\)/)
  })

  it('declineConsent → /research/consent/declined', () => {
    const src = read('app/research/consent/actions.ts')
    expect(src).toMatch(/\/research\/consent\/declined/)
    expect(src).not.toMatch(/redirect\(\s*['"`]\/login['"`]\s*\)/)
  })

  it('recordConsent 실패 시 → /research/login', () => {
    const src = read('app/research/consent/actions.ts')
    // participant 누락 시 /research/login
    expect(src).toMatch(/!participant\)\s*redirect\(\s*['"`]\/research\/login['"`]\s*\)/)
  })

  it('admin logoutAction → /research/admin/login', () => {
    const src = read('app/research/admin/actions.ts')
    expect(src).toMatch(/\/research\/admin\/login/)
  })

  it('proxy.ts: /research/* 경로의 비인증은 /research/login으로 redirect', () => {
    const src = read('proxy.ts')
    expect(src).toMatch(/\/research\/login/)
  })
})

describe('[단계19.6-격리] 리서치 진척 페이지의 학습 모드 링크 — 일반 /student/*', () => {
  // /student/* 링크는 의도된 학습 흐름. proxy.ts의 /student 정확 매칭이 research
  // 참여자를 /research/student/progress로 다시 보낸다.
  const proxy = read('proxy.ts')

  it('proxy.ts: /student 정확 일치 + research 쿠키 → /research/student/progress', () => {
    expect(proxy).toMatch(/pathname\s*===\s*['"`]\/student['"`][\s\S]{0,200}\/research\/student\/progress/)
  })
})
