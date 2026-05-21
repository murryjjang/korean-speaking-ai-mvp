// M3-a — 자유대화 요약 LLM 회귀 (실호출, opt-in) #15
//
// 기본 SKIP. 실행: LLM_REGRESSION_REAL=true npx vitest run \
//                    tests/llm-regression/free-conversation-summary.real.test.ts
// 빈도: 주 1회 + 프롬프트 변경 직후 (AUTOMATION_DESIGN.md M3 결정).
//
// 실제 OPENAI 호출로 15 fixture 의 topic_adherence 분류 정확도와 anti-hallucination
// (off→strengths[], partial→≤1, off/partial→next_steps 복귀 안내)을 실측한다.
// mock 을 쓰지 않으므로(이 파일엔 vi.mock 없음) 라우트가 실 openai SDK 를 사용한다.

import { beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { ALL_FIXTURES } from './fixtures/free-conversation-summary.fixtures'

const REAL = process.env.LLM_REGRESSION_REAL === 'true' || process.env.LLM_REGRESSION_REAL === '1'

// .env.local 수동 파싱 — vitest 는 .env.local 자동 로드 안 함. (seed/verify 스크립트와 동일)
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
    /* env 가 셸에서 제공될 수도 있으므로 무시 */
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

describe.skipIf(!REAL)('LLM 회귀 실호출 — 자유대화 요약 분류 정확도 (#15)', () => {
  let POST: (req: Request) => Promise<Response>

  beforeAll(async () => {
    loadEnvLocal()
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY 필요 — .env.local 또는 셸 env 확인')
    }
    POST = (await import('@/app/api/conversation/free/summary/route')).POST
  })

  for (const f of ALL_FIXTURES) {
    it(
      `${f.id} (${f.lang}) → topic_adherence=${f.expected.topic_adherence}`,
      async () => {
        const res = await POST(
          new Request('http://localhost/api/conversation/free/summary', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              topic: f.topic,
              helperLang: f.helperLang,
              motherTongue: f.motherTongue,
              turns: f.turns,
            }),
          }),
        )
        const json = await res.json()

        expect(json.source).toBe('llm')
        expect(json.topic_adherence).toBe(f.expected.topic_adherence)

        if (f.expected.topic_adherence === 'off') {
          // 환각 칭찬 차단 — 이탈 발화엔 strengths 없음
          expect(json.feedback_ko.strengths).toHaveLength(0)
        }
        if (f.expected.topic_adherence === 'partial') {
          expect(json.feedback_ko.strengths.length).toBeLessThanOrEqual(1)
        }
        if (f.expected.topic_adherence !== 'on') {
          // off/partial → next_steps 첫 항목은 주제 복귀 안내
          expect(json.feedback_ko.next_steps.length).toBeGreaterThan(0)
          expect(json.feedback_ko.next_steps[0]).toMatch(
            new RegExp(`주제|${escapeRegExp(f.topic)}`),
          )
        }
      },
      30_000,
    )
  }
})
