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

// OpenAI Whisper STT — requires OPENAI_API_KEY.
// Throws on missing key or API failure so /api/stt falls back to mock.
class WhisperSTTProvider implements STTProvider {
  async transcribe(blob: Blob): Promise<STTResult> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('WhisperSTTProvider: OPENAI_API_KEY not set')
    }

    const startMs = Date.now()

    // Dynamic import keeps openai out of the client bundle
    const { default: OpenAI, toFile } = await import('openai')
    const client = new OpenAI({ apiKey })

    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const audioFile = await toFile(buffer, 'audio.webm', {
      type: blob.type || 'audio/webm',
    })

    // Context prompt: signals the expected domain so Whisper anchors on learner
    // speech rather than fabricating news/YouTube outros from low-energy audio.
    const response = await client.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'ko',
      prompt:
        '한국어 학습자가 자연스럽게 답변합니다. 카페·식당·일상 회화·인사·자기소개·계획 등의 발화입니다. 뉴스 앵커 멘트나 유튜브 outro가 아닙니다.',
    })

    const latencyMs = Date.now() - startMs

    return {
      transcript: response.text,
      confidence: 1.0,
      providerName: 'whisper',
      providerVersion: 'whisper-1',
      latencyMs,
    }
  }
}

export function getSTTProvider(): STTProvider {
  const providerName = process.env.STT_PROVIDER ?? 'mock'
  switch (providerName) {
    case 'openai':
    case 'whisper':
      return new WhisperSTTProvider()
    case 'mock':
    default:
      return new MockSTTProvider()
  }
}
