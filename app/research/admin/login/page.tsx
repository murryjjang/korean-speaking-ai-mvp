// v1.1 단계 10-2: 관리자 로그인 — env 비밀번호 단순 보호.

import { redirect } from 'next/navigation'

import { setAdminSession, verifyAdminPassword } from '@/src/lib/research/session'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function AdminLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const error = typeof params.error === 'string' ? params.error : null
  const redirectTo = typeof params.redirectTo === 'string' ? params.redirectTo : '/research/admin'

  const action = async (formData: FormData) => {
    'use server'
    const pwd = String(formData.get('password') ?? '')
    const ok = await verifyAdminPassword(pwd)
    if (!ok) {
      redirect(`/research/admin/login?error=invalid&redirectTo=${encodeURIComponent(redirectTo)}`)
    }
    const set = await setAdminSession()
    if (!set) {
      redirect(`/research/admin/login?error=not_configured&redirectTo=${encodeURIComponent(redirectTo)}`)
    }
    redirect(redirectTo)
  }

  return (
    <main className="max-w-md mx-auto px-4 py-10" data-testid="research-admin-login-page">
      <h1 className="text-xl font-bold text-text-primary">시험운영 관리자 로그인</h1>
      <p className="text-sm text-text-secondary mt-1">
        RESEARCH_ADMIN_PASSWORD 환경변수로 보호되는 관리자 페이지입니다.
      </p>

      {error ? (
        <p className="mt-4 text-sm text-red-600" data-testid="admin-login-error">
          {error === 'not_configured'
            ? '서버에 RESEARCH_ADMIN_PASSWORD가 설정되지 않았습니다.'
            : '비밀번호가 일치하지 않습니다.'}
        </p>
      ) : null}

      <form action={action} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-text-secondary">비밀번호</span>
          <input
            name="password"
            type="password"
            autoComplete="off"
            required
            className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            data-testid="input-admin-password"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-md bg-primary-600 text-white text-sm font-medium px-4 py-2 hover:bg-primary-700"
          data-testid="btn-admin-login"
        >
          관리자 로그인
        </button>
      </form>

      <p className="mt-6 text-xs">
        <a href="/research/login" className="text-primary-600 hover:underline">
          ← 참여자 로그인
        </a>
      </p>
    </main>
  )
}
