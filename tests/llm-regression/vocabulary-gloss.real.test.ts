// M3-c — 어휘 뜻·예문 생성 회귀 (실호출, opt-in)
//
// 기본 SKIP. 실행: LLM_REGRESSION_REAL=true npx vitest run \
//                    tests/llm-regression/vocabulary-gloss.real.test.ts
// 작성자 모델 기본 gpt-4o-mini(cost-aware, D-012c). 실 출력이 계약(3필드·언어)을
// 충족하는지 실측.

import { beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  buildVocabularyGlossSystemPrompt,
  buildVocabularyGlossUserPrompt,
  parseVocabGloss,
  type GlossLang,
} from '@/src/lib/prompts/vocabulary-gloss'

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

const CASES: Array<{ term: string; cefr: string; lang: GlossLang }> = [
  { term: '약국', cefr: 'A2', lang: 'en' },
  { term: '추천', cefr: 'B1', lang: 'vi' },
  { term: '운영', cefr: 'B1', lang: 'ko' },
]

describe.skipIf(!REAL)('M3-c gloss 실측 — 계약 충족', () => {
  beforeAll(() => {
    loadEnvLocal()
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY 필요 (.env.local)')
  })

  it.each(CASES.map((c) => [`${c.term}/${c.lang}`, c] as const))(
    '실 gloss 생성 %s',
    async (_label, c) => {
      const { OpenAI } = await import('openai')
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const model = process.env.OPENAI_GLOSS_MODEL ?? process.env.OPENAI_EVAL_MODEL ?? 'gpt-4o-mini'
      const res = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: buildVocabularyGlossSystemPrompt(c.lang) },
          { role: 'user', content: buildVocabularyGlossUserPrompt(c.term, c.cefr) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 300,
      })
      const parsed = parseVocabGloss(res.choices[0]?.message?.content ?? '{}')
      expect(parsed, `${c.term}/${c.lang} 파싱 실패`).not.toBeNull()
      expect(parsed!.gloss.length).toBeGreaterThan(0)
      expect(parsed!.example_ko.length).toBeGreaterThan(0)
      if (c.lang !== 'ko') expect(parsed!.example_translated.length).toBeGreaterThan(0)
    },
    30_000,
  )
})
