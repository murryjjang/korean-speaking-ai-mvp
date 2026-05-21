// M3-d — 모범답안 생성 회귀 (실호출, opt-in)
// 실행: LLM_REGRESSION_REAL=true npx vitest run tests/llm-regression/model-answer.real.test.ts
import { beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  buildModelAnswerSystemPrompt,
  buildModelAnswerUserPrompt,
  parseModelAnswer,
} from '@/src/lib/prompts/model-answer'
import type { CefrLevel } from '@/src/lib/tagging/schema'

const REAL = process.env.LLM_REGRESSION_REAL === 'true' || process.env.LLM_REGRESSION_REAL === '1'

function loadEnvLocal(): void {
  try {
    const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
    for (const line of content.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq < 0) continue
      const k = t.slice(0, eq).trim()
      let v = t.slice(eq + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      if (!(k in process.env)) process.env[k] = v
    }
  } catch {
    /* shell env */
  }
}

const CASES: Array<{ cefr: CefrLevel; input: Parameters<typeof buildModelAnswerUserPrompt>[0] }> = [
  { cefr: 'A2', input: { content_id: 'm1', type_id: 'qt-self-intro', title: '자기소개', prompt: '자신을 소개해 보세요.' } },
  { cefr: 'B1', input: { content_id: 'm2', type_id: 'qt-material-desc', title: '그래프 설명', prompt: '그래프의 변화를 설명하세요.' } },
]

describe.skipIf(!REAL)('M3-d 모범답안 실측 — answer_text 생성', () => {
  beforeAll(() => {
    loadEnvLocal()
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY 필요')
  })

  it.each(CASES.map((c) => [`${c.input.title}/${c.cefr}`, c] as const))('생성 %s', async (_l, c) => {
    const { OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const model = process.env.MODEL_ANSWER_MODEL ?? process.env.OPENAI_EVAL_MODEL ?? 'gpt-4o-mini'
    const res = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: buildModelAnswerSystemPrompt(c.cefr) },
        { role: 'user', content: buildModelAnswerUserPrompt(c.input) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 500,
    })
    const parsed = parseModelAnswer(res.choices[0]?.message?.content ?? '{}')
    expect(parsed, '파싱 실패').not.toBeNull()
    expect(parsed!.answer_text.length).toBeGreaterThan(10)
  }, 30_000)
})
