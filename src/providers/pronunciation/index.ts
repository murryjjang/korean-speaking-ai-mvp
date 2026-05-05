import type { PronunciationProvider, PronunciationResult } from '@/src/types/providers'
import { ETRIPronunciationProvider } from './etri'

class MockPronunciationProvider implements PronunciationProvider {
  async evaluate(_audioBlob: Blob, referenceText: string): Promise<PronunciationResult> {
    await new Promise((resolve) => setTimeout(resolve, 400))
    const words = referenceText.split(' ').slice(0, 5)
    return {
      normalizedScore: 72,
      wordScores: words.map((word, i) => ({
        word,
        score: Math.min(100, 60 + i * 5),
      })),
      feedback:
        '전반적으로 발음이 양호합니다. 일부 단어의 자음 발음을 개선하면 좋겠습니다.',
      providerName: 'mock',
      providerVersion: '1.0.0',
      latencyMs: 400,
    }
  }
}

export function getPronunciationProvider(): PronunciationProvider {
  const providerName = process.env.PRONUNCIATION_PROVIDER ?? 'mock'
  switch (providerName) {
    case 'etri': {
      const key = process.env.ETRI_API_KEY
      if (!key) {
        console.warn('[pronunciation] ETRI_API_KEY not set — falling back to mock')
        return new MockPronunciationProvider()
      }
      return new ETRIPronunciationProvider(key)
    }
    case 'mock':
    default:
      return new MockPronunciationProvider()
  }
}
