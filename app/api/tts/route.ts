import { getTTSProvider } from '@/src/providers/tts'
import { logProviderEvent } from '@/src/lib/supabase/provider-events'

export async function POST(request: Request) {
  let body: { text?: unknown; questionId?: unknown; purpose?: unknown; voice?: unknown }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { text, questionId, purpose } = body

  if (!text || typeof text !== 'string' || !text.trim()) {
    return Response.json({ error: 'text_required' }, { status: 400 })
  }

  const qid = typeof questionId === 'string' ? questionId : null
  const purposeStr = typeof purpose === 'string' ? purpose : null
  const configuredProvider = process.env.TTS_PROVIDER ?? 'mock'

  // Fast path: not openai or no API key → return fallback immediately
  if (configuredProvider !== 'openai' || !process.env.OPENAI_API_KEY) {
    await logProviderEvent({
      provider: 'mock',
      feature: 'tts',
      status: 'fallback',
      latencyMs: 0,
      questionId: qid,
      metadata: { reason: 'no_api_key', configuredProvider, purpose: purposeStr },
    })

    return Response.json({
      ok: true,
      providerName: 'mock',
      status: 'fallback',
      fallbackText: text,
    })
  }

  // OpenAI TTS path
  const startMs = Date.now()

  try {
    const provider = getTTSProvider()
    const result = await provider.synthesize(text)

    await logProviderEvent({
      provider: result.providerName,
      feature: 'tts',
      status: 'success',
      latencyMs: result.latencyMs,
      model: result.providerVersion ?? null,
      questionId: qid,
      metadata: { purpose: purposeStr },
    })

    console.info(
      '[provider_events] tts.success provider=%s latency=%dms',
      result.providerName,
      result.latencyMs,
    )

    if (result.audioData && result.audioData.length > 0) {
      const audioBase64 = Buffer.from(result.audioData).toString('base64')
      return Response.json({
        ok: true,
        providerName: result.providerName,
        status: 'success',
        audioBase64,
        mimeType: result.mimeType ?? 'audio/mpeg',
      })
    }

    // Provider returned no bytes (shouldn't happen for openai, but be safe)
    return Response.json({
      ok: true,
      providerName: result.providerName,
      status: 'fallback',
      fallbackText: text,
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    const latencyMs = Date.now() - startMs

    await logProviderEvent({
      provider: configuredProvider,
      feature: 'tts',
      status: 'error',
      latencyMs,
      questionId: qid,
      errorCode: 'provider_error',
      errorMessage,
      metadata: { purpose: purposeStr },
    })

    console.error('[provider_events] tts.error', err)

    return Response.json({
      ok: false,
      providerName: configuredProvider,
      status: 'error',
      fallbackText: text,
      message: 'TTS synthesis failed',
    })
  }
}
