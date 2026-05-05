import { getSTTProvider } from '@/src/providers/stt'
import { logProviderEvent } from '@/src/lib/supabase/provider-events'

const MOCK_TRANSCRIPT =
  '안녕하세요. 저는 한국어를 배우고 있습니다. 잘 부탁드립니다.'

export async function POST(request: Request) {
  let blob: Blob
  let questionId: string | null = null

  try {
    const formData = await request.formData()
    const audio = formData.get('audio')
    const qid = formData.get('questionId')
    if (typeof qid === 'string' && qid) questionId = qid

    if (audio !== null && typeof audio !== 'string') {
      const bytes = await (audio as Blob).arrayBuffer()
      blob = new Blob([bytes], { type: (audio as Blob).type || 'audio/webm' })
    } else {
      blob = new Blob([], { type: 'audio/webm' })
    }
  } catch {
    return Response.json({ error: 'invalid_form_data' }, { status: 400 })
  }

  // Used to identify the intended provider in error-path logging.
  const configuredProvider = process.env.STT_PROVIDER ?? 'mock'

  try {
    const provider = getSTTProvider()
    const result = await provider.transcribe(blob)

    await logProviderEvent({
      provider: result.providerName,
      feature: 'stt',
      status: 'success',
      latencyMs: result.latencyMs,
      model: result.providerVersion ?? null,
      questionId,
    })

    console.info(
      '[provider_events] stt.success provider=%s latency=%dms',
      result.providerName,
      result.latencyMs,
    )

    return Response.json({
      transcript: result.transcript,
      confidence: result.confidence,
      providerName: result.providerName,
      latencyMs: result.latencyMs,
      source: 'stt',
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)

    // Log the intended provider failure (skip when mock was already the target,
    // as mock failures are unexpected and logged separately).
    if (configuredProvider !== 'mock') {
      await logProviderEvent({
        provider: configuredProvider,
        feature: 'stt',
        status: 'error',
        questionId,
        errorCode: 'provider_error',
        errorMessage,
      })
    }

    // Log the mock fallback that the client will receive.
    await logProviderEvent({
      provider: 'mock',
      feature: 'stt',
      status: 'fallback',
      latencyMs: 0,
      questionId,
      metadata: { reason: 'provider_error', configuredProvider },
    })

    console.error('[provider_events] stt.error', err)

    return Response.json({
      transcript: MOCK_TRANSCRIPT,
      confidence: 0,
      providerName: 'mock',
      latencyMs: 0,
      source: 'mock-fallback',
    })
  }
}
