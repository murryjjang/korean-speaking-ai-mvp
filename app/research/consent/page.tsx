// v1.1 단계 10-3: 학습자 동의 화면.

import { redirect } from 'next/navigation'

import { CONSENT_TEXT_EN, CONSENT_TEXT_KO } from '@/src/lib/research/consent-text'
import { getCurrentParticipant } from '@/src/lib/research/session'

import { recordConsent, declineConsent } from './actions'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function ConsentPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const locale = params.locale === 'en' ? 'en' : 'ko'
  const body = locale === 'en' ? CONSENT_TEXT_EN : CONSENT_TEXT_KO

  const participant = await getCurrentParticipant()
  if (!participant) redirect('/research/login')
  if (participant.consentStatus) redirect('/research/student/progress')

  return (
    <main className="max-w-2xl mx-auto px-4 py-8" data-testid="research-consent-page">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            {locale === 'en' ? 'Consent to Participate' : '시험운영 참여 동의'}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {locale === 'en'
              ? 'Please read carefully before continuing.'
              : '계속하기 전에 본문을 자세히 읽어주세요.'}
          </p>
        </div>
        <div className="text-xs">
          <a
            href={`/research/consent?locale=${locale === 'ko' ? 'en' : 'ko'}`}
            className="text-primary-600 hover:underline"
            data-testid="link-toggle-consent-locale"
          >
            {locale === 'ko' ? 'English' : '한국어'}
          </a>
        </div>
      </header>

      <p className="mt-4 text-xs text-text-muted" data-testid="participant-code-label">
        {locale === 'en' ? 'Participant code' : '참여자 코드'}: <span className="font-mono">{participant.participantCode}</span>
      </p>

      <section
        className="mt-4 rounded-md border border-border bg-surface p-4 text-sm text-text-secondary whitespace-pre-wrap leading-relaxed"
        data-testid="consent-body"
      >
        {body}
      </section>

      <div className="mt-6 flex items-center gap-3" data-testid="consent-actions">
        <form action={recordConsent}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="rounded-md bg-primary-600 text-white text-sm font-medium px-4 py-2 hover:bg-primary-700"
            data-testid="btn-consent-agree"
          >
            {locale === 'en' ? 'I agree and start' : '동의하고 시작'}
          </button>
        </form>
        <form action={declineConsent}>
          <button
            type="submit"
            className="rounded-md border border-border bg-surface text-text-secondary text-sm font-medium px-4 py-2 hover:bg-slate-50"
            data-testid="btn-consent-decline"
          >
            {locale === 'en' ? 'I do not agree' : '동의하지 않음'}
          </button>
        </form>
      </div>
    </main>
  )
}
