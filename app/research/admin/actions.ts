'use server'

import { redirect } from 'next/navigation'

import { clearAdminSession } from '@/src/lib/research/session'

export async function clearAdminSessionAction(): Promise<void> {
  await clearAdminSession()
  redirect('/research/admin/login')
}
