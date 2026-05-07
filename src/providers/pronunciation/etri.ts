import type { PronunciationProvider, PronunciationResult } from '@/src/types/providers'
import { convertToWavForEtri } from '@/src/lib/audio/convert-for-etri'
import { calibrateEtriScore } from '@/src/lib/pronunciation-calibration'

// ETRI enterprise endpoint.
// Full URL override: set ETRI_PRONUNCIATION_ENDPOINT (highest priority).
// Base-only override: set ETRI_API_BASE_URL (combined with fixed ETRI_PATH).
const ETRI_BASE_URL =
  process.env.ETRI_API_BASE_URL ?? 'http://epretx.etri.re.kr:8000'
const ETRI_PATH = '/api/WiseASR_PronunciationKor'
const ETRI_ENDPOINT =
  process.env.ETRI_PRONUNCIATION_ENDPOINT ?? `${ETRI_BASE_URL}${ETRI_PATH}`

interface EtriWordScore {
  word: string
  score: number
}

// ETRI official structure: score and recognized are both direct children of return_object.
// recognized may be a string (recognized text) or an object/array depending on the response variant.
interface EtriReturnObject {
  recognized?: string | unknown[] | Record<string, unknown>
  score?: number | string | null
  Score?: number | string | null
  pronunciation_score?: number | string | null
  pronunciationScore?: number | string | null
  eojeol_score?: EtriWordScore[]
  word_score?: EtriWordScore[]
  [key: string]: unknown
}

interface EtriResponse {
  result: number
  reason?: string
  return_type?: string
  return_object?: EtriReturnObject
}

/**
 * Parse standard PCM WAV header for diagnostic logging.
 * Returns an object with validated fields; safe to log (no audio content).
 * dataBytes: size of the PCM data chunk (standard 44-byte header format).
 */
function parseWavHeader(buf: Buffer): {
  validHeader: boolean
  sampleRate?: number
  channels?: number
  bitsPerSample?: number
  dataBytes?: number
} {
  if (buf.byteLength < 44) return { validHeader: false }
  const riff = buf.toString('ascii', 0, 4)
  const wave = buf.toString('ascii', 8, 12)
  if (riff !== 'RIFF' || wave !== 'WAVE') return { validHeader: false }
  const dataBytes = buf.readUInt32LE(40)
  return {
    validHeader: true,
    channels: buf.readUInt16LE(22),
    sampleRate: buf.readUInt32LE(24),
    bitsPerSample: buf.readUInt16LE(34),
    dataBytes,
  }
}

/**
 * Compute audio duration and approximate RMS from a PCM WAV buffer.
 * Samples every 10th frame (fast, sufficient for diagnostics).
 * rmsApprox: 0–32767 range. Typical speech ~1000–8000; <100 = near-silent.
 * maxAbs: peak absolute amplitude; >30000 = clipping risk.
 * Safe to log — no audio content exposed.
 */
function computeWavStats(
  buf: Buffer,
  meta: { sampleRate?: number; channels?: number; bitsPerSample?: number; dataBytes?: number },
): { durationSec: number; rmsApprox: number; maxAbs: number } | null {
  if (
    !meta.sampleRate ||
    !meta.channels ||
    meta.bitsPerSample !== 16 ||
    !meta.dataBytes
  )
    return null

  const bytesPerFrame = 2 * meta.channels // 16-bit PCM
  const totalFrames = Math.floor(meta.dataBytes / bytesPerFrame)
  const durationSec = parseFloat((totalFrames / meta.sampleRate).toFixed(2))

  const headerOffset = 44
  const step = Math.max(1, meta.channels * 10) // sample every ~10th frame
  let sumSq = 0
  let count = 0
  let maxAbs = 0

  for (let offset = headerOffset; offset + 2 <= buf.byteLength; offset += 2 * step) {
    const sample = buf.readInt16LE(offset)
    sumSq += sample * sample
    count++
    const abs = Math.abs(sample)
    if (abs > maxAbs) maxAbs = abs
  }

  const rmsApprox = count > 0 ? Math.round(Math.sqrt(sumSq / count)) : 0
  return { durationSec, rmsApprox, maxAbs }
}

/**
 * Convert ETRI 1–5 integer score to 0–100 app scale.
 * ETRI 1 → 20, 2 → 40, 3 → 60, 4 → 80, 5 → 100.
 * Exported for unit testing.
 */
export function etriScoreToNormalized(raw: number): number {
  return Math.min(100, Math.max(0, Math.round((raw / 5) * 100)))
}

/**
 * Extract the pronunciation score from an ETRI return_object or recognized object.
 * Tries score, Score, pronunciation_score, pronunciationScore in priority order.
 * Throws etri_score_missing if none found or not numeric.
 * Exported for unit testing.
 * Call on return_object first (ETRI official structure), then fall back to recognized.
 */
export function extractEtriScore(obj: Record<string, unknown>): number {
  const scoreRaw: unknown =
    obj.score ??
    obj.Score ??
    obj.pronunciation_score ??
    obj.pronunciationScore ??
    undefined

  if (scoreRaw === undefined || scoreRaw === null) {
    throw new Error('etri_score_missing: score field not found in recognized[0]')
  }

  const parsed = Number(scoreRaw)
  if (isNaN(parsed)) {
    throw new Error('etri_score_missing: score field is not numeric')
  }

  return parsed
}

function normalizeFeedback(score: number): string {
  if (score >= 90) return '발음이 매우 우수합니다.'
  if (score >= 75) return '전반적으로 발음이 양호합니다.'
  if (score >= 60) return '일부 단어의 발음을 개선하면 좋겠습니다.'
  // ETRI 점수는 마이크·녹음 품질·script 일치 여부에 따라 달라질 수 있어 단정 표현 사용하지 않음
  return '현재 점수는 API 원점수 기반 참고값입니다. 마이크 음량, 녹음 품질, 기준문장 일치 여부에 따라 달라질 수 있습니다.'
}

function needsConversion(mimeType: string): boolean {
  // ETRI accepts WAV/PCM only. Browsers record webm/opus which must be converted.
  return (
    mimeType.startsWith('audio/webm') ||
    mimeType.startsWith('video/webm') ||
    mimeType.startsWith('audio/ogg') ||
    mimeType.startsWith('audio/mp4') ||
    mimeType.startsWith('video/mp4')
  )
}

export class ETRIPronunciationProvider implements PronunciationProvider {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async evaluate(audioBlob: Blob, referenceText: string): Promise<PronunciationResult> {
    const start = Date.now()
    const mimeType = audioBlob.type || 'audio/webm'
    const arrayBuffer = await audioBlob.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuffer)

    // Diagnostic log — no secret values
    console.info('[etri] evaluate start', {
      mimeType,
      inputByteLength: inputBuffer.byteLength,
      scriptLength: referenceText.length,
      apiKeyPresent: !!this.apiKey,
      needsConversion: needsConversion(mimeType),
    })

    // Convert to WAV/PCM when the browser delivers webm/opus (or other containers)
    let audioBuffer: Buffer
    let sentMimeType: string

    if (needsConversion(mimeType)) {
      try {
        audioBuffer = await convertToWavForEtri(inputBuffer)
        sentMimeType = 'audio/wav'

        // Validate WAV header: RIFF + WAVE magic, then PCM metadata fields
        const wavMeta = parseWavHeader(audioBuffer)
        const wavStats = wavMeta.validHeader ? computeWavStats(audioBuffer, wavMeta) : null
        console.info('[etri] conversion success', {
          inputBytes: inputBuffer.byteLength,
          outputBytes: audioBuffer.byteLength,
          ...wavMeta,
          durationSec: wavStats?.durationSec,
          rmsApprox: wavStats?.rmsApprox,
          maxAbs: wavStats?.maxAbs,
        })
      } catch (convErr) {
        const convMsg = convErr instanceof Error ? convErr.message : String(convErr)
        console.error('[etri] audio_conversion_failed', { error: convMsg })
        // convErr already has the 'audio_conversion_failed:' prefix — rethrow as-is
        throw convErr instanceof Error ? convErr : new Error(`audio_conversion_failed: ${convMsg}`)
      }
    } else {
      audioBuffer = inputBuffer
      sentMimeType = mimeType
    }

    const base64Audio = audioBuffer.toString('base64')

    // normalizedScript: trimmed, first 40 chars for log — diagnose leading instructions, quotes, extra whitespace
    const normalizedScript = referenceText.trim()
    console.info('[etri] sending request', {
      sentMimeType,
      audioBytes: audioBuffer.byteLength,
      base64Length: base64Audio.length,
      scriptLength: normalizedScript.length,
      scriptPreview: normalizedScript.slice(0, 40),
      scriptHasLeadingInstruction: /^(다음|아래|읽으세요|낭독)/.test(normalizedScript),
    })

    const body = {
      request_id: 'reserved',
      argument: {
        language_code: 'korean',
        script: normalizedScript,
        audio: base64Audio,
      },
    }

    // Log safe endpoint metadata — hostname/path only, no API key
    try {
      const ep = new URL(ETRI_ENDPOINT)
      console.info('[etri] endpoint', { hostname: ep.hostname, path: ep.pathname })
    } catch {
      console.info('[etri] endpoint', { raw: ETRI_ENDPOINT.slice(0, 60) })
    }

    let response: Response
    try {
      response = await fetch(ETRI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          Authorization: this.apiKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      })
    } catch (fetchErr) {
      const fetchMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
      console.error('[etri] fetch_failed', { error: fetchMsg })
      throw new Error(`etri_fetch_failed: ${fetchMsg}`)
    }

    console.info('[etri] response received', {
      status: response.status,
      ok: response.ok,
    })

    if (!response.ok) {
      throw new Error(`etri_http_error: HTTP ${response.status}`)
    }

    const data = (await response.json()) as EtriResponse

    // Diagnostic summary — no secret values, covers all required log fields
    const returnObj = data.return_object
    const recognizedRaw = returnObj?.recognized
    const recognizedIsArray = Array.isArray(recognizedRaw)
    const recognizedIsObject =
      recognizedRaw !== null &&
      recognizedRaw !== undefined &&
      typeof recognizedRaw === 'object' &&
      !recognizedIsArray

    console.info('[etri] response summary', {
      httpStatus: response.status,
      result: data.result,
      return_type: data.return_type ?? null,
      reason: data.reason ?? null,
      topLevelKeys: Object.keys(data),
      returnObjectKeys: returnObj ? Object.keys(returnObj) : null,
      typeofReturnObject: typeof returnObj,
      typeofScore: typeof returnObj?.score,
      scoreIsNumber: typeof returnObj?.score === 'number',
      scoreIsString: typeof returnObj?.score === 'string',
      scoreValue:
        typeof returnObj?.score === 'number' || typeof returnObj?.score === 'string'
          ? String(returnObj!.score)
          : 'absent',
      typeofRecognized: recognizedIsArray
        ? 'array'
        : recognizedRaw !== undefined
          ? typeof recognizedRaw
          : 'absent',
      recognizedArrayLength: recognizedIsArray ? (recognizedRaw as unknown[]).length : undefined,
      recognizedObjectKeys: recognizedIsObject
        ? Object.keys(recognizedRaw as Record<string, unknown>)
        : undefined,
      recognizedStringPrefix:
        typeof recognizedRaw === 'string' ? recognizedRaw.slice(0, 40) : undefined,
      recognizedLength:
        typeof recognizedRaw === 'string' ? recognizedRaw.length : undefined,
      scriptLength: normalizedScript.length,
      scriptPreview: normalizedScript.slice(0, 40),
      wordScoreCount:
        Array.isArray(returnObj?.eojeol_score)
          ? (returnObj!.eojeol_score as unknown[]).length
          : Array.isArray(returnObj?.word_score)
            ? (returnObj!.word_score as unknown[]).length
            : 0,
      audioBase64Length: base64Audio.length,
      convertedAudioBytes: audioBuffer.byteLength,
    })

    // result !== 0 is an ETRI API-level error — distinct from score missing
    if (data.result !== 0) {
      throw new Error(
        `etri_api_error: result=${data.result} reason=${data.reason ?? 'unknown'}`,
      )
    }

    const latencyMs = Date.now() - start

    if (!returnObj) {
      throw new Error('etri_score_missing: return_object missing in response')
    }

    // Score extraction: ETRI official structure puts score directly on return_object.
    // Fall back to recognized object if return_object has no score field.
    let rawScore: number

    try {
      // Priority 1–4: return_object.score / .Score / .pronunciation_score / .pronunciationScore
      rawScore = extractEtriScore(returnObj as Record<string, unknown>)
    } catch {
      // Priority 5–6: recognized.score / .Score (fallback for older response variants)
      let recognizedObj: Record<string, unknown> | undefined
      if (recognizedIsArray && (recognizedRaw as unknown[]).length > 0) {
        recognizedObj = (recognizedRaw as unknown[])[0] as Record<string, unknown>
      } else if (recognizedIsObject) {
        recognizedObj = recognizedRaw as Record<string, unknown>
      }

      if (recognizedObj) {
        console.info('[etri] recognized fallback attempt', {
          keys: Object.keys(recognizedObj),
          scoreCandidate: recognizedObj.score,
          ScoreCandidate: recognizedObj.Score,
        })
      }

      if (!recognizedObj) {
        throw new Error('etri_score_missing: score field not found in return_object or recognized')
      }

      rawScore = extractEtriScore(recognizedObj)
    }

    const normalizedScore = etriScoreToNormalized(rawScore)
    const calibration = calibrateEtriScore(rawScore)

    // Word-level scores may sit on return_object or inside recognized
    const wordScoreSource =
      (returnObj.eojeol_score ?? returnObj.word_score) ??
      (recognizedIsObject
        ? ((recognizedRaw as Record<string, unknown>).eojeol_score ??
           (recognizedRaw as Record<string, unknown>).word_score)
        : undefined)
    const rawWordScores = (
      Array.isArray(wordScoreSource) ? (wordScoreSource as EtriWordScore[]) : []
    ).slice(0, 20)

    return {
      normalizedScore,
      rawScore,
      calibratedScore: calibration.calibratedScore,
      calibrationVersion: calibration.calibrationVersion,
      calibrationStatus: calibration.calibrationStatus,
      calibrationNote: calibration.note,
      wordScores: rawWordScores.map((ws) => ({
        word: ws.word,
        // word-level scores are also 1–5 from ETRI
        score: etriScoreToNormalized(Number(ws.score)),
      })),
      feedback: normalizeFeedback(normalizedScore),
      providerName: 'etri',
      providerVersion: '1.0',
      latencyMs,
      rawResponse: { result: data.result, reason: data.reason },
    }
  }
}
