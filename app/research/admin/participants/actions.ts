'use server'

import { revalidatePath } from 'next/cache'

import { hashPin, isValidParticipantCode, nextParticipantCode } from '@/src/lib/research/helpers'
import { createParticipant, listParticipants } from '@/src/lib/research/repository'

export async function createParticipantAction(formData: FormData): Promise<void> {
  const codeRaw = String(formData.get('participantCode') ?? '').trim()
  const name = String(formData.get('name') ?? '').trim() || null
  const nationality = String(formData.get('nationality') ?? '').trim() || null
  const koreanLevel = String(formData.get('koreanLevel') ?? '').trim() || null
  const motherTongue = String(formData.get('motherTongue') ?? '').trim() || null
  const pin = String(formData.get('pin') ?? '').trim()
  const notes = String(formData.get('notes') ?? '').trim() || null

  let code = codeRaw
  if (!code) {
    const existing = await listParticipants()
    code = nextParticipantCode(existing.map((p) => p.participantCode))
  } else if (!isValidParticipantCode(code)) {
    // 잘못된 형식은 그냥 무시하지 말고 P001 형식으로 정규화 시도. 자릿수 0 패딩.
    const m = /^p?(\d+)$/i.exec(code)
    if (m) code = `P${String(parseInt(m[1], 10)).padStart(3, '0')}`
  }

  const pinHash = pin && /^\d{4}$/.test(pin) ? await hashPin(pin) : null

  await createParticipant({
    participantCode: code,
    pinHash,
    name,
    nationality,
    koreanLevel,
    motherTongue,
    notes,
  })

  revalidatePath('/research/admin/participants')
}
