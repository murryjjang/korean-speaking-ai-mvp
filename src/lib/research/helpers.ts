// v1.1 단계 10: 시험운영 공통 유틸리티 (참여자 코드 생성·해시·IP 익명화).
//
// crypto는 Node 표준 (Web Crypto). Edge Runtime 호환.

/** 4자리 PIN 해시 (SHA-256, base16). PIN 자체는 절대 저장하지 않는다. */
export async function hashPin(pin: string): Promise<string> {
  return sha256Hex(`pin:${pin}`)
}

/** 문자열 SHA-256 → base16 */
export async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', encoder.encode(input))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * 참여자 코드 자동 생성: 기존 코드 목록에서 가장 큰 P### 다음 번호를 반환한다.
 * 예: [], P001, P003 → P002 (빈 자리 우선) … 아니, 단순화: max+1.
 */
export function nextParticipantCode(existingCodes: readonly string[]): string {
  const numbers = existingCodes
    .map((c) => {
      const m = /^P(\d+)$/.exec(c)
      return m ? parseInt(m[1], 10) : 0
    })
    .filter((n) => Number.isFinite(n) && n > 0)
  const next = numbers.length === 0 ? 1 : Math.max(...numbers) + 1
  return `P${String(next).padStart(3, '0')}`
}

/**
 * IP 익명화: IPv4는 앞 24비트(/24)만 보존하고 마지막 옥텟을 0으로, IPv6은 앞
 * 48비트(/48)만 보존. 시험운영 감사 로그용 — 개인 식별 가능성 최소화.
 */
export function anonymizeIp(ip: string | null | undefined): string | null {
  if (!ip) return null
  const trimmed = ip.trim()
  if (!trimmed) return null
  // IPv4
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/.exec(trimmed)
  if (v4) return `${v4[1]}.${v4[2]}.${v4[3]}.0`
  // IPv6 (단순화: 처음 3 그룹만 보존)
  if (trimmed.includes(':')) {
    const groups = trimmed.split(':')
    if (groups.length >= 3) return `${groups.slice(0, 3).join(':')}::/48`
  }
  return null
}

/** 참여자 코드 형식 검증 (P + 3자리 숫자) */
export function isValidParticipantCode(code: string): boolean {
  return /^P\d{3,}$/.test(code)
}
