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

    // 단계 18 [A-1]: SSML <break> 추가 + zero-width space 프리픽스 — mstts:silence와 중복 무방.
    //  랜덤하게 첫 음절을 잃는 경우를 줄이기 위한 다중 보호.
    //  TTS_LEADING_PADDING_ENABLED=0으로 비활성화 가능.
    const paddingEnabled = process.env.TTS_LEADING_PADDING_ENABLED !== '0'
    const paddedText = paddingEnabled ? `​${text}` : text
    const breakTag = paddingEnabled ? '<break time="300ms"/>' : ''

    // 단계 18 [A-2]: 기본 출력 포맷을 Opus(OGG) 또는 PCM으로 — MP3 인코더의 leading silence
    //  trim 회피. TTS_OUTPUT_FORMAT={opus|pcm|mp3} 으로 선택.
    //  - opus(기본): ogg-24khz-16bit-mono-opus, 작은 페이로드 + leading silence 보존
    //  - pcm: riff-24khz-16bit-mono-pcm (WAV), 가장 안전하나 페이로드 크다
    //  - mp3: 기존 audio-24khz-48kbitrate-mono-mp3 (rollback용)
    const formatChoice = (process.env.TTS_OUTPUT_FORMAT ?? 'opus').toLowerCase()
    const { azureFormat, mimeType } = (() => {
      if (formatChoice === 'mp3') {
        return { azureFormat: 'audio-24khz-48kbitrate-mono-mp3', mimeType: 'audio/mpeg' }
      }
      if (formatChoice === 'pcm' || formatChoice === 'wav') {
        return { azureFormat: 'riff-24khz-16bit-mono-pcm', mimeType: 'audio/wav' }
      }
      return { azureFormat: 'ogg-24khz-16bit-mono-opus', mimeType: 'audio/ogg' }
    })()

    const ssml =
      `<speak version="1.0" ` +
        `xmlns="http://www.w3.org/2001/10/synthesis" ` +
        `xmlns:mstts="https://www.w3.org/2001/mstts" ` +
        `xml:lang="${lang}">` +
      `<voice name="${voice}">` +
        `<mstts:silence type="Leading-exact" value="500ms"/>` +
        breakTag +
        `<prosody rate="${rate}">${escapeXml(paddedText)}</prosody>` +
      `</voice></speak>`

    const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': azureFormat,
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
      mimeType,
      providerName: 'azure',
      providerVersion: voice,
      latencyMs,
    }
  }
}
