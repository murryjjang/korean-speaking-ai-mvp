// v1.1 단계 18 [A]: 음성 첫 음절 잘림 — A-1/A-2/A-3 일괄 적용 검증.
//
// 서버 측 Azure TTS provider가 환경변수 분기에 따라 leading padding과 출력 포맷을
// 올바르게 구성하는지 fetch mocking으로 확인한다. (A-3 클라이언트 디코딩 경로는
// 별도 DOM 환경이 필요하므로 본 테스트 범위 밖.)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AzureTTSProvider } from '@/src/providers/tts/azure'

const FAKE_OK_BODY = new Uint8Array([0, 1, 2, 3])

function stubFetchOk() {
  return vi.fn(async () => {
    return new Response(FAKE_OK_BODY, { status: 200 })
  })
}

describe('AzureTTS 단계 18 [A-1, A-2]', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    vi.stubEnv('AZURE_SPEECH_KEY', 'fake')
    vi.stubEnv('AZURE_SPEECH_REGION', 'koreacentral')
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.unstubAllEnvs()
  })

  it('기본값: leading padding 활성 + opus 포맷', async () => {
    const fetchSpy = stubFetchOk()
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    const provider = new AzureTTSProvider()
    const res = await provider.synthesize('안녕하세요')

    expect(fetchSpy).toHaveBeenCalledOnce()
    const [, init] = fetchSpy.mock.calls[0]
    const headers = (init as RequestInit).headers as Record<string, string>
    expect(headers['X-Microsoft-OutputFormat']).toBe('ogg-24khz-16bit-mono-opus')
    expect(res.mimeType).toBe('audio/ogg')
    const body = (init as RequestInit).body as string
    expect(body).toContain('<break time="300ms"/>')
    // zero-width space 가 텍스트 앞에 붙어 있는지 (escapeXml 처리 후 ​ 그대로 유지).
    expect(body).toContain('​안녕하세요')
  })

  it('TTS_OUTPUT_FORMAT=pcm → WAV 포맷, mimeType audio/wav', async () => {
    vi.stubEnv('TTS_OUTPUT_FORMAT', 'pcm')
    const fetchSpy = stubFetchOk()
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    const provider = new AzureTTSProvider()
    const res = await provider.synthesize('안녕')

    const headers = (fetchSpy.mock.calls[0][1] as RequestInit).headers as Record<string, string>
    expect(headers['X-Microsoft-OutputFormat']).toBe('riff-24khz-16bit-mono-pcm')
    expect(res.mimeType).toBe('audio/wav')
  })

  it('TTS_OUTPUT_FORMAT=mp3 → 기존 MP3 (rollback)', async () => {
    vi.stubEnv('TTS_OUTPUT_FORMAT', 'mp3')
    const fetchSpy = stubFetchOk()
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    const provider = new AzureTTSProvider()
    const res = await provider.synthesize('안녕')

    const headers = (fetchSpy.mock.calls[0][1] as RequestInit).headers as Record<string, string>
    expect(headers['X-Microsoft-OutputFormat']).toBe('audio-24khz-48kbitrate-mono-mp3')
    expect(res.mimeType).toBe('audio/mpeg')
  })

  it('TTS_LEADING_PADDING_ENABLED=0 → break 태그·ZWSP 제거 (rollback)', async () => {
    vi.stubEnv('TTS_LEADING_PADDING_ENABLED', '0')
    const fetchSpy = stubFetchOk()
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    const provider = new AzureTTSProvider()
    await provider.synthesize('안녕하세요')

    const body = (fetchSpy.mock.calls[0][1] as RequestInit).body as string
    expect(body).not.toContain('<break time="300ms"/>')
    expect(body).not.toContain('​')
  })

  it('mstts:silence Leading-exact는 padding 비활성 여부와 무관하게 유지', async () => {
    vi.stubEnv('TTS_LEADING_PADDING_ENABLED', '0')
    const fetchSpy = stubFetchOk()
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    const provider = new AzureTTSProvider()
    await provider.synthesize('안녕')

    const body = (fetchSpy.mock.calls[0][1] as RequestInit).body as string
    expect(body).toContain('Leading-exact')
    expect(body).toContain('500ms')
  })
})
