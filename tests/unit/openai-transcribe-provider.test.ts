import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getSTTProvider } from '@/src/providers/stt'

// ── Mock the openai SDK ─────────────────────────────────────────────────────
// providers/stt/index.ts does `await import('openai')`, so the mock must expose
// `default` (the OpenAI constructor) AND `toFile`. WhisperSTTProvider and
// OpenAITranscribeSTTProvider both share the same SDK surface.

const transcriptionsCreateMock = vi.fn()

vi.mock('openai', () => {
  class OpenAI {
    audio = { transcriptions: { create: transcriptionsCreateMock } }
    constructor(_config: { apiKey: string }) {
      void _config
    }
  }
  return {
    default: OpenAI,
    OpenAI,
    toFile: async (buffer: Buffer, name: string, opts: { type?: string } = {}) => ({
      buffer,
      name,
      type: opts.type,
    }),
  }
})

function makeBlob(): Blob {
  // arrayBuffer + type만 사용하므로 작은 Uint8Array면 충분
  return new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/webm' })
}

describe('STT provider factory (단계 19.16)', () => {
  const originalEnv = {
    STT_PROVIDER: process.env.STT_PROVIDER,
    FREE_CONVERSATION_STT_PROVIDER: process.env.FREE_CONVERSATION_STT_PROVIDER,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  }

  beforeEach(() => {
    transcriptionsCreateMock.mockReset()
    delete process.env.STT_PROVIDER
    delete process.env.FREE_CONVERSATION_STT_PROVIDER
    process.env.OPENAI_API_KEY = 'sk-test'
  })

  afterEach(() => {
    // 환경 복원
    for (const [k, v] of Object.entries(originalEnv)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  })

  describe('factory 선택 정책', () => {
    it('STT_PROVIDER 미설정 시 mock 반환 (transcribe → mock transcript)', async () => {
      const p = getSTTProvider()
      const r = await p.transcribe(makeBlob())
      expect(r.providerName).toBe('mock')
      expect(transcriptionsCreateMock).not.toHaveBeenCalled()
    })

    it("STT_PROVIDER='whisper' → whisper-1 (whisper-1 model 전달)", async () => {
      process.env.STT_PROVIDER = 'whisper'
      transcriptionsCreateMock.mockResolvedValue({ text: '안녕하세요' })

      const r = await getSTTProvider().transcribe(makeBlob())

      expect(transcriptionsCreateMock).toHaveBeenCalledTimes(1)
      const call = transcriptionsCreateMock.mock.calls[0][0]
      expect(call.model).toBe('whisper-1')
      expect(call.language).toBe('ko')
      expect(call.temperature).toBe(0)
      expect(r.providerName).toBe('whisper')
      expect(r.providerVersion).toBe('whisper-1')
      expect(r.transcript).toBe('안녕하세요')
    })

    it("STT_PROVIDER='openai-transcribe' → gpt-4o-mini-transcribe", async () => {
      process.env.STT_PROVIDER = 'openai-transcribe'
      transcriptionsCreateMock.mockResolvedValue({ text: '저는 학생입니다' })

      const r = await getSTTProvider().transcribe(makeBlob())

      const call = transcriptionsCreateMock.mock.calls[0][0]
      expect(call.model).toBe('gpt-4o-mini-transcribe')
      expect(call.language).toBe('ko')
      expect(r.providerName).toBe('openai')
      expect(r.providerVersion).toBe('gpt-4o-mini-transcribe')
      expect(r.transcript).toBe('저는 학생입니다')
    })

    it("STT_PROVIDER='openai' (구 호환) → gpt-4o-mini-transcribe (whisper-1 아님)", async () => {
      // 단계 19.16: 'openai' 별칭을 신모델에 매핑. 기존 호출부 변경 없이 업그레이드.
      process.env.STT_PROVIDER = 'openai'
      transcriptionsCreateMock.mockResolvedValue({ text: 'ok' })

      await getSTTProvider().transcribe(makeBlob())

      const call = transcriptionsCreateMock.mock.calls[0][0]
      expect(call.model).toBe('gpt-4o-mini-transcribe')
    })

    it("STT_PROVIDER='gpt-4o-transcribe' → 대형 모델", async () => {
      process.env.STT_PROVIDER = 'gpt-4o-transcribe'
      transcriptionsCreateMock.mockResolvedValue({ text: 'ok' })

      await getSTTProvider().transcribe(makeBlob())

      const call = transcriptionsCreateMock.mock.calls[0][0]
      expect(call.model).toBe('gpt-4o-transcribe')
    })

    it('대소문자 무관: STT_PROVIDER=OPENAI-TRANSCRIBE도 매칭', async () => {
      process.env.STT_PROVIDER = 'OPENAI-TRANSCRIBE'
      transcriptionsCreateMock.mockResolvedValue({ text: 'ok' })

      await getSTTProvider().transcribe(makeBlob())

      const call = transcriptionsCreateMock.mock.calls[0][0]
      expect(call.model).toBe('gpt-4o-mini-transcribe')
    })

    it('알 수 없는 값 → mock 폴백', async () => {
      process.env.STT_PROVIDER = 'unknown-provider'
      const p = getSTTProvider()
      const r = await p.transcribe(makeBlob())
      expect(r.providerName).toBe('mock')
      expect(transcriptionsCreateMock).not.toHaveBeenCalled()
    })
  })

  describe('자유 대화 feature override (단계 19.16)', () => {
    it("FREE_CONVERSATION_STT_PROVIDER 설정 시 feature='free-conversation'에 한해 우선", async () => {
      process.env.STT_PROVIDER = 'whisper'
      process.env.FREE_CONVERSATION_STT_PROVIDER = 'gpt-4o-mini-transcribe'
      transcriptionsCreateMock.mockResolvedValue({ text: 'ok' })

      await getSTTProvider('free-conversation').transcribe(makeBlob())

      const call = transcriptionsCreateMock.mock.calls[0][0]
      expect(call.model).toBe('gpt-4o-mini-transcribe')
    })

    it("FREE_CONVERSATION_STT_PROVIDER 설정돼도 feature='default'에는 영향 없음", async () => {
      process.env.STT_PROVIDER = 'whisper'
      process.env.FREE_CONVERSATION_STT_PROVIDER = 'gpt-4o-mini-transcribe'
      transcriptionsCreateMock.mockResolvedValue({ text: 'ok' })

      await getSTTProvider('default').transcribe(makeBlob())

      const call = transcriptionsCreateMock.mock.calls[0][0]
      expect(call.model).toBe('whisper-1')
    })

    it("FREE_CONVERSATION_STT_PROVIDER 미설정이면 free-conversation도 STT_PROVIDER를 따른다", async () => {
      process.env.STT_PROVIDER = 'whisper'
      transcriptionsCreateMock.mockResolvedValue({ text: 'ok' })

      await getSTTProvider('free-conversation').transcribe(makeBlob())

      const call = transcriptionsCreateMock.mock.calls[0][0]
      expect(call.model).toBe('whisper-1')
    })
  })

  describe('OpenAI Transcribe Provider 동작', () => {
    beforeEach(() => {
      process.env.STT_PROVIDER = 'openai-transcribe'
    })

    it('OPENAI_API_KEY 없으면 throw → /api/stt가 mock으로 폴백', async () => {
      delete process.env.OPENAI_API_KEY
      const p = getSTTProvider()
      await expect(p.transcribe(makeBlob())).rejects.toThrow(/OPENAI_API_KEY/)
    })

    it('한국어 안내 prompt를 전달 (환각 차단)', async () => {
      transcriptionsCreateMock.mockResolvedValue({ text: 'ok' })

      await getSTTProvider().transcribe(makeBlob())

      const call = transcriptionsCreateMock.mock.calls[0][0]
      expect(call.prompt).toBeTruthy()
      expect(typeof call.prompt).toBe('string')
      expect(call.prompt).toMatch(/환각|받아쓰|학습자/)
    })

    it('latencyMs는 0 이상 정수', async () => {
      transcriptionsCreateMock.mockResolvedValue({ text: 'ok' })

      const r = await getSTTProvider().transcribe(makeBlob())

      expect(r.latencyMs).toBeGreaterThanOrEqual(0)
      expect(Number.isFinite(r.latencyMs)).toBe(true)
    })

    it('빈 응답 처리: text가 빈 문자열이면 transcript도 빈 문자열', async () => {
      transcriptionsCreateMock.mockResolvedValue({ text: '' })

      const r = await getSTTProvider().transcribe(makeBlob())

      expect(r.transcript).toBe('')
      expect(r.providerName).toBe('openai')
    })

    it('API 오류 시 throw (호출부에서 mock 폴백)', async () => {
      transcriptionsCreateMock.mockRejectedValue(new Error('rate_limited'))

      const p = getSTTProvider()
      await expect(p.transcribe(makeBlob())).rejects.toThrow(/rate_limited/)
    })
  })
})
