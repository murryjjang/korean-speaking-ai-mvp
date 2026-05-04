import { createClient } from '@supabase/supabase-js'

type SupabaseClientType = ReturnType<typeof createClient>

// Module-level singleton — null when env vars are not configured so callers
// never crash at import time; they must check for null before using the client.
let _client: SupabaseClientType | null | undefined = undefined

export function getSupabaseClient(): SupabaseClientType | null {
  if (_client !== undefined) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    _client = null
    return null
  }

  _client = createClient(url, key)
  return _client
}
