// v1.1 단계 10-2: 참여자 사전 발급 코드 로그인.

import { redirect } from 'next/navigation'

import { loginWithCode } from './actions'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function ResearchLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const error = typeof params.error === 'string' ? params.error : null
  const redirectTo = typeof params.redirectTo === 'string' ? params.redirectTo : '/research/consent'

  const action = async (formData: FormData) => {
    'use server'
    const code = String(formData.get('code') ?? '').trim()
    const pin = String(formData.get('pin') ?? '').trim()
    const ok = await loginWithCode(code, pin)
    if (!ok.success) {
      redirect(`/research/login?error=${encodeURIComponent(ok.reason)}&redirectTo=${encodeURIComponent(redirectTo)}`)
    }
    redirect(ok.consentRequired ? '/research/consent' : redirectTo)
  }

  return (
    <main className="max-w-md mx-auto px-4 py-10" data-testid="research-login-page">
      <h1 className="text-xl font-bold text-text-primary">시험운영 참여자 로그인</h1>
      <p className="text-sm text-text-secondary mt-1">
        사전에 발급받은 참여자 코드(예: P001)를 입력하세요.
      </p>

      {error ? (
        <p className="mt-4 text-sm text-red-600" data-testid="login-error">
          {error === 'not_found'
            ? '참여자 코드를 찾을 수 없습니다. 운영자에게 문의하세요.'
            : error === 'invalid_pin'
              ? 'PIN이 일치하지 않습니다.'
              : error === 'invalid_code'
                ? '참여자 코드 형식이 올바르지 않습니다 (예: P001).'
                : '로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.'}
        </p>
      ) : null}

      <form action={action} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-text-secondary">참여자 코드</span>
          <input
            name="code"
            type="text"
            inputMode="text"
            autoComplete="off"
            required
            placeholder="P001"
            className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            data-testid="input-participant-code"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-text-secondary">PIN (선택, 4자리)</span>
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            placeholder="없으면 비워두세요"
            className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            data-testid="input-participant-pin"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-md bg-primary-600 text-white text-sm font-medium px-4 py-2 hover:bg-primary-700"
          data-testid="btn-research-login"
        >
          로그인
        </button>
      </form>

      <p className="mt-6 text-xs text-text-muted">
        Pre-issued participant code login (admin link below for operators).
      </p>
      <p className="mt-2 text-xs">
        <a href="/research/admin/login" className="text-primary-600 hover:underline">
          관리자 로그인 →
        </a>
      </p>
    </main>
  )
}
