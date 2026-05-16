import { createSupabaseServerClient } from '@/src/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'

import {
  PARTICIPANT_COOKIE,
  clearParticipantSession,
} from '@/src/lib/research/session'

// v1.1 단계 19.6 [격리]: 리서치 모드 격리 — 로그아웃 redirect 분기.
//
// 리서치 참여자는 /research/login으로, 일반 사용자는 /login으로. 두 세션이
// 동시에 존재하면 둘 다 정리하되 우선순위는 리서치 (시험 참여자 격리).

export async function POST(request: NextRequest) {
  const hasResearchParticipant = !!request.cookies.get(PARTICIPANT_COOKIE)?.value

  // Supabase 일반 세션 정리 (있는 경우)
  const supabase = await createSupabaseServerClient()
  if (supabase) {
    await supabase.auth.signOut()
  }

  // 리서치 참여자 쿠키 정리 (있는 경우)
  if (hasResearchParticipant) {
    await clearParticipantSession()
    return NextResponse.redirect(new URL('/research/login', request.url), { status: 302 })
  }

  return NextResponse.redirect(new URL('/login', request.url), { status: 302 })
}
