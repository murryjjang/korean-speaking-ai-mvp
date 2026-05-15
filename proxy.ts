import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// v1.1 단계 10-2: /research 경로는 자체 쿠키 세션(participant_code/admin password)을
// 사용하므로 Supabase auth 가드와는 별개로 처리한다.
const RESEARCH_PARTICIPANT_COOKIE = 'research_participant_id'
const RESEARCH_ADMIN_COOKIE = 'research_admin'

function isPublicResearchPath(pathname: string): boolean {
  return (
    pathname === '/research' ||
    pathname === '/research/login' ||
    pathname === '/research/admin/login' ||
    pathname === '/research/consent/declined'
  )
}

function researchGuard(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl
  if (!pathname.startsWith('/research')) return null
  if (isPublicResearchPath(pathname)) return null

  // 관리자 경로 — research_admin 쿠키 필요.
  if (pathname.startsWith('/research/admin')) {
    const adminCookie = request.cookies.get(RESEARCH_ADMIN_COOKIE)?.value
    if (!adminCookie) {
      const loginUrl = new URL('/research/admin/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next({ request })
  }

  // 참여자 경로 — research_participant_id 쿠키 필요.
  const participantCookie = request.cookies.get(RESEARCH_PARTICIPANT_COOKIE)?.value
  if (!participantCookie) {
    const loginUrl = new URL('/research/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }
  return NextResponse.next({ request })
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /research 경로는 자체 가드로 우선 처리. Supabase 미설정·SMOKE_TEST_MODE에서도 동작.
  if (pathname.startsWith('/research')) {
    const researchResponse = researchGuard(request)
    return researchResponse ?? NextResponse.next()
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Skip auth enforcement when Supabase is not configured OR when running in
  // smoke/E2E test mode. SMOKE_TEST_MODE=1 is set in playwright.config.ts so
  // the test dev server always bypasses auth, keeping mock-based tests stable.
  if (!url || !key || process.env.SMOKE_TEST_MODE === '1') return NextResponse.next()

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // Refresh session — must call getUser() (not getSession()) to validate the JWT.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // All protected routes require a user_profiles row. One query covers all paths.
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.redirect(new URL('/role-missing', request.url))
  }

  // Teacher and admin routes additionally require the matching role.
  if (pathname.startsWith('/teacher') || pathname.startsWith('/admin')) {
    if (profile.role !== 'teacher' && profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/student', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  // v1.1 단계 10: /research 경로 추가. 자체 쿠키 가드로 처리.
  matcher: ['/student/:path*', '/teacher/:path*', '/admin/:path*', '/research/:path*'],
}
