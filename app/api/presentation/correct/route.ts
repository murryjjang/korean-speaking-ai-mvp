// ── Presentation script correction (LLM) ─────────────────────────────────
//
// 명세 23: 학습자가 작성한 발표 원고를 LLM으로 교정.
// 명세 23-a: 교정 톤(격식체/일반체/친근체)을 학습자가 선택.
// q4 OpenAI 인프라(OpenAI SDK 동적 import + JSON response_format)와 동일한 패턴.
// OPENAI_API_KEY가 없거나 호출 실패 시 demo 폴백을 반환해 시연이 깨지지 않도록 한다.
//
// 응답 shape:
//   { source: 'llm' | 'mock', corrected_text: string, corrections: Correction[] }
// Correction = { original: string, corrected: string, reason: string }

type Tone = 'formal' | 'general' | 'casual'

const TONE_LABEL: Record<Tone, string> = {
  formal: '격식체 (-습니다 / -입니다)',
  general: '일반체 (-요 / -아·어요)',
  casual: '친근체 (반말, -아·어 / -야)',
}

const TONE_GUIDE: Record<Tone, string> = {
  formal: '공식 발표·보고에 적합한 정중한 어말어미. 예: "안녕하십니까. 저는 ~를 발표하겠습니다."',
  general: '일반적인 대화·발표에 적합한 표준 존대 어말어미. 예: "안녕하세요. 저는 ~를 발표할게요."',
  casual: '친구·가족 사이 친근한 반말 어말어미. 예: "안녕. 나는 ~를 발표할 거야."',
}

function buildSystemPrompt(tone: Tone): string {
  return `당신은 한국어 발표 원고 교정 전문가입니다.
학습자가 작성한 원고를 선택된 톤으로 자연스럽게 교정해주세요.

[선택된 톤]
${TONE_LABEL[tone]}
${TONE_GUIDE[tone]}

[톤별 어말어미 가이드]
- 격식체 (formal): -습니다 / -입니다 / -합니다 / -하겠습니다
- 일반체 (general): -요 / -아요 / -어요 / -할게요
- 친근체 (casual): 반말 종결 (-아 / -어 / -야 / -지)

규칙:
- corrected_text는 학습자 원본의 의미를 유지하면서 위 톤으로 자연스럽게 다듬은 발표문
- 모든 종결어미를 선택된 톤으로 일관되게 통일
- corrections 배열은 3~5개의 핵심 교정 포인트 (너무 사소한 것 제외, 톤 변경이 핵심이면 그것도 포함)
- 각 corrections 항목의 reason은 한 문장 이내로 간결하게
- 원본과 거의 같으면 corrections는 비울 수 있음

응답 형식 (반드시 JSON, 다른 텍스트 금지):
{
  "corrected_text": "교정된 전체 원고",
  "corrections": [
    {"original": "원본 표현", "corrected": "교정 표현", "reason": "간단한 이유"}
  ]
}`
}

const MOCK_BY_TONE: Record<Tone, { corrected_text: string; corrections: Array<{ original: string; corrected: string; reason: string }> }> = {
  formal: {
    corrected_text:
      '지난 주말에 저는 친구를 만났습니다. 우리는 카페에 가서 아이스 아메리카노를 마셨습니다. 그 후 공원에서 산책했습니다. 날씨가 좋아서 기분이 매우 좋았습니다. 저녁에는 집으로 돌아와 가족과 함께 영화를 보며 즐거운 시간을 보냈습니다.',
    corrections: [
      {
        original: '"카페에 갔습니다. 저는 아이스 아메리카노를 마셨습니다."',
        corrected: '"카페에 가서 아이스 아메리카노를 마셨습니다."',
        reason: '"-아서/어서"를 사용해 두 문장을 연결하면 더 자연스럽습니다.',
      },
      {
        original: '"그리고"',
        corrected: '"그 후"',
        reason: '"그리고"를 반복하기보다 "그 후"를 사용하면 발표 흐름이 더 부드럽습니다.',
      },
      {
        original: '"기분이 좋았습니다"',
        corrected: '"기분이 매우 좋았습니다"',
        reason: '"매우"를 넣으면 느낌을 조금 더 분명하게 표현할 수 있습니다.',
      },
    ],
  },
  general: {
    corrected_text:
      '지난 주말에 저는 친구를 만났어요. 우리는 카페에 가서 아이스 아메리카노를 마셨어요. 그 후에 공원에서 산책했어요. 날씨가 좋아서 기분이 정말 좋았어요. 저녁에는 집으로 돌아와 가족과 함께 영화를 보며 즐거운 시간을 보냈어요.',
    corrections: [
      {
        original: '"-습니다"',
        corrected: '"-아요/-어요"',
        reason: '일반체로 통일했습니다. 친근하면서도 예의를 지키는 표준 존대 어말어미입니다.',
      },
      {
        original: '"갔습니다. 저는 아이스 아메리카노를 마셨습니다."',
        corrected: '"가서 아이스 아메리카노를 마셨어요."',
        reason: '"-아서/어서"로 두 문장을 연결하면 발화가 자연스러워집니다.',
      },
      {
        original: '"그리고"',
        corrected: '"그 후에"',
        reason: '"그 후에"를 사용하면 시간 흐름이 더 분명해집니다.',
      },
    ],
  },
  casual: {
    corrected_text:
      '지난 주말에 나는 친구를 만났어. 우리 카페 가서 아이스 아메리카노 마셨어. 그러고 공원에서 산책했어. 날씨가 좋아서 기분이 진짜 좋았어. 저녁에는 집에 돌아와서 가족이랑 같이 영화 보면서 재미있게 보냈어.',
    corrections: [
      {
        original: '"-습니다"',
        corrected: '"-아 / -어"',
        reason: '친근체(반말) 종결로 통일했습니다. 친구·가족 사이 톤입니다.',
      },
      {
        original: '"저는"',
        corrected: '"나는"',
        reason: '반말에서는 "저"보다 "나"를 사용합니다.',
      },
      {
        original: '"가족과 함께"',
        corrected: '"가족이랑 같이"',
        reason: '구어체 친근체에서는 "이랑 같이"가 더 자연스럽습니다.',
      },
    ],
  },
}

function mockFallback(tone: Tone) {
  const m = MOCK_BY_TONE[tone]
  return Response.json({
    source: 'mock',
    corrected_text: m.corrected_text,
    corrections: m.corrections,
  })
}

function isTone(v: unknown): v is Tone {
  return v === 'formal' || v === 'general' || v === 'casual'
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

  const b = body as Record<string, unknown>
  const script = typeof b.script === 'string' ? b.script.trim() : ''
  const tone: Tone = isTone(b.tone) ? b.tone : 'formal'

  if (script.length < 5) {
    return Response.json({ error: 'script_too_short' }, { status: 400 })
  }
  if (script.length > 5000) {
    return Response.json({ error: 'script_too_long' }, { status: 400 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return mockFallback(tone)
  }

  try {
    const { OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey })
    const model =
      process.env.OPENAI_PRESENTATION_CORRECT_MODEL
      ?? process.env.OPENAI_DIALOGUE_MODEL
      ?? process.env.OPENAI_EVAL_MODEL
      ?? 'gpt-4o-mini'

    // 명세 23-c Phase 4: 학습자 원고 토큰의 약 2.5배까지 허용해 교정문이 잘리지 않게 한다.
    // 한국어는 글자당 1~2 토큰이라 보수적으로 character × 5 정도를 상한으로 둔다.
    const tokenBudget = Math.min(4096, Math.max(1200, Math.ceil(script.length * 5)))
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: buildSystemPrompt(tone) },
        { role: 'user', content: script },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: tokenBudget,
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

    // 명세 23-c Phase 4: 교정문이 원본보다 30% 이상 짧으면 잘림으로 간주하고
    // 학습자 원본을 그대로 사용해 교정문 잘림으로 인한 오해를 방지한다.
    const trimmedCorrected = correctedText.trim()
    const lengthRatio = trimmedCorrected.length / script.length
    if (lengthRatio < 0.7) {
      console.warn(
        `[presentation/correct] corrected_text too short (ratio=${lengthRatio.toFixed(2)}), using original script as fallback`,
      )
      return Response.json({
        source: 'mock' as const,
        corrected_text: script,
        corrections: [],
      })
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
      corrected_text: trimmedCorrected,
      corrections: safeCorrections,
    })
  } catch (err) {
    console.error('[presentation/correct] LLM error, falling back to mock:', err)
    return mockFallback(tone)
  }
}
