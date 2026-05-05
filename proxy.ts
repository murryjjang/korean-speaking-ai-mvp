import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Skip auth enforcement when Supabase is not configured OR when running in
  // smoke/E2E test mode. SMOKE_TEST_MODE=1 is set in playwright.config.ts so
  // the test dev server always bypasses auth, keeping mock-based tests stable.
  if (!url || !key || process.env.SMOKE_TEST_MODE === '1') return NextResponse.next()

  const { pathname } = request.nextUrl

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

  // Teacher and admin routes require a matching role in user_profiles.
  if (pathname.startsWith('/teacher') || pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.redirect(new URL('/role-missing', request.url))
    }

    if (profile.role !== 'teacher' && profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/student', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/student/:path*', '/teacher/:path*', '/admin/:path*'],
}
