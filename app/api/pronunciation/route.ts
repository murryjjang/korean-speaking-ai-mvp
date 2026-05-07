import { getPronunciationProvider } from '@/src/providers/pronunciation'
import { logProviderEvent } from '@/src/lib/supabase/provider-events'

/** Map well-known thrown error message prefixes to structured errorCodes. */
function parseEtriErrorCode(message: string): string {
  if (message.includes('audio_conversion_failed')) return 'audio_conversion_failed'
  if (message.includes('etri_http_error')) return 'etri_http_error'
  if (message.includes('etri_score_missing')) return 'etri_score_missing'
  if (message.includes('etri_api_error')) return 'etri_api_error'
  if (message.includes('etri_fetch_failed')) return 'etri_fetch_failed'
  return 'provider_error'
}

function etriErrorFeedback(errorCode: string): string {
  switch (errorCode) {
    case 'audio_conversion_failed':
      return 'ETRI 발음평가용 음원 변환에 실패했습니다.'
    case 'etri_score_missing':
      return 'ETRI 응답은 받았지만 점수 필드를 확인하지 못했습니다.'
    case 'etri_fetch_failed':
      return 'ETRI 서버 호출에 실패했습니다. 네트워크 또는 endpoint 확인이 필요합니다.'
    case 'etri_http_error':
      return 'ETRI 서버가 정상 응답을 반환하지 않았습니다.'
    case 'etri_api_error':
      return 'ETRI API 오류 응답을 받았습니다.'
    default:
      return 'ETRI 발음평가 응답 실패: 음원 형식 또는 응답 구조 확인이 필요합니다.'
  }
}

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

  // Diagnostic log — no secret values
  console.info('[pronunciation] request received', {
    configuredProvider,
    audioBlobType: audioBlob.type,
    audioBlobSize: audioBlob.size,
    scriptLength: referenceText.length,
    questionId,
    apiKeyPresent: configuredProvider === 'etri' ? !!process.env.ETRI_API_KEY : undefined,
  })

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
      metadata: isMock
        ? { reason: mockReason, configuredProvider }
        : result.rawScore !== undefined
          ? { rawScore: result.rawScore, normalizedScore: result.normalizedScore, hasWordScores: result.wordScores.length > 0 }
          : undefined,
    })

    console.info(
      '[provider_events] pronunciation.%s provider=%s latency=%dms score=%d',
      isMock ? 'fallback' : 'success',
      result.providerName,
      result.latencyMs,
      result.normalizedScore,
    )

    return Response.json({
      normalizedScore: result.normalizedScore,
      rawScore: result.rawScore,
      wordScores: result.wordScores,
      feedback: result.feedback,
      providerName: result.providerName,
      latencyMs: result.latencyMs,
      calibratedScore: result.calibratedScore,
      calibrationVersion: result.calibrationVersion,
      calibrationStatus: result.calibrationStatus,
      calibrationNote: result.calibrationNote,
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    const errorCode = parseEtriErrorCode(errorMessage)

    console.error('[provider_events] pronunciation.error', {
      configuredProvider,
      errorCode,
      // Truncate to avoid logging large buffers or sensitive context
      errorMessage: errorMessage.slice(0, 200),
    })

    if (configuredProvider !== 'mock') {
      await logProviderEvent({
        provider: configuredProvider,
        feature: 'pronunciation',
        status: 'error',
        questionId,
        errorCode,
        errorMessage: errorMessage.slice(0, 200),
      })
    }

    // Do NOT fall back to mock — return a structured ETRI error so the UI
    // shows a real failure rather than a misleading 72-point mock score.
    return Response.json({
      normalizedScore: 0,
      rawScore: undefined,
      wordScores: [],
      feedback: etriErrorFeedback(errorCode),
      providerName: configuredProvider,
      latencyMs: 0,
      errorCode,
      fallbackReason: errorCode,
    })
  }
}
