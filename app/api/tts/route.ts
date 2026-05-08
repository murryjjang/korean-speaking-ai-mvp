import { getTTSProvider } from '@/src/providers/tts'
import { clampRate } from '@/src/providers/tts/azure'
import { getPersona } from '@/src/lib/personas'
import { logProviderEvent } from '@/src/lib/supabase/provider-events'

export async function POST(request: Request) {
  let body: { text?: unknown; questionId?: unknown; purpose?: unknown; personaId?: unknown }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { text, questionId, purpose, personaId } = body

  if (!text || typeof text !== 'string' || !text.trim()) {
    return Response.json({ error: 'text_required' }, { status: 400 })
  }

  const qid = typeof questionId === 'string' ? questionId : null
  const purposeStr = typeof purpose === 'string' ? purpose : null
  const personaIdStr = typeof personaId === 'string' ? personaId : null
  const configuredProvider = process.env.TTS_PROVIDER ?? 'mock'

  // Resolve voice/rate: persona > env var > hard default
  const persona = personaIdStr ? getPersona(personaIdStr) : undefined
  const resolvedVoice = persona?.defaultVoice ?? process.env.AZURE_TTS_VOICE ?? 'ko-KR-InJoonNeural'
  const envRate = process.env.AZURE_TTS_RATE ? parseFloat(process.env.AZURE_TTS_RATE) : 1.0
  const resolvedRate = clampRate(persona?.defaultRate ?? envRate)

  // Fast path: not a real provider or missing credentials → return fallback immediately
  const isOpenAI = configuredProvider === 'openai' && !!process.env.OPENAI_API_KEY
  const azureTtsKey = process.env.AZURE_TTS_KEY || process.env.AZURE_SPEECH_KEY
  const azureTtsRegion = process.env.AZURE_TTS_REGION || process.env.AZURE_SPEECH_REGION
  const isAzure = configuredProvider === 'azure' && !!azureTtsKey && !!azureTtsRegion
  if (!isOpenAI && !isAzure) {
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
      fallbackRate: resolvedRate,
    })
  }

  // OpenAI or Azure TTS path
  const startMs = Date.now()

  try {
    const provider = getTTSProvider()
    const result = await provider.synthesize(text, { voice: resolvedVoice, rate: resolvedRate })

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
        fallbackRate: resolvedRate,
      })
    }

    // Provider returned no bytes (shouldn't happen for openai, but be safe)
    return Response.json({
      ok: true,
      providerName: result.providerName,
      status: 'fallback',
      fallbackText: text,
      fallbackRate: resolvedRate,
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
      fallbackRate: resolvedRate,
      message: 'TTS synthesis failed',
    })
  }
}
