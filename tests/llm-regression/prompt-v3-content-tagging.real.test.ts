// M3-b — prompt v3 콘텐츠 태깅 회귀 (실호출, opt-in)
//
// 기본 SKIP. 실행: LLM_REGRESSION_REAL=true npx vitest run \
//                    tests/llm-regression/prompt-v3-content-tagging.real.test.ts
// 빈도: 주 1회 + 프롬프트 변경 직후 (AUTOMATION_DESIGN M3 결정).
//
// 콘텐츠 매트릭스(낭독/발표/듣고답하기)에 prompt v3 를 실제 적용해 LLM 출력이
// 정량 7규칙을 통과하는지 실측한다. 작성자 모델은 gpt-4o-mini(검수자 gpt-4o 와
// 다른 모델 — DECISIONS D-007). 실패 시 프롬프트 v3 보강 신호.

import { beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  buildContentTaggingSystemPrompt,
  buildContentTaggingUserPrompt,
} from '@/src/lib/prompts/content-tagging'
import { validateQuantitative } from '@/src/lib/tagging/validate-tagging'
import { CONTENT_TAGGING_FIXTURES } from './fixtures/content-tagging.fixtures'

const REAL = process.env.LLM_REGRESSION_REAL === 'true' || process.env.LLM_REGRESSION_REAL === '1'

// .env.local 수동 파싱 — vitest 는 .env.local 자동 로드 안 함 (verify/seed 스크립트와 동일).
function loadEnvLocal(): void {
  try {
    const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 0) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (!(key in process.env)) process.env[key] = value
    }
  } catch {
    /* 셸 env 사용 */
  }
}

describe.skipIf(!REAL)('M3-b prompt v3 실측 — LLM 태깅이 정량 규칙 통과', () => {
  beforeAll(() => {
    loadEnvLocal()
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY 필요 (.env.local)')
  })

  it.each(CONTENT_TAGGING_FIXTURES.map((f) => [f.input.content_id, f] as const))(
    '실 태깅 7규칙 통과: %s',
    async (_id, f) => {
      const { OpenAI } = await import('openai')
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const model = process.env.OPENAI_TAGGING_MODEL ?? process.env.OPENAI_EVAL_MODEL ?? 'gpt-4o-mini'

      const res = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: buildContentTaggingSystemPrompt() },
          { role: 'user', content: buildContentTaggingUserPrompt(f.input) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0, // 작성자 결정성 (DECISIONS D-009)
        max_tokens: 800,
      })
      const raw = res.choices[0]?.message?.content ?? '{}'
      const parsed = JSON.parse(raw)
      const q = validateQuantitative(parsed)
      expect(q.ok, `${f.input.content_id} 실패 규칙: ${q.failures.map((x) => `${x.rule}(${x.message})`).join('; ')}`).toBe(true)
    },
    30_000,
  )
})
