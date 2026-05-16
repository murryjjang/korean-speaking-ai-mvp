// v1.1 단계 19.7 [D6.7-5번째]: 동의서를 mother_tongue 단독으로 표시.
//
// 단계 18·19·19.5·19.6에서 4연속 실패의 진짜 원인은 login → consent redirect URL에
// `?locale=${lang}` 강제 부착이 mother_tongue 추론을 압살한 것. 19.7에서는:
//  1) login redirect의 URL 파라미터 제거 (login/page.tsx)
//  2) consent 페이지의 URL 파라미터 우선순위 제거 (이 파일)
//  3) consent locale 토글 UI 제거 (사용자가 변경 불가)
//  4) mother_tongue 단독 본문 (한국어 본문 없음 — 동의서는 학습 도구 아님)
//
// 본문 텍스트(consent-text.ts)는 hash 무결성 유지를 위해 그대로 둔다.

import { redirect } from 'next/navigation'

import { CONSENT_TEXTS, type ConsentLocale } from '@/src/lib/research/consent-text'
import { getCurrentParticipant } from '@/src/lib/research/session'
import { inferDisplayLanguageFromMotherTongue } from '@/src/lib/i18n/display-language'

import { recordConsent, declineConsent } from './actions'

// 본문을 표시 전용으로 파싱: 첫 줄은 제목, [..]로 시작하는 줄은 섹션 헤더,
// -로 시작하는 줄은 리스트, 그 외는 단락.
function renderConsentBody(body: string): React.ReactNode {
  const lines = body.split('\n')
  // 첫 비어있지 않은 줄을 제목으로 간주.
  const titleIdx = lines.findIndex((l) => l.trim() !== '')
  const title = titleIdx >= 0 ? lines[titleIdx].trim() : ''
  const rest = lines.slice(titleIdx + 1)

  type Block =
    | { kind: 'p'; text: string }
    | { kind: 'h'; text: string }
    | { kind: 'ul'; items: string[] }

  const blocks: Block[] = []
  let buf: string[] = []

  const flushParagraph = () => {
    const text = buf.join(' ').trim()
    if (text) blocks.push({ kind: 'p', text })
    buf = []
  }

  for (const raw of rest) {
    const line = raw.trim()
    if (line === '') {
      flushParagraph()
      continue
    }
    if (line.startsWith('[') && line.endsWith(']')) {
      flushParagraph()
      blocks.push({ kind: 'h', text: line })
      continue
    }
    if (line.startsWith('- ')) {
      flushParagraph()
      const last = blocks[blocks.length - 1]
      const item = line.slice(2).trim()
      if (last && last.kind === 'ul') last.items.push(item)
      else blocks.push({ kind: 'ul', items: [item] })
      continue
    }
    buf.push(line)
  }
  flushParagraph()

  return (
    <>
      <h2 className="text-lg font-bold text-text-primary mb-4 leading-snug" data-testid="consent-title">
        {title}
      </h2>
      <div className="space-y-3">
        {blocks.map((b, i) => {
          if (b.kind === 'h') {
            return (
              <h3
                key={i}
                className="text-sm font-bold text-text-primary underline underline-offset-4 decoration-2 decoration-primary-400 mt-3"
              >
                {b.text}
              </h3>
            )
          }
          if (b.kind === 'ul') {
            return (
              <ul key={i} className="list-disc pl-5 space-y-1.5 text-sm text-text-secondary leading-relaxed">
                {b.items.map((it, j) => (
                  <li key={j}>{it}</li>
                ))}
              </ul>
            )
          }
          return (
            <p key={i} className="text-sm text-text-secondary leading-relaxed">
              {b.text}
            </p>
          )
        })}
      </div>
    </>
  )
}

// 화면 상단 안내 문구 — 학습자 mother_tongue 단독.
const I18N_TEXT: Record<ConsentLocale, { title: string; subtitle: string; pcLabel: string; agree: string; decline: string }> = {
  ko: { title: '시험운영 참여 동의', subtitle: '계속하기 전에 본문을 자세히 읽어주세요.', pcLabel: '참여자 코드', agree: '동의하고 시작', decline: '동의하지 않음' },
  en: { title: 'Consent to Participate', subtitle: 'Please read carefully before continuing.', pcLabel: 'Participant code', agree: 'I agree and start', decline: 'I do not agree' },
  vi: { title: 'Đồng ý tham gia thử nghiệm', subtitle: 'Vui lòng đọc kỹ trước khi tiếp tục.', pcLabel: 'Mã người tham gia', agree: 'Tôi đồng ý và bắt đầu', decline: 'Tôi không đồng ý' },
  ar: { title: 'الموافقة على المشاركة', subtitle: 'يرجى القراءة بعناية قبل المتابعة.', pcLabel: 'رمز المشارك', agree: 'أوافق وأبدأ', decline: 'لا أوافق' },
}

function isConsentLocale(v: unknown): v is ConsentLocale {
  return v === 'ko' || v === 'en' || v === 'vi' || v === 'ar'
}

export default async function ConsentPage() {
  const participant = await getCurrentParticipant()
  if (!participant) redirect('/research/login')
  if (participant.consentStatus) redirect('/research/student/progress')

  // v1.1 단계 19.7 [D6.7-5번째]: mother_tongue 단독으로 locale 결정.
  // 단계 19.5에서 추가된 URL ?locale= 우선순위는 login redirect가 강제로 ?locale=ko를
  // 부착하던 문제로 4연속 무력화됐다. 19.7에서 URL 파라미터 영향력을 완전히 제거.
  const inferred = inferDisplayLanguageFromMotherTongue(participant.motherTongue)
  const locale: ConsentLocale = inferred && isConsentLocale(inferred) ? inferred : 'ko'
  const body = CONSENT_TEXTS[locale]
  const t = I18N_TEXT[locale]
  const rtl = locale === 'ar'

  return (
    <main
      className="max-w-2xl mx-auto px-4 py-8"
      data-testid="research-consent-page"
      dir={rtl ? 'rtl' : undefined}
    >
      {/* v1.1 단계 19.7 [D6.7-5번째]: locale 토글 UI 제거 — mother_tongue 단독 결정.
          사용자가 변경할 수 없으며, 가입 시 결정된 mother_tongue 값으로 표시. */}
      <header>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t.title}</h1>
          <p className="text-sm text-text-secondary mt-1">{t.subtitle}</p>
        </div>
      </header>

      <p className="mt-4 text-xs text-text-muted" data-testid="participant-code-label">
        {t.pcLabel}: <span className="font-mono">{participant.participantCode}</span>
      </p>

      <section
        className="mt-4 rounded-md border border-border bg-surface p-5"
        data-testid="consent-body"
      >
        {renderConsentBody(body)}
      </section>

      <div className="mt-6 flex items-center gap-3" data-testid="consent-actions">
        <form action={recordConsent}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="rounded-md bg-primary-600 text-white text-sm font-medium px-4 py-2 hover:bg-primary-700"
            data-testid="btn-consent-agree"
          >
            {t.agree}
          </button>
        </form>
        <form action={declineConsent}>
          <button
            type="submit"
            className="rounded-md border border-border bg-surface text-text-secondary text-sm font-medium px-4 py-2 hover:bg-slate-50"
            data-testid="btn-consent-decline"
          >
            {t.decline}
          </button>
        </form>
      </div>
    </main>
  )
}
