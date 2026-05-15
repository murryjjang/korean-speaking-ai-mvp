'use server'

// v1.1 단계 10-2: 참여자 로그인 server action.
//
// 입력: participant_code (필수) + PIN (선택, 4자리).
// 동작: Supabase에서 코드 조회 → PIN 해시 일치 시 쿠키 세션 설정.
// 동의 미완료 참여자는 consent 화면으로 유도.

import { hashPin, isValidParticipantCode } from '@/src/lib/research/helpers'
import { getParticipantByCode } from '@/src/lib/research/repository'
import { setParticipantSession } from '@/src/lib/research/session'

export type LoginResult =
  | { success: true; consentRequired: boolean }
  | { success: false; reason: 'invalid_code' | 'not_found' | 'invalid_pin' | 'error' }

export async function loginWithCode(code: string, pin: string): Promise<LoginResult> {
  if (!isValidParticipantCode(code)) {
    return { success: false, reason: 'invalid_code' }
  }

  try {
    const participant = await getParticipantByCode(code)
    if (!participant) return { success: false, reason: 'not_found' }

    // PIN 정책: 참여자에 pin_hash가 설정돼 있으면 입력 PIN 해시와 일치해야 한다.
    // pin_hash가 null이면 PIN 입력은 무시한다 (코드만으로 로그인).
    if (participant.pinHash) {
      if (!pin || pin.length === 0) return { success: false, reason: 'invalid_pin' }
      const inputHash = await hashPin(pin)
      if (inputHash !== participant.pinHash) return { success: false, reason: 'invalid_pin' }
    }

    await setParticipantSession(participant.id)
    return { success: true, consentRequired: !participant.consentStatus }
  } catch (err) {
    console.warn('[research-login] error:', err)
    return { success: false, reason: 'error' }
  }
}
