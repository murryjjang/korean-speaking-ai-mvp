// v1.1 단계 10-3 / 16-3·16-4: 학습자 동의 화면 + 언어 토글 + 본문 서식.
//
// 본문 텍스트(consent-text.ts)는 hash 무결성 유지를 위해 그대로 두고, 표시만
// 섹션 헤더(bold + underline) + 리스트 항목으로 풍부하게 렌더한다.

import { redirect } from 'next/navigation'

import { CONSENT_TEXTS, type ConsentLocale } from '@/src/lib/research/consent-text'
import { getCurrentParticipant } from '@/src/lib/research/session'

import { recordConsent, declineConsent } from './actions'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

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

const LOCALE_LABEL: Record<ConsentLocale, string> = {
  ko: '한국어',
  en: 'English',
  vi: 'Tiếng Việt',
  ar: 'العربية',
}

// 화면 상단 안내 문구 — 한국어 우선, 표시 언어가 그 외면 해당 언어로 보조.
const I18N_TEXT: Record<ConsentLocale, { title: string; subtitle: string; pcLabel: string; agree: string; decline: string; lang: string }> = {
  ko: { title: '시험운영 참여 동의', subtitle: '계속하기 전에 본문을 자세히 읽어주세요.', pcLabel: '참여자 코드', agree: '동의하고 시작', decline: '동의하지 않음', lang: '언어 선택' },
  en: { title: 'Consent to Participate', subtitle: 'Please read carefully before continuing.', pcLabel: 'Participant code', agree: 'I agree and start', decline: 'I do not agree', lang: 'Language' },
  vi: { title: 'Đồng ý tham gia thử nghiệm', subtitle: 'Vui lòng đọc kỹ trước khi tiếp tục.', pcLabel: 'Mã người tham gia', agree: 'Tôi đồng ý và bắt đầu', decline: 'Tôi không đồng ý', lang: 'Ngôn ngữ' },
  ar: { title: 'الموافقة على المشاركة', subtitle: 'يرجى القراءة بعناية قبل المتابعة.', pcLabel: 'رمز المشارك', agree: 'أوافق وأبدأ', decline: 'لا أوافق', lang: 'اللغة' },
}

function isConsentLocale(v: unknown): v is ConsentLocale {
  return v === 'ko' || v === 'en' || v === 'vi' || v === 'ar'
}

export default async function ConsentPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const locale: ConsentLocale = isConsentLocale(params.locale) ? params.locale : 'ko'
  const body = CONSENT_TEXTS[locale]
  const t = I18N_TEXT[locale]
  const rtl = locale === 'ar'

  const participant = await getCurrentParticipant()
  if (!participant) redirect('/research/login')
  if (participant.consentStatus) redirect('/research/student/progress')

  return (
    <main
      className="max-w-2xl mx-auto px-4 py-8"
      data-testid="research-consent-page"
      dir={rtl ? 'rtl' : undefined}
    >
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t.title}</h1>
          <p className="text-sm text-text-secondary mt-1">{t.subtitle}</p>
        </div>
        {/* v1.1 16-3 / 16-10-6: KO/EN/VI/AR 4언어 토글 */}
        <div
          className="inline-flex rounded-md border border-border overflow-hidden text-xs"
          role="group"
          aria-label={t.lang}
          data-testid="consent-locale-toggle"
        >
          {(['ko', 'en', 'vi', 'ar'] as ConsentLocale[]).map((code) => (
            <a
              key={code}
              href={`/research/consent?locale=${code}`}
              className={`px-3 py-1.5 ${
                locale === code
                  ? 'bg-primary-600 text-white font-semibold'
                  : 'bg-white text-text-secondary hover:bg-slate-50'
              }`}
              aria-current={locale === code ? 'page' : undefined}
              data-testid={`link-toggle-consent-locale-${code}`}
            >
              {LOCALE_LABEL[code]}
            </a>
          ))}
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
