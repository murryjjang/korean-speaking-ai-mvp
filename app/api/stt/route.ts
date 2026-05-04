import { getSTTProvider } from '@/src/providers/stt'

const MOCK_TRANSCRIPT =
  '안녕하세요. 저는 한국어를 배우고 있습니다. 잘 부탁드립니다.'

export async function POST(request: Request) {
  let blob: Blob

  try {
    const formData = await request.formData()
    const audio = formData.get('audio')
    if (audio !== null && typeof audio !== 'string') {
      const bytes = await (audio as Blob).arrayBuffer()
      blob = new Blob([bytes], { type: (audio as Blob).type || 'audio/webm' })
    } else {
      blob = new Blob([], { type: 'audio/webm' })
    }
  } catch {
    return Response.json({ error: 'invalid_form_data' }, { status: 400 })
  }

  try {
    const provider = getSTTProvider()
    const result = await provider.transcribe(blob)
    // Minimal provider_events logging — persist to table in Phase 8-B+
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
    console.error('[provider_events] stt.error', err)
    // Mock fallback so the client can always proceed
    return Response.json({
      transcript: MOCK_TRANSCRIPT,
      confidence: 0,
      providerName: 'mock',
      latencyMs: 0,
      source: 'mock-fallback',
    })
  }
}
