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
