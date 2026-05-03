import type { TTSProvider, TTSResult } from '@/src/types/providers'

// Browser TTS is handled client-side via Web Speech API.
// This server stub returns metadata; actual synthesis happens in the browser.
class BrowserTTSProvider implements TTSProvider {
  async synthesize(text: string): Promise<TTSResult> {
    return {
      audioUrl: '',
      durationSec: Math.ceil(text.length / 10),
      providerName: 'browser',
      providerVersion: '1.0.0',
      latencyMs: 0,
    }
  }
}

class MockTTSProvider implements TTSProvider {
  async synthesize(_: string): Promise<TTSResult> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return {
      audioUrl: '/mock/audio/tts-sample.mp3',
      durationSec: 5,
      providerName: 'mock',
      providerVersion: '1.0.0',
      latencyMs: 300,
    }
  }
}

export function getTTSProvider(): TTSProvider {
  const providerName = process.env.TTS_PROVIDER ?? 'browser'
  switch (providerName) {
    case 'mock':
      return new MockTTSProvider()
    case 'browser':
    default:
      return new BrowserTTSProvider()
  }
}
