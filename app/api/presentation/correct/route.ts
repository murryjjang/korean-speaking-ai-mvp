// ── Presentation script correction (LLM) ─────────────────────────────────
//
// 명세 23: 학습자가 작성한 발표 원고를 LLM으로 격식체 교정한다.
// q4 OpenAI 인프라(OpenAI SDK 동적 import + JSON response_format)와 동일한 패턴.
// OPENAI_API_KEY가 없거나 호출 실패 시 demo 폴백을 반환해 시연이 깨지지 않도록 한다.
//
// 응답 shape:
//   { source: 'llm' | 'mock', corrected_text: string, corrections: Correction[] }
// Correction = { original: string, corrected: string, reason: string }

const SYSTEM_PROMPT = `당신은 한국어 발표 원고 교정 전문가입니다.
학습자가 작성한 원고를 격식체로 자연스럽게 교정해주세요.

교정 톤: 격식체 (학습자가 공식 자리에서 발표할 수준의 정중한 -습니다/-입니다 체)

규칙:
- corrected_text는 학습자 원본의 의미를 유지하면서 자연스럽게 다듬은 격식체 발표문
- corrections 배열은 3~5개의 핵심 교정 포인트 (너무 사소한 것 제외)
- 각 corrections 항목의 reason은 한 문장 이내로 간결하게
- 원본과 거의 같으면 corrections는 비울 수 있음

응답 형식 (반드시 JSON, 다른 텍스트 금지):
{
  "corrected_text": "교정된 전체 원고",
  "corrections": [
    {"original": "원본 표현", "corrected": "교정 표현", "reason": "간단한 이유"}
  ]
}`

const MOCK_CORRECTED =
  '지난 주말에 저는 친구를 만났습니다. 우리는 카페에 가서 아이스 아메리카노를 마셨습니다. 그 후 공원에서 산책했습니다. 날씨가 좋아서 기분이 매우 좋았습니다. 저녁에는 집으로 돌아와 가족과 함께 영화를 보며 즐거운 시간을 보냈습니다.'

const MOCK_CORRECTIONS = [
  {
    original: '"카페에 갔습니다. 저는 아이스 아메리카노를 마셨습니다."',
    corrected: '"카페에 가서 아이스 아메리카노를 마셨습니다."',
    reason:
      '"-아서/어서"를 사용해 두 문장을 연결하면 더 자연스럽습니다. "카페에 가서 아이스 아메리카노를 마셨습니다."처럼 이어 쓰면 발표가 부드러워집니다.',
  },
  {
    original: '"그리고"',
    corrected: '"그 후"',
    reason: '"그리고"를 반복하기보다 "그 후"를 사용하면 발표 흐름이 더 부드럽습니다.',
  },
  {
    original: '"기분이 좋았습니다"',
    corrected: '"기분이 매우 좋았습니다"',
    reason:
      '"기분이 좋았습니다" 앞에 "매우"를 넣으면 느낌을 조금 더 분명하게 표현할 수 있습니다.',
  },
  {
    original: '(전체 원고)',
    corrected: '(적절한 수준)',
    reason: '전체적으로 초급 학습자가 말하기에 적절한 길이와 표현입니다.',
  },
]

function mockFallback() {
  return Response.json({
    source: 'mock',
    corrected_text: MOCK_CORRECTED,
    corrections: MOCK_CORRECTIONS,
  })
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  const script = typeof (body as Record<string, unknown>).script === 'string'
    ? ((body as Record<string, unknown>).script as string).trim()
    : ''

  if (script.length < 5) {
    return Response.json({ error: 'script_too_short' }, { status: 400 })
  }
  if (script.length > 5000) {
    return Response.json({ error: 'script_too_long' }, { status: 400 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return mockFallback()
  }

  try {
    const { OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey })
    const model =
      process.env.OPENAI_PRESENTATION_CORRECT_MODEL
      ?? process.env.OPENAI_DIALOGUE_MODEL
      ?? process.env.OPENAI_EVAL_MODEL
      ?? 'gpt-4o-mini'

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: script },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: Math.max(800, Math.ceil(script.length * 3)),
    })

    const raw = response.choices[0]?.message?.content ?? ''
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const correctedText = parsed.corrected_text
    const corrections = parsed.corrections

    if (typeof correctedText !== 'string' || !correctedText.trim()) {
      throw new Error('missing_corrected_text')
    }
    if (!Array.isArray(corrections)) {
      throw new Error('missing_corrections')
    }

    const safeCorrections = corrections.flatMap((c): Array<{ original: string; corrected: string; reason: string }> => {
      if (!c || typeof c !== 'object') return []
      const item = c as Record<string, unknown>
      if (
        typeof item.original !== 'string' ||
        typeof item.corrected !== 'string' ||
        typeof item.reason !== 'string'
      ) {
        return []
      }
      return [{ original: item.original, corrected: item.corrected, reason: item.reason }]
    })

    return Response.json({
      source: 'llm',
      corrected_text: correctedText.trim(),
      corrections: safeCorrections,
    })
  } catch (err) {
    console.error('[presentation/correct] LLM error, falling back to mock:', err)
    return mockFallback()
  }
}
