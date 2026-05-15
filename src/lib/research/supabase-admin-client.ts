// v1.1 단계 10-1: research 도메인 전용 service_role Supabase 클라이언트.
//
// research_* 테이블은 RLS가 INSERT-anon만 허용하고 SELECT/UPDATE/DELETE는 default
// deny이므로 서버에서 관리자 페이지·CSV 내보내기·세션 종료 업데이트는 service_role
// 키로 RLS를 우회한다. SERVER ONLY — 절대 클라이언트로 export 하지 않는다.
//
// SUPABASE_SERVICE_ROLE_KEY 또는 NEXT_PUBLIC_SUPABASE_URL 미설정 시 null 반환.

import { createClient } from '@supabase/supabase-js'

type SupabaseClientType = ReturnType<typeof createClient>

let _client: SupabaseClientType | null | undefined = undefined

export function getResearchAdminClient(): SupabaseClientType | null {
  if (_client !== undefined) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    _client = null
    return null
  }

  _client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return _client
}

// 테스트용 — 모듈 캐시 리셋
export function _resetResearchAdminClientForTest(): void {
  _client = undefined
}
