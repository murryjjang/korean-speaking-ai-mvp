'use client'

import Image from 'next/image'
import { useActionState } from 'react'
import { loginAction, type LoginState } from './actions'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    loginAction,
    null
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="inline-flex items-center justify-center bg-white rounded-2xl px-6 py-4 shadow-sm">
            <Image
              src="/images/kdli-logo.jpg"
              alt="KDLI - Korea Defense Language Institute"
              width={240}
              height={72}
              priority
              className="h-14 w-auto"
            />
          </div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
            AI 한국어 말하기 훈련·평가
          </h1>
        </div>

        <form
          action={formAction}
          className="bg-surface-raised rounded-xl border border-border p-6 space-y-4"
        >
          <h2 className="text-base font-semibold text-text-primary">로그인</h2>

          {state?.error && (
            <div
              role="alert"
              className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2"
            >
              {state.error}
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm font-medium text-text-primary">
              이메일
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="이메일 주소"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm font-medium text-text-primary">
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="비밀번호"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-primary-700 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? '로그인 중…' : '로그인'}
          </button>

          <p className="text-xs text-text-muted text-center pt-1">
            계정은 관리자가 생성합니다. 담당 교수자에게 문의하세요.
          </p>
        </form>
      </div>
    </div>
  )
}
