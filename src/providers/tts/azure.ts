import type { TTSProvider, TTSResult } from '@/src/types/providers'

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function rateForLevel(level: string): number {
  switch (level) {
    case 'beginner': return 0.85
    case 'advanced': return 1.05
    default: return 1.0
  }
}

export class AzureTTSProvider implements TTSProvider {
  async synthesize(
    text: string,
    options?: { voice?: string; rate?: number; lang?: string },
  ): Promise<TTSResult> {
    const startMs = Date.now()
    const key = process.env.AZURE_SPEECH_KEY
    const region = process.env.AZURE_SPEECH_REGION

    if (!key || !region) {
      throw new Error('azure_tts_no_credentials')
    }

    const voice = options?.voice ?? process.env.AZURE_TTS_VOICE ?? 'ko-KR-SunHiNeural'
    const lang = options?.lang ?? 'ko-KR'
    const rate = options?.rate ?? 1.0

    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}"><voice name="${voice}"><prosody rate="${rate}">${escapeXml(text)}</prosody></voice></speak>`

    const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'korean-speaking-ai-mvp',
      },
      body: ssml,
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`azure_tts_${response.status}: ${detail.slice(0, 120)}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const latencyMs = Date.now() - startMs

    return {
      audioUrl: '',
      durationSec: Math.ceil(text.length / 12),
      audioData: new Uint8Array(arrayBuffer),
      mimeType: 'audio/mpeg',
      providerName: 'azure',
      providerVersion: voice,
      latencyMs,
    }
  }
}
