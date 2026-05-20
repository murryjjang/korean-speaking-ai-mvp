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
import { buildPersonaSystemPrompt } from '@/src/lib/llm/build-persona-system-prompt'
import { getPersona, PERSONAS, type Persona } from '@/src/lib/personas'

type Turn = { role: 'student' | 'ai'; text: string }

const DEFAULT_PERSONA_ID = 'friend_casual'

function buildSystemPrompt(
  lang: FeedbackLanguage,
  persona: Persona,
  topic: string,
  multilingual: boolean,
): string {
  const l1 = L1_NAME[lang]
  // v1.1 단계 9-3: 페르소나 캐릭터 시트를 코치 프롬프트 상단에 주입해 페르소나 톤
  // 일관성 있는 요약·피드백을 생성한다. forSummary=true로 응답 원칙·도구·JSON 출력
  // 형식 섹션은 빼고, 종료 피드백 전용 출력 형식을 아래에 별도로 덧붙인다.
  const personaContext = buildPersonaSystemPrompt({
    persona,
    topic,
    availableToolNames: [],
    forSummary: true,
  })

  // v1.1 16-10-3: 학습자 모국어가 외국어이면 KO + EN + VI + AR 4개 언어 동시 출력.
  // UI 토글에서 즉시 언어 전환 가능. 한국어 모어 화자(또는 미지정)는 기존 ko + helperLang 동작.
  const languagesBlock = multilingual
    ? `한국어(ko)와 영어(en)·베트남어(vi)·아랍어(ar) 네 언어로 동시 출력합니다.
모든 언어는 같은 의미를 같은 길이로 자연스럽게 표현하세요.
ko·en·vi·ar 외 언어는 절대 출력하지 마세요.`
    : `한국어와 ${l1} 두 언어로만 동시 출력합니다. 영어/베트남어/아랍어 외 다른 언어는 절대 포함하지 마세요.
선택 언어가 ${l1}이 아닐 때는 해당 언어를 절대 출력하지 마세요. 두 언어 모두 같은 의미로 자연스럽게 표현합니다.`

  const outputBlock = multilingual
    ? `출력 형식 (반드시 JSON, 다른 텍스트 금지):
{
  "topic_adherence": "on | partial | off 중 하나",
  "summary": { "ko": "...", "en": "...", "vi": "...", "ar": "..." },
  "feedback": {
    "ko": { "strengths": ["..."], "next_steps": ["..."] },
    "en": { "strengths": ["..."], "next_steps": ["..."] },
    "vi": { "strengths": ["..."], "next_steps": ["..."] },
    "ar": { "strengths": ["..."], "next_steps": ["..."] }
  }
}`
    : `출력 형식 (반드시 JSON, 다른 텍스트 금지):
{
  "topic_adherence": "on | partial | off 중 하나",
  "summary_ko": "...",
  "summary_l1": "...",
  "feedback_ko": {"strengths": ["..."], "next_steps": ["..."]},
  "feedback_l1": {"strengths": ["..."], "next_steps": ["..."]}
}`

  return `${personaContext}

[당신의 역할 — 한국어 학습 코치]
위 페르소나(${persona.nameKo})와 학습자가 방금 자유 대화를 마쳤습니다. 이제 당신은 그 대화를 옆에서 들은 한국어 학습 코치 입장입니다.
요약·피드백 어조는 페르소나 대화 맥락과 어울리게 자연스러운 한국어 코치 톤으로 작성하세요.

학습자(외국인)와 NPC의 자유 대화 세션을 분석해 다음 절차로 평가하세요:

[1단계 — 주제 일치 판단 (topic_adherence 필드로 반드시 출력)]
대화 주제: "${topic}"
학습자의 한국어 발화 전체가 이 주제와 얼마나 관련되는지 3단계로 판정해, 출력 JSON의 topic_adherence 필드에 "on"|"partial"|"off" 중 하나로 넣으세요:
- "on" (주제와 일치): 주제 영역의 질문에 답하거나 관련된 경험·의견을 표현
- "partial" (일부 관련 + 일부 이탈): 주제를 일부만 다루거나 곁가지로 자주 새는 경우
- "off" (거의/완전 이탈): 주제와 다른 화제, 한 마디만 던지고 끝남, 또는 관련성 모호

[2단계 — 발화 분량 점검 (내부 분석, 출력에 포함하지 말 것)]
학습자의 총 한국어 발화 글자 수와 발화 턴 수를 헤아릴 것.

[3단계 — 출력 생성]
1. 대화 요약 (summary): 어떤 주제로 어떤 흐름의 대화를 했는지 3~5줄
2. 학습 피드백 (feedback):
   - strengths: 학습자의 실제 발화에서 인용 가능한 구체적 근거가 있는 경우에만 작성.
     * topic_adherence가 "off" → strengths는 빈 배열 [] (이탈한 발화에 대한 칭찬 절대 금지)
     * topic_adherence가 "partial" → 실제 주제와 관련된 발화에 한해 최대 1개
     * 2단계에서 단일 턴이거나 총 20자 이하 → strengths는 최대 1개
     * 그 외 정상 대화 → 2~3개. 각 항목마다 학습자 발화의 구체적 표현·내용을 짚어야 함
     * 금지 어구 (근거 없는 일반론적 칭찬, 절대 출력하지 말 것): "주제에 대해 자연스럽게 대화를 이어갔어요", "NPC의 질문에 적절히 응답했어요", "자기 생각을 표현했어요", "한국어로 표현했어요", "자연스럽게 말했어요"
   - next_steps: 1~2개
     * topic_adherence가 "off" 또는 "partial"인 경우, 첫 항목은 "주제(${topic})에 맞춰 답변해 보세요" 형식의 주제 복귀 안내

${languagesBlock}

[중요 - 출력 텍스트 형식 규칙]
- 모든 텍스트 값은 평문(plain text)으로만 작성합니다.
- 마크다운 문법을 절대 사용하지 마세요: **, *, #, -, |, \`, [], (), ~~ 등 일체 금지.
- 강조하고 싶을 때 별표(**) 대신 "특히", "그 중에서도", "가장" 같은 자연스러운 표현으로 풀어쓰세요.
- (이 규칙은 텍스트 값 내용에만 적용됩니다. 아래 JSON 구조 자체의 중괄호·따옴표는 정상적으로 사용하세요.)

${outputBlock}`
}

function formatTranscript(topic: string, turns: Turn[]): string {
  const lines = turns
    .map((t) => (t.role === 'student' ? `학습자: ${t.text}` : `AI: ${t.text}`))
    .join('\n')
  return `[주제]\n${topic}\n\n[전체 대화]\n${lines}`
}

// backlog #13: LLM이 출력한 주제 일치 신호 파싱. 누락/이상값은 'on'으로 폴백.
type TopicAdherence = 'on' | 'partial' | 'off'
function parseTopicAdherence(v: unknown): TopicAdherence {
  return v === 'partial' || v === 'off' ? v : 'on'
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

function mockSummary(lang: FeedbackLanguage, topic: string, multilingual: boolean): Response {
  const summaryKo = `${topic}을(를) 주제로 자유롭게 대화를 나누었습니다. 학습자는 자신의 경험과 의견을 한국어로 표현했고, AI 파트너는 후속 질문으로 대화를 이어갔습니다.`
  const feedbackKo = {
    strengths: [
      '주제에 맞춰 자기 생각을 한국어로 표현했습니다.',
      'NPC의 질문에 적절히 응답하며 대화를 이어갔습니다.',
    ],
    next_steps: ['더 다양한 표현과 어휘를 사용해 보세요.'],
  }
  const l1 = mockL1(lang, topic)

  const base: Record<string, unknown> = {
    source: 'mock',
    topic_adherence: 'on',
    summary_ko: summaryKo,
    summary_l1: l1.summary,
    feedback_ko: feedbackKo,
    feedback_l1: { strengths: l1.strengths, next_steps: l1.next_steps },
  }

  if (multilingual) {
    const en = mockL1('en', topic)
    const vi = mockL1('vi', topic)
    const ar = mockL1('ar', topic)
    base.summary = { ko: summaryKo, en: en.summary, vi: vi.summary, ar: ar.summary }
    base.feedback = {
      ko: feedbackKo,
      en: { strengths: en.strengths, next_steps: en.next_steps },
      vi: { strengths: vi.strengths, next_steps: vi.next_steps },
      ar: { strengths: ar.strengths, next_steps: ar.next_steps },
    }
  }

  return Response.json(base)
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
  // v1.1 16-10-3: 학습자 모국어가 외국어(en/vi/ar)면 4개 언어 모두 요청.
  const motherTongue =
    typeof b.motherTongue === 'string' ? b.motherTongue.trim().toLowerCase() : ''
  const multilingual = motherTongue === 'en' || motherTongue === 'vi' || motherTongue === 'ar'
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
    return mockSummary(helperLang, topic, multilingual)
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return mockSummary(helperLang, topic, multilingual)
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
        { role: 'system', content: buildSystemPrompt(helperLang, persona, topic, multilingual) },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: multilingual ? 1800 : 900,
    })

    const raw = response.choices[0]?.message?.content ?? ''
    const parsed = JSON.parse(raw) as Record<string, unknown>

    if (multilingual) {
      // v1.1 16-10-3: 4언어 객체 응답 파싱. 부분 누락이면 ko 폴백.
      const summaryObj = (parsed.summary ?? {}) as Record<string, unknown>
      const feedbackObj = (parsed.feedback ?? {}) as Record<string, unknown>
      const pickStr = (m: Record<string, unknown>, k: string): string =>
        typeof m[k] === 'string' && (m[k] as string).trim() ? (m[k] as string).trim() : ''
      const pickFeedback = (k: string): { strengths: string[]; next_steps: string[] } => {
        const v = feedbackObj[k]
        if (!v || typeof v !== 'object') return { strengths: [], next_steps: [] }
        const obj = v as Record<string, unknown>
        const strengths = Array.isArray(obj.strengths)
          ? (obj.strengths as unknown[]).filter((s): s is string => typeof s === 'string')
          : []
        const next_steps = Array.isArray(obj.next_steps)
          ? (obj.next_steps as unknown[]).filter((s): s is string => typeof s === 'string')
          : []
        return { strengths, next_steps }
      }
      const summaryKo = pickStr(summaryObj, 'ko')
      const fbKo = pickFeedback('ko')
      if (!summaryKo || (fbKo.strengths.length === 0 && fbKo.next_steps.length === 0)) {
        throw new Error('missing_ko_payload')
      }
      const summary = {
        ko: summaryKo,
        en: pickStr(summaryObj, 'en'),
        vi: pickStr(summaryObj, 'vi'),
        ar: pickStr(summaryObj, 'ar'),
      }
      const feedback = {
        ko: fbKo,
        en: pickFeedback('en'),
        vi: pickFeedback('vi'),
        ar: pickFeedback('ar'),
      }
      return Response.json({
        source: 'llm',
        topic_adherence: parseTopicAdherence(parsed.topic_adherence),
        // 다국어 신규 필드
        summary,
        feedback,
        // 기존 호환 필드 — helperLang 기준 폴백.
        summary_ko: summary.ko,
        summary_l1: summary[helperLang] || summary.ko,
        feedback_ko: feedback.ko,
        feedback_l1: feedback[helperLang] ?? feedback.ko,
      })
    }

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
      topic_adherence: parseTopicAdherence(parsed.topic_adherence),
      summary_ko: requiredText('summary_ko'),
      summary_l1: requiredText('summary_l1'),
      feedback_ko: safeFeedback('feedback_ko'),
      feedback_l1: safeFeedback('feedback_l1'),
    })
  } catch (err) {
    console.error('[conversation/free/summary] LLM error, falling back to mock:', err)
    return mockSummary(helperLang, topic, multilingual)
  }
}
