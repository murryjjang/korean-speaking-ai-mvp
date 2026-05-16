// v1.1 단계 10-2 / 16-10-6 / 18 [I]: 참여자 사전 발급 코드 로그인 (KO/EN/VI/AR).
// 단계 18 [I]: KDLI 로고·중앙 정렬·카드 디자인을 /login과 통일.

import Image from 'next/image'
import { redirect } from 'next/navigation'

import { loginWithCode } from './actions'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

type Lang = 'ko' | 'en' | 'vi' | 'ar'

const I18N: Record<Lang, {
  title: string
  subtitle: string
  codeLabel: string
  pinLabel: string
  pinPlaceholder: string
  submit: string
  adminLink: string
  langLabel: string
  errors: {
    not_found: string
    invalid_pin: string
    invalid_code: string
    other: string
  }
}> = {
  ko: {
    title: '시험운영 참여자 로그인',
    subtitle: '사전에 발급받은 참여자 코드(예: P001)를 입력하세요.',
    codeLabel: '참여자 코드',
    pinLabel: 'PIN (선택, 4자리)',
    pinPlaceholder: '없으면 비워두세요',
    submit: '로그인',
    adminLink: '관리자 로그인 →',
    langLabel: '언어 선택',
    errors: {
      not_found: '참여자 코드를 찾을 수 없습니다. 운영자에게 문의하세요.',
      invalid_pin: 'PIN이 일치하지 않습니다.',
      invalid_code: '참여자 코드 형식이 올바르지 않습니다 (예: P001).',
      other: '로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    },
  },
  en: {
    title: 'Pilot Participant Login',
    subtitle: 'Enter the participant code (e.g. P001) you received in advance.',
    codeLabel: 'Participant code',
    pinLabel: 'PIN (optional, 4 digits)',
    pinPlaceholder: 'Leave blank if you do not have one',
    submit: 'Sign in',
    adminLink: 'Admin login →',
    langLabel: 'Language',
    errors: {
      not_found: 'Participant code not found. Please contact the operator.',
      invalid_pin: 'PIN does not match.',
      invalid_code: 'Participant code format is invalid (e.g. P001).',
      other: 'Login failed. Please try again shortly.',
    },
  },
  vi: {
    title: 'Đăng nhập người tham gia thử nghiệm',
    subtitle: 'Vui lòng nhập mã người tham gia (ví dụ: P001) đã được cấp trước.',
    codeLabel: 'Mã người tham gia',
    pinLabel: 'PIN (tùy chọn, 4 chữ số)',
    pinPlaceholder: 'Để trống nếu không có',
    submit: 'Đăng nhập',
    adminLink: 'Đăng nhập quản trị →',
    langLabel: 'Ngôn ngữ',
    errors: {
      not_found: 'Không tìm thấy mã người tham gia. Vui lòng liên hệ người vận hành.',
      invalid_pin: 'PIN không khớp.',
      invalid_code: 'Định dạng mã người tham gia không hợp lệ (ví dụ: P001).',
      other: 'Đăng nhập thất bại. Vui lòng thử lại sau.',
    },
  },
  ar: {
    title: 'تسجيل دخول المشارك في التجربة',
    subtitle: 'يرجى إدخال رمز المشارك (مثل P001) الذي تم إصداره مسبقًا.',
    codeLabel: 'رمز المشارك',
    pinLabel: 'رقم سري (اختياري، 4 أرقام)',
    pinPlaceholder: 'اتركه فارغًا إذا لم يكن لديك',
    submit: 'تسجيل الدخول',
    adminLink: 'تسجيل دخول المسؤول ←',
    langLabel: 'اللغة',
    errors: {
      not_found: 'لم يتم العثور على رمز المشارك. يرجى التواصل مع المشغّل.',
      invalid_pin: 'رقم PIN غير مطابق.',
      invalid_code: 'صيغة رمز المشارك غير صحيحة (مثل P001).',
      other: 'فشل تسجيل الدخول. يرجى المحاولة لاحقًا.',
    },
  },
}

const LOCALE_LABEL: Record<Lang, string> = {
  ko: '한국어',
  en: 'English',
  vi: 'Tiếng Việt',
  ar: 'العربية',
}

function isLang(v: unknown): v is Lang {
  return v === 'ko' || v === 'en' || v === 'vi' || v === 'ar'
}

export default async function ResearchLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const error = typeof params.error === 'string' ? params.error : null
  const redirectTo = typeof params.redirectTo === 'string' ? params.redirectTo : '/research/consent'
  const lang: Lang = isLang(params.lang) ? params.lang : 'ko'
  const t = I18N[lang]
  const rtl = lang === 'ar'

  const action = async (formData: FormData) => {
    'use server'
    const code = String(formData.get('code') ?? '').trim()
    const pin = String(formData.get('pin') ?? '').trim()
    const ok = await loginWithCode(code, pin)
    if (!ok.success) {
      redirect(`/research/login?error=${encodeURIComponent(ok.reason)}&redirectTo=${encodeURIComponent(redirectTo)}&lang=${lang}`)
    }
    redirect(ok.consentRequired ? `/research/consent?locale=${lang}` : redirectTo)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-surface px-4 py-10"
      data-testid="research-login-page"
      dir={rtl ? 'rtl' : undefined}
    >
      <main className="w-full max-w-sm">
        {/* 단계 18 [I]: /login과 동일한 KDLI 로고·중앙 정렬·타이틀 폰트. */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <Image
            src="/logos/kdli-seal-512.png"
            alt="KDLI - Korea Defense Language Institute"
            width={384}
            height={384}
            priority
            className="h-40 w-40"
          />
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight text-center">
            {t.title}
          </h1>
          <p className="text-sm text-text-secondary text-center">{t.subtitle}</p>
        </div>

        {/* 4언어 토글 — 카드 위 중앙 배치 */}
        <div className="flex justify-center mb-4">
          <div
            className="inline-flex rounded-md border border-border overflow-hidden text-xs"
            role="group"
            aria-label={t.langLabel}
            data-testid="login-locale-toggle"
          >
            {(['ko', 'en', 'vi', 'ar'] as Lang[]).map((code) => (
              <a
                key={code}
                href={`/research/login?lang=${code}${redirectTo ? `&redirectTo=${encodeURIComponent(redirectTo)}` : ''}`}
                className={`px-2.5 py-1.5 ${
                  lang === code
                    ? 'bg-primary-600 text-white font-semibold'
                    : 'bg-white text-text-secondary hover:bg-slate-50'
                }`}
                aria-current={lang === code ? 'page' : undefined}
                data-testid={`login-locale-${code}`}
              >
                {LOCALE_LABEL[code]}
              </a>
            ))}
          </div>
        </div>

        <form
          action={action}
          className="bg-surface-raised rounded-xl border border-border p-6 space-y-4"
        >
          {error ? (
            <div
              role="alert"
              className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2"
              data-testid="login-error"
            >
              {error === 'not_found'
                ? t.errors.not_found
                : error === 'invalid_pin'
                  ? t.errors.invalid_pin
                  : error === 'invalid_code'
                    ? t.errors.invalid_code
                    : t.errors.other}
            </div>
          ) : null}

          <div className="space-y-1">
            <label
              htmlFor="research-login-code"
              className="block text-sm font-medium text-text-primary"
            >
              {t.codeLabel}
            </label>
            <input
              id="research-login-code"
              name="code"
              type="text"
              inputMode="text"
              autoComplete="off"
              required
              placeholder="P001"
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary-500"
              data-testid="input-participant-code"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="research-login-pin"
              className="block text-sm font-medium text-text-primary"
            >
              {t.pinLabel}
            </label>
            <input
              id="research-login-pin"
              name="pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              placeholder={t.pinPlaceholder}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary-500"
              data-testid="input-participant-pin"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-primary-700 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-primary-800 transition-colors"
            data-testid="btn-research-login"
          >
            {t.submit}
          </button>
        </form>

        <p className="mt-3 text-xs text-center">
          <a href="/research/admin/login" className="text-primary-600 hover:underline">
            {t.adminLink}
          </a>
        </p>
      </main>
    </div>
  )
}
