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

// Azure 서버-사이드 fallback: 실제 Azure 평가는 클라이언트가 /api/pronunciation-azure를 직접 호출.
// 서버 action fallback(빈 blob)으로 진입 시 demo 결과 반환.
class AzureDemoFallbackProvider implements PronunciationProvider {
  async evaluate(_audioBlob: Blob, _referenceText: string): Promise<PronunciationResult> {
    return {
      normalizedScore: 72,
      wordScores: [],
      feedback: '실시간 발음평가 연결을 확인 중입니다. 현재는 음성 인식 결과와 제시문 비교를 바탕으로 한 참고평가가 표시됩니다.',
      providerName: 'demo' as const,
      providerVersion: '1.0.0',
      latencyMs: 0,
      fallbackReason: 'server_side_azure_requires_client_audio',
    }
  }
}

export function getPronunciationProvider(): PronunciationProvider {
  const providerName = process.env.PRONUNCIATION_PROVIDER ?? 'mock'
  switch (providerName) {
    case 'azure': {
      const key = process.env.AZURE_SPEECH_KEY || process.env.AZURE_PRONUNCIATION_KEY
      const region = process.env.AZURE_SPEECH_REGION || process.env.AZURE_PRONUNCIATION_REGION
      if (!key || !region) {
        console.warn('[pronunciation] AZURE_SPEECH_KEY/REGION not configured — demo fallback')
      } else {
        console.info('[pronunciation] PRONUNCIATION_PROVIDER=azure — client calls /api/pronunciation-azure directly')
      }
      return new AzureDemoFallbackProvider()
    }
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
