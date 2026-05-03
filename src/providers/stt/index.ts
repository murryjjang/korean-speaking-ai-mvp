import type { STTProvider, STTResult } from '@/src/types/providers'

class MockSTTProvider implements STTProvider {
  async transcribe(_: Blob): Promise<STTResult> {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return {
      transcript:
        '안녕하세요. 저는 한국어를 배우고 있습니다. 잘 부탁드립니다.',
      confidence: 0.92,
      wordTimings: [
        { word: '안녕하세요', startMs: 0, endMs: 600 },
        { word: '저는', startMs: 700, endMs: 1000 },
        { word: '한국어를', startMs: 1100, endMs: 1600 },
        { word: '배우고', startMs: 1700, endMs: 2100 },
        { word: '있습니다', startMs: 2200, endMs: 2800 },
      ],
      providerName: 'mock',
      providerVersion: '1.0.0',
      latencyMs: 500,
    }
  }
}

export function getSTTProvider(): STTProvider {
  const providerName = process.env.STT_PROVIDER ?? 'mock'
  switch (providerName) {
    case 'mock':
    default:
      return new MockSTTProvider()
  }
}
