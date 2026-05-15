// ── Free conversation: per-turn NPC response with learner correction ─────
//
// v1.1: 페르소나 기반 NPC + 한국 특화 API 도구(OpenAI function calling)를 결합한 생성형 자유 대화.
// 학습자 발화에 LLM이 자연스럽게 응답하면서, 매 턴 학습자 발화의 자연 표현 교정을 함께 반환한다.
//
// OPENAI_API_KEY 미설정 또는 호출 실패 시 mock 폴백을 반환해 시연이 깨지지 않게 한다.
// q4 mock conversation provider는 절대 손대지 않는다 (가드 5).

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

import { buildPersonaSystemPrompt } from '@/src/lib/llm/build-persona-system-prompt'
import { getPersona, PERSONAS, type Persona } from '@/src/lib/personas'
import { runTool, toolDefinitions, type OpenAIToolDefinition } from '@/src/lib/llm/tools'

type Turn = { role: 'student' | 'ai'; text: string }

const DEFAULT_PERSONA_ID = 'friend_casual'
const MAX_TOOL_ROUNDS = 3

// 도구별 필수 환경변수 — 키가 없으면 그 도구는 LLM에 노출하지 않는다 (그 도구만 비활성화).
function toolEnvAvailable(name: string): boolean {
  switch (name) {
    case 'search_place':
      return !!process.env.KAKAO_REST_API_KEY
    case 'search_web':
      return !!process.env.NAVER_CLIENT_ID && !!process.env.NAVER_CLIENT_SECRET
    case 'get_weather':
      return !!process.env.KMA_API_KEY
    case 'search_address':
      return !!process.env.JUSO_API_KEY
    default:
      return false
  }
}

function availableTools(): OpenAIToolDefinition[] {
  return toolDefinitions.filter((t) => toolEnvAvailable(t.function.name))
}

// v1.1 단계 9-3: 시스템 프롬프트 조립은 buildPersonaSystemPrompt로 단일화한다.
// 페르소나 캐릭터 시트·Few-shot·주제 유지·회귀 원칙·교정·출력 형식이 한 곳에서 관리된다.

// 23-h A-2: 단어 일치율 가드.
// LLM이 작은 차이도 교정 결과로 만드는 경향이 있어, 일치율 ≥ 0.85일 때
// 클라이언트 후처리에서 corrected를 original로 되돌리고 자연스러움 안내로 대체한다.
function wordMatchRatio(original: string, corrected: string): number {
  const tokenize = (s: string) =>
    s.replace(/[.,!?。、·"'""''\s]+/g, ' ').trim().split(/\s+/).filter(Boolean)
  const a = tokenize(original)
  const b = tokenize(corrected)
  if (a.length === 0 || b.length === 0) return 0
  // 양방향 매칭 — 원문 단어 중 교정문에 포함된 비율의 max
  const setA = new Set(a)
  const setB = new Set(b)
  let matchedA = 0
  for (const w of b) if (setA.has(w)) matchedA++
  let matchedB = 0
  for (const w of a) if (setB.has(w)) matchedB++
  const ratioA = matchedA / b.length
  const ratioB = matchedB / a.length
  return Math.min(ratioA, ratioB)
}

function formatHistory(turns: Turn[]): string {
  if (turns.length === 0) return '(대화 시작)'
  return turns
    .slice(-10)
    .map((t) => (t.role === 'student' ? `학습자: ${t.text}` : `AI: ${t.text}`))
    .join('\n')
}

function resolvePersona(personaId: string): Persona {
  return getPersona(personaId) ?? getPersona(DEFAULT_PERSONA_ID) ?? PERSONAS[0]
}

function mockResponse(latestStudentText: string, personaId: string): Response {
  return Response.json({
    source: 'mock',
    persona_id: personaId,
    tools_used: [] as string[],
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
  const personaId =
    typeof b.personaId === 'string' && b.personaId.trim() ? b.personaId.trim() : DEFAULT_PERSONA_ID
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

  const persona = resolvePersona(personaId)
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return mockResponse(latest, persona.personaId)
  }

  try {
    const { OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey })
    const model =
      process.env.OPENAI_FREE_CONVERSATION_MODEL
      ?? process.env.OPENAI_DIALOGUE_MODEL
      ?? process.env.OPENAI_EVAL_MODEL
      ?? 'gpt-4o-mini'

    const tools = availableTools()
    const enabledToolNames = tools.map((t) => t.function.name)
    const systemPrompt = buildPersonaSystemPrompt({
      persona,
      topic,
      availableToolNames: enabledToolNames,
    })
    const userContent = `[기존 대화 이력]\n${formatHistory(turns)}\n\n[학습자 최신 발화]\n${latest}`

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ]

    // 도구 호출 → 결과 → 재호출을 최대 MAX_TOOL_ROUNDS회 반복. 마지막 라운드는 도구 없이 최종 답변을 강제.
    const toolsUsed: string[] = []
    let finalContent: string | null = null
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const allowTools = tools.length > 0 && round < MAX_TOOL_ROUNDS
      const response = await client.chat.completions.create({
        model,
        messages,
        ...(allowTools ? { tools } : {}),
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 700,
      })
      const msg = response.choices[0]?.message
      if (!msg) throw new Error('no_message')
      const toolCalls = msg.tool_calls ?? []

      if (allowTools && toolCalls.length > 0) {
        messages.push({ role: 'assistant', content: msg.content ?? '', tool_calls: toolCalls })
        for (const tc of toolCalls) {
          if (tc.type !== 'function') {
            messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ ok: false, error: 'invalid_args', message: '지원하지 않는 도구 호출 형식' }) })
            continue
          }
          let args: Record<string, unknown> = {}
          try {
            const parsed = JSON.parse(tc.function.arguments || '{}')
            if (parsed && typeof parsed === 'object') args = parsed as Record<string, unknown>
          } catch {
            args = {}
          }
          const result = await runTool(tc.function.name, args)
          toolsUsed.push(tc.function.name)
          messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) })
        }
        continue
      }

      finalContent = msg.content ?? ''
      break
    }

    if (finalContent == null || !finalContent.trim()) {
      throw new Error('empty_final_content')
    }

    const parsed = JSON.parse(finalContent) as Record<string, unknown>
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

    // 23-h A-2: 단어 일치율 ≥ 0.85이면서 corrected !== original이면, 미세한 LLM
    // 노이즈일 가능성이 높으므로 교정 표시를 누른다(자연스러움 안내로 변환).
    if (safeCorrection.corrected.trim() !== safeCorrection.original.trim()) {
      const ratio = wordMatchRatio(safeCorrection.original, safeCorrection.corrected)
      if (ratio >= 0.85) {
        safeCorrection = {
          original: safeCorrection.original,
          corrected: safeCorrection.original,
          reason: '자연스럽게 잘 말씀하셨어요.',
        }
      }
    }

    return Response.json({
      source: 'llm',
      persona_id: persona.personaId,
      tools_used: toolsUsed,
      npc_response: npcText.trim(),
      learner_correction: safeCorrection,
    })
  } catch (err) {
    console.error('[conversation/free/respond] LLM error, falling back to mock:', err)
    return mockResponse(latest, persona.personaId)
  }
}
