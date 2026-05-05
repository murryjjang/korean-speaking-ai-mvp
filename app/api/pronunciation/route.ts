import { getPronunciationProvider } from '@/src/providers/pronunciation'
import { logProviderEvent } from '@/src/lib/supabase/provider-events'

export async function POST(request: Request) {
  let audioBlob: Blob
  let referenceText = ''
  let questionId: string | null = null

  try {
    const formData = await request.formData()
    const audio = formData.get('audio')
    const ref = formData.get('referenceText')
    const qid = formData.get('questionId')

    if (typeof ref === 'string') referenceText = ref
    if (typeof qid === 'string' && qid) questionId = qid

    if (audio !== null && typeof audio !== 'string') {
      const bytes = await (audio as Blob).arrayBuffer()
      audioBlob = new Blob([bytes], { type: (audio as Blob).type || 'audio/webm' })
    } else {
      audioBlob = new Blob([], { type: 'audio/webm' })
    }
  } catch {
    return Response.json({ error: 'invalid_form_data' }, { status: 400 })
  }

  const configuredProvider = process.env.PRONUNCIATION_PROVIDER ?? 'mock'

  try {
    const provider = getPronunciationProvider()
    const result = await provider.evaluate(audioBlob, referenceText)

    const isMock = result.providerName === 'mock'
    const mockReason =
      configuredProvider === 'etri' ? 'no_api_key' : 'mock_configured'

    await logProviderEvent({
      provider: result.providerName,
      feature: 'pronunciation',
      status: isMock ? 'fallback' : 'success',
      latencyMs: result.latencyMs,
      questionId,
      metadata: isMock ? { reason: mockReason, configuredProvider } : undefined,
    })

    console.info(
      '[provider_events] pronunciation.%s provider=%s latency=%dms',
      isMock ? 'fallback' : 'success',
      result.providerName,
      result.latencyMs,
    )

    return Response.json({
      normalizedScore: result.normalizedScore,
      wordScores: result.wordScores,
      feedback: result.feedback,
      providerName: result.providerName,
      latencyMs: result.latencyMs,
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)

    if (configuredProvider !== 'mock') {
      await logProviderEvent({
        provider: configuredProvider,
        feature: 'pronunciation',
        status: 'error',
        questionId,
        errorCode: 'provider_error',
        errorMessage,
      })
    }

    await logProviderEvent({
      provider: 'mock',
      feature: 'pronunciation',
      status: 'fallback',
      latencyMs: 0,
      questionId,
      metadata: { reason: 'provider_error', configuredProvider },
    })

    console.error('[provider_events] pronunciation.error', err)

    return Response.json({
      normalizedScore: 72,
      wordScores: [],
      feedback: '발음평가를 불러오지 못했습니다. 기본 결과로 계속합니다.',
      providerName: 'mock',
      latencyMs: 0,
      source: 'mock-fallback',
    })
  }
}
