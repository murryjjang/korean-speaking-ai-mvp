// ── Presentation evaluation: LLM feedback in ko/vi/en ────────────────────
//
// 명세 23-c Phase 2: 학습자 발표 원고 + 교정문 + 실제 발화(STT)를 받아
// LLM이 한국어/베트남어/영어 피드백(잘한 점 3 + 다음 목표 1~2)을 생성한다.
// q4·자유대화 패턴(OpenAI SDK 동적 import + JSON response_format)과 동일.
//
// OPENAI_API_KEY 미설정 또는 호출 실패 시 mock 폴백을 반환.

type LangFeedback = { strengths: string[]; next_steps: string[] }

// 명세 23-d Phase D: 학습자 발화(transcript)와 교정문(correctedScript)을 비교하여
// 빠진 내용을 정확히 식별하도록 프롬프트 보강. 학습자가 발표 도중 멈춘 경우 ("빠진
// 내용 없음"이라고 잘못 판단하던 회귀) 끝부분 누락을 next_steps에 반드시 명시한다.
const SYSTEM_PROMPT = `당신은 한국어 발표 평가 전문가입니다.
학습자가 작성한 원고, AI가 다듬은 교정문, 실제 발화(transcript) 결과를 받아 다음을 평가합니다:

1. 잘한 점 3가지: 학습자 실제 발화에서 드러난 강점을 구체적으로. 가능하면 발화 표현을 짧게 인용.
2. 다음 목표 1~2가지: 다음 연습 시 개선하면 좋을 점. 아래 "빠진 내용 식별 원칙"을 반드시 따르세요.

[빠진 내용 식별 원칙]
- 교정문(AI가 다듬은 발표문)에 있지만 학습자 transcript에 없는 부분을 정확히 식별하여 next_steps에 구체적으로 명시합니다.
- 예: "끝부분 '저녁에 가족과 영화 본 내용'이 발표에서 빠졌습니다."
- transcript 길이가 correctedScript의 70% 미만이면 반드시 빠진 내용이 있다고 판단합니다.
- transcript의 마지막 문장이 교정문 마지막 문장과 다르면 끝부분 누락을 의심합니다.
- 교정문의 각 문장을 transcript에서 찾아보며 누락 여부를 식별합니다.
- 빠진 내용이 정말 없을 때(transcript와 교정문이 거의 일치)에만 누락 언급을 생략합니다.

한국어/베트남어(Tiếng Việt)/영어(English) 세 언어로 동시 출력합니다.
세 언어 모두 같은 의미를 담되 자연스러운 표현으로 번역하세요. 빠진 내용 식별은 세 언어 모두 동일하게 적용합니다.

반드시 다음 JSON만 출력 (다른 텍스트, 코드 블록 금지):
{
  "feedback_ko": { "strengths": ["..."], "next_steps": ["..."] },
  "feedback_vi": { "strengths": ["..."], "next_steps": ["..."] },
  "feedback_en": { "strengths": ["..."], "next_steps": ["..."] }
}`

function buildUserContent({
  topic,
  originalScript,
  correctedScript,
  transcript,
}: {
  topic: string
  originalScript: string
  correctedScript: string
  transcript: string
}): string {
  return [
    `[발표 주제]\n${topic || '(주제 미입력)'}`,
    `[학습자 원고]\n${originalScript}`,
    `[AI 교정문]\n${correctedScript || '(교정문 없음)'}`,
    `[실제 발화 (STT)]\n${transcript || '(발화 인식 결과 없음)'}`,
  ].join('\n\n')
}

// 23-d Phase D: 길이 가드 — transcript가 correctedScript의 80% 미만이면
// 학습자가 발표를 끝까지 진행하지 않은 것으로 간주. LLM이 또는 mock이
// "빠진 내용 없음"이라고 잘못 판단해도 안전망으로 보충 안내를 강제 주입.
const MISSING_HINT_KO = '발표가 끝까지 진행되지 않은 것 같습니다. 교정문 끝부분을 다시 확인하여 빠진 내용을 보충해 주세요.'
const MISSING_HINT_VI = 'Có vẻ như bài thuyết trình chưa hoàn tất. Hãy kiểm tra phần cuối của bản đã chỉnh sửa và bổ sung nội dung còn thiếu.'
const MISSING_HINT_EN = 'It looks like the presentation did not finish. Please review the end of the corrected script and add the missing content.'

function isPartialPresentation(correctedScript: string, transcript: string): boolean {
  const c = correctedScript.trim().length
  const t = transcript.trim().length
  if (c < 20) return false // 교정문이 너무 짧으면 비교 신뢰도 낮음 → 가드 미적용
  if (t === 0) return false // STT 자체 실패 케이스 — 별도 영역에서 처리
  return t / c < 0.8
}

function injectMissingHint(fb: LangFeedback, hint: string): LangFeedback {
  const already = fb.next_steps.some(
    (s) => s.includes('빠진') || s.includes('thiếu') || /missing/i.test(s) || s.includes('끝까지') || s.includes('hoàn tất') || /finish/i.test(s),
  )
  if (already) return fb
  return { ...fb, next_steps: [hint, ...fb.next_steps] }
}

function mockFallback(opts?: { partial?: boolean }): Response {
  const partial = opts?.partial === true
  const ko: LangFeedback = {
    strengths: [
      '발표 주제가 분명합니다.',
      '내용을 시간 순서대로 말했습니다.',
      partial
        ? '시작 부분의 표현이 자연스럽습니다.'
        : '교정문과 실제 발화가 대부분 일치합니다.',
    ],
    next_steps: partial
      ? [MISSING_HINT_KO]
      : ['다음에는 마지막 문장을 조금 더 또렷하게 말해 보세요.'],
  }
  const vi: LangFeedback = {
    strengths: [
      'Chủ đề bài nói rõ ràng.',
      'Bạn đã trình bày nội dung theo thứ tự thời gian.',
      partial
        ? 'Cách diễn đạt ở phần đầu khá tự nhiên.'
        : 'Nội dung bạn nói gần giống với bản đã chỉnh sửa.',
    ],
    next_steps: partial
      ? [MISSING_HINT_VI]
      : ['Lần sau, hãy đọc câu cuối rõ hơn một chút.'],
  }
  const en: LangFeedback = {
    strengths: [
      'The topic of the presentation is clear.',
      'You presented the content in chronological order.',
      partial
        ? 'The opening expressions sound natural.'
        : 'Your speech closely matched the corrected version.',
    ],
    next_steps: partial
      ? [MISSING_HINT_EN]
      : ['Next time, try to pronounce the last sentence a bit more clearly.'],
  }
  return Response.json({
    source: 'mock' as const,
    feedback_ko: ko,
    feedback_vi: vi,
    feedback_en: en,
  })
}

function safeFeedback(parsed: Record<string, unknown>, key: string): LangFeedback {
  const v = parsed[key]
  if (!v || typeof v !== 'object') throw new Error(`missing_${key}`)
  const obj = v as Record<string, unknown>
  const strengths = Array.isArray(obj.strengths)
    ? (obj.strengths as unknown[]).filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : []
  const next_steps = Array.isArray(obj.next_steps)
    ? (obj.next_steps as unknown[]).filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : []
  if (strengths.length === 0 && next_steps.length === 0) throw new Error(`empty_${key}`)
  return { strengths, next_steps }
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
  const topic = typeof b.topic === 'string' ? b.topic.trim() : ''
  const originalScript = typeof b.originalScript === 'string' ? b.originalScript.trim() : ''
  const correctedScript = typeof b.correctedScript === 'string' ? b.correctedScript.trim() : ''
  const transcript = typeof b.transcript === 'string' ? b.transcript.trim() : ''

  if (originalScript.length < 5 && transcript.length < 5) {
    return Response.json({ error: 'missing_inputs' }, { status: 400 })
  }
  if (originalScript.length > 5000 || correctedScript.length > 5000 || transcript.length > 5000) {
    return Response.json({ error: 'input_too_long' }, { status: 400 })
  }

  const partial = isPartialPresentation(correctedScript, transcript)

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return mockFallback({ partial })
  }

  try {
    const { OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey })
    const model =
      process.env.OPENAI_PRESENTATION_EVALUATE_MODEL
      ?? process.env.OPENAI_DIALOGUE_MODEL
      ?? process.env.OPENAI_EVAL_MODEL
      ?? 'gpt-4o-mini'

    const userContent = buildUserContent({ topic, originalScript, correctedScript, transcript })

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 1800,
    })

    const raw = response.choices[0]?.message?.content ?? ''
    const parsed = JSON.parse(raw) as Record<string, unknown>

    let feedback_ko = safeFeedback(parsed, 'feedback_ko')
    let feedback_vi = safeFeedback(parsed, 'feedback_vi')
    let feedback_en = safeFeedback(parsed, 'feedback_en')

    // 23-d Phase D: 길이 가드 폴백 — LLM이 또 빠진 내용을 못 잡았을 경우의 안전망.
    if (partial) {
      feedback_ko = injectMissingHint(feedback_ko, MISSING_HINT_KO)
      feedback_vi = injectMissingHint(feedback_vi, MISSING_HINT_VI)
      feedback_en = injectMissingHint(feedback_en, MISSING_HINT_EN)
    }

    return Response.json({
      source: 'llm' as const,
      feedback_ko,
      feedback_vi,
      feedback_en,
    })
  } catch (err) {
    console.error('[presentation/evaluate] LLM error, falling back to mock:', err)
    return mockFallback({ partial })
  }
}

