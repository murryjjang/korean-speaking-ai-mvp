// Known Whisper hallucination phrases produced when audio is silent/near-silent.
// These are YouTube-style outros that appear frequently in Korean training data.
const KNOWN_HALLUCINATIONS: readonly string[] = [
  '시청해주셔서 감사합니다.',
  '시청해 주셔서 감사합니다.',
  '구독과 좋아요',
  '구독 좋아요',
  '좋아요와 구독',
  '구독하기',
  '좋아요 눌러주세요',
  '시청해주셔서',
  '시청해 주셔서',
]

// Regex patterns for broader hallucination categories.
// Whisper tends to fabricate news anchor outros, broadcast IDs, and YouTube
// sign-offs when fed near-silent or low-energy Korean audio.
//
// v1.1 16-8: 짧은 단어 매칭(뉴스/앵커/기자/이덕용 등)은 학습자 정상 발화를
// 오탐할 수 있어 제거. 전체 문장 패턴만 유지한다.
//
// v1.1 단계 18 [F]: 시연 중 새로 발견된 환각 4종 추가 (자막 설정 안내, 선택 안내,
// 시청 감사, 구독·좋아요). 학습자 정상 발화에서 흔히 나타나지 않는 표현이라
// 전체 문장 길이를 좁혀 오탐 최소화.
const HALLUCINATION_PATTERNS: readonly RegExp[] = [
  // "MBC 뉴스 이덕용입니다" — broadcaster + 뉴스 + 이름 + 입니다로 끝나는 짧은 문장만 차단.
  /^\s*(MBC|KBS|SBS|JTBC|YTN|TVN|채널A|TV조선)\s*뉴스\s+.{1,15}입니다\.?\s*$/,
  // "○○○ 앵커입니다." 짧은 문장만 (학습자가 평소 쓰지 않는 형태).
  /^\s*.{0,20}앵커입니다\.?\s*$/,
  // "오늘 ○○○ 기자였습니다." 짧은 뉴스 사인오프 문장.
  /^\s*.{0,30}기자였습니다\.?\s*$/,
  // YouTube CTA — 명시적 채널 구독 권유 한 문장.
  /^\s*.{0,20}채널을\s*구독.{0,20}$/,
  // YouTube outro — "오늘은 여기까지" 형태 한 문장.
  /^\s*오늘은\s*여기까지.{0,20}$/,
  // 단계 18 [F]: 자막/언어 안내 메타 텍스트 (방송 자막 메시지 누출).
  /자막은?\s*설정에서/,
  /선택하실\s*수\s*있습니다/,
  // 단계 18 [F]: YouTube outro 변형 — 오늘도 시청해주셔서.
  /오늘도?\s*시청해주셔서/,
  // 단계 18 [F]: 구독과/구독 + 좋아요 결합 (느슨한 매칭, 학습자 정상 발화 아님).
  /구독과?\s*좋아요/,
]

export function normalizeTranscript(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

export function isGenericYouTubeOutro(text: string): boolean {
  const lower = normalizeTranscript(text).toLowerCase()
  return (
    lower.includes('시청해주셔서') ||
    lower.includes('시청해 주셔서') ||
    (lower.includes('구독') && lower.includes('좋아요'))
  )
}

export function isLikelySttHallucination(transcript: string): boolean {
  const normalized = normalizeTranscript(transcript)
  const lower = normalized.toLowerCase()

  // Exact or substring match against known hallucination phrases
  for (const phrase of KNOWN_HALLUCINATIONS) {
    if (lower === phrase.toLowerCase() || lower.includes(phrase.toLowerCase())) {
      return true
    }
  }

  // Regex patterns (news anchor, broadcaster, fake names, CTAs)
  for (const pattern of HALLUCINATION_PATTERNS) {
    if (pattern.test(normalized)) return true
  }

  // YouTube-style outros (broader check)
  if (isGenericYouTubeOutro(normalized)) return true

  return false
}

/**
 * 단계 18 [F]: 연속 반복 문장 제거.
 *
 * Whisper가 환각을 일으킬 때 종종 같은 문장을 2회 이상 반복한다 ("자막은 설정에서
 * 자막은 설정에서..."). 정규화된 문장 단위로 분리해 동일 문장이 2번째부터 나오면
 * 드롭한다. 정상 발화에서도 학습자가 같은 단어를 반복할 수 있으나, 의미 단위
 * 문장 전체가 2회 이상 똑같이 반복되는 일은 드물어 안전.
 *
 * @returns { text, droppedCount } 정리된 transcript와 드롭한 중복 횟수.
 */
export function dedupeRepeatedSentences(transcript: string): { text: string; droppedCount: number } {
  const normalized = normalizeTranscript(transcript)
  if (!normalized) return { text: '', droppedCount: 0 }

  // 마침표·물음표·느낌표 + 공백을 경계로 분리 (구두점 보존을 위해 lookbehind).
  const parts = normalized.split(/(?<=[.!?。])\s+/).filter(Boolean)
  if (parts.length <= 1) return { text: normalized, droppedCount: 0 }

  const seen = new Set<string>()
  const kept: string[] = []
  let dropped = 0
  for (const part of parts) {
    const key = part.replace(/\s+/g, ' ').trim().toLowerCase()
    if (!key) continue
    if (seen.has(key)) {
      dropped += 1
      continue
    }
    seen.add(key)
    kept.push(part)
  }
  return { text: kept.join(' '), droppedCount: dropped }
}

/**
 * 단계 18 [F]: STT 환각 + 반복 정리 종합. 호출 측에서 한 번에 처리.
 * - 전체 transcript가 환각이면 빈 문자열 반환 (호출 측이 'no-speech' 처리).
 * - 그렇지 않으면 반복 문장만 제거하고 정리된 transcript 반환.
 * - 드롭된 항목과 사유를 부가 정보로 함께 돌려준다 (디버깅·로그용).
 */
export function sanitizeTranscript(transcript: string): {
  text: string
  hallucination: boolean
  dedupedCount: number
} {
  const normalized = normalizeTranscript(transcript)
  if (isLikelySttHallucination(normalized)) {
    return { text: '', hallucination: true, dedupedCount: 0 }
  }
  const { text, droppedCount } = dedupeRepeatedSentences(normalized)
  return { text, hallucination: false, dedupedCount: droppedCount }
}
