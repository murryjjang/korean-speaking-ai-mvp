'use server'

import { redirect } from 'next/navigation'

import { clearParticipantSession } from '@/src/lib/research/session'

export async function logoutAction(): Promise<void> {
  await clearParticipantSession()
  redirect('/research/login')
}
