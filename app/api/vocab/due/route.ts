// GET /api/vocab/due — 복습 대기 카드 (본인, 일일 임계). Task 1.4.
import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/src/lib/supabase/server'
import { getDueCards, dailyLimit } from '@/src/lib/srs/due'

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return NextResponse.json({ error: 'supabase_unconfigured' }, { status: 503 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  try {
    const cards = await getDueCards(supabase)
    return NextResponse.json({ cards, limit: dailyLimit() })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'due_failed' }, { status: 500 })
  }
}
