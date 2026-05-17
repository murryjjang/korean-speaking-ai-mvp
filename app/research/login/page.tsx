// v1.1 단계 10-2 / 16-10-6 / 18 [I]: 참여자 사전 발급 코드 로그인.
// 단계 18 [I]: KDLI 로고·중앙 정렬·카드 디자인을 /login과 통일.
// v1.1 단계 19.10 [#8]: 19.7 결정에 따라 언어 토글 제거. 학습자는 로그인하기
// 전까지는 mother_tongue이 정해지지 않아 토글로 미리 보는 UI 언어는 의미가 없다.
// 동의서 이후 화면은 mother_tongue 단독으로 보조 표기를 결정한다. 로그인 카드는
// 한국어 본문 + 6개 외국어 보조 라벨을 한 화면에 함께 노출해 어느 모국어 학습자도
// 코드·PIN 입력 의미를 이해할 수 있게 한다.

import { redirect } from 'next/navigation'

import { loginWithCode } from './actions'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

type Lang = 'ko' | 'en' | 'vi' | 'ar' | 'th' | 'ms' | 'km'

const I18N: Record<Lang, {
  title: string
  subtitle: string
  codeLabel: string
  pinLabel: string
  pinPlaceholder: string
  submit: string
  adminLink: string
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
    errors: {
      not_found: 'لم يتم العثور على رمز المشارك. يرجى التواصل مع المشغّل.',
      invalid_pin: 'رقم PIN غير مطابق.',
      invalid_code: 'صيغة رمز المشارك غير صحيحة (مثل P001).',
      other: 'فشل تسجيل الدخول. يرجى المحاولة لاحقًا.',
    },
  },
  th: {
    title: 'การเข้าสู่ระบบของผู้เข้าร่วมการทดลองใช้งาน',
    subtitle: 'กรุณากรอกรหัสผู้เข้าร่วม (เช่น P001) ที่ออกให้ล่วงหน้า',
    codeLabel: 'รหัสผู้เข้าร่วม',
    pinLabel: 'PIN (ทางเลือก, 4 หลัก)',
    pinPlaceholder: 'หากไม่มี กรุณาเว้นว่างไว้',
    submit: 'เข้าสู่ระบบ',
    adminLink: 'เข้าสู่ระบบผู้ดูแล →',
    errors: {
      not_found: 'ไม่พบรหัสผู้เข้าร่วม กรุณาติดต่อผู้ดำเนินการ',
      invalid_pin: 'PIN ไม่ตรงกัน',
      invalid_code: 'รูปแบบรหัสผู้เข้าร่วมไม่ถูกต้อง (เช่น P001)',
      other: 'การเข้าสู่ระบบล้มเหลว กรุณาลองอีกครั้งภายหลัง',
    },
  },
  ms: {
    title: 'Log Masuk Peserta Uji Operasi',
    subtitle: 'Sila masukkan kod peserta (cth: P001) yang dikeluarkan terlebih dahulu.',
    codeLabel: 'Kod peserta',
    pinLabel: 'PIN (pilihan, 4 digit)',
    pinPlaceholder: 'Biarkan kosong jika tiada',
    submit: 'Log Masuk',
    adminLink: 'Log masuk pentadbir →',
    errors: {
      not_found: 'Kod peserta tidak dijumpai. Sila hubungi pengendali.',
      invalid_pin: 'PIN tidak sepadan.',
      invalid_code: 'Format kod peserta tidak sah (cth: P001).',
      other: 'Log masuk gagal. Sila cuba lagi sebentar.',
    },
  },
  km: {
    title: 'ការចូលរបស់អ្នកចូលរួមការសាកល្បងប្រតិបត្តិការ',
    subtitle: 'សូមបញ្ចូលលេខកូដអ្នកចូលរួម (ឧ. P001) ដែលបានចេញជាមុន។',
    codeLabel: 'លេខកូដអ្នកចូលរួម',
    pinLabel: 'PIN (ស្រេចចិត្ត, ៤ ខ្ទង់)',
    pinPlaceholder: 'បើគ្មាន សូមទុកឲ្យទទេ',
    submit: 'ចូល',
    adminLink: 'ចូលប្រព័ន្ធអ្នកគ្រប់គ្រង →',
    errors: {
      not_found: 'រកមិនឃើញលេខកូដអ្នកចូលរួមទេ។ សូមទាក់ទងអ្នកប្រតិបត្តិការ។',
      invalid_pin: 'PIN មិនត្រូវគ្នាទេ។',
      invalid_code: 'ទម្រង់លេខកូដអ្នកចូលរួមមិនត្រឹមត្រូវ (ឧ. P001)។',
      other: 'ការចូលបរាជ័យ។ សូមព្យាយាមម្តងទៀតក្រោយពេលបន្តិច។',
    },
  },
}

// v1.1 단계 19.10 [#8]: 보조 라벨 — 코드 입력·PIN 입력의 의미를 6개 외국어로 함께 표시.
const FOREIGN_LANGS: Lang[] = ['en', 'vi', 'ar', 'th', 'ms', 'km']
const RTL_LANGS: ReadonlyArray<Lang> = ['ar']

export default async function ResearchLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const error = typeof params.error === 'string' ? params.error : null
  const redirectTo = typeof params.redirectTo === 'string' ? params.redirectTo : '/research/consent'
  // v1.1 단계 19.10 [#8]: 한국어 본문 고정. mother_tongue 보조는 동의서/대시보드부터.
  const lang: Lang = 'ko'
  const t = I18N[lang]

  const action = async (formData: FormData) => {
    'use server'
    const code = String(formData.get('code') ?? '').trim()
    const pin = String(formData.get('pin') ?? '').trim()
    const ok = await loginWithCode(code, pin)
    if (!ok.success) {
      // v1.1 단계 19.10 [#8]: redirect URL에서 &lang= 잔류 제거.
      redirect(`/research/login?error=${encodeURIComponent(ok.reason)}&redirectTo=${encodeURIComponent(redirectTo)}`)
    }
    // v1.1 단계 19.7 [아키텍처]: ?locale=${lang} 강제 부착 제거.
    // 동의서는 학습자 mother_tongue 단독으로 표시 언어를 결정한다 — 로그인 페이지의
    // UI 언어 토글이 동의서 본문 언어를 덮어쓰는 4연속 실패의 근본 원인이었다.
    redirect(ok.consentRequired ? '/research/consent' : redirectTo)
  }

  // v1.1 단계 19.10 [#8]: 코드/PIN 라벨을 6개 외국어 작은 글씨로 함께 보여 다언어 학습자 모두 이해 가능.
  const codeLabelHints = FOREIGN_LANGS.map((c) => ({
    code: c,
    text: I18N[c].codeLabel,
    rtl: RTL_LANGS.includes(c),
  }))
  const pinLabelHints = FOREIGN_LANGS.map((c) => ({
    code: c,
    text: I18N[c].pinLabel,
    rtl: RTL_LANGS.includes(c),
  }))

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-surface px-4 py-10"
      data-testid="research-login-page"
    >
      <main className="w-full max-w-sm">
        {/* v1.1 단계 19.9 [로고]: 공식 KDLI 원형 로고 (사용자 제공). */}
        <div className="flex flex-col items-center gap-4 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/kdli-logo-circle.png"
            alt="KDLI - Korea Defense Language Institute"
            width={224}
            height={224}
            className="h-56 w-56 object-contain"
            data-testid="kdli-logo"
          />
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight text-center">
            {t.title}
          </h1>
          <p className="text-sm text-text-secondary text-center">{t.subtitle}</p>
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
              lang="ko"
            >
              {t.codeLabel}
            </label>
            <div
              className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-text-muted leading-snug"
              data-testid="code-label-hints"
            >
              {codeLabelHints.map((h) => (
                <span
                  key={h.code}
                  lang={h.code}
                  dir={h.rtl ? 'rtl' : undefined}
                  style={h.rtl ? { unicodeBidi: 'plaintext', textAlign: 'start' } : undefined}
                >
                  {h.text}
                </span>
              ))}
            </div>
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
              lang="ko"
            >
              {t.pinLabel}
            </label>
            <div
              className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-text-muted leading-snug"
              data-testid="pin-label-hints"
            >
              {pinLabelHints.map((h) => (
                <span
                  key={h.code}
                  lang={h.code}
                  dir={h.rtl ? 'rtl' : undefined}
                  style={h.rtl ? { unicodeBidi: 'plaintext', textAlign: 'start' } : undefined}
                >
                  {h.text}
                </span>
              ))}
            </div>
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
