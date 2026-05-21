// M3-b — prompt v3 콘텐츠 태깅 회귀 (mock, 항상 실행)
//
// 태깅은 라우트가 아니라 스크립트(scripts/tag-content-batch.ts)에서 일어나므로,
// 여기서는 프롬프트 빌더의 **계약**을 결정론적으로 가드한다:
//   (1) 시스템 프롬프트에 잠긴 7필드·register 5값·cefr 6값·learning_objective
//       형식·pronunciation_focus 형식·반말 경고·평문 JSON 규칙이 모두 주입되는지
//       (prompt drift 회귀 감지 — M3-a 와 같은 패턴)
//   (2) 콘텐츠 매트릭스(낭독/발표/듣고답하기, 자유대화 제외)의 사람이 작성한
//       유효 v3 출력이 정량 7규칙을 통과하는지 (스펙↔fixture 정합)
// 실제 LLM 태깅 정확도는 *.real.test.ts(LLM_REGRESSION_REAL).

import { describe, expect, it } from 'vitest'

import {
  buildContentTaggingSystemPrompt,
  buildContentTaggingUserPrompt,
} from '@/src/lib/prompts/content-tagging'
import { validateQuantitative } from '@/src/lib/tagging/validate-tagging'
import {
  BANMAL_WARNING,
  CEFR_VALUES,
  CONTENT_TAGGING_PROMPT_VERSION,
  REGISTER_VALUES,
  REQUIRED_TAG_FIELDS,
} from '@/src/lib/tagging/schema'
import { CONTENT_TAGGING_FIXTURES } from './fixtures/content-tagging.fixtures'

describe('M3-b prompt v3 — 시스템 프롬프트 계약 (drift 가드)', () => {
  const sys = buildContentTaggingSystemPrompt()

  it('프롬프트 버전 v3 명시', () => {
    expect(CONTENT_TAGGING_PROMPT_VERSION).toBe('v3')
    expect(sys).toContain('v3')
  })

  it('7필드 전부 주입', () => {
    for (const f of REQUIRED_TAG_FIELDS) expect(sys).toContain(f)
  })

  it('register 5값 전부 주입', () => {
    for (const r of REGISTER_VALUES) expect(sys).toContain(r)
  })

  it('cefr 6값 전부 주입', () => {
    for (const c of CEFR_VALUES) expect(sys).toContain(c)
  })

  it('learning_objective 능력표현 일반형 + pronunciation "표현(규칙)" 형식 주입', () => {
    expect(sys).toContain('수 있다')
    expect(sys).toContain('읽을 수 있다') // 비-하다 동사 예시 주입 (drift 재발 가드)
    expect(sys).toContain('표현(규칙)')
  })

  it('반말 경고 표준 문구 + 평문 JSON 규칙 주입', () => {
    expect(sys).toContain(BANMAL_WARNING)
    expect(sys).toContain('JSON')
    expect(sys).toMatch(/마크다운|코드펜스/)
  })
})

describe('M3-b prompt v3 — user 프롬프트 (콘텐츠 매트릭스)', () => {
  it.each(CONTENT_TAGGING_FIXTURES.map((f) => [f.input.content_id, f] as const))(
    'user 프롬프트에 콘텐츠 필드 주입: %s',
    (_id, f) => {
      const user = buildContentTaggingUserPrompt(f.input)
      expect(user).toContain(f.input.content_id)
      expect(user).toContain(f.input.title)
      expect(user).toContain(f.input.prompt)
    },
  )
})

describe('M3-b prompt v3 — 유효 fixture 정량 규칙 통과 (스펙↔fixture 정합)', () => {
  it.each(CONTENT_TAGGING_FIXTURES.map((f) => [f.input.content_id, f] as const))(
    '유효 v3 출력이 7규칙 통과: %s',
    (_id, f) => {
      const q = validateQuantitative({ ...f.valid })
      expect(q.ok, `실패 규칙: ${q.failures.map((x) => x.rule).join(',')}`).toBe(true)
    },
  )

  it('낭독/발표/듣고답하기 3유형 모두 fixture 보유', () => {
    const types = new Set(CONTENT_TAGGING_FIXTURES.map((f) => f.type))
    expect(types).toEqual(new Set(['reading', 'material-desc', 'listening-resp']))
  })
})

describe('M3-b prompt v3 — 능력표현 일반형 회귀 가드 (D-001 drift 재발 차단)', () => {
  // 약식 표기 "~할 수 있다" 의 실제 의도는 -(으)ㄹ 수 있다 일반형. 하다 동사 외
  // 고유어 동사 활용형도 정량 rule 4 를 통과해야 한다(미래 prompt/정규식 변경 시 가드).
  const base = CONTENT_TAGGING_FIXTURES[0].valid
  it.each([
    '안내문을 소리 내어 읽을 수 있다.',
    '대화를 듣고 핵심 정보를 알 수 있다.',
    '자기소개를 짧게 쓸 수 있다',
    '자신의 의견을 말할 수 있다.',
    '간단한 문장을 만들 수 있다.',
  ])('능력표현 통과: %s', (lo) => {
    expect(validateQuantitative({ ...base, learning_objective: lo }).ok).toBe(true)
  })

  it('능력표현 아님 → rule 4 fail', () => {
    const q = validateQuantitative({ ...base, learning_objective: '안내문 읽기' })
    expect(q.failures.some((f) => f.rule === 'objective')).toBe(true)
  })
})
