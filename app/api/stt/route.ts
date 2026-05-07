import { getSTTProvider } from '@/src/providers/stt'
import { logProviderEvent } from '@/src/lib/supabase/provider-events'
import { isLikelySttHallucination } from '@/src/lib/stt-sanity'

// Whisper hallucinates with near-silent audio (< ~1s). Block before calling the provider.
const MIN_AUDIO_SIZE_BYTES = 3000

// Demo mode: cycle through question-aware transcripts so dialogue missions advance naturally.
// Only used when STT_PROVIDER=mock (default dev mode). Real providers use actual audio.
const dialogueMockTurnMap = new Map<string, number>()

const DIALOGUE_MOCK_POOLS: Record<string, string[]> = {
  'beginner-q4-dialogue-mission': [
    '아이스 아메리카노 한 잔 주세요.',
    '포장해 주세요.',
    '카드로 결제할게요.',
  ],
  'intermediate-q4-dialogue-mission': [
    '말하기 수업이 언제 있나요?',
    '결석한 날 자료를 받을 수 있나요?',
    '교수님 상담은 언제 가능한가요?',
  ],
  'advanced-q4-dialogue-mission': [
    '일정 조정이 가능한지 확인하고 싶습니다.',
    '발표 주제와 진행 방식에 대한 의견을 듣고 싶습니다.',
    '실무 협의를 위해 별도 회의를 제안드립니다.',
  ],
}

function getDialogueMockTranscript(questionId: string): string | null {
  const pool = DIALOGUE_MOCK_POOLS[questionId]
  if (!pool) return null
  const idx = dialogueMockTurnMap.get(questionId) ?? 0
  dialogueMockTurnMap.set(questionId, Math.min(idx + 1, pool.length - 1))
  return pool[idx]
}

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

  // Guard: reject audio that is too small to contain real speech.
  // Near-empty blobs cause STT providers (Whisper) to hallucinate plausible-sounding text.
  if (blob.size < MIN_AUDIO_SIZE_BYTES) {
    await logProviderEvent({
      provider: 'no-speech',
      feature: 'stt',
      status: 'error',
      latencyMs: 0,
      questionId,
      errorCode: 'audio_too_short',
      errorMessage: `Audio blob too small: ${blob.size} bytes (minimum ${MIN_AUDIO_SIZE_BYTES})`,
    })

    console.info(
      '[provider_events] stt.no_speech audio_size=%d questionId=%s',
      blob.size,
      questionId,
    )

    return Response.json({
      transcript: '',
      confidence: 0,
      providerName: 'no-speech',
      latencyMs: 0,
      source: 'no-speech-detected',
      warning: 'audio_too_short',
    })
  }

  // Used to identify the intended provider in error-path logging.
  const configuredProvider = process.env.STT_PROVIDER ?? 'mock'

  // Demo mode: return cycling dialogue-aware transcript instead of generic mock text.
  if (configuredProvider === 'mock' && questionId) {
    const mockTranscript = getDialogueMockTranscript(questionId)
    if (mockTranscript !== null) {
      return Response.json({
        transcript: mockTranscript,
        confidence: 0.9,
        providerName: 'mock',
        latencyMs: 0,
        source: 'stt',
      })
    }
  }

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

    // Post-filter: reject known Whisper hallucination phrases (YouTube outros, etc.)
    if (result.transcript && isLikelySttHallucination(result.transcript)) {
      await logProviderEvent({
        provider: 'stt-filter',
        feature: 'stt',
        status: 'error',
        latencyMs: result.latencyMs,
        questionId,
        errorCode: 'stt_hallucination_filtered',
        errorMessage: `Hallucination detected: "${result.transcript.slice(0, 60)}"`,
      }).catch(() => {})

      console.info(
        '[provider_events] stt.hallucination_filtered provider=%s questionId=%s transcript="%s"',
        result.providerName,
        questionId,
        result.transcript.slice(0, 60),
      )

      return Response.json({
        transcript: '',
        confidence: 0,
        providerName: 'stt-filter',
        latencyMs: result.latencyMs,
        source: 'stt-filter',
        warning: 'stt_hallucination_filtered',
      })
    }

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
      transcript: '',
      confidence: 0,
      providerName: 'mock',
      latencyMs: 0,
      source: 'error-fallback',
      warning: 'stt_provider_error',
    })
  }
}
