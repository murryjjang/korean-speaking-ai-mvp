import type { PronunciationProvider, PronunciationResult } from '@/src/types/providers'

const ETRI_BASE_URL = process.env.ETRI_API_BASE_URL ?? 'https://aiopen.etri.re.kr:8000'
const ETRI_PATH = '/WiseASR/PronunciationKor'

interface EtriWordScore {
  word: string
  score: number
}

interface EtriRecognized {
  score?: number
  eojeol_score?: EtriWordScore[]
  word_score?: EtriWordScore[]
}

interface EtriResponse {
  result: number
  reason?: string
  return_object?: {
    recognized?: EtriRecognized[]
  }
}

function normalizeFeedback(score: number): string {
  if (score >= 90) return '발음이 매우 우수합니다.'
  if (score >= 75) return '전반적으로 발음이 양호합니다.'
  if (score >= 60) return '일부 단어의 발음을 개선하면 좋겠습니다.'
  return '발음 연습이 필요합니다. 원어민 발음을 따라 읽어보세요.'
}

export class ETRIPronunciationProvider implements PronunciationProvider {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async evaluate(audioBlob: Blob, referenceText: string): Promise<PronunciationResult> {
    const start = Date.now()

    const arrayBuffer = await audioBlob.arrayBuffer()
    const base64Audio = Buffer.from(arrayBuffer).toString('base64')

    const body = {
      access_key: this.apiKey,
      argument: {
        language_code: 'korean',
        script: referenceText,
        audio: base64Audio,
      },
    }

    const response = await fetch(`${ETRI_BASE_URL}${ETRI_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    })

    if (!response.ok) {
      throw new Error(`ETRI HTTP ${response.status}`)
    }

    const data = (await response.json()) as EtriResponse

    if (data.result !== 0) {
      throw new Error(
        `ETRI API error result=${data.result} reason=${data.reason ?? 'unknown'}`,
      )
    }

    const latencyMs = Date.now() - start
    const recognized = data.return_object?.recognized?.[0]

    if (!recognized) {
      throw new Error('ETRI response missing recognized field')
    }

    const rawScore = Number(recognized.score ?? 0)
    const rawWordScores = (recognized.eojeol_score ?? recognized.word_score ?? []).slice(0, 20)

    return {
      normalizedScore: rawScore,
      wordScores: rawWordScores.map((ws) => ({
        word: ws.word,
        score: Number(ws.score),
      })),
      feedback: normalizeFeedback(rawScore),
      providerName: 'etri',
      providerVersion: '1.0',
      latencyMs,
      rawResponse: { result: data.result, reason: data.reason },
    }
  }
}
