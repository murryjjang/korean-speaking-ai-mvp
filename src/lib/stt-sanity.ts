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

  // YouTube-style outros (broader check)
  if (isGenericYouTubeOutro(normalized)) return true

  return false
}
