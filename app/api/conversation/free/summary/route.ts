// ── Free conversation: end-of-session summary + bilingual feedback ───────
//
// 데모 통일: 한국어 + 학습자가 토글로 선택한 보조 언어 1개(ar/en/vi)만 출력.
// 학습자가 대화를 종료하면 LLM이 대화 전체를 요약하고 학습 피드백을 생성한다.
//
// OPENAI_API_KEY 미설정 또는 호출 실패 시 mock 폴백을 반환.

import {
  isFeedbackLanguage,
  L1_NAME,
  type FeedbackLanguage,
} from '@/src/lib/feedback-language'
import { getPersona, PERSONAS, type Persona } from '@/src/lib/personas'

type Turn = { role: 'student' | 'ai'; text: string }

const DEFAULT_PERSONA_ID = 'friend_casual'

function buildSystemPrompt(lang: FeedbackLanguage, persona: Persona): string {
  const l1 = L1_NAME[lang]
  return `당신은 한국어 학습 코치입니다.
학습자(외국인)는 '${persona.nameKo}'(${persona.role}, 말투: ${persona.speakingStyle}) 페르소나와 자유 대화를 했습니다.
요약·피드백의 어조는 그 대화 맥락과 어울리게 자연스러운 한국어 코치 톤으로 작성하세요.
학습자(외국인)와 NPC의 자유 대화 세션을 분석해 다음을 생성하세요:

1. 대화 요약: 어떤 주제로 어떤 흐름의 대화를 했는지 3~5줄
2. 학습 피드백:
   - strengths: 학습자가 잘한 점 2~3개 (구체적으로)
   - next_steps: 다음 연습 시 개선하면 좋을 점 1~2개

한국어와 ${l1} 두 언어로만 동시 출력합니다. 영어/베트남어/아랍어 외 다른 언어는 절대 포함하지 마세요.
선택 언어가 ${l1}이 아닐 때는 해당 언어를 절대 출력하지 마세요. 두 언어 모두 같은 의미로 자연스럽게 표현합니다.

[중요 - 출력 텍스트 형식 규칙]
- 모든 텍스트 값(summary_ko, summary_l1, strengths·next_steps 항목)은 평문(plain text)으로만 작성합니다.
- 마크다운 문법을 절대 사용하지 마세요: **, *, #, -, |, \`, [], (), ~~ 등 일체 금지.
- 강조하고 싶을 때 별표(**) 대신 "특히", "그 중에서도", "가장" 같은 자연스러운 표현으로 풀어쓰세요.
- (이 규칙은 텍스트 값 내용에만 적용됩니다. 아래 JSON 구조 자체의 중괄호·따옴표는 정상적으로 사용하세요.)

출력 형식 (반드시 JSON, 다른 텍스트 금지):
{
  "summary_ko": "...",
  "summary_l1": "...",
  "feedback_ko": {"strengths": ["..."], "next_steps": ["..."]},
  "feedback_l1": {"strengths": ["..."], "next_steps": ["..."]}
}`
}

function formatTranscript(topic: string, turns: Turn[]): string {
  const lines = turns
    .map((t) => (t.role === 'student' ? `학습자: ${t.text}` : `AI: ${t.text}`))
    .join('\n')
  return `[주제]\n${topic}\n\n[전체 대화]\n${lines}`
}

function mockL1(lang: FeedbackLanguage, topic: string): {
  summary: string
  strengths: string[]
  next_steps: string[]
} {
  if (lang === 'vi') {
    return {
      summary: `Đã trò chuyện tự do về chủ đề "${topic}". Học viên đã chia sẻ kinh nghiệm và ý kiến bằng tiếng Hàn, và AI đã đặt câu hỏi tiếp theo để duy trì cuộc trò chuyện.`,
      strengths: [
        'Bạn đã diễn đạt ý kiến của mình bằng tiếng Hàn theo chủ đề.',
        'Bạn trả lời câu hỏi của NPC phù hợp và duy trì cuộc trò chuyện.',
      ],
      next_steps: ['Hãy thử dùng nhiều từ vựng và cách diễn đạt đa dạng hơn.'],
    }
  }
  if (lang === 'en') {
    return {
      summary: `You had a free conversation about "${topic}". You shared your experience and opinions in Korean, and the AI partner kept the conversation going with follow-up questions.`,
      strengths: [
        'You expressed your thoughts in Korean on topic.',
        'You responded appropriately to the NPC and kept the conversation going.',
      ],
      next_steps: ['Try using a wider variety of vocabulary and expressions.'],
    }
  }
  // ar
  return {
    summary: `أجريتَ محادثة حرة حول موضوع "${topic}". شاركتَ تجاربك وآراءك باللغة الكورية، وواصل الشريك الذكي المحادثة بأسئلة متابعة.`,
    strengths: [
      'لقد عبّرت عن أفكارك باللغة الكورية بما يتعلق بالموضوع.',
      'تجاوبت بشكل مناسب مع الشخصية وأبقيت المحادثة مستمرة.',
    ],
    next_steps: ['حاول استخدام مفردات وتعبيرات أكثر تنوعًا.'],
  }
}

function mockSummary(lang: FeedbackLanguage, topic: string): Response {
  const l1 = mockL1(lang, topic)
  return Response.json({
    source: 'mock',
    summary_ko: `${topic}을(를) 주제로 자유롭게 대화를 나누었습니다. 학습자는 자신의 경험과 의견을 한국어로 표현했고, AI 파트너는 후속 질문으로 대화를 이어갔습니다.`,
    summary_l1: l1.summary,
    feedback_ko: {
      strengths: [
        '주제에 맞춰 자기 생각을 한국어로 표현했습니다.',
        'NPC의 질문에 적절히 응답하며 대화를 이어갔습니다.',
      ],
      next_steps: ['더 다양한 표현과 어휘를 사용해 보세요.'],
    },
    feedback_l1: { strengths: l1.strengths, next_steps: l1.next_steps },
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
  const helperLang: FeedbackLanguage = isFeedbackLanguage(b.helperLang) ? b.helperLang : 'vi'
  const personaId =
    typeof b.personaId === 'string' && b.personaId.trim() ? b.personaId.trim() : DEFAULT_PERSONA_ID
  const persona: Persona = getPersona(personaId) ?? getPersona(DEFAULT_PERSONA_ID) ?? PERSONAS[0]
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
  if (turns.length === 0) {
    return mockSummary(helperLang, topic)
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return mockSummary(helperLang, topic)
  }

  try {
    const { OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey })
    const model =
      process.env.OPENAI_FREE_CONVERSATION_SUMMARY_MODEL
      ?? process.env.OPENAI_DIALOGUE_MODEL
      ?? process.env.OPENAI_EVAL_MODEL
      ?? 'gpt-4o-mini'

    const userContent = formatTranscript(topic, turns)

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: buildSystemPrompt(helperLang, persona) },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 900,
    })

    const raw = response.choices[0]?.message?.content ?? ''
    const parsed = JSON.parse(raw) as Record<string, unknown>

    const requiredText = (k: string): string => {
      const v = parsed[k]
      if (typeof v !== 'string' || !v.trim()) throw new Error(`missing_${k}`)
      return v.trim()
    }
    const safeFeedback = (k: string): { strengths: string[]; next_steps: string[] } => {
      const v = parsed[k]
      if (!v || typeof v !== 'object') throw new Error(`missing_${k}`)
      const obj = v as Record<string, unknown>
      const strengths = Array.isArray(obj.strengths)
        ? (obj.strengths as unknown[]).filter((s): s is string => typeof s === 'string')
        : []
      const next_steps = Array.isArray(obj.next_steps)
        ? (obj.next_steps as unknown[]).filter((s): s is string => typeof s === 'string')
        : []
      if (strengths.length === 0 && next_steps.length === 0) throw new Error(`empty_${k}`)
      return { strengths, next_steps }
    }

    return Response.json({
      source: 'llm',
      summary_ko: requiredText('summary_ko'),
      summary_l1: requiredText('summary_l1'),
      feedback_ko: safeFeedback('feedback_ko'),
      feedback_l1: safeFeedback('feedback_l1'),
    })
  } catch (err) {
    console.error('[conversation/free/summary] LLM error, falling back to mock:', err)
    return mockSummary(helperLang, topic)
  }
}
