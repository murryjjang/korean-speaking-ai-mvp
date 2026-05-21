// 콘텐츠 admin — questions CRUD (Task 1.7, MVP). admin 권한 필수(requireRole).
// 쓰기는 role 검증 후 service_role 로 수행. (mission_scenarios/question_sets 풀 CRUD는 BACKLOG.)
import { type NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/src/lib/supabase/auth'
import { getSupabaseAdminClient } from '@/src/lib/supabase/admin'

async function guard() {
  const profile = await requireRole(['admin'])
  if (!profile) return null
  const admin = getSupabaseAdminClient()
  return admin
}

export async function GET() {
  const admin = await guard()
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { data, error } = await admin
    .from('questions')
    .select('id, type_id, title, prompt, difficulty, is_active, is_tagged')
    .order('id', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ questions: data ?? [] })
}

export async function POST(request: NextRequest) {
  const admin = await guard()
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  let b: Record<string, unknown>
  try {
    b = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  const id = typeof b.id === 'string' ? b.id.trim() : ''
  const title = typeof b.title === 'string' ? b.title.trim() : ''
  const prompt = typeof b.prompt === 'string' ? b.prompt.trim() : ''
  if (!id || !title || !prompt) {
    return NextResponse.json({ error: 'id/title/prompt 필수' }, { status: 400 })
  }
  const row = {
    id,
    type_id: typeof b.type_id === 'string' ? b.type_id : null,
    title,
    prompt,
    difficulty: typeof b.difficulty === 'string' ? b.difficulty : null,
    is_active: true,
    is_tagged: false,
  }
  const { error } = await admin.from('questions').insert(row)
  if (error) return NextResponse.json({ error: error.message }, { status: 409 })
  return NextResponse.json({ ok: true, id })
}

export async function PATCH(request: NextRequest) {
  const admin = await guard()
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  let b: Record<string, unknown>
  try {
    b = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  const id = typeof b.id === 'string' ? b.id : ''
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of ['type_id', 'title', 'prompt', 'difficulty', 'is_active'] as const) {
    if (k in b) patch[k] = b[k]
  }
  const { error } = await admin.from('questions').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id })
}
