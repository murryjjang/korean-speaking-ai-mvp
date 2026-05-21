// M4 — 콘텐츠 검수 정량 7규칙 + 분류 결정론적 가드 (#13 score 헬퍼와 같은 패턴)
//
// 정량 규칙·분류는 LLM 무관 순수함수이므로 mock 없이 결정론적으로 가드한다.
// peer review 의 LLM 호출은 주입형 caller(fake)로 프롬프트 계약만 검증.

import { describe, expect, it, vi } from 'vitest'

import {
  buildPeerReviewSystemPrompt,
  classify,
  PEER_REVIEW_RULES,
  parsePeerReview,
  runPeerReview,
  validateQuantitative,
  type PeerReviewResult,
  type QuantResult,
} from '@/src/lib/tagging/validate-tagging'
import { BANMAL_WARNING, MIXED_REGISTER_KEYWORD, type ContentTagResult } from '@/src/lib/tagging/schema'

// 7규칙을 모두 통과하는 기준 객체. 각 테스트는 이걸 복제·변형한다.
function validResult(): ContentTagResult {
  return {
    topic_tags: ['일상', '카페'],
    cefr_level: 'A2',
    register: 'polite-spoken',
    register_consistency: 'consistent',
    learning_objective: '카페에서 주문할 수 있다.',
    vocabulary: { basic: ['친구'], core: ['카페'], challenging: [] },
    pronunciation_focus: ['꽃이(연음)'],
  }
}

describe('M4 정량 — 기준 객체는 7규칙 통과', () => {
  it('valid → ok=true, 실패 0', () => {
    const q = validateQuantitative(validResult())
    expect(q.ok).toBe(true)
    expect(q.failures).toHaveLength(0)
    expect(q.results).toHaveLength(7)
  })
})

describe('M4 정량 — 규칙별 fail 가드', () => {
  it('규칙1 fields: 필드 누락 → fields fail', () => {
    const r = validResult() as Record<string, unknown>
    delete r.pronunciation_focus
    const q = validateQuantitative(r)
    expect(q.ok).toBe(false)
    expect(q.failures.some((f) => f.rule === 'fields')).toBe(true)
  })

  it('규칙1 fields: topic_tags 빈 배열 → fields fail', () => {
    const q = validateQuantitative({ ...validResult(), topic_tags: [] })
    expect(q.failures.some((f) => f.rule === 'fields')).toBe(true)
  })

  it('규칙2 register: 불허값 → register fail', () => {
    const q = validateQuantitative({ ...validResult(), register: 'super-formal' })
    expect(q.failures.some((f) => f.rule === 'register')).toBe(true)
  })

  it('규칙3 cefr: 불허값 → cefr fail', () => {
    const q = validateQuantitative({ ...validResult(), cefr_level: 'D1' })
    expect(q.failures.some((f) => f.rule === 'cefr')).toBe(true)
  })

  it('규칙4 objective: "할 수 있다" 아님 → objective fail', () => {
    const q = validateQuantitative({ ...validResult(), learning_objective: '카페에서 주문하기' })
    expect(q.failures.some((f) => f.rule === 'objective')).toBe(true)
  })

  it('규칙4 objective: 마침표 유무 모두 허용', () => {
    expect(validateQuantitative({ ...validResult(), learning_objective: '주문할 수 있다' }).ok).toBe(true)
    expect(validateQuantitative({ ...validResult(), learning_objective: '주문할 수 있다.' }).ok).toBe(true)
  })

  it('규칙4 objective: 비-하다 동사 능력표현 허용 (-(으)ㄹ 수 있다 일반형, D-001 보완)', () => {
    expect(validateQuantitative({ ...validResult(), learning_objective: '안내문을 읽을 수 있다.' }).ok).toBe(true)
    expect(validateQuantitative({ ...validResult(), learning_objective: '대화를 듣고 핵심을 알 수 있다' }).ok).toBe(true)
    expect(validateQuantitative({ ...validResult(), learning_objective: '문장을 만들 수 있다.' }).ok).toBe(true)
  })

  it('규칙5 pronunciation: "표현(규칙)" 형식 위반 → pronunciation fail', () => {
    const q = validateQuantitative({ ...validResult(), pronunciation_focus: ['꽃이 연음'] })
    expect(q.failures.some((f) => f.rule === 'pronunciation')).toBe(true)
  })

  it('규칙5 pronunciation: 빈 배열은 허용', () => {
    expect(validateQuantitative({ ...validResult(), pronunciation_focus: [] }).ok).toBe(true)
  })

  it('규칙6 vocabulary: 블랙리스트 고유명사 → vocabulary fail', () => {
    const v = validResult()
    v.vocabulary.core = ['삼성']
    const q = validateQuantitative(v)
    expect(q.failures.some((f) => f.rule === 'vocabulary')).toBe(true)
  })

  it('규칙6 vocabulary: 화이트리스트(서울·한국)는 통과', () => {
    const v = validResult()
    v.vocabulary.core = ['서울', '한국']
    expect(validateQuantitative(v).ok).toBe(true)
  })

  it('규칙7 banmal: casual-banmal인데 경고 누락 → banmal fail', () => {
    const q = validateQuantitative({ ...validResult(), register: 'casual-banmal' })
    expect(q.failures.some((f) => f.rule === 'banmal')).toBe(true)
  })

  it('규칙7 banmal: casual-banmal + 표준 경고 → 통과', () => {
    const q = validateQuantitative({ ...validResult(), register: 'casual-banmal', register_note: BANMAL_WARNING })
    expect(q.ok).toBe(true)
  })

  it('규칙7 banmal: 비반말에 반말 경고 오부착 → banmal fail', () => {
    const q = validateQuantitative({ ...validResult(), register_note: BANMAL_WARNING })
    expect(q.failures.some((f) => f.rule === 'banmal')).toBe(true)
  })

  it('규칙7 banmal: mixed인데 혼용 경고 누락 → banmal fail', () => {
    const q = validateQuantitative({ ...validResult(), register_consistency: 'mixed' })
    expect(q.failures.some((f) => f.rule === 'banmal')).toBe(true)
  })

  it('규칙7 banmal: mixed + 혼용 경고 → 통과', () => {
    const q = validateQuantitative({
      ...validResult(),
      register_consistency: 'mixed',
      register_note: `${MIXED_REGISTER_KEYWORD}이 있습니다.`,
    })
    expect(q.ok).toBe(true)
  })

  it('malformed(null/문자열) 입력에도 throw 없이 fail 반환', () => {
    expect(validateQuantitative(null).ok).toBe(false)
    expect(validateQuantitative('nope').ok).toBe(false)
    expect(validateQuantitative(undefined).ok).toBe(false)
  })
})

describe('M4 분류 classify — pass/warn/fail 결정론', () => {
  const passQuant: QuantResult = { ok: true, results: [], failures: [] }
  const failQuant: QuantResult = { ok: false, results: [], failures: [{ rule: 'register', ok: false, message: 'x' }] }
  const peerPass: PeerReviewResult = { pass: true, warnings: [], failures: [] }
  const peerWarn: PeerReviewResult = { pass: true, warnings: ['의심'], failures: [] }
  const peerFail: PeerReviewResult = { pass: false, warnings: [], failures: ['오류'] }

  it('A pass ∧ B pass → pass', () => expect(classify(passQuant, peerPass)).toBe('pass'))
  it('A pass ∧ B warn → warn', () => expect(classify(passQuant, peerWarn)).toBe('warn'))
  it('A pass ∧ B fail → fail', () => expect(classify(passQuant, peerFail)).toBe('fail'))
  it('A fail (B 무관) → fail', () => {
    expect(classify(failQuant, peerPass)).toBe('fail')
    expect(classify(failQuant, peerFail)).toBe('fail')
  })
  it('peer=null(정량 전용): A pass→pass, A fail→fail', () => {
    expect(classify(passQuant, null)).toBe('pass')
    expect(classify(failQuant, null)).toBe('fail')
  })
  it('peer.pass=false인데 failures 비어도 → warn', () => {
    expect(classify(passQuant, { pass: false, warnings: [], failures: [] })).toBe('warn')
  })
})

describe('M4 peer review — 프롬프트 계약 + 파싱', () => {
  it('시스템 프롬프트에 6규칙 + 출력 형식 주입', () => {
    const sys = buildPeerReviewSystemPrompt()
    expect(PEER_REVIEW_RULES).toHaveLength(6)
    for (const r of PEER_REVIEW_RULES) expect(sys).toContain(r)
    expect(sys).toContain('pass')
    expect(sys).toContain('warnings')
    expect(sys).toContain('failures')
  })

  it('parsePeerReview: 정상 JSON', () => {
    const r = parsePeerReview('{"pass":true,"warnings":["w"],"failures":[]}')
    expect(r).toEqual({ pass: true, warnings: ['w'], failures: [] })
  })

  it('parsePeerReview: failures 있으면 pass 추론=false', () => {
    const r = parsePeerReview('{"failures":["e"]}')
    expect(r.pass).toBe(false)
    expect(r.failures).toEqual(['e'])
  })

  it('parsePeerReview: malformed → 파싱 실패 failure', () => {
    const r = parsePeerReview('not json')
    expect(r.pass).toBe(false)
    expect(r.failures.length).toBeGreaterThan(0)
  })

  it('runPeerReview: 주입형 caller에 시스템 프롬프트(6규칙) + 태깅 JSON 전달', async () => {
    const call = vi.fn(async (_sys: string, _user: string) => '{"pass":true,"warnings":[],"failures":[]}')
    const result = validResult()
    const out = await runPeerReview(call, result, 'content_id: q-1\ntitle: 카페')
    expect(out.pass).toBe(true)
    const [sys, user] = call.mock.calls[0]
    for (const r of PEER_REVIEW_RULES) expect(sys).toContain(r)
    expect(user).toContain('q-1')
    expect(user).toContain(JSON.stringify(result))
  })
})
