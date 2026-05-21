// 범용 service_role Supabase 클라이언트 (SERVER ONLY).
//
// RLS write-staff 정책(예: vocabulary_glosses) 대상의 서버측 쓰기(on-demand gloss
// 생성 캐시 등)에 사용. 절대 클라이언트로 export 하지 않는다.
// SUPABASE_SERVICE_ROLE_KEY 또는 NEXT_PUBLIC_SUPABASE_URL 미설정 시 null.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null | undefined = undefined

export function getSupabaseAdminClient(): SupabaseClient | null {
  if (_client !== undefined) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    _client = null
    return null
  }
  _client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  return _client
}
