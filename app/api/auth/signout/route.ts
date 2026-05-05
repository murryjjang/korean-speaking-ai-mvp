import { createSupabaseServerClient } from '@/src/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  if (supabase) {
    await supabase.auth.signOut()
  }
  return NextResponse.redirect(new URL('/login', request.url), { status: 302 })
}
