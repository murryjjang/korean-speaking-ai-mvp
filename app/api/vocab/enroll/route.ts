// POST /api/vocab/enroll { content_id } — 콘텐츠 통과 시 core/challenging 어휘 자동 등록.
// 콘텐츠 학습 통과 흐름에서 호출(D-012a). idempotent. Task 1.4.
import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/src/lib/supabase/server'
import { enrollFromContent } from '@/src/lib/srs/enroll'

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return NextResponse.json({ error: 'supabase_unconfigured' }, { status: 503 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  let body: { content_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  if (!body.content_id) return NextResponse.json({ error: 'missing content_id' }, { status: 400 })

  try {
    const { enrolled, candidates } = await enrollFromContent(supabase, user.id, body.content_id)
    return NextResponse.json({ ok: true, enrolled, candidates })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'enroll_failed' }, { status: 500 })
  }
}
