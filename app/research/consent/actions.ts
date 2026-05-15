'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { CONSENT_TEXT_EN, CONSENT_TEXT_KO, type ConsentLocale } from '@/src/lib/research/consent-text'
import { anonymizeIp, sha256Hex } from '@/src/lib/research/helpers'
import { createConsentLog, markParticipantConsented } from '@/src/lib/research/repository'
import { clearParticipantSession, getCurrentParticipant } from '@/src/lib/research/session'
import { CONSENT_VERSION } from '@/src/lib/research/types'

/** 동의 처리: research_participants.consent_status = true + consent_log 기록 */
export async function recordConsent(formData: FormData): Promise<void> {
  const locale: ConsentLocale = formData.get('locale') === 'en' ? 'en' : 'ko'
  const body = locale === 'en' ? CONSENT_TEXT_EN : CONSENT_TEXT_KO

  const participant = await getCurrentParticipant()
  if (!participant) redirect('/research/login')

  const h = await headers()
  const forwarded = h.get('x-forwarded-for') ?? h.get('x-real-ip') ?? ''
  const rawIp = forwarded.split(',')[0]?.trim() ?? ''
  const ipAnon = anonymizeIp(rawIp)
  const ua = h.get('user-agent') ?? null

  const textHash = await sha256Hex(`${locale}:${body}`)

  // 두 작업이 모두 fail-silent. 실패해도 학습 흐름 진행을 막지 않는다.
  await markParticipantConsented(participant.id)
  await createConsentLog({
    participantId: participant.id,
    consentVersion: CONSENT_VERSION,
    consentTextHash: textHash,
    ipAddress: ipAnon,
    userAgent: ua,
  })

  redirect('/research/student/progress')
}

/** 동의 거부: 세션 종료 + 안내 화면(/research/consent/declined) */
export async function declineConsent(): Promise<void> {
  await clearParticipantSession()
  redirect('/research/consent/declined')
}
