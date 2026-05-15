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
    // temperature: 0 — Whisper의 자체 보정 의지를 최소화해 학습자 발화를 그대로 받아쓴다.
    const response = await client.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'ko',
      prompt:
        '학습자의 한국어 발화를 정확히 그대로 받아쓰세요. 문법 교정이나 자연스럽게 다듬지 말고 발화 그대로 옮기세요. 다만 뉴스 앵커 멘트·유튜브 outro는 환각이므로 출력하지 마세요.',
      temperature: 0,
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
