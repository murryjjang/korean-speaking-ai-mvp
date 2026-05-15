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
const HALLUCINATION_PATTERNS: readonly RegExp[] = [
  // Broadcaster + 뉴스 (MBC 뉴스, KBS 뉴스, etc.)
  /\b(MBC|KBS|SBS|JTBC|YTN|TVN|채널A|TV조선)\s*뉴스\b/,
  // "MBC 뉴스 이덕용입니다" 형태 (broadcaster name + 뉴스 + 이름 + 입니다)
  /^.{0,15}뉴스\s+.{0,15}입니다\.?$/,
  // 뉴스/방송 어휘 (참고: src/providers/llm-eval/index.ts 의 off-task 패턴과 의도적으로 중복)
  /뉴스|앵커|기자|보도|리포트/,
  // Whisper가 자주 생성하는 가짜 이름
  /이덕영|이덕용/,
  // "○○○ 앵커입니다." 형태
  /^.{0,20}앵커입니다\.?$/,
  // YouTube CTA
  /채널을\s*구독/,
  // YouTube outro
  /오늘은\s*여기까지/,
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
