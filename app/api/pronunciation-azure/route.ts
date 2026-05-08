import { convertToWavForEtri } from '@/src/lib/audio/convert-for-etri'

interface AzurePronWord {
  Word: string
  PronunciationAssessment?: {
    AccuracyScore: number
    ErrorType: 'None' | 'Omission' | 'Insertion' | 'Mispronunciation'
  }
  Offset?: number
  Duration?: number
}

interface AzurePronResult {
  RecognitionStatus: string
  DisplayText?: string
  NBest?: Array<{
    Confidence: number
    Lexical: string
    ITN: string
    MaskedITN: string
    Display: string
    PronunciationAssessment?: {
      AccuracyScore: number
      FluencyScore: number
      CompletenessScore: number
      PronScore: number
    }
    Words?: AzurePronWord[]
  }>
}

function buildDemoFallback(reason: string, normalizedScore = 72, recognizedText = '') {
  return Response.json({
    providerName: 'demo',
    fallbackReason: reason,
    normalizedScore,
    pronScore: null,
    accuracyScore: null,
    fluencyScore: null,
    completenessScore: null,
    recognizedText,
    wordResults: [],
    latencyMs: 0,
  })
}

// Compute a word-overlap-based score when real pronunciation data is unavailable.
// Floor policy for scripted reading: 97%+ → 97, 93%+ → 93, 90%+ → 90, 85%+ → 85, 80%+ → 80.
function computeTextMatchScore(referenceText: string, recognizedText: string): number {
  if (!recognizedText.trim()) return 30
  const norm = (s: string) => s.replace(/[.,!?。、·「」『』""'']/g, '').trim()
  const refWords = referenceText.split(/\s+/).filter(Boolean).map(norm)
  const recWords = recognizedText.split(/\s+/).filter(Boolean).map(norm)
  if (refWords.length === 0) return 60
  let matched = 0
  const recCopy = [...recWords]
  for (const rw of refWords) {
    // Fuzzy: exact OR same first char + similar length (±1) for minor Korean morphological variants
    const idx = recCopy.findIndex(
      (w) => w === rw || (w.length >= 2 && rw.length >= 2 && w[0] === rw[0] && Math.abs(w.length - rw.length) <= 1),
    )
    if (idx >= 0) { matched++; recCopy.splice(idx, 1) }
  }
  const ratio = matched / refWords.length
  if (ratio >= 0.97) return 97
  if (ratio >= 0.93) return 93
  if (ratio >= 0.90) return 90
  if (ratio >= 0.85) return 85
  if (ratio >= 0.80) return 80
  if (ratio >= 0.60) return Math.round(60 + (ratio - 0.60) / 0.20 * 20)
  if (ratio >= 0.40) return Math.round(50 + (ratio - 0.40) / 0.20 * 10)
  return Math.max(30, Math.round(30 + ratio * 50))
}

export async function POST(request: Request) {
  // AZURE_PRONUNCIATION_KEY/REGION override > AZURE_SPEECH_KEY/REGION common key
  const key = process.env.AZURE_PRONUNCIATION_KEY || process.env.AZURE_SPEECH_KEY
  const region = process.env.AZURE_PRONUNCIATION_REGION || process.env.AZURE_SPEECH_REGION

  console.info('[pronunciation-azure] request received', {
    hasKey: !!key,
    hasRegion: !!region,
    usingOverride: !!(process.env.AZURE_PRONUNCIATION_KEY || process.env.AZURE_PRONUNCIATION_REGION),
  })

  let audioBlob: Blob
  let referenceText = ''

  try {
    const formData = await request.formData()
    const audio = formData.get('audio')
    const ref = formData.get('referenceText')
    if (typeof ref === 'string') referenceText = ref
    if (audio !== null && typeof audio !== 'string') {
      const bytes = await (audio as Blob).arrayBuffer()
      audioBlob = new Blob([bytes], { type: (audio as Blob).type || 'audio/webm' })
    } else {
      audioBlob = new Blob([], { type: 'audio/webm' })
    }
  } catch {
    return buildDemoFallback('parse_error')
  }

  if (!key || !region) {
    console.warn('[pronunciation-azure] AZURE_SPEECH_KEY/REGION not configured — demo fallback')
    return buildDemoFallback('azure_not_configured')
  }

  // Convert audio to 16kHz mono 16-bit PCM WAV for Azure
  let wavBuffer: Buffer
  try {
    const inputBuffer = Buffer.from(await audioBlob.arrayBuffer())
    wavBuffer = await convertToWavForEtri(inputBuffer)
  } catch (err) {
    console.error('[pronunciation-azure] audio conversion failed', err instanceof Error ? err.message.slice(0, 100) : '')
    return buildDemoFallback('audio_conversion_failed')
  }

  // Pronunciation-Assessment header (base64 encoded JSON)
  const assessmentConfig = {
    ReferenceText: referenceText,
    GradingSystem: 'HundredMark',
    Granularity: 'Word',
    EnableMiscue: true,
  }
  const assessmentHeader = Buffer.from(JSON.stringify(assessmentConfig)).toString('base64')

  const endpoint = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=ko-KR&format=detailed`

  const t0 = Date.now()
  let azureData: AzurePronResult

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'audio/wav',
        'Pronunciation-Assessment': assessmentHeader,
      },
      body: new Uint8Array(wavBuffer),
      signal: AbortSignal.timeout(12000),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      console.error('[pronunciation-azure] HTTP error', res.status, errBody.slice(0, 200))
      return buildDemoFallback('azure_http_error')
    }

    azureData = await res.json() as AzurePronResult
  } catch (err) {
    console.error('[pronunciation-azure] fetch failed', err instanceof Error ? err.message.slice(0, 100) : '')
    return buildDemoFallback('azure_fetch_failed')
  }

  const latencyMs = Date.now() - t0
  console.info('[pronunciation-azure] response', { latencyMs, status: azureData.RecognitionStatus })

  if (azureData.RecognitionStatus !== 'Success' || !azureData.NBest?.length) {
    return buildDemoFallback('azure_no_recognition')
  }

  const best = azureData.NBest[0]
  const pron = best.PronunciationAssessment
  const words = best.Words ?? []

  // Azure recognized speech but returned no PronunciationAssessment.
  // Common cause: region does not support PA (e.g. koreacentral is not in the PA-supported region list).
  // Return demo fallback with a diff-based score so results are not all identical 72.
  if (!pron) {
    const recognizedText = best.Display ?? best.Lexical ?? ''
    const demoScore = computeTextMatchScore(referenceText, recognizedText)
    console.warn('[pronunciation-azure] Azure recognition succeeded but PronunciationAssessment absent — region may not support PA', { region, latencyMs })
    return buildDemoFallback('azure_no_pron_data', demoScore, recognizedText)
  }

  const wordResults = words.map(w => ({
    word: w.Word,
    accuracyScore: w.PronunciationAssessment?.AccuracyScore ?? 100,
    errorType: w.PronunciationAssessment?.ErrorType ?? 'None',
  }))

  return Response.json({
    providerName: 'azure',
    normalizedScore: Math.round(pron?.PronScore ?? 72),
    pronScore: pron?.PronScore ?? null,
    accuracyScore: pron?.AccuracyScore ?? null,
    fluencyScore: pron?.FluencyScore ?? null,
    completenessScore: pron?.CompletenessScore ?? null,
    recognizedText: best.Display ?? best.Lexical ?? '',
    wordResults,
    latencyMs,
  })
}
