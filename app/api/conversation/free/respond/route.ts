// ── Free conversation: per-turn NPC response with learner correction ─────
//
// 명세 24-C: 학습자 발화에 LLM이 자연스럽게 응답하면서, 매 턴 학습자 발화의
// 자연 표현 교정을 함께 반환한다. q4 인프라(OpenAI SDK 동적 import + JSON
// response_format)와 동일 패턴.
//
// OPENAI_API_KEY 미설정 또는 호출 실패 시 mock 폴백을 반환해 시연이 깨지지
// 않게 한다. q4 mock conversation provider는 절대 손대지 않는다 (가드 5).

type Turn = { role: 'student' | 'ai'; text: string }

function buildSystemPrompt(topic: string): string {
  return `당신은 한국어 학습자와 자유롭게 대화하는 한국인 친구입니다.
주제: ${topic}

[응답 원칙]
- 친근하고 자연스러운 일반체 (반말 아님, "-요"체)
- 학습자 수준에 맞는 어휘 (초~중급)
- 매 턴 학습자 발화에 자연스럽게 반응
- 같은 인사·표현 반복 금지
- 주제에 깊이 들어가는 후속 질문을 한 번에 하나씩
- 1~3문장으로 짧게 응답

[교정 역할]
- 매 턴 학습자 발화를 점검합니다
- 자연스럽고 정확하면 corrected는 original과 같게, reason은 "자연스럽게 잘 말씀하셨어요" 같은 짧은 칭찬
- 어색하거나 비표준 표현이면 corrected는 자연스러운 표현, reason은 한 문장 이내 안내

[출력 형식]
반드시 다음 JSON만 출력 (다른 텍스트, 코드 블록 금지):
{
  "npc_response": "한국어 NPC 응답 1~3문장",
  "learner_correction": {
    "original": "학습자 원본",
    "corrected": "자연스러운 교정 (원본과 같아도 됨)",
    "reason": "교정 이유 또는 칭찬 (한 문장)"
  }
}`
}

function formatHistory(turns: Turn[]): string {
  if (turns.length === 0) return '(대화 시작)'
  return turns
    .slice(-10)
    .map((t) => (t.role === 'student' ? `학습자: ${t.text}` : `AI: ${t.text}`))
    .join('\n')
}

function mockResponse(latestStudentText: string): Response {
  return Response.json({
    source: 'mock',
    npc_response: '재미있는 이야기네요! 좀 더 자세히 말씀해 주실 수 있어요?',
    learner_correction: {
      original: latestStudentText,
      corrected: latestStudentText,
      reason: '자연스럽게 잘 말씀하셨어요.',
    },
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

  const b = body as Record<string, unknown>
  const topic = typeof b.topic === 'string' ? b.topic.trim() : ''
  const latest = typeof b.latestStudentText === 'string' ? b.latestStudentText.trim() : ''
  const turns: Turn[] = Array.isArray(b.turns)
    ? (b.turns as unknown[]).flatMap((t): Turn[] => {
        if (!t || typeof t !== 'object') return []
        const turn = t as Record<string, unknown>
        if ((turn.role !== 'student' && turn.role !== 'ai') || typeof turn.text !== 'string') return []
        return [{ role: turn.role, text: turn.text }]
      })
    : []

  if (!topic) {
    return Response.json({ error: 'missing_topic' }, { status: 400 })
  }
  if (!latest) {
    return Response.json({ error: 'missing_student_text' }, { status: 400 })
  }
  if (latest.length > 1000) {
    return Response.json({ error: 'student_text_too_long' }, { status: 400 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return mockResponse(latest)
  }

  try {
    const { OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey })
    const model =
      process.env.OPENAI_FREE_CONVERSATION_MODEL
      ?? process.env.OPENAI_DIALOGUE_MODEL
      ?? process.env.OPENAI_EVAL_MODEL
      ?? 'gpt-4o-mini'

    const systemPrompt = buildSystemPrompt(topic)
    const userContent = `[기존 대화 이력]\n${formatHistory(turns)}\n\n[학습자 최신 발화]\n${latest}`

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 500,
    })

    const raw = response.choices[0]?.message?.content ?? ''
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const npcText = parsed.npc_response
    const correction = parsed.learner_correction

    if (typeof npcText !== 'string' || !npcText.trim()) {
      throw new Error('missing_npc_response')
    }

    let safeCorrection: { original: string; corrected: string; reason: string } = {
      original: latest,
      corrected: latest,
      reason: '자연스럽게 잘 말씀하셨어요.',
    }
    if (correction && typeof correction === 'object') {
      const c = correction as Record<string, unknown>
      if (
        typeof c.original === 'string' &&
        typeof c.corrected === 'string' &&
        typeof c.reason === 'string'
      ) {
        safeCorrection = { original: c.original, corrected: c.corrected, reason: c.reason }
      }
    }

    return Response.json({
      source: 'llm',
      npc_response: npcText.trim(),
      learner_correction: safeCorrection,
    })
  } catch (err) {
    console.error('[conversation/free/respond] LLM error, falling back to mock:', err)
    return mockResponse(latest)
  }
}
