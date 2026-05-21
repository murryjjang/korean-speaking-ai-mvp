// POST /api/vocab/review { card_id, quality 0-5 } — SM-2 갱신 + action_log. Task 1.4.
import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/src/lib/supabase/server'
import { reviewCard, type SrsState } from '@/src/lib/srs/sm2'

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return NextResponse.json({ error: 'supabase_unconfigured' }, { status: 503 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  let body: { card_id?: string; quality?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  const { card_id, quality } = body
  if (!card_id || typeof quality !== 'number') {
    return NextResponse.json({ error: 'missing card_id/quality' }, { status: 400 })
  }

  // RLS owner 정책으로 본인 카드만 조회됨.
  const { data: card, error: loadErr } = await supabase
    .from('vocab_cards')
    .select('id, term_id, ease_factor, interval_days, repetitions')
    .eq('id', card_id)
    .single()
  if (loadErr || !card) return NextResponse.json({ error: 'card_not_found' }, { status: 404 })

  const state: SrsState = {
    easeFactor: Number(card.ease_factor),
    intervalDays: Number(card.interval_days),
    repetitions: Number(card.repetitions),
  }
  const r = reviewCard(state, quality)

  const { error: updErr } = await supabase
    .from('vocab_cards')
    .update({
      ease_factor: r.easeFactor,
      interval_days: r.intervalDays,
      repetitions: r.repetitions,
      last_quality: r.lastQuality,
      last_reviewed_at: r.lastReviewedAt.toISOString(),
      next_review_at: r.nextReviewAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', card_id)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  // 학습 행동 로그 (best-effort).
  await supabase.from('action_log').insert({
    user_id: user.id,
    action_type: 'vocab_reviewed',
    meta: { card_id, term_id: card.term_id, quality: r.lastQuality },
  })

  return NextResponse.json({
    ok: true,
    next_review_at: r.nextReviewAt.toISOString(),
    interval_days: r.intervalDays,
    ease_factor: r.easeFactor,
  })
}
