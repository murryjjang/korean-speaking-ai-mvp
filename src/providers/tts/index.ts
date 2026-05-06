import type { TTSProvider, TTSResult } from '@/src/types/providers'
import { AzureTTSProvider } from './azure'

// Server stub — synthesis happens client-side via Web Speech API.
class BrowserTTSProvider implements TTSProvider {
  async synthesize(text: string, _options?: { voice?: string; rate?: number; lang?: string }): Promise<TTSResult> {
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
  async synthesize(_text: string, _options?: { voice?: string; rate?: number; lang?: string }): Promise<TTSResult> {
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

class OpenAITTSProvider implements TTSProvider {
  async synthesize(text: string, _options?: { voice?: string; rate?: number; lang?: string }): Promise<TTSResult> {
    const startMs = Date.now()
    const model = process.env.TTS_MODEL ?? 'tts-1'
    const voice = process.env.TTS_VOICE ?? 'nova'

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, input: text, voice }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`OpenAI TTS ${response.status}: ${detail}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const latencyMs = Date.now() - startMs

    return {
      audioUrl: '',
      durationSec: Math.ceil(text.length / 15),
      audioData: new Uint8Array(arrayBuffer),
      mimeType: 'audio/mpeg',
      providerName: 'openai',
      providerVersion: model,
      latencyMs,
    }
  }
}

export function getTTSProvider(): TTSProvider {
  const providerName = process.env.TTS_PROVIDER ?? 'mock'
  if (providerName === 'openai' && process.env.OPENAI_API_KEY) {
    return new OpenAITTSProvider()
  }
  if (providerName === 'azure') {
    // AzureTTSProvider throws 'azure_tts_no_credentials' if keys are absent.
    // The caller (api/tts/route.ts) catches this and returns fallback to the client.
    return new AzureTTSProvider()
  }
  if (providerName === 'mock') {
    return new MockTTSProvider()
  }
  // 'browser' or unknown default → server stub, client handles synthesis
  return new BrowserTTSProvider()
}
