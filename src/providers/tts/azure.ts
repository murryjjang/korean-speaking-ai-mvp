import type { TTSProvider, TTSResult } from '@/src/types/providers'

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Clamp TTS rate to safe learner range [0.75, 1.35]. */
export function clampRate(rate: number): number {
  return Math.min(1.35, Math.max(0.75, rate))
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
    // AZURE_TTS_KEY/REGION override > AZURE_SPEECH_KEY/REGION common key
    const key = process.env.AZURE_TTS_KEY || process.env.AZURE_SPEECH_KEY
    const region = process.env.AZURE_TTS_REGION || process.env.AZURE_SPEECH_REGION

    if (!key || !region) {
      throw new Error('azure_tts_no_credentials')
    }

    const voice = options?.voice ?? process.env.AZURE_TTS_VOICE ?? 'ko-KR-InJoonNeural'
    const lang = options?.lang ?? 'ko-KR'
    const envRate = process.env.AZURE_TTS_RATE ? parseFloat(process.env.AZURE_TTS_RATE) : 1.0
    const rate = clampRate(options?.rate ?? envRate)

    // mstts:silence Leading-exact: encoder-level leading silence, robust against MP3 trim
    // (plain <break> can be removed by the codec; this is reliably preserved).
    const ssml =
      `<speak version="1.0" ` +
        `xmlns="http://www.w3.org/2001/10/synthesis" ` +
        `xmlns:mstts="https://www.w3.org/2001/mstts" ` +
        `xml:lang="${lang}">` +
      `<voice name="${voice}">` +
        `<mstts:silence type="Leading-exact" value="500ms"/>` +
        `<prosody rate="${rate}">${escapeXml(text)}</prosody>` +
      `</voice></speak>`

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
