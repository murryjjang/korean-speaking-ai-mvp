// M2 — 배포/운영 헬스체크 엔드포인트.
//
// smoke-test.sh / M6 monitor 가 이 엔드포인트로 라이브 상태를 게이트한다.
// 기존 /api/health 는 정적(status/timestamp/version)만 반환 → 배포 검증엔 부족.
// healthz 는 db ping·buildId·cloudflared 까지 본다.
//
// 설계 결정: db.ok=false → HTTP 503 반환 → smoke 가 "healthz 200" 한 줄로 다운 감지.
// version·buildId 는 fs 런타임 읽기(번들/JSON import 비의존 → 빌드 영향 0).
// cloudflared 는 best-effort(로컬/권한없음/미설치 → unknown) — 앱을 호스트에 결합하지 않음.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { getResearchAdminClient } from '@/src/lib/research/supabase-admin-client'

export const dynamic = 'force-dynamic'

function readVersion(): string {
  try {
    const raw = readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8')
    return (JSON.parse(raw) as { version?: string }).version ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

function readBuildId(): string | null {
  try {
    return readFileSync(resolve(process.cwd(), '.next/BUILD_ID'), 'utf-8').trim()
  } catch {
    return null
  }
}

async function pingDb(): Promise<{ ok: boolean; latencyMs: number; detail?: string }> {
  const sb = getResearchAdminClient()
  if (!sb) return { ok: false, latencyMs: 0, detail: 'no_service_role' }
  const t0 = Date.now()
  // research_participants: 운영 중 안정·마이그레이션 영향 0. service_role 로 RLS 우회.
  const { error } = await sb.from('research_participants').select('id').limit(1)
  const latencyMs = Date.now() - t0
  return error ? { ok: false, latencyMs, detail: error.message } : { ok: true, latencyMs }
}

async function checkCloudflared(): Promise<'active' | 'inactive' | 'unknown'> {
  try {
    const { spawnSync } = await import('node:child_process')
    const svc = process.env.TUNNEL_SERVICE ?? 'cloudflared-kdli'
    const r = spawnSync('systemctl', ['is-active', svc], { encoding: 'utf-8', timeout: 2000 })
    const out = (r.stdout ?? '').trim()
    if (out === 'active') return 'active'
    if (out === 'inactive' || out === 'failed') return 'inactive'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

export async function GET() {
  const [db, cloudflared] = await Promise.all([pingDb(), checkCloudflared()])
  return Response.json(
    {
      status: db.ok ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: readVersion(),
      buildId: readBuildId(),
      db,
      cloudflared,
    },
    { status: db.ok ? 200 : 503 },
  )
}
